/**
 * Plan-Berechnung «Selbst gestalten: Material + Modelle». REIN: nimmt Spezifikation + Printful-Katalog + Versandraten + vorhandene Shopify-Produkte
 * und liefert die Aktionen mit Preisen. Kein Netz, keine Dateien, kein Schreiben (das macht pod_auswahl_schreiben.mjs, nur hinter LIVE=1).
 *
 * Eingaben (alle Objekte, siehe pod_auswahl_daten.mjs für die Dateien):
 *   katalog      { "<printfulProduktId>": {id,title,type,files[],variants:[{id,name,size,color,price,in_stock,eu}]} }
 *   beschreibungen { "<id>": {title,desc} }
 *   versand      { "<printfulVariantenId>": {usd,id,name,tage} | {fehler} }   // Printful-Versand nach CH, je Variante
 *   bestand      { "<handle>": {id,handle,title,status,productType,tags,descriptionHtml,options:[{name,position,values}],variants:[{id,sku,price,inventoryPolicy,selectedOptions}]} }
 *   skuPruefung  { "<printfulVariantenId>": {produkt,typ,name,farbe,groesse,preisUsd} }   // was die vorhandenen SKUs bei Printful WIRKLICH sind
 */
import { createHash } from 'node:crypto';
import { endpreis, nettoBeiPreis, REGEL } from './pod_preise.mjs';
import { SPEC, MARKE_AUF, MARKE_ZU, OPTION_MATERIAL } from './pod_auswahl_spec.mjs';

export const MAX_VARIANTEN = 100;
export const PLATZHALTER_VARIANTE = '__ERSTE_VARIANTE__';
export const PLATZHALTER_BILD = '__ERSTES_BILD__';

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '').replace(/,/g, '.');
export const skuVon = (praefix, pfId) => `${praefix}_${pfId}`;
export const pfIdAusSku = (sku) => { const m = String(sku || '').match(/_(\d+)\s*$/); return m ? Number(m[1]) : null; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const zahlRaus = (s) => (String(s).match(/\d*[.,]?\d+/g) || []).map((x) => parseFloat(x.replace(',', '.')));

/** Kanonische JSON-Darstellung (Schlüssel sortiert) für den Plan-Hash. */
export function kanonisch(x) {
  if (Array.isArray(x)) return '[' + x.map(kanonisch).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + kanonisch(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
export const hashVon = (x) => createHash('sha256').update(kanonisch(x)).digest('hex');

// ───────────────────────────────────────────────────────── Samsung-Modelle: Sortierung (Generation, dann Basis < Plus < Ultra < FE)
export function modellSchluessel(name) {
  const m = String(name).match(/Galaxy S(\d+)\s*(Plus|Ultra|FE)?\s*$/i);
  if (!m) return [9999, 9, String(name)];
  return [Number(m[1]), { '': 0, plus: 1, ultra: 2, fe: 3 }[(m[2] || '').toLowerCase()], String(name)];
}
export const modellVergleich = (a, b) => { const x = modellSchluessel(a), y = modellSchluessel(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); };

// ───────────────────────────────────────────────────────── Zeilen eines Materials (zweiter Optionswert ↔ Printful-Nummer)
function zeilenVon(mat, katalog) {
  const z = mat.zuordnung;
  const kat = katalog[String(mat.printfulProdukt)];
  if (!z) return [];
  if (z.art === 'zeilen') return z.zeilen.map(([zweiter, pf]) => ({ zweiter, pf, abgeleitet: (z.abgeleitet || []).includes(zweiter) }));
  if (!kat) return [];
  if (z.art === 'farbeGroesse') return kat.variants.filter((v) => v.color === z.farbe).map((v) => ({ zweiter: v.size, pf: v.id }));
  if (z.art === 'modell') return kat.variants.filter((v) => !z.finish || v.color === z.finish).map((v) => ({ zweiter: v.size, pf: v.id }));
  return [];
}

// ───────────────────────────────────────────────────────── Beschreibung: Block «Materialien im Vergleich»
function zollKurz(size) { // «12″×16″» → «12×16″», «A2 (16.5″×23.3″)» → «16,5×23,3″»
  const m = String(size).replace(/″/g, '').match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
  return m ? `${m[1]}×${m[2]}″`.replace(/\./g, ',') : String(size);
}

/** Zeilen «12×16″ ≈ 30×40 cm» aus den neuen Varianten eines Zoll-Materials (Katalogbezeichnung ↔ Shop-Grösse). */
export function zollZeile(neueVarianten, wert) {
  const teile = neueVarianten.filter((v) => v.material === wert && v.katalogGroesse).map((v) => `${zollKurz(v.katalogGroesse)} ≈ ${v.zweiter}`);
  return teile.length ? `Zollformate: ${teile.join(', ')}` : '';
}

export function materialBlock({ vergleich, vorhandeneWerte, zollZeilen = {} }) {
  const punkte = [];
  for (const e of vergleich) {
    const werte = e.werte.filter((w) => vorhandeneWerte.includes(w));
    if (!werte.length) continue;
    const texte = e.fakten.map((f) => f.t);
    for (const w of werte) if (zollZeilen[w]) { texte.push(zollZeilen[w]); break; }
    punkte.push(`<li><strong>${esc(werte.join(' / '))}:</strong> ${texte.map(esc).join('; ')}.</li>`);
  }
  if (!punkte.length) return '';
  return `${MARKE_AUF}\n<div class="lx-material">\n<h4>Materialien im Vergleich</h4>\n<p>Angaben laut Hersteller des Rohlings (Printful). Den Preis je Material siehst du oben bei der Auswahl.</p>\n<ul>\n${punkte.join('\n')}\n</ul>\n</div>\n${MARKE_ZU}`;
}

/** Setzt/ersetzt den Block. Ohne Marken: vor dem Rückgabe-Hinweis (ls-pod-retoure), sonst am Ende. Nur zwischen den Marken wird ersetzt (idempotent). */
export function setzeMaterialBlock(html, block) {
  const s = String(html ?? '');
  const a = s.indexOf(MARKE_AUF), z = s.indexOf(MARKE_ZU);
  if (a >= 0 && z > a) return s.slice(0, a) + block + s.slice(z + MARKE_ZU.length);
  if (a >= 0 || z >= 0) throw new Error('pod_auswahl: Materialmarke unvollständig (nur Anfang oder nur Ende) – bitte von Hand prüfen');
  const i = s.indexOf('<div class="ls-pod-retoure"');
  return i >= 0 ? s.slice(0, i) + block + '\n' + s.slice(i) : s + (s.endsWith('\n') ? '' : '\n') + block + '\n';
}

// ───────────────────────────────────────────────────────── Samsung-Beschreibung aus der Struktur des iPhone-Produkts
export function samsungBeschreibung({ vorlageHtml, modelle, spec }) {
  const nimm = (re, name) => { const m = String(vorlageHtml || '').match(re); if (!m) throw new Error(`pod_auswahl: Baustein «${name}» fehlt im Vorlageprodukt`); return m[0]; };
  const liefer = nimm(/<p class="ls-liefer"[\s\S]*?<\/p>/, 'Lieferzeit');
  const skript = nimm(/<script src="[^"]*lspod-designer[^"]*"[^>]*><\/script>/, 'Editor-Skript');
  const retoure = nimm(/<div class="ls-pod-retoure"[\s\S]*?<\/div>/, 'Rückgabehinweis');
  const gens = modelle.map((m) => modellSchluessel(m)[0]).filter((g) => g < 9999);
  const reihe = gens.length ? `Galaxy S${Math.min(...gens)} bis S${Math.max(...gens)}` : 'Galaxy-Modelle';
  const text = `<p>Dein eigenes Foto, Motiv oder Design auf einer <strong>Samsung-Hülle</strong> – du gestaltest direkt hier im Editor (Bild hochladen, Text &amp; Sticker hinzufügen, frei platzieren). Wähle oben zuerst das Material, dann dein Samsung-Modell.</p>\n<ul>\n<li>Vier Ausführungen: Hartschale matt oder glänzend, klare Hülle oder Slim-Hülle</li>\n<li>Passend für Samsung ${esc(reihe)} (je nach Ausführung)</li>\n<li>Jede Hülle wird erst nach deinem Entwurf gedruckt</li>\n</ul>\n<p>Tipp: Für einen scharfen Druck ein möglichst grosses, scharfes Bild hochladen.</p>`;
  const xsell = '<p><strong>🛍️ Das könnte dir auch gefallen:</strong> <a href="/collections/handy-huellen">Handyhüllen &amp; Cases</a> · <a href="/collections/bestseller-premium-heroes">Bestseller</a></p>';
  const editor = `<div class="lspod-designer" data-img-front="${PLATZHALTER_BILD}" data-variant="${PLATZHALTER_VARIANTE}"></div>`;
  return [liefer, editor, skript, '<hr>', text + xsell, retoure].join('\n');
}

// ───────────────────────────────────────────────────────── ein Produkt planen
function bestehendeZeile(v, ctx, nachherOptionen) {
  const pf = pfIdAusSku(v.sku);
  const pruef = ctx.skuPruefung[String(pf)] || null;
  const rate = ctx.versand[String(pf)];
  const usd = pruef?.preisUsd ?? null;
  const versandUsd = rate && typeof rate.usd === 'number' ? rate.usd : null;
  let netto = null;
  if (usd && versandUsd !== null) netto = nettoBeiPreis({ preisChf: Number(v.price), einkaufUsd: usd, versandUsd }, ctx.regel);
  return { id: v.id, sku: v.sku, preisChf: Number(v.price), pf, optionen: nachherOptionen(v), einkaufUsd: usd, versandUsd, nettoChf: netto, inventoryPolicy: v.inventoryPolicy };
}

function planeErweitern(spec, ctx) {
  const b = ctx.bestand[spec.handle];
  if (!b) throw new Error(`pod_auswahl: Produkt «${spec.handle}» fehlt im Bestand`);
  const matName = OPTION_MATERIAL.name;
  const vorher = b.options.map((o) => ({ name: o.name, position: o.position, werte: [...o.values] }));
  const zweite = vorher.find((o) => o.name === spec.zweiteOption);
  if (!zweite) throw new Error(`pod_auswahl: «${spec.handle}» hat keine Option «${spec.zweiteOption}»`);
  const hatMaterial = vorher.some((o) => o.name === matName);
  const erlaubt = zweite.werte;
  const befunde = [], nichtAngelegt = [], neu = [], schonDa = [];
  const vorhandeneSkus = new Map(b.variants.map((v) => [v.sku, v]));

  // Identität der vorhandenen SKUs bei Printful prüfen
  const falsch = new Map();
  for (const v of b.variants) {
    const pf = pfIdAusSku(v.sku);
    const pr = ctx.skuPruefung[String(pf)];
    if (!pr) { befunde.push({ schwere: 'hinweis', code: 'sku-ungeprueft', text: `Printful-Identität der SKU ${v.sku} nicht geprüft (kein Eintrag in sku_pruefung).` }); continue; }
    const erwartetProdukt = spec.bestand.printfulProdukt;
    const g = v.selectedOptions.find((o) => o.name === spec.zweiteOption)?.value;
    if (pr.produkt !== erwartetProdukt) { const k = `${pr.produkt}|${pr.farbe}`; (falsch.get(k) || falsch.set(k, { produkt: pr.produkt, typ: pr.typ, name: String(pr.name).replace(/\s*\([^)]*\)\s*$/, ''), farbe: pr.farbe, skus: [] }).get(k)).skus.push(v.sku); }
    else if (spec.bestand.farbe && pr.farbe !== spec.bestand.farbe) befunde.push({ schwere: 'blocker', code: 'sku-farbe', text: `SKU ${v.sku} ist bei Printful «${pr.farbe}», erwartet «${spec.bestand.farbe}».` });
    if (g && pr.groesse && norm(g) !== norm(pr.groesse)) befunde.push({ schwere: 'blocker', code: 'sku-groesse', text: `SKU ${v.sku}: Shop-Wert «${g}» ≠ Printful-Grösse «${pr.groesse}».` });
  }
  for (const f of falsch.values()) {
    const nr = f.skus.map((s) => pfIdAusSku(s));
    befunde.push({ schwere: 'blocker', code: 'sku-anderes-produkt',
      text: `Die vorhandenen SKUs ${spec.skuPraefix}_${Math.min(...nr)}–${Math.max(...nr)} (${f.skus.length} Varianten) sind bei Printful Produkt ${f.produkt} «${f.name}» (${f.farbe || 'ohne Farbe'}), nicht ${spec.bestand.erwartet || 'Produkt ' + spec.bestand.printfulProdukt}. Bestellungen dieser Varianten gehen als «${f.name}» an Printful.`,
      printfulProdukt: f.produkt, erwartet: spec.bestand.printfulProdukt, skus: f.skus });
  }

  for (const mat of spec.materialien) {
    if (mat.bestand) continue;
    const kat = ctx.katalog[String(mat.printfulProdukt)];
    if (!kat) { nichtAngelegt.push({ material: mat.wert, zweiter: '*', pf: null, code: 'nicht-im-katalog', grund: `Printful-Produkt ${mat.printfulProdukt} fehlt im Katalog-Datenpaket` }); continue; }
    const zeilen = zeilenVon(mat, ctx.katalog);
    // Reihenfolge wie bei den vorhandenen Beschriftungen
    zeilen.sort((a, c) => { const i = erlaubt.indexOf(a.zweiter), j = erlaubt.indexOf(c.zweiter); return (i < 0 ? 1e6 : i) - (j < 0 ? 1e6 : j); });
    // Beschriftungen des Shops, die der Katalog für dieses Material (und diese Farbe/Oberfläche) nicht führt: im Bericht nennen, nichts erfinden
    if (mat.zuordnung.art !== 'zeilen') for (const w of erlaubt) if (!zeilen.some((z) => z.zweiter === w)) {
      nichtAngelegt.push({ material: mat.wert, zweiter: w, pf: null, printfulProdukt: mat.printfulProdukt, code: 'nicht-im-katalog', grund: `Printful-Katalog führt «${w}» bei Produkt ${mat.printfulProdukt}${mat.zuordnung.farbe ? ' in ' + mat.zuordnung.farbe : ''}${mat.zuordnung.finish ? ' (' + mat.zuordnung.finish + ')' : ''} nicht` });
    }
    for (const z of zeilen) {
      const kv = kat.variants.find((v) => v.id === z.pf);
      const basis = { material: mat.wert, zweiter: z.zweiter, pf: z.pf, printfulProdukt: mat.printfulProdukt };
      if (!erlaubt.includes(z.zweiter)) { if (mat.zuordnung.art !== 'modell') nichtAngelegt.push({ ...basis, code: 'groesse-unbekannt', grund: `«${z.zweiter}» gehört nicht zu den vorhandenen ${spec.zweiteOption}-Beschriftungen` }); continue; }
      if (!kv) { nichtAngelegt.push({ ...basis, code: 'nicht-im-katalog', grund: `Printful-Variante ${z.pf} steht nicht im Katalog von Produkt ${mat.printfulProdukt}` }); continue; }
      if (kv.eu !== 'in_stock') { nichtAngelegt.push({ ...basis, code: 'eu-lager', grund: `Printful-Lager EU: ${kv.eu ?? 'nicht geführt'}` }); continue; }
      const rate = ctx.versand[String(z.pf)];
      if (!rate || typeof rate.usd !== 'number') { nichtAngelegt.push({ ...basis, code: 'versand-unbekannt', grund: `Printful-Versand nach CH unbekannt${rate?.fehler ? ' (' + rate.fehler + ')' : ''}` }); continue; }
      const p = endpreis({ einkaufUsd: Number(kv.price), versandUsd: rate.usd }, ctx.regel);
      if (!p.ok) { nichtAngelegt.push({ ...basis, code: 'preis-ueber-grenze', grund: p.grund, einkaufUsd: Number(kv.price), versandUsd: rate.usd, richtwertChf: p.richtwertChf }); continue; }
      const sku = skuVon(spec.skuPraefix, z.pf);
      const eintrag = { ...basis, optionen: { [matName]: mat.wert, [spec.zweiteOption]: z.zweiter }, sku, einkaufUsd: Number(kv.price), versandUsd: rate.usd,
        preisChf: p.preisChf, richtwertChf: p.richtwertChf, nettoChf: p.nettoChf, bindend: p.bindend, abgeleitet: !!z.abgeleitet, katalogGroesse: kv.size, katalogName: kv.name };
      const da = vorhandeneSkus.get(sku);
      if (da) schonDa.push({ ...eintrag, id: da.id, preisImShop: Number(da.price) }); else neu.push(eintrag);
    }
  }

  const bestehende = b.variants.filter((v) => !neu.concat(schonDa).some((n) => n.sku === v.sku))
    .map((v) => bestehendeZeile(v, ctx, (x) => ({ [matName]: spec.bestand.wert, ...Object.fromEntries(x.selectedOptions.filter((o) => o.name !== matName).map((o) => [o.name, o.value])) })));
  const alleNeuWerte = [...new Set(neu.concat(schonDa).map((n) => n.optionen[matName]))];
  const materialWerte = [spec.bestand.wert, ...spec.materialien.filter((m) => !m.bestand && alleNeuWerte.includes(m.wert)).map((m) => m.wert)];
  const nachher = [{ name: matName, position: 1, werte: materialWerte }, ...vorher.filter((o) => o.name !== matName).map((o, i) => ({ name: o.name, position: i + 2, werte: [...o.werte] }))];

  // Beschreibung
  const zollZeilen = {};
  for (const w of spec.zollMasse || []) { const z = zollZeile(neu.concat(schonDa), w); if (z) zollZeilen[w] = z; }
  const block = materialBlock({ vergleich: spec.vergleich, vorhandeneWerte: materialWerte, zollZeilen });
  const nachherHtml = setzeMaterialBlock(b.descriptionHtml, block);

  // Befunde zu den Preisen vorhandener Varianten (nur Information, nichts wird geändert)
  const unter = bestehende.filter((v) => v.nettoChf !== null && v.nettoChf < ctx.regel.nettoMin);
  if (unter.length) befunde.push({ schwere: 'hinweis', code: 'vorhandener-preis-unter-regel', text: `${unter.length} vorhandene Variante(n) liegen mit dem aktuellen Preis unter CHF ${ctx.regel.nettoMin} Netto (z. B. ${unter[0].sku}: CHF ${unter[0].preisChf.toFixed(2)} → Netto ${unter[0].nettoChf.toFixed(2)}). Unverändert gelassen.` });

  return {
    handle: spec.handle, art: 'erweitern', produktId: b.id, titel: b.title, status: b.status, skuPraefix: spec.skuPraefix,
    optionen: { vorher, nachher, materialOption: matName, bestandsWert: spec.bestand.wert, optionSchonDa: hatMaterial },
    bestehende, neu, schonDa, nichtAngelegt, befunde,
    beschreibung: { vorher: b.descriptionHtml, block, nachher: nachherHtml },
    summe: { bestehend: bestehende.length + schonDa.length, neu: neu.length, gesamt: bestehende.length + schonDa.length + neu.length, max: MAX_VARIANTEN },
  };
}

function planeNeu(spec, ctx) {
  const matName = OPTION_MATERIAL.name;
  const vorlage = ctx.bestand[spec.vorlage];
  if (!vorlage) throw new Error(`pod_auswahl: Vorlageprodukt «${spec.vorlage}» fehlt im Bestand`);
  const befunde = [], nichtAngelegt = [], zeilenAlle = [];
  for (const mat of spec.materialien) {
    const kat = ctx.katalog[String(mat.printfulProdukt)];
    if (!kat) { nichtAngelegt.push({ material: mat.wert, zweiter: '*', pf: null, code: 'nicht-im-katalog', grund: `Printful-Produkt ${mat.printfulProdukt} fehlt im Katalog-Datenpaket` }); continue; }
    for (const z of zeilenVon(mat, ctx.katalog)) {
      const kv = kat.variants.find((v) => v.id === z.pf);
      const basis = { material: mat.wert, zweiter: z.zweiter, pf: z.pf, printfulProdukt: mat.printfulProdukt };
      if (!kv) { nichtAngelegt.push({ ...basis, code: 'nicht-im-katalog', grund: `Printful-Variante ${z.pf} fehlt im Katalog` }); continue; }
      if (kv.eu !== 'in_stock') { nichtAngelegt.push({ ...basis, code: 'eu-lager', grund: `Printful-Lager EU: ${kv.eu ?? 'nicht geführt'}` }); continue; }
      const rate = ctx.versand[String(z.pf)];
      if (!rate || typeof rate.usd !== 'number') { nichtAngelegt.push({ ...basis, code: 'versand-unbekannt', grund: `Printful-Versand nach CH unbekannt${rate?.fehler ? ' (' + rate.fehler + ')' : ''}` }); continue; }
      const p = endpreis({ einkaufUsd: Number(kv.price), versandUsd: rate.usd }, ctx.regel);
      if (!p.ok) { nichtAngelegt.push({ ...basis, code: 'preis-ueber-grenze', grund: p.grund }); continue; }
      zeilenAlle.push({ ...basis, optionen: { [matName]: mat.wert, [spec.zweiteOption]: z.zweiter }, sku: skuVon(spec.skuPraefix, z.pf), einkaufUsd: Number(kv.price), versandUsd: rate.usd,
        preisChf: p.preisChf, richtwertChf: p.richtwertChf, nettoChf: p.nettoChf, bindend: p.bindend, abgeleitet: false, katalogGroesse: kv.size, katalogName: kv.name });
    }
  }
  // Höchstens 100 Varianten: sonst die ältesten Modelle weglassen (und im Bericht nennen)
  let modelle = [...new Set(zeilenAlle.map((z) => z.optionen[spec.zweiteOption]))].sort(modellVergleich);
  let neu = zeilenAlle;
  const max = spec.maxVarianten ?? MAX_VARIANTEN;
  while (neu.length > max && modelle.length) {
    const weg = modelle.shift();
    for (const z of neu.filter((x) => x.optionen[spec.zweiteOption] === weg)) nichtAngelegt.push({ material: z.material, zweiter: z.zweiter, pf: z.pf, printfulProdukt: z.printfulProdukt, code: 'limit', grund: `Grenze von ${max} Varianten: ältestes Modell «${weg}» weggelassen` });
    neu = neu.filter((x) => x.optionen[spec.zweiteOption] !== weg);
  }
  modelle = [...new Set(neu.map((z) => z.optionen[spec.zweiteOption]))].sort(modellVergleich);
  const materialWerte = spec.materialien.map((m) => m.wert).filter((w) => neu.some((z) => z.optionen[matName] === w));
  // Reihenfolge der Varianten: Material, dann Modell
  neu = neu.slice().sort((a, c) => materialWerte.indexOf(a.optionen[matName]) - materialWerte.indexOf(c.optionen[matName]) || modellVergleich(a.optionen[spec.zweiteOption], c.optionen[spec.zweiteOption]));

  const nachher = [{ name: matName, position: 1, werte: materialWerte }, { name: spec.zweiteOption, position: 2, werte: modelle }];
  const block = materialBlock({ vergleich: spec.vergleich, vorhandeneWerte: materialWerte });
  const html0 = samsungBeschreibung({ vorlageHtml: vorlage.descriptionHtml, modelle, spec });
  const beschreibung = setzeMaterialBlock(html0, block);
  const ohneSkus = nichtAngelegt.filter((n) => n.code === 'eu-lager');
  if (ohneSkus.length) befunde.push({ schwere: 'hinweis', code: 'modelle-ohne-eu-lager', text: `${ohneSkus.length} Katalogvarianten (z. B. ${ohneSkus.slice(0, 3).map((n) => n.zweiter + ' / ' + n.material).join(', ')}) sind bei Printful in der EU nicht lieferbar und werden nicht angelegt.` });
  return {
    handle: spec.handle, art: 'neu', produktId: null, titel: spec.titel, status: 'DRAFT', skuPraefix: spec.skuPraefix,
    optionen: { vorher: [], nachher, materialOption: matName, bestandsWert: null, optionSchonDa: false },
    bestehende: [], neu, schonDa: [], nichtAngelegt, befunde,
    beschreibung: { vorher: null, block, nachher: beschreibung },
    neuesProdukt: {
      titel: spec.titel, handle: spec.handle, status: 'DRAFT', vendor: 'LuxeStyle', produktart: spec.produktart, tags: [...spec.tags], category: spec.category, seo: spec.seo,
      bilder: spec.bilder, metafelder: spec.metafelder, vorlage: spec.vorlage,
    },
    summe: { bestehend: 0, neu: neu.length, gesamt: neu.length, max },
  };
}

/** Printful-Variantennummern, für die der Plan eine Versandrate braucht (neue Varianten mit EU-Lager + vorhandene SKUs). */
export function benoetigteVersandIds({ spec = SPEC, katalog, bestand, nur = null }) {
  const ids = new Set();
  for (const s of spec) {
    if (nur && !nur.includes(s.handle)) continue;
    const b = bestand[s.handle];
    const erlaubt = s.art === 'erweitern' && b ? b.options.find((o) => o.name === s.zweiteOption)?.values : null;
    for (const mat of s.materialien) {
      if (mat.bestand) continue;
      const kat = katalog[String(mat.printfulProdukt)];
      if (!kat) continue;
      for (const z of zeilenVon(mat, katalog)) {
        const kv = kat.variants.find((v) => v.id === z.pf);
        if (kv && kv.eu === 'in_stock' && (!erlaubt || erlaubt.includes(z.zweiter))) ids.add(z.pf);
      }
    }
    if (b) for (const v of b.variants) { const id = pfIdAusSku(v.sku); if (id) ids.add(id); }
  }
  return [...ids];
}

// ───────────────────────────────────────────────────────── alles planen
export function planeAlles({ spec = SPEC, katalog, beschreibungen = {}, versand, bestand, skuPruefung = {}, regel = REGEL, nur = null } = {}) {
  const ctx = { katalog, beschreibungen, versand, bestand, skuPruefung, regel };
  const produkte = [];
  for (const s of spec) {
    if (nur && !nur.includes(s.handle)) continue;
    produkte.push(s.art === 'neu' ? planeNeu(s, ctx) : planeErweitern(s, ctx));
  }
  const plan = { regel, produkte, summe: { produkte: produkte.length, neueVarianten: produkte.reduce((a, p) => a + p.neu.length, 0), nichtAngelegt: produkte.reduce((a, p) => a + p.nichtAngelegt.length, 0) } };
  plan.verstoesse = pruefePlan(plan, { katalog, skuPruefung, spec: spec.filter((s) => !nur || nur.includes(s.handle)) });
  plan.hash = hashVon(aktionenFuerHash(plan));
  return plan;
}

/** Nur das, was geschrieben würde (nicht die Anzeige-Felder): Grundlage des Plan-Hash. */
export function aktionenFuerHash(plan) {
  return plan.produkte.map((p) => ({
    handle: p.handle, art: p.art, id: p.produktId, optionen: p.optionen.nachher, bestehendeSkus: p.bestehende.map((v) => [v.sku, v.preisChf]),
    neu: p.neu.map((v) => [v.sku, v.optionen, v.preisChf]), nachher: p.beschreibung.nachher, neuesProdukt: p.neuesProdukt || null,
  }));
}

// ───────────────────────────────────────────────────────── Selbstprüfung des Plans (Verstösse = Plan nicht ausführbar)
export function pruefePlan(plan, { katalog, skuPruefung = {}, spec = SPEC } = {}) {
  const v = [];
  for (const p of plan.produkte) {
    const s = spec.find((x) => x.handle === p.handle);
    const alle = [...p.bestehende.map((x) => ({ ...x, quelle: 'bestehend' })), ...p.schonDa.map((x) => ({ ...x, quelle: 'schonDa' })), ...p.neu.map((x) => ({ ...x, quelle: 'neu' }))];
    const skus = alle.map((x) => x.sku);
    if (new Set(skus).size !== skus.length) v.push(`${p.handle}: doppelte SKU`);
    if (alle.length > (p.summe.max ?? MAX_VARIANTEN)) v.push(`${p.handle}: ${alle.length} Varianten > ${p.summe.max}`);
    const namen = p.optionen.nachher.map((o) => o.name);
    if (namen[0] !== OPTION_MATERIAL.name) v.push(`${p.handle}: «Material» ist nicht die erste Option (${namen.join(', ')})`);
    if (p.optionen.nachher.some((o, i) => o.position !== i + 1)) v.push(`${p.handle}: Optionspositionen nicht 1..n`);
    for (const x of p.neu.concat(p.schonDa)) {
      const kat = katalog[String(x.printfulProdukt)];
      if (!kat || !kat.variants.some((k) => k.id === pfIdAusSku(x.sku))) v.push(`${p.handle}: SKU ${x.sku} liegt nicht im Katalog von Printful-Produkt ${x.printfulProdukt}`);
      if (pfIdAusSku(x.sku) !== x.pf) v.push(`${p.handle}: SKU ${x.sku} endet nicht auf ${x.pf}`);
      const e = endpreis({ einkaufUsd: x.einkaufUsd, versandUsd: x.versandUsd }, plan.regel);
      if (!e.ok || x.preisChf < e.preisChf) v.push(`${p.handle}: Preis ${x.preisChf} von ${x.sku} unter der Regel (${e.preisChf})`);
      if (x.quelle === 'neu' && !(x.preisChf <= plan.regel.maxPreis)) v.push(`${p.handle}: Preis ${x.preisChf} über ${plan.regel.maxPreis}`);
      for (const o of p.optionen.nachher) if (!o.werte.includes(x.optionen[o.name])) v.push(`${p.handle}: ${x.sku} nutzt Wert «${x.optionen[o.name]}» ausserhalb von ${o.name}`);
    }
    for (const x of p.bestehende) {
      const pr = skuPruefung[String(x.pf)];
      if (pr && s?.bestand?.farbe && pr.farbe !== s.bestand.farbe) v.push(`${p.handle}: vorhandene SKU ${x.sku} hat Farbe ${pr.farbe}`);
    }
    if (p.art === 'erweitern' && !p.beschreibung.nachher.includes(MARKE_AUF) && p.beschreibung.block) v.push(`${p.handle}: Materialblock fehlt in der Beschreibung`);
  }
  return v;
}

// ───────────────────────────────────────────────────────── Anzeige: Tabelle (Markdown + CSV)
export const SPALTEN = ['Produkt', 'Material', 'Grösse/Modell', 'SKU', 'Einkauf USD', 'Versand USD', 'Preis CHF', 'Netto-Gewinn CHF', 'Status'];

export function tabellenZeilen(plan) {
  const out = [];
  for (const p of plan.produkte) {
    const zweite = p.optionen.nachher[1]?.name;
    const f = (n) => (typeof n === 'number' ? n.toFixed(2) : '–');
    for (const x of p.bestehende) out.push([p.handle, x.optionen['Material'], x.optionen[zweite] ?? '', x.sku, f(x.einkaufUsd), f(x.versandUsd), f(x.preisChf), f(x.nettoChf), 'vorhanden (unverändert)']);
    for (const x of p.schonDa) out.push([p.handle, x.optionen['Material'], x.optionen[zweite] ?? '', x.sku, f(x.einkaufUsd), f(x.versandUsd), f(x.preisChf), f(x.nettoChf), 'schon angelegt']);
    for (const x of p.neu) out.push([p.handle, x.optionen['Material'], x.optionen[zweite] ?? '', x.sku, f(x.einkaufUsd), f(x.versandUsd), f(x.preisChf), f(x.nettoChf), 'NEU' + (x.bindend === 'netto' ? ' (Netto bindet)' : '') + (x.abgeleitet ? ' (Grösse abgeleitet)' : '')]);
  }
  return out;
}

export function tabelleMarkdown(plan) {
  const z = tabellenZeilen(plan);
  const kopf = `| ${SPALTEN.join(' | ')} |\n|${SPALTEN.map(() => '---').join('|')}|`;
  return kopf + '\n' + z.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`).join('\n');
}

export function tabelleCsv(plan) {
  const q = (c) => `"${String(c).replace(/"/g, '""')}"`;
  return [SPALTEN.map(q).join(';'), ...tabellenZeilen(plan).map((r) => r.map(q).join(';'))].join('\n');
}
