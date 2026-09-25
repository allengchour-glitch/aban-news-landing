// Rendert die 3 Meta-Anzeigen (1080×1080) für den Schulden-Plan.
//   cd <scratch> && npm i playwright --no-save
//   CH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome OUT=docs/werbung/schulden-plan node tools/schulden/anzeigen.mjs
import { chromium } from 'playwright';
const css = `*{margin:0;box-sizing:border-box}body{width:1080px;height:1080px;background:#fbf6ea;font-family:Georgia,"Times New Roman",serif;color:#1f2937;display:flex;flex-direction:column;justify-content:space-between;padding:96px 92px 80px;
background-image:repeating-linear-gradient(#fbf6ea 0 63px,#e8dcc4 63px 65px)}
.k{font:600 30px/1.2 -apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#b45309}
h1{font-size:86px;line-height:1.08;letter-spacing:-.01em;font-weight:700}
.z{color:#b45309}.s{font-size:44px;line-height:1.3;color:#374151}
.f{display:flex;justify-content:space-between;align-items:flex-end;font:600 30px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b7280}
.btn{background:#b45309;color:#fff;padding:22px 34px;border-radius:14px;font-size:34px}`;
const ads = [
 {k:'Rechnen statt raten', h:'CHF 300 extra im Monat: <span class="z">Schulden tilgen</span> oder <span class="z">investieren?</span>', s:'Der Rechner zeigt, ab welcher Rendite sich Investieren überhaupt lohnt.', b:'Gratis rechnen'},
 {k:'Kleinkredit zu 7.9 %', h:'Investieren lohnt sich erst ab <span class="z">8.2 % Rendite</span> pro Jahr.', s:'Jahr für Jahr, nach Kosten. Tilgen bringt die 7.9 % sicher.', b:'Eigene Zahlen rechnen'},
 {k:'Gleicher Kredit, CHF 200 mehr pro Monat', h:'<span class="z">20 Monate</span> früher schuldenfrei. <span class="z">CHF 1’094</span> weniger Zins.', s:'Beispiel: CHF 15’000 zu 7.9 %, Rate CHF 350.', b:'Plan erstellen'},
];
const b = await chromium.launch({executablePath: process.env.CH});
const p = await b.newPage({viewport:{width:1080,height:1080}});
for (const [i,a] of ads.entries()) {
  await p.setContent(`<html><head><style>${css}</style></head><body><div><p class="k">${a.k}</p><h1 style="margin-top:44px">${a.h}</h1><p class="s" style="margin-top:40px">${a.s}</p></div><div class="f"><span>abannews.com<br>Schulden-Plan Schweiz</span><span class="btn">${a.b}</span></div></body></html>`);
  const box = await p.evaluate(()=>({h:document.body.scrollHeight,w:document.body.scrollWidth}));
  await p.screenshot({path: `${process.env.OUT}/anzeige-${i+1}.png`});
  console.log(i+1, box);
}
await b.close();
