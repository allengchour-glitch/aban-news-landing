/* aban news — stats.js
 * Live-Dashboard loader. Pure vanilla, no external deps.
 *
 * Sources:
 *   /data/dashboard-config.json    -> Sheet-IDs + refresh interval
 *   Google Sheets (published CSV)  -> Live data
 *
 * Caching: localStorage, TTL = refresh_interval_seconds.
 * Fallback: placeholder values if Sheets unreachable or not configured.
 */
(function () {
  "use strict";

  var CONFIG_URL = "/data/dashboard-config.json";
  var FALLBACK_STATS_URL = "/data/stats.json"; // current snapshot (always shipped)
  var CACHE_KEY = "aban_stats_v1";

  // ---------- Utilities ----------

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setText(sel, txt) {
    var el = $(sel);
    if (el) el.textContent = txt;
  }

  function setMetric(name, val) {
    $$("[data-metric=\"" + name + "\"]").forEach(function (el) { el.textContent = val; });
  }

  function fmtNum(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    n = Number(n);
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toLocaleString("de-CH");
  }
  function fmtPct(n) {
    if (n === null || n === undefined || isNaN(n)) return "--";
    n = Number(n);
    if (n > 0 && n <= 1) n = n * 100;
    return n.toFixed(1).replace(".", ",") + " %";
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function fmtRelative(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var diffSec = Math.round((Date.now() - d.getTime()) / 1000);
    if (diffSec < 90) return "gerade eben aktualisiert";
    if (diffSec < 3600) return "vor " + Math.round(diffSec / 60) + " Min aktualisiert";
    if (diffSec < 86400) return "vor " + Math.round(diffSec / 3600) + " Std aktualisiert";
    return "Stand: " + fmtDate(iso);
  }

  // CSV parser — handles quoted fields, escaped quotes, CRLF.
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === "\"") {
          if (text[i + 1] === "\"") { field += "\""; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else {
        if (c === "\"") { inQuotes = true; }
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else { field += c; }
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }

  function csvToObjects(text) {
    var rows = parseCSV(text).filter(function (r) { return r.length > 0 && !(r.length === 1 && r[0] === ""); });
    if (rows.length < 2) return [];
    var headers = rows[0].map(function (h) { return String(h || "").trim().toLowerCase().replace(/\s+/g, "_"); });
    return rows.slice(1).map(function (r) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = (r[i] !== undefined ? String(r[i]).trim() : ""); });
      return obj;
    });
  }

  function sheetCsvUrl(sheetId, sheetName) {
    if (!sheetId || /^__.+__$/.test(sheetId)) return null;
    var n = sheetName ? "&sheet=" + encodeURIComponent(sheetName) : "";
    return "https://docs.google.com/spreadsheets/d/" + sheetId + "/gviz/tq?tqx=out:csv" + n;
  }

  function fetchCsv(url) {
    if (!url) return Promise.resolve(null);
    return fetch(url, { credentials: "omit", cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(csvToObjects)
      .catch(function (e) { console.warn("[stats] fetchCsv failed", url, e); return null; });
  }

  // ---------- Cache ----------

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function saveCache(obj) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  // ---------- SVG chart primitives ----------

  function ns(tag, attrs, text) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text != null) el.textContent = text;
    return el;
  }

  function renderEmpty(container, msg) {
    container.innerHTML = "";
    var svg = ns("svg", { viewBox: "0 0 400 200", preserveAspectRatio: "xMidYMid meet" });
    svg.appendChild(ns("text", { x: 200, y: 105, "text-anchor": "middle", "class": "empty-msg" }, msg));
    container.appendChild(svg);
  }

  function renderLineChart(container, points, opts) {
    container.innerHTML = "";
    opts = opts || {};
    if (!points || points.length === 0) { renderEmpty(container, "Noch keine Daten — kommt bald."); return; }

    var W = 400, H = 200, pad = { l: 36, r: 10, t: 12, b: 24 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var values = points.map(function (p) { return p.y; });
    var minY = Math.min.apply(null, values);
    var maxY = Math.max.apply(null, values);
    if (minY === maxY) { minY = Math.max(0, minY - 1); maxY = maxY + 1; }
    if (opts.startAtZero !== false) minY = Math.min(0, minY);

    var n = points.length;
    function sx(i) { return pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw); }
    function sy(v) { return pad.t + ih - ((v - minY) / (maxY - minY)) * ih; }

    var svg = ns("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none" });

    // gridlines (3 horizontal)
    for (var g = 0; g <= 3; g++) {
      var y = pad.t + (g / 3) * ih;
      svg.appendChild(ns("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, "class": "axis-line" }));
      var yVal = maxY - (g / 3) * (maxY - minY);
      var lbl = opts.yFormat ? opts.yFormat(yVal) : Math.round(yVal);
      svg.appendChild(ns("text", { x: pad.l - 6, y: y + 4, "text-anchor": "end", "class": "axis-label" }, lbl));
    }

    // x-axis (first + last label)
    if (points[0].label) {
      svg.appendChild(ns("text", { x: pad.l, y: H - 6, "text-anchor": "start", "class": "axis-label" }, points[0].label));
    }
    if (points[n - 1].label && n > 1) {
      svg.appendChild(ns("text", { x: W - pad.r, y: H - 6, "text-anchor": "end", "class": "axis-label" }, points[n - 1].label));
    }

    // area
    var d = "M " + sx(0) + " " + sy(points[0].y);
    for (var i = 1; i < n; i++) d += " L " + sx(i) + " " + sy(points[i].y);
    var area = d + " L " + sx(n - 1) + " " + (pad.t + ih) + " L " + sx(0) + " " + (pad.t + ih) + " Z";
    svg.appendChild(ns("path", { d: area, "class": "data-area" }));
    svg.appendChild(ns("path", { d: d, "class": "data-line" }));

    // last dot
    svg.appendChild(ns("circle", { cx: sx(n - 1), cy: sy(points[n - 1].y), r: 3.5, "class": "data-dot" }));

    container.appendChild(svg);
  }

  function renderDonut(container, slices) {
    container.innerHTML = "";
    if (!slices || slices.length === 0) { renderEmpty(container, "Quellen werden gesammelt."); return; }
    var total = slices.reduce(function (a, s) { return a + s.value; }, 0);
    if (total <= 0) { renderEmpty(container, "Noch keine Quellen."); return; }

    var W = 320, H = 220, cx = 110, cy = H / 2, r = 80, ir = 50;
    var svg = ns("svg", { viewBox: "0 0 " + W + " " + H });
    var palette = ["#d97706", "#b45309", "#059669", "#6b7280", "#0891b2", "#7c3aed", "#dc2626"];
    var angle = -Math.PI / 2;
    slices.forEach(function (s, i) {
      var pct = s.value / total;
      var endAngle = angle + pct * Math.PI * 2;
      var large = pct > 0.5 ? 1 : 0;
      var x1 = cx + Math.cos(angle) * r;
      var y1 = cy + Math.sin(angle) * r;
      var x2 = cx + Math.cos(endAngle) * r;
      var y2 = cy + Math.sin(endAngle) * r;
      var x3 = cx + Math.cos(endAngle) * ir;
      var y3 = cy + Math.sin(endAngle) * ir;
      var x4 = cx + Math.cos(angle) * ir;
      var y4 = cy + Math.sin(angle) * ir;
      var d = "M " + x1 + " " + y1 +
              " A " + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2 +
              " L " + x3 + " " + y3 +
              " A " + ir + " " + ir + " 0 " + large + " 0 " + x4 + " " + y4 + " Z";
      svg.appendChild(ns("path", { d: d, fill: palette[i % palette.length], "class": "donut-slice" }));
      angle = endAngle;
    });

    // legend
    var lx = 215, ly = 30;
    slices.forEach(function (s, i) {
      svg.appendChild(ns("rect", { x: lx, y: ly + i * 22 - 9, width: 12, height: 12, rx: 2, fill: palette[i % palette.length] }));
      var pct = Math.round((s.value / total) * 100);
      svg.appendChild(ns("text", { x: lx + 18, y: ly + i * 22 + 1, "class": "donut-label" }, s.label + " (" + pct + "%)"));
    });

    container.appendChild(svg);
  }

  // ---------- Data shaping ----------

  function shapeMetrics(rows) {
    // metrics sheet: key,value (vertical) OR single-row wide.
    if (!rows || rows.length === 0) return null;
    var out = {};
    var first = rows[0];
    if ("key" in first && "value" in first) {
      rows.forEach(function (r) { out[r.key.toLowerCase()] = r.value; });
    } else {
      Object.keys(first).forEach(function (k) { out[k] = first[k]; });
    }
    return out;
  }

  function shapeIssues(rows) {
    if (!rows) return [];
    return rows.slice(0, 10).map(function (r) {
      return {
        date: r.date || r.datum || r.sent_at || "",
        subject: r.subject || r.betreff || r.title || "(ohne Betreff)",
        open: r.open_rate || r.open || "",
        click: r.click_rate || r.click || ""
      };
    });
  }

  function shapeGrowth(rows) {
    if (!rows) return [];
    return rows.map(function (r) {
      return { date: r.date || r.datum, y: Number(r.new_subs || r.subs || r.value || 0), label: shortDate(r.date || r.datum) };
    }).filter(function (p) { return !isNaN(p.y); }).slice(-90);
  }

  function shapeOpenTrend(rows) {
    if (!rows) return [];
    return rows.map(function (r) {
      var v = Number(String(r.open_rate || r.value || 0).replace("%", "").replace(",", "."));
      return { date: r.date, y: v, label: shortDate(r.date) };
    }).filter(function (p) { return !isNaN(p.y); }).slice(-30);
  }

  function shapeChannels(rows) {
    if (!rows) return [];
    return rows.map(function (r) {
      return { label: r.source || r.channel || r.quelle || "?", value: Number(r.subs || r.count || r.value || 0) };
    }).filter(function (s) { return s.value > 0; });
  }

  function shapeSources(rows) {
    if (!rows) return [];
    return rows.slice(0, 10).map(function (r) {
      return { name: r.source || r.url || r.name || "?", count: r.count || r.links || "" };
    });
  }

  function shapeLearnings(rows) {
    var good = [], bad = [], next = [];
    if (!rows) return { good: good, bad: bad, next: next };
    rows.forEach(function (r) {
      var cat = (r.category || r.type || "").toLowerCase();
      var txt = r.text || r.note || r.value || "";
      if (!txt) return;
      if (/good|win|gut/.test(cat)) good.push(txt);
      else if (/bad|fail|nicht/.test(cat)) bad.push(txt);
      else if (/next|plan|woche/.test(cat)) next.push(txt);
    });
    return { good: good.slice(0, 3), bad: bad.slice(0, 3), next: next.slice(0, 3) };
  }

  function shortDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(5);
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
  }

  // ---------- Renderers ----------

  function renderKPIs(metrics) {
    setMetric("subscribers", fmtNum(metrics.subscribers));
    setMetric("issues_sent", fmtNum(metrics.issues_sent));
    setMetric("open_rate", fmtPct(metrics.open_rate));
    setMetric("reply_rate", fmtPct(metrics.reply_rate));

    if (metrics.subscribers_delta_7d !== undefined && metrics.subscribers_delta_7d !== "") {
      var d = Number(metrics.subscribers_delta_7d);
      if (!isNaN(d)) setMetric("subscribers_delta", (d >= 0 ? "+" : "") + d + " in 7 Tagen");
    }
  }

  function renderIssuesTable(issues) {
    var tbody = $("#table-issues tbody");
    if (!tbody) return;
    if (!issues || issues.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"4\" class=\"muted\">Noch keine Issues versendet.</td></tr>";
      return;
    }
    tbody.innerHTML = issues.map(function (i) {
      return "<tr><td>" + escapeHtml(fmtDate(i.date)) + "</td>" +
             "<td>" + escapeHtml(i.subject) + "</td>" +
             "<td>" + escapeHtml(i.open ? (String(i.open).indexOf("%") < 0 ? i.open + "%" : i.open) : "--") + "</td>" +
             "<td>" + escapeHtml(i.click ? (String(i.click).indexOf("%") < 0 ? i.click + "%" : i.click) : "--") + "</td></tr>";
    }).join("");
  }

  function renderSourcesTable(sources) {
    var tbody = $("#table-sources tbody");
    if (!tbody) return;
    if (!sources || sources.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"2\" class=\"muted\">Diese Woche noch keine externen Quellen verlinkt.</td></tr>";
      return;
    }
    tbody.innerHTML = sources.map(function (s) {
      return "<tr><td>" + escapeHtml(s.name) + "</td><td>" + escapeHtml(String(s.count)) + "</td></tr>";
    }).join("");
  }

  function renderReflectionList(id, items) {
    var ul = document.getElementById(id);
    if (!ul) return;
    if (!items || items.length === 0) {
      ul.innerHTML = "<li class=\"muted\">Noch nichts dokumentiert.</li>";
      return;
    }
    ul.innerHTML = items.map(function (t) { return "<li>" + escapeHtml(t) + "</li>"; }).join("");
  }

  function renderFallbackTable(id, rows, cols) {
    var tbody = document.querySelector("#" + id + " tbody");
    if (!tbody) return;
    if (!rows || rows.length === 0) { tbody.innerHTML = ""; return; }
    tbody.innerHTML = rows.map(function (r) {
      return "<tr>" + cols.map(function (c) { return "<td>" + escapeHtml(String(r[c] != null ? r[c] : "")) + "</td>"; }).join("") + "</tr>";
    }).join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---------- Orchestration ----------

  function renderAll(data) {
    renderKPIs(data.metrics || {});
    renderLineChart($("#chart-growth"), data.growth || [], { startAtZero: true });
    renderLineChart($("#chart-open"), data.openTrend || [], { yFormat: function (v) { return Math.round(v) + "%"; } });
    renderDonut($("#chart-channel"), data.channels || []);
    renderIssuesTable(data.issues || []);
    renderSourcesTable(data.sources || []);
    renderReflectionList("refl-good", data.learnings ? data.learnings.good : []);
    renderReflectionList("refl-bad", data.learnings ? data.learnings.bad : []);
    renderReflectionList("refl-next", data.learnings ? data.learnings.next : []);

    renderFallbackTable("table-growth",  (data.growth    || []).map(function (p) { return { date: p.label, y: p.y }; }), ["date", "y"]);
    renderFallbackTable("table-open",    (data.openTrend || []).map(function (p) { return { date: p.label, y: p.y + "%" }; }), ["date", "y"]);
    renderFallbackTable("table-channel", (data.channels  || []).map(function (s) { return { label: s.label, value: s.value }; }), ["label", "value"]);
  }

  function setStatus(text, cls) {
    var line = $("#updatedLine");
    var t = $("#updatedText");
    if (t) t.textContent = text;
    if (line) {
      line.classList.remove("stale", "err");
      if (cls) line.classList.add(cls);
    }
  }

  function bootstrap() {
    // Always show fallback first (instant render from /data/stats.json).
    fetch(FALLBACK_STATS_URL, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (snap) {
        if (snap) {
          renderKPIs({
            subscribers: snap.subscribers,
            issues_sent: snap.issues_sent,
            open_rate: snap.open_rate || null,
            reply_rate: snap.reply_rate || null
          });
          setStatus("Snapshot vom " + fmtDate(snap.updated_iso) + " — versuche Live-Refresh...", "stale");
        }
      })
      .catch(function () { /* ignore */ });

    // Try cache before network.
    var cached = loadCache();
    if (cached && cached.data) {
      renderAll(cached.data);
      setStatus(fmtRelative(cached.updated_iso) + " (Cache)", "stale");
    }

    fetch(CONFIG_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("config " + r.status); return r.json(); })
      .then(function (cfg) {
        var rt = cfg.realtime_sheet_id;
        var ln = cfg.learning_sheet_id;
        var sheets = cfg.sheets || {};

        var jobs = [
          fetchCsv(sheetCsvUrl(rt, sheets.metrics || "metrics")),
          fetchCsv(sheetCsvUrl(rt, sheets.issues  || "issues")),
          fetchCsv(sheetCsvUrl(rt, sheets.growth  || "growth")),
          fetchCsv(sheetCsvUrl(rt, sheets.sources || "sources")),
          fetchCsv(sheetCsvUrl(ln, sheets.learnings || "learnings"))
        ];

        return Promise.all(jobs).then(function (results) {
          var anyData = results.some(function (r) { return r && r.length > 0; });
          if (!anyData) {
            setStatus("Live-Sheets noch nicht konfiguriert — Snapshot wird gezeigt.", "stale");
            return;
          }

          var metrics = shapeMetrics(results[0]) || {};
          var issues = shapeIssues(results[1]);
          var growth = shapeGrowth(results[2]);
          var openTrend = shapeOpenTrend(results[2]); // open-rate often co-located in growth sheet
          var channels = shapeChannels(results[3]);
          var sources = shapeSources(results[3]);
          var learnings = shapeLearnings(results[4]);

          // Fallback: derive open trend from issues if growth sheet has no open column
          if (openTrend.length === 0 && issues.length > 0) {
            openTrend = issues.slice().reverse().map(function (i) {
              var v = Number(String(i.open || "0").replace("%", "").replace(",", "."));
              return { date: i.date, y: v, label: shortDate(i.date) };
            }).filter(function (p) { return !isNaN(p.y) && p.y > 0; });
          }

          var data = {
            metrics: metrics,
            issues: issues,
            growth: growth,
            openTrend: openTrend,
            channels: channels,
            sources: sources,
            learnings: learnings
          };

          renderAll(data);
          var nowIso = new Date().toISOString();
          saveCache({ updated_iso: nowIso, data: data });
          setStatus(fmtRelative(nowIso), null);
        });
      })
      .catch(function (e) {
        console.warn("[stats] live refresh failed:", e);
        if (!cached) setStatus("Stats werden gerade aktualisiert — bitte spaeter erneut laden.", "err");
        else setStatus(fmtRelative(cached.updated_iso) + " (Cache, Live-Refresh fehlgeschlagen)", "err");
      });
  }

  // Auto-refresh
  function scheduleRefresh() {
    fetch(CONFIG_URL, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { refresh_interval_seconds: 300 }; })
      .then(function (cfg) {
        var ms = (Number(cfg.refresh_interval_seconds) || 300) * 1000;
        setInterval(bootstrap, ms);
      })
      .catch(function () { setInterval(bootstrap, 300000); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bootstrap(); scheduleRefresh(); });
  } else {
    bootstrap();
    scheduleRefresh();
  }
})();
