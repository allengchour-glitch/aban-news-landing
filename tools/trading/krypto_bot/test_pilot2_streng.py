#!/usr/bin/env python3
"""Pilot 2.0 gegen die STRENGE Prüf-Börse (pruef_boerse.py) — die Belege der 8. (p1–p11), 9. (9.p1–9.p10), 10. (10.*) und
11. Prüfung (11.*, dazu die Schlussprobe 11.F/11.S: eigene Funde und Lücken der Mutationsprobe), der 12. (12.*) und 13. Prüfung
(13.*) und die Fuzzer-Funde als feste Szenarien, dazu ein kleiner Fuzzer mit festen Seeds (pruef_fuzzer.py). Ohne Netz, nur 127.0.0.1.
    python3 -B tools/trading/krypto_bot/test_pilot2_streng.py"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot2_live as L  # noqa: E402

GESPERRT_AUSGELIEFERT = not L.FREIGEGEBEN  # vor dem Import des Prüf-Rahmens (der schaltet nur in diesem Prozess frei)
import pruef_fuzzer as P  # noqa: E402
from pruef_fuzzer import B, E, env_echt, env_test, lage, lauf, neu_buch, neues_konto  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


def befunde(k, d=None):
    """Schutz-Befunde + Folgeschaden ohne Staub (unklare Märkte: beidseitig)."""
    return P.echte(P.schutz_befunde(k, P.unklar_je_markt(d) if d else {}) + P.folgeschaden(k))


def regel(**r):
    r.setdefault("anzahl", 1)
    return r


MARKT_VERKAUF = lambda m, p, q: q.get("type") == "MARKET" and q.get("side") == "SELL"  # noqa: E731
STOP_AUFTRAG = lambda m, p, q: q.get("type", "").startswith("STOP")  # noqa: E731
REDUCE = lambda m, p, q: q.get("reduceOnly") == "true"  # noqa: E731
NEUER_SHORT = lambda m, p, q: q.get("side") == "SELL" and q.get("reduceOnly") != "true"  # noqa: E731

# ── p1: Not-Aus im fallenden Markt, Verkauf scheitert, Kurs tickt beim Schutz-Stop unter den alten Stop ──
for name, stoerung in (("503 dauerhaft", {"art": "vor503", "anzahl": 99}), ("PERCENT_PRICE", {"art": "ablehnen", "anzahl": 99})):
    k = neues_konto(20000)
    d = neu_buch()
    e = E("BTC", 0.5)
    e["stop_long"] = 92000.0
    lauf([e], env_echt(), d)
    B.bewegen("BTCUSDT", 92050.0)
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, **stoerung),
                regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="kurs", sym="BTCUSDT", preis=91990.0)]
    r = lauf([], env_echt(), d, notaus=True)
    B.regeln = []
    pruefe(f"p1 Not-Aus, Verkauf scheitert ({name}), Kurs fällt beim Schutz-Stop: nichts ungesichert, nicht «alles zu»",
           not befunde(k) and r["alles_zu"] is False, (befunde(k), P.zeigen(k)["BTCUSDT"], r["zeilen"]))

# ── p2/p6: Stop gesetzt, Antwort verloren, erst später in der Liste sichtbar → nie ein zweiter ──
for listen in (2, 0):
    k = neues_konto(20000)
    d = neu_buch()
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="unsichtbar", listen=listen)]
    lauf([E("BTC", -0.5)], env_echt(), d)
    B.regeln = []
    pruefe(f"p2 Perp-Stop erst nach {listen} Listen-Abfragen sichtbar: genau einer, kein Folgeschaden",
           lage(k, "BTCUSDT")["n_p"] == 1 and not befunde(k), (lage(k, "BTCUSDT"), befunde(k)))
    k = neues_konto(30000)
    d = neu_buch()
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=lambda m, p, q: q.get("type") == "STOP_LOSS", art="unsichtbar", listen=listen)]
    e = E("BTC", 0.25)
    e["stop_long"] = 95000.0
    lauf([e], env_echt(kapital=30000), d)
    B.regeln = []
    g = lage(k, "BTCUSDT")
    B.bewegen("BTCUSDT", 94000.0)
    g2 = lage(k, "BTCUSDT")
    pruefe(f"p6 Spot-Stop erst nach {listen} Listen-Abfragen sichtbar: genau einer, nach dem Fall kein nackter Short",
           g["n_s"] == 1 and max(0.0, -g2["netto"] - g2["p_qty"]) * 94000 < 150, (g, g2))

# ── p3: Ernte wird vergrössert, der zusätzliche Short bleibt unklar (nie ausgeführt / verspätet) ──
for variante, art in (("nie ausgeführt", {"art": "vor503"}), ("verspätet ausgeführt", {"art": "spaet", "nach": 6}),
                      ("lange verspätet", {"art": "spaet", "nach": 400})):
    k = neues_konto(10000)
    d = neu_buch()
    lauf([E("BTC", 0.0)], env_echt(kapital=20000), d)
    k.frei["USDT"] += 10000.0
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, **art)]
    r = lauf([E("BTC", 0.0)], env_echt(kapital=20000), d)
    B.regeln = []
    vorher = befunde(k, d)
    P.pending_abarbeiten()  # kommt der Short jetzt (verspätet) an?
    pruefe(f"p3 unklarer Ernte-Short ({variante}): vor UND nach seiner Ankunft nichts ungesichert",
           not vorher and not befunde(k, d), (vorher, befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"]))

# ── p4: Wettlauf mit dem Börsen-Stop während des Abgleichs ──
def haken_nach_lesen(aktion):
    folge = []

    def h(m, pfad, p):
        if pfad == "/api/v3/ticker/price" and folge[-2:] == ["/api/v3/account", "/fapi/v2/positionRisk"] and h.offen:
            h.offen = False
            aktion()
        folge.append(pfad)
    h.offen = True
    B.vor_jeder_anfrage = h


for fall, z, stop0, stop1, kurs0, sprung in (("a Short", -0.5, 105000.0, 104000.0, 103900.0, 105100.0),
                                              ("b Long", 0.5, 95000.0, 96000.0, 96500.0, 94900.0)):
    k = neues_konto(30000)
    d = neu_buch()
    e = E("BTC", z)
    e["stop_short" if z < 0 else "stop_long"] = stop0
    lauf([e], env_echt(kapital=30000), d)
    e2 = E("BTC", z)
    e2["stop_short" if z < 0 else "stop_long"] = stop1
    B.bewegen("BTCUSDT", kurs0)
    haken_nach_lesen(lambda s=sprung: B.bewegen("BTCUSDT", s))
    r = lauf([e2], env_echt(kapital=30000), d)
    B.vor_jeder_anfrage = None
    g = lage(k, "BTCUSDT")
    luecke = max(0.0, g["netto"] - g["s_qty"]) if z < 0 else max(0.0, -g["netto"] - g["p_qty"])
    pruefe(f"p4{fall}: Börsen-Stop löst während des Abgleichs aus → nichts doppelt verkauft/zurückgekauft",
           luecke * sprung < 150 or r["warnung"], (g, r["zeilen"]))
k = neues_konto(30000)
d = neu_buch()
e = E("BTC", -1.0)
e["stop_short"] = 103000.0
lauf([e], env_echt(kapital=30000), d)
gesehen = [False]


def h_c(m, pfad, p):
    if pfad == "/api/v3/order" and p.get("type") == "MARKET" and p.get("side") == "BUY":
        gesehen[0] = True
    elif gesehen[0] and pfad == "/api/v3/ticker/price":
        gesehen[0] = None
        B.bewegen("BTCUSDT", 103200.0)


B.vor_jeder_anfrage = h_c
r = lauf([E("BTC", 0.0)], env_echt(kapital=30000), d)
B.vor_jeder_anfrage = None
g = lage(k, "BTCUSDT")
pruefe("p4c Short → Ernte, Kurs springt mitten im Lauf über den alten Stop → kein ungesicherter Long",
       max(0.0, g["netto"] - g["s_qty"]) * 103200 < 150 or r["warnung"], (g, r["zeilen"]))

# ── p5/p5b: Auftragsliste beim Richtungswechsel kurz nicht lesbar → kein alter Stop über der Ernte ──
for teil, pfad, z1 in (("Perp", "/fapi/v1/openAlgoOrders", -1.0), ("Spot", "/api/v3/openOrders", 1.0)):
    for anzahl in (3, 99):
        k = neues_konto(30000)
        d = neu_buch()
        e1 = E("BTC", z1)
        e1["stop_short" if z1 < 0 else "stop_long"] = 106000.0 if z1 < 0 else 95000.0
        lauf([e1], env_echt(kapital=30000, KI_BOT_MAX_AUFTRAG=1000 if z1 > 0 else 100000), d)
        B.regeln = [regel(methode="GET", pfad=pfad, art="vor503", anzahl=anzahl)]
        r = lauf([E("BTC", 0.0)], env_echt(kapital=30000), d)
        B.regeln = []
        b = befunde(k)
        pruefe(f"p5 {teil}-Liste {anzahl}× nicht lesbar beim Wechsel zur Ernte: kein alter Stop über der Ernte (oder laut)",
               not b or (anzahl == 99 and r["warnung"]), (b, P.zeigen(k)["BTCUSDT"], r["zeilen"]))

# ── p7: Kurs schon über dem Short-Stop, Rückkauf nur teilweise ausgeführt → Rest hat einen Stop ──
for anteil in (0.3, 1.0):
    k = neues_konto(30000)
    d = neu_buch()
    e = E("BTC", -0.5)
    e["stop_short"] = 106000.0
    lauf([e], env_echt(kapital=30000), d)
    B.bewegen("BTCUSDT", 103500.0)
    e2 = E("BTC", -0.5, kurs=100000.0)
    e2["stop_short"] = 104000.0
    haken_nach_lesen(lambda: B.bewegen("BTCUSDT", 104500.0))
    if anteil < 1:
        B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="teil", anteil=anteil)]
    r = lauf([e2], env_echt(kapital=30000), d)
    B.regeln, B.vor_jeder_anfrage = [], None
    g = lage(k, "BTCUSDT")
    pruefe(f"p7 Rückkauf zu {anteil:.0%} ausgeführt: kein Short ohne Stop", max(0.0, -g["netto"] - g["p_qty"]) * 104500 < 150, g)

# ── p8: neuer Stop-Kurs, Setzen scheitert 3× → der Long hat trotzdem einen Stop ──
k = neues_konto(30000)
d = neu_buch()
e = E("BTC", 1.0)
e["stop_long"] = 92000.0
lauf([e], env_echt(kapital=30000), d)
e2 = E("BTC", 1.0)
e2["stop_long"] = 93000.0
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=lambda m, p, q: q.get("type") == "STOP_LOSS", art="vor503", anzahl=3)]
r = lauf([e2], env_echt(kapital=30000), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("p8 Stop-Nachzug scheitert 3× → der Long hat danach einen Stop", g["s_qty"] >= g["coins"] - 1e-4, (g, r["zeilen"]))

# ── p9: Not-Aus nach unklarem Short; der Short kommt danach doch an → nie nackt ──
for name, konto_env in (("echt", None), ("Testnetz", "test")):
    for stornierbar in (False, True):
        k = neues_konto(10000, uid=1, keys=("s", "f")) if konto_env else neues_konto(20000)
        if konto_env:
            k.fut = 10000.0
        env = env_test() if konto_env else env_echt()
        d = neu_buch()
        B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet", nach=10 ** 6)]
        if not stornierbar:  # Binance nimmt das Storno nicht an → der Auftrag bleibt unklar
            B.regeln.append(regel(methode="DELETE", pfad="/fapi/v1/order", art="vor503", anzahl=99))
        lauf([E("BTC", 0.0)], env, d)
        B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/order", art="vor503", anzahl=99)] if not stornierbar else []
        r2 = lauf([], env, d, notaus=True)
        B.regeln = []
        P.pending_abarbeiten()  # der unklare Short kommt verspätet doch an (wenn er nicht storniert ist)
        g = lage(k, "BTCUSDT")
        if stornierbar:
            pruefe(f"p9 ({name}) unklarer Short am Laufende storniert → Not-Aus «alles zu», der Short kommt nie an",
                   r2["alles_zu"] is True and P.flach(k), (g, r2["zeilen"]))
            continue
        pruefe(f"p9 ({name}) Not-Aus mit unklarem Short: nicht «alles zu», und kommt er danach an, hat er einen Stop",
               r2["alles_zu"] is False and g["pos"] < 0 and g["p_qty"] >= -g["pos"] - 1e-9 and not befunde(k, d), (g, r2["zeilen"]))
        r3 = P.sauber_schliessen(env, d)
        pruefe(f"p9 ({name}) … der nächste Not-Aus (nach 10 Minuten) schliesst alles", r3["alles_zu"] is True and P.flach(k), r3["zeilen"])

# ── p10: Buch-Datei beim Not-Aus kurz gesperrt (Virenscanner/OneDrive) → schliesst trotzdem ──
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
orig = Path.read_text
zaehler = [0]


def gestoert(self, *a, **kw):
    if str(self) == str(d) and zaehler[0] < 1:
        zaehler[0] += 1
        raise PermissionError(13, "Datei von einem anderen Prozess verwendet")
    return orig(self, *a, **kw)


Path.read_text = gestoert
try:
    r = lauf([], env_echt(), d, notaus=True)
finally:
    Path.read_text = orig
pruefe("p10 Not-Aus schliesst trotz kurz gesperrter Buch-Datei", r["alles_zu"] is True and P.flach(k), r["zeilen"])

# ── p11: Probelauf über pilot.handeln2 → keine Aufträge, kein Logbuch, keine Push-Nachricht ──
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ki_bot"))
import pilot as PI  # noqa: E402
import signale as SG  # noqa: E402

gesendet = []
SG.push = lambda t, *a, **k: gesendet.append(t)
PI.LOGBUCH = P.TMP / "pilot-log-p11.json"
neues_konto(20000, uid=1, keys=("s", "f"))
alt = dict(os.environ)
try:
    os.environ.clear()
    os.environ.update({k: v for k, v in alt.items() if k.upper() in ("PATH", "SYSTEMROOT", "TEMP", "TMP", "HOME", "USERPROFILE")})
    os.environ.update(env_test())
    voll = dict(E("BTC", 1.0), symbol="BTCUSDT", kurs=100000.0, schnitt=90000.0, trend_tage=150, schwankung=0.4,
                mvrv={"tag": "2026-10-12", "wert": 2.0}, bremse=None, detektor={"ok": True, "skill_2j": 0.8, "einbruch_1j": -0.2})
    voll["stop_long"] = None  # → Warnung «kein Stop-Kurs für long»
    n_log = len(B.log)
    PI.handeln2([voll], "Lage", trocken=True)
finally:
    os.environ.clear()
    os.environ.update(alt)
pruefe("p11 Probelauf: keine Aufträge, kein Logbuch, keine Push-Nachricht", len(B.log) == n_log and not PI.LOGBUCH.exists() and not gesendet,
       (len(B.log) - n_log, PI.LOGBUCH.exists(), gesendet[:1]))

# ── Fuzzer-Funde nach der 8. Prüfung (feste Szenarien) ──
# Not-Aus: Verkaufen geht nicht (429 dauerhaft) → der alte Stop bleibt, die freien (früheren Absicherungs-)Coins bekommen einen dazu
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", 0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="429", anzahl=99)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "ETHUSDT")
pruefe("Not-Aus, Verkauf dauerhaft 429: Paar (Coins + Short) bleibt stehen, nie ein Bein allein; alter Spot-Stop bleibt → was "
       "netto ungesichert ist, steht unter Stop",
       -g["pos"] - g["coins"] < 0.0005 and max(0.0, g["netto"]) <= g["s_qty"] + 1e-4 and r["alles_zu"] is False and not befunde(k),
       (g, r["zeilen"]))
# Not-Aus: Short nur zur Hälfte geschlossen, Coins da → zu grosser alter Perp-Stop wird auf den ungesicherten Rest verkleinert
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="teil", anteil=0.5, anzahl=99),
            regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="vor503", anzahl=99)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
pruefe("Not-Aus, Short nur halb zu, Verkauf geht nicht: kein Stop grösser als ungesichert, nichts ohne Stop",
       not befunde(k) and r["alles_zu"] is False, (befunde(k), P.zeigen(k)["BTCUSDT"], r["zeilen"]))
# Not-Aus: Short lässt sich gar nicht schliessen → kein zweiter Spot-Stop über die Absicherung
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=99),
            regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=99)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("Not-Aus, Short nicht schliessbar (Antwort unklar), Storno geht nicht: beidseitig gesichert, kein Stop über die Absicherung "
       "hinaus, nicht «alles zu»", not befunde(k, d) and r["alles_zu"] is False, (befunde(k, d), g, r["zeilen"]))
# Not-Aus: Position zu, aber die Futures-Aufträge lassen sich nicht löschen → nie «alles zu»; der nächste schliesst
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", -0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=99)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
r2 = lauf([], env_echt(), d, notaus=True)
pruefe("Not-Aus: Futures-Aufträge nicht löschbar → nicht «alles zu»; der nächste Not-Aus schliesst",
       r["alles_zu"] is False and r2["alles_zu"] is True and P.flach(k) and not k.algos, (r["zeilen"], r2["zeilen"], k.algos))
# Lauf: Stop-Kurs nachgezogen, nach dem Storno ist das Konto 3× nicht lesbar → der Long bekommt trotzdem seinen Stop
for anzahl in (3, 99):
    k = neues_konto(30000)
    d = neu_buch()
    e = E("BTC", 1.0)
    e["stop_long"] = 92000.0
    lauf([e], env_echt(kapital=30000), d)
    e2 = E("BTC", 1.0)
    e2["stop_long"] = 93000.0
    abgleich = [False]

    def h_storno(m, pfad, p, code):
        # Storno + neuer Stop in einer Anfrage: der Storno gelingt, der neue Stop wird abgelehnt («nur_storno»); danach ist das
        # Konto nicht lesbar → der Stop muss nach dem Stand von vorhin trotzdem gesetzt werden
        if m == "POST" and pfad == "/api/v3/order/cancelReplace" and not abgleich[0]:
            abgleich[0] = True
            B.regeln = [regel(methode="GET", pfad="/api/v3/account", art="429", anzahl=anzahl)]
    B.nach_jeder_anfrage = h_storno
    B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="nur_storno")]
    r = lauf([e2], env_echt(kapital=30000), d)
    B.regeln, B.nach_jeder_anfrage = [], None
    g = lage(k, "BTCUSDT")
    pruefe(f"Lauf: Konto nach dem Storno {anzahl}× nicht lesbar → der Long hat trotzdem einen Stop", g["s_qty"] >= g["coins"] - 1e-4
           and g["n_s"] == 1, (g, r["zeilen"]))
# Lauf: neuer Short, die Liste der Perp-Stops ist (nach dem Handeln) nicht lesbar → der Short bekommt trotzdem seinen Stop
for anzahl in (3, 99):
    k = neues_konto(20000)
    d = neu_buch()
    gehandelt = [False]

    def h_short(m, pfad, p, code, anzahl=anzahl):
        if m == "POST" and pfad == "/fapi/v1/order" and code == 200 and not gehandelt[0]:
            gehandelt[0] = True
            B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=anzahl)]
    B.nach_jeder_anfrage = h_short
    r = lauf([E("ETH", -0.5)], env_echt(), d)
    B.regeln, B.nach_jeder_anfrage = [], None
    g = lage(k, "ETHUSDT")
    pruefe(f"Lauf: Perp-Stop-Liste {anzahl}× nicht lesbar → der Short hat trotzdem einen Stop (99×: laut)",
           not befunde(k) and g["n_p"] == 1 and (anzahl == 3 or r["warnung"]), (befunde(k), g, r["zeilen"]))
# Lauf: nach dem neuen Short ist die Position 3× nicht lesbar (Binance kurz überlastet) → der Abgleich wartet länger
k = neues_konto(20000)
d = neu_buch()
gehandelt = [False]


def h_pos(m, pfad, p, code):
    if m == "POST" and pfad == "/fapi/v1/order" and code == 200 and not gehandelt[0]:
        gehandelt[0] = True
        B.regeln = [regel(methode="GET", pfad="/fapi/v2/positionRisk", art="vor503", anzahl=3)]


B.nach_jeder_anfrage = h_pos
r = lauf([E("ETH", -0.5)], env_echt(), d)
B.regeln, B.nach_jeder_anfrage = [], None
pruefe("Lauf: Position nach dem Short 3× nicht lesbar → der Short hat trotzdem einen Stop", not befunde(k)
       and lage(k, "ETHUSDT")["n_p"] == 1, (befunde(k), lage(k, "ETHUSDT"), r["zeilen"]))
# Lauf: Spot-Stop-Liste (nach dem Kauf) dauerhaft nicht lesbar → der Long wird trotzdem gesichert, gesperrte Coins nie doppelt
for tag1 in (0.0, 0.5):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", tag1)], env_echt(), d)
    k.frei["USDT"] += 5000.0
    gekauft = [False]

    def h_kauf(m, pfad, p, code):
        if m == "POST" and pfad == "/api/v3/order" and p.get("side") == "BUY" and code == 200 and not gekauft[0]:
            gekauft[0] = True
            B.regeln = [regel(methode="GET", pfad="/api/v3/openOrders", art="vor503", anzahl=99)]
    B.nach_jeder_anfrage = h_kauf
    r = lauf([E("BTC", 1.0)], env_echt(kapital=25000), d)
    B.regeln, B.nach_jeder_anfrage = [], None
    g = lage(k, "BTCUSDT")
    pruefe(f"Lauf (Tag 1 Richtung {tag1:+g}): Spot-Stop-Liste nach dem Kauf dauerhaft nicht lesbar → Long trotzdem gesichert, "
           "nichts doppelt, laut", gekauft[0] and not befunde(k) and g["s_qty"] > 0 and r["warnung"], (befunde(k), g, r["zeilen"]))
# Not-Aus: Verkauf nur teilweise ausgeführt → nochmal (Rest neu gelesen), bis alles verkauft ist
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 1.0)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="teil", anteil=0.5, anzahl=2)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
pruefe("Not-Aus: Verkauf zweimal nur zur Hälfte ausgeführt → weitere Versuche verkaufen den Rest, «alles zu»",
       r["alles_zu"] is True and P.flach(k), (r["zeilen"], P.zeigen(k)["BTCUSDT"]))
# Lauf: alter Spot-Stop ausserhalb der Liste (gesperrte Coins) → neuer deckt nur den Rest, nie über die Absicherung
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="unsichtbar", listen=10 ** 6)]
lauf([E("ETH", 0.5)], env_echt(), d)
B.regeln = []
e2 = E("ETH", 0.5)
e2["stop_long"] = B.kurs["ETHUSDT"] * 0.95
r = lauf([e2], env_echt(), d)
pruefe("Lauf: alter Spot-Stop nicht in der Liste (Coins gesperrt) → kein zweiter über die Absicherung", not befunde(k),
       (befunde(k), lage(k, "ETHUSDT"), r["zeilen"]))
# Lauf: unklarer Short kommt erst NACH dem Lauf an (nicht stornierbar) → beidseitig gesichert, danach nichts nackt
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", 0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet", nach=400),
            regel(methode="DELETE", pfad="/fapi/v1/order", art="vor503", anzahl=99)]
r = lauf([E("ETH", -0.5)], env_echt(), d)
B.regeln = []
vorher = befunde(k, d)
P.pending_abarbeiten()
pruefe("Lauf: unklarer Short kommt nach dem Lauf an → vorher und nachher nichts ohne Absicherung und ohne Stop",
       not vorher and not befunde(k, d) and any("beidseitig" in z for z in r["zeilen"]), (vorher, befunde(k, d), r["zeilen"]))
# Lauf: unklarer Short wird am Laufende per Kennung gefunden und storniert → nichts im Buch
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet", nach=400)]
r = lauf([E("ETH", -0.5)], env_echt(), d)
B.regeln = []
P.pending_abarbeiten()
pruefe("Lauf: unklarer Short noch offen → am Laufende storniert, nichts im Buch, kommt nie an",
       not L.buch_lesen(d, "echt")["unklar"] and k.pos["ETHUSDT"] == 0 and not befunde(k, d), (r["zeilen"], k.pos))

# Lauf: unklarer zusätzlicher Short (beidseitig) und der Kurs liegt im Abgleich schon über dem Short-Stop → zurückkaufen
k = neues_konto(20000)
d = neu_buch()
e1 = E("ETH", -0.5)
e1["stop_short"] = 4200.0
lauf([e1], env_echt(), d)
e2 = E("ETH", -1.0)
e2["stop_short"] = 4100.0
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="vor503")]
haken_nach_lesen(lambda: B.bewegen("ETHUSDT", 4150.0))
r = lauf([e2], env_echt(), d)
B.regeln, B.vor_jeder_anfrage = [], None
pruefe("Lauf: unklarer Short + Kurs schon über dem Short-Stop → ganzer Short zurückgekauft (nur so viel, wie offen ist), "
       "Coins und unklarer Short gesichert", k.pos["ETHUSDT"] == 0 and not befunde(k, d), (P.zeigen(k)["ETHUSDT"], befunde(k, d), r["zeilen"]))

# Binance nimmt keinen reduceOnly-Stop über mehr als die offene Position (unbekannt, ob es so ist → beides prüfen):
# beidseitig gesichert wird dann wenigstens der offene Short — im Lauf und im Not-Aus
for wo in ("Lauf", "Not-Aus"):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("ETH", -0.5)], env_echt(), d)
    B.reduce_algo_streng = True
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="vor503")]
    r = lauf([E("ETH", -1.0)], env_echt(), d)
    B.regeln = []
    if wo == "Not-Aus":  # Stop des Laufs ist weg (z. B. von Hand gelöscht) → der Not-Aus muss selbst sichern
        k.algos.clear()
        B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=99)]
        r = lauf([], env_echt(), d, notaus=True)
        B.regeln = []
    B.reduce_algo_streng = False
    g = lage(k, "ETHUSDT")
    pruefe(f"{wo}: Binance lehnt reduceOnly-Stop über der Position ab → wenigstens der offene Short hat seinen Stop, laut",
           g["pos"] < 0 and g["p_qty"] >= -g["pos"] - 1e-9 and r["warnung"] and any("reduceOnly-Stop" in z for z in r["zeilen"]),
           (g, r["zeilen"]))

# ── 9. Prüfung: Aufträge, die bis zu ihrer verspäteten Ankunft UNBEKANNT sind (wie Binance), + Nachkontrolle ──
SPOT_KAUF = lambda m, p, q: q.get("type") == "MARKET" and q.get("side") == "BUY"  # noqa: E731
for z in (0.5, 0.0):  # Richtungs-Kauf bzw. Ernte-Kauf kommt erst nach dem Lauf an
    k = neues_konto(20000)
    d = neu_buch()
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=SPOT_KAUF, art="spaet_u")]
    r = lauf([E("BTC", z)], env_echt(), d)
    B.regeln = []
    vor = befunde(k, d)
    P.pending_abarbeiten()  # der Kauf kommt verspätet an
    r2 = P.nachkontrolle(env_echt(), d)
    pruefe(f"9.p7 spaet_u: Spot-Kauf (Richtung {z:+g}) unbekannt, kommt nach dem Lauf an → die Nachkontrolle sichert die Coins "
           "(vorher beidseitig, nachher normal), Buch leer", not vor and not befunde(k, d) and not L.buch_lesen(d, "echt")["unklar"]
           and any("Nachkontrolle" in z_ for z_ in r2["zeilen"]), (vor, befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"], r2["zeilen"]))
# Not-Aus: Schliessen des Shorts unbekannt, kommt verspätet an → nie Coins ohne Short UND ohne Stop; Nachkontrolle schliesst
for z in (0.0, -0.5):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", z)], env_echt(), d)
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="spaet_u")]
    r = lauf([], env_echt(), d, notaus=True)
    B.regeln = []
    vor = befunde(k, d)
    P.pending_abarbeiten()  # das Schliessen kommt verspätet an
    nach = befunde(k, d)
    r2 = P.nachkontrolle(env_echt(KI_BOT_STOP=1), d)
    pruefe(f"9.p1 spaet_u: Not-Aus (Richtung {z:+g}), Schliessen unbekannt → nicht «alles zu», vor und nach der Ankunft nichts ungesichert; "
           "die Nachkontrolle schliesst danach alles", r["alles_zu"] is False and not vor and not nach and r2.get("alles_zu") is True
           and P.flach(k), (vor, nach, P.zeigen(k)["BTCUSDT"], r["zeilen"], r2.get("zeilen")))
# Not-Aus mit unklarem Short aus dem Lauf, Binance lehnt reduceOnly-Stops ohne Position ab → die Nachkontrolle schliesst ihn
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet_u")]
lauf([E("BTC", 0.0)], env_echt(), d)
B.regeln = []
B.reduce_algo_streng = True
r = lauf([], env_echt(), d, notaus=True)
P.pending_abarbeiten()  # der unklare Short kommt nach dem Not-Aus an — ohne Stop (Binance nahm keinen an)
r2 = P.nachkontrolle(env_echt(KI_BOT_STOP=1), d)
B.reduce_algo_streng = False
pruefe("9.p9 spaet_u: unklarer Short kommt nach dem Not-Aus an, Binance nahm vorher keinen Stop an → die Nachkontrolle schliesst ihn",
       r["alles_zu"] is False and r2.get("alles_zu") is True and P.flach(k), (P.zeigen(k)["BTCUSDT"], r["zeilen"], r2.get("zeilen")))
# Lauf: Rückkauf beim Ausstieg (Kurs über dem Stop) unbekannt → beidseitig; nach der Ankunft nichts ungesichert
k = neues_konto(20000)
d = neu_buch()
e1 = E("BTC", -0.5)
e1["stop_short"] = 110000.0
lauf([e1], env_echt(), d)
B.bewegen("BTCUSDT", 109000.0)
e2 = E("BTC", -0.5, kurs=100000.0)
e2["stop_short"] = 108000.0
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="spaet_u")]
r = lauf([e2], env_echt(), d)
B.regeln = []
vor = befunde(k, d)
P.pending_abarbeiten()
pruefe("9.p2 spaet_u: Rückkauf beim Ausstieg unbekannt → ins Buch, Markt beidseitig, vor und nach der Ankunft nichts ungesichert",
       L.buch_lesen(d, "echt")["unklar"] and not vor and not befunde(k, d), (vor, befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"]))
r2 = P.nachkontrolle(env_echt(), d)
pruefe("… die Nachkontrolle klärt ihn und setzt normale Stops", not L.buch_lesen(d, "echt")["unklar"] and not befunde(k, d),
       (befunde(k, d), P.zeigen(k)["BTCUSDT"], r2["zeilen"]))
# Nachkontrolle ohne Unklares: sofort fertig, keine Anfrage an die Börse
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
n0 = B.n_req
r2 = P.nachkontrolle(env_echt(), d)
pruefe("Nachkontrolle ohne unklare Aufträge: sofort fertig, keine Anfrage, keine Meldung", B.n_req == n0 and not r2["zeilen"], r2)

# ── 9. Prüfung: Stops nie wegnehmen, bevor der Ersatz steht (Phase «nur Stornieren», p10) ──
STOP_NEU = lambda m, p, q: q.get("type", "").startswith("STOP")  # noqa: E731
for z in (1.0, -0.5):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", z)], env_echt(), d)
    vor = lage(k, "BTCUSDT")
    e2 = E("BTC", z)
    e2["stop_long" if z > 0 else "stop_short"] = 92000.0 if z > 0 else 108000.0  # neuer Stop-Kurs → Nachziehen
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_NEU, art="vor503", anzahl=99),
                regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99)]
    r = lauf([e2], env_echt(), d)
    B.regeln = []
    g = lage(k, "BTCUSDT")
    pruefe(f"9.p10 Richtung {z:+g}: Binance nimmt keine neuen Stops an (nur Stornieren) → der alte Stop bleibt, nichts ungesichert",
           not befunde(k) and (g["s_qty"] >= vor["s_qty"] - 1e-9) and (g["p_qty"] >= vor["p_qty"] - 1e-9) and r["warnung"],
           (vor, g, befunde(k), r["zeilen"]))
# p3: alter Perp-Stop löst genau zwischen Liste und Storno aus, danach ist der Kontostand nicht lesbar
for neu_stop in (112000.0, 110200.0):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", -0.5)], env_echt(), d)
    B.bewegen("BTCUSDT", 109000.0)
    e2 = E("BTC", -0.5, kurs=100000.0)
    e2["stop_short"] = neu_stop
    flag = [False]

    def haken_storno(m, pfad, p_):
        if m == "DELETE" and pfad == "/fapi/v1/algoOrder" and not flag[0]:
            flag[0] = True
            B.bewegen("BTCUSDT", 110500.0)  # der alte Stop (110000) löst aus
    B.vor_jeder_anfrage = haken_storno
    B.regeln = [regel(methode="GET", pfad="/fapi/v2/positionRisk", pred=lambda m, p_, q: flag[0], art="vor503", anzahl=99)]
    r = lauf([e2], env_echt(), d)
    B.regeln, B.vor_jeder_anfrage = [], None
    pruefe(f"9.p3 alter Perp-Stop löst beim Ersetzen aus, Konto danach nicht lesbar (neuer Stop {neu_stop:g}) → die Coins kommen "
           "vorsorglich unter einen Spot-Stop, nichts ungesichert", not befunde(k), (befunde(k), P.zeigen(k)["BTCUSDT"], r["zeilen"]))
# p4: Perp-Stop mit verlorener Antwort (ID fehlt im Buch), am Folgetag ist die Liste nicht lesbar → Storno über die Kennung
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503")]
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=99)]
r = lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = []
pruefe("9.p4 alter Perp-Stop ohne ID (Antwort verloren), Liste nicht lesbar → über die Kennung gelöscht, kein Doppel-Stop",
       lage(k, "BTCUSDT")["n_p"] == 1 and not befunde(k), (lage(k, "BTCUSDT"), r["zeilen"]))
# p8: Konto ohne STOP_LOSS — ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs; der Not-Aus zählt ihn nicht als Schutz
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 0.5)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)  # Kurslücke: löst aus (Stop 90000), springt aber gleich unter das Limit 85500 — der Stop hängt
assert any(o.get("aktiv") and o["status"] == "NEW" for o in k.orders.values()), "Szenario: Stop sollte hängen"
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=99)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("9.p8 hängender STOP_LOSS_LIMIT (Limit über dem Kurs) zählt im Not-Aus nicht als Schutz → ersetzt; was netto ungesichert ist, "
       "steht unter einem wirksamen Stop, das Paar bleibt", not befunde(k) and max(0.0, g["netto"]) <= g["s_qty"] + 1e-4
       and -g["pos"] - g["coins"] < 0.0005, (befunde(k), P.zeigen(k)["BTCUSDT"], r["zeilen"]))

# Lauf: Binance lehnt Stops dauerhaft ab (429) → laut gemeldet, Markt im Buch «schutz_offen»; die Nachkontrolle holt den Stop nach
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_NEU, art="429", anzahl=99)]
r = lauf([E("BTC", 1.0)], env_echt(), d)
B.regeln = []
offen = L.buch_lesen(d, "echt")["schutz_offen"]
r2 = P.nachkontrolle(env_echt(), d)
pruefe("Stop dauerhaft abgelehnt → laut, Markt «ohne vollständigen Stop» im Buch; die Nachkontrolle setzt ihn, sobald Binance wieder "
       "annimmt", r["warnung"] and offen == ["BTC"] and not befunde(k) and not L.buch_lesen(d, "echt")["schutz_offen"],
       (offen, befunde(k), r["zeilen"], r2["zeilen"]))

# 9.p2b: Ausstieg zum Markt (Kurs schon über dem Short-Stop, Plan im Band) — der Rückkauf bleibt unbekannt → Buch, beidseitig
k = neues_konto(30000)
d = neu_buch()
e = E("BTC", -0.5)
e["stop_short"] = 106000.0
lauf([e], env_echt(kapital=30000), d)
B.bewegen("BTCUSDT", 103500.0)
e2 = E("BTC", -0.5, kurs=100000.0)
e2["stop_short"] = 104000.0
haken_nach_lesen(lambda: B.bewegen("BTCUSDT", 104500.0))
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="spaet_u")]
r = lauf([e2], env_echt(kapital=30000), d)
B.regeln, B.vor_jeder_anfrage = [], None
vor = befunde(k, d)
offen = L.buch_lesen(d, "echt")["unklar"]
P.pending_abarbeiten()
pruefe("9.p2b Ausstieg zum Markt, Rückkauf unbekannt (Plan im Band) → ins Buch, beidseitig; vor und nach der Ankunft nichts ungesichert",
       offen and not vor and not befunde(k, d), (offen, vor, befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"]))
# Lauf: alter Perp-Stop lässt sich nicht löschen (zwei stehen), Ernte-Coins da → die Coins kommen ganz unter einen Spot-Stop
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
e2 = E("BTC", -0.5)
e2["stop_short"] = 108000.0
B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99)]
r = lauf([e2], env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("Lauf: alter Perp-Stop nicht löschbar → zwei Stops, darum alle Coins unter Spot-Stop (beidseitig) — kein Folgeschaden",
       g["n_p"] == 2 and not befunde(k) and g["s_qty"] >= g["coins"] - 1e-4, (g, befunde(k), r["zeilen"]))
# Not-Aus: Staub, der gerundet unter dem Binance-Minimum liegt, zählt als zu (sonst bliebe «alles zu» für immer aus)
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", 0.5)], env_echt(), d)
lauf([], env_echt(), d, notaus=True)
B.konten["k"][1].frei["ETH"] = 0.0010387  # gerundet 0.001 ETH × 4900 = 4.90 < 5 USDT, ungerundet 5.09 USDT
B.bewegen("ETHUSDT", 4900.0)
L.buch_schreiben(d, "echt", dict(L.leer_buch(), start="2026-10-14T00:00:00+00:00", uid=4711))
r = lauf([], env_echt(), d, notaus=True)
pruefe("Not-Aus: Rest gerundet unter dem Binance-Minimum (ungerundet knapp darüber) → «alles zu»", r["alles_zu"] is True, r["zeilen"])

# ── 10. Prüfung: nie erst löschen, dann setzen (Phase «nur Stornieren»: Storno und Lesen gehen, neue Aufträge abgelehnt) ──
def ungesichert_usdt(k, sym="BTCUSDT"):
    return sum(P.ungesichert(k, sym))


for name, z1, z2, pfad, extra, ab2 in (
        ("10.p1a Long wird heute verkleinert (gesperrte Coins für den Verkauf)", 1.0, 0.5, "/api/v3/order", (), 0.10),
        ("10.p1b Short wird heute verkleinert (Perp-Stop kleiner)", -1.0, -0.5, "/fapi/v1/algoOrder", (), 0.10),
        ("10.p1c Algo-Liste nicht lesbar, neuer Stop-Kurs", -0.5, -0.5, "/fapi/v1/algoOrder",
         (regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=999),), 0.08)):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", z1)], env_echt(), d)
    vor = ungesichert_usdt(k)
    B.regeln = [regel(methode="POST", pfad=pfad, art="vor503", anzahl=999), *extra]
    r = lauf([E("BTC", z2, stop_abstand=ab2)], env_echt(), d)
    B.regeln = []
    pruefe(f"{name}: in der Phase «nur Stornieren» geht kein Schutz verloren", ungesichert_usdt(k) <= vor + 10 and not befunde(k, d),
           (vor, P.zeigen(k)["BTCUSDT"], r["zeilen"][-4:]))
# zwei eigene Spot-Stops (Stop + Zusatz-Stop nach einer Störung): nie beide löschen und einen neuen setzen
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=99)]
lauf([E("BTC", 1.0)], env_echt(), d)
B.regeln = []
zwei, vor = len(P.stops(k, "BTCUSDT")[0]), ungesichert_usdt(k)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", art="vor503", anzahl=999)]
r = lauf([E("BTC", 1.0, stop_abstand=0.08)], env_echt(), d)
B.regeln = []
pruefe("10.p2 zwei Spot-Stops, neuer Stop-Kurs in der Phase «nur Stornieren» → keiner wird ersatzlos gelöscht",
       zwei == 2 and ungesichert_usdt(k) <= vor + 10 and not befunde(k, d), (zwei, vor, P.zeigen(k)["BTCUSDT"], r["zeilen"][-4:]))
r = lauf([E("BTC", 1.0, stop_abstand=0.08)], env_echt(), d)
g = lage(k, "BTCUSDT")
pruefe("10.p2b zwei Spot-Stops ohne Störung → jeder einzeln (cancelReplace) auf den neuen Kurs, alle Coins gedeckt",
       g["s_preise"] and all(abs(x - 92000.0) < 0.02 for x in g["s_preise"]) and g["s_qty"] >= g["coins"] - 1e-4 and not befunde(k, d),
       (g, r["zeilen"][-3:]))
# W1: neuer Perp-Stop kam an, Antwort verloren, Wiederholungen scheitern → per Kennung gelöscht (nie zwei über den Short)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
r = lauf([E("BTC", -0.5, stop_abstand=0.08)], env_echt(), d)
n_p = lage(k, "BTCUSDT")["n_p"]
P.nachkontrolle(env_echt(), d)
B.regeln = []
B.bewegen("BTCUSDT", 111000.0)
pruefe("10.p5 Perp-Stop mit verlorener Antwort → über die Kennung gelöscht, nie zwei Stops; ein Kurssprung trifft die Ernte nicht",
       n_p == 1 and not befunde(k, d), (n_p, P.zeigen(k)["BTCUSDT"], r["zeilen"][-3:]))
# B1: Not-Aus, während Spot keine neuen Aufträge annimmt — nie die Absicherung zuerst schliessen
for z in (0.0, -0.5, 0.5):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", z)], env_echt(), d)
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=10 ** 6),
                regel(methode="POST", pfad="/api/v3/order", art="429", anzahl=10 ** 6),
                regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=10 ** 6)]
    r = lauf([], env_echt(), d, notaus=True)
    B.regeln = []
    vor, offen = befunde(k, d), L.buch_lesen(d, "echt")["notaus_offen"]
    rn = P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
    pruefe(f"10.p8 Not-Aus, Spot nimmt nichts an (Richtung {z:+g}) → Paar bleibt abgesichert, nichts ungesichert, notaus_offen; "
           "ist die Störung vorbei, schliesst die Nachkontrolle (Not-Aus-Modus) alles", not vor and offen and r["alles_zu"] is False
           and rn.get("alles_zu") is True and P.flach(k), (vor, offen, P.zeigen(k)["BTCUSDT"], r["zeilen"][-4:], rn.get("zeilen", [])[-3:]))
# B1: Paar-Coins verkauft, aber der Rückkauf des Shorts wird eindeutig abgelehnt → Coins zurückgekauft (wieder netto 0)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=10 ** 6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("10.p8b Not-Aus: Short-Rückkauf abgelehnt, nachdem die Paar-Coins verkauft sind → Coins zurückgekauft, nie ein Short allein",
       abs(g["netto"]) < 0.0006 and not befunde(k, d) and any("zurückgekauft" in z for z in r["zeilen"]), (g, r["zeilen"][-5:]))
# W2: STOP erscheint während einer laufenden Nachkontrolle → sie schliesst sofort selbst und endet (nicht 11 Minuten weiter)
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
lauf([E("BTC", -0.5)], env_echt(), d)
offen_vor, zeit, takte = L.buch_lesen(d, "echt")["schutz_offen"], [0.0], [0]


def schlafen(s):
    zeit[0] += s
    takte[0] += 1
    if takte[0] == 3:
        B.regeln = []
        P.BF.STOP_DATEI.write_text("")


try:
    rn = L.nachkontrolle(env=env_echt(), datei=d, schlafen=schlafen, uhr=lambda: zeit[0])
finally:
    P.BF.STOP_DATEI.unlink(missing_ok=True)
    B.regeln = []
b = L.buch_lesen(d, "echt")
pruefe("10.p3 STOP während der Nachkontrolle → sie schliesst sofort selbst und endet, das Buch ist danach stimmig",
       offen_vor == ["BTC"] and P.flach(k) and not b["start"] and zeit[0] < 60 and rn.get("alles_zu") is True,
       (offen_vor, P.zeigen(k)["BTCUSDT"], b, zeit[0], rn.get("zeilen", [])[-3:]))
# W2: ein paralleler Not-Aus (ohne Sperre) ändert das Buch → die Nachkontrolle überschreibt es nicht (Start/UID blieben sonst)
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
lauf([E("BTC", -0.5)], env_echt(), d)
zeit, takte, na = [0.0], [0], {}


def schlafen2(s):
    zeit[0] += s
    takte[0] += 1
    if takte[0] == 3:
        B.regeln = []
        na["r"] = lauf([], env_echt(), d, notaus=True)


rn = L.nachkontrolle(env=env_echt(), datei=d, schlafen=schlafen2, uhr=lambda: zeit[0])
B.regeln = []
b = L.buch_lesen(d, "echt")
pruefe("10.p3b paralleler Not-Aus ändert das Buch → die Nachkontrolle überschreibt nichts und endet",
       na.get("r", {}).get("alles_zu") is True and not b["start"] and not b["schutz_offen"] and P.flach(k)
       and any("anderen Lauf" in z for z in rn["zeilen"]), (b, P.zeigen(k)["BTCUSDT"], rn["zeilen"][-3:]))
# W3: Not-Aus-Modus, zwei unklare Käufe, einer kommt an → im nächsten Takt geschlossen (nicht erst nach 10 Minuten)
k = neues_konto(20000)
d = neu_buch()
SPAET_KAUF = lambda m, p, q: q.get("type") == "MARKET" and q.get("side") == "BUY"  # noqa: E731
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=SPAET_KAUF, art="spaet_u", anzahl=2)]
lauf([E("BTC", 1.0), E("ETH", 1.0)], env_echt(), d)
B.regeln = []
unklar_vor = len(L.buch_lesen(d, "echt")["unklar"])
P.BF.STOP_DATEI.write_text("")
lauf([], env_echt(), d)  # stop.bat: Not-Aus


def ankunft(sym):
    with B.lock:
        for x in list(B.pending):
            zellen = [c.cell_contents for c in (x[1].__closure__ or ()) if isinstance(c.cell_contents, dict)]
            if any(z.get("symbol") == sym for z in zellen):
                B.pending.remove(x)
                x[1]()


zeit, verlauf = [0.0], []


def schlafen3(s):
    zeit[0] += s
    if not verlauf:
        ankunft("BTCUSDT")  # der BTC-Kauf kommt jetzt an, der ETH-Kauf nie
    g = lage(k, "BTCUSDT")
    verlauf.append((zeit[0], g["coins"], g["s_qty"]))


alt_alter, t0 = L.UNKLAR_MAX_ALTER_MS, L.time.time
L.UNKLAR_MAX_ALTER_MS = 10 * 60 * 1000
L.time.time = lambda: t0() + zeit[0]
try:
    rn = L.nachkontrolle(env=dict(env_echt(), KI_BOT_STOP="1"), datei=d, schlafen=schlafen3, uhr=lambda: zeit[0])
finally:
    L.time.time, L.UNKLAR_MAX_ALTER_MS = t0, alt_alter
    P.BF.STOP_DATEI.unlink(missing_ok=True)
ohne = [x for x in verlauf if x[1] * 100000 > 10 and x[2] < x[1] * 0.5]
pruefe("10.p4 Not-Aus-Modus: ein unklarer Kauf kommt an → im nächsten Takt geschlossen, nie bis zum Ende der Wartezeit offen",
       unklar_vor == 2 and (not ohne or ohne[-1][0] <= L.NACHKONTROLLE_TAKT_S + 2) and rn.get("alles_zu") is True and P.flach(k),
       (unklar_vor, ohne[:3], rn.get("zeilen", [])[:2]))
# K1: cancelReplace-Antworten richtig lesen
class _Ersetzer(L.Spot):
    def __init__(self, fehler):
        self.fehler = fehler

    def _req(self, *a, **kw):
        raise self.fehler


def _bf(code, daten):
    e = L.BB.BinanceFehler("/api/v3/order/cancelReplace", code, "x", None, None)
    e.daten = daten
    return e


pruefe("10.K1 cancelReplace: 409 ohne lesbares «data» = Storno gelungen; −2011 (alter schon weg) = weg; andere Ablehnung = nichts",
       _Ersetzer(_bf(409, {})).ersetzen("BTCUSDT", 1, {})[0] == "nur_storno"
       and _Ersetzer(_bf(400, {"code": -2022, "data": {"cancelResult": "FAILURE", "cancelResponse": {"code": -2011}}})).ersetzen(
           "BTCUSDT", 1, {})[0] == "nur_storno"
       and _Ersetzer(_bf(400, {"code": -1013, "msg": "Filter failure"})).ersetzen("BTCUSDT", 1, {})[0] == "nichts"
       and _Ersetzer(_bf(503, {})).ersetzen("BTCUSDT", 1, {})[0] == "unklar")
# Fuzzer-Fund 10. Prüfung (notaus Seed 5673): Spot-Rest-Stop nicht entfernbar → der zugehörige Perp-Stop bleibt
pruefe("10.p7 Not-Aus Seed 5673 (Rest-Stop + Perp-Stop gehören zusammen): keine Befunde", not P.echte(P.notaus_runde(5673)))
# K2: ungünstigste Lesart von cancelReplace («erst Storno, dann Ablehnung»): lehnte Binance heute einen Auftrag ab, ersetzt der
# Abgleich keinen (nicht zu grossen) Stop nur des Kurses wegen — er bleibt, nichts geht verloren
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
vor, s_vor = ungesichert_usdt(k), lage(k, "BTCUSDT")["s_qty"]
B.ersetzen_storno_zuerst = True
B.regeln = [regel(methode="POST", pfad=pf, art="vor503", anzahl=999) for pf in ("/api/v3/order", "/fapi/v1/order", "/fapi/v1/algoOrder")]
try:
    r = lauf([E("BTC", 1.0, stop_abstand=0.08)], env_echt(), d)
finally:
    B.regeln = []
    B.ersetzen_storno_zuerst = False
pruefe("10.K2 «Storno zuerst», alle neuen Aufträge abgelehnt → der bisherige Stop wird nicht ersetzt (nur ergänzen), kein Schutzverlust",
       ungesichert_usdt(k) <= vor + 10 and lage(k, "BTCUSDT")["s_qty"] >= s_vor - 1e-9, (vor, s_vor, P.zeigen(k)["BTCUSDT"], r["zeilen"][-4:]))
# Fuzzer-Funde der 10. Runde (Läufe): zu grosser Stop nicht korrigierbar → beidseitig; hängender STOP_LOSS_LIMIT → zum Markt;
# Rückkauf abgelehnt → passender Not-Stop zuerst; Ersetzen unklar → beidseitig
for seed, tage, was in ((45, 28, "hängender STOP_LOSS_LIMIT im Lauf, Rückkauf abgelehnt"), (46, 3, "zu grosser Spot-Stop, Ersatz abgelehnt"),
                        (156, 30, "verwaister Perp-Stop nicht löschbar"), (165, 12, "Ersetzen des zu grossen Spot-Stops unklar"),
                        (5016, 8, "Stops dauerhaft abgelehnt, verwaister Perp-Stop regulär gelöscht"),
                        (5033, 18, "Auftragsliste nicht lesbar, zu grosser Spot-Stop über die ID verkleinert")):
    pruefe(f"10.F Fuzzer-Lauf Seed {seed} ({was}): keine Befunde", not P.echte(P.laeufe_runde(seed, tage)))
# Schutz-Monotonie: in einer Phase «nur Stornieren» geht nie Schutz verloren (ausser «Storno zuerst», Testnetz-Prüfpunkt)
funde = []
for seed in range(40):
    funde += P.monotonie_runde(seed)
pruefe("10.W4 Monotonie-Fuzzer (40 Seeds, Phase «nur Stornieren»): kein Schutzverlust", not P.echte(funde),
       [(f[0], f[1].get("seed")) for f in P.echte(funde)][:5])

# ── 11. Prüfung: Belege p1–p10 als feste Szenarien ──
pruefe("11.p1 Not-Aus-Fuzzer Seed 7249 (Schutz-Stop mit veraltetem Kurs): keine Befunde", not P.echte(P.notaus_runde(7249)))
for name, alles_spot in (("Spot-Ticker gesperrt", False), ("ganze Spot-API gesperrt", True)):
    # Ernte-Paar, Not-Aus: Rückkauf des Shorts unklar (nie ausgeführt), dann Kurs +7 % und Spot antwortet 429 → der Schutz-Stop
    # muss sich nach dem FRISCHEN Kurs richten (Futures-Markpreis), sonst würde er sofort auslösen
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", 0.0)], env_echt(), d)
    gemacht = [0]

    def h11(m, pfad, p_, alles_spot=alles_spot):
        ausloeser = (m == "POST" and pfad == "/fapi/v1/order" and p_.get("reduceOnly") == "true") if alles_spot else \
            (m == "POST" and pfad == "/fapi/v1/algoOrder")
        if ausloeser and not gemacht[0]:
            gemacht[0] = 1
            B.bewegen("BTCUSDT", 107000.0)
            B.regeln.append(regel(methode="GET", pred=(lambda m_, p2, q: p2.startswith("/api/v3/")) if alles_spot else None,
                                  pfad=None if alles_spot else "/api/v3/ticker/price", art="429", anzahl=10 ** 6))
    B.vor_jeder_anfrage = h11
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=1)]
    r = lauf([], env_echt(), d, notaus=True)
    B.vor_jeder_anfrage = None
    g = lage(k, "BTCUSDT")
    pruefe(f"11.p2 Not-Aus, Rückkauf unklar, Kurssprung + {name}: der Short hat einen Stop über dem frischen Kurs",
           not befunde(k, d) and g["p_qty"] >= -g["pos"] - 1e-9 and min(g["p_preise"] or [0]) > 107000.0,
           (g, r["zeilen"][-4:]))
    if not alles_spot:
        rn = P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
        pruefe("11.p2c Nachkontrolle (Not-Aus-Modus), Ticker weiter gesperrt: schliesst über den Futures-Markpreis",
               lage(k, "BTCUSDT")["pos"] == 0 and not befunde(k, d), (lage(k, "BTCUSDT"), rn["zeilen"][-3:]))
    B.regeln = []
# p2d: kein frischer Kurs lesbar (Spot-Ticker UND Futures-Markpreis gesperrt), der Schutz-Stop würde sofort auslösen → den Short
# reduceOnly zum Markt zurückkaufen (reduceOnly kann nie überschiessen, auch wenn der unklare Rückkauf noch ankommt)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
gemacht = [0]


def h11d(m, pfad, p_):
    if m == "POST" and pfad == "/fapi/v1/algoOrder" and not gemacht[0]:
        gemacht[0] = 1
        B.bewegen("BTCUSDT", 107000.0)
        B.regeln.extend([regel(methode="GET", pfad="/api/v3/ticker/price", art="429", anzahl=10 ** 6),
                         regel(methode="GET", pfad="/fapi/v1/premiumIndex", art="429", anzahl=10 ** 6)])


B.vor_jeder_anfrage = h11d
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=1)]
r = lauf([], env_echt(), d, notaus=True)
B.vor_jeder_anfrage = None
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.p2d kein Kurs lesbar, Schutz-Stop würde sofort auslösen: der Short wird reduceOnly zum Markt zurückgekauft",
       g["pos"] == 0 and not befunde(k, d) and any("zum Markt zurückgekauft" in z for z in r["zeilen"]), (g, r["zeilen"][-4:]))
# K1: «beidseitig gesichert» nur, wenn die Schutz-Stops wirklich stehen
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=1),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
_t = " ".join(r["zeilen"])
pruefe("11.K1 Schutz-Stop abgelehnt: der Not-Aus meldet «NICHT vollständig gesichert», nie «der Markt ist beidseitig gesichert»",
       "der Markt ist beidseitig gesichert" not in _t and "NICHT vollständig gesichert" in _t, r["zeilen"][-3:])
# p3: im Not-Aus wird ein zu grosser Spot-Stop verkleinert, die Antwort geht verloren (nie ausgeführt) → so rechnen, als stünde
# der alte noch: der Short braucht seinen Stop über die ganze Menge
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", 0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/api/v3/openOrders", art="429", anzahl=6),
            regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=1)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "ETHUSDT")
if g["s_preise"]:
    B.bewegen("ETHUSDT", min(g["s_preise"]) * 0.99)  # Kurs fällt durch den (alten, zu grossen) Spot-Stop
g2 = lage(k, "ETHUSDT")
pruefe("11.p3 Not-Aus: Verkleinern des Spot-Stops unklar → der Short hat seinen Stop, auch wenn der alte Stop auslöst",
       not befunde(k, d) and not (g2["netto"] < -1e-6 and g2["p_qty"] < -g2["netto"] - 1e-6), (g, g2, r["zeilen"][-3:]))
# p4: der Vorab-Schritt (Perp-Stop verkleinern) kommt erst NACH dem Verkleinern der Position — scheitert danach etwas oder schon
# das Verkleinern selbst, bleibt kein Teil des Shorts ohne Stop
for name, nach_vorab in (("429 nach dem Vorab-Schritt", True), ("Verkleinern abgelehnt (429 von Anfang an)", False)):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", -1.0)], env_echt(), d)
    an = [0]
    stoerung = [regel(methode="POST", pfad="/fapi/v1/order", art="429", anzahl=20),
                regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=20)]

    def h4(m, pfad, p_, stoerung=stoerung):
        if m == "DELETE" and pfad == "/fapi/v1/algoOrder" and not an[0]:
            an[0] = 1
            B.regeln.extend(stoerung)
    B.vor_jeder_anfrage = h4 if nach_vorab else None
    B.regeln = [] if nach_vorab else stoerung
    r = lauf([E("BTC", -0.5)], env_echt(), d)
    B.vor_jeder_anfrage = None
    B.regeln = []
    pruefe(f"11.p4 Vorab-Schritt nach dem Verkleinern ({name}): kein Teil des Shorts ohne Stop", not befunde(k, d),
           (befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"][-3:]))
# p6: Not-Aus bei einem Ernte-Paar, Futures lehnt den Rückkauf dauerhaft ab → die Nachkontrolle verkauft und kauft nicht in jedem
# Takt wieder zurück (Gebührenmühle); das Paar bleibt abgesichert stehen
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
n0 = len(B.log)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=10 ** 6)]
lauf([], env_echt(), d, notaus=True)
rn = P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
B.regeln = []
_spot = [x for x in B.log[n0:] if x[1] == "POST" and x[2] == "/api/v3/order" and x[3].get("type") == "MARKET" and x[4] == 200]
_rueck = sum(x[3]["side"] == "BUY" for x in _spot)
pruefe("11.p6 Not-Aus, Rückkauf des Shorts dauerhaft abgelehnt: höchstens ein Rückkauf der Coins, das Paar bleibt abgesichert",
       _rueck <= 1 and abs(lage(k, "BTCUSDT")["netto"]) < 0.001 and not befunde(k, d), (_rueck, len(_spot), lage(k, "BTCUSDT")))
# p7: ein zu grosser alter Perp-Stop bleibt (der kleinere Ersatz wird abgelehnt) → die Coins kommen unter einen Spot-Stop
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="vor503", anzahl=1)]
lauf([E("BTC", -0.5)], env_echt(), d)  # Ernte-Short unklar → beidseitig (Perp-Stop über den ganzen Short + den unklaren)
B.regeln = []
_alt = L.UNKLAR_MAX_ALTER_MS
L.UNKLAR_MAX_ALTER_MS = -1
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=20)]
r = lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = []
L.UNKLAR_MAX_ALTER_MS = _alt
pruefe("11.p7 zu grosser alter Perp-Stop bleibt (Ersatz abgelehnt): die Coins haben einen Spot-Stop, nichts ungesichert",
       not befunde(k, d), (befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"][-3:]))
# p8: «nur Stornieren» beginnt mitten im Lauf (Börse in der Lesart «Storno zuerst»): ein zu grosser Spot-Stop wird NICHT per
# cancelReplace ersetzt, er bleibt stehen (beidseitig)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
an = [0]


def h8(m, pfad, p_):
    if m == "POST" and pfad == "/api/v3/order" and p_.get("type") == "MARKET" and p_.get("side") == "SELL" and not an[0]:
        an[0] = 1
        B.regeln.extend([regel(methode="POST", pfad=x, art="429", anzahl=10 ** 6, ab_req=B.n_req + 1)
                         for x in ("/api/v3/order", "/fapi/v1/order", "/fapi/v1/algoOrder")])


B.vor_jeder_anfrage, B.regeln, B.ersetzen_storno_zuerst = h8, [], True
n0 = len(B.log)
try:
    r = lauf([E("BTC", 0.25)], env_echt(), d)
finally:
    B.vor_jeder_anfrage, B.regeln, B.ersetzen_storno_zuerst = None, [], False
_cr = [x for x in B.log[n0:] if x[2] == "/api/v3/order/cancelReplace"]
pruefe("11.p8 Binance lehnt mitten im Lauf ab, Spot-Stop zu gross: kein cancelReplace, nichts ungesichert (beidseitig)",
       not _cr and ungesichert_usdt(k) <= 10, (len(_cr), P.ungesichert(k, "BTCUSDT"), r["zeilen"][-3:]))
# p9: Not-Aus, Coins nicht verkaufbar, der alte (jetzt zu grosse) Perp-Stop lässt sich nicht löschen → Spot-Stop über die Coins
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=lambda m, p_, q: q.get("type") == "MARKET", art="ablehnen", anzahl=10 ** 6),
            regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="429", anzahl=6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
pruefe("11.p9 Not-Aus: zu grosser Perp-Stop nicht löschbar → die Coins bekommen einen Spot-Stop", not befunde(k, d),
       (befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"][-3:]))
# Symbol nicht im Handel (exchangeInfo BREAK): kein cancelReplace, die Stops bleiben stehen
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 1.0)], env_echt(), d)
s_vor = lage(k, "BTCUSDT")["s_qty"]
B.symbol_status["BTCUSDT"] = "BREAK"
n0 = len(B.log)
try:
    r = lauf([E("BTC", 1.0, stop_abstand=0.12)], env_echt(), d)  # neuer Stop-Kurs → würde sonst per cancelReplace ersetzen
finally:
    B.symbol_status.clear()
_cr = [x for x in B.log[n0:] if x[2] == "/api/v3/order/cancelReplace"]
pruefe("11.W2 Symbol nicht im Handel (BREAK): kein cancelReplace, der Spot-Stop bleibt stehen",
       not _cr and lage(k, "BTCUSDT")["s_qty"] >= s_vor - 1e-9, (len(_cr), s_vor, P.zeigen(k)["BTCUSDT"]))
pruefe("11.W2 _handel_aus: nur ein bekannter Status ≠ TRADING sperrt",
       L._handel_aus({"status": "BREAK"}) and not L._handel_aus({"status": "TRADING"}) and not L._handel_aus({}))
# K2: ausgeführte Menge so, wie Binance sie meldet (auch 0)
pruefe("11.K2 executedQty 0 heisst 0 (nicht «alles verkauft»); fehlt das Feld: die Menge",
       L._ausgefuehrt({"executedQty": "0.00000000"}, 1.0) == 0.0 and L._ausgefuehrt({}, 1.0) == 1.0
       and L._ausgefuehrt({"executedQty": "0.5"}, 1.0) == 0.5)
# K5: Buch-Sperre — hält ein anderer Schreiber das Buch, schreibt niemand gleichzeitig (OSError statt überschreiben)
_d = neu_buch()
L.buch_schreiben(_d, "echt", L.leer_buch())
_alt_w = L.BUCH_SPERRE_WARTEN
L.BUCH_SPERRE_WARTEN = 0
try:
    with L._buch_sperre(_d):
        try:
            L.buch_schreiben(_d, "echt", dict(L.leer_buch(), start="x"))
            _gesperrt = False
        except OSError:
            _gesperrt = True
finally:
    L.BUCH_SPERRE_WARTEN = _alt_w
pruefe("11.K5 Buch-Sperre: während ein anderer schreibt, wird nicht gleichzeitig geschrieben",
       _gesperrt and L.buch_lesen(_d, "echt")["start"] is None)
# K3: Fuzzer-Seeds der 11. Prüfung (neue Bereiche, Not-Aus mit «Storno zuerst», Phase mitten im Lauf)
funde = []
for seed in (7249, 7315, 8444, 7569, 7785):  # 7785: Spot- und Perp-Stop decken je den Rest der anderen Seite (Schlusskampagne)
    funde += P.notaus_runde(seed)
pruefe("11.F Not-Aus-Seeds der 11. Prüfung (7249, 7315, 8444, 7569, 7785): keine Befunde", not P.echte(funde),
       [(f[0], f[1].get("seed")) for f in P.echte(funde)][:5])
# Schlusskampagne der 11. Runde: Staub-Paar im Not-Aus (7039), Stop noch nicht in der Liste (7047), teils beidseitig (20)
funde = []
for seed, tage in ((7039, 30), (7047, 3), (20, 19)):
    funde += P.laeufe_runde(seed, tage)
pruefe("11.F2 Lauf-Seeds der Schlusskampagne (7039 Staub-Paar, 7047 Stop noch nicht in der Liste, 20 teils beidseitig): keine Befunde",
       not P.echte(funde), [(f[0], f[1].get("seed"), f[1].get("tag")) for f in P.echte(funde)][:5])
funde = []
for seed in (7454, 7469):  # Phase mitten im Lauf, Ernte-Kauf unklar: der Perp-Stop darf vorher nicht auf das Plan-Ende schrumpfen
    funde += P.monotonie_runde(seed)
pruefe("11.F3 Monotonie mitten im Lauf (7454, 7469): kein Schutzverlust", not P.echte(funde), [(f[0], f[1].get("seed")) for f in P.echte(funde)][:5])

# ── Schlussprobe der 11. Runde: Funde F1–F3 und Lücken der Mutationsprobe (je ein festes Szenario) ──
# 11.F1:
# Konto ohne STOP_LOSS, Kurslücke → STOP_LOSS_LIMIT hängt; der Lauf verkauft einen Teil der gesperrten Coins (kein Long heute,
# Ernte bleibt) → der kleinere Stop darf nie zum schon erreichten alten Stop-Kurs gesetzt werden (Binance storniert, lehnt dann ab)
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 1.0)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)
n0 = len(B.log)
r = lauf([e], env_echt(), d)
_cr409 = [x for x in B.log[n0:] if x[2] == "/api/v3/order/cancelReplace" and x[4] == 409]
_falsch = [z for z in r["zeilen"] if "nur_storno" in z and "der Spot-Stop bleibt" in z]
g = lage(k, "BTCUSDT")
pruefe("11.F1 Lauf: Stop verkleinern bei Kurs unter dem alten Stop-Kurs → nie ein cancelReplace, das storniert und dann ablehnt; keine "
       "falsche Meldung «der Spot-Stop bleibt»", not _cr409 and not _falsch and not befunde(k, d), (len(_cr409), _falsch, r["zeilen"][-4:]))
# 11.F1b:
# der Lauf verkleinert den Long; der Spot-Stop wird per cancelReplace verkleinert — Binance storniert, lehnt den kleineren aber
# ab (nur_storno) → die Coins sind frei: der geplante Verkauf folgt, der Rest bekommt am Laufende seinen Stop; keine falsche Meldung
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 1.0)], env_echt(), d)
c0 = k.frei["BTC"] + k.gesperrt["BTC"]
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="nur_storno", anzahl=1)]
r = lauf([E("BTC", 0.5)], env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
_falsch = [z for z in r["zeilen"] if "der Spot-Stop bleibt" in z]
pruefe("11.F1b Stop verkleinern: Binance storniert, lehnt den kleineren ab → Coins frei, der geplante Verkauf folgt, der Rest hat am "
       "Laufende einen Stop; keine Meldung «der Spot-Stop bleibt»", not _falsch and g["netto"] < c0 * 0.75 and not befunde(k, d),
       (_falsch, c0, g, r["zeilen"][-4:]))
# 11.F2:
# hängender STOP_LOSS_LIMIT über Richtungs-Coins, daneben ein Ernte-Paar; der erste Ausstieg wird abgelehnt (dafür werden freie
# Coins verkauft) → der zweite Ausstieg verkauft nur noch die Netto-Richtung, nie die Absicherung (sonst ein nackter Short)
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 0.5)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=2)]
r = lauf([e], env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.F2 Lauf: Ausstieg nach einem abgelehnten ersten Versuch verkauft nur die Netto-Richtung — die Ernte bleibt abgesichert",
       g["netto"] > -0.0005 and max(0.0, g["netto"]) * 85000 < 150 and not befunde(k, d), (g, r["zeilen"][-4:]))
# 11.F3 (erkennt die Mutation «R10-M11»):
# hängender STOP_LOSS_LIMIT, kein Stop-Kurs bekannt (Buch ohne p_long, die Nachkontrolle kennt kein Signal) → der Abgleich erkennt
# ihn trotzdem als «jenseits» und steigt aus (früher: TypeError beim Formatieren der Meldung → «Spot-Stop nicht gesetzt»)
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 1.0)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)
b = L.buch_lesen(d, "echt")
b["stops"]["BTC"]["p_long"] = None
b["schutz_offen"] = ["BTC"]
L.buch_schreiben(d, "echt", b)
r = P.nachkontrolle(env_echt(), d)
g = lage(k, "BTCUSDT")
_typ = [z for z in r["zeilen"] if "TypeError" in z]
pruefe("11.F3 hängender Stop-Limit ohne bekannten Stop-Kurs (Nachkontrolle): kein Absturz, er steigt zum Markt aus",
       not _typ and not befunde(k, d) and g["coins"] * 85000 < 150, (_typ, g, r["zeilen"][-4:]))
# 11.S1 (erkennt die Mutation «M2»):
# Coins ohne Short und ohne Stop (z. B. Stop von Hand gelöscht) → der Not-Aus verkauft sie (zuerst die freien)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)  # Ernte-Paar: Coins + Short
k.buchen("BTCUSDT", -k.pos["BTCUSDT"], B.kurs["BTCUSDT"])  # der Short ist weg (z. B. ausgelöst) — die Coins liegen frei, ohne Stop
r = lauf([], env_echt(), d, notaus=True)
g = lage(k, "BTCUSDT")
pruefe("11.S1 Not-Aus: freie Coins ohne Short und ohne Stop werden verkauft — alles zu",
       g["coins"] * B.kurs["BTCUSDT"] < 5 and r["alles_zu"] is True, (g, r["zeilen"][-3:]))
# 11.S2 (erkennt die Mutation «M3»):
# Not-Aus, Verkaufen eindeutig abgelehnt; Richtungs-Long unter Stop, daneben freie Absicherungs-Coins + Short → gesperrte Coins
# gelten als gesichert: kein zweiter Spot-Stop über die Absicherung, kein Perp-Stop nötig
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=10 ** 6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S2 Not-Aus, Verkaufen eindeutig abgelehnt, Richtungs-Long unter Stop + freie Absicherung: kein zweiter Spot-Stop über die "
       "Absicherung (nach dem Auslösen kein nackter Short)",
       not befunde(k, d) and r["alles_zu"] is False and g["s_qty"] <= max(0.0, g["netto"]) + 1e-4 and g["p_qty"] == 0,
       (befunde(k, d), g, r["zeilen"][-4:]))
# 11.S3 (erkennt die Mutation «R10-M16»):
# beidseitig gesichert (unklarer Ernte-Short), Not-Aus: Verkaufen eindeutig abgelehnt, neue Perp-Stops 429 → der alte Perp-Stop
# darf nicht vor dem Auflösen des Paares gelöscht werden (sonst Short ohne Stop, sobald der Spot-Stop die Coins verkauft)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="vor503", anzahl=1)]
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = []
g0 = lage(k, "BTCUSDT")
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=10 ** 6),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S3 Not-Aus beidseitig, Verkaufen abgelehnt, neue Perp-Stops gesperrt: der alte Perp-Stop bleibt bis zur Position 0",
       not befunde(k, d) and g["p_qty"] >= -g["pos"] - 1e-9, (befunde(k, d), g, r["zeilen"][-4:]))
# 11.S4 (erkennt die Mutation «R11-M18»):
# Not-Aus, freie Coins (ohne Short), erster Verkauf abgelehnt; beim Schutz-Stop fällt der Kurs unter den Stop und kein Kurs ist
# lesbar → die Coins werden zum Markt verkauft (nie Coins ohne Stop)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)  # Ernte-Paar: Coins + Short
k.buchen("BTCUSDT", -k.pos["BTCUSDT"], B.kurs["BTCUSDT"])  # der Short ist weg (z. B. ausgelöst) — die Coins liegen frei, ohne Stop
gemacht = [0]
def h18(m, pfad, p_):
    if m == "POST" and pfad == "/api/v3/order" and p_.get("type", "").startswith("STOP") and not gemacht[0]:
        gemacht[0] = 1
        B.bewegen("BTCUSDT", B.kurs["BTCUSDT"] * 0.9)
        B.regeln.extend([regel(methode="GET", pfad="/api/v3/ticker/price", art="429", anzahl=10 ** 6),
                         regel(methode="GET", pfad="/fapi/v1/premiumIndex", art="429", anzahl=10 ** 6)])
B.vor_jeder_anfrage = h18
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=1)]
r = lauf([], env_echt(), d, notaus=True)
B.vor_jeder_anfrage = None
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S4 Not-Aus: Spot-Schutz-Stop würde sofort auslösen, kein Kurs lesbar → Coins zum Markt verkauft",
       g["coins"] * B.kurs["BTCUSDT"] < 5 and not befunde(k, d) and any("zum Markt verkauft" in z for z in r["zeilen"]), (g, r["zeilen"][-4:]))
# 11.S5 (erkennt die Mutation «M13»):
# beidseitig (unklarer Ernte-Short im Buch), der Kurs liegt über dem neuen Short-Stop-Kurs, aber unter dem stehenden Perp-Stop →
# der Abgleich kauft den Short zurück — höchstens so viel, wie offen ist (sonst lehnt Binance den reduceOnly-Auftrag ab)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
e = E("BTC", -0.5)
e["stop_short"] = 106000.0
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="vor503", anzahl=1)]
lauf([e], env_echt(), d)
B.regeln = []
g0 = lage(k, "BTCUSDT")
B.bewegen("BTCUSDT", 104000.0)
e3 = E("BTC", -0.5)
e3["stop_short"] = 103000.0
n0 = len(B.log)
r = lauf([e3], env_echt(), d)
_rk = [(x[3].get("quantity"), x[4]) for x in B.log[n0:] if x[2] == "/fapi/v1/order" and x[3].get("reduceOnly") == "true"]
g = lage(k, "BTCUSDT")
pruefe("11.S5 beidseitig, Kurs über dem neuen Short-Stop: Rückkauf nur der offenen Position (reduceOnly wird nicht abgelehnt), "
       "kein Short über die Absicherung hinaus bleibt", all(c == 200 for _, c in _rk) and _rk and g["netto"] > -0.0005 and not befunde(k, d),
       (_rk, g, r["zeilen"][-3:]))
# 11.S6 (erkennt die Mutation «R10-M10»):
# hängender STOP_LOSS_LIMIT über allen Coins (keine freien), Nachkontrolle: der erste Ausstieg (Stop + Verkauf in einer
# Anfrage) wird einmal abgelehnt → die Runde ändert nichts, der Kurs liegt aber jenseits des Stops → noch eine Runde, sie steigt aus
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 1.0)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)
b = L.buch_lesen(d, "echt")
b["schutz_offen"] = ["BTC"]
L.buch_schreiben(d, "echt", b)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=1)]
r = P.nachkontrolle(env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
haengt = [o for o in k.orders.values() if o.get("aktiv") and o["status"] == "NEW"]
pruefe("11.S6 hängender Stop-Limit, erster Ausstieg abgelehnt, Runde ohne Änderung: der Kurs liegt jenseits → noch eine Runde, "
       "sie steigt zum Markt aus (kein Takt endet ohne Stop)", not haengt and g["coins"] * 85000 < 150 and not befunde(k, d)
       and not any("OHNE Stop" in z for z in r["zeilen"]), (len(haengt), g, r["zeilen"][-4:]))
# 11.S7 (erkennt die Mutation «R10-M13»):
# die Richtung (Short) ist zu (z. B. von Hand zurückgekauft), der alte Perp-Stop deckt jetzt nur noch die Ernte-Absicherung
# und lässt sich nicht löschen (löst er aus, kauft er sie zurück) → beidseitig: die Coins kommen unter einen Spot-Stop
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
coins = k.frei["BTC"] + k.gesperrt["BTC"]
k.buchen("BTCUSDT", round(-k.pos["BTCUSDT"] - coins, 3), B.kurs["BTCUSDT"])  # nur noch das Ernte-Paar
b = L.buch_lesen(d, "echt")
b["schutz_offen"] = ["BTC"]
L.buch_schreiben(d, "echt", b)
B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
r = P.nachkontrolle(env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S7 verwaister Perp-Stop über der Absicherung, nicht löschbar → beidseitig (die Coins haben einen Spot-Stop)",
       not befunde(k, d) and g["s_qty"] >= g["coins"] - 1e-4, (befunde(k, d), g, r["zeilen"][-3:]))
# 11.S8 (erkennt die Mutation «R10-M14»):
# Kurs schon über dem neuen Short-Stop, Rückkauf abgelehnt; der stehende Perp-Stop ist aber grösser als der ungesicherte
# Short (er deckt auch die Absicherung) → zuerst ein passender Not-Stop, dann der alte weg — er bleibt nicht einfach stehen
k = neues_konto(20000)
d = neu_buch()
e = E("BTC", -0.5)
e["stop_short"] = 106000.0
lauf([e], env_echt(), d)
for a in k.algos.values():
    if a["symbol"] == "BTCUSDT":
        a["quantity"] = repr(round(-k.pos["BTCUSDT"], 3))  # z. B. nach einer beidseitigen Phase: deckt den ganzen Short
B.bewegen("BTCUSDT", 104000.0)
e3 = E("BTC", -0.5)
e3["stop_short"] = 103000.0
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=10 ** 6)]
r = lauf([e3], env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S8 Rückkauf abgelehnt, alter Perp-Stop zu gross → passender Not-Stop, der alte weg; kein Folgeschaden",
       not befunde(k, d) and g["p_qty"] <= max(0.0, -g["netto"]) + 0.0015, (befunde(k, d), g, r["zeilen"][-3:]))
# 11.S9 (erkennt die Mutation «R10-M15»):
# der Spot-Stop deckt alle Coins (auch die Absicherung), sein Ersetzen per cancelReplace bleibt immer unklar (503) → der alte
# steht vielleicht noch: beidseitig (der Short bekommt seinen Stop über die ganze Menge)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
for o in k.orders.values():
    if o["symbol"] == "BTCUSDT" and o["status"] == "NEW" and o["typ"].startswith("STOP"):
        extra = round(k.frei["BTC"] - 0.000005, 5)
        o["qty"] = round(o["qty"] + extra, 5)
        k.frei["BTC"] -= extra
        k.gesperrt["BTC"] += extra
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=10 ** 6)]
r = lauf([E("BTC", 0.5)], env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S9 Ersetzen des zu grossen Spot-Stops bleibt unklar → beidseitig, kein Folgeschaden", not befunde(k, d),
       (befunde(k, d), g, r["zeilen"][-3:]))
# 11.S10 (erkennt die Mutation «R10-M19'»):
# zwei alte Perp-Stops (z. B. eine verlorene Antwort, die doch ankam), der neue wird abgelehnt → die überzähligen werden
# gelöscht (Löschen geht), einer bleibt — der Markt muss dafür nicht beidseitig gesichert werden
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
a0 = next(a for a in k.algos.values() if a["symbol"] == "BTCUSDT")
a1 = dict(a0)
a1["clientAlgoId"] = L.CID_STOP_PERP + "zweiter"
k.algos[B.neue_id()] = a1
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
r = lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("11.S10 zwei alte Perp-Stops, neuer abgelehnt → der überzählige gelöscht, einer bleibt, nicht beidseitig",
       g["n_p"] == 1 and g["s_qty"] < g["coins"] / 2 and not befunde(k, d), (befunde(k, d), g, r["zeilen"][-3:]))
# 11.S11 (erkennt die Mutation «R10-M24»):
# ein Spot-Auftrag im Lauf bleibt unklar (503) und Binance nimmt danach nichts Neues mehr an (Lesart «Storno zuerst») → wie
# nach einer Ablehnung: kein cancelReplace, bestehende Stops bleiben
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d)
an = [0]
def h24(m, pfad, p_):
    if m == "POST" and pfad == "/api/v3/order" and p_.get("type") == "MARKET" and not an[0]:
        an[0] = 1
        B.regeln.extend([regel(methode="POST", pfad=x, art="429", anzahl=10 ** 6, ab_req=B.n_req + 1)
                         for x in ("/api/v3/order", "/fapi/v1/order", "/fapi/v1/algoOrder")])
B.vor_jeder_anfrage, B.ersetzen_storno_zuerst = h24, True
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=lambda m, p_, q: q.get("type") == "MARKET", art="vor503", anzahl=1)]
n0 = len(B.log)
try:
    r = lauf([E("BTC", 0.25, stop_abstand=0.08)], env_echt(), d)
finally:
    B.vor_jeder_anfrage, B.regeln, B.ersetzen_storno_zuerst = None, [], False
_cr = [x for x in B.log[n0:] if x[2] == "/api/v3/order/cancelReplace"]
g = lage(k, "BTCUSDT")
pruefe("11.S11 unklarer Spot-Auftrag im Lauf gilt wie eine Ablehnung: kein cancelReplace, kein Schutzverlust",
       not _cr and ungesichert_usdt(k) <= 10, (len(_cr), P.ungesichert(k, "BTCUSDT"), r["zeilen"][-3:]))
# 11.S12 (erkennt die Mutation «R11-M12»):
# Vorab nach dem Ernte-Kauf: gekaufte Coins kommen abzüglich der Gebühr an — der Perp-Stop schrumpft auf das, was bis zum
# Plan-Ende sicher ungesichert ist, MIT der Gebühr gerechnet (sonst bliebe ein Teil des Shorts ohne Stop)
k = neues_konto(400000)
cfg = L.einstellungen(env_echt(kapital=400000))
spot, fut = L.Spot(cfg["spot"]), L.Fut(cfg["futures"])
sym = "BTCUSDT"
k.frei["BTC"] = 0.5
k.buchen(sym, -1.6, B.kurs[sym])
d = {"sym": sym, "coin": "BTC", "kurs": B.kurs[sym], "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
fut.stop_menge(sym, "BUY", 1.2, 110000.0, d["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
buch = L.leer_buch()
geaendert = L._stops_vorab(spot, fut, buch, "BTC", d, {"info": {"spot_ziel": 2.5, "perp_ziel": -3.0}})
g = lage(k, sym)
erwartet = 3.0 - L.PL.runde(0.5 + 2.0 * (1 - L.GEB_SPOT_KAUF), d["rf"]["step"])
pruefe("11.S12 Vorab nach dem Kauf: Perp-Stop auf das Plan-Ende MIT Kauf-Gebühr (nie kleiner als der dann ungesicherte Short)",
       geaendert and g["n_p"] == 1 and abs(g["p_qty"] - erwartet) < 1e-9, (geaendert, g, erwartet))
# 11.S13 (erkennt die Mutation «R11-M22»):
# der Spot-Stop des ersten Laufs erscheint nie in der Auftragsliste (Listen-Verzug); der zweite Lauf verkleinert die Richtung
# → der unsichtbare Stop ist jetzt grösser als nötig (er deckt Absicherung) → beidseitig
k = neues_konto(20000)
d = neu_buch()
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=lambda m, p_, q: q.get("type", "").startswith("STOP"), art="unsichtbar",
                  listen=10 ** 6, anzahl=1)]
lauf([E("BTC", 0.5)], env_echt(), d)
B.regeln = []
g0 = lage(k, "BTCUSDT")
r = lauf([E("BTC", 0.25)], env_echt(), d)
g = lage(k, "BTCUSDT")
pruefe("11.S13 unsichtbarer Spot-Stop, jetzt grösser als die Richtung → beidseitig, kein Folgeschaden", not befunde(k, d),
       (befunde(k, d), g, r["zeilen"][-3:]))

# ── 12. Prüfung: Belege p1–p6 und die Fixes als feste Szenarien ──
MARKT_KAUF = lambda m, p, q: q.get("type") == "MARKET" and q.get("side") == "BUY"  # noqa: E731
KURS_WEG = [regel(methode="GET", pfad="/api/v3/ticker/price", art="429", anzahl=10 ** 6),
            regel(methode="GET", pfad="/fapi/v1/premiumIndex", art="vor503", anzahl=10 ** 6)]
# p1 (B1): Not-Aus, Rückkauf unklar → beidseitig; beim Schutz-Stop springt der Kurs +7 %, Ticker 429 + Markpreis 503 → zum Markt;
# Binance führt den reduceOnly-Rückkauf nur teilweise aus (EXPIRED): nachfassen bis zum Ziel, den Rest weit stoppen — nie
# «zurückgekauft» melden, was nicht zurückgekauft ist
for name, anzahl in (("einmal nur halb ausgeführt", 1), ("immer nur halb ausgeführt", 10 ** 6)):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", 0.0)], env_echt(), d)
    gemacht = [0]

    def h12p1(m, pfad, p_, anzahl=anzahl):
        if m == "POST" and pfad == "/fapi/v1/algoOrder" and not gemacht[0]:
            gemacht[0] = 1
            B.bewegen("BTCUSDT", B.kurs["BTCUSDT"] * 1.07)
            B.regeln.extend([dict(r_) for r_ in KURS_WEG]
                            + [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="teil", anteil=0.5, anzahl=anzahl)])
    B.vor_jeder_anfrage = h12p1
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=1)]
    r = lauf([], env_echt(), d, notaus=True)
    B.vor_jeder_anfrage = None
    B.regeln = []
    g = lage(k, "BTCUSDT")
    _falsch = [z for z in r["zeilen"] if "Short 0.094 zum Markt zurückgekauft" in z and g["pos"] != 0]
    # nachgefasst (erkennt R12-M2): «einmal halb» → der zweite Versuch kauft den Rest (Short ganz zu); «immer halb» → nach 5
    # Versuchen bleibt nur ein kleiner Rest unter dem weiten Not-Stop (ohne Nachfassen bliebe die Hälfte)
    nachgefasst = abs(g["pos"]) < 1e-9 if anzahl == 1 else abs(g["pos"]) < 0.01
    pruefe(f"12.p1 Not-Aus zum Markt, Rückkauf {name}: der Rest wird nachgefasst bzw. weit gestoppt, keine falsche Meldung",
           not befunde(k, d) and not _falsch and g["p_qty"] >= -g["pos"] - 1e-9 and ungesichert_usdt(k) <= 10 and nachgefasst,
           (befunde(k, d), g, r["zeilen"][-3:]))
# p1c (B1): kein Kurs lesbar UND kein zuletzt bekannter Kurs im Buch → der ungesicherte Short (über die Coins hinaus) wird trotzdem
# reduceOnly geschlossen — das braucht keinen Kurs; das abgesicherte Paar bleibt stehen
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
_b = L.buch_lesen(d, "echt")
for _st in _b["stops"].values():
    _st.pop("kurs", None)
L.buch_schreiben(d, "echt", _b)
B.regeln = [dict(r_) for r_ in KURS_WEG]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("12.p1c Not-Aus ohne jeden Kurs: der ungesicherte Short wird reduceOnly geschlossen, das Paar bleibt (netto 0), nicht «alles zu»",
       abs(g["netto"]) * B.kurs["BTCUSDT"] < 150 and g["pos"] < 0 and r["alles_zu"] is False, (g, r["zeilen"][-4:]))
# p1d (B1): kein Kurs lesbar, aber ein zuletzt bekannter Kurs im Buch → der Not-Aus läuft mit ihm normal (Marktaufträge brauchen
# keinen Kurs) und schliesst alles
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [dict(r_) for r_ in KURS_WEG]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("12.p1d Not-Aus ohne Kurs, aber mit zuletzt bekanntem Kurs: schliesst wie sonst",
       g["pos"] == 0 and g["coins"] * B.kurs["BTCUSDT"] < 10 and any("zuletzt bekannten Kurs" in z for z in r["zeilen"]),
       (g, r["zeilen"][-4:]))
# p2 (B2): zu grosser Spot-Stop lässt sich im Not-Aus nicht verkleinern/löschen → beidseitig: der Short hat seinen Stop über die
# ganze Menge UND die übrigen Coins bekommen einen Spot-Stop — löst der (alte, grössere) Perp-Stop aus, liegt kein Long ohne Stop da
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=10 ** 6),
            regel(methode="DELETE", pfad="/api/v3/order", art="429", anzahl=10 ** 6),
            regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=10 ** 6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
vor = befunde(k, d)
g = lage(k, "BTCUSDT")
if g["p_preise"]:
    B.bewegen("BTCUSDT", max(g["p_preise"]) * 1.01)
h = lage(k, "BTCUSDT")
pruefe("12.p2 Not-Aus, zu grosser Spot-Stop bleibt: die übrigen Coins bekommen einen Spot-Stop — nach dem Perp-Stop kein Long ohne Stop",
       not vor and max(0.0, min(h["netto"], h["coins"]) - h["s_qty"]) * h["kurs"] < 150, (vor, g, h, r["zeilen"][-3:]))
# p3 (W1): Perp-Stop-Liste dauerhaft nicht lesbar, Rückkauf abgelehnt → auch nach der Nachkontrolle (jeder Takt ein Not-Aus) genau
# EIN Perp-Stop (der bekannte alte wird über seine Kennung gelöscht, sobald der neue steht)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="429", anzahl=10 ** 6),
            regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=10 ** 6)]
lauf([], env_echt(), d, notaus=True)
P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("12.p3 Perp-Liste unlesbar im Not-Aus: nach der Nachkontrolle genau ein Perp-Stop, nichts ungeschützt",
       g["n_p"] == 1 and not befunde(k, d), (g, befunde(k, d)))
# p5 (B3): zwei Not-Aus gleichzeitig — B (Takt der Nachkontrolle) las das Buch, bevor A (von Hand) einen unklaren Coin-Kauf eintrug;
# B schliesst und will das leere Buch schreiben → zusammenführen statt überschreiben: Datei bleibt, nicht «alles zu»; die
# Nachkontrolle klärt den verspätet angekommenen Kauf und schliesst ihn
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
_schnapp = Path(d).read_text()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=2),
            regel(methode="POST", pfad="/api/v3/order", pred=MARKT_KAUF, art="spaet_u", anzahl=1)]
L.notaus_alle(env_echt(), d)
B.regeln = []
_lesen_echt, _n = L.buch_lesen, [0]


def _wie_b(datei, modus):
    if _n[0] == 0:
        _n[0] = 1
        _t = Path(str(d) + ".b")
        _t.write_text(_schnapp)
        return _lesen_echt(_t, modus)
    return _lesen_echt(datei, modus)


L.buch_lesen = _wie_b
try:
    rB = L.notaus_alle(dict(env_echt(), KI_BOT_STOP="1"), d, wiederholung=True)
finally:
    L.buch_lesen = _lesen_echt
_datei_da = Path(d).exists()
P.pending_abarbeiten()
P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
g = lage(k, "BTCUSDT")
pruefe("12.p5 zwei Not-Aus gleichzeitig: das Buch wird zusammengeführt (Datei bleibt, nicht «alles zu»), die Nachkontrolle schliesst "
       "den verspätet angekommenen Kauf", rB["alles_zu"] is False and _datei_da and g["pos"] == 0 and g["coins"] * B.kurs["BTCUSDT"] < 10,
       (rB["alles_zu"], _datei_da, g))
_v = L._buch_vereinen(dict(L.leer_buch(), start="2026-10-14", unklar=[{"markt": "BTC", "cid": "a"}], notaus_offen=True,
                           schutz_offen=["BTC"], paar_pause={"BTC": 9}),
                      dict(L.leer_buch(), unklar=[{"markt": "ETH", "cid": "b"}], schutz_offen=["ETH"], paar_pause={"BTC": 5, "ETH": 3}))
pruefe("12.p5b Buch zusammenführen: Unklares beider, offene Märkte BEIDER, «Not-Aus offen», Start und je Markt die spätere Paar-Pause",
       len(_v["unklar"]) == 2 and _v["notaus_offen"] and sorted(_v["schutz_offen"]) == ["BTC", "ETH"] and _v["start"] == "2026-10-14"
       and _v["paar_pause"] == {"BTC": 9, "ETH": 3}, _v)
# p6 (W2): nach dem ersten 409 (Binance storniert, lehnt den Ersatz ab) ersetzt Pilot 2.0 keinen weiteren Stop per cancelReplace
funde = []
for seed in (9193, 9217, 9464, 9652):
    funde += P.monotonie_runde(seed)
pruefe("12.p6 Monotonie-Seeds der 12. Prüfung: höchstens der erste 409 je Markt (Restrisiko), kein zweiter Schutzverlust",
       not P.echte(funde), [(f[0], f[1].get("seed"), f[2]) for f in P.echte(funde)][:5])
# K1: «dauerhaft gestört» zählt nur für das Setzen eines Stops der Schutzseite oder das Lesen — nie für Marktaufträge, Löschen,
# cancelReplace oder den Kurs-Abruf
_dr = lambda **kw: dict(anzahl=10 ** 6, art="vor503", **kw)  # noqa: E731
pruefe("12.K1 _dauer: nur dauerhaft gesperrtes Stop-Setzen der Schutzseite oder das Lesen der Lage zählt als unvermeidbar",
       not P._dauer([_dr(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF)], "LONG_OHNE_STOP")
       and not P._dauer([_dr(methode="DELETE", pfad="/api/v3/order")], "LONG_OHNE_STOP")
       and not P._dauer([_dr(methode="POST", pfad="/api/v3/order/cancelReplace")], "LONG_OHNE_STOP")
       and not P._dauer([_dr(methode="GET", pfad="/api/v3/ticker/price")], "LONG_OHNE_STOP")
       and P._dauer([_dr(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG)], "LONG_OHNE_STOP")
       and not P._dauer([_dr(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG)], "SHORT_OHNE_STOP")
       and P._dauer([_dr(methode="POST", pfad="/fapi/v1/algoOrder")], "SHORT_OHNE_STOP")
       and P._dauer([_dr(methode="GET", pfad="/api/v3/account")], "SHORT_OHNE_STOP"))
# K2: «Storno zuerst» entschuldigt nur den ersten 409 je Markt
_n0 = len(B.log)
B.log.append(("k", "POST", "/api/v3/order/cancelReplace", {"symbol": "BTCUSDT"}, 409, 4711, ""))
_eins = P._storno409(_n0, "BTCUSDT")
B.log.append(("k", "POST", "/api/v3/order/cancelReplace", {"symbol": "BTCUSDT"}, 409, 4711, ""))
pruefe("12.K2 «Storno zuerst»: nur der erste 409 je Markt ist das Restrisiko, ein zweiter zählt als Befund",
       _eins and not P._storno409(_n0, "BTCUSDT") and not P._storno409(_n0), (_eins,))
del B.log[_n0:]
# K3: Kurslücke über das Limit eines eben ausgelösten STOP_LOSS_LIMIT (Konto ohne STOP_LOSS) nach dem letzten Abgleich → bekanntes
# Restrisiko LIMIT_LUECKE_ (der nächste Lauf steigt zum Markt aus), kein echter Befund
funde = P.laeufe_runde(9278, 3)
pruefe("12.K3 Lauf-Seed 9278 (Stop-Limit nach dem Abgleich übersprungen): als LIMIT_LUECKE_ eingestuft, sonst nichts",
       any("LIMIT_LUECKE_" in f[0] for f in funde) and not P.echte(funde), [(f[0], f[1].get("tag")) for f in funde][:5])
# K4: das Symbol geht MITTEN im Lauf auf BREAK — der Abgleich liest exchangeInfo frisch und ersetzt keinen Stop per cancelReplace
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 1.0)], env_echt(), d)
_an = [0]


def h12k4(m, pfad, p_):
    if m == "GET" and pfad == "/fapi/v2/account" and not _an[0]:
        _an[0] = 1
        B.symbol_status["BTCUSDT"] = "BREAK"


B.vor_jeder_anfrage = h12k4
n0 = len(B.log)
try:
    r = lauf([E("BTC", 1.0, stop_abstand=0.12)], env_echt(), d)  # neuer Stop-Kurs → würde sonst per cancelReplace ersetzt
finally:
    B.vor_jeder_anfrage = None
    B.symbol_status.clear()
_cr = [x for x in B.log[n0:] if x[2] == "/api/v3/order/cancelReplace"]
pruefe("12.K4 Symbol geht mitten im Lauf auf BREAK: der Abgleich ersetzt keinen Stop per cancelReplace, der Stop bleibt",
       _an[0] and not _cr and lage(k, "BTCUSDT")["s_qty"] > 0, (_an, len(_cr), P.zeigen(k)["BTCUSDT"]))

# ── Schlussprobe der 12. Runde: Funde der eigenen Prüfkampagne (je ein festes Szenario) ──
# 12.F1 (Lauf-Seed 9330):
# Kurs unter dem Plan-Stop, aber noch über dem stehenden alten Stop; Binance lehnte heute in diesem Markt ab → der Stop bleibt
# (kein cancelReplace). Der Ausstieg verkaufte danach die FREIEN Coins — die Absicherung des Shorts → zu grosser Stop und nach
# seinem Auslösen ein nackter Short. Jetzt: verkauft wird nur, was nicht unter dem stehenden Stop liegt; der Stop zählt als
# Schutz; keine Wiederholungs-Runden mit falschen Meldungen («Kontostand mehrmals geändert», «OHNE Stop», «gelang in N Runden
# nicht»), dieselbe Warnung nur einmal. Dritte Variante: das Symbol ist nicht im Handel (BREAK) — der Stop bleibt ebenso
for name, art in (("Plan-Verkauf abgelehnt (danach kein Ersetzen)", "plan"), ("Verkauf im cancelReplace abgelehnt (Stop bleibt)", "ersetzen"),
                  ("Symbol nicht im Handel (BREAK)", "break")):
    k = neues_konto(20000)
    d = neu_buch()
    e = E("BTC", 0.5)
    e["stop_long"] = 80000.0
    lauf([e], env_echt(), d)
    B.bewegen("BTCUSDT", 85000.0)
    _n = []
    _pred = (lambda m, p_, q, _n=_n: MARKT_VERKAUF(m, p_, q) and _n.append(1) is None and len(_n) >= 2) if art == "ersetzen" else MARKT_VERKAUF
    B.regeln = [] if art == "break" else [regel(methode="POST", pfad="/api/v3/order", pred=_pred, art="ablehnen")]
    if art == "break":
        B.symbol_status["BTCUSDT"] = "BREAK"
    try:
        r = lauf([dict(e, stop_long=90000.0)], env_echt(), d)
    finally:
        B.regeln = []
        B.symbol_status.clear()
    _falsch = [z for z in r["zeilen"] if "mehrmals geändert" in z or "OHNE Stop" in z or "Runden nicht" in z]
    _doppelt = [z for z in set(r["zeilen"]) if z.startswith("⚠️") and r["zeilen"].count(z) > 1]
    pruefe(f"12.F1 Kurs unter dem Plan-Stop, {name}: die Absicherung wird nie verkauft, der stehende Stop zählt als Schutz",
           not befunde(k, d) and not _falsch and not _doppelt and any("@ 80000 bleibt (" in z for z in r["zeilen"]),
           (P.zeigen(k)["BTCUSDT"], befunde(k, d), _falsch, _doppelt, r["zeilen"][-4:]))
funde = P.laeufe_runde(9330, 13)
pruefe("12.F1 Lauf-Seed 9330: keine Befunde", not P.echte(funde), [(f[0], f[1].get("tag")) for f in P.echte(funde)][:5])
# 12.F2 (Lauf-Seed 9179):
# Konto ohne STOP_LOSS: der Kurs springt NACH dem letzten Blick von Pilot 2.0 auf die Spot-Auftragsliste über das Limit des eben
# gesetzten STOP_LOSS_LIMIT (Markt beidseitig gesichert) → bekanntes Restrisiko LIMIT_LUECKE_ (die Nachkontrolle steigt aus).
# Gegenprobe: hat Pilot 2.0 die Liste NACH dem Sprung gelesen, zählt dieselbe Lücke als echter Befund (er hätte aussteigen müssen)
funde = P.laeufe_runde(9179, 22)
pruefe("12.F2 Lauf-Seed 9179 (Sprung nach dem letzten Blick, beidseitig): als LIMIT_LUECKE_ eingestuft, sonst nichts",
       any("LIMIT_LUECKE_" in f[0] for f in funde) and not P.echte(funde), [(f[0], f[1].get("tag")) for f in funde][:5])
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 1.0)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)  # Lücke unter das Limit (90000 × 0,95 = 85500): der ausgelöste STOP_LOSS_LIMIT hängt
_vor = [b[0] for b in P.schutz_befunde(k)]
L.Spot(L.einstellungen(env_echt())["spot"]).eigene_stops("BTCUSDT")  # Pilot 2.0 sieht die Liste mit dem hängenden Stop
_nach = [b[0] for b in P.schutz_befunde(k)]
pruefe("12.F2 Gegenprobe: eine Limit-Lücke ist nur unvermeidbar, solange Pilot 2.0 die Liste nach dem Sprung nicht gesehen hat",
       "LIMIT_LUECKE_LONG_OHNE_STOP" in _vor and "LONG_OHNE_STOP" in _nach, (_vor, _nach))
# 12.F3 (Not-Aus-Seed 7529):
# Not-Aus, Rückkauf unklar → beidseitig; der Schutz-Stop für den Short «würde sofort auslösen» (Kurs +7 %, kein Kurs lesbar) →
# zum Markt — der reduceOnly-Rückkauf scheitert aber am Rate-Limit (429 auf Marktaufträgen). Vorher blieb der Short ohne Stop;
# jetzt bekommt er wenigstens einen WEITEN Not-Stop (Stop-Aufträge gehen über einen anderen Pfad)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
gemacht = [0]


def h12f3(m, pfad, p_):
    if m == "POST" and pfad == "/fapi/v1/algoOrder" and not gemacht[0]:
        gemacht[0] = 1
        B.bewegen("BTCUSDT", B.kurs["BTCUSDT"] * 1.07)
        B.regeln.extend([dict(r_) for r_ in KURS_WEG] + [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=10 ** 6)])


B.vor_jeder_anfrage = h12f3
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503", anzahl=1)]
try:
    r = lauf([], env_echt(), d, notaus=True)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("12.F3 Not-Aus, Rückkauf zum Markt am Rate-Limit gescheitert: der Short bekommt einen weiten Not-Stop (nie ohne Stop)",
       not befunde(k, d) and g["pos"] < 0 and g["p_qty"] >= -g["pos"] - 1e-9 and any("WEITEN Not-Stop" in z for z in r["zeilen"]),
       (befunde(k, d), g, r["zeilen"][-4:]))
funde = P.notaus_runde(7529)
pruefe("12.F3 Not-Aus-Seed 7529: keine Befunde", not P.echte(funde), [(f[0], f[1].get("wann")) for f in P.echte(funde)][:5])
# 12.F4 (eigene Prüfung nach 12.F1/F2):
# Konto ohne STOP_LOSS: eine Kurslücke lässt den STOP_LOSS_LIMIT über dem Kurs hängen (er schützt nicht mehr), und Binance lehnt
# Marktverkäufe dauerhaft ab (PERCENT_PRICE) — Stops setzen geht aber. Vorher blieb der Long ohne wirksamen Stop (8445 USDT);
# jetzt kommt an die Stelle des hängenden ein Not-Stop unter dem Kurs (cancelReplace; lehnt Binance ab, bleibt der hängende)
for hebel in (0.5, 1.0):
    k = neues_konto(20000)
    B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d = neu_buch()
    e = E("BTC", hebel)
    e["stop_long"] = 90000.0
    lauf([e], env_echt(), d)
    B.bewegen("BTCUSDT", 85000.0)
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=10 ** 6)]
    try:
        r = lauf([e], env_echt(), d)
    finally:
        B.regeln = []
    pruefe(f"12.F4 hängender Stop-Limit, Verkaufen dauerhaft abgelehnt (Hebel {hebel}): ein Not-Stop unter dem Kurs schützt den Long",
           not befunde(k, d) and not P._haengend(k, "BTCUSDT") and lage(k, "BTCUSDT")["s_qty"] > 0,
           (befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"][-4:]))

# ── Schlussprobe der 12. Runde: Lücken der Mutationsprobe (je ein festes Szenario; gleichwertig sind R12-M5/M23/M34, R10-M17,
#    R11-M19 — Begründung im README) ──


def handlage(coins=0.0, short=0.0, kurs=100000.0, usdt=20000.0):
    """Kontostand von Hand: Coins im Spot, Short im Perp, Kurs — dazu Spot-/Futures-Anschluss und die Markt-Daten d."""
    k_ = neues_konto(usdt)
    B.bewegen("BTCUSDT", kurs)
    cfg_ = L.einstellungen(env_echt())
    sp_, fu_ = L.Spot(cfg_["spot"]), L.Fut(cfg_["futures"])
    k_.frei["BTC"] = coins
    if short:
        k_.buchen("BTCUSDT", -short, kurs)
    return k_, sp_, fu_, {"sym": "BTCUSDT", "coin": "BTC", "kurs": kurs, "rs": sp_.regeln2("BTCUSDT"), "rf": fu_.regeln("BTCUSDT")}


def eigener_spot_stop(sp_, d_, menge, preis):
    return sp_.stop_verkauf(d_["sym"], menge, preis, d_["rs"], cid=L._kennung(L.CID_STOP_SPOT))


def cr_zahl(n0):
    return sum(1 for x in B.log[n0:] if x[2] == "/api/v3/order/cancelReplace")


_W = []
# 12.S1 (R12-M1): Not-Aus, Verkaufen geht nicht (das Paar bleibt), Rückkauf des Richtungs-Shorts abgelehnt (429), der alte Perp-Stop ist
# weg; der neue Schutz-Stop würde sofort auslösen (Kurs +12 % über den Plan-Stop, kein Kurs lesbar) → zum Markt NUR den Richtungs-Short
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
k.algos.clear()
gemacht = [0]


def h12s1(m, pfad, p_):
    if m == "POST" and pfad == "/fapi/v1/algoOrder" and not gemacht[0]:
        gemacht[0] = 1
        B.bewegen("BTCUSDT", B.kurs["BTCUSDT"] * 1.12)
        B.regeln.extend([dict(r_) for r_ in KURS_WEG])


B.vor_jeder_anfrage = h12s1
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="ablehnen", anzahl=10 ** 6),
            regel(methode="POST", pfad="/fapi/v1/order", pred=lambda m, p_, q: REDUCE(m, p_, q) and not gemacht[0], art="429", anzahl=10 ** 6)]
try:
    lauf([], env_echt(), d, notaus=True)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("12.S1 Not-Aus zum Markt kauft nur den ungesicherten Short zurück — die Absicherung des Paars bleibt (Ziel = Stand − Menge)",
       gemacht[0] and g["pos"] < 0 and abs(-g["pos"] - g["coins"]) <= 0.001 + 1e-9, g)
# 12.S2 (R12-M3): Not-Aus-Rückkauf zum Markt kommt UNKLAR zurück (503 vor der Verarbeitung) → einmal neu geschickt → Short zu
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
gemacht = [0]


def h12s2(m, pfad, p_):
    if m == "POST" and pfad == "/fapi/v1/algoOrder" and not gemacht[0]:
        gemacht[0] = 1
        B.bewegen("BTCUSDT", B.kurs["BTCUSDT"] * 1.07)
        B.regeln.extend([dict(r_) for r_ in KURS_WEG] + [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503")])


B.vor_jeder_anfrage = h12s2
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="vor503")]
try:
    lauf([], env_echt(), d, notaus=True)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
pruefe("12.S2 Not-Aus: unklarer Rückkauf zum Markt wird einmal neu geschickt — Short zu, nicht nur weit gestoppt",
       abs(lage(k, "BTCUSDT")["pos"]) < 1e-9, lage(k, "BTCUSDT"))
# 12.S3 (R12-M18): der Not-Aus schliesst «echt» sauber; währenddessen trägt ein anderer Lauf einen gestarteten Testnetz-Modus ein →
# die Buch-Datei darf nicht gelöscht werden (sonst ginge dessen Stand verloren)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 1.0)], env_echt(), d)


def h12s3(m, pfad, p_):
    try:
        alles_ = json.loads(Path(d).read_text())
    except (OSError, ValueError):
        alles_ = {}
    if "testnetz" not in alles_:
        L.buch_schreiben(d, "testnetz", dict(L.leer_buch(), start={"usdt": 100.0}, uid=1))


B.vor_jeder_anfrage = h12s3
try:
    r = lauf([], env_echt(), d, notaus=True)
finally:
    B.vor_jeder_anfrage = None
pruefe("12.S3 «echt» alles zu, aber ein anderer Modus kam dazu: die Buch-Datei bleibt",
       r["alles_zu"] and Path(d).exists() and "testnetz" in json.loads(Path(d).read_text()), (r["alles_zu"], Path(d).exists()))
# 12.S4 (R12-M21): Perp-Liste unlesbar UND der alte Perp-Stop nicht löschbar → zwei stehen → die Coins bekommen einen Spot-Stop
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="429", anzahl=10 ** 6),
            regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=10 ** 6),
            regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
lauf([], env_echt(), d, notaus=True)
B.regeln = []
g = lage(k, "BTCUSDT")
if g["p_preise"]:
    B.bewegen("BTCUSDT", max(g["p_preise"]) * 1.01)
h = lage(k, "BTCUSDT")
_lang = max(0.0, min(h["netto"], h["coins"]) - h["s_qty"]) * h["kurs"]
pruefe("12.S4 zwei Perp-Stops (alter nicht löschbar): lösen beide aus, liegt kein Long ohne Stop da", g["n_p"] == 2 and _lang < 10, (g, _lang))
# 12.S5 (R11-M6): Not-Aus, Spot-Ticker gesperrt, Futures-Markpreis lesbar → frischer Markpreis, nicht der zuletzt bekannte Kurs
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 1.0)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/api/v3/ticker/price", art="429", anzahl=10 ** 6)]
r = lauf([], env_echt(), d, notaus=True)
B.regeln = []
pruefe("12.S5 Not-Aus, Ticker gesperrt, Markpreis da: frischer Kurs (keine Meldung «zuletzt bekannter Kurs»), alles zu",
       r["alles_zu"] and not any("zuletzt bekannten Kurs" in z for z in r["zeilen"]), r["zeilen"][-3:])
# 12.S6 (R11-F2): Stop über 0,2 BTC, Short 0,1 (Absicherung) → Netto 0,1; Kurs unter dem Plan-Stop → zum Markt NUR die Netto-Richtung
k, sp, fu, dd = handlage(coins=0.2, short=0.1, kurs=85000.0)
eigener_spot_stop(sp, dd, 0.2, 80000.0)
L._spot_stops_verkaufen(sp, "BTC", dd, {}, sp.eigene_stops("BTCUSDT"), {"auftraege": []}, _W.append, [], "Test", soll=0.1, schutz=[],
                        kurs=85000.0)
pruefe("12.S6 Ausstieg über einen Stop, der auch Absicherung deckt: verkauft nur die Netto-Richtung (0,1 BTC bleiben)",
       abs(lage(k, "BTCUSDT")["coins"] - 0.1) < 1e-6, lage(k, "BTCUSDT"))
# 12.S7 (R12-M25) und 12.S8 (R12-M26): Ersetzen abgelehnt (429) → der Abgleich merkt es sich (kein cancelReplace mehr in diesem Lauf)
for name, stops in (("ein Stop", (0.2,)), ("zwei Stops", (0.1, 0.1))):
    k, sp, fu, dd = handlage(coins=0.2, kurs=100000.0)
    for x in stops:
        eigener_spot_stop(sp, dd, x, 80000.0)
    s_ = L._soll(0.2, 0.0, 100000.0, dd)
    s_.update(frei=0.0, gebunden=0.2)
    B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=10 ** 6)]
    L._spot_abgleich(sp, "BTC", dd, {}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                     lambda w=None, sp=sp, fu=fu, dd=dd: L._lage(sp, fu, dd, w), False)
    B.regeln = []
    pruefe(f"12.S{7 if len(stops) == 1 else 8} Abgleich, {name}: Ersetzen abgelehnt → gemerkt (nur ergänzen, kein cancelReplace mehr)",
           dd.get("nur_ergaenzen") is True, dd)
# 12.S9 (R12-M27): Not-Aus, zwei gesperrte Stops, das erste cancelReplace storniert und lehnt ab (409) → KEIN zweites (der zweite schützt)
k, sp, fu, dd = handlage(coins=0.2, kurs=100000.0)
eigener_spot_stop(sp, dd, 0.1, 80000.0)
eigener_spot_stop(sp, dd, 0.1, 80000.0)
n0 = len(B.log)
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="nur_storno", anzahl=10 ** 6)]
L._notaus_gesperrte_verkaufen(sp, "BTC", "BTCUSDT", "BTC", 0.0, 0.0, 100000.0, dd["rs"], {"auftraege": []}, _W.append, "echt", L.leer_buch(), {})
B.regeln = []
pruefe("12.S9 Not-Aus: nach einem 409 kein zweites cancelReplace — der zweite Stop steht noch", cr_zahl(n0) == 1
       and lage(k, "BTCUSDT")["s_qty"] >= 0.1 - 1e-9, (cr_zahl(n0), lage(k, "BTCUSDT")))
# 12.S10 (R10-M15): ein zu grosser Stop (0,2 bei Netto 0,1), Ersetzen unklar (Antwort verloren) → sofort beidseitig gesichert
k, sp, fu, dd = handlage(coins=0.2, short=0.1, kurs=100000.0)
eigener_spot_stop(sp, dd, 0.2, 80000.0)
s_ = L._soll(0.2, -0.1, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.2)
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="nach503")]
L._spot_abgleich(sp, "BTC", dd, {}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                 lambda w=None: L._lage(sp, fu, dd, w), False)
B.regeln = []
pruefe("12.S10 zu grosser Stop, Ersetzen unklar → beidseitig gesichert (er könnte noch stehen und die Absicherung treffen)",
       dd.get("beidseitig") is True, dd)

# ── 13. Prüfung: Belege p2–p7 und die Fixes als feste Szenarien ──
def buch13(d_, modus="echt"):
    try:
        return json.loads(Path(d_).read_text()).get(modus) or {}
    except (OSError, ValueError):
        return {}


def ung13(k_, sym="BTCUSDT"):
    return tuple(round(x, 2) for x in P.ungesichert(k_, sym))


def flach13(k_):
    return all(abs(lage(k_, s_)["pos"]) < 1e-9 and abs(lage(k_, s_)["netto"]) * B.kurs[s_] < 10 for s_ in P.SYMS)


# 13.p4 (B1): Not-Aus im Cockpit, während der Tageslauf die Lauf-Sperre hält (das Cockpit überspringt Pilot 2.0) — STOP erscheint mitten im
#     Lauf → der Lauf schliesst Pilot 2.0 am Ende selbst (vorher: er handelte nur nicht mehr, schloss nichts, setzte kein «Not-Aus offen»)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5), E("ETH", -0.5)], env_echt(), d)


def h13p4(m, pfad, p_):
    P.BF.STOP_DATEI.write_text("Cockpit")


B.vor_jeder_anfrage = h13p4
try:
    r = lauf([E("BTC", 0.5), E("ETH", -0.5)], env_echt(), d)
finally:
    B.vor_jeder_anfrage = None
    P.BF.STOP_DATEI.unlink(missing_ok=True)
pruefe("13.p4 STOP erscheint mitten im Tageslauf → der Lauf schliesst Pilot 2.0 selbst (alles zu, Konto flach)",
       r["alles_zu"] is True and flach13(k), (r["alles_zu"], {s_: lage(k, s_) for s_ in P.SYMS}, r["zeilen"][-3:]))
# 13.p4b (B1): STOP kam erst NACH den Aufträgen (z. B. während des Lagebilds) — der Lauf sah ihn nicht; die Nachkontrolle im
#     Not-Aus-Modus schliesst trotzdem, sobald Pilot 2.0 Bestand hat (vorher: ohne «Not-Aus offen» still beendet)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5), E("ETH", -0.5)], env_echt(), d)
rn = P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
pruefe("13.p4b Nachkontrolle bei STOP, ohne «Not-Aus offen» im Buch: schliesst trotzdem (alles zu, Konto flach)",
       rn.get("alles_zu") is True and flach13(k), (rn.get("alles_zu"), {s_: lage(k, s_) for s_ in P.SYMS}, rn.get("zeilen")))

# 13.p3 (B2): Tageslauf T las das Buch VOR dem Not-Aus A von stop.bat (A schloss nach 120 s ohne Sperre, parallel): A's Coin-Verkauf
#     unklar → A sichert beidseitig und schreibt «unklar» + «Not-Aus offen». T darf das nicht überschreiben und keine Stops entfernen
#     (vorher: Stops weg, Buch überschrieben → nach der Ankunft ein Short ohne Coins und ohne Stop, 9'399 USDT)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
schnapp13 = Path(d).read_text()
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="spaet_u", anzahl=1)]
rA = L.notaus_alle(env_echt(), d)
B.regeln = []
echt_lesen13, n13 = L.buch_lesen, [0]


def lesen_wie_t13(datei, modus):
    if n13[0] == 0:
        n13[0] = 1
        tmp = Path(str(d) + ".t")
        tmp.write_text(schnapp13)
        return echt_lesen13(tmp, modus)
    return echt_lesen13(datei, modus)


def h13p3(m, pfad, p_):
    P.BF.STOP_DATEI.write_text("stop.bat")


L.buch_lesen = lesen_wie_t13
B.vor_jeder_anfrage = h13p3
try:
    rT = lauf([E("BTC", 0.0)], env_echt(), d)
    bT = buch13(d)
    rN = P.nachkontrolle(dict(env_echt(), KI_BOT_STOP="1"), d)
finally:
    B.vor_jeder_anfrage = None
    L.buch_lesen = echt_lesen13
    P.BF.STOP_DATEI.unlink(missing_ok=True)
    Path(str(d) + ".t").unlink(missing_ok=True)
P.pending_abarbeiten()
u13 = ung13(k)
pruefe("13.p3 Tageslauf neben dem Not-Aus von stop.bat: «unklar»/«Not-Aus offen» bleiben im Buch, nach der Ankunft nichts ohne Stop",
       rA["alles_zu"] is False and bT.get("unklar") and bT.get("notaus_offen") and max(u13) < 10,
       (u13, bT.get("unklar"), bT.get("notaus_offen"), lage(k, "BTCUSDT"), rT["zeilen"][-3:]))

# 13.p2 (B3): Tageslauf, die Perp-Stop-Liste ist ab dem Rückkauf dauerhaft gestört (Setzen/Löschen gehen): der alte Perp-Stop wäre über
#     der Absicherung zu gross → über seine Kennung gelöscht (vorher: nur Warnung; bei 110'500 Coins ohne Short und ohne Stop, 5'188 USDT).
#     b: Löschen geht auch nicht → beidseitig gesichert + Nachkontrolle
for name, loeschen_geht in (("Löschen geht", True), ("Löschen abgelehnt", False)):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", -0.5)], env_echt(), d)
    an13 = [0]

    def h13p2(m, pfad, p_, loeschen_geht=loeschen_geht):
        if m == "POST" and pfad == "/fapi/v1/order" and not an13[0]:
            an13[0] = 1
            B.regeln.append(regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6))
            if not loeschen_geht:
                B.regeln.append(regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6))
    B.vor_jeder_anfrage = h13p2
    try:
        r = lauf([E("BTC", 0.5)], env_echt(), d)
    finally:
        B.vor_jeder_anfrage = None
        B.regeln = []
    b13 = buch13(d)
    B.bewegen("BTCUSDT", 110500.0)
    u13 = ung13(k)
    pruefe(f"13.p2 Perp-Stop-Liste im Tageslauf unlesbar, {name}: kein zu grosser alter Stop über der Absicherung — bei 110'500 nichts "
           "ohne Stop" + ("" if loeschen_geht else " (beidseitig, Nachkontrolle gemerkt)"),
           max(u13) < 10 and (loeschen_geht or "BTC" in (b13.get("schutz_offen") or [])),
           (u13, lage(k, "BTCUSDT"), b13.get("schutz_offen"), [z for z in r["zeilen"] if "⚠️" in z][:3]))

# 13.p5 (W1): Not-Aus, Kurssprung beim ersten Schutz-Stop, der Rückkauf des ungesicherten Shorts ist zweimal UNKLAR → weiter Not-Stop;
#     die zweite Schutz-Runde läuft jetzt auch, weil ein Auftrag unklar wurde (beidseitig: Spot-Stop über die Coins). Vorher: kommt der
#     Rückkauf an und löst der (jetzt zu grosse) weite Not-Stop aus, lagen die Coins ohne Short und ohne Stop da (5'543 USDT)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
k.algos.clear()  # Perp-Stop des Richtungs-Shorts fehlt (z. B. im Lauf abgelehnt)
g13 = [0]


def h13p5(m, pfad, p_):
    if m == "POST" and pfad == "/fapi/v1/algoOrder" and not g13[0]:
        g13[0] = 1
        B.bewegen("BTCUSDT", 112000.0)
        B.regeln.append(regel(methode="GET", pfad="/api/v3/ticker/price", art="429", anzahl=10 ** 6))
        B.regeln.append(regel(methode="GET", pfad="/fapi/v1/premiumIndex", art="vor503", anzahl=10 ** 6))


B.vor_jeder_anfrage = h13p5
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=2),
            regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="spaet_u", anzahl=2)]
try:
    r = lauf([], env_echt(), d, notaus=True)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
P.pending_abarbeiten()
B.bewegen("BTCUSDT", 120500.0)  # der weite Not-Stop löst aus
u13 = ung13(k)
pruefe("13.p5 Not-Aus: Rückkauf zweimal unklar → zweite Schutz-Runde beidseitig; nach Ankunft und Kurssprung nichts ohne Stop",
       max(u13) < 10 and any("im Schutz blieb unklar" in z for z in r["zeilen"]), (u13, lage(k, "BTCUSDT"), r["zeilen"][-4:]))

# 13.p7 (W3, R10-M17 war nicht gleichwertig): Not-Aus, die Spot-Auftragsliste ist dauerhaft unlesbar, ALLE Coins liegen unter einem
#     Spot-Stop, der Perp-Stop des Shorts fehlt, der Rückkauf scheitert (429) → der Short bekommt seinen Stop über die GANZE Menge
#     (die gestoppten Coins können wegfallen); mit der Mutation nur über den ungesicherten Teil → nach dem Spot-Stop ein nackter Short
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
sp13 = L.Spot(L.einstellungen(env_echt())["spot"])
k.algos.clear()
for o in sp13.eigene_stops("BTCUSDT"):
    sp13.abbrechen("BTCUSDT", o["orderId"])
rs13 = sp13.regeln2("BTCUSDT")
sp13.stop_verkauf("BTCUSDT", float(L.PL.runde(k.frei["BTC"], rs13["step"])), 95000.0, rs13, cid=L._kennung(L.CID_STOP_SPOT))
short13 = -lage(k, "BTCUSDT")["pos"]
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=2),
            regel(methode="GET", pfad="/api/v3/openOrders", art="vor503", anzahl=10 ** 6)]
try:
    lauf([], env_echt(), d, notaus=True)
finally:
    B.regeln = []
g13 = lage(k, "BTCUSDT")
B.bewegen("BTCUSDT", 94000.0)  # der Spot-Stop löst aus
u13 = ung13(k)
pruefe("13.p7 Not-Aus, Spot-Liste unlesbar, alle Coins gestoppt: der Short hat seinen Stop über die ganze Menge — nach dem Spot-Stop "
       "kein nackter Short", short13 > 0.05 and g13["p_qty"] >= short13 - 1e-9 and u13[1] < 10, (short13, g13, u13))

# 13.p6 (K1, Prüf-Werkzeug): ein hängender STOP_LOSS_LIMIT, den Pilot 2.0 in der Liste GESEHEN hat, bleibt ein echter Befund — auch
#     wenn sich der Kurs danach noch bewegt (vorher: jede Bewegung entschuldigte ihn wieder als LIMIT_LUECKE_)
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
e = E("BTC", 1.0)
e["stop_long"] = 90000.0
lauf([e], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)  # Lücke unter das Limit: der ausgelöste Stop-Limit hängt
vor13 = [b_[0] for b_ in P.schutz_befunde(k)]
L.Spot(L.einstellungen(env_echt())["spot"]).eigene_stops("BTCUSDT")  # Pilot 2.0 sieht den hängenden Stop
B.bewegen("BTCUSDT", 85085.0)  # +0,1 %, keine neue Lücke
nach13 = [b_[0] for b_ in P.schutz_befunde(k)]
pruefe("13.p6 Prüf-Werkzeug: gesehener hängender Stop-Limit bleibt nach +0,1 % ein echter Befund (LIMIT_LUECKE_ nur vor dem Blick)",
       vor13 == ["LIMIT_LUECKE_LONG_OHNE_STOP"] and nach13 == ["LONG_OHNE_STOP"], (vor13, nach13))
neues_konto(20000)  # Stop-Typen zurück (reset)

# 13.W2 (Prüf-Werkzeug): eine dauerhaft unlesbare Auftragsliste macht keine Lücke unvermeidbar — das Lesen der Lage schon
pruefe("13.W2 _dauer: Auftragsliste unlesbar → nicht unvermeidbar; Konto/Position unlesbar → unvermeidbar",
       not P._dauer([regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6)], "LONG_OHNE_STOP")
       and not P._dauer([regel(methode="GET", pfad="/api/v3/openOrders", art="vor503", anzahl=10 ** 6)], "SHORT_OHNE_STOP")
       and P._dauer([regel(methode="GET", pfad="/api/v3/account", art="vor503", anzahl=10 ** 6)], "LONG_OHNE_STOP"))

# 13.K2 (Not-Aus-Seed 12527): ein Rest galt mit dem Kurs VOR einem Sprung als Staub → «alles zu» war falsch; jetzt mit frischem Kurs
funde = P.notaus_runde(12527)
pruefe("13.K2 Not-Aus-Seed 12527: keine Befunde (Staub mit frischem Kurs entschieden)", not P.echte(funde),
       [(f[0], f[1].get("wann")) for f in P.echte(funde)][:5])

# 13.F1 (Schlusskampagne, Not-Aus-Seed 9123): im Schutz wird der Rückkauf des ungesicherten Short-Teils unklar (einmal neu
#     geschickt), der Stand ist danach nicht lesbar. Vorher: mit dem alten Stand hielt die zweite Runde die Coins für gesperrt
#     (ihren Stop hatte die erste eben gelöscht) und kaufte bei einem Kurs jenseits den ganzen Short zurück → Coins ohne Short und
#     ohne Stop; ganz ohne zweite Runde fehlte der beidseitige Schutz (kommt der unklare Rückkauf an: Absicherung weg). Jetzt: Lage
#     unbekannt → beidseitig, alle Coins als frei
funde = P.notaus_runde(9123)
pruefe("13.F1 Not-Aus-Seed 9123: Auftrag im Schutz unklar, Stand nicht lesbar → zweite Runde beidseitig, keine Befunde",
       not funde, [(f[0], f[1].get("wann")) for f in funde][:5])

# 13.F2 (Schlusskampagne, Listen-Seed 302): zwei Spot-Stops über ETH (ein zu grosser alter + ein Zusatz-Stop, beidseitig), das Buch
#     kennt nur einen; am nächsten Tag ist die Spot-Liste unlesbar und das Paar voll abgesichert → der bekannte wird gelöscht, der
#     unbekannte (1,43 ETH) blieb still über der Absicherung (fällt der Kurs: Short ohne Stop). Jetzt: nach dem Löschen am Kontostand
#     nachsehen — noch zu viel gesperrt → beidseitig, laut, Nachkontrolle
funde = P.listen_runde(302)
pruefe("13.F2 Listen-Seed 302: unbekannter zweiter Spot-Stop bei unlesbarer Liste → beidseitig gesichert, keine Befunde", not funde,
       [(f[0], f[1].get("tag")) for f in funde][:5])

# 13.F3 (Perp-Gegenstück zu 13.F2, eigenes Szenario): Tag 2 ist die Perp-Liste unlesbar UND Löschen geht nicht → jede Abgleich-Runde
#     setzt einen neuen Stop, die alten bleiben (vier stehen), das Buch kannte nur den letzten; Tag 3 ist die Liste wieder unlesbar und
#     der Richtungs-Short weg → nur der bekannte wurde gelöscht, die unbekannten (0,387 BTC) blieben über der Absicherung (Kurs hoch:
#     Coins ohne Short und ohne Stop, 2'555 USDT). Jetzt: nicht löschbare alte Stops merkt das Buch (perp_weitere), jeder Abgleich
#     löscht sie zuerst (Kennung, ohne Liste), bis dahin beidseitig + Nachkontrolle
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6),
            regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
try:
    lauf([E("BTC", -0.75)], env_echt(), d)
finally:
    B.regeln = []
b13 = buch13(d)
weitere13 = (b13.get("stops") or {}).get("BTC", {}).get("perp_weitere") or []
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6)]  # Tag 3, ohne Nachkontrolle dazwischen
try:
    lauf([E("BTC", 0.5)], env_echt(), d)
finally:
    B.regeln = []
funde = P.echte(P.schutz_befunde(k, P.unklar_je_markt(d)) + P.folgeschaden(k))
pruefe("13.F3 nicht löschbare alte Perp-Stops gemerkt und am nächsten Tag (Liste wieder unlesbar) über die Kennung gelöscht — keine "
       "Befunde", len(weitere13) >= 2 and "BTC" in (b13.get("schutz_offen") or []) and not funde,
       (len(weitere13), b13.get("schutz_offen"), funde, lage(k, "BTCUSDT")))

# 13.F3b: das Gedächtnis löscht nie den AKTUELLEN Stop (er schützt den Short) — nur die alten, und eine lesbare Liste bereinigt
#     es nur (löschen tut dann der Abgleich, erst nach dem neuen Stop)
class _FutProbe:
    def __init__(self):
        self.weg = []

    def algo_abbrechen_kennung(self, sym, cid):
        self.weg.append(cid)

    def algo_abbrechen(self, sym, aid):
        self.weg.append(aid)
        return True


f13 = _FutProbe()
st13 = {"perp": 7, "perp_cid": "neu", "perp_weitere": [[7, "neu"], [3, "alt3"], [5, None]]}
alles_weg13 = L._perp_weitere_weg(f13, "BTCUSDT", st13)
pruefe("13.F3b Gedächtnis: alte Perp-Stops gelöscht (Kennung, sonst ID), der aktuelle nie", f13.weg == ["alt3", 5] and alles_weg13
       and st13["perp"] == 7, (f13.weg, st13))
st13b = {"perp": 7, "perp_cid": "neu", "perp_weitere": [[3, "alt3"], [5, "alt5"]]}
L._perp_weitere_pruefen(st13b, [{"algoId": 5, "clientAlgoId": "alt5"}])
pruefe("13.F3b lesbare Liste: was nicht mehr steht, ist aus dem Gedächtnis; der Rest bleibt für den Abgleich",
       st13b["perp_weitere"] == [[5, "alt5"]], st13b)

# 13.F4 (Schlusskampagne, Lauf-Seed 137): STOP erscheint mitten im Tageslauf → der Lauf schliesst selbst (B1), der Not-Aus kann
#     den ETH-Short unter Störungen weder schliessen noch schützen (laut gemeldet); STOP ist danach wieder weg → die Nachkontrolle
#     (normaler Modus) sah nichts Offenes → Short ohne Stop bis morgen. Jetzt: was der Not-Aus nicht sichern konnte, steht in
#     «schutz_offen» → die Nachkontrolle setzt die Stops nach dem Kontostand
funde = P.echte(P.laeufe_runde(137, 30))
pruefe("13.F4 Lauf-Seed 137: Not-Aus mitten im Lauf scheitert am Schutz → Nachkontrolle sichert (keine Befunde)", not funde,
       [(f[0], f[1].get("tag")) for f in funde][:5])

# 13.F5 (Schlusskampagne, Lauf-Seed 12027): Perp-Liste nicht lesbar, und der Kurs springt, bevor der Stop steht, über den Stop-Kurs
#     UND über den Not-Stop (5 %) → Binance lehnt beide ab («würde sofort auslösen»), Pilot 2.0 gab auf («Short evtl. OHNE Stop»; mit
#     Liste steigt er in diesem Fall zum Markt aus). Jetzt auch ohne Liste: Short zum Markt zurückkaufen, die alten Stops aus dem
#     Buch schützen bis dahin und kommen erst danach weg. Gegenprobe am alten Stand: Richtungs-Short bleibt, «gelang in 3 Runden nicht»
funde = P.echte(P.laeufe_runde(12027, 30))
pruefe("13.F5 Lauf-Seed 12027: Liste unlesbar, Kurs über dem Stop → zum Markt aus statt aufgeben (keine Befunde)", not funde,
       [(f[0], f[1].get("tag")) for f in funde][:5])
NEUER_STOP_BUY = lambda m, p, q: q.get("side") == "BUY"  # noqa: E731
for name13, alter13 in (("ohne alten Stop im Buch (Tag 1)", False), ("mit altem Stop im Buch (Tag 2, heute enger)", True)):
    k = neues_konto(20000)
    d = neu_buch()
    kurs13 = B.kurs["BTCUSDT"]
    if alter13:
        lauf([E("BTC", -0.5)], env_echt(), d)               # Stop 10 % über dem Kurs
        e13, sprung13 = E("BTC", -0.5, stop_abstand=0.03), kurs13 * 1.06  # heute 3 %: Sprung über den neuen, unter den alten
    else:
        e13, sprung13 = E("BTC", -0.5), kurs13 * 1.12       # über den Stop (10 %) UND den Not-Stop (5 % über dem Kurs)
    eroeffnet13 = [alter13]  # Tag 1: die Liste wird erst unlesbar, wenn der Short eröffnet ist (sonst bräche der Lauf vorher ab)

    def nach13(m, pfad, q, code, eroeffnet13=eroeffnet13):
        if m == "POST" and pfad == "/fapi/v1/order" and q.get("side") == "SELL" and code == 200:
            eroeffnet13[0] = True
    B.nach_jeder_anfrage = nach13
    B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6,
                      pred=lambda m, p, q, eroeffnet13=eroeffnet13: eroeffnet13[0]),
                regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=NEUER_STOP_BUY, art="kurs", sym="BTCUSDT", preis=sprung13)]
    try:
        r = lauf([e13], env_echt(), d)
    finally:
        B.regeln = []
        B.nach_jeder_anfrage = None
    g13 = lage(k, "BTCUSDT")
    w13 = [z for z in r["zeilen"] if "evtl. OHNE Stop" in z or "gelang in" in z]
    pruefe(f"13.F5 Liste unlesbar, Kurs springt über Stop und Not-Stop, {name13}: Richtungs-Short zum Markt zurückgekauft, "
           "nichts ungesichert", not befunde(k, d) and abs(g13["netto"]) < 0.001 and not w13,  # Rest < 1 Futures-Schritt
           (befunde(k, d), g13, w13))


# 13.F5b/c: ohne Liste kennt nur das Buch die alten Stops (ID oder nur die Kennung, dazu die gemerkten) — nach dem Rückkauf kommen alle
#     weg (ohne ID über die Kennung, gelöschte auch aus dem Gedächtnis); lehnt Binance den Rückkauf ab und ist nichts mehr zu schützen,
#     bleibt ein alter Stop mit unbekannter Menge nicht als «passend» stehen (er könnte über der Absicherung liegen)
class _FutRaus:
    def __init__(self, ablehnen=False):
        self.weg, self.kauf, self.ablehnen = [], [], ablehnen

    def auftrag(self, sym, seite, menge, reduce):
        if self.ablehnen:
            raise L.BB.BinanceFehler("/fapi/v1/order", 400, "abgelehnt", None, None)
        self.kauf.append((seite, menge, reduce))
        return {"executedQty": menge}

    def algo_abbrechen(self, sym, aid):
        self.weg.append(aid)
        return True

    def algo_abbrechen_kennung(self, sym, cid):
        self.weg.append(cid)


d13r = {"sym": "BTCUSDT", "rs": {"step": 0.00001}, "rf": {"step": 0.001, "tick": 0.1}}
abgesichert13 = lambda warten=None: (0.05, 0.0, -0.05, 100000.0)  # noqa: E731 — Coins = Short: nichts ungesichert
f13r = _FutRaus()
st13r = {"perp": None, "perp_cid": "cA", "perp_weitere": [[3, "c3"], [None, "cA"]]}  # aktueller nur mit Kennung + ein gemerkter
L._perp_ohne_liste_raus(f13r, "BTC", d13r, st13r, {"frei": 0.05, "gebunden": 0.0, "pos": -0.148, "kurs": 100000.0},
                        {"auftraege": []}, [].append, [],
                        lambda warten=None: (0.05, 0.0, -0.05 if f13r.kauf else -0.148, 100000.0), "Test")  # nach dem Rückkauf: Ernte
pruefe("13.F5b ohne Liste: Richtungs-Short zurückgekauft, danach der aktuelle (nur Kennung) und der gemerkte alte gelöscht, "
       "Gedächtnis leer", f13r.kauf == [("BUY", 0.098, True)] and f13r.weg == ["cA", 3] and not st13r.get("perp_weitere")
       and st13r["perp"] is None and st13r["perp_cid"] is None, (f13r.kauf, f13r.weg, st13r))
f13c = _FutRaus(ablehnen=True)
st13c = {"perp": 5, "perp_cid": "c5"}
w13c = []
L._perp_raus(f13c, "BTC", d13r, st13c, 0.098, 100000.0, {"auftraege": []}, w13c.append, [], "Test", abgesichert13, -0.148,
             alt=[{"algoId": 5, "clientAlgoId": "c5"}])
pruefe("13.F5c Rückkauf abgelehnt, nichts mehr zu schützen: alter Stop mit unbekannter Menge (nur Buch) wird gelöscht, nicht "
       "«passend» stehen gelassen", f13c.weg == [5] and not any("bleibt stehen" in w_ for w_ in w13c), (f13c.weg, w13c))

# 13.K3: Buch 3-Wege zusammenführen — nur was ICH geändert habe, gilt von mir; Geklärtes fällt weg; die Einträge, die der Abgleich in der
#     Hand hat, bleiben dieselben (in place)
b0 = L.leer_buch()
b0.update(start="s", stops={"BTC": {"spot": 1, "perp": 7, "perp_cid": "c7", "kurs": 100.0}}, unklar=[{"markt": "BTC", "cid": "u1"}],
          schutz_offen=["BTC"])
platte13, meins13 = json.loads(json.dumps(b0)), json.loads(json.dumps(b0))
platte13["stops"]["BTC"]["spot"] = 2                        # der andere setzte einen neuen Spot-Stop
platte13["unklar"].append({"markt": "ETH", "cid": "u2"})     # und trug einen unklaren Auftrag ein
meins13["stops"]["BTC"].update(perp=None, perp_cid=None)     # ich löschte den Perp-Stop
meins13["unklar"] = []                                       # und klärte u1
meins13["schutz_offen"] = []                                 # und sicherte BTC
v13 = L._buch_vereinen(platte13, meins13, b0)
pruefe("13.K3 3-Wege: fremder neuer Spot-Stop bleibt, mein gelöschter Perp-Stop ist gelöscht, Geklärtes weg, fremdes Unklares bleibt",
       v13["stops"]["BTC"]["spot"] == 2 and v13["stops"]["BTC"]["perp"] is None and v13["stops"]["BTC"]["perp_cid"] is None
       and [u_["cid"] for u_ in v13["unklar"]] == ["u2"] and v13["schutz_offen"] == [], v13)
platte13b = json.loads(json.dumps(b0))
platte13b["stops"]["BTC"]["perp"] = 9                       # der andere setzte einen NEUEN Perp-Stop, ich löschte den alten
v13b = L._buch_vereinen(platte13b, meins13, b0)
pruefe("13.K3 Konflikt (ich gelöscht, der andere neu gesetzt): seine Kennung bleibt (der Stop steht an der Börse)",
       v13b["stops"]["BTC"]["perp"] == 9, v13b["stops"])
d13 = neu_buch()
L.buch_schreiben(d13, "echt", b0)
mein13 = L.buch_lesen(d13, "echt")
ges13 = [json.dumps(mein13, sort_keys=True)]
st13 = mein13["stops"]["BTC"]                                # der Abgleich hält diesen Eintrag in der Hand
anders13 = L.buch_lesen(d13, "echt")
anders13["unklar"].append({"markt": "ETH", "cid": "u3"})
L.buch_schreiben(d13, "echt", anders13)                      # ein anderer Lauf schreibt dazwischen
st13["spot"] = 5
L._buch_speichern_zusammen(d13, "echt", ges13, mein13)
st13["perp"] = 11                                            # nach dem Zusammenführen weiter in den gehaltenen Eintrag schreiben
L._buch_speichern_zusammen(d13, "echt", ges13, mein13)
b13 = L.buch_lesen(d13, "echt")
pruefe("13.K3 zusammenführen in place: fremdes Unklares bleibt, was der Abgleich danach schreibt, landet im Buch",
       b13["stops"]["BTC"]["spot"] == 5 and b13["stops"]["BTC"]["perp"] == 11 and any(u_.get("cid") == "u3" for u_ in b13["unklar"]),
       b13)

# ── Lücken der Mutationsprobe auf dem Endstand der 13. Runde (18.10.2026): 13.p4c, 13.F5d, 13.G1–G5 ──
# 13.p4c (R13-M2/M4): STOP mitten im Lauf → der Lauf gleicht KEINE Stops ab (auch nicht kurz vor dem Schliessen: ein Abgleich mit einem veralteten
#     Blick könnte die Stops eines gleichzeitigen Not-Aus treffen) und schliesst selbst
_aufrufe13 = []
_stops_setzen_alt13 = L._stops_setzen


def _spion13(*a_, **kw_):
    _aufrufe13.append(1)
    return _stops_setzen_alt13(*a_, **kw_)


k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5), E("ETH", -0.5)], env_echt(), d)


def h13p4c(m, pfad, p_):
    P.BF.STOP_DATEI.write_text("Cockpit")


L._stops_setzen = _spion13
B.vor_jeder_anfrage = h13p4c
try:
    r = lauf([E("BTC", 0.5), E("ETH", -0.5)], env_echt(), d)
finally:
    L._stops_setzen = _stops_setzen_alt13
    B.vor_jeder_anfrage = None
    P.BF.STOP_DATEI.unlink(missing_ok=True)
pruefe("13.p4c STOP mitten im Lauf: keine Stops abgeglichen (der Not-Aus am Laufende schliesst), alles zu und flach",
       not _aufrufe13 and r["alles_zu"] is True and flach13(k), (len(_aufrufe13), r["alles_zu"]))

# 13.F5d (N-F5-M6): ohne Liste, Kurs über dem Stop — aber der Stand zeigt inzwischen KEINEN ungesicherten Short mehr (ein Stop hat ausgelöst): kein
#     Rückkauf, und die alten Stops (aus dem Buch: der aktuelle + die gemerkten) werden gelöscht — sie wären jetzt zu gross
f13d = _FutRaus()
st13d = {"perp": 5, "perp_cid": "c5", "perp_weitere": [[3, "c3"]]}
d13d = {"sym": "BTCUSDT", "rs": {"step": 0.00001}, "rf": {"step": 0.001, "tick": 0.1}}
L._perp_ohne_liste_raus(f13d, "BTC", d13d, st13d, {"frei": 0.05, "gebunden": 0.0, "pos": -0.05, "kurs": 100000.0}, {"auftraege": []}, [].append, [],
                        lambda warten=None: (0.05, 0.0, -0.05, 100000.0), "Test")
pruefe("13.F5d ohne Liste, kein ungesicherter Short mehr: kein Rückkauf, die alten Stops (aktueller + gemerkte) sind gelöscht, das Buch kennt keinen mehr",
       f13d.kauf == [] and sorted(map(str, f13d.weg)) == ["3", "5"] and st13d["perp"] is None and st13d["perp_cid"] is None
       and not st13d.get("perp_weitere"), (f13d.kauf, f13d.weg, st13d))

# 13.G1 (R13-M17): erster Start; zwischen Lesen und Start-Speichern trägt ein anderer Prozess «Schutz offen» ein → der Start wird zusammengeführt
k = neues_konto(20000)
d = neu_buch()
_erst13 = [True]


def h13g1(m, pfad, p_):
    if _erst13[0]:
        _erst13[0] = False
        b_ = L.leer_buch()
        b_["schutz_offen"] = ["ETH"]
        L.buch_schreiben(d, "echt", b_)


B.vor_jeder_anfrage = h13g1
try:
    lauf([E("BTC", 0.0)], env_echt(), d)
finally:
    B.vor_jeder_anfrage = None
b13g1 = buch13(d)
pruefe("13.G1 Start-Speichern führt zusammen: was ein anderer Prozess zwischen Lesen und Start eintrug, bleibt",
       b13g1.get("start") and "ETH" in (b13g1.get("schutz_offen") or []), (b13g1.get("start"), b13g1.get("schutz_offen")))

# 13.G2 (R13-M16, N-R13-M13): Speichern führt 3-Wege zusammen — Basis = was ich las: der andere klärte u1 und setzte einen neuen Spot-Stop (beides
#     bleibt seins), sein u2 bleibt, mein gelöschter Perp-Stop bleibt gelöscht
import tempfile as _tf13  # noqa: E402
d13g2 = Path(_tf13.mkdtemp()) / "b.json"
b0 = L.leer_buch()
b0.update(start="s", unklar=[{"markt": "BTC", "cid": "u1"}, {"markt": "ETH", "cid": "u2"}], stops={"BTC": {"spot": 1, "perp": 7, "perp_cid": "c7"}})
L.buch_schreiben(d13g2, "echt", b0)
mein13 = L.buch_lesen(d13g2, "echt")
ges13 = [json.dumps(mein13, sort_keys=True)]
anders13 = L.buch_lesen(d13g2, "echt")
anders13["unklar"] = [u_ for u_ in anders13["unklar"] if u_["cid"] != "u1"]
anders13["stops"]["BTC"]["spot"] = 2
L.buch_schreiben(d13g2, "echt", anders13)
mein13["stops"]["BTC"]["perp"] = None
mein13["stops"]["BTC"]["perp_cid"] = None
L._buch_speichern_zusammen(d13g2, "echt", ges13, mein13)
bg2 = L.buch_lesen(d13g2, "echt")
pruefe("13.G2 Speichern 3-Wege: sein neuer Spot-Stop und seine Klärung (u1 weg) bleiben, sein u2 bleibt, mein gelöschter Perp-Stop bleibt gelöscht",
       bg2["stops"]["BTC"]["spot"] == 2 and not any(u_["cid"] == "u1" for u_ in bg2["unklar"]) and any(u_["cid"] == "u2" for u_ in bg2["unklar"])
       and bg2["stops"]["BTC"].get("perp") is None, bg2)

# 13.G3 (R13-M23): Tag 2: Liste unlesbar + Löschen geht nicht → vier Perp-Stops (das Buch merkt die alten). Dann ist der Richtungs-Short weg (hier von
#     Hand geschlossen) und die Liste an Tag 3 wieder unlesbar → kein Perp-Stop nötig: der bekannte UND die gemerkten alten wären zu gross (träfen die
#     Absicherung) → über die Kennung gelöscht, ohne Liste. (13.F3 prüft den Fall mit nötigem Stop; hier fällt der Stop weg.)
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6),
            regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
try:
    lauf([E("BTC", -0.75)], env_echt(), d)
finally:
    B.regeln = []
weitere13g3 = (buch13(d).get("stops") or {}).get("BTC", {}).get("perp_weitere") or []
g0 = lage(k, "BTCUSDT")
k.buchen("BTCUSDT", abs(g0["pos"]) - g0["coins"], B.kurs["BTCUSDT"])
g1 = lage(k, "BTCUSDT")
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6)]
try:
    r3 = lauf([E("BTC", 0.0)], env_echt(), d)
finally:
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("13.G3 Perp-Liste unlesbar, kein Richtungs-Short mehr: der bekannte UND die gemerkten alten Perp-Stops sind gelöscht (keiner über der Absicherung)",
       len(weitere13g3) >= 2 and g0["n_p"] >= 3 and abs(abs(g1["pos"]) - g1["coins"]) < 0.002 and g["n_p"] == 0, (len(weitere13g3), g0["n_p"], g1, g))

# 13.G4 (R13-M8): das Paar steht (kein Perp-Stop, das Buch kennt keinen). Heute wird gehandelt (Einzahlung → die Ernte wächst) und die Perp-Liste ist
#     unlesbar: ob ein alter Stop über der Absicherung steht, ist offen → beidseitig (Spot-Stop über alle Coins, Perp-Stop über den Short) + Nachkontrolle
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)
k.frei["USDT"] += 20000.0
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6)]
try:
    r = lauf([E("BTC", 0.0)], env_echt(kapital=40000), d)
finally:
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("13.G4 Liste unlesbar, heute gehandelt, das Buch kennt keinen alten Stop: beidseitig gesichert + Nachkontrolle vermerkt",
       bool(r["auftraege"]) and g["s_qty"] > 0 and g["p_qty"] > 0 and "BTC" in (buch13(d).get("schutz_offen") or []),
       (r["auftraege"][:2], g, buch13(d).get("schutz_offen")))

# 13.G5 (R10-M12): zu grosser Spot-Stop (0,2 bei Netto 0,1), das Ersetzen wird sauber abgelehnt (429) → der alte bleibt, der Markt wird sofort beidseitig
#     gesichert (er deckt die Absicherung) und für die Nachkontrolle vermerkt — auch wenn in diesem Lauf keine weitere Abgleich-Runde mehr kommt
k, sp, fu, dd = handlage(coins=0.2, short=0.1, kurs=100000.0)
eigener_spot_stop(sp, dd, 0.2, 80000.0)
s_ = L._soll(0.2, -0.1, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.2)
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=10 ** 6)]
L._spot_abgleich(sp, "BTC", dd, {}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                 lambda w=None: L._lage(sp, fu, dd, w), False)
B.regeln = []
pruefe("13.G5 zu grosser Spot-Stop, Ersetzen abgelehnt (429) → beidseitig gesichert + Nachkontrolle (der alte deckt die Absicherung)",
       dd.get("beidseitig") is True and dd.get("nachkontrolle") is True, dd)

# ── 14. Prüfung: Belege p2/p7 und die Fixes als feste Szenarien (F1–F3, K1–K5, W) ──
# 14.F1 (BLOCKER, Beleg p2): ein Perp-Stop, dessen Antwort verloren ging und der in der Liste erst nach n Abfragen sichtbar wird («unsichtbar»), wurde
#     am Laufende VERGESSEN: der Abgleich las nur die Liste, setzte einen zweiten und überschrieb die Kennung im Buch. Wurde der erste sichtbar, stand
#     der zu grosse (gesetzt vor dem Kauf der Ernte-Coins) neben dem kleinen und kaufte beim Auslösen die Absicherung zurück → Coins ohne Short und
#     ohne Stop (7'880 USDT). Jetzt: was das Buch kennt und die lesbare Liste nicht zeigt, wird nach dem neuen Stop über die Kennung gelöscht
for anzahl14, listen14 in ((1, 4), (1, 6), (1, 8), (3, 3)):
    k = neues_konto(20000)
    d = neu_buch()
    env14 = env_echt(kapital=20000)
    lauf([E("ETH", -1.0)], env14, d)
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="unsichtbar", anzahl=anzahl14, listen=listen14)]
    try:
        r = lauf([E("ETH", -0.25)], env14, d)
    finally:
        B.regeln = []
    P.nachkontrolle(env14, d)
    B.n_listen += 100   # alles, was die Liste nur verzögert zeigte, ist jetzt sichtbar
    g = lage(k, "ETHUSDT")
    if g["p_preise"]:
        B.bewegen("ETHUSDT", round(min(g["p_preise"]) * 1.01, 2))  # der Kurs steigt über den (kleinsten) Stop
    nach14 = befunde(k, d)
    pruefe(f"14.F1 Perp-Stop erst nach {listen14} Listen-Abfragen sichtbar (Antwort verloren, {anzahl14}×): genau EIN Stop, nach dem Kurssprung "
           "nichts ungesichert", g["n_p"] == 1 and not nach14 and sum(ung13(k, "ETHUSDT")) < 10, (g, nach14, ung13(k, "ETHUSDT")))

# 14.F1s (Spot-Gegenstück): kein Stop mehr nötig (das Paar ist abgesichert); zwei eigene Spot-Stops — A sichtbar, B im Buch bekannt, aber die Liste zeigt ihn
#     (noch) nicht (sie hinkt nach) → beide weg (B über seine ID), sonst verkaufte B später die Ernte-Coins und der Short stünde ohne Coins da
k, sp, fu, dd = handlage(coins=0.2, short=0.2, kurs=100000.0)
eigener_spot_stop(sp, dd, 0.1, 80000.0)
rB14 = eigener_spot_stop(sp, dd, 0.1, 80000.0)
k.orders[rB14["orderId"]]["sichtbar_ab"] = B.n_listen + 50   # die Liste zeigt B erst nach 50 Abfragen
s_ = L._soll(0.2, -0.2, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.2)
st14 = {"spot": rB14.get("orderId")}
L._spot_abgleich(sp, "BTC", dd, st14, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                 lambda w=None: L._lage(sp, fu, dd, w), False)
g = lage(k, "BTCUSDT")
pruefe("14.F1s Spot: kein Stop nötig → der sichtbare UND der nur verzögert sichtbare bekannte Stop sind gelöscht (die Ernte-Coins bleiben frei)",
       g["n_s"] == 0 and st14.get("spot") is None, (g, st14))

# 14.F2 (WICHTIG, Beleg p7): Binance nimmt keinen reduceOnly-Stop über mehr als die offene Position (−2022, README-Prüfpunkt A; die Prüf-Börse spielt es
#     mit reduce_algo_streng). Ein unklarer Short → «beidseitig» = Perp-Stop über Short + Unklares, also über der Position. Mit lesbarer Liste fiel
#     _perp_abgleich auf «nur der offene Short» zurück, _perp_ohne_liste (Liste unlesbar) nicht → Short ohne Stop (9'400 USDT). Jetzt mit FRISCH
#     gelesener Position (ein alter Stop kann inzwischen ausgelöst haben)
for liste_ok14 in (True, False):
    k = neues_konto(20000)
    d = neu_buch()
    env14 = env_echt(kapital=20000)
    lauf([E("BTC", 0.0)], env14, d)
    B.reduce_algo_streng = True
    an14 = [False]

    def haken14(m, pfad, p_, code, an14=an14):
        if m == "POST" and pfad == "/fapi/v1/order" and p_.get("side") == "SELL" and p_.get("reduceOnly") != "true":
            an14[0] = True
    B.nach_jeder_anfrage = haken14
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet_u", anzahl=1)]
    if not liste_ok14:
        B.regeln.append(regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6,
                              pred=lambda m, p_, q, an14=an14: an14[0]))   # die Perp-Liste wird erst NACH dem unklaren Auftrag unlesbar
    try:
        r = lauf([E("BTC", -0.5)], env14, d)
    finally:
        B.regeln = []
        B.nach_jeder_anfrage = None
        B.reduce_algo_streng = False
    g = lage(k, "BTCUSDT")
    w14 = [z for z in r["zeilen"] if "OHNE Stop" in z]
    pruefe(f"14.F2 reduceOnly-Stop über der Position abgelehnt (−2022), unklarer Short, Perp-Liste {'lesbar' if liste_ok14 else 'UNLESBAR'}: der "
           "offene Short hat einen Stop", not befunde(k, d) and not w14 and g["p_qty"] >= -g["pos"] - 0.002, (befunde(k, d), w14, g))
    P.pending_abarbeiten()

# 14.F2 (Prüfer-Fuzzer fz_strikt): die Lauf-Seeds der 14. Prüfung mit strenger reduceOnly-Regel; die Stops lösen mitten im Durchlauf aus (−2021) →
#     zum Markt aussteigen statt «Short evtl. OHNE Stop» (grösster Betrag am alten Stand: Seed 20255, 30'637 USDT)
_neues_konto14 = P.neues_konto


def _neues_konto_streng14(*a_, **kw_):
    k_ = _neues_konto14(*a_, **kw_)
    B.reduce_algo_streng = True
    return k_


P.neues_konto = _neues_konto_streng14
try:
    for seed14 in (20037, 20047, 20255, 20301, 20324, 20699):
        funde = P.echte(P.laeufe_runde(seed14, 30))
        pruefe(f"14.F2 strenger Lauf-Seed {seed14} (reduceOnly-Stop über der Position wird abgelehnt): keine Befunde", not funde,
               [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])
finally:
    P.neues_konto = _neues_konto14
    B.reduce_algo_streng = False

# 14.F1/K4 (Prüfer-Seeds im Standardmodus): 15645 (still) und 16777 (laut) = F1; 16678 = K4: die Nachkontrolle, die nie ersetzt (nur_ergaenzen), meldete
#     «weiterhin nicht vollständig gesichert», obwohl der Markt beidseitig gesichert war und eine Wiederholung nichts ändern konnte → kein Dauer-Alarm
for seed14 in (15645, 16777, 16678):
    funde = P.echte(P.laeufe_runde(seed14, 30))
    pruefe(f"14.F1/K4 Lauf-Seed {seed14}: keine Befunde (auch kein NACHKONTROLLE_OFFEN)", not funde,
           [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])

# 14.F3 (WICHTIG, Gegenstück zu 13.F5): die Spot-Liste wird nach dem Kauf unlesbar, und der Kurs fällt vor dem ersten Stop-Auftrag unter Stop- UND Not-Stop-
#     Kurs → Binance lehnt beide ab («würde sofort auslösen»); statt «0,079 BTC OHNE Stop» steigt Pilot 2.0 zum Markt aus (9'092 USDT am alten Stand)
k = neues_konto(20000)
d = neu_buch()
gekauft14 = [False]


def nach_f3_14(m, pfad, p_, code):
    if m == "POST" and pfad == "/api/v3/order" and p_.get("side") == "BUY" and code == 200:
        gekauft14[0] = True


B.nach_jeder_anfrage = nach_f3_14
B.regeln = [regel(methode="GET", pfad="/api/v3/openOrders", art="vor503", anzahl=10 ** 6, pred=lambda m, pf, q: gekauft14[0]),
            regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="kurs", sym="BTCUSDT", preis=round(B.kurs["BTCUSDT"] * 0.85, 2))]
try:
    r = lauf([E("BTC", 0.5)], env_echt(), d)
finally:
    B.regeln = []
    B.nach_jeder_anfrage = None
w14 = [z for z in r["zeilen"] if "OHNE Stop" in z]
pruefe("14.F3 Spot-Liste unlesbar, Kurs fällt unter Stop und Not-Stop: zum Markt aus statt «OHNE Stop» (nichts ungesichert)",
       gekauft14[0] and not w14 and ungesichert_usdt(k) < 10, (gekauft14[0], w14, ungesichert_usdt(k), lage(k, "BTCUSDT")))

# 14.K1 (Prüfer K1): ändern BEIDE Läufe den Perp-Stop (Not-Aus ohne Sperre und Tageslauf), gewinnt meiner — der Stop des anderen steht aber an der Börse und
#     gehört ins Gedächtnis der gemerkten alten (perp_weitere), sonst bleibt er bei unlesbarer Liste unbekannt; dazu die Mengen-Vereinigung des Gedächtnisses
b0 = L.leer_buch()
b0.update(start="s", stops={"BTC": {"perp": 7, "perp_cid": "c7", "spot": 1}})
platte14, meins14 = json.loads(json.dumps(b0)), json.loads(json.dumps(b0))
platte14["stops"]["BTC"].update(perp=9, perp_cid="c9")      # der andere setzte einen neuen Perp-Stop 9
meins14["stops"]["BTC"].update(perp=11, perp_cid="c11")     # ich auch (11) — 9 sah ich in meiner Liste noch nicht
v14 = L._buch_vereinen(platte14, meins14, b0)
s14 = v14["stops"]["BTC"]
pruefe("14.K1 beide ändern den Perp-Stop: meiner gilt, der des anderen (steht an der Börse) kommt ins Gedächtnis; meiner ist nicht dort",
       s14["perp"] == 11 and s14["perp_cid"] == "c11" and (s14.get("perp_weitere") or []) == [[9, "c9"]], s14)
v14b = L._buch_vereinen(platte14, json.loads(json.dumps(b0)), b0)
pruefe("14.K1 ändert nur der andere: seine Kennung gilt, nichts im Gedächtnis",
       v14b["stops"]["BTC"]["perp"] == 9 and v14b["stops"]["BTC"]["perp_cid"] == "c9" and not v14b["stops"]["BTC"].get("perp_weitere"), v14b["stops"])
b0w = json.loads(json.dumps(b0))
platte14w, meins14w = json.loads(json.dumps(b0w)), json.loads(json.dumps(b0w))
platte14w["stops"]["BTC"]["perp_weitere"] = [[3, "c3"]]     # der andere merkte einen nicht löschbaren alten Stop
meins14w["stops"]["BTC"]["perp_weitere"] = [[5, "c5"]]      # ich auch (einen anderen)
vw14 = L._buch_vereinen(platte14w, meins14w, b0w)
pruefe("14.K1 Gedächtnis (alte Perp-Stops): Vereinigung beider, nichts geht verloren",
       sorted(map(tuple, vw14["stops"]["BTC"].get("perp_weitere") or [])) == [(3, "c3"), (5, "c5")], vw14["stops"])
b0x = json.loads(json.dumps(b0))
b0x["stops"]["BTC"]["perp_weitere"] = [[3, "c3"]]
platte14x, meins14x = json.loads(json.dumps(b0x)), json.loads(json.dumps(b0x))
meins14x["stops"]["BTC"]["perp_weitere"] = None             # ich löschte den alten Stop (geklärt)
vx14 = L._buch_vereinen(platte14x, meins14x, b0x)
pruefe("14.K1 Gedächtnis: was ich geklärt habe (in der Basis, bei mir nicht mehr), fällt weg — auch wenn die Platte es noch hat",
       not vx14["stops"]["BTC"].get("perp_weitere"), vx14["stops"])

# 14.K2 (Prüfer K2, Restfenster der B2-Korrektur): ein anderer Lauf trägt WÄHREND des Stop-Abgleichs einen unklaren Auftrag ins Buch ein, und der Kontostand
#     ändert sich dabei → die nächste Abgleich-Runde sichert den Markt beidseitig (Spot-Stop über alle Coins, Perp-Stop über den ganzen Short); vorher galt
#     der Stand vom Laufanfang (4'700 USDT Long und Short ohne Stop bis zum Takt nach der Ankunft)
for was14, kw14 in (("Spot-Verkauf unklar", dict(konto="spot", seite="SELL", reduce=False)),
                    ("Rückkauf unklar", dict(konto="perp", seite="BUY", reduce=True))):
    k = neues_konto(20000)
    d = neu_buch()
    lauf([E("BTC", 0.0)], env_echt(), d)          # das Paar steht (Ernte)
    fremd14 = [True]

    def h14k2(m, pfad, p_, code, fremd14=fremd14, kw14=kw14, d=d, k=k):
        if fremd14[0] and m == "POST" and pfad == "/api/v3/order" and str(p_.get("type", "")).startswith("STOP") and code == 200:
            fremd14[0] = False
            b_ = L.buch_lesen(d, "echt")
            b_["unklar"] = (b_.get("unklar") or []) + [L.unklar_eintrag("BTC", "BTCUSDT", kw14["konto"], kw14["seite"], 0.01, kw14["reduce"])]
            L.buch_schreiben(d, "echt", b_)
            with B.lock:                              # und der Kontostand ändert sich (Staub), also folgt noch eine Abgleich-Runde
                k.frei["BTC"] -= 0.01
                k.frei["USDT"] += 0.01 * B.kurs["BTCUSDT"]
    B.nach_jeder_anfrage = h14k2
    try:
        r = lauf([E("BTC", 0.5)], env_echt(), d)
    finally:
        B.nach_jeder_anfrage = None
    g = lage(k, "BTCUSDT")
    pruefe(f"14.K2 fremder unklarer Auftrag ({was14}) landet mitten im Abgleich: die nächste Runde sichert den Markt beidseitig",
           not fremd14[0] and not befunde(k, d) and g["s_qty"] > 0, (fremd14, befunde(k, d), g))

# 14.K3 (Prüfer K3, Prüf-Werkzeug): Short-Staub unter dem Futures-Mindestbetrag (≤ 10 USDT) kann Binance nicht mehr absichern — in beiden Zweigen der
#     Schutz-Prüfung (beidseitig und normal) STAUB_*, nicht SHORT_OHNE_STOP; darüber bleibt es ein Befund
for name14, unklar14 in (("beidseitig (unklarer Auftrag)", {"ETHUSDT": 0.0}), ("normal", {})):
    for short14, erwartet14 in ((0.0018, "STAUB_SHORT_OHNE_STOP"), (0.003, "SHORT_OHNE_STOP")):  # ETH bei 4000: 7,2 bzw. 12 USDT
        k = neues_konto(20000)
        k.buchen("ETHUSDT", -short14, B.kurs["ETHUSDT"])
        namen14 = [b_[0] for b_ in P.schutz_befunde(k, unklar14) if b_[1] == "ETHUSDT" and "SHORT" in b_[0]]
        pruefe(f"14.K3 Fuzzer {name14}: Short {short14 * 4000:g} USDT ohne Stop → {erwartet14}", namen14 == [erwartet14], namen14)

# 14.K5/E1 (Prüfer K5): ZWEI Modi gestartet (Testnetz-Buch + echt); STOP kommt, die Schalter zeigen auf den EINEN, der Bestand liegt im ANDEREN
#     (a) Bestand Testnetz, Schalter echt: die Nachkontrolle bei STOP schliesst das Testnetz-Konto (vorher «nichts angefasst»)
#     (b) Bestand echt, Schalter Testnetz: sie schliesst das ECHTE Konto — mit den Schlüsseln dieses Modus, nicht mit den übergebenen
#     (c) der Tageslauf mit STOP von Anfang an  (d) STOP erscheint erst, NACHDEM der Lauf die Schalter gelesen hat → der Lauf schliesst selbst
for fall14 in ("a", "b", "c", "d"):
    k_echt = neues_konto(20000, uid=4711, keys=("k",))
    kt = B.konto_anlegen(("s", "f"), P.GEHEIM, 4712, 20000.0)
    kt.fut = 20000.0
    d = neu_buch()
    env_t = env_test(KRYPTO_PILOT2="an")
    env_e = env_echt(kapital=20000)
    if fall14 in ("a", "c", "d"):
        lauf([E("BTC", 0.5)], env_t, d)                # Testnetz-Modus startet und handelt
        env_jetzt = dict(env_e, **{k_: v for k_, v in env_t.items() if k_.startswith("BINANCE_") and "TESTNET" not in k_})
        konto_zu = kt
    else:
        lauf([E("BTC", 0.5)], env_e, d)                # echt startet und handelt
        env_jetzt = dict(env_t, **{k_: v for k_, v in env_e.items() if k_.startswith("PILOT2_")})
        konto_zu = k_echt
    vorher14 = P.flach(konto_zu)
    P.BF.STOP_DATEI.write_text("cockpit")
    try:
        if fall14 == "c":
            r = lauf([E("BTC", 0.25)], env_jetzt, d)
        elif fall14 == "d":
            P.BF.STOP_DATEI.unlink(missing_ok=True)
            buch_lesen_alt14 = L.buch_lesen

            def buch_lesen_stop14(*a_, **kw_):
                P.BF.STOP_DATEI.write_text("cockpit")
                return buch_lesen_alt14(*a_, **kw_)
            L.buch_lesen = buch_lesen_stop14
            try:
                r = lauf([E("BTC", 0.25)], env_jetzt, d)
            finally:
                L.buch_lesen = buch_lesen_alt14
        else:
            r = P.nachkontrolle(dict(env_jetzt, KI_BOT_STOP="1"), d)
    finally:
        P.BF.STOP_DATEI.unlink(missing_ok=True)
    pruefe(f"14.K5 Fall ({fall14}): Bestand liegt im anderen Modus als die Schalter, STOP → "
           f"{'die Nachkontrolle' if fall14 in 'ab' else 'der Tageslauf'} schliesst dieses Konto (alles zu, flach)",
           not vorher14 and P.flach(konto_zu) and r.get("alles_zu") is True, (vorher14, r.get("alles_zu"), P.zeigen(konto_zu), r["zeilen"][-3:]))

# 14.W (Prüfer W, Prüf-Werkzeug): der Fuzzer hat einen STRENGEN Modus (PRUEF_STRENG=1: reduceOnly-Stop über der Position wird abgelehnt, Störungen auf den
#     ersten passenden Anfragen mit endlichen Anzahlen, «unsichtbar» bis 8 Listenabfragen, Kurssprünge im Listen-Fuzzer). Standard: aus
import subprocess as _sp14  # noqa: E402
import tempfile as _tf14  # noqa: E402
_hier14 = Path(__file__).resolve().parent
pruefe("14.W Standard: kein strenger Modus (Prüf-Börse nimmt reduceOnly-Stops über der Position an)",
       not P.STRENG and not getattr(B, "reduce_algo_streng", False))
for streng14 in ("1", "0"):
    r14 = _sp14.run([sys.executable, "-B", "-c", "import pruef_fuzzer as P; P.neues_konto(); print(P.STRENG, P.B.reduce_algo_streng)"],
                    capture_output=True, text=True, cwd=str(_hier14), env=dict(os.environ, PRUEF_STRENG=streng14), timeout=120)
    pruefe(f"14.W PRUEF_STRENG={streng14}: neues Konto → Prüf-Börse {'streng' if streng14 == '1' else 'nimmt an'}",
           r14.returncode == 0 and r14.stdout.split()[-2:] == (["True", "True"] if streng14 == "1" else ["False", "False"]),
           (r14.returncode, r14.stdout[-120:], r14.stderr[-200:]))
tmp14 = _tf14.mkdtemp(prefix="p2streng_")
r14 = _sp14.run([sys.executable, "-B", str(_hier14 / "pruef_fuzzer.py"), "listen", "20000", "20004"], capture_output=True, text=True, cwd=tmp14,
                env=dict(os.environ, PRUEF_STRENG="1"), timeout=900)
pruefe("14.W Listen-Fuzzer im strengen Modus (4 Seeds): läuft ohne Befund und schreibt pruef_streng_listen_*.json",
       r14.returncode == 0 and (Path(tmp14) / "pruef_streng_listen_20000_20004.json").exists(), (r14.returncode, r14.stdout[-200:], r14.stderr[-300:]))


# ── Strenger Fuzzer (PRUEF_STRENG=1) in der Schlussprobe der 14. Runde: weitere Funde E2–E4 (alle am Stand vor der Behebung ein Befund) ──
# 14.E2–E4: Lauf-Seeds 20568, 20803, 20473, 20736 (E2), 20557 (E3), 20369 (E3b); E4 = Prüf-Werkzeug (20289, 20535, 20549)
# 14.E2 (strenger Fuzzer, Lauf-Seeds 20568/20803/20473/20736): ein Spot-Stop, den die Liste (noch) nicht zeigt, sperrt Absicherungs-Coins.
# (a) zwei sichtbare Stops + ein versteckter: die sichtbaren werden auf soll − versteckt gebracht (zusammen = soll), nichts über der Netto-Richtung
k, sp, fu, dd = handlage(coins=0.5, short=0.2, kurs=100000.0)          # netto 0,3 → soll 0,3
eigener_spot_stop(sp, dd, 0.1, 80000.0)
eigener_spot_stop(sp, dd, 0.1, 80000.0)
rC = eigener_spot_stop(sp, dd, 0.2, 80000.0)
k.orders[rC["orderId"]]["sichtbar_ab"] = B.n_listen + 10 ** 6            # nie sichtbar in diesem Test
s_ = L._soll(0.5, -0.2, 100000.0, dd)
s_.update(frei=0.1, gebunden=0.4)
L._spot_abgleich(sp, "BTC", dd, {}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                 lambda w=None: L._lage(sp, fu, dd, w), False)
g = lage(k, "BTCUSDT")
pruefe("14.E2a zwei sichtbare Spot-Stops + ein versteckter: zusammen genau die Netto-Richtung (kein Stop über der Absicherung)",
       abs(g["s_qty"] - 0.3) < 0.002 and not befunde(k), (g, befunde(k)))

# (c) ein sichtbarer (richtig gross) + ein versteckter, nach einer Ablehnung (nur_ergaenzen): zu viel gesperrt → beidseitig
k, sp, fu, dd = handlage(coins=0.2, short=0.15, kurs=100000.0)          # netto 0,05
eigener_spot_stop(sp, dd, 0.05, 80000.0)
rC = eigener_spot_stop(sp, dd, 0.1, 80000.0)
k.orders[rC["orderId"]]["sichtbar_ab"] = B.n_listen + 10 ** 6
dd["nur_ergaenzen"] = True
s_ = L._soll(0.2, -0.15, 100000.0, dd)
s_.update(frei=0.05, gebunden=0.15)
L._spot_abgleich(sp, "BTC", dd, {}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                 lambda w=None: L._lage(sp, fu, dd, w), False)
pruefe("14.E2c ein sichtbarer Stop + ein versteckter, nur_ergaenzen: zu viel gesperrt → Markt beidseitig gesichert",
       dd.get("beidseitig") is True, dd)

# (b) tagesübergreifend: ein sichtbarer + ein versteckter Spot-Stop über Pair-Coins (kein Stop nötig), das Buch kennt nur den sichtbaren → beidseitig
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.0)], env_echt(), d)                                     # das Paar steht
cfg_ = L.einstellungen(env_echt())
sp_ = L.Spot(cfg_["spot"])
dd_ = {"sym": "BTCUSDT", "coin": "BTC", "kurs": B.kurs["BTCUSDT"], "rs": sp_.regeln2("BTCUSDT")}
g0 = lage(k, "BTCUSDT")
menge_s = round(g0["coins"] / 4, 5)
eigener_spot_stop(sp_, dd_, menge_s, B.kurs["BTCUSDT"] * 0.8)
rH = eigener_spot_stop(sp_, dd_, round(g0["coins"] / 2, 5), B.kurs["BTCUSDT"] * 0.8)
k.orders[rH["orderId"]]["sichtbar_ab"] = B.n_listen + 10 ** 6
r = lauf([E("BTC", 0.0)], env_echt(), d)
g = lage(k, "BTCUSDT")
pruefe("14.E2b Paar, ein sichtbarer + ein versteckter Spot-Stop: beidseitig gesichert (Spot-Stops über alle Coins, Perp-Stop über den Short), nichts über der Netto-Richtung",
       not befunde(k, d) and g["p_qty"] >= -g["pos"] - 0.002, (befunde(k, d), g))

# (d) Kontoprobe als Einheit
class _Lesen:
    def __init__(self, ergebnis=None, fehler=False):
        self.ergebnis, self.fehler = ergebnis, fehler

    def __call__(self, warten=None):
        if self.fehler:
            raise OSError("nicht lesbar")
        return self.ergebnis


dd_p = {"sym": "BTCUSDT", "coin": "BTC", "rs": {"step": 0.00001, "tick": 0.01, "min_notional": 5.0}, "rf": {"step": 0.001, "tick": 0.1}}
w_ = []
L._kontoprobe(_Lesen((0.0, 0.5, -0.2, 100000.0)), dd_p, "BTC", w_.append)    # 0,5 gesperrt, netto 0,3 → 0,2 zu viel
pruefe("14.E2d Kontoprobe: mehr gesperrt als der Stop braucht → beidseitig + Nachkontrolle + laute Meldung",
       dd_p.get("beidseitig") is True and dd_p.get("nachkontrolle") is True and len(w_) == 1, (dd_p, w_))
dd_p2 = {"sym": "BTCUSDT", "coin": "BTC", "rs": dd_p["rs"], "rf": dd_p["rf"]}
w2_ = []
L._kontoprobe(_Lesen((0.2, 0.1, -0.2, 100000.0)), dd_p2, "BTC", w2_.append)   # genau die Netto-Richtung (0,1) gesperrt, 0,2 frei
L._kontoprobe(_Lesen(fehler=True), dd_p2, "BTC", w2_.append)                   # Konto nicht lesbar: nichts tun
dd_p3 = {"sym": "BTCUSDT", "coin": "BTC", "rs": dd_p["rs"], "rf": dd_p["rf"], "beidseitig": True}
L._kontoprobe(_Lesen((0.0, 0.5, -0.2, 100000.0)), dd_p3, "BTC", w2_.append)   # schon beidseitig: nichts doppelt
dd_p4 = {"sym": "BTCUSDT", "coin": "BTC", "rs": dd_p["rs"], "rf": dd_p["rf"], "unklar_sell": 0.0}
L._kontoprobe(_Lesen((0.0, 0.5, -0.2, 100000.0)), dd_p4, "BTC", w2_.append)   # unklarer Auftrag: beidseitig ohnehin
pruefe("14.E2d Kontoprobe: passt / nicht lesbar / schon beidseitig / unklarer Auftrag → still, nichts gesetzt",
       not w2_ and not dd_p2.get("beidseitig") and not dd_p2.get("nachkontrolle"), (w2_, dd_p2))

# 14.E3b (Lauf-Seed 20369): Not-Stop über offenem Short + unklarem Short wird mit −2022 abgelehnt → wenigstens den offenen Short sichern
k = neues_konto(20000)
k.buchen("ETHUSDT", -0.073, B.kurs["ETHUSDT"])
cfg_ = L.einstellungen(env_echt())
fu_ = L.Fut(cfg_["futures"])
dd_ = {"sym": "ETHUSDT", "rf": fu_.regeln("ETHUSDT")}
B.reduce_algo_streng = True
w_, gesetzt_ = [], []
try:
    ok_ = L._perp_notstop(fu_, "ETH", dd_, {}, 0.137, B.kurs["ETHUSDT"], w_.append, gesetzt_, "Test")
finally:
    B.reduce_algo_streng = False
g = lage(k, "ETHUSDT")
pruefe("14.E3b Not-Stop über offenem + unklarem Short (−2022): der offene Short bekommt seinen Stop (nicht «OHNE Stop»)",
       ok_ is True and abs(g["p_qty"] - 0.073) < 0.002 and not any("OHNE Stop" in x for x in w_), (ok_, g, w_))

# 14.E3 (strenger Fuzzer, Lauf-Seed 20557): Not-Aus-Schutz mit VERALTETEN Zahlen (Kontostand nicht lesbar) löscht keinen stehenden Stop
k, sp, fu, dd = handlage(coins=0.424, short=0.424, kurs=100000.0)     # ein abgesichertes Paar
eigener_spot_stop(sp, dd, 0.1069, 80000.0)                             # ein Rest-Stop über Paar-Coins (der Not-Aus konnte ihn nicht löschen)
rf_ = fu.regeln("BTCUSDT")
fu.stop_menge("BTCUSDT", "BUY", 0.424, 120000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))   # der Perp-Stop über den ganzen Short
erg_ = {"zeilen": [], "auftraege": []}
w_ = []
L._notaus_schutz(sp, fu, {}, "BTC", "BTCUSDT", "BTC", -0.424, -0.424, 0.0, 1.33, 100000.0, dd["rs"], w_.append, "testnetz", None,
                 buch={}, erg=erg_, stand_frisch=False)               # veraltet: «gebunden» 1,33 stimmt nicht mehr (der Verkauf lief)
g = lage(k, "BTCUSDT")
pruefe("14.E3 Schutz mit veralteten Zahlen: der Perp-Stop über den ganzen Short bleibt stehen (er könnte der einzige Schutz sein)",
       abs(g["p_qty"] - 0.424) < 0.002, (g, w_))
k, sp, fu, dd = handlage(coins=0.424, short=0.424, kurs=100000.0)
eigener_spot_stop(sp, dd, 0.1069, 80000.0)
fu.stop_menge("BTCUSDT", "BUY", 0.424, 120000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
L._notaus_schutz(sp, fu, {}, "BTC", "BTCUSDT", "BTC", -0.424, -0.424, 0.0, 1.33, 100000.0, dd["rs"], [].append, "testnetz", None,
                 buch={}, erg={"zeilen": [], "auftraege": []}, stand_frisch=True)
g2 = lage(k, "BTCUSDT")
pruefe("14.E3 dieselben Zahlen als FRISCH gelesen: der zu grosse Perp-Stop wird wie bisher ersetzt/gelöscht (die Unterscheidung wirkt)",
       g2["p_qty"] < 0.424 - 0.002, g2)


# 14.E4 (strenger Fuzzer): Prüf-Werkzeug — gestapelte endliche Störungen auf dem Schutzpfad zählen wie eine dauerhafte, wenn sie Pilot 2.0 alle Versuche nehmen
def _r14(pfad, anzahl0, art="429", methode="POST", pred=None):
    return {"methode": methode, "pfad": pfad, "pred": pred, "art": art, "anzahl": 0, "anzahl0": anzahl0}   # «anzahl» ist verbraucht


v_ = len(L.SCHUTZ_WARTEN) + 1
pruefe("14.E4 _dauer: Perp-Stop-Pfad, Summe der ursprünglichen Anzahlen (3 + 3 + 1) ≥ Versuche → wie dauerhaft",
       P._dauer([_r14("/fapi/v1/algoOrder", 3), _r14("/fapi/v1/algoOrder", 3), _r14("/fapi/v1/algoOrder", 1, art="vor503")], "SHORT_OHNE_STOP"),
       v_)
pruefe("14.E4 _dauer: Summe knapp unter den Versuchen (2 + 2) → nicht dauerhaft, die Lücke bleibt ein Befund",
       not P._dauer([_r14("/fapi/v1/algoOrder", 2), _r14("/fapi/v1/algoOrder", 2)], "SHORT_OHNE_STOP"))
pruefe("14.E4 _dauer: Marktaufträge (kein Schutzpfad) zählen nie, auch nicht gestapelt",
       not P._dauer([_r14("/fapi/v1/order", 4), _r14("/fapi/v1/order", 4)], "SHORT_OHNE_STOP"))
pruefe("14.E4 _dauer: die Perp-Störung entschuldigt keine Spot-Lücke (und umgekehrt)",
       not P._dauer([_r14("/fapi/v1/algoOrder", 6)], "LONG_OHNE_STOP") and P._dauer([_r14("/fapi/v1/algoOrder", 6)], "SHORT_OHNE_STOP"))
pruefe("14.E4 _dauer: eine dauerhafte Störung (99) zählt auch nach vielen Verbräuchen (anzahl0)",
       P._dauer([dict(_r14("/api/v3/account", 99, methode="GET"), anzahl=3)], "LONG_OHNE_STOP"))
k = neues_konto(20000)
n0_ = B.n_listen
P.sauber_schliessen(env_echt(), neu_buch())
pruefe("14.E4 sauber_schliessen: «10 Minuten später» zeigen die Listen jeden Auftrag (Verzögerung «unsichtbar» ist vorbei)", B.n_listen - n0_ >= 1000, B.n_listen - n0_)

# strenger Modus im Prozess einschalten: die Lauf-Seeds, die ihn eingeführt haben (alle am alten Stand ein Befund)
P.STRENG = True
try:
    for seed14, was14 in ((20568, "E2: drei Spot-Stops, einer verzögert sichtbar"), (20803, "E2: ein sichtbarer + ein versteckter Spot-Stop über Paar-Coins"),
                          (20473, "E2: Zusatz-Stop verzögert sichtbar, nur_ergaenzen"), (20736, "E2: Spot-Stop über Netto"),
                          (20557, "E3: Not-Aus mit unlesbarem Konto löschte den Perp-Stop"), (20369, "E3b: Not-Stop über Short + Unklares (−2022)"),
                          (20289, "E4: gestapelte 429 auf dem Perp-Stop"), (20535, "E4: Ende, Coins unbekannt wieder verkäuflich"),
                          (20549, "E4: Ende, Coins unbekannt wieder verkäuflich")):
        funde = P.echte(P.laeufe_runde(seed14, 30))
        pruefe(f"14.E2–E4 strenger Lauf-Seed {seed14} ({was14}): keine Befunde", not funde,
               [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False

# ── kleiner Fuzzer mit festen Seeds (der grosse: python3 -B pruef_fuzzer.py laeufe 0 200 / notaus 0 1600) ──
funde = []
for seed in list(range(60)) + [465, 5673, 5085, 5087]:  # 465: Stop löst im Schutz aus (9.); 5673/5085/5087: Rest-/alter Stop (10.)
    funde += P.notaus_runde(seed)
pruefe("Fuzzer Not-Aus (64 Seeds, harte Störungen): keine Befunde", not P.echte(funde), [(f[0], f[1].get("seed")) for f in P.echte(funde)][:5])
funde = []
for seed in range(4):
    funde += P.laeufe_runde(seed, 12)
pruefe("Fuzzer Läufe (4 Seeds × 12 Tage, Störungen in jedem Schritt): keine Befunde", not P.echte(funde),
       [(f[0], f[1].get("seed"), f[1].get("tag")) for f in P.echte(funde)][:5])

pruefe("Sperre: ausgeliefert ist Pilot 2.0 gesperrt (FREIGEGEBEN = False)", GESPERRT_AUSGELIEFERT)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
