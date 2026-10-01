# Google-Fokus (Betreiber 01.10.: «google sachen machen, nur dort mache ich gewinn»)

## GEMESSEN (ShopifyQL, nur Menschen, 90 Tage)
| Quelle | Sitzungen | Warenkorb | Kasse | Kauf |
|---|---:|---:|---:|---:|
| Google-Suche | 337 | 20 | 15 | **5 (1,5 %)** |
| TikTok | 2'553 | 5 | 3 | 0 |
| Facebook | 1'019 | 0 | 0 | 0 |
| Pinterest | 109 | 3 | 1 | 0 |
Bestellungen 120 T nach Herkunft: Google 6 · direkt 10 · luxestyle 3.

**Google-Landeseiten 90 T:** Rizinusöl-Wickel-Set mit Bio-Öl 55 (2 Warenkörbe, 2× Kasse) — seit 18.09. Entwurf (keine CH-Linie),
Weiterleitung → Ersatz «Rizinusöl-Wickel wiederverwendbar» (aktiv, Google-Kanal, 28 Bilder, CHF 16.90; aber OHNE Öl) · Startseite 49 ·
1.-August 13 · Tunmate Rizinusöl 11 · Kühlgeräte (Saison vorbei) · Herzschlag-Kissen 4.
Google-Kanal: täglicher Lückenschliesser (`google_kanal_luecke.py`, zuletzt 95 nachpubliziert); Blocker 723 von 49'195 (1,5 %).

## GETAN
- CJ-Suchaufträge ganz vorne: Rizinusöl-Wickel-SET mit Öl, Bio-Wickel, hexanfreies Öl (die Suchabsicht der Google-Besucher).
- Neuimporte gehen automatisch in den Google-Kanal mit Google-Kategorie; Titel-Kauderwelsch-Wache (Tag 1) schützt die Titel,
  die Google zuerst liest.

## OFFEN — die zwei Klicks mit dem grössten Google-Effekt (Betreiber, Merchant Center, Auftrag `COWORK-MERCHANT-2026-10-01.md`)
1. **Lieferzeit eintragen** (fehlt in der Store-Qualität CH ganz; Merchant sagt 6–14 WT, Shop 10–20 WT).
2. **Deutschland aus den Feed-Ländern** (wir liefern nur CH; DE zieht die Qualitätswerte runter).

## Nachtrag 16:45 — «google rangliste cj sachen pushen»
**GEMESSEN:** 25 neueste aktive CJ-Produkte: 13 ohne `google_product_category`, Kleidung ohne `gender`, alle Typ «Trend-Produkt».
Die Nachläufer sind täglich → neue Ware bis 24 h ohne Kategorie bei Google. Zwei falsche Regeln: «Adventskalender» → Büro-Kalender,
«Halloween-Kostüm» → Saison-Deko.
**GETAN:** `google_kategorie_fein.py` zwei Vorrang-Regeln (Advent Calendars; Costumes nur mit Fest-Anker und ohne «Deko» — «Damen
Kostüm Blazer» bleibt draussen), Kanarienvögel 5/5. Neu `automation/google_neuimport.py` (stündlich im Aufseher, letzte 3 h):
Kategorie nur wenn leer (Taxonomie-geprüft), Geschlecht nur für Kleidung; erster Lauf 14 Felder gesetzt + zurückgelesen, 0 Fehler.
**Was Google-Ranking sonst bestimmt (QUELLE Google Merchant Center Hilfe, nicht gemessen):** Titel mit Produktart + Merkmal,
vollständige Attribute (Kategorie, Geschlecht, Farbe, Grösse), gute Bilder ohne Text, Preis, Lieferzeit/Versand/Rückgabe
(Store-Qualität), Bewertungen. Davon offen beim Betreiber: Lieferzeit + DE raus (siehe oben).

## Nachtrag ~17:30 — «fix alles ganz sauber» + «Feinkategorien überall» + Merchant-Rückmeldung
**Grow bestätigt:** Test-Upload aufs Shopify-CDN → READY (danach gelöscht). Session-Umgebung trägt veraltete Shopify-App-Zugangsdaten
(Grant HTTP 400), der Tresor `/tmp/secrets_env.sh` gültige (200) — Motoren nutzen den Tresor.
**Kostüme raus aus Google:** Importer publizieren in alle 6 Kanäle; `google_neuimport.py` nimmt Neuware, die `google_kanal_luecke.grund()`
trifft (Kostüm/Erotik/Tabak/Klinge …), stündlich aus dem Google-Kanal (Halloween-Kostüm zurückgelesen: raus, Kategorie gelöscht).
Eine am selben Tag gebaute Kostüm-Kategorie-Regel wieder ENTFERNT (Kostüme bleiben bewusst ohne Kategorie; traf ein Hundekostüm).
**Feinkategorien überall:** Messung 47'454 Kanal-Produkte, 20'141 mit ≤ 2 Ebenen. Neuer Schritt (4) in `google_kategorie_fein.py`:
nur Unterzweig des bisherigen Werts (Präfix-Regel) + Zweig-Tabellen Haustier/Fitness/Werkzeug. **5'087 verfeinert, 0 Fehler**
(u. a. Leinen 676, Halsbänder/Geschirre 650, Hund 624, Kissen 497, Näpfe 420, Ringe 388, Katze 351, Yoga-Geräte, Expander, Schraubendreher).
Fehlgriffe aus Stichproben korrigiert (59: Kerzenhalter, Duschvorhang, Messerhalter, Kessel, Lupe, Fritteuse/-Zubehör, Entsafter,
Fingerkette). ⚠️ Zwei Fallen: «leine» in «k-leine» (105 Fehltreffer im Trockenlauf, vor dem Schreiben behoben); das Skript schreibt
OHNE `DRY=1` sofort (die ersten 2'049 liefen ungeprüft — nachträglich per Stichprobe geprüft, Fehlgriffe korrigiert). Eimer-Etikette
jetzt gemeinsame Regel (Lauf hielt den Eimer bei 23/2'000). Grob bleiben 7'285 (Deko 1'571, Küche 981, Fitness 878, Werkzeug 765 …).
**Merchant (Betreiber/Cowork):** Lieferzeit 10–20 WT in allen 4 Versandrichtlinien ✅ (Screenshot). DE-Produkte: Adidas-Trainingsanzug
ist Entwurf und nicht im Google-Kanal; Mini-Kleid aktiv, Shop-Markt nur Schweiz → Altangebot, per Produkt-Update neu eingereicht
(`gfeed-anstupsen-261001`). WELCOME10 im Shop AKTIV (10 %, einmal je Kunde, bis 31.12.2027, 3× genutzt) → Merchant-Aktion kann starten.
