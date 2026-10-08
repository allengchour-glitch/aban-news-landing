# Tag 9 «Vertrauen» vorgezogen — Bewertungen für die Neuware + Klimaaussagen raus (08.10.2026, 04:00–05:00 UTC)

Betreiber 08.10.: «weiter verbessern». Plan-Punkt Tag 9 (`WEBSEITE-12-TAGE-PLAN.md`): Bewertungs-Import für Neuware
(echte CJ-Kommentare, alle Sterne), Versand-/Rückgabe-FAQ schärfen.

## 1. Bewertungs-Import erreichte die Neuware nicht

**GEMESSEN vorher:**
- 2'695 aktive Neuimporte seit 01.10., davon **107 geprüft (4 %)**, 8 mit Bewertung (21 Bewertungen).
- Arbeitsliste `bewertungen_prio.py`: Neuware nur über die ersten 60 von «neu-eingetroffen», hinter 711 ungeprüften
  Produkten der sichtbaren Reihen. Tageslimit 150.
- Die letzten zwei Tagesläufe **starben am stündlichen Container-Neustart** nach 31 bzw. 38 von 150 Produkten
  (`/tmp/cj_reviews_import.log`, kein Schlusssatz); das Tor war «Log älter als 24 h», also kam der Rest erst am nächsten Tag.
- 1'931 der 2'695 Neuimporte tragen die CJ-pid direkt in der SKU (`CJ-<19 Ziffern>`). Der Importer schlug sie trotzdem
  per `product/query?pid=` nach. Der Abruf kostet 10 CJ-Punkte (Notiz 28.08.) und scheitert bei leerem Punktetopf
  (gemessen leer ab ~04:00–04:26 UTC bis Mitternacht). Der Kommentar-Abruf selbst kostet nichts. Am 08.10. um 04:10 lief er
  nachgemessen bei leerem Topf weiter: Code 200, Kommentare geliefert.

**GETAN:**
- `cj_reviews_import.mjs`: rohe pid (Ziffern ≥ 15 / UUID) = pid, kein Nachschlag. Eine falsche pid liefert 0 Kommentare,
  nie fremde (die SKU hat unser Importer aus genau dieser pid gebaut). Schlusszeile immer `FERTIG: … · quittiert n/m`,
  dazu `WEITER` bei voller Charge mit ≥ 50 quittierten.
- `bewertungen_prio.py`: Neuware der letzten 21 Tage (CJ-SKU, neueste zuerst) im **Reissverschluss** mit den sichtbaren
  Reihen; «FERTIG: N Kandidaten» heisst jetzt «Arbeitsliste: …», weil es mitten im Lauf steht.
- `fixer_keepalive.sh`: START-Marke, `still_gestorben` holt einen am Neustart gestorbenen Lauf nach (3×/Tag), `WEITER`
  startet nach 1 h die nächste Charge; Charge 150 → 400.

**GEMESSEN nachher:** Arbeitsliste 2'620 Kandidaten (alle 2'588 ungeprüften Neuimporte drin). Erste Charge 80 Produkte
in ~8 min: **19 echte Bewertungen auf 4 Produkten**, 54 quittiert, 26 ältere Produkte ohne pid in der SKU warten auf
Punkte (Fenster 00:00 UTC). Shopify zeigt sie: Hundepullover 8, Heizkissen 8, Strandtuch 2, Lederhandtasche 1.
Prüfung der Echtheit: Ein «Kabel-Organizer» bekam Bewertungen über eine «Geldbörse». Gleiche pid, die Käufer nutzen die
PU-Clip-Tasche für Scheine, Quittungen und Kopfhörer, also echt und zum selben Produkt.

**OFFEN:** ~2'500 Kandidaten. Bei ~350/h Lauf und 1 Charge/h (Takt teilt sich mit 3 Grind-Runnern) sind das 2–3 Tage.
Nachmessen 09./10.10.: geprüfte Neuware, Bewertungen auf Neuware.

## 2. Versand-/Rückgabe-FAQ: unbelegte Klimaaussagen

**Abgleich der Texte (FAQ, Versand-, Rückgabe-, Garantieseite, Versand- und Rückgaberichtlinie) mit den Fakten:**
- Gratisversand: Texte «ab CHF 50», Versandprofil «ab CHF 45». Das ist **gewollt** (Betreiber 02.10.: 45 = 50 nach
  10-%-Bundle-Rabatt, Wächter `versandschwelle_rabatt.py` OK) und darum **kein Befund**.
- **Befund:** Die öffentliche Versandseite versprach «Das spart CO2» und «Direkt-Versand reduziert Transport-CO2». Ein
  Abschnitt «Nachhaltigkeit» behauptete «Recyclebare Verpackung · Kein unnötiges Plastik · Recycelter Karton» — dabei
  verpackt der Lieferant, nicht wir.
  QUELLE: Art. 3 Abs. 1 lit. x UWG (in Kraft 01.01.2025). Klimaaussagen ohne objektive, überprüfbare Grundlage sind unlauter.
  Die Beweislast trägt in der Praxis der Werbende, und die BAFU-Vollzugshilfe UV-2561 (03/2026) behandelt «klimaneutral» als
  nicht beweisbar ([BAFU](https://www.bafu.admin.ch/de/vollzugshilfe-uwg),
  [PwC](https://www.pwc.ch/en/insights/sustainability/climate-claims-under-the-swiss-uwg.html)).
- **Vollscan GEMESSEN:** 11 aktive Produkte (9 Gelato-Poster «klimaneutral gedruckt», Holzkocher «reduziert den
  CO2-Fussabdruck», Ballerina-Boots «klimafreundliche PU-Dämpfung»), 1 Blogartikel («E-Velo: absolut emissionsfrei»).
  Veröffentlicht sonst keine. Unveröffentlichte Altseiten tragen erfundene Zahlen («60 % weniger CO₂»), sind aber nicht sichtbar.

**GETAN:**
- Versandseite: Satz und Abschnitt entfernt (Sicherung `_seiten_backup/versand-lieferung_2026-10-08.json`). Rückgelesen
  und per WebFetch bestätigt: kein «CO2»/«Nachhaltigkeit» mehr. Blogartikel: Zeile durch «Ohne Abgase: Velo mit Muskelkraft,
  E-Velo mit kleinem Akku – Benzin braucht keines von beiden» ersetzt (Sicherung liegt daneben).
- **EINE Regeldatei** `automation/data/klima_regel.json` (Anspruch, Ausnahmen wie CO2-Messgerät/CO2-Kartusche/«gibt CO₂ frei»,
  Wort- und Nebensatz-Schnitt, 13 Kanarienvögel).
- Wächter `automation/klimaaussagen_wache.py`: Kanarien 13/13, **11 Produkte gesetzt / 0 Fehler** (Altwert im Ledger
  `_klimaaussagen.tsv`), Seiten → `KLIMAAUSSAGEN.md`. Er läuft täglich im Aufseher direkt nach `seo_voll_audit` und braucht
  keinen zweiten Bulk-Export.
- Quelle: `cj_copy_prompt.mjs` `klimaSicher()` in `textPolieren()`, das alle drei CJ-Importer aufrufen. Dazu kommt eine
  Prompt-Zeile. Gleichlauf: JS-Kanarien 13/13, echte Texte Python = JS 11/11, JS über alle 51'511 Texte genau dieselben 11
  (keine Fehlalarme), `textpolitur_test` grün.

**OFFEN (andere Klasse, lit. b):** allgemeine Umweltwörter in Lieferantentexten. «umweltfreundlich» steht in 476 Produkten,
«nachhaltig…» in ~190, «biologisch abbaubar» in 10. Das sind keine Klimaaussagen; jede einzelne wäre am Lieferanten zu
belegen. 

## 3. Nebenbefund: «für du und deinen Hund»

GEMESSEN: 14 aktive Produkte mit einem Überbleibsel der Sie→du-Umstellung (11× «für du», 2× «um du … warm zu hältst»,
1× «ohne du zu belastest»). GETAN: auf der LIVE-Fassung korrigiert («für dich», «um dich … zu halten», «ohne dich zu belasten»),
**14 gesetzt / 0 Fehler**, zurückgelesen, Altwerte in `_du_akkusativ_2026-10-08.tsv`. Neue Importe schreiben seit 02.09. direkt in
du-Form (Prompt), darum kein eigener Wächter; bei einem neuen Fund wird es eine Regel in `textPolieren`.
