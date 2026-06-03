# KDP-Status — echter Katalog (aban news / Pen-Names)

> Register aller KDP-Titel + Upload-Status. **Quelle der Wahrheit fürs Tracking.**
> Getrennt von `build_book.py` (das nur die *baubaren* Low-Content-Bücher kennt:
> ADHD, Mileage). Bücher aus anderen Pipelines (Romane, externe Workbooks) werden
> hier nur **verzeichnet**, nicht gebaut. Stand: 2026-06-03.

| Buch | Format | Status | Preis | ASIN | Pipeline |
|------|--------|--------|-------|------|----------|
| **Schicht: Eine Ruhrgebiet-Saga in drei Bänden** (DE) | Kindle eBook | ✅ **Live** (Amazon-Mail bestätigt, 3. Juni 2026) · **KDP Select** angemeldet | €8.99 | B0GX2YK983 | ki-schriftsteller |
| Schicht: Eine Ruhrgebiet-Saga in drei Bänden (DE) | Taschenbuch | ✅ **Live** (Dashboard bestätigt, 3. Juni 2026) | $8.99 | B0H3R73GWZ | ki-schriftsteller |
| **The Seam: A Ruhr Valley Saga in Three Volumes** (EN) | Kindle eBook | ✅ **Live** (Dashboard bestätigt) | $9.99 | B0H3KNC6TM | ki-schriftsteller |
| The Seam: A Ruhr Valley Saga in Three Volumes (EN) | Taschenbuch | ✅ **Live** (Dashboard bestätigt) | $9.99 | B0H3NH1JTB | ki-schriftsteller |
| **Vision Board Workbook for Women** (Pen: Sage Whitfield) | Taschenbuch | ✅ **Live** (Dashboard bestätigt) | $11.99 | B0H3JZZPM5 | extern |
| **ADHD Daily Planner for Adults** (Pen: Marcus Reilly) | Taschenbuch | 🟠 **Untertitel beanstandet** (PRI-2640XYPFH86) → bereinigt; **nur Untertitel-Feld** ändern + neu einreichen (Frist 5 Tage ab 3. Juni). Innenteil **extern, 102 S.** (bereits freigegeben — nicht anfassen) | $8.99 | folgt | `build_book.py` (`adhd`) |
| **Mileage Log Book for Small Business** (Pen: Marcus Reilly) | Taschenbuch | 🟡 **Eingereicht, in Prüfung** (3. Juni 2026; Innenteil 119 S., Cover hochgeladen) | $6.99 | folgt | `build_book.py` (`mileage`, Innenteil extern) |

## Legende
- ✅ Live (im Dashboard/Mail bestätigt)
- 🟡 in Amazon-Prüfung („Wird veröffentlicht"/„eingereicht", nichts mehr zu tun)
- ⏳ Dateien/Entwurf in Arbeit, Upload bzw. Build steht noch aus
- ❔ Status unklar / nachsehen

## Notizen
- **Schicht eBook (DE)**: bei **KDP Select** (90 Tage Exklusiv) → Kindle Unlimited
  (Seiten-Tantieme aus dem Fonds) + Werbetools (Kindle Countdown Deals,
  Gratis-Aktionen). Beim Vermarkten nutzbar.
- **Planer/Logbücher (ADHD, Mileage): bewusst KEIN Kindle-eBook.** Die zum
  Reinschreiben gedachten Seiten funktionieren auf dem Reader nicht → schlechte
  Rezensionen. Diese Titel bleiben Taschenbuch-only (eBook-Upsell „Schließen").
- **Untertitel-Lehre (KDP-Richtlinie):** Untertitel darf Titelwörter NICHT
  wiederholen und keine Keyword-Liste sein. ADHD-Untertitel war
  „A 90-Day Planner Built for an ADHD Brain — Time-Blocks, Body Doubling,
  Dopamine Tracking, and the Three Most Important Tasks of the Day" → beanstandet
  (ADHD/Planner doppelt + Vierer-Liste). Neu: „A 90-Day Undated Journal with
  Time-Blocks, Body Doubling, and a Top-3 Each Day". Bei neuen Low-Content-Titeln
  gleich repetitionsfrei + ohne Listen-Untertitel anlegen.

## Pflege
- **„BUCHDRUCK"** baut nur die `build_book.py`-Bücher mit `uploaded: False`
  (aktuell ADHD + Mileage). Nach dem Upload dort `"uploaded": True` setzen.
- Live-/Prüf-Status der **Roman-/externen** Titel hier von Hand pflegen
  (kein Build-Schritt). Beim Hochladen ASIN + Datum eintragen.
