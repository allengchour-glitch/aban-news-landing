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
  /* Mehrere Vermittlungs-Server: faellt einer aus, wird der naechste probiert.
     null = PeerJS-Cloud (Standard). Reihenfolge = Versuchsreihenfolge. */
  /* ⚠️ Der dritte Eintrag war WIRKUNGSLOS: 0.peerjs.com ist genau der Default
     (null), und mpPeerCfg kopierte das einzige unterscheidende Feld `path` gar
     nicht mit. Ein „dritter Server" der in Wahrheit der erste ist, kostet beim
     Failover nur Zeit. Jetzt zwei echte Server — und path wird mitkopiert. */
  var MP_BROKERS = [
    null,
    { host: "peerjs.92k.de", port: 443, secure: true }
  ];
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
    if (b) { o.host = b.host; o.port = b.port; o.secure = b.secure; if (b.path) o.path = b.path; }
    return o;
  }
  function mpNextBroker() { try { var i = ((+(localStorage.getItem("aban_broker") || 0)) + 1) % MP_BROKERS.length; localStorage.setItem("aban_broker", String(i)); } catch (e) {} }

  "use strict";
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // A–Z ohne I/O (Verwechslungsgefahr)
  /* 15 s pro Server x 3 Server = 45 s stilles Warten. 9 s reichen: wer erreichbar ist,
     antwortet in unter 3 s. */
  var JOIN_TIMEOUT = 9000;

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
      send: function () {}, sendFast: function () {}, close: function () {},
      info: null /* {n:Hostname,p:Spielerzahl} — fuer die Antwort an Raum-Browser-Proben */
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
    var peer = null, main = null, fast = null, ever = false, byUs = false, dying = false /* absichtliches Zerstoeren — unterdrueckt den Reconnect-Handler */, tmo = null, tries = 0, retried = false, brokerVersuche = 0;
    var lastRecv = 0, wd = null, reconns = 0, MAX_RECONN = 5;
    var sendQ = []; /* 🩹 Schwarm4: "zuverlässige" Events während lost/Reconnect puffern statt still verwerfen */
    // Watchdog: DataChannel-close wird bei hartem Abbruch (Tab zu, Netz weg) oft
    // erst nach langem ICE-Timeout gemeldet → Stille >6s bei laufendem Traffic
    // (Spiele senden Snapshots/Pings im Sekundentakt) gilt als Abriss.
    function startWd() {
      lastRecv = Date.now();
      if (wd) clearInterval(wd);
      /* ⚠️ STILLE IST NICHT GLEICH ABRISS. Der Wachhund schlaegt nach 6 s ohne
         Nachricht an — er misst aber auch die Zeit, in der die SEITE SELBST
         blockiert war. Genau das passiert beim Spielstart: waehrend die Welt
         gebaut wird, steht der Hauptthread sekundenlang, es geht nichts raus
         und nichts rein — und beide Seiten erklaeren die Verbindung fuer tot,
         obwohl sie steht. Im Zwei-Seiten-Test starb die Sitzung reproduzierbar
         genau beim Start; auf einem langsamen Handy ist das der Normalfall.
         Der eigene Takt verraet die Blockade: kommt der 2-s-Intervall stark
         verspaetet, war die Seite eingefroren — diese Zeit zaehlt nicht als
         Funkstille. */
      var takt = Date.now();
      wd = setInterval(function () {
        var jetzt = Date.now(), spaet = jetzt - takt - 2000; takt = jetzt;
        if (spaet > 800) lastRecv += spaet;
        if (S.status === "closed") { clearInterval(wd); return; }
        if (S.status === "connected" && Date.now() - lastRecv > 6000) { clearInterval(wd); wd = null; lost(); return; }
        /* 🩹 Schwarm4: eigener Transport-Keepalive — in der Lobby sendet das Spiel oft
           nichts (hb läuft erst im Match), ohne Keepalive feuerte der 6s-Watchdog dann
           beidseitig mitten im Warten und riss die Verbindung im Sekundentakt ab. */
        try { if (S.status === "connected" && main && main.open) main.send({ t: "__ka" }); } catch (e) {}
      }, 2000);
    }
    function fail(msg) {
      if (byUs) return;
      clearTimeout(tmo);
      S._setStatus("closed");
      try { if (peer) { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } } catch (e) {}
      S._rej(new Error(msg));
    }
    /* A2 (Rest-Audit): endgültiges Aufgeben MUSS den Peer zerstören — sonst hält ein
       Zombie-Peer die feste Raum-ID (PUBA/OFEN/wildnis/tempel2) site-weit besetzt. */
    function giveUp() {
      clearTimeout(tmo); clearTimeout(rt);
      if (wd) { clearInterval(wd); wd = null; }
      S._setStatus("closed");
      try { if (peer) { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } } catch (e) {}
    }
    function recv(d) { lastRecv = Date.now(); if (d && d.t === "__ka") return; /* Transport-Keepalive zählt nur für lastRecv, geht NICHT ans Spiel */ S._emit(d); }
    function wireFast(c) { c.on("data", function (d) { if (c !== fast) return; recv(d); }); } /* A1: Zombie-Kanal füttert lastRecv nicht */
    function wireMain(c) {
      /* A1 (Rest-Audit): Identitäts-Guards — Events eines ERSETZTEN Kanals (ICE-Timeout
         feuert close oft erst nach dem erfolgreichen Reconnect) dürfen die neue Verbindung nicht töten. */
      c.on("open", function () {
        if (c !== main) return; // Identitaets-Guard (Audit A1)
        ever = true; clearTimeout(tmo); clearTimeout(rt); reconns = 0; // erfolgreicher (Re)Connect -> Reconnect-Budget erneuern + Kettentimer stoppen
        /* 🩹 Schwarm4: Erfolg -> Broker-Zähler zurück auf Standard. Ohne Reset driftete das
           Gerät nach jedem Netz-Hänger dauerhaft (localStorage!) auf einen anderen
           Vermittlungs-Server als der Mitspieler — korrekte Raum-Codes fanden sich nie mehr. */
        try { localStorage.setItem("aban_broker", "0"); } catch (e) {}
        S._setStatus("connected"); startWd();
        while (sendQ.length) { try { c.send(sendQ.shift()); } catch (e) { break; } } /* 🩹 Schwarm4: gepufferte Events in Reihenfolge nachliefern */
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
    var rt = null; /* 🩹 Schwarm-P2: Backoff-Kettentimer tracken — alter Timer feuerte nach erfolgreichem Reconnect erneut lost() */
    function lost() { // mehrere Reconnect-Versuche mit Backoff bei Abriss
      clearTimeout(rt);
      S._setStatus("lost");
      if (reconns >= MAX_RECONN) { giveUp(); return; }
      reconns++;
      var backoff = Math.min(6000, 600 * Math.pow(1.7, reconns - 1)); // 600ms .. 6s
      if (isHost) {
        /* 🩹 Schwarm-P0: BEIDE Kanäle schliessen — sonst bleiben die Kanäle beim Gast offen, der Host
           spammt weiter über fast (füttert den Gast-Watchdog) und der Gast merkt den Abriss NIE →
           Koop-Session stirbt endgültig, sobald der Host aufgibt. */
        try { if (main) main.close(); } catch (e) {}
        try { if (fast) fast.close(); } catch (e) {}
        fast = null;
        main = null; // peer.on("connection") nimmt den Gast wieder an
        rt = setTimeout(function () { if (S.status === "lost") lost(); }, backoff + 9000);
      } else {
        rt = setTimeout(function () {
          if (S.status !== "lost") return;
          /* 🩹 Schwarm4: alte Kanäle symmetrisch zum Host-Zweig schliessen — sonst hält das
             alte main beim Host den 1v1-Slot besetzt und jeder Neuversuch wird als "Raum
             voll" abgewiesen, bis das Reconnect-Budget verbraucht ist. */
          try { if (main) main.close(); } catch (e) {}
          try { if (fast) fast.close(); } catch (e) {}
          fast = null; main = null;
          try { main = peer.connect(pid(gameId, S.code), { reliable: true }); wireMain(main); } catch (e) { giveUp(); return; }
          rt = setTimeout(function () { if (S.status === "lost") lost(); }, backoff + 7000);
        }, backoff);
      }
    }
    function boot() {
      dying = false;   /* neuer Peer darf wieder reconnecten */
      peer = new window.Peer(isHost ? pid(gameId, S.code) : undefined, mpPeerCfg());
      S._peer = peer;
      clearTimeout(tmo);
      tmo = setTimeout(function () {
        if (S.status === "connected") return;
        /* 🔁 1× automatisch auf den anderen Broker wechseln — Host/Gast können auf
           verschiedenen Vermittlungs-Servern sitzen (aban_broker ist pro Gerät!) */
        /* 🔁 ALLE Vermittlungs-Server durchprobieren, nicht nur einen. Vorher gab es genau
           einen Wechsel — war auch der zweite Server nicht erreichbar, war Schluss, obwohl
           weitere in der Liste stehen. */
        if (brokerVersuche < MP_BROKERS.length - 1) {
          brokerVersuche++; retried = true; mpNextBroker();
          try { if (peer) { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } } catch (e) {}
          S._serverNr = brokerVersuche + 1; S._serverAnzahl = MP_BROKERS.length;
          S._setStatus("suche"); boot(); return; }
        fail(isHost ? "Vermittlungs-Server antwortet nicht (" + MP_BROKERS.length + " versucht). Meist hilft: ~1 Minute warten und nochmal versuchen — der Gratis-Server bremst bei vielen Versuchen kurz hintereinander."
                    : "Raum " + S.code + " antwortet nicht — Code prüfen, dann nochmal.");
      }, JOIN_TIMEOUT);
      peer.on("open", function () {
        if (isHost) { clearTimeout(tmo); S._setStatus("waiting"); }
        else { main = peer.connect(pid(gameId, S.code), { reliable: true }); wireMain(main); }
      });
      peer.on("connection", function (conn) {
        if (!isHost) return;
        /* 🔎 Raum-Browser-Probe: antwortet mit Rauminfo und belegt NIE den Gast-Slot.
           Ohne diese Weiche wurde die Probe als Gast angenommen (main=conn) — der Raum
           galt als voll, und ihr Trennen liess den Host "Verbindung verloren" melden. */
        if (conn.label === "probe") {
          conn.on("data", function (d) {
            var m; try { m = JSON.parse(d); } catch (e) { return; }
            if (m && m.t === "__lobby?") {
              try { conn.send(JSON.stringify({ t: "__lobby",
                n: (S.info && S.info.n) || "Host",
                p: (S.info && S.info.p) || 1,
                voll: !!(main && main.open) })); } catch (e) {}
            }
          });
          setTimeout(function () { try { conn.close(); } catch (e) {} }, 12000);
          return;
        }
        if (conn.label === "fast") { /* A3: fast nur vom verbundenen Gast, kein Hijack durch Fremde/Doppelte */
          if (!main || !main.open || conn.peer !== main.peer) { try { conn.close(); } catch (e) {} return; }
          if (fast && fast !== conn) { try { fast.close(); } catch (e) {} } /* 🩹 Schwarm-P3: Zombie-fast vom selben Gast ersetzen — nach Reconnect blieb der Spam-Kanal sonst tot */
          fast = conn; wireFast(conn); return;
        }
        if (main) { try { conn.close(); } catch (e) {} return; } // Raum voll (1v1) — auch PENDING zählt als belegt (close/error geben den Slot frei)
        main = conn; wireMain(conn);
      });
      (function (pInst) {
        /* 🩹 Schwarm-P0: peer.destroy() ruft intern zuerst disconnect() — und zwar SYNCHRON,
           waehrend destroyed noch false ist. Dieser Handler hat daraufhin reconnect() gerufen
           und den gerade zerstoerten Peer mit derselben Raum-ID neu beim Broker registriert.
           Ergebnis: ein Zombie, der die Raum-ID dauerhaft besetzt und auf nichts mehr antwortet
           — der Schnell-Koop des Spiels war danach fuer alle tot. byUs half nicht, weil es beim
           Broker-Retry und beim Aufgeben false ist. Darum ein eigenes Sterbe-Flag. */
        pInst.on("disconnected", function () {
          if (byUs || dying || pInst !== peer) return;
          try { pInst.reconnect(); } catch (e) {}
        });
      })(peer);
      peer.on("error", function (err) {
        if (byUs) return; /* 🩹 Schwarm-P2: nach close() darf kein Retry mehr booten (Zombie-Peer) */
      /* 🩹 Schwarm4: nur bei NIE zustande gekommener Verbindung den Broker wechseln — ein
         Netz-Hänger mitten im Spiel verstellte sonst den gespeicherten Zähler dauerhaft
         und die Spieler fanden sich beim nächsten Versuch nicht mehr. */
      try { var _t = err && err.type; if (!ever && (_t === "network" || _t === "server-error" || _t === "socket-error" || _t === "socket-closed")) mpNextBroker(); } catch (e) {}
        var t = err && err.type;
        if (isHost && t === "unavailable-id") {
          if (noRegen) { fail("Public-Raum bereits belegt"); return; } // Quick-Match: auf Beitreten wechseln
          if (tries < 3) { tries++; try { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } catch (e) {} S.code = makeCode(); boot(); return; } // Code-Kollision → neuer Code
          fail("Raum-Code-Kollision — bitte nochmal versuchen."); return; /* 🩹 Schwarm-P3: nie still hängen bleiben */
        }
        if (t === "peer-unavailable") {
          if (ever) return; /* 🩹 Schwarm-P2: mitten im Spiel übernimmt lost() den Reconnect — Boot-Retry würde den Broker-Index kippen */
          /* 🔁 Raum evtl. auf dem ANDEREN Broker → dort automatisch weitersuchen statt aufgeben.
             🩹 Schwarm4: ALLE Broker durchprobieren (wie im Timeout-Pfad), nicht nur einen —
             mit dem einmaligen retried-Flag wurde der Server, auf dem der Host wirklich sitzt,
             je nach gespeichertem Zähler-Stand nie probiert. */
          if (brokerVersuche < MP_BROKERS.length - 1) { brokerVersuche++; retried = true; mpNextBroker(); clearTimeout(tmo); try { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } catch (e) {} boot(); return; }
          fail("Raum " + S.code + " nicht gefunden — Code prüfen!");
        }
        else if (!ever && (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed")) {
          if (!retried) { retried = true; clearTimeout(tmo); try { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } catch (e) {} boot(); return; } /* mpNextBroker lief schon oben */
          fail("Kein Kontakt zum Vermittlungs-Server — Internet prüfen.");
        }
      });
    }
    S.send = function (o) { try { if (main && main.open) main.send(o); else if (S.status !== "closed" && sendQ.length < 200) sendQ.push(o); } catch (e) {} }; /* 🩹 Schwarm4: puffern statt verwerfen — sonst gehen Boss-Treffer/GameOver im Reconnect-Fenster für immer verloren */
    S.sendFast = function (o) { try { if (fast && fast.open) fast.send(o); else if (main && main.open) main.send(o); } catch (e) {} };
    S.close = function () { byUs = true; clearTimeout(tmo); if (wd) clearInterval(wd); S._setStatus("closed"); try { if (peer) { dying = true; peer.destroy(); try { peer.socket && peer.socket.close(); } catch (e2) {} } } catch (e) {} };
    boot();
  }

  // ===== Engine B: rohes WebRTC + BroadcastChannel-Signaling (nur Test) ====
  function localEngine(S, gameId, isHost) {
    var bc = new BroadcastChannel("aban-mp-" + gameId + "-" + S.code);
    var pc = new RTCPeerConnection({ iceServers: [] }); // Loopback braucht kein STUN
    var main = null, fast = null, me = isHost ? "h" : "j", pend = [], lastRecv = 0, wd = null;
    /* 🔎 Warum die Sitzung endete — ohne das ist ein fehlgeschlagener Beitritt
       nicht zu unterscheiden von "Raum gibt es nicht". Kostet ein Feld. */
    function gone(grund) { if (S.status === "closed") return; S._why = grund || ("pc:" + pc.connectionState + "/" + pc.iceConnectionState); S._setStatus("lost"); S._setStatus("closed"); }
    function startWd() {
      lastRecv = Date.now();
      if (wd) clearInterval(wd);
      var takt = Date.now();   /* Blockade der eigenen Seite zaehlt nicht als Funkstille — siehe Engine A */
      wd = setInterval(function () {
        var jetzt = Date.now(), spaet = jetzt - takt - 2000; takt = jetzt;
        if (spaet > 800) lastRecv += spaet;
        if (S.status === "closed") { clearInterval(wd); return; }
        if (S.status === "connected" && Date.now() - lastRecv > 6000) { clearInterval(wd); gone("stille"); }
        /* ⚠️ DER KEEPALIVE HAT HIER GEFEHLT. Engine A sendet alle 2 s ein
           `__ka`; Engine B hat nur GELAUSCHT. Damit starb jede Testsitzung,
           sobald das Spiel selbst 6 s nichts schickte — reproduzierbar GENAU
           beim Spielstart, wenn die Gegenseite ihre Welt baut und dabei nichts
           senden kann. Gemessen auf beiden Seiten: `lost:stille` nach 2 s.
           Ohne den Keepalive misst der Zwei-Seiten-Test nur sich selbst. */
        try { if (S.status === "connected" && main && main.readyState === "open") main.send(JSON.stringify({ t: "__ka" })); } catch (e) {}
      }, 2000);
    }
    pc.onconnectionstatechange = function () {
      var st = pc.connectionState;
      if (st === "failed" || st === "closed" || st === "disconnected") gone("pcstate:" + st);
    };
    function post(t, d) { bc.postMessage({ t: t, from: me, d: d }); }
    function addIce(d) {
      var c = JSON.parse(d);
      if (pc.remoteDescription) pc.addIceCandidate(c).catch(function () {});
      else pend.push(c);
    }
    function flushIce() { pend.forEach(function (c) { pc.addIceCandidate(c).catch(function () {}); }); pend = []; }
    pc.onicecandidate = function (e) { if (e.candidate) post("ice", JSON.stringify(e.candidate)); };
    /* ⚠️ NICHT NUR AUF `onopen` VERLASSEN. Gemessen im Zwei-Seiten-Test: der
       Hauptkanal des Gasts stand nachweislich auf readyState "open" (Sonde
       `_diag`), das `open`-EREIGNIS kam aber nie an — die Sitzung wartete
       weiter und lief nach 9 s in den Beitritts-Timeout, obwohl die Verbindung
       stand. Ein Zustand ist verlaesslicher als ein Ereignis: `oeffnen()` ist
       idempotent und wird ausserdem kurz gepollt. */
    var offen = false;
    function oeffnen() {
      if (offen || S.status === "closed") return;
      offen = true;
      if (pollT) { clearInterval(pollT); pollT = null; }
      S._setStatus("connected"); startWd(); S._res(S);
    }
    var pollT = null;
    function pollOffen() {
      if (pollT) return;
      pollT = setInterval(function () {
        if (S.status === "closed" || offen) { clearInterval(pollT); pollT = null; return; }
        if (main && main.readyState === "open") oeffnen();
      }, 150);
    }
    function wired(c, isFast) {
      c.onmessage = function (ev) { lastRecv = Date.now();
        try { var d = JSON.parse(ev.data); if (d && d.t === "__ka") return; /* Transport-Keepalive geht NICHT ans Spiel */ S._emit(d); } catch (e) {} };
      c.onopen = function () { if (!isFast) oeffnen(); };
      c.onclose = function () { if (!isFast) gone("kanal-zu"); };
      if (!isFast) { if (c.readyState === "open") oeffnen(); else pollOffen(); }
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
        if (S.status !== "connected") { S._why = S._why || "timeout"; S._setStatus("closed"); S._rej(new Error("Raum " + S.code + " nicht gefunden (lokaler Test-Modus, Grund: " + S._why + ").")); }
      }, JOIN_TIMEOUT);
    }
    /* 🔎 Zustand der Testverbindung von aussen lesbar — sonst ist ein
       fehlgeschlagener Beitritt im lokalen Modus nicht zu diagnostizieren. */
    S._diag = function () { return { conn: pc.connectionState, ice: pc.iceConnectionState,
      sig: pc.signalingState, gather: pc.iceGatheringState,
      main: main && main.readyState, fast: fast && fast.readyState }; };
    S.send = function (o) { try { if (main && main.readyState === "open") main.send(JSON.stringify(o)); } catch (e) {} };
    S.sendFast = function (o) { try { if (fast && fast.readyState === "open") fast.send(JSON.stringify(o)); else S.send(o); } catch (e) {} };
    S.close = function () { if (wd) clearInterval(wd); if (pollT) clearInterval(pollT); S._setStatus("closed"); try { pc.close(); } catch (e) {} try { bc.close(); } catch (e) {} };
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
    /* 🔎 RAUM-SUCHE (User: „mit koop server suchen und joinen so dass man namen sieht").
       PeerJS hat KEINE Raumliste — der Vermittlungs-Server kennt nur IDs, die man
       schon kennt. Ein Server-Browser geht deshalb nur ueber einen FESTEN Vorrat
       oeffentlicher Raum-Codes, den alle Clients kennen: MP.PUBLIC. Gesucht wird,
       indem jeder Code kurz angewaehlt wird. Kommt eine Verbindung zustande, sitzt
       dort ein Host und wartet; die Probe fragt „__lobby?" und bekommt Name und
       Spielerzahl zurueck, dann trennt sie sofort wieder.
       Belegte 2er-Raeume nehmen die Probe gar nicht erst an — sie tauchen also
       korrekterweise nicht in der Liste auf.
       Das Spiel MUSS auf „__lobby?" antworten, sonst bleibt sein Raum unsichtbar. */
    PUBLIC: ["PUBA", "PUBB", "PUBC", "PUBD", "PUBE", "PUBF"],
    suche: function (gameId, opt) {
      /* ⚠️ EIN einziger Peer fuer ALLE Proben. Die erste Fassung oeffnete pro Code
         eine eigene Peer-Verbindung (6 gleichzeitig von einer IP) — die Gratis-
         Cloud drosselt genau das, und danach lief sogar das normale „Raum
         erstellen" in den Timeout („Kein Vermittlungs-Server erreichbar",
         User-Screenshot). Ein Peer darf beliebig viele fremde IDs anwaehlen. */
      opt = opt || {};
      var codes = opt.codes || MP.PUBLIC, gefunden = [], tot = false;
      var frist = opt.frist || 7000, offen = codes.length;
      var peer = null, gesamtT = null;
      function fertig() {
        if (tot) return; tot = true;
        if (gesamtT) clearTimeout(gesamtT);
        try { if (peer) peer.destroy(); } catch (e) {}
        if (opt.fertig) try { opt.fertig(gefunden); } catch (e) {}
      }
      if (!window.Peer || !codes.length) { setTimeout(fertig, 0); return { abbrechen: fertig }; }
      gesamtT = setTimeout(fertig, frist + 4000);
      try { peer = new Peer(undefined, mpPeerCfg()); } catch (e) { fertig(); return { abbrechen: fertig }; }
      peer.on("error", function (e) {
        /* peer-unavailable = dieser eine Raum ist leer — normal, NICHT der Peer kaputt */
        if (e && e.type === "peer-unavailable") return;
        fertig();
      });
      peer.on("open", function () {
        codes.forEach(function (code) {
          var erledigt = false, t = null, c = null;
          function schluss(info) {
            if (erledigt) return; erledigt = true;
            if (t) clearTimeout(t);
            try { if (c) c.close(); } catch (e) {}
            if (info) { gefunden.push(info); if (opt.fund) try { opt.fund(info); } catch (e) {} }
            if (--offen <= 0) fertig();
          }
          t = setTimeout(function () { schluss(null); }, frist);
          try { c = peer.connect(pid(gameId, code), { reliable: true, label: "probe" }); } catch (e) { schluss(null); return; }
          if (!c) { schluss(null); return; }
          c.on("open", function () { try { c.send(JSON.stringify({ t: "__lobby?" })); } catch (e) {} });
          c.on("data", function (d) {
            var m; try { m = JSON.parse(d); } catch (e) { return; }
            if (m && m.t === "__lobby") schluss({ code: code, name: m.n || "?", spieler: m.p || 1, voll: !!m.voll });
          });
          c.on("close", function () { schluss(null); });
          c.on("error", function () { schluss(null); });
        });
      });
      return { abbrechen: fertig };
    },
    /* Ersten freien oeffentlichen Raum belegen. Reihenfolge = MP.PUBLIC, damit
       Suchende zuverlaessig von vorne fuendig werden.
       🩹 Schwarm4: Kette statt Einmal-Versuch — belegt eine volle Partie die feste ID
       (unavailable-id -> fail "Public-Raum bereits belegt"), wird automatisch der
       naechste Code aus MP.PUBLIC probiert statt hart zu scheitern, obwohl 5 von 6
       Raeumen frei sind. Aussen-Session spiegelt die Kette (analog MP.quick). */
    hostPublic: function (gameId, belegt) {
      belegt = belegt || [];
      var codes = [], i;
      for (i = 0; i < MP.PUBLIC.length; i++)
        if (belegt.indexOf(MP.PUBLIC[i]) < 0) codes.push(MP.PUBLIC[i]);
      if (!codes.length) codes = MP.PUBLIC.slice();
      var outer = mkSession("host", codes[0]), inner = null, idx = 0, closedByUs = false, everConnected = false, _info = null;
      /* info/_peer muessen an die INNERE Session durchgereicht werden (Raum-Browser-Antwort + Voice) */
      try {
        Object.defineProperty(outer, "info", { get: function () { return _info; }, set: function (v) { _info = v; if (inner) inner.info = v; } });
        Object.defineProperty(outer, "_peer", { get: function () { return inner && inner._peer; } });
      } catch (e) {}
      function settle() { outer.ready.catch(function () {}); try { outer._rej(new Error("Alle öffentlichen Räume belegt — gleich nochmal versuchen.")); } catch (e) {} }
      function wire(sess) {
        if (closedByUs) { try { sess.close(); } catch (e) {} return; }
        inner = sess; outer.code = sess.code; sess.info = _info;
        sess.onMessage(function (d) { outer._emit(d); });
        outer.send = function (o) { sess.send(o); };
        outer.sendFast = function (o) { sess.sendFast(o); };
        sess.onStatus(function (st) {
          outer._serverNr = sess._serverNr; outer._serverAnzahl = sess._serverAnzahl;
          if (st === "connected") everConnected = true;
          if (st === "closed" && !closedByUs && !everConnected && idx + 1 < codes.length) { idx++; wire(MP._hostFixed(gameId, codes[idx])); return; }
          if (st === "closed") settle();
          outer._setStatus(st);
        });
        sess.ready.then(function () { outer._res(outer); }).catch(function () {});
        if (sess.status === "closed") { /* Session starb SYNCHRON (z.B. PeerJS fehlt) — onStatus feuert nie mehr */
          setTimeout(function () {
            if (closedByUs) return;
            if (!everConnected && idx + 1 < codes.length) { idx++; wire(MP._hostFixed(gameId, codes[idx])); }
            else { settle(); outer._setStatus("closed"); }
          }, 0);
        }
      }
      wire(MP._hostFixed(gameId, codes[0]));
      outer.close = function () { closedByUs = true; if (inner) inner.close(); settle(); outer._setStatus("closed"); };
      return outer;
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
