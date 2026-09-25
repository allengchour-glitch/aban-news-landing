# «weltklasse luxestyle machen» — Runde 1 (25.09.2026)

Betreiber-Auftrag 25.09.: «weltklasse luxestyle machen». Erst messen, dann nur ändern, was
dem Kurs (Conversion, Katalog NICHT verkleinern, viele Produkte auf der Startseite) nicht widerspricht.

## GEMESSEN
| Befund | Zahl | Urteil |
|---|---|---|
| Halloween-Reihe auf der Startseite | Platz **17 von 25** (erste Wechsel-Reihe) | Fehler: 36 Tage vor Halloween, 77 % mobil → kaum gesehen |
| Gleichnamige Paare in «Halloween» | 10 Paare | 6 echte Fortura-Doppel (fg/ft gleiche SKU) — **alle schon DRAFT** mit `duplikat-auto-draft` (Kollektion zählt Entwürfe mit: 230) |
| Aktive Produkte mit gleicher Fortura-SKU (Export 25.09. 03:10, 49'888 aktive) | **1 Paar** | «Kostüm Hexe Magie schwarz · Gr. 128cm»: 128 cm doppelt zum vollständigen Set, die 140-cm-Variante war das **Falbala-Kostüm** (EAN 3661652042694) unter Hexen-Foto und -Titel, CHF 78.90 |
| Startseite | 25 Sektionen, 18 Produktreihen à 8 | bleibt — Betreiber wollte «mehr coole Produkte» (Aufgabe #3), Limit 25 Sektionen |

## GETAN
- `homepage_katalog_rotation.py` Regel 6: im Saisonfenster steht die Reihe mit dem Saison-Katalog
  (Halloween 01.09.–31.10., danach Weihnachten) **direkt unter der Herbst-Reihe** — live: Platz 17 → 5,
  Rücklesen bestätigt, Selbsttest 1 neue Prüfung, idempotent. Backup `theme_backup/index.json.vor-saison-oben-2026-09-25`.
- Falbala-Fehlgriff: DRAFT + Tags `duplikat-auto-draft`, `falsche-variante-falbala`, 301 auf
  `/products/kostum-hexe-magie-fgssck4194` (116–152 cm). 0 Bestellungen auf beiden SKUs.

## OFFEN (nicht selbst lösbar oder später)
- Kosmetik ohne INCI-Liste: nur aus Lieferantendaten, nie erfinden → CJ-Abfrage nach dem 28.09. (Eimer-Vorrang Kosten-Nachtrag).
- «Über uns» ohne Foto/Adresse: Inhalt vom Betreiber (Foto, Ort).
- Bewertungen auf den meistbesuchten Seiten: Import läuft ehrlich (alle Sterne), nichts erfinden.
