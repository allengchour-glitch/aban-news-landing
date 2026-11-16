#!/usr/bin/env node
'use strict';
// Nur nach neuer GPU-Freigabe mit --run starten. Ohne --run kein Playwright-Import.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const BASE=process.env.MINI_LAYOUT_BASE||'http://127.0.0.1:8182';
const OUT=process.env.MINI_LAYOUT_OUT||'/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-final-layout';
const CHROME='/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome';
const GAMES=['tap-duell','auto-rennen','tauziehen'];
const FROZEN_PRODUCTS={
  'tap-duell':'d2c6e169d5e7a3cc4d48a344627c1609f7c95446d5864dec831afcd3261b5ab8',
  'auto-rennen':'43715303e76603069d3fca0a2f967b1dec2e70ef8afcf9ae518696b2e0356aa3',
  'tauziehen':'771c25d8a2684d57b0db4444f8e7bcc321405a48d0df478fab13b122eb0ad80a'
};
const VIEWS=[{width:390,height:844},{width:640,height:360}];
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const report={scope:'Gezielter Nachlauf für die letzten CSS-Korrekturen: sechs Original-HTTP-Seitenfälle, UI-Start, Start-/Spiel-Layout, Trefferpunkte, Timer-/Namens- und Rechtslink-/Knopf-Abstände, echte Touch-Holds und Tastaturprobe. Keine vollständige Wiederholung der 368 Assertions, keine Ergebnis-/Restart-/iframe-/Fokus-Neupruefung.',base:BASE,node:process.version,expectedProductSha256:FROZEN_PRODUCTS,testSha256:sha(fs.readFileSync(__filename)),cases:[],checks:[],errors:[],browserClosed:false};
function check(name,ok,data){report.checks.push({name,ok:!!ok,...(data===undefined?{}:{data})});assert.ok(ok,name+(data===undefined?'':': '+JSON.stringify(data)));}
async function value(p,id){return Number(await p.locator('#'+id).textContent());}
async function energy(p,n){return Number((await p.locator('#energy'+n).textContent()).match(/\d+/)[0]);}
async function held(p,id,cls='held'){return p.locator('#'+id).evaluate((el,c)=>el.classList.contains(c),cls);}
async function screenshot(p,name){await p.screenshot({path:path.join(OUT,name+'.png'),animations:'allow'});}
class Touches{
  constructor(page,cdp){this.page=page;this.cdp=cdp;this.active=new Map();}
  async down(id,selector){
    assert.ok(!this.active.has(id),'Finger bereits aktiv');
    const r=await this.page.locator(selector).boundingBox();assert.ok(r,selector+' sichtbar');
    this.active.set(id,{id,x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),radiusX:2,radiusY:2,force:1});
    await this.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...this.active.values()]});
  }
  async up(id){const point=this.active.get(id);if(!point)return;this.active.delete(id);await this.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});}
  async tap(selector,id=9){await this.down(id,selector);await this.up(id);}
}
async function layout(page,game,phase,name){
  const data=await page.evaluate(({game,phase})=>{
    const bad=[],measurements=[];
    const back=game==='tauziehen'?'.back':'.backbtn';
    const controls=phase==='start'?['#startBtn',back]:game==='tap-duell'?['#halfTop','#halfBottom',back]:game==='auto-rennen'?['#padRed','#padBlue','#shiftRed','#shiftBlue',back]:['#pad1','#pad2',back];
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const visible=e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0;};
    const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5;
    const legal=[...document.querySelectorAll('#aban-recht,a[href="/impressum.html"],a[href="/datenschutz.html"]')].filter(visible).map(el=>({selector:el.id?'#'+el.id:el.getAttribute('href'),rect:rect(el)}));
    function inspect(selector,interactive){
      const el=document.querySelector(selector);if(!el){bad.push({selector,reason:'fehlt'});return;}
      const r=rect(el);if(!visible(el)||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)bad.push({selector,reason:'nicht vollständig sichtbar',rect:r});
      if(interactive){
        if(r.width<44||r.height<44)bad.push({selector,reason:'Touchziel unter 44 px',rect:r});
        const points=[{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,label:'Mitte'}];
        // Innenliegende Ecken der Knöpfe prüfen; große Spielerfelder enthalten absichtlich Zurück.
        if(el.tagName==='BUTTON')for(const [x,y] of [[r.left+8,r.top+8],[r.right-8,r.top+8],[r.left+8,r.bottom-8],[r.right-8,r.bottom-8]])points.push({x,y,label:'innere Ecke'});
        for(const point of points){const hit=document.elementFromPoint(point.x,point.y);if(!(hit===el||el.contains(hit)))bad.push({selector,reason:point.label+' überdeckt',point,hit:hit&&hit.outerHTML.slice(0,160)});}
        for(const link of legal){measurements.push({kind:'legal-control',control:selector,legal:link.selector,controlRect:r,legalRect:link.rect});if(overlap(r,link.rect))bad.push({selector,reason:'Rechtslink überdeckt Steuerung',legal:link});}
      }
      for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const c=getComputedStyle(a);if(['hidden','clip'].includes(c.overflow)||['hidden','clip'].includes(c.overflowY)){const ar=rect(a);if(r.left<ar.left-1||r.right>ar.right+1||r.top<ar.top-1||r.bottom>ar.bottom+1)bad.push({selector,reason:'im Elternfeld abgeschnitten'});}}
    }
    controls.forEach(s=>inspect(s,true));
    if(phase==='play'){
      const labels=game==='tap-duell'?['.half.top .who','.half.bottom .who','#cntTop','#cntBottom','#cueTop','#cueBottom','#feedbackTop','#feedbackBottom','.half.top .bar','.half.bottom .bar']:
        game==='auto-rennen'?['#scoreRed','#scoreBlue','#feedbackRed','#feedbackBlue','.driver.red .rev','.driver.blue .rev','#track']:
        ['#energy1','#energy2','#hint1','#hint2','.p1 .lbl','.p2 .lbl','.p1 .stamina','.p2 .stamina','#status','#track'];
      labels.forEach(s=>inspect(s,false));
      if(game==='tap-duell'){
        const timer=rect(document.querySelector('#timer'));
        for(const selector of ['.half.top .who','.half.bottom .who']){const label=rect(document.querySelector(selector));measurements.push({kind:'timer-label',label:selector,timerRect:timer,labelRect:label});if(overlap(timer,label))bad.push({selector,reason:'Timer überdeckt Spielername',timerRect:timer,labelRect:label});}
      }
    }else{
      const overlay=game==='tap-duell'?'#startOverlay':game==='auto-rennen'?'#overlay':'#startO';
      for(const el of document.querySelectorAll(overlay+' .card,'+overlay+' p,'+overlay+' .sub,'+overlay+' h1,'+overlay+' h2,'+overlay+' .title')){
        const r=rect(el);if(r.top<0||r.bottom>innerHeight+1)bad.push({selector:overlay,reason:'Starttext außerhalb',rect:r});
        const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect();if(text.height&&(text.top<0||text.bottom>innerHeight+1))bad.push({selector:overlay,reason:'Textzeilen außerhalb'});
      }
    }
    return {bad,measurements,horizontal:document.documentElement.scrollWidth>innerWidth,vertical:document.documentElement.scrollHeight>innerHeight,legalRegions:legal.length};
  },{game,phase});
  check(name+' Layout '+phase,!data.bad.length&&!data.horizontal&&!data.vertical,data);
}
async function actions(p,touch,game,name){
  if(game==='tap-duell'){
    const elapsed=()=>p.evaluate(()=>performance.now()-window.__finalLayout.started);
    const at=async target=>{const wait=target-await elapsed();assert.ok(wait>=-2,'Taktzeit überschritten');if(wait>0)await p.clock.runFor(wait);};
    await at(1000);await touch.tap('#halfTop',1);await touch.tap('#halfBottom',2);
    check(name+' tatsächliche präzise Touch-Tipps für beide',await value(p,'cntTop')===100&&await value(p,'cntBottom')===100);
    await at(1750);await touch.down(1,'#halfTop');await touch.down(2,'#halfBottom');await p.clock.runFor(200);
    check(name+' Halten zählt keinen weiteren Tipp',await value(p,'cntTop')===200&&await value(p,'cntBottom')===200);
    await layout(p,game,'play',name+' gehalten');await screenshot(p,name+'-touch');await touch.up(1);await touch.up(2);
    await at(2500);await p.keyboard.press('a');await p.keyboard.press('l');
    check(name+' getrennte Tasten bleiben nutzbar',await value(p,'cntTop')===300&&await value(p,'cntBottom')===300);
  }else if(game==='auto-rennen'){
    await p.clock.runFor(2200);await touch.down(1,'#padRed');await touch.down(2,'#padBlue');await p.clock.runFor(1250);
    check(name+' beide Gas-Holds aktiv',await held(p,'padRed')&&await held(p,'padBlue'));
    const score=async side=>p.locator('#score'+side).textContent();
    check(name+' Gas erzeugt Strecke',Number((await score('Red')).match(/(\d+)%/)[1])>0&&Number((await score('Blue')).match(/(\d+)%/)[1])>0);
    await touch.tap('#shiftRed',3);await touch.tap('#shiftBlue',4);
    check(name+' Schalten bei weiter gehaltenem Gas',(await score('Red')).includes('Gang 2')&&(await score('Blue')).includes('Gang 2')&&await held(p,'padRed')&&await held(p,'padBlue'));
    await layout(p,game,'play',name+' gehalten');await screenshot(p,name+'-touch');
    await touch.up(1);check(name+' rotes Loslassen löst Blau nicht',!await held(p,'padRed')&&await held(p,'padBlue'));
    await touch.up(2);await p.clock.runFor(1500);
    await p.keyboard.down('a');await p.clock.runFor(300);
    check(name+' Tastaturgas getrennt',await held(p,'padRed')&&!await held(p,'padBlue'));await p.keyboard.up('a');
    check(name+' Gas vollständig losgelassen',!await held(p,'padRed')&&!await held(p,'padBlue'));
  }else{
    await p.clock.runFor(2500);await touch.down(1,'#pad1');await touch.down(2,'#pad2');await p.clock.runFor(1000);
    const a=await energy(p,1),b=await energy(p,2);
    check(name+' beide Griffe verbrauchen Ausdauer',a>=72&&a<=74&&b>=72&&b<=74&&await held(p,'pad1','holding')&&await held(p,'pad2','holding'));
    await layout(p,game,'play',name+' gehalten');await screenshot(p,name+'-touch');
    await touch.up(1);await p.clock.runFor(500);
    check(name+' Loslassen erholt nur Rot',await energy(p,1)>a&&await energy(p,2)<b&&!await held(p,'pad1','holding')&&await held(p,'pad2','holding'));
    await touch.up(2);await p.keyboard.down('l');await p.clock.runFor(200);
    check(name+' Tastaturgriff getrennt',!await held(p,'pad1','holding')&&await held(p,'pad2','holding'));await p.keyboard.up('l');
    check(name+' Griffe vollständig losgelassen',!await held(p,'pad1','holding')&&!await held(p,'pad2','holding'));
  }
  await layout(p,game,'play',name+' nach Eingaben');await screenshot(p,name+'-nach-eingaben');
}
async function runCase(browser,game,view){
  const name=game+'-'+view.width+'x'+view.height,result={name,ok:false,errors:[]};report.cases.push(result);console.log('START',name);
  const context=await browser.newContext({viewport:view,hasTouch:true,isMobile:true,serviceWorkers:'block'});let page;
  const deadline=setTimeout(()=>context.close().catch(()=>{}),45000);
  try{
    await context.addInitScript(()=>{
      window.__finalLayout={started:null,events:[],csp:[]};
      document.addEventListener('click',e=>{if(e.target.closest('#startBtn'))window.__finalLayout.started=performance.now();},true);
      for(const type of ['pointerdown','pointerup','keydown'])document.addEventListener(type,e=>window.__finalLayout.events.push({type,trusted:e.isTrusted,pointerType:e.pointerType}),true);
      document.addEventListener('securitypolicyviolation',e=>window.__finalLayout.csp.push({directive:e.effectiveDirective,uri:e.blockedURI}));
    });
    page=await context.newPage();page.setDefaultTimeout(7000);
    page.on('pageerror',e=>result.errors.push({kind:'JS',error:e.message}));
    page.on('console',m=>{if(m.type()==='error')result.errors.push({kind:'console',error:m.text(),location:m.location()});});
    page.on('response',r=>{if(r.status()>=400)result.errors.push({kind:'HTTP',status:r.status(),url:r.url()});});
    page.on('requestfailed',r=>result.errors.push({kind:'network',url:r.url(),error:r.failure()}));
    const epoch=new Date('2026-11-16T12:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+1000));
    const response=await page.goto(BASE+'/minispiele/'+game+'.html',{waitUntil:'load'});assert.ok(response,'HTTP-Antwort fehlt');
    const headers=response.headers();result.headers=headers;
    check(name+' echte HTML-Header',response.status()===200&&/text\/html/.test(headers['content-type']||'')&&headers['x-content-type-options']==='nosniff');
    check(name+' CSP unverändert aktiv',!!headers['content-security-policy']&&headers['content-security-policy'].includes("frame-ancestors 'self'")&&headers['x-frame-options']==='SAMEORIGIN');
    const local=fs.readFileSync(path.join(ROOT,'minispiele',game+'.html')),served=await response.body();
    result.productSha256=sha(served);result.localProductSha256=sha(local);
    check(name+' Originalseite entspricht lokaler eingefrorener Datei',result.productSha256===result.localProductSha256,{served:result.productSha256,local:result.localProductSha256});
    await layout(page,game,'start',name);await screenshot(page,name+'-start');
    const touch=new Touches(page,await context.newCDPSession(page));await touch.tap('#startBtn',90);
    const overlay=game==='tap-duell'?'#startOverlay':game==='auto-rennen'?'#overlay':'#startO';
    check(name+' UI-Start per echtem Touch',await page.locator(overlay).isHidden());
    await layout(page,game,'play',name);await screenshot(page,name+'-play');
    await actions(page,touch,game,name);
    const observed=await page.evaluate(()=>window.__finalLayout);
    check(name+' echte Touch- und Tastatureingaben',observed.events.every(e=>e.trusted)&&observed.events.some(e=>e.type==='pointerdown'&&e.pointerType==='touch')&&observed.events.some(e=>e.type==='keydown'));
    check(name+' keine CSP-Verletzungen',observed.csp.length===0,observed.csp);
    check(name+' keine JS-/HTTP-/Konsolen-/Netzfehler',result.errors.length===0,result.errors);result.ok=true;
  }catch(e){result.error=String(e.stack||e);report.errors.push({name,error:result.error});console.error('FAIL',name,String(e));if(page)await page.screenshot({path:path.join(OUT,name+'-FEHLER.png'),timeout:5000}).catch(()=>{});}
  finally{clearTimeout(deadline);await context.close().catch(()=>{});}
  console.log(result.ok?'PASS':'ENDE MIT FEHLER',name);
}
async function main(){
  let browser;fs.mkdirSync(OUT,{recursive:true});
  try{
    for(const game of GAMES)assert.equal(sha(fs.readFileSync(path.join(ROOT,'minispiele',game+'.html'))),FROZEN_PRODUCTS[game],'Produkt weicht vom eingefrorenen Stand ab: '+game);
    process.env.PLAYWRIGHT_BROWSERS_PATH||='/tmp/aban-browsers';
    const {chromium}=require(process.env.PW_MODULE||process.env.PLAYWRIGHT_MODULE||'/tmp/aban-games-audit/node_modules/playwright');
    const executablePath=process.env.PW_CHROME||CHROME;assert.equal(fs.realpathSync(executablePath),fs.realpathSync(CHROME),'Keinen System-Wrapper verwenden');
    browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--enable-unsafe-swiftshader']});
    for(const view of VIEWS)for(const game of GAMES)await runCase(browser,game,view);
  }catch(e){report.errors.push({name:'Lauf',error:String(e.stack||e)});}
  finally{
    if(browser){try{await browser.close();report.browserClosed=true;}catch(e){report.errors.push({name:'Browser schließen',error:String(e)});}}
    report.ok=report.browserClosed&&report.errors.length===0&&report.cases.length===6&&report.cases.every(c=>c.ok);
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report.ok?'PASS':'FAIL',report.checks.filter(c=>c.ok).length+'/'+report.checks.length+' Prüfungen; Browser geschlossen: '+report.browserClosed+'; '+OUT);
    if(!report.ok)process.exitCode=1;
  }
}
if(require.main===module){if(process.argv.includes('--run'))main().catch(e=>{console.error(e);process.exitCode=1;});else console.log('Vorbereitet. Kein Browser gestartet. Nur nach GPU-Freigabe mit --run ausführen.');}
