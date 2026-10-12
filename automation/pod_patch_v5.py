#!/usr/bin/env python3
# Erzeugt pod/lspod-designer-v5.js aus der entminifizierten v4-Fassung.
# Jede Ersetzung muss GENAU einmal vorkommen, sonst bricht der Lauf ab.
import sys

SRC = sys.argv[1]
OUT = sys.argv[2]
s = open(SRC, encoding="utf-8").read()
n_ok = 0


def rep(old, new):
    global s, n_ok
    c = s.count(old)
    if c != 1:
        sys.exit(f"ANKER-FEHLER ({c}x): {old[:90]!r}")
    s = s.replace(old, new)
    n_ok += 1


def rep_between(start, end, new):
    """Ersetzt den Bereich von start (inklusive) bis end (exklusive). Beide Anker genau einmal."""
    global s, n_ok
    a = s.find(start)
    if a < 0 or s.count(start) != 1:
        sys.exit(f"START-ANKER-FEHLER: {start[:90]!r}")
    b = s.find(end, a)
    if b < 0:
        sys.exit(f"END-ANKER-FEHLER: {end[:90]!r}")
    s = s[:a] + new + s[b:]
    n_ok += 1


# ── 1. Helfer auf Modulebene (vor uplFile) ──────────────────────────────────
rep(r"""  function uplFile(file, cb) {""", r"""  // ── v5 (12.10.2026): Profi-Bedienung ─────────────────────────────────────
  // Gleiche Regeln für Vorschau (DOM) und Druckdatei (Canvas): Deckkraft, Schnitt, Zeilen, Ausrichtung.
  function opOf(l) {
    return l.op == null ? 1 : l.op;
  }
  function lhOf(l) {
    return l.lh || 1.05;
  }
  function alignOf(l) {
    return l.align === "left" || l.align === "right" ? l.align : "center";
  }
  function pctOf(v) {
    return Math.round(v * 1000) / 10;
  }
  // Schriftschnitt für Canvas. Ohne Schalter bleibt der Standard der Schrift (wie bisher).
  function canvasFont(l, px) {
    var f = fontByVal(l.font),
      base = f.c.replace("{S}", Math.round(px)),
      m = /^(?:bold |900 )?(\d+)px (.*)$/.exec(base),
      fam = m ? m[2] : "Arial,sans-serif",
      pre = (/^(bold |900 )/.exec(base) || [""])[0],
      w = l.bold === false ? "" : l.bold === true ? pre || "bold " : pre;
    return (l.italic ? "italic " : "") + w + Math.round(px) + "px " + fam;
  }
  function uplFile(file, cb) {""")

# ── 2. Verlauf, Ebenen, Zahlenfelder (vor dem Aufbau der Oberfläche) ─────────
rep(r"""    container.innerHTML = "";""", r"""    // ── v5: Verlauf (Rückgängig/Wiederholen), Ebenen-Liste, Zahlenfelder ──
    function cloneLayers() {
      var o = {};
      for (var k in state.layers)
        o[k] = state.layers[k].map(function (l) {
          var c = {};
          for (var p in l) c[p] = l[p];
          if (l.edit) {
            c.edit = {};
            for (var q in l.edit) c.edit[q] = l.edit[q];
          }
          return c;
        });
      return o;
    }
    // Vergleich ohne die großen Bilddaten: Länge + Ende genügen, um Änderungen zu erkennen.
    function layersSig(o) {
      return JSON.stringify(o, function (k, v) {
        return (k === "src" || k === "origSrc" || k === "printUrl") && typeof v === "string"
          ? v.length + ":" + v.slice(-24)
          : v;
      });
    }
    var hist = { stack: [], idx: -1 };
    function histBtns() {
      if (!btnUndo) return;
      btnUndo.style.opacity = hist.idx > 0 ? "1" : "0.4";
      btnRedo.style.opacity = hist.idx < hist.stack.length - 1 ? "1" : "0.4";
    }
    // Nach jeder abgeschlossenen Änderung aufrufen. Gleicher Zustand = kein neuer Schritt.
    function histCommit() {
      var snap = cloneLayers();
      if (hist.idx >= 0 && layersSig(hist.stack[hist.idx]) === layersSig(snap)) return;
      hist.stack = hist.stack.slice(0, hist.idx + 1);
      hist.stack.push(snap);
      if (hist.stack.length > 60) hist.stack.shift();
      hist.idx = hist.stack.length - 1;
      histBtns();
    }
    function histRestore(snap) {
      state.layers = {};
      for (var k in snap)
        state.layers[k] = snap[k].map(function (l) {
          var c = {};
          for (var p in l) c[p] = l[p];
          if (l.edit) {
            c.edit = {};
            for (var q in l.edit) c.edit[q] = l.edit[q];
          }
          c.uploading = false;
          return c;
        });
      var keep = state.sel;
      clearStage();
      deselect();
      curLayers().forEach(function (l) {
        makeNode(l);
        layoutNode(l);
      });
      relayer();
      if (keep && findLayer(keep)) select(keep);
      syncFormInputs();
      histBtns();
    }
    function histUndo() {
      if (hist.idx > 0) {
        hist.idx--;
        histRestore(hist.stack[hist.idx]);
      }
    }
    function histRedo() {
      if (hist.idx < hist.stack.length - 1) {
        hist.idx++;
        histRestore(hist.stack[hist.idx]);
      }
    }
    // Z-Reihenfolge = Reihenfolge im Array (oben = zuletzt). Knoten im DOM ebenso sortieren.
    function relayer() {
      curLayers().forEach(function (l, i) {
        var n = nodes[l.id];
        if (n) {
          n.root.style.zIndex = String(2 + i);
          stage.appendChild(n.root);
        }
      });
    }
    function shiftLayer(dir) {
      var a = curLayers(),
        i = -1;
      for (var j = 0; j < a.length; j++)
        if (a[j].id === state.sel) {
          i = j;
          break;
        }
      var t = i + dir;
      if (i < 0 || t < 0 || t >= a.length) return;
      var tmp = a[i];
      a[i] = a[t];
      a[t] = tmp;
      relayer();
      syncFormInputs();
      histCommit();
    }
    // Ebenen-Liste: oben = zuletzt angelegt. Klick wählt die Ebene.
    function layerChipsRender() {
      if (!layerChips) return;
      layerChips.innerHTML = "";
      var arr = curLayers();
      if (!arr.length) {
        var none = el("span", { style: "font-size:12px;color:#8a8a90;align-self:center;white-space:nowrap;" });
        none.textContent = EN ? "No layers yet" : "Noch keine Ebenen";
        layerChips.appendChild(none);
        return;
      }
      for (var i = arr.length - 1; i >= 0; i--)
        (function (l) {
          var name =
            l.type === "text"
              ? T.layerText + ": " + ((l.text || "").split("\n")[0].slice(0, 12) || "…")
              : l.type === "sticker"
                ? T.layerSticker
                : T.layerImage;
          var on = l.id === state.sel;
          var b = el("button", {
            type: "button",
            style:
              "flex:none;padding:6px 10px;border-radius:999px;border:1px solid " +
              (on ? "#16151a" : "#ddd") +
              ";background:" +
              (on ? "#16151a" : "#fff") +
              ";color:" +
              (on ? "#fff" : "#16151a") +
              ";font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;",
          });
          b.textContent = name;
          b.addEventListener("click", function () {
            select(l.id);
          });
          layerChips.appendChild(b);
        })(arr[i]);
    }
    // Zahlenfelder und Regler an das gewählte Element angleichen.
    function refreshAll(ly) {
      if (!ly) return;
      pX.value = pctOf(ly.cx);
      pY.value = pctOf(ly.cy);
      pS.value = Math.round(ly.scale * 1000) / 10;
      pR.value = Math.round(ly.rot * 10) / 10;
      pO.value = Math.round(opOf(ly) * 100);
      ctxSize.value = ly.scale;
      ctxRot.value = Math.round(ly.rot) || 0;
      rotLbl.textContent = (Math.round(ly.rot) || 0) + "°";
      if (ly.type === "text") {
        ctxLs.value = ly.ls || 0;
        ctxOutl.value = ly.outl || 0;
        ctxOutC.value = ly.outc || "#ffffff";
        ctxLh.value = lhOf(ly);
        setActive(stB, ly.bold !== false);
        setActive(stI, !!ly.italic);
        setActive(stL, alignOf(ly) === "left");
        setActive(stC, alignOf(ly) === "center");
        setActive(stR, alignOf(ly) === "right");
      }
    }
    // Zahlen → Element. Während des Tippens nie die Felder zurückschreiben (sonst bricht «0,» ab).
    function precApply() {
      var ly = findLayer(state.sel);
      if (!ly) return;
      var v;
      function num(inp, lo, hi) {
        var n = parseFloat(inp.value);
        return isNaN(n) ? null : Math.max(lo, Math.min(hi, n));
      }
      if ((v = num(pX, 0, 100)) !== null) ly.cx = v / 100;
      if ((v = num(pY, 0, 100)) !== null) ly.cy = v / 100;
      if ((v = num(pS, 6, 300)) !== null) ly.scale = v / 100;
      if ((v = num(pR, -180, 180)) !== null) ly.rot = v;
      if ((v = num(pO, 0, 100)) !== null) ly.op = v / 100;
      layoutNode(ly);
      checkRes(ly);
      syncFormInputs();
    }
    function readoutShow(ly) {
      readout.textContent =
        "X " + pctOf(ly.cx) + " % · Y " + pctOf(ly.cy) + " % · " +
        Math.round(ly.scale * 100) + " % · " + Math.round(ly.rot) + "°";
      readout.style.display = "block";
    }
    container.innerHTML = "";""")

# ── 3. Oberfläche: Verlauf + Ebenen unter den Hinzufügen-Knöpfen ────────────
rep(r"""      body.appendChild(tools));""", r"""      body.appendChild(tools));
    var HBTN =
      "flex:1;padding:9px 6px;border-radius:9px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:700;font-size:13px;cursor:pointer;";
    var histBar = el("div", { style: "display:flex;gap:8px;margin-bottom:8px;" }),
      btnUndo = el(
        "button",
        { type: "button", title: EN ? "Undo (Ctrl+Z)" : "R\xFCckg\xE4ngig (Strg+Z)", style: HBTN },
        EN ? "↶ Undo" : "↶ R\xFCckg\xE4ngig",
      ),
      btnRedo = el(
        "button",
        { type: "button", title: EN ? "Redo (Ctrl+Y)" : "Wiederholen (Strg+Y)", style: HBTN },
        EN ? "↷ Redo" : "↷ Wiederholen",
      );
    (histBar.appendChild(btnUndo), histBar.appendChild(btnRedo), body.appendChild(histBar));
    var layerBar = el("div", { style: "display:flex;gap:6px;align-items:center;margin-bottom:10px;" }),
      layerChips = el("div", { style: "display:flex;gap:6px;overflow-x:auto;flex:1;min-width:0;padding:2px 0;" }),
      btnLUp = el(
        "button",
        { type: "button", title: EN ? "Move up" : "Nach oben", style: "flex:none;padding:6px 10px;border-radius:8px;border:1px solid #ddd;background:#fff;font-weight:800;cursor:pointer;" },
        "▲",
      ),
      btnLDown = el(
        "button",
        { type: "button", title: EN ? "Move down" : "Nach unten", style: "flex:none;padding:6px 10px;border-radius:8px;border:1px solid #ddd;background:#fff;font-weight:800;cursor:pointer;" },
        "▼",
      );
    (layerBar.appendChild(
      el("span", { style: "font-size:12px;font-weight:800;color:#8a8a90;white-space:nowrap;" }, EN ? "Layers" : "Ebenen"),
    ),
      layerBar.appendChild(layerChips),
      layerBar.appendChild(btnLUp),
      layerBar.appendChild(btnLDown),
      body.appendChild(layerBar));""")

# ── 4. Textstil-Zeile im Textfeld + Zahlenfelder unter dem Textfeld ─────────
rep(r"""      body.appendChild(ctx));""", r"""      body.appendChild(ctx));
    var ctxStyle = el("div", { style: "display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;" }),
      SBTN =
        "min-width:44px;padding:8px 10px;border-radius:9px;border:1px solid #ddd;background:#fff;color:#16151a;font-weight:800;font-size:14px;cursor:pointer;",
      stB = el("button", { type: "button", title: EN ? "Bold" : "Fett", style: SBTN }, "B"),
      stI = el("button", { type: "button", title: EN ? "Italic" : "Kursiv", style: SBTN + "font-style:italic;" }, "I"),
      stL = el("button", { type: "button", title: EN ? "Align left" : "Linksb\xFCndig", style: SBTN }, EN ? "Left" : "Links"),
      stC = el("button", { type: "button", title: EN ? "Center" : "Zentriert", style: SBTN }, EN ? "Center" : "Mitte"),
      stR = el("button", { type: "button", title: EN ? "Align right" : "Rechtsb\xFCndig", style: SBTN }, EN ? "Right" : "Rechts");
    (ctxStyle.appendChild(stB),
      ctxStyle.appendChild(stI),
      ctxStyle.appendChild(stL),
      ctxStyle.appendChild(stC),
      ctxStyle.appendChild(stR),
      ctx.insertBefore(ctxStyle, ctxCw));
    var precBar = el("div", {
        style:
          "display:none;background:#faf8f5;border:1px solid #ece7df;border-radius:12px;padding:9px 12px;margin-bottom:10px;",
      }),
      precGrid = el("div", {
        style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:6px;",
      });
    precBar.appendChild(
      el(
        "div",
        { style: "font-size:12px;font-weight:800;color:#8a8a90;margin-bottom:6px;" },
        EN ? "Exact values" : "Genaue Werte",
      ),
    );
    function precField(lab, min, max, step) {
      var lb = el("label", {
          style: "display:flex;flex-direction:column;font-size:11px;font-weight:700;color:#16151a;gap:3px;min-width:0;",
        }),
        inp = el("input", {
          type: "number",
          min: "" + min,
          max: "" + max,
          step: "" + step,
          style:
            "width:100%;box-sizing:border-box;min-width:0;padding:7px 5px;border:1px solid #ddd;border-radius:8px;font-size:14px;",
        });
      (lb.appendChild(el("span", null, lab)), lb.appendChild(inp), precGrid.appendChild(lb));
      return inp;
    }
    var pX = precField("X %", 0, 100, 0.5),
      pY = precField("Y %", 0, 100, 0.5),
      pS = precField(EN ? "Size %" : "Gr\xF6sse %", 6, 300, 1),
      pR = precField(EN ? "Turn \xB0" : "Drehung \xB0", -180, 180, 1),
      pO = precField(EN ? "Opacity %" : "Deckkraft %", 0, 100, 1);
    var precBtns = el("div", { style: "display:flex;gap:6px;margin-top:8px;" }),
      btnCX = el("button", { type: "button", style: HBTN }, EN ? "⇔ Centre horizontally" : "⇔ Mitte horizontal"),
      btnCY = el("button", { type: "button", style: HBTN }, EN ? "⇕ Centre vertically" : "⇕ Mitte vertikal");
    (precBtns.appendChild(btnCX),
      precBtns.appendChild(btnCY),
      precBar.appendChild(precGrid),
      precBar.appendChild(precBtns),
      body.appendChild(precBar));""")

# ── 5. Textfeld mehrzeilig (ein Zeilenumbruch = neue Zeile, max. 4 Zeilen) ──
rep(r"""      ctxIn = el("input", {
        type: "text",
        maxlength: "40",
        placeholder: T.ph,
        style:
          "width:100%;box-sizing:border-box;padding:10px;border:1px solid #ddd;border-radius:9px;font-size:15px;margin-bottom:8px;",
      }),""", r"""      ctxIn = el("textarea", {
        rows: "2",
        maxlength: "160",
        placeholder: T.ph,
        style:
          "width:100%;box-sizing:border-box;padding:10px;border:1px solid #ddd;border-radius:9px;font-size:15px;margin-bottom:8px;resize:vertical;font-family:inherit;line-height:1.3;",
      }),""")

# ── 6. Zeilenabstand-Regler in der Abstand-Leiste ───────────────────────────
rep(r"""    (textBar.appendChild(ctxOutC), body.appendChild(textBar));""", r"""    var ctxLh = el("input", {
      type: "range",
      min: "0.9",
      max: "2",
      step: "0.05",
      style: "flex:1;accent-color:#c1922f;min-width:90px;",
    });
    (textBar.appendChild(ctxOutC),
      textBar.appendChild(
        el(
          "span",
          { style: "font-size:13px;font-weight:700;color:#16151a;white-space:nowrap;" },
          EN ? "Lines" : "Zeilen",
        ),
      ),
      textBar.appendChild(ctxLh),
      body.appendChild(textBar));""")

# ── 7. Vorschau-Knoten: Deckkraft, Schnitt, Zeilenabstand; Z-Reihenfolge nicht mehr erzwungen ─
rep(r"""            (n.content.style.opacity = layer.text ? "1" : "0.45"),""",
    r"""            (n.content.style.opacity = (layer.text ? 1 : 0.45) * opOf(layer)),""")
rep(r"""            (n.content.style.paintOrder = "stroke fill"));
        } else
          ((n.content.style.width = layer.scale * sp.w * 0.5 + "px"),
            (n.content.style.height = "auto"));""", r"""            (n.content.style.paintOrder = "stroke fill"),
            (n.content.style.fontWeight = layer.bold === false ? "400" : "800"),
            (n.content.style.fontStyle = layer.italic ? "italic" : "normal"),
            (n.content.style.lineHeight = String(lhOf(layer))),
            (n.content.style.textAlign = alignOf(layer)));
        } else
          ((n.content.style.width = layer.scale * sp.w * 0.5 + "px"),
            (n.content.style.height = "auto"),
            (n.content.style.opacity = opOf(layer)));""")

rep(r"""          (nodes[k].del.style.display = on ? "block" : "none"),
          (nodes[k].root.style.zIndex = on ? "5" : "1"));""", r"""          (nodes[k].del.style.display = on ? "block" : "none"));""")

rep(r"""        syncFormInputs());
    }
    function deselect() {""", r"""        (precBar.style.display = ly ? "block" : "none"),
        refreshAll(ly),
        syncFormInputs());
    }
    function deselect() {""")

rep(r"""        (resWarn.style.display = "none"));
    }
    function paintCtxSwatch(val) {""", r"""        (resWarn.style.display = "none"),
        (precBar.style.display = "none"));
    }
    function paintCtxSwatch(val) {""")

# ── 8. Ebenen-Ketten: Verlauf an jeder Änderung ──────────────────────────────
rep(r"""          layer.src = url;
          var n = nodes[layer.id];
          if (""", r"""          layer.src = url;
          histCommit();
          var n = nodes[layer.id];
          if (""")

rep(r"""    function addLayer(layer) {
      (curLayers().push(layer),
        makeNode(layer),
        layoutNode(layer),
        select(layer.id));
    }""", r"""    function addLayer(layer) {
      (curLayers().push(layer),
        makeNode(layer),
        layoutNode(layer),
        select(layer.id),
        relayer(),
        histCommit());
    }""")

rep(r"""        state.sel === id && deselect(),
        syncFormInputs());""", r"""        state.sel === id && deselect(),
        syncFormInputs(),
        histCommit());""")

rep(r"""            select(c.id));
        }""", r"""            select(c.id)),
            relayer(),
            histCommit();
        }""")

rep(r"""        (toFront
          ? (a.push(ly), root && stage.appendChild(root))
          : (a.unshift(ly), root && stage.insertBefore(root, stage.firstChild)),
          syncFormInputs());""", r"""        (toFront ? a.push(ly) : a.unshift(ly),
          relayer(),
          histCommit(),
          syncFormInputs());""")

rep(r"""          (makeNode(l), layoutNode(l));
        }),
          syncFormInputs());""", r"""          (makeNode(l), layoutNode(l));
        }),
          relayer(),
          syncFormInputs());""")

rep(r"""                ? T.layerText + ': "' + (l.text || "") + '"'""",
    r"""                ? T.layerText + ': "' + (l.text || "").replace(/\n/g, " / ") + '"'""")

rep(r"""    function syncFormInputs() {
      var form = findForm();""", r"""    function syncFormInputs() {
      layerChipsRender();
      var form = findForm();""")

# ── 9. Textfeld-Handler: Zeilen begrenzen, Verlauf verzögert ─────────────────
rep(r"""      ctxIn.addEventListener("input", function () {
        var ly = findLayer(state.sel);
        ly &&
          ly.type === "text" &&
          ((ly.text = ctxIn.value), layoutNode(ly), syncFormInputs());
      }),""", r"""      ctxIn.addEventListener("input", function () {
        var ly = findLayer(state.sel);
        if (!ly || ly.type !== "text") return;
        ly.text = ctxIn.value
          .split("\n")
          .slice(0, 4)
          .map(function (t) {
            return t.slice(0, 40);
          })
          .join("\n");
        if (ctxIn.value !== ly.text) ctxIn.value = ly.text;
        layoutNode(ly);
        syncFormInputs();
        commitSoon();
      }),""")

# ── 10. Gesten: Hilfslinien, Anzeige, Verlauf; Fokus für Tastatur ────────────
rep(r"""        (e.preventDefault(), e.stopPropagation(), select(layer.id));""", r"""        (e.preventDefault(), e.stopPropagation(), select(layer.id));
        try {
          wrap.focus({ preventScroll: true });
        } catch (_) {}""")

rep(r"""          layoutNode(layer);
        }
      }
      function onUp(e) {
        (delete ptrs[e.pointerId], (start = null));""", r"""          if (start && start.mode === "drag") {
            guideV.style.display = Math.abs(layer.cx - 0.5) < 0.008 ? "block" : "none";
            guideH.style.display = Math.abs(layer.cy - 0.5) < 0.008 ? "block" : "none";
            if (guideV.style.display === "block") layer.cx = 0.5;
            if (guideH.style.display === "block") layer.cy = 0.5;
          }
          readoutShow(layer);
          layoutNode(layer);
        }
      }
      function onUp(e) {
        (delete ptrs[e.pointerId], (start = null));""")

rep(r"""        Object.keys(ptrs).length === 0 && syncFormInputs();""", r"""        if (Object.keys(ptrs).length === 0) {
          syncFormInputs();
          refreshAll(layer);
          guideV.style.display = "none";
          guideH.style.display = "none";
          readout.style.display = "none";
          histCommit();
        }""")

# ── 11. Hilfslinien, Anzeige, Tastatur, Zahlenfelder, Textstil (nach der Knotenliste) ─
rep(r"""    var nodes = {};""", r"""    var nodes = {};
    var guideV = el("div", {
        style:
          "position:absolute;top:0;bottom:0;left:50%;width:0;border-left:1.5px dashed #c1922f;display:none;pointer-events:none;z-index:50;",
      }),
      guideH = el("div", {
        style:
          "position:absolute;left:0;right:0;top:50%;height:0;border-top:1.5px dashed #c1922f;display:none;pointer-events:none;z-index:50;",
      }),
      readout = el("div", {
        style:
          "position:absolute;left:8px;top:8px;background:rgba(22,21,26,.82);color:#fff;font-size:12px;font-weight:700;padding:4px 8px;border-radius:8px;display:none;pointer-events:none;z-index:60;",
      });
    (stage.appendChild(guideV), stage.appendChild(guideH), stage.appendChild(readout));
    wrap.setAttribute("tabindex", "0");
    wrap.style.outline = "none";
    var cT = null;
    function commitSoon() {
      clearTimeout(cT);
      cT = setTimeout(histCommit, 700);
    }
    btnUndo.addEventListener("click", histUndo);
    btnRedo.addEventListener("click", histRedo);
    btnLUp.addEventListener("click", function () {
      shiftLayer(1);
    });
    btnLDown.addEventListener("click", function () {
      shiftLayer(-1);
    });
    btnCX.addEventListener("click", function () {
      var ly = findLayer(state.sel);
      if (ly) {
        ly.cx = 0.5;
        layoutNode(ly);
        refreshAll(ly);
        syncFormInputs();
        histCommit();
      }
    });
    btnCY.addEventListener("click", function () {
      var ly = findLayer(state.sel);
      if (ly) {
        ly.cy = 0.5;
        layoutNode(ly);
        refreshAll(ly);
        syncFormInputs();
        histCommit();
      }
    });
    [pX, pY, pS, pR, pO].forEach(function (inp) {
      inp.addEventListener("input", precApply);
      inp.addEventListener("change", function () {
        precApply();
        refreshAll(findLayer(state.sel));
      });
    });
    stB.addEventListener("click", function () {
      var ly = findLayer(state.sel);
      if (ly && ly.type === "text") {
        ly.bold = ly.bold === false;
        layoutNode(ly);
        refreshAll(ly);
        syncFormInputs();
      }
    });
    stI.addEventListener("click", function () {
      var ly = findLayer(state.sel);
      if (ly && ly.type === "text") {
        ly.italic = !ly.italic;
        layoutNode(ly);
        refreshAll(ly);
        syncFormInputs();
      }
    });
    [
      [stL, "left"],
      [stC, "center"],
      [stR, "right"],
    ].forEach(function (p) {
      p[0].addEventListener("click", function () {
        var ly = findLayer(state.sel);
        if (ly && ly.type === "text") {
          ly.align = p[1];
          layoutNode(ly);
          refreshAll(ly);
          syncFormInputs();
        }
      });
    });
    ctxLh.addEventListener("input", function () {
      var ly = findLayer(state.sel);
      if (ly && ly.type === "text") {
        ly.lh = parseFloat(ctxLh.value) || 1.05;
        layoutNode(ly);
        syncFormInputs();
        commitSoon();
      }
    });
    // Alle Regler und Auswahlfelder: Verlauf beim Loslassen (nicht die Bild-Filter, die committen selbst)
    body.addEventListener("change", function (e) {
      if ([sBri, sCon, sSat, sSharp].indexOf(e.target) >= 0) return;
      histCommit();
    });
    [ctxCw, presetBar, ctxStyle].forEach(function (x) {
      x.addEventListener("click", function () {
        setTimeout(histCommit, 0);
      });
    });
    // Tastatur: Strg+Z / Strg+Y, Pfeiltasten verschieben, Entf löscht (nicht, wenn ein Feld Fokus hat)
    wrap.addEventListener("keydown", function (e) {
      var tn = e.target && e.target.tagName;
      if (tn === "INPUT" || tn === "TEXTAREA" || tn === "SELECT") return;
      var k = (e.key || "").toLowerCase(),
        mod = e.ctrlKey || e.metaKey;
      if (mod && k === "z" && !e.shiftKey) {
        e.preventDefault();
        histUndo();
        return;
      }
      if (mod && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        histRedo();
        return;
      }
      var ly = findLayer(state.sel);
      if (!ly) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeLayer(ly.id);
        return;
      }
      var st = e.shiftKey ? 0.02 : 0.005,
        dx = 0,
        dy = 0;
      if (e.key === "ArrowLeft") dx = -st;
      else if (e.key === "ArrowRight") dx = st;
      else if (e.key === "ArrowUp") dy = -st;
      else if (e.key === "ArrowDown") dy = st;
      else return;
      e.preventDefault();
      ly.cx = Math.max(0, Math.min(1, ly.cx + dx));
      ly.cy = Math.max(0, Math.min(1, ly.cy + dy));
      layoutNode(ly);
      refreshAll(ly);
      syncFormInputs();
    });
    wrap.addEventListener("keyup", function (e) {
      if ((e.key || "").indexOf("Arrow") === 0) histCommit();
    });""")

# ── 12. Druckdatei: Schnitt, Zeilen, Ausrichtung, Deckkraft (gleiche Regeln wie die Vorschau) ─
rep_between(r"""            if (l.type === "text") {
              if (!l.text) return;""", r"""            var src =
              l.type === "sticker" ? corsUrl(l.src) : l.printUrl || l.src;""", r"""            if (l.type === "text") {
              if (!l.text) return;
              var px = l.scale * REF2 * 0.12,
                lines = l.text.split("\n"),
                lhPx = px * lhOf(l),
                al = alignOf(l),
                maxW = 0;
              cxn.save();
              cxn.translate(x, y);
              cxn.rotate((l.rot * Math.PI) / 180);
              cxn.globalAlpha = opOf(l);
              cxn.font = canvasFont(l, px);
              cxn.fillStyle = l.color;
              cxn.textBaseline = "middle";
              cxn.letterSpacing = (l.ls || 0) * px + "px";
              lines.forEach(function (s) {
                maxW = Math.max(maxW, cxn.measureText(s).width);
              });
              cxn.textAlign = al === "left" ? "left" : al === "right" ? "right" : "center";
              if (l.color.toLowerCase() === "#ffffff") {
                cxn.shadowColor = "rgba(0,0,0,.4)";
                cxn.shadowBlur = px * 0.12;
              }
              var x0 = al === "left" ? -maxW / 2 : al === "right" ? maxW / 2 : 0,
                y0 = (-(lines.length - 1) * lhPx) / 2;
              lines.forEach(function (s, i) {
                var yy = y0 + i * lhPx;
                if (l.outl > 0) {
                  cxn.lineJoin = "round";
                  cxn.lineWidth = l.outl * px * 2;
                  cxn.strokeStyle = l.outc || "#ffffff";
                  cxn.strokeText(s, x0, yy);
                }
                cxn.fillText(s, x0, yy);
              });
              cxn.restore();
              return;
            }
""")

rep(r"""                (cxn.save(),
                  cxn.translate(x, y),
                  cxn.rotate((l.rot * Math.PI) / 180),
                  cxn.drawImage(im, -w / 2, -h / 2, w, h),""", r"""                (cxn.save(),
                  cxn.translate(x, y),
                  cxn.rotate((l.rot * Math.PI) / 180),
                  (cxn.globalAlpha = opOf(l)),
                  cxn.drawImage(im, -w / 2, -h / 2, w, h),""")

# ── 13. Ersten Verlaufszustand setzen (nach dem Aufbau) ──────────────────────
rep(r"""      checkVar2();
    }
  }
  function initAll() {""", r"""      checkVar2();
    }
    histCommit();
  }
  function initAll() {""")

# ── 13b. Feinschliff nach Sichtprüfung (12.10.): Griffe aus dem Text, Farbfelder in eine Zeile, Regler-Zeilen ─
rep(r"""position:absolute;inset:-6px;border:1.5px dashed #16151a;""",
    r"""position:absolute;inset:-8px;border:1.5px dashed #16151a;""")
rep(r"""position:absolute;right:-13px;bottom:-13px;width:26px;height:26px;""",
    r"""position:absolute;right:-21px;bottom:-21px;width:26px;height:26px;""")
rep(r"""position:absolute;left:-13px;top:-13px;width:26px;height:26px;""",
    r"""position:absolute;left:-21px;top:-21px;width:26px;height:26px;""")
rep(r"""width:32px;height:32px;border-radius:50%;border:2px solid #e3e3e3;background:""",
    r"""width:28px;height:28px;border-radius:50%;border:2px solid #e3e3e3;background:""")
rep(r"""width:32px;height:32px;border:2px solid #e3e3e3;border-radius:50%;background:none;""",
    r"""width:28px;height:28px;border:2px solid #e3e3e3;border-radius:50%;background:none;""")
rep(r"""display:flex;flex-wrap:wrap;gap:8px;""", r"""display:flex;flex-wrap:wrap;gap:6px;""")
rep(r"""      textBar.appendChild(ctxLh),
      body.appendChild(textBar));""", r"""      textBar.appendChild(ctxLh),
      body.appendChild(textBar));
    // Abstand / Kontur / Zeilen je eine eigene Zeile mit gleich breiter Beschriftung
    (function () {
      var k = Array.prototype.slice.call(textBar.children);
      textBar.style.flexDirection = "column";
      textBar.style.alignItems = "stretch";
      [
        [k[0], k[1]],
        [k[2], k[3], k[4]],
        [k[5], k[6]],
      ].forEach(function (g) {
        var row = el("div", { style: "display:flex;align-items:center;gap:10px;width:100%;" });
        g.forEach(function (n) {
          n && row.appendChild(n);
        });
        g[0] && (g[0].style.minWidth = "64px");
        textBar.appendChild(row);
      });
    })();""")

# ── 14. Kopf, Quellverweis entfernen ─────────────────────────────────────────
lines = [l for l in s.split("\n") if not l.startswith("//# sourceMappingURL")]
s = "\n".join(lines)
s = (
    "/* LuxeStyle · lspod-designer v5 (12.10.2026) — Profi-Bedienung: genaue Zahlen (X/Y/Grösse/Drehung/Deckkraft),\n"
    " * Rückgängig/Wiederholen (Strg+Z/Strg+Y), Ebenen-Liste mit Reihenfolge, mehrzeiliger Text, Fett/Kursiv,\n"
    " * Ausrichtung, Zeilenabstand, Mitte-Hilfslinien, Pfeiltasten/Entf. Vorschau und Druckdatei nutzen dieselben Regeln.\n"
    " * Quelle: pod/lspod-designer-v5.src.js (aus v4 entminifiziert, Patch: scratchpad/v5/patch_v5.py). */\n"
) + s

open(OUT, "w", encoding="utf-8").write(s)
print(f"OK: {n_ok} Ersetzungen, {len(s)} Zeichen -> {OUT}")
