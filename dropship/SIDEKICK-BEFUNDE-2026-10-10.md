# Shopify-Sidekick-Befunde (Betreiber-Screenshots 10.10.2026) — Zeile für Zeile geprüft

Sidekick verglich September mit August 2026. Jede Aussage hier am Shop nachgemessen (Admin-API, ShopifyQL, echter Browser).

| # | Sidekick sagt | Gemessen | Urteil |
|---|---|---|---|
| 1 | CHF 97.91 Umsatzrückbuchungen drücken den September | 3 Erstattungen: **#1016** Taschenmesser 47.90, **#1017** Taschenmesser 40.90 (CJ schickte aus Shanghai zurück), **#1019** Halloween-Schaukelgeist 16.11 + 7.00 Versand (CJ listete den Artikel nach dem Kauf aus) | **Stimmt, Ursachen behoben:** Klingen seit 16.09. gesperrt (207 gedraftet, `klinge_ch_wache.py`, Importer-Sperre); #1019-Produkt im Entwurf, CJ-Verfügbarkeit wird täglich geprüft |
| 2 | Conversion 0.255 %, Absprung 86.8 % | Sept.: «direkt» mobil 613 Sitzungen, 91 % Absprung. Davon 463 landen auf einer **Produktseite** mit 97 % Absprung; 381 aus der Schweiz, **Ø 7.7 s**. Okt. 1–4: TikTok-Lernkampagne (CHF 80) 530 Sitzungen auf 3 Kleider, 93–97 % Absprung, seit 05.10. 0 | **Stimmt; Ursache ist Social-Verkehr** (In-App-Browser ohne Herkunft = «direkt»), nicht die Seite. Erster Handy-Bildschirm geprüft (390×844): Bild, Titel, Preis, nichts verdeckt; Cookie-Banner seit 07.10. erst nach Scrollen |
| 3 | «Stichprobe von 30 Produkten: alle Entwurf, viele Varianten mit Bestand 0» | 52'459 aktiv, 30'419 Entwurf, 161 archiviert. **1'000 aktive Produkte** aus 5 Sortierungen: **1'000/1'000 kaufbar** (Bestand nicht geführt, «weiterverkaufen» = Absicht bei Dropshipping) | **Falsch verallgemeinert:** Sidekick traf die Entwürfe; «Bestand 0» ist kein Kaufhindernis |
| 4 | Top-Produkte mit je 1 Bestellung = keine Bestseller-Basis | #1018 E-Scooter-Ladegerät, #1020 Kristall-Set, #1021 Nibosi-Uhr, #1022 Cargo-Hose (Okt.) | Stimmt, nichts zu tun |

## Nebenbefund

Beim Prüfen der Produktseite stand im Auswahlfeld «Black, Hidden Elevator 8CM» neben «Weiss erhöht 8 cm». Jetzt heisst die Option «Schwarz erhöht 8 cm», zurückgelesen.

## Was daraus folgt

- **Die Seite ist nicht der Engpass, der Verkehr ist es.** Social-Besucher bleiben 7–8 Sekunden, Kaufabsicht ist kaum da.
- Die Verkäufe kamen über die Startseite und Google. Startseite: 9 Warenkörbe aus 226 Sitzungen, 1 Kauf. Google: Sitzungen mit 56–65 % Absprung statt 95 %.
- Das bestätigt den Kurs: Google-Gratis-Einträge und Suchbegriff-Kollektionen (OpenSEO 10.10.).
- Eine bezahlte TikTok-Kampagne bleibt Betreiber-Entscheid. Bei 0 Käufen aus 530 Sitzungen wäre vor einer Wiederholung die Zielgruppe zu klären, nicht die Seite.
