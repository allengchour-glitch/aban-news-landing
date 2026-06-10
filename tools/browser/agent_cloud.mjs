#!/usr/bin/env node
/* agent_cloud.mjs — eingeloggter Browser-Agent über BROWSERBASE (Cloud-Chromium).
 *
 * Unterschied zu agent.py (lokal): der Browser läuft in der Browserbase-Cloud. Damit kann
 * die Cloud-Session (Claude) ihn per CDP fernsteuern — Posts löschen, prüfen, posten.
 *
 * Sicherheit: KEINE Passwörter. Du loggst dich EINMAL in einem persistenten Browserbase-
 * „Context" ein (über eine Live-URL, deine Hand + 2FA). Der Context behält die Cookies →
 * alle weiteren Aktionen laufen headless und wiederverwenden ihn. Keys = GitHub-Secrets.
 *
 * ENV (Pflicht): BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
 *      (für Aktionen zusätzlich) BROWSERBASE_CONTEXT_ID  ← der eingeloggte Context
 *
 * Befehle:
 *   node agent_cloud.mjs context-create         → legt einen Context an, druckt die ID
 *   node agent_cloud.mjs login <login-url>       → öffnet Session auf dem Context + druckt
 *                                                   Live-URL; du loggst dich dort ein, ENTER
 *   node agent_cloud.mjs check <url> [out.png]    → Screenshot der eingeloggten Seite
 *   node agent_cloud.mjs ig-delete <post-url> --confirm
 *   node agent_cloud.mjs tiktok-delete <video-url> --confirm
 *
 * Benötigt: npm i playwright-core   (kein Browser-Download — verbindet nur per CDP)
 */
import readline from 'node:readline';

const API = 'https://api.browserbase.com/v1';
const KEY = process.env.BROWSERBASE_API_KEY || '';
const PROJ = process.env.BROWSERBASE_PROJECT_ID || '';
const CTX = process.env.BROWSERBASE_CONTEXT_ID || '';
const H = { 'X-BB-API-Key': KEY, 'Content-Type': 'application/json' };

function need(v, name){ if(!v){ console.error(`! ${name} fehlt (als Env/Secret setzen).`); process.exit(1);} }

async function bb(path, opts={}){
  const r = await fetch(API+path, { headers:H, ...opts });
  const t = await r.text();
  let j; try{ j = t?JSON.parse(t):{}; }catch{ j = { raw:t }; }
  if(!r.ok) throw new Error(`Browserbase ${path} → ${r.status}: ${t.slice(0,200)}`);
  return j;
}

async function createContext(){
  need(KEY,'BROWSERBASE_API_KEY'); need(PROJ,'BROWSERBASE_PROJECT_ID');
  const j = await bb('/contexts', { method:'POST', body: JSON.stringify({ projectId: PROJ }) });
  return j.id;
}

// Startet eine Session, die den (eingeloggten) Context wiederverwendet + persistiert.
// Residential-Proxy + Stealth (Default an) — sonst blockt IG/TikTok die Rechenzentrums-IP.
// Toggle: BB_PROXY=0 aus · BB_COUNTRY=CH Geo · BB_ADVANCED_STEALTH=1 (nur Scale-Plan).
async function startSession({ keepAlive=false } = {}){
  need(KEY,'BROWSERBASE_API_KEY'); need(PROJ,'BROWSERBASE_PROJECT_ID');
  const body = { projectId: PROJ, keepAlive };
  const bs = {};
  if (CTX) bs.context = { id: CTX, persist: true };
  if (process.env.BB_ADVANCED_STEALTH === '1') bs.advancedStealth = true;
  bs.solveCaptchas = true;
  if (Object.keys(bs).length) body.browserSettings = bs;
  if (process.env.BB_PROXY !== '0') {
    body.proxies = [{ type: 'browserbase', geolocation: { country: process.env.BB_COUNTRY || 'CH' } }];
  }
  const s = await bb('/sessions', { method:'POST', body: JSON.stringify(body) });
  return s; // { id, connectUrl, ... }
}

async function debugUrls(sessionId){
  const d = await bb(`/sessions/${sessionId}/debug`);
  return d; // { debuggerFullscreenUrl, debuggerUrl, ... }
}

async function endSession(sessionId){
  try{ await bb(`/sessions/${sessionId}`, { method:'POST',
    body: JSON.stringify({ projectId: PROJ, status:'REQUEST_RELEASE' }) }); }catch{}
}

function connectUrlFor(s){
  return s.connectUrl || `wss://connect.browserbase.com?apiKey=${encodeURIComponent(KEY)}&sessionId=${s.id}`;
}

async function withPage(fn, { keepAlive=false } = {}){
  let chromium;
  try{ ({ chromium } = await import('playwright-core')); }
  catch{ console.error('! playwright-core fehlt → npm i playwright-core'); process.exit(1); }
  const s = await startSession({ keepAlive });
  const browser = await chromium.connectOverCDP(connectUrlFor(s));
  try{
    const ctx = browser.contexts()[0] || await browser.newContext();
    const page = ctx.pages()[0] || await ctx.newPage();
    return await fn(page, s);
  } finally { await browser.close().catch(()=>{}); if(!keepAlive) await endSession(s.id); }
}

async function clickFirst(page, sels, timeout=4000){
  for(const sel of sels){
    try{ const l = page.locator(sel).first(); await l.waitFor({state:'visible', timeout}); await l.click(); return true; }
    catch{}
  }
  return false;
}
const ask = q => new Promise(res=>{ const rl=readline.createInterface({input:process.stdin,output:process.stdout}); rl.question(q,a=>{rl.close();res(a);});});

const [,, cmd, ...rest] = process.argv;
const confirm = rest.includes('--confirm');
const args = rest.filter(a=>!a.startsWith('--'));

(async () => {
  if (cmd === 'context-create'){
    const id = await createContext();
    console.log('\n✓ Context angelegt. Als Secret setzen:\n  BROWSERBASE_CONTEXT_ID=' + id + '\n');
    return;
  }
  if (cmd === 'login'){
    // Lokal-interaktiv (Terminal): öffnet Session, wartet auf ENTER.
    const url = args[0] || 'about:blank';
    need(CTX,'BROWSERBASE_CONTEXT_ID');
    const s = await startSession({ keepAlive:true });
    const d = await debugUrls(s.id);
    console.log('\n>>> 1) Öffne diese LIVE-URL im Browser:\n   ' + (d.debuggerFullscreenUrl||d.debuggerUrl));
    console.log('>>> 2) Gehe dort auf:  ' + url);
    console.log('>>> 3) Logge dich ein (inkl. 2FA). Dann hier ENTER drücken …');
    await ask('');
    await endSession(s.id);
    console.log('✓ Login fertig — der Context ist jetzt angemeldet. Aktionen können laufen.');
    return;
  }
  if (cmd === 'login-start'){
    // Workflow-tauglich (nicht-interaktiv): startet eine keepAlive-Session auf dem Context,
    // öffnet die Login-Seite darin und DRUCKT die Live-URL. User loggt sich dort ein.
    // Danach `login-release <sessionId>` aufrufen, damit der Context die Cookies speichert.
    const url = args[0] || 'about:blank';
    need(CTX,'BROWSERBASE_CONTEXT_ID');
    const s = await startSession({ keepAlive:true });
    const d = await debugUrls(s.id);
    try{
      const { chromium } = await import('playwright-core');
      const br = await chromium.connectOverCDP(connectUrlFor(s));
      const pg = (br.contexts()[0]?.pages()[0]) || await (br.contexts()[0]||await br.newContext()).newPage();
      await pg.goto(url, { waitUntil:'domcontentloaded', timeout:45000 }).catch(()=>{});
      await br.close().catch(()=>{});
    }catch{}
    console.log('\n=== BROWSERBASE LOGIN ===');
    console.log('SESSION_ID=' + s.id);
    console.log('LIVE_URL=' + (d.debuggerFullscreenUrl || d.debuggerUrl));
    console.log('→ Diese LIVE_URL im Browser öffnen, einloggen (inkl. 2FA).');
    console.log('→ Danach `login-release ' + s.id + '` laufen lassen (Context speichert die Anmeldung).');
    return;
  }
  if (cmd === 'login-release'){
    const sid = args[0]; if(!sid){ console.error('! Session-ID fehlt: login-release <sessionId>'); process.exit(1); }
    await endSession(sid);
    console.log('✓ Session ' + sid + ' beendet — Context-Cookies gespeichert. Aktionen können laufen.');
    return;
  }
  if (cmd === 'check'){
    need(CTX,'BROWSERBASE_CONTEXT_ID');
    const url = args[0]; const out = args[1] || 'cloud-check.png';
    await withPage(async (page)=>{
      await page.goto(url, { waitUntil:'networkidle', timeout:45000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: out });
      // Text-Beweis fürs Log (Cloud-Session kann das Bild nicht sehen):
      const u = page.url();
      const hasPw = await page.locator('input[name="password"]').count().catch(()=>0);
      const loggedInHints = await page.locator(
        'a[href*="/direct/"], svg[aria-label="New post"], svg[aria-label="Neuer Beitrag"], a[href*="/accounts/edit"], img[alt*="profile photo"], a[href$="/luxestyle.ch/"]'
      ).count().catch(()=>0);
      const onLoginPage = /\/accounts\/login|\/login/.test(u) || hasPw > 0;
      const status = (!onLoginPage && loggedInHints > 0) ? 'yes' : (onLoginPage ? 'no' : 'unklar');
      console.log('LOGIN_STATUS=' + status);
      console.log('PAGE_URL=' + u);
      console.log('hints=' + loggedInHints + ' pwfield=' + hasPw);
      console.log('✓ Screenshot: '+out+' (Artefakt).');
    });
    return;
  }
  if (cmd === 'ig-delete' || cmd === 'tiktok-delete'){
    need(CTX,'BROWSERBASE_CONTEXT_ID');
    const url = args[0]; const tag = cmd==='ig-delete'?'ig':'tt';
    await withPage(async (page)=>{
      await page.goto(url, { waitUntil:'networkidle', timeout:45000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${tag}-before.png` });
      if(!confirm){ console.log(`DRY-RUN (kein --confirm): ${tag}-before.png gespeichert, NICHT gelöscht.`); return; }
      const more = cmd==='ig-delete'
        ? ['svg[aria-label="More options"]','svg[aria-label="Mehr Optionen"]','[aria-label="More options"]']
        : ['[data-e2e="video-more"]','button[aria-label="more"]','[aria-label="More"]'];
      if(!await clickFirst(page, more)){ await page.screenshot({path:`${tag}-fail.png`}); throw new Error('Menü nicht gefunden ('+tag+'-fail.png)'); }
      await page.waitForTimeout(1000);
      if(!await clickFirst(page, ['button:has-text("Delete")','button:has-text("Löschen")','div[role="button"]:has-text("Delete")','*:has-text("Löschen")'])){
        await page.screenshot({path:`${tag}-fail.png`}); throw new Error("'Löschen' nicht gefunden ("+tag+'-fail.png)');
      }
      await page.waitForTimeout(1000);
      await clickFirst(page, ['button:has-text("Delete")','button:has-text("Löschen")']); // Bestätigung
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${tag}-after.png` });
      console.log(`✓ ${tag}-Löschversuch fertig. ${tag}-before.png / ${tag}-after.png vergleichen.`);
    });
    return;
  }
  console.error('Befehl unbekannt. Siehe Kopf der Datei (context-create | login | check | ig-delete | tiktok-delete).');
  process.exit(1);
})().catch(e=>{ console.error('Fehler:', e.message); process.exit(1); });
