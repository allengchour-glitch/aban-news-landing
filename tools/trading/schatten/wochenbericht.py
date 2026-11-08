#!/usr/bin/env python3
"""Wochenbericht des Spielgeld-Schattenkontos (Krypto) — nur Zahlen aus data/krypto-pilot-schatten.json, nichts erfunden.

    python3 tools/trading/schatten/wochenbericht.py              # Abschnitt auf die Ausgabe
    python3 tools/trading/schatten/wochenbericht.py --schreiben  # hängt ihn an docs/KRYPTO-WOCHENBERICHT.md an (je Stand nur einmal)

Verglichen werden Pilot (alles Futures), Pilot 2.0 (Spot-Long + Parkplatz) und «gekauft und gehalten» (BTC, ETH, je zur Hälfte).
Kürzer als 8 Wochen ist KEIN Urteil: der Bericht sagt das jedes Mal dazu. Keine Anlageberatung.
Am Ende steht «Gesundheit der Messreihen»: fehlende, doppelte oder veraltete Tage, ein ausgefallenes Labor, fehlende Satelliten-Kurse (Backlog 6).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-pilot-schatten.json"
SATELLIT = ROOT / "data" / "krypto-satellit-schatten.json"
LABOR = ROOT / "data" / "krypto-scalping-labor.json"
BERICHT = ROOT / "docs" / "KRYPTO-WOCHENBERICHT.md"
MIN_WOCHEN = 8
MAX_ALTER_TAGE = 2            # der Lauf von heute schreibt den Stand von gestern; ein Tag Spielraum für einen verspäteten Zeitplan (GitHub startet hier oft Stunden zu spät)
MAX_ALTER_LABOR_STUNDEN = 48  # das Labor holt verpasste Minuten nach (kein Datenverlust); über zwei Tage ohne Lauf ist trotzdem ein Ausfall des Tageslaufs
MAX_NENNEN = 5                # so viele Tage oder Coins stehen im Wortlaut, der Rest als «…»
KOPF = ("# Krypto-Wochenbericht (Spielgeld)\n\n"
        "Automatisch erzeugt aus `data/krypto-pilot-schatten.json`, dem Satelliten-Schattenbuch und dem Scalping-Labor (`tools/trading/schatten/wochenbericht.py`). Nur gemessene Zahlen, "
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


SAT_NAMEN = {"S1": "Top-10-Regel wie getestet", "S2": "Satellit (ohne Bitcoin und Ether)", "BTC150": "Bitcoin mit Trend 150 (Vergleich)", "BTC": "Bitcoin gehalten (Vergleich)"}


def satellit_abschnitt(sb: dict | None) -> list[str]:
    """Zeilen für den Bericht aus data/krypto-satellit-schatten.json (leer, wenn es noch keinen zweiten Tag gibt)."""
    t = (sb or {}).get("tage") or []
    if len(t) < 2:
        return []
    md = ["", f"### Satelliten-Experiment (Top-10-Regel, Spielgeld), {len(t)} Tage seit {sb.get('start', t[0]['tag'])}", "",
          "| | Rendite | schlimmster Einbruch |", "|---|---:|---:|"]
    for key, name in SAT_NAMEN.items():
        w = [x[key] for x in t if key in x]
        if len(w) >= 2:
            md.append(f"| {name} | {prozent(w[-1] / w[0] - 1)} | {prozent(einbruch(w))} |")
    gehalten = {k: sorted(s[:-4] for s in (sb.get("reihen") or {}).get(k, {}).get("menge", {})) for k in ("S1", "S2")}
    md += ["", "Gehalten: " + "; ".join(f"{k}: {', '.join(v) or 'nur USDT'}" for k, v in gehalten.items()) + ".",
           "Die Regel bestand ihren Test am 13.10.2026 nicht (ab 2022 rund +18 % pro Jahr bei −38 % Einbruch, Bitcoin mit Trend 150 allein +28 % bei −28 %); "
           "hier läuft sie als Vorwärtstest. " + ("Unter 8 Wochen ist das kein Urteil." if len(t) < 56 else "Auch nach 8 Wochen noch kein Beweis.")]
    return md


def labor_abschnitt(lab: dict | None) -> list[str]:
    """Zeilen für den Bericht aus data/krypto-scalping-labor.json (Scalping-Labor, Papier): leer, solange das Labor noch keinen Handel gerechnet hat
    oder das Buch unlesbar ist (ein kaputtes Buch darf den Bericht nie verhindern)."""
    if not lab or not lab.get("maerkte"):
        return []
    try:
        sys.path.insert(0, str(ROOT / "tools" / "trading" / "krypto_bot"))
        import scalping_labor as SL
        mit = [z for z in SL.tabelle(lab) if z["n"]]
        u = SL.urteil(lab)
        de = SL._de
        if not mit:
            return []
        md = ["", f"### Scalping-Labor (Papier, echte Kurse, mit Gebühren), {de(u['tage'])} Tage seit {SL._tag(lab['daten_ab']) if lab.get('daten_ab') else str(lab.get('start') or '?')[:10]}", "",
              "| Markt | Stufe k | Trades | Treffer | Brutto je Trade | Netto je Trade | Prüfstand netto | Summe |", "|---|---:|---:|---:|---:|---:|---:|---:|"]
        for z in mit:
            md.append(f"| {z['markt']} | {de(z['k'])} | {z['n']} | {de(100 * z['treffer'], 0)} % | {de(z['brutto_bp'], 1, True)} bp | {de(z['netto_bp'], 1, True)} bp | "
                      f"{de(z['erw_netto_bp'], 1, True)} bp | {de(z['summe_pct'], 1, True)} % |")
        kosten = sum(z["kosten_bp"] * z["n"] for z in mit) / sum(z["n"] for z in mit)
        md += ["", "Urteil (vorab festgelegt): " + u["text"] + ".",
               f"Kosten je Trade (Gebühren und Schlupf) im Mittel {de(abs(kosten))} bp: sie fressen die Kursbewegung. Summe = Summe aller Trade-Renditen ohne Hebel, nicht der Verlust des Kontos. "
               "Papier, kein Geld im Spiel; der Prüfstand vom 13.10.2026 hatte alle sieben Scalping-Verfahren im Minus gesehen."]
        return md
    except Exception:  # noqa: BLE001
        return []


def _datum(s) -> date | None:
    """ISO-Datum oder Zeitstempel → date, sonst None (nie ein Fehler)."""
    try:
        return date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def _felder(buch, schluessel: str, feld: str) -> list:
    """Das Feld `feld` aller Tageseinträge `buch[schluessel]`. Kein Buch, keine Liste oder ein Eintrag ohne Feld gibt None an dieser Stelle (wird als «unlesbar» gemeldet)."""
    t = buch.get(schluessel) if isinstance(buch, dict) else None
    return [x.get(feld) if isinstance(x, dict) else None for x in t] if isinstance(t, list) else []


def _nennen(werte: list[str]) -> str:
    return ", ".join(werte[:MAX_NENNEN]) + (", …" if len(werte) > MAX_NENNEN else "")


def reihe_pruefen(name: str, staende: list) -> list[str]:
    """Befunde zu einer Tagesreihe (die Datumstexte in der Reihenfolge des Buchs): fehlende Tage, doppelte Tage, falsche Reihenfolge, unlesbare Daten. Leer = lückenlos.
    Fehlende Tage werden aus den sortierten, einmaligen Tagen gerechnet: eine durcheinander geratene, aber vollständige Reihe meldet nur die Reihenfolge, keine Lücken."""
    ds = [d for d in (_datum(s) for s in staende) if d is not None]
    funde = []
    if len(ds) < len(staende):
        n = len(staende) - len(ds)
        funde.append(f"{name}: " + ("1 Eintrag" if n == 1 else f"{n} Einträge") + " ohne lesbares Datum")
    einmal = sorted(set(ds))
    fehlend = [(a + timedelta(days=k)).isoformat() for a, b in zip(einmal, einmal[1:]) for k in range(1, (b - a).days)]
    if fehlend:
        funde.append(f"{name}: " + ("1 Tag fehlt" if len(fehlend) == 1 else f"{len(fehlend)} Tage fehlen") + f" ({_nennen(fehlend)})")
    doppelt = sorted({d.isoformat() for d in ds if ds.count(d) > 1})
    if doppelt:
        funde.append(f"{name}: Tag doppelt eingetragen ({_nennen(doppelt)})")
    if ds != sorted(ds):
        funde.append(f"{name}: Einträge nicht nach Datum geordnet")
    return funde


def alter_pruefen(name: str, staende: list, heute: date) -> list[str]:
    """Ist der jüngste Tag der Reihe zu alt? (MAX_ALTER_TAGE: genau so alt ist noch in Ordnung.)"""
    ds = [d for d in (_datum(s) for s in staende) if d is not None]
    if not ds:
        return []
    tage = (heute - max(ds)).days
    if tage > MAX_ALTER_TAGE:
        return [f"{name}: letzter Eintrag vom {max(ds).isoformat()}, {tage} Tage her (hat der Tageslauf nicht geschrieben?)"]
    return []


def _labor_zeit(lab) -> datetime | None:
    """Zeitpunkt des letzten Labor-Laufs (UTC), None wenn es keinen gibt oder er unlesbar ist."""
    lauf = lab.get("letzter_lauf") if isinstance(lab, dict) else None
    if not isinstance(lauf, dict) or lauf.get("zeit") is None:
        return None
    try:
        z = datetime.fromisoformat(str(lauf["zeit"]).replace("Z", "+00:00"))
    except ValueError:
        return None
    return (z if z.tzinfo else z.replace(tzinfo=timezone.utc)).astimezone(timezone.utc)


def labor_pruefen(lab, jetzt: datetime) -> list[str]:
    """Das Labor hat einen eigenen Takt (verpasste Minuten holt es nach): hier nur, ob der Tageslauf es in den letzten MAX_ALTER_LABOR_STUNDEN Stunden bedient hat, und seine eigenen Hinweise."""
    lauf = lab.get("letzter_lauf") if isinstance(lab, dict) else None
    if not isinstance(lauf, dict):
        return []
    funde = []
    z = _labor_zeit(lab)
    if z is None:
        funde.append("Labor: Zeitstempel des letzten Laufs fehlt oder ist unlesbar")
    elif (jetzt - z).total_seconds() / 3600 > MAX_ALTER_LABOR_STUNDEN:
        funde.append(f"Labor: letzter Lauf vor {(jetzt - z).total_seconds() / 3600:.0f} Stunden ({z:%Y-%m-%d %H:%M} UTC), der Tageslauf hat es nicht bedient?")
    hinweise = lauf.get("hinweise")
    funde += [f"Labor-Hinweis: {h}" for h in (hinweise[:3] if isinstance(hinweise, list) else [])]
    return funde


def satellit_pruefen(sb) -> list[str]:
    """Coins, für die dem Satelliten die Kurse fehlten (steht im Buch als `fehlende_coins`)."""
    f = sb.get("fehlende_coins") if isinstance(sb, dict) else None
    if isinstance(f, list) and f:
        return [f"Satellit: für {len(f)} " + ("Coin" if len(f) == 1 else "Coins") + f" fehlten die Kurse ({_nennen([str(x) for x in f])})"]
    return []


def gesundheit_abschnitt(lb: dict, sb: dict | None = None, lab: dict | None = None, jetzt: datetime | None = None) -> list[str]:
    """Zeilen «Gesundheit der Messreihen»: sind Pilot, Pilot 2.0 und Satellit lückenlos und frisch, lief das Labor, fehlten Kurse? Die Kennzahlen des Berichts rechnen mit den
    vorhandenen Tagen: fehlende Tage würden Rendite und Einbruch stillschweigend verzerren, darum steht der Befund IM Bericht. Ein unlesbares Buch macht daraus nie einen Absturz."""
    jetzt = jetzt or datetime.now(timezone.utc)
    jetzt = jetzt if jetzt.tzinfo else jetzt.replace(tzinfo=timezone.utc)
    kopf = ["", "### Gesundheit der Messreihen", ""]
    try:
        reihen = [(n, r) for n, r in (("Pilot", _felder(lb, "tage", "stand")), ("Pilot 2.0", _felder(lb, "tage_p2", "stand")), ("Satellit", _felder(sb, "tage", "tag"))) if r]
        funde = []
        for name, r in reihen:
            funde += reihe_pruefen(name, r) + alter_pruefen(name, r, jetzt.date())
        funde += satellit_pruefen(sb) + labor_pruefen(lab, jetzt)
        if funde:
            return kopf + ["Auffälligkeiten (die Kennzahlen oben rechnen mit den vorhandenen Tagen; fehlende Tage verzerren Rendite und Einbruch):", ""] + [f"- {f}" for f in funde]
        teile = [f"{n} {len([d for d in map(_datum, r) if d])} Tage bis {max(d for d in map(_datum, r) if d).isoformat()}" for n, r in reihen]
        z = _labor_zeit(lab)
        if z is not None:
            teile.append(f"Labor zuletzt {z:%Y-%m-%d %H:%M} UTC")
        if not teile:
            return kopf + ["Keine Messreihe zum Prüfen."]
        return kopf + ["Alle Messreihen lückenlos und aktuell: " + "; ".join(teile) + "."]
    except Exception:  # noqa: BLE001 — ein kaputtes Buch darf den Bericht nie verhindern
        return kopf + ["Prüfung nicht möglich: die Daten sind unlesbar."]


def abschnitt(lb: dict, sb: dict | None = None, lab: dict | None = None, jetzt: datetime | None = None) -> tuple[str, str]:
    """→ (Stand, Markdown-Abschnitt). Zu wenig Tage → Stand '' und ein Satz. sb: das Satelliten-Schattenbuch, lab: das Scalping-Labor-Buch (beide optional).
    jetzt: die Uhrzeit (UTC) für die Frische-Prüfung der Messreihen; ohne Angabe die echte."""
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
    md += ["", f"Aktuelle Position des Piloten: {pos}."]
    md += satellit_abschnitt(sb)
    md += labor_abschnitt(lab)
    md += gesundheit_abschnitt(lb, sb, lab, jetzt)
    md += [""]
    return stand, "\n".join(md)


def schreiben(lb: dict, datei: Path | None = None, sb: dict | None = None, lab: dict | None = None, jetzt: datetime | None = None) -> str:
    """Hängt den Abschnitt an die Berichtsdatei an. → 'geschrieben', 'schon drin' oder 'zu wenig Tage'."""
    datei = datei or BERICHT
    stand, md = abschnitt(lb, sb, lab, jetzt)
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
    lb, sb, lab = lies(), lies(SATELLIT), lies(LABOR)
    print(abschnitt(lb, sb, lab)[1])
    if a.schreiben:
        print("Bericht:", schreiben(lb, sb=sb, lab=lab))
    return 0


if __name__ == "__main__":
    sys.exit(main())
