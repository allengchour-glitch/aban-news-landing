// Etsy-Pakete Hochzeits-Budget (DE) und Wedding Budget Planner (EN): 5 Bilder (2400×1800) + Kurzanleitung als PDF.
// Zahlen kommen aus tools/hochzeit/engine.js mit den Beispielwerten der Excel-Vorlage (gleiche Rechnung, per LibreOffice geprüft).
//   CH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/etsy/hochzeit_etsy.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const E = require(path.join(ROOT, 'tools/hochzeit/engine.js'));

const heute = new Date(); const iso = (d) => d.toISOString().slice(0, 10);
const datum = iso(new Date(heute.getFullYear() + 1, heute.getMonth(), 15, 12));
const P = (n, b, g, a, m) => ({ name: n, betrag: b, proGast: !!g, anzahlung: a, anzahlungMonate: m });
const DATEN = {
  de: [P('Location / Saalmiete', 3000, 0, .5, 12), P('Essen', 120, 1, .3, 3), P('Getränke', 45, 1, 0, 0), P('Apéro', 25, 1, 0, 0), P('Hochzeitstorte', 10, 1, .3, 2), P('Fotografie', 3500, 0, .3, 9), P('Musik / DJ', 2000, 0, .3, 6), P('Kleid und Anzug', 3200, 0, .5, 8), P('Ringe', 2500, 0, 1, 3), P('Blumen und Deko', 1800, 0, .3, 4), P('Einladungen und Papeterie', 8, 1, 1, 5), P('Zivilstandsamt', 350, 0, 1, 2), P('Reserve für Unvorhergesehenes', 2000, 0, 0, 0)],
  en: [P('Venue', 3000, 0, .5, 12), P('Food', 120, 1, .3, 3), P('Drinks', 45, 1, 0, 0), P('Cocktail hour', 25, 1, 0, 0), P('Wedding cake', 10, 1, .3, 2), P('Photographer', 3500, 0, .3, 9), P('Music / DJ', 2000, 0, .3, 6), P('Dress and suit', 3200, 0, .5, 8), P('Rings', 2500, 0, 1, 3), P('Flowers and decor', 1800, 0, .3, 4), P('Invitations and stationery', 8, 1, 1, 5), P('Marriage license / officiant', 350, 0, 1, 2), P('Buffer for surprises', 2000, 0, 0, 0)],
};
const T = {
  de: { dir: 'content/etsy/hochzeits-budget', bilder: 'bilder', dateien: 'dateien', xlsx: 'Hochzeits-Budget.xlsx', pdf: 'Hochzeits-Budget-Anleitung.pdf', loc: 'de-CH',
    k: 'Excel · Google Tabellen · Offline-App', h1: 'Hochzeits-<span class="z">Budget</span>', s1: 'Kosten pro Gast, jede Anzahlung mit Datum und die Sparrate bis zum grossen Tag.',
    erg: ['Kosten total', 'pro Gast', 'Übrig im Budget', 'Jeder Gast mehr', 'Gäste im Budget', 'Nötige Sparrate / Monat'], band: 'Sofort-Download',
    k2: 'Pro Gast oder Pauschale', h2: 'Gelbe Felder ausfüllen. <span class="z">Den Rest rechnet die Vorlage.</span>', sp: ['Posten', 'Betrag', 'pro Gast', 'Anzahlung', 'Kosten'], ja: 'ja', nein: '–',
    k3: 'Zahlungsplan', h3: 'Wann welche Anzahlung fällig wird und <span class="z">ob euer Geld reicht</span>', pp: ['Monat', 'fällig', 'bis dann', 'angespart', 'Lücke / Reserve'],
    k4: 'Der grösste Hebel', h4: 'Was die Vorlage für euch rechnet', li: ['<b>Gäste-Hebel:</b> was jeder zusätzliche Gast kostet und wie viele ins Budget passen', '<b>Anzahlungen:</b> Prozent und Monate vorher aus der Offerte, schon Bezahltes wird abgezogen', '<b>Sparrate,</b> die jede einzelne Zahlung pünktlich deckt, nicht nur die Summe am Ende', '<b>Warnung in Rot,</b> sobald mit eurer Rate in einem Monat Geld fehlt', '<b>Jede Währung:</b> CHF, €, $: einfach eure Zahlen eintragen'],
    k5: 'Das bekommt ihr', h5: '3 Dateien, sofort zum Download', f: [['XLSX', '#1f6f43', 'Excel-Vorlage', 'Budget und Zahlungsplan, nur Formeln. Öffnet in Excel und Google Tabellen.'], ['APP', '#b45309', 'Offline-App', 'Doppelklick, läuft im Browser, auch auf dem Handy. Kein Konto.'], ['PDF', '#1f2937', 'Anleitung', 'Start in 15 Minuten, Gästeliste, Anzahlungen, Sparkonto.']] },
  en: { dir: 'content/etsy/en/wedding-budget-planner', bilder: 'images', dateien: 'files', xlsx: 'Wedding-Budget-Planner.xlsx', pdf: 'Wedding-Budget-Planner-Guide.pdf', loc: 'en-US',
    k: 'Excel · Google Sheets', h1: 'Wedding <span class="z">Budget</span> Planner', s1: 'Cost per guest, every deposit with its due date and the monthly savings to be ready on the day.',
    erg: ['Total cost', 'per guest', 'Left in budget', 'Each extra guest', 'Guests within budget', 'Savings needed / month'], band: 'Instant download',
    k2: 'Per guest or flat fee', h2: 'Fill in the yellow cells. <span class="z">The template does the rest.</span>', sp: ['Item', 'Amount', 'per guest', 'Deposit', 'Cost'], ja: 'yes', nein: '–',
    k3: 'Payment plan', h3: 'When each deposit is due and <span class="z">whether your savings keep up</span>', pp: ['Month', 'due', 'due until then', 'saved by then', 'gap / buffer'],
    k4: 'Your biggest lever', h4: 'What the planner works out for you', li: ['<b>Guest lever:</b> what every extra guest costs and how many fit your budget', '<b>Deposits:</b> percentage and months ahead from each quote, amounts already paid are deducted', '<b>Monthly savings</b> that cover every single payment on time, not just the total', '<b>Red warning</b> as soon as your savings fall short in any month', '<b>Any currency:</b> $, €, £: just type your numbers'],
    k5: 'What you get', h5: '2 files, instant download', f: [['XLSX', '#1f6f43', 'Budget spreadsheet', 'Budget and payment plan, formulas only. Opens in Excel and Google Sheets.'], ['PDF', '#1f2937', 'Quick-start guide', 'Set up in 15 minutes: guest list, deposits, savings account.']] },
};
const CSS = `*{margin:0;box-sizing:border-box}body{width:2400px;height:1800px;background:#fbf6ea;color:#1f2937;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;position:relative}
.pad{padding:120px 150px 0}.k{font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b45309}
h1{font-family:Georgia,serif;font-size:124px;line-height:1.04;margin-top:30px}h2{font-family:Georgia,serif;font-size:88px;line-height:1.08;margin-top:26px}
.z{color:#b45309}.s{font-size:48px;line-height:1.35;color:#374151;margin-top:34px;max-width:1500px}
ul{list-style:none;margin-top:56px}li{font-size:52px;line-height:1.3;margin:26px 0;padding-left:70px;position:relative}
li::before{content:"";position:absolute;left:0;top:18px;width:34px;height:34px;border-radius:8px;background:#b45309}
.band{position:absolute;right:150px;bottom:80px;background:#1f2937;color:#fbf6ea;font-size:40px;font-weight:700;padding:26px 40px;border-radius:14px}
.xl{position:absolute;border:1px solid #d6cdbd;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(31,41,55,.2);background:#fff}
.xlkopf{background:#1f6f43;color:#fff;font-size:30px;padding:18px 26px;font-weight:600}
table{border-collapse:collapse;font-size:32px;width:100%}th{background:#b45309;color:#fff;text-align:right;padding:16px 18px}th:first-child,td:first-child{text-align:left}
td{padding:13px 18px;border-bottom:1px solid #e7dfd2;text-align:right;font-variant-numeric:tabular-nums}td.in{background:#fff2b8}tr.sum td{background:#fef3c7;font-weight:700}tr.rot td{color:#b91c1c;font-weight:700}
.dateien{display:flex;gap:50px;margin-top:80px}.datei{flex:1;background:#fff;border:1px solid #e7dfd2;border-radius:24px;padding:50px}
.datei b{display:block;font-size:54px;margin:18px 0 14px}.datei span{font-size:40px;color:#374151;line-height:1.35}.typ{display:inline-block;font-size:34px;font-weight:800;color:#fff;padding:10px 22px;border-radius:10px}`;
const seite = (x) => `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${x}</body></html>`;

function bilder(sp) {
  const t = T[sp], posten = DATEN[sp], n = (x) => Math.round(x).toLocaleString(t.loc);
  const r = E.auswerten({ gaeste: 80, budget: 35000, posten, datum, heute: iso(heute), gespart: 6000, sparenMonat: 1500 });
  const werte = [n(r.total), n(r.proGast), n(r.rest), n(r.proZusatzgast), String(r.maxGaeste), n(Math.ceil(r.sparrateNoetig))];
  // Monatsplan wie im Excel-Blatt
  const mon = []; let kum = 0;
  for (let m = 0; m <= r.monateBis; m++) {
    const d = new Date(heute.getFullYear(), heute.getMonth() + m, 1);
    const f = r.zahlungen.filter((z) => { const x = new Date(z.datum); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }).reduce((a, z) => a + z.betrag, 0);
    kum += f; const spar = 6000 + 1500 * m;
    if (f > 0) mon.push([d.toLocaleDateString(t.loc, { month: 'short', year: 'numeric' }), n(f), n(kum), n(spar), n(spar - kum), spar - kum < 0]);
  }
  return [
    seite(`<div class="pad" style="width:1150px"><p class="k">${t.k}</p><h1>${t.h1}</h1><p class="s">${t.s1}</p><ul style="margin-top:70px">${t.li.slice(0, 3).map((x) => `<li style="font-size:46px">${x}</li>`).join('')}</ul></div>
      <div class="xl" style="right:110px;top:180px;width:1050px"><div class="xlkopf">${t.xlsx}</div><table>${t.erg.map((e, i) => `<tr class="sum"><td>${e}</td><td>${werte[i]}</td></tr>`).join('')}</table></div><div class="band">${t.band}</div>`),
    seite(`<div class="pad"><p class="k">${t.k2}</p><h2>${t.h2}</h2></div><div class="xl" style="left:150px;right:150px;top:560px"><div class="xlkopf">${t.xlsx}</div>
      <table><tr>${t.sp.map((x) => `<th>${x}</th>`).join('')}</tr>${posten.slice(0, 9).map((p) => `<tr><td class="in">${p.name}</td><td class="in">${n(p.betrag)}</td><td class="in">${p.proGast ? t.ja : t.nein}</td><td class="in">${Math.round(p.anzahlung * 100)} %</td><td>${n(E.kosten(p, 80))}</td></tr>`).join('')}</table></div>`),
    seite(`<div class="pad"><p class="k">${t.k3}</p><h2>${t.h3}</h2></div><div class="xl" style="left:150px;right:150px;top:600px"><div class="xlkopf">${t.xlsx}</div>
      <table><tr>${t.pp.map((x) => `<th>${x}</th>`).join('')}</tr>${mon.slice(-9).map((z) => `<tr${z[5] ? ' class="rot"' : ''}><td>${z[0]}</td><td>${z[1]}</td><td>${z[2]}</td><td>${z[3]}</td><td>${z[4]}</td></tr>`).join('')}</table></div>`),
    seite(`<div class="pad"><p class="k">${t.k4}</p><h2>${t.h4}</h2><ul>${t.li.map((x) => `<li>${x}</li>`).join('')}</ul></div>`),
    seite(`<div class="pad"><p class="k">${t.k5}</p><h2>${t.h5}</h2><div class="dateien">${t.f.map((d) => `<div class="datei"><span class="typ" style="background:${d[1]}">${d[0]}</span><b>${d[2]}</b><span>${d[3]}</span></div>`).join('')}</div></div>`),
  ];
}

const GUIDE = {
  de: fs.readFileSync(path.join(ROOT, 'content/packs/de/hochzeits-budget/ANLEITUNG.md'), 'utf8').replace('`hochzeits-budget.html`', '`Hochzeits-Budget-App.html`'),
  en: `# Wedding Budget Planner — quick-start guide

Open \`Wedding-Budget-Planner.xlsx\` in Excel, or upload it to Google Drive and open it with Google Sheets. Only fill in the yellow cells.

## Set up in 15 minutes

1. **Basics:** guests, total budget, wedding date, what you have saved and what you can save per month.
2. **Items:** the sample items are placeholders. Replace the amounts with the prices from your quotes, delete what you don't need, add your own.
3. **Per guest or flat fee:** food, drinks, cocktail hour, cake and favors cost per person. Venue, photographer, music, attire and rings are flat fees.
4. **Deposits:** the percentage and timing are in the quote, for example "30 % at booking, nine months before". Money you have already transferred goes under "Already paid".
5. **Read the result:** cost per guest, how many guests fit your budget, and the monthly savings that cover every payment.

## Guest list first

Flat fees stay the same whether 60 or 120 guests come. Food and drinks grow with every person. The planner shows what each extra guest costs and how many fewer guests would bring you back within budget.

## Deposits and savings

Many vendors want a deposit to hold your date. The money does not have to be ready on the wedding day, but step by step. The monthly savings in the planner are worked out so that **every** payment is covered on time. The sheet "Payment Plan" shows month by month what is due. Red means: with your monthly savings you are short at that point.

Tip: a separate savings account for the wedding, filled by a standing order right after payday.

## Buffer

Plan about ten percent as its own item. Something always comes up: more drinks, dress alterations, tips, extra transport.

## Good to know

The planner does not know your quotes and ignores interest. The sample amounts are placeholders, not average prices. Works with any currency.

Personal use only. No sharing or reselling. Questions: hallo@abannews.com · © aban news, abannews.com
` };
function md(s) { // kleines Markdown → HTML (Überschriften, Listen, fett, Code)
  const inl = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  let h = '', liste = null;
  for (const z of s.split('\n')) {
    const m = z.match(/^(\d+\.|-)\s+(.*)/);
    if (m) { const typ = m[1] === '-' ? 'ul' : 'ol'; if (liste !== typ) { if (liste) h += `</${liste}>`; h += `<${typ}>`; liste = typ; } h += `<li>${inl(m[2])}</li>`; continue; }
    if (/^\s{2,}\S/.test(z) && liste) { h = h.replace(/<\/li>$/, ' ' + inl(z.trim()) + '</li>'); continue; }
    if (liste) { h += `</${liste}>`; liste = null; }
    if (z.startsWith('# ')) h += `<h1>${inl(z.slice(2))}</h1>`; else if (z.startsWith('## ')) h += `<h2>${inl(z.slice(3))}</h2>`; else if (z.trim()) h += `<p>${inl(z)}</p>`;
  }
  return h + (liste ? `</${liste}>` : '');
}
const GCSS = `@page{size:A4;margin:18mm 18mm 20mm}body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2937;font-size:11pt;line-height:1.5}
h1{font-family:Georgia,serif;font-size:24pt;margin:0 0 8pt}h2{font-size:14pt;color:#b45309;margin:16pt 0 6pt}li{margin:3pt 0}code{background:#fef3c7;padding:1pt 4pt;border-radius:4px}`;

const b = await chromium.launch({ executablePath: process.env.CH });
const p = await b.newPage({ viewport: { width: 2400, height: 1800 } });
for (const sp of ['de', 'en']) {
  const t = T[sp], dir = path.join(ROOT, t.dir);
  fs.mkdirSync(path.join(dir, t.bilder), { recursive: true }); fs.mkdirSync(path.join(dir, t.dateien), { recursive: true });
  for (const [i, html] of bilder(sp).entries()) {
    await p.setContent(html); await p.waitForTimeout(100);
    const ueber = await p.evaluate(() => [...document.querySelectorAll('.xl,.pad,.dateien')].some((e) => e.getBoundingClientRect().bottom > 1800));
    await p.screenshot({ path: path.join(dir, t.bilder, `0${i + 1}.png`) });
    console.log(sp, `0${i + 1}.png`, ueber ? '⚠ ragt über den Rand' : 'ok');
  }
  const g = await b.newPage();
  await g.setContent(`<html><head><meta charset="utf-8"><style>${GCSS}</style></head><body>${md(GUIDE[sp])}</body></html>`);
  await g.pdf({ path: path.join(dir, t.dateien, t.pdf), format: 'A4', printBackground: true, preferCSSPageSize: true }); await g.close();
  console.log(sp, '→', t.pdf);
}
fs.copyFileSync(path.join(ROOT, 'content/packs/de/hochzeits-budget/hochzeits-budget.html'), path.join(ROOT, T.de.dir, T.de.dateien, 'Hochzeits-Budget-App.html'));
await b.close();
