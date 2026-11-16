#!/usr/bin/env node
// Lokale Laufzeitprobe: Originalfunktionen + kleine DOM-/MP-Doubles, kein Browser/Internet-Koop.
// node spiele-dev/wildnis/bedienung-qa.cjs [Evidenzverzeichnis]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const htmlPath =
  process.env.LP_HTML || path.join(__dirname, "../../neon-wildnis.html");
const source = fs.readFileSync(htmlPath, "utf8");
const out =
  process.argv[2] || "/workspace/aban-spiele-analyse/wildnis/bedienung";
function part(start, end) {
  const a = source.indexOf(start),
    b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error("QA-Ausführungsgrenze fehlt");
  return source.slice(a, b);
}
function env() {
  const elements = new Map(),
    listeners = new Map(),
    timers = new Map();
  let nextTimer = 0;
  const noop = () => {};
  function el(id) {
    if (!elements.has(id))
      elements.set(id, {
        id,
        style: {},
        textContent: "",
        value: "",
        tagName: "DIV",
        classList: { add: noop, remove: noop },
        appendChild: noop,
        addEventListener(type, fn) {
          this[type] = fn;
        },
        click() {
          if (this.onclick)
            this.onclick({ target: this, stopPropagation: noop });
          else if (this.clickHandler) this.clickHandler();
        },
      });
    return elements.get(id);
  }
  const c = {
    console,
    Promise,
    Math,
    innerWidth: 1000,
    devicePixelRatio: 1,
    location: {
      search: "",
      origin: "http://127.0.0.1:8170",
      pathname: "/neon-wildnis.html",
    },
    document: {
      getElementById: el,
      createElement: () => el("new-" + elements.size),
      body: { appendChild: noop },
      addEventListener: noop,
    },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    setTimeout(fn) {
      const id = ++nextTimer;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    setInterval: () => 1,
    clearInterval: noop,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: noop,
    running: false,
    paused: false,
    dead: false,
    buildMode: false,
    perkChoosing: false,
    stationOpen: false,
    ghost: null,
    craftMode: false,
    tradeOpen: false,
    performance: { now: () => 10000 },
    navigator: {},
    getChar: () => ({ id: "held" }),
  };
  c.window = c;
  vm.createContext(c);
  return { c, el, listeners, timers, run: (code) => vm.runInContext(code, c) };
}
async function main() {
  const findings = [],
    controls = [],
    regressions = [];
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  function check(name, condition, observed) {
    regressions.push({ name, ok: !!condition, observed });
  }
  function lobbyEnv() {
    const e = env(),
      sessions = [],
      scans = [];
    function session(role, code) {
      const handlers = [],
        messages = [];
      let resolve, reject;
      const s = {
        role,
        code,
        status: "waiting",
        sent: [],
        closeCalls: 0,
        ready: new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        }),
        resolve() {
          resolve(s);
        },
        reject() {
          reject(new Error("Kein Mitspieler gefunden"));
        },
        onMessage(fn) {
          messages.push(fn);
        },
        onStatus(fn) {
          handlers.push(fn);
        },
        emit(st) {
          this.status = st;
          handlers.forEach((f) => f(st));
        },
        message(d) {
          messages.forEach((f) => f(d));
        },
        send(d) {
          this.sent.push(d);
        },
        close() {
          this.closeCalls++;
          this.emit("closed");
          if (role === "quick") this.reject();
        },
      };
      sessions.push(s);
      return s;
    }
    e.c.MP = {
      PUBLIC: ["PUBA", "PUBB"],
      suche(game, options) {
        options.abortCalls = 0;
        scans.push(options);
        return {
          abbrechen() {
            options.abortCalls++;
            options.fertig([]);
          },
        };
      },
      host: () => session("host", "ABCD"),
      join: (game, code) => session("join", code),
      quick: (game, code) => session("quick", code),
    };
    e.run(part("var NET={", "function startGame(fresh)"));
    e.c.spawnRemote = () => {};
    e.c.startGame = () => {
      e.c.running = true;
    };
    return { ...e, sessions, scans };
  }
  {
    const e = lobbyEnv();
    e.el("coopHost").click();
    assert.equal(e.c.NET.s.code, "ABCD");
    assert.equal(e.c.NET.role, "host");
    assert.match(e.el("coopStatus").textContent, /ABCD/);
    controls.push(
      "Privaten Raum allein öffnen: ABCD bleibt aktive Host-Session.",
    );
  }
  {
    const e = lobbyEnv();
    e.el("coopQuick").click();
    assert.equal(e.scans.length, 1);
    e.el("coopHost").click();
    const host = e.c.NET.s;
    assert.equal(host.code, "ABCD");
    const before = {
      role: e.c.NET.role,
      code: host.code,
      text: e.el("coopStatus").textContent,
    };
    // Genau die verspätete fertig-Meldung des MP.suche-Vertrags aus js/mp.js.
    e.scans[0].fertig([]);
    const after = {
      role: e.c.NET.role,
      code: e.c.NET.s.code,
      text: e.el("coopStatus").textContent,
      privateRoomCloseCalls: host.closeCalls,
      privateRoomStatus: host.status,
      liveSessions: e.sessions.filter((s) => s.status !== "closed").length,
    };
    if (e.c.NET.s !== host)
      findings.push({
        id: "NW-B1",
        source: "neon-wildnis.html:5050-5071; 5091",
        input: [
          "Schnell-Koop klicken",
          "Vor Suchende Raum öffnen klicken",
          "Alte Suche liefert fertig([])",
        ],
        expected:
          "Der zuletzt gewählte private Raum ABCD bleibt aktiv; alte Suche hat keine Wirkung.",
        before,
        after,
        fix: "Suchgeneration vor jedem neuen Lobby-Versuch erhöhen; fund/fertig vor netQuickGo auf aktuelle Generation prüfen. Suchhandle aufbewahren; vor abbrechen zuerst Generation entwerten, weil abbrechen selbst fertig aufruft.",
      });
  }
  {
    const e = lobbyEnv();
    e.el("coopQuick").click();
    e.el("coopHost").click();
    const host = e.c.NET.s,
      scan = e.scans[0];
    scan.fund({ code: "PUBB", voll: false });
    scan.fertig([]);
    await flush();
    check(
      "Schnell → privat: Suche einmal abbrechen; fund/fertig bleiben wirkungslos",
      scan.abortCalls === 1 && e.c.NET.s === host && e.sessions.length === 1,
      {
        aborts: scan.abortCalls,
        sessions: e.sessions.length,
        code: e.c.NET.s.code,
      },
    );
  }
  {
    const e = lobbyEnv();
    e.el("coopHost").click();
    const old = e.c.NET.s;
    old.resolve(); // ready erfüllt, then aber noch nicht ausgeführt: realer Mikrotask-Wettlauf.
    e.el("coopQuick").click();
    await flush();
    check(
      "Privat → schnell: alte ready-Mikrotask startet keine Welt; Share-Timer entfernt",
      old.closeCalls === 1 &&
        !e.c.NET.on &&
        !e.c.running &&
        e.timers.size === 0,
      {
        closed: old.closeCalls,
        on: e.c.NET.on,
        running: e.c.running,
        timers: e.timers.size,
      },
    );
  }
  {
    const e = lobbyEnv();
    e.el("coopQuick").click();
    e.scans[0].fertig([]);
    const old = e.c.NET.s;
    e.el("coopHost").click();
    const host = e.c.NET.s;
    await flush();
    check(
      "Aktives Quick → privat: close-Rejection überschreibt privaten Status nicht",
      old.closeCalls === 1 &&
        e.c.NET.s === host &&
        /Raum-Code: ABCD/.test(e.el("coopStatus").textContent),
      {
        closed: old.closeCalls,
        code: e.c.NET.s.code,
        text: e.el("coopStatus").textContent,
      },
    );
  }
  {
    const e = lobbyEnv();
    e.el("coopQuick").click();
    e.el("coopQuick").click();
    e.scans[0].fund({ code: "PUBA", voll: false });
    e.scans[0].fertig([]);
    e.scans[1].fund({ code: "PUBB", voll: false });
    await flush();
    check(
      "Erneute Suche: nur aktuelle Suche öffnet Session; Suchhandles freigegeben",
      e.sessions.length === 1 &&
        e.c.NET.s.code === "PUBB" &&
        e.scans.every((s) => s.abortCalls === 1),
      {
        sessions: e.sessions.length,
        code: e.c.NET.s.code,
        aborts: e.scans.map((s) => s.abortCalls),
      },
    );
  }
  {
    const e = lobbyEnv();
    e.el("coopQuick").click();
    e.scans[0].fertig([]);
    const old = e.c.NET.s;
    old.reject();
    await flush();
    check(
      "Quick-Fehler: nächster Raum wird versucht und alter Versuch geschlossen",
      e.sessions.length === 2 &&
        e.c.NET.s.code === "PUBB" &&
        old.closeCalls === 1,
      {
        sessions: e.sessions.length,
        code: e.c.NET.s.code,
        closed: old.closeCalls,
      },
    );
  }
  {
    const e = lobbyEnv(),
      search = e.c.MP.suche;
    e.c.MP.suche = (game, options) => {
      const handle = search(game, options);
      options.fertig([]);
      return handle;
    };
    e.el("coopQuick").click();
    await flush();
    check(
      "Synchrones Suchende: genau eine Session, zurückgegebenes Handle freigegeben",
      e.sessions.length === 1 && e.scans[0].abortCalls === 1,
      { sessions: e.sessions.length, aborts: e.scans[0].abortCalls },
    );
  }
  for (const mode of ["privat", "quick"]) {
    const e = lobbyEnv();
    if (mode === "privat") e.el("coopHost").click();
    else {
      e.el("coopQuick").click();
      e.scans[0].fertig([]);
    }
    const current = e.c.NET.s;
    current.role = "host";
    current.emit("connected");
    current.resolve();
    await flush();
    check(
      "Aktive " +
        mode +
        "-Verbindung startet weiterhin die Welt und sendet start",
      e.c.NET.on && e.c.running && current.sent.some((d) => d.t === "start"),
      {
        on: e.c.NET.on,
        running: e.c.running,
        startSent: current.sent.some((d) => d.t === "start"),
      },
    );
  }
  function dodgeEnv() {
    const e = env(),
      noop = () => {};
    Object.assign(e.c, {
      running: true,
      mapOpen: false,
      _mapRaf: 0,
      dodgeT: 0,
      dodgeCd: 0,
      dodgeVX: 0,
      dodgeVZ: 0,
      stickV: { x: 0, y: 0 },
      camYaw: 0,
      MAP: 400,
      player: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } },
      drawWorldMap: noop,
      sfx: noop,
      heroAct: noop,
      burst: noop,
      canWalk: () => true,
      NET: { on: false },
      lastT: 10000,
      IS_MOB: false,
      renderScene: noop,
      stickEnd: noop,
      harvest: noop,
      useSkill: noop,
      doThrow: noop,
      openBuild: noop,
      closeBuild: noop,
      eat: noop,
      useBolt: noop,
      confirmBuild: noop,
      togglePause: noop,
    });
    e.run(part("function doDodge(){", "var _lowT="));
    e.run(part("function camRel(mx,my){", "/* 📷 Welle 5:"));
    e.run(part("var keys={},stopHeldAttack=null;", "// Joystick"));
    e.run(part("function openWorldMap(){", "function frame(now)"));
    e.run(part("function frame(now){", "function updPrompt(){"));
    const key = (type, name = "Shift") =>
      e.listeners.get(type)({
        key: name,
        target: e.el("body"),
        preventDefault: noop,
      });
    return { ...e, key };
  }
  {
    const e = dodgeEnv();
    e.key("keydown");
    e.key("keyup");
    e.c.updDodge(0.05);
    assert.equal(e.c.player.position.z, 0.8500000000000001);
    controls.push(
      "Shift ohne Karte rollt im ersten 50-ms-Schritt 0.85 Welteinheiten.",
    );
  }
  {
    const e = dodgeEnv();
    e.el("minimap").click();
    assert.equal(e.c.mapOpen, true);
    assert.equal(e.el("wmOv").style.display, "flex");
    e.key("keydown");
    e.key("keyup");
    e.c.frame(10050); // Original-Frame kehrt bei offener Karte vor updDodge zurück.
    const whileMap = {
      mapOpen: e.c.mapOpen,
      dodgeT: e.c.dodgeT,
      dodgeCd: e.c.dodgeCd,
      z: e.c.player.position.z,
      shiftReleased: e.c.keys.shift === 0,
    };
    e.c.closeWorldMap();
    e.c.updDodge(0.05);
    const after = {
      mapOpen: e.c.mapOpen,
      dodgeT: e.c.dodgeT,
      z: e.c.player.position.z,
    };
    if (whileMap.dodgeT > 0 && after.z !== 0)
      findings.push({
        id: "NW-B2",
        source: "neon-wildnis.html:3586-3606; 4252-4266; 4749-4770; 4794",
        input: [
          "Während Spiel Weltkarte öffnen",
          "Shift drücken und loslassen",
          "Karte schliessen; nächster Simulationsschritt",
        ],
        expected:
          "Tastendruck in der pausierten Vollbildkarte aktiviert keine Spielaktion nach dem Schliessen.",
        whileMap,
        after,
        fix: "In keydown bei mapOpen Spielaktionen sperren (Escape kann closeWorldMap ausführen); zusätzlich doDodge gegen paused/mapOpen/perkChoosing/stationOpen absichern.",
      });
  }
  {
    const e = dodgeEnv();
    let actions = 0;
    for (const name of [
      "harvest",
      "useSkill",
      "doThrow",
      "openBuild",
      "eat",
      "useBolt",
      "confirmBuild",
    ])
      e.c[name] = () => actions++;
    e.el("minimap").click();
    for (const key of ["e", "q", "f", " ", "b", "r", "c", "Enter"]) {
      e.key("keydown", key);
      e.key("keyup", key);
    }
    e.key("keydown", "Escape");
    check(
      "Karte sperrt Spieltasten; Escape schliesst Karte",
      actions === 0 && !e.c.mapOpen,
      { actions, mapOpen: e.c.mapOpen },
    );
  }
  for (const overlay of ["paused", "mapOpen", "perkChoosing", "stationOpen"]) {
    const e = dodgeEnv();
    e.c[overlay] = true;
    e.c.doDodge();
    check(
      "Direkter Dodge-Aufruf gesperrt: " + overlay,
      e.c.dodgeT === 0 && e.c.dodgeCd === 0,
      { dodgeT: e.c.dodgeT, dodgeCd: e.c.dodgeCd },
    );
  }
  const report = {
    kind: "Lokale Node-VM-Laufzeitprobe mit Originalfunktionen und DOM/MP-Doubles; kein Browsernachweis und kein Internet-Koop",
    htmlPath,
    regressions,
    sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
    controls,
    findings,
  };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "runtime.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = findings.length || regressions.some((r) => !r.ok) ? 1 : 0;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
