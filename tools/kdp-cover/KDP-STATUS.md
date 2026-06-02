# KDP-Status — echter Katalog (aban news / Pen-Names)

> Register aller KDP-Titel + Upload-Status. **Quelle der Wahrheit fürs Tracking.**
> Getrennt von `build_book.py` (das nur die *baubaren* Low-Content-Bücher kennt:
> ADHD, Mileage). Bücher aus anderen Pipelines (Romane, externe Workbooks) werden
> hier nur **verzeichnet**, nicht gebaut. Stand: 2026-06-02.

| Buch | Format | Status | Preis | ASIN | Pipeline |
|------|--------|--------|-------|------|----------|
| **Schicht: Eine Ruhrgebiet-Saga in drei Bänden** („The Seam") | Kindle eBook | ✅ **Live** (eingereicht 2. Juni 2026) | €8.99 | B0GX2YK983 | ki-schriftsteller |
| Schicht: Eine Ruhrgebiet-Saga in drei Bänden | Taschenbuch | 🟡 **Wird veröffentlicht** (Amazon-Prüfung, ~72 h → live; geändert 31. Mai 2026) | $8.99 | B0H3R73GWZ | ki-schriftsteller |
| **Vision Board Workbook for Women** | (?) | ❔ Status prüfen | — | — | extern |
| **ADHD Daily Planner for Adults** (Pen: Marcus Reilly) | Taschenbuch | ⏳ **gebaut, noch nicht hochgeladen** | $8.99 | — | `build_book.py` (`adhd`) |
| **Mileage Log Book for Small Business** (Pen: Marcus Reilly) | Taschenbuch | ⏳ **gebaut, noch nicht hochgeladen** | $8.99 | — | `build_book.py` (`mileage`) |

## Legende
- ✅ Live · 🟡 in Amazon-Prüfung („Wird veröffentlicht", nichts mehr zu tun)
- ⏳ Dateien fertig (Cover/Innenteil/metadata/Runbook), Upload steht noch aus
- ❔ Status unklar / nachsehen

## Pflege
- **„BUCHDRUCK"** baut nur die `build_book.py`-Bücher mit `uploaded: False`
  (aktuell ADHD + Mileage). Nach dem Upload dort `"uploaded": True` setzen.
- Live-/Prüf-Status der **Roman-/externen** Titel hier von Hand pflegen
  (kein Build-Schritt). Beim Hochladen ASIN + Datum eintragen.
