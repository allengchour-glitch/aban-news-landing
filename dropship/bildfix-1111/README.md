# Bildfix 11.11.2026: Werbetext und Rahmen von Produktbildern, Versand Liechtenstein

Auftrag des Besitzers 11.11.: «mach jetzt shop produkten verbesserung?» mit dem Bild der Tabelle «Webshop: Werbetext von
Produktbildern entfernen, zu kleine Bilder hochrechnen … Ja, am meisten», danach zu den Merchant-Bildern «das dannach mal fix».

## Was live ist (je frisch zurückgelesen, Shop-Seite stichprobenweise geprüft)

Quelle der Produkte: unser Bild-Prüfer (`dropship/image-audit-report.csv`, 40 Produkte, alle ACTIVE). Die Liste von Google
(rund 357 «Werbeeinblendung im Bild», 43 «Bild zu klein») liest `automation/merchant_bildprobleme.py` (Workflow
`merchant-bildprobleme.yml`); sie war bei Abschluss dieses Teils noch nicht fertig.

| Produkt | Änderung |
|---|---|
| Kühlmatte für Hunde & Katzen | Hauptbild mit Higgsfield bereinigt (Schrift «Beige» und gelbe Fläche weg), gerahmtes Doppelbild gelöst |
| Handy-Sonnenschirm (Regenschirm mit Handy-Halterung) | 7 Variantenbilder bereinigt (Masslinien, Text, Zeichen «Dream A»), 12 von 12 Varianten zeigen sie, Doppelbild gelöst |
| Mini USB-Taschenlampe | 3 Variantenbilder bereinigt (rote Pfeile), sauberes Bild nach vorn, Doppelbild gelöst |
| Smart-Anzuchtset | Hauptbild bereinigt (Texte, Kreise, Pfeile), Doppelbild gelöst |
| LED-Schreibtischlampe («sunset-projektor-…») | Hauptbild bereinigt (Texte, Häkchenliste, Kreisbilder), Doppelbild gelöst |
| Premium Bambus Aroma Diffuser | Hauptbild bereinigt (Überschrift) |
| Rosenquarz Gua Sha Set | Hauptbild bereinigt (Schachtel mit fremder Marke «Hdeshi» entfernt) |
| Panda-Handyhalter | 3 Variantenbilder ohne Untertitel-Balken (zugeschnitten, ohne KI), sauberes Bild nach vorn, Doppelbild gelöst |
| Kühlende Sommerdecke, Handliches Massagegerät, XXL Leselupe, Krallenschleifer, Leinenhose, Kirschblüten-Halskette, Augenmassagegerät, Mini Bluetooth Speaker | vorhandenes sauberes Bild nach vorn, gerahmtes Doppelbild «LuxeStyle-Edit» mit Text gelöst (ausser Augenmassagegerät) |

Jedes bereinigte Bild wurde neben dem Original angesehen: Produkt, Farbe, Form, Streben, Clip und Hintergrundobjekte
gleich, nur Text, Masslinien, Pfeile und Marken weg. Kosten Higgsfield: 15 Bilder je 0,25 Credits.

Nichts wurde gelöscht. «Lösen» heisst `fileUpdate` mit `referencesToRemove`: die Datei bleibt unter Inhalt > Dateien.

## Wirkungsversprechen (Besitzer 11.11. abends: «ja die mit burn fat weg, wirkungsversprechen fix oder weg»)

LIVE 11.11. zwischen 19:00 und 19:10 UTC, je frisch zurückgelesen «GLEICH», Shop-Seite (`/products/<handle>.js`) gelesen:

| Produkt | Bilder | Text |
|---|---|---|
| Handliches Massagegerät | Bild 2 bereinigt (Frau ohne Symbolspalte «Burn fat»), Bilder 3, 4, 5 (Wirkungsgrafiken) gelöst; jetzt 2 Bilder | Lieferumfang «1 Set Fettverlust-Tester» → «1 Massagegerät»; SEO ohne «löst Verspannungen» |
| Augenmassagegerät | Bilder 2 bis 4 bereinigt («Heat Therapy», «Eye SPA Treatment», «eye protection» weg), Bild 5 (Modus-Grafik) gelöst; jetzt 6 Bilder | Titel ohne «gegen müde Augen»; SEO ohne «Akupressur … entspannt müde Augen» |

Meine Auslegung (nicht bestätigt): «fix oder weg» gilt auch für die Texte dieser zwei Produkte. Higgsfield: 4 Bilder je 0,25 Credits.
Der Handle des Augenmassagegeräts trägt weiter «gegen-mude-augen» (Adresse nicht geändert, sonst bräuchte es eine Weiterleitung).

Rücknahme, in dieser Reihenfolge (die Dateien in `sicherung2/` tragen dieselben Namen wie die des ersten Laufs in `sicherung/`):
1. Texte: `ZURUECK=1 LIVE=1 NODE_USE_ENV_PROXY=1 node dropship/bildfix-1111/wirkung.mjs` (Sicherungen `sicherung/wirkung_*.json`).
2. Bilder dieses Laufs: `ZURUECK=1 LIVE=1 NODE_USE_ENV_PROXY=1 node dropship/bildfix-1111/ersetzen.mjs dropship/bildfix-1111/plaene/plan_wirkung.json dropship/bildfix-1111/sicherung2`.
3. Erst danach, falls gewollt, der erste Lauf mit `sicherung/`.

## Werkzeuge

- `lesen.mjs <handles.txt> <ordner>`: liest Produkte nur lesend, baut je Produkt einen Kontaktbogen (H = Hauptbild,
  V = Variantenbild).
- `ersetzen.mjs <plan.json> <sicherungsordner>`: Trockenlauf Vorgabe, `LIVE=1` schreibt, sichert vorher je Produkt den
  Zustand (Reihenfolge, Variantenbilder), liest danach frisch zurück. Rücknahme: `ZURUECK=1 LIVE=1` mit demselben Plan
  und dem Ordner `dropship/bildfix-1111/sicherung/` (hängt die alten Bilder wieder an, bindet Varianten zurück,
  stellt die Reihenfolge her und löst die neuen Bilder). Die Pläne dieses Laufs liegen in `plaene/`.
  Schutz: bricht ab, wenn das Hauptbild seit der Planung geändert wurde, und löst nie ein Variantenbild.

## Versand Liechtenstein (Merchant Center)

- Gemessen 11.11. 18:55 UTC (Merchant API): drei Versanddienste, alle nur für CH, angelegt von der Google-App in
  Shopify (Namen wie `flat_7.00_CHF_…`). Shopify-Versandprofil «Allgemeines Profil», Zone «Liechtenstein»:
  «Standard Liechtenstein» CHF 14.90 ohne Bedingung.
- Angelegt 18:57 UTC (Variante A des Besitzers vom 10.11.): Dienst «Standard Liechtenstein», Land LI, CHF 14.90 pauschal,
  Lieferzeiten wie der Schweizer Dienst (1 Tag Bearbeitung, 9 bis 19 Tage Transit). Gemessen 18:58 UTC: steht, aktiv;
  die drei Schweizer Dienste unverändert. Das Zurücklesen direkt nach dem Schreiben zeigte ihn noch nicht (Verzögerung
  rund eine Minute).
- Werkzeug `automation/merchant_versand.py`, Workflow `merchant-versand.yml`, Modus in
  `dropship/merchant-versand-1111/MODUS` (`pruefen` liest nur, `schreiben` legt den Dienst an, wenn er fehlt,
  `zurueck` entfernt nur diesen Dienst).
- Ungemessen: ob die Google-App in Shopify den Dienst später überschreibt, und wann die Zahl «Für einige Länder fehlen
  Versandinformationen» (256 228 Artikel) sinkt.

## Offen

- Google-Liste der Bildprobleme abarbeiten (Workflow-Ergebnis lesen).
- Nicht angefasst, weil mehr als Text das Problem ist: Tech-Hero-Geschenkbox (Bild zeigt Geräte einer fremden Marke),
  Bambus-Aufbewahrungssystem (Bilder einer fremden Marke «Kitchen Edge», Rechte unklar), Herrenuhr «Executive»
  (Marke «TOMI» auf dem Zifferblatt), Edelstahl-Trinkflasche (Variantenbilder nur 209 und 290 Pixel breit, bessere Quelle nötig).
- In den Galerien der anderen Produkte stehen weiter Bilder mit Text, die nicht Hauptbild sind (Massagegerät und
  Augenmassagegerät: erledigt, siehe oben).
- Die «zu kleinen» Modebilder (500 bis 800 Pixel) sind für Google gross genug (Mindestmass 250 Pixel bei Kleidung);
  hochrechnen nur, wenn Google sie meldet.
