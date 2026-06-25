#!/usr/bin/env node
/* =============================================================================
 *  cdp-shot.mjs — einen Browser über den CDP-Port (Remote-Debugging) steuern
 * -----------------------------------------------------------------------------
 *  Verbindet sich mit einem BEREITS LAUFENDEN Browser über dessen
 *  Remote-Debugging-Port (CDP) — kein Passwort, kein Token. Genau das Muster der
 *  PC-Session (Brave + automation/social-profile-polish.mjs), hier vereinheitlicht.
 *
 *  BROWSER STARTEN (einer von beiden), Port 9222:
 *   • PC / Brave (Windows):
 *       & "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" `
 *         --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\brave-agent"
 *   • Linux / Chromium (z. B. diese Sandbox, Playwright-Chromium):
 *       "$(node -e "console.log(require('playwright').chromium.executablePath())" \
 *          || echo /opt/pw-browsers/chromium-1194/chrome-linux/chrome)" \
 *         --headless=new --no-sandbox --remote-debugging-port=9222 \
 *         --user-data-dir=/tmp/cdp-profile about:blank &
 *     (Für EXTERNE Seiten hinter einem Proxy zusätzlich: --proxy-server="$HTTPS_PROXY")
 *
 *  NUTZUNG:
 *     node automation/cdp-shot.mjs <url> [screenshot.png]
 *     CDP=http://localhost:9222 node automation/cdp-shot.mjs https://abannews.com out.png
 *
 *  Verbindet über CDP, lädt die URL, gibt Titel/H1 aus und speichert einen
 *  Screenshot. Der Browser bleibt nach dem Lauf offen (wie am PC). Funktioniert
 *  mit playwright (bevorzugt) oder puppeteer-core als Fallback.
 * ========================================================================== */
const CDP = process.env.CDP || 'http://localhost:9222';
const url = process.argv[2] || 'about:blank';
const out = process.argv[3] || 'cdp-shot.png';

async function withPlaywright() {
  const { chromium } = await import('playwright');
  const b = await chromium.connectOverCDP(CDP);
  const ctx = b.contexts()[0] || (await b.newContext());
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const title = await p.title().catch(() => '');
  const h1 = await p.textContent('h1').catch(() => null);
  await p.screenshot({ path: out });
  await p.close();
  await b.close();               // trennt nur die Verbindung; Browser läuft weiter
  return { title, h1, engine: 'playwright' };
}

async function withPuppeteer() {
  const pp = (await import('puppeteer-core')).default;
  const b = await pp.connect({ browserURL: CDP, defaultViewport: { width: 1280, height: 900 } });
  const p = await b.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const title = await p.title().catch(() => '');
  const h1 = await p.$eval('h1', el => el.textContent).catch(() => null);
  await p.screenshot({ path: out });
  await p.close();
  await b.disconnect();
  return { title, h1, engine: 'puppeteer-core' };
}

try {
  let r;
  try { r = await withPlaywright(); }
  catch { r = await withPuppeteer(); }
  console.log(`✓ CDP ${CDP} · ${r.engine}`);
  console.log(`✓ ${url}`);
  console.log(`  Titel: ${r.title}`);
  if (r.h1) console.log(`  H1:    ${r.h1.trim().slice(0, 80)}`);
  console.log(`✓ Screenshot: ${out}`);
} catch (e) {
  console.error(`❌ Kein Browser auf ${CDP}? Starte ihn mit --remote-debugging-port=9222.`);
  console.error('  ', e.message);
  process.exit(1);
}
