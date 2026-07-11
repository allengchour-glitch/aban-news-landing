/* aban Arcade — gemeinsame Helfer (Phase 1 der Arcade-Shell).
   Wird vom Hub (/spiele.html) genutzt; Spiele können die Primitives
   schrittweise übernehmen (Phase 2). Kein three.js, keine Abhängigkeiten. */
(function (global) {
  "use strict";
  var KEY = "abanArcade";
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var A = {
    /* --- Touch-Erkennung --- */
    isTouch: !!((global.matchMedia && global.matchMedia("(pointer:coarse)").matches) ||
      ((typeof navigator !== "undefined" && navigator.maxTouchPoints) | 0) > 0),

    /* --- Gemeinsames Spieler-Profil (localStorage "abanArcade") --- */
    profile: function () {
      try { var o = JSON.parse(lsGet(KEY) || "{}"); return (o && typeof o === "object") ? o : {}; }
      catch (e) { return {}; }
    },
    setName: function (name) {
      var p = A.profile();
      p.name = String(name == null ? "" : name).trim().slice(0, 20);
      p.t = Date.now();
      lsSet(KEY, JSON.stringify(p));
      return p;
    },

    /* --- Highscore/Fortschritt defensiv lesen ---
       key: localStorage-Key; jsonField: optionales Feld, wenn der Wert ein JSON-Spielstand ist.
       Gibt eine Zahl > 0 zurück oder 0 (nie Exception). */
    readBest: function (key, jsonField) {
      try {
        var raw = lsGet(key);
        if (raw == null || raw === "") return 0;
        var v;
        if (jsonField) { var o = JSON.parse(raw); v = o ? o[jsonField] : 0; }
        else v = parseFloat(raw);
        v = Math.round(Number(v) * 10) / 10;
        return (isFinite(v) && v > 0) ? v : 0;
      } catch (e) { return 0; }
    },

    /* --- Ton (Mute-Flag pro Spiel, "1"/"0") --- */
    getMuted: function (key) { return lsGet(key) === "1"; },
    setMuted: function (key, on) { lsSet(key, on ? "1" : "0"); },

    /* --- Vollbild an/aus (best effort, iOS-safe no-op) --- */
    fullscreen: function (el) {
      try {
        el = el || document.documentElement;
        if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
        else if (el.requestFullscreen) el.requestFullscreen();
      } catch (e) {}
    },

    /* --- Pause-Hooks: ruft cb("esc") bei Escape, cb("hidden") bei Tab-Wechsel --- */
    onPause: function (cb) {
      if (typeof cb !== "function") return;
      global.addEventListener("keydown", function (e) { if (e.key === "Escape") cb("esc"); });
      document.addEventListener("visibilitychange", function () { if (document.hidden) cb("hidden"); });
    }
  };

  global.AbanArcade = A;
})(typeof window !== "undefined" ? window : this);
