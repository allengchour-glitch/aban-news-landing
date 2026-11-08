/* KB3D Büro: setzt Welt, Figuren, Kamera, Bedienung und Beschriftungen zusammen.
   Die Seite ruft nur mount / update / unmount (über K.Buero). Die Daten kommen als einfache Liste (ents), nichts wird hier gerechnet,
   was die Seite schon entschieden hat (Zustand, Haltung). Kein Netz, keine Fremdbibliothek. */
(function (K) {
  'use strict';
  var PI = Math.PI, M = K.M, T = K.tex;
  var DEF = { gruen: '#2f9e5b', gelb: '#d99a1b', rot: '#e04b4b', du: '#3b6fd8', alt: '#8b949e' };
  var LABEL_DIST = 19;

  function swissHour() {
    try {
      var p = new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()), h = 0, m = 0;
      p.forEach(function (x) { if (x.type === 'hour') h = Number(x.value); if (x.type === 'minute') m = Number(x.value); });
      return h + m / 60;
    } catch (e) { return 12; }
  }
  function xf(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* Eine kleine Zahl in einer Sprechblase (für die Zahl der offenen Punkte). */
  function numberBubble(n) {
    var o = T.mk(64, 64), g = o.g;
    g.fillStyle = 'rgba(255,255,255,0.004)'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; g.strokeStyle = '#b7791f'; g.lineWidth = 3;
    T.rr(g, 6, 8, 52, 36, 14); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(20, 42); g.lineTo(14, 58); g.lineTo(32, 44); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(20, 43); g.lineTo(14, 58); g.lineTo(32, 43); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(19, 40, 12, 5);
    g.fillStyle = '#8a5a00'; g.font = 'bold 28px ' + T.FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(String(n), 32, 37);
    return o.c;
  }

  K.Buero = {
    /* Geht 3D auf diesem Gerät überhaupt (WebGL da, Modelle geladen)? */
    supported: function () {
      return !!(K.supported && K.supported() && K.model && K.model.has('man') && K.model.has('desk') && K.model.has('chair') && K.buildWorld);
    },

    mount: function (el, cfg) {
      cfg = cfg || {};
      var tBuild = performance.now();
      var made = { ok: false, ents: [], destroyed: false };
      var cv = document.createElement('canvas');
      cv.className = 'kb3-canvas';
      cv.tabIndex = 0;
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', cfg.ariaLabel || '3D-Ansicht des Büros');
      var over = document.createElement('div');
      over.className = 'kb3-over';
      el.replaceChildren(cv, over);

      var R, W, kit, fx;
      try {
        R = new K.Renderer(cv, { antialias: true });
        W = K.buildWorld(R);
        kit = K.figureKit(R);
        fx = K.fx(R);
      } catch (e) {
        el.replaceChildren();
        made.error = String(e && e.message || e);
        if (cfg.onFail) cfg.onFail(made.error);
        return made;
      }
      made.R = R; made.W = W;
      var col = {};
      Object.keys(DEF).forEach(function (k) { col[k] = K.col((cfg.colors && cfg.colors[k]) || DEF[k]); });
      made.colors = col;

      /* ---------- Figuren auf allen Plätzen ---------- */
      var figs = W.seats.map(function (seat, i) {
        var s = seat.spec;
        var f = new K.Figure(R, kit, { x: s.x, z: s.z, h: s.h }, { kind: s.who || 'man', seed: seat.seed + i * 31, boss: !!s.boss });
        f.setPose(s.boss ? 'rest' : 'sleep');
        seat.fig = f; seat.pose = s.boss ? 'rest' : 'sleep'; seat.entId = null; seat.state = 'alt'; seat.used = !!s.boss;
        seat.screenKind = 'sleep';
        return f;
      });
      var seatsByRoom = {};
      W.seats.forEach(function (seat) { (seatsByRoom[seat.spec.room] = seatsByRoom[seat.spec.room] || []).push(seat); });

      /* ---------- Markierungen (Form, Farbe aus den Lampen) ---------- */
      var shapes = {};
      (function () {
        var b = new K.Builder(); b.sph(0, 0, 0, 0.14, 0.14, 0.14, 12, 8, [1, 1, 1], 0.55); shapes.gruen = R.mesh(b);
        b = new K.Builder(); b.cyl(0, 0, 0, 0.0, 0.2, 0.3, 3, [1, 1, 1], 0.55); shapes.gelb = R.mesh(b);
        b = new K.Builder(); b.box(0, 0, 0, 0.22, 0.22, 0.22, [1, 1, 1], 0.55); shapes.rot = R.mesh(b);
        b = new K.Builder(); b.cyl(0, 0.17, 0, 0.0, 0.18, 0.34, 4, [1, 1, 1], 0.55); b.cyl(0, -0.17, 0, 0.18, 0.0, 0.34, 4, [1, 1, 1], 0.55); shapes.du = R.mesh(b);
        b = new K.Builder(); b.torus(0, 0, 0, 0.12, 0.035, 18, 6, [1, 1, 1], 0.5); shapes.alt = R.mesh(b);
        Object.keys(shapes).forEach(function (k) { shapes[k].tint = col[k]; });
      })();
      var ringB = new K.Builder(); ringB.ring(0, 0.03, 0, 0.95, 1.08, 40, [1, 1, 1], 0.7);
      var ring = R.mesh(ringB);
      var numTex = R.texture(numberBubble(0), { mip: false }), numShown = -1;

      /* ---------- Kamera ---------- */
      var cam = new K.Camera();
      var viewName = 'alle', userDist = null;
      function fitDist(base, aspect) { return base * Math.pow(Math.max(1, 1.33 / Math.max(0.3, aspect)), 0.85); }
      function goView(name, now) {
        var v = W.views[name] || W.views.alle;
        viewName = W.views[name] ? name : 'alle';
        var a = made.aspect || 1.33;
        cam.go({ tx: v.tx, ty: v.ty, tz: v.tz, dist: fitDist(v.dist, a), az: 0.66, el: 0.63 }, !!now);
        made.dirty = true;
        if (cfg.onView) cfg.onView(viewName);
      }
      made.goView = goView;

      /* ---------- Zustand ---------- */
      var picks = [], labels = [], sel = null;
      var belt = { moving: true, count: 0 };
      var bossBlaetter = 0, boardEnt = null, cardEnts = [], beltEnt = null;
      var hour = swissHour(), skyHour = -99, lastSky = -1e9;

      function screenKindFor(room, pose, used) {
        if (!used) return 'sleep';
        if (pose === 'warn') return 'warn';
        if (pose === 'alarm') return 'error';
        if (pose === 'sleep') return 'sleep';
        if (pose === 'rest') return 'idle';
        return room === 'Krypto' ? 'chart' : room === 'Versand' ? 'map' : room === 'Shop' ? 'shop' : room === 'Chefbüro' ? 'dash' : 'code';
      }
      function applyScreen(seat, kind) {
        seat.screenKind = kind;
        var st = W.screenTex(kind, seat.seed);
        seat.screens.forEach(function (m, k) {
          m.tex = st.tex;
          m.uvs = kind === 'code' ? [1, 0.5] : [1, 1];
          m.uvo = [0, 0];
        });
      }
      W.seats.forEach(function (seat) { applyScreen(seat, 'sleep'); });

      function clearLabels() { while (over.firstChild) over.removeChild(over.firstChild); labels = []; }
      function addLabel(ent, ax, ay, az) {
        if (!cfg.makeLabel) return;
        var el2 = cfg.makeLabel(ent);
        if (!el2) return;
        el2.classList.add('kb3-label');
        over.appendChild(el2);
        labels.push({ el: el2, id: ent.id, p: [ax, ay, az], sel: ent.id === sel });
      }

      /* Neue Daten: ents = [{id, bereich, figur, kurz, name, state, pose, menge}], chef = {pose, blaetter} */
      made.update = function (state) {
        state = state || {};
        var ents = state.ents || [];
        made.ents = ents;
        if (W.updateInfo) {
          var stopped = ents.filter(function(e){return e.state === 'rot';}).length;
          var stale = ents.filter(function(e){return e.state === 'alt';}).length;
          W.updateInfo(ents.length + ' Stationen  /  ' + stopped + ' rote Signale  /  ' + stale + ' alte Messungen');
        }
        if (state.colors) Object.keys(DEF).forEach(function (k) { if (state.colors[k]) col[k] = K.col(state.colors[k]); });
        sel = state.sel || null;
        W.seats.forEach(function (seat) { if (!seat.spec.boss) { seat.entId = null; seat.used = false; seat.state = 'alt'; seat.ent = null; } });
        picks = [];
        clearLabels();
        var used = {}, ci = 0;
        beltEnt = null; boardEnt = null; cardEnts = [];
        ents.forEach(function (e) {
          if (e.figur === 'arbeiter') {
            var list = seatsByRoom[e.bereich] || [];
            var k = used[e.bereich] || 0;
            used[e.bereich] = k + 1;
            var seat = list.filter(function (s) { return !s.spec.boss; })[k];
            if (!seat) return;
            seat.entId = e.id; seat.ent = e; seat.used = true; seat.state = e.state; seat.pose = e.pose;
            seat.fig.setPose(e.pose);
            applyScreen(seat, screenKindFor(e.bereich, e.pose, true));
            if (seat.sign) seat.sign.tex = e.ortArt ? W.ortTex(e.ortArt, e.ortKurz) : null;
            var h = seat.h, c = Math.cos(h), s = Math.sin(h);
            picks.push({ id: e.id, mn: [seat.x - 0.95, 0, Math.min(seat.z - 0.4 * c, seat.z + 1.2 * c)], mx: [seat.x + 0.95, 1.9, Math.max(seat.z - 0.4 * c, seat.z + 1.2 * c)] });
            addLabel(e, seat.x, 2.15, seat.z);
          } else if (e.figur === 'paket') {
            beltEnt = e; belt.count = Math.max(0, Math.min(4, Math.round(Number(e.menge) || 0)));
            belt.moving = e.state === 'gruen' || e.state === 'gelb' || e.state === 'du';
            picks.push({ id: e.id, mn: W.belt.mn, mx: W.belt.mx });
            addLabel(e, 3.2, 1.55, W.belt.z);
          } else if (e.figur === 'tafel') {
            boardEnt = e;
            var key = String(e.menge) + '|' + e.kurz;
            if (W.board.key !== key) { W.board.key = key; R.retex(W.board.tex, T.board(e.menge, e.kurz, '#2f6aa8')); }
            picks.push({ id: e.id, mn: W.board.mn, mx: W.board.mx });
            addLabel(e, -6.3, 2.35, -5.9);
          } else if (e.figur === 'papier') {
            var cd = W.cards[ci];
            if (cd) {
              var ck = e.kurz + '|' + e.state;
              if (cd.key !== ck) { cd.key = ck; R.retex(cd.tex, T.card(e.kurz, 'du', '#3b6fd8')); }
              cd.ent = e; cd.on = true;
              picks.push({ id: e.id, mn: cd.mn, mx: cd.mx });
              addLabel(e, -6.9, 2.2 + (ci % 2) * 0.08, cd.z);
              cardEnts.push(cd);
            }
            ci++;
          }
        });
        W.cards.forEach(function (cd, k) { cd.on = k < cardEnts.length; });
        // Chef
        var boss = W.seats[W.seats.length - 1];
        var cp = state.chef || { pose: 'rest', blaetter: 0 };
        boss.pose = cp.pose; boss.fig.setPose(cp.pose);
        bossBlaetter = cp.blaetter | 0;
        applyScreen(boss, screenKindFor('Chefbüro', cp.pose, true));
        addLabel({ id: '__chef', kurz: 'Du', figur: 'chef', state: 'du', name: 'Du' }, boss.x, 2.2, boss.z);
        made.dirty = true;
      };

      made.select = function (id) {
        sel = id || null;
        labels.forEach(function (l) { l.sel = l.id === sel; if (l.el.classList) l.el.classList.toggle('is-sel', l.sel); });
        made.dirty = true;
      };

      /* ---------- Bedienung ---------- */
      var ptrs = {}, nptr = 0, down = null, pinch = 0, moveMode = false;
      // Pixelbewegung in der Bildebene; abhängig von Zoom, Blickwinkel und Höhe.
      function pan(dx, dy) {
        var scale = 2 * cam.g.dist * Math.tan(cam.fov / 2) / Math.max(1, made.h);
        var a = cam.g.az, e = cam.g.el;
        cam.g.tx = clamp(cam.g.tx + scale * (-dx * Math.cos(a) - dy * Math.sin(a) * Math.sin(e)), -18, 18);
        cam.g.ty = clamp(cam.g.ty + scale * dy * Math.cos(e), -6, 12);
        cam.g.tz = clamp(cam.g.tz + scale * (dx * Math.sin(a) - dy * Math.cos(a) * Math.sin(e)), -16, 22);
        cam.tx = cam.g.tx; cam.ty = cam.g.ty; cam.tz = cam.g.tz;
        made.dirty = true;
      }
      function rectOf() { return cv.getBoundingClientRect(); }
      function ndc(ev) { var r = rectOf(); return [((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1)]; }
      function doPick(ev) {
        var n = ndc(ev), ray = cam.ray(n[0], n[1]), best = -1, id = null;
        for (var i = 0; i < picks.length; i++) {
          var d = K.rayBox(ray.o, ray.d, picks[i].mn, picks[i].mx);
          if (d >= 0 && (best < 0 || d < best)) { best = d; id = picks[i].id; }
        }
        return id;
      }
      cv.addEventListener('pointerdown', function (ev) {
        ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY }; nptr++;
        try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* nichts */ }
        if (nptr === 1) down = { x: ev.clientX, y: ev.clientY, t: performance.now(), moved: 0, pan: moveMode || ev.shiftKey || ev.button === 1 || ev.button === 2 };
        if (nptr === 2) { var k = Object.keys(ptrs); pinch = Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y); if (down) down.moved = 99; }
      });
      cv.addEventListener('pointermove', function (ev) {
        var p = ptrs[ev.pointerId];
        if (!p) { // Maus ohne gedrückte Taste: Zeiger anzeigen
          if (ev.pointerType === 'mouse') cv.style.cursor = doPick(ev) ? 'pointer' : 'grab';
          return;
        }
        var dx = ev.clientX - p.x, dy = ev.clientY - p.y;
        p.x = ev.clientX; p.y = ev.clientY;
        if (nptr === 1) {
          if (down) down.moved += Math.abs(dx) + Math.abs(dy);
          if (down && down.pan) pan(dx, dy);
          else {
            cam.g.az = clamp(cam.g.az - dx * 0.006, 0.0, 1.5);
            cam.g.el = clamp(cam.g.el + dy * 0.004, 0.3, 1.2);
            cam.az = cam.g.az; cam.el = cam.g.el;
          }
          made.dirty = true;
        } else if (nptr === 2) {
          pan(dx / 2, dy / 2);
          var k = Object.keys(ptrs), d = Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y);
          if (pinch > 0 && d > 0) { cam.g.dist = clamp(cam.g.dist * pinch / d, 5.5, 60); cam.dist = cam.g.dist; made.dirty = true; }
          pinch = d;
        }
      });
      function up(ev) {
        var had = !!ptrs[ev.pointerId];
        delete ptrs[ev.pointerId]; nptr = Math.max(0, nptr - 1);
        if (had && ev.button === 0 && nptr === 0 && down && down.moved < 9 && performance.now() - down.t < 600) {
          var id = doPick(ev);
          if (cfg.onPick) cfg.onPick(id);
        }
        if (nptr === 0) down = null;
      }
      cv.addEventListener('pointerup', up);
      cv.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      cv.addEventListener('pointercancel', function (ev) { if (ptrs[ev.pointerId]) { delete ptrs[ev.pointerId]; nptr = Math.max(0, nptr - 1); } if (nptr === 0) down = null; });
      cv.addEventListener('wheel', function (ev) {
        if (!(ev.ctrlKey || ev.metaKey)) return;
        ev.preventDefault();
        cam.g.dist = clamp(cam.g.dist * Math.exp(ev.deltaY * 0.0018), 5.5, 60);
        made.dirty = true;
      }, { passive: false });
      cv.addEventListener('keydown', function (ev) {
        var k = ev.key, used2 = true;
        if (ev.shiftKey && /^Arrow(Left|Right|Up|Down)$/.test(k)) pan(k === 'ArrowLeft' ? -50 : k === 'ArrowRight' ? 50 : 0, k === 'ArrowUp' ? -50 : k === 'ArrowDown' ? 50 : 0);
        else if (k === 'ArrowLeft') cam.g.az = clamp(cam.g.az + 0.1, 0, 1.5);
        else if (k === 'ArrowRight') cam.g.az = clamp(cam.g.az - 0.1, 0, 1.5);
        else if (k === 'ArrowUp') cam.g.el = clamp(cam.g.el + 0.06, 0.3, 1.2);
        else if (k === 'ArrowDown') cam.g.el = clamp(cam.g.el - 0.06, 0.3, 1.2);
        else if (k === '+' || k === '=') cam.g.dist = clamp(cam.g.dist * 0.85, 5.5, 60);
        else if (k === '-') cam.g.dist = clamp(cam.g.dist / 0.85, 5.5, 60);
        else if (k === 'Home') goView('alle');
        else if (k === 'Escape') { if (cfg.onPick) cfg.onPick(null); }
        else used2 = false;
        if (used2) { ev.preventDefault(); made.dirty = true; }
      });
      made.cmd = function (name) {
        if (name === 'move' || name === 'rotate') {
          moveMode = name === 'move';
          cv.style.touchAction = 'none';
        }
        else if (name === 'panLeft') pan(-50, 0);
        else if (name === 'panRight') pan(50, 0);
        else if (name === 'panUp') pan(0, -50);
        else if (name === 'panDown') pan(0, 50);
        else if (name === 'zoomIn') cam.g.dist = clamp(cam.g.dist * 0.8, 5.5, 60);
        else if (name === 'zoomOut') cam.g.dist = clamp(cam.g.dist / 0.8, 5.5, 60);
        else if (name === 'tiltUp') cam.g.el = clamp(cam.g.el + 0.12, 0.3, 1.2);
        else if (name === 'tiltDown') cam.g.el = clamp(cam.g.el - 0.12, 0.3, 1.2);
        else if (name === 'turnLeft') cam.g.az = clamp(cam.g.az + 0.2, 0, 1.5);
        else if (name === 'turnRight') cam.g.az = clamp(cam.g.az - 0.2, 0, 1.5);
        else if (name === 'reset') goView('alle');
        else if (name.indexOf('view:') === 0) goView(name.slice(5));
        made.dirty = true;
      };

      /* ---------- Grösse ---------- */
      function resize() {
        var r = el.getBoundingClientRect(), w = Math.max(60, Math.round(r.width)), h = Math.max(60, Math.round(r.height));
        var dpr = Math.min(window.devicePixelRatio || 1, made.dprCap || 2);
        if (w === made.w && h === made.h && dpr === made.dpr) return;
        made.w = w; made.h = h; made.dpr = dpr; made.aspect = w / h;
        R.resize(w, h, dpr);
        if (userDist == null) { var v = W.views[viewName] || W.views.alle; cam.g.dist = fitDist(v.dist, made.aspect); if (!made.started) cam.dist = cam.g.dist; }
        made.dirty = true;
      }

      /* ---------- Zeichnen ---------- */
      var t0 = performance.now(), tt = 0, last = t0, frames = 0, slow = 0, tmp = new Float32Array(16), ringM = new Float32Array(16);
      var reduced = !!cfg.reduced;
      made.dprCap = 2;
      function env() {
        var day = clamp((Math.cos((hour - 13) / 24 * PI * 2) + 0.35) / 1.35, 0, 1);
        var k = 0.82 + 0.18 * day;
        var L = [-0.45, 0.8, 0.55], l = Math.hypot(L[0], L[1], L[2]);
        return { l: [L[0] / l, L[1] / l, L[2] / l], lc: [0.50 * k, 0.48 * k, 0.43 * (0.9 + 0.1 * day)], sky: [0.62 * k, 0.64 * k, 0.70 * (0.92 + 0.08 * day)], gnd: [0.47 * k, 0.45 * k, 0.43 * k], shadowA: made.shadows === false ? 0 : 0.30, shadowY: 0.02 };
      }
      function lamp(state) { return col[state] || col.alt; }

      function draw(t, still) {
        resize();
        cam.update(made.aspect || 1.33);
        R.begin(cam, env());
        K.drawWorld(W, R, t, hour, belt);
        var i, seat, f;
        for (i = 0; i < W.seats.length; i++) {
          seat = W.seats[i];
          for (var k = 0; k < seat.screens.length; k++) {
            var sm = seat.screens[k];
            if (seat.screenKind === 'code') sm.uvo[1] = ((still ? 0 : t) * 0.06 + (seat.seed % 7) / 7) % 0.5;
            R.draw(sm, null);
          }
          if (seat.sign && seat.used && seat.sign.tex) R.draw(seat.sign, null);
          if (seat.used || seat.spec.boss) seat.fig.draw(R, t, still);
        }
        // Kärtchen und Tafel
        R.draw(W.board.mesh, null);
        W.cards.forEach(function (cd) { if (cd.on) R.draw(cd.mesh, null); });
        // Markierungen und Bildchen
        for (i = 0; i < W.seats.length; i++) {
          seat = W.seats[i]; f = seat.fig;
          var st = seat.spec.boss ? 'du' : seat.state, shape = shapes[st] || shapes.alt;
          if (!seat.spec.boss && !seat.used) continue;
          var bob = still ? 0 : Math.sin(t * 1.8 + i) * 0.05, sc = seat.entId && seat.entId === sel ? 1.45 : 1;
          ST_.reset().t(seat.x, 1.98 + bob, seat.z).ry(still ? 0.6 : t * 1.1 + i).s(sc, sc, sc);
          M.copy(tmp, ST_.m);
          shape.tint = lamp(st);
          R.draw(shape, tmp);
          effects(seat, t, still);
          if (seat.entId && seat.entId === sel) {
            ST_.reset().t(seat.x, 0, seat.z + (seat.h === 0 ? 0.5 : -0.1));
            M.copy(ringM, ST_.m);
            ring.tint = lamp(st); ring.alpha = 0.75 + (still ? 0 : 0.2 * Math.sin(t * 4));
            R.trans(ring, ringM, seat.x, 0, seat.z);
          }
        }
        if (sel) {
          var tp = null;
          if (beltEnt && beltEnt.id === sel) tp = [W.belt.x0 + 2.5, 1.2, W.belt.z];
          else if (boardEnt && boardEnt.id === sel) tp = [-6.3, 1.75, -5.85];
          else cardEnts.forEach(function (cd) { if (cd.ent && cd.ent.id === sel) tp = [-6.85, 1.8, cd.z]; });
          if (tp) R.sprite(fx.spark, tp[0], tp[1], tp[2], 1.5, 1.5, 0.8 + (still ? 0 : 0.2 * Math.sin(t * 4)), true);
        }
        R.end();
        // Beschriftungen
        var pw = made.w, ph = made.h, near = cam.dist < LABEL_DIST, pr = {};
        for (i = 0; i < labels.length; i++) {
          var lb = labels[i], show = near || lb.sel;
          if (show) {
            var q = cam.project(lb.p[0], lb.p[1], lb.p[2], pw, ph, pr);
            if (q && q.x > -60 && q.x < pw + 60 && q.y > -20 && q.y < ph + 40) { lb.el.style.display = ''; lb.el.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px) translate(-50%,-100%)'; lb.el.style.zIndex = String(Math.round(1000 - q.w * 10)); }
            else lb.el.style.display = 'none';
          } else lb.el.style.display = 'none';
        }
      }
      var ST_ = new K.Stack();

      /* Bildchen je Haltung */
      function effects(seat, t, still) {
        var f = seat.fig, pose = seat.pose, s = seat.spec, c = Math.cos(s.h), sn = Math.sin(s.h);
        function wx(lx, lz) { return [seat.x + lx * c + lz * sn, seat.z - lx * sn + lz * c]; }
        var b = wx(0.32, 0.0), ts = still ? 0 : t, bob = still ? 0 : Math.sin(ts * 3 + seat.seed) * 0.03;
        if (pose === 'busy') R.sprite(fx.dots, b[0], 1.72 + bob, b[1], 0.46, 0.46, 1, false);
        else if (pose === 'warn') {
          if (s.boss && bossBlaetter > 0) { if (numShown !== bossBlaetter) { numShown = bossBlaetter; R.retex(numTex, numberBubble(bossBlaetter)); } R.sprite(numTex, b[0], 1.76 + bob, b[1], 0.5, 0.5, 1, false); }
          else R.sprite(fx.q, b[0], 1.72 + bob, b[1], 0.46, 0.46, 1, false);
          var dp = ((ts * 0.5 + seat.seed) % 1), d = wx(-0.22, 0.05);
          R.sprite(fx.drop, d[0], 1.5 - dp * 0.3, d[1], 0.11, 0.11, 1 - dp, false);
        } else if (pose === 'alarm') {
          R.sprite(fx.ex, b[0], 1.76 + bob, b[1], 0.5, 0.5, 1, false);
          R.sprite(fx.glow, seat.x, 1.0, seat.z, 2.6, 2.6, 0.5 + (still ? 0 : 0.5 * Math.abs(Math.sin(ts * 5))), true);
        } else if (pose === 'sleep') {
          for (var z = 0; z < 3; z++) {
            var ph = ((ts * 0.28 + z / 3 + seat.seed * 0.01) % 1), zp = wx(0.22 + ph * 0.18, 0.45 - ph * 0.0);
            R.sprite(fx.z, zp[0], 1.2 + ph * 0.7, zp[1], 0.16 + 0.1 * ph + z * 0.03, 0.16 + 0.1 * ph + z * 0.03, Math.sin(ph * PI) * 0.9, false);
          }
        } else if (pose === 'rest' && f.m.mug) {
          var mp = xf(f.m.mug, 0.287, 0.83, -0.04);
          for (var q = 0; q < 2; q++) {
            var pp = ((ts * 0.35 + q * 0.5 + seat.seed * 0.01) % 1);
            R.sprite(fx.puff, mp[0], mp[1] + pp * 0.25, mp[2], 0.1 + pp * 0.12, 0.1 + pp * 0.12, (1 - pp) * 0.7, false);
          }
        }
      }

      /* ---------- Schleife ---------- */
      var raf = 0, running = false, visible = true, io = null;
      function frame(now) {
        raf = 0;
        if (made.destroyed || R.lost) return;
        var dt = Math.min(0.1, (now - last) / 1000);
        var moving = cam.step(dt);
        var animated = !reduced;
        if (!animated && !moving && !made.dirty) { schedule(); return; }
        if (animated && !moving && !made.dirty && now - last < 30) { schedule(); return; }
        last = now; tt += dt;
        if (now - lastSky > 30000) { lastSky = now; hour = swissHour(); if (Math.abs(hour - skyHour) > 0.17) { skyHour = hour; R.retex(W.sky.tex, T.skyline(hour)); } }
        draw(tt, reduced);
        made.dirty = false; frames++;
        // Leistung beobachten: zu langsam -> schlankere Auflösung, dann ohne Schatten
        if (animated && frames > 40 && frames % 40 === 0) {
          var avg = (now - made.measureT) / 40;
          if (avg > 42) { slow++; if (made.dprCap > 1) { made.dprCap = 1; made.w = 0; } else if (made.shadows !== false) made.shadows = false; }
        }
        if (frames % 40 === 1) made.measureT = now;
        schedule();
      }
      function schedule() { if (!raf && running && visible && !document.hidden && !made.destroyed) raf = requestAnimationFrame(frame); }
      function start() { if (running) return; running = true; last = performance.now(); schedule(); }
      function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      made.start = start; made.stop = stop;
      var onVis = function () { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else { made.dirty = true; schedule(); } };
      document.addEventListener('visibilitychange', onVis);
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(function (es) { visible = es[0] ? es[0].isIntersecting : true; if (visible) { made.dirty = true; schedule(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
        io.observe(el);
      }
      var ro = null;
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { made.dirty = true; schedule(); }); ro.observe(el); }
      R.onlost = function () { stop(); if (cfg.onFail) cfg.onFail('Grafikspeicher verloren'); };

      made.destroy = function () {
        made.destroyed = true; stop();
        document.removeEventListener('visibilitychange', onVis);
        if (io) io.disconnect(); if (ro) ro.disconnect();
        try { R.dispose(); } catch (e) { /* nichts */ }
      };
      // für die Prüfung
      made.debug = {
        screenOf: function (id) {
          var p = null;
          picks.forEach(function (x) { if (x.id === id) p = x; });
          if (!p) return null;
          var c = [(p.mn[0] + p.mx[0]) / 2, (p.mn[1] + p.mx[1]) / 2, (p.mn[2] + p.mx[2]) / 2];
          cam.update(made.aspect || 1.33);
          var r = cam.project(c[0], c[1], c[2], made.w, made.h, {});
          return r ? { x: r.x, y: r.y } : null;
        },
        render: function (t, still) { draw(t == null ? 1.7 : t, !!still); return { draws: R.stats.draws, tris: R.stats.tris }; },
        cam: cam, picks: function () { return picks; }, labels: function () { return labels; }, seats: W.seats, hourSet: function (h) { hour = h; skyHour = h; R.retex(W.sky.tex, T.skyline(h)); }
      };

      skyHour = hour; R.retex(W.sky.tex, T.skyline(hour)); lastSky = performance.now();
      resize();
      goView('alle', true);
      made.started = true;
      made.ok = true;
      made.buildMs = Math.round(performance.now() - tBuild);
      K.Buero.last = made;
      start();
      return made;
    }
  };
})(window.KB3D);
