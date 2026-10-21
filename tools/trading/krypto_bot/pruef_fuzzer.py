#!/usr/bin/env python3
"""Prüf-Fuzzer für Pilot 2.0 (aus der 8. unabhängigen Prüfung, Oktober 2026): viele zufällige Läufe und Not-Aus gegen die
strenge nachgebaute Binance (pruef_boerse.py) — Störungen in JEDEM Schritt, Kurssprünge mitten im Lauf, nach jedem Schritt
die Invarianten. NUR Spielgeld gegen 127.0.0.1; schaltet Pilot 2.0 nur in DIESEM Prozess frei (FREIGEGEBEN = True).

  python3 -B pruef_fuzzer.py laeufe VON BIS [TAGE]   # Tage mit zufälligen Signalen, Kursen, Störungen und Not-Aus
  python3 -B pruef_fuzzer.py notaus VON BIS          # zufälliger Bestand, dann Not-Aus mit harten (auch dauerhaften) Störungen
  python3 -B pruef_fuzzer.py monotonie VON BIS       # Phase «nur Stornieren» (ab Laufbeginn oder mitten im Lauf): nie Schutz verlieren
  python3 -B pruef_fuzzer.py listen VON BIS          # Tage mit EINER dauerhaft unlesbaren Auftragsliste (Setzen/Löschen gehen),
                                                     # in der Hälfte der Seeds zum Schluss ein Not-Aus (13. Prüfung, Prüfer-Fuzzer)

Befunde (jeder ist ein Fehler):
  AUSNAHME           ausfuehren()/Not-Aus warf eine Ausnahme nach aussen
  FALSCH_ALLES_ZU    Not-Aus meldet «alles zu», das Konto ist aber nicht flach
  FREMD / TRANSFER   schreibende Anfrage in einem fremden Konto / falscher Transfer-Typ
  TROCKEN            ein Probelauf schrieb oder sendete etwas
  ENDE_NICHT_ZU      ein sauberer Not-Aus (nach 10 Minuten) schliesst nicht alles
  LONG_OHNE_STOP / SHORT_OHNE_STOP           Netto-Position ohne Stop
  SPOT_STOP_UEBER_NETTO / PERP_STOP_UEBER_NETTO  ein Stop ist so gross, dass nach seinem Auslösen etwas ohne Stop bleibt
                     (er träfe die Absicherung und der Rest hat keinen Stop der anderen Seite)
  NACH_SPRUNG_*      der Kurs springt durch alle Stops — bleibt danach etwas ohne Absicherung und ohne Stop?
  SCHUTZ_VERLOREN_*  (monotonie) in einer Phase «nur Stornieren» ging Schutz verloren — ein Stop wurde ersatzlos entfernt
  SCHUTZ_VERLOREN_MITTEN_*  (monotonie, Phase beginnt mitten im Lauf) seit Phasenbeginn hat Pilot 2.0 selbst einen Stop entfernt
                     und die Seite blieb ungesichert
Bewusst NICHT gezählt (begründet):
  • Staub unter STAUB_MAX_USDT (10 USDT: darunter nimmt Binance keinen Stop an; Long UND Short, seit der 14. Prüfung K3) — als STAUB_* ausgewiesen. Den Coin-Rest unter
    einem Futures-Schritt sichert Pilot 2.0 seit der 9. Prüfung mit einem eigenen Spot-Stop.
  • mehrere Spot-Stops, deren Summe die Netto-Position nicht übersteigt (der Not-Aus sichert unter Störungen additiv,
    statt einen funktionierenden Stop wegzunehmen); zu grosse Perp-Stops ohne Coins (reduceOnly: schliessen nur den Short).
  • Märkte mit unklarem Auftrag oder sonst BEIDSEITIG gesichert (Spot-Stop über alle Coins UND Perp-Stop über den ganzen
    Short — löst einer aus, schützt der andere den Rest): dort zählt «alles gedeckt» statt «nicht über netto»; die
    NACH_SPRUNG-Prüfung gilt weiter.
  • Läufe ohne Lauf-Warnung sind still (STILL_*), mit Warnung laut (LAUT_*) — beides zählt als Befund. Ausnahme DAUER_*: Binance
    lehnt in diesem Schritt dauerhaft (≥ 50 Wiederholungen) GENAU DIE SCHUTZ-HANDLUNG ab — einen neuen Stop der Seite setzen, die
    den fehlenden Schutz bräuchte (die Störungsregel muss einen solchen Stop-Auftrag treffen), oder das Lesen der Lage (Konto,
    Position); dauerhaft abgelehnte Marktaufträge, Löschungen oder cancelReplace zählen NICHT (12. Prüfung K1), der Kurs-Abruf
    auch nicht, und seit der 13. Prüfung (W2) auch keine unlesbare Auftragsliste (dafür hat Pilot 2.0 eigene Wege: Kennung im
    Buch, Stop zuerst setzen, beidseitig) —, Pilot 2.0 meldet die Lücke laut UND hat in diesem Schritt keinen eigenen Stop entfernt (sonst
    hätte er ihn stehen lassen können) — dann kann kein Code schützen; geprüft wird der Stand NACH der Nachkontrolle (Störung
    vorbei), der muss sauber sein.
  • DAUER_* gilt seit der 14. Prüfung (E4) auch für GESTAPELTE endliche Störungen: treffen mehrere Regeln denselben Schutzpfad und ist die
    Summe ihrer ursprünglichen Anzahlen (anzahl0; die Börse zählt «anzahl» beim Verbrauch herunter) mindestens so gross wie die Zahl der
    Versuche von Pilot 2.0 (SCHUTZ_WARTEN + 1), scheitert der Schutz in diesem Lauf unvermeidbar — die Nachkontrolle holt ihn nach.
  • ENDE_NICHT_ZU zählt nicht, wenn nur Coins übrig sind, die das Buch nicht kennt (früher unter dem Binance-Minimum liegen geblieben, durch
    den Kursanstieg wieder verkäuflich): der Not-Aus verkauft sie nie von selbst, er meldet sie (14. Prüfung E4). «10 Minuten später»
    (sauber_schliessen) heisst auch: alle Listen zeigen jeden Auftrag.
  • STORNO_ZUERST_* (monotonie, und seit der 11. Prüfung auch in 15 % der Lauf-Tage und Not-Aus): Schutzverlust nur, weil
    cancelReplace in der ungünstigen Lesart erst storniert und dann ablehnt (409) — laut gemeldet, und nur der ERSTE 409 je Markt
    (danach ersetzt Pilot 2.0 nichts mehr per cancelReplace; ein zweiter wäre vermeidbar — 12. Prüfung K2); nicht vermeidbar,
    solange ein Stop überhaupt ersetzt werden muss; Testnetz-Prüfpunkt (README). Stille Lücken zählen weiter als Befund.
  • VORSORGE_* (16. Prüfung): SPOT_STOP_UEBER_NETTO, nachdem der Lauf laut einen Vorsorge-Stop gemeldet hat («ein alter Short-Stop hat ausgelöst, Kontostand danach nicht lesbar —
    vorsorglich unter Spot-Stop») UND den Markt für die Nachkontrolle vermerkt hat: nach einer verlorenen Löschantwort sieht das eigene Löschen wie ein Auslösen aus; die Nachkontrolle räumt
    den Vorsorge-Stop ab (dokumentiertes Restrisiko, README). Ohne Meldung oder ohne Vermerk bleibt es ein Befund.
  • LIMIT_LUECKE_* (Konto ohne STOP_LOSS): die Lücke ist genau ein ausgelöster STOP_LOSS_LIMIT, dessen Limit eine Kurslücke
    übersprungen hat — er hängt bis zum nächsten Lauf (der steigt dann zum Markt aus); bekanntes Restrisiko (README). Im Tageslauf (16. Prüfung F-a) gilt die
    Entschuldigung nur, wenn der Lauf den Markt angesehen (die Spot-Liste gelesen) oder für die Nachkontrolle vermerkt hat — sah er ihn nie an und vermerkte nichts (der Lauf endete früh,
    «Konto nicht lesbar»), bleibt die Lücke bis zum nächsten Tageslauf: echter Befund. Gilt nur,
    wenn der Stop NACH dem letzten Blick von Pilot 2.0 auf die Spot-Auftragsliste zu hängen begann (Ereignis-Takt der Prüf-Börse,
    je Auftrag — 13. Prüfung K1: eine spätere kleine Kursbewegung entschuldigt ihn nicht wieder) — sah er den hängenden Stop und
    blieb trotzdem drin, ist es ein echter Befund (12. Prüfung, auch im Zweig «beidseitig»).
Not-Aus-Fuzzer: in 25 % der Seeds springt der Kurs genau beim ersten Schutz-Stop um 5,5–15 %, oft mit gesperrtem Spot-Ticker UND
Futures-Markpreis (12. Prüfung W3) — eigener Zufall, die Szenarien alter Seeds bleiben gleich.
Listen-Fuzzer (13. Prüfung): an zufälligen Tagen ist EINE eigene Auftragsliste (Spot openOrders oder Perp openAlgoOrders) ab einer
zufälligen Anfrage dauerhaft gestört — Pilot 2.0 hat dafür eigene Wege (Kennung im Buch, zuerst setzen, beidseitig): jede Lücke
nach Lauf + Nachkontrolle ist ein Befund, KEINE DAUER-Ausnahme.
Strenger Modus (14. Prüfung W): PRUEF_STRENG=1 python3 -B pruef_fuzzer.py … — die Prüf-Börse lehnt reduceOnly-Stops über mehr als
die offene Position ab (−2022; was Binance tut, klärt nur das Testnetz, README-Prüfpunkt A — die Standardläufe «nehmen sie an»,
also braucht es beide), die Störungen liegen häufiger auf den ERSTEN passenden Anfragen (ab_req nur in 25 statt 60 %, höchstens
80 statt 150) und haben endliche Anzahlen 1–4 (nur die Not-Aus-Teile behalten ihre dauerhaften), «unsichtbar» dauert bis zu 8
Listenabfragen, und der Listen-Fuzzer lässt zusätzlich den Kurs springen (meist hoch). Die Zufallsfolge ändert sich: eigene Seeds
(z. B. 20000 ff.); ohne die Variable bleiben alle Standard-Seeds Zug um Zug dieselben. Die Ausgabedatei heisst dann pruef_streng_*. PRUEF_LUECKEN=1 (laeufe und notaus): Konto immer ohne STOP_LOSS und dreimal so viele Kurssprünge — der Weg «hängender Stop-Limit» gezielt (Ausgabe pruef_luecken_*).
"""
from __future__ import annotations

import copy
import json
import os
import random
import sys
import tempfile
import traceback
from collections import Counter
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.dont_write_bytecode = True

import broker_futures as BF  # noqa: E402
import pilot2_live as L  # noqa: E402
import pruef_boerse as FB  # noqa: E402

L.FREIGEGEBEN = True  # nur in diesem Prüf-Prozess, nur gegen 127.0.0.1 (siehe env_echt/env_test)
BF.NACHFRAGE_WARTEN = (0.0, 0.0, 0.0)
L.LESE_WARTEN = (0.0, 0.0)
L.SCHUTZ_WARTEN = (0.0, 0.0, 0.0, 0.0)
L.UNKLAR_WARTEN = (0.0, 0.0, 0.0)
TMP = Path(tempfile.mkdtemp(prefix="p2pruef_"))
BF.STOP_DATEI = TMP / "STOP"
L.PAUSE_DATEI = TMP / "PAUSE"
L.BESTAND = TMP / "bestand.json"
L.PROTOKOLL = TMP / "protokoll.json"
URL = FB.starten()
assert URL.startswith("http://127.0.0.1:"), URL
B = FB.B
GEHEIM = "geheim"
SYMS = FB.SYMS
STEP_S = {s: float(v) for s, v in FB.SPOT_STEP.items()}
STEP_P = {s: float(v) for s, v in FB.FUT_STEP.items()}
TOL_USDT = 6.0
STAUB_MAX_USDT = 10.0  # darunter kann Binance nichts mehr absichern (Mindestbetrag 5 USDT, Schrittweiten) — echter Staub
STRENG = os.environ.get("PRUEF_STRENG") == "1"  # 14. Prüfung W: strenge reduceOnly-Regel + härtere Störungs-Zufälle (siehe oben)
LUECKEN = os.environ.get("PRUEF_LUECKEN") == "1"  # 15. Folge-PR: Konto IMMER ohne STOP_LOSS (Spot-Stops sind STOP_LOSS_LIMIT und können bei Kurslücken hängen) und
#                                                  dreimal so viele Kurssprünge — prüft den Weg «hängender Stop-Limit» gezielt (laeufe, notaus; die Standard-Seeds bleiben dieselben)
_n = [0]


# ───────────────────────── Hilfen ─────────────────────────
def neu_buch():
    _n[0] += 1
    return TMP / f"buch{_n[0]}.json"


def env_echt(key="k", kapital=20000, **extra):
    e = {"PILOT2_API_KEY": key, "PILOT2_API_SECRET": GEHEIM, "PILOT2_SPOT_URL": URL, "PILOT2_FUTURES_URL": URL,
         "KRYPTO_PILOT2": "an", "BINANCE_TESTNET": "false", "BINANCE_FUTURES_TESTNET": "false",
         "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD", "KI_BOT_MAX_AUFTRAG": "100000", "KRYPTO_PILOT2_KAPITAL": str(kapital)}
    e.update({k: str(v) for k, v in extra.items()})
    return e


def env_test(skey="s", fkey="f", **extra):
    e = {"BINANCE_API_KEY": skey, "BINANCE_API_SECRET": GEHEIM, "BINANCE_FUTURES_API_KEY": fkey,
         "BINANCE_FUTURES_API_SECRET": GEHEIM, "PILOT2_SPOT_URL": URL, "PILOT2_FUTURES_URL": URL, "KRYPTO_PILOT2": "an",
         "KI_BOT_MAX_AUFTRAG": "100000"}
    e.update({k: str(v) for k, v in extra.items()})
    return e


def neues_konto(usdt=20000.0, uid=4711, keys=("k",), kurs=None):
    B.reset(kurs)
    MINIMUM_GESEHEN[0] = False
    B.reduce_algo_streng = STRENG  # PRUEF_STRENG=1: reduceOnly-Stop über der offenen Position → −2022 (14. Prüfung W)
    return B.konto_anlegen(keys, GEHEIM, uid, usdt)


def E(m, h, stop_abstand=0.10, kurs=None):
    p = kurs or B.kurs[m + "USDT"]
    return {"markt": m, "hebel": h, "stop_long": p * (1 - stop_abstand), "stop_short": p * (1 + stop_abstand), "stand": "2026-10-13"}


MINIMUM_GESEHEN = [False]  # irgendein Lauf/Not-Aus dieser Runde hat einen Coin-Rest «unter dem Binance-Minimum» liegen lassen (neues_konto setzt es zurück)


def lauf(ents, env, datei, trocken=False, notaus=False, protokolliere=None):
    r = L.ausfuehren(ents, trocken=trocken, env=env, bestand_datei=datei, notaus=notaus, protokolliere=protokolliere)
    if any("unter dem Binance-Minimum" in z for z in (r or {}).get("zeilen") or []):
        MINIMUM_GESEHEN[0] = True
    return r


def pending_abarbeiten():
    with B.lock:
        for faellig, f in list(B.pending):
            B.pending.remove((faellig, f))
            f()


def stops(k, sym):
    """Eigene offene Stops — ein ausgelöster STOP_LOSS_LIMIT, dessen Limit über dem Kurs liegt (Lücke), schützt nicht mehr."""
    sp = [o for o in k.orders.values() if o["symbol"] == sym and o["status"] in ("NEW", "PARTIALLY_FILLED")
          and o["typ"].startswith("STOP") and str(o["cid"]).startswith(L.CID_STOP_SPOT)
          and not (o.get("aktiv") and o.get("preis", 0.0) > B.kurs[sym])]
    pp = [a for a in k.algos.values() if a["symbol"] == sym and str(a.get("clientAlgoId", "")).startswith(L.CID_STOP_PERP)]
    return sp, pp


def lage(k, sym):
    coin = sym[:-4]
    coins = k.frei[coin] + k.gesperrt[coin]
    pos = k.pos[sym]
    sp, pp = stops(k, sym)
    return {"coins": coins, "pos": pos, "netto": coins + pos, "s_qty": sum(o["qty"] - o["ausgefuehrt"] for o in sp),
            "p_qty": sum(float(a["quantity"]) for a in pp if a["side"] == "BUY"), "n_s": len(sp), "n_p": len(pp),
            "kurs": B.kurs[sym], "s_preise": [o["stop"] for o in sp], "p_preise": [float(a["triggerPrice"]) for a in pp]}


def unklar_je_markt(datei):
    """{Symbol: Summe unklarer Short-Aufträge} aus dem Buch (alle Modi) — diese Märkte sind beidseitig gesichert."""
    try:
        roh = json.loads(Path(datei).read_text())
    except (OSError, ValueError):
        return {}
    out = {}
    for b in (roh.values() if isinstance(roh, dict) else []):
        for u in ((b.get("unklar") or []) if isinstance(b, dict) else []):
            q = float(u.get("menge") or 0) if u.get("seite") == "SELL" and not u.get("reduce") else 0.0
            out[u.get("sym")] = out.get(u.get("sym"), 0.0) + q
    return out


def vermerkt_je_markt(datei):
    """Märkte, die das Buch für die Nachkontrolle vermerkt hat («schutz_offen», alle Modi): dort holt sie fehlende Stops nach."""
    try:
        roh = json.loads(Path(datei).read_text())
    except (OSError, ValueError):
        return []
    out = set()
    for b in (roh.values() if isinstance(roh, dict) else []):
        if isinstance(b, dict):
            out |= set(b.get("schutz_offen") or [])
    return sorted(out)


def schutz_befunde(k, unklar=None, tol_usdt=TOL_USDT):
    """Ungesicherte Netto-Positionen und zu grosse Stops (träfen die Absicherung). Staub < 1 Futures-Schritt → STAUB_*."""
    out = []
    unklar = unklar or {}
    for sym in SYMS:
        g = lage(k, sym)
        p = g["kurs"]
        beidseitig_stand = (g["coins"] - g["s_qty"]) * p <= tol_usdt + STEP_S[sym] * p and g["p_qty"] >= max(0.0, -g["pos"]) - 1e-9
        if sym in unklar or beidseitig_stand:
            # beidseitig: alle Coins unter Spot-Stop, der ganze Short unter Perp-Stop — löst einer aus, schützt der andere den Rest
            luecke_s = g["coins"] - g["s_qty"]
            if luecke_s * p > tol_usdt + STEP_S[sym] * p and g["coins"] * p >= FB.SPOT_MIN_NOTIONAL:
                # wie im einseitigen Zweig: ein Rest bis STAUB_MAX_USDT ist Staub (am Stop-Kurs liegt er unter dem Mindestbetrag von Binance — Lauf-Seed 102030: 7,3 USDT Rest
                # nach dem Rückkauf des Shorts, am Stop-Kurs 4,7 USDT; die Nachkontrolle setzt den Stop mit dem Kurs aus dem Buch)
                name = "LONG_OHNE_STOP" if luecke_s * p > STAUB_MAX_USDT else "STAUB_LONG_OHNE_STOP"
                if _limit_luecke(k, sym, luecke_s):
                    name = "LIMIT_LUECKE_" + name
                out.append((name, sym, round(luecke_s, 6), round(luecke_s * p, 2), "beidseitig"))
            luecke_p = max(0.0, -g["pos"]) - g["p_qty"]
            if luecke_p * p > max(tol_usdt, 0.5 * STEP_P[sym] * p) + 1e-6:
                out.append(("SHORT_OHNE_STOP" if luecke_p * p > STAUB_MAX_USDT else "STAUB_SHORT_OHNE_STOP", sym, round(luecke_p, 6),
                            round(luecke_p * p, 2), "beidseitig"))
            continue
        if g["netto"] > 0:
            luecke = min(g["netto"], g["coins"]) - g["s_qty"]
            if luecke * p > tol_usdt + STEP_S[sym] * p:
                name = "LONG_OHNE_STOP" if luecke * p > STAUB_MAX_USDT else "STAUB_LONG_OHNE_STOP"
                if _limit_luecke(k, sym, luecke):
                    name = "LIMIT_LUECKE_" + name
                out.append((name, sym, round(luecke, 6), round(luecke * p, 2)))
        if g["netto"] < 0:
            luecke = -g["netto"] - g["p_qty"]
            if luecke * p > max(tol_usdt, 0.5 * STEP_P[sym] * p) + 1e-6:
                out.append(("SHORT_OHNE_STOP" if luecke * p > STAUB_MAX_USDT else "STAUB_SHORT_OHNE_STOP", sym, round(luecke, 6),
                            round(luecke * p, 2)))
        # Ein zu grosser Stop schadet erst, wenn er auslöst und danach etwas UNGEDECKT ist (11. Prüfung: statt «grösser als
        # netto» genau nachrechnen — deckt der Perp-Stop den Short, der nach dem Auslösen des Spot-Stops übrig ist, ist ein
        # «zu grosser» Spot-Stop harmlos, und umgekehrt). In den üblichen Lagen (nur eine Seite gestoppt) ist das dasselbe.
        short = max(0.0, -g["pos"])
        # Spot-Stop löst aus (verkauft s_qty Coins): der Short über die verbleibenden Coins braucht so viel Perp-Stop
        ohne_perp = max(0.0, short - max(0.0, g["coins"] - g["s_qty"])) - g["p_qty"]
        if g["netto"] < 0 < g["coins"]:  # netto short: Coin-Rest unter einem Futures-Schritt darf einen Spot-Stop haben,
            boden = int(min(g["coins"], short) / STEP_P[sym] + 1e-9) * STEP_P[sym]  # wenn der Perp-Stop den Short darüber deckt
            if g["p_qty"] >= short - boden - 1e-9 and g["s_qty"] <= g["coins"] - boden + STEP_S[sym]:
                ohne_perp = 0.0
        if g["s_qty"] > 0 and ohne_perp > STEP_S[sym] + tol_usdt / p:
            out.append(("SPOT_STOP_UEBER_NETTO", sym, round(ohne_perp, 6)))
        # Perp-Stop löst aus (kauft bis p_qty zurück): die Coins über den verbleibenden Short brauchen so viel Spot-Stop
        if g["pos"] < 0 and g["coins"] * p >= tol_usdt and g["p_qty"] > 0:
            ohne_spot = max(0.0, g["coins"] - max(0.0, short - g["p_qty"])) - g["s_qty"]
            if ohne_spot > STEP_P[sym] + 1e-9:
                name = "PERP_STOP_UEBER_NETTO" if ohne_spot * p > STAUB_MAX_USDT else "STAUB_PERP_STOP_UEBER_NETTO"
                if _limit_luecke(k, sym, ohne_spot):  # derselbe hängende STOP_LOSS_LIMIT (zählt nicht als Spot-Stop) wie bei LONG_OHNE_STOP
                    name = "LIMIT_LUECKE_" + name
                out.append((name, sym, round(ohne_spot, 6)))
    return out


def folgeschaden(k):
    """Kurs springt (a) knapp über alle Perp-Auslöser, (b) knapp unter alle Spot-Stops: bleibt danach etwas ungesichert?"""
    out = []
    for sym in SYMS:
        g = lage(k, sym)
        for richtung, preise in (("hoch", g["p_preise"]), ("runter", g["s_preise"])):
            if not preise:
                continue
            ziel = max(preise) * 1.01 if richtung == "hoch" else min(preise) * 0.99
            with B.lock:
                alt_kurs = dict(B.kurs)
                k2 = copy.deepcopy(k)
                B.kurs[sym] = ziel
                B._ausloesen(k2, sym)
                B.kurs.update(alt_kurs)
            coins2 = k2.frei[sym[:-4]] + k2.gesperrt[sym[:-4]]
            netto2 = coins2 + k2.pos[sym]
            sp2, pp2 = stops(k2, sym)
            s2 = sum(o["qty"] - o["ausgefuehrt"] for o in sp2)
            p2 = sum(float(a["quantity"]) for a in pp2 if a["side"] == "BUY")
            lang = min(netto2, coins2) - s2
            if netto2 > 0 and lang * ziel > TOL_USDT + STEP_S[sym] * ziel:
                name = "NACH_SPRUNG_LONG_OHNE_STOP" if lang * ziel > STAUB_MAX_USDT else "STAUB_NACH_SPRUNG_LONG"
                if _limit_luecke(k, sym, lang):  # derselbe hängende STOP_LOSS_LIMIT (zählt nicht als Spot-Stop) wie bei LONG_OHNE_STOP (Lücken-Lauf-Seed 100890)
                    name = "LIMIT_LUECKE_" + name
                out.append((name, sym, richtung, round(lang, 6), round(lang * ziel, 2)))
            if netto2 < 0 and (-netto2 - p2) * ziel > max(TOL_USDT, 0.5 * STEP_P[sym] * ziel) + 1e-6:
                out.append(("NACH_SPRUNG_SHORT_OHNE_STOP", sym, richtung, round(-netto2 - p2, 6), round((-netto2 - p2) * ziel, 2)))
    return out


def flach(k, min_notional=5.0):
    """Keine Position und kein verkaufbarer Coin-Rest (Binance verkauft nur ganze Schritte ab dem Mindestbetrag)."""
    return all(k.pos[s] == 0 and int((k.frei[s[:-4]] + k.gesperrt[s[:-4]]) / STEP_S[s] + 1e-9) * STEP_S[s] * B.kurs[s] < min_notional
               for s in SYMS)


def zeigen(k):
    return {s: {kk: (round(v, 6) if isinstance(v, float) else v) for kk, v in lage(k, s).items()} for s in SYMS} | {
        "usdt": round(k.frei["USDT"] + k.gesperrt["USDT"], 2), "fut": round(k.fut, 2)}


def echte(befunde):
    """Befunde ohne Staub und ohne «DAUER_» (laut gemeldete Lücke, solange Binance dauerhaft ablehnt — die Nachkontrolle holt
    den Schutz nach, sobald es wieder geht; danach wird erneut geprüft), «STORNO_ZUERST_» (Testnetz-Prüfpunkt B) und
    «LIMIT_LUECKE_» (Konto ohne STOP_LOSS: eine Kurslücke über das Limit eines eben ausgelösten STOP_LOSS_LIMIT — er hängt bis
    zum nächsten Lauf, der dann zum Markt aussteigt; bekanntes Restrisiko, README)."""
    return [b for b in befunde if "STAUB" not in b[0] and "LIMIT_LUECKE_" not in b[0]
            and not b[0].startswith(("DAUER_", "STORNO_ZUERST_", "VORSORGE_"))]


def _haengend(k, sym):
    """Coins unter einem AUSGELÖSTEN STOP_LOSS_LIMIT, dessen Limit über dem Kurs liegt (Kurslücke): er hängt, schützt nicht."""
    return sum(o["qty"] - o["ausgefuehrt"] for o in k.orders.values() if o["symbol"] == sym and o["typ"] == "STOP_LOSS_LIMIT"
               and o["status"] in ("NEW", "PARTIALLY_FILLED") and o.get("aktiv") and o.get("preis", 0.0) > B.kurs[sym])


def _haengend_seit(k, sym):
    """Seit wann (Ereignis-Takt der Prüf-Börse) hängt der jüngste ausgelöste STOP_LOSS_LIMIT über dem Kurs? −1 = keiner."""
    return max((o.get("haengt_takt", -1) for o in k.orders.values() if o["symbol"] == sym and o["typ"] == "STOP_LOSS_LIMIT"
                and o["status"] in ("NEW", "PARTIALLY_FILLED") and o.get("aktiv") and o.get("preis", 0.0) > B.kurs[sym]),
               default=-1)


def _haengend_unsichtbar(k, sym):
    """Coins unter einem hängenden STOP_LOSS_LIMIT, den Pilot 2.0 in der LETZTEN Spot-Auftragsliste dieses Symbols nicht sah (Verzögerung der
    Prüf-Börse, «sichtbar_ab»): er konnte von ihm nichts wissen."""
    return sum(o["qty"] - o["ausgefuehrt"] for o in k.orders.values() if o["symbol"] == sym and o["typ"] == "STOP_LOSS_LIMIT"
               and o["status"] in ("NEW", "PARTIALLY_FILLED") and o.get("aktiv") and o.get("preis", 0.0) > B.kurs[sym]
               and o["id"] in B.liste_verborgen.get(sym, ()))


def _limit_luecke(k, sym, luecke):
    """Unvermeidbare Limit-Lücke: Konto ohne STOP_LOSS, die Lücke ist genau ein über dem Kurs hängender STOP_LOSS_LIMIT, UND
    Pilot 2.0 konnte ihn nicht sehen: entweder zeigt die Liste ihn (Verzögerung) noch gar nicht, oder er hat die Spot-Auftragsliste nicht mehr
    gesehen, seit der Stop zu hängen begann (der Sprung kam nach seinem letzten Blick). Hat er die Liste danach gelesen und der Stop stand
    darin, hätte er den hängenden Stop erkennen und zum Markt aussteigen müssen → echter Befund — auch wenn sich der Kurs danach noch ein
    wenig bewegt hat (13. Prüfung K1: die Zeit zählt je Auftrag, nicht je Bewegung)."""
    if "STOP_LOSS" in B.stop_typen:
        return False
    if luecke <= _haengend_unsichtbar(k, sym) + STEP_S[sym]:  # Lücken-Lauf-Seed 112196: der hängende Stop stand noch nicht in der Liste
        return True
    return luecke <= _haengend(k, sym) + STEP_S[sym] and B.liste_takt.get(sym, -1) < _haengend_seit(k, sym)


DAUER_SPOT = ("/api/v3/order", "/api/v3/order/cancelReplace", "/api/v3/openOrders")
DAUER_PERP = ("/fapi/v1/order", "/fapi/v1/algoOrder", "/fapi/v1/openAlgoOrders")
DAUER_LESEN = ("/api/v3/account", "/fapi/v2/positionRisk")  # die Lage lesen braucht jede Seite
DAUER_PFADE = DAUER_SPOT + DAUER_PERP + DAUER_LESEN


def _schutzseite(befund):
    """Welche Seite bräuchte den fehlenden Schutz? Long/Coins → Spot-Stop, Short → Perp-Stop. Ein zu grosser Spot-Stop gefährdet
    den Short (er bräuchte seinen Perp-Stop), ein zu grosser Perp-Stop die Coins (sie bräuchten ihren Spot-Stop)."""
    if "SPOT_STOP_UEBER" in befund:
        return "perp"
    if "PERP_STOP_UEBER" in befund:
        return "spot"
    return "perp" if "SHORT" in befund else "spot"


_STOP_SPOT = ({"type": "STOP_LOSS", "side": "SELL", "symbol": "BTCUSDT"}, {"type": "STOP_LOSS_LIMIT", "side": "SELL", "symbol": "BTCUSDT"})
_STOP_PERP = ({"algoType": "CONDITIONAL", "type": "STOP_MARKET", "side": "BUY", "reduceOnly": "true", "symbol": "BTCUSDT"},)


def _dauer(regeln, befund=None, k=None, sym=None):
    """Lehnt Binance in diesem Schritt dauerhaft genau die SCHUTZ-HANDLUNG ab — einen neuen Stop der betroffenen Seite setzen
    (POST /api/v3/order mit Stop-Typ bzw. POST /fapi/v1/algoOrder, die Störungsregel muss einen solchen Auftrag treffen) — oder
    das Lesen der Lage (Konto, Position)? Nur das macht eine Lücke unvermeidbar. Dauerhaft abgelehnte Marktaufträge, Löschungen
    oder cancelReplace NICHT (12. Prüfung K1: so blieben vermeidbare Lücken versteckt), ebensowenig eine Störung auf dem
    Kurs-Abruf (10. Prüfung W4) oder auf den eigenen Auftragslisten (13. Prüfung W2: Pilot 2.0 sichert auch ohne Liste — über die
    Kennung im Buch, «zuerst setzen», beidseitig). Mit Befund: nur die Seite, die den Schutz bräuchte (11. Prüfung K3).
    Ausnahme (Lauf-Seed 324065 der Folge-Runde): sperrt ein HÄNGENDER Stop-Limit die Coins (k, sym), sind Löschen UND cancelReplace dauerhaft
    abgelehnt — dann lassen sich die Coins weder freigeben noch stoppen (jeder Weg ist zu), und die Lücke ist unvermeidbar (E42 meldet sie laut). Jede der beiden Störungen allein
    reicht nicht (K1)."""
    seite = None if befund is None else _schutzseite(befund)
    summe = {}  # Pfad → Summe der Ablehnungen aller Regeln, die ihn treffen (14. Prüfung, strenger Modus: endliche Anzahlen, die sich stapeln)
    for r in regeln:
        if r.get("art") in ("kurs", "teil", "spaet", "spaet_u", "unsichtbar"):
            continue
        treffer = False
        if r.get("pfad") in DAUER_LESEN and r.get("methode") in (None, "GET"):
            treffer = True
        elif r.get("methode") in (None, "POST"):
            ziele = (_STOP_SPOT if seite in (None, "spot") and r.get("pfad") == "/api/v3/order" else ()) + \
                (_STOP_PERP if seite in (None, "perp") and r.get("pfad") == "/fapi/v1/algoOrder" else ())
            treffer = any(r.get("pred") is None or r["pred"]("POST", r["pfad"], z) for z in ziele)
        if not treffer:
            continue
        n0 = r.get("anzahl0", r.get("anzahl", 1))  # die Börse zählt «anzahl» beim Verbrauch herunter: die ursprüngliche zählt
        if n0 >= 50:
            return True
        summe[r["pfad"]] = summe.get(r["pfad"], 0) + n0
    if k is not None and sym and seite in (None, "spot") and _haengend(k, sym) > 0:
        def tot(methode, pfad):
            return any(r.get("methode") in (None, methode) and r.get("pfad") == pfad and r.get("art") in ("429", "418", "vor503", "abriss_vor")
                       and r.get("anzahl0", r.get("anzahl", 1)) >= 50 for r in regeln)
        if tot("DELETE", "/api/v3/order") and tot("POST", "/api/v3/order/cancelReplace"):
            return True
    # mehrere endliche Störungen auf demselben Schutzpfad, zusammen mindestens so viele wie Pilot 2.0 Versuche hat (SCHUTZ_WARTEN): der
    # Schutz scheitert in diesem Lauf unvermeidbar (die Nachkontrolle holt ihn nach) — wie eine dauerhafte Störung
    return any(n >= len(L.SCHUTZ_WARTEN) + 1 for n in summe.values())


def _selbst_entfernt(ab, sym=None, befund=None):
    """Hat Pilot 2.0 seit B.log[ab] in diesem Markt selbst einen Stop DER BETROFFENEN SEITE entfernt — storniert (DELETE ok) oder per
    cancelReplace storniert, ohne dass der Ersatz kam (409)? Dann ist eine Lücke dort NICHT unvermeidbar — er hätte den
    funktionierenden Stop stehen lassen können (10. Prüfung W4). Betroffen ist die Seite, die den fehlenden Schutz bräuchte
    (_schutzseite: Long → Spot-Stops, Short → Perp-Stops, zu grosser Spot-Stop → Perp, zu grosser Perp-Stop → Spot). Ein
    cancelReplace mit Ersatz (neuer Stop oder ausgeführter Verkauf) zählt nicht."""
    seite = None if not befund else _schutzseite(befund)
    for x in B.log[ab:]:
        if sym and (x[3].get("symbol") or x[3].get("_symbol")) != sym:
            continue
        if x[3].get("_haengend"):
            continue  # ein ausgelöster, über dem Kurs hängender STOP_LOSS_LIMIT schützt nichts: ihn zu löschen oder zu ersetzen nimmt keinen Schutz weg (Folge-PR zur 14. Runde, E10)
        if x[1] == "DELETE" and x[2] == "/api/v3/order" and x[4] == 200 and seite != "perp":
            return True
        if x[1] == "DELETE" and x[2] == "/fapi/v1/algoOrder" and x[4] == 200 and seite != "spot":
            return True
        if x[1] == "POST" and x[2] == "/api/v3/order/cancelReplace" and x[4] == 409 and seite != "perp":
            return True
    return False


def sauber_schliessen(env, datei, versuche=2):
    """Not-Aus «10 Minuten später» (unklare Aufträge gelten dann als geklärt): → letztes Ergebnis."""
    alt = L.UNKLAR_MAX_ALTER_MS
    L.UNKLAR_MAX_ALTER_MS = -1
    B.n_listen += 1000  # 10 Minuten später zeigen die Listen jeden Auftrag (die Verzögerung «unsichtbar» gilt für Sekunden)
    try:
        r = None
        for _ in range(versuche):
            r = lauf([], env, datei, notaus=True)
            pending_abarbeiten()
            if r.get("alles_zu") is True:
                break
        return r
    finally:
        L.UNKLAR_MAX_ALTER_MS = alt


NK_EINMAL = int(os.environ.get("PRUEF_NK_EINMAL") or 0)  # 18. Folge-Runde: N >= 1 → statt EINER langen Nachkontrolle N Durchgänge im 10-Minuten-Takt (`einmal=True`, wie die Aufgabenplanung sie ruft)
NK_JUNG = os.environ.get("PRUEF_NK_JUNG") not in (None, "", "0")  # 20. Folge-Runde: mit PRUEF_NK_EINMAL — Durchgang 1 sieht unklare Aufträge als JUNG (< UNKLAR_MAX_ALTER_MS, wie direkt nach einem abgestürzten Tageslauf), erst die folgenden als alt
EINMAL_BUDGET = os.environ.get("PRUEF_EINMAL_BUDGET")  # 19. Folge-Runde: mit PRUEF_NK_EINMAL — Wiederholungs-Budget des Durchgangs in Sekunden; "0" = aufgebraucht (jeder vorübergehende Fehler zählt sofort, keine Wiederholung innerhalb des Durchgangs: der schlimmste Fall des 10-Minuten-Takts)


def nachkontrolle(env, datei):
    """Die Nachkontrolle nach einem Lauf/Not-Aus, «10 Minuten später» (unbekannte Aufträge gelten dann als nie ausgeführt).
    PRUEF_NK_EINMAL=N: N Durchgänge `einmal=True`, dazwischen vergehen je 10 Minuten (verspätete Aufträge kommen an, verzögert sichtbare Stops werden sichtbar) — der Takt der Aufgabenplanung statt der langen Fassung."""
    alt = L.UNKLAR_MAX_ALTER_MS
    L.UNKLAR_MAX_ALTER_MS = -1
    zeit = [0.0]  # simulierte Uhr: jeder Takt «dauert» NACHKONTROLLE_TAKT_S, nach NACHKONTROLLE_MAX_S ist Schluss

    def schlafen(s):
        zeit[0] += s
    try:
        if NK_EINMAL > 0:
            rn, zeilen, auftraege, warnung = None, [], [], False
            alt_w = (L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S)
            if EINMAL_BUDGET not in (None, ""):  # Budget «aufgebraucht» nachstellen: winzige, von null verschiedene Pausen + ein Budget darunter → `_pause` gibt beim ersten vorübergehenden Fehler auf
                L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S = (1e-6,) * len(alt_w[0]), (1e-6,) * len(alt_w[1]), float(EINMAL_BUDGET)
            try:
                for _i in range(NK_EINMAL):
                    L.UNKLAR_MAX_ALTER_MS = alt if (NK_JUNG and _i == 0) else -1   # (20. Folge-Runde) PRUEF_NK_JUNG: der erste Durchgang kennt das Alter-Limit des Produktionscodes
                    rn = L.nachkontrolle(env=env, datei=datei, schlafen=schlafen, uhr=lambda: zeit[0], einmal=True)
                    # was irgendein Durchgang meldete oder tat, zählt (die letzten Durchgänge haben meist nichts mehr zu tun) — AUSSER «nicht alles geklärt/gesichert»: ein früher Durchgang darf offen enden
                    # (ein verspäteter Auftrag ist erst im nächsten Takt sichtbar, ein Stop wird erst im zweiten Durchgang angenommen); massgebend ist der LETZTE Durchgang (19. Folge-Runde, camp19 Seed 1210012)
                    zeilen = [z_ for z_ in zeilen if "nicht alles geklärt" not in z_] + (rn.get("zeilen") or [])
                    auftraege += rn.get("auftraege") or []
                    warnung = warnung or bool(rn.get("warnung"))
                    pending_abarbeiten()
                    B.n_listen += 1000
            finally:
                L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S = alt_w
            return dict(rn, zeilen=zeilen, auftraege=auftraege, warnung=warnung)
        return L.nachkontrolle(env=env, datei=datei, schlafen=schlafen, uhr=lambda: zeit[0])
    finally:
        L.UNKLAR_MAX_ALTER_MS = alt


# ───────────────────────── Störungen ─────────────────────────
ZIELE_LAUF = [
    ("POST", "/api/v3/order", lambda m, p, q: q.get("type") == "MARKET", ["vor503", "nach503", "abriss", "abriss_vor", "429", "teil", "ablehnen"]),
    ("POST", "/api/v3/order", lambda m, p, q: q.get("type", "").startswith("STOP"), ["vor503", "nach503", "abriss", "abriss_vor", "429", "unsichtbar"]),
    ("DELETE", "/api/v3/order", None, ["vor503", "nach503", "abriss", "429"]),
    ("GET", "/api/v3/account", None, ["vor503", "abriss_vor", "429"]),
    ("GET", "/api/v3/openOrders", None, ["vor503", "abriss_vor", "429"]),
    ("GET", "/api/v3/order", None, ["vor503", "abriss_vor"]),
    ("GET", "/api/v3/ticker/price", None, ["vor503", "abriss_vor", "429"]),
    ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") != "true", ["vor503", "nach503", "abriss", "abriss_vor", "429", "spaet"]),
    ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") == "true", ["vor503", "nach503", "abriss", "abriss_vor", "429", "teil"]),
    ("POST", "/fapi/v1/algoOrder", None, ["vor503", "nach503", "abriss", "abriss_vor", "429", "unsichtbar"]),
    ("DELETE", "/fapi/v1/algoOrder", None, ["vor503", "nach503", "abriss", "429"]),
    ("GET", "/fapi/v1/openAlgoOrders", None, ["vor503", "abriss_vor", "429"]),
    ("GET", "/fapi/v2/positionRisk", None, ["vor503", "abriss_vor", "429"]),
    ("GET", "/fapi/v2/account", None, ["vor503", "abriss_vor", "429"]),
    ("POST", "/sapi/v1/asset/transfer", None, ["vor503", "nach503", "abriss"]),
    ("GET", "/fapi/v1/order", None, ["vor503", "abriss_vor"]),
    ("POST", "/fapi/v1/marginType", None, ["vor503", "429"]),
    ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") != "true", ["spaet_u"]),   # 9. Prüfung: unbekannt bis zur
    ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") == "true", ["spaet_u"]),   # verspäteten Ankunft
    ("POST", "/api/v3/order", lambda m, p, q: q.get("type") == "MARKET", ["spaet_u"]),
    ("POST", "/api/v3/order/cancelReplace", None, ["vor503", "nach503", "nur_storno", "429"]),
]
ZIELE_NOTAUS = [
    ("POST", "/api/v3/order", lambda m, p, q: q.get("type") == "MARKET", ["vor503", "nach503", "abriss", "429", "teil", "ablehnen"]),
    ("POST", "/api/v3/order", lambda m, p, q: q.get("type", "").startswith("STOP"), ["vor503", "nach503", "429", "unsichtbar"]),
    ("DELETE", "/api/v3/order", None, ["vor503", "nach503", "429"]),
    ("GET", "/api/v3/account", None, ["vor503", "abriss_vor", "429"]),
    ("GET", "/api/v3/openOrders", None, ["vor503", "429"]),
    ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") == "true", ["vor503", "nach503", "abriss", "429", "teil"]),
    ("POST", "/fapi/v1/algoOrder", None, ["vor503", "nach503", "429", "unsichtbar"]),
    ("DELETE", "/fapi/v1/algoOrder", None, ["vor503", "429"]),
    ("GET", "/fapi/v1/openAlgoOrders", None, ["vor503", "429"]),
    ("GET", "/fapi/v2/positionRisk", None, ["vor503", "abriss_vor", "429"]),
    ("GET", "/fapi/v2/account", None, ["vor503", "429"]),
    ("GET", "/api/v3/ticker/price", None, ["vor503", "429"]),
    ("POST", "/sapi/v1/asset/transfer", None, ["vor503", "nach503"]),
    ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") == "true", ["spaet_u"]),
    ("POST", "/api/v3/order", lambda m, p, q: q.get("type") == "MARKET", ["spaet_u"]),
    ("POST", "/api/v3/order/cancelReplace", None, ["vor503", "nach503", "nur_storno", "429"]),
]


def zufall_regeln(rng, n, kurse, ziele=ZIELE_LAUF, haerte=1.0):
    regeln = []
    for _ in range(n):
        if rng.random() < 0.15:  # Kurssprung mitten im Lauf
            sym = rng.choice(SYMS)
            faktor = 1 + rng.choice([-1, 1]) * rng.uniform(0.003, 0.12)
            regeln.append(dict(art="kurs", sym=sym, preis=round(kurse[sym] * faktor, 2), anzahl=1, ab_req=B.n_req + rng.randint(1, 120)))
            continue
        m, pfad, pred, arten = rng.choice(ziele)
        art = rng.choice(arten)
        if STRENG and haerte <= 1:  # endliche Anzahlen: Schutz ist dann immer möglich, jede Lücke nach der Nachkontrolle ein Befund
            anzahl = rng.choice([1, 1, 2, 3, 4])
        else:
            anzahl = rng.choice([1, 1, 1, 2, 3, 99 if haerte > 1 or rng.random() < 0.3 else 2])
        r = dict(methode=m, pfad=pfad, pred=pred, art=art, anzahl=anzahl, anzahl0=anzahl)
        if rng.random() < (0.25 if STRENG else 0.6):
            r["ab_req"] = B.n_req + rng.randint(1, 80 if STRENG else 150)
        if art == "unsichtbar":
            r["listen"] = rng.choice([1, 2, 3, 4, 5, 8] if STRENG else [1, 2, 3])
        if art == "teil":
            r["anteil"] = rng.choice([0.3, 0.5, 0.9])
        if art == "spaet":
            r["nach"] = rng.randint(1, 30)
        regeln.append(r)
    return regeln


def signal(rng, m, kurs_heute, kurs_gestern):
    z = rng.choice([-1.0, -0.5, -0.25, 0.0, 0.0, 0.25, 0.5, 1.0, round(rng.uniform(-1, 1), 3)])
    basis = kurs_gestern if rng.random() < 0.5 else kurs_heute
    abst = rng.uniform(0.02, 0.12)
    e = {"markt": m, "hebel": z, "stop_long": round(basis * (1 - abst), 2), "stop_short": round(basis * (1 + abst), 2), "stand": "x"}
    if rng.random() < 0.04:
        e["stop_long"] = None
    if rng.random() < 0.04:
        e["stop_short"] = None
    return e


def _klassieren(befunde, erg, kontext, dauer=False, storno=False):
    """dauer: Binance lehnte in diesem Schritt dauerhaft ab — eine LAUT gemeldete Lücke ist dann unvermeidbar (DAUER_).
    dauer darf eine Funktion des Befunds sein (z. B. je Markt: hat Pilot 2.0 dort selbst einen Stop entfernt?).
    storno: die Börse spielte die ungünstige cancelReplace-Lesart «erst stornieren, dann ablehnen» und tat es in diesem Schritt
    (409) — eine LAUT gemeldete Lücke heisst dann STORNO_ZUERST_* (Restrisiko, Testnetz-Prüfpunkt B). Stille bleiben echt."""
    laut = bool(erg.get("warnung"))
    vermerkt, gelesen = kontext.get("vermerkt"), kontext.get("gelesen") or []  # für die Nachkontrolle vermerkte Märkte / Märkte, deren Spot-Liste der Lauf angesehen hat (nur im Tageslauf)
    out = []
    for b in befunde:
        d_ = dauer(b) if callable(dauer) else dauer
        vor = (("DAUER_" if d_ else "") + "LAUT_") if laut else "STILL_"
        name, coin = b[0], b[1][:-4] if isinstance(b[1], str) else None
        if vermerkt is not None and "LIMIT_LUECKE_" in name and coin not in vermerkt and coin not in gelesen:
            # (16. Prüfung) «Lücke durch einen hängenden Stop-Limit» ist nur entschuldigt, wenn der Lauf den Markt angesehen hat (der Sprung kam NACH seinem letzten Blick: unvermeidbar) oder für die
            # Nachkontrolle vermerkt hat. Sah er den Markt nie an und vermerkte nichts (F-a: «Konto nicht lesbar» beendete den Lauf), bleibt die Lücke bis zum nächsten Tageslauf — das Etikett entschuldigte es
            name = name.replace("LIMIT_LUECKE_", "", 1)
        vorsorge = (laut and b[0] == "SPOT_STOP_UEBER_NETTO" and vermerkt is not None and coin in vermerkt
                    and any(f"{coin}: ein alter Short-Stop hat ausgelöst, Kontostand danach nicht lesbar" in z for z in erg.get("zeilen", [])))
        # VORSORGE_: der Lauf setzte bewusst einen Vorsorge-Stop (ein alter Short-Stop schien ausgelöst, der Kontostand war nicht lesbar) und hat den Markt für die Nachkontrolle vermerkt — die
        # Nachkontrolle räumt ihn ab (dokumentiertes Restrisiko, README: nach einer verlorenen Löschantwort sieht ein eigenes Löschen wie ein Auslösen aus)
        out.append((("VORSORGE_" if vorsorge else "") + ("STORNO_ZUERST_" if storno and laut else "") + vor + name, kontext, b))
    return out


def _storno409(ab, sym=None):
    """Kam seit B.log[ab] GENAU EIN cancelReplace mit 409 (storniert, Ersatz abgelehnt) — je Markt (sym) bzw. in keinem Markt mehr
    als einer? Nur dieser erste ist das Restrisiko «Storno zuerst»; ein zweiter danach wäre vermeidbar gewesen (nach einer
    Ablehnung ersetzt Pilot 2.0 nichts mehr per cancelReplace — 12. Prüfung W2/K2)."""
    zahl = {}
    for x in B.log[ab:]:
        if x[1] == "POST" and x[2] == "/api/v3/order/cancelReplace" and x[4] == 409:
            s = x[3].get("symbol")
            zahl[s] = zahl.get(s, 0) + 1
    if sym is not None:
        return zahl.get(sym, 0) == 1
    return bool(zahl) and max(zahl.values()) == 1


# ───────────────────────── Fuzzer: Schutz-Monotonie (10. Prüfung) ─────────────────────────
def ungesichert(k, sym):
    """(Long, Short) in USDT, die über die eigenen Stops hinaus ungesichert sind."""
    g = lage(k, sym)
    lang = max(0.0, min(g["netto"], g["coins"]) - g["s_qty"]) if g["netto"] > 0 else 0.0
    kurz = max(0.0, -g["netto"] - g["p_qty"]) if g["netto"] < 0 else 0.0
    return lang * g["kurs"], kurz * g["kurs"]


def monotonie_runde(seed):
    """In einer Phase «nur Stornieren» (alle NEUEN Aufträge abgelehnt, Storno und Lesen gehen) kann sich keine Position ändern —
    also darf auch kein Schutz verloren gehen (ein Fund heisst: Pilot 2.0 hat einen funktionierenden Stop ersatzlos entfernt).
    In 30 % der Seeds die ungünstige Binance-Lesart von cancelReplace: erst Storno, dann Ablehnung (409) — Verluste daraus
    heissen STORNO_ZUERST_* (Testnetz-Prüfpunkt; nur bei cancelReplace-Antwort 409 im Lauf). In der Hälfte der Seeds beginnt
    die Phase erst mitten im Lauf: geprüft wird dann, ob Pilot 2.0 seit Phasenbeginn selbst einen Stop entfernt hat und die
    Seite danach ungesichert ist (SCHUTZ_VERLOREN_MITTEN_*)."""
    rng = random.Random(seed)
    k = neues_konto(rng.choice([2500, 8000, 20000]))
    d = neu_buch()
    ms = rng.choice([["BTC"], ["ETH"], ["BTC", "ETH"]])
    z1 = {m: rng.choice([-1.0, -0.5, -0.25, 0.25, 0.5, 1.0]) for m in ms}
    lauf([E(m, z1[m]) for m in ms], env_echt(), d)
    if rng.random() < 0.5:  # Vortag mit Störung → evtl. zwei Spot-Stops (Stop + Zusatz-Stop)
        B.regeln = [dict(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=99)]
        lauf([E(m, z1[m] + rng.choice([0, 0.25, 0.5])) for m in ms], env_echt(), d)
        B.regeln = []
    vor = {m: ungesichert(k, m + "USDT") for m in ms}
    z2 = {m: rng.choice([-1.0, -0.5, -0.25, 0.0, 0.25, 0.5, 1.0]) for m in ms}
    ab = {m: rng.choice([0.06, 0.08, 0.10, 0.12]) for m in ms}
    storno = rng.random() < 0.3
    B.ersetzen_storno_zuerst = storno
    # in der Hälfte der Seeds beginnt die Phase erst MITTEN im Lauf (11. Prüfung K3; eigener Zufall — alte Seeds bleiben gleich):
    # davor darf gehandelt werden, ab dann darf kein funktionierender Stop mehr ersatzlos verschwinden
    mitten = random.Random(f"{seed}-mitten").random() < 0.5
    ab_req = B.n_req + random.Random(f"{seed}-ab").randint(2, 60) if mitten else None
    # «Storno zuerst»: cancelReplace selbst geht durch, erst der neue Auftrag darin scheitert (die Regel auf /api/v3/order)
    pfade = ("/api/v3/order", "/fapi/v1/order", "/fapi/v1/algoOrder") + (() if storno else ("/api/v3/order/cancelReplace",))
    B.regeln = [dict(methode="POST", pfad=p_, art=rng.choice(["vor503", "429"]), anzahl=10 ** 6) for p_ in pfade]
    if rng.random() < 0.3:
        B.regeln.append(dict(methode="GET", pfad=rng.choice(["/fapi/v1/openAlgoOrders", "/api/v3/openOrders"]), art="vor503",
                             anzahl=10 ** 6))
    phase_log = [None]
    if mitten:
        for r_ in B.regeln:
            r_["ab_req"] = ab_req

        def haken(m, pfad, p):
            if phase_log[0] is None and B.n_req >= ab_req:
                phase_log[0] = len(B.log)
        B.vor_jeder_anfrage = haken
    log0 = len(B.log)
    kx = {"seed": seed, "z1": z1, "z2": z2, "storno_zuerst": storno, "mitten": mitten}
    try:
        r = lauf([E(m, z2[m], stop_abstand=ab[m]) for m in ms], env_echt(), d)
    except Exception:  # noqa: BLE001
        return [("AUSNAHME", kx, traceback.format_exc()[-600:])]
    finally:
        B.regeln = []
        B.ersetzen_storno_zuerst = False
        B.vor_jeder_anfrage = None
    funde = []
    if mitten:
        if phase_log[0] is None:  # die Phase begann erst nach dem Lauf: nichts zu prüfen
            return funde
        for m in ms:
            teil409 = _storno409(phase_log[0], m + "USDT") and r.get("warnung")  # nur der erste 409 je Markt, laut gemeldet
            nach = ungesichert(k, m + "USDT")
            for seite, b in (("LONG", nach[0]), ("SHORT", nach[1])):
                if b > STAUB_MAX_USDT and _selbst_entfernt(phase_log[0], m + "USDT", seite):
                    funde.append((("STORNO_ZUERST_" if storno and teil409 else "") + "SCHUTZ_VERLOREN_MITTEN_" + seite,
                                  dict(kx, markt=m, lage=zeigen(k), zeilen=r["zeilen"][-8:]), (m, round(b, 2))))
        return funde
    for m in ms:
        teil409 = _storno409(log0, m + "USDT") and r.get("warnung")  # nur der erste 409 je Markt, laut gemeldet
        nach = ungesichert(k, m + "USDT")
        for seite, a, b in (("LONG", vor[m][0], nach[0]), ("SHORT", vor[m][1], nach[1])):
            if b > a + STAUB_MAX_USDT:
                funde.append((("STORNO_ZUERST_" if storno and teil409 else "") + "SCHUTZ_VERLOREN_" + seite,
                              dict(kx, markt=m, lage=zeigen(k), zeilen=r["zeilen"][-8:]), (m, round(a, 2), round(b, 2))))
    return funde


# ───────────────────────── Fuzzer: Läufe über viele Tage ─────────────────────────
def laeufe_runde(seed, tage=30):
    rng = random.Random(seed)
    echt = rng.random() < 0.8
    usdt = rng.choice([400, 900, 2500, 8000, 20000, 60000])
    kurs0 = {"BTCUSDT": rng.choice([60000.0, 100000.0, 115000.0]), "ETHUSDT": rng.choice([2500.0, 4000.0])}
    k = neues_konto(usdt, keys=("k",) if echt else ("s", "f"), kurs=kurs0)
    B.konto_anlegen(("k2",), GEHEIM, 999, 5000.0)  # fremdes Konto
    if not echt:
        k.fut = usdt
    if rng.random() < 0.15:
        k.bnb_gebuehr = True
        k.frei["BNB"] = 0.5
    if LUECKEN or rng.random() < 0.15:  # Konto/Paar ohne STOP_LOSS (Markt-Stop): Pilot 2.0 nimmt STOP_LOSS_LIMIT (kann bei Lücken hängen)
        B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d = neu_buch()
    funde = []
    max_auftrag = rng.choice(["100000", "100000", "1000", "300"])
    maerkte_wahl = rng.choice([["BTC"], ["ETH"], ["BTC", "ETH"], ["BTC", "ETH"]])
    gestern = dict(B.kurs)
    stop_aktiv = False

    def env_heute(key="k"):
        return env_echt(key=key, kapital=usdt, KI_BOT_MAX_AUFTRAG=max_auftrag) if echt else env_test(KI_BOT_MAX_AUFTRAG=max_auftrag)

    for tag in range(tage):
        if rng.random() < 0.1:
            maerkte_wahl = rng.choice([["BTC"], ["ETH"], ["BTC", "ETH"]])
        ents = [signal(rng, m, B.kurs[m + "USDT"], gestern[m + "USDT"]) for m in maerkte_wahl]
        gestern = dict(B.kurs)
        B.regeln = zufall_regeln(rng, rng.choice([0, 0, 1, 2, 3, 5]), B.kurs)
        aktiv_regeln = [r["art"] for r in B.regeln]
        regeln_tag = list(B.regeln)
        B.ersetzen_storno_zuerst = random.Random(f"{seed}-{tag}-storno").random() < 0.15  # ungünstige cancelReplace-Lesart
        stop_mitten = rng.random() < 0.04
        if stop_mitten:
            zaehler = [rng.randint(3, 60)]

            def haken(m, pfad, p, code):
                zaehler[0] -= 1
                if zaehler[0] == 0:
                    BF.STOP_DATEI.write_text("")
            B.nach_jeder_anfrage = haken
        try:
            _b = json.loads(d.read_text()).get("echt") if d.exists() else None
        except ValueError:
            _b = None
        fremd = echt and (_b or {}).get("start") and (_b or {}).get("uid") == 4711 and rng.random() < 0.03
        log0 = len(B.log)
        takt0 = dict(B.liste_takt)  # Stand der Spot-Listen-Abfragen vor dem Lauf: was hat der Lauf angesehen?
        kontext = {"seed": seed, "tag": tag, "echt": echt, "regeln": aktiv_regeln, "ents": [(e["markt"], e["hebel"]) for e in ents],
                   "fremd": bool(fremd), "stop_mitten": stop_mitten}
        trocken = rng.random() < 0.05
        vor_buch = d.read_text() if d.exists() else None
        try:
            erg = lauf(ents, env_heute("k2" if fremd else "k"), d, trocken=trocken)
        except Exception:  # noqa: BLE001
            funde.append(("AUSNAHME", kontext, traceback.format_exc()[-800:]))
            erg = {"warnung": True, "zeilen": [], "alles_zu": None}
        B.regeln = []
        B.nach_jeder_anfrage = None
        # «Storno zuerst» = Binance storniert den alten Stop und lehnt den neuen danach ab (409): die Börsen-Lesart ersetzen_storno_zuerst ODER die Störung
        # «nur_storno» (derselbe Ausgang, gezielt erzeugt) — dasselbe Restrisiko, Testnetz-Prüfpunkt B (15. Prüfung K-c: Seed 30583 galt als echter Befund)
        storno_tag = (B.ersetzen_storno_zuerst or any(r_.get("art") == "nur_storno" for r_ in regeln_tag)) and _storno409(log0)
        B.ersetzen_storno_zuerst = False
        if stop_mitten and BF.STOP_DATEI.exists():
            BF.STOP_DATEI.unlink()
            stop_aktiv = True
        kontext["zeilen"] = erg.get("zeilen", [])[-12:]
        # (16. Prüfung) was der Lauf für die Nachkontrolle vermerkt und was er angesehen hat — nur für die Tageslauf-Einstufung (der Not-Aus schliesst in der Nachkontrolle ohnehin in jedem Takt nochmals)
        tag_info = {"vermerkt": vermerkt_je_markt(d), "gelesen": sorted(s_[:-4] for s_ in SYMS if B.liste_takt.get(s_, -1) > takt0.get(s_, -1))}
        if not fremd and not trocken:  # Stand, wie der Lauf ihn verlässt — verspätete Aufträge noch unterwegs
            funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), erg, dict(kontext, wann="nach Lauf (vor Ankunft)", lage=zeigen(k), **tag_info),
                                 lambda b, log0=log0: _dauer(regeln_tag, b[0], k, b[1]) and not _selbst_entfernt(log0, b[1], b[0]),
                                 storno=storno_tag)
        pending_abarbeiten()  # verspätete Aufträge kommen an …
        if not fremd and not trocken:
            try:  # … und die Nachkontrolle (pilot.py --nachkontrolle nach jedem Lauf) klärt sie und setzt die Stops
                rn = nachkontrolle(env_heute(), d)
                if any("nicht alles geklärt" in z for z in rn.get("zeilen", [])):  # ohne Störung muss sie fertig werden
                    funde.append(("NACHKONTROLLE_OFFEN", dict(kontext, wann="Nachkontrolle", zeilen=rn["zeilen"][-6:]), zeigen(k)))
            except Exception:  # noqa: BLE001
                funde.append(("AUSNAHME", dict(kontext, wann="Nachkontrolle"), traceback.format_exc()[-800:]))
                rn = {"warnung": True}
            erg = dict(erg, warnung=erg.get("warnung") or rn.get("warnung"))
        if trocken and (B.log[log0:] or (d.read_text() if d.exists() else None) != vor_buch):
            funde.append(("TROCKEN", kontext, B.log[log0:][:3]))
        fremde_schreib = [x for x in B.log[log0:] if x[5] == 999]
        if fremde_schreib:
            funde.append(("FREMD", kontext, fremde_schreib[:3]))
        funde += [("TRANSFER", kontext, v) for v in B.verletzungen if v[0] == "TRANSFER-TYP"]
        B.verletzungen = [v for v in B.verletzungen if v[0] != "TRANSFER-TYP"]
        if not fremd and not trocken:
            kontext["lage"] = zeigen(k)
            # (17. Prüfung K5) NACH der Nachkontrolle zählt der Vermerk von JETZT (sie löscht ihn, wenn sie fertig wird), nicht der vom Laufende: sonst entschuldigte VORSORGE_ eine Lücke, die sie hätte räumen müssen
            tag_info_nach = {"vermerkt": vermerkt_je_markt(d), "gelesen": sorted(s_[:-4] for s_ in SYMS)}
            funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), erg, dict(kontext, wann="nach Lauf", **tag_info_nach))
            funde += _klassieren(folgeschaden(k), erg, dict(kontext, wann="Folgeschaden nach Lauf"))
        # Markt bis morgen (Stops lösen unterwegs aus), Funding
        for sym in SYMS:
            ret = rng.gauss(0, 0.03)
            if rng.random() < (0.24 if LUECKEN else 0.08):
                ret = rng.choice([-1, 1]) * rng.uniform(0.10, 0.35)
            ziel = B.kurs[sym] * (1 + ret)
            for i in range(1, 4):
                B.bewegen(sym, round(B.kurs[sym] + (ziel - B.kurs[sym]) * i / 3, 2))
        B.funding(rng.uniform(-0.0003, 0.0006))
        if stop_aktiv or rng.random() < 0.12:  # Not-Aus (zufällig oder weil er mitten im Lauf kam), mit harten Störungen
            stop_aktiv = False
            B.regeln = zufall_regeln(rng, rng.choice([0, 1, 2, 3, 4]), B.kurs, haerte=2.0)
            regeln_na, log_na = list(B.regeln), len(B.log)
            kx = dict(kontext, wann="Not-Aus", regeln=[r["art"] for r in B.regeln])
            try:
                r = lauf([], env_heute(), d, notaus=True)
            except Exception:  # noqa: BLE001
                funde.append(("AUSNAHME", kx, traceback.format_exc()[-800:]))
                r = {"alles_zu": False, "warnung": True, "zeilen": []}
            B.regeln = []
            if r.get("alles_zu") is not True:  # Stand direkt nach dem Not-Aus (verspätete Aufträge noch unterwegs)
                funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), r, dict(kx, wann="Not-Aus (vor Ankunft)", lage=zeigen(k)),
                                     lambda b, log_na=log_na, regeln_na=regeln_na: _dauer(regeln_na, b[0], k, b[1])
                                     and not _selbst_entfernt(log_na, b[1], b[0]))
            pending_abarbeiten()
            if r.get("alles_zu") is not True:  # stop.bat/Tagesaufgabe: Nachkontrolle im Not-Aus-Modus schliesst Verspätetes
                try:
                    rn = nachkontrolle(dict(env_heute(), KI_BOT_STOP="1"), d)
                    r = rn if rn.get("alles_zu") is not None else r
                except Exception:  # noqa: BLE001
                    funde.append(("AUSNAHME", dict(kx, wann="Nachkontrolle Not-Aus"), traceback.format_exc()[-800:]))
            kx["zeilen"], kx["lage"] = r.get("zeilen", [])[-14:], zeigen(k)
            # Fuzzer-Artefakt (Lauf-Seed 312454 der Folge-Runde, wie E38): der Tageslauf mit dem STOP mitten im Lauf liess einen Coin-Rest UNTER dem Binance-Minimum liegen («unter dem Binance-Minimum» in seinen Zeilen),
            # ein Kurssprung danach machte ihn verkäuflich — den verkauft der Not-Aus nie von selbst (das Buch kennt ihn nicht)
            if r.get("alles_zu") is True and not flach(k) and not _nur_coins_uebrig(k, r, "unter dem Binance-Minimum", marke=not echt):
                funde.append(("FALSCH_ALLES_ZU", kx, zeigen(k)))
            if r.get("alles_zu") is not True:
                funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), r, kx)
                funde += _klassieren(folgeschaden(k), r, dict(kx, wann="Folgeschaden nach Not-Aus"))
            if r.get("alles_zu") is True and k.fut > 1 and echt:  # Nutzer verschiebt den Rest von Hand (sonst Startprüfung)
                k.frei["USDT"] += k.fut
                k.fut = 0.0
    try:  # Ende: sauberer Not-Aus, 10 Minuten später
        r = sauber_schliessen(env_heute(), d)
        # Coins, die das Buch nicht kennt (früher unter dem Binance-Minimum liegen geblieben, durch den Kursanstieg wieder verkäuflich), verkauft
        # der Not-Aus nie von selbst — er meldet sie. Kein Befund, solange keine Position und kein eigener Stop mehr da ist (14. Prüfung,
        # strenger Modus: Lauf-Seeds 20535, 20549)
        nur_fremde_coins = (all(abs(lage(k, s_)["pos"]) < 1e-12 and not lage(k, s_)["n_s"] and not lage(k, s_)["n_p"] for s_ in SYMS)
                            and (any("das Buch kennt es nicht" in z for z in r.get("zeilen") or []) or (MINIMUM_GESEHEN[0] and not echt)))
        if r.get("alles_zu") is True:
            if not flach(k) and not nur_fremde_coins:
                funde.append(("FALSCH_ALLES_ZU", {"seed": seed, "wann": "Ende", "zeilen": r["zeilen"]}, zeigen(k)))
        elif not nur_fremde_coins:
            funde.append(("ENDE_NICHT_ZU", {"seed": seed, "wann": "Ende", "zeilen": r.get("zeilen")}, zeigen(k)))
    except Exception:  # noqa: BLE001
        funde.append(("AUSNAHME", {"seed": seed, "wann": "Ende"}, traceback.format_exc()[-800:]))
    return funde


# ───────────────────────── Fuzzer: Not-Aus unter harten Störungen ─────────────────────────
def _kurssprung(rng, anteil=0.25):
    """12. Prüfung W3: in einem Teil der Not-Aus springt der Kurs GENAU beim ersten Schutz-Stop um 5,5–15 % (über den Not-Stop-
    Abstand hinaus), oft zusammen mit gesperrtem Spot-Ticker UND gestörtem Futures-Markpreis — der Weg Schutz-Stop → «würde
    sofort auslösen» → zum Markt, den die übrigen Störungen kaum treffen."""
    if rng.random() >= anteil:
        return
    modus, faktor = rng.choice(["perp", "spot", "beide"]), rng.uniform(1.055, 1.15)
    weg, dauer = rng.random() < 0.6, rng.choice([3, 10 ** 6])
    gemacht = [0]

    def haken(m, pfad, p):
        if gemacht[0] or m != "POST":
            return
        perp = pfad == "/fapi/v1/algoOrder" and modus in ("perp", "beide")
        spot = pfad == "/api/v3/order" and str(p.get("type", "")).startswith("STOP") and modus in ("spot", "beide")
        if not (perp or spot):
            return
        gemacht[0] = 1
        s = p.get("symbol")
        B.bewegen(s, round(B.kurs[s] * (faktor if perp else 1 / faktor), 2))
        if weg:
            B.regeln.append(dict(methode="GET", pfad="/api/v3/ticker/price", art="429", anzahl=dauer))
            B.regeln.append(dict(methode="GET", pfad="/fapi/v1/premiumIndex", art="vor503", anzahl=dauer))
    B.vor_jeder_anfrage = haken


def _nur_coins_uebrig(k, r, text, marke=False):
    """Fuzzer-Artefakt (Lücken-Not-Aus-Seed 214517): keine Position, kein eigener Stop — nur ein Coin-Rest, den der Not-Aus WEGEN seines Zustands nicht verkaufte (`text` in seinen Zeilen: «unter dem
    Binance-Minimum» im ersten, «das Buch kennt es nicht» im sauberen Not-Aus danach). Ein Kurssprung NACH dem Entscheid macht den Rest erst später verkäuflich (flach() rechnet mit dem Schlusskurs): kein Befund.
    marke (nur Konten ohne echtes Geld, deren Not-Aus den Rest gar nicht erst meldet — Lauf-Seed 312454): reicht es, dass IRGENDEIN Lauf dieser Runde den Rest «unter dem Binance-Minimum» liegen liess (MINIMUM_GESEHEN)."""
    return (all(abs(lage(k, s_)["pos"]) < 1e-12 and not lage(k, s_)["n_s"] and not lage(k, s_)["n_p"] for s_ in SYMS)
            and (any(text in z for z in (r.get("zeilen") or [])) or (marke and MINIMUM_GESEHEN[0])))


def notaus_runde(seed):
    rng = random.Random(seed)
    echt = rng.random() < 0.85
    usdt = rng.choice([900, 5000, 20000, 60000])
    k = neues_konto(usdt, keys=("k",) if echt else ("s", "f"))
    if LUECKEN:  # PRUEF_LUECKEN=1: Konto ohne STOP_LOSS, die Kurse springen öfter — ausgelöste STOP_LOSS_LIMIT hängen, der Not-Aus trifft sie an
        B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    if not echt:
        k.fut = usdt
    d = neu_buch()
    env = env_echt(kapital=usdt) if echt else env_test()
    for _ in range(rng.randint(1, 4)):
        ents = []
        for m in rng.choice([["BTC"], ["ETH"], ["BTC", "ETH"]]):
            p = B.kurs[m + "USDT"]
            a = rng.uniform(0.02, 0.1)
            ents.append({"markt": m, "hebel": rng.choice([-1, -0.5, 0, 0, 0.25, 0.5, 1]), "stop_long": p * (1 - a),
                         "stop_short": p * (1 + a), "stand": "x"})
        lauf(ents, env, d)
        for s in SYMS:
            ret = rng.gauss(0, 0.02)
            if LUECKEN and rng.random() < 0.3:
                ret = rng.choice([-1, 1]) * rng.uniform(0.10, 0.35)
            B.bewegen(s, round(B.kurs[s] * (1 + ret), 2))
    regeln = []
    for _ in range(rng.choice([1, 2, 3, 4, 6])):
        if rng.random() < 0.25:
            s = rng.choice(SYMS)
            regeln.append(dict(art="kurs", sym=s, preis=round(B.kurs[s] * (1 + rng.choice([-1, 1]) * rng.uniform(0.001, 0.08)), 2),
                               anzahl=1, ab_req=B.n_req + rng.randint(1, 40)))
            continue
        m, pfad, pred, arten = rng.choice(ZIELE_NOTAUS)
        r = dict(methode=m, pfad=pfad, pred=pred, art=rng.choice(arten), anzahl=rng.choice([1, 2, 3, 99]))
        r["anzahl0"] = r["anzahl"]
        if rng.random() < (0.25 if STRENG else 0.5):
            r["ab_req"] = B.n_req + rng.randint(1, 40)
        if r["art"] == "teil":
            r["anteil"] = rng.choice([0.3, 0.5])
        if r["art"] == "unsichtbar":
            r["listen"] = rng.choice([1, 2, 3, 4, 5, 8] if STRENG else [1, 2])
        regeln.append(r)
    B.regeln = regeln
    log_na = len(B.log)
    B.ersetzen_storno_zuerst = random.Random(f"{seed}-storno").random() < 0.15  # ungünstige cancelReplace-Lesart
    _kurssprung(random.Random(f"{seed}-kurssprung"))  # eigener Zufall: alte Seeds bleiben gleich
    vorher = zeigen(k)
    try:
        r = lauf([], env, d, notaus=True)
    except Exception:  # noqa: BLE001
        B.regeln = []
        B.ersetzen_storno_zuerst = False
        B.vor_jeder_anfrage = None
        return [("AUSNAHME", {"seed": seed}, traceback.format_exc()[-600:])]
    B.regeln = []
    B.vor_jeder_anfrage = None
    storno = (B.ersetzen_storno_zuerst or any(r_.get("art") == "nur_storno" for r_ in regeln)) and _storno409(log_na) and r.get("warnung")  # auch «nur_storno» (15. Prüfung K-c)
    B.ersetzen_storno_zuerst = False
    funde = []
    if r["alles_zu"] is not True:  # Stand direkt nach dem Not-Aus (verspätete Aufträge noch unterwegs)
        funde += [(("STORNO_ZUERST_" if storno else "")
                   + ("DAUER_" if _dauer(regeln, b[0], k, b[1]) and r.get("warnung") and not _selbst_entfernt(log_na, b[1], b[0]) else "") + b[0],
                   {"seed": seed, "wann": "vor Ankunft", "lage": zeigen(k), "zeilen": r["zeilen"][-10:]}, b)
                  for b in schutz_befunde(k, unklar_je_markt(d))]
    pending_abarbeiten()
    if r["alles_zu"] is not True:  # Nachkontrolle im Not-Aus-Modus (stop.bat, Tagesaufgabe) schliesst Verspätetes
        rn = nachkontrolle(dict(env, KI_BOT_STOP="1"), d)
        r = rn if rn.get("alles_zu") is not None else r
    kx = {"seed": seed, "echt": echt, "regeln": [x["art"] for x in regeln], "vorher": vorher, "nachher": zeigen(k),
          "zeilen": r["zeilen"][-10:]}
    if r["alles_zu"] is True and not flach(k) and not _nur_coins_uebrig(k, r, "unter dem Binance-Minimum", marke=not echt):
        funde.append(("FALSCH_ALLES_ZU", kx, None))
    if r["alles_zu"] is not True:
        funde += [(b[0], kx, b) for b in schutz_befunde(k, unklar_je_markt(d)) + folgeschaden(k)]
    r2 = sauber_schliessen(env, d)
    if (r2["alles_zu"] is not True or not flach(k)) and not _nur_coins_uebrig(k, r2, "das Buch kennt es nicht"):
        funde.append(("SAUBER_NICHT_ZU", dict(kx, zeilen2=r2["zeilen"]), zeigen(k)))
    return funde


def listen_runde(seed):
    """Listen-Fuzzer (13. Prüfung, nach dem Fuzzer des Prüfers): 2–6 Tage mit wechselnder Richtung; an 60 % der Tage ist EINE
    Auftragsliste ab einer zufälligen Anfrage dauerhaft gestört (Setzen und Löschen gehen weiter). Lücke nach Lauf UND
    Nachkontrolle = Befund (keine DAUER-Ausnahme). In der Hälfte der Seeds zum Schluss ein Not-Aus mit gestörter Liste (manchmal
    dazu ein abgelehnter Rückkauf/Verkauf): bleibt etwas ungeschützt, ist das ein Befund — ausser Binance lehnt dauerhaft genau den
    nötigen Schutz ab (DAUER_, wie im Not-Aus-Fuzzer; laut gemeldet); nach Ankunft und Nachkontrolle zählt alles."""
    rng = random.Random(seed)
    k = neues_konto(rng.choice([5000, 20000, 60000]))
    d = neu_buch()
    env = env_echt(kapital=k.frei["USDT"])
    funde = []
    for tag in range(rng.randint(2, 6)):
        ents = [E(m, rng.choice([-1, -0.5, -0.25, 0, 0.25, 0.5, 1]), stop_abstand=rng.uniform(0.03, 0.12))
                for m in rng.choice([["BTC"], ["ETH"], ["BTC", "ETH"]])]
        stoer = rng.random() < 0.6
        if stoer:
            B.regeln = [dict(methode="GET", pfad=rng.choice(["/fapi/v1/openAlgoOrders", "/api/v3/openOrders"]), pred=None,
                             art=rng.choice(["vor503", "429"]), anzahl=10 ** 6, ab_req=B.n_req + rng.randint(1, 60))]
            if STRENG and rng.random() < 0.5:  # 14. Prüfung W(b): auch im Listen-Fuzzer springt der Kurs mitten im Tag (meist hoch)
                s_ = rng.choice(SYMS)
                B.regeln.append(dict(art="kurs", sym=s_, preis=round(B.kurs[s_] * (1 + rng.choice([1, 1, -1]) * rng.uniform(0.01, 0.12)), 2),
                                     anzahl=1, ab_req=B.n_req + rng.randint(1, 60)))
        try:
            r = lauf(ents, env, d)
        except Exception:  # noqa: BLE001
            B.regeln = []
            funde.append(("AUSNAHME", {"seed": seed, "tag": tag, "trace": traceback.format_exc()[-1500:]}, None))
            return funde
        B.regeln = []
        if [b for b in schutz_befunde(k, unklar_je_markt(d)) + folgeschaden(k) if "STAUB" not in b[0]]:
            nachkontrolle(env, d)
            for b in schutz_befunde(k, unklar_je_markt(d)) + folgeschaden(k):
                funde.append((("LAUT_" if r.get("warnung") else "STILL_") + b[0],
                              {"seed": seed, "tag": tag, "stoer": stoer, "ents": [(e["markt"], e["hebel"]) for e in ents],
                               "lage": zeigen(k), "zeilen": [z for z in r["zeilen"] if "⚠" in z][-6:]}, b))
        for s_ in SYMS:
            B.bewegen(s_, round(B.kurs[s_] * (1 + rng.gauss(0, 0.03)), 2))
    if rng.random() < 0.5:  # zum Schluss ein Not-Aus mit gestörter Liste (und manchmal abgelehntem Rückkauf/Verkauf)
        regeln_na = [dict(methode="GET", pfad=rng.choice(["/fapi/v1/openAlgoOrders", "/api/v3/openOrders"]), pred=None,
                          art=rng.choice(["vor503", "429"]), anzahl=10 ** 6, ab_req=B.n_req + rng.randint(1, 30))]
        if rng.random() < 0.5:
            regeln_na.append(dict(methode="POST", pfad=rng.choice(["/fapi/v1/order", "/api/v3/order"]), pred=None,
                                  art=rng.choice(["429", "vor503"]), anzahl=rng.choice([1, 2, 10 ** 6])))
        B.regeln = list(regeln_na)
        log_na = len(B.log)
        try:
            r = lauf([], env, d, notaus=True)
        except Exception:  # noqa: BLE001
            B.regeln = []
            funde.append(("AUSNAHME", {"seed": seed, "notaus": True, "trace": traceback.format_exc()[-1500:]}, None))
            return funde
        B.regeln = []
        if r.get("alles_zu") is not True:
            # wie im Not-Aus-Fuzzer: lehnt Binance dauerhaft genau den nötigen Schutz ab (z. B. jeden Spot-Auftrag — weder Verkauf
            # noch Stop möglich), ist eine laut gemeldete Lücke unvermeidbar (DAUER_); danach Ankunft + Nachkontrolle im
            # Not-Aus-Modus (Störung vorbei) — was dann noch offen ist, zählt immer
            for b in schutz_befunde(k, unklar_je_markt(d)) + folgeschaden(k):
                dauer = _dauer(regeln_na, b[0], k, b[1]) and r.get("warnung") and not _selbst_entfernt(log_na, b[1], b[0])
                funde.append((("DAUER_" if dauer else "") + "NOTAUS_" + ("LAUT_" if r.get("warnung") else "STILL_") + b[0],
                              {"seed": seed, "wann": "vor Ankunft", "regeln": [(x["methode"], x["pfad"], x["art"], x["anzahl"])
                                                                               for x in regeln_na],
                               "lage": zeigen(k), "zeilen": [z for z in r["zeilen"] if "⚠" in z][-8:]}, b))
            pending_abarbeiten()
            rn = nachkontrolle(dict(env, KI_BOT_STOP="1"), d)
            if rn.get("alles_zu") is not True:
                for b in schutz_befunde(k, unklar_je_markt(d)) + folgeschaden(k):
                    funde.append(("NOTAUS_NACHKONTROLLE_" + b[0], {"seed": seed, "wann": "nach Nachkontrolle", "lage": zeigen(k),
                                                                    "zeilen": [z for z in rn["zeilen"] if "⚠" in z][-8:]}, b))
            elif not flach(k):
                funde.append(("FALSCH_ALLES_ZU", {"seed": seed, "wann": "nach Nachkontrolle", "lage": zeigen(k)}, None))
        elif not flach(k):
            funde.append(("FALSCH_ALLES_ZU", {"seed": seed, "lage": zeigen(k)}, None))
    return funde


def main():
    if len(sys.argv) < 4 or sys.argv[1] not in ("laeufe", "notaus", "monotonie", "listen"):
        print(__doc__)
        return 2
    art, von, bis = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    alle = []
    for seed in range(von, bis):
        if art == "laeufe":
            alle += laeufe_runde(seed, int(sys.argv[4]) if len(sys.argv) > 4 else 30)
        elif art == "listen":
            alle += listen_runde(seed)
        else:
            alle += notaus_runde(seed) if art == "notaus" else monotonie_runde(seed)
    zaehler = Counter(x[0] for x in alle)
    print(json.dumps(dict(zaehler), ensure_ascii=False, indent=1))
    out = Path.cwd() / f"pruef_{'streng_' if STRENG else ''}{'luecken_' if LUECKEN else ''}{art}_{von}_{bis}.json"
    out.write_text(json.dumps(alle, ensure_ascii=False, indent=1, default=str))
    fehler = echte(alle)
    print(f"{len(fehler)} Befunde (ohne Staub und laut gemeldete Dauerstörungen) → {out}")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
