'use strict';
const assert = require('node:assert/strict');
const { game, pair } = require('./harness.cjs');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('OK ' + name); }
function enter(g) { g.run('start(); window.__nd.boss()'); g.step(); }
function opening(g, cycle = 0) { g.run(`trial.time=2+(${cycle})*(TR.definitions[_dlv].warn+TR.definitions[_dlv].attack+TR.definitions[_dlv].open+TR.definitions[_dlv].rest)+TR.definitions[_dlv].warn+TR.definitions[_dlv].attack+1; px=TR.target(trialSample()).x;pz=CHZ+TR.target(trialSample()).z;py=0;updateTrialBoss(0.01)`); }
test('Originale Eingabe: Doppelsprung, Pause und kostenloser Parcours-Sturz', () => {
  const g = game(); g.ids.startBtn.onclick(); g.press(' '); g.step(); assert.ok(g.state().py > 0);
  g.release(' '); g.press(' '); g.step(); assert.equal(g.run('jumps'), 2);
  g.press('p'); const before = g.state().py; g.step(); assert.equal(g.state().py, before); g.release('p'); g.press('p');
  g.run('py=-12;onG=false;vy=-16'); g.step(); assert.equal(g.state().hearts, 4); assert.equal(g.state().pz, 0);
});
test('Originale Koop-Platten und Brücken bleiben nutzbar; Wiederbelebung heilt genau +1', () => {
  const g = game(), out = g.run('window.__nd.coopSim()');
  assert.equal(out.offStart, true); assert.equal(out.onAfter, true); assert.equal(out.remoteHolds, true); assert.equal(out.offWhenBothAway, true);
  assert.equal(out.gOn, out.bridgeY); assert.equal(out.dmgCoop.hearts, 4); assert.equal(out.dmgCoop.boss, 4);
});
test('Alle drei Original-Bossaufrufe verwenden ihre eigenen Gefahren und passende Faustziele', () => {
  for (let level = 0; level < 3; level++) {
    const g = game({ level }); enter(g);
    g.run('trial.time=2+TR.definitions[_dlv].warn+0.3;invT=0;trialGrace=0;px=0;pz=CHZ;py=0;updateTrialBoss(0.01)');
    if (level === 0) assert.equal(g.state().hearts, 4); else assert.equal(g.state().hearts, 3);
    opening(g); const pos = g.run('var v=new THREE.Vector3();slamArm.userData.fist.getWorldPosition(v);({x:v.x,z:v.z-CHZ,y:v.y})');
    assert.ok(Math.abs(pos.x - g.state().px) < 1e-8); assert.ok(Math.abs(pos.z - (g.state().pz + 104)) < 1e-8); assert.ok(pos.y < 1.2);
    g.press('e'); assert.equal(g.state().bossHp, 5); g.press('e'); assert.equal(g.state().bossHp, 5);
    assert.equal(g.run('vRing.visible'), true); // Anzeige wird im nächsten Frame nachgeführt.
    g.run('updateTrialBoss(0.01)'); assert.equal(g.run('vRing.visible'), false);
  }
});
test('Stein-Sprung schützt; Eis und Lava schützen nur an ihren markierten Bodenstellen', () => {
  for (let level = 0; level < 3; level++) {
    const g = game({ level }); enter(g);
    g.run('trial.time=2+TR.definitions[_dlv].warn+0.5;trialGrace=0;invT=0;var s=trialSample();px=_dlv===0?s.radii[0]:Math.cos(s.direction)*9;pz=CHZ+(_dlv===0?-4:Math.sin(s.direction)*9);py=_dlv===0?1:0;updateTrialBoss(0.01)');
    assert.equal(g.state().hearts, 4);
    g.run('invT=0;px=_dlv===0?trialSample().radii[0]:0;pz=CHZ+(_dlv===0?-4:0);py=_dlv===0?0:2;updateTrialBoss(0.01)'); assert.equal(g.state().hearts, 3);
  }
});
test('Versionsräume und Host-Auswahl vereinheitlichen unterschiedliche Ebenen und Meister-Modi', () => {
  const host = game({ level: 2, master: true, clock: 10000 }), guest = game({ level: 0, clock: 900000 }); const net = pair(host, guest);
  assert.equal(net.sessions[0].namespace, 'dungeon-trials1'); assert.equal(net.sessions[1].namespace, 'dungeon-trials1');
  assert.equal(guest.state().level, 2); assert.equal(guest.run('NG'), true); assert.equal(guest.state().hearts, 3);
  guest.run('window.__nd.boss()'); net.step(); assert.equal(host.state().trial.active, true); // Gast darf zuerst ankommen.
  for (let i = 0; i < 200; i++) net.step();
  assert.equal(host.state().trial.time, guest.state().trial.time); assert.equal(host.state().phase.cycle, guest.state().phase.cycle); assert.equal(host.state().phase.phase, guest.state().phase.phase);
  const time = host.state().trial.time; host.run('window.__nd.boss()'); net.step(); assert.ok(host.state().trial.time >= time); assert.ok(host.state().trial.time > 9);
  host.run('setPaused(true)'); assert.equal(host.run('paused'), false);
});
test('Gast extrapoliert begrenzt; veraltete und fremde Pakete ändern weder Uhr noch HP', () => {
  const host = game(), guest = game({ clock: 800000 }); const net = pair(host, guest); enter(host); net.flush();
  for (let i = 0; i < 30; i++) net.step();
  const state = guest.state().trial;
  guest.timers(5000); const predicted = guest.state().phase;
  assert.equal(predicted.phase, guest.run('TR.sample(_dlv,trial.time+0.2,true).phase'));
  net.deliver(1, { t: 'trialState', round: 0, master: false, state: { ...state, seq: state.seq - 1, hp: 1, time: 0 } });
  net.deliver(1, { t: 'trialState', round: 0, master: false, state: { ...state, seq: state.seq + 99, hp: 1, run: 'alte-runde' } });
  assert.equal(guest.state().trial.time, state.time); assert.equal(guest.state().bossHp, state.hp);
  guest.run('trial.time=8;bossOn=true;px=0;pz=CHZ;py=0;invT=0;trialGrace=0;updateTrialBoss(0.01)');
  assert.equal(guest.state().hearts, 4); assert.match(guest.ids.trialHud.textContent, /Warte auf Host/);
});
test('Host bestätigt Gasttreffer einmal und synchronisiert HP; alte HP-Deltas sind wirkungslos', () => {
  const host = game(), guest = game({ clock: 700000 }); const net = pair(host, guest); enter(host); net.flush(); enter(guest); net.flush();
  opening(host); host.run('publishTrial(false)'); net.flush(); guest.run('px=TR.target(trialSample()).x;pz=CHZ+TR.target(trialSample()).z;py=0');
  guest.run('sendTrial({t:"p",x:px,y:py,z:pz})'); net.flush();
  guest.press('e'); const request = net.queue.find(m => m.data.t === 'trialHit').data; assert.equal(guest.state().bossHp, 6);
  net.flush(); assert.equal(host.state().bossHp, 5); assert.equal(guest.state().bossHp, 5);
  net.deliver(0, request); net.deliver(0, { t: 'bhit', d: 99 }); net.deliver(1, { t: 'bwin' }); assert.equal(host.state().bossHp, 5); assert.equal(guest.state().won, false);
  host.press('e'); net.flush(); assert.equal(host.state().bossHp, 3); assert.equal(guest.state().bossHp, 3);
});
test('Koop-Tod heilt beim Host genau einmal; verspäteter Tod kann Sieg nicht zurücknehmen', () => {
  const host = game(), guest = game(); const net = pair(host, guest); enter(host); net.flush();
  host.run('trial.hp=3;bossHp=3;publishTrial(false)'); net.flush(); guest.run('hearts=1;damage()');
  const death = net.queue.find(m => m.data.t === 'trialDeath').data; net.flush(); assert.equal(host.state().bossHp, 4); assert.equal(guest.state().bossHp, 4); assert.equal(guest.state().hearts, 4);
  net.deliver(0, death); assert.equal(host.state().bossHp, 4);
  host.run('trial.hp=0;bossHp=0;winGame()'); net.deliver(0, { ...death, seq: death.seq + 1 }); assert.equal(host.state().bossHp, 0);
});
test('Sieg, Stationsvertrag, zwei Zustimmungen und Rematch setzen beide Originalspiele zurück', () => {
  const host = game({ level: 1, station: true }), guest = game({ level: 2, station: true, clock: 80000 }); const net = pair(host, guest); enter(host); net.flush();
  host.run('trial.hp=0;bossHp=0;runT=42;publishTrial(false);winGame()'); net.flush(); host.timers(2700); guest.timers(2700);
  for (const g of [host, guest]) { const done = g.posts.filter(p => typeof p === 'string' && p.startsWith('{')).map(JSON.parse).find(p => p.t === 'stationDone'); assert.equal(done.win, 1); assert.ok(done.score > 0); }
  const old = host.state().trial.run; host.ids.startBtn.onclick(); net.flush(); assert.equal(host.state().trial.run, old);
  guest.ids.startBtn.onclick(); net.flush();
  for (const g of [host, guest]) { assert.equal(g.state().won, false); assert.equal(g.state().level, 1); assert.equal(g.state().hearts, 4); assert.equal(g.state().bossHp, 6); assert.equal(g.state().pz, 0); assert.equal(g.state().trial.active, false); assert.equal(g.state().round, 1); assert.equal(g.run('running'), true); assert.equal(g.state().online, true); assert.equal(g.posts.filter(p => p === '{"t":"stationRematch"}').length, 1); }
  net.deliver(1, { t: 'trialState', round: 0, master: false, state: { v: 1, run: old, level: 1, seq: 99999, time: 900, active: true, hp: 0, max: 6, hits: [-1, -1] } }); assert.equal(guest.state().bossHp, 6);
  host.ids.stationBack.onclick(); assert.equal(host.posts.at(-1), 'mini-back');
});
test('Solo-Niederlage meldet win:0; Retry behält Ebene und meldet stationRematch', () => {
  const g = game({ level: 2, station: true }); enter(g); g.run('hearts=1;damage()'); g.timers(1900);
  const done = g.posts.filter(p => p.startsWith('{')).map(JSON.parse).find(p => p.t === 'stationDone'); assert.equal(done.win, 0);
  g.ids.startBtn.onclick(); g.timers(300); assert.match(g.context.location.href, /lvl=2&station=1/); assert.equal(g.posts.at(-1), '{"t":"stationRematch"}');
});
test('Verbindungsabbruch führt mit derselben Prüfung solo weiter', () => {
  const host = game({ level: 2 }), guest = game(); const net = pair(host, guest); enter(host); net.flush(); enter(guest); net.flush();
  for (let i = 0; i < 30; i++) net.step(); const before = guest.state().trial.time; net.status(1, 'closed'); guest.step();
  assert.equal(guest.state().online, false); assert.equal(guest.state().level, 2); assert.ok(guest.state().trial.time > before); assert.equal(guest.run('trialOnline'), true);
});
test('Jede Prüfung ist mit ihren sicheren Aktionen und echten Originaltreffern solo gewinnbar', () => {
  for (let level = 0; level < 3; level++) {
    const g = game({ level, station: true }); enter(g); g.run('equipWeapon(2)');
    for (let i = 0; i < 1300 && !g.state().won; i++) {
      g.run('var s=trialSample();if(s.phase==="attack"||s.phase==="warn"){px=_dlv===0?0:Math.cos(s.direction)*9;pz=CHZ+(_dlv===0?8:Math.sin(s.direction)*9);if(_dlv===0){py=2;vy=0;}}else if(s.phase==="open"){var p=TR.target(s);px=p.x;pz=CHZ+p.z;py=0;doHit();}');
      g.step();
    }
    assert.equal(g.state().won, true); assert.equal(g.state().bossHp, 0); assert.equal(g.state().hearts, 4);
    g.timers(2700); const messages = g.posts.filter(p => p.startsWith('{')).map(JSON.parse); assert.equal(messages.filter(p => p.t === 'stationDone' && p.win === 1).length, 1);
    assert.equal(g.storage.has('nd-trial-v1-' + level + '-normal-solo'), true);
  }
});
test('Ein Fehler kostet höchstens ein Herz je Angriff; Respawn gibt beide Sprünge zurück', () => {
  const g = game({ level: 2 }); enter(g);
  g.run('trial.time=2+TR.definitions[2].warn+0.1;px=0;pz=CHZ;py=2;jumps=2;invT=0;trialGrace=0;updateTrialBoss(0.01)');
  assert.equal(g.state().hearts, 3); assert.equal(g.run('jumps'), 0);
  for (let i = 0; i < 100; i++) { g.run('px=0;pz=CHZ'); g.step(); }
  assert.equal(g.state().hearts, 3);
});
console.log(passed + ' ok, 0 Fehler');
