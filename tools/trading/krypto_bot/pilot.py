#!/usr/bin/env python3
"""Krypto-Pilot — Bitcoin- und Ethereum-Futures mit Trendrichtung, Schwankungsziel, Börsen-Stop und Lügendetektor.

  python3 tools/trading/krypto_bot/pilot.py --status            # was der Pilot heute tun würde
  python3 tools/trading/krypto_bot/pilot.py --lauf --trocken    # Aufträge nur anzeigen
  python3 tools/trading/krypto_bot/pilot.py --lauf              # handeln (Testnetz, solange nicht doppelt freigegeben)
  python3 tools/trading/krypto_bot/pilot.py --bericht           # Kontostand-Verlauf aus dem Logbuch
  python3 tools/trading/krypto_bot/pilot.py --backtest          # ehrlicher Test der Regel (Futures-Modell mit Stop)

Märkte: KRYPTO_PILOT_MAERKTE (Standard «BTC,ETH», je gleicher Anteil; «BTC» = nur Bitcoin).
Trend-Schnitt je Coin: Bitcoin 150 Tage, Ethereum 200 Tage (pilot_pruefung.py, Regel vorab festgelegt).
MVRV-Bremse: kein Short, solange der Kurs unter dem Einstandswert aller Coins liegt (MVRV < 1). Die übrigen freien
Markt-Infos (Angst & Gier, Funding, VIX, Dollar, Zins, Notenbank, Stablecoins) erscheinen nur als Lagebild — sie
bestanden den Test in info_pruefung.py nicht und beeinflussen keinen Auftrag.
Einstellungen: Risiko-Stufe 1 / 1,5 / 1,75 / 2 (Cockpit-Knopf oder KRYPTO_RISIKO; hebel_pruefung.py) · KRYPTO_SHORT (1 = auch short, 0 = nur long) · Schlüssel siehe
broker_futures.py. Einmal pro Woche kommt der Kontostand als Push (Telegram/ntfy). Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import lern_bot as L  # noqa: E402
import pilot_kern as K  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-pilot.json"
# Pause (Cockpit-Schalter «Auto-Handel aus»): nichts handeln, Positionen bleiben. Nicht zu verwechseln mit STOP (Not-Aus):
# bei STOP schliesst der Pilot seine Positionen (broker_futures, nur reduceOnly).
PAUSE = HIER.parent / "ki_bot" / "PAUSE"
# Kürzel → (Futures-Symbol, Yahoo-Kürzel, Trend-Schnitt in Tagen)
MAERKTE = {"BTC": ("BTCUSDT", "BTC-USD", 150), "ETH": ("ETHUSDT", "ETH-USD", 200)}


def fmt_zahl(x, stellen=0):
    return f"{x:,.{stellen}f}".replace(",", "'")


def maerkte(env=None):
    env = os.environ if env is None else env
    roh = (env.get("KRYPTO_PILOT_MAERKTE") or "BTC,ETH").upper()
    gewaehlt = [m.strip() for m in roh.split(",") if m.strip() in MAERKTE]
    return list(dict.fromkeys(gewaehlt)) or ["BTC"]


def abgeschlossen(reihe, jetzt=None):
    heute = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    return [x for x in reihe if x[0] < heute]


def mvrv_stand(markt, stand, mvrv=None):
    """MVRV vom Vortag der Entscheidung (wie im Test). Veraltet (> 5 Tage) oder nicht erreichbar → None."""
    try:
        import infos as I
        if mvrv is None:
            mvrv = I.reihe(f"mvrv_{markt.lower()}")
        tag, wert = I.stand(mvrv, stand, 1)
    except Exception:  # noqa: BLE001
        return None, None
    if tag is None or (date.fromisoformat(stand) - date.fromisoformat(tag)).days > 5:
        return tag, None
    return tag, wert


def entscheid(markt="BTC", offline=False, env=None, jetzt=None, kurse=None, mvrv=None):
    env = os.environ if env is None else env
    symbol, yahoo, n = MAERKTE[markt]
    short = (env.get("KRYPTO_SHORT") or "1").strip() != "0"
    r = K.risiko(None if env is os.environ else env)
    hebel = r["max_hebel"]
    reihe = abgeschlossen(kurse if kurse is not None else L.kurse(yahoo, offline), jetzt)
    p = [x[1] for x in reihe]
    z = K.roh_hebel(p, short, hebel, n, r["ziel_vol"])
    ok, skill, dd = K.detektor(z, p, len(p) - 1)
    schnitt = K.sma(p, n)[-1]
    vol = K.schwankung(p)[-1]
    m_tag, m_wert = mvrv_stand(markt, reihe[-1][0], mvrv)
    ziel = K.mvrv_bremse(z[-1], m_wert)
    return {"markt": markt, "symbol": symbol, "stand": reihe[-1][0], "kurs": round(p[-1], 2), "hebel": round(ziel, 3),
            "hebel_roh": round(z[-1], 3), "mvrv": {"tag": m_tag, "wert": round(m_wert, 3) if m_wert is not None else None},
            "bremse": "MVRV unter 1: kein Short" if ziel != z[-1] else None, "trend_tage": n, "schnitt": round(schnitt, 2) if schnitt else None,
            "schwankung": round(vol, 4) if vol else None, "short_erlaubt": short, "max_hebel": hebel, "risiko": r["stufe"],
            "detektor": {"ok": ok, "skill_2j": skill, "einbruch_1j": round(dd, 4) if dd is not None else None},
            "stop_long": K.stop_kurs(p, 1), "stop_short": K.stop_kurs(p, -1)}


def text(e):
    r = "LONG" if e["hebel"] > 0 else "SHORT" if e["hebel"] < 0 else "FLACH"
    d = e["detektor"]
    lage = "über" if e["schnitt"] and e["kurs"] > e["schnitt"] else "unter"
    zeile = (f"🛩️ {e['markt']} {e['stand']}: {r} {abs(e['hebel']):.2f}× · {fmt_zahl(e['kurs'])} USD · "
             f"{lage} {e['trend_tage']}-Tage-Schnitt · Schwankung {e['schwankung'] * 100:.0f} %/Jahr")
    if e.get("mvrv", {}).get("wert") is not None:
        zeile += f" · MVRV {e['mvrv']['wert']:.2f} ({e['mvrv']['tag']})"
    elif e.get("mvrv"):
        zeile += " · MVRV fehlt/veraltet (Grundregel ohne Bremse)"
    if e.get("bremse"):
        zeile += f"\n   🛑 {e['bremse']} (Trend sagt short {abs(e['hebel_roh']):.2f}×, Pilot bleibt flach)"
    if d["skill_2j"] is not None:
        zeile += f"\n   Lügendetektor: Regel schlug in den letzten 2 Jahren {d['skill_2j'] * 100:.0f} % der Zufallskopien"
        zeile += "" if d["ok"] else " — ⚠️ WARNUNG: Vorteil zurzeit nicht belegt (Pilot handelt trotzdem; Not-Aus: stop.bat)"
    return zeile


def lies(datei=None):
    """Logbuch lesen. Ist es kaputt (z. B. Strom weg beim Schreiben), wird es beiseitegelegt statt jeden Lauf abstürzen zu lassen."""
    datei = Path(datei) if datei else LOGBUCH
    try:
        lb = json.loads(datei.read_text(encoding="utf-8")) if datei.exists() else {}
        if not isinstance(lb, dict):
            raise ValueError("kein Objekt")
    except (ValueError, UnicodeDecodeError) as ex:
        kaputt = datei.with_name(datei.name + f".kaputt-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}")
        datei.replace(kaputt)
        print(f"⚠️ Logbuch {datei.name} war unlesbar ({type(ex).__name__}) — beiseitegelegt als {kaputt.name}, neues Logbuch begonnen.")
        lb = {}
    lb.setdefault("entscheide", [])
    lb.setdefault("kontostand", [])
    lb["version"] = 2
    return lb


def schreiben(lb, datei=None):
    """Atomar schreiben: erst eine Zwischendatei, dann umbenennen — ein Absturz mittendrin lässt das alte Logbuch heil."""
    datei = Path(datei) if datei else LOGBUCH
    datei.parent.mkdir(parents=True, exist_ok=True)
    tmp = datei.with_name(datei.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, datei)


def letzter(lb, markt):
    """Letzter Entscheid für diesen Markt (Einträge aus Version 1 ohne «markt» waren Bitcoin)."""
    for e in reversed(lb["entscheide"]):
        if e.get("markt", "BTC") == markt:
            return e
    return None


def kontostand_merken(lb, tag, kapital, modus=None):
    if kapital is None:
        return
    ks = [x for x in lb["kontostand"] if x["tag"] != tag]
    eintrag = {"tag": tag, "kapital": round(float(kapital), 2)}
    if modus:
        eintrag["modus"] = modus
    lb["kontostand"] = (ks + [eintrag])[-1500:]


def kontostand_modus(ks):
    """Nur die Einträge im Modus des letzten Eintrags (Testnetz und Echtgeld nie mischen; alte Einträge ohne Modus = Testnetz)."""
    if not ks:
        return []
    m = ks[-1].get("modus", "testnetz")
    return [x for x in ks if x.get("modus", "testnetz") == m]


def wochenbericht(lb, heute, erzwingen=False):
    """Text mit Kontostand gegen Start, Vorwoche und Höchststand — höchstens alle 7 Tage (sonst None)."""
    ks = kontostand_modus(lb["kontostand"])
    if not ks:
        return None
    letzt = lb.get("letzter_bericht")
    if not erzwingen and letzt and (date.fromisoformat(heute) - date.fromisoformat(letzt)).days < 7:
        return None
    jetzt, start = ks[-1]["kapital"], ks[0]["kapital"]
    vor7 = [x for x in ks if (date.fromisoformat(ks[-1]["tag"]) - date.fromisoformat(x["tag"])).days >= 7]
    spitze = max(x["kapital"] for x in ks)

    def pct(a, b):
        return f"{(a / b - 1) * 100:+.1f} %" if b else "—"

    m_ = ks[-1].get("modus") or ""
    modus = ("Pilot 2.0, " if m_.startswith("pilot2") else "") + ("Echtgeld" if m_ in ("echtgeld", "pilot2-echt") else "Testnetz")
    t = f"📒 Krypto-Pilot Wochenbericht {heute}\nKonto ({modus}): {fmt_zahl(jetzt, 2)} USDT"
    t += f"\nKonto seit Start ({ks[0]['tag']}): {pct(jetzt, start)}"
    if vor7:
        t += f" · seit Vorwoche: {pct(jetzt, vor7[-1]['kapital'])}"
    t += f" · unter Höchststand: {pct(jetzt, spitze)}"
    t += "\n(Kontostand inkl. Ein-/Auszahlungen — der echte Gewinn steht unter /profit)"
    if not erzwingen:
        lb["letzter_bericht"] = heute
    return t


def backtest():
    """BTC 150 + ETH 200 (je 50 %, täglich neu aufgeteilt wie live) mit und ohne MVRV-Bremse, gegen nur Bitcoin und Halten —
    mit Börsen-Stop und Schlupf."""
    import info_pruefung as IP
    import pilot_pruefung as P
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb_, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    zb150, zb200, ze = K.roh_hebel(cb, n_sma=150), K.roh_hebel(cb, n_sma=200), K.roh_hebel(ce, n_sma=200)
    zb_m = IP.filter_z(zb150, *IP.bremsen("mvrv_tief", IP.flaggen("btc", tage)))
    ze_m = IP.filter_z(ze, *IP.bremsen("mvrv_tief", IP.flaggen("eth", tage)))
    print(f"Krypto-Pilot im Futures-Modell (Gebühr 0,05 %, Funding 0,01 % je 8 h nur für Longs, Stop {K.STOP_SIGMA:g}σ mit 0,1 % Schlupf, Liquidation):")
    for start in ("2019-01-01", "2022-01-01"):
        a = next(i for i, t in enumerate(tage) if t >= start)
        wb, _ = P.lauf(zb150, hb, lb_, cb, a, len(cb), K.STOP_SIGMA)
        we, _ = P.lauf(ze, he, le, ce, a, len(ce), K.STOP_SIGMA)
        wbm, _ = P.lauf(zb_m, hb, lb_, cb, a, len(cb), K.STOP_SIGMA)
        wem, _ = P.lauf(ze_m, he, le, ce, a, len(ce), K.STOP_SIGMA)
        alt, _ = P.lauf(zb200, hb, lb_, cb, a, len(cb), K.STOP_SIGMA)
        halten = [cb[i] / cb[a - 1] for i in range(a - 1, len(cb))]  # echtes Halten (Spot): kein Funding, keine Gebühr
        varianten = {"+ MVRV-Bremse (live)": P.mix_taeglich(wbm, wem),
                     "BTC 150 + ETH 200": P.mix_taeglich(wb, we), "nur BTC 150": wb,
                     "nur BTC 200 (bisher)": alt, "BTC halten (Spot)": halten}
        print(f"\n  ab {start} bis {tage[-1]}:")
        for name, w in varianten.items():
            k = P.kennz(w)
            print(f"    {name:26} {k['cagr'] * 100:6.1f} %/Jahr  schlimmster Einbruch {k['einbruch'] * 100:4.0f} %  "
                  f"Rendite÷Einbruch {k['mar']:.2f}")
    print("\nVergangenheit ist keine Garantie. Die Trendlängen wurden aus 5 Kandidaten gewählt — eine kleine Auswahl-Verzerrung bleibt.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--trocken", action="store_true")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--bericht", action="store_true")
    ap.add_argument("--backtest", action="store_true")
    ap.add_argument("--nachkontrolle", action="store_true", help="Pilot 2.0: unklare Aufträge klären, danach Stops setzen")
    ap.add_argument("--einmal", action="store_true", help="mit --nachkontrolle: EIN Durchgang ohne Warten (der 10-Minuten-Takt der Aufgabenplanung)")
    a = ap.parse_args()
    if a.backtest:
        backtest()
        return 0
    if a.bericht:
        print(wochenbericht(lies(), date.today().isoformat(), erzwingen=True) or "Noch kein Kontostand im Logbuch — erst ein --lauf.")
        return 0
    if a.nachkontrolle:
        return nachkontrolle(einmal=a.einmal)
    if not (a.status or a.lauf):
        ap.print_help()
        return 0
    import broker_futures as BF
    import sperre
    if a.lauf and not a.trocken and BF.einstellungen()["stop"]:  # Datei STOP oder KI_BOT_STOP=1
        # Not-Aus hat Vorrang (auch vor der Pause) und braucht keine Kurse von Yahoo: nur schliessen, alle Märkte
        try:
            with sperre.lauf_sperre(warten=sperre.ALT_NACH_TOT + 40, alt_nach=sperre.ALT_NACH_TOT):  # (16. Prüfung) eine tote Sperre (kein Herzschlag seit 150 s) hält den Not-Aus nicht auf
                alles_zu, zeilen = schliessen_alle()
        except sperre.Besetzt as ex:
            print(f"{ex} Not-Aus trotzdem: schliesse ohne Sperre.")
            alles_zu, zeilen = schliessen_alle()
            # ein anderer Lauf könnte gleichzeitig noch etwas aufgebaut haben → nie «alles zu» melden
            alles_zu = False
            zeilen.insert(0, "⚠️ Ein anderer Lauf war noch aktiv — Not-Aus trotzdem ausgeführt. In 5 Minuten nochmals stop.bat.")
        text_na = ("🛑 Not-Aus aktiv." if alles_zu else "🛑 Not-Aus aktiv — ⚠️ NICHT ALLES GESCHLOSSEN!") + "\n" + "\n".join(zeilen)
        print(text_na)
        lauf_merken(alles_zu, ["Not-Aus-Lauf"] + zeilen)
        if not alles_zu or any((z.startswith(("✅", "❌")) and "keine offene Position" not in z) or "Not-Aus Pilot 2.0 (" in z
                               for z in zeilen):
            import signale as SG
            SG.push(text_na + "\nKeine Anlageberatung.")
        return 0 if alles_zu else 3  # 3 = Warnung, schon gemeldet (1 bleibt für Abstürze)
    ents = [entscheid(m, a.offline) for m in maerkte()]
    for e in ents:
        print(text(e))

    def lage():
        """Erst NACH den Aufträgen geholt: bis zu 11 Quellen mit Zeitlimits dürfen den Handel nicht verzögern."""
        try:
            import infos as I
            t = "Lagebild (nur Info, handelt nicht danach): " + I.text(I.lagebild())
        except Exception as ex:  # noqa: BLE001
            t = f"Lagebild nicht verfügbar ({type(ex).__name__})"
        print(t)
        return t
    if a.status:
        lage()
        return 0
    if PAUSE.exists() and not a.trocken:
        print("Auto-Handel ist aus (Pause) — nichts gehandelt. Einschalten im Cockpit oder mit weiter.bat.")
        return 0
    try:
        with sperre.lauf_sperre(warten=0 if a.trocken else sperre.ALT_NACH_TOT + 40, alt_nach=sperre.ALT_NACH_TOT):
            return handeln(ents, lage, a.trocken)
    except sperre.Besetzt as ex:
        return lauf_besetzt(ex, a.trocken)
    return 0


def lauf_besetzt(ex, trocken):
    """Der Tageslauf bekam die Lauf-Sperre nicht (ein anderer Lauf oder die Nachkontrolle hielt sie länger als die Wartezeit). → Rückgabewert.
    (18. Prüfung W3′) NICHT still: ein Lauf, der deswegen nicht handelt, ist ein ausgefallener Tag — rc 0 und «alles gelaufen» in der Bat verschwiegen es. Ein Probelauf darf einfach abgewiesen werden."""
    print(f"{ex} Dieser Lauf handelt nicht — einfach später nochmals starten.")
    if trocken:
        return 0
    import signale as SG
    SG.push(f"⚠️ Pilot: der Lauf hat NICHT gehandelt — {ex} (ein anderer Lauf oder die Nachkontrolle hielt die Sperre). Bitte später `pilot.py --lauf` nochmals starten oder im Cockpit «Jetzt handeln». Keine Anlageberatung.")
    return 3


def teilt_konto(env, p2_modus, bf=None):
    """Spricht der alte Pilot (BINANCE_FUTURES_*) dasselbe Binance-Konto an wie Pilot 2.0 im Modus p2_modus?
    Echtgeld: Pilot 2.0 hat sein Unterkonto (PILOT2_API_KEY) — gleich nur bei gleichem Schlüssel. Testnetz: Pilot 2.0 nutzt
    dieselben Testnetz-Futures-Schlüssel wie der alte Pilot im Testnetz."""
    import broker_futures as BF
    env = os.environ if env is None else env
    bf = bf or BF.einstellungen(env)
    if p2_modus == "echt":
        return bool(bf["echtgeld"] and bf["key"] and bf["key"] == (env.get("PILOT2_API_KEY") or ""))
    return not bf["echtgeld"]


def alter_pilot_offen(env=None):
    """Offene Positionen des alten Piloten in SEINEM Futures-Konto — nur wenn das nicht das Konto von Pilot 2.0 ist (dort
    gehören BTC/ETH-Perps Pilot 2.0). → (["BTC +0.012"], Fehlertext oder None)."""
    import broker_futures as BF
    import pilot2_live as P2L
    env = os.environ if env is None else env
    bf = BF.einstellungen(env)
    if not (bf["key"] and bf["secret"]) or bf["url_fehler"] or teilt_konto(env, P2L.einstellungen(env)["modus"], bf):
        return [], None
    try:
        f = BF.Futures(bf)
        return [f"{m} {pos:+g}" for m, (sym, _, _) in MAERKTE.items() if (pos := f.position(sym))], None
    except Exception as ex:  # noqa: BLE001
        return [], type(ex).__name__


def schliessen_alle(ausfuehren=None, heute=None, env=None, ohne_p2=False):
    """Not-Aus: ALLE bekannten Märkte schliessen (auch solche, die gerade nicht eingestellt sind). → (alles_zu, Zeilen).
    «geschlossen» nur, wenn die Position danach wirklich 0 ist. Pilot 2.0 zuerst (jeder Modus mit Bestand).
    ohne_p2: ein anderer Lauf hält die Lauf-Sperre (Nachkontrolle, Tageslauf) — Pilot 2.0 dann NICHT parallel schliessen
    (zwei Not-Aus zugleich arbeiten auf demselben Konto und Buch); der andere Lauf sieht die STOP-Datei und schliesst selbst,
    danach schliesst die Nachkontrolle nochmals."""
    import broker_futures as BF
    import pilot2_live as P2L
    env = os.environ if env is None else env
    heute = heute or datetime.now(timezone.utc).date().isoformat()
    zeilen, alles_zu, r2 = [], True, {}
    try:
        if ohne_p2:
            if P2L.modi_mit_bestand(P2L.BESTAND):
                zeilen.append("⏳ Pilot 2.0: ein anderer Lauf hält gerade die Sperre (Nachkontrolle oder Tageslauf) — er sieht den "
                              "Not-Aus und schliesst selbst; die Nachkontrolle schliesst danach nochmals. Nicht parallel geschlossen.")
                alles_zu = False
        else:
            r2 = P2L.notaus_alle(env, protokolliere=P2L.protokoll_schreiben)
            if r2["modus"] or not r2.get("alles_zu"):  # bei kaputtem/fehlendem Buch die Erklärung immer zeigen
                zeilen += r2["zeilen"]
            alles_zu = r2.get("alles_zu") is True
    except Exception as ex:  # noqa: BLE001
        zeilen.append(f"❌ Pilot 2.0: Not-Aus-Fehler {type(ex).__name__} — bitte im Binance-Konto prüfen!")
        alles_zu = False
    if ausfuehren is None:
        def ausfuehren(e, symbol, gewicht):
            return BF.ausfuehren(e, env=env, symbol=symbol, gewicht=gewicht)
    # Gehört das Konto, das der alte Pilot anspricht, Pilot 2.0 (dort gestartet)? Dann sind BTC/ETH-Perps seine Ernte —
    # die hat er oben schon geschlossen (oder bewusst als Absicherung stehen lassen). Sonst: alte Positionen hier schliessen.
    # Erst das Konto vergleichen, DANN das Buch lesen: ein unlesbares Buch darf den alten Piloten in einem ANDEREN Konto nie sperren.
    try:
        bf = BF.einstellungen(env)
        p2_modus = "echt" if bf["echtgeld"] else "testnetz"
        gleiches_konto = teilt_konto(env, p2_modus, bf)
    except Exception:  # noqa: BLE001
        p2_modus, gleiches_konto = None, True
    if not gleiches_konto:
        p2 = False
    else:
        try:
            p2 = P2L._gestartet(P2L.buch_lesen(P2L.BESTAND, p2_modus))
        except Exception:  # noqa: BLE001 — Buch unlesbar und dasselbe Konto: nichts anfassen (der Not-Aus von Pilot 2.0 meldet es)
            p2 = True
    alt_name = " (alter Pilot)" if zeilen else ""  # neben Meldungen von Pilot 2.0 klar sagen, welches Konto gemeint ist
    ziele = [] if p2 else [(m, sym) for m, (sym, _, _) in MAERKTE.items()]
    try:  # kopierte Telegram-Calls schliesst der Not-Aus auch
        import calls_kopierer as CK
        ziele += [(f"Call {s}", s) for s in CK.offene_symbole() if s not in {x[1] for x in ziele}
                  and not (p2 and s in {v[0] for v in MAERKTE.values()})]
    except Exception as ex:  # noqa: BLE001
        zeilen.append(f"⚠️ Telegram-Calls nicht lesbar ({type(ex).__name__}) — kopierte Calls bitte im Binance-Konto prüfen!")
        alles_zu = False
    for m, sym in ziele:
        m = m if m.startswith("Call ") else m + alt_name
        e = {"hebel": 0.0, "stand": heute}
        try:
            a = ausfuehren(e, symbol=sym, gewicht=1 / len(MAERKTE)) or []
        except Exception as ex:  # noqa: BLE001
            zeilen.append(f"❌ {m}: Fehler {type(ex).__name__} — bitte im Binance-Konto prüfen!")
            alles_zu = False
            continue
        b = e.get("broker") or {}
        pos = b.get("position")
        hinweis = (b.get("hinweis") or "").replace("Not-Aus aktiv — keine neuen Positionen, bestehende werden geschlossen.", "").strip()
        if b.get("hinweis") == "keine Futures-Schlüssel":
            zeilen.append(f"{m}: keine Futures-Schlüssel — nichts zu schliessen")
        elif pos is None:
            zeilen.append(f"❌ {m}: unklar — {hinweis or 'keine Antwort'} Bitte im Binance-Konto prüfen!")
            alles_zu = False
        elif pos:
            zeilen.append(f"❌ {m}: NICHT geschlossen, Position {pos:g} noch offen. {hinweis} Der bisherige Stop bleibt. Bitte im Binance-Konto prüfen!")
            alles_zu = False
        else:
            zu = [f"{x['seite']} {x['menge']}" for x in a if x.get("id")]
            zeilen.append(f"✅ {m}: geschlossen ({', '.join(zu)})" if zu else f"✅ {m}: keine offene Position")
        if b.get("modus") and b.get("hinweis") != "keine Futures-Schlüssel":
            zeilen[-1] += f" · Konto: {'⚠️ ECHTGELD' if b['modus'] == 'echtgeld' else 'Testnetz'}"  # welches Konto geprüft wurde
    return alles_zu, zeilen


def lauf_merken(ok, hinweise, trocken=False, logbuch=None):
    """Ergebnis des letzten ECHTEN Laufs (für die Gesundheits-Ampel; ein Probelauf zählt nicht)."""
    if trocken:
        return
    datei = Path(logbuch) if logbuch else LOGBUCH
    lb = lies(datei)
    lb["letzter_lauf"] = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ok": bool(ok),
                          "hinweise": [h for h in hinweise if h][:10]}
    schreiben(lb, datei)


PUSH_STILL = ROOT / "data" / "krypto-nachkontrolle-push.json"
PUSH_ABSTAND_S = 3600
_ZAHL = r"\d[\d'’.,]*"  # eine Zahl mit Tausender-/Dezimaltrennern ist EINE Zahl («3'641.5»)
_ZEIT_KURS = re.compile(rf"(?<![\w.]){_ZAHL}\s*(?:s|Sek\.?|Sekunden|Min\.?|Minuten|Std\.?|Stunden|Tage|Tagen)(?!\w)|\b(?:Kurs|Preis|Stop-Kurs)\s*[:=]?\s*{_ZAHL}|@\s*{_ZAHL}")
PUSH_MERKEN = 8  # so viele verschiedene Meldungen der letzten Stunde bleiben gemerkt (abwechselnde Texte A, B, A, B dürfen nicht je einzeln durchkommen)


def _push_nachkontrolle(text, einmal, datei=None, jetzt=None, warnung=True):
    """Push der Nachkontrolle. Im 10-Minuten-Takt (einmal) schickt dieselbe Meldung höchstens einmal je Stunde (18. Prüfung W3′: ein dauerhaft offener Markt hätte ~144 Pushes am Tag ausgelöst);
    eine ANDERE Meldung geht sofort. Ein Fehler hier darf nie das Pushen verhindern. → True, wenn die Meldung zugestellt wurde.
    (20. Prüfung, klein 5) Gemerkt werden mehrere Kennungen der letzten Stunde, nicht nur die letzte: wechselt der Text zwischen zwei Fassungen (A, B, A, B — z. B. mit einer Minutenangabe), kam jede einzelne an.
    (Code-Review der R20) Das gilt nur INNERHALB einer Folge gleicher Art: `warnung=False` (der Durchgang meldet eine Entwarnung, z. B. «geklärt») beendet die Folge der Warnungen und umgekehrt — kehrt dieselbe
    Warnung nach einer Entwarnung zurück, ist das ein NEUES Ereignis und geht sofort raus (sonst stünde auf dem Handy «geklärt», während der Markt wieder offen ist)."""
    import hashlib
    import time
    import signale as SG
    datei = Path(datei) if datei else PUSH_STILL
    jetzt = time.time() if jetzt is None else jetzt
    # Die Kennung ignoriert Werte, die sich ändern, WEIL ZEIT VERGEHT (Code-Review der R20): Alter («seit 12 s», «vor 7 Min.») und Kurse («zuletzt bekannten Kurs 3636», «@ 4242») — sonst bekäme jeder Takt eine neue Kennung
    # und die Drosselung liesse ~144 Pushes am Tag durch. MENGEN bleiben Teil der Kennung: «BTC Perp SELL 0.003 unklar» und «… 0.5 unklar» sind verschieden grosse Probleme.
    kennung = hashlib.sha1(_ZEIT_KURS.sub("#", text).encode("utf-8", "replace")).hexdigest()[:16]
    art = "warnung" if warnung else "entwarnung"
    gemerkt = {}
    if einmal:
        try:
            roh = json.loads(datei.read_text())
            if "kennung" in roh:  # Datei der R19: eine Meldung (immer eine Warnung)
                roh = {"art": "warnung", "meldungen": {roh["kennung"]: roh.get("zeit")}}
            if roh.get("art") == art:  # eine andere Art beendet die Folge: alles Gemerkte gilt als erledigt
                gemerkt = {k: float(z) for k, z in (roh.get("meldungen") or {}).items() if 0 <= jetzt - float(z or 0) < PUSH_ABSTAND_S}
        except Exception:  # noqa: BLE001 — keine/kaputte Datei: pushen
            gemerkt = {}
        if kennung in gemerkt:
            print(f"(gleiche Meldung vor {int((jetzt - gemerkt[kennung]) / 60)} Min. schon gemeldet — nicht nochmals gepusht)")
            return False
    try:
        gesendet = bool(SG.push(text + "\nKeine Anlageberatung."))
    except Exception as ex:  # noqa: BLE001 — z. B. ein ntfy-Server ohne «https://» (ValueError vor dem Senden): eine Meldung, die nicht rausgeht, darf nie einen Durchgang (rc 1 = «Absturz?» im Cockpit) oder den Rest des Laufs beenden
        print(f"⚠️ Push der Nachkontrolle fehlgeschlagen ({type(ex).__name__}).")
        gesendet = False
    if einmal and gesendet:  # (19. Prüfung W1) nur eine ZUGESTELLTE Meldung drosselt die nächste: `push` gibt False bei Telegram-/ntfy-Fehler oder ohne Kanal zurück — sonst schwiege derselbe Alarm nach einem Netzausfall eine Stunde lang
        try:
            gemerkt[kennung] = jetzt
            neueste = sorted(gemerkt.items(), key=lambda kz: kz[1], reverse=True)[:PUSH_MERKEN]
            datei.parent.mkdir(parents=True, exist_ok=True)
            datei.write_text(json.dumps({"art": art, "meldungen": dict(neueste)}))
        except Exception:  # noqa: BLE001
            pass
    return gesendet


NK_SERIE = ROOT / "data" / "krypto-nachkontrolle-serie.json"
SERIE_LUECKE_S = 1800  # ein Durchgang, der länger als das zurückliegt (PC aus, Aufgabe angehalten), setzt die Reihe zurück: «in Folge» heisst im 10-Minuten-Takt
BESETZT_PUSH_AB = 4    # so viele übersprungene Durchgänge in Folge (rund 40 Minuten) gehen aufs Handy — wie NK_BESETZT_ROT im Cockpit (ein Test hält beide zusammen): die Lampe sieht nur, wer das Cockpit offen hat


def _serie_merken(art, datei=None, jetzt=None):
    """(20. Prüfung, wichtig 1 + klein 8) Buch über die REIHE gleichartiger Durchgänge im 10-Minuten-Takt (`einmal`): «ok» / «warnung» (Rückgabewert 3) / «besetzt» (die Lauf-Sperre hielt ein anderer Lauf, Rückgabewert 0).
    Die rc-Datei der Bat zeigt nur den LETZTEN Durchgang — ob eine Warnung seit einem Takt oder seit Stunden steht und ob die Sperre nur kurz belegt war oder ein Halter mit lebendem Herzschlag dasteht
    (eine angeklickte Konsole im QuickEdit-Modus hält den Hauptfaden an, der Herzschlag läuft weiter), sieht erst das Cockpit an dieser Reihe → {art, anzahl, seit, zeit}. Ein Fehler hier ändert nichts am Durchgang —
    aber er steht im Protokoll (Code-Review: ohne die Reihe bliebe eine Dauerwarnung grau, und das fiele nirgends auf)."""
    import time
    datei = Path(datei) if datei else NK_SERIE
    jetzt = time.time() if jetzt is None else jetzt
    try:
        try:
            alt = json.loads(datei.read_text())
            gleich = alt.get("art") == art and 0 <= jetzt - float(alt.get("zeit") or 0) < SERIE_LUECKE_S
            anzahl, seit = (int(alt.get("anzahl") or 0) + 1, float(alt.get("seit") or jetzt)) if gleich else (1, jetzt)
        except Exception:  # noqa: BLE001 — keine/kaputte Datei: die Reihe beginnt
            anzahl, seit = 1, jetzt
        schreiben({"art": art, "anzahl": anzahl, "seit": seit, "zeit": jetzt}, datei)
        return anzahl
    except Exception as ex:  # noqa: BLE001
        print(f"⚠️ Reihe der Durchgänge nicht gespeichert ({type(ex).__name__}) — die Cockpit-Ampel kann eine Dauerwarnung dann nicht rot färben.")
        try:
            datei.with_name(datei.name + f".tmp{os.getpid()}").unlink()
        except OSError:
            pass
        return 0


def nachkontrolle(einmal=False):
    """Pilot 2.0 nach dem Lauf: blieb ein Auftrag unklar, bis zu ~11 Minuten nachfragen und danach die Stops nach dem
    Kontostand setzen (ein verspätet angekommener Kauf liegt so nie bis morgen ohne Stop). Ohne Unklares sofort fertig.
    einmal: der 10-Minuten-Takt der Aufgabenplanung — EIN Durchgang, die Sperre ist nach Sekunden wieder frei (18. Prüfung W3′)."""
    import broker_futures as BF
    import pilot2_live as P2L
    import sperre
    not_aus = BF.einstellungen()["stop"]  # Datei STOP oder KI_BOT_STOP=1
    try:
        # Not-Aus: nie still überspringen — eine laufende Nachkontrolle gibt bei STOP nach einem Takt ab, ein Not-Aus-Lauf ist
        # in Sekunden fertig; darum länger warten
        # (16. Prüfung) Tote Sperre (harter Abbruch des Laufs: kein Herzschlag seit ALT_NACH_TOT s) übernehmen — sonst lief die Nachkontrolle nach einem Abbruch gar nicht
        with sperre.lauf_sperre(warten=P2L.NACHKONTROLLE_MAX_S + 120 if not_aus else sperre.ALT_NACH_TOT + 40, alt_nach=sperre.ALT_NACH_TOT):
            r = P2L.nachkontrolle(einmal=einmal)
    except sperre.Besetzt as ex:
        if not not_aus:
            print(f"{ex} Nachkontrolle übersprungen — der andere Lauf prüft selbst.")
            if einmal and _serie_merken("besetzt") >= BESETZT_PUSH_AB:
                # Hängt der Halter (ein angeklicktes Konsolenfenster hält ein Programm an, sein Herzschlag läuft weiter), prüft niemand mehr — und rc 0 meldet nichts. Der Text trägt KEINE Zahl: die Drosselung
                # (höchstens einmal je Stunde) erkennt dieselbe Meldung wieder
                _push_nachkontrolle("⚠️ Nachkontrolle Pilot 2.0: seit über 30 Minuten übersprungen — die Lauf-Sperre hält ein anderer Lauf (hängt der Tageslauf oder die lange Nachkontrolle? Ein angeklicktes "
                                    "Konsolenfenster hält ein Programm an). Solange prüft niemand die Stops. Bitte das Fenster ansehen (Taste drücken oder schliessen) und data\\krypto-nachkontrolle.log lesen.", einmal)
            return 0
        r = {"zeilen": [f"⚠️ Not-Aus: Nachkontrolle Pilot 2.0 konnte nicht laufen ({ex}) — stop.bat in 5 Minuten nochmals "
                        "ausführen und das Binance-Konto prüfen!"], "warnung": True, "auftraege": []}
    except Exception as ex:  # noqa: BLE001
        r = {"zeilen": [f"⚠️ Nachkontrolle Pilot 2.0 abgebrochen ({type(ex).__name__}: {str(ex)[:150]}) — bitte im Binance-Konto prüfen!"],
             "warnung": True, "auftraege": []}
    if r["zeilen"]:
        text_n = "\n".join(r["zeilen"])
        print(text_n)
        _push_nachkontrolle(text_n, einmal, warnung=bool(r["warnung"]))
    if einmal:
        _serie_merken("warnung" if r["warnung"] else "ok")
    return 3 if r["warnung"] else 0


def handeln2(ents, lage, trocken, alt_offen=(), alt_fehler=None):
    """Pilot 2.0 (KRYPTO_PILOT2=an): Long über Spot, Short über Perpetual, freier Teil als Funding-Ernte (pilot2_live.py).
    alt_offen: Positionen des alten Piloten in seinem eigenen Konto — die verwaltet niemand, solange Pilot 2.0 läuft."""
    import pilot2_live as P2L
    lb = lies()
    for e in ents:
        vorher = letzter(lb, e["markt"])
        if not vorher or vorher["stand"] != e["stand"]:
            lb["entscheide"] = (lb["entscheide"] + [e])[-4000:]
    zusatz = []
    if alt_offen:
        zusatz.append("⚠️ Der alte Pilot hat noch offene Positionen in seinem Konto (" + ", ".join(alt_offen) + ") — die verwaltet "
                      "niemand, solange Pilot 2.0 läuft (kein Trend-Ausstieg, kein Stop-Nachziehen). Schliessen: stop.bat (schliesst "
                      "beide Piloten), danach weiter.bat.")
    elif alt_fehler:
        zusatz.append(f"ℹ️ Konto des alten Piloten nicht lesbar ({alt_fehler}) — offene Positionen dort bitte selbst prüfen.")
    try:
        gestartet = bool(P2L.buch_lesen(P2L.BESTAND, P2L.einstellungen()["modus"])["start"])
    except Exception:  # noqa: BLE001 — unlesbares Buch meldet ausfuehren() selbst
        gestartet = True
    if alt_offen and not gestartet:
        r2 = {"zeilen": zusatz + ["⚠️ Pilot 2.0 startet erst, wenn der alte Pilot keine offenen Positionen mehr hat — kein Auftrag."],
              "auftraege": [], "warnung": True, "kapital": None, "modus": None}
    else:
        try:
            r2 = P2L.ausfuehren(ents, trocken=trocken, protokolliere=None if trocken else P2L.protokoll_schreiben)
        except Exception as ex:  # noqa: BLE001
            r2 = {"zeilen": [f"⚠️ Pilot 2.0 abgebrochen ({type(ex).__name__}: {str(ex)[:150]}) — bitte im Binance-Konto prüfen!"],
                  "auftraege": [], "warnung": True, "kapital": None, "modus": None}
        if zusatz:
            r2["zeilen"] = zusatz + r2["zeilen"]
            r2["warnung"] = r2["warnung"] or bool(alt_offen)
    if not trocken:  # ein Probelauf schreibt und sendet nichts (auch kein Logbuch, keine Push-Nachricht)
        kontostand_merken(lb, ents[0]["stand"], r2.get("kapital"), f"pilot2-{r2.get('modus')}")
        lb["letzter_lauf"] = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ok": not r2["warnung"],
                              "hinweise": [z for z in r2["zeilen"] if "⚠️" in z][:10]}
        schreiben(lb)
    zeilen = [text(e) for e in ents] + ["Pilot 2.0 (Spot-Long + Short + Ernte):"] + ["   " + z for z in r2["zeilen"]]
    bericht = None if trocken else wochenbericht(lb, date.today().isoformat())
    lage_text = lage() if callable(lage) else lage
    print("\n".join(zeilen))
    if not trocken and (r2["auftraege"] or r2["warnung"] or bericht):
        import signale as SG
        SG.push("\n".join(zeilen) + f"\n{lage_text}" + (f"\n\n{bericht}" if bericht else "") + "\nKeine Anlageberatung.")
    return 3 if r2["warnung"] else 0


def handeln(ents, lage, trocken):
    """Aufträge je Markt. Ein Fehler in einem Markt hält den anderen nicht auf; Warnungen kommen immer aufs Handy.
    lage: Text oder Funktion (wird erst nach den Aufträgen aufgerufen)."""
    import pilot2_live as P2L
    if P2L.aktiv():
        alt, fehler = alter_pilot_offen()
        return handeln2(ents, lage, trocken, alt, fehler)
    if P2L.hat_bestand():
        # Pilot 2.0 ausgeschaltet, aber gestartet: seine Positionen verwaltet niemand → laut melden. Im SELBEN Konto würde der
        # alte Pilot den Ernte-Short für seinen halten (closePosition-Stop zerstört die Absicherung) → dann handelt er nicht.
        import signale as SG
        try:
            modi = P2L.modi_mit_bestand()
        except P2L.BuchKaputt:
            modi = ["echt", "testnetz"]  # unbekannt → vorsichtig
        selbes = any(teilt_konto(None, m) for m in modi)
        t = (f"⚠️ Pilot 2.0 ist gestartet ({', '.join(modi)}), aber ausgeschaltet (KRYPTO_PILOT2) — seine Positionen verwaltet niemand. "
             "Not-Aus (stop.bat) schliesst sie, danach weiter.bat."
             + (" Der alte Pilot handelt nicht (gleiches Konto)." if selbes else " Der alte Pilot handelt in seinem eigenen Konto weiter."))
        print(t)
        if not trocken:
            SG.push(t + "\nKeine Anlageberatung.")
        if selbes:
            return 3
    import broker_futures as BF
    lb = lies()
    zeilen, wechsel_da, alle, warnung = [], False, [], False
    for e in ents:
        vorher = letzter(lb, e["markt"])
        if not vorher or vorher["stand"] != e["stand"]:
            lb["entscheide"] = (lb["entscheide"] + [e])[-4000:]
        try:
            auftraege = BF.ausfuehren(e, trocken=trocken, symbol=e["symbol"], gewicht=1 / len(ents))
        except Exception as ex:  # noqa: BLE001 — darf den nächsten Markt und die Nachricht nie verhindern
            auftraege = []
            e["broker"] = {"hinweis": f"⚠️ Lauf abgebrochen ({type(ex).__name__}: {str(ex)[:150]}) — bitte im Binance-Konto prüfen!",
                           "position": None, "ohne_stop": None, "fehler": True}
        alle += auftraege
        b = e.get("broker") or {}
        hinweis = b.get("hinweis") if b.get("hinweis") and b.get("hinweis") != "keine Futures-Schlüssel" else ""
        warnung = warnung or bool(b.get("ohne_stop") or b.get("fehler") or "⚠️" in hinweis)
        wechsel = vorher is None or (vorher["hebel"] > 0) != (e["hebel"] > 0) or (vorher["hebel"] < 0) != (e["hebel"] < 0) \
            or vorher["detektor"]["ok"] != e["detektor"]["ok"]
        wechsel_da = wechsel_da or wechsel
        zeilen.append(text(e) + ("\n   Aufträge: " + ", ".join(f"{x['seite']} {x['menge']}" + (" ✗" if x.get("fehler") else "")
                                                             for x in auftraege) if auftraege else "")
                      + (f"\n   {hinweis}" if hinweis else ""))
    # Abgewählte Märkte (KRYPTO_PILOT_MAERKTE): eine noch offene Position würde sonst nie mehr verwaltet (kein Trend-Ausstieg,
    # Stop nie nachgeführt) → mit Ziel 0 schliessen (nur verkleinern) und melden.
    gewaehlt = {e["markt"] for e in ents}
    for m, (sym, _, _) in MAERKTE.items():
        if m in gewaehlt:
            continue
        e_ab = {"hebel": 0.0, "stand": ents[0]["stand"]}
        try:
            a_ab = BF.ausfuehren(e_ab, trocken=trocken, symbol=sym, gewicht=1 / len(ents)) or []
        except Exception as ex:  # noqa: BLE001
            a_ab, e_ab["broker"] = [], {"fehler": True, "hinweis": f"{type(ex).__name__}"}
        b_ab = e_ab.get("broker") or {}
        if a_ab or b_ab.get("fehler") or b_ab.get("position"):
            alle += a_ab
            warnung = warnung or bool(b_ab.get("fehler") or b_ab.get("position"))
            zeilen.append(f"{m} ist abgewählt (KRYPTO_PILOT_MAERKTE) — offene Position wird geschlossen: "
                          + (", ".join(f"{x['seite']} {x['menge']}" + (" ✗" if x.get("fehler") else "") for x in a_ab) or "—")
                          + (f" · ⚠️ noch offen: {b_ab['position']:g}" if b_ab.get("position") else "")
                          + (f" · {b_ab.get('hinweis')}" if b_ab.get("fehler") else ""))
    if not trocken:
        modus = next(((e.get("broker") or {}).get("modus") for e in ents if (e.get("broker") or {}).get("modus")), None)
        kontostand_merken(lb, ents[0]["stand"], ents[0].get("kapital"), modus)
        erst = next((e["broker"] for e in ents if (e.get("broker") or {}).get("offen") is not None), None)
        if erst:
            try:  # nur für die Anzeige: darf den Lauf nie stören
                import profit as PR
                PR.offen_notieren(erst["modus"], erst["offen"], erst["offen_ms"])
            except Exception as ex:  # noqa: BLE001
                print(f"Profit-Stand nicht gemerkt: {type(ex).__name__}")
    bericht = None if trocken else wochenbericht(lb, date.today().isoformat())
    if not trocken:
        lb["letzter_lauf"] = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ok": not warnung,
                              "hinweise": [((e.get("broker") or {}).get("hinweis") or "") for e in ents
                                           if (e.get("broker") or {}).get("hinweis") not in (None, "", "keine Futures-Schlüssel")][:10]}
    schreiben(lb)
    lage_text = lage() if callable(lage) else lage  # erst jetzt: nach allen Aufträgen
    if alle or wechsel_da or bericht or warnung:
        import signale as SG
        SG.push("\n".join(zeilen) + f"\n{lage_text}" + (f"\n\n{bericht}" if bericht else "") + "\nKeine Anlageberatung.")
    return 3 if warnung else 0  # 3 = Warnung, schon aufs Handy gemeldet (1 bleibt für Abstürze)


if __name__ == "__main__":
    raise SystemExit(main())
