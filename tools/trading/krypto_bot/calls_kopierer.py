#!/usr/bin/env python3
"""Telegram-Calls kopieren — erst im Schattenkonto, dann (wenn du willst) im Testnetz, echtes Geld nur nach bestandener Prüfung.

  py tools/trading/krypto_bot/calls_kopierer.py --stand        # Schatten-Bilanz je Gruppe + letzte Calls
  py tools/trading/krypto_bot/calls_kopierer.py --pflegen      # offene Calls nachführen (macht calls_leser --live von selbst)
  py tools/trading/krypto_bot/calls_kopierer.py --probe "LONG #SOLUSDT Entry 145-148 TP 152/156 SL 140"   # was würde passieren?

Ablauf: calls_leser.py --live gibt jede neue Gruppen-Nachricht hierher. Ist sie ein Call (calls_parser), wird er
1. IMMER im Schattenkonto mitgerechnet (echte Binance-Kurse, gleiche Regeln wie calls_pruefung.py) und
2. nur dann an der Börse kopiert, wenn alles stimmt:
   CALLS_MODUS = schatten (Standard, nie Aufträge) | testnetz | echtgeld
   - testnetz: Futures-Schlüssel des Testnetzes (wie der Pilot), jede Gruppe (Spielgeld).
     CALLS_NUR_GEPRUEFT=1 = auch im Testnetz nur Gruppen, die die Prüfung bestanden haben.
   - echtgeld: Echtgeld-Freigabe wie beim Pilot (BINANCE_FUTURES_TESTNET=false UND KI_BOT_ECHTGELD) UND die Gruppe steht
     in CALLS_ECHTGELD_GRUPPEN UND hat in data/calls-pruefung.json «kopierwürdig» (Prüfung höchstens 30 Tage alt).
Sicherungen beim Kopieren: Börsen-Stop (wie angegeben, sonst 10 %) sofort nach dem Einstieg — klappt der Stop nicht, wird
die Position SOFORT wieder geschlossen. Ziele als Teil-Gewinnmitnahmen an der Börse. 1 % Risiko je Call (CALLS_RISIKO,
höchstens 3 %), Hebel höchstens 2× (auch wenn der Call 50× sagt), höchstens CALLS_ANTEIL (25 %) des Kontos und
CALLS_MAX_AUFTRAG (1000 USDT) je Call, höchstens CALLS_MAX_OFFEN (3) Calls gleichzeitig, je Coin nur einer. Bitcoin und
Ethereum gehören dem Pilot und werden nur im Schatten gerechnet. Not-Aus (stop.bat, Cockpit, /stop) schliesst auch die
kopierten Calls; Pause = keine neuen. Nach 7 Tagen wird ein Call geschlossen. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import calls_parser as CP  # noqa: E402
import calls_pruefung as CQ  # noqa: E402

ROOT = HIER.parents[2]
BUCH = ROOT / "data" / "calls-kopierer.json"
PRUEFUNG = ROOT / "data" / "calls-pruefung.json"
STOP = HIER.parent / "ki_bot" / "STOP"
PAUSE = HIER.parent / "ki_bot" / "PAUSE"
PILOT_SYMBOLE = {"BTCUSDT", "ETHUSDT"}
HEBEL = 2.0
WIEDERHOLUNG_MS = 6 * 3600 * 1000


def einstellungen(env=None):
    env = os.environ if env is None else env

    def zahl(name, standard, tief, hoch):
        try:
            return max(tief, min(hoch, float((env.get(name) or str(standard)).replace(",", ".").replace("'", ""))))
        except ValueError:
            return standard
    modus = (env.get("CALLS_MODUS") or "schatten").strip().lower()
    return {"modus": modus if modus in ("schatten", "testnetz", "echtgeld") else "schatten",
            "risiko": zahl("CALLS_RISIKO", 0.01, 0.001, 0.03), "anteil": zahl("CALLS_ANTEIL", 0.25, 0.01, 0.5),
            "max_auftrag": zahl("CALLS_MAX_AUFTRAG", 1000, 20, 1e7), "max_offen": int(zahl("CALLS_MAX_OFFEN", 3, 1, 10)),
            "echt_gruppen": {g.strip() for g in (env.get("CALLS_ECHTGELD_GRUPPEN") or "").split(",") if g.strip()},
            "nur_geprueft": env.get("CALLS_NUR_GEPRUEFT") == "1", "push": env.get("CALLS_PUSH", "1") != "0"}


# ───────────────────────── Buch (atomar, mit Sperre) ─────────────────────────
def lies(datei=None):
    datei = Path(datei) if datei else BUCH
    try:
        b = json.loads(datei.read_text(encoding="utf-8")) if datei.exists() else {}
        if not isinstance(b, dict):
            raise ValueError
    except (ValueError, UnicodeDecodeError):
        datei.replace(datei.with_name(datei.name + f".kaputt-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}"))
        b = {}
    b.setdefault("calls", [])
    b["version"] = 1
    return b


def schreiben(b, datei=None):
    datei = Path(datei) if datei else BUCH
    datei.parent.mkdir(parents=True, exist_ok=True)
    tmp = datei.with_name(datei.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(b, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, datei)


def _push(text, push):
    if push is False:
        return
    if callable(push):
        return push(text)
    import signale as SG
    SG.push(text + "\nKeine Anlageberatung.")


def fmt_preis(p):
    return f"{p:.8g}" if p is not None else "—"


def call_text(c):
    return (f"{c['richtung']} {c['symbol']} · Einstieg {'–'.join(fmt_preis(p) for p in c['einstieg']) or 'Markt'} · "
            f"Ziele {', '.join(fmt_preis(z) for z in c['ziele']) or '—'} · Stop {fmt_preis(c['stop'])}"
            + (f" · Gruppe sagt {c['hebel']}×" if c.get("hebel") else ""))


# ───────────────────────── Freigabe ─────────────────────────
def pruefung_urteil(gruppe, datei=None, jetzt=None):
    datei = Path(datei) if datei else PRUEFUNG
    if not datei.exists():
        return None, "noch keine Prüfung (calls_pruefung.py)"
    try:
        p = json.loads(datei.read_text(encoding="utf-8"))
    except ValueError:
        return None, "Prüfungsdatei unlesbar"
    g = p.get("gruppen", {}).get(str(gruppe))
    if not g:
        return None, "Gruppe nicht geprüft"
    alter = ((jetzt or datetime.now(timezone.utc)) - datetime.fromisoformat(p["stand"])).days
    if alter > 30:
        return None, f"Prüfung {alter} Tage alt — neu prüfen"
    return g.get("urteil"), "; ".join(g.get("gruende", []))


def darf_kopieren(rec, cfg, bf_cfg, buch, pruefung=None, stop=None, pause=None):
    """→ (True, "") oder (False, Grund). Reine Logik (testbar)."""
    c = rec["call"]
    if cfg["modus"] == "schatten":
        return False, "Schattenkonto (CALLS_MODUS=schatten)"
    if (STOP.exists() if stop is None else stop):
        return False, "Not-Aus aktiv"
    if (PAUSE.exists() if pause is None else pause):
        return False, "Auto-Handel aus (Pause)"
    if not bf_cfg["key"] or not bf_cfg["secret"]:
        return False, "keine Futures-Schlüssel"
    if bf_cfg.get("url_fehler"):
        return False, bf_cfg["url_fehler"]
    if cfg["modus"] == "echtgeld" and not bf_cfg["echtgeld"]:
        return False, "CALLS_MODUS=echtgeld, aber die Echtgeld-Freigabe des Futures-Kontos fehlt"
    if cfg["modus"] == "testnetz" and bf_cfg["echtgeld"]:
        return False, "CALLS_MODUS=testnetz, aber die Schlüssel sind für echtes Geld — nichts gemacht"
    urteil, grund = pruefung if pruefung is not None else pruefung_urteil(rec["gruppe"])
    if cfg["modus"] == "echtgeld":
        if rec["gruppe"] not in cfg["echt_gruppen"]:
            return False, "Gruppe nicht in CALLS_ECHTGELD_GRUPPEN"
        if urteil != "kopierwürdig":
            return False, f"Gruppe hat die Prüfung nicht bestanden ({grund})"
    elif cfg["nur_geprueft"] and urteil != "kopierwürdig":
        return False, f"CALLS_NUR_GEPRUEFT=1 und Prüfung nicht bestanden ({grund})"
    if c["symbol"] in PILOT_SYMBOLE:
        return False, f"{c['symbol']} handelt der Pilot — nur Schatten"
    if not c.get("stimmig", True):
        return False, "Call widersprüchlich (Stop/Einstieg/Ziele passen nicht zusammen)"
    aktiv = [r for r in buch["calls"] if r.get("auftrag") is not None and r.get("status") in ("wartet", "offen")]
    if len(aktiv) >= cfg["max_offen"]:
        return False, f"schon {len(aktiv)} kopierte Calls offen (CALLS_MAX_OFFEN)"
    if any(r["call"]["symbol"] == c["symbol"] for r in aktiv):
        return False, f"{c['symbol']} ist schon mit einem anderen Call belegt"
    return True, ""


def groesse(cfg, wallet, ref, stop, regeln):
    """Menge für 1 % Risiko bis zum Stop, gedeckelt (2× Hebel auf CALLS_ANTEIL des Kontos, CALLS_MAX_AUFTRAG). 0 = zu klein."""
    abstand = abs(ref - stop) / ref
    if abstand <= 0 or wallet <= 0:
        return 0.0
    wert = min(wallet * cfg["risiko"] / abstand, wallet * cfg["anteil"] * HEBEL, cfg["max_auftrag"])
    import broker_futures as BF
    menge = BF.runde(wert / ref, regeln["step"])
    if menge < regeln["min_qty"] or menge * ref < max(regeln["min_notional"], BF.MIN_AUFTRAG):
        return 0.0
    return menge


# ───────────────────────── Börse ─────────────────────────
def schutz_setzen(rec, c):
    """Stop (ganze Position) + Ziele (Teilmengen) an der Börse. Klappt der Stop nicht: Position sofort schliessen."""
    import broker_futures as BF
    a, call = rec["auftrag"], rec["call"]
    sym, lang = call["symbol"], call["richtung"] == "LONG"
    gegen = "SELL" if lang else "BUY"
    pos = c.position(sym)
    if not pos:
        return
    if not a.get("stop_gesetzt"):
        try:
            c.stop(sym, gegen, a["stop"])
            a["stop_gesetzt"] = True
        except (BF.BinanceFehler, *BF.NETZFEHLER) as ex:
            try:
                c.auftrag(sym, gegen, abs(pos), True)
                a["hinweis"] = f"⚠️ Stop abgelehnt ({BF.fehlertext(ex)}) — Position sofort geschlossen."
            except (BF.BinanceFehler, *BF.NETZFEHLER) as ex2:
                a["hinweis"] = f"⚠️ Stop abgelehnt UND Schliessen gescheitert ({BF.fehlertext(ex2)}) — SOFORT im Binance-Konto prüfen!"
            a["fehler"] = True
            return
    if a.get("ziele_gesetzt") is None:
        r = c.regeln(sym)
        ziele = [z for z in call["ziele"] if (z > a["einstieg"] if lang else z < a["einstieg"])]
        rest, gesetzt = abs(pos), []
        for i, z in enumerate(ziele):
            m = rest if i == len(ziele) - 1 else BF.runde(abs(pos) / len(ziele), r["step"])
            if m < r["min_qty"]:
                continue
            try:
                c.ziel(sym, gegen, m, z)
                gesetzt.append(z)
                rest = BF.runde(rest - m, r["step"])
            except (BF.BinanceFehler, *BF.NETZFEHLER) as ex:
                a["hinweis"] = (a.get("hinweis", "") + f" Ziel {fmt_preis(z)} abgelehnt ({BF.fehlertext(ex)}).").strip()
        a["ziele_gesetzt"] = gesetzt


def kopieren(rec, cfg, c, jetzt_ms=None):
    """Einstieg (Markt oder Limit an der Zone, 24 Std. gültig) + Schutz. Schreibt rec['auftrag'] und rec['status']."""
    import broker_futures as BF
    jetzt_ms = jetzt_ms or int(time.time() * 1000)
    call = rec["call"]
    sym, lang = call["symbol"], call["richtung"] == "LONG"
    try:
        regeln = c.regeln(sym)
        if regeln.get("status") not in (None, "TRADING"):
            raise ValueError(f"{sym} nicht handelbar")
        if c.position(sym):
            raise ValueError(f"in {sym} ist schon eine Position offen (von Hand?) — nichts gemacht")
        mark = c.markpreis(sym)[0]
        wallet = float(c.konto().get("totalWalletBalance", 0))
    except StopIteration:
        rec.update(status="abgelehnt", hinweis=f"{sym} gibt es nicht als Binance-Future")
        return
    except (BF.BinanceFehler, *BF.NETZFEHLER, KeyError, ValueError) as ex:
        rec.update(status="abgelehnt", hinweis=BF.fehlertext(ex) if isinstance(ex, (BF.BinanceFehler, OSError)) else str(ex))
        return
    stop = call["stop"] or mark * (1 - CQ.STOP_OHNE_ANGABE if lang else 1 + CQ.STOP_OHNE_ANGABE)
    if (lang and mark <= stop) or (not lang and mark >= stop):
        rec.update(status="abgelehnt", hinweis=f"Kurs {fmt_preis(mark)} liegt schon jenseits des Stops {fmt_preis(stop)}")
        return
    markt = True
    ref = mark
    if call["einstieg"]:
        lo, hi = call["einstieg"]
        if lang and mark > hi:
            markt, ref = False, hi
        elif not lang and mark < lo:
            markt, ref = False, lo
    ref = BF.runde(ref, regeln["tick"]) or ref
    menge = groesse(cfg, wallet, ref, stop, regeln)
    if not menge:
        rec.update(status="abgelehnt", hinweis="Auftrag wäre kleiner als das Binance-Minimum (Konto zu klein oder Stop zu weit)")
        return
    seite = "BUY" if lang else "SELL"
    a = {"symbol": sym, "menge": menge, "stop": BF.runde(stop, regeln["tick"]) or stop, "markt": markt, "einstieg": ref,
         "zeit_ms": jetzt_ms}
    rec["auftrag"] = a
    try:
        c.einrichten(sym, HEBEL)
        if markt:
            antwort = c.auftrag(sym, seite, menge, False) or {}
            a["einstieg"] = float(antwort.get("avgPrice") or 0) or mark
            rec["status"] = "offen"
            schutz_setzen(rec, c)
        else:
            antwort = c.limit(sym, seite, menge, ref, jetzt_ms + CQ.FUELLEN_STD * 3600 * 1000) or {}
            a["einstieg_id"] = antwort.get("orderId")
            rec["status"] = "wartet"
            try:  # Stop schon jetzt (closePosition wirkt erst, wenn gefüllt) — sonst setzt ihn die Pflege nach dem Füllen
                c.stop(sym, "SELL" if lang else "BUY", a["stop"])
                a["stop_gesetzt"] = True
            except (BF.BinanceFehler, *BF.NETZFEHLER):
                pass
    except (BF.BinanceFehler, *BF.NETZFEHLER) as ex:
        a["fehler"] = True
        a["hinweis"] = f"⚠️ Auftrag gescheitert ({BF.fehlertext(ex)}) — bitte im Binance-Konto prüfen."
        try:
            pos = c.position(sym)
        except (BF.BinanceFehler, *BF.NETZFEHLER):
            pos = None
        if pos is None:  # unklar: die Pflege schaut nach und setzt den Schutz, falls doch gefüllt
            rec["status"] = "offen"
        elif pos:
            rec["status"] = "offen"
            schutz_setzen(rec, c)
        elif a.get("einstieg_id") is None and not markt:
            rec["status"] = "abgelehnt"
        else:
            rec["status"] = "abgelehnt" if markt else "wartet"


# ───────────────────────── neue Nachricht ─────────────────────────
def neue_nachricht(gruppe, name, eintrag, env=None, client=None, push=None, buch_datei=None, jetzt_ms=None):
    """Von calls_leser --live für jede neue Nachricht aufgerufen. → Datensatz oder None (kein Call)."""
    c = CP.lesen(eintrag.get("text", ""))
    if not c:
        return None
    import broker_futures as BF
    import sperre
    cfg, bf_cfg = einstellungen(env), BF.einstellungen(env)
    t = int(datetime.fromisoformat(eintrag["zeit"]).timestamp() * 1000)
    with sperre.lauf_sperre("calls", warten=30, ordner=Path(buch_datei).parent if buch_datei else None):
        b = lies(buch_datei)
        if any(r["gruppe"] == str(gruppe) and r["call"]["symbol"] == c["symbol"] and r["call"]["richtung"] == c["richtung"]
               and 0 <= t - r["zeit_ms"] < WIEDERHOLUNG_MS for r in b["calls"]):
            return None  # Wiederholung desselben Calls
        rec = {"id": f"{gruppe}:{eintrag['id']}", "gruppe": str(gruppe), "gruppe_name": name, "zeit_ms": t,
               "zeit": eintrag["zeit"], "call": c, "status": "schatten", "schatten": {"status": "offen"}, "modus": cfg["modus"]}
        ok, grund = darf_kopieren(rec, cfg, bf_cfg, b)
        if ok:
            kopieren(rec, cfg, client or BF.Futures(bf_cfg), jetzt_ms)
        else:
            rec["hinweis"] = grund
        b["calls"] = (b["calls"] + [rec])[-2000:]
        schreiben(b, buch_datei)
    if cfg["push"]:
        was = ("→ " + ("KOPIERT" if rec.get("status") in ("offen", "wartet") else f"nicht kopiert: {rec.get('hinweis', '')}")
               + (f"\n{rec['auftrag'].get('hinweis')}" if rec.get("auftrag", {}).get("hinweis") else ""))
        _push(f"📣 Call von «{name}»: {call_text(c)}\n{was}", push)
    return rec


# ───────────────────────── Pflege ─────────────────────────
def pflegen(env=None, client=None, kerzen_fn=None, push=None, buch_datei=None, jetzt_ms=None):
    """Schatten nachrechnen; kopierte Calls: Füllung prüfen, Schutz setzen, Ende erkennen, nach 7 Tagen schliessen."""
    import broker_futures as BF
    import sperre
    jetzt_ms = jetzt_ms or int(time.time() * 1000)
    kerzen_fn = kerzen_fn or CQ.kerzen
    meldungen = []
    with sperre.lauf_sperre("calls", warten=30, ordner=Path(buch_datei).parent if buch_datei else None):
        b = lies(buch_datei)
        c = None
        for rec in b["calls"]:
            s = rec.get("schatten") or {}
            if s.get("status") in (None, "offen"):
                ks = kerzen_fn(rec["call"]["symbol"], rec["zeit_ms"], min(rec["zeit_ms"] + (CQ.HALTEN_TAGE + 2) * CQ.TAG, jetzt_ms))
                neu = CQ.simuliere(rec["call"], rec["zeit_ms"], ks) if ks else {"status": "offen"}
                if neu["status"] == "keine_kurse" and jetzt_ms - rec["zeit_ms"] > 2 * CQ.TAG:
                    neu = {"status": "keine_kurse"}
                elif neu["status"] == "keine_kurse":
                    neu = {"status": "offen"}
                rec["schatten"] = neu
                if neu["status"] == "geschlossen" and not rec.get("auftrag"):
                    meldungen.append(f"📒 Schatten «{rec['gruppe_name']}» {rec['call']['richtung']} {rec['call']['symbol']}: "
                                     f"{neu['r'] * 100:+.2f} % ({ {'stop': 'Stop', 'ziele': 'alle Ziele', 'zeit': '7 Tage um'}[neu['grund']] })")
            a = rec.get("auftrag")
            if not a or rec.get("status") not in ("wartet", "offen"):
                continue
            c = c or client or BF.Futures(BF.einstellungen(env))
            sym = rec["call"]["symbol"]
            try:
                pos = c.position(sym)
                if rec["status"] == "wartet":
                    st = (c.auftrag_status(sym, a["einstieg_id"]) or {}).get("status") if a.get("einstieg_id") else None
                    if pos:
                        rec["status"] = "offen"
                        a["gefuellt_ms"] = jetzt_ms
                        schutz_setzen(rec, c)
                    elif st in ("EXPIRED", "CANCELED", "REJECTED", "EXPIRED_IN_MATCH") or jetzt_ms - a["zeit_ms"] > (CQ.FUELLEN_STD + 1) * 3600 * 1000:
                        c.stops_loeschen(sym)
                        rec["status"] = "nicht_ausgeloest"
                    continue
                if not pos:
                    c.stops_loeschen(sym)  # restliche Ziele/Stop weg
                    rec["status"] = "geschlossen"
                    meldungen.append(f"📒 Kopierter Call «{rec['gruppe_name']}» {sym} ist zu (Ziele oder Stop an der Börse). "
                                     f"Schatten-Rechnung: {rec['schatten'].get('r', 0) * 100:+.2f} %")
                    continue
                schutz_setzen(rec, c)
                ab = a.get("gefuellt_ms") or a["zeit_ms"]
                if jetzt_ms - ab > CQ.HALTEN_TAGE * CQ.TAG or STOP.exists():
                    c.auftrag(sym, "SELL" if pos > 0 else "BUY", abs(pos), True)
                    c.stops_loeschen(sym)
                    rec["status"] = "geschlossen"
                    meldungen.append(f"📒 Kopierter Call {sym} geschlossen ({'Not-Aus' if STOP.exists() else '7 Tage um'}).")
            except (BF.BinanceFehler, *BF.NETZFEHLER) as ex:
                a["hinweis"] = f"Pflege: {BF.fehlertext(ex)}"
        schreiben(b, buch_datei)
    if meldungen and einstellungen(env)["push"]:
        _push("\n".join(meldungen), push)
    return meldungen


def offene_symbole(buch_datei=None):
    """Für den Not-Aus: Symbole kopierter Calls mit möglicher Position."""
    try:
        b = lies(buch_datei)
    except OSError:
        return []
    return sorted({r["call"]["symbol"] for r in b["calls"] if r.get("auftrag") is not None and r.get("status") in ("wartet", "offen")})


# ───────────────────────── Bilanz ─────────────────────────
def stand(buch_datei=None, pruefung_datei=None):
    b = lies(buch_datei)
    gruppen = {}
    for r in b["calls"]:
        g = gruppen.setdefault(r["gruppe"], {"name": r.get("gruppe_name") or r["gruppe"], "calls": 0, "kopiert": 0, "ergebnisse": []})
        g["calls"] += 1
        g["kopiert"] += r.get("auftrag") is not None
        if (r.get("schatten") or {}).get("status") == "geschlossen":
            g["ergebnisse"].append(r["schatten"])
    pd = Path(pruefung_datei) if pruefung_datei else PRUEFUNG
    pruef = json.loads(pd.read_text(encoding="utf-8")).get("gruppen", {}) if pd.exists() else {}
    out = {}
    for gid, g in gruppen.items():
        out[gid] = {"name": g["name"], "calls": g["calls"], "kopiert": g["kopiert"], "schatten": CQ.kennzahlen(g["ergebnisse"]),
                    "pruefung": (pruef.get(gid) or {}).get("urteil")}
    letzte = [{"zeit": r["zeit"], "gruppe": r.get("gruppe_name"), "call": call_text(r["call"]), "status": r.get("status"),
               "schatten": (r.get("schatten") or {}).get("status"), "r": (r.get("schatten") or {}).get("r"),
               "hinweis": r.get("hinweis") or (r.get("auftrag") or {}).get("hinweis")} for r in b["calls"][-15:]][::-1]
    return {"gruppen": out, "letzte": letzte, "modus": einstellungen()["modus"]}


def stand_text(s):
    if not s["gruppen"]:
        return "📣 Telegram-Calls: noch keine Calls erkannt (calls_leser.py --live läuft?)."
    t = f"📣 Telegram-Calls (Modus {s['modus']}) — Schatten-Bilanz ab Mitlesen:"
    for g in s["gruppen"].values():
        k = g["schatten"]
        t += f"\n{g['name']}: {g['calls']} Calls, {g['kopiert']} kopiert"
        if k.get("n"):
            t += (f" · {k['n']} abgeschlossen: Ø {k['schnitt'] * 100:+.2f} % je Call, Treffer {k['treffer'] * 100:.0f} %, "
                  f"Konto mit 1 % Risiko {k['summe'] * 100:+.1f} %")
        t += f" · Prüfung: {g['pruefung'] or 'noch keine'}"
    return t


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--stand", action="store_true")
    ap.add_argument("--pflegen", action="store_true")
    ap.add_argument("--probe")
    a = ap.parse_args()
    if a.probe:
        c = CP.lesen(a.probe)
        if not c:
            print("Kein Call erkannt.")
            return 1
        print("Erkannt:", call_text(c), "" if c["stimmig"] else "⚠️ widersprüchlich")
        import broker_futures as BF
        ok, grund = darf_kopieren({"call": c, "gruppe": "probe"}, einstellungen(), BF.einstellungen(), lies())
        print("Würde kopiert." if ok else f"Würde NICHT kopiert: {grund}")
        return 0
    if a.pflegen:
        for m in pflegen() or ["nichts Neues"]:
            print(m)
        return 0
    print(stand_text(stand()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
