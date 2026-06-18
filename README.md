# Szachy online

Projekt na przedmiot **Aplikacje internetowe**. Aplikacja jest rozwijana etapami jako klient React, a w kolejnych etapach otrzyma serwer Python/Flask i bazę danych.

## Aktualny etap: pokoje, sterowanie partią i komunikaty

- strona startowa z grą lokalną, tworzeniem prywatnego pokoju i dołączaniem kodem;
- wybór koloru gospodarza pokoju: **białe**, **czarne** albo **losowo**;
- automatyczne przypisanie przeciwnego koloru graczowi dołączającemu;
- szachownica odwracana dla gracza czarnymi: własne figury zawsze są na dole;
- prywatny kod i link do pokoju;
- synchronizacja pozycji i historii ruchów między kartami tej samej przeglądarki;
- blokowanie ruchów po stronie gracza, który nie ma tury;
- przycisk poddania partii z potwierdzeniem i poprawnym wynikiem — tylko w pokoju;
- oferta remisu, zaakceptowanie albo odrzucenie jej przez przeciwnika — tylko w pokoju;
- komunikat dla autora oferty, gdy przeciwnik odrzuci remis;
- informacja „Przeciwnik opuścił partię”, gdy drugi gracz wróci z aktywnej partii do menu;
- wyraźny powrót do menu głównego z potwierdzeniem;
- legalne ruchy, szach, mat, pat, remisy, roszada, bicie w przelocie i promocja pionka;
- historia ruchów w SAN oraz podgląd pozycji po wybranym ruchu.

Reguły gry obsługuje biblioteka `chess.js`. Pozycja po każdym ruchu jest zapisywana jako FEN, dzięki czemu wpis historii odtwarza dokładny stan planszy z danego momentu.

## Struktura projektu

```text
src/
├── App.jsx                         # przełączanie ekranów, sesja i zapis pokoju
├── domain/
│   ├── chess.js                    # stan partii, status, FEN, opisy figur
│   └── room.js                     # kod pokoju, localStorage, sesja i link pokoju
├── hooks/
│   └── useRoomSync.js              # synchronizacja kart przez BroadcastChannel
├── components/
│   ├── common/
│   │   ├── ConfirmDialog.jsx       # uniwersalne okno potwierdzenia
│   │   └── CreateRoomDialog.jsx    # wybór koloru przy tworzeniu pokoju
│   ├── lobby/
│   │   ├── HomeScreen.jsx          # menu główne
│   │   └── RoomLobby.jsx           # oczekiwanie i dane prywatnego pokoju
│   └── game/
│       ├── ChessGame.jsx           # stan i akcje bieżącej rozgrywki
│       ├── ChessBoard.jsx          # renderowanie oraz interakcja z planszą
│       ├── GameSidebar.jsx         # status, historia, remis i poddanie
│       └── PromotionDialog.jsx     # wybór figury po promocji pionka
├── styles.css                      # ogólny układ szachownicy i aplikacji
├── lobby.css                       # widoki lobby i pokoi
├── stage35.css                     # dialogi oraz działania w partii
└── stage36.css                     # komunikaty pokojów
```

`App.jsx` nie zawiera już reguł gry ani JSX planszy. Przy wdrażaniu backendu kod Flask/WebSocket będzie zastępował funkcje z `domain/room.js` oraz `hooks/useRoomSync.js`; komponenty UI pozostaną bez zmian albo z niewielkimi korektami.

## Jak przetestować prywatny pokój

1. Uruchom aplikację przez `npm run dev`.
2. Wybierz **Utwórz prywatny pokój**.
3. Wybierz kolor gospodarza: białe, czarne lub losowo.
4. Skopiuj link lub kod.
5. Otwórz link w drugiej karcie **tej samej przeglądarki** albo ręcznie wpisz kod na stronie startowej.
6. W drugiej karcie kliknij **Dołącz do pokoju**.
7. Pierwsza karta gra wybranym kolorem, a druga przeciwnym. Każda osoba ma własne figury na dole planszy.
8. Z pierwszej karty zaproponuj remis, a w drugiej kliknij **Odrzuć**. W pierwszej karcie pojawi się komunikat o odrzuceniu.
9. W jednej z kart wybierz **Menu główne** i potwierdź. Druga karta otrzyma informację o opuszczeniu partii i nie będzie mogła wykonać kolejnych ruchów.

> Obecnie pokoje są demonstracją frontendową: używają `localStorage` i `BroadcastChannel`, więc działają tylko w obrębie tego samego profilu przeglądarki. W etapie z Flask i WebSocket synchronizacja zostanie przeniesiona na serwer i zacznie działać między różnymi urządzeniami.

## Uruchomienie lokalne

Wymagany jest Node.js oraz npm.

```bash
npm install
npm run dev
```

Do jednorazowej kontroli produkcyjnej wersji aplikacji użyj:

```bash
npm run build
```

Vite wyświetli w terminalu lokalny adres, zwykle `http://localhost:5173`.

## Plan rozwoju

1. Serwer Flask z REST API i WebSocketami dla rzeczywistych pokoi online.
2. Rejestracja, logowanie i rozgrywka jako gość.
3. Baza danych: użytkownicy, partie, ruchy oraz historia.
4. Ranking Elo i profile graczy.
