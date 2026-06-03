#!/usr/bin/env python3
"""
tools/radar_daten_audit.py — autonomer Daten-Audit über alle *-radar/data-Dateien.

Macht die Verifikations-Schuld sichtbar (was noch `[Redaktion: prüfen]` ist, wie viele
Einträge EU-geflaggt sind, fehlende URLs) — pro Radar, als Markdown-Report. Läuft
wöchentlich per Workflow, committet den Report nur bei Änderung. Reine stdlib, erfindet
nichts — zählt nur und listet. Verifizieren bleibt ein bewusster Schritt (Methode:
docs/REDAKTION-VERIFIKATION.md).

Nutzung:
    python3 tools/radar_daten_audit.py            # schreibt reports/RADAR-DATEN-AUDIT.md
    python3 tools/radar_daten_audit.py --print     # nur ausgeben
"""
import glob
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "reports" / "RADAR-DATEN-AUDIT.md"


def _items(data):
    if isinstance(data, list):
        return data
    for k in ("anbieter", "tools", "kurse", "agenturen", "programme", "produkte"):
        if isinstance(data.get(k), list):
            return data[k]
    return []


def audit_file(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as e:
        return {"datei": path, "fehler": str(e)[:120]}
    items = _items(data)
    n = len(items)
    marker = eu_true = eu_false = eu_unk = no_url = 0
    for a in items:
        if not isinstance(a, dict):
            continue
        blob = json.dumps(a, ensure_ascii=False)
        if "Redaktion: pr" in blob:
            marker += 1
        eu = a.get("eu_lager")
        eu_true += eu is True
        eu_false += eu is False
        eu_unk += eu is None and ("eu_lager" in a)
        if not (a.get("url") or a.get("offizielle_url") or a.get("website")):
            no_url += 1
    return {"datei": path, "n": n, "marker": marker, "eu_true": eu_true,
            "eu_false": eu_false, "eu_unk": eu_unk, "no_url": no_url}


def build():
    files = sorted(glob.glob(str(ROOT / "*-radar" / "data" / "*.json")))
    files += [str(ROOT / "data" / "tools.json")] if (ROOT / "data" / "tools.json").exists() else []
    rows = [audit_file(f) for f in files]
    rows = [r for r in rows if not r.get("fehler") and r.get("n")]
    total_n = sum(r["n"] for r in rows)
    total_marker = sum(r["marker"] for r in rows)
    total_eu = sum(r["eu_true"] for r in rows)
    lines = [
        "# Radar-Daten-Audit", "",
        f"> Autogeneriert {date.today().isoformat()} · `tools/radar_daten_audit.py` · "
        "zählt nur, erfindet nichts. Verifikations-Methode: `docs/REDAKTION-VERIFIKATION.md`.", "",
        f"**Gesamt:** {total_n} Einträge · {total_marker} mit `[Redaktion: prüfen]` · "
        f"{total_eu} mit EU-Hosting=ja.", "",
        "| Datei | Einträge | [Redaktion] offen | EU ja | EU nein | EU ? | ohne URL |",
        "|-------|---------:|------------------:|------:|--------:|-----:|---------:|",
    ]
    for r in sorted(rows, key=lambda x: -x["marker"]):
        rel = r["datei"].replace(str(ROOT) + "/", "")
        lines.append(f"| `{rel}` | {r['n']} | {r['marker']} | {r['eu_true']} | "
                     f"{r['eu_false']} | {r['eu_unk']} | {r['no_url']} |")
    lines += ["", "## Nächster Verifikations-Schritt",
              "Radar mit den meisten offenen Markern zuerst nehmen, Firmensitz/URL prüfen "
              "(dauerhafte Fakten), EU-Flag setzen, Marker heben. Preise/Scores bleiben `null`.",
              "Tote URLs separat: `python3 tools/radar_link_check.py`."]
    return "\n".join(lines) + "\n"


def main():
    report = build()
    if "--print" in sys.argv:
        print(report)
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(report, encoding="utf-8")
    print(f"Audit → {OUT}")


if __name__ == "__main__":
    main()
