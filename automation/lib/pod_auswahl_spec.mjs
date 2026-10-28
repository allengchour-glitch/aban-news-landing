/**
 * Spezifikation «Selbst gestalten»: Material (mit Preis) und Handymodelle zur Auswahl. NUR DATEN, keine Rechnung (die steht in pod_auswahl_plan.mjs).
 *
 * Auftrag des Besitzers (27.10.2026, drei Screenshots): Poster hat nur «Grösse» (er will MATERIAL), die Handyhülle nur iPhone-Modelle (er will auch Samsung),
 * der Hoodie nur «Grösse» (er will MATERIAL «mit Preis» und «alle anderen Produkte auch zur Auswahl»). Druckpartner ist PRINTFUL.
 *
 * Regeln:
 *   • Vorhandene Varianten werden NIE geändert oder gelöscht (SKU, Preis, ID bleiben). Es kommen nur eine Option «Material» (Position 1) und neue Varianten dazu.
 *   • SKU neuer Varianten: «<skuPraefix>_<Printful-Katalog-Variantennummer>» (printful_sync decodiert die Zahl hinter dem letzten «_»).
 *   • Jede Printful-Nummer steht entweder ausdrücklich hier (Poster) oder wird aus dem Printful-Katalog gelesen (Farbe/Grösse bzw. Modell). Was der Katalog nicht belegt, entfällt.
 *   • textKonflikte: Aussagen im TITEL oder im Haupttext AUSSERHALB des Blocks, die nicht für alle neuen Materialien stimmen (Titel/Text werden NICHT angefasst, harte Regel
 *     «Beschreibung nur zwischen den Kommentarmarken ändern»). Der Plan sucht die Stellen frisch im Shop-Text und meldet sie als Befund mit wörtlichem Zitat:
 *     schwere 'blocker' sperrt LIVE für dieses Produkt, bis der Besitzer entschieden hat (BEFUND_OK=<handle>:<code>), 'hinweis' wird nur gemeldet.
 *     `muster` ist ein regulärer Ausdruck (ohne Gross-/Kleinschreibung) auf den Titel bzw. den KLARTEXT des Haupttextes (ohne HTML); `gilt` = Materialien, für die die Aussage stimmt.
 *   • Texte («Materialien im Vergleich»): jede Angabe trägt einen Beleg (Produktnummer + Textstelle der englischen Printful-Beschreibung); der Test prüft, dass die
 *     Textstelle wirklich in /tmp/pod/beschreibungen.json (hier: dropship/pod-auswahl/beschreibungen.json) steht und jede Zahl im deutschen Text im Beleg vorkommt.
 */

/** Marker für die Idempotenz: nur zwischen diesen Kommentaren wird die Beschreibung angefasst. */
export const MARKE_AUF = '<!-- lx-material-v1 -->';
export const MARKE_ZU = '<!-- /lx-material-v1 -->';

const Z = (p, z, feld = 'desc', extra = {}) => ({ p, z, feld, ...extra });   // Beleg: Printful-Produkt, wörtliche Textstelle (Englisch), Feld der Beschreibungsdatei; extra: { fehlt, vergleichMit } für «ohne …»-Angaben (siehe Test)
const F = (t, b) => ({ t, b });                         // Angabe: deutscher Text + Beleg

export const OPTION_MATERIAL = Object.freeze({ name: 'Material', position: 1 });

export const SPEC = [
  // ───────────────────────────────────────────────────────────────────────────── 1. Poster
  {
    handle: 'poster-zum-selbstgestalten', art: 'erweitern', skuPraefix: '9000001', zweiteOption: 'Grösse',
    bestand: { wert: 'Poster matt', printfulProdukt: 268 },
    materialien: [
      { wert: 'Poster matt', bestand: true, printfulProdukt: 268 },
      { wert: 'Foto-Glanzpapier', printfulProdukt: 171, zuordnung: { art: 'zeilen', zeilen: [['30×40 cm', 6875], ['50×70 cm', 48863], ['A2 (42×59,4 cm)', 19526]] } },
      // 70×100 cm ≙ 28″×40″ (71×102 cm): Nummer 19321 stammt aus der Versandmessung des Besitzers («Leinwand 28×40 Zoll») und liegt im Katalog 3. Entfällt, wenn der Preis über 149.90 läge.
      { wert: 'Leinwand', printfulProdukt: 3, zuordnung: { art: 'zeilen', zeilen: [['30×40 cm', 5], ['50×70 cm', 19310], ['70×100 cm', 19321]], abgeleitet: ['70×100 cm'] } },
      { wert: 'Gerahmt · Schwarz', printfulProdukt: 304, zuordnung: { art: 'zeilen', zeilen: [['30×40 cm', 9357], ['50×70 cm', 9358], ['A2 (42×59,4 cm)', 19643]] } },
      { wert: 'Gerahmt · Weiss', printfulProdukt: 304, zuordnung: { art: 'zeilen', zeilen: [['30×40 cm', 10297], ['50×70 cm', 10298], ['A2 (42×59,4 cm)', 19648]] } },
      { wert: 'Gerahmt · Eiche', printfulProdukt: 304, zuordnung: { art: 'zeilen', zeilen: [['30×40 cm', 11791], ['50×70 cm', 11792], ['A2 (42×59,4 cm)', 19653]] } },
    ],
    textKonflikte: [
      { code: 'text-ausserhalb-block', schwere: 'hinweis',
        stellen: [
          { muster: 'Mattes Premium-Papier', gilt: ['Poster matt', 'Gerahmt · Schwarz', 'Gerahmt · Weiss', 'Gerahmt · Eiche'] },
          { muster: 'Premium-Matt-Papier, randlos bedruckt', gilt: ['Poster matt'] },
          { muster: 'Mehrere Grössen \\(30×40 bis 70×100 cm\\)', gilt: ['Poster matt', 'Leinwand'] },
        ],
        problem: 'Der Haupttext beschreibt das Material «Poster matt» (Papier, Randlosigkeit, Grössenbereich). Für Foto-Glanzpapier, Leinwand und Rahmen stimmt er nicht oder nur teilweise.',
        vorschlag: 'Text materialneutral fassen («Premium-Kunstdruck in mehreren Materialien und Grössen») und Papier, Randlosigkeit und Grössen nur im Block «Materialien im Vergleich» nennen.' },
    ],
    zollMasse: ['Foto-Glanzpapier', 'Leinwand'],   // diese Materialien sind in Zoll bestellbar: der Materialtext nennt «12×16″ ≈ 30×40 cm» (Katalogbezeichnung ↔ Grösse im Shop)
    vergleich: [
      { werte: ['Poster matt'], fakten: [
        F('dickes, mattes Papier', Z(268, 'thick matte paper')),
        F('Papierstärke 0,26 mm', Z(268, 'Paper thickness: 0.26 mm')),
        F('Papiergewicht 189 g/m²', Z(268, 'Paper weight: 189 g/m²')),
        F('Papier aus Japan', Z(268, 'Paper sourced from Japan')),
      ] },
      { werte: ['Foto-Glanzpapier'], fakten: [
        F('Fotopapier mit teils glänzender, teils matter Oberfläche', Z(171, 'partly glossy, partly matte finish')),
        F('0,25 mm dick', Z(171, '10 mil (0.25 mm) thick')),
        F('fingerabdruckresistent', Z(171, 'Fingerprint resistant')),
        F('Papier aus Japan', Z(171, 'Paper sourced from Japan')),
      ] },
      { werte: ['Leinwand'], fakten: [
        F('Poly-Baumwoll-Mischgewebe; Leinwand insgesamt 3,18 cm (1,25″) dick', Z(3, '1.25″ (3.18 cm) thick poly-cotton blend canvas')),
        F('Stoffgewicht 344 g/m² (± 25 g/m²)', Z(3, '(344 g/m² +/- 25g/m²)')),
        F('verblassungsresistent', Z(3, 'Fade-resistant')),
        F('von Hand über Massivholz-Keilrahmen gespannt', Z(3, 'Hand-stretched over solid wood stretcher bars')),
        F('Aufhänger inklusive', Z(3, 'Mounting brackets included')),
      ] },
      { werte: ['Gerahmt · Schwarz', 'Gerahmt · Weiss'], fakten: [
        F('Druck auf dickem, mattem Papier', Z(304, 'Printed on quality, thick, matte paper')),
        F('Papiergewicht 189 g/m²', Z(304, 'Paper weight: 189 g/m²')),
        F('Papierstärke 0,26 mm', Z(304, '0.26 mm (10.3 mil) thick')),
        F('Rahmen aus Erle (Halbhartholz)', Z(304, 'Black and white frame made from semi-hardwood alder')),
        F('Frontschutz aus Acrylite', Z(304, 'Acrylite front protector')),
        F('Aufhängematerial inklusive', Z(304, 'Hanging hardware included')),
      ] },
      { werte: ['Gerahmt · Eiche'], fakten: [
        F('Druck auf dickem, mattem Papier', Z(304, 'Printed on quality, thick, matte paper')),
        F('Papiergewicht 189 g/m²', Z(304, 'Paper weight: 189 g/m²')),
        F('Papierstärke 0,26 mm', Z(304, '0.26 mm (10.3 mil) thick')),
        F('Rahmen aus massiver Eiche', Z(304, 'Oak frame made from solid oak')),
        F('Frontschutz aus Acrylite', Z(304, 'Acrylite front protector')),
        F('Aufhängematerial inklusive', Z(304, 'Hanging hardware included')),
      ] },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────── 2. Hoodie
  {
    handle: 'unisex-hoodie-selbst-gestalten', art: 'erweitern', skuPraefix: '1726823', zweiteOption: 'Grösse',
    // Der Besitzer nennt «Gildan 18500» (Hoodie, Printful 146). GEMESSEN am 27.10.2026 (GET /products/variant/5426): die vorhandenen SKUs 5426–5433 sind
    // Printful-Produkt 145 «Unisex Crew Neck Sweatshirt | Gildan 18000» (White), also ein Sweatshirt OHNE Kapuze. Das ist ein Befund (siehe Plan), keine Änderung.
    bestand: { wert: 'Baumwoll-Mix', printfulProdukt: 146, farbe: 'White', erwartet: 'Hoodie Gildan 18500' },
    textKonflikte: [
      { code: 'text-ausserhalb-block', schwere: 'hinweis',
        stellen: [
          { muster: 'Ein robustes und warmes Sweatshirt', gilt: ['Baumwoll-Mix'] },
          { muster: '50 % Baumwolle, 50 % Polyester', gilt: ['Baumwoll-Mix'] },
          { muster: 'Material: Baumwolle, Polyester, Elastan', gilt: ['Baumwoll-Mix'] },
        ],
        problem: 'Der Haupttext beschreibt das Rundhals-Sweatshirt (Material «Baumwoll-Mix», Printful 145). Premium-Baumwolle (100 % Baumwolle aussen) und Bio-Baumwolle (85 % Bio-Baumwolle, 15 % Polyester) sind Kapuzenpullover mit anderer Zusammensetzung.',
        vorschlag: 'Text materialneutral fassen (Zusammensetzung nur im Block «Materialien im Vergleich» nennen), «Material» in den Produktdetails auf «je nach Auswahl» stellen.' },
    ],
    materialien: [
      { wert: 'Baumwoll-Mix', bestand: true, printfulProdukt: 146 },
      { wert: 'Premium-Baumwolle', printfulProdukt: 380, zuordnung: { art: 'farbeGroesse', farbe: 'White' } },
      { wert: 'Bio-Baumwolle', printfulProdukt: 821, zuordnung: { art: 'farbeGroesse', farbe: 'White' } },
    ],
    vergleich: [
      // Beleg für «Baumwoll-Mix» ist das Printful-Produkt, auf das die vorhandenen SKUs WIRKLICH zeigen (145), nicht das genannte (146).
      { werte: ['Baumwoll-Mix'], fakten: [
        F('50 % Baumwolle, 50 % Polyester', Z(145, '50% cotton, 50% polyester')),
        F('Rundhals-Sweatshirt (Crew Neck)', Z(145, 'Crew Neck Sweatshirt', 'title')),
        F('vorgeschrumpft', Z(145, 'Pre-shrunk')),
        F('klassische Passform', Z(145, 'Classic fit')),
        F('Weiss kann eher cremefarben als hellweiss wirken', Z(145, 'the White color variant may appear off-white rather than bright white')),
      ] },
      { werte: ['Premium-Baumwolle'], fakten: [
        // Die Quelle nennt zwei Zeilen untereinander und sagt nicht, wofür die zweite gilt. Darum EINE Angabe, die beides wörtlich und ohne Zuordnung wiedergibt.
        F('Stoff laut Hersteller: Aussenseite 100 % Baumwolle; zusätzlich ohne Zuordnung genannt: 65 % ringgesponnene Baumwolle, 35 % Polyester', Z(380, '100% cotton face • 65% ring-spun cotton, 35% polyester')),
        F('Kapuzenpullover (Pullover Hoodie)', Z(380, 'Pullover Hoodie', 'title')),
        F('Kängurutasche vorne', Z(380, 'Front pouch pocket')),
        F('3-teilige Kapuze', Z(380, '3-panel hood')),
        F('fällt klein aus: bei diesem Material eine Grösse grösser bestellen', Z(380, 'This hoodie runs small. For the perfect fit, we recommend ordering one size larger than your usual size.')),
      ] },
      { werte: ['Bio-Baumwolle'], fakten: [
        F('85 % Bio-Baumwolle (gekämmt, ringgesponnen), 15 % recyceltes Polyester (Produktion in Europa)', Z(821, '85% organic combed ring-spun cotton, 15% recycled polyester for production in Europe')),
        F('mittelschwerer Stoff', Z(821, 'Mid-weight fabric')),
        F('Halbmond-Detail auf dem Rücken', Z(821, 'Half-moon detail on the back')),
        F('Bio-Baumwolle nach GOTS und OCS zertifiziert', Z(821, 'holds certifications for its organic cotton content under GOTS (Global Organic Textile Standard) and OCS (Organic Content Standard)')),
        F('Recyclinganteil nach GRS zertifiziert', Z(821, 'GRS (Global Recycled Standard) certifies the recycled content')),
        F('fällt in Europa eine Grösse grösser aus: bei diesem Material eine Grösse kleiner bestellen', Z(821, 'The sizes correspond to a bigger size in the European market, customers from that region should order a size down.')),
      ] },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────── 3. T-Shirt
  {
    handle: 'unisex-t-shirt-selbst-gestalten', art: 'erweitern', skuPraefix: '5599797', zweiteOption: 'Grösse',
    bestand: { wert: 'Ringgarn-Baumwolle', printfulProdukt: 71, farbe: 'White' },
    textKonflikte: [
      { code: 'text-ausserhalb-block', schwere: 'hinweis',
        stellen: [
          { muster: '100 % gekämmte und ringgesponnene Baumwolle', gilt: ['Ringgarn-Baumwolle'] },
          { muster: 'Stoffgewicht: 142 g/m²', gilt: ['Ringgarn-Baumwolle'] },
          { muster: 'Vorgewaschener Stoff', gilt: ['Ringgarn-Baumwolle'] },
          { muster: 'Der Stoff ist leicht transparent', gilt: ['Ringgarn-Baumwolle'] },
          { muster: 'Material: Baumwolle, Polyester', gilt: [] },
        ],
        problem: 'Der Haupttext beschreibt das Material «Ringgarn-Baumwolle» (142 g/m², leicht durchscheinend). Der Block nennt für Bio 180 g/m² und für Heavyweight 206,8 g/m²; «Polyester» in den Produktdetails trifft für keines der vier Materialien in Weiss zu.',
        vorschlag: 'Text materialneutral fassen (Gewicht und Zusammensetzung nur im Block «Materialien im Vergleich» nennen), «Material» in den Produktdetails auf «Baumwolle (je nach Auswahl)» stellen.' },
    ],
    materialien: [
      { wert: 'Ringgarn-Baumwolle', bestand: true, printfulProdukt: 71 },
      { wert: 'Klassische Baumwolle', printfulProdukt: 438, zuordnung: { art: 'farbeGroesse', farbe: 'White' } },
      { wert: 'Bio-Baumwolle', printfulProdukt: 456, zuordnung: { art: 'farbeGroesse', farbe: 'White' } },
      { wert: 'Heavyweight-Baumwolle', printfulProdukt: 586, zuordnung: { art: 'farbeGroesse', farbe: 'White' } },
    ],
    vergleich: [
      { werte: ['Ringgarn-Baumwolle'], fakten: [
        F('100 % gekämmte, ringgesponnene Baumwolle (Heather-Farben enthalten Polyester)', Z(71, '100% combed and ring-spun cotton (Heather colors contain polyester)')),
        F('Stoffgewicht 142 g/m²', Z(71, '142 g/m²')),
        F('vorgeschrumpfter Stoff', Z(71, 'Pre-shrunk fabric')),
        F('leicht durchscheinend, vor allem bei hellen Farben', Z(71, 'The fabric is slightly sheer and may appear see-through, especially in lighter colors')),
      ] },
      { werte: ['Klassische Baumwolle'], fakten: [
        F('100 % Baumwolle', Z(438, '100% cotton')),
        F('Stoffgewicht 170–180 g/m²', Z(438, '170-180 g/m²')),
        F('offenes Garn (Open-End)', Z(438, 'Open-end yarn')),
        F('Schlauchgewebe', Z(438, 'Tubular fabric')),
        F('Weiss kann eher cremeweiss als strahlend weiss wirken', Z(438, 'the White color variant may appear off-white rather than bright white')),
      ] },
      { werte: ['Bio-Baumwolle'], fakten: [
        F('100 % Bio-Baumwolle, ringgesponnen', Z(456, '100% organic ring-spun cotton')),
        F('Stoffgewicht 180 g/m²', Z(456, '180 g/m²')),
        F('Single Jersey', Z(456, 'Single jersey')),
        F('Bio-Baumwolle nach GOTS und OCS zertifiziert', Z(456, 'holds certifications for its organic cotton content under GOTS (Global Organic Textile Standard) and OCS (Organic Content Standard)')),
        F('Stoff nach OEKO-TEX® STANDARD 100 zertifiziert', Z(456, 'certified according to OEKO-TEX® STANDARD 100')),
        F('PETA-Approved Vegan', Z(456, 'PETA-Approved Vegan')),
      ] },
      { werte: ['Heavyweight-Baumwolle'], fakten: [
        F('100 % ringgesponnene Baumwolle', Z(586, '100% ring-spun cotton')),
        F('Stoffgewicht 206,8 g/m²', Z(586, '206.8 g/m²')),
        F('stückgefärbt (Garment-Dyed)', Z(586, 'Garment-dyed')),
        F('entspannte Passform', Z(586, 'Relaxed fit')),
        F('Hals und Schultern mit Twill-Band verstärkt', Z(586, 'Twill-taped neck and shoulders')),
      ] },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────── 4. iPhone-Hülle
  {
    handle: 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', art: 'erweitern', skuPraefix: '3615382', zweiteOption: 'Handymodell',
    bestand: { wert: 'Hartschale MagSafe', printfulProdukt: 798, finish: 'Matte' },
    textKonflikte: [
      // FEHLKAUF-RISIKO: bei personalisierter Ware ist die Rückgabe ausgeschlossen (ls-pod-retoure). Wer wegen «MagSafe» im Titel eine «Hartschale» oder «Klare Hülle» wählt, bekommt eine Hülle ohne MagSafe-Magnete.
      { code: 'magsafe-irrefuehrend', schwere: 'blocker',
        stellen: [ { muster: 'MagSafe', gilt: ['Hartschale MagSafe'] } ],
        problem: 'Titel und Haupttext versprechen MagSafe®, aber nur das Material «Hartschale MagSafe» hat die Magnete; «Hartschale» (Printful 601) und «Klare Hülle» (Printful 181) haben keine. Rückgabe ist bei personalisierter Ware ausgeschlossen, ein Fehlkauf wäre nicht rückgängig zu machen.',
        vorschlag: 'Vor LIVE einen der drei Wege wählen: (1) Titel und Fliesstext entmagsafen und MagSafe® nur beim Material «Hartschale MagSafe» nennen (Titel und Text von Hand ändern, danach verschwindet dieser Befund von selbst); (2) die Materialien «Hartschale» und «Klare Hülle» nicht anbieten (OHNE=<handle>:Hartschale,<handle>:Klare Hülle); (3) statt «Klare Hülle» (181) die MagSafe®-Klarhülle (Printful 799, gleiche Modelle) nehmen – das braucht eine Änderung der Spezifikation. Die Materialtexte im Block sagen bei «Hartschale» und «Klare Hülle» schon ausdrücklich «ohne MagSafe®-Magnete».' },
      { code: 'text-ausserhalb-block', schwere: 'hinweis',
        stellen: [ { muster: 'Mattes oder glänzendes Finish', gilt: [] } ],
        problem: 'Alle Varianten sind matt («Hartschale MagSafe», «Hartschale») oder klar («Klare Hülle»); ein glänzendes Finish gibt es hier nicht.',
        vorschlag: 'Satz streichen oder «Mattes Finish» schreiben.' },
    ],
    materialien: [
      { wert: 'Hartschale MagSafe', bestand: true, printfulProdukt: 798 },
      // «Hartschale»: Printful 601 Tough Case, MATTE vorhanden (29 Modelle) → matt, passend zur vorhandenen matten MagSafe-Variante
      { wert: 'Hartschale', printfulProdukt: 601, zuordnung: { art: 'modell', finish: 'Matte' } },
      { wert: 'Klare Hülle', printfulProdukt: 181, zuordnung: { art: 'modell' } },
    ],
    vergleich: [
      { werte: ['Hartschale MagSafe'], fakten: [
        F('eingebaute MagSafe®-Magnete', Z(798, 'built-in MagSafe® magnets')),
        F('Aussenschale aus Polycarbonat', Z(798, 'Polycarbonate outer shell')),
        F('Innenfutter aus thermoplastischem Polyurethan (TPU)', Z(798, 'Thermoplastic Polyurethane inner liner')),
        F('zweischichtiger Schutz', Z(798, 'Dual-layer protection')),
        F('MagSafe®-kompatibel', Z(798, 'MagSafe® compatible')),
        F('Induktionsladen möglich', Z(798, 'Induction charging-compatible')),
      ] },
      { werte: ['Hartschale'], fakten: [
        // «ohne MagSafe»: die Beschreibung von 601 nennt MagSafe® nirgends, der Hersteller führt die MagSafe®-Ausführung als eigenes Produkt (798, Titel mit «MagSafe»). Der Test prüft beides.
        F('ohne MagSafe®-Magnete (MagSafe® gibt es nur beim Material «Hartschale MagSafe»)', Z(601, 'Tough Case for iPhone®', 'title', { fehlt: 'MagSafe', vergleichMit: 798 })),
        F('Aussenschale aus schlagfestem Polycarbonat', Z(601, 'impact-resistant polycarbonate')),
        F('Innenfutter aus thermoplastischem Polyurethan (TPU)', Z(601, 'Thermoplastic Polyurethane TPU inner liner')),
        F('zweischichtiger Schutz', Z(601, 'Dual-layer protection')),
        F('Induktionsladen möglich', Z(601, 'Induction charging compatible')),
      ] },
      { werte: ['Klare Hülle'], fakten: [
        // wie oben: 181 nennt MagSafe® nirgends; die MagSafe®-Klarhülle ist beim Hersteller ein eigenes Produkt (799)
        F('ohne MagSafe®-Magnete (MagSafe® gibt es nur beim Material «Hartschale MagSafe»)', Z(181, 'Clear Case for iPhone®', 'title', { fehlt: 'MagSafe', vergleichMit: 799 })),
        F('feste Rückseite aus Polycarbonat', Z(181, 'Solid polycarbonate back')),
        F('flexible, durchsichtige Seiten aus Polyurethan', Z(181, 'Flexible, see-through polyurethane sides')),
        F('0,5 mm erhöhter Rand', Z(181, '.5 mm raised bezel')),
        F('kabelloses Laden möglich', Z(181, 'Wireless charging compatible')),
        F('kann innen eine Schutzfolie enthalten, die vor dem Gebrauch entfernt werden muss', Z(181, 'The case may include a protective film on the inside that needs to be removed before use.')),
      ] },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────── 5. Samsung-Hülle (NEU, DRAFT)
  {
    handle: 'samsung-huelle-selbst-gestalten', art: 'neu', skuPraefix: '9000001', zweiteOption: 'Handymodell',
    vorlage: 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten',   // Struktur (Texte, Editor-Baustein, Tags, Metafelder) wird vom iPhone-Produkt übernommen
    titel: 'Samsung-Hülle selbst gestalten',
    produktart: 'Handy-Zubehör',
    // «Tags wie beim iPhone-Produkt»: übernommen ausser «bild-ok» (Stempel der Bildprüfung, die für dieses Produkt noch nicht lief) und «sort-handy-halterungen»
    // (die Sammlung «Halterungen & MagSafe» gehört wegen MagSafe zur iPhone-Hülle; Samsung-Hüllen haben kein MagSafe).
    tags: ['huelle', 'natel', 'printful_personalized_product', 'samsung', 'sg-accessoires', 'sort-handy-huellen', 'wunschdesign'],
    maxVarianten: 100,
    modelle: { quellen: [686, 267, 684] },                            // Vereinigung der lieferbaren Modelle aus den drei Katalogen
    // Printful-Katalogbilder (HTTP 200 am 27.10.2026 gemessen), je Ausführung eines. Die Hartschale hat nur EIN Bild: «matt» (686/21474) und «glänzend» (686/21473) sind
    // byte-identisch (md5 40a33932fc6a72b8dc93722d5c7de61e, je 31 841 Byte, gemessen 27.10.2026); zwei Medien mit den Alt-Texten «matt» und «glänzend» behaupteten etwas, das das Bild nicht zeigt.
    bilder: [
      { url: 'https://files.cdn.printful.com/products/686/21474_1737960312.jpg', alt: 'Samsung-Hülle Hartschale – blanko, selbst gestalten – LuxeStyle' },
      { url: 'https://files.cdn.printful.com/products/267/21483_1738053270.jpg', alt: 'Samsung-Hülle klar – blanko, selbst gestalten – LuxeStyle' },
      { url: 'https://files.cdn.printful.com/products/684/21480_1738586483.jpg', alt: 'Samsung-Hülle Slim – blanko, selbst gestalten – LuxeStyle' },
    ],
    // Metafelder wie beim iPhone-Produkt (gelesen am 27.10.2026): Lieferzeit «pod», Google-Kategorie Handyhüllen, gender/age.
    // «material» ist EIN Wert für vier Ausführungen (Merchant-Attribut UND Zeile «Material» in den Produktdetails): nur, was für ALLE vier belegt ist. Polycarbonat (PC) steht bei allen
    // vier in den Printful-Beschreibungen (686, 267, 684); das Innenfutter aus Polyurethan (TPU) nur bei der Hartschale (686). Darum nennt der Wert das TPU ausdrücklich nur dort.
    metafelder: [
      { namespace: 'custom', key: 'lieferzeit', type: 'json', value: JSON.stringify({ ch: '7–14', tier: 'pod', weg: 'Druck auf Bestellung' }) },
      { namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new' },
      { namespace: 'mm-google-shopping', key: 'custom_product', type: 'boolean', value: 'true' },
      { namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult' },
      { namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex' },
      { namespace: 'mm-google-shopping', key: 'google_product_category', type: 'single_line_text_field', value: 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases' },
      { namespace: 'mm-google-shopping', key: 'material', type: 'single_line_text_field', value: 'Polycarbonat (PC), bei der Hartschale mit Innenfutter aus Polyurethan (TPU)' },
      // global.title_tag / global.description_tag setzt Shopify aus `seo` (siehe unten) – nicht doppelt als Metafeld schreiben
    ],
    category: 'gid://shopify/TaxonomyCategory/el-4-8-4-2',            // wie beim iPhone-Produkt (Mobile Phone Cases)
    seo: { title: 'Samsung-Hülle selbst gestalten | LuxeStyle CH', description: 'Samsung-Hülle selbst gestalten bei LuxeStyle: Hartschale, klare Hülle oder Slim-Hülle mit deinem Foto oder Motiv. Gratis-Versand ab CHF 50.' },
    materialien: [
      { wert: 'Hartschale matt', printfulProdukt: 686, zuordnung: { art: 'modell', finish: 'Matte' } },
      { wert: 'Hartschale glänzend', printfulProdukt: 686, zuordnung: { art: 'modell', finish: 'Glossy' } },
      { wert: 'Klare Hülle', printfulProdukt: 267, zuordnung: { art: 'modell' } },
      // Slim-Hülle: Printful 684 gibt es matt UND glänzend. Beide ergäben 104 Varianten (> 100): darum nur matt, passend zur Hartschale matt.
      { wert: 'Slim-Hülle', printfulProdukt: 684, zuordnung: { art: 'modell', finish: 'Matte' } },
    ],
    vergleich: [
      { werte: ['Hartschale matt', 'Hartschale glänzend'], fakten: [
        F('Aussenschale aus Polycarbonat (PC)', Z(686, 'Outer shell: Polycarbonate (PC)')),
        F('Innenfutter aus Polyurethan (TPU)', Z(686, 'Liner: Polyurethane (TPU)')),
        F('zweilagiger Aufbau für zusätzliche Robustheit', Z(686, 'dual-layer design')),
        F('Induktionsladen möglich', Z(686, 'Induction charger compatible')),
      ] },
      { werte: ['Klare Hülle'], fakten: [
        F('feste Rückseite aus Polycarbonat', Z(267, 'Solid polycarbonate back')),
        F('durchsichtige Seiten', Z(267, 'See-through sides')),
        F('0,5 mm erhöhter Rand', Z(267, '0.02″ (0.5 mm) raised bezel')),
        F('kabelloses Laden möglich', Z(267, 'Wireless charging compatible')),
        F('leicht auf- und abzunehmen', Z(267, 'Easy to take on and off')),
      ] },
      { werte: ['Slim-Hülle'], fakten: [
        F('aus Polycarbonat (PC)', Z(684, 'Made of polycarbonate (PC) material')),
        F('schlankes, leichtes Design', Z(684, 'slim and lightweight design')),
        F('kabelloses Laden möglich', Z(684, 'Wireless charging compatible')),
        F('von Flüssigkeiten mit hohem Alkoholgehalt fernhalten, sonst kann sich das Motiv abreiben', Z(684, 'Keep away from liquids containing high alcohol levels, as designs on the phone case may rub off.')),
        F('direkte Sonneneinstrahlung vermeiden, damit die Hülle nicht vergilbt', Z(684, 'Keep away from direct sunlight to prevent yellowing.')),
      ] },
    ],
  },
];

/** Printful-Produkte, deren Beschreibung als Beleg dient, ohne im Katalog zu stehen (vorhandene SKUs zeigen darauf). */
export const ZUSATZ_BELEGE = Object.freeze([145]);
