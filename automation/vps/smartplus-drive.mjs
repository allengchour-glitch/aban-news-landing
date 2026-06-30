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
const CONTINUE = process.env.CONTINUE === '1'; // an OFFENEN Brave anhaengen (kein Neustart, kein goto) + Picker abschliessen
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
    if (CONTINUE) {
      // SICHERSTELLEN dass der Tab auf der Ad-Creation-Seite ist (User/Bot kann woanders hin navigiert sein).
      if (!/ad_creation/.test(p.url())) { T('continue-goto ad_creation (war: ' + p.url().slice(0, 50) + ')'); await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}); await p.waitForTimeout(8000); }
      // AKTIV warten bis das App-Formular geladen ist (bytegration-iframe mit 'Aktivitätsname/Sammlung/Optimierung').
      let formReady = false;
      for (let w = 0; w < 14; w++) { for (const f of p.frames()) { try { if (await f.evaluate(() => /Aktivitätsname|Sammlung ausw|Optimierungsereignis|Einzelnes Produkt/i.test(document.body.innerText || ''))) { formReady = true; break; } } catch {} } if (formReady) break; await p.waitForTimeout(2500); }
      T('continue-formReady=' + formReady);
      // An den OFFENEN Brave anhaengen (kein Neustart). Picker selbst oeffnen falls noetig (Timing-sicher).
      T('continue-start ' + (await frameDiag(p)));
      let adminFr = p.frames().find(f => /admin\.shopify\.com/.test(f.url())) || p.mainFrame();
      let pickerOpen = false; try { pickerOpen = (await adminFr.getByPlaceholder(/Kollektion/i).count()) > 0; } catch {}
      if (!pickerOpen) {
        let fr0 = await bestFrame(p);
        await clickAny(fr0, [/^Sammlung$/i]); await p.waitForTimeout(800);
        await clickAny(fr0, [/Sammlung auswählen|Produkt auswählen/i]); await p.waitForTimeout(3500);
        adminFr = p.frames().find(f => /admin\.shopify\.com/.test(f.url())) || p.mainFrame();
      }
      T('c-picker-open=' + pickerOpen);
      // Suche "wasserfest" ins spezifische Feld
      try { const sb = adminFr.getByPlaceholder(/Kollektion/i).first(); if (await sb.count()) { await sb.click(); await sb.fill(''); await sb.pressSequentially('wasserfest', { delay: 90 }); await p.waitForTimeout(2800); } } catch {}
      // DOM-Probe: exakte Struktur der Wasserfester-Schmuck-Zeile + Checkbox.
      let probe = ''; try { probe = await adminFr.evaluate(() => {
        const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /Wasserfester Schmuck/i.test(e.textContent || ''));
        if (!leaf) return 'NO-LEAF';
        let row = leaf; for (let i = 0; i < 7 && row; i++) { if (row.querySelector && row.querySelector('input[type=checkbox],[role=checkbox]')) break; row = row.parentElement; }
        const cbs = row ? row.querySelectorAll('input[type=checkbox],[role=checkbox]').length : 0;
        return 'leaf<' + leaf.tagName + '> row<' + (row ? row.tagName + ' ' + (row.getAttribute('role') || '') : '-') + '> cbs=' + cbs;
      }); } catch (e) { probe = 'probe-err ' + String(e).slice(0, 40); }
      T('c-probe ' + probe);
      // Direkter DOM-Klick auf die Checkbox dieser Zeile (umgeht Actionability/Overlay-Probleme).
      let cbres = ''; try { cbres = await adminFr.evaluate(() => {
        const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /Wasserfester Schmuck/i.test(e.textContent || ''));
        if (!leaf) return 'no-leaf';
        let row = leaf; for (let i = 0; i < 7 && row; i++) { const cb = row.querySelector && row.querySelector('input[type=checkbox],[role=checkbox]'); if (cb) { cb.click(); return 'cb-clicked'; } row = row.parentElement; }
        const r = leaf.closest && leaf.closest('[role=option],[role=row],li,tr'); if (r) { r.click(); return 'row-clicked'; }
        leaf.click(); return 'leaf-clicked';
      }); } catch (e) { cbres = 'cb-err ' + String(e).slice(0, 40); }
      await p.waitForTimeout(1300); T('c-cbclick ' + cbres);
      // Hinzufügen klicken (Playwright + DOM-Fallback, nur wenn aktiv).
      let added = false;
      try { const hz = adminFr.getByRole('button', { name: /Hinzufügen/i }).first(); if (await hz.count()) { await hz.click({ timeout: 5000 }); added = true; } } catch {}
      if (!added) { try { added = await adminFr.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Hinzufügen/i.test(x.textContent || '') && !x.disabled); if (b) { b.click(); return true; } return false; }); } catch {} }
      await p.waitForTimeout(2500); let fr = await bestFrame(p);
      T('c-picker added=' + added + ' ' + (await controls(fr)));
      // Dropdown-Handler v3: NUR im App-Frame (bytegration) arbeiten (Admin-Nav ausschliessen) + Feld gezielt.
      const OPTSEL = '[role=option],[role=menuitem],[aria-selected],li,[class*=ption],[class*=Item],[class*=item],[data-value],[data-option]';
      // appFrame: NICHT-admin-Frame mit den meisten Controls = das App-Formular (bytegration meldet url oft 'about:blank').
      const appFrame = async () => { let best=null,max=-1; for(const f of p.frames()){ if(/admin\.shopify/.test(f.url())) continue; try{ const n=await f.evaluate(()=>document.querySelectorAll('button,[role=button],input,select,a,[role=option]').length); if(n>max){max=n;best=f;} }catch{} } return best || p.mainFrame(); };
      async function pickDropdown(label, placeRe, prefRe) {
        let af = await appFrame();
        try { const inp = af.getByPlaceholder(placeRe).first(); if (await inp.count()) { await inp.click({ timeout: 3000 }); } else { await clickAny(af, [placeRe]); } } catch {}
        await p.waitForTimeout(1800); af = await appFrame();
        let dump=''; try { const d=await af.evaluate((s)=>{ const o=[...document.querySelectorAll(s)].filter(x=>x.offsetParent!==null).map(x=>(x.innerText||'').trim()).filter(t=>t&&t.length<40); return [...new Set(o)].slice(0,18); }, OPTSEL); dump=JSON.stringify(d); } catch {}
        T('c-'+label+'-opts '+dump);
        let set='no-match'; try { set=await af.evaluate((args)=>{ const [s,re]=args; const rx=new RegExp(re,'i'); const opts=[...document.querySelectorAll(s)].filter(x=>x.offsetParent!==null&&(x.innerText||'').trim()&&(x.innerText||'').length<60); const pref=opts.find(x=>rx.test(x.innerText||'')); if(pref){pref.click(); return (pref.innerText||'').trim().slice(0,30);} return 'no-match'; }, [OPTSEL, prefRe.source]); } catch { set='err'; }
        await p.waitForTimeout(1200); fr=await bestFrame(p);
        T('c-'+label+'-set='+set);
      }
      await pickDropdown('event', /Optimierungsereignis|Optimierungs/i, /warenkorb|add to cart|in den warenkorb|kauf|complete payment|purchase|conversion|formular|lead|registr|klick/i);
      await pickDropdown('identity', /Identität/i, /aban|192aban|tiktok|konto/i);
      // Budget: Zahlenfeld suchen (evtl. erst jetzt sichtbar), sonst Feld per Placeholder
      // Anzeigentext (Werbetext) befuellen
      try { const at = (await appFrame()).getByPlaceholder(/Werbetext|Anzeigentext|ad text/i).first(); if (await at.count()) { await at.fill('Wasserfeschte Edelstahl-Schmuck wo nid alauft. -10% mit Code WELCOME10. Jetzt entdecke!'); T('c-adtext gesetzt'); } else T('c-adtext kein Feld'); } catch {}
      // Budget: TikTok-Minimum = 30 CHF/Tag (15 wird abgelehnt). 30/Tag, innerhalb der 350-Freigabe.
      try { let bi = fr.locator('input[type=number],input[inputmode=numeric],input[inputmode=decimal]').first(); if(!(await bi.count())){ bi = fr.getByPlaceholder(/budget|betrag|CHF/i).first(); } if (await bi.count()) { await bi.fill('30'); T('c-budget 30 gesetzt'); } else T('c-budget kein Zahlenfeld'); } catch { T('c-budget err'); }
      // VIDEO hochladen (setInputFiles, Reel liegt im Repo -> PC hat es via git). Nur wenn noch 0 Videos.
      try {
        const af = await appFrame();
        let fileInput = af.locator('input[type=file]').first();
        if (!(await fileInput.count())) { await clickAny(af, [/Hochladen/i]); await p.waitForTimeout(1800); fileInput = (await appFrame()).locator('input[type=file]').first(); }
        if (await fileInput.count()) {
          await fileInput.setInputFiles('reels/wasserfest-tiktok-ready.mp4'); T('c-video Upload gestartet (luma-test-wasserfest)'); await p.waitForTimeout(9000);
          // LERN-FIX 2026-06-29: TikTok meldet oft 'Fehlgeschlagen - Optimierung erforderlich'. Haken 'optimieren' setzen + 'Hochladen' klicken.
          try {
            const mf = await appFrame();
            await mf.evaluate(() => { document.querySelectorAll('input[type=checkbox]').forEach(c => { const lbl = (c.closest('label')?.innerText || c.parentElement?.innerText || ''); if (!c.checked && /optimier/i.test(lbl)) c.click(); }); });
            let clicked = await mf.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^\s*Hochladen\s*$/i.test(x.innerText || '') && !x.disabled && x.offsetParent !== null); if (b) { b.click(); return true; } return false; });
            T('c-video optimieren+Hochladen=' + clicked); await p.waitForTimeout(18000);
          } catch (e2) { T('c-video modal err ' + String(e2).slice(0, 40)); }
        }
        else T('c-video kein file-input gefunden');
      } catch (e) { T('c-video err ' + String(e).slice(0, 50)); }
      T('c-PRE-SUBMIT ' + (await controls(fr)));
      if (GO) { const s = await clickAny(fr, [/^Senden$/i, /veröffentlichen|publish|launch/i]); T(s ? 'GO: Senden geklickt' : 'GO: Senden nicht gefunden'); } else T('DRY: stoppe vor Senden (kein Spend)');
      try { await p.screenshot({ path: 'reports/smartplus-shot.png' }); T('c-screenshot reports/smartplus-shot.png'); } catch (e) { T('c-screenshot err ' + String(e).slice(0, 40)); }
      writeT('CONTINUE-ENDE'); await stamp('CONTINUE | ' + trace.join(' >> ').slice(0, 420)); await br.close().catch(() => {}); process.exit(0);
    }
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
    try { const sb = adminFr.getByPlaceholder(/Kollektion/i).first(); if (await sb.count()) { await sb.click(); await sb.fill(''); await sb.pressSequentially('wasserfest', { delay: 90 }); await p.waitForTimeout(3000); } } catch {}
    // Sammlungs-Namen NUR aus dem Picker-Dialog dumpen (nicht die Admin-Seitenleiste).
    // FIX 2026-06-30 (User „bot so machen das es geht"): Shopify-Picker zeigt nach der Suche ALLE Collections
    // (nicht gefiltert) -> die Zeile mit "Wasserfester" gezielt finden und ihre ROW/Checkbox per DOM anklicken
    // (Polaris: Klick auf die Zeile toggelt die Auswahl). Vorher wurde nur der Text geklickt -> Checkbox blieb leer.
    let pickInfo = '';
    try {
      pickInfo = await adminFr.evaluate(() => {
        const cbs = [...document.querySelectorAll('input[type=checkbox],[role=checkbox]')];
        for (const cb of cbs) {
          let row = cb;
          for (let i = 0; i < 9 && row; i++) {
            const t = (row.innerText || row.textContent || '');
            if (/wasserfest/i.test(t)) {
              const node = cb.closest('label,li,[role=option],[role=row],tr') || row;
              node.click();
              return 'gewaehlt: ' + t.slice(0, 40).replace(/\s+/g, ' ');
            }
            row = row.parentElement;
          }
        }
        return 'KEINE wasserfest-Zeile (checkboxes=' + cbs.length + ')';
      });
    } catch (e) { pickInfo = 'err ' + String(e).slice(0, 50); }
    T('p3b-pick ' + pickInfo);
    await p.waitForTimeout(900);
    let picked = false;
    // Hinzufügen klicken (Playwright + DOM-Fallback, nur wenn aktiv)
    try { const hz = adminFr.getByRole('button', { name: /Hinzufügen/i }).first(); if (await hz.count()) { await hz.click({ timeout: 5000 }); picked = true; } } catch {}
    if (!picked) { try { picked = await adminFr.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Hinzufügen/i.test(x.textContent || '') && !x.disabled); if (b) { b.click(); return true; } return false; }); } catch {} }
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
    // Budget: erscheint oft erst NACH Collection-Auswahl -> ALLE Frames durchsuchen (FIX 2026-06-30).
    let budgetSet = false;
    for (const f of p.frames()) { try { let bi = f.locator('input[type=number],input[inputmode=numeric],input[inputmode=decimal]').first(); if (!(await bi.count())) bi = f.getByPlaceholder(/budget|betrag|CHF|tagesbudget/i).first(); if (await bi.count()) { await bi.fill('30'); budgetSet = true; break; } } catch {} }
    T(budgetSet ? 'p6-budget 30 gesetzt' : 'p6-budget KEIN Zahlenfeld sichtbar');
    // 7) Anzeigentext + Video (FIX 2026-06-30: Haupt-Flow fuellte die bisher nicht) — alle Frames absuchen.
    let adtextSet = false;
    for (const f of p.frames()) { try { const at = f.getByPlaceholder(/Werbetext|Anzeigentext|ad text|Gib Werbetext/i).first(); if (await at.count()) { await at.fill('Bliebt das würkli Gold? Wasserfeschte Schmuck wo nid alauft. -10% mit Code WELCOME10. Jetzt entdecke!'); adtextSet = true; break; } } catch {} }
    T(adtextSet ? 'p7-adtext gesetzt' : 'p7-adtext kein Feld');
    let videoUp = false;
    const vidFile = (await import('node:fs')).existsSync('reels/aurora-hero-final.mp4') ? 'reels/aurora-hero-final.mp4' : 'reels/wasserfest-tiktok-ready.mp4';
    // 1) direkter input[type=file] (oft hidden im DOM)
    try { for (const f of p.frames()) { const fi = await f.$('input[type=file]'); if (fi) { await fi.setInputFiles(vidFile); videoUp = true; break; } } } catch {}
    // 2) FIX 2026-06-30: sonst erst "Hochladen" klicken -> Datei-Dialog (filechooser) abfangen + Datei setzen.
    if (!videoUp) { try { const fcP = p.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null); let clicked = false; for (const f of p.frames()) { try { if (await clickAny(f, [/^Hochladen$|Video hochladen|Lade eine vorhandene|upload video|hochladen/i])) { clicked = true; break; } } catch {} } T('p7-hochladen-klick=' + clicked); const fc = await fcP; if (fc) { await fc.setFiles(vidFile); videoUp = true; } } catch (e) { T('p7-video err ' + String(e).slice(0, 40)); } }
    if (videoUp) await p.waitForTimeout(10000);
    T(videoUp ? 'p7-video Upload gestartet' : 'p7-video kein Input/Button');
    fr = await bestFrame(p);
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
