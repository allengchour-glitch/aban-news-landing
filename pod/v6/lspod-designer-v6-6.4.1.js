/*!
 * LuxeStyle «Selbst gestalten»: Editor v6.4.1 «Auf dem Produkt bearbeiten» (Entwurf vom 09.11.2026; 6.4.0, 6.3.0 und 6.3.1 bleiben unverändert als Rücknahme).
 *
 * NEU in 6.4.1 (Delta zu 6.4.0; Druckdatei, _pod_karte, _vorschau und Eigenschaften sind sonst byte-gleich):
 *   - Standard-Textfarbe: ein neuer Text startet weiss oder #111111, je nachdem, was gegen die Stofffarbe der gewählten Ausführung den besseren Kontrast hat (vorher immer #111111: schwarze Schrift
 *     auf schwarzem Stoff). Eine Textebene, deren Farbe der unveränderte Standard ist, folgt dem Wechsel der Ausführung; eine gewählte Farbe wird nie überschrieben. GEWOLLTE Änderung der Druckdatei.
 *   - Der Kontrast-Hinweis («Dein Motiv ist dunkel und der Stoff ebenfalls») erscheint auch in «Bearbeiten» und «Druckversion», gerechnet aus dem Design gegen die Stofffarbe (nicht aus der Vorschau).
 *   - Weisse Schrift bekommt keinen halbtransparenten Schatten mehr (Konstante WEISS_SCHATTEN, Vorgabe false): in Druckdatei, Vorschau und Bühne. GEWOLLTE Änderung der Druckdatei für weissen Text.
 *   - Handy: die Knöpfe «Text | Sticker | Bild» stehen direkt unter der Bühne statt am Ende der Seite.
 *   - Kleinigkeiten ohne Wirkung auf die Druckdatei: Beschriftung der Druckfläche bleibt im Rahmen, Vorschau ist ein tabpanel, Pfeile und Entf auf den Reitern der Platzierungen gehören dem Reiter,
 *     Schieberwerte folgen den Zahlenfeldern.
 *
 * NEU in 6.4.0 (Ansichten «Bearbeiten | Druckversion | Vorschau», wie Printfuls Design Maker):
 *   - «Bearbeiten» zeigt bei Platzierungen mit echtem Produktfoto (Kleidung, Taschen: Vorschaudaten kennen das Foto, Adapter «flach») das Produkt: Stofffarbe oder Textur als Grund,
 *     das Motiv auf der Druckfläche (nur dort sichtbar), das Vorlagenbild (Schatten, Falten) DARÜBER, genau in der Reihenfolge der Vorschau. Rahmen und Griffe liegen über dem Foto
 *     und werden nie beschnitten. Zoom in drei Stufen: Ganzes Produkt, Produkt (Vorgabe, Druckfläche mit 35 % Rand), Druckfläche. «Druckversion» ist die Bühne von 6.3.1,
 *     «Vorschau» das bisherige «Auf dem Produkt» (Canvas). Alle anderen Fälle (Tasse, Poster, Raster-Vorlagen, Hinweise, ohne Vorschaudaten) zeigen in «Bearbeiten» die Bühne von 6.3.1.
 *   - Schalter data-bearbeiten am Container: fehlt oder 1 = «Bearbeiten» ist Startansicht; angebot = angeboten, Start in «Druckversion»; 0 oder aus = Verhalten wie 6.3.1.
 *   - Behoben: (A) das Theme-CSS img{max-width:100%} quetschte das Vorlagenbild; (B) der rote Hinweis «noch nicht eingerichtet» blieb bei Bündelprodukten nach gültiger Wahl stehen;
 *     (C) «Diese Kombination gibt es nicht» statt «noch nicht eingerichtet», wenn die Seite keine Ausführung gewählt hat; (D) ohne Vorschau-Eichung (Foto) fehlt der Reiter «Vorschau».
 *   - Die Druckdatei, die Eigenschaften (_pod_karte, _vorschau), der Kaufweg und der Entwurf hängen von der Ansicht nie ab.
 *
 * NEU in 6.3.1:
 *   - Mobile Druckdatei und Produktansicht stehen proportional und einspaltig untereinander.
 *
 * NEU in 6.3.0 (WP5 des Bauplans):
 *   - «In den Warenkorb» öffnet zuerst eine verbindliche Druckprüfung für ALLE gestalteten Flächen. Gezeigt werden die ausgewählte Ausführung, das Printful-Modell,
 *     alle Platzierungen, die exakten finalen PNG-Druckdateien und, wo belastbar verfügbar, zusätzlich die Produktansicht. Fehlt die Produktansicht, sagt der Dialog
 *     das offen; die exakte Druckdatei bleibt prüfbar.
 *   - Erst eine ausdrückliche Checkbox und «Druckvorschau bestätigen und in den Warenkorb» starten die Uploads. Hochgeladen werden dieselben Blob-Objekte, die im
 *     Dialog gezeigt wurden; nach der Bestätigung wird keine Druckdatei neu gerendert. Jede Design-, Platzierungs-, Modell- oder Variantenänderung verwirft die Prüfung.
 *   - Dialog mit Fokusfalle, Escape/Abbrechen, Fokus-Rückgabe und mobiler Einspalten-Ansicht.
 *
 * NEU in 6.2.0 (WP3 und WP4 des Bauplans):
 *   - Ansicht «Auf dem Produkt» neben «Druckfläche»: Canvas im Browser aus Hintergrundfarbe der Variante, Design (auf die Druckfläche beschnitten) und Vorlagenbild
 *     (Schatten, Falten). Der Platzierungs-Reiter wechselt die Vorlage. Adapter für Tasse (Zylinder) und Poster/Leinwand (Papier mit Schatten). Stickerei und Rundum-Druck
 *     zeigen einen ehrlichen Hinweis statt einer Vorschau. Kontrast-Hinweis bei Design und Stoff mit ähnlicher Helligkeit. Export als JPEG 800 × 800 (Eigenschaft «_vorschau»).
 *     Daten dazu: <div data-vorschau-url="…"> oder <script type="application/json" id="lspod-vorschau"> (Schema 1, gebaut von werkzeug/vorschau_daten_bauen.mjs);
 *     ohne Daten, bei fehlendem Bild oder CORS-Fehler bleibt es bei der Ansicht «Druckfläche» (ohne Fehler). Hängt ein Vorlagenbild, gilt data-vorschau-zeit (ms, Vorgabe 10 000) für die sichtbare
 *     Ansicht; beim Kauf hält die Vorschau die Bestellung höchstens 4 s (oder weniger, wenn data-vorschau-zeit kleiner ist) auf. Platzierungen mit festem Farbfoto der Vorlage («farbfest» in den
 *     Vorschaudaten) zeigen einen Hinweis statt einer Vorschau in der falschen Farbe. Eine Tasse ohne gespiegeltes Katalogfoto hat keinen Umschalter (fehlt das Foto nur bei einzelnen Ausführungen: Hinweis).
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
 * data-karte-pflicht="1" schaltet diesen Rückfall für exakte Produktkarten aus: fehlt die Karte, blockiert der Editor den Kaufpfad.
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

  var VERSION = '6.4.1';

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
  var VORSCHAU_ZEIT_MS = 10000;                   // Zeitlimit für Bilder der sichtbaren Ansicht (sonst Rückfall auf die Druckfläche); Attribut data-vorschau-zeit
  var VORSCHAU_KAUF_MS = 4000;                    // Beim Kauf darf die Vorschau (Zeichnen, Export, Upload) höchstens so lange aufhalten; danach geht die Bestellung ohne «_vorschau» weiter
  var DPI_GUT = 150;                              // ab hier kein Hinweis mehr; zwischen dem Mindestwert der Karte und 150 gibt es eine Warnung
  var KONTRAST_SCHWELLE = 1.8;                    // Kontrastverhältnis (WCAG-Formel) Design gegen Stoff, darunter gilt ein Pixel als schlecht lesbar
  var KONTRAST_ANTEIL = 0.6;                      // so viel der Design-Fläche (alphagewichtet) muss schlecht lesbar sein, damit der Hinweis erscheint
  // ── Konfiguration neu in 6.4.0 ──────────────────────────────────────────────────────────────────
  var BEARBEITEN_RAND = 0.35;                     // «Bearbeiten»: Rand um die Druckfläche, Anteil der längeren Seite der Fläche (je Seite)
  var BEARBEITEN_MIN_ANTEIL = 0.45;               // die Druckfläche füllt in jeder Achse mindestens so viel vom Fenster (Handy), solange das Seitenverhältnis es zulässt
  // ── Konfiguration neu in 6.4.1 ──────────────────────────────────────────────────────────────────
  /** Weisse Schrift mit halbtransparentem schwarzem Schatten (bis 6.4.0 in Druckdatei, Vorschau und Bühne). Vorgabe false: Printfuls Hilfe rät bei DTG von Schatten und Halbtransparenz ab (QUELLE Hilfe-Seiten,
   *  Hypothese: Schwarz mit 40 % Deckkraft druckt als grauer Hof; im echten Druck ungemessen). Rückkehr zu 6.4.0 = diese eine Zeile auf true. Entscheid des Besitzers steht aus. */
  var WEISS_SCHATTEN = false;
  var TEXT_DUNKEL = '#111111';                    // Standardfarbe eines neuen Textes auf hellem Stoff (wie bis 6.4.0 immer)
  var TEXT_HELL = '#ffffff';                      // Standardfarbe auf dunklem Stoff
  var ENTWURF_SCHLUESSEL = 'lspod6:entwurf:';
  var ENTWURF_MAX_ALTER_MS = 7 * 24 * 3600 * 1000;
  var ENTWURF_MAX_ZEICHEN = 200000;               // grösser wird nicht gespeichert (Speicherplatz des Browsers ist knapp)

  // ── Schriften und Farben (wie v5) ───────────────────────────────────────────────────────────────
  var SCHRIFT_NAMEN = EN ? ['Modern Sans', 'Elegant Serif', 'Handwriting', 'Bold Display', 'Mono']
    : ['Modern ohne Serifen', 'Elegant mit Serifen', 'Handschrift', 'Kräftige Überschrift', 'Schreibmaschine'];
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
      cta: 'Druckvorschau prüfen', empty: 'Füge zuerst Text, ein Bild oder einen Sticker hinzu.',
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
      varChanged: 'Du hast die Ausführung gewechselt. Bitte prüfe die Druckvorschau erneut.',
      tooMany: 'Zu viele Druckflächen auf einmal. Bestelle dein Design bitte in zwei Teilen.',
      sheetInfo: 'Druckbogen {w} \xD7 {h} cm',
      sichtLabel: 'Ansicht', sichtDruck: 'Druckfläche', sichtProdukt: 'Auf dem Produkt',
      pvAlt: 'Vorschau deines Motivs auf dem Produkt', pvLaedt: 'Vorschau wird erstellt …',
      pvNote: 'Die Vorschau ist eine Annäherung: Farben, Falten und die genaue Lage können im Druck leicht abweichen.',
      pvFarbe: 'Für diese Fläche zeigen wir keine Produktvorschau: Die Vorlage hat eine feste Stofffarbe und könnte die Farbe deiner Ausführung nicht richtig darstellen. Prüfe dein Motiv in der Ansicht «{druck}».',
      pvNichtDa: 'Die Produktvorschau ist für diese Ausführung gerade nicht verfügbar. Du kannst trotzdem gestalten: Die Ansicht «{druck}» zeigt dein Motiv so, wie es gedruckt wird.',
      pvStickerei: 'Für Stickerei zeigen wir keine Produktvorschau: Gestickt sieht ein Motiv anders aus als gedruckt (Fäden statt Farbe, keine Verläufe). Prüfe dein Motiv in der Ansicht «{druck}».',
      pvRundum: 'Für Rundum-Druck zeigen wir keine Produktvorschau: Das Motiv läuft über Schnittteile und Nähte. Prüfe jedes Teil in der Ansicht «{druck}».',
      pvKeine: 'Für dieses Produkt zeigen wir keine Produktvorschau. Prüfe dein Motiv in der Ansicht «{druck}».',
      sichtBearbeiten: 'Bearbeiten', sichtDruckversion: 'Druckversion', sichtVorschau: 'Vorschau', sichtLive: 'Ansicht: {a}',
      bearbeitenNote: 'Du gestaltest direkt auf dem Produktfoto. Die «Druckversion» zeigt die verbindliche Druckdatei.',
      druckNote: 'So wird die Druckdatei gedruckt: Was ausserhalb der Druckfläche liegt, kommt nicht aufs Produkt.',
      bearbeitenFoto: 'Das Produktfoto lädt gerade nicht. Du kannst in der «Druckversion» weitergestalten: Gedruckt wird die Druckdatei, nicht das Foto.',
      zoomLabel: 'Zoom', zoomMinus: 'Zoom −', zoomPlus: 'Zoom +', zoomStufen: ['Ganzes Produkt', 'Produkt', 'Druckfläche'],
      noCombo: 'Diese Kombination gibt es nicht. Bitte wähle eine andere Auswahl.',
      kontrastDunkel: '⚠\uFE0F Dein Motiv ist dunkel und der Stoff ebenfalls: Im Druck wird man es kaum sehen. Wähle hellere Motivfarben oder eine hellere Stofffarbe.',
      kontrastHell: '⚠\uFE0F Dein Motiv ist hell und der Stoff ebenfalls: Im Druck wird man es kaum sehen. Wähle dunklere Motivfarben oder eine dunklere Stofffarbe.',
      dpiMid: 'Für ein scharfes Ergebnis sind {gut} dpi ideal.',
      dpiMax: 'Bildauflösung auf dem Produkt: ca. {n} dpi. Mehr trägt die Druckdatei bei diesem Format nicht: Dein Foto ist gross genug.',
      qSperre: 'Kauf gesperrt: «{a}» hat nur ca. {n} dpi, nötig sind mindestens {min} dpi. Skaliere das Foto kleiner, nimm ein grösseres Foto oder entferne es.',
      draftBack: 'Dein Entwurf wurde wiederhergestellt.',
      draftLost: 'Fotos, die noch nicht hochgeladen waren, konnten nicht wiederhergestellt werden. Bitte füge sie noch einmal hinzu.',
      reviewHead: 'Druckvorschau prüfen', reviewIntro: 'Prüfe jede Druckfläche. Hochgeladen wird genau die hier gezeigte PNG-Datei.',
      reviewProduct: 'Produkt', reviewVariant: 'Ausführung', standardVariant: 'Standardausführung', reviewModel: 'Printful-Modell', reviewPlacements: 'Druckflächen',
      reviewPrint: 'Verbindliche Druckdatei', reviewOnProduct: 'Auf dem Produkt', reviewMugView: 'Auf dem Produkt – Vorderansicht',
      reviewMugNote: 'Kontrollierte Vorderansicht: Die Druckdatei links ist verbindlich. Teile eines Rundum-Motivs können seitlich liegen und hier nicht sichtbar sein.',
      reviewFallback: 'Produktansicht nicht verfügbar. Die gezeigte Druckdatei ist massgebend.',
      cardRequired: 'Gestalten ist derzeit nicht verfügbar. Die verbindlichen Druckdaten konnten nicht sicher geladen und geprüft werden. Bitte lade die Seite neu. Dieses Produkt kann ohne geprüfte Druckdaten nicht bestellt werden.',
      reviewAccept: 'Ich habe alle Druckflächen und die gewählte Ausführung geprüft.',
      reviewConfirm: 'Druckvorschau bestätigen und in den Warenkorb', reviewBack: 'Weiter gestalten',
      reviewBuilding: 'Druckvorschau wird erstellt …',
      reviewChanged: 'Dein Design oder die Ausführung hat sich geändert. Bitte prüfe die Druckvorschau erneut.',
    },
    en: {
      head: 'Design it yourself', ph: 'Your text …', addText: '➕ Text', addImg: '\u{1F5BC}\uFE0F Image', addSticker: '⭐ Sticker',
      stickers: 'Pick a sticker', front: 'Front', back: 'Back',
      tapHint: 'Tip: drag to move \xB7 corner = resize & rotate \xB7 tap an image → crop, flip & filter',
      uploading: 'Uploading …', upErr: 'Upload error: ', tooBig: 'File too large (max 10 MB).',
      cta: 'Review print preview', empty: 'Add text, an image or a sticker first.',
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
      varChanged: 'You changed the option. Please review the print preview again.',
      tooMany: 'Too many print areas at once. Please order your design in two parts.',
      sheetInfo: 'Print sheet {w} \xD7 {h} cm',
      sichtLabel: 'View', sichtDruck: 'Print area', sichtProdukt: 'On the product',
      pvAlt: 'Preview of your design on the product', pvLaedt: 'Creating preview …',
      pvNote: 'The preview is an approximation: colours, folds and the exact position can differ slightly in print.',
      pvFarbe: 'We do not show a product preview for this area: the template has a fixed fabric colour and could not show the colour of your option correctly. Check your design in the "{druck}" view.',
      pvNichtDa: 'The product preview is not available for this option right now. You can still design: the "{druck}" view shows your design as it will be printed.',
      pvStickerei: 'We do not show a product preview for embroidery: a stitched design looks different from a printed one (thread instead of ink, no gradients). Check your design in the "{druck}" view.',
      pvRundum: 'We do not show a product preview for all-over print: the design runs across panels and seams. Check every panel in the "{druck}" view.',
      pvKeine: 'We do not show a product preview for this product. Check your design in the "{druck}" view.',
      sichtBearbeiten: 'Edit', sichtDruckversion: 'Print file', sichtVorschau: 'Preview', sichtLive: 'View: {a}',
      bearbeitenNote: 'You are designing directly on the product photo. The "Print file" view shows the binding print file.',
      druckNote: 'This is how the print file is printed: anything outside the print area does not reach the product.',
      bearbeitenFoto: 'The product photo is not loading right now. You can keep designing in the "Print file" view: what gets printed is the print file, not the photo.',
      zoomLabel: 'Zoom', zoomMinus: 'Zoom −', zoomPlus: 'Zoom +', zoomStufen: ['Whole product', 'Product', 'Print area'],
      noCombo: 'This combination does not exist. Please pick another selection.',
      kontrastDunkel: '⚠\uFE0F Your design is dark and so is the fabric: it will hardly be visible in print. Choose lighter design colours or a lighter fabric colour.',
      kontrastHell: '⚠\uFE0F Your design is light and so is the fabric: it will hardly be visible in print. Choose darker design colours or a darker fabric colour.',
      dpiMid: 'For a sharp result {gut} dpi is ideal.',
      dpiMax: 'Image resolution on the product: about {n} dpi. The print file cannot carry more at this size: your photo is large enough.',
      qSperre: 'Purchase blocked: "{a}" has only about {n} dpi, at least {min} dpi are needed. Scale the photo down, use a larger photo or remove it.',
      draftBack: 'Your draft was restored.',
      draftLost: 'Photos that had not finished uploading could not be restored. Please add them again.',
      reviewHead: 'Review print preview', reviewIntro: 'Check every print area. The exact PNG shown here will be uploaded.',
      reviewProduct: 'Product', reviewVariant: 'Option', standardVariant: 'Standard option', reviewModel: 'Printful model', reviewPlacements: 'Print areas',
      reviewPrint: 'Binding print file', reviewOnProduct: 'On the product', reviewMugView: 'On the product – front view',
      reviewMugNote: 'Controlled front view: the print file on the left is binding. Parts of a wraparound design can sit at the sides and may not be visible here.',
      reviewFallback: 'Product preview unavailable. The shown print file is authoritative.',
      cardRequired: 'Customisation is currently unavailable because the binding print data could not be loaded and verified safely. Please reload the page. This product cannot be ordered without verified print data.',
      reviewAccept: 'I have checked every print area and the selected option.',
      reviewConfirm: 'Confirm print preview and add to cart', reviewBack: 'Keep designing',
      reviewBuilding: 'Creating print preview …',
      reviewChanged: 'Your design or option changed. Please review the print preview again.',
    },
  };
  var T = EN ? TEXTE.en : TEXTE.de;
  /** Platzhalter {a} {b} {w} … ersetzen. */
  function fmt(text, werte) {
    return String(text).replace(/\{(\w+)\}/g, function (_, k) { return werte && werte[k] != null ? werte[k] : ''; });
  }

  /** Reiner Vergleich der verbindlichen Druckpruefung. Jede Abweichung verwirft die Freigabe. */
  function reviewStandGueltig(a, b) {
    if (!a || !b) return false;
    return String(a.design) === String(b.design)
      && String(a.sv) === String(b.sv)
      && String(a.pv) === String(b.pv)
      && String(a.m) === String(b.m)
      && JSON.stringify(a.pl || []) === JSON.stringify(b.pl || []);
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
   *  'vorlage': die ganze Vorlage; 'produkt' (6.4.0, «Bearbeiten»): Druckfläche mit BEARBEITEN_RAND (35 % der längeren Seite) Umfeld, höchstens so viel, dass die Fläche in jeder Achse mindestens
   *  BEARBEITEN_MIN_ANTEIL des Fensters füllt, nie weniger als der 10-%-Rand von 'flaeche', nie ausserhalb von Vorlage und Fläche. */
  function sichtfenster(vl, ansicht) {
    var tw = vl.vorlageBreite, th = vl.vorlageHoehe;
    var ax = vl.flaecheLinks, ay = vl.flaecheOben, aw = vl.flaecheBreite, ah = vl.flaecheHoehe;
    var bx0 = Math.min(0, ax), by0 = Math.min(0, ay), bx1 = Math.max(tw, ax + aw), by1 = Math.max(th, ay + ah);
    if (ansicht === 'vorlage') return { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
    var m = Math.max(aw, ah) * 0.1;
    if (ansicht === 'produkt') {
      var kappe = Math.min(aw, ah) * (1 / BEARBEITEN_MIN_ANTEIL - 1) / 2;                  // 0,6111 mal die kürzere Seite: sichert den Mindestanteil auch bei langen Flächen
      m = Math.max(m, Math.min(Math.max(aw, ah) * BEARBEITEN_RAND, kappe));
    }
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
  /** Gewicht und Familie der Schrift der Leinwand (schriftFuerLeinwand) als CSS-Werte für die Bühne: { gewicht, familie }. Die Schrägstellung setzt knotenZeichnen schon in 6.3.1 nach derselben Regel (ebene.italic). */
  function schriftTeile(ebene, px) {
    var m = /^(italic )?(bold |900 )?(\d+)px (.*)$/.exec(schriftFuerLeinwand(ebene, px));
    if (!m) return { gewicht: '700', familie: 'Arial,sans-serif' };
    return { gewicht: m[2] ? (m[2] === 'bold ' ? '700' : '900') : '400', familie: m[4] };
  }
  var grundlinienCache = {};
  /** Senkrechter Versatz in em (nach unten positiv), um den die Textzeile der Bühne verschoben wird, damit sie dort sitzt, wo die Leinwand (Vorschau, Druckdatei) sie zeichnet. Die Leinwand legt die Grundlinie
   *  über textBaseline «middle» (ihr Abstand zur Mittellinie: -alphabeticBaseline), CSS zentriert die Schriftfläche in der Zeile (Grundlinie (Aufstieg - Abstieg) / 2 unter der Mitte). Beides hängt
   *  von den Schriftmassen der Plattform ab, darum wird gemessen (measureText bei 100 px), nicht gerechnet; fehlen die Masse (älterer Browser) oder sind sie unplausibel, bleibt es bei 0 (Stand von 6.3.1). */
  function grundlinienVersatz(f) {
    var key = f.gewicht + '|' + f.familie;
    if (grundlinienCache[key] !== undefined) return grundlinienCache[key];
    var v = 0;
    try {
      var c = document.createElement('canvas').getContext('2d'), REF = 100;
      c.font = f.gewicht + ' ' + REF + 'px ' + f.familie;
      c.textBaseline = 'middle';
      var mm = c.measureText('Hg');
      c.textBaseline = 'alphabetic';
      var ma = c.measureText('Hg');
      if (typeof mm.alphabeticBaseline === 'number' && typeof ma.fontBoundingBoxAscent === 'number' && typeof ma.fontBoundingBoxDescent === 'number') {
        v = (-mm.alphabeticBaseline - (ma.fontBoundingBoxAscent - ma.fontBoundingBoxDescent) / 2) / REF;
      }
    } catch (x) { v = 0; }
    if (!(Math.abs(v) < 0.5)) v = 0;   // unplausible Werte nie anwenden
    grundlinienCache[key] = v;
    return v;
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
  /** Stufe einer effektiven Bildauflösung `dpi` (bildDpi: höchstens die Dichte der Druckdatei): 'sperre' (unter dem Mindestwert: der Kauf bleibt gesperrt), 'mittel' (Mindestwert bis DPI_GUT: Warnung), 'gut'.
   *  `dichte` = was die Druckdatei überhaupt tragen kann (Printfile-dpi mal Verkleinerung durch die Obergrenze, bei Tasse, T-Shirt und Hülle gleich der Printfile-dpi). Die Anforderung kann nie höher sein als das,
   *  was die Datei trägt: beim A1-Poster (9933 × 7016 px, nach der Obergrenze von 16,7 Mpx nur 146,6 dpi) wäre der Mindestwert 150 dpi sonst für JEDES Foto unerreichbar und der Kauf immer gesperrt. */
  function qualitaetStufe(dpi, minDpi, dichte) {
    if (!(dpi >= 0)) return null;
    var d = dichte > 0 ? dichte : Infinity;
    if (dpi < Math.min(minDpi, d) - 1e-9) return 'sperre';
    return dpi < Math.min(DPI_GUT, d) - 1e-9 ? 'mittel' : 'gut';
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
  /** Beschriftung «Druckfläche 30,5 × 40,6 cm» in zwei Teile (Wort | Zahlen) zerlegen, damit sich bei Platzmangel zuerst das Wort kürzt (textContent bleibt der ganze Satz). */
  function tagTeilen(tag) {
    var text = tag.textContent, m = /^(\D+?)(\d[\s\S]*)$/.exec(text);
    if (!m) return;
    tag.textContent = '';
    var l = document.createElement('span'), z = document.createElement('span');
    l.className = 'lsp6-tag-l'; l.textContent = m[1]; z.className = 'lsp6-tag-z'; z.textContent = m[2];
    tag.appendChild(l); tag.appendChild(z);
  }
  /** Standardfarbe eines neuen Textes für einen Stoff (Hex): TEXT_HELL oder TEXT_DUNKEL, je nachdem, was gegen die Leuchtdichte des Stoffs das grössere Kontrastverhältnis hat (gleiche Formel wie die Vorschau);
   *  gleichstand und unbekannter Stoff (null, kein Hex): TEXT_DUNKEL wie bis 6.4.0. */
  function standardTextFarbe(stoffHex) {
    var rgb = hexZuRgb(stoffHex);
    if (!rgb) return TEXT_DUNKEL;
    var lf = leuchtdichte(rgb[0], rgb[1], rgb[2]);
    var d = hexZuRgb(TEXT_DUNKEL), h = hexZuRgb(TEXT_HELL);
    return kontrastVerhaeltnis(leuchtdichte(h[0], h[1], h[2]), lf) > kontrastVerhaeltnis(leuchtdichte(d[0], d[1], d[2]), lf) ? TEXT_HELL : TEXT_DUNKEL;
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
      // farbfest: Platzierungen, deren Vorlage ein Foto in EINER festen Stofffarbe ist, obwohl das Modell mehrere Farben hat: dort zeigt die Ansicht nur einen Hinweis (sie würde die gewählte Farbe nicht zeigen)
      var farbfest = Array.isArray(m.farbfest) ? m.farbfest.filter(function (id) { return typeof id === 'string' && id; }) : [];
      modelle[String(pid)] = { adapter: m.adapter, grund: typeof m.grund === 'string' ? m.grund : null, bilder: bilder, tasse: tasse, farbfest: farbfest };
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
      if (e.farbeAuto === true) n.farbeAuto = true;   // 6.4.1: Farbe ist der Standard und folgt der Ausführung; Entwürfe von 6.4.0 und früher kennen das Feld nicht (dann gilt die Farbe als gewählt)
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
      if (n.farbeAuto === true) e.farbeAuto = true;
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
    '.lsp6-bg,.lsp6-tpl{position:absolute;display:block;max-width:none!important;max-height:none!important;pointer-events:none;user-select:none;-webkit-user-drag:none}',   // Fund A: die Theme-Regel img{max-width:100%} quetschte das Vorlagenbild
    '.lsp6-grund{position:absolute;pointer-events:none}',
    '.lsp6-host{position:absolute;pointer-events:none}',
    '.lsp6-veil{position:absolute;background:rgba(255,255,255,.5);pointer-events:none;z-index:500}',
    '.lsp6-frame{position:absolute;border:2px dashed var(--golddk);box-shadow:0 0 0 1px rgba(255,255,255,.9);pointer-events:none;z-index:650}',
    '.lsp6-tag{position:absolute;z-index:660;display:flex;padding:2px 7px;border-radius:6px;background:rgba(22,21,26,.85);color:#fff;font-size:11px;font-weight:700;pointer-events:none;white-space:nowrap}',
    // 6.4.1: die Beschriftung der Druckfläche ragt nicht mehr über den Rahmen (ganzes Produkt, kleine Fläche): erst kürzt sich das Wort «Druckfläche», dann die Zahlen (max-width setzt buehneAufbauen)
    '.lsp6-tag-l{flex:0 100 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:pre}.lsp6-tag-z{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
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
    '.lsp6-tools{padding:10px 16px 0}.lsp6-tools .lsp6-row{margin-bottom:0}.lsp6-tools .lsp6-picker{margin:10px 0 0}',   // 6.4.1: Werkzeugzeile unter der Bühne
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
    '.lsp6-cta[aria-disabled="true"]{background:#6b6a72;cursor:not-allowed}',
    '.lsp6-cta[aria-disabled="true"]:hover{background:#6b6a72}',
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
    '.lsp6-review{padding:16px}.lsp6-review,.lsp6-review *{box-sizing:border-box}',
    '.lsp6-review-panel{width:min(920px,100%);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#16151a;border-radius:16px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.35)}',
    '.lsp6-review .lsp6-modal-t{color:#16151a;font-size:21px;text-align:left;margin:0 0 6px}',
    '.lsp6-review .lsp6-modal-s{color:#5b5a62;max-width:none;text-align:left;margin:0 0 14px}',
    '.lsp6-review-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 16px;background:#f7f4ee;border:1px solid #e3dccf;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px}',
    '.lsp6-review-summary b{font-weight:800}',
    '.lsp6-review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:14px}',
    '.lsp6-review-card{border:1px solid #ddd6ca;border-radius:12px;padding:12px;min-width:0}',
    '.lsp6-review-card h3{font-size:16px;margin:0 0 8px}',
    '.lsp6-review-meta{font-size:12px;color:#5b5a62;margin:0 0 9px}',
    '.lsp6-review-pics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '.lsp6-review-figure{margin:0;min-width:0}',
    '.lsp6-review-figure figcaption{font-size:12px;font-weight:800;margin-bottom:5px}',
    // Die Medien behalten ihr eigenes Seitenverhältnis. Eine feste Höhe liess vor allem
    // hochformatige Druckdateien auf dem Handy wie schmale Miniaturen wirken und machte
    // den Vergleich mit der quadratischen Produktansicht unnötig schwer.
    '.lsp6-review-img{display:block;width:100%;height:auto;object-fit:contain;border-radius:9px;background:#f2f0ec}',
    '.lsp6-review-pvnote{margin:6px 0 0;color:#5b5a62;font-size:11.5px;line-height:1.35}',
    '.lsp6-review-print{background-color:#fff;background-image:linear-gradient(45deg,#e6e6e6 25%,transparent 25%),linear-gradient(-45deg,#e6e6e6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e6e6 75%),linear-gradient(-45deg,transparent 75%,#e6e6e6 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}',
    '.lsp6-review-fallback{display:flex;align-items:center;min-height:120px;border-radius:9px;padding:12px;background:#fff8e6;color:#4d3a07;font-size:12.5px;font-weight:650}',
    '.lsp6-review-check{display:flex;align-items:flex-start;gap:10px;min-height:44px;margin:16px 0 10px;font-size:14px;font-weight:750}',
    '.lsp6-review-check input{width:22px;height:22px;flex:none;margin:0;accent-color:#806019}',
    '.lsp6-review-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}',
    '.lsp6-review-actions button{min-height:44px;padding:11px 18px;border-radius:999px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer}',
    '.lsp6-review-actions .go{margin:0;background:#806019;color:#fff;border:1px solid #806019}',
    '.lsp6-review-actions .go:disabled{opacity:.45;cursor:not-allowed}',
    '.lsp6-review-actions .back{background:#fff;color:#16151a;border:1px solid #aaa49a}',
    '.lsp6 :focus-visible,.lsp6-modal :focus-visible{outline:3px solid #1e4fd6;outline-offset:2px}',
    '.lsp6-sicht{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;background:var(--paper);border-bottom:1px solid #ece7df}',
    '.lsp6-sbtn{flex:1 1 92px;min-width:0;min-height:44px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:13px;line-height:1.2;cursor:pointer}',
    '.lsp6-sbtn[aria-pressed=true],.lsp6-sbtn[aria-selected=true]{background:var(--ink);border-color:var(--ink);color:#fff}',
    '.lsp6-sicht[data-anzahl="3"] .lsp6-sbtn{padding:8px 6px;font-size:12.5px}',
    '.lsp6-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;padding:0}',
    // «Bearbeiten» auf dem Produkt: Reihenfolge der Schichten (Grund, Ebenen, Vorlagenbild, Rahmen, Griffe). Der Host ist ein eigener Stapelkontext und beschneidet die Ebenen auf die Druckfläche;
    // die Griffe liegen in einer eigenen Schicht (.lsp6-chrome) über dem Vorlagenbild, damit sie nie beschnitten oder überdeckt werden.
    '.lsp6-stage[data-ansicht="bearbeiten"] .lsp6-host{overflow:hidden;z-index:2}',
    '.lsp6-stage[data-ansicht="bearbeiten"] .lsp6-tpl[data-schicht="oben"]{z-index:3}',
    '.lsp6-stage[data-ansicht="bearbeiten"] .lsp6-tpl[data-schicht="unten"]{z-index:1}',
    '.lsp6-stage[data-ansicht="bearbeiten"] .lsp6-frame{border:1px dashed var(--golddk);box-shadow:0 0 0 1px rgba(255,255,255,.85),0 0 0 2px rgba(22,21,26,.22)}',
    '.lsp6-stage[data-ansicht="bearbeiten"] .lsp6-layer::after{content:"";position:absolute;inset:-10px}',
    '.lsp6-chrome-host{position:absolute;pointer-events:none;z-index:700}',
    '.lsp6-chrome{position:absolute;left:0;top:0;transform-origin:center center;pointer-events:none}',
    '.lsp6-chrome .lsp6-handle,.lsp6-chrome .lsp6-del{pointer-events:auto}',
    '.lsp6-zoom{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:6px 12px 0;font-size:12px;color:var(--mute)}',
    '.lsp6-zoom button{min-width:44px;min-height:44px;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font-family:inherit;font-weight:700;font-size:13px;line-height:1.2;cursor:pointer}',
    '.lsp6-zoom button[aria-disabled="true"]{opacity:.45;cursor:default}',
    '.lsp6-zoom .lsp6-zoomstufe{min-width:96px;text-align:center;font-weight:700;color:var(--ink)}',
    '.lsp6-pvwrap{background:#efece6;padding:8px 0 0}',
    '.lsp6-pv{display:block;width:100%;max-width:78vh;aspect-ratio:1/1;margin:0 auto;background:#fff}',
    '.lsp6-pvnote,.lsp6-pvlaed{margin:0;padding:6px 14px 8px;font-size:12px;color:var(--mute);text-align:center}',
    '.lsp6-pvinfo{margin:0;padding:18px 16px;font-size:13.5px;font-weight:600;color:#4d3a07;background:#fff8e6;border-top:1px solid #e7d9b4;border-bottom:1px solid #e7d9b4}',
    '.lsp6-ok.lsp6-mid{background:#fff8e6;border-color:#e7d9b4;color:#4d3a07}',
    '@media (prefers-reduced-motion:reduce){.lsp6 *,.lsp6 *::before,.lsp6 *::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}',
    '@media (max-width:600px){.lsp6-btn,.lsp6-tab{min-height:44px}.lsp6-grid{grid-template-columns:repeat(2,1fr)}.lsp6-review{padding:8px;justify-content:flex-start}.lsp6-review-panel{max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px);padding:14px}.lsp6-review-summary,.lsp6-review-grid,.lsp6-review-pics{grid-template-columns:1fr}.lsp6-review-pics{gap:14px}.lsp6-review-card{padding:10px}.lsp6-review-actions{flex-direction:column-reverse}.lsp6-review-actions button{width:100%}}',
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
    var attrVZeit = container.getAttribute('data-vorschau-zeit');
    var vorschauZeit = attrVZeit && Number(attrVZeit) > 0 ? Number(attrVZeit) : VORSCHAU_ZEIT_MS;   // Zeitlimit eines Vorlagenbildes in der sichtbaren Ansicht
    var kaufFrist = Math.min(VORSCHAU_KAUF_MS, vorschauZeit);                                        // Frist der Vorschau beim Kauf (nie länger als das Bildlimit)
    var standardVariante = legacy ? wurzel.standardVariante : (container.getAttribute('data-variant') || '');
    // Neu in 6.4.0: data-bearbeiten am Container. fehlt oder 1 = «Bearbeiten» ist die Startansicht ('start'); angebot = angeboten, Start in «Druckversion»; 0 oder aus = Verhalten wie 6.3.1 ('aus', auch im v5-Modus).
    var bearbeitenModus = (function () {
      if (legacy) return 'aus';
      var a = container.getAttribute('data-bearbeiten');
      a = a === null ? '' : String(a).trim().toLowerCase();
      // «aus» heisst auch off, false, nein, no (ein Rollout, der «false» oder «off» schreibt, soll die Ansicht nicht still einschalten); alles Unbekannte (und kein Attribut) ist die Startansicht
      return /^(0|aus|off|false|nein|no)$/.test(a) ? 'aus' : a === 'angebot' ? 'angebot' : 'start';
    })();
    var tabArt = bearbeitenModus !== 'aus';   // Reiterleiste «Bearbeiten | Druckversion | Vorschau» (role=tablist) statt der zwei Schalter von 6.3.1
    var ZOOM_STUFEN = ['vorlage', 'produkt', 'flaeche'];   // «Bearbeiten» auf dem Produkt: Ganzes Produkt, Produkt (Vorgabe), Druckfläche
    // sicht = wirksame Ansicht ('bearbeiten' | 'druck' | 'produkt'); sichtWunsch = was der Kunde gewählt hat (null = noch nichts); zoom gilt nur für «Bearbeiten» auf dem Produkt; beruehrt = der Kunde hat etwas geändert
    var st = { aktiv: karte.platzierungen[0].id, ebenen: {}, sel: null, ansicht: 'flaeche', zoom: 'produkt', sicht: tabArt ? 'bearbeiten' : 'druck', sichtWunsch: null, beruehrt: false, shopVariante: null, pfVariante: null };
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
    var vorschauSendeNr = 0;               // Nummer des letzten Sendeversuchs der Vorschau: nach Fristablauf oder Fehler darf ein später eintreffender Upload nichts mehr eintragen
    var review = null;                     // verbindlicher Stand samt bereits erzeugten PNG-Blobs
    var reviewModal = null;
    var reviewBaut = false;
    var reviewNr = 0;                      // entwertet spaet eintreffende asynchrone Vorschauen
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
      sichtAbgleichen();   // Platzierungs- und Variantenwechsel laufen alle durch diese Funktion: die wirksame Ansicht folgt dem, was für die Platzierung möglich ist
      var pb = produktBuehne();   // «Bearbeiten» auf dem Produkt (Produktfoto, Schichten, Zoom) oder die Bühne von 6.3.1
      ui.fensterGebaut = fensterSchluessel();
      var w = sichtfenster(vl, pb ? st.zoom : st.ansicht);
      ui.stage.style.setProperty('--asp', String(w.w / w.h));
      ui.stage.setAttribute('data-ansicht', pb ? 'bearbeiten' : 'druck');
      // Gewählte Variantenfarbe statt der Beispielfarbe der Vorlage (nur wo die Vorlage eine Farbfläche/Textur trägt; das Schattenbild liegt darüber)
      var eigeneFarbe = st.pfVariante != null && karte.farbeVon[st.pfVariante] && (vl.hintergrundUrl || vl.hintergrundFarbe) ? karte.farbeVon[st.pfVariante] : null;
      var lage = 'left:' + PCT((0 - w.x) / w.w) + ';top:' + PCT((0 - w.y) / w.h) + ';width:' + PCT(vl.vorlageBreite / w.w) + ';height:' + PCT(vl.vorlageHoehe / w.h);
      ui.bg.style.cssText = lage;
      ui.tpl.style.cssText = lage;
      if (pb) {
        // Grund wie die Vorschau (zeichneFlach): Weiss, darauf die Stofffarbe oder Textur NUR im Rechteck der Vorlage; das Vorlagenbild liegt über den Ebenen (vorderansicht false: darunter)
        var textur = !eigeneFarbe && vl.hintergrundUrl && bildAdresse(vorschauModell(), vl.hintergrundUrl) !== null ? vl.hintergrundUrl : null;
        var ersatz = eigeneFarbe || vl.hintergrundFarbe || '#ffffff';
        ui.stage.style.background = '#ffffff';
        ui.grund.style.cssText = lage;
        ui.grund.style.background = textur ? '#ffffff' : ersatz;   // als Eigenschaft: ein ungültiger Wert aus den Kartendaten wird verworfen, kein fremdes CSS
        ui.grund.setAttribute('data-ersatz', ersatz);
        ui.grund.hidden = false;
        bildSetzen(ui.bg, textur);
        ui.tpl.setAttribute('data-schicht', vl.vorderansicht === false ? 'unten' : 'oben');
      } else {
        ui.stage.style.background = eigeneFarbe || vl.hintergrundFarbe || '#f4f1ec';
        ui.grund.hidden = true;
        bildSetzen(ui.bg, eigeneFarbe ? null : (vl.hintergrundUrl || null));
        ui.tpl.removeAttribute('data-schicht');
      }
      // Mit den Reitern (data-bearbeiten ≠ 0) lädt die Bühne dasselbe Produktfoto wie die Vorschau: den Spiegel auf Shopify Files, wo die Vorschaudaten das Bild kennen, sonst die Printful-Adresse.
      // So gibt es nur EINEN Download, und ein Ausfall von files.cdn.printful.com (Filter, Werbeblocker) nimmt der Bühne das Foto nicht, solange der Spiegel erreichbar ist.
      bildSetzen(ui.tpl, (tabArt && bildAdresse(vorschauModell(), vl.bildUrl)) || vl.bildUrl || null);
      var fl = (vl.flaecheLinks - w.x) / w.w, fo = (vl.flaecheOben - w.y) / w.h, fb = vl.flaecheBreite / w.w, fh = vl.flaecheHoehe / w.h;
      var box = 'left:' + PCT(fl) + ';top:' + PCT(fo) + ';width:' + PCT(fb) + ';height:' + PCT(fh);
      ui.host.style.cssText = box;
      ui.frame.style.cssText = box;
      ui.chromeHost.style.cssText = box;
      ui.frame.hidden = false;
      // Vorhang um die Druckfläche: oben, unten, links, rechts (nur in der Bühne von 6.3.1; «Bearbeiten» auf dem Produkt beschneidet die Ebenen stattdessen)
      var v = ui.veil;
      v[0].style.cssText = 'left:0;top:0;width:100%;height:' + PCT(Math.max(0, fo));
      v[1].style.cssText = 'left:0;top:' + PCT(Math.min(1, fo + fh)) + ';width:100%;height:' + PCT(Math.max(0, 1 - fo - fh));
      v[2].style.cssText = 'left:0;top:' + PCT(Math.max(0, fo)) + ';width:' + PCT(Math.max(0, fl)) + ';height:' + PCT(Math.min(1, fo + fh) - Math.max(0, fo));
      v[3].style.cssText = 'left:' + PCT(Math.min(1, fl + fb)) + ';top:' + PCT(Math.max(0, fo)) + ';width:' + PCT(Math.max(0, 1 - fl - fb)) + ';height:' + PCT(Math.min(1, fo + fh) - Math.max(0, fo));
      v.forEach(function (x) { x.hidden = pb; });
      if (geoAktiv.masse) {
        ui.tag.textContent = fmt(karte.klasse === 'PANEL' ? T.sheetInfo : T.areaInfo, { w: zahlAnzeige(geoAktiv.masse.breite, 1), h: zahlAnzeige(geoAktiv.masse.hoehe, 1) });
        tagTeilen(ui.tag);
        ui.tag.style.left = 'calc(' + PCT(Math.max(0, fl)) + ' + 4px)';
        ui.tag.style.top = 'calc(' + PCT(Math.max(0, fo)) + ' + 4px)';
        ui.tag.style.maxWidth = 'calc(' + PCT(Math.max(0, Math.min(1, fl + fb) - Math.max(0, fl))) + ' - 8px)';   // höchstens die sichtbare Breite des Rahmens, 4 px Luft links und rechts
        ui.tag.hidden = false;
      } else ui.tag.hidden = true;
      chromeAbgleichen();
      zoomAktualisieren();
      vorschauPlanen();
      kontrastBuehnePlanen();
      if (pb) tplFehlerPruefen();
    }
    /** Hat das Produktfoto der Bühne nicht geladen, während «Bearbeiten» es zeigen soll? Dann zurück auf «Druckversion» (ohne Rekursion: dort ist produktBuehne() falsch). */
    function tplFehlerPruefen() {
      if (!ui.tplFehlerUrl || ui.tplFehlerUrl !== ui.tpl.getAttribute('src') || !produktBuehne()) return;
      sichtSetzen('druck');
      ui.sichtHinweis.textContent = T.bearbeitenFoto; ui.sichtBox.hidden = false;
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
      ui.viewBtn.textContent = st.ansicht === 'flaeche' ? T.viewWhole : T.viewArea;
      zoomAktualisieren();   // der Zoom gehört zur Bühne, nicht zur Produktansicht
    }
    /** Zoom der Bühne: in «Bearbeiten» auf dem Produkt drei Stufen (Knöpfe), sonst der Link von 6.3.1 («Ganze Vorlage zeigen» / «Auf Druckfläche zoomen»). */
    function zoomAktualisieren() {
      var pb = !legacy && produktBuehne();
      ui.viewBtn.hidden = legacy || st.sicht === 'produkt' || pb;
      ui.zoomBox.hidden = !pb;
      var i = ZOOM_STUFEN.indexOf(st.zoom);
      ui.zoomStufe.textContent = T.zoomStufen[i];
      [[ui.zoomMinus, i <= 0], [ui.zoomPlus, i >= ZOOM_STUFEN.length - 1]].forEach(function (z) {
        if (z[1]) z[0].setAttribute('aria-disabled', 'true'); else z[0].removeAttribute('aria-disabled');
      });
    }
    function zoomSetzen(stufe) {
      var i = typeof stufe === 'number' ? stufe : ZOOM_STUFEN.indexOf(stufe);
      if (typeof stufe !== 'number' && i < 0) return;   // unbekannter Name
      i = Math.max(0, Math.min(ZOOM_STUFEN.length - 1, i));
      if (ZOOM_STUFEN[i] === st.zoom || !produktBuehne()) return;
      st.zoom = ZOOM_STUFEN[i];
      buehneAufbauen(); metaAktualisieren(); alleZeichnen();
      ui.zoomLive.textContent = T.zoomLabel + ': ' + T.zoomStufen[i];
    }
    /** Welches Fenster zeigt die Bühne gerade? (Schlüssel, damit sie nur bei Bedarf neu aufgebaut wird.) */
    function fensterSchluessel() { return produktBuehne() ? 'p:' + st.zoom : 'f:' + st.ansicht; }
    function bereichGroesse() {
      var r = ui.host.getBoundingClientRect();
      return { w: r.width || 1, h: r.height || 1, r: r };
    }

    // ── Ebenen auf der Bühne ────────────────────────────────────────────────────────────────────
    function knotenBauen(e) {
      var root = el('div', { class: 'lsp6-layer', 'data-lid': e.id });
      var content;
      if (e.type === 'text') content = el('div', { style: 'white-space:pre;font-weight:800;line-height:1.05;text-align:center;pointer-events:none' });
      else {
        content = el('img', { alt: '', style: 'display:block;pointer-events:none;-webkit-user-drag:none' }); content.src = e.src;
        content.addEventListener('load', function () { if (st.sel === e.id) chromeNachziehen(); });   // die Höhe eines Bildes steht erst nach dem Laden fest
      }
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
        if (tabArt) {
          // Seit 6.4.0 zeichnet die Bühne den Text wie die Leinwand von Vorschau und Druckdatei: dieselbe Familie, dasselbe Gewicht (die Leinwand nimmt «bold» bzw. 900 und für die Handschrift 400, die Bühne
          // von 6.3.1 immer 800: bis 9 % breiter und mehr Tinte, GEMESSEN; die Schrägstellung ist seit 6.3.1 dieselbe Regel) und derselbe Schlagschatten für weisse Schrift (ohne Versatz, Unschärfe 0,12 · Schrifthöhe, wie ctx.shadowBlur).
          var f = schriftTeile(e, px);
          s.fontFamily = f.familie; s.fontWeight = f.gewicht;
          s.textShadow = WEISS_SCHATTEN && e.color.toLowerCase() === '#ffffff' ? '0 0 ' + px * 0.12 + 'px rgba(0,0,0,.4)' : 'none';
          // Senkrechte Lage: die Leinwand setzt die Grundlinie über textBaseline «middle», die Zeile der Bühne zentriert die Schriftfläche; beide liegen je nach Schrift verschieden (GEMESSEN bis 0,07 em).
          // Die Bühne folgt der Leinwand der Plattform: Versatz = Abstand der Grundlinie zur «middle»-Linie der Leinwand minus ihr Abstand zur Mitte der Zeile (gemessen mit measureText, in em).
          s.position = 'relative'; s.top = grundlinienVersatz(f) * px + 'px';
        }
      } else {
        s.width = bildBreitePx(e, a.w) + 'px';
        s.height = 'auto';
        s.opacity = String(deckkraft(e));
      }
      k.root.style.transform = 'translate(' + (e.cx * a.w) + 'px,' + (e.cy * a.h) + 'px) translate(-50%,-50%) rotate(' + e.rot + 'deg)';
      if (st.sel === e.id) chromeNachziehen();
      vorschauPlanen();
    }
    // ── Griffe über dem Vorlagenbild (nur «Bearbeiten» auf dem Produkt) ─────────────────────────────
    // Das Motiv liegt im Host (beschnitten auf die Druckfläche, UNTER dem Vorlagenbild). Rahmen, Skalieren-Griff und Löschknopf der gewählten Ebene ziehen dafür in die Schicht
    // ui.chromeRoot, die über dem Vorlagenbild liegt, dieselbe Grösse und dieselbe Transformation hat und nie beschnitten wird. In der Bühne von 6.3.1 bleiben sie in der Ebene.
    var chromeBeob = null;
    var CHROME_MIN = 64;   // kleinste Seite der Schicht für Griffe in Pixeln (siehe chromeNachziehen)
    var GRIFF_UEBERSTAND = 6;   // Mitte des Griffs liegt so viele Pixel ausserhalb der Ecke der Schicht (CSS: right/bottom -21 px bei 30 px Durchmesser)
    var GRIFF_RAND = 17;        // so nah (Mitte des Griffs) darf er an die Kante der Bühne: Radius 15 px plus 2 px Luft
    function chromeNachziehen() {
      if (ui.chromeRoot.hidden) return;
      var k = st.sel && knoten[st.sel];
      if (!k) return;
      // Die Schicht ist mindestens CHROME_MIN × CHROME_MIN gross, damit Griff und Löschknopf bei kleinen Motiven nicht auf dem Motiv liegen: ihre Trefferflächen (44 px) und das Hinweisen eines Fingers
      // (Chromium findet bei Berührung auch Ziele im Umkreis, GEMESSEN an einem 31 × 13 px grossen Text: der Löschknopf gewann) lassen sonst keinen Platz, das Motiv selbst zu greifen.
      // Der gestrichelte Rahmen bleibt eng um das Motiv.
      var c = ui.chromeRoot.style, lw = k.root.offsetWidth, lh = k.root.offsetHeight;
      var bw = Math.max(CHROME_MIN, lw), bh = Math.max(CHROME_MIN, lh), t = k.root.style.transform;
      if (c.width !== bw + 'px') c.width = bw + 'px';
      if (c.height !== bh + 'px') c.height = bh + 'px';
      if (c.transform !== t) c.transform = t;
      k.frame.style.cssText = 'inset:auto;left:' + ((bw - lw) / 2 - 8) + 'px;top:' + ((bh - lh) / 2 - 8) + 'px;width:' + (lw + 16) + 'px;height:' + (lh + 16) + 'px';
      griffeInnen(k, bw, bh);
    }
    /** Skalieren-Griff (unten rechts) und Löschknopf (oben links) sitzen an den Ecken der Schicht. Liegt eine Ecke ausserhalb der Bühne (Motiv am Rand der Druckfläche, die Bühne beschneidet alles
     *  ausserhalb), rutscht der Knopf entlang der Bühnenkante nach innen: die Griffe sind nie beschnitten und bleiben antippbar. Die Bedienung hängt nicht von der Lage des Griffs ab (er misst
     *  Abstand und Winkel des Zeigers zur Mitte der Ebene). Gerechnet statt gemessen: Mitte der Ebene, Drehung und Ecke der Schicht ergeben die Lage auf dem Bildschirm; die Verschiebung wird
     *  zurück ins Koordinatensystem der gedrehten Schicht gerechnet und als transform auf den Knopf gelegt. */
    function griffeInnen(k, bw, bh) {
      var e = gewaehlt();
      if (!e) return;
      var s = ui.stage.getBoundingClientRect(), r = k.root.getBoundingClientRect();
      var w = (e.rot || 0) * Math.PI / 180, co = Math.cos(w), si = Math.sin(w);
      var mx = r.left + r.width / 2, my = r.top + r.height / 2;
      [[k.handle, 1], [k.del, -1]].forEach(function (g) {
        var lx = g[1] * (bw / 2 + GRIFF_UEBERSTAND), ly = g[1] * (bh / 2 + GRIFF_UEBERSTAND);
        var px = mx + lx * co - ly * si, py = my + lx * si + ly * co;
        var dx = Math.min(Math.max(px, s.left + GRIFF_RAND), s.right - GRIFF_RAND) - px, dy = Math.min(Math.max(py, s.top + GRIFF_RAND), s.bottom - GRIFF_RAND) - py;
        var t = Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 ? '' : 'translate(' + (dx * co + dy * si) + 'px,' + (dy * co - dx * si) + 'px)';
        if (g[0].style.transform !== t) g[0].style.transform = t;
      });
    }
    function chromeAbgleichen() {
      var ueber = !legacy && ui.stage.getAttribute('data-ansicht') === 'bearbeiten';
      var ziel = ueber ? ui.chromeHost : ui.host;
      if (ui.guideV.parentNode !== ziel) { ziel.appendChild(ui.guideV); ziel.appendChild(ui.guideH); }   // die Hilfslinien liegen über dem Foto
      var gewaehlt = ueber && st.sel ? knoten[st.sel] || null : null;
      Object.keys(knoten).forEach(function (lid) {
        var k = knoten[lid], ref = k === gewaehlt ? ui.chromeRoot : k.root;
        [k.frame, k.handle, k.del].forEach(function (n) { if (n.parentNode !== ref) ref.appendChild(n); });
        if (k !== gewaehlt && k.frame.getAttribute('style')) k.frame.removeAttribute('style');   // zurück in der Ebene gilt der Rahmen von 6.3.1 (inset:-8px)
        if (k !== gewaehlt) { k.handle.style.transform = ''; k.del.style.transform = ''; }   // und die Verschiebung nach innen (griffeInnen) gilt nur in der Schicht
      });
      Array.prototype.slice.call(ui.chromeRoot.children).forEach(function (n) {   // Reste einer entfernten Ebene
        if (!gewaehlt || (n !== gewaehlt.frame && n !== gewaehlt.handle && n !== gewaehlt.del)) ui.chromeRoot.removeChild(n);
      });
      ui.chromeRoot.hidden = !gewaehlt;
      if (chromeBeob) { chromeBeob.disconnect(); if (gewaehlt) chromeBeob.observe(gewaehlt.root); }
      chromeNachziehen();
    }
    function alleZeichnen() { ebenenAktiv().forEach(knotenZeichnen); }
    function knotenLoeschen() {
      Object.keys(knoten).forEach(function (id) { knoten[id].root.remove(); });
      knoten = {};
      chromeAbgleichen();
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
      chromeAbgleichen();
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
      reviewAenderung();
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
      // 6.4.1: Schieber «Grösse» und «Drehen» (und die Gradanzeige) folgen den Zahlenfeldern; bis 6.4.0 blieben sie nach einer Eingabe in cm, mm, % oder Grad auf dem alten Wert stehen
      ui.rangeGroesse.value = e.scale;
      ui.rangeDrehen.value = Math.round(e.rot) || 0;
      ui.drehenWert.textContent = (Math.round(e.rot) || 0) + '\xB0';
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
      var dichte = g.printfile.dpi * g.render.k;
      var stufe = qualitaetStufe(d, karte.minDpi, dichte);
      var tief = stufe === 'sperre';
      var n = zahlAnzeige(dpiGanz(d, stufe), 0);
      // Zwischen dem Mindestwert und 150 dpi: gleiche Zeile wie bisher (Klasse lsp6-ok bleibt), dazu die Warnung «mittel» in Bernsteinfarbe; darunter sperrt das Qualitätstor den Kauf.
      // Trägt die Druckdatei weniger als der Mindestwert (A1-Poster nach der Obergrenze) und das Foto reicht dafür aus, sagt die Zeile, dass mehr nicht geht (statt «unter 150»).
      var grenze = dichte < karte.minDpi;
      box.className = tief ? 'lsp6-warn' : (stufe === 'mittel' ? 'lsp6-ok lsp6-mid' : 'lsp6-ok');
      box.textContent = tief ? fmt(T.dpiLow, { n: n, min: zahlAnzeige(karte.minDpi, 0) })
        : grenze ? fmt(T.dpiMax, { n: n })
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
          if (qualitaetStufe(d, karte.minDpi, g.printfile.dpi * g.render.k) === 'sperre') lage.sperren.push({ p: p, e: e, dpi: d });
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
      if (ids.length < 2) { ui.tabs.hidden = true; modellHinweisAktualisieren(); return; }   // Fund B: sonst blieb der Hinweis «noch nicht eingerichtet» nach gültiger Wahl stehen
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
      else if (!ausfuehrungOk()) text = !legacy && st.shopVariante == null ? T.noCombo : T.noMap;   // Fund C: keine Ausführung gewählt = die Kombination gibt es im Angebot nicht
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
      reviewAenderung();
      var t = liste[i]; liste[i] = liste[j]; liste[j] = t;
      zOrdnen(); ebenenLeisteNeu(); formularSynchronisieren(); speichern();
    }
    function ganzNachVorneHinten(vorne) {
      var liste = ebenenAktiv();
      var i = -1;
      for (var n = 0; n < liste.length; n++) if (liste[n].id === st.sel) { i = n; break; }
      if (i < 0) return;
      reviewAenderung();
      var e = liste.splice(i, 1)[0];
      if (vorne) liste.push(e); else liste.unshift(e);
      zOrdnen(); speichern(); ebenenLeisteNeu(); formularSynchronisieren();
    }
    function ebeneHinzufuegen(e) {
      if (!platzierungIn(karte, st.aktiv)) {   // fremde Platzierung (gibt es bei dieser Ausführung nicht): dort kann man nur entfernen, nichts hinzufügen
        meldung(fmt(T.orphan, { a: titelVon(platzierung(st.aktiv)) }), 'err');
        return;
      }
      reviewAenderung();
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
      for (var i = 0; i < liste.length; i++) if (liste[i].id === id) { reviewAenderung(); liste.splice(i, 1); break; }
      if (knoten[id]) { knoten[id].root.remove(); delete knoten[id]; }
      var umgeschaltet = false;
      if (st.sel === id) st.sel = null;
      if (aktivGueltigHalten()) { umgeschaltet = true; knotenLoeschen(); buehneAufbauen(); metaAktualisieren(); knotenNeuAufbauen(); }
      if (umgeschaltet || st.sel === null) abwaehlen(); else felderAktualisieren();
      tabsAktualisieren(); aufpreisSummeAktualisieren(); speichern();
    }
    function neuerText() {
      // Eine Tasse zeigt von der Rundum-Druckfläche nur die Vorderseite. Neue Texte
      // starten deshalb kleiner und bleiben mit Rand vollständig sichtbar. Bereits
      // gespeicherte Ebenen behalten ihre individuelle Grösse unverändert.
      var modell = vorschauModell();
      var istTasse = String(karte.typ || '').toUpperCase() === 'MUG' || (modell && modell.adapter === 'tasse');
      var startSkala = istTasse ? 0.35 : 0.55;
      // 6.4.1: Standardfarbe nach dem Stoff der gewählten Ausführung (weiss auf dunklem Stoff); farbeAuto = der Kunde hat die Farbe nicht gewählt, sie folgt dem Wechsel der Ausführung (autoFarbenAnwenden)
      return { id: neueId(), type: 'text', text: '', font: SCHRIFTEN[0].css, color: standardTextFarbe(stoffHexFuer(pAktiv())), farbeAuto: true, cx: 0.5, cy: 0.42, scale: startSkala, rot: 0 };
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
      if (faktor < 1) { reviewAenderung(); e.scale = Math.max(0.06, e.scale * faktor); knotenZeichnen(e); if (st.sel === e.id) felderAktualisieren(); speichern(); }
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
    function verwendetePlatzierungen() {
      return karte.platzierungen.filter(function (p) { return st.ebenen[p.id] && st.ebenen[p.id].length > 0; });
    }
    /** Vollstaendiger, vergleichbarer Stand der verbindlichen Druckpruefung. */
    function aktuellerReviewStand() {
      var sv = aktuelleShopVariante();
      var z = zuordnungFuer(sv);
      var pv = pfVarianteFuer(sv);
      return {
        design: JSON.stringify(kopieAllerEbenen()),
        sv: String(sv == null ? '' : sv),
        pv: pv == null ? null : pv,
        m: z && z.m != null ? z.m : karte.printfulProductId,
        pl: verwendetePlatzierungen().map(function (p) { return p.id; }),
      };
    }
    function produktName() {
      var n = container.getAttribute('data-product-title');
      if (!n) {
        var h = document.querySelector('h1.product__title, h1.product-title, main h1, h1');
        n = h && h.textContent;
      }
      return String(n || document.title || '').replace(/\s+/g, ' ').trim() || 'LuxeStyle';
    }
    function ausfuehrungName() {
      var form = warenkorbFormular();
      var c = form && (form.querySelector('[name="id"]:checked') || form.querySelector('[name="id"]'));
      var n = '';
      if (c && c.tagName === 'SELECT' && c.selectedOptions && c.selectedOptions[0]) n = c.selectedOptions[0].textContent;
      if (!n && c && c.id) { var lab = document.querySelector('label[for="' + c.id + '"]'); n = lab && lab.textContent; }
      if (!n && c && c.closest) { var l = c.closest('label'); n = l && l.textContent; }
      if (!n || /^\s*\d+\s*$/.test(n)) {
        var teile = [];
        Array.prototype.forEach.call(document.querySelectorAll('select[name^="options"],select[name^="option"]'), function (sel) {
          var o = sel.selectedOptions && sel.selectedOptions[0]; var t = o && o.textContent;
          if (t && teile.indexOf(t.trim()) < 0) teile.push(t.trim());
        });
        Array.prototype.forEach.call(document.querySelectorAll('input[type="radio"]:checked:not([name="id"])'), function (radio) {
          var lab = radio.id && document.querySelector('label[for="' + radio.id + '"]'); var t = (lab && lab.textContent) || radio.value;
          if (t && teile.indexOf(t.trim()) < 0) teile.push(t.trim());
        });
        if (teile.length) n = teile.join(' / ');
      }
      n = String(n || '').replace(/\s+/g, ' ').trim();
      var variantenId = String((c && c.value) || st.shopVariante || '').trim();
      if (!n || /^default title$/i.test(n) || (variantenId && n === variantenId)) return T.standardVariant;
      return n;
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
      reviewAenderung();
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
      autoFarbenAnwenden();   // 6.4.1: ein älterer Stand kann aus einer anderen Ausführung stammen
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
      o.ap = Math.round(ap * 100) / 100;
      var text = JSON.stringify(o);
      // qd: kleinste effektive Auflösung aller Fotos in dpi (abgerundet); fehlt, wenn kein Foto mit bekannter Grösse dabei ist. Reine Angabe für die Bestellstrecke (die Sperre unter dem Mindestwert
      // steht im Editor): sie darf einen Kauf nie wegen der 255 Zeichen verhindern, darum entfällt sie, wenn sie den Wert über die Grenze brächte (nur bei 4 bis 5 Platzierungen gleichzeitig, GEMESSEN am Katalog).
      var lage = qualitaetLage();
      if (lage.min !== null) {
        o.qd = Math.floor(lage.min + 1e-9);
        var mit = JSON.stringify(o);
        if (mit.length <= POD_KARTE_MAX || text.length > POD_KARTE_MAX) text = mit;
      }
      return text;
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
      vorschauPlanen(); entwurfPlanen(); kontrastBuehnePlanen();   // jede Änderung am Entwurf: Produktansicht neu zeichnen, Entwurf (verzögert) sichern, Kontrast-Hinweis (6.4.1) auffrischen
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
      reviewAenderung();
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
            if (WEISS_SCHATTEN && e.color.toLowerCase() === '#ffffff') { ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = px * 0.12; }
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

    /** Die verbindliche PNG-Druckdatei VOR der Kundenpruefung bauen. Eine lokale Groessenanpassung geschieht hier und damit sichtbar vor der Freigabe. */
    function druckdateiVorbereiten(p, pv) {
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
          var gr = letzteGroesse[p.id];
          return { p: p, blob: blob, skala: skala, groesse: gr ? { w: gr.w, h: gr.h } : null, produktBlob: null };
        });
      }
      return einmal().then(function (datei) {
        if (skala < 1 && datei.groesse) verkleinertText = fmt(T.shrunk, { w: datei.groesse.w, h: datei.groesse.h });
        return datei;
      });
    }

    /** Exakt den bereits geprueften Blob hochladen. Nach der Freigabe gibt es bewusst keinen neuen Render- oder Verkleinerungsversuch. */
    function druckdateiBlobSenden(datei) {
      if (!datei || !dateiPng(datei.blob)) return Promise.reject(new Error(T.printErr));
      if (datei.groesse) letzteGroesse[datei.p.id] = { w: datei.groesse.w, h: datei.groesse.h };
      return new Promise(function (ok, schlecht) {
        hochladen(datei.blob, true, function (err, url) {
          if (err && err.gross) { schlecht(new Error(T.tooHeavy)); return; }
          if (err || !url) { schlecht(err || new Error(T.printErr)); return; }
          ok(url);
        }, uploadZeit);
      });
    }

    function druckdateiSenden(p, pv) {
      return druckdateiVorbereiten(p, pv).then(function (datei) { return druckdateiBlobSenden(datei); });
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
    /** Stofffarbe (Hex) der Platzierung p in der gewählten Ausführung: dieselbe Quelle wie die Vorschau und der Grund der Bühne (stoffFarbe); Tasse und Poster sind wie in der Vorschau weiss.
     *  null, wo der Stoff unbekannt ist (dann bleibt die Standardfarbe dunkel, wie bis 6.4.0). */
    function stoffHexFuer(p) {
      if (legacy || !p || !platzierungIn(karte, p.id)) return null;
      var m = vorschauModell();
      if (m && (m.adapter === 'tasse' || m.adapter === 'papier')) return '#ffffff';
      var vl = geo(p).vorlage;
      return vl ? stoffFarbe(vl).hex : null;
    }
    /** Textebenen, deren Farbe der unveränderte Standard ist (farbeAuto), auf die Standardfarbe für den Stoff der gewählten Ausführung setzen: nach einem Wechsel der Ausführung, nach Rückgängig und beim
     *  Laden eines Entwurfs. Eine vom Kunden gewählte Farbe (farbeAuto fehlt) wird nie angefasst. Nur Zustand, zeichnet nichts. true, wenn sich eine Farbe geändert hat. */
    function autoFarbenAnwenden() {
      if (legacy) return false;
      var geaendertes = false;
      Object.keys(st.ebenen).forEach(function (id) {
        var p = platzierungIn(karte, id);
        if (!p) return;
        var neu = null;
        st.ebenen[id].forEach(function (e) {
          if (e.type !== 'text' || !e.farbeAuto) return;
          if (neu === null) neu = standardTextFarbe(stoffHexFuer(p));
          if (e.color !== neu) { e.color = neu; geaendertes = true; }
        });
      });
      return geaendertes;
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
      if (m.adapter === 'keine') return { art: 'hinweis', code: m.grund === 'stickerei' || m.grund === 'rundum' || m.grund === 'farbfest' ? m.grund : 'keine' };
      if (m.farbfest.indexOf(p.id) >= 0) return { art: 'hinweis', code: 'farbfest' };
      // Tasse ohne gespiegeltes Katalogfoto (Printful sendet für products/ keinen CORS-Kopf, GEMESSEN): es gäbe nur eine Zeichnung, die sich nicht exportieren lässt; also gar keine Ansicht, aber ein klarer Hinweis
      if (m.adapter === 'tasse') { var pv = pvVariante(); var t = pv != null ? m.tasse[String(pv)] : null; if (!t || !t.foto) return { art: 'hinweis', code: 'keine' }; }
      return { art: m.adapter, m: m };
    }
    /** Vorlagenbild laden (mit CORS, damit die Zeichenfläche lesbar bleibt und der JPEG-Export klappt). Misslingt es, bleibt es bei der Ansicht «Druckfläche». Fehlschläge werden nicht gemerkt. */
    function vorschauBild(url) {
      if (!bildPuffer[url]) {
        var pr = new Promise(function (ok, fehler) {
          var img = new Image();
          var t = setTimeout(function () { fehler(new Error('Zeit')); }, vorschauZeit);
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
        if (opt.veraltet && opt.veraltet()) { leinwandFreigeben(a[2]); return { ok: false, grund: 'veraltet' }; }
        var ctx = cv.getContext('2d'), ov = a[0], bg = a[1], dcv = a[2];
        pvNeutral(ctx);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        if (bg) ctx.drawImage(bg, L.ox, L.oy, L.w, L.h);
        else { ctx.fillStyle = farbe.hex || '#ffffff'; ctx.fillRect(L.ox, L.oy, L.w, L.h); }
        // Das Design liegt auf einer Leinwand im Seitenverhältnis der Druckdatei, die ganz in die Druckfläche passt (einpassRechteck, «einpassen»): was über den Rand der Leinwand ragt, ist schon dort
        // abgeschnitten, ein zusätzlicher Beschnitt der Druckfläche änderte kein Pixel.
        function designZeichnen() { ctx.drawImage(dcv, L.ax + r.x, L.ay + r.y, r.w, r.h); }
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
        if (opt.veraltet && opt.veraltet()) { leinwandFreigeben(dcv); return { ok: false, grund: 'veraltet' }; }
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
      return Promise.all([vorschauBild(t.foto), designLeinwand(p, offW, offH)]).then(function (a) {
        if (opt.veraltet && opt.veraltet()) { leinwandFreigeben(a[1]); return { ok: false, grund: 'veraltet' }; }
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
    /** Hebt sich das Design (Leinwand dcv, durchsichtig, wo nichts liegt) vom Stoff (Hex) ab? Gibt den Text des Hinweises zurück, sonst ''. Gemeinsam für die Vorschau und (6.4.1) für «Bearbeiten». */
    function kontrastText(dcv, stoffHex) {
      var rgb = hexZuRgb(stoffHex), text = '';
      if (!dcv || !rgb) return '';
      var klein = null;
      try {
        klein = document.createElement('canvas');
        klein.width = 48; klein.height = Math.max(8, Math.round(48 * dcv.height / dcv.width));
        var kx = klein.getContext('2d');
        kx.drawImage(dcv, 0, 0, klein.width, klein.height);
        var a = kontrastAnalyse(kx.getImageData(0, 0, klein.width, klein.height).data, rgb);
        if (a.flaeche >= 3 && a.anteil >= KONTRAST_ANTEIL) text = a.art === 'dunkel' ? T.kontrastDunkel : T.kontrastHell;
      } catch (x) { /* Fläche nicht lesbar: dann gibt es keinen Hinweis */ }
      leinwandFreigeben(klein);   // iOS-Safari hat eine Obergrenze für den Speicher aller Zeichenflächen: nicht liegen lassen
      return text;
    }
    /** Hebt sich das Design vom Stoff ab? Zeigt sonst den Hinweis unter der Vorschau. */
    function kontrastHinweisZeigen(r) {
      ui.pvKontrast.hidden = true;
      if (!r || !r.ok || !r.dcv || !r.stoff) return;
      var t = kontrastText(r.dcv, r.stoff);
      if (t) { ui.pvKontrast.textContent = t; ui.pvKontrast.hidden = false; }
    }
    // 6.4.1: derselbe Hinweis in «Bearbeiten» und «Druckversion» (die Vorschau hat ihren eigenen unter der Canvas). Gerechnet aus dem Design der aktiven Platzierung gegen die Stofffarbe der gewählten
    // Ausführung (stoffHexFuer), ohne die Produktvorschau zu zeichnen; nur dort, wo die Vorschau eine Produktansicht zeigen würde (Stickerei, Rundum-Druck und feste Stofffarbe haben dort auch keinen Hinweis).
    var kbTimer = null, kbNr = 0;
    function kontrastBuehnePlanen() {
      if (!tabArt || legacy) return;
      clearTimeout(kbTimer);
      kbTimer = setTimeout(kontrastBuehneZeigen, 250);
    }
    function kontrastBuehneVerbergen() { kbNr++; ui.stKontrast.hidden = true; }
    function kontrastBuehneZeigen() {
      var nr = ++kbNr;
      var p = pAktiv();
      var art = p ? vorschauSpec(p).art : 'nein';
      var hex = !legacy && st.sicht !== 'produkt' && (art === 'flach' || art === 'tasse' || art === 'papier') && ebenenAktiv().length ? stoffHexFuer(p) : null;
      if (!hex || !hexZuRgb(hex)) { ui.stKontrast.hidden = true; return; }
      var pf = geo(p).printfile;
      designLeinwand(p, 192, 192 * pf.hoehePx / pf.breitePx).then(function (cv) {
        if (nr !== kbNr) { leinwandFreigeben(cv); return; }
        var t = kontrastText(cv, hex);
        leinwandFreigeben(cv);
        ui.stKontrast.textContent = t; ui.stKontrast.hidden = !t;
      }, function () { if (nr === kbNr) ui.stKontrast.hidden = true; });
    }
    function pvGroesse() {
      var cw = ui.pv.clientWidth || ui.karte.clientWidth || 560;
      return bereich(300, 1000, Math.round(cw * Math.min(2, window.devicePixelRatio || 1)));
    }
    function pvInfoZeigen(code) {
      ui.pv.hidden = true; ui.pvNote.hidden = true; ui.pvKontrast.hidden = true; ui.pvLaed.hidden = true;
      ui.pvInfo.textContent = fmt(code === 'stickerei' ? T.pvStickerei : code === 'rundum' ? T.pvRundum : code === 'farbfest' ? T.pvFarbe : T.pvKeine, { druck: druckName() });
      ui.pvInfo.hidden = false;
    }
    /** Die Produktansicht ist nicht möglich (Bild fehlt, CORS, keine Daten): zurück zur Druckfläche mit einem ruhigen Hinweis, kein Fehler. */
    function vorschauRueckfall() {
      sichtSetzen(sichtMoeglich('druck') ? 'druck' : 'bearbeiten');
      ui.sichtHinweis.textContent = fmt(T.pvNichtDa, { druck: druckName() });
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
      // Lädt ein Vorlagenbild länger als einen Augenblick (CDN langsam), steht «Vorschau wird erstellt …» da, statt einer leeren Fläche bis zum Rückfall
      var ladeTimer = setTimeout(function () { if (nr === pvNr && st.sicht === 'produkt') ui.pvLaed.hidden = false; }, 250);
      vorschauZeichnen(ui.pv, { p: p, veraltet: function () { return nr !== pvNr; } }).then(function (r) {
        clearTimeout(ladeTimer);
        if (nr === pvNr) ui.pvLaed.hidden = true;
        if (nr !== pvNr || st.sicht !== 'produkt') { leinwandFreigeben(r && r.dcv); return; }
        if (!r.ok) { if (r.grund !== 'veraltet') vorschauRueckfall(); return; }
        ui.pv.setAttribute('data-gezeichnet', String((Number(ui.pv.getAttribute('data-gezeichnet')) || 0) + 1));
        kontrastHinweisZeigen(r);
        leinwandFreigeben(r.dcv);   // die Design-Leinwand wird nur für den Kontrast-Hinweis gebraucht
      });
    }
    function vorschauPlanen() {
      if (st.sicht !== 'produkt' || pvPlan !== null) return;
      var los = function () { pvPlan = null; vorschauAnzeigen(); };
      pvPlan = window.requestAnimationFrame ? window.requestAnimationFrame(los) : setTimeout(los, 16);
    }
    // ── Ansichten «Bearbeiten | Druckversion | Vorschau» (6.4.0) ────────────────────────────────────
    // 'bearbeiten' = das Produkt mit Motiv (bei Platzierungen mit Produktfoto) oder die Bühne von 6.3.1 (alle anderen Fälle); 'druck' = die Bühne von 6.3.1 mit Vorhang, wo es neben 'bearbeiten' etwas anderes zeigt
    // (nur bei Produktfoto); 'produkt' = die Canvas-Vorschau. Mit data-bearbeiten="0" gelten die zwei Schalter von 6.3.1 («Druckfläche | Auf dem Produkt»).
    /** Kann «Bearbeiten» für die Platzierung p das Produkt zeigen? Nur mit echtem Produktfoto als Vorlage (die Vorschaudaten kennen es in `bilder`), nur Adapter «flach», nie bei Hinweisen
     *  (Stickerei, Rundum-Druck, farbfeste Vorlage), nie bei Tasse und Poster (anderer Adapter). */
    function produktfotoMoeglich(p) {
      if (legacy || bearbeitenModus === 'aus' || !vorschauDaten || !p || !platzierungIn(karte, p.id)) return false;
      var spec = vorschauSpec(p);
      if (spec.art !== 'flach') return false;
      var vl = geo(p).vorlage;
      return !!bildAdresse(spec.m, vl && vl.bildUrl);
    }
    /** Zeigt die Bühne gerade «Bearbeiten» auf dem Produkt? */
    function produktBuehne() { return !legacy && bearbeitenModus !== 'aus' && st.sicht === 'bearbeiten' && produktfotoMoeglich(pAktiv()); }
    /** Ist die Ansicht für die aktive Platzierung möglich? */
    function sichtMoeglich(art) {
      if (legacy) return art === 'druck';
      if (art === 'bearbeiten') return bearbeitenModus !== 'aus';
      if (art === 'druck') return bearbeitenModus === 'aus' || produktfotoMoeglich(pAktiv());
      if (art === 'produkt') return vorschauAngebot();
      return false;
    }
    function sichtKnopf(b, an) {
      if (tabArt) { b.setAttribute('aria-selected', an ? 'true' : 'false'); b.setAttribute('tabindex', an ? '0' : '-1'); } else umschalter(b, an);
    }
    /** Name der Ansicht, die in den Hinweisen der Produktvorschau «Prüfe dein Motiv in der Ansicht …» heisst: «Druckfläche» (6.3.1), «Druckversion» oder «Bearbeiten». */
    function druckName() { return !tabArt ? T.sichtDruck : (ui.sichtDruck.hidden ? T.sichtBearbeiten : T.sichtDruckversion); }
    /** NUR Zustand und Sichtbarkeit; baut die Bühne nicht neu auf (sonst Rekursion über buehneAufbauen). */
    function sichtAnwenden(art) {
      var vorher = st.sicht;
      st.sicht = art;
      sichtKnopf(ui.sichtBearbeiten, art === 'bearbeiten'); sichtKnopf(ui.sichtDruck, art === 'druck'); sichtKnopf(ui.sichtProdukt, art === 'produkt');
      ui.buehne.hidden = art === 'produkt';
      ui.pvWrap.hidden = art !== 'produkt';
      if (art !== 'produkt') pvNr++;   // offene Zeichenaufträge der Canvas verwerfen
      if (art === 'produkt') kontrastBuehneVerbergen(); else kontrastBuehnePlanen();   // 6.4.1: in der Vorschau gilt ihr eigener Hinweis
      zoomAktualisieren();
      return vorher !== art;
    }
    /** Reiter, Hinweiszeile und Beschriftung: welche Ansichten bietet die aktive Platzierung an? (nur mit data-bearbeiten ≠ 0) */
    function sichtBeschriften() {
      if (!tabArt) return;
      var druck = produktfotoMoeglich(pAktiv()), vorschau = vorschauAngebot();
      var hatFokus = false;
      try { hatFokus = ui.sicht.contains(document.activeElement); } catch (x) { /* egal */ }
      ui.sichtBearbeiten.hidden = false; ui.sichtDruck.hidden = !druck; ui.sichtProdukt.hidden = !vorschau;
      var anzahl = 1 + (druck ? 1 : 0) + (vorschau ? 1 : 0);
      ui.sicht.setAttribute('data-anzahl', String(anzahl));
      ui.sicht.hidden = anzahl < 2;
      ui.sichtBearbeiten.setAttribute('aria-controls', ui.stage.id || '');
      ui.sichtDruck.setAttribute('aria-controls', ui.stage.id || '');
      ui.sichtProdukt.setAttribute('aria-controls', ui.pvWrap.id || '');
      if (hatFokus && document.activeElement && document.activeElement.hidden) { var gew = [ui.sichtBearbeiten, ui.sichtDruck, ui.sichtProdukt].filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0]; try { (gew || ui.sichtBearbeiten).focus(); } catch (x2) { /* egal */ } }
      var hinweis = produktBuehne() ? T.bearbeitenNote : (st.sicht === 'druck' && druck ? T.druckNote : '');
      ui.sichtNote.textContent = hinweis;
      ui.sichtNote.hidden = !hinweis;
    }
    /** Wunsch gegen das Mögliche abgleichen (läuft am Anfang jedes buehneAufbauen() und in sichtAktualisieren(); ohne Rekursion). Ein Wunsch «Vorschau», der nicht mehr möglich ist, wird nicht von selbst
     *  wieder aufgenommen; ein Wunsch «Druckversion» bleibt erhalten, wenn er nur für die aktive Platzierung nicht möglich ist (zurück auf eine Platzierung mit Foto holt ihn zurück). */
    function sichtAbgleichen() {
      if (!tabArt) return;
      var wunsch = st.sichtWunsch || (bearbeitenModus === 'angebot' ? 'druck' : 'bearbeiten');
      if (wunsch === 'produkt' && !sichtMoeglich('produkt')) st.sichtWunsch = wunsch = 'bearbeiten';
      var ziel = sichtMoeglich(wunsch) ? wunsch : 'bearbeiten';
      if (ziel !== st.sicht) sichtAnwenden(ziel);
      sichtBeschriften();
    }
    /** Ansicht wechseln (Knopf und Schnittstelle). Eine nicht mögliche Ansicht ändert nichts (wie 6.3.1 bei «produkt» ohne Vorschau). */
    function sichtSetzen(art) {
      if (!sichtMoeglich(art)) return;
      // Hat das Produktfoto der Bühne einmal nicht geladen (kurzer Netzaussetzer), bekommt es bei jeder erneuten Wahl von «Bearbeiten» einen neuen Versuch (statt bis zum Neuladen der Seite gesperrt zu bleiben)
      var neuLaden = art === 'bearbeiten' && !!ui.tplFehlerUrl;
      if (neuLaden) { ui.tplFehlerUrl = ''; ui.tpl.removeAttribute('src'); }
      if (tabArt) st.sichtWunsch = art;
      sichtAnwenden(art);
      sichtBeschriften();
      if (art === 'produkt') { vorschauAnzeigen(); return; }
      if (neuLaden || ui.fensterGebaut !== fensterSchluessel()) { buehneAufbauen(); metaAktualisieren(); alleZeichnen(); }
    }
    /** Bietet dieses Modell überhaupt eine Ansicht an? Eine Tasse, bei der KEINE Ausführung ein gespiegeltes Katalogfoto hat (Printfuls Tassenfotos unter products/ senden keinen CORS-Kopf, GEMESSEN),
     *  könnte nur eine Zeichnung zeigen, die sich nicht exportieren lässt: dort gibt es den Umschalter gar nicht (nichts anbieten, was nicht da ist). Fehlt das Foto nur bei einzelnen Ausführungen,
     *  bleibt der Umschalter, und `vorschauSpec` zeigt für diese Ausführung den Hinweis. Seit 6.4.0 (Fund D): hat eine flache Platzierung kein bekanntes Produktfoto (keine Vorschau-Eichung,
     *  z. B. Kiss-Cut 38 × 9,5 cm), gibt es für sie keinen Reiter «Vorschau» statt eines toten Umschalters. */
    function vorschauAngebot() {
      var m = vorschauModell();
      if (!m) return false;
      if (m.adapter === 'tasse') return Object.keys(m.tasse).some(function (pv) { return !!(m.tasse[pv] && m.tasse[pv].foto); });
      if (tabArt && m.adapter === 'flach') {
        var p = pAktiv(), spec = vorschauSpec(p);
        if (spec.art === 'flach' && !bildAdresse(spec.m, geo(p).vorlage.bildUrl)) return false;
      }
      return true;
    }
    /** Die Reiter gibt es nur, wenn die Vorschaudaten das Modell der gewählten Ausführung kennen und es mehr als «Bearbeiten» anbietet. Mit data-bearbeiten="0": die zwei Schalter von 6.3.1. */
    function sichtAktualisieren() {
      if (!tabArt) {
        var an = !legacy && vorschauAngebot();
        ui.sicht.hidden = !an;
        if (!an && st.sicht === 'produkt') sichtSetzen('druck');
        return;
      }
      sichtAbgleichen();
      if (st.sicht !== 'produkt' && ui.fensterGebaut !== fensterSchluessel()) { buehneAufbauen(); metaAktualisieren(); alleZeichnen(); }
    }
    function vorschauDatenSetzen(roh) {
      var r = vorschauNormalisieren(roh);
      if (!r.daten) { warnung('Vorschaudaten unbrauchbar: ' + r.fehler); vorschauDaten = null; sichtAktualisieren(); return false; }
      // Kein Springen unter dem Finger: treffen die Daten erst NACH der ersten Änderung des Kunden ein (langsames Netz), bleibt er in der Bühne, die er sieht («Bearbeiten» kann er selbst wählen)
      if (bearbeitenModus === 'start' && st.sichtWunsch === null && st.beruehrt && !vorschauDaten) st.sichtWunsch = 'druck';
      vorschauDaten = r.daten;
      sichtAktualisieren();
      kontrastBuehnePlanen();
      return true;
    }
    /** JPEG 800 × 800 der Platzierung p (Vorgabe: die aktive, sonst die erste benutzte, die sich zeigen lässt), höchstens VORSCHAU_MAX_BYTES; null, wenn keine Vorschau möglich ist (Hinweis, kein Bild, CORS, zu schwer). */
    function vorschauExport(p) {
      var cv = document.createElement('canvas');
      cv.width = VORSCHAU_PX; cv.height = VORSCHAU_PX;
      return vorschauZeichnen(cv, { p: p || pAktiv() }).then(function (r) {
        leinwandFreigeben(r && r.dcv);
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
    /** Vorschau-JPEG hochladen (beim Klick auf «In den Warenkorb», nach den Druckdateien). Die Vorschau ist Komfort: misslingt sie, geht die Bestellung ohne «_vorschau» weiter.
     *  Sie hält den Kauf höchstens `kaufFrist` (4 s) auf, auch wenn ein Vorlagenbild oder der Upload hängt (GEMESSEN vorher: 20 s Stillstand ohne Meldung); was danach noch eintrifft, wird verworfen. */
    function vorschauSenden(verwendet) {
      vorschauUrl = '';
      if (!vorschauDaten) return Promise.resolve();
      var p = vorschauPlatzierungWaehlen(verwendet);
      if (!p) return Promise.resolve();
      var nr = ++vorschauSendeNr;
      var gilt = function () { return nr === vorschauSendeNr; };
      var arbeit = vorschauExport(p).then(function (blob) {
        if (!blob || !gilt()) return null;
        return new Promise(function (ok) {
          hochladen(blob, true, function (err, url) { if (gilt() && !err && url) vorschauUrl = url; ok(); }, Math.min(uploadZeit, kaufFrist));
        });
      }).catch(function () { /* Komfort */ });
      return new Promise(function (fertig) {
        var t = setTimeout(function () { vorschauSendeNr++; fertig(); }, kaufFrist);   // Frist abgelaufen: spätere Ergebnisse zählen nicht mehr
        arbeit.then(function () { clearTimeout(t); fertig(); });
      });
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
      try {
        Object.keys(d.ebenen).forEach(function (pid) {
          // nur eigene Platzierungen: ein Schlüssel wie «__proto__», «constructor» oder «toString» (beschädigter oder fremd geschriebener Entwurf) darf den Bau nicht abstürzen lassen
          if (!Object.prototype.hasOwnProperty.call(st.ebenen, pid) || !Array.isArray(d.ebenen[pid])) return;   // diese Platzierung gibt es nicht mehr
          d.ebenen[pid].forEach(function (n) {
            var e = ebeneAusEntwurf(n);
            if (!e) return;
            st.ebenen[pid].push(e); neu++;
            hoechste = Math.max(hoechste, parseInt(e.id.slice(1), 10) || 0);
            if (e.type === 'image') origMass[e.id] = { w: e._origW, h: e._origH };
          });
        });
      } catch (x) {
        // unerwartete Form: Entwurf verwerfen, damit der Fehler nicht bei jedem Neuladen wiederkehrt
        Object.keys(st.ebenen).forEach(function (id) { st.ebenen[id] = []; });
        speicherLoeschen(entwurfKey);
        return false;
      }
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
    // 6.4.0: mit data-bearbeiten ≠ 0 eine Reiterleiste «Bearbeiten | Druckversion | Vorschau» (role=tablist, aria-selected, Pfeiltasten); mit 0 die zwei Schalter von 6.3.1
    ui.sicht = el('div', { class: 'lsp6-sicht', role: tabArt ? 'tablist' : 'group', 'aria-label': T.sichtLabel, 'data-feld': 'sicht' });
    function sichtKnopfBauen(art, text, an) {
      var a = { type: 'button', class: 'lsp6-sbtn', 'data-sicht': art, text: text };
      if (tabArt) { a.role = 'tab'; a['aria-selected'] = an ? 'true' : 'false'; a.tabindex = an ? '0' : '-1'; } else a['aria-pressed'] = an ? 'true' : 'false';
      return el('button', a);
    }
    ui.sichtBearbeiten = sichtKnopfBauen('bearbeiten', T.sichtBearbeiten, tabArt);
    ui.sichtDruck = sichtKnopfBauen('druck', tabArt ? T.sichtDruckversion : T.sichtDruck, !tabArt);
    ui.sichtProdukt = sichtKnopfBauen('produkt', tabArt ? T.sichtVorschau : T.sichtProdukt, false);
    if (tabArt) ui.sicht.appendChild(ui.sichtBearbeiten);   // mit data-bearbeiten="0" steht der Knopf «Bearbeiten» nicht im DOM
    ui.sicht.appendChild(ui.sichtDruck); ui.sicht.appendChild(ui.sichtProdukt);
    ui.sicht.hidden = true;
    ui.karte.appendChild(ui.sicht);
    ui.sichtLive = el('p', { class: 'lsp6-sr', role: 'status', 'aria-live': 'polite', 'data-feld': 'sichtlive' });
    ui.karte.appendChild(ui.sichtLive);
    ui.sichtNote = el('p', { class: 'lsp6-tip', 'data-feld': 'sichtnote', style: 'padding-bottom:2px' });
    ui.sichtNote.hidden = true;
    ui.sichtHinweis = el('p', { class: 'lsp6-sh', role: 'status', 'aria-live': 'polite', 'data-feld': 'sichthinweis', style: 'margin:0' });
    ui.sichtBox = el('div', { class: 'lsp6-hints', style: 'padding-bottom:6px' }, [ui.sichtHinweis]);
    ui.sichtBox.hidden = true;
    ui.karte.appendChild(ui.sichtBox);
    ui.karte.appendChild(ui.sichtNote);

    ui.stage = el('div', { class: 'lsp6-stage', role: 'tabpanel', 'aria-label': T.head });
    ui.grund = el('div', { class: 'lsp6-grund', 'data-feld': 'grund' });   // Stofffarbe im Rechteck der Vorlage («Bearbeiten» auf dem Produkt)
    ui.grund.hidden = true;
    ui.bg = el('img', { class: 'lsp6-bg', alt: '' });
    ui.tpl = el('img', { class: 'lsp6-tpl', alt: '' });
    ui.host = el('div', { class: 'lsp6-host' });
    ui.chromeHost = el('div', { class: 'lsp6-chrome-host' });   // Schicht über dem Vorlagenbild: Griffe der gewählten Ebene und Hilfslinien («Bearbeiten» auf dem Produkt)
    ui.chromeRoot = el('div', { class: 'lsp6-chrome', 'data-cid': '1' });
    ui.chromeRoot.hidden = true;
    ui.chromeHost.appendChild(ui.chromeRoot);
    ui.guideV = el('div', { class: 'lsp6-guide', style: 'top:0;bottom:0;left:50%;width:0;border-left:1.5px dashed #8a6410' });
    ui.guideH = el('div', { class: 'lsp6-guide', style: 'left:0;right:0;top:50%;height:0;border-top:1.5px dashed #8a6410' });
    ui.host.appendChild(ui.guideV); ui.host.appendChild(ui.guideH);
    ui.veil = [0, 1, 2, 3].map(function () { return el('div', { class: 'lsp6-veil' }); });
    ui.frame = el('div', { class: 'lsp6-frame' });
    ui.tag = el('div', { class: 'lsp6-tag' });
    ui.readout = el('div', { class: 'lsp6-readout', style: 'display:none' });
    [ui.grund, ui.bg, ui.tpl, ui.host].concat(ui.veil, [ui.frame, ui.tag, ui.chromeHost, ui.readout]).forEach(function (n) { ui.stage.appendChild(n); });
    [ui.bg, ui.tpl].forEach(function (img) { img.addEventListener('error', function () { img.hidden = true; }); });
    ui.bg.addEventListener('error', function () { if (ui.grund.getAttribute('data-ersatz')) ui.grund.style.background = ui.grund.getAttribute('data-ersatz'); });   // Textur lädt nicht: Stofffarbe
    // Lädt das Produktfoto nicht, hilft «Bearbeiten» nicht weiter: zurück in die Druckversion mit einem ruhigen Hinweis (gedruckt wird die Druckdatei, nicht das Foto).
    // Der Fehler kann vor den Vorschaudaten eintreffen: die Adresse wird gemerkt und beim Aufbau der Produktbühne geprüft.
    ui.tpl.addEventListener('error', function () { ui.tplFehlerUrl = ui.tpl.getAttribute('src'); tplFehlerPruefen(); });
    if (window.ResizeObserver) chromeBeob = new ResizeObserver(function () { chromeNachziehen(); });
    var buehne = el('div', { class: 'lsp6-stagewrap' }, [ui.stage]);
    ui.karte.appendChild(buehne);
    ui.buehne = buehne;
    ui.pv = el('canvas', { class: 'lsp6-pv', role: 'img', 'aria-label': T.pvAlt });
    ui.pvInfo = el('p', { class: 'lsp6-pvinfo', role: 'status', 'data-feld': 'produktinfo' });
    ui.pvInfo.hidden = true;
    ui.pvNote = el('p', { class: 'lsp6-pvnote', text: T.pvNote });
    ui.pvLaed = el('p', { class: 'lsp6-pvlaed', role: 'status', 'aria-live': 'polite', 'data-feld': 'pvlaedt', text: T.pvLaedt });
    ui.pvLaed.hidden = true;
    ui.pvKontrast = el('p', { class: 'lsp6-sh', role: 'status', 'aria-live': 'polite', 'data-feld': 'kontrast', style: 'margin:0 16px 8px' });
    ui.pvKontrast.hidden = true;
    ui.pvWrap = el('div', { class: 'lsp6-pvwrap', 'data-feld': 'produktansicht', role: tabArt ? 'tabpanel' : null, 'aria-label': tabArt ? T.sichtVorschau : null }, [ui.pv, ui.pvInfo, ui.pvLaed, ui.pvNote, ui.pvKontrast]);
    ui.pvWrap.hidden = true;
    ui.karte.appendChild(ui.pvWrap);
    // Zoom in «Bearbeiten» auf dem Produkt: Ganzes Produkt ← Produkt → Druckfläche (Knöpfe, Zustand sichtbar, Tastatur)
    ui.zoomMinus = el('button', { type: 'button', class: 'lsp6-zbtn', 'data-zoom': 'minus', 'aria-label': T.zoomMinus, text: T.zoomMinus });
    ui.zoomPlus = el('button', { type: 'button', class: 'lsp6-zbtn', 'data-zoom': 'plus', 'aria-label': T.zoomPlus, text: T.zoomPlus });
    ui.zoomStufe = el('span', { class: 'lsp6-zoomstufe', 'data-feld': 'zoomstufe', 'aria-hidden': 'true' });
    ui.zoomLive = el('span', { class: 'lsp6-sr', role: 'status', 'aria-live': 'polite', 'data-feld': 'zoomlive' });
    ui.zoomBox = el('div', { class: 'lsp6-zoom', role: 'group', 'aria-label': T.zoomLabel, 'data-feld': 'zoom' }, [ui.zoomMinus, ui.zoomStufe, ui.zoomPlus, ui.zoomLive]);
    ui.zoomBox.hidden = true;
    ui.karte.appendChild(ui.zoomBox);
    // 6.4.1: «Text | Sticker | Bild» (und die Stickerauswahl, die sie öffnen) stehen direkt unter der Bühne und ihrer Zoomleiste statt am Ende der Karte: auf dem Handy (390 × 844) lagen die Knöpfe bis 6.4.0
    // 777 bis 838 px unter dem Anfang des Editors, jetzt im ersten Bildschirm (README «Version 6.4.1»)
    ui.werkzeuge = el('div', { class: 'lsp6-tools', 'data-feld': 'werkzeuge' });
    ui.karte.appendChild(ui.werkzeuge);
    // 6.4.1: Kontrast-Hinweis für «Bearbeiten» und «Druckversion» (die Vorschau hat ihren eigenen, ui.pvKontrast)
    ui.stKontrast = el('p', { class: 'lsp6-sh', role: 'status', 'aria-live': 'polite', 'data-feld': 'kontrast-bearbeiten', style: 'margin:6px 16px 0' });
    ui.stKontrast.hidden = true;
    ui.karte.appendChild(ui.stKontrast);

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
    ui.werkzeuge.appendChild(zeileWerkzeuge);

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
    ui.werkzeuge.appendChild(ui.picker);   // 6.4.1: direkt unter den Knöpfen, die ihn öffnen

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
    ui.pvWrap.id = stageId + '-pv';

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
      if (tabArt) st.beruehrt = true;
      sichtSetzen(b.getAttribute('data-sicht'));
      if (tabArt) ui.sichtLive.textContent = fmt(T.sichtLive, { a: b.textContent });   // nur beim Klick, nicht bei der automatischen Vorgabe
    });
    ui.sicht.addEventListener('keydown', function (ev) {   // Reiter-Muster: Pfeiltasten, Pos1 und Ende bewegen den Fokus, Enter und Leertaste wählen (Knopf)
      if (!tabArt) return;
      var knoepfe = [ui.sichtBearbeiten, ui.sichtDruck, ui.sichtProdukt].filter(function (b) { return !b.hidden; });
      var i = knoepfe.indexOf(document.activeElement), ziel = null;
      if (i < 0) return;
      if (ev.key === 'ArrowRight') ziel = knoepfe[(i + 1) % knoepfe.length];
      else if (ev.key === 'ArrowLeft') ziel = knoepfe[(i - 1 + knoepfe.length) % knoepfe.length];
      else if (ev.key === 'Home') ziel = knoepfe[0];
      else if (ev.key === 'End') ziel = knoepfe[knoepfe.length - 1];
      if (!ziel) return;
      ev.preventDefault(); ev.stopPropagation();
      knoepfe.forEach(function (b) { b.setAttribute('tabindex', b === ziel ? '0' : '-1'); });   // genau ein Reiter ist Tab-Station
      ziel.focus();
    });
    ui.zoomMinus.addEventListener('click', function () { zoomSetzen(ZOOM_STUFEN.indexOf(st.zoom) - 1); });
    ui.zoomPlus.addEventListener('click', function () { zoomSetzen(ZOOM_STUFEN.indexOf(st.zoom) + 1); });
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
      if (b && e) { e.color = b.getAttribute('data-c'); delete e.farbeAuto; farbeMarkieren(e.color); knotenZeichnen(e); geaendert(); }
    });
    ui.farbwahl.addEventListener('input', function () { var e = textEbene(); if (e) { e.color = ui.farbwahl.value; delete e.farbeAuto; farbeMarkieren(e.color); knotenZeichnen(e); geaendert(); } });
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
      ui.cta.disabled = an; ui.cta.style.opacity = an ? '0.7' : '';
      try { if (an) ui.karte.setAttribute('inert', ''); else ui.karte.removeAttribute('inert'); } catch (x) { /* egal */ }
    }
    function reviewUrlsFreigeben(r) {
      (r && r.urls || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (x) { /* egal */ } });
      if (r) r.urls = [];
    }
    function reviewAufraeumen(fokus, text) {
      var ziel = ui.cta;
      reviewNr++;
      reviewBaut = false;
      reviewUrlsFreigeben(review);
      if (reviewModal && reviewModal.parentNode) reviewModal.parentNode.removeChild(reviewModal);
      reviewModal = null;
      review = null;
      eingefroren = null;
      vorschauSendeNr++;
      druckUrls = {};
      vorschauUrl = '';
      formularSynchronisieren();
      sperren(false);
      if (text) meldung(text, 'err');
      if (fokus) setTimeout(function () { try { ziel.focus(); } catch (x) { /* egal */ } }, 0);
    }
    /** Jede inhaltliche Aenderung entwertet auch eine noch im Aufbau befindliche Pruefung. */
    function reviewAenderung() {
      st.beruehrt = true;   // der Kunde hat etwas geändert: die Ansicht springt nicht mehr von selbst (Vorschaudaten, die später eintreffen)
      if (reviewBaut || review || reviewModal) reviewAufraeumen(false, T.reviewChanged);
      else reviewNr++;
    }
    function mitFrist(arbeit, ms, rueckfall) {
      return new Promise(function (fertig) {
        var aus = false;
        var t = setTimeout(function () { if (!aus) { aus = true; fertig(rueckfall); } }, ms);
        Promise.resolve(arbeit).then(function (wert) {
          if (!aus) { aus = true; clearTimeout(t); fertig(wert); }
        }, function () { if (!aus) { aus = true; clearTimeout(t); fertig(rueckfall); } });
      });
    }
    function reviewProduktVorschauen(dateien) {
      return Promise.all(dateien.map(function (datei) {
        return mitFrist(vorschauExport(datei.p), kaufFrist, null).then(function (blob) { datei.produktBlob = blob || null; return datei; });
      }));
    }
    function reviewZeile(label, wert) {
      return el('div', {}, [el('b', { text: label + ': ' }), document.createTextNode(String(wert || '–'))]);
    }
    function reviewModalOeffnen(r) {
      var modal = el('div', { class: 'lsp6-modal lsp6-review', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lsp6-review-title-' + r.nr, 'data-lsp6-review': '1' });
      var panel = el('div', { class: 'lsp6-review-panel' });
      panel.appendChild(el('h2', { id: 'lsp6-review-title-' + r.nr, class: 'lsp6-modal-t', text: T.reviewHead }));
      panel.appendChild(el('p', { class: 'lsp6-modal-s', text: T.reviewIntro }));
      var summe = el('div', { class: 'lsp6-review-summary', 'data-review-summary': '1' });
      summe.appendChild(reviewZeile(T.reviewProduct, r.produkt));
      summe.appendChild(reviewZeile(T.reviewVariant, r.variante));
      summe.appendChild(reviewZeile(T.reviewModel, r.stand.m));
      summe.appendChild(reviewZeile(T.reviewPlacements, r.dateien.map(function (d) { return titelVon(d.p); }).join(', ')));
      panel.appendChild(summe);
      var raster = el('div', { class: 'lsp6-review-grid' });
      r.dateien.forEach(function (datei) {
        var g = geo(datei.p, r.stand.pv);
        var karteEl = el('section', { class: 'lsp6-review-card', 'data-review-placement': datei.p.id });
        karteEl.appendChild(el('h3', { text: titelVon(datei.p) }));
        var meta = fmt(T.previewInfo, { w: datei.groesse.w, h: datei.groesse.h });
        if (g.masse) meta += ' · ' + schweizerZahl(g.masse.breite, 1) + ' × ' + schweizerZahl(g.masse.hoehe, 1) + ' cm';
        karteEl.appendChild(el('p', { class: 'lsp6-review-meta', text: meta }));
        var pics = el('div', { class: 'lsp6-review-pics' });
        var druckUrl = URL.createObjectURL(datei.blob); r.urls.push(druckUrl);
        pics.appendChild(el('figure', { class: 'lsp6-review-figure' }, [
          el('figcaption', { text: T.reviewPrint }),
          el('img', { class: 'lsp6-review-img lsp6-review-print', src: druckUrl, alt: T.reviewPrint + ' – ' + titelVon(datei.p), 'data-review-print': datei.p.id }),
        ]));
        var produkt = el('figure', { class: 'lsp6-review-figure' });
        var produktArt = vorschauSpec(datei.p).art;
        produkt.appendChild(el('figcaption', { text: produktArt === 'tasse' ? T.reviewMugView : T.reviewOnProduct }));
        if (datei.produktBlob) {
          var produktUrl = URL.createObjectURL(datei.produktBlob); r.urls.push(produktUrl);
          produkt.appendChild(el('img', { class: 'lsp6-review-img', src: produktUrl, alt: T.pvAlt + ' – ' + titelVon(datei.p), 'data-review-product': datei.p.id }));
        } else produkt.appendChild(el('div', { class: 'lsp6-review-fallback', text: T.reviewFallback, 'data-review-fallback': datei.p.id }));
        if (produktArt === 'tasse') produkt.appendChild(el('p', { class: 'lsp6-review-pvnote', text: T.reviewMugNote }));
        pics.appendChild(produkt);
        karteEl.appendChild(pics);
        raster.appendChild(karteEl);
      });
      panel.appendChild(raster);
      var checkId = 'lsp6-review-ok-' + r.nr;
      var akzept = el('input', { type: 'checkbox', id: checkId, class: 'lsp6-review-accept' });
      panel.appendChild(el('label', { class: 'lsp6-review-check', for: checkId }, [akzept, el('span', { text: T.reviewAccept })]));
      var zurueckBtn = el('button', { type: 'button', class: 'back lsp6-review-back', text: T.reviewBack });
      var bestaetigen = el('button', { type: 'button', class: 'go lsp6-review-confirm', text: T.reviewConfirm, disabled: 'disabled' });
      panel.appendChild(el('div', { class: 'lsp6-review-actions' }, [zurueckBtn, bestaetigen]));
      modal.appendChild(panel);
      r.modal = modal; r.accept = akzept; r.confirm = bestaetigen;
      reviewModal = modal;
      akzept.addEventListener('change', function () { bestaetigen.disabled = !akzept.checked; });
      zurueckBtn.addEventListener('click', function () { reviewAufraeumen(true, ''); });
      bestaetigen.addEventListener('click', function () { if (akzept.checked) reviewBestaetigen(r); });
      modal.addEventListener('click', function (ev) { if (ev.target === modal) reviewAufraeumen(true, ''); });
      modal.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); reviewAufraeumen(true, ''); return; }
        if (ev.key !== 'Tab') return;
        var fokus = Array.prototype.filter.call(modal.querySelectorAll('button,input,[href],[tabindex]:not([tabindex="-1"])'), function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; });
        if (!fokus.length) { ev.preventDefault(); return; }
        var erster = fokus[0], letzter = fokus[fokus.length - 1];
        if (ev.shiftKey && document.activeElement === erster) { ev.preventDefault(); letzter.focus(); }
        else if (!ev.shiftKey && document.activeElement === letzter) { ev.preventDefault(); erster.focus(); }
      });
      document.body.appendChild(modal);
      akzept.focus();
    }
    function reviewFehler(err) {
      reviewAufraeumen(false, '');
      meldung(T.addErr + ((err && err.message) || T.printErr), 'err');
      varianteGeprueft();
    }
    /** Optionales Warenkorb-Vorschaubild: derselbe im Pruefdialog gezeigte Produkt-JPEG-Blob, niemals neu gezeichnet. */
    function reviewVorschauSenden(r) {
      function laufGueltig() {
        return r === review && r.nr === reviewNr && !!eingefroren && reviewStandGueltig(r.stand, aktuellerReviewStand());
      }
      // Zwischen dem letzten Druckdatei-Upload und diesem optionalen Upload kann eine
      // Design-/Variantenänderung den Lauf bereits entwertet haben. Dann darf auch der
      // Komfort-Upload nicht mehr starten oder eine alte URL zurückschreiben.
      if (!laufGueltig()) return Promise.reject(new Error(T.reviewChanged));
      vorschauUrl = '';
      var datei = r.dateien.filter(function (d) { return !!d.produktBlob; })[0];
      if (!datei) return Promise.resolve();
      var nr = ++vorschauSendeNr;
      var arbeit = new Promise(function (fertig) {
        hochladen(datei.produktBlob, true, function (err, url) {
          if (nr === vorschauSendeNr && laufGueltig() && !err && url) vorschauUrl = url;
          fertig();
        }, Math.min(uploadZeit, kaufFrist));
      });
      return mitFrist(arbeit, kaufFrist, null).then(function () {
        if (!laufGueltig()) throw new Error(T.reviewChanged);
        if (nr === vorschauSendeNr && !vorschauUrl) vorschauSendeNr++;
      });
    }
    function reviewBestaetigen(r) {
      varianteGeprueft();
      if (r !== review || !r.accept.checked || !reviewStandGueltig(r.stand, aktuellerReviewStand())) { reviewAufraeumen(true, T.reviewChanged); return; }
      r.confirm.disabled = true;
      eingefroren = { sv: r.stand.sv, pv: r.stand.pv };
      if (reviewModal && reviewModal.parentNode) reviewModal.parentNode.removeChild(reviewModal);
      reviewModal = null;
      reviewUrlsFreigeben(r);   // Blobs bleiben erhalten; nur die jetzt unsichtbaren Browser-Adressen werden freigegeben
      druckUrls = {}; vorschauUrl = '';
      meldung(T.baking);
      var kette = Promise.resolve();
      r.dateien.forEach(function (datei) {
        kette = kette.then(function () {
          if (r !== review || r.nr !== reviewNr || !eingefroren || !reviewStandGueltig(r.stand, aktuellerReviewStand())) throw new Error(T.reviewChanged);
          return druckdateiBlobSenden(datei).then(function (url) {
            if (r !== review || r.nr !== reviewNr || !eingefroren || !reviewStandGueltig(r.stand, aktuellerReviewStand())) throw new Error(T.reviewChanged);
            druckUrls[datei.p.id] = url;
          });
        });
      });
      var eigenschaftenFertig = null;
      kette = kette.then(function () { return reviewVorschauSenden(r); });
      kette.then(function () {
        if (r !== review || r.nr !== reviewNr || !eingefroren || !reviewStandGueltig(r.stand, aktuellerReviewStand())) throw new Error(T.reviewChanged);
        if (r.dateien.some(function (datei) { return !druckUrls[datei.p.id]; })) throw new Error(T.printErr);
        eigenschaftenFertig = eigenschaften();
        if (eigenschaftenFertig._pod_karte && eigenschaftenFertig._pod_karte.length > POD_KARTE_MAX) throw new Error(T.tooMany);
        meldung(T.adding + (verkleinertText ? ' ' + verkleinertText : ''));
        return fetch(CART_ADD_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: r.stand.sv, quantity: 1, properties: eigenschaftenFertig }),
        });
      }).then(function (antwort) {
        return antwort.ok ? antwort.json() : antwort.json().then(function (d) { throw new Error(d.description || 'Fehler'); });
      }).then(function () {
        meldung(T.added, 'ok');
        entwurfAus = true; clearTimeout(entwurfTimer); speicherLoeschen(entwurfKey);
        window.location.href = CART_URL;
      }).catch(function (err) {
        // Ein spaet endender alter Lauf darf einen inzwischen geoeffneten neuen Review weder schliessen noch dessen Status/Dateien ueberschreiben.
        if (r !== review || r.nr !== reviewNr) return;
        reviewFehler(err);
      });
    }
    function reviewStarten() {
      if (eingefroren || reviewBaut || review) return;
      varianteGeprueft();
      var fremde = fremdeMitEbenen();
      var verwendet = verwendetePlatzierungen();
      if (!verwendet.length && !fremde.length) { meldung(T.empty, 'err'); return; }
      if (fremde.length) { meldung(fmt(T.orphan, { a: fremde.map(function (id) { return titelVon(platzierung(id)); }).join(', ') }), 'err'); return; }
      if (verwendet.some(function (p) { return st.ebenen[p.id].some(function (e) { return e.uploading; }); })) { meldung(T.stillUp, 'err'); return; }
      if (!st.shopVariante) { meldung(T.noVar, 'err'); return; }
      if (!ausfuehrungOk()) { meldung(T.noMap, 'err'); return; }
      for (var i = 0; i < verwendet.length; i++) {
        var b = blockiertDurch(verwendet[i].id);
        if (b.length) { meldung(fmt(T.blocked, { a: titelVon(verwendet[i]), b: b.map(function (q) { return titelVon(platzierung(q)); }).join(', ') }), 'err'); return; }
      }
      var qs = qualitaetSperre();
      if (qs) { meldung(qs, 'err'); return; }
      if (podKarteWert(verwendet).length > POD_KARTE_MAX) { meldung(T.tooMany, 'err'); return; }
      if (!CLOUDINARY_AKTIV) { meldung(T.addErr + T.printErr, 'err'); return; }
      var gepruefterStand = aktuellerReviewStand();
      var nr = ++reviewNr;
      reviewBaut = true;
      sperren(true);
      abwaehlen();
      verkleinertText = '';
      meldung(T.reviewBuilding);
      var dateien = [];
      var kette = Promise.resolve();
      verwendet.forEach(function (p) {
        kette = kette.then(function () { return druckdateiVorbereiten(p, gepruefterStand.pv).then(function (d) { dateien.push(d); }); });
      });
      kette.then(function () { return reviewProduktVorschauen(dateien); }).then(function () {
        if (!reviewBaut || nr !== reviewNr || !reviewStandGueltig(gepruefterStand, aktuellerReviewStand())) {
          if (nr === reviewNr) reviewAufraeumen(false, T.reviewChanged);
          return;
        }
        reviewBaut = false;
        review = { nr: nr, stand: gepruefterStand, dateien: dateien, urls: [], produkt: produktName(), variante: ausfuehrungName() };
        meldung('');
        reviewModalOeffnen(review);
      }).catch(function (err) {
        if (nr !== reviewNr) return;
        reviewAufraeumen(false, '');
        meldung(T.addErr + ((err && err.message) || T.printErr), 'err');
      });
    }
    // v6.3: verbindliche Druckpruefung vor jedem Upload und Warenkorb-POST
    ui.cta.addEventListener('click', reviewStarten);

    // Tastatur (wie v5): Strg+Z / Strg+Y, Entf, Pfeiltasten
    ui.karte.addEventListener('keydown', function (ev) {
      var tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var taste = (ev.key || '').toLowerCase();
      var strg = ev.ctrlKey || ev.metaKey;
      if (strg && taste === 'z' && !ev.shiftKey) { ev.preventDefault(); zurueck(); return; }
      if (strg && (taste === 'y' || (taste === 'z' && ev.shiftKey))) { ev.preventDefault(); wiederholen(); return; }
      if (tag === 'BUTTON' && ev.target.closest && ev.target.closest('.lsp6-sicht, .lsp6-zoom, .lsp6-tabs, [role="tab"]')) return;   // Pfeile, Entf, Rück auf den Ansicht-, Zoom- und Platzierungs-Reitern gehören dem Reiter, nicht der gewählten Ebene (6.4.1: auch die Reiter der Platzierungen)
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
      reviewAenderung();
      if (legacy) { bildSetzen(ui.bg, legacyBild()); return; }
      var modellGewechselt = modellAnpassen();
      var farbenNeu = autoFarbenAnwenden();   // 6.4.1: Standardfarbe folgt dem Stoff der neuen Ausführung (Zustand; gezeichnet wird unten)
      if (modellGewechselt) {
        abwaehlen();
        knotenLoeschen();
        buehneAufbauen(); metaAktualisieren(); knotenNeuAufbauen();
        tabsAufbauen(); felderAktualisieren(); aufpreisSummeAktualisieren(); reiterHinweis('');
        sichtAktualisieren(); qualitaetPruefen();
        if (farbenNeu) geaendert();
        return;
      }
      buehneAufbauen(); metaAktualisieren(); alleZeichnen();
      var e = gewaehlt(); if (e) { werteSetzen(e); aufloesungPruefen(e); }
      if (farbenNeu) { felderAktualisieren(); geaendert(); }   // Farbwahl der gewählten Ebene, Eigenschaften im Formular und Entwurf nachziehen
      qualitaetPruefen();   // die Kaufsperre gilt für ALLE Fotos der neuen Ausführung (auch ohne gewählte Ebene)
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
    if (wiederhergestellt) autoFarbenAnwenden();   // 6.4.1: der Entwurf kann aus einer anderen Ausführung stammen
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
      // Neu in 6.4.0
      bearbeitenModus: bearbeitenModus, zoomSetzen: zoomSetzen, produktBuehne: produktBuehne, sichtAktualisieren: sichtAktualisieren,
      produktfotoMoeglich: function (id) { return produktfotoMoeglich(platzierung(id || st.aktiv)); },
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

  /** Exakter Rollout: Ohne gültige Produktkarte darf weder ein Legacy-Editor noch ein Warenkorb-Pfad entstehen. */
  function pflichtKarteBlockieren(container) {
    container.textContent = '';
    container.setAttribute('data-lspod6-modus', 'blockiert');
    container.appendChild(el('div', {
      class: 'lsp6-card-required', role: 'alert', text: T.cardRequired,
      style: 'padding:16px;border:1px solid #9b2c2c;border-radius:10px;background:#fff5f5;color:#681b1b;font-weight:700;line-height:1.45',
    }));
    Array.prototype.forEach.call(document.querySelectorAll('form[action*="/cart/add"]'), function (form) {
      form.setAttribute('data-lspod6-karte-blockiert', '1');
      Array.prototype.forEach.call(form.querySelectorAll('button[type="submit"],input[type="submit"],button:not([type])'), function (button) {
        button.disabled = true; button.setAttribute('aria-disabled', 'true');
      });
      form.addEventListener('submit', function (ev) {
        if (form.getAttribute('data-lspod6-karte-blockiert') !== '1') return;
        ev.preventDefault(); ev.stopImmediatePropagation();
      }, true);
    });
  }

  function mounten(container) {
    if (container.getAttribute('data-init-v6')) return;
    container.setAttribute('data-init-v6', 'busy');
    karteLesen(container).then(function (karte) {
      try {
        if (!karte && container.getAttribute('data-karte-pflicht') === '1') {
          warnung('Pflichtkarte fehlt: Legacy-Rückfall und Warenkorb sind blockiert');
          pflichtKarteBlockieren(container);
          container.setAttribute('data-init-v6', 'blocked');
          return;
        }
        var k = karte || legacyKarte(container);
        if (!karte) warnung('keine gültige Karte: Editor läuft im v5-Modus');
        var editor = baueEditor(container, k);
        editoren.push(editor);
        container.setAttribute('data-init-v6', '1');
        // Die Vorschaudaten kommen nach dem Bau und blockieren den Start nicht; ohne sie (oder im v5-Modus) bleibt der Editor, wie er ist
        if (karte) vorschauLesen(container).then(function (roh) { if (roh) editor.vorschauDatenSetzen(roh); });
      } catch (err) {
        if (container.getAttribute('data-karte-pflicht') === '1') {
          warnung('Pflichtkarte konnte keinen sicheren Editor erzeugen: Warenkorb ist blockiert');
          pflichtKarteBlockieren(container);
          container.setAttribute('data-init-v6', 'blocked');
        } else container.setAttribute('data-init-v6', 'err');
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
      // Neu in 6.4.0
      BEARBEITEN_RAND: BEARBEITEN_RAND, BEARBEITEN_MIN_ANTEIL: BEARBEITEN_MIN_ANTEIL,
      // Neu in 6.4.1
      standardTextFarbe: standardTextFarbe, hexZuRgb: hexZuRgb, WEISS_SCHATTEN: WEISS_SCHATTEN, TEXT_DUNKEL: TEXT_DUNKEL, TEXT_HELL: TEXT_HELL,
      // Neu in 6.3.0
      reviewStandGueltig: reviewStandGueltig,
      pflichtKarteBlockieren: pflichtKarteBlockieren,
    },
  };
})();
