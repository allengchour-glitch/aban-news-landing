#!/usr/bin/env python3
"""Daytrading-Signale per Telegram — für Plattformen ohne Schnittstelle wie Plus500. Löst KEINEN Auftrag aus.

Warum nur Signale? Plus500 bietet für CFD-Konten weder eine API noch MetaTrader; die Webseite per Skript
fernzusteuern verstösst gegen die Nutzungsbedingungen. Der Bot rechnet, du entscheidest und klickst.

Ablauf pro Prüfung (z. B. alle 15 Minuten während der Handelszeiten, siehe README.md):
  1. Stundenkerzen der letzten ~2 Jahre (Yahoo Finance, ohne Schlüssel) je Markt.
  2. Regel-Wahl wie im Daytrading-Test (tools/trading/daytrading.py): die beste von 9 Tagesregeln auf den
     letzten 120 abgeschlossenen Handelstagen.
  3. GÜTESIEGEL: Dasselbe Verfahren rückblickend nur auf ungesehenen Tagen (Walk-Forward). Ein Signal wird nur
     gesendet, wenn die letzten 240 ungesehenen Tage nach Kosten im Plus lagen UND ein Münzwurf an denselben
     Tagen das Ergebnis in weniger als 20 % der Fälle erreicht. Sonst: kein Signal. Im eigenen Test (reports/
     DAYTRADING.md) lagen die meisten Märkte nach Kosten im Minus — das Siegel wird also oft „nein“ sagen.
  4. Signal nur, wenn es FRISCH ist (in der letzten abgeschlossenen Stunde entstanden), höchstens eines je Markt
     und Tag. Mit Stop (Notbremse), Positionsgrösse aus Kontogrösse und Risiko, ungefährer Margin.
  5. Jedes gesendete Signal kommt ins Logbuch data/ki-signale.json; nach Tagesschluss wird es mit dem echten
     Ausgang abgerechnet (Ausstieg zum Tagesschluss bzw. am Stop). So siehst du, ob es etwas taugt.

    python3 tools/trading/ki_bot/signale.py --einmal            # eine Prüfung (für Aufgabenplanung/cron)
    python3 tools/trading/ki_bot/signale.py --dauer --minuten 15 # läuft, bis du ihn stoppst (PC)
    python3 tools/trading/ki_bot/signale.py --rueckblick         # Bilanz der gesendeten Signale
    python3 tools/trading/ki_bot/signale.py --test-push          # Test-Nachricht an Telegram

Einstellungen über Umgebungsvariablen: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID und/oder KI_BOT_NTFY (ohne → nur Bildschirm),
KI_BOT_KONTO (Kontogrösse, Standard 1000), KI_BOT_WAEHRUNG (CHF/EUR/USD, Standard CHF), KI_BOT_RISIKO
(Prozent pro Trade, Standard 1). Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys
import time
import urllib.parse
import urllib.request
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent))
import daytrading as DT  # noqa: E402
from lern_bot import kurse  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "ki-signale.json"
# Märkte, die es bei Plus500 als CFD gibt; Hebel = ESMA-Obergrenze für Privatkunden (Margin-Hinweis)
MAERKTE = {"GC=F": ("Gold", 20), "SI=F": ("Silber", 10), "CL=F": ("Öl (WTI)", 10), "ES=F": ("S&P 500", 20),
           "NQ=F": ("Nasdaq 100", 20), "BTC-USD": ("Bitcoin", 2), "EURUSD=X": ("EUR/USD", 30)}
FENSTER = 240        # so viele ungesehene Tage zählen fürs Gütesiegel
MUENZE_MAX = 0.20    # höchstens so oft darf ein Münzwurf gleich gut sein


# ───────────── Kerzen und Handelstage (inkl. laufendem Tag) ─────────────
def sitzungstag(ts):
    return (datetime.fromtimestamp(ts, timezone.utc) + timedelta(hours=2)).date()


def gruppiere(kerzen):
    tage = OrderedDict()
    for t, o, c in kerzen:
        tage.setdefault(sitzungstag(t), []).append((o, c, t))
    return tage


def regel_live(name, tag):
    """Live-Fassung der Tagesregeln: tag = bisher abgeschlossene Kerzen (o, c, t).
    Liefert (Richtung, Einstieg, Kerzen-Index des Signals, Stop-Abstand) oder None."""
    K = int(name.split()[1]) if name.startswith("Erste") else int(name.split()[2].split("-")[0])
    if name.startswith("Erste"):
        if len(tag) < K:
            return None
        oeffnung, kurs = tag[0][0], tag[K - 1][1]
        if kurs == oeffnung:
            return None
        r = 1 if kurs > oeffnung else -1
        if "umkehren" in name:
            r = -r
        return r, kurs, K - 1, abs(kurs - oeffnung) or kurs * 0.002
    hoch = max(max(o, c) for o, c, _ in tag[:K]) if len(tag) >= K else None
    tief = min(min(o, c) for o, c, _ in tag[:K]) if len(tag) >= K else None
    if hoch is None:
        return None
    for j in range(K, len(tag)):
        c = tag[j][1]
        if c > hoch:
            return 1, c, j, c - tief
        if c < tief:
            return -1, c, j, hoch - c
    return None


def walk_forward_liste(tage):
    """Wie DT.walk_forward, aber mit Tagesbewegung je ungesehenem Tag (für den Münzwurf) und der Regel für heute."""
    out, i = [], DT.LERN
    while i + DT.TEST <= len(tage):
        lern = tage[i - DT.LERN:i]
        beste = max(DT.REGELN, key=lambda rg: DT.sharpe([DT.ergebnis(t, rg[1], DT.KOSTEN)[0] for _, t in lern]))
        for _, t in tage[i:i + DT.TEST]:
            r, _ok = DT.ergebnis(t, beste[1], DT.KOSTEN)
            out.append(r)
        i += DT.TEST
    lern = tage[-DT.LERN:]
    heute = max(DT.REGELN, key=lambda rg: DT.sharpe([DT.ergebnis(t, rg[1], DT.KOSTEN)[0] for _, t in lern]))
    return out, heute[0]


def guetesiegel(ergebnisse, n=2000, seed=11):
    letzte = ergebnisse[-FENSTER:]
    if len(letzte) < 60:
        return {"ok": False, "grund": "zu wenig ungesehene Tage"}
    w = 1.0
    for x in letzte:
        w *= 1 + x
    rnd = random.Random(seed)
    bewegungen = [abs(x + DT.KOSTEN) for x in letzte if x != 0]
    gleich_gut = 0
    for _ in range(n):
        z = 1.0
        for b in bewegungen:
            z *= 1 + (b if rnd.random() < 0.5 else -b) - DT.KOSTEN
        gleich_gut += z >= w
    p = gleich_gut / n
    ok = w > 1 and p < MUENZE_MAX
    return {"ok": ok, "rendite": round(w - 1, 4), "muenze": round(p, 3), "tage": len(letzte),
            "grund": "" if ok else ("nach Kosten im Minus" if w <= 1 else "mit Münzwurf erklärbar")}


# ───────────── Positionsgrösse ─────────────
def umrechnung(waehrung):
    """1 USD in Kontowährung (letzter Tageskurs)."""
    if waehrung == "USD":
        return 1.0
    sym = {"CHF": "USDCHF=X", "EUR": "EURUSD=X"}[waehrung]
    reihe = kurse(sym, False)
    k = float(reihe[-1][1])
    return k if waehrung == "CHF" else 1 / k


def groesse(einstieg, stop_abstand, konto, risiko_pct, usd_in_konto, hebel):
    """Einheiten so, dass ein Stop genau risiko_pct des Kontos kostet. Für EUR/USD: Einheiten in EUR, Gewinn in USD."""
    risiko = konto * risiko_pct / 100
    verlust_je_einheit = stop_abstand * usd_in_konto  # Kursabstand in USD × Umrechnung
    einheiten = risiko / verlust_je_einheit if verlust_je_einheit > 0 else 0.0
    nominal = einheiten * einstieg * usd_in_konto
    return {"risiko": round(risiko, 2), "einheiten": round(einheiten, 4 if einheiten < 10 else 2),
            "nominal": round(nominal, 2), "margin": round(nominal / hebel, 2), "hebel_effektiv": round(nominal / konto, 1) if konto else None}


# ───────────── Telegram ─────────────
def push_ntfy(text, env=None):
    """Gratis-Push über ntfy.sh — ohne Konto: App „ntfy“ installieren, Thema abonnieren, KI_BOT_NTFY=<thema> setzen.
    Themen sind öffentlich lesbar, wer den Namen kennt: einen langen, zufälligen Namen wählen."""
    env = os.environ if env is None else env
    thema = env.get("KI_BOT_NTFY", "").strip()
    if not thema:
        return False
    server = (env.get("KI_BOT_NTFY_SERVER") or "https://ntfy.sh").rstrip("/")
    req = urllib.request.Request(f"{server}/{urllib.parse.quote(thema)}", data=text.encode("utf-8"), method="POST",
                                 headers={"Title": "KI-Bot", "Tags": "chart_with_upwards_trend"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return 200 <= r.status < 300
    except Exception as e:  # noqa: BLE001
        print(f"ntfy-Fehler: {type(e).__name__}")
        return False


def push(text):
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN", ""), os.environ.get("TELEGRAM_CHAT_ID", "")
    print("\n" + text + "\n")
    ntfy = push_ntfy(text)
    if not token or not chat:
        return ntfy
    daten = urllib.parse.urlencode({"chat_id": chat, "text": text, "disable_web_page_preview": "true"}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=daten), timeout=15) as r:
            return json.load(r).get("ok", False)
    except Exception as e:  # noqa: BLE001
        print(f"Telegram-Fehler: {type(e).__name__}")
        return False


# ───────────── Logbuch ─────────────
def lies():
    if LOGBUCH.exists():
        return json.loads(LOGBUCH.read_text(encoding="utf-8"))
    return {"version": 1, "signale": [], "pruefungen": {}}


def schreibe(lb):
    LOGBUCH.parent.mkdir(exist_ok=True)
    LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def abrechnen(lb, tage_je_markt):
    """Signale von abgeschlossenen Tagen mit dem echten Ausgang verbuchen (Stop zuerst, sonst Tagesschluss)."""
    for s in lb["signale"]:
        if s.get("ergebnis") is not None:
            continue
        tage = tage_je_markt.get(s["symbol"])
        if not tage:
            continue
        tag = tage.get(datetime.fromisoformat(s["tag"]).date())
        heute = max(tage)
        if tag is None or datetime.fromisoformat(s["tag"]).date() >= heute:
            continue  # Tag noch nicht abgeschlossen
        nach = tag[s["kerze"] + 1:]
        stop = s["einstieg"] - s["richtung"] * s["stop_abstand"]
        ausstieg, grund = tag[-1][1], "Tagesschluss"
        for _o, c, _t in nach:
            if (s["richtung"] == 1 and c <= stop) or (s["richtung"] == -1 and c >= stop):
                ausstieg, grund = stop, "Stop"
                break
        r = s["richtung"] * (ausstieg / s["einstieg"] - 1) - DT.KOSTEN
        s["ergebnis"] = {"ausstieg": round(ausstieg, 6), "grund": grund, "rendite": round(r, 5),
                         "R": round(r * s["einstieg"] / s["stop_abstand"], 2)}


# ───────────── Eine Prüfung ─────────────
def pruefe(jetzt=None, offline=False):
    jetzt = jetzt or datetime.now(timezone.utc)
    lb = lies()
    konto = float(os.environ.get("KI_BOT_KONTO") or "1000")
    waehrung = (os.environ.get("KI_BOT_WAEHRUNG") or "CHF").upper()
    risiko = float(os.environ.get("KI_BOT_RISIKO") or "1")
    usd_in_konto = umrechnung(waehrung)
    tage_je_markt, neu = {}, []
    for sym, (name, hebel) in MAERKTE.items():
        try:
            kerzen = DT.stunden(sym, offline)
        except Exception as e:  # noqa: BLE001
            print(f"⚠️  {name}: keine Stundenkerzen ({type(e).__name__})")
            continue
        # Laufende Kerze (Stunde noch nicht vorbei) weglassen: nur abgeschlossene Kerzen zählen
        alle = gruppiere([k for k in kerzen if k[0] + 3600 <= jetzt.timestamp()])
        if not alle:
            continue
        tage_je_markt[sym] = alle
        heute_tag = max(alle)
        fertig = [(k, [(o, c) for o, c, _ in v]) for k, v in alle.items() if k < heute_tag and len(v) >= 8]
        if len(fertig) < DT.LERN + FENSTER // 2:
            continue
        ergebnisse, regel = walk_forward_liste(fertig)
        siegel = guetesiegel(ergebnisse)
        lb["pruefungen"][name] = {"zeit": jetzt.isoformat(timespec="minutes"), "regel": regel, "siegel": siegel}
        heute = alle[heute_tag]
        sig = regel_live(regel, heute)
        if not sig:
            continue
        richtung, einstieg, j, stop_abstand = sig
        if j < len(heute) - 1:  # nicht frisch: Signal entstand vor mehr als einer Stunde
            continue
        sid = f"{heute_tag}|{sym}"
        if any(s["id"] == sid for s in lb["signale"]):
            continue
        g = groesse(einstieg, stop_abstand, konto, risiko, usd_in_konto, hebel)
        s = {"id": sid, "zeit": jetzt.isoformat(timespec="minutes"), "tag": heute_tag.isoformat(), "symbol": sym, "markt": name,
             "regel": regel, "richtung": richtung, "einstieg": einstieg, "stop_abstand": stop_abstand, "kerze": j,
             "groesse": g, "siegel": siegel, "gesendet": bool(siegel["ok"]), "ergebnis": None}
        lb["signale"].append(s)  # ohne Gütesiegel: nur Schattenbuch (nicht gesendet), wird trotzdem abgerechnet
        if s["gesendet"]:
            neu.append(s)
    abrechnen(lb, tage_je_markt)
    schreibe(lb)
    for s in neu:
        stop = s["einstieg"] - s["richtung"] * s["stop_abstand"]
        g = s["groesse"]
        push(f"{'🟢 KAUFEN' if s['richtung'] == 1 else '🔴 VERKAUFEN'} {s['markt']} — Daytrading-Signal (kein Auftrag ausgelöst)\n"
             f"Einstieg ca. {s['einstieg']:.5g} · Stop {stop:.5g} · Schliessen spätestens zum Tagesschluss\n"
             f"Grösse: {g['einheiten']} Einheiten · Risiko {g['risiko']:.2f} {waehrung} ({risiko:g} %) · Margin ca. {g['margin']:.2f} {waehrung}\n"
             f"Regel: {s['regel']} · Gütesiegel: letzte {s['siegel']['tage']} ungesehene Tage {s['siegel']['rendite'] * 100:+.1f} %, "
             f"Münzwurf gleich gut in {s['siegel']['muenze'] * 100:.0f} %\n"
             f"Laut ESMA verlieren 74–89 % der CFD-Konten Geld. Keine Anlageberatung.")
    if not neu:
        offen = [n for n, v in lb["pruefungen"].items() if v["siegel"]["ok"]]
        print(f"Kein frisches Signal. Märkte mit Gütesiegel: {', '.join(offen) if offen else 'keine'}.")
    tag = jetzt.date().isoformat()
    if lb.get("zusammenfassung_gesendet") != tag and lb["pruefungen"]:  # einmal pro Tag ein Lagebericht
        zeilen = [f"{'✅' if v['siegel']['ok'] else '⛔'} {n}: {v['regel']}" + ("" if v["siegel"]["ok"] else f" — {v['siegel'].get('grund', '')}")
                  for n, v in lb["pruefungen"].items()]
        fertig = [x for x in lb["signale"] if x.get("ergebnis") and x.get("gesendet")]
        bilanz = (f"Bisher {len(fertig)} gesendete Signale abgerechnet, Ø {sum(x['ergebnis']['rendite'] for x in fertig) / len(fertig) * 100:+.2f} % je Trade."
                  if fertig else "Noch keine gesendeten Signale abgerechnet.")
        push("📋 KI-Bot Lagebericht " + tag + "\nSignale gibt es nur mit Gütesiegel (letzte 240 ungesehene Tage nach Kosten im Plus und nicht durch Münzwurf erklärbar).\n"
             + "\n".join(zeilen) + "\n" + bilanz)
        lb["zusammenfassung_gesendet"] = tag
        schreibe(lb)
    return neu


def rueckblick():
    lb = lies()
    for art, filt in (("gesendet (mit Gütesiegel)", True), ("Schattenbuch (ohne Gütesiegel, nicht gesendet)", False)):
        alle = [s for s in lb["signale"] if bool(s.get("gesendet")) == filt]
        fertig = [s for s in alle if s.get("ergebnis")]
        print(f"{art}: {len(alle)} Signale, {len(fertig)} abgerechnet")
        if fertig:
            r = [s["ergebnis"]["rendite"] for s in fertig]
            R = [s["ergebnis"]["R"] for s in fertig]
            print(f"   im Plus {sum(x > 0 for x in r)}/{len(r)} · Ø {statistics.mean(r) * 100:+.2f} % je Trade · Ø {statistics.mean(R):+.2f} R")
    for n, v in lb["pruefungen"].items():
        sg = v["siegel"]
        print(f"  {n:12} Regel {v['regel']:28} Siegel {'JA ' if sg['ok'] else 'nein'} {sg.get('grund', '')}")


def runde(a):
    neu = pruefe(offline=a.offline)
    if a.broker == "alpaca":
        import broker_alpaca as B
        B.daytrade(neu, trocken=a.trocken)
        if B.kurz_vor_schluss():  # 20 Min. vor dem echten US-Börsenschluss (Alpaca-Uhr, Sommer/Winter): glattstellen
            B.schliesse_daytrades(datetime.now(timezone.utc).date().isoformat(), trocken=a.trocken)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--einmal", action="store_true")
    ap.add_argument("--dauer", action="store_true")
    ap.add_argument("--minuten", type=int, default=15)
    ap.add_argument("--rueckblick", action="store_true")
    ap.add_argument("--test-push", action="store_true")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--broker", choices=["alpaca"], help="Signale mit Gütesiegel zusätzlich als Bracket-Auftrag (Standard: Papierkonto)")
    ap.add_argument("--trocken", action="store_true", help="Broker: Aufträge nur anzeigen")
    a = ap.parse_args()
    if a.test_push:
        return 0 if push("✅ Test: Der KI-Bot kann dir Nachrichten schicken.") else 1
    if a.rueckblick:
        rueckblick()
        return 0
    if a.einmal:
        runde(a)
        return 0
    if a.dauer:
        print(f"Läuft — prüft alle {a.minuten} Minuten. Stoppen mit Ctrl+C.")
        while True:
            try:
                runde(a)
            except Exception as e:  # noqa: BLE001  (Netzfehler dürfen den Dauerlauf nicht beenden)
                print(f"Fehler in dieser Runde: {type(e).__name__}: {e}")
            time.sleep(max(60, a.minuten * 60))
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
