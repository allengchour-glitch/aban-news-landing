(function (global) {
  "use strict";
  var LENGTH = 2800,
    COUNT = 18, QUALIFY = 8;
  function gates() {
    return Array.from({ length: COUNT }, function (_, i) {
      return {
        id: i,
        d: 160 + i * 140,
        offset: [
          [0, 0, -3, -3, 3, 3],
          [-3, 3, 0, -3, 3, 0],
          [-3, 0, 3, 0, -3, 3],
        ][Math.floor(i / 6)][i % 6],
        polarity: [
          [1, 1, 0, 0, 1, 1],
          [1, 0, 1, 1, 0, 1],
          [0, 1, 0, 1, 0, 1],
        ][Math.floor(i / 6)][i % 6],
        resolved: false,
      };
    });
  }
  function create(mode) {
    return {
      mode: mode === "endless" ? "endless" : "race",
      gates: gates(),
      polarity: 0,
      cooldown: 0,
      time: 0,
      matched: 0,
      missed: 0,
      chain: 0,
      bestChain: 0,
      charge: 0,
      finished: false,
      won: false,
    };
  }
  function flip(s) {
    if (s.finished || s.cooldown > 0) return false;
    s.polarity = 1 - s.polarity;
    s.cooldown = 0.22;
    return true;
  }
  function boost(s) {
    if (s.finished || s.charge < 3) return false;
    s.charge -= 3;
    return true;
  }
  // Segmentüberquerung statt eines schmalen Zeitfensters: auch langsame Frames zählen einmal.
  function advance(s, dt, previous, current, offset) {
    if (s.finished) return [];
    s.time += Math.max(0, dt);
    s.cooldown = Math.max(0, s.cooldown - Math.max(0, dt));
    if (s.mode === "endless") return [];
    var out = [];
    s.gates.forEach(function (g) {
      if (g.resolved || g.d > current || g.d < previous) return;
      g.resolved = true;
      var close = Math.abs(offset - g.offset) <= 2.25,
        ok = close && s.polarity === g.polarity;
      if (ok) {
        s.matched++;
        s.chain++;
        s.bestChain = Math.max(s.bestChain, s.chain);
        s.charge = Math.min(3, s.charge + 1);
      } else {
        s.missed++;
        s.chain = 0;
      }
      out.push({
        id: g.id,
        kind: ok ? "match" : close ? "wrong" : "miss",
        polarity: g.polarity,
      });
    });
    return out;
  }
  function result(s, shield, coins, dist) {
    if (s.finished) return null;
    s.finished = true;
    s.won = s.mode === "race" && dist >= LENGTH && shield > 0 && s.matched >= QUALIFY;
    return {
      won: s.won,
      qualified: s.matched >= QUALIFY,
      mode: s.mode,
      time: Math.round(s.time * 100) / 100,
      matched: s.matched,
      total: COUNT,
      chain: s.bestChain,
      score: Math.max(
        0,
        Math.round(
          s.matched * 100 +
            s.bestChain * 25 +
            Math.max(0, shield) * 3 +
            Math.max(0, coins) * 10,
        ),
      ),
      medal: !s.won
        ? "Keine"
        : s.matched >= 16
          ? "Gold"
          : s.matched >= 12
            ? "Silber"
            : "Bronze",
    };
  }
  function profile(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    function n(k, max) {
      return Number.isFinite(raw[k])
        ? Math.max(0, Math.min(max, Math.floor(raw[k])))
        : 0;
    }
    return {
      runs: n("runs", 1000000),
      wins: Math.min(n("wins", 1000000), n("runs", 1000000)),
      bestScore: n("bestScore", 1000000),
      bestTime:
        Number.isFinite(raw.bestTime) && raw.bestTime > 0
          ? Math.min(100000, raw.bestTime)
          : 0,
      gateRecord: n("gateRecord", COUNT),
    };
  }
  function record(p, r) {
    p = profile(p);
    if (!r || r.mode !== "race") return p;
    p.runs++;
    if (r.won) {
      p.wins++;
      p.bestScore = Math.max(p.bestScore, r.score);
      p.bestTime = p.bestTime ? Math.min(p.bestTime, r.time) : r.time;
      p.gateRecord = Math.max(p.gateRecord, r.matched);
    }
    return profile(p);
  }
  global.PrismaRace = {
    length: LENGTH,
    count: COUNT,
    qualify: QUALIFY,
    create: create,
    flip: flip,
    boost: boost,
    advance: advance,
    result: result,
    profile: profile,
    record: record,
  };
})(typeof window !== "undefined" ? window : globalThis);
