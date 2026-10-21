# Echte Bewertungen von echten Käufern sammeln (21.10.2026, Betreiber «produktbewertungen» → «Echte Bewertungen sammeln»)

Marken: **GEMESSEN** = selbst gelaufen (Befehl/Zahl), **BEHAUPTUNG** = ungeprüft (Menünamen im Judge.me-Admin ändern sich — vor dem Klicken kurz prüfen).

## GEMESSEN (21.10., Judge.me API v1, nur lesen; `automation/echte_bewertungen_wache.py`)
- 16'891 Bewertungen im Konto, alle aus dem CJ-Import (`source web`, `verified nothing`) — **0 von eigenen Käufern**. Die 1'191 Importer-Bewertungen seit dem Stopp vom 12.10. sind
  ausgeblendet (Betreiber-Entscheid A, 20.10.). Erfunden, umgeschrieben oder von ähnlichen Produkten übernommen wird nichts (UWG Art. 3, Hausregel).
- Judge.me kennt **17 erfüllte Bestellungen** (alle CH, seit 30.05.), davon **11 seit ≥ 21 Tagen geliefert**; für alle 13 Käufer liefert `/reviews?reviewer_id=…` **0 Bewertungen**.
- Ob die Judge.me-Anfrage nach Lieferung überhaupt eingeschaltet ist, kann die API NICHT sagen (Settings-Schlüssel für Review-Requests unbekannt, nur z. B. `widget_star_color` antwortet) und
  im Postfach info@luxestyle.ch liegt keine Judge.me-Anfragekopie (einzige Judge.me-Mail: Werbung vom 16.09.). **Also: unbekannt, nicht «aus».** Das ist der erste Klick.
- `shops/info`: Plan «professional», `dmarc_ok: false`, Absender `info@luxestyle.ch`. Öffentliches DNS (19.10.): SPF nur `include:zohomail.eu`, `_dmarc` = `p=none`, kein Judge.me-Eintrag.
  Mails, die Judge.me «im Namen von info@luxestyle.ch» verschickt, bestehen also SPF/DKIM der Absenderdomain nicht → **Spam-Risiko** (Klaviyo hat dasselbe Problem, `dropship/KONNEKTOREN-STAND-2026-10-19.md` KL-2).

## Klickweg im Judge.me-Admin (BEHAUPTUNG: Menünamen)
1. **Judge.me-Admin → Settings → Review requests** (Bewertungsanfragen):
   - Anfrage-E-Mails **an**; Auslöser **nach Erfüllung** (fulfilled), Verzögerung **21 Tage** (Lieferung aus China 10–20 Werktage — vorher fragen wäre «Wie war das Paket, das noch fehlt?»).
   - **Eine** Erinnerung nach 7 Tagen, nicht mehr.
   - Sprache **Deutsch**, Anrede wie im Shop («du»), Absendername «LuxeStyle». Antwortadresse info@luxestyle.ch.
   - **Absender/Zustellung prüfen:** Judge.me-Absender (`…@judge.me`-Standard) ODER eigene Domain mit DNS-Einträgen. Bei eigener Domain ohne Einträge landen die Mails im Spam (siehe oben).
2. **Testmail an dich selbst** (Judge.me → Review request → «Send test»/Vorschau): ankommen? Spam-Ordner? Handy-Darstellung? Betreff verständlich?
3. **Foto-Anreiz (optional):** Judge.me → Review coupons / «Reward for photo reviews»: z. B. 10 % auf die nächste Bestellung **für jede Bewertung mit Foto, unabhängig von den Sternen**
   (ein Gutschein nur für gute Bewertungen = gekaufte Bewertung, UWG/Google). Ein Kundenfoto wirkt stärker als zehn Lieferantentexte.
4. **Bestehende Käufer (Betreiber-Entscheid, kein Automat):** 11 Bestellungen sind ≥ 21 T geliefert (darunter die behaltenen externen Kunden #1005/#1011/#1014/#1018). Judge.me kann Anfragen für
   vergangene Bestellungen nachholen (Reviews → Request reviews / «Send to past orders»). Das ist eine Mail an Kundschaft in deinem Namen — du entscheidest, ob und wann; ich sende nichts.
5. **Danach:** Datum des Einschaltens in `dropship/_judgeme_anfrage_an.txt` schreiben (erste Zeile `JJJJ-MM-TT`) oder mir sagen. Ab da wertet die Ampel «ECHTE BEWERTUNGEN» aus
   (⚠️ nach 35 Tagen, wenn ≥ 3 danach gelieferte Bestellungen 0 Bewertungen bringen → Absender/Spam/Sprache prüfen).

## Datenschutz (Entscheid Betreiber)
Die Datenschutzerklärung (`PRIVACY_POLICY`, 21'624 Zeichen) nennt **Judge.me nicht** (gemessen 21.10.: 0 Treffer «Judge»), obwohl Judge.me Kaufdaten (Name, E-Mail, Bestellung) verarbeitet und
Anfrage-Mails verschickt. Vorschlag für einen Absatz (nur nach deinem Ja, ich schreibe Rechtstexte nicht ungefragt): «Bewertungen: Nach dem Kauf laden wir dich per E-Mail ein, das Produkt zu
bewerten. Dafür übermitteln wir Name, E-Mail-Adresse und Bestelldaten an Judge.me (Judge.me Ltd., Hongkong/USA — Auftragsverarbeiter). Bewertungen erscheinen mit abgekürztem Namen im Shop. Du kannst
der Einladung jederzeit per Link in der E-Mail widersprechen.» (Anbieteradresse und Land der Datenverarbeitung vorher bei Judge.me nachlesen.)

## Was NICHT gemacht wird
- Keine Bewertungen erfinden, vom Lieferanten übernehmen (Import-Stopp bleibt, `dropship/_bewertungen_stopp.txt`) oder nur gute zeigen.
- Keine Kundenmails von hier (Hausregel); Judge.me versendet die Anfragen selbst, sobald DU es einschaltest.
- Keine Theme-Änderung für Sterne in Google (`aggregateRating`, Befund M8 vom 21.10.): bleibt Betreiber-Entscheid, getrennt von diesem Punkt.

## Messung
`python3 automation/echte_bewertungen_wache.py` (täglich im Aufseher, Zähler und Bestellnummern, nie Namen/Adressen) → `dropship/_echte_bewertungen_stand.json`, Ampelzeile «ECHTE BEWERTUNGEN».
Erwartung ehrlich: bei ~17 Bestellungen und 5–10 % Antwortquote sind 1–2 echte Bewertungen realistisch; es bleibt klein, bis mehr verkauft wird (CLAUDE.md-Ziel: 100 Kunden).
