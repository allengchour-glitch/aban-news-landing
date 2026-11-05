/* KB3D Modelle: liest die Pakete (window.KB3D_PACK) und macht daraus Netze mit Farbpalette.
   Ein Paket: Box b, Palette pal (r,g,b,leuchtet), Namen n, Gruppen g, Teile p = [gruppe, farbplatz, v0, vn, t0, tn], Daten d (base64):
   Eckpunkte als Int16 (3 je Punkt, über die Box verteilt), danach Dreiecke als Uint16. */
(function (K) {
  'use strict';
  var PACK = window.KB3D_PACK = window.KB3D_PACK || {};
  var MD = {};

  function bytes(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  MD.has = function (id) { return !!PACK[id]; };
  MD.ids = function () { return Object.keys(PACK); };

  /* Baut ein Modell: groups[name] = Netz (mit mesh.pal = true), size, b (Box), names, pal. crease = Knickwinkel in Grad. */
  MD.load = function (R, id, opt) {
    var d = PACK[id];
    if (!d) return null;
    opt = opt || {};
    var cosC = Math.cos((opt.crease == null ? 40 : opt.crease) * Math.PI / 180);
    var u8 = bytes(d.d), V = d.V, T = d.T;
    var buf = u8.buffer;
    var pq = new Int16Array(buf, 0, V * 3), iq = new Uint16Array(buf, V * 6, T * 3);
    var mn = d.b.slice(0, 3), mx = d.b.slice(3, 6), pos = new Float32Array(V * 3), i, c;
    for (i = 0; i < V * 3; i++) { c = i % 3; pos[i] = mn[c] + (pq[i] + 32768) / 65535 * (mx[c] - mn[c]); }

    // je Gruppe die Teile sammeln
    var byGroup = {};
    d.p.forEach(function (p) { var g = d.g[p[0]]; (byGroup[g] = byGroup[g] || []).push(p); });
    var pal = new Float32Array(64);
    d.pal.forEach(function (c4, k) { pal[k * 4] = c4[0]; pal[k * 4 + 1] = c4[1]; pal[k * 4 + 2] = c4[2]; pal[k * 4 + 3] = c4[3]; });
    var out = { id: id, b: { mn: mn, mx: mx }, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], names: d.n || [], pal: pal, groups: {}, tris: T };

    Object.keys(byGroup).forEach(function (g) {
      var list = byGroup[g], corners = 0;
      list.forEach(function (p) { corners += p[5] * 3; });
      var data = new Float32Array(corners * 12), cast = new Float32Array(corners * 3), w = 0, cw = 0;
      list.forEach(function (p) {
        var v0 = p[2], vn = p[3], t0 = p[4], tn = p[5], slot = p[1];
        var fnx = new Float32Array(tn), fny = new Float32Array(tn), fnz = new Float32Array(tn), fa = new Float32Array(tn);
        var cnt = new Uint32Array(vn + 1), t, k, a, b2, c2;
        for (t = 0; t < tn; t++) {
          a = iq[(t0 + t) * 3] - v0; b2 = iq[(t0 + t) * 3 + 1] - v0; c2 = iq[(t0 + t) * 3 + 2] - v0;
          var ax = pos[(v0 + a) * 3], ay = pos[(v0 + a) * 3 + 1], az = pos[(v0 + a) * 3 + 2];
          var ux = pos[(v0 + b2) * 3] - ax, uy = pos[(v0 + b2) * 3 + 1] - ay, uz = pos[(v0 + b2) * 3 + 2] - az;
          var vx = pos[(v0 + c2) * 3] - ax, vy = pos[(v0 + c2) * 3 + 1] - ay, vz = pos[(v0 + c2) * 3 + 2] - az;
          var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          fa[t] = l; fnx[t] = nx / l; fny[t] = ny / l; fnz[t] = nz / l;
          cnt[a]++; cnt[b2]++; cnt[c2]++;
        }
        // Nachbarschaft Punkt -> Dreiecke
        var start = new Uint32Array(vn + 1), s = 0;
        for (k = 0; k < vn; k++) { start[k] = s; s += cnt[k]; }
        start[vn] = s;
        var fill = new Uint32Array(vn), adj = new Uint32Array(s);
        for (t = 0; t < tn; t++) for (k = 0; k < 3; k++) { var vv = iq[(t0 + t) * 3 + k] - v0; adj[start[vv] + fill[vv]++] = t; }
        for (t = 0; t < tn; t++) {
          for (k = 0; k < 3; k++) {
            var vi = iq[(t0 + t) * 3 + k], lv = vi - v0, sx = 0, sy = 0, sz = 0;
            for (var j = start[lv]; j < start[lv + 1]; j++) {
              var f = adj[j];
              if (fnx[f] * fnx[t] + fny[f] * fny[t] + fnz[f] * fnz[t] >= cosC) { sx += fnx[f] * fa[f]; sy += fny[f] * fa[f]; sz += fnz[f] * fa[f]; }
            }
            var ll = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
            data[w] = pos[vi * 3]; data[w + 1] = pos[vi * 3 + 1]; data[w + 2] = pos[vi * 3 + 2];
            data[w + 3] = sx / ll; data[w + 4] = sy / ll; data[w + 5] = sz / ll;
            data[w + 6] = slot / 16; data[w + 7] = 0; data[w + 8] = 0; data[w + 9] = 0;
            data[w + 10] = 0; data[w + 11] = 0;
            w += 12;
            cast[cw] = data[w - 12]; cast[cw + 1] = data[w - 11]; cast[cw + 2] = data[w - 10]; cw += 3;
          }
        }
      });
      var mesh = R.meshRaw(data, corners, cast);
      mesh.pal = true; mesh.palette = pal;
      out.groups[g] = mesh;
      if (opt.keep) { (out.cpu = out.cpu || {})[g] = { data: data, n: corners }; }
    });
    return out;
  };

  /* Backt Gruppen (aus model.cpu) mit festen Matrizen zu einem Netz zusammen. list = [[gruppe, matrix], ...] */
  MD.bake = function (R, model, list) {
    var corners = 0;
    list.forEach(function (it) { corners += model.cpu[it[0]].n; });
    var data = new Float32Array(corners * 12), cast = new Float32Array(corners * 3), w = 0, cw = 0;
    list.forEach(function (it) {
      var src = model.cpu[it[0]], m = it[1], n = src.n, d = src.data;
      for (var i = 0; i < n; i++) {
        var o = i * 12, x = d[o], y = d[o + 1], z = d[o + 2], nx = d[o + 3], ny = d[o + 4], nz = d[o + 5];
        var px = m[0] * x + m[4] * y + m[8] * z + m[12], py = m[1] * x + m[5] * y + m[9] * z + m[13], pz = m[2] * x + m[6] * y + m[10] * z + m[14];
        data[w] = px; data[w + 1] = py; data[w + 2] = pz;
        data[w + 3] = m[0] * nx + m[4] * ny + m[8] * nz; data[w + 4] = m[1] * nx + m[5] * ny + m[9] * nz; data[w + 5] = m[2] * nx + m[6] * ny + m[10] * nz;
        data[w + 6] = d[o + 6]; data[w + 7] = 0; data[w + 8] = 0; data[w + 9] = 0; data[w + 10] = 0; data[w + 11] = 0;
        cast[cw] = px; cast[cw + 1] = py; cast[cw + 2] = pz;
        w += 12; cw += 3;
      }
    });
    var mesh = R.meshRaw(data, corners, cast);
    mesh.pal = true; mesh.palette = model.pal;
    return mesh;
  };

  /* Kopie der Palette mit anderen Farben: over = { 'Name': [r,g,b] } (Namen aus model.names, Teil des Namens genügt). */
  MD.palette = function (model, over) {
    var p = new Float32Array(model.pal);
    if (!over) return p;
    Object.keys(over).forEach(function (key) {
      var c = K.col(over[key]);
      model.names.forEach(function (nm, k) { if (nm.toLowerCase().indexOf(key.toLowerCase()) >= 0) { p[k * 4] = c[0]; p[k * 4 + 1] = c[1]; p[k * 4 + 2] = c[2]; } });
    });
    return p;
  };

  K.model = MD;
})(window.KB3D);
