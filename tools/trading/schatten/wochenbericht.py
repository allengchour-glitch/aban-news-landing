#!/usr/bin/env python3
"""Wochenbericht des Spielgeld-Schattenkontos (Krypto) — nur Zahlen aus data/krypto-pilot-schatten.json, nichts erfunden.

    python3 tools/trading/schatten/wochenbericht.py              # Abschnitt auf die Ausgabe
    python3 tools/trading/schatten/wochenbericht.py --schreiben  # hängt ihn an docs/KRYPTO-WOCHENBERICHT.md an (je Stand nur einmal)

Verglichen werden Pilot (alles Futures), Pilot 2.0 (Spot-Long + Parkplatz) und «gekauft und gehalten» (BTC, ETH, je zur Hälfte).
Kürzer als 8 Wochen ist KEIN Urteil: der Bericht sagt das jedes Mal dazu. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-pilot-schatten.json"
BERICHT = ROOT / "docs" / "KRYPTO-WOCHENBERICHT.md"
MIN_WOCHEN = 8
KOPF = ("# Krypto-Wochenbericht (Spielgeld)\n\n"
        "Automatisch erzeugt aus `data/krypto-pilot-schatten.json` (`tools/trading/schatten/wochenbericht.py`). Nur gemessene Zahlen, "
        "vereinfacht: ohne Börsen-Stops und Liquidation. Kürzer als 8 Wochen ist kein Urteil. Keine Anlageberatung.\n")


def prozent(x: float) -> str:
    return f"{x * 100:+.1f} %".replace("-", "−").replace(".", ",")


def einbruch(reihe: list[float]) -> float:
    """Schlimmster Rückgang vom bisherigen Hoch (≤ 0)."""
    hoch, tief = reihe[0], 0.0
    for x in reihe:
        hoch = max(hoch, x)
        tief = min(tief, x / hoch - 1)
    return tief


def tage_zwischen(a: str, b: str) -> int:
    return max(0, (date.fromisoformat(b) - date.fromisoformat(a)).days)


def zeilen(lb: dict) -> list[tuple[str, float, float]]:
    """[(Name, Rendite, schlimmster Einbruch)] — Pilot, Pilot 2.0, BTC, ETH, 50/50 gehalten (nur was die Daten hergeben)."""
    out = []
    for name, key in (("Pilot (alles Futures)", "tage"), ("Pilot 2.0 (Spot-Long + Parkplatz)", "tage_p2")):
        t = lb.get(key) or []
        if len(t) >= 2:
            k = [x["kapital"] for x in t]
            out.append((name, k[-1] / k[0] - 1, einbruch(k)))
    t = lb.get("tage") or []
    kurse = {}
    for m in ("BTC", "ETH"):
        reihe = [x["maerkte"].get(m, {}).get("kurs") for x in t]
        if len(reihe) >= 2 and all(reihe):
            kurse[m] = reihe
            out.append((f"{'Bitcoin' if m == 'BTC' else 'Ethereum'} gehalten", reihe[-1] / reihe[0] - 1, einbruch(reihe)))
    if len(kurse) == 2:
        mix = [0.5 * b / kurse["BTC"][0] + 0.5 * e / kurse["ETH"][0] for b, e in zip(kurse["BTC"], kurse["ETH"])]
        out.append(("50/50 BTC und ETH gehalten", mix[-1] - 1, einbruch(mix)))
    return out


def abschnitt(lb: dict) -> tuple[str, str]:
    """→ (Stand, Markdown-Abschnitt). Zu wenig Tage → Stand '' und ein Satz."""
    t = lb.get("tage") or []
    if len(t) < 2:
        return "", "Noch zu wenig Tage im Schattenkonto für einen Bericht."
    start, stand = t[0]["stand"], t[-1]["stand"]
    tage = tage_zwischen(start, stand)
    z = zeilen(lb)
    md = [f"## Stand {stand}: {tage} Tage seit {start}", "", "| | Rendite | schlimmster Einbruch |", "|---|---:|---:|"]
    md += [f"| {n} | {prozent(r)} | {prozent(e)} |" for n, r, e in z]
    d = {n: r for n, r, _ in z}
    if "Pilot (alles Futures)" in d and "50/50 BTC und ETH gehalten" in d:
        abstand = f"{(d['Pilot (alles Futures)'] - d['50/50 BTC und ETH gehalten']) * 100:+.1f}".replace("-", "−").replace(".", ",")
        md += ["", f"Pilot gegen 50/50 gehalten: {abstand} Prozentpunkte."]
    wochen = tage / 7
    md += ["", (f"Einordnung: nach {wochen:.1f} Wochen zu kurz für ein Urteil (mindestens {MIN_WOCHEN} Wochen, besser mehrere Marktphasen)."
                if wochen < MIN_WOCHEN else
                f"Einordnung: {wochen:.1f} Wochen sind die Mindestdauer, aber noch immer nur eine Marktphase.")]
    pos = ", ".join(f"{m} {v['hebel']:+.2f}×" for m, v in t[-1]["maerkte"].items())
    md += ["", f"Aktuelle Position des Piloten: {pos}.", ""]
    return stand, "\n".join(md)


def schreiben(lb: dict, datei: Path | None = None) -> str:
    """Hängt den Abschnitt an die Berichtsdatei an. → 'geschrieben', 'schon drin' oder 'zu wenig Tage'."""
    datei = datei or BERICHT
    stand, md = abschnitt(lb)
    if not stand:
        return "zu wenig Tage"
    alt = datei.read_text(encoding="utf-8") if datei.exists() else ""
    if f"## Stand {stand}:" in alt:
        return "schon drin"
    datei.parent.mkdir(parents=True, exist_ok=True)
    datei.write_text((alt if alt else KOPF) + "\n" + md, encoding="utf-8")
    return "geschrieben"


def lies(datei: Path | None = None) -> dict:
    datei = datei or LOGBUCH
    try:
        return json.loads(datei.read_text(encoding="utf-8")) if datei.exists() else {}
    except ValueError:
        return {}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--schreiben", action="store_true")
    a = ap.parse_args()
    lb = lies()
    print(abschnitt(lb)[1])
    if a.schreiben:
        print("Bericht:", schreiben(lb))
    return 0


if __name__ == "__main__":
    sys.exit(main())
