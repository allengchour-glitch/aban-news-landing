# Wichtelgeschenke + «Geschenke bis CHF 30» mit hängender Mitgliedschaft (10.10.2026, «weiter»)

## Gemessen

- **Nachfrage** (OpenSEO CH): «wichtelgeschenke» 2'400 Suchen/Mt, Schwierigkeit 0. Eine eigene Seite dafür gab es nicht.
- **Menü** «🎁 Geschenke & Weihnachten → Kleine Mitbringsel unter CHF 20» führt auf `/collections/kleine-geschenke-mitbringsel`.
  - Regel: «Variantenpreis < 20», also **27'033 Produkte**, Sortierung Bestseller.
  - Oben standen Rändelwerkzeug, Laborbrille, PVC-Schneidmatte, Lochschneider und Lederstichwerkzeug.
  - Der Seitentext warb mit «Velohelmen mit Insektenschutz» und einem «Ultraschall Anti-Bell-Gerät».

## Getan: Wichtel-Seite

- **Neue Welt `wichtel`** in `automation/geschenk_unterwelten.py`:
  - Preis CHF 7–19.95, 8 Warenarten (Tasse/Tee, Duft, Deko, Kuschel, Schmuck, Spiel, Beauty, Alltagshelfer)
  - **Schmuck auf 60 gedeckelt**, weil es ihn unter CHF 20 viermal so oft gibt wie alles andere
  - dieselben Sperren wie die anderen Welten (Google-Kanal, ≥ 2 Bilder, keine Sperr-Tags)
- **Ergebnis:** 243 Artikel getaggt, Regel «Tag = geschenkwelt-wichtel», manuelle Sortierung, die ersten 48 reihum nach Warenart. Läuft täglich im Aufseher mit.
- **Titel** «Wichtelgeschenke & kleine Mitbringsel unter CHF 20», SEO-Titel «Wichtelgeschenke unter CHF 20 – kleine Geschenkideen | LuxeStyle».
- **Neuer Text** mit «Worauf achten?»: Budget, sichere Wahl bei Unbekannten, ehrliche Lieferzeit 10–20 Werktage, «bis Mitte November bestellen». Dazu Links auf «bis CHF 30», für Sie/Ihn/Kinder.
- **Live** (WebFetch): H1, «243 Artikel», Text.
- Alter Stand gesichert: `dropship/_wichtel_kollektion_alt.json`.

**Fehlgriffe im Trockenlauf.** Die Fixes gelten für alle Welten, «bis CHF 30» verlor dadurch 31 Fehltreffer:

| Titel | gefangen von | jetzt |
|---|---|---|
| «Iridium-Gold Zündkerze» | «kerze» | Duft-Ausschluss `zünd` |
| «Tassel-Ohrhänger», «Gaze-Badehandtuch mit Tasseln», «Tassel-Tanktop» | «tasse» | `tasse(?!l)` |
| «Wasserdichte Quarz-Armband», «Nylon-Armband mit Schirmverschluss 22/26 mm» | Schmuck | Uhr/Uhrenband ausgeschlossen |
| «Ultraschall Mückenarmband», «Mückenabwehr-Armband für Kinder» | Schmuck | `mücke`/`ultraschall` |
| «Wellen Locken Diffuser» (Haar-Diffuser) | Duft | `locken`/`haar` |
| Press-on-Nägel «Sternenhimmel» | Deko | `nägel`/`press-on` |
| «Selbst gestalten»-Tassen (Editor) | Tasse | ausgeschlossen, Editor wird nie angefasst |
| Harrods-Tasse | Tasse | Fremdmarke, siehe `MARKE-ALS-WARE-2026-10-10.md` |

## Befund: «Geschenke bis CHF 30» zeigte 9'259 statt 400 Artikel

- **Regel seit 05.10.:** nur «Tag = geschenkwelt-unter30» (400 Produkte). Shop: «9259 Artikel», Admin: 11'183.
  - 197 der ersten 250 Mitglieder trugen den Tag nicht, darunter ein aktives E-Scooter-Ladegerät.
  - Oben standen die 48 kuratierten Plätze. Ab Seite 2 kam die Mitgliedschaft der Regel vom 03.10.
- **Shopify hatte nie neu berechnet.** Drei Versuche bewirkten in je 2–4 Minuten nichts: Regel ändern, Sortierung ändern, Regel zurücksetzen.
  - Die Wichtel-Kollektion im selben Lauf rechnete dagegen normal um (27'033 → 243).
- **Reparatur** mit neuem Werkzeug `automation/kollektion_neu_anlegen.py`:
  1. Neue Kollektion mit allen Feldern unter Zwischen-Handle anlegen, in dieselben 9 Kanäle stellen, warten bis gefüllt.
  2. Die alte heisst jetzt `…-alt-20261010` und ist aus allen Kanälen genommen. Sie bleibt als Sicherung, nicht gelöscht.
  3. Die neue übernimmt das Original-Handle.
  - Das Menü verlinkt per URL, das Theme per Handle, also war nichts umzubiegen.
  - **Live:** «400 Artikel». Die ersten 48 stimmen mit dem Soll überein.
- **Seitentext ersetzt.** Er bewarb «Retro-Quarzuhr, Smart Rings, … Werkzeug wie Handsägen und Sägeblätter». Jetzt beschreibt er die tatsächliche Auswahl und verlinkt gegenseitig mit der Wichtel-Seite.
- **Wächter** `automation/kollektion_mitgliedschaft_wache.py` (Aufseher täglich, nur Lesen):
  - Prüft alle Smart-Kollektionen mit reinen Tag-Regeln. Je 100 aktive Mitglieder nach **Titel** und nach **Preis absteigend** gehen gegen die eigene Regel.
  - **Stichprobe gemessen:** In Kollektionsreihenfolge, nach Bestseller, ID oder Neuheit sah die hängende Kollektion gesund aus (0–1 Brecher), weil vorne die kuratierten stehen. Nach Titel: 87/93, nach Preis absteigend: 99/99.
  - **Normalisierung:** Shopify gleicht Tags normalisiert ab. Die Regel «Gürtel» trifft «guertel», «smart home» trifft «smart-home». Ohne Normalisierung gab es 2 Fehlalarme.
  - **Ergebnis:** 193 geprüft, 0 hängen. Die abgelegte `-alt-`-Kopie wird übersprungen, ohne diesen Ausschluss erkennt der Wächter sie (186/192).
  - Bericht: `dropship/KOLLEKTION-MITGLIEDSCHAFT.md`.

## Offen

- Positionen «wichtelgeschenke» Mitte November nachmessen (Search Console).
- Menüpunkt heisst noch «Kleine Mitbringsel unter CHF 20». Der Seitentitel trägt den Suchbegriff, das Menü bewusst nicht angefasst.
