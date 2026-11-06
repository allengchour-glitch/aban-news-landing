// Katalogfenster «Selbst gestalten» (Sektion luxe-clothing im MAIN-Theme), Stand 05.11.2026, Besitzerentscheid «nur bestellbare anzeigen»:
//  1. Im Fenster erscheinen nur Modelle mit mindestens einer BESTELLBAREN Ausführung (Shopangebot, available nicht false, nicht in assets/luxe-clothing-ausblenden.json);
//     in den Details nur Farben und Grössen, die zu einer bestellbaren Ausführung gehören; Zähler, Gruppen, Typ-Liste, Unterkategorien, Filter und Kurzwahlen
//     zählen nur das Sichtbare, Gruppen ohne sichtbares Modell verschwinden; bei null Modellen steht ein ehrlicher Satz.
//  2. Jede Karte trägt den Knopf «Jetzt selbst gestalten» (Ziel: /products/<handle>?variant=<id>#lspod-start), die Details tragen ihn immer (bei zwei Shopangeboten für dieselbe
//     Ausführung ist das erste lieferbare vorgewählt).
//  3. Die 96 Links «?view=luxe-studio» (3 Titelkacheln, 93 Karten der Shopliste) führen auf den echten Bestell-Editor derselben Produktseite.
//  4. Neue Theme-Dateien: assets/luxe-clothing-ausblenden.json (Zusatzschutz, 40 Modelle, 126 Varianten) und assets/luxe-clothing-variantenkarte.json (Variante -> Modell, Farbe, Grösse).
//  5. Korrekturrunde 06.11.2026 (3 unabhängige Prüfer): Texte, die den neuen Stand widerlegten (shop_intro, preview_note, intro «Kinderkleidung», Schuh-Satz, doppelter Satz im Dialog),
//     Einzahl («1 Modell», «1 bestellbare Ausführung»), Wegweiser statt stiller Leere (Deep-Link auf ein verborgenes Modell, veraltetes Dokument), Karte und Ausblenden-Datei parallel zum
//     Index laden, nicht lieferbare Angebote nicht zur Wahl stellen, bei null Modellen keine leere Filterfläche, Vorschau-Theme-ID auch an den neuen Links.
// Reine Textarbeit: anwenden(dateien, daten) bekommt die neun Live-Texte und liefert die neuen (plus die zwei neuen Dateien); jede Ankerstelle muss GENAU EINMAL vorkommen.
// Alle JS-Stellen tragen die Kommentarmarke LX-NURBESTELLBAR-0511 und liegen ausserhalb der Zeilen 449 bis 460 (Beschreibung/Optionen/Positionen: Katalogtexte-Auftrag).

export const DATEIEN = {
  JS: 'assets/luxe-clothing.js',
  CSS: 'assets/luxe-clothing.css',
  SECTION: 'sections/luxe-clothing.liquid',
  MANIFEST: 'snippets/luxe-clothing-asset-manifest.liquid',
  COVER: 'snippets/luxe-selfdesign-cover.liquid',
  CATEGORY: 'sections/luxe-category.liquid',
  DE: 'locales/de.json',
  EN: 'locales/en.default.json',
  FR: 'locales/fr.json',
};
export const NEUE_DATEIEN = {
  AUSBLENDEN: 'assets/luxe-clothing-ausblenden.json',
  KARTE: 'assets/luxe-clothing-variantenkarte.json',
};
// MD5 der Live-Dateien VOR dem Eingriff (gemessen 05.11.2026 ca. 22:30 UTC, Admin-API; die Sicherung sicherung/*.vor ist byte-gleich).
export const MD5_VOR = {
  [DATEIEN.JS]: '198328a67066f91ac776e7953d33f07b',
  [DATEIEN.CSS]: 'feba50324b9f59bf07216b2d46ffdbb5',
  [DATEIEN.SECTION]: '71c1406cf5d069e0a23b535d629f1bde',
  [DATEIEN.MANIFEST]: '0539431c5b7f9b15886885d4006d2fd1',
  [DATEIEN.COVER]: '8006e5ededfe5c22a4dc44fda82ded49',
  [DATEIEN.CATEGORY]: '10674566df5ca93ea7e71caf31d921dd',
  [DATEIEN.DE]: '74704b4a7583a70276bda37f2b5fed6a',
  [DATEIEN.EN]: '75522c426fe29e23479bbc3e35bffa77',
  [DATEIEN.FR]: '0a21cf6b810a2e2fd33552977912948b',
};
export const MARKE = 'LX-NURBESTELLBAR-0511';

// Die Schreibreihenfolge steht in apply.mjs (SCHRITT1/SCHRITT2): Daten, Texte und Liquid zuerst (t() zeigt bei fehlendem Label den rohen Schlüsselnamen), CSS/JS zuletzt.

const einmal = (text, anker, ersatz, name) => {
  const teile = text.split(anker);
  if (teile.length !== 2) throw new Error(`Anker «${name}» kommt ${teile.length - 1}× vor (erwartet genau 1)`);
  return teile[0] + ersatz + teile[1];
};

// ---------- Texte ----------
export const TEXTE = {
  de: {
    notice: 'Hier siehst du nur Modelle, die du bei LuxeStyle gestalten und bestellen kannst. Gestaltet und bestellt wird auf der Produktseite im Shop.',
    dialog_notice: 'Hier siehst du nur Ausführungen, die du bei LuxeStyle gestalten und bestellen kannst.',
    notice_shoes: 'Schuhgrössen: Europa-Tabelle des Herstellers, «ca.» = ungefähr.',
    none_orderable: 'Im Moment ist kein Modell zum Selbstgestalten bestellbar. Bitte schau später wieder vorbei.',
    orderable_variants: '[count] bestellbare Ausführungen',
    orderable_variants_one: '1 bestellbare Ausführung',
    results_one: '1 Modell in dieser Auswahl',
    reload_needed: 'Diese Seite ist nicht mehr aktuell. Bitte lade sie neu.',
    model_unavailable: 'Dieses Modell ist im Moment nicht zum Selbstgestalten bestellbar.',
    intro: 'Von T-Shirts und Hoodies bis zu Tassen, Taschen und Handyhüllen. Entdecke die Produktwelt und vergleiche die passenden Farben, Grössen und Ausführungen.',
    end_note: 'Grössen, Farben und Ausführungen hängen vom gewählten Produkt ab.',
    shop_intro: 'Wähle ein Produkt und gestalte es auf der Produktseite mit deinem eigenen Motiv.',
    preview_note: 'Wähle ein Produkt, gestalte es auf der Produktseite mit deinem eigenen Motiv und bestelle es dort.',
  },
  en: {
    notice: 'You only see models that you can design and order at LuxeStyle. You design and order on the product page in the shop.',
    dialog_notice: 'You only see variants that you can design and order at LuxeStyle.',
    notice_shoes: 'Shoe sizes: manufacturer\'s European chart, «ca.» means approximately.',
    none_orderable: 'No model can be ordered for custom design at the moment. Please check back later.',
    orderable_variants: '[count] orderable variants',
    orderable_variants_one: '1 orderable variant',
    results_one: '1 model in this selection',
    reload_needed: 'This page is out of date. Please reload it.',
    model_unavailable: 'This model cannot be ordered for custom design at the moment.',
    intro: 'From T-shirts and hoodies to mugs, bags and phone cases. Explore the catalogue and compare colours, sizes and product options.',
    end_note: 'Sizes, colours and options depend on the product you choose.',
    shop_intro: 'Choose a product and design it on the product page with your own artwork.',
    preview_note: 'Choose a product, design it on the product page with your own artwork and order it there.',
  },
  fr: {
    notice: 'Seuls les modèles que vous pouvez personnaliser et commander chez LuxeStyle sont affichés. La personnalisation et la commande se font sur la page produit de la boutique.',
    dialog_notice: 'Seules les versions que vous pouvez personnaliser et commander chez LuxeStyle sont affichées.',
    notice_shoes: 'Pointures : tableau européen du fabricant, « ca. » = environ.',
    none_orderable: 'Aucun modèle n’est commandable pour le moment. Revenez plus tard.',
    orderable_variants: '[count] versions commandables',
    orderable_variants_one: '1 version commandable',
    reload_needed: 'Cette page n’est plus à jour. Veuillez la recharger.',
    model_unavailable: 'Ce modèle ne peut pas être commandé pour le moment.',
  },
};
// Schlüssel, die in luxe_clothing NEU entstehen und von der Sektion als Label an das JS gereicht werden (results_one gibt es auf Französisch nicht: «results» ist dort auch nicht übersetzt und fällt auf Englisch zurück)
export const NEUE_SCHLUESSEL = ['none_orderable', 'orderable_variants', 'orderable_variants_one', 'results_one', 'reload_needed', 'model_unavailable', 'dialog_notice', 'notice_shoes'];
// bestehende Schlüssel, die ersetzt werden (nur wo sie vorhanden sind; notice wird ergänzt, wenn sie fehlt) und der Block luxe_category (nur de/en)
const ERSETZT_CLOTHING = ['notice', 'intro'];
const ERSETZT_CATEGORY = ['end_note', 'shop_intro', 'preview_note'];

// Findet den Block «"luxe_clothing": { … }» (zeichenkettenbewusst) und liefert [anfang, ende] der Klammern.
function blockGrenzen(text, name) {
  const marke = `"${name}": {`;
  const teile = text.split(marke);
  if (teile.length !== 2) throw new Error(`Block «${name}» kommt ${teile.length - 1}× vor (erwartet 1)`);
  const open = text.indexOf(marke) + marke.length - 1;
  let tiefe = 0, inStr = false, esc = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') tiefe++;
    else if (c === '}') { tiefe--; if (tiefe === 0) return [open, i]; }
  }
  throw new Error('Block nicht geschlossen');
}
const zeilenRegex = (k) => new RegExp(`^([ \\t]*"${k}": )"(?:[^"\\\\]|\\\\.)*"(,?)[ \\t]*$`, 'm');

// Ersetzt den Wert eines vorhandenen Schlüssels in einem Block (die Zeile muss genau einmal vorkommen). Fehlt der Schlüssel, ist die Rückgabe null. (Ersetzungsfunktion statt Muster: ein «$» im Text bliebe sonst nicht erhalten.)
function ersetzeZeile(block, key, wert) {
  const re = zeilenRegex(key);
  const treffer = block.match(new RegExp(re.source, 'gm')) || [];
  if (treffer.length > 1) throw new Error(`Schlüssel «${key}» kommt im Block ${treffer.length}× vor (erwartet höchstens 1)`);
  if (treffer.length === 0) return null;
  return block.replace(re, (_m, vorn, komma) => `${vorn}${JSON.stringify(wert)}${komma}`);
}

function sprachdatei(text, sprache) {
  const [a, e] = blockGrenzen(text, 'luxe_clothing');
  let block = text.slice(a, e + 1);
  if (block.includes('"none_orderable"')) throw new Error('Sprachdatei trägt die neuen Schlüssel schon');
  const t = TEXTE[sprache];
  const neu = NEUE_SCHLUESSEL.filter((k) => t[k] !== undefined);
  for (const k of ERSETZT_CLOTHING) {
    if (t[k] === undefined) continue;
    const r = ersetzeZeile(block, k, t[k]);
    if (r !== null) block = r;
    else if (k === 'notice') neu.unshift('notice');
    else throw new Error(`Schlüssel «${k}» fehlt im Block luxe_clothing (erwartet genau 1)`);
  }
  // neue Schlüssel am Ende des Blocks (das letzte Element bekommt ein Komma, falls nötig)
  if (!/\n {2}\}$/.test(block)) throw new Error('Block endet nicht wie erwartet (Einrückung)');
  const rumpf = block.slice(0, -1).replace(/\s*$/, '');
  const komma = rumpf.endsWith(',') ? '' : ',';
  const zeilen = neu.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(t[k])}`).join(',\n');
  block = `${rumpf}${komma}\n${zeilen}\n  }`;
  let aus = text.slice(0, a) + block + text.slice(e + 1);
  // luxe_category (nur de/en): «Dein Entwurf bleibt eine Vorschau», «öffne den Gestaltungsentwurf» und «Bestellung hier noch nicht möglich» stimmen nicht mehr, seit die Karten auf den echten Bestell-Editor führen
  if (t.end_note !== undefined) {
    const [a2, e2] = blockGrenzen(aus, 'luxe_category');
    let b2 = aus.slice(a2, e2 + 1);
    for (const k of ERSETZT_CATEGORY) {
      const r = ersetzeZeile(b2, k, t[k]);
      if (r === null) throw new Error(`Schlüssel «${k}» kommt im Block luxe_category 0× vor (erwartet 1)`);
      b2 = r;
    }
    aus = aus.slice(0, a2) + b2 + aus.slice(e2 + 1);
  }
  return aus;
}

// ---------- Section: neue Labels, kürzerer Hinweis im Dialog ----------
function section(text) {
  if (text.includes("'luxe_clothing.none_orderable'")) throw new Error('Section trägt die neuen Labels schon');
  const anker = `      "offer_unavailable": {{ 'luxe_clothing.offer_unavailable' | t | json }},\n`;
  const neu = NEUE_SCHLUESSEL.map((k) => `      "${k}": {{ 'luxe_clothing.${k}' | t | json }},\n`).join('');
  let t = einmal(text, anker, anker + neu, 'Section offer_unavailable');
  // der Dialog trägt einen eigenen, kürzeren Hinweis (der Satz «Gestaltet und bestellt wird auf der Produktseite» steht dort schon unter dem Knopf)
  t = einmal(t, `<p class="lcl-dialog-notice">{{ 'luxe_clothing.notice' | t }}</p>`, `<p class="lcl-dialog-notice">{{ 'luxe_clothing.dialog_notice' | t }}</p>`, 'Section Dialog-Hinweis');
  return t;
}

// ---------- Manifest: zwei neue Dateien ----------
function manifest(text) {
  if (text.includes('luxe-clothing-variantenkarte.json')) throw new Error('Manifest trägt die neuen Dateien schon');
  const anker = `{"index": {{ 'luxe-clothing-index.json' | asset_url | json }}, "details": {`;
  const neu = `{"index": {{ 'luxe-clothing-index.json' | asset_url | json }}, "ausblenden": {{ 'luxe-clothing-ausblenden.json' | asset_url | json }}, "variantenkarte": {{ 'luxe-clothing-variantenkarte.json' | asset_url | json }}, "details": {`;
  return einmal(text, anker, neu, 'Manifest index');
}

// ---------- Titelkacheln und Shopliste: echter Bestell-Editor statt Vorschau ----------
const editorLink = (drop) => `${drop}.url }}?variant={{ ${drop}.selected_or_first_available_variant.id }}#lspod-start"`;
function cover(text) {
  if (text.includes('lspod-start')) throw new Error('Titelkacheln führen schon auf den Editor');
  let t = einmal(text, `href="{{ cover_product.url }}?view=luxe-studio"`, `href="{{ ${editorLink('cover_product')}`, 'Cover-Link');
  // das kleine Skript hängt die Vorschau-Theme-ID nur an Links mit view=luxe-studio: es erkennt jetzt auch die Editor-Ziele
  t = einmal(t, `target.searchParams.get('view') === 'luxe-studio'`, `(target.searchParams.get('view') === 'luxe-studio' || target.hash === '#lspod-start')`, 'Cover Vorschau-Skript');
  return t;
}
function category(text) {
  if (text.includes('lspod-start')) throw new Error('Shopliste führt schon auf den Editor');
  let t = text;
  t = einmal(t, `href="{{ hero_product.url }}?view=luxe-studio"`, `href="{{ ${editorLink('hero_product')}`, 'Category Hero-Link');
  t = einmal(t, `<a class="lxc-card-image" href="{{ item.url }}?view=luxe-studio"`, `<a class="lxc-card-image" href="{{ ${editorLink('item')}`, 'Category Bild-Link');
  t = einmal(t, `<h3><a href="{{ item.url }}?view=luxe-studio">`, `<h3><a href="{{ ${editorLink('item')}>`, 'Category Titel-Link');
  t = einmal(t, `<a class="lxc-card-cta" href="{{ item.url }}?view=luxe-studio">{% if section.settings.compact_shop_list %}{{ 'luxe_category.draft_cta' | t }}`,
    `<a class="lxc-card-cta" href="{{ ${editorLink('item')}>{% if section.settings.compact_shop_list %}{{ 'luxe_clothing.design_cta' | t }}`, 'Category Knopf');
  t = einmal(t, `target.searchParams.has('view')`, `(target.searchParams.has('view') || target.hash === '#lspod-start')`, 'Category Vorschau-Skript');
  return t;
}

// ---------- CSS ----------
export const CSS_NEU = `
/* ${MARKE}: Knopf «Jetzt selbst gestalten» auf den Karten (unten bündig, Details darunter) */
.lcl-card .lcl-card-design{margin:auto 0 8px;min-height:44px;padding:10px 8px;font-size:13px}
.lcl-card .lcl-card-design+.lcl-card-cta{margin-top:0}
@media(max-width:749px){.lcl-card .lcl-card-design{font-size:12px;padding:9px 6px}}
/* ${MARKE}: bei null sichtbaren Modellen keine leere Filterfläche, nur der Satz */
.lcl-catalog.lcl-no-models .lcl-discovery,.lcl-catalog.lcl-no-models .lcl-result-line{display:none}
`;
function css(text) {
  if (text.includes(MARKE)) throw new Error('CSS trägt die Marke schon');
  return text.replace(/\s*$/, '\n') + CSS_NEU;
}

// ---------- JS ----------
export const JS_HELFER = `    /* ${MARKE}: nur Modelle mit bestellbarem Shopangebot (Besitzerentscheid 05.11.2026) */
    const lxDesignUrl = u => {try{const x=new URL(u,location.href);x.hash='lspod-start';return x.href;}catch{return '';}};
    const lxCardOffer = new Map();
    const lxLoads = {map:null,hide:null};
    const lxEarly = () => {const go=url=>{const p=readAsset(url);p.catch(()=>{});return p;};lxLoads.map=config.assets?.variantenkarte?go(config.assets.variantenkarte):null;lxLoads.hide=config.assets?.ausblenden?go(config.assets.ausblenden):null;};
    const lxPrepare = async () => {
      if(!lxLoads.map) throw new Error('LX_RELOAD');
      const map = await lxLoads.map;
      if(!map || map.schemaVersion!==1 || !map.modelle || typeof map.modelle!=='object') throw new Error('Invalid variant map');
      const hideModels = new Set(), hideVariants = new Set();
      if(lxLoads.hide){try{const hide=await lxLoads.hide;if(hide?.schemaVersion===1){list(hide.modelle).forEach(m=>hideModels.add(id(m)));Object.values(hide.varianten||{}).forEach(rows=>list(rows).forEach(v=>hideVariants.add(id(v))));}}catch{root.dataset.hideState='unavailable';}}
      const rows = new Map();
      Object.entries(map.modelle).forEach(([model,variants])=>list(variants).forEach(row=>{const v=id(Array.isArray(row)?row[0]:'');if(v)rows.set(v,{model:id(model),color:string(row[1]),size:string(row[2])});}));
      const byModel = new Map();
      shopOffersByPrintful.forEach((_,vid)=>{
        const row=rows.get(vid);if(!row || hideModels.has(row.model) || hideVariants.has(vid))return;
        const match=offersFor({id:vid});if(!match.offers.some(o=>o.available!==false) || (match.requiresChoice && match.offers.length<2))return;
        if(!byModel.has(row.model))byModel.set(row.model,[]);byModel.get(row.model).push(vid);
      });
      const all = new Set();
      byModel.forEach((vids,model)=>{
        vids.forEach(v=>all.add(v));
        const pick=vids.find(v=>{const m=offersFor({id:v});return !m.requiresChoice && m.offers.length===1;}) || vids[0];
        lxCardOffer.set(model,offersFor({id:pick}).offers.find(o=>o.available!==false));
      });
      lxVids = all;
      products = products.filter(p=>byModel.has(id(p.id))).map(p=>{
        const colors=new Set(), sizes=new Set(), pairs=new Map();
        byModel.get(id(p.id)).forEach(v=>{const row=rows.get(v);if(row.color)colors.add(row.color);if(row.size)sizes.add(row.size);if(row.color&&row.size){if(!pairs.has(row.color))pairs.set(row.color,new Set());pairs.get(row.color).add(row.size);}});
        return {...p,colors:list(p.colors).filter(c=>colors.has(colorValue(c))),sizes:list(p.sizes).filter(s=>sizes.has(s)),colorSizes:Object.fromEntries(Object.entries(p.colorSizes||{}).map(([key,values])=>[key,list(values).filter(s=>pairs.get(key)?.has(s))]))};
      });
      /* Schuh-Satz nur, wenn ein sichtbares Modell Europa-Grössen zeigt */
      if(products.some(p=>list(p.sizes).some(s=>/^EU\\b/i.test(displaySize(s,p))))){[['.lcl-notice','notice'],['.lcl-dialog-notice','dialog_notice']].forEach(([sel,key])=>{const n=root.querySelector(sel);if(n)n.textContent=t(key)+' '+t('notice_shoes');});}
    };
    const lxCardCta = product => {
      const offer=lxCardOffer.get(id(product.id));if(!offer)return null;
      const link=el('a','lcl-button lcl-design-cta lcl-card-design',t('design_cta'));link.href=lxDesignUrl(offer.url);link.dataset.lclCardDesign='';
      link.setAttribute('aria-label',t('design_cta')+': '+titleForProduct(product));return link;
    };
`;
function js(text) {
  if (text.includes(MARKE)) throw new Error('JS trägt die Marke schon');
  let t = text;
  // 1. Varianten: nur bestellbare (lxVids bleibt null, bis lxPrepare gelaufen ist)
  t = einmal(t, `const variantsFor = product => list(product.variants).filter(v => id(v.id));`,
    `let lxVids = null; /* ${MARKE} */\n    const variantsFor = product => list(product.variants).filter(v => id(v.id) && (lxVids === null || lxVids.has(id(v.id)))); /* ${MARKE} */`, 'JS variantsFor');
  // 2. Helfer vor load()
  t = einmal(t, `    const load = async () => {\n`, JS_HELFER + `    const load = async () => {\n`, 'JS load-Kopf');
  // 3. Nach dem Laden: auf Bestellbares einschränken (vor renderGroups/refreshTypes)
  t = einmal(t, `loaded = true; root.dataset.sourceCount = String(products.length); renderGroups(); refreshTypes();`,
    `await lxPrepare(); /* ${MARKE} */ loaded = true; root.dataset.sourceCount = String(products.length); renderGroups(); refreshTypes();`, 'JS Einschränkung');
  // 4. Gruppen ohne sichtbares Modell fallen weg
  t = einmal(t, `categoryChildren('0').filter(c=>id(c.id)!=='277')];`,
    `categoryChildren('0').filter(c=>id(c.id)!=='277').filter(c=>products.some(p=>categoryIds(p).includes(id(c.id))))]; /* ${MARKE} */`, 'JS Gruppen');
  // 5. Typ-Liste ohne leere Kategorien
  t = einmal(t, `types.add(option);`, `if(count>0)types.add(option); /* ${MARKE} */`, 'JS Typ-Liste');
  // 6. Kurzwahl (Sticker) und Sonderauswahl (Baby, Unisex) nur mit sichtbarem Modell
  t = einmal(t, `node.hidden=!categories.has(key);node.disabled=false;`,
    `node.hidden=!categories.has(key)||!products.some(p=>categoryIds(p).includes(key)); /* ${MARKE} */ node.disabled=false;`, 'JS Kurzwahl');
  t = einmal(t, `node.setAttribute('aria-pressed',String(selected)); const count = node.querySelector('[data-lcl-audience-count]');`,
    `node.setAttribute('aria-pressed',String(selected)); node.hidden=node.dataset.lclAudience!=='all'&&!products.some(p=>matchesAudience(p,node.dataset.lclAudience)); /* ${MARKE} */ const count = node.querySelector('[data-lcl-audience-count]');`, 'JS Sonderauswahl');
  // 7. Ehrlicher Satz bei null sichtbaren Modellen
  t = einmal(t, `:t('empty'));`, `:t(products.length?'empty':'none_orderable')); root.classList.toggle('lcl-no-models',!products.length); /* ${MARKE} */`, 'JS leere Liste');
  // 8. Knopf auf jeder Karte (vor «Auswahl & Details»)
  t = einmal(t, `const cta = button(t('details'), () => openDetails(product, cta),'lcl-card-cta'); copy.append(cta);`,
    `const buy = lxCardCta(product); if (buy) copy.append(buy); /* ${MARKE} */ const cta = button(t('details'), () => openDetails(product, cta),'lcl-card-cta'); copy.append(cta);`, 'JS Karten-Knopf');
  // 9. Zwei Shopangebote für dieselbe Ausführung: das erste lieferbare ist vorgewählt (der Knopf fehlt sonst bis zur Wahl)
  t = einmal(t, `const data=offersFor(selected);const offer=data.requiresChoice ?`,
    `const data=offersFor(selected);if(data.requiresChoice&&data.offers.length>1&&!priceChoiceId){const first=data.offers.find(item=>item.available!==false);if(first)priceChoiceId=id(first.variantId);} /* ${MARKE} */ const offer=data.requiresChoice ?`, 'JS Vorwahl');
  // 10. Zeile «N Originalvarianten aus dem Herstellerkatalog» zählt jetzt die bestellbaren Ausführungen
  t = einmal(t, `t('original_variants',{count:variants.length})`, `(variants.length===1?t('orderable_variants_one'):t('orderable_variants'/* ${MARKE} */,{count:variants.length}))`, 'JS Anzahl Ausführungen');
  // 11. Karte und Ausblenden-Datei werden zugleich mit dem Index geholt (nacheinander kostete das zwei Roundtrips vor dem ersten Bild)
  t = einmal(t, `const raw = await readAsset(config.assets?.index);`, `lxEarly(); /* ${MARKE} */ const raw = await readAsset(config.assets?.index);`, 'JS Vorabruf');
  // 12. Einzahl in der Ergebniszeile
  t = einmal(t, `result.textContent = t('results',{count:filtered.length});`, `result.textContent = t(filtered.length===1?'results_one':'results',{count:filtered.length}); /* ${MARKE} */`, 'JS Ergebniszeile');
  // 13. Fehlt der Schlüssel «variantenkarte» im Dokument (veraltete Seite aus dem Zwischenspeicher, neues JS), hilft «Erneut versuchen» nie: eigener Satz, kein Knopf
  t = einmal(t, `} catch { showMessage(t('load_error'),true); retry.hidden = false; root.dataset.loadState = 'error'; }`,
    `} catch (lxErr) { const lxReload = !!lxErr && lxErr.message === 'LX_RELOAD'; /* ${MARKE} */ showMessage(t(lxReload?'reload_needed':'load_error'),true); retry.hidden = lxReload; root.dataset.loadState = 'error'; }`, 'JS Ladefehler');
  // 14. Ein Link auf ein verborgenes oder unbekanntes Modell (?catalog_product=…) sagt, warum nichts aufgeht
  t = einmal(t, `if(product)openDetails(product,null);}`, `if(product)openDetails(product,null);else showMessage(t('model_unavailable')); /* ${MARKE} */}`, 'JS Direktlink');
  // 15. Nicht lieferbare Angebote derselben Ausführung stehen nicht zur Wahl, solange es ein lieferbares gibt (sonst verschwindet der Knopf, wenn man sie wählt)
  t = einmal(t, `data.offers.forEach(item=>chooser.add(new Option(`, `(data.offers.some(item=>item.available!==false)?data.offers.filter(item=>item.available!==false):data.offers /* ${MARKE} */).forEach(item=>chooser.add(new Option(`, 'JS Angebotsauswahl');
  return t.replace(/\s*$/, '\n') + `/* ${MARKE} */\n`;
}

// ---------- Zusatzschutz: Printful-Daten zur Lieferbarkeit als kleine Theme-Datei ----------
export const AUSBLENDEN_STAND = '2026-11-05';
export function ausblendenText(q) {
  const zahlen = (a) => [...a].map(Number).sort((x, y) => x - y);
  const modelle = zahlen(q.modelle_ausblenden);
  const ids = Object.keys(q.varianten_ausblenden).map(Number).sort((x, y) => x - y);
  const zeilen = ids.map((k) => `${JSON.stringify(String(k))}:${JSON.stringify(zahlen(q.varianten_ausblenden[k]))}`);
  const quelle = 'Printful-API (GEMESSEN 05.11.2026): Schweizer Versandrate je Modell und availability_status je Variante. modelle = nicht in die Schweiz lieferbar, technisch ungeeignet oder überall ausverkauft; varianten = überall ausverkaufte Varianten sonst lieferbarer Modelle.';
  return `{"schemaVersion":1,"stand":${JSON.stringify(AUSBLENDEN_STAND)},"quelle":${JSON.stringify(quelle)},"modelle":${JSON.stringify(modelle)},"varianten":{\n${zeilen.join(',\n')}\n}}\n`;
}

// dateien: {Dateiname: Text} der neun bestehenden Dateien; daten: {ausblenden: Inhalt von daten/ausblenden-quelle.json, karte: Text von daten/variantenkarte.json}
// Rückgabe: {Dateiname: neuer Text} für die neun geänderten UND die zwei neuen Dateien
export function anwenden(dateien, daten) {
  const out = {};
  out[NEUE_DATEIEN.AUSBLENDEN] = ausblendenText(daten.ausblenden);
  out[NEUE_DATEIEN.KARTE] = daten.karte;
  out[DATEIEN.DE] = sprachdatei(dateien[DATEIEN.DE], 'de');
  out[DATEIEN.EN] = sprachdatei(dateien[DATEIEN.EN], 'en');
  out[DATEIEN.FR] = sprachdatei(dateien[DATEIEN.FR], 'fr');
  out[DATEIEN.SECTION] = section(dateien[DATEIEN.SECTION]);
  out[DATEIEN.MANIFEST] = manifest(dateien[DATEIEN.MANIFEST]);
  out[DATEIEN.COVER] = cover(dateien[DATEIEN.COVER]);
  out[DATEIEN.CATEGORY] = category(dateien[DATEIEN.CATEGORY]);
  out[DATEIEN.CSS] = css(dateien[DATEIEN.CSS]);
  out[DATEIEN.JS] = js(dateien[DATEIEN.JS]);
  return out;
}
