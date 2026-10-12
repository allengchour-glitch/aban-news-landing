// KI-Bot-Tagebuch: liest die Spielgeld-Logbücher und zeichnet Stand + Verlauf (ki-bot-tagebuch.html).
// Rechenteil ohne DOM, in Node testbar (test_tagebuch.js).
(function (root) {
  "use strict";
  var START = 10000;
  var FARBEN = ["var(--s1)", "var(--s2)", "var(--s3)"];

  // Depot-Verlauf: pro Strategie die Depotwerte aus «eintraege» (ein Eintrag pro Lauf)
  function depotReihen(lb) {
    var out = [];
    Object.keys(lb.strategien || {}).forEach(function (name) {
      var e = (lb.strategien[name].eintraege || []).filter(function (x) { return typeof x.depot === "number"; });
      out.push({ name: name, punkte: e.map(function (x) { return { tag: x.stand, wert: x.depot }; }), letzte: e[e.length - 1] || null });
    });
    return out;
  }
  // Krypto-Pilot und Bitcoin halten (gleicher Startbetrag, ab erstem Tag des Pilot-Logbuchs)
  function pilotReihen(lb) {
    var t = lb.tage || [];
    if (!t.length) return [];
    var k0 = t[0].kapital, b0 = (t[0].maerkte.BTC || {}).kurs;
    var p = { name: "Krypto-Pilot", punkte: t.map(function (x) { return { tag: x.stand, wert: x.kapital / k0 * START }; }) };
    var r = [p];
    if (b0) r.push({ name: "Bitcoin halten", punkte: t.filter(function (x) { return x.maerkte.BTC; }).map(function (x) { return { tag: x.stand, wert: x.maerkte.BTC.kurs / b0 * START }; }) });
    return r;
  }
  // Kennzahlen: Rendite seit Start und schlimmster Einbruch vom Höchststand
  function kennzahlen(punkte) {
    if (!punkte.length) return null;
    var hoch = punkte[0].wert, einbruch = 0;
    punkte.forEach(function (p) { hoch = Math.max(hoch, p.wert); einbruch = Math.min(einbruch, p.wert / hoch - 1); });
    var l = punkte[punkte.length - 1].wert;
    return { wert: l, seitStart: l / START - 1, einbruch: einbruch, tage: punkte.length };
  }

  // ---------- Darstellung ----------
  function chf(x) { return Math.round(x).toLocaleString("de-CH"); }
  function proz(x) { if (Math.abs(x) < 0.0005) return "0,0 %"; return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + " %"; }
  function datum(iso) { var p = iso.split("-"); return +p[2] + "." + +p[1] + "." + p[0]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function tabelle(reihen) {
    var h = '<div class="scroll"><table><thead><tr><th>Strategie</th><th class="z">Stand</th><th class="z">seit Start</th><th class="z">Rückgang</th></tr></thead><tbody>';
    reihen.forEach(function (r) {
      var k = kennzahlen(r.punkte); if (!k) return;
      h += '<tr><td>' + esc(r.name) + '</td><td class="z">' + chf(k.wert) + '</td><td class="z ' + (k.seitStart >= 0 ? "plus" : "minus") + '">' + proz(k.seitStart) + '</td><td class="z">' + proz(k.einbruch) + '</td></tr>';
    });
    return h + "</tbody></table></div>";
  }

  // Linien-Diagramm (eine Achse, Start = 10 000), Fadenkreuz + Tooltip
  function diagramm(el, reihen) {
    var tage = [], seen = {};
    reihen.forEach(function (r) { r.punkte.forEach(function (p) { if (!seen[p.tag]) { seen[p.tag] = 1; tage.push(p.tag); } }); });
    tage.sort();
    if (tage.length < 2) { el.insertAdjacentHTML("beforeend", '<p class="note">Das Diagramm erscheint ab dem zweiten Handelstag.</p>'); return; }
    var W = Math.max(300, Math.round(el.clientWidth || 640)), H = W < 500 ? 220 : 260, L = 52, R = 12, O = 10, U = 26, min = Infinity, max = -Infinity;
    reihen.forEach(function (r) { r.punkte.forEach(function (p) { min = Math.min(min, p.wert); max = Math.max(max, p.wert); }); });
    var pad = Math.max((max - min) * 0.1, 50); min -= pad; max += pad;
    var x = function (t) { return L + (W - L - R) * tage.indexOf(t) / (tage.length - 1); };
    var y = function (v) { return O + (H - O - U) * (1 - (v - min) / (max - min)); };
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Verlauf der Depotwerte">';
    for (var i = 0; i <= 4; i++) {
      var v = min + (max - min) * i / 4, yy = y(v).toFixed(1);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--grid)" stroke-width="1"/>' +
        '<text x="' + (L - 6) + '" y="' + yy + '" dy="4" text-anchor="end" font-size="11" fill="var(--muted)">' + chf(v) + "</text>";
    }
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(START).toFixed(1) + '" y2="' + y(START).toFixed(1) + '" stroke="var(--muted)" stroke-dasharray="3 3" stroke-width="1"/>';
    [tage[0], tage[tage.length - 1]].forEach(function (t, j) {
      s += '<text x="' + x(t) + '" y="' + (H - 6) + '" text-anchor="' + (j ? "end" : "start") + '" font-size="11" fill="var(--muted)">' + datum(t) + "</text>";
    });
    reihen.forEach(function (r, j) {
      var d = r.punkte.map(function (p, i) { return (i ? "L" : "M") + x(p.tag).toFixed(1) + " " + y(p.wert).toFixed(1); }).join(" ");
      s += '<path d="' + d + '" fill="none" stroke="' + FARBEN[j % 3] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    s += '<line class="kreuz" x1="0" x2="0" y1="' + O + '" y2="' + (H - U) + '" stroke="var(--muted)" stroke-width="1" visibility="hidden"/>';
    s += '<rect x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent"/></svg><div class="tip"></div>';
    var box = document.createElement("div"); box.className = "chart"; box.innerHTML = s; el.appendChild(box);
    el.insertAdjacentHTML("beforeend", '<div class="legende">' + reihen.map(function (r, j) { return '<span><i style="background:' + FARBEN[j % 3] + '"></i>' + esc(r.name) + "</span>"; }).join("") + "</div>");
    var svg = box.querySelector("svg"), tip = box.querySelector(".tip"), kreuz = box.querySelector(".kreuz");
    function zeig(ev) {
      var bb = svg.getBoundingClientRect(), px = (ev.clientX - bb.left) / bb.width * W;
      var i = Math.max(0, Math.min(tage.length - 1, Math.round((px - L) / (W - L - R) * (tage.length - 1)))), t = tage[i];
      kreuz.setAttribute("x1", x(t)); kreuz.setAttribute("x2", x(t)); kreuz.setAttribute("visibility", "visible");
      tip.innerHTML = "<b>" + datum(t) + "</b><br>" + reihen.map(function (r, j) {
        var p = r.punkte.filter(function (q) { return q.tag === t; })[0];
        return p ? '<span style="color:' + FARBEN[j % 3] + '">●</span> ' + esc(r.name) + ": " + chf(p.wert) : "";
      }).filter(Boolean).join("<br>");
      tip.style.display = "block";
      var lx = x(t) / W * bb.width; tip.style.left = Math.min(Math.max(0, lx - tip.offsetWidth / 2), bb.width - tip.offsetWidth) + "px"; tip.style.top = "0px";
    }
    svg.addEventListener("pointermove", zeig);
    svg.addEventListener("pointerleave", function () { tip.style.display = "none"; kreuz.setAttribute("visibility", "hidden"); });
  }

  function zeichneDepot(el, lb) {
    var r = depotReihen(lb).filter(function (x) { return x.punkte.length; });
    if (!r.length) { el.innerHTML = '<p class="note">Noch kein Eintrag.</p>'; return; }
    var ki = r.filter(function (x) { return x.name === "KI-Bot"; })[0];
    var h = '<p class="note">Start ' + datum(lb.start) + ' mit je CHF 10 000 Spielgeld · letzter Lauf ' + datum(r[0].letzte.stand) + "</p>" + tabelle(r);
    if (ki && ki.letzte && ki.letzte.positionen) {
      var pos = ki.letzte.positionen, inv = 0;
      Object.keys(pos).forEach(function (m) { inv += pos[m].wert; });
      h += '<p class="urteil">Der KI-Bot hat ' + Math.round(inv / ki.letzte.depot * 100) + " % investiert, der Rest liegt bar. Grösste Positionen: " +
        Object.keys(pos).sort(function (a, b) { return pos[b].wert - pos[a].wert; }).slice(0, 3).map(function (m) { return esc(m) + " CHF " + chf(pos[m].wert); }).join(", ") + ".</p>";
    }
    el.innerHTML = h; diagramm(el, r);
  }
  function zeichnePilot(el, lb) {
    var r = pilotReihen(lb);
    if (!r.length) { el.innerHTML = '<p class="note">Noch kein Eintrag.</p>'; return; }
    var t = lb.tage[lb.tage.length - 1];
    var pos = Object.keys(t.maerkte).map(function (m) { var h = t.maerkte[m].hebel; return m + " " + (h > 0 ? "long " : h < 0 ? "short " : "flach ") + Math.abs(h).toFixed(2).replace(".", ",") + "×"; }).join(" · ");
    el.innerHTML = '<p class="note">Start ' + datum(lb.start) + " · letzter Lauf " + datum(t.stand) + "</p>" + tabelle(r) + '<p class="urteil">Heutige Position: ' + esc(pos) + ". Ohne Stop-Kurse gerechnet, echte Ergebnisse können abweichen.</p>";
    diagramm(el, r);
  }

  var api = { START: START, depotReihen: depotReihen, pilotReihen: pilotReihen, kennzahlen: kennzahlen, zeichneDepot: zeichneDepot, zeichnePilot: zeichnePilot };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.KiBotTagebuch = api;
})(this);
