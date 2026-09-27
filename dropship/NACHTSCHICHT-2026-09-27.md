# 🌙 Nachtschicht 27.09. 22:30 → 28.09. 10:30 UTC (Betreiber: «mache jetzt 12 stunde autonom, mit allem drum und dran»)

Weckzeiten (send_later, je ein Block): 00:00 · 02:00 · 04:00 · 06:00 · 08:00 · 10:00 UTC — dazu Keepalive stündlich und
Verbesserungsrunde 00:25 / 04:25 / 08:25. Je Block: `uptime` → Keepalive-Stand → nächsten offenen Punkt nehmen, erledigen,
hier abhaken (✅ + Zahl), committen, pushen. Kein Punkt ohne Messung vorher und nachher.

**Grenzen (gelten die ganze Nacht):** keine Kundenmails, keine Rückerstattungen, keine Zahlungen; Grind bleibt pausiert
(`autostart.sh` respektiert die Pause jetzt); `_SOCIAL_STOPP` nie anlegen; Theme nur mit Live-Datei + Backup; Tags nur mit
`tagsAdd`/`tagsRemove`, NIE `productUpdate(tags:)`; Push-Schleife mit `|| git merge --abort`; Kadenz nicht anziehen.

## Punkte (Reihenfolge = Wirkung auf Verkäufe)

1. [ ] **Bestellungen:** #1019 — Kundin-Antwort in Gmail lesen (from:alicia.riedi@powersurf.li); NICHTS senden, nur melden.
   Neue Bestellung → sofort `cj_order_engine.py` (USD_CHF per WebSearch, Frankfurter/ER-API gesperrt) + Ausgelistet-Prüfung.
2. [~] 22:24 wartende Posts geprüft: 0 bewerben die 3 ausgelisteten (Schaukelgeist, 2 Sojawachskerzen); Endbericht folgt. **Ausgelistete Ware:** Lauf `cj_ausgelistet_sichtbar.py` auswerten (Bericht `dropship/CJ-AUSGELISTET-SICHTBAR.md`);
   ausgelistete Artikel aus wartenden Social-Posts nehmen (reels_seed.csv / posts_image.csv / ig_karussell.csv → Status
   `produkt-nicht-aktiv`), damit kein Post ein totes Produkt bewirbt.
3. [ ] **Faktenblock-Nachtrag** (CJ-Merkmale in die Produktseite): Fortschritt messen (`_cj_specs_done.txt`), Stichprobe 5
   neue Blöcke per WebFetch ansehen (Material/Masse deutsch, keine Floskel, keine falsche Grösse).
4. [x] ✅ 22:25 Formatprüfung eingebaut (ohne mediaCount → PAUSE «kein Urteil», DRY bestätigt). **cj_bild_backfill-Zählfehler:** meldet «45'333 mit ≤ 1 Bild» aus `/tmp/export.jsonl` (Export OHNE Medien) —
   Stichprobe 120 aktive CJ: 119 mit ≥ 3 Bildern. Kandidaten nur aus einem Export MIT Medienzahl (format_ok-Prüfung), sonst
   «kein Urteil».
5. [x] ✅ 22:50 Herbst-Sammelvideo (6 Produkte, 24 s, Hook 6.46, Preise live ok) an Betreiber geschickt, liegt in social/montage_proben/ — posten nach OK. Gadgets: Pool fast nur Smartwatches + Werbetext-Bilder → Thema Herbst. **Sammel-Video (mehrere Produkte, 24 s, Musik luxe-epic-anime):** `montage_auswahl.py` lief in die Zeitgrenze (OCR bei
   Last 24) → Bildtext-Prüfung nur für die gewählten Bilder mit Cache, Pool kleiner; erstes Video «Gadgets» rendern,
   Kontaktbogen per Read prüfen, Preis-Metadatum `--pruefen`, dem Betreiber schicken. Posten erst nach seinem OK.
6. [ ] **Hype-Recherche (Dauerauftrag):** Web-Suche Trends Ende September 2026 → `automation/hype_kuratieren.py` THEMEN +
   QUELLE (Datum) aktualisieren, am Bestand messen, Kanarienvögel, Lauf.
7. [ ] **Schnitt-Proben:** die zwei übrigen CJ-Quellvideos (Reiserucksack 16:9, Lederrucksack 9:16) mit `schnitt.py` +
   luxe-epic-anime schneiden, Tor muss bestehen, Kontaktbogen prüfen → als Proben bereitlegen (nicht posten).
8. [ ] **Gedächtnis:** Journal + Index für alles Neue der Nacht; Morgenbericht (GEMESSEN / GETAN / OFFEN für den Betreiber).

## Protokoll
- 22:30 Plan angelegt. Nachprüfung beworbene CJ-Ware läuft (bisher 2 ausgelistet: Sojawachskerzen Zitrus/Holz + Orchidee,
  Herbst-Favoriten → DRAFT). Faktenblock-Lauf LIMIT 400 gestartet.
- 22:25 Punkt 4 erledigt; Punkt 5: montage_auswahl prüft nur noch ≤ 5 Bilder je Kandidat (Abbruch bei genug) — Lauf läuft.
- 22:50 Punkt 5: Sammelvideo Herbst fertig (Intro-Karten fliegen auf den Beat ein: Hook 0.98 → 6.46; Füllwort-Namen «mit/aus/im» gekürzt).
- 22:52 Ausgelistet-Lauf 1: 645 geprüft, 2 ausgelistet, 205 ohne Urteil = Varianten-SKUs als pid abgefragt → korrigiert, Lauf 2 läuft.
