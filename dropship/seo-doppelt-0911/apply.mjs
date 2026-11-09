// Doppelte SEO-Titel und -Beschreibungen bei 21 Sammlungen auflösen (09.11.2026, zweite Charge nach dem Modus «beschreibung»).
// Felder je Sammlung: title (SEO-Titel), description (SEO-Beschreibung), h1 (Sammlungstitel), html (Sammlungstext). Alles Weitere bleibt unberührt.
// Trockenlauf ist Vorgabe (liest nur, zeigt jede Änderung).
//   Einspielen:  LIVE=1 node dropship/seo-doppelt-0911/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/seo-doppelt-0911/apply.mjs   (schreibt nur zurück, wo der Shop noch genau den neuen Wert trägt)
//   Selbsttest:  node dropship/seo-doppelt-0911/apply.mjs --selbsttest   (mit Attrappe des Shops, auch für den Schreibweg)
// Vor dem ersten Schreiben liegt der Ist-Stand aller Sammlungen in sicherung/vor.json (eine vorhandene Datei bleibt).
// Jede Sammlung: der Ist-Wert muss dem erwarteten 'alt' entsprechen (sonst Abbruch, nichts geschrieben); `seo` ersetzt Shopify als Ganzes,
// darum gehen Titel UND Beschreibung immer zusammen mit. Neue Werte dürfen keinem SEO-Titel und keiner SEO-Beschreibung einer anderen Sammlung gleichen.
// Exit: 0 ok · 3 Stand weicht ab (nichts geschrieben) · 4 Prüfung der Texte oder Kollision · 5 userErrors · 6 Rücklesen weicht ab
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HIER = dirname(fileURLToPath(import.meta.url)) + '/';
export const FELDER = ['title', 'description', 'h1', 'html'];
export const MAX = { title: 60, description: 160, h1: 60 };
// Aussagen, die in den neuen Texten nicht stehen dürfen (Besitzerregeln: kein ß, keine Gedankenstriche, keine Rückgabeversprechen, keine unbelegten Material-/Stein-/Magnet-Aussagen).
export const VERBOTEN = [/ß/, /[–—]/, /\b30 Tage\b/i, /Rückgabe/i, /WELCOME/i, /bis Weihnachten/i, /Echtleder|Echthaar|Seide/i, /MagSafe/i, /D-VVS1/i];

export const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function pruefe(aenderungen) {
  const fehler = [];
  for (const a of aenderungen) {
    const ort = `${a.handle} ${a.feld}`;
    if (a.art !== 'collection') fehler.push(`${ort}: nur Sammlungen`);
    if (!FELDER.includes(a.feld)) { fehler.push(`${ort}: unbekanntes Feld`); continue; }
    if (typeof a.neu !== 'string' || !a.neu.trim()) { fehler.push(`${ort}: leerer Text`); continue; }
    if (typeof a.alt !== 'string') fehler.push(`${ort}: erwarteter Altwert fehlt`);
    if (MAX[a.feld] && a.neu.length > MAX[a.feld]) fehler.push(`${ort}: ${a.neu.length} Zeichen (Grenze ${MAX[a.feld]})`);
    if (a.neu === a.alt) fehler.push(`${ort}: neu gleich alt`);
    if (a.feld !== 'html' && /&amp;|&#/.test(a.neu)) fehler.push(`${ort}: HTML-Entität im Text`);
    if (a.feld === 'html' && !/^<p>[^<]+<\/p>$/.test(a.neu)) fehler.push(`${ort}: Sammlungstext muss ein einfacher Absatz sein`);
    for (const r of VERBOTEN) if (r.test(a.neu)) fehler.push(`${ort}: verbotene Aussage ${r}`);
  }
  for (const feld of ['title', 'description']) {
    const werte = aenderungen.filter((a) => a.feld === feld).map((a) => norm(a.neu));
    if (new Set(werte).size !== werte.length) fehler.push(`zwei neue ${feld === 'title' ? 'SEO-Titel' : 'SEO-Beschreibungen'} sind gleich`);
  }
  return fehler;
}

// Kollision mit dem Bestand: ein neuer SEO-Titel/-Beschreibung darf keiner anderen Sammlung (ausser den hier geänderten) gleichen.
export function kollisionen(aenderungen, bestand) {
  const eigene = new Set(aenderungen.map((a) => a.handle));
  const titel = new Map(), beschr = new Map();
  for (const c of bestand) {
    if (eigene.has(c.handle)) continue;
    const t = norm(c.seo?.title), d = norm(c.seo?.description);
    if (t) titel.set(t, c.handle);
    if (d) beschr.set(d, c.handle);
  }
  const fehler = [];
  for (const a of aenderungen) {
    if (a.feld === 'title' && titel.has(norm(a.neu))) fehler.push(`${a.handle}: neuer SEO-Titel gleicht dem von «${titel.get(norm(a.neu))}»`);
    if (a.feld === 'description' && beschr.has(norm(a.neu))) fehler.push(`${a.handle}: neue SEO-Beschreibung gleicht der von «${beschr.get(norm(a.neu))}»`);
  }
  return fehler;
}

export function gruppiere(aenderungen) {
  const m = new Map();
  for (const a of aenderungen) { if (!m.has(a.handle)) m.set(a.handle, { art: a.art, handle: a.handle, felder: {} }); m.get(a.handle).felder[a.feld] = a; }
  return [...m.values()];
}

// Entscheidet je Sammlung: 'schreiben' | 'schon-neu' | 'abweichend'. ist = {title, description, h1, html}. richtung 'vor' (alt -> neu) oder 'zurueck' (neu -> alt)
export function urteil(g, ist, richtung = 'vor') {
  const von = richtung === 'vor' ? 'alt' : 'neu', nach = richtung === 'vor' ? 'neu' : 'alt';
  let alleNach = true;
  for (const [f, a] of Object.entries(g.felder)) {
    if ((ist[f] ?? '') === a[von]) { alleNach = false; continue; }
    if ((ist[f] ?? '') === a[nach]) continue;
    return { art: 'abweichend', feld: f, ist: ist[f] ?? null };
  }
  return { art: alleNach ? 'schon-neu' : 'schreiben' };
}

export function wunschwerte(g, ist, richtung = 'vor') {
  const nach = richtung === 'vor' ? 'neu' : 'alt';
  const w = {};
  for (const f of FELDER) w[f] = g.felder[f] ? g.felder[f][nach] : (ist[f] ?? '');
  return w;
}

// collectionUpdate-Eingabe: der Sammlungstitel und -text nur, wenn sie geändert werden; `seo` immer mit Titel und Beschreibung zusammen
export function baueInput(id, g, w) {
  const i = { id };
  if (g.felder.h1) i.title = w.h1;
  if (g.felder.html) i.descriptionHtml = w.html;
  if (g.felder.title || g.felder.description) {
    const seo = {};
    if (g.felder.title || w.title) seo.title = w.title; // ein leeres, nicht zu änderndes Feld wird nicht mitgeschickt
    if (g.felder.description || w.description) seo.description = w.description;
    i.seo = seo;
  }
  return i;
}

const ALLE_Q = `query($a:String){collections(first:250, after:$a){pageInfo{hasNextPage endCursor} nodes{handle seo{title description}}}}`;
const EINE_Q = `query($h:String!){ n: collectionByHandle(handle:$h){ id title descriptionHtml seo{title description} } }`;
const MUT = 'mutation($i:CollectionInput!){ r: collectionUpdate(input:$i){ userErrors{field message} } }';

export async function alleSammlungen(q) {
  const alle = []; let after = null;
  do {
    const d = await q(ALLE_Q, { a: after });
    alle.push(...d.collections.nodes); after = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null;
  } while (after);
  return alle;
}

// Der ganze Ablauf mit einer Abfragefunktion q(query, variablen), damit der Schreibweg gegen eine Attrappe geprüft werden kann.
export async function lauf(q, { aenderungen, LIVE = false, ZURUECK = false, sichern = HIER + 'sicherung/vor.json', warteMs = 8000, log = console.log, fehler: logFehler = console.error } = {}) {
  const richtung = ZURUECK ? 'zurueck' : 'vor';
  const pr = pruefe(aenderungen);
  if (pr.length && !ZURUECK) { logFehler('Prüfung der Texte fehlgeschlagen:\n- ' + pr.join('\n- ')); return { code: 4 }; }
  const lesen = async (g) => {
    const x = (await q(EINE_Q, { h: g.handle })).n;
    return x ? { id: x.id, h1: x.title, html: x.descriptionHtml, title: x.seo?.title ?? null, description: x.seo?.description ?? null } : null;
  };
  const jetzt = [];
  for (const g of gruppiere(aenderungen)) { const ist = await lesen(g); if (!ist) { logFehler('Nicht gefunden: ' + g.handle); return { code: 3 }; } jetzt.push({ g, ist }); }
  if (!ZURUECK) {
    const kol = kollisionen(aenderungen, await alleSammlungen(q));
    if (kol.length) { logFehler('Kollision mit dem Bestand:\n- ' + kol.join('\n- ')); return { code: 4 }; }
    log('Kollisionsprüfung gegen alle Sammlungen: keine Treffer');
  }
  let abweichend = 0; const zuSchreiben = [];
  for (const { g, ist } of jetzt) {
    const u = urteil(g, ist, richtung);
    log(`${u.art.padEnd(10)} ${g.handle} [${Object.keys(g.felder).join(', ')}]${u.feld ? ' Feld ' + u.feld + ' ist: ' + JSON.stringify(u.ist) : ''}`);
    if (u.art === 'abweichend') abweichend++;
    if (u.art === 'schreiben') zuSchreiben.push({ g, ist });
  }
  if (abweichend) { logFehler(`${abweichend} Sammlung(en) weichen vom erwarteten Stand ab: nichts geschrieben`); return { code: 3 }; }
  if (!LIVE) { log(`Trockenlauf: ${zuSchreiben.length} Sammlung(en) würden geschrieben, nichts geschrieben.`); return { code: 0, geschrieben: 0 }; }
  if (!ZURUECK) {
    // Sicherung: der erste Ist-Stand je Sammlung bleibt; neue Sammlungen späterer Läufe werden ergänzt, vorhandene nie überschrieben
    const vorhanden = existsSync(sichern) ? JSON.parse(readFileSync(sichern, 'utf8')) : [];
    const kennt = new Set(vorhanden.map((x) => x.handle));
    const neu = jetzt.filter(({ g }) => !kennt.has(g.handle)).map(({ g, ist }) => ({ handle: g.handle, ...ist }));
    if (neu.length) {
      mkdirSync(dirname(sichern), { recursive: true });
      writeFileSync(sichern, JSON.stringify([...vorhanden, ...neu], null, 1));
      log(`Sicherung ${vorhanden.length ? 'ergänzt' : 'geschrieben'} (${neu.length} Sammlungen): ${sichern}`);
    }
  }
  for (const { g, ist } of zuSchreiben) {
    const res = (await q(MUT, { i: baueInput(ist.id, g, wunschwerte(g, ist, richtung)) })).r;
    if (res.userErrors?.length) { logFehler('userErrors ' + g.handle + ' ' + JSON.stringify(res.userErrors)); return { code: 5 }; }
    log('geschrieben ' + g.handle);
  }
  await new Promise((s) => setTimeout(s, warteMs));
  let abw = 0;
  for (const { g, ist: vorher } of zuSchreiben) {
    const nach = await lesen(g); const w = wunschwerte(g, vorher, richtung);
    const gleich = !!nach && FELDER.every((f) => !g.felder[f] || nach[f] === w[f]);
    log('Rücklesen ' + (gleich ? 'GLEICH' : 'ABWEICHUNG') + ' ' + g.handle); if (!gleich) abw++;
  }
  log(abw ? `${abw} Abweichung(en) beim Rücklesen` : `Rückgelesen: alle ${zuSchreiben.length} Sammlungen GLEICH Soll.`);
  return { code: abw ? 6 : 0, geschrieben: zuSchreiben.length };
}

// Attrappe des Shops: Sammlungen mit Ist-Werten; Schreibzugriffe werden gezählt. Optionen: ignoriere (Handles, deren Schreiben still verpufft), fehlerBei (Handle mit userErrors)
export function attrappe(aenderungen, { ignoriere = [], fehlerBei = null, fremde = [], verpuffe = null } = {}) {
  const st = new Map();
  for (const a of aenderungen) {
    if (!st.has(a.handle)) st.set(a.handle, { handle: a.handle, id: 'gid://' + a.handle, h1: 'H ' + a.handle, html: '<p>x ' + a.handle + '</p>', title: 'T ' + a.handle, description: 'D ' + a.handle });
    st.get(a.handle)[a.feld === 'h1' ? 'h1' : a.feld === 'html' ? 'html' : a.feld] = a.alt;
  }
  const zaehler = { schreiben: 0, eingaben: [] };
  const q = async (query, v) => {
    if (query.includes('collectionByHandle')) { const c = st.get(v.h); return { n: c ? { id: c.id, title: c.h1, descriptionHtml: c.html, seo: { title: c.title, description: c.description } } : null }; }
    if (query.includes('collections(first:250')) return { collections: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [...st.values(), ...fremde].map((c) => ({ handle: c.handle, seo: { title: c.title ?? c.seo?.title, description: c.description ?? c.seo?.description } })) } };
    if (query.includes('collectionUpdate')) {
      const i = v.i; const c = [...st.values()].find((x) => x.id === i.id); zaehler.schreiben++; zaehler.eingaben.push(i);
      if (fehlerBei === c.handle) return { r: { userErrors: [{ field: ['seo'], message: 'kaputt' }] } };
      if (!ignoriere.includes(c.handle)) {
        const stumm = (f) => !!verpuffe && verpuffe.handle === c.handle && verpuffe.feld === f; // dieses eine Feld wird still nicht übernommen
        if ('title' in i && !stumm('h1')) c.h1 = i.title;
        if ('descriptionHtml' in i && !stumm('html')) c.html = i.descriptionHtml;
        if (i.seo) { if (!stumm('title')) c.title = i.seo.title; if (!stumm('description')) c.description = i.seo.description; }
      }
      return { r: { userErrors: [] } };
    }
    throw new Error('unbekannte Abfrage');
  };
  return { q, st, zaehler };
}

async function selbsttest() {
  let n = 0; const ok = (b, t) => { n++; if (!b) { console.error('FEHLER:', t); process.exitCode = 1; } };
  const c = (feld, alt, neu, handle = 'a') => ({ handle, art: 'collection', feld, alt, neu });
  const t1 = c('title', 'Alt | X', 'Neuer Titel | LuxeStyle CH'), d1 = c('description', 'Alt D', 'Neue Beschreibung online kaufen. Lieferung in die Schweiz.');
  ok(pruefe([t1, d1]).length === 0, 'gültige Änderung');
  ok(pruefe([{ ...t1, neu: 'x'.repeat(60) }]).length === 0, 'Titel genau 60 ok');
  ok(pruefe([{ ...t1, neu: 'x'.repeat(61) }]).length === 1, 'Titel 61 zu lang');
  ok(pruefe([{ ...d1, neu: 'x'.repeat(160) }]).length === 0, 'Beschreibung genau 160 ok');
  ok(pruefe([{ ...d1, neu: 'x'.repeat(161) }]).length === 1, 'Beschreibung 161 zu lang');
  ok(pruefe([c('h1', 'Alt', 'x'.repeat(61))]).length === 1, 'H1 zu lang');
  ok(pruefe([{ ...t1, neu: 'Strasse ist Straße' }]).length === 1, 'ß');
  ok(pruefe([{ ...t1, neu: 'Titel – mit Strich' }]).length === 1, 'Gedankenstrich');
  ok(pruefe([{ ...d1, neu: 'Mit 30 Tage Rückgabe' }]).length >= 1, '30 Tage Rückgabe');
  ok(pruefe([{ ...t1, neu: 'Magnetisch & MagSafe' }]).length === 1, 'MagSafe');
  ok(pruefe([{ ...d1, neu: 'Mit D-VVS1 Steinen' }]).length === 1, 'D-VVS1');
  ok(pruefe([{ ...t1, neu: 'Tom &amp; Jerry' }]).length === 1, 'Entität im Titel');
  ok(pruefe([{ ...t1, neu: t1.alt }]).length === 1, 'neu gleich alt');
  ok(pruefe([t1, { ...t1, handle: 'b' }]).length === 1, 'doppelter neuer Titel');
  ok(pruefe([d1, { ...d1, handle: 'b' }]).length === 1, 'doppelte neue Beschreibung');
  ok(pruefe([{ ...t1, feld: 'bild' }]).length >= 1, 'unbekanntes Feld');
  ok(pruefe([{ ...t1, art: 'product' }]).length === 1, 'nur Sammlungen');
  ok(pruefe([{ ...t1, alt: undefined }]).length === 1, 'Altwert fehlt');
  ok(pruefe([c('html', '<p>a</p>', '<p>Neuer Text &amp; mehr</p>')]).length === 0, 'html mit Entität erlaubt');
  ok(pruefe([c('html', '<p>a</p>', '<p>Eins</p><p>Zwei</p>')]).length === 1, 'html nur ein Absatz');
  ok(pruefe([c('html', '<p>a</p>', '<script>x</script>')]).length === 1, 'html ohne Skript');
  // Kollision
  const bestand = [{ handle: 'x', seo: { title: 'Fremder Titel', description: 'Fremde Beschreibung' } }, { handle: 'a', seo: { title: 'Alt | X', description: 'Alt D' } }];
  ok(kollisionen([t1, d1], bestand).length === 0, 'keine Kollision');
  ok(kollisionen([{ ...t1, neu: 'FREMDER  titel' }], bestand).length === 1, 'Kollision Titel (Gross-/Kleinschreibung, Leerraum)');
  ok(kollisionen([{ ...d1, neu: 'Fremde Beschreibung' }], bestand).length === 1, 'Kollision Beschreibung');
  ok(kollisionen([{ ...t1, neu: 'Alt | X' }], bestand).length === 0, 'eigener alter Wert zählt nicht als Kollision');
  ok(kollisionen([{ ...t1, handle: 'x', neu: 'Fremder Titel' }], bestand).length === 0, 'geänderte Sammlung wird nicht gegen sich selbst geprüft');
  // Gruppieren, Urteil, Wunschwerte
  const g = gruppiere([t1, d1])[0];
  ok(Object.keys(g.felder).length === 2, 'gruppiert');
  ok(urteil(g, { title: 'Alt | X', description: 'Alt D' }).art === 'schreiben', 'schreiben');
  ok(urteil(g, { title: t1.neu, description: d1.neu }).art === 'schon-neu', 'schon neu');
  ok(urteil(g, { title: t1.neu, description: 'Alt D' }).art === 'schreiben', 'halb neu: schreiben');
  ok(urteil(g, { title: 'Fremd', description: 'Alt D' }).art === 'abweichend', 'abweichend');
  ok(urteil(g, { title: t1.neu, description: d1.neu }, 'zurueck').art === 'schreiben', 'Rücknahme schreibt');
  ok(urteil(g, { title: 'Alt | X', description: 'Alt D' }, 'zurueck').art === 'schon-neu', 'Rücknahme: schon alt');
  ok(urteil(g, { title: 'Fremd', description: d1.neu }, 'zurueck').art === 'abweichend', 'Rücknahme abweichend');
  const gh = gruppiere([c('h1', 'Alt H', 'Neu H'), c('html', '<p>a</p>', '<p>b</p>')])[0];
  ok(urteil(gh, { h1: 'Alt H', html: '<p>a</p>' }).art === 'schreiben', 'h1 und html: schreiben');
  ok(urteil(gh, { h1: 'Neu H', html: '<p>b</p>' }).art === 'schon-neu', 'h1 und html: schon neu');
  ok(urteil(gh, { h1: 'Fremd', html: '<p>a</p>' }).art === 'abweichend', 'h1 abweichend');
  const w = wunschwerte(gruppiere([t1])[0], { title: 'x', description: 'Bleibt', h1: 'H', html: '<p>h</p>' });
  ok(w.title === t1.neu && w.description === 'Bleibt' && w.h1 === 'H' && w.html === '<p>h</p>', 'unveränderte Felder bleiben');
  const wz = wunschwerte(gruppiere([t1])[0], { title: t1.neu, description: 'Bleibt' }, 'zurueck');
  ok(wz.title === 'Alt | X' && wz.description === 'Bleibt', 'Rücknahme setzt nur geänderte Felder zurück');
  // Eingabe der Mutation
  const i1 = baueInput('gid://1', gruppiere([t1])[0], w);
  ok(i1.id === 'gid://1' && i1.seo.title === t1.neu && i1.seo.description === 'Bleibt' && !('title' in i1) && !('descriptionHtml' in i1), 'nur SEO: Titel und Beschreibung gehen zusammen mit');
  const i2 = baueInput('gid://2', gh, { title: 't', description: 'd', h1: 'Neu H', html: '<p>b</p>' });
  ok(i2.title === 'Neu H' && i2.descriptionHtml === '<p>b</p>' && !('seo' in i2), 'nur Sammlungstitel und -text: kein seo');
  const i3 = baueInput('gid://3', gruppiere([c('h1', 'a', 'b'), d1])[0], { title: 'T', description: d1.neu, h1: 'b', html: '' });
  ok(i3.title === 'b' && i3.seo.title === 'T' && i3.seo.description === d1.neu && !('descriptionHtml' in i3), 'gemischt');

  // Ablauf gegen die Attrappe des Shops (Schreibweg)
  const daten = JSON.parse(readFileSync(HIER + 'aenderungen.json', 'utf8'));
  const N = new Set(daten.map((a) => a.handle)).size;
  ok(pruefe(daten).length === 0, 'aenderungen.json besteht die Prüfung: ' + pruefe(daten).join('; '));
  ok(new Set(daten.map((a) => a.handle)).size === 23, 'genau 23 Sammlungen');
  // leere, nicht zu ändernde SEO-Felder werden nicht mitgeschickt; beim Zurücksetzen auf «leer» geht das Feld leer mit
  const ge = gruppiere([c('description', '', 'Neu D')])[0];
  const j1 = baueInput('gid://4', ge, wunschwerte(ge, { title: '', description: '' }));
  ok(j1.seo.description === 'Neu D' && !('title' in j1.seo), 'leerer SEO-Titel wird nicht mitgeschickt');
  const j2 = baueInput('gid://5', ge, wunschwerte(ge, { title: '', description: 'Neu D' }, 'zurueck'));
  ok(j2.seo.description === '' && !('title' in j2.seo), 'Rücknahme auf leer schickt die leere Beschreibung mit');
  ok(urteil(ge, { title: null, description: null }).art === 'schreiben', 'null im Shop zählt als leer');
  const gt2 = gruppiere([c('title', 'Alt T', 'Neu T | X')])[0];
  const j3 = baueInput('gid://6', gt2, wunschwerte(gt2, { title: 'Alt T', description: '' }));
  ok(j3.seo.title === 'Neu T | X' && !('description' in j3.seo), 'leere SEO-Beschreibung wird nicht mitgeschickt');
  const stumm = { log: () => {}, fehler: () => {} };
  const tmp = mkdtempSync(join(tmpdir(), 'seo-doppelt-'));
  const opt = (extra = {}) => ({ aenderungen: daten, warteMs: 0, ...stumm, ...extra });
  {
    const A = attrappe(daten); const r0 = await lauf(A.q, opt({ sichern: join(tmp, 'a/vor.json') }));
    ok(r0.code === 0 && A.zaehler.schreiben === 0 && !existsSync(join(tmp, 'a/vor.json')), 'Trockenlauf schreibt nichts und legt keine Sicherung an');
  }
  {
    const A = attrappe(daten); const p = join(tmp, 'b/vor.json'); const r = await lauf(A.q, opt({ LIVE: true, sichern: p }));
    ok(r.code === 0 && r.geschrieben === N && A.zaehler.schreiben === N, 'LIVE schreibt alle Sammlungen');
    ok(existsSync(p) && JSON.parse(readFileSync(p, 'utf8')).length === N, 'Sicherung mit allen Sammlungen');
    ok(JSON.parse(readFileSync(p, 'utf8')).find((x) => x.handle === 'armbaender-leder').h1 === 'Lederarmbänder', 'Sicherung trägt den alten Wert');
    ok(daten.filter((a) => a.feld !== 'html' || true).every((a) => A.st.get(a.handle)[a.feld] === a.neu), 'alle neuen Werte stehen in der Attrappe');
    const e = A.zaehler.eingaben.find((x) => x.id === 'gid://armbaender-leder');
    ok(e.title === 'Uhrenarmbänder aus Leder' && e.descriptionHtml.startsWith('<p>Uhrenarmbänder') && e.seo.title.startsWith('Uhrenarmbänder') && e.seo.description.startsWith('Uhrenarmbänder'), 'Eingabe mit allen vier Feldern');
    const e2 = A.zaehler.eingaben.find((x) => x.id === 'gid://bestseller-shop');
    ok(!('title' in e2) && !('descriptionHtml' in e2) && e2.seo.title === 'T bestseller-shop' && e2.seo.description.startsWith('Bestseller bei LuxeStyle'), 'nur Beschreibung geändert: der SEO-Titel geht unverändert mit');
    const r2 = await lauf(A.q, opt({ LIVE: true, sichern: p }));
    ok(r2.code === 0 && r2.geschrieben === 0 && A.zaehler.schreiben === N, 'zweiter Lauf: alles schon neu, nichts geschrieben');
    ok(JSON.parse(readFileSync(p, 'utf8')).find((x) => x.handle === 'armbaender-leder').h1 === 'Lederarmbänder', 'Sicherung bleibt beim zweiten Lauf unverändert (der erste alte Wert zählt)');
    ok(JSON.parse(readFileSync(p, 'utf8')).length === N, 'Sicherung hat nach dem zweiten Lauf keine Doppelten');
    const rz = await lauf(A.q, opt({ LIVE: true, ZURUECK: true, sichern: p }));
    ok(rz.code === 0 && rz.geschrieben === N && daten.every((a) => A.st.get(a.handle)[a.feld] === a.alt), 'Rücknahme stellt alle alten Werte her');
    const rz2 = await lauf(A.q, opt({ LIVE: true, ZURUECK: true, sichern: p }));
    ok(rz2.code === 0 && rz2.geschrieben === 0, 'zweite Rücknahme: schon alt');
  }
  {
    const A = attrappe(daten); A.st.get('handyhalter-magnet').title = 'Jemand hat das geändert';
    const r = await lauf(A.q, opt({ LIVE: true, sichern: join(tmp, 'c/vor.json') }));
    ok(r.code === 3 && A.zaehler.schreiben === 0, 'abweichender Ist-Wert: Abbruch, nichts geschrieben');
  }
  {
    const A = attrappe(daten, { fehlerBei: 'laufschuhe-mesh' }); const r = await lauf(A.q, opt({ LIVE: true, sichern: join(tmp, 'd/vor.json') }));
    ok(r.code === 5, 'userErrors: Exit 5');
  }
  {
    const A = attrappe(daten, { ignoriere: ['regale-holz-bambus'] }); const r = await lauf(A.q, opt({ LIVE: true, sichern: join(tmp, 'e/vor.json') }));
    ok(r.code === 6, 'Rücklesen weicht ab (Schreiben verpufft): Exit 6');
  }
  for (const [handle, feld] of [['bestseller-shop', 'description'], ['armbaender-leder', 'h1'], ['armbaender-leder', 'html'], ['handyhalter-magnet', 'title']]) {
    const A = attrappe(daten, { verpuffe: { handle, feld } }); const r = await lauf(A.q, opt({ LIVE: true, sichern: join(tmp, `v-${handle}-${feld}/vor.json`) }));
    ok(r.code === 6, `Rücklesen prüft jedes geänderte Feld: nur «${feld}» von ${handle} verpufft -> Exit 6`);
  }
  {
    // Rücknahme darf nicht an einer Kollision scheitern, die erst nach dem Einspielen entstand
    const fremd = [{ handle: 'fremd', title: daten.find((a) => a.handle === 'sportschuhe-mesh' && a.feld === 'title').neu, description: 'x' }];
    const A = attrappe(daten, { fremde: fremd }); for (const a of daten) A.st.get(a.handle)[a.feld] = a.neu;
    const rz = await lauf(A.q, opt({ LIVE: true, ZURUECK: true, sichern: join(tmp, 'k/vor.json') }));
    ok(rz.code === 0 && rz.geschrieben === N && daten.every((a) => A.st.get(a.handle)[a.feld] === a.alt), 'Rücknahme läuft auch bei später entstandener Kollision (keine Kollisionsprüfung beim Zurücksetzen)');
  }
  {
    const fremd = [{ handle: 'fremd', title: daten.find((a) => a.handle === 'sportschuhe-mesh' && a.feld === 'title').neu, description: 'x' }];
    const A = attrappe(daten, { fremde: fremd }); const r = await lauf(A.q, opt({ LIVE: true, sichern: join(tmp, 'f/vor.json') }));
    ok(r.code === 4 && A.zaehler.schreiben === 0, 'Kollision mit einer fremden Sammlung: Abbruch, nichts geschrieben');
  }
  {
    // spätere Charge: die Sicherung wird um neue Sammlungen ergänzt, vorhandene Einträge bleiben, nichts wird doppelt
    const erste = daten.filter((a) => !/^mengenrabatt/.test(a.handle));
    const A = attrappe(daten); const p = join(tmp, 'm/vor.json');
    await lauf(A.q, opt({ aenderungen: erste, LIVE: true, sichern: p }));
    const s1 = JSON.parse(readFileSync(p, 'utf8'));
    await lauf(A.q, opt({ LIVE: true, sichern: p }));
    const s2 = JSON.parse(readFileSync(p, 'utf8'));
    ok(s1.length === N - 2 && s2.length === N && s2.some((x) => x.handle === 'mengenrabatt-ab-2-stueck' && x.description === ''), 'Sicherung wird um neue Sammlungen ergänzt');
    ok(JSON.stringify(s2.slice(0, N - 2)) === JSON.stringify(s1), 'vorhandene Sicherungseinträge bleiben unverändert');
  }
  {
    const A = attrappe(daten); const p = join(tmp, 'g/vor.json'); await lauf(A.q, opt({ LIVE: true, sichern: p }));
    A.st.get('kochutensilien-holz').description = 'Jemand anders hat die Beschreibung geändert';
    const rz = await lauf(A.q, opt({ LIVE: true, ZURUECK: true, sichern: p }));
    ok(rz.code === 3, 'Rücknahme: fremd geänderte Sammlung bleibt unberührt, Exit 3');
  }
  {
    const A = attrappe(daten); const kaputt = daten.map((a) => (a.handle === 'regale-holz-bambus' && a.feld === 'title' ? { ...a, neu: 'x'.repeat(70) } : a));
    const r = await lauf(A.q, { aenderungen: kaputt, LIVE: true, warteMs: 0, sichern: join(tmp, 'h/vor.json'), ...stumm });
    ok(r.code === 4 && A.zaehler.schreiben === 0, 'zu langer Titel: Prüfung bricht vor jedem Lesen und Schreiben ab');
  }
  console.log(n + ' Prüfungen' + (process.exitCode ? ' MIT FEHLERN' : ' ok'));
}

if (process.argv.includes('--selbsttest')) { await selbsttest(); }
else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { shopifyGql } = await import('../../automation/lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('../../automation/lib/shopify_secret.mjs');
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await lauf(q, { aenderungen: JSON.parse(readFileSync(HIER + 'aenderungen.json', 'utf8')), LIVE: process.env.LIVE === '1', ZURUECK: process.env.ZURUECK === '1' });
  process.exit(res.code);
}
