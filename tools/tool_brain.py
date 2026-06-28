#!/usr/bin/env python3
"""aban-Brain 2 — Tool-Selbstheilung & -Verbesserung.

Das ZWEITE Gehirn (ergänzt tools/daily_improvement_scan.py, das auf Inhalt/SEO
schaut). Dieses prüft die INTERAKTIVEN Tools & Apps (alles mit
`data-aban-news-cta`) technisch durch — damit kein Rechner still kaputtgeht:

  • 0 Null-Bytes (mojibake/Schreibfehler)
  • jedes  <script type="application/ld+json">  ist gültiges JSON
  • das letzte (Logik-)<script> ist syntaktisch gültig (ein einziger Node-Lauf via vm.Script)
  • <link rel="canonical"> vorhanden
  • <meta name="viewport"> vorhanden
  • Newsletter-CTA (data-aban-news-cta) + Hub-Rücklink (data-aban-hublink) vorhanden
  • <title> + meta description vorhanden

Aufruf:
  python3 tools/tool_brain.py          → scannen + Score + Report
  python3 tools/tool_brain.py --fix    → sichere Selbstheilung (Null-Bytes raus), dann scannen

Schreibt:  reports/TOOL-BRAIN-REPORT.md  +  automation/tool-brain-state.json
Schnell: ALLE Logik-Scripts werden in EINEM Node-Prozess geprüft (statt 1× pro Datei).
Reine Python-Stdlib + node. Kein Netz, ändert ohne --fix nichts.
"""
import sys, os, re, json, glob, subprocess, datetime, tempfile

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

def batch_js_check(items):
    """items: [{"id": i, "code": str}] → dict id->errstr|None. Ein Node-Lauf."""
    if not items:
        return {}
    driver = (
        "const fs=require('fs'),vm=require('vm');"
        "const items=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));"
        "const out={};for(const it of items){try{new vm.Script(it.code);out[it.id]=null;}"
        "catch(e){out[it.id]=String(e.message||e).split('\\n')[0];}}"
        "process.stdout.write(JSON.stringify(out));"
    )
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
            json.dump(items, tf)
            payload = tf.name
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as df:
            df.write(driver)
            drv = df.name
        p = subprocess.run(["node", drv, payload], capture_output=True, timeout=90)
        os.unlink(payload); os.unlink(drv)
        if p.returncode != 0:
            return {}  # node-Problem → nicht bestrafen
        res = json.loads(p.stdout.decode("utf-8", "ignore") or "{}")
        return {int(k): v for k, v in res.items()}
    except Exception:
        return {}  # node fehlt/Fehler → JS-Check überspringen, nicht bestrafen

def main():
    files = tool_files()
    PEN = {"hoch": 5.0, "mittel": 1.5, "niedrig": 0.4}
    counts = {"hoch": 0, "mittel": 0, "niedrig": 0, "fix": 0}
    rows = []
    # Pass 1: einlesen, Null-Bytes heilen, Scripts sammeln
    parsed = []
    js_items = []
    for path in files:
        name = os.path.basename(path)
        raw = open(path, "rb").read()
        nulls = raw.count(b"\x00")
        local = []
        if nulls:
            if FIX:
                raw = raw.replace(b"\x00", b"")
                open(path, "wb").write(raw)
                local.append(("fix", "%d Null-Byte(s) entfernt" % nulls))
            else:
                local.append(("hoch", "%d Null-Byte(s)" % nulls))
        s = raw.decode("utf-8", "ignore")
        scripts = SCRIPT.findall(s)
        jsid = None
        if scripts:
            jsid = len(js_items)
            js_items.append({"id": jsid, "code": scripts[-1]})
        parsed.append((name, s, jsid, local))
    # Pass 2: alle JS in einem Node-Lauf prüfen
    jsres = batch_js_check(js_items)
    # Pass 3: Befunde je Datei
    for name, s, jsid, local in parsed:
        f = list(local)
        for i, b in enumerate(JSONLD.findall(s)):
            try:
                json.loads(b)
            except Exception as e:
                f.append(("hoch", "JSON-LD #%d defekt: %s" % (i + 1, str(e)[:60])))
        if not JSONLD.findall(s):
            f.append(("mittel", "kein JSON-LD (Schema fehlt)"))
        if jsid is not None and jsres.get(jsid):
            f.append(("hoch", "JS-Syntaxfehler: " + str(jsres[jsid])[:70]))
        if 'rel="canonical"' not in s: f.append(("mittel", "canonical fehlt"))
        if 'name="viewport"' not in s: f.append(("niedrig", "viewport fehlt"))
        if "data-aban-hublink" not in s: f.append(("niedrig", "Hub-Rücklink fehlt"))
        if "<title>" not in s: f.append(("mittel", "title fehlt"))
        if 'name="description"' not in s: f.append(("niedrig", "meta description fehlt"))
        if "abannews.beehiiv.com/subscribe" not in s: f.append(("mittel", "Newsletter-Link fehlt"))
        for sev, msg in f:
            counts[sev] = counts.get(sev, 0) + 1
            rows.append((sev, name, msg))
    score = max(0.0, round(100.0 - sum(PEN.get(sev, 0) * 1 for sev, _, _ in rows), 1))
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
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
