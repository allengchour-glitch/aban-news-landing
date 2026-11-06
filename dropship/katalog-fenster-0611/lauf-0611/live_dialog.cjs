// Live: 403-Quelle finden, Dialog der Tasse öffnen, Textdatei-Abruf und Sprache prüfen (nur lesend).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA, locale: 'de-CH' });
  const p = await ctx.newPage();
  const bad = [], assets = [];
  p.on('response', (r) => { const u = r.url(); if (r.status() >= 400) bad.push(r.status() + ' ' + u.slice(0, 140)); if (/luxe-clothing-texts|luxe-clothing-details/.test(u)) assets.push(r.status() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 100)); });
  await p.goto('https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(8000);
  const knopf = p.locator('text=Auswahl & Details').first();
  await knopf.click({ timeout: 10000 }).catch((e) => console.log('Klick fehlgeschlagen', String(e).slice(0, 120)));
  await p.waitForTimeout(6000);
  const dlg = await p.evaluate(() => {
    const d = document.querySelector('dialog[open], [role=dialog], .lxc-dialog, .luxe-clothing-dialog') || document.body;
    const t = (d.innerText || '').replace(/\s+/g, ' ');
    return { laenge: t.length, text: t.slice(0, 1400), reload: /reload_needed|translation missing/i.test(t), englischeWoerter: (t.match(/\b(Matte|Glossy|Oyster|Original variants|orderable|Ghost)\b/g) || []) };
  });
  await p.screenshot({ path: '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kf_live_dialog.png' });
  console.log(JSON.stringify({ bad: bad.slice(0, 8), assets, dlg }, null, 1));
  await b.close();
})().catch((e) => { console.error('FEHLER', e); process.exit(1); });
