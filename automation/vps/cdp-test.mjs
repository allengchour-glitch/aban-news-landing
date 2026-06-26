#!/usr/bin/env node
/* cdp-test.mjs — VPS-Test: verbindet sich ueber Tailscale mit dem PC-Brave (CDP) und liest die offenen
 * Tabs. Beweist, dass der VPS den Browser fernsteuern kann. Lauf auf dem VPS:
 *   CDP_HOST=100.71.8.47 node automation/vps/cdp-test.mjs
 * Braucht playwright-core (npm i playwright-core).
 */
import { chromium } from 'playwright-core';
const HOST = process.env.CDP_HOST || '100.71.8.47';
const log = (...a) => console.log(...a);

(async () => {
  log('1) /json/version holen von', HOST + ':9222 ...');
  const r = await fetch(`http://${HOST}:9222/json/version`, { headers: { Host: '127.0.0.1:9222' } });
  const j = await r.json();
  let ws = j.webSocketDebuggerUrl;
  log('   Brave:', j.Browser, '| ws roh:', ws);
  // 127.0.0.1 -> Tailnet-IP umschreiben (sonst zeigt die WS auf VPS-loopback)
  ws = ws.replace(/127\.0\.0\.1|localhost/, HOST);
  log('2) connectOverCDP ->', ws);
  const browser = await chromium.connectOverCDP(ws);
  const ctxs = browser.contexts();
  let n = 0;
  for (const c of ctxs) for (const p of c.pages()) { n++; log(`   TAB ${n}:`, (await p.title().catch(() => '?')), '|', p.url()); }
  log(n ? `✅ ERFOLG: VPS sieht ${n} offene Tab(s) im PC-Brave -> Fernsteuerung funktioniert!` : '⚠️ Verbunden, aber keine Tabs.');
  await browser.close().catch(() => {});
})().catch(e => { console.log('❌ Fehler:', String(e).slice(0, 200)); process.exit(1); });
