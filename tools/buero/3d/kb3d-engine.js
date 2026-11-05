/* KB3D: kleine WebGL-Engine für das KI-Büro.
   Eigener Code, keine Bibliothek: der Dashboard-Typ lässt nur Dateien des Dashboards als Skript zu.
   Einheiten: Meter. y zeigt nach oben. Farben in sRGB, gerechnet wird ohne Gamma.
   Schatten: Teile werfen einen flach auf den Boden gedrückten Schatten (Stencil gegen doppeltes Abdunkeln). */
(function (root) {
  'use strict';
  var E = {};
  var PI = Math.PI;
  var TAU = PI * 2;

  /* ---------- Matrizen (spaltenweise, wie WebGL) ---------- */
  function ident(m) {
    m = m || new Float32Array(16);
    for (var i = 0; i < 16; i++) m[i] = 0;
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }
  function copy(d, s) { for (var i = 0; i < 16; i++) d[i] = s[i]; return d; }
  function mul(o, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7],
      a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11], a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
    for (var c = 0; c < 16; c += 4) {
      var b0 = b[c], b1 = b[c + 1], b2 = b[c + 2], b3 = b[c + 3];
      o[c] = b0 * a0 + b1 * a4 + b2 * a8 + b3 * a12;
      o[c + 1] = b0 * a1 + b1 * a5 + b2 * a9 + b3 * a13;
      o[c + 2] = b0 * a2 + b1 * a6 + b2 * a10 + b3 * a14;
      o[c + 3] = b0 * a3 + b1 * a7 + b2 * a11 + b3 * a15;
    }
    return o;
  }
  function persp(o, fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    for (var i = 0; i < 16; i++) o[i] = 0;
    o[0] = t / asp; o[5] = t; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf;
    return o;
  }
  function lookAt(o, ex, ey, ez, tx, ty, tz) {
    var fx = tx - ex, fy = ty - ey, fz = tz - ez, l = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    fx /= l; fy /= l; fz /= l;
    var rx = -fz, ry = 0, rz = fx;
    l = Math.sqrt(rx * rx + rz * rz) || 1; rx /= l; rz /= l;
    var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    o[0] = rx; o[1] = ux; o[2] = -fx; o[3] = 0;
    o[4] = ry; o[5] = uy; o[6] = -fy; o[7] = 0;
    o[8] = rz; o[9] = uz; o[10] = -fz; o[11] = 0;
    o[12] = -(rx * ex + ry * ey + rz * ez);
    o[13] = -(ux * ex + uy * ey + uz * ez);
    o[14] = fx * ex + fy * ey + fz * ez;
    o[15] = 1;
    return { r: [rx, ry, rz], u: [ux, uy, uz], f: [fx, fy, fz] };
  }

  /* Matrix-Stapel: verschachtelte Verschiebung, Drehung, Streckung ohne Neuanlage von Feldern. */
  function Stack() {
    this.a = [];
    for (var i = 0; i < 32; i++) this.a.push(ident());
    this.d = 0;
    this.m = this.a[0];
  }
  Stack.prototype.push = function () { copy(this.a[this.d + 1], this.a[this.d]); this.d++; this.m = this.a[this.d]; return this; };
  Stack.prototype.pop = function () { this.d--; this.m = this.a[this.d]; return this; };
  Stack.prototype.reset = function (mat) { this.d = 0; this.m = this.a[0]; if (mat) copy(this.m, mat); else ident(this.m); return this; };
  Stack.prototype.t = function (x, y, z) {
    var m = this.m;
    m[12] += m[0] * x + m[4] * y + m[8] * z;
    m[13] += m[1] * x + m[5] * y + m[9] * z;
    m[14] += m[2] * x + m[6] * y + m[10] * z;
    return this;
  };
  Stack.prototype.s = function (x, y, z) {
    var m = this.m, i;
    for (i = 0; i < 4; i++) { m[i] *= x; m[4 + i] *= y; m[8 + i] *= z; }
    return this;
  };
  Stack.prototype.rx = function (a) {
    var m = this.m, s = Math.sin(a), c = Math.cos(a);
    var a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    m[4] = a10 * c + a20 * s; m[5] = a11 * c + a21 * s; m[6] = a12 * c + a22 * s; m[7] = a13 * c + a23 * s;
    m[8] = a20 * c - a10 * s; m[9] = a21 * c - a11 * s; m[10] = a22 * c - a12 * s; m[11] = a23 * c - a13 * s;
    return this;
  };
  Stack.prototype.ry = function (a) {
    var m = this.m, s = Math.sin(a), c = Math.cos(a);
    var a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    m[0] = a00 * c - a20 * s; m[1] = a01 * c - a21 * s; m[2] = a02 * c - a22 * s; m[3] = a03 * c - a23 * s;
    m[8] = a00 * s + a20 * c; m[9] = a01 * s + a21 * c; m[10] = a02 * s + a22 * c; m[11] = a03 * s + a23 * c;
    return this;
  };
  Stack.prototype.rz = function (a) {
    var m = this.m, s = Math.sin(a), c = Math.cos(a);
    var a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    m[0] = a00 * c + a10 * s; m[1] = a01 * c + a11 * s; m[2] = a02 * c + a12 * s; m[3] = a03 * c + a13 * s;
    m[4] = a10 * c - a00 * s; m[5] = a11 * c - a01 * s; m[6] = a12 * c - a02 * s; m[7] = a13 * c - a03 * s;
    return this;
  };

  /* ---------- Farben ---------- */
  var colCache = {};
  function col(c) {
    if (Array.isArray(c)) return c;
    var r = colCache[c];
    if (r) return r;
    var h = String(c).replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    r = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    colCache[c] = r;
    return r;
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function shade(c, f) { c = col(c); return [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)]; }

  /* ---------- Netzbauer ---------- */
  var FACES = [
    [[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]],
    [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
    [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]]
  ];
  var QUV = [[0, 0], [1, 0], [1, 1], [0, 1]];
  var QIDX = [0, 1, 2, 0, 2, 3];

  function Builder() {
    this.st = new Stack();
    this.a = new Float32Array(12 * 4096);
    this.n = 0;
    this.ca = new Float32Array(3 * 2048);
    this.cn = 0;
    this.col = [1, 1, 1];
    this.emi = 0;
    this.cast = false;
    this.planar = false;
    this.nm = new Float32Array(9);
    this.mn = [1e9, 1e9, 1e9];
    this.mx = [-1e9, -1e9, -1e9];
  }
  Builder.prototype.t = function (x, y, z) { this.st.t(x, y, z); return this; };
  Builder.prototype.s = function (x, y, z) { this.st.s(x, y, z); return this; };
  Builder.prototype.rx = function (a) { this.st.rx(a); return this; };
  Builder.prototype.ry = function (a) { this.st.ry(a); return this; };
  Builder.prototype.rz = function (a) { this.st.rz(a); return this; };
  Builder.prototype.push = function () { this.st.push(); return this; };
  Builder.prototype.pop = function () { this.st.pop(); return this; };
  Builder.prototype._nm = function () {
    var m = this.st.m, q = this.nm;
    var A00 = m[0], A10 = m[1], A20 = m[2], A01 = m[4], A11 = m[5], A21 = m[6], A02 = m[8], A12 = m[9], A22 = m[10];
    var C00 = A11 * A22 - A12 * A21, C01 = A12 * A20 - A10 * A22, C02 = A10 * A21 - A11 * A20,
      C10 = A02 * A21 - A01 * A22, C11 = A00 * A22 - A02 * A20, C12 = A01 * A20 - A00 * A21,
      C20 = A01 * A12 - A02 * A11, C21 = A02 * A10 - A00 * A12, C22 = A00 * A11 - A01 * A10;
    var det = A00 * C00 + A01 * C01 + A02 * C02, s = det < 0 ? -1 : 1;
    q[0] = C00 * s; q[3] = C01 * s; q[6] = C02 * s;
    q[1] = C10 * s; q[4] = C11 * s; q[7] = C12 * s;
    q[2] = C20 * s; q[5] = C21 * s; q[8] = C22 * s;
  };
  Builder.prototype._c = function (c, emi) {
    if (c != null) this.col = col(c);
    this.emi = emi || 0;
    this._nm();
  };
  Builder.prototype._v = function (x, y, z, nx, ny, nz, u, v) {
    var m = this.st.m, q = this.nm, a;
    if ((this.n + 1) * 12 > this.a.length) { a = new Float32Array(this.a.length * 2); a.set(this.a); this.a = a; }
    a = this.a;
    var o = this.n * 12;
    var px = m[0] * x + m[4] * y + m[8] * z + m[12];
    var py = m[1] * x + m[5] * y + m[9] * z + m[13];
    var pz = m[2] * x + m[6] * y + m[10] * z + m[14];
    var tx = q[0] * nx + q[3] * ny + q[6] * nz;
    var ty = q[1] * nx + q[4] * ny + q[7] * nz;
    var tz = q[2] * nx + q[5] * ny + q[8] * nz;
    var l = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    a[o] = px; a[o + 1] = py; a[o + 2] = pz;
    a[o + 3] = tx / l; a[o + 4] = ty / l; a[o + 5] = tz / l;
    a[o + 6] = this.col[0]; a[o + 7] = this.col[1]; a[o + 8] = this.col[2]; a[o + 9] = this.emi;
    a[o + 10] = u; a[o + 11] = v;
    this.n++;
    if (px < this.mn[0]) this.mn[0] = px; if (py < this.mn[1]) this.mn[1] = py; if (pz < this.mn[2]) this.mn[2] = pz;
    if (px > this.mx[0]) this.mx[0] = px; if (py > this.mx[1]) this.mx[1] = py; if (pz > this.mx[2]) this.mx[2] = pz;
    if (this.cast) {
      if ((this.cn + 1) * 3 > this.ca.length) { var b = new Float32Array(this.ca.length * 2); b.set(this.ca); this.ca = b; }
      var k = this.cn * 3;
      this.ca[k] = px; this.ca[k + 1] = py; this.ca[k + 2] = pz;
      this.cn++;
    }
  };

  /* Quader, Mitte (cx,cy,cz), Masse w,h,d. */
  Builder.prototype.box = function (cx, cy, cz, w, h, d, c, emi) {
    this._c(c, emi);
    var hx = w / 2, hy = h / 2, hz = d / 2;
    for (var f = 0; f < 6; f++) {
      var n = FACES[f][0], cs = FACES[f][1];
      for (var t = 0; t < 6; t++) {
        var k = QIDX[t], s = cs[k];
        this._v(cx + s[0] * hx, cy + s[1] * hy, cz + s[2] * hz, n[0], n[1], n[2], QUV[k][0], QUV[k][1]);
      }
    }
    return this;
  };
  /* Quader mit Unterkante bei yb (Mitte unten). */
  Builder.prototype.blk = function (cx, yb, cz, w, h, d, c, emi) { return this.box(cx, yb + h / 2, cz, w, h, d, c, emi); };

  /* Senkrechter Zylinder/Kegelstumpf, Mitte (cx,cy,cz), Höhe h, oben rt, unten rb. */
  Builder.prototype.cyl = function (cx, cy, cz, rt, rb, h, seg, c, emi, nocaps) {
    this._c(c, emi);
    seg = seg || 12;
    var y0 = cy - h / 2, y1 = cy + h / 2, sl = (rb - rt) / (h || 1);
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      var u0 = i / seg, u1 = (i + 1) / seg;
      this._v(cx + c0 * rb, y0, cz + s0 * rb, c0, sl, s0, u0, 0);
      this._v(cx + c1 * rb, y0, cz + s1 * rb, c1, sl, s1, u1, 0);
      this._v(cx + c1 * rt, y1, cz + s1 * rt, c1, sl, s1, u1, 1);
      this._v(cx + c0 * rb, y0, cz + s0 * rb, c0, sl, s0, u0, 0);
      this._v(cx + c1 * rt, y1, cz + s1 * rt, c1, sl, s1, u1, 1);
      this._v(cx + c0 * rt, y1, cz + s0 * rt, c0, sl, s0, u0, 1);
      if (!nocaps) {
        if (rt > 0) {
          this._v(cx, y1, cz, 0, 1, 0, 0.5, 0.5);
          this._v(cx + c0 * rt, y1, cz + s0 * rt, 0, 1, 0, 0.5 + c0 * 0.5, 0.5 + s0 * 0.5);
          this._v(cx + c1 * rt, y1, cz + s1 * rt, 0, 1, 0, 0.5 + c1 * 0.5, 0.5 + s1 * 0.5);
        }
        if (rb > 0) {
          this._v(cx, y0, cz, 0, -1, 0, 0.5, 0.5);
          this._v(cx + c1 * rb, y0, cz + s1 * rb, 0, -1, 0, 0.5 + c1 * 0.5, 0.5 + s1 * 0.5);
          this._v(cx + c0 * rb, y0, cz + s0 * rb, 0, -1, 0, 0.5 + c0 * 0.5, 0.5 + s0 * 0.5);
        }
      }
    }
    return this;
  };
  /* Zylinder mit Unterkante bei yb. */
  Builder.prototype.cylb = function (cx, yb, cz, rt, rb, h, seg, c, emi, nocaps) { return this.cyl(cx, yb + h / 2, cz, rt, rb, h, seg, c, emi, nocaps); };

  /* Kugel/Ellipsoid, Mitte (cx,cy,cz), Radien, Segmente; t0..t1 = Polwinkel (0 = oben, PI = unten).
     u läuft um die Kugel, vorne (+z) liegt bei u = 0.5. */
  Builder.prototype.sph = function (cx, cy, cz, rx, ry, rz, sw, sh, c, emi, t0, t1) {
    this._c(c, emi);
    sw = sw || 12; sh = sh || 8;
    t0 = t0 == null ? 0 : t0; t1 = t1 == null ? PI : t1;
    var self = this;
    function P(i, j) {
      var ph = -PI + TAU * i / sw, th = t0 + (t1 - t0) * j / sh;
      var dx = Math.sin(th) * Math.sin(ph), dy = Math.cos(th), dz = Math.sin(th) * Math.cos(ph);
      var u = i / sw, v = 1 - (t0 + (t1 - t0) * j / sh) / PI;
      if (self.planar) { u = 0.5 + dx * 0.5; v = 0.5 + dy * 0.5; }   // von vorn aufgelegt (Gesicht)
      return [cx + dx * rx, cy + dy * ry, cz + dz * rz, dx / rx, dy / ry, dz / rz, u, v];
    }
    for (var j = 0; j < sh; j++) {
      for (var i = 0; i < sw; i++) {
        var p00 = P(i, j), p10 = P(i + 1, j), p11 = P(i + 1, j + 1), p01 = P(i, j + 1);
        var tri = [p00, p10, p11, p00, p11, p01];
        for (var k = 0; k < 6; k++) {
          var p = tri[k];
          self._v(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]);
        }
      }
    }
    return this;
  };

  /* Ring (Torus) in der xy-Ebene, Mittelradius R, Röhrenradius r, Bogen a0..a1 in Radiant. */
  Builder.prototype.torus = function (cx, cy, cz, R, r, sr, sq, c, emi, a0, a1) {
    this._c(c, emi);
    sr = sr || 16; sq = sq || 6;
    a0 = a0 == null ? 0 : a0; a1 = a1 == null ? TAU : a1;
    var self = this;
    function P(i, j) {
      var a = a0 + (a1 - a0) * i / sr, b = j / sq * TAU;
      var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      var nx = ca * cb, ny = sa * cb, nz = sb;
      return [cx + (R + r * cb) * ca, cy + (R + r * cb) * sa, cz + r * sb, nx, ny, nz, i / sr, j / sq];
    }
    for (var i = 0; i < sr; i++) {
      for (var j = 0; j < sq; j++) {
        var p00 = P(i, j), p10 = P(i + 1, j), p11 = P(i + 1, j + 1), p01 = P(i, j + 1);
        var tri = [p00, p10, p11, p00, p11, p01];
        for (var k = 0; k < 6; k++) { var p = tri[k]; self._v(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]); }
      }
    }
    return this;
  };

  /* Rechteck in der xy-Ebene, Mitte im Ursprung, Blick nach +z; Textur-Ausschnitt u0,v0..u1,v1. */
  Builder.prototype.quad = function (w, h, c, emi, u0, v0, u1, v1) {
    this._c(c, emi);
    u0 = u0 == null ? 0 : u0; v0 = v0 == null ? 0 : v0; u1 = u1 == null ? 1 : u1; v1 = v1 == null ? 1 : v1;
    var xs = [-w / 2, w / 2, w / 2, -w / 2], ys = [-h / 2, -h / 2, h / 2, h / 2];
    var us = [u0, u1, u1, u0], vs = [v0, v0, v1, v1];
    for (var t = 0; t < 6; t++) {
      var k = QIDX[t];
      this._v(xs[k], ys[k], 0, 0, 0, 1, us[k], vs[k]);
    }
    return this;
  };
  /* Rechteck am Boden (Blick nach oben): x0,z0..x1,z1 auf Höhe y; ru, rv = Wiederholungen der Textur. */
  Builder.prototype.floor = function (x0, z0, x1, z1, y, c, emi, ru, rv) {
    this._c(c, emi);
    ru = ru || 1; rv = rv || 1;
    var xs = [x0, x1, x1, x0], zs = [z1, z1, z0, z0], us = [0, ru, ru, 0], vs = [0, 0, rv, rv];
    for (var t = 0; t < 6; t++) {
      var k = QIDX[t];
      this._v(xs[k], y, zs[k], 0, 1, 0, us[k], vs[k]);
    }
    return this;
  };
  /* Flache Vieleck-Fläche (konvex), Punkte [x,z], auf Höhe y, Blick nach oben. */
  Builder.prototype.flat = function (pts, y, c, emi) {
    this._c(c, emi);
    var cx = 0, cz = 0, i;
    for (i = 0; i < pts.length; i++) { cx += pts[i][0]; cz += pts[i][1]; }
    cx /= pts.length; cz /= pts.length;
    for (i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      this._v(cx, y, cz, 0, 1, 0, 0.5, 0.5);
      this._v(a[0], y, a[1], 0, 1, 0, 0, 0);
      this._v(b[0], y, b[1], 0, 1, 0, 1, 0);
    }
    return this;
  };
  /* Flacher Ring am Boden. */
  Builder.prototype.ring = function (cx, y, cz, r0, r1, seg, c, emi) {
    this._c(c, emi);
    seg = seg || 24;
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      this._v(cx + c0 * r0, y, cz + s0 * r0, 0, 1, 0, 0, 0);
      this._v(cx + c0 * r1, y, cz + s0 * r1, 0, 1, 0, 1, 0);
      this._v(cx + c1 * r1, y, cz + s1 * r1, 0, 1, 0, 1, 1);
      this._v(cx + c0 * r0, y, cz + s0 * r0, 0, 1, 0, 0, 0);
      this._v(cx + c1 * r1, y, cz + s1 * r1, 0, 1, 0, 1, 1);
      this._v(cx + c1 * r0, y, cz + s1 * r0, 0, 1, 0, 0, 1);
    }
    return this;
  };

  /* ---------- Kamera ---------- */
  var CAMKEYS = ['tx', 'ty', 'tz', 'az', 'el', 'dist'];
  function Camera() {
    this.tx = 0; this.ty = 0.8; this.tz = 0; this.az = 0.66; this.el = 0.63; this.dist = 30;
    this.g = { tx: 0, ty: 0.8, tz: 0, az: 0.66, el: 0.63, dist: 30 };
    this.fov = 32 * PI / 180;
    this.view = new Float32Array(16); this.proj = new Float32Array(16); this.vp = new Float32Array(16);
    this.eye = [0, 0, 0]; this.basis = null; this.asp = 1;
  }
  Camera.prototype.go = function (o, sofort) {
    for (var i = 0; i < CAMKEYS.length; i++) { var k = CAMKEYS[i]; if (o[k] != null) this.g[k] = o[k]; if (sofort) this[k] = this.g[k]; }
  };
  /* Nähert die Kamera ihrem Ziel an. Gibt true zurück, solange sie sich noch bewegt. */
  Camera.prototype.step = function (dt) {
    var k = 1 - Math.exp(-dt * 8), moved = false;
    for (var i = 0; i < CAMKEYS.length; i++) {
      var n = CAMKEYS[i], d = this.g[n] - this[n];
      var eps = n === 'az' || n === 'el' ? 0.0004 : 0.003;
      if (Math.abs(d) > eps) { this[n] += d * k; moved = true; } else this[n] = this.g[n];
    }
    return moved;
  };
  Camera.prototype.update = function (asp) {
    this.asp = asp;
    var ce = Math.cos(this.el), se = Math.sin(this.el);
    var ex = this.tx + this.dist * Math.sin(this.az) * ce, ey = this.ty + this.dist * se, ez = this.tz + this.dist * Math.cos(this.az) * ce;
    this.eye[0] = ex; this.eye[1] = ey; this.eye[2] = ez;
    this.basis = lookAt(this.view, ex, ey, ez, this.tx, this.ty, this.tz);
    var near = Math.max(0.8, this.dist * 0.12), far = this.dist * 3 + 30;
    persp(this.proj, this.fov, asp, near, far);
    mul(this.vp, this.proj, this.view);
  };
  /* Strahl durch einen Bildpunkt (ndc -1..1). */
  Camera.prototype.ray = function (nx, ny) {
    var b = this.basis, th = Math.tan(this.fov / 2);
    var dx = b.f[0] + b.r[0] * nx * th * this.asp + b.u[0] * ny * th;
    var dy = b.f[1] + b.r[1] * nx * th * this.asp + b.u[1] * ny * th;
    var dz = b.f[2] + b.r[2] * nx * th * this.asp + b.u[2] * ny * th;
    var l = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { o: this.eye, d: [dx / l, dy / l, dz / l] };
  };
  /* Weltpunkt auf Bildpunkte (CSS-Pixel). Gibt null zurück, wenn er hinter der Kamera liegt. */
  Camera.prototype.project = function (x, y, z, w, h, out) {
    var m = this.vp;
    var cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    var cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    var cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.0001) return null;
    out = out || {};
    out.x = (cx / cw * 0.5 + 0.5) * w;
    out.y = (1 - (cy / cw * 0.5 + 0.5)) * h;
    out.w = cw;
    return out;
  };

  /* Strahl gegen achsenparallelen Quader. Gibt den Abstand zurück oder -1. */
  function rayBox(o, d, mn, mx) {
    var t0 = 0, t1 = 1e9;
    for (var i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < mn[i] || o[i] > mx[i]) return -1; continue; }
      var a = (mn[i] - o[i]) / d[i], b = (mx[i] - o[i]) / d[i];
      if (a > b) { var t = a; a = b; b = t; }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
      if (t0 > t1) return -1;
    }
    return t0;
  }

  /* ---------- Shader ---------- */
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aCol; attribute vec2 aUV;',
    'uniform mat4 uVP; uniform mat4 uModel; uniform vec2 uUVS; uniform vec2 uUVO; uniform vec4 uPal[16]; uniform float uPalOn;',
    'varying vec3 vN; varying vec4 vC; varying vec2 vUV; varying float vL;',
    'void main(){ vec4 w = uModel * vec4(aPos, 1.0); vN = mat3(uModel) * aNor; vec4 c = aCol; vL = 0.0; if (uPalOn > 0.5) { c = uPal[int(aCol.r * 16.0 + 0.5)]; vL = aCol.g; } vC = c; vUV = aUV * uUVS + uUVO; gl_Position = uVP * w; }'
  ].join('\n');
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'varying vec3 vN; varying vec4 vC; varying vec2 vUV; varying float vL;',
    'uniform vec3 uL; uniform vec3 uLC; uniform vec3 uSky; uniform vec3 uGnd;',
    'uniform sampler2D uTex; uniform float uUseTex; uniform float uAlpha; uniform float uEmi; uniform vec3 uTint;',
    'void main(){',
    '  vec4 b = vec4(vC.rgb, 1.0);',
    '  if (uUseTex > 0.5) { vec4 t = texture2D(uTex, vUV); b.rgb *= t.rgb; b.a = t.a; }',
    '  b.rgb *= uTint;',
    '  vec3 n = normalize(vN);',
    '  vec3 amb = mix(uGnd, uSky, n.y * 0.5 + 0.5);',
    '  float nd = max(dot(n, uL), 0.0);',
    '  vec3 lit = b.rgb * (amb + uLC * nd) * (1.0 + 0.75 * vL);',
    '  float e = clamp(vC.a + uEmi, 0.0, 1.0);',
    '  gl_FragColor = vec4(mix(lit, b.rgb, e), b.a * uAlpha);',
    '}'
  ].join('\n');
  var SVS = 'attribute vec3 aPos; uniform mat4 uVP; uniform mat4 uSh; uniform mat4 uModel; void main(){ gl_Position = uVP * uSh * uModel * vec4(aPos, 1.0); }';
  var SFS = 'precision mediump float; uniform float uA; void main(){ gl_FragColor = vec4(0.05, 0.06, 0.10, uA); }';

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs, names) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    for (var i = 0; i < names.length; i++) gl.bindAttribLocation(p, i, names[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Programm: ' + gl.getProgramInfoLog(p));
    return p;
  }
  function locs(gl, p, names) {
    var o = {};
    for (var i = 0; i < names.length; i++) o[names[i]] = gl.getUniformLocation(p, names[i]);
    return o;
  }
  function isPOT(n) { return n > 0 && (n & (n - 1)) === 0; }

  /* ---------- Zeichner ---------- */
  var IDENT = ident();
  var WHITE = [1, 1, 1];

  function Renderer(canvas, opt) {
    opt = opt || {};
    var attrs = { alpha: true, antialias: opt.antialias !== false, depth: true, stencil: true, premultipliedAlpha: false, preserveDrawingBuffer: !!opt.preserve, failIfMajorPerformanceCaveat: false };
    var gl = null;
    try { gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs); } catch (e) { gl = null; }
    if (!gl) throw new Error('kein WebGL');
    var self = this;
    this.gl = gl; this.canvas = canvas;
    this.w = 1; this.h = 1; this.dpr = 1;
    this.lost = false;
    this.onlost = null;
    this.stats = { draws: 0, tris: 0 };
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); self.lost = true; if (self.onlost) self.onlost(); }, false);

    this.pm = program(gl, VS, FS, ['aPos', 'aNor', 'aCol', 'aUV']);
    this.um = locs(gl, this.pm, ['uVP', 'uModel', 'uUVS', 'uUVO', 'uL', 'uLC', 'uSky', 'uGnd', 'uTex', 'uUseTex', 'uAlpha', 'uEmi', 'uTint', 'uPalOn']);
    this.um.uPal = gl.getUniformLocation(this.pm, 'uPal[0]');
    this.ps = program(gl, SVS, SFS, ['aPos']);
    this.us = locs(gl, this.ps, ['uVP', 'uSh', 'uModel', 'uA']);
    for (var i = 0; i < 4; i++) gl.enableVertexAttribArray(i);
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    this.tq = [];
    this.sq = [];
    this.pool = [];
    for (i = 0; i < 400; i++) this.pool.push(new Float32Array(16));
    this.pi = 0;
    this.shM = new Float32Array(16);
    this.env = null;
    this.cam = null;

    var B = new Builder();
    B.quad(1, 1, [1, 1, 1], 1);
    this.unit = this.mesh(B);
    this.unit.alpha = 1;
  }
  Renderer.prototype.resize = function (cssW, cssH, dpr) {
    this.w = Math.max(1, Math.floor(cssW)); this.h = Math.max(1, Math.floor(cssH)); this.dpr = dpr || 1;
    var pw = Math.max(1, Math.floor(this.w * this.dpr)), ph = Math.max(1, Math.floor(this.h * this.dpr));
    if (this.canvas.width !== pw) this.canvas.width = pw;
    if (this.canvas.height !== ph) this.canvas.height = ph;
  };
  Renderer.prototype.mesh = function (B) {
    var gl = this.gl;
    var m = { n: B.n, vbo: gl.createBuffer(), cn: B.cn, cvbo: null, tex: null, alpha: 1, emi: 0, tint: null, uvs: [1, 1], uvo: [0, 0], mn: B.mn.slice(), mx: B.mx.slice() };
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, B.a.subarray(0, B.n * 12), gl.STATIC_DRAW);
    if (B.cn > 0) {
      m.cvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, m.cvbo);
      gl.bufferData(gl.ARRAY_BUFFER, B.ca.subarray(0, B.cn * 3), gl.STATIC_DRAW);
    }
    return m;
  };
  /* Netz aus fertigen Eckpunkten (12 Zahlen je Punkt); cast = nur Orte (3 Zahlen je Punkt) für den Schatten. */
  Renderer.prototype.meshRaw = function (data, n, cast) {
    var gl = this.gl;
    var m = { n: n, vbo: gl.createBuffer(), cn: cast ? cast.length / 3 : 0, cvbo: null, tex: null, alpha: 1, emi: 0, tint: null, uvs: [1, 1], uvo: [0, 0], mn: [0, 0, 0], mx: [0, 0, 0] };
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    if (cast && cast.length) {
      m.cvbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, m.cvbo);
      gl.bufferData(gl.ARRAY_BUFFER, cast, gl.STATIC_DRAW);
    }
    return m;
  };
  Renderer.prototype.texture = function (canvas, o) {
    o = o || {};
    var gl = this.gl, t = gl.createTexture();
    var pot = isPOT(canvas.width) && isPOT(canvas.height);
    var mip = o.mip !== false && pot;
    var tex = { t: t, w: canvas.width, h: canvas.height, mip: mip };
    gl.bindTexture(gl.TEXTURE_2D, t);
    this._upload(tex, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var wrap = o.repeat && pot ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (this.aniso && mip) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1));
    return tex;
  };
  Renderer.prototype._upload = function (tex, canvas) {
    var gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    if (tex.mip) gl.generateMipmap(gl.TEXTURE_2D);
  };
  Renderer.prototype.retex = function (tex, canvas) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex.t);
    this._upload(tex, canvas);
  };

  Renderer.prototype.begin = function (cam, env, rect) {
    var gl = this.gl;
    this.cam = cam; this.env = env;
    this.stats.draws = 0; this.stats.tris = 0;
    this.tq.length = 0; this.sq.length = 0; this.pi = 0;
    if (rect) {
      gl.viewport(rect.x, rect.y, rect.w, rect.h);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(rect.x, rect.y, rect.w, rect.h);
    } else {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.depthMask(true);
    gl.colorMask(true, true, true, true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.disable(gl.STENCIL_TEST);
    gl.useProgram(this.pm);
    var u = this.um;
    gl.uniformMatrix4fv(u.uVP, false, cam.vp);
    gl.uniform3fv(u.uL, env.l);
    gl.uniform3fv(u.uLC, env.lc);
    gl.uniform3fv(u.uSky, env.sky);
    gl.uniform3fv(u.uGnd, env.gnd);
    gl.uniform1i(u.uTex, 0);
    // Schattenmatrix: drückt Punkte entlang des Lichts auf die Ebene y = sy
    var L = env.l, sy = env.shadowY || 0.02, k = 1 / L[1], m = this.shM;
    for (var i = 0; i < 16; i++) m[i] = 0;
    m[0] = 1; m[5] = 0; m[10] = 1; m[15] = 1;
    m[4] = -L[0] * k; m[6] = -L[2] * k;
    m[12] = L[0] * k * sy; m[13] = sy; m[14] = L[2] * k * sy;
  };
  Renderer.prototype._bind = function (mesh) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 48, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, 12);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 24);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 48, 40);
  };
  Renderer.prototype._draw = function (mesh, model, alpha, pal) {
    var gl = this.gl, u = this.um;
    gl.uniformMatrix4fv(u.uModel, false, model || IDENT);
    if (mesh.pal) { gl.uniform1f(u.uPalOn, 1); gl.uniform4fv(u.uPal, pal || mesh.palette); } else gl.uniform1f(u.uPalOn, 0);
    if (mesh.tex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mesh.tex.t);
      gl.uniform1f(u.uUseTex, 1);
    } else gl.uniform1f(u.uUseTex, 0);
    gl.uniform2f(u.uUVS, mesh.uvs[0], mesh.uvs[1]);
    gl.uniform2f(u.uUVO, mesh.uvo[0], mesh.uvo[1]);
    gl.uniform1f(u.uAlpha, alpha == null ? mesh.alpha : alpha);
    gl.uniform1f(u.uEmi, mesh.emi);
    gl.uniform3fv(u.uTint, mesh.tint || WHITE);
    this._bind(mesh);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    this.stats.draws++; this.stats.tris += mesh.n / 3;
  };
  /* Undurchsichtig zeichnen. */
  Renderer.prototype.draw = function (mesh, model, pal) { if (mesh && mesh.n) this._draw(mesh, model, null, pal); };
  /* Schatten vormerken (nur Teile mit Schattenwerfer-Puffer). */
  Renderer.prototype.shadow = function (mesh, model) { if (mesh && mesh.cvbo) this.sq.push(mesh, model || IDENT); };
  /* Durchsichtiges Netz vormerken (hinten nach vorn sortiert); x,y,z = Weltpunkt für die Sortierung. */
  Renderer.prototype.trans = function (mesh, model, x, y, z, add) {
    var e = this.cam.eye, dx = x - e[0], dy = y - e[1], dz = z - e[2];
    this.tq.push({ k: 0, mesh: mesh, model: model, d: dx * dx + dy * dy + dz * dz, add: !!add, alpha: null });
  };
  /* Bildtafel (Billboard), die zur Kamera zeigt. */
  Renderer.prototype.sprite = function (tex, x, y, z, w, h, alpha, add) {
    var b = this.cam.basis, m = this.pool[this.pi++ % this.pool.length];
    m[0] = b.r[0] * w; m[1] = b.r[1] * w; m[2] = b.r[2] * w; m[3] = 0;
    m[4] = b.u[0] * h; m[5] = b.u[1] * h; m[6] = b.u[2] * h; m[7] = 0;
    m[8] = -b.f[0]; m[9] = -b.f[1]; m[10] = -b.f[2]; m[11] = 0;
    m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
    var e = this.cam.eye, dx = x - e[0], dy = y - e[1], dz = z - e[2];
    this.tq.push({ k: 1, tex: tex, model: m, d: dx * dx + dy * dy + dz * dz - 0.01, add: !!add, alpha: alpha == null ? 1 : alpha });
  };
  Renderer.prototype.end = function () {
    var gl = this.gl, i, q;
    // Schatten
    if (this.sq.length && this.env.shadowA > 0) {
      gl.useProgram(this.ps);
      gl.uniformMatrix4fv(this.us.uVP, false, this.cam.vp);
      gl.uniformMatrix4fv(this.us.uSh, false, this.shM);
      gl.uniform1f(this.us.uA, this.env.shadowA);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, 0, 255);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(-1, -2);
      for (i = 0; i < this.sq.length; i += 2) {
        var me = this.sq[i];
        gl.uniformMatrix4fv(this.us.uModel, false, this.sq[i + 1]);
        gl.bindBuffer(gl.ARRAY_BUFFER, me.cvbo);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.drawArrays(gl.TRIANGLES, 0, me.cn);
        this.stats.draws++;
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.disable(gl.STENCIL_TEST);
      gl.useProgram(this.pm);
    }
    // Durchsichtiges, hinten nach vorn
    if (this.tq.length) {
      this.tq.sort(function (a, b) { return b.d - a.d; });
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      for (i = 0; i < this.tq.length; i++) {
        q = this.tq[i];
        if (q.add) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
        else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        if (q.k === 0) this._draw(q.mesh, q.model, q.alpha);
        else {
          var un = this.unit;
          un.tex = q.tex; un.emi = 1;
          this._draw(un, q.model, q.alpha);
          un.tex = null; un.emi = 0;
        }
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  };
  Renderer.prototype.dispose = function () {
    var gl = this.gl;
    try { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* nichts */ }
  };

  /* Prüft schnell, ob WebGL überhaupt geht (ohne etwas aufzubauen). */
  E.supported = function () {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      return !!gl;
    } catch (e) { return false; }
  };

  E.M = { ident: ident, copy: copy, mul: mul, persp: persp, lookAt: lookAt };
  E.Stack = Stack;
  E.Builder = Builder;
  E.Camera = Camera;
  E.Renderer = Renderer;
  E.col = col; E.mix = mix; E.shade = shade; E.rayBox = rayBox;
  E.PI = PI; E.TAU = TAU;
  root.KB3D = E;
})(window);
