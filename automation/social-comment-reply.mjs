#!/usr/bin/env node
/**
 * LuxeStyle — social-comment-reply.mjs (v2, 18.10.2026)
 * -----------------------------------------------------
 * Räumt die Kommentare unter unseren Instagram- und Facebook-Posts auf und beantwortet die echten.
 *
 *   1. BOTS und SPAM werden ausgeblendet (hide, reversibel, nie gelöscht) — NICHT beantwortet.
 *      Vorher (v1) hielt der Schutz «love|😍 = echtes Lob» jeden Bot-Kommentar («Amazing post 🔥 please send this to us»)
 *      für Kundschaft; alle 12 Kommentare vom 10.–18.10. waren Bots, drei davon wurden von einem fremden Absender mit
 *      Mundart-Text und Rabattcode beantwortet. Ein Konto mit ≥ 3 Kommentaren im Fenster gilt als Engagement-Farm.
 *   2. FRAGEN (Versand, Grösse, Preis, Verfügbarkeit, Rückgabe, Zahlung, Echtheit, Material) bekommen eine kurze,
 *      belegte Antwort in Hochdeutsch (Du-Form) mit Direktlink des Produkts aus der Bildunterschrift.
 *      Der Rabattcode steht NUR bei Preis-/Rabattfragen und nur, wenn Shopify ihn jetzt als ACTIVE meldet.
 *   3. LOB bekommt ein Dankeschön ohne Verkaufsdruck. Eigene Kommentare, schon beantwortete, Kommentare älter als 5 Tage,
 *      sowie alles im State `social/replied-comments.json` werden übersprungen. NIE doppelt.
 *
 * Aufruf: node automation/social-comment-reply.mjs            (scharf)
 *         DRY_RUN=1 node automation/social-comment-reply.mjs  (zeigt nur, tut nichts)
 *         node automation/social-comment-reply.mjs --selbsttest
 * Tokens: Umgebung (IG_ACCESS_TOKEN / FB_PAGE_ACCESS_TOKEN / META_ACCESS_TOKEN) oder /tmp/meta_page_token + /tmp/meta_ig_id.
 * Ausgabe: letzte Zeile «KOMMENTARE: …»; Stand für die Ampel in /tmp/_kommentare_stand.json; Protokoll ohne Namen/Texte
 * in social/kommentar_log.tsv (Repo ist öffentlich).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { klasse, frageThema } from './lib/kommentar_klasse.mjs';

const rd = f => { try { return fs.readFileSync(f, 'utf8').trim(); } catch { return ''; } };
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const FB_ID = process.env.FB_PAGE_ID || '1049840534888592';
const META = process.env.META_ACCESS_TOKEN || rd('/tmp/meta_page_token');
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || META;
const IG_TOK = process.env.IG_ACCESS_TOKEN || META;
const IG_ID = process.env.IG_USER_ID || rd('/tmp/meta_ig_id');
const LOOKBACK = Math.max(1, parseInt(process.env.LOOKBACK_POSTS || '30', 10) || 30);
const MAXR = Math.max(0, parseInt(process.env.MAX_REPLIES || '6', 10) || 6);
const MAX_ALTER_TAGE = 5;
const FARM_AB = 3;                       // so viele Kommentare desselben Kontos im Fenster = Engagement-Farm
const EIGEN_IG = 'luxestyle.ch';
const DRY = process.env.DRY_RUN === '1';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const STATE = path.join(ROOT, 'social', 'replied-comments.json');
const LOG = path.join(ROOT, 'social', 'kommentar_log.tsv');
const STAND = '/tmp/_kommentare_stand.json';

// ---------- Antworten ----------
const h = s => parseInt(crypto.createHash('md5').update(String(s)).digest('hex').slice(0, 6), 16);
const wahl = (arr, id) => arr[h(id) % arr.length];

export function antwort(text, { codeAktiv = false, link = '', id = '' } = {}) {
  const k = klasse(text);
  const t = frageThema(text);
  const mitLink = (s) => link ? `${s} ${link}` : s;
  if (k === 'lob') return wahl(['Vielen Dank, das freut uns! 🤍', 'Danke dir, das freut uns sehr! 🤍', 'Ganz lieben Dank! 🤍 Schön, dass es dir gefällt.'], id);
  if (k === 'allgemein') return wahl(['Danke für deinen Kommentar! 🤍 Mehr findest du auf luxestyle.ch.', 'Danke dir! 🤍 Alles Weitere findest du auf luxestyle.ch.'], id);
  switch (t) {
    case 'versand': return mitLink('Danke für deine Frage! 📦 Wir liefern in die Schweiz und nach Liechtenstein. Die Lieferzeit steht bei jedem Produkt, in der Schweiz ist der Versand ab CHF 50 gratis.');
    case 'groesse': return mitLink('Danke für deine Frage! 🤍 Die Grössentabelle steht direkt beim Produkt. Wenn du unsicher bist, schreib uns gern eine Nachricht.');
    case 'preis': return mitLink(codeAktiv
      ? 'Danke für deine Frage! 🤍 Der aktuelle Preis steht beim Produkt. Mit dem Code WELCOME10 sparst du 10 % auf deine erste Bestellung.'
      : 'Danke für deine Frage! 🤍 Der aktuelle Preis steht beim Produkt.');
    case 'verfuegbar': return mitLink('Danke für deine Frage! 🤍 Bestand und Farben siehst du live beim Produkt.');
    case 'rueckgabe': return 'Danke für deine Frage! 🤍 Alle Infos zu Rückgabe und Umtausch findest du in den Richtlinien auf luxestyle.ch. Wenn etwas unklar ist, schreib uns gern eine Nachricht.';
    case 'zahlung': return 'Danke für deine Frage! 🤍 Du kannst mit TWINT, Karte, PayPal, Apple Pay oder auf Rechnung mit Klarna bezahlen.';
    case 'echtheit': return 'Verständlich, dass du nachfragst! 🤍 Impressum, Kontakt und Rückgabe-Infos findest du auf luxestyle.ch. Bezahlen kannst du mit TWINT, Karte, PayPal oder Klarna.';
    case 'material': return mitLink('Danke für deine Frage! 🤍 Material und Pflege stehen in der Beschreibung beim Produkt.');
    default: return mitLink('Danke für deine Frage! 🤍 Die Details stehen beim Produkt auf luxestyle.ch. Wenn etwas offen bleibt, schreib uns gern eine Nachricht.');
  }
}

export function produktLink(caption = '', plattform = 'IG') {
  const m = /luxestyle\.ch\/products\/([a-z0-9][a-z0-9\-]*)/i.exec(caption);
  if (!m) return '';
  return plattform === 'FB'
    ? `https://luxestyle.ch/products/${m[1]}?utm_source=facebook&utm_medium=organic_social&utm_campaign=kommentar`
    : `luxestyle.ch/products/${m[1]}`;
}

// ---------- Selbsttest ----------
if (process.argv.includes('--selbsttest')) {
  let f = 0; const ok = (b, m) => { if (!b) { f++; console.log('✗', m); } };
  const a1 = antwort('Wie lange dauert der Versand?', { link: 'luxestyle.ch/products/x', id: 'a' });
  ok(/Liechtenstein/.test(a1) && /luxestyle\.ch\/products\/x$/.test(a1), 'Versand mit Link');
  ok(!/WELCOME10/.test(antwort('Was kostet das?', { codeAktiv: false, id: 'b' })), 'Code nie ohne ACTIVE');
  ok(/WELCOME10/.test(antwort('Gibt es einen Rabattcode?', { codeAktiv: true, id: 'c' })), 'Code bei Rabattfrage');
  ok(!/WELCOME10/.test(antwort('Wunderschön 😍', { codeAktiv: true, id: 'd' })), 'Lob ohne Code');
  ok(!/\bgrüezi|mega|üs\b/i.test(antwort('Wunderschön 😍', { id: 'e' })), 'Hochdeutsch');
  ok(produktLink('Kleid 👗 luxestyle.ch/products/sirene-kleid · Link in Bio', 'IG') === 'luxestyle.ch/products/sirene-kleid', 'IG-Link ohne UTM');
  ok(/utm_source=facebook/.test(produktLink('luxestyle.ch/products/x', 'FB')), 'FB-Link mit UTM');
  ok(produktLink('kein Link', 'IG') === '', 'ohne Link');
  console.log(f ? `${f} Fehler` : 'OK Antworten'); process.exit(f ? 1 : 0);
}

// ---------- Graph ----------
async function gget(url) { try { const r = await fetch(url); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; } catch (e) { return { ok: false, status: 0, j: { error: { message: e.message } } }; } }
async function gpost(url, body) { try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; } catch (e) { return { ok: false, status: 0, j: { error: { message: e.message } } }; } }
const fehler = r => JSON.stringify(r.j.error || r.j).slice(0, 140);

function loadState() { try { return new Set(JSON.parse(fs.readFileSync(STATE, 'utf8'))); } catch { return new Set(); } }
function saveState(set) { try { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify([...set].slice(-2000))); } catch (e) { console.error('State speichern:', e.message); } }
function logZeile(plattform, id, aktion, kl) { if (DRY) return; try { fs.appendFileSync(LOG, `${new Date().toISOString().slice(0, 16)}Z\t${plattform}\t${id}\t${aktion}\t${kl}\n`); } catch {} }

// Rabattcode nur nennen, wenn Shopify ihn JETZT als ACTIVE meldet (4 h Zwischenspeicher).
async function codeAktiv() {
  const cache = '/tmp/_welcome10_status';
  try { const [ts, st] = fs.readFileSync(cache, 'utf8').trim().split(' '); if (Date.now() - Number(ts) < 4 * 3600e3) return st === 'ACTIVE'; } catch {}
  const tok = process.env.SHOPIFY_ADMIN_TOKEN || rd('/tmp/cj_shop_token.txt');
  let st = 'UNBEKANNT';
  if (tok) {
    try {
      const r = await fetch('https://au3j0y-hq.myshopify.com/admin/api/2025-10/graphql.json', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok },
        body: JSON.stringify({ query: '{ codeDiscountNodes(first:3, query:"title:WELCOME10"){ edges{ node{ codeDiscount{ ... on DiscountCodeBasic{ status endsAt } } } } } }' }) });
      const j = await r.json();
      const d = j?.data?.codeDiscountNodes?.edges?.[0]?.node?.codeDiscount;
      if (d) st = (d.status === 'ACTIVE' && (!d.endsAt || Date.parse(d.endsAt) > Date.now())) ? 'ACTIVE' : String(d.status || 'INAKTIV');
    } catch {}
  }
  try { fs.writeFileSync(cache, `${Date.now()} ${st}`); } catch {}
  return st === 'ACTIVE';
}

// ---------- Einsammeln ----------
async function sammelnIG() {
  if (!IG_ID || !IG_TOK) return { fehler: 'kein IG-Zugang', liste: [] };
  const media = await gget(`https://graph.facebook.com/${V}/${IG_ID}/media?fields=id,caption,timestamp&limit=${LOOKBACK}&access_token=${encodeURIComponent(IG_TOK)}`);
  if (!media.ok) return { fehler: `IG media ${media.status} ${fehler(media)}`, liste: [] };
  const liste = [];
  for (const m of media.j.data || []) {
    const cs = await gget(`https://graph.facebook.com/${V}/${m.id}/comments?fields=id,text,username,timestamp,hidden,replies%7Busername%7D&limit=100&access_token=${encodeURIComponent(IG_TOK)}`);
    for (const c of cs.j.data || []) {
      liste.push({ pl: 'IG', id: c.id, text: c.text || '', autor: c.username || '', ts: Date.parse(c.timestamp || '') || 0, versteckt: !!c.hidden,
        eigen: (c.username || '').toLowerCase() === EIGEN_IG,
        beantwortet: ((c.replies || {}).data || []).some(r => (r.username || '').toLowerCase() === EIGEN_IG),
        caption: m.caption || '' });
    }
  }
  return { liste };
}
async function sammelnFB() {
  if (!FB_ID || !FB_TOK) return { fehler: 'kein FB-Zugang', liste: [] };
  const posts = await gget(`https://graph.facebook.com/${V}/${FB_ID}/feed?fields=id,message,created_time&limit=${LOOKBACK}&access_token=${encodeURIComponent(FB_TOK)}`);
  if (!posts.ok) return { fehler: `FB feed ${posts.status} ${fehler(posts)}`, liste: [] };
  const liste = [];
  for (const p of posts.j.data || []) {
    const cs = await gget(`https://graph.facebook.com/${V}/${p.id}/comments?fields=id,message,from,created_time,is_hidden,comments%7Bfrom%7D&limit=100&access_token=${encodeURIComponent(FB_TOK)}`);
    for (const c of cs.j.data || []) {
      const von = (c.from || {}).id || '';
      liste.push({ pl: 'FB', id: c.id, text: c.message || '', autor: von || (c.from || {}).name || '', ts: Date.parse(c.created_time || '') || 0, versteckt: !!c.is_hidden,
        eigen: von === FB_ID,
        beantwortet: ((c.comments || {}).data || []).some(r => ((r.from || {}).id || '') === FB_ID),
        caption: p.message || '' });
    }
  }
  return { liste };
}

// ---------- Hauptlauf ----------
(async () => {
  if (!IG_TOK && !FB_TOK) { console.log('KOMMENTARE: kein Meta-Zugang → nichts getan'); process.exit(0); }
  const replied = loadState();
  const [ig, fb] = await Promise.all([sammelnIG(), sammelnFB()]);
  const alle = [...ig.liste, ...fb.liste];
  const probleme = [ig.fehler, fb.fehler].filter(Boolean);
  const proKonto = {};
  for (const c of alle) if (c.autor && !c.eigen) proKonto[c.pl + ':' + c.autor] = (proKonto[c.pl + ':' + c.autor] || 0) + 1;

  const jetzt = Date.now();
  const stat = { geprueft: alle.length, bot_verborgen: 0, bot_schon_verborgen: 0, beantwortet: 0, offen_echt: 0, uebersprungen_alt: 0, fehler: 0, dry: DRY };
  const mitCode = await codeAktiv();
  let n = 0;
  for (const c of alle) {
    if (c.eigen || replied.has(c.id)) continue;
    let k = klasse(c.text);
    const farm = (proKonto[c.pl + ':' + c.autor] || 0) >= FARM_AB;
    if (farm && k !== 'frage') k = 'bot';
    if (k === 'leer') continue;
    if (k === 'bot' || k === 'spam') {
      if (c.versteckt) { stat.bot_schon_verborgen++; continue; }
      if (DRY) { console.log(`DRY ${c.pl} verbergen [${k}${farm ? '+Konto' : ''}] «${c.text.slice(0, 50)}»`); stat.bot_verborgen++; continue; }
      const url = c.pl === 'IG' ? `https://graph.facebook.com/${V}/${c.id}?access_token=${encodeURIComponent(IG_TOK)}` : `https://graph.facebook.com/${V}/${c.id}?access_token=${encodeURIComponent(FB_TOK)}`;
      const r = await gpost(url, c.pl === 'IG' ? { hide: true } : { is_hidden: true });
      if (r.ok) { stat.bot_verborgen++; logZeile(c.pl, c.id, 'verborgen', k); } else { stat.fehler++; probleme.push(`${c.pl} hide ${fehler(r)}`); }
      await new Promise(s => setTimeout(s, 800));
      continue;
    }
    if (c.versteckt || c.beantwortet) continue;
    if (jetzt - c.ts > MAX_ALTER_TAGE * 86400e3) { stat.uebersprungen_alt++; continue; }
    if (n >= MAXR) { stat.offen_echt++; continue; }
    const msg = antwort(c.text, { codeAktiv: mitCode, link: produktLink(c.caption, c.pl), id: c.id });
    if (DRY) { console.log(`DRY ${c.pl} [${k}/${frageThema(c.text)}] «${c.text.slice(0, 50)}» ⇒ «${msg}»`); n++; stat.beantwortet++; continue; }
    const url = c.pl === 'IG' ? `https://graph.facebook.com/${V}/${c.id}/replies?access_token=${encodeURIComponent(IG_TOK)}` : `https://graph.facebook.com/${V}/${c.id}/comments?access_token=${encodeURIComponent(FB_TOK)}`;
    const r = await gpost(url, { message: msg });
    if (r.ok) { replied.add(c.id); n++; stat.beantwortet++; logZeile(c.pl, c.id, 'beantwortet', k + '/' + frageThema(c.text)); } else { stat.fehler++; stat.offen_echt++; probleme.push(`${c.pl} reply ${fehler(r)}`); }
    await new Promise(s => setTimeout(s, 1500));
  }
  if (!DRY) saveState(replied);
  const zeile = `KOMMENTARE: ${stat.geprueft} gesehen · ${stat.bot_verborgen} Bots verborgen (${stat.bot_schon_verborgen} schon) · ${stat.beantwortet} beantwortet · ${stat.offen_echt} echte offen · ${stat.fehler} Fehler${DRY ? ' (DRY)' : ''}${mitCode ? '' : ' · Rabattcode nicht ACTIVE → nicht genannt'}`;
  console.log(zeile);
  probleme.slice(0, 5).forEach(p => console.log('  !', p));
  try { fs.writeFileSync(STAND, JSON.stringify({ ts: new Date().toISOString(), ...stat, probleme: probleme.slice(0, 5), zeile })); } catch {}
  process.exit(0);
})();
