/* aban news — aban3d.js
 * Selbst-gehostete 3D-Animationen ohne externe Libs. Echte 3D-Projektion auf <canvas>.
 * Formen via data-shape: sphere (Konstellation), torus, helix (DNA), wave (Gitter),
 * galaxy, swarm, bars (Balkendiagramm), line (Liniendiagramm), donut/pie (Anteile),
 * scatter (Punktwolke), globe. bars/line/donut lesen data-values="3,7,5,…".
 * bars färbt automatisch grün (positiv) / rot (negativ), wenn negative Werte vorkommen (oder data-signed="1").
 * scatter liest data-points3="x,y,z;x,y,z;…" (jede Achse wird auf [-1,1] normiert).
 *
 * Einbinden:  <canvas data-aban3d data-shape="torus" width="640" height="420"></canvas>
 *             <script defer src="/js/aban3d.js"></script>
 * Optionen:   data-points  data-color  data-speed  data-shape  data-values (bars/line/donut)
 *             data-signed  data-points3 (scatter)  data-labels="1" (Wert-Labels einblenden)
 *
 * Interaktion: Ziehen zum Drehen (Maus/Touch) mit Schwung; sonst sanfte Auto-Rotation.
 * Bei data-labels="1": Hovern zeigt einen Tooltip mit dem Wert des nächsten Punkts.
 * Performant & rücksichtsvoll: pausiert offscreen + bei verstecktem Tab, devicePixelRatio-aware,
 * respektiert prefers-reduced-motion (zeigt ein ruhiges Standbild statt Animation).
 */
(function () {
  "use strict";
  var reduce = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hexToRgb(h) {
    h = (h || "#d97706").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---- Formen: liefern {pts, edges, tick} ----------------------------------
  function nearestEdges(pts, k) {
    var N = pts.length, edges = [];
    for (var a = 0; a < N; a++) {
      var d = [];
      for (var b = 0; b < N; b++) if (b !== a) {
        var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2];
        d.push([dx * dx + dy * dy + dz * dz, b]);
      }
      d.sort(function (p, q) { return p[0] - q[0]; });
      for (var i = 0; i < k; i++) if (a < d[i][1]) edges.push([a, d[i][1]]);
    }
    return edges;
  }

  function shapeSphere(N) {
    var pts = [];
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963229728653;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    return { pts: pts, edges: nearestEdges(pts, 2), tick: null };
  }

  function shapeTorus(N) {
    var R = 1.0, r = 0.42, ring = Math.max(8, Math.round(Math.sqrt(N) * 1.4)), tube = Math.max(6, Math.round(N / ring));
    var pts = [], idx = {};
    for (var i = 0; i < ring; i++) for (var j = 0; j < tube; j++) {
      var u = i / ring * 6.283, v = j / tube * 6.283;
      idx[i + "_" + j] = pts.length;
      pts.push([(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]);
    }
    var edges = [];
    for (i = 0; i < ring; i++) for (j = 0; j < tube; j++) {
      edges.push([idx[i + "_" + j], idx[((i + 1) % ring) + "_" + j]]);
      edges.push([idx[i + "_" + j], idx[i + "_" + ((j + 1) % tube)]]);
    }
    return { pts: pts, edges: edges, tick: null };
  }

  function shapeHelix(N) {
    var per = Math.max(10, Math.floor(N / 2)), turns = 3, pts = [], edges = [];
    for (var s = 0; s < 2; s++) for (var i = 0; i < per; i++) {
      var t = i / (per - 1), a = t * turns * 6.283 + s * Math.PI;
      pts.push([Math.cos(a) * 0.7, (t * 2 - 1) * 1.15, Math.sin(a) * 0.7]);
    }
    for (i = 0; i < per - 1; i++) {
      edges.push([i, i + 1]); edges.push([per + i, per + i + 1]);
      if (i % 2 === 0) edges.push([i, per + i]); // Sprossen
    }
    return { pts: pts, edges: edges, tick: null };
  }

  function shapeWave(N) {
    var G = Math.max(6, Math.round(Math.sqrt(N))), pts = [], edges = [], idx = {};
    for (var i = 0; i < G; i++) for (var j = 0; j < G; j++) {
      idx[i + "_" + j] = pts.length;
      pts.push([(i / (G - 1) - 0.5) * 2.2, 0, (j / (G - 1) - 0.5) * 2.2]);
    }
    for (i = 0; i < G; i++) for (j = 0; j < G; j++) {
      if (i + 1 < G) edges.push([idx[i + "_" + j], idx[(i + 1) + "_" + j]]);
      if (j + 1 < G) edges.push([idx[i + "_" + j], idx[i + "_" + (j + 1)]]);
    }
    var tick = function (time) {
      for (var p = 0; p < pts.length; p++) {
        var x = pts[p][0], z = pts[p][2];
        pts[p][1] = Math.sin(x * 2.2 + time * 2) * 0.28 + Math.cos(z * 2.2 + time * 1.6) * 0.28;
      }
    };
    return { pts: pts, edges: edges, tick: tick };
  }

  function shapeGalaxy(N) {
    var arms = 3, pts = [];
    for (var i = 0; i < N; i++) {
      var t = i / N, r = Math.sqrt(t) * 1.35, arm = (i % arms) / arms * 6.283;
      var a = r * 4.2 + arm + (Math.random() - 0.5) * 0.5;
      pts.push([Math.cos(a) * r, (Math.random() - 0.5) * 0.14 * (1 - t * 0.6), Math.sin(a) * r]);
    }
    return { pts: pts, edges: [], tick: null }; // reine Partikel
  }

  function shapeSwarm(N) {
    var pts = [];
    for (var i = 0; i < N; i++)
      pts.push([(Math.random() * 2 - 1), (Math.random() * 2 - 1) * 0.95, (Math.random() * 2 - 1)]);
    return { pts: pts, edges: nearestEdges(pts, 2), tick: null };
  }

  function parseVals(ds, def) {
    var v = (ds.values || "").split(",").map(parseFloat).filter(function (x) { return !isNaN(x); });
    return v.length ? v : def;
  }
  var POS = [52, 211, 153], NEG = [248, 113, 113]; // grün / rot
  var PALETTE = [[240,169,58],[56,189,248],[52,211,153],[244,114,182],[167,139,250],[251,146,60],[148,163,184],[251,113,133]];
  function fmtNum(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return (Math.round(v * 100) / 100).toString().replace(".", ",");
  }

  function shapeBars(N, ds) {
    var vals = parseVals(ds, [4, 7, 5, 9, 6, 8, 3, 7]);
    var max = Math.max.apply(null, vals.map(function (v) { return Math.abs(v); })) || 1;
    var hasNeg = vals.some(function (v) { return v < 0; });
    var signed = hasNeg || ds.signed === "1";
    var n = vals.length, pts = [], edges = [], pcol = signed ? [] : null, ecol = signed ? [] : null, labels = [];
    var base = -0.7, w = Math.min(0.16, 1.6 / n / 2.2);
    for (var k = 0; k < n; k++) {
      var x = n === 1 ? 0 : (k / (n - 1) - 0.5) * 1.8, h = vals[k] / max * 1.4, o = pts.length;
      var c = signed ? (vals[k] < 0 ? NEG : POS) : null;
      for (var sx = -1; sx <= 1; sx += 2) for (var sz = -1; sz <= 1; sz += 2) for (var sy = 0; sy <= 1; sy++) {
        pts.push([x + sx * w, base + sy * h, sz * w]); if (signed) pcol.push(c);
      }
      var E = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
      for (var e = 0; e < E.length; e++) { edges.push([o + E[e][0], o + E[e][1]]); if (signed) ecol.push(c); }
      labels.push({ p: [x, base + h + (h >= 0 ? 0.08 : -0.12), 0], t: fmtNum(vals[k]), c: c });
    }
    return { pts: pts, edges: edges, tick: null, pcol: pcol, ecol: ecol, labels: labels };
  }

  function shapeLine(N, ds) {
    var vals = parseVals(ds, [3, 5, 4, 7, 6, 9, 8, 11, 10, 13]);
    var max = Math.max.apply(null, vals.map(function (v) { return Math.abs(v); })) || 1;
    var n = vals.length, pts = [], edges = [], labels = [];
    for (var k = 0; k < n; k++) {
      var x = n === 1 ? 0 : (k / (n - 1) - 0.5) * 1.9, y = vals[k] / max * 1.25;
      pts.push([x, y, 0]);
      if (k > 0) edges.push([k - 1, k]);                 // Linie
      pts.push([x, -0.85, 0]);                            // Fußpunkt (Fläche andeuten)
      edges.push([pts.length - 2, pts.length - 1]);
      labels.push({ p: [x, y + 0.1, 0], t: fmtNum(vals[k]), c: null });
    }
    return { pts: pts, edges: edges, tick: null, labels: labels };
  }

  function shapeDonut(N, ds) {
    var vals = parseVals(ds, [5, 3, 2]).map(function (v) { return Math.abs(v); });
    var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
    var n = vals.length, pts = [], edges = [], pcol = [], ecol = [], labels = [];
    var ri = 0.55, ro = 1.15, ang = -Math.PI / 2;
    for (var k = 0; k < n; k++) {
      var share = vals[k] / total, span = share * 6.283, steps = Math.max(2, Math.round(share * 48));
      var c = PALETTE[k % PALETTE.length];
      for (var s = 0; s <= steps; s++) {
        var a = ang + span * (s / steps);
        pts.push([Math.cos(a) * ri, Math.sin(a) * ri, 0]); pcol.push(c);
        pts.push([Math.cos(a) * ro, Math.sin(a) * ro, 0]); pcol.push(c);
        var bi = pts.length - 2, bo = pts.length - 1;
        if (s > 0) { edges.push([bi - 2, bi]); ecol.push(c); edges.push([bo - 2, bo]); ecol.push(c); }
        edges.push([bi, bo]); ecol.push(c);
      }
      var amid = ang + span / 2, rmid = (ri + ro) / 2;
      labels.push({ p: [Math.cos(amid) * rmid, Math.sin(amid) * rmid, 0], t: Math.round(share * 100) + "%", c: c });
      ang += span;
    }
    return { pts: pts, edges: edges, tick: null, pcol: pcol, ecol: ecol, labels: labels };
  }

  function shapeScatter(N, ds) {
    var raw = (ds.points3 || "").split(";").map(function (s) { return s.split(",").map(parseFloat); })
                 .filter(function (a) { return a.length >= 3 && a.every(function (x) { return !isNaN(x); }); });
    if (!raw.length) { raw = []; for (var i = 0; i < Math.min(N, 90); i++) raw.push([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]); }
    else {
      raw = raw.slice(0, 120);
      for (var d = 0; d < 3; d++) {
        var col = raw.map(function (r) { return r[d]; });
        var mn = Math.min.apply(null, col), rng = (Math.max.apply(null, col) - mn) || 1;
        raw.forEach(function (r) { r[d] = ((r[d] - mn) / rng) * 2 - 1; });
      }
    }
    return { pts: raw.map(function (r) { return [r[0], r[1] * 0.95, r[2]]; }), edges: nearestEdges(raw, 1), tick: null };
  }

  function shapeGlobe(N) {
    var lat = Math.max(5, Math.min(14, Math.round(Math.sqrt(N)))), lon = lat * 2, pts = [], edges = [], idx = {};
    for (var i = 0; i <= lat; i++) for (var j = 0; j < lon; j++) {
      var phi = (i / lat - 0.5) * Math.PI, th = j / lon * 6.283;
      idx[i + "_" + j] = pts.length;
      pts.push([Math.cos(phi) * Math.cos(th) * 1.25, Math.sin(phi) * 1.25, Math.cos(phi) * Math.sin(th) * 1.25]);
    }
    for (i = 0; i <= lat; i++) for (j = 0; j < lon; j++) {
      edges.push([idx[i + "_" + j], idx[i + "_" + ((j + 1) % lon)]]);        // Breitengrad-Ring
      if (i < lat) edges.push([idx[i + "_" + j], idx[(i + 1) + "_" + j]]);   // Längengrad
    }
    return { pts: pts, edges: edges, tick: null };
  }

  var SHAPES = { sphere: shapeSphere, torus: shapeTorus, helix: shapeHelix, wave: shapeWave,
                 galaxy: shapeGalaxy, swarm: shapeSwarm, bars: shapeBars, line: shapeLine,
                 donut: shapeDonut, pie: shapeDonut, scatter: shapeScatter, globe: shapeGlobe };

  function init(cv) {
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var N = Math.max(24, Math.min(320, parseInt(cv.dataset.points || "120", 10) || 120));
    var rgb = hexToRgb(cv.dataset.color);
    var speed = parseFloat(cv.dataset.speed || "1") || 1;
    var make = SHAPES[(cv.dataset.shape || "sphere")] || shapeSphere;
    var S = make(N, cv.dataset), pts = S.pts, edges = S.edges, tick = S.tick;
    var pcol = S.pcol || null, ecol = S.ecol || null, labels = S.labels || null;
    var showLabels = cv.dataset.labels === "1" && labels;
    var colA = function (c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; };
    var col = function (a) { return colA(rgb, a); };

    var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      var rect = cv.getBoundingClientRect();
      W = rect.width || cv.width; H = rect.height || cv.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.40; cx = W / 2; cy = H / 2;
    }
    size();
    window.addEventListener("resize", size, { passive: true });

    // Ziehen zum Drehen (mit Schwung), touch-tauglich
    var dragRotX = 0, dragRotY = 0, vX = 0, vY = 0, dragging = false, lpx = 0, lpy = 0;
    var hx = -1, hy = -1, hover = false; // Mauszeiger im Canvas (für Tooltip)
    cv.style.cursor = "grab"; cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", function (e) {
      dragging = true; lpx = e.clientX; lpy = e.clientY; vX = vY = 0; cv.style.cursor = "grabbing";
      if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    cv.addEventListener("pointermove", function (e) {
      var rect = cv.getBoundingClientRect();
      hx = e.clientX - rect.left; hy = e.clientY - rect.top; hover = true;
      if (!dragging) return;
      var dx = e.clientX - lpx, dy = e.clientY - lpy; lpx = e.clientX; lpy = e.clientY;
      vY = dx * 0.008; vX = dy * 0.008; dragRotY += vY; dragRotX += vX;
    });
    cv.addEventListener("pointerleave", function () { hover = false; });
    function endDrag() { if (dragging) { dragging = false; cv.style.cursor = "grab"; } }
    cv.addEventListener("pointerup", endDrag);
    cv.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);

    function frame(rotX, rotY) {
      ctx.clearRect(0, 0, W, H);
      var sinx = Math.sin(rotX), cosx = Math.cos(rotX), siny = Math.sin(rotY), cosy = Math.cos(rotY);
      function proj(x, y, z) {
        var y1 = y * cosx - z * sinx, z1 = y * sinx + z * cosx;
        var x2 = x * cosy + z1 * siny, z2 = -x * siny + z1 * cosy;
        var persp = 1.7 / (1.7 + z2);
        return [cx + x2 * R * persp, cy + y1 * R * persp, z2, persp];
      }
      var N2 = pts.length, p2 = new Array(N2);
      for (var i = 0; i < N2; i++) p2[i] = proj(pts[i][0], pts[i][1], pts[i][2]);
      ctx.lineWidth = ecol ? 1.6 : 1;
      for (var e2 = 0; e2 < edges.length; e2++) {
        var A = p2[edges[e2][0]], B = p2[edges[e2][1]];
        var depth = (A[2] + B[2]) / 2, ea = 0.05 + 0.18 * (1 - (depth + 1) / 2);
        ctx.strokeStyle = ecol && ecol[e2] ? colA(ecol[e2], ea + 0.25) : col(ea);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      for (var j = 0; j < N2; j++) {
        var P = p2[j], t = (P[2] + 1) / 2, rad = (0.6 + 1.7 * (1 - t)) * P[3];
        ctx.fillStyle = pcol && pcol[j] ? colA(pcol[j], 0.45 + 0.5 * (1 - t)) : col(0.25 + 0.65 * (1 - t));
        ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, 6.283); ctx.fill();
      }
      // Wert-Labels (data-labels="1") — aufrecht, tiefen-abgedunkelt
      if (showLabels) {
        ctx.font = "600 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (var L = 0; L < labels.length; L++) {
          var lp = proj(labels[L].p[0], labels[L].p[1], labels[L].p[2]);
          var lt = (lp[2] + 1) / 2, la = 0.45 + 0.5 * (1 - lt);
          ctx.fillStyle = labels[L].c ? colA(labels[L].c, la) : col(0.5 + 0.45 * (1 - lt));
          ctx.fillText(labels[L].t, lp[0], lp[1]);
        }
      }
      // Tooltip beim Hovern: nächstgelegenes Label zum Zeiger (sofern nicht gezogen)
      if (labels && hover && !dragging) {
        var best = -1, bd = 30 * 30, bp = null;
        for (var m = 0; m < labels.length; m++) {
          var mp = proj(labels[m].p[0], labels[m].p[1], labels[m].p[2]);
          var ddx = mp[0] - hx, ddy = mp[1] - hy, dd = ddx * ddx + ddy * ddy;
          if (dd < bd) { bd = dd; best = m; bp = mp; }
        }
        if (best >= 0) {
          var txt = labels[best].t;
          ctx.font = "600 13px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          var tw = ctx.measureText(txt).width, padx = 9, pady = 6, bw = tw + padx * 2, bh = 24;
          var bx = Math.min(Math.max(bp[0] + 12, 2), W - bw - 2), by = Math.min(Math.max(bp[1] - bh - 6, 2), H - bh - 2);
          ctx.fillStyle = "rgba(15,23,42,0.92)";
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill(); }
          else ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = colA(labels[best].c || rgb, 0.9); ctx.lineWidth = 1.2;
          if (ctx.roundRect) { ctx.stroke(); } else ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = "#f8fafc"; ctx.fillText(txt, bx + padx, by + bh / 2);
          ctx.beginPath(); ctx.arc(bp[0], bp[1], 3.2, 0, 6.283);
          ctx.fillStyle = colA(labels[best].c || rgb, 1); ctx.fill();
        }
      }
    }

    if (reduce) { if (tick) tick(0.6); frame(-0.4, 0.6); return; }

    var running = true, last = 0;
    document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { running = en[0].isIntersecting && !document.hidden; if (running) requestAnimationFrame(loop); }, { threshold: 0.05 }).observe(cv);
    }
    var t = 0;
    function loop(ts) {
      if (!running) return;
      var dt = last ? Math.min(50, ts - last) : 16; last = ts;
      if (!dragging) {                       // Auto-Drehung + Schwung-Nachlauf
        t += dt * 0.0001 * speed;
        dragRotX += vX; dragRotY += vY; vX *= 0.93; vY *= 0.93;
      }
      if (dragRotX > 1.2) dragRotX = 1.2; else if (dragRotX < -1.2) dragRotX = -1.2; // Kippen begrenzen
      if (tick) tick(t * 10);
      frame(0.5 + dragRotX + Math.sin(t) * 0.15, t * 3 + dragRotY);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  window.abanBoot3d = init;

  function boot() {
    var list = document.querySelectorAll("canvas[data-aban3d]");
    for (var i = 0; i < list.length; i++) init(list[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
