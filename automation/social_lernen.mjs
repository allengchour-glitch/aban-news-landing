#!/usr/bin/env node
/* social_lernen.mjs — die Lernschleife (Betreiber 22.09.2026: «pure automation mit verbesserung und
 * analyse und lernen mehrmals täglich»). NUR LESEND gegen die Plattformen. Schreibt
 *   · social/_lernen.json      — Gewichte je Hook, Thema, Zeitfenster, Format, Musik, Stimme — JEDES mit n
 *   · dropship/SOCIAL-LERNEN.md — Bericht: belastbare Befunde getrennt von vorläufigen
 *
 * v2 (23.09.2026, Audit-Befund 28): v1 lernte aus Einzelposts — «haustier 7.47» und der Hook «Endlich Ruhe beim
 * Gassi?» 12.68 kamen aus EINEM Reel (Futterspender, Reichweite 191); ein einziger Post versechsfachte ein
 * Themengewicht in 7 h, und der Reel-Motor bevorzugte Hooks nach Zufallstreffern. Jetzt:
 *   1. Mehr Daten: alle Instagram-Posts der letzten TAGE (Default 90, Graph API) + TikTok und Pinterest aus
 *      Metricool (gleiche Reels/Produkte, eigener Kanal-Massstab). Posts unter 24 h zählen nicht (Zahlen wachsen noch).
 *   2. Fairer Massstab: jeder Post wird am Median SEINES Kanals und Formats (±21 Tage) gemessen — ein Reel nicht an
 *      Bildern, ein Juli-Post nicht am September. rel = (Score+5)/(Median+5), gerechnet als ln(rel), gekappt bei ×8.
 *      Die +5 sind ein Rauschboden: Pinterest-Pins haben Median-Scores um 0–4, «7 statt 0» ist Zufall, kein ×8.
 *   3. Glättung (Bayes, Prior = Durchschnitt): vorsprung = Σ ln(rel) / (n + K), K = 3. Ein Einzelpost bewegt ein
 *      Gewicht höchstens um ×1.68; erst viele Posts in dieselbe Richtung ergeben ein starkes Gewicht.
 *   4. n zählt INHALTE (ein Reel auf Instagram und TikTok ist ein Inhalt mit zwei Messungen, gemittelt), nicht Posts.
 *   5. belastbar = n ≥ MIN_N (3). Der Reel-Motor liest `hooks` — dort stehen NUR belastbare Hooks, Wert = vorsprung
 *      (ln-Skala: 0 = Durchschnitt, > 0 besser, < 0 schwächer). Nicht gelistete Hooks zählen im Motor 0 = neutral,
 *      also genau wie ein Durchschnitts-Hook (v1: jeder gemessene Hook schlug jeden ungetesteten, auch ein schwacher).
 *   6. Musik und Stimme als Merkmal aus social/_musik_verlauf.txt (Reel-ID in Spalte 5), verknüpft über
 *      automation/reels_seed.csv (post_url = IG-Permalink bzw. «tiktok:…/video/<id>»).
 * Score (unverändert): Reichweite + 3·Likes + 5·Kommentare + 5·Speichern + 5·Teilen + 0,2·Views (IG);
 *   TikTok: Views + 3·Likes + 5·Kommentare + 5·Teilen; Pinterest: Impressionen + 5·Merken + 3·Pin-Klicks + 10·Ausgehende Klicks.
 *
 * ENV: DRY=1 (nur Tabelle zeigen, nichts schreiben) · TAGE=90 · N=150 (höchstens so viele IG-Posts) · K=3 · MIN_N=3 ·
 *      METRICOOL=0 (Metricool auslassen) · MIN_ALTER_H=24 · META_ACCESS_TOKEN (oder /tmp/meta_page_token) · IG_USER_ID (oder
 *      /tmp/meta_ig_id) · METRICOOL_USER_TOKEN (oder /tmp/metricool.env) · METRICOOL_USER_ID · METRICOOL_BLOG_ID
 */
import fs from 'node:fs';

const DRY = process.env.DRY === '1';
const TAGE = parseFloat(process.env.TAGE || '90');
const N_MAX = parseInt(process.env.N || '150', 10);
const K = parseFloat(process.env.K || '3');
const MIN_N = parseInt(process.env.MIN_N || '3', 10);
const KAPPE = Math.log(8);
const RAUSCH = 5;                   // Rauschboden: kleine Zahlen (Pins mit 0–10 Impressionen) erzeugen keine Riesen-Verhältnisse
const MIN_ALTER_H = parseFloat(process.env.MIN_ALTER_H || '24');   // jüngere Posts zählen nicht (Zahlen wachsen noch)
const TOK = (process.env.META_ACCESS_TOKEN || (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token', 'utf8') : '')).trim();
const IG = (process.env.IG_USER_ID || (fs.existsSync('/tmp/meta_ig_id') ? fs.readFileSync('/tmp/meta_ig_id', 'utf8') : '')).trim();
if (!TOK || !IG) { console.log('Kein Meta-Token/IG-ID → No-op.'); process.exit(0); }
const V = 'v21.0';
const JETZT = Date.now();
const AB = JETZT - TAGE * 86400000;
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const rund = (x, s = 2) => Math.round(x * 10 ** s) / 10 ** s;
const median = a => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };

async function holJson(url) {
  for (let a = 0; a < 3; a++) { try { const r = await fetch(url); return await r.json(); } catch { await schlaf(2000 * (a + 1)); } }
  return {};
}
function graphUrl(pfad, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${pfad}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', TOK); return u.toString();
}

// ---------------------------------------------------------------- Einteilung (Kopie aus cj_video_reel_engine.mjs)
// Gleiche Themen wie der Reel-Motor, damit ein gelerntes Gewicht zu seiner Einteilung passt.
function thema(t) {
  const s = t.toLowerCase();
  if (/hund|katze|haustier|welpe|\bpet\b/.test(s)) return 'haustier';
  if (/fitness|yoga|training|hantel|widerstand|faszien|sport/.test(s)) return 'fitness';
  if (/küche|kuchen|mixer|kaffee|tee|entsafter|grill|messbecher|topf|pfanne/.test(s)) return 'kueche';
  if (/kind|baby|kleinkind|spielzeug|lern/.test(s)) return 'kinder';
  if (/lampe|licht|led|deko|vase|kerze|diffuser|aroma|kissen|decke|organizer|regal/.test(s)) return 'home';
  if (/beamer|projektor|kopfhörer|kopfhoerer|lautsprecher|ladegerät|kabel|usb|bluetooth|smart|kamera|drohne|gadget|tracker|hülle|huelle/.test(s)) return 'gadget';
  if (/serum|gua|roller|creme|pflege|haar|nagel|wimper|augenbraue|makeup|make-up|massage|beauty|glätt/.test(s)) return 'beauty';
  if (/kette|ohrring|armreif|armband|\bring\b|schmuck|anhänger|uhr/.test(s)) return 'schmuck';
  if (/kleid|rock|bluse|hose|jacke|mantel|hoodie|shirt|pullover|sneaker|schuh|tasche|rucksack|gürtel|schal|cap|mütze/.test(s)) return 'mode';
  return 'allgemein';
}
// Themen-Text: die ersten drei Zeilen ohne Hashtags (Hashtags waren teils falsch, z. B. #skincare auf einem Bauchroller)
// plus der Produkt-Handle, wenn der Text ihn trägt.
function themenText(caption) {
  const h = (/luxestyle\.ch\/products\/([\w%-]+)/.exec(caption || '') || [])[1] || '';
  return String(caption || '').split('\n').slice(0, 3).join(' ').replace(/#\S+/g, ' ') + ' ' + h.replace(/-/g, ' ');
}
// Hook = erste Zeile ohne Emoji/Anführungszeichen (v1 nahm Emoji ohne u-Flag heraus und zerschnitt dabei Ersatzpaare:
// «\udf0d» stand in der JSON). Code-Punkte, nicht UTF-16-Einheiten, werden gekürzt.
function hookVon(caption) {
  const z = String(caption || '').split('\n')[0]
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D]/gu, '')
    .replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(z).slice(0, 60).join('').trim() || null;
}
const capSig = s => String(s || '').toLowerCase().replace(/#.*$/s, '').replace(/[^a-z0-9äöü ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 45);
const handleVon = s => (/luxestyle\.ch\/products\/([\w%-]+)/.exec(s || '') || [])[1] || null;

// ---------------------------------------------------------------- Zuordnung Reel-ID ↔ Post (reels_seed.csv)
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const reelVon = new Map();      // 'ig:<shortcode>' | 'igid:<media-id>' | 'tt:<videoId>' → {id, caption}
const reelCaption = new Map();  // Reel-ID → Caption aus der Queue (Hook = erste Zeile, Wahrheit des Motors)
try {
  const rows = parseCsv(fs.readFileSync('automation/reels_seed.csv', 'utf8'));
  const ix = Object.fromEntries(rows[0].map((h, i) => [h.trim(), i]));
  for (const r of rows.slice(1)) {
    const id = (r[ix.id] || '').trim(), pu = r[ix.post_url] || ''; if (!id) continue;
    reelCaption.set(id, r[ix.caption] || '');
    for (const m of pu.matchAll(/instagram\.com\/(?:reel|reels|p)\/([\w-]+)/g)) reelVon.set('ig:' + m[1], id);
    for (const m of pu.matchAll(/tiktok\.com\/@[^/\s]+\/video\/(\d+)/g)) reelVon.set('tt:' + m[1], id);
    const nackt = /^\s*(\d{15,20})\s*$/.exec(pu); if (nackt) reelVon.set('igid:' + nackt[1], id);
  }
} catch (e) { console.log('   reels_seed.csv nicht lesbar:', String(e.message || e).slice(0, 80)); }
const kurzcode = url => (/instagram\.com\/(?:reel|reels|p)\/([\w-]+)/.exec(url || '') || [])[1] || null;

// Musik-Verlauf: Zeit · Musikdatei · Einstieg · Thema · Reel-ID · stimme:ja|nein · Stimme/Grund (TSV, ohne Kopf)
const VERLAUF = 'social/_musik_verlauf.txt';
const musikZeilen = new Map();
let verlaufZeilen = 0;
if (fs.existsSync(VERLAUF)) {
  for (const z of fs.readFileSync(VERLAUF, 'utf8').split('\n')) {
    const f = z.split('\t'); if (f.length < 5 || !f[4]) continue; verlaufZeilen++;
    const e = { t: Date.parse(f[0]) || 0, musik: (f[1] || '').split('/').pop(), thema: f[3] || '', stimme: /stimme:ja/.test(f[5] || '') ? 'mit Stimme' : (f[5] ? 'ohne Stimme' : null) };
    (musikZeilen.get(f[4]) || musikZeilen.set(f[4], []).get(f[4])).push(e);
  }
}
// Die Fassung, die gepostet wurde: letzte Verlaufszeile VOR dem ersten Post (+5 Min). Später neu gerendert = unbekannt.
function musikFuer(reelId, ersterPost) {
  const l = (musikZeilen.get(reelId) || []).filter(e => e.t && e.t <= ersterPost + 5 * 60000).sort((a, b) => a.t - b.t);
  return l.length ? l[l.length - 1] : null;
}

// ---------------------------------------------------------------- Messungen lesen
const obs = [];      // {kanal, format, t, caption, score, reach, likes, comments, saved, shares, views, url, reelId}
const quellen = { instagram: 0, tiktok: 0, pinterest: 0, fehler: [] };

// Instagram (Graph API, paginiert bis TAGE oder N)
{
  let url = graphUrl(`${IG}/media`, { fields: 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink', limit: '50' });
  const medien = [];
  for (let s = 0; s < 8 && url && medien.length < N_MAX; s++) {
    const j = await holJson(url);
    if (!Array.isArray(j.data)) { quellen.fehler.push('Instagram: ' + (j.error?.message || 'keine Antwort').slice(0, 80)); break; }
    let alt = false;
    for (const m of j.data) { if (Date.parse(m.timestamp) < AB) { alt = true; break; } medien.push(m); if (medien.length >= N_MAX) break; }
    url = alt ? null : j.paging?.next || null;
  }
  for (const m of medien) {
    const format = m.media_type === 'CAROUSEL_ALBUM' ? 'karussell' : (m.media_product_type === 'REELS' || m.media_type === 'VIDEO') ? 'reel' : 'bild';
    const metriken = format === 'reel' ? 'reach,saved,shares,views' : 'reach,saved,shares';
    let ins = await holJson(graphUrl(`${m.id}/insights`, { metric: metriken }));
    if (ins.error) ins = await holJson(graphUrl(`${m.id}/insights`, { metric: 'reach,saved' }));
    const w = {}; for (const d of (ins.data || [])) w[d.name] = d.values?.[0]?.value ?? d.total_value?.value ?? 0;
    const reach = Number(w.reach || 0), likes = Number(m.like_count || 0), comments = Number(m.comments_count || 0), saved = Number(w.saved || 0), shares = Number(w.shares || 0), views = Number(w.views || 0);
    const kc = kurzcode(m.permalink);
    const reelId = (kc && reelVon.get('ig:' + kc)) || reelVon.get('igid:' + m.id) || null;
    obs.push({ kanal: 'instagram', format, t: Date.parse(m.timestamp), caption: m.caption || '', reach, likes, comments, saved, shares, views,
      score: reach + 3 * likes + 5 * comments + 5 * saved + 5 * shares + 0.2 * views, url: m.permalink, reelId });
  }
  quellen.instagram = medien.length;
}

// Metricool: TikTok und Pinterest (Instagram kommt direkt aus der Graph API; Facebook hat 16 von 176 Posts mit Zahlen > 0)
function mcToken() {
  if (process.env.METRICOOL_USER_TOKEN) return process.env.METRICOOL_USER_TOKEN.trim();
  try { const m = /METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(fs.readFileSync('/tmp/metricool.env', 'utf8')); if (m) return m[1]; } catch {}
  return '';
}
const MC = process.env.METRICOOL === '0' ? '' : mcToken();
if (MC) {
  const tag = t => new Date(t).toISOString().slice(0, 10);
  const q = `userId=${process.env.METRICOOL_USER_ID || '4801419'}&blogId=${process.env.METRICOOL_BLOG_ID || '6227837'}&from=${tag(AB)}T00:00:00&to=${tag(JETZT + 86400000)}T23:59:59&timezone=${encodeURIComponent('Europe/Zurich')}`;
  async function mc(netz) {
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(`https://app.metricool.com/api/v2/analytics/posts/${netz}?${q}`, { headers: { 'X-Mc-Auth': MC } });
        const j = await r.json(); if (Array.isArray(j.data)) return j.data;
        quellen.fehler.push(`Metricool ${netz}: HTTP ${r.status}`); return [];
      } catch { await schlaf(2000 * (a + 1)); }
    }
    quellen.fehler.push(`Metricool ${netz}: nicht erreichbar`); return [];
  }
  for (const p of await mc('tiktok')) {
    const t = Date.parse(p.createTime); if (!t || t < AB) continue;
    const views = Number(p.viewCount || 0), likes = Number(p.likeCount || 0), comments = Number(p.commentCount || 0), shares = Number(p.shareCount || 0);
    obs.push({ kanal: 'tiktok', format: 'reel', t, caption: p.videoDescription || p.title || '', reach: Number(p.reach || 0), likes, comments, saved: 0, shares, views,
      score: views + 3 * likes + 5 * comments + 5 * shares, url: `https://www.tiktok.com/@luxestyle.ch/video/${p.videoId}`, reelId: reelVon.get('tt:' + p.videoId) || null });
    quellen.tiktok++;
  }
  for (const p of await mc('pinterest')) {
    const t = Date.parse(p.createdAt); if (!t || t < AB) continue;
    const kc = kurzcode(p.link);
    obs.push({ kanal: 'pinterest', format: p.mediaType === 'video' ? 'pin-video' : 'pin', t, caption: `${p.title || ''}\n${p.description || ''}\n${p.link || ''}`,
      reach: Number(p.impressions || 0), likes: 0, comments: 0, saved: Number(p.saves || 0), shares: 0, views: 0,
      score: Number(p.impressions || 0) + 5 * Number(p.saves || 0) + 3 * Number(p.pinClicks || 0) + 10 * Number(p.outboundClicks || 0),
      url: p.link || '', reelId: (kc && reelVon.get('ig:' + kc)) || null, pinKlicks: Number(p.pinClicks || 0), ausgehend: Number(p.outboundClicks || 0) });
    quellen.pinterest++;
  }
} else if (process.env.METRICOOL !== '0') quellen.fehler.push('Metricool: kein Token (Env oder /tmp/metricool.env) → nur Instagram');

const reif = obs.filter(o => JETZT - o.t >= MIN_ALTER_H * 3600000);
const zuJung = obs.length - reif.length;
if (!reif.length) { console.log('Keine auswertbaren Posts (Token/Netz?) → nichts gelernt.', quellen.fehler.join(' · ')); process.exit(0); }

// ---------------------------------------------------------------- Massstab je Post: Median seines Kanals+Formats (±21 T)
const FENSTER = 21 * 86400000;
for (const o of reif) {
  const stufen = [
    p => p.kanal === o.kanal && p.format === o.format && Math.abs(p.t - o.t) <= FENSTER,
    p => p.kanal === o.kanal && p.format === o.format,
    p => p.kanal === o.kanal && Math.abs(p.t - o.t) <= FENSTER,
    p => p.kanal === o.kanal,
  ];
  let peers = []; for (const f of stufen) { peers = reif.filter(f); if (peers.length >= 5) break; }
  o.med = median(peers.map(p => p.score));
  o.l = Math.max(-KAPPE, Math.min(KAPPE, Math.log((o.score + RAUSCH) / (o.med + RAUSCH))));
}

// ---------------------------------------------------------------- Inhalte (ein Reel auf IG + TikTok + Pin = ein Inhalt)
// Ältere Pins verlinken nur einen Instagram-Post (ohne Titel) → sie gehören zum Inhalt dieses Posts.
const inhalte = new Map(), igInhalt = new Map();
const zuordnen = (o, key) => { (inhalte.get(key) || inhalte.set(key, { key, obs: [] }).get(key)).obs.push(o); };
for (const o of reif.filter(o => o.kanal !== 'pinterest')) {
  const h = handleVon(o.caption);
  const key = o.reelId || (h ? 'produkt:' + h : 'sig:' + capSig(o.caption) + ':' + o.kanal);
  if (o.kanal === 'instagram' && kurzcode(o.url)) igInhalt.set(kurzcode(o.url), key);
  zuordnen(o, key);
}
for (const o of reif.filter(o => o.kanal === 'pinterest')) {
  const h = handleVon(o.caption), kc = kurzcode(o.url);
  zuordnen(o, o.reelId || (kc && igInhalt.get(kc)) || (h ? 'produkt:' + h : 'pin:' + (kc || capSig(o.caption))));
}
let musikVerknuepft = 0;
for (const c of inhalte.values()) {
  c.l = c.obs.reduce((s, o) => s + o.l, 0) / c.obs.length;
  const erster = Math.min(...c.obs.map(o => o.t));
  const reelId = c.obs.find(o => o.reelId)?.reelId || null;
  const istReel = c.obs.some(o => o.format === 'reel');
  const queueCap = reelId ? reelCaption.get(reelId) : '';
  const igCap = c.obs.find(o => o.kanal === 'instagram')?.caption || '';
  const mz = reelId ? musikFuer(reelId, erster) : null;
  c.thema = mz?.thema || thema(themenText(queueCap || igCap || c.obs[0].caption));
  // Hook nur bei Reels: aus der Queue (Wahrheit des Motors), sonst aus der IG-Caption. Metricool liefert TikTok-Texte
  // ohne Zeilenumbrüche — dort gäbe «erste Zeile» den ganzen Text.
  c.hook = istReel ? hookVon(queueCap || igCap) : null;
  c.musik = mz?.musik || null; c.stimme = mz?.stimme || null; if (mz) musikVerknuepft++;
}

// ---------------------------------------------------------------- Gewichte mit n
function gruppe(elemente, schluessel) {
  const g = new Map();
  for (const e of elemente) { const k = schluessel(e); if (k == null) continue; (g.get(k) || g.set(k, []).get(k)).push(e.l); }
  const aus = {};
  for (const [k, ls] of [...g.entries()].sort((a, b) => b[1].reduce((s, x) => s + x, 0) / (b[1].length + K) - a[1].reduce((s, x) => s + x, 0) / (a[1].length + K))) {
    const n = ls.length, vorsprung = ls.reduce((s, x) => s + x, 0) / (n + K);
    aus[k] = { n, gewicht: rund(Math.exp(vorsprung)), vorsprung: rund(vorsprung, 3), median_rel: rund(Math.exp(median(ls))), belastbar: n >= MIN_N };
  }
  return aus;
}
const C = [...inhalte.values()];
const stundeCH = t => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t)));
const block = t => { const a = Math.floor(stundeCH(t) / 3) * 3; return `${String(a).padStart(2, '0')}–${String(a + 3).padStart(2, '0')}`; };
const themen = gruppe(C, c => c.thema);
const hooksDetail = gruppe(C, c => c.hook);
const musik = gruppe(C, c => c.musik);
const stimme = gruppe(C, c => c.stimme);
const zeitfenster = gruppe(reif, o => `${o.kanal} ${block(o.t)}`);
const hooks = Object.fromEntries(Object.entries(hooksDetail).filter(([, v]) => v.belastbar).map(([k, v]) => [k, v.vorsprung]));
const formate = {};
for (const o of reif) { const k = `${o.kanal} ${o.format}`; (formate[k] ||= []).push(o.score); }
const formatTabelle = Object.fromEntries(Object.entries(formate).map(([k, s]) => [k, { n: s.length, median_score: rund(median(s), 1) }]));

const alt = (() => { try { return JSON.parse(fs.readFileSync('social/_lernen.json', 'utf8')); } catch { return null; } })();
const ergebnis = {
  stand: new Date(JETZT).toISOString(),
  methode: `Score je Post am Median seines Kanals+Formats (±21 Tage) gemessen, rel = (Score+${RAUSCH})/(Median+${RAUSCH}), ln(rel) gekappt bei ×8; Gewicht = exp(Σ ln(rel) / (n + ${K})) — Bayes-Glättung Richtung Durchschnitt (1.0). n = Inhalte (ein Reel auf IG und TikTok zählt einmal). belastbar ab n ≥ ${MIN_N}. «hooks» (liest der Reel-Motor) enthält NUR belastbare Hooks, Wert = vorsprung auf ln-Skala (0 = Durchschnitt, <0 schwächer); nicht gelistete Hooks zählen dort 0 = neutral. Posts unter ${MIN_ALTER_H} h zählen nicht.`,
  fenster_tage: TAGE, k_glaettung: K, min_n: MIN_N,
  beobachtungen: { instagram: reif.filter(o => o.kanal === 'instagram').length, tiktok: reif.filter(o => o.kanal === 'tiktok').length, pinterest: reif.filter(o => o.kanal === 'pinterest').length, zu_jung: zuJung },
  inhalte: C.length, posts: reif.length,
  musik_verlauf: { zeilen: verlaufZeilen, verknuepfte_inhalte: musikVerknuepft },
  quellen_fehler: quellen.fehler,
  hooks, hooks_detail: hooksDetail, themen, zeitfenster, formate: formatTabelle, musik, stimme,
};

// ---------------------------------------------------------------- Ausgabe
const zeile = (k, v) => `| ${k} | ${v.n} | ${v.gewicht.toFixed(2)} | ${v.median_rel.toFixed(2)} | ${v.belastbar ? 'ja' : 'vorläufig'} |`;
const tabelle = (titel, obj, nurBelastbar = false, max = 50) => {
  const e = Object.entries(obj).filter(([, v]) => !nurBelastbar || v.belastbar);
  if (!e.length) return [`### ${titel}`, '', nurBelastbar ? `_Noch keiner mit n ≥ ${MIN_N}._` : '_Keine Daten._', ''];
  return [`### ${titel}`, '', '| Wert | n | Gewicht | Median rel | belastbar |', '|---|---:|---:|---:|---|', ...e.slice(0, max).map(([k, v]) => zeile(k.replace(/\|/g, '/'), v)), ''];
};
const beste = [...reif].sort((a, b) => b.l - a.l);
const postZeile = o => `- ×${Math.exp(o.l).toFixed(2)} (Score ${Math.round(o.score)}, Median ${Math.round(o.med)}) · ${o.kanal} ${o.format} · ${(o.caption.split('\n').find(z => z.trim()) || '').replace(/^https?:\/\/\S+$/, '').slice(0, 70)}${o.url ? ' · ' + o.url : ''}`;
const vorl = Object.values(hooksDetail).filter(v => !v.belastbar).length;
const md = [
  `# Social-Lernen — Stand ${new Date(JETZT).toISOString().slice(0, 16).replace('T', ' ')} UTC`, '',
  `Gelesen (letzte ${TAGE} Tage, Posts ab ${MIN_ALTER_H} h Alter): Instagram ${ergebnis.beobachtungen.instagram} · TikTok ${ergebnis.beobachtungen.tiktok} · Pinterest ${ergebnis.beobachtungen.pinterest} → **${C.length} Inhalte**; ${zuJung} zu junge Posts nicht gezählt.${quellen.fehler.length ? ' Lücken: ' + quellen.fehler.join('; ') + '.' : ''}`, '',
  `**So wird gerechnet:** Jeder Post wird am Median seines Kanals und Formats (±21 Tage) gemessen (×1.00 = typisch; +${RAUSCH} als Rauschboden, damit «7 statt 0 Impressionen» kein ×8 wird). Gewicht = exp(Σ ln(rel) / (n + ${K})): Bayes-Glättung Richtung Durchschnitt, ein Einzelpost bewegt ein Gewicht höchstens um ×${Math.exp(KAPPE / (1 + K)).toFixed(2)}. **n** = Inhalte. **Belastbar erst ab n ≥ ${MIN_N}** — alles darunter ist ein Hinweis, keine Erkenntnis. Der Reel-Motor bevorzugt nur belastbare Hooks.`, '',
  '## Belastbar (n ≥ ' + MIN_N + ')', '',
  ...tabelle('Themen', themen, true), ...tabelle('Hooks', hooksDetail, true), ...tabelle('Zeitfenster (Schweizer Zeit, je Kanal)', zeitfenster, true),
  ...tabelle('Musik', musik, true), ...tabelle('Stimme', stimme, true),
  '## Alle Werte mit n (vorläufige eingeschlossen)', '',
  ...tabelle('Themen', themen), ...tabelle('Zeitfenster (Schweizer Zeit, je Kanal)', zeitfenster),
  `### Hooks`, '', `${Object.keys(hooksDetail).length} Reel-Hooks gemessen, davon ${vorl} vorläufig (n < ${MIN_N}).`, '',
  ...tabelle('Hooks (Top 12)', hooksDetail, false, 12).slice(2),
  `### Musik und Stimme`, '', verlaufZeilen ? `${musikVerknuepft} Inhalte mit Musik aus \`${VERLAUF}\` verknüpft (${verlaufZeilen} Verlaufszeilen).` : `\`${VERLAUF}\` fehlt oder ist leer — Musik/Stimme werden verknüpft, sobald der Reel-Motor Zeilen schreibt.`, '',
  ...(Object.keys(musik).length ? tabelle('Musik', musik).slice(2) : []), ...(Object.keys(stimme).length ? tabelle('Stimme', stimme).slice(2) : []),
  '### Formate (roher Median-Score je Kanal)', '', '| Kanal Format | n | Median-Score |', '|---|---:|---:|',
  ...Object.entries(formatTabelle).map(([k, v]) => `| ${k} | ${v.n} | ${v.median_score} |`), '',
  '## Stärkste 5 (gegen den eigenen Kanal-Median)', ...beste.slice(0, 5).map(postZeile), '',
  '## Schwächste 5', ...beste.slice(-5).reverse().map(postZeile), '',
  'Score: Instagram = Reichweite + 3·Likes + 5·Kommentare + 5·Speichern + 5·Teilen + 0,2·Views; TikTok = Views + 3·Likes + 5·Kommentare + 5·Teilen; Pinterest = Impressionen + 5·Merken + 3·Pin-Klicks + 10·ausgehende Klicks. Gewichte stehen in `social/_lernen.json` (jedes mit n).',
].join('\n');

const kurz = (o, n = 8) => Object.entries(o).slice(0, n).map(([k, v]) => `${k} ${v.gewicht} (n=${v.n}${v.belastbar ? '' : ', vorläufig'})`).join(' · ');
console.log(`Gelernt aus ${reif.length} Posts = ${C.length} Inhalten (IG ${ergebnis.beobachtungen.instagram}, TikTok ${ergebnis.beobachtungen.tiktok}, Pinterest ${ergebnis.beobachtungen.pinterest}; zu jung ${zuJung})`);
console.log(`Themen: ${kurz(themen, 10)}`);
console.log(`Belastbare Hooks für den Reel-Motor: ${Object.keys(hooks).length ? Object.entries(hooks).map(([k, v]) => `${k} ${v}`).join(' · ') : 'keiner (alle n < ' + MIN_N + ') → Motor wählt neutral'}`);
console.log(`Zeitfenster belastbar: ${kurz(Object.fromEntries(Object.entries(zeitfenster).filter(([, v]) => v.belastbar)), 8) || '—'}`);
console.log(`Musik: ${verlaufZeilen ? `${musikVerknuepft} verknüpft · ${kurz(musik, 6)}` : 'Verlauf fehlt'}`);
if (alt?.themen) console.log(`Vorher (v1) Themen: ${Object.entries(alt.themen).map(([k, v]) => `${k} ${typeof v === 'number' ? v : v.gewicht}`).join(' · ')}`);
if (quellen.fehler.length) console.log('Lücken:', quellen.fehler.join(' · '));
if (DRY) { console.log('\n[DRY] nichts geschrieben. Bericht wäre:\n'); console.log(md); process.exit(0); }

fs.mkdirSync('social', { recursive: true });
fs.writeFileSync('social/_lernen.json.tmp', JSON.stringify(ergebnis, null, 2) + '\n');
fs.renameSync('social/_lernen.json.tmp', 'social/_lernen.json');     // der Reel-Motor liest nie eine halbe Datei
fs.writeFileSync('dropship/SOCIAL-LERNEN.md', md + '\n');
console.log('Geschrieben: social/_lernen.json + dropship/SOCIAL-LERNEN.md');
