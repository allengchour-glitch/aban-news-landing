# Social Woche 16. bis 21.11.2026: sechs Foto-Pakete als Metricool-Entwürfe (11.11.2026)

## Was entstand

Ein Arbeitslauf mit 29 Agenten (Plan, je Paket Bau, zwei unabhängige Prüfrunden, Nachbesserung) baute sieben Pakete
(Instagram/Facebook-Karussell, TikTok-Fotos, Threads, Pinterest-Pin). 31 Kandidaten wurden mit Kontaktbogen gesichtet,
24 verworfen (Personen, Fremdmarken, Fremdschrift, Fotomontagen, Lizenzrisiko; Liste im Arbeitslauf `wf_39ec3a9c-231`).

| Tag | Produkt | Instagram/Facebook | TikTok | Threads | Pinterest |
|---|---|---|---|---|---|
| Mo 16.11. | Weihnachtskugeln beflockt, 9 Stück | 16:00 | 18:00 | 11:00 | 20:00 |
| Di 17.11. | Retro-Keramiktasse mit Tiermotiv | 17:00 | 16:00 | 11:00 | 20:00 |
| Mi 18.11. | Weihnachtsstrumpf mit Samt-Optik | 17:00 | 18:00 | 14:00 | 20:00 |
| Do 19.11. | LED-Schminkspiegel | 17:00 | 18:00 | 11:00 | 20:00 |
| Fr 20.11. | Lichterbaum-Musikbox | 17:00 | 15:00 | 14:00 | 20:00 |
| Sa 21.11. | Schmuckkästchen 3D-Holzpuzzle | 17:00 | 18:00 | 14:00 | 20:00 |

**Zurückgehalten:** Kaffeebecher Edelstahl (22.11.): nur zwei taugliche Fotos, eines mit hellen Sprenkeln; die Produktseite
zeigt als Bild 8 ein fremdes Produkt, die Ausführung «Mehrfarbig» einen silbernen Becher. Erst Seite bereinigen.

## Was ich vor dem Anlegen geändert habe

- **Wegweiser:** alle sechs Produkte in `aus-tiktok-und-instagram` aufgenommen (27 → 33, zurückgelesen), sonst hielte
  Tor 4 der Freigabe alle Entwürfe und `/ig` und `/tt` führten auf eine Sammlung ohne das Produkt. Dabei gefunden:
  `wegweiser_aufnehmen.mjs` sperrte das harmlose Chargen-Tag `rueckhol-0907` (bekannte Falle); Muster korrigiert.
- **Versandzeile:** neben jedem Preis «Versand in der Schweiz CHF 7, ab CHF 50 gratis nach Rabatt.» (Gegenprüfung des
  Social-Meisterplans: Preis nie ohne Versand).
- **Pinnwand:** Advent-Deko (`1111333714239114033`) für Kugeln, Strumpf, Lichterbaum; Geschenke/Wohnen
  (`1111333714239114020`) für Tasse, Spiegel, Schmuckkästchen (gelesen aus den bisherigen Pins).
- **Texte:** «handgefertigt» bei der Tasse gestrichen (nur Lieferantenangabe); fehlender Punkt beim Lichterbaum.
- **Strumpf-Seite** (`strumpf_seite.mjs`, LIVE, zurückgelesen): Auswahl «Rot, 10x19inch» → «Rot», Masse
  «ca. 25 × 48 cm (10 × 19 Zoll)», «Tassel-Detail» → «Quaste». Rücknahme `ZURUECK=1 LIVE=1 node strumpf_seite.mjs`.

## Anlegen

`entwuerfe_anlegen.py` (Trockenlauf Vorgabe, `LIVE=1` legt an): Bilder ins Shopify-CDN, über `normalize/image/url` zu
Metricool, je Paket vier Beiträge mit `draft: true`, `autoPublish: false`; TikTok mit `commercialContentOwnBrand` und
`autoAddMusic`. Ein POST ohne sichere Antwort wird nie wiederholt (Lehre 09.11.). Protokoll `angelegt.json`.
Eingeplant wird erst durch die tägliche Freigabe (05:41 UTC, acht Tore); Stopp je Beitrag: uuid in
`dropship/METRICOOL-HALTEN.txt`.

## Ungemessen

Ob die Plattformen die Beiträge annehmen; Wirkung auf Besuche und Käufe; die Produktangaben selbst (Lieferantenangaben,
kein Muster).
