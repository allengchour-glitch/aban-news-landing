// js/mp.js — aban Arcade Online-Koop (Masterplan Phase 3)
// ---------------------------------------------------------------------------
// Schlanke, wiederverwendbare Multiplayer-API: 4-Zeichen-Raum-Codes, 1 Host +
// 1 Gast, JSON-Nachrichten über WebRTC-DataChannels.
//
// Engine A (Default, Produktion): PeerJS (vendored: /js/vendor/peerjs.min.js)
//   + gratis PeerJS-Cloud-Signaling (0.peerjs.com). Nach dem Handshake läuft
//   ALLES P2P zwischen den Geräten (DSGVO-freundlich, kein eigener Server).
// Engine B (?mp=local in der URL): rohes RTCPeerConnection, Signaling über
//   BroadcastChannel — NUR für automatisierte Tests in EINER Browser-Instanz
//   (Sandbox ohne wss-Ausgang). Die DataChannel-Logik ist dieselbe/echt.
//
// API (beide Engines identisch):
//   var s = MP.host("duo");        // s.code SOFORT verfügbar (Anzeige!),
//                                  // s.ready = Promise, erfüllt bei Verbindung
//   var s = MP.join("duo","XKPT"); // 15s-Timeout mit klarer Fehlermeldung
//   s.send(obj)      — zuverlässig/geordnet (Events: Wellen, Revive, GameOver)
//   s.sendFast(obj)  — unzuverlässig (Positions-Spam); Fallback auf send()
//   s.onMessage(fn)  — eingehende Objekte (beide Kanäle)
//   s.onStatus(fn)   — "waiting" | "connected" | "lost" (Reconnect läuft,
//                       1 Versuch) | "closed" (endgültig)
//   s.close()        — sauberes Cleanup
(function () {
  "use strict";
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // A–Z ohne I/O (Verwechslungsgefahr)
  var JOIN_TIMEOUT = 15000;

  function makeCode() {
    var s = "";
    for (var i = 0; i < 4; i++) s += ALPHA[(Math.random() * ALPHA.length) | 0];
    return s;
  }
  function pid(gameId, code) { return "aban-" + gameId + "-" + code; }

  function mkSession(role, code) {
    var S = {
      role: role, code: code, status: "connecting",
      _msg: [], _st: [],
      onMessage: function (f) { S._msg.push(f); },
      onStatus: function (f) { S._st.push(f); },
      send: function () {}, sendFast: function () {}, close: function () {}
    };
    S._emit = function (d) {
      for (var i = 0; i < S._msg.length; i++) { try { S._msg[i](d); } catch (e) {} }
    };
    S._setStatus = function (st) {
      if (S.status === st || S.status === "closed") return;
      S.status = st;
      for (var i = 0; i < S._st.length; i++) { try { S._st[i](st); } catch (e) {} }
    };
    S.ready = new Promise(function (res, rej) { S._res = res; S._rej = rej; });
    return S;
  }

  // ===== Engine A: PeerJS + Cloud-Signaling ================================
  function peerEngine(S, gameId, isHost) {
    if (!window.Peer) { S._setStatus("closed"); S._rej(new Error("PeerJS nicht geladen (js/vendor/peerjs.min.js)")); return; }
    var peer = null, main = null, fast = null, ever = false, byUs = false, tmo = null, tries = 0, retried = false;
    var lastRecv = 0, wd = null;
    // Watchdog: DataChannel-close wird bei hartem Abbruch (Tab zu, Netz weg) oft
    // erst nach langem ICE-Timeout gemeldet → Stille >6s bei laufendem Traffic
    // (Spiele senden Snapshots/Pings im Sekundentakt) gilt als Abriss.
    function startWd() {
      lastRecv = Date.now();
      if (wd) clearInterval(wd);
      wd = setInterval(function () {
        if (S.status === "closed") { clearInterval(wd); return; }
        if (S.status === "connected" && Date.now() - lastRecv > 6000) { clearInterval(wd); wd = null; lost(); }
      }, 2000);
    }
    function fail(msg) {
      if (byUs) return;
      clearTimeout(tmo);
      S._setStatus("closed");
      try { if (peer) peer.destroy(); } catch (e) {}
      S._rej(new Error(msg));
    }
    function recv(d) { lastRecv = Date.now(); S._emit(d); }
    function wireFast(c) { c.on("data", recv); }
    function wireMain(c) {
      c.on("open", function () {
        ever = true; clearTimeout(tmo);
        S._setStatus("connected"); startWd();
        if (!isHost) { // 2. Kanal: unreliable für Positions-Spam
          try { fast = peer.connect(pid(gameId, S.code), { label: "fast", reliable: false }); wireFast(fast); } catch (e) {}
        }
        S._res(S);
      });
      c.on("data", recv);
      c.on("close", function () { if (!byUs && S.status !== "closed") lost(); });
      c.on("error", function () { if (!ever) fail("Verbindung fehlgeschlagen — Code prüfen und nochmal versuchen."); });
    }
    function lost() { // 1 Reconnect-Versuch bei kurzem Abriss
      S._setStatus("lost");
      if (retried) { S._setStatus("closed"); return; }
      retried = true;
      if (isHost) {
        main = null; // peer.on("connection") nimmt den Gast wieder an
        setTimeout(function () { if (S.status === "lost") S._setStatus("closed"); }, 10000);
      } else {
        setTimeout(function () {
          if (S.status !== "lost") return;
          try { main = peer.connect(pid(gameId, S.code), { reliable: true }); wireMain(main); } catch (e) { S._setStatus("closed"); return; }
          setTimeout(function () { if (S.status === "lost") S._setStatus("closed"); }, 8000);
        }, 800);
      }
    }
    function boot() {
      peer = new window.Peer(isHost ? pid(gameId, S.code) : undefined, { debug: 0 });
      S._peer = peer;
      clearTimeout(tmo);
      tmo = setTimeout(function () {
        if (S.status === "connected") return;
        fail(isHost ? "Vermittlungs-Server (0.peerjs.com) nicht erreichbar — Internet prüfen."
                    : "Raum " + S.code + " antwortet nicht — Code prüfen, dann nochmal.");
      }, JOIN_TIMEOUT);
      peer.on("open", function () {
        if (isHost) { clearTimeout(tmo); S._setStatus("waiting"); }
        else { main = peer.connect(pid(gameId, S.code), { reliable: true }); wireMain(main); }
      });
      peer.on("connection", function (conn) {
        if (!isHost) return;
        if (conn.label === "fast") { fast = conn; wireFast(conn); return; }
        if (main && main.open) { try { conn.close(); } catch (e) {} return; } // Raum voll (1v1)
        main = conn; wireMain(conn);
      });
      peer.on("disconnected", function () { if (!byUs) { try { peer.reconnect(); } catch (e) {} } });
      peer.on("error", function (err) {
        var t = err && err.type;
        if (isHost && t === "unavailable-id" && tries < 3) { // Code-Kollision → neuer Code
          tries++; try { peer.destroy(); } catch (e) {}
          S.code = makeCode(); boot(); return;
        }
        if (t === "peer-unavailable") fail("Raum " + S.code + " nicht gefunden — Code prüfen!");
        else if (!ever && (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed"))
          fail("Kein Kontakt zum Vermittlungs-Server — Internet prüfen.");
      });
    }
    S.send = function (o) { try { if (main && main.open) main.send(o); } catch (e) {} };
    S.sendFast = function (o) { try { if (fast && fast.open) fast.send(o); else if (main && main.open) main.send(o); } catch (e) {} };
    S.close = function () { byUs = true; clearTimeout(tmo); if (wd) clearInterval(wd); S._setStatus("closed"); try { if (peer) peer.destroy(); } catch (e) {} };
    boot();
  }

  // ===== Engine B: rohes WebRTC + BroadcastChannel-Signaling (nur Test) ====
  function localEngine(S, gameId, isHost) {
    var bc = new BroadcastChannel("aban-mp-" + gameId + "-" + S.code);
    var pc = new RTCPeerConnection({ iceServers: [] }); // Loopback braucht kein STUN
    var main = null, fast = null, me = isHost ? "h" : "j", pend = [], lastRecv = 0, wd = null;
    function gone() { if (S.status === "closed") return; S._setStatus("lost"); S._setStatus("closed"); }
    function startWd() {
      lastRecv = Date.now();
      if (wd) clearInterval(wd);
      wd = setInterval(function () {
        if (S.status === "closed") { clearInterval(wd); return; }
        if (S.status === "connected" && Date.now() - lastRecv > 6000) { clearInterval(wd); gone(); }
      }, 2000);
    }
    pc.onconnectionstatechange = function () {
      var st = pc.connectionState;
      if (st === "failed" || st === "closed" || st === "disconnected") gone();
    };
    function post(t, d) { bc.postMessage({ t: t, from: me, d: d }); }
    function addIce(d) {
      var c = JSON.parse(d);
      if (pc.remoteDescription) pc.addIceCandidate(c).catch(function () {});
      else pend.push(c);
    }
    function flushIce() { pend.forEach(function (c) { pc.addIceCandidate(c).catch(function () {}); }); pend = []; }
    pc.onicecandidate = function (e) { if (e.candidate) post("ice", JSON.stringify(e.candidate)); };
    function wired(c, isFast) {
      c.onmessage = function (ev) { lastRecv = Date.now(); try { S._emit(JSON.parse(ev.data)); } catch (e) {} };
      c.onopen = function () { if (!isFast) { S._setStatus("connected"); startWd(); S._res(S); } };
      c.onclose = function () { if (!isFast) gone(); };
    }
    if (isHost) {
      S._setStatus("waiting");
      pc.ondatachannel = function (e) {
        if (e.channel.label === "fast") { fast = e.channel; wired(fast, true); }
        else { main = e.channel; wired(main, false); }
      };
      bc.onmessage = function (ev) {
        var m = ev.data; if (!m || m.from === me) return;
        if (m.t === "offer") {
          pc.setRemoteDescription(JSON.parse(m.d))
            .then(function () { flushIce(); return pc.createAnswer(); })
            .then(function (a) { return pc.setLocalDescription(a); })
            .then(function () { post("answer", JSON.stringify(pc.localDescription)); });
        } else if (m.t === "ice") addIce(m.d);
      };
    } else {
      main = pc.createDataChannel("main"); wired(main, false);
      fast = pc.createDataChannel("fast", { ordered: false, maxRetransmits: 0 }); wired(fast, true);
      bc.onmessage = function (ev) {
        var m = ev.data; if (!m || m.from === me) return;
        if (m.t === "answer") pc.setRemoteDescription(JSON.parse(m.d)).then(flushIce);
        else if (m.t === "ice") addIce(m.d);
      };
      pc.createOffer().then(function (o) { return pc.setLocalDescription(o); })
        .then(function () { post("offer", JSON.stringify(pc.localDescription)); });
      setTimeout(function () {
        if (S.status !== "connected") { S._setStatus("closed"); S._rej(new Error("Raum " + S.code + " nicht gefunden (lokaler Test-Modus).")); }
      }, JOIN_TIMEOUT);
    }
    S.send = function (o) { try { if (main && main.readyState === "open") main.send(JSON.stringify(o)); } catch (e) {} };
    S.sendFast = function (o) { try { if (fast && fast.readyState === "open") fast.send(JSON.stringify(o)); else S.send(o); } catch (e) {} };
    S.close = function () { if (wd) clearInterval(wd); S._setStatus("closed"); try { pc.close(); } catch (e) {} try { bc.close(); } catch (e) {} };
  }

  var FORCE_LOCAL = /[?&]mp=local\b/.test(location.search);

  window.MP = {
    localMode: FORCE_LOCAL,
    makeCode: makeCode,
    host: function (gameId) {
      var S = mkSession("host", makeCode());
      if (FORCE_LOCAL) localEngine(S, gameId, true); else peerEngine(S, gameId, true);
      return S;
    },
    join: function (gameId, code) {
      code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "");
      var S = mkSession("join", code);
      if (code.length !== 4) {
        S._setStatus("closed");
        S.ready.catch(function () {}); // unhandled-rejection vermeiden, Caller catcht selbst
        S._rej(new Error("Der Code hat 4 Buchstaben — bitte prüfen."));
        return S;
      }
      if (FORCE_LOCAL) localEngine(S, gameId, false); else peerEngine(S, gameId, false);
      return S;
    }
  };
})();
