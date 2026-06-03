#!/usr/bin/env python3
"""ABAN Files - autonomer Director (4-Stunden-Rhythmus).

Wertet die View-Zahlen aus, ENTSCHEIDET regelbasiert (weiter posten / Gewinner-Thema
ausbauen / nach 1 Woche ohne Traktion das Thema wechseln), merkt sich den Verlauf in
`director_state.json` und schreibt ein lesbares Log nach `reports/ABAN-DIRECTOR.md`.

Sicher: trifft nur **Empfehlungen** — nichts wird automatisch veroeffentlicht oder
geloescht. Der eigentliche Upload bleibt bei der Pipeline; ein Themen-Wechsel wird
empfohlen (und kann spaeter mit ANTHROPIC_API_KEY zu Auto-Entwuerfen erweitert werden).

Datenquelle = aban_stats (API-Key falls vorhanden, sonst Scrape). Reine stdlib.
"""
import os, sys, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import aban_stats as A  # noqa: E402

STATE = os.path.join(HERE, "director_state.json")
LOG = os.path.abspath(os.path.join(HERE, "..", "..", "reports", "ABAN-DIRECTOR.md"))

# Schwellen (anpassbar, wenn der Kanal waechst)
WIN = 1000      # ab so vielen Views gilt eine Folge als Gewinner
FLOOR_WK = 100  # nach 1 Woche darunter = kaum Traktion -> Pivot
FLOOR_3D = 30   # nach 3 Tagen darunter = schwache Fruehphase


def get_rows():
    ids = list(dict.fromkeys((json.load(open(A.IDS)) if os.path.exists(A.IDS) else {}).values()))
    if not ids:
        return []
    scripts = json.load(open(A.SCRIPTS))
    key = A.api_key()
    if key:
        try:
            return A.via_api(ids, key, scripts)
        except Exception:
            pass
    try:
        return A.via_scrape(ids, scripts)
    except Exception as e:
        print("keine View-Daten:", e)
        return []


def decide(rows, days, total, trend):
    if not rows:
        return "⏳ Keine Daten lesbar (IP/Consent) — weiter posten, naechster Lauf prueft erneut."
    best = max(rows, key=lambda r: r["views"])
    bv, be = best["views"], best["ep"]
    if bv >= WIN:
        return f"🏆 GEWINNER: {be} ({bv} Views). Aktion: mehr Folgen in DIESEM Thema/Stil bauen, taegliche Kadenz halten."
    if days >= 7 and bv < FLOOR_WK:
        return (f"🔄 1 Woche, kaum Traktion (best {bv}). Aktion: THEMA WECHSELN — neues Konzept/Format testen "
                f"(z.B. anderes Nischen-Thema, das nachweislich laeuft). Pivot empfohlen.")
    if days >= 3 and bv < FLOOR_3D:
        return f"⚠️ Schwache Fruehphase (best {bv}). Aktion: Hooks/Themen variieren, weiter taeglich posten."
    return f"⏳ Datensammeln (Tag {days}, best {bv}, Trend {trend:+d}). Kurs halten, weiter posten."


def main():
    today = datetime.date.today().isoformat()
    state = json.load(open(STATE)) if os.path.exists(STATE) else {"first_seen": today, "runs": []}
    rows = get_rows()
    total = sum(r["views"] for r in rows)
    best = max(rows, key=lambda r: r["views"]) if rows else None
    days = (datetime.date.fromisoformat(today) - datetime.date.fromisoformat(state["first_seen"])).days
    prev = state["runs"][-1]["total"] if state["runs"] else 0
    trend = total - prev
    action = decide(rows, days, total, trend)

    state["runs"].append({"ts": datetime.datetime.utcnow().isoformat(timespec="minutes") + "Z",
                          "day": days, "total": total,
                          "best_ep": best["ep"] if best else "—",
                          "best_views": best["views"] if best else 0, "action": action})
    state["runs"] = state["runs"][-300:]
    json.dump(state, open(STATE, "w"), indent=2)

    lines = ["# ABAN Files — Director-Log (autonom, 4h-Rhythmus)", "",
             f"Kanal-Start: {state['first_seen']} · Tag {days} · letzte Auswertung {today} (UTC)", "",
             f"## Aktuelle Entscheidung", "", f"> {action}", "",
             f"- Gesamt-Views: **{total}** (Trend seit letztem Lauf: {trend:+d})",
             f"- Top-Folge: **{(best['ep'] if best else '—')}** mit **{(best['views'] if best else 0)}** Views", "",
             "## Verlauf (letzte 40 Laeufe)", "",
             "| Zeit (UTC) | Tag | Views | Top | Entscheidung |", "|---|--:|--:|---|---|"]
    for r in state["runs"][-40:][::-1]:
        lines.append(f"| {r['ts']} | {r['day']} | {r['total']} | {r['best_ep']}({r['best_views']}) | {r['action'][:64]} |")
    lines += ["", "_Regelwerk: Gewinner ab "f"{WIN}"" Views · Pivot wenn nach 7 Tagen < "f"{FLOOR_WK}"" · "
              "Empfehlungen only, kein Auto-Publish._"]
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").write("\n".join(lines) + "\n")
    print(action)


if __name__ == "__main__":
    main()
