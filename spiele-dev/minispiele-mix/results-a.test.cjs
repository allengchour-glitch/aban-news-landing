'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {loadGame} = require('./a-harness.cjs');

const terminalCases = [
  ['drei-gewinnt', "finish('X', null)", 1],
  ['drei-gewinnt', "finish('O', null)", 2],
  ['drei-gewinnt', 'finish(null, null)', 0],
  ['vier-gewinnt', 'showEnd(1)', 1],
  ['vier-gewinnt', 'showEnd(2)', 2],
  ['vier-gewinnt', 'showEnd(0)', 0],
  ['memory', 'scores={1:5,2:3};endGame()', 1],
  ['memory', 'scores={1:3,2:5};endGame()', 2],
  ['memory', 'scores={1:4,2:4};endGame()', 0],
  ['schere-stein-papier', 'score={1:3,2:2};showFinal()', 1],
  ['schere-stein-papier', 'score={1:2,2:3};showFinal()', 2],
  ['reaktions-duell', 'score1=3;score2=2;endGame()', 1],
  ['reaktions-duell', 'score1=2;score2=3;endGame()', 2],
  // Diese Endansichten unterstützen Gleichstand, auch wenn normale Best-of-Spiele ihn vermeiden.
  ['reaktions-duell', 'score1=2;score2=2;endGame()', 0],
  ['tap-duell', 'players=[GameLogic.player(),GameLogic.player()];players[0].score=100;finish()', 1],
  ['tap-duell', 'players=[GameLogic.player(),GameLogic.player()];players[1].score=100;finish()', 2],
  ['tap-duell', 'players=[GameLogic.player(),GameLogic.player()];finish()', 0],
  ['pong', 'winner=1;score={1:5,2:4};endGame()', 1],
  ['pong', 'winner=2;score={1:4,2:5};endGame()', 2],
  ['tauziehen', 'wins=[1,1];game.result=1;roundEnd()', 1],
  ['tauziehen', 'wins=[1,1];game.result=2;roundEnd()', 2],
  ['mathe-duell', 'scores={1:4,2:3};finish(1)', 1],
  ['mathe-duell', 'scores={1:3,2:4};finish(2)', 2],
  ['farb-klick', 'state.p1=4;state.p2=3;ende()', 1],
  ['farb-klick', 'state.p1=3;state.p2=4;ende()', 2],
  ['farb-klick', 'state.p1=3;state.p2=3;ende()', 0]
];

for (const [name, source, winner] of terminalCases) {
  test(`${name}: Original-Terminalfunktion meldet ${winner}; ohne Brücke gleicher Spielzustand`, () => {
    const embedded = loadGame(name), standalone = loadGame(name, {bridge: false});
    assert.deepEqual(embedded.reports, [], 'Initialisierung meldet kein Ergebnis');
    embedded.run(source);
    standalone.run(source);
    embedded.advance(800); standalone.advance(800);
    assert.deepEqual(embedded.reports, [winner]);
    assert.deepEqual(standalone.reports, []);
    // Bestehende Endansicht und Punkte müssen durch den optionalen Aufruf gleich bleiben.
    assert.deepEqual(embedded.snapshot(), standalone.snapshot());
    const states = {
      'drei-gewinnt': '[over,scoreX,scoreO]', 'vier-gewinnt': '[scoreR,scoreY]',
      memory: 'scores', 'schere-stein-papier': '[score,gameOver]',
      'reaktions-duell': '[score1,score2,state]', 'tap-duell': '[players,running]',
      pong: '[score,state]', tauziehen: '[wins,phase]',
      'mathe-duell': 'scores', 'farb-klick': 'state'
    };
    assert.equal(embedded.run(`JSON.stringify(${states[name]})`), standalone.run(`JSON.stringify(${states[name]})`));
  });
}

for (const [winner, moves] of [
  [1, [0,3,1,4,2]], [2, [0,3,1,4,8,5]], [0, [0,1,2,4,3,5,7,6,8]]
]) {
  test(`Drei gewinnt: echte Zugfolge endet mit ${winner}, vorher keine Meldung`, () => {
    const f = loadGame('drei-gewinnt');
    for (const index of moves.slice(0, -1)) { f.run(`play(${index})`); assert.deepEqual(f.reports, []); }
    f.run(`play(${moves.at(-1)})`);
    assert.deepEqual(f.reports, [winner]);
    f.run('play(6)'); f.advance(5000);
    assert.deepEqual(f.reports, [winner], 'Nach dem Spielende keine zweite Meldung');
    assert.equal(f.run('scoreX+scoreO'), winner ? 1 : 0);
  });
}

function drop(f, column) {
  f.run(`dropInColumn(${column})`);
  let frames = 0;
  while (f.run('anim !== null')) { assert.ok(++frames < 100); f.frame(); }
}
for (const [winner, moves] of [[1, [0,1,0,1,0,1,0]], [2, [0,1,0,1,2,1,2,1]]]) {
  test(`Vier gewinnt: Fallanimation und Gewinnprüfung melden Spieler ${winner} erst am Ende`, () => {
    const f = loadGame('vier-gewinnt');
    for (const column of moves.slice(0, -1)) { drop(f, column); f.advance(500); assert.deepEqual(f.reports, []); }
    drop(f, moves.at(-1));
    assert.deepEqual(f.reports, []);
    f.advance(499); assert.deepEqual(f.reports, []);
    f.advance(1); assert.deepEqual(f.reports, [winner]);
    drop(f, 6); f.advance(5000); assert.deepEqual(f.reports, [winner]);
  });
}
test('Vier gewinnt: volles Brett ohne Vierer meldet Unentschieden', () => {
  const f = loadGame('vier-gewinnt');
  f.run('grid=Array.from({length:6},(_,r)=>Array.from({length:7},(_,c)=>(Math.floor(c/2)+r)%2+1))');
  assert.equal(f.run('grid.every((row,r)=>row.every((p,c)=>checkWin(r,c,p)===null))'), true);
  f.run('grid[0][2]=0;current=2');
  drop(f, 2); f.advance(300);
  assert.deepEqual(f.reports, [0]);
  assert.equal(f.run('scoreR+scoreY'), 0);
});

function mismatch(f) {
  f.run('var available=cards.filter(c=>!c.matched);onPick(available[0]);onPick(available.find(c=>c.emoji!==available[0].emoji))');
  f.advance(900);
}
function pair(f) {
  f.run('var next=cards.find(c=>!c.matched);onPick(next);onPick(cards.find(c=>c!==next&&!c.matched&&c.emoji===next.emoji))');
  f.advance(450);
}
for (const [p1, p2, winner] of [[8,0,1], [0,8,2], [4,4,0], [5,3,1], [3,5,2]]) {
  test(`Memory: alle acht Paare führen zu ${p1}:${p2}, Ergebnis ${winner}`, () => {
    const f = loadGame('memory');
    for (let i = 0; i < p1; i++) { pair(f); assert.deepEqual(f.reports, []); }
    if (p2) { mismatch(f); assert.equal(f.run('current'), 2); assert.deepEqual(f.reports, []); }
    for (let i = 0; i < p2; i++) { pair(f); assert.deepEqual(f.reports, []); }
    assert.equal(f.run('matchedCount'), 8);
    f.advance(499); assert.deepEqual(f.reports, []);
    f.advance(1); assert.deepEqual(f.reports, [winner]);
    assert.equal(f.run('JSON.stringify(scores)'), JSON.stringify({1:p1,2:p2}));
  });
}

for (const winner of [1,2]) {
  test(`Schere–Stein–Papier: Gleichstand und Teilrunden bleiben stumm, dritter Sieg meldet ${winner}`, () => {
    const f = loadGame('schere-stein-papier');
    f.run("onPick(1,'stein');onPick(2,'stein')"); f.advance(450);
    assert.deepEqual(f.reports, []);
    assert.equal(f.run('score[1]+score[2]'), 0);
    // Ein Punkt für den späteren Verlierer, danach drei für den Gewinner.
    for (const player of [3-winner,winner,winner,winner]) {
      f.run(`nextRound();onPick(${player},'stein');onPick(${3-player},'schere')`);
      f.advance(450);
      assert.deepEqual(f.reports, f.run('gameOver') ? [winner] : []);
    }
    assert.equal(f.run(`score[${winner}]`), 3);
    assert.deepEqual(f.reports, [winner]);
    f.run("onPick(1,'papier');onPick(2,'stein')"); f.advance(5000);
    assert.deepEqual(f.reports, [winner]);
  });

  test(`Reaktionsduell: Frühstart gibt Gegner den Punkt, erst drei Siege melden ${winner}`, () => {
    const f = loadGame('reaktions-duell');
    f.run('startGame()');
    for (let round = 1; round <= 3; round++) {
      f.run(`tap(${3-winner})`);
      assert.equal(f.run(`score${winner}`), round);
      assert.deepEqual(f.reports, []);
      f.advance(1500);
      assert.deepEqual(f.reports, round === 3 ? [winner] : []);
    }
    f.run('tap(1);tap(2)'); f.advance(5000);
    assert.deepEqual(f.reports, [winner]);
  });

  test(`Pong: Ball über Gegenseite punktet, fünfter Punkt meldet ${winner}`, () => {
    const f = loadGame('pong');
    f.run('resetGame()');
    for (let point = 1; point <= 5; point++) {
      f.run(`state='play';ball.x=W/2;ball.y=${winner===1?'-ballR*3':'H+ballR*3'};ball.vx=0;ball.vy=0;step(1)`);
      assert.equal(f.run(`score[${winner}]`), point);
      assert.deepEqual(f.reports, point === 5 ? [winner] : []);
    }
    f.run('step(1)'); assert.deepEqual(f.reports, [winner]);
  });

  test(`Tauziehen: Rundengleichstand wiederholt, erst zweiter Rundensieg meldet ${winner}`, () => {
    const f = loadGame('tauziehen');
    f.run("phase='pull';game.elapsed=25;loop(50)");
    assert.equal(f.run('game.result'), 0);
    assert.equal(f.run('JSON.stringify(wins)'), '[0,0]');
    assert.deepEqual(f.reports, []);
    for (let round = 1; round <= 2; round++) {
      f.run(`startRound();phase='pull';game.elapsed=25;game.pos=${winner===1?40:60};loop(${50+round*50})`);
      assert.equal(f.run(`wins[${winner-1}]`), round);
      assert.deepEqual(f.reports, round === 2 ? [winner] : []);
    }
    f.run('loop(250)'); assert.deepEqual(f.reports, [winner]);
  });

  test(`Matheduell: Fehlversuche und drei richtige Antworten melden nichts, vierte meldet ${winner}`, () => {
    const f = loadGame('mathe-duell');
    f.run('resetGame()'); f.advance(2800);
    f.run('onAnswer(1,el.ans1.children[0],current.answer+99);onAnswer(2,el.ans2.children[0],current.answer+99)');
    assert.deepEqual(f.reports, []);
    assert.equal(f.run('scores[1]+scores[2]'), 0);
    f.advance(3700);
    for (let point = 1; point <= 4; point++) {
      f.run(`onAnswer(${winner},el.ans${winner}.children[0],current.answer)`);
      assert.equal(f.run(`scores[${winner}]`), point);
      assert.deepEqual(f.reports, []);
      f.advance(point === 4 ? 900 : 3800);
      assert.deepEqual(f.reports, point === 4 ? [winner] : []);
    }
    f.run(`onAnswer(${winner},el.ans${winner}.children[0],current.answer)`); f.advance(2000);
    assert.deepEqual(f.reports, [winner]);
  });

  test(`Farb-Klick: Früh-/Fehlklick und Einzelpunkte bleiben stumm, vierter Punkt meldet ${winner}`, () => {
    const f = loadGame('farb-klick');
    f.run(`start();tippe(${winner},state.ziel)`);
    assert.equal(f.run('state.p1+state.p2'), 0);
    f.advance(900);
    f.run(`tippe(${winner},'keine-farbe')`);
    f.advance(900);
    assert.deepEqual(f.reports, []);
    assert.equal(f.run('state.p1+state.p2'), 0);
    for (let point = 1; point <= 4; point++) {
      f.run(`tippe(${winner},state.ziel)`);
      assert.equal(f.run(`state.p${winner}`), point);
      assert.deepEqual(f.reports, []);
      f.advance(point === 4 ? 700 : 1750);
      assert.deepEqual(f.reports, point === 4 ? [winner] : []);
    }
    f.run(`tippe(${winner},state.ziel)`); f.advance(2000);
    assert.deepEqual(f.reports, [winner]);
  });
}

for (const winner of [0,1,2]) {
  for (const endBy of ['frame','tap']) {
    test(`Tap-Duell: echte Zehnsekundenfrist per ${endBy}, Ergebnis ${winner}`, () => {
      const f = loadGame('tap-duell');
      f.run('start()'); f.advance(1000);
      if (winner === 0) f.run('tap(0);tap(1)'); else f.run(`tap(${winner-1})`);
      assert.deepEqual(f.reports, []);
      f.advance(8999); f.run('loop(performance.now())');
      assert.deepEqual(f.reports, []);
      f.advance(1);
      f.run(endBy === 'frame' ? 'loop(performance.now())' : 'tap(0)');
      assert.deepEqual(f.reports, [winner]);
      f.run('tap(0);tap(1);loop(performance.now())');
      assert.deepEqual(f.reports, [winner]);
    });
  }
}
