"use strict";
/* Echte HTML-Spielschleife + echte THREE-Geometrie, DOM/Renderer nur als Stubs.
   Kein Browser, kein WebGL-Kontext, keine GPU. Keine visuelle Aussage. */
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "neon-jump.html"), "utf8");
const Three = require(path.join(root, "js/vendor/three.min.js"));
const Rails = require(path.join(root, "js/parcours/lichtschienen.js"));

function game({ station = false, mobile = false, savedLevel = "0" } = {}) {
  const elements = new Map(), events = {}, posts = [], storage = new Map([["nj_lvl", savedLevel]]);
  let now = 100;
  function element(tag = "div") {
    const classes = new Set();
    const el = { tagName: tag.toUpperCase(), style: {}, dataset: {}, children: [], textContent: "",
      addEventListener(type, fn) { (this.events ||= {})[type] = fn; },
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      insertBefore(child) { return this.appendChild(child); },
      getContext() { return new Proxy({}, { get: (_, prop) => prop === "createRadialGradient" ? () => ({ addColorStop() {} }) : () => {}, set: () => true }); },
      classList: { add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, contains(c) { return classes.has(c); },
        toggle(c, value) { if (value === undefined) value = !classes.has(c); value ? classes.add(c) : classes.delete(c); } } };
    Object.defineProperty(el, "id", { get: () => el._id, set(id) { el._id = id; elements.set(id, el); } });
    Object.defineProperty(el, "className", { get: () => [...classes].join(" "), set(value) { classes.clear(); value.split(/\s+/).forEach(c => classes.add(c)); } });
    Object.defineProperty(el, "innerHTML", { get: () => el._html || "", set(value) { el._html = value; el.children = []; } });
    return el;
  }
  const body = element("body");
  for (const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const el = element(); el.id = m[1]; el.className = m[0].match(/class="([^"]*)"/)?.[1] || ""; body.appendChild(el);
  }
  class Renderer {
    constructor() { this.capabilities = { isWebGL2: false }; this.domElement = element("canvas"); }
    setPixelRatio() {} setSize() {} setRenderTarget() {} render() {} clear() {}
  }
  class Audio { pause() {} play() { return Promise.resolve(); } }
  const context = { console, THREE: { ...Three, WebGLRenderer: Renderer }, ParcoursRails: Rails,
    innerWidth: mobile ? 390 : 1280, innerHeight: mobile ? 844 : 720, devicePixelRatio: 1,
    navigator: {}, location: { search: "?station=1", pathname: "/neon-jump.html", replace() {} },
    performance: { now: () => now }, Audio, requestAnimationFrame() {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    sessionStorage: { getItem() { return null; } },
    matchMedia: () => ({ matches: mobile }),
    addEventListener(type, fn) { (events[type] ||= []).push(fn); },
    document: { body, createElement: element, getElementById: id => elements.get(id) || null,
      querySelectorAll: () => [], addEventListener() {} } };
  context.window = context;
  context.parent = station ? { postMessage: value => posts.push(value) } : context;
  vm.createContext(context);
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/src=|application\/ld\+json/.test(m[1])) continue;
    let source = m[2];
    if (source.includes("function buildLevel")) {
      const at = source.lastIndexOf("})();");
      source = source.slice(0, at) + `window.__test={startGame,respawn,retryCheckpoint,setPaused,loop,freshP,
        get players(){return PL},get input(){return inp},get rails(){return railState},get gates(){return GATES},get switches(){return SWITCHES},get checks(){return CHECKS},
        get platforms(){return PLAT},get goal(){return {x:goalX,y:goalY}},get level(){return curLvl},get running(){return running},get won(){return won},get deaths(){return deaths},get coins(){return coins},get elapsed(){return elapsed},get charge(){return portalCharge},
        levelStart(idx,coop){curLvl=idx;startGame(coop);}};\n` + source.slice(at);
    }
    new vm.Script(source, { filename: "neon-jump.inline.js" }).runInContext(context);
  }
  const h = context.__test;
  return { h, posts, storage, elements, events,
    tick(dt = 1 / 60) { now += dt * 1000; h.loop(now); },
    frames(n, dt) { for (let i = 0; i < n; i++) this.tick(dt); } };
}
function put(p, x, y) {
  Object.assign(p, { x, y, vx: 0, vy: 0, onGround: false, coyote: 0, jbuf: 0, jumps: 0 }); Rails.resetPlayer(p);
}
function completeRail(g, id, pi = 0, dt = 1 / 60) {
  const h = g.h, p = h.players[pi], q = Rails.point(h.rails.rails[id], 0.03);
  put(p, q.x, q.y + 0.78); p.vx = 13;
  g.tick(dt); assert.equal(p.railId, id, `Schiene ${id + 1} eingefangen`);
  for (let i = 0; i < 300 && p.railId >= 0; i++) g.tick(dt);
  assert.equal(h.rails.count, id + 1);
}

test("Stationsstart bleibt solo auf Strecke 1, Speicherstand bleibt unberührt", () => {
  const g = game({ station: true, savedLevel: "2" });
  assert.equal(g.h.level, 0); assert.equal(g.h.players.length, 1); assert.equal(g.h.running, true);
  assert.equal(g.storage.get("nj_lvl"), "2");
  assert.equal(g.h.rails.count, 0); assert.equal(g.posts.length, 0);
  g.elements.get("stationBack").onclick(); assert.deepEqual(g.posts, ["mini-back"]);
});

for (let level = 0; level < 3; level++) {
  test(`Strecke ${level + 1}: reale Spielschleife fährt alle Schienen und landet sicher`, () => {
    const g = game(); g.h.levelStart(level, false);
    for (let id = 0; id < 3; id++) {
      const before = g.h.deaths;
      completeRail(g, id);
      // Ohne neue Sprungeingabe auch bei gehaltenem Rechts sauber aufsetzen.
      g.h.input[0].R = true; g.frames(10); g.h.input[0].R = false;
      assert.equal(g.h.deaths, before);
      assert.equal(g.h.players[0].onGround, true, `Landung Schiene ${id + 1}`);
      assert.ok(g.h.players[0].ckX >= g.h.rails.rails[id].to[0]);
    }
    assert.equal(Rails.ready(g.h.rails), true);
    put(g.h.players[0], g.h.goal.x, g.h.goal.y);
    g.frames(80);
    assert.equal(g.h.won, true); assert.equal(g.h.running, false);
    assert.match(g.elements.get("verdict").innerHTML, /3\/3 Impulse/);
  });
}

test("Verpasstes Pflichtstück: Ziel geschlossen, spätere Checkpoints gesperrt, Retry möglich", () => {
  const g = game(); g.h.startGame(false);
  put(g.h.players[0], 49, 4); g.tick();
  assert.equal(g.h.checks[0].hit, false);
  assert.equal(g.h.players[0].ckX, 4);
  put(g.h.players[0], g.h.goal.x, g.h.goal.y); g.frames(90);
  assert.equal(g.h.won, false); assert.equal(g.h.charge, 0);
  g.h.retryCheckpoint(); assert.equal(g.h.players[0].x, 4); assert.equal(g.h.deaths, 0);
});

test("Sturz/Retry lösen die Schiene, behalten Impulse und setzen Sprünge zurück", () => {
  const g = game(); g.h.startGame(false); completeRail(g, 0);
  const p = g.h.players[0], checkpoint = p.ckX;
  Object.assign(p, { railId: 1, railT: 0.2, jumps: 2, onGround: true, coyote: 0.1, jbuf: 0.1 });
  g.h.respawn(0);
  assert.equal(p.x, checkpoint); assert.equal(p.railId, -1); assert.equal(p.jumps, 0);
  assert.equal(p.coyote, 0); assert.equal(p.jbuf, 0); assert.equal(p.onGround, false);
  assert.equal(g.h.rails.count, 1); assert.equal(g.h.deaths, 1);
  g.h.retryCheckpoint(); assert.equal(g.h.deaths, 1); assert.equal(g.h.rails.count, 1);
});

test("Pause friert Fahrt und Fortschritt ein; Abspringen und Doppelsprung funktionieren", () => {
  const g = game(); g.h.startGame(false);
  const p = g.h.players[0], q = Rails.point(g.h.rails.rails[0], 0.1);
  put(p, q.x, q.y + 0.78); p.vx = 13; g.tick(); assert.equal(p.railId, 0);
  g.h.setPaused(true); const t = p.railT, elapsed = g.h.elapsed; g.frames(40);
  assert.equal(p.railT, t); assert.equal(g.h.elapsed, elapsed);
  g.h.setPaused(false); g.h.input[0].J = true; g.tick();
  assert.equal(p.railId, -1); assert.equal(p.jumps, 1); assert.ok(p.vy > 15);
  g.h.input[0].J = true; g.tick(); assert.equal(p.jumps, 2); assert.equal(g.h.rails.count, 0);
});

test("Bestehende Schalter: Solo hält offen, Koop schliesst nach Loslassen", () => {
  for (const coop of [false, true]) {
    const g = game(); g.h.startGame(coop);
    const sw = g.h.switches[0]; put(g.h.players[0], sw.x, sw.y + 0.5); g.tick();
    assert.equal(g.h.gates[0].open, true);
    put(g.h.players[0], 4, 2); g.frames(30);
    assert.equal(g.h.gates[0].open, !coop);
  }
});

test("Koop teilt Impulse/Checkpoints und verlangt beide am Portal", () => {
  const g = game(); g.h.startGame(true);
  for (let id = 0; id < 3; id++) completeRail(g, id, id % 2);
  assert.equal(g.h.players[0].ckX, g.h.players[1].ckX);
  put(g.h.players[0], g.h.goal.x, g.h.goal.y);
  put(g.h.players[1], g.h.goal.x - 7, g.h.goal.y + 3); g.frames(55);
  assert.equal(g.h.won, false); assert.equal(g.h.charge, 0);
  assert.equal(g.elements.get("waitP").classList.contains("hide"), false);
  put(g.h.players[1], g.h.goal.x, g.h.goal.y); g.frames(70);
  assert.equal(g.h.won, true);
});

test("Stationsfinale meldet genau einmal unverändertes stationDone und erlaubt nächste Strecke", () => {
  const g = game({ station: true, savedLevel: "2" });
  for (let id = 0; id < 3; id++) completeRail(g, id);
  put(g.h.players[0], g.h.goal.x, g.h.goal.y); g.frames(100);
  assert.equal(g.posts.length, 1);
  assert.deepEqual(JSON.parse(g.posts[0]), { t: "stationDone", score: g.h.coins * 5 + 25 });
  g.elements.get("againBtn").onclick();
  assert.equal(g.h.level, 1); assert.equal(g.h.rails.count, 0); assert.equal(g.h.running, true);
  assert.equal(g.storage.get("nj_lvl"), "2");
});

test("Mobil erzwingt Solo und Touch-Sprung kann aus der Schiene lösen", () => {
  const g = game({ mobile: true }); g.h.startGame(true);
  assert.equal(g.h.players.length, 1); assert.equal(g.elements.get("touch").style.display, "block");
  const p = g.h.players[0], q = Rails.point(g.h.rails.rails[0], 0.05);
  put(p, q.x, q.y + 0.78); p.vx = 13; g.tick(); assert.equal(p.railId, 0);
  g.elements.get("tzJ").events.touchstart({ preventDefault() {} }); g.tick();
  assert.equal(p.railId, -1); assert.equal(p.jumps, 1);
});

test("Alle neun Einstiege sind von echten Plattformen mit Bewegung/Sprung erreichbar", () => {
  const starts = [
    [[7, 0.7], [33, 2.2], [82, 3.7]],
    [[15, 2.7], [32, 5.7], [80, 2.7]],
    [[15, 2.2], [37, 7.2], [70, 8.2]]
  ];
  for (const dt of [1 / 60, 0.033]) {
    const g = game();
    for (let level = 0; level < 3; level++) {
      for (let id = 0; id < 3; id++) {
        g.h.levelStart(level, false);
        // Vorige Impulse simulieren, den aktuellen Einstieg wirklich erspringen.
        g.h.rails.count = id;
        for (let prev = 0; prev < id; prev++) g.h.rails.secured[prev] = true;
        const p = g.h.players[0]; put(p, ...starts[level][id]); p.onGround = true;
        g.h.input[0].R = true; g.h.input[0].J = true;
        let double = false;
        for (let frame = 0; frame < 150 && p.railId !== id; frame++) {
          if (!double && p.jumps === 1 && p.vy < 0) { g.h.input[0].J = true; double = true; }
          g.tick(dt);
        }
        assert.equal(p.railId, id, `Strecke ${level + 1}, Schiene ${id + 1}, dt=${dt}`);
        assert.equal(g.h.deaths, 0);
      }
    }
  }
});
