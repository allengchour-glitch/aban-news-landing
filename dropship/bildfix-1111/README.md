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

## Google-Liste der Bildprobleme (11.11. abends)

Quelle: `automation/merchant_bildprobleme.py` (Workflow `merchant-bildprobleme.yml`, Lauf 43082038253), Merchant API
`product_view` mit `item_issues`. 313 Angebote mit einem Bildproblem: 281 «Werbeeinblendung im Bild»
(`image_unwanted_overlays`), 29 «Bild zu klein» (`image_too_small`), 3 auf Googles Seite (Abruf ausstehend, interner
Fehler). Die Zahlen im Merchant Center (357 und 43) stammen aus einem anderen Stand oder zählen anders (nicht nachgemessen).

`google_liste.mjs` (nur lesend) ordnet jedes Angebot dem Bild zu, das Google bekommt (Variantenbild, sonst Hauptbild):
309 von 313 Angeboten zuordenbar (166 der Google-App `shopify_ZZ_…`, 143 einer zweiten Quelle `<Produkt>_<sku>`,
4 nur mit einer Nummer). Ergebnis: 102 Produkte, alle ACTIVE, 137 Bilder (45 Hauptbilder, 92 Variantenbilder).

LIVE 11.11. zwischen 20:01 und 20:07 UTC, je Produkt frisch zurückgelesen «GLEICH» (93 von 93). Unabhängige Nachprüfung
20:08 UTC: 120 neue Bilder, kein beanstandetes Bild mehr am Produkt, 119 von 119 Varianten zeigen ihr neues Bild; die
Shop-Seite (`/products/<handle>.js`) war an 6 Produkten gleich dem Admin-Stand.

| Was | Bilder |
|---|---|
| Text, Masslinien, Symbole und aufgelegte Logos entfernt (Higgsfield, GPT Image 2.6) | 114 |
| «10 Pairs» ohne KI mit dem weissen Hintergrund überdeckt (Füsslinge; Higgsfield lehnte das Bild mit Beinen ab) | 1 |
| Zu kleine Bilder hochgerechnet (Higgsfield-Upscale 2k, danach auf höchstens 2048 Pixel verkleinert) | 5 |
| Vorhandenes sauberes Bild nach vorn, weil das Hauptbild beanstandet war | 6 |
| Gelöst, weil seine bereinigte Fassung das Hauptbild ersetzt (sonst doppelt in der Galerie) | 2 |
| Nicht angefasst | 11 |

Kosten Higgsfield: 39,25 Credits (117 Bearbeitungen je 0,25 inklusive 3 Neuversuche, 5 Upscales je 2), danach 2958 Credits.

Jedes neue Bild wurde neben dem Original angesehen: Produkt, Form, Farben und Teile gleich, nur die Einblendung weg.
Drei Bilder wurden neu gemacht: der Drachenkelch (die erste Fassung aus dem 90-Pixel-Bild veränderte den Kelch; die neue
stammt aus Bild 3 ohne den zweiten Kelch) und zwei Drohnen-Varianten (die KI hatte Akkus erfunden, wo «3PCBattary» und
«2PCBattary» stand; die Akkuzahl steht weiter im Variantennamen).

Meine Auslegung (nicht bestätigt): Logos, die nur über das Bild gelegt sind (KLASVSA beim Fussbad, ROSEER beim Subwoofer,
ATTACK SHARK bei der Maus), zählen für Google zu den Werbeeinblendungen und sind entfernt. Schrift und Marken, die auf dem
Produkt selbst stehen, bleiben.

Nicht angefasst (Entscheid beim Besitzer):
- Spielkonsolen und eine Festplatte mit vorinstallierten Spielen (X9, Y2HDMAX, Mini HD Motion-Sensing, externe
  Festplatte USB 3.0): Rechte an den Spielen.
- Bluetooth Audio Empfänger fürs Auto: Bilder der Marke UGREEN.
- Kabelloser elektronischer Haustierzaun mit Halsbändern: Tierschutz.
- Drei Fortura-Artikel: Googles Abruf steht aus oder scheiterte bei Google; nichts zu tun.

Funde ohne Änderung:
- «SACE LADY Flüssig-Mascara»: Varianten Dunkelgrau, Hellbraun, Braun, Schwarzbraun, Dunkelbraun; die Bilder zeigen ein
  Augenbrauen-Gel. Titel und Text sagen Mascara. Das CJ-Datenblatt war von hier nicht lesbar.
- Nasenreiniger mit Saugfunktion: die Variante «Weiss Set-USB» zeigt ein Gesichtsdampfgerät mit US-Stecker.
- Stern-Bodysuit: eine Ausführung zeigt ein Motiv, das wie die Figur «Patrick Star» aussieht.
- Titel mit Wirkungs- oder Gesundheitsaussage (Kandidaten): «LED-Lichttherapie-Maske für strahlende Haut», «Smartwatch für
  Sport und Gesundheitsüberwachung», «Gesichtshochheber Nackenmassagegerät».

Rücknahme je Teil (Sicherungen in `sicherung3/`):
`ZURUECK=1 LIVE=1 NODE_USE_ENV_PROXY=1 node dropship/bildfix-1111/ersetzen.mjs dropship/bildfix-1111/plaene/plan_google_<1 bis 4>.json dropship/bildfix-1111/sicherung3`

Ungemessen: wann Google die Bilder neu abruft und die Zahl der beanstandeten Artikel sinkt (Prüfweg: Workflow
`merchant-bildprobleme.yml` in einigen Tagen neu laufen lassen und mit `google_liste.mjs` auswerten).

## Werkzeuge

- `google_liste.mjs <angebote.txt> <ausgabe.json>`: liest die Produkte der Google-Liste nur lesend und nennt je Angebot
  das Bild, das Google bekommt. `angebote.txt` hat je Zeile `code|angebot` aus dem Workflow-Ergebnis.
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

- Google-Liste der Bildprobleme: abgearbeitet, siehe oben; die 11 nicht angefassten Bilder und die Funde liegen beim Besitzer.
- Nicht angefasst, weil mehr als Text das Problem ist: Tech-Hero-Geschenkbox (Bild zeigt Geräte einer fremden Marke),
  Bambus-Aufbewahrungssystem (Bilder einer fremden Marke «Kitchen Edge», Rechte unklar), Herrenuhr «Executive»
  (Marke «TOMI» auf dem Zifferblatt), Edelstahl-Trinkflasche (Variantenbilder nur 209 und 290 Pixel breit, bessere Quelle nötig).
- In den Galerien der anderen Produkte stehen weiter Bilder mit Text, die nicht Hauptbild sind (Massagegerät und
  Augenmassagegerät: erledigt, siehe oben).
- Die «zu kleinen» Modebilder (500 bis 800 Pixel) sind für Google gross genug (Mindestmass 250 Pixel bei Kleidung);
  hochrechnen nur, wenn Google sie meldet.
