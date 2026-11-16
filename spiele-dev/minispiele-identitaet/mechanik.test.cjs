// Kein Browser: echte Inline-Logik plus ausdrücklich begrenzte DOM-/Canvas-Fixture.
'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
function source(name, hook) {
  let html = fs.readFileSync(path.join(ROOT, 'minispiele', name+'.html'), 'utf8');
  if(hook) html=html.replace(/\}\)\(\);\s*<\/script>/, `window.__miniQA=${hook};})();\n</script>`);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>! /\bsrc\s*=/.test(m[1])).map(m=>m[2]);
  assert.equal(scripts.length, 2);
  return {html, scripts};
}
function logic(name) {
  const ctx = vm.createContext({});
  vm.runInContext(source(name).scripts[0], ctx);
  return ctx.GameLogic;
}
function drive(L, strategy, hz=120) {
  const c=L.car(); c.gas=true;
  for(let tick=0;tick<hz*90;tick++) {
    if(strategy==='gut' && c.rpm>=0.8) L.shift(c);
    if(strategy==='spammen') L.shift(c);
    L.step(c,1/hz);
    if(c.p>=1) return (tick+1)/hz;
  }
  throw Error('Kein Zieleinlauf');
}
function pull(L, strategy, hz=120) {
  const s=L.state();
  for(let tick=0;tick<hz*30 && s.result===null;tick++) {
    strategy(s,tick/hz); L.step(s,1/hz);
  }
  return s;
}

test('Rhythmus: zwölf präzise Schläge ergeben 1200, auch für beide Spieler unabhängig',()=>{
  const L=logic('tap-duell'), a=L.player(), b=L.player();
  for(let i=0;i<12;i++){L.tap(a,1000+i*750);L.tap(b,1000+i*750+100);}
  assert.equal(a.score,1200); assert.equal(a.perfect,12);
  assert.equal(b.score,600); assert.equal(b.hits,12);
});
test('Rhythmus: Spammen und Vorwegnehmen schlagen Präzision nicht',()=>{
  const L=logic('tap-duell'), spam=L.player(), early=L.player();
  for(let t=0;t<10000;t+=25) L.tap(spam,t);
  L.tap(early,700); L.tap(early,1000);
  assert.equal(spam.hits,0); assert.equal(spam.score,0);
  assert.equal(early.hits,0); assert.equal(early.score,0);
});
test('Rhythmus: Fenstergrenzen, doppelte und verspätete Eingaben',()=>{
  const L=logic('tap-duell'), p=L.player();
  L.tap(p,1055); assert.equal(p.score,100);
  L.tap(p,1056); assert.equal(p.score,75);
  L.tap(p,1890); assert.equal(p.score,125);
  L.tap(p,2641); assert.equal(p.score,85);
  L.tap(p,10000); assert.equal(p.score,85);
  assert.equal(L.cue(1000).offset,0);
});
test('Fahren: ohne Gas kein Fortschritt; Gas ist ein zeitlicher Zustand',()=>{
  const L=logic('auto-rennen'), c=L.car();
  for(let i=0;i<120;i++) L.step(c,1/120);
  assert.equal(c.p,0);
  c.gas=true; for(let i=0;i<120;i++) L.step(c,1/120);
  assert.ok(c.p>0 && c.speed>0); assert.equal(c.gear,1);
  c.gas=false; for(let i=0;i<240;i++) L.step(c,1/120);
  assert.equal(c.speed,0);
});
test('Fahren: gutes Schalten gewinnt gegen Gas allein und Schalt-Spam',()=>{
  const L=logic('auto-rennen');
  const good=drive(L,'gut'), hold=drive(L,'halten'), spam=drive(L,'spammen');
  assert.ok(good<hold*0.65,`${good} < ${hold} × 0.65`);
  assert.ok(good<spam*0.65,`${good} < ${spam} × 0.65`);
});
test('Fahren: frühes / spätes Schalten, Sperrzeit und höchster Gang',()=>{
  const L=logic('auto-rennen'), c=L.car();
  c.speed=0.01;c.rpm=0.01/0.035;L.shift(c);
  assert.equal(c.gear,1);assert.ok(Math.abs(c.speed-0.0055)<1e-10);
  c.rpm=0.8;const old=c.speed;assert.equal(L.shift(c),false);assert.equal(c.speed,old);
  c.cooldown=0;c.rpm=0.96;c.speed=0.035;L.shift(c);
  assert.equal(c.gear,2);assert.ok(c.speed<0.03);
  c.gear=5;c.cooldown=0;assert.equal(L.shift(c),false);
});
test('Fahren: gleiche Strategie bei 30, 60 und 120 Hz',()=>{
  const L=logic('auto-rennen'), times=[30,60,120].map(hz=>drive(L,'gut',hz));
  assert.ok(Math.max(...times)-Math.min(...times)<0.15, times.join(', '));
});
test('Tau: Dauerhalten erschöpft und zieht danach auch bei Wiederholung nicht',()=>{
  const L=logic('tauziehen'),s=L.state();s.players[0].held=true;
  for(let i=0;i<600;i++)L.step(s,1/120);
  assert.equal(s.players[0].stamina,0);assert.equal(s.players[0].force,0);
  assert.equal(s.players[0].exhausted,true);assert.equal(s.result,null);
  const pos=s.pos;for(let i=0;i<120;i++)L.step(s,1/120);
  assert.equal(s.pos,pos);
});
test('Tau: erst Loslassen bis 35% beendet Erschöpfung',()=>{
  const L=logic('tauziehen'),s=L.state(),p=s.players[0];p.stamina=0;p.exhausted=true;
  for(let i=0;i<100;i++)L.step(s,1/120);
  assert.ok(p.stamina<35);assert.equal(p.exhausted,true);
  for(let i=0;i<30;i++)L.step(s,1/120);
  assert.equal(p.exhausted,false);assert.ok(p.stamina>=35);
  p.held=true;L.step(s,1/120);assert.ok(p.force>0);
});
test('Tau: Kraft einteilen schlägt Dauerhalten; Seiten sind symmetrisch',()=>{
  const L=logic('tauziehen');
  // Hysterese: halten bis 25%, dann bis 80% erholen.
  let pulling=true;
  const a=pull(L,s=>{if(s.players[0].stamina<25)pulling=false;if(s.players[0].stamina>80)pulling=true;s.players[0].held=pulling;s.players[1].held=true;});
  assert.equal(a.result,1);
  pulling=true;
  const b=pull(L,s=>{if(s.players[1].stamina<25)pulling=false;if(s.players[1].stamina>80)pulling=true;s.players[1].held=pulling;s.players[0].held=true;});
  assert.equal(b.result,2);assert.ok(Math.abs(a.elapsed-b.elapsed)<0.001);
});
test('Tau: gleiche Kräfte und Nichtstun enden fair als Rundengleichstand',()=>{
  const L=logic('tauziehen');
  for(const held of [true,false]){
    const s=pull(L,s=>s.players.forEach(p=>p.held=held));
    assert.equal(s.pos,50);assert.equal(s.result,0);
  }
});
test('Tau: zeitbasierte Kraft statt Bewegungen pro Tastendruck oder Bild',()=>{
  const L=logic('tauziehen');
  const positions=[30,60,120].map(hz=>{const s=L.state();s.players[0].held=true;for(let i=0;i<hz*2;i++)L.step(s,1/hz);return s.pos;});
  assert.ok(Math.max(...positions)-Math.min(...positions)<0.15,positions.join(', '));
});

// Nur Eventregistrierung, Klassen, Text, CSS-Werte und RAF-Zeit; keine Layout-Engine.
function fixture(name, hook) {
  const {html,scripts}=source(name,hook);let now=0,next=0;const frames=new Map(),timers=[];
  function target(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},fire(type,extra={}){const e={key:'',button:0,pointerType:'touch',pointerId:1,preventDefault(){},...extra};for(const fn of listeners.get(type)||[])fn(e);}};}
  const ctx2d=new Proxy({}, {get(o,key){if(key==='createLinearGradient')return ()=>({addColorStop(){}});return o[key]||(()=>{});}});
  const elements=new Map();
  for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
    const el=target(),cls=new Set((m[0].match(/\bclass="([^"]*)"/)?.[1]||'').split(/\s+/));
    Object.assign(el,{textContent:'',style:{},setPointerCapture(){},getBoundingClientRect(){return {width:600,height:400};},getContext(){return ctx2d;},classList:{add(c){cls.add(c);},remove(c){cls.delete(c);},contains(c){return cls.has(c);},toggle(c,on){if(on)cls.add(c);else cls.delete(c);}}});
    elements.set(m[1],el);
  }
  const document=Object.assign(target(),{hidden:false,getElementById(id){assert.ok(elements.has(id),'Fehlende echte HTML-ID: '+id);return elements.get(id);},querySelector(selector){assert.equal(selector,'.trophy');return trophy;}}),trophy={textContent:''};
  const window=target();window.devicePixelRatio=1;
  const sandbox={window,document,performance:{now:()=>now},requestAnimationFrame(fn){frames.set(++next,fn);return next;},cancelAnimationFrame(id){frames.delete(id);},setTimeout(fn,delay){timers.push({fn,due:now+delay});return timers.length;},Set,console};
  const ctx=vm.createContext(sandbox);
  for(const script of scripts)vm.runInContext(script,ctx);
  function advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+1000/120);for(let i=timers.length-1;i>=0;i--)if(timers[i].due<=now)timers.splice(i,1)[0].fn();const q=[...frames.values()];frames.clear();q.forEach(fn=>fn(now));}}
  return {html,ctx,window,document,advance,el:id=>elements.get(id),event(id,type,data){elements.get(id).fire(type,data);},key(type,key,extra){window.fire(type,{key,...extra});},pending:()=>frames.size};
}

test('Rhythmus echte Controller-Quelle: Touch, Tastatur, Wiederholung, Rundenende, Restart',()=>{
  const f=fixture('tap-duell');f.event('startBtn','click');f.advance(1000);
  f.event('halfTop','pointerdown');f.key('keydown','l');f.key('keydown','l',{repeat:true});
  assert.equal(f.el('cntTop').textContent,100);assert.equal(f.el('cntBottom').textContent,100);
  f.event('halfBottom','mousedown');assert.equal(f.el('cntBottom').textContent,100);
  f.key('keyup','l');f.advance(750);f.key('keydown','L');assert.equal(f.el('cntBottom').textContent,200);
  f.advance(8400);assert.equal(f.el('endOverlay').classList.contains('hidden'),false);
  f.event('againBtn','click');assert.equal(f.el('cntBottom').textContent,0);assert.equal(f.pending(),1);
  assert.equal(f.el('endOverlay').classList.contains('hidden'),true);
});
test('Auto echter Controller: unabhängige Holds, Schalten, Pointer-Cancel, Fokusverlust',()=>{
  const f=fixture('auto-rennen');f.event('startBtn','click');f.advance(2200);
  f.event('padRed','pointerdown',{pointerId:7});f.key('keydown','k');f.advance(1250);
  assert.match(f.el('scoreRed').textContent,/1%/);assert.equal(f.el('scoreRed').textContent.replace('Rot','Blau'),f.el('scoreBlue').textContent);
  f.key('keydown','s');assert.match(f.el('scoreRed').textContent,/Gang 2/);
  f.event('padRed','pointercancel',{pointerId:7});assert.equal(f.el('padRed').classList.contains('held'),false);
  assert.equal(f.el('padBlue').classList.contains('held'),true);
  f.window.fire('blur');assert.equal(f.el('padBlue').classList.contains('held'),false);
  f.event('padRed','pointerdown',{pointerId:8});f.document.hidden=true;f.document.fire('visibilitychange');
  assert.equal(f.el('padRed').classList.contains('held'),false);
});
test('Auto echter Controller: Zieleinlauf und Restart ohne geerbtes Gas / zusätzliche RAF',()=>{
  const f=fixture('auto-rennen');f.event('startBtn','click');f.advance(2200);f.key('keydown','a');f.advance(42000);
  assert.match(f.el('ovTitle').textContent,/Rot.*gewinnt/);assert.equal(f.el('overlay').classList.contains('hide'),false);
  f.event('startBtn','click');assert.match(f.el('scoreRed').textContent,/Gang 1 · 0%/);
  f.advance(3200);assert.match(f.el('scoreRed').textContent,/0%/);assert.equal(f.pending(),1);
});
test('Tau echter Controller: zwei Touches, Stamina sichtbar, gemischte Quellen und Freigabe',()=>{
  const f=fixture('tauziehen');f.event('startBtn','click');f.advance(2500);
  f.event('pad1','pointerdown',{pointerId:11});f.event('pad2','pointerdown',{pointerId:12});f.advance(1000);
  assert.match(f.el('energy1').textContent,/73%/);assert.equal(f.el('flag').style.left,'50%');
  f.key('keydown','a');f.event('pad1','pointerup',{pointerId:11});assert.equal(f.el('pad1').classList.contains('holding'),true);
  f.key('keyup','a');assert.equal(f.el('pad1').classList.contains('holding'),false);
  f.event('pad2','lostpointercapture',{pointerId:12});assert.equal(f.el('pad2').classList.contains('holding'),false);
  f.advance(500);const recovered=Number(f.el('energy1').textContent.match(/\d+/)[0]);assert.ok(recovered>=90 && recovered<=91);
});
test('Tau echter Controller: zwei Rundensiege mit Erholung, Matchende und Restart',()=>{
  const f=fixture('tauziehen');f.event('startBtn','click');
  for(let round=0;round<2;round++){
    f.advance(2500);f.key('keydown','a');f.advance(2800);f.key('keyup','a');f.advance(2200);f.key('keydown','a');f.advance(1300);f.key('keyup','a');
    assert.equal(f.el('s1').textContent,round+1);
    if(round===0)f.advance(1500);
  }
  assert.equal(f.el('endO').classList.contains('hidden'),false);
  f.event('againBtn','click');assert.equal(f.el('s1').textContent,0);assert.equal(f.el('stamina1').style.width,'100%');assert.equal(f.pending(),1);
  f.advance(2500);assert.equal(f.el('pad1').classList.contains('holding'),false);
});
test('Alle echten Zurück-Handler: eingebettet mini-back, separat history.back',()=>{
  for(const name of ['tap-duell','auto-rennen','tauziehen']){
    const {html}=source(name),handler=html.match(/onclick="([^"]+)"/)[1];
    const messages=[];let backs=0;
    const parent={postMessage(...args){messages.push(args);}},window={parent};
    const ctx={window,parent,history:{back(){backs++;}}};vm.runInNewContext(handler,ctx);
    assert.deepEqual(messages,[['mini-back','*']]);assert.equal(backs,0);
    window.parent=window;vm.runInNewContext(handler,ctx);assert.equal(backs,1);
  }
});

test('Bestehender lesender Auto-QA-Hook landet weiterhin im Controller',()=>{
  const f=fixture('auto-rennen','({read:()=>({running,winner,cars})})');
  assert.equal(f.window.__miniQA.read().running,false);
  f.event('startBtn','click');f.advance(2200);f.key('keydown','a');f.advance(1000);
  const s=f.window.__miniQA.read();assert.equal(s.running,true);assert.ok(s.cars.red.p>0);assert.equal(s.cars.blue.p,0);
});

test('Tau echter Controller: Gleichstand wiederholt die Runde ohne Punkt',()=>{
  const f=fixture('tauziehen');f.event('startBtn','click');f.advance(27600);
  assert.match(f.el('status').textContent,/Gleichstand/);assert.equal(f.el('s1').textContent,0);assert.equal(f.el('s2').textContent,0);
  f.advance(1500);assert.equal(f.el('cd').classList.contains('hidden'),false);
  f.advance(2500);assert.equal(f.el('cd').classList.contains('hidden'),true);assert.equal(f.pending(),1);
});
test('Auto echter Controller: mehrere Finger und Tastatur halten ein Gas gemeinsam',()=>{
  const f=fixture('auto-rennen');f.event('startBtn','click');
  f.event('padRed','pointerdown',{pointerId:21});f.event('padRed','pointerdown',{pointerId:22});
  f.advance(2200);assert.equal(f.el('padRed').classList.contains('held'),true);
  f.event('padRed','pointerup',{pointerId:21});assert.equal(f.el('padRed').classList.contains('held'),true);
  f.key('keydown','a');f.event('padRed','lostpointercapture',{pointerId:22});
  assert.equal(f.el('padRed').classList.contains('held'),true);
  f.key('keyup','a');assert.equal(f.el('padRed').classList.contains('held'),false);
});
