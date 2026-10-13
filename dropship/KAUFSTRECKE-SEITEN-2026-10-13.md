# Umsetzungsliste Kauf-Strecke: 4 Produktseiten mit Besuch und ohne Warenkorb (Richter, 13.10.2026)

## Lage

Auf allen vier Seiten funktioniert der Kaufweg technisch bis in die Kasse. Mit 3 bis 12 Sitzungen je Seite sagen die 0 Warenkörbe statistisch nichts aus, und der Engpass bleibt der Verkehr (Messrunde 13.10.). Die Prüfung hat aber Mängel gefunden, die viele Seiten zugleich treffen. Die wichtigsten: Das Cookie-Banner verdeckt am Handy den Kaufknopf. Halloween-Ware wird nach dem 31.10. geliefert. Produkte zeigen zwei Modelle, haben aber nur eine Variante. Die Brotkrumen sind falsch. Von den 30 Prüfer-Befunden sind 3 bestätigt und 27 geändert. Mehrere Vorschläge hätten Seiten verschlechtert, sie stehen unten unter «Verworfen».

**Regeln für alle Klassen:**
- **Theme:** Zuerst die Live-Datei holen und ein Backup anlegen (`theme_backup/<datei>.vor-<thema>-1013`). Dann hochladen, per Admin-API zurücklesen und erst danach per WebFetch prüfen, nie mit curl.
- **Produktänderungen:** Zuerst ein Trockenlauf, dazu ein Ledger mit Rückweg. Das Testprodukt Aurora (Shopping Ads, Kontingent voll) bei jedem Massenlauf per ID ausnehmen.
- **CJ:** Abfragen erst nach dem Punkte-Reset um 00:00 UTC. Heute sind nur noch 19 Punkte übrig (GEMESSEN vom Kostüm-Prüfer).

---

### 0. Messhygiene: Prüfkörbe nachtragen
- **Befund:** Drei Prüfläufe bis in die Kasse fehlen in `dropship/_kaufweg_tests.txt`. Ohne Eintrag zählen sie bei `sessions_that_reached_checkout` als Abbruch mit.
- **Belege:** GEMESSEN mit `tail` der Datei: Nur der Shirt-Lauf (19:02:34Z) steht drin. Den hat der Shirt-Prüfer eingetragen, obwohl sein Auftrag «nur lesen» lautete.
- **Betroffen:** 3 Sitzungen von heute.
- **Umsetzung:** Diese Zeilen ergänzen:
  - `2026-10-13T18:45:00Z herren-sneaker-mit-8-cm-plateausohle-610100 ok …/kaufstrecke/sneaker-plateau`
  - `2026-10-13T18:45:00Z tunmate-rizinusol-382081 ok …/kaufstrecke/rizinusoel` (Kasse mit Adresse Zürich)
  - `2026-10-13T18:59:00Z` und `2026-10-13T19:05:29Z inflierbares-halloween-kostum-fur-zwei-persone-638900 ok …/kaufstrecke/kostuem-zwei` (Korb 2 mit kaufweg-test@example.com)
- **Prüfung:** `checkout_abbruch_messen.py` zählt diese Läufe danach nicht mehr als Abbruch.
- **Gewissheit:** hoch.
- **Betreiber?** Nein.

### 1. Cookie-Banner verdeckt «In den Warenkorb» am Handy
- **Befund:**
  - Das Banner wird um 90 px angehoben, auch wenn die Sticky-Kaufleiste unsichtbar ist (opacity 0). Der Grund sind die Regel `body:has(.sticky-add-to-cart__bar){bottom:90px}` und `lxBannerPlatzieren()`.
  - Nach 120 px Scrollen liegt das Banner bei y 650–754 und der Knopf bei y 698–750. Der Knopf ist damit ganz verdeckt.
  - Dazu öffnet sich nach dem Klick kein Warenkorb-Fenster. Die Einstellung `auto_open_cart_drawer` fehlt in settings_data, der Standard ist false.
- **Belege:** GEMESSEN mit tools/browser.mjs bei 390×844 (`gegen-rizinus/c_120.png`). Beim Sneaker deckt das Banner unten ≈ 200 px ab, im Korb auch die Express-Knöpfe. `cart_type` = drawer.
- **Betroffen:** Jede Produktseite mit Kaufleiste beim ersten Handy-Besuch, bis jemand die Cookies wählt. 77 % der Sitzungen sind mobil, das sind ≈ 263 echte Produktlandungen in 21 Tagen. Das ist die grösste Reichweite aller Klassen.
- **Umsetzung:**
  - Die Live-Datei mit `lxBannerPlatzieren` holen (Muster `automation/theme_reparatur_14_08.py`) und ein Backup anlegen.
  - Das Banner nur anheben, wenn die Kaufleiste sichtbar ist (Zustand prüfen, nicht nur ob es sie gibt). Am Handy eine einzeilige Leiste mit `bottom:0`.
  - Die Einstellung `auto_open_cart_drawer: true` setzen.
  - Wächter: `automation/popup_tor_wache.py` um zwei Prüfungen erweitern (Bedingung «sichtbar» in der Live-Datei, Einstellung auf true). Er läuft schon alle 6 h in `fixer_keepalive.sh`.
  - Rückweg: Backup zurückspielen, Einstellung wieder auf false.
  - Risiko: Das Popup-Tor vom 05.10. hängt am Banner-Status. Danach popup_tor_wache und den Handy-Test laufen lassen.
- **Prüfung:** Vorher und nachher mit browser.mjs bei 390×844 und Scrolltiefen 0/120/400 px: Das Rechteck des Knopfs darf das Banner nicht schneiden. Nach dem Klick ist die Schublade offen und zeigt «Zur Kasse».
- **Gewissheit:** Mechanismus hoch (Code und Messung an 1 Seite). Wirkung auf Körbe ist VERMUTUNG, aber naheliegend: Ein verdeckter Knopf wird nicht geklickt.
- **Betreiber?** Nein.

### 2. «⭐ Bestbewertet» über Produkten ohne Bewertung (Hausregel, zuerst messen)
- **Befund:** Laut Kostüm-Gegenprüfer steht im Such-Dropdown «⭐ Bestbewertet» über Aurora und der Smartwatch Pro AMOLED. Beide haben laut Judge.me 0 Bewertungen. Der Shirt-Gegenprüfer hält das Label auf der Produktseite dagegen für ein WebFetch-Artefakt (das Boho-Set hat 20 Bewertungen, Schnitt 4.85).
- **Belege:** Die Quelle ist nicht gefunden: nicht in product.json, nicht in header- oder footer-group. Im Repo kommt das Wort nur in `metricool_pinterest_pin.mjs` vor (GEMESSEN mit grep).
- **Betroffen:** Jede Suche. Die Zahl der Produkte ist unbekannt.
- **Umsetzung:**
  - Alle Dateien des Live-Themes nach «Bestbewertet» durchsuchen, dazu die App-Blöcke und Search & Discovery.
  - Die Liste hinter dem Label gegen Judge.me prüfen.
  - Wenn Produkte ohne Bewertung darunter stehen: das Label in eine Aussage ohne Bewertungsbezug umbenennen (z. B. «Unsere Auswahl») oder die Liste auf bewertete Produkte beschränken.
  - Wächter: `automation/judgeme_fake_wache.py` um die Regel «Label Bestbewertet nur bei ≥ 1 echter Bewertung» erweitern.
- **Prüfung:** Mit browser.mjs die Suche «kette» und «uhr» öffnen und die Label-Produkte gegen die Judge.me-Zahl prüfen.
- **Gewissheit:** niedrig, die beiden Prüfer widersprechen sich. Wegen der Hausregel «nie erfundene Bewertungen» trotzdem vorgezogen.
- **Betreiber?** Nein, aber das Ergebnis melden.

### 3. Halloween: Lieferung nach dem Anlass, kein Hinweis und kein schneller Ausweg
- **Befund:**
  - Die CJ-Halloween-Ware zeigt «Lieferung 28. Okt – 11. Nov». Es gibt kein Wort zu Halloween und keinen Link zur schnellen Ware.
  - Nach der eigenen Kalibrierung (12 Werktage) kippt auch die erwartete Ankunft am **Do 15.10.** hinter den 31.10.
  - Zusätzlich:
    - Oben in /collections/halloween stehen 8 von 8 Artikeln mit Tag ch-lager, die noch im General profile liegen. Sie zeigen ebenfalls 28.10.–11.11. Wirklich schnelle Ware gibt es nur 113 Stück, nicht 132.
    - In `kostueme-ch-lager` steht auf Platz 1 eine CJ-Perücke aus Asien. Grund: Die Regel verknüpft peruecke und kostuem-hut mit ODER und lässt so CJ-Importe hinein.
- **Belege:** GEMESSEN mit WebFetch und browser.mjs (Lieferblock y=1062, Kasse nur «Standard 28. Okt–11. Nov»). productsCount: 93 Artikel mit halloween + cj-real und ohne ch-lager, davon 80 im Google-Kanal. Die Wache meldete um 17:13Z «alles rechtzeitig bis 29.10.».
- **Betroffen:** 93 + 19 Produkte, dazu das Linkziel mit 1'545 Produkten. Besuch: 20 Halloween-Landungen in 21 Tagen (CH 15), der ChatGPT-Anteil steigt.
- **Umsetzung (Reihenfolge):**
  - a) `automation/anlass_lieferzeit_wache.py` soll nach der **angezeigten Zusage** sortieren: «schnell» nur mit Profil CH-Lager (`schnell_profil` gibt es schon). Sofort sortieren, nicht erst ab dem Kipptag.
  - b) `automation/ch_lager_profil.py`: Die 19 Halloween-Artikel mit ch-lager in die nächste Stufe (14.10.) vorziehen, sofern `dropship/CH-LAGER-PROFIL-2026-10-13.md` keine Google-Bedingung dagegen nennt.
  - c) Theme-Block `lux_delivery` in templates/product.json: Bei Tag halloween und langsamem Profil bis Mi 14.10. «Lieferung vor Halloween (Sa 31.10.) nicht garantiert» zeigen, ab 15.10. «kommt erst nach Halloween». Dazu der Link «Rechtzeitig: Halloween ab Schweizer Lager →» auf /collections/halloween (dort hält die Wache die schnelle Ware oben) mit **berechnetem Datum**, nicht «1–2 Werktage».
  - d) Datum und Kipptag schreibt die Wache in ein Shop-Metafeld (Muster `luxe.ch_lager_stufe`). Liquid liest dieses Metafeld, `data/anlass_kollektionen.json` kann es nicht lesen. Nach dem Anlass bleibt das Metafeld leer, der Hinweis ist dann aus.
  - e) Die Regel von `kostueme-ch-lager` reparieren: Mitglieder vorher und nachher zählen. Danach `kollektion_mitgliedschaft_wache.py`, falls nötig neu anlegen mit `kollektion_neu_anlegen.py` (Menü-resourceId nachziehen).
  - f) `ist_kostuem()` (`automation/google_sperrliste.py`) gegen die 80 Artikel im Google-Kanal laufen lassen. Zu prüfen: «Lolita-Stirnband mit Hexenhut», «Halloween-Outfit für Mädchen», «Haustier-Kopfbedeckung», «Haustier-Set mit Fliege». Treffer als Kanarien eintragen.
  - Wächter: Die Wache prüft per Admin-API, ob der Block in der Live-Datei steht und das Metafeld aktuell ist (wie `kassen_lieferdatum_wache.py`). Dazu eine Stichprobe mit browser.mjs.
  - Rückweg: Backup von product.json zurückspielen, Metafeld leeren, alte Kollektionsregel aus dem Ledger.
  - Risiko: Der Hinweis darf nie auf Ware ab CH-Lager erscheinen.
- **Prüfung:** WebFetch auf die Kostüm-Seite: Hinweis und Link sind da. Ein Kostüm ab CH-Lager zeigt keinen Hinweis. Kasse mit browser.mjs für einen umgestellten ch-lager-Artikel: Datum vor dem 31.10. In /collections/halloween zeigen die obersten 12 ein Datum ≤ 31.10.
- **Gewissheit:** Datumsrechnung hoch. Die 0 Körbe der letzten 7 Sitzungen erklärt das nicht (das Fenster begann damals vor Halloween). Nach vorne ist die Wirkung hoch. **Frist: Hinweis bis Mi 14.10. live.**
- **Betreiber?** Ja, eine Frage: Sollen CJ-Kostüme und Partydeko, die an den 31.10. gebunden sind, ab 15.10. aus TikTok, FB/IG und Pinterest genommen werden? Der Onlineshop bleibt (kein 404 für URLs, die ChatGPT kennt), Herbst-Deko bleibt.

### 4. Mehrere CJ-Modelle, aber nur eine Shop-Variante
- **Befund:**
  - Das Kostüm zeigt auf den Bildern Spiralhund und Dackel, verkauft wird «Default Title». Der Text nennt dazu ein Einhorn, das es nicht gibt. Der Lieferumfang ist unklar.
  - Kommt eine Bestellung, stoppt der Bestell-Automat mit «manuell prüfen».
  - Die Quelle ist `automation/cj_sku_import.mjs` (Z. 387–389, GEMESSEN): Er legt immer nur eine Standard-Variante an. Er ist der Grind-Importer der 3 Runner, die Klasse wächst also täglich.
- **Belege:** CJ pid 2610010401151638900 hat 2 Varianten zu je USD 20.66. Das Produkt steht in `_auswahl_fehlt.jsonl` Z. 2566 und fehlt in `_auswahl_nachgeruestet.txt`.
- **Betroffen:** 3'429 aktive Produkte (GEMESSEN; der Gegenprüfer zählt ~3'461), davon 8 Halloween.
- **Umsetzung:**
  - a) Quelle: In `cj_sku_import.mjs` bei ≥ 2 CJ-Varianten mindestens einen Tag (z. B. `auswahl-offen`) setzen, damit der Nachrüster das Produkt findet.
  - b) `automation/auswahl_nachruesten.py` nach dem CJ-Reset in dieser Reihenfolge laufen lassen: erst besuchte Seiten (`auswahl_besucht_liste.py`), dann Saison-Tags (halloween, advent, weihnachten), dann der Rest.
  - c) Beim Kostüm eine Option «Modell» anlegen: «Spiralhund (2 Hälften)» und «Dackel (für 2 Personen)», mit den CJ-Variantenbildern. «Einhorn» streichen. Lieferumfang nur aus Bild und CJ schreiben. Gebläse und Batterien weglassen, bis die CJ-Beschreibung gelesen ist.
  - Wächter: `auswahl_fehlt_messen.py` liefert eine Ampelzeile «AUSWAHL-OFFEN n (besucht m)». Dazu eine Kanarie: Ein Neuimport mit ≥ 2 CJ-Varianten muss den Tag tragen.
  - Rückweg: Ledger des Nachrüsters.
  - Risiko: Das Skript prüft schon selbst, dass kein Kreuzprodukt entsteht.
- **Prüfung:** Varianten vorher und nachher per productByHandle lesen. WebFetch zeigt die Auswahl. `cj_order_engine` im Trockenlauf meldet kein «manuell prüfen».
- **Gewissheit:** hoch (Klasse gemessen, Quelle im Code). Wirkung je betroffener Seite hoch (VERMUTUNG).
- **Betreiber?** Nein.

### 5. Brotkrumen (`lux_breadcrumb`) und JSON-LD falsch, Unisex als Damen geführt
- **Befund:**
  - (a) Ware mit Tag trend landet unter «Technik & Gaming › Trends & Gadgets». Der Block nimmt den ersten passenden Unterpunkt im Hauptmenü. Seine Ausschlussliste kennt viral, hype und eingetroffen, aber nicht trend.
  - (b) 6 Hauptmenüpunkte haben einen Unterpunkt mit derselben URL. Ergebnis: «Beauty & Pflege › Beauty & Pflege».
  - (c) Das Unisex-Editor-Shirt steht unter «Damen › T-Shirts & Tops», und das Google-Geschlecht ist female.
- **Belege:** GEMESSEN mit Browser, WebFetch und BreadcrumbList im JSON-LD. Stichprobe: 12 von 15 Nicht-Technik-Seiten zeigen Technik. Gegenprobe ohne trend: 10 von 10 richtig. 50 von 168 Produkten mit «Unisex» im Titel stehen auf female.
- **Betroffen:**
  - ~1'083 Produkte mit trend, aber ohne tech oder gadget. Die Zahl wächst, weil `cj_sku_import.mjs` Z. 373 trend, viral und video-hit pauschal setzt.
  - Die Produkte unter den 6 Menüpunkten (VERMUTUNG: tausende).
  - 31 Editor-Produkte und 50 Unisex-Produkte mit female.
- **Umsetzung:**
  - Im Theme-Block `lux_breadcrumb`:
    - `s.url contains 'trend'` in die Ausschlussliste aufnehmen, ebenso `c.handle contains 'trend'` im bc_one-Rückfall.
    - `unless s.url == link.url` gegen doppelte Einträge.
    - Editor-Produkte (`product.description contains 'lspod-designer'`) und Titel mit Unisex oder Herren überspringen die Damen-Kette.
  - Die Kollektionsregeln bleiben unverändert.
  - Geschlecht: `automation/gender_aus_titel.py` um die Regel `\bunisex\b → unisex` erweitern (mit Trockenlauf und Ledger).
  - Wächter: Admin-API-Prüfung, dass die Live-Datei die drei Bedingungen enthält (Muster `popup_tor_wache.py`). Dazu meldet gender_aus_titel female bei «Unisex» oder «Herren» im Titel.
  - Rückweg: Backup zurückspielen, Gender-Ledger.
  - Risiko: Ein Liquid-Fehler legt jede Produktseite lahm. Darum sofort zurücklesen und 3 Seiten per WebFetch prüfen.
- **Prüfung:** WebFetch und JSON-LD: Kostüm unter «Sport & Party › Halloween», Tunmate unter einfachem «Beauty & Pflege», Shirt nicht mehr unter «Damen».
- **Gewissheit:** Ursache im Code hoch. Wirkung mittel (VERMUTUNG): Es geht um Vertrauen, und ChatGPT und Google lesen das JSON-LD.
- **Betreiber?** Nein.

### 6. Herrenschuhe enden bei Grösse 43, die Seite rät «eine Nummer grösser»
- **Befund:** 60 echte Herrenschuhe haben als grösste EU-Grösse 43 oder weniger. 64 waren gezählt, davon sind 4 Fremdware: 2 Kinderschuhe, 1 Damenstiefel, 1 Einlegesohle. Alle tragen cj-real, darum zeigt `lux_sizeguide` «Im Zweifel eine Nummer grösser». Das betrifft auch die meistbesuchte Seite (12 Sitzungen, ≈ 4 Personen; Neuchâtel 9× am 29. und 30.09.).
- **Belege:** GEMESSEN mit GraphQL und dem Export `hs.jsonl` (43: 43 Stück, 42: 9, 41: 2, 40: 8, 39: 1, 37: 1).
- **Betroffen:** 60 Seiten und 8 falsch typisierte Produkte.
- **Umsetzung:**
  - `lux_sizeguide`: das **Maximum aller Grössen auf Produktebene** nehmen. Ist es ≤ 43 und steht «Herren» im Titel, dann statt des Hochgeh-Rats «Erhältlich bis Grösse 43 – grösser? Herrenschuhe ab 44 →». Der Link zeigt dynamisch auf die Herrenschuh-Kollektion mit Grössenfilter (vorher per WebFetch prüfen, dass der Filter 44 existiert). Keine festen Produkt-Handles, keine erfundenen cm-Werte.
  - product_type der 8 Fremdwaren korrigieren.
  - Bei 616900 und 603800 «Übergrösse 47/48» in den Titel schreiben und die flachen englischen Varianten prüfen.
  - Nach dem Reset bei CJ fragen, ob die Modelle 44 und 45 haben.
  - Wächter: eine Zeile in `automation/sonderanfertigung_wache.py`, der liest schon Schuhgrössen (sonst ein kleines eigenes Skript). Er meldet Herren-Titel mit Maximum ≤ 43 und Herrenschuh-Typen mit Damen- oder Kinder-Titel.
  - Rückweg: Backup.
- **Prüfung:** Auf dem Sneaker per WebFetch: kein «eine Nummer grösser», dafür der neue Satz mit Link. Ein Herrenschuh bis 46 und ein Damenschuh bleiben unverändert.
- **Gewissheit:** Sachverhalt hoch. Wirkung VERMUTUNG, Schwere mittel. «Etwa die Hälfte der Männer» ist nicht gemessen.
- **Betreiber?** Nein.

### 7. Editor-Produkte zeigen «30 Tage Rückgabe», obwohl die Rückgabe ausgeschlossen ist (bestätigt)
- **Befund:**
  - `lux_trust` zeigt auf jedem Produkt ohne Bedingung «↩️ 30 Tage Rückgabe».
  - Das offene Akkordeon «Rückgabe & Umtausch» beginnt mit «30 Tage Rückgaberecht», ebenso die Zeile im Warenkorb.
  - Die Rückgaberichtlinie schliesst gestaltete Artikel aus.
- **Belege:** GEMESSEN in der Live-Datei `templates/product.json` (Theme 187533001089) und per WebFetch. 26 von 31 Produkten nennen den Ausschluss im Text. Bei 5 fehlt er: kissen-zum-selbstgestalten, mauspad, strandtuch, spiral-notizbuch, kuscheldecke.
- **Betroffen:** 31 Editor-Produkte.
- **Umsetzung:**
  - In `lux_trust`, im Akkordeon und in der Korbzeile bei `product.description contains 'lspod-designer'` (trifft 31 von 31; Tags treffen daneben) den Text «✔️ Ersatz bei Druckfehlern» zeigen. Im Korb gilt das je Position.
  - Bei den 5 den Ausschluss-Satz ergänzen.
  - Die Kopfleiste ist shopweit und bleibt.
  - Wächter: neue Regel in `automation/versprechen_wache.py`.
  - Rückweg: Backup.
- **Prüfung:** WebFetch auf das Shirt: keine Rückgabe-Zusage unter dem Knopf. Ein Normalprodukt bleibt unverändert.
- **Gewissheit:** hoch. Rechtsrisiko durch eine bindende Zusage (VERMUTUNG).
- **Betreiber?** Nein, es bringt nur den Text mit der Richtlinie in Einklang.

### 8. Gleicher Shirt-Rohling, anderer Preis
- **Befund:** shirt-zum-selbstgestalten (9000001_40xx) kostet CHF 32.90 bzw. 35.90. unisex-t-shirt-selbst-gestalten (5599797_40xx) kostet 24.90 bzw. 28.90 und steht auf Platz 1 der «Ähnlichen Produkte». Ursache: `printful_reprice.mjs` (Kosten × 2,3) wurde am 12.10. nur auf eine der beiden Seiten angewandt.
- **Belege:** GEMESSEN per Admin-API und `/recommendations/products.json`.
- **Betroffen:** 3 Shirts und 2 Tassen. «Grüezi» ist kein Doppel, aber falsch betitelt.
- **Umsetzung:**
  - Die Formel von `automation/printful_reprice.mjs` im Trockenlauf mit gemessenem EK auf shirt-zum-selbstgestalten anwenden (≈ 24.90).
  - Titel «Gruezi» → «Grüezi mitenand» bei den -gruezi-mitenand-Produkten.
  - Wächter: `--pruefen`-Modus im täglichen Lauf meldet gleiche Rohling-Endung (SKU-Teil nach dem _) in mehreren aktiven Editor-Produkten mit mehr als 10 % Preisabstand.
  - Rückweg: alter Preis im Ledger.
  - Risiko: Die Seite ist im Google-Kanal, eine Preisänderung löst eine Neuprüfung aus (Aurora ist nicht betroffen).
- **Prüfung:** WebFetch des Preises; recommendations zeigt kein billigeres gleiches Shirt mehr.
- **Gewissheit:** hoch. Wirkung VERMUTUNG.
- **Betreiber?** Preis: nein, die Formel-Marge bleibt erhalten. Melden. Ob die drei Shirt-Seiten zusammengelegt werden, entscheidet der Betreiber (`COWORK-AUFTRAEGE.md` §10, offen seit 29.08.).

### 9. Editor-Produkte ohne ein einziges Beispielbild
- **Befund:** 30 von 31 zeigen nur den leeren Artikel. 28 von 31 haben höchstens 2 Bilder.
- **Belege:** GEMESSEN am Kontaktbogen (`sg-gegen/img/editor_blatt.jpg`).
- **Betroffen:** 31 Seiten. Das Shirt ist das Dauerziel von ChatGPT (8 von 9 Sitzungen in 60 Tagen).
- **Umsetzung:**
  - `automation/pod_fertig_mockups.mjs` umbauen: Das Bild **an Position 2–3 anhängen**, statt das Hauptbild zu ersetzen. `pod_blank_mockups.mjs` nicht verwenden, es macht das Gegenteil.
  - Bild 1 bleibt der Rohling (das Google-Bild, kein Overlay). «Beispiel» nur in den Alt-Text.
  - Upload nur über `upload_to_shopify_cdn.mjs`. Vision-Vergleich gegen das echte Printful-Blank, Printful-Generator bevorzugt. Danach `pod_editor_qa.mjs` mit 0 Befunden (Regel 4).
  - Wächter: `pod_editor_qa.mjs` meldet ein Editor-Produkt ohne Bild mit Alt «Beispiel».
  - Rückweg: das zusätzliche Medium löschen.
- **Prüfung:** Kontaktbogen vorher und nachher, WebFetch der Galerie.
- **Gewissheit:** Befund hoch, Wirkung VERMUTUNG.
- **Betreiber?** Nein. Gemini nur für Bilder, kein Veo (Budget-Regel 11).

### 10. Druckdatei begrenzt auf 1200 px, Druck-Fakten fehlen, Druckdatei-Adresse steht im Korb
- **Befund:**
  - REF2 = 1200, weil die Textil-Editoren kein `data-ref` haben. Ein Bild auf Grösse 100 % ergibt ≈ 600 px, also ≈ 100 dpi über 30 cm (gerechnet; wie Printful das abbildet, ist VERMUTUNG).
  - Druckfläche, Verfahren und dpi werden bei 0 von 31 genannt, Pflegehinweise bei 3 von 31.
  - Die allgemeine Masstabelle zeigt XS–3XL, angeboten wird S–2XL.
  - Im Korb steht «🖼️ Druckdatei: https://res.cloudinary…» als Klartext (SG-7 bestätigt).
- **Belege:** `pod/lspod-designer-v5.src.js` (resWarn Z. 861–870, buildProps Z. 2386–2400), `pod_inject_designer.mjs:59`, `snippets/cart-products.liquid` Z. 222–234 (Schlüssel mit «_» werden ausgeblendet).
- **Betroffen:** 31 Editor-Produkte.
- **Umsetzung (Reihenfolge):**
  - (1) `data-ref` für Textil anheben, Ziel 150 dpi. Danach `pod_test_v5.mjs` (Prüfung «1200 px» anpassen), `pod_editor_qa.mjs` mit 0 Befunden und `pod_test_live_kaufweg.mjs`.
  - (2) Schlüssel mit Unterstrich **am Anfang des ganzen Schlüssels**: `_Druckdatei` bzw. `_Vorne · Druckdatei`. Sichtbar bleibt «🎨 Dein Entwurf ✓». Die Verbraucher `printful_sync.mjs`, `prodigi_sync.mjs` (/Druckdatei/) und `pod_designzwang.py` finden den Schlüssel weiter. Die Bestell-Mail prüfen.
  - (3) Faktenblock aus dem Printful-Katalog (Verfahren, Druckfläche in cm, Pflege) und die Masstabelle des Modells.
  - Wächter: `pod_editor_qa.mjs` prüft die Breite der Druckdatei und den Faktenblock. `pod_designzwang.py` prüft den Unterstrich-Schlüssel.
  - Rückweg: `automation/pod_editor_umstellen.py`.
  - Risiko: Der Editor ist heilig. Die Handbestellung bei Mister DTF braucht den Link, den sieht man im Admin weiterhin.
- **Prüfung:** Testkorb mit browser.mjs: keine Adresse sichtbar, die Bestell-Eigenschaft ist vorhanden, die Druckdatei hat ≥ Zielbreite.
- **Gewissheit:** Korb hoch. Druckschärfe ist Rechnung plus VERMUTUNG.
- **Betreiber?** Nein.

### 11. Druck auf Bestellung: Seite und Kasse nennen verschiedene Lieferdaten
- **Befund:** Seite und Korb nennen 22.10.–2.11. (`custom.lieferzeit` eu-druck 7–14). Die Kasse nennt 28.10.–11.11. (General profile, Transit 9–19 Tage + P1D).
- **Belege:** GEMESSEN im Browser und per API unstable.
- **Betroffen:** 472 von 479 aktiven POD-Produkten.
- **Umsetzung:**
  - Wächter zuerst: `automation/versand_transit_wache.py` vergleicht je Lieferzeit-Tier das Seitenfenster mit dem Kassenfenster und meldet in der Ampel.
  - Die Lösung entscheidet der Betreiber:
    - (a) Eigenes Profil «Druck auf Bestellung» mit Transit 6–13 Tagen und Tarifen unter den gleichen Namen. 0.00 nur für Editor- und Textilprodukte ab einem Mindestpreis. Sticker und Magnete zu 4.90–7.90 bleiben im General profile, sonst entsteht ein Verlust (Marge 2.91 vor Versand, `sticker_kosten.py`). Dazu eine Ausnahme in `versandprofil_poster.py` und `profile_zonen` in `automation/data/versand_transit_regel.json`, sonst dreht die scharfe Wache es zurück.
    - (b) Seite und Korb zeigen für eu-druck das Kassenfenster. Das ist ehrlich, nennt aber ein späteres Datum als in Wirklichkeit.
  - Rückweg: Profil löschen bzw. Tier-Wert zurück.
- **Prüfung:** Kasse mit browser.mjs und Testadresse: das Datum stimmt mit der Seite überein.
- **Gewissheit:** Die Lücke ist hoch sicher. Die Wirkung liegt nach dem Korb (VERMUTUNG).
- **Betreiber?** **Ja** (Versandgeld).

### 12. Kosmetik: Produktwahrheit und pauschal «Geprüfte Angaben»
- **Befund:**
  - «Tunmate Rizinusöl» ist laut Karton ein «CASTOR HAIR OIL» mit 12 Zutaten, darunter Mineral Oil und Fragrance. Der Text behauptet «aus den Samen des Rizinusbaums gewonnen». Der SEO-Text nennt «…Haar, Haut & Wickel».
  - Der Ratgeber verlangt kaltgepresstes Öl und verlinkt trotzdem Tunmate. Die Wickel-Seite empfiehlt «Passend dazu: Tunmate».
  - Tunmate Arganöl ist ebenfalls eine Mischung.
  - «Geprüfte Angaben» steht auf 610 von 610 Hautpflege- und 1'162 von 1'163 Make-up-Produkten. Davon haben 569 bzw. 1'136 keine Inhaltsstoffe.
- **Belege:** GEMESSEN: Bild 2 in voller Auflösung, descriptionHtml, die Ratgeber-Artikel, Klassenzählung von zwei Prüfern übereinstimmend.
- **Betroffen:** 1'773 Kosmetik-Produkte (Leiste), ~6 Kandidaten mit Reinstoff-Titel, 3 Seiten mit falschem Verweis. Wenig Besuch: seit 27.09. 0 Google-Sitzungen.
- **Umsetzung:**
  - a) Tunmate: Zuerst den frischen Stand lesen (updatedAt heute 17:15). Titel «Tunmate Rizinus-Haaröl (Ölmischung) · 60 ml», deutsche INCI-Liste, Verwendung nur Haar und Kopfhaut. Den falschen Satz und «Wickel» aus dem SEO-Text streichen. Hauptbild auf Bild 8 (Flasche).
  - b) Den Tunmate-Verweis aus dem Ratgeber `rizinusoel-wickel-anwendung-anleitung` und von der Wickel-Seite nehmen.
  - c) Leiste im Theme: «Geprüfte Angaben» bei Hautpflege und Make-up nur, wenn Inhaltsstoffe im Text stehen. Sonst die Zeile weglassen, kein neues Versprechen.
  - d) INCI nachtragen: erst die CJ-Beschreibung nach «Ingredients» durchsuchen, dann Vision doppelt lesen (Muster `masstabelle_schreiben.py`). Sonst nichts schreiben (Allergierisiko).
  - Wächter: `versprechen_wache.py` bekommt zwei Regeln: «Geprüfte Angaben ohne Beleg» und «Reinstoff-Titel gegen INCI mit Mischung, Mineral Oil oder Fragrance». Die Regeln gelten auch für den Importer.
  - Rückweg: Ledger mit den alten Texten.
- **Prüfung:** WebFetch auf Tunmate, den Ratgeber und die Wickel-Seite. Zähler «Geprüfte Angaben ohne INCI» → 0.
- **Gewissheit:** Tunmate hoch, Klasse hoch. Wirkung auf Körbe niedrig, Risiko für Recht und Vertrauen hoch.
- **Betreiber?** **Ja** für zwei Rechtsfragen (VERMUTUNG, ungeprüft): Verlangt die Preisbekanntgabeverordnung (Art. 5) bei Kosmetik mit Volumen einen Grundpreis? Ist ein nur englisch beschrifteter Karton zulässig (Kennzeichnung in einer Amtssprache)? Falls der Grundpreis Pflicht ist: `unitPriceMeasurement` aus der ml-Angabe nur bei Einzelstücken setzen, Packungen ausschliessen, mit Trockenlauf.

### 13. Karton- oder Massbild als Hauptbild
- **Befund:** `hauptbild_ohne_text.py` hat den Tunmate-Karton mit «4.33in/11cm» nach vorn gestellt (Ledger `dropship/_hauptbild_ohne_text.txt` Z. 4013). `bildtext_pruefen.py` zählt nur Wörter ab 3 Buchstaben (WORT-Regex Z. 63, WORTGRENZE 4, GEMESSEN). Masslinien zählen damit als 0 Wörter.
- **Belege:** Admin-API, Bild selbst geladen.
- **Betroffen:** 3'744 «umgestellt»-Produkte. Proxy: 49 Hautpflege- und 38 Make-up-Produkte mit «Ansicht N≠1». Wie viele davon Karton zeigen, ist unbekannt.
- **Umsetzung:**
  - `bildtext_pruefen.py`: Zeichen aus Zahl plus Einheit (in, inch, cm, mm, ml, oz) schliessen ein Bild als Hauptbild aus.
  - Zuerst eine Vision-Stichprobe von 100 der 3'744, dann der Kontaktbogen in Chargen.
  - Wächter: Das Skript läuft schon täglich in `fixer_keepalive.sh` (Liste Z. 585) und erfasst so auch neue Importe.
  - Rückweg: alte Position aus dem Ledger.
  - Risiko: Ohne textfreies Bild bleibt alles, wie es ist.
- **Prüfung:** Selbsttest mit Tunmate Bild 3 ergibt «nicht sauber». WebFetch: og:image zeigt die Flasche.
- **Gewissheit:** Ursache hoch, Ausmass offen.
- **Betreiber?** Nein.

### 14. Englische Lieferantenwörter in Auswahlwerten und Textfehler bei Herrenschuhen
- **Befund:**
  - 532 von 1'827 Herrenschuhen haben englische Farb- oder Stilwerte, z. B. «White Hidden Elevator 6CM» oder «Black mesh fabric-Flat bottomed style».
  - Im Text: «Viskose-Verfahren» 26×, «Absatzhöhe flach» bei Erhöhung 5×, «ist in X erhältlich» bei mehreren Farben 3×.
  - Material: Leder im Text gegen Google-Material ohne Leder (11 bis 149, je nach Regel). 1'056 haben kein Material-Metafeld.
  - Der Sneaker heisst «8 cm Plateausohle», das Bild zeigt aber eine versteckte Innenerhöhung.
- **Belege:** GEMESSEN (`hs_desc.jsonl`, Gegenprüfer).
- **Betroffen:** 532 (Auswahlwerte) und ≈ 35 (Text). Die Klasse ist shopweit vermutlich grösser.
- **Umsetzung:**
  - `automation/variant_value_clean.py` (läuft schon täglich, kennt bisher nur Roh-Codes) um englisch → deutsch erweitern, mit dem Wörterbuch aus `auswahl_werte.py`. Trockenlauf, Wortgrenzen, Ledger.
  - Textregeln als Ersetzungen in den bestehenden Textwächter (Muster `styling_floskel_wache.py`).
  - Sneaker-Titel «Herren Sneaker mit versteckter Erhöhung 8 cm», wie die Varianten heissen.
  - Material nach den CJ-Daten richten, nicht raten.
  - Rückweg: Ledger.
- **Prüfung:** Zähler vorher und nachher; WebFetch auf Sneaker und 627100.
- **Gewissheit:** hoch. Wirkung mittel (VERMUTUNG).
- **Betreiber?** Nein.

### 15. SEO-Titel bleibt nach einer Titelkorrektur kauderwelsch
- **Befund:** `titel_kauderwelsch_wache.py` korrigiert nur den Produkttitel (kein «seo» im Skript, GEMESSEN). Beim Kostüm steht im Browser-Tab «Inflierbares …», die Meta-Beschreibung hat 44 Zeichen. Im Ledger steht «Witch Hat Nachtlicht → Hexenhut», der SEO-Titel ist aber noch englisch.
- **Belege:** Browser, `dropship/_titel_kauderwelsch.tsv`.
- **Betroffen:** Von den 93 Halloween-Artikeln weichen 11 ab (6 Kauderwelsch), 7 haben eine Beschreibung unter 70 Zeichen. Dazu jede «korrigiert»-Zeile im Ledger.
- **Umsetzung:**
  - Nach jeder Titelkorrektur `seo.title` über `seo_titel.mjs` neu bilden (Grenze 70 Zeichen).
  - Einmal alle «korrigiert»-Zeilen nachziehen.
  - Beschreibung ≥ 120 Zeichen, ohne festes Datum.
  - Handle nicht ändern.
- **Prüfung:** WebFetch auf den Kostüm-`<title>`. Zähler «korrigiert, SEO ≠ Titel» → 0.
- **Gewissheit:** hoch. Wirkung klein bis mittel (Vorschau bei ChatGPT und in Links).
- **Betreiber?** Nein.

### 16. Liefergebiet und Versandzeile: Liechtenstein, Deutschland, JSON-LD
- **Befund:**
  - Die Leiste zeigt «Versand CHF 7 · gratis ab CHF 50» ohne Land. Für Liechtenstein ist das falsch (14.90, kein Gratisversand).
  - «Nur CH/LI» steht erst in der Fusszeile. Beim Kostüm kamen 4 von 7 Besuchern aus Deutschland, 3 davon über ChatGPT.
  - Das Produkt-JSON-LD hat keine `shippingDetails`, das Organization-JSON-LD nennt nur CH.
  - Die feste Zeile in cart.json ist laut Kassen-Bericht vom 13.10. schon **entschieden: streichen**.
- **Belege:** GEMESSEN mit ShopifyQL, Browser und dem Versandprofil.
- **Betroffen:** Alle Produktseiten. Deutschland macht 22 von 687 Sitzungen aus (3 %).
- **Umsetzung:**
  - Leiste: «🇨🇭 Lieferung nur in die Schweiz und nach Liechtenstein · Support info@luxestyle.ch» und «Versand in der Schweiz CHF 7 · gratis ab CHF 50». Die Support-Zeile bleibt.
  - JSON-LD: OfferShippingDetails für CH und LI, Liechtenstein im Organization-Block.
  - cart.json: die feste Zeile streichen.
  - Wächter: `automation/liefergebiet_text_wache.py` liest schon alle Theme-Texte. Neu: Versandpreis-Satz ohne Land, LI im JSON-LD.
  - Messregel: Sitzungen aus nicht belieferten Ländern abziehen, bevor eine Seite als «0 Körbe» gilt.
- **Prüfung:** WebFetch auf Text und JSON-LD.
- **Gewissheit:** hoch. Wirkung klein.
- **Betreiber?** Teilweise. WELCOME10 im Band 45–49.99 ist noch offen (Entscheid 2 im Kassen-Bericht). Erst danach den Kostüm-Preis auf 49.90 setzen (Kasse gratis, Gesamtbetrag gleich).

### 17. Empfehlungen passen nicht
- **Befund:**
  - «Das könnte dir auch gefallen» im Warenkorb ist eine feste Kollektion (bestseller). Darin: Boho-Set, Sandalen, Smartwatch, Kette zu CHF 199.
  - Bei den «Ähnlichen Produkten» zeigt das Kostüm 8 von 10 Elektronik-Artikeln, Tunmate 4 Haaröle.
- **Belege:** Live-Datei `templates/cart.json`, `/recommendations`.
- **Betroffen:** /cart sieht kaum jemand (der Warenkorb öffnet als Schublade). Die related-Liste betrifft trend-Ware.
- **Umsetzung:**
  - Test: an 10 Produkten trend und viral mit Trockenlauf und Ledger entfernen, danach related nachmessen. Die Ursache ist VERMUTUNG. Achtung: trend speist die Startseiten-Reihe.
  - Für Seiten mit viel Besuch das Metafeld `related_products` (Search & Discovery) setzen. Das braucht keine Theme-Änderung.
  - Den Warenkorb-Block erst umstellen, wenn /cart messbar besucht wird.
- **Prüfung:** recommendations vorher und nachher.
- **Gewissheit:** Befund hoch, Ursache VERMUTUNG, Wirkung niedrig.
- **Betreiber?** Nein.

### 18. Ersatz-Weiterleitungen von einem Set auf ein Einzelteil
- **Befund:** `google_nachfrage_wache.py` zählt jede 301 als Ersatz, und seine STOPP-Liste streicht «set» und «stueck» (Z. 34, GEMESSEN). `tote_landeseiten.ersatz()` merkt nicht, wenn im Ziel ein Bestandteil fehlt. 10 von 535 Produkt-Weiterleitungen gehen von einem Set auf ein Einzelteil, z. B. Sonnenbrillen-Set → Brille oder Jade-Roller-Gua-Sha-Set → Roller. Der Rizinus-Fall ist **historisch**, er wurde am 27.09. behoben.
- **Belege:** Admin urlRedirects.
- **Betroffen:** 10 Weiterleitungen und alle künftigen.
- **Umsetzung:**
  - Neue Regel in `automation/weiterleitung_ziel_wache.py` (täglich, Ledger und Rückweg sind schon da): Fehlt im Ziel ein Set-, Stück- oder «mit X»-Wort der Quelle, wird **gemeldet**, nicht automatisch gedreht.
  - Dieselbe Regel in `tote_landeseiten.ersatz()`.
  - Rizinus: Ein Set gibt es erst, wenn `cj_ersatz_suche.py` ein reines kaltgepresstes Öl ab 100 ml mit CH-Linie findet (nach dem Reset).
- **Prüfung:** Die Meldeliste enthält die 10 bekannten Fälle.
- **Gewissheit:** hoch. Wirkung klein.
- **Betreiber?** Nein.

### 19. Ratgeber-Rückverweis: Ledger-Fehler
- **Befund:** `ratgeber_rueckverweis.py` prüft das Ledger nur für den ersten verlinkenden Artikel (Z. 114, GEMESSEN). Der Selbst-gestalten-Ratgeber verlinkt Tassen und eine Muschel-Halskette, aber kein Shirt.
- **Umsetzung:**
  - Ledger je Artikel prüfen.
  - Shirt und Tasche im Ratgeber verlinken, die Halskette prüfen.
  - Wächter: `blog_linkziele_wache.py`.
- **Prüfung:** WebFetch auf den Ratgeber und den Schlusslink beim Shirt.
- **Gewissheit:** hoch. Wirkung klein.
- **Betreiber?** Nein.

### 20. /fr/: Grössenhilfe fehlt, Bausteine bleiben deutsch
- **Befund:**
  - `lux_sizeguide` erkennt «Taille» nicht.
  - Die Seite groessentabelle hat keine französische Übersetzung.
  - Liefer- und Rückgabeblock sind deutsch.
  - 157 von 159 Romandie-Sitzungen landen auf deutschen Seiten. Trotzdem: Körbe Romandie 3,1 %, Zürich 3,2 %. Die Sprache ist also nicht der Engpass.
- **Umsetzung:**
  - (1) groessentabelle übersetzen.
  - (2) Dann «Taille» als exakten Optionsnamen erkennen und den Hinweistext je `request.locale` ausgeben. Achtung: «Taille» ist auch die deutsche Taillenweite.
  - (3) Farbwerte und Theme-Blöcke zusammen mit einem /fr/-Stichproben-Wächter.
  - Das Sprach-Band hat niedrige Priorität, keine automatische Umleitung.
- **Gewissheit:** Befund hoch, Wirkung niedrig.
- **Betreiber?** Nein.

### 21. Doppelte Galeriebilder sind Variantenbilder
- **Befund:** 764 Herrenschuhe haben zusammen 2'144 Kopien. 97 % davon hängen an Varianten. Weil das Theme Variantenbilder ausblendet, sieht man live nur 1 Doppelung.
- **Umsetzung:**
  - Nur wenn Zeit bleibt: zuerst die Varianten aufs Original umhängen (`productVariantDetachMedia` + `productVariantAppendMedia`), dann die Kopie löschen. Hash-Gegenprobe, Rückweg-Ledger, danach zurücklesen, dass jede Variante ein Bild hat.
  - Importer: dieselbe Quell-URL nie zweimal anlegen.
  - Sonst liegen lassen.
- **Gewissheit:** Befund hoch, Wirkung klein.
- **Betreiber?** Nein.

### 22. Kleinkram am Kaufknopf (niedrigste Priorität)
- **Befund:**
  - Am Handy liegt der Knopf bei y=848, also unter dem ersten Bildschirm, weil der Mengenwähler eine eigene Zeile hat.
  - Grösse 37 ist vorausgewählt, die Sticky-Leiste zeigt «/ 37».
- **Umsetzung:**
  - Menge und Knopf in eine Zeile setzen. Den Mengenwähler **nicht** ausblenden, der 10-%-Rabatt ab 2 Stück läuft über ihn.
  - Optional: Bei Produkten mit Grössenoption scrollt der Sticky-Knopf zur Grössenwahl, solange niemand die Grösse geändert hat.
- **Prüfung:** Mit browser.mjs nachmessen, Knopf-y < 750.
- **Gewissheit:** gemessen an einer Seite. Wirkung klein, jeder Eingriff in Horizon ist riskant.
- **Betreiber?** Nein.

---

## Betreiber-Entscheide (gesammelt)
1. **Halloween:** CJ-Kostüme und Partydeko ab 15.10. bis 01.11. aus den Social-Kanälen nehmen? Der Onlineshop bleibt (Klasse 3).
2. **Versand für Druck auf Bestellung:** eigenes Profil mit 0.00 für Editor- und Textilprodukte ab Mindestpreis, oder Seite ans Kassenfenster angleichen (Klasse 11).
3. **Drei Editor-Shirts zusammenlegen?** COWORK-AUFTRAEGE §10, offen seit 29.08. (Klasse 8).
4. **WELCOME10 im Band 45–49.99:** Entscheid 2 im Kassen-Bericht. Danach der Kostüm-Preis 49.90 (Klasse 16).
5. **Rechtlich:** Grundpreis-Pflicht für Kosmetik, Kennzeichnung bei nur englisch beschriftetem Karton (Klasse 12).
6. **Zoll/MWST-Satz auf Direktversand-Seiten:** bleibt offen, nichts selbständig schreiben.

## Verworfen
- **Sneaker B1, Alternativen 616900 und 603800 «bis 48»:** Sie bieten nur 47 und 48 an, 603800 sogar flache Varianten. Feste Handles können später auf Entwurf gehen.
- **Sneaker B1, Rest:** «Fusslänge bis ca. 27 cm» ist nicht gemessen. «Hinweis und Tabelle widersprechen sich» ist widerlegt, die allgemeine Tabelle sagt dasselbe. «Etwa die Hälfte der Männer betroffen» ist nicht gemessen.
- **Sneaker B2, Sprache als Kaufgrund und automatische Umleitung nach /fr/:** Romandie hat 3,1 % Körbe, Zürich 3,2 %.
- **Sneaker B4, bedingte Versandzeile in cart.json und Text «Gilt ab CHF 50»:** WELCOME10 gilt ab 0.01, der Text wäre also falsch. Die Zeile wird gestrichen (bereits entschieden). Eine bedingte Fassung wäre für Liechtenstein falsch.
- **Sneaker B5, «Kein Zoll, keine Zusatzkosten»:** Das ist eine Rechtsaussage und eine offene Betreiber-Frage. Der eBay-Preisvergleich hilft bei keiner Entscheidung.
- **Sneaker B6, «Kopie löschen, Original behalten»:** Das würde den Bildwechsel bei der Farbwahl in 97 % der Fälle zerstören.
- **Sneaker B7, keine Vorbelegung in Horizon:** Betrifft ≥ 14'367 Produkte, hohes Risiko für kleinen Nutzen. Fehlbestellungen sind nicht belegt.
- **Rizinus B1, Schwere «hoch»:** Der Fall ist seit dem 27.09. behoben, 0 von 12 gegen 3 von 68 liegt im Zufall.
- **Rizinus B3 und B6, Set oder Angebot «Wickel + Tunmate» (CHF 29.52):** Tunmate ist laut B2 eine parfümierte Haaröl-Mischung mit Mineralöl.
- **Rizinus B4, «keine SEO-Begriffe wie kaufen» auf 1'773 Kosmetik-Seiten:** Das nimmt Verkehr weg, und der Verkehr ist der Engpass.
- **Rizinus B6, Metafeld complementary_products:** Ohne Theme-Änderung zeigt es nichts an, der Block nutzt related.
- **Kostüm B1, «Lieferung in 1–2 Werktagen»:** falsch (P1D + Transit). Ebenfalls verworfen: ein WebFetch-Wächter im Aufseher (gibt es dort nicht, curl sieht eine Bot-Kopie) und die Abmeldung aus dem Onlineshop (404 für URLs, die ChatGPT kennt; Herbst-Deko bleibt verkäuflich).
- **Kostüm B3, Kollektionsregeln von trends-gadgets und Viral-Hits ändern:** Sie sind gewollt quer und speisen Startseite und Menü. Search & Discovery «ergänzend» wirkt nicht auf den related-Block.
- **Kostüm B4, «Gebläse eingebaut (Angaben folgen)»:** unbelegt und wirkt unfertig.
- **Kostüm B5, zweite Kauderwelsch-Wortliste:** würde die bestehende Zwei-Modell-Prüfung nur doppeln.
- **Kostüm B6, Preis 50.00 oder 45.90:**
  - 50.00 wirft das Kostüm aus «Lieblinge unter CHF 50».
  - 45.90 ist zu dünn bei EK 20.66 + Fracht ab USD 14.
  - Die Klassenaussage «Bei 45–49.99 sagt die Seite CHF 7 Versand» ist widerlegt.
- **Kostüm B7, Support-Zeile durch Liefergebiet ersetzen:** Damit fiele der Support-Kontakt weg.
- **Kostüm B8, Mengenwähler ausblenden:** Der 10-%-Rabatt ab 2 Artikeln läuft über die Menge.
- **SG-1, Doppel draften:**
  - Gruezi und Grüezi sind zwei verschiedene Motive, kein Doppel.
  - Die Unisex-Seite zu draften würde XS sowie 3XL–5XL aus dem Angebot nehmen.
  - Eine Umlaut-Normalisierung ü→u in der Titel-Wache würde diese Paare fälschlich melden.
- **SG-2, Beispielbild als Bild 1:** Es ist das Google-Bild, ein Text darauf zählt als Promotional overlay. `pod_blank_mockups.mjs` entfernt «Dein Design» bewusst und taugt dafür nicht.
- **SG-3, 0.00-Profil für alle POD-Produkte:** Sticker- und Magnetkörbe würden zum Verlust.
- **SG-4, Text «Foto ab 1500 px» vor dem Anheben der Druckdatei:** ein leeres Versprechen. Die Zahl «319 nennen ein Verfahren» ist falsch, gemessen sind 47.
- **SG-6, Regel von t-shirts-tops einengen:** Das ist die Damen-Menükollektion mit 1'410 Produkten.
- **SG-8, Regel «Kategorie → Artikel»:** Der Link ist ein echter Rückverweis, kein Zufall. «Bestbewertet» auf der Shirt-Seite war ein WebFetch-Artefakt; das Such-Dropdown bleibt als Prüfauftrag in Klasse 2.

Arbeitsdateien der Prüfer liegen unter `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kaufstrecke/` (sneaker-plateau, gegenpruef-610100, rizinusoel, gegen-rizinus, kostuem-zwei, gegenpruef, shirt, sg-gegen).