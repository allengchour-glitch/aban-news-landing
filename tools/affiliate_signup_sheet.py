#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Affiliate-Anmelde-Sheet (aggregiert alle Radar-Partnerprogramme).

Die Geld-Infrastruktur steht: jede *-radar/affiliate.json listet Partnerprogramme
(`_programme`) + den Aktiv-Status (`links`, Key ohne `_` = aktiv). Verstreut über
~12 Dateien ist das aber unbrauchbar. Dieses Tool zieht ALLES in EINE ranglistete
Checkliste → `docs/AFFILIATE-ANMELDEN.md`: wo anmelden, welche Provision, welche
Radars es monetarisiert, schon aktiv oder offen. So sieht man auf einen Blick die
lohnendsten offenen Anmeldungen (= der eigentliche Geld-Hebel: 1× anmelden → recurring).

Reine Stdlib, read-only (schreibt nur die Checkliste).

    python3 tools/affiliate_signup_sheet.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "AFFILIATE-ANMELDEN.md"


def load_radar(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def active_keys(links) -> set[str]:
    """Tool-Keys mit aktivem Affiliate-Link (ohne führendes '_', echte URL)."""
    out = set()
    if not isinstance(links, dict):
        return out
    for k, v in links.items():
        if k.startswith("_"):
            continue
        url = (v or {}).get("affiliate_url", "") if isinstance(v, dict) else ""
        if url and "DEIN-CODE" not in url and "DEIN_CODE" not in url:
            out.add(k.lower())
    return out


def main() -> int:
    progs: dict[str, dict] = {}
    for f in sorted(ROOT.glob("*-radar/affiliate.json")):
        radar = f.parent.name.replace("-radar", "")
        d = load_radar(f)
        prog = d.get("_programme", {})
        active = active_keys(d.get("links", {}))
        if not isinstance(prog, dict):
            continue
        for name, info in prog.items():
            if name.startswith("_") or not isinstance(info, dict):
                continue
            key = name.lower()
            e = progs.setdefault(key, {"name": name, "signup": info.get("signup", ""),
                                       "rate": info.get("rate", ""), "typ": info.get("typ", ""),
                                       "radars": set(), "active": False})
            e["radars"].add(radar)
            if not e["signup"]:
                e["signup"] = info.get("signup", "")
            if key in active:
                e["active"] = True

    rows = list(progs.values())
    # Sortierung: offen-recurring zuerst (grösster Hebel), dann nach Radar-Reichweite
    def rank(e):
        rec = "recurring" in (e["typ"] or "").lower()
        return (e["active"], not rec, -len(e["radars"]), e["name"].lower())
    rows.sort(key=rank)

    n_active = sum(1 for e in rows if e["active"])
    n_open = len(rows) - n_active
    L = [
        "# 💸 Affiliate-Anmelde-Sheet (auto-aggregiert)",
        "",
        f"> Aus allen `*-radar/affiliate.json` zusammengezogen · {len(rows)} Programme · "
        f"**{n_active} aktiv · {n_open} offen**.",
        "> 1× gratis anmelden → Tracking-Link in die jeweilige `affiliate.json` (`links`, `_` entfernen) → "
        "die Radar-Seiten monetarisieren automatisch. **recurring = jeden Monat Umsatz pro Kunde.**",
        "",
        "| Status | Programm | Provision | Typ | Radars | Anmeldung |",
        "|---|---|---|---|---|---|",
    ]
    for e in rows:
        status = "✅ aktiv" if e["active"] else "⬜ offen"
        rate = (e["rate"] or "—").strip() or "—"
        typ = (e["typ"] or "—").strip() or "—"
        radars = ", ".join(sorted(e["radars"]))
        signup = f"[anmelden]({e['signup']})" if e["signup"] else "—"
        L.append(f"| {status} | {e['name']} | {rate} | {typ} | {radars} | {signup} |")

    L += ["",
          "## 🎯 Empfehlung",
          "Die **offenen recurring-Programme oben** zuerst — eine Anmeldung, danach verdient die "
          "passende Radar-Seite bei jedem geworbenen Abo *monatlich* mit. Tracking-Link schicken → "
          "ich (oder der Bot) aktiviert den Slot."]
    OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"✓ {len(rows)} Programme ({n_active} aktiv / {n_open} offen) → docs/AFFILIATE-ANMELDEN.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
