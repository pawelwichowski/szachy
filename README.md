# Szachy online

Projekt na przedmiot **Aplikacje internetowe**. Aplikacja będzie rozwijana etapami jako klient React oraz serwer Python z bazą danych.

## Aktualny etap

- responsywna szachownica 8×8 z początkowym ustawieniem figur;
- ruch przez kliknięcie figury i pola docelowego;
- ruch przez przeciągnięcie figury;
- zmiana tury, bicie figury przeciwnika i historia wykonanych ruchów;
- reset pozycji.

Na tym etapie aplikacja **nie sprawdza jeszcze zasad ruchu figur, szacha ani mata**. Jest to cel kolejnego etapu.

## Uruchomienie lokalne

Wymagany jest Node.js oraz npm.

```bash
npm install
npm run dev
```

Vite wyświetli w terminalu lokalny adres, zwykle `http://localhost:5173`.

## Plan rozwoju

1. Walidacja legalnych ruchów i zakończenia partii.
2. Frontendowe lobby oraz tworzenie partii.
3. Serwer Flask z API i WebSocketami.
4. Rejestracja/logowanie oraz gra jako gość.
5. Baza danych: użytkownicy, partie, ruchy i historia.
6. Ranking Elo i profile graczy.
