#!/usr/bin/env node
/* LuxeStyle — fb-profile-polish.mjs
 * Poliert die Facebook-Seite per Graph-API: Profilbild + "Info"/about + Website.
 * (IG/TikTok haben KEINE Profil-Edit-API — dort nur Browser/manuell.)
 *
 * ENV: FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN) · DRY_RUN=1
 * Page-Token wird wie im Video-Poster via /me/accounts geholt (User-Token reicht).
 */
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const FB_ID = process.env.FB_PAGE_ID || '';
const TOK0 = process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const DRY = process.env.DRY_RUN === '1';

const PIC_URL = 'https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/social/brand/profil-rund-dunkel.jpg';
const ABOUT = 'LuxeStyle – dein Schweizer Online-Shop: Mode für Sie & Ihn, Schmuck, Uhren & dein eigenes Design. 🇨🇭 Weltweiter Versand · 30 Tage Rückgabe · –10% mit Code WELCOME10.';
const WEBSITE = 'https://luxestyle.ch';

if (!FB_ID || !TOK0) { console.log('Kein FB_PAGE_ID/Token → No-op.'); process.exit(0); }

const g = async (url, opts) => { const r = await fetch(url, opts); const j = await r.json().catch(()=>({})); return { ok:r.ok, status:r.status, j }; };
const form = (params) => new URLSearchParams(params);

// Page-Token holen (User-Token → /me/accounts), Fallback: Original-Token
let TOK = TOK0;
{
  const a = await g(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(TOK0)}`);
  const pg = a.ok && Array.isArray(a.j.data) ? a.j.data.find(p=>p.id===FB_ID) : null;
  if (pg?.access_token) { TOK = pg.access_token; console.log('Page-Token via /me/accounts.'); }
}

// Ist-Zustand zeigen (Analyse vor Änderung)
const cur = await g(`https://graph.facebook.com/${V}/${FB_ID}?fields=name,about,website,picture{url}&access_token=${encodeURIComponent(TOK)}`);
console.log('IST:', JSON.stringify({name:cur.j.name, about:cur.j.about, website:cur.j.website}).slice(0,400));

if (DRY) { console.log('DRY: würde about/website + Profilbild setzen.'); process.exit(0); }

// 1) about + website
const u1 = await g(`https://graph.facebook.com/${V}/${FB_ID}`, { method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body: form({ about: ABOUT, website: WEBSITE, access_token: TOK }) });
console.log(u1.ok ? '✓ Info/Website aktualisiert' : `✗ Info: ${u1.status} ${JSON.stringify(u1.j.error||u1.j).slice(0,250)}`);

// 2) Profilbild von URL
const u2 = await g(`https://graph.facebook.com/${V}/${FB_ID}/picture`, { method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body: form({ picture: PIC_URL, access_token: TOK }) });
console.log(u2.ok ? '✓ Profilbild gesetzt' : `✗ Bild: ${u2.status} ${JSON.stringify(u2.j.error||u2.j).slice(0,250)}`);

process.exit(u1.ok || u2.ok ? 0 : 1);
