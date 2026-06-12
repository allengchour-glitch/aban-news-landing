#!/usr/bin/env node
/* LuxeStyle — profil-politur.mjs  (EIGENSTÄNDIG — irgendwo speichern & ausführen)
 * --------------------------------------------------------------------------------
 * Poliert Instagram + TikTok OHNE API: steuert dein bereits eingeloggtes Brave über
 * den Debug-Port 9222. Braucht KEIN Repo (Profilbild kommt von öffentlicher CDN-URL).
 *
 * START (PowerShell, egal in welchem Ordner — z. B. C:\Users\allen):
 *   1) Brave läuft mit:  --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\brave-agent"
 *      und du bist dort bei instagram.com + tiktok.com eingeloggt.
 *   2) npm install playwright-core        (einmalig, im selben Ordner wie diese Datei)
 *   3) node profil-politur.mjs
 *
 * Es füllt Name/Bio/Link + setzt das Profilbild + macht Screenshots nach ./politur-screenshots/.
 * Den finalen "Speichern/Senden"-Klick versucht es; falls eine Plattform anders heisst,
 * sind die Felder schon ausgefüllt → du klickst nur noch Speichern. LÖSCHT NICHTS.
 */
import { chromium } from 'playwright-core';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const PIC_URL = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-profil.jpg?v=1781304921';
const PIC = path.join(process.cwd(), 'luxestyle-profil.jpg');
const SHOTS = path.join(process.cwd(), 'politur-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const T = {
  name:   'LuxeStyle · Schweizer Online-Shop',
  nameTT: 'LuxeStyle · Schweizer Shop',
  bioIG:  '🇨🇭 Schweizer Online-Shop\nMode · Schmuck · Uhren · dein eigenes Design 🎨\n📦 Weltweiter Versand · 30 Tage Rückgabe\n🎁 –10 % mit Code WELCOME10 👇',
  bioTT:  '🇨🇭 Schweizer Shop · Mode·Schmuck·Uhren\n–10 % Code WELCOME10 · luxestyle.ch',
  link:   'https://f.mtr.cool/XRISHONHRA',
};
const log = (...a)=>console.log(...a);
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

function download(url, dest){
  return new Promise((res, rej)=>{
    https.get(url, r=>{
      if (r.statusCode>=300 && r.statusCode<400 && r.headers.location) return download(r.headers.location,dest).then(res,rej);
      if (r.statusCode!==200) return rej(new Error('HTTP '+r.statusCode));
      const f=fs.createWriteStream(dest); r.pipe(f); f.on('finish',()=>f.close(res));
    }).on('error', rej);
  });
}
async function fill(page, selectors, val){
  for (const s of selectors){
    const el = await page.$(s);
    if (el){ await el.click({clickCount:3}).catch(()=>{}); await page.keyboard.press('Backspace').catch(()=>{}); await el.type(val,{delay:15}).catch(()=>{}); return true; }
  }
  return false;
}
async function setPic(page){ const inp = await page.$('input[type="file"]'); if (inp){ await inp.setInputFiles(PIC).catch(()=>{}); return true; } return false; }
async function clickSave(page, texts){
  for (const t of texts){ const b = page.locator(`button:has-text("${t}")`).first(); if (await b.count().catch(()=>0)){ await b.click({timeout:3000}).catch(()=>{}); return true; } }
  return false;
}

(async () => {
  try { await download(PIC_URL, PIC); log('✓ Profilbild geladen.'); } catch(e){ log('⚠️ Bild-Download:', e.message); }

  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch(e){ log('❌ Kein Brave auf localhost:9222. Brave mit --remote-debugging-port=9222 starten + eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  log('✓ Mit Brave verbunden.');

  // --- Instagram ---
  try {
    const p = await ctx.newPage();
    await p.goto('https://www.instagram.com/accounts/edit/', { waitUntil:'domcontentloaded', timeout:60000 });
    await sleep(4500);
    const n  = await fill(p, ['input[name="fullName"]'], T.name);
    const bi = await fill(p, ['textarea[name="biography"]'], T.bioIG);
    const ur = await fill(p, ['input[name="url"]'], T.link);
    await setPic(p).catch(()=>{});
    const sv = await clickSave(p, ['Senden','Absenden','Submit','Speichern']);
    await sleep(1500);
    await p.screenshot({ path: path.join(SHOTS,'instagram.png'), fullPage:false }).catch(()=>{});
    log(`Instagram: name:${n?'✓':'?'} bio:${bi?'✓':'?'} link:${ur?'✓':'?'} save:${sv?'✓':'(bitte selbst klicken)'}`);
  } catch(e){ log('Instagram-Fehler:', e.message); }

  // --- TikTok ---
  try {
    const p = await ctx.newPage();
    await p.goto('https://www.tiktok.com/setting?activeTab=editProfile', { waitUntil:'domcontentloaded', timeout:60000 });
    await sleep(4500);
    const n  = await fill(p, ['input[data-e2e="edit-profile-nickname"]','input[maxlength="30"]'], T.nameTT);
    const bi = await fill(p, ['textarea[data-e2e="edit-profile-bio"]','textarea[maxlength="80"]'], T.bioTT);
    const sv = await clickSave(p, ['Speichern','Save']);
    await sleep(1500);
    await p.screenshot({ path: path.join(SHOTS,'tiktok.png'), fullPage:false }).catch(()=>{});
    log(`TikTok: name:${n?'✓':'?'} bio:${bi?'✓':'?'} save:${sv?'✓':'(bitte selbst klicken)'} · Profilbild: Foto-Icon → luxestyle-profil.jpg`);
  } catch(e){ log('TikTok-Fehler:', e.message); }

  log('\nFertig. Screenshots in ./politur-screenshots/. Prüfen + ggf. "Speichern" klicken. (Brave bleibt offen.)');
  // Browser NICHT schliessen (würde dein Brave beenden) — Skript einfach beenden, CDP trennt sich:
  process.exit(0);
})();
