"use strict";
/* Erst nach Übergabe der geteilten GPU ausführen. Keine Header-/Transport-Mocks. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(process.env.ARENA_GPU_GRANTED!=='1'){
  console.error('Kein Browser gestartet. ARENA_GPU_GRANTED=1 erst nach GPU-Übergabe setzen.');process.exit(2);
}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {injectNetworkRenderFixture}=require('./network-render-fixture.cjs');
const base=process.env.ARENA_QA_BASE||'http://127.0.0.1:8182';
const out=process.env.ARENA_QA_OUT||'/tmp/aban-arena-nexus-browser';
const budget=Number(process.env.ARENA_QA_BUDGET_MS||300000);
const manualNetRender=process.env.ARENA_NET_RENDER==='manual';
const only=process.env.ARENA_QA_ONLY||'all';
assert.ok(['all','station-native','native'].includes(only),'ARENA_QA_ONLY muss all, station-native oder native sein.');
const report={checks:[],errors:[],consoleErrors:[],screenshots:[],inspection:'AUSSTEHEND: PNGs nach dem Lauf mit view_image ansehen.',
  fixtures:[
    'Solo/Touch/Station: Spiel-HTML, Assets, Renderer, rAF und Header unverändert vom Server 8182. Keine Zeit-/Renderer-Ersetzung in diesen Teilfällen.',
    manualNetRender?'Nur Koop: Test-HTML injiziert einen renderBloom-Hook. Automatische 3D-Zeichnung unterdrückt, Screenshots einzeln echt gezeichnet. Spiel-/UI-/rAF-Zeit-/Transportlogik unverändert. Kein Beleg für Leistung mit zwei gleichzeitig zeichnenden Seiten.':'Koop: normale automatische 3D-Zeichnung auf beiden Seiten, keine Renderer-Ersetzung.',
    'Kontrollierte Kampfzustände nutzen bestehende __ns-Hilfen: Schaden, Baupause, Schrott und Boss-Spawn/-Schaden. Kein Beleg für einen natürlich gespielten Zehn-Minuten-Sieg oder finale Balance.',
    'Stations-Elternseite ist eine geroutete Fixture unter der echten Survivor-URL mit deren unveränderten Headern. Das Spiel-Iframe bleibt unverändert. Wildnis-Belohnungslogik selbst wird nicht getestet.',
    'Koop nutzt den versionierten Spiel-Namensraum survivor-reactor1 und MP.localMode: native RTCPeerConnection/DataChannels, BroadcastChannel nur zum Signaling. Kein Beleg für PeerJS-Cloud, TURN, NAT oder zwei getrennte Geräte.',
    'Host/Gast teilen wegen BroadcastChannel einen Browser-Kontext und damit localStorage; individuelle Konto-Belohnungen prüft zusätzlich die getrennte VM-Suite.'
  ],runScope:only,networkRender:{mode:manualNetRender?'manual snapshots':'normal dual render'},httpErrors:[],browserClosed:false};
function pass(name,data){report.checks.push({name,data});console.log('PASS · '+name);}
async function bounded(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' nach '+ms+' ms')),ms);})]);}finally{clearTimeout(timer);}}
async function screenshot(page,name){
  const manual=await page.evaluate(()=>!!window.__arenaNetRender?.suppressed);
  if(manual)await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{__arenaNetRender.draw();resolve();})));
  const file=path.join(out,name+'.png');await page.screenshot({path:file,timeout:25000});report.screenshots.push(file);
}
async function layout(scope,ids,targets=[]){return scope.evaluate(({ids,targets})=>{
  const boxes={};
  for(const id of ids){const e=document.getElementById(id);if(!e)continue;const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    const visible=s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
    boxes[id]={x:r.x,y:r.y,w:r.width,h:r.height,visible,inside:!visible||(r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1)};
  }
  const actionable=targets.every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
  return {width:innerWidth,height:innerHeight,boxes,actionable,inside:Object.values(boxes).every(b=>b.inside)};
},{ids,targets});}
async function click(scope,id,touch=false){const locator=scope.locator('#'+id);await locator.scrollIntoViewIfNeeded();if(touch)await locator.tap();else await locator.click();}
async function read(scope){return scope.evaluate(()=>({state:__ns.state(),reactor:__ns.reactor(),position:__ns.ppos(),boss:__ns.bossState(),profile:__ns.profile(),cores:Number(localStorage.getItem('ns_cores')||0)}));}
async function rendered(scope){
  const before=await scope.evaluate(()=>__ns.renderState().frame);
  await scope.waitForFunction(n=>__ns.renderState().frame>n+2,before,{timeout:20000});
  return scope.evaluate(()=>{const c=document.querySelector('#wrap canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl&&gl.getExtension('WEBGL_debug_renderer_info');
    return {canvas:[c.width,c.height],webgl:!!gl,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER),draw:__ns.renderState(),assets:__ns.gfx()};});
}
async function retry(scope,id='againBtn',touch=false){const old=(await read(scope)).reactor.runId;await click(scope,id,touch);
  await scope.waitForFunction(previous=>__ns.state().running&&__ns.reactor().hp===300&&__ns.reactor().runId!==previous,old,{timeout:15000});
  assert.equal((await read(scope)).reactor.outcome,null);
}
async function repairUI(scope,touch,label){
  await scope.evaluate(()=>{__ns.damageReactor(100);__ns.pause();__ns.scrap(100);});
  await click(scope,'buildBtn',touch);await scope.locator('#buildmenu').waitFor({state:'visible'});
  const before=await read(scope),l=await layout(scope,['reactorRepair'],['reactorRepair']);assert.ok(l.inside&&l.actionable,JSON.stringify(l));
  await screenshot(scope.page?scope.page():scope,label+'-bau-reparatur');
  await click(scope,'reactorRepair',touch);const after=await read(scope);
  assert.equal(after.reactor.hp,Math.min(300,before.reactor.hp+60));assert.equal(after.state.scrap,before.state.scrap-12);
  pass(label+' · Reparatur über echten '+(touch?'Touch-Tap':'Klick'),{before,after,layout:l});
  await click(scope,'buildDoneBtn',touch);assert.equal((await read(scope)).state.phase,'combat');
}
async function solo(browser){
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  try{
    const page=await open(context);await screenshot(page,'desktop-menue');await click(page,'startBtn');
    const render=await rendered(page);assert.ok(render.webgl&&render.draw.calls>0&&render.draw.reactorVisible);pass('Desktop · echtes WebGL und laufende Frames',render);
    await screenshot(page,'desktop-reaktor-stabil');const before=(await read(page)).position;
    await page.keyboard.down('d');try{await page.waitForFunction(p=>__ns.ppos().x>p.x+.5,before,{timeout:10000});}finally{await page.keyboard.up('d');}
    await repairUI(page,false,'desktop');
    await page.evaluate(()=>__ns.damageReactor(200));await rendered(page);await screenshot(page,'desktop-reaktor-kritisch');
    assert.match(await page.locator('#reactorStatus').textContent(),/KRITISCH|UNTER ANGRIFF/);
    await page.evaluate(()=>__ns.damageReactor(9999));await page.locator('#over').waitFor({state:'visible'});const loss=await read(page);assert.equal(loss.reactor.reason,'reactor');
    await screenshot(page,'desktop-reaktor-verloren');await page.waitForTimeout(350);assert.equal((await read(page)).cores,loss.cores);
    await retry(page);pass('Desktop · Reaktor-Aus und echter Retry',{loss,retry:await read(page)});
    await page.evaluate(()=>__ns.boss(2));await rendered(page);await screenshot(page,'desktop-nexus');
    await page.evaluate(()=>__ns.bossDmg(999999));await page.locator('#win').waitFor({state:'visible'});assert.equal((await read(page)).reactor.outcome,'win');
    await screenshot(page,'desktop-reaktor-sieg');await retry(page,'winAgainBtn');
    await page.evaluate(()=>__ns.damageReactor(9999));await click(page,'menuBtn');await page.locator('#start').waitFor({state:'visible'});await click(page,'startBtn');
    assert.equal((await read(page)).state.running,true);pass('Desktop · kontrollierter NEXUS-Sieg, Sieg-Retry und Menü-Rückkehr');
    assert.ok((await layout(page,['hudPanel','reactorPanel','buildBtn'])).inside);
  }finally{await context.close();}
}
async function touch(browser){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  try{
    const page=await open(context);await click(page,'startBtn',true);await rendered(page);
    const portrait=await layout(page,['hudPanel','reactorPanel','buildBtn','abBtn'],['buildBtn','abBtn']);assert.ok(portrait.inside&&portrait.actionable,JSON.stringify(portrait));
    await screenshot(page,'touch-hochformat');await repairUI(page,true,'touch-hochformat');
    const session=await context.newCDPSession(page),before=(await read(page)).position;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:65,y:700,id:1}]});
    try{await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:700,id:1}]});
      await page.waitForFunction(p=>__ns.ppos().x>p.x+.5,before,{timeout:10000});
    }finally{await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    pass('Touch · nativer Joystick und Hochformat',{layout:portrait});
    await page.setViewportSize({width:844,height:390});await rendered(page);
    const landscape=await layout(page,['hudPanel','reactorPanel','buildBtn','abBtn'],['buildBtn','abBtn']);assert.ok(landscape.inside&&landscape.actionable,JSON.stringify(landscape));
    await screenshot(page,'touch-querformat');await repairUI(page,true,'touch-querformat');
    await page.evaluate(()=>__ns.damageReactor(9999));await page.locator('#over').waitFor({state:'visible'});await retry(page,'againBtn',true);
    pass('Touch · Querformat und Verlust-Retry über Taps',landscape);
  }finally{await context.close();}
}
async function station(browser){
  const context=await browser.newContext({viewport:{width:1000,height:700}});
  try{
    const page=await context.newPage();observe(page);
    await page.route('**/neon-survivor.html?qa-parent=1',async route=>{const response=await route.fetch();await route.fulfill({response,body:fs.readFileSync(path.join(__dirname,'station-fixture.html'),'utf8')});});
    await page.goto(base+'/neon-survivor.html?qa-parent=1',{waitUntil:'load',timeout:45000});
    const frame=page.frameLocator('#arena');await frame.locator('#hud').waitFor({state:'visible',timeout:45000});
    const child=page.frames().find(f=>f.url().includes('qa-child=1'));assert.ok(child);await child.waitForFunction(()=>window.__ns&&__ns.state().running);
    await rendered(child);await screenshot(page,'station-reaktor');await repairUI(child,false,'station');
    await child.evaluate(()=>__ns.damageReactor(9999));await page.waitForFunction(()=>arenaMessages.filter(m=>m&&m.t==='stationDone').length===1);
    const loss=await read(child),messages=await page.evaluate(()=>arenaMessages);
    const score=loss.state.kills+loss.state.lvl*10;
    assert.equal(messages[0].score,score);assert.equal(await child.evaluate(()=>localStorage.getItem('aban_neon_xp')),null);
    await click(child,'stationBack');await page.waitForFunction(()=>arenaMessages.includes('mini-back'));
    await page.waitForTimeout(400);assert.equal((await page.evaluate(()=>arenaMessages.filter(m=>m&&m.t==='stationDone'))).length,1);
    await retry(child);await child.evaluate(()=>{__ns.boss(2);__ns.bossDmg(999999);});
    await page.waitForFunction(()=>arenaMessages.filter(m=>m&&m.t==='stationDone').length===2);await screenshot(page,'station-sieg');
    await click(child,'stationBack');await page.waitForFunction(()=>arenaMessages.filter(m=>m==='mini-back').length===2);
    pass('Station · echter iframe, einmal stationDone je Ende, Retry und mini-back',await page.evaluate(()=>arenaMessages));
  }finally{await context.close();}
}
async function native(browser){
  const context=await browser.newContext({viewport:{width:1100,height:760}});
  try{
    if(manualNetRender)await context.route('**/neon-survivor.html?*',async route=>{
      const response=await route.fetch();await route.fulfill({response,body:injectNetworkRenderFixture(await response.text())});
    });
    await context.addInitScript(()=>{const Native=window.RTCPeerConnection;window.__arenaNative=[];
      window.RTCPeerConnection=new Proxy(Native,{construct(Target,args){const pc=Reflect.construct(Target,args);__arenaNative.push(pc);return pc;}});});
    const host=await open(context,'&mp=local'),guest=await open(context,'&mp=local');
    for(const page of [host,guest]){
      await page.evaluate(()=>{window.__arenaMatchmaking=[];for(const name of ['host','join']){const orig=MP[name];MP[name]=function(...args){__arenaMatchmaking.push({method:name,game:args[0],code:args[1]||null});const s=orig(...args);window.__arenaSession=s;return s;};}});
      await page.locator('#coopBox summary').click();
    }
    await click(host,'mpMakeBtn');const code=await host.evaluate(()=>__arenaSession.code);await guest.locator('#mpCodeIn').fill(code);await click(guest,'mpGoBtn');
    const namespace={host:await host.evaluate(()=>__arenaMatchmaking),guest:await guest.evaluate(()=>__arenaMatchmaking)};
    assert.deepEqual(namespace.host,[{method:'host',game:'survivor-reactor1',code:null}]);
    assert.deepEqual(namespace.guest,[{method:'join',game:'survivor-reactor1',code}]);
    pass('Koop · UI-Raum und Code-Einladung verwenden survivor-reactor1',namespace);
    await host.waitForFunction(()=>__ns.netDbg().mode==='host'&&__ns.state().running,null,{timeout:20000});
    await guest.waitForFunction(()=>__ns.netDbg().mode==='client'&&__ns.state().running,null,{timeout:20000});
    for(const page of [host,guest])await page.waitForFunction(()=>__arenaSession._diag().fast==='open',null,{timeout:15000});
    const stats=await guest.evaluate(async()=>({native:__arenaNative.length,diag:__arenaSession._diag(),channels:[...(await __arenaNative[0].getStats()).values()].filter(s=>s.type==='data-channel').map(s=>({label:s.label,state:s.state,sent:s.messagesSent,received:s.messagesReceived}))}));
    assert.ok(stats.native>0&&stats.diag.conn==='connected'&&stats.diag.main==='open');pass('Koop · native lokale WebRTC-Kanäle ohne Transport-Mock',stats);
    await host.evaluate(()=>{__ns.damageReactor(100);__ns.pause();__ns.scrap(100);});await click(host,'buildBtn');
    await guest.waitForFunction(()=>__ns.reactor().hp===200);const before=await read(host);
    await guest.evaluate(()=>{__ns.damageReactor(99);__ns.repairReactor();__arenaSession.send({e:'wn',rid:__ns.reactor().runId,rx:[300,300,'win','nexus',0],s:600,lv:1,kk:1});});
    await guest.waitForTimeout(300);assert.equal((await read(host)).reactor.hp,200);assert.equal((await read(host)).state.running,true);
    await click(host,'reactorRepair');await guest.waitForFunction(()=>__ns.reactor().hp===260);assert.equal((await read(host)).state.scrap,before.state.scrap-12);
    await screenshot(guest,'koop-gast-reparatur');await click(host,'buildDoneBtn');
    const p2=(await guest.evaluate(()=>__ns.p2())).pos;await guest.keyboard.down('d');try{
      await host.waitForFunction(p=>__ns.p2().pos.x>p.x+.5,p2,{timeout:12000});
    }finally{await guest.keyboard.up('d');}
    pass('Koop · Gastinput bewegt Host-P2; nur Host verändert Reaktor/Schrott');
    await host.evaluate(()=>__ns.damageReactor(9999));await guest.locator('#over').waitFor({state:'visible'});
    assert.equal((await read(guest)).reactor.reason,'reactor');await screenshot(guest,'koop-gast-verloren');
    const old=(await read(host)).reactor.runId;await click(guest,'againBtn');
    for(const page of [host,guest])await page.waitForFunction(id=>__ns.state().running&&__ns.reactor().hp===300&&__ns.reactor().runId!==id,old,{timeout:15000});
    assert.equal((await read(host)).reactor.runId,(await read(guest)).reactor.runId);
    await host.evaluate(()=>__ns.boss(2));await guest.locator('#cbBar').waitFor({state:'visible'});
    const bossLayout=await host.evaluate(()=>{const h=document.getElementById('hudPanel').getBoundingClientRect(),b=document.getElementById('cbBar').getBoundingClientRect();return {overlap:h.left<b.right&&h.right>b.left&&h.top<b.bottom&&h.bottom>b.top,hud:{x:h.x,y:h.y,w:h.width,h:h.height},boss:{x:b.x,y:b.y,w:b.width,h:b.height}};});
    assert.equal(bossLayout.overlap,false);await screenshot(host,'koop-host-nexus-layout');pass('Koop · Desktop-Bossleiste liegt außerhalb des HUD',bossLayout);
    await host.evaluate(()=>__ns.bossDmg(999999));await guest.locator('#win').waitFor({state:'visible'});await screenshot(guest,'koop-gast-sieg');
    assert.deepEqual((await read(host)).reactor,(await read(guest)).reactor);
    pass('Koop · synchroner Verlust, Gast-Retry und kontrollierter NEXUS-Sieg',{host:await read(host),guest:await read(guest)});
    if(manualNetRender){
      await screenshot(host,'koop-host-sieg');
      for(const [role,page] of [['host',host],['guest',guest]]){
        const draws=await page.evaluate(()=>({suppressed:__arenaNetRender.suppressed,draws:__arenaNetRender.draws,skipped:__arenaNetRender.skipped,frame:__ns.renderState().frame}));
        assert.ok(draws.suppressed&&draws.draws>0&&draws.skipped>0);report.networkRender[role]=draws;
      }
      pass('Koop · 3D nur für echte Screenshots manuell gezeichnet; Simulation lief weiter',report.networkRender);
    }
    await host.evaluate(()=>__arenaSession.close());await guest.waitForFunction(()=>__ns.netDbg().mode===null,null,{timeout:12000});pass('Koop · nativer Kanal sauber geschlossen');
  }finally{await context.close();}
}
function observe(page){page.on('pageerror',e=>report.errors.push({url:page.url(),error:e.message}));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({url:page.url(),error:m.text()});});page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});}
async function open(context,query=''){
  const page=await context.newPage();observe(page);page.setDefaultTimeout(12000);
  const response=await page.goto(base+'/neon-survivor.html?station=1'+query,{waitUntil:'load',timeout:45000});
  assert.ok(response.headers()['content-security-policy']);await page.waitForFunction(()=>window.__ns,null,{timeout:45000});return page;
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});let browser,server;
  try{
    const response=await bounded(fetch(base+'/neon-survivor.html'),7000,'Header-Server');assert.equal(response.status,200);
    assert.ok(response.headers.get('content-security-policy'));assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');
    pass('Server 8182 liefert echte Survivor-CSP und SAMEORIGIN',Object.fromEntries(['content-security-policy','x-frame-options'].map(k=>[k,response.headers.get(k)])));
    const executable=process.env.PW_CHROME||chromium.executablePath();
    assert.ok(fs.existsSync(executable),'Playwright-Browser fehlt; PW_CHROME auf den installierten Playwright-Browser setzen.');
    assert.ok(!['/usr/bin/chromium','/usr/bin/google-chrome'].includes(executable),'System-Wrapper ist für diese WebRTC-Prüfung nicht erlaubt.');
    report.browserExecutable=executable;
    server=await chromium.launchServer({headless:true,timeout:30000,executablePath:executable,args:['--no-sandbox','--enable-unsafe-swiftshader']});
    report.pid=server.process().pid;browser=await chromium.connect(server.wsEndpoint(),{timeout:15000});
    await bounded((async()=>{if(only==='all'){await solo(browser);await touch(browser);}if(only!=='native')await station(browser);await native(browser);})(),budget,'Gesamte Browser-Abnahme');
    assert.equal(report.errors.length,0,JSON.stringify(report.errors));pass('Keine JavaScript-Seitenfehler');
  }catch(error){report.failure=error.stack;console.error(error.stack);process.exitCode=1;}
  finally{
    if(browser)try{await bounded(browser.close(),15000,'Browser schließen');report.browserClosed=true;}catch(error){report.closeError=error.message;}
    if(server)try{await bounded(server.close(),10000,'Browser-Prozess schließen');report.browserClosed=true;}catch(error){
      report.closeError=error.message;try{await bounded(server.kill(),5000,'Browser-Prozess beenden');report.browserClosed=true;}catch(killError){report.closeError+='; '+killError.message;process.exitCode=1;}
    }
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log('BROWSER CLOSED · '+report.browserClosed+' · '+path.join(out,'result.json'));
  }
})();
