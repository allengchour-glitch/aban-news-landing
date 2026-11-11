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
Modelle nach Aufgabe (Stufen, das spart Geld): die echte Tages-Entscheidung macht Opus (KI_MODELL_ENTSCHEID, alt KI_TRADER_MODELL,
Standard claude-opus-5-5). An ruhigen Tagen fragt er zuerst Haiku (KI_MODELL_RUHETAG, Standard claude-haiku-5-5) und fragt Opus nur,
wenn Haiku unsicher ist oder eine Position stark verschieben will. Calls aus Telegram abschreiben macht Haiku (KI_MODELL_CALLS), bei
einem unstimmigen Ergebnis liest Opus nach (KI_MODELL_CALLS_ZWEIT). `setx KI_SPAREN aus` = alles wieder auf dem grossen Modell.
Lehnt Opus eine Anfrage ab, übernimmt serverseitig automatisch ein Ersatzmodell (fallbacks; Haiku hat keins). Die Kosten jeder
Anfrage werden aus der API-Antwort berechnet und im Kostenbuch data/ki-kosten.json gebucht (das Cockpit zeigt sie live).
Logbuch: data/ki-trader.json. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import date, datetime, timezone
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
MODELL_GUENSTIG = "claude-haiku-5-5"
KOSTEN_BUCH = ROOT / "data" / "ki-kosten.json"
KOSTEN_ZEILEN, KOSTEN_TAGE = 300, 60       # so viele einzelne Anfragen und Tagessummen bleiben im Kostenbuch (die Summen je Modell bleiben ganz)
# Wer macht was? Aufgabe → (Umgebungsvariablen in Rangfolge, Vorgabe, Aufwand). Opus nur, wo Urteil gebraucht wird (die echte
# Tages-Entscheidung, der Zweitblick bei Zweifeln); Haiku für Routine (ruhige Tage bestätigen, Calls abschreiben).
AUFGABEN = {
    "entscheid": (("KI_MODELL_ENTSCHEID", "KI_TRADER_MODELL"), MODELL_STANDARD, "high"),
    "ruhetag": (("KI_MODELL_RUHETAG",), MODELL_GUENSTIG, "low"),
    "calls": (("KI_MODELL_CALLS", "CALLS_CLAUDE_MODELL"), MODELL_GUENSTIG, "low"),
    "calls_zweit": (("KI_MODELL_CALLS_ZWEIT",), MODELL_STANDARD, "low"),
}
# Ruhetag (rein gerechnet, ohne Modell): beide Coins höchstens so weit bewegt, kein 50-/150-/200-Tage-Schnitt gekreuzt;
# Haiku gilt nur, wenn er sich bei beiden Coins mindestens so sicher ist und keine Position weiter verschiebt als dies.
RUHE_TAG, RUHE_WOCHE, RUHE_ALTER_TAGE = 0.02, 0.08, 3
RUHE_MIN_SICHER, RUHE_MAX_SPRUNG = 0.6, 0.25
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


# ───────────────────────── Welches Modell, was kostet es (Stufen, Kostenbuch) ─────────────────────────
def sparen_aus(env=None):
    """KI_SPAREN=aus (auch 0, nein, off) → alles wieder auf dem grossen Modell: der Rückweg in einem Wort."""
    return ((os.environ if env is None else env).get("KI_SPAREN") or "").strip().lower() in ("aus", "0", "nein", "off")


def modell_fuer(aufgabe, env=None):
    """Modell einer Aufgabe: Umgebung (neuer Name vor altem), sonst die Vorgabe. Bei KI_SPAREN=aus nimmt jede Aufgabe das Entscheid-Modell."""
    env = os.environ if env is None else env
    if aufgabe != "entscheid" and sparen_aus(env):
        aufgabe = "entscheid"
    namen, vorgabe, _ = AUFGABEN[aufgabe]
    for n in namen:
        wert = (env.get(n) or "").strip()
        if wert:
            return wert
    return vorgabe


def aufwand_fuer(aufgabe):
    return AUFGABEN[aufgabe][2]


def kurzname(modell):
    m = (modell or "").lower()
    for n in ("haiku", "sonnet", "opus", "fable", "mythos"):
        if n in m:
            return n.capitalize()
    return str(modell or "?")


def usd_auf(modell, ein, aus):
    """Was diese Tokens auf `modell` kosten würden (Preisliste PREISE; unbekanntes Modell = 0)."""
    e, a = PREISE.get(modell, (0.0, 0.0))
    return ein / 1e6 * e + aus / 1e6 * a


def lies_kosten(pfad=None):
    pfad = Path(pfad) if pfad else KOSTEN_BUCH
    try:
        b = json.loads(pfad.read_text(encoding="utf-8")) if pfad.exists() else {}
    except (OSError, ValueError):
        b = {}
    b = b if isinstance(b, dict) else {}
    b["version"] = 1
    for k, leer in (("summen", {}), ("tage", {}), ("zeilen", [])):
        if not isinstance(b.get(k), type(leer)):
            b[k] = leer
    return b


def kosten_buchen(aufgabe, info, pfad=None, jetzt=None):
    """Bucht eine Anfrage (Modell, Tokens, Kosten) ins Kostenbuch; das Cockpit zeigt es live. Wirft nie — ein Buchungsfehler darf nie
    eine Entscheidung kosten. `usd_opus` = was dieselben Tokens auf dem grossen Modell gekostet hätten (Annahme «gleiche Token»)."""
    try:
        modell = (info or {}).get("modell")
        if not modell:
            return False
        pfad = Path(pfad) if pfad else KOSTEN_BUCH
        jetzt = jetzt or datetime.now(timezone.utc)
        ein, aus = int(info.get("tokens_ein") or 0), int(info.get("tokens_aus") or 0)
        usd = float(info.get("kosten_usd") or 0.0)
        opus = usd_auf(MODELL_STANDARD, ein, aus)
        b = lies_kosten(pfad)
        s = b["summen"].setdefault(modell, {"n": 0, "ein": 0, "aus": 0, "usd": 0.0, "usd_opus": 0.0})
        s["n"] += 1
        s["ein"] += ein
        s["aus"] += aus
        s["usd"], s["usd_opus"] = round(s["usd"] + usd, 6), round(s["usd_opus"] + opus, 6)
        t = b["tage"].setdefault(jetzt.date().isoformat(), {"n": 0, "usd": 0.0, "usd_opus": 0.0})
        t["n"] += 1
        t["usd"], t["usd_opus"] = round(t["usd"] + usd, 6), round(t["usd_opus"] + opus, 6)
        for alt in sorted(b["tage"])[:-KOSTEN_TAGE]:
            del b["tage"][alt]
        b["zeilen"] = (b["zeilen"] + [{"zeit": jetzt.isoformat(timespec="seconds"), "aufgabe": aufgabe, "modell": modell,
                                       "ein": ein, "aus": aus, "usd": round(usd, 6)}])[-KOSTEN_ZEILEN:]
        pfad.parent.mkdir(parents=True, exist_ok=True)
        tmp = pfad.with_name(pfad.name + ".tmp")
        tmp.write_text(json.dumps(b, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        os.replace(tmp, pfad)  # atomar: das Cockpit liest nie eine halbe Datei
        return True
    except Exception:  # noqa: BLE001
        return False


def _zahl(x, standard=0.0):
    return float(x) if isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) else standard


def kosten_uebersicht(buch, jetzt=None):
    """Fürs Cockpit (nur rechnen, nie schreiben): Anfragen und Kosten je Modell, heute, Summe, was dieselben Tokens auf dem grossen Modell
    gekostet hätten (`gespart`; «gleiche Token» ist eine Annahme, Opus denkt meist länger, die Ersparnis ist eher grösser), die letzten
    Anfragen. Wirft nie; ein leeres oder kaputtes Buch gibt n = 0."""
    b = buch if isinstance(buch, dict) else {}
    summen = b.get("summen") if isinstance(b.get("summen"), dict) else {}
    modelle, n_alle, n_billig, usd, opus = [], 0, 0, 0.0, 0.0
    grenze = PREISE[MODELL_STANDARD][0]
    for m, s in summen.items():
        if not isinstance(s, dict):
            continue
        n = int(_zahl(s.get("n")))
        modelle.append({"modell": str(m), "kurz": kurzname(m), "n": n, "ein": int(_zahl(s.get("ein"))), "aus": int(_zahl(s.get("aus"))),
                        "usd": round(_zahl(s.get("usd")), 6)})
        n_alle += n
        usd += _zahl(s.get("usd"))
        opus += _zahl(s.get("usd_opus"))
        if PREISE.get(m, (grenze, 0))[0] < grenze:
            n_billig += n
    modelle.sort(key=lambda x: (-x["usd"], x["modell"]))
    heute_tag = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    t = (b.get("tage") or {}).get(heute_tag) if isinstance(b.get("tage"), dict) else None
    t = t if isinstance(t, dict) else {}
    zeilen = [z for z in (b.get("zeilen") or []) if isinstance(z, dict)] if isinstance(b.get("zeilen"), list) else []
    letzte = [{"zeit": str(z.get("zeit", "")), "aufgabe": str(z.get("aufgabe", "")), "kurz": kurzname(z.get("modell")),
               "usd": round(_zahl(z.get("usd")), 6)} for z in reversed(zeilen[-6:])]
    return {"modelle": modelle, "n": n_alle, "usd": round(usd, 6), "usd_opus": round(opus, 6), "gespart": round(opus - usd, 6),
            "guenstig_anteil": (n_billig / n_alle) if n_alle else None,
            "heute": {"n": int(_zahl(t.get("n"))), "usd": round(_zahl(t.get("usd")), 6)}, "letzte": letzte}


# ───────────────────────── Ruhetag und Stufen ─────────────────────────
def ruhig(reihen, frueher):
    """Ist heute ein Ruhetag? → (ja/nein, Satz). Rein gerechnet, kein Modell: beide Coins höchstens RUHE_TAG am Tag und RUHE_WOCHE in 7 Tagen
    bewegt, kein 50-/150-/200-Tage-Schnitt gekreuzt, und es gibt eine frühere Einschätzung von höchstens RUHE_ALTER_TAGE Tagen vorher."""
    stand = min(r[-1][0] for r in reihen.values())
    vorher = [e for e in frueher if e.get("stand") and e["stand"] < stand]
    if not vorher:
        return False, "noch keine frühere Einschätzung"
    try:
        alter = (date.fromisoformat(stand) - date.fromisoformat(vorher[-1]["stand"])).days
    except ValueError:
        return False, "Datum der letzten Einschätzung nicht lesbar"
    if alter > RUHE_ALTER_TAGE:
        return False, f"letzte Einschätzung {alter} Tage her"
    teile = []
    for coin, name in (("btc", "Bitcoin"), ("eth", "Ethereum")):
        reihe = [x for x in reihen[coin] if x[0] <= stand]
        if len(reihe) < 9:
            return False, f"zu wenig Kurse für {name}"
        k, kv = kennzahlen(reihe), kennzahlen(reihe[:-1])
        t1, t7 = k["ver"][1], k["ver"][7]
        if abs(t1) > RUHE_TAG:
            return False, f"{name} {prozent(t1)} an einem Tag"
        if abs(t7) > RUHE_WOCHE:
            return False, f"{name} {prozent(t7)} in 7 Tagen"
        for n in (50, 150, 200):
            heute_s, gestern_s = k["schnitt"][n], kv["schnitt"][n]
            if heute_s and gestern_s and (k["schluss"] > heute_s) != (kv["schluss"] > gestern_s):
                return False, f"{name} kreuzt den {n}-Tage-Schnitt"
        teile.append(f"{name} {prozent(t1)} (1 T.), {prozent(t7)} (7 T.)")
    return True, "ruhig: " + "; ".join(teile) + "; kein Schnitt gekreuzt"


def zweifel(d, vorher):
    """Warum Haiku an einem Ruhetag nicht allein entscheiden darf → ein Satz, sonst None."""
    for coin, name in (("btc", "Bitcoin"), ("eth", "Ethereum")):
        try:
            sicher, neu, alt = d[coin]["sicherheit"], d[coin]["position"], vorher[coin]["position"]
        except (KeyError, TypeError):
            return f"frühere Position von {name} nicht lesbar"
        if sicher < RUHE_MIN_SICHER:
            return f"nur {sicher:.2f} sicher bei {name}"
        if abs(neu - alt) > RUHE_MAX_SPRUNG + 1e-9:
            return f"will {name} um {abs(neu - alt):.2f} verschieben"
    return None


def entscheide(reihen, lage_text, frueher, client=None, buch=None):
    """Die Tages-Entscheidung in Stufen. Ruhiger Tag → erst Haiku; ist er unsicher, will er stark verschieben oder scheitert er → Opus.
    Jeder andere Tag geht gleich an Opus. → (antwort oder None, info mit `stufe` «haiku» oder «opus»). Die Kosten beider Anfragen stehen in `kosten_usd`."""
    text = lagebericht(reihen, lage_text, frueher)
    gross, klein = modell_fuer("entscheid"), modell_fuer("ruhetag")
    ruhetag, grund = ruhig(reihen, frueher)
    eskaliert, kosten_klein = None, 0.0
    if ruhetag and klein != gross:
        d, info = frage_claude(text, client, modell=klein, aufgabe="ruhetag", buch=buch)
        kosten_klein = float(info.get("kosten_usd") or 0.0)
        if d is not None:
            stand = min(r[-1][0] for r in reihen.values())
            z = zweifel(d, [e for e in frueher if e.get("stand") and e["stand"] < stand][-1])
            if z is None:
                return d, {**info, "stufe": "haiku", "ruhe": grund}
            eskaliert = {"von": klein, "grund": f"Haiku {z}"}
        else:
            eskaliert = {"von": klein, "grund": str(info.get("hinweis", "keine Antwort"))[:160]}
    d, info = frage_claude(text, client, modell=gross, aufgabe="entscheid", buch=buch)
    info = {**info, "stufe": "opus"}
    if eskaliert:
        info["eskaliert"] = eskaliert
        info["kosten_usd"] = round(float(info.get("kosten_usd") or 0.0) + kosten_klein, 6)
    return d, info


# ───────────────────────── Claude fragen ─────────────────────────
def frage_claude(text, client=None, modell=None, aufgabe="entscheid", buch=None):
    """→ (antwort-dict oder None, info-dict). Wirft nie; Fehler stehen in info['hinweis']. `aufgabe` wählt Modell und Aufwand (AUFGABEN),
    `buch` = Pfad des Kostenbuchs (None = nicht buchen, so buchen Tests nie ins echte Buch)."""
    modell = modell or modell_fuer(aufgabe)
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
            output_config={"effort": aufwand_fuer(aufgabe), "format": {"type": "json_schema", "schema": SCHEMA}}, **extra)
    except Exception as ex:  # noqa: BLE001 — Netz, Schlüssel, Limit: der Pilot läuft trotzdem weiter
        return None, {"hinweis": f"Claude nicht erreichbar: {type(ex).__name__}: {str(ex)[:160]}"}
    benutzt = getattr(r, "model", modell) or modell
    ein, aus = PREISE.get(benutzt, PREISE.get(modell, (0.0, 0.0)))
    u = r.usage
    info = {"modell": benutzt, "tokens_ein": u.input_tokens, "tokens_aus": u.output_tokens,
            "kosten_usd": round(u.input_tokens / 1e6 * ein + u.output_tokens / 1e6 * aus, 6)}
    if buch is not None:  # auch abgelehnte und abgeschnittene Anfragen kosten Tokens
        kosten_buchen(aufgabe, info, buch)
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

    def mix(pos, funding=True, gewicht=None, taeglich=True):
        """taeglich=True: jeden Tag neu auf die Gewichte aufgeteilt — so bemisst der Pilot live jede Position aus dem
        ganzen Konto. taeglich=False: einmal gekauft und liegen gelassen (echtes Halten)."""
        gewicht = gewicht or {"btc": 0.5, "eth": 0.5}
        a, b = (kurve(pos[c], kurse[c], start, funding) for c in ("btc", "eth"))
        tage_b = dict(b)
        paare = [(t, w, tage_b[t]) for t, w in a if t in tage_b]
        if not taeglich:
            return [(t, round(gewicht["btc"] * wa + gewicht["eth"] * wb, 6)) for t, wa, wb in paare]
        out, w = [], 1.0
        for i, (t, wa, wb) in enumerate(paare):
            if i:
                _, va, vb = paare[i - 1]
                w *= 1 + gewicht["btc"] * (wa / va - 1) + gewicht["eth"] * (wb / vb - 1)
            out.append((t, round(w, 6)))
        return out

    # Der Pilot teilt sein Konto auf die Märkte auf, die er WIRKLICH handelt (KRYPTO_PILOT_MAERKTE=BTC → alles in Bitcoin)
    seit = [e for e in pilot_entscheide if e["stand"] >= start] or pilot_entscheide
    aktiv = {e.get("markt", "BTC").lower() for e in seit} & set(COINS) or set(COINS)
    g_pi = {c: (1 / len(aktiv) if c in aktiv else 0.0) for c in COINS}
    return {"Claude": mix(pos_ki), "Pilot": mix(pos_pi, gewicht=g_pi),
            "Halten": mix({c: {start: 1.0} for c in COINS}, funding=False, taeglich=False)}


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

    wer = kurzname(e.get("modell")) + (" (ruhiger Tag)" if e.get("stufe") == "haiku" else " (nach Haiku-Vorprüfung)" if e.get("eskaliert") else "")
    t = (f"🤖 Claude {e['stand']} (Schattenkonto · {wer})\n"
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
    d, info = entscheide(reihen, lage_text, ki["entscheide"], client, buch=KOSTEN_BUCH if logbuch is None else Path(logbuch).with_name(KOSTEN_BUCH.name))
    if d is None:
        print("KI-Trader: " + info["hinweis"])
        # Fürs Cockpit: der GRUND steht dann in der Gesundheits-Zeile («Schlüssel ungültig», «Guthaben leer» …), nicht nur im Log. Wirft nie.
        try:
            ki["letzter_fehler"] = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "stand": stand, "hinweis": str(info.get("hinweis", ""))[:300]}
            schreibe(ki, pfad)
        except Exception:  # noqa: BLE001
            pass
        if push:  # nie still: sonst fehlen dem Schattenkonto wochenlang Daten, ohne dass es jemand merkt
            import signale as SG
            SG.push(f"⚠️ KI-Trader: keine Einschätzung für {stand} — {info['hinweis']}")
        return None
    e = {"stand": stand, "zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), **info, **d,
         "kurse": {c: reihen[c][-1][1] for c in COINS}}
    ki["entscheide"] = [x for x in ki["entscheide"] if x["stand"] != stand] + [e]
    ki.pop("letzter_fehler", None)              # der letzte Versuch hat geklappt
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
        return 0 if lauf(a.neu) is not None else 3  # 3 = Warnung (schon gemeldet), für krypto-auto.bat
    elif a.stand:
        ki = lies()
        reihen = kurse_laden(offline=True)
        print(stand_text(ki, vergleich(ki, pilot_entscheide(), {c: dict(reihen[c]) for c in COINS})))
    else:
        ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
