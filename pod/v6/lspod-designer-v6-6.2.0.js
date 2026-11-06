/*!
 * LuxeStyle «Selbst gestalten»: Editor v6.2.0 mit echter Druckfläche (Entwurf vom 06.11.2026, NOCH NICHT LIVE; 6.1.0 bleibt unverändert als Rücknahme).
 *
 * NEU in 6.2.0 (WP3 und WP4 des Bauplans):
 *   - Ansicht «Auf dem Produkt» neben «Druckfläche»: Canvas im Browser aus Hintergrundfarbe der Variante, Design (auf die Druckfläche beschnitten) und Vorlagenbild
 *     (Schatten, Falten). Der Platzierungs-Reiter wechselt die Vorlage. Adapter für Tasse (Zylinder) und Poster/Leinwand (Papier mit Schatten). Stickerei und Rundum-Druck
 *     zeigen einen ehrlichen Hinweis statt einer Vorschau. Kontrast-Hinweis bei Design und Stoff mit ähnlicher Helligkeit. Export als JPEG 800 × 800 (Eigenschaft «_vorschau»).
 *     Daten dazu: <div data-vorschau-url="…"> oder <script type="application/json" id="lspod-vorschau"> (Schema 1, gebaut von werkzeug/vorschau_daten_bauen.mjs);
 *     ohne Daten, bei fehlendem Bild oder CORS-Fehler bleibt es bei der Ansicht «Druckfläche» (ohne Fehler).
 *   - Qualitätstor: harter Stopp unter der Mindest-dpi der Karte, Warnung darüber bis 150 dpi, Eigenschaft _pod_karte.qd (kleinste effektive dpi der Fotos).
 *   - Entwurf automatisch speichern und wiederherstellen (localStorage, jeder Zugriff in try/catch: ein gesperrter Speicher bricht nichts).
 *

 * Aufbau auf dem live wirksamen Editor v5 (pod/live/lspod-designer-v5-safe.js): Ebenen, Text, Sticker, Fotos, Zuschneiden/Filter,
 * Rückgängig/Wiederholen, Tastatur, Fehlerabsicherung beim Erzeugen der Druckdatei und der Cloudinary-Upload sind übernommen.
 * Neu ist die MODELLKARTE (Schema 1, siehe dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs):
 *   - je Platzierung (Vorne, Hinten, Ärmel, Etikett, Schnittteile …) die Vorlage mit hervorgehobener Druckfläche im Seitenverhältnis der Fläche,
 *   - Druckdatei in der ECHTEN Pixelgrösse des Printfiles (Obergrenze siehe MAX_PIXEL), dpi-Anzeige, Warnung unter dem Mindest-dpi,
 *   - Platzierungen, die sich ausschliessen (conflicting_placements), Aufpreise je Platzierung in CHF, Hinweise (Stickerei usw.),
 *   - alle Masse in cm/mm.
 *
 * EINBINDUNG (eigene Kennung, v5 ignoriert sie: v5 sucht nur die Klasse «lspod-designer»):
 *   <div class="lspod-designer-v6" data-variant="<Shopify-Variante>">
 *     <script type="application/json" id="lspod-karte">{ …Modellkarte… }</script>
 *   </div>
 *   <script src="…/lspod-designer-v6.js" defer></script>
 * Die Karte kann auch als data-karte="…JSON…" oder per data-karte-url="…" kommen. Ohne gültige Karte arbeitet der Editor im
 * v5-Modus (Rückfall): Vorne/Hinten aus data-img-front / data-img-back, Leinwand data-ref × data-ratio, gleiche Warenkorb-Eigenschaften wie v5.
 * Weitere Attribute (alle optional): data-img-map (Variante → Bild, nur v5-Modus), data-max-px (Obergrenze der Druckdatei in Pixeln; 0 = nur die
 * absolute Grenze von 25 Mpx), data-max-bytes (Obergrenze der Dateigrösse vor dem Upload, Vorgabe 9 MB, 0 = keine Prüfung), data-upload-timeout (ms).
 *
 * Gelesene Felder der Karte: printfulProductId, klasse, minDpi, platzierungen[{id, dateiTyp, titelDe, titelEn, art, technik, printfile, vorlage,
 * geometrien, aufpreisUsd, aufpreisChf, kollidiertMit, kollidiertMitImEditor}], druckdateien, druckdateiGruppen, varianten[{printfulVariantId,
 * druckdateiGruppe}], hinweise[{code, art, text, kundentext, kundentextEn}], shop.varianten{<Shopify-Id>: <Printful-Variante>}.
 * KARTENBÜNDEL (ein Shop-Produkt aus mehreren Printful-Modellen, z. B. T-Shirt = 71 + 456 + 586): { schema: 1, modelle: { "<Printful-Produkt>": <Modellkarte>, … },
 * shop: { varianten: { "<Shopify-Id>": { pv: <Printful-Variante>, m: <Printful-Produkt> } } } }. Der Editor wählt die Karte nach der gewählten Variante;
 * eine Variante ohne Eintrag sperrt den Kauf (es wird nie still die Standardgeometrie genommen).
 */
(function () {
  'use strict';
  if (window.__lspodDesignerV6Loaded) return;
  window.__lspodDesignerV6Loaded = true;

  var VERSION = '6.2.0';

  // ── Konfiguration (Cloudinary und Sticker unverändert aus v5) ───────────────────────────────────
  var CLOUD_NAME = 'dwyi6kkrl';
  var UPLOAD_PRESET = 'pigto8ba';
  var CLOUDINARY_AKTIV = !!(CLOUD_NAME && UPLOAD_PRESET);
  var STICKER_BASIS = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/stk-';
  var STICKER_INDEX = STICKER_BASIS + 'index.json';
  var STICKER_RUECKFALL = ['heart-red', 'star-gold', 'smiley-yellow', 'daisy-flower', 'cat-cute', 'dog-cute', 'butterfly', 'rainbow', 'lightning',
    'crown', 'coffee', 'peace', 'moon-stars', 'mushroom-retro', 'cherry', 'flame', 'word-love', 'word-vibes'];
  var LOCALE = ((window.Shopify && Shopify.locale) || document.documentElement.lang || 'de').toLowerCase();
  var EN = LOCALE.indexOf('en') === 0;
  var CART_ADD_URL = (window.Shopify && Shopify.routes && Shopify.routes.cart_add_url) || '/cart/add.js';
  var CART_URL = (window.Shopify && Shopify.routes && Shopify.routes.cart_url) || '/cart';

  // ── Konfiguration neu in v6 ─────────────────────────────────────────────────────────────────────
  /** Grösste Druckdatei in Pixeln. Darüber wird gleichmässig verkleinert (Seitenverhältnis bleibt). Grund: Mobile Safari kann Leinwände nur bis
   *  16 777 216 Pixel (QUELLE: allgemein bekannte iOS-Grenze, hier nicht auf einem iPhone gemessen); Printful skaliert zu kleine Dateien selbst hoch.
   *  Alle Modelle bis 16,7 Mpx (T-Shirt, Tasse, Kappe, Hülle …) werden in der echten Pixelgrösse erzeugt. */
  var MAX_PIXEL = 16777216;
  /** Absolute Grenze, auch mit data-max-px="0" (QUELLE: Cloudinary-Preisvergleich, Gegenleser 05.11.: höchstens 25 Megapixel bei Free und Plus, 50 bei Advanced; nicht am Konto gemessen). */
  var MAX_PIXEL_ABS = 25000000;
  /** Grösste Druckdatei in Bytes vor dem Upload (QUELLE: Cloudinary Free 10 MB, Plus 20 MB; Konto dwyi6kkrl ungemessen). Darüber wird die Datei verkleinert und neu gerechnet. */
  var MAX_BYTES = 9 * 1024 * 1024;
  var UPLOAD_ZEIT_MS = 90000;      // Zeitlimit eines Uploads
  /** Längster Wert einer Warenkorb-Eigenschaft (QUELLE: zwei Dritt-Anleitungen zu Shopify-Line-Item-Properties nennen 255 Zeichen; nicht an Shopify gemessen). */
  var POD_KARTE_MAX = 255;
  var MIN_DPI_VORGABE = 100;       // gilt, wenn die Karte kein minDpi nennt
  var LEGACY_REF = 1200;           // v5: Breite der Druckdatei in Pixeln
  var MAX_ZURUECK = 60;            // Schritte Rückgängig
  var VARIANTEN_TAKT_MS = 500;     // wie v5

  // ── Konfiguration neu in 6.2.0 ──────────────────────────────────────────────────────────────────
  var VORSCHAU_PX = 800;                          // Export der Vorschau: JPEG 800 × 800
  var VORSCHAU_QUALITAET = [0.85, 0.72, 0.6, 0.48];   // JPEG-Qualitäten, die erste mit höchstens VORSCHAU_MAX_BYTES gilt
  var VORSCHAU_MAX_BYTES = 80 * 1024;
  var VORSCHAU_ZEIT_MS = 20000;                   // Zeitlimit für Bilder der Vorschau (sonst Rückfall auf die Druckfläche)
  var DPI_GUT = 150;                              // ab hier kein Hinweis mehr; zwischen dem Mindestwert der Karte und 150 gibt es eine Warnung
  var KONTRAST_SCHWELLE = 1.8;                    // Kontrastverhältnis (WCAG-Formel) Design gegen Stoff, darunter gilt ein Pixel als schlecht lesbar
  var KONTRAST_ANTEIL = 0.6;                      // so viel der Design-Fläche (alphagewichtet) muss schlecht lesbar sein, damit der Hinweis erscheint
  var ENTWURF_SCHLUESSEL = 'lspod6:entwurf:';
  var ENTWURF_MAX_ALTER_MS = 7 * 24 * 3600 * 1000;
  var ENTWURF_MAX_ZEICHEN = 200000;               // grösser wird nicht gespeichert (Speicherplatz des Browsers ist knapp)

  // ── Schriften und Farben (wie v5) ───────────────────────────────────────────────────────────────
  var SCHRIFT_NAMEN = EN ? ['Modern Sans', 'Elegant Serif', 'Handwriting', 'Bold Display', 'Mono']
    : ['Modern Sans', 'Elegant Serif', 'Handschrift', 'Bold Display', 'Mono'];
  var SCHRIFT_CSS = ["'Helvetica Neue',Arial,sans-serif", "Georgia,'Times New Roman',serif", "'Brush Script MT','Segoe Script',cursive",
    "'Arial Black','Helvetica Neue',sans-serif", "'Courier New',monospace"];
  var SCHRIFT_CANVAS = ['bold {S}px Arial,Helvetica,sans-serif', "bold {S}px Georgia,'Times New Roman',serif", "{S}px 'Brush Script MT','Segoe Script',cursive",
    "900 {S}px 'Arial Black',Arial,sans-serif", "bold {S}px 'Courier New',monospace"];
  var SCHRIFTEN = SCHRIFT_CSS.map(function (css, i) { return { name: SCHRIFT_NAMEN[i], css: css, canvas: SCHRIFT_CANVAS[i] }; });
  var FARBEN = ['#111111', '#ffffff', '#c1922f', '#b3122b', '#1e4fd6', '#1c8a4b', '#e84393', '#000080'];
  var EMOJIS = ['❤\uFE0F', '⭐', '\u{1F600}', '\u{1F60D}', '\u{1F60E}', '\u{1F525}', '✨', '\u{1F389}', '\u{1F451}', '\u{1F308}', '\u{1F338}',
    '\u{1F31F}', '\u{1F48E}', '☀\uFE0F', '\u{1F30A}', '\u{1F340}', '\u{1F98B}', '\u{1F431}', '\u{1F436}', '\u{1F355}', '☕', '⚡', '\u{1F3B5}',
    '\u{1F4AA}', '\u{1F1E8}\u{1F1ED}', '\u{1F3D4}\uFE0F', '\u{1F9C0}', '\u{1F36B}'];

  // ── Texte ───────────────────────────────────────────────────────────────────────────────────────
  var TEXTE = {
    de: {
      head: 'Jetzt selbst gestalten', ph: 'Dein Text …', addText: '➕ Text', addImg: '\u{1F5BC}\uFE0F Bild', addSticker: '⭐ Sticker',
      stickers: 'Sticker wählen', front: 'Vorne', back: 'Hinten',
      tapHint: 'Tipp: ziehen zum Verschieben \xB7 Ecke = skalieren & drehen \xB7 Bild antippen → zuschneiden, spiegeln & filtern',
      uploading: 'Wird hochgeladen …', upErr: 'Upload-Fehler: ', tooBig: 'Datei zu gross (max 10 MB).',
      cta: '\u{1F6D2} Mit meinem Design in den Warenkorb', empty: 'Füge zuerst Text, ein Bild oder einen Sticker hinzu.',
      baking: 'Druckdatei wird erstellt …', adding: 'Wird hinzugefügt …', added: '✓ Im Warenkorb! Weiterleitung …',
      addErr: 'Konnte nicht hinzufügen: ', printErr: 'Die Druckdatei konnte nicht erstellt werden. Bitte erneut versuchen.',
      stillUp: 'Bild lädt noch hoch, bitte kurz warten …', noVar: 'Variante nicht gefunden. Bitte oben Grösse oder Farbe wählen.',
      pSide: ['Vorne', 'Hinten'], pPrintFile: '\u{1F5BC}\uFE0F Druckdatei', pDesign: '\u{1F3A8} Design',
      layerText: 'Text', layerImage: 'Bild', layerSticker: 'Sticker', layers: 'Ebenen', noLayers: 'Noch keine Ebenen',
      tabsLabel: 'Druckfläche wählen', extra: 'Aufpreis', blocked: '«{a}» geht nicht zusammen mit «{b}». Entferne zuerst die Ebenen auf «{b}».',
      lockTitle: 'Nicht möglich zusammen mit: {b}', areaInfo: 'Druckfläche {w} \xD7 {h} cm', fileInfo: 'Druckdatei {w} \xD7 {h} px \xB7 {dpi} dpi',
      fileInfoNoDpi: 'Druckdatei {w} \xD7 {h} px', capNote: 'Die Druckdatei wird auf {w} \xD7 {h} px begrenzt, damit dein Gerät sie erstellen kann (ca. {dpi} dpi).',
      viewWhole: 'Ganze Vorlage zeigen', viewArea: 'Auf Druckfläche zoomen', outsideNote: 'Was ausserhalb der Druckfläche liegt, wird nicht gedruckt.',
      dpiLine: 'Bildauflösung auf dem Produkt: ca. {n} dpi (mindestens {min} dpi nötig)',
      dpiLow: '⚠\uFE0F Bildauflösung zu gering: ca. {n} dpi, nötig sind mindestens {min} dpi. Skaliere das Bild kleiner oder nimm ein grösseres Bild.',
      legacyLow: '⚠\uFE0F Bild evtl. zu klein für scharfen Druck. Skaliere es kleiner oder nimm ein grösseres Bild.',
      embroPhoto: '⚠\uFE0F Stickerei: Fotos werden nicht sauber gestickt. Nimm ein einfaches Motiv mit wenigen Farben.',
      panelHint: 'Rundum-Druck: Jedes Teil hat seine eigene Fläche. Gestalte alle Teile, die du bedrucken willst.',
      fX: 'X (cm)', fY: 'Y (cm)', fWidth: 'Breite (cm)', fFont: 'Schrifthöhe (mm)', fXp: 'X %', fYp: 'Y %', fSize: 'Grösse %', fRot: 'Drehung \xB0', fOp: 'Deckkraft %',
      exact: 'Genaue Werte', centerH: '⇔ Mitte horizontal', centerV: '⇕ Mitte vertikal',
      sumHead: 'Aufpreise für deine Platzierungen', sumTotal: 'Aufpreis gesamt: CHF {x}', sumNote: 'Der Aufpreis gilt je Platzierung mit Motiv.',
      previewBtn: '\u{1F441}\uFE0F Druck-Vorschau anzeigen', previewHead: '\u{1F441}\uFE0F Genau das wird gedruckt',
      previewSub: 'Karos = transparent (wird nicht gedruckt). Nur dein Motiv kommt aufs Produkt.', previewInfo: 'Druckdatei {w} \xD7 {h} px', close: 'Schliessen',
      undo: '↶ Rückgängig', redo: '↷ Wiederholen', undoT: 'Rückgängig (Strg+Z)', redoT: 'Wiederholen (Strg+Y)', up: 'Nach oben', down: 'Nach unten',
      sizeL: 'Grösse', rotL: 'Drehen', spacing: 'Abstand', outline: 'Kontur', lines: 'Zeilen', printSize: 'Druckgrösse:', small: 'Klein', medium: 'Mittel', large: 'Gross', fill: 'Füllend',
      dup: '⧉ Duplizieren', toFront: '↑ Vorne', toBack: '↓ Hinten', crop: '✂\uFE0F Zuschneiden', flip: '↔\uFE0F Spiegeln', cutout: '\u{1FA84} Freistellen',
      frame: '\u{1F5BC}\uFE0F Rahmen', bw: '⚫ S/W', reset: '↺ Zurücksetzen', bright: 'Helligkeit', contrast: 'Kontrast', saturation: 'Sättigung', sharp: 'Schärfe',
      bold: 'Fett', italic: 'Kursiv', alignL: 'Links', alignC: 'Mitte', alignR: 'Rechts', alignLT: 'Linksbündig', alignCT: 'Zentriert', alignRT: 'Rechtsbündig', customColor: 'Eigene Farbe',
      cropHead: '✂\uFE0F Bild zuschneiden: Rahmen ziehen', apply: '✓ Übernehmen', cancel: '✕ Abbrechen', fontL: 'Schrift', colorL: 'Farbe', statusL: 'Status',
      noMap: 'Diese Ausführung ist im Editor noch nicht eingerichtet. Bitte wähle oben eine andere Grösse oder Farbe.',
      orphan: 'Bei dieser Ausführung gibt es «{a}» nicht. Entferne dein Motiv dort oder wähle oben eine andere Ausführung.',
      notPossible: 'hier nicht möglich', orphanTitle: 'Bei dieser Ausführung nicht möglich',
      tooHeavy: 'Die Druckdatei ist zu gross für den Upload. Nimm ein kleineres Foto oder weniger Motive.',
      shrunk: 'Die Druckdatei wurde auf {w} \xD7 {h} px verkleinert, damit der Upload klappt.',
      upTimeout: 'Der Upload dauert zu lange. Bitte prüfe deine Verbindung und versuche es erneut.',
      varChanged: 'Du hast die Variante gewechselt. Bitte tippe noch einmal auf «Mit meinem Design in den Warenkorb».',
      tooMany: 'Zu viele Druckflächen auf einmal. Bestelle dein Design bitte in zwei Teilen.',
      sheetInfo: 'Druckbogen {w} \xD7 {h} cm',
      sichtLabel: 'Ansicht', sichtDruck: 'Druckfläche', sichtProdukt: 'Auf dem Produkt',
      pvAlt: 'Vorschau deines Motivs auf dem Produkt', pvLaedt: 'Vorschau wird erstellt …',
      pvNote: 'Die Vorschau ist eine Annäherung: Farben und Falten können im Druck leicht abweichen.',
      pvNichtDa: 'Die Produktvorschau ist für diese Ausführung gerade nicht verfügbar. Du kannst trotzdem gestalten: Die Ansicht «Druckfläche» zeigt dein Motiv so, wie es gedruckt wird.',
      pvStickerei: 'Für Stickerei zeigen wir keine Produktvorschau: Gestickt sieht ein Motiv anders aus als gedruckt (Fäden statt Farbe, keine Verläufe). Prüfe dein Motiv in der Ansicht «Druckfläche».',
      pvRundum: 'Für Rundum-Druck zeigen wir keine Produktvorschau: Das Motiv läuft über Schnittteile und Nähte. Prüfe jedes Teil in der Ansicht «Druckfläche».',
      pvKeine: 'Für dieses Produkt zeigen wir keine Produktvorschau. Prüfe dein Motiv in der Ansicht «Druckfläche».',
      kontrastDunkel: '⚠\uFE0F Dein Motiv ist dunkel und der Stoff ebenfalls: Im Druck wird man es kaum sehen. Wähle hellere Motivfarben oder eine hellere Stofffarbe.',
      kontrastHell: '⚠\uFE0F Dein Motiv ist hell und der Stoff ebenfalls: Im Druck wird man es kaum sehen. Wähle dunklere Motivfarben oder eine dunklere Stofffarbe.',
      dpiMid: 'Für ein scharfes Ergebnis sind {gut} dpi ideal.',
      qSperre: 'Kauf gesperrt: «{a}» hat nur ca. {n} dpi, nötig sind mindestens {min} dpi. Skaliere das Foto kleiner, nimm ein grösseres Foto oder entferne es.',
      draftBack: 'Dein Entwurf wurde wiederhergestellt.',
      draftLost: 'Fotos, die noch nicht hochgeladen waren, konnten nicht wiederhergestellt werden. Bitte füge sie noch einmal hinzu.',
    },
    en: {
      head: 'Design it yourself', ph: 'Your text …', addText: '➕ Text', addImg: '\u{1F5BC}\uFE0F Image', addSticker: '⭐ Sticker',
      stickers: 'Pick a sticker', front: 'Front', back: 'Back',
      tapHint: 'Tip: drag to move \xB7 corner = resize & rotate \xB7 tap an image → crop, flip & filter',
      uploading: 'Uploading …', upErr: 'Upload error: ', tooBig: 'File too large (max 10 MB).',
      cta: '\u{1F6D2} Add my design to cart', empty: 'Add text, an image or a sticker first.',
      baking: 'Preparing print file …', adding: 'Adding …', added: '✓ Added! Redirecting …',
      addErr: 'Could not add: ', printErr: 'Print file could not be prepared. Please try again.',
      stillUp: 'Image still uploading, please wait …', noVar: 'Please select a size/color above first.',
      pSide: ['Front', 'Back'], pPrintFile: '\u{1F5BC}\uFE0F Print file', pDesign: '\u{1F3A8} Design',
      layerText: 'Text', layerImage: 'Image', layerSticker: 'Sticker', layers: 'Layers', noLayers: 'No layers yet',
      tabsLabel: 'Choose print area', extra: 'Surcharge', blocked: '"{a}" cannot be combined with "{b}". Remove the layers on "{b}" first.',
      lockTitle: 'Not possible together with: {b}', areaInfo: 'Print area {w} \xD7 {h} cm', fileInfo: 'Print file {w} \xD7 {h} px \xB7 {dpi} dpi',
      fileInfoNoDpi: 'Print file {w} \xD7 {h} px', capNote: 'The print file is limited to {w} \xD7 {h} px so that your device can create it (about {dpi} dpi).',
      viewWhole: 'Show whole template', viewArea: 'Zoom to print area', outsideNote: 'Anything outside the print area will not be printed.',
      dpiLine: 'Image resolution on the product: about {n} dpi (at least {min} dpi needed)',
      dpiLow: '⚠\uFE0F Image resolution too low: about {n} dpi, at least {min} dpi needed. Scale the image down or use a larger image.',
      legacyLow: '⚠\uFE0F Image may be too small for a sharp print. Scale it down or use a larger image.',
      embroPhoto: '⚠\uFE0F Embroidery: photos do not stitch cleanly. Use a simple design with few colors.',
      panelHint: 'All-over print: every part has its own area. Design every part you want printed.',
      fX: 'X (cm)', fY: 'Y (cm)', fWidth: 'Width (cm)', fFont: 'Letter height (mm)', fXp: 'X %', fYp: 'Y %', fSize: 'Size %', fRot: 'Turn \xB0', fOp: 'Opacity %',
      exact: 'Exact values', centerH: '⇔ Centre horizontally', centerV: '⇕ Centre vertically',
      sumHead: 'Surcharges for your print areas', sumTotal: 'Surcharge total: CHF {x}', sumNote: 'The surcharge applies per print area with a design.',
      previewBtn: '\u{1F441}\uFE0F Preview print file', previewHead: '\u{1F441}\uFE0F Exactly this gets printed',
      previewSub: 'Checkered = transparent (not printed). Only your design is printed onto the product.', previewInfo: 'Print file {w} \xD7 {h} px', close: 'Close',
      undo: '↶ Undo', redo: '↷ Redo', undoT: 'Undo (Ctrl+Z)', redoT: 'Redo (Ctrl+Y)', up: 'Move up', down: 'Move down',
      sizeL: 'Size', rotL: 'Rotate', spacing: 'Spacing', outline: 'Outline', lines: 'Lines', printSize: 'Print size:', small: 'Small', medium: 'Medium', large: 'Large', fill: 'Fill',
      dup: '⧉ Duplicate', toFront: '↑ Front', toBack: '↓ Back', crop: '✂\uFE0F Crop', flip: '↔\uFE0F Flip', cutout: '\u{1FA84} Cut out',
      frame: '\u{1F5BC}\uFE0F Frame', bw: '⚫ B/W', reset: '↺ Reset', bright: 'Brightness', contrast: 'Contrast', saturation: 'Saturation', sharp: 'Sharpness',
      bold: 'Bold', italic: 'Italic', alignL: 'Left', alignC: 'Center', alignR: 'Right', alignLT: 'Align left', alignCT: 'Center', alignRT: 'Align right', customColor: 'Custom color',
      cropHead: '✂\uFE0F Crop image: drag the box', apply: '✓ Apply', cancel: '✕ Cancel', fontL: 'Font', colorL: 'Color', statusL: 'Status',
      noMap: 'This option is not set up in the editor yet. Please pick another size or color above.',
      orphan: '"{a}" does not exist for this option. Remove your design there or pick another option above.',
      notPossible: 'not available here', orphanTitle: 'Not available for this option',
      tooHeavy: 'The print file is too large to upload. Use a smaller photo or fewer designs.',
      shrunk: 'The print file was reduced to {w} \xD7 {h} px so that the upload works.',
      upTimeout: 'The upload takes too long. Please check your connection and try again.',
      varChanged: 'You changed the option. Please tap "Add my design to cart" again.',
      tooMany: 'Too many print areas at once. Please order your design in two parts.',
      sheetInfo: 'Print sheet {w} \xD7 {h} cm',
      sichtLabel: 'View', sichtDruck: 'Print area', sichtProdukt: 'On the product',
      pvAlt: 'Preview of your design on the product', pvLaedt: 'Creating preview …',
      pvNote: 'The preview is an approximation: colours and folds can differ slightly in print.',
      pvNichtDa: 'The product preview is not available for this option right now. You can still design: the "Print area" view shows your design as it will be printed.',
      pvStickerei: 'We do not show a product preview for embroidery: a stitched design looks different from a printed one (thread instead of ink, no gradients). Check your design in the "Print area" view.',
      pvRundum: 'We do not show a product preview for all-over print: the design runs across panels and seams. Check every panel in the "Print area" view.',
      pvKeine: 'We do not show a product preview for this product. Check your design in the "Print area" view.',
      kontrastDunkel: '⚠\uFE0F Your design is dark and so is the fabric: it will hardly be visible in print. Choose lighter design colours or a lighter fabric colour.',
      kontrastHell: '⚠\uFE0F Your design is light and so is the fabric: it will hardly be visible in print. Choose darker design colours or a darker fabric colour.',
      dpiMid: 'For a sharp result {gut} dpi is ideal.',
      qSperre: 'Purchase blocked: "{a}" has only about {n} dpi, at least {min} dpi are needed. Scale the photo down, use a larger photo or remove it.',
      draftBack: 'Your draft was restored.',
      draftLost: 'Photos that had not finished uploading could not be restored. Please add them again.',
    },
  };
  var T = EN ? TEXTE.en : TEXTE.de;
  /** Platzhalter {a} {b} {w} … ersetzen. */
  function fmt(text, werte) {
    return String(text).replace(/\{(\w+)\}/g, function (_, k) { return werte && werte[k] != null ? werte[k] : ''; });
  }

  /** Kundentexte zu den Hinweis-Codes der Karte. Die Karte darf eigene Texte mitbringen (kundentext / kundentextEn). Nur Hinweise
   *  mit art «einschraenkung» oder ein Code dieser Tabelle werden angezeigt; interne Texte der Karte («Erfahrungswert», Verweise auf Messdateien) nie. */
  var HINWEIS_TEXTE = {
    stickerei: { de: 'Stickerei: Dein Motiv wird gestickt. Nimm ein einfaches Motiv mit wenigen Farben. Fotos, Farbverläufe und sehr feine Linien lassen sich nicht sticken.',
      en: 'Embroidery: your design is stitched. Use a simple design with few colors. Photos, gradients and very fine lines cannot be stitched.' },
    gestrickt: { de: 'Gestrickt: Das Motiv wird als Maschenraster umgesetzt. Feine Details und Fotos gehen verloren.',
      en: 'Knitted: the design is made as a stitch grid. Fine details and photos are lost.' },
    allover_einzeldatei: { de: 'Rundum-Druck: Dein Motiv läuft über das ganze Teil und über die Nähte.',
      en: 'All-over print: your design runs across the whole piece and over the seams.' },
    kappe: { de: 'Kappe: Die Fläche ist klein und gewölbt. Halte das Motiv klein und ohne feine Details.',
      en: 'Cap: the area is small and curved. Keep the design small and free of fine details.' },
    tasche: { de: 'Tasche: Die Druckfläche endet vor Nähten und Henkeln. Setze das Motiv nicht an den Rand.',
      en: 'Bag: the print area ends before seams and handles. Do not place the design at the edge.' },
    rundumdruck: { de: 'Das Motiv läuft rund um das Gefäss. Halte den Bereich am Henkel frei.',
      en: 'The design wraps around the vessel. Keep the area near the handle free.' },
  };

  // ── Zahlen, Masse, Preis (reine Funktionen; ein Test vergleicht sie mit schweizer_masse.mjs und preisformel.mjs) ──
  /** Komma als Dezimalzeichen, höchstens `dez` Stellen, ohne überflüssige Nullen. Gleich schweizer_masse.schweizerZahl. */
  function schweizerZahl(n, dez) {
    if (dez === undefined) dez = 1;
    if (!isFinite(n)) return String(n);
    var f = Math.pow(10, dez);
    var r = Math.round((n + Number.EPSILON * Math.sign(n)) * f) / f;
    if (r === 0) r = 0;
    return String(r).replace('.', ',');
  }
  /** Zahl für die Oberfläche: Komma in der deutschen, Punkt in der englischen Ausgabe (Eingabefelder nehmen immer den Punkt). */
  function zahlAnzeige(n, dez) {
    var t = schweizerZahl(n, dez);
    return EN ? t.replace(',', '.') : t;
  }
  /** Geldbetrag mit Punkt, immer zwei Stellen («6.10»), wie die Preise im Shop. */
  function chfText(x) { return Number(x).toFixed(2); }

  // Preisformel (Setzungen aus preisformel.mjs REGEL: kurs 0.90, MWST 8.1 %, Zahlungsgebühr 3.4 %); gleich preisformel.aufpreisChf
  var PREIS_KURS = 0.90;
  var PREIS_MWST = 0.081;
  var PREIS_GEBUEHR = 0.034;
  var EPS = 1e-9;
  /** Aufpreis in CHF, aufgerundet auf 10 Rappen (1:1 Printful-Aufpreis in USD, mit Umrechnung, MWST und Zahlungsgebühr). */
  function aufpreisChf(usd) {
    var u = Number(usd);
    if (!isFinite(u) || u < 0) return null;
    var kostenRp = Math.round(u * 100 * PREIS_KURS + EPS);
    var aufgerechnet = kostenRp / (1 / (1 + PREIS_MWST) - PREIS_GEBUEHR);
    return Math.ceil(aufgerechnet / 10 - EPS) / 10;
  }
  /** Aufpreis einer Platzierung in CHF: der Wert der Karte (aufpreisChf) hat Vorrang, sonst aus aufpreisUsd; 0 = im Preis enthalten. */
  function platzierungAufpreisChf(p) {
    if (typeof p.aufpreisChf === 'number' && isFinite(p.aufpreisChf) && p.aufpreisChf >= 0) return p.aufpreisChf;
    if (typeof p.aufpreisUsd === 'number' && p.aufpreisUsd > 0) return aufpreisChf(p.aufpreisUsd) || 0;
    return 0;
  }

  /** Physische Grösse der Druckdatei in cm aus Pixeln und dpi; null ohne belastbare dpi (Strick: 1 Pixel = 1 Masche). */
  function dateiMasse(pf) {
    if (!pf || !(pf.dpi >= 10)) return null;
    return { breite: pf.breitePx / pf.dpi * 2.54, hoehe: pf.hoehePx / pf.dpi * 2.54 };
  }

  /** Grösse der Druckdatei in Pixeln: die echte Printfile-Grösse, bei mehr als maxPx Pixeln gleichmässig verkleinert. maxPx 0 = keine Grenze. */
  function renderGroesse(pf, maxPx) {
    var w = pf.breitePx, h = pf.hoehePx, k = 1;
    if (maxPx > 0 && w * h > maxPx) {
      k = Math.sqrt(maxPx / (w * h));
      w = Math.max(1, Math.floor(w * k));
      h = Math.max(1, Math.floor(h * k));
      k = w / pf.breitePx;
    }
    return { w: w, h: h, k: k };
  }

  /** Sichtfenster der Bühne in Vorlagen-Koordinaten. 'flaeche': Druckfläche mit 10 % Rand als Zusammenhang (nie ausserhalb von Vorlage und Fläche);
   *  'vorlage': die ganze Vorlage. */
  function sichtfenster(vl, ansicht) {
    var tw = vl.vorlageBreite, th = vl.vorlageHoehe;
    var ax = vl.flaecheLinks, ay = vl.flaecheOben, aw = vl.flaecheBreite, ah = vl.flaecheHoehe;
    var bx0 = Math.min(0, ax), by0 = Math.min(0, ay), bx1 = Math.max(tw, ax + aw), by1 = Math.max(th, ay + ah);
    if (ansicht === 'vorlage') return { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
    var m = Math.max(aw, ah) * 0.1;
    var x0 = Math.max(ax - m, bx0), y0 = Math.max(ay - m, by0), x1 = Math.min(ax + aw + m, bx1), y1 = Math.min(ay + ah + m, by1);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  var PCT = function (x) { return (Math.round(x * 1e5) / 1e3) + '%'; };

  // ── Karte prüfen und lesen ──────────────────────────────────────────────────────────────────────
  function istZahl(x) { return typeof x === 'number' && isFinite(x); }

  /** Eine Platzierung ist zeichenbar, wenn Druckdatei und Vorlage plausible Zahlen tragen. */
  function platzierungOk(p) {
    if (!p || typeof p.id !== 'string' || !p.id) return false;
    var pf = p.printfile, vl = p.vorlage;
    if (!pf || !(pf.breitePx > 0) || !(pf.hoehePx > 0)) return false;
    if (!vl || !(vl.vorlageBreite > 0) || !(vl.vorlageHoehe > 0) || !(vl.flaecheBreite > 0) || !(vl.flaecheHoehe > 0)) return false;
    return istZahl(vl.flaecheLinks) && istZahl(vl.flaecheOben);
  }

  /** Kartenbündel prüfen: { schema:1, modelle:{ "<Printful-Produkt>": Modellkarte }, shop:{ varianten:{ "<Shopify-Id>": {pv, m} } } }. Ein unbrauchbares Modell
   *  macht das ganze Bündel unbrauchbar (der Editor fällt dann in den v5-Modus zurück, wie es heute auf der Seite ist). */
  function buendelNormalisieren(roh) {
    if (roh.schema !== undefined && roh.schema !== 1) return { fehler: 'Kartenschema ' + roh.schema + ' unbekannt' };
    if (!roh.modelle || typeof roh.modelle !== 'object' || Array.isArray(roh.modelle)) return { fehler: 'Feld «modelle» ungültig' };
    var modelle = {}, reihenfolge = [], alleIds = [];
    var schluessel = Object.keys(roh.modelle);
    if (!schluessel.length) return { fehler: 'Bündel ohne Modell' };
    for (var i = 0; i < schluessel.length; i++) {
      var pid = schluessel[i], m = roh.modelle[pid];
      if (!m || typeof m !== 'object' || m.modelle !== undefined) return { fehler: 'Modell ' + pid + ': keine Modellkarte' };
      if (m.printfulProductId != null && String(m.printfulProductId) !== pid) return { fehler: 'Modell ' + pid + ': printfulProductId ' + m.printfulProductId + ' passt nicht zum Schlüssel' };
      var r = karteNormalisieren(m);
      if (!r.karte) return { fehler: 'Modell ' + pid + ': ' + r.fehler };
      if (r.karte.printfulProductId == null) r.karte.printfulProductId = Number(pid);
      modelle[pid] = r.karte; reihenfolge.push(pid);
      r.karte.platzierungen.forEach(function (p) { if (alleIds.indexOf(p.id) < 0) alleIds.push(p.id); });
    }
    var zuordnung = {}, sv = roh.shop && roh.shop.varianten;
    if (sv && typeof sv === 'object') {
      Object.keys(sv).forEach(function (k) {
        var x = sv[k];
        if (x && typeof x === 'object' && x.pv != null && x.pv !== '' && istZahl(Number(x.pv)) && x.m != null && modelle[String(x.m)]) zuordnung[String(k)] = { pv: Number(x.pv), m: String(x.m) };
      });
    }
    if (!Object.keys(zuordnung).length) return { fehler: 'Bündel ohne Zuordnung Shopify-Variante → Modell' };
    return { karte: { buendel: true, legacy: false, modelle: modelle, reihenfolge: reihenfolge, zuordnung: zuordnung, alleIds: alleIds } };
  }

  /** Karte prüfen und für den Editor vorbereiten. Gibt { karte } oder { fehler } zurück. Die übergebene Karte wird nicht verändert. */
  function karteNormalisieren(roh) {
    if (!roh || typeof roh !== 'object') return { fehler: 'keine Karte' };
    if (roh.modelle !== undefined) return buendelNormalisieren(roh);
    if (roh.schema !== undefined && roh.schema !== 1) return { fehler: 'Kartenschema ' + roh.schema + ' unbekannt' };
    if (!Array.isArray(roh.platzierungen)) return { fehler: 'Feld «platzierungen» fehlt' };
    var platzierungen = roh.platzierungen.filter(platzierungOk);
    if (!platzierungen.length) return { fehler: 'keine zeichenbare Platzierung' };
    var ids = {};
    platzierungen.forEach(function (p) { ids[p.id] = true; });
    var karte = {
      printfulProductId: roh.printfulProductId == null ? null : roh.printfulProductId,
      klasse: roh.klasse || null,
      minDpi: istZahl(roh.minDpi) && roh.minDpi > 0 ? roh.minDpi : MIN_DPI_VORGABE,
      maxPixel: istZahl(roh.maxPixel) && roh.maxPixel >= 0 ? roh.maxPixel : null,
      titel: roh.titelDe || roh.titelEn || '',
      platzierungen: platzierungen,
      druckdateien: roh.druckdateien && typeof roh.druckdateien === 'object' ? roh.druckdateien : {},
      druckdateiGruppen: Array.isArray(roh.druckdateiGruppen) ? roh.druckdateiGruppen : [],
      varianten: {},
      hinweise: Array.isArray(roh.hinweise) ? roh.hinweise : [],
      shop: {},
      farbeVon: {},
      legacy: false,
    };
    // farben: { "#rrggbb": [Printful-Variante, …] } → Farbe je Variante (nur zur Anzeige der Vorlage in der gewählten Farbe)
    if (roh.farben && typeof roh.farben === 'object') {
      Object.keys(roh.farben).forEach(function (hex) {
        if (/^#[0-9a-f]{6}$/i.test(hex) && Array.isArray(roh.farben[hex])) roh.farben[hex].forEach(function (id) { karte.farbeVon[id] = hex; });
      });
    }
    (Array.isArray(roh.varianten) ? roh.varianten : []).forEach(function (v) {
      if (v && v.printfulVariantId != null) karte.varianten[v.printfulVariantId] = v;
    });
    var sv = roh.shop && roh.shop.varianten;
    if (sv && typeof sv === 'object') {
      Object.keys(sv).forEach(function (k) {
        var x = sv[k];
        var id = x && typeof x === 'object' ? x.printfulVariantId : x;
        if (id != null && id !== '') karte.shop[String(k)] = id;
      });
    }
    // Konflikte nur gegen Platzierungen, die der Editor zeichnet; symmetrisch gemacht
    karte.konflikte = {};
    platzierungen.forEach(function (p) { karte.konflikte[p.id] = karte.konflikte[p.id] || {}; });
    platzierungen.forEach(function (p) {
      (p.kollidiertMit || []).forEach(function (q) {
        if (ids[q] && q !== p.id) { karte.konflikte[p.id][q] = true; karte.konflikte[q][p.id] = true; }
      });
    });
    return { karte: karte };
  }

  /** Geometrie einer Platzierung für eine Printful-Variante: Druckdatei und Vorlage der Variante, sonst der Standard der Karte. */
  function geometrieFuer(karte, p, printfulVarianteId) {
    var pfId = null;
    if (printfulVarianteId != null) {
      var v = karte.varianten[printfulVarianteId];
      var g = v && v.druckdateiGruppe != null ? karte.druckdateiGruppen[v.druckdateiGruppe] : null;
      if (g && g.platzierungen && g.platzierungen[p.id] != null) pfId = g.platzierungen[p.id];
    }
    var geo = null;
    if (pfId != null) {
      var treffer = (p.geometrien || []).filter(function (x) { return x.printfileId === pfId; });
      geo = treffer.filter(function (x) { return x.beispielVarianteId === printfulVarianteId; })[0]
        || treffer.sort(function (a, b) { return (b.anzahlVarianten || 0) - (a.anzahlVarianten || 0); })[0] || null;
    }
    var pf = pfId != null && karte.druckdateien[pfId] && karte.druckdateien[pfId].breitePx > 0 ? karte.druckdateien[pfId] : p.printfile;
    var vl = geo && geo.vorlage && geo.vorlage.vorlageBreite > 0 ? geo.vorlage : p.vorlage;
    if (pf !== p.printfile && !geo) vl = p.vorlage;
    return { printfile: pf, vorlage: vl };
  }

  /** Platzierung einer Karte nach ID (oder null). */
  function platzierungIn(k, id) {
    for (var i = 0; i < k.platzierungen.length; i++) if (k.platzierungen[i].id === id) return k.platzierungen[i];
    return null;
  }

  /** Platzierungen, die mit `id` kollidieren UND schon Ebenen tragen (ebenen: { id: [..] }). */
  function blockierer(karte, id, ebenen) {
    var k = karte.konflikte[id] || {};
    return Object.keys(k).filter(function (q) { return ebenen[q] && ebenen[q].length > 0; });
  }

  // ── Rückfall ohne Karte: eine Karte, die sich wie v5 verhält ────────────────────────────────────
  /** Aus den Attributen des Containers (wie v5) eine Karte bauen: Vorne/Hinten, Leinwand data-ref × data-ratio (v5: 1200 × 1200·ratio), ganzes Bild als Fläche. */
  function legacyKarte(container) {
    var attr = function (n) { return container.getAttribute(n) || ''; };
    var vorne = attr('data-img-front') || attr('data-img');
    var hinten = attr('data-img-back');
    var ratio = parseFloat(attr('data-ratio'));
    if (!(ratio > 0)) ratio = 1;
    var ref = parseInt(attr('data-ref'), 10);
    if (!(ref >= 600)) ref = LEGACY_REF;
    var imgMap = {};
    try { imgMap = JSON.parse(attr('data-img-map') || '{}') || {}; } catch (e) { imgMap = {}; }
    var hoehe = Math.round(ref * ratio);
    function platz(id, titel, bild) {
      return {
        id: id, dateiTyp: null, titelDe: titel, titelEn: titel, art: 'flaeche', technik: null, aufpreisUsd: null, kollidiertMit: [], geometrien: [],
        printfile: { breitePx: ref, hoehePx: hoehe, dpi: null },
        vorlage: { bildUrl: bild, hintergrundUrl: null, hintergrundFarbe: null, vorlageBreite: ref, vorlageHoehe: hoehe, flaecheLinks: 0, flaecheOben: 0, flaecheBreite: ref, flaecheHoehe: hoehe },
      };
    }
    var platzierungen = [platz('front', T.front, vorne)];
    if (hinten && hinten !== vorne) platzierungen.push(platz('back', T.back, hinten));
    return {
      printfulProductId: null, klasse: null, minDpi: MIN_DPI_VORGABE, maxPixel: 0, titel: '', platzierungen: platzierungen, druckdateien: {}, druckdateiGruppen: [],
      varianten: {}, hinweise: [], shop: {}, konflikte: { front: {}, back: {} }, legacy: true, imgMap: imgMap, standardVariante: attr('data-variant'), ref: ref, ratio: ratio,
    };
  }

  // ── Bilder laden, bearbeiten, hochladen (aus v5, lesbar gemacht) ────────────────────────────────
  function neueBearbeitung() {
    return { cx0: 0, cy0: 0, cw: 1, ch: 1, flipH: false, flipV: false, rotQ: 0, bri: 100, con: 100, sat: 100, gray: 0, bg: 0, frame: 0, sharp: 0 };
  }

  /** Bild laden (mit CORS, damit die Leinwand nicht «tainted» wird). */
  function bildLaden(src) {
    return new Promise(function (ok, fehler) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { ok(img); };
      img.onerror = function () { fehler(new Error('img')); };
      img.src = src;
    });
  }

  /** abannews.com-Bilder laufen für die Leinwand über den Cloudinary-Fetch (CORS), wie v5. */
  function stickerQuelle(url) {
    return CLOUD_NAME && url.indexOf('abannews.com') >= 0 ? 'https://res.cloudinary.com/' + CLOUD_NAME + '/image/fetch/' + encodeURIComponent(url) : url;
  }

  /** Fehler eines Uploads: `detail` = Text des Servers, `gross` = die Datei war dem Server zu gross (Bytes, Pixel oder Seitenlänge), `zeit` = Zeitlimit. */
  function uploadFehler(text, detail, status) {
    var err = new Error(text);
    err.detail = detail || '';
    err.status = status || 0;
    err.gross = status === 413 || /size|large|megapixel|too big|dimension|pixels|zu gross/i.test(detail || '');
    return err;
  }

  /** Datei zu Cloudinary (Parameter unverändert aus v5). streng: Antwort muss ok sein und eine https-Adresse tragen (für Druckdateien). zeitMs: Zeitlimit.
   *  Meldet genau einmal zurück: fertig(Fehler) oder fertig(null, Adresse). */
  function hochladen(datei, streng, fertig, zeitMs) {
    var fd = new FormData();
    fd.append('file', datei);
    fd.append('upload_preset', UPLOAD_PRESET);
    var ctrl = window.AbortController ? new AbortController() : null;
    var gemeldet = false, timer = null;
    function melden(err, url) {
      if (gemeldet) return;
      gemeldet = true; clearTimeout(timer);
      fertig(err, url);
    }
    if (zeitMs > 0) timer = setTimeout(function () {
      if (ctrl) { try { ctrl.abort(); } catch (x) { /* egal */ } }
      var err = uploadFehler(T.upTimeout, 'timeout', 0); err.zeit = true;
      melden(err);
    }, zeitMs);
    var opt = { method: 'POST', body: fd };
    if (ctrl) opt.signal = ctrl.signal;
    fetch('https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/auto/upload', opt)
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
      })
      .then(function (a) {
        var j = a.j, meldungServer = (j && j.error && j.error.message) || '';
        if (streng) {
          if (!a.ok) throw uploadFehler(T.printErr, meldungServer, a.status);
          if (!j || typeof j.secure_url !== 'string' || !/^https:\/\//i.test(j.secure_url)) throw uploadFehler(T.printErr, meldungServer, a.status);
          melden(null, j.secure_url);
        } else if (j && j.secure_url) melden(null, j.secure_url);
        else melden(uploadFehler(meldungServer || 'failed', meldungServer, a.status));
      })
      .catch(function (err) { melden(err && err.detail !== undefined ? err : uploadFehler(streng ? T.printErr : String((err && err.message) || err), String((err && err.message) || err), 0)); });
  }

  /** Hintergrund entfernen: Farbe der vier Ecken als Hintergrund, alles nah daran wird durchsichtig (weicher Rand). */
  function freistellen(ctx, cv, toleranz) {
    var w = cv.width, h = cv.height;
    if (w < 2 || h < 2) return;
    var bild = ctx.getImageData(0, 0, w, h), d = bild.data;
    function punkt(x, y) { var i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }
    var ecken = [punkt(0, 0), punkt(w - 1, 0), punkt(0, h - 1), punkt(w - 1, h - 1)];
    var r0 = 0, g0 = 0, b0 = 0;
    ecken.forEach(function (c) { r0 += c[0]; g0 += c[1]; b0 += c[2]; });
    r0 /= 4; g0 /= 4; b0 /= 4;
    var weich = toleranz * 1.7;
    for (var i = 0; i < d.length; i += 4) {
      var dr = d[i] - r0, dg = d[i + 1] - g0, db = d[i + 2] - b0;
      var abstand = Math.sqrt(dr * dr + dg * dg + db * db);
      if (abstand < toleranz) d[i + 3] = 0;
      else if (abstand < weich) d[i + 3] = Math.round(d[i + 3] * (abstand - toleranz) / (weich - toleranz));
    }
    ctx.putImageData(bild, 0, 0);
  }

  /** Schärfen mit einem einfachen Faltungskern (4er-Nachbarschaft). */
  function schaerfen(ctx, cv, staerke) {
    var w = cv.width, h = cv.height;
    if (w < 3 || h < 3) return;
    var quelle = ctx.getImageData(0, 0, w, h), s = quelle.data;
    var ziel = ctx.createImageData(w, h), d = ziel.data;
    d.set(s);
    var mitte = 1 + 4 * staerke;
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = (y * w + x) * 4;
        for (var k = 0; k < 3; k++) {
          var j = i + k;
          var v = mitte * s[j] - staerke * (s[j - 4] + s[j + 4] + s[j - w * 4] + s[j + w * 4]);
          d[j] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
    }
    ctx.putImageData(ziel, 0, 0);
  }

  /** Rahmen: 1 = weiss, 2 = schwarz. */
  function rahmenZeichnen(ctx, cv, art) {
    var dicke = Math.max(2, Math.round(Math.min(cv.width, cv.height) * 0.035));
    ctx.save();
    ctx.filter = 'none';
    ctx.strokeStyle = art === 2 ? '#111111' : '#ffffff';
    ctx.lineWidth = dicke;
    ctx.strokeRect(dicke / 2, dicke / 2, cv.width - dicke, cv.height - dicke);
    ctx.restore();
  }

  /** Speicher einer Leinwand freigeben (Mobile Safari hält grosse Leinwände sonst bis zur Müllabfuhr). */
  function leinwandFreigeben(cv) {
    try { if (cv) { cv.width = 0; cv.height = 0; } } catch (x) { /* egal */ }
  }

  /** Das Bild der Ebene mit allen Bearbeitungen (Zuschnitt, Drehen, Spiegeln, Filter) auf eine Leinwand zeichnen; maxBreite 0 = volle Grösse. */
  function bildBearbeiten(ebene, maxBreite) {
    return bildLaden(ebene.origSrc || ebene.src).then(function (img) {
      var ed = ebene.edit || (ebene.edit = neueBearbeitung());
      var iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
      var sx = Math.round(ed.cx0 * iw), sy = Math.round(ed.cy0 * ih);
      var sw = Math.max(1, Math.round(ed.cw * iw)), sh = Math.max(1, Math.round(ed.ch * ih));
      var q = (((ed.rotQ || 0) % 4) + 4) % 4;
      var quer = q === 1 || q === 3;
      var ow = quer ? sh : sw, oh = quer ? sw : sh;
      var k = maxBreite && ow > maxBreite ? maxBreite / ow : 1;
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(ow * k));
      cv.height = Math.max(1, Math.round(oh * k));
      var ctx = cv.getContext('2d');
      try { ctx.filter = 'brightness(' + ed.bri + '%) contrast(' + ed.con + '%) saturate(' + ed.sat + '%) grayscale(' + ed.gray + '%)'; } catch (e) { /* Safari kennt filter nicht */ }
      ctx.save();
      ctx.translate(cv.width / 2, cv.height / 2);
      ctx.rotate(q * Math.PI / 2);
      ctx.scale((ed.flipH ? -1 : 1) * k, (ed.flipV ? -1 : 1) * k);
      ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
      try { ctx.filter = 'none'; } catch (e2) { /* egal */ }
      if (ed.bg) { try { freistellen(ctx, cv, ed.bg); } catch (e3) { /* Leinwand nicht lesbar */ } }
      if (ed.sharp) { try { schaerfen(ctx, cv, ed.sharp / 100); } catch (e4) { /* egal */ } }
      if (ed.frame) { try { rahmenZeichnen(ctx, cv, ed.frame); } catch (e5) { /* egal */ } }
      return cv;
    });
  }

  /** Schriftangabe für die Leinwand (wie v5): Familie der Schrift, fett/kursiv nach Ebene. */
  function schriftFuerLeinwand(ebene, px) {
    var s = schriftNach(ebene.font);
    var voll = s.canvas.replace('{S}', Math.round(px));
    var m = /^(?:bold |900 )?(\d+)px (.*)$/.exec(voll);
    var familie = m ? m[2] : 'Arial,sans-serif';
    var grundFett = (/^(bold |900 )/.exec(voll) || [''])[0];
    var fett = ebene.bold === false ? '' : ebene.bold === true ? grundFett || 'bold ' : grundFett;
    return (ebene.italic ? 'italic ' : '') + fett + Math.round(px) + 'px ' + familie;
  }
  function schriftNach(css) {
    return SCHRIFTEN.filter(function (s) { return s.css === css; })[0] || SCHRIFTEN[0];
  }
  var deckkraft = function (e) { return e.op == null ? 1 : e.op; };
  var zeilenhoehe = function (e) { return e.lh || 1.05; };
  var ausrichtung = function (e) { return e.align === 'left' || e.align === 'right' ? e.align : 'center'; };
  var prozent1 = function (x) { return Math.round(x * 1e3) / 10; };

  /** Wie gross ist das Bild einer Ebene in Pixeln der Druckdatei? Text: Schrifthöhe = scale · Breite · 0,12; Bild: Breite = scale · Breite · 0,5 (wie v5). */
  function schriftPx(ebene, breite) { return ebene.scale * breite * 0.12; }
  function bildBreitePx(ebene, breite) { return ebene.scale * breite * 0.5; }

  /** Pixelbreite des Bildausschnitts einer Bildebene (Zuschnitt, ggf. gedreht); 0, wenn die Originalgrösse unbekannt ist. */
  function ausschnittBreitePx(ebene) {
    if (!ebene._origW) return 0;
    var ed = ebene.edit || neueBearbeitung();
    return (ed.rotQ % 2 ? ed.ch * (ebene._origH || ebene._origW) : ed.cw * ebene._origW);
  }

  /** Auflösung eines Fotos auf dem Produkt in dpi: Pixel des Ausschnitts durch die gedruckte Breite in Zoll (nur Anzeige, Rechnung intern).
   *  null, wenn Originalgrösse oder dpi der Druckdatei fehlen. Die Druckdatei kann nie mehr als ihre eigene Pixeldichte tragen (Obergrenze renderGroesse). */
  function bildDpi(ebene, pf, rg) {
    var px = ausschnittBreitePx(ebene);
    if (!(px > 0) || !pf || !(pf.dpi >= 10)) return null;
    var zoll = bildBreitePx(ebene, pf.breitePx) / pf.dpi;
    var dpi = px / zoll;
    return Math.min(dpi, pf.dpi * (rg ? rg.k : 1));
  }

  /** Höhe des Bildausschnitts einer Bildebene in Pixeln (Gegenstück zu ausschnittBreitePx); 0, wenn die Originalgrösse unbekannt ist. */
  function ausschnittHoehePx(ebene) {
    if (!ebene._origW) return 0;
    var ed = ebene.edit || neueBearbeitung();
    return (ed.rotQ % 2 ? ed.cw * ebene._origW : ed.ch * (ebene._origH || ebene._origW));
  }

  // ── Qualitätstor (WP4) ──────────────────────────────────────────────────────────────────────────
  /** Stufe einer effektiven Bildauflösung: 'sperre' (unter dem Mindestwert der Karte: der Kauf bleibt gesperrt), 'mittel' (Mindestwert bis DPI_GUT: Warnung), 'gut'. */
  function qualitaetStufe(dpi, minDpi) {
    if (!(dpi >= 0)) return null;
    if (dpi < minDpi) return 'sperre';
    return dpi < DPI_GUT ? 'mittel' : 'gut';
  }
  /** Ganzzahl für die Anzeige und für _pod_karte.qd: unter dem Mindestwert abgerundet (74,8 darf nie als «75» neben der Sperre stehen), sonst gerundet. */
  function dpiGanz(dpi, stufe) { return stufe === 'sperre' ? Math.floor(dpi + 1e-9) : Math.round(dpi); }

  // ── Vorschau «Auf dem Produkt» (WP3): reine Funktionen ──────────────────────────────────────────
  /** Rechteck für einen Inhalt mit Seitenverhältnis `aspekt` in einer Fläche aw × ah (Ursprung links oben): 'einpassen' = ganz sichtbar und zentriert, 'fuellen' = Fläche gefüllt, Überstand wird beschnitten. */
  function einpassRechteck(aw, ah, aspekt, modus) {
    var w, h;
    if ((modus === 'fuellen') === (aspekt >= aw / ah)) { h = ah; w = ah * aspekt; } else { w = aw; h = aw / aspekt; }
    return { x: (aw - w) / 2, y: (ah - h) / 2, w: w, h: h };
  }
  /** Lage der Vorlage in einer Zeichenfläche W × H: gleichmässig skaliert, zentriert (die Vorlage ist meist quadratisch; sonst bleibt ein Rand). */
  function vorlageLage(vl, W, H) {
    var s = Math.min(W / vl.vorlageBreite, H / vl.vorlageHoehe);
    var ox = (W - vl.vorlageBreite * s) / 2, oy = (H - vl.vorlageHoehe * s) / 2;
    return { s: s, ox: ox, oy: oy, ax: ox + vl.flaecheLinks * s, ay: oy + vl.flaecheOben * s, aw: vl.flaecheBreite * s, ah: vl.flaecheHoehe * s, w: vl.vorlageBreite * s, h: vl.vorlageHoehe * s };
  }
  function leuchtdichte(r, g, b) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function kontrastVerhaeltnis(l1, l2) { return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  /** Hebt sich das Design vom Stoff ab? data = RGBA-Pixel des Designs (durchsichtig = kein Design), stoff = [r, g, b]. Gibt { anteil: schlecht lesbarer Teil der Design-Fläche (0 bis 1, alphagewichtet),
   *  art: 'dunkel' | 'hell', flaeche: Summe der Gewichte } zurück. */
  function kontrastAnalyse(data, stoff) {
    var lf = leuchtdichte(stoff[0], stoff[1], stoff[2]);
    var summe = 0, schlecht = 0, lsum = 0;
    for (var i = 0; i + 3 < data.length; i += 4) {
      var a = data[i + 3] / 255;
      if (a < 0.2) continue;
      summe += a;
      var l = leuchtdichte(data[i], data[i + 1], data[i + 2]);
      if (kontrastVerhaeltnis(l, lf) < KONTRAST_SCHWELLE) { schlecht += a; lsum += a * l; }
    }
    var lmittel = schlecht > 0 ? lsum / schlecht : lf;
    return { anteil: summe > 0 ? schlecht / summe : 0, art: (lmittel + lf) / 2 < 0.2 ? 'dunkel' : 'hell', flaeche: summe };
  }
  function hexZuRgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }

  /** Tassen-Eichung eines Fotos: Adresse (Spiegel oder Printful), Körper des Zylinders (mitteX, radius), Druckhöhe (oben, unten), Winkel der ganzen Druckbreite, optional ausschnitt [x, y, w, h]. */
  function tasseOk(t) {
    if (!t || typeof t !== 'object') return false;
    if (!(typeof t.foto === 'string' && /^https:\/\//i.test(t.foto)) && !(typeof t.quelle === 'string' && /^https:\/\//i.test(t.quelle))) return false;
    if (!['fotoBreite', 'fotoHoehe', 'mitteX', 'radius', 'oben', 'unten'].every(function (k) { return istZahl(t[k]); })) return false;
    if (!(t.radius > 0) || !(t.unten > t.oben) || !(t.fotoBreite > 0) || !(t.fotoHoehe > 0)) return false;
    if (t.winkel != null && !(istZahl(t.winkel) && t.winkel > 90 && t.winkel <= 360)) return false;
    if (t.ausschnitt != null && !(Array.isArray(t.ausschnitt) && t.ausschnitt.length === 4 && t.ausschnitt.every(function (x) { return istZahl(x); }) && t.ausschnitt[2] > 0 && t.ausschnitt[3] > 0)) return false;
    return true;
  }
  /** Vorschaudaten prüfen (Schema 1, gebaut von werkzeug/vorschau_daten_bauen.mjs): { schema:1, modelle:{ "<Printful-Produkt>": { adapter:'flach'|'tasse'|'papier'|'keine', grund,
   *  bilder:{<Printful-Adresse>:<Adresse auf Shopify Files> oder null}, tasse:{<Printful-Variante>:Eichung} } } }. «vorlagen» (Gegenprobe gegen die Karte) liest der Editor nicht.
   *  Gibt { daten } oder { fehler }; ein unbrauchbares Modell fällt heraus (für dieses Modell gibt es dann keine Produktvorschau), die übrigen bleiben. */
  function vorschauNormalisieren(roh) {
    if (!roh || typeof roh !== 'object') return { fehler: 'keine Vorschaudaten' };
    if (roh.schema !== 1) return { fehler: 'Vorschauschema ' + roh.schema + ' unbekannt' };
    if (!roh.modelle || typeof roh.modelle !== 'object' || Array.isArray(roh.modelle)) return { fehler: 'Feld «modelle» ungültig' };
    var modelle = {};
    Object.keys(roh.modelle).forEach(function (pid) {
      var m = roh.modelle[pid];
      if (!m || typeof m !== 'object' || ['flach', 'tasse', 'papier', 'keine'].indexOf(m.adapter) < 0) return;
      var bilder = {}, tasse = {};
      if (m.bilder && typeof m.bilder === 'object') Object.keys(m.bilder).forEach(function (k) {
        var v = m.bilder[k];
        if (/^https:\/\//i.test(k) && (v === null || (typeof v === 'string' && /^https:\/\//i.test(v)))) bilder[k] = v;   // null = noch nicht gespiegelt: dann gilt die Printful-Adresse
      });
      if (m.tasse && typeof m.tasse === 'object') Object.keys(m.tasse).forEach(function (pv) { if (tasseOk(m.tasse[pv])) tasse[pv] = m.tasse[pv]; });
      modelle[String(pid)] = { adapter: m.adapter, grund: typeof m.grund === 'string' ? m.grund : null, bilder: bilder, tasse: tasse };
    });
    if (!Object.keys(modelle).length) return { fehler: 'kein brauchbares Modell in den Vorschaudaten' };
    return { daten: { modelle: modelle } };
  }

  // ── Entwurf speichern und wiederherstellen (WP4) ────────────────────────────────────────────────
  // Jeder Zugriff auf den Speicher steht in try/catch: im Privatfenster, bei gesperrten Websitedaten oder voller Quote läuft der Editor ohne Speichern weiter.
  function speicherLesen(k) { try { var s = window.localStorage; return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function speicherSchreiben(k, v) { try { var s = window.localStorage; if (!s) return false; s.setItem(k, v); return true; } catch (e) { return false; } }
  function speicherLoeschen(k) { try { var s = window.localStorage; if (s) s.removeItem(k); } catch (e) { /* egal */ } }
  /** Eine Ebene für den Entwurf; null, wenn sie sich nicht wiederherstellen lässt (Foto ohne hochgeladene Datei). Bei Fotos zählt die Adresse der Druckdatei bei Cloudinary:
   *  sie trägt alle Bearbeitungen schon in sich, darum wird `edit` beim Wiederherstellen zurückgesetzt und die Ausschnittgrösse (aw, ah) als Originalgrösse gesetzt. */
  function ebeneFuerEntwurf(e) {
    var n = { id: e.id, type: e.type, cx: e.cx, cy: e.cy, scale: e.scale, rot: e.rot };
    if (e.op != null) n.op = e.op;
    if (e.type === 'text') {
      ['text', 'font', 'color', 'bold', 'italic', 'align', 'ls', 'outl', 'outc', 'lh'].forEach(function (k) { if (e[k] !== undefined) n[k] = e[k]; });
      return n;
    }
    if (e.type === 'sticker') { n.name = e.name; return n; }
    if (e.type !== 'image' || !e.printUrl || e.uploading || !/^https:\/\//i.test(e.printUrl)) return null;
    n.printUrl = e.printUrl;
    n.aw = Math.round(ausschnittBreitePx(e)) || 0;
    n.ah = Math.round(ausschnittHoehePx(e)) || 0;
    return n;
  }
  /** Gespeicherte Ebene zurück in eine Ebene des Editors; null bei Unsinn. */
  function ebeneAusEntwurf(n) {
    if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !/^L\d+$/.test(n.id)) return null;
    if (!istZahl(n.cx) || !istZahl(n.cy) || !istZahl(n.scale) || !istZahl(n.rot)) return null;
    var e = { id: n.id, type: n.type, cx: bereich(0, 1, n.cx), cy: bereich(0, 1, n.cy), scale: bereich(0.06, 3, n.scale), rot: n.rot };
    if (istZahl(n.op)) e.op = bereich(0, 1, n.op);
    if (n.type === 'text') {
      if (typeof n.text !== 'string' || typeof n.font !== 'string' || typeof n.color !== 'string') return null;
      e.text = n.text.slice(0, 200); e.font = n.font; e.color = n.color;
      if (typeof n.bold === 'boolean') e.bold = n.bold;
      if (typeof n.italic === 'boolean') e.italic = n.italic;
      if (n.align === 'left' || n.align === 'right' || n.align === 'center') e.align = n.align;
      ['ls', 'outl', 'lh'].forEach(function (k) { if (istZahl(n[k])) e[k] = n[k]; });
      if (typeof n.outc === 'string') e.outc = n.outc;
      return e;
    }
    if (n.type === 'sticker') {
      if (typeof n.name !== 'string' || !/^[a-z0-9-]+$/.test(n.name)) return null;
      e.name = n.name; e.src = STICKER_BASIS + n.name + '.png'; e.printUrl = e.src; e.uploading = false;
      return e;
    }
    if (n.type === 'image') {
      if (typeof n.printUrl !== 'string' || !/^https:\/\//i.test(n.printUrl) || !(n.aw > 0)) return null;
      e.src = n.printUrl; e.origSrc = n.printUrl; e.printUrl = n.printUrl; e.uploading = false; e.edit = neueBearbeitung();
      e._origW = n.aw; e._origH = n.ah > 0 ? n.ah : n.aw;
      return e;
    }
    return null;
  }

  // ── Oberfläche: Stil ────────────────────────────────────────────────────────────────────────────
  var CSS = [
    '.lsp6{--ink:#16151a;--paper:#faf8f5;--line:#ddd5c6;--mute:#5b5a62;--gold:#c1922f;--golddk:#8a6410;--red:#b3122b;--green:#166b3b;box-sizing:border-box;max-width:560px;margin:8px 0 16px;border:1px solid #e3dccf;border-radius:16px;overflow:hidden;background:#fff;color:var(--ink);font:14px/1.35 "Helvetica Neue",Arial,sans-serif;outline:none}',
    '.lsp6 *,.lsp6 *::before,.lsp6 *::after{box-sizing:border-box}',
    '.lsp6 [hidden]{display:none!important}',
    '.lsp6-head{background:var(--ink);color:#fff;padding:12px 16px;font-weight:800;font-size:15px}',
    '.lsp6-tabs{position:relative;display:flex;gap:6px;overflow-x:auto;padding:10px 12px 6px;background:var(--paper);border-bottom:1px solid #ece7df;scrollbar-width:thin}',
    '.lsp6-tab{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-height:44px;padding:6px 12px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:13px;line-height:1.2;cursor:pointer;text-align:left}',
    '.lsp6-tab small{font-family:inherit;font-weight:600;font-size:11px;line-height:1.2;color:var(--mute)}',
    '.lsp6-tab[aria-selected=true]{background:var(--ink);border-color:var(--ink);color:#fff}',
    '.lsp6-tab[aria-selected=true] small{color:#e8e4da}',
    '.lsp6-tab[aria-disabled=true]{opacity:.62;border-style:dashed;cursor:not-allowed}',
    '.lsp6-tab.fremd{border-style:dashed;border-color:var(--red);color:var(--red)}',
    '.lsp6-tab.fremd[aria-selected=true]{background:var(--red);border-color:var(--red);color:#fff}',
    '.lsp6-tab .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--gold);margin-left:6px;vertical-align:middle}',
    '.lsp6-tabnote{margin:0;padding:8px 14px;background:#fff4f5;border-bottom:1px solid #f3c6cd;color:var(--red);font-size:12.5px;font-weight:700}',
    '.lsp6-stagewrap{background:#efece6;padding:8px 0 0}',
    '.lsp6-stage{position:relative;width:100%;margin:0 auto;aspect-ratio:var(--asp,1);max-width:calc(78vh * var(--asp,1));background:#f4f1ec;overflow:hidden;isolation:isolate;user-select:none;-webkit-user-select:none;touch-action:pan-y}',
    '.lsp6-bg,.lsp6-tpl{position:absolute;display:block;pointer-events:none;user-select:none;-webkit-user-drag:none}',
    '.lsp6-host{position:absolute;pointer-events:none}',
    '.lsp6-veil{position:absolute;background:rgba(255,255,255,.5);pointer-events:none;z-index:500}',
    '.lsp6-frame{position:absolute;border:2px dashed var(--golddk);box-shadow:0 0 0 1px rgba(255,255,255,.9);pointer-events:none;z-index:650}',
    '.lsp6-tag{position:absolute;z-index:660;padding:2px 7px;border-radius:6px;background:rgba(22,21,26,.85);color:#fff;font-size:11px;font-weight:700;pointer-events:none;white-space:nowrap}',
    '.lsp6-readout{position:absolute;left:8px;top:8px;z-index:800;padding:4px 8px;border-radius:8px;background:rgba(22,21,26,.85);color:#fff;font-size:12px;font-weight:700;pointer-events:none}',
    '.lsp6-guide{position:absolute;display:none;pointer-events:none;z-index:700}',
    '.lsp6-layer{position:absolute;left:0;top:0;transform-origin:center center;cursor:grab;will-change:transform;touch-action:none;pointer-events:auto}',
    '.lsp6-layer.sel{z-index:600!important}',
    '.lsp6-handle{position:absolute;right:-21px;bottom:-21px;width:30px;height:30px;border-radius:50%;background:var(--ink);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:nwse-resize;touch-action:none;color:#fff;font-size:13px;line-height:26px;text-align:center}',
    '.lsp6-del{position:absolute;left:-21px;top:-21px;width:30px;height:30px;border-radius:50%;background:var(--red);color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;font-size:14px;line-height:26px;text-align:center;font-weight:900;touch-action:none}',
    '.lsp6-handle::before,.lsp6-del::before{content:"";position:absolute;inset:-9px}',   // Tippfläche 44 px (Innenmass 26 px + 2 × 9) bei sichtbaren 30 px
    '.lsp6-sel-frame{position:absolute;inset:-8px;border:1.5px dashed var(--ink);border-radius:6px;pointer-events:none;background:rgba(255,255,255,.04)}',
    '.lsp6-meta{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;justify-content:space-between;padding:8px 16px 0;font-size:12px;color:var(--mute)}',
    '.lsp6-linkbtn{border:none;background:none;color:var(--golddk);font-family:inherit;font-weight:700;font-size:12px;line-height:1.2;text-decoration:underline;cursor:pointer;padding:6px 0;min-height:36px}',
    '.lsp6-hints{padding:6px 16px 0}',
    '.lsp6-hint{margin:6px 0 0;padding:8px 10px;border-radius:10px;border:1px solid #e7d9b4;background:#fff8e6;color:#4d3a07;font-size:12.5px;font-weight:600}',
    '.lsp6-sh{margin:6px 0 0;padding:8px 10px;border-radius:10px;border:1px solid #e7d9b4;background:#fff8e6;color:#4d3a07;font-size:12.5px;font-weight:600}',
    '.lsp6-tip{font-size:12px;color:var(--mute);padding:6px 16px 0;text-align:center}',
    '.lsp6-body{padding:12px 16px 16px}',
    '.lsp6-row{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center}',
    '.lsp6-btn{flex:1;min-width:84px;min-height:42px;padding:9px 8px;border-radius:10px;border:1px solid #cfc8bb;background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:13px;line-height:1.2;cursor:pointer}',
    '.lsp6-btn[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}',
    '.lsp6-btn.dark{background:var(--ink);color:#fff;border-color:var(--ink);font-size:14px;font-weight:800}',
    '.lsp6-btn:disabled{opacity:.5;cursor:default}',
    '.lsp6-panel{background:var(--paper);border:1px solid #e3dccf;border-radius:12px;padding:10px;margin-bottom:10px}',
    '.lsp6-panel.flexp{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.lsp6-lab{font-size:13px;font-weight:700;white-space:nowrap}',
    '.lsp6-cap{font-size:12px;font-weight:800;color:var(--mute);margin-bottom:6px}',
    '.lsp6 input[type=range]{flex:1;min-width:90px;accent-color:var(--golddk);min-height:36px}',
    '.lsp6-text,.lsp6-select{width:100%;padding:10px;border:1px solid #cfc8bb;border-radius:9px;font-family:inherit;font-size:15px;line-height:1.3;margin-bottom:8px;background:#fff;color:var(--ink)}',
    '.lsp6-text{resize:vertical}',
    '.lsp6-swatches{display:flex;flex-wrap:wrap;gap:6px}',
    '.lsp6-sw{width:36px;height:36px;border-radius:50%;border:2px solid #cfc8bb;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);font-size:15px;line-height:1;padding:0}',
    '.lsp6-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px}',
    '.lsp6-field{display:flex;flex-direction:column;justify-content:flex-end;gap:3px;font-size:11.5px;font-weight:700;min-width:0}',
    '.lsp6-field input{width:100%;min-width:0;min-height:38px;padding:6px 5px;border:1px solid #cfc8bb;border-radius:8px;font-size:14px;background:#fff;color:var(--ink)}',
    '.lsp6-layers{display:flex;gap:6px;align-items:center;margin-bottom:10px}',
    '.lsp6-chips{display:flex;gap:6px;overflow-x:auto;flex:1;min-width:0;padding:2px 0}',
    '.lsp6-chip{flex:none;min-height:36px;padding:6px 11px;border-radius:999px;border:1px solid #cfc8bb;background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:12px;line-height:1.1;cursor:pointer;white-space:nowrap}',
    '.lsp6-chip[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}',
    '.lsp6-warn{background:#fff4f5;border:1px solid #f3c6cd;color:var(--red);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12.5px;font-weight:700}',
    '.lsp6-ok{background:#f1f9f4;border:1px solid #bfe0cc;color:var(--green);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12.5px;font-weight:700}',
    '.lsp6-sum{border:1px solid #e3dccf;border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:13px}',
    '.lsp6-sum b{display:block;margin-bottom:4px}',
    '.lsp6-sum small{display:block;color:var(--mute);margin-top:4px}',
    '.lsp6-cta{width:100%;min-height:52px;padding:14px;border:none;border-radius:999px;background:var(--golddk);color:#fff;font-family:inherit;font-weight:800;font-size:16px;line-height:1.2;cursor:pointer;margin-top:4px}',
    '.lsp6-cta:hover{background:#6f500c}',
    '.lsp6-cta:disabled{opacity:.7;cursor:default}',
    '.lsp6-preview{width:100%;min-height:46px;padding:12px;border:1px solid #cfc8bb;border-radius:999px;background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:14px;line-height:1.2;cursor:pointer;margin:2px 0 8px}',
    '.lsp6-status{text-align:center;font-size:13px;margin-top:8px;min-height:18px;color:var(--mute);font-weight:600}',
    '.lsp6-status.err{color:var(--red)}.lsp6-status.ok{color:var(--green)}',
    '.lsp6-picker{background:#fff;border:1px solid #ece7df;border-radius:12px;padding:10px;margin-bottom:10px;max-height:240px;overflow:auto}',
    '.lsp6-picker-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
    '.lsp6-emoji{width:36px;height:36px;border:1px solid #ece7df;border-radius:8px;background:var(--paper);cursor:pointer;font-size:18px;line-height:1;padding:0}',
    '.lsp6-modal{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;font-family:"Helvetica Neue",Arial,sans-serif}',
    '.lsp6-modal-t{color:#fff;font-weight:800;font-size:15px;margin-bottom:6px;text-align:center}',
    '.lsp6-modal-s{color:#e1e1e8;font-size:12.5px;margin-bottom:12px;text-align:center;max-width:380px}',
    '.lsp6-checker{background-color:#fff;background-image:linear-gradient(45deg,#e6e6e6 25%,transparent 25%),linear-gradient(-45deg,#e6e6e6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e6e6 75%),linear-gradient(-45deg,transparent 75%,#e6e6e6 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;border-radius:10px;padding:8px}',
    '.lsp6-modal button.go{margin-top:14px;padding:12px 24px;min-height:44px;border:none;border-radius:999px;background:#fff;color:var(--ink);font-family:inherit;font-weight:800;font-size:15px;line-height:1;cursor:pointer}',
    '.lsp6 :focus-visible,.lsp6-modal :focus-visible{outline:3px solid #1e4fd6;outline-offset:2px}',
    '.lsp6-sicht{display:flex;gap:6px;padding:8px 12px;background:var(--paper);border-bottom:1px solid #ece7df}',
    '.lsp6-sbtn{flex:1;min-height:44px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:13px;line-height:1.2;cursor:pointer}',
    '.lsp6-sbtn[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}',
    '.lsp6-pvwrap{background:#efece6;padding:8px 0 0}',
    '.lsp6-pv{display:block;width:100%;max-width:78vh;aspect-ratio:1/1;margin:0 auto;background:#fff}',
    '.lsp6-pvnote{margin:0;padding:6px 14px 8px;font-size:12px;color:var(--mute);text-align:center}',
    '.lsp6-pvinfo{margin:0;padding:18px 16px;font-size:13.5px;font-weight:600;color:#4d3a07;background:#fff8e6;border-top:1px solid #e7d9b4;border-bottom:1px solid #e7d9b4}',
    '.lsp6-ok.lsp6-mid{background:#fff8e6;border-color:#e7d9b4;color:#4d3a07}',
    '@media (max-width:480px){.lsp6-btn,.lsp6-tab{min-height:44px}.lsp6-grid{grid-template-columns:repeat(2,1fr)}}',
  ].join('\n');

  function stilEinfuegen() {
    if (document.getElementById('lsp6-css')) return;
    var s = document.createElement('style');
    s.id = 'lsp6-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /** Element bauen: attrs (class, text, oder normale Attribute), kinder (Zeichenketten oder Elemente). */
  function el(tag, attrs, kinder) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
      });
    }
    (kinder || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function knopf(text, klasse, attrs) {
    return el('button', Object.assign({ type: 'button', class: klasse || 'lsp6-btn', text: text }, attrs || {}));
  }
  function bereich(min, max, wert) { return Math.max(min, Math.min(max, wert)); }
  function dateiPng(blob) { return blob && blob.size > 0; }

  // ── Der Editor ──────────────────────────────────────────────────────────────────────────────────
  var editoren = [];   // alle gebauten Editoren (für Tests und Fehlersuche)

  function baueEditor(container, wurzel) {
    var legacy = !!wurzel.legacy;
    var buendel = !!wurzel.buendel;
    var karte = buendel ? wurzel.modelle[wurzel.reihenfolge[0]] : wurzel;   // bei einem Bündel wechselt `karte` mit dem Modell der gewählten Variante
    var attrMax = container.getAttribute('data-max-px');
    var maxPixel = legacy ? 0 : (attrMax !== null && attrMax !== '' && isFinite(Number(attrMax)) && Number(attrMax) >= 0 ? Number(attrMax)
      : (karte.maxPixel != null ? karte.maxPixel : MAX_PIXEL));
    if (!legacy && (!(maxPixel > 0) || maxPixel > MAX_PIXEL_ABS)) maxPixel = MAX_PIXEL_ABS;
    var attrBytes = container.getAttribute('data-max-bytes');
    var maxBytes = attrBytes !== null && attrBytes !== '' && isFinite(Number(attrBytes)) && Number(attrBytes) >= 0 ? Number(attrBytes) : MAX_BYTES;
    var attrZeit = container.getAttribute('data-upload-timeout');
    var uploadZeit = attrZeit && Number(attrZeit) > 0 ? Number(attrZeit) : UPLOAD_ZEIT_MS;
    var standardVariante = legacy ? wurzel.standardVariante : (container.getAttribute('data-variant') || '');
    var st = { aktiv: karte.platzierungen[0].id, ebenen: {}, sel: null, ansicht: 'flaeche', sicht: 'druck', shopVariante: null, pfVariante: null };
    (buendel ? wurzel.alleIds : karte.platzierungen.map(function (p) { return p.id; })).forEach(function (id) { st.ebenen[id] = []; });
    var eingefroren = null;                // beim Klick auf «In den Warenkorb»: { sv, pv } der Variante, für die die Druckdateien gebaut werden
    var bildVersion = {};                  // Ebenen-ID → Zähler der Foto-Bearbeitungen (nur die letzte darf ihr Ergebnis eintragen)
    var origMass = {};                     // Ebenen-ID → { w, h } des Originalfotos (überlebt Rückgängig/Wiederholen)
    var letzteGroesse = {};                // Platzierungs-ID → { w, h } der zuletzt erzeugten Druckdatei
    var verkleinertText = '';              // Hinweis für den Kunden, wenn eine Druckdatei vor dem Upload verkleinert werden musste
    var knoten = {};                       // Ebenen-ID → { root, content, frame, handle, del }
    var verlauf = { stack: [], idx: -1 };
    var ui = {};
    var geoAktiv = null;
    var idZaehler = 0;
    var feinTimer = null;
    var bildVorschauTimer = null;
    // Neu in 6.2.0
    var vorschauDaten = null;              // geprüfte Vorschaudaten (Schema 1); kommen asynchron nach dem Bau des Editors (api.vorschauDatenSetzen)
    var bildPuffer = {};                   // Adresse → Versprechen auf das geladene Vorlagenbild (Vorschau); Fehlschläge werden nicht gemerkt
    var fotoPuffer = {};                   // Ebenen-ID → { key, p } Bild der Ebene für die Vorschau (nicht bei jedem Neuzeichnen neu dekodieren)
    var pvNr = 0;                          // Nummer des letzten Zeichenauftrags der Vorschau: ältere dürfen nicht mehr zeichnen
    var pvPlan = null;                     // geplanter Zeichenauftrag (requestAnimationFrame oder Zeitgeber)
    var vorschauUrl = '';                  // Cloudinary-Adresse des Vorschau-JPEG (erst nach «In den Warenkorb», wie die Druckdateien)
    var entwurfTimer = null;
    var entwurfBereit = false;             // erst nach dem Lesen eines alten Entwurfs wird gespeichert (sonst überschreibt der leere Start ihn)
    var entwurfAus = false;                // nach dem Warenkorb: der Entwurf ist verbraucht
    var entwurfFehlt = 0;                  // Zahl der Fotos, die beim letzten Speichern nicht dabei waren (noch nicht hochgeladen)
    var entwurfKey = ENTWURF_SCHLUESSEL + (function () { try { return window.location.pathname || ''; } catch (e) { return ''; } })() + '|'
      + (buendel ? 'b' + wurzel.reihenfolge.join(',') : String(karte.printfulProductId));

    // ── Zugriff ─────────────────────────────────────────────────────────────────────────────────
    function platzierung(id) {
      var p = platzierungIn(karte, id);
      if (p || !buendel) return p;
      for (var i = 0; i < wurzel.reihenfolge.length && !p; i++) p = platzierungIn(wurzel.modelle[wurzel.reihenfolge[i]], id);   // «fremde» Platzierung: nur in einem anderen Modell
      return p;
    }
    /** Platzierungen, die in den Reitern stehen: die des gewählten Modells, dazu fremde, die schon Ebenen tragen (damit man sie entfernen kann). */
    function tabIds() {
      var ids = karte.platzierungen.map(function (p) { return p.id; });
      if (buendel) wurzel.alleIds.forEach(function (id) { if (ids.indexOf(id) < 0 && st.ebenen[id] && st.ebenen[id].length) ids.push(id); });
      return ids;
    }
    function fremdeMitEbenen() {
      return tabIds().filter(function (id) { return !platzierungIn(karte, id); });
    }
    function pAktiv() { return platzierung(st.aktiv); }
    function ebenenAktiv() { return st.ebenen[st.aktiv]; }
    function ebeneMitId(id) {
      var liste = ebenenAktiv();
      for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i];
      return null;
    }
    function gewaehlt() { return ebeneMitId(st.sel); }
    function gewaehltesBild() { var e = gewaehlt(); return e && e.type === 'image' ? e : null; }
    function titelVon(p) { return (EN ? p.titelEn : p.titelDe) || p.titelDe || p.titelEn || p.id; }
    function neueId() { return 'L' + (++idZaehler); }

    function warenkorbFormular() { return document.querySelector('form[action*="/cart/add"]') || null; }
    /** Gewählte Shopify-Variante (wie v5): Formular, dann ?variant=, dann Vorgabe des Containers. */
    function aktuelleShopVariante() {
      var form = warenkorbFormular();
      if (form) {
        var c = form.querySelector('[name="id"]:checked') || form.querySelector('[name="id"]');
        if (c) return c.value && !c.disabled ? c.value : null;
      }
      try {
        var q = new URLSearchParams(window.location.search).get('variant');
        if (q) return q;
      } catch (e) { /* egal */ }
      return standardVariante || null;
    }
    /** Zuordnung Shopify-Variante → { pv: Printful-Variante, m: Printful-Produkt }; null, wenn der Karte die Variante unbekannt ist. */
    function zuordnungFuer(shopId) {
      if (shopId == null) return null;
      var k = String(shopId);
      if (buendel) return wurzel.zuordnung[k] || null;
      if (karte.shop[k] != null) return { pv: Number(karte.shop[k]), m: karte.printfulProductId };
      return null;
    }
    function pfVarianteFuer(shopId) {
      var z = zuordnungFuer(shopId);
      if (z) return z.pv;
      if (buendel) return null;
      var d = container.getAttribute('data-pf-variant');
      return d && isFinite(Number(d)) ? Number(d) : null;
    }
    /** Ist für die gewählte Variante bekannt, welche Druckdatei gilt? Sonst wird der Kauf gesperrt (es gibt nie still die Standardgeometrie). */
    function ausfuehrungOk() {
      if (legacy) return true;
      if (buendel) return !!zuordnungFuer(st.shopVariante);
      if (Object.keys(karte.shop).length && st.pfVariante == null) return false;
      if (mehrereGeometrien() && st.pfVariante == null) return false;
      if (st.pfVariante != null && Object.keys(karte.varianten).length && !karte.varianten[st.pfVariante]) return false;
      return true;
    }
    /** Bei einem Bündel die Karte des Modells der gewählten Variante einsetzen. Gibt true zurück, wenn das Modell gewechselt hat (die Oberfläche muss dann neu gebaut werden). */
    function modellAnpassen() {
      if (!buendel) return false;
      var z = zuordnungFuer(st.shopVariante);
      var neu = z && wurzel.modelle[z.m];
      if (!neu || neu === karte) return false;
      karte = neu;
      if (!platzierungIn(karte, st.aktiv) && !(st.ebenen[st.aktiv] && st.ebenen[st.aktiv].length)) st.aktiv = karte.platzierungen[0].id;
      return true;
    }
    /** Variante neu lesen; true, wenn sich die Geometrie ändern könnte. */
    function variantenLesen() {
      var neu = aktuelleShopVariante();
      var pf = pfVarianteFuer(neu);
      var geaendert = neu !== st.shopVariante || pf !== st.pfVariante;
      st.shopVariante = neu;
      st.pfVariante = pf;
      return geaendert;
    }
    /** Geometrie einer Platzierung für die Variante (Vorgabe: die gewählte; beim Bau der Druckdateien die eingefrorene). */
    function geo(p, pfV) {
      var pv = pfV !== undefined ? pfV : (eingefroren ? eingefroren.pv : st.pfVariante);
      var g = geometrieFuer(karte, p, pv);
      return { printfile: g.printfile, vorlage: g.vorlage, masse: legacy ? null : dateiMasse(g.printfile), render: renderGroesse(g.printfile, maxPixel) };
    }

    // ── Rückmeldung ─────────────────────────────────────────────────────────────────────────────
    function meldung(text, art) {
      ui.status.textContent = text || '';
      ui.status.className = 'lsp6-status' + (art ? ' ' + art : '');
    }

    // ── Bühne: Vorlage, Druckfläche, Fenster ────────────────────────────────────────────────────
    function bildSetzen(img, url) {
      if (url) {
        if (img.getAttribute('src') !== url) img.setAttribute('src', url);
        img.hidden = false;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
      }
    }
    function legacyBild() {
      if (legacy && st.shopVariante && karte.imgMap[st.shopVariante]) return karte.imgMap[st.shopVariante];
      return pAktiv().vorlage.bildUrl;
    }
    function buehneAufbauen() {
      var p = pAktiv();
      geoAktiv = geo(p);
      var vl = geoAktiv.vorlage;
      if (legacy) {
        ui.stage.style.setProperty('--asp', String(vl.vorlageBreite / vl.vorlageHoehe));
        ui.stage.style.background = '#f4f1ec';
        ui.bg.style.cssText = 'left:0;top:0;width:100%;height:100%;object-fit:cover';
        bildSetzen(ui.bg, legacyBild());
        bildSetzen(ui.tpl, null);
        ui.host.style.cssText = 'left:0;top:0;width:100%;height:100%';
        ui.frame.hidden = true; ui.tag.hidden = true;
        ui.veil.forEach(function (v) { v.hidden = true; });
        return;
      }
      var w = sichtfenster(vl, st.ansicht);
      ui.stage.style.setProperty('--asp', String(w.w / w.h));
      // Gewählte Variantenfarbe statt der Beispielfarbe der Vorlage (nur wo die Vorlage eine Farbfläche/Textur trägt; das Schattenbild liegt darüber)
      var eigeneFarbe = st.pfVariante != null && karte.farbeVon[st.pfVariante] && (vl.hintergrundUrl || vl.hintergrundFarbe) ? karte.farbeVon[st.pfVariante] : null;
      ui.stage.style.background = eigeneFarbe || vl.hintergrundFarbe || '#f4f1ec';
      var lage = 'left:' + PCT((0 - w.x) / w.w) + ';top:' + PCT((0 - w.y) / w.h) + ';width:' + PCT(vl.vorlageBreite / w.w) + ';height:' + PCT(vl.vorlageHoehe / w.h);
      ui.bg.style.cssText = lage;
      ui.tpl.style.cssText = lage;
      bildSetzen(ui.bg, eigeneFarbe ? null : (vl.hintergrundUrl || null));
      bildSetzen(ui.tpl, vl.bildUrl || null);
      var fl = (vl.flaecheLinks - w.x) / w.w, fo = (vl.flaecheOben - w.y) / w.h, fb = vl.flaecheBreite / w.w, fh = vl.flaecheHoehe / w.h;
      var box = 'left:' + PCT(fl) + ';top:' + PCT(fo) + ';width:' + PCT(fb) + ';height:' + PCT(fh);
      ui.host.style.cssText = box;
      ui.frame.style.cssText = box;
      ui.frame.hidden = false;
      // Vorhang um die Druckfläche: oben, unten, links, rechts
      var v = ui.veil;
      v[0].style.cssText = 'left:0;top:0;width:100%;height:' + PCT(Math.max(0, fo));
      v[1].style.cssText = 'left:0;top:' + PCT(Math.min(1, fo + fh)) + ';width:100%;height:' + PCT(Math.max(0, 1 - fo - fh));
      v[2].style.cssText = 'left:0;top:' + PCT(Math.max(0, fo)) + ';width:' + PCT(Math.max(0, fl)) + ';height:' + PCT(Math.min(1, fo + fh) - Math.max(0, fo));
      v[3].style.cssText = 'left:' + PCT(Math.min(1, fl + fb)) + ';top:' + PCT(Math.max(0, fo)) + ';width:' + PCT(Math.max(0, 1 - fl - fb)) + ';height:' + PCT(Math.min(1, fo + fh) - Math.max(0, fo));
      v.forEach(function (x) { x.hidden = false; });
      if (geoAktiv.masse) {
        ui.tag.textContent = fmt(karte.klasse === 'PANEL' ? T.sheetInfo : T.areaInfo, { w: zahlAnzeige(geoAktiv.masse.breite, 1), h: zahlAnzeige(geoAktiv.masse.hoehe, 1) });
        ui.tag.style.left = 'calc(' + PCT(Math.max(0, fl)) + ' + 4px)';
        ui.tag.style.top = 'calc(' + PCT(Math.max(0, fo)) + ' + 4px)';
        ui.tag.hidden = false;
      } else ui.tag.hidden = true;
      vorschauPlanen();
    }
    function metaAktualisieren() {
      var teile = [];
      var g = geoAktiv;
      if (legacy) { ui.metaText.textContent = ''; ui.viewBtn.hidden = true; return; }
      if (g.masse) teile.push(fmt(karte.klasse === 'PANEL' ? T.sheetInfo : T.areaInfo, { w: zahlAnzeige(g.masse.breite, 1), h: zahlAnzeige(g.masse.hoehe, 1) }));
      var pf = g.printfile;
      teile.push(pf.dpi >= 10 ? fmt(T.fileInfo, { w: pf.breitePx, h: pf.hoehePx, dpi: zahlAnzeige(pf.dpi, 0) }) : fmt(T.fileInfoNoDpi, { w: pf.breitePx, h: pf.hoehePx }));
      ui.metaText.textContent = teile.join(' \xB7 ');
      if (g.render.k < 1) {
        ui.cap.textContent = fmt(T.capNote, { w: g.render.w, h: g.render.h, dpi: pf.dpi >= 10 ? zahlAnzeige(pf.dpi * g.render.k, 0) : '?' });
        ui.cap.hidden = false;
      } else ui.cap.hidden = true;
      ui.viewBtn.hidden = st.sicht === 'produkt';   // der Zoom gehört zur Bühne, nicht zur Produktansicht
      ui.viewBtn.textContent = st.ansicht === 'flaeche' ? T.viewWhole : T.viewArea;
    }
    function bereichGroesse() {
      var r = ui.host.getBoundingClientRect();
      return { w: r.width || 1, h: r.height || 1, r: r };
    }

    // ── Ebenen auf der Bühne ────────────────────────────────────────────────────────────────────
    function knotenBauen(e) {
      var root = el('div', { class: 'lsp6-layer', 'data-lid': e.id });
      var content;
      if (e.type === 'text') content = el('div', { style: 'white-space:pre;font-weight:800;line-height:1.05;text-align:center;pointer-events:none' });
      else { content = el('img', { alt: '', style: 'display:block;pointer-events:none;-webkit-user-drag:none' }); content.src = e.src; }
      var frame = el('div', { class: 'lsp6-sel-frame' });
      var handle = el('div', { class: 'lsp6-handle', text: '⤡', title: EN ? 'Resize and rotate' : 'Skalieren und drehen' });
      var del = el('div', { class: 'lsp6-del', text: '✕', title: EN ? 'Delete' : 'Löschen', role: 'button' });
      [frame, handle, del].forEach(function (n) { n.hidden = true; root.appendChild(n); });
      root.insertBefore(content, frame);
      ui.host.appendChild(root);
      knoten[e.id] = { root: root, content: content, frame: frame, handle: handle, del: del };
      zeigerAnbinden(e, root, handle, del);
      return knoten[e.id];
    }
    function knotenZeichnen(e) {
      var k = knoten[e.id];
      if (!k) return;
      var a = bereichGroesse();
      var s = k.content.style;
      if (e.type === 'text') {
        var px = schriftPx(e, a.w);
        k.content.textContent = e.text || T.ph;
        s.fontFamily = schriftNach(e.font).css;
        s.color = e.color;
        s.fontSize = px + 'px';
        s.opacity = String((e.text ? 1 : 0.45) * deckkraft(e));
        s.textShadow = e.color.toLowerCase() === '#ffffff' ? '0 1px 3px rgba(0,0,0,.45)' : 'none';
        s.letterSpacing = (e.ls || 0) * px + 'px';
        s.webkitTextStroke = (e.outl || 0) * px * 2 + 'px ' + (e.outc || '#ffffff');
        s.paintOrder = 'stroke fill';
        s.fontWeight = e.bold === false ? '400' : '800';
        s.fontStyle = e.italic ? 'italic' : 'normal';
        s.lineHeight = String(zeilenhoehe(e));
        s.textAlign = ausrichtung(e);
      } else {
        s.width = bildBreitePx(e, a.w) + 'px';
        s.height = 'auto';
        s.opacity = String(deckkraft(e));
      }
      k.root.style.transform = 'translate(' + (e.cx * a.w) + 'px,' + (e.cy * a.h) + 'px) translate(-50%,-50%) rotate(' + e.rot + 'deg)';
      vorschauPlanen();
    }
    function alleZeichnen() { ebenenAktiv().forEach(knotenZeichnen); }
    function knotenLoeschen() {
      Object.keys(knoten).forEach(function (id) { knoten[id].root.remove(); });
      knoten = {};
    }
    function knotenNeuAufbauen() {
      knotenLoeschen();
      ebenenAktiv().forEach(function (e) { knotenBauen(e); knotenZeichnen(e); });
      zOrdnen();
    }
    /** z-Reihenfolge wie die Liste (v5): unterste Ebene zuerst. */
    function zOrdnen() {
      ebenenAktiv().forEach(function (e, i) {
        var k = knoten[e.id];
        if (k) { k.root.style.zIndex = String(2 + i); ui.host.appendChild(k.root); }
      });
    }

    // ── Auswahl und Bedienfelder ────────────────────────────────────────────────────────────────
    function waehlen(id) {
      st.sel = id;
      Object.keys(knoten).forEach(function (lid) {
        var an = lid === id;
        knoten[lid].frame.hidden = !an; knoten[lid].handle.hidden = !an; knoten[lid].del.hidden = !an;
        knoten[lid].root.classList.toggle('sel', an);
      });
      felderAktualisieren();
    }
    function abwaehlen() { waehlen(null); }

    /** Welche Bedienfelder sind sichtbar, und was steht darin: abhängig von der gewählten Ebene. */
    function felderAktualisieren() {
      var e = gewaehlt();
      var istText = !!e && e.type === 'text';
      var istBild = !!e && e.type === 'image';
      ui.pText.hidden = !istText;
      ui.pTextStil.hidden = !istText;
      ui.pGroesse.hidden = !e;
      ui.pDrehen.hidden = !e;
      ui.pExakt.hidden = !e;
      ui.zeileDruckgroesse.hidden = !e;
      ui.zeileAktionen.hidden = !e;
      ui.zeileBild.hidden = !istBild;
      if (!istBild) ui.pFilter.hidden = true;
      if (e) {
        ui.rangeGroesse.value = e.scale;
        ui.rangeDrehen.value = Math.round(e.rot) || 0;
        ui.drehenWert.textContent = (Math.round(e.rot) || 0) + '\xB0';
      }
      if (istText) {
        ui.textfeld.value = e.text || '';
        ui.schriftwahl.value = e.font;
        if (/^#[0-9a-f]{6}$/i.test(e.color)) ui.farbwahl.value = e.color;
        farbeMarkieren(e.color);
        ui.rangeAbstand.value = e.ls || 0;
        ui.rangeKontur.value = e.outl || 0;
        ui.konturFarbe.value = e.outc || '#ffffff';
        ui.rangeZeilen.value = zeilenhoehe(e);
      }
      werteSetzen(e);
      hinweiseAktualisieren();
      aufloesungPruefen(e);
      ebenenLeisteNeu();
      formularSynchronisieren();
    }
    function farbeMarkieren(farbe) {
      Array.prototype.forEach.call(ui.farben.children, function (b) {
        if (b.tagName !== 'BUTTON') return;
        var an = b.getAttribute('data-c') === farbe;
        b.style.border = '2px solid ' + (an ? '#16151a' : '#cfc8bb');
        b.style.transform = an ? 'scale(1.12)' : 'none';
        b.textContent = an ? '✓' : '';
      });
    }
    function umschalter(knopfEl, an) { knopfEl.setAttribute('aria-pressed', an ? 'true' : 'false'); }

    // Zahlenfelder: cm und mm, wenn die Druckdatei eine belastbare dpi hat, sonst Prozent (wie v5)
    function werteSetzen(e) {
      if (!e) return;
      var m = geoAktiv && geoAktiv.masse;
      var f = ui.felder;
      var text = e.type === 'text';
      if (m) {
        f.x.input.value = schweizerZahl(e.cx * m.breite, 1).replace(',', '.');
        f.y.input.value = schweizerZahl(e.cy * m.hoehe, 1).replace(',', '.');
        f.x.label.textContent = T.fX; f.y.label.textContent = T.fY;
        f.x.input.min = '0'; f.x.input.max = String(Math.round(m.breite * 10) / 10); f.x.input.step = '0.1';
        f.y.input.min = '0'; f.y.input.max = String(Math.round(m.hoehe * 10) / 10); f.y.input.step = '0.1';
        if (text) {
          f.groesse.label.textContent = T.fFont;
          f.groesse.input.value = schweizerZahl(e.scale * 0.12 * m.breite * 10, 1).replace(',', '.');
          f.groesse.input.min = String(Math.round(0.06 * 0.12 * m.breite * 100) / 10); f.groesse.input.max = String(Math.round(3 * 0.12 * m.breite * 100) / 10); f.groesse.input.step = '0.5';
        } else {
          f.groesse.label.textContent = T.fWidth;
          f.groesse.input.value = schweizerZahl(e.scale * 0.5 * m.breite, 1).replace(',', '.');
          f.groesse.input.min = String(Math.round(0.06 * 0.5 * m.breite * 10) / 10); f.groesse.input.max = String(Math.round(3 * 0.5 * m.breite * 10) / 10); f.groesse.input.step = '0.1';
        }
      } else {
        f.x.label.textContent = T.fXp; f.y.label.textContent = T.fYp; f.groesse.label.textContent = T.fSize;
        f.x.input.value = prozent1(e.cx); f.y.input.value = prozent1(e.cy); f.groesse.input.value = Math.round(e.scale * 1e3) / 10;
        f.x.input.min = '0'; f.x.input.max = '100'; f.x.input.step = '0.5';
        f.y.input.min = '0'; f.y.input.max = '100'; f.y.input.step = '0.5';
        f.groesse.input.min = '6'; f.groesse.input.max = '300'; f.groesse.input.step = '1';
      }
      f.rot.input.value = Math.round(e.rot * 10) / 10;
      f.op.input.value = Math.round(deckkraft(e) * 100);
    }
    /** Eingaben der Zahlenfelder auf die gewählte Ebene anwenden (Werte in cm/mm oder %). */
    function werteAnwenden() {
      var e = gewaehlt();
      if (!e) return;
      var m = geoAktiv && geoAktiv.masse;
      var f = ui.felder;
      function zahl(feld, min, max) {
        var n = parseFloat(String(feld.input.value).replace(',', '.'));
        return isNaN(n) ? null : bereich(min, max, n);
      }
      var v;
      if (m) {
        if ((v = zahl(f.x, 0, m.breite)) !== null) e.cx = v / m.breite;
        if ((v = zahl(f.y, 0, m.hoehe)) !== null) e.cy = v / m.hoehe;
        if (e.type === 'text') { if ((v = zahl(f.groesse, 0.06 * 0.12 * m.breite * 10, 3 * 0.12 * m.breite * 10)) !== null) e.scale = v / (0.12 * m.breite * 10); }
        else if ((v = zahl(f.groesse, 0.06 * 0.5 * m.breite, 3 * 0.5 * m.breite)) !== null) e.scale = v / (0.5 * m.breite);
      } else {
        if ((v = zahl(f.x, 0, 100)) !== null) e.cx = v / 100;
        if ((v = zahl(f.y, 0, 100)) !== null) e.cy = v / 100;
        if ((v = zahl(f.groesse, 6, 300)) !== null) e.scale = v / 100;
      }
      if ((v = zahl(f.rot, -180, 180)) !== null) e.rot = v;
      if ((v = zahl(f.op, 0, 100)) !== null) e.op = v / 100;
      knotenZeichnen(e);
      aufloesungPruefen(e);
      formularSynchronisieren();
    }

    // ── Auflösung, Hinweise, Aufpreise ──────────────────────────────────────────────────────────
    /** Anzeige der Auflösung der gewählten Ebene UND Neuberechnung des Qualitätstors (alle Fotos aller Platzierungen). */
    function aufloesungPruefen(e) { aufloesungAnzeigen(e); qualitaetPruefen(); }
    function aufloesungAnzeigen(e) {
      var box = ui.dpiBox;
      if (!e || e.type !== 'image' || !ausschnittBreitePx(e)) { box.hidden = true; return; }
      if (legacy) {
        var schwach = ausschnittBreitePx(e) > 0 && ausschnittBreitePx(e) < e.scale * karte.ref * 0.5 * 0.7;
        box.hidden = !schwach;
        box.className = 'lsp6-warn';
        box.textContent = T.legacyLow;
        return;
      }
      var g = geoAktiv;
      var d = bildDpi(e, g.printfile, g.render);
      if (d === null) { box.hidden = true; return; }
      var tief = d < karte.minDpi;
      var stufe = qualitaetStufe(d, karte.minDpi);
      var n = zahlAnzeige(dpiGanz(d, stufe), 0);
      // Zwischen dem Mindestwert und 150 dpi: gleiche Zeile wie bisher (Klasse lsp6-ok bleibt), dazu die Warnung «mittel» in Bernsteinfarbe; darunter sperrt das Qualitätstor den Kauf
      box.className = tief ? 'lsp6-warn' : (stufe === 'mittel' ? 'lsp6-ok lsp6-mid' : 'lsp6-ok');
      box.textContent = tief ? fmt(T.dpiLow, { n: n, min: zahlAnzeige(karte.minDpi, 0) })
        : fmt(T.dpiLine, { n: n, min: zahlAnzeige(karte.minDpi, 0) }) + (stufe === 'mittel' ? ' ' + fmt(T.dpiMid, { gut: DPI_GUT }) : '');
      box.hidden = false;
    }
    /** Wirkliche Auflösung aller Fotos aller Platzierungen der gewählten Ausführung (nur wo die Originalgrösse bekannt ist): kleinster Wert, Zahl der Fotos, Fotos unter dem Mindestwert. */
    function qualitaetLage() {
      var lage = { min: null, fotos: 0, sperren: [] };
      if (legacy) return lage;
      karte.platzierungen.forEach(function (p) {
        var g = geo(p);
        (st.ebenen[p.id] || []).forEach(function (e) {
          if (e.type !== 'image') return;
          var d = bildDpi(e, g.printfile, g.render);
          if (d === null) return;
          lage.fotos++;
          if (lage.min === null || d < lage.min) lage.min = d;
          if (qualitaetStufe(d, karte.minDpi) === 'sperre') lage.sperren.push({ p: p, e: e, dpi: d });
        });
      });
      lage.sperren.sort(function (a, b) { return a.dpi - b.dpi; });
      return lage;
    }
    /** Text der Kaufsperre (das schlechteste Foto zuerst); null, wenn alle Fotos genügen. */
    function qualitaetSperre() {
      var l = qualitaetLage();
      if (!l.sperren.length) return null;
      var s = l.sperren[0];
      return fmt(T.qSperre, { a: titelVon(s.p), n: zahlAnzeige(dpiGanz(s.dpi, 'sperre'), 0), min: zahlAnzeige(karte.minDpi, 0) });
    }
    function qualitaetPruefen() {
      if (!ui.qBox) return;
      var text = qualitaetSperre();
      ui.qBox.textContent = text || '';
      ui.qBox.hidden = !text;
      if (text) ui.cta.setAttribute('aria-disabled', 'true'); else ui.cta.removeAttribute('aria-disabled');
    }
    function hinweisText(h) {
      if (h.kundentext && !EN) return h.kundentext;
      if (h.kundentextEn && EN) return h.kundentextEn;
      var t = HINWEIS_TEXTE[h.code];
      if (t) return EN ? t.en : t.de;
      return h.art === 'einschraenkung' && h.text ? h.text : null;
    }
    function hinweiseAktualisieren() {
      var box = ui.hinweise;
      box.textContent = '';
      if (legacy) return;
      var gesehen = {};
      var zeilen = [];
      karte.hinweise.forEach(function (h) {
        if (!h || (h.art !== 'einschraenkung' && !HINWEIS_TEXTE[h.code])) return;
        var t = hinweisText(h);
        if (t && !gesehen[t]) { gesehen[t] = true; zeilen.push(t); }
      });
      if (karte.klasse === 'PANEL') zeilen.push(T.panelHint);
      var p = pAktiv();
      var hatBild = ebenenAktiv().some(function (e) { return e.type === 'image'; });
      if (p && p.technik === 'EMBROIDERY' && hatBild) zeilen.push(T.embroPhoto);
      zeilen.forEach(function (t) { box.appendChild(el('p', { class: 'lsp6-hint', text: t })); });
    }
    function aufpreisSummeAktualisieren() {
      var box = ui.summe;
      box.textContent = '';
      if (legacy) { box.hidden = true; return; }
      var zeilen = [];
      var summe = 0;
      karte.platzierungen.forEach(function (p) {
        var ap = platzierungAufpreisChf(p);
        if (ap > 0 && st.ebenen[p.id].length) { zeilen.push(titelVon(p) + ': + CHF ' + chfText(ap)); summe += ap; }
      });
      if (!zeilen.length) { box.hidden = true; return; }
      box.appendChild(el('b', { text: T.sumHead }));
      zeilen.forEach(function (z) { box.appendChild(el('div', { text: z })); });
      box.appendChild(el('b', { text: fmt(T.sumTotal, { x: chfText(summe) }) }));
      box.appendChild(el('small', { text: T.sumNote }));
      box.hidden = false;
    }

    // ── Reiter (Platzierungen) ──────────────────────────────────────────────────────────────────
    /** Erklärung, warum ein Reiter gesperrt ist: direkt unter den Reitern, wo man hinschaut (nicht erst unter dem Warenkorb-Knopf). */
    function reiterHinweis(text) {
      ui.tabHinweis.textContent = text || '';
      ui.tabHinweis.hidden = !text;
    }
    function blockiertDurch(id) { return blockierer(karte, id, st.ebenen); }
    function tabsAufbauen() {
      ui.tabs.textContent = '';
      ui.tabKnoepfe = {};
      var ids = tabIds();
      ui.tabIdsGebaut = ids.join('|');
      if (ids.length < 2) { ui.tabs.hidden = true; return; }
      ui.tabs.hidden = false;
      ids.forEach(function (id) {
        var p = platzierung(id);
        var fremd = !platzierungIn(karte, id);
        var b = el('button', { type: 'button', class: 'lsp6-tab' + (fremd ? ' fremd' : ''), role: 'tab', 'data-p': p.id, 'aria-selected': 'false', tabindex: '-1' });
        if (fremd) { b.setAttribute('data-fremd', '1'); b.title = T.orphanTitle; }
        b.appendChild(el('span', { text: titelVon(p) }));
        var ap = fremd ? 0 : platzierungAufpreisChf(p);
        if (fremd) b.appendChild(el('small', { text: T.notPossible }));
        else if (ap > 0) b.appendChild(el('small', { text: T.extra + ' + CHF ' + chfText(ap) }));
        ui.tabKnoepfe[p.id] = b;
        ui.tabs.appendChild(b);
      });
      tabsAktualisieren();
    }
    /** Der aktive Reiter soll im Sichtfeld der Leiste liegen: gemessen an den echten Rechtecken (offsetLeft bezieht sich auf den nächsten positionierten Vorfahren, nicht auf die Leiste). */
    function aktivenReiterZeigen(b) {
      var t = ui.tabs;
      if (!(t.scrollWidth > t.clientWidth)) return;
      var tr = t.getBoundingClientRect(), br = b.getBoundingClientRect();
      var links = br.left - tr.left + t.scrollLeft;
      t.scrollLeft = Math.max(0, links - (t.clientWidth - br.width) / 2);
    }
    function tabsAktualisieren() {
      if (ui.tabIdsGebaut !== tabIds().join('|')) { tabsAufbauen(); return; }   // eine fremde Platzierung ist dazugekommen oder weggefallen
      tabIds().forEach(function (id) {
        var p = platzierung(id);
        var b = ui.tabKnoepfe[p.id];
        if (!b) return;
        var an = p.id === st.aktiv;
        var block = !an && blockiertDurch(p.id).length > 0;
        b.setAttribute('aria-selected', an ? 'true' : 'false');
        b.setAttribute('tabindex', an ? '0' : '-1');
        if (an) aktivenReiterZeigen(b);
        if (block) {
          b.setAttribute('aria-disabled', 'true');
          b.title = fmt(T.lockTitle, { b: blockiertDurch(p.id).map(function (q) { return titelVon(platzierung(q)); }).join(', ') });
        } else { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); }
        var punkt = b.querySelector('.dot');
        var hat = st.ebenen[p.id].length > 0;
        if (hat && !punkt) b.firstChild.appendChild(el('i', { class: 'dot', 'aria-hidden': 'true' }));
        if (!hat && punkt) punkt.remove();
      });
      modellHinweisAktualisieren();
    }
    /** Dauerhafter Hinweis unter den Reitern: Motiv auf einer Platzierung, die es bei dieser Ausführung nicht gibt, oder Ausführung ohne Zuordnung. */
    function modellHinweisAktualisieren() {
      if (!ui.modellNote) return;
      var fremde = fremdeMitEbenen();
      var text = '';
      if (fremde.length) text = fmt(T.orphan, { a: fremde.map(function (id) { return titelVon(platzierung(id)); }).join(', ') });
      else if (!ausfuehrungOk()) text = T.noMap;
      ui.modellNote.textContent = text;
      ui.modellNote.hidden = !text;
    }
    /** Die aktive Platzierung wechseln. Gibt false zurück, wenn eine kollidierende Platzierung schon Ebenen trägt. */
    function platzierungWechseln(id) {
      if (id === st.aktiv) return true;
      var p = platzierung(id);
      if (!p) return false;
      var b = blockiertDurch(id);
      if (b.length) {
        reiterHinweis(fmt(T.blocked, { a: titelVon(p), b: b.map(function (q) { return titelVon(platzierung(q)); }).join(', ') }));
        return false;
      }
      abwaehlen();
      knotenLoeschen();
      st.aktiv = id;
      buehneAufbauen();
      metaAktualisieren();
      knotenNeuAufbauen();
      tabsAktualisieren();
      felderAktualisieren();
      meldung('');
      reiterHinweis('');
      return true;
    }
    /** Nach Rückgängig/Wiederholen: ist die aktive Platzierung noch erlaubt? Sonst auf die erste mit Ebenen (oder die erste) umschalten. */
    function aktivePruefen() {
      if (!blockiertDurch(st.aktiv).length) return;
      var ziel = karte.platzierungen.filter(function (p) { return st.ebenen[p.id].length; })[0] || karte.platzierungen[0];
      st.aktiv = ziel.id;   // gesperrt war die aktive nur wegen einer Platzierung des gewählten Modells: die Auswahl bleibt innerhalb von ihm
    }

    // ── Ebenenliste ─────────────────────────────────────────────────────────────────────────────
    function ebenenName(e) {
      if (e.type === 'text') return T.layerText + ': ' + ((e.text || '').split('\n')[0].slice(0, 12) || '…');
      return e.type === 'sticker' ? T.layerSticker : T.layerImage;
    }
    function ebenenLeisteNeu() {
      var box = ui.chips;
      box.textContent = '';
      var liste = ebenenAktiv();
      if (!liste.length) { box.appendChild(el('span', { text: T.noLayers, style: 'font-size:12px;color:#5b5a62;align-self:center;white-space:nowrap' })); return; }
      for (var i = liste.length - 1; i >= 0; i--) {
        (function (e) {
          var b = el('button', { type: 'button', class: 'lsp6-chip', text: ebenenName(e), 'aria-pressed': e.id === st.sel ? 'true' : 'false' });
          b.addEventListener('click', function () { waehlen(e.id); });
          box.appendChild(b);
        })(liste[i]);
      }
    }
    function ebeneVerschieben(richtung) {
      var liste = ebenenAktiv();
      var i = -1;
      for (var n = 0; n < liste.length; n++) if (liste[n].id === st.sel) { i = n; break; }
      var j = i + richtung;
      if (i < 0 || j < 0 || j >= liste.length) return;
      var t = liste[i]; liste[i] = liste[j]; liste[j] = t;
      zOrdnen(); ebenenLeisteNeu(); formularSynchronisieren(); speichern();
    }
    function ganzNachVorneHinten(vorne) {
      var liste = ebenenAktiv();
      var i = -1;
      for (var n = 0; n < liste.length; n++) if (liste[n].id === st.sel) { i = n; break; }
      if (i < 0) return;
      var e = liste.splice(i, 1)[0];
      if (vorne) liste.push(e); else liste.unshift(e);
      zOrdnen(); speichern(); ebenenLeisteNeu(); formularSynchronisieren();
    }
    function ebeneHinzufuegen(e) {
      if (!platzierungIn(karte, st.aktiv)) {   // fremde Platzierung (gibt es bei dieser Ausführung nicht): dort kann man nur entfernen, nichts hinzufügen
        meldung(fmt(T.orphan, { a: titelVon(platzierung(st.aktiv)) }), 'err');
        return;
      }
      ebenenAktiv().push(e);
      knotenBauen(e); knotenZeichnen(e); waehlen(e.id); zOrdnen(); tabsAktualisieren(); aufpreisSummeAktualisieren(); speichern();
    }
    /** Ist die aktive Platzierung noch Teil des gewählten Modells (oder trägt sie noch Ebenen)? Sonst auf die erste Platzierung des Modells umschalten. true = umgeschaltet. */
    function aktivGueltigHalten() {
      if (platzierungIn(karte, st.aktiv)) return false;
      if (st.ebenen[st.aktiv] && st.ebenen[st.aktiv].length) return false;
      var ziel = karte.platzierungen.filter(function (p) { return st.ebenen[p.id].length; })[0] || karte.platzierungen[0];
      st.aktiv = ziel.id;
      return true;
    }
    function ebeneEntfernen(id) {
      var liste = ebenenAktiv();
      for (var i = 0; i < liste.length; i++) if (liste[i].id === id) { liste.splice(i, 1); break; }
      if (knoten[id]) { knoten[id].root.remove(); delete knoten[id]; }
      var umgeschaltet = false;
      if (st.sel === id) st.sel = null;
      if (aktivGueltigHalten()) { umgeschaltet = true; knotenLoeschen(); buehneAufbauen(); metaAktualisieren(); knotenNeuAufbauen(); }
      if (umgeschaltet || st.sel === null) abwaehlen(); else felderAktualisieren();
      tabsAktualisieren(); aufpreisSummeAktualisieren(); speichern();
    }
    function neuerText() {
      return { id: neueId(), type: 'text', text: '', font: SCHRIFTEN[0].css, color: '#111111', cx: 0.5, cy: 0.42, scale: 0.55, rot: 0 };
    }
    function neuesBild(src, druckUrl, laedt) {
      return { id: neueId(), type: 'image', src: src, origSrc: src, printUrl: druckUrl || '', uploading: !!laedt, cx: 0.5, cy: 0.5, scale: 1, rot: 0, edit: neueBearbeitung() };
    }
    function neuerSticker(name) {
      var url = STICKER_BASIS + name + '.png';
      return { id: neueId(), type: 'sticker', name: name, src: url, printUrl: url, uploading: false, cx: 0.5, cy: 0.5, scale: 0.8, rot: 0 };
    }
    /** Ein Bild oder Sticker darf nicht grösser starten als die Druckfläche: nach dem Laden so einpassen, dass es höchstens 90 % der Fläche füllt. */
    function einpassen(e, nat) {
      if (legacy || !nat || !nat.w || !nat.h) return;
      var a = bereichGroesse();
      var breitePx = bildBreitePx(e, a.w);
      var hoehePx = breitePx * nat.h / nat.w;
      var faktor = Math.min(1, 0.9 * a.w / breitePx, 0.9 * a.h / hoehePx);
      if (faktor < 1) { e.scale = Math.max(0.06, e.scale * faktor); knotenZeichnen(e); if (st.sel === e.id) felderAktualisieren(); speichern(); }
    }

    // ── Rückgängig / Wiederholen ────────────────────────────────────────────────────────────────
    function kopieAllerEbenen() {
      var aus = {};
      Object.keys(st.ebenen).forEach(function (id) {
        aus[id] = st.ebenen[id].map(function (e) {
          var n = {};
          for (var k in e) n[k] = e[k];
          if (e.edit) { n.edit = {}; for (var k2 in e.edit) n.edit[k2] = e.edit[k2]; }
          return n;
        });
      });
      return aus;
    }
    /** Vergleichstext eines Standes: lange Bildadressen gekürzt, damit der Vergleich schnell bleibt. */
    function stand(s) {
      return JSON.stringify(s, function (k, v) { return (k === 'src' || k === 'origSrc' || k === 'printUrl') && typeof v === 'string' ? v.length + ':' + v.slice(-24) : v; });
    }
    function verlaufKnoepfe() {
      ui.undo.style.opacity = verlauf.idx > 0 ? '1' : '0.45';
      ui.redo.style.opacity = verlauf.idx < verlauf.stack.length - 1 ? '1' : '0.45';
    }
    function speichern() {
      var s = kopieAllerEbenen();
      if (verlauf.idx >= 0 && stand(verlauf.stack[verlauf.idx]) === stand(s)) return;
      verlauf.stack = verlauf.stack.slice(0, verlauf.idx + 1);
      verlauf.stack.push(s);
      if (verlauf.stack.length > MAX_ZURUECK) verlauf.stack.shift();
      verlauf.idx = verlauf.stack.length - 1;
      verlaufKnoepfe();
    }
    function speichernVerzoegert() { clearTimeout(feinTimer); feinTimer = setTimeout(speichern, 700); }
    function wiederherstellen(s) {
      var neu = {};
      Object.keys(s).forEach(function (id) {
        neu[id] = s[id].map(function (e) {
          var n = {};
          for (var k in e) n[k] = e[k];
          if (e.edit) { n.edit = {}; for (var k2 in e.edit) n.edit[k2] = e.edit[k2]; }
          n.uploading = false;
          if (n.type === 'image' && !n._origW && origMass[n.id]) { n._origW = origMass[n.id].w; n._origH = origMass[n.id].h; }   // Stand von vor dem Laden des Fotos: Grösse aus dem Zwischenspeicher
          return n;
        });
      });
      var merke = st.sel;
      st.ebenen = neu;
      aktivePruefen();
      aktivGueltigHalten();
      knotenLoeschen();
      buehneAufbauen();
      metaAktualisieren();
      knotenNeuAufbauen();
      tabsAktualisieren();
      aufpreisSummeAktualisieren();
      st.sel = null;
      if (merke && ebeneMitId(merke)) waehlen(merke); else felderAktualisieren();
      verlaufKnoepfe();
    }
    function zurueck() { if (verlauf.idx > 0) { verlauf.idx--; wiederherstellen(verlauf.stack[verlauf.idx]); } }
    function wiederholen() { if (verlauf.idx < verlauf.stack.length - 1) { verlauf.idx++; wiederherstellen(verlauf.stack[verlauf.idx]); } }

    // ── Zeiger: Ziehen, Skalieren/Drehen am Griff, Zwei-Finger-Geste ────────────────────────────
    function zeigerAnbinden(e, root, handle, del) {
      var zeiger = {};
      var modus = null;
      function mitte() {
        var a = bereichGroesse();
        return { x: e.cx * a.w + a.r.left, y: e.cy * a.h + a.r.top };
      }
      function runter(ev, amGriff) {
        ev.preventDefault(); ev.stopPropagation();
        waehlen(e.id);
        try { ui.karte.focus({ preventScroll: true }); } catch (x1) { /* egal */ }
        try { (amGriff ? handle : root).setPointerCapture(ev.pointerId); } catch (x2) { /* egal */ }
        zeiger[ev.pointerId] = { x: ev.clientX, y: ev.clientY, handle: amGriff };
        var ids = Object.keys(zeiger);
        if (ids.length === 2) {
          var p1 = zeiger[ids[0]], p2 = zeiger[ids[1]];
          modus = { art: 'pinch', d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, w0: Math.atan2(p2.y - p1.y, p2.x - p1.x), scale0: e.scale, rot0: e.rot };
        } else if (amGriff) {
          var c = mitte();
          modus = { art: 'griff', cx: c.x, cy: c.y, d0: Math.hypot(ev.clientX - c.x, ev.clientY - c.y) || 1, w0: Math.atan2(ev.clientY - c.y, ev.clientX - c.x), scale0: e.scale, rot0: e.rot };
        } else {
          var a = bereichGroesse();
          modus = { art: 'ziehen', px: ev.clientX, py: ev.clientY, cx0: e.cx, cy0: e.cy, sw: a.w, sh: a.h };
        }
      }
      function bewegt(ev) {
        if (!modus || !(ev.pointerId in zeiger)) return;
        ev.preventDefault();
        zeiger[ev.pointerId].x = ev.clientX; zeiger[ev.pointerId].y = ev.clientY;
        if (modus.art === 'pinch') {
          var ids = Object.keys(zeiger);
          if (ids.length < 2) return;
          var p1 = zeiger[ids[0]], p2 = zeiger[ids[1]];
          e.scale = bereich(0.06, 3, modus.scale0 * (Math.hypot(p1.x - p2.x, p1.y - p2.y) / modus.d0));
          e.rot = modus.rot0 + (Math.atan2(p2.y - p1.y, p2.x - p1.x) - modus.w0) * 180 / Math.PI;
        } else if (modus.art === 'griff') {
          e.scale = bereich(0.06, 3, modus.scale0 * (Math.hypot(ev.clientX - modus.cx, ev.clientY - modus.cy) / modus.d0));
          e.rot = modus.rot0 + (Math.atan2(ev.clientY - modus.cy, ev.clientX - modus.cx) - modus.w0) * 180 / Math.PI;
        } else {
          e.cx = bereich(0, 1, modus.cx0 + (ev.clientX - modus.px) / modus.sw);
          e.cy = bereich(0, 1, modus.cy0 + (ev.clientY - modus.py) / modus.sh);
          // Einrasten in der Mitte der Druckfläche
          var mx = Math.abs(e.cx - 0.5) < 0.008, my = Math.abs(e.cy - 0.5) < 0.008;
          ui.guideV.style.display = mx ? 'block' : 'none';
          ui.guideH.style.display = my ? 'block' : 'none';
          if (mx) e.cx = 0.5;
          if (my) e.cy = 0.5;
        }
        anzeigeLage(e);
        knotenZeichnen(e);
      }
      function hoch(ev) {
        delete zeiger[ev.pointerId];
        modus = null;
        if (st.sel === e.id) {
          ui.rangeGroesse.value = e.scale;
          ui.rangeDrehen.value = Math.round(e.rot) || 0;
          ui.drehenWert.textContent = (Math.round(e.rot) || 0) + '\xB0';
          aufloesungPruefen(e);
        }
        if (Object.keys(zeiger).length === 0) {
          geaendert(); werteSetzen(e);
          ui.guideV.style.display = 'none'; ui.guideH.style.display = 'none'; ui.readout.style.display = 'none';
          speichern();
        }
      }
      root.addEventListener('pointerdown', function (ev) { runter(ev, false); });
      handle.addEventListener('pointerdown', function (ev) { runter(ev, true); });
      root.addEventListener('pointermove', bewegt); handle.addEventListener('pointermove', bewegt);
      root.addEventListener('pointerup', hoch); root.addEventListener('pointercancel', hoch);
      handle.addEventListener('pointerup', hoch); handle.addEventListener('pointercancel', hoch);
      del.addEventListener('click', function (ev) { ev.stopPropagation(); ebeneEntfernen(e.id); });
      del.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
    }
    function anzeigeLage(e) {
      var m = geoAktiv && geoAktiv.masse;
      var lage = m ? 'X ' + zahlAnzeige(e.cx * m.breite, 1) + ' cm \xB7 Y ' + zahlAnzeige(e.cy * m.hoehe, 1) + ' cm' : 'X ' + prozent1(e.cx) + ' % \xB7 Y ' + prozent1(e.cy) + ' %';
      ui.readout.textContent = lage + ' \xB7 ' + Math.round(e.scale * 100) + ' % \xB7 ' + Math.round(e.rot) + '\xB0';
      ui.readout.style.display = 'block';
    }

    // ── Warenkorb-Eigenschaften ─────────────────────────────────────────────────────────────────
    var druckUrls = {};   // Platzierungs-ID → Cloudinary-Adresse der Druckdatei (erst nach «In den Warenkorb»)
    function beschreibung(id) {
      return st.ebenen[id].map(function (e) {
        return e.type === 'text' ? T.layerText + ': "' + (e.text || '').replace(/\n/g, ' / ') + '"' : e.type === 'sticker' ? T.layerSticker + ': ' + e.name : T.layerImage;
      }).join(' \xB7 ');
    }
    /** Kennung für die Auftragsabwicklung (beginnt mit «_», wird dem Kunden nicht angezeigt): Modell, Variante, genutzte Platzierungen, Aufpreis.
     *  Kurz gehalten (Shopify-Eigenschaften sind auf 255 Zeichen begrenzt, QUELLE Dritt-Anleitungen): `px` steht nur, wenn eine Druckdatei kleiner als das Printfile ist
     *  (Obergrenze oder Verkleinerung vor dem Upload), `dt` nur, wo der Dateityp von der Platzierungs-ID abweicht. */
    function podKarteWert(verwendet) {
      var ids = [], dt = {}, px = [], ap = 0, abweichend = false;
      var fix = eingefroren;
      verwendet.forEach(function (p) {
        ids.push(p.id);
        if (p.dateiTyp && p.dateiTyp !== p.id) dt[p.id] = p.dateiTyp;
        var g = geo(p);
        var rg = letzteGroesse[p.id] && fix ? letzteGroesse[p.id] : g.render;
        px.push(rg.w + 'x' + rg.h);
        if (rg.w !== g.printfile.breitePx || rg.h !== g.printfile.hoehePx) abweichend = true;
        ap += platzierungAufpreisChf(p);
      });
      var sv = fix ? fix.sv : st.shopVariante, pv = fix ? fix.pv : st.pfVariante;
      var o = { v: 6, m: karte.printfulProductId, pv: pv, sv: sv == null ? null : String(sv), pl: ids };
      if (Object.keys(dt).length) o.dt = dt;
      if (abweichend) o.px = px;
      var lage = qualitaetLage();   // qd: kleinste effektive Auflösung aller Fotos in dpi (abgerundet); fehlt, wenn kein Foto mit bekannter Grösse dabei ist
      if (lage.min !== null) o.qd = Math.floor(lage.min + 1e-9);
      o.ap = Math.round(ap * 100) / 100;
      return JSON.stringify(o);
    }
    function eigenschaften() {
      var props = {};
      if (legacy) {
        var zwei = karte.platzierungen.length > 1;
        karte.platzierungen.forEach(function (p, i) {
          if (!st.ebenen[p.id].length) return;
          var vor = zwei ? T.pSide[i] + ' \xB7 ' : '';
          var d = beschreibung(p.id);
          if (d) props[vor + T.pDesign] = d;
          if (druckUrls[p.id]) props[vor + T.pPrintFile] = druckUrls[p.id];
        });
        return props;
      }
      var verwendet = karte.platzierungen.filter(function (p) { return st.ebenen[p.id].length > 0; });
      verwendet.forEach(function (p) {
        var d = beschreibung(p.id);
        if (d) props['\u{1F3A8} Design (' + p.id + ')'] = d;
        if (druckUrls[p.id]) props['\u{1F5BC}\uFE0F Druckdatei (' + p.id + ')'] = druckUrls[p.id];
      });
      if (verwendet.length) props._pod_karte = podKarteWert(verwendet);
      if (verwendet.length && vorschauUrl) props._vorschau = vorschauUrl;   // Adresse des Vorschau-JPEG; die Bestellstrecke ignoriert den Schl\u00FCssel, die Warenkorb-Miniatur zeigt ihn (WP6)
      return props;
    }
    /** Eigenschaften als versteckte Felder im Warenkorb-Formular der Seite (wie v5), eigene Kennung data-lspod6. */
    function formularSynchronisieren() {
      vorschauPlanen(); entwurfPlanen();   // jede Änderung am Entwurf: Produktansicht neu zeichnen, Entwurf (verzögert) sichern
      var form = warenkorbFormular();
      if (!form) return;
      Array.prototype.forEach.call(form.querySelectorAll('input[data-lspod6="1"]'), function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      var p = eigenschaften();
      Object.keys(p).forEach(function (k) {
        var n = document.createElement('input');
        n.type = 'hidden'; n.setAttribute('data-lspod6', '1'); n.name = 'properties[' + k + ']'; n.value = p[k];
        form.appendChild(n);
      });
    }
    function geaendert() {
      if (!eingefroren) { druckUrls = {}; vorschauUrl = ''; }   // Adressen von früheren Druckdateien gehören zu einem älteren Stand des Entwurfs (während des Bauens der Druckdateien bleiben sie)
      ebenenLeisteNeu();
      formularSynchronisieren();
      aufpreisSummeAktualisieren();
      tabsAktualisieren();
    }

    // ── Druckdatei in echter Pixelgrösse ────────────────────────────────────────────────────────
    /** Alle Ebenen einer Platzierung auf eine Leinwand W × H zeichnen; Druckdatei und Vorschau teilen sich diesen Weg. vorschau = true: leere Texte werden übersprungen statt abgelehnt,
     *  Fotos und Sticker kommen in der Fassung der Bühne aus dem Zwischenspeicher (nicht als Druckdatei in voller Grösse). Gibt ein Versprechen zurück. */
    function ebenenZeichnen(ctx, liste, W, H, vorschau) {
      var kette = Promise.resolve();
      liste.forEach(function (e) {
        kette = kette.then(function () {
          var cx = e.cx * W, cy = e.cy * H;
          if (e.type === 'text') {
            if (!e.text || !e.text.trim()) { if (vorschau) return null; throw new Error(T.empty); }
            var px = schriftPx(e, W), zeilen = e.text.split('\n'), schritt = px * zeilenhoehe(e), aus = ausrichtung(e), breitest = 0;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(e.rot * Math.PI / 180);
            ctx.globalAlpha = deckkraft(e);
            ctx.font = schriftFuerLeinwand(e, px);
            ctx.fillStyle = e.color;
            ctx.textBaseline = 'middle';
            try { ctx.letterSpacing = (e.ls || 0) * px + 'px'; } catch (x2) { /* ältere Browser */ }
            zeilen.forEach(function (z) { breitest = Math.max(breitest, ctx.measureText(z).width); });
            ctx.textAlign = aus === 'left' ? 'left' : aus === 'right' ? 'right' : 'center';
            if (e.color.toLowerCase() === '#ffffff') { ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = px * 0.12; }
            var x0 = aus === 'left' ? -breitest / 2 : aus === 'right' ? breitest / 2 : 0;
            var y0 = -(zeilen.length - 1) * schritt / 2;
            zeilen.forEach(function (z, i) {
              var y = y0 + i * schritt;
              if (e.outl > 0) { ctx.lineJoin = 'round'; ctx.lineWidth = e.outl * px * 2; ctx.strokeStyle = e.outc || '#ffffff'; ctx.strokeText(z, x0, y); }
              ctx.fillText(z, x0, y);
            });
            ctx.restore();
            return null;
          }
          function zeichne(bild) {
            var bw = bildBreitePx(e, W), bh = bw * ((bild.height / bild.width) || 1);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(e.rot * Math.PI / 180);
            ctx.globalAlpha = deckkraft(e);
            ctx.drawImage(bild, -bw / 2, -bh / 2, bw, bh);
            ctx.restore();
          }
          if (vorschau) return ebenenBild(e).then(function (bild) { if (bild) zeichne(bild); });   // Vorschau: Bild der Bühne, zwischengespeichert
          if (e.type === 'sticker') return bildLaden(stickerQuelle(e.src)).then(zeichne);
          // Foto: die hochgeladene Druckdatei der Ebene; fehlt sie (Rückgängig vor dem Upload), aus dem Original mit allen Bearbeitungen in voller Grösse
          if (e.printUrl) return bildLaden(e.printUrl).then(zeichne);
          return bildBearbeiten(e, 0).then(zeichne);
        });
      });
      return kette;
    }

    /** Druckdatei einer Platzierung als PNG. opt.skala (0 bis 1) verkleinert gleichmässig (Seitenverhältnis und Lage der Motive bleiben), opt.pf = Printful-Variante. */
    function druckdateiErzeugen(idOderP, opt) {
      opt = opt || {};
      var p = typeof idOderP === 'string' ? platzierung(idOderP) : idOderP;
      var id = p.id;
      var liste = st.ebenen[id] || [];
      if (!liste.length) return Promise.resolve(null);
      var g = geo(p, opt.pf);
      var sk = opt.skala > 0 && opt.skala < 1 ? opt.skala : 1;
      var W = Math.max(1, Math.floor(g.render.w * sk)), H = Math.max(1, Math.floor(g.render.h * sk));
      letzteGroesse[id] = { w: W, h: H };
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      if (!ctx) return Promise.reject(new Error(T.printErr));
      try { ctx.imageSmoothingQuality = 'high'; } catch (x) { /* egal */ }
      var kette = ebenenZeichnen(ctx, liste, W, H, false);
      return kette.then(function () {
        return new Promise(function (ok, fehler) {
          try { cv.toBlob(function (b) { leinwandFreigeben(cv); b && b.size > 0 ? ok(b) : fehler(new Error(T.printErr)); }, 'image/png'); } catch (x3) { leinwandFreigeben(cv); fehler(x3); }
        });
      }, function (err) { leinwandFreigeben(cv); throw err; });
    }

    /** Druckdatei bauen und hochladen. Ist sie schwerer als maxBytes oder lehnt Cloudinary sie als zu gross ab, wird sie gleichmässig verkleinert und neu gerechnet
     *  (höchstens vier Versuche); der Kunde bekommt die tatsächliche Grösse gemeldet, `_pod_karte.px` trägt sie. Fehler: Error mit dem Kundentext. */
    function druckdateiSenden(p, pv) {
      var versuch = 0, skala = 1;
      function einmal() {
        return druckdateiErzeugen(p, { skala: skala, pf: pv }).then(function (blob) {
          if (!dateiPng(blob)) throw new Error(T.printErr);
          if (maxBytes > 0 && blob.size > maxBytes) {
            if (versuch >= 4) throw new Error(T.tooHeavy);
            versuch++;
            skala *= Math.max(0.4, Math.min(0.9, Math.sqrt(maxBytes / blob.size) * 0.92));
            return einmal();
          }
          return new Promise(function (ok, schlecht) {
            hochladen(blob, true, function (err, url) {
              if (err || !url) { schlecht(err || new Error(T.printErr)); return; }
              ok(url);
            }, uploadZeit);
          }).catch(function (err) {
            if (err && err.gross && versuch < 4) { versuch++; skala *= 0.7; return einmal(); }
            if (err && err.gross) throw new Error(T.tooHeavy);
            throw err;
          });
        });
      }
      return einmal().then(function (url) {
        var gr = letzteGroesse[p.id];
        if (skala < 1 && gr) verkleinertText = fmt(T.shrunk, { w: gr.w, h: gr.h });
        return url;
      });
    }

    // ── Vorschau «Auf dem Produkt» (WP3) ────────────────────────────────────────────────────────────
    // Zeichenreihenfolge (Weg B der Untersuchung vom 05.11.): Hintergrund (Farbe der Variante oder Textur) → Design, auf die Druckfläche beschnitten → Vorlagenbild (Schatten und Falten).
    // Das Vorlagenbild von Printful ist ein PNG mit opakem Weiss ausserhalb des Kleidungsstücks und halbdurchsichtigem Schatten darin (GEMESSEN am Modell 71): es wird darum NORMAL darübergelegt,
    // «multiply» würde das Weiss ausserhalb mit der Stofffarbe färben. Nur das Tassenfoto (opakes Foto auf Weiss) wird multipliziert.
    function pvVariante() { return eingefroren ? eingefroren.pv : st.pfVariante; }
    /** Farbe des Stoffs: die der gewählten Variante, wo die Vorlage eine Farbfläche oder Textur trägt (wie die Bühne), sonst die Farbe der Vorlage. */
    function stoffFarbe(vl) {
      var pv = pvVariante();
      var eigene = pv != null && karte.farbeVon && karte.farbeVon[pv] && (vl.hintergrundUrl || vl.hintergrundFarbe) ? karte.farbeVon[pv] : null;
      return { eigene: eigene, hex: eigene || vl.hintergrundFarbe || null };
    }
    function vorschauModell() { return vorschauDaten ? (vorschauDaten.modelle[String(karte.printfulProductId)] || null) : null; }
    /** Adresse, von der ein Vorlagenbild geladen wird: der Spiegel auf Shopify Files, sonst die Printful-Adresse; null, wenn die Vorschaudaten das Bild nicht als Produktfoto kennen (Raster-Layout). */
    function bildAdresse(m, url) {
      if (!m || !m.bilder || typeof url !== 'string' || !Object.prototype.hasOwnProperty.call(m.bilder, url)) return null;
      return m.bilder[url] || url;
    }
    /** Was zeigt die Produktansicht für diese Platzierung? { art: 'flach' | 'tasse' | 'papier' } = Canvas, { art: 'hinweis', code } = ehrlicher Hinweis statt Vorschau, { art: 'nein' } = es gibt keine Daten. */
    function vorschauSpec(p) {
      if (legacy || !vorschauDaten || !p || !platzierungIn(karte, p.id)) return { art: 'nein' };
      var m = vorschauModell();
      if (!m) return { art: 'nein' };
      if (karte.klasse === 'PANEL') return { art: 'hinweis', code: 'rundum' };
      if (p.technik === 'EMBROIDERY' || /^embroidery/.test(p.id)) return { art: 'hinweis', code: 'stickerei' };
      if (m.adapter === 'keine') return { art: 'hinweis', code: m.grund === 'stickerei' || m.grund === 'rundum' ? m.grund : 'keine' };
      return { art: m.adapter, m: m };
    }
    /** Vorlagenbild laden (mit CORS, damit die Zeichenfläche lesbar bleibt und der JPEG-Export klappt). Misslingt es, bleibt es bei der Ansicht «Druckfläche». Fehlschläge werden nicht gemerkt. */
    function vorschauBild(url) {
      if (!bildPuffer[url]) {
        var pr = new Promise(function (ok, fehler) {
          var img = new Image();
          var t = setTimeout(function () { fehler(new Error('Zeit')); }, VORSCHAU_ZEIT_MS);
          img.crossOrigin = 'anonymous';
          img.onload = function () { clearTimeout(t); ok(img); };
          img.onerror = function () { clearTimeout(t); fehler(new Error('Bild')); };
          img.src = url;
        });
        bildPuffer[url] = pr;
        pr.catch(function () { if (bildPuffer[url] === pr) delete bildPuffer[url]; });
      }
      return bildPuffer[url];
    }
    /** Das Bild einer Foto- oder Sticker-Ebene in der Fassung der Bühne, zwischengespeichert je Ebene (nicht bei jedem Neuzeichnen neu dekodieren); null, wenn es nicht lädt. */
    function ebenenBild(e) {
      var src = e.type === 'sticker' ? stickerQuelle(e.src) : e.src;
      var key = src.length + ':' + src.slice(-48);
      var z = fotoPuffer[e.id];
      if (!z || z.key !== key) {
        var neu = { key: key, p: null };
        neu.p = bildLaden(src).then(function (b) { return b; }, function () { if (fotoPuffer[e.id] === neu) delete fotoPuffer[e.id]; return null; });
        z = fotoPuffer[e.id] = neu;
      }
      return z.p;
    }
    /** Das Design einer Platzierung auf einer eigenen Leinwand dw × dh (Seitenverhältnis der Druckdatei; durchsichtig, wo nichts liegt). */
    function designLeinwand(p, dw, dh) {
      var cv = document.createElement('canvas');
      cv.width = Math.max(8, Math.round(dw)); cv.height = Math.max(8, Math.round(dh));
      var ctx = cv.getContext('2d');
      if (!ctx) return Promise.reject(new Error('canvas'));
      try { ctx.imageSmoothingQuality = 'high'; } catch (x) { /* egal */ }
      return ebenenZeichnen(ctx, st.ebenen[p.id] || [], cv.width, cv.height, true).then(function () { return cv; });
    }
    function pvNeutral(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
    /** Kleidung, Taschen, Hüllen: Hintergrund → Design (beschnitten) → Vorlagenbild; liegt die Vorlage hinter dem Druck (vorderansicht false), umgekehrt. */
    function zeichneFlach(cv, p, g, m, opt) {
      var vl = g.vorlage, W = cv.width, H = cv.height;
      var ovUrl = vl ? bildAdresse(m, vl.bildUrl) : null;
      if (!ovUrl) return Promise.resolve({ ok: false, grund: 'kein-bild' });
      var L = vorlageLage(vl, W, H);
      var farbe = stoffFarbe(vl);
      var bgUrl = !farbe.eigene && vl.hintergrundUrl ? bildAdresse(m, vl.hintergrundUrl) : null;   // eine Textur, die die Daten nicht kennen, fällt auf die Farbfläche zurück
      var r = einpassRechteck(L.aw, L.ah, g.printfile.breitePx / g.printfile.hoehePx, 'einpassen');
      return Promise.all([vorschauBild(ovUrl), bgUrl ? vorschauBild(bgUrl) : null, designLeinwand(p, r.w, r.h)]).then(function (a) {
        if (opt.veraltet && opt.veraltet()) return { ok: false, grund: 'veraltet' };
        var ctx = cv.getContext('2d'), ov = a[0], bg = a[1], dcv = a[2];
        pvNeutral(ctx);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        if (bg) ctx.drawImage(bg, L.ox, L.oy, L.w, L.h);
        else { ctx.fillStyle = farbe.hex || '#ffffff'; ctx.fillRect(L.ox, L.oy, L.w, L.h); }
        function designZeichnen() {
          ctx.save(); ctx.beginPath(); ctx.rect(L.ax, L.ay, L.aw, L.ah); ctx.clip();
          ctx.drawImage(dcv, L.ax + r.x, L.ay + r.y, r.w, r.h);
          ctx.restore();
        }
        function vorlageZeichnen() {
          ctx.save();
          if (opt.overlay === 'multiply') ctx.globalCompositeOperation = 'multiply';   // nur für die Messung gegen Printful (README): im Editor gilt «normal»
          ctx.drawImage(ov, L.ox, L.oy, L.w, L.h);
          ctx.restore();
        }
        if (vl.vorderansicht !== false) { designZeichnen(); vorlageZeichnen(); } else { vorlageZeichnen(); designZeichnen(); }
        return { ok: true, dcv: dcv, stoff: farbe.hex };
      }, function () { return { ok: false, grund: 'bild' }; });
    }
    /** Poster und Leinwand: Papier mit Schatten (die Vorlage von Printful ist hier nur ein Raster mit Beschriftung), Design auf der ganzen Fläche. */
    function zeichnePapier(cv, p, g, m, opt) {
      var W = cv.width, H = cv.height, pf = g.printfile, ar = pf.breitePx / pf.hoehePx, rand = W * 0.1;
      var w = W - 2 * rand, h = w / ar;
      if (h > H - 2 * rand) { h = H - 2 * rand; w = h * ar; }
      var x = (W - w) / 2, y = (H - h) / 2;
      return designLeinwand(p, w, h).then(function (dcv) {
        if (opt.veraltet && opt.veraltet()) return { ok: false, grund: 'veraltet' };
        var ctx = cv.getContext('2d');
        pvNeutral(ctx);
        ctx.fillStyle = '#f3f1ee'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = W * 0.03; ctx.shadowOffsetY = W * 0.012; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h); ctx.restore();
        ctx.drawImage(dcv, x, y, w, h);
        return { ok: true, dcv: dcv, stoff: '#ffffff' };
      }, function () { return { ok: false, grund: 'bild' }; });
    }
    /** Tasse: das Design auf den Zylinder abgebildet (ganze Druckbreite = t.winkel Grad, Mitte = Vorderseite), das Katalogfoto darüber multipliziert. Eichung je Tassengrösse in den Vorschaudaten. */
    function zeichneTasse(cv, p, g, m, opt) {
      var pv = pvVariante();
      var t = pv != null && m && m.tasse ? m.tasse[String(pv)] : null;
      if (!t) return Promise.resolve({ ok: false, grund: 'keine-eichung' });
      var W = cv.width, H = cv.height, pf = g.printfile;
      var offW = 1350, offH = Math.max(8, Math.round(offW * pf.hoehePx / pf.breitePx));
      var sa = t.ausschnitt || [0, 0, t.fotoBreite, t.fotoHoehe];
      var k = Math.min(W / sa[2], H / sa[3]) * 0.96;
      var dx = (W - sa[2] * k) / 2, dy = (H - sa[3] * k) / 2;
      return Promise.all([vorschauBild(t.foto || t.quelle), designLeinwand(p, offW, offH)]).then(function (a) {
        if (opt.veraltet && opt.veraltet()) return { ok: false, grund: 'veraltet' };
        var ctx = cv.getContext('2d'), foto = a[0], off = a[1];
        var fx = (foto.naturalWidth || foto.width) / t.fotoBreite, fy = (foto.naturalHeight || foto.height) / t.fotoHoehe;
        pvNeutral(ctx);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        var winkel = (t.winkel || 330) * Math.PI / 180;
        var mx = dx + (t.mitteX - sa[0]) * k, R = t.radius * k, y0 = dy + (t.oben - sa[1]) * k, y1 = dy + (t.unten - sa[1]) * k;
        // Der Zylinder in Scheiben gleichen Winkels (je 3,75 Grad, 48 Scheiben über die sichtbare Hälfte): je Scheibe ein drawImage statt je Pixelspalte (380 Aufrufe brauchten bei 1000 px
        // 55 ms, GEMESSEN). Die Abweichung der Näherung (sin statt linear innerhalb einer Scheibe) liegt unter 0,3 px. Je Scheibe 0,6 px Überlappung gegen helle Nähte.
        var SCHEIBEN = 48;
        for (var i = 0; i < SCHEIBEN; i++) {
          var th1 = -Math.PI / 2 + Math.PI * i / SCHEIBEN, th2 = -Math.PI / 2 + Math.PI * (i + 1) / SCHEIBEN;
          var u1 = 0.5 + th1 / winkel, u2 = 0.5 + th2 / winkel;
          if (u2 <= 0 || u1 >= 1) continue;
          var a1 = Math.max(0, u1), a2 = Math.min(1, u2);   // Teil der Scheibe, der noch in der Druckbreite liegt
          var t1 = th1 + (a1 - u1) * winkel, t2 = th1 + (a2 - u1) * winkel;
          var X1 = mx + R * Math.sin(t1), X2 = mx + R * Math.sin(t2);
          if (X2 - X1 <= 0) continue;
          ctx.drawImage(off, a1 * offW, 0, (a2 - a1) * offW, offH, X1, y0, X2 - X1 + 0.6, y1 - y0);
        }
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(foto, sa[0] * fx, sa[1] * fy, sa[2] * fx, sa[3] * fy, dx, dy, sa[2] * k, sa[3] * k);
        ctx.globalCompositeOperation = 'source-over';
        return { ok: true, dcv: off, stoff: '#ffffff' };
      }, function () { return { ok: false, grund: 'bild' }; });
    }
    /** Eine Platzierung auf die Leinwand cv zeichnen (cv.width × cv.height). Gibt { ok: true, ms, … } oder { ok: false, grund } zurück: grund 'hinweis' (Stickerei, Rundum), 'keine-daten',
     *  'kein-bild', 'keine-eichung', 'bild' (Bild lädt nicht oder CORS), 'veraltet' (ein neuerer Auftrag läuft), 'fehler'. Wirft nie. */
    function vorschauZeichnen(cv, opt) {
      opt = opt || {};
      var p = opt.p || pAktiv();
      var spec = vorschauSpec(p);
      if (spec.art === 'hinweis') return Promise.resolve({ ok: false, grund: 'hinweis', code: spec.code });
      if (spec.art === 'nein') return Promise.resolve({ ok: false, grund: 'keine-daten' });
      var t0 = window.performance && performance.now ? performance.now() : 0;
      try {
        var weg = spec.art === 'tasse' ? zeichneTasse : spec.art === 'papier' ? zeichnePapier : zeichneFlach;
        return weg(cv, p, geo(p), spec.m, opt).then(function (r) {
          if (r.ok) r.ms = (window.performance && performance.now ? performance.now() : 0) - t0;
          return r;
        }, function () { return { ok: false, grund: 'fehler' }; });
      } catch (x) { return Promise.resolve({ ok: false, grund: 'fehler' }); }
    }
    /** Hebt sich das Design vom Stoff ab? Zeigt sonst den Hinweis unter der Vorschau. */
    function kontrastHinweisZeigen(r) {
      ui.pvKontrast.hidden = true;
      if (!r || !r.ok || !r.dcv || !r.stoff) return;
      var rgb = hexZuRgb(r.stoff);
      if (!rgb) return;
      try {
        var klein = document.createElement('canvas');
        klein.width = 48; klein.height = Math.max(8, Math.round(48 * r.dcv.height / r.dcv.width));
        var kx = klein.getContext('2d');
        kx.drawImage(r.dcv, 0, 0, klein.width, klein.height);
        var a = kontrastAnalyse(kx.getImageData(0, 0, klein.width, klein.height).data, rgb);
        if (a.flaeche >= 3 && a.anteil >= KONTRAST_ANTEIL) { ui.pvKontrast.textContent = a.art === 'dunkel' ? T.kontrastDunkel : T.kontrastHell; ui.pvKontrast.hidden = false; }
      } catch (x) { /* Fläche nicht lesbar: dann gibt es keinen Hinweis */ }
    }
    function pvGroesse() {
      var cw = ui.pv.clientWidth || ui.karte.clientWidth || 560;
      return bereich(300, 1000, Math.round(cw * Math.min(2, window.devicePixelRatio || 1)));
    }
    function pvInfoZeigen(code) {
      ui.pv.hidden = true; ui.pvNote.hidden = true; ui.pvKontrast.hidden = true;
      ui.pvInfo.textContent = code === 'stickerei' ? T.pvStickerei : code === 'rundum' ? T.pvRundum : T.pvKeine;
      ui.pvInfo.hidden = false;
    }
    /** Die Produktansicht ist nicht möglich (Bild fehlt, CORS, keine Daten): zurück zur Druckfläche mit einem ruhigen Hinweis, kein Fehler. */
    function vorschauRueckfall() {
      sichtSetzen('druck');
      ui.sichtHinweis.textContent = T.pvNichtDa;
      ui.sichtBox.hidden = false;
    }
    function vorschauAnzeigen() {
      if (st.sicht !== 'produkt') return;
      var nr = ++pvNr;
      var p = pAktiv();
      var spec = vorschauSpec(p);
      if (spec.art === 'hinweis') { pvInfoZeigen(spec.code); return; }
      if (spec.art === 'nein') { vorschauRueckfall(); return; }
      ui.pvInfo.hidden = true; ui.pv.hidden = false; ui.pvNote.hidden = false;
      var W = pvGroesse();
      if (ui.pv.width !== W) { ui.pv.width = W; ui.pv.height = W; }
      vorschauZeichnen(ui.pv, { p: p, veraltet: function () { return nr !== pvNr; } }).then(function (r) {
        if (nr !== pvNr || st.sicht !== 'produkt') return;
        if (!r.ok) { if (r.grund !== 'veraltet') vorschauRueckfall(); return; }
        ui.pv.setAttribute('data-gezeichnet', String((Number(ui.pv.getAttribute('data-gezeichnet')) || 0) + 1));
        kontrastHinweisZeigen(r);
      });
    }
    function vorschauPlanen() {
      if (st.sicht !== 'produkt' || pvPlan !== null) return;
      var los = function () { pvPlan = null; vorschauAnzeigen(); };
      pvPlan = window.requestAnimationFrame ? window.requestAnimationFrame(los) : setTimeout(los, 16);
    }
    /** Ansicht wechseln: 'druck' (Bühne) oder 'produkt' (Canvas). Ohne Vorschaudaten gibt es nur die Bühne. */
    function sichtSetzen(art) {
      if (art === 'produkt' && (legacy || ui.sicht.hidden)) return;
      st.sicht = art;
      umschalter(ui.sichtDruck, art === 'druck'); umschalter(ui.sichtProdukt, art === 'produkt');
      ui.buehne.hidden = art === 'produkt';
      ui.pvWrap.hidden = art !== 'produkt';
      ui.viewBtn.hidden = legacy || art === 'produkt';
      if (art === 'produkt') vorschauAnzeigen(); else pvNr++;
    }
    /** Die Umschalter «Druckfläche | Auf dem Produkt» gibt es nur, wenn die Vorschaudaten das Modell der gewählten Ausführung kennen. */
    function sichtAktualisieren() {
      var an = !legacy && !!vorschauModell();
      ui.sicht.hidden = !an;
      if (!an && st.sicht === 'produkt') sichtSetzen('druck');
    }
    function vorschauDatenSetzen(roh) {
      var r = vorschauNormalisieren(roh);
      if (!r.daten) { warnung('Vorschaudaten unbrauchbar: ' + r.fehler); vorschauDaten = null; sichtAktualisieren(); return false; }
      vorschauDaten = r.daten;
      sichtAktualisieren();
      return true;
    }
    /** JPEG 800 × 800 der Platzierung p (Vorgabe: die aktive, sonst die erste benutzte, die sich zeigen lässt), höchstens VORSCHAU_MAX_BYTES; null, wenn keine Vorschau möglich ist (Hinweis, kein Bild, CORS, zu schwer). */
    function vorschauExport(p) {
      var cv = document.createElement('canvas');
      cv.width = VORSCHAU_PX; cv.height = VORSCHAU_PX;
      return vorschauZeichnen(cv, { p: p || pAktiv() }).then(function (r) {
        if (!r.ok) { leinwandFreigeben(cv); return null; }
        return new Promise(function (ok) {
          var i = 0;
          function versuch() {
            try {
              cv.toBlob(function (b) {
                if (b && b.size > VORSCHAU_MAX_BYTES && i < VORSCHAU_QUALITAET.length - 1) { i++; versuch(); return; }
                leinwandFreigeben(cv);
                ok(b && b.size > 0 && b.size <= VORSCHAU_MAX_BYTES ? b : null);
              }, 'image/jpeg', VORSCHAU_QUALITAET[i]);
            } catch (x) { leinwandFreigeben(cv); ok(null); }   // SecurityError bei verschmutzter Zeichenfläche
          }
          versuch();
        });
      }).catch(function () { return null; });
    }
    function vorschauPlatzierungWaehlen(verwendet) {
      function zeigbar(p) { var a = vorschauSpec(p).art; return a === 'flach' || a === 'tasse' || a === 'papier'; }
      var aktiv = platzierungIn(karte, st.aktiv);
      if (aktiv && verwendet.indexOf(aktiv) >= 0 && zeigbar(aktiv)) return aktiv;
      for (var i = 0; i < verwendet.length; i++) if (zeigbar(verwendet[i])) return verwendet[i];
      return null;
    }
    /** Vorschau-JPEG hochladen (beim Klick auf «In den Warenkorb», nach den Druckdateien). Die Vorschau ist Komfort: misslingt sie, geht die Bestellung ohne «_vorschau» weiter. */
    function vorschauSenden(verwendet) {
      vorschauUrl = '';
      if (!vorschauDaten) return Promise.resolve();
      var p = vorschauPlatzierungWaehlen(verwendet);
      if (!p) return Promise.resolve();
      return vorschauExport(p).then(function (blob) {
        if (!blob) return null;
        return new Promise(function (ok) {
          hochladen(blob, true, function (err, url) { if (!err && url) vorschauUrl = url; ok(); }, Math.min(uploadZeit, VORSCHAU_ZEIT_MS));
        });
      }).catch(function () { /* Komfort */ });
    }

    // ── Entwurf speichern und wiederherstellen (WP4) ────────────────────────────────────────────────
    function entwurfSpeichern() {
      if (legacy || entwurfAus || !entwurfBereit) return;
      var ebenen = {}, n = 0, fehlt = 0;
      Object.keys(st.ebenen).forEach(function (id) {
        var l = [];
        st.ebenen[id].forEach(function (e) { var x = ebeneFuerEntwurf(e); if (x) l.push(x); else fehlt++; });
        if (l.length) { ebenen[id] = l; n += l.length; }
      });
      entwurfFehlt = fehlt;
      if (!n) { speicherLoeschen(entwurfKey); return; }
      var text = JSON.stringify({ v: 1, t: Date.now(), aktiv: st.aktiv, z: idZaehler, l: fehlt, ebenen: ebenen });
      if (text.length > ENTWURF_MAX_ZEICHEN) return;
      speicherSchreiben(entwurfKey, text);
    }
    function entwurfPlanen() { if (legacy || entwurfAus || !entwurfBereit) return; clearTimeout(entwurfTimer); entwurfTimer = setTimeout(entwurfSpeichern, 400); }
    function entwurfSofort() { clearTimeout(entwurfTimer); entwurfSpeichern(); }
    /** Alten Entwurf lesen und in st.ebenen einsetzen (baut noch nichts auf). true, wenn mindestens eine Ebene wiederhergestellt wurde. */
    function entwurfLaden() {
      if (legacy) return false;
      var roh = speicherLesen(entwurfKey);
      if (!roh) return false;
      var d = null;
      try { d = JSON.parse(roh); } catch (e) { d = null; }
      if (!d || d.v !== 1 || !istZahl(d.t) || Date.now() - d.t > ENTWURF_MAX_ALTER_MS || !d.ebenen || typeof d.ebenen !== 'object') { speicherLoeschen(entwurfKey); return false; }
      var neu = 0, hoechste = 0;
      Object.keys(d.ebenen).forEach(function (pid) {
        if (!st.ebenen[pid] || !Array.isArray(d.ebenen[pid])) return;   // diese Platzierung gibt es nicht mehr
        d.ebenen[pid].forEach(function (n) {
          var e = ebeneAusEntwurf(n);
          if (!e) return;
          st.ebenen[pid].push(e); neu++;
          hoechste = Math.max(hoechste, parseInt(e.id.slice(1), 10) || 0);
          if (e.type === 'image') origMass[e.id] = { w: e._origW, h: e._origH };
        });
      });
      idZaehler = Math.max(idZaehler, hoechste, istZahl(d.z) ? Math.floor(d.z) : 0);
      if (!neu) return false;
      if (typeof d.aktiv === 'string' && platzierungIn(karte, d.aktiv) && !blockiertDurch(d.aktiv).length) st.aktiv = d.aktiv;
      else { var ziel = karte.platzierungen.filter(function (q) { return st.ebenen[q.id].length; })[0]; if (ziel) st.aktiv = ziel.id; }
      entwurfFehlt = d.l > 0 ? d.l : 0;
      return true;
    }

    // ── Aufbau der Oberfläche ───────────────────────────────────────────────────────────────────
    stilEinfuegen();
    container.setAttribute('data-lspod6-version', VERSION);
    Array.prototype.slice.call(container.childNodes).forEach(function (n) { if (n.nodeName !== 'SCRIPT') container.removeChild(n); });

    ui.karte = el('div', { class: 'lsp6', tabindex: '0', 'data-modus': legacy ? 'v5' : 'karte' });
    ui.karte.appendChild(el('div', { class: 'lsp6-head', text: '\u{1F3A8} ' + T.head }));

    ui.tabs = el('div', { class: 'lsp6-tabs', role: 'tablist', 'aria-label': T.tabsLabel });
    ui.karte.appendChild(ui.tabs);
    ui.tabHinweis = el('p', { class: 'lsp6-tabnote', role: 'status', 'aria-live': 'polite', 'data-feld': 'tabhinweis' });
    ui.tabHinweis.hidden = true;
    ui.karte.appendChild(ui.tabHinweis);
    ui.modellNote = el('p', { class: 'lsp6-tabnote', role: 'status', 'aria-live': 'polite', 'data-feld': 'modellhinweis' });
    ui.modellNote.hidden = true;
    ui.karte.appendChild(ui.modellNote);

    // Ansicht «Druckfläche | Auf dem Produkt»: gibt es nur, wenn die Vorschaudaten das Modell kennen (sichtAktualisieren)
    ui.sicht = el('div', { class: 'lsp6-sicht', role: 'group', 'aria-label': T.sichtLabel, 'data-feld': 'sicht' });
    ui.sichtDruck = el('button', { type: 'button', class: 'lsp6-sbtn', 'aria-pressed': 'true', 'data-sicht': 'druck', text: T.sichtDruck });
    ui.sichtProdukt = el('button', { type: 'button', class: 'lsp6-sbtn', 'aria-pressed': 'false', 'data-sicht': 'produkt', text: T.sichtProdukt });
    ui.sicht.appendChild(ui.sichtDruck); ui.sicht.appendChild(ui.sichtProdukt);
    ui.sicht.hidden = true;
    ui.karte.appendChild(ui.sicht);
    ui.sichtHinweis = el('p', { class: 'lsp6-sh', role: 'status', 'aria-live': 'polite', 'data-feld': 'sichthinweis', style: 'margin:0' });
    ui.sichtBox = el('div', { class: 'lsp6-hints', style: 'padding-bottom:6px' }, [ui.sichtHinweis]);
    ui.sichtBox.hidden = true;
    ui.karte.appendChild(ui.sichtBox);

    ui.stage = el('div', { class: 'lsp6-stage', role: 'tabpanel', 'aria-label': T.head });
    ui.bg = el('img', { class: 'lsp6-bg', alt: '' });
    ui.tpl = el('img', { class: 'lsp6-tpl', alt: '' });
    ui.host = el('div', { class: 'lsp6-host' });
    ui.guideV = el('div', { class: 'lsp6-guide', style: 'top:0;bottom:0;left:50%;width:0;border-left:1.5px dashed #8a6410' });
    ui.guideH = el('div', { class: 'lsp6-guide', style: 'left:0;right:0;top:50%;height:0;border-top:1.5px dashed #8a6410' });
    ui.host.appendChild(ui.guideV); ui.host.appendChild(ui.guideH);
    ui.veil = [0, 1, 2, 3].map(function () { return el('div', { class: 'lsp6-veil' }); });
    ui.frame = el('div', { class: 'lsp6-frame' });
    ui.tag = el('div', { class: 'lsp6-tag' });
    ui.readout = el('div', { class: 'lsp6-readout', style: 'display:none' });
    [ui.bg, ui.tpl, ui.host].concat(ui.veil, [ui.frame, ui.tag, ui.readout]).forEach(function (n) { ui.stage.appendChild(n); });
    [ui.bg, ui.tpl].forEach(function (img) { img.addEventListener('error', function () { img.hidden = true; }); });
    var buehne = el('div', { class: 'lsp6-stagewrap' }, [ui.stage]);
    ui.karte.appendChild(buehne);
    ui.buehne = buehne;
    ui.pv = el('canvas', { class: 'lsp6-pv', role: 'img', 'aria-label': T.pvAlt });
    ui.pvInfo = el('p', { class: 'lsp6-pvinfo', role: 'status', 'data-feld': 'produktinfo' });
    ui.pvInfo.hidden = true;
    ui.pvNote = el('p', { class: 'lsp6-pvnote', text: T.pvNote });
    ui.pvKontrast = el('p', { class: 'lsp6-sh', role: 'status', 'aria-live': 'polite', 'data-feld': 'kontrast', style: 'margin:0 16px 8px' });
    ui.pvKontrast.hidden = true;
    ui.pvWrap = el('div', { class: 'lsp6-pvwrap', 'data-feld': 'produktansicht' }, [ui.pv, ui.pvInfo, ui.pvNote, ui.pvKontrast]);
    ui.pvWrap.hidden = true;
    ui.karte.appendChild(ui.pvWrap);

    ui.metaText = el('span');
    ui.viewBtn = el('button', { type: 'button', class: 'lsp6-linkbtn' });
    ui.karte.appendChild(el('div', { class: 'lsp6-meta', 'data-feld': 'meta' }, [ui.metaText, ui.viewBtn]));
    ui.cap = el('div', { class: 'lsp6-tip', style: 'text-align:left', 'data-feld': 'cap' });
    ui.karte.appendChild(ui.cap);
    ui.hinweise = el('div', { class: 'lsp6-hints', 'aria-live': 'polite', 'data-feld': 'hinweise' });
    ui.karte.appendChild(ui.hinweise);
    ui.karte.appendChild(el('div', { class: 'lsp6-tip', text: T.tapHint }));
    if (!legacy) ui.karte.appendChild(el('div', { class: 'lsp6-tip', style: 'padding-top:2px', text: T.outsideNote }));

    var body = el('div', { class: 'lsp6-body' });
    ui.karte.appendChild(body);

    // Werkzeuge
    var zeileWerkzeuge = el('div', { class: 'lsp6-row' });
    ui.addText = knopf(T.addText, 'lsp6-btn dark');
    ui.addSticker = knopf(T.addSticker, 'lsp6-btn dark');
    zeileWerkzeuge.appendChild(ui.addText); zeileWerkzeuge.appendChild(ui.addSticker);
    if (CLOUDINARY_AKTIV) { ui.addImg = knopf(T.addImg, 'lsp6-btn dark'); zeileWerkzeuge.appendChild(ui.addImg); }
    body.appendChild(zeileWerkzeuge);

    var zeileVerlauf = el('div', { class: 'lsp6-row' });
    ui.undo = knopf(T.undo, 'lsp6-btn', { title: T.undoT });
    ui.redo = knopf(T.redo, 'lsp6-btn', { title: T.redoT });
    zeileVerlauf.appendChild(ui.undo); zeileVerlauf.appendChild(ui.redo);
    body.appendChild(zeileVerlauf);

    // Ebenen
    ui.chips = el('div', { class: 'lsp6-chips' });
    ui.up = knopf('▲', 'lsp6-chip', { title: T.up, 'aria-label': T.up });
    ui.down = knopf('▼', 'lsp6-chip', { title: T.down, 'aria-label': T.down });
    body.appendChild(el('div', { class: 'lsp6-layers' }, [el('span', { class: 'lsp6-cap', style: 'margin:0', text: T.layers }), ui.chips, ui.up, ui.down]));

    // Text
    ui.pText = el('div', { class: 'lsp6-panel' });
    ui.textfeld = el('textarea', { class: 'lsp6-text', rows: '2', maxlength: '160', placeholder: T.ph, 'aria-label': T.layerText });
    ui.schriftwahl = el('select', { class: 'lsp6-select', 'aria-label': T.fontL });
    SCHRIFTEN.forEach(function (s) { var o = el('option', { value: s.css, text: s.name }); o.style.fontFamily = s.css; ui.schriftwahl.appendChild(o); });
    ui.zeileFormat = el('div', { class: 'lsp6-row', style: 'margin-bottom:8px' });
    ui.fett = knopf('B', 'lsp6-btn', { title: T.bold, 'aria-label': T.bold, style: 'flex:none;min-width:44px' });
    ui.kursiv = knopf('I', 'lsp6-btn', { title: T.italic, 'aria-label': T.italic, style: 'flex:none;min-width:44px;font-style:italic' });
    ui.links = knopf(T.alignL, 'lsp6-btn', { title: T.alignLT, style: 'flex:none;min-width:56px' });
    ui.mitteB = knopf(T.alignC, 'lsp6-btn', { title: T.alignCT, style: 'flex:none;min-width:56px' });
    ui.rechts = knopf(T.alignR, 'lsp6-btn', { title: T.alignRT, style: 'flex:none;min-width:56px' });
    [ui.fett, ui.kursiv, ui.links, ui.mitteB, ui.rechts].forEach(function (b) { ui.zeileFormat.appendChild(b); });
    ui.farben = el('div', { class: 'lsp6-swatches' });
    FARBEN.forEach(function (c) {
      var dunkel = c.toLowerCase() === '#ffffff' || c === '#c1922f';
      ui.farben.appendChild(el('button', { type: 'button', class: 'lsp6-sw', 'data-c': c, 'aria-label': T.colorL + ' ' + c, style: 'background:' + c + ';color:' + (dunkel ? '#111' : '#fff') }));
    });
    ui.farbwahl = el('input', { type: 'color', value: '#111111', title: T.customColor, 'aria-label': T.customColor, style: 'width:36px;height:36px;border:2px solid #cfc8bb;border-radius:50%;background:none;cursor:pointer;padding:0' });
    ui.farben.appendChild(ui.farbwahl);
    [ui.textfeld, ui.schriftwahl, ui.zeileFormat, ui.farben].forEach(function (n) { ui.pText.appendChild(n); });
    body.appendChild(ui.pText);

    // Genaue Werte (cm / mm)
    ui.pExakt = el('div', { class: 'lsp6-panel' });
    ui.pExakt.appendChild(el('div', { class: 'lsp6-cap', text: T.exact }));
    var raster = el('div', { class: 'lsp6-grid' });
    ui.felder = {};
    function feld(schluessel, beschriftung, min, max, schritt) {
      var label = el('span', { text: beschriftung });
      var input = el('input', { type: 'number', min: String(min), max: String(max), step: String(schritt), inputmode: 'decimal' });
      raster.appendChild(el('label', { class: 'lsp6-field' }, [label, input]));
      ui.felder[schluessel] = { label: label, input: input };
    }
    feld('x', T.fX, 0, 100, 0.1); feld('y', T.fY, 0, 100, 0.1); feld('groesse', T.fWidth, 1, 100, 0.1); feld('rot', T.fRot, -180, 180, 1); feld('op', T.fOp, 0, 100, 1);
    var zeileMitte = el('div', { class: 'lsp6-row', style: 'margin:8px 0 0' });
    ui.mitteH = knopf(T.centerH); ui.mitteV = knopf(T.centerV);
    zeileMitte.appendChild(ui.mitteH); zeileMitte.appendChild(ui.mitteV);
    ui.pExakt.appendChild(raster); ui.pExakt.appendChild(zeileMitte);
    body.appendChild(ui.pExakt);

    // Regler
    function regler(beschriftung, min, max, schritt) {
      var r = el('input', { type: 'range', min: String(min), max: String(max), step: String(schritt), 'aria-label': beschriftung });
      return r;
    }
    ui.rangeGroesse = regler(T.sizeL, 0.15, 3, 0.02);
    ui.pGroesse = el('div', { class: 'lsp6-panel flexp' }, [el('span', { class: 'lsp6-lab', text: T.sizeL }), ui.rangeGroesse]);
    ui.rangeDrehen = regler(T.rotL, -180, 180, 1);
    ui.drehenWert = el('span', { class: 'lsp6-lab', style: 'min-width:44px;text-align:right;font-weight:600', text: '0\xB0' });
    ui.pDrehen = el('div', { class: 'lsp6-panel flexp' }, [el('span', { class: 'lsp6-lab', text: T.rotL }), ui.rangeDrehen, ui.drehenWert]);
    ui.rangeAbstand = regler(T.spacing, 0, 0.4, 0.01);
    ui.rangeKontur = regler(T.outline, 0, 0.12, 0.005);
    ui.konturFarbe = el('input', { type: 'color', value: '#ffffff', 'aria-label': T.outline, style: 'width:38px;height:34px;border:none;background:none;padding:0' });
    ui.rangeZeilen = regler(T.lines, 0.9, 2, 0.05);
    ui.pTextStil = el('div', { class: 'lsp6-panel', style: 'display:flex;flex-direction:column;gap:8px' });
    [[T.spacing, [ui.rangeAbstand]], [T.outline, [ui.rangeKontur, ui.konturFarbe]], [T.lines, [ui.rangeZeilen]]].forEach(function (z) {
      var zeile = el('div', { class: 'lsp6-row', style: 'margin:0;flex-wrap:nowrap' }, [el('span', { class: 'lsp6-lab', style: 'min-width:64px', text: z[0] })]);
      z[1].forEach(function (n) { zeile.appendChild(n); });
      ui.pTextStil.appendChild(zeile);
    });
    body.appendChild(ui.pGroesse); body.appendChild(ui.pDrehen); body.appendChild(ui.pTextStil);

    ui.zeileDruckgroesse = el('div', { class: 'lsp6-row', style: 'gap:6px' }, [el('span', { class: 'lsp6-lab', style: 'color:#5b5a62', text: T.printSize })]);
    [[T.small, 0.6], [T.medium, 1], [T.large, 1.5], [T.fill, 2]].forEach(function (z) {
      var b = knopf(z[0], 'lsp6-btn', { style: 'min-width:70px' });
      b.addEventListener('click', function () {
        var e = gewaehlt();
        if (!e) return;
        e.scale = z[1]; knotenZeichnen(e); ui.rangeGroesse.value = e.scale; werteSetzen(e); aufloesungPruefen(e); geaendert(); speichern();
      });
      ui.zeileDruckgroesse.appendChild(b);
    });
    body.appendChild(ui.zeileDruckgroesse);

    ui.dpiBox = el('div', { class: 'lsp6-warn', role: 'status', 'data-feld': 'dpi' });
    body.appendChild(ui.dpiBox);

    ui.zeileAktionen = el('div', { class: 'lsp6-row' });
    ui.dup = knopf(T.dup); ui.nachVorne = knopf(T.toFront); ui.nachHinten = knopf(T.toBack);
    [ui.dup, ui.nachVorne, ui.nachHinten].forEach(function (b) { ui.zeileAktionen.appendChild(b); });
    body.appendChild(ui.zeileAktionen);

    ui.zeileBild = el('div', { class: 'lsp6-row' });
    ui.btnCrop = knopf(T.crop); ui.btnFlip = knopf(T.flip); ui.btnRot90 = knopf('↻ 90\xB0'); ui.btnCut = knopf(T.cutout, 'lsp6-btn', { 'aria-pressed': 'false' });
    ui.btnFrame = knopf(T.frame, 'lsp6-btn', { 'aria-pressed': 'false' }); ui.btnFilter = knopf('\u{1F3A8} Filter', 'lsp6-btn', { 'aria-expanded': 'false' });
    [ui.btnCrop, ui.btnFlip, ui.btnRot90, ui.btnCut, ui.btnFrame, ui.btnFilter].forEach(function (b) { ui.zeileBild.appendChild(b); });
    body.appendChild(ui.zeileBild);

    ui.pFilter = el('div', { class: 'lsp6-panel' });
    function filterRegler(beschriftung, min, max, wert) {
      var r = el('input', { type: 'range', min: String(min), max: String(max), value: String(wert), step: '1', 'aria-label': beschriftung });
      ui.pFilter.appendChild(el('div', { class: 'lsp6-row', style: 'margin-bottom:7px;flex-wrap:nowrap' }, [el('span', { class: 'lsp6-lab', style: 'width:84px;font-size:12.5px', text: beschriftung }), r]));
      return r;
    }
    ui.fHell = filterRegler(T.bright, 50, 150, 100); ui.fKontrast = filterRegler(T.contrast, 50, 150, 100);
    ui.fSatt = filterRegler(T.saturation, 0, 200, 100); ui.fScharf = filterRegler(T.sharp, 0, 100, 0);
    ui.btnBW = knopf(T.bw, 'lsp6-btn', { 'aria-pressed': 'false' }); ui.btnReset = knopf(T.reset);
    ui.pFilter.appendChild(el('div', { class: 'lsp6-row', style: 'margin:0' }, [ui.btnBW, ui.btnReset]));
    body.appendChild(ui.pFilter);

    // Sticker
    ui.picker = el('div', { class: 'lsp6-picker' });
    var pickerKopf = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' });
    pickerKopf.appendChild(el('div', { style: 'font-weight:800;font-size:14px', text: T.stickers }));
    ui.pickerZu = knopf('✕', 'lsp6-chip', { 'aria-label': T.close });
    pickerKopf.appendChild(ui.pickerZu);
    ui.emojiZeile = el('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;border-bottom:1px solid #ece7df;padding-bottom:10px' });
    EMOJIS.forEach(function (em) {
      var b = el('button', { type: 'button', class: 'lsp6-emoji', text: em, 'aria-label': em });
      b.addEventListener('click', function () { var s = neuerText(); s.text = em; s.scale = 0.7; ebeneHinzufuegen(s); ui.picker.hidden = true; });
      ui.emojiZeile.appendChild(b);
    });
    ui.stickerRaster = el('div', { class: 'lsp6-picker-grid' });
    ui.picker.appendChild(pickerKopf); ui.picker.appendChild(ui.emojiZeile); ui.picker.appendChild(ui.stickerRaster);
    body.appendChild(ui.picker);

    ui.datei = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', style: 'display:none', 'aria-label': T.addImg });
    body.appendChild(ui.datei);

    ui.summe = el('div', { class: 'lsp6-sum', role: 'status', 'data-feld': 'summe' });
    body.appendChild(ui.summe);
    ui.preview = knopf(T.previewBtn, 'lsp6-preview');
    ui.cta = knopf(T.cta, 'lsp6-cta');
    ui.status = el('div', { class: 'lsp6-status', role: 'status', 'aria-live': 'polite', 'data-feld': 'status' });
    ui.qBox = el('div', { class: 'lsp6-warn', role: 'status', 'aria-live': 'polite', 'data-feld': 'qualitaet' });
    ui.qBox.hidden = true;
    [ui.preview, ui.qBox, ui.cta, ui.status].forEach(function (n) { body.appendChild(n); });

    container.appendChild(ui.karte);
    var stageId = 'lsp6-stage-' + (editoren.length + 1);
    ui.stage.id = stageId;

    // ── Ereignisse ──────────────────────────────────────────────────────────────────────────────
    ui.tabs.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-p]');
      if (b) platzierungWechseln(b.getAttribute('data-p'));
    });
    ui.tabs.addEventListener('keydown', function (ev) {
      var ids = tabIds();
      var i = ids.indexOf(st.aktiv), ziel = null;
      if (ev.key === 'ArrowRight') ziel = ids[(i + 1) % ids.length];
      else if (ev.key === 'ArrowLeft') ziel = ids[(i - 1 + ids.length) % ids.length];
      else if (ev.key === 'Home') ziel = ids[0];
      else if (ev.key === 'End') ziel = ids[ids.length - 1];
      if (ziel === null) return;
      ev.preventDefault();
      if (platzierungWechseln(ziel) && ui.tabKnoepfe[ziel]) ui.tabKnoepfe[ziel].focus();
    });
    ui.viewBtn.addEventListener('click', function () {
      st.ansicht = st.ansicht === 'flaeche' ? 'vorlage' : 'flaeche';
      buehneAufbauen(); metaAktualisieren(); alleZeichnen();
    });
    ui.sicht.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-sicht]');
      if (!b) return;
      ui.sichtBox.hidden = true; ui.sichtHinweis.textContent = '';
      sichtSetzen(b.getAttribute('data-sicht'));
    });
    ui.stage.addEventListener('pointerdown', function (ev) { if (!ev.target.closest('[data-lid]')) abwaehlen(); });

    ui.addText.addEventListener('click', function () { ui.picker.hidden = true; ebeneHinzufuegen(neuerText()); ui.textfeld.focus(); });
    ui.addSticker.addEventListener('click', function () { ui.pText.hidden = true; ui.picker.hidden = !ui.picker.hidden; stickerListeLaden(); });
    if (ui.addImg) ui.addImg.addEventListener('click', function () { ui.picker.hidden = true; ui.datei.click(); });
    ui.pickerZu.addEventListener('click', function () { ui.picker.hidden = true; });
    ui.undo.addEventListener('click', zurueck);
    ui.redo.addEventListener('click', wiederholen);
    ui.up.addEventListener('click', function () { ebeneVerschieben(1); });
    ui.down.addEventListener('click', function () { ebeneVerschieben(-1); });

    function textEbene() { var e = gewaehlt(); return e && e.type === 'text' ? e : null; }
    ui.textfeld.addEventListener('input', function () {
      var e = textEbene();
      if (!e) return;
      e.text = ui.textfeld.value.split('\n').slice(0, 4).map(function (z) { return Array.from(z).slice(0, 40).join(''); }).join('\n');
      if (ui.textfeld.value !== e.text) ui.textfeld.value = e.text;
      knotenZeichnen(e); geaendert(); speichernVerzoegert();
    });
    ui.schriftwahl.addEventListener('change', function () { var e = textEbene(); if (e) { e.font = ui.schriftwahl.value; knotenZeichnen(e); geaendert(); } });
    ui.farben.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-c]');
      var e = textEbene();
      if (b && e) { e.color = b.getAttribute('data-c'); farbeMarkieren(e.color); knotenZeichnen(e); geaendert(); }
    });
    ui.farbwahl.addEventListener('input', function () { var e = textEbene(); if (e) { e.color = ui.farbwahl.value; farbeMarkieren(e.color); knotenZeichnen(e); geaendert(); } });
    ui.fett.addEventListener('click', function () { var e = textEbene(); if (e) { e.bold = e.bold === false; knotenZeichnen(e); umschalterAlle(e); geaendert(); } });
    ui.kursiv.addEventListener('click', function () { var e = textEbene(); if (e) { e.italic = !e.italic; knotenZeichnen(e); umschalterAlle(e); geaendert(); } });
    [[ui.links, 'left'], [ui.mitteB, 'center'], [ui.rechts, 'right']].forEach(function (z) {
      z[0].addEventListener('click', function () { var e = textEbene(); if (e) { e.align = z[1]; knotenZeichnen(e); umschalterAlle(e); geaendert(); } });
    });
    function umschalterAlle(e) {
      umschalter(ui.fett, e.bold !== false); umschalter(ui.kursiv, !!e.italic);
      umschalter(ui.links, ausrichtung(e) === 'left'); umschalter(ui.mitteB, ausrichtung(e) === 'center'); umschalter(ui.rechts, ausrichtung(e) === 'right');
    }
    ui.rangeAbstand.addEventListener('input', function () { var e = textEbene(); if (e) { e.ls = parseFloat(ui.rangeAbstand.value) || 0; knotenZeichnen(e); geaendert(); } });
    ui.rangeKontur.addEventListener('input', function () { var e = textEbene(); if (e) { e.outl = parseFloat(ui.rangeKontur.value) || 0; knotenZeichnen(e); geaendert(); } });
    ui.konturFarbe.addEventListener('input', function () { var e = textEbene(); if (e) { e.outc = ui.konturFarbe.value; knotenZeichnen(e); geaendert(); } });
    ui.rangeZeilen.addEventListener('input', function () { var e = textEbene(); if (e) { e.lh = parseFloat(ui.rangeZeilen.value) || 1.05; knotenZeichnen(e); geaendert(); speichernVerzoegert(); } });
    ui.rangeGroesse.addEventListener('input', function () {
      var e = gewaehlt();
      if (e) { e.scale = bereich(0.06, 3, parseFloat(ui.rangeGroesse.value) || e.scale); knotenZeichnen(e); werteSetzen(e); aufloesungPruefen(e); geaendert(); }
    });
    ui.rangeDrehen.addEventListener('input', function () {
      var e = gewaehlt();
      if (e) { e.rot = parseFloat(ui.rangeDrehen.value) || 0; ui.drehenWert.textContent = Math.round(e.rot) + '\xB0'; knotenZeichnen(e); werteSetzen(e); geaendert(); }
    });
    ['x', 'y', 'groesse', 'rot', 'op'].forEach(function (k) {
      ui.felder[k].input.addEventListener('input', werteAnwenden);
      ui.felder[k].input.addEventListener('change', function () { werteAnwenden(); werteSetzen(gewaehlt()); });
    });
    ui.mitteH.addEventListener('click', function () { var e = gewaehlt(); if (e) { e.cx = 0.5; knotenZeichnen(e); werteSetzen(e); geaendert(); speichern(); } });
    ui.mitteV.addEventListener('click', function () { var e = gewaehlt(); if (e) { e.cy = 0.5; knotenZeichnen(e); werteSetzen(e); geaendert(); speichern(); } });
    ui.dup.addEventListener('click', function () {
      var e = gewaehlt();
      if (!e) return;
      var k = JSON.parse(JSON.stringify(e));
      k.id = neueId(); k.cx = Math.min(0.92, (e.cx || 0.5) + 0.05); k.cy = Math.min(0.92, (e.cy || 0.5) + 0.05);
      ebeneHinzufuegen(k);
    });
    ui.nachVorne.addEventListener('click', function () { ganzNachVorneHinten(true); });
    ui.nachHinten.addEventListener('click', function () { ganzNachVorneHinten(false); });
    // Änderungen in den Bedienfeldern werden zu einem Schritt im Verlauf (ausser den Filterreglern: dort zählt das Ende der Bearbeitung)
    body.addEventListener('change', function (ev) {
      if ([ui.fHell, ui.fKontrast, ui.fSatt, ui.fScharf].indexOf(ev.target) >= 0) return;
      speichern();
    });
    [ui.farben, ui.zeileFormat].forEach(function (n) { n.addEventListener('click', function () { setTimeout(speichern, 0); }); });

    // Foto bearbeiten
    function bildVorschau(e) {
      clearTimeout(bildVorschauTimer);
      bildVorschauTimer = setTimeout(function () {
        bildBearbeiten(e, 700).then(function (cv) {
          e.src = cv.toDataURL('image/png');
          var k = knoten[e.id];
          if (k && k.content.tagName === 'IMG') k.content.src = e.src;
          knotenZeichnen(e);
        }).catch(function () { /* Vorschau ist nur Komfort */ });
      }, 50);
    }
    /** Bearbeitung festschreiben: Vorschau (höchstens 1600 px) für die Bühne, volle Grösse als Druckdatei zu Cloudinary.
     *  Jede Bearbeitung hat eine Nummer: nur die letzte darf ihr Ergebnis eintragen (sonst überholt ein langsamer Upload einen schnelleren und die Kasse nimmt die alte Datei). */
    function bildUebernehmen(e) {
      var nr = bildVersion[e.id] = (bildVersion[e.id] || 0) + 1;
      function gilt() { return bildVersion[e.id] === nr; }
      // Sofort als «lädt hoch» markieren und die alte Adresse verwerfen: sonst könnte die Kasse in der kurzen Zeit des Rechnens noch den Stand vor der Bearbeitung nehmen
      if (CLOUDINARY_AKTIV) { e.uploading = true; e.printUrl = ''; geaendert(); }
      bildBearbeiten(e, 0).then(function (cv) {
        if (!gilt()) { leinwandFreigeben(cv); return; }
        var klein = cv;
        if (cv.width > 1600) {
          klein = document.createElement('canvas');
          klein.width = 1600; klein.height = Math.max(1, Math.round(cv.height * 1600 / cv.width));
          klein.getContext('2d').drawImage(cv, 0, 0, klein.width, klein.height);
        }
        e.src = klein.toDataURL('image/png');
        if (klein !== cv) leinwandFreigeben(klein);
        speichern();
        var k = knoten[e.id];
        if (k && k.content.tagName === 'IMG') k.content.src = e.src;
        knotenZeichnen(e); aufloesungPruefen(e);
        if (!CLOUDINARY_AKTIV) { leinwandFreigeben(cv); geaendert(); return; }
        try {
          cv.toBlob(function (blob) {
            leinwandFreigeben(cv);
            if (!gilt()) return;
            if (!blob) { e.uploading = false; geaendert(); return; }
            hochladen(blob, true, function (err, url) { if (!gilt()) return; e.uploading = false; if (!err && url) e.printUrl = url; geaendert(); }, uploadZeit);
          }, 'image/png');
        } catch (x) { leinwandFreigeben(cv); if (gilt()) { e.uploading = false; geaendert(); } }
      }).catch(function () { if (gilt()) { e.uploading = false; geaendert(); } });
    }
    function filterKnoepfeSetzen(e) {
      var b = e.edit || neueBearbeitung();
      ui.fHell.value = b.bri; ui.fKontrast.value = b.con; ui.fSatt.value = b.sat; ui.fScharf.value = b.sharp;
      umschalter(ui.btnBW, !!b.gray); umschalter(ui.btnCut, !!b.bg); umschalter(ui.btnFrame, !!b.frame);
    }
    ui.btnFlip.addEventListener('click', function () { var e = gewaehltesBild(); if (e) { e.edit.flipH = !e.edit.flipH; bildUebernehmen(e); } });
    ui.btnRot90.addEventListener('click', function () { var e = gewaehltesBild(); if (e) { e.edit.rotQ = ((e.edit.rotQ || 0) + 1) % 4; bildUebernehmen(e); } });
    ui.btnCut.addEventListener('click', function () { var e = gewaehltesBild(); if (e) { e.edit.bg = e.edit.bg ? 0 : 45; umschalter(ui.btnCut, !!e.edit.bg); bildUebernehmen(e); } });
    ui.btnFrame.addEventListener('click', function () { var e = gewaehltesBild(); if (e) { e.edit.frame = ((e.edit.frame || 0) + 1) % 3; umschalter(ui.btnFrame, !!e.edit.frame); bildUebernehmen(e); } });
    ui.btnFilter.addEventListener('click', function () {
      var e = gewaehltesBild();
      if (!e) return;
      filterKnoepfeSetzen(e);
      ui.pFilter.hidden = !ui.pFilter.hidden;
      ui.btnFilter.setAttribute('aria-expanded', ui.pFilter.hidden ? 'false' : 'true');
    });
    [ui.fHell, ui.fKontrast, ui.fSatt, ui.fScharf].forEach(function (r) {
      r.addEventListener('input', function () {
        var e = gewaehltesBild();
        if (!e) return;
        e.edit.bri = parseInt(ui.fHell.value, 10); e.edit.con = parseInt(ui.fKontrast.value, 10);
        e.edit.sat = parseInt(ui.fSatt.value, 10); e.edit.sharp = parseInt(ui.fScharf.value, 10);
        bildVorschau(e);
      });
      r.addEventListener('change', function () { var e = gewaehltesBild(); if (e) bildUebernehmen(e); });
    });
    ui.btnBW.addEventListener('click', function () { var e = gewaehltesBild(); if (e) { e.edit.gray = e.edit.gray ? 0 : 100; umschalter(ui.btnBW, !!e.edit.gray); bildUebernehmen(e); } });
    ui.btnReset.addEventListener('click', function () { var e = gewaehltesBild(); if (e) { e.edit = neueBearbeitung(); filterKnoepfeSetzen(e); bildUebernehmen(e); } });
    ui.btnCrop.addEventListener('click', function () { var e = gewaehltesBild(); if (e) zuschneiden(e); });

    /** Zuschneiden: Rahmen auf dem Originalbild ziehen (Ausschnitt in Anteilen des Originals). */
    function zuschneiden(e) {
      bildLaden(e.origSrc || e.src).then(function () {
        var modal = el('div', { class: 'lsp6-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.cropHead });
        modal.appendChild(el('div', { class: 'lsp6-modal-t', text: T.cropHead }));
        var wrap = el('div', { style: 'position:relative;line-height:0;touch-action:none' });
        var img = el('img', { src: e.origSrc || e.src, alt: '', style: 'display:block;max-width:88vw;max-height:62vh;user-select:none;-webkit-user-drag:none' });
        wrap.appendChild(img);
        var rahmen = el('div', { style: 'position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.5);box-sizing:border-box;cursor:move;touch-action:none' });
        var griff = el('div', { style: 'position:absolute;right:-14px;bottom:-14px;width:28px;height:28px;border-radius:50%;background:#c1922f;border:2px solid #fff;cursor:nwse-resize;touch-action:none' });
        rahmen.appendChild(griff); wrap.appendChild(rahmen);
        var ok = knopf(T.apply, 'lsp6-btn dark', { style: 'flex:none;padding:12px 22px;border-radius:999px;background:#8a6410;border-color:#8a6410' });
        var abbruch = knopf(T.cancel, 'lsp6-btn', { style: 'flex:none;padding:12px 22px;border-radius:999px' });
        modal.appendChild(wrap);
        modal.appendChild(el('div', { style: 'display:flex;gap:10px;margin-top:14px' }, [ok, abbruch]));
        document.body.appendChild(modal);
        function bildMass() { return { w: img.clientWidth || 1, h: img.clientHeight || 1 }; }
        function setzen(x, y, w, h) { rahmen.style.left = x + 'px'; rahmen.style.top = y + 'px'; rahmen.style.width = w + 'px'; rahmen.style.height = h + 'px'; }
        function lesen() { return { x: parseFloat(rahmen.style.left) || 0, y: parseFloat(rahmen.style.top) || 0, w: parseFloat(rahmen.style.width) || 0, h: parseFloat(rahmen.style.height) || 0 }; }
        function anfang() { var m = bildMass(), b = e.edit || neueBearbeitung(); setzen(b.cx0 * m.w, b.cy0 * m.h, Math.max(30, b.cw * m.w), Math.max(30, b.ch * m.h)); }
        if (img.complete) anfang(); else img.onload = anfang;
        function einpassenRahmen() {
          var m = bildMass(), r = lesen();
          var x = Math.max(0, Math.min(r.x, m.w - 30)), y = Math.max(0, Math.min(r.y, m.h - 30));
          setzen(x, y, Math.max(30, Math.min(r.w, m.w - x)), Math.max(30, Math.min(r.h, m.h - y)));
        }
        var zug = null;
        rahmen.addEventListener('pointerdown', function (ev) {
          if (ev.target === griff) return;
          ev.preventDefault();
          try { rahmen.setPointerCapture(ev.pointerId); } catch (x) { /* egal */ }
          var r = lesen(); zug = { m: 'move', px: ev.clientX, py: ev.clientY, x0: r.x, y0: r.y };
        });
        griff.addEventListener('pointerdown', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          try { griff.setPointerCapture(ev.pointerId); } catch (x) { /* egal */ }
          var r = lesen(); zug = { m: 'size', px: ev.clientX, py: ev.clientY, w0: r.w, h0: r.h };
        });
        function ziehen(ev) {
          if (!zug) return;
          ev.preventDefault();
          var r = lesen();
          if (zug.m === 'move') setzen(zug.x0 + (ev.clientX - zug.px), zug.y0 + (ev.clientY - zug.py), r.w, r.h);
          else setzen(r.x, r.y, zug.w0 + (ev.clientX - zug.px), zug.h0 + (ev.clientY - zug.py));
          einpassenRahmen();
        }
        function loslassen() { zug = null; }
        [rahmen, griff].forEach(function (n) {
          n.addEventListener('pointermove', ziehen); n.addEventListener('pointerup', loslassen); n.addEventListener('pointercancel', loslassen);
        });
        function zu() { modal.remove(); }
        abbruch.addEventListener('click', zu);
        modal.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') zu(); });
        ok.addEventListener('click', function () {
          var m = bildMass(), r = lesen();
          e.edit.cx0 = Math.max(0, r.x / m.w); e.edit.cy0 = Math.max(0, r.y / m.h);
          e.edit.cw = Math.min(1 - e.edit.cx0, r.w / m.w); e.edit.ch = Math.min(1 - e.edit.cy0, r.h / m.h);
          zu(); bildUebernehmen(e);
        });
        ok.focus();
      }).catch(function () { /* Bild nicht ladbar */ });
    }

    // Foto hochladen
    ui.datei.addEventListener('change', function () {
      var f = ui.datei.files && ui.datei.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { meldung(T.tooBig, 'err'); return; }
      var leser = new FileReader();
      leser.onload = function () {
        var e = neuesBild(leser.result, '', true);
        ebeneHinzufuegen(e);
        meldung(T.uploading);
        bildLaden(leser.result).then(function (img) {
          e._origW = img.naturalWidth || img.width; e._origH = img.naturalHeight || img.height;
          origMass[e.id] = { w: e._origW, h: e._origH };
          einpassen(e, { w: e._origW, h: e._origH });
          if (st.sel === e.id) aufloesungPruefen(e);
        }).catch(function () { /* egal */ });
        var nr0 = bildVersion[e.id] || 0;
        hochladen(f, false, function (err, url) {
          if ((bildVersion[e.id] || 0) !== nr0) return;   // inzwischen bearbeitet: die Bearbeitung hat ihren eigenen Upload
          e.uploading = false;
          if (err) { meldung(T.upErr + err.message, 'err'); return; }
          e.printUrl = url; meldung(''); geaendert();
        }, uploadZeit);
      };
      leser.readAsDataURL(f);
      ui.datei.value = '';
    });

    // Sticker
    var stickerGeladen = false;
    var stickerListe = [];
    function stickerListeLaden() {
      if (stickerGeladen) return;
      stickerGeladen = true;
      ui.stickerRaster.innerHTML = '<div style="grid-column:1/-1;color:#5b5a62;font-size:13px;text-align:center;padding:10px">…</div>';
      fetch(STICKER_INDEX, { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (j) { stickerListe = j || []; stickerRasterZeigen(); })
        .catch(function () { stickerListe = STICKER_RUECKFALL.slice(); stickerRasterZeigen(); });
    }
    function stickerRasterZeigen() {
      ui.stickerRaster.textContent = '';
      if (!stickerListe.length) { ui.stickerRaster.appendChild(el('div', { style: 'grid-column:1/-1;color:#5b5a62;font-size:13px;text-align:center;padding:10px', text: '…' })); return; }
      stickerListe.forEach(function (name) {
        var b = el('button', { type: 'button', 'aria-label': name, style: 'border:1px solid #ece7df;border-radius:10px;background:#faf8f5;padding:6px;cursor:pointer;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center' });
        b.appendChild(el('img', { src: STICKER_BASIS + name + '.png', alt: '', loading: 'lazy', style: 'max-width:100%;max-height:100%;pointer-events:none' }));
        b.addEventListener('click', function () {
          var s = neuerSticker(name);
          ebeneHinzufuegen(s);
          ui.picker.hidden = true;
          bildLaden(stickerQuelle(s.src)).then(function (img) { einpassen(s, { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height }); }).catch(function () { /* egal */ });
        });
        ui.stickerRaster.appendChild(b);
      });
    }

    // Druck-Vorschau: genau die Datei, die später hochgeladen wird
    ui.preview.addEventListener('click', function () {
      abwaehlen();
      meldung(T.baking);
      druckdateiErzeugen(st.aktiv).then(function (blob) {
        meldung('');
        if (!blob) { meldung(T.empty, 'err'); return; }
        var url = URL.createObjectURL(blob);
        var g = geo(pAktiv());
        var modal = el('div', { class: 'lsp6-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.previewHead });
        modal.appendChild(el('div', { class: 'lsp6-modal-t', text: T.previewHead }));
        modal.appendChild(el('div', { class: 'lsp6-modal-s', text: T.previewSub + ' ' + fmt(T.previewInfo, { w: g.render.w, h: g.render.h }) }));
        var ruck = el('div', { class: 'lsp6-checker' }, [el('img', { src: url, alt: '', style: 'display:block;max-width:82vw;max-height:58vh' })]);
        modal.appendChild(ruck);
        var zuBtn = el('button', { type: 'button', class: 'go', text: T.close });
        function zu() { modal.remove(); try { URL.revokeObjectURL(url); } catch (x) { /* egal */ } }
        zuBtn.addEventListener('click', zu);
        modal.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') zu(); });
        modal.appendChild(zuBtn);
        document.body.appendChild(modal);
        zuBtn.focus();
      }).catch(function () { meldung(T.printErr, 'err'); });
    });

    // In den Warenkorb
    /** Eingaben während des Bauens der Druckdateien sperren (sonst gehört die hochgeladene Datei zu einem älteren Stand des Entwurfs). */
    function sperren(an) {
      ui.cta.disabled = an; ui.cta.style.opacity = an ? '0.7' : '1';
      try { if (an) ui.karte.setAttribute('inert', ''); else ui.karte.removeAttribute('inert'); } catch (x) { /* egal */ }
    }
    ui.cta.addEventListener('click', function () {
      if (eingefroren) return;
      varianteGeprueft();   // gewählte Variante und Modell jetzt übernehmen (baut bei einem Modellwechsel die Oberfläche um)
      var fremde = fremdeMitEbenen();
      var verwendet = karte.platzierungen.filter(function (p) { return st.ebenen[p.id].length > 0; });
      if (!verwendet.length && !fremde.length) { meldung(T.empty, 'err'); return; }
      if (fremde.length) { meldung(fmt(T.orphan, { a: fremde.map(function (id) { return titelVon(platzierung(id)); }).join(', ') }), 'err'); return; }
      if (verwendet.some(function (p) { return st.ebenen[p.id].some(function (e) { return e.uploading; }); })) { meldung(T.stillUp, 'err'); return; }
      var shopId = st.shopVariante;
      if (!shopId) { meldung(T.noVar, 'err'); return; }
      if (!ausfuehrungOk()) { meldung(T.noMap, 'err'); return; }
      for (var i = 0; i < verwendet.length; i++) {
        var b = blockiertDurch(verwendet[i].id);
        if (b.length) { meldung(fmt(T.blocked, { a: titelVon(verwendet[i]), b: b.map(function (q) { return titelVon(platzierung(q)); }).join(', ') }), 'err'); return; }   // kann nur eintreten, wenn der Verlauf einen unzulässigen Stand lieferte
      }
      // Qualitätstor: ein Foto unter der Mindest-dpi der Karte sperrt den Kauf (der Sync prüft die Auflösung an der Datei, und die ist immer so gross wie das Printfile)
      var qs = qualitaetSperre();
      if (qs) { meldung(qs, 'err'); return; }
      // Zu viele Druckflächen auf einmal: die Kennung _pod_karte passt dann nicht in eine Warenkorb-Eigenschaft (255 Zeichen). Vorher prüfen, damit nichts hochgeladen wird.
      if (podKarteWert(verwendet).length > POD_KARTE_MAX) { meldung(T.tooMany, 'err'); return; }
      // Variante und Geometrie jetzt einfrieren: alle Druckdateien und die Eigenschaften gehören zu DIESER Variante, auch wenn die Seite sie während des Bauens wechselt
      eingefroren = { sv: String(shopId), pv: st.pfVariante };
      sperren(true);
      abwaehlen();
      verkleinertText = '';
      function fehler(err) {
        eingefroren = null;
        druckUrls = {};
        vorschauUrl = '';
        formularSynchronisieren();
        sperren(false);
        meldung(T.addErr + ((err && err.message) || T.printErr), 'err');
      }
      druckUrls = {};
      if (!CLOUDINARY_AKTIV) { fehler(new Error(T.printErr)); return; }
      meldung(T.baking);
      var kette = Promise.resolve();
      verwendet.forEach(function (p) {
        kette = kette.then(function () {
          return druckdateiSenden(p, eingefroren.pv).then(function (url) { druckUrls[p.id] = url; });
        });
      });
      var eigenschaftenFertig = null;
      kette = kette.then(function () { return vorschauSenden(verwendet); });   // Komfort, wirft nie
      kette.then(function () {
        if (verwendet.some(function (p) { return !druckUrls[p.id]; })) throw new Error(T.printErr);
        // Hat die Seite die Variante inzwischen gewechselt, gehört der Warenkorb-Eintrag nicht mehr zu dem, was der Kunde jetzt gewählt hat: abbrechen
        if (String(aktuelleShopVariante()) !== eingefroren.sv) throw new Error(T.varChanged);
        eigenschaftenFertig = eigenschaften();
        if (eigenschaftenFertig._pod_karte && eigenschaftenFertig._pod_karte.length > POD_KARTE_MAX) throw new Error(T.tooMany);
        meldung(T.adding + (verkleinertText ? ' ' + verkleinertText : ''));
        return fetch(CART_ADD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: eingefroren.sv, quantity: 1, properties: eigenschaftenFertig }),
        });
      }).then(function (r) {
        return r.ok ? r.json() : r.json().then(function (d) { throw new Error(d.description || 'Fehler'); });
      }).then(function () {
        meldung(T.added, 'ok');
        entwurfAus = true; clearTimeout(entwurfTimer); speicherLoeschen(entwurfKey);   // der Entwurf ist im Warenkorb angekommen
        window.location.href = CART_URL;
      }).catch(function (err) {
        fehler(err);
        varianteGeprueft();   // eine inzwischen gewählte andere Variante jetzt nachziehen
      });
    });

    // Tastatur (wie v5): Strg+Z / Strg+Y, Entf, Pfeiltasten
    ui.karte.addEventListener('keydown', function (ev) {
      var tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var taste = (ev.key || '').toLowerCase();
      var strg = ev.ctrlKey || ev.metaKey;
      if (strg && taste === 'z' && !ev.shiftKey) { ev.preventDefault(); zurueck(); return; }
      if (strg && (taste === 'y' || (taste === 'z' && ev.shiftKey))) { ev.preventDefault(); wiederholen(); return; }
      var e = gewaehlt();
      if (!e) return;
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); ebeneEntfernen(e.id); return; }
      var s = ev.shiftKey ? 0.02 : 0.005, dx = 0, dy = 0;
      if (ev.key === 'ArrowLeft') dx = -s; else if (ev.key === 'ArrowRight') dx = s; else if (ev.key === 'ArrowUp') dy = -s; else if (ev.key === 'ArrowDown') dy = s; else return;
      ev.preventDefault();
      e.cx = bereich(0, 1, e.cx + dx); e.cy = bereich(0, 1, e.cy + dy);
      knotenZeichnen(e); werteSetzen(e); geaendert();
    });
    ui.karte.addEventListener('keyup', function (ev) { if ((ev.key || '').indexOf('Arrow') === 0) speichern(); });

    // Grösse der Bühne ändert sich (Fenster, Drehen des Geräts): Ebenen neu setzen
    if (window.ResizeObserver) {
      var beobachter = new ResizeObserver(function () { if (geoAktiv) alleZeichnen(); });
      beobachter.observe(ui.stage);
    } else window.addEventListener('resize', function () { if (geoAktiv) alleZeichnen(); });

    // Variantenwechsel (andere Farbe/Grösse): Modell, Geometrie und Hintergrund nachziehen, wie v5 mit Taktgeber
    function mehrereGeometrien() {
      return karte.druckdateiGruppen.length > 1 || karte.platzierungen.some(function (p) { return (p.geometrien || []).length > 1; });
    }
    function varianteGeprueft() {
      if (eingefroren) return;   // während die Druckdateien gebaut werden, gilt die eingefrorene Variante
      if (!variantenLesen()) return;
      if (legacy) { bildSetzen(ui.bg, legacyBild()); return; }
      var modellGewechselt = modellAnpassen();
      if (modellGewechselt) {
        abwaehlen();
        knotenLoeschen();
        buehneAufbauen(); metaAktualisieren(); knotenNeuAufbauen();
        tabsAufbauen(); felderAktualisieren(); aufpreisSummeAktualisieren(); reiterHinweis('');
        sichtAktualisieren();
        return;
      }
      buehneAufbauen(); metaAktualisieren(); alleZeichnen();
      var e = gewaehlt(); if (e) { werteSetzen(e); aufloesungPruefen(e); }
      modellHinweisAktualisieren();
    }
    function varianteBeobachten() {
      if (legacy ? !Object.keys(karte.imgMap).length : !(buendel || mehrereGeometrien() || Object.keys(karte.farbeVon).length || Object.keys(karte.shop).length)) return;
      document.addEventListener('change', varianteGeprueft, true);
      document.addEventListener('click', function () { setTimeout(varianteGeprueft, 60); }, true);
      window.addEventListener('popstate', varianteGeprueft);
      var takt = setInterval(function () { if (!document.body.contains(ui.karte)) clearInterval(takt); else varianteGeprueft(); }, VARIANTEN_TAKT_MS);
    }

    // ── Start ───────────────────────────────────────────────────────────────────────────────────
    variantenLesen();
    modellAnpassen();
    var wiederhergestellt = entwurfLaden();   // setzt st.ebenen und st.aktiv, baut noch nichts auf
    buehneAufbauen();
    metaAktualisieren();
    if (wiederhergestellt) knotenNeuAufbauen();
    tabsAufbauen();
    ui.tabKnoepfe = ui.tabKnoepfe || {};
    Object.keys(ui.tabKnoepfe).forEach(function (id) { ui.tabKnoepfe[id].setAttribute('aria-controls', stageId); });
    ui.picker.hidden = true;
    ui.pFilter.hidden = true;
    ui.summe.hidden = true;
    ui.dpiBox.hidden = true;
    felderAktualisieren();
    aufpreisSummeAktualisieren();
    modellHinweisAktualisieren();
    varianteBeobachten();
    speichern();
    if (wiederhergestellt) { meldung(T.draftBack + (entwurfFehlt ? ' ' + T.draftLost : ''), 'ok'); felderAktualisieren(); }
    entwurfBereit = true;
    // Tab-Wechsel auf dem Handy: beim Verlassen der Seite sofort sichern (der verzögerte Zeitgeber läuft dann vielleicht nicht mehr)
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && document.body.contains(ui.karte)) entwurfSofort(); });
    window.addEventListener('pagehide', function () { if (document.body.contains(ui.karte)) entwurfSofort(); });
    // Sprungziel der Theme-Schaltfläche «Zuerst dein Design gestalten» (href="#lspod-start"): das Theme setzt die Kennung nur an Container der Klasse «lspod-designer»
    try { if (!document.getElementById('lspod-start')) ui.karte.id = 'lspod-start'; } catch (x) { /* egal */ }
    container.setAttribute('data-lspod6-modus', legacy ? 'v5' : 'karte');

    var api = {
      get karte() { return karte; }, wurzel: wurzel, st: st, ui: ui, legacy: legacy, maxPixel: maxPixel, maxBytes: maxBytes,
      ausfuehrungOk: ausfuehrungOk, varianteGeprueft: varianteGeprueft,
      geo: function (id) { return geo(platzierung(id || st.aktiv)); },
      wechseln: platzierungWechseln, druckdateiErzeugen: druckdateiErzeugen, eigenschaften: eigenschaften, platzierungIds: tabIds,
      neuerText: function (text) { var e = neuerText(); e.text = text; ebeneHinzufuegen(e); return e; },
      neuesBild: function (src, w, h) { var e = neuesBild(src, '', false); e._origW = w; e._origH = h; ebeneHinzufuegen(e); return e; },
      entfernen: ebeneEntfernen, zurueck: zurueck, wiederholen: wiederholen, speichern: speichern, waehlen: waehlen,
      // Neu in 6.2.0
      vorschauDatenSetzen: vorschauDatenSetzen, sichtSetzen: sichtSetzen, vorschauZeichnen: vorschauZeichnen, vorschauExport: vorschauExport, qualitaetLage: qualitaetLage,
      qualitaetSperre: qualitaetSperre, entwurfSofort: entwurfSofort, entwurfKey: entwurfKey, vorschauSenden: vorschauSenden,
    };
    return api;
  }

  // ── Karte finden und Editor starten ─────────────────────────────────────────────────────────────
  function warnung(text) { if (window.console && console.warn) console.warn('[lspod6] ' + text); }

  /** Die Karte des Containers: eingebettetes JSON (script#lspod-karte), data-karte oder data-karte-url. Gibt ein Versprechen auf die Karte oder null. */
  function karteLesen(container) {
    var skript = container.querySelector('script#lspod-karte, script[data-lspod-karte]') || document.getElementById('lspod-karte');
    var text = skript ? skript.textContent : container.getAttribute('data-karte');
    var url = container.getAttribute('data-karte-url');
    function ausText(t) {
      try {
        var r = karteNormalisieren(JSON.parse(t));
        if (r.karte) return r.karte;
        warnung('Karte unbrauchbar: ' + r.fehler);
      } catch (e) { warnung('Karte ist kein gültiges JSON'); }
      return null;
    }
    if (text && /\S/.test(text)) {
      var k = ausText(text);
      if (k) return Promise.resolve(k);
    }
    if (url) {
      return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(ausText).catch(function (e) { warnung('Karte nicht ladbar: ' + e.message); return null; });
    }
    return Promise.resolve(null);
  }

  /** Die Vorschaudaten des Containers (Schema 1): eingebettetes JSON (script#lspod-vorschau), data-vorschau oder data-vorschau-url. Gibt ein Versprechen auf das geparste Objekt oder null; wirft nie. */
  function vorschauLesen(container) {
    var skript = container.querySelector('script#lspod-vorschau, script[data-lspod-vorschau]') || document.getElementById('lspod-vorschau');
    var text = skript ? skript.textContent : container.getAttribute('data-vorschau');
    var url = container.getAttribute('data-vorschau-url');
    function ausText(t) { try { return JSON.parse(t); } catch (e) { warnung('Vorschaudaten sind kein gültiges JSON'); return null; } }
    if (text && /\S/.test(text)) { var j = ausText(text); if (j) return Promise.resolve(j); }
    if (url) {
      return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(ausText).catch(function (e) { warnung('Vorschaudaten nicht ladbar: ' + e.message); return null; });
    }
    return Promise.resolve(null);
  }

  function mounten(container) {
    if (container.getAttribute('data-init-v6')) return;
    container.setAttribute('data-init-v6', 'busy');
    karteLesen(container).then(function (karte) {
      try {
        var k = karte || legacyKarte(container);
        if (!karte) warnung('keine gültige Karte: Editor läuft im v5-Modus');
        var editor = baueEditor(container, k);
        editoren.push(editor);
        container.setAttribute('data-init-v6', '1');
        // Die Vorschaudaten kommen nach dem Bau und blockieren den Start nicht; ohne sie (oder im v5-Modus) bleibt der Editor, wie er ist
        if (karte) vorschauLesen(container).then(function (roh) { if (roh) editor.vorschauDatenSetzen(roh); });
      } catch (err) {
        container.setAttribute('data-init-v6', 'err');
        if (window.console && console.error) console.error('[lspod6] build error:', err);
      }
    });
  }

  function alleStarten() {
    Array.prototype.forEach.call(document.querySelectorAll('.lspod-designer-v6'), mounten);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alleStarten); else alleStarten();
  window.addEventListener('load', alleStarten);
  [300, 800, 1500, 2500, 4000, 6000, 8000].forEach(function (ms) {
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.lspod-designer-v6[data-init-v6="err"]'), function (c) { c.removeAttribute('data-init-v6'); });
      alleStarten();
    }, ms);
  });

  // Für Tests und Fehlersuche
  window.LSPOD6 = {
    version: VERSION,
    editors: editoren,
    hilfen: {
      aufpreisChf: aufpreisChf, platzierungAufpreisChf: platzierungAufpreisChf, schweizerZahl: schweizerZahl, dateiMasse: dateiMasse, renderGroesse: renderGroesse,
      zahlAnzeige: zahlAnzeige, sichtfenster: sichtfenster, karteNormalisieren: karteNormalisieren, geometrieFuer: geometrieFuer, blockierer: blockierer, legacyKarte: legacyKarte,
      bildDpi: bildDpi, platzierungOk: platzierungOk, MAX_PIXEL: MAX_PIXEL, MIN_DPI_VORGABE: MIN_DPI_VORGABE, HINWEIS_CODES: Object.keys(HINWEIS_TEXTE),
      // Neu in 6.2.0
      qualitaetStufe: qualitaetStufe, dpiGanz: dpiGanz, DPI_GUT: DPI_GUT, einpassRechteck: einpassRechteck, vorlageLage: vorlageLage, kontrastAnalyse: kontrastAnalyse,
      kontrastVerhaeltnis: kontrastVerhaeltnis, leuchtdichte: leuchtdichte, vorschauNormalisieren: vorschauNormalisieren, tasseOk: tasseOk, ausschnittHoehePx: ausschnittHoehePx,
      ebeneFuerEntwurf: ebeneFuerEntwurf, ebeneAusEntwurf: ebeneAusEntwurf, VORSCHAU_PX: VORSCHAU_PX, VORSCHAU_MAX_BYTES: VORSCHAU_MAX_BYTES,
    },
  };
})();
