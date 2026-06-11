#!/usr/bin/env node
/**
 * threads-text-post.mjs — 1 text-nativer Threads-Post pro Lauf.
 * ------------------------------------------------------------
 * Warum: Der Threads-Account ist neu (0 Follower) und wurde durch 4×/Tag Produkt-/Link-Posts
 * als Spam ge-action-blockt. Heilung = WENIGER + GESPRÄCHIGER. Diese Routine postet 1×/Tag
 * einen kurzen, FRAGE-getriebenen Text-Post OHNE externen Link (Threads bestraft Link-Spam und
 * belohnt Antworten). Ziel: Reichweite über Kommentare → echte Follower, statt Werbung.
 *
 * KEINE Links, KEINE Hashtag-Wände, KEINE Produkt-Pitches. Reine Community-Fragen, Marke dezent.
 * Rotiert deterministisch über den Pool via State-Datei (kein Doppelpost). No-op ohne Token.
 *
 * ENV (nur GitHub-Secrets): THREADS_USER_ID + THREADS_ACCESS_TOKEN · DRY_RUN=1 (nur zeigen).
 */
import fs from 'node:fs';
import path from 'node:path';

const TOK = process.env.THREADS_ACCESS_TOKEN || '';
const SET_ID = process.env.THREADS_USER_ID || '';
const DRY = process.env.DRY_RUN === '1';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const STATE = path.join(ROOT, 'social', 'threads-text-state.json');

// Gesprächs-Pool: kurze Fragen, die zum Antworten einladen. Marke nur dezent (CH/Mode-Kontext),
// NIE mit Link/Code zugespamt. Reihenfolge = Rotationsindex.
const POOL = [
  'Ehrliche Frage 🤍 Sommerkleid: lieber in Schwarz oder in Beige? Wir können uns nie entscheiden 👇',
  'Team Goldschmuck oder Team Silber? ⚜️🤍 Sagt mal an 👇',
  'Welches 1 Teil funktioniert in JEDEM eurer Outfits? 🤍 Bin gespannt 👇',
  'Crossbody-Tasche oder Tote-Bag für den Alltag? 👜 Begründung in die Kommentare 😄',
  'Unpopuläre Meinung: Qualität schlägt Logo. Seht ihr das auch so? 🇨🇭',
  'Leinen oder Satin — was gewinnt euren Sommer? ☀️',
  'Blazer auch bei 28 Grad: ja oder nein? 💼 Seid ehrlich 👇',
  'Morgens 5 Minuten oder 30 Minuten fürs Styling? ⏱️😅',
  'Welche Farbe fehlt euch noch im Kleiderschrank? 🎨 Sammeln wir Ideen 👇',
  'Sneaker oder Sandalen für den Stadt-Sommer? 👟👡',
  'Was war euer bestes Mode-Schnäppchen — und wie viel habt ihr gespart? 💸',
  'Minimalistisch oder Statement: wie tragt ihr Schmuck am liebsten? ✨',
];

function loadIdx(){ try{ return JSON.parse(fs.readFileSync(STATE,'utf8')).idx|0; }catch{ return 0; } }
function saveIdx(i){ try{ fs.mkdirSync(path.dirname(STATE),{recursive:true}); fs.writeFileSync(STATE, JSON.stringify({idx:i, ts:new Date().toISOString()})); }catch(e){ console.error('State:', e.message); } }

const gpost = async (u,b)=>{ const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; };
const gget  = async u =>{ const r=await fetch(u); const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; };

(async () => {
  const idx = loadIdx() % POOL.length;
  const text = POOL[idx];

  if(!TOK){ console.log('Kein THREADS_ACCESS_TOKEN → No-op.'); process.exit(0); }
  if(DRY){ console.log(`DRY: würde posten [#${idx}] → "${text}"`); saveIdx((idx+1)%POOL.length); process.exit(0); }

  // User-ID robust via /me auflösen (Fallback: gesetzte ID)
  let uid = SET_ID;
  const me = await gget(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(TOK)}`);
  if(me.ok && me.j.id){ uid = me.j.id; } else if(!uid){ console.error('Threads /me:', me.status, JSON.stringify(me.j.error||me.j)); process.exit(0); }

  const base = `https://graph.threads.net/v1.0/${uid}`;
  const c = await gpost(`${base}/threads`, { media_type:'TEXT', text, access_token:TOK });
  if(!c.ok || !c.j.id){ console.error('Threads container:', c.status, JSON.stringify(c.j.error||c.j)); process.exit(0); }
  await new Promise(s=>setTimeout(s, 3000));
  const p = await gpost(`${base}/threads_publish`, { creation_id:c.j.id, access_token:TOK });
  if(p.ok && p.j.id){ console.log(`✅ Threads-Text gepostet [#${idx}] id=${p.j.id}`); saveIdx((idx+1)%POOL.length); }
  else console.error('Threads publish:', p.status, JSON.stringify(p.j.error||p.j));
})();
