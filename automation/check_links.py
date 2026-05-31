#!/usr/bin/env python3
"""Prüft externe Links in den kuratierten Datendateien auf Erreichbarkeit.

Hintergrund: tools.json, kurse.json, foerder.json und radar.json verlinken auf
externe Anbieter-/Programm-Seiten. Solche Links sterben mit der Zeit (Tool wird
eingestellt, Programm ausgelaufen, URL umgezogen). Dieser Job prüft sie planmäßig
(GitHub Action) und meldet tote Links, damit sie gepflegt werden können.

    python3 automation/check_links.py            # alle data/*.json prüfen
    python3 automation/check_links.py --timeout 8 # Timeout je Request (Sek.)

Exit 0 = alle ok (oder nur Soft-Warnungen). Der Report landet in .links-report.md.
Hinweis: 403/429 von Bot-Schutz werden als 'unklar' (nicht hart tot) gewertet.
"""
import argparse
import json
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = "Mozilla/5.0 (compatible; aban-news-linkcheck/1.0; +https://abannews.com)"

# Felder, die in den Datendateien eine URL enthalten können
URL_KEYS = ("url", "link", "href")
# Listen-Schlüssel je Datei (tools/kurse/programme/...)
LIST_KEYS = ("tools", "kurse", "programme", "items", "eintraege")


def collect_urls():
    found = []  # (datei, name, url)
    for fp in sorted(DATA.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        items = None
        for k in LIST_KEYS:
            if isinstance(data.get(k), list):
                items = data[k]
                break
        if not items:
            continue
        for it in items:
            if not isinstance(it, dict):
                continue
            for uk in URL_KEYS:
                u = it.get(uk)
                if isinstance(u, str) and u.startswith("http"):
                    found.append((fp.name, it.get("name", it.get("id", "?")), u))
                    break
    return found


def check(url, timeout):
    """Returns (status_label, detail). 'ok' | 'tot' | 'unklar'."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return "ok", r.status
    except urllib.error.HTTPError as e:
        if e.code in (403, 405, 429):
            # Manche Server blocken HEAD/Bots — als unklar werten, nicht als tot
            return "unklar", e.code
        if e.code in (404, 410):
            return "tot", e.code
        # 5xx & Rest: GET-Versuch
    except Exception:
        pass
    # Fallback: GET
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return "ok", r.status
    except urllib.error.HTTPError as e:
        if e.code in (404, 410):
            return "tot", e.code
        return "unklar", e.code
    except Exception as e:
        return "unklar", type(e).__name__


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeout", type=int, default=8)
    args = ap.parse_args()

    urls = collect_urls()
    rows = []
    for fname, name, url in urls:
        label, detail = check(url, args.timeout)
        rows.append((label, fname, name, url, detail))

    dead = [r for r in rows if r[0] == "tot"]
    unsure = [r for r in rows if r[0] == "unklar"]

    lines = ["# Link-Report (kuratierte Daten)", ""]
    lines.append(f"Geprüft: {len(rows)} Links · ✅ ok: {sum(1 for r in rows if r[0]=='ok')} · "
                 f"❌ tot: {len(dead)} · ❔ unklar: {len(unsure)}")
    lines.append("")
    if dead:
        lines += ["## ❌ Tote Links (bitte beheben)", "",
                  "| Datei | Eintrag | URL | Code |", "|---|---|---|---|"]
        for _, f, n, u, d in dead:
            lines.append(f"| `{f}` | {n} | {u} | {d} |")
        lines.append("")
    if unsure:
        lines += ["## ❔ Unklar (Bot-Schutz / Timeout — manuell prüfen)", "",
                  "| Datei | Eintrag | URL | Hinweis |", "|---|---|---|---|"]
        for _, f, n, u, d in unsure:
            lines.append(f"| `{f}` | {n} | {u} | {d} |")
        lines.append("")
    if not dead and not unsure:
        lines.append("Alle Links erreichbar. ✅")

    report = "\n".join(lines) + "\n"
    (ROOT / ".links-report.md").write_text(report, encoding="utf-8")
    print(report)
    print(f"::notice::Linkcheck: {len(dead)} tot, {len(unsure)} unklar von {len(rows)}.")
    # Tote Links sind ein echtes Problem -> Exit 1, damit der Workflow ein Issue öffnet
    return 1 if dead else 0


if __name__ == "__main__":
    raise SystemExit(main())
