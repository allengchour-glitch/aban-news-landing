// Test für nacharbeit.mjs mit Attrappe des Shops (kein Netz, keine Zugangsdaten).
// Aufruf: node dropship/futterautomat-1011/nacharbeit_test.mjs
// Für die Mutationsprobe: ZIEL=<Pfad zur Kopie von nacharbeit.mjs>
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = process.env.ZIEL ? pathToFileURL(path.resolve(process.env.ZIEL)).href : new URL('./nacharbeit.mjs', import.meta.url).href;
const M = await import(ziel);

let ok = 0, schlecht = 0;
const pruefe = (name, bedingung, detail = '') => {
  if (bedingung) { ok++; } else { schlecht++; console.log('FEHLER:', name, detail); }
};
const still = () => {};
const kopie = (x) => JSON.parse(JSON.stringify(x));

// --- Festwerte, nicht aus dem geprüften Modul abgeleitet
pruefe('Festwerte Produkt, Handle, Bild, Sammlung', M.PRODUKT_ID === 'gid://shopify/Product/15523986473345' && M.HANDLE === 'futterautomat-fur-katze-527488'
  && M.BILD_ID === 'gid://shopify/MediaImage/70772684030337' && M.SAMMLUNG_ID === 'gid://shopify/Collection/756160627079' && M.SAMMLUNG_HANDLE === 'tier-futterautomaten' && M.BILDER_ERWARTET === 5);
pruefe('Festwert SHA-256 des gesichteten Bildes', M.BILD_SHA256 === 'd42a504faade2a7ac6c88302716733f6bb1ac906715db64db33c1a846893d1f2');
pruefe('Festwert alt-Text des Bildes', M.BILD_ALT === 'Futterautomat für Katze – Bild 4 | LuxeStyle');
const gesichert = path.join(hier, 'sicherung-bild5.jpg');
if (fs.existsSync(gesichert)) {
  pruefe('Gesicherte Bild-Bytes haben den erwarteten SHA-256', crypto.createHash('sha256').update(fs.readFileSync(gesichert)).digest('hex') === M.BILD_SHA256);
}

// --- Inhalt der Sammlungsbeschreibung
pruefe('Sammlung: Soll = alter Text + ein Absatz (nichts entfernt)', M.SAMMLUNG_SOLL.startsWith(M.SAMMLUNG_ALT) && M.SAMMLUNG_SOLL.length > M.SAMMLUNG_ALT.length);
pruefe('Sammlung: Link ist relativ und zeigt auf das Produkt', M.LINK_ABSATZ.includes('href="/products/futterautomat-fur-katze-527488"') && !/https?:|utm_/.test(M.LINK_ABSATZ));
pruefe('Sammlung: Ankertext ist der Produkttitel', M.LINK_ABSATZ.includes('>Automatischer Futterspender für Katzen</a>'));
pruefe('Sammlung: genau ein Link im neuen Absatz, sonst kein Markup ausser <p>', (M.LINK_ABSATZ.match(/<a /g) || []).length === 1 && M.LINK_ABSATZ.startsWith('<p>') && M.LINK_ABSATZ.endsWith('</p>'));

// --- Attrappe
const galerie = () => [
  { id: 'gid://shopify/MediaImage/70772684063105', alt: 'Futterautomat für Katze – Bild 5 | LuxeStyle', image: { url: 'https://cdn.test/1.jpg', width: 800, height: 800 } },
  { id: 'gid://shopify/MediaImage/70772683899265', alt: 'Futterautomat für Katze | LuxeStyle', image: { url: 'https://cdn.test/2.jpg', width: 800, height: 800 } },
  { id: 'gid://shopify/MediaImage/70772683964801', alt: 'Futterautomat für Katze – Bild 2 | LuxeStyle', image: { url: 'https://cdn.test/3.jpg', width: 799, height: 800 } },
  { id: 'gid://shopify/MediaImage/70772683997569', alt: 'Futterautomat für Katze – Bild 3 | LuxeStyle', image: { url: 'https://cdn.test/4.jpg', width: 800, height: 800 } },
  { id: M.BILD_ID, alt: M.BILD_ALT, image: { url: 'https://cdn.test/5.jpg', width: 799, height: 800 } },
];
const start = () => ({
  produkt: { handle: M.HANDLE, status: 'ACTIVE', onlineStoreUrl: 'https://luxestyle.ch/products/' + M.HANDLE, media: galerie() },
  sammlung: { id: M.SAMMLUNG_ID, handle: M.SAMMLUNG_HANDLE, descriptionHtml: M.SAMMLUNG_ALT },
});

function attrappe(zustand, opts = {}) {
  const st = kopie(zustand);
  const log = { schreib: [] };
  const gql = async (q, v) => {
    if (q.includes('productDeleteMedia')) {
      log.schreib.push({ art: 'loeschen', v: kopie(v) });
      if (opts.loeschFehler) return { productDeleteMedia: { deletedMediaIds: v.m, mediaUserErrors: [{ field: ['mediaIds'], message: 'kaputt', code: 'X' }] } };
      if (opts.falscheIds) return { productDeleteMedia: { deletedMediaIds: ['gid://shopify/MediaImage/1'], mediaUserErrors: [] } };
      if (opts.andereLoeschen) { st.produkt.media = st.produkt.media.filter((m, i) => i !== 0); return { productDeleteMedia: { deletedMediaIds: v.m, mediaUserErrors: [] } }; }
      if (!opts.nichtLoeschen) st.produkt.media = st.produkt.media.filter((m) => !v.m.includes(m.id));
      return { productDeleteMedia: { deletedMediaIds: v.m, mediaUserErrors: [] } };
    }
    if (q.includes('productUpdate')) {
      log.schreib.push({ art: 'anlegen', v: kopie(v) });
      if (opts.anlegenFehler) return { productUpdate: { product: null, userErrors: [{ field: ['media'], message: 'kaputt' }] } };
      for (const m of v.i.media) st.produkt.media.push({ id: 'gid://shopify/MediaImage/NEU', alt: m.alt, image: { url: m.originalSource, width: 799, height: 800 } });
      return { productUpdate: { product: { id: v.i.id }, userErrors: [] } };
    }
    if (q.includes('collectionUpdate')) {
      log.schreib.push({ art: 'sammlung', v: kopie(v) });
      if (opts.sammlungFehler) return { collectionUpdate: { userErrors: [{ field: ['x'], message: 'kaputt' }] } };
      st.sammlung.descriptionHtml = v.i.descriptionHtml + (opts.rueckleseAbweichung ? ' (anders)' : '');
      return { collectionUpdate: { userErrors: [] } };
    }
    if (q.includes('media(first:30)')) return { product: { handle: st.produkt.handle, status: st.produkt.status, media: { nodes: kopie(st.produkt.media) } } };
    if (q.includes('onlineStoreUrl')) return { product: { handle: st.produkt.handle, status: st.produkt.status, onlineStoreUrl: st.produkt.onlineStoreUrl } };
    if (q.includes('collection(id')) return { collection: kopie(st.sammlung) };
    throw new Error('unerwartete Abfrage: ' + q.slice(0, 60));
  };
  return { st, log, gql };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nacharbeit-test-'));
const dateien = () => {
  const dir = fs.mkdtempSync(path.join(tmp, 'l-'));
  return { bildJson: path.join(dir, 'bild.json'), bildBytes: path.join(dir, 'bild.jpg'), sammlungJson: path.join(dir, 'sammlung.json') };
};
const BYTES = Buffer.from('das-gesichtete-bild');
const HASH = crypto.createHash('sha256').update(BYTES).digest('hex');
const holeBild = async () => BYTES;
const bild = (a, extra = {}) => { const d = dateien(); return M.bildLauf({ gql: a.gql, holeBild, erwarteterHash: HASH, dateien: d, log: still, warte: async () => {}, ...extra }).then((code) => ({ code, d })); };
const sammlung = (a, extra = {}) => { const d = dateien(); return M.sammlungLauf({ gql: a.gql, dateien: d, log: still, warte: async () => {}, ...extra }).then((code) => ({ code, d })); };

// ================================================================================================ Bild
{
  const a = attrappe(start());
  const { code, d } = await bild(a);
  pruefe('Bild Trockenlauf: Exit 0, nichts geschrieben, keine Sicherung', code === 0 && a.log.schreib.length === 0 && !fs.existsSync(d.bildJson) && !fs.existsSync(d.bildBytes), String(code));
}
{
  const a = attrappe(start());
  const { code, d } = await bild(a, { live: true });
  pruefe('Bild LIVE: Exit 0, genau ein Löschaufruf', code === 0 && a.log.schreib.length === 1 && a.log.schreib[0].art === 'loeschen', String(code));
  const v = (a.log.schreib[0] || {}).v || {};
  pruefe('Bild LIVE: Produkt-ID und nur dieses eine Bild im Aufruf', v.p === M.PRODUKT_ID && Array.isArray(v.m) && v.m.length === 1 && v.m[0] === M.BILD_ID);
  pruefe('Bild LIVE: Galerie danach vier Bilder, Reihenfolge und Hauptbild unverändert', a.st.produkt.media.length === 4 && a.st.produkt.media[0].id === galerie()[0].id && a.st.produkt.media.map((m) => m.id).join() === galerie().slice(0, 4).map((m) => m.id).join());
  const s = fs.existsSync(d.bildJson) ? JSON.parse(fs.readFileSync(d.bildJson, 'utf8')) : null;
  pruefe('Bild LIVE: Sicherung mit Id, alt-Text, Adresse, Position, SHA-256 und Galerie vorher', !!s && s.entfernt.id === M.BILD_ID && s.entfernt.alt === M.BILD_ALT && s.entfernt.url === 'https://cdn.test/5.jpg' && s.entfernt.position === 5 && s.entfernt.sha256 === HASH && s.galerieVorher.length === 5);
  pruefe('Bild LIVE: Bild-Bytes gesichert', fs.existsSync(d.bildBytes) && fs.readFileSync(d.bildBytes).equals(BYTES));
}
{
  const a = attrappe(start());
  const r = await bild(a, { live: true });
  const b = await M.bildLauf({ gql: a.gql, holeBild, erwarteterHash: HASH, dateien: r.d, log: still, warte: async () => {}, live: true });
  pruefe('Bild: zweiter Lauf ist «schon entfernt», Exit 0, kein zweiter Aufruf', b === 0 && a.log.schreib.length === 1, String(b));
}
{
  const z = start(); z.produkt.media.push({ id: 'gid://shopify/MediaImage/9', alt: 'Neu', image: { url: 'https://cdn.test/6.jpg', width: 800, height: 800 } });
  const a = attrappe(z);
  const { code } = await bild(a, { live: true });
  pruefe('Bild: sechs statt fünf Bilder -> Exit 4, nichts geschrieben', code === 4 && a.log.schreib.length === 0, String(code));
}
{
  const z = start(); z.produkt.media.unshift({ id: 'gid://shopify/MediaImage/8', alt: 'Neu vorn', image: { url: 'https://cdn.test/0.jpg', width: 800, height: 800 } });
  const a = attrappe(z);
  const { code } = await bild(a, { live: true });
  pruefe('Bild: sechs Bilder, Ziel noch das letzte -> Exit 4, nichts geschrieben', code === 4 && a.log.schreib.length === 0, String(code));
}
{
  const a = attrappe(start(), { andereLoeschen: true });
  const { code } = await bild(a, { live: true });
  pruefe('Bild: Rücklesen zeigt vier Bilder, aber ein anderes fehlt (Hauptbild weg) -> Exit 6', code === 6, String(code));
}
{
  const z = start(); const m = z.produkt.media; [m[2], m[4]] = [m[4], m[2]];
  const a = attrappe(z);
  const { code } = await bild(a, { live: true });
  pruefe('Bild: Ziel nicht mehr das letzte -> Exit 4, nichts geschrieben', code === 4 && a.log.schreib.length === 0, String(code));
}
{
  const z = start(); z.produkt.media[4].alt = 'Futterautomat für Katze – Bild 4 | geändert';
  const a = attrappe(z);
  const { code } = await bild(a, { live: true });
  pruefe('Bild: alt-Text weicht ab -> Exit 4, nichts geschrieben', code === 4 && a.log.schreib.length === 0, String(code));
}
{
  const a = attrappe(start());
  const { code, d } = await bild(a, { live: true, holeBild: async () => Buffer.from('ein-anderes-bild') });
  pruefe('Bild: andere Bytes (SHA-256) -> Exit 4, nichts geschrieben, keine Sicherung', code === 4 && a.log.schreib.length === 0 && !fs.existsSync(d.bildJson), String(code));
}
{
  const z = start(); z.produkt.media = z.produkt.media.slice(0, 4); z.produkt.media[3].alt = 'Etwas ganz anderes';
  const a = attrappe(z);
  const { code } = await bild(a, { live: true });
  pruefe('Bild: Ziel fehlt, vier Bilder, aber alt-Text von vorher kommt nicht vor -> «schon entfernt» Exit 0', code === 0 && a.log.schreib.length === 0, String(code));
  const z2 = start(); z2.produkt.media = z2.produkt.media.slice(0, 3);
  const a2 = attrappe(z2);
  const r2 = await bild(a2, { live: true });
  pruefe('Bild: Ziel fehlt und nur drei Bilder -> Exit 4 (jemand hat mehr geändert)', r2.code === 4 && a2.log.schreib.length === 0, String(r2.code));
  const z3 = start(); z3.produkt.media = z3.produkt.media.slice(0, 4); z3.produkt.media[3] = { ...galerie()[4], id: 'gid://shopify/MediaImage/NEUE-ID' };
  const a3 = attrappe(z3);
  const r3 = await bild(a3, { live: true });
  pruefe('Bild: Ziel-Id fehlt, aber ein Bild mit dem alt-Text ist da -> Exit 4', r3.code === 4 && a3.log.schreib.length === 0, String(r3.code));
}
{
  const z = start(); z.produkt.handle = 'ein-anderes-produkt';
  const a = attrappe(z);
  const { code } = await bild(a, { live: true });
  pruefe('Bild: falscher Handle -> Exit 3, nichts geschrieben', code === 3 && a.log.schreib.length === 0, String(code));
}
{
  const a = attrappe(start(), { loeschFehler: true });
  const { code } = await bild(a, { live: true });
  pruefe('Bild: Fehler von Shopify -> Exit 5', code === 5, String(code));
  const b = attrappe(start(), { falscheIds: true });
  const r = await bild(b, { live: true });
  pruefe('Bild: gelöscht wurde eine andere Id -> Exit 5', r.code === 5, String(r.code));
}
{
  const a = attrappe(start(), { nichtLoeschen: true });
  const { code } = await bild(a, { live: true });
  pruefe('Bild: Rücklesen zeigt noch fünf Bilder -> Exit 6', code === 6, String(code));
}
{
  const a = attrappe(start());
  const r1 = await bild(a, { live: true });
  const probe = await M.bildLauf({ gql: a.gql, holeBild, dateien: r1.d, log: still, zurueck: true, live: false, warte: async () => {} });
  pruefe('Bild Rücknahme Trockenlauf: Exit 0, nichts geschrieben', probe === 0 && a.log.schreib.length === 1);
  const code = await M.bildLauf({ gql: a.gql, holeBild, dateien: r1.d, log: still, zurueck: true, live: true, warte: async () => {} });
  const w = a.log.schreib[1];
  pruefe('Bild Rücknahme LIVE: Exit 0, Bild mit Quelladresse und alt-Text wieder angelegt', code === 0 && a.log.schreib.length === 2 && w.art === 'anlegen' && w.v.i.id === M.PRODUKT_ID
    && w.v.i.media.length === 1 && w.v.i.media[0].originalSource === 'https://cdn.test/5.jpg' && w.v.i.media[0].alt === M.BILD_ALT && w.v.i.media[0].mediaContentType === 'IMAGE', String(code));
  pruefe('Bild Rücknahme: Galerie wieder fünf Bilder, das wiederhergestellte als letztes', a.st.produkt.media.length === 5 && a.st.produkt.media[4].alt === M.BILD_ALT);
  const nochmal = await M.bildLauf({ gql: a.gql, holeBild, dateien: r1.d, log: still, zurueck: true, live: true, warte: async () => {} });
  pruefe('Bild Rücknahme: zweiter Lauf ist «schon wieder da», kein dritter Aufruf', nochmal === 0 && a.log.schreib.length === 2);
  const b = attrappe(start(), { anlegenFehler: true });
  const r = await bild(b, { live: true });
  const f = await M.bildLauf({ gql: b.gql, holeBild, dateien: r.d, log: still, zurueck: true, live: true, warte: async () => {} });
  pruefe('Bild Rücknahme: Fehler von Shopify -> Exit 5', f === 5, String(f));
}

// ================================================================================================ Sammlung
{
  const a = attrappe(start());
  const { code, d } = await sammlung(a);
  pruefe('Sammlung Trockenlauf: Exit 0, nichts geschrieben, keine Sicherung', code === 0 && a.log.schreib.length === 0 && !fs.existsSync(d.sammlungJson), String(code));
}
{
  const a = attrappe(start());
  const { code, d } = await sammlung(a, { live: true });
  const v = (a.log.schreib[0] || {}).v || {};
  pruefe('Sammlung LIVE: Exit 0, genau ein Schreibaufruf mit Sammlungs-Id und Soll-Text', code === 0 && a.log.schreib.length === 1 && v.i && v.i.id === M.SAMMLUNG_ID && v.i.descriptionHtml === M.SAMMLUNG_SOLL, String(code));
  pruefe('Sammlung LIVE: nur Beschreibung im Aufruf (kein Titel, kein Handle, keine Sortierung)', v.i && Object.keys(v.i).sort().join() === 'descriptionHtml,id');
  pruefe('Sammlung LIVE: Zustand danach Soll', a.st.sammlung.descriptionHtml === M.SAMMLUNG_SOLL);
  const s = fs.existsSync(d.sammlungJson) ? JSON.parse(fs.readFileSync(d.sammlungJson, 'utf8')) : null;
  pruefe('Sammlung LIVE: alte Beschreibung gesichert', !!s && s.id === M.SAMMLUNG_ID && s.descriptionHtml === M.SAMMLUNG_ALT);
}
{
  const z = start(); z.sammlung.descriptionHtml = M.SAMMLUNG_SOLL;
  const a = attrappe(z);
  const { code, d } = await sammlung(a, { live: true });
  pruefe('Sammlung: schon im Soll -> Exit 0, nichts geschrieben, keine Sicherung', code === 0 && a.log.schreib.length === 0 && !fs.existsSync(d.sammlungJson), String(code));
}
{
  const z = start(); z.sammlung.descriptionHtml = '<p>Ein ganz anderer Text.</p>';
  const a = attrappe(z);
  const { code, d } = await sammlung(a, { live: true });
  pruefe('Sammlung: fremder Text -> Exit 4, nichts geschrieben, keine Sicherung', code === 4 && a.log.schreib.length === 0 && !fs.existsSync(d.sammlungJson), String(code));
  const b = attrappe(z);
  const r = await sammlung(b, { live: true, fremd: true });
  const s = fs.existsSync(r.d.sammlungJson) ? JSON.parse(fs.readFileSync(r.d.sammlungJson, 'utf8')) : null;
  pruefe('Sammlung: fremder Text mit FREMD -> schreibt und sichert den fremden Text', r.code === 0 && b.log.schreib.length === 1 && !!s && s.descriptionHtml === '<p>Ein ganz anderer Text.</p>');
}
{
  for (const [name, aendere] of [
    ['Produkt nicht ACTIVE', (z) => { z.produkt.status = 'DRAFT'; }],
    ['Produkt nicht im Online-Shop', (z) => { z.produkt.onlineStoreUrl = null; }],
    ['falscher Produkt-Handle', (z) => { z.produkt.handle = 'ein-anderes-produkt'; }],
  ]) {
    const z = start(); aendere(z);
    const a = attrappe(z);
    const { code } = await sammlung(a, { live: true });
    pruefe(`Sammlung: ${name} -> Exit 4, nichts geschrieben`, code === 4 && a.log.schreib.length === 0, String(code));
  }
}
{
  const z = start(); z.sammlung.handle = 'eine-andere-sammlung';
  const a = attrappe(z);
  const { code } = await sammlung(a, { live: true });
  pruefe('Sammlung: falscher Handle -> Exit 3, nichts geschrieben', code === 3 && a.log.schreib.length === 0, String(code));
}
{
  const a = attrappe(start(), { sammlungFehler: true });
  const { code } = await sammlung(a, { live: true });
  pruefe('Sammlung: userErrors -> Exit 5', code === 5, String(code));
  const b = attrappe(start(), { rueckleseAbweichung: true });
  const r = await sammlung(b, { live: true });
  pruefe('Sammlung: Rücklesen weicht ab -> Exit 6', r.code === 6, String(r.code));
}
{
  const a = attrappe(start());
  const r1 = await sammlung(a, { live: true });
  const probe = await M.sammlungLauf({ gql: a.gql, dateien: r1.d, log: still, zurueck: true, live: false, warte: async () => {} });
  pruefe('Sammlung Rücknahme Trockenlauf: Exit 0, nichts geschrieben', probe === 0 && a.log.schreib.length === 1);
  const code = await M.sammlungLauf({ gql: a.gql, dateien: r1.d, log: still, zurueck: true, live: true, warte: async () => {} });
  pruefe('Sammlung Rücknahme LIVE: Exit 0, alte Beschreibung steht wieder', code === 0 && a.st.sammlung.descriptionHtml === M.SAMMLUNG_ALT && a.log.schreib.length === 2, String(code));
  const nochmal = await M.sammlungLauf({ gql: a.gql, dateien: r1.d, log: still, zurueck: true, live: true, warte: async () => {} });
  pruefe('Sammlung Rücknahme: zweiter Lauf ist «schon die gesicherte», kein dritter Aufruf', nochmal === 0 && a.log.schreib.length === 2);
  const b = attrappe(start());
  const r2 = await sammlung(b, { live: true });
  const c2 = attrappe(start(), { sammlungFehler: true });
  c2.st.sammlung.descriptionHtml = M.SAMMLUNG_SOLL;
  const f = await M.sammlungLauf({ gql: c2.gql, dateien: r2.d, log: still, zurueck: true, live: true, warte: async () => {} });
  pruefe('Sammlung Rücknahme: Fehler von Shopify -> Exit 5', f === 5, String(f));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${ok} bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
