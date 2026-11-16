const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const R=require('../../js/arena-nexus/reactor.js');
const {createGame,html,root}=require('./vm-harness.cjs');

test('Asset-Verweise tragen SHA256-Anfang; Skript-Marker akzeptieren optionale Version',()=>{
  const refs=[...html.matchAll(/(?:href|src)="\/(css\/arena-nexus\.css|js\/arena-nexus\/[^"?]+\.js)\?v=([a-f0-9]{12})"/g)];
  assert.equal(refs.length,3);
  for(const [,file,hash] of refs)assert.equal(hash,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12),file);
  // Der VM-Injektionsmarker liegt im Inline-Skript, unabhängig vom src-Querystring.
  for(const source of [html,html.replace(/\?v=[a-f0-9]{12}/g,'')]){
    const scripts=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.filter(m=>m[2].includes('function buildSnap()')).length,1);
    assert.equal(scripts.filter(m=>/src="\/js\/arena-nexus\/[^"?]+\.js(?:\?v=[a-f0-9]{12})?"/.test(m[1])).length,2);
    assert.ok(require('./network-render-fixture.cjs').injectNetworkRenderFixture(source).includes('window.__arenaNetRender='));
  }
});

test('Netz-Render-Fixture unterdrückt nur Zeichnung, lässt Spielzeit laufen und erlaubt einzelne Bilder',()=>{
  const g=createGame({networkRenderFixture:true});g.start('host');g.step(.2);
  assert.ok(g.evaluate('S.t')>.15);assert.ok(g.evaluate('frame')>=4);
  assert.equal(g.evaluate('renderer.info.render.calls'),0);assert.ok(g.evaluate('window.__arenaNetRender.skipped')>=4);
  const time=g.evaluate('S.t');g.evaluate('window.__arenaNetRender.draw()');assert.ok(g.evaluate('renderer.info.render.calls')>0);
  assert.equal(g.evaluate('S.t'),time);assert.equal(g.evaluate('window.__arenaNetRender.draws'),1);
  g.evaluate('window.__arenaNetRender.restore()');const calls=g.evaluate('renderer.info.render.calls');g.step(.1);
  assert.ok(g.evaluate('renderer.info.render.calls')>calls);assert.ok(g.evaluate('S.t')>time);
});

test('Versionierter Namensraum isoliert Host, Code-Einladung, offene Suche und festen Peer von alten Tabs',()=>{
  const g=createGame(),calls=[],peers=[];
  function session(){return {code:'ABCD',ready:new Promise(()=>{}),onStatus(){},onMessage(){},close(){}};}
  g.window.MP={localMode:true,host(game){calls.push(['host',game]);return session();},join(game,code){calls.push(['join',game,code]);return session();}};
  g.window.Peer=class {constructor(id){peers.push(id);}on(){}destroy(){}};
  g.elements.get('mpMakeBtn').onclick();g.elements.get('mpCodeIn').value='ABCD';g.elements.get('mpGoBtn').onclick();g.elements.get('mpOpenBtn').onclick();
  g.evaluate('hostFixed("OFEN")');
  assert.deepEqual(calls,[['host','survivor-reactor1'],['join','survivor-reactor1','ABCD'],['join','survivor-reactor1','OFEN']]);
  assert.deepEqual(peers,['aban-survivor-reactor1-OFEN']);assert.notEqual(peers[0],'aban-nsurv-OFEN');
  const matchmakers=[...html.matchAll(/MP\.(?:host|join|quick|search)\(([^,)]+)/g)];assert.equal(matchmakers.length,3);
  for(const match of matchmakers)assert.equal(match[1],'SURVIVOR_NET_GAME');
  g.start();g.evaluate('saveCores(37)');assert.equal(g.window.localStorage.getItem('ns_cores'),'37');
});

test('Teilen öffnet direkt die Reaktor-Arena; Clipboard und echtes iframe-Station-Flag bleiben korrekt',async()=>{
  const g=createGame(),shares=[],copies=[];g.start();g.evaluate('S.t=91;S.lvl=4;S.kills=12');
  g.window.navigator.share=data=>{shares.push(data);return Promise.resolve();};
  g.elements.get('shareBtn').onclick();g.elements.get('winShareBtn').onclick();
  for(const item of shares){assert.equal(item.url,'https://abannews.com/neon-survivor.html?station=1');assert.match(item.title,/Reaktor-Verteidigung/);assert.doesNotMatch(item.text,/neon-wildnis/);}
  assert.match(shares[0].text,/91s gehalten/);assert.match(shares[1].text,/Reaktor gesichert! NEXUS besiegt/);
  delete g.window.navigator.share;g.window.navigator.clipboard={writeText:text=>{copies.push(text);return Promise.resolve();}};
  g.elements.get('shareBtn').onclick();g.elements.get('winShareBtn').onclick();await Promise.resolve();
  assert.equal(copies.length,2);for(const text of copies)assert.ok(text.endsWith('\nhttps://abannews.com/neon-survivor.html?station=1'));
  assert.equal(g.elements.get('shareBtn').textContent,'Kopiert 📋');assert.equal(g.elements.get('winShareBtn').textContent,'Kopiert 📋');
  assert.equal(g.evaluate('STATION'),false);assert.equal(g.messages.length,0);
  const station=createGame({station:true});assert.equal(station.evaluate('STATION'),true);station.evaluate('damageReactor(9999)');
  assert.equal(station.messages.filter(m=>JSON.parse(m).t==='stationDone').length,1);
});

test('Reaktor: Reparaturen konkurrieren mit Bauten um Schrott; keine Gratisheilung',()=>{
  const r=R.create(),s={scrap:20,buildPhase:'combat'};
  R.damage(r,100,null);assert.equal(R.repair(r,s,null,true),false);assert.equal(s.scrap,20);
  s.buildPhase='build';assert.equal(R.repair(r,s,null,true),true);assert.equal(r.hp,260);assert.equal(s.scrap,8);
  assert.equal(R.repair(r,s,null,true),false);s.scrap=40;
  assert.equal(R.repair(r,s,'client',true),false);assert.equal(R.damage(r,200,'client'),0);assert.equal(r.hp,260);
  assert.equal(R.repair(r,s,null,false),false);assert.equal(R.repair(r,s,null,true),true);assert.equal(r.hp,300);assert.equal(s.scrap,28);
  assert.equal(R.repair(r,s,null,true),false);assert.equal(s.scrap,28);
  for(const value of [NaN,Infinity,-10,0])assert.equal(R.damage(r,value,null),0);
});

test('Reaktor: terminale Zustände und Stations-Meldung sind einmalig',()=>{
  const r=R.create();assert.equal(R.claimStation(r),false);
  assert.equal(R.finish(r,'win','crew',null),false);R.damage(r,9999,null);assert.equal(r.hp,0);
  assert.equal(R.finish(r,'win','nexus',null),false);assert.equal(R.repair(r,{scrap:100,buildPhase:'build'},null,true),false);
  assert.equal(R.finish(r,'loss','reactor',null),true);assert.equal(R.finish(r,'win','nexus',null),false);
  assert.equal(R.claimStation(r),true);assert.equal(R.claimStation(r),false);
  const fresh=R.create();assert.equal(fresh.hp,300);assert.equal(fresh.stationSent,false);
});

test('VM lädt komplettes Spiel; zentrale Fläche bleibt frei, Bau und Reparatur teilen den Vorrat',()=>{
  const g=createGame();g.start();assert.equal(g.evaluate('S.reactor.hp'),300);assert.equal(g.evaluate('S.scrap'),20);
  assert.equal(g.evaluate('validPlace(0,0,"wall")'),false);
  g.evaluate('damageReactor(80);enterBuildPhase();openBuildMenu()');assert.equal(g.elements.get('reactorRepair').disabled,false);
  assert.equal(g.evaluate('repairReactor()'),true);assert.equal(g.evaluate('S.scrap'),8);assert.equal(g.evaluate('S.reactor.hp'),280);
  assert.equal(g.evaluate('!!placeStruct("tower",8,0)'),false);
  assert.equal(g.evaluate('!!placeStruct("wall",0,-6)'),true);assert.equal(g.evaluate('S.scrap'),0);
  assert.equal(g.evaluate('repairReactor()'),false);assert.equal(g.evaluate('structures.length'),1);
  g.evaluate('endBuildPhase()');assert.equal(g.evaluate('S.wave'),2);assert.equal(g.evaluate('paused'),false);
});

test('VM: raiders marschieren zum Reaktor statt zur nächsten beliebigen Struktur',()=>{
  const g=createGame();g.start();
  g.evaluate('enterBuildPhase();S.scrap=100;placeStruct("tower",20,20);endBuildPhase();S.spawnT=999;S.reactorRaidT=999;S.bossT=999;S.weapons={};spawnReactorRaider();window.raider=enemies.find(function(e){return e.active&&e.raider;});raider.m.position.set(12,0.7,12);');
  const before=g.evaluate('Math.hypot(raider.m.position.x,raider.m.position.z)');g.step(1);
  assert.ok(g.evaluate('Math.hypot(raider.m.position.x,raider.m.position.z)')<before-2);
  assert.equal(g.evaluate('raider._tstruct.reactor'),true);
  g.evaluate('raider.m.position.set(0,0.7,3.5);player.position.set(40,0.9,40)');g.step(1);
  assert.ok(g.evaluate('S.reactor.hp')<300);assert.ok(g.elements.get('reactorStatus').textContent.includes('UNTER ANGRIFF'));
});

test('VM: Mauer blockiert Angreifer tatsächlich',()=>{
  const g=createGame();g.start();g.evaluate('enterBuildPhase();S.scrap=100;placeStruct("wall",0,-6);endBuildPhase();S.spawnT=999;S.reactorRaidT=999;S.bossT=999;S.weapons={};spawnReactorRaider();window.raider=enemies.find(function(e){return e.active&&e.raider;});raider.m.position.set(0,0.7,-8);');
  g.step(3);assert.equal(g.evaluate('S.reactor.hp'),300);assert.ok(g.evaluate('structures[0].hp')<60);assert.ok(g.evaluate('raider.m.position.z')<-7);
});

test('VM: Reaktor-Aus umgeht keine Wiederbelebung; Verlust, Sieg und stationDone zahlen nur einmal',()=>{
  const g=createGame({station:true});g.evaluate('S.kills=30;S.t=80;S.revives=3;paused=true');
  const before=g.evaluate('loadCores()');g.evaluate('damageReactor(9999);gameOver();win();reactorStationDone()');
  assert.equal(g.evaluate('running'),false);assert.equal(g.evaluate('paused'),false);assert.equal(g.evaluate('S.revives'),3);
  assert.equal(g.evaluate('S.reactor.outcome'),'loss');assert.equal(g.evaluate('loadCores()')-before,20);
  assert.equal(g.messages.filter(m=>JSON.parse(m).t==='stationDone').length,1);
  assert.equal(g.window.localStorage.getItem('aban_neon_xp'),null);
  g.elements.get('againBtn').onclick();assert.equal(g.evaluate('S.reactor.hp'),300);assert.equal(g.evaluate('S.reactor.outcome'),null);assert.equal(g.evaluate('paused'),false);
  g.evaluate('S.kills=0;S.t=600;cb_start(2);cb_damage(999999);gameOver();win()');
  assert.equal(g.evaluate('S.reactor.outcome'),'win');assert.equal(g.messages.filter(m=>JSON.parse(m).t==='stationDone').length,2);
  assert.ok(g.elements.get('winV').innerHTML.includes('Reaktor: 300/300'));
  g.elements.get('winMenuBtn').onclick();assert.equal(g.elements.get('start').classList.contains('hide'),false);
});

test('VM: Snapshot-Roundtrip, Host-Autorität, veraltete Pakete, Koop-Retry und End-Duplikate',()=>{
  const host=createGame(),guest=createGame();host.start('host');guest.send({e:'bg',mi:0,rid:host.evaluate('S.runId')});
  host.evaluate('damageReactor(100);enterBuildPhase();S.scrap=100;placeStruct("tower",8,0);upgradeTower(structures[0]);damageStruct(structures[0],7);openBuildMenu()');
  const snap=host.snapshot();guest.send(snap);
  assert.equal(guest.evaluate('S.reactor.hp'),200);assert.equal(guest.evaluate('S.scrap'),62);assert.equal(guest.evaluate('S.hostPaused'),true);
  assert.equal(guest.evaluate('cliSt[0].lv'),2);assert.equal(guest.evaluate('cliSt[0].hp'),53);
  guest.evaluate('damageReactor(99);repairReactor();placeStruct("wall",0,-6);endBuildPhase();spawnBossWave()');
  assert.equal(guest.evaluate('S.reactor.hp'),200);assert.equal(guest.evaluate('S.scrap'),62);assert.equal(guest.evaluate('structures.length'),0);
  host.window.__testMessage=snap;assert.equal(host.evaluate('applySnap(window.__testMessage)'),false);
  host.send({e:'ov',rx:[0,300,'loss','reactor',0],rid:snap.rid});assert.equal(host.evaluate('running'),true);
  guest.send({...snap,seq:snap.seq-1,rx:[1,300,null,null,0]});assert.equal(guest.evaluate('S.reactor.hp'),200);
  guest.send({...snap,seq:snap.seq+1,rid:'alte-runde',rx:[1,300,null,null,0]});assert.equal(guest.evaluate('S.reactor.hp'),200);
  guest.evaluate('window.towerMirror=cliSt[0].g');host.evaluate('repairReactor()');guest.send(host.snapshot());assert.equal(guest.evaluate('S.reactor.hp'),260);
  assert.equal(guest.evaluate('cliSt[0].g===window.towerMirror'),true);
  host.evaluate('damageReactor(9999)');const end=host.snapshot();guest.send(end);
  const cores=guest.evaluate('loadCores()'),runs=guest.evaluate('getProfile(curName).runs');
  const event={e:'ov',rid:end.rid,rx:end.rx,s:end.t,lv:end.lv,kk:end.k2,wv:end.wv};guest.send(event);guest.send(event);
  assert.equal(guest.evaluate('loadCores()'),cores);assert.equal(guest.evaluate('getProfile(curName).runs'),runs);
  host.start('host');guest.send({e:'bg',mi:0,rid:host.evaluate('S.runId')});guest.send(event);
  assert.equal(guest.evaluate('running'),true);assert.equal(guest.evaluate('S.reactor.hp'),300);
  guest.send({e:'bg',mi:0,rid:host.evaluate('S.runId')});assert.equal(guest.evaluate('S.reactor.hp'),300);
  guest.send({e:'bg',mi:0,rid:snap.rid});assert.equal(guest.evaluate('S.runId'),host.evaluate('S.runId'));
});

test('VM: Stacheln stoppen einen Belagerer und liefern verwertbaren Schrott',()=>{
  const g=createGame();g.start();g.evaluate('enterBuildPhase();S.scrap=100;placeStruct("spike",0,-6);endBuildPhase();S.spawnT=999;S.reactorRaidT=999;S.bossT=999;S.weapons={};player.position.set(40,0.9,40);spawnReactorRaider();window.raider=enemies.find(function(e){return e.active&&e.raider;});raider.m.position.set(0,0.7,-8);');
  g.step(3);assert.equal(g.evaluate('raider.active'),false);assert.equal(g.evaluate('S.reactor.hp'),300);
  assert.equal(g.evaluate('S.kills'),1);assert.equal(g.evaluate('scrapPickups.filter(function(s){return s.active;}).length'),2);
});

test('VM: ein vorhandener Turm verhindert Reaktorschaden im kontrollierten Angriff',()=>{
  function run(defended){const g=createGame();g.start();g.window.__defended=defended;
    g.evaluate('enterBuildPhase();if(window.__defended)placeStruct("tower",0,-6);endBuildPhase();S.spawnT=999;S.reactorRaidT=999;S.bossT=999;S.weapons={};player.position.set(40,0.9,40);spawnReactorRaider();window.raider=enemies.find(function(e){return e.active&&e.raider;});raider.m.position.set(0,0.7,-16);');
    g.step(15);return {hp:g.evaluate('S.reactor.hp'),kills:g.evaluate('S.kills')};}
  const bare=run(false),defended=run(true);assert.ok(bare.hp<270);assert.equal(defended.hp,300);assert.equal(defended.kills,1);
});

test('VM: persönliche Wiederbelebung und Koop-Rettung verändern Reaktor-HP nicht',()=>{
  const solo=createGame();solo.start();solo.evaluate('damageReactor(70);S.revives=1;S.hp=0;S.spawnT=999;S.reactorRaidT=999;S.bossT=999');solo.step(.1);
  assert.equal(solo.evaluate('S.revives'),0);assert.ok(solo.evaluate('S.hp')>0);assert.equal(solo.evaluate('S.reactor.hp'),230);
  const host=createGame();host.start('host');host.evaluate('damageReactor(50);S.hp=0;p1DownFn();P2.g.position.copy(player.position);for(var k=0;k<62;k++)coopSimP2(0.05)');
  assert.equal(host.evaluate('p1Down'),0);assert.ok(host.evaluate('S.hp')>0);assert.equal(host.evaluate('S.reactor.hp'),250);
  host.evaluate('P2.hp=0;p2DownFn();P2.g.position.copy(player.position);for(var k=0;k<62;k++)coopSimP2(0.05)');
  assert.equal(host.evaluate('P2.down'),0);assert.ok(host.evaluate('P2.hp')>0);assert.equal(host.evaluate('S.reactor.hp'),250);
  const bot=createGame();bot.start('ai');bot.evaluate('damageReactor(90);S.hp=0;p1DownFn()');bot.step(5);
  assert.equal(bot.evaluate('p1Down'),0);assert.equal(bot.evaluate('S.reactor.hp'),210);assert.equal(bot.window.__ns.netSim(),'ok');
});

test('VM: 10-Minuten-Schwelle ist kein Sieg; NEXUS lässt den Reaktor weiter angreifen',()=>{
  const g=createGame();g.start();g.evaluate('S.t=600;S.cbDone=[true,true,false];S.spawnT=999;S.bossT=999;S.weapons={};player.position.set(40,0.9,40)');g.step(.1);
  assert.equal(g.evaluate('S.finalBoss'),true);assert.equal(g.evaluate('CB.kind'),2);assert.equal(g.evaluate('S.reactor.outcome'),null);
  g.step(6);assert.ok(g.evaluate('enemies.some(function(e){return e.active&&e.raider;})'));
  g.evaluate('damageReactor(9999);cb_damage(999999)');assert.equal(g.evaluate('S.reactor.outcome'),'loss');assert.equal(g.evaluate('S.won'),false);
});

test('VM: ungültige Spiegel-Daten werden ohne Teiländerung verworfen',()=>{
  const host=createGame(),guest=createGame();host.start('host');guest.send({e:'bg',mi:0,rid:host.evaluate('S.runId')});const valid=host.snapshot();
  const invalid=[{p1:null},{en:[[100000,0,0,1,0]]},{st:[['tower',0,0,20,40,9]]},{rx:[NaN,300,null,null,0]},{rx:[300,300,'loss','reactor',0]},{rx:[0,300,'win','nexus',0]},{cb:[9,0,0,10,100]}];
  for(const fields of invalid){const bad={...valid,seq:valid.seq+1,...fields};guest.send(bad);assert.equal(guest.evaluate('lastSnapSeq'),-1);assert.equal(guest.evaluate('S.reactor.hp'),300);}
  guest.send(valid);assert.equal(guest.evaluate('lastSnapSeq'),valid.seq);
});

test('VM: NEXUS-Sieg, Endereignis vor Snapshot und Wiederholung belohnen Gast nur einmal',()=>{
  const host=createGame(),guest=createGame();host.start('host');guest.send({e:'bg',mi:0,rid:host.evaluate('S.runId')});
  const events=[];host.window.__events=events;host.evaluate('netSess={send:function(m){window.__events.push(m)},sendFast:function(m){window.__events.push(m)}};S.t=601;S.kills=30;cb_start(2);cb_damage(999999)');
  const event=events.find(m=>m.e==='wn');assert.ok(event);const before=guest.evaluate('loadCores()');guest.send(event);guest.send(event);guest.send(host.snapshot());
  assert.equal(events.find(m=>m.k==='s').rx[2],'win');
  assert.equal(guest.evaluate('loadCores()')-before,235);assert.equal(guest.evaluate('S.reactor.outcome'),'win');assert.equal(guest.evaluate('S.won'),true);
  assert.equal(guest.evaluate('paused'),false);assert.equal(guest.elements.get('win').classList.contains('hide'),false);
  const requests=[];guest.window.__requests=requests;guest.evaluate('netSess={send:function(m){window.__requests.push(m)}}');guest.elements.get('winAgainBtn').onclick();
  assert.equal(requests[0].k,'again');assert.equal(guest.evaluate('running'),false);
});

test('VM: Host sendet auch pausierte Bauzustände und terminalen Snapshot bei Reaktor-Aus',()=>{
  const host=createGame(),guest=createGame(),packets=[];host.start('host');guest.send({e:'bg',mi:0,rid:host.evaluate('S.runId')});host.window.__packets=packets;
  host.evaluate('netSess={send:function(){},sendFast:function(m){window.__packets.push(m)}};enterBuildPhase();openBuildMenu()');host.step(.2);
  assert.ok(packets.length>0);assert.equal(packets[0].pa,true);assert.equal(packets[0].bp,'build');guest.send(packets.at(-1));
  const position=guest.json('({x:P2.g.position.x,z:P2.g.position.z})');guest.evaluate('keys.d=true');guest.step(.2);assert.deepEqual(guest.json('({x:P2.g.position.x,z:P2.g.position.z})'),position);
  packets.length=0;host.evaluate('damageReactor(9999)');assert.equal(packets.length,1);assert.equal(packets[0].rx[2],'loss');guest.send(packets[0]);
  assert.equal(guest.evaluate('running'),false);assert.equal(guest.evaluate('S.reactor.reason'),'reactor');assert.equal(guest.evaluate('S.hostPaused'),false);
});
