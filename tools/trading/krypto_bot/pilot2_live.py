#!/usr/bin/env python3
"""Pilot 2.0 — Ausführung über Binance Spot UND USDⓈ-M Futures, in einem Konto NUR für Pilot 2.0.

Rechnung: pilot2_plan.py (Richtung long über Spot, short über Perpetual, freier Teil als Funding-Ernte, Pfand 110 %).
Einschalten: KRYPTO_PILOT2=an UND im Code FREIGEGEBEN = True (erst nach einer unabhängigen Prüfung ohne Blocker).

Grundsatz «Konto = Wahrheit»: Pilot 2.0 handelt nur in einem Konto, das ihm allein gehört — mit echtem Geld ein Binance-
UNTERKONTO nur für Pilot 2.0 (Schlüssel PILOT2_API_KEY/SECRET dieses Unterkontos), im Testnetz die Test-Konten (Spielgeld).
Alles, was darin liegt, gehört Pilot 2.0. Darum führt er KEIN eigenes Coin- oder USDT-Buch, das vom Konto abweichen könnte:
jeder Lauf liest den Kontostand, rechnet, handelt und gleicht am Ende die Stops mit dem Kontostand ab.

Sicherungen:
  • Echtes Geld NUR, wenn ALLES gesetzt ist: BINANCE_TESTNET=false, BINANCE_FUTURES_TESTNET=false,
    KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD" und KRYPTO_PILOT2=an.
  • Start mit echtem Geld: Unterkonto bis auf USDT leer (keine BTC/ETH, keine offenen Aufträge, keine Futures-Positionen,
    kein Futures-Guthaben) und höchstens KRYPTO_PILOT2_KAPITAL USDT darin. Mehr als im Unterkonto liegt, kann er nicht verlieren.
    Der Start wird gespeichert, BEVOR ein Auftrag rausgeht — geht das nicht, handelt er nicht.
  • Gebunden an DIESES Konto: die Binance-Konto-ID (UID) wird beim Start gemerkt. Andere oder fehlende UID → kein Auftrag,
    und der Not-Aus fasst ein fremdes Konto nie an. Ein zweiter Modus (Testnetz/echt) startet nie, solange einer gestartet ist.
  • Schlüssel-Rechte (echtes Geld): Auszahlung, Margin-Leihe und Überweisung an Dritte AUS; Spot- und Futures-Handel AN.
    «Universal Transfer» (zwischen Spot und Futures DIESES Kontos) ist erlaubt, aber nicht nötig — ohne ihn füllst du beide selbst.
  • Not-Aus (KI_BOT_STOP=1, Datei STOP, Cockpit, Telegram, stop.bat, Tagesaufgabe) hat Vorrang vor allem. Er schliesst jeden
    gestarteten Modus mit den Schlüsseln dieses Modus: Lage lesen (mit Wiederholungen, sonst nichts anfassen), erst das
    Perpetual (scheitert das, bleibt so viel Spot als Absicherung stehen, wie der Short gross ist), dann zuerst die FREIEN
    Coins verkaufen und erst wenn das geht die gesperrten: Stop und Verkauf in EINER Anfrage (cancelReplace) — lehnt Binance
    den Verkauf ab, bleibt der Stop stehen; mehrere Versuche. Bleibt dabei etwas ungesichert übrig, bekommt es sofort einen
    Schutz-Stop — bestehende eigene Stops bleiben (gesperrte Coins gelten als gesichert; ein ausgelöster, hängender
    STOP_LOSS_LIMIT nicht), zu grosse werden ersetzt (der passende zuerst); würde er sofort auslösen: 5 % vom frischen Kurs.
    Nie ein Long ohne Absicherung UND ohne Stop. «Alles zu» nur, wenn nachgeprüft, kein Futures-Auftrag mehr offen und kein
    Auftrag mehr unklar ist. Blieb einer unklar, wartet die Nachkontrolle (stop.bat, Tagesaufgabe) bis 11 Minuten und
    schliesst danach nochmals, was verspätet ankam.
  • Stops nach der TATSÄCHLICHEN Netto-Richtung (Spot-Coins + Perpetual): long → Spot-Stop (STOP_LOSS = Markt), short →
    Perp-Stop mit Menge + reduceOnly (nie closePosition — die Ernte-Absicherung trifft er nie). Vor dem Handeln werden zu grosse
    eigene Stops auf das verkleinert, was während des ganzen Laufs sicher ungesichert ist; am Ende gleicht er ab, bis der
    Kontostand während des Abgleichs gleich bleibt (ein Börsen-Stop kann dazwischen auslösen). Ein passender eigener Stop
    bleibt stehen; sonst wird er ERSETZT, ohne ihn vorher wegzunehmen: Perp-Stop — zuerst der neue (neuer Kurs, sonst alter,
    sonst Not-Stop 5 %), dann der alte weg; Spot-Stop — Storno und neuer Stop in EINER Anfrage (cancelReplace), lehnt Binance
    den neuen ab, bleibt der alte (freie Coins bekommen dann einen Zusatz-Stop). Netto short: der Coin-Rest unter einem
    Futures-Schritt bekommt einen eigenen Spot-Stop. Liegt der Kurs schon jenseits des Stops, schliesst er sofort zum Markt
    (Rest: Not-Stop). Jeder Stop hat EINE Kennung für alle Versuche (im Buch gemerkt): kam ein Versuch doch an, lehnt Binance
    die Wiederholung als Doppel ab, und ein Stop mit verlorener Antwort lässt sich über die Kennung löschen.
  • Unklare Antworten (Spot UND Futures, im Lauf, beim Ausstieg und im Not-Aus): der Markt ist für den Rest des Laufs
    gesperrt; am Laufende fragt er mehrmals per Kennung nach (offen → storniert). Was dann noch unklar ist, steht im Buch und
    sperrt den Markt, bis Binance es bestätigt (nach 10 Minuten unbekannt = nie ausgeführt) — und der Markt wird BEIDSEITIG
    gesichert: Spot-Stop über alle Coins, reduceOnly-Perp-Stop über den ganzen Short plus die unklaren Shorts. Die
    Nachkontrolle (pilot.py --nachkontrolle, nach jedem Lauf) fragt bis 11 Minuten weiter und setzt die Stops, sobald etwas
    ankommt — ein verspäteter Kauf liegt so höchstens einen Takt (30 s) ohne Stop, ein verspäteter Short ist nie nackt.
  • Kann er eine Liste oder den Kontostand nicht lesen, sichert er trotzdem: länger warten, sonst mit dem Stand von vorhin;
    gesperrte Coins gelten (im Pilot-Konto) als von einem eigenen Stop gehalten — ein neuer Stop deckt nur den Rest. Bleibt
    ein Markt ohne vollständigen Stop (Binance lehnt ab), steht er im Buch («schutz_offen») und die Nachkontrolle versucht es
    bis 11 Minuten weiter. Lässt sich ein alter Perp-Stop nicht löschen, wird der Markt beidseitig gesichert.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_binance as BB  # noqa: E402
import broker_futures as BF  # noqa: E402
import pilot2_plan as PL  # noqa: E402

# Freigabe für den echten Bot. Bleibt False, bis eine unabhängige Prüfung KEINE Blocker mehr findet. Solange False, ist
# KRYPTO_PILOT2=an wirkungslos und der Pilot handelt wie bisher. Der Not-Aus für einen gestarteten Pilot 2.0 wirkt immer.
FREIGEGEBEN = False

ECHTGELD_SATZ = "JA, MIT ECHTEM GELD"
SPOT_TEST, SPOT_ECHT = "https://testnet.binance.vision", "https://api.binance.com"
FUT_TEST, FUT_ECHT = "https://testnet.binancefuture.com", "https://fapi.binance.com"
HOSTS_SPOT = {False: {"testnet.binance.vision", "127.0.0.1", "localhost"}, True: {"api.binance.com", "127.0.0.1", "localhost"}}
HOSTS_FUT = {False: {"testnet.binancefuture.com", "demo-fapi.binance.com", "127.0.0.1", "localhost"},
             True: {"fapi.binance.com", "127.0.0.1", "localhost"}}
COINS = {"BTC": ("BTCUSDT", "BTC"), "ETH": ("ETHUSDT", "ETH")}
PROTOKOLL = HIER.parents[2] / "data" / "krypto-pilot2-broker.json"
BESTAND = HIER.parents[2] / "data" / "krypto-pilot2-bestand.json"
STOP_LIMIT_ABSTAND = 0.05
PAUSE_DATEI = HIER.parent / "ki_bot" / "PAUSE"
STAUB_USDT = 5.0                # darunter gilt ein Bestand als leer
GEBUEHREN_RESERVE = 0.005       # 0,5 % des verwalteten Geldes bleiben für Gebühren frei
DECKEL_SPIELRAUM = 1.01         # Startprüfung: Kontowert höchstens 1 % über dem Deckel (Rundung beim Einzahlen)
NOT_STOP_ABSTAND = 0.05         # Ersatz-Stop, wenn kein gültiger Stop-Kurs da ist (5 % vom Kurs)
GEB_SPOT_KAUF = 0.0015          # Not-Aus-Rückkauf von Absicherungs-Coins: Spot-Gebühr in Coins (0,1 %) + Rundung
CID_STOP_SPOT, CID_STOP_PERP = "p2s", "p2a"   # Kennungs-Anfang eigener Stops → verwaiste Stops (verlorene Antwort) findet er wieder
LESE_WARTEN = (0.5, 1.5)        # kurze Störungen (503, 429, Netz) beim Lesen, Stornieren und Stop-Setzen überbrücken
SCHUTZ_WARTEN = (0.5, 1.5, 3.0, 6.0)  # länger, wo ohne Erfolg eine Position OHNE Stop bliebe (Lesen nach dem Storno, Schutz-Stops)
UNKLAR_WARTEN = (2.0, 5.0, 10.0)      # am Laufende: unklare Aufträge so lange nachfragen, bevor beide Seiten gesichert werden
BUCH_WARTEN = (0.3, 1.0)        # Buch-Datei kurz gesperrt (Windows: Virenscanner, OneDrive, offener Editor) → nochmal
VERKAUF_VERSUCHE = 3            # Not-Aus: so oft verkaufen (den Rest jedes Mal neu lesen), danach Schutz-Stop
ABGLEICH_RUNDEN = 3             # Stop-Abgleich wiederholen, bis der Kontostand während des Abgleichs gleich bleibt
# Kennt Binance einen unklaren Auftrag nach 10 Minuten nicht, wurde er nie ausgeführt. Grundlage (Binance-Doku «Timing security»):
# Spot prüft recvWindow (hier 10 s) beim Empfang UND unmittelbar vor der Weitergabe an die Matching Engine — ein älterer Auftrag
# erreicht sie nie. Futures nennt nur die Prüfung beim Empfang (503 «Unknown error» = Status unbekannt) — darum die grosse Reserve.
UNKLAR_MAX_ALTER_MS = 10 * 60 * 1000
NACHKONTROLLE_TAKT_S = 30.0            # Nachkontrolle: so oft unklare Aufträge nachfragen …
NACHKONTROLLE_MAX_S = UNKLAR_MAX_ALTER_MS / 1000 + 90   # … höchstens so lange (danach gilt «unbekannt» als nie ausgeführt)
BUCH_SPERRE_WARTEN = 15  # Sekunden: so lange wartet ein Schreiber, bis ein anderer das Buch fertig geschrieben hat
BREITE_NOTSTOPS = (0.10, 0.20, 0.35)  # Not-Aus: zum Markt ging nicht → wenigstens ein weiter Not-Stop (Abstand vom letzten Kurs)
MARKT_VERSUCHE = 5              # Not-Aus zum Markt: Teil-Ausführungen (EXPIRED) bis zu so oft mit dem Rest nachfassen
PAAR_PAUSE_MS = 15 * 60 * 1000  # Not-Aus: Rückkauf eines Ernte-Shorts abgelehnt → das Paar so lange stehen lassen (keine Gebührenmühle)
AUTH_FEHLER = ("-2014", "-2015", "-2008", "-1022")  # Schlüssel passt nicht zu diesem Konto/Netz


class BuchKaputt(ValueError):
    """Buch-Datei vorhanden, aber unlesbar → nie überschreiben, nie «nichts offen» melden."""


class _Ausgeloest(Exception):
    """Der erste Stop-Kurs würde sofort auslösen (Kurs schon jenseits) → wie ein ausgelöster Stop zum Markt schliessen."""


class _StopWeg(Exception):
    """cancelReplace: Binance hat den Stop storniert, den Ersatz aber abgelehnt — die Coins sind frei und OHNE Stop."""

    def __init__(self, verkauft, frei):
        super().__init__("Stop storniert, Ersatz abgelehnt")
        self.verkauft, self.frei = verkauft, frei


def _jetzt_ms():
    return int(time.time() * 1000)


def _ausgefuehrt(antwort, menge):
    """Ausgeführte Menge eines Marktauftrags: «executedQty» so, wie Binance sie meldet (auch 0); fehlt das Feld: die Menge."""
    q = (antwort or {}).get("executedQty")
    return float(q) if q not in (None, "") else menge


def _kennung(anfang):
    return f"{anfang}{int(time.time() * 1000)}{random.randint(0, 999999):06d}"


def _voruebergehend(ex):
    """Lohnt ein zweiter Versuch? Netzfehler, 5xx, 408, 418/429 (Rate-Limit) — nie bei einem unklaren Auftrag."""
    if isinstance(ex, BF.UnklarFehler):
        return False
    if isinstance(ex, urllib.error.HTTPError):  # BinanceFehler (Spot und Futures): code = HTTP-Status
        return ex.code is not None and (ex.code >= 500 or ex.code in (408, 418, 429))
    return isinstance(ex, BF.NETZFEHLER)


def _nochmal(f, warten=None):
    """f() mit kurzen Wiederholungen bei vorübergehenden Fehlern. Nur für Lesen und Stornieren — nie für Marktaufträge."""
    warten = LESE_WARTEN if warten is None else warten
    for i in range(len(warten) + 1):
        try:
            return f()
        except Exception as ex:  # noqa: BLE001
            if i >= len(warten) or not _voruebergehend(ex):
                raise
            time.sleep(warten[i])


def _text(ex):
    return str(getattr(ex, "msg", "") or ex)


def _sofort_ausgeloest(ex):
    """Binance lehnt einen Stop ab, weil der Kurs schon jenseits liegt (Spot −2010 «would trigger immediately», Futures −2021)."""
    t = _text(ex).lower()
    return "-2021" in t or "immediately" in t


def _doppelt(ex):
    """Binance lehnt einen Auftrag ab, weil die Kennung schon vergeben ist (Spot −2010 «Duplicate order», Futures −4116)."""
    t = _text(ex).lower()
    return "duplicate" in t or "-4116" in t


def _reduce_abgelehnt(ex):
    """Binance lehnt einen reduceOnly-Auftrag ab (−2022), z. B. einen Stop über mehr als die offene Position."""
    t = _text(ex).lower()
    return "-2022" in t or "reduceonly" in t


def _auth_fehler(ex):
    return getattr(ex, "code", None) == 401 or any(c in _text(ex) for c in AUTH_FEHLER)


def _handel_aus(regeln):
    """Meldet Binance das Symbol als nicht im Handel (exchangeInfo «status» ≠ TRADING, z. B. HALT/BREAK)? Dann kein cancelReplace
    und kein Freigeben gesperrter Coins: ein neuer Auftrag würde abgelehnt — und der alte Stop könnte schon storniert sein."""
    status = (regeln or {}).get("status")
    return bool(status) and status != "TRADING"


def _gleich(a, b, schritt):
    try:
        return abs(float(a) - float(b)) <= schritt / 2 + 1e-12
    except (TypeError, ValueError):
        return False


def aktiv(env=None):
    env = os.environ if env is None else env
    return FREIGEGEBEN and (env.get("KRYPTO_PILOT2") or "").strip().lower() == "an"


def einstellungen(env=None, modus=None):
    """modus=None: aus den Schaltern. modus="echt"/"testnetz": erzwingen (für den Not-Aus eines gestarteten Modus)."""
    env = os.environ if env is None else env
    if modus is None:
        echt = ((env.get("BINANCE_TESTNET") or "true").strip().lower() == "false"
                and (env.get("BINANCE_FUTURES_TESTNET") or "true").strip().lower() == "false"
                and env.get("KI_BOT_ECHTGELD", "") == ECHTGELD_SATZ and aktiv(env))
    else:
        echt = modus == "echt"
    s_url, f_url = env.get("PILOT2_SPOT_URL"), env.get("PILOT2_FUTURES_URL")
    fehler = ""
    for url, erlaubt, name in ((s_url, HOSTS_SPOT, "Spot"), (f_url, HOSTS_FUT, "Futures")):
        if url and urllib.parse.urlparse(url).hostname not in erlaubt[echt]:
            fehler = f"{name}-Adresse passt nicht zum Modus {'Echtgeld' if echt else 'Testnetz'} — aus Sicherheit keine Aufträge."
    if fehler:  # eine falsche Adresse darf nie auf einen anderen Modus umschalten → offizielle Adresse dieses Modus
        s_url = s_url if s_url and urllib.parse.urlparse(s_url).hostname in HOSTS_SPOT[echt] else None
        f_url = f_url if f_url and urllib.parse.urlparse(f_url).hostname in HOSTS_FUT[echt] else None
    if echt:
        sk, ss = env.get("PILOT2_API_KEY", ""), env.get("PILOT2_API_SECRET", "")
        fk, fs = sk, ss
    else:
        sk, ss = env.get("BINANCE_API_KEY", ""), env.get("BINANCE_API_SECRET", "")
        fk, fs = env.get("BINANCE_FUTURES_API_KEY", ""), env.get("BINANCE_FUTURES_API_SECRET", "")
    zahl = lambda n, d: BF.env_zahl(env, n, d)  # noqa: E731
    spot_basis = s_url or (SPOT_ECHT if echt else SPOT_TEST)
    return {"echtgeld": echt, "fehler": fehler, "modus": "echt" if echt else "testnetz",
            "spot": {"key": sk, "secret": ss, "basis": spot_basis},
            "futures": {"key": fk, "secret": fs, "basis": f_url or (FUT_ECHT if echt else FUT_TEST), "spot": spot_basis},
            # Anteil des Pilot-Kontos, den Pilot 2.0 einsetzt (das Konto gehört ihm allein → Standard 100 %)
            "anteil": max(0.0, min(1.0, zahl("PILOT2_ANTEIL", 1.0))), "max_auftrag": max(0.0, zahl("KI_BOT_MAX_AUFTRAG", 1000)),
            "stop": env.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists(),
            "pause": PAUSE_DATEI.exists(),
            "deckel": zahl("KRYPTO_PILOT2_KAPITAL", 0.0 if echt else 10000.0),
            "konflikte": konflikte(env, echt)}


def konflikte(env, echt=False):
    """Andere Bots im selben Binance-Konto → Pilot 2.0 würde deren Coins/Positionen mitbewegen. Mit echtem Geld hat Pilot 2.0
    sein eigenes Unterkonto (PILOT2_API_KEY): ein anderer Bot stört dann nur, wenn er denselben Schlüssel benutzt."""
    p2 = (env.get("PILOT2_API_KEY") or "").strip()

    def gleich(name):
        return not echt or bool(p2 and (env.get(name) or "").strip() == p2)
    out = []
    if (env.get("KRYPTO_BROKER") or "").strip().lower() == "binance" and gleich("BINANCE_API_KEY"):
        out.append("Bitcoin-Spot-Bot (KRYPTO_BROKER=binance)")
    if (env.get("ETH_SPARPLAN_BETRAG") or "").strip() and gleich("BINANCE_API_KEY"):
        out.append("ETH-Sparplan (ETH_SPARPLAN_BETRAG)")
    if (env.get("CALLS_MODUS") or "schatten").strip().lower() in ("testnetz", "echtgeld") and gleich("BINANCE_FUTURES_API_KEY"):
        out.append("kopierte Telegram-Calls (CALLS_MODUS)")
    return out


# ───────────────────────── Buch (Start, Konto-ID, Stop-Kennungen, unklare Aufträge — kein Coin- oder USDT-Buch) ─────────────────────────
def leer_buch():
    return {"start": None, "uid": None, "stops": {}, "perp_offen": False, "unklar": [], "schutz_offen": [], "notaus_offen": False,
            "paar_pause": {}}


def _datei(datei):
    """Ganze Buch-Datei. Fehlt sie: {}. Ist sie unlesbar: BuchKaputt (nie still als leer behandeln). Kurz gesperrt
    (Windows: Virenscanner, OneDrive): nochmal versuchen."""
    p = Path(datei)
    for i in range(len(BUCH_WARTEN) + 1):
        if not p.exists():
            return {}
        try:
            alles = json.loads(p.read_text())
            break
        except ValueError as ex:
            raise BuchKaputt(f"Pilot-2.0-Buch {p.name} unlesbar ({type(ex).__name__})") from ex
        except OSError as ex:
            if i >= len(BUCH_WARTEN):
                raise BuchKaputt(f"Pilot-2.0-Buch {p.name} unlesbar ({type(ex).__name__})") from ex
            time.sleep(BUCH_WARTEN[i])
    if not isinstance(alles, dict):
        raise BuchKaputt(f"Pilot-2.0-Buch {p.name} hat ein falsches Format")
    return alles


def buch_lesen(datei, modus):
    b = _datei(datei).get(modus) or {}
    out = leer_buch()
    out.update({k: v for k, v in b.items() if k in out})
    out["stops"] = {k: dict(v or {}) for k, v in (out["stops"] or {}).items()}
    out["unklar"] = [dict(u) for u in (out["unklar"] or []) if isinstance(u, dict)]
    out["schutz_offen"] = [m for m in (out["schutz_offen"] or []) if m in COINS]
    out["paar_pause"] = {m: int(t) for m, t in (out["paar_pause"] or {}).items() if m in COINS and isinstance(t, (int, float))}
    return out


def _buch_sperre(datei):
    """Kurze Sperre nur fürs Schreiben des Buchs (Millisekunden): Nachkontrolle, Lauf und ein Not-Aus ohne Lauf-Sperre
    (Cockpit/Telegram) schreiben so nie gleichzeitig — die Nachkontrolle vergleicht und schreibt unter derselben Sperre."""
    import sperre
    return sperre.lauf_sperre(name=Path(datei).name + "-schreiben", warten=BUCH_SPERRE_WARTEN, ordner=Path(datei).parent, alt_nach=60)


def buch_schreiben(datei, modus, buch):
    import sperre
    try:
        with _buch_sperre(datei):
            _buch_schreiben_roh(datei, modus, buch)
    except sperre.Besetzt as ex:
        raise OSError(f"Buch gesperrt ({ex})") from None


def _buch_vereinen(platte, meins, basis=None):
    """Zwei Stände desselben Buchs (ein anderer Lauf schrieb dazwischen, z. B. ein zweiter Not-Aus oder die Nachkontrolle):
    nichts geht verloren — unklare Aufträge beider, offene Märkte beider, «Not-Aus offen»/«Perp offen» wenn einer es sagt,
    die längere Paar-Pause, je Markt die Stop-Angaben.
    basis = der Stand, den ich gelesen hatte (3-Wege): übernommen wird von mir nur, was ICH seither geändert habe (auch ein
    gelöschter Stop = None); was nur der andere änderte, bleibt seins; änderten beide, gilt meins — ausser ich habe gelöscht
    und der andere einen neuen Stop eingetragen (der steht an der Börse, seine Kennung darf nicht verloren gehen). Unklare
    Aufträge und offene Märkte: was einer geklärt/erledigt hat (in der Basis, bei ihm nicht mehr), fällt weg; was einer neu
    eingetragen hat, kommt dazu. Ohne Basis: je Markt die Stop-Angaben beider (meine zuletzt), Listen vereint."""
    neu = leer_buch()
    neu["start"] = meins.get("start") or platte.get("start")
    neu["uid"] = meins.get("uid") or platte.get("uid")
    for k in set(platte.get("stops") or {}) | set(meins.get("stops") or {}):
        p_ = (platte.get("stops") or {}).get(k) or {}
        m_ = (meins.get("stops") or {}).get(k) or {}
        if basis is None:
            s = dict(p_)
            s.update({kk: v for kk, v in m_.items() if v is not None})
        else:
            b_ = (basis.get("stops") or {}).get(k) or {}
            s = {}
            for kk in set(p_) | set(m_) | set(b_):
                bv, mv, pv = b_.get(kk), m_.get(kk), p_.get(kk)
                if mv == bv:
                    s[kk] = pv          # ich habe es nicht geändert
                elif pv == bv:
                    s[kk] = mv          # nur ich habe es geändert
                else:
                    s[kk] = mv if mv is not None else pv
        neu["stops"][k] = s
    neu["perp_offen"] = bool(platte.get("perp_offen") or meins.get("perp_offen"))

    def schluessel(u):
        return json.dumps(u, sort_keys=True)
    if basis is None:
        weg = set()
    else:  # in der Basis, aber bei einem von beiden nicht mehr: geklärt
        b_u = {schluessel(u) for u in basis.get("unklar") or []}
        weg = {x for x in b_u if x not in {schluessel(u) for u in platte.get("unklar") or []}
               or x not in {schluessel(u) for u in meins.get("unklar") or []}}
    gesehen = set()
    for u in (platte.get("unklar") or []) + (meins.get("unklar") or []):
        x = schluessel(u)
        if x not in gesehen and x not in weg:
            gesehen.add(x)
            neu["unklar"].append(u)
    p_s, m_s = set(platte.get("schutz_offen") or []), set(meins.get("schutz_offen") or [])
    b_s = set(basis.get("schutz_offen") or []) if basis is not None else set()
    neu["schutz_offen"] = [m for m in COINS if (m in p_s or m in m_s) and not (m in b_s and (m not in p_s or m not in m_s))]
    neu["notaus_offen"] = bool(platte.get("notaus_offen") or meins.get("notaus_offen"))
    for m in COINS:
        t_ = max(int((platte.get("paar_pause") or {}).get(m) or 0), int((meins.get("paar_pause") or {}).get(m) or 0))
        if t_:
            neu["paar_pause"][m] = t_
    return neu


def _buch_uebernehmen(buch, neu):
    """Den vereinten Stand ins laufende Buch übernehmen, ohne die Stop-Einträge der Märkte auszutauschen: wer gerade einen
    Eintrag buch["stops"][markt] in der Hand hat (der Abgleich), schreibt danach weiter in das richtige Buch."""
    stops = buch.get("stops")
    if not isinstance(stops, dict):
        stops = {}
    for k in list(stops):
        if k not in neu["stops"]:
            del stops[k]
    for k, v in neu["stops"].items():
        if isinstance(stops.get(k), dict):
            stops[k].clear()
            stops[k].update(v)
        else:
            stops[k] = dict(v)
    for k in list(buch):
        if k not in neu:
            del buch[k]
    buch.update({k: v for k, v in neu.items() if k != "stops"})
    buch["stops"] = stops


def _buch_speichern_zusammen(datei, modus, gesehen, buch):
    """Lauf und Not-Aus speichern ihr Buch unter der Buch-Sperre. Hat ein anderer Lauf die Datei seit dem Lesen (gesehen[0])
    geändert, wird zusammengeführt statt überschrieben (_buch_vereinen, 3-Wege mit dem gelesenen Stand) — ein Not-Aus darf nie
    die unklaren Aufträge eines anderen löschen oder das Buch leeren, ein Tageslauf nie «Not-Aus offen» oder die unklaren
    Aufträge eines gleichzeitigen Not-Aus. → True, wenn zusammengeführt wurde (buch ist dann der vereinte Stand)."""
    import sperre
    try:
        with _buch_sperre(datei):
            try:
                jetzt = buch_lesen(datei, modus)
            except BuchKaputt:
                jetzt = None  # kaputt: unser Stand stellt es wieder her
            zusammen = jetzt is not None and json.dumps(jetzt, sort_keys=True) != gesehen[0]
            if zusammen:
                try:
                    basis = json.loads(gesehen[0]) if gesehen[0] else None
                except ValueError:
                    basis = None
                _buch_uebernehmen(buch, _buch_vereinen(jetzt, buch, basis if isinstance(basis, dict) else None))
            _buch_schreiben_roh(datei, modus, buch)
            gesehen[0] = json.dumps(buch_lesen(datei, modus), sort_keys=True)
            return zusammen
    except sperre.Besetzt as ex:
        raise OSError(f"Buch gesperrt ({ex})") from None


def _buch_schreiben_roh(datei, modus, buch):
    alt = _datei(datei)  # unlesbar → Abbruch statt den anderen Modus zu überschreiben
    alt[modus] = buch
    Path(datei).parent.mkdir(exist_ok=True)
    tmp = Path(str(datei) + ".neu")
    for i in range(len(BUCH_WARTEN) + 1):
        try:
            tmp.write_text(json.dumps(alt, indent=1))
            tmp.replace(datei)  # nie halb geschrieben
            return
        except OSError:
            if i >= len(BUCH_WARTEN):
                raise
            time.sleep(BUCH_WARTEN[i])


def _gestartet(b):
    return bool(b.get("start")) or bool(b.get("perp_offen")) or bool(b.get("unklar"))


def modi_mit_bestand(datei=None):
    """Modi, in denen Pilot 2.0 gestartet ist (sein Konto gehört ihm, bis ein Not-Aus alles geschlossen hat)."""
    alles = _datei(datei or BESTAND)
    return [m for m, b in alles.items() if isinstance(b, dict) and _gestartet(b)]


def hat_bestand(datei=None):
    """Ist Pilot 2.0 (in irgendeinem Modus) gestartet und noch nicht per Not-Aus geschlossen?
    Unlesbares Buch zählt als «ja» (der alte Pilot darf dann nicht handeln)."""
    try:
        return bool(modi_mit_bestand(datei))
    except BuchKaputt:
        return True


def bestand(konto, asset):
    for b in konto.get("balances", []):
        if b["asset"] == asset:
            return float(b.get("free", 0) or 0), float(b.get("locked", 0) or 0)
    return 0.0, 0.0


def netto_coins(r, coin):
    """Spot-Antwort → Coins netto (nach Gebühr in Coins, falls die Antwort fills enthält)."""
    menge = float(r.get("executedQty") or 0)
    geb = sum(float(f.get("commission") or 0) for f in r.get("fills") or [] if f.get("commissionAsset") == coin)
    return -menge - geb if r.get("side") == "SELL" else menge - geb


# ───────────────────────── Anschlüsse ─────────────────────────
class Spot(BB.Binance):
    def markt(self, symbol, seite, menge, cid=None):
        cid = cid or f"p2{int(time.time() * 1000)}{random.randint(0, 999999):06d}"
        p = {"symbol": symbol, "side": seite, "type": "MARKET", "quantity": BB.format_menge(menge),
             "newOrderRespType": "FULL", "newClientOrderId": cid}
        try:
            return {**(self._req("POST", "/api/v3/order", p, signiert=True) or {}), "side": seite}
        except (BB.BinanceFehler, *BF.NETZFEHLER) as ex:
            if isinstance(ex, BB.BinanceFehler) and ex.code < 500 and ex.code != 408:
                raise
            for warte in BF.NACHFRAGE_WARTEN:
                time.sleep(warte)
                try:
                    o = self.auftrag_lesen(symbol, cid=cid)
                except (BB.BinanceFehler, *BF.NETZFEHLER):
                    continue
                if o.get("status") in ("FILLED", "PARTIALLY_FILLED") or float(o.get("executedQty") or 0) > 0:
                    return {**o, "side": seite, "nachgefragt": True}
                if o.get("status") in ("CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
                    raise ex
            unklar = BF.UnklarFehler(f"Spot-Status unklar ({cid})")
            unklar.cid = cid  # damit der Aufrufer später per Kennung nachfragen kann
            raise unklar from ex

    def auftrag_lesen(self, symbol, order_id=None, cid=None):
        p = {"symbol": symbol}
        p.update({"orderId": order_id} if order_id is not None else {"origClientOrderId": cid})
        return self._req("GET", "/api/v3/order", p, signiert=True) or {}

    def offene(self, symbol):
        return self._req("GET", "/api/v3/openOrders", {"symbol": symbol}, signiert=True) or []

    def eigene_stops(self, symbol):
        """Offene eigene Stops (Kennung p2s…) mit Menge (origQty) und Stop-Kurs (stopPrice)."""
        return [o for o in self.offene(symbol) if str(o.get("clientOrderId") or "").startswith(CID_STOP_SPOT)]

    def abbrechen(self, symbol, order_id):
        try:
            self._req("DELETE", "/api/v3/order", {"symbol": symbol, "orderId": order_id}, signiert=True)
        except BB.BinanceFehler as ex:
            if "-2011" not in str(ex.msg):  # «Unknown order» = schon weg (ausgelöst oder storniert)
                raise

    @staticmethod
    def stop_params(symbol, menge, stop, regeln, cid=None):
        stop_p = PL.runde(stop, regeln["tick"])
        p = {"symbol": symbol, "side": "SELL", "quantity": BB.format_menge(menge), "stopPrice": BB.format_menge(stop_p),
             "newOrderRespType": "ACK", "newClientOrderId": cid or _kennung(CID_STOP_SPOT)}
        if "STOP_LOSS" in regeln.get("typen", ()):
            p["type"] = "STOP_LOSS"  # beim Auslösen ein Marktauftrag (wie im Backtest)
        else:
            p.update({"type": "STOP_LOSS_LIMIT", "timeInForce": "GTC",
                      "price": BB.format_menge(PL.runde(stop * (1 - STOP_LIMIT_ABSTAND), regeln["tick"]))})
        return p

    def stop_verkauf(self, symbol, menge, stop, regeln, cid=None):
        return self._req("POST", "/api/v3/order", self.stop_params(symbol, menge, stop, regeln, cid), signiert=True)

    def ersetzen(self, symbol, order_id, neu):
        """Auftrag order_id stornieren und `neu` setzen — in EINER Anfrage (cancelReplace, STOP_ON_FAILURE). Binance prüft die
        Filter des neuen Auftrags vorher; lehnt es ihn dort ab, bleibt der alte stehen — nie einen Stop wegnehmen, ohne dass
        der Ersatz (neuer Stop oder Verkauf) angenommen wird.
        → ("ok", Antwort des neuen) | ("nichts", Fehler): alter steht noch | ("nur_storno", Fehler): alter weg, neuer nicht
          (auch: alter war schon weg, −2011) | ("unklar", Fehler): Antwort verloren | ("fehlt", Fehler): Binance kennt
          cancelReplace hier nicht"""
        p = {"symbol": symbol, "cancelReplaceMode": "STOP_ON_FAILURE", "cancelOrderId": order_id,
             **{k: v for k, v in neu.items() if k != "symbol"}}
        try:
            r = self._req("POST", "/api/v3/order/cancelReplace", p, signiert=True) or {}
            return "ok", r.get("newOrderResponse") or {}
        except BB.BinanceFehler as ex:
            if ex.code == 404:
                return "fehlt", ex
            if ex.code >= 500 or ex.code == 408:
                return "unklar", ex
            data = (getattr(ex, "daten", None) or {}).get("data") or {}
            storno = data.get("cancelResponse") if isinstance(data.get("cancelResponse"), dict) else {}
            # STOP_ON_FAILURE: HTTP 409 heisst immer «Storno gelungen, neuer Auftrag abgelehnt» (−2021) — auch ohne lesbares
            # «data». Kennt Binance den alten Auftrag nicht mehr (−2011: ausgelöst oder storniert), ist er ebenfalls weg.
            if ex.code == 409 or data.get("cancelResult") == "SUCCESS" or storno.get("code") == -2011:
                return "nur_storno", ex
            return "nichts", ex
        except BF.NETZFEHLER as ex:
            return "unklar", ex

    def verschieben(self, richtung, betrag):
        typ = {"SPOT_ZU_FUTURES": "MAIN_UMFUTURE", "FUTURES_ZU_SPOT": "UMFUTURE_MAIN"}[richtung]
        return self._req("POST", "/sapi/v1/asset/transfer", {"type": typ, "asset": "USDT", "amount": f"{betrag:.2f}"}, signiert=True)

    def regeln2(self, symbol):
        info = self._req("GET", "/api/v3/exchangeInfo", {"symbol": symbol})["symbols"][0]
        f = {x["filterType"]: x for x in info["filters"]}
        lot = f.get("LOT_SIZE", {})
        notional = f.get("NOTIONAL") or f.get("MIN_NOTIONAL") or {}
        return {"step": float(lot.get("stepSize", "0.00001")), "tick": float(f.get("PRICE_FILTER", {}).get("tickSize", "0.01")),
                "min_notional": float(notional.get("minNotional", "5")), "typen": tuple(info.get("orderTypes") or ()),
                "status": info.get("status")}


class Fut(BF.Futures):
    def stop_menge(self, symbol, seite, menge, preis, tick, cid=None):
        """Stop NUR für den Richtungsteil: Menge + reduceOnly (nicht closePosition — sonst fiele die Ernte-Absicherung weg)."""
        return self._req("POST", "/fapi/v1/algoOrder", {"algoType": "CONDITIONAL", "symbol": symbol, "side": seite, "type": "STOP_MARKET",
                                                        "quantity": BF.fmt(menge), "triggerPrice": BF.fmt(PL.runde(preis, tick)),
                                                        "reduceOnly": "true", "workingType": "MARK_PRICE", "priceProtect": "true",
                                                        "clientAlgoId": cid or _kennung(CID_STOP_PERP)},
                         signiert=True)

    def einrichten(self, symbol, hebel):
        """Pilot 2.0: CROSS-Marge (eigenes Konto). Bei ISOLATED wäre das Pfand beim Eröffnen fix — der 10-%-Puffer im
        Futures-Konto schützte den Ernte-Short dann nicht vor der Zwangsschliessung."""
        try:
            self._req("POST", "/fapi/v1/marginType", {"symbol": symbol, "marginType": "CROSSED"}, signiert=True)
        except BF.BinanceFehler as ex:
            if "-4046" not in str(ex.msg):  # schon CROSSED; −4048 (offene Position) → Fehler → kein Short
                raise
        self._req("POST", "/fapi/v1/leverage", {"symbol": symbol, "leverage": max(1, int(hebel))}, signiert=True)

    def offene_algos(self, symbol):
        return [o for o in (self._req("GET", "/fapi/v1/openAlgoOrders", {"symbol": symbol}, signiert=True) or []) if isinstance(o, dict)]

    def eigene_stops(self, symbol):
        """Offene eigene Perp-Stops (Kennung p2a…) mit Menge (quantity) und Auslöser (triggerPrice)."""
        return [a for a in self.offene_algos(symbol) if str(a.get("clientAlgoId") or "").startswith(CID_STOP_PERP)]

    def algo_abbrechen(self, symbol, algo_id):
        """Storno; bei einer Fehlermeldung nachsehen, ob der Auftrag noch offen ist (Fehlercodes sind nicht dokumentiert).
        → True = jetzt storniert, False = war schon weg (ausgelöst oder anderswo storniert)."""
        try:
            self._req("DELETE", "/fapi/v1/algoOrder", {"algoId": algo_id}, signiert=True)
            return True
        except (BF.BinanceFehler, *BF.NETZFEHLER):
            if any(str(o.get("algoId")) == str(algo_id) for o in self.offene_algos(symbol)):
                raise
            return False

    def algo_abbrechen_kennung(self, symbol, cid):
        """Storno über die eigene Kennung (clientAlgoId) — auch wenn die Antwort beim Setzen verloren ging und die ID fehlt.
        «Unbekannt» (−2011) heisst: nicht (mehr) offen."""
        try:
            self._req("DELETE", "/fapi/v1/algoOrder", {"clientAlgoId": cid}, signiert=True)
        except BF.BinanceFehler as ex:
            if "-2011" not in str(ex.msg):
                raise

    def alle_abbrechen(self, symbol):
        """Not-Aus: ALLE Futures-Aufträge auf dem Symbol weg (normale und bedingte) — das Konto gehört Pilot 2.0."""
        for a in self.offene_algos(symbol):
            self.algo_abbrechen(symbol, a.get("algoId"))
        if self.offene_auftraege(symbol):
            self._req("DELETE", "/fapi/v1/allOpenOrders", {"symbol": symbol}, signiert=True)

    def position_info(self, symbol):
        for p in self._req("GET", "/fapi/v2/positionRisk", {"symbol": symbol}, signiert=True) or []:
            if p.get("symbol") == symbol:
                return float(p.get("positionAmt", 0) or 0), float(p.get("leverage", 1) or 1)
        return 0.0, 1.0

    def offene_auftraege(self, symbol):
        return self._req("GET", "/fapi/v1/openOrders", {"symbol": symbol}, signiert=True) or []

    def auftrag_per_kennung(self, symbol, cid):
        return self._req("GET", "/fapi/v1/order", {"symbol": symbol, "origClientOrderId": cid}, signiert=True) or {}

    def storno_per_kennung(self, symbol, cid):
        return self._req("DELETE", "/fapi/v1/order", {"symbol": symbol, "origClientOrderId": cid}, signiert=True)


def rechte_ok(r):
    """Echtgeld-Schlüssel: Auszahlung/Margin/Überweisung an Dritte AUS; Spot und Futures AN. → (ok, verboten, fehlt, transfer)"""
    verboten = [k for k in ("enableWithdrawals", "enableMargin", "enableInternalTransfer") if r.get(k)]
    fehlt = [k for k in ("enableSpotAndMarginTrading", "enableFutures") if not r.get(k)]
    return not verboten and not fehlt, verboten, fehlt, bool(r.get("permitsUniversalTransfer"))


def kontowert(spot, fut, konto=None):
    """Wert des ganzen Pilot-Kontos in USDT: Spot-USDT + BTC/ETH + Futures-Saldo + offene Futures-Gewinne."""
    konto = konto or _nochmal(spot.konto)
    kf = _nochmal(fut.konto)
    wert = sum(bestand(konto, "USDT"))
    for sym, coin in COINS.values():
        menge = sum(bestand(konto, coin))
        if menge:
            wert += menge * _nochmal(lambda sym=sym: spot.kurs(sym))
    return wert + float(kf.get("totalWalletBalance", 0) or 0) + float(kf.get("totalUnrealizedProfit", 0) or 0)


def startpruefung(spot, fut, cfg, konto):
    """Vor dem ersten Lauf: Echtgeld → Unterkonto bis auf USDT leer und nicht mehr wert als der Deckel; Testnetz → keine
    alten Positionen/Aufträge. → Liste der Gründe, warum nicht (leer = ok)."""
    gruende = []
    for m, (sym, coin) in COINS.items():
        menge = sum(bestand(konto, coin))
        if cfg["echtgeld"] and menge * spot.kurs(sym) >= STAUB_USDT:
            gruende.append(f"{menge:g} {coin} im Spot-Konto")
        if cfg["echtgeld"] and spot.offene(sym):
            gruende.append(f"offene Spot-Aufträge {sym}")
        if fut.position_info(sym)[0]:
            gruende.append(f"Futures-Position {sym}")
        if fut.offene_algos(sym) or fut.offene_auftraege(sym):
            gruende.append(f"offene Futures-Aufträge {sym}")
    if cfg["echtgeld"]:
        if float(fut.konto().get("totalWalletBalance", 0) or 0) > 1:
            gruende.append("Guthaben im Futures-Konto (Pilot 2.0 verschiebt sein Pfand selbst bzw. du füllst es nach dem Start)")
        usdt = sum(bestand(konto, "USDT"))
        if usdt > cfg["deckel"] * DECKEL_SPIELRAUM:
            gruende.append(f"{usdt:.2f} USDT im Pilot-Konto, mehr als der Deckel KRYPTO_PILOT2_KAPITAL={cfg['deckel']:.0f} — ins "
                           "Unterkonto nur so viel legen, wie Pilot 2.0 höchstens verwalten (und verlieren) darf")
    return gruende


# ───────────────────────── unklare Aufträge (Antwort verloren, Position zeigt nichts) ─────────────────────────
def _klaeren(fut, u, jetzt_ms=None, spot=None):
    """Per Kennung nachfragen (Futures oder Spot): → "ausgefuehrt" | "nicht" | "offen". Noch offen (NEW) → stornieren versuchen.
    Nach UNKLAR_MAX_ALTER_MS unbekannt (−2013) = nie bei Binance angekommen."""
    jetzt_ms = int(time.time() * 1000) if jetzt_ms is None else jetzt_ms
    alt = jetzt_ms - int(u.get("zeit") or 0) > UNKLAR_MAX_ALTER_MS
    if not u.get("cid"):
        return "nicht" if alt else "offen"
    if u.get("konto") == "spot":
        if spot is None:
            return "offen"
        for versuch in range(2):
            try:
                o = _nochmal(lambda: spot.auftrag_lesen(u["sym"], cid=u["cid"]))
            except Exception as ex:  # noqa: BLE001
                return ("nicht" if alt else "offen") if "-2013" in _text(ex) else "offen"
            status = o.get("status")
            if float(o.get("executedQty") or 0) > 0 or status in ("FILLED", "PARTIALLY_FILLED"):
                if status == "PARTIALLY_FILLED":  # Rest nicht mehr ausführen lassen — der Kontostand zeigt, was ankam
                    try:
                        spot.abbrechen(u["sym"], o.get("orderId"))
                    except Exception:  # noqa: BLE001
                        return "offen"
                return "ausgefuehrt"
            if status in ("CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
                return "nicht"
            if versuch == 0:  # NEW: noch nicht ausgeführt → stornieren, dann nochmal nachsehen
                try:
                    spot.abbrechen(u["sym"], o.get("orderId"))
                except Exception:  # noqa: BLE001
                    pass
        return "offen"
    for versuch in range(2):
        try:
            o = _nochmal(lambda: fut.auftrag_per_kennung(u["sym"], u["cid"]))
        except Exception as ex:  # noqa: BLE001
            if "-2013" in _text(ex):  # Binance kennt den Auftrag (noch) nicht
                return "nicht" if alt else "offen"
            return "offen"
        status = o.get("status")
        if float(o.get("executedQty") or 0) > 0 or status in ("FILLED", "PARTIALLY_FILLED"):
            return "ausgefuehrt"
        if status in ("CANCELED", "EXPIRED", "REJECTED", "EXPIRED_IN_MATCH"):
            return "nicht"
        if versuch == 0:  # NEW: noch nicht ausgeführt → stornieren, dann nochmal nachsehen
            try:
                fut.storno_per_kennung(u["sym"], u["cid"])
            except Exception:  # noqa: BLE001
                pass
    return "offen"


def unklare_klaeren(fut, buch, warn, zeilen, gesperrt=None, warten=(), spot=None):
    """Unklare Aufträge aus dem Buch klären (warten: so oft nochmal nachfragen). Geklärte fallen weg; offene sperren ihren
    Markt, bleiben im Buch, und ihr Markt wird beidseitig gesichert (siehe _soll). → True, wenn sich das Buch geändert hat."""
    noch, geaendert = list(buch.get("unklar") or []), False
    for i in range(len(warten) + 1):
        offen = []
        for u in noch:
            res = _klaeren(fut, u, spot=spot)
            if res == "offen":
                offen.append(u)
            else:
                geaendert = True
                zeilen.append(f"{u.get('markt')} {'Spot' if u.get('konto') == 'spot' else 'Perp'} {u.get('seite')} {u.get('menge')}: "
                              "unklarer Auftrag geklärt — "
                              + ("ausgeführt (steht im Kontostand)." if res == "ausgefuehrt" else "nie ausgeführt."))
        noch = offen
        if not noch or i >= len(warten):
            break
        time.sleep(warten[i])
    for u in noch:
        if gesperrt is not None:
            gesperrt.add(u.get("markt"))
        warn(f"{u.get('markt')} {'Spot' if u.get('konto') == 'spot' else 'Perp'} {u.get('seite')} {u.get('menge')}: Auftrag noch "
             f"immer unklar (Kennung {u.get('cid')}) — Markt gesperrt und beidseitig gesichert, bis Binance ihn bestätigt; bitte im "
             "Binance-Konto prüfen.")
    buch["unklar"] = noch
    return geaendert


# ───────────────────────── Ausführung ─────────────────────────
def ausfuehren(ents, trocken=False, env=None, spot=None, fut=None, protokolliere=None, bestand_datei=None, notaus=False):
    """ents: Pilot-Entscheide [{markt, hebel, stop_long, stop_short, stand}]. notaus=True erzwingt den Not-Aus.
    → {zeilen, auftraege, warnung, kapital, plan, modus, alles_zu}"""
    env_ = os.environ if env is None else env
    datei = bestand_datei or BESTAND
    cfg = einstellungen(env_)
    if notaus or cfg["stop"]:
        return notaus_alle(env_, datei, trocken=trocken, spot=spot, fut=fut, protokolliere=protokolliere)
    spot_arg, fut_arg = spot, fut  # für einen Not-Aus am Laufende: er öffnet je gestartetem Modus dessen eigene Verbindung
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": cfg["modus"], "alles_zu": None}

    def warn(t):
        erg["warnung"] = True
        erg["zeilen"].append("⚠️ " + t)
    if cfg["fehler"]:
        warn(cfg["fehler"])
        return erg
    try:
        buch = buch_lesen(datei, cfg["modus"])
        andere = [m for m in modi_mit_bestand(datei) if m != cfg["modus"]]
    except BuchKaputt as ex:
        warn(f"{ex} — kein Auftrag. Datei prüfen/wiederherstellen; der Not-Aus meldet den Kontostand.")
        return erg
    # Stand beim Lesen: schreibt ein anderer Lauf dazwischen (ein Not-Aus von stop.bat ohne Sperre, die Nachkontrolle), wird
    # zusammengeführt statt überschrieben — nie gehen seine unklaren Aufträge oder «Not-Aus offen» verloren
    gesehen = [json.dumps(buch, sort_keys=True)]
    if andere:  # nie still unverwaltet: ein gestarteter Modus, dessen Schalter gerade nicht gelten
        warn(f"Pilot 2.0 ist im Modus «{', '.join(andere)}» gestartet, die Schalter stehen aber auf «{cfg['modus']}» — dort zieht "
             "niemand die Stops nach. Schalter zurückstellen oder Not-Aus (schliesst jeden gestarteten Modus).")
        if not buch["start"]:
            warn("Solange ein anderer Modus gestartet ist, startet Pilot 2.0 keinen zweiten — kein Auftrag.")
            return erg
    if not (cfg["spot"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["key"] and cfg["futures"]["secret"]):
        if _gestartet(buch):
            warn(f"Pilot 2.0 ({cfg['modus']}) ist gestartet, aber die Schlüssel fehlen "
                 f"({'PILOT2_API_KEY/SECRET' if cfg['echtgeld'] else 'Testnetz-Schlüssel'}) — seine Positionen werden NICHT verwaltet "
                 "(keine Stops nachgezogen). Schlüssel setzen oder Not-Aus.")
        else:
            erg["zeilen"].append("Pilot 2.0: keine Schlüssel — nichts gehandelt.")
        return erg
    if cfg["pause"] and not trocken:
        erg["zeilen"].append("Pilot 2.0: Pause (Auto-Handel aus) — nichts gehandelt.")
        return erg
    if cfg["konflikte"]:
        warn("Pilot 2.0 braucht das Binance-Konto für sich allein. Aktiv sind auch: " + ", ".join(cfg["konflikte"]) + " — kein Auftrag.")
        return erg
    if cfg["deckel"] <= 0:
        warn("KRYPTO_PILOT2_KAPITAL fehlt: Für echtes Geld musst du festlegen, wie viele USDT Pilot 2.0 höchstens verwaltet — kein Auftrag.")
        return erg
    spot = spot or Spot(cfg["spot"])
    fut = fut or Fut(cfg["futures"])

    def speichern():
        if trocken:
            return
        try:
            _buch_speichern_zusammen(datei, cfg["modus"], gesehen, buch)
        except (OSError, BuchKaputt) as ex:  # Aufträge sind trotzdem gültig; verwaiste Stops findet der nächste Lauf an der Kennung
            warn(f"Buch nicht gespeichert ({type(ex).__name__}) — der nächste Lauf liest wieder den Kontostand.")

    transfer_ok = False
    gesperrt, gehandelt, abgelehnt = set(), set(), set()
    unklar_neu = []
    ents = [dict(e) for e in ents if e["markt"] in COINS]
    try:
        konto_s = _nochmal(spot.konto)
        if cfg["echtgeld"]:
            ok, verboten, fehlt, transfer_ok = rechte_ok(_nochmal(spot.rechte))
            if not ok:
                warn(f"Schlüssel-Rechte falsch — kein Auftrag. Ausschalten: {', '.join(verboten) or '–'}; einschalten: {', '.join(fehlt) or '–'}.")
                return erg
        if _nochmal(fut.hedge_modus):
            warn("Futures-Konto steht im Hedge-Modus — Pilot 2.0 braucht den Einweg-Modus. Kein Auftrag.")
            return erg
        if cfg["echtgeld"]:
            uid = konto_s.get("uid")
            if not uid:
                warn("Binance meldet keine Konto-ID (UID) — ohne sie ist nicht sicher, dass Pilot 2.0 im richtigen Konto handelt. Kein Auftrag.")
                return erg
            if buch["start"] and str(uid) != str(buch["uid"]):
                warn(f"PILOT2_API_KEY zeigt auf ein ANDERES Binance-Konto (UID {uid}) als beim Start ({buch['uid']}) — kein Auftrag. "
                     "Den Schlüssel des Pilot-Unterkontos setzen; erst danach greift auch der Not-Aus wieder.")
                return erg
        if not buch["start"]:
            gruende = startpruefung(spot, fut, cfg, konto_s)
            if gruende:
                warn("Pilot 2.0 braucht ein Konto nur für sich — beim Start bis auf USDT leer. Gefunden: " + "; ".join(gruende)
                     + ". Kein Auftrag.")
                return erg
        if buch["unklar"] and unklare_klaeren(fut, buch, warn, erg["zeilen"], gesperrt, spot=spot):  # alte unklare Aufträge zuerst
            speichern()
        gewaehlt = {e["markt"] for e in ents}
        for m, (sym, coin) in COINS.items():
            if m not in gewaehlt and (sum(bestand(konto_s, coin)) * _nochmal(lambda sym=sym: spot.kurs(sym)) >= STAUB_USDT
                                      or _nochmal(lambda sym=sym: fut.position_info(sym))[0] != 0
                                      or unklar_sell(buch, m) is not None):  # unklarer Auftrag: der Markt braucht seine Stops
                ents.append({"markt": m, "hebel": 0.0, "abgewaehlt": True})
                erg["zeilen"].append(f"{m} ist abgewählt — Bestand wird abgebaut.")
        if not ents:
            return erg
        daten = {}
        for e in ents:
            sym, coin = COINS[e["markt"]]
            pos, hebel_ist = _nochmal(lambda sym=sym: fut.position_info(sym))
            frei_c, gebunden_c = bestand(konto_s, coin)
            daten[e["markt"]] = {"sym": sym, "coin": coin, "spot": frei_c + gebunden_c, "frei": frei_c, "perp": pos, "hebel_ist": hebel_ist,
                                 "kurs": _nochmal(lambda sym=sym: spot.kurs(sym)), "rs": _nochmal(lambda sym=sym: spot.regeln2(sym)),
                                 "rf": _nochmal(lambda sym=sym: fut.regeln(sym))}
        kapital = kontowert(spot, fut, konto_s)
        for k_, d_ in daten.items():  # zuletzt bekannter Kurs: Rückfall für einen Not-Aus, der keinen Kurs lesen kann
            buch["stops"].setdefault(k_, {})["kurs"] = d_["kurs"]
    except Exception as ex:  # noqa: BLE001 — noch nichts gehandelt, keine Stops angefasst
        warn(f"Konto nicht lesbar ({type(ex).__name__} {str(ex)[:100]}) — kein Auftrag, nächster Lauf versucht es wieder.")
        return erg
    erg["kapital"] = round(kapital, 2)
    if not buch["start"]:
        if not trocken:  # ein Probelauf verbraucht die Startprüfung nicht
            buch["start"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            buch["uid"] = konto_s.get("uid") if cfg["echtgeld"] else None
            try:  # der Start MUSS gespeichert sein, bevor ein Auftrag rausgeht — sonst kennt ihn der Not-Aus nicht
                _buch_speichern_zusammen(datei, cfg["modus"], gesehen, buch)
            except (OSError, BuchKaputt) as ex:
                warn(f"Start nicht gespeichert ({type(ex).__name__}) — ohne gespeicherten Start kein Auftrag (der Not-Aus fände die "
                     "Positionen sonst nicht). Ordner/Datei prüfen (Virenscanner, OneDrive, offener Editor); der nächste Lauf versucht es wieder.")
                return erg
        erg["zeilen"].append(f"Pilot 2.0 {'würde starten' if trocken else 'gestartet'}: Kontowert {kapital:.2f} USDT "
                             f"(Deckel {cfg['deckel']:.0f}).")
    verwaltet = min(kapital * cfg["anteil"], cfg["deckel"]) * (1 - GEBUEHREN_RESERVE)
    n_aktiv = max(1, len([e for e in ents if not e.get("abgewaehlt")]))
    basis_g = verwaltet / n_aktiv

    plaene = {}
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        z = 0.0 if e.get("abgewaehlt") else max(-1.0, min(1.0, float(e.get("hebel") or 0)))
        if z > 0 and not e.get("stop_long"):
            warn(f"{k}: kein Stop-Kurs für long — Richtung heute 0.")
            z = 0.0
        if z < 0 and not e.get("stop_short"):
            warn(f"{k}: kein Stop-Kurs für short — Richtung heute 0.")
            z = 0.0
        if z > 0 and d["kurs"] <= e["stop_long"]:
            erg["zeilen"].append(f"{k}: Kurs schon unter dem Stop — kein Long heute.")
            z = 0.0
        if z < 0 and d["kurs"] >= e["stop_short"]:
            erg["zeilen"].append(f"{k}: Kurs schon über dem Stop — kein Short heute.")
            z = 0.0
        e["z"] = z
        regeln = {"spot_step": d["rs"]["step"], "perp_step": d["rf"]["step"], "spot_min": d["rs"]["min_notional"], "perp_min": d["rf"]["min_notional"]}
        plaene[k] = PL.plane(k, z, 0.0 if e.get("abgewaehlt") else basis_g, d["kurs"], d["spot"], d["perp"], regeln, cfg["max_auftrag"])
        if e.get("abgewaehlt"):
            plaene[k] = {"schritte": ([("perp", "BUY" if d["perp"] < 0 else "SELL", abs(d["perp"]), True)] if d["perp"] else [])
                         + ([("spot", "SELL", PL.runde(d["spot"], d["rs"]["step"]), False)] if d["spot"] * d["kurs"] >= d["rs"]["min_notional"] else []),
                         "pfand": 0.0, "stop_spot": 0.0, "stop_perp": 0.0, "info": {"spot_ziel": 0.0, "perp_ziel": 0.0}}
        if d["perp"] and d["hebel_ist"] > 1 and any(s[0] == "perp" and not s[3] for s in plaene[k]["schritte"]):
            warn(f"{k}: Futures-Hebel steht auf {d['hebel_ist']:g} (offene Position) — kein neuer Short, bis er 1 ist.")
            gesperrt.add(k)
    erg["plan"] = {k: {"schritte": p["schritte"], "stop_spot": p["stop_spot"], "stop_perp": p["stop_perp"]} for k, p in plaene.items()}
    pfand = sum(p["pfand"] for p in plaene.values())
    if trocken:
        erg["zeilen"] += [f"{k}: " + (", ".join(f"{a} {s} {m:g}" for a, s, m, _ in p["schritte"]) or "nichts") for k, p in plaene.items()]
        erg["zeilen"].append(f"Pilot-Konto {kapital:.2f} USDT, verwaltet {verwaltet:.2f}, Pfand-Ziel {pfand:.2f}")
        return erg

    def notaus_neu():
        return env_.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists()

    def schritt(k, konto, seite, menge, reduce):
        """→ ausgeführte Menge (0.0 = nichts), None = sicher NICHT ausgeführt (abgelehnt), "unklar" = Status unbekannt."""
        d = daten[k]
        try:
            if konto == "spot" and seite == "BUY":  # nie mehr kaufen, als freies USDT im Konto liegt
                usdt_frei = bestand(_nochmal(spot.konto), "USDT")[0]
                leistbar = PL.runde(usdt_frei / (d["kurs"] * 1.003), d["rs"]["step"])
                if leistbar < menge:
                    warn(f"{k}: freies USDT reicht nur für {leistbar:g} statt {menge:g} {d['coin']} — weniger gekauft.")
                    menge = leistbar
                if menge * d["kurs"] < d["rs"]["min_notional"]:
                    return 0.0
            gehandelt.add(k)
            if konto == "spot":
                r = spot.markt(d["sym"], seite, menge)
                gemacht = abs(netto_coins(r, d["coin"]))
            else:
                pos_vor = _nochmal(lambda: fut.position_info(d["sym"]))[0]
                if not buch["perp_offen"]:
                    buch["perp_offen"] = True
                    speichern()
                try:
                    fut.auftrag(d["sym"], seite, menge, reduce)
                except BF.UnklarFehler as ex:  # Position nachlesen statt raten
                    try:
                        nach = _nochmal(lambda: fut.position_info(d["sym"]))[0]
                    except Exception:  # noqa: BLE001
                        nach = None
                    erwartet = pos_vor + (menge if seite == "BUY" else -menge)
                    if nach is None or abs(nach - erwartet) > 1e-9:
                        gesperrt.add(k)
                        abgelehnt.add(k)  # unklare Antwort: wie eine Ablehnung ein Zeichen, dass Binance gerade klemmt
                        unklar_neu.append(unklar_eintrag(k, d["sym"], "perp", seite, menge, reduce, ex))
                        warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt es (noch) nicht — Markt gesperrt, nichts "
                             "zurückgerechnet; am Laufende wird per Kennung nachgefragt, Stops nach dem Kontostand.")
                        return "unklar"
                    warn(f"{k} Perp {seite} {menge:g}: Antwort unklar, Position zeigt AUSGEFÜHRT.")
                gemacht = menge
            erg["auftraege"].append((k, konto, seite, menge))
            return gemacht
        except BF.UnklarFehler as ex:
            gesperrt.add(k)
            abgelehnt.add(k)
            unklar_neu.append(unklar_eintrag(k, d["sym"], "spot", seite, menge, False, ex))
            warn(f"{k} Spot {seite} {menge:g}: Status unklar — Markt gesperrt; am Laufende wird per Kennung nachgefragt, bis dahin "
                 "beidseitig gesichert.")
            return "unklar"
        except Exception as ex:  # noqa: BLE001
            gesperrt.add(k)
            abgelehnt.add(k)
            warn(f"{k} {konto} {seite} {menge:g} abgelehnt: {type(ex).__name__} {str(ex)[:120]}")
        return None

    try:
        # 1) verkleinern. Spot-Verkauf: zuerst die FREIEN Coins (geht das nicht, bleibt der Stop unberührt), erst danach gibt EIN
        #    cancelReplace gesperrte Coins frei (bzw. verkauft sie gleich mit ihrem Stop)
        for k, p in plaene.items():
            d = daten[k]
            for konto, seite, m, red in p["schritte"]:
                if k in gesperrt or notaus_neu():
                    break
                if konto == "spot" and seite == "SELL":
                    try:
                        frei_jetzt = bestand(_nochmal(spot.konto), d["coin"])[0]
                    except Exception:  # noqa: BLE001
                        frei_jetzt = d["frei"]
                    m1 = PL.runde(min(m, frei_jetzt), d["rs"]["step"])
                    if m1 * d["kurs"] >= d["rs"]["min_notional"] and not isinstance(schritt(k, "spot", "SELL", m1, False), float):
                        break  # abgelehnt oder unklar: Markt gesperrt, die Stops bleiben stehen
                    rest = PL.runde(m - m1, d["rs"]["step"])
                    if rest * d["kurs"] < d["rs"]["min_notional"]:
                        continue
                    try:
                        mit_stop, _frei = _spot_freigeben(spot, buch, k, d, rest, erg, unklar_neu)
                        gehandelt.add(k)
                    except _StopWeg as ex:
                        # der Stop ist storniert, der Ersatz abgelehnt: die Coins liegen frei — verkaufen, was der Plan verkaufen
                        # wollte (sichert am meisten); der Rest bekommt am Laufende seinen Stop. Danach nichts mehr in diesem Markt
                        gehandelt.add(k)
                        warn(f"{k}: Spot-Stop storniert, Ersatz abgelehnt — die Coins sind frei; der geplante Verkauf folgt, der Rest "
                             "bekommt am Laufende seinen Stop.")
                        rest = PL.runde(rest - ex.verkauft, d["rs"]["step"])
                        if rest * d["kurs"] >= d["rs"]["min_notional"]:
                            schritt(k, "spot", "SELL", rest, False)
                        gesperrt.add(k)
                        abgelehnt.add(k)
                        break
                    except Exception as ex:  # noqa: BLE001
                        warn(f"{k}: gesperrte Coins nicht freigegeben ({type(ex).__name__} {str(ex)[:60]}) — "
                             + ("Antwort unklar, die Stops werden am Laufende nachgelesen"
                                if "unklar" in str(ex) else "der Spot-Stop bleibt") + ", heute kein weiterer Verkauf in diesem Markt.")
                        gesperrt.add(k)
                        abgelehnt.add(k)
                        break
                    rest = PL.runde(rest - mit_stop, d["rs"]["step"])
                    if rest * d["kurs"] >= d["rs"]["min_notional"]:
                        schritt(k, "spot", "SELL", rest, False)
                elif red:
                    schritt(k, konto, seite, m, red)
        # 2) Erst jetzt (das Verkleinern ist ausgeführt — oder abgelehnt, dann ist der Markt gesperrt und der Stop bleibt, wie er
        #    war): eigene Perp-Stops, die grösser sind als das, was ab JETZT bis zum Plan-Ende sicher ungesichert ist (Minimum aus
        #    frischem Stand und Plan-Ende), auf diese Grösse verkleinern — sonst könnte ein alter Stop beim Vergrössern die neue
        #    Ernte-Absicherung treffen. Zuerst den kleineren setzen, dann den alten löschen. Märkte ohne Plan: unberührt.
        for k, p in plaene.items():
            if p["schritte"] and k not in gesperrt and not notaus_neu():
                try:
                    if _stops_vorab(spot, fut, buch, k, daten[k], p, nur_jetzt=True):
                        gehandelt.add(k)
                except Exception as ex:  # noqa: BLE001
                    warn(f"{k}: alte Stops nicht anpassbar ({type(ex).__name__} {str(ex)[:60]}) — heute nichts mehr in diesem Markt; "
                         "die Stops bleiben stehen und werden am Ende nach dem Kontostand geprüft.")
                    gesperrt.add(k)
                    abgelehnt.add(k)
                    gehandelt.add(k)
        speichern()
        # 3) Geld zwischen Spot und Futures verschieben (nur echt und nur mit «Universal Transfer»). Das Pfand zählt nach dem
        #    Eigenkapital: offene Verluste des Shorts gehen ab (sonst schmilzt das Pfand bei steigendem Kurs unbemerkt).
        usdt_frei = bestand(_nochmal(spot.konto), "USDT")[0]
        konto_f = _nochmal(fut.konto)
        f_saldo = float(konto_f.get("totalWalletBalance", 0) or 0) + min(0.0, float(konto_f.get("totalUnrealizedProfit", 0) or 0))
        f_abziehbar = float(konto_f.get("maxWithdrawAmount", f_saldo) or 0)
        bedarf = sum(m * daten[k]["kurs"] * 1.003 for k, p in plaene.items() if k not in gesperrt
                     for konto, seite, m, _ in p["schritte"] if konto == "spot" and seite == "BUY")
        uw = PL.verschieben(pfand, f_saldo, f_abziehbar, usdt_frei, bedarf)
        if uw and cfg["echtgeld"] and transfer_ok and not notaus_neu():
            try:
                spot.verschieben(*uw)
                erg["auftraege"].append(("konto", uw[0], uw[1]))
            except Exception as ex:  # noqa: BLE001
                warn(f"Verschieben {uw[0]} {uw[1]:.2f} USDT: {type(ex).__name__} — weiter mit dem tatsächlichen Kontostand.")
        elif uw and cfg["echtgeld"]:
            erg["zeilen"].append(f"Ohne «Universal Transfer»: bitte {uw[1]:.2f} USDT von Hand "
                                 f"{'ins Futures-Konto' if uw[0] == 'SPOT_ZU_FUTURES' else 'ins Spot-Konto'} des Pilot-Unterkontos verschieben.")
        elif uw:
            erg["zeilen"].append(f"Testnetz: kein Verschieben möglich ({uw[0]} {uw[1]:.2f} USDT wäre nötig) — beide Test-Konten mit USDT füllen.")
        # 4) vergrössern: Spot, dann Short; wird der Short einer neuen Ernte sicher abgelehnt → Ernte-Spot zurückverkaufen
        for k, p in plaene.items():
            if k in gesperrt or notaus_neu():
                continue
            d = daten[k]
            kaeufe = [s for s in p["schritte"] if s[0] == "spot" and s[1] == "BUY"]
            shorts = [s for s in p["schritte"] if s[0] == "perp" and s[1] == "SELL" and not s[3]]

            def nur_richtung(grund, obergrenze=None):
                """Heute keine neue Ernte und kein Short: nur den Richtungs-Long kaufen (nach dem Kontostand)."""
                richtung_ist = sum(bestand(_nochmal(spot.konto), d["coin"])) + _nochmal(lambda: fut.position_info(d["sym"]))[0]
                rest = max(0.0, p["stop_spot"] - max(0.0, richtung_ist))
                rest = PL.runde(rest if obergrenze is None else min(rest, obergrenze), d["rs"]["step"])
                warn(f"{k}: {grund} — kein Short, keine neue Ernte.")
                return [("spot", "BUY", rest, False)] if rest * d["kurs"] >= d["rs"]["min_notional"] else []
            if shorts:
                try:
                    fut.einrichten(d["sym"], 1)
                    verfuegbar = float(_nochmal(fut.konto).get("availableBalance", 0) or 0)
                except Exception as ex:  # noqa: BLE001
                    warn(f"{k}: Futures-Vorbereitung gescheitert ({type(ex).__name__}) — kein Short, keine neue Ernte.")
                    continue
                noetig = shorts[0][2] * d["kurs"] * (1 + PL.PUFFER_SHORT)
                if verfuegbar < noetig:
                    kaeufe, shorts = nur_richtung(f"Futures-Konto hat {verfuegbar:.2f} USDT frei, Short braucht {noetig:.2f}"), []
            if kaeufe and shorts:  # reicht das Spot-USDT nicht, bliebe der gekürzte Short unter dem Binance-Minimum → nur Richtung
                leistbar = PL.runde(bestand(_nochmal(spot.konto), "USDT")[0] / (d["kurs"] * 1.003), d["rs"]["step"])
                fehlt_vorab = sum(s[2] for s in kaeufe) - leistbar
                if fehlt_vorab > 0 and any(PL.runde(max(0.0, s[2] - fehlt_vorab), d["rf"]["step"]) * d["kurs"] < d["rf"]["min_notional"]
                                           for s in shorts):
                    kaeufe, shorts = nur_richtung("freies Spot-USDT reicht nicht für Ernte und Short (Binance-Minimum)", leistbar), []
            gekauft, geplant = 0.0, sum(s[2] for s in kaeufe)
            for konto, seite, m, red in kaeufe:
                if k in gesperrt or notaus_neu():
                    break
                r = schritt(k, konto, seite, m, red)
                gekauft += r if isinstance(r, float) else 0.0
            if k in gesperrt:
                continue  # unklarer oder abgelehnter Kauf: kein Short dazu; die Stops am Ende richten sich nach dem Kontostand
            if gekauft > 0:  # die Ernte-Coins sind da: erst JETZT den Perp-Stop auf das verkleinern, was bis zum Plan-Ende ungesichert bleibt
                try:
                    if _stops_vorab(spot, fut, buch, k, d, p):
                        gehandelt.add(k)
                except Exception as ex:  # noqa: BLE001
                    warn(f"{k}: Perp-Stop nach dem Kauf nicht anpassbar ({type(ex).__name__} {str(ex)[:60]}) — heute kein Short dazu; "
                         "die Stops werden am Ende nach dem Kontostand geprüft.")
                    gesperrt.add(k)
                    abgelehnt.add(k)
                    gehandelt.add(k)
                    continue
            fehlt = max(0.0, geplant - gekauft)  # gekürzter/ausgelassener Kauf (Gebühr in Coins zählt nicht als Fehlbetrag)
            if fehlt > geplant * 0.002 + d["rs"]["step"]:
                neu = []
                for konto, seite, m, red in shorts:  # Short um denselben Betrag kürzen → Netto-Richtung wie geplant
                    m2 = PL.runde(max(0.0, m - fehlt), d["rf"]["step"])
                    if m2 > 0 and m2 * d["kurs"] >= d["rf"]["min_notional"]:
                        neu.append((konto, seite, m2, red))
                    else:
                        warn(f"{k}: Kauf gekürzt — Short entfällt (unter dem Futures-Minimum).")
                        if gekauft > 0:  # ungesicherte Ernte-Coins zurück
                            neu.append(("rueck", "SELL", 0.0, False))
                shorts = neu
            for konto, seite, m, red in shorts:
                if k in gesperrt or notaus_neu():
                    break
                r = None if konto == "rueck" else schritt(k, konto, seite, m, red)
                if r is None and gekauft > 0:  # Short sicher NICHT ausgeführt → nur die UNGESICHERTEN Ernte-Coins zurück, nie die Richtung
                    frei_ist, gebunden_ist = bestand(_nochmal(spot.konto), d["coin"])
                    ueber = frei_ist + gebunden_ist + _nochmal(lambda: fut.position_info(d["sym"]))[0] - max(0.0, p["stop_spot"])
                    zurueck = PL.runde(max(0.0, min(gekauft, frei_ist, ueber)), d["rs"]["step"])
                    if zurueck * d["kurs"] >= d["rs"]["min_notional"]:
                        gesperrt.discard(k)
                        if isinstance(schritt(k, "spot", "SELL", zurueck, False), float):
                            erg["zeilen"].append(f"{k}: Ernte-Short abgelehnt → {zurueck:g} {d['coin']} zurückverkauft.")
                        gesperrt.add(k)
    except Exception as ex:  # noqa: BLE001 — Lauf unterbrochen: Stops trotzdem nach dem Kontostand, Meldung und Protokoll bleiben
        warn(f"Lauf unterbrochen ({type(ex).__name__} {str(ex)[:100]}) — Stops werden trotzdem nach dem Kontostand gesetzt, bitte prüfen!")
    finally:
        if unklar_neu:  # unklare Aufträge per Kennung klären (mehrmals) — was offen bleibt, kommt ins Buch, sperrt den Markt beim
            #             nächsten Lauf, und sein Markt wird beidseitig gesichert (kommt der Auftrag verspätet doch an: geschützt)
            buch["unklar"] = (buch.get("unklar") or []) + unklar_neu
            unklare_klaeren(fut, buch, warn, erg["zeilen"], warten=UNKLAR_WARTEN, spot=spot)
        # frisch zusammenführen, BEVOR Stops abgeglichen werden: hat ein anderer Lauf (Not-Aus ohne Sperre) inzwischen unklare
        # Aufträge eingetragen, braucht ihr Markt beidseitigen Schutz statt «Paar = abgesichert, Stops weg»
        speichern()
        stop_mitten = notaus_neu()
        if not stop_mitten:  # Not-Aus während des Laufs: keine Stops entfernen oder ersetzen — der Not-Aus unten schliesst
            for k in daten:
                daten[k]["unklar_sell"] = unklar_sell(buch, k)
                # Binance lehnte heute in diesem Markt einen neuen Auftrag ab (Phase «nur Stornieren»?): bestehende Stops nicht
                # ersetzen — ein cancelReplace könnte erst stornieren und dann ablehnen; nur Ungedecktes zusätzlich sichern
                daten[k]["nur_ergaenzen"] = k in abgelehnt
            _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn, gehandelt)
    if stop_mitten or notaus_neu():
        # STOP kam während des Laufs (Cockpit, Telegram, stop.bat): dieser Lauf hält die Lauf-Sperre — darum schliesst ER jetzt
        # (das Cockpit hat Pilot 2.0 deswegen übersprungen); danach schliesst die Nachkontrolle nochmals, was offen blieb
        speichern()
        if protokolliere:  # die Aufträge dieses Laufs (vor dem STOP); der Not-Aus protokolliert seine eigenen
            protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                           "kapital": erg["kapital"], "auftraege": list(erg["auftraege"]), "warnung": erg["warnung"]})
        erg["zeilen"].append("🛑 Not-Aus während des Laufs — Pilot 2.0 schliesst jetzt selbst (dieser Lauf hält die Sperre).")
        r = notaus_alle(env_, datei, spot=spot_arg, fut=fut_arg, protokolliere=protokolliere)
        erg["zeilen"] += r["zeilen"]
        erg["auftraege"] += r["auftraege"]
        erg["warnung"] = erg["warnung"] or r["warnung"]
        erg["alles_zu"] = r["alles_zu"]
        return erg
    try:
        buch["perp_offen"] = any(_nochmal(lambda m=m: fut.position_info(COINS[m][0]))[0] != 0 for m in COINS)
        speichern()
    except Exception:  # noqa: BLE001
        pass
    if protokolliere:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"],
                       "kapital": erg["kapital"], "auftraege": erg["auftraege"], "warnung": erg["warnung"]})
    return erg


# ───────────────────────── Stops ─────────────────────────
def _soll(mein, pos, kurs, d):
    """Stop-Grössen aus Coins (mein) und Perpetual (pos): long → Spot-Stop über min(Netto, Coins); short → Perp-Stop über
    Short minus (abgerundete) Absicherung. Unter einem halben Futures-Schritt kein Perp-Stop (er träfe sonst die Ernte).
    d["unklar_sell"] gesetzt (ein Perp-Auftrag auf diesem Markt ist noch unklar, die Position kann sich also noch ändern):
    BEIDE Seiten ganz sichern — Spot-Stop über alle Coins, Perp-Stop (reduceOnly) über den ganzen Short plus die unklaren
    Short-Aufträge. Löst einer aus, schützt der andere den Rest (die Ernte endet dann) — in jedem Fall, ob der unklare Auftrag
    ausgeführt wird oder nicht. Nie ein nackter Short, falls er verspätet doch ankommt."""
    netto = mein + pos
    ungesichert = abs(netto) * kurs >= STAUB_USDT
    short = abs(min(pos, 0.0))
    short_teil = short - min(mein, short)
    if d.get("unklar_sell") is not None or d.get("beidseitig"):
        stop_spot = PL.runde(mein, d["rs"]["step"]) if mein * kurs >= STAUB_USDT else 0.0
        beide = short + (d.get("unklar_sell") or 0.0)
        stop_perp = PL.runde(beide, d["rf"]["step"]) if beide * kurs >= STAUB_USDT else 0.0
        return {"netto": netto, "mein": mein, "pos": pos, "kurs": kurs, "ungesichert": True, "stop_spot": stop_spot,
                "stop_perp": stop_perp, "short_teil": short_teil, "beidseitig": True}
    stop_spot = PL.runde(min(max(0.0, netto), mein), d["rs"]["step"]) if netto > 0 and ungesichert else 0.0
    # Absicherung abrunden, NICHT den Stop: sonst bliebe bis zu ein Futures-Schritt Short ohne Stop.
    stop_perp = (max(0.0, short - PL.runde(min(mein, short), d["rf"]["step"]))
                 if short_teil >= 0.5 * d["rf"]["step"] and short_teil * kurs >= STAUB_USDT else 0.0)
    if netto < 0 < mein and stop_perp > 0:
        # netto short: die Absicherung ist auf ganze Futures-Schritte abgerundet, der Perp-Stop deckt den Rest des Shorts. Löst
        # er aus, bliebe der Coin-Rest unter einem Futures-Schritt als Long ohne Stop übrig → er bekommt schon jetzt einen
        # Spot-Stop. Fällt der Kurs stattdessen, verkauft dieser Stop den Rest, und der Perp-Stop deckt genau den dann
        # ungesicherten Short.
        rest = mein - PL.runde(min(mein, short), d["rf"]["step"])
        if rest * kurs >= STAUB_USDT:
            stop_spot = PL.runde(rest, d["rs"]["step"])
    return {"netto": netto, "mein": mein, "pos": pos, "kurs": kurs, "ungesichert": ungesichert, "stop_spot": stop_spot,
            "stop_perp": stop_perp, "short_teil": short_teil}


def _jenseits(e, st, netto, kurs):
    """Liegt der Kurs schon jenseits des Stop-Kurses der Netto-Richtung (long: darunter, short: darüber)?"""
    if netto > 0:
        grenze = e.get("stop_long") or st.get("p_long")
        return bool(grenze and kurs <= grenze)
    if netto < 0:
        grenze = e.get("stop_short") or st.get("p_short")
        return bool(grenze and kurs >= grenze)
    return False


def _zu_gross(d, merken=True):
    """Ein zu grosser eigener Stop liess sich nicht korrigieren (Löschen/Ersetzen abgelehnt) — löst er aus, träfe er die
    Absicherung: den Markt beidseitig sichern (Spot-Stop über alle Coins, Perp-Stop über den ganzen Short; löst einer aus,
    schützt der andere den Rest), noch eine Abgleich-Runde, und für die Nachkontrolle merken (sie korrigiert nochmals).
    merken=False: absichtlich stehen gelassen (kein cancelReplace, solange Binance ablehnt) — beidseitig IST geschützt, der
    nächste reguläre Lauf korrigiert; die Nachkontrolle muss dafür nicht laufen."""
    if merken:
        d["nachkontrolle"] = True
    if not d.get("beidseitig"):
        d["beidseitig"], d["neue_runde"] = True, True


def unklar_sell(buch, markt):
    """None = kein unklarer Perp-Auftrag auf diesem Markt; sonst die Summe der unklaren Short-Aufträge (SELL ohne reduceOnly)."""
    offen = [u for u in buch.get("unklar") or [] if u.get("markt") == markt]
    if not offen:
        return None
    return sum(float(u.get("menge") or 0) for u in offen
               if u.get("konto", "perp") == "perp" and u.get("seite") == "SELL" and not u.get("reduce"))


def unklar_eintrag(markt, sym, konto, seite, menge, reduce, ex=None):
    """Buch-Eintrag für einen Auftrag mit unklarer Antwort (Kennung aus dem UnklarFehler)."""
    return {"markt": markt, "sym": sym, "konto": konto, "cid": getattr(ex, "cid", None), "seite": seite, "menge": float(menge),
            "reduce": bool(reduce), "zeit": int(time.time() * 1000)}


def _kurs_oder_mark(spot, fut, sym, warten=None):
    """Kurs vom Spot-Ticker, sonst der Futures-Markpreis (eigener Endpunkt, eigenes Limit) — der Not-Aus darf nicht an einem
    gesperrten Spot-Ticker scheitern. Beide nicht lesbar → der Fehler des Spot-Tickers."""
    try:
        return _nochmal(lambda: spot.kurs(sym), warten)
    except Exception as ex:  # noqa: BLE001
        try:
            return float(_nochmal(lambda: fut.markpreis(sym), warten)[0])
        except Exception:  # noqa: BLE001
            raise ex from None


def _lage(spot, fut, d, warten=None):
    """Frisch gelesen: (frei, gebunden, Perp-Position, Kurs). Kurs nicht lesbar → der vom Laufanfang."""
    frei, gebunden = bestand(_nochmal(spot.konto, warten), d["coin"])
    pos = _nochmal(lambda: fut.position_info(d["sym"]), warten)[0]
    try:
        kurs = _nochmal(lambda: spot.kurs(d["sym"]))
    except Exception:  # noqa: BLE001
        kurs = d["kurs"]
    return frei, gebunden, pos, kurs


def _platziere(platzieren, cid, warten=None):
    """Stop mit EINER Kennung für alle Versuche: kam ein Versuch doch an (Antwort verloren, in den Listen noch nicht sichtbar),
    lehnt Binance die Wiederholung als Doppel ab — dann steht er. Nie zwei Stops aus einer verlorenen Antwort."""
    warten = LESE_WARTEN if warten is None else warten
    for i in range(len(warten) + 1):
        try:
            return {**(platzieren(cid) or {}), "cid": cid}
        except Exception as ex:  # noqa: BLE001
            if _doppelt(ex):
                return {"cid": cid, "nachgesehen": True}
            if i >= len(warten) or not _voruebergehend(ex):
                raise
            time.sleep(warten[i])
    return {"cid": cid}


def _setze_stop(platz, preise, cid, sofort_raus=False, warten=None):
    """Stop zum ersten Preis setzen, scheitert das: zum nächsten (alter Kurs, Not-Stop). Alle Versuche mit DERSELBEN Kennung.
    sofort_raus: würde schon der erste Preis sofort auslösen → _Ausgeloest (der Aufrufer schliesst zum Markt).
    → (Antwort, Preis); scheitern alle → der letzte Fehler."""
    letzter = None
    for i, preis in enumerate(p for p in preise if p):
        try:
            return _platziere(lambda c, preis=preis: platz(preis, c), cid, warten), preis
        except Exception as ex:  # noqa: BLE001
            if i == 0 and sofort_raus and _sofort_ausgeloest(ex):
                raise _Ausgeloest() from ex
            letzter = ex
    if letzter is None:
        raise ValueError("kein gültiger Stop-Kurs")
    raise letzter


def _alle_weg(alt, abbrechen, k, art, warn, schutz):
    """Eigene alte Stops stornieren (mit Wiederholungen). → None (alle weg) oder der Stop, der noch offen ist — dann KEIN
    zweiter (ein Doppel-Stop könnte die Ernte-Absicherung treffen)."""
    for o in alt:
        try:
            _nochmal(lambda o=o: abbrechen(o))
        except Exception as ex:  # noqa: BLE001
            schutz.append(f"alter {art}-Stop")
            warn(f"{k}: alter {art}-Stop ist noch offen (Löschen gescheitert, {type(ex).__name__}) — kein zweiter gesetzt.")
            return o
    return None


def _spot_freigeben(spot, buch, k, d, menge, erg, unklar_neu):
    """Der Plan verkauft `menge` Coins, die eigene Spot-Stops sperren (die freien sind schon verkauft): pro Stop EIN cancelReplace
    — Stop → kleinerer Stop (gibt genau das Nötige frei), oder, bliebe vom Stop nichts Gültiges übrig, Stop → Marktverkauf
    seiner Coins. Lehnt Binance ab, bleibt der Stop (nie Schutz wegnehmen, ohne verkaufen zu können).
    → (verkauft, frei): verkauft = schon mit dem Stop verkaufte Coins, frei = freigegebene Coins. Fehler → Ausnahme;
    _StopWeg = Binance hat den Stop storniert, den Ersatz aber abgelehnt (die Coins sind jetzt frei, ohne Stop)."""
    st = buch["stops"].setdefault(k, {})
    sym, rs = d["sym"], d["rs"]
    if _handel_aus(rs):
        raise RuntimeError(f"{sym} laut Binance nicht im Handel ({rs.get('status')}) — die Spot-Stops bleiben")
    verkauft, frei, brauche = 0.0, 0.0, menge
    for o in sorted(_nochmal(lambda: spot.eigene_stops(sym)), key=lambda o: -_rest(o)):
        if brauche <= rs["step"] / 2:
            break
        rest, p_o = _rest(o), float(o.get("stopPrice") or 0) or st.get("p_long") or d["kurs"] * (1 - NOT_STOP_ABSTAND)
        bleibt = PL.runde(rest - brauche, rs["step"])
        # der kleinere Stop nie zu einem Kurs, der schon erreicht ist (Kurs unter dem alten Stop, z. B. ein hängender
        # STOP_LOSS_LIMIT): Binance storniert zuerst und lehnt dann «würde sofort auslösen» ab → der Stop wäre weg
        p_neu = _stop_preis(None, p_o, d["kurs"], +1)
        if bleibt > 0 and bleibt * min(p_neu, d["kurs"]) >= rs["min_notional"]:
            res, ant = spot.ersetzen(sym, o["orderId"], spot.stop_params(sym, bleibt, p_neu, rs, _kennung(CID_STOP_SPOT)))
            if res == "nur_storno":
                st["spot"] = None
                raise _StopWeg(verkauft, frei + rest)
            if res != "ok":
                raise RuntimeError(f"Spot-Stop nicht verkleinert ({res})")
            st["spot"], frei, brauche = ant.get("orderId"), frei + rest - bleibt, 0.0
            if p_neu != p_o:
                st["p_long"] = p_neu
            continue
        cid = f"p2{int(time.time() * 1000)}{random.randint(0, 999999):06d}"
        m = PL.runde(rest, rs["step"])
        res, ant = spot.ersetzen(sym, o["orderId"], {"side": "SELL", "type": "MARKET", "quantity": BB.format_menge(m),
                                                      "newOrderRespType": "FULL", "newClientOrderId": cid})
        if res == "unklar":
            u = unklar_eintrag(k, sym, "spot", "SELL", m, False)
            u["cid"] = cid
            unklar_neu.append(u)
        if res == "nur_storno":
            st["spot"] = None
            raise _StopWeg(verkauft, frei + rest)
        if res != "ok":
            raise RuntimeError(f"Spot-Stop mit Verkauf nicht ersetzt ({res})")
        ausg = _ausgefuehrt(ant, m)
        erg["auftraege"].append((k, "spot", "SELL", ausg))
        st["spot"], verkauft, brauche = None, verkauft + ausg, brauche - ausg
    return verkauft, frei


def _stops_vorab(spot, fut, buch, k, d, plan, nur_jetzt=False):
    """Vor dem Handeln, ohne je einen Stop ersatzlos wegzunehmen: ist der eigene Perp-Stop grösser als das, was während des
    ganzen Laufs sicher ungesichert ist (er träfe sonst mitten im Lauf die neue Ernte-Absicherung), ZUERST den kleineren setzen,
    dann den alten löschen. Gehört gar keiner mehr hin, bleibt er bis zum Abgleich am Laufende stehen (reduceOnly). Spot-Stops
    bleiben hier unberührt (Coins für einen Verkauf gibt _spot_freigeben erst frei, wenn die freien schon verkauft sind).
    → True, wenn Stops geändert wurden. Fehler → Ausnahme (Aufrufer sperrt den Markt)."""
    info = plan.get("info") or {}
    if not isinstance(info, dict) or "spot_ziel" not in info:
        return False
    st = buch["stops"].setdefault(k, {})
    sym, rf = d["sym"], d["rf"]
    frei, gebunden, pos, kurs = _lage(spot, fut, d)  # frisch: so, wie das Verkleinern es hinterlassen hat
    jetzt = _soll(frei + gebunden, pos, kurs, d)
    # gekaufte Coins kommen abzüglich der Gebühr in Coins an: lieber einen Schritt mehr ungesichert annehmen (ein zu grosser
    # Stop wird am Ende ersetzt oder beidseitig abgefangen) als einen Teil des Shorts ohne Stop lassen
    coins_jetzt, ziel = frei + gebunden, max(0.0, info["spot_ziel"])
    ziel = coins_jetzt + (ziel - coins_jetzt) * (1 - GEB_SPOT_KAUF) if ziel > coins_jetzt else ziel
    ende = _soll(ziel, info["perp_ziel"], kurs, d)
    # nur_jetzt (nach dem Verkleinern, vor den Käufen): nie unter das, was JETZT ungesichert ist — die Ernte-Coins sind noch nicht
    # gekauft (bleibt ein Kauf unklar oder abgelehnt, wäre der Short sonst teilweise ohne Stop); erst nach den Käufen bis zum Plan-Ende
    sicher_p = PL.runde(jetzt["stop_perp"] if nur_jetzt else min(jetzt["stop_perp"], ende["stop_perp"]), rf["step"])
    alt_p = _nochmal(lambda: fut.eigene_stops(sym))
    if not (alt_p and sicher_p >= rf["step"] and sum(float(a.get("quantity") or 0) for a in alt_p) > sicher_p + rf["step"] / 2):
        return False
    p_alt = float(alt_p[0].get("triggerPrice") or 0) or st.get("p_short")
    if not (p_alt and p_alt > kurs):
        return False
    cid = _kennung(CID_STOP_PERP)
    try:
        r = _platziere(lambda c: fut.stop_menge(sym, "BUY", sicher_p, p_alt, rf["tick"], cid=c), cid)
    except Exception:
        _kennung_weg(fut, sym, cid)
        raise
    st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p_alt
    for a in alt_p:  # erst jetzt (der kleinere steht) die alten weg; geht das nicht → Ausnahme → Markt gesperrt, Abgleich am Ende
        _nochmal(lambda a=a: fut.algo_abbrechen(sym, a.get("algoId")))
    return True


def _stops_setzen(spot, fut, buch, speichern, ents, daten, basis_g, erg, warn, gehandelt=frozenset()):
    """Am Ende jedes Laufs: Stops nach dem Kontostand und der tatsächlichen Netto-Richtung. Wiederholt, bis der Kontostand
    während des Abgleichs gleich bleibt (ein Börsen-Stop kann dazwischen auslösen). Nicht prüfbar → laute Warnung."""
    for e in ents:
        k, d = e["markt"], daten[e["markt"]]
        st = buch["stops"].setdefault(k, {})
        gesetzt, schutz, gescheitert = [], [], []
        try:  # exchangeInfo frisch: geht ein Symbol mitten im Lauf auf BREAK/HALT, ersetzt der Abgleich nichts per cancelReplace
            d["rs"] = _nochmal(lambda d=d: spot.regeln2(d["sym"]))
        except Exception:  # noqa: BLE001 — nicht lesbar: die Regeln vom Laufanfang
            pass
        vorher, s, stabil, jenseits_offen = None, None, False, False
        d.pop("jenseits_gehalten", None)
        d.pop("haengend_abgelehnt", None)
        fehlt = [False]
        warn_aussen = warn
        schon = set()

        def warn(t, fehlt=fehlt, warn_aussen=warn_aussen, schon=schon):  # noqa: F811 — merkt sich, ob etwas ohne Stop blieb
            # konkrete Fehlschläge (nicht die Sammelmeldung «zu klein für Binance» — die kann keine Wiederholung ändern) → Nachkontrolle
            if ("OHNE Stop" in t or "ohne Stop" in t or "nicht geprüft" in t or "Stop abgelehnt" in t) and "zu klein" not in t:
                fehlt[0] = True
            if t not in schon:  # dieselbe Meldung aus einer weiteren Abgleich-Runde nur einmal
                schon.add(t)
                warn_aussen(t)

        def lesen(warten=None, d=d):
            return _lage(spot, fut, d, warten)

        def merke(u, d=d, k=k):
            """Ein Ausstieg zum Markt im Abgleich blieb unklar: ins Buch, Markt ab jetzt beidseitig, noch eine Runde."""
            buch.setdefault("unklar", []).append(u)
            d["unklar_sell"] = unklar_sell(buch, k)
            d["neue_runde"] = True
            speichern()
        d["merke_unklar"] = merke
        for _ in range(ABGLEICH_RUNDEN):
            try:
                frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)  # länger warten: ohne Kontostand kein neuer Stop
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: Kontostand nicht lesbar ({type(ex).__name__}) — Stops nicht geprüft, Position läuft evtl. OHNE Stop, bitte prüfen!")
                gescheitert.append("Kontostand")
                if d.get("perp_ausgeloest") and s is not None:
                    _spot_vorsorge(spot, k, d, st, e, s, warn, gesetzt)
                break
            jetzt = (round(frei + gebunden, 9), round(pos, 9))
            gleich = (vorher is not None and abs(jetzt[0] - vorher[0]) <= d["rs"]["step"] / 2
                      and abs(jetzt[1] - vorher[1]) <= d["rf"]["step"] / 2)
            # liegt der Kurs jenseits eines Stop-Kurses: noch eine Runde (sie steigt zum Markt aus) — ausser der Stop bleibt
            # bewusst stehen (Binance lehnte ab, kein Ersetzen): dann änderte eine weitere Runde nichts
            if gleich and (not _jenseits(e, st, frei + gebunden + pos, kurs) or d.get("jenseits_gehalten")):
                stabil = True
                break
            jenseits_offen = gleich  # Kontostand gleich, aber der Ausstieg jenseits des Stop-Kurses steht noch aus
            d.pop("jenseits_gehalten", None)
            vorher = jetzt
            s = _soll(frei + gebunden, pos, kurs, d)
            s.update(frei=frei, gebunden=gebunden)
            for teil, abgleich in (("Spot", lambda: _spot_abgleich(spot, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, k in gehandelt)),
                                   ("Perp", lambda: _perp_abgleich(fut, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, k in gehandelt))):
                try:  # getrennt: scheitert der Spot-Stop, bekommt der Short trotzdem seinen (und umgekehrt)
                    abgleich()
                except Exception as ex:  # noqa: BLE001
                    gescheitert.append(teil)
                    warn(f"{k}: {teil}-Stop nicht gesetzt ({type(ex).__name__} {str(ex)[:100]}) — Position läuft OHNE Stop, bitte prüfen!")
            if gescheitert:
                break
            if d.pop("neue_runde", False):  # z. B. ein alter Stop hat inzwischen ausgelöst → nicht als «gleich geblieben» werten
                vorher = None
        haengend = d.pop("haengend_abgelehnt", None)
        if haengend and not gescheitert:
            # der Verkauf eines hängenden STOP_LOSS_LIMIT wurde bis zuletzt abgelehnt: hängt er noch (frisch gelesen), kommt
            # wenigstens ein Not-Stop an seine Stelle
            try:
                kurs_jetzt = lesen(SCHUTZ_WARTEN)[3]
                o_h = next((o for o in _nochmal(lambda d=d: spot.eigene_stops(d["sym"]), SCHUTZ_WARTEN)
                            if o.get("orderId") == haengend[0] and o.get("isWorking") is True
                            and float(o.get("price") or 0) > kurs_jetzt), None)
            except Exception:  # noqa: BLE001 — nicht lesbar: trotzdem versuchen (ist er weg, lehnt Binance ab — nichts verloren)
                kurs_jetzt, o_h = (s["kurs"] if s else d["kurs"]), {"orderId": haengend[0]}
            menge_h = PL.runde(min(haengend[1], _rest(o_h) if "origQty" in o_h else haengend[1]), d["rs"]["step"]) if o_h else 0.0
            if o_h and not _haengenden_ersetzen(spot, k, d, st, o_h, menge_h, kurs_jetzt, warn, gesetzt):
                warn(f"{k}: der ausgelöste Stop-Limit hängt über dem Kurs, Verkauf und Not-Stop abgelehnt — {menge_h:g} "
                     f"{d['coin']} OHNE Stop, bitte sofort prüfen!")
        offen = [m for m in buch.get("schutz_offen") or [] if m != k]
        nochmal = d.pop("nachkontrolle", False)  # ein zu grosser Stop liess sich nicht korrigieren
        buch["schutz_offen"] = offen + ([k] if fehlt[0] or gescheitert or nochmal else [])  # → die Nachkontrolle versucht es nochmals
        warn = warn_aussen
        if s is None:
            speichern()
            continue
        if not stabil and not gescheitert:
            warn(f"{k}: Kurs liegt jenseits des Stop-Kurses, der Ausstieg zum Markt gelang in {ABGLEICH_RUNDEN} Runden nicht — "
                 "bitte prüfen!" if jenseits_offen else
                 f"{k}: Kontostand hat sich während des Stop-Abgleichs mehrmals geändert (Stop ausgelöst?) — bitte prüfen!")
        speichern()
        richtung = s["netto"] * s["kurs"] / basis_g if basis_g else 0.0
        z = e.get("z", 0)
        erg["zeilen"].append(f"{k}: Spot {s['mein']:g} {d['coin']}, Perp {s['pos']:+g}, Richtung {richtung:+.2f} (Ziel {z:+.2f})"
                             + "".join(", " + g for g in dict.fromkeys(gesetzt + schutz))
                             + (" — beidseitig gesichert (unklarer Auftrag)" if s.get("beidseitig") else ""))
        if s["ungesichert"] and not gesetzt and not schutz and not gescheitert and (s["stop_spot"] or s["stop_perp"] or s["short_teil"] * s["kurs"] >= 100):
            warn(f"{k}: Richtung {richtung:+.2f} OHNE Stop (zu klein für Binance, abgelehnt oder nicht prüfbar) — bitte prüfen!")
        if basis_g and abs(richtung - z) > 0.25:
            erg["zeilen"].append(f"{k}: Richtung {richtung:+.2f} weicht vom Ziel {z:+.2f} ab — Stop auf die tatsächliche Richtung gesetzt,"
                                 " der nächste Lauf gleicht weiter aus.")


def _spot_abgleich(spot, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, gehandelt):
    """Long-Seite: eigene Spot-Stops über die Netto-Richtung. Passende bleiben; sonst wird ersetzt, ohne je einen Stop vorher
    wegzunehmen: ein Stop per cancelReplace (lehnt Binance den neuen ab, bleibt der alte), mehrere einzeln. Nur wenn keiner
    (mehr) steht: FRISCH nachlesen und neu setzen — scheitert das: alter Kurs, dann Not-Stop. Lehnte Binance heute in diesem Markt
    etwas ab (nur_ergaenzen), bleibt ein nicht zu grosser Stop und Ungedecktes kommt dazu; ein zu grosser, der sich nicht
    korrigieren lässt → beidseitig. Kurs schon unter dem Stop-Kurs (oder ein ausgelöster STOP_LOSS_LIMIT hängt) → zum Markt
    aussteigen, gesperrte Coins mit ihrem Stop in einer Anfrage. Gesperrte Coins hält im Pilot-Konto ein eigener Auftrag (ein
    Stop, der evtl. noch nicht in der Liste steht) — ein neuer Stop deckt nur den Rest (nie doppelt)."""
    sym, regeln = d["sym"], d["rs"]
    soll, kurs = s["stop_spot"], s["kurs"]
    try:
        alt = _nochmal(lambda: spot.eigene_stops(sym), SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001
        _spot_ohne_liste(spot, k, d, st, e, s, warn, gesetzt, gehandelt, ex)
        return
    grenze = e.get("stop_long") or st.get("p_long")
    p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
    p_r = PL.runde(p, regeln["tick"])
    if soll <= 0 or soll * min(kurs, p) < regeln["min_notional"]:  # kein Stop nötig oder zu klein für Binance (am Stop-Kurs)
        if alt:  # verwaiste eigene Stops (z. B. nachdem der Perp-Stop ausgelöst hat) dürfen nie Ernte-Coins verkaufen
            offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
            st["spot"] = offen.get("orderId") if offen else None
            if offen:
                _zu_gross(d)
        elif s["gebunden"] * kurs >= STAUB_USDT:
            # Coins gesperrt, aber kein eigener Stop in der Liste: die Liste hinkt nach (z. B. eben beim Freigeben gesetzt). Hier
            # braucht es keinen Stop → den im Buch bekannten über seine ID löschen (geht, auch wenn die Liste ihn noch nicht
            # zeigt); ohne ID oder wenn das scheitert: beidseitig (der Short bekommt seinen Stop über die ganze Menge)
            try:
                if not st.get("spot"):
                    raise LookupError("keine Stop-ID im Buch")
                _nochmal(lambda: spot.abbrechen(sym, st["spot"]))
                st["spot"] = None
                d["neue_runde"] = True  # frisch nachsehen, ob die Coins jetzt frei sind
                schutz.append("verwaister Stop (noch nicht in der Liste) über seine ID gelöscht")
            except Exception:  # noqa: BLE001
                _zu_gross(d)
        return
    # ein ausgelöster STOP_LOSS_LIMIT, dessen Limit über dem Kurs hängt (Kurslücke), schützt nicht mehr — sein Stop-Kurs ist
    # erreicht: wie jenseits behandeln (Stop und Verkauf zum Markt in einer Anfrage)
    jenseits = bool(grenze and kurs <= grenze) or any(o.get("isWorking") is True and float(o.get("price") or 0) > kurs for o in alt)
    if (not jenseits and len(alt) == 1 and _gleich(alt[0].get("origQty"), soll, regeln["step"])
            and _gleich(alt[0].get("stopPrice"), p_r, regeln["tick"])):
        st["spot"], st["p_long"] = alt[0].get("orderId"), p
        schutz.append(f"Stop {soll:g} @ {p_r:g} bleibt")
        return
    if ((d.get("nur_ergaenzen") or _handel_aus(regeln)) and alt and not jenseits
            and not any(o.get("isWorking") is True for o in alt)):
        # Binance lehnte heute einen neuen Auftrag ab (oder das Symbol ist nicht im Handel): kein cancelReplace — es könnte
        # erst stornieren und dann ablehnen. Ein nicht zu grosser Stop bleibt, Ungedecktes kommt dazu; ein zu grosser bleibt
        # AUCH stehen und der Markt wird beidseitig gesichert (der Short bekommt seinen Stop über die ganze Menge)
        st["spot"] = alt[0].get("orderId")
        if sum(_rest(o) for o in alt) > soll + regeln["step"] / 2:
            schutz.append("zu grosser Stop bleibt (Binance lehnte heute ab) — beidseitig")
            _zu_gross(d, merken=False)
            return
        schutz.append("bisherige Stops bleiben (Binance lehnte heute ab)")
        _spot_rest_sichern(spot, k, d, st, s, soll, p, warn, gesetzt)
        return
    if (s.get("beidseitig") and not jenseits and alt and not any(o.get("isWorking") is True for o in alt)
            and sum(float(o.get("origQty") or 0) - float(o.get("executedQty") or 0) for o in alt) >= soll - regeln["step"] / 2):
        schutz.append("Stops decken alle Coins")  # beidseitig: passt — kein Ersetzen nötig
        return
    p_alt = (float(alt[0].get("stopPrice") or 0) if alt else 0.0) or st.get("p_long")
    if len(alt) == 1 and not jenseits:
        # einen Stop ersetzen: Storno + neuer Stop in EINER Anfrage (cancelReplace) — lehnt Binance den neuen ab (Filter, Phase
        # «nur Stornieren»), bleibt der alte stehen; nie einen funktionierenden Stop wegnehmen, ohne dass der Ersatz steht
        o = alt[0]
        rest_o = float(o.get("origQty") or 0) - float(o.get("executedQty") or 0)
        menge = PL.runde(max(0.0, min(soll - (s["gebunden"] - rest_o), s["frei"] + rest_o)), regeln["step"])
        if menge * p >= regeln["min_notional"]:
            res, info = spot.ersetzen(sym, o["orderId"], spot.stop_params(sym, menge, p, regeln, _kennung(CID_STOP_SPOT)))
            if res in ("nichts", "nur_storno", "unklar"):
                d["nur_ergaenzen"] = True  # Binance lehnte ab: in den weiteren Runden kein cancelReplace mehr
            if res == "ok":
                st["spot"], st["p_long"] = info.get("orderId"), p
                gesetzt.append(f"Stop {menge:g} @ {p_r:g}")
                if (soll - menge) * kurs >= STAUB_USDT:
                    warn(f"{k}: nur {menge:g} von {soll:g} {d['coin']} gegen Stop gesichert — Rest nicht frei. Bitte prüfen!")
                return
            if res == "nichts":
                st["spot"] = o.get("orderId")
                schutz.append("alter Stop bleibt")
                warn(f"{k}: neuer Spot-Stop abgelehnt ({_text(info)[:80]}) — der bisherige bleibt stehen. Bitte prüfen!")
                if rest_o > soll + regeln["step"] / 2:  # er ist zu gross (deckt Absicherungs-Coins) → der Short bekommt seinen Stop
                    _zu_gross(d)
                _spot_rest_sichern(spot, k, d, st, s, soll, p, warn, gesetzt)
                return
            if res == "unklar":
                d["neue_runde"] = True  # die nächste Runde liest die Liste und gleicht ab
                warn(f"{k}: Ersetzen des Spot-Stops unklar ({type(info).__name__}) — wird nachgelesen.")
                if rest_o > soll + regeln["step"] / 2:  # steht der alte (zu grosse) noch, träfe er die Absicherung → beidseitig
                    _zu_gross(d)
                try:  # frisch: kam das Ersetzen doch an, sind die Coins jetzt unter dem neuen Stop gesperrt (nichts frei)
                    frei2, gebunden2, _, kurs2 = lesen(SCHUTZ_WARTEN)
                    _spot_rest_sichern(spot, k, d, st, dict(s, frei=frei2, gebunden=gebunden2, kurs=kurs2), soll, p, warn, gesetzt)
                except Exception:  # noqa: BLE001
                    pass
                return
            if res == "nur_storno":
                alt = []  # der alte ist weg, der neue nicht da → unten wie gewohnt (frisch lesen, mit Ersatzkursen) setzen
            # «fehlt»: Binance kennt cancelReplace nicht → wie früher (stornieren, dann neu)
    elif len(alt) >= 2 and not jenseits:
        # mehrere eigene Stops (z. B. Stop + Zusatz-Stop): nie alle löschen und einen neuen setzen (in einer Phase «nur
        # Stornieren» stünde der Long dann ohne Stop) — jeden einzeln anpassen, was fehlt aus freien Coins dazu
        if all(_gleich(o.get("stopPrice"), p_r, regeln["tick"]) for o in alt) and _gleich(sum(_rest(o) for o in alt), soll, regeln["step"]):
            st["p_long"] = p
            schutz.append(f"Stops {soll:g} @ {p_r:g} bleiben")
            return
        gedeckt, frei, texte, unklar = _spot_stops_anpassen(spot, sym, regeln, alt, soll, kurs, s["frei"], preis=p,
                                                            merke=lambda: d.__setitem__("nur_ergaenzen", True))
        st["p_long"] = p
        gesetzt.extend(texte)
        if gedeckt > soll + regeln["step"] / 2 or (unklar and sum(_rest(o) for o in alt) > soll + regeln["step"] / 2):
            _zu_gross(d)  # liess sich nicht (sicher) verkleinern → beidseitig (der Short bekommt seinen Stop)
        if unklar:
            d["neue_runde"] = True  # die nächste Runde liest die Liste und gleicht ab
            return
        _spot_rest_sichern(spot, k, d, st, dict(s, frei=frei, gebunden=gedeckt), soll, p, warn, gesetzt)
        return
    if jenseits and alt:  # Kurs schon jenseits: die gesperrten Coins mit ihrem Stop zusammen verkaufen (lehnt Binance ab: Stop bleibt)
        _spot_stops_verkaufen(spot, k, d, st, alt, erg, warn, gesetzt, f"Kurs {kurs:g} schon unter dem Stop "
                              + (f"{grenze:g}" if grenze else "(ausgelöster Stop-Limit hängt)"), soll=soll, schutz=schutz, kurs=kurs)
        alt = []
    offen = _alle_weg(alt, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, schutz)
    if offen:
        st["spot"] = offen.get("orderId")
        return
    st["spot"] = None
    try:  # frisch: ein alter Stop kann zwischen Lesen und Storno ausgelöst haben
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001 — der alte Stop ist weg: lieber nach dem Stand von vorhin sichern als gar nicht
        warn(f"{k}: Kontostand nach dem Storno nicht lesbar ({type(ex).__name__}) — Stop nach dem Stand von vorhin gesetzt.")
        frei, gebunden, pos, kurs = s["frei"] + s["gebunden"], 0.0, s["pos"], s["kurs"]
    soll = _soll(frei + gebunden, pos, kurs, d)["stop_spot"]
    if soll <= 0 or soll * kurs < regeln["min_notional"]:
        return
    if grenze and kurs <= grenze:
        # gesperrte Coins liegen noch unter einem stehenden Stop (Verkauf abgelehnt oder nach einer Ablehnung bewusst nicht
        # ersetzt): nur den Rest der Netto-Richtung verkaufen — die freien Coins darüber hinaus sind die Absicherung des Shorts
        if gebunden > soll + regeln["step"] / 2:
            _zu_gross(d)  # der stehende Stop deckt auch Absicherung → beidseitig (der Short bekommt seinen Stop)
        _spot_raus(spot, k, d, st, max(0.0, soll - gebunden), kurs, erg, warn, gesetzt,
                   f"Kurs {kurs:g} schon unter dem Stop {grenze:g}", lesen)
        return
    menge = PL.runde(max(0.0, min(soll - gebunden, frei)), regeln["step"])
    if menge * p < regeln["min_notional"]:
        if gebunden * kurs >= STAUB_USDT:
            schutz.append(f"{gebunden:g} {d['coin']} in einem Auftrag ausserhalb der Liste")
            warn(f"{k}: {gebunden:g} {d['coin']} sind durch einen Auftrag gesperrt, der (noch) nicht in der Auftragsliste steht — gilt "
                 "als Stop, kein zweiter gesetzt. Bitte im Binance-Konto prüfen!")
            if gebunden > soll + regeln["step"] / 2:  # grösser als nötig: löst er aus, träfe er die Absicherung → beidseitig
                _zu_gross(d)
        return  # sonst: der Rest ist am Stop-Kurs zu klein für Binance (Sammelmeldung «zu klein» am Ende)
    preise = [p] + ([p_alt] if p_alt and p_alt < kurs and not _gleich(p_alt, p, regeln["tick"]) else []) + [kurs * (1 - NOT_STOP_ABSTAND)]
    try:
        r, p_ok = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), preise, _kennung(CID_STOP_SPOT),
                              sofort_raus=True)
    except _Ausgeloest:
        _spot_raus(spot, k, d, st, menge, kurs, erg, warn, gesetzt, f"Stop {p_r:g} würde sofort auslösen (Kurs gefallen)", lesen)
        return
    st["spot"], st["p_long"] = r.get("orderId"), p_ok
    gesetzt.append(f"Stop {menge:g} @ {PL.runde(p_ok, regeln['tick']):g}")
    if p_ok != p:
        warn(f"{k}: neuer Spot-Stop {p_r:g} abgelehnt — " + ("der bisherige Stop-Kurs" if p_ok == p_alt else "ein Not-Stop 5 % unter dem Kurs")
             + " ist gesetzt.")
    if gebunden * kurs >= STAUB_USDT:
        warn(f"{k}: {gebunden:g} {d['coin']} sind durch einen Auftrag gesperrt, der (noch) nicht in der Auftragsliste steht — gilt als "
             f"Stop, der neue deckt nur den Rest ({menge:g}). Bitte im Binance-Konto prüfen!")
    elif (soll - gebunden - menge) * kurs >= STAUB_USDT:
        warn(f"{k}: nur {menge:g} von {soll:g} {d['coin']} gegen Stop gesichert — Rest nicht frei. Bitte prüfen!")


def _rest(o):
    return float(o.get("origQty") or 0) - float(o.get("executedQty") or 0)


def _spot_stops_anpassen(spot, sym, regeln, alt, soll, kurs, frei, preis=None, merke=None):
    """Eigene Spot-Stops auf zusammen `soll` Coins bringen, ohne je einen Stop ersatzlos wegzunehmen: jeder einzeln per
    cancelReplace (lehnt Binance den neuen ab, bleibt der alte); einer, der nicht mehr gebraucht wird, wird gelöscht (seine
    Coins brauchen keinen Stop). Was danach noch fehlt, ergänzt der Aufrufer aus freien Coins.
    preis=None: jeder behält seinen Stop-Kurs (nur die Menge ändert sich), sonst alle auf `preis`. merke(): bei der ersten
    Ablehnung aufgerufen (der Aufrufer ersetzt dann in diesem Lauf keinen Stop mehr per cancelReplace).
    → (gedeckt, frei, texte, unklar): gedeckt = Coins unter stehenden Stops; unklar = eine Antwort ging verloren (nachlesen)."""
    gedeckt, texte, unklar, abgelehnt = 0.0, [], False, False
    if _handel_aus(regeln):  # kein cancelReplace, solange Binance keine neuen Aufträge annimmt: alle bleiben stehen
        return sum(_rest(o) for o in alt), frei, [f"Symbol nicht im Handel ({regeln.get('status')}) — Stops bleiben"], False
    for o in sorted(alt, key=lambda o: -_rest(o)):
        rest, p_o = _rest(o), float(o.get("stopPrice") or 0)
        p = preis or p_o
        if abgelehnt:  # nach der ersten Ablehnung kein weiteres cancelReplace (es könnte erst stornieren, dann ablehnen)
            if merke:
                merke()
            gedeckt += rest
            texte.append(f"Stop {rest:g} bleibt (Binance lehnte eben ab)")
            continue
        menge = PL.runde(max(0.0, min(soll - gedeckt, rest + frei)), regeln["step"])
        if menge * min(p, kurs) < regeln["min_notional"]:  # schon gedeckt (oder Rest zu klein): dieser Stop ist zu viel
            try:
                _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
                frei += rest
                texte.append(f"überzähliger Stop {rest:g} gelöscht")
            except Exception:  # noqa: BLE001
                gedeckt += rest
            continue
        if _gleich(rest, menge, regeln["step"]) and _gleich(p_o, PL.runde(p, regeln["tick"]), regeln["tick"]):
            gedeckt += rest
            continue
        res, _info = spot.ersetzen(sym, o["orderId"], spot.stop_params(sym, menge, p, regeln, _kennung(CID_STOP_SPOT)))
        if res == "ok":
            gedeckt, frei = gedeckt + menge, frei + rest - menge
            texte.append(f"Stop {menge:g} @ {PL.runde(p, regeln['tick']):g}")
        elif res == "nur_storno":
            frei += rest
            abgelehnt = True
            texte.append(f"Stop {rest:g} storniert, Ersatz abgelehnt")
        elif res == "unklar":
            gedeckt, unklar, abgelehnt = gedeckt + min(rest, menge), True, True
        else:  # «nichts» (Ersatz abgelehnt) oder «fehlt» (Binance kennt cancelReplace nicht): der alte bleibt stehen
            gedeckt += rest
            abgelehnt = abgelehnt or res == "nichts"
            texte.append(f"alter Stop {rest:g} bleibt")
    if abgelehnt and merke:
        merke()
    return gedeckt, frei, texte, unklar


def _spot_stops_verkaufen(spot, k, d, st, alt, erg, warn, gesetzt, grund, soll=None, schutz=None, kurs=None):
    """Kurs schon jenseits des Stops: die Coins unter eigenen Stops zum Markt verkaufen — Stop und Verkauf in EINER Anfrage
    (lehnt Binance den Verkauf ab, bleibt der Stop). Kennt Binance cancelReplace nicht: stornieren (der Verkauf folgt).
    Höchstens `soll` (die Netto-Richtung JETZT): wurden vorher schon freie Coins verkauft (z. B. weil der erste Versuch
    abgelehnt wurde), deckt der Stop auch Absicherungs-Coins — die werden nie mitverkauft (sonst ein nackter Short).
    Ein Stop, der bewusst stehen bleibt (Binance lehnte ab), zählt als Schutz (`schutz`) und als «jenseits gehalten». Lehnt
    Binance den Verkauf eines ausgelösten, über dem Kurs HÄNGENDEN STOP_LOSS_LIMIT ab, wird das gemerkt: die nächste Runde
    versucht den Ausstieg nochmals, und gelingt er bis zum Schluss nicht, kommt ein Not-Stop an seine Stelle (_stops_setzen)."""
    sym, regeln, coin = d["sym"], d["rs"], d["coin"]
    kurs = d["kurs"] if kurs is None else kurs

    def bleibt(o, warum="Binance lehnte ab"):
        st["spot"] = o.get("orderId")
        if schutz is not None:
            schutz.append(f"Stop {_rest(o):g} @ {float(o.get('stopPrice') or 0):g} bleibt ({warum})")

    if _handel_aus(regeln):
        warn(f"{k}: {grund}, aber {sym} laut Binance nicht im Handel ({regeln.get('status')}) — der Spot-Stop bleibt stehen.")
        for o in alt:
            if o.get("isWorking") is not True:
                bleibt(o, f"{sym} nicht im Handel")
        d["jenseits_gehalten"] = all(o.get("isWorking") is not True for o in alt)
        return
    offen_soll = float("inf") if soll is None else soll
    for o in alt:
        if d.get("nur_ergaenzen") and o.get("isWorking") is not True:
            # Binance lehnte in diesem Markt eben ab: einen noch wirksamen Stop nicht per cancelReplace ersetzen (er könnte erst
            # storniert und dann der Verkauf abgelehnt werden) — er bleibt stehen und schützt weiter
            warn(f"{k}: {grund}, aber Binance lehnte eben ab — der Spot-Stop bleibt stehen (kein Ersetzen).")
            bleibt(o)
            d["jenseits_gehalten"] = True  # eine weitere Abgleich-Runde änderte nichts daran
            continue
        m = PL.runde(min(_rest(o), offen_soll), regeln["step"])
        if m * kurs < regeln["min_notional"]:
            continue  # nichts (mehr) zu verkaufen: der Stop deckt nur noch Absicherung — die nächste Runde räumt ihn ab
        offen_soll -= m
        cid = f"p2{int(time.time() * 1000)}{random.randint(0, 999999):06d}"
        res, info = spot.ersetzen(sym, o["orderId"], {"side": "SELL", "type": "MARKET", "quantity": BB.format_menge(m),
                                                       "newOrderRespType": "FULL", "newClientOrderId": cid})
        if res == "ok":
            ausg = _ausgefuehrt(info, m)
            erg["auftraege"].append((k, "spot", "SELL", ausg))
            gesetzt.append(f"{grund} → {ausg:g} {coin} verkauft")
            st["spot"] = None
            if (d.get("haengend_abgelehnt") or (None,))[0] == o.get("orderId"):
                d.pop("haengend_abgelehnt", None)  # doch noch verkauft
        elif res == "unklar":
            u = unklar_eintrag(k, sym, "spot", "SELL", m, False)
            u["cid"] = cid
            if d.get("merke_unklar"):
                d["merke_unklar"](u)
        elif res == "fehlt":
            try:
                _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
                st["spot"] = None
            except Exception as ex:  # noqa: BLE001
                warn(f"{k}: alter Spot-Stop ließ sich nicht löschen ({type(ex).__name__}) — er bleibt stehen.")
        elif res == "nichts":
            warn(f"{k}: {grund}, Verkauf abgelehnt ({_text(info)[:80]}) — der Spot-Stop bleibt stehen.")
            if o.get("isWorking") is not True:  # ein wirksamer Stop bleibt
                bleibt(o)
                d["jenseits_gehalten"] = True
            else:  # ein hängender schützt nicht: die nächste Runde versucht den Ausstieg nochmals, zum Schluss ein Not-Stop
                d["haengend_abgelehnt"] = (o.get("orderId"), m)
        # «nur_storno»: Stop weg, Verkauf abgelehnt → der Aufrufer verkauft die (jetzt freien) Coins bzw. setzt einen Not-Stop
        if res in ("nichts", "nur_storno", "unklar"):
            d["nur_ergaenzen"] = True  # auch in den weiteren Abgleich-Runden nicht mehr ersetzen
            break  # nach einer Ablehnung kein weiteres cancelReplace (der nächste Stop bliebe sonst womöglich auch weg)


def _haengenden_ersetzen(spot, k, d, st, o, m, kurs, warn, gesetzt):
    """Ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs (Kurslücke, er schützt nicht mehr) und Binance lehnte seinen Verkauf
    zum Markt eben ab: an seine Stelle einen Not-Stop über `m` Coins unter dem Kurs (5 %, sonst 10/20/35 %) — per cancelReplace,
    lehnt Binance den neuen ab, bleibt der hängende (nichts verloren). → True, wenn der Not-Stop steht."""
    sym, regeln = d["sym"], d["rs"]
    for f in (NOT_STOP_ABSTAND,) + BREITE_NOTSTOPS:
        p = kurs * (1 - f)
        if m * p < regeln["min_notional"]:
            break
        res, info = spot.ersetzen(sym, o["orderId"], spot.stop_params(sym, m, p, regeln, _kennung(CID_STOP_SPOT)))
        if res == "ok":
            st["spot"], st["p_long"] = info.get("orderId"), p
            gesetzt.append(f"Not-Stop {m:g} @ {PL.runde(p, regeln['tick']):g} statt des hängenden Stop-Limits")
            warn(f"{k}: der ausgelöste Stop-Limit hing über dem Kurs und Verkaufen geht gerade nicht — an seiner Stelle steht ein "
                 f"Not-Stop @ {PL.runde(p, regeln['tick']):g}. Bitte prüfen!")
            return True
        if res == "unklar":
            d["neue_runde"] = True  # die nächste Runde liest die Liste und gleicht ab
        if res != "nichts":
            break  # «nur_storno»: die Coins sind frei (der Aufrufer verkauft bzw. stoppt sie), «unklar»: nachlesen
    return False


def _spot_rest_sichern(spot, k, d, st, s, soll, p, warn, gesetzt):
    """Der alte Spot-Stop bleibt (Ersetzen abgelehnt oder unklar): freie Coins, die er nicht deckt, bekommen einen eigenen Stop
    dazu — nur aus freien Coins und höchstens Soll minus Gesperrtes, also nie doppelt über dieselben Coins."""
    sym, regeln, kurs = d["sym"], d["rs"], s["kurs"]
    menge = PL.runde(max(0.0, min(soll - s["gebunden"], s["frei"])), regeln["step"])
    if menge * min(p, kurs) < regeln["min_notional"]:
        return
    try:
        r, p_ok = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), [p, kurs * (1 - NOT_STOP_ABSTAND)],
                              _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
        gesetzt.append(f"Zusatz-Stop {menge:g} @ {PL.runde(p_ok, regeln['tick']):g}")
    except Exception as ex:  # noqa: BLE001
        warn(f"{k}: {menge:g} {d['coin']} ohne Stop — Zusatz-Stop abgelehnt ({type(ex).__name__}). Bitte sofort prüfen!")


def _spot_ohne_liste(spot, k, d, st, e, s, warn, gesetzt, gehandelt, ex):
    """Eigene Spot-Stops nicht lesbar: nichts stornieren (blind), aber den ungesicherten Rest trotzdem sichern — gesperrte Coins
    hält im Pilot-Konto ein eigener Stop, also nur min(Soll − gesperrt, frei) dazu. Nie ein Long ohne Stop, nur weil die
    Liste gerade nicht antwortet."""
    sym, regeln, kurs = d["sym"], d["rs"], s["kurs"]
    if s["gebunden"] > s["stop_spot"] + regeln["step"] / 2 and not s.get("beidseitig"):
        # mehr gesperrt als nötig: ein zu grosser alter Stop träfe die Absicherung — über seine ID (Buch) verkleinern bzw. löschen
        # (geht ohne Liste); geht das nicht, beidseitig sichern
        oid, ok = st.get("spot"), False
        if oid is not None:
            soll = PL.runde(s["stop_spot"], regeln["step"])
            p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
            if soll * min(p, kurs) >= regeln["min_notional"]:
                res, info = spot.ersetzen(sym, oid, spot.stop_params(sym, soll, p, regeln, _kennung(CID_STOP_SPOT)))
                if res == "ok":
                    st["spot"], st["p_long"] = info.get("orderId"), p
                    gesetzt.append(f"Stop {soll:g} @ {PL.runde(p, regeln['tick']):g}")
                    try:  # standen mehrere Stops (das Buch kennt nur einen), ist evtl. immer noch zu viel gesperrt
                        ok = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), d["coin"])[1] <= s["stop_spot"] + regeln["step"] / 2
                    except Exception:  # noqa: BLE001
                        ok = False
            else:
                try:
                    _nochmal(lambda: spot.abbrechen(sym, oid))
                    st["spot"] = None
                    try:  # standen mehrere Stops (das Buch kennt nur einen), ist evtl. immer noch zu viel gesperrt (Listen-Seed 302)
                        ok = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), d["coin"])[1] <= s["stop_spot"] + regeln["step"] / 2
                    except Exception:  # noqa: BLE001
                        ok = False
                except Exception:  # noqa: BLE001
                    pass
        if not ok:
            _zu_gross(d)
            warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — mehr {d['coin']} gesperrt als nötig: ein (unbekannter) alter "
                 "Stop träfe die Absicherung → beidseitig gesichert, die Nachkontrolle prüft nochmals.")
        return
    menge = PL.runde(max(0.0, min(s["stop_spot"] - s["gebunden"], s["frei"])), regeln["step"])
    if menge * kurs < regeln["min_notional"]:
        if s["stop_spot"] > 0 or st.get("spot") is not None or gehandelt:
            warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — die gesperrten {s['gebunden']:g} {d['coin']} gelten als "
                 "gesichert; ob ein alter Stop noch über der Ernte steht, ist offen. Bitte prüfen!")
        return
    p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
    try:
        r, p_ok = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), [p, kurs * (1 - NOT_STOP_ABSTAND)],
                              _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
        st["spot"], st["p_long"] = r.get("orderId"), p_ok
        gesetzt.append(f"Stop {menge:g} @ {PL.runde(p_ok, regeln['tick']):g}")
        warn(f"{k}: offene Spot-Stops nicht lesbar ({type(ex).__name__}) — {menge:g} {d['coin']} zusätzlich gesichert (gesperrte "
             f"{s['gebunden']:g} gelten als gesichert). Bitte prüfen!")
    except Exception as ex2:  # noqa: BLE001
        warn(f"{k}: offene Spot-Stops nicht lesbar und Stop abgelehnt ({type(ex2).__name__}) — {menge:g} {d['coin']} OHNE Stop, "
             "bitte sofort prüfen!")


def _spot_vorsorge(spot, k, d, st, e, s, warn, gesetzt):
    """Ein alter Perp-Stop hat während des Abgleichs ausgelöst und der Kontostand ist danach nicht lesbar: die Coins, deren
    Absicherung dadurch weg sein könnte, vorsorglich unter einen Spot-Stop — höchstens so viele, wie der neue Perp-Stop deckt
    (dann ist es in beiden Richtungen geschützt: fällt der Kurs, deckt der Perp-Stop den Rest-Short; steigt er, der Spot-Stop
    die Coins). Binance lehnt ab, was nicht (mehr) frei ist."""
    sym, regeln, kurs = d["sym"], d["rs"], s["kurs"]
    menge = PL.runde(max(0.0, min(s["frei"], d.get("perp_ausgeloest", 0.0), d.get("perp_neu", 0.0))), regeln["step"])
    if menge * kurs < regeln["min_notional"]:
        return
    p = _stop_preis(e.get("stop_long"), st.get("p_long"), kurs, +1)
    try:
        r, p_ok = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c), [p, kurs * (1 - NOT_STOP_ABSTAND)],
                              _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
        st["spot"], st["p_long"] = r.get("orderId"), p_ok
        gesetzt.append(f"Vorsorge-Stop {menge:g} @ {PL.runde(p_ok, regeln['tick']):g}")
        warn(f"{k}: ein alter Short-Stop hat ausgelöst, Kontostand danach nicht lesbar — {menge:g} {d['coin']} vorsorglich unter "
             "Spot-Stop. Bitte prüfen!")
    except Exception as ex:  # noqa: BLE001
        warn(f"{k}: Vorsorge-Stop abgelehnt ({type(ex).__name__}) — {menge:g} {d['coin']} evtl. OHNE Absicherung und Stop, "
             "bitte sofort prüfen!")


def _spot_raus(spot, k, d, st, menge, kurs, erg, warn, gesetzt, grund, lesen):
    """Long sofort zum Markt schliessen (statt eines Stops, der sofort auslösen würde). Was danach noch ungesichert ist
    (abgelehnt, nur teilweise ausgeführt): Not-Stop 5 % unter dem frischen Kurs."""
    sym, regeln, coin = d["sym"], d["rs"], d["coin"]
    try:
        frei = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)[0]
    except Exception:  # noqa: BLE001
        frei = menge
    m = PL.runde(min(menge, frei), regeln["step"])
    fehler, verkauft = None, 0.0
    if m * kurs >= regeln["min_notional"]:
        try:
            r = spot.markt(sym, "SELL", m)
            verkauft = abs(netto_coins(r, coin))
            erg["auftraege"].append((k, "spot", "SELL", verkauft))
            gesetzt.append(f"{grund} → {verkauft:g} {coin} verkauft")
        except Exception as ex:  # noqa: BLE001
            fehler = ex
            if isinstance(ex, BF.UnklarFehler) and d.get("merke_unklar"):
                d["merke_unklar"](unklar_eintrag(k, sym, "spot", "SELL", m, False, ex))
    try:
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
        rest = PL.runde(min(max(0.0, _soll(frei + gebunden, pos, kurs, d)["stop_spot"] - gebunden), frei), regeln["step"])
    except Exception:  # noqa: BLE001 — nicht lesbar: der unverkaufte Teil (Binance lehnt ab, falls er doch weg ist)
        rest = PL.runde(max(0.0, m - verkauft), regeln["step"])
    if rest * kurs < regeln["min_notional"]:
        return
    try:
        r, p = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, rest, preis, regeln, cid=c), [kurs * (1 - NOT_STOP_ABSTAND)],
                           _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
        st["spot"], st["p_long"] = r.get("orderId"), p
        gesetzt.append(f"Not-Stop {rest:g} @ {PL.runde(p, regeln['tick']):g}")
        if fehler or m * kurs >= regeln["min_notional"]:
            warn(f"{k}: {grund}, Verkauf {'abgelehnt (' + type(fehler).__name__ + ')' if fehler else 'unvollständig'} — Not-Stop 5 % unter dem Kurs gesetzt.")
        else:  # nichts zu verkaufen (der Rest liegt unter einem stehenden Stop) — die übrigen Coins sichert der Not-Stop
            warn(f"{k}: {grund} — Not-Stop 5 % unter dem Kurs über {rest:g} {coin} gesetzt (die übrigen liegen unter dem stehenden Stop).")
    except Exception as ex:  # noqa: BLE001
        warn(f"{k}: {grund}, Verkauf und Not-Stop abgelehnt ({type(ex).__name__}) — {rest:g} {coin} OHNE Stop, bitte sofort prüfen!")


def _perp_abgleich(fut, k, d, st, e, s, erg, warn, gesetzt, schutz, lesen, gehandelt):
    """Short-Seite: genau ein eigener Perp-Stop (Menge + reduceOnly) über den ungesicherten Short. Passender bleibt; sonst
    ZUERST den neuen setzen (der alte schützt bis dahin weiter; scheitert der neue Kurs: alter Kurs, dann Not-Stop) und erst
    danach die alten löschen. Lässt Binance gar keinen neuen zu, bleiben die alten stehen — nie ersatzlos löschen. Kurs schon
    über dem Stop-Kurs → Richtungs-Short sofort zurückkaufen. Löst dazwischen ein Börsen-Stop aus, ändert sich der
    Kontostand und der Abgleich läuft eine weitere Runde."""
    sym, regeln = d["sym"], d["rf"]
    soll, kurs, pos = s["stop_perp"], s["kurs"], s["pos"]
    try:
        alt = _nochmal(lambda: fut.eigene_stops(sym), SCHUTZ_WARTEN)
    except Exception as ex:  # noqa: BLE001
        _perp_ohne_liste(fut, k, d, st, e, s, warn, gesetzt, gehandelt, ex, erg, lesen)
        return
    if st.get("perp_weitere"):  # früher nicht löschbare alte Stops (gemerkt): die lesbare Liste zeigt, welche noch stehen — die
        _perp_weitere_pruefen(st, alt)  # löscht der Abgleich unten wie jeden alten Stop (nach dem neuen)
    if soll <= 0:
        if alt:  # verwaist (Position zu oder kleiner) — weg, damit er nie die Ernte trifft
            offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
            st["perp"] = offen.get("algoId") if offen else None
            if offen:
                st["perp_cid"] = offen.get("clientAlgoId")
                for a in alt[alt.index(offen):]:  # nicht gelöscht (der erste scheiterte, die übrigen nicht versucht) → merken
                    _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))
                _zu_gross(d)
            else:
                st["perp_cid"] = None
        return
    grenze = e.get("stop_short") or st.get("p_short")
    p = _stop_preis(e.get("stop_short"), st.get("p_short"), kurs, -1)
    p_r = PL.runde(p, regeln["tick"])
    jenseits = bool(grenze and kurs >= grenze)
    if (not jenseits and len(alt) == 1 and _gleich(alt[0].get("quantity"), soll, regeln["step"])
            and _gleich(alt[0].get("triggerPrice"), p_r, regeln["tick"])):
        st["perp"], st["perp_cid"], st["p_short"] = alt[0].get("algoId"), alt[0].get("clientAlgoId"), p
        schutz.append(f"Stop {soll:g} @ {p_r:g} bleibt")
        return
    if s.get("beidseitig") and not jenseits and alt and sum(float(a.get("quantity") or 0) for a in alt) >= soll - regeln["step"] / 2:
        schutz.append("Stops decken den ganzen Short")  # beidseitig: zu gross schadet nicht (die Coins haben ihren Spot-Stop)
        return
    p_alt = (float(alt[0].get("triggerPrice") or 0) if alt else 0.0) or st.get("p_short")

    def raus(grund):
        """Ausstieg zum Markt: ZUERST zurückkaufen (die alten Stops schützen bis dahin), erst danach die alten Stops weg (sie
        wären dann zu gross und träfen die Ernte). Lehnt Binance den Rückkauf ab, bleiben sie stehen (Rest: Not-Stop)."""
        try:
            frei, gebunden, pos2, kurs2 = lesen(SCHUTZ_WARTEN)
        except Exception:  # noqa: BLE001
            frei, gebunden, pos2, kurs2 = s["frei"], s["gebunden"], s["pos"], s["kurs"]
        soll2 = _soll(frei + gebunden, pos2, kurs2, d)["stop_perp"]
        if soll2 > 0:
            _perp_raus(fut, k, d, st, soll2, kurs2, erg, warn, gesetzt, grund, lesen, pos2, alt=alt)
        elif alt:  # nichts mehr ungesichert (ein Stop hat schon ausgelöst): die alten sind jetzt zu gross → weg
            offen = _alle_weg(alt, lambda a: fut.algo_abbrechen(sym, a.get("algoId")), k, "Perp", warn, schutz)
            st["perp"] = offen.get("algoId") if offen else None
            if offen:
                for a in alt[alt.index(offen):]:
                    _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))
                _zu_gross(d)
    if jenseits:
        raus(f"Kurs {kurs:g} schon über dem Stop {grenze:g}")
        return
    preise = [p] + ([p_alt] if p_alt and p_alt > kurs and not _gleich(p_alt, p, regeln["tick"]) else []) + [kurs * (1 + NOT_STOP_ABSTAND)]
    cid = _kennung(CID_STOP_PERP)
    try:
        r, p_ok = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", soll, preis, regeln["tick"], cid=c), preise, cid,
                              sofort_raus=True)
    except _Ausgeloest:
        raus(f"Stop {p_r:g} würde sofort auslösen (Kurs gestiegen)")
        return
    except Exception as ex:  # noqa: BLE001
        offen_short = PL.runde(abs(min(pos, 0.0)), regeln["step"])
        try:
            if not (_reduce_abgelehnt(ex) and regeln["step"] / 2 <= offen_short < soll - regeln["step"] / 2):
                raise
            # beidseitig: nimmt Binance keinen reduceOnly-Stop über mehr als den offenen Short, dann wenigstens den sichern
            cid = _kennung(CID_STOP_PERP)
            r, p_ok = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", offen_short, preis, regeln["tick"], cid=c), preise, cid)
            warn(f"{k}: Binance nimmt keinen reduceOnly-Stop über mehr als den offenen Short — Stop nur über {offen_short:g}; ein "
                 "unklarer Short hätte keinen Stop, bis er geklärt ist. Bitte im Binance-Konto prüfen!")
            soll = offen_short
        except Exception as ex2:  # noqa: BLE001
            # kam der neue Stop trotz Fehlermeldung an (Antwort verloren), stünden zwei — die über die Kennung löschen
            # (Löschen geht auch, wenn Binance gerade keine neuen Aufträge annimmt; unbekannt = nie angekommen)
            if not _kennung_weg(fut, sym, cid):
                _perp_merken(st, None, cid)
                d["beidseitig"], d["neue_runde"] = True, True
                warn(f"{k}: neuer Perp-Stop unklar und nicht löschbar — vielleicht stehen zwei; die Coins kommen ganz unter einen "
                     "Spot-Stop (beidseitig). Bitte prüfen!")
            if not alt:
                raise
            schutz.append("alter Stop bleibt")  # lieber ein alter Stop als keiner
            warn(f"{k}: neuer Perp-Stop abgelehnt ({type(ex2).__name__} {str(ex2)[:80]}) — der bisherige bleibt stehen. Bitte prüfen!")
            _perp_ueberzaehlige_weg(fut, k, sym, regeln, alt, soll, st, warn)
            try:
                bleibt = sum(float(a.get("quantity") or 0) for a in _nochmal(lambda: fut.eigene_stops(sym)))
            except Exception:  # noqa: BLE001
                bleibt = sum(float(a.get("quantity") or 0) for a in alt)
            if bleibt > soll + regeln["step"] / 2:
                # der bleibende ist grösser als der ungesicherte Short: löst er aus, kauft er auch die Absicherung zurück →
                # beidseitig (die Coins kommen ganz unter einen Spot-Stop), die Nachkontrolle korrigiert nochmals
                _zu_gross(d)
            return
    st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p_ok
    gesetzt.append(f"Stop {soll:g} @ {PL.runde(p_ok, regeln['tick']):g}")
    if p_ok != p:
        warn(f"{k}: neuer Perp-Stop {p_r:g} abgelehnt — " + ("der bisherige Stop-Kurs" if p_ok == p_alt else "ein Not-Stop 5 % über dem Kurs")
             + " ist gesetzt.")
    for a in alt:  # erst jetzt (der neue steht) die alten weg
        try:
            if not _nochmal(lambda a=a: fut.algo_abbrechen(sym, a.get("algoId"))):
                # war schon weg: hat ausgelöst (Short kleiner) → noch eine Abgleich-Runde; ist dann der Kontostand nicht lesbar,
                # kommen die Coins, die dadurch ungesichert sein könnten, vorsorglich unter einen Spot-Stop
                d["neue_runde"] = True
                d["perp_ausgeloest"] = d.get("perp_ausgeloest", 0.0) + float(a.get("quantity") or 0)
                d["perp_neu"] = soll
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: alter Perp-Stop ließ sich nicht löschen ({type(ex).__name__}) — zwei Stops stehen; die Coins kommen darum "
                 "ganz unter einen Spot-Stop (beidseitig), der nächste Lauf räumt auf. Bitte prüfen!")
            _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))  # auch bei unlesbarer Liste später wieder löschbar
            _zu_gross(d)
            d["neue_runde"] = True


def _kennung_weg(fut, sym, cid):
    """Perp-Stop über die eigene Kennung löschen (falls er trotz Fehlermeldung ankam). → True = sicher nicht (mehr) offen."""
    try:
        _nochmal(lambda: fut.algo_abbrechen_kennung(sym, cid))
        return True
    except Exception:  # noqa: BLE001
        return False


def _perp_merken(st, aid, cid):
    """Ein alter Perp-Stop liess sich nicht löschen (oder ein neuer kam vielleicht trotz Fehlermeldung an): im Buch merken. Das Buch
    kennt sonst nur EINEN Stop — bei unlesbarer Liste bliebe ein zweiter unbekannt (und zu gross) über der Absicherung stehen."""
    if aid is None and not cid:
        return
    weitere = [list(w) for w in st.get("perp_weitere") or []]
    if [aid, cid] not in weitere:
        weitere.append([aid, cid])
    st["perp_weitere"] = weitere


def _ist_aktuell(st, aid, cid):
    return (aid is not None and str(aid) == str(st.get("perp"))) or (bool(cid) and cid == st.get("perp_cid"))


def _perp_weitere_pruefen(st, liste):
    """Lesbare Liste: was dort nicht mehr steht, ist weg (aus dem Gedächtnis); was noch steht, löscht der normale Abgleich (zuerst
    den neuen setzen, dann die alten weg) — nie vorab."""
    weitere = [list(w) for w in st.get("perp_weitere") or []
               if any(str(a.get("algoId")) == str(w[0]) or (w[1] and a.get("clientAlgoId") == w[1]) for a in liste)]
    st["perp_weitere"] = weitere or None


def _perp_weitere_weg(fut, sym, st):
    """Gemerkte alte Perp-Stops jetzt löschen — über die Kennung (braucht keine Liste; «unbekannt» = schon weg), sonst über die ID.
    Nur aufrufen, wenn gerade kein Perp-Stop nötig ist oder NACHDEM der neue steht (nie Schutz wegnehmen, bevor der Ersatz steht);
    der aktuelle Stop (st["perp"]) wird hier nie gelöscht. → True, wenn keiner mehr offen sein kann."""
    rest = []
    for w in st.get("perp_weitere") or []:
        aid, cid = (list(w) + [None, None])[:2]
        if _ist_aktuell(st, aid, cid):
            continue
        try:
            if cid:
                _nochmal(lambda cid=cid: fut.algo_abbrechen_kennung(sym, cid))
            elif aid is not None:
                _nochmal(lambda aid=aid: fut.algo_abbrechen(sym, aid))
        except Exception:  # noqa: BLE001
            rest.append([aid, cid])
    st["perp_weitere"] = rest or None
    return not rest


def _perp_ueberzaehlige_weg(fut, k, sym, regeln, alt, soll, st, warn):
    """Kein neuer Perp-Stop möglich, aber mehrere alte stehen und decken zusammen mehr als den ungesicherten Short (lösen sie
    alle aus, kaufen sie die Ernte-Absicherung zurück): so viele behalten, wie zusammen in den Short passen (mindestens einen),
    die übrigen löschen — Löschen geht auch, wenn Binance gerade keine neuen Aufträge annimmt."""
    if len(alt) < 2 or sum(float(a.get("quantity") or 0) for a in alt) <= soll + regeln["step"] / 2:
        return
    behalten, gedeckt = [], 0.0
    for a in sorted(alt, key=lambda a: -float(a.get("quantity") or 0)):
        q = float(a.get("quantity") or 0)
        if gedeckt + q <= soll + regeln["step"] / 2:
            behalten.append(a)
            gedeckt += q
    if not behalten:
        behalten = [min(alt, key=lambda a: float(a.get("quantity") or 0))]  # keiner passt: der kleinste bleibt (lieber einer)
    for a in alt:
        if a in behalten:
            continue
        try:
            _nochmal(lambda a=a: fut.algo_abbrechen(sym, a.get("algoId")))
        except Exception as ex:  # noqa: BLE001
            _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))
            warn(f"{k}: überzähliger Perp-Stop ließ sich nicht löschen ({type(ex).__name__}) — bitte prüfen!")
    st["perp"], st["perp_cid"] = behalten[0].get("algoId"), behalten[0].get("clientAlgoId")
    warn(f"{k}: {len(alt) - len(behalten)} überzählige Perp-Stops gelöscht (zusammen träfen sie die Ernte-Absicherung).")


def _perp_ohne_liste(fut, k, d, st, e, s, warn, gesetzt, gehandelt, ex, erg, lesen):
    """Eigene Perp-Stops nicht lesbar: den Stop trotzdem setzen und ERST DANACH den bekannten alten (Buch: ID oder Kennung —
    auch wenn seine Antwort verloren ging) löschen; scheitert das Setzen, bleibt der alte stehen. Lässt sich der alte nicht
    löschen, stehen zwei → beidseitig (die Coins kommen ganz unter einen Spot-Stop)."""
    sym, regeln, soll, kurs = d["sym"], d["rf"], s["stop_perp"], s["kurs"]
    if soll <= 0 and st.get("perp_weitere") and not _perp_weitere_weg(fut, sym, st) and s["pos"] < 0:
        # kein Stop nötig, aber früher nicht löschbare alte Stops (gemerkt) lassen sich noch nicht löschen: sie könnten über der
        # Absicherung stehen
        _zu_gross(d)
        warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}), gemerkte alte Stops noch nicht löschbar — beidseitig "
             "gesichert, die Nachkontrolle prüft nochmals.")
    if soll <= 0:
        # kein ungesicherter Short: ein alter Perp-Stop wäre jetzt zu gross (löst er aus, kauft er die Ernte-Absicherung zurück →
        # Coins ohne Short und ohne Stop). Den bekannten über seine Kennung löschen (braucht keine Liste; «unbekannt» = schon
        # weg), sonst über die ID. Geht das nicht — oder wurde heute gehandelt, ohne dass das Buch einen kennt —: beidseitig
        # sichern und die Nachkontrolle versucht es nochmals.
        alt_id, alt_cid = st.get("perp"), st.get("perp_cid")
        short = s["pos"] < 0  # ohne Short ist ein alter Perp-Stop wirkungslos (reduceOnly)
        if alt_id is None and not alt_cid:
            if gehandelt and short:
                _zu_gross(d)
                warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) und das Buch kennt keinen alten — ob einer über der "
                     "Ernte-Absicherung steht, ist offen: beidseitig gesichert, die Nachkontrolle prüft nochmals.")
            return
        try:
            if alt_cid:
                _nochmal(lambda: fut.algo_abbrechen_kennung(sym, alt_cid))
            else:
                _nochmal(lambda: fut.algo_abbrechen(sym, alt_id))
        except Exception as ex2:  # noqa: BLE001
            _perp_merken(st, alt_id, alt_cid)
            if short:
                _zu_gross(d)
                warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}), der alte Stop ließ sich nicht löschen "
                     f"({type(ex2).__name__}) — er träfe die Ernte-Absicherung: beidseitig gesichert, die Nachkontrolle prüft nochmals.")
            else:
                warn(f"{k}: der alte Perp-Stop ließ sich nicht löschen ({type(ex2).__name__}) — ohne Short wirkungslos (reduceOnly).")
            return
        st["perp"] = st["perp_cid"] = None
        warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) — der bekannte alte Stop ist gelöscht (er träfe sonst die "
             "Ernte-Absicherung).")
        return
    alt_id, alt_cid = st.get("perp"), st.get("perp_cid")
    p = _stop_preis(e.get("stop_short"), st.get("p_short"), kurs, -1)
    cid = _kennung(CID_STOP_PERP)
    try:
        r, p_ok = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", soll, preis, regeln["tick"], cid=c),
                              [p, kurs * (1 + NOT_STOP_ABSTAND)], cid, sofort_raus=True, warten=SCHUTZ_WARTEN)
    except _Ausgeloest:  # der Kurs ist seit dem Lesen über den Stop-Kurs gestiegen: zum Markt aussteigen wie mit Liste
        _perp_ohne_liste_raus(fut, k, d, st, s, erg, warn, gesetzt, lesen,
                              f"Stop {PL.runde(p, regeln['tick']):g} würde sofort auslösen (Kurs gestiegen)")
        return
    except Exception as ex2:  # noqa: BLE001
        if not _kennung_weg(fut, sym, cid):
            _perp_merken(st, None, cid)
            d["beidseitig"], d["neue_runde"] = True, True
        warn(f"{k}: offene Perp-Stops nicht lesbar und Stop abgelehnt ({type(ex2).__name__}) — "
             + ("der bisherige bleibt stehen" if alt_id is not None or alt_cid else f"Short {soll:g} evtl. OHNE Stop")
             + ", bitte sofort prüfen!")
        return
    st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p_ok
    gesetzt.append(f"Stop {soll:g} @ {PL.runde(p_ok, regeln['tick']):g}")
    weg = alt_id is None and not alt_cid
    if not weg:
        try:
            if alt_id is not None:
                fut.algo_abbrechen(sym, alt_id)
            else:
                fut.algo_abbrechen_kennung(sym, alt_cid)
            weg = True
        except Exception:  # noqa: BLE001
            _perp_merken(st, alt_id, alt_cid)  # zwei stehen: den alten merken — sonst bliebe er bei unlesbarer Liste unbekannt
            _zu_gross(d)
            d["neue_runde"] = True
    if st.get("perp_weitere") and not _perp_weitere_weg(fut, sym, st):  # der neue steht: jetzt auch die gemerkten alten weg
        _zu_gross(d)
        weg = False
    warn(f"{k}: offene Perp-Stops nicht lesbar ({type(ex).__name__}) — Stop {soll:g} trotzdem gesetzt"
         + ("" if weg else "; der alte ließ sich nicht löschen (zwei stehen → Coins beidseitig gesichert)") + ". Bitte prüfen!")


def _perp_ohne_liste_raus(fut, k, d, st, s, erg, warn, gesetzt, lesen, grund):
    """Liste nicht lesbar, der Kurs schon über dem Stop-Kurs: wie mit Liste zum Markt aussteigen. Die alten Stops kennt nur das
    Buch (ID oder Kennung, dazu die gemerkten) — sie schützen bis zum Rückkauf und kommen erst danach weg (dann wären sie zu
    gross); lehnt Binance den Rückkauf ab, erst ein passender Not-Stop, dann die alten weg (wie _perp_raus)."""
    weitere = [(list(w) + [None, None])[:2] for w in st.get("perp_weitere") or []]
    alt = [{"algoId": a, "clientAlgoId": c} for a, c in [(st.get("perp"), st.get("perp_cid"))]
           + [w for w in weitere if not _ist_aktuell(st, *w)] if a is not None or c]
    try:
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
    except Exception:  # noqa: BLE001 — nicht lesbar: der Stand von vorhin
        frei, gebunden, pos, kurs = s["frei"], s["gebunden"], s["pos"], s["kurs"]
    soll = _soll(frei + gebunden, pos, kurs, d)["stop_perp"]
    if soll > 0:
        _perp_raus(fut, k, d, st, soll, kurs, erg, warn, gesetzt, grund, lesen, pos, alt=alt)
        return
    if alt:  # nichts mehr ungesichert (ein Stop hat schon ausgelöst): die alten wären jetzt zu gross → weg
        offen = _alle_weg(alt, lambda a: _perp_alt_weg(fut, d["sym"], st, a), k, "Perp", warn, [])
        st["perp"], st["perp_cid"] = (offen.get("algoId"), offen.get("clientAlgoId")) if offen else (None, None)
        if offen:
            for a in alt[alt.index(offen) + 1:]:
                _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))
            _zu_gross(d)


def _perp_alt_weg(fut, sym, st, a):
    """Einen alten Perp-Stop löschen — über die ID, fehlt sie (Antwort verloren), über die Kennung («unbekannt» = schon weg).
    Gelöscht → auch aus dem Gedächtnis (perp_weitere). → wie fut.algo_abbrechen (False = war schon weg)."""
    aid, cid = a.get("algoId"), a.get("clientAlgoId")
    if aid is not None:
        r = fut.algo_abbrechen(sym, aid)
    else:
        fut.algo_abbrechen_kennung(sym, cid)
        r = True
    if st.get("perp_weitere"):
        st["perp_weitere"] = [w for w in st["perp_weitere"]
                              if not ((aid is not None and str(w[0]) == str(aid)) or (cid and w[1] == cid))] or None
    return r


def _perp_raus(fut, k, d, st, menge, kurs, erg, warn, gesetzt, grund, lesen, pos=None, alt=()):
    """Richtungs-Short sofort zurückkaufen (reduceOnly, höchstens die offene Position). Die alten Stops (alt) schützen bis dahin
    und werden erst NACH dem Rückkauf gelöscht (sie wären dann zu gross); lehnt Binance den Rückkauf ab, bleiben sie stehen.
    Danach nachlesen: was noch ungesichert ist (nur teilweise ausgeführt, unklar), bekommt einen Not-Stop 5 % über dem Kurs."""
    fehler = None
    kauf = PL.runde(min(menge, abs(min(pos, 0.0))) if pos is not None else menge, d["rf"]["step"])
    if kauf >= d["rf"]["step"] / 2:
        try:
            r = fut.auftrag(d["sym"], "BUY", kauf, True) or {}
            erg["auftraege"].append((k, "perp", "BUY", float(r.get("executedQty") or kauf)))
            gesetzt.append(f"{grund} → Short {float(r.get('executedQty') or kauf):g} zurückgekauft")
        except Exception as ex:  # noqa: BLE001
            fehler = ex
            if isinstance(ex, BF.UnklarFehler) and d.get("merke_unklar"):  # kann verspätet ankommen → Buch, beidseitig
                d["merke_unklar"](unklar_eintrag(k, d["sym"], "perp", "BUY", kauf, True, ex))
    if alt and fehler is not None and not isinstance(fehler, BF.UnklarFehler):
        # Rückkauf abgelehnt: die alten Stops schützen weiter. Passen sie nicht mehr zur Lage (z. B. inzwischen Coins gekauft →
        # sie träfen die Absicherung), zuerst einen passenden Not-Stop setzen, dann die alten löschen — nie ersatzlos
        try:
            frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
            rest = _soll(frei + gebunden, pos, kurs, d)["stop_perp"]
        except Exception:  # noqa: BLE001
            rest = None
        bekannt = all(a.get("quantity") is not None for a in alt)  # ohne Liste (nur Buch) ist die Menge der alten unbekannt
        if rest is None or (bekannt and abs(sum(float(a.get("quantity") or 0) for a in alt) - rest) <= d["rf"]["step"] / 2):
            warn(f"{k}: {grund}, Rückkauf abgelehnt ({type(fehler).__name__}) — der bisherige Stop bleibt stehen. Bitte prüfen!")
            return
        if rest >= d["rf"]["step"] / 2 and not _perp_notstop(fut, k, d, st, rest, kurs, warn, gesetzt,
                                                            f"{grund}, Rückkauf abgelehnt ({type(fehler).__name__})"):
            _zu_gross(d)  # kein passender Stop möglich: die alten bleiben (lieber zu gross als keiner) → beidseitig
            return
        offen = _alle_weg(alt, lambda a: _perp_alt_weg(fut, d["sym"], st, a), k, "Perp", warn, [])
        if offen:
            for a in alt[alt.index(offen):]:
                _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))
            _zu_gross(d)
        return
    for a in alt:  # Rückkauf ausgeführt (oder unklar → beidseitig): die alten Stops wären jetzt zu gross
        try:
            _nochmal(lambda a=a: _perp_alt_weg(fut, d["sym"], st, a))
        except Exception as ex:  # noqa: BLE001
            warn(f"{k}: alter Perp-Stop ließ sich nach dem Rückkauf nicht löschen ({type(ex).__name__}) — die Coins kommen ganz unter "
                 "einen Spot-Stop (beidseitig). Bitte prüfen!")
            _perp_merken(st, a.get("algoId"), a.get("clientAlgoId"))
            _zu_gross(d)
            d["neue_runde"] = True
    if alt:
        st["perp"] = st["perp_cid"] = None
    try:
        frei, gebunden, pos, kurs = lesen(SCHUTZ_WARTEN)
        rest = _soll(frei + gebunden, pos, kurs, d)["stop_perp"]
    except Exception:  # noqa: BLE001
        rest = menge  # nicht prüfbar → vorsichtshalber schützen (reduceOnly: ohne Position harmlos)
    if rest < d["rf"]["step"] / 2:
        return
    grund2 = (f"{grund}, Rückkauf unklar (kommt er noch an, ist der Markt beidseitig gesichert)" if isinstance(fehler, BF.UnklarFehler)
              else f"{grund}, Rückkauf {'abgelehnt (' + type(fehler).__name__ + ')' if fehler else 'unvollständig'}")
    _perp_notstop(fut, k, d, st, rest, kurs, warn, gesetzt, grund2)


def _perp_notstop(fut, k, d, st, menge, kurs, warn, gesetzt, grund):
    """Not-Stop 5 % über dem Kurs über `menge`. → True, wenn er steht."""
    cid = _kennung(CID_STOP_PERP)
    try:
        r, p = _setze_stop(lambda preis, c: fut.stop_menge(d["sym"], "BUY", menge, preis, d["rf"]["tick"], cid=c),
                           [kurs * (1 + NOT_STOP_ABSTAND)], cid, warten=SCHUTZ_WARTEN)
        st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p
        gesetzt.append(f"Not-Stop {menge:g} @ {PL.runde(p, d['rf']['tick']):g}")
        warn(f"{k}: {grund} — Not-Stop 5 % über dem Kurs gesetzt.")
        return True
    except Exception as ex:  # noqa: BLE001
        if not _kennung_weg(fut, d["sym"], cid):  # kam er trotz Fehlermeldung an? Dann nie zwei über denselben Short
            d["beidseitig"], d["neue_runde"] = True, True
        warn(f"{k}: {grund}, Not-Stop abgelehnt ({type(ex).__name__}) — Short {menge:g} OHNE Stop, bitte sofort prüfen!")
        return False


def _stop_preis(signal, frueher, kurs, seite):
    """Gültiger Stop-Kurs für long (seite +1, unter dem Kurs) bzw. short (−1, über dem Kurs): zuerst der des Signals, sonst
    der zuletzt benutzte, sonst ein Ersatz 5 % vom Kurs — nie eine Position ohne Stop, nur weil der Kurs fehlt."""
    for p in (signal, frueher):
        if p and (p < kurs if seite > 0 else p > kurs):
            return float(p)
    return kurs * (1 - NOT_STOP_ABSTAND * seite)


# ───────────────────────── Nachkontrolle ─────────────────────────
def nachkontrolle(env=None, datei=None, spot=None, fut=None, schlafen=time.sleep, uhr=time.time):
    """Nach einem Lauf oder Not-Aus, wenn etwas offen blieb: unklare Aufträge (Antwort verloren, Binance kennt den Auftrag noch
    nicht), Märkte ohne vollständigen Stop (schutz_offen) oder ein unvollständiger Not-Aus (notaus_offen). Alle
    NACHKONTROLLE_TAKT_S nachsehen, höchstens NACHKONTROLLE_MAX_S (10 Minuten + Reserve):
      • normal: kommt ein unklarer Auftrag an (oder ist er geklärt), sofort die Stops nach dem Kontostand setzen — ein verspätet
        angekommener Kauf liegt so höchstens einen Takt ohne Stop; fehlende Stops werden nochmals versucht.
      • Not-Aus aktiv: in JEDEM Takt nochmals schliessen (was verspätet ankam, was eben noch abgelehnt wurde) — nie erst auf
        alle unklaren Aufträge warten; auch ohne «Not-Aus offen», sobald Pilot 2.0 Bestand hat (STOP kam während eines Laufs).
      • Erscheint STOP während der Nachkontrolle: sofort einmal schliessen und enden (der Not-Aus von stop.bat bekommt die Sperre).
    Speichert nur, wenn das Buch auf der Platte noch so ist, wie sie es zuletzt gesehen hat (sonst hat ein anderer Lauf — z. B.
    ein Not-Aus ohne Sperre — es geändert: dann nichts überschreiben und enden). Ohne Offenes: sofort fertig."""
    env_ = os.environ if env is None else env
    datei = datei or BESTAND
    cfg = einstellungen(env_)
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": cfg["modus"], "alles_zu": None}

    def warn(t):
        erg["warnung"] = True
        erg["zeilen"].append("⚠️ " + t)

    def not_aus():
        return cfg["stop"] or env_.get("KI_BOT_STOP", "") == "1" or BF.STOP_DATEI.exists()
    if cfg["fehler"]:
        warn(f"Nachkontrolle Pilot 2.0: {cfg['fehler']} Nichts geprüft — bitte im Binance-Konto nachsehen!")
        return erg
    try:
        buch = buch_lesen(datei, cfg["modus"])
        # Not-Aus aktiv und Pilot 2.0 hat Bestand: immer schliessen — auch ohne «Not-Aus offen» (STOP kam z. B. während eines
        # Tageslaufs, nachdem er seine Aufträge schon hinter sich hatte; das Cockpit hat Pilot 2.0 dann übersprungen)
        aus_mit_bestand = not_aus() and bool(modi_mit_bestand(datei))
    except BuchKaputt as ex:
        warn(f"Nachkontrolle Pilot 2.0: {ex} — nichts geprüft.")
        return erg
    if not buch.get("unklar") and not buch.get("schutz_offen") and not (not_aus() and (buch.get("notaus_offen") or aus_mit_bestand)):
        return erg
    if not (cfg["spot"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["key"] and cfg["futures"]["secret"]):
        warn("Nachkontrolle Pilot 2.0: unklare Aufträge oder fehlende Stops, aber keine Schlüssel — bitte im Binance-Konto prüfen!")
        return erg
    spot = spot or Spot(cfg["spot"])
    fut = fut or Fut(cfg["futures"])
    gesehen, fremd = [json.dumps(buch, sort_keys=True)], [False]

    def fremd_geaendert():
        """Hat ein anderer Lauf (Not-Aus ohne Sperre?) das Buch inzwischen geändert? Dann nichts mehr tun, nichts überschreiben."""
        if not fremd[0]:
            try:
                jetzt = json.dumps(buch_lesen(datei, cfg["modus"]), sort_keys=True)
            except BuchKaputt:
                jetzt = None
            if jetzt != gesehen[0]:
                fremd[0] = True
                warn("Nachkontrolle Pilot 2.0: das Buch wurde inzwischen von einem anderen Lauf geändert (Not-Aus?) — nichts "
                     "überschrieben, Nachkontrolle beendet.")
        return fremd[0]

    def speichern():
        import sperre
        try:  # vergleichen und schreiben unter EINER Sperre — dazwischen kann kein anderer Lauf schreiben
            with _buch_sperre(datei):
                if fremd_geaendert():
                    return
                _buch_schreiben_roh(datei, cfg["modus"], buch)
                gesehen[0] = json.dumps(buch_lesen(datei, cfg["modus"]), sort_keys=True)
        except (OSError, BuchKaputt, sperre.Besetzt) as ex:
            warn(f"Buch nicht gespeichert ({type(ex).__name__}).")
    if cfg["echtgeld"]:
        try:
            uid = _nochmal(spot.konto).get("uid")
        except Exception:  # noqa: BLE001
            uid = None
        if not uid or str(uid) != str(buch.get("uid")):
            warn("Nachkontrolle Pilot 2.0: Schlüssel zeigt nicht nachweislich auf das Pilot-Konto — nichts angefasst. Bitte prüfen!")
            return erg

    betroffen = set()

    def maerkte():
        """Märkte mit Offenem — auch die, deren unklarer Auftrag eben geklärt wurde (gerade die brauchen jetzt ihre Stops)."""
        betroffen.update(m for m in COINS if any(u.get("markt") == m for u in buch["unklar"]) or m in buch.get("schutz_offen", []))
        return [m for m in COINS if m in betroffen]
    maerkte()

    def stops_setzen():
        """Stops der betroffenen Märkte nach dem Kontostand (noch Unklares: beidseitig)."""
        daten, ents, mm = {}, [], maerkte()
        for m in mm:
            sym, coin = COINS[m]
            try:
                daten[m] = {"sym": sym, "coin": coin, "kurs": _nochmal(lambda sym=sym: spot.kurs(sym)),
                            "rs": _nochmal(lambda sym=sym: spot.regeln2(sym)), "rf": _nochmal(lambda sym=sym: fut.regeln(sym)),
                            "unklar_sell": unklar_sell(buch, m), "nur_ergaenzen": True}
                ents.append({"markt": m, "z": 0.0})
            except Exception as ex:  # noqa: BLE001
                warn(f"Nachkontrolle {m}: Markt nicht lesbar ({type(ex).__name__}) — Stops nicht geprüft, bitte prüfen!")
        if ents:
            _stops_setzen(spot, fut, buch, speichern, ents, daten, 0.0, erg, warn, frozenset(mm))

    def schliessen():
        """Not-Aus: alles schliessen, was geht (er klärt zuerst die unklaren Aufträge). → Ergebnis; das Buch neu laden."""
        r = notaus_alle(env_, datei, spot=spot, fut=fut, protokolliere=protokoll_schreiben, wiederholung=True)
        try:
            buch.clear()
            buch.update(buch_lesen(datei, cfg["modus"]))
            gesehen[0] = json.dumps(buch, sort_keys=True)
        except BuchKaputt:
            fremd[0] = True
        return r

    def warte(sekunden):
        """Schlafen in kleinen Schritten — erscheint STOP, sofort weiter (dann wird geschlossen)."""
        bis = uhr() + sekunden
        while uhr() < bis and (aus_start or not not_aus()):
            schlafen(min(2.0, max(0.0, bis - uhr())))
    aus_start = not_aus()
    start, letzte = uhr(), None
    while not fremd_geaendert():
        if not_aus():  # Not-Aus aktiv: in jedem Takt schliessen, was geht (Unklares klärt er zuerst)
            letzte = schliessen()
            if letzte.get("alles_zu") or not aus_start or (not buch.get("unklar") and not buch.get("notaus_offen")):
                break  # alles zu — oder STOP kam erst während der Nachkontrolle: der Not-Aus von stop.bat übernimmt
        else:
            if unklare_klaeren(fut, buch, lambda t: None, erg["zeilen"], spot=spot):
                speichern()
                if not fremd[0]:
                    stops_setzen()  # sofort: ein verspätet angekommener Auftrag hat jetzt seine Stops
            elif buch.get("schutz_offen") and not fremd_geaendert():
                stops_setzen()  # im Lauf fehlte ein Stop (Binance lehnte ab, Konto nicht lesbar) → nochmals versuchen
            if not buch["unklar"] and not buch.get("schutz_offen"):
                break
        if uhr() - start >= NACHKONTROLLE_MAX_S:
            break
        warte(NACHKONTROLLE_TAKT_S)
    if letzte is not None:  # Not-Aus-Modus: das Ergebnis des letzten Schliessens melden
        letzte["zeilen"] = erg["zeilen"] + letzte["zeilen"]
        letzte["warnung"] = letzte["warnung"] or erg["warnung"]
        return letzte
    if fremd[0]:
        return erg
    for u in buch["unklar"]:
        warn(f"{u.get('markt')} {'Spot' if u.get('konto') == 'spot' else 'Perp'} {u.get('seite')} {u.get('menge')}: nach der "
             "Nachkontrolle noch immer unklar — Markt bleibt beidseitig gesichert. Bitte im Binance-Konto prüfen!")
    stops_setzen()
    try:
        buch["perp_offen"] = any(_nochmal(lambda m=m: fut.position_info(COINS[m][0]))[0] != 0 for m in COINS)
    except Exception:  # noqa: BLE001
        pass
    speichern()
    if buch.get("schutz_offen"):
        warn(f"Nachkontrolle Pilot 2.0: {', '.join(buch['schutz_offen'])} weiterhin nicht vollständig gesichert (Stop fehlt oder "
             "abgelehnt) — bitte sofort im Binance-Konto prüfen!")
    erg["zeilen"].insert(0, "Nachkontrolle Pilot 2.0: geklärt, Stops nach dem Kontostand gesetzt." if not buch["unklar"]
                         and not buch.get("schutz_offen") else "Nachkontrolle Pilot 2.0: ⚠️ nicht alles geklärt/gesichert.")
    return erg


# ───────────────────────── Not-Aus ─────────────────────────
def notaus_alle(env=None, datei=None, trocken=False, spot=None, fut=None, protokolliere=None, wiederholung=False):
    """Jeden GESTARTETEN Modus schliessen, mit den Schlüsseln DIESES Modus — egal wie die Freigabe-Schalter gerade stehen.
    «alles_zu» nur, wenn jeder Modus nachgeprüft zu ist. wiederholung: automatischer Versuch der Nachkontrolle — ein Paar, dessen
    Short-Rückkauf eben abgelehnt wurde, bleibt dann stehen (PAAR_PAUSE_MS); ein von Hand ausgelöster Not-Aus versucht es immer."""
    env = os.environ if env is None else env
    datei = datei or BESTAND
    kaputt = None
    try:
        modi = modi_mit_bestand(datei)
    except BuchKaputt as ex:
        kaputt, modi = str(ex), []
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "kapital": None, "plan": {}, "modus": ",".join(modi) or None, "alles_zu": True}
    if kaputt:
        erg.update(alles_zu=False, warnung=True)
        erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0: {kaputt} — Bestand unbekannt, NICHT «alles zu». Datei prüfen/wiederherstellen!")
    if FREIGEGEBEN and env.get("PILOT2_API_KEY") and "echt" not in modi:
        # Buch weg/kaputt: Pilot-Konto trotzdem ansehen — nie «nichts offen» melden, ohne zu schauen. Nur ansehen, nichts tun.
        try:
            cfg = einstellungen(env, modus="echt")
            s_, f_ = spot or Spot(cfg["spot"]), fut or Fut(cfg["futures"])
            konto, funde = _nochmal(s_.konto), []
            for m_, (sym, coin) in COINS.items():
                pos = _nochmal(lambda sym=sym: f_.position_info(sym))[0]
                menge = sum(bestand(konto, coin))
                if pos:
                    funde.append(f"Futures {sym} {pos:+g}")
                if menge * _nochmal(lambda sym=sym: s_.kurs(sym)) >= STAUB_USDT:
                    funde.append(f"{menge:g} {coin}")
            if funde:
                erg.update(alles_zu=False, warnung=True)
                erg["zeilen"].append("⚠️ Not-Aus Pilot 2.0 (echt): Pilot-Konto zeigt " + ", ".join(funde)
                                     + ", das Buch kennt es nicht — NICHTS automatisch verkauft. Bitte im Binance-Konto prüfen!")
        except Exception as ex:  # noqa: BLE001
            erg.update(alles_zu=False, warnung=True)
            erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 (echt): Konto nicht prüfbar ({type(ex).__name__}) — bitte im Binance-Konto prüfen!")
    if not modi:
        if erg["alles_zu"]:
            erg["zeilen"].append("Not-Aus Pilot 2.0: nichts offen.")
        return erg
    for m in modi:
        cfg = einstellungen(env, modus=m)
        if not (cfg["spot"]["key"] and cfg["futures"]["key"] and cfg["spot"]["secret"] and cfg["futures"]["secret"]):
            erg["alles_zu"] = False
            erg["warnung"] = True
            erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 ({m}): gestartet, aber Schlüssel fehlen — NICHT geschlossen. "
                                 + ("PILOT2_API_KEY/SECRET setzen" if m == "echt" else "Testnetz-Schlüssel setzen") + " und Not-Aus wiederholen!")
            continue
        s = spot if spot is not None else Spot(cfg["spot"])
        f = fut if fut is not None else Fut(cfg["futures"])
        if m == "testnetz" and not trocken and _testnetz_schluessel_falsch(s, f):
            # Spielgeld: passen die Schlüssel nicht mehr zum Testnetz (z. B. echte Schlüssel in BINANCE_*), wäre der Not-Aus
            # für immer blockiert — und der alte Pilot gesperrt. Den Testnetz-Stand verwerfen statt ewig zu scheitern.
            try:
                buch_schreiben(datei, m, leer_buch())
                erg["zeilen"].append("ℹ️ Not-Aus Pilot 2.0 (testnetz): Die Schlüssel passen nicht (mehr) zum Testnetz — der "
                                     "Testnetz-Stand (Spielgeld) ist verworfen, er sperrt nichts mehr.")
            except (OSError, BuchKaputt) as ex:
                erg.update(alles_zu=False, warnung=True)
                erg["zeilen"].append(f"⚠️ Not-Aus Pilot 2.0 (testnetz): Schlüssel passen nicht, Buch nicht änderbar ({type(ex).__name__}).")
            continue
        b0 = buch_lesen(datei, m)
        gesehen = [json.dumps(b0, sort_keys=True)]  # Stand beim Lesen: hat ihn ein anderer Lauf geändert → zusammenführen
        r = _notaus(s, f, b0, lambda b, m=m, gesehen=gesehen: _buch_speichern_zusammen(datei, m, gesehen, b), m, trocken,
                    wiederholung)
        erg["zeilen"] += r["zeilen"]
        erg["auftraege"] += r["auftraege"]
        erg["warnung"] = erg["warnung"] or r["warnung"]
        erg["alles_zu"] = None if trocken else (erg["alles_zu"] and r["alles_zu"])
    if not trocken and erg["alles_zu"]:
        try:  # kein Modus mehr gestartet → Datei weg (krypto-auto.bat startet den Pilot nur, solange sie existiert) — unter der
            #     Buch-Sperre, damit nie die Einträge eines gleichzeitig laufenden Not-Aus mitgelöscht werden
            with _buch_sperre(datei):
                if not modi_mit_bestand(datei):
                    Path(datei).unlink(missing_ok=True)
        except Exception:  # noqa: BLE001 — Sperre besetzt, Datei kaputt oder gesperrt: dann bleibt sie (sicher)
            pass
    if protokolliere and not trocken:
        protokolliere({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": erg["modus"], "notaus": True,
                       "auftraege": erg["auftraege"], "alles_zu": erg["alles_zu"]})
    return erg


def _testnetz_schluessel_falsch(spot, fut):
    """Lehnt das Testnetz die Schlüssel ab (401, −2014, −2015, −2008, −1022)? Netzfehler zählen NICHT (dann normaler Not-Aus)."""
    for lesen in (spot.konto, fut.konto):
        try:
            _nochmal(lesen)
        except Exception as ex:  # noqa: BLE001
            if _auth_fehler(ex):
                return True
    return False


def _notaus(spot, fut, buch, speichern_b, modus, trocken, wiederholung=False):
    erg = {"zeilen": [], "auftraege": [], "warnung": False, "alles_zu": True}

    def warn(t):
        erg["warnung"] = True
        erg["zeilen"].append("⚠️ " + t)

    def speichern():
        """→ True, wenn ein anderer Lauf das Buch inzwischen geändert hatte und zusammengeführt wurde."""
        try:
            return bool(speichern_b(buch))
        except (OSError, BuchKaputt) as ex:
            warn(f"Buch nicht gespeichert ({type(ex).__name__}).")
            return False
    if trocken:
        erg["alles_zu"] = None
        erg["zeilen"].append(f"🛑 Not-Aus Pilot 2.0 ({modus}): Probelauf — nichts geschlossen (würde BTC und ETH schliessen).")
        return erg
    if modus == "echt":  # NIE in einem anderen Konto handeln als dem, in dem Pilot 2.0 gestartet ist
        try:
            uid = _nochmal(spot.konto).get("uid")
        except Exception:  # noqa: BLE001
            uid = None
        if not uid or not buch.get("uid") or str(uid) != str(buch["uid"]):
            erg["alles_zu"] = False
            warn(f"Not-Aus Pilot 2.0 (echt): Schlüssel zeigt nicht nachweislich auf das Pilot-Konto (UID {uid}, beim Start "
                 f"{buch.get('uid')}) — NICHTS angefasst. Den Schlüssel des Pilot-Unterkontos setzen und Not-Aus wiederholen!")
            erg["zeilen"].insert(0, f"🛑 Not-Aus Pilot 2.0 ({modus}): ⚠️ NICHT ALLES GESCHLOSSEN!")
            return erg
    if buch.get("unklar"):  # unklare Aufträge zuerst klären (offen → stornieren); was dann noch unklar ist, verhindert «alles zu»
        unklare_klaeren(fut, buch, warn, erg["zeilen"], spot=spot)
    ungeschuetzt = []  # Märkte, auf denen der Schutz nicht vollständig steht (→ nie «beidseitig gesichert» melden)
    ungeprueft = []  # Märkte, deren Lage (oder Kurs) nicht lesbar war — ihr Schutz ist nicht geprüft
    for k, (sym, coin) in COINS.items():
        st = buch["stops"].setdefault(k, {})
        try:  # 0) die ganze Lage lesen, BEVOR etwas angefasst wird — nicht lesbar: nichts anfassen (Stops + Absicherung bleiben)
            pos = _nochmal(lambda: fut.position_info(sym))[0]
            regeln = _nochmal(lambda: spot.regeln2(sym))
            frei, gebunden = bestand(_nochmal(spot.konto), coin)
            fstep = _nochmal(lambda: fut.regeln(sym))["step"] if pos else 0.0
        except Exception as ex:  # noqa: BLE001
            erg["alles_zu"] = False
            ungeprueft.append(k)
            warn(f"Not-Aus {modus} {k}: Lage nicht lesbar ({type(ex).__name__}) — NICHTS angefasst (Stops und Absicherung bleiben). "
                 "Not-Aus wiederholen!")
            continue
        try:
            kurs = _kurs_oder_mark(spot, fut, sym)  # Spot-Ticker gesperrt → Futures-Markpreis
            st["kurs"] = kurs
        except Exception as ex:  # noqa: BLE001
            if st.get("kurs"):
                # zuletzt bekannter Kurs: Stops dazu werden notfalls weit gesetzt; würden sie sofort auslösen, schliesst der Schutz
                # zum Markt (das braucht keinen Kurs) — besser als gar keinen Schutz
                kurs = float(st["kurs"])
                warn(f"Not-Aus {modus} {k}: kein Kurs lesbar ({type(ex).__name__}) — weiter mit dem zuletzt bekannten Kurs {kurs:g}.")
            else:  # ohne Kurs keine Stops: nur das Ungesicherte zum Markt schliessen
                erg["alles_zu"] = False
                if not _notaus_ohne_kurs(spot, fut, k, sym, coin, pos, frei, gebunden, fstep, erg, warn, modus, buch, ex):
                    ungeprueft.append(k)
                continue
        pos_vor = pos
        # Ein Paar (Coins + Short gleicher Menge) ist abgesichert — es wird zuletzt aufgelöst, und so, dass nie ein Bein ohne das
        # andere übrig bleibt: zuerst die UNGESICHERTEN Teile (Short über die Coins hinaus, dann Coins über den Short hinaus),
        # danach die Paar-Coins verkaufen und erst dann den Short auf die verbliebenen Coins zurückkaufen. Geht Verkaufen gerade
        # nicht, bleibt das Paar stehen (netto 0); scheitert der Rückkauf eindeutig, werden die Coins zurückgekauft.
        # Die Coins sichert der Short auf den NÄCHSTEN ganzen Futures-Schritt ab — so bleibt in jeder Richtung höchstens ein halber
        # Schritt übrig, und der Not-Aus erzeugt nie eine neue ungesicherte Position (Staub-Coins sichern nichts ab)
        # Staub-Coins (unter dem Binance-Minimum, unverkäuflich) sichern nichts ab: der Short darf dann ganz zurück
        verkaufbar0 = PL.runde(frei + gebunden, regeln["step"]) * kurs >= regeln["min_notional"]
        paar = min(-pos, _schritte(frei + gebunden, fstep)) if pos < 0 and verkaufbar0 else 0.0
        ueber = PL.runde(-pos - paar, fstep) if pos < 0 else 0.0  # Short über die Coins hinaus
        if pos:  # 1) Perpetual: der ungesicherte Teil (ein Long-Perp ganz) — sein Stop bleibt bis dahin stehen
            seite, r, unklar_ex = ("BUY" if pos < 0 else "SELL"), None, None
            menge1 = ueber if pos < 0 else abs(pos)
            if menge1 >= fstep / 2:
                try:
                    try:
                        r = fut.auftrag(sym, seite, menge1, True)
                    except BF.BinanceFehler as ex:
                        if ex.code not in (418, 429):
                            raise
                        time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)  # Rate-Limit: sicher nicht ausgeführt → einmal nochmal
                        r = fut.auftrag(sym, seite, menge1, True)
                    erg["auftraege"].append((k, "perp", seite, menge1))
                except Exception as ex:  # noqa: BLE001
                    warn(f"Not-Aus {modus} {k} Perpetual: {type(ex).__name__} {str(ex)[:120]}")
                    if isinstance(ex, BF.UnklarFehler):
                        unklar_ex = ex

            def unklar_merken():
                """Schliessen unklar und (noch) nicht sichtbar: kommt es verspätet an, wären die Absicherungs-Coins ohne Short →
                ins Buch, der Markt wird beidseitig gesichert (Spot-Stop über alle Coins), kein «alles zu»."""
                if unklar_ex is not None:
                    buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, "perp", seite, menge1, True, unklar_ex))
            try:  # nachlesen nur, wenn ein Auftrag rausging (sonst hat sich nichts geändert)
                if menge1 >= fstep / 2:
                    pos = _nochmal(lambda: fut.position_info(sym))[0]
                    if pos > fstep / 2 or -pos > paar + fstep / 2:
                        unklar_merken()
            except Exception as ex:  # noqa: BLE001
                unklar_merken()
                if r and r.get("status") == "FILLED" and abs(float(r.get("executedQty") or 0) - menge1) <= menge1 * 1e-9 + 1e-12:
                    pos = -paar  # Position nicht lesbar, aber die Antwort bestätigt: der ungesicherte Teil ist zu
                else:
                    erg["alles_zu"] = False
                    warn(f"Not-Aus {modus} {k}: Position nach dem Schliessen nicht lesbar ({type(ex).__name__}) — Spot bleibt stehen, "
                         "Schutz-Stops auf beiden Seiten. Not-Aus wiederholen!")
                    if not _notaus_schutz(spot, fut, st, k, sym, coin, None, pos_vor, frei, gebunden, kurs, regeln, warn, modus,
                                          unklar_sell(buch, k), buch=buch, erg=erg):
                        ungeschuetzt.append(k)
                    continue
        fut_offen = False
        nur_absicherung = pos == 0 or (pos < 0 and -pos <= paar + fstep / 2)
        # 2) Futures-Aufträge erst löschen, wenn KEINE Position mehr da ist — solange ein Short offen ist (auch nur die
        #    Absicherung), schützt sein Stop weiter (wird das Paar aufgelöst, braucht es ihn nicht; bleibt es stehen, gleicht der
        #    Schutz unten seine Grösse an: zuerst der passende, dann der alte weg)
        fut_geraeumt = False
        if pos == 0:
            try:
                _nochmal(lambda: fut.alle_abbrechen(sym), SCHUTZ_WARTEN)
                st["perp"] = st["perp_cid"] = st["perp_weitere"] = None
                fut_geraeumt = True
            except Exception as ex:  # noqa: BLE001
                fut_offen = True
                warn(f"Not-Aus {modus} {k}: Futures-Aufträge nicht (alle) gelöscht ({type(ex).__name__}).")
        behalten = max(0.0, -pos)  # Short noch offen → so viel Spot bleibt (vorerst) als Absicherung stehen
        # 3) Coins über die Absicherung hinaus verkaufen: zuerst die FREIEN (die gesperrten hält ihr Stop weiter fest), erst wenn
        #    das klappt die gesperrten — Stop und Verkauf in EINER Anfrage (lehnt Binance ab, bleibt der Stop). Mehrere Versuche.
        if (frei + gebunden - behalten) * kurs >= regeln["min_notional"]:
            ok = True
            if (frei - behalten) * kurs >= regeln["min_notional"]:
                frei, ok = _notaus_verkaufen(spot, k, sym, coin, frei, behalten, kurs, regeln, erg, warn, modus, buch)
            if ok and gebunden > 0:
                frei, ok = _notaus_gesperrte_verkaufen(spot, k, sym, coin, frei, behalten, kurs, regeln, erg, warn, modus, buch, st)
            elif gebunden > 0:
                warn(f"Not-Aus {modus} {k}: Verkaufen geht gerade nicht — der Spot-Stop bleibt stehen ({gebunden:g} {coin}).")
        pause = (buch.get("paar_pause") or {}).get(k)
        futures_ok = any(a[0] == k and a[1] == "perp" for a in erg["auftraege"])  # nimmt Futures in diesem Not-Aus Aufträge an?
        if nur_absicherung and pos < 0 and wiederholung and pause and _jetzt_ms() - pause < PAAR_PAUSE_MS and not futures_ok:
            # vorhin lehnte Binance den Rückkauf des Shorts ab (die Coins wurden zurückgekauft): nicht in jedem Takt wieder
            # verkaufen und zurückkaufen (jedes Mal Gebühren) — das Paar ist abgesichert (netto 0) und bleibt bis zur Pause stehen
            warn(f"Not-Aus {modus} {k}: Coins und Short bleiben als Paar stehen — der Rückkauf des Shorts wurde vor "
                 f"{(_jetzt_ms() - pause) / 60000:.0f} Min. abgelehnt; nächster Versuch nach {PAAR_PAUSE_MS / 60000:.0f} Min. "
                 "(oder sobald Futures wieder Aufträge annimmt).")
        elif nur_absicherung and pos < 0:  # 4) das Paar auflösen: erst die Coins, dann den Short
            frei, gebunden, pos = _notaus_paar(spot, fut, k, sym, coin, -pos, frei, gebunden, fstep, kurs, regeln, erg, warn, modus,
                                               buch, st)
        elif pos < 0:
            abgesichert = min(frei + gebunden, -pos)
            warn(f"Not-Aus {modus} {k}: Short {-pos:g} ließ sich nicht schliessen — "
                 + (f"{abgesichert:g} {coin} bleiben als Absicherung stehen." if abgesichert * kurs >= STAUB_USDT
                    else "keine Coins als Absicherung, er bekommt einen Schutz-Stop."))
        elif pos > 0:
            warn(f"Not-Aus {modus} {k}: Perpetual (long {pos:g}) ließ sich nicht schliessen — sein Stop bleibt stehen.")
        try:  # 4) nachprüfen — am Kontostand, nicht an einer Annahme
            pos = _nochmal(lambda: fut.position_info(sym), SCHUTZ_WARTEN)[0]
            frei, gebunden = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
            pruefbar = True
        except Exception as ex:  # noqa: BLE001
            pruefbar = False
            warn(f"{modus} {k}: Nachprüfung nicht möglich ({type(ex).__name__}) — Schutz nach dem zuletzt bekannten Stand, bitte im "
                 "Binance-Konto prüfen!")
        if pruefbar:
            try:  # «Rest unter dem Binance-Minimum» mit FRISCHEM Kurs entscheiden: nach einem Kurssprung ist er evtl. wieder verkäuflich
                kurs = _kurs_oder_mark(spot, fut, sym)
                st["kurs"] = kurs
            except Exception:  # noqa: BLE001 — kein Kurs: mit dem bisherigen weiter
                pass
        if pruefbar and pos == 0 and not fut_geraeumt:  # Position jetzt zu: übrig gebliebene Futures-Aufträge löschen
            try:
                _nochmal(lambda: fut.alle_abbrechen(sym), SCHUTZ_WARTEN)
                st["perp"] = st["perp_cid"] = st["perp_weitere"] = None
                fut_offen = False
            except Exception as ex:  # noqa: BLE001
                fut_offen = True
                warn(f"Not-Aus {modus} {k}: Futures-Aufträge nicht (alle) gelöscht ({type(ex).__name__}).")
        rest = frei + gebunden
        q_unklar = unklar_sell(buch, k)
        verkaufbar = PL.runde(rest, regeln["step"])  # ungerundeten Staub kann Binance nicht verkaufen — zählt als zu
        if pruefbar and pos == 0 and verkaufbar * kurs < regeln["min_notional"] and q_unklar is None:
            if not fut_offen:
                erg["zeilen"].append(f"✅ {modus} {k}: geschlossen" + (f" (Rest {rest:g} {coin} unter dem Binance-Minimum)" if rest else ""))
            else:  # Position und Coins weg, aber ein Futures-Auftrag steht noch: nie «alles zu» melden
                erg["alles_zu"] = False
                warn(f"{modus} {k}: Position zu, aber Futures-Aufträge noch offen (reduceOnly — ohne Position wirkungslos). "
                     "Not-Aus wiederholen!")
            continue
        erg["alles_zu"] = False
        if pruefbar and (pos or verkaufbar * kurs >= regeln["min_notional"]):
            warn(f"{modus} {k}: NICHT alles zu — Perp {pos:+g}, Spot {rest:g} {coin}. Bitte im Binance-Konto prüfen!")
        # was jetzt ungesichert ist, bekommt sofort einen Schutz-Stop (nie Long ohne Absicherung UND ohne Stop); ein unklarer
        # Auftrag auf diesem Markt → beide Seiten ganz. Danach nachlesen: hat inzwischen ein Börsen-Stop ausgelöst (Kurssprung),
        # passt der Schutz nicht mehr → nochmals nach dem frischen Stand
        geschuetzt = True
        for _runde in range(2):
            q_vor = q_unklar
            geschuetzt = _notaus_schutz(spot, fut, st, k, sym, coin, pos, pos_vor, frei, gebunden, kurs, regeln, warn, modus,
                                        q_unklar, buch=buch, erg=erg)
            q_unklar = unklar_sell(buch, k)  # ein Marktauftrag im Schutz kann eben unklar geworden sein
            # ist im Schutz ein Auftrag unklar geworden (z. B. der Rückkauf zum Markt, einmal neu geschickt), passt der Schutz nicht
            # mehr: kommt er verspätet an, kauft er womöglich Absicherung zurück → noch eine Runde, jetzt beidseitig
            neu_unklar = q_unklar != q_vor
            if not pruefbar:
                if neu_unklar and _runde == 0:
                    # ohne frischen Stand: Lage unbekannt (beidseitig), alle Coins als frei — ein Stop, den die erste Runde eben gelöscht
                    # hat, darf nicht als Schutz zählen (sonst kein Spot-Stop, und bei einem Kurs jenseits ginge der ganze Short zum
                    # Markt zurück → Coins ohne Short und ohne Stop, Not-Aus-Seed 9123). Steht er doch noch, lehnt Binance den
                    # zweiten Stop ab — laut, nie still
                    warn(f"Not-Aus {modus} {k}: ein Auftrag im Schutz blieb unklar, Stand nicht lesbar — Schutz beidseitig neu "
                         "(alle Coins, ganzer Short).")
                    pos, frei, gebunden = None, frei + gebunden, 0.0
                    continue
                break
            try:
                pos2 = _nochmal(lambda: fut.position_info(sym), SCHUTZ_WARTEN)[0]
                frei2, gebunden2 = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
            except Exception:  # noqa: BLE001
                break
            try:
                kurs = _kurs_oder_mark(spot, fut, sym)
            except Exception:  # noqa: BLE001 — kein frischer Kurs: mit dem bisherigen weiter (Stops dazu weit bzw. zum Markt) —
                pass           # nie die zweite Runde auslassen, nur weil der Kurs fehlt (ein Stop kann eben ausgelöst haben)
            if abs(pos2 - pos) <= 1e-9 and abs((frei2 + gebunden2) - (frei + gebunden)) <= regeln["step"] / 2 and not neu_unklar:
                break
            warn(f"Not-Aus {modus} {k}: " + ("Lage hat sich während des Schutzes geändert (Stop ausgelöst?)"
                                              if not neu_unklar else "ein Auftrag im Schutz blieb unklar")
                 + " — Schutz neu geprüft.")
            pos, frei, gebunden = pos2, frei2, gebunden2
        if not geschuetzt:
            ungeschuetzt.append(k)
    if buch.get("unklar"):
        erg["alles_zu"] = False
        sicher = (f"⚠️ {', '.join(ungeschuetzt)} NICHT vollständig gesichert — sofort im Binance-Konto prüfen" if ungeschuetzt
                  else f"⚠️ {', '.join(ungeprueft)}: Lage oder Kurs nicht lesbar, Schutz nicht geprüft — im Binance-Konto prüfen"
                  if ungeprueft else "der Markt ist beidseitig gesichert: kommt ein unklarer Short verspätet an, hat er einen Stop")
        warn(f"Not-Aus {modus}: {len(buch['unklar'])} Auftrag/Aufträge noch unklar — NICHT «alles zu» ({sicher}). Not-Aus in "
             "einigen Minuten wiederholen (er fragt erneut nach; nach 10 Minuten gilt ein unbekannter Auftrag als nie ausgeführt).")
    elif ungeschuetzt:
        erg["alles_zu"] = False
        warn(f"Not-Aus {modus}: {', '.join(ungeschuetzt)} NICHT vollständig gesichert — sofort im Binance-Konto prüfen!")
    if ungeschuetzt or ungeprueft:
        # was der Not-Aus nicht sichern (oder nicht prüfen) konnte, versucht die Nachkontrolle nochmals: im Not-Aus-Modus schliesst
        # sie, ist STOP inzwischen wieder weg, setzt sie wenigstens die Stops nach dem Kontostand (Lauf-Seed 137)
        buch["schutz_offen"] = [m for m in COINS if m in (buch.get("schutz_offen") or []) or m in ungeschuetzt or m in ungeprueft]
    try:
        buch["perp_offen"] = any(_nochmal(lambda m=m: fut.position_info(COINS[m][0]))[0] != 0 for m in COINS)
    except Exception:  # noqa: BLE001
        buch["perp_offen"] = True
    if erg["alles_zu"] and not buch["perp_offen"] and modus == "echt":
        try:
            zurueck = float(_nochmal(fut.konto).get("maxWithdrawAmount", 0) or 0)
            if zurueck >= 1:
                spot.verschieben("FUTURES_ZU_SPOT", math.floor(zurueck * 100) / 100)
                erg["zeilen"].append(f"{zurueck:.2f} USDT vom Futures- aufs Spot-Konto zurück.")
        except Exception as ex:  # noqa: BLE001
            erg["zeilen"].append(f"ℹ️ USDT im Futures-Konto nicht zurückverschoben ({type(ex).__name__}) — vor einem Neustart von Hand verschieben.")
    if erg["alles_zu"] and not buch["perp_offen"]:
        buch.clear()
        buch.update(leer_buch())  # alles zu → Pilot 2.0 beginnt beim nächsten Einschalten neu (mit Startprüfung)
    else:
        buch["notaus_offen"] = True  # → die Nachkontrolle (stop.bat, Tagesaufgabe) versucht es in jedem Takt nochmals
    if speichern() and erg["alles_zu"] and (buch.get("start") or buch.get("unklar") or buch.get("notaus_offen")):
        # ein anderer Lauf (zweiter Not-Aus, Nachkontrolle) hat inzwischen eingetragen, was dieser Not-Aus nicht kannte (z. B. einen
        # unklaren Auftrag) — zusammengeführt, nichts gelöscht; «alles zu» ist damit nicht bewiesen
        erg["alles_zu"] = False
        buch["notaus_offen"] = True
        speichern()
        warn(f"Not-Aus {modus}: ein anderer Lauf hat das Buch inzwischen geändert — zusammengeführt, nichts überschrieben; NICHT "
             "«alles zu». Not-Aus wiederholen (die Nachkontrolle macht es von selbst)!")
    erg["zeilen"].insert(0, f"🛑 Not-Aus Pilot 2.0 ({modus}): " + ("alles geschlossen." if erg["alles_zu"] else "⚠️ NICHT ALLES GESCHLOSSEN!"))
    return erg


def _notaus_ohne_kurs(spot, fut, k, sym, coin, pos, frei, gebunden, fstep, erg, warn, modus, buch, ex):
    """Not-Aus, aber kein Kurs lesbar (Spot-Ticker UND Futures-Markpreis): Stops lassen sich nicht setzen. Was ohne Kurs sicher
    geht, wird trotzdem geschlossen — der Short über die Coins hinaus (alle Coins gelten als Absicherung, auch Staub: lieber zu
    wenig schliessen) bzw. ein Long-Perpetual reduceOnly, danach freie Coins über den Short hinaus zum Markt (gesperrte hält ihr
    Stop). Das abgesicherte Paar bleibt, bis ein Kurs lesbar ist (die Nachkontrolle versucht es weiter).
    → True, wenn danach nichts Ungesichertes mehr offen ist (soweit lesbar)."""
    coins = frei + gebunden
    nackt, seite = 0.0, None
    if pos < 0 and fstep:
        nackt, seite = PL.runde(max(0.0, -pos - _schritte(coins, fstep)), fstep), "BUY"
    elif pos > 0 and fstep:
        nackt, seite = PL.runde(pos, fstep), "SELL"
    ok = True
    if seite and nackt >= fstep / 2:
        try:
            try:
                fut.auftrag(sym, seite, nackt, True)
            except BF.BinanceFehler as ex2:
                if ex2.code not in (418, 429):
                    raise
                time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)  # Rate-Limit: sicher nicht ausgeführt → einmal nochmal
                fut.auftrag(sym, seite, nackt, True)
            erg["auftraege"].append((k, "perp", seite, nackt))
            warn(f"Not-Aus {modus} {k}: kein Kurs lesbar ({type(ex).__name__}) — der ungesicherte "
                 f"{'Short' if seite == 'BUY' else 'Long-Perpetual'} {nackt:g} reduceOnly zum Markt geschlossen.")
        except BF.UnklarFehler as ex2:
            buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, "perp", seite, nackt, True, ex2))
            ok = False
            warn(f"Not-Aus {modus} {k}: kein Kurs lesbar, Schliessen des ungesicherten Perpetuals {nackt:g} unklar — sofort prüfen!")
        except Exception as ex2:  # noqa: BLE001
            ok = False
            warn(f"Not-Aus {modus} {k}: kein Kurs lesbar UND Schliessen des ungesicherten Perpetuals {nackt:g} abgelehnt "
                 f"({type(ex2).__name__}) — ohne Stop. Sofort prüfen!")
    # freie Coins über den (verbliebenen) Short hinaus: ohne Stop und ohne Absicherung → zum Markt
    try:
        pos2 = _nochmal(lambda: fut.position_info(sym), SCHUTZ_WARTEN)[0]
        frei, gebunden = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
        regeln = _nochmal(lambda: spot.regeln2(sym))
    except Exception:  # noqa: BLE001
        warn(f"Not-Aus {modus} {k}: kein Kurs lesbar und Lage danach nicht lesbar — Schutz nicht geprüft. Not-Aus wiederholen!")
        return False
    # gesperrte Coins hält ihr Stop (er deckt die Netto-Richtung); die freien sichern den Short ab — nur was davon ÜBER den Short
    # hinausgeht, hat weder Stop noch Absicherung
    lose = PL.runde(max(0.0, frei - max(0.0, -pos2)), regeln["step"])
    if lose >= regeln["step"]:
        try:
            r = spot.markt(sym, "SELL", lose)
            erg["auftraege"].append((k, "spot", "SELL", _ausgefuehrt(r or {}, lose)))
            warn(f"Not-Aus {modus} {k}: kein Kurs lesbar — {lose:g} {coin} ohne Stop und ohne Absicherung zum Markt verkauft.")
        except BF.UnklarFehler as ex2:
            buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, "spot", "SELL", lose, False, ex2))
            ok = False
            warn(f"Not-Aus {modus} {k}: kein Kurs lesbar, Verkauf von {lose:g} {coin} unklar — sofort prüfen!")
        except Exception as ex2:  # noqa: BLE001
            if "-1013" in _text(ex2) or "NOTIONAL" in _text(ex2):  # unter dem Binance-Minimum: Staub, verkauft sich nicht
                warn(f"Not-Aus {modus} {k}: kein Kurs lesbar — {lose:g} {coin} liegen unter dem Binance-Minimum (Staub).")
            else:
                warn(f"Not-Aus {modus} {k}: kein Kurs lesbar, Verkauf von {lose:g} {coin} abgelehnt ({type(ex2).__name__}) — "
                     "sie bleiben ohne Stop, Not-Aus wiederholen!")
                ok = False
    warn(f"Not-Aus {modus} {k}: kein Kurs lesbar — " + ("das abgesicherte Paar (Coins + Short) bleibt stehen, bis ein Kurs lesbar ist"
         if pos2 < 0 and frei + gebunden > 0 else "Stops lassen sich ohne Kurs nicht prüfen") + ". Not-Aus wiederholen!")
    return ok


def _notaus_verkaufen(spot, k, sym, coin, bekannt, behalten, kurs, regeln, erg, warn, modus, buch=None):
    """Not-Aus: alle FREIEN Coins ausser «behalten» verkaufen — mehrere Versuche, den Rest jedes Mal neu lesen (ist das Konto
    kurz nicht lesbar: zuletzt bekannter Stand). → (frei, ok); ok = verkauft bzw. der Rest liegt unter dem Binance-Minimum."""
    for versuch in range(VERKAUF_VERSUCHE + 1):
        try:
            bekannt = bestand(_nochmal(spot.konto), coin)[0]
        except Exception:  # noqa: BLE001
            pass
        m = PL.runde(max(0.0, bekannt - behalten), regeln["step"])
        if m * kurs < regeln["min_notional"]:
            return bekannt, True
        if versuch == VERKAUF_VERSUCHE:
            break
        try:
            r = spot.markt(sym, "SELL", m)
            ausg = float(r.get("executedQty") or 0)
            bekannt = max(0.0, bekannt - ausg)
            erg["auftraege"].append((k, "spot", "SELL", ausg or m))
        except BF.UnklarFehler as ex:
            # nie einen zweiten Verkauf hinterher, solange der erste unklar ist (zusammen verkauften sie die Absicherung):
            # ins Buch, aufhören — der Schutz-Stop sperrt die Coins, ein verspäteter Verkauf findet dann keine freien mehr
            if buch is not None:
                buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, "spot", "SELL", m, False, ex))
            warn(f"Not-Aus {modus} {k} Spot-Verkauf {m:g} unklar — kein zweiter Verkauf; Coins werden gesichert.")
            return bekannt, False
        except Exception as ex:  # noqa: BLE001
            if not _voruebergehend(ex) or versuch == VERKAUF_VERSUCHE - 1:
                warn(f"Not-Aus {modus} {k} Spot-Verkauf: {type(ex).__name__} {str(ex)[:120]}")
                return bekannt, False
            time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)
    return bekannt, False


def _schritte(menge, schritt):
    """Menge auf den NÄCHSTEN ganzen Schritt gerundet (Absicherung im Not-Aus: höchstens ein halber Schritt Rest)."""
    return PL.runde(menge + schritt / 2, schritt) if schritt > 0 else menge


def _notaus_paar(spot, fut, k, sym, coin, short, frei, gebunden, fstep, kurs, regeln, erg, warn, modus, buch, st):
    """Not-Aus: ein abgesichertes Paar (Coins + Short) auflösen, ohne dass ein Bein allein übrig bleibt: zuerst die Coins
    verkaufen (freie, dann gesperrte) — geht das nicht, bleibt das Paar stehen (netto 0). Dann den Short auf die verbliebenen
    Coins zurückkaufen. Lehnt Binance diesen Rückkauf eindeutig ab, werden die verkauften Coins zurückgekauft (Absicherung
    wieder hergestellt); ist er unklar: ins Buch (der Markt wird beidseitig gesichert). Ist etwas kurz nicht lesbar, gilt der
    zuletzt bekannte Stand (Binance lehnt ab, was nicht da ist). Zurückgekauft wird nur bei frisch gelesener Position und nicht,
    wenn Binance den Rückkauf als «reduceOnly zu gross» ablehnt (dann ist der Short schon kleiner — ein Stop hat ausgelöst).
    → (frei, gebunden, pos): bester bekannter Stand danach (für den Schutz, falls die Nachprüfung nicht lesen kann)."""
    try:
        frei, gebunden = bestand(_nochmal(spot.konto), coin)
    except Exception:  # noqa: BLE001
        pass
    ok, gesperrte = True, False
    if frei * kurs >= regeln["min_notional"]:
        frei, ok = _notaus_verkaufen(spot, k, sym, coin, frei, 0.0, kurs, regeln, erg, warn, modus, buch)
    if ok and gebunden > 0:
        frei, ok = _notaus_gesperrte_verkaufen(spot, k, sym, coin, frei, 0.0, kurs, regeln, erg, warn, modus, buch, st)
        gesperrte = ok
    try:  # was ist jetzt wirklich da? (verkauft, teilweise, gar nicht)
        frei, gebunden = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
    except Exception as ex:  # noqa: BLE001
        if not ok:
            warn(f"Not-Aus {modus} {k}: Konto nicht lesbar ({type(ex).__name__}) und Verkauf unvollständig — Coins und Short bleiben "
                 "als Paar stehen. Not-Aus wiederholen!")
            return frei, gebunden, -short
        gebunden = 0.0 if gesperrte else gebunden  # verkauft — der Rest liegt unter dem Binance-Minimum
    frisch = True
    try:
        short = max(0.0, -_nochmal(lambda: fut.position_info(sym), SCHUTZ_WARTEN)[0])
    except Exception:  # noqa: BLE001 — nicht lesbar: der zuletzt bekannte Short
        frisch = False
    rest = frei + gebunden if PL.runde(frei + gebunden, regeln["step"]) * kurs >= regeln["min_notional"] else 0.0  # Staub sichert nichts
    kauf = PL.runde(max(0.0, short - _schritte(rest, fstep)), fstep)  # Short, der keine (verkäuflichen) Coins mehr absichert
    if kauf < fstep / 2:
        if not ok:
            netto = frei + gebunden - short
            warn(f"Not-Aus {modus} {k}: Verkaufen geht gerade nicht — Coins und Short bleiben als Paar stehen ("
                 + ("netto 0" if abs(netto) < fstep / 2 else f"netto {netto:+g} {coin}, der Schutz folgt") + "). Not-Aus wiederholen!")
        return frei, gebunden, -short
    try:
        try:
            fut.auftrag(sym, "BUY", kauf, True)
        except BF.BinanceFehler as ex:
            if ex.code not in (418, 429):
                raise
            time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)  # Rate-Limit: sicher nicht ausgeführt → einmal nochmal
            fut.auftrag(sym, "BUY", kauf, True)
        erg["auftraege"].append((k, "perp", "BUY", kauf))
        (buch.get("paar_pause") or {}).pop(k, None)
        return frei, gebunden, -(short - kauf)
    except BF.UnklarFehler as ex:
        buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, "perp", "BUY", kauf, True, ex))
        warn(f"Not-Aus {modus} {k}: Rückkauf des Shorts {kauf:g} unklar — Markt wird beidseitig gesichert.")
        return frei, gebunden, -short
    except Exception as ex:  # noqa: BLE001 — eindeutig abgelehnt: die Coins wieder dazukaufen (Spot ging eben noch)
        warn(f"Not-Aus {modus} {k}: Short {kauf:g} ließ sich nicht zurückkaufen ({type(ex).__name__} {str(ex)[:80]}).")
        buch.setdefault("paar_pause", {})[k] = _jetzt_ms()  # nicht in jedem Takt wieder verkaufen und zurückkaufen
        if not frisch or _reduce_abgelehnt(ex):  # Position unbekannt oder schon kleiner: nichts blind zurückkaufen
            return frei, gebunden, -short
    zurueck = PL.runde(kauf * (1 + GEB_SPOT_KAUF), regeln["step"])  # Gebühr in Coins: etwas mehr, damit der Short gedeckt ist
    if zurueck * kurs < regeln["min_notional"]:
        return frei, gebunden, -short
    try:
        r = spot.markt(sym, "BUY", zurueck)
        neu = abs(netto_coins(r, coin))
        erg["auftraege"].append((k, "spot", "BUY", neu))
        warn(f"Not-Aus {modus} {k}: {neu:g} {coin} zurückgekauft — der Short ist wieder abgesichert (netto 0). Not-Aus wiederholen!")
        frei += neu
    except BF.UnklarFehler as ex:
        buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, "spot", "BUY", zurueck, False, ex))
        warn(f"Not-Aus {modus} {k}: Rückkauf der Coins unklar — Markt wird beidseitig gesichert.")
    except Exception as ex:  # noqa: BLE001
        warn(f"Not-Aus {modus} {k}: Coins nicht zurückgekauft ({type(ex).__name__}) — Short {kauf:g} ohne Absicherung, Schutz-Stop "
             "folgt. Sofort prüfen!")
    return frei, gebunden, -short


def _notaus_gesperrte_verkaufen(spot, k, sym, coin, frei, behalten, kurs, regeln, erg, warn, modus, buch, st):
    """Not-Aus: Coins, die ein Stop sperrt, verkaufen — Stop und Verkauf in EINER Anfrage (cancelReplace): lehnt Binance den
    Verkauf ab, bleibt der Stop stehen (nie Schutz wegnehmen, ohne verkaufen zu können). Kennt Binance cancelReplace nicht:
    wie früher stornieren und verkaufen. Danach freie Reste (Teil-Ausführung) verkaufen. → (frei, ok)"""
    if _handel_aus(regeln):
        warn(f"Not-Aus {modus} {k}: {sym} laut Binance nicht im Handel ({regeln.get('status')}) — der Stop bleibt stehen.")
        return frei, False
    try:
        offen = _nochmal(lambda: spot.offene(sym))
        coins = sum(bestand(_nochmal(spot.konto), coin))
    except Exception as ex:  # noqa: BLE001
        warn(f"Not-Aus {modus} {k}: Spot-Aufträge nicht lesbar ({type(ex).__name__}) — der Stop bleibt stehen.")
        return frei, False
    ok, alt_weg = True, False
    for o in offen:
        rest = float(o.get("origQty") or 0) - float(o.get("executedQty") or 0)
        if o.get("side") != "SELL" or rest <= 0:  # Pilot 2.0 setzt nur Verkaufs-Stops; alles andere einfach weg
            try:
                _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
            except Exception:  # noqa: BLE001
                ok = False
            continue
        m = PL.runde(max(0.0, min(rest, coins - behalten)), regeln["step"])
        if m * kurs < regeln["min_notional"]:
            continue  # nichts Verkaufbares (Absicherung oder Staub) — der Stop bleibt
        cid = f"p2{int(time.time() * 1000)}{random.randint(0, 999999):06d}"
        res, info = spot.ersetzen(sym, o["orderId"], {"side": "SELL", "type": "MARKET", "quantity": BB.format_menge(m),
                                                       "newOrderRespType": "FULL", "newClientOrderId": cid})
        if res == "ok":
            ausg = float(info.get("executedQty") or 0)
            erg["auftraege"].append((k, "spot", "SELL", ausg or m))
            coins -= ausg
            st["spot"] = None
        elif res == "nichts":
            warn(f"Not-Aus {modus} {k}: Verkauf abgelehnt ({_text(info)[:90]}) — der Spot-Stop bleibt stehen.")
            return frei, False
        elif res == "nur_storno":
            warn(f"Not-Aus {modus} {k}: Stop storniert, aber Verkauf abgelehnt ({_text(info)[:90]}) — noch ein Verkaufsversuch, "
                 "sonst werden die Coins gleich wieder gesichert.")
            st["spot"], alt_weg = None, True
            break  # nach einer Ablehnung kein weiteres cancelReplace — die übrigen Stops bleiben stehen
        elif res == "unklar":  # beide Hälften unklar: Verkauf ins Buch (Markt beidseitig), nichts hinterher
            u = unklar_eintrag(k, sym, "spot", "SELL", m, False)
            u["cid"] = cid
            buch.setdefault("unklar", []).append(u)
            warn(f"Not-Aus {modus} {k}: Stop+Verkauf unklar ({type(info).__name__}) — kein zweiter Verkauf, Coins werden gesichert.")
            return frei, False
        else:  # «fehlt»: Binance kennt cancelReplace hier nicht → stornieren, dann verkaufen (wie früher)
            try:
                _nochmal(lambda o=o: spot.abbrechen(sym, o["orderId"]))
                st["spot"], alt_weg = None, True
            except Exception as ex:  # noqa: BLE001
                warn(f"Not-Aus {modus} {k}: Spot-Stop nicht gelöscht ({type(ex).__name__}) — verkaufe, was frei ist.")
    if ok or alt_weg:
        return _notaus_verkaufen(spot, k, sym, coin, frei, behalten, kurs, regeln, erg, warn, modus, buch)
    return frei, ok


def _notaus_schutz(spot, fut, st, k, sym, coin, pos, pos_vor, frei, gebunden, kurs, regeln, warn, modus, unklar=None, buch=None,
                   erg=None):
    """Not-Aus unvollständig: was jetzt UNGESICHERT ist, bekommt sofort einen Stop — nie ein Long ohne Absicherung UND ohne
    Stop (bis zum nächsten Not-Aus-Versuch können Stunden vergehen). Bestehende eigene Stops bleiben stehen (gesperrte Coins
    hält im Pilot-Konto ein eigener Stop) und es kommt nur ein Stop über den Rest dazu — ausser ein Stop ist zu gross (er träfe
    beim Auslösen die Absicherung): der wird ersetzt. Position unbekannt (pos=None) oder ein unklarer Auftrag auf dem Markt
    (unklar = Menge unklarer Short-Aufträge): beide Seiten ganz — Spot-Stop über alle Coins, reduceOnly-Perp-Stop über den
    ganzen Short (+ unklare); löst einer aus, schützt der andere den Rest.
    Würde ein Stop sofort auslösen (Kurs schon jenseits): 5 % vom FRISCHEN Kurs (Spot-Ticker, sonst Futures-Markpreis); ist auch
    der jenseits oder kein Kurs lesbar → sofort zum Markt schliessen (Short reduceOnly zurückkaufen, Coins verkaufen).
    Lässt sich ein zu grosser Stop nicht verkleinern/löschen (oder ist das unklar), sichert die andere Seite ganz.
    → True = alles Nötige steht (Stops oder zum Markt geschlossen); False = etwas blieb ohne Schutz (gewarnt)."""
    ok = [True]

    def fehlt_schutz(t):
        ok[0] = False
        warn(t)

    def frisch():
        """Frischer Kurs (Spot-Ticker, sonst Futures-Markpreis); None = keiner lesbar."""
        try:
            return _kurs_oder_mark(spot, fut, sym)
        except Exception:  # noqa: BLE001
            return None

    def setzen(platz, erst, seite, cid):
        """Zum ersten gültigen Stop-Kurs, sonst 5 % vom Kurs (dieselbe Kennung); würde er sofort auslösen: 5 % vom FRISCHEN
        Kurs. Ist auch der jenseits oder kein frischer Kurs lesbar → _Ausgeloest (der Aufrufer schliesst zum Markt)."""
        try:
            return _setze_stop(platz, [erst, kurs * (1 - NOT_STOP_ABSTAND * seite)], cid, warten=SCHUTZ_WARTEN)
        except Exception as ex:  # noqa: BLE001
            if not _sofort_ausgeloest(ex):
                raise
        p = frisch()
        if p is None:
            raise _Ausgeloest()
        try:
            return _setze_stop(platz, [p * (1 - NOT_STOP_ABSTAND * seite)], cid, warten=SCHUTZ_WARTEN)
        except Exception as ex:  # noqa: BLE001
            if _sofort_ausgeloest(ex):
                raise _Ausgeloest() from ex
            raise

    def markt(konto, menge, step):
        """Kurs schon jenseits des Schutz-Stops: zum Markt schliessen — den Short reduceOnly zurückkaufen bzw. die Coins verkaufen.
        Ziel ist der frisch gelesene Stand MINUS `menge` (nie mehr: der Rest kann Absicherung sein — reduceOnly verhindert nur das
        Kippen, nicht das Zurückkaufen der Absicherung). Teil-Ausführung (EXPIRED) oder unklare Antwort beim Rückkauf: nachlesen
        und nur den Rest bis zum Ziel nochmals (bis 5 Versuche); ist der Stand nicht lesbar, wird nichts blind wiederholt. Ein
        unklarer Auftrag wird höchstens einmal neu geschickt (kommt er verspätet doch, ist der Markt beidseitig gesichert), ein
        unklarer Spot-Verkauf nur, wenn alle Coins weg sollen (dann kann nichts doppelt verkauft werden). Bleibt ein Rest: ein
        weiter Not-Stop (10/20/35 % vom zuletzt bekannten Kurs) — lieber weit als keiner. → True = Ziel erreicht oder Rest gestoppt"""
        seite = "BUY" if konto == "perp" else "SELL"

        def stand():
            """(zu schliessen gemessen am Ziel, frei verfügbar): Perp = offener Short; Spot = alle Coins, frei = ohne Stop."""
            if konto == "perp":
                s = max(0.0, -_nochmal(lambda: fut.position_info(sym), SCHUTZ_WARTEN)[0])
                return s, s
            f, g = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
            return f + g, f
        try:
            ist, frei_ist = stand()
            ziel = max(0.0, ist - menge)
        except Exception:  # noqa: BLE001 — nicht lesbar: einmal `menge` senden, nichts wiederholen
            ist = frei_ist = ziel = None

        def zu_klein(m):
            return m < step / 2 or (konto == "spot" and m * kurs < regeln["min_notional"])

        def senden(m):
            return fut.auftrag(sym, "BUY", m, True) if konto == "perp" else spot.markt(sym, "SELL", m)
        gesamt, unklar, rest = 0.0, 0, PL.runde(menge, step)
        for versuch in range(MARKT_VERSUCHE):
            if versuch:
                if ziel is None:
                    break
                try:  # was fehlt noch bis zum Ziel? (eine verspätete oder teilweise Ausführung zählt mit)
                    ist, frei_ist = stand()
                except Exception:  # noqa: BLE001
                    break
            rest = menge - gesamt if ziel is None else ist - ziel
            if frei_ist is not None:
                rest = min(rest, frei_ist)
            rest = PL.runde(max(0.0, rest), step)
            if zu_klein(rest):
                break
            if unklar >= 2 or (unklar and konto == "spot" and (ziel is None or ziel >= step / 2)):
                break  # nicht beliebig oft blind nachschicken (jeder unklare kann verspätet ankommen)
            try:
                try:
                    r = senden(rest)
                except Exception as ex:  # noqa: BLE001
                    if isinstance(ex, BF.UnklarFehler) or getattr(ex, "code", None) not in (418, 429):
                        raise
                    time.sleep(LESE_WARTEN[-1] if LESE_WARTEN else 0)  # Rate-Limit: sicher nicht ausgeführt → einmal nochmal
                    r = senden(rest)
            except BF.UnklarFehler as ex:
                unklar += 1
                if buch is not None:
                    buch.setdefault("unklar", []).append(unklar_eintrag(k, sym, konto, seite, rest, konto == "perp", ex))
                continue
            except Exception as ex:  # noqa: BLE001
                # abgelehnt (z. B. Rate-Limit auf Marktaufträgen, Filter): wenigstens ein WEITER Not-Stop über den Rest — ein
                # Stop-Auftrag geht über einen anderen Pfad und wird oft noch angenommen
                p_breit = breiter_notstop(konto, rest)
                if p_breit:
                    warn(f"Not-Aus {modus} {k}: Kurs schon jenseits des Schutz-Stops, Marktauftrag {seite} {rest:g} abgelehnt "
                         f"({type(ex).__name__}) — der Rest hat einen WEITEN Not-Stop @ {p_breit:g}. Not-Aus wiederholen!")
                    return True
                fehlt_schutz(f"Not-Aus {modus} {k}: Kurs schon jenseits des Schutz-Stops UND Marktauftrag {seite} {rest:g} abgelehnt "
                             f"({type(ex).__name__}) — {'Short' if konto == 'perp' else coin} ohne Stop. Sofort prüfen!")
                return False
            ausg = _ausgefuehrt(r or {}, rest)
            gesamt += ausg
            if erg is not None:
                erg["auftraege"].append((k, konto, seite, ausg))
        else:
            rest = None  # alle Versuche gebraucht: unten nachlesen
        if rest is None or not zu_klein(rest):
            try:
                ist, frei_ist = stand()
                rest = PL.runde(max(0.0, ist - ziel if ziel is not None else menge - gesamt), step)
            except Exception:  # noqa: BLE001
                rest = PL.runde(max(0.0, menge - gesamt), step)
        if not zu_klein(rest):
            was = ("Short zurückgekauft" if konto == "perp" else f"{coin} verkauft") + (" (Antwort unklar)" if unklar else "")
            p_breit = breiter_notstop(konto, rest)
            if p_breit:
                warn(f"Not-Aus {modus} {k}: Kurs schon jenseits des Schutz-Stops — nur {gesamt:g} von {menge:g} {was}; der Rest "
                     f"{rest:g} hat einen WEITEN Not-Stop @ {p_breit:g} (zum Markt ging nicht). Not-Aus wiederholen!")
                return True
            fehlt_schutz(f"Not-Aus {modus} {k}: Kurs schon jenseits des Schutz-Stops — nur {gesamt:g} von {menge:g} {was}, "
                         f"{rest:g} {'Short' if konto == 'perp' else coin} ohne Stop. Sofort prüfen, Not-Aus wiederholen!")
            return False
        if gesamt < step / 2:  # nichts gesendet oder nichts ausgeführt, und doch am Ziel: ein Stop (oder Verspätetes) war schneller
            warn(f"Not-Aus {modus} {k}: Kurs schon jenseits des Schutz-Stops — " + ("der Short" if konto == "perp" else f"{coin}")
                 + " war schon geschlossen (ein Stop hat eben ausgelöst?). Schutz wird neu geprüft, Not-Aus wiederholen!")
            return True
        warn(f"Not-Aus {modus} {k}: Kurs schon jenseits des Schutz-Stops — " + (f"Short {gesamt:g} zum Markt zurückgekauft"
             if konto == "perp" else f"{gesamt:g} {coin} zum Markt verkauft") + (" (eine Antwort war unklar — im Buch)" if unklar else "")
             + ". Not-Aus wiederholen!")
        return True

    def breiter_notstop(konto, m):
        """Zum Markt ging nicht (abgelehnt, unklar, nur teilweise): wenigstens ein WEITER Not-Stop über den Rest — 10/20/35 % vom
        zuletzt bekannten Kurs (Binance nimmt ihn, solange der Kurs nicht schon weiter gelaufen ist). Ein Spot-Stop sperrt die Coins:
        kommt ein unklarer Verkauf verspätet, findet er keine freien. → Stop-Kurs oder None"""
        try:
            if konto == "perp":
                rf = _nochmal(lambda: fut.regeln(sym), SCHUTZ_WARTEN)
                r, p = _setze_stop(lambda preis, c: fut.stop_menge(sym, "BUY", m, preis, rf["tick"], cid=c),
                                   [kurs * (1 + f) for f in BREITE_NOTSTOPS], _kennung(CID_STOP_PERP), warten=SCHUTZ_WARTEN)
                st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p
            else:
                r, p = _setze_stop(lambda preis, c: spot.stop_verkauf(sym, m, preis, regeln, cid=c),
                                   [kurs * (1 - f) for f in BREITE_NOTSTOPS], _kennung(CID_STOP_SPOT), warten=SCHUTZ_WARTEN)
                st["spot"], st["p_long"] = r.get("orderId"), p
            return PL.runde(p, rf["tick"] if konto == "perp" else regeln["tick"])
        except Exception:  # noqa: BLE001
            return None

    def spot_stop(menge, text):
        """Spot-Schutz-Stop über `menge` freie Coins (Kurs jenseits → zum Markt verkaufen). → gestoppte bzw. verkaufte Menge"""
        try:
            r, p = setzen(lambda preis, c: spot.stop_verkauf(sym, menge, preis, regeln, cid=c),
                          _stop_preis(None, st.get("p_long"), kurs, +1), +1, _kennung(CID_STOP_SPOT))
            st["spot"], st["p_long"] = r.get("orderId"), p
            warn(f"Not-Aus {modus} {k}: {text} — {menge:g} {coin} @ {PL.runde(p, regeln['tick']):g}. Not-Aus wiederholen!")
            return menge
        except _Ausgeloest:
            return menge if markt("spot", menge, regeln["step"]) else 0.0
        except Exception as ex:  # noqa: BLE001
            fehlt_schutz(f"Not-Aus {modus} {k}: {menge:g} {coin} ungesichert UND Schutz-Stop abgelehnt ({type(ex).__name__}) — "
                         "sofort prüfen!")
            return 0.0

    beidseitig = pos is None or unklar is not None
    coins = frei + gebunden
    short = max(0.0, -(pos_vor if pos is None else pos))
    soll_s = coins if beidseitig else max(0.0, coins - short)
    if not beidseitig and 0 < coins < short:
        # netto short: der Perp-Stop deckt den Short über der (auf Futures-Schritte abgerundeten) Absicherung; der Coin-Rest unter
        # einem Futures-Schritt wäre nach seinem Auslösen ein Long ohne Stop → er bekommt schon jetzt einen Spot-Stop (wie im Lauf)
        try:
            rf0 = _nochmal(lambda: fut.regeln(sym), SCHUTZ_WARTEN)
            boden = PL.runde(min(coins, short), rf0["step"])
            if short - coins >= 0.5 * rf0["step"] and (short - coins) * kurs >= STAUB_USDT and (coins - boden) * kurs >= STAUB_USDT:
                soll_s = coins - boden
        except Exception:  # noqa: BLE001
            pass
    # ── Spot: gesperrte Coins gelten als gesichert; zu grosse eigene Stops (über die Absicherung hinaus) werden ersetzt
    try:
        eigene = _nochmal(lambda: spot.eigene_stops(sym), SCHUTZ_WARTEN)
    except Exception:  # noqa: BLE001
        eigene = None
    # ausgelöster STOP_LOSS_LIMIT, dessen Limit über dem Kurs liegt (Kurslücke): er verkauft nicht mehr — zählt NICHT als Schutz
    haengend = [o for o in eigene or [] if o.get("isWorking") is True and float(o.get("price") or 0) > kurs]
    if haengend:
        if not _alle_weg(haengend, lambda o: spot.abbrechen(sym, o["orderId"]), k, "Spot", warn, []):
            st["spot"] = None
            eigene = [o for o in eigene if o not in haengend]
            try:
                frei, gebunden = bestand(_nochmal(spot.konto, SCHUTZ_WARTEN), coin)
            except Exception:  # noqa: BLE001
                frei, gebunden = coins, 0.0
            warn(f"Not-Aus {modus} {k}: ausgelöster Stop hing über dem Kurs (Limit nicht erreicht) — gelöscht, neuer Schutz-Stop folgt.")
    spot_zu_gross = False  # ein zu grosser Spot-Stop bleibt (oder vielleicht): löst er aus, verkauft er auch die Absicherung
    if eigene and gebunden > soll_s + regeln["step"] / 2:
        # zu gross (er träfe beim Auslösen die Absicherung): per cancelReplace verkleinern — nie erst löschen, dann setzen
        vorher = gebunden
        gebunden, frei, texte, unsicher = _spot_stops_anpassen(spot, sym, regeln, eigene, soll_s, kurs, frei)
        if texte:
            warn(f"Not-Aus {modus} {k}: Spot-Stop über die Absicherung hinaus — " + ", ".join(texte) + ".")
        if unsicher:  # Antwort verloren: vielleicht steht der alte (zu grosse) noch → so rechnen, als stünde er
            gebunden = max(gebunden, vorher)
            frei = max(0.0, coins - gebunden)
        spot_zu_gross = gebunden > soll_s + regeln["step"] / 2
        if spot_zu_gross:
            warn(f"Not-Aus {modus} {k}: zu grosser Spot-Stop " + ("vielleicht noch offen (Antwort unklar)" if unsicher else "bleibt stehen")
                 + " — der Short bekommt seinen Stop über die ganze Menge.")
    menge = PL.runde(max(0.0, min(frei, soll_s - gebunden)), regeln["step"])
    gestoppt = gebunden  # Coins unter einem eigenen Spot-Stop (können bei fallendem Kurs wegfallen)
    if menge * kurs >= regeln["min_notional"]:
        neu = spot_stop(menge, "Schutz-Stop gesetzt")
        gestoppt += neu
        frei = max(0.0, frei - neu)
    # ── Perp: Stop über den ungesicherten Short (beidseitig oder Spot-Stop zu gross: den ganzen Short + unklare Short-Aufträge)
    perp_zu_gross = False  # ein zu grosser Perp-Stop bleibt: löst er aus, kauft er auch die Absicherung zurück
    if (short + (unklar or 0.0)) * kurs >= STAUB_USDT:
        try:
            rf = _nochmal(lambda: fut.regeln(sym), SCHUTZ_WARTEN)
            ganz = beidseitig or spot_zu_gross
            if ganz:
                soll_p = PL.runde(short + (unklar or 0.0), rf["step"])
            else:
                teil = short - min(coins, short)
                soll_p = (short - PL.runde(min(coins, short), rf["step"])) if teil >= 0.5 * rf["step"] and teil * kurs >= STAUB_USDT else 0.0
                # Coins unter einem Spot-Stop können bei fallendem Kurs wegfallen (z. B. der Rest-Stop über Coins unter einem
                # Futures-Schritt): der Short über die Coins OHNE Stop hinaus braucht seinen Perp-Stop — sonst wäre er danach nackt
                noetig = PL.runde(max(0.0, short - _schritte(min(max(0.0, coins - gestoppt), short), rf["step"])), rf["step"])
                if noetig >= 0.5 * rf["step"] and noetig * kurs >= STAUB_USDT:
                    soll_p = max(soll_p, noetig)
            alt_bekannt = None  # Liste nicht lesbar: der im Buch bekannte alte Stop (ID, Kennung) — nach dem neuen löschen
            try:
                eigene_p = _nochmal(lambda: fut.eigene_stops(sym), SCHUTZ_WARTEN)
                gedeckt = sum(float(a.get("quantity") or 0) for a in eigene_p)
            except Exception:  # noqa: BLE001 — nicht lesbar: lieber zwei reduceOnly-Stops als ein Short ohne Stop
                eigene_p, gedeckt = None, 0.0
                if st.get("perp") is not None or st.get("perp_cid"):
                    alt_bekannt = (st.get("perp"), st.get("perp_cid"))
                if not ganz and soll_p < rf["step"] / 2 and coins * kurs >= STAUB_USDT and st.get("perp_cid"):
                    # kein Perp-Stop nötig (der Short ist abgesichert), aber der bekannte alte (z. B. über den eben geschlossenen
                    # Richtungs-Short) wäre zu gross und träfe die Absicherung: über seine Kennung löschen — geht ohne Liste
                    try:
                        _nochmal(lambda: fut.algo_abbrechen_kennung(sym, st["perp_cid"]), SCHUTZ_WARTEN)
                        st["perp"] = st["perp_cid"] = None
                    except Exception as ex:  # noqa: BLE001
                        perp_zu_gross = True
                        warn(f"Not-Aus {modus} {k}: Perp-Stop-Liste nicht lesbar und alter Stop nicht löschbar ({type(ex).__name__}) — "
                             "die Coins bekommen einen eigenen Stop. Not-Aus wiederholen!")
                if not ganz and soll_p < rf["step"] / 2 and st.get("perp_weitere") and not _perp_weitere_weg(fut, sym, st):
                    perp_zu_gross = True  # kein Stop nötig, gemerkte alte noch nicht löschbar: sie könnten die Absicherung treffen
                    warn(f"Not-Aus {modus} {k}: Perp-Stop-Liste nicht lesbar, gemerkte alte Stops noch nicht löschbar — die Coins "
                         "bekommen einen eigenen Stop. Not-Aus wiederholen!")
            if eigene_p and not ganz and gedeckt > soll_p + rf["step"] / 2 and coins * kurs >= STAUB_USDT:
                # zu gross: löst er aus, kauft er mehr zurück als ungesichert ist → Coins ohne Short UND ohne Stop → ersetzen,
                # und zwar ZUERST den passenden setzen (der alte schützt bis dahin), dann die alten löschen
                neu_ok = True
                if soll_p >= rf["step"] / 2 and soll_p * kurs >= STAUB_USDT:
                    try:
                        r, p = setzen(lambda preis, c: fut.stop_menge(sym, "BUY", soll_p, preis, rf["tick"], cid=c),
                                      _stop_preis(None, st.get("p_short"), kurs, -1), -1, _kennung(CID_STOP_PERP))
                        st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p
                        warn(f"Not-Aus {modus} {k}: Short-Stop auf den ungesicherten Rest verkleinert — {soll_p:g} @ "
                             f"{PL.runde(p, rf['tick']):g}.")
                    except _Ausgeloest:
                        neu_ok = markt("perp", soll_p, rf["step"])  # der ungesicherte Rest ist jetzt zu → die alten weg
                    except Exception as ex:  # noqa: BLE001
                        neu_ok = False
                        warn(f"Not-Aus {modus} {k}: zu grosser Short-Stop, Ersatz abgelehnt ({type(ex).__name__}) — der alte bleibt "
                             "stehen; die Coins bekommen einen eigenen Stop. Bitte prüfen!")
                if not neu_ok:
                    perp_zu_gross = True
                else:
                    for a in eigene_p:
                        try:
                            _nochmal(lambda a=a: fut.algo_abbrechen(sym, a.get("algoId")), SCHUTZ_WARTEN)
                        except Exception as ex:  # noqa: BLE001
                            perp_zu_gross = True
                            warn(f"Not-Aus {modus} {k}: alter (zu grosser) Short-Stop ließ sich nicht löschen ({type(ex).__name__}) — "
                                 "die Coins bekommen einen eigenen Stop. Bitte prüfen!")
                    gedeckt = soll_p
            fehlt = PL.runde(soll_p - gedeckt, rf["step"]) if soll_p - gedeckt > rf["step"] / 2 else 0.0
            if fehlt > 0 and fehlt * kurs >= STAUB_USDT:
                try:
                    try:
                        r, p = setzen(lambda preis, c: fut.stop_menge(sym, "BUY", fehlt, preis, rf["tick"], cid=c),
                                      _stop_preis(None, st.get("p_short"), kurs, -1), -1, _kennung(CID_STOP_PERP))
                    except _Ausgeloest:
                        raise
                    except Exception as ex:  # noqa: BLE001
                        kleiner = PL.runde(max(0.0, short - gedeckt), rf["step"])
                        if not (ganz and _reduce_abgelehnt(ex) and rf["step"] / 2 <= kleiner < fehlt - rf["step"] / 2):
                            raise
                        # nimmt Binance keinen reduceOnly-Stop über mehr als den offenen Short: wenigstens den sichern
                        r, p = setzen(lambda preis, c: fut.stop_menge(sym, "BUY", kleiner, preis, rf["tick"], cid=c),
                                      _stop_preis(None, st.get("p_short"), kurs, -1), -1, _kennung(CID_STOP_PERP))
                        warn(f"Not-Aus {modus} {k}: Binance nimmt keinen reduceOnly-Stop über mehr als den offenen Short — Stop nur "
                             f"über {kleiner:g}. Bitte prüfen!")
                        fehlt = kleiner
                    st["perp"], st["perp_cid"], st["p_short"] = r.get("algoId"), r.get("cid"), p
                    warn(f"Not-Aus {modus} {k}: Schutz-Stop für den Short gesetzt — {fehlt:g} @ {PL.runde(p, rf['tick']):g}. "
                         "Not-Aus wiederholen!")
                    if alt_bekannt and alt_bekannt[1] != r.get("cid"):
                        # Liste nicht lesbar: der bekannte alte Stop stünde neben dem neuen (zusammen grösser als ungesichert; in
                        # jedem Takt der Nachkontrolle käme einer dazu) → jetzt, wo der neue steht, den alten über seine Kennung
                        # (sonst ID) löschen; geht das nicht, stehen zwei → die Coins bekommen einen eigenen Stop (beidseitig)
                        try:
                            if alt_bekannt[1]:
                                _nochmal(lambda: fut.algo_abbrechen_kennung(sym, alt_bekannt[1]), SCHUTZ_WARTEN)
                            else:
                                _nochmal(lambda: fut.algo_abbrechen(sym, alt_bekannt[0]), SCHUTZ_WARTEN)
                        except Exception as ex2:  # noqa: BLE001
                            perp_zu_gross = True
                            _perp_merken(st, alt_bekannt[0], alt_bekannt[1])
                            warn(f"Not-Aus {modus} {k}: Perp-Stop-Liste nicht lesbar und alter Stop nicht löschbar "
                                 f"({type(ex2).__name__}) — zwei stehen, die Coins bekommen einen eigenen Stop. Not-Aus wiederholen!")
                    if eigene_p is None and st.get("perp_weitere") and not _perp_weitere_weg(fut, sym, st):
                        perp_zu_gross = True  # der neue steht: jetzt auch die gemerkten alten weg; geht das nicht → Coins mit Stop
                        warn(f"Not-Aus {modus} {k}: gemerkte alte Perp-Stops nicht löschbar — die Coins bekommen einen eigenen Stop. "
                             "Not-Aus wiederholen!")
                except _Ausgeloest:
                    markt("perp", fehlt, rf["step"])
        except Exception as ex:  # noqa: BLE001
            fehlt_schutz(f"Not-Aus {modus} {k}: Short {short:g} ungesichert UND Schutz-Stop abgelehnt ({type(ex).__name__}) — "
                         "sofort prüfen!")
    if perp_zu_gross or (spot_zu_gross and not beidseitig):
        # ein zu grosser Stop bleibt stehen → der Markt ist beidseitig zu sichern: ein zu grosser Perp-Stop kauft beim Auslösen auch
        # die Absicherung zurück; ein zu grosser Spot-Stop liess den Short seinen Stop über die ganze Menge bekommen («ganz», ein
        # alter, grösserer Perp-Stop bleibt dann auch stehen) → nach dem Auslösen eines Perp-Stops lägen die Coins ohne Short da.
        # Darum schon jetzt einen Spot-Stop über ALLE Coins ohne Stop — dann schützt nach dem Auslösen dieser die Coins
        zusatz = PL.runde(max(0.0, min(frei, coins - gestoppt)), regeln["step"])
        if zusatz * kurs >= regeln["min_notional"]:
            gestoppt += spot_stop(zusatz, "zu grosser Perp-Stop bleibt, Spot-Stop über die Absicherung gesetzt" if perp_zu_gross
                                  else "zu grosser Spot-Stop bleibt (beidseitig), Spot-Stop über die übrigen Coins gesetzt")
    return ok[0]


def protokoll_schreiben(eintrag):
    try:
        alt = json.loads(PROTOKOLL.read_text()) if PROTOKOLL.exists() else []
    except (OSError, ValueError):
        alt = []
    PROTOKOLL.parent.mkdir(exist_ok=True)
    tmp = Path(str(PROTOKOLL) + ".neu")
    tmp.write_text(json.dumps((alt + [eintrag])[-2000:], ensure_ascii=False, indent=1))
    tmp.replace(PROTOKOLL)  # nie halb geschrieben
