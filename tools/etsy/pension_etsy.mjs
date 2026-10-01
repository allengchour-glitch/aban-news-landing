// Etsy-Paket Pensions-Check Schweiz: 5 Bilder (2400×1800) aus der ECHTEN App mit einem Beispiel, Anleitung als PDF, App-Datei.
//   python3 tools/pension/build.py && node tools/etsy/pension_etsy.mjs   (Playwright; ROOT=… wenn aus anderem Ordner)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const ROOT = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ZIEL = path.join(ROOT, 'content/etsy/pensions-check');
const APP = path.join(ROOT, 'content/packs/de/pensions-check/pensions-check.html');

// Beispiel-Haushalt: Platzhalter-Zahlen, keine Statistik
const ZUSTAND = { alter: '52', pensionsalter: '65', bisAlter: '90', ziel: '7500', e1: '110000', j1: '44', zivil: 'ja', kinder: '12', e2: '70000', j2: '40',
  pk65: '620000', pksatz: '5.6', pkheute: '', pkjahr: '', pkzins: '1.25', a3heute: '80000', a3jahr: '7258', vheute: '60000', vjahr: '6000', rendite: '2', rendite2: '1' };
const b = await chromium.launch({ executablePath: process.env.CH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 620, height: 900 }, deviceScaleFactor: 3 });
await p.addInitScript((z) => localStorage.setItem('aban-pension-v1', JSON.stringify(z)), ZUSTAND);
await p.goto('file://' + APP);
await p.addStyleTag({ content: '.box{border:0}' });
const shot = async (sel) => (await p.locator(sel).first().screenshot()).toString('base64');
const sK = await shot('#out .kacheln');
const sB = await shot('#out');
const sF = await shot('#fahrplan');
const sE = await shot('section.box:nth-of-type(2)');

const CSS = `*{margin:0;box-sizing:border-box}body{width:2400px;height:1800px;background:#f3f5fa;color:#1c2230;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;position:relative}
.pad{padding:120px 150px 0}.k{font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c2410c}
h1{font-family:Georgia,serif;font-size:118px;line-height:1.04;margin-top:30px}h2{font-family:Georgia,serif;font-size:86px;line-height:1.08;margin-top:26px}
.z{color:#c2410c}.s{font-size:48px;line-height:1.35;color:#394052;margin-top:34px;max-width:1500px}
ul{list-style:none;margin-top:56px}li{font-size:50px;line-height:1.3;margin:26px 0;padding-left:70px;position:relative}
li::before{content:"";position:absolute;left:0;top:18px;width:34px;height:34px;border-radius:8px;background:#c2410c}
.band{position:absolute;right:150px;bottom:80px;background:#1c2230;color:#f3f5fa;font-size:40px;font-weight:700;padding:26px 40px;border-radius:14px}
.bild{position:absolute;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(28,34,48,.18);background:#fff;border:1px solid #dde2ec}.bild img{display:block;width:100%}
.teile{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:70px}.teil{background:#fff;border:1px solid #dde2ec;border-radius:24px;padding:40px 46px}
.teil b{display:block;font-size:52px;margin:14px 0 10px}.teil span{font-size:38px;color:#394052;line-height:1.35}.teil span.typ{display:inline-block;font-size:30px;font-weight:800;color:#fff;padding:8px 20px;border-radius:10px}`;
const seite = (x) => `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${x}</body></html>`;
const img = (b64) => `<img src="data:image/png;base64,${b64}">`;
const SEITEN = [
  seite(`<div class="pad" style="width:1150px"><p class="k">Offline-App · Schweiz · 2026</p><h1>Pensions-<span class="z">Check</span> Schweiz</h1>
    <p class="s">Reicht dein Geld nach der Pensionierung? AHV, Pensionskasse und 3a in einem Bild.</p>
    <ul style="margin-top:60px"><li>AHV inklusive 13. Altersrente</li><li>Lücke zu deinem Budget</li><li>Sparrate bis zur Pensionierung</li></ul></div>
    <div class="bild" style="right:130px;top:200px;width:1050px">${img(sK)}</div><div class="band">Sofort-Download</div>`),
  seite(`<div class="pad" style="width:1000px"><p class="k">Dein Ergebnis</p><h2>Alle Quellen <span class="z">auf einen Blick</span></h2>
    <p class="s">AHV nach der Rentenformel, Pensionskasse aus dem Vorsorgeausweis, 3a und Erspartes. Ehepaare mit der gesetzlichen Begrenzung.</p></div>
    <div class="bild" style="right:130px;top:110px;width:1100px;height:1580px">${img(sB)}</div>`),
  seite(`<div class="pad" style="width:1000px"><p class="k">Fahrplan</p><h2>Was du <span class="z">wann</span> tun solltest</h2>
    <p class="s">10 Jahre bis zur Pensionierung: AHV-Konto prüfen, 3a aufteilen, PK-Einkauf, Rente oder Kapital, AHV anmelden.</p></div>
    <div class="bild" style="right:130px;top:110px;width:1100px;height:1580px">${img(sF)}</div>`),
  seite(`<div class="pad" style="width:1000px"><p class="k">Nach Gesetz gerechnet</p><h2>AHV-Rentenformel, <span class="z">Stand 2026</span></h2>
    <p class="s">Art. 34 AHVG, 13. Altersrente (Art. 34ter), Ehepaar-Begrenzung (Art. 35), Splitting, Erziehungsgutschriften, Vorbezug ab 63.</p></div>
    <div class="bild" style="right:130px;top:200px;width:1100px">${img(sE)}</div>`),
  seite(`<div class="pad"><p class="k">Das ist drin</p><h2>Eine Datei, <span class="z">offline</span></h2>
    <div class="teile">${[['1', '#c2410c', 'AHV', 'Rentenformel, 13. Rente, Ehepaare, Teilrenten, Vorbezug.'],
      ['2', '#0f766e', 'Pensionskasse', 'Aus dem Vorsorgeausweis oder hochgerechnet.'],
      ['3', '#64748b', '3a und Vermögen', 'Mit Rendite bis und nach der Pensionierung.'],
      ['4', '#1d4ed8', 'Lücke und Fahrplan', 'Nötiges Kapital, Sparrate, Schritte bis zur Pension.']].map((t) => `<div class="teil"><span class="typ" style="background:${t[1]}">${t[0]}</span><b>${t[2]}</b><span>${t[3]}</span></div>`).join('')}</div></div>`),
];
const q = await b.newPage({ viewport: { width: 2400, height: 1800 } });
for (const [i, x] of SEITEN.entries()) { await q.setContent(x); await q.waitForTimeout(200); await q.screenshot({ path: path.join(ZIEL, 'bilder', `0${i + 1}.png`) }); }
// Anleitung als PDF
const md = fs.readFileSync(path.join(ROOT, 'content/packs/de/pensions-check/ANLEITUNG.md'), 'utf8').replace('`pensions-check.html`', '`Pensions-Check-App.html`');
const inl = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
let html = '', liste = null;
for (const z of md.split('\n')) {
  const m = z.match(/^(\d+\.|-) (.*)/);
  if (m) { const typ = m[1] === '-' ? 'ul' : 'ol'; if (liste !== typ) { if (liste) html += `</${liste}>`; html += `<${typ}>`; liste = typ; } html += `<li>${inl(m[2])}</li>`; continue; }
  if (liste) { html += `</${liste}>`; liste = null; }
  if (/^# /.test(z)) html += `<h1>${inl(z.slice(2))}</h1>`; else if (/^## /.test(z)) html += `<h2>${inl(z.slice(3))}</h2>`; else if (z.trim()) html += `<p>${inl(z)}</p>`;
}
if (liste) html += `</${liste}>`;
await q.setContent(`<html><head><meta charset="utf-8"><style>body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1c2230;line-height:1.55;font-size:12pt}h1{font-family:Georgia,serif;color:#1d4ed8;font-size:24pt}h2{font-size:14pt;margin-top:18pt;color:#c2410c}code{background:#eef1f7;padding:1px 4px;border-radius:3px}li{margin:3pt 0}</style></head><body>${html}<p style="margin-top:24pt;color:#687083;font-size:9pt">© aban news, abannews.com · Planungshilfe, keine Rechtsberatung</p></body></html>`);
await q.pdf({ path: path.join(ZIEL, 'dateien', 'Pensions-Check-Anleitung.pdf'), format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } });
await b.close();
fs.copyFileSync(APP, path.join(ZIEL, 'dateien', 'Pensions-Check-App.html'));
console.log('→ content/etsy/pensions-check: 5 Bilder, 2 Dateien');
