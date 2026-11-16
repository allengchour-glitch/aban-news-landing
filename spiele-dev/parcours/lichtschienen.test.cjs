"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Rails = require("../../js/parcours/lichtschienen.js");

function player(rail, t = 0.05) {
  const q = Rails.point(rail, t);
  const p = { x: q.x, y: q.y + 0.78, vx: 13, vy: 0, onGround: false, jumps: 2 };
  Rails.resetPlayer(p);
  return p;
}
function ride(state, p, dt) {
  for (let i = 0; i < 500; i++) {
    const event = Rails.advance(state, p, dt, false);
    if (event.kind === "launch") return event;
  }
  assert.fail("Schienenfahrt endet nicht");
}

for (const dt of [1 / 120, 1 / 60, 0.033]) {
  for (let level = 0; level < 3; level++) {
    test(`Strecke ${level + 1}, ${Math.round(1 / dt)} FPS: alle drei Impulse, genau einmal`, () => {
      const state = Rails.create(level);
      for (let id = 0; id < 3; id++) {
        const p = player(state.rails[id]);
        assert.equal(Rails.capture(state, p, p).id, id);
        assert.equal(p.jumps, 0);
        assert.equal(ride(state, p, dt).secured, true);
        assert.equal(state.count, id + 1);
        assert.equal(p.railId, -1);
        assert.equal(p.vy, 0);
        assert.equal(Rails.ready(state), id === 2);
      }
      const repeat = player(state.rails[0]);
      Rails.capture(state, repeat, repeat);
      assert.equal(ride(state, repeat, dt).secured, false);
      assert.equal(state.count, 3);
      assert.equal(Rails.create(level).count, 0, "Neustart leert die Impulse");
    });
  }
}

test("Abspringen gibt keinen Impuls und erlaubt einen weiteren Luftsprung", () => {
  const state = Rails.create(0), p = player(state.rails[0]);
  Rails.capture(state, p, p);
  assert.equal(Rails.advance(state, p, 1 / 60, true).kind, "jump");
  assert.equal(p.vy, 19);
  assert.equal(p.jumps, 1);
  assert.equal(state.count, 0);
  assert.equal(Rails.capture(state, p, p), null, "Kein sofortiges Wieder-Einrasten");
  Rails.resetPlayer(p);
  assert.ok(Rails.capture(state, p, p), "Nach Rücksetzen erneut nutzbar");
});

test("Boden, Rückwärtsfahrt, Auslauf und spätere Schienen sind kein Einstieg", () => {
  const state = Rails.create(0), p = player(state.rails[0]);
  p.onGround = true; assert.equal(Rails.capture(state, p, p), null);
  p.onGround = false; p.vx = -13; assert.equal(Rails.capture(state, p, p), null);
  const end = player(state.rails[0], 1); assert.equal(Rails.capture(state, end, end), null);
  const future = player(state.rails[1]); assert.equal(Rails.capture(state, future, future), null);
});

test("Schnelle Querung erfasst die Schiene trotz beider Endpunkte ausserhalb des Fangradius", () => {
  const state = Rails.create(0), q = Rails.point(state.rails[0], 0.35);
  const p = { x: q.x, y: q.y + 0.7 - 2, vx: 13, onGround: false };
  Rails.resetPlayer(p);
  assert.equal(Rails.capture(state, p, { x: q.x, y: q.y + 0.7 + 2 }).kind, "capture");
});

test("Koop: zwei gleichzeitige Fahrer sichern denselben Team-Impuls nur einmal", () => {
  const state = Rails.create(0), a = player(state.rails[0]), b = player(state.rails[0]);
  Rails.capture(state, a, a); Rails.capture(state, b, b);
  assert.equal(ride(state, a, 0.016).secured, true);
  assert.equal(ride(state, b, 0.016).secured, false);
  assert.equal(state.count, 1);
  Rails.resetPlayer(b);
  assert.equal(state.count, 1, "Sturz löscht Team-Impulse nicht");
});

test("Checkpoints überspringen keine fehlenden Impulse", () => {
  const state = Rails.create(0);
  assert.equal(Rails.checkpointAllowed(state, 49), false);
  const p = player(state.rails[0]); Rails.capture(state, p, p); ride(state, p, 0.016);
  assert.equal(Rails.checkpointAllowed(state, 49), false);
  const q = player(state.rails[1]); Rails.capture(state, q, q); ride(state, q, 0.016);
  assert.equal(Rails.checkpointAllowed(state, 49), true);
  assert.equal(Rails.checkpointAllowed(state, 90), false);
});
