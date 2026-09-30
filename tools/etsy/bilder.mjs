// Etsy-Produktbilder (je 5 × 2400×1800, 4:3) für Budget-Plan und Schulden-Plan.
// Echte Screenshots der Offline-Apps + Excel-Vorschau mit den von LibreOffice nachgerechneten Werten.
//   python3 tools/etsy/budget_xlsx.py && python3 tools/etsy/schulden_xlsx.py
//   (LibreOffice-Neuberechnung → /tmp/lo/out/*.xlsx, Werte → /tmp/lo/werte.json, siehe ETSY-PAKETE.md)
//   CH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/etsy/bilder.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const W = JSON.parse(fs.readFileSync(process.env.WERTE || '/tmp/lo/werte.json', 'utf8'));
const chf = (x) => 'CHF ' + Math.round(+x).toLocaleString('de-CH');
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const CSS = `*{margin:0;box-sizing:border-box}
body{width:2400px;height:1800px;background:#fbf6ea;color:#1f2937;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;position:relative}
.pad{padding:130px 150px}
.k{font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b45309}
h1{font-family:Georgia,"Times New Roman",serif;font-size:132px;line-height:1.04;letter-spacing:-.01em;margin-top:36px}
h2{font-family:Georgia,"Times New Roman",serif;font-size:96px;line-height:1.08;margin-top:28px}
.z{color:#b45309}
.s{font-size:50px;line-height:1.35;color:#374151;margin-top:40px;max-width:1500px}
ul{list-style:none;margin-top:60px}li{font-size:52px;line-height:1.3;margin:26px 0;padding-left:70px;position:relative}
li::before{content:"";position:absolute;left:0;top:18px;width:34px;height:34px;border-radius:8px;background:#b45309}
.marke{position:absolute;left:150px;bottom:90px;font-size:38px;color:#6b7280;font-weight:600}
.band{position:absolute;right:150px;bottom:80px;background:#1f2937;color:#fbf6ea;font-size:40px;font-weight:700;padding:26px 40px;border-radius:14px}
.shot{position:absolute;border-radius:28px;box-shadow:0 30px 80px rgba(31,41,55,.25);border:1px solid #e7dfd2;background:#fff;overflow:hidden}
.shot img{display:block;width:100%}
table.xl{border-collapse:collapse;font-size:30px;background:#fff;width:100%}
table.xl th{background:#b45309;color:#fff;text-align:right;padding:16px 18px;font-weight:700}
table.xl th:first-child,table.xl td:first-child{text-align:left}
table.xl td{padding:14px 18px;border-bottom:1px solid #e7dfd2;text-align:right;font-variant-numeric:tabular-nums}
table.xl td.in{background:#fff2b8}
table.xl tr.sum td{background:#fef3c7;font-weight:700}
.xlrahmen{position:absolute;border:1px solid #d6cdbd;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(31,41,55,.2);background:#fff}
.xlkopf{background:#1f6f43;color:#fff;font-size:30px;padding:18px 26px;font-weight:600}
.tabs{display:flex;gap:6px;background:#f1ece2;padding:10px 20px 0}.tabs span{font-size:26px;padding:12px 24px;background:#e7dfd2;border-radius:10px 10px 0 0;color:#374151}.tabs span.on{background:#fff;font-weight:700}
.dateien{display:flex;gap:50px;margin-top:80px}
.datei{flex:1;background:#fff;border:1px solid #e7dfd2;border-radius:24px;padding:50px}
.datei b{display:block;font-size:54px;margin:18px 0 14px}.datei span{font-size:40px;color:#374151;line-height:1.35}
.typ{display:inline-block;font-size:34px;font-weight:800;color:#fff;padding:10px 22px;border-radius:10px}
.schritt{display:flex;gap:40px;align-items:flex-start;margin:44px 0}.nr{flex:0 0 110px;height:110px;border-radius:999px;background:#b45309;color:#fff;font-size:60px;font-weight:800;display:flex;align-items:center;justify-content:center}
.schritt b{font-size:56px;display:block}.schritt span{font-size:44px;color:#374151;line-height:1.35}`;

const seite = (inhalt) => `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${inhalt}
<div class="marke">abannews.com</div></body></html>`;

async function appShot(browser, datei, ziel) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + datei);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForTimeout(400);
  const el = await p.$('#ergebnis');
  await el.screenshot({ path: ziel });
  await p.close();
  return 'data:image/png;base64,' + fs.readFileSync(ziel).toString('base64');
}

const PRODUKTE = {
  'budget-plan': {
    app: 'content/packs/de/budget-plan/budget-plan.html',
    bilder: (shot) => [
      seite(`<div class="pad" style="width:1250px"><p class="k">Excel · Sheets · App</p>
        <h1>Budget-Plan <span class="z">Schweiz</span></h1>
        <p class="s">Nie mehr von der Steuerrechnung überrascht. Jahresrechnungen automatisch auf den Monat umgerechnet.</p></div>
        <div class="shot" style="right:120px;top:150px;width:950px"><img src="${shot}"></div>
        <div class="band">Sofort-Download</div>`),
      seite(`<div class="pad"><p class="k">Das Herzstück</p><h2>Wie viel du <span class="z">jeden Monat</span><br>zurücklegen musst</h2>
        <p class="s">Steuern, Franchise, Versicherungen, Ferien: der Plan rechnet sie auf den Monat um und nennt den Betrag für deinen Dauerauftrag.</p></div>
        <div class="shot" style="left:150px;right:150px;top:760px;bottom:190px"><img src="${shot}" style="margin-top:-40px"></div>`),
      seite(`<div class="pad"><p class="k">Excel-Vorlage</p><h2>Alles Formeln. Nur die <span class="z">gelben Felder</span> ausfüllen.</h2></div>
        <div class="xlrahmen" style="left:150px;right:150px;top:600px"><div class="xlkopf">Budget-Plan-Schweiz.xlsx</div>
        <div class="tabs"><span class="on">Budget</span><span>Jahres-Tracker</span><span>Anleitung</span></div>
        <table class="xl"><tr><th>Bezeichnung</th><th>Betrag</th><th>Takt</th><th>Art</th><th>pro Monat</th><th>davon zurücklegen</th></tr>
        ${W.budget_aus.slice(0, 9).map((r) => `<tr><td class="in">${esc(r[0])}</td><td class="in">${chf(r[1])}</td><td class="in">${esc(r[2])}</td><td class="in">${esc(r[3])}</td><td>${chf(r[5])}</td><td>${chf(r[6])}</td></tr>`).join('')}
        <tr class="sum"><td>${esc(W.budget_erg[3][0])}</td><td></td><td></td><td></td><td></td><td>${chf(W.budget_erg[3][1])}</td></tr></table></div>`),
      seite(`<div class="pad"><p class="k">Das bekommst du</p><h2>3 Dateien, sofort zum Download</h2>
        <div class="dateien">
        <div class="datei"><span class="typ" style="background:#1f6f43">XLSX</span><b>Excel-Vorlage</b><span>Budget, Jahres-Tracker mit Soll/Ist, Auswertung. Läuft auch in Google Sheets.</span></div>
        <div class="datei"><span class="typ" style="background:#b45309">HTML</span><b>Offline-App</b><span>Im Browser öffnen, auch auf dem Handy. Kein Konto, keine Anmeldung, deine Zahlen bleiben bei dir.</span></div>
        <div class="datei"><span class="typ" style="background:#1f2937">PDF</span><b>Anleitung</b><span>In 10 Minuten startklar. Rückstellungskonto, Steuern schätzen, Notreserve.</span></div>
        </div></div>`),
      seite(`<div class="pad"><p class="k">Für die Schweiz gemacht</p><h2>Was andere Budget-Vorlagen vergessen</h2>
        <ul><li><b>Steuern</b> kommen als Rechnung, nicht als Lohnabzug: der Plan legt sie monatlich zurück</li>
        <li><b>Franchise und Selbstbehalt</b> der Krankenkasse als Jahresposten</li>
        <li><b>13. Monatslohn</b> und Radio- und TV-Gebühr richtig verteilt</li>
        <li><b>Muss / Kann / Sparen</b> mit der 50/30/20-Regel und Warnung, wenn die Miete über einem Drittel liegt</li>
        <li><b>Notreserve:</b> Ziel aus deinen festen Kosten und wie viele Monate bis dahin</li></ul></div>`),
    ],
  },
  'schulden-plan': {
    app: 'content/packs/de/schulden-plan/schulden-plan.html',
    bilder: (shot) => [
      seite(`<div class="pad" style="width:1250px"><p class="k">Excel · Sheets · App</p>
        <h1>Schulden-Plan <span class="z">Schweiz</span></h1>
        <p class="s">Wann bist du schuldenfrei? Lawine oder Schneeball, Monat für Monat durchgerechnet.</p></div>
        <div class="shot" style="right:120px;top:150px;width:950px"><img src="${shot}"></div>
        <div class="band">Sofort-Download</div>`),
      seite(`<div class="pad"><p class="k">Das Ergebnis</p><h2>Dein schuldenfrei-Datum und<br>wie viel Zins du <span class="z">sparst</span></h2></div>
        <div class="xlrahmen" style="left:150px;width:1000px;top:640px"><div class="xlkopf">Schulden-Plan-Schweiz.xlsx · Plan</div>
        <table class="xl">${W.s_erg.slice(0, 6).map((r) => `<tr class="sum"><td>${esc(r[0])}</td><td>${typeof r[1] === 'number' && r[1] > 100 ? chf(r[1]) : esc(r[1])}</td></tr>`).join('')}</table></div>
        <div class="shot" style="right:150px;top:640px;width:900px"><img src="${shot}"></div>`),
      seite(`<div class="pad"><p class="k">Monatsplan</p><h2>Jede Schuld, jeder Monat. Frei gewordene Raten <span class="z">rollen weiter</span>.</h2></div>
        <div class="xlrahmen" style="left:150px;right:150px;top:700px"><div class="xlkopf">Schulden-Plan-Schweiz.xlsx · Monatsplan (Restschuld am Monatsende)</div>
        <table class="xl"><tr><th>Monat</th>${W.s_namen.map((n) => `<th>${esc(n)}</th>`).join('')}</tr>
        ${W.s_monate.slice(0, 9).map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((x) => `<td>${+x === 0 ? '<b style="color:#15803d">getilgt</b>' : chf(x)}</td>`).join('')}</tr>`).join('')}</table></div>`),
      seite(`<div class="pad"><p class="k">Das bekommst du</p><h2>3 Dateien, sofort zum Download</h2>
        <div class="dateien">
        <div class="datei"><span class="typ" style="background:#1f6f43">XLSX</span><b>Excel-Vorlage</b><span>Bis 8 Schulden, Monatsplan über 30 Jahre, Vergleich Lawine / Schneeball / nur Mindestraten.</span></div>
        <div class="datei"><span class="typ" style="background:#b45309">HTML</span><b>Offline-App</b><span>Dazu: tilgen oder investieren? Mit der Rendite, ab der Investieren gewinnt.</span></div>
        <div class="datei"><span class="typ" style="background:#1f2937">PDF</span><b>Anleitung</b><span>Lawine oder Schneeball, Schuldzinsabzug, Leasing, kostenlose Beratung.</span></div>
        </div></div>`),
      seite(`<div class="pad"><p class="k">So einfach geht's</p><h2>In 3 Minuten zu deinem Plan</h2>
        <div class="schritt"><div class="nr">1</div><div><b>Schulden eintragen</b><span>Betrag, Zins aus dem Vertrag, heutige Rate. Kreditkarte, Kleinkredit, Leasing, Darlehen.</span></div></div>
        <div class="schritt"><div class="nr">2</div><div><b>Extra-Betrag wählen</b><span>Was du zusätzlich zahlen kannst. Auch CHF 50 im Monat verkürzen die Laufzeit spürbar.</span></div></div>
        <div class="schritt"><div class="nr">3</div><div><b>Plan ablesen</b><span>Schuldenfrei-Datum, gesparte Zinsen, und eine Warnung, wenn eine Rate nicht einmal die Zinsen deckt.</span></div></div></div>`),
    ],
  },
};

const browser = await chromium.launch({ executablePath: process.env.CH });
for (const [name, prod] of Object.entries(PRODUKTE)) {
  const dir = path.join(ROOT, 'content/etsy', name, 'bilder');
  fs.mkdirSync(dir, { recursive: true });
  const shot = await appShot(browser, path.join(ROOT, prod.app), '/tmp/lo/app-' + name + '.png');
  const page = await browser.newPage({ viewport: { width: 2400, height: 1800 } });
  for (const [i, html] of prod.bilder(shot).entries()) {
    await page.setContent(html);
    await page.waitForTimeout(150);
    const ueber = await page.evaluate(() => [...document.querySelectorAll('.shot,.xlrahmen,.pad')].some((e) => e.getBoundingClientRect().bottom > 1800));
    const ziel = path.join(dir, `0${i + 1}.png`);
    await page.screenshot({ path: ziel });
    console.log(name, `0${i + 1}.png`, ueber ? '⚠ ragt über den Rand' : 'ok');
  }
  await page.close();
}
await browser.close();
