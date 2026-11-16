"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ROOT=path.resolve(__dirname,"../..");
const P=require(path.join(ROOT,"js/neon-park/premiere.js"));
let checks=0;
function test(name,fn){fn();checks++;console.log("OK · "+name);}
function ticks(s,seconds){for(let t=0;t<seconds;t+=0.02)P.step(s,0.02);}

/* Nur beobachtete Werte und dieselben einzelnen Impulse wie mit Q/R benutzen. */
function steuerung(s,i){
  const r=s.rides[i],goal=P.target(i,r),delta=goal-r.value;
  if(i===0){if(r.setting<goal-0.055)return "plus";if(r.setting>goal+0.055)return "minus";}
  if(i===1){
    const voraus=r.value+r.velocity*0.6;
    if(voraus<goal-0.07)return "plus";
    if(voraus>goal+0.07)return "minus";
  }
  if(i===2){
    if(delta>0.055&&Math.abs(r.position)<0.19)return "plus";
    if(delta< -0.075)return "minus";
  }
  if(i===3){if(delta>0.06)return "plus";if(delta< -0.055)return "minus";}
  return null;
}
function solve(s,i,advance=dt=>P.step(s,dt),act=k=>P.action(s,i,k),read=()=>s){
  act("start");let since=1;
  for(let n=0;n<15000;n++){
    const current=read();if(current.rides[i].status==="passed")return current;
    if(since>=0.24){const key=steuerung(current,i);if(key){act(key);since=0;}}
    advance(0.02);since+=0.02;
  }
  assert.fail("Probefahrt nicht lösbar: "+i+" · "+JSON.stringify(read().rides[i]));
}

test("Stehen und Warten eröffnen keine Fahrt",()=>{
  const s=P.create();ticks(s,120);assert.equal(s.phase,"rehearsal");assert.ok(s.rides.every(r=>r.status==="waiting"));
  s.rides.forEach((_,i)=>P.action(s,i,"start"));ticks(s,120);
  assert.ok(s.rides.every(r=>r.status!=="passed"));
  assert.equal(P.action(s,0,"open"),false);
});
test("Alle vier unterschiedlichen Fahrten mit begrenzten Einzelimpulsen lösbar",()=>{
  const s=P.create();
  for(let i=0;i<4;i++){
    solve(s,i);const r=s.rides[i];assert.equal(r.stage,3);assert.ok(r.inputs>0);assert.ok(r.stars>=1&&r.stars<=3);
    console.log("  "+P.defs[i].name+": "+r.elapsed.toFixed(1)+"s, "+r.inputs+" Impulse, "+r.stars+" Sterne");
  }
  assert.equal(s.phase,"ready");assert.equal(P.action(s,0,"start"),false);
  ticks(s,20);assert.equal(s.phase,"ready");
  assert.equal(P.action(s,-1,"open"),true);ticks(s,9);assert.equal(s.phase,"show");
  ticks(s,1.1);assert.equal(s.phase,"done");assert.ok(P.score(s)>=600);assert.equal(P.action(s,-1,"open"),false);
  const time=s.time;ticks(s,10);assert.equal(s.time,time);
});
test("Schiff braucht Schub im Tal, Bremse wirkt überall",()=>{
  const s=P.create();P.action(s,2,"start");const r=s.rides[2];r.position=0.6;
  const v=r.velocity;P.action(s,2,"plus");assert.equal(r.velocity,v);assert.equal(r.misses,1);
  P.action(s,2,"minus");assert.ok(r.position<0.6);r.position=0;P.action(s,2,"plus");assert.ok(r.velocity>v);
  for(let j=0;j<1000;j++)P.action(s,2,"plus");assert.ok(Math.abs(r.velocity)<=1.8);
});
test("Falsche Eingaben, kaputte und alte Snapshots ändern nichts",()=>{
  const s=P.create();assert.equal(P.action(s,99,"start"),false);assert.equal(P.action(s,0,"plus"),false);
  const good=P.snapshot(s,JSON.parse(JSON.stringify(s)));assert.ok(good);assert.notEqual(good,s);
  assert.equal(P.snapshot(s,{...good,rev:-1}),null);assert.equal(P.snapshot(s,{...good,time:NaN}),null);
  good.rides[0].value=Infinity;assert.equal(P.snapshot(s,good),null);
  assert.equal(P.snapshot(s,{...s,rides:[]}),null);
  const before=JSON.stringify(s);P.step(s,NaN);P.step(s,-2);assert.equal(JSON.stringify(s),before);
});

/* Echte three.js-Mathematik und Seitencode, aber ausdrücklich KEIN Browser/WebGL.
   DOM, Renderer, Laden und Transport werden durch kleine Mess-Doubles ersetzt. */
function page(station=false,withModels=false,seed=null){
  let clock=0,frame=null;const listeners={},elements=new Map(),timers=[],posted=[];
  function node(id=""){
    const n={id,style:{},children:[],hidden:false,textContent:"",innerHTML:"",className:"",disabled:false,
      tagName:"DIV",attributes:{},appendChild(c){this.children.push(c);return c;},
      addEventListener(k,cb){this.events??={};this.events[k]=cb;},setAttribute(k,v){this.attributes[k]=v;},
      focus(){},blur(){},closest(){return null;},click(){if(!this.disabled)this.onclick?.();},
      querySelector(q){return element(id+" "+q);},querySelectorAll(){return [];}};
    Object.defineProperty(n,"firstElementChild",{get(){return element(id+" first");}});return n;
  }
  function element(id){if(!elements.has(id))elements.set(id,node(id));return elements.get(id);}
  const document={body:node("body"),hidden:false,pointerLockElement:null,
    getElementById:element,createElement:()=>node(),createElementNS:()=>node(),
    querySelector:q=>element(q),addEventListener(k,cb){listeners["doc:"+k]=cb;},exitPointerLock(){this.pointerLockElement=null;}};
  const ctx={console,document,innerWidth:1024,innerHeight:768,devicePixelRatio:1,navigator:{},
    location:{search:station?"?station=1":"",origin:"https://test.invalid",pathname:"/neon-park.html",reload(){}},
    performance:{now:()=>clock},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},
    requestAnimationFrame(cb){frame=cb;},addEventListener(k,cb){listeners[k]=cb;}};
  ctx.window=ctx;ctx.parent=station?{postMessage:m=>posted.push(m)}:ctx;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"js/vendor/three.min.js"),"utf8"),ctx);
  ctx.THREE.WebGLRenderer=function(){return {domElement:node("canvas"),shadowMap:{},setPixelRatio(){},setSize(){},render(){}};};
  ctx.THREE.TextureLoader=function(){return {load(){return new ctx.THREE.Texture();}};};
  const models={};
  ctx.THREE.GLTFLoader=function(){return {load(url,ok,progress,fail){
    const names={th32_kettenkarussell:"Drehkranz",th32_teetassen:"Drehteller",th32_piratenschiff:"Pendel"};
    const file=path.basename(url,".glb"),name=names[file];
    if(!withModels||!name){fail?.();return;}
    const root=new ctx.THREE.Group(),rig=new ctx.THREE.Group();rig.name=name;root.add(rig);models[name]=rig;
    const track=new ctx.THREE.QuaternionKeyframeTrack(name+".quaternion",[0,1],[0,0,0,1,0,0,0,1]);
    ok({scene:root,animations:[new ctx.THREE.AnimationClip("Probe",1,[track])]});
  }};};
  vm.runInContext(fs.readFileSync(path.join(ROOT,"js/neon-park/premiere.js"),"utf8"),ctx);
  if(seed){const fresh=ctx.ParkPremiere.create;ctx.ParkPremiere.create=()=>ctx.ParkPremiere.snapshot(fresh(),seed);}
  let statusCB,messageCB,remote=null;
  const sent=[],calls=[];
  const session={role:"host",code:"TEST",onStatus(cb){statusCB=cb;},onMessage(cb){messageCB=cb;},
    send(d){const copy=JSON.parse(JSON.stringify(d));sent.push(copy);remote?.receive(copy);},
    sendFast(d){this.send(d);},close(){statusCB?.("closed");}};
  ctx.MP=Object.fromEntries(["host","join","quick"].map(kind=>[kind,(...args)=>{calls.push({kind,args});return session;}]));
  const html=fs.readFileSync(path.join(ROOT,"neon-park.html"),"utf8");
  const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join("\n");
  vm.runInContext(script,ctx,{filename:"neon-park.html"});
  return {ctx,el:element,sent,posted,models,calls,state:()=>ctx.__np.state(),receive:d=>messageCB?.(d),
    step(dt=0.02){clock+=dt*1000;frame(clock);},
    seconds(t){for(let n=0;n<Math.ceil(t/0.02);n++)this.step();},
    connect(role,other){session.role=role;remote=other;statusCB("connected");},
    status:s=>statusCB(s),start(){element("bSolo").click();},
    network(){element("bCoop").click();},key(key){listeners.keydown({key,repeat:false,preventDefault(){}});},
    flush(){while(timers.length)timers.shift()();}};
}
test("Seitencode: Nähe, echte Aktionsknöpfe, Pause und Stehenbleiben",()=>{
  const g=page();g.start();g.el("bAct").click();assert.equal(g.state().premiere.rides[0].status,"waiting");
  g.ctx.__np.tp(-30,-2.4);g.el("bAct").click();g.seconds(0.3);assert.equal(g.state().premiere.rides[0].status,"running");
  const setting=g.state().premiere.rides[0].setting;g.el("ridePlus").click();g.step();assert.ok(g.state().premiere.rides[0].setting>setting);
  g.el("pauseBtn").click();const frozen=JSON.stringify(g.state().premiere);g.seconds(2);g.key("r");
  assert.equal(JSON.stringify(g.state().premiere),frozen);g.el("pauseResume").click();g.seconds(0.3);
  assert.ok(g.state().premiere.time>JSON.parse(frozen).time);g.seconds(60);assert.equal(g.state().gewonnen,false);
});
test("Eigenes Protokoll trennt neue Schnellsuche und Räume von alten Park-Clients",()=>{
  const quick=page();quick.network();assert.deepEqual(quick.calls,[{kind:"quick",args:["park-premiere1"]}]);
  const host=page();host.el("bHost").click();assert.deepEqual(host.calls,[{kind:"host",args:["park-premiere1"]}]);
  const guest=page();guest.el("iCode").value="TEST";guest.el("bJoin").click();
  assert.deepEqual(guest.calls,[{kind:"join",args:["park-premiere1","TEST"]}]);
  const helper=fs.readFileSync(path.join(__dirname,"browser-qa.cjs"),"utf8");
  assert.ok(helper.includes('new BroadcastChannel("aban-mp-park-premiere1-"+session.code)'));
  assert.ok(!helper.includes('new BroadcastChannel("aban-mp-park-"'));
});
test("Regie bewegt echte Three-Knoten; der Mixer setzt sie nicht zurück",()=>{
  const files={th32_kettenkarussell:"Drehkranz",th32_teetassen:"Drehteller",th32_piratenschiff:"Pendel"};
  for(const [file,name] of Object.entries(files)){
    const bin=fs.readFileSync(path.join(ROOT,"models",file+".glb"));
    const gltf=JSON.parse(bin.subarray(20,20+bin.readUInt32LE(12)).toString());
    assert.ok(gltf.nodes.some(n=>n.name===name),"vorhandener Modell-Knoten: "+name);
  }
  const g=page(false,true);g.start();g.ctx.__np.tp(-30,-2.4);g.el("bAct").click();g.seconds(1);
  const turn=g.models.Drehkranz.rotation.y;g.seconds(1);assert.ok(g.models.Drehkranz.rotation.y>turn+0.1);
  g.ctx.__np.tp(-9.5,-44);g.seconds(0.3);g.el("bAct").click();g.seconds(0.3);g.key("r");g.seconds(0.3);
  assert.ok(Math.abs(g.models.Pendel.rotation.z-g.state().premiere.rides[2].position*0.9)<1e-8);
});
test("Zwei Seiten: Hostzustand, gemeinsame/aufgeteilte Regie, keine fremden Siege",()=>{
  const host=page(),guest=page();host.network();guest.network();host.connect("host",guest);guest.connect("guest",host);
  host.ctx.__np.tp(-30,-2.4);guest.ctx.__np.tp(30,-4.6);host.seconds(0.1);guest.seconds(0.1);
  host.el("bAct").click();guest.el("bAct").click();host.seconds(0.3);guest.seconds(0.3);
  assert.equal(host.state().premiere.rides[0].status,"running");assert.equal(host.state().premiere.rides[1].status,"running");
  assert.equal(JSON.stringify(guest.state().premiere),JSON.stringify(host.sent.filter(d=>d.t==="pstate").at(-1).s));
  guest.receive({t:"win"});host.receive({t:"ride",i:3});assert.equal(guest.state().gewonnen,false);assert.equal(host.state().premiere.rides[3].status,"waiting");
  const start=host.state().premiere.rides[1].inputs;
  host.receive({t:"pcmd",kind:"plus",i:3,seq:999});assert.equal(host.state().premiere.rides[3].inputs,0);
  guest.el("ridePlus").click();host.seconds(0.3);guest.seconds(0.3);
  assert.equal(host.state().premiere.rides[1].inputs,start+1);
  const replay=guest.sent.filter(d=>d.t==="pcmd").at(-1);host.receive(replay);assert.equal(host.state().premiere.rides[1].inputs,start+1);
  host.el("pauseBtn").click();const before=host.state().premiere.time;host.seconds(0.5);guest.seconds(0.5);assert.ok(host.state().premiere.time>before);
  guest.status("lost");const lostTime=guest.state().premiere.time;guest.seconds(0.5);assert.equal(guest.state().premiere.time,lostTime);
  guest.status("closed");const old=guest.state().premiere.time;guest.seconds(0.4);assert.ok(guest.state().premiere.time>old);assert.equal(guest.state().online,false);
});
test("Kompletter Koop-Abschluss erreicht beide Seiten auch zwischen Sendeintervallen",()=>{
  const host=page(true),guest=page(true);host.network();guest.network();host.connect("host",guest);guest.connect("guest",host);
  const points=[[-30,-2.4],[30,-4.6],[-9.5,-44],[-6.6,50.5]];
  for(let i=0;i<4;i++){
    const pilot=i%2?guest:host;pilot.ctx.__np.tp(...points[i]);
    for(let n=0;n<20;n++){guest.step();host.step();}
    solve(null,i,()=>{host.step();guest.step();},k=>pilot.ctx.__np.action(k),()=>pilot.state().premiere);
  }
  host.ctx.__np.tp(0,6);host.seconds(0.3);host.key("e");
  for(let n=0;n<550;n++){host.step();guest.step();}
  assert.equal(host.state().gewonnen,true);assert.equal(guest.state().gewonnen,true);
  assert.equal(guest.state().premiere.phase,"done");
  assert.equal(JSON.stringify(guest.state().premiere),JSON.stringify(host.state().premiere));
  assert.equal(host.posted.filter(m=>m.includes("stationDone")).length,1);
  assert.equal(guest.posted.filter(m=>m.includes("stationDone")).length,1);
});
test("Gespeicherte Finale-Fixture: normales E, zehn simulierte Sekunden und gemeinsames Ende",()=>{
  const seed=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/finale-ready.json"),"utf8")).state;
  const host=page(true,false,seed),guest=page(true,false,seed);
  host.network();guest.network();host.connect("host",guest);guest.connect("guest",host);
  assert.equal(host.state().gewonnen,false);assert.equal(guest.state().gewonnen,false);
  assert.equal(host.state().premiere.phase,"ready");host.ctx.__np.tp(0,6);host.key("e");
  for(let i=0;i<172;i++){host.step();guest.step();}
  assert.equal(host.state().premiere.phase,"show");assert.equal(host.state().gewonnen,false);
  for(let i=0;i<330;i++){host.step();guest.step();}
  assert.equal(host.state().gewonnen,true);assert.equal(guest.state().gewonnen,true);
  assert.equal(JSON.stringify(guest.state().premiere),JSON.stringify(host.state().premiere));
});
test("Ganze Solo-Premiere durch echte Seiteneingaben und genau eine Stationsmeldung",()=>{
  const g=page(true);g.start();const points=[[-30,-2.4],[30,-4.6],[-9.5,-44],[-6.6,50.5]];
  for(let i=0;i<4;i++){
    g.ctx.__np.tp(...points[i]);g.seconds(0.3);
    solve(null,i,()=>g.step(),k=>g.ctx.__np.action(k),()=>g.state().premiere);
  }
  assert.equal(g.state().premiere.phase,"ready");g.el("bAct").click();g.step();assert.equal(g.state().premiere.phase,"ready");
  g.ctx.__np.tp(0,6);g.seconds(0.3);g.key("e");g.seconds(9);assert.equal(g.state().gewonnen,false);
  g.seconds(1.3);assert.equal(g.state().gewonnen,true);g.seconds(2);g.flush();
  const reports=g.posted.map(m=>{try{return JSON.parse(m);}catch{return m;}}).filter(m=>m.t==="stationDone");
  assert.equal(reports.length,1);assert.equal(reports[0].score,P.score(g.state().premiere));
  assert.ok(g.el("ov").querySelector("h1").textContent.includes("GELUNGEN"));
});
console.log(checks+" ok, 0 Fehler (Node/VM; kein Browser/WebGL)");
