(() => {
  'use strict';
  const string = value => typeof value === 'string' ? value : '';
  const list = value => Array.isArray(value) ? value : [];
  const id = value => /^\d+$/.test(String(value ?? '')) ? String(value) : '';
  const hex = value => /^#[\da-f]{6}$/i.test(string(value)) ? value : null;
  const unique = values => Array.from(new Set(values.filter(Boolean)));
  const sizeOrder = ['XXS','XS','S','M','L','XL','2XL','XXL','3XL','XXXL','4XL','5XL','6XL','7XL','8XL'];
  /* LX-KATALOGTEXTE-0511 (Korrektur 06.11.2026): totale Ordnung: Kleidergrössen in ihrer Reihenfolge, dann Volumen (oz/ml), dann Masse nach der ersten Zahl, dann Text; vorher mischte der Vergleich Gruppen und war nicht transitiv */
  const sizeRank = s => { const i=sizeOrder.indexOf(s); if(i>=0) return [0,i]; const m=/^\s*(\d+(?:[.,]\d+)?)/.exec(s); if(!m) return [3,0]; const n=parseFloat(m[1].replace(',','.')); return /\b(?:oz|ml)\b/i.test(s) ? [1,/\boz\b/i.test(s)?n*29.5735:n] : [2,n]; };
  const sortSizes = (a,b) => { const x=sizeRank(a), y=sizeRank(b); return x[0]-y[0] || x[1]-y[1] || String(a).localeCompare(String(b),undefined,{numeric:true}); };
  const normal = value => string(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replaceAll('ß','ss');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const imageUrl = value => {
    try {
      const url = new URL(string(value));
      if (url.protocol !== 'https:' || url.username || url.password || !['files.cdn.printful.com', 'cdn.shopify.com'].includes(url.hostname)) return null;
      return url.href;
    } catch { return null; }
  };
  const assetUrl = value => {
    try {
      const url = new URL(string(value), location.href);
      if (url.username || url.password || !['https:', 'http:'].includes(url.protocol)) return null;
      if (url.origin !== location.origin && !(url.protocol === 'https:' && url.hostname === 'cdn.shopify.com')) return null;
      if (!/\/assets\/luxe-clothing-[a-z\d-]+\.json$/i.test(url.pathname)) return null;
      return url.href;
    } catch { return null; }
  };
  const categoryNames = {
    "men's clothing": 'cat_men', "women's clothing": 'cat_women', "kids' & youth clothing": 'cat_kids',
    'all shirts': 'cat_shirts', 't-shirts': 'cat_tshirts', 'all hoodies & sweatshirts': 'cat_hoodies_sweatshirts',
    'hoodies': 'cat_hoodies', 'sweatshirts': 'cat_sweatshirts', 'jackets': 'cat_jackets', 'all jackets': 'cat_jackets',
    'pants': 'cat_pants', 'all pants': 'cat_pants', 'leggings': 'cat_leggings', 'shorts': 'cat_shorts',
    'dresses': 'cat_dresses', 'skirts': 'cat_skirts', 'swimwear': 'cat_swimwear', 'sportswear': 'cat_sportswear',
    'baby bodysuits': 'cat_baby', 'tank tops': 'cat_tanktops', 'long sleeve shirts': 'cat_longsleeve',
    'polo shirts': 'cat_polos', 'all-over shirts': 'cat_allover_shirts', 'zip hoodies': 'cat_zip_hoodies'
  };
  const decodeEntities = value => new DOMParser().parseFromString(string(value).replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);)/gi,'&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),'text/html').body.textContent || '';
  const decodeLabels = value => typeof value==='string' ? decodeEntities(value) : Array.isArray(value) ? value.map(decodeLabels) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decodeLabels(item)])) : value;
  const plainText = value => {
    const source=string(value); if(!source) return '';
    const text=source.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<br\s*\/?\s*>|<\/(p|div|li)\s*>/gi,'\n').replace(/<[^>]*>/g,'');
    const safe=text.replaceAll('<','&lt;').replaceAll('>','&gt;');
    return (new DOMParser().parseFromString(safe,'text/html').body.textContent || '').trim();
  };
  const materialNames = {
    cotton: 'material_cotton', 'organic cotton': 'material_organic_cotton', polyester: 'material_polyester',
    'recycled polyester': 'material_recycled_polyester', elastane: 'material_elastane', spandex: 'material_elastane',
    viscose: 'material_viscose', rayon: 'material_rayon', nylon: 'material_nylon', wool: 'material_wool',
    acrylic: 'material_acrylic', linen: 'material_linen', 'recycled cotton': 'material_recycled_cotton',
    'combed cotton': 'material_combed_cotton', 'combed ring spun cotton': 'material_combed_ring_spun_cotton', 'combed ring-spun cotton': 'material_combed_ring_spun_cotton', 'ring spun cotton': 'material_ring_spun_cotton', 'ring-spun cotton': 'material_ring_spun_cotton'
  };
  const techniqueNames = {DTG:'tech_dtg', DTFILM:'tech_dtf', DTF:'tech_dtf', EMBROIDERY:'tech_embroidery',
    EMBROIDERY_FLAT:'tech_flat', EMBROIDERY_PUFF:'tech_puff', SUBLIMATION:'tech_sublimation', 'CUT-SEW':'tech_allover'};
  const positionNames = {'front':'position_front', 'front print':'position_front', 'back':'position_back',
    'back print':'position_back', 'left sleeve':'position_left_sleeve', 'right sleeve':'position_right_sleeve',
    'left chest':'position_left_chest', 'center chest':'position_center_chest'};


  // Convert explicit inch measurements for display. Raw option values and IDs remain unchanged.
  const createMetricFormatter = locale => {
    const formatter = new Intl.NumberFormat(/^de(?:-|$)/i.test(locale || '') ? 'de-DE' : (locale || 'en'), {maximumFractionDigits:2,useGrouping:false});
    const number = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|(?:\d+(?:[.,]\d+)?|[.,]\d+)[½¼¾⅛⅜⅝⅞]?|[½¼¾⅛⅜⅝⅞])`;
    const unit = String.raw`(?:["″”]|(?:inches|inch|Zoll|in)(?![\p{L}\p{N}_]))`;
    const measurement = new RegExp(String.raw`(?<![\p{L}\p{N}_/.,+–−—-])(?:${number}\s*(?:${unit})?\s*[x×✕]\s*){0,2}${number}\s*${unit}(?:\s*\(([^()]*\b(?:cm|mm)\b[^()]*)\))?`, 'giu');
    const removeUnit = new RegExp(unit, 'giu');
    const redundantImperial = new RegExp(String.raw`((?:${number}\s*(?:cm|mm)?\s*[x×✕]\s*){0,2}${number}\s*(?:cm|mm))\s*\((?:${number}\s*(?:${unit})?\s*[x×✕]\s*){0,2}${number}\s*${unit}\)`, 'giu');
    const metricMeasurement = new RegExp(String.raw`^\s*(?:${number}\s*(?:cm|mm)?\s*[x×✕]\s*){0,2}${number}\s*(?:cm|mm)\s*$`, 'iu');
    const rangeMeasurement = new RegExp(String.raw`(?<![\p{L}\p{N}_/.,+–−—-])(${number})\s*(?:${unit})?\s*[-–—]\s*(${number})\s*${unit}(?:\s*\(([^()]*\b(?:cm|mm)\b[^()]*)\))?`, 'giu');
    const metricRangeMeasurement = new RegExp(String.raw`^\s*${number}\s*(?:cm|mm)?\s*[-–—]\s*${number}\s*(?:cm|mm)\s*$`, 'iu');
    const fractions = {'½':.5,'¼':.25,'¾':.75,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875};
    const numeric = value => {
      const text=value.trim().replace(',','.');
      const vulgar=text.match(/^(\d*(?:\.\d+)?)([½¼¾⅛⅜⅝⅞])$/);
      if(vulgar) return Number(vulgar[1] || 0)+fractions[vulgar[2]];
      const fraction=text.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
      if(fraction) return Number(fraction[3])>0 ? Number(fraction[1] || 0)+Number(fraction[2])/Number(fraction[3]) : NaN;
      return Number(text);
    };
    const cache=new Map();
    return value => {
      const source=string(value);if(!source)return source;if(cache.has(source))return cache.get(source);
      const result=source.replace(redundantImperial,'$1').replace(rangeMeasurement,(whole,first,last,metric,offset,input)=>{
        if(/(?:^|[(:=•])\s*[-−]\s*$/.test(input.slice(0,offset)))return whole;
        if(metric!==undefined && (metricMeasurement.test(metric) || metricRangeMeasurement.test(metric)))return metric.trim();
        const values=[numeric(first),numeric(last)];
        if(values.some(value=>!Number.isFinite(value) || value<=0) || values[0]>values[1])return whole;
        return values.map(value=>formatter.format(value*2.54)).join('–')+' cm';
      }).replace(measurement,(whole,metric,offset,input)=>{
        if(/(?:^|[(:=•])\s*[-−]\s*$/.test(input.slice(0,offset)) || /[\d\"″”]\s*[-–—]\s*$/.test(input.slice(0,offset)) || new RegExp(String.raw`^\s*[-–—]\s*${number}`,'u').test(input.slice(offset+whole.length)))return whole;
        if(metric!==undefined && metricMeasurement.test(metric))return metric.trim();
        const imperial=metric===undefined?whole:whole.slice(0,whole.lastIndexOf('('));
        const values=imperial.replace(removeUnit,'').split(/[x×✕]/).map(numeric);
        if(values.some(value=>!Number.isFinite(value) || value<=0)) return whole;
        return values.map(value=>formatter.format(value*2.54)).join(' × ')+' cm';
      });
      cache.set(source,result);return result;
    };
  };
  const formatShopOptionValues = target => {
    const locale=target.documentElement?.lang || target.ownerDocument?.documentElement.lang || 'de';
    const metric=createMetricFormatter(locale);
    const values=[...(target.matches?.('.lxc-option-values')?[target]:[]),...target.querySelectorAll('.lxc-option-values')];
    values.forEach(container=>{
      const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode()))node.nodeValue=metric(node.nodeValue);
    });
  };

  function initialize(root) {
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    let config;
    try { config = JSON.parse(root.querySelector('[data-lcl-config]').textContent); } catch { return; }
    const labels = decodeLabels(config.labels || {});
    /* LX-KATALOGTEXTE-0511 (Korrektur 06.11.2026): Rückfallsätze für die Etiketten von (A): ein neues JS mit einem alten (zwischengespeicherten) Dokument zeigte sonst den Rohschlüssel, z. B. «reload_needed» */
    const lxFallbackDe = {"none_orderable":"Im Moment ist kein Modell zum Selbstgestalten bestellbar. Bitte schau später wieder vorbei.","orderable_variants":"[count] bestellbare Ausführungen","orderable_variants_one":"1 bestellbare Ausführung","results_one":"1 Modell in dieser Auswahl","reload_needed":"Diese Seite ist nicht mehr aktuell. Bitte lade sie neu.","model_unavailable":"Dieses Modell ist im Moment nicht zum Selbstgestalten bestellbar.","dialog_notice":"Hier siehst du nur Ausführungen, die du bei LuxeStyle gestalten und bestellen kannst.","notice_shoes":"Schuhgrössen: Europa-Tabelle des Herstellers, «ca.» = ungefähr."};
    const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`[${name}]`, String(value)), string(labels[key]) || (german ? lxFallbackDe[key] : '') || key);
    const german = /^de(?:-|$)/i.test(config.locale || '');
    // LX-KATALOGTEXTE-0511: Etikett nur nehmen, wenn es vorhanden und kein «translation missing» ist (Einspielreihenfolge von Section und Locale-Dateien ist dann unkritisch)
    const labelOr = (key, fallback) => { const text = string(labels[key]); return text && !/^translation missing/i.test(text) ? text : fallback; };
    const metricText = createMetricFormatter(config.locale || 'de');
    const metricTitle = value => metricText(value).replace(/\(\s*in\s*\)(?=\s*(?:$|\|))/gi,'(cm)');
    /* LX-KATALOGTEXTE-0511 (Korrektur 06.11.2026): umgerechnete Zentimeter höchstens eine Nachkommastelle, ab 10 cm ganze Zentimeter (7,62 → 7,6 · 13,97 → 14 · 38,1 → 38); nur deutsche Seite, nur Mass-Gruppen mit «cm» */
    const roundCm = text => german ? string(text).replace(/\d+(?:,\d+)?(?:\s*×\s*\d+(?:,\d+)?){0,2}(?=\s*cm\b)/g, group => group.replace(/\d+,\d+/g, num => { const v = Number(num.replace(',','.')); return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace('.',','); })) : string(text);
    const lookupKey = value => normal(value).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    const normalizeNames = names => Object.fromEntries(Object.entries(names || {}).map(([key,value])=>[lookupKey(key),value]));
    const categoryTranslations = normalizeNames(labels.category_names);
    const colorTranslations = normalizeNames(labels.color_names);
    const titleFor = category => german && categoryTranslations[lookupKey(category.title)] || string(category.title);
    // LX-KATALOGTEXTE-0511: Farbnamen, die das Locale nicht kennt: wenige allgemeine Wörter und Masse (keine imperialen Einheiten)
    const colorFallback = {custom:'Individuell',wood:'Holz',satin:'Satin',dotted:'Gepunktet',denim_blue:'Jeansblau',white_matte:'Weiss matt',tan:'Hellbraun',white_glossy:'Weiss glänzend','1_pc':'1 Stück',white_aluminum:'Weiss (Aluminium)',white_front_silver_back:'Weiss (Vorderseite), Silber (Rückseite)',rectangle:'Rechteck',glossy:'Glänzend',matte:'Matt',oyster:'Sand',fresh_pink:'Zartrosa',fresh_green:'Zartgrün',natural_stone:'Naturstein'}; /* LX-KATALOGTEXTE-0511 (Korrektur 06.11.2026): Oberflächen und weitere Farbnamen deutsch */
    const colorName = value => {
      const raw = string(value); if (!german) return raw;
      const hit = colorTranslations[lookupKey(raw)] || colorFallback[lookupKey(raw)]; if (hit) return hit;
      return /\d/.test(raw) ? roundCm(metricText(raw)) : raw;
    };
    // LX-KATALOGTEXTE-0511: Titel ohne Unzen-Angabe (die Menge steht in der deutschen Fassung bzw. in der Beschreibung), Modellzeile nur mit Marke und Modellnummer
    const dropOz = text => string(text).replace(/\s*,?\s*\(?\s*\d+(?:[.,]\d+)?\s*oz\.?\s*\)?/gi,'').trim();
    const titleCm = text => german ? string(text).replace(/(\d+),(\d+)(?= cm\b)/g,(whole,a,b)=>Number(a+'.'+b)>=10?String(Math.round(Number(a+'.'+b))):whole) : string(text);
    const modelLine = product => {
      const brand = string(product.brand).trim(), model = string(product.model).trim();
      const flat = value => normal(value).replace(/[^a-z0-9]+/g,'');
      const descriptive = german && model && (model.includes('|') || flat(model) === flat(product.title) || (!/\d/.test(model) && (!brand || (model.match(/[A-Za-zÄÖÜäöü]{3,}/g) || []).length >= 2)));
      return [brand,descriptive ? '' : metricTitle(model)].filter(Boolean).join(' · ');
    };
    // LX-SIZEDE-START
    const isoPaper = {A0:[84.1,118.9],A1:[59.4,84.1],A2:[42,59.4],A3:[29.7,42],A4:[21,29.7],A5:[14.8,21],A6:[10.5,14.8]};
    const sizeWords = {'one size':'Einheitsgrösse',small:'Klein',medium:'Mittel',large:'Gross',circle:'Kreis',circular:'Rund',oval:'Oval',rectangle:'Rechteck',square:'Quadrat',heart:'Herz',star:'Stern',snowflake:'Schneeflocke',round:'Rund',bell:'Glocke',tree:'Baum',scalloped:'Wellenrand','pet paw':'Tierpfote',tag:'Etikett','bone shape':'Knochenform','fish shape':'Fischform',unscented:'Ohne Duft',king:'King (US)',queen:'Queen (US)','twin xl':'Twin XL (US)',twin:'Twin (US)'};
    const sizeDe = (raw, product, converted) => {
      const text = string(raw).trim(), base = string(converted);
      if (!german || !text) return base;
      if (id(product?.id) === '751' && /^16\s*oz\.?$/i.test(text)) return sizeWords['one size'];
      const iso = /^(A[0-6])\s*\(/.exec(text);
      if (iso && isoPaper[iso[1]]) return iso[1] + ' (' + isoPaper[iso[1]].map(value => String(value).replace('.',',')).join(' × ') + ' cm)';
      const ounces = /^(\d+(?:\.\d+)?)\s*oz\.?$/i.exec(text); if (ounces) return Math.round(Number(ounces[1]) * 29.5735) + ' ml';
      const feet = /^(\d+(?:\.\d+)?)\s*ft\.?$/i.exec(text); if (feet) return Math.round(Number(feet[1]) * 30.48) + ' cm';
      return base.replace(/\b(\d+)\s*(?:pieces|pcs)\b\.?/gi,'$1 Stück').replace(/^(\d+) pages \((\d+) sheets\)$/i,'$1 Seiten ($2 Blatt)')
        .replace(/^(one size|small|medium|large|circle|circular|oval|rectangle|square|heart|star|snowflake|round|bell|tree|scalloped|pet paw|tag|bone shape|fish shape|unscented|king|queen|twin xl|twin)(?=$|[\s(\-⌀])/i,(whole,word)=>sizeWords[word.toLowerCase()]).replace(/\bmagnetic$/i,'magnetisch');
    };
    // LX-SIZEDE-END
    const presentation = new Map();
    const presentationFor = product => presentation.get(id(product.id));
    const displaySize = (value, product, variantId = '') => {
      const raw = string(value), extra = product && presentationFor(product);
      const variant = list(extra?.variants).find(item => (variantId ? id(item.id) === id(variantId) : true) && item.originalSize === raw);
      if (variant?.shapeKey) return t(variant.shapeKey);
      return string(variant?.displaySizeCh) || sizeDe(raw,product,roundCm(metricText(raw)));
    };
    const joinSizeLabels = (labels, value) => {const u=[...new Set(labels)], cmp=(a,b)=>a.localeCompare(b,config.locale||'de',{numeric:true});if(u.length===1)return u[0];const eu=u.filter(x=>/^EU\s/.test(x));if(eu.length)return eu.sort(cmp).join(' / ');const m=u.map(x=>/^(\d+(?:,\d+)?) (ml|g)$/.exec(x));if(u.length&&m.every(Boolean)&&new Set(m.map(x=>x[2])).size===1){const n=m.map(x=>Number(x[1].replace(',','.'))).sort((p,q)=>p-q), f=v=>String(v).replace('.',',');return n[0]===n[n.length-1]?u[0]:f(n[0])+'–'+f(n[n.length-1])+' '+m[0][2];}return sizeDe(value,null,roundCm(metricText(value)));};
    /* LX-KATALOGTEXTE-0511 (Korrektur 06.11.2026): deutsche Modelltitel (Vorrang vor titleDe der Daten, das teils selbst englisch ist); ohne Eintrag der bisherige Titel */
    const lxTitelDe = {"3":"Leinwand","19":"Keramik-Tasse, weiss glänzend","71":"Unisex-T-Shirt Staple | Bella + Canvas 3001","83":"Kissen mit Allover-Druck","84":"Stoffbeutel mit Allover-Druck","145":"Unisex-Sweatshirt mit Rundhalsausschnitt | Gildan 18000","171":"Premium-Fotoposter auf Luster-Papier","181":"Transparente Hülle für iPhone®","206":"Klassische Dad-Cap | Yupoong 6245CM","242":"Yoga-Leggings mit Allover-Druck","267":"Transparente Hülle für Samsung®","268":"Poster auf mattem Premium-Papier","272":"Badeanzug mit Allover-Druck","279":"Rucksack mit Allover-Druck","282":"Sport-BH mit Allover-Druck","304":"Gerahmtes Poster auf mattem Premium-Papier","320":"Unisex-Sweatshirt aus Recyclingmaterial mit Allover-Druck","358":"Kiss-Cut-Aufkleber","367":"Öko-Stoffbeutel | Econscious EC8000","388":"Unisex-Hoodie aus Recyclingmaterial mit Allover-Druck","390":"Unisex-Bomberjacke mit Allover-Druck","400":"Herren-Jogginghose aus Recyclingmaterial mit Allover-Druck","438":"Klassisches Unisex-T-Shirt | Gildan 5000","456":"Unisex-Bio-Baumwoll-T-Shirt Creator 2.0 | Stanley/Stella STTU169","474":"Spiral-Notizbuch","518":"Mauspad","586":"Schweres Unisex-T-Shirt, stückgefärbt | Comfort Colors 1717","601":"Robuste Hülle für iPhone® (Tough Case)","656":"Magnete mit Konturschnitt","684":"Schlanke Snap-Hülle für Samsung","686":"Robuste Hülle für Samsung (Tough Case)","788":"Trinkflasche aus Edelstahl mit Strohhalm-Deckel","798":"Robuste MagSafe-Hülle für iPhone® (Tough Case)","821":"Unisex-Bio-Hoodie, mittelschwer, Drummer 2.0 | Stanley/Stella SASU009","896":"Slip-Kleid mit Allover-Druck","1483":"Herren-Boardshorts mit Allover-Druck","1552":"Alltags-Umhängetasche | QS309"};
    const titleForProduct = product => {
      const extra = presentationFor(product);
      return titleCm(metricTitle(german && (lxTitelDe[id(product.id)] || string(extra?.titleDe) || string(product.titleDe)) || (german ? dropOz(product.title) : product.title)));
    };
    const grid = root.querySelector('[data-lcl-grid]');
    const message = root.querySelector('[data-lcl-message]');
    const result = root.querySelector('[data-lcl-results]');
    const search = root.querySelector('[data-lcl-search]');
    const activeFilters = root.querySelector('[data-lcl-active-filters]');
    const globalSearch = root.querySelector('[data-lcl-global-search]');
    const types = root.querySelector('[data-lcl-types]');
    const groupNav = root.querySelector('[data-lcl-groups]');
    const groupSelect = root.querySelector('[data-lcl-group-select]');
    const subcategoryNav = root.querySelector('[data-lcl-subcategories]');
    const sortSelect = root.querySelector('[data-lcl-sort]');
    const colorFilter = root.querySelector('[data-lcl-color-filter]');
    const sizeFilter = root.querySelector('[data-lcl-size-filter]');
    const pageText = root.querySelector('[data-lcl-page]');
    const pagination = root.querySelector('[data-lcl-pagination]');
    const previous = root.querySelector('[data-lcl-previous]');
    const next = root.querySelector('[data-lcl-next]');
    const retry = root.querySelector('[data-lcl-retry]');
    const buttons = Array.from(root.querySelectorAll('[data-lcl-audience]'));
    const categoryShortcuts = Array.from(root.querySelectorAll('[data-lcl-category-shortcut]'));
    const initialCategory = id(new URL(location.href).searchParams.get('catalog_category'));
    const initialProduct = id(new URL(location.href).searchParams.get('catalog_product'));
    const dialog = root.querySelector('[data-lcl-dialog]');
    const detailBody = root.querySelector('[data-lcl-detail]');
    const detailTitle = root.querySelector('[data-lcl-detail-title]');
    let products = [], categories = new Map(), audience = 'all', group = 'all', page = 1, loaded = false, loading = false, trigger = null, detailToken = 0;
    const shardCache = new Map();
    const detailsCache = new Map();
    const button = (text, fn, className = 'lcl-button') => {
      const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', fn); return node;
    };
    const showMessage = (text, error = false) => {
      message.textContent = text; message.hidden = !text; message.setAttribute('role', error ? 'alert' : 'status');
    };
    const categoryPath = product => list(product.productType?.categoryPath || product.primaryCategoryPath);
    const categoryIds = product => Array.isArray(product.categoryIds) ? unique(product.categoryIds.map(id)) : unique([...categoryPath(product).map(c => id(c.id)), id(product.main_category_id)]);
    const matchesAudience = (product, target = audience) => {
      if (target === 'all') return true;
      if (target === 'unisex') return /\bunisex\b/i.test(product.title);
      if (target === 'baby') return list(product.audiences).includes('kids') && product.baby === true && categoryIds(product).includes('14');
      return list(product.audiences).includes(target);
    };
    let lxVids = null; /* LX-NURBESTELLBAR-0511 */
    const variantsFor = product => list(product.variants).filter(v => id(v.id) && (lxVids === null || lxVids.has(id(v.id)))); /* LX-NURBESTELLBAR-0511 */
    const colorValue = color => Object.prototype.hasOwnProperty.call(color,'color') ? string(color.color) : string(color.name);
    const colorKey = color => [colorValue(color), hex(color.colorCode || color.color_code || color.code || color.hex) || '', hex(color.colorCode2 || color.color_code2 || color.code2) || ''].join('|');
    const colorsFor = product => {
      const raw = variantsFor(product).length ? variantsFor(product) : list(product.colors);
      const seen = new Set();
      return raw.filter(color => { const key = colorKey(color); if (!colorValue(color) || seen.has(key)) return false; seen.add(key); return true; });
    };
    const sizesFor = product => unique(variantsFor(product).length ? variantsFor(product).map(v => string(v.size)) : list(product.sizes).map(string)).sort(sortSizes);
    const isDetailsKnown = product => product.variantState === 'complete' || product.detailStatus === 'verified';
    const materialParts = variant => list(variant?.material).filter(part=>typeof part.name==='string' && part.name.trim());
    const materialLabel = variant => materialParts(variant).map(part=>{
      const nameKey=normal(part.name).replace(/\s+/g,' ').trim().replace(/[\s,;.]+$/,'');const name=materialNames[nameKey]?t(materialNames[nameKey]):(textHit('material',nameKey)??part.name);
      const percentage=Number(part.percentage);
      return part.percentage!==null && part.percentage!==undefined && part.percentage!=='' && Number.isFinite(percentage) && percentage>=0 && percentage<=100 ? `${percentage}% ${name}` : name;
    }).join(' · ');
    const materialSuspicious = variant => {const parts=materialParts(variant);if(!parts.length)return false;const values=parts.map(part=>part.percentage===null||part.percentage===undefined||part.percentage===''?null:Number(part.percentage));return values.some(value=>value!==null&&(!Number.isFinite(value)||value<0||value>100)) || (values.every(value=>value!==null)&&Math.abs(values.reduce((a,b)=>a+b,0)-100)>0.1);};
    const materialKey = variant => materialParts(variant).map(part=>[normal(part.name).trim(),part.percentage===null||part.percentage===undefined||part.percentage===''?'':String(Number(part.percentage))].join(':')).sort().join('|');
    const shopOffersByPrintful = new Map();
    list(config.shopVariantOffers).forEach(offer=>{if(!offer || !id(offer.printfulVariantId))return;const key=id(offer.printfulVariantId);if(!shopOffersByPrintful.has(key))shopOffersByPrintful.set(key,[]);shopOffersByPrintful.get(key).push(offer);});
    const validatedOffer = offer => {
      if(!offer || offer.currency!=='CHF' || !string(offer.priceFormatted).trim() || !id(offer.variantId) || Number(offer.variantId)<=0 || !id(offer.shopifyProductId) || Number(offer.shopifyProductId)<=0) return null;
      try {const url=new URL(string(offer.url),location.href);if(url.origin!==location.origin || url.username || url.password || !/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/[^/]+\/?$/i.test(url.pathname) || url.searchParams.get('variant')!==id(offer.variantId)) return null;return {...offer,title:metricText(decodeEntities(offer.title)),priceFormatted:decodeEntities(offer.priceFormatted),url:url.href};} catch{return null;}
    };
    const offersFor = variant => {
      const rows=shopOffersByPrintful.get(id(variant?.id)) || [], grouped=new Map();let invalid=false;
      rows.forEach(row=>{const offer=validatedOffer(row);if(!offer){invalid=true;return;}const key=id(offer.variantId);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(offer);});
      const offers=[];grouped.forEach(group=>{const identities=new Set(group.map(offer=>JSON.stringify([id(offer.variantId),id(offer.shopifyProductId),offer.currency,offer.priceFormatted,offer.url])));if(identities.size===1)offers.push(group[0]);else invalid=true;});
      return {offers,requiresChoice:offers.length>1 || invalid};
    };
    const swatch = color => {
      const node = el('span', 'lcl-swatch');
      const first = hex(color.colorCode || color.color_code || color.code || color.hex), second = hex(color.colorCode2 || color.color_code2 || color.code2);
      if (first) { node.style.backgroundColor = first; if (second) node.style.backgroundImage = `linear-gradient(135deg, ${first} 50%, ${second} 50%)`; }
      else node.classList.add('lcl-swatch--unknown');
      node.setAttribute('aria-hidden', 'true'); return node;
    };
    const appendImage = (container, url, alt, className = '') => {
      container.replaceChildren();
      const src = imageUrl(url);
      if (!src) { container.append(el('span', 'lcl-image-missing', t('image_unavailable'))); return; }
      const image = el('img', className); image.src = src; image.alt = alt; image.loading = 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => { if(image.parentElement===container) container.replaceChildren(el('span', 'lcl-image-missing', t('image_unavailable'))); }, {once:true});
      container.append(image);
    };
    const matchesGroup = product => group === 'all' || categoryIds(product).includes(group);
    const matchesType = product => !types.value || categoryIds(product).includes(types.value);
    const matchesColorSize = (product, color = colorFilter.value, size = sizeFilter.value) => {
      if (!color && !size) return true;
      if (color && size) return list(product.colorSizes?.[color]).includes(size);
      if (color) return colorsFor(product).some(item => colorValue(item) === color);
      return sizesFor(product).includes(size);
    };
    const searchAliases={grusskarte:['greeting card'],grusskarten:['greeting card'],karte:['greeting card'],karten:['greeting card'],pintglas:['pint glass'],trinkglas:['glass'],holzornament:['wooden ornament'],holzornamente:['wooden ornament'],weihnachtsanhanger:['wooden ornament'],longsleeve:['long sleeve'],langarmshirt:['long sleeve'],langarmshirts:['long sleeve'],tasse:['mug'],tassen:['mug'],becher:['mug','tumbler'],kapuzenpullover:['hoodie'],rucksack:['backpack'],rucksacke:['backpack'],kissen:['pillow'],decke:['blanket'],decken:['blanket'],handtuch:['towel'],handtucher:['towel'],aufkleber:['sticker','decal'],stickers:['sticker'],decal:['sticker','decal'],decals:['sticker','decal'],kappe:['cap','hat'],kappen:['cap','hat'],pullover:['sweatshirt','hoodie'],beutel:['tote'],stoffbeutel:['tote'],jutebeutel:['tote'],bio:['organic'],hulle:['case'],hullen:['case'],handyhulle:['case'],handyhullen:['case']};
    const matchesSearch = product => {
      const query=normal(search.value).trim();if(!query)return true;
      const haystack=normal([product.title,titleForProduct(product),product.titleDe,product.brand,product.model,...list(presentationFor(product)?.searchAliases),...categoryIds(product).map(key=>categories.has(key)?titleFor(categories.get(key)):'')].filter(value=>typeof value==='string').join(' '));
      if(haystack.includes(query))return true;
      return query.split(/\s+/).every(term=>[term,...(searchAliases[term]||[])].some(alternative=>haystack.includes(alternative)));
    };
    const filterBase = () => products.filter(product => matchesAudience(product) && matchesGroup(product) && matchesType(product) && matchesSearch(product));
    const filterProducts = () => {
      const rows = filterBase().filter(product => matchesColorSize(product));
      if (sortSelect.value === 'name_asc' || sortSelect.value === 'name_desc') {
        const direction = sortSelect.value === 'name_desc' ? -1 : 1;
        rows.sort((a,b) => direction * titleForProduct(a).localeCompare(titleForProduct(b),config.locale || 'de-CH',{numeric:true}) || Number(a.id)-Number(b.id));
      } else if (sortSelect.value === 'variants_desc') rows.sort((a,b) => Number(b.lxCount || 0)-Number(a.lxCount || 0) || Number(a.id)-Number(b.id));
      return rows;
    };
    const categoryChildren = parent => Array.from(categories.values()).filter(c=>id(c.parent_id)===parent).sort((a,b)=>(Number(a.catalog_position)||0)-(Number(b.catalog_position)||0)||Number(a.id)-Number(b.id));
    const descendant = (category, ancestor) => {
      const seen = new Set(); let current=category;
      while(current && !seen.has(id(current.id))) { if(id(current.id)===ancestor) return true; seen.add(id(current.id)); current=categories.get(id(current.parent_id)); }
      return false;
    };
    const refreshTypes = () => {
      const value=types.value; types.replaceChildren(new Option(t('all_types'),''));
      const add = (parent,depth=0) => categoryChildren(parent).forEach(category=>{
        if(id(category.id)==='277') return;
        if(group==='all' || descendant(category,group)) {
          const count=products.filter(p=>matchesAudience(p) && matchesGroup(p) && categoryIds(p).includes(id(category.id))).length;
          const option=new Option('  '.repeat(depth)+(depth?'↳ ':'')+titleFor(category)+' ('+count+')',id(category.id));
          if(count>0)types.add(option); /* LX-NURBESTELLBAR-0511 */
        }
        add(id(category.id),depth+1);
      });
      if(group==='all') add('0'); else add(group);
      types.value=Array.from(types.options).some(o=>o.value===value)?value:'';
    };
    const refreshFacets = () => {
      const color=colorFilter.value,size=sizeFilter.value, base=filterBase();
      const colors=unique([color,...base.filter(p=>matchesColorSize(p,'',size)).flatMap(p=>colorsFor(p).map(c=>colorValue(c)))]).sort((a,b)=>colorName(a).localeCompare(colorName(b),config.locale||'de'));
      colorFilter.replaceChildren(new Option(t('all_colors'),''),...colors.map(value=>new Option(colorName(value),value))); colorFilter.value=colors.includes(color)?color:'';
      const sizes=unique([size,...base.flatMap(p=>colorFilter.value ? list(p.colorSizes?.[colorFilter.value]) : sizesFor(p))]).sort(sortSizes);
      sizeFilter.replaceChildren(new Option(t('all_sizes'),''),...sizes.map(value=>{const owners=base.filter(p=>sizesFor(p).includes(value));const labels=unique(owners.map(p=>displaySize(value,p)));return new Option(joinSizeLabels(labels,value),value);})); sizeFilter.value=sizes.includes(size)?size:'';
    };
    const renderGroups = () => {
      groupNav.replaceChildren(); groupSelect.replaceChildren();
      const entries=[{id:'all',title:t('all_categories')},...categoryChildren('0').filter(c=>id(c.id)!=='277').filter(c=>products.some(p=>categoryIds(p).includes(id(c.id))))]; /* LX-NURBESTELLBAR-0511 */
      entries.forEach(category=>{
        const key=category.id==='all'?'all':id(category.id);
        groupSelect.add(new Option(key==='all'?t('all_categories'):titleFor(category),key));
        const node=button('',()=>{group=key;audience='all';types.value='';page=1;refreshTypes();refreshFacets();render();},'lcl-group');
        node.dataset.group=key;node.setAttribute('aria-pressed',String(group===key));
        node.append(el('span','lcl-group-name',key==='all'?t('all_categories'):titleFor(category)),el('span','lcl-group-count',key==='all'?products.length:products.filter(p=>categoryIds(p).includes(key)).length));
        groupNav.append(node);
      });
    };
    const renderSubcategories = () => {
      if (!subcategoryNav) return;
      const parent = types.value || (group === 'all' ? '0' : group);
      subcategoryNav.replaceChildren();
      const entries = categoryChildren(parent).filter(category => id(category.id) !== '277');
      entries.forEach(category => {
        const key=id(category.id), count=products.filter(p=>matchesAudience(p) && matchesGroup(p) && categoryIds(p).includes(key)).length;
        if(!count)return;
        const node=button(titleFor(category)+' · '+count,()=>{types.value=key;page=1;refreshFacets();render();},'lcl-subcategory');
        node.dataset.categoryId=key;subcategoryNav.append(node);
      });
      if(types.value){const selectedCategory=categories.get(types.value);const parentId=id(selectedCategory?.parent_id);const back=button(t('parent_category'),()=>{types.value=parentId && parentId!==group && parentId!=='0'?parentId:'';page=1;refreshFacets();render();},'lcl-subcategory lcl-subcategory--back');subcategoryNav.prepend(back);}
      subcategoryNav.hidden=!subcategoryNav.childElementCount;
    };
    const renderCard = product => {
      const card = el('article', 'lcl-card'); card.dataset.productId = id(product.id);
      const image = button('', () => openDetails(product, card.querySelector('.lcl-card-cta')), 'lcl-card-image'); image.tabIndex = -1; image.setAttribute('aria-hidden','true');
      appendImage(image, presentationFor(product)?.reference?.approved===true ? presentationFor(product).reference.url : string(product.image?.url || product.image), titleForProduct(product));
      const copy = el('div','lcl-card-copy');
      if (product.brand) copy.append(el('p','lcl-brand', product.brand));
      const category=categoryIds(product).includes(id(product.main_category_id)) ? categories.get(id(product.main_category_id)) : null;
      if(category) copy.append(el('p','lcl-category-name',titleFor(category)));
      copy.append(el('h3','',titleForProduct(product)));
      const colors = colorsFor(product), sizes = sizesFor(product);
      if (colors.length) {
        const row = el('div','lcl-card-colors'); row.setAttribute('aria-label', t('colors'));
        colors.slice(0,8).forEach(color => { const chip = el('span','lcl-card-color'); chip.title = colorName(colorValue(color)); chip.setAttribute('aria-label',chip.title); chip.append(swatch(color)); row.append(chip); });
        if (colors.length > 8) row.append(el('span','lcl-more',t('more_colors',{count:colors.length-8}))); copy.append(row);
      }
      if (sizes.length) copy.append(el('p','lcl-card-sizes',sizes.slice(0,9).map(value=>displaySize(value,product)).join(' · ') + (sizes.length > 9 ? ' · ' + t('more_sizes',{count:sizes.length-9}) : '')));
      if (!isDetailsKnown(product)) copy.append(el('p','lcl-small',t(product.detailStatus === 'error' ? 'details_error' : 'details_pending')));
      if (product.is_discontinued === true) copy.append(el('p','lcl-small',t('discontinued')));
      const buy = lxCardCta(product); if (buy) copy.append(buy); /* LX-NURBESTELLBAR-0511 */ const cta = button(t('details'), () => openDetails(product, cta),'lcl-card-cta'); copy.append(cta); card.append(image,copy); return card;
    };
    const render = (moveFocus = false) => {
      if (!loaded) return;
      renderSubcategories();
      const filtered = filterProducts(), pages = Math.ceil(filtered.length / 12);
      page = Math.max(1, Math.min(page, pages || 1));
      grid.replaceChildren(...filtered.slice((page-1)*12,page*12).map(renderCard));
      result.textContent = t(filtered.length===1?'results_one':'results',{count:filtered.length}); /* LX-NURBESTELLBAR-0511 */
      const sizeOwners=filterBase().filter(p=>sizesFor(p).includes(sizeFilter.value)), sizeLabels=unique(sizeOwners.map(p=>displaySize(sizeFilter.value,p)));
      const chosenFilters=[audience!=='all'?t(audience):'',group!=='all'&&categories.has(group)?titleFor(categories.get(group)):'',types.value&&categories.has(types.value)?titleFor(categories.get(types.value)):'',colorFilter.value?colorName(colorFilter.value):'',joinSizeLabels(sizeLabels,sizeFilter.value)];
      const active=unique(chosenFilters);activeFilters.replaceChildren();activeFilters.hidden=!active.length;
      if(active.length){activeFilters.append(el('span','lcl-active-label',t('active_filters')));active.forEach(value=>activeFilters.append(el('span','lcl-filter-chip',value)));}
      const conflict=!filtered.length && search.value.trim() && active.length;
      showMessage(filtered.length ? '' : conflict?t('empty_filtered',{query:search.value.trim(),filters:active.join(' · ')}):t(products.length?'empty':'none_orderable')); root.classList.toggle('lcl-no-models',!products.length); /* LX-NURBESTELLBAR-0511 */
      globalSearch.hidden=!conflict;
      pageText.textContent = t('page',{page,pages:pages||1}); pagination.hidden = pages < 2;
      previous.disabled = page <= 1; next.disabled = page >= pages;
      root.dataset.audience = audience; root.dataset.group = group; groupSelect.value=group;
      groupNav.querySelectorAll('[data-group]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.group===group))); root.dataset.filteredCount = String(filtered.length); root.dataset.currentPage = String(page);
      root.querySelector('[data-lcl-unisex-hint]').hidden = audience !== 'unisex';
      categoryShortcuts.forEach(node=>{const key=id(node.dataset.lclCategoryShortcut);node.hidden=!categories.has(key)||!products.some(p=>categoryIds(p).includes(key)); /* LX-NURBESTELLBAR-0511 */ node.disabled=false;node.setAttribute('aria-pressed',String(group==='all' && audience==='all' && types.value===key && !search.value.trim() && !colorFilter.value && !sizeFilter.value));});
      buttons.forEach(node => { const selected = node.dataset.lclAudience === audience && !(node.dataset.lclAudience==='all' && categoryShortcuts.some(shortcut=>shortcut.getAttribute('aria-pressed')==='true')); node.setAttribute('aria-pressed',String(selected)); node.hidden=node.dataset.lclAudience!=='all'&&!products.some(p=>matchesAudience(p,node.dataset.lclAudience)); /* LX-NURBESTELLBAR-0511 */ const count = node.querySelector('[data-lcl-audience-count]'); if(count) count.textContent = String(products.filter(p => matchesAudience(p,node.dataset.lclAudience)).length); });
      if (moveFocus) { result.focus({preventScroll:true}); result.scrollIntoView({block:'start',behavior:'auto'}); }
    };
    const readAsset = async url => {
      const safe = assetUrl(url); if (!safe) throw new Error('Invalid catalogue asset');
      const response = await fetch(safe,{method:'GET',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error(`Catalogue HTTP ${response.status}`);
      return response.json();
    };
    // LX-KATALOGTEXTE-0511: deutsche Katalogtexte (Beschreibung, Positionen, Optionen, Techniken, Regionen, Material). Nur bei deutscher Seitensprache, erst beim ersten Öffnen einer Detailansicht geladen; fehlt die Datei oder ein Eintrag, bleibt der englische Originaltext.
    let textsDe = null, textsPending = null, textsFailedAt = 0;
    const loadTexts = async () => {
      if (!german || textsDe || !config.textsAsset) return textsDe;
      if (!textsPending && textsFailedAt && Date.now() - textsFailedAt < 60000) return textsDe;
      textsPending = textsPending || readAsset(config.textsAsset);
      try { const raw = await textsPending; if (raw && raw.schema === 1 && raw.beschreibungen && typeof raw.beschreibungen === 'object') textsDe = raw; else textsFailedAt = Date.now(); }
      catch { textsPending = null; textsFailedAt = Date.now(); }
      return textsDe;
    };
    // Wartezeit auf die Textdatei begrenzen (hängende Verbindung): danach Originaltext; die Datei lädt im Hintergrund weiter und gilt ab dem nächsten Öffnen
    /* LX-KATALOGTEXTE-0511 (Korrektur 06.11.2026): nach dem ersten Zeitüberschreiten nicht bei jedem Öffnen erneut 2,5 s warten; die Datei lädt weiter, und trifft sie ein, wird die offene Detailansicht einmal neu gezeichnet (nur wenn die Auswahl unverändert ist) */
    let textsTimedOut = false;
    const loadTextsLimited = () => { if (textsTimedOut && textsPending && !textsDe) return Promise.resolve(textsDe); textsTimedOut = false; let timer; return Promise.race([loadTexts(), new Promise(resolve => { timer = setTimeout(() => { if (textsPending && !textsDe) textsTimedOut = true; resolve(); }, 2500); })]).finally(() => clearTimeout(timer)); };
    const lxTextsNachtragen = (full, token) => {
      if (!german || textsDe || !textsPending) return;
      const wartet = textsPending, auswahl = () => [dialog.dataset.variantId, dialog.dataset.color, dialog.dataset.size].join('|'), vorher = auswahl();
      wartet.then(() => { if (wartet !== textsPending || !textsDe || token !== detailToken || !dialog.open || auswahl() !== vorher) return; renderDetails(full); }, () => {});
    };
    const own = (object, key) => object && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
    const textHit = (area, value, productId) => {
      const key = string(value);
      if (!textsDe || !key) return undefined;
      const special = productId === undefined ? undefined : own(own(own(textsDe, 'ausnahmen'), area), key);
      const hit = (special === undefined ? undefined : own(special, id(productId))) ?? own(own(textsDe, area), key);
      return typeof hit === 'string' && hit ? hit : undefined;
    };
    const textDe = (area, value, productId) => textHit(area, value, productId) ?? string(value);
    const hashText = text => { let h = 0x811c9dc5; for (let k = 0; k < text.length; k++) { h ^= text.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
    // Übersetzung nur, wenn der Herstellertext noch derselbe ist wie bei der Übersetzung (Quellenhash); sonst bleibt der Originaltext
    const descriptionDe = product => {
      const hit = textsDe ? own(textsDe.beschreibungen, id(product.id)) : undefined;
      if (typeof hit !== 'string') return '';
      const stamp = own(textsDe.quellenhash, id(product.id));
      if (typeof stamp === 'string' && !(typeof product.description === 'string' && hashText(product.description) === stamp)) return '';
      return hit.trim();
    };
    /* LX-NURBESTELLBAR-0511: nur Modelle mit bestellbarem Shopangebot (Besitzerentscheid 05.11.2026) */
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
        return {...p,lxCount:byModel.get(id(p.id)).length,colors:list(p.colors).filter(c=>colors.has(colorValue(c))),sizes:list(p.sizes).filter(s=>sizes.has(s)),colorSizes:Object.fromEntries(Object.entries(p.colorSizes||{}).map(([key,values])=>[key,list(values).filter(s=>pairs.get(key)?.has(s))]))};
      });
      /* Schuh-Satz nur, wenn ein sichtbares Modell Europa-Grössen zeigt */
      if(products.some(p=>list(p.sizes).some(s=>/^EU\b/i.test(displaySize(s,p))))){[['.lcl-notice','notice'],['.lcl-dialog-notice','dialog_notice']].forEach(([sel,key])=>{const n=root.querySelector(sel);if(n)n.textContent=t(key)+' '+t('notice_shoes');});}
    };
    const lxCardCta = product => {
      const offer=lxCardOffer.get(id(product.id));if(!offer)return null;
      const link=el('a','lcl-button lcl-design-cta lcl-card-design',t('design_cta'));link.href=lxDesignUrl(offer.url);link.dataset.lclCardDesign='';
      link.setAttribute('aria-label',t('design_cta')+': '+titleForProduct(product));return link;
    };
    const load = async () => {
      if (loading || loaded) return;
      loading = true; retry.hidden = true; grid.setAttribute('aria-busy','true'); showMessage(t('loading'));
      try {
        lxEarly(); /* LX-NURBESTELLBAR-0511 */ const raw = await readAsset(config.assets?.index);
        if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.products) || raw.products.length > 1500 || !Array.isArray(raw.categories) || !raw.categories.length) throw new Error('Invalid catalogue data');
        products = raw.products.filter(p => p && id(p.id) && typeof p.title === 'string');
        if(config.presentationAsset){try{const extra=await readAsset(config.presentationAsset);if(extra?.schemaVersion===1)list(extra.products).forEach(row=>{if(id(row.productId))presentation.set(id(row.productId),row);});}catch{root.dataset.presentationState='unavailable';}}
        if (products.length !== raw.products.length || !products.length) throw new Error('Unverified catalogue rows');
        categories = new Map(list(raw.categories).filter(c => id(c.id) && typeof c.title === 'string').map(c => [id(c.id),c]));
        await lxPrepare(); /* LX-NURBESTELLBAR-0511 */ loaded = true; root.dataset.sourceCount = String(products.length); renderGroups(); refreshTypes();
        if(initialCategory && categories.has(initialCategory) && Array.from(types.options).some(option=>option.value===initialCategory)) types.value=initialCategory;
        refreshFacets(); render();
        if(initialProduct){const product=products.find(p=>id(p.id)===initialProduct);if(product)openDetails(product,null);else showMessage(t('model_unavailable')); /* LX-NURBESTELLBAR-0511 */}
        root.querySelector('[data-lcl-partial]').hidden = raw.sourceStatus?.state === 'verified' || raw.sourceStatus?.complete === true;
      } catch (lxErr) { const lxReload = !!lxErr && lxErr.message === 'LX_RELOAD'; /* LX-NURBESTELLBAR-0511 */ showMessage(t(lxReload?'reload_needed':'load_error'),true); retry.hidden = lxReload; root.dataset.loadState = 'error'; }
      finally { loading = false; grid.setAttribute('aria-busy','false'); if(loaded) root.dataset.loadState = 'ready'; }
    };
    const productDetails = async product => {
      if (detailsCache.has(id(product.id))) return detailsCache.get(id(product.id));
      if (Array.isArray(product.variants) && isDetailsKnown(product)) return product;
      const key = string(product.detailShardKey || product.detailAssetKey);
      if (!key || !config.assets?.details?.[key]) return product;
      let pending = shardCache.get(key);
      if (!pending) { pending = readAsset(config.assets.details[key]); shardCache.set(key,pending); }
      try {
        const raw = await pending;
        if (!raw || raw.schemaVersion !== 1 || raw.key !== key) throw new Error('Invalid model detail shard');
        const rows = Array.isArray(raw) ? raw : Array.isArray(raw.products) ? raw.products : raw.products && typeof raw.products === 'object' ? Object.values(raw.products) : [];
        rows.forEach(row => { if (id(row.id)) detailsCache.set(id(row.id),row); });
        if (!detailsCache.has(id(product.id))) throw new Error('Missing model details');
        return {...product,...detailsCache.get(id(product.id))};
      } catch (error) { shardCache.delete(key); throw error; }
    };
    const closeDialog = () => { detailToken++; dialog.close(); };
    root.querySelector('[data-lcl-close]').addEventListener('click',closeDialog);
    dialog.addEventListener('close',()=>{ detailToken++; if(trigger?.isConnected) trigger.focus(); });
    dialog.addEventListener('cancel',()=>{ detailToken++; });
    async function openDetails(product, opener) {
      trigger = opener; const token = ++detailToken;
      detailTitle.textContent = titleForProduct(product); dialog.dataset.productId = id(product.id); delete dialog.dataset.variantId;
      detailBody.replaceChildren(el('p','lcl-detail-loading',t('loading_details')));
      if (!dialog.open) dialog.showModal();
      // LX-KATALOGTEXTE-0511: deutsche Textdatei parallel zu den Modelldetails laden, höchstens 2,5 s warten (scheitert sie oder ist sie zu langsam, bleibt es beim Original)
      try { const [full] = await Promise.all([productDetails(product), loadTextsLimited()]); if(token === detailToken && dialog.open) { renderDetails(full); lxTextsNachtragen(full, token); } }
      catch { if(token === detailToken && dialog.open) detailBody.replaceChildren(el('p','lcl-detail-loading',t('details_error')),button(t('retry'),()=>openDetails(product,opener))); }
    }
    function renderDetails(product) {
      detailBody.replaceChildren();
      const variants = variantsFor(product), colors = colorsFor(product), known = isDetailsKnown(product);
      const explicitSelection=Boolean(colorFilter.value || sizeFilter.value);
      const mappedAvailable=variants.find(v=>{const match=offersFor(v);return !match.requiresChoice && match.offers.length===1 && match.offers[0].available===true;}) || variants.find(v=>offersFor(v).offers.some(offer=>offer.available===true));
      let selected = (explicitSelection ? variants.find(v=>(!colorFilter.value || v.color===colorFilter.value)&&(!sizeFilter.value || v.size===sizeFilter.value)) : mappedAvailable) || variants[0] || null;
      let selectedColor = selected ? colorKey(selected) : colors[0] ? colorKey(colors[0]) : '';
      const visual = el('div','lcl-detail-visual'), photo = el('div','lcl-detail-image'), photoLabel = el('p','lcl-photo-label'); visual.append(photo,photoLabel);
      const thumbnails=el('div','lcl-detail-thumbnails');thumbnails.setAttribute('role','group');thumbnails.setAttribute('aria-label',t('variant_gallery'));visual.append(thumbnails);
      const photoGroups=new Map();variants.forEach(variant=>{const url=imageUrl(variant.image);if(!url)return;if(!photoGroups.has(url))photoGroups.set(url,[]);photoGroups.get(url).push(variant);});
      const reference=presentationFor(product)?.reference;const referenceUrl=reference?.approved===true?imageUrl(reference.url):null;let referencePreview=Boolean(referenceUrl && !explicitSelection);
      const panel = el('div','lcl-detail-panel');
      const metaText = modelLine(product); if (metaText) panel.append(el('p','lcl-detail-meta',metaText));
      if(known && variants.length) {const count=el('p','lcl-small',(variants.length===1?t('orderable_variants_one'):t('orderable_variants'/* LX-NURBESTELLBAR-0511 */,{count:variants.length}))/* LX-KATALOGTEXTE-0511: gemeinsame Zeile mit LX-NURBESTELLBAR-0511: nur bestellbare Ausführungen, Einzahl bei einer */);count.dataset.lclOriginalVariants=String(variants.length);panel.append(count);}
      const priceBox=el('div','lcl-shop-price');priceBox.dataset.lclShopPrice='';panel.append(priceBox);
      let priceChoiceVariant='',priceChoiceId='';
      const designUrl=u=>{try{const x=new URL(u,location.href);x.hash='lspod-start';return x.href;}catch{return u;}};
      const orderableVariants=variants.filter(v=>offersFor(v).offers.some(o=>o.available!==false));
      const renderPrice = () => {
        const keepFocus=priceBox.contains(document.activeElement), key=id(selected?.id);if(priceChoiceVariant!==key){priceChoiceVariant=key;priceChoiceId='';}
        const data=offersFor(selected);if(data.requiresChoice&&data.offers.length>1&&!priceChoiceId){const first=data.offers.find(item=>item.available!==false);if(first)priceChoiceId=id(first.variantId);} /* LX-NURBESTELLBAR-0511 */ const offer=data.requiresChoice ? data.offers.find(item=>id(item.variantId)===priceChoiceId) : data.offers[0];
        priceBox.replaceChildren(el('p','lcl-price-label',t('shop_price_label')));priceBox.dataset.printfulVariantId=key;priceBox.dataset.shopVariantId=offer?id(offer.variantId):'';
        let chooser=null;
        if(data.requiresChoice && data.offers.length){const label=el('label','lcl-shop-offer-label');label.append(el('span','',t('shop_offer_select')));chooser=el('select','lcl-shop-offer-select');chooser.dataset.lclShopOfferSelect='';chooser.add(new Option(t('shop_offer_placeholder'),''));(data.offers.some(item=>item.available!==false)?data.offers.filter(item=>item.available!==false):data.offers /* LX-NURBESTELLBAR-0511 */).forEach(item=>chooser.add(new Option((item.title||t('shop_offer_fallback'))+' · '+item.priceFormatted,id(item.variantId))));chooser.value=priceChoiceId;chooser.addEventListener('change',()=>{priceChoiceId=chooser.value;renderPrice();});label.append(chooser);priceBox.append(label);}
        const switchBtn=()=>button(t('switch_orderable'),()=>{referencePreview=false;selected=orderableVariants.find(v=>colorKey(v)===selectedColor)||orderableVariants[0];selectedColor=colorKey(selected);update();const c=priceBox.querySelector('[data-lcl-design-cta]');if(c)c.focus();},'lcl-design-switch');
        if(offer){priceBox.append(el('p','lcl-retail-price',offer.priceFormatted));if(offer.available===false){priceBox.append(el('p','lcl-price-pending lcl-not-orderable',t('offer_unavailable')));if(orderableVariants.length)priceBox.append(switchBtn());}else{const cta=el('a','lcl-button lcl-design-cta',t('design_cta'));cta.href=designUrl(offer.url);cta.dataset.lclDesignCta='';priceBox.append(cta);}const link=el('a','lcl-shop-product-link',t('shop_product_link'));link.href=offer.url;priceBox.append(link);}
        else if(data.offers.length)priceBox.append(el('p','lcl-price-pending',t('shop_price_ambiguous')));
        else if(!known||!variants.length||data.requiresChoice)priceBox.append(el('p','lcl-price-pending',t('shop_price_unknown')));
        else{priceBox.append(el('p','lcl-price-pending lcl-not-orderable',t(orderableVariants.length?'variant_not_orderable':'not_orderable')));if(orderableVariants.length)priceBox.append(switchBtn());}
        const reviews=el('div','lx-review-badge');if(offer && window.LuxeStyleProductReviews)window.LuxeStyleProductReviews.render(reviews,offer.reviews,{zero:t('reviews_zero'),summary:t('reviews_summary')},offer.shopifyProductId,config.locale||'de-CH');else reviews.hidden=true;priceBox.append(reviews);
        if(offer&&offer.available!==false)priceBox.append(el('p','lcl-small',t('shop_price_note')));if(keepFocus && chooser)chooser.focus({preventScroll:true});
      };

      const materialGroups=new Map();variants.forEach(variant=>{const key=materialKey(variant);if(!key||materialSuspicious(variant))return;if(!materialGroups.has(key))materialGroups.set(key,{label:materialLabel(variant),variants:[]});materialGroups.get(key).variants.push(variant);});
      const materialGroup=el('fieldset','lcl-choices lcl-material-choices'),materialSelect=el('select','lcl-material-select');materialSelect.setAttribute('aria-label',t('material_select'));materialSelect.dataset.lclMaterialSelect='';materialGroup.append(el('legend','',t('material_select')),materialSelect,el('p','lcl-small',t('material_choice_hint')));
      const unknownMaterial=new Option(t('material_unverified'),'');unknownMaterial.disabled=true;materialSelect.add(unknownMaterial);materialGroups.forEach((group,key)=>materialSelect.add(new Option(group.label,key)));
      const materialLive=el('p','lcl-material-live');materialLive.setAttribute('aria-live','polite');materialLive.setAttribute('role','status');materialGroup.append(materialLive);
      // LX-KATALOGTEXTE-0511: Originalmodell ohne Unzen-Angabe (deutsche Seite)
      const originalName = titleCm(metricTitle(german ? dropOz(product.title) : product.title));
      if (german ? titleForProduct(product)!==originalName : titleForProduct(product)!==product.title) panel.append(el('p','lcl-small',t('original_name')+': '+originalName));
      if (!known || !variants.length) panel.append(el('p','lcl-source-warning',t(product.detailStatus === 'error' ? 'details_error' : known ? 'no_variants' : 'details_pending')));
      const colorGroup = el('fieldset','lcl-choices'); colorGroup.append(el('legend','',t('color'))); const colorButtons = el('div','lcl-color-buttons'); colorGroup.append(colorButtons);
      const sizeGroup = el('fieldset','lcl-choices'); sizeGroup.append(el('legend','',t('size'))); const sizeButtons = el('div','lcl-size-buttons'); sizeGroup.append(sizeButtons);
      if(colors.length===1&&!/^(?:glossy|matte)$/i.test(colorValue(colors[0])))colorGroup.append(el('p','lcl-small',t('single_color',{color:colorName(colorValue(colors[0]))})));
      if(colors.length) panel.append(colorGroup); if(materialGroups.size>1) panel.append(materialGroup); if(variants.some(v=>v.size)) panel.append(sizeGroup);
      const variantContent = el('div','lcl-variant-content'); panel.append(variantContent);
      const modelInfo = el('div','lcl-model-info');
      const infoRow = (heading, values) => { const part = el('div','lcl-fact'); part.append(el('h4','',heading),el('p','',values.length ? values.join(' · ') : t('not_specified'))); modelInfo.append(part); };
      // LX-KATALOGTEXTE-0511: Techniken und Positionen deutsch (Wörterbuch der Textdatei; die festen Namen aus den Übersetzungsdateien haben Vorrang)
      infoRow(t('techniques'),unique(list(product.techniques).map(tech=>techniqueNames[string(tech.key)] ? t(techniqueNames[tech.key]) : textDe('techniken',string(tech.display_name || tech.displayName || tech.key)))));
      infoRow(t('placements'),unique(list(product.files).filter(file=>!['preview','mockup'].includes(string(file.type)) && string(file.id)!=='preview').map(file=>positionNames[normal(file.title)] ? t(positionNames[normal(file.title)]) : textDe('positionen',string(file.title || file.type),product.id))));
      modelInfo.append(el('p','lcl-small',t('geometry_note')));
      // LX-KATALOGTEXTE-0511: deutsche Beschreibung statt Originaltext (schon metrisch; metricText würde «15 Zoll» beim Laptop zu cm umrechnen), Hinweis dazu ehrlich
      const descriptionTranslated=descriptionDe(product);
      const description=descriptionTranslated?plainText(descriptionTranslated):metricText(plainText(product.description));
      if(description){const info=el('details','lcl-description');info.append(el('summary','',t('model_description')),el('p','lcl-small',descriptionTranslated?labelOr('original_note_translated',t('original_note')):t('original_note')),el('div','lcl-description-text',description));modelInfo.append(info);}
      // LX-KATALOGTEXTE-0511: Optionstitel und Optionswerte deutsch
      const options=list(product.options).filter(option=>typeof option.title==='string' && (option.values && typeof option.values==='object' || option.type==='single_line_text'));
      if(options.length){const info=el('details','lcl-description');info.append(el('summary','',t('catalogue_options')),el('p','lcl-small',t('options_note')));
        options.forEach(option=>{const values=Array.isArray(option.values)?option.values:option.values && typeof option.values==='object'?Object.values(option.values):[];const texts=values.map(value=>typeof value==='string'?value:typeof value==='number'?String(value):string(value?.title||value?.name)).filter(Boolean);const freeText=option.type==='single_line_text' && !texts.length;if(!texts.length && !freeText)return;const row=el('div','lcl-option-reference');row.append(el('h4','',metricText(textDe('optionstitel',plainText(option.title)))),el('p','',freeText?t('manufacturer_text_option'):texts.map(plainText).map(text=>metricText(textDe('optionswerte',text))).join(' · ')));info.append(row);});modelInfo.append(info);}
      const dimensions=product.dimensions;
      if(dimensions && typeof dimensions==='object' && Object.keys(dimensions).length){
        const info=el('details','lcl-description');info.append(el('summary','',t('dimensions')));
        const measurementKey=value=>string(value).toLocaleLowerCase().replace(/[\s\"″”]/g,'').replace(/[x✕]/g,'×');
        const dimensionLabel=value=>{const raw=String(value),converted=metricText(raw);const variant=variants.find(variant=>measurementKey(variant.size)===measurementKey(raw));if(variant){const native=displaySize(variant.size,product,variant.id);if(/\b(?:cm|mm|ml)\b/i.test(native))return native;}if(converted!==raw || /\b(?:cm|mm)\b/i.test(raw))return converted;return null;};
        const rows=Object.entries(dimensions).filter(([,value])=>['number','string'].includes(typeof value)).map(([key,value])=>[dimensionLabel(key)||key,dimensionLabel(value)]).filter(([,value])=>value!==null);
        rows.forEach(([key,value])=>info.append(el('p','',key===value?value:key+': '+value)));if(rows.length)modelInfo.append(info);
      }
      panel.append(modelInfo);
      detailBody.append(visual,panel);
      const update = () => {
        const focusedSizeId = sizeButtons.contains(document.activeElement) ? document.activeElement.dataset.variantId : null;
        const source = referencePreview && referenceUrl ? referenceUrl : selected && imageUrl(selected.image) ? selected.image : string(product.image?.url || product.image);
        appendImage(photo,source,titleForProduct(product) + (referencePreview ? ' – '+t('manufacturer_example') : selected?.color ? ' – '+selected.color : ''));
        if(referencePreview && Number(reference?.width)>0 && Number(reference.width)<600){const image=photo.querySelector('img');if(image)image.style.maxWidth=Math.min(Number(reference.width),600)+'px';}
        photoLabel.textContent = selected && imageUrl(selected.image) ? t('variant_image') : t('reference_image');
        thumbnails.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.imageUrl===source)));
        if(referencePreview)photoLabel.textContent=t('manufacturer_example');
        dialog.dataset.referencePhoto=String(referencePreview);
        thumbnails.hidden=photoGroups.size+(referenceUrl?1:0)<2;
        dialog.dataset.materialKey=materialKey(selected);materialSelect.value=materialGroups.has(materialKey(selected))?materialKey(selected):'';
        renderPrice();
        dialog.dataset.variantId = selected ? id(selected.id) : ''; dialog.dataset.color = selected ? string(selected.color) : ''; dialog.dataset.size = selected ? string(selected.size) : '';
        colorButtons.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.colorKey===selectedColor)));
        sizeButtons.replaceChildren();
        variants.filter(v=>colorKey(v)===selectedColor).sort((a,b)=>sortSizes(string(a.size),string(b.size))).forEach(variant=> {
          if (!variant.size) return;
          const size = button(displaySize(variant.size,product,variant.id),()=>{referencePreview=false;selected=variant;update();},'lcl-size'); size.dataset.variantId=id(variant.id);size.setAttribute('aria-pressed',String(selected?.id===variant.id));
          if(variant.in_stock===false){size.classList.add('lcl-size--unavailable');size.setAttribute('aria-label',`${displaySize(variant.size,product,variant.id)} · ${t('supplier_unavailable')}`);} sizeButtons.append(size);
        });
        if(focusedSizeId) Array.from(sizeButtons.children).find(node=>node.dataset.variantId===focusedSizeId)?.focus({preventScroll:true});
        variantContent.replaceChildren();
        const material = el('div','lcl-fact'); material.append(el('h4','',t('material')));
        const materialText=materialLabel(selected);material.append(el('p','',materialText || t('material_unknown')));if(materialSuspicious(selected))material.append(el('p','lcl-source-warning',t('material_source_issue')));variantContent.append(material);
        if(selected) {
          variantContent.append(el('p','lcl-stock',t(selected.in_stock===true?'supplier_available':selected.in_stock===false?'supplier_unavailable':'supplier_unknown')));
          const checked=product.detailSource?.checkedAt, stamp=typeof checked==='string'?Date.parse(checked):NaN;
          variantContent.append(el('p','lcl-small',Number.isFinite(stamp)?t('source_date',{date:new Intl.DateTimeFormat(config.locale||'de-CH',{dateStyle:'medium',timeZone:'Europe/Zurich'}).format(new Date(stamp))}):t('source_date_unknown')));
          const statuses=list(selected.availability_status), regions=selected.availability_regions && typeof selected.availability_regions==='object' ? selected.availability_regions : {};
          if(statuses.length || Object.keys(regions).length){const info=el('details','lcl-regions');info.append(el('summary','',t('regional_status')));const ul=el('ul');
            // LX-KATALOGTEXTE-0511: Regionsnamen deutsch (Wörterbuch der Textdatei), Statusschlüssel nie roh anzeigen
            const statusKnown = ['in_stock','out_of_stock','not_available','supplier_out_of_stock','stocked_on_demand'];
            const statusText = status => { const key = string(status); const fallback = german ? 'Status unbekannt' : key.replace(/_/g,' '); return statusKnown.includes(key) ? labelOr(key,labelOr('status_unknown',fallback)) : labelOr('status_unknown',fallback); };
            if(statuses.length)statuses.forEach(item=>ul.append(el('li','',`${textDe('regionen',string(regions[item.region]) || string(item.region))}: ${statusText(item.status)}`)));
            else Object.entries(regions).forEach(([key,name])=>ul.append(el('li','',textDe('regionen',typeof name==='string'?name:key))));
            info.append(ul);variantContent.append(info);}
          variantContent.append(el('p','lcl-small',t('region_note')));
        }
      };
      materialSelect.addEventListener('change',()=>{
        referencePreview=false;const group=materialGroups.get(materialSelect.value);if(!group)return;
        const currentColor=colorValue(selected||{}),currentSize=string(selected?.size);
        selected=group.variants.find(v=>colorValue(v)===currentColor && string(v.size)===currentSize) || group.variants.find(v=>string(v.size)===currentSize) || group.variants.find(v=>colorValue(v)===currentColor) || group.variants[0];
        selectedColor=colorKey(selected);update();materialLive.textContent=t('material_selection_changed',{material:materialLabel(selected),color:colorName(colorValue(selected))||t('no_color'),size:displaySize(string(selected?.size),product,selected?.id)||t('no_size')});
      });
      if(referenceUrl){const referenceChoice=button('',()=>{referencePreview=true;update();},'lcl-detail-thumbnail');referenceChoice.dataset.imageUrl=referenceUrl;referenceChoice.setAttribute('aria-label',t('manufacturer_example'));appendImage(referenceChoice,referenceUrl,t('manufacturer_example'));thumbnails.append(referenceChoice); }
      photoGroups.forEach((rows,url)=>{const first=rows[0];const label=[colorName(first.color),displaySize(first.size,product,first.id)].filter(Boolean).join(' · ');const choice=button('',()=>{referencePreview=false;selected=rows.find(v=>v.size===selected?.size)||rows[0];selectedColor=colorKey(selected);update();},'lcl-detail-thumbnail');choice.dataset.imageUrl=url;choice.dataset.variantId=id(first.id);choice.setAttribute('aria-label',label||t('variant_image'));appendImage(choice,url,label||titleForProduct(product));thumbnails.append(choice);});
      colors.forEach(color=>{const name=colorValue(color), choice=button('',()=>{
        referencePreview=false;const currentSize=string(selected?.size);selectedColor=colorKey(color);const matching=variants.filter(v=>colorKey(v)===selectedColor);
        selected=matching.find(v=>v.size===currentSize)||matching.find(v=>v.in_stock===true)||matching[0]||null;update();
      },'lcl-color-choice');choice.dataset.colorKey=colorKey(color);choice.append(swatch(color),el('span','',colorName(name)));colorButtons.append(choice);});
      update();
    }
    categoryShortcuts.forEach(node=>node.addEventListener('click',()=>{
      const key=id(node.dataset.lclCategoryShortcut);if(!loaded || !categories.has(key))return;
      audience='all';group='all';search.value='';colorFilter.value='';sizeFilter.value='';page=1;refreshTypes();
      if(!Array.from(types.options).some(option=>option.value===key))return;
      types.value=key;refreshFacets();render(true);
    }));
    buttons.forEach(node=>node.addEventListener('click',()=>{audience=node.dataset.lclAudience;if(audience==='all'){group='all';search.value='';types.value='';colorFilter.value='';sizeFilter.value='';}page=1;refreshTypes();refreshFacets();render();if(!loaded)load();}));
    groupSelect.addEventListener('change',()=>{group=groupSelect.value;audience='all';types.value='';page=1;refreshTypes();refreshFacets();render();});
    sortSelect.addEventListener('change',()=>{page=1;render();});
    types.addEventListener('change',()=>{page=1;refreshFacets();render();});
    colorFilter.addEventListener('change',()=>{page=1;refreshFacets();render();});
    sizeFilter.addEventListener('change',()=>{page=1;refreshFacets();render();});
    let searchTimer;search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;refreshFacets();render();},140);});
    globalSearch.addEventListener('click',()=>{audience='all';group='all';types.value='';colorFilter.value='';sizeFilter.value='';page=1;refreshTypes();refreshFacets();render(true);});
    root.querySelector('[data-lcl-reset]').addEventListener('click',()=>{audience='all';group='all';search.value='';types.value='';colorFilter.value='';sizeFilter.value='';page=1;refreshTypes();refreshFacets();render();});
    previous.addEventListener('click',()=>{if(page>1){page--;render(true);}});
    next.addEventListener('click',()=>{page++;render(true);});retry.addEventListener('click',load);
    if ('IntersectionObserver' in window) {const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load();}},{rootMargin:'250px'});observer.observe(root);}else load();
  }
  formatShopOptionValues(document);
  document.querySelectorAll('[data-luxe-clothing]').forEach(initialize);
  document.addEventListener('shopify:section:load',event=>{formatShopOptionValues(event.target);event.target.querySelectorAll('[data-luxe-clothing]').forEach(initialize);});
})();
/* lx-einheiten-0411 */
/* LX-NURBESTELLBAR-0511 */
