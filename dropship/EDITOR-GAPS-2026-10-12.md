# Selbst-gestalten-Editor: was er kann, was fehlt (gemessen 12.10.2026)

Messung: Browser-Test im Storefront bei 390 px (`tools/browser.mjs`), Quellcode der Live-Datei `lspod-designer-v2.js`
(identisch bis auf Zeichenschreibweise zum Repo-Stand `pod/designer-cdn-v2.js`).

## Vorhanden (gemessen)
- Text hinzufügen, Textfeld, Schrift (5: Modern Sans, Elegant Serif, Handschrift, Bold Display, Mono)
- Farbe: 8 feste Felder + eigener Farbwähler (nativ `input type=color`)
- Grösse: Schieber 0,15–3 + Presets Klein / Mittel / Gross / Füllend
- Element ziehen, Ecke = skalieren und drehen (Gesten), Duplizieren, Vorne / Hinten (Seite), Löschen (×)
- Bild: Zuschnitt, Spiegeln, Helligkeit/Kontrast/Sättigung/Graustufen
- Sticker-Bibliothek, Bild-Upload (Cloudinary), Druck-Vorschau, Druckdatei für den Druckauftrag

## Neu (12.10.2026, `pod/lspod-designer-v3.js`)
- **Drehregler** (-180°…+180°), neben dem Grössenregler. Wirkt auf die Vorschau UND die Druckdatei (`rotate` im Canvas,
  gemessen: Vorschau 30° = Druckdatei 30°). Ein Ecken-Dreh wird auf dem Regler mitgeführt.

## Fehlt gegenüber einem vollen Druck-Editor (noch nicht gebaut)
1. **Textkontur** (Umriss in Farbe): Canvas `strokeText` vor `fillText`; in der Vorschau denselben Pfad.
2. **Buchstabenabstand** und Zeilenabstand: Canvas `letterSpacing`; für mehrzeiligen Text fehlt der Zeilenumbruch.
3. **Rückgängig / Wiederholen**: kein Verlauf. Braucht Snapshots der Ebenen bei jeder Änderung.
4. **Ebenen-Reihenfolge** innerhalb einer Seite (nur Vorne/Hinten der ganzen Seite).
5. **Deckkraft** je Element.
6. **Fett/Kursiv** als Schalter (die 5 Schriften haben das nicht einzeln).
7. **Zahleneingabe** für Position und Drehung (nur Regler und Gesten).

## Nicht im Editor, sondern im Theme (nicht änderbar aus dem Assistenten)
- **Cookie-Banner überdeckt den Editor auf dem Handy** (gemessen: «Nur notwendige / Alle akzeptieren» liegt über dem
  Drehregler und den Grössen-Presets). Das ist ein Theme-/App-Thema: Betreiber oder CLI-Token.

## Umstellung
- 34 Produkte laden `lspod-designer-v3.js?v=1791790037` (Log: `dropship/_lspod_v3_switch.tsv`).
- Rückweg: alte Adresse `lspod-designer-v2.js?v=1785940614` wieder einsetzen (Datei liegt weiter auf dem CDN).
- QA: `pod_editor_qa.mjs` 29 Editor-Produkte, 0 Befunde.
