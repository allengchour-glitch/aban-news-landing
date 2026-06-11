/* aban news — aban3d.js
 * Selbst-gehostete 3D-Animation ohne externe Libs: rotierende "KI-Konstellation"
 * (Punkte auf einer Kugel + nächste-Nachbar-Kanten), echte 3D-Projektion auf <canvas>.
 *
 * Einbinden:  <canvas data-aban3d width="640" height="420"></canvas>
 *             <script defer src="/js/aban3d.js"></script>
 * Optionen (data-Attribute):  data-points="120"  data-color="#d97706"  data-speed="1"
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

  function init(cv) {
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var N = Math.max(24, Math.min(260, parseInt(cv.dataset.points || "120", 10) || 120));
    var rgb = hexToRgb(cv.dataset.color);
    var speed = parseFloat(cv.dataset.speed || "1") || 1;
    var col = function (a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")"; };

    // Punkte gleichmässig auf einer Kugel (Fibonacci-Sphäre)
    var pts = [];
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = i * 2.399963229728653; // goldener Winkel
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    // Kanten: jeder Punkt zu seinen 2 nächsten Nachbarn (einmalig berechnet)
    var edges = [];
    for (var a = 0; a < N; a++) {
      var d = [];
      for (var b = 0; b < N; b++) if (b !== a) {
        var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2];
        d.push([dx * dx + dy * dy + dz * dz, b]);
      }
      d.sort(function (p, q) { return p[0] - q[0]; });
      for (var k = 0; k < 2; k++) if (a < d[k][1]) edges.push([a, d[k][1]]);
    }

    var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      var rect = cv.getBoundingClientRect();
      W = rect.width || cv.width; H = rect.height || cv.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.42; cx = W / 2; cy = H / 2;
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
      var p2 = new Array(N);
      for (var i = 0; i < N; i++) {
        var x = pts[i][0], y = pts[i][1], z = pts[i][2];
        var y1 = y * cosx - z * sinx, z1 = y * sinx + z * cosx;      // X-Achse
        var x2 = x * cosy + z1 * siny, z2 = -x * siny + z1 * cosy;    // Y-Achse
        var persp = 1.6 / (1.6 + z2);                                 // einfache Perspektive
        p2[i] = [cx + x2 * R * persp, cy + y1 * R * persp, z2, persp];
      }
      // Kanten (hinten zuerst, schwächer)
      ctx.lineWidth = 1;
      for (var e2 = 0; e2 < edges.length; e2++) {
        var A = p2[edges[e2][0]], B = p2[edges[e2][1]];
        var depth = (A[2] + B[2]) / 2;
        ctx.strokeStyle = col(0.06 + 0.16 * (1 - (depth + 1) / 2));
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      // Punkte (vorne grösser/heller)
      for (var j = 0; j < N; j++) {
        var P = p2[j], t = (P[2] + 1) / 2; // 0 hinten … 1 vorne
        var rad = (0.6 + 1.7 * (1 - t)) * P[3];
        ctx.fillStyle = col(0.25 + 0.65 * (1 - t));
        ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, 6.283); ctx.fill();
      }
    }

    if (reduce) { frame(-0.5, 0.6); return; } // ruhiges Standbild

    var running = true, last = 0;
    document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { running = en[0].isIntersecting && !document.hidden; if (running) requestAnimationFrame(loop); }, { threshold: 0.05 }).observe(cv);
    }
    function loop(ts) {
      if (!running) return;
      var dt = last ? Math.min(50, ts - last) : 16; last = ts;
      ax += (tx - ax) * 0.06; ay += (ty - ay) * 0.06;
      var t = ts * 0.0001 * speed;
      frame(0.5 + ax + Math.sin(t) * 0.15, t * 3 + ay);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  window.abanBoot3d = init; // einzelne Canvas (neu) initialisieren — fuer interaktive Steuerung

  function boot() {
    var list = document.querySelectorAll("canvas[data-aban3d]");
    for (var i = 0; i < list.length; i++) init(list[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
