#!/usr/bin/env python3
"""ABAN Files - autonomer Director / VIDEO-CHEF (4-Stunden-Rhythmus).

DAUERAUFTRAG (User, 2026-06-07): "Du bist Video-Chef. Sorge fuer viele ABONNENTEN/REICHWEITE.
Laeuft es nach 30 TAGEN nicht gut -> neues Thema."
UPDATE (User, 2026-06-07): KEINE Video-Masse mehr -> ANALYSIEREN + Videos kontinuierlich BESSER
machen (Qualitaet/Daten statt Menge). Dieser Director liefert die Analyse-Basis; der Chef leitet
daraus pro Lauf EINE gezielte Verbesserung ab, statt die Queue mit neuen Folgen zu fluten.

Wertet Abonnenten + Views aus, ENTSCHEIDET regelbasiert (weiter posten / Gewinner-Thema
ausbauen / nach 30 Tagen ohne Abo-Traktion das Thema wechseln), merkt sich den Verlauf in
`director_state.json` und schreibt ein lesbares Log nach `reports/ABAN-DIRECTOR.md`.

Sicher: trifft nur **Empfehlungen** — nichts wird automatisch veroeffentlicht oder
geloescht. Den Pivot fuehrt der Video-Chef (Claude-Session) aus: neue Themen-Skripte in
aban_scripts.json. Datenquelle = aban_stats (API-Key falls vorhanden, sonst Scrape). Reine stdlib.
"""
import os, sys, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import aban_stats as A  # noqa: E402

STATE = os.path.join(HERE, "director_state.json")
LOG = os.path.abspath(os.path.join(HERE, "..", "..", "reports", "ABAN-DIRECTOR.md"))

# Schwellen (anpassbar, wenn der Kanal waechst) — ABONNENTEN-FIRST
SUB_WIN = 100    # ab so vielen Abos gilt der Kanal als angelaufen -> Thema ausbauen
SUB_30 = 50      # nach 30 Tagen darunter = kaum Abo-Traktion -> PIVOT (neues Thema)
WIN = 1000       # eine Folge mit so vielen Views = Gewinner (Thema ausbauen)
FLOOR_WK = 100   # Fallback (Abos unlesbar): nach 30 Tagen best-Views darunter -> Pivot
PIVOT_DAYS = 30  # Bewertungsfenster fuer Themen-Wechsel

# Alternativ-Themen fuer den Pivot (faceless, mystery, bewaehrt zugkraeftig)
PIVOT_THEMES = [
    "unsolved true-crime / verschwundene Menschen",
    "kosmischer Horror / unheimliche Weltraum-Fakten",
    "verbotene/verschwiegene Geschichte",
    "Mandela-Effekte / Glitch-in-der-Realitaet",
    "Tiefsee-Mysterien / was unten lebt",
]


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


def decide(rows, days, subs, sub_trend, view_trend):
    """Abonnenten-first. Pivot nach 30 Tagen ohne Abo-Traktion."""
    best = max(rows, key=lambda r: r["views"]) if rows else None
    bv = best["views"] if best else 0
    be = best["ep"] if best else "—"
    sub_txt = f"{subs} Abos ({sub_trend:+d})" if subs is not None else "Abos versteckt/unlesbar"

    # Gewinner: Kanal laeuft an (Abos) ODER eine Folge geht viral
    if (subs is not None and subs >= SUB_WIN) or bv >= WIN:
        return (f"🏆 LAEUFT: {sub_txt}, Top {be} ({bv} Views). Aktion: dieses Thema/diesen Stil AUSBAUEN "
                f"— mehr Folgen davon, Kadenz halten, Abo-CTA prominent.")

    # 30-Tage-Pivot-Fenster
    if days >= PIVOT_DAYS:
        weak = (subs is not None and subs < SUB_30) or (subs is None and bv < FLOOR_WK)
        if weak:
            theme = PIVOT_THEMES[(days // PIVOT_DAYS) % len(PIVOT_THEMES)]
            return (f"🔄 30 TAGE, zu wenig Abo-Traktion ({sub_txt}). Aktion: THEMA WECHSELN. "
                    f"Naechstes Test-Thema: »{theme}«. Chef baut neue Skripte (aban_scripts.json), neuer 30-Tage-Lauf.")
        return f"✅ 30 Tage, solides Wachstum ({sub_txt}). Aktion: Kurs halten, bestes Format verdoppeln."

    # Fruehphase (< 30 Tage): sammeln + variieren
    if days >= 7 and subs is not None and subs < 10:
        return (f"⚠️ Woche {days // 7}, kaum Abos ({sub_txt}). Aktion: Hooks/Thumbnails/Titel variieren, "
                f"Abo-Aufruf schaerfen — weiter taeglich posten, Pivot-Entscheid an Tag {PIVOT_DAYS}.")
    return (f"⏳ Datensammeln (Tag {days}/{PIVOT_DAYS}, {sub_txt}, Views-Trend {view_trend:+d}). "
            f"Kurs halten, weiter posten.")


def main():
    today = datetime.date.today().isoformat()
    state = json.load(open(STATE)) if os.path.exists(STATE) else {"first_seen": today, "runs": []}
    rows = get_rows()
    total = sum(r["views"] for r in rows)
    best = max(rows, key=lambda r: r["views"]) if rows else None
    days = (datetime.date.fromisoformat(today) - datetime.date.fromisoformat(state["first_seen"])).days

    ids = list(dict.fromkeys((json.load(open(A.IDS)) if os.path.exists(A.IDS) else {}).values()))
    subs = A.channel_subs(ids, A.api_key())

    prev = state["runs"][-1]["total"] if state["runs"] else 0
    view_trend = total - prev
    prev_subs = next((r.get("subs") for r in reversed(state["runs"]) if r.get("subs") is not None), None)
    sub_trend = (subs - prev_subs) if (subs is not None and prev_subs is not None) else 0
    action = decide(rows, days, subs, sub_trend, view_trend)

    state["runs"].append({"ts": datetime.datetime.utcnow().isoformat(timespec="minutes") + "Z",
                          "day": days, "total": total, "subs": subs,
                          "best_ep": best["ep"] if best else "—",
                          "best_views": best["views"] if best else 0, "action": action})
    state["runs"] = state["runs"][-300:]
    json.dump(state, open(STATE, "w"), indent=2)

    sub_disp = subs if subs is not None else "— (versteckt/unlesbar)"
    lines = ["# ABAN Files — Director-Log / VIDEO-CHEF (autonom, 4h-Rhythmus)", "",
             "**Dauerauftrag:** viele Abonnenten/Reichweite. KEINE Video-Masse -> analysieren + Videos "
             "kontinuierlich BESSER machen (Qualitaet/Daten statt Menge). Nach 30 Tagen schwach -> Thema wechseln.", "",
             f"Kanal-Start: {state['first_seen']} · Tag {days}/{PIVOT_DAYS} · letzte Auswertung {today} (UTC)", "",
             "## Aktuelle Entscheidung", "", f"> {action}", "",
             f"- **Abonnenten: {sub_disp}** (Trend seit letztem Lauf: {sub_trend:+d})",
             f"- Gesamt-Views: **{total}** (Trend: {view_trend:+d})",
             f"- Top-Folge: **{(best['ep'] if best else '—')}** mit **{(best['views'] if best else 0)}** Views", "",
             "## Verlauf (letzte 40 Laeufe)", "",
             "| Zeit (UTC) | Tag | Abos | Views | Top | Entscheidung |", "|---|--:|--:|--:|---|---|"]
    for r in state["runs"][-40:][::-1]:
        sd = r.get("subs") if r.get("subs") is not None else "—"
        lines.append(f"| {r['ts']} | {r['day']} | {sd} | {r['total']} | {r['best_ep']}({r['best_views']}) | {r['action'][:60]} |")
    lines += ["", f"_Regelwerk (Abonnenten-first): laeuft ab {SUB_WIN} Abos · Pivot wenn nach {PIVOT_DAYS} Tagen "
              f"< {SUB_30} Abos · Empfehlungen only, Pivot fuehrt der Chef aus._"]
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").write("\n".join(lines) + "\n")
    print(action)


if __name__ == "__main__":
    main()
