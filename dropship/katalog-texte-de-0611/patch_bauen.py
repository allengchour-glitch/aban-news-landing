#!/usr/bin/env python3
"""Baut aus den Originalen (*.orig) die geänderten Theme-Dateien für LX-KATALOGTEXTE-0511.
Jede Ersetzung muss genau EINMAL im Original vorkommen, sonst Abbruch. Ändert nichts anderes."""
import sys

D = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/bau/theme/'

def lesen(name):
    return open(D + name + '.orig', encoding='utf-8').read()

def ersetzen(text, alt, neu, name):
    n = text.count(alt)
    if n != 1:
        sys.exit('ABBRUCH %s: Muster %d mal gefunden (erwartet 1): %r' % (name, n, alt[:90]))
    return text.replace(alt, neu)

# ---------------------------------------------------------------- JS
N = 'assets__luxe-clothing.js'
js = lesen(N)

# 1) Lader + Nachschlagehilfen, direkt nach readAsset
alt = """      if (!response.ok) throw new Error(`Catalogue HTTP ${response.status}`);
      return response.json();
    };
"""
neu = alt + """    // LX-KATALOGTEXTE-0511: deutsche Katalogtexte (Beschreibung, Positionen, Optionen, Techniken, Regionen, Material). Nur bei deutscher Seitensprache, erst beim ersten Öffnen einer Detailansicht geladen; fehlt die Datei oder ein Eintrag, bleibt der englische Originaltext.
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
    const loadTextsLimited = () => { let timer; return Promise.race([loadTexts(), new Promise(resolve => { timer = setTimeout(resolve, 2500); })]).finally(() => clearTimeout(timer)); };
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
"""
js = ersetzen(js, alt, neu, N)

# 2) Textdatei zusammen mit den Modelldetails laden
alt = "      try { const full = await productDetails(product); if(token === detailToken && dialog.open) renderDetails(full); }\n"
neu = ("      // LX-KATALOGTEXTE-0511: deutsche Textdatei parallel zu den Modelldetails laden, höchstens 2,5 s warten (scheitert sie oder ist sie zu langsam, bleibt es beim Original)\n"
       "      try { const [full] = await Promise.all([productDetails(product), loadTextsLimited()]); if(token === detailToken && dialog.open) renderDetails(full); }\n")
js = ersetzen(js, alt, neu, N)

# 3) Techniknamen und Positionsnamen
alt = "string(tech.display_name || tech.displayName || tech.key))));\n      infoRow(t('placements')"
neu = "textDe('techniken',string(tech.display_name || tech.displayName || tech.key)))));\n      infoRow(t('placements')"
js = ersetzen(js, alt, neu, N)
alt = "t(positionNames[normal(file.title)]) : string(file.title || file.type))));\n"
neu = "t(positionNames[normal(file.title)]) : textDe('positionen',string(file.title || file.type),product.id))));\n"
js = ersetzen(js, alt, neu, N)
# Kommentarzeile vor der Technik-Zeile (Technik + Position)
alt = "      infoRow(t('techniques'),"
neu = "      // LX-KATALOGTEXTE-0511: Techniken und Positionen deutsch (Wörterbuch der Textdatei; die festen Namen aus den Übersetzungsdateien haben Vorrang)\n      infoRow(t('techniques'),"
js = ersetzen(js, alt, neu, N)

# 4) Beschreibung + Hinweis
alt = "      const description=metricText(plainText(product.description));\n      if(description){const info=el('details','lcl-description');info.append(el('summary','',t('model_description')),el('p','lcl-small',t('original_note')),"
neu = ("      // LX-KATALOGTEXTE-0511: deutsche Beschreibung statt Originaltext (schon metrisch; metricText würde «15 Zoll» beim Laptop zu cm umrechnen), Hinweis dazu ehrlich\n"
       "      const descriptionTranslated=descriptionDe(product);\n"
       "      const description=descriptionTranslated?plainText(descriptionTranslated):metricText(plainText(product.description));\n"
       "      if(description){const info=el('details','lcl-description');info.append(el('summary','',t('model_description')),el('p','lcl-small',descriptionTranslated?labelOr('original_note_translated',t('original_note')):t('original_note')),")
js = ersetzen(js, alt, neu, N)

# 5) Optionstitel und Optionswerte
alt = "      const options=list(product.options).filter("
neu = "      // LX-KATALOGTEXTE-0511: Optionstitel und Optionswerte deutsch\n      const options=list(product.options).filter("
js = ersetzen(js, alt, neu, N)
alt = "row.append(el('h4','',metricText(plainText(option.title))),el('p','',freeText?t('manufacturer_text_option'):texts.map(plainText).map(metricText).join(' · ')));"
neu = "row.append(el('h4','',metricText(textDe('optionstitel',plainText(option.title)))),el('p','',freeText?t('manufacturer_text_option'):texts.map(plainText).map(text=>metricText(textDe('optionswerte',text))).join(' · ')));"
js = ersetzen(js, alt, neu, N)

# 6) labelOr: Etiketten, die die Section/Locale (noch) nicht liefern, nie als «translation missing» anzeigen
alt = "    const german = /^de(?:-|$)/i.test(config.locale || '');\n"
neu = alt + """    // LX-KATALOGTEXTE-0511: Etikett nur nehmen, wenn es vorhanden und kein «translation missing» ist (Einspielreihenfolge von Section und Locale-Dateien ist dann unkritisch)
    const labelOr = (key, fallback) => { const text = string(labels[key]); return text && !/^translation missing/i.test(text) ? text : fallback; };
"""
js = ersetzen(js, alt, neu, N)

# 7) Einheiten und englische Wörter in Titel, Grössen, Farben (deutsche Seite; sichtbar schon vor dem Laden der Textdatei)
alt = "    const colorName = value => german && colorTranslations[lookupKey(value)] || string(value);\n"
neu = """    // LX-KATALOGTEXTE-0511: Farbnamen, die das Locale nicht kennt: wenige allgemeine Wörter und Masse (keine imperialen Einheiten)
    const colorFallback = {custom:'Individuell',wood:'Holz',satin:'Satin',dotted:'Gepunktet',denim_blue:'Jeansblau',white_matte:'Weiss matt',tan:'Hellbraun',white_glossy:'Weiss glänzend','1_pc':'1 Stück',white_aluminum:'Weiss (Aluminium)',white_front_silver_back:'Weiss (Vorderseite), Silber (Rückseite)',rectangle:'Rechteck'};
    const colorName = value => {
      const raw = string(value); if (!german) return raw;
      const hit = colorTranslations[lookupKey(raw)] || colorFallback[lookupKey(raw)]; if (hit) return hit;
      return /\\d/.test(raw) ? metricText(raw) : raw;
    };
    // LX-KATALOGTEXTE-0511: Titel ohne Unzen-Angabe (die Menge steht in der deutschen Fassung bzw. in der Beschreibung), Modellzeile nur mit Marke und Modellnummer
    const dropOz = text => string(text).replace(/\\s*,?\\s*\\(?\\s*\\d+(?:[.,]\\d+)?\\s*oz\\.?\\s*\\)?/gi,'').trim();
    const titleCm = text => german ? string(text).replace(/(\\d+),(\\d+)(?= cm\\b)/g,(whole,a,b)=>Number(a+'.'+b)>=10?String(Math.round(Number(a+'.'+b))):whole) : string(text);
    const modelLine = product => {
      const brand = string(product.brand).trim(), model = string(product.model).trim();
      const flat = value => normal(value).replace(/[^a-z0-9]+/g,'');
      const descriptive = german && model && (model.includes('|') || flat(model) === flat(product.title) || (!/\\d/.test(model) && (!brand || (model.match(/[A-Za-zÄÖÜäöü]{3,}/g) || []).length >= 2)));
      return [brand,descriptive ? '' : metricTitle(model)].filter(Boolean).join(' · ');
    };
    // LX-SIZEDE-START
    const isoPaper = {A0:[84.1,118.9],A1:[59.4,84.1],A2:[42,59.4],A3:[29.7,42],A4:[21,29.7],A5:[14.8,21],A6:[10.5,14.8]};
    const sizeWords = {'one size':'Einheitsgrösse',small:'Klein',medium:'Mittel',large:'Gross',circle:'Kreis',circular:'Rund',oval:'Oval',rectangle:'Rechteck',square:'Quadrat',heart:'Herz',star:'Stern',snowflake:'Schneeflocke',round:'Rund',bell:'Glocke',tree:'Baum',scalloped:'Wellenrand','pet paw':'Tierpfote',tag:'Etikett','bone shape':'Knochenform','fish shape':'Fischform',unscented:'Ohne Duft',king:'King (US)',queen:'Queen (US)','twin xl':'Twin XL (US)',twin:'Twin (US)'};
    const sizeDe = (raw, product, converted) => {
      const text = string(raw).trim(), base = string(converted);
      if (!german || !text) return base;
      if (id(product?.id) === '751' && /^16\\s*oz\\.?$/i.test(text)) return sizeWords['one size'];
      const iso = /^(A[0-6])\\s*\\(/.exec(text);
      if (iso && isoPaper[iso[1]]) return iso[1] + ' (' + isoPaper[iso[1]].map(value => String(value).replace('.',',')).join(' × ') + ' cm)';
      const ounces = /^(\\d+(?:\\.\\d+)?)\\s*oz\\.?$/i.exec(text); if (ounces) return Math.round(Number(ounces[1]) * 29.5735) + ' ml';
      const feet = /^(\\d+(?:\\.\\d+)?)\\s*ft\\.?$/i.exec(text); if (feet) return Math.round(Number(feet[1]) * 30.48) + ' cm';
      return base.replace(/\\b(\\d+)\\s*(?:pieces|pcs)\\b\\.?/gi,'$1 Stück').replace(/^(\\d+) pages \\((\\d+) sheets\\)$/i,'$1 Seiten ($2 Blatt)')
        .replace(/^(one size|small|medium|large|circle|circular|oval|rectangle|square|heart|star|snowflake|round|bell|tree|scalloped|pet paw|tag|bone shape|fish shape|unscented|king|queen|twin xl|twin)(?=$|[\\s(\\-⌀])/i,(whole,word)=>sizeWords[word.toLowerCase()]).replace(/\\bmagnetic$/i,'magnetisch');
    };
    // LX-SIZEDE-END
"""
js = ersetzen(js, alt, neu, N)

alt = "      return string(variant?.displaySizeCh) || metricText(raw);\n"
neu = "      return string(variant?.displaySizeCh) || sizeDe(raw,product,metricText(raw));\n"
js = ersetzen(js, alt, neu, N)

alt = """      return metricTitle(german && (string(extra?.titleDe) || string(product.titleDe)) || product.title);
"""
neu = """      return titleCm(metricTitle(german && (string(extra?.titleDe) || string(product.titleDe)) || (german ? dropOz(product.title) : product.title)));
"""
js = ersetzen(js, alt, neu, N)

# 7b) Grössenfilter: Rückfall (verschiedene Etiketten je Modell) ebenfalls deutsch/metrisch
alt = "f(n[0])+'–'+f(n[n.length-1])+' '+m[0][2];}return metricText(value);};"
neu = "f(n[0])+'–'+f(n[n.length-1])+' '+m[0][2];}return sizeDe(value,null,metricText(value));};"
js = ersetzen(js, alt, neu, N)

# 8) Modellzeile, Singular bei einer Variante, Originalmodell ohne Unzen
alt = "      const meta = el('p','lcl-detail-meta',[product.brand,metricTitle(product.model)].filter(Boolean).join(' · ')); panel.append(meta);\n"
neu = "      const metaText = modelLine(product); if (metaText) panel.append(el('p','lcl-detail-meta',metaText));\n"
js = ersetzen(js, alt, neu, N)

alt = "const count=el('p','lcl-small',t('original_variants',{count:variants.length}));"
neu = "const count=el('p','lcl-small',variants.length===1?labelOr('original_variants_one',t('original_variants',{count:1})):t('original_variants',{count:variants.length}));"
js = ersetzen(js, alt, neu, N)

alt = "      if (titleForProduct(product)!==product.title) panel.append(el('p','lcl-small',t('original_name')+': '+metricTitle(product.title)));\n"
neu = ("      // LX-KATALOGTEXTE-0511: Originalmodell ohne Unzen-Angabe (deutsche Seite)\n"
       "      const originalName = titleCm(metricTitle(german ? dropOz(product.title) : product.title));\n"
       "      if (german ? titleForProduct(product)!==originalName : titleForProduct(product)!==product.title) panel.append(el('p','lcl-small',t('original_name')+': '+originalName));\n")
js = ersetzen(js, alt, neu, N)

# 9) Material (Wörterbuch der Textdatei), Regionen, Status
alt = "const name=materialNames[normal(part.name)]?t(materialNames[normal(part.name)]):part.name;"
neu = "const nameKey=normal(part.name).replace(/\\s+/g,' ').trim().replace(/[\\s,;.]+$/,'');const name=materialNames[nameKey]?t(materialNames[nameKey]):(textHit('material',nameKey)??part.name);"
js = ersetzen(js, alt, neu, N)

alt = """            if(statuses.length)statuses.forEach(item=>ul.append(el('li','',`${string(regions[item.region]) || string(item.region)}: ${['in_stock','out_of_stock','not_available'].includes(item.status)?t(item.status):string(item.status)}`)));
            else Object.entries(regions).forEach(([key,name])=>ul.append(el('li','',typeof name==='string'?name:key)));
"""
neu = """            // LX-KATALOGTEXTE-0511: Regionsnamen deutsch (Wörterbuch der Textdatei), Statusschlüssel nie roh anzeigen
            const statusKnown = ['in_stock','out_of_stock','not_available','supplier_out_of_stock','stocked_on_demand'];
            const statusText = status => { const key = string(status); const fallback = german ? 'Status unbekannt' : key.replace(/_/g,' '); return statusKnown.includes(key) ? labelOr(key,labelOr('status_unknown',fallback)) : labelOr('status_unknown',fallback); };
            if(statuses.length)statuses.forEach(item=>ul.append(el('li','',`${textDe('regionen',string(regions[item.region]) || string(item.region))}: ${statusText(item.status)}`)));
            else Object.entries(regions).forEach(([key,name])=>ul.append(el('li','',textDe('regionen',typeof name==='string'?name:key))));
"""
js = ersetzen(js, alt, neu, N)

open(D + N, 'w', encoding='utf-8').write(js)

# ---------------------------------------------------------------- Section
N = 'sections__luxe-clothing.liquid'
sec = lesen(N)
alt = """    "presentationAsset": {{ 'luxe-clothing-reference-gallery.json' | asset_url | json }},
"""
neu = alt + """    {%- comment -%} LX-KATALOGTEXTE-0511: deutsche Katalogtexte (Asset, wird erst beim Öffnen einer Detailansicht geladen) {%- endcomment -%}
    "textsAsset": {{ 'luxe-clothing-texts-de.json' | asset_url | json }},
"""
sec = ersetzen(sec, alt, neu, N)
alt = """      "original_note": {{ 'luxe_clothing.original_note' | t | json }},
"""
neu = alt + """      {%- comment -%} LX-KATALOGTEXTE-0511 {%- endcomment -%}
      "original_note_translated": {{ 'luxe_clothing.original_note_translated' | t | json }},
      "original_variants_one": {{ 'luxe_clothing.original_variants_one' | t | json }},
      "supplier_out_of_stock": {{ 'luxe_clothing.supplier_out_of_stock' | t | json }},
      "stocked_on_demand": {{ 'luxe_clothing.stocked_on_demand' | t | json }},
      "status_unknown": {{ 'luxe_clothing.status_unknown' | t | json }},
"""
sec = ersetzen(sec, alt, neu, N)
open(D + N, 'w', encoding='utf-8').write(sec)

# ---------------------------------------------------------------- Locales
N = 'locales__de.json'
de = lesen(N)
alt = '    "original_note": "Originalangaben des Herstellers. Unterschiede nach Farbe, Ausführung oder Produktionsregion beachten.",\n'
neu = alt + ('    "original_note_translated": "Aus den Herstellerangaben (Englisch) maschinell übersetzt. Masse und Gewichte, die nur in US-Einheiten genannt waren, sind in Schweizer Einheiten umgerechnet und gerundet. Unterschiede nach Farbe, Ausführung oder Produktionsregion beachten.",\n'
             '    "original_variants_one": "1 Originalvariante aus dem Herstellerkatalog",\n'
             '    "supplier_out_of_stock": "beim Lieferanten derzeit nicht verfügbar",\n'
             '    "stocked_on_demand": "wird bei Bedarf beim Lieferanten bestellt",\n'
             '    "status_unknown": "Status unbekannt",\n')
de = ersetzen(de, alt, neu, N)
open(D + N, 'w', encoding='utf-8').write(de)

N = 'locales__en.default.json'
en = lesen(N)
alt = '    "original_note": "Original manufacturer information. Note differences by colour, variant or production region.",\n'
neu = alt + ('    "original_note_translated": "Machine-translated from the manufacturer information (English). Measurements and weights given only in US units were converted to metric units and rounded. Note differences by colour, variant or production region.",\n'
             '    "original_variants_one": "1 original variant from the manufacturer’s catalogue",\n'
             '    "supplier_out_of_stock": "currently unavailable from the supplier",\n'
             '    "stocked_on_demand": "ordered from the supplier when needed",\n'
             '    "status_unknown": "status unknown",\n')
en = ersetzen(en, alt, neu, N)
open(D + N, 'w', encoding='utf-8').write(en)
print('Patch gebaut: 4 Dateien')
