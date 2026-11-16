#!/usr/bin/env node
'use strict';
// Start ausschließlich nach GPU-Freigabe: node .../browser-qa.cjs --run
// Unveränderte Spielantworten und echte Server-Header; keine Schreibgriffe ins Spiel.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = process.env.MINI_ID_BASE || 'http://127.0.0.1:8182';
const OUT = process.env.MINI_ID_OUT || '/tmp/minispiele-identitaet-browser';
const NATIVE_CHROME = '/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome';
const VIEWS = [{width:390,height:844},{width:640,height:360}];
const report = {scope:'Echte, unveränderte HTTP-Spielantworten; Chromium-Eingaben über Playwright/CDP; kontrollierte Playwright-Uhr. Nur iframe-Elternseite und lesender Ereignisbeobachter sind Test-Fixtures.',base:BASE,checks:[],errors:[],headers:[],cases:[]};
let browser;
function check(name, value, data) {
  report.checks.push({name,ok:!!value,...(data===undefined?{}:{data})});
  assert.ok(value,name+(data===undefined?'':': '+JSON.stringify(data)));
}
async function text(p,id){return p.locator('#'+id).textContent();}
async function number(p,id){return Number(await text(p,id));}
async function advance(p,ms){await p.clock.runFor(ms);}
async function elapsed(p){return p.evaluate(()=>performance.now()-window.__qaProbe.started);}
async function at(p,ms){const delta=ms-await elapsed(p);assert.ok(delta>=-2,'Uhrziel bereits überschritten');if(delta>0)await advance(p,delta);}
async function progress(p,side){return Number((await text(p,'score'+side)).match(/(\d+)%/)[1]);}
async function gear(p,side){return Number((await text(p,'score'+side)).match(/Gang (\d+)/)[1]);}
async function rpm(p,side){return p.locator('#rpm'+side).evaluate(e=>parseFloat(e.style.left)/100);}
async function energy(p,n){return Number((await text(p,'energy'+n)).match(/\d+/)[0]);}
async function flag(p){return p.locator('#flag').evaluate(e=>parseFloat(e.style.left));}
async function held(p,id,cls='held'){return p.locator('#'+id).evaluate((e,c)=>e.classList.contains(c),cls);}
async function shot(p,label){await p.screenshot({path:path.join(OUT,label+'.png'),animations:'allow'});}

// Chromium Input erzeugt echte, vertrauenswürdige Touch-/Pointer-Ereignisse,
// einschließlich gleichzeitiger Finger und eines zusätzlichen Schaltfingers.
class Touches {
  constructor(cdp,page){this.cdp=cdp;this.page=page;this.points=new Map();}
  async point(selector){
    const box=await this.page.locator(selector).boundingBox();assert.ok(box,selector+' sichtbar');
    return {x:Math.round(box.x+box.width/2),y:Math.round(box.y+box.height/2)};
  }
  async down(id,selector){
    assert.ok(!this.points.has(id),'Finger bereits aktiv: '+id);
    this.points.set(id,{id,...await this.point(selector),radiusX:2,radiusY:2,force:1});
    await this.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...this.points.values()]});
  }
  async up(id){
    if(!this.points.has(id))return;
    const ended=this.points.get(id);this.points.delete(id);
    // touchEnd benennt den endenden Finger, nicht die weiterhin aktiven.
    await this.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[ended]});
  }
  async tap(selector,id=9){await this.down(id,selector);await this.up(id);}
  async clear(){if(!this.points.size)return;this.points.clear();await this.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
}
class Inputs {
  constructor(page,touches,mode){this.p=page;this.touch=touches;this.mode=mode;}
  async down(key,selector,id){if(this.mode==='touch')await this.touch.down(id,selector);else await this.p.keyboard.down(key);}
  async up(key,id){if(this.mode==='touch')await this.touch.up(id);else await this.p.keyboard.up(key);}
  async tap(key,selector,id=9){if(this.mode==='touch')await this.touch.tap(selector,id);else await this.p.keyboard.press(key);}
  async clear(){await this.touch.clear();for(const key of ['a','s','k','l'])await this.p.keyboard.up(key);}
}
async function activate(p,input,id){
  if(input.mode==='touch')await input.touch.tap('#'+id);
  else {await p.locator('#'+id).focus();await p.keyboard.press('Enter');}
}
async function layout(p,game,phase,caseName){
  const rules={
    'tap-duell':{start:['#startBtn','.backbtn'],play:['#halfTop','#halfBottom','.backbtn'],result:['#againBtn','.backbtn']},
    'auto-rennen':{start:['#startBtn','.backbtn'],play:['#padRed','#padBlue','#shiftRed','#shiftBlue','.backbtn'],result:['#startBtn','.backbtn']},
    'tauziehen':{start:['#startBtn','.back'],play:['#pad1','#pad2','.back'],result:['#againBtn','.back']}
  };
  const selectors=rules[game][phase];
  const result=await p.evaluate(({selectors,game,phase})=>{
    const bad=[];
    function inspect(selector,interactive){
      const e=document.querySelector(selector);if(!e){bad.push({selector,reason:'fehlt'});return;}
      const r=e.getBoundingClientRect(),style=getComputedStyle(e),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      const inside=r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
      if(!inside||r.width<=0||r.height<=0||style.display==='none'||style.visibility==='hidden')bad.push({selector,reason:'außerhalb/unsichtbar',rect:{x:r.x,y:r.y,w:r.width,h:r.height}});
      if(interactive&&!(hit===e||e.contains(hit)))bad.push({selector,reason:'Mitte überdeckt',hit:hit&&hit.outerHTML.slice(0,160)});
      if(interactive&&(r.width<44||r.height<44))bad.push({selector,reason:'Touchziel kleiner als 44px',w:r.width,h:r.height});
      // Sichtbarer Rahmen allein reicht nicht: Kinder dürfen nicht im Pad abgeschnitten sein.
      for(let ancestor=e.parentElement;ancestor&&ancestor!==document.body;ancestor=ancestor.parentElement){
        const cs=getComputedStyle(ancestor);if(['hidden','clip'].includes(cs.overflow)||['hidden','clip'].includes(cs.overflowY)){
          const a=ancestor.getBoundingClientRect();if(r.top<a.top-1||r.bottom>a.bottom+1||r.left<a.left-1||r.right>a.right+1)bad.push({selector,reason:'vom Elternfeld abgeschnitten'});
        }
      }
    }
    selectors.forEach(s=>inspect(s,true));
    if(phase==='play'){
      const extras=game==='tap-duell'?['#cntTop','#cntBottom','#cueTop','#cueBottom','.half.top .bar','.half.bottom .bar','#feedbackTop','#feedbackBottom']:
        game==='auto-rennen'?['#track','#scoreRed','#scoreBlue','.driver.red .rev','.driver.blue .rev','#feedbackRed','#feedbackBlue']:
        ['#energy1','#energy2','#hint1','#hint2','.p1 .stamina','.p2 .stamina','#track','#status'];
      extras.forEach(s=>inspect(s,false));
    }else{
      const overlay=game==='auto-rennen'?'#overlay':game==='tap-duell'?(phase==='start'?'#startOverlay':'#endOverlay'):(phase==='start'?'#startO':'#endO');
      document.querySelectorAll(overlay+' .card, '+overlay+' p, '+overlay+' .sub, '+overlay+' h1, '+overlay+' h2, '+overlay+' .title').forEach(e=>{
        const r=e.getBoundingClientRect();if(r.top<-1||r.bottom>innerHeight+1)bad.push({selector:overlay+' Inhalt',reason:'Text außerhalb',y:r.y,h:r.height});
      });
    }
    return {bad,horizontal:document.documentElement.scrollWidth>innerWidth,vertical:document.documentElement.scrollHeight>innerHeight};
  },{selectors,game,phase});
  check(caseName+' Layout '+phase,!result.bad.length&&!result.horizontal&&!result.vertical,result);
  await shot(p,caseName+'-'+phase);
}
async function loseFocus(p,context,name){
  const before=await p.evaluate(()=>window.__qaProbe.blurs);
  // Playwright emuliert Fokus standardmäßig für alle Headless-Seiten zugleich.
  // Nur diese Seite kurz auf native Fokuszustellung setzen; kein synthetisches blur.
  const focusSession=await context.newCDPSession(p);
  await focusSession.send('Emulation.setFocusEmulationEnabled',{enabled:false});
  const other=await context.newPage();
  try{
    await other.goto('about:blank');await other.bringToFront();
    await p.waitForFunction(n=>window.__qaProbe.blurs>n&&document.hasFocus()===false,before,{timeout:5000,polling:50});
    check(name+' echter Fenster-Fokusverlust',await p.evaluate(n=>window.__qaProbe.blurs>n,before));
  }finally{await other.close();await p.bringToFront();await focusSession.send('Emulation.setFocusEmulationEnabled',{enabled:true});await focusSession.detach();}
}
async function rhythm(p,input,context,name){
  // Früh-/Zusatzversuche belegen den jeweiligen Schlag: Blau spammt, Rot trifft.
  for(let beat=0;beat<12;beat++){
    const target=1000+beat*750;
    for(const t of [target-250,target-150]){await at(p,t);await input.tap('l','#halfBottom',8);}
    await at(p,target);await input.tap('a','#halfTop',7);await input.tap('l','#halfBottom',8);
    await at(p,target+25);await input.tap('l','#halfBottom',8);
    check(name+' präziser Schlag '+(beat+1),await number(p,'cntTop')===(beat+1)*100);
  }
  check(name+' Rhythmus-Spam bringt keine Punkte',await number(p,'cntBottom')===0);
  await at(p,10100);
  check(name+' vollständiges Ergebnis',(await text(p,'endTitle')).includes('Spieler 1')&&await number(p,'endP1')===1200&&await number(p,'endP2')===0);
  check(name+' zwölf echte Treffer',(await text(p,'endDetail')).includes('12 : 0'));
  await layout(p,'tap-duell','result',name);
  await activate(p,input,'againBtn');
  check(name+' Restart setzt beide Punkte zurück',await number(p,'cntTop')===0&&await number(p,'cntBottom')===0&&await p.locator('#endOverlay').isHidden());
  await at(p,1000);await input.down('a','#halfTop',7);
  check(name+' neuer Schlag nach Restart zählt',await number(p,'cntTop')===100);
  if(input.mode==='keyboard'){await p.keyboard.down('a');check(name+' Tastaturrepeat zählt nicht',await number(p,'cntTop')===100);}
  await loseFocus(p,context,name);await input.clear();
  await at(p,1750);await input.tap('a','#halfTop',7);await input.tap('l','#halfBottom',8);
  check(name+' nach Fokusverlust wieder getrennte Spieler',await number(p,'cntTop')===200&&await number(p,'cntBottom')===100);
  // Expliziter Ersatz der alten »zwei Tipps = zwei Punkte«-Annahme.
  await input.tap('l','#halfBottom',8);
  check(name+' doppelter Tipp kostet genau 25',await number(p,'cntBottom')===75);
}
async function driving(p,input,context,name){
  await advance(p,2200);
  for(let i=0;i<8;i++)await input.tap('s','#shiftRed',7);
  check(name+' Schalt-Spam ohne Gas bewegt nicht',await progress(p,'Red')===0&&await gear(p,'Red')===1&&await rpm(p,'Red')===0);
  check(name+' zu frühes Schalten erklärt',(await text(p,'feedbackRed')).includes('Zu früh'));
  await advance(p,700);
  await input.down('a','#padRed',1);await input.down('k','#padBlue',2);
  let duration=0,shifts=0;
  while(await progress(p,'Red')<100&&duration<15000){
    await advance(p,50);duration+=50;
    if(await progress(p,'Red')>=100)break;
    if(await gear(p,'Red')<5&&await rpm(p,'Red')>=0.8){await input.tap('s','#shiftRed',3);shifts++;}
    await input.tap('l','#shiftBlue',4);
  }
  check(name+' vier zeitgerechte Gangwechsel',shifts===4&&await gear(p,'Red')===5,{shifts});
  check(name+' gutes Fahren schlägt identisches Gas mit Schalt-Spam',await progress(p,'Red')===100&&await progress(p,'Blue')<50&&duration<12000,{duration,blue:await progress(p,'Blue')});
  await input.clear();await advance(p,1000);
  check(name+' vollständiges Rennergebnis',(await text(p,'ovTitle')).includes('Rot')&&await p.locator('#overlay').isVisible());
  await layout(p,'auto-rennen','result',name);
  await activate(p,input,'startBtn');
  check(name+' Restart: Strecke und Gang',await progress(p,'Red')===0&&await progress(p,'Blue')===0&&await gear(p,'Red')===1&&await gear(p,'Blue')===1);
  await advance(p,2500);
  check(name+' Restart übernimmt kein Gas',await progress(p,'Red')===0&&await progress(p,'Blue')===0);
  await input.down('a','#padRed',1);await input.down('k','#padBlue',2);await advance(p,1000);
  check(name+' getrennte Gasfelder gleichzeitig aktiv',await held(p,'padRed')&&await held(p,'padBlue'));
  await loseFocus(p,context,name);
  check(name+' Fokusverlust löst beide Gasfelder',!await held(p,'padRed')&&!await held(p,'padBlue'));
  await input.clear();await advance(p,1800);
  const before=await progress(p,'Red');await advance(p,500);
  check(name+' nach Ausrollen kein Phantomgas',await rpm(p,'Red')===0&&await rpm(p,'Blue')===0&&await progress(p,'Red')===before);
}
async function tug(p,input,context,name){
  await advance(p,2500);
  for(let i=0;i<8;i++)await input.tap('a','#pad1',1);
  check(name+' reine Tippzahl bewegt kein Seil',await flag(p)===50&&await energy(p,1)===100);
  await input.down('a','#pad1',1);await input.down('l','#pad2',2);await advance(p,4100);
  check(name+' beide gehalten: symmetrisch erschöpft',await flag(p)===50&&await energy(p,1)===0&&await energy(p,2)===0);
  check(name+' Erschöpfung ist lesbar',(await text(p,'hint1')).includes('Loslassen bis 35%'));
  await advance(p,500);check(name+' Dauerhalten heilt nicht',await energy(p,1)===0&&await flag(p)===50);
  await input.up('a',1);await advance(p,3000);
  check(name+' nur losgelassener Spieler erholt sich',await energy(p,1)===100&&await energy(p,2)===0);
  await input.down('a','#pad1',1);await advance(p,2800);await input.up('a',1);await advance(p,2200);await input.down('a','#pad1',1);await advance(p,1300);await input.clear();
  check(name+' Erholung schlägt Dauerhalten: Rundensieg',await number(p,'s1')===1&&await number(p,'s2')===0);
  await advance(p,4000);
  await input.down('a','#pad1',1);await advance(p,2800);await input.up('a',1);await advance(p,2200);await input.down('a','#pad1',1);await advance(p,1300);await input.clear();
  check(name+' zwei Rundensiege beenden Match',await number(p,'s1')===2&&await number(p,'s2')===0&&await p.locator('#endO').isVisible());
  check(name+' vollständiger Match-Endstand',(await text(p,'endText')).includes('Rot 2 : 0 Blau'));
  await layout(p,'tauziehen','result',name);
  await activate(p,input,'againBtn');
  check(name+' Restart: Punkte, Ausdauer, Seil',await number(p,'s1')===0&&await number(p,'s2')===0&&await energy(p,1)===100&&await energy(p,2)===100&&await flag(p)===50&&await p.locator('#endO').isHidden());
  await advance(p,2500);
  check(name+' Restart übernimmt keine Holds',!await held(p,'pad1','holding')&&!await held(p,'pad2','holding'));
  await input.down('a','#pad1',1);await input.down('l','#pad2',2);await advance(p,1000);
  check(name+' Ausdauer wird sichtbar verbraucht',await energy(p,1)>=72&&await energy(p,1)<=74&&await energy(p,2)>=72&&await energy(p,2)<=74);
  await loseFocus(p,context,name);
  check(name+' Fokusverlust löst beide Seilgriffe',!await held(p,'pad1','holding')&&!await held(p,'pad2','holding'));
  await input.clear();await advance(p,1000);
  check(name+' Fokusverlust regeneriert statt Phantomziehen',await energy(p,1)===100&&await energy(p,2)===100&&await flag(p)===50);
}

async function newContext(view){
  const context=await browser.newContext({viewport:view,hasTouch:true,isMobile:true,serviceWorkers:'block'});
  await context.addInitScript(()=>{
    // Beobachtet nur Ereignisse; keine Änderung an Steuerung oder Spielzustand.
    window.__qaProbe={started:null,events:[],blurs:0,violations:[]};
    document.addEventListener('click',e=>{if(e.target.closest('#startBtn,#againBtn'))window.__qaProbe.started=performance.now();},true);
    document.addEventListener('pointerdown',e=>window.__qaProbe.events.push({type:'pointerdown',pointerType:e.pointerType,trusted:e.isTrusted}),true);
    document.addEventListener('keydown',e=>window.__qaProbe.events.push({type:'keydown',key:e.key,trusted:e.isTrusted}),true);
    window.addEventListener('blur',e=>{if(e.isTrusted)window.__qaProbe.blurs++;});
    document.addEventListener('securitypolicyviolation',e=>window.__qaProbe.violations.push({directive:e.effectiveDirective,uri:e.blockedURI}));
  });
  return context;
}
function capture(page,errors){
  page.setDefaultTimeout(7000);
  page.on('pageerror',e=>errors.push({kind:'pageerror',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',message:m.text(),location:m.location()});});
  page.on('response',r=>{if(r.status()>=400)errors.push({kind:'http',status:r.status(),url:r.url()});});
  page.on('requestfailed',r=>errors.push({kind:'network',url:r.url(),failure:r.failure()}));
}
async function headers(response,name){
  assert.ok(response,name+' HTTP-Antwort fehlt');
  const h=response.headers();report.headers.push({name,status:response.status(),csp:h['content-security-policy'],frame:h['x-frame-options'],contentType:h['content-type']});
  check(name+' echte erfolgreiche HTML-Antwort',response.status()===200&&/text\/html/.test(h['content-type']||''));
  check(name+' echte CSP und iframe-Schutz',!!h['content-security-policy']&&h['content-security-policy'].includes("frame-ancestors 'self'")&&h['x-frame-options']==='SAMEORIGIN');
  check(name+' nosniff unverändert',h['x-content-type-options']==='nosniff');
}
async function diagnostics(p,errors,name){
  const violations=[];
  for(const frame of p.frames()){
    const v=await frame.evaluate(()=>window.__qaProbe&&window.__qaProbe.violations||[]);
    violations.push(...v.map(item=>({frame:frame.url(),...item})));
  }
  check(name+' keine JS-/HTTP-/Konsolenfehler',errors.length===0,errors);
  check(name+' keine CSP-Verletzungen',violations.length===0,violations);
}
async function runCase(game,view,mode){
  const name=game+'-'+view.width+'x'+view.height+'-'+mode;
  const result={name,ok:false,errors:[]};report.cases.push(result);console.log('START',name);
  const context=await newContext(view);let p;
  const deadline=setTimeout(()=>context.close().catch(()=>{}),90000);
  try{
    p=await context.newPage();capture(p,result.errors);
    // Nur Zeitkontrolle; HTML/CSS, Zeichnen, Physik und Eingabehandler bleiben original.
    const epoch=new Date('2026-11-16T12:00:00Z');
    await p.clock.install({time:epoch});await p.clock.pauseAt(new Date(epoch.getTime()+1000));
    await headers(await p.goto(BASE+'/minispiele/'+game+'.html',{waitUntil:'load'}),name);
    await p.bringToFront();
    const input=new Inputs(p,new Touches(await context.newCDPSession(p),p),mode);
    await layout(p,game,'start',name);
    await activate(p,input,'startBtn');
    const overlay=game==='tap-duell'?'#startOverlay':game==='tauziehen'?'#startO':'#overlay';
    check(name+' Start über '+mode,await p.locator(overlay).isHidden());
    check(name+' Startzeit beobachtet',await p.evaluate(()=>Number.isFinite(window.__qaProbe.started)));
    await layout(p,game,'play',name);
    if(game==='tap-duell')await rhythm(p,input,context,name);
    else if(game==='auto-rennen')await driving(p,input,context,name);
    else await tug(p,input,context,name);
    const events=await p.evaluate(()=>window.__qaProbe.events);
    check(name+' Eingaben sind echte Browserereignisse',events.some(e=>e.trusted&&(mode==='touch'?e.type==='pointerdown'&&e.pointerType==='touch':e.type==='keydown')));
    check(name+' keine synthetischen Spieleingaben',events.every(e=>e.trusted));
    await diagnostics(p,result.errors,name);result.ok=true;
  }catch(e){
    result.error=String(e.stack||e);report.errors.push({name,error:result.error});
    if(p){result.probe=await p.evaluate(()=>window.__qaProbe).catch(()=>null);await p.screenshot({path:path.join(OUT,name+'-FEHLER.png'),timeout:5000}).catch(()=>{});}
    console.error('FAIL',name,String(e));
  }finally{clearTimeout(deadline);await context.close().catch(()=>{});}
  console.log(result.ok?'PASS':'ENDE MIT FEHLER',name);
}
async function iframeCase(game,view){
  const name=game+'-'+view.width+'x'+view.height+'-iframe';
  const result={name,ok:false,errors:[]};report.cases.push(result);console.log('START',name);
  const context=await newContext(view);let p;
  const deadline=setTimeout(()=>context.close().catch(()=>{}),30000);
  try{
    p=await context.newPage();capture(p,result.errors);
    await headers(await p.goto(BASE+'/minispiele/tap-duell.html?qa-host=1',{waitUntil:'load'}),name+' Elternantwort');
    const host=p.url();
    // Nur die Eltern-DOM ist eine Fixture. Das iframe lädt die unveränderte echte URL.
    await p.evaluate(url=>{
      window.__qaMessages=[];
      const frame=document.createElement('iframe');frame.id='qaGame';frame.title='Lokales Minispiel';
      frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0';
      window.addEventListener('message',e=>window.__qaMessages.push({data:e.data,origin:e.origin,sourceCorrect:e.source===frame.contentWindow}));
      frame.src=url;document.body.replaceChildren(frame);
    },BASE+'/minispiele/'+game+'.html');
    await p.waitForFunction(game=>{
      const f=document.querySelector('#qaGame');return f.contentWindow.location.pathname.endsWith('/'+game+'.html')&&f.contentDocument.readyState==='complete';
    },game);
    const frame=p.frames().find(f=>f.parentFrame()===p.mainFrame()&&f.url().endsWith('/'+game+'.html'));assert.ok(frame,'echter Spiel-Frame');
    const back=frame.locator('.backbtn,.back'),box=await back.boundingBox();assert.ok(box,'Zurück sichtbar');
    await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await p.waitForFunction(()=>window.__qaMessages.some(m=>m.data==='mini-back'));
    const messages=await p.evaluate(()=>window.__qaMessages);
    check(name+' genau eine echte mini-back-Nachricht',messages.length===1&&messages[0].data==='mini-back'&&messages[0].sourceCorrect&&messages[0].origin===new URL(BASE).origin,messages);
    check(name+' Elternseite und Spiel bleiben bis Integration geladen',p.url()===host&&frame.url().endsWith('/'+game+'.html'));
    await shot(p,name);await diagnostics(p,result.errors,name);result.ok=true;
  }catch(e){result.error=String(e.stack||e);report.errors.push({name,error:result.error});console.error('FAIL',name,String(e));
    if(p){result.probe=await p.evaluate(()=>window.__qaProbe).catch(()=>null);await p.screenshot({path:path.join(OUT,name+'-FEHLER.png'),timeout:5000}).catch(()=>{});}
  }finally{clearTimeout(deadline);await context.close().catch(()=>{});}
  console.log(result.ok?'PASS':'ENDE MIT FEHLER',name);
}
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  process.env.PLAYWRIGHT_BROWSERS_PATH||='/tmp/aban-browsers';
  const {chromium}=require(process.env.PW_MODULE||process.env.PLAYWRIGHT_MODULE||'/tmp/aban-games-audit/node_modules/playwright');
  try{
    const executablePath=process.env.PW_CHROME||NATIVE_CHROME;
    assert.equal(fs.realpathSync(executablePath),fs.realpathSync(NATIVE_CHROME),'Nur das freigegebene native Playwright-Chrome verwenden, keinen System-Wrapper');
    browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--enable-unsafe-swiftshader']});
    for(const view of VIEWS)for(const game of ['tap-duell','auto-rennen','tauziehen']){
      for(const mode of ['touch','keyboard'])await runCase(game,view,mode);
      await iframeCase(game,view);
    }
  }catch(e){report.errors.push({name:'Lauf',error:String(e.stack||e)});}
  finally{
    if(browser)await browser.close().catch(()=>{});
    report.ok=report.errors.length===0&&report.cases.length===18&&report.cases.every(c=>c.ok);
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(report.ok?'PASS':'FAIL',report.checks.filter(c=>c.ok).length+'/'+report.checks.length+' Prüfungen',OUT);
    if(!report.ok)process.exitCode=1;
  }
}
if(require.main===module){
  if(process.argv.includes('--run'))main().catch(e=>{console.error(e);process.exitCode=1;});
  else console.log('Vorbereitet. Kein Browser gestartet. Nach GPU-Freigabe mit --run starten.');
}
