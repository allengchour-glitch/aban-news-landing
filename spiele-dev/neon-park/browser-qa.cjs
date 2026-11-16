"use strict";
/* Echte Browser-Abnahme. Nur nach ausdrücklicher Übergabe der geteilten GPU! */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
if(process.env.PARK_GPU_GRANTED!=="1"){
  console.error("Kein Browser gestartet: PARK_GPU_GRANTED=1 erst nach GPU-Übergabe setzen.");process.exit(2);
}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const P=require("../../js/neon-park/premiere.js");
const base=process.env.PARK_QA_BASE||"http://127.0.0.1:8182";
const out=process.env.PARK_QA_OUT||"/tmp/aban-neon-park-browser";
const finaleOnly=process.env.PARK_QA_PHASE==="finale";
const finaleSource=process.env.PARK_QA_NATIVE_REPORT||path.join(__dirname,"fixtures/finale-ready.json");
let finaleFixture=null;
if(finaleOnly){
  const evidence=JSON.parse(fs.readFileSync(finaleSource,"utf8"));
  const saved=evidence.state||evidence.diagnostics?.find(d=>d.state?.premiere?.rides?.every(r=>r.status==="passed"&&r.stage===3))?.state?.premiere;
  assert.ok(saved,"Bestätigter nativer Vier-Fahrten-Stand als Finale-Fixture erforderlich");
  assert.ok(saved.rides.every(r=>r.status==="passed"&&r.stage===3));
  finaleFixture=P.snapshot(P.create(),saved);assert.ok(finaleFixture);
  finaleFixture.time-=finaleFixture.finale;finaleFixture.phase="ready";finaleFixture.finale=0;
}
const points=[[-30,2],[30,0],[-9.5,-39],[-6.6,47]];
const report={kind:"Echter Chromium, echte rAF-/Simulationszeit, normale UI-Eingaben; Debug-Teleport nur für Laufwege. Lokale Antwort ergänzt ausschließlich Render-Drossel (2 s Ruhe nach einer Zeichnung), keine Änderung an Spielzustand oder Uhr. Screenshots fordern echte Zeichnung an. Native lokale WebRTC-Kanäle, kein Transport-Mock. Unveränderter Render separat im unthrottled-Ordner belegt.",networkGameId:"park-premiere1",checks:[],errors:[],httpErrors:[],screenshots:[],rides:[],browserClosed:false};
function checked(name,data){report.checks.push({name,data});console.log("PASS · "+name);}
async function shot(page,name){
  await page.evaluate(()=>{if(window.__parkDraw)__parkDraw.force=true;});
  await page.waitForFunction(()=>!window.__parkDraw||!__parkDraw.force,null,{timeout:60000});
  const file=path.join(out,name+".png");await page.screenshot({path:file,timeout:60000});report.screenshots.push(file);
}
function observer(s,i){
  const r=s.rides[i],goal=P.target(i,r),delta=goal-r.value;
  if(i===0){if(r.setting<goal-0.055)return "plus";if(r.setting>goal+0.055)return "minus";}
  if(i===1){const ahead=r.value+r.velocity*0.6;if(ahead<goal-0.07)return "plus";if(ahead>goal+0.07)return "minus";}
  if(i===2){if(delta>0.055&&Math.abs(r.position)<0.19)return "plus";if(delta< -0.075)return "minus";}
  if(i===3){if(delta>0.06)return "plus";if(delta< -0.055)return "minus";}
  return null;
}
async function state(page){return page.evaluate(()=>__np.state());}
async function input(page,kind,touch=false){
  if(touch)await page.locator(kind==="start"?"#bAct":kind==="plus"?"#ridePlus":"#rideMinus").tap();
  else await page.keyboard.press(kind==="start"?"e":kind==="plus"?"r":"q");
}
async function at(page,i){await page.evaluate(p=>__np.tp(...p),points[i]);await page.locator("#director").waitFor({state:"visible"});await page.waitForTimeout(400);}
async function solve(page,i,label,touch=false){
  await at(page,i);await input(page,"start",touch);
  await page.waitForFunction(i=>__np.state().premiere.rides[i].status!=="waiting",i,{timeout:10000});
  let last=-1,screen=false,logAt=0;const deadline=Date.now()+600000;
  while(Date.now()<deadline){
    const s=(await state(page)).premiere,r=s.rides[i];
    if(r.status==="passed"){report.rides.push({label,i,elapsed:r.elapsed,inputs:r.inputs,stars:r.stars});checked(label+" · "+P.defs[i].name+" über UI bestanden",{elapsed:r.elapsed,inputs:r.inputs});return;}
    if(!screen){await shot(page,label+"-fahrt-"+i);screen=true;}
    if(r.elapsed>75)throw new Error("75 simulierte Sekunden ohne Abschluss: "+JSON.stringify(r));
    if(r.elapsed-logAt>=5){logAt=r.elapsed;console.log("FORTSCHRITT · "+label+" / "+i+" · Simulation "+r.elapsed.toFixed(1)+"s · Abschnitt "+(r.stage+1));}
    if(s.time-last>=0.25){const key=observer(s,i);if(key){await input(page,key,touch);last=s.time;}}
    await page.waitForTimeout(90);
  }
  throw new Error(label+" · Fahrt nicht abgeschlossen: "+JSON.stringify((await state(page)).premiere.rides[i]));
}
async function layout(page){return page.evaluate(()=>{
  const ids=["director","rideMinus","ridePlus","bAct","stick"],boxes={};
  for(const id of ids){const e=document.getElementById(id),r=e.getBoundingClientRect();boxes[id]={x:r.x,y:r.y,w:r.width,h:r.height,visible:!!r.width&&!!r.height};}
  const inside=Object.values(boxes).every(r=>!r.visible||r.x>=0&&r.y>=0&&r.x+r.w<=innerWidth+1&&r.y+r.h<=innerHeight+1);
  const accessible=["rideMinus","ridePlus","bAct"].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
  function separate(a,b){const x=document.getElementById(a).getBoundingClientRect(),y=document.getElementById(b).getBoundingClientRect();return x.right<=y.left||y.right<=x.left||x.bottom<=y.top||y.bottom<=x.top;}
  return {boxes,inside,accessible,headingsClear:separate("top","rides"),footerClear:separate("director","aban-recht"),width:innerWidth,height:innerHeight};
});}
(async()=>{
  fs.mkdirSync(out,{recursive:true});let browser;
  try{
    const response=await fetch(base+"/neon-park.html");assert.equal(response.status,200);
    assert.ok(response.headers.get("content-security-policy"));checked("Server liefert echte CSP",response.headers.get("content-security-policy"));
    const executable=process.env.PW_CHROME||(["/usr/bin/chromium","/usr/bin/google-chrome"].find(p=>fs.existsSync(p)));
    const args=process.env.PARK_QA_NATIVE_BASELINE==="1"?["--no-sandbox","--enable-unsafe-swiftshader"]:["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader","--disable-renderer-backgrounding","--disable-background-timer-throttling","--disable-backgrounding-occluded-windows"];
    report.launch={executable,args};
    browser=await chromium.launch({...(executable?{executablePath:executable}:{}),headless:true,args});
    async function open(context,query=""){
      const pg=await context.newPage();pg.on("pageerror",e=>report.errors.push({url:pg.url(),error:e.message}));
      pg.on("console",m=>{if(m.type()==="error")report.errors.push({url:pg.url(),location:m.location(),error:m.text()});});
      pg.on("response",r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
      await pg.route("**/neon-park.html*",async route=>{
        const response=await route.fetch();let html=await response.text();
        const marker=/<script src="\/js\/neon-park\/premiere\.js(?:\?v=[a-f0-9]{12})?"><\/script>/;
        assert.ok(marker.test(html));
        html=html.replace(marker,match=>match+`<script>
          window.__parkDraw={force:false,last:-10000,draws:0,gap:2000};
          ${finaleOnly?`(function(){var fresh=ParkPremiere.create,seed=${JSON.stringify(finaleFixture)};
            ParkPremiere.create=function(){return ParkPremiere.snapshot(fresh(),seed);};})();`:""}
          (function(){var Native=THREE.WebGLRenderer;
            THREE.WebGLRenderer=function(options){var renderer=new Native(options),draw=renderer.render.bind(renderer);
              window.__parkRenderer=renderer;renderer.render=function(){
                if(__parkDraw.force||performance.now()-__parkDraw.last>=__parkDraw.gap){
                  draw.apply(null,arguments);__parkDraw.last=performance.now();__parkDraw.force=false;__parkDraw.draws++;
                }
              };return renderer;
            };
          })();
        </script>`);
        await route.fulfill({response,body:html});
      });
      await pg.goto(base+"/neon-park.html"+query,{waitUntil:"load",timeout:60000});
      await pg.waitForFunction(()=>window.__np&&getComputedStyle(document.getElementById("lade")).display==="none",null,{timeout:60000});return pg;
    }
    if(!["coop","touch","finale"].includes(process.env.PARK_QA_PHASE)){
    const desktop=await browser.newContext({viewport:{width:1280,height:800}}),solo=await open(desktop);
    await shot(solo,"desktop-menu");await solo.locator("#bSolo").click();
    const render=await solo.evaluate(()=>{const c=document.querySelector("canvas"),gl=c.getContext("webgl2")||c.getContext("webgl");return {canvas:[c.width,c.height],webgl:!!gl,renderer:gl?.getParameter(gl.RENDERER),guests:__np.gaeste().n};});
    assert.ok(render.webgl&&render.guests>0);checked("Echter WebGL-Render mit geladenen Gästen; Zeichnungen zwischen Aufnahmen gedrosselt",render);
    const before=(await state(solo)).ich;await solo.keyboard.down("w");
    try{await solo.waitForFunction(p=>{const q=__np.state().ich;return Math.hypot(q.x-p.x,q.z-p.z)>0.5;},before,{timeout:20000,polling:100});}
    finally{await solo.keyboard.up("w");}
    assert.ok(Math.hypot((await state(solo)).ich.x-before.x,(await state(solo)).ich.z-before.z)>0.5);checked("WASD bewegt die Figur real");
    await shot(solo,"desktop-park");
    await solo.locator("#pauseBtn").click();const frozen=(await state(solo)).premiere.time;await solo.waitForTimeout(600);
    assert.equal((await state(solo)).premiere.time,frozen);await solo.locator("#pauseResume").click();checked("Solo-Pause friert echte rAF-Simulation ein");
    for(let i=0;i<4;i++)await solve(solo,i,"solo");
    assert.equal((await state(solo)).premiere.phase,"ready");await solo.evaluate(()=>__np.tp(0,6));await solo.waitForTimeout(350);await input(solo,"start");
    await solo.waitForFunction(()=>__np.state().premiere.phase==="show");await solo.waitForTimeout(3500);await shot(solo,"desktop-lichtshow");
    await solo.waitForFunction(()=>__np.state().gewonnen,null,{timeout:20000});await solo.locator("#ov").waitFor({state:"visible"});await shot(solo,"desktop-ergebnis");
    assert.match(await solo.locator("#ov h1").textContent(),/GELUNGEN/);checked("Vollständiger Solo-Abschluss über echte Tasten und gerenderte Lichtshow");
    await desktop.close();

    }
    if(!["coop","finale"].includes(process.env.PARK_QA_PHASE)){
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),touch=await open(mobile);
    await shot(touch,"touch-menu");await touch.locator("#bSolo").tap();await at(touch,0);await input(touch,"start",true);await touch.waitForTimeout(350);
    const setting=(await state(touch)).premiere.rides[0].setting;await input(touch,"plus",true);await touch.waitForTimeout(250);assert.ok((await state(touch)).premiere.rides[0].setting>setting);
    const portrait=await layout(touch);assert.ok(portrait.inside&&portrait.accessible&&portrait.headingsClear&&portrait.footerClear);await shot(touch,"touch-hochformat");checked("Echte Touch-Taps starten und regeln; Hochformat ohne Überdeckung",portrait);
    const cdp=await mobile.newCDPSession(touch);const start=(await state(touch)).ich;
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:65,y:740,id:1}]});
    await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:65,y:695,id:1}]});await touch.waitForTimeout(450);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});const moved=(await state(touch)).ich;
    assert.ok(Math.hypot(moved.x-start.x,moved.z-start.z)>0.4);checked("Native Touch-Bewegung steuert den Joystick");
    await touch.setViewportSize({width:844,height:390});await at(touch,1);await input(touch,"start",true);await touch.waitForTimeout(250);
    const landscape=await layout(touch);assert.ok(landscape.inside&&landscape.accessible&&landscape.headingsClear&&landscape.footerClear);await shot(touch,"touch-querformat");checked("Touch-Querformat: Regie und Aktion erreichbar",landscape);
    await mobile.close();
    }

    const net=await browser.newContext({viewport:{width:960,height:640}});
    await net.addInitScript(()=>{
      const Native=window.RTCPeerConnection;window.__parkNative=[];
      window.RTCPeerConnection=new Proxy(Native,{construct(Target,args){const pc=Reflect.construct(Target,args);window.__parkNative.push(pc);return pc;}});
    });
    const host=await open(net,"?mp=local"),guest=await open(net,"?mp=local");
    for(const pg of [host,guest])await pg.evaluate(()=>{
      __parkDraw.gap=Infinity;__parkDraw.last=performance.now();window.__parkSignals=[];
      for(const name of ["host","join"]){const orig=MP[name];MP[name]=function(...args){if(args[0]!=="park-premiere1")throw new Error("Falscher Park-Protokollraum");const session=orig(...args);window.__parkSession=session;
        const monitor=new BroadcastChannel("aban-mp-park-premiere1-"+session.code);monitor.onmessage=e=>__parkSignals.push({t:e.data.t,from:e.data.from});return session;};}
      window.__parkSteps=0;const step=ParkPremiere.step;ParkPremiere.step=function(...args){__parkSteps++;return step(...args);};
    });
    await host.locator("#ov summary").click();await guest.locator("#ov summary").click();
    await host.locator("#bHost").click();const code=await host.evaluate(()=>__parkSession.code);await guest.locator("#iCode").fill(code);await guest.locator("#bJoin").click();
    for(const pg of [host,guest])await pg.waitForFunction(()=>__np.state().online&&__parkSession._diag().main==="open",null,{timeout:20000});
    report.networkDrawing="3D-Zeichnen ausgesetzt außer erzwungenen Screenshots; echte JS-/UI-/WebRTC-Ausführung und echte Uhr unverändert.";
    const rtc=await guest.evaluate(async()=>({diag:__parkSession._diag(),native:__parkNative.length,stats:[...await __parkNative.find(pc=>pc.connectionState==="connected").getStats()].map(e=>e[1]).filter(e=>e.type==="data-channel").map(e=>({label:e.label,state:e.state,messagesSent:e.messagesSent,messagesReceived:e.messagesReceived}))}));
    assert.equal(rtc.diag.conn,"connected");assert.equal(rtc.diag.fast,"open");assert.ok(rtc.native>0);checked("Native lokale RTCPeerConnection mit offenem main/fast-Kanal",rtc);
    if(!finaleOnly){
    await guest.evaluate(()=>{const s=__np.state().premiere;s.phase="done";__parkSession.send({t:"pstate",s});__parkSession.send({t:"win"});__parkSession.send({t:"ride",i:0});});
    await host.waitForTimeout(500);assert.equal((await state(host)).premiere.phase,"rehearsal");assert.equal((await state(host)).gewonnen,false);
    const stepCounts={host:await host.evaluate(()=>__parkSteps),guest:await guest.evaluate(()=>__parkSteps)};
    assert.ok(stepCounts.host>0);assert.equal(stepCounts.guest,0);checked("Nur der Host simuliert; native Gastpakete können keinen Sieg setzen",stepCounts);
    for(let i=0;i<4;i++)await solve(i%2?guest:host,i,"koop");
    }else{
      report.fixture={kind:"Explizit wiederhergestellter, vorher nativ bestätigter Vier-Fahrten-Stand; nur Finale wird hier neu geprüft.",source:finaleSource,phase:finaleFixture.phase,rides:finaleFixture.rides.map(r=>({status:r.status,stage:r.stage}))};
      for(const pg of [host,guest]){const s=await state(pg);assert.equal(s.premiere.phase,"ready");assert.equal(s.gewonnen,false);}
      checked("Finale-Fixture startet bereit, ohne Sieg/Ergebniszuweisung",report.fixture);
    }
    await host.evaluate(()=>__np.tp(0,6));await host.waitForTimeout(400);await input(host,"start");
    await host.waitForFunction(()=>__np.state().premiere.phase==="show",null,{timeout:20000});
    checked("Normale E-Aktion am Stern startet die zehn Simulationssekunden Lichtshow");
    const finishDeadline=Date.now()+120000;
    for(const pg of [host,guest])await pg.waitForFunction(()=>__np.state().gewonnen,null,{timeout:Math.max(1,finishDeadline-Date.now()),polling:250});
    const hs=(await state(host)).premiere,gs=(await state(guest)).premiere;assert.deepEqual(gs,hs);
    assert.equal(await guest.evaluate(()=>__parkSteps),0,"Der Gast darf vor dem bestätigten Schlusszustand nicht selbst simulieren");
    await guest.locator("#ov").waitFor({state:"visible"});await shot(guest,"koop-gast-ergebnis");
    checked((finaleOnly?"Fokussierter nativer Finale-Abschluss":"Vollständiger nativer Koop-Abschluss über beide UIs")+"; Endstände identisch",{host:hs.phase,guest:gs.phase,guestSimulationCalls:await guest.evaluate(()=>__parkSteps)});
    await host.evaluate(()=>__parkSession.close());await guest.waitForFunction(()=>!__np.state().online,null,{timeout:10000});checked("Echter nativer Kanalabschluss wird erkannt");
    await net.close();
    assert.equal(report.errors.length,0,JSON.stringify(report.errors));checked("Keine Seiten- oder Konsolenfehler");
  }catch(error){report.failure=error.stack;console.error(error.stack);process.exitCode=1;
    if(browser)report.diagnostics=await Promise.all(browser.contexts().flatMap(c=>c.pages()).map(async p=>{
      try{return await p.evaluate(()=>({url:location.href,status:window.__parkSession?.status,diag:window.__parkSession?._diag?.(),signals:window.__parkSignals,native:window.__parkNative?.map(pc=>({conn:pc.connectionState,ice:pc.iceConnectionState,local:pc.localDescription?.type,remote:pc.remoteDescription?.type})),state:window.__np?.state()}));}
      catch(e){return {error:e.message};}
    }));
  }
  finally{if(browser){await browser.close();report.browserClosed=true;}const file=path.join(out,"result"+(process.env.PARK_QA_PHASE?"-"+process.env.PARK_QA_PHASE:"")+".json");fs.writeFileSync(file,JSON.stringify(report,null,2));console.log("BROWSER CLOSED · "+report.browserClosed+" · "+file);}
})();
