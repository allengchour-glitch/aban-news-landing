// Bedienungstest für lspod-designer-v5.js (lokale Fassung, kein CDN, kein Warenkorb).
// Aufruf: /opt/node22/bin/node test_v5.mjs <pfad-zur-widget-datei> <ausgabe-ordner>
import fs from 'node:fs';
import path from 'node:path';
import { starte } from '/home/user/aban-news-landing/tools/browser.mjs';

const WIDGET = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3] || '.');
fs.mkdirSync(OUT, { recursive: true });
const BLANK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'><rect width='400' height='500' fill='#f4f1ec'/></svg>");
const fixture = path.join(OUT, 'fixture.html');
fs.writeFileSync(fixture, `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:12px;font-family:sans-serif;background:#fff">
<form action="/cart/add" method="post"><input type="hidden" name="id" value="1"></form>
<div class="lspod-designer" data-img-front="${BLANK}" data-variant="1" data-ratio="1.25"></div>
<script src="${WIDGET.replace(/\\/g, '/')}" defer></script>
</body></html>`);

const fehler = [];
const pruefungen = [];
function pruefe(name, ok, info = '') {
  pruefungen.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'OK  ' : 'FEHL'} ${name}${info ? '  — ' + info : ''}`);
}

const browser = await starte();
try {
  const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
  seite.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  seite.on('console', (m) => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  await seite.goto('file://' + fixture, { waitUntil: 'load' });
  await seite.waitForSelector('.lspod-designer[data-init="1"]', { timeout: 15000 });
  pruefe('Widget gebaut (data-init=1)', true);

  const knotenText = () => seite.evaluate(() => {
    const r = document.querySelector('[data-lid]');
    return r ? r.querySelector('div').textContent : null;
  });
  const transform = () => seite.evaluate(() => document.querySelector('[data-lid]') && document.querySelector('[data-lid]').style.transform);
  const stageW = () => seite.evaluate(() => document.querySelector('.lspod-designer > div > div:nth-child(2)') ? document.querySelector('.lspod-designer > div > div:nth-child(2)').getBoundingClientRect().width : 0);

  // 1. Text + zwei Zeilen
  await seite.click('button:has-text("Text")');
  await seite.fill('textarea', 'Zeile eins\nZeile zwei');
  await seite.waitForTimeout(150);
  const t1 = await knotenText();
  pruefe('Text mit Zeilenumbruch übernommen', t1 === 'Zeile eins\nZeile zwei', JSON.stringify(t1));
  const hoch = await seite.evaluate(() => document.querySelector('[data-lid] > div').getBoundingClientRect().height);
  pruefe('Zwei Zeilen sind höher als eine', hoch > 30, 'Höhe ' + Math.round(hoch) + ' px');

  // 2. Fett aus, kursiv, rechtsbündig
  await seite.click('button[title="Fett"]');
  let fw = await seite.evaluate(() => getComputedStyle(document.querySelector('[data-lid] > div')).fontWeight);
  pruefe('Fett aus → Schriftstärke 400', fw === '400', 'fontWeight=' + fw);
  await seite.click('button[title="Fett"]');
  fw = await seite.evaluate(() => getComputedStyle(document.querySelector('[data-lid] > div')).fontWeight);
  pruefe('Fett wieder an → 800', fw === '800', 'fontWeight=' + fw);
  await seite.click('button[title="Kursiv"]');
  const fs1 = await seite.evaluate(() => getComputedStyle(document.querySelector('[data-lid] > div')).fontStyle);
  pruefe('Kursiv an → italic', fs1 === 'italic', fs1);
  await seite.click('button:has-text("Rechts")');
  const ta = await seite.evaluate(() => getComputedStyle(document.querySelector('[data-lid] > div')).textAlign);
  pruefe('Rechtsbündig → text-align right', ta === 'right', ta);

  // 3. Zahlenfelder: X auf 25 %, dann Rückgängig
  const xFeld = seite.locator('label:has-text("X %") input');
  await xFeld.fill('25');
  await xFeld.press('Tab');
  await seite.waitForTimeout(100);
  const tr25 = await transform();
  const sw = await stageW();
  const xPx = parseFloat((tr25.match(/translate\(([-\d.]+)px/) || [])[1] || '0');
  pruefe('X 25 % setzt Position', Math.abs(xPx - 0.25 * sw) < 2, `x=${xPx.toFixed(1)} px, Breite=${sw.toFixed(1)}`);
  await seite.click('button[title^="Rückg"]');
  await seite.waitForTimeout(100);
  const trUndo = await transform();
  const xUndo = parseFloat((trUndo.match(/translate\(([-\d.]+)px/) || [])[1] || '0');
  pruefe('Rückgängig stellt X zurück', Math.abs(xUndo - 0.5 * sw) < 2, `x=${xUndo.toFixed(1)} px`);

  // 4. Deckkraft 50 %
  await seite.locator('label:has-text("Deckkraft %") input').fill('50');
  await seite.locator('label:has-text("Deckkraft %") input').press('Tab');
  const op = await seite.evaluate(() => getComputedStyle(document.querySelector('[data-lid] > div')).opacity);
  pruefe('Deckkraft 50 % → opacity 0.5', Math.abs(parseFloat(op) - 0.5) < 0.01, 'opacity=' + op);

  // 5. Zweite Ebene, Reihenfolge per ▼
  await seite.click('button:has-text("Text")');
  await seite.fill('textarea', 'Zwei');
  await seite.waitForTimeout(100);
  const chips = await seite.evaluate(() => {
    const k = [...document.querySelectorAll('span')].find((x) => x.textContent === 'Ebenen');
    return k ? k.parentElement.querySelectorAll('button').length - 2 : -1; // ohne ▲ und ▼
  });
  pruefe('Ebenen-Liste zeigt 2 Ebenen', chips === 2, 'Chips=' + chips);
  const zVor = await seite.evaluate(() => [...document.querySelectorAll('[data-lid]')].map((n) => [n.textContent.slice(0, 8), n.style.zIndex]));
  await seite.click('button[title="Nach unten"]');
  const zNach = await seite.evaluate(() => [...document.querySelectorAll('[data-lid]')].map((n) => [n.textContent.slice(0, 8), n.style.zIndex]));
  pruefe('▼ Nach unten tauscht die Z-Reihenfolge', JSON.stringify(zVor) !== JSON.stringify(zNach), JSON.stringify(zNach));

  // 6. Tastatur: Ebene anklicken, Pfeil rechts ×4 (0,5 % je Schritt), dann Entf
  const erstes = seite.locator('[data-lid]').first();
  const box = await erstes.boundingBox();
  await seite.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await seite.waitForTimeout(80);
  const x0 = await seite.locator('label:has-text("X %") input').inputValue();
  for (let i = 0; i < 4; i++) await seite.keyboard.press('ArrowRight');
  await seite.waitForTimeout(80);
  const x1 = await seite.locator('label:has-text("X %") input').inputValue();
  pruefe('Pfeiltaste verschiebt um 0,5 %', Math.abs(parseFloat(x1) - parseFloat(x0) - 2) < 0.2, `${x0} → ${x1}`);
  const anzahlVor = await seite.locator('[data-lid]').count();
  await seite.keyboard.press('Delete');
  await seite.waitForTimeout(80);
  const anzahlNach = await seite.locator('[data-lid]').count();
  pruefe('Entf löscht die gewählte Ebene', anzahlNach === anzahlVor - 1, `${anzahlVor} → ${anzahlNach}`);

  // 7. Druck-Vorschau: die Druckdatei muss entstehen und 1200 px breit sein
  await seite.click('button:has-text("Druck-Vorschau")');
  await seite.waitForSelector('img[src^="blob:"]', { timeout: 10000 });
  const bild = await seite.evaluate(() => {
    const i = document.querySelector('img[src^="blob:"]');
    return { w: i.naturalWidth, h: i.naturalHeight };
  });
  pruefe('Druckdatei entsteht (1200 px breit)', bild.w === 1200, JSON.stringify(bild));
  await seite.screenshot({ path: path.join(OUT, 'druckvorschau.png') });
  await seite.keyboard.press('Escape');
  await seite.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Schliessen' || x.textContent.trim() === 'Schließen'); if (b) b.click(); });

  // 8. Bildschirmfoto zum Ansehen (390 px)
  await seite.evaluate(() => {
    const s = document.querySelector('[data-lid]');
    if (s) s.click();
  });
  await seite.screenshot({ path: path.join(OUT, 'editor-390.png'), fullPage: true });
} finally {
  await browser.close();
}

const alle = pruefungen.every((p) => p.ok) && fehler.length === 0;
console.log(`\nErgebnis: ${pruefungen.filter((p) => p.ok).length}/${pruefungen.length} Prüfungen bestanden, ${fehler.length} Browser-Fehler`);
for (const f of fehler) console.log('  ' + f);
console.log(alle ? 'ALLES GRÜN' : 'NICHT GRÜN');
process.exit(alle ? 0 : 1);
