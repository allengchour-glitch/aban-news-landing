# 🌙 Nachtschicht 27.09. 22:30 → 28.09. 10:30 UTC (Betreiber: «mache jetzt 12 stunde autonom, mit allem drum und dran»)

Weckzeiten (send_later, je ein Block): 00:00 · 02:00 · 04:00 · 06:00 · 08:00 · 10:00 UTC — dazu Keepalive stündlich und
Verbesserungsrunde 00:25 / 04:25 / 08:25. Je Block: `uptime` → Keepalive-Stand → nächsten offenen Punkt nehmen, erledigen,
hier abhaken (✅ + Zahl), committen, pushen. Kein Punkt ohne Messung vorher und nachher.

**Grenzen (gelten die ganze Nacht):** keine Kundenmails, keine Rückerstattungen, keine Zahlungen; Grind bleibt pausiert
(`autostart.sh` respektiert die Pause jetzt); `_SOCIAL_STOPP` nie anlegen; Theme nur mit Live-Datei + Backup; Tags nur mit
`tagsAdd`/`tagsRemove`, NIE `productUpdate(tags:)`; Push-Schleife mit `|| git merge --abort`; Kadenz nicht anziehen.

## Punkte (Reihenfolge = Wirkung auf Verkäufe)

1. [~] 00:05 Gmail geprüft: KEINE Antwort von Frau Riedi (Thread nur unsere Mail 27.09. 22:04), nichts gesendet; Bestell-Ampel 1 offen (#1019, LX1019 CREATED, unbezahlt = gewollt bis Entscheid 30.09.). **Bestellungen:** #1019 — Kundin-Antwort in Gmail lesen (from:alicia.riedi@powersurf.li); NICHTS senden, nur melden.
   Neue Bestellung → sofort `cj_order_engine.py` (USD_CHF per WebSearch, Frankfurter/ER-API gesperrt) + Ausgelistet-Prüfung.
2. [x] ✅ 23:04 Lauf 2: 643 geprüft, 0 ausgelistet, 1 ohne Urteil (vorher 205 — Varianten-SKU-Fix wirkt); zusammen mit Lauf 1: 2 ausgelistet → DRAFT. 22:24 wartende Posts geprüft: 0 bewerben die 3 ausgelisteten (Schaukelgeist, 2 Sojawachskerzen); Endbericht folgt. **Ausgelistete Ware:** Lauf `cj_ausgelistet_sichtbar.py` auswerten (Bericht `dropship/CJ-AUSGELISTET-SICHTBAR.md`);
   ausgelistete Artikel aus wartenden Social-Posts nehmen (reels_seed.csv / posts_image.csv / ig_karussell.csv → Status
   `produkt-nicht-aktiv`), damit kein Post ein totes Produkt bewirbt.
3. [x] ✅ 22:45 Stichprobe 5 live (WebFetch): 5/5 deutsch, Material passt zum Titel (Holz/Bambus, PU/Metall), 1 Widerspruch Gewicht (Uhr «ca. 100 g» vs. Text «148 g» — CJ productWeight vs. Groq-Text); «Patentleder», «Neuzeitbox», «geglühte Sohle» stehen im ALTEN Groq-Text, nicht im Block. Ledger 998. **Faktenblock-Nachtrag** (CJ-Merkmale in die Produktseite): Fortschritt messen (`_cj_specs_done.txt`), Stichprobe 5
   neue Blöcke per WebFetch ansehen (Material/Masse deutsch, keine Floskel, keine falsche Grösse).
4. [x] ✅ 22:25 Formatprüfung eingebaut (ohne mediaCount → PAUSE «kein Urteil», DRY bestätigt). **cj_bild_backfill-Zählfehler:** meldet «45'333 mit ≤ 1 Bild» aus `/tmp/export.jsonl` (Export OHNE Medien) —
   Stichprobe 120 aktive CJ: 119 mit ≥ 3 Bildern. Kandidaten nur aus einem Export MIT Medienzahl (format_ok-Prüfung), sonst
   «kein Urteil».
5. [x] ✅ 22:50 Herbst-Sammelvideo (6 Produkte, 24 s, Hook 6.46, Preise live ok) an Betreiber geschickt, liegt in social/montage_proben/ — posten nach OK. Gadgets: Pool fast nur Smartwatches + Werbetext-Bilder → Thema Herbst. **Sammel-Video (mehrere Produkte, 24 s, Musik luxe-epic-anime):** `montage_auswahl.py` lief in die Zeitgrenze (OCR bei
   Last 24) → Bildtext-Prüfung nur für die gewählten Bilder mit Cache, Pool kleiner; erstes Video «Gadgets» rendern,
   Kontaktbogen per Read prüfen, Preis-Metadatum `--pruefen`, dem Betreiber schicken. Posten erst nach seinem OK.
6. [x] ✅ 22:40 QUELLE 27.09.: Trends bestätigt (Hunde-Trinkflasche, Sternenhimmel-Projektor, UV-Reiniger, Qi2-Ladestation); neu «AquaBrush» (Sprüh-Haarbürste) Bestand 0 (Kanarienvogel Haarbürste = 3), Peeling-Seren abgelehnt; THEMEN unverändert. **Hype-Recherche (Dauerauftrag):** Web-Suche Trends Ende September 2026 → `automation/hype_kuratieren.py` THEMEN +
   QUELLE (Datum) aktualisieren, am Bestand messen, Kanarienvögel, Lauf.
7. [-] 00:15 ZURÜCKGESTELLT: Quellvideos lassen sich keinem Shop-Produkt sicher zuordnen (CJ-Produktabfrage von 40 Rucksack-Kandidaten enthält die Download-Hashes nicht) → kein geprüfter Preis fürs Bild; ohne Zuordnung keine Probe. **Schnitt-Proben:** die zwei übrigen CJ-Quellvideos (Reiserucksack 16:9, Lederrucksack 9:16) mit `schnitt.py` +
   luxe-epic-anime schneiden, Tor muss bestehen, Kontaktbogen prüfen → als Proben bereitlegen (nicht posten).
8. [x] ✅ 10:05 Journal Nachtrag 106 (ganze Nacht) + Index-Zeilen 28.09.; Morgenbericht an Betreiber. **Gedächtnis:** Journal + Index für alles Neue der Nacht; Morgenbericht (GEMESSEN / GETAN / OFFEN für den Betreiber).

## Protokoll
- 22:30 Plan angelegt. Nachprüfung beworbene CJ-Ware läuft (bisher 2 ausgelistet: Sojawachskerzen Zitrus/Holz + Orchidee,
  Herbst-Favoriten → DRAFT). Faktenblock-Lauf LIMIT 400 gestartet.
- 22:25 Punkt 4 erledigt; Punkt 5: montage_auswahl prüft nur noch ≤ 5 Bilder je Kandidat (Abbruch bei genug) — Lauf läuft.
- 22:50 Punkt 5: Sammelvideo Herbst fertig (Intro-Karten fliegen auf den Beat ein: Hook 0.98 → 6.46; Füllwort-Namen «mit/aus/im» gekürzt).
- 22:52 Ausgelistet-Lauf 1: 645 geprüft, 2 ausgelistet, 205 ohne Urteil = Varianten-SKUs als pid abgefragt → korrigiert, Lauf 2 läuft.
- 22:44 Halloween-Sammelvideo (Betreiber «halloween sachen, auch fortune sachen / kostüme»): 3 Kostüme + 3 Deko, Hook 7.37, Preise live ok, an Betreiber geschickt (social/montage_proben/). Auswahl-Fixes: Kostüm = «Kostüm» im Titel (Produkttyp allein gab nur Zubehör), Lizenzfiguren gesperrt (Pennywise/Hagrid/PJ Masks …), Lebensmittel gesperrt («Trolli Dracula» = Gummibärchen). Fortura-Kostüme ohne Lizenz und mit Halloween-Bezug: Ghost/Hexe/Sensemann/Spider Witch — Auswahl nahm die bewerteten/textfreien zuerst.
- 22:40 ⛔ GRIND-LECK: `schulstart_lauf.sh` importierte seit Container-Start (20:40) über cj_sku_import (Fertig-Marker nur in /tmp → nach Neustart weg), trotz Grind-Pause. Gestoppt; Pause-Prüfung in schulstart_lauf.sh UND cj_runner_template.sh (engines_up.sh startet die Runner ohne Prüfung).
- 23:00–00:15 (zwischen den Blöcken, Betreiber-Aufträge): Sammelvideo-Karte +42 % Fläche (Halloween + Herbst neu, Tor ok); Musik nur episch (adventure-uplift aufgenommen, 7 wartende Reels umgestellt); «push was Leute kaufen»: Ersatz-Rizinusöl-Wickel live (meistbesuchte tote Seite), 7 gekaufte Artikel als kunden-liebling in Bildposts + Vorrang.
- 00:01 Container-Neustart (uptime 0 min) → Keepalive: STAND 0 CJ-Runner, Aufseher=1.
- 02:05 Block 2: Container-Neustart (uptime 0) → Keepalive STAND 0 CJ-Runner, Aufseher=1. #1019: weiter keine Antwort (Gmail from:alicia.riedi… 0 Treffer), nichts gesendet. Preis-Verlustschutz (nach Export-Reparatur 00:25) arbeitet: 750/5'956 Produkte, Stichprobe richtig (Holz-Armbanduhr 25.90→35.90 bei EK 25.15, Strickjacke 18.90→23.90 bei EK 16.53), 148 gesperrt (>2× Sprung → DENY); neuer Rizinusöl-Wickel NICHT betroffen (Boden ≤ 13.90 < 16.90) → wartender Post bleibt gültig. Offen: Punkt 8 (Morgenbericht 10:00).
- 04:05 Block 3: Neustart (uptime 0) → Keepalive ok. #1019 weiter ohne Antwort (nichts gesendet). Preis-Verlustschutz 1'250/5'956 (4'442 Varianten gehoben, 248 gesperrt). Meisterwerk-Tor stoppte 2 der 3 umgezogenen CDN-Reels (Bildpreis 7.90 ≠ Caption 14.90 — alter eingebrannter Preis) → `meisterwerk-tor-skip`, blockieren nichts; die 5 übrigen ready-Reels vorab mit PREIS_SOLL geprüft: 5/5 ok.
- 06:05 Block 4: Keepalive ok (uptime 7 min). #1019 weiter offen (bis Entscheid 30.09.). Preis-Verlustschutz 5'500/5'956: 40'347 Varianten gehoben, 1'231 Produkte GESPERRT (DENY, nötiger Preis > 2× bisher) — diese sind jetzt nicht mehr kaufbar → im Morgenbericht nennen. Reel-Queue 9 ready (Server-Weg lief, 2 Sammelvideos vorne). TikTok 10:05 = Lederrucksack (vor den Sammelvideos eingeplant), Sammelvideo folgt im nächsten Termin.
- 08:05 Block 5: Preis-Verlustschutz FERTIG 07:26. KORREKTUR zu 06:05: «1'231 gesperrt» war der kumulierte Zähler über mehrere Neustart-Läufe — gemessen im Ledger heute: 445 Produkte / 2'159 Varianten auf DENY (nötiger Preis > 2×, z. B. Baum-Hängematte 22.90 bei EK 43.39). 0 davon in wartenden Posts, 0 Kunden-Lieblinge, Rizinusöl-Wickel nicht betroffen. Nebenbei 06:30: Zeiger-Dateien-Union in repo_vorspulen.sh behoben (3 Dateien mit 2–3 verklebten Zeigern, kein Verlust).

- 10:05 Block 6 (Abschluss): Neustart (uptime 0) → Keepalive ok. #1019 weiter ohne Antwort (Gmail 0 Treffer, nichts gesendet). Reel-Queue 17 ready; Halloween-Sammelvideo auf YouTube 16:05 geplant, Herbst-Sammelvideo wartet auf den nächsten IG/FB-Reel-Termin. Nachtschicht beendet.
