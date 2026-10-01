// Etsy-Paket Umzugs-Paket Schweiz: 5 Bilder (2400×1800) aus der ECHTEN App mit einem Beispiel, Anleitung als PDF, App-Datei.
//   python3 tools/umzug/build.py && node tools/etsy/umzug_etsy.mjs   (Playwright; ROOT=… wenn aus anderem Ordner)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const ROOT = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ZIEL = path.join(ROOT, 'content/etsy/umzugs-paket');
const APP = path.join(ROOT, 'content/packs/de/umzugs-paket/umzugs-paket.html');

// Beispiel: Platzhalter-Namen, Datum relativ zu heute (Brief kommt in 3 Wochen an)
const h = new Date(); h.setDate(h.getDate() + 21);
const iso = (t) => t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
const ZUSTAND = { k: { zugang: iso(h), frist: '3', miete: '1850', auszug: '', termine: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  b: { ich: 'Anna Muster\nMusterweg 5\n3000 Bern', verm: 'Muster Verwaltung AG\nPostfach\n3001 Bern', objekt: '3½-Zimmer-Wohnung, 2. OG links, Musterweg 5, 3000 Bern', zweit: '', rolle: 'mit', ort: 'Bern', nach: '' },
  p: { umzug: '', abgabe: '', fertig: { offerten: true, reinigung: true } }, a: { fertig: { 'Arbeitgeber (Lohnbuchhaltung)': true, 'Bank und Kreditkarten': true, 'Post: Nachsendeauftrag': true }, eigen: [] },
  g: { mieter: 'Anna Muster', wohnung: 'Musterweg 5, 3000 Bern, 2. OG links', datum: '', schluessel: '6', strom: '', wasser: '', z: { '0-0': { s: 'abn', n: 'Gebrauchsspuren beim Herd' }, '0-1': { s: 'ok' }, '1-0': { s: 'ok' } } } };

const b = await chromium.launch({ executablePath: process.env.CH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 620, height: 900 }, deviceScaleFactor: 3 });
await p.addInitScript((z) => localStorage.setItem('aban-umzug-v1', JSON.stringify(z)), ZUSTAND);
await p.goto('file://' + APP);
await p.addStyleTag({ content: '.tabs{display:none!important}.box{border:0}' });
const tab = (t) => p.evaluate((t) => document.querySelector(`button[data-tab="${t}"]`).click(), t);
const shot = async (sel, opt) => (await p.locator(sel).first().screenshot(opt)).toString('base64');
const sK = await shot('#k-out .kacheln');
const sB = await shot('#briefbox');
await tab('plan'); await p.waitForTimeout(200);
const sP = (await p.screenshot({ clip: await p.locator('#p-liste').boundingBox().then((x) => ({ x: x.x, y: x.y, width: x.width, height: Math.min(x.height, 1100) })) })).toString('base64');
await tab('abgabe'); await p.waitForTimeout(200);
const sG = (await p.screenshot({ clip: await p.locator('#s-abgabe').boundingBox().then((x) => ({ x: x.x, y: x.y, width: x.width, height: Math.min(x.height, 1150) })) })).toString('base64');

const CSS = `*{margin:0;box-sizing:border-box}body{width:2400px;height:1800px;background:#f3f5fa;color:#1c2230;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;position:relative}
.pad{padding:120px 150px 0}.k{font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1d4ed8}
h1{font-family:Georgia,serif;font-size:118px;line-height:1.04;margin-top:30px}h2{font-family:Georgia,serif;font-size:86px;line-height:1.08;margin-top:26px}
.z{color:#1d4ed8}.s{font-size:48px;line-height:1.35;color:#394052;margin-top:34px;max-width:1500px}
ul{list-style:none;margin-top:56px}li{font-size:50px;line-height:1.3;margin:26px 0;padding-left:70px;position:relative}
li::before{content:"";position:absolute;left:0;top:18px;width:34px;height:34px;border-radius:8px;background:#1d4ed8}
.band{position:absolute;right:150px;bottom:80px;background:#1c2230;color:#f3f5fa;font-size:40px;font-weight:700;padding:26px 40px;border-radius:14px}
.bild{position:absolute;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(28,34,48,.18);background:#fff;border:1px solid #dde2ec}.bild img{display:block;width:100%}
.teile{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:70px}.teil{background:#fff;border:1px solid #dde2ec;border-radius:24px;padding:40px 46px}
.teil b{display:block;font-size:52px;margin:14px 0 10px}.teil span{font-size:38px;color:#394052;line-height:1.35}.teil span.typ{display:inline-block;font-size:30px;font-weight:800;color:#fff;padding:8px 20px;border-radius:10px}`;
const seite = (x) => `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${x}</body></html>`;
const img = (b64) => `<img src="data:image/png;base64,${b64}">`;
const SEITEN = [
  seite(`<div class="pad" style="width:1150px"><p class="k">Offline-App · Schweiz · Deutsch</p><h1>Umzugs-<span class="z">Paket</span> Schweiz</h1>
    <p class="s">Wohnung richtig kündigen, Umzug planen, Wohnung sauber abgeben.</p>
    <ul style="margin-top:60px"><li>Kündigungstermin und letzter Zugangstag</li><li>Fertiger Kündigungsbrief</li><li>Umzugsplan mit Daten</li></ul></div>
    <div class="bild" style="right:130px;top:200px;width:1050px">${img(sK)}</div><div class="band">Sofort-Download</div>`),
  seite(`<div class="pad" style="width:1000px"><p class="k">Kündigungsbrief</p><h2>Ausfüllen, drucken, <span class="z">unterschreiben</span></h2>
    <p class="s">Nach Art. 266l OR, mit Mitmieter oder Zustimmung bei der Familienwohnung und Nachmieter-Absatz.</p></div>
    <div class="bild" style="right:130px;top:110px;width:1100px;height:1580px">${img(sB)}</div>`),
  seite(`<div class="pad" style="width:1000px"><p class="k">Umzugsplan</p><h2>Jede Aufgabe <span class="z">mit Datum</span></h2>
    <p class="s">Rückwärts ab deinem Umzugstag: Offerten, Endreinigung, Parkfeld, Post, Gemeinde, Kaution. Abhaken, was erledigt ist.</p></div>
    <div class="bild" style="right:130px;top:110px;width:1100px;height:1580px">${img(sP)}</div>`),
  seite(`<div class="pad" style="width:1000px"><p class="k">Wohnungsabgabe</p><h2>Protokoll <span class="z">Raum für Raum</span></h2>
    <p class="s">Zählerstände, Schlüssel, Zustand jedes Raums. Zum Ausdrucken für den Abgabetermin.</p></div>
    <div class="bild" style="right:130px;top:110px;width:1100px;height:1580px">${img(sG)}</div>`),
  seite(`<div class="pad"><p class="k">Das ist drin</p><h2>Vier Werkzeuge, <span class="z">eine Datei</span></h2>
    <div class="teile">${[['1', '#1d4ed8', 'Kündigung', 'Nächstmöglicher Termin, letzter Zugangstag, Postaufgabe, Warnungen.'],
      ['2', '#1d4ed8', 'Kündigungsbrief', 'Fertig formuliert, mit Mitmieter und Nachmieter-Absatz.'],
      ['3', '#b45309', 'Umzugsplan + Adressen', '18 Aufgaben mit Datum, 18 Adressänderungen zum Abhaken.'],
      ['4', '#15803d', 'Abgabeprotokoll', 'Raum für Raum, Zählerstände, Schlüssel, Unterschriften.']].map((t) => `<div class="teil"><span class="typ" style="background:${t[1]}">${t[0]}</span><b>${t[2]}</b><span>${t[3]}</span></div>`).join('')}</div></div>`),
];
const q = await b.newPage({ viewport: { width: 2400, height: 1800 } });
for (const [i, x] of SEITEN.entries()) { await q.setContent(x); await q.waitForTimeout(200); await q.screenshot({ path: path.join(ZIEL, 'bilder', `0${i + 1}.png`) }); }
// Anleitung als PDF
const md = fs.readFileSync(path.join(ROOT, 'content/packs/de/umzugs-paket/ANLEITUNG.md'), 'utf8').replace('`umzugs-paket.html`', '`Umzugs-Paket-App.html`');
const inl = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
let html = '', liste = null;
for (const z of md.split('\n')) {
  const m = z.match(/^(\d+\.|-) (.*)/);
  if (m) { const typ = m[1] === '-' ? 'ul' : 'ol'; if (liste !== typ) { if (liste) html += `</${liste}>`; html += `<${typ}>`; liste = typ; } html += `<li>${inl(m[2])}</li>`; continue; }
  if (liste) { html += `</${liste}>`; liste = null; }
  if (/^# /.test(z)) html += `<h1>${inl(z.slice(2))}</h1>`; else if (/^## /.test(z)) html += `<h2>${inl(z.slice(3))}</h2>`; else if (z.trim()) html += `<p>${inl(z)}</p>`;
}
if (liste) html += `</${liste}>`;
await q.setContent(`<html><head><meta charset="utf-8"><style>body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1c2230;line-height:1.55;font-size:12pt}h1{font-family:Georgia,serif;color:#1d4ed8;font-size:24pt}h2{font-size:14pt;margin-top:18pt;color:#1d4ed8}code{background:#eef1f7;padding:1px 4px;border-radius:3px}li{margin:3pt 0}</style></head><body>${html}<p style="margin-top:24pt;color:#687083;font-size:9pt">© aban news, abannews.com · Planungshilfe, keine Rechtsberatung</p></body></html>`);
await q.pdf({ path: path.join(ZIEL, 'dateien', 'Umzugs-Paket-Anleitung.pdf'), format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } });
await b.close();
fs.copyFileSync(APP, path.join(ZIEL, 'dateien', 'Umzugs-Paket-App.html'));
console.log('→ content/etsy/umzugs-paket: 5 Bilder, 2 Dateien');
