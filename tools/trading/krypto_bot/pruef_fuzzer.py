#!/usr/bin/env python3
"""Prüf-Fuzzer für Pilot 2.0 (aus der 8. unabhängigen Prüfung, Oktober 2026): viele zufällige Läufe und Not-Aus gegen die
strenge nachgebaute Binance (pruef_boerse.py) — Störungen in JEDEM Schritt, Kurssprünge mitten im Lauf, nach jedem Schritt
die Invarianten. NUR Spielgeld gegen 127.0.0.1; schaltet Pilot 2.0 nur in DIESEM Prozess frei (FREIGEGEBEN = True).

  python3 -B pruef_fuzzer.py laeufe VON BIS [TAGE]   # Tage mit zufälligen Signalen, Kursen, Störungen und Not-Aus
  python3 -B pruef_fuzzer.py notaus VON BIS          # zufälliger Bestand, dann Not-Aus mit harten (auch dauerhaften) Störungen

Befunde (jeder ist ein Fehler):
  AUSNAHME           ausfuehren()/Not-Aus warf eine Ausnahme nach aussen
  FALSCH_ALLES_ZU    Not-Aus meldet «alles zu», das Konto ist aber nicht flach
  FREMD / TRANSFER   schreibende Anfrage in einem fremden Konto / falscher Transfer-Typ
  TROCKEN            ein Probelauf schrieb oder sendete etwas
  ENDE_NICHT_ZU      ein sauberer Not-Aus (nach 10 Minuten) schliesst nicht alles
  LONG_OHNE_STOP / SHORT_OHNE_STOP           Netto-Position ohne Stop
  SPOT_STOP_UEBER_NETTO / PERP_STOP_UEBER_NETTO  ein Stop ist grösser als ungesichert (träfe die Absicherung)
  NACH_SPRUNG_*      der Kurs springt durch alle Stops — bleibt danach etwas ohne Absicherung und ohne Stop?
Bewusst NICHT gezählt (begründet):
  • Staub unter STAUB_MAX_USDT (10 USDT: darunter nimmt Binance keinen Stop an) — als STAUB_* ausgewiesen. Den Coin-Rest unter
    einem Futures-Schritt sichert Pilot 2.0 seit der 9. Prüfung mit einem eigenen Spot-Stop.
  • mehrere Spot-Stops, deren Summe die Netto-Position nicht übersteigt (der Not-Aus sichert unter Störungen additiv,
    statt einen funktionierenden Stop wegzunehmen); zu grosse Perp-Stops ohne Coins (reduceOnly: schliessen nur den Short).
  • Märkte mit unklarem Auftrag oder sonst BEIDSEITIG gesichert (Spot-Stop über alle Coins UND Perp-Stop über den ganzen
    Short — löst einer aus, schützt der andere den Rest): dort zählt «alles gedeckt» statt «nicht über netto»; die
    NACH_SPRUNG-Prüfung gilt weiter.
  • Läufe ohne Lauf-Warnung sind still (STILL_*), mit Warnung laut (LAUT_*) — beides zählt als Befund. Ausnahme DAUER_*: Binance
    lehnt in diesem Schritt dauerhaft ab (Störung mit ≥ 50 Wiederholungen) und Pilot 2.0 meldet die Lücke laut — dann kann kein
    Code schützen; geprüft wird der Stand NACH der Nachkontrolle (Störung vorbei), der muss sauber sein.
"""
from __future__ import annotations

import copy
import json
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
    return B.konto_anlegen(keys, GEHEIM, uid, usdt)


def E(m, h, stop_abstand=0.10, kurs=None):
    p = kurs or B.kurs[m + "USDT"]
    return {"markt": m, "hebel": h, "stop_long": p * (1 - stop_abstand), "stop_short": p * (1 + stop_abstand), "stand": "2026-10-13"}


def lauf(ents, env, datei, trocken=False, notaus=False, protokolliere=None):
    return L.ausfuehren(ents, trocken=trocken, env=env, bestand_datei=datei, notaus=notaus, protokolliere=protokolliere)


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
                out.append(("LONG_OHNE_STOP", sym, round(luecke_s, 6), round(luecke_s * p, 2), "beidseitig"))
            luecke_p = max(0.0, -g["pos"]) - g["p_qty"]
            if luecke_p * p > max(tol_usdt, 0.5 * STEP_P[sym] * p) + 1e-6:
                out.append(("SHORT_OHNE_STOP", sym, round(luecke_p, 6), round(luecke_p * p, 2), "beidseitig"))
            continue
        if g["netto"] > 0:
            luecke = min(g["netto"], g["coins"]) - g["s_qty"]
            if luecke * p > tol_usdt + STEP_S[sym] * p:
                out.append(("LONG_OHNE_STOP" if luecke * p > STAUB_MAX_USDT else "STAUB_LONG_OHNE_STOP", sym, round(luecke, 6),
                            round(luecke * p, 2)))
        if g["netto"] < 0:
            luecke = -g["netto"] - g["p_qty"]
            if luecke * p > max(tol_usdt, 0.5 * STEP_P[sym] * p) + 1e-6:
                out.append(("SHORT_OHNE_STOP", sym, round(luecke, 6), round(luecke * p, 2)))
        erlaubt_s = max(0.0, g["netto"])
        if g["netto"] < 0 < g["coins"]:  # netto short: Coin-Rest unter einem Futures-Schritt darf einen Spot-Stop haben,
            boden = int(min(g["coins"], -g["pos"]) / STEP_P[sym] + 1e-9) * STEP_P[sym]  # wenn der Perp-Stop den Short darüber deckt
            if g["p_qty"] >= -g["pos"] - boden - 1e-9:
                erlaubt_s = g["coins"] - boden
        if g["s_qty"] > erlaubt_s + STEP_S[sym] + tol_usdt / p:
            out.append(("SPOT_STOP_UEBER_NETTO", sym, round(g["s_qty"] - erlaubt_s, 6)))
        # zu grosser Perp-Stop schadet nur mit Short UND Coins (er kauft die Absicherung zurück → Coins ohne Short)
        if g["p_qty"] > max(0.0, -g["netto"]) + STEP_P[sym] + 1e-9 and g["pos"] < 0 and g["coins"] * p >= tol_usdt:
            out.append(("PERP_STOP_UEBER_NETTO", sym, round(g["p_qty"] - max(0.0, -g["netto"]), 6)))
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
                out.append(("NACH_SPRUNG_LONG_OHNE_STOP" if lang * ziel > STAUB_MAX_USDT else "STAUB_NACH_SPRUNG_LONG", sym, richtung,
                            round(lang, 6), round(lang * ziel, 2)))
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
    den Schutz nach, sobald es wieder geht; danach wird erneut geprüft)."""
    return [b for b in befunde if "STAUB" not in b[0] and not b[0].startswith("DAUER_")]


def _dauer(regeln):
    return any(r.get("anzahl", 1) >= 50 for r in regeln)


def sauber_schliessen(env, datei, versuche=2):
    """Not-Aus «10 Minuten später» (unklare Aufträge gelten dann als geklärt): → letztes Ergebnis."""
    alt = L.UNKLAR_MAX_ALTER_MS
    L.UNKLAR_MAX_ALTER_MS = -1
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


def nachkontrolle(env, datei):
    """Die Nachkontrolle nach einem Lauf/Not-Aus, «10 Minuten später» (unbekannte Aufträge gelten dann als nie ausgeführt)."""
    alt = L.UNKLAR_MAX_ALTER_MS
    L.UNKLAR_MAX_ALTER_MS = -1
    zeit = [0.0]  # simulierte Uhr: jeder Takt «dauert» NACHKONTROLLE_TAKT_S, nach NACHKONTROLLE_MAX_S ist Schluss

    def schlafen(s):
        zeit[0] += s
    try:
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
        r = dict(methode=m, pfad=pfad, pred=pred, art=art, anzahl=rng.choice([1, 1, 1, 2, 3, 99 if haerte > 1 or rng.random() < 0.3 else 2]))
        if rng.random() < 0.6:
            r["ab_req"] = B.n_req + rng.randint(1, 150)
        if art == "unsichtbar":
            r["listen"] = rng.choice([1, 2, 3])
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


def _klassieren(befunde, erg, kontext, dauer=False):
    """dauer: Binance lehnte in diesem Schritt dauerhaft ab — eine LAUT gemeldete Lücke ist dann unvermeidbar (DAUER_)."""
    laut = bool(erg.get("warnung"))
    vor = (("DAUER_" if dauer else "") + "LAUT_") if laut else "STILL_"
    return [(vor + b[0], kontext, b) for b in befunde]


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
    if rng.random() < 0.15:  # Konto/Paar ohne STOP_LOSS (Markt-Stop): Pilot 2.0 nimmt STOP_LOSS_LIMIT (kann bei Lücken hängen)
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
        dauer = _dauer(B.regeln)
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
        if stop_mitten and BF.STOP_DATEI.exists():
            BF.STOP_DATEI.unlink()
            stop_aktiv = True
        kontext["zeilen"] = erg.get("zeilen", [])[-12:]
        if not fremd and not trocken:  # Stand, wie der Lauf ihn verlässt — verspätete Aufträge noch unterwegs
            funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), erg, dict(kontext, wann="nach Lauf (vor Ankunft)", lage=zeigen(k)),
                                 dauer)
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
            funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), erg, dict(kontext, wann="nach Lauf"))
            funde += _klassieren(folgeschaden(k), erg, dict(kontext, wann="Folgeschaden nach Lauf"))
        # Markt bis morgen (Stops lösen unterwegs aus), Funding
        for sym in SYMS:
            ret = rng.gauss(0, 0.03)
            if rng.random() < 0.08:
                ret = rng.choice([-1, 1]) * rng.uniform(0.10, 0.35)
            ziel = B.kurs[sym] * (1 + ret)
            for i in range(1, 4):
                B.bewegen(sym, round(B.kurs[sym] + (ziel - B.kurs[sym]) * i / 3, 2))
        B.funding(rng.uniform(-0.0003, 0.0006))
        if stop_aktiv or rng.random() < 0.12:  # Not-Aus (zufällig oder weil er mitten im Lauf kam), mit harten Störungen
            stop_aktiv = False
            B.regeln = zufall_regeln(rng, rng.choice([0, 1, 2, 3, 4]), B.kurs, haerte=2.0)
            dauer_n = _dauer(B.regeln)
            kx = dict(kontext, wann="Not-Aus", regeln=[r["art"] for r in B.regeln])
            try:
                r = lauf([], env_heute(), d, notaus=True)
            except Exception:  # noqa: BLE001
                funde.append(("AUSNAHME", kx, traceback.format_exc()[-800:]))
                r = {"alles_zu": False, "warnung": True, "zeilen": []}
            B.regeln = []
            if r.get("alles_zu") is not True:  # Stand direkt nach dem Not-Aus (verspätete Aufträge noch unterwegs)
                funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), r, dict(kx, wann="Not-Aus (vor Ankunft)", lage=zeigen(k)),
                                     dauer_n)
            pending_abarbeiten()
            if r.get("alles_zu") is not True:  # stop.bat/Tagesaufgabe: Nachkontrolle im Not-Aus-Modus schliesst Verspätetes
                try:
                    rn = nachkontrolle(dict(env_heute(), KI_BOT_STOP="1"), d)
                    r = rn if rn.get("alles_zu") is not None else r
                except Exception:  # noqa: BLE001
                    funde.append(("AUSNAHME", dict(kx, wann="Nachkontrolle Not-Aus"), traceback.format_exc()[-800:]))
            kx["zeilen"], kx["lage"] = r.get("zeilen", [])[-14:], zeigen(k)
            if r.get("alles_zu") is True and not flach(k):
                funde.append(("FALSCH_ALLES_ZU", kx, zeigen(k)))
            if r.get("alles_zu") is not True:
                funde += _klassieren(schutz_befunde(k, unklar_je_markt(d)), r, kx)
                funde += _klassieren(folgeschaden(k), r, dict(kx, wann="Folgeschaden nach Not-Aus"))
            if r.get("alles_zu") is True and k.fut > 1 and echt:  # Nutzer verschiebt den Rest von Hand (sonst Startprüfung)
                k.frei["USDT"] += k.fut
                k.fut = 0.0
    try:  # Ende: sauberer Not-Aus, 10 Minuten später
        r = sauber_schliessen(env_heute(), d)
        if r.get("alles_zu") is not True:
            funde.append(("ENDE_NICHT_ZU", {"seed": seed, "wann": "Ende", "zeilen": r.get("zeilen")}, zeigen(k)))
        elif not flach(k):
            funde.append(("FALSCH_ALLES_ZU", {"seed": seed, "wann": "Ende", "zeilen": r["zeilen"]}, zeigen(k)))
    except Exception:  # noqa: BLE001
        funde.append(("AUSNAHME", {"seed": seed, "wann": "Ende"}, traceback.format_exc()[-800:]))
    return funde


# ───────────────────────── Fuzzer: Not-Aus unter harten Störungen ─────────────────────────
def notaus_runde(seed):
    rng = random.Random(seed)
    echt = rng.random() < 0.85
    usdt = rng.choice([900, 5000, 20000, 60000])
    k = neues_konto(usdt, keys=("k",) if echt else ("s", "f"))
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
            B.bewegen(s, round(B.kurs[s] * (1 + rng.gauss(0, 0.02)), 2))
    regeln = []
    for _ in range(rng.choice([1, 2, 3, 4, 6])):
        if rng.random() < 0.25:
            s = rng.choice(SYMS)
            regeln.append(dict(art="kurs", sym=s, preis=round(B.kurs[s] * (1 + rng.choice([-1, 1]) * rng.uniform(0.001, 0.08)), 2),
                               anzahl=1, ab_req=B.n_req + rng.randint(1, 40)))
            continue
        m, pfad, pred, arten = rng.choice(ZIELE_NOTAUS)
        r = dict(methode=m, pfad=pfad, pred=pred, art=rng.choice(arten), anzahl=rng.choice([1, 2, 3, 99]))
        if rng.random() < 0.5:
            r["ab_req"] = B.n_req + rng.randint(1, 40)
        if r["art"] == "teil":
            r["anteil"] = rng.choice([0.3, 0.5])
        if r["art"] == "unsichtbar":
            r["listen"] = rng.choice([1, 2])
        regeln.append(r)
    B.regeln = regeln
    dauer = _dauer(regeln)
    vorher = zeigen(k)
    try:
        r = lauf([], env, d, notaus=True)
    except Exception:  # noqa: BLE001
        B.regeln = []
        return [("AUSNAHME", {"seed": seed}, traceback.format_exc()[-600:])]
    B.regeln = []
    funde = []
    if r["alles_zu"] is not True:  # Stand direkt nach dem Not-Aus (verspätete Aufträge noch unterwegs)
        funde += [(("DAUER_" if dauer and r.get("warnung") else "") + b[0],
                   {"seed": seed, "wann": "vor Ankunft", "lage": zeigen(k), "zeilen": r["zeilen"][-10:]}, b)
                  for b in schutz_befunde(k, unklar_je_markt(d))]
    pending_abarbeiten()
    if r["alles_zu"] is not True:  # Nachkontrolle im Not-Aus-Modus (stop.bat, Tagesaufgabe) schliesst Verspätetes
        rn = nachkontrolle(dict(env, KI_BOT_STOP="1"), d)
        r = rn if rn.get("alles_zu") is not None else r
    kx = {"seed": seed, "echt": echt, "regeln": [x["art"] for x in regeln], "vorher": vorher, "nachher": zeigen(k),
          "zeilen": r["zeilen"][-10:]}
    if r["alles_zu"] is True and not flach(k):
        funde.append(("FALSCH_ALLES_ZU", kx, None))
    if r["alles_zu"] is not True:
        funde += [(b[0], kx, b) for b in schutz_befunde(k, unklar_je_markt(d)) + folgeschaden(k)]
    r2 = sauber_schliessen(env, d)
    if r2["alles_zu"] is not True or not flach(k):
        funde.append(("SAUBER_NICHT_ZU", dict(kx, zeilen2=r2["zeilen"]), zeigen(k)))
    return funde


def main():
    if len(sys.argv) < 4 or sys.argv[1] not in ("laeufe", "notaus"):
        print(__doc__)
        return 2
    art, von, bis = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    alle = []
    for seed in range(von, bis):
        alle += laeufe_runde(seed, int(sys.argv[4]) if len(sys.argv) > 4 else 30) if art == "laeufe" else notaus_runde(seed)
    zaehler = Counter(x[0] for x in alle)
    print(json.dumps(dict(zaehler), ensure_ascii=False, indent=1))
    out = Path.cwd() / f"pruef_{art}_{von}_{bis}.json"
    out.write_text(json.dumps(alle, ensure_ascii=False, indent=1, default=str))
    fehler = echte(alle)
    print(f"{len(fehler)} Befunde (ohne Staub und laut gemeldete Dauerstörungen) → {out}")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
