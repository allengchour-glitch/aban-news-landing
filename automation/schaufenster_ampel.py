#!/usr/bin/env python3
"""schaufenster_ampel.py — Ampelzeile zum GMC-Schaufenster (27.11.2026, Workflow automation-und-kunden P2).

Der Google-Kanal gehört dem GMC-Schaufenster (nur auf origin/main: .github/workflows/gmc-schaufenster.yml,
automation/gmc_schaufenster.mjs; Merchant-Quote 150'000, Budget 78'000 Varianten). Diese Sitzungslinie sah es bis
27.11. nicht und holte Abgewählte zurück (Ping-Pong). Die Zeile zeigt täglich, ob der Zeitplan lief und was er prüfte.

  python3 automation/schaufenster_ampel.py        # druckt «SCHAUFENSTER: …» (still nur bei Fehler im Skript selbst)
  RUN=<id> python3 automation/schaufenster_ampel.py   # Probe für einen bestimmten Lauf (z. B. 46014333824 → 76949, Defekt 2)

Sparsam: `gh run list --limit 1` ist billig; das grosse Log (`gh run view --log`) wird nur EINMAL je neuem Lauf gelesen,
das Ergebnis liegt in /tmp/schaufenster_ampel.json. ⚠️ bei failure, keinem Lauf seit > 30 h, Varianten > 100'000.
Scheitert gh: «unklar», nie 0.
"""
import json, os, re, subprocess, sys, time
from datetime import datetime, timezone

STAND = "/tmp/schaufenster_ampel.json"


def gh(*args, timeout=180):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip()[:160])
    return r.stdout


def main():
    try:
        st = json.load(open(STAND))
    except (OSError, ValueError):
        st = {}
    try:
        if os.environ.get("RUN"):
            lauf = {"databaseId": int(os.environ["RUN"]), "conclusion": "?", "createdAt": ""}
        else:
            lauf = json.loads(gh("run", "list", "--workflow", "gmc-schaufenster.yml", "--limit", "1",
                                 "--json", "conclusion,createdAt,databaseId", timeout=60))[0]
        if lauf["databaseId"] != st.get("id") or os.environ.get("RUN"):
            varianten = defekt = None
            for z in gh("run", "view", str(lauf["databaseId"]), "--log").splitlines():
                m = re.search(r"PRÜFUNG: Varianten auf Google jetzt (\d+).*?davon noch auf Google (\d+) \(Defekt\)", z)
                if m:
                    varianten, defekt = int(m.group(1)), int(m.group(2))
            st = {"id": lauf["databaseId"], "conclusion": lauf.get("conclusion") or "läuft",
                  "createdAt": lauf.get("createdAt", ""), "varianten": varianten, "defekt": defekt}
            if not os.environ.get("RUN"):
                json.dump(st, open(STAND, "w"))
    except Exception as e:  # noqa: BLE001
        print(f"SCHAUFENSTER: unklar ({str(e)[:80]})")
        return 0
    warn = []
    if st["conclusion"] not in ("success", "?"):
        warn.append(st["conclusion"])
    if st.get("createdAt"):
        alter_h = (time.time() - datetime.fromisoformat(st["createdAt"].replace("Z", "+00:00")).timestamp()) / 3600
        if alter_h > 30:
            warn.append(f"kein Lauf seit {alter_h:.0f} h")
    v = st.get("varianten")
    if v is not None and v > 100000:
        warn.append("Varianten > 100'000")
    datum = (st.get("createdAt") or "")[:10] or "?"
    vt = f"{v:,}".replace(",", "'") if v is not None else "unklar"
    d = st.get("defekt")
    print(f"SCHAUFENSTER: {datum} {st['conclusion']} · Varianten {vt}/78'000 · Defekt {d if d is not None else 'unklar'}"
          + (f" ⚠️ {', '.join(warn)}" if warn else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
