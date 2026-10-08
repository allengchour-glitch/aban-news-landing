#!/usr/bin/env python3
"""KI-Trader — Claude schaut jeden Tag nach Tagesschluss auf Bitcoin und Ethereum und entscheidet: long, short oder flach,
mit Begründung. Er handelt NUR im Schattenkonto (kein Auftrag an die Börse) und tritt gegen den Krypto-Pilot an.

Warum nur Schattenkonto:
  • Für Claude gibt es keinen ehrlichen Backtest. Das Modell kennt die Kursgeschichte aus dem Training — jeder «Rückblick»
    wäre ein Blick in die Zukunft. Viele YouTube-Bots zeigen genau solche geschönten Kurven.
  • Das KI-Komitee des KI-Bots kam im ehrlichen Test auf +0,4 % pro Jahr (Bitcoin halten: +13,6 %).
  Darum wird ab dem ersten Lauf vorwärts gemessen: Claude gegen Pilot gegen Halten, mit Gebühren und Funding.

  py tools/trading/krypto_bot/ki_trader.py --lauf      # heutige Einschätzung holen (einmal pro Tag reicht)
  py tools/trading/krypto_bot/ki_trader.py --stand     # Schattenkonto: Claude gegen Pilot und Halten

Braucht einen API-Schlüssel von console.anthropic.com (ANTHROPIC_API_KEY) und `py -m pip install anthropic`.
Modell: KI_TRADER_MODELL (Standard claude-opus-5-5). Lehnt das Modell eine Anfrage ab, übernimmt serverseitig
automatisch ein Ersatzmodell (fallbacks). Die Kosten jedes Laufs werden aus der API-Antwort berechnet und gespeichert.
Logbuch: data/ki-trader.json. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "ki-trader.json"
PILOT_LOGBUCH = ROOT / "data" / "krypto-pilot.json"
MODELL_STANDARD = "claude-opus-5-5"
MIT_FALLBACK = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
PREISE = {"claude-opus-5-5": (4.0, 20.0), "claude-opus-5": (5.0, 25.0), "claude-opus-4-8": (5.0, 25.0),
          "claude-fable-5-1": (10.0, 50.0), "claude-sonnet-5-5": (2.0, 10.0), "claude-sonnet-5": (2.0, 10.0),
          "claude-haiku-5-5": (0.10, 0.50)}  # USD je 1 Mio. Tokens (Eingabe, Ausgabe)
GEBUEHR, FUNDING_TAG = 0.0005, 0.0003     # wie im Pilot-Test: 0,05 % je Umschichtung, 0,01 % je 8 h
COINS = {"btc": "BTC-USD", "eth": "ETH-USD"}

SYSTEM = (
    "Du bist ein vorsichtiger Krypto-Händler. Du bekommst nach Tagesschluss die Lage von Bitcoin und Ethereum und "
    "entscheidest für jeden Coin die Position für den nächsten Tag: eine Zahl von -1 (voll short) bis +1 (voll long), "
    "0 heisst flach. Mehr als 1 ist nicht erlaubt. Jede Änderung kostet 0,05 % Gebühr, Longs zahlen rund 0,03 % Funding "
    "pro Tag, Shorts erhalten es. Entscheide nur aus den gelieferten Zahlen. Schreibe Deutsch, knapp und konkret, "
    "ohne Floskeln. «sicherheit» ist deine Einschätzung von 0 (geraten) bis 1 (sehr sicher)."
)
_COIN_SCHEMA = {"type": "object", "properties": {"position": {"type": "number"}, "begruendung": {"type": "string"},
                                                 "sicherheit": {"type": "number"}},
                "required": ["position", "begruendung", "sicherheit"], "additionalProperties": False}
SCHEMA = {"type": "object", "properties": {"btc": _COIN_SCHEMA, "eth": _COIN_SCHEMA, "kommentar": {"type": "string"}},
          "required": ["btc", "eth", "kommentar"], "additionalProperties": False}


def fmt(x, stellen=0):
    return f"{x:,.{stellen}f}".replace(",", "'")


def lies(pfad=None):
    pfad = pfad or LOGBUCH
    return json.loads(pfad.read_text(encoding="utf-8")) if pfad.exists() else {"version": 1, "entscheide": []}


def schreibe(lb, pfad=None):
    pfad = pfad or LOGBUCH
    pfad.parent.mkdir(exist_ok=True)
    pfad.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


# ───────────────────────── Lagebericht für Claude (nur abgeschlossene Tage) ─────────────────────────
def kennzahlen(reihe):
    p = [x[1] for x in reihe]

    def ver(n):
        return p[-1] / p[-1 - n] - 1 if len(p) > n else None

    def schnitt(n):
        return sum(p[-n:]) / n if len(p) >= n else None

    r = [p[i] / p[i - 1] - 1 for i in range(max(1, len(p) - 30), len(p))]
    vol = math.sqrt(sum(x * x for x in r) / len(r) * 365) if r else None
    hoch = max(p[-365:])
    return {"stand": reihe[-1][0], "schluss": p[-1], "ver": {n: ver(n) for n in (1, 7, 30, 90, 365)},
            "schnitt": {n: schnitt(n) for n in (50, 150, 200)}, "schwankung_30": vol, "unter_hoch_1j": p[-1] / hoch - 1,
            "letzte_30": [round(x) for x in p[-30:]]}


def prozent(x):
    return "—" if x is None else f"{x * 100:+.1f} %"


def lagebericht(reihen, lage_text, frueher):
    """Text für Claude. reihen: {coin: [(tag, schluss), ...]} bis einschliesslich Stand-Tag, nichts danach."""
    stand = min(r[-1][0] for r in reihen.values())
    teile = [f"Stand: Tagesschluss {stand} (UTC). Deine Position gilt ab dem nächsten Tag.\n"]
    for coin, name in (("btc", "Bitcoin"), ("eth", "Ethereum")):
        k = kennzahlen([x for x in reihen[coin] if x[0] <= stand])
        teile.append(
            f"{name}: Schluss {fmt(k['schluss'])} USD · Veränderung 1 T. {prozent(k['ver'][1])}, 7 T. {prozent(k['ver'][7])}, "
            f"30 T. {prozent(k['ver'][30])}, 90 T. {prozent(k['ver'][90])}, 1 Jahr {prozent(k['ver'][365])} · Abstand zum "
            + ", ".join(f"{n}-Tage-Schnitt {prozent(k['schluss'] / s - 1 if s else None)}" for n, s in k["schnitt"].items())
            + f" · Schwankung 30 T. {k['schwankung_30'] * 100:.0f} %/Jahr · unter 1-Jahres-Hoch {prozent(k['unter_hoch_1j'])}\n"
            f"  Letzte 30 Schlusskurse: {', '.join(str(x) for x in k['letzte_30'])}")
    teile.append(f"\nMarkt-Infos (Stand Vortag): {lage_text}")
    if frueher:
        teile.append("\nDeine letzten Positionen: " + "; ".join(
            f"{e['stand']}: BTC {e['btc']['position']:+.2f}, ETH {e['eth']['position']:+.2f}" for e in frueher[-5:]))
    return "\n".join(teile)


# ───────────────────────── Claude fragen ─────────────────────────
def frage_claude(text, client=None, modell=None):
    """→ (antwort-dict oder None, info-dict). Wirft nie; Fehler stehen in info['hinweis']."""
    modell = modell or os.environ.get("KI_TRADER_MODELL") or MODELL_STANDARD
    if client is None:
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or os.environ.get("ANTHROPIC_PROFILE")):
            return None, {"hinweis": "ANTHROPIC_API_KEY fehlt (Schlüssel auf console.anthropic.com anlegen, dann setx ANTHROPIC_API_KEY \"…\")."}
        try:
            import anthropic
        except ImportError:
            return None, {"hinweis": "Paket fehlt: py -m pip install anthropic"}
        client = anthropic.Anthropic()
    extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"} if modell in MIT_FALLBACK else {}
    try:
        r = client.beta.messages.create(
            model=modell, max_tokens=16000, system=SYSTEM, messages=[{"role": "user", "content": text}],
            output_config={"effort": "high", "format": {"type": "json_schema", "schema": SCHEMA}}, **extra)
    except Exception as ex:  # noqa: BLE001 — Netz, Schlüssel, Limit: der Pilot läuft trotzdem weiter
        return None, {"hinweis": f"Claude nicht erreichbar: {type(ex).__name__}: {str(ex)[:160]}"}
    benutzt = getattr(r, "model", modell) or modell
    ein, aus = PREISE.get(benutzt, PREISE.get(modell, (0.0, 0.0)))
    u = r.usage
    info = {"modell": benutzt, "tokens_ein": u.input_tokens, "tokens_aus": u.output_tokens,
            "kosten_usd": round(u.input_tokens / 1e6 * ein + u.output_tokens / 1e6 * aus, 4)}
    if r.stop_reason == "refusal":
        return None, {**info, "hinweis": "Claude hat die Anfrage abgelehnt (auch das Ersatzmodell)."}
    if r.stop_reason == "max_tokens":
        return None, {**info, "hinweis": "Antwort abgeschnitten (max_tokens)."}
    try:
        d = json.loads(next(b.text for b in r.content if b.type == "text"))
    except (StopIteration, ValueError) as ex:
        return None, {**info, "hinweis": f"Antwort nicht lesbar: {type(ex).__name__}"}
    for coin in ("btc", "eth"):
        d[coin]["position"] = round(max(-1.0, min(1.0, float(d[coin]["position"]))), 2)
        d[coin]["sicherheit"] = round(max(0.0, min(1.0, float(d[coin]["sicherheit"]))), 2)
    return d, info


# ───────────────────────── Schattenkonto ─────────────────────────
def kurve(positionen, kurse, start, funding=True):
    """Kontowert ab `start` (1.0). positionen {Tag: Position}: am Schluss von Tag t entschieden, gilt bis Schluss t+1.
    Fehlt ein Tag, bleibt die Position. Gebühr je Umschichtung, Funding (Long zahlt, Short erhält)."""
    tage = sorted(t for t in kurse if t >= start)
    if not tage:
        return []
    w, pos, out = 1.0, 0.0, [(tage[0], 1.0)]
    for t0, t1 in zip(tage, tage[1:]):
        neu = positionen.get(t0, pos)
        w *= 1 - abs(neu - pos) * GEBUEHR
        pos = neu
        w *= 1 + pos * (kurse[t1] / kurse[t0] - 1) - (pos * FUNDING_TAG if funding else 0.0)
        out.append((t1, w))
    return out


def vergleich(ki, pilot_entscheide, kurse):
    """Claude, Pilot und Halten (je 50 % BTC und ETH) ab Claudes erstem Entscheid. kurse: {coin: {Tag: Schluss}}."""
    if not ki["entscheide"]:
        return {}
    start = ki["entscheide"][0]["stand"]
    pos_ki = {c: {e["stand"]: e[c]["position"] for e in ki["entscheide"]} for c in COINS}
    pos_pi = {c: {e["stand"]: e["hebel"] for e in pilot_entscheide if e.get("markt", "BTC").lower() == c} for c in COINS}
    # Pilot-Positionen vor Claudes Start zählen als Ausgangslage
    for c in COINS:
        vorher = [e for e in pilot_entscheide if e.get("markt", "BTC").lower() == c and e["stand"] < start]
        if vorher:
            pos_pi[c].setdefault(start, pos_pi[c].get(vorher[-1]["stand"], vorher[-1]["hebel"]))

    def mix(pos, funding=True):
        a, b = (kurve(pos[c], kurse[c], start, funding) for c in ("btc", "eth"))
        tage_b = dict(b)
        return [(t, round(0.5 * w + 0.5 * tage_b[t], 6)) for t, w in a if t in tage_b]

    return {"Claude": mix(pos_ki), "Pilot": mix(pos_pi), "Halten": mix({c: {start: 1.0} for c in COINS}, funding=False)}


def kurse_laden(offline=False, jetzt=None):
    import lern_bot as L
    heute = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    out = {}
    for coin, sym in COINS.items():
        try:
            reihe = L.kurse(sym, offline)
        except Exception:  # noqa: BLE001
            reihe = L.kurse(sym, True)
        out[coin] = [tuple(x) for x in reihe if x[0] < heute]
    return out


def pilot_entscheide():
    return json.loads(PILOT_LOGBUCH.read_text(encoding="utf-8")).get("entscheide", []) if PILOT_LOGBUCH.exists() else []


def stand_text(ki, vgl):
    if not ki["entscheide"]:
        return "KI-Trader: noch keine Einschätzung — erst --lauf."
    e = ki["entscheide"][-1]

    def richtung(x):
        return "LONG" if x > 0 else "SHORT" if x < 0 else "FLACH"

    t = (f"🤖 Claude {e['stand']} (Schattenkonto)\n"
         f"BTC {richtung(e['btc']['position'])} {abs(e['btc']['position']):.2f} — {e['btc']['begruendung']}\n"
         f"ETH {richtung(e['eth']['position'])} {abs(e['eth']['position']):.2f} — {e['eth']['begruendung']}\n"
         f"{e['kommentar']}")
    if vgl and len(vgl["Claude"]) > 1:
        t += f"\nSeit {vgl['Claude'][0][0]}: " + " · ".join(f"{n} {(v[-1][1] - 1) * 100:+.1f} %" for n, v in vgl.items())
    kosten = sum(x.get("kosten_usd", 0) for x in ki["entscheide"])
    return t + f"\nAPI-Kosten bisher: {kosten:.2f} USD · Keine Anlageberatung."


def lauf(neu=False, client=None, jetzt=None, logbuch=None, kurse=None, lage_text=None, push=True):
    pfad = logbuch or LOGBUCH
    ki = lies(pfad)
    reihen = kurse or kurse_laden(jetzt=jetzt)
    stand = min(r[-1][0] for r in reihen.values())
    if ki["entscheide"] and ki["entscheide"][-1]["stand"] == stand and not neu:
        print(f"KI-Trader: Einschätzung für {stand} liegt schon vor.")
        return ki["entscheide"][-1]
    if lage_text is None:
        try:
            import infos as I
            lage_text = I.text(I.lagebild())
        except Exception:  # noqa: BLE001
            lage_text = "nicht verfügbar"
    d, info = frage_claude(lagebericht(reihen, lage_text, ki["entscheide"]), client)
    if d is None:
        print("KI-Trader: " + info["hinweis"])
        return None
    e = {"stand": stand, "zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), **info, **d,
         "kurse": {c: reihen[c][-1][1] for c in COINS}}
    ki["entscheide"] = [x for x in ki["entscheide"] if x["stand"] != stand] + [e]
    schreibe(ki, pfad)
    vgl = vergleich(ki, pilot_entscheide(), {c: dict(reihen[c]) for c in COINS})
    t = stand_text(ki, vgl)
    print(t)
    if push:
        import signale as SG
        SG.push(t)
    return e


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--neu", action="store_true", help="heutige Einschätzung neu holen")
    ap.add_argument("--stand", action="store_true")
    a = ap.parse_args()
    if a.lauf:
        lauf(a.neu)
    elif a.stand:
        ki = lies()
        reihen = kurse_laden(offline=True)
        print(stand_text(ki, vergleich(ki, pilot_entscheide(), {c: dict(reihen[c]) for c in COINS})))
    else:
        ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
