#!/usr/bin/env node
/* LuxeStyle — social-autopost-meta.mjs  (PERSISTENTER Meta-Autopilot, committet damit er BLEIBT)
 *
 * Postet den nächsten fälligen BILD-Post (status=ready) aus social/posts_image.csv direkt per
 * Meta-Graph-API an Instagram + Facebook-Page + Threads. KEIN Drittanbieter (kein Buffer/Make).
 * Container→Publish-Flow für IG & Threads; Foto-Endpoint für die FB-Page.
 *
 * ⚠️ JPG-PFLICHT: IG/Threads verlangen eine ÖFFENTLICHE Bild-URL; .webp wird abgelehnt → nur .jpg/.jpeg.
 * ⚠️ THROTTLE: max MAX_PER_RUN Posts pro Lauf (Default 1) → Spam-/Rate-Limit-Schutz.
 * No-op (Exit 0), wenn keine Plattform-Secrets gesetzt sind oder keine Zeile 'ready' ist.
 *
 * Tokens kommen NUR aus GitHub-Actions-Secrets / ENV — NIE im Code. ENV:
 *   META_GRAPH_VERSION   (optional, Default v21.0)
 *   IG_USER_ID           + IG_ACCESS_TOKEN  (oder META_ACCESS_TOKEN)   → Instagram Business
 *   FB_PAGE_ID           + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN) → Facebook-Seite
 *   THREADS_USER_ID      + THREADS_ACCESS_TOKEN                          → Threads (ID wird notfalls via /me aufgelöst)
 *   MAX_PER_RUN=1        (optional Throttle)
 *   DRY_RUN=1            (optional: nur loggen, nichts senden/schreiben)
 *
 * Der EINE Schritt für Dauerbetrieb: THREADS_ACCESS_TOKEN (+ IG/FB) als Repo-Secret → Cron postet 2×/Tag.
 */
import { mitFolgen } from './lib/fb_text.mjs';
import fs from 'node:fs';
import { execFileSync as _exf } from 'node:child_process';
import { markierungFehlt,
         lock as postLock, seen as postSeen, mark as postMark,
         produktGepostet, produktMerken, produktKey, fbSeitenIdentitaet, familieKuerzlich, familieMerken, nachVorrang, juryPruefen, igUserTags } from './post_guard.mjs';

const CSV = new URL('../social/posts_image.csv', import.meta.url).pathname;
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const DRY = process.env.DRY_RUN === '1';
const MAX = Math.max(1, parseInt(process.env.MAX_PER_RUN || '1', 10) || 1);

const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const FB_ID = process.env.FB_PAGE_ID || '';
const FB_TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const TH_ID = process.env.THREADS_USER_ID || '';
const TH_TOK = process.env.THREADS_ACCESS_TOKEN || '';
// Threads-Drossel: bei SKIP_THREADS=1 werden Bild-/Video-Posts NICHT auf Threads gespiegelt.
// Grund: ein neuer 0-Follower-Account wird bei 4×/Tag Produkt-Posts als Spam ge-action-blockt.
// Threads bekommt stattdessen 1 gesprächigen Text-Post/Tag (automation/threads-text-post.mjs).
const SKIP_THREADS = process.env.SKIP_THREADS === '1';

// 27.09.2026 (Betreiber: «meta brauch nicht habe ja metricool»): der Meta-Datenzugang endet am 05.10. und wird NICHT
// erneuert. Ohne Meta-Token (oder mit WEG=metricool) plant dieser Poster denselben Bildpost ueber Metricool auf
// Instagram und Facebook — zwei Planungen, damit Facebook seinen klickbaren Produktlink behaelt. Alle Wachen
// (Lock, Ledger, Produkt-/Familien-Sperre, kaufbar, Bildtext) bleiben dieselben; getestet 27.09. mit Entwurf + Loeschen.
function mcTokenLesen(){
  if (process.env.METRICOOL_USER_TOKEN) return process.env.METRICOOL_USER_TOKEN;
  try { const m = /METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(fs.readFileSync('/tmp/metricool.env','utf8')); if (m) return m[1]; } catch {}
  return '';
}
const MC_TOKEN = mcTokenLesen();
const MC_USER = process.env.METRICOOL_USER_ID || '4801419';
const MC_BLOG = process.env.METRICOOL_BLOG_ID || '6227837';
const VIA_MC = !!MC_TOKEN && (process.env.WEG === 'metricool' || (!IG_TOK && !FB_TOK));
async function mcPlan(imageUrl, text, netz){
  const q = `userId=${MC_USER}&blogId=${MC_BLOG}`;
  const n = await fetch(`https://app.metricool.com/api/actions/normalize/image/url?url=${encodeURIComponent(imageUrl)}&${q}`, { headers:{ 'X-Mc-Auth':MC_TOKEN } });
  const nt = await n.text();
  let norm = ''; try { const j = JSON.parse(nt); norm = j.data?.url || j.url || (typeof j.data==='string' ? j.data : '') || (typeof j==='string' ? j : ''); } catch { norm = nt.trim().replace(/^"|"$/g,''); }
  if(!n.ok || !norm){ console.error(`Metricool normalize (${netz}):`, n.status, nt.slice(0,160)); return false; }
  const body = { publicationDate:{ dateTime:new Date(Date.now()+4*60e3).toISOString().slice(0,19), timezone:'UTC' }, text,
                 providers:[{ network:netz }], media:[norm], autoPublish:true, draft:false, shortener:false };
  if(netz==='instagram') body.instagramData = { autoPublish:true, type:'POST' };
  if(netz==='facebook') body.facebookData = { type:'POST' };
  const r = await fetch(`https://app.metricool.com/api/v2/scheduler/posts?${q}`, { method:'POST', headers:{ 'X-Mc-Auth':MC_TOKEN, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  const rt = await r.text();
  if(!r.ok){ console.error(`Metricool plan (${netz}):`, r.status, rt.slice(0,200)); return false; }
  let id=''; try { const j = JSON.parse(rt); id = String(j.data?.id || j.id || ''); } catch {}
  console.log(`${netz}: ueber Metricool geplant`, id); return `metricool:${id||'?'}`;
}

const COLS = ['id','scheduled_date','image_url','caption','platforms','status','posted_at','post_url'];

// --- minimal CSV (RFC-4180-ish, identisch zu post-next-reel.mjs) ---
function parse(text){
  const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; } else field+=c; }
    else { if(c==='"')q=true; else if(c===','){row.push(field);field='';}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(c==='\r'){} else field+=c; } }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.length>1||(r.length===1&&r[0]!==''));
}
function esc(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function serialize(rows){ return rows.map(r=>r.map(esc).join(',')).join('\n')+'\n'; }

function isJpg(u){ return /\.jpe?g($|\?)/i.test(u) || /^https:\/\/cdn\.shopify\.com\/.*[?&]format=p?jpg\b/i.test(u); }
function jpgVomCdn(u){ return /^https:\/\/cdn\.shopify\.com\//i.test(u) && !/\.jpe?g($|\?)/i.test(u) && !/[?&]format=/i.test(u) ? `${u}${u.includes('?') ? '&' : '?'}format=jpg` : u; }

// 23.09.2026 (Audit-Befund 18): Facebook hat keine Bio — «Link in Bio» zeigte dort ins Leere, waehrend ein Link im
// FB-Text direkt klickbar ist (facebook 131 Sitzungen/30 T, Absprungrate 1.0, 0 Warenkoerbe). Instagram behaelt seine
// Caption («Link in Bio», dort sind Links im Text nicht klickbar); Facebook bekommt die Produktseite (onlineStoreUrl
// aus Shopify, sonst die Startseite) mit UTM. Gleiche Funktion in ig_karussell_post.mjs und meta_reel_post.mjs.
const FB_UTM = 'utm_source=facebook&utm_medium=social&utm_campaign=autopilot';
function fbLink(shopUrl, inhalt){
  const basis = /^https:\/\/(www\.)?luxestyle\.ch\//i.test(shopUrl||'') ? shopUrl : 'https://luxestyle.ch/';
  return `${basis}${basis.includes('?')?'&':'?'}${FB_UTM}${inhalt?`&utm_content=${inhalt}`:''}`;
}
function fbText(caption, shopUrl, inhalt){
  const link = fbLink(shopUrl, inhalt);
  const BIO = /\s*[–—·|-]?\s*\(?\s*link\s+in\s+(?:der\s+)?bio\b(?:\s*\))?/gi;   // Leerzeichen danach bleiben (sonst klebt ein #Hashtag an der URL)
  const DOM = /(?<![@#\w.\/-])(?:https?:\/\/)?(?:www\.)?luxestyle\.ch(?:\/[^\s)]*)?/i;
  const zeilen = String(caption||'').split('\n');
  let i = zeilen.findIndex(z => /link\s+in\s+(?:der\s+)?bio/i.test(z));
  if(i < 0) i = zeilen.findIndex(z => DOM.test(z) && !/^\s*#/.test(z));
  if(i < 0){                                   // keine Shop-Zeile: Link vor die Hashtags setzen
    const h = zeilen.findIndex(z => /^\s*#\S/.test(z));
    if(h < 0) zeilen.push(`👉 ${link}`); else zeilen.splice(h, 0, `👉 ${link}`, '');
    return zeilen.join('\n');
  }
  const z = zeilen[i].replace(BIO, '');
  zeilen[i] = (DOM.test(z) ? z.replace(DOM, link) : z.trim() ? `${z.trimEnd()} 👉 ${link}` : `👉 ${link}`).trimEnd();
  return zeilen.join('\n');
}
async function gpost(url, params){
  const body = new URLSearchParams(params);
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
  const j = await r.json().catch(()=>({}));
  return {ok:r.ok, status:r.status, j};
}

// --- Plattform-Poster (jeweils null, wenn keine Creds) -----------------------------
// Wartet, bis ein IG/Threads-Medien-Container fertig verarbeitet ist (status_code FINISHED).
// Behebt den häufigen 9007/2207027-Fehler "Media ID is not available — bitte warte noch einen Moment".
async function waitContainer(statusUrl){
  for(let i=0;i<12;i++){
    await new Promise(r=>setTimeout(r, i===0?1500:2500));
    const r = await fetch(statusUrl).catch(()=>null);
    const j = r ? await r.json().catch(()=>({})) : {};
    const s = j.status_code || j.status;
    if(s==='FINISHED') return true;
    if(s==='ERROR' || s==='EXPIRED'){ console.error('Container-Status:', s, JSON.stringify(j)); return false; }
  }
  return false; // Timeout → trotzdem 1 Publish-Versuch unten
}
async function postIG(imageUrl, caption){
  if(VIA_MC){ const f = markierungFehlt(imageUrl, caption); if(f){ console.error('⛔', f); return false; } return mcPlan(imageUrl, caption, 'instagram'); }
  if(!IG_ID || !IG_TOK) return null;
  // Einwilligungs-Bedingung der Kundin: ihr Material nur MIT Markierung (04.09.2026).
  const fehlt = markierungFehlt(imageUrl, caption);
  if (fehlt) { console.error('⛔', fehlt); return false; }
  const base = `https://graph.facebook.com/${V}/${IG_ID}`;
  const c = await gpost(`${base}/media`, { image_url: imageUrl, caption, access_token: IG_TOK, ...igUserTags([imageUrl], 'bild') });   // 30.09.: Tati markieren
  if(!c.ok || !c.j.id){ console.error('IG container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  await waitContainer(`https://graph.facebook.com/${V}/${c.j.id}?fields=status_code&access_token=${encodeURIComponent(IG_TOK)}`);
  const p = await gpost(`${base}/media_publish`, { creation_id:c.j.id, access_token:IG_TOK });
  if(!p.ok || !p.j.id){ console.error('IG publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('IG: gepostet', p.j.id); return p.j.id;
}
async function postFB(imageUrl, caption){
  if(VIA_MC) return mcPlan(imageUrl, caption, 'facebook');
  if(!FB_ID || !FB_TOK) return null;
  // Page-Access-Token auto-holen: User-Token → /me/accounts → Page-Token mit pages_manage_posts.
  // Nötig weil ein normaler User-Token aus dem Graph-API-Explorer "publish_actions" triggert (deprecated).
  let tok = FB_TOK;
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(FB_TOK)}`);
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){
      const pg = aj.data.find(p => p.id === FB_ID);
      if(pg?.access_token){ tok = pg.access_token; console.log('FB: Page-Token via /me/accounts geholt.'); }
      else console.log('FB: Seite', FB_ID, 'nicht in /me/accounts gefunden — nutze Original-Token.');
    }
  }catch(e){ /* Netzfehler → Fallback auf Original-Token */ }
  const ident = await fbSeitenIdentitaet(tok, FB_ID);
  if(!ident.ok){ console.error('⛔ FB-Seitenwache:', ident.grund); return false; }
  const r = await gpost(`https://graph.facebook.com/${V}/${FB_ID}/photos`,
    { url: imageUrl, message: caption, access_token: tok });
  if(!r.ok || !(r.j.id||r.j.post_id)){
    console.error('FB photo:', r.status, JSON.stringify(r.j.error||r.j));
    if(r.status===403) console.error('FB-Tipp: Token braucht Scope "pages_manage_posts" + Admin-Rolle auf Seite', FB_ID, '— im Graph-API-Explorer neu generieren mit pages_manage_posts + pages_read_engagement.');
    return false;
  }
  console.log('FB: gepostet', r.j.post_id||r.j.id); return r.j.post_id||r.j.id;
}
async function postThreads(imageUrl, caption){
  if(!TH_TOK) return null;
  // Threads-User-ID robust aus dem Token auflösen (/me) — vermeidet die häufige Falle einer
  // falsch eingetragenen THREADS_USER_ID (Graph-Fehler 100/Subcode 33). Fallback: gesetzte ID.
  let uid = TH_ID;
  try{
    const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(TH_TOK)}`);
    const mj = await me.json().catch(()=>({}));
    if(me.ok && mj.id){ uid = mj.id; if(mj.id!==TH_ID) console.log('Threads: User-ID via /me aufgelöst →', mj.id); }
    else if(!uid) console.error('Threads /me:', me.status, JSON.stringify(mj.error||mj));
  }catch(e){ /* Netzfehler → mit gesetzter ID weiter */ }
  if(!uid){ console.error('Threads: keine User-ID (weder via /me noch THREADS_USER_ID).'); return false; }
  const base = `https://graph.threads.net/v1.0/${uid}`;
  const c = await gpost(`${base}/threads`, { media_type:'IMAGE', image_url:imageUrl, text:caption, access_token:TH_TOK });
  if(!c.ok || !c.j.id){ console.error('Threads container:', c.status, JSON.stringify(c.j.error||c.j)); return false; }
  await waitContainer(`https://graph.threads.net/v1.0/${c.j.id}?fields=status&access_token=${encodeURIComponent(TH_TOK)}`);
  const p = await gpost(`${base}/threads_publish`, { creation_id:c.j.id, access_token:TH_TOK });
  if(!p.ok || !p.j.id){ console.error('Threads publish:', p.status, JSON.stringify(p.j.error||p.j)); return false; }
  console.log('Threads: gepostet', p.j.id); return p.j.id;
}

// --- Hauptlauf ---------------------------------------------------------------------
const configured = VIA_MC ? ['IG (Metricool)','FB (Metricool)'] : [IG_ID&&IG_TOK&&'IG', FB_ID&&FB_TOK&&'FB', TH_TOK&&'Threads'].filter(Boolean);
if(configured.length===0 && !DRY){
  console.log('Kein Meta-Kanal konfiguriert (IG/FB/Threads Secrets fehlen) → No-op. Setze THREADS_ACCESS_TOKEN etc.');
  process.exit(0);
}
if(!fs.existsSync(CSV)){ console.log('Keine social/posts_image.csv vorhanden → nichts zu tun.'); process.exit(0); }

const rows = parse(fs.readFileSync(CSV,'utf8'));
const header = rows[0];
const idx = Object.fromEntries(COLS.map(c=>[c, header.indexOf(c)]));
const data = rows.slice(1);

const ready = nachVorrang(data.filter(r => (r[idx.status]||'').trim()==='ready' && (r[idx.image_url]||'').trim()), r => `/products/${(r[idx.id]||'').trim()} ${r[idx.caption]||''}`);   // 25.09. Saison-Vorrang (Herbst) zuerst — id = Handle (Bild-Captions tragen keinen Link)
if(ready.length===0){ console.log('Kein Bild mit status=ready — nichts zu tun.'); process.exit(0); }

console.log(`Konfigurierte Kanäle: ${configured.join('+')||'(keine, DRY)'} · ready: ${ready.length} · MAX_PER_RUN: ${MAX}`);
if(!DRY) postLock();                        // ⛔ gemeinsamer Lock mit allen Postern
let postedCount = 0, anyFail = false;

// ⛔ INHALTS-SPERRE: Caption-Signatur (norm. erste 45 Zeichen) — fängt Dubletten auch bei ANDERER Bild-URL
//    (gleiches Produkt, anderes Foto → «Ring-Set Eternità»-Doppelpost). Lokaler Ledger + Live-IG-Abgleich.
const capSig = s => (s||'').toLowerCase().replace(/[#@].*/s,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,45);
const postedCaps = new Set(data.filter(r=>/^posted/.test((r[idx.status]||'').trim())).map(r=>capSig(r[idx.caption]||'')).filter(Boolean));
async function igLiveHas(caption){
  const want=capSig(caption); if(!want||!IG_ID||!IG_TOK) return false;
  for(let a=0;a<3;a++){
    try{ const r=await fetch(`https://graph.facebook.com/${V}/${IG_ID}/media?fields=caption&limit=25&access_token=${encodeURIComponent(IG_TOK)}`);
      const j=await r.json();
      if(Array.isArray(j.data)){ return j.data.some(p=>capSig(p.caption)===want); }
    }catch{}
    await new Promise(x=>setTimeout(x,2000*(a+1)));
  }
  console.error('⚠️ IG-Live-Abgleich nicht erreichbar → nur lokale Wachen.'); return false;
}

// ok:true kaufbar · ok:false nicht kaufbar (DRAFT/ARCHIVED/ohne Onlineshop/geloescht) · ok:null nicht pruefbar
async function produktAktiv(zeilenId){
  const m = /(\d{12,})\s*$/.exec(String(zeilenId||'').trim());
  if(!m){
    // 27.09.2026: Saison-Zeilen (queue_new_products VORRANG_TAG) tragen «<handle>-<6 Ziffern>» statt der Produkt-ID → vorher
    // weder Kaufbar-Pruefung noch Produktlink (Facebook bekam die Startseite). Handle ueber die tokenlose Storefront API.
    const roh = String(zeilenId||'').trim();
    for(const h of [...new Set([roh, roh.replace(/-\d{1,8}$/,'')])]){       // Zeilen-ID = Handle (auch mit Ziffern-Endung)
      if(!/^[a-z0-9][a-z0-9-]{3,}$/.test(h) || /^(kimi|brand|marke)-/.test(h)) continue;
      for(let a=0;a<3;a++){
        try{
          const r = await fetch('https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json', { method:'POST', headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ query:`{ product(handle:"${h}"){ availableForSale onlineStoreUrl } }` }) });
          const d = await r.json();
          if(d && d.data){
            const p = d.data.product;
            if(!p) break;                                   // kein Produkt unter diesem Handle → naechste Fassung / Markenpost
            return { ok: !!p.availableForSale && !!p.onlineStoreUrl, grund:`Handle ${h}: ${p.availableForSale?'kaufbar':'nicht verfuegbar'}`, url: p.onlineStoreUrl||'' };
          }
        }catch{}
        await new Promise(x=>setTimeout(x, 2000*(a+1)));
      }
    }
    return { ok:true, grund:'keine Produkt-ID in der Zeile' };
  }
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  const tok = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt','utf8') : '')).trim();
  if(!tok){
    // 27.09.2026: ohne Shop-Token die tokenlose Storefront API (frisch vom Ursprung, gleiche Produkt-ID) statt «nicht pruefbar».
    for(let a=0;a<3;a++){
      try{
        const r = await fetch(`https://${shop}/api/2025-07/graphql.json`, { method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ query:`{ product(id:"gid://shopify/Product/${m[1]}"){ availableForSale onlineStoreUrl } }` }) });
        const d = await r.json();
        if(d && d.data){
          const p = d.data.product;
          if(!p) return { ok:null, grund:'Storefront API: nicht veroeffentlicht (ohne Token kein Urteil)' };
          return { ok: !!p.availableForSale && !!p.onlineStoreUrl, grund:`Storefront API ${p.availableForSale?'kaufbar':'nicht verfuegbar'} (ohne Token)`, url: p.onlineStoreUrl||'' };
        }
      }catch{}
      await new Promise(x=>setTimeout(x, 2000*(a+1)));
    }
    return { ok:null, grund:'kein Shop-Token, Storefront API nicht erreichbar' };
  }
  for(let a=0;a<3;a++){
    try{
      const r = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, { method:'POST', headers:{ 'X-Shopify-Access-Token':tok, 'Content-Type':'application/json' },
        body: JSON.stringify({ query:`{ product(id:"gid://shopify/Product/${m[1]}"){ status onlineStoreUrl } }` }) });
      const d = await r.json();
      if(d && d.data){
        const p = d.data.product;
        if(p === null) return { ok:false, grund:'Produkt existiert nicht mehr' };
        return { ok: p.status==='ACTIVE' && !!p.onlineStoreUrl, grund:`status ${p.status}, onlineStoreUrl ${p.onlineStoreUrl?'ja':'nein'}`, url: p.onlineStoreUrl||'' };
      }
    }catch{}
    await new Promise(x=>setTimeout(x, 2000*(a+1)));
  }
  return { ok:null, grund:'Shopify nicht erreichbar' };
}

// 28.09.2026: bis MAX_PER_RUN Posts, aber bis zu VERSUCHE Zeilen ansehen — mit der Gemini-Jury faellt ein Teil der Queue
// durch; vorher sah ein Lauf genau EINE Zeile an, jede Ablehnung kostete den ganzen 6-h-Takt (Exit 0 → Autopilot-Marke).
const VERSUCHE = parseInt(process.env.VERSUCHE || '12', 10);
for(const next of ready.slice(0, MAX + VERSUCHE)){
  if(postedCount >= MAX || anyFail) break;
  // 23.09.2026: PNG vom Shopify-CDN ist kein Grund zum Ueberspringen — `format=jpg` liefert echtes image/jpeg (gemessen).
  const imageUrl = jpgVomCdn(next[idx.image_url].trim());
  const caption = next[idx.caption] || '';
  if(!DRY && postSeen(imageUrl)){           // ⛔ Bild schon je gepostet → nie zweimal
    console.log(`   ⛔ Bild schon gepostet (gemeinsamer Ledger) → skip: ${imageUrl}`);
    next[idx.status] = 'posted-dup-skip'; fs.writeFileSync(CSV, serialize(rows)); continue;
  }
  const sig = capSig(caption);
  if(!DRY && sig && postedCaps.has(sig)){    // ⛔ gleiches Produkt/Caption schon gepostet (andere Bild-URL)
    console.log(`   ⛔ Caption schon gepostet (Inhalts-Sperre) → skip: ${sig}`);
    next[idx.status] = 'posted-dup-caption'; fs.writeFileSync(CSV, serialize(rows)); continue;
  }
  // ⛔ SIEBTE SCHICHT: dieselbe WARE, anderer Text (Betreiber-Screenshot 03.09.2026 — der
  // «Silber-Armreif Serpent» stand zweimal nebeneinander im Raster). Er steht dreimal in
  // dieser Queue, mit drei IDs, drei Bild-URLs und drei Texten; Bild-, Caption- und
  // Live-Sperre sagen alle zu Recht «kenne ich nicht». Keine fragte nach dem PRODUKT.
  if(!DRY && produktGepostet(caption, next[idx.id])){
    console.log(`   ⛔ Produkt schon gepostet (Produkt-Sperre) → skip: ${produktKey(caption, next[idx.id])}`);
    next[idx.status] = 'posted-dup-produkt'; fs.writeFileSync(CSV, serialize(rows)); continue;
  }
  // ⛔ NEUNTE SCHICHT (23.09.2026, «pinke steine 2mal?»): dieselbe Warengruppe innerhalb FAMILIEN_STUNDEN auf
  // irgendeinem Kanal → Zeile bleibt ready und wartet, die naechste Zeile kommt dran.
  const fk = DRY ? null : familieKuerzlich(caption);
  if(fk){ console.log(`   ⏸️ Warengruppe «${fk.familie}» vor ${fk.vorStunden} h gepostet → bleibt ready: ${next[idx.id]}`); continue; }
  if(!DRY && await igLiveHas(caption)){      // ⛔ auf IG bereits live (Wahrheit schlägt Ledger)
    console.log(`   ⛔ Auf IG bereits live (Live-Abgleich) → skip: ${sig}`);
    next[idx.status] = 'posted-dup-live'; postMark(imageUrl); fs.writeFileSync(CSV, serialize(rows)); continue;
  }
  if(!isJpg(imageUrl)){
    console.error(`⏭️  Übersprungen (keine JPG-URL, Meta-Pflicht): ${imageUrl}`);
    next[idx.status] = 'skipped-nonjpg'; if(!DRY) fs.writeFileSync(CSV, serialize(rows)); continue;   // gespeichert, sonst blockiert die Zeile jeden Lauf
  }
  // Optionale Kanal-Auswahl pro Zeile über die Spalte 'platforms' (leer = alle konfigurierten).
  // 23.09.2026 ACHTE SCHICHT — ist die WARE noch kaufbar? Gemessen: 3 von 73 «ready»-Zeilen (August-Queue)
  // bewarben Produkte, die Waechter seit dem Bau der Queue gedraftet hatten (kein onlineStoreUrl → Link = 404).
  // Reel- und Karussell-Poster fragen Shopify vor jedem Post; dieser Poster fragte nie. Zeilen-ID traegt die
  // Shopify-Produkt-ID am Ende (…-15408457941377); ohne ID (Markenposts) gilt: erlaubt.
  // Die Pruefung liest nur (auch im DRY): sie liefert zugleich die Produktseite fuer den Facebook-Text (Befund 18).
  const pa = await produktAktiv(next[idx.id]);
  if(pa.ok === false){
    console.log(`   ⛔ Produkt nicht kaufbar (${pa.grund}) → produkt-nicht-aktiv: ${next[idx.id]}`);
    if(!DRY){ next[idx.status] = 'produkt-nicht-aktiv'; fs.writeFileSync(CSV, serialize(rows)); }
    continue;
  }
  if(pa.ok === null){ console.log(`   ⚠️ Produkt nicht pruefbar (${pa.grund}) → Zeile bleibt ready, naechster Lauf`); continue; }
  // ⛔ ZEHNTE SCHICHT (25.09.2026, Betreiber-Screenshot IG-Profil): Lieferanten-Werbetext IM BILD. Das Lampenbild mit
  // «LED multifunctional desk lamp · Three levels of brightness» ging am 24.09. raus. Keine Schicht las das Bild; der
  // vorhandene Detektor (Ganzbild-OCR) las dort 0 Wörter. Jetzt: bildtext_pruefen mit KACHELN=1 (2×2 Ausschnitte,
  // geeicht 25.09.: Lampe 15 Wörter, saubere Posts ≤ 3). Ab WORTGRENZE (4) → «text-im-bild-skip».
  // −1 (unlesbar) heisst unbekannt, nicht sauber → Zeile bleibt ready.
  {
    let n = -1;
    try {
      const raus = _exf('python3', [new URL('./bildtext_pruefen.py', import.meta.url).pathname, '--url', imageUrl],
        { encoding: 'utf8', timeout: 120000, env: { ...process.env, KACHELN: '1' } });
      n = parseInt(String(raus).trim().split('\n').pop(), 10);
    } catch {}
    if (Number.isNaN(n) || n < 0) { console.log(`   ⚠️ Bildtext nicht lesbar → Zeile bleibt ready: ${next[idx.id]}`); continue; }
    if (n >= 4) {
      console.log(`   ⛔ ${n} Wörter Lieferantentext im Bild → text-im-bild-skip: ${next[idx.id]}`);
      if(!DRY){ next[idx.status] = 'text-im-bild-skip'; fs.writeFileSync(CSV, serialize(rows)); }
      continue;
    }
  }
  // ⛔ ELFTE SCHICHT (28.09.2026, Betreiber «mache jede post ein meisterwerk … jetzt hast du gemini» · «vision ai»):
  // Gemini-Vision-Jury schaut das Bild an wie eine Kundin (Fremdlogo/Wasserzeichen, falsches Produkt, billige Wirkung).
  // 4 = durchgefallen → «jury-skip»; 2 = kein Urteil (Netz/Schlüssel) → Zeile bleibt ready, kein Post ohne Urteil.
  {
    const j = juryPruefen(imageUrl, caption, 'bild');
    if (j.status === 4) {
      console.log(`   ⛔ Gemini-Jury: ${j.info} → jury-skip: ${next[idx.id]}`);
      if(!DRY){ next[idx.status] = 'jury-skip'; fs.writeFileSync(CSV, serialize(rows)); }
      continue;
    }
    if (j.status !== 0) { console.log(`   ⚠️ Gemini-Jury ohne Urteil (${j.info}) → Zeile bleibt ready: ${next[idx.id]}`); continue; }
    console.log(`   ✅ Gemini-Jury: ${j.info}`);
  }
  const fbCaption = mitFolgen(fbText(caption, pa.url, 'bild'));   // 07.10. «fb zu wenig follower»
  const plat = (next[idx.platforms]||'').toLowerCase();
  const wantIG = !plat.trim() || /instagram|\big\b/.test(plat);
  const wantFB = !plat.trim() || /facebook|\bfb\b/.test(plat);
  const wantTH = !SKIP_THREADS && (!plat.trim() || /threads/.test(plat));
  console.log(`→ Post ${next[idx.id]} | Kanäle: ${[wantIG&&'IG',wantFB&&'FB',wantTH&&'Threads'].filter(Boolean).join('+')} | ${imageUrl}`);
  if(DRY){
    console.log(`   DRY_RUN: würde senden (nichts gepostet, nichts geschrieben).`);
    if(wantIG) console.log(`   ── Instagram-Caption ──\n${caption}`);
    if(wantFB) console.log(`   ── Facebook-Text ──\n${fbCaption}`);
    postedCount++; continue;
  }

  // 23.09.2026: Instagram ZUERST und mit einem Wiederholungsversuch — am 23.09. 02:08 scheiterte der IG-Container
  // voruebergehend (9004/2207052 «Only photo or video…», dasselbe Bild 20 Min spaeter angenommen), FB wurde gepostet,
  // die Zeile stand als «posted», Instagram bekam den Post nie. Betreiber-Reihenfolge: TikTok, Instagram, dann FB.
  // Faellt IG zweimal, wird FB NICHT gepostet (kein Auseinanderlaufen der Kanaele); die Zeile bleibt «ready» und
  // zaehlt die Fehlversuche in post_url («ig-fehler:N»); ab 3 Fehlversuchen → Status «ig-fehler» (Mensch entscheidet).
  let igRes = wantIG ? await postIG(imageUrl, caption) : null;
  if (wantIG && igRes === false) {
    console.error('   IG-Fehler → ein Wiederholungsversuch in 20 s');
    await new Promise(x => setTimeout(x, 20000));
    igRes = await postIG(imageUrl, caption);
  }
  if (wantIG && igRes === false) {
    const n = (parseInt((/^ig-fehler:(\d+)/.exec(next[idx.post_url] || '') || [])[1] || '0', 10)) + 1;
    next[idx.post_url] = `ig-fehler:${n}`;
    if (n >= 3) next[idx.status] = 'ig-fehler';
    fs.writeFileSync(CSV, serialize(rows));
    anyFail = true;
    console.error(`   ❌ Instagram zweimal gescheitert (Versuch ${n}) — FB NICHT gepostet, Zeile bleibt ${next[idx.status]}.`);
    continue;
  }
  const results = await Promise.all([
    Promise.resolve(igRes),
    wantFB?postFB(imageUrl,fbCaption):Promise.resolve(null),     // FB: klickbarer Produktlink statt «Link in Bio»
    wantTH?postThreads(imageUrl,caption):Promise.resolve(null),
  ]);
  const got = results.filter(x => x && x!==false);
  if(got.length>0){
    if(results[0] && results[0]!==false){ postMark(imageUrl);   // IG ok → sofort in gemeinsamen Ledger
      produktMerken(caption, next[idx.id]); familieMerken(caption, 'bild'); }   // …WARE (7.) und Warengruppe (9.) merken
    if(sig) postedCaps.add(sig);                               // Inhalts-Sperre für Folge-Zeilen im selben Lauf
    next[idx.status] = 'posted';
    next[idx.posted_at] = new Date().toISOString();
    next[idx.post_url] = got[0];
    fs.writeFileSync(CSV, serialize(rows));                     // sofort committen (kein Post-vor-Commit-Fenster)
    postedCount++;
    console.log(`   ✅ veröffentlicht auf ${results.map((x,i)=>x&&x!==false?['IG','FB','Threads'][i]:null).filter(Boolean).join('+')}`);
  } else {
    anyFail = true;
    console.error(`   ❌ kein Kanal erfolgreich — bleibt ready (nächster Lauf erneut).`);
  }
}

if(!DRY && postedCount>0) fs.writeFileSync(CSV, serialize(rows));
console.log(`Fertig: ${postedCount} gepostet${DRY?' (DRY)':''}.`);
// 28.09.2026: 0 gepostet ohne Fehler = «uebersprungen» (Exit 3, Vertrag wie meta_reel_post/metricool_tiktok_post) —
// der Autopilot setzt dann seine Marke NICHT und versucht es im naechsten Lauf wieder.
process.exit(anyFail && postedCount===0 ? 1 : (!DRY && postedCount===0 && ready.length ? 3 : 0));
