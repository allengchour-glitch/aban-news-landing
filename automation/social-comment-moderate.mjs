#!/usr/bin/env node
/**
 * LuxeStyle — social-comment-moderate.mjs
 * ---------------------------------------
 * Blendet SPAM-Kommentare (Solicitation: „grow your page / DM me / cheap followers /
 * Marketing-Agentur / Geld verdienen / Krypto / Links") auf den letzten FB-Page- und
 * Instagram-Posts automatisch AUS (hide, reversibel — NICHT löschen). Echte Kundenfragen
 * (Versand, Grösse, Preis, Verfügbarkeit, Komplimente) bleiben unangetastet.
 *
 * No-op (Exit 0) ohne Tokens. DRY_RUN=1 zeigt nur, was es täte.
 *
 * ENV (nur aus GitHub-Secrets):
 *   META_GRAPH_VERSION (Default v21.0)
 *   FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN)   → Facebook-Seite
 *   IG_USER_ID + IG_ACCESS_TOKEN     (oder META_ACCESS_TOKEN)    → Instagram Business
 *   LOOKBACK_POSTS (Default 12) · DRY_RUN · TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (optional Digest)
 *
 * Nötige Scopes: pages_read_engagement + pages_manage_engagement (FB),
 *                instagram_manage_comments (IG). Fehlen sie → Skript meldet es und macht No-op.
 */
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const FB_ID = process.env.FB_PAGE_ID || '';
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const LOOKBACK = Math.max(1, parseInt(process.env.LOOKBACK_POSTS || '12', 10) || 12);
const DRY = process.env.DRY_RUN === '1';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

// --- Spam-Klassifikation (regelbasiert, deterministisch) ---
// Solicitation / Scam / Wachstums-Angebote / Geld → ausblenden.
const SPAM = [
  /\bdm\b|\bdms\b|message me|inbox me|\bpm me\b|hit me up|text me/i,
  /grow (your|ur) (page|account|business|brand|followers)|account grow|page grow/i,
  /followers?|follower\b|engagement|likes? boost|boost (your|ur)|promote (your|ur)|promotion/i,
  /social ?media (manager|marketing|expert|management)|digital marketer|i('?m| am) a marketer|marketing agency|\bagency\b/i,
  /increase (your )?(sales|revenue|customers|reach)|more (customers|clients|sales)|drive sales|get clients/i,
  /make money|earn (money|cash|\$)|passive income|\bprofit\b|\binvest(ment|or)?\b|trading|forex|crypto|bitcoin|btc|usdt|binary option/i,
  /cheap|affordable price|best price for (followers|likes)|buy (followers|likes)/i,
  /whats ?app|wa\.me|t\.me|telegram|join my|click (the )?link|link in bio.*(dm|earn)/i,
  /check (out )?my (profile|page|bio)|follow me|follow back|f4f|l4l|sub4sub/i,
  /congratulations.*(won|winner|selected)|you('?ve| have) been selected|claim (your )?prize|free gift card/i,
  /\+\d[\d\s().-]{7,}/,                              // Telefonnummern
  /https?:\/\/(?!(?:[a-z0-9-]+\.)*luxestyle\.ch)/i,  // Links ausser luxestyle.ch
  /\bwww\.(?!luxestyle)/i,
];
// Echte Kundenfragen / Komplimente → NIE ausblenden (Schutz vor Fehlmoderation).
const GENUINE = [
  /versand|liefer|wann kommt|geliefert|sendung|paket/i,
  /grösse|groesse|size|passt|fällt (gross|klein)|masse|cm\b|s\/m\/l|welche grösse/i,
  /preis|kostet|chf|rabatt|code|gutschein|zahlung|twint|bezahl/i,
  /verfügbar|auf lager|lieferbar|ausverkauft|wieder da|restock/i,
  /bestell|gekauft|order|warenkorb|checkout/i,
  /schön|schoen|wow|love|liebe|traumhaft|hübsch|huebsch|toll|nice|gefällt|gefaellt|😍|🤍|❤️|😻/i,
];

function isSpam(text='') {
  const t = (text || '').trim();
  if (!t) return false;
  if (GENUINE.some(r => r.test(t))) return false;   // echte Frage → behalten
  return SPAM.some(r => r.test(t));
}

async function gget(url){ const r = await fetch(url); const j = await r.json().catch(()=>({})); return {ok:r.ok, status:r.status, j}; }
async function gpost(url, body){ const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j = await r.json().catch(()=>({})); return {ok:r.ok, status:r.status, j}; }

const hidden = []; const errors = [];

// ---- Facebook ----
async function moderateFB(){
  if(!FB_ID || !FB_TOK) return;
  const posts = await gget(`https://graph.facebook.com/${V}/${FB_ID}/posts?fields=id&limit=${LOOKBACK}&access_token=${encodeURIComponent(FB_TOK)}`);
  if(!posts.ok){ errors.push(`FB posts: ${posts.status} ${JSON.stringify(posts.j.error||posts.j).slice(0,160)}`); return; }
  for(const p of posts.j.data || []){
    const cs = await gget(`https://graph.facebook.com/${V}/${p.id}/comments?fields=id,message,from,is_hidden&limit=100&access_token=${encodeURIComponent(FB_TOK)}`);
    if(!cs.ok) continue;
    for(const c of cs.j.data || []){
      if(c.is_hidden) continue;
      if(!isSpam(c.message)) continue;
      if(DRY){ hidden.push(`[FB][DRY] ${(c.message||'').slice(0,60)}`); continue; }
      const h = await gpost(`https://graph.facebook.com/${V}/${c.id}?access_token=${encodeURIComponent(FB_TOK)}`, {is_hidden:true});
      if(h.ok) hidden.push(`[FB] ${(c.message||'').slice(0,60)}`);
      else errors.push(`FB hide ${c.id}: ${h.status} ${JSON.stringify(h.j.error||h.j).slice(0,120)}`);
    }
  }
}

// ---- Instagram ----
async function moderateIG(){
  if(!IG_ID || !IG_TOK) return;
  const media = await gget(`https://graph.facebook.com/${V}/${IG_ID}/media?fields=id&limit=${LOOKBACK}&access_token=${encodeURIComponent(IG_TOK)}`);
  if(!media.ok){ errors.push(`IG media: ${media.status} ${JSON.stringify(media.j.error||media.j).slice(0,160)}`); return; }
  for(const m of media.j.data || []){
    const cs = await gget(`https://graph.facebook.com/${V}/${m.id}/comments?fields=id,text,username,hidden&limit=100&access_token=${encodeURIComponent(IG_TOK)}`);
    if(!cs.ok) continue;
    for(const c of cs.j.data || []){
      if(c.hidden) continue;
      if(!isSpam(c.text)) continue;
      if(DRY){ hidden.push(`[IG][DRY] ${(c.text||'').slice(0,60)}`); continue; }
      const h = await gpost(`https://graph.facebook.com/${V}/${c.id}?access_token=${encodeURIComponent(IG_TOK)}`, {hide:true});
      if(h.ok) hidden.push(`[IG] ${(c.text||'').slice(0,60)}`);
      else errors.push(`IG hide ${c.id}: ${h.status} ${JSON.stringify(h.j.error||h.j).slice(0,120)}`);
    }
  }
}

async function telegram(text){
  if(!TG_TOKEN || !TG_CHAT) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {method:'POST',
    body: new URLSearchParams({chat_id:TG_CHAT, text, disable_web_page_preview:'true'})}).catch(()=>{});
}

(async () => {
  if(!FB_TOK && !IG_TOK){ console.log('Keine Meta-Tokens → No-op. (FB_PAGE_ACCESS_TOKEN / IG_ACCESS_TOKEN als Secret setzen.)'); process.exit(0); }
  try { await moderateFB(); } catch(e){ errors.push('FB: '+e.message); }
  try { await moderateIG(); } catch(e){ errors.push('IG: '+e.message); }
  console.log(`Spam ${DRY?'(DRY) ':''}ausgeblendet: ${hidden.length}`);
  hidden.forEach(h => console.log('  ·', h));
  if(errors.length){
    console.log('Hinweise/Fehler:'); errors.forEach(e => console.log('  !', e));
    if(errors.some(e=>/permission|scope|OAuth|#10|#200|#3/i.test(e)))
      console.log('→ Token braucht Scopes: pages_read_engagement + pages_manage_engagement (FB), instagram_manage_comments (IG).');
  }
  if(hidden.length || errors.length)
    await telegram(`🧹 Spam-Moderation: ${hidden.length} ausgeblendet${errors.length?` · ${errors.length} Hinweise`:''}`);
  process.exit(0);
})();
