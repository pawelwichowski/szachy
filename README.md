# Szachy online

Projekt na przedmiot **Aplikacje internetowe**. Aplikacja jest rozwijana etapami jako klient React, a w następnych etapach otrzyma serwer Python/Flask i bazę danych.

## Aktualny etap: lobby, pokoje i gra

- strona startowa umożliwiająca wybór trybu gry;
- gra lokalna dla dwóch osób na jednym urządzeniu;
- tworzenie prywatnego pokoju z losowym, sześcioliterowym kodem;
- kopiowanie kodu oraz linku prowadzącego do pokoju;
- dołączenie do wolnego pokoju jako gracz czarny;
- automatyczne przejście do planszy, gdy do pokoju dołączy drugi gracz;
- synchronizacja pozycji i historii ruchów między kartami tej samej przeglądarki;
- blokowanie ruchów po stronie gracza, który nie ma aktualnie tury;
- legalne ruchy, szach, mat, pat, remisy, roszada, bicie w przelocie i promocja pionka;
- historia ruchów w SAN oraz podgląd pozycji po wybranym ruchu.

Reguły gry obsługuje biblioteka `chess.js`. Pozycja po każdym ruchu jest zapisywana jako FEN, dzięki czemu wpis historii odtwarza dokładny stan planszy z danego momentu.

## Jak przetestować prywatny pokój

1. Uruchom aplikację przez `npm run dev`.
2. Wybierz **Utwórz prywatny pokój**.
3. Skopiuj link lub kod.
4. Otwórz link w drugiej karcie **tej samej przeglądarki** albo ręcznie wpisz kod na stronie startowej.
5. W drugiej karcie kliknij **Dołącz do pokoju**.
6. Pierwsza karta gra białymi, druga czarnymi. Ruch wykonany w jednej karcie pojawia się w drugiej.

> Obecnie pokoje są demonstracją frontendową: używają `localStorage` i `BroadcastChannel`, więc działają tylko w obrębie tego samego profilu przeglądarki. W etapie z Flask i WebSocket synchronizacja zostanie przeniesiona na serwer i zacznie działać między różnymi urządzeniami.

## Uruchomienie lokalne

Wymagany jest Node.js oraz npm.

```bash
npm install
npm run dev
```

Vite wyświetli w terminalu lokalny adres, zwykle `http://localhost:5173`.

## Plan rozwoju

1. Serwer Flask z REST API i WebSocketami dla rzeczywistych pokoi online.
2. Rejestracja, logowanie i rozgrywka jako gość.
3. Baza danych: użytkownicy, partie, ruchy oraz historia.
4. Ranking Elo i profile graczy.
