// Pinterest-Autopilot für abannews.com — postet täglich Pins auf die Gratis-Rechner (dort sitzen die Kauf-Knöpfe).
//
// Ablauf pro Lauf: Token erneuern → Boards sicherstellen → Klick-Statistik der älteren Pins holen (Lernschleife)
// → N Themen gewichtet wählen → Text von Gemini ODER ChatGPT (abwechselnd, der andere springt ein, sonst Vorlage)
// → Fakten-Prüfer → Pin-Bild 1000×1500 (4 Layouts, beim Foto-Layout Hintergrund von Gemini, als KI markiert)
// → Pin erstellen → Ledger. Idempotent pro Tag, sicher ohne Zugangsdaten (Probelauf).
//
//   DRY_RUN=1 node automation/pinterest_aban/autopilot.mjs         (Standard: Probelauf, rendert Bilder nach OUT)
//   Secrets: ABAN_PINTEREST_APP_ID, ABAN_PINTEREST_APP_SECRET, ABAN_PINTEREST_REFRESH_TOKEN (einmalig über
//   https://abannews.com/api/pinterest-auth). Optional GEMINI_API_KEY, OPENAI_API_KEY. PINS_PRO_LAUF (Standard 2).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const HIER = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.ROOT || path.resolve(HIER, '../..');
const API = process.env.PINTEREST_API_BASE || 'https://api.pinterest.com/v5';
const GEMINI_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const LEDGER = path.join(ROOT, 'data/pinterest-aban.json');
const TOKEN_DATEI = path.join(ROOT, 'data/pinterest-aban-token.enc');
const POOL = JSON.parse(fs.readFileSync(path.join(HIER, 'pool.json'), 'utf8'));
const LAYOUTS = ['frage', 'zahl', 'liste', 'foto'];

// ---------- reine Funktionen (getestet) ----------

// Zahlen normalisieren: "−5,66 %" → "5.66", "1,25" → "1.25", "0,25" → "0.25"
export function zahlen(text) {
  return (String(text).match(/\d+(?:[.,’']\d+)*/g) || []).map((z) => z.replace(/[’']/g, '').replace(',', '.')).map((z) => String(parseFloat(z)));
}

const HYPE = /\b(ohne risiko|risikofrei\w*|risikolos\w*|sicher\w* rendite|passives? einkommen|finanzielle freiheit|revolution\w*|game.?changer|unglaublich\w*|geheim\w*|garantier\w*|schnell reich|reich werden|sofort reich|explosiv\w*|genial\w*|mega|krass|wahnsinn\w*|hammer|ultimativ\w*|100 ?%)\b|!{2,}|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/iu;

// Prüft einen KI-Text gegen die Fakten des Themas. Gibt Liste von Fehlern zurück (leer = ok).
export function pruefeText(t, thema) {
  const f = [];
  const erlaubt = new Set(zahlen(thema.fakten.join(' ')));
  const felder = { titel: [15, 100], beschreibung: [80, 500], alt: [20, 400], kopf: [8, 60], unterzeile: [10, 110] };
  for (const [k, [min, max]] of Object.entries(felder)) {
    const v = t?.[k];
    if (typeof v !== 'string' || v.trim().length < min || v.length > max) f.push(`${k}: Länge ${v?.length ?? 'fehlt'} (${min}–${max})`);
  }
  if (!Array.isArray(t?.punkte) || t.punkte.length !== 3 || t.punkte.some((p) => typeof p !== 'string' || p.length < 5 || p.length > 60)) f.push('punkte: genau 3 × 5–60 Zeichen');
  const alles = [t?.titel, t?.beschreibung, t?.alt, t?.kopf, t?.unterzeile, ...(t?.punkte || [])].join(' ');
  for (const z of zahlen(alles)) if (!erlaubt.has(z)) f.push(`erfundene Zahl: ${z}`);
  const h = alles.match(HYPE);
  if (h) f.push(`Hype/Emoji: ${h[0]}`);
  if (/https?:\/\//.test(alles)) f.push('Link im Text');
  if (thema.art === 'ratgeber' && /rechner/i.test(alles)) f.push('Ratgeber-Seite als „Rechner“ beschrieben');
  return f;
}

// Vorlage ohne KI (immer gültig, geprüft im Test)
export function vorlage(thema, variante = 0) {
  const fk = thema.fakten, w = thema.stichworte;
  const kopfe = [`${w[0]}: so geht's`, `${w[0]} richtig rechnen`, `${w[0]} einfach erklärt`];
  return {
    titel: `${w[0]}: ${thema.art === 'ratgeber' ? 'Gratis-Ratgeber' : 'Gratis-Rechner'} für die Schweiz`.slice(0, 100),
    beschreibung: `${fk[0]} ${fk[1] || ''} Gratis und ohne Anmeldung auf abannews.com. ${w.slice(0, 3).map((s) => s).join(', ')}.`.replace(/\s+/g, ' ').slice(0, 500),
    alt: `Grafik zum Thema ${w[0]}: ${fk[0]}`.slice(0, 400),
    kopf: kopfe[variante % kopfe.length].slice(0, 60),
    unterzeile: fk[0].slice(0, 110),
    punkte: [...fk.slice(1).filter((s) => s.length <= 60), 'Zahlen eintragen, Ergebnis sofort sehen', 'Gratis und ohne Anmeldung', 'Rechnet direkt im Browser'].slice(0, 3),
  };
}

// Gewichtete Auswahl: Grundgewicht × Lernfaktor, Themen der letzten 3 Tage bremsen, keine Doppelten pro Lauf.
export function waehle(pool, ledger, n, heute, zufall = Math.random) {
  const letzte = new Map();
  for (const p of ledger.pins || []) letzte.set(p.slug, p.datum > (letzte.get(p.slug) || '') ? p.datum : letzte.get(p.slug));
  const tage = (d) => (d ? (new Date(heute) - new Date(d)) / 864e5 : 99);
  const gew = pool.map((t) => {
    const lern = ledger.scores?.[t.slug] ? 1 + Math.min(3, ledger.scores[t.slug].klicks / Math.max(1, ledger.scores[t.slug].pins)) : 1;
    const frisch = tage(letzte.get(t.slug)) < 3 ? 0.15 : 1;
    return t.gewicht * lern * frisch;
  });
  const wahl = [];
  const offen = pool.map((t, i) => i);
  while (wahl.length < Math.min(n, pool.length)) {
    const summe = offen.reduce((a, i) => a + gew[i], 0);
    let r = zufall() * summe, idx = offen[offen.length - 1];
    for (const i of offen) { r -= gew[i]; if (r <= 0) { idx = i; break; } }
    wahl.push(pool[idx]); offen.splice(offen.indexOf(idx), 1);
  }
  return wahl;
}

// Layout rotiert pro Thema, damit dieselbe Seite immer ein neues Bild bekommt (Pinterest mag frische Pins).
export function naechstesLayout(ledger, slug, fotoMoeglich) {
  const liste = fotoMoeglich ? LAYOUTS : LAYOUTS.filter((l) => l !== 'foto');
  const bisher = (ledger.pins || []).filter((p) => p.slug === slug).length;
  return liste[bisher % liste.length];
}

// Refresh-Token verschlüsselt im Repo (AES-256-GCM, Schlüssel aus dem App-Secret abgeleitet).
const schluessel = (secret) => crypto.createHash('sha256').update('aban-pinterest:' + secret).digest();
export function verschluesseln(text, secret) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', schluessel(secret), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') });
}
export function entschluesseln(json, secret) {
  const o = JSON.parse(json), d = crypto.createDecipheriv('aes-256-gcm', schluessel(secret), Buffer.from(o.iv, 'base64'));
  d.setAuthTag(Buffer.from(o.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]).toString('utf8');
}

export function mitUtm(url, slug, layout) {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'pinterest'); u.searchParams.set('utm_medium', 'pin'); u.searchParams.set('utm_campaign', slug); u.searchParams.set('utm_content', layout);
  return u.toString();
}

// ---------- Bild ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FARBEN = { wohnen: ['#1f2937', '#f59e0b'], budget: ['#1f6f43', '#fbbf24'], schulden: ['#7c2d12', '#fcd34d'], hochzeit: ['#6b4f3a', '#f5d0a9'], vorsorge: ['#1e3a5f', '#fbbf24'] };
export function pinHtml(thema, t, layout, fotoB64) {
  const [dunkel, akzent] = FARBEN[thema.board] || FARBEN.budget;
  const zahl = thema.bildzahl || '';
  const css = `*{margin:0;box-sizing:border-box}body{width:1000px;height:1500px;overflow:hidden;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#fbf6ea;color:#1f2937;position:relative}
  .k{font-size:30px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${dunkel}}h1{font-family:Georgia,serif;font-size:92px;line-height:1.05;margin-top:26px}
  .u{font-size:40px;line-height:1.35;color:#374151;margin-top:30px}.fuss{position:absolute;left:0;right:0;bottom:0;background:${dunkel};color:#fff;padding:40px 70px;display:flex;justify-content:space-between;align-items:center;font-size:34px;font-weight:700}
  .fuss span{color:${akzent}}ul{list-style:none;margin-top:60px}li{font-size:44px;line-height:1.3;margin:0 0 34px;padding-left:74px;position:relative}
  li b{position:absolute;left:0;top:0;width:52px;height:52px;border-radius:12px;background:${dunkel};color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center}`;
  const fuss = `<div class="fuss">abannews.com <span>${thema.art === 'ratgeber' ? 'Gratis-Ratgeber' : 'Gratis-Rechner'} →</span></div>`;
  const kicker = esc((POOL.boards[thema.board] || {}).name || thema.stichworte[0]);
  const kopf = `<p class="k">${kicker}</p><h1>${esc(t.kopf)}</h1>`;
  const mitte = (inhalt) => `<div style="position:absolute;top:0;left:0;right:0;bottom:130px;display:flex;flex-direction:column;justify-content:center;padding:0 70px">${inhalt}</div>`;
  let body;
  if (layout === 'zahl' && zahl) body = mitte(`${kopf}<div style="font-family:Georgia,serif;font-size:210px;font-weight:700;color:${dunkel};margin-top:70px;line-height:1;white-space:nowrap">${esc(zahl.replace('-', '−'))}</div><p class="u">${esc(t.unterzeile)}</p><ul style="margin-top:70px">${t.punkte.slice(0, 2).map((p, i) => `<li><b>${i + 1}</b>${esc(p)}</li>`).join('')}</ul>`) + fuss;
  else if (layout === 'liste' || (layout === 'zahl' && !zahl)) body = mitte(`${kopf}<p class="u">${esc(t.unterzeile)}</p><ul>${t.punkte.map((p, i) => `<li><b>${i + 1}</b>${esc(p)}</li>`).join('')}</ul>`) + fuss;
  else if (layout === 'foto' && fotoB64) body = `<div style="position:absolute;inset:0;background:url(data:image/png;base64,${fotoB64}) center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.72) 75%)"></div>
     <div style="position:absolute;left:70px;right:70px;bottom:190px;color:#fff"><p class="k" style="color:${akzent}">${kicker}</p><h1 style="color:#fff">${esc(t.kopf)}</h1><p class="u" style="color:#f3f4f6">${esc(t.unterzeile)}</p></div>${fuss}`;
  else body = mitte(`${kopf}<p class="u" style="font-size:46px">${esc(t.unterzeile)}</p><div style="margin-top:70px;background:#fff;border:2px solid #e7dfd2;border-left:10px solid ${dunkel};border-radius:24px;padding:40px;font-size:40px;line-height:1.4">${esc(t.punkte[1])}</div><p style="margin-top:50px;font-size:36px;font-weight:700;color:${dunkel}">${esc(t.punkte[2])} →</p>`) + fuss;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

// ---------- KI ----------
function prompt(thema) {
  const was = thema.art === 'ratgeber' ? 'eine kostenlose Ratgeber-Seite (kein Rechner)' : 'einen kostenlosen Online-Rechner';
  return `Du schreibst einen Pinterest-Pin auf Deutsch (Schweiz, "ss" statt "ß") für ${was}.
Ziel: Menschen, die nach "${thema.stichworte.slice(0, 3).join('", "')}" suchen, sollen auf die Seite klicken.
Verwende AUSSCHLIESSLICH diese Fakten, keine anderen Zahlen, keine Versprechen, keine Ausrufezeichen, keine Emojis:
${thema.fakten.map((f) => '- ' + f).join('\n')}
Stil: sachlich, konkret, hilfreich, Du-Form. Keine Hype-Wörter.
Antworte NUR mit JSON: {"titel": "(15-100 Zeichen, mit Suchbegriff)", "beschreibung": "(80-500 Zeichen, 2-3 Sätze + 3 Suchbegriffe am Ende)", "alt": "(20-400 Zeichen, beschreibt das Bild)", "kopf": "(8-60 Zeichen, Schlagzeile auf dem Bild)", "unterzeile": "(10-110 Zeichen)", "punkte": ["(5-60 Zeichen)", "(5-60)", "(5-60)"]}`;
}
const jsonAus = (s) => JSON.parse(String(s).replace(/^```(?:json)?\s*|\s*```$/g, '').trim());

async function gemini(thema) {
  const r = await fetch(`${GEMINI_BASE}/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt(thema) }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  return jsonAus((await r.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '');
}
async function chatgpt(thema) {
  const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.9, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt(thema) }] }),
  });
  if (!r.ok) throw new Error(`ChatGPT ${r.status}`);
  return jsonAus((await r.json()).choices?.[0]?.message?.content || '');
}
async function geminiFoto(thema) {
  const motive = { hochzeit: 'an elegant wedding reception table with flowers and warm candle light, no people, no text', wohnen: 'a bright cozy Swiss apartment living room with large windows, no people, no text', budget: 'a tidy desk with a notebook, calculator and a cup of coffee in soft morning light, no text', schulden: 'a calm desk with neatly stacked paper bills and a plant, soft light, no text', vorsorge: 'a Swiss mountain lake at sunrise, calm and hopeful, no text' };
  const r = await fetch(`${GEMINI_BASE}/models/${process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Photorealistic vertical photo, 2:3 portrait: ${motive[thema.board] || motive.budget}. Absolutely no letters, words or logos.` }] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.6 } }),
  });
  if (!r.ok) throw new Error(`Gemini-Bild ${r.status}`);
  for (const p of (await r.json()).candidates?.[0]?.content?.parts || []) { const d = p.inline_data || p.inlineData; if (d?.data) return d.data; }
  throw new Error('Gemini-Bild: keine Bilddaten');
}

// Anbieter abwechseln (Tag + Index), der andere springt ein, sonst Vorlage. Jeder Text muss den Prüfer bestehen.
export async function text(thema, idx, anbieter = { gemini, chatgpt }) {
  const verfuegbar = [process.env.GEMINI_API_KEY && 'gemini', process.env.OPENAI_API_KEY && 'chatgpt'].filter(Boolean);
  const reihenfolge = verfuegbar.length === 2 && idx % 2 ? ['chatgpt', 'gemini'] : verfuegbar;
  for (const name of reihenfolge) {
    for (let versuch = 0; versuch < 2; versuch++) {
      try {
        const t = await anbieter[name](thema);
        const f = pruefeText(t, thema);
        if (!f.length) return { ...t, quelle: name };
        console.log(`  ${name}: verworfen (${f.join('; ')})`);
      } catch (e) { console.log(`  ${name}: ${e.message}`); }
    }
  }
  return { ...vorlage(thema, idx), quelle: 'vorlage' };
}

// ---------- Pinterest ----------
let ACCESS;
async function pin(methode, pfad, body) {
  const r = await fetch(API + pfad, { method: methode, headers: { Authorization: `Bearer ${ACCESS}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${methode} ${pfad} → ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}
async function tokenHolen() {
  if (process.env.ABAN_PINTEREST_ACCESS_TOKEN) { ACCESS = process.env.ABAN_PINTEREST_ACCESS_TOKEN; return; } // Sandbox-Token (Trial access)
  const id = process.env.ABAN_PINTEREST_APP_ID, sec = process.env.ABAN_PINTEREST_APP_SECRET;
  const kandidaten = [];
  if (fs.existsSync(TOKEN_DATEI)) { try { kandidaten.push(entschluesseln(fs.readFileSync(TOKEN_DATEI, 'utf8'), sec)); } catch { console.log('Gespeicherter Token nicht lesbar (App-Secret geändert?)'); } }
  if (process.env.ABAN_PINTEREST_REFRESH_TOKEN) kandidaten.push(process.env.ABAN_PINTEREST_REFRESH_TOKEN);
  for (const refresh of kandidaten) {
    const r = await fetch(`${API}/oauth/token`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${sec}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }) });
    if (!r.ok) { console.log(`Token-Erneuerung ${r.status}`); continue; }
    const j = await r.json();
    ACCESS = j.access_token;
    fs.writeFileSync(TOKEN_DATEI, verschluesseln(j.refresh_token || refresh, sec) + '\n'); // neuer Refresh-Token (60-Tage-Fenster) sicher ablegen
    return;
  }
  throw new Error('Kein gültiger Refresh-Token — neu anmelden über https://abannews.com/api/pinterest-auth');
}
async function boards() {
  const vorhanden = new Map(); let bookmark;
  do { const r = await pin('GET', `/boards?page_size=100${bookmark ? '&bookmark=' + bookmark : ''}`); for (const b of r.items || []) vorhanden.set(b.name, b.id); bookmark = r.bookmark; } while (bookmark);
  const ids = {};
  for (const [k, b] of Object.entries(POOL.boards)) {
    ids[k] = vorhanden.get(b.name) || (await pin('POST', '/boards', { name: b.name, description: b.beschreibung, privacy: 'PUBLIC' })).id;
  }
  return ids;
}
async function lernen(ledger, heute) {
  // Klicks der Pins, die 7–60 Tage alt sind, höchstens 20 Abfragen pro Lauf
  const kandidaten = (ledger.pins || []).filter((p) => p.id && !String(p.id).startsWith('dry') && (new Date(heute) - new Date(p.datum)) / 864e5 >= 7 && (new Date(heute) - new Date(p.datum)) / 864e5 <= 60).slice(-20);
  const start = new Date(new Date(heute) - 60 * 864e5).toISOString().slice(0, 10);
  for (const p of kandidaten) {
    try {
      const a = await pin('GET', `/pins/${p.id}/analytics?start_date=${start}&end_date=${heute}&metric_types=IMPRESSION,OUTBOUND_CLICK,SAVE`);
      const s = a.all?.summary_metrics || {};
      p.stats = { impressionen: s.IMPRESSION || 0, klicks: s.OUTBOUND_CLICK || 0, saves: s.SAVE || 0 };
    } catch (e) { console.log(`  Statistik ${p.id}: ${e.message.slice(0, 80)}`); }
  }
  const scores = {};
  for (const p of ledger.pins || []) {
    if (!p.stats) continue;
    const s = (scores[p.slug] ||= { pins: 0, klicks: 0, impressionen: 0, saves: 0 });
    s.pins++; s.klicks += p.stats.klicks; s.impressionen += p.stats.impressionen; s.saves += p.stats.saves;
  }
  ledger.scores = scores;
  const q = {};
  for (const p of ledger.pins || []) if (p.stats) { const k = p.quelle || '?'; (q[k] ||= { pins: 0, klicks: 0 }); q[k].pins++; q[k].klicks += p.stats.klicks; }
  ledger.quellen = q; // welche KI schreibt die Texte, die geklickt werden?
}

async function render(html, ziel) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(process.env.CH ? { executablePath: process.env.CH } : {});
  const p = await b.newPage({ viewport: { width: 1000, height: 1500 } });
  await p.setContent(html); await p.waitForTimeout(150);
  const buf = await p.screenshot({ type: 'png' });
  await b.close();
  if (ziel) fs.writeFileSync(ziel, buf);
  return buf;
}

async function main() {
  const DRY = process.env.DRY_RUN !== '0';
  const N = Math.max(1, Math.min(5, +(process.env.PINS_PRO_LAUF || 2)));
  const heute = process.env.HEUTE || new Date().toISOString().slice(0, 10);
  const OUT = process.env.OUT || path.join(ROOT, '_pins');
  const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { pins: [] };
  const SANDBOX = process.env.SANDBOX === '1';
  const hatZugang = process.env.ABAN_PINTEREST_ACCESS_TOKEN || process.env.ABAN_PINTEREST_APP_ID && process.env.ABAN_PINTEREST_APP_SECRET && (process.env.ABAN_PINTEREST_REFRESH_TOKEN || fs.existsSync(TOKEN_DATEI));
  if (!DRY && !hatZugang) { console.log('Kein Pinterest-Zugang (ABAN_PINTEREST_*) — nichts gesendet. Anleitung: automation/pinterest_aban/LIESMICH.md'); return; }
  if (!DRY && (ledger.pins || []).filter((p) => p.datum === heute && !String(p.id).startsWith('dry')).length >= N) { console.log(`Heute (${heute}) schon ${N} Pins — fertig.`); return; }
  let boardIds = {};
  if (!DRY) { await tokenHolen(); boardIds = await boards(); await lernen(ledger, heute); }
  fs.mkdirSync(OUT, { recursive: true });
  const themen = waehle(POOL.themen, ledger, N, heute);
  const basis = (ledger.pins || []).length; // vor der Schleife: der Ledger wächst darin
  for (const [i, thema] of themen.entries()) {
    const idx = basis + i;
    const t = await text(thema, idx);
    let layout = naechstesLayout(ledger, thema.slug, !!process.env.GEMINI_API_KEY), foto = null;
    if (layout === 'foto') { try { foto = await geminiFoto(thema); } catch (e) { console.log(`  Foto: ${e.message} → Layout „frage“`); layout = 'frage'; } }
    const bild = await render(pinHtml(thema, t, layout, foto), path.join(OUT, `${heute}-${thema.slug}-${layout}.png`));
    const link = mitUtm(thema.url, thema.slug, layout);
    console.log(`• ${thema.slug} [${layout}, Text: ${t.quelle}] „${t.titel}“`);
    let id = `dry-${heute}-${i}`;
    if (!DRY) {
      const body = { board_id: boardIds[thema.board], title: t.titel, description: t.beschreibung, alt_text: t.alt, link,
        media_source: { source_type: 'image_base64', content_type: 'image/png', data: bild.toString('base64') } };
      if (foto) body.ai_disclosures = { values: ['AI_MODIFIED'] };
      id = (await pin('POST', '/pins', body)).id;
      console.log(`  ✓ Pin ${id}`);
    }
    if (!DRY) (ledger.pins ||= []).push({ id, slug: thema.slug, layout, quelle: t.quelle, datum: heute, titel: t.titel });
  }
  if (!DRY && !SANDBOX) fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n'); // Sandbox-Pins sind nicht öffentlich → nicht ins Ledger
  else console.log(`Probelauf: ${themen.length} Pin-Bilder in ${OUT}, nichts gesendet.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('✖', e.message); process.exit(1); });
