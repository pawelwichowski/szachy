# Szachy online

Projekt na przedmiot **Aplikacje internetowe**. Aplikacja będzie rozwijana etapami jako klient React oraz serwer Python z bazą danych.

## Aktualny etap: legalne ruchy i zakończenie partii

- responsywna szachownica 8×8 z początkowym ustawieniem figur;
- ruch przez kliknięcie figury i pola docelowego albo przez przeciągnięcie;
- wskazanie wyłącznie legalnych pól docelowych dla wybranej figury;
- blokowanie ruchów niezgodnych z zasadami, także tych zostawiających własnego króla w szachu;
- obsługa szacha, mata, pata i remisu;
- roszada, bicie w przelocie oraz wybór figury przy promocji pionka;
- historia ruchów w zapisie szachowym (SAN);
- podgląd pozycji po dowolnym ruchu z historii bez możliwości zmodyfikowania rozgrywanej partii;
- rozpoczęcie nowej partii.

Reguły obsługuje biblioteka `chess.js`. Stan po każdym ruchu jest zapisywany jako FEN, dzięki czemu kliknięcie wpisu historii odtwarza dokładną pozycję z tamtego momentu.

## Uruchomienie lokalne

Wymagany jest Node.js oraz npm.

```bash
npm install
npm run dev
```

Vite wyświetli w terminalu lokalny adres, zwykle `http://localhost:5173`.

Po pobraniu zmian etapu 2 wykonaj ponownie `npm install`, ponieważ projekt ma nową zależność: `chess.js`.

## Plan rozwoju

1. Frontendowe lobby oraz tworzenie partii.
2. Serwer Flask z API i WebSocketami.
3. Rejestracja/logowanie oraz gra jako gość.
4. Baza danych: użytkownicy, partie, ruchy i historia.
5. Ranking Elo i profile graczy.
