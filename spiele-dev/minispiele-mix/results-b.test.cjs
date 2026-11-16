'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./b-harness.cjs');

function silent(game) { assert.deepEqual(game.calls, [], 'Kein Ergebnis während des Spiels'); }
function result(game, winner) { assert.deepEqual(game.calls, [winner], 'Genau das endgültige Ergebnis'); }

for (const winner of [1, 2, 0]) {
  test(`Elfmeter: Ergebnis ${winner}, vollständige Schüsse und uneinholbarer Vorsprung`, () => {
    const game = loadGame('elfmeter');
    silent(game);
    let shots = 0;
    while (game.evaluate('phase') !== 'over') {
      const shooter = game.evaluate('shooter');
      const saved = winner !== 0 && shooter + 1 !== winner;
      game.evaluate(`finishShot(${saved})`);
      silent(game);
      game.advance(1100);
      shots++;
      assert.ok(shots <= 10);
      if (game.evaluate('phase') !== 'over') silent(game);
    }
    result(game, winner);
    assert.equal(shots, winner === 0 ? 10 : 6);
  });

  test(`Hoch-Tief: Ergebnis ${winner} erst nach Spieler 2 in Runde 10`, () => {
    const game = loadGame('hoch-tief');
    for (let turn = 0; turn < 20; turn++) {
      const player = game.evaluate('state.turn');
      const higher = winner === 0 || player === winner;
      // Der deterministische nächste Wert ist 4; höhere/niedrigere Vermutung bleibt Originalcode.
      game.evaluate(`state.cur.v=1; guess(${higher});`);
      silent(game);
      game.advance(1250);
      if (turn < 19) silent(game);
    }
    result(game, winner);
    assert.equal(game.evaluate('state.done'), true);
  });

  test(`Simon: Ergebnis ${winner}, Blau=P1, Rot=P2, beide Spieler müssen fertig sein`, () => {
    const game = loadGame('simon');
    game.evaluate('startGame()');
    const best = winner === 1 ? [2, 1] : winner === 2 ? [1, 2] : [1, 1];
    for (let player = 0; player < 2; player++) {
      for (let length = 1; length <= best[player]; length++) {
        game.advance(10000);
        game.evaluate('seq.forEach(function(value){padPressed(value);})');
        silent(game);
      }
      game.advance(10000);
      game.evaluate('padPressed((seq[0]+1)%4)');
      silent(game);
      game.advance(1200);
      if (player === 0) silent(game);
    }
    assert.equal(game.evaluate('JSON.stringify(best)'), JSON.stringify(best));
    result(game, winner);
  });

  test(`Schlange-Duell: Zeitende ${winner}, Blau=P1, Pink=P2`, () => {
    const game = loadGame('schlange-duell');
    game.evaluate(`startGame(); snakes.blue.score=${winner === 1 ? 3 : 1}; snakes.pink.score=${winner === 2 ? 3 : 1}; timeLeft=2; tick();`);
    silent(game);
    game.evaluate('tick()');
    result(game, winner);
    game.evaluate('tick(); endGame(null,"time");');
    result(game, winner);
  });

  test(`Auto-Rennen: Zieleinlauf ${winner}, Rot=P1, Blau=P2, gleicher Frame=Remis`, () => {
    const game = loadGame('auto-rennen');
    game.evaluate('startGame(); loop(1000);');
    silent(game);
    game.evaluate('loop(2100); loop(2200);');
    silent(game);
    game.evaluate(`cars.red.p=${winner !== 2 ? 0.999 : 0.5}; cars.blue.p=${winner !== 1 ? 0.999 : 0.5}; cars.red.speed=0.1; cars.blue.speed=0.1; loop(2250);`);
    result(game, winner);
    assert.equal(game.evaluate('running'), false);
    game.evaluate('loop(3000); finish("red");');
    result(game, winner);
  });

  test(`Maulwurf: Ergebnis ${winner} erst nach 20 Sekunden`, () => {
    const game = loadGame('maulwurf');
    game.evaluate('startGame()');
    const counts = winner === 1 ? [3, 1] : winner === 2 ? [1, 3] : [2, 2];
    counts.forEach((count, player) => {
      for (let i = 0; i < count; i++) {
        game.evaluate(`moles[${player + 1}][0].up=true; whack(${player + 1},0);`);
        silent(game);
      }
    });
    game.setNow(19999);
    game.evaluate('tick()');
    silent(game);
    game.setNow(20000);
    game.evaluate('tick()');
    result(game, winner);
    game.evaluate('tick(); whack(1,0);');
    result(game, winner);
  });

  test(`Quiz-Buzzer: Ergebnis ${winner} erst nach der zehnten Antwort`, () => {
    const game = loadGame('quiz-buzzer');
    for (let question = 0; question < 10; question++) {
      const player = winner || question % 2 + 1;
      game.evaluate(`buzz(${player}); pick(QUESTIONS[qi].c,answersEl.children[QUESTIONS[qi].c]);`);
      silent(game);
      game.advance(1700);
      if (question < 9) silent(game);
    }
    result(game, winner);
  });

  test(`Punkte-Jagd: Ergebnis ${winner} erst nach 30 Sekunden`, () => {
    const game = loadGame('punkte-jagd');
    game.evaluate('startGame()');
    const counts = winner === 1 ? [3, 1] : winner === 2 ? [1, 3] : [2, 2];
    counts.forEach((count, player) => {
      for (let i = 0; i < count; i++) {
        game.evaluate(`state.stars[${player}].dispatch('mousedown')`);
        silent(game);
      }
    });
    game.evaluate('loop(state.endAt-1)');
    silent(game);
    game.evaluate('loop(state.endAt)');
    result(game, winner);
    game.evaluate('loop(state.endAt+100)');
    result(game, winner);
  });
}

for (const loser of ['blue', 'pink']) {
  test(`Schlange-Duell: ${loser} kollidiert trotz höherem Punktestand und verliert`, () => {
    const game = loadGame('schlange-duell');
    game.evaluate(`startGame(); snakes.${loser}.score=9; snakes.${loser}.body=[{x:0,y:10}]; snakes.${loser}.dir=DIRS.left; snakes.${loser}.nextDir=DIRS.left; step();`);
    result(game, loser === 'blue' ? 2 : 1);
  });
}

for (const [blue, pink, winner] of [[3, 1, 1], [1, 3, 2], [2, 2, 0]]) {
  test(`Schlange-Duell: Doppel-Crash ${blue}:${pink} entscheidet über Punkte`, () => {
    const game = loadGame('schlange-duell');
    game.evaluate(`startGame(); snakes.blue.score=${blue}; snakes.pink.score=${pink}; snakes.blue.body=[{x:7,y:4}]; snakes.pink.body=[{x:7,y:6}]; step();`);
    result(game, winner);
  });
}

for (const winner of [1, 2]) {
  test(`Ballon-Pump: Ergebnis ${winner} erst bei drei Matchpunkten`, () => {
    const game = loadGame('ballon-pump');
    // Unentschiedene Einzelrunde und Doppelplatzer dürfen kein Match-Ergebnis senden.
    game.evaluate('stop(0); stop(1);');
    game.advance(450);
    silent(game);
    game.evaluate('nextRound(); P[0].limit=0.05; P[1].limit=0.05; pump(0); pump(1);');
    game.advance(450);
    silent(game);
    for (let point = 1; point <= 3; point++) {
      game.evaluate(`nextRound(); pump(${winner - 1}); stop(${winner - 1}); stop(${2 - winner});`);
      silent(game);
      game.advance(450);
      if (point < 3) silent(game);
    }
    result(game, winner);
    assert.equal(game.evaluate(`scores[${winner - 1}]`), 3);
  });

  test(`Ballon-Pump: Platzender Gegner führt zum Matchsieg ${winner}`, () => {
    const game = loadGame('ballon-pump');
    game.evaluate(`scores[${winner - 1}]=2; P[${2 - winner}].limit=0.05; pump(${2 - winner}); stop(${winner - 1});`);
    silent(game);
    game.advance(450);
    result(game, winner);
  });
}

const towers = [
  ['gleiche Höhe, P1 präziser', [100, 100, 100, 110, 100, 110], 1],
  ['gleiche Höhe, P2 präziser', [100, 100, 110, 100, 110, 100], 2],
  ['identische Türme', [100, 100, 100, 100, 100, 100], 0],
  ['P1 höher trotz schlechterer Präzision', [100, 100, 240, 100, 240, 300], 1],
  ['P2 höher trotz schlechterer Präzision', [100, 100, 100, 240, 300, 240], 2],
  ['Präzisionsrundung bleibt ein Remis', [100, 100, 100, 100.1, 100, 100.1], 0],
  ['Präzisionsunterschied jenseits der Rundung', [100, 100, 100, 100.2, 100, 100.2], 1]
];
for (const [label, positions, winner] of towers) {
  test(`Stapel-Turm: ${label}, Meldung erst nach sechs Zügen`, () => {
    const game = loadGame('stapel-turm');
    positions.forEach((x, index) => {
      game.evaluate(`curX=${x}; place();`);
      silent(game);
      game.advance(520);
      if (index < 5) silent(game);
    });
    result(game, winner);
    assert.equal(game.evaluate('placedRounds'), 6);
    assert.equal(game.evaluate('state'), 'over');
    game.advance(700);
    game.evaluate('place()');
    result(game, winner);
  });
}

const standalone = {
  'elfmeter': 'scores=[2,1]; endGame();',
  'hoch-tief': 'state.scores={1:2,2:1}; endGame();',
  'simon': 'best=[2,1]; endGame();',
  'schlange-duell': 'startGame(); endGame("pink","crash");',
  'ballon-pump': 'scores=[3,1]; showWin();',
  'auto-rennen': 'running=true; finish("red");',
  'maulwurf': 'scores={1:2,2:1}; endGame();',
  'quiz-buzzer': 'p1=2; p2=1; finish();',
  'stapel-turm': 'endGame();',
  'punkte-jagd': 'state.score=[2,1]; endGame();'
};
for (const [name, ending] of Object.entries(standalone)) {
  test(`${name}: Originalabschluss funktioniert auch ohne MiniMix-Modul`, () => {
    const game = loadGame(name, { mix: false });
    assert.doesNotThrow(() => game.evaluate(ending));
    game.advance(700);
    silent(game);
  });
}
