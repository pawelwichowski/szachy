import json
import os
import re
import secrets
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

import chess
from flask import Flask, jsonify
from flask_sock import Sock

CODE_PATTERN = re.compile(r"^[A-Z0-9]{6}$")
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def now():
    return datetime.now(timezone.utc).isoformat()


def color_code(color):
    return "w" if color == chess.WHITE else "b"


def new_event(kind, actor):
    return {"id": f"{kind}-{actor}-{secrets.token_urlsafe(8)}", "type": kind, "actor": actor}


@dataclass
class GameRoom:
    code: str
    host_color: str
    players: dict
    board: chess.Board = field(default_factory=chess.Board)
    history: list = field(default_factory=list)
    draw_offer: str | None = None
    result: dict | None = None
    last_event: dict | None = None
    status: str = "waiting"
    created_at: str = field(default_factory=now)
    updated_at: str = field(default_factory=now)

    def color_for(self, token):
        for color, player_token in self.players.items():
            if secrets.compare_digest(token, player_token):
                return color
        return None

    def touch(self):
        self.updated_at = now()

    def payload(self):
        return {
            "code": self.code,
            "status": self.status,
            "hostColor": self.host_color,
            "whitePlayer": "w" in self.players,
            "blackPlayer": "b" in self.players,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "state": {
                "fen": self.board.fen(),
                "history": self.history,
                "drawOffer": self.draw_offer,
                "result": self.result,
                "lastEvent": self.last_event,
            },
        }


@dataclass
class Client:
    client_id: str
    websocket: object
    room_code: str | None = None
    player_token: str | None = None
    send_lock: threading.Lock = field(default_factory=threading.Lock)


class Store:
    def __init__(self):
        self.rooms = {}
        self.lock = threading.RLock()

    def create(self, color):
        with self.lock:
            while True:
                code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
                if code not in self.rooms:
                    break
            token = secrets.token_urlsafe(32)
            room = GameRoom(code, color, {color: token})
            self.rooms[code] = room
            return room, token

    def add_guest(self, room):
        if room.status == "completed" or len(room.players) >= 2:
            return None
        color = "b" if room.host_color == "w" else "w"
        if color in room.players:
            return None
        token = secrets.token_urlsafe(32)
        room.players[color] = token
        room.status = "active"
        room.touch()
        return color, token


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "development-secret")
sock = Sock(app)
store = Store()
clients = {}
clients_lock = threading.RLock()


@app.get("/health")
def health():
    return jsonify({"status": "ok"}), 200


def ok(room, **extra):
    return {"ok": True, "room": room.payload(), **extra}


def fail(message):
    return {"ok": False, "error": message}


def send(client, message):
    try:
        with client.send_lock:
            client.websocket.send(json.dumps(message))
        return True
    except Exception:
        return False


def response(client, request_id, payload):
    send(client, {"type": "response", "requestId": request_id, "payload": payload})


def broadcast(room):
    payload = {"type": "room_state", "room": room.payload()}
    with clients_lock:
        targets = [client for client in clients.values() if client.room_code == room.code]
    for client in targets:
        send(client, payload)


def current_player(client, active=True):
    if not client.room_code or not client.player_token:
        return None, None, fail("Najpierw utwórz pokój albo dołącz do pokoju.")
    room = store.rooms.get(client.room_code)
    if room is None:
        return None, None, fail("Pokój nie istnieje albo serwer został zrestartowany.")
    color = room.color_for(client.player_token)
    if color is None:
        return None, None, fail("Nie masz dostępu do tego pokoju.")
    if active and room.status != "active":
        return None, None, fail("Ta partia nie jest aktywna.")
    return room, color, None


def attach(client, room, token):
    client.room_code = room.code
    client.player_token = token


def handle(client, kind, data):
    data = data if isinstance(data, dict) else {}

    if kind == "create_room":
        color = data.get("color")
        if color not in {"w", "b"}:
            return fail("Wybierz kolor białych albo czarnych."), None
        room, token = store.create(color)
        attach(client, room, token)
        return ok(room, session={"code": room.code, "color": color, "playerToken": token}), None

    if kind == "join_room":
        code = data.get("code", "").strip().upper() if isinstance(data.get("code"), str) else ""
        if not CODE_PATTERN.fullmatch(code):
            return fail("Kod pokoju musi mieć dokładnie 6 znaków."), None
        with store.lock:
            room = store.rooms.get(code)
            if room is None:
                return fail("Nie znaleziono pokoju o takim kodzie."), None
            if room.status == "completed":
                return fail("Ta partia została już zakończona."), None
            guest = store.add_guest(room)
            if guest is None:
                return fail("Ten pokój jest już pełny."), None
            color, token = guest
            attach(client, room, token)
            return ok(room, session={"code": code, "color": color, "playerToken": token}), room

    if kind == "rejoin_room":
        code = data.get("code", "").strip().upper() if isinstance(data.get("code"), str) else ""
        token = data.get("playerToken")
        if not CODE_PATTERN.fullmatch(code) or not isinstance(token, str):
            return fail("Nieprawidłowy kod pokoju lub sesja gracza."), None
        with store.lock:
            room = store.rooms.get(code)
            if room is None:
                return fail("Pokój nie istnieje albo serwer został zrestartowany."), None
            color = room.color_for(token)
            if color is None:
                return fail("Nie masz dostępu do tego pokoju."), None
            attach(client, room, token)
            return ok(room, session={"code": code, "color": color}), None

    with store.lock:
        room, color, problem = current_player(client, active=kind != "leave_room")
        if problem:
            return problem, None

        if kind == "make_move":
            origin = data.get("from")
            target = data.get("to")
            promotion = data.get("promotion")
            if not isinstance(origin, str) or not isinstance(target, str):
                return fail("Ruch musi zawierać pole początkowe i końcowe."), None
            if promotion is not None and promotion not in {"q", "r", "b", "n"}:
                return fail("Nieprawidłowa figura promocji."), None
            if color_code(room.board.turn) != color:
                return fail("To nie jest Twoja tura."), None
            try:
                move = chess.Move.from_uci(f"{origin}{target}{promotion or ''}")
            except ValueError:
                return fail("Nieprawidłowy zapis ruchu."), None
            if move not in room.board.legal_moves:
                return fail("Ten ruch nie jest legalny."), None
            san = room.board.san(move)
            room.board.push(move)
            ply = len(room.history) + 1
            room.history.append({
                "id": f"{ply}-{move.uci()}-{san}",
                "ply": ply,
                "moveNumber": (ply + 1) // 2,
                "color": color,
                "san": san,
                "from": origin,
                "to": target,
                "fen": room.board.fen(),
            })
            if room.draw_offer and room.draw_offer != color:
                room.draw_offer = None
                room.last_event = new_event("draw-declined", color)
            else:
                room.last_event = None
            if room.board.is_game_over(claim_draw=False):
                room.status = "completed"
            room.touch()
            return ok(room), room

        if kind == "offer_draw":
            if room.draw_offer:
                return fail("Oferta remisu już oczekuje na odpowiedź."), None
            room.draw_offer = color
            room.last_event = None
            room.touch()
            return ok(room), room

        if kind == "accept_draw":
            if not room.draw_offer or room.draw_offer == color:
                return fail("Nie możesz zaakceptować tej oferty remisu."), None
            room.draw_offer = None
            room.last_event = None
            room.result = {"type": "agreed-draw"}
            room.status = "completed"
            room.touch()
            return ok(room), room

        if kind == "decline_draw":
            if not room.draw_offer or room.draw_offer == color:
                return fail("Nie możesz odrzucić tej oferty remisu."), None
            room.draw_offer = None
            room.last_event = new_event("draw-declined", color)
            room.touch()
            return ok(room), room

        if kind == "resign":
            room.draw_offer = None
            room.last_event = None
            room.result = {"type": "resignation", "resignedBy": color, "winner": "b" if color == "w" else "w"}
            room.status = "completed"
            room.touch()
            return ok(room), room

        if kind == "leave_room":
            if room.status == "active":
                room.draw_offer = None
                room.last_event = None
                room.result = {"type": "opponent-left", "leftBy": color}
                room.status = "completed"
                room.touch()
            client.room_code = None
            client.player_token = None
            return ok(room), room

    return fail("Nieznany typ komunikatu."), None


@sock.route("/ws")
def game_socket(ws):
    client = Client(secrets.token_urlsafe(16), ws)
    with clients_lock:
        clients[client.client_id] = client

    try:
        while True:
            raw = ws.receive()
            if raw is None:
                break
            try:
                message = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                response(client, None, fail("Nieprawidłowy JSON."))
                continue
            if not isinstance(message, dict):
                response(client, None, fail("Nieprawidłowy komunikat."))
                continue
            payload, room = handle(client, message.get("type"), message.get("data"))
            response(client, message.get("requestId"), payload)
            if room is not None:
                broadcast(room)
    finally:
        with clients_lock:
            clients.pop(client.client_id, None)


if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG", "1") == "1",
        threaded=True,
    )
