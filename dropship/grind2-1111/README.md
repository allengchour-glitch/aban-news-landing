# Grind 2.0 am 11.11.2026: Lückenliste neu, Suchwort-Pflicht, Decals

Auftrag des Besitzers 11.11.: «kannst du cj weiter grinden?»

## Was fehlte

Die Lückenanalyse vom 27.10. (`/tmp/grind2/luecken.json`) lag nur im temporären Ordner und ging beim Neustart verloren;
`dropship/grind2_bedarf.json` (der Ersatzpfad von `grind2.mjs`) gab es nie. Ohne sie läuft der Grind nicht.

## Neu

- `automation/grind2_bedarf_bauen.mjs`: baut die Liste aus den Zielen in `automation/lib/grind_google_daten.json`
  (`regeln[].ziel` = «<id> (<rang>)», 54 Ziele) und einem frischen Katalog (`node automation/katalog_bulk.mjs /tmp/katalog_voll.json`).
  Bestand je Ziel GEMESSEN als Titel-Treffer der `titel_muss`-Regeln (ohne `titel_nicht`); Lücke = 30 (Saison) bzw. 45 minus Bestand.
  Saison jetzt (S): Lichterketten, Fensterdeko, Geschenkband, Skibrillen, Schneeschuhe, Bettdecken, Babyschlafsack, Babyoveralls,
  Kinderuhren, Joysticks, Actioncams, Trockenblumen, Kronleuchter, Taschenlampen (SETZUNG). Sommerware zurückgestellt (R).
  Suchwörter englisch, von Hand. **Grenze:** der Bestand ist eine Titel-Zählung (Hypothese: eher zu tief), keine Nachfrage-Messung.
- `dropship/grind2_bedarf.json`: Stand 11.11.2026 19:09 UTC (56 498 aktive Produkte, 51 von 54 Zielen mit Lücke).
- **Suchwort-Pflicht** (`suchwortPasst`, Grund `suchwort-fehlt`, Schalter `SUCHWORT_PFLICHT=0`): ein Treffer einer CJ-Suche muss
  jedes Wort des Suchbegriffs im englischen Namen tragen (ganzes Wort, Mehrzahl -s/-es, Füllwörter frei). Belegte CJ-Kategorien
  werden nicht geprüft. GEMESSEN 11.11.: ohne die Pflicht lieferten «window sticker» und «string lights» Eiskratzer, Auto-Sonnenschutz,
  Tischlampen und ein Bikini (0 von 10 Kandidaten passend); mit ihr sind 20 von 20 Kandidaten thematisch richtig.
- **Decals**: der Zubehör-Wächter wertete «Fenstersticker» unter «Home Decor Decals» als Zubehör-Konflikt; bei Wandtattoos und
  Fensterstickern ist der Sticker die Ware selbst (`ZUBEHOER_PFAD_RE` + «Decals»).

## Prüfung

`node automation/grind2_test.mjs`: 692 ok, 0 Fehler (vorher 671). Mutationsprobe Suchwort 13 von 13 erkannt, Decals 1 von 1.

## Trockenläufe 11.11. (nur CJ gelesen, nichts geschrieben)

| Lauf | Ziele | Kandidaten | durch alle Tore | Hauptgründe |
|---|---|---|---|---|
| a (ohne Pflicht) | 8 Saison | 10 | 0 | Google-Kategorie unsicher (Fremdware aus der unscharfen Suche) |
| b (mit Pflicht) | 8 Saison | 20 | 0 | keine Shop-Kategorie (Skibrillen, Schneeschuhe, Trockenblumen), Optionswerte nicht sicher übersetzt, über 40 Varianten, Zubehör-Fehlalarm (behoben), dünnes Datenblatt, Fremdstecker |

**Offen:** für Skibrillen, Schneeschuhe und Trockenblumen fehlt eine Shop-Kategorie (`sort-`-Tag mit Collection); erst danach können
dort Produkte kommen (Skill kategorien-nach-google).

## Live-Lauf und Freigabe 11.11. (GEMESSEN)

Der Grind legte am 11.11. sechs Entwürfe an (Fensteraufkleber, Filterkugeln, Katzentunnel, Motorrad-Dashcam, AirPods-Hülle, Angelrute).
Jeder wurde von zwei unabhängigen Prüfern gegen Datenblatt, Bilder und Preis gelesen (Workflow `wf_3d2a3a72-d35`).
Die Fliesstexte gingen über die Text-Kette (`STATUS_OK=DRAFT LEERE_PROSA_OK=1`), mit den Korrekturen der Gegenprüfung
(Katzentunnel: zwei getrennte Filzteile statt «innen und aussen zwei Töne»; Fensteraufkleber: Format ohne Lesart «je Bogen»).

**Veröffentlicht 20:13 UTC** (`automation/grind_freigabe.mjs`, Plan `plan_freigabe_1111.json`, je 6 Kanäle, frisch gelesen ACTIVE,
Shopseite HTTP 200 mit `InStock`):

| Produkt | Preis | Änderung vor der Freigabe |
|---|---|---|
| Weihnachts-Fensteraufkleber | 14.90 | Hauptbild, Farbe «Weiss oder bunt», Lieferumfang «1 Rolle mit 2 Bögen» |
| Filterkugeln für Aquarium, 500 g, ca. 20 mm | 15.90 | Titel, Werbebild «Bio Balls … restore water quality» vom Produkt gelöst (`fileUpdate referencesToRemove`, Datei bleibt), «Kugeln» statt «Bälle», «ca. 20 mm» |
| Katzentunnel aus Filz, verformbar und zusammenrollbar | 17.90 | Titel, Farben A bis F benannt (E «Orange/Grau»: oben orange, unten grau), Hauptbild |

**Bleiben Entwurf** (Tag `grind-gehalten-0911`): Motorrad-Dashcam und AirPods-Hülle (Bild- und Datenblattfunde, Figurenmotive),
Angelrute (Korrekturrunde offen: Längenliste, Bilder, Optionen in cm, Titel).

**Werkzeug-Fehler behoben:** Shopify speichert einen SEO-Titel, der gleich dem Produkttitel ist, als leer (`seo.title: null`,
gemessen am Katzentunnel). Das Rücklesen meldete darum «ABWEICHUNG: SEO» (Exit 4), obwohl alles stimmte. Neu `seoGleich()`:
ein leerer SEO-Titel zählt wie der Produkttitel. Test 50 → 52, Gegenprobe mit dem alten Vergleich: beide neuen Prüfungen rot.

Rücknahme je Produkt: `ZURUECK=1 LIVE=1 PLAN=… node automation/grind_freigabe.mjs` (Sicherung `dropship/grind-freigabe-0911/sicherung.json`);
das gelöste Werbebild hängt `fileUpdate referencesToAdd` wieder an (`sicherung_medien_1111.json`).

**Ungemessen:** Verkäufe, Google-Prüfung der drei neuen Produkte (sie kommen erst über das tägliche Schaufenster in den Google-Kanal).

## Google-Rückholung 11.11. (zehn bewährte Produkte, Workflow `wf_5e6dea54-154`)

Zehn Produkte der Stufe 0 (bestellt oder gut bewertet) standen nicht im Kanal «Google & YouTube». Je zwei Prüfer lasen alle Bilder
auf Werbeüberlagerung und Fremdlogos und jedes Titelversprechen gegen das CJ-Datenblatt.

**Aufgenommen 20:09 UTC** (`gmc_schaufenster.mjs PHASE=aufnehmen BUDGET=78000 ONLY=…`, frisch gelesen `publishedOnPublication: true`):
`ultradunne-tragbare-lesebrille-aus-tr90-636700` (roter Dioptrien-Aufkleber «+1.00» auf allen Bildern, echtes Etikett, geringes Risiko)
und `dreifachklinken-tennisarmband-mit-zirkon-613400` (Handgelenk-Foto vorher gelöst: es zeigt wahrscheinlich ein Armband mit grösseren Steinen).

**Erst korrigieren (7):** Echtleder-Gürtel (Farbetiketten auf allen Bildern, Werbetext, «Material: Denim» im Kasten), Familien-Set
(Grössentabelle mit chinesischer Schrift, «Baumwolle» unbelegt), Weste (Collagen mit Werbetext und Fremdmarke), Yoga-Top
(Textschilder auf Haupt- und Variantenbildern), Armbanduhr («Gold» im Titel bei 6 Farben, Material widersprüchlich, «50 m»),
Smartwatch (Collage als Hauptbild, chinesische Schrift), Silikon-Küchenhelfer (Werbe-Overlays auf Haupt- und Variantenbildern).
**Nicht aufnehmen (1):** Mutter-Tochter-T-Shirt (Minnie Mouse ohne belegte Lizenz): Tag `lizenz-nicht-bewerben` gesetzt, Produkt bleibt im Shop.
Die Berichte mit Korrekturvorschlägen liegen im Workflow-Protokoll; die Korrekturen sind noch nicht gemacht.
