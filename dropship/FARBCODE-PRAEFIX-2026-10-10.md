# Code vor der Farbe im Auswahlfeld (10.10.2026, Verbesserungsrunde 12:25 UTC)

## Gemessen

- **Stichprobe Neuimporte** (4 h, 286 Produkte): Im Feld «Farbe» standen Lieferantencodes vor der Farbe.
  - «2350 Black · 2350 Brown» (Wildleder-Sneaker)
  - «GS8111G Black · GS8111G Gray · 2GS8111G Brown» (Outdoor-Sneaker)
  - «Size 36696 Black And Red-36-696 Black And Red» (Arbeitsschuh, siehe Offen)
- **Bestand** (Optionen-Export 04:37 UTC, 52'293 Produkte): 396 Produkte mit einem Code vorn im Farb-/Ausführungsfeld (2'532 Werte).
  - Nach der Regel unten bleiben **193 Optionen**, in denen danach eine Farbe steht.
  - Der Rest ist keine Farbe und bleibt stehen: Fassungsvermögen («300ml Orange»), Leistung («135W …»), Dioptrien («100 degrees-Black»), Modellnummern («61060 C6»).
  - Beispiele: «646 Schwarz / 646 Aprikose», «933 Gelb», «8919 Armeegrün», «P0448H Schwarz», «2255 Grün mit Weiss», «9311 Schwarz · Gr. 37».
- Für die Kundin ist «646» keine Farbe, und der Code ist ein Lieferanten-Leak (Hausregel 3).

## Warum es durchkam

- **`farbcode_modell.py`** (09.10.) prüft nur Werte **ohne Leerzeichen** («QW121» → «Modell N»).
- **Der Importer-Helfer `ohneCode()`** (`CODETOKEN`) erkennt nur Codes, die mit einem **Grossbuchstaben** beginnen.
  - «GS8111G Black» wurde zu «Schwarz».
  - «2350 Black», «646 Schwarz» und «2GS8111G Brown» blieben stehen.

## Getan

- **Eine Regel** `automation/data/farbcode_praefix_regel.json`, gelesen von:
  - `automation/farbcode_praefix.py` (Bestand und Wächter)
  - `automation/farbcode_praefix.mjs` (beide CJ-Importer)
- **Was die Regel macht:** Aus «CODE REST» wird REST, englisch → deutsch über `farben_de.json`. Bedingungen:
  - CODE hat mindestens 3 Ziffern, höchstens 4 Buchstaben vorn und höchstens 2 hinten.
  - CODE ist keine Einheit, kein Mass und keine Kennung (S925/S999, 18K, IP68, 18650).
  - Das erste Wort von REST ist eine Farbe: Farbtabelle, deutsche Farbendung («Schwärzlichblau») oder Modifikator + Farbe («Light Lilac»).
- **Schutzregeln:**
  - Kurze reine Zahlen (≤ 3 Ziffern) nur, wenn ALLE Werte denselben Code tragen. «110 Rot / 120 Blau» kann eine Kindergrösse sein.
  - Kollision → die ganze Option bleibt. «GS8111G Brown» und «2GS8111G Brown» wären beide «Braun».
  - Gerätebezug im Titel (Hülle, Akku, Ersatz …) → nur melden, denn «A2337» kann das Gerätemodell sein.
- **Fehlgriffe im Trockenlauf, jetzt ausgeschlossen:**
  - angeklebte Wörter: «3237Dark Brown» wäre «Braun» geworden, «2303Wine Red» «Rot», «226Ivory purple» «purple female»
  - Mass: «45x45cm Brown Square Pillow»
  - Feinsilber: «S999 Silber-Silber»
  - Kurze Codes «933 …» fielen zuerst unter die Silber-Kennung `9xx` → nur noch 925/999.
- **Farbtabelle:** `farben_de.json` +2 (lilac → Flieder, light lilac → Helllila).
- **Prüfungen:**
  - 45 Kanarien
  - **py = js über 16'677 Optionen, 0 Abweichungen**
  - Harness-Test `buildFashion()` in beiden Importern: «2350 Black» → «Schwarz», «646 Apricot» → «Aprikose», «GS8111G …/2GS8111G Brown» → «Schwarz/Grau/Braun». Handyhülle «A2337 Black» und «300ml Orange» bleiben unverändert.
- **Bestand: 193/0 live** (12:53–13:01 UTC). Jede Option wurde zurückgelesen (`productOptionUpdate`, `LEAVE_AS_IS`), 0 Gerätetitel, 0 Fehler. Ledger `dropship/_farbcode_praefix.tsv`.
  - **Live geprüft** (WebFetch): `/products/weite-hose-mit-hohem-bund-fur-kleine-grossen-629100` zeigt «Schwarz» und «Aprikose», kein «646».
- **Wächter:** Block FARBCODE-PRAEFIX im Aufseher (`fixer_keepalive.sh`), täglich.
  - liest denselben Optionen-Export
  - startet nur bei grünem Selbsttest
  - schreibt über `shopify_schranke.sh`

## Bewusst nicht

- **Englischer Rest bleibt englisch**, wenn ihn die Tabelle nicht kennt («Black Bag», «White Net», «Blue Small Check»). Den Rest übersetzt `variantenwert_ki.py` (Aufseher, 60/Tag).
- **«8627 Stil / 8628 Stil», «31095 Color», «W001 BeigeLeaf Yellow»:** Der Rest ist keine Farbe.

## Nebenbefund: «Product page unavailable» (Google, 49)

- Alle 49 Produkte sind aktiv, kaufbar und im Google-Kanal (HTTP 200, schema `InStock`). Keine Weiterleitung, kein Grössenunterschied zur freien Ware.
- **Der Wächter `gfeed_anstupsen.py` wirkt:** 401 Produkte wurden seit 29.09. angestupst, 352 sind frei (88 %). Die Klasse sank von 369 (23.09.) auf 49.
- **Live nachgelesen (12:50 UTC):**
  - 30 der 49 tragen gerade KEINE Google-Meldung. Grund: Der Anstoss um 12:09 setzt die Meldung zurück, bis Google neu prüft. Das zählt noch nicht als frei.
  - 19 wurden am 07./08.10. angestupst. Google prüfte sie binnen ~30 Minuten neu und meldete wieder «unavailable».
  - Bei diesen hartnäckigen Fällen liegt die Ursache also woanders. 28 der 49 hatten schon 4 Anstösse.
- Die Keepalive-Zeile «GOOGLE-VERSUCH AUSWERTUNG A 21/128 · B 23/128» gehört zum Versuch vom 29.09. Seitdem sind beide Gruppen angestupst, die Zeile vergleicht also nichts mehr.

## Offen

- **«Size 36696 Black And Red-36-696 Black And Red»** (Anti-statischer Arbeitsschuh, Neuimport 03:13): Der Variantenschlüssel ist zerfallen, ein eigener Fall.
- **«Product page unavailable»:** Ursache der 19 hartnäckigen Fälle offen. Sie sind fast alle Mode mit vielen Varianten, die frei gewordenen aber auch.
- ~~Versuchszeile ausbauen~~ — erledigt: Die Zeile ist aus `engine_keepalive.sh` entfernt, ein Kommentar erklärt warum.
