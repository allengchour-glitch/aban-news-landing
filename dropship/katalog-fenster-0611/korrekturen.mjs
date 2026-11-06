// Korrekturen aus der Abnahme vom 06.11.2026 (drei unabhängige Prüfer) auf den gemeinsamen Stand «nur bestellbar + deutsche Texte».
// Sie liegen als EINE eigene Stufe in diesem Paket (kombi.mjs wendet sie nach (A) und (B) an): die Ordner katalog-nur-bestellbar-0511 und katalog-texte-de-0611 bleiben unverändert.
// Jede Ersetzung muss GENAU EINMAL vorkommen (kombi.mjs: einmal()), sonst bricht der Bau mit Datei, Nummer und Ankeranfang ab. Die Kommentare im Code tragen die Marke LX-KATALOGTEXTE-0511
// (keine neue Marke: die Rücknahme erkennt unseren Code an den bestehenden Marken).
//
// Inhalt (Nummer = Fund der Abnahme):
//   K1  deutsche Modelltitel für alle Modelle mit Shopprodukt (Karten, Dialog, Suche); Suchwörter kappe/pullover/beutel/bio/hülle
//   K2  Farbnamen deutsch (Glänzend, Matt, Sand, Zartrosa, Zartgrün, Naturstein); der Satz «Basisfarbe …» entfällt bei Oberflächen (Matt/Glänzend sind keine Farben)
//   K3  umgerechnete Zentimeter-Grössen höchstens eine Nachkommastelle, ab 10 cm ganze Zentimeter (wie titleCm bei den Titeln)
//   K4  Rückfallsätze im Code für die neuen Etiketten von (A) (neues JS mit altem Dokument zeigte «reload_needed» als Rohschlüssel)
//   K5  Sortierung «Meiste Ausführungen» zählt die bestellbaren Ausführungen (vorher die Hersteller-Gesamtzahl), Etikett in de/en/fr angepasst
//   K6  sortSizes als totale Ordnung (Kleidergrössen, dann Volumen, dann Masse nach Zahl, dann Text); vorher mischten sich iPhone-/Samsung-Modelle und Masse
//   K7  langsame Textdatei: nach dem ersten Zeitüberschreiten nicht bei jedem Öffnen erneut 2,5 s warten; trifft die Datei ein, wird die offene Detailansicht einmal neu gezeichnet
//   K8  Kategoriename «T-shirts» → «T-Shirts» (im Code, wie colorFallback: die Sektion zählt die Kategorienamen einzeln auf, ein neuer Schlüssel in de.json käme nie im Dokument an)
export const KORREKTUR_MARKE = 'LX-KATALOGTEXTE-0511';

// ---------- K1: deutsche Titel (Schlüssel = Printful-Modellnummer). Marken- und Modellnummern bleiben, wie im Katalogtitel. Stand: die 22 heute bestellbaren Modelle und die 15 weiteren Modelle,
// zu denen der Shop Angebote kennt (Entwürfe/ausverkauft). Modelle ohne Eintrag zeigen den Originaltitel (wie bisher). ----------
export const TITEL_DE = {
  3: 'Leinwand',
  19: 'Keramik-Tasse, weiss glänzend',
  71: 'Unisex-T-Shirt Staple | Bella + Canvas 3001',
  83: 'Kissen mit Allover-Druck',
  84: 'Stoffbeutel mit Allover-Druck',
  145: 'Unisex-Sweatshirt mit Rundhalsausschnitt | Gildan 18000',
  171: 'Premium-Fotoposter auf Luster-Papier',
  181: 'Transparente Hülle für iPhone®',
  206: 'Klassische Dad-Cap | Yupoong 6245CM',
  242: 'Yoga-Leggings mit Allover-Druck',
  267: 'Transparente Hülle für Samsung®',
  268: 'Poster auf mattem Premium-Papier',
  272: 'Badeanzug mit Allover-Druck',
  279: 'Rucksack mit Allover-Druck',
  282: 'Sport-BH mit Allover-Druck',
  304: 'Gerahmtes Poster auf mattem Premium-Papier',
  320: 'Unisex-Sweatshirt aus Recyclingmaterial mit Allover-Druck',
  358: 'Kiss-Cut-Aufkleber',
  367: 'Öko-Stoffbeutel | Econscious EC8000',
  388: 'Unisex-Hoodie aus Recyclingmaterial mit Allover-Druck',
  390: 'Unisex-Bomberjacke mit Allover-Druck',
  400: 'Herren-Jogginghose aus Recyclingmaterial mit Allover-Druck',
  438: 'Klassisches Unisex-T-Shirt | Gildan 5000',
  456: 'Unisex-Bio-Baumwoll-T-Shirt Creator 2.0 | Stanley/Stella STTU169',
  474: 'Spiral-Notizbuch',
  518: 'Mauspad',
  586: 'Schweres Unisex-T-Shirt, stückgefärbt | Comfort Colors 1717',
  601: 'Robuste Hülle für iPhone® (Tough Case)',
  656: 'Magnete mit Konturschnitt',
  684: 'Schlanke Snap-Hülle für Samsung',
  686: 'Robuste Hülle für Samsung (Tough Case)',
  788: 'Trinkflasche aus Edelstahl mit Strohhalm-Deckel',
  798: 'Robuste MagSafe-Hülle für iPhone® (Tough Case)',
  821: 'Unisex-Bio-Hoodie, mittelschwer, Drummer 2.0 | Stanley/Stella SASU009',
  896: 'Slip-Kleid mit Allover-Druck',
  1483: 'Herren-Boardshorts mit Allover-Druck',
  1552: 'Alltags-Umhängetasche | QS309',
};

// ---------- Sprachdateien: die einzigen Änderungen dieser Stufe an den Sprachdateien (die Tests rechnen sie ein) ----------
export const KORREKTUR_SCHLUESSEL = {
  de: { sort_variants: 'Meiste Ausführungen' },
  en: { sort_variants: 'Most variants' },
  fr: { sort_variants: 'Le plus de versions' },
};
export const KORREKTUR_KATEGORIEN_DE = { t_shirts: 'T-Shirts' }; // Rückfall im Code für Kategorienamen, die category_names der Sprachdatei nicht kennt (die Sektion zählt die Schlüssel einzeln auf)

const JS = 'assets/luxe-clothing.js', DE = 'locales/de.json', EN = 'locales/en.default.json', FR = 'locales/fr.json';

// fallbackDe: {Schlüssel: deutscher Text} der Etiketten von (A), die der Code selbst aufruft (aus A.TEXTE.de, siehe kombi.mjs)
export function korrekturPaare(fallbackDe) {
  const K = `/* ${KORREKTUR_MARKE} (Korrektur 06.11.2026): `;
  const P = [];
  const add = (datei, name, alt, neu) => P.push({ datei, nr: P.length + 1, name, alt, neu });

  // K6
  add(JS, 'K6 sortSizes',
    "  const sortSizes = (a,b) => { const x=sizeOrder.indexOf(a), y=sizeOrder.indexOf(b); return x>=0 && y>=0 ? x-y : a.localeCompare(b,undefined,{numeric:true}); };",
    "  " + K + "totale Ordnung: Kleidergrössen in ihrer Reihenfolge, dann Volumen (oz/ml), dann Masse nach der ersten Zahl, dann Text; vorher mischte der Vergleich Gruppen und war nicht transitiv */\n" +
    "  const sizeRank = s => { const i=sizeOrder.indexOf(s); if(i>=0) return [0,i]; const m=/^\\s*(\\d+(?:[.,]\\d+)?)/.exec(s); if(!m) return [3,0]; const n=parseFloat(m[1].replace(',','.')); return /\\b(?:oz|ml)\\b/i.test(s) ? [1,/\\boz\\b/i.test(s)?n*29.5735:n] : [2,n]; };\n" +
    "  const sortSizes = (a,b) => { const x=sizeRank(a), y=sizeRank(b); return x[0]-y[0] || x[1]-y[1] || String(a).localeCompare(String(b),undefined,{numeric:true}); };");

  // K4: Rückfallsätze (nur deutsche Seite); ohne Eintrag bleibt der Schlüsselname wie bisher
  add(JS, 'K4 t() mit Rückfallsätzen',
    "    const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`[${name}]`, String(value)), string(labels[key]) || key);",
    "    " + K + "Rückfallsätze für die Etiketten von (A): ein neues JS mit einem alten (zwischengespeicherten) Dokument zeigte sonst den Rohschlüssel, z. B. «reload_needed» */\n" +
    "    const lxFallbackDe = " + JSON.stringify(fallbackDe) + ";\n" +
    "    const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`[${name}]`, String(value)), string(labels[key]) || (german ? lxFallbackDe[key] : '') || key);");

  // K3: Rundung der umgerechneten Zentimeter
  add(JS, 'K3 roundCm definieren',
    "    const metricTitle = value => metricText(value).replace(/\\(\\s*in\\s*\\)(?=\\s*(?:$|\\|))/gi,'(cm)');\n",
    "    const metricTitle = value => metricText(value).replace(/\\(\\s*in\\s*\\)(?=\\s*(?:$|\\|))/gi,'(cm)');\n" +
    "    " + K + "umgerechnete Zentimeter höchstens eine Nachkommastelle, ab 10 cm ganze Zentimeter (7,62 → 7,6 · 13,97 → 14 · 38,1 → 38); nur deutsche Seite, nur Mass-Gruppen mit «cm» */\n" +
    "    const roundCm = text => german ? string(text).replace(/\\d+(?:,\\d+)?(?:\\s*×\\s*\\d+(?:,\\d+)?){0,2}(?=\\s*cm\\b)/g, group => group.replace(/\\d+,\\d+/g, num => { const v = Number(num.replace(',','.')); return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace('.',','); })) : string(text);\n");
  add(JS, 'K3 Farbwert mit Mass', "      return /\\d/.test(raw) ? metricText(raw) : raw;", "      return /\\d/.test(raw) ? roundCm(metricText(raw)) : raw;");
  add(JS, 'K3 displaySize', "return string(variant?.displaySizeCh) || sizeDe(raw,product,metricText(raw));", "return string(variant?.displaySizeCh) || sizeDe(raw,product,roundCm(metricText(raw)));");
  add(JS, 'K3 joinSizeLabels', "return sizeDe(value,null,metricText(value));};", "return sizeDe(value,null,roundCm(metricText(value)));};");

  // K2: Farbnamen
  add(JS, 'K2 colorFallback',
    "white_front_silver_back:'Weiss (Vorderseite), Silber (Rückseite)',rectangle:'Rechteck'};",
    "white_front_silver_back:'Weiss (Vorderseite), Silber (Rückseite)',rectangle:'Rechteck',glossy:'Glänzend',matte:'Matt',oyster:'Sand',fresh_pink:'Zartrosa',fresh_green:'Zartgrün',natural_stone:'Naturstein'}; " + K + "Oberflächen und weitere Farbnamen deutsch */");
  add(JS, 'K2 Basisfarbe nicht bei Oberflächen',
    "if(colors.length===1)colorGroup.append(",
    "if(colors.length===1&&!/^(?:glossy|matte)$/i.test(colorValue(colors[0])))" + "colorGroup.append(");

  // K1: Titel
  add(JS, 'K1 titleForProduct',
    "    const titleForProduct = product => {\n      const extra = presentationFor(product);\n      return titleCm(metricTitle(german && (string(extra?.titleDe) || string(product.titleDe)) || (german ? dropOz(product.title) : product.title)));\n    };\n",
    "    " + K + "deutsche Modelltitel (Vorrang vor titleDe der Daten, das teils selbst englisch ist); ohne Eintrag der bisherige Titel */\n" +
    "    const lxTitelDe = " + JSON.stringify(TITEL_DE) + ";\n" +
    "    const titleForProduct = product => {\n      const extra = presentationFor(product);\n      return titleCm(metricTitle(german && (lxTitelDe[id(product.id)] || string(extra?.titleDe) || string(product.titleDe)) || (german ? dropOz(product.title) : product.title)));\n    };\n");
  add(JS, 'K1 Suche im deutschen Titel',
    "const haystack=normal([product.title,product.titleDe,product.brand,",
    "const haystack=normal([product.title,titleForProduct(product),product.titleDe,product.brand,");
  add(JS, 'K1 Suchwörter',
    "decals:['sticker','decal']};",
    "decals:['sticker','decal'],kappe:['cap','hat'],kappen:['cap','hat'],pullover:['sweatshirt','hoodie'],beutel:['tote'],stoffbeutel:['tote'],jutebeutel:['tote'],bio:['organic'],hulle:['case'],hullen:['case'],handyhulle:['case'],handyhullen:['case']};");

  // K8: Kategoriename «T-Shirts»
  add(JS, 'K8 titleFor mit Rückfall',
    "    const titleFor = category => german && categoryTranslations[lookupKey(category.title)] || string(category.title);",
    "    " + K + "Kategorienamen, die category_names nicht kennt (z. B. «T-shirts» im Katalog) */\n" +
    "    const categoryFallback = " + JSON.stringify(KORREKTUR_KATEGORIEN_DE) + ";\n" +
    "    const titleFor = category => german && (categoryTranslations[lookupKey(category.title)] || categoryFallback[lookupKey(category.title)]) || string(category.title);");

  // K5: Sortierung nach bestellbaren Ausführungen
  add(JS, 'K5 Zahl der bestellbaren Ausführungen merken',
    "return {...p,colors:list(p.colors).filter(c=>colors.has(colorValue(c))),",
    "return {...p,lxCount:byModel.get(id(p.id)).length,colors:list(p.colors).filter(c=>colors.has(colorValue(c))),");
  add(JS, 'K5 Sortierung',
    "Number(b.variantCount || b.originalVariantCount || 0)-Number(a.variantCount || a.originalVariantCount || 0)",
    "Number(b.lxCount || 0)-Number(a.lxCount || 0)");

  // K7: langsame Textdatei
  add(JS, 'K7 loadTextsLimited',
    "    const loadTextsLimited = () => { let timer; return Promise.race([loadTexts(), new Promise(resolve => { timer = setTimeout(resolve, 2500); })]).finally(() => clearTimeout(timer)); };",
    "    " + K + "nach dem ersten Zeitüberschreiten nicht bei jedem Öffnen erneut 2,5 s warten; die Datei lädt weiter, und trifft sie ein, wird die offene Detailansicht einmal neu gezeichnet (nur wenn die Auswahl unverändert ist) */\n" +
    "    let textsTimedOut = false;\n" +
    "    const loadTextsLimited = () => { if (textsTimedOut && textsPending && !textsDe) return Promise.resolve(textsDe); textsTimedOut = false; let timer; return Promise.race([loadTexts(), new Promise(resolve => { timer = setTimeout(() => { if (textsPending && !textsDe) textsTimedOut = true; resolve(); }, 2500); })]).finally(() => clearTimeout(timer)); };\n" +
    "    const lxTextsNachtragen = (full, token) => {\n" +
    "      if (!german || textsDe || !textsPending) return;\n" +
    "      const wartet = textsPending, auswahl = () => [dialog.dataset.variantId, dialog.dataset.color, dialog.dataset.size].join('|'), vorher = auswahl();\n" +
    "      wartet.then(() => { if (wartet !== textsPending || !textsDe || token !== detailToken || !dialog.open || auswahl() !== vorher) return; renderDetails(full); }, () => {});\n" +
    "    };");
  add(JS, 'K7 openDetails',
    "      try { const [full] = await Promise.all([productDetails(product), loadTextsLimited()]); if(token === detailToken && dialog.open) renderDetails(full); }",
    "      try { const [full] = await Promise.all([productDetails(product), loadTextsLimited()]); if(token === detailToken && dialog.open) { renderDetails(full); lxTextsNachtragen(full, token); } }");

  // Sprachdateien
  add(DE, 'K5 Etikett sort_variants (de)', '"sort_variants": "Meiste Originalvarianten"', '"sort_variants": "' + KORREKTUR_SCHLUESSEL.de.sort_variants + '"');
  add(EN, 'K5 Etikett sort_variants (en)', '"sort_variants": "Most original variants"', '"sort_variants": "' + KORREKTUR_SCHLUESSEL.en.sort_variants + '"');
  add(FR, 'K5 Etikett sort_variants (fr)', '"sort_variants": "Le plus de variantes d’origine"', '"sort_variants": "' + KORREKTUR_SCHLUESSEL.fr.sort_variants + '"');
  return P;
}
