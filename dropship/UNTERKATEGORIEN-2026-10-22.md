# Grosse Kategorien besser gliedern: Chips, 3. Menüebene, Lücken-Regeln (22.10.2026)

Anlass: Betreiber-Screenshot der App «Elektronik & Technik» (22.10.): «hier so viele Produkte — kann man besser filtern, Unterkategorien erstellen, Filter?»

## GEMESSEN (22.10., Admin-API + WebFetch auf die Live-Seite)
- Die **Chips** oben in der App sind die **Unterpunkte des Hauptmenüs** (`main-menu` → «Technik & Gaming» → Unterpunkte). Die Reihenfolge der Web-Seite ist dieselbe.
- Vorher stand «Lifestyle & Trends» (2'641 Produkte, keine Elektronik) als zweiter und «Elektronik-Kleinteile» als dritter Chip — vor Smartwatches, Kopfhörern, Ladegeräten.
- **Technik:** 4'515 aktive Produkte, **1'432 (31 %) in KEINER Unterkollektion**. Andere Kategorien: Herren 26 %, Beauty & Pflege 29 %, Schmuck & Uhren 21 %, Kinder & Haustier 20 %.
- Es gab längst 20+ fertige Fachkollektionen **ohne Menüplatz** (Mikrofone 169 aktiv, Tastaturen & Mäuse 150, Controller 138, Drohnen & FPV 159, Laptop-Zubehör 327, Smart Home 86 …) — sie existierten nur für Suche/Sitemap.
- Lücken in den Regeln: «Smart-Armband» fehlte bei Smartwatches (198 Produkte), «Projektor» bei Beamer (43), «Sportkamera/Überwachungskamera» bei Drohnen & Kameras (97). Die Herren-Kollektionen suchten «Herren-Pullover» im Titel, die Ware heisst «Strickpullover mit Stehkragen» (Tag `herren`).
- **Filter im Web:** `/collections/elektronik-technik` zeigt Verfügbarkeit, Preis, Produkttyp, Farbe, Grösse und Kategorie (WebFetch 22.10.). Shopify blendet Filter bei Kollektionen ab 5'000 Produkten aus (Community-Berichte; die Kollektion hat 4'515 aktive, 6'018 inkl. Entwürfe — sie bleibt darunter, solange Entwürfe nicht mitzählen, UNBELEGT).
- **Filter in der App:** Die App zeigt nur «Sortieren / Preis / Nur lieferbar». Das sind die eigenen Filter der App, nicht die von Search & Discovery. **Das lässt sich von hier nicht ändern** (App-Einstellung bzw. App-Anbieter).

## GETAN
1. **Wächter** `automation/unterkat_abdeckung.py` (Selbsttest 7 Fälle, 5 Mutanten): misst je Hauptkategorie die Produkte ohne Unterkollektion (Kinder UND Enkel zählen), rechnet bestehende Kandidaten-Kollektionen aus (≥ 15 Lücken-Produkte, ≥ 50 % thematisch passend, im Onlineshop UND im Headless-Kanal veröffentlicht) und schreibt `dropship/UNTERKATEGORIEN-ABDECKUNG.md`. Ausnahmen mit Begründung (Hauptkollektion = Thema: «Jacken & Mäntel», «Sport & Fitness»: 84 % bzw. 67 % waren ein Messartefakt). Aufseher: Selbsttests täglich, Messung wöchentlich im Hintergrund; Ampel «🗂️ UNTERKATEGORIEN».
2. **Menü** `automation/menue_unterkat_ordnen.py` (Selbsttest 5 Fälle, 3 Mutanten): Chips nach Relevanz geordnet (Technik: Smartwatches, Kopfhörer, Ladegeräte, Handy-Zubehör, Kabel, Gaming, Drohnen & Kameras, Beamer, PC, Büro, Smart Home, USB, Auto, Kleinteile, «Lifestyle & Trends» zuletzt) und vorhandene Fachkollektionen als **3. Ebene** eingehängt (nur wenn ≥ 30 aktive Produkte und im Onlineshop UND im Headless-Kanal veröffentlicht — sonst Link ins Leere bzw. «Kategorie nicht gefunden» in der App). Scharf: Menü **190 → 217 Einträge, 0 verlorene IDs**, Reihenfolge geprüft. Übersprungen und gemeldet: Powerbanks (nicht im Onlineshop), Gaming-Mäuse (17 aktive). Sicherung `dropship/menu_backup_2026-10-22_1629_vor_unterkat_ordnen.json`; Rückweg `python3 automation/menue_unterkat_ordnen.py --zurueck <Sicherung>`.
   - Neu eingehängt: Technik 16 (u. a. Mikrofone & Streaming, Lautsprecher, Controller, Drohnen & FPV, Tastaturen & Mäuse, Laptop-Zubehör, Netzwerk & WLAN, Smart Home), Schmuck & Uhren 5 (Smartwatches, Herrenuhren, Damenuhren, Uhrenarmbänder, Chronographen), Beauty & Pflege 5 (Beauty-Geräte, Gesichtspflege-Geräte, Aroma & Diffuser, Luftbefeuchter, Schminkspiegel), Kinder & Haustier «Geschenke für Kinder», Sport & Party «Velo & Radsport».
3. **Lücken-Regeln** `automation/suchbegriff_kollektionen.py` + `automation/data/suchbegriff_kollektionen.json`: neuer **Feeder-Modus** (`feeder_fuer`) hängt Tag-Regeln als ODER an bestehende Smart-Kollektionen (alte Regel gesichert in `dropship/_feeder_regeln_alt.json`), neue Bedingung `ja_tags` (Pflicht-Tag). Eingetragen: Smart-Armbänder → Smartwatches & Wearables, Projektoren → Beamer & Heimkino, Kameras → Drohnen & Kameras (**Tagging 1'043 Produkte, 0 entfernt**); Herren: Jeans (**neue Kollektion** `herren-jeans`), Jacken, Pullover, Shirts. Nach dem Lauf: Smartwatches 626 → 830 aktive, Beamer 33 → 79, Drohnen & Kameras 144 → 303. Kanarienvögel 450/450 (der Wächter fing meinen Fehler «boot» ⊂ «Bootcut» ab, bevor etwas geschrieben wurde).
4. Täglich im Aufseher läuft schon `suchbegriff_kollektionen.py --scharf` für Neuimporte (TAGE=2) — die neuen Regeln gelten damit auch für künftige Ware.

## Fallen
- **Erst nachsehen, ob es die Kollektion schon gibt:** «Mikrofone & Streaming» gab es (286 Produkte); mein neuer Eintrag hätte sie überschrieben. Der Trockenlauf (`ANGLEICHEN mikrofone`) hat es gezeigt. Eintrag gestrichen.
- Titel-Wörter ohne Wortgrenze treffen Fremdes («boot» in «Bootcut», «top» in «High-Top Sneaker»): erst auf allen Produkten simulieren, Stichprobe lesen, dann Kanarienvögel ergänzen.
- Mutanten-Suchtexte stehen im eigenen Quelltext und treffen doppelt — per Verkettung teilen.
- `productsCount` einer Kollektion zählt Entwürfe mit (Technik 6'018 vs. 4'515 aktiv): für Mindestgrössen immer `status:active` zählen.

## OFFEN
- **App-Filter:** Welche App ist das (Name/Anbieter)? Filter wie Farbe/Grösse/Produkttyp kann nur der App-Anbieter einbauen; die Daten (Search & Discovery, Farbfelder, Produkttyp) stehen bereit.
- Nachmessung nach der Neuberechnung der Smart-Kollektionen (Stunden): `python3 automation/unterkat_abdeckung.py`.
- Herren: Jeans-Kollektion erst nach dem Tagging (~1'500 Produkte) anlegen/veröffentlichen/ins Menü.
- Klassische Uhren (~400) liegen weiter mit dem Tag `elektronik` in «Elektronik & Technik». Option (Betreiber-Entscheid): Tag entfernen → nur noch in «Schmuck & Uhren».
