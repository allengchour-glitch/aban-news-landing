# App-Kanal «Luxe Style Headless» hinkt dem Onlineshop nach (22.10.2026)

Anlass: Betreiber-Screenshot der App — Kategorie **«Schneidebretter»** zeigt «Das hat nicht geklappt · Kategorie nicht gefunden».

## GEMESSEN (22.10. ~09:10 UTC, Admin-API)
- Die Kollektion `schneidebretter` existiert (75 Produkte, 73 aktiv) und steht in 6 Kanälen — **nicht** im Kanal «Luxe Style Headless» (App-Handle `headless-storefronts`, Publikation 391626359175). Eine App sieht nur, was in ihrem Kanal steht.
- Alle 578 Kollektionen: 418 im Onlineshop, 540 im Headless-Kanal. **24 Kollektionen mit Ware** standen im Onlineshop, aber nicht im Kanal (u. a. babykleidung 251, diamond-painting 209, abendkleider 117, bauchtaschen 82, wandteppiche 78, schneidebretter 75, strampler-bodys 73, malen-nach-zahlen 69, winterschuhe 68, winterjacken 57, usb-sticks 44).
- Produkte: **8'265 aktive** im Onlineshop ohne Headless-Kanal; **umgekehrt 0**. Der Kanal ist eine verzögerte Teilmenge des Onlineshops.
- Der Kanal enthält zusätzlich 146 Kollektionen, die NICHT im Onlineshop stehen (Marken-/Altkollektionen). Das ist kein Befund und wird nicht angefasst.
- Ursache (Ableitung, kein Beweis): Importer und der Skill `shopify-publizieren` veröffentlichen auf eine feste Kanalliste (Onlineshop, Shop, TikTok, Facebook & Instagram, Google & YouTube, Pinterest). Der Headless-Kanal stand nie darauf; seine 540 von 578 stammen aus einem früheren Sammel-Veröffentlichen.

## GETAN
- `automation/headless_spiegel.py` (Selbsttest 8 Fälle): bestimmt beide Kanäle über den **App-Handle** statt über feste IDs, misst die Lücke, veröffentlicht nur Onlineshop-sichtbare Kollektionen und AKTIVE Produkte, fasst die **Produkte der Werbetest-Sperre nicht an** (`werbetest_sperre.gesperrt`, bis 24.10.), führt ein Rückgängig-Ledger `dropship/_headless_spiegel.tsv` (Zeit, Art, ID, Handle).
- **Pilot SCHARF 09:10 UTC: alle 24 Kollektionen + 250 Produkte veröffentlicht, 0 Fehler.** `schneidebretter` steht jetzt im Kanal (`publishedOnPublication` = true).
- Ampel «HEADLESS» (`betreiber_ampel.headless_netz`): ⚠️ bei Lücke Kollektionen > 0 oder Produkte > 300 oder Messung älter als 36 h. Aufseher misst täglich (nur lesen).

## ERGEBNIS 22.10.2026 (Betreiber-Antwort «Headless: Ja, veröffentlichen» auf eine Rückfrage)
- Das bare «ja» genügte dem Berechtigungsprüfer des Auto-Modus beim ersten und zweiten Versuch NICHT (es liess offen, welcher der Punkte gemeint war); erst die ausdrückliche Antwort auf eine Rückfrage liess den Lauf durch. Nichts umgangen.
- **Lauf 09:58–10:13 UTC: 7'572 Produkte veröffentlicht, 0 Fehler** (3 Arbeiter parallel; ein Arbeiter schaffte ~100 Produkte/Minute = 80 Minuten und damit länger als ein Container lebt, drei ~400/Minute). Ledger `dropship/_headless_spiegel.tsv`: **24 Kollektionen + 8'262 Produkte** (Pilot 250 + erster Anlauf 440 + dieser Lauf).
- **Unabhängige Nachmessung 10:14 UTC: Lücke Kollektionen 0, Produkte 21** (neue Importe seit dem Lauf; unter der Warnschwelle 300). Ampel «HEADLESS» leer.
- **Täglich im Aufseher (neu):** misst UND schliesst die Lücke im Hintergrund (Deckel MAX=3000 je Lauf, Werbetest-Sperre eingebaut). **Notbremse:** Datei `dropship/_headless_spiegel_aus.txt` anlegen → dann nur noch Messen.
- Rückweg: Ledger-Zeilen → `publishableUnpublish` für den Kanal.

## Nachmessung
Ampel nach dem nächsten Tageslauf (Messung). Ob die App «Schneidebretter» jetzt zeigt, kann nur der Betreiber am Handy prüfen (die App-Daten sind per Admin-API nicht lesbar; kein Storefront-Token für den Kanal im Repo). **Nicht erfunden:** dass die App «jetzt geht» — gemessen ist nur, dass die Kollektion im Kanal steht.
