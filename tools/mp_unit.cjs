// tools/mp_unit.cjs — Mock-Peer-Harness für js/mp.js (peerEngine ist ohne wss nicht
// end-to-end testbar → skriptbare Event-Sequenzen gegen einen Peer-Stub).
// Nutzung: node tools/mp_unit.cjs   → PASS/FAIL je Testfall, Exit-Code != 0 bei FAIL.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

function freshMP() {
  // Frische mp.js-Instanz je Testfall (eigener window/Peer-Stub-Kontext)
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "mp.js"), "utf8");
  const created = []; // alle erzeugten Peer-Stubs
  function StubConn(peerId, label) {
    const c = {
      peer: peerId || "REMOTE", label: label || "main", open: false, closeCalled: false,
      _h: {}, on(ev, fn) { (c._h[ev] = c._h[ev] || []).push(fn); },
      emit(ev, arg) { (c._h[ev] || []).slice().forEach(fn => { try { fn(arg); } catch (e) {} }); },
      // Bequemlichkeit: open-Event setzt auch das open-Flag (wie PeerJS)
      open_() { c.open = true; c.emit("open"); },
      close() { c.closeCalled = true; },
      send() {}
    };
    return c;
  }
  function StubPeer(id, cfg) {
    const p = {
      id: id, destroyed: false, _h: {}, conns: [],
      on(ev, fn) { (p._h[ev] = p._h[ev] || []).push(fn); },
      emit(ev, arg) { (p._h[ev] || []).slice().forEach(fn => { try { fn(arg); } catch (e) {} }); },
      connect(pid, opts) { const c = StubConn("SELF", (opts && opts.label) || "main"); c.target = pid; p.conns.push(c); return c; },
      destroy() { p.destroyed = true; },
      reconnect() {}
    };
    created.push(p);
    return p;
  }
  const sandbox = {
    window: {}, location: { search: "" },
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Promise, console, Error, String
  };
  sandbox.window.Peer = StubPeer;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  sandbox.MP = sandbox.window.MP; // Browser: window.MP ist global sichtbar — im vm-Kontext nachbilden (quick ruft bare `MP.join`)
  return { MP: sandbox.window.MP, created, StubConn };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail }); console.log((cond ? "PASS" : "FAIL"), name, detail || ""); }

(async () => {
  // ---- A1: Stale-close eines Zombie-Kanals darf die neue Verbindung nicht töten ----
  {
    const { MP, created, StubConn } = freshMP();
    const S = MP.host("t");
    const peer = created[0];
    peer.emit("open");                    // Host registriert → waiting
    const connA = StubConn("GUEST1"); peer.emit("connection", connA); connA.open_();  // verbunden
    check("A1.pre connected", S.status === "connected");
    connA.emit("close");                  // echter Abriss → lost, Host wartet (main=null)
    const connB = StubConn("GUEST1"); peer.emit("connection", connB); connB.open_();  // Reconnect
    check("A1.re connected", S.status === "connected");
    connA.emit("close");                  // STALE close des alten Kanals
    check("A1 stale close ignoriert (Status bleibt connected)", S.status === "connected", "ist: " + S.status);
  }

  /* ⚠️ WARUM ES DIESEN HELFER BRAUCHT (drei FAILs lang uebersehen).
     Der Peer-Stub schliesst neu erzeugte Kanaele NICHT von selbst. Wer genau
     EINEN Reconnect-Kanal toetet und danach 50 ms spaeter prueft, sieht immer
     "lost" — und das ist voellig korrektes Verhalten: die Sitzung wartet in dem
     Moment brav auf ihren naechsten Versuch. Geprueft werden sollte aber das
     Szenario "Host ist ENDGUELTIG weg", und das heisst: JEDER Versuch stirbt.
     Genau das macht dieser Helfer. Mit ihm erreichen A2 und B1 den erwarteten
     Endzustand in rund einer Sekunde — die Bibliothek war nie fehlerhaft, der
     Test hat nur zu frueh hingesehen. */
  async function bisAufgabe(S, peer, sekunden = 20) {
    const getoetet = new Set();
    for (let i = 0; i < sekunden * 2 && S.status !== "closed"; i++) {
      await sleep(500);
      const ms = peer.conns.filter(c => c.label === "main");
      const letzte = ms[ms.length - 1];
      if (letzte && !getoetet.has(letzte)) { getoetet.add(letzte); letzte.emit("close"); }
    }
    return S.status;
  }

  // ---- A2: Give-up-Pfade müssen den Peer zerstören (sonst vergifteter Public-Raum) ----
  {
    const { MP, created, StubConn } = freshMP();
    const S = MP.join("t", "ABCD");
    const peer = created[0];
    peer.emit("open");                    // Gast → peer.connect(main)
    const main1 = peer.conns[0]; main1.open_();  // verbunden (+fast = conns[1])
    const mainConns = () => peer.conns.filter(c => c.label === "main");
    main1.emit("close");                  // Abriss → lost, Reconnect in 800ms
    await sleep(1000);
    const main2 = mainConns()[1];
    check("A2.reconnect erzeugt", !!main2);
    if (main2) main2.emit("close");       // Reconnect-Kanal stirbt ungeöffnet
    await bisAufgabe(S, peer);            // ... und jeder weitere ebenso -> Budget erschöpft
    check("A2 Status closed", S.status === "closed", "ist: " + S.status);
    check("A2 peer.destroy() gerufen (kein Zombie im Raum)", peer.destroyed === true);
  }

  // ---- A3a: zweite main-Connection wird abgelehnt, solange die erste PENDING ist ----
  {
    const { MP, created, StubConn } = freshMP();
    const S = MP.host("t");
    const peer = created[0];
    peer.emit("open");
    const connA = StubConn("GUEST1"); peer.emit("connection", connA);   // pending (nie geöffnet)
    const connB = StubConn("GUEST2"); peer.emit("connection", connB);   // zweiter Gast
    check("A3a zweiter Gast bei pending main abgelehnt", connB.closeCalled === true);
  }

  // ---- A3b: fast-Kanal von fremder Peer-ID wird abgelehnt ----
  {
    const { MP, created, StubConn } = freshMP();
    const S = MP.host("t");
    const peer = created[0];
    peer.emit("open");
    const connA = StubConn("GUEST1"); peer.emit("connection", connA); connA.open_();
    const evil = StubConn("STRANGER", "fast"); peer.emit("connection", evil);
    check("A3b fremder fast-Kanal abgelehnt", evil.closeCalled === true);
  }

  // ---- A3c: pending Kanal stirbt → Raum wird wieder frei (nächster Gast kommt rein) ----
  {
    const { MP, created, StubConn } = freshMP();
    const S = MP.host("t");
    const peer = created[0];
    peer.emit("open");
    const connA = StubConn("GUEST1"); peer.emit("connection", connA);   // pending
    connA.emit("close");                                                // stirbt ungeöffnet
    const connB = StubConn("GUEST2"); peer.emit("connection", connB); connB.open_();
    check("A3c Raum nach pending-Tod wieder frei", S.status === "connected", "ist: " + S.status);
  }

  // ---- B1 (P1): quick darf nach echter Verbindung NICHT re-matchen ----
  {
    const { MP, created, StubConn } = freshMP();
    const q = MP.quick("t", "PUBA");
    const peer = created[0];              // Phase 0: join
    peer.emit("open");
    const main1 = peer.conns[0]; main1.open_();
    check("B1.pre quick connected", q.status === "connected");
    const before = created.length;
    main1.emit("close");                  // In-Game-Abriss → lost
    const mains = peer.conns.filter(c => c.label === "main");
    if (mains[1]) mains[1].emit("close"); else await sleep(1000);
    const m2 = peer.conns.filter(c => c.label === "main")[1];
    if (m2 && !m2.closeCalled && m2._h.close) m2.emit("close");
    await bisAufgabe(q, peer);            // jeder Reconnect stirbt -> Budget erschöpft
    check("B1 kein Re-Match nach everConnected (keine neuen Peers)", created.length === before,
      "Peers vorher " + before + " nachher " + created.length);
    check("B1 quick endet closed", q.status === "closed", "ist: " + q.status);
  }

  // ---- B2 (P1): outer.close() im Retry-Fenster stoppt die Kette ----
  {
    const { MP, created, StubConn } = freshMP();
    const q = MP.quick("t", "PUBA");
    const peer = created[0];
    peer.emit("open");
    // join scheitert sofort (peer-unavailable) → Retry-Timer läuft (250-750ms)
    peer.emit("error", { type: "peer-unavailable" });
    q.close();                            // User bricht ab, BEVOR der Timer feuert
    const before = created.length;
    await sleep(1200);
    check("B2 close() im Retry-Fenster: keine neuen Peers", created.length === before,
      "Peers vorher " + before + " nachher " + created.length);
  }

  const fails = results.filter(r => !r.ok).length;
  console.log("\n" + (fails ? "❌ " + fails + " FAIL" : "✅ alle " + results.length + " PASS"));
  process.exit(fails ? 1 : 0);
})();
