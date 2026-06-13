/* aban Charts — winzige, abhängigkeitsfreie SVG-Diagramme (offline).
   window.AbanCharts.{ring,donut,bars,line,spark,gauge} → liefern SVG-Strings (width:100%).
   amber-getönt, responsive (viewBox), druck- und dark-tauglich. */
(function () {
  var PAL = ["#d97706", "#0ea5e9", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#f59e0b", "#ec4899"];
  function num(v) { return isFinite(v) ? v : 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function nf(v) { return num(v).toLocaleString("de-DE", { maximumFractionDigits: 0 }); }
  function svg(vb, inner) { return '<svg viewBox="0 0 ' + vb + '" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg" role="img">' + inner + "</svg>"; }

  function ring(pct, opts) {
    opts = opts || {}; var size = opts.size || 120, stroke = opts.stroke || 14, r = (size - stroke) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    pct = Math.max(0, Math.min(100, num(pct))); var len = pct / 100 * C, color = opts.color || "#10b981";
    var inner = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#ece3d4" stroke-width="' + stroke + '"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + len + " " + (C - len) + '" transform="rotate(-90 ' + cx + " " + cy + ')"/>'
      + '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-size="' + (size * 0.22) + '" font-weight="800" fill="#b45309" font-family="sans-serif">' + Math.round(pct) + '%</text>';
    return svg(size + " " + size, inner);
  }

  function donut(segs, opts) {
    opts = opts || {}; var size = opts.size || 160, stroke = opts.stroke || 24, r = (size - stroke) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    var total = segs.reduce(function (a, s) { return a + num(s.value); }, 0), inner = "";
    inner += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#ece3d4" stroke-width="' + stroke + '"/>';
    if (total > 0) { var off = 0; segs.forEach(function (s, i) { var len = num(s.value) / total * C, color = s.color || PAL[i % PAL.length]; inner += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-dasharray="' + len + " " + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + cx + " " + cy + ')"/>'; off += len; }); }
    if (opts.center != null) inner += '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-size="' + (size * 0.15) + '" font-weight="800" fill="#1f2937" font-family="sans-serif">' + esc(opts.center) + '</text>';
    return svg(size + " " + size, inner);
  }

  function bars(data, opts) {
    opts = opts || {}; var w = opts.width || 340, rowH = opts.rowH || 26, gap = 8, n = data.length, h = Math.max(1, n) * (rowH + gap) + 2, labelW = opts.labelW || 58, valW = opts.valW || 70, bx = labelW + 6, bw = w - bx - valW;
    var max = Math.max.apply(null, data.map(function (d) { return num(d.value); }).concat([1])), inner = "";
    data.forEach(function (d, i) {
      var y = i * (rowH + gap) + 2, len = max > 0 ? num(d.value) / max * bw : 0, color = d.color || "#b45309";
      inner += '<text x="0" y="' + (y + rowH * 0.68) + '" font-size="12" fill="#6b7280" font-family="sans-serif">' + esc(d.label) + '</text>'
        + '<rect x="' + bx + '" y="' + y + '" width="' + bw + '" height="' + rowH + '" rx="5" fill="#f3eee4"/>'
        + '<rect x="' + bx + '" y="' + y + '" width="' + Math.max(2, len) + '" height="' + rowH + '" rx="5" fill="' + color + '"/>'
        + '<text x="' + w + '" y="' + (y + rowH * 0.68) + '" text-anchor="end" font-size="12" font-weight="700" fill="#1f2937" font-family="sans-serif">' + esc(d.disp != null ? d.disp : nf(d.value)) + '</text>';
    });
    return svg(w + " " + h, inner);
  }

  function line(values, opts) {
    opts = opts || {}; var w = opts.width || 340, h = opts.height || 120, pad = 8, n = values.length;
    if (n < 2) return svg(w + " " + h, '<text x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" font-size="12" fill="#9ca3af" font-family="sans-serif">zu wenig Daten</text>');
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values); if (max === min) max = min + 1;
    var sx = function (i) { return pad + i / (n - 1) * (w - 2 * pad); }, sy = function (v) { return h - pad - (num(v) - min) / (max - min) * (h - 2 * pad); };
    var pts = values.map(function (v, i) { return sx(i) + "," + sy(v); }).join(" "), color = opts.color || "#0ea5e9";
    var area = "M" + pad + "," + (h - pad) + " L" + pts.split(" ").join(" L") + " L" + (w - pad) + "," + (h - pad) + " Z";
    return svg(w + " " + h, '<path d="' + area + '" fill="' + color + '" opacity="0.12"/><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
  }

  function spark(values, opts) { opts = opts || {}; return line(values, { width: opts.width || 90, height: opts.height || 28, color: opts.color || "#10b981" }); }

  function gauge(pct, opts) {
    opts = opts || {}; var size = opts.size || 140, r = size / 2 - 12, cx = size / 2, cy = size / 2, w2 = opts.stroke || 14;
    pct = Math.max(0, Math.min(100, num(pct)));
    function pol(deg) { var a = (deg - 180) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function arcP(a0, a1) { var s = pol(a0), e = pol(a1), large = (a1 - a0) > 180 ? 1 : 0; return "M" + s[0] + " " + s[1] + " A" + r + " " + r + " 0 " + large + " 1 " + e[0] + " " + e[1]; }
    var inner = '<path d="' + arcP(0, 180) + '" fill="none" stroke="#ece3d4" stroke-width="' + w2 + '" stroke-linecap="round"/>'
      + '<path d="' + arcP(0, pct / 100 * 180) + '" fill="none" stroke="' + (opts.color || "#d97706") + '" stroke-width="' + w2 + '" stroke-linecap="round"/>'
      + '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="' + (size * 0.2) + '" font-weight="800" fill="#b45309" font-family="sans-serif">' + (opts.label != null ? esc(opts.label) : Math.round(pct) + "%") + '</text>';
    return svg(size + " " + (size * 0.62), inner);
  }

  window.AbanCharts = { ring: ring, donut: donut, bars: bars, line: line, spark: spark, gauge: gauge, palette: PAL };
})();
