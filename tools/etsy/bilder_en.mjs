// English Etsy images (5 × 2400×1800 per product) from the recalculated English workbooks (/tmp/lo/werte_en.json).
//   CH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/etsy/bilder_en.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const W = JSON.parse(fs.readFileSync(process.env.WERTE || '/tmp/lo/werte_en.json', 'utf8'));
const n = (x) => Math.round(+x).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const CSS = `*{margin:0;box-sizing:border-box}
body{width:2400px;height:1800px;background:#fbf6ea;color:#1f2937;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;position:relative}
.pad{padding:120px 150px 0}
.k{font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b45309}
h1{font-family:Georgia,"Times New Roman",serif;font-size:124px;line-height:1.04;margin-top:30px}
h2{font-family:Georgia,"Times New Roman",serif;font-size:92px;line-height:1.08;margin-top:26px}
.z{color:#b45309}.s{font-size:48px;line-height:1.35;color:#374151;margin-top:34px;max-width:1500px}
ul{list-style:none;margin-top:56px}li{font-size:52px;line-height:1.3;margin:26px 0;padding-left:70px;position:relative}
li::before{content:"";position:absolute;left:0;top:18px;width:34px;height:34px;border-radius:8px;background:#b45309}
.band{position:absolute;right:150px;bottom:80px;background:#1f2937;color:#fbf6ea;font-size:40px;font-weight:700;padding:26px 40px;border-radius:14px}
.xl{position:absolute;border:1px solid #d6cdbd;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(31,41,55,.2);background:#fff}
.xlkopf{background:#1f6f43;color:#fff;font-size:30px;padding:18px 26px;font-weight:600}
.tabs{display:flex;gap:6px;background:#f1ece2;padding:10px 20px 0}.tabs span{font-size:26px;padding:12px 24px;background:#e7dfd2;border-radius:10px 10px 0 0}.tabs span.on{background:#fff;font-weight:700}
table{border-collapse:collapse;font-size:30px;width:100%}
th{background:#b45309;color:#fff;text-align:right;padding:16px 18px}th:first-child,td:first-child{text-align:left}
td{padding:13px 18px;border-bottom:1px solid #e7dfd2;text-align:right;font-variant-numeric:tabular-nums}
td.in{background:#fff2b8}tr.sum td{background:#fef3c7;font-weight:700}
.dateien{display:flex;gap:50px;margin-top:80px}.datei{flex:1;background:#fff;border:1px solid #e7dfd2;border-radius:24px;padding:50px}
.datei b{display:block;font-size:54px;margin:18px 0 14px}.datei span{font-size:40px;color:#374151;line-height:1.35}
.typ{display:inline-block;font-size:34px;font-weight:800;color:#fff;padding:10px 22px;border-radius:10px}`;
const seite = (x) => `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${x}</body></html>`;
const budgetTab = (rows) => `<table><tr><th>Item</th><th>Amount</th><th>Frequency</th><th>Type</th><th>per month</th><th>sinking fund / mo</th></tr>
  ${rows.map((r) => `<tr><td class="in">${esc(r[0])}</td><td class="in">${n(r[1])}</td><td class="in">${esc(r[2])}</td><td class="in">${esc(r[3])}</td><td>${n(r[5])}</td><td>${n(r[6])}</td></tr>`).join('')}`;
const erg = (k) => W.erg.find((r) => r[0] === k)[1];

const PRODUKTE = {
  'budget-planner': [
    seite(`<div class="pad" style="width:1150px"><p class="k">Excel · Google Sheets</p><h1>Budget <span class="z">Planner</span></h1>
      <p class="s">Sinking funds done for you. Annual bills turned into one monthly number.</p></div>
      <div class="xl" style="right:110px;top:160px;width:1050px"><div class="xlkopf">Budget-Planner.xlsx</div>
      <div class="tabs"><span class="on">Budget</span><span>Yearly Tracker</span><span>How to use</span></div>
      <table>${W.erg.slice(0, 7).map((r) => `<tr class="sum"><td>${esc(r[0])}</td><td>${n(r[1])}</td></tr>`).join('')}</table></div>
      <div class="band">Instant download</div>`),
    seite(`<div class="pad"><p class="k">Sinking funds</p><h2>Know exactly what to set aside <span class="z">every month</span></h2>
      <p class="s">Insurance, taxes not withheld, car costs, vacation, gifts: the planner spreads them over the year.</p></div>
      <div class="xl" style="left:150px;right:150px;top:720px"><div class="xlkopf">Budget-Planner.xlsx · Budget</div>${budgetTab(W.aus.filter((r) => r[2] !== 'monthly').slice(0, 7))}
      <tr class="sum"><td>Monthly transfer to sinking funds</td><td></td><td></td><td></td><td></td><td>${n(erg('Monthly transfer to sinking funds'))}</td></tr></table></div>`),
    seite(`<div class="pad"><p class="k">All formulas</p><h2>Fill in the <span class="z">yellow cells</span>. That's it.</h2></div>
      <div class="xl" style="left:150px;right:150px;top:560px"><div class="xlkopf">Budget-Planner.xlsx</div>
      <div class="tabs"><span class="on">Budget</span><span>Yearly Tracker</span><span>How to use</span></div>${budgetTab(W.aus.slice(0, 9))}</table></div>`),
    seite(`<div class="pad"><p class="k">Need · Want · Save</p><h2>See where your money goes</h2>
      <ul><li><b>50 / 30 / 20 check:</b> Needs ${Math.round(erg('Need') / erg('Income') * 100)} %, Wants ${Math.round(erg('Want') / erg('Income') * 100)} %, Save ${Math.round(erg('Save (incl. left over)') / erg('Income') * 100)} % in the example</li>
      <li><b>Housing warning</b> when rent takes more than a third of your income</li>
      <li><b>Emergency fund:</b> goal from your fixed costs and how many months to get there</li>
      <li><b>Yearly tracker:</b> plan vs. actual for every month, overspending turns red</li>
      <li><b>Any currency:</b> $, €, £, CHF — just type your numbers</li></ul></div>`),
    seite(`<div class="pad"><p class="k">What you get</p><h2>2 files, instant download</h2><div class="dateien">
      <div class="datei"><span class="typ" style="background:#1f6f43">XLSX</span><b>Budget spreadsheet</b><span>Budget, yearly tracker and summary. Opens in Excel and Google Sheets.</span></div>
      <div class="datei"><span class="typ" style="background:#1f2937">PDF</span><b>Quick-start guide</b><span>Set up in 10 minutes. Sinking funds, emergency fund, Google Sheets steps.</span></div></div></div>`),
  ],
  'debt-payoff-planner': [
    seite(`<div class="pad" style="width:1150px"><p class="k">Excel · Google Sheets</p><h1>Debt Payoff <span class="z">Planner</span></h1>
      <p class="s">Snowball or avalanche? See your debt-free date, month by month.</p></div>
      <div class="xl" style="right:110px;top:160px;width:1050px"><div class="xlkopf">Debt-Payoff-Planner.xlsx · Plan</div>
      <table>${W.s_erg.slice(0, 6).map((r) => `<tr class="sum"><td>${esc(r[0])}</td><td>${typeof r[1] === 'number' && r[1] > 100 ? n(r[1]) : esc(r[1])}</td></tr>`).join('')}</table></div>
      <div class="band">Instant download</div>`),
    seite(`<div class="pad"><p class="k">Avalanche vs. snowball</p><h2>Which method saves you <span class="z">more interest?</span></h2></div>
      <div class="xl" style="left:150px;right:150px;top:600px"><div class="xlkopf">Debt-Payoff-Planner.xlsx · Plan</div>
      <table><tr><th>Debt</th><th>Balance</th><th>Interest % / yr</th><th>Minimum payment</th><th>Paid off (month)</th></tr>
      ${W.plan.map((r) => `<tr><td class="in">${esc(r[0])}</td><td class="in">${n(r[1])}</td><td class="in">${r[2]}</td><td class="in">${n(r[3])}</td><td>${r[4]}</td></tr>`).join('')}
      ${W.s_erg.slice(2, 5).map((r) => `<tr class="sum"><td>${esc(r[0])}</td><td></td><td></td><td></td><td>${n(r[1])}</td></tr>`).join('')}</table></div>`),
    seite(`<div class="pad"><p class="k">Monthly plan</p><h2>Every debt, every month. Freed-up payments <span class="z">roll over</span>.</h2></div>
      <div class="xl" style="left:150px;right:150px;top:700px"><div class="xlkopf">Debt-Payoff-Planner.xlsx · Monthly Plan (balance at month end)</div>
      <table><tr><th>Month</th>${W.namen.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>
      ${W.monate.slice(0, 9).map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((x) => `<td>${+x === 0 ? '<b style="color:#15803d">paid off</b>' : n(x)}</td>`).join('')}</tr>`).join('')}</table></div>`),
    seite(`<div class="pad"><p class="k">Built for real life</p><h2>What the planner does for you</h2>
      <ul><li><b>Up to 8 debts:</b> credit cards, personal loans, car loans, family loans</li>
      <li><b>Debt-free date</b> and total interest, month by month for up to 30 years</li>
      <li><b>Compares</b> your method with the other one and with minimum payments only</li>
      <li><b>Warning</b> when a payment does not even cover the interest</li>
      <li><b>Any currency:</b> $, €, £, CHF — just type your numbers</li></ul></div>`),
    seite(`<div class="pad"><p class="k">What you get</p><h2>2 files, instant download</h2><div class="dateien">
      <div class="datei"><span class="typ" style="background:#1f6f43">XLSX</span><b>Debt spreadsheet</b><span>Plan, monthly schedule and method comparison. Opens in Excel and Google Sheets.</span></div>
      <div class="datei"><span class="typ" style="background:#1f2937">PDF</span><b>Quick-start guide</b><span>Set up in 3 minutes. Avalanche vs. snowball explained, Google Sheets steps.</span></div></div></div>`),
  ],
};

const b = await chromium.launch({ executablePath: process.env.CH });
const p = await b.newPage({ viewport: { width: 2400, height: 1800 } });
for (const [name, bilder] of Object.entries(PRODUKTE)) {
  const dir = path.join(ROOT, 'content/etsy/en', name, 'images');
  fs.mkdirSync(dir, { recursive: true });
  for (const [i, html] of bilder.entries()) {
    await p.setContent(html);
    await p.waitForTimeout(120);
    const ueber = await p.evaluate(() => [...document.querySelectorAll('.xl,.pad,.dateien')].some((e) => e.getBoundingClientRect().bottom > 1800));
    await p.screenshot({ path: path.join(dir, `0${i + 1}.png`) });
    console.log(name, `0${i + 1}.png`, ueber ? '⚠ ragt über den Rand' : 'ok');
  }
}
await b.close();
