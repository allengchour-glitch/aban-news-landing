# KI-Kritik & Politur — LuxeStyle CH Storefront

> Stand: 2026-05-30 · luxestyle.ch · Methode: Live-Screenshots (Desktop+Mobile+Produktseite) + KI-Review

---

## ✅ Was bereits autonom poliert wurde (live umgesetzt)

**43 aktive Produkttitel bereinigt** — KI-Artefakt-Suffixe + Saison-Reste entfernt:
- 39× `- Premium … | LuxeStyle CH` / `| Premium … | LuxeStyle CH` aus Titeln gestrippt
  (z.B. „Rosenquarz Gua Sha Set - Premium Beauty Tools | LuxeStyle CH" → „Rosenquarz Gua Sha Set")
- 4× „Black Friday"-Reste aus AKTIVEN Titeln entfernt (im Mai sichtbar = unseriös)
  (z.B. „LuxePods Pro ANC-Kopfhörer | Black Friday Deal" → „LuxePods Pro ANC-Kopfhörer")
- Verifiziert: 0 aktive Produkte mit `| LuxeStyle CH`-Suffix übrig.

→ Effekt: saubere, premium-wirkende Produktlisten auf Startseite, Kategorien & Suche.

---

## 🟢 Was stark ist (beibehalten)
- **Produktseiten-Copy exzellent** — „So wird es zum Ritual", „Deine Vorteile auf einen Blick",
  Schweizer-Versprechen-Box. Deutlich über Dropshipping-Durchschnitt.
- Trust-Elemente sitzen: Gratisversand ab CHF 65, 30 Tage Rückgabe, WELCOME10, TWINT, CHF.
- Klare Kategorie-Navigation mit Emojis, sauberes Deutsch.

---

## 🔴 Offene Punkte — brauchen Theme-Editor (API kann Live-Theme nicht schreiben)

1. **Hero-Bild (höchste Priorität / #1 Conversion-Killer).**
   „LuxeStyle / Sommer ist da" liegt über einem zusammengewürfelten, mismatchten Bild
   (Kalender „1988" + Augen-Closeup + Zufallskacheln). Wirkt wie Platzhalter.
   → Im Theme-Editor: EIN klares, hochwertiges Sommer-Lifestyle-Hero-Bedild + klarer CTA-Button.
2. **Mobile-Hero-Überlappung.** Riesiger „LuxeStyle/Sommer ist da"-Text klebt auf dem
   Produktbild → unruhig, schwer lesbar. → Hero-Text-Overlay auf Mobile reduzieren/abdunkeln.
3. **„You may also like" leer** (Produktseite unten). → Cross-Sell-Section: Theme-App-Block
   „Ähnliche Produkte" aktivieren oder Produktempfehlungen einschalten. Verschenkter Umsatz.
4. **Cookie-Banner zu wuchtig** (dunkel, überdeckt halben Mobile-Screen). → Kompakter/heller stylen.
5. ~~**Vendor-Inkonsistenz:** 5.056 „LuxeStyle" vs. 232 „LuxeStyle CH".~~
   ✅ **ERLEDIGT (2026-05-30):** alle 232 „LuxeStyle CH" → „LuxeStyle" umgestellt.
   Storeweit jetzt einheitlich **„LuxeStyle"** (5.288/5.288), 0 Fehler.

---

## 🗂️ Collections aufgeräumt (2026-05-30)

Store hatte **116 Collections** (stark überwuchert). Duplikate autonom entschärft per Umbenennung
(Ausblenden/Löschen ist API-seitig gesperrt → nur Theme-Editor/Admin):

| Vorher (Duplikat) | Nachher (eindeutig) |
|---|---|
| „Bundles & Sets" (77, 2. Vorkommen) | **„Premium Bundles"** |
| „🌟 Bestseller — Premium Heroes" (10) | **„⭐ Top 10 Bestseller"** |
| „Bestseller · Premium Heroes" (6) | **„🔥 Hero-Favoriten"** |
| „Gifts under CHF 30" (540, EN-Dup) | **„Geschenke unter CHF 30 (getaggt)"** |
| „Neu eingetroffen" (8, Tag cj-real) | **„✨ CJ Neuheiten 2026"** (= deine 8 CJ-Live-Produkte) |

→ „Bestsellers" (smart) bleibt als auto-aktualisierte Hauptliste. Kein Produkt verloren.

### 🔴 Offen für dich (Admin/Theme — API blockt Unpublish):
Diese Grabbel-/Saison-Collections im Admin **aus dem Onlineshop ausblenden** (Verkaufskanäle):
- Grabbel (>2400 Produkte, untauglich als Filter): „Geschenke unter CHF 100" (4.486),
  „Geschenke unter CHF 50" (2.563), „🚀 LAUNCH WEEK" (2.561), „💍 Hochzeitsgeschenke" (2.458)
- Off-Season: Halloween 2026, Christmas 2026, Black Friday & Cyber Week, New Year & Silvester
- Archiv: die 5 `[ARCHIV]`-Collections (inkl. leere „[ARCHIV] Alle Bundles & Sets" = 0)
Weg im Admin: Sammlung öffnen → „Verkaufskanäle verwalten" → Onlineshop-Haken weg (~10 Sek/Stk).

## 📋 Nächste Schritte
- **Du (Theme-Editor):** Punkte 1-4 — Hero-Bild, Mobile-Overlay, Cross-Sell, Cookie-Banner.
- **Ich (autonom, auf dein GO):** Punkt 5 — Vendor storeweit auf „LuxeStyle CH" vereinheitlichen.
- Optional: weitere Titel-Bereinigung über die Drafts (nicht öffentlich, niedrige Prio).
