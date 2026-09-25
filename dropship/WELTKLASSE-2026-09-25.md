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

## Nachtrag: Quelle der Fremdvariante = CK-Fusion vom 06.08. (`/tmp/ck_merge.py`, 14 Modelle)
Die Fusion legte Fortura-Kostüme über das 4-stellige Modellpräfix zusammen (CK4194…). Fortura vergibt aber
unter einem Präfix VERSCHIEDENE Artikel (CK4194140 = Falbala, CK4194140**H** = Hexe Magie). Alle 17 gedrafteten
Fusions-Verlierer per EAN gegen die aktiven Ziele geprüft, Sichtbogen der Hauptbilder:
| Aktives Produkt | Fremdvariante | echter Artikel |
|---|---|---|
| Kostüm Hexe Laurelin mit Hut | S (fortura-CK4188S) | Supergirl Damenkostüm |
| Kostüm Kürbis Hexe mit Hut | M (CK4193M), 128 cm (CK4193128) | Asterix (Erwachsene/Kind) |
| Kostüm Umhang Hexe | 128 cm (CK4213128) «Zauberer» | gleicher schwarzer Umhang → bleibt |
| Kostüm Hexe Magie schwarz · Gr. 128cm | 140 cm | Falbala → Produkt DRAFT + 301 (oben) |
Alle anderen 12 Fusionen (Eiskönigin, Lucinda, Wednesday ×5, Bad Girl, Marsupilami, Obelix, Mr Crazy, Naruto, Wildschwein) = gleicher Artikel.
0 Bestellungen auf allen betroffenen SKUs.

**Getan:** Variante löschen wurde als nicht umkehrbar abgelehnt → stattdessen die 3 Fremdvarianten auf 0 (DENY,
mit Vergleichswert, rückgelesen) und `fortura_bestand_sync.mjs` hat eine **Sperrliste** `dropship/_fortura_sperr_varianten.txt`
(InventoryItem-GID, nicht SKU — das gedraftete Original trägt dieselbe SKU und behält seinen Bestand). Ohne Sperre hätte
der nächste Feed-Lauf die Menge zurückgeschrieben. **OFFEN (Betreiber):** die 3 Varianten endgültig löschen
(Shopify-Admin → Produkt → Variante löschen), dann Sperrzeilen entfernen. Bis dahin zeigen sie «ausverkauft».
