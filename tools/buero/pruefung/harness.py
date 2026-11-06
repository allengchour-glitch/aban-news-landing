#!/usr/bin/env python3
"""Baut harness.html und harness_demo.html: die Seite mit nachgebauten Dashboard-Werten (nur für die lokale Sicht)."""
import json
import sys

DIR = sys.argv[1]
body = open(f"{DIR}/seite.html", encoding="utf-8").read()
rows = json.load(open(f"{DIR}/buero.json", encoding="utf-8"))

KOPF = """<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { color-scheme: light; --color-fg:#1f2328; --color-fg-muted:#59636e; --color-bg:#ffffff; --color-panel:#f6f8fa; --color-border-line:#d1d9e0;
  --color-ok:#1a7f37; --color-warn:#9a6700; --color-bad:#cf222e;
  --cds-gap-xs:4px; --cds-gap-sm:8px; --cds-gap-md:12px; --cds-gap-lg:20px; --cds-pad-xs:4px; --cds-pad-sm:8px; --cds-pad-md:12px; --cds-pad-lg:16px;
  --cds-radius:8px; --cds-font-size-caption:12px; --cds-font-size-body:14px; --cds-font-size-heading:16px; --cds-font-size-title:24px; --cds-font-weight-medium:500;
  --font-anthropic-sans: system-ui, -apple-system, 'Segoe UI', sans-serif; --font-anthropic-serif: Georgia, 'Times New Roman', serif; }
@media (prefers-color-scheme: dark) { :root { color-scheme: dark; --color-fg:#e6edf3; --color-fg-muted:#9aa4af; --color-bg:#0d1117; --color-panel:#151b23; --color-border-line:#30363d;
  --color-ok:#3fb950; --color-warn:#d29922; --color-bad:#f85149; } }
body { margin: 0; background: var(--color-bg); color: var(--color-fg); font-family: var(--font-anthropic-sans); font-size: 14px; }
#dash-root { padding: 16px; }
</style></head><body><div id="dash-root">
<script>
window.__ROWS = %%ROWS%%;
(function () {
  var NOW = Date.parse('2026-11-06T06:35:00Z');
  Date.now = function () { return NOW; };
  var draws = {}, gemountet = new WeakMap();
  window.dash = {
    colors: ['#3b6fd8', '#c0562b', '#2f9e6a', '#8a5bd6', '#c79a1b', '#1f9fb8', '#c4488a', '#6a7280'],
    data: function () { return { status: 'ok', data: window.__ROWS, columns: [], meta: [] }; },
    onData: function (fn) { window.__onData = fn; },
    // Wie das Dashboard: dash.draw(name, fn) merkt sich die Zeichnung, dash.draw(name) führt sie aus (verborgene werden übersprungen).
    // Eine Zeichnung darf auch ein Objekt {mount, update, unmount} sein.
    draw: function (name, fn) {
      if (fn) { draws[name] = fn; return; }
      document.querySelectorAll('[data-draw="' + name + '"]').forEach(function (el) {
        if (el.closest('[hidden]')) return;
        var d = draws[name];
        if (typeof d === 'function') { d(el); return; }
        var made = gemountet.get(el);
        if (made === undefined) { el.replaceChildren(); made = d.mount(el); gemountet.set(el, made); }
        d.update(el, made);
      });
    }
  };
  window.__runAll = function () {
    if (window.__onData) window.__onData();
    Object.keys(draws).forEach(function (n) { window.dash.draw(n); });
  };
})();
</script>
%%BODY%%
</div></body></html>
"""


def schreibe(name, daten):
    seite = KOPF.replace("%%ROWS%%", json.dumps(daten, ensure_ascii=False)).replace("%%BODY%%", body)
    open(f"{DIR}/{name}", "w", encoding="utf-8").write(seite)


schreibe("harness.html", rows)

demo = json.loads(json.dumps(rows))
for r in demo:
    if r["id"] == "waechter":
        r["status"] = "rot"
    if r["id"] == "schaufenster":
        r["gemessen"] = "2026-11-03T08:00:00Z"
    if r["id"] == "autopilot":
        r["status"] = "gelb"
    if r["id"] == "auswahl":
        r["ereignis_iso"] = "2026-11-06T05:50:00Z"
    if r["id"] == "tagesupdate":
        r["ereignis_iso"] = "2026-11-06T06:15:00Z"
schreibe("harness_demo.html", demo)
print("ok", len(rows), "Zeilen")
