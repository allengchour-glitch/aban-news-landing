/* Prüfungszustand ohne Grafik: dieselben Zeitpunkte ergeben dieselben Gefahren. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DungeonTrials = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var TAU = Math.PI * 2;
  var definitions = [
    { name: 'Stein · Ringsprünge', rule: 'Orange Ringe überspringen. Danach die violette Faust treffen.', warn: 2.4, attack: 4.2, open: 5.5, rest: 1.2 },
    { name: 'Eis · Frostdeckung', rule: 'Zum markierten Runenstein laufen und DAHINTER in die helle Deckung. Springen schützt nicht.', warn: 4.2, attack: 2.8, open: 5.5, rest: 1.2 },
    { name: 'Lava · Wandersektor', rule: 'Im hellen SICHER-Sektor bleiben und seiner Drehung folgen. Springen schützt nicht.', warn: 3.8, attack: 6, open: 5.5, rest: 1.2 }
  ];
  var weapons = [{ reach: 4.2, dmg: 1 }, { reach: 3, dmg: 1 }, { reach: 4.6, dmg: 2 }, { reach: 5.6, dmg: 1 }];
  function angleDelta(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  function sample(level, time, active) {
    var def = definitions[level], duration = def.warn + def.attack + def.open + def.rest;
    var elapsed = Math.max(0, time - 2), cycle = Math.floor(elapsed / duration), local = elapsed % duration;
    var phase = !active ? 'waiting' : time < 2 ? 'rise' : local < def.warn ? 'warn' : local < def.warn + def.attack ? 'attack' : local < def.warn + def.attack + def.open ? 'open' : 'rest';
    var attackTime = Math.max(0, local - def.warn);
    var direction = Math.PI / 2 + cycle * (level === 1 ? Math.PI / 2 : Math.PI / 3);
    if (level === 2 && phase === 'attack') direction += attackTime * 0.22;
    if (level === 2 && (phase === 'open' || phase === 'rest')) direction += def.attack * 0.22;
    var remaining = phase === 'rise' ? 2 - time : phase === 'warn' ? def.warn - local : phase === 'attack' ? def.warn + def.attack - local : phase === 'open' ? def.warn + def.attack + def.open - local : duration - local;
    return { level: level, phase: phase, cycle: cycle, remaining: Math.max(0, remaining), attackTime: attackTime, direction: direction, arm: cycle % 2, radii: level === 0 && phase === 'attack' ? [1 + attackTime * 5.5, attackTime >= 1.4 ? 1 + (attackTime - 1.4) * 5.5 : -1] : [] };
  }
  /* Koordinaten relativ zur Kammermitte; Ringzentrum ist der Koloss bei z=-4. */
  function safe(s, x, y, z) {
    if (s.phase !== 'attack') return true;
    if (s.level === 0) return y >= 0.65 || s.radii.every(function (r) { return r < 0 || Math.abs(Math.hypot(x, z + 4) - r) > 0.65; });
    var along = x * Math.cos(s.direction) + z * Math.sin(s.direction);
    var across = -x * Math.sin(s.direction) + z * Math.cos(s.direction);
    if (s.level === 1) return along >= 6.1 && Math.abs(across) <= 2.5;
    return Math.hypot(x, z) >= 3 && Math.abs(angleDelta(Math.atan2(z, x), s.direction)) <= Math.PI / 3;
  }
  function target(s) { return { x: s.arm ? 2.35 : -2.35, z: -4 + Math.sin(1.35) * 3.1 }; }
  function create(level, run) { return { v: 1, level: level, run: run, seq: 0, time: 0, active: false, hp: 6, max: 6, hits: [-1, -1], lastSlot: -1, lastHit: -100 }; }
  function enter(state) { state.active = true; }
  function tick(state, dt) { if (state.active && state.hp > 0 && Number.isFinite(dt) && dt > 0) state.time += dt; }
  function hit(state, request) {
    var s = sample(state.level, state.time, state.active), slot = request.slot, weapon = weapons[request.weapon];
    if (!weapon || (slot !== 0 && slot !== 1) || request.run !== state.run || !state.active || state.hp <= 0 || s.phase !== 'open' || request.cycle !== s.cycle || state.hits[slot] === s.cycle) return 0;
    var p = target(s);
    if (![request.x, request.y, request.z].every(Number.isFinite) || Math.abs(request.y) > 3 || Math.hypot(request.x - p.x, request.z - p.z) >= weapon.reach) return 0;
    var damage = weapon.dmg + (state.lastSlot >= 0 && state.lastSlot !== slot && state.time - state.lastHit < 3 ? 1 : 0);
    state.hits[slot] = s.cycle; state.lastSlot = slot; state.lastHit = state.time;
    state.hp = Math.max(0, state.hp - damage);
    return damage;
  }
  function heal(state) { if (state.hp > 0) state.hp = Math.min(state.max, state.hp + 1); }
  function snapshot(state) { return { v: 1, level: state.level, run: state.run, seq: ++state.seq, time: state.time, active: state.active, hp: state.hp, max: state.max, hits: state.hits.slice() }; }
  function valid(p) { return p && p.v === 1 && Number.isInteger(p.level) && p.level >= 0 && p.level <= 2 && typeof p.run === 'string' && Number.isInteger(p.seq) && p.seq > 0 && Number.isFinite(p.time) && p.time >= 0 && typeof p.active === 'boolean' && p.max === 6 && Number.isInteger(p.hp) && p.hp >= 0 && p.hp <= p.max && Array.isArray(p.hits) && p.hits.length === 2 && p.hits.every(Number.isInteger); }
  function receive(state, p) {
    if (!valid(p) || p.run !== state.run || p.level !== state.level || p.seq <= state.seq || p.time < state.time) return false;
    state.seq = p.seq; state.time = p.time; state.active = p.active; state.hp = p.hp; state.max = p.max; state.hits = p.hits.slice(); return true;
  }
  function recordKey(level, master, online) { return 'nd-trial-v1-' + level + '-' + (master ? 'meister' : 'normal') + '-' + (online ? 'koop' : 'solo'); }
  function record(storage, level, master, online, seconds, score, win) {
    var key = recordKey(level, master, online), previous = null, best = false;
    try { previous = JSON.parse(storage.getItem(key)); } catch (_) {}
    if (!previous || !Number.isFinite(previous.time) || previous.time <= 0 || !Number.isFinite(previous.score)) previous = null;
    if (win && Number.isFinite(seconds) && seconds > 0) {
      best = !previous || seconds < previous.time;
      var next = { time: best ? seconds : previous.time, score: Math.max(score, previous ? previous.score : 0) };
      try { storage.setItem(key, JSON.stringify(next)); } catch (_) {}
      return { best: best, value: next };
    }
    return { best: false, value: previous };
  }
  return { definitions: definitions, create: create, enter: enter, tick: tick, sample: sample, safe: safe, target: target, hit: hit, heal: heal, snapshot: snapshot, receive: receive, valid: valid, recordKey: recordKey, record: record };
});
