// tools/produktdichte.mjs — misst die DICHTE der Produktraster:
//   Spalten je Breite + Höhe, die 24 Produktkarten brauchen (weniger px = mehr Produkte sichtbar).
// Nutzung: node tools/produktdichte.mjs <seite.html> [...]     (Gegenprobe eingebaut)
import { chromium } from 'playwright';
const files = process.argv.slice(2);
const VIEWS = [{n:'Desktop 1440',w:1440,h:900},{n:'Mobil 390',w:390,h:844}];
const EXE = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({executablePath:EXE});

async function measure(file, vw, vh, forceMin=null) {
  const ctx = await browser.newContext({viewport:{width:vw,height:vh}});
  const page = await ctx.newPage();
  try { await page.goto('file://'+process.cwd()+'/'+file,{waitUntil:'domcontentloaded',timeout:15000}); } catch {}
  const r = await page.evaluate((fm) => {
    const grid = document.querySelector('.grid');
    if (!grid) return null;
    if (fm) grid.style.gridTemplateColumns = `repeat(auto-fill,minmax(${fm}px,1fr))`;
    grid.innerHTML='';
    for (let i=0;i<24;i++){
      const d=document.createElement('div'); d.className='item';
      d.innerHTML='<div class="ph"></div><div class="b"><div class="t">Produkt '+i+'</div><div class="p">CHF 29.90</div><div class="m">neu</div></div>';
      grid.appendChild(d);
    }
    const items=[...grid.querySelectorAll('.item')];
    const cols=new Set(items.map(e=>Math.round(e.getBoundingClientRect().left))).size;
    const ph=grid.querySelector('.ph');
    const gh=Math.round(grid.getBoundingClientRect().height);
    return {cols, imgH: ph?Math.round(ph.getBoundingClientRect().height):0, h24: gh};
  }, forceMin);
  await ctx.close(); return r;
}
for (const f of files) {
  const parts=[];
  for (const v of VIEWS) { const r=await measure(f,v.w,v.h);
    parts.push(r? `${v.n}: ${r.cols} Sp., Bild ${r.imgH}px, 24 Stk = ${r.h24}px` : `${v.n}: kein .grid`); }
  console.log(f.padEnd(26), parts.join('  |  '));
}
const t = files.find(x=>x.includes('angebote')) || files[0];
const a = await measure(t,1440,900), b = await measure(t,1440,900,400);
const ok = b && a && (b.cols < a.cols || b.h24 > a.h24);
console.log(`\nGEGENPROBE (${t}): normal ${a?.cols} Sp./${a?.h24}px → künstlich 400px ${b?.cols} Sp./${b?.h24}px → ${ok?'✅ reagiert korrekt':'❌ MESSGERÄT KAPUTT'}`);
await browser.close();
