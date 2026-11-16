/* Lichtschienen: reine Spiellogik, ohne Renderer auch in Node prüfbar. */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ParcoursRails = api;
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  var FOOT = 0.7, SPEED = 17, CATCH = 1.05;
  var routes = [
    [
      { from: [9, 1.3], to: [23.5, 3], arch: 1.2 },
      { from: [34.5, 3], to: [49, 2.5], arch: 2 },
      { from: [80.5, 4], to: [98, 3.5], arch: 2 }
    ],
    [
      { from: [16, 3], to: [32, 5.4], arch: 1.2 },
      { from: [34, 6.2], to: [52, 5.4], arch: 1.8 },
      { from: [81, 3.3], to: [100, 2.4], arch: 4 }
    ],
    [
      { from: [16, 3], to: [37, 6.9], arch: 1.6 },
      { from: [38.2, 8], to: [54, 7.4], arch: 1.3 },
      { from: [79, 7.5], to: [95, 3.4], arch: 3 }
    ]
  ];
  function point(rail, t) {
    return { x: rail.from[0] + (rail.to[0] - rail.from[0]) * t,
      y: rail.from[1] + (rail.to[1] - rail.from[1]) * t + Math.sin(t * Math.PI) * rail.arch };
  }
  function create(level) {
    var rails = routes[level].map(function (r) {
      var rail = { from: r.from.slice(), to: r.to.slice(), arch: r.arch, length: 0 };
      var last = point(rail, 0);
      for (var i = 1; i <= 32; i++) {
        var next = point(rail, i / 32);
        rail.length += Math.hypot(next.x - last.x, next.y - last.y); last = next;
      }
      return rail;
    });
    return { rails: rails, count: 0, secured: rails.map(function () { return false; }) };
  }
  function resetPlayer(p) { p.railId = -1; p.railT = 0; p.railLock = 0; }
  function place(p, rail, t) {
    var q = point(rail, t); p.x = q.x; p.y = q.y + FOOT + 0.08;
    p.onGround = false; p.coyote = 0; p.jbuf = 0; p.jumps = 0;
  }
  function advance(state, p, dt, jump) {
    p.railLock = Math.max(0, (p.railLock || 0) - dt);
    if (!(p.railId >= 0)) return null;
    var id = p.railId, rail = state.rails[id];
    if (jump) {
      p.railId = -1; p.railLock = 0.38; p.vx = 13; p.vy = 19; p.jumps = 1;
      p.onGround = false; p.coyote = 0; p.jbuf = 0;
      return { kind: "jump", id: id };
    }
    p.railT = Math.min(1, p.railT + SPEED * dt / rail.length);
    var before = { x: p.x, y: p.y }; place(p, rail, p.railT);
    p.vx = dt > 0 ? (p.x - before.x) / dt : 0;
    p.vy = dt > 0 ? (p.y - before.y) / dt : 0;
    if (p.railT < 1) return { kind: "ride", id: id };
    var secured = !state.secured[id] && id === state.count;
    if (secured) { state.secured[id] = true; state.count++; }
    // Sanft über der Zielplattform auslaufen, statt über ihre Kante zu schiessen.
    p.railId = -1; p.railLock = 0.38; p.vx = 13; p.vy = 0; p.jumps = 0;
    return { kind: "launch", id: id, secured: secured };
  }
  // Bewegungssegment gegen die Kurve: auch bei 30 FPS kein Durchtunneln.
  function capture(state, p, previous) {
    if (p.railId >= 0 || p.railLock > 0 || p.onGround || p.vx < -1.5) return null;
    var ax = previous.x, ay = previous.y - FOOT, bx = p.x, by = p.y - FOOT;
    var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    var best = null, bestD = CATCH;
    state.rails.forEach(function (rail, id) {
      if (id > state.count) return;
      // Das letzte Fünftel ist Auslauf, kein Abkürzungs-Einstieg.
      for (var i = 0; i <= 48; i++) {
        var t = i / 60, q = point(rail, t);
        var s = len2 ? Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / len2)) : 0;
        var d = Math.hypot(q.x - ax - s * dx, q.y - ay - s * dy);
        if (d < bestD) { bestD = d; best = { id: id, t: t }; }
      }
    });
    if (!best) return null;
    p.railId = best.id; p.railT = best.t; place(p, state.rails[best.id], best.t);
    p.vx = SPEED; p.vy = 0;
    return { kind: "capture", id: best.id };
  }
  function ready(state) { return state.count === state.rails.length; }
  function checkpointAllowed(state, x) { return ready(state) || x < state.rails[state.count].from[0]; }
  return { create: create, point: point, resetPlayer: resetPlayer, advance: advance,
    capture: capture, ready: ready, checkpointAllowed: checkpointAllowed };
});
