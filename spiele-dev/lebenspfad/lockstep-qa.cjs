/* Online-Lockstep-REPLAY, KEIN PeerJS-/WebRTC-Netztest.
 * PLAYWRIGHT_MODULE=playwright BASE=http://localhost:8150 node lockstep-qa.cjs
 * PLAYWRIGHT_BROWSERS_PATH wie von Playwright vorgesehen; REPORT optional
 * (Standard /tmp/lebenspfad-lockstep.json).
 * Nur Antwort-Instrumentierung: beginNet + offene Transport-Attrappe; echte
 * roll/sendPick -> netApply/updNet, srand, Rad, Bewegung und Feldlogik bleiben aktiv.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8150';
const REPORT = process.env.REPORT || '/tmp/lebenspfad-lockstep.json';
const SEED = 0x1eb3a9;
const report = {
  kind: 'ONLINE LOCKSTEP REPLAY — NOT REAL NETWORK', status: 'running',
  base: BASE, seed: SEED, measuredAt: new Date().toISOString(),
  limits: ['Kein PeerJS, WebRTC, Signaling, TLS, Reconnect oder Paketverlust getestet.',
    'Transport-Attrappen liefern geordnete Nachrichten; kein sync/resync erlaubt.',
    'Kein vollständiger Spieldurchlauf; lokaler Pause-/UI-Test liegt außerhalb des Umfangs.',
    'Nur G.t (Animationszeit) wird aus dem vollständigen Spielzustandsvergleich entfernt.',
    'Drehrad wird über seinen vorhandenen Antipp-Handler beschleunigt.'],
  actions: [], checkpoints: [], overlays: [], errors: [], counts: { roll: 0, pick: 0, fork: 0 },
};
const HOOK = `
// Ausschließlich im Browser-Test injiziert, keine Quelldatei wird verändert.
(function(){
  var sent=[], draws=[], dice=[], originalRandom=srand, originalWheel=showWheel;
  srand=function(){var value=originalRandom();if(NET.on)draws.push({seed:NET.seed>>>0,value:value});return value;};
  showWheel=function(n,done){dice.push(n);return originalWheel(n,done);};
  window.__lockstepQA={
    start:function(you,seed){
      NET.host=you===0;
      NET.conns=[{open:true,_idx:1-you,send:function(raw){sent.push(JSON.parse(raw));}}];
      beginNet({seed:seed,you:you,names:['Replay A','Replay B'],mode:'voll',adult:false,bots:[false,false]});
    },
    take:function(){return sent.splice(0);},
    receive:function(m){netApply(m);},
    action:function(a){if(a.t==='roll')roll();else sendPick(a.k);},
    skipWheel:function(){if(G&&G.phase==='rolling'&&_radDiv&&_radDiv.onclick)_radDiv.onclick();},
    read:function(){
      var state=netStateSnapshot();if(state)delete state.t;
      return {state:state,seed:NET.seed>>>0,cardSeq:window._cardSeq||0,
        options:(window._cardOpts||[]).map(function(o,k){return {k:k,l:o.l,sub:o.sub||'',hidden:!!o.hidden};}),
        title:window._cardOpts?document.getElementById('cTitle').textContent:null,
        dice:dice.slice(),draws:draws.slice(),queue:JSON.parse(JSON.stringify(NET.q)),
        forkSel:forkSel,moveQ:moveQ};
    },
    stable:function(){return G&&running&&!NET.q.length&&(!!window._cardOpts||G.phase==='idle');},
    local:function(){return {t:G.t,paused:lpLocalPaused(),info:lpInfoOpen,menu:menuOpen,
      online:NET.on,my:NET.my,turn:G.turn,seq:window._cardSeq||0,seed:NET.seed>>>0};},
    info:function(kind){
      if(kind==='rules'){document.getElementById('menuBtn').click();document.getElementById('rulesBtn').click();}
      else document.getElementById('journeyOpen').click();
    },
    close:function(){document.getElementById('liClose').click();}
  };
})();
`;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let browser;
let clients = [];
let sourceResponse, sourceHTML;
async function reads() { return Promise.all(clients.map(p => p.evaluate(() => __lockstepQA.read()))); }
async function stable() {
  await Promise.all(clients.map(p => p.waitForFunction(() => __lockstepQA.stable(), null, { timeout: 60000 })));
}
function equal(a, b, label) { assert.deepStrictEqual(a, b, label); }
async function checkpoint(label) {
  await stable();
  const [a, b] = await reads();
  equal(a, b, label);
  assert.equal(a.queue.length, 0);
  report.checkpoints.push({ label, hash: digest(a), seed: a.seed, cardSeq: a.cardSeq,
    turn: a.state.turn, round: a.state.round, phase: a.state.phase,
    tiles: a.state.players.map(p => p.tile), state: a });
  return a;
}
async function transportAction(action, before) {
  const actor = before.state.turn;
  await clients[actor].evaluate(a => __lockstepQA.action(a), action);
  const sent = await clients[actor].evaluate(() => __lockstepQA.take());
  const gameplay = sent.filter(m => ['roll', 'pick'].includes(m.t));
  assert.equal(gameplay.length, 1, 'Genau eine echte ausgehende Spielaktion');
  const message = gameplay[0];
  equal(message, action.t === 'pick' ? { t: 'pick', k: action.k, seq: before.cardSeq } : { t: 'roll' });
  assert(!sent.some(m => ['sync', 'resync'].includes(m.t)), 'Kein heilender Snapshot');
  report.actions.push({ order: report.actions.length, actor, message, seedBefore: before.seed });
  await clients[1 - actor].evaluate(m => __lockstepQA.receive(m), message);
  if (action.t === 'roll') {
    await Promise.all(clients.map(p => p.waitForFunction(() => __lockstepQA.read().state.phase === 'rolling')));
    await Promise.all(clients.map(p => p.evaluate(() => __lockstepQA.skipWheel())));
  }
  report.counts[action.t]++;
}
async function overlay(client, kind, state) {
  const p = clients[client];
  const localBefore = await p.evaluate(() => __lockstepQA.local());
  await p.evaluate(k => {
    const beforeOpts = window._cardOpts;
    __lockstepQA.info(k);
    if (beforeOpts !== window._cardOpts) throw new Error('Info ersetzt die Kartenoptionen');
  }, kind);
  equal(await p.evaluate(() => __lockstepQA.read()), state, kind + ': Öffnen verändert Spielzustand');
  assert(await p.locator('#localInfoOv').isVisible());
  assert.match(await p.locator('#liTitle').innerText(), kind === 'rules' ? /So spielt/ : /Lebensbuch/);
  await p.waitForFunction(t => __lockstepQA.local().t > t + 0.08, localBefore.t, { timeout: 15000 });
  const localAfter = await p.evaluate(() => __lockstepQA.local());
  assert.equal(localAfter.paused, false, 'Online-Info darf nicht pausieren');
  assert.equal(localAfter.info, true);
  assert.equal(localAfter.menu, false);
  equal(await p.evaluate(() => __lockstepQA.read()), state, kind + ': Warten verbraucht RNG/Karten');
  const entry = { client, kind, phase: state.state.phase, seed: state.seed, cardSeq: state.cardSeq,
    simulationAdvanced: localAfter.t > localBefore.t, continuedAction: false };
  report.overlays.push(entry);
  return async () => {
    assert(await p.locator('#localInfoOv').isVisible(), 'Info bleibt während Spielaktion offen');
    await p.evaluate(() => __lockstepQA.close());
    assert.equal(await p.evaluate(() => __lockstepQA.local().paused), false);
    entry.continuedAction = true;
  };
}
async function main() {
  browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
    context.setDefaultTimeout(60000);
    context.setDefaultNavigationTimeout(60000);
    await context.addInitScript(() => {
      localStorage.setItem('lp_tut_seen', '1');
      localStorage.setItem('lp_opt', JSON.stringify({ graphics: 'light', motion: false, music: false, sfx: false, tempo: 1.7 }));
    });
    const p = await context.newPage();
    p.on('pageerror', error => report.errors.push({ client: i, message: error.message }));
    await p.route('**/lebenspfad.html', async route => {
      try {
        if (!sourceResponse) {
          sourceResponse = await route.fetch();
          assert.equal(sourceResponse.status(), 200);
          sourceHTML = await sourceResponse.text();
          report.sourceHash = digest(sourceHTML);
          report.sourcePolicy = 'Beide Clients erhalten dieselbe zu Laufbeginn geladene HTML-Antwort.';
          report.headers = sourceResponse.headers();
        }
        const marker = sourceHTML.lastIndexOf('})();');
        assert(marker > 0, 'Spiel-IIFE für Testinstrumentierung fehlt');
        await route.fulfill({ response: sourceResponse, body: sourceHTML.slice(0, marker) + HOOK + sourceHTML.slice(marker) });
      } catch (error) {
        report.errors.push({ client: i, message: error.message });
        await route.abort();
      }
    });
    await p.goto(new URL('/lebenspfad.html', BASE).href, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__lockstepQA);
    clients.push(p);
  }
  await Promise.all(clients.map((p, you) => p.evaluate(({ you, seed }) => __lockstepQA.start(you, seed), { you, seed: SEED })));
  let state = await checkpoint('Online-Start: unterschiedliche Sitze, gleicher Seed');
  const seats = await Promise.all(clients.map(p => p.evaluate(() => __lockstepQA.local().my)));
  equal(seats, [0, 1]);
  // Messgerät negativ prüfen, ausschließlich an Kopien im Testprozess.
  for (const key of ['seed', 'cardSeq', 'geld']) {
    const changed = structuredClone(state);
    if (key === 'geld') changed.state.players[0].geld++;
    else changed[key]++;
    assert.throws(() => equal(state, changed), assert.AssertionError);
  }
  report.comparatorCanaries = ['RNG-Seed', 'cardSeq', 'Spieler-Geld'];
  const probed = new Set();
  while (report.counts.roll < 16 || report.counts.fork < 2 || probed.size < 4) {
    assert(report.actions.length < 100 && report.counts.roll < 30, 'Begrenzter Replay erreicht Pflichtabdeckung nicht');
    const card = state.options.length > 0;
    const action = card ? { t: 'pick', k: state.options.filter(o => !o.hidden)[state.state.turn % state.options.filter(o => !o.hidden).length].k } : { t: 'roll' };
    const prefix = card ? 'card-' : 'idle-';
    const slot = ['rules', 'book'].map(kind => prefix + kind).find(key => !probed.has(key));
    let close;
    if (slot && probed.size < 4) {
      const kind = slot.endsWith('book') ? 'book' : 'rules';
      close = await overlay(1 - state.state.turn, kind, state);
      probed.add(slot);
    }
    if (state.state.phase === 'fork') {
      assert.equal(action.t, 'pick');
      report.counts.fork++;
    }
    const previous = state;
    await transportAction(action, state);
    state = await checkpoint('Aktion ' + report.actions.length + ': ' + action.t);
    if (action.t === 'roll') {
      const expectedSeed = (Math.imul(previous.seed, 1664525) + 1013904223) >>> 0;
      assert.equal(state.dice.at(-1), 1 + Math.floor(expectedSeed / 4294967296 * 6), 'Echtes Würfelergebnis aus LCG');
    }
    if (close) await close();
  }
  // Falls letzte Aktion eine Karte geöffnet hat: auch deren Entscheidung weiterführen.
  while (state.options.length) {
    assert(report.actions.length < 100);
    const option = state.options.find(o => !o.hidden);
    await transportAction({ t: 'pick', k: option.k }, state);
    state = await checkpoint('Offene Karte abgeschlossen');
  }
  let seed = SEED;
  for (const draw of state.draws) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    assert.equal(draw.seed, seed);
    assert.equal(draw.value, seed / 4294967296);
  }
  assert.equal(state.seed, seed);
  assert(state.draws.length > report.counts.roll, 'Feldlogik verbraucht zusätzlich echte RNG-Werte');
  assert(report.counts.pick >= 4);
  assert.equal(report.overlays.length, 4);
  assert(report.overlays.every(o => o.continuedAction));
  assert(state.state.players.every(p => p.tile > 0 && p.bio.length > 0));
  for (const p of clients) {
    const sent = await p.evaluate(() => __lockstepQA.take());
    assert(!sent.some(m => ['sync', 'resync'].includes(m.t)), 'Kein Snapshot-Abgleich während Replay');
  }
  equal(report.errors, [], 'Keine JavaScript-Laufzeitfehler');
  report.rngDraws = state.draws.length;
  report.final = state;
  report.status = 'passed';
}
main().catch(error => {
  report.status = 'failed';
  report.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, kind: report.kind, counts: report.counts,
    checkpoints: report.checkpoints.length, overlays: report.overlays.length, report: REPORT,
    failure: report.failure && report.failure.message }));
});
