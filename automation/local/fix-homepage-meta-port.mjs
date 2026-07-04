#!/usr/bin/env node
/* fix-homepage-meta-port.mjs — entfernt „und nach Deutschland" aus der Homepage-Meta-Beschreibung
 * (Online Store → Präferenzen). Diese Shop-SEO-Einstellung hat KEINE Admin-API → über das eingeloggte Brave (CDP 9222).
 * LÄUFT NUR AM PC (Brave bei admin.shopify.com eingeloggt).
 * ⚠️ Standardformular (kein iframe-App). DRY (default): navigiert + Screenshot + liest den aktuellen Meta-Text.
 *    GO=1: ersetzt „ und nach Deutschland"/„und nach Deutschland" im Meta-Feld und klickt Speichern.
 * ENV: [GO=1] · [CDP_URL=http://localhost:9222] · [STORE=luxestyle-ch]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const CDP=process.env.CDP_URL||'http://localhost:9222';
const GO=process.env.GO==='1';
const STORE=process.env.STORE||'luxestyle-ch';
const SHOTS='automation/local/meta-shots';
try{ mkdirSync(SHOTS,{recursive:true}); mkdirSync('reports',{recursive:true}); }catch{}
const rep=[]; const R=m=>{ rep.push(m); console.log('meta:',m); try{ writeFileSync('reports/fix-homepage-meta.txt',`${new Date().toISOString()} ${GO?'GO':'DRY'}\n`+rep.join('\n')+'\n'); }catch{} };
const MYSHOP=process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com';
const URLS=[
  `https://admin.shopify.com/store/${STORE}/online_store/preferences`,
  `https://admin.shopify.com/store/${STORE}/online-store/preferences`,
  `https://${MYSHOP}/admin/online_store/preferences`,
  `https://${MYSHOP}/admin/online_store/preferences.json`.replace('.json',''),
];
(async()=>{
  let chromium; try{({chromium}=await import('playwright'));}catch{try{({chromium}=await import('playwright-core'));}catch(e){R('❌ playwright fehlt: '+e.message);process.exit(1);}}
  let browser; try{ browser=await chromium.connectOverCDP(CDP); }catch(e){ R('❌ Kein Brave auf '+CDP+'. Brave 9222 + admin.shopify.com eingeloggt. '+e.message); process.exit(1); }
  const ctx=browser.contexts()[0]||await browser.newContext();
  const page=await ctx.newPage();
  let done=false;
  for(const url of URLS){
    try{
      R('→ öffne '+url);
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000}); await page.waitForTimeout(5000);
      if(/accounts\.shopify|\/login/i.test(page.url())){ R('⚠️ Login-Redirect '+page.url()); continue; }
      await page.screenshot({path:`${SHOTS}/prefs.png`,fullPage:true}).catch(()=>{});
      // Textareas/Inputs mit „Deutschland" finden
      const fields=await page.evaluate(()=>{
        const els=[...document.querySelectorAll('textarea,input[type=text]')];
        return els.map((e,i)=>({i, tag:e.tagName, val:(e.value||'').slice(0,300)})).filter(f=>/Deutschland/i.test(f.val));
      });
      R('Felder mit „Deutschland": '+JSON.stringify(fields).slice(0,400));
      if(!fields.length){ R('   Kein Feld mit „Deutschland" gefunden auf dieser Seite (evtl. andere URL/Wortlaut) — Screenshot prüfen.'); continue; }
      done=true;
      if(!GO){ R('   [DRY] nicht geändert. Für Fix: GO=1.'); break; }
      // GO: das erste passende Feld bereinigen
      const idx=fields[0].i;
      await page.evaluate((idx)=>{
        const els=[...document.querySelectorAll('textarea,input[type=text]')];
        const e=els[idx]; if(!e) return;
        let v=e.value;
        v=v.replace(/ und nach Deutschland/gi,'').replace(/und nach Deutschland/gi,'').replace(/,?\s*nach Deutschland/gi,'');
        const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set||Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
        set.call(e,v); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));
      },idx);
      R('   ✓ „nach Deutschland" aus Meta-Feld entfernt.');
      await page.waitForTimeout(1000);
      // Speichern
      let saved=false;
      for(const name of ['Speichern','Save']){ try{ const b=page.getByRole('button',{name:new RegExp('^'+name+'$','i')}).first(); if(await b.count()){ await b.click({timeout:5000}); saved=true; R('   ✓ „'+name+'" geklickt.'); break; } }catch{} }
      if(!saved) R('   ⚠️ Speichern-Button nicht gefunden — Screenshot prüfen, ggf. manuell speichern.');
      await page.waitForTimeout(2500); await page.screenshot({path:`${SHOTS}/prefs-after.png`,fullPage:true}).catch(()=>{});
      break;
    }catch(e){ R('   Fehler '+url+': '+String(e.message).slice(0,120)); }
  }
  // Fallback: über die Admin-Navigation klicken (Online Store → Präferenzen)
  if(!done){
    try{
      R('→ Nav-Klickweg: Admin → Online Store → Präferenzen');
      await page.goto(`https://admin.shopify.com/store/${STORE}`,{waitUntil:'domcontentloaded',timeout:45000}); await page.waitForTimeout(4000);
      for(const os of ['Online Store','Onlineshop','Online-Shop','Vertriebskanäle']){ try{ const l=page.getByRole('link',{name:new RegExp(os,'i')}).first(); if(await l.count()){ await l.click({timeout:5000}); await page.waitForTimeout(3000); R('   „'+os+'" geklickt → '+page.url()); break; } }catch{} }
      for(const pr of ['Präferenzen','Preferences']){ try{ const l=page.getByRole('link',{name:new RegExp('^'+pr,'i')}).first(); if(await l.count()){ await l.click({timeout:5000}); await page.waitForTimeout(4000); R('   „'+pr+'" geöffnet → '+page.url()); break; } }catch{} }
      await page.screenshot({path:`${SHOTS}/prefs-nav.png`,fullPage:true}).catch(()=>{});
      const f2=await page.evaluate(()=>{ const els=[...document.querySelectorAll('textarea,input[type=text]')]; return els.map((e,i)=>({i,val:(e.value||'').slice(0,300)})).filter(f=>/Deutschland/i.test(f.val)); });
      R('   Felder mit „Deutschland" (nav): '+JSON.stringify(f2).slice(0,400));
      if(f2.length){ done=true; R('   → Feld gefunden via Nav. Für Fix: meta-de-go.'); }
    }catch(e){ R('   Nav-Fehler: '+String(e.message).slice(0,120)); }
  }
  if(!done) R('⚠️ Meta-Feld nicht erreicht — Screenshots '+SHOTS+'/ prüfen (Login/URL/Wortlaut).');
  R('Fertig ('+(GO?'GO':'DRY')+'). reports/fix-homepage-meta.txt');
  try{ await page.close(); }catch{} try{ await browser.close(); }catch{}
})().catch(e=>{ R('Fehler: '+e.message); process.exit(1); });
