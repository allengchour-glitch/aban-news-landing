// Tatsächliche Übersichten: schmale Ansicht, Links und unveränderter Hauptspiel-Hero.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ARCADE_BASE||'http://127.0.0.1:8182';
const out=process.env.ARCADE_HUB_OUT||'/tmp/arcade-hub';
(async()=>{
  fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];
  const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
  function check(name,ok){checks.push({name,ok:!!ok});assert(ok,name);}
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    page.on('pageerror',e=>errors.push(e.message));
    for(const route of ['/spiele.html','/minispiele/']){
      await page.goto(base+route,{waitUntil:'load'});
      for(const size of [{width:390,height:844},{width:640,height:360},{width:1280,height:800}]){
        await page.setViewportSize(size);
        check(route+' ohne horizontalen Überlauf '+size.width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      }
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(out,route.includes('spiele.html')?'hub.png':'minispiele.png'),fullPage:true});
      if(route==='/spiele.html'){
        check('13 tatsächliche Spieleinstiege',await page.locator('a.card').count()===13);
        check('Traumhaus-Hero vorhanden',await page.locator('h2').filter({hasText:/^Traumhaus$/}).count()===1);
        const links=await page.locator('a.card').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
        for(const file of ['neon-racer.html?station=1','neon-jump.html?station=1','neon-survivor.html?station=1','neon-dungeon.html?station=1','neon-park.html']){
          check('Direktstart '+file,links.includes('/'+file));
        }
      }else{
        await page.locator('#einzeln summary').click();
        const text=await page.locator('body').innerText();
        for(const word of ['Schalt-Rennen','Ausdauer','Takt'])check('Aktuelle Regel '+word,text.includes(word));
      }
    }
    check('Keine Laufzeitfehler',errors.length===0);
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({checks,errors,passed:true},null,2));
    console.log(checks.length+' Browserbedingungen grün');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
