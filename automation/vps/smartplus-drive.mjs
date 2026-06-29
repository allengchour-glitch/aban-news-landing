#!/usr/bin/env node
/* smartplus-drive.mjs — TikTok-Ad via Shopify Smart+ AUTONOM erstellen, PURE PLAYWRIGHT (KEIN Stagehand, KEIN
 * Marketing-Token). Faehrt den PC-Brave ueber die Tailscale-Bruecke (die nachweislich verbindet: tiktok_stats
 * stempelt taeglich). Geht auf die Shopify-TikTok-App-Ad-Erstellung, klickt mit ECHTEN locator.click durch den
 * Smart+-Flow (Ziel->Produkte->Budget->Land/Sprache), DRY (stoppt VOR dem Absenden) + stempelt jeden Schritt
 * nach luxe.smartplus_status, damit die Cloud sieht wie weit er kam + die echten Buttons.
 *
 * GO=1 sendet real ab (max 15 CHF/Tag in der UI gesetzt). Default DRY. ENV: CDP_HOST, SHOPIFY_CLIENT_ID/SECRET/SHOP.
 * Lauf: CDP_HOST=100.71.8.47 node automation/vps/smartplus-drive.mjs
 */
import { chromium } from 'playwright-core';
const HOST = process.env.CDP_HOST || '100.71.8.47';
const GO = process.env.GO === '1';
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const URL = 'https://admin.shopify.com/store/luxestyle-ch/apps/tiktok-ads-2/ad_creation';
import { writeFileSync } from 'node:fs';
const log = (...a) => console.log('smartplus:', ...a);
const trace = [];
const T = m => { trace.push(m); log(m); writeT(); };
function writeT(extra) {
  try { writeFileSync('reports/smartplus-trace.txt', `${new Date().toISOString()} ${GO ? 'GO' : 'DRY'}\n` + trace.join('\n') + (extra ? '\n' + extra : '') + '\n'); } catch {}
}

async function stamp(val) {
  if (!ID || !SEC) { log('keine Shopify-Creds -> kein Stamp:', val); return; }
  try {
    const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
    const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
    const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
    await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: 'mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}', variables: { m: [{ ownerId: sid, namespace: 'luxe', key: 'smartplus_status', type: 'multi_line_text_field', value: val.slice(0, 480) }] } }) });
    log('luxe.smartplus_status gestempelt');
  } catch (e) { log('stamp-fehler', String(e).slice(0, 80)); }
}
const controls = async (ctx) => ctx.evaluate(() => {
  const b = [...document.querySelectorAll('button,[role=button]')].map(x => (x.innerText || x.getAttribute('aria-label') || '').trim()).filter(s => s && s.length < 28).slice(0, 14);
  const i = [...document.querySelectorAll('input,select')].map(x => (x.type || x.tagName) + ':' + (x.placeholder || x.getAttribute('aria-label') || x.name || '?').slice(0, 18)).slice(0, 8);
  return 'BTN[' + b.join('|') + '] INP[' + i.join('|') + ']';
}).catch(() => '');
// Shopify Embedded-Apps rendern in iframes -> den Frame mit den meisten Steuerelementen waehlen (= eigentliche App-UI).
async function bestFrame(p) {
  let best = p.mainFrame(), max = -1;
  for (const f of p.frames()) {
    try { const n = await f.evaluate(() => document.querySelectorAll('button,[role=button],input,select,a').length); if (n > max) { max = n; best = f; } } catch {}
  }
  return best;
}
async function frameDiag(p) {
  const out = [];
  for (const f of p.frames()) {
    try { const n = await f.evaluate(() => document.querySelectorAll('button,[role=button]').length); out.push((f.url() || 'about:blank').replace(/^https?:\/\//, '').slice(0, 38) + '#' + n); } catch {}
  }
  return `frames=${p.frames().length} [${out.join(' | ')}]`;
}
// Tiefen-Dump: jeder Frame mit Button-/Feld-Texten — um zu finden, wo ein Picker/Dropdown-Overlay aufgeht.
async function allDump(p) {
  const out = [];
  for (const f of p.frames()) {
    try {
      const d = await f.evaluate(() => {
        const b = [...document.querySelectorAll('button,[role=button],[role=option],li[role]')].map(x => (x.innerText || x.getAttribute('aria-label') || '').trim()).filter(s => s && s.length < 26).slice(0, 10);
        const i = [...document.querySelectorAll('input')].map(x => (x.type || 't') + ':' + (x.placeholder || x.getAttribute('aria-label') || '').slice(0, 14)).filter(s => s.length > 2).slice(0, 6);
        return b.length + 'b/' + i.length + 'i [' + b.join(',') + '] (' + i.join(',') + ')';
      });
      out.push('  ' + (f.url() || 'blank').replace(/^https?:\/\//, '').slice(0, 32) + ' ' + d);
    } catch { out.push('  ' + (f.url() || 'blank').slice(0, 32) + ' [cross-origin]'); }
  }
  return out.join('\n');
}
async function clickAny(ctx, res) {
  for (const re of res) {
    for (const loc of [ctx.getByRole('button', { name: re }).first(), ctx.getByText(re).first()]) {
      try { if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) { await loc.click({ timeout: 4000 }); await ctx.waitForTimeout(2500); return true; } } catch {}
    }
  } return false;
}

(async () => {
  let br;
  try {
    if (HOST === '127.0.0.1' || HOST === 'localhost') {
      // PC-lokal: direkter HTTP-Endpoint = robusteste Methode (Playwright macht den /json/version + WS-Handshake selbst,
      // umgeht den Host-Header/ws-URL-Stolperstein der manuellen Methode).
      br = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 20000 });
    } else {
      const j = await (await fetch(`http://${HOST}:9222/json/version`, { headers: { Host: '127.0.0.1:9222' }, signal: AbortSignal.timeout(8000) })).json();
      br = await chromium.connectOverCDP(j.webSocketDebuggerUrl.replace(/127\.0\.0\.1|localhost/, HOST), { timeout: 20000 });
    }
  } catch (e) { writeT('CONNECT-FAIL: ' + String(e).slice(0, 90)); await stamp('Brave nicht erreichbar: ' + String(e).slice(0, 70)); process.exit(0); }
  try {
    const ctx = br.contexts()[0] || await br.newContext();
    const p = (br.contexts().flatMap(c => c.pages()).find(x => { try { return /apps\/tiktok/.test(x.url()); } catch { return false; } })) || await ctx.newPage();
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}); await p.waitForTimeout(9000);
    const body = (await p.evaluate(() => document.body.innerText).catch(() => '')) || '';
    // DIAGNOSE: Top-URL, Body-Laenge + alle Frames mit Button-Anzahl (Shopify-App liegt in einem iframe).
    T('DIAG topurl=' + p.url().replace(/^https?:\/\//, '').slice(0, 45) + ' bodylen=' + body.length + ' ' + (await frameDiag(p)));
    if (/login|anmelden|sign in|log in to shopify/i.test(body) && !/Smart|Kampagne|campaign|Budget|Ziel/i.test(body)) {
      writeT('LOGIN-WAND: brave-agent nicht bei admin.shopify.com eingeloggt. ' + (await controls(p))); await stamp('LOGIN-WAND: brave-agent-Profil ist NICHT bei admin.shopify.com eingeloggt -> dort 1x einloggen. ' + (await controls(p))); process.exit(0);
    }
    // SMART+-FORMULAR (single-page, im bytegration-iframe). Felder gezielt befuellen, Trace nach jedem Schritt.
    let fr = await bestFrame(p);
    T('form ' + (await controls(fr)));
    // 1) Produkt-Typ = Sammlung
    const c1 = await clickAny(fr, [/^Sammlung$/i, /^Collection$/i]); await p.waitForTimeout(1500); fr = await bestFrame(p);
    T('p1-sammlung click=' + c1 + ' ' + (await controls(fr)));
    // 2) Aktivitaetsname
    let named = false; try { const nm = fr.getByPlaceholder(/Aktivitätsname|activity name|Kampagnenname/i).first(); if (await nm.count()) { await nm.fill('Wasserfest CH Juni'); named = true; } } catch {}
    T('p2-name set=' + named);
    // 3) Produkt auswaehlen -> Picker, "wasserfest" suchen + waehlen + bestaetigen
    const c3 = await clickAny(fr, [/Sammlung auswählen|Produkt auswählen|Produkte auswählen|select product|select collection/i]); await p.waitForTimeout(3500);
    T('p3-picker click=' + c3 + ' pages=' + br.contexts().flatMap(c => c.pages()).length);
    // Picker oeffnet im admin.shopify.com-Frame (Shopify ResourcePicker): Feld "Kollektionen suchen" + Checkboxen.
    const adminFr = p.frames().find(f => /admin\.shopify\.com/.test(f.url())) || p.mainFrame();
    // ECHTE Tastenanschlaege ins SPEZIFISCHE "Kollektionen suchen"-Feld (NICHT die globale "Suchen"-Leiste!).
    try { const sb = adminFr.getByPlaceholder(/Kollektion/i).first(); if (await sb.count()) { await sb.click(); await sb.pressSequentially('wasserfest', { delay: 90 }); await p.waitForTimeout(3000); } } catch {}
    // Sammlungs-Namen NUR aus dem Picker-Dialog dumpen (nicht die Admin-Seitenleiste).
    let rows = []; try { rows = await adminFr.evaluate(() => { const d = document.querySelector('[role=dialog],[aria-modal="true"]') || document.body; return [...d.querySelectorAll('[role=row],[role=option],li,label,tr')].map(x => (x.innerText || '').trim()).filter(s => s && s.length > 1 && s.length < 44); }); } catch {}
    T('p3b-rows ' + JSON.stringify([...new Set(rows)].slice(0, 16)));
    let picked = false;
    // Treffer-Zeile/Checkbox im Dialog anklicken
    try { const dlg = adminFr.locator('[role=dialog],[aria-modal="true"]').first(); const hit = dlg.getByText(/wasserfest/i).first(); if (await hit.count()) { await hit.click({ timeout: 4000 }); await p.waitForTimeout(1000); } else { await clickAny(adminFr, [/wasserfester schmuck|wasserfest/i]); } } catch { try { await clickAny(adminFr, [/wasserfest/i]); } catch {} }
    try { picked = await clickAny(adminFr, [/hinzufügen|auswählen|fertig|speichern|bestätigen|add\b|^done$|select/i]); } catch {}
    await p.waitForTimeout(2500); fr = await bestFrame(p);
    T('p3c-nach-picker picked=' + picked + ' ' + (await controls(fr)));
    // 4) Optimierungsereignis -> In den Warenkorb (Dropdown-Overlay per allDump sichtbar machen)
    await clickAny(fr, [/Optimierungsereignis|Optimierungs|optimization event/i]); await p.waitForTimeout(1500);
    T('p4a-event-open\n' + (await allDump(p)));
    await clickAny(await bestFrame(p), [/In den Warenkorb|Warenkorb|Add to Cart|Add to cart/i]); await p.waitForTimeout(1000); fr = await bestFrame(p);
    T('p4-event ' + (await controls(fr)));
    // 5) Identitaet -> erste Option
    await clickAny(fr, [/Identität auswählen|Identität|identity/i]); await p.waitForTimeout(1500);
    T('p5-identitaet\n' + (await allDump(p)));
    // 6) Budget 15 (falls ein Zahlenfeld existiert)
    fr = await bestFrame(p);
    try { const bi = fr.locator('input[type=number],input[inputmode=numeric],input[inputmode=decimal]').first(); if (await bi.count()) { await bi.fill('15'); T('p6-budget 15 gesetzt'); } else T('p6-budget KEIN Zahlenfeld sichtbar'); } catch { T('p6-budget Fehler'); }
    T('PRE-SUBMIT ' + (await controls(fr)));
    if (GO) {
      const sent = await clickAny(fr, [/^Senden$/i, /veröffentlichen|publish|launch|absenden|kampagne starten|submit/i]);
      T(sent ? 'GO: Senden geklickt' : 'GO: Senden-Button nicht gefunden');
    } else T('DRY: stoppe vor Senden (kein Spend)');
  } catch (e) { T('Fehler: ' + String(e).slice(0, 90)); }
  finally {
    writeT('ENDE');
    await stamp(`${GO ? 'GO' : 'DRY'} | ${trace.join(' >> ').slice(0, 440)}`);
    await br.close().catch(() => {});
  }
})();
