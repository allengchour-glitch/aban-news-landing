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
  /* 🌐 Broker-Ersatz: PeerJS-Cloud zeitweise down -> nach Server-Fehler naechsten Broker merken */
  var MP_BROKERS = [null, { host: "peerjs.92k.de", port: 443, secure: true }];
  /* 🌐 ICE: STUN fuers Standard-NAT + oeffentlicher Gratis-TURN-Relay, damit die
     Verbindung auch hinter striktem/symmetrischem NAT (Mobilfunk/CGNAT) haelt.
     Ohne TURN scheitert Online-Koop auf vielen Handys komplett. */
  var MP_ICE = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
  ];
  function mpPeerCfg() {
    var i = 0; try { i = (+(localStorage.getItem("aban_broker") || 0)) % MP_BROKERS.length; } catch (e) {}
    var b = MP_BROKERS[i], o = { debug: 0, config: { iceServers: MP_ICE, sdpSemantics: "unified-plan" } };
    if (b) { o.host = b.host; o.port = b.port; o.secure = b.secure; }
    return o;
  }
  function mpNextBroker() { try { var i = ((+(localStorage.getItem("aban_broker") || 0)) + 1) % MP_BROKERS.length; localStorage.setItem("aban_broker", String(i)); } catch (e) {} }

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
  // noRegen=true (feste Public-Room-IDs für Quick-Match): bei unavailable-id NICHT neuen
  // Code würfeln, sondern scheitern -> MP.quick wechselt dann auf Beitreten.
  function peerEngine(S, gameId, isHost, noRegen) {
    if (!window.Peer) { S._setStatus("closed"); S._rej(new Error("PeerJS nicht geladen (js/vendor/peerjs.min.js)")); return; }
    var peer = null, main = null, fast = null, ever = false, byUs = false, tmo = null, tries = 0, retried = false;
    var lastRecv = 0, wd = null, reconns = 0, MAX_RECONN = 5;
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
    /* A2 (Rest-Audit): endgültiges Aufgeben MUSS den Peer zerstören — sonst hält ein
       Zombie-Peer die feste Raum-ID (PUBA/OFEN/wildnis/tempel2) site-weit besetzt. */
    function giveUp() {
      clearTimeout(tmo);
      if (wd) { clearInterval(wd); wd = null; }
      S._setStatus("closed");
      try { if (peer) peer.destroy(); } catch (e) {}
    }
    function recv(d) { lastRecv = Date.now(); S._emit(d); }
    function wireFast(c) { c.on("data", function (d) { if (c !== fast) return; recv(d); }); } /* A1: Zombie-Kanal füttert lastRecv nicht */
    function wireMain(c) {
      /* A1 (Rest-Audit): Identitäts-Guards — Events eines ERSETZTEN Kanals (ICE-Timeout
         feuert close oft erst nach dem erfolgreichen Reconnect) dürfen die neue Verbindung nicht töten. */
      c.on("open", function () {
        if (c !== main) return; // Identitaets-Guard (Audit A1)
        ever = true; clearTimeout(tmo); reconns = 0; // erfolgreicher (Re)Connect -> Reconnect-Budget erneuern
        S._setStatus("connected"); startWd();
        if (!isHost) { // 2. Kanal: unreliable für Positions-Spam
          try { fast = peer.connect(pid(gameId, S.code), { label: "fast", reliable: false }); wireFast(fast); } catch (e) {}
        }
        S._res(S);
      });
      c.on("data", function (d) { if (c !== main && c !== fast) return; recv(d); });
      c.on("close", function () {
        if (c !== main) return;
        if (isHost && S.status !== "connected") { main = null; return; } /* A3: pending Kanal starb → Raum wieder frei */
        if (!byUs && S.status !== "closed") lost();
      });
      c.on("error", function () {
        if (c !== main) return;
        if (isHost && S.status !== "connected") { main = null; return; }
        if (!ever) fail("Verbindung fehlgeschlagen — Code prüfen und nochmal versuchen.");
      });
    }
    function lost() { // mehrere Reconnect-Versuche mit Backoff bei Abriss
      S._setStatus("lost");
      // mehrere Reconnect-Versuche mit Backoff; bei Erschoepfung giveUp() (zerstoert den
      // Peer -> gibt die feste Raum-ID frei, Audit A2)
      if (reconns >= MAX_RECONN) { giveUp(); return; }
      reconns++;
      var backoff = Math.min(6000, 600 * Math.pow(1.7, reconns - 1)); // 600ms .. 6s
      if (isHost) {
        main = null; // peer.on("connection") nimmt den Gast wieder an
        setTimeout(function () { if (S.status === "lost") lost(); }, backoff + 9000);
      } else {
        setTimeout(function () {
          if (S.status !== "lost") return;
          try { main = peer.connect(pid(gameId, S.code), { reliable: true }); wireMain(main); } catch (e) { giveUp(); return; }
          setTimeout(function () { if (S.status === "lost") lost(); }, backoff + 7000);
        }, backoff);
      }
    }
    function boot() {
      peer = new window.Peer(isHost ? pid(gameId, S.code) : undefined, mpPeerCfg());
      S._peer = peer;
      clearTimeout(tmo);
      tmo = setTimeout(function () {
        if (S.status === "connected") return;
        /* 🔁 1× automatisch auf den anderen Broker wechseln — Host/Gast können auf
           verschiedenen Vermittlungs-Servern sitzen (aban_broker ist pro Gerät!) */
        if (!retried) { retried = true; mpNextBroker(); try { if (peer) peer.destroy(); } catch (e) {} boot(); return; }
        fail(isHost ? "Vermittlungs-Server nicht erreichbar — Internet prüfen."
                    : "Raum " + S.code + " antwortet nicht — Code prüfen, dann nochmal.");
      }, JOIN_TIMEOUT);
      peer.on("open", function () {
        if (isHost) { clearTimeout(tmo); S._setStatus("waiting"); }
        else { main = peer.connect(pid(gameId, S.code), { reliable: true }); wireMain(main); }
      });
      peer.on("connection", function (conn) {
        if (!isHost) return;
        if (conn.label === "fast") { /* A3: fast nur vom verbundenen Gast, kein Hijack durch Fremde/Doppelte */
          if (!main || !main.open || conn.peer !== main.peer || (fast && fast.open)) { try { conn.close(); } catch (e) {} return; }
          fast = conn; wireFast(conn); return;
        }
        if (main) { try { conn.close(); } catch (e) {} return; } // Raum voll (1v1) — auch PENDING zählt als belegt (close/error geben den Slot frei)
        main = conn; wireMain(conn);
      });
      (function (pInst) { /* 🩹 Schwarm-P1: an Instanz binden — nach Broker-Retry darf der ALTE Peer nicht reconnecten (Zombie besetzt sonst die Raum-ID) */
        pInst.on("disconnected", function () { if (!byUs && pInst === peer) { try { pInst.reconnect(); } catch (e) {} } });
      })(peer);
      peer.on("error", function (err) {
      try { var _t = err && err.type; if (_t === "network" || _t === "server-error" || _t === "socket-error" || _t === "socket-closed") mpNextBroker(); } catch (e) {}
        var t = err && err.type;
        if (isHost && t === "unavailable-id") {
          if (noRegen) { fail("Public-Raum bereits belegt"); return; } // Quick-Match: auf Beitreten wechseln
          if (tries < 3) { tries++; try { peer.destroy(); } catch (e) {} S.code = makeCode(); boot(); return; } // Code-Kollision → neuer Code
          fail("Raum-Code-Kollision — bitte nochmal versuchen."); return; /* 🩹 Schwarm-P3: nie still hängen bleiben */
        }
        if (t === "peer-unavailable") {
          if (ever) return; /* 🩹 Schwarm-P2: mitten im Spiel übernimmt lost() den Reconnect — Boot-Retry würde den Broker-Index kippen */
          /* 🔁 Raum evtl. auf dem ANDEREN Broker → dort automatisch weitersuchen statt aufgeben */
          if (!retried) { retried = true; mpNextBroker(); clearTimeout(tmo); try { peer.destroy(); } catch (e) {} boot(); return; }
          fail("Raum " + S.code + " nicht gefunden — Code prüfen!");
        }
        else if (!ever && (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed")) {
          if (!retried) { retried = true; clearTimeout(tmo); try { peer.destroy(); } catch (e) {} boot(); return; } /* mpNextBroker lief schon oben */
          fail("Kein Kontakt zum Vermittlungs-Server — Internet prüfen.");
        }
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
    },
    // Host mit FESTEM Code (Public-Room), scheitert bei Kollision statt neu zu würfeln.
    _hostFixed: function (gameId, code) {
      var S = mkSession("host", code);
      if (FORCE_LOCAL) localEngine(S, gameId, true); else peerEngine(S, gameId, true, true);
      return S;
    },
    // ⚡ 1-Tipp Schnell-Koop OHNE Code: erst versuchen einem Public-Raum beizutreten,
    // ist er leer -> selbst Host des Public-Raums werden. Kein Code-Austausch nötig.
    // Läuft eine Session-Kette (join → hostFixed → join …) und spiegelt sie in EINE Außen-Session.
    quick: function (gameId, room) {
      // Public-Raum-Code: GENAU 4 Buchstaben aus dem erlaubten Alphabet (A–Z ohne I/O), keine Ziffern!
      room = String(room || "PUBA").toUpperCase().replace(/[^A-HJ-NP-Z]/g, "").slice(0, 4);
      if (room.length !== 4) room = "PUBA";
      var outer = mkSession("quick", room);
      outer.code = room;
      var inner = null, phase = 0, closedByUs = false, maxPhase = 4, everConnected = false, retryT = null;
      function goNext() { /* abwechselnd: Host des Public-Raums werden ↔ erneut beitreten (kleiner Zufalls-Delay gegen Race) */
        phase++;
        var next = (phase % 2 === 1) ? function () { wire(MP._hostFixed(gameId, room)); }
                                     : function () { wire(MP.join(gameId, room)); };
        retryT = setTimeout(function () { if (!closedByUs) next(); }, 250 + ((Math.random() * 500) | 0)); /* B2: stornierbar */
      }
      function settle() { /* B3: ready-Promise endgültig settlen (idempotent — _rej nach _res ist no-op) */
        outer.ready.catch(function () {});
        try { outer._rej(new Error("Kein Mitspieler gefunden")); } catch (e) {}
      }
      function wire(sess) {
        if (closedByUs) { try { sess.close(); } catch (e) {} return; } /* B2: Kette nach close() tot */
        inner = sess; outer.code = sess.code; outer.role = sess.role;
        sess.onMessage(function (d) { outer._emit(d); });
        outer.send = function (o) { sess.send(o); };
        outer.sendFast = function (o) { sess.sendFast(o); };
        sess.onStatus(function (st) {
          if (st === "connected") everConnected = true; /* B1: nach echter Verbindung NIE re-matchen (sonst joint ein Fremder ins laufende Spiel / Rollen-Kipp) */
          if (st === "closed" && !closedByUs && !everConnected && phase < maxPhase) { goNext(); return; }
          outer.role = inner ? inner.role : outer.role;
          if (st === "closed") settle();
          outer._setStatus(st);
        });
        sess.ready.then(function () { outer.role = sess.role; outer._res(outer); }).catch(function () {});
        if (sess.status === "closed") { /* B4: Session war schon SYNCHRON closed (z.B. PeerJS fehlt) — onStatus feuert nie mehr */
          setTimeout(function () {
            if (closedByUs) return;
            if (!everConnected && phase < maxPhase) goNext();
            else { settle(); outer._setStatus("closed"); }
          }, 0);
        }
      }
      wire(MP.join(gameId, room)); // Phase 0: zuerst Beitreten versuchen
      outer.close = function () { closedByUs = true; if (retryT) clearTimeout(retryT); if (inner) inner.close(); settle(); outer._setStatus("closed"); };
      return outer;
    }
  };
})();
