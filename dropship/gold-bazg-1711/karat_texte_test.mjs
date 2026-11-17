// Test für karat_texte.mjs (Karat und «goldplattiert» bei vergoldeter Ware): Behauptungs-Erkennung, Tore, Trockenlauf, Schreiben, Rücklesen, Idempotenz, Rücknahme, Schutzgitter.
// Der Shop ist eine strenge Attrappe: sie lehnt unbekannte Abfragen, falsche Variablen und nicht erlaubte Felder ab. Lauf: node dropship/gold-bazg-1711/karat_texte_test.mjs
import { lauf, pruefeEintrag, belege, trefferZahl, norm, felderVon, flach, gleichFeld, LESEN, SCHREIBEN } from './karat_texte.mjs';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };

// ───────────────────────── Behauptungs-Erkennung (belege)
const JA = ['18K vergoldet', 'Armband, 18k Gold-Optik', '18 K Vergoldung', '18-K-Gold', '24‑K‑Goldplattierung', '14 Karat Gold', '18 karat', '22kt Gold', '9K Gold', '10 Carat',
  '18-karätige Vergoldung', '24K Gold', 'Goldauflage', 'Gold-Auflage', 'teilweise mit Goldauflage', '14-karätiger Gold- oder Stahlglanz', 'goldplattiert', 'Goldplattierung', 'Gold-plattiertes Metall', 'Gold-Plattierung', 'goldverplattet', 'Goldverplattung', 'Gold filled', 'Gold-Filled Material',
  'goldgefüllte Qualität', 'Goldfüllung', 'Gold-Füllung', 'Echtgold', 'echtes Gold', 'Echt Gold', 'real gold plating', 'Echtvergoldung', 'Reinheit', 'Purität', 'Purity: 18k', 'Feingehalt',
  'mit 18K Echtgold PVD-beschichtet', '<li>18K vergoldet</li>', '<p>Aus <b>18K</b> Gold</p>', 'Goldplatierung'];
const NEIN = ['vergoldet', 'Vergoldung', 'PVD-vergoldet', 'Gold-Optik', 'Gold-Finish', 'Farbe: Gold, Silber', 'Länge 18 cm', 'Grösse: 10 Karton', '18 Kästchen', '24 künstliche Nägel', 'Rosé-Gold', 'Gold und Schwarz',
  '5A Zirkonia', '10 kg', '9 Km', '14 Kilo', 'echter Hingucker', 'Farbechtheit', 'echtem Perlmutt', 'Weissgold-Farbe', 'Edelstahl 316L', '2018 Kollektion', '118K Aufrufe', '', null, undefined, '<!-- 18K Kommentar --><p>Edelstahl</p>', '<!-- a > 18K Gold --><p>Edelstahl</p>',
  'vergoldeter Edelstahl', 'Gold-Schicht', 'Goldüberzug', 'goldfarben', 'Goldton', 'Zirkonia-Steine 14 Stück'];
for (const t of JA) pruefe(`belege erkennt «${t}»`, belege(t).length >= 1, JSON.stringify(belege(t)));
for (const t of NEIN) pruefe(`belege lässt «${t}» stehen`, belege(t).length === 0, JSON.stringify(belege(t)));
pruefe('belege zählt mehrere Treffer', belege('18K vergoldet und 14K Gold, echtes Gold').length === 3, JSON.stringify(belege('18K vergoldet und 14K Gold, echtes Gold')));
pruefe('trefferZahl summiert die genannten Felder', trefferZahl({ title: '18K Ring', descriptionHtml: '<p>goldplattiert</p>', seoTitle: 'Ring' }) === 2);
pruefe('trefferZahl: nur genannte Felder', trefferZahl({ title: '18K Ring', descriptionHtml: '<p>goldplattiert</p>' }, ['title']) === 1);
pruefe('norm: Zeilenende und Endleerraum', norm('a\r\nb \n') === 'a\nb');

// ───────────────────────── Tore
const KOPF = '<h3>Das zeichnet es aus</h3><!-- ls-marke --><ul>\n<li>18K vergoldet</li>\n<li>Edelstahl</li>\n</ul>';
const NEUKOPF = '<h3>Das zeichnet es aus</h3><!-- ls-marke --><ul>\n<li>Vergoldet</li>\n<li>Edelstahl</li>\n</ul>';
const eintrag = (o = {}) => ({
  handle: 'armband-18k', id: 'gid://shopify/Product/1', tagsEntfernt: 0,
  alt: { title: '18K vergoldetes Armband', descriptionHtml: `<p>Ein Armband aus 18K vergoldetem Edelstahl, schön und lang haltbar im Alltag getragen.</p>${KOPF}`, seoTitle: '18K vergoldetes Armband | LuxeStyle CH', seoDescription: '18K vergoldetes Armband bei LuxeStyle.' },
  neu: { title: 'Vergoldetes Armband', descriptionHtml: `<p>Ein Armband aus vergoldetem Edelstahl, schön und lang haltbar im Alltag getragen.</p>${NEUKOPF}`, seoTitle: 'Vergoldetes Armband | LuxeStyle CH', seoDescription: 'Vergoldetes Armband bei LuxeStyle.' },
  ...o,
});
const probleme = (o) => pruefeEintrag(eintrag(o));
const mit = (feld, wert, f = 'neu') => { const e = eintrag(); return { [f]: { ...e[f], [feld]: wert } }; };
pruefe('Tor: sauberer Eintrag besteht', probleme().length === 0, JSON.stringify(probleme()));
pruefe('Tor: unvollständig → Problem', pruefeEintrag({ handle: 'a' }).length > 0 && pruefeEintrag(null).length > 0 && probleme({ id: undefined }).length > 0 && probleme({ handle: undefined }).length > 0);
pruefe('Tor: alt oder neu fehlt → Problem', probleme({ alt: undefined }).length > 0 && probleme({ neu: undefined }).length > 0);
pruefe('Tor: keine Felder → Problem', probleme({ alt: {}, neu: {} }).some((p) => /keine Felder/.test(p)));
pruefe('Tor: unbekanntes Feld → Problem', probleme({ neu: { ...eintrag().neu, status: 'DRAFT' }, alt: { ...eintrag().alt, status: 'ACTIVE' } }).some((p) => /unbekanntes Feld status/.test(p)));
pruefe('Tor: Handle/Preis/Status nie im Eintrag', ['handle', 'variants', 'tags', 'status', 'price'].every((k) => probleme({ alt: { ...eintrag().alt, [k]: 'x' }, neu: { ...eintrag().neu, [k]: 'y' } }).some((p) => new RegExp('unbekanntes Feld ' + k).test(p))));
pruefe('Tor: Feld nur in alt → Problem', probleme({ neu: { title: 'Vergoldetes Armband' } }).some((p) => /müssen Texte sein/.test(p)));
pruefe('Tor: Feld kein Text → Problem', probleme(mit('title', 5)).some((p) => /müssen Texte sein/.test(p)) && probleme(mit('title', null)).some((p) => /müssen Texte sein/.test(p)));
pruefe('Tor: alt trägt keine Behauptung → Problem', probleme({ alt: { title: 'Armband' }, neu: { title: 'Armbänder' } }).some((p) => /nichts zu bereinigen/.test(p)));
pruefe('Tor: neu trägt noch eine Behauptung → Problem', probleme(mit('title', '18K Armband')).some((p) => /noch 1 Behauptung/.test(p)));
pruefe('Tor: Rest in descriptionHtml → Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml + '<p>goldplattiert</p>')).some((p) => /Behauptung/.test(p)));
pruefe('Tor: Rest in SEO-Titel → Problem', probleme(mit('seoTitle', 'Echtgold Armband | LuxeStyle CH')).some((p) => /Behauptung/.test(p)));
pruefe('Tor: Rest in SEO-Beschreibung → Problem', probleme(mit('seoDescription', 'Armband 14 Karat bei LuxeStyle.')).some((p) => /Behauptung/.test(p)));
pruefe('Tor: Rest steht nur im Kommentar → kein Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml.replace('<!-- ls-marke -->', '<!-- ls-marke -->'))).length === 0);
pruefe('Tor: alt gleich neu je Feld → Problem', probleme({ neu: { ...eintrag().neu, seoDescription: eintrag().alt.seoDescription } }).some((p) => /seoDescription: alt gleich neu/.test(p)));
pruefe('Tor: Markierungskommentar verloren → Problem', probleme(mit('descriptionHtml', NEUKOPF.replace('<!-- ls-marke -->', ''))).some((p) => /Kommentar/.test(p)));
pruefe('Tor: neuer Kommentar → Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml + '<!-- neu -->')).some((p) => /Kommentar/.test(p)));
pruefe('Tor: neuer Link → Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml + '<p><a href="/x">hier</a></p>')).some((p) => /Tag/.test(p)));
pruefe('Tor: neues Bild → Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml + '<img src="x">')).some((p) => /Tag/.test(p)));
pruefe('Tor: verändertes Tag (Attribut) → Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml.replace('<ul>', '<ul class="a">'))).some((p) => /Tag/.test(p)));
pruefe('Tor: entfernte Tags ohne Angabe → Problem', probleme(mit('descriptionHtml', eintrag().neu.descriptionHtml.replace('<li>Edelstahl</li>\n', ''))).some((p) => /2 Tags entfernt, erwartet 0/.test(p)));
pruefe('Tor: entfernte Tags mit richtiger Angabe → ok', probleme({ tagsEntfernt: 2, neu: { ...eintrag().neu, descriptionHtml: eintrag().neu.descriptionHtml.replace('<li>Edelstahl</li>\n', '') } }).length === 0, JSON.stringify(probleme({ tagsEntfernt: 2, neu: { ...eintrag().neu, descriptionHtml: eintrag().neu.descriptionHtml.replace('<li>Edelstahl</li>\n', '') } })));
pruefe('Tor: Angabe grösser als entfernt → Problem', probleme({ tagsEntfernt: 4 }).some((p) => /0 Tags entfernt, erwartet 4/.test(p)));
pruefe('Tor: leerer Text → Problem', probleme(mit('descriptionHtml', '<p> </p>')).some((p) => /leer/.test(p)));
pruefe('Tor: Text unter 60 % → Problem', probleme({ tagsEntfernt: 3, neu: { ...eintrag().neu, descriptionHtml: '<p>Ein Armband.</p>' } }).some((p) => /60 %/.test(p)) || probleme(mit('descriptionHtml', '<p>Ein Armband.</p>')).some((p) => /60 %/.test(p)));
pruefe('Tor: Titel leer → Problem', probleme(mit('title', ' ')).some((p) => /Titel würde leer/.test(p)));
pruefe('Tor: Titel unter 40 % → Problem', probleme({ alt: { ...eintrag().alt, title: '18K vergoldetes Armband mit funkelnden Zirkonia-Steinen und Gravur' }, neu: { ...eintrag().neu, title: 'Armband' } }).some((p) => /40 %/.test(p)));
pruefe('Tor: Titel über 255 → Problem', probleme(mit('title', 'x'.repeat(256))).some((p) => /255/.test(p)));
pruefe('Tor: SEO-Titel leer → Problem', probleme(mit('seoTitle', '')).some((p) => /seoTitle würde leer/.test(p)));
pruefe('Tor: SEO-Titel über 70 → Problem', probleme(mit('seoTitle', 'x'.repeat(71))).some((p) => /seoTitle länger/.test(p)));
pruefe('Tor: SEO-Titel genau 70 → ok', probleme(mit('seoTitle', 'x'.repeat(70))).length === 0);
pruefe('Tor: SEO-Beschreibung leer → Problem', probleme(mit('seoDescription', '')).some((p) => /seoDescription würde leer/.test(p)));
pruefe('Tor: SEO-Beschreibung über 160 → Problem', probleme(mit('seoDescription', 'x'.repeat(161))).some((p) => /seoDescription länger/.test(p)));
pruefe('Tor: SEO-Beschreibung genau 160 → ok', probleme(mit('seoDescription', 'x'.repeat(160))).length === 0);
pruefe('Tor: lange alte SEO-Beschreibung darf nicht länger werden', probleme({ alt: { ...eintrag().alt, seoDescription: '18K ' + 'x'.repeat(200) }, neu: { ...eintrag().neu, seoDescription: 'x'.repeat(200) } }).length === 0 && probleme({ alt: { ...eintrag().alt, seoDescription: '18K ' + 'x'.repeat(200) }, neu: { ...eintrag().neu, seoDescription: 'x'.repeat(250) } }).some((p) => /länger/.test(p)));
pruefe('Tor: nur ein Feld im Eintrag genügt', probleme({ alt: { seoTitle: '18K Armband' }, neu: { seoTitle: 'Armband' } }).length === 0 && felderVon({ alt: { seoTitle: 'a' }, neu: { seoTitle: 'b' } }).join() === 'seoTitle');
pruefe('felderVon in fester Reihenfolge', felderVon({ alt: { seoDescription: 'a', title: 'b' }, neu: { seoDescription: 'a', title: 'b' } }).join() === 'title,seoDescription');
pruefe('felderVon: nur in neu genannt zählt', felderVon({ alt: {}, neu: { title: 'x' } }).join() === 'title');
pruefe('felderVon: nur in alt genannt zählt', felderVon({ alt: { title: 'x' }, neu: {} }).join() === 'title');

// ───────────────────────── strenge Shop-Attrappe
function shop(start, opt = {}) {
  const produkte = new Map(Object.entries(start).map(([handle, v], i) => [handle, { id: `gid://shopify/Product/${i + 1}`, handle, status: 'ACTIVE', title: handle, descriptionHtml: '', seoTitle: null, seoDescription: null, ...v }]));
  const aufrufe = [];
  const q = async (query, vars) => {
    aufrufe.push({ query, vars });
    if (query === LESEN) {
      if (Object.keys(vars).join() !== 'h' || typeof vars.h !== 'string') throw new Error('LESEN: Variablen unzulässig ' + JSON.stringify(vars));
      if (opt.lesenWirft) throw new Error('Netz');
      const p = produkte.get(vars.h);
      if (p && p.noch !== undefined) { if (p.noch <= 0) { Object.assign(p, p.neuerStand); delete p.noch; delete p.neuerStand; } else p.noch--; }
      if (!p) return { productByHandle: null };
      if (opt.fremderHandle) return { productByHandle: { id: p.id, handle: 'anderes-produkt', status: p.status, title: p.title, descriptionHtml: p.descriptionHtml, seo: { title: p.seoTitle, description: p.seoDescription } } };
      return { productByHandle: { id: p.id, handle: p.handle, status: p.status, title: p.title, descriptionHtml: p.descriptionHtml, seo: { title: p.seoTitle, description: p.seoDescription } } };
    }
    if (query === SCHREIBEN) {
      if (Object.keys(vars).join() !== 'in') throw new Error('SCHREIBEN: Variablen unzulässig ' + JSON.stringify(vars));
      const i = vars.in;
      const erlaubt = ['id', 'title', 'descriptionHtml', 'seo'];
      for (const k of Object.keys(i)) if (!erlaubt.includes(k)) throw new Error('SCHREIBEN: Feld nicht erlaubt: ' + k);
      if (i.seo) for (const k of Object.keys(i.seo)) if (!['title', 'description'].includes(k)) throw new Error('SCHREIBEN: seo-Feld nicht erlaubt: ' + k);
      if (opt.schreibenWirft) throw new Error('Netz');
      const p = [...produkte.values()].find((x) => x.id === i.id);
      if (!p) return { productUpdate: { product: null, userErrors: [{ field: ['id'], message: 'Produkt nicht gefunden' }] } };
      if (opt.fehlerBeiSchreiben === p.handle) return { productUpdate: { product: null, userErrors: [{ field: ['title'], message: 'Titel ungültig' }] } };
      if (opt.schreibtNicht) return { productUpdate: { product: { id: p.id }, userErrors: [] } };
      const stand = {};
      if (i.title !== undefined) stand.title = i.title;
      if (i.descriptionHtml !== undefined) stand.descriptionHtml = i.descriptionHtml;
      if (i.seo) { if ('title' in i.seo) stand.seoTitle = i.seo.title; if ('description' in i.seo) stand.seoDescription = i.seo.description; if (opt.seoLoeschtAnderes) { if (!('title' in i.seo)) stand.seoTitle = null; if (!('description' in i.seo)) stand.seoDescription = null; } }
      if (opt.seoTitelLeerBeiGleichheit) { const titel = stand.title ?? p.title; if (stand.seoTitle !== undefined && stand.seoTitle === titel) stand.seoTitle = ''; }
      if (opt.statusAendert) stand.status = 'DRAFT';
      if (opt.verzoegert) { p.neuerStand = { ...(p.neuerStand || {}), ...stand }; p.noch = opt.verzoegert; } else Object.assign(p, stand);
      return { productUpdate: { product: { id: p.id }, userErrors: [] } };
    }
    throw new Error('Unbekannte Abfrage: ' + String(query).slice(0, 60));
  };
  return { q, produkte, aufrufe, schreibAufrufe: () => aufrufe.filter((a) => a.query === SCHREIBEN) };
}
const eint = (n, o = {}) => ({ ...eintrag({ handle: `armband-${n}`, id: `gid://shopify/Product/${n}` }), ...o });
const startVon = (e) => ({ title: e.alt.title, descriptionHtml: e.alt.descriptionHtml, seoTitle: e.alt.seoTitle, seoDescription: e.alt.seoDescription });
const L = () => { const z = []; return { z, f: (s) => z.push(s) }; };
const fahre = async (s, es, o = {}) => { const l = L(); const led = []; const code = await lauf({ q: s.q, eintraege: es, log: l.f, ledger: (x) => led.push(x), pause: async () => {}, ...o }); return { code, log: l.z, led }; };
const e1 = eint(1), e2 = eint(2), e3 = eint(3);
const neuStart = () => shop({ 'armband-1': startVon(e1), 'armband-2': startVon(e2), 'armband-3': startVon(e3) });

// Trockenlauf
{ const s = neuStart(); const r = await fahre(s, [e1, e2, e3]);
  pruefe('Trockenlauf: Exit 0', r.code === 0, JSON.stringify(r));
  pruefe('Trockenlauf: nichts geschrieben', s.schreibAufrufe().length === 0 && [...s.produkte.values()].every((p) => p.title === e1.alt.title));
  pruefe('Trockenlauf: meldet «würde schreiben» je Produkt', r.log.filter((x) => /würde schreiben/.test(x)).length === 3, r.log.join('\n'));
  pruefe('Trockenlauf: Zusammenfassung', r.log.some((x) => /3 würden geschrieben, 0 schon erledigt, 0 Probleme/.test(x)), r.log.join('\n'));
  pruefe('Trockenlauf: kein Ledger', r.led.length === 0); }
// Schreiben
{ const s = neuStart(); const r = await fahre(s, [e1, e2, e3], { live: true });
  pruefe('Live: Exit 0', r.code === 0, JSON.stringify(r));
  pruefe('Live: alle drei neu', ['armband-1', 'armband-2', 'armband-3'].every((h) => { const p = s.produkte.get(h); return p.title === e1.neu.title && p.descriptionHtml === e1.neu.descriptionHtml && p.seoTitle === e1.neu.seoTitle && p.seoDescription === e1.neu.seoDescription; }));
  pruefe('Live: genau drei Schreibaufrufe', s.schreibAufrufe().length === 3);
  pruefe('Live: Schreibaufruf trägt id, title, descriptionHtml und seo', (() => { const i = s.schreibAufrufe()[0].vars.in; return i.id === e1.id && i.title === e1.neu.title && i.descriptionHtml === e1.neu.descriptionHtml && i.seo.title === e1.neu.seoTitle && i.seo.description === e1.neu.seoDescription && !('status' in i) && !('handle' in i); })());
  pruefe('Live: Status bleibt ACTIVE', [...s.produkte.values()].every((p) => p.status === 'ACTIVE'));
  pruefe('Live: Ledger GESCHRIEBEN je Produkt', r.led.filter((x) => /\|GESCHRIEBEN\|/.test(x)).length === 3, r.led.join('\n'));
  pruefe('Live: Ledger-Zeile trägt Zeit, Art, Handle', /^\d{4}-\d\d-\d\dT.*\|GESCHRIEBEN\|armband-1\|$/.test(r.led[0]), r.led[0]);
  pruefe('Live: Zusammenfassung', r.log.some((x) => /Geschrieben und zurückgelesen: 3, schon erledigt: 0, Probleme: 0/.test(x)));
  // Idempotenz
  const r2 = await fahre(s, [e1, e2, e3], { live: true });
  pruefe('Wiederholung: Exit 0 und keine weiteren Schreibaufrufe', r2.code === 0 && s.schreibAufrufe().length === 3 && r2.log.filter((x) => /^schon erledigt: armband/.test(x)).length === 3, JSON.stringify(r2));
  // Rücknahme
  const t = await fahre(s, [e1, e2, e3], { zurueck: true });
  pruefe('Rücknahme-Trockenlauf: schreibt nichts', t.code === 0 && s.schreibAufrufe().length === 3 && s.produkte.get('armband-1').title === e1.neu.title);
  const z = await fahre(s, [e1, e2, e3], { zurueck: true, live: true });
  pruefe('Rücknahme live: alles wieder alt', z.code === 0 && ['armband-1', 'armband-2', 'armband-3'].every((h) => { const p = s.produkte.get(h); return p.title === e1.alt.title && p.descriptionHtml === e1.alt.descriptionHtml && p.seoTitle === e1.alt.seoTitle && p.seoDescription === e1.alt.seoDescription; }), JSON.stringify(z));
  pruefe('Rücknahme live: Ledger ZURUECK', z.led.filter((x) => /\|ZURUECK\|/.test(x)).length === 3);
  pruefe('Rücknahme prüft die Tore nicht (alt darf Behauptungen tragen)', z.code === 0); }
// nur geänderte Felder werden geschrieben
{ const e = eint(1, { alt: { seoTitle: '18K Armband' }, neu: { seoTitle: 'Armband' } });
  const s = shop({ 'armband-1': { title: 'Armband Titel', descriptionHtml: '<p>Text</p>', seoTitle: '18K Armband', seoDescription: 'Beschr' } });
  const r = await fahre(s, [e], { live: true }); const i = s.schreibAufrufe()[0]?.vars.in;
  pruefe('nur ein Feld: Exit 0 und Titel/Beschreibung bleiben', r.code === 0 && s.produkte.get('armband-1').seoTitle === 'Armband' && s.produkte.get('armband-1').title === 'Armband Titel' && s.produkte.get('armband-1').descriptionHtml === '<p>Text</p>', JSON.stringify(r));
  pruefe('nur ein Feld: Aufruf trägt nur id und seo, bei SEO-Titel beide Werte (Beschreibung aus dem Shop)', i && !('title' in i) && !('descriptionHtml' in i) && i.seo.title === 'Armband' && i.seo.description === 'Beschr', JSON.stringify(i)); }
{ const e = eint(1, { alt: { seoDescription: '18K Armband' }, neu: { seoDescription: 'Armband' } });
  const s = shop({ 'armband-1': { title: 'T', descriptionHtml: '<p>x</p>', seoTitle: null, seoDescription: '18K Armband' } });
  const r = await fahre(s, [e], { live: true }); const i = s.schreibAufrufe()[0]?.vars.in;
  pruefe('SEO-Titel im Shop leer: wird nicht mitgeschickt', r.code === 0 && i && !('title' in i.seo) && i.seo.description === 'Armband' && s.produkte.get('armband-1').seoTitle === null, JSON.stringify([r, i])); }
{ const e = eint(1, { alt: { title: '18K Ring' }, neu: { title: 'Ring' } });
  const s = shop({ 'armband-1': { title: '18K Ring', descriptionHtml: '<p>x</p>', seoTitle: 'S', seoDescription: 'B' } });
  const r = await fahre(s, [e], { live: true }); const i = s.schreibAufrufe()[0]?.vars.in;
  pruefe('nur Titel: kein seo im Aufruf', r.code === 0 && i && !('seo' in i) && !('descriptionHtml' in i) && s.produkte.get('armband-1').title === 'Ring', JSON.stringify([r, i])); }
// Schutzgitter
{ const s = neuStart(); s.produkte.get('armband-2').title = 'Von jemand anderem geändert';
  const r = await fahre(s, [e1, e2, e3], { live: true });
  pruefe('Fremde Änderung: Produkt 2 unberührt, 1 und 3 geschrieben, Exit 6', r.code === 6 && s.produkte.get('armband-2').title === 'Von jemand anderem geändert' && s.produkte.get('armband-1').title === e1.neu.title && s.produkte.get('armband-3').title === e1.neu.title, JSON.stringify(r));
  pruefe('Fremde Änderung: gemeldet und im Ledger', r.log.some((x) => /FREMD VERÄNDERT armband-2: title/.test(x)) && r.led.some((x) => /\|FREMD\|armband-2\|title/.test(x)));
  const r2 = await fahre(s, [e1, e2, e3], { live: true, fremdUeberschreiben: true });
  pruefe('FREMD_UEBERSCHREIBEN schreibt trotzdem', r2.code === 0 && s.produkte.get('armband-2').title === e1.neu.title, JSON.stringify(r2)); }
{ const s = neuStart(); s.produkte.get('armband-1').title = e1.neu.title; // Teilstand: Titel schon neu, Rest alt
  const r = await fahre(s, [e1], { live: true });
  pruefe('Teilstand wird fortgesetzt', r.code === 0 && s.produkte.get('armband-1').descriptionHtml === e1.neu.descriptionHtml && s.produkte.get('armband-1').seoTitle === e1.neu.seoTitle, JSON.stringify(r)); }
{ const s = neuStart(); const r = await fahre(s, [e1, e2, e3], { live: true, nur: ['armband-2'] });
  pruefe('ONLY schreibt nur das genannte Produkt', r.code === 0 && s.schreibAufrufe().length === 1 && s.produkte.get('armband-2').title === e1.neu.title && s.produkte.get('armband-1').title === e1.alt.title, JSON.stringify(r));
  const r2 = await fahre(s, [e1, e2, e3], { live: true, nur: ['gibt-es-nicht'] });
  pruefe('ONLY trifft nichts → Exit 2', r2.code === 2); }
{ const s = neuStart(); const r = await fahre(s, [e1, e2, e3], { live: true, max: 2 });
  pruefe('MAX=2: genau zwei geschrieben, das dritte ausgelassen und gemeldet', r.code === 0 && s.schreibAufrufe().length === 2 && s.produkte.get('armband-3').title === e1.alt.title && r.log.some((x) => /wegen MAX=2 ausgelassen: 1/.test(x)), JSON.stringify(r));
  const r2 = await fahre(s, [e1, e2, e3], { live: true, max: 2 });
  pruefe('MAX: zweiter Lauf holt den Rest nach', r2.code === 0 && s.produkte.get('armband-3').title === e1.neu.title && s.schreibAufrufe().length === 3, JSON.stringify(r2));
  const s2 = neuStart(); const r3 = await fahre(s2, [e1, e2, e3], { live: true, max: 0 });
  pruefe('MAX=0 schreibt nichts', r3.code === 0 && s2.schreibAufrufe().length === 0, JSON.stringify(r3)); }
{ const s = neuStart(); const r = await fahre(s, [e1, e2, e3], { live: true, max: 1 });
  pruefe('MAX zählt nur Schreibungen, nicht «schon erledigt»', (() => { const s2 = neuStart(); s2.produkte.get('armband-1').title = e1.neu.title; Object.assign(s2.produkte.get('armband-1'), { descriptionHtml: e1.neu.descriptionHtml, seoTitle: e1.neu.seoTitle, seoDescription: e1.neu.seoDescription }); return true; })() && r.code === 0);
  const s2 = neuStart(); Object.assign(s2.produkte.get('armband-1'), { title: e1.neu.title, descriptionHtml: e1.neu.descriptionHtml, seoTitle: e1.neu.seoTitle, seoDescription: e1.neu.seoDescription });
  const r2 = await fahre(s2, [e1, e2, e3], { live: true, max: 1 });
  pruefe('MAX=1: schon erledigtes Produkt verbraucht keinen Platz', r2.code === 0 && s2.schreibAufrufe().length === 1 && s2.produkte.get('armband-2').title === e1.neu.title && s2.produkte.get('armband-3').title === e1.alt.title, JSON.stringify(r2)); }
// Fehlerfälle: Halt
{ const s = neuStart(); const r = await fahre(s, [e1, e2, e3], { live: true, schreibenWirftNicht: true });
  const s2 = shop({ 'armband-1': startVon(e1), 'armband-2': startVon(e2), 'armband-3': startVon(e3) }, { fehlerBeiSchreiben: 'armband-2' });
  const r2 = await fahre(s2, [e1, e2, e3], { live: true });
  pruefe('Fehler beim Schreiben: Halt, Produkt 3 unberührt, Exit 6', r2.code === 6 && s2.produkte.get('armband-1').title === e1.neu.title && s2.produkte.get('armband-3').title === e1.alt.title && r2.log.some((x) => /FEHLER armband-2: Titel ungültig/.test(x)) && r2.led.some((x) => /\|FEHLER\|armband-2\|Titel ungültig/.test(x)), JSON.stringify(r2));
  pruefe('Fehler beim Schreiben: Produkt 2 unverändert', s2.produkte.get('armband-2').title === e1.alt.title);
  const s3 = shop({ 'armband-1': startVon(e1), 'armband-2': startVon(e2) }, { schreibenWirft: true });
  const r3 = await fahre(s3, [e1, e2], { live: true });
  pruefe('Ausnahme beim Schreiben: Halt, Exit 6, Meldung «Ausnahme»', r3.code === 6 && r3.log.some((x) => /Ausnahme: Netz/.test(x)) && s3.schreibAufrufe().length === 1, JSON.stringify(r3)); }
{ const s = shop({ 'armband-1': startVon(e1), 'armband-2': startVon(e2) }, { schreibtNicht: true });
  const r = await fahre(s, [e1, e2], { live: true, leseVersuche: 2 });
  pruefe('Schreibt der Shop nichts: ABWEICHUNG, Halt, Exit 6, Ledger', r.code === 6 && s.schreibAufrufe().length === 1 && r.log.some((x) => /ABWEICHUNG armband-1/.test(x)) && r.led.some((x) => /\|ABWEICHUNG\|armband-1\|/.test(x)), JSON.stringify(r)); }
{ const s = shop({ 'armband-1': startVon(e1) }, { verzoegert: 2 });
  const r = await fahre(s, [e1], { live: true, leseVersuche: 5 });
  pruefe('Verzögerte Anzeige: Rücklesen wartet und besteht', r.code === 0 && s.produkte.get('armband-1').title === e1.neu.title, JSON.stringify(r));
  const s2 = shop({ 'armband-1': startVon(e1) }, { verzoegert: 9 });
  const r2 = await fahre(s2, [e1], { live: true, leseVersuche: 3 });
  pruefe('Zu lange verzögert: ABWEICHUNG', r2.code === 6 && r2.log.some((x) => /ABWEICHUNG/.test(x)), JSON.stringify(r2)); }
{ const s = shop({ 'armband-1': { ...startVon(e1), seoTitle: 'Mein SEO', seoDescription: 'Meine Beschreibung' } });
  const e = eint(1, { alt: { title: e1.alt.title }, neu: { title: e1.neu.title } });
  const r = await fahre(s, [e], { live: true, leseVersuche: 2 });
  pruefe('Titel allein: SEO-Felder bleiben', r.code === 0 && s.produkte.get('armband-1').seoTitle === 'Mein SEO' && s.produkte.get('armband-1').seoDescription === 'Meine Beschreibung', JSON.stringify(r)); }
{ const s = shop({ 'armband-1': { ...startVon(e1), seoTitle: 'Eigener Titel', seoDescription: 'Beschr' } }, { seoLoeschtAnderes: true });
  const e = eint(1, { alt: { seoDescription: '18K Beschr' }, neu: { seoDescription: 'Beschr' } });
  s.produkte.get('armband-1').seoDescription = '18K Beschr';
  const r = await fahre(s, [e], { live: true, leseVersuche: 2 });
  pruefe('Attrappe löscht nicht mitgeschickte SEO-Felder: wir schicken beide, nichts geht verloren', r.code === 0 && s.produkte.get('armband-1').seoTitle === 'Eigener Titel' && s.produkte.get('armband-1').seoDescription === 'Beschr', JSON.stringify([r, s.schreibAufrufe().map((a) => a.vars.in)])); }
{ const s = shop({ 'armband-1': startVon(e1) }, { statusAendert: true });
  const r = await fahre(s, [e1], { live: true, leseVersuche: 2 });
  pruefe('Status ändert sich beim Schreiben: Halt, Exit 6', r.code === 6 && r.log.some((x) => /ABWEICHUNG armband-1: ein Feld ausserhalb des Eintrags oder der Status/.test(x)) && r.led.some((x) => /\|ABWEICHUNG\|armband-1\|Feld ausserhalb/.test(x)), JSON.stringify(r)); }
{ const e = eint(1, { alt: { seoTitle: '18K Armband' }, neu: { seoTitle: 'Armband' } });
  const s = shop({ 'armband-1': { title: 'T', descriptionHtml: '<p>x</p>', seoTitle: '18K Armband', seoDescription: 'B' } });
  const orig = s.q; let n = 0;
  const q2 = async (query, vars) => { const j = await orig(query, vars); if (query === SCHREIBEN) { const p = s.produkte.get('armband-1'); p.title = 'heimlich geändert'; n++; } return j; };
  const l = L(); const code = await lauf({ q: q2, eintraege: [e], log: l.f, ledger: () => {}, pause: async () => {}, live: true, leseVersuche: 2 });
  pruefe('Heimlich geändertes Feld ausserhalb des Eintrags: Halt', code === 6 && n === 1, JSON.stringify([code, l.z])); }
{ const s = neuStart(); s.produkte.get('armband-1').id = 'gid://shopify/Product/999';
  const r = await fahre(s, [e1], { live: true });
  pruefe('id weicht ab: nichts geschrieben, Exit 6', r.code === 6 && s.schreibAufrufe().length === 0 && r.log.some((x) => /FALSCHE ID armband-1/.test(x)), JSON.stringify(r)); }
{ const s = neuStart(); const r = await fahre(s, [e1, eint(9)], { live: true });
  pruefe('Produkt nicht im Shop: FEHLT, die anderen laufen, Exit 6', r.code === 6 && s.produkte.get('armband-1').title === e1.neu.title && r.log.some((x) => /FEHLT armband-9/.test(x)) && r.led.some((x) => /\|FEHLER\|armband-9\|nicht lesbar/.test(x)), JSON.stringify(r)); }
{ const s = shop({ 'armband-1': startVon(e1) }, { fremderHandle: true });
  const r = await fahre(s, [e1], { live: true });
  pruefe('Shop liefert anderes Produkt (Handle weicht ab): nicht lesbar, nichts geschrieben', r.code === 6 && s.schreibAufrufe().length === 0 && r.log.some((x) => /FEHLT armband-1/.test(x)), JSON.stringify(r)); }
// Tore im Lauf
{ const s = neuStart(); const schlecht = eint(2, { neu: { ...e1.neu, title: '18K Armband' } });
  const r = await fahre(s, [e1, schlecht, e3], { live: true });
  pruefe('Ein Eintrag besteht die Tore nicht: Exit 2 und NICHTS geschrieben', r.code === 2 && s.schreibAufrufe().length === 0 && r.log.some((x) => /TOR armband-2/.test(x)) && r.log.some((x) => /1 Einträge bestehen die Tore nicht/.test(x)), JSON.stringify(r));
  const t = await fahre(s, [e1, schlecht, e3], {});
  pruefe('Tore gelten schon im Trockenlauf', t.code === 2); }
{ const s = neuStart(); const r = await fahre(s, [e1, e1], { live: true });
  pruefe('Doppelte Einträge → Exit 2', r.code === 2 && s.schreibAufrufe().length === 0 && r.log.some((x) => /Doppelte/.test(x))); }
{ const s = neuStart(); const r = await fahre(s, [], { live: true });
  pruefe('Leere Liste → Exit 2', r.code === 2 && s.aufrufe.length === 0); }
{ const s = neuStart(); const r = await fahre(s, [e1, e2], { live: true, nur: ['armband-1'] });
  pruefe('ONLY: Tore prüfen nur die gewählten (ein schlechter Eintrag ausserhalb stört nicht)', r.code === 0 && s.produkte.get('armband-1').title === e1.neu.title); }
{ const s = neuStart(); const schlecht = eint(2, { neu: { ...e1.neu, title: '18K Armband' } });
  const r = await fahre(s, [e1, schlecht], { live: true, nur: ['armband-1'] });
  pruefe('ONLY: schlechter Eintrag ausserhalb der Auswahl stört nicht', r.code === 0 && s.produkte.get('armband-1').title === e1.neu.title, JSON.stringify(r)); }
{ const s = neuStart(); const r = await fahre(s, [e1, eint(2, { neu: { ...e1.neu, title: '18K Armband' } })], { live: true, nur: ['armband-2'] });
  pruefe('ONLY: schlechter Eintrag in der Auswahl → Exit 2', r.code === 2 && s.schreibAufrufe().length === 0); }
// Lesefehler
{ const s = shop({ 'armband-1': startVon(e1) }, { lesenWirft: true });
  let ausnahme = null; try { await fahre(s, [e1], { live: true }); } catch (x) { ausnahme = x; }
  pruefe('Lesefehler wird nicht verschluckt (Ausnahme nach oben)', ausnahme && /Netz/.test(ausnahme.message)); }
// flach
pruefe('flach: SEO-Felder aus seo{title,description}, fehlendes seo → null', (() => { const a = flach({ id: 'x', status: 'ACTIVE', title: 'T', descriptionHtml: '<p>a</p>', seo: { title: 'S', description: 'B' } }); const b = flach({ id: 'x', status: 'ACTIVE', title: 'T', descriptionHtml: null, seo: null }); return a.seoTitle === 'S' && a.seoDescription === 'B' && b.seoTitle === null && b.descriptionHtml === ''; })());
// Normalisierung beim Vergleich
{ const e = eint(1, { alt: { title: '18K Ring' }, neu: { title: 'Ring' } });
  const s = shop({ 'armband-1': { title: 'Ring \n', descriptionHtml: '<p>x</p>' } });
  const r = await fahre(s, [e], { live: true });
  pruefe('Endleerraum beim Vergleich ignoriert: schon erledigt', r.code === 0 && s.schreibAufrufe().length === 0 && r.log.some((x) => /schon erledigt/.test(x))); }

// ───────────────────────── Ergänzungen aus der Mutationsprobe
pruefe('belege: Verweis auf Adresse mit 18k im Link zählt nicht', belege('<a href="/products/18k-gold-ring">Ring</a>').length === 0);
{ const schlecht = eint(1, { neu: { ...e1.neu, title: '18K Armband' } }); // Tor-Verstoss in der Datei: Rücknahme darf trotzdem zurückschreiben
  const s = shop({ 'armband-1': { ...startVon(e1), title: schlecht.neu.title } });
  const z = await fahre(s, [schlecht], { zurueck: true, live: true });
  pruefe('Rücknahme prüft die Tore nicht: Eintrag mit Verstoss wird trotzdem zurückgeschrieben', z.code === 0 && s.produkte.get('armband-1').title === e1.alt.title, JSON.stringify(z)); }
{ const s = neuStart(); s.produkte.get('armband-1').title = e1.neu.title;
  const r = await fahre(s, [e1], { live: true }); const i = s.schreibAufrufe()[0]?.vars.in;
  pruefe('Teilstand: der Aufruf schreibt das schon neue Feld nicht noch einmal', r.code === 0 && i && !('title' in i) && 'descriptionHtml' in i, JSON.stringify(i && Object.keys(i))); }
{ const e = eint(1, { alt: { seoTitle: '18K Armband' }, neu: { seoTitle: 'Armband' } });
  const s = shop({ 'armband-1': { title: 'T', descriptionHtml: '<p>x</p>', seoTitle: '18K Armband', seoDescription: null } });
  const r = await fahre(s, [e], { live: true }); const i = s.schreibAufrufe()[0]?.vars.in;
  pruefe('SEO-Beschreibung im Shop leer: wird nicht mitgeschickt', r.code === 0 && i && i.seo.title === 'Armband' && !('description' in i.seo) && s.produkte.get('armband-1').seoDescription === null, JSON.stringify([r, i])); }
pruefe('flach: Status wird übernommen', flach({ id: 'x', status: 'DRAFT', title: 'T', descriptionHtml: '', seo: null }).status === 'DRAFT');

pruefe('Tor: Kommentare in anderer Reihenfolge → Problem', probleme({ alt: { ...eintrag().alt, descriptionHtml: '<!-- a --><p>Armband 18K</p><!-- b -->' }, neu: { ...eintrag().neu, descriptionHtml: '<!-- b --><p>Armband</p><!-- a -->' } }).some((p) => /Kommentar/.test(p)));
{ const s = shop({ 'armband-1': startVon(e1), 'armband-2': startVon(e2), 'armband-3': startVon(e3) }, { fehlerBeiSchreiben: 'armband-2' });
  const r = await fahre(s, [e1, e2, e3], { live: true });
  pruefe('Fehler beim Schreiben: Halt sofort (kein Rücklesen, keine Abweichungsmeldung)', r.code === 6 && !r.log.some((x) => /ABWEICHUNG/.test(x)) && !r.led.some((x) => /ABWEICHUNG/.test(x)), JSON.stringify(r)); }
{ const s = neuStart(); s.produkte.get('armband-2').title = 'Von jemand anderem geändert';
  const r = await fahre(s, [e1, e2, e3], {});
  pruefe('Trockenlauf mit Problem (fremd verändert): Exit 6, nichts geschrieben', r.code === 6 && s.schreibAufrufe().length === 0 && r.log.some((x) => /1 Probleme/.test(x)), JSON.stringify(r)); }

// SEO-Titel gleich Produkttitel: Shopify liest ihn leer zurück (gemessen 17.11.2026)
{ const e = eint(1, { alt: { title: '18K Armband', seoTitle: '18K Armband…' }, neu: { title: 'Vergoldetes Armband', seoTitle: 'Vergoldetes Armband' } });
  const s = shop({ 'armband-1': { title: '18K Armband', descriptionHtml: '<p>x</p>', seoTitle: '18K Armband…', seoDescription: 'B' } }, { seoTitelLeerBeiGleichheit: true });
  const r = await fahre(s, [e], { live: true, leseVersuche: 2 });
  pruefe('SEO-Titel gleich Produkttitel (Shopify liest leer zurück): geschrieben, Exit 0, kein Alarm', r.code === 0 && s.produkte.get('armband-1').title === 'Vergoldetes Armband' && s.produkte.get('armband-1').seoTitle === '' && r.led.some((x) => /\|GESCHRIEBEN\|armband-1\|/.test(x)), JSON.stringify(r));
  const r2 = await fahre(s, [e], { live: true, leseVersuche: 2 });
  pruefe('SEO-Titel gleich Produkttitel: zweiter Lauf erkennt «schon erledigt»', r2.code === 0 && r2.log.some((x) => /^schon erledigt: armband-1/.test(x)) && s.schreibAufrufe().length === 1, JSON.stringify(r2));
  const z = await fahre(s, [e], { zurueck: true, live: true, leseVersuche: 2 });
  pruefe('SEO-Titel gleich Produkttitel: Rücknahme stellt alt wieder her', z.code === 0 && s.produkte.get('armband-1').title === '18K Armband' && s.produkte.get('armband-1').seoTitle === '18K Armband…', JSON.stringify([z, s.produkte.get('armband-1')])); }
{ const e = eint(1, { alt: { seoTitle: '18K Armband' }, neu: { seoTitle: 'Armband' } });
  const s = shop({ 'armband-1': { title: 'Anderer Titel', descriptionHtml: '<p>x</p>', seoTitle: '', seoDescription: 'B' } });
  const r = await fahre(s, [e], { live: true, leseVersuche: 2 });
  pruefe('leerer SEO-Titel gilt NICHT als gleich, wenn er nicht dem Produkttitel entspricht: fremd verändert', r.code === 6 && r.log.some((x) => /FREMD VERÄNDERT armband-1: seoTitle/.test(x)) && s.schreibAufrufe().length === 0, JSON.stringify(r)); }

// ───────────────────────── gleichFeld (a = im Shop gelesener Stand, b = Soll): Sonderfall SEO-Titel gleich Produkttitel
pruefe('gleichFeld: gleiche Werte', gleichFeld('title', { title: 'A' }, { title: 'A' }) && gleichFeld('seoTitle', { seoTitle: 'X' }, { seoTitle: 'X' }));
pruefe('gleichFeld: andere Werte', !gleichFeld('title', { title: 'A' }, { title: 'B' }) && !gleichFeld('seoTitle', { seoTitle: 'X', title: 'A' }, { seoTitle: 'Y', title: 'A' }));
pruefe('gleichFeld: gelesener SEO-Titel leer, Soll = gelesener Produkttitel → gleich', gleichFeld('seoTitle', { title: 'A', seoTitle: '' }, { title: 'B', seoTitle: 'A' }));
pruefe('gleichFeld: gelesener SEO-Titel null, Soll = gelesener Produkttitel → gleich', gleichFeld('seoTitle', { title: 'A', seoTitle: null }, { title: 'B', seoTitle: 'A' }));
pruefe('gleichFeld: Soll-SEO-Titel gleich dem Soll-Titel (nicht dem gelesenen) → NICHT gleich', !gleichFeld('seoTitle', { title: 'A', seoTitle: '' }, { title: 'B', seoTitle: 'B' }));
pruefe('gleichFeld: gelesener SEO-Titel leer, Soll anderer Text → NICHT gleich', !gleichFeld('seoTitle', { title: 'A', seoTitle: '' }, { title: 'A', seoTitle: 'Anderer Text' }));
pruefe('gleichFeld: beide SEO-Titel leer (null gegen leer) → gleich', gleichFeld('seoTitle', { title: 'A', seoTitle: null }, { title: 'B', seoTitle: '' }));
pruefe('gleichFeld: Sonderfall gilt nur für seoTitle', !gleichFeld('seoDescription', { title: 'A', seoDescription: '' }, { title: 'B', seoDescription: 'A' }) && !gleichFeld('title', { title: '' }, { title: 'A' }));
pruefe('gleichFeld: Zeilenende und Endleerraum zählen nicht', gleichFeld('seoTitle', { title: 'A b', seoTitle: '' }, { title: 'X', seoTitle: 'A b \r\n' }));
pruefe('gleichFeld: gelesener SEO-Titel gesetzt, Soll leer → NICHT gleich (keine Gegenrichtung)', !gleichFeld('seoTitle', { title: 'A', seoTitle: 'A' }, { title: 'A', seoTitle: '' }));

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
