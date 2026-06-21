#!/usr/bin/env node
/**
 * LuxeStyle — social-comment-reply.mjs
 * ------------------------------------
 * Antwortet automatisch auf ECHTE Kommentare (Komplimente + Kundenfragen) auf den letzten
 * Instagram- und Facebook-Posts — herzlich, markengerecht, mit dezentem CTA. Spam wird
 * übersprungen (gleiche Klassifikation wie die Moderation), ebenso schon beantwortete
 * Kommentare (State-Datei social/replied-comments.json). Variantenreiche Antworten + Tempo-
 * Limit gegen Spam-Optik. NIE doppelt, NIE auf Spam.
 *
 * No-op (Exit 0) ohne Tokens. DRY_RUN=1 zeigt nur, was es täte (ohne zu posten).
 *
 * ENV (nur GitHub-Secrets):
 *   META_GRAPH_VERSION (Default v21.0)
 *   FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN)
 *   IG_USER_ID + IG_ACCESS_TOKEN     (oder META_ACCESS_TOKEN)
 *   LOOKBACK_POSTS (Default 8) · MAX_REPLIES (Default 12 pro Lauf) · DRY_RUN
 * Scopes: instagram_manage_comments (IG), pages_manage_engagement (FB).
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const V = process.env.META_GRAPH_VERSION || 'v21.0';
const FB_ID = process.env.FB_PAGE_ID || '';
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const LOOKBACK = Math.max(1, parseInt(process.env.LOOKBACK_POSTS || '8', 10) || 8);
const MAXR = Math.max(1, parseInt(process.env.MAX_REPLIES || '12', 10) || 12);
const DRY = process.env.DRY_RUN === '1';

const ROOT = path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url))));
const STATE = path.join(ROOT, 'social', 'replied-comments.json');

// --- Spam (überspringen) — Kurzfassung der Moderations-Regeln ---
const SPAM = [
  /\bdm\b|\bdms\b|message me|inbox me|\bpm me\b/i,
  /grow (your|ur) (page|account|followers)|followers?|engagement|likes? boost|promote (your|ur)/i,
  /marketing (agency|manager|expert)|\bagency\b|make money|earn (money|cash|\$)|crypto|bitcoin|forex|trading/i,
  /follow me|follow back|f4f|l4l|sub4sub|check (out )?my (profile|page|bio)/i,
  /\+\d[\d\s().-]{7,}/, /https?:\/\/(?!(?:[a-z0-9-]+\.)*luxestyle\.ch)/i, /\bwww\.(?!luxestyle)/i,
  /whats ?app|wa\.me|t\.me|telegram|claim (your )?prize|free gift card/i,
];
const isSpam = (t='') => { t=t.trim(); return !t || SPAM.some(re=>re.test(t)); };

// --- Themen-Erkennung für passende Antwort ---
const TOPIC = [
  ['versand', /versand|liefer|wann kommt|geliefert|sendung|paket|shipping|delivery/i],
  ['groesse', /grösse|groesse|size|passt|fällt (gross|klein)|masse|welche grösse/i],
  ['preis',   /preis|kostet|chf|rabatt|code|gutschein|zahlung|twint|bezahl|price|discount/i],
  ['verfueg', /verfügbar|auf lager|lieferbar|ausverkauft|wieder da|restock|available|in stock/i],
  ['kompliment', /schön|schoen|wow|love|liebe|traumhaft|hübsch|huebsch|toll|nice|gefällt|gefaellt|cute|beautiful|😍|🤍|❤️|😻|🔥|👏/i],
];
function topicOf(t='') { for (const [name,re] of TOPIC) if (re.test(t)) return name; return 'allgemein'; }

// --- Antwort-Varianten (herzlich, Du-Form, dezenter CTA) ---
const REPLIES = {
  versand: [
    'Hey! 🤍 Wir liefern in die ganze Schweiz – Gratis-Versand ab CHF 65. Alle Infos auf luxestyle.ch ✨',
    'Hi! 📦 Schweizweiter Versand, gratis ab CHF 65. Mehr dazu auf luxestyle.ch 🇨🇭',
  ],
  groesse: [
    'Hi! 👗 Die Grössentabelle findest du direkt beim Produkt auf luxestyle.ch – frag sonst gern nach! 🤍',
    'Hey! ✨ Alle Masse stehen beim Artikel auf luxestyle.ch. Wir helfen dir gern weiter 🥰',
  ],
  preis: [
    'Hey! 💛 Mit Code WELCOME10 bekommst du –10% auf luxestyle.ch ✨',
    'Hi! 🤍 Schau auf luxestyle.ch – mit WELCOME10 gibt’s –10% 🛍️',
  ],
  verfueg: [
    'Hi! 🤍 Verfügbarkeit + alle Varianten siehst du live auf luxestyle.ch ✨',
    'Hey! ✨ Aktueller Bestand & Farben direkt auf luxestyle.ch 🛍️',
  ],
  kompliment: [
    'Ganz lieben Dank! 🤍 Schön, dass es dir gefällt – schau gern auf luxestyle.ch vorbei ✨',
    'Vielen Dank! 😍 Mit Code WELCOME10 gibt’s –10% auf luxestyle.ch 🇨🇭',
    'Das freut uns riesig! 🤍 Mehr Looks findest du auf luxestyle.ch ✨',
    'Danke dir! 🥰 Wir freuen uns sehr über dich 🤍',
  ],
  allgemein: [
    'Danke für deinen Kommentar! 🤍 Schau gern auf luxestyle.ch vorbei ✨',
    'Hey, danke dir! 😊 Mehr auf luxestyle.ch – mit WELCOME10 –10% 🛍️',
  ],
};
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function replyFor(text){ return pick(REPLIES[topicOf(text)] || REPLIES.allgemein); }

async function gget(url){ const r=await fetch(url); const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; }
async function gpost(url, body){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; }

function loadState(){ try{ return new Set(JSON.parse(fs.readFileSync(STATE,'utf8'))); }catch{ return new Set(); } }
function saveState(set){ try{ fs.mkdirSync(path.dirname(STATE),{recursive:true}); fs.writeFileSync(STATE, JSON.stringify([...set].slice(-2000),null,0)); }catch(e){ console.error('State speichern:', e.message); } }

let done = 0;
const replied = loadState();

async function handle(platform, comments, replyUrl){
  for (const c of comments){
    if (done >= MAXR) return;
    const id = c.id; const text = c.text || c.message || '';
    if (replied.has(id)) continue;
    if (c.hidden || c.is_hidden) continue;
    if (isSpam(text)) continue;
    const msg = replyFor(text);
    if (DRY){ console.log(`DRY ${platform} ← "${text.slice(0,40)}" ⇒ "${msg}"`); replied.add(id); done++; continue; }
    const r = await gpost(replyUrl(id), { message: msg });
    if (r.ok){ console.log(`✓ ${platform} antwortete auf ${id}`); replied.add(id); done++; }
    else console.error(`✗ ${platform} ${id}:`, r.status, JSON.stringify(r.j.error||r.j).slice(0,160));
    await new Promise(s=>setTimeout(s, 1500)); // Tempo-Limit
  }
}

async function ig(){
  if(!IG_ID || !IG_TOK) return;
  const media = await gget(`https://graph.facebook.com/${V}/${IG_ID}/media?fields=id&limit=${LOOKBACK}&access_token=${encodeURIComponent(IG_TOK)}`);
  for (const m of media.j.data || []){
    if (done>=MAXR) break;
    const cs = await gget(`https://graph.facebook.com/${V}/${m.id}/comments?fields=id,text,hidden&limit=50&access_token=${encodeURIComponent(IG_TOK)}`);
    await handle('IG', cs.j.data || [], id => `https://graph.facebook.com/${V}/${id}/replies?access_token=${encodeURIComponent(IG_TOK)}`);
  }
}
async function fb(){
  if(!FB_ID) return;
  let tok=''; for(const t of [...new Set([FB_TOK, process.env.META_ACCESS_TOKEN].filter(Boolean))]){
    const chk = await gget(`https://graph.facebook.com/${V}/${FB_ID}?fields=id&access_token=${encodeURIComponent(t)}`);
    if(chk.ok){ tok=t; break; } }
  if(!tok){ console.error('FB: kein gültiges Page-Token.'); return; }
  const posts = await gget(`https://graph.facebook.com/${V}/${FB_ID}/feed?fields=id&limit=${LOOKBACK}&access_token=${encodeURIComponent(tok)}`);
  for (const p of posts.j.data || []){
    if (done>=MAXR) break;
    const cs = await gget(`https://graph.facebook.com/${V}/${p.id}/comments?fields=id,message,is_hidden&limit=50&access_token=${encodeURIComponent(tok)}`);
    await handle('FB', cs.j.data || [], id => `https://graph.facebook.com/${V}/${id}/comments?access_token=${encodeURIComponent(tok)}`);
  }
}

(async () => {
  if(!FB_TOK && !IG_TOK){ console.log('Keine Meta-Tokens → No-op.'); process.exit(0); }
  try{ await ig(); }catch(e){ console.error('IG-Fehler:', e.message); }
  try{ await fb(); }catch(e){ console.error('FB-Fehler:', e.message); }
  if(!DRY) saveState(replied);
  console.log(`Fertig: ${done} Antwort(en)${DRY?' (DRY)':''}.`);
})();
