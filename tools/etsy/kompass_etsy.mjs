// Etsy-Paket Finanz-Kompass Schweiz: 5 Bilder (2400×1800) aus der ECHTEN App mit einem Beispielhaushalt,
// Anleitung als PDF, Gesamt-ZIP und Startdatei.
//   python3 tools/kompass/build.py && python3 -c "import sys;sys.path.insert(0,'automation');from build_product_pack import build_single;build_single('finanz-kompass')"
//   node tools/etsy/kompass_etsy.mjs        (Playwright; Chromium über CH=… oder /opt/pw-browsers)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const ROOT = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ZIEL = path.join(ROOT, 'content/etsy/finanz-kompass');
const APP = path.join(ROOT, 'content/packs/de/finanz-kompass/finanz-kompass.html');
const ZIP = path.join(ROOT, 'downloads/packs/finanz-kompass.zip');
if (!fs.existsSync(ZIP)) throw new Error('Zuerst das Paket bauen (siehe Kopfzeile)');

// Beispielhaushalt: Platzhalter-Zahlen, keine Statistik
const heute = new Date(), start = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}`;
const A = (name, betrag, takt, gruppe, wohnen) => ({ name, betrag, takt, gruppe, wohnen: !!wohnen });
const ZUSTAND = { ein: [{ name: 'Nettolohn', betrag: 5600, takt: 'monat' }, { name: '13. Monatslohn', betrag: 0, takt: 'jahr' }],
  aus: [A('Miete inkl. Nebenkosten', 1950, 'monat', 'bedarf', 1), A('Krankenkasse', 420, 'monat', 'bedarf'), A('Steuern', 7200, 'jahr', 'bedarf'),
    A('Franchise und Selbstbehalt', 1000, 'jahr', 'bedarf'), A('Hausrat und Haftpflicht', 300, 'jahr', 'bedarf'), A('Radio- und TV-Gebühr', 335, 'jahr', 'bedarf'),
    A('Lebensmittel und Haushalt', 800, 'monat', 'bedarf'), A('Handy und Internet', 90, 'monat', 'bedarf'), A('ÖV', 90, 'monat', 'bedarf'),
    A('Freizeit und Ausgang', 300, 'monat', 'wunsch'), A('Ferien', 1500, 'jahr', 'wunsch'), A('Säule 3a', 0, 'monat', 'sparen')],
  reserve: 800, start, miete: { netto: '1750', alt: '1.75', fest: '2023-12-01', likalt: '106', likneu: '107.5' },
  schulden: [{ name: 'Kreditkarte', betrag: 4000, zins: 12, rate: 120 }, { name: 'Privatkredit', betrag: 6000, zins: 8.5, rate: 200 }, { name: 'Auto-Leasing', betrag: 15000, zins: 3.9, rate: 350, fest: 'fest' }],
  methode: 'lawine' };

const b = await chromium.launch({ executablePath: process.env.CH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 620, height: 900 }, deviceScaleFactor: 3 });
await p.addInitScript((z) => localStorage.setItem('aban-finanz-kompass-v1', JSON.stringify(z)), ZUSTAND);
await p.goto('file://' + APP);
await p.addStyleTag({ content: '.schritte{display:none!important}.box{border:0}' });
const shot = async (n, sel) => { await p.evaluate((n) => document.querySelector(`nav button[data-go="${n}"]`).click(), n); await p.waitForTimeout(400); return (await p.locator(sel).screenshot()).toString('base64'); };
const s2 = await shot(2, '#m-out');
const s4kopf = await shot(4, '#p-out .kacheln');
const s4zeit = (await p.locator('#p-out .zeit').screenshot()).toString('base64');
const s4plan = (await p.locator('#p-out .plan').screenshot()).toString('base64');
const s1 = await shot(1, '#b-out');

const CSS = `*{margin:0;box-sizing:border-box}body{width:2400px;height:1800px;background:#f4f6f2;color:#1c2321;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;position:relative}
.pad{padding:120px 150px 0}.k{font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#0f766e}
h1{font-family:Georgia,serif;font-size:124px;line-height:1.04;margin-top:30px}h2{font-family:Georgia,serif;font-size:86px;line-height:1.08;margin-top:26px}
.z{color:#0f766e}.s{font-size:48px;line-height:1.35;color:#38423f;margin-top:34px;max-width:1500px}
ul{list-style:none;margin-top:56px}li{font-size:50px;line-height:1.3;margin:26px 0;padding-left:70px;position:relative}
li::before{content:"";position:absolute;left:0;top:18px;width:34px;height:34px;border-radius:8px;background:#0f766e}
.band{position:absolute;right:150px;bottom:80px;background:#1c2321;color:#f4f6f2;font-size:40px;font-weight:700;padding:26px 40px;border-radius:14px}
.bild{position:absolute;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(28,35,33,.18);background:#fff;border:1px solid #dfe5e1}.bild img{display:block;width:100%}
.teile{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:70px}.teil{background:#fff;border:1px solid #dfe5e1;border-radius:24px;padding:40px 46px}
.teil b{display:block;font-size:52px;margin:14px 0 10px}.teil span{font-size:38px;color:#38423f;line-height:1.35}.teil span.typ{color:#fff}.typ{display:inline-block;font-size:30px;font-weight:800;color:#fff;padding:8px 20px;border-radius:10px}`;
const seite = (x) => `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${x}</body></html>`;
const img = (b64) => `<img src="data:image/png;base64,${b64}">`;
const TEILE = [['NEU', '#0f766e', 'Finanz-Kompass', 'Budget, Miete und Schulden in einem Plan mit Daten. Offline-App.'],
  ['1', '#b45309', 'Budget-Plan Schweiz', 'App, Excel-Vorlage (auch Google Tabellen), Anleitung.'],
  ['2', '#b45309', 'Mietzins-Paket', 'Senkung nach VMWG, Termin, Fristen, fertiger Brief.'],
  ['3', '#7c3aed', 'Schulden-Plan Schweiz', 'Lawine oder Schneeball, Monatsplan, Excel-Vorlage.'],
  ['BONUS', '#15803d', 'Hochzeits-Budget-Plan', 'Kosten pro Gast, Zahlungsplan, Excel-Vorlage.']];
const SEITEN = [
  seite(`<div class="pad" style="width:1200px"><p class="k">Offline-App · Excel · Schweiz</p><h1>Finanz-<span class="z">Kompass</span> Schweiz</h1>
    <p class="s">Budget, Miete und Schulden in einem Plan: wann du schuldenfrei bist und wann deine Notreserve voll ist.</p>
    <ul style="margin-top:60px"><li>Rückstellung für Steuern pro Monat</li><li>Mietzinssenkung geprüft</li><li>Schulden nach Lawine oder Schneeball</li></ul></div>
    <div class="bild" style="right:130px;top:130px;width:1020px">${img(s4kopf)}</div><div class="bild" style="right:130px;top:780px;width:1020px">${img(s4zeit)}</div><div class="band">Sofort-Download</div>`),
  seite(`<div class="pad" style="width:1050px"><p class="k">Schritt 4 · Dein Plan</p><h2>Was du ab nächstem Monat tust, <span class="z">mit Datum</span></h2><p class="s">Start-Reserve, Schulden in der richtigen Reihenfolge, volle Notreserve. Zum Ausdrucken.</p></div>
    <div class="bild" style="right:130px;top:110px;width:1020px;height:1580px">${img(s4plan)}</div>`),
  seite(`<div class="pad" style="width:1050px"><p class="k">Schritt 2 · Miete prüfen</p><h2>Steht dir <span class="z">weniger Miete</span> zu?</h2>
    <p class="s">Referenzzins, Teuerung und Kostensteigerungen nach Art. 13 und 16 VMWG. Das Mietzins-Paket schreibt den Brief an den Vermieter.</p></div>
    <div class="bild" style="right:130px;top:560px;width:1050px">${img(s2)}</div>`),
  seite(`<div class="pad"><p class="k">Das ist drin</p><h2>Fünf Werkzeuge, <span class="z">ein Download</span></h2>
    <div class="teile">${TEILE.map((t) => `<div class="teil"><span class="typ" style="background:${t[1]}">${t[0]}</span><b>${t[2]}</b><span>${t[3]}</span></div>`).join('')}</div></div>`),
  seite(`<div class="pad" style="width:1150px"><p class="k">Schritt 1 · Budget</p><h2>Jeder Posten <span class="z">in seinem Takt</span></h2>
    <ul><li>Steuern jährlich, Krankenkasse monatlich</li><li>Dauerauftrag fürs Rückstellungskonto</li><li>Muss, Kann, Sparen im Vergleich</li><li>Deine Zahlen bleiben im Browser</li></ul></div>
    <div class="bild" style="right:130px;top:300px;width:1050px">${img(s1)}</div>`),
];
const q = await b.newPage({ viewport: { width: 2400, height: 1800 } });
for (const [i, h] of SEITEN.entries()) {
  await q.setContent(h); await q.waitForTimeout(200);
  await q.screenshot({ path: path.join(ZIEL, 'bilder', `0${i + 1}.png`) });
}
// Anleitung als PDF (kleiner Markdown-Umsetzer: Überschriften, Listen, fett, Code, Absätze)
const md = fs.readFileSync(path.join(ROOT, 'content/packs/de/finanz-kompass/ANLEITUNG.md'), 'utf8');
const inl = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
let html = '', liste = null;
for (const z of md.split('\n')) {
  const m = z.match(/^(\d+\.|-) (.*)/);
  if (m) { const typ = m[1] === '-' ? 'ul' : 'ol'; if (liste !== typ) { if (liste) html += `</${liste}>`; html += `<${typ}>`; liste = typ; } html += `<li>${inl(m[2])}</li>`; continue; }
  if (liste) { html += `</${liste}>`; liste = null; }
  if (/^# /.test(z)) html += `<h1>${inl(z.slice(2))}</h1>`; else if (/^## /.test(z)) html += `<h2>${inl(z.slice(3))}</h2>`; else if (z.trim()) html += `<p>${inl(z)}</p>`;
}
if (liste) html += `</${liste}>`;
await q.setContent(`<html><head><meta charset="utf-8"><style>body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1c2321;line-height:1.55;font-size:12pt}h1{font-family:Georgia,serif;color:#0f766e;font-size:24pt}h2{font-size:14pt;margin-top:18pt;color:#0f766e}code{background:#eef3f0;padding:1px 4px;border-radius:3px}li{margin:3pt 0}</style></head><body>${html}<p style="margin-top:24pt;color:#69736f;font-size:9pt">© aban news, abannews.com · Planungshilfe, keine Finanz- oder Rechtsberatung</p></body></html>`);
await q.pdf({ path: path.join(ZIEL, 'dateien', 'Finanz-Kompass-Anleitung.pdf'), format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } });
await b.close();
fs.copyFileSync(ZIP, path.join(ZIEL, 'dateien', 'Finanz-Kompass-Schweiz-alle-Dateien.zip'));
fs.copyFileSync(APP, path.join(ZIEL, 'dateien', 'Finanz-Kompass-App.html'));
console.log('→ content/etsy/finanz-kompass: 5 Bilder, 3 Dateien');
