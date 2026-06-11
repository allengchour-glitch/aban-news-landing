/* aban news — aban3d.js
 * Selbst-gehostete 3D-Animationen ohne externe Libs. Echte 3D-Projektion auf <canvas>.
 * Mehrere Formen via data-shape: "sphere" (Konstellation), "torus", "helix" (DNA), "wave" (Gitter).
 *
 * Einbinden:  <canvas data-aban3d data-shape="torus" width="640" height="420"></canvas>
 *             <script defer src="/js/aban3d.js"></script>
 * Optionen:   data-points="120"  data-color="#d97706"  data-speed="1"  data-shape="sphere|torus|helix|wave"
 *
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

  function shapeBars(N, ds) {
    var vals = (ds.values || "4,7,5,9,6,8,3,7").split(",").map(parseFloat).filter(function (x) { return !isNaN(x); });
    if (!vals.length) vals = [4, 7, 5, 9, 6, 8, 3, 7];
    var max = Math.max.apply(null, vals.map(function (v) { return Math.abs(v); })) || 1;
    var n = vals.length, pts = [], edges = [], base = -0.7, w = Math.min(0.16, 1.6 / n / 2.2);
    for (var k = 0; k < n; k++) {
      var x = n === 1 ? 0 : (k / (n - 1) - 0.5) * 1.8, h = vals[k] / max * 1.4, o = pts.length;
      // 8 Eckpunkte eines Quaders
      for (var sx = -1; sx <= 1; sx += 2) for (var sz = -1; sz <= 1; sz += 2) for (var sy = 0; sy <= 1; sy++)
        pts.push([x + sx * w, base + sy * h, sz * w]);
      // 12 Kanten
      var E = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
      for (var e = 0; e < E.length; e++) edges.push([o + E[e][0], o + E[e][1]]);
    }
    return { pts: pts, edges: edges, tick: null };
  }

  var SHAPES = { sphere: shapeSphere, torus: shapeTorus, helix: shapeHelix, wave: shapeWave,
                 galaxy: shapeGalaxy, swarm: shapeSwarm, bars: shapeBars };

  function init(cv) {
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var N = Math.max(24, Math.min(320, parseInt(cv.dataset.points || "120", 10) || 120));
    var rgb = hexToRgb(cv.dataset.color);
    var speed = parseFloat(cv.dataset.speed || "1") || 1;
    var make = SHAPES[(cv.dataset.shape || "sphere")] || shapeSphere;
    var S = make(N, cv.dataset), pts = S.pts, edges = S.edges, tick = S.tick;
    var col = function (a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")"; };

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

    var ax = 0, ay = 0, tx = 0, ty = 0;
    cv.addEventListener("pointermove", function (e) {
      var rect = cv.getBoundingClientRect();
      tx = ((e.clientY - rect.top) / H - 0.5) * 0.9;
      ty = ((e.clientX - rect.left) / W - 0.5) * 0.9;
    });
    cv.addEventListener("pointerleave", function () { tx = 0; ty = 0; });

    function frame(rotX, rotY) {
      ctx.clearRect(0, 0, W, H);
      var sinx = Math.sin(rotX), cosx = Math.cos(rotX), siny = Math.sin(rotY), cosy = Math.cos(rotY);
      var N2 = pts.length, p2 = new Array(N2);
      for (var i = 0; i < N2; i++) {
        var x = pts[i][0], y = pts[i][1], z = pts[i][2];
        var y1 = y * cosx - z * sinx, z1 = y * sinx + z * cosx;
        var x2 = x * cosy + z1 * siny, z2 = -x * siny + z1 * cosy;
        var persp = 1.7 / (1.7 + z2);
        p2[i] = [cx + x2 * R * persp, cy + y1 * R * persp, z2, persp];
      }
      ctx.lineWidth = 1;
      for (var e2 = 0; e2 < edges.length; e2++) {
        var A = p2[edges[e2][0]], B = p2[edges[e2][1]];
        var depth = (A[2] + B[2]) / 2;
        ctx.strokeStyle = col(0.05 + 0.18 * (1 - (depth + 1) / 2));
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      for (var j = 0; j < N2; j++) {
        var P = p2[j], t = (P[2] + 1) / 2, rad = (0.6 + 1.7 * (1 - t)) * P[3];
        ctx.fillStyle = col(0.25 + 0.65 * (1 - t));
        ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, 6.283); ctx.fill();
      }
    }

    if (reduce) { if (tick) tick(0.6); frame(-0.4, 0.6); return; }

    var running = true, last = 0;
    document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { running = en[0].isIntersecting && !document.hidden; if (running) requestAnimationFrame(loop); }, { threshold: 0.05 }).observe(cv);
    }
    function loop(ts) {
      if (!running) return;
      last = ts;
      ax += (tx - ax) * 0.06; ay += (ty - ay) * 0.06;
      var t = ts * 0.0001 * speed;
      if (tick) tick(t * 10);
      frame(0.5 + ax + Math.sin(t) * 0.15, t * 3 + ay);
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
