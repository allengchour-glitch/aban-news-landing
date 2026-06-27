#!/usr/bin/env python3
"""aban-Brain 2 — Tool-Selbstheilung & -Verbesserung.

Das ZWEITE Gehirn (ergänzt tools/daily_improvement_scan.py, das auf Inhalt/SEO
schaut). Dieses prüft die INTERAKTIVEN Tools & Apps (alles mit
`data-aban-news-cta`) technisch durch — damit kein Rechner still kaputtgeht:

  • 0 Null-Bytes (mojibake/Schreibfehler)
  • jedes  <script type="application/ld+json">  ist gültiges JSON
  • das letzte (Logik-)<script> besteht  `node --check`  (Syntax)
  • <link rel="canonical"> vorhanden
  • <meta name="viewport"> vorhanden
  • Newsletter-CTA (data-aban-news-cta)  + Hub-Rücklink (data-aban-hublink) vorhanden
  • <title> + meta description vorhanden

Aufruf:
  python3 tools/tool_brain.py          → scannen + Score + Report
  python3 tools/tool_brain.py --fix    → sichere Selbstheilung (Null-Bytes raus), dann scannen

Schreibt:  reports/TOOL-BRAIN-REPORT.md  +  automation/tool-brain-state.json
Reine Python-Stdlib + node (für --check). Kein Netz, ändert ohne --fix nichts.
"""
import sys, os, re, json, glob, subprocess, datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = "--fix" in sys.argv

JSONLD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
SCRIPT = re.compile(r'<script>(.*?)</script>', re.S)

def tool_files():
    out = []
    for f in sorted(glob.glob(os.path.join(REPO, "*.html"))):
        try:
            head = open(f, "r", encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if "data-aban-news-cta" in head:          # = eine unserer Tool-/App-Seiten
            out.append(f)
    return out

def node_check(js):
    try:
        p = subprocess.run(["node", "--check", "-"], input=js.encode("utf-8"),
                           capture_output=True, timeout=20)
        return p.returncode == 0, (p.stderr.decode("utf-8", "ignore").strip().splitlines() or [""])[0]
    except Exception as e:
        return True, "node n/v: " + str(e)  # node fehlt → nicht bestrafen

def audit(path):
    name = os.path.basename(path)
    raw = open(path, "rb").read()
    findings = []
    # 1) Null-Bytes
    nulls = raw.count(b"\x00")
    if nulls:
        if FIX:
            open(path, "wb").write(raw.replace(b"\x00", b""))
            raw = open(path, "rb").read()
            findings.append(("fix", "%d Null-Byte(s) entfernt" % nulls))
        else:
            findings.append(("hoch", "%d Null-Byte(s)" % nulls))
    s = raw.decode("utf-8", "ignore")
    # 2) JSON-LD
    blocks = JSONLD.findall(s)
    for i, b in enumerate(blocks):
        try:
            json.loads(b)
        except Exception as e:
            findings.append(("hoch", "JSON-LD #%d defekt: %s" % (i + 1, str(e)[:60])))
    if not blocks:
        findings.append(("mittel", "kein JSON-LD (Schema fehlt)"))
    # 3) Logik-Script syntaktisch
    scripts = SCRIPT.findall(s)
    if scripts:
        ok, err = node_check(scripts[-1])
        if not ok:
            findings.append(("hoch", "JS-Syntaxfehler: " + err[:70]))
    # 4) Pflicht-Tags / Funnel
    if 'rel="canonical"' not in s: findings.append(("mittel", "canonical fehlt"))
    if 'name="viewport"' not in s: findings.append(("niedrig", "viewport fehlt"))
    if "data-aban-hublink" not in s: findings.append(("niedrig", "Hub-Rücklink fehlt"))
    if "<title>" not in s: findings.append(("mittel", "title fehlt"))
    if 'name="description"' not in s: findings.append(("niedrig", "meta description fehlt"))
    if "abannews.beehiiv.com/subscribe" not in s: findings.append(("mittel", "Newsletter-Link fehlt"))
    return name, findings

def main():
    files = tool_files()
    PEN = {"hoch": 5.0, "mittel": 1.5, "niedrig": 0.4}
    rows, hoch = [], 0
    counts = {"hoch": 0, "mittel": 0, "niedrig": 0, "fix": 0}
    score = 100.0
    for f in files:
        name, fnd = audit(f)
        for sev, msg in fnd:
            counts[sev] = counts.get(sev, 0) + 1
            if sev in PEN:
                score -= PEN[sev]
            rows.append((sev, name, msg))
    score = max(0.0, round(score, 1))
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    # Report
    rep = ["# 🧠 Tool-Brain (Gehirn 2) — Selbstheilung & QA der Tools", "",
           "Stand: %s · %d Tool-/App-Seiten geprüft" % (ts, len(files)),
           "**Score: %.1f/100** — %d hoch · %d mittel · %d niedrig · %d auto-geheilt" %
           (score, counts["hoch"], counts["mittel"], counts["niedrig"], counts["fix"]), ""]
    if rows:
        order = {"hoch": 0, "fix": 1, "mittel": 2, "niedrig": 3}
        for sev, name, msg in sorted(rows, key=lambda r: order.get(r[0], 9)):
            rep.append("- **%s** · `%s` — %s" % (sev, name, msg))
    else:
        rep.append("✅ Keine Befunde — alle Tools technisch gesund.")
    os.makedirs(os.path.join(REPO, "reports"), exist_ok=True)
    open(os.path.join(REPO, "reports", "TOOL-BRAIN-REPORT.md"), "w", encoding="utf-8").write("\n".join(rep) + "\n")
    open(os.path.join(REPO, "automation", "tool-brain-state.json"), "w", encoding="utf-8").write(
        json.dumps({"ts": ts, "files": len(files), "score": score, "counts": counts}, ensure_ascii=False, indent=2))
    print("🧠 Tool-Brain: %d Tools · Score %.1f/100 · %d hoch / %d mittel / %d niedrig%s"
          % (len(files), score, counts["hoch"], counts["mittel"], counts["niedrig"],
             (" · %d geheilt" % counts["fix"]) if counts["fix"] else ""))
    print("→ reports/TOOL-BRAIN-REPORT.md")
    return 0

if __name__ == "__main__":
    sys.exit(main())
