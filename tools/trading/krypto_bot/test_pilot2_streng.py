#!/usr/bin/env python3
"""Pilot 2.0 gegen die STRENGE Prüf-Börse (pruef_boerse.py) — die Belege der 8. (p1–p11), 9. (9.p1–9.p10), 10. (10.*) und
11. Prüfung (11.*, dazu die Schlussprobe 11.F/11.S: eigene Funde und Lücken der Mutationsprobe), der 12. (12.*) und 13. Prüfung
(13.*), der 14. (14.*, dazu E8–E15 des Folge-PR) und der 15. Prüfung (15.*) und die Fuzzer-Funde als feste Szenarien, dazu ein kleiner Fuzzer mit festen Seeds (pruef_fuzzer.py). Ohne Netz, nur 127.0.0.1.
    python3 -B tools/trading/krypto_bot/test_pilot2_streng.py"""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot2_live as L  # noqa: E402

GESPERRT_AUSGELIEFERT = not L.FREIGEGEBEN  # vor dem Import des Prüf-Rahmens (der schaltet nur in diesem Prozess frei)
import pruef_fuzzer as P  # noqa: E402
from pruef_fuzzer import B, E, env_echt, env_test, lage, lauf, neu_buch, neues_konto  # noqa: E402
import pruef_raster as R  # noqa: E402

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
# W1: neuer Perp-Stop kam an, Antwort verloren, Wiederholungen scheitern → der vielleicht angekommene bleibt (Folge-PR E26: nie ein Geister-Stop löschen, der der einzige Schutz sein kann); stehen dann zwei, ist der Markt
# beidseitig gesichert (Spot-Stop über alle Coins) und die Nachkontrolle räumt nach Mengen auf — am Ende genau ein Stop über den Short
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", -0.5)], env_echt(), d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
r = lauf([E("BTC", -0.5, stop_abstand=0.08)], env_echt(), d)
g_lauf = lage(k, "BTCUSDT")
n_p = g_lauf["n_p"]
beidseitig_lauf = n_p < 2 or g_lauf["s_qty"] >= g_lauf["coins"] - 1e-4  # zwei Stops stehen nur bei einem Markt, dessen Coins ganz unter dem Spot-Stop liegen
P.nachkontrolle(env_echt(), d)
n_p_nk = lage(k, "BTCUSDT")["n_p"]
B.regeln = []
B.bewegen("BTCUSDT", 111000.0)
pruefe("10.p5 Perp-Stop mit verlorener Antwort → bleibt stehen (höchstens zwei Stops, dann beidseitig gesichert), die Nachkontrolle räumt auf: nie zwei Stops am Ende; ein Kurssprung trifft die Ernte nicht",
       n_p in (1, 2) and beidseitig_lauf and n_p_nk == 1 and not befunde(k, d), (n_p, g_lauf, n_p_nk, P.zeigen(k)["BTCUSDT"], r["zeilen"][-3:]))
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
# 11.S12 (14. Prüfung E5/E6 neu gefasst; erkannte die Mutation «R11-M12» — die Gebühr steckt jetzt in den TATSÄCHLICHEN Coins):
# Vorab nach dem Ernte-Kauf: der Perp-Stop schrumpft höchstens auf das, was am Plan-Ende ungesichert bleibt — die TATSÄCHLICHEN Coins (Gebühr
# schon abgezogen) und die noch ausstehenden neuen Shorts dieses Laufs, NICHT das ungekürzte Endziel des Plans (E5: der Auftragsdeckel
# (KI_BOT_ANTEIL/KI_BOT_MAX_AUFTRAG), ein Mindestbetrag oder ein zu kleiner Kauf lassen es heute nie eintreten, Lauf-Seed 22466) — und nie
# darunter, auch nicht auf den Stand vor dem neuen Short (E6: sonst bliebe der neue Short bis zum Abgleich am Laufende ohne Stop, und kann der
# Abgleich nicht lesen, bis zur Nachkontrolle; Standard-Lauf-Seeds 17244, 17363, 17706)
for was12, schritte12, short12, stop12, erwartet12 in (
        ("ohne weiteren Short", [], 1.6, 1.2, 1.1),
        ("mit einem neuen Short 1,0 (kommt mit schon gekauften Coins): der Stop bleibt (Plan-Ende 2,1 > 1,2), der Abgleich hebt ihn am Laufende an",
         [("perp", "SELL", 1.0, False)], 1.6, 1.2, 1.2),
        ("mit einem kleinen neuen Short 0,05: nur bis aufs Plan-Ende (2,55) verkleinert, nicht bis auf das, was jetzt ungesichert ist (2,5)",
         [("perp", "SELL", 0.05, False)], 3.0, 2.6, 2.55),
        ("mit einem reduceOnly-Verkauf 0,05 (schliesst einen Perp-Long, KEIN neuer Short — R14-M53): zählt nicht mit, der Stop schrumpft auf 2,5",
         [("perp", "SELL", 0.05, True)], 3.0, 2.6, 2.5)):
    k = neues_konto(400000)
    cfg = L.einstellungen(env_echt(kapital=400000))
    spot, fut = L.Spot(cfg["spot"]), L.Fut(cfg["futures"])
    sym = "BTCUSDT"
    k.frei["BTC"] = 0.5
    k.buchen(sym, -short12, B.kurs[sym])
    d = {"sym": sym, "coin": "BTC", "kurs": B.kurs[sym], "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
    fut.stop_menge(sym, "BUY", stop12, 110000.0, d["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    buch = L.leer_buch()
    # das Endziel des Plans (Coins 2,5, Short 3,0) erreicht dieser Lauf NICHT (Deckel): gekauft sind nur die 0,5 Coins, die da sind
    geaendert = L._stops_vorab(spot, fut, buch, "BTC", d, {"info": {"spot_ziel": 2.5, "perp_ziel": -3.0}, "schritte": schritte12})
    g = lage(k, sym)
    pruefe(f"11.S12 Vorab nach dem Kauf, {was12}: Perp-Stop {erwartet12:g}",
           bool(geaendert) == (abs(erwartet12 - stop12) > 1e-9) and g["n_p"] == 1 and abs(g["p_qty"] - erwartet12) < 1e-9, (geaendert, g, erwartet12))
# 14.E6c (nur_jetzt, nach dem Verkleinern und VOR dem Kauf): der Stop schrumpft auf das, was JETZT ungesichert ist (2,5) — nicht aufs Plan-Ende (2,55):
# bleibt der Kauf unklar oder wird er abgelehnt, wäre der Short sonst teilweise ohne Stop
k = neues_konto(400000)
cfg = L.einstellungen(env_echt(kapital=400000))
spot, fut = L.Spot(cfg["spot"]), L.Fut(cfg["futures"])
sym = "BTCUSDT"
k.frei["BTC"] = 0.5
k.buchen(sym, -3.0, B.kurs[sym])
d = {"sym": sym, "coin": "BTC", "kurs": B.kurs[sym], "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
fut.stop_menge(sym, "BUY", 2.6, 110000.0, d["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
geaendert = L._stops_vorab(spot, fut, L.leer_buch(), "BTC", d, {"info": {"spot_ziel": 2.5, "perp_ziel": -3.0},
                                                                "schritte": [("perp", "SELL", 0.05, False)]}, nur_jetzt=True)
g = lage(k, sym)
pruefe("14.E6c Vorab VOR dem Kauf (nur_jetzt): der Perp-Stop schrumpft auf das, was jetzt ungesichert ist (2,5), nicht aufs Plan-Ende (2,55)",
       geaendert and g["n_p"] == 1 and abs(g["p_qty"] - 2.5) < 1e-9, (geaendert, g))
# 14.E7 (Schlusskampagne, Standard-Lauf-Seed 15519): die Rundung des Plans (Stop aufgerundet, Absicherung abgerundet) erklärt bis zu einen Futures-Schritt
# Unterschied zwischen dem alten Stop und dem, was am Plan-Ende nötig ist — Vorab ersetzt einen Perp-Stop nur, wenn er mehr als VORAB_TOLERANZ (2) Schritte zu
# gross ist: ein Ersetzen dafür lässt, wenn der Abgleich danach nicht lesen kann (Position dauerhaft unlesbar), ein Fenster offen und bringt fast nichts
for was7, stop7, soll_geaendert7 in (("1 Schritt zu gross (Rundung)", 1.101, False), ("2 Schritte zu gross (Grenze, noch Rundung)", 1.102, False), ("3 Schritte zu gross", 1.103, True)):
    k = neues_konto(400000)
    cfg = L.einstellungen(env_echt(kapital=400000))
    spot, fut = L.Spot(cfg["spot"]), L.Fut(cfg["futures"])
    sym = "BTCUSDT"
    k.frei["BTC"] = 0.5
    k.buchen(sym, -1.6, B.kurs[sym])
    d = {"sym": sym, "coin": "BTC", "kurs": B.kurs[sym], "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
    fut.stop_menge(sym, "BUY", stop7, 110000.0, d["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    geaendert = L._stops_vorab(spot, fut, L.leer_buch(), "BTC", d, {"info": {"spot_ziel": 2.5, "perp_ziel": -3.0}, "schritte": []})
    g = lage(k, sym)
    pruefe(f"14.E7 Vorab: Perp-Stop {was7} → " + ("auf 1,1 verkleinert" if soll_geaendert7 else "bleibt (kein Ersetzen für einen Rundungsunterschied)"),
           bool(geaendert) == soll_geaendert7 and g["n_p"] == 1 and abs(g["p_qty"] - (1.1 if soll_geaendert7 else stop7)) < 1e-9, (geaendert, g))
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
pruefe("12.S4 Perp-Stops (alter nicht löschbar, Liste unlesbar): der Not-Aus-Stop plus (19. Prüfung K6, Schwelle PERP_BLIND_MAX) ein ganzer reduceOnly-Stop über den Short; lösen sie aus, liegt kein Long ohne Stop da",
       g["n_p"] == 3 and g["p_qty"] >= -g["pos"] - 1e-9 and _lang < 10, (g, _lang))
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
# 14.E2–E5: Lauf-Seeds 20568, 20803, 20473, 20736 (E2), 20557 (E3), 20369 (E3b); E4 = Prüf-Werkzeug (20289, 20535, 20549); E5 = 22466
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
                          (20549, "E4: Ende, Coins unbekannt wieder verkäuflich"),
                          (22466, "E5: Auftragsdeckel — Vorab-Stop aufs ungekürzte Plan-Ende, STOP mitten im Lauf")):
        funde = P.echte(P.laeufe_runde(seed14, 30))
        pruefe(f"14.E2–E4 strenger Lauf-Seed {seed14} ({was14}): keine Befunde", not funde,
               [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False

# ── Mutationsprobe der 14. Runde: ältere Schutzstellen, die seit E2 doppelt abgesichert sind (14.D1–D6) ──
# Vier Stellen im Spot-Abgleich (M8, R11-M20, R11-M22, R13-M20) behandeln gesperrte Coins, die die Auftragsliste nicht zeigt (D5: Perp-Gegenstück zu F1;
# D6: die 13.F1-Stellen im Not-Aus, verdeckt durch E3). Seit E2 prüft zusätzlich die
# Kontoprobe (_stops_setzen) nach jeder Abgleich-Runde — beide führen zum selben sicheren Endzustand («beidseitig»), eine Mutation der älteren
# Stelle blieb darum unbemerkt (Lehre der 13. Runde: doppelt abgesicherte Stellen einzeln prüfen). Hier ruft jeder Test `_spot_abgleich`
# DIREKT auf (ohne Kontoprobe, die erst _stops_setzen danach aufruft): die ältere Schicht muss selbst handeln.
def _d_abgleich(sp_, fu_, dd_, st_, coins, short, frei, gebunden):
    s_ = L._soll(coins, -short, 100000.0, dd_)
    s_.update(frei=frei, gebunden=gebunden)
    L._spot_abgleich(sp_, "BTC", dd_, st_, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [],
                     lambda w=None: L._lage(sp_, fu_, dd_, w), False)


def _d_versteckt(k_, sp_, dd_, menge):
    oid_ = eigener_spot_stop(sp_, dd_, menge, 80000.0)["orderId"]
    k_.orders[oid_]["sichtbar_ab"] = B.n_listen + 10 ** 6  # nie sichtbar in diesem Test
    return oid_


# 14.D1 (M8): kein sichtbarer Stop; 0,1 der 0,5 Coins sind durch einen Auftrag ausserhalb der Liste gesperrt → der neue Stop deckt nur den Rest (0,2)
k, sp, fu, dd = handlage(coins=0.5, short=0.2, kurs=100000.0)  # netto 0,3 → soll 0,3
_d_versteckt(k, sp, dd, 0.1)
_d_abgleich(sp, fu, dd, {}, 0.5, 0.2, 0.4, 0.1)
g = lage(k, "BTCUSDT")
pruefe("14.D1 gesperrte Coins ausserhalb der Liste: der neue Spot-Stop deckt nur den Rest (zusammen genau die Netto-Richtung, nie doppelt)",
       abs(g["s_qty"] - 0.3) < 0.002 and g["n_s"] == 2, g)
# 14.D2a (R11-M20): kein Stop nötig (das Paar ist abgesichert), ein Stop steht gesperrt ausserhalb der Liste, das Buch kennt seine ID → über die ID gelöscht
k, sp, fu, dd = handlage(coins=0.5, short=0.5, kurs=100000.0)  # netto 0
oid_d = _d_versteckt(k, sp, dd, 0.3)
st_d = {"spot": oid_d}
_d_abgleich(sp, fu, dd, st_d, 0.5, 0.5, 0.2, 0.3)
pruefe("14.D2a unsichtbarer Stop über Paar-Coins, ID im Buch → gelöscht (die Absicherungs-Coins sind wieder frei), noch eine Runde",
       k.orders[oid_d]["status"] == "CANCELED" and not st_d.get("spot") and dd.get("neue_runde") is True and not dd.get("beidseitig"),
       (k.orders[oid_d]["status"], st_d, dd))
# 14.D2b (R11-M20): dasselbe, aber das Buch kennt die ID nicht → der Markt wird beidseitig gesichert (der Short bekommt seinen Stop) + Nachkontrolle
k, sp, fu, dd = handlage(coins=0.5, short=0.5, kurs=100000.0)
_d_versteckt(k, sp, dd, 0.3)
_d_abgleich(sp, fu, dd, {}, 0.5, 0.5, 0.2, 0.3)
pruefe("14.D2b unsichtbarer Stop über Paar-Coins, ID unbekannt → beidseitig gesichert + Nachkontrolle",
       dd.get("beidseitig") is True and dd.get("nachkontrolle") is True, dd)
# 14.D3 (R11-M22): der gesperrte, nicht gelistete Stop (0,2) ist grösser als die Netto-Richtung (0,05), und nichts ist mehr zu setzen → beidseitig
k, sp, fu, dd = handlage(coins=0.5, short=0.45, kurs=100000.0)  # netto 0,05
oid_d = _d_versteckt(k, sp, dd, 0.2)
_d_abgleich(sp, fu, dd, {"spot": oid_d}, 0.5, 0.45, 0.3, 0.2)
pruefe("14.D3 unsichtbarer Stop grösser als die Netto-Richtung (nichts mehr zu setzen) → beidseitig gesichert", dd.get("beidseitig") is True, dd)
# 14.D4 (R13-M20): Spot-Liste nicht lesbar, kein Stop nötig (Paar): der im Buch bekannte Stop wird über seine ID gelöscht; standen mehrere (das Buch kennt
# nur einen), ist danach noch zu viel gesperrt → beidseitig. Ohne den Blick aufs Konto bliebe der unbekannte Stop über der Absicherung.
def _d_ohne_liste(sp_, fu_, dd_, st_, coins, short, frei, gebunden):
    s_ = L._soll(coins, -short, 100000.0, dd_)
    s_.update(frei=frei, gebunden=gebunden)
    L._spot_ohne_liste(sp_, "BTC", dd_, st_, {"stop_long": 85000.0}, s_, _W.append, [], False, RuntimeError("Liste nicht lesbar"),
                       {"auftraege": []}, lambda w=None: L._lage(sp_, fu_, dd_, w))


k, sp, fu, dd = handlage(coins=0.5, short=0.5, kurs=100000.0)  # netto 0 → kein Stop nötig
a_d = _d_versteckt(k, sp, dd, 0.3)  # dem Buch bekannt
_d_versteckt(k, sp, dd, 0.2)  # dem Buch unbekannt
_d_ohne_liste(sp, fu, dd, {"spot": a_d}, 0.5, 0.5, 0.0, 0.5)
pruefe("14.D4a Liste unlesbar, zwei Spot-Stops (das Buch kennt einen), kein Stop nötig → bekannter gelöscht, noch zu viel gesperrt → beidseitig",
       k.orders[a_d]["status"] == "CANCELED" and dd.get("beidseitig") is True, (k.orders[a_d]["status"], dd))
k, sp, fu, dd = handlage(coins=0.5, short=0.5, kurs=100000.0)
a_d = _d_versteckt(k, sp, dd, 0.3)
st_d = {"spot": a_d}
_d_ohne_liste(sp, fu, dd, st_d, 0.5, 0.5, 0.2, 0.3)
pruefe("14.D4b Liste unlesbar, EIN Spot-Stop (im Buch), kein Stop nötig → gelöscht, nichts mehr gesperrt → nicht beidseitig",
       k.orders[a_d]["status"] == "CANCELED" and not dd.get("beidseitig") and not st_d.get("spot"), (k.orders[a_d]["status"], st_d, dd))
# 14.D5 (R14-M2): Perp-Gegenstück zu 14.F1s — kein Stop mehr nötig (das Paar ist abgesichert), der im Buch bekannte Perp-Stop steht, die Liste zeigt ihn aber
# (noch) nicht → über seine Kennung gelöscht, sonst kaufte er später die Absicherung zurück (Coins ohne Short)
k, sp, fu, dd = handlage(coins=0.5, short=0.5, kurs=100000.0)
cid_d = L._kennung(L.CID_STOP_PERP)
r_d = fu.stop_menge("BTCUSDT", "BUY", 0.5, 120000.0, dd["rf"]["tick"], cid=cid_d)
k.algos[r_d["algoId"]]["sichtbar_ab"] = B.n_listen + 10 ** 6  # nie sichtbar in diesem Test
st_d = {"perp": r_d.get("algoId"), "perp_cid": cid_d}
s_ = L._soll(0.5, -0.5, 100000.0, dd)
s_.update(frei=0.5, gebunden=0.0)
L._perp_abgleich(fu, "BTC", dd, st_d, {"stop_short": 115000.0}, s_, {"auftraege": []}, _W.append, [], [],
                 lambda w=None: L._lage(sp, fu, dd, w), False)
g = lage(k, "BTCUSDT")
pruefe("14.D5 Perp: kein Stop nötig, der bekannte Stop ist nur verzögert sichtbar → über seine Kennung gelöscht",
       g["n_p"] == 0 and not st_d.get("perp"), (g, st_d))
# 14.D6 (R13-M18/M19): die Schutzstellen der 13.F1 (Not-Aus, Auftrag im Schutz unklar, Stand nicht lesbar → die zweite Runde ohne den alten Stand) werden
# seit E3 (kein Verkleinern/Löschen auf veralteten Zahlen) von einer zweiten Schicht verdeckt → E3 für diesen Test abschalten (stand_frisch immer True)
_ns_alt = L._notaus_schutz
L._notaus_schutz = lambda *a_, **kw_: _ns_alt(*a_, **dict(kw_, stand_frisch=True))
try:
    funde = P.notaus_runde(9123)
finally:
    L._notaus_schutz = _ns_alt
pruefe("14.D6 Not-Aus-Seed 9123 mit abgeschaltetem E3: zweite Runde beidseitig, keine Befunde (die 13.F1-Stellen allein)", not funde,
       [(f[0], f[1].get("wann")) for f in funde][:5])

# ── 14.F1-Zweige (Mutationsprobe): F1 löscht im Buch bekannte, in der Liste aber nicht sichtbare Stops an mehreren Stellen von _perp_abgleich und in
# _perp_versteckte_weg selbst; der Test der Hauptstelle (14.F1) pinnt nur den Weg «neuer Stop gesetzt». Jede Stelle einzeln (direkter Aufruf) ──
def _f1_perp_stop(k_, fu_, dd_, menge, trigger, sichtbar):
    cid_ = L._kennung(L.CID_STOP_PERP)
    r_ = fu_.stop_menge("BTCUSDT", "BUY", menge, trigger, dd_["rf"]["tick"], cid=cid_)
    if not sichtbar:
        k_.algos[r_["algoId"]]["sichtbar_ab"] = B.n_listen + 10 ** 6  # nie sichtbar in diesem Test
    return r_["algoId"], cid_


def _f1_perp_abgleich(sp_, fu_, dd_, st_, coins, short, e_):
    s_ = L._soll(coins, -short, 100000.0, dd_)
    s_.update(frei=coins, gebunden=0.0)
    L._perp_abgleich(fu_, "BTC", dd_, st_, e_, s_, {"auftraege": []}, _W.append, [], [], lambda w=None: L._lage(sp_, fu_, dd_, w), False)


# a) ein sichtbarer Stop passt genau; der im Buch gemerkte, nur verzögert sichtbare zweite steht daneben → über die Kennung gelöscht
k, sp, fu, dd = handlage(coins=0.2, short=0.5, kurs=100000.0)  # ungesichert 0,3
aid_a, cid_a = _f1_perp_stop(k, fu, dd, 0.3, 115000.0, True)
aid_b, cid_b = _f1_perp_stop(k, fu, dd, 0.5, 118000.0, False)
_f1_perp_abgleich(sp, fu, dd, {"perp": aid_a, "perp_cid": cid_a, "p_short": 115000.0, "perp_weitere": [[aid_b, cid_b]]}, 0.2, 0.5, {"stop_short": 115000.0})
g = lage(k, "BTCUSDT")
pruefe("14.F1a Perp: passender Stop bleibt, der gemerkte nur verzögert sichtbare daneben wird über die Kennung gelöscht",
       g["n_p"] == 1 and abs(g["p_qty"] - 0.3) < 1e-9, g)
# b) beidseitig, die sichtbaren Stops decken den ganzen Short (anderer Kurs → «passt» trifft nicht); der versteckte daneben → gelöscht
k, sp, fu, dd = handlage(coins=0.2, short=0.5, kurs=100000.0)
dd["beidseitig"] = True
aid_a, cid_a = _f1_perp_stop(k, fu, dd, 0.5, 118000.0, True)
aid_b, cid_b = _f1_perp_stop(k, fu, dd, 0.5, 119000.0, False)
_f1_perp_abgleich(sp, fu, dd, {"perp": aid_a, "perp_cid": cid_a, "p_short": 118000.0, "perp_weitere": [[aid_b, cid_b]]}, 0.2, 0.5, {"stop_short": 115000.0})
g = lage(k, "BTCUSDT")
pruefe("14.F1b Perp beidseitig: die sichtbaren Stops decken den Short, der nur verzögert sichtbare wird gelöscht", g["n_p"] == 1, g)
# c) Kurs schon über dem Stop-Kurs → Ausstieg zum Markt; der versteckte alte Stop (zu gross) wird danach gelöscht
k, sp, fu, dd = handlage(coins=0.2, short=0.5, kurs=100000.0)
aid_a, cid_a = _f1_perp_stop(k, fu, dd, 0.3, 104000.0, True)
aid_b, cid_b = _f1_perp_stop(k, fu, dd, 0.5, 118000.0, False)
_f1_perp_abgleich(sp, fu, dd, {"perp": aid_a, "perp_cid": cid_a, "p_short": 99000.0, "perp_weitere": [[aid_b, cid_b]]}, 0.2, 0.5, {"stop_short": 99000.0})
g = lage(k, "BTCUSDT")
pruefe("14.F1c Perp: Kurs schon über dem Stop → zurückgekauft, danach ist auch der nur verzögert sichtbare alte Stop gelöscht",
       g["n_p"] == 0 and g["pos"] > -0.21, g)
# d) das Löschen des versteckten Stops scheitert → gemerkt, Markt beidseitig, noch eine Runde (kein stilles Liegenlassen)
k, sp, fu, dd = handlage(coins=0.2, short=0.5, kurs=100000.0)
aid_b, cid_b = _f1_perp_stop(k, fu, dd, 0.5, 118000.0, False)
st_f1 = {"perp": aid_b, "perp_cid": cid_b}
B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
try:
    L._perp_versteckte_weg(fu, "BTC", dd, st_f1, _W.append, L._perp_versteckte(st_f1, []))
finally:
    B.regeln = []
pruefe("14.F1d versteckter Perp-Stop nicht löschbar → gemerkt, Markt beidseitig, noch eine Runde",
       dd.get("beidseitig") is True and dd.get("neue_runde") is True and any(str(w[0]) == str(aid_b) for w in st_f1.get("perp_weitere") or []), (st_f1, dd))
# e) gelöscht, und war er der aktuelle Eintrag des Buchs → der Eintrag ist leer (kein Verweis auf einen toten Stop)
k, sp, fu, dd = handlage(coins=0.2, short=0.5, kurs=100000.0)
aid_b, cid_b = _f1_perp_stop(k, fu, dd, 0.5, 118000.0, False)
st_f1 = {"perp": aid_b, "perp_cid": cid_b}
L._perp_versteckte_weg(fu, "BTC", dd, st_f1, _W.append, L._perp_versteckte(st_f1, []))
g = lage(k, "BTCUSDT")
pruefe("14.F1e versteckter aktueller Perp-Stop gelöscht → Buch-Eintrag leer", g["n_p"] == 0 and not st_f1.get("perp") and not st_f1.get("perp_cid"), (g, st_f1))
# f) Spot-Gegenstück zu d): kein Stop nötig; ein Stop ist sichtbar (A), der im Buch bekannte zweite (B) nur verzögert sichtbar und nicht löschbar
#    → B bleibt im Buch + Markt beidseitig (A wird gelöscht)
k, sp, fu, dd = handlage(coins=0.5, short=0.5, kurs=100000.0)  # netto 0 → kein Stop nötig
oid_a = eigener_spot_stop(sp, dd, 0.1, 80000.0)["orderId"]
oid_b = eigener_spot_stop(sp, dd, 0.2, 80000.0)["orderId"]
k.orders[oid_b]["sichtbar_ab"] = B.n_listen + 10 ** 6
st_f1 = {"spot": oid_b}
s_ = L._soll(0.5, -0.5, 100000.0, dd)
s_.update(frei=0.2, gebunden=0.3)
B.regeln = [regel(methode="DELETE", pfad="/api/v3/order", pred=lambda m, p_, q: str(q.get("orderId")) == str(oid_b), art="vor503", anzahl=10 ** 6)]
try:
    L._spot_abgleich(sp, "BTC", dd, st_f1, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], [], lambda w=None: L._lage(sp, fu, dd, w), False)
finally:
    B.regeln = []
pruefe("14.F1f Spot: kein Stop nötig, der bekannte nur verzögert sichtbare Stop ist nicht löschbar → im Buch behalten + beidseitig",
       st_f1.get("spot") == oid_b and dd.get("beidseitig") is True and k.orders[oid_a]["status"] == "CANCELED", (st_f1, dd, k.orders[oid_a]["status"]))

# 14.E6 (Standard-Fuzzer, Schlusskampagne): Vorab-Verkleinerung des Perp-Stops auf den Stand vor dem neuen Short + danach dauerhaft unlesbares
# Spot-Konto (Abgleich unmöglich) → der neue Short blieb ohne Stop (221–943 USDT, laut gemeldet): die Lücke entstand durch Pilot 2.0 selbst
# (Regression von E5), am Stand vor E5 gab es sie nicht
for seed14e6, was14e6 in ((17244, "BTC: Kauf, neuer Short 0,013 unklar, Konto danach unlesbar"), (17363, "BTC/ETH: Kauf, neue Shorts, 503 auf dem Konto"),
                          (17706, "BTC: Kauf, neuer Short, Lauf unterbrochen (503 auf dem Konto)"),
                          (15519, "E7: Vorab ersetzt den Perp-Stop um nur einen Schritt, die Position ist danach dauerhaft unlesbar")):
    funde = P.echte(P.laeufe_runde(seed14e6, 30))
    pruefe(f"14.E6 Lauf-Seed {seed14e6} ({was14e6}): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])


# ── Mutationsprobe der 14. Runde, Teil 2: Zweige der Korrekturen F2/F3/K1/K2/K5/E2/E3, die kein Test einzeln pinnte (14.F2a/b, F3b, K1b, K5b, E2c/d, E3-Spot/Perp, D7) ──
# Mutationsprobe der 14. Runde, Teil 2: Zweige der Korrekturen F2/F3/K1/K5/E2/E3, die kein Test einzeln pinnte (R14-M16/M17/M22/M26/M34/M35/M44–M47)
def _g_lesen(sp_, fu_, dd_):
    return lambda w=None: L._lage(sp_, fu_, dd_, w)


# F2a (R14-M16): Perp-Liste unlesbar, reduceOnly-Stop über der Position abgelehnt (−2022) → Rückfall auf die FRISCH gelesene Position
# (ein alter Stop hat seit dem Rundenanfang ausgelöst: der Short ist 0,3 statt 0,5)
k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
s_ = L._soll(0.0, -0.5, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.0)
B.reduce_algo_streng = True
try:
    L._perp_ohne_liste(fu, "BTC", dd, {}, {"stop_short": 115000.0}, s_, _W.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, _g_lesen(sp, fu, dd))
finally:
    B.reduce_algo_streng = False
g = lage(k, "BTCUSDT")
pruefe("14.F2a Perp-Liste unlesbar, Stop über der Position abgelehnt → Rückfall-Stop über die FRISCH gelesene Position (0,3, nicht die vom Rundenanfang)",
       abs(g["p_qty"] - 0.3) < 0.002, g)

# F2b (R14-M17): derselbe Rückfall, aber der Kurs springt dazwischen über Stop- UND Not-Stop-Kurs → auch der kleinere Stop würde sofort auslösen → Ausstieg zum Markt
k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
s_ = L._soll(0.0, -0.5, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.0)
k.fut = 20000.0                                   # Futures-Guthaben (kein Zwangsverkauf durch den Kurssprung)
bew = [False, False]


def hk_f2b(m, pfad, p_, code):
    if m == "POST" and pfad == "/fapi/v1/algoOrder" and code == 400:
        bew[0] = True                                  # der erste Stop (über der Position) ist abgelehnt (−2022)
    elif m == "GET" and pfad == "/fapi/v2/positionRisk" and bew[0] and not bew[1]:
        bew[1] = True                                  # die frische Position ist gelesen → JETZT springt der Kurs über Stop- und Not-Stop-Kurs
        B.bewegen("BTCUSDT", 118000.0)


B.reduce_algo_streng = True
B.nach_jeder_anfrage = hk_f2b
try:
    L._perp_ohne_liste(fu, "BTC", dd, {}, {"stop_short": 115000.0}, s_, _W.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, _g_lesen(sp, fu, dd))
finally:
    B.reduce_algo_streng = False
    B.nach_jeder_anfrage = None
g = lage(k, "BTCUSDT")
pruefe("14.F2b Rückfall-Stop würde sofort auslösen (Kurs zwischen Lesen und Setzen gesprungen) → der Short ist zum Markt zurückgekauft", bew[1] and abs(g["pos"]) < 0.002, (bew, g))

# F3b (R14-M22): Spot-Liste unlesbar, der Kurs ist seit dem Lesen unter Stop- und Not-Stop-Kurs gefallen → die Coins sind zum Markt verkauft
k, sp, fu, dd = handlage(coins=0.5, short=0.0, kurs=100000.0)
s_ = L._soll(0.5, 0.0, 100000.0, dd)
s_.update(frei=0.5, gebunden=0.0)
B.bewegen("BTCUSDT", 80000.0)
L._spot_ohne_liste(sp, "BTC", dd, {}, {"stop_long": 90000.0}, s_, _W.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, _g_lesen(sp, fu, dd))
g = lage(k, "BTCUSDT")
pruefe("14.F3b Spot-Liste unlesbar, Kurs unter Stop- und Not-Stop-Kurs gefallen → die Coins sind zum Markt verkauft", g["coins"] < 0.01, g)

# K1b (R14-M26): der aktuelle Stop steht NICHT zugleich im Gedächtnis (perp_weitere) des zusammengeführten Buchs
basis_ = {"stops": {"BTC": {"perp": 1, "perp_cid": "A"}}}
platte_ = {"stops": {"BTC": {"perp": 2, "perp_cid": "B"}}}
meins_ = {"stops": {"BTC": {"perp": 1, "perp_cid": "A", "perp_weitere": [[2, "B"]]}}}
neu_ = L._buch_vereinen(platte_, meins_, basis_)
st_ = neu_["stops"]["BTC"]
pruefe("14.K1b Buch zusammenführen: der gewählte aktuelle Perp-Stop steht nicht auch im Gedächtnis der alten",
       (st_["perp"], st_["perp_cid"]) == (2, "B") and not any(tuple((list(w) + [None, None])[:2]) == (2, "B") for w in st_.get("perp_weitere") or []), st_)

# K5b (R14-M34/M35): Buch weg, Schalter zeigen auf Testnetz, aber PILOT2_*-Schlüssel (echt) sind gesetzt → der Not-Aus sieht das ECHTE Konto mit dessen
# eigener Verbindung an (nicht mit der übergebenen Testnetz-Verbindung) und meldet, was er dort findet
k_echt = neues_konto(20000, uid=4711, keys=("k",))
kt = B.konto_anlegen(("s", "f"), P.GEHEIM, 4712, 20000.0)
kt.fut = 20000.0
d = neu_buch()
env_t = env_test(KRYPTO_PILOT2="an")
env_e = env_echt(kapital=20000)
lauf([E("BTC", 0.5)], env_e, d)                       # echt startet und handelt
env_jetzt = dict(env_t, **{k_: v for k_, v in env_e.items() if k_.startswith("PILOT2_")})
Path(d).unlink()                                      # das Buch ist weg
cfg_t = L.einstellungen(env_t)
r = L.notaus_alle(env_jetzt, d, spot=L.Spot(cfg_t["spot"]), fut=L.Fut(cfg_t["futures"]))
pruefe("14.K5b Buch weg, Schalter Testnetz: der Not-Aus sieht das ECHTE Konto mit dessen eigener Verbindung an und meldet den Bestand (nicht «nichts offen»)",
       r["alles_zu"] is False and any("Pilot-Konto zeigt" in z and "Futures BTCUSDT" in z and " BTC," in z for z in r["zeilen"]), r)

# E2c (R14-M44): ein sichtbarer Stop passt genau zur Netto-Richtung, daneben sperrt ein nicht gelisteter Stop weitere Coins → der «passt»-Kurzschluss gilt nicht:
# danach ist nicht mehr gesperrt als nötig (oder der Markt beidseitig)
k, sp, fu, dd = handlage(coins=0.5, short=0.2, kurs=100000.0)           # netto 0,3
oid_a = eigener_spot_stop(sp, dd, 0.3, 85000.0)["orderId"]              # passt genau (Kurs wie e["stop_long"])
oid_b = eigener_spot_stop(sp, dd, 0.1, 80000.0)["orderId"]
k.orders[oid_b]["sichtbar_ab"] = B.n_listen + 10 ** 6
s_ = L._soll(0.5, -0.2, 100000.0, dd)
s_.update(frei=0.1, gebunden=0.4)
sch_ = []
L._spot_abgleich(sp, "BTC", dd, {"spot": oid_a}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], sch_, _g_lesen(sp, fu, dd), False)
g = lage(k, "BTCUSDT")
pruefe("14.E2c ein passender sichtbarer Stop + ein nicht gelisteter: nicht mehr gesperrt als die Netto-Richtung — oder beidseitig (kein «Stop bleibt»)",
       (g["s_qty"] <= 0.3 + 0.002 or dd.get("beidseitig") is True) and not any("bleibt" in z for z in sch_), (g, dd.get("beidseitig"), sch_))

# E2d (R14-M45): zwei sichtbare Stops zusammen genau die Netto-Richtung MINUS des nicht gelisteten → «Stops bleiben» (nichts ändern); ohne den versteckten
# Anteil in der Summe fiele der Kurzschluss weg und der Abgleich bastelte an den Stops herum
k, sp, fu, dd = handlage(coins=0.5, short=0.2, kurs=100000.0)           # netto 0,3
oid_1 = eigener_spot_stop(sp, dd, 0.1, 85000.0)["orderId"]
oid_2 = eigener_spot_stop(sp, dd, 0.1, 85000.0)["orderId"]
oid_3 = eigener_spot_stop(sp, dd, 0.1, 80000.0)["orderId"]
k.orders[oid_3]["sichtbar_ab"] = B.n_listen + 10 ** 6
s_ = L._soll(0.5, -0.2, 100000.0, dd)
s_.update(frei=0.2, gebunden=0.3)
sch_ = []
n0_ = len(B.log)
L._spot_abgleich(sp, "BTC", dd, {}, {"stop_long": 85000.0}, s_, {"auftraege": []}, _W.append, [], sch_, _g_lesen(sp, fu, dd), False)
aend_ = [x for x in B.log[n0_:] if x[1] in ("POST", "DELETE") and x[2] in ("/api/v3/order", "/api/v3/order/cancelReplace")]
pruefe("14.E2d zwei sichtbare Stops + ein nicht gelisteter decken zusammen genau die Netto-Richtung → «Stops bleiben», keine Änderung",
       any("bleiben" in z for z in sch_) and not aend_, (sch_, len(aend_)))

# E3-Spot (R14-M46): Not-Aus-Schutz mit VERALTETEN Zahlen — ein eigener Spot-Stop über die Absicherung hinaus wird NICHT verkleinert (er könnte der einzige Schutz sein);
# mit frischen Zahlen schon
for frisch_ in (False, True):
    k, sp, fu, dd = handlage(coins=0.424, short=0.2, kurs=100000.0)       # netto 0,224
    eigener_spot_stop(sp, dd, 0.424, 80000.0)                              # über alle Coins (0,2 davon sind Absicherung)
    w_ = []
    L._notaus_schutz(sp, fu, {}, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, 0.0, 0.424, 100000.0, dd["rs"], w_.append, "testnetz", None,
                     buch={}, erg={"zeilen": [], "auftraege": []}, stand_frisch=frisch_)
    g = lage(k, "BTCUSDT")
    print("E3-Spot", frisch_, g["s_qty"], g["p_qty"])
    if frisch_:
        pruefe("14.E3-Spot FRISCHE Zahlen: der zu grosse Spot-Stop wird auf die Netto-Richtung verkleinert (die Unterscheidung wirkt)", g["s_qty"] < 0.424 - 0.002, g)
    else:
        pruefe("14.E3-Spot VERALTETE Zahlen: der Spot-Stop bleibt unangetastet, der Short bekommt seinen Stop über die ganze Menge",
               abs(g["s_qty"] - 0.424) < 0.002 and g["p_qty"] >= 0.2 - 0.002, g)

# E3-Perp (R14-M47): dasselbe für den Perp-Stop — ein zu grosser eigener Perp-Stop wird auf veralteten Zahlen NICHT ersetzt; mit frischen schon
for frisch_ in (False, True):
    k, sp, fu, dd = handlage(coins=0.3, short=0.424, kurs=100000.0)       # ungesichert 0,124
    fu.stop_menge("BTCUSDT", "BUY", 0.424, 120000.0, dd["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    w_ = []
    L._notaus_schutz(sp, fu, {}, "BTC", "BTCUSDT", "BTC", -0.424, -0.424, 0.3, 0.0, 100000.0, dd["rs"], w_.append, "testnetz", None,
                     buch={}, erg={"zeilen": [], "auftraege": []}, stand_frisch=frisch_)
    g = lage(k, "BTCUSDT")
    print("E3-Perp", frisch_, g["s_qty"], g["p_qty"])
    if frisch_:
        pruefe("14.E3-Perp FRISCHE Zahlen: der zu grosse Perp-Stop wird auf den ungesicherten Rest ersetzt", g["p_qty"] < 0.424 - 0.002, g)
    else:
        pruefe("14.E3-Perp VERALTETE Zahlen: der Perp-Stop über den ganzen Short bleibt stehen (er könnte der einzige Schutz sein)", abs(g["p_qty"] - 0.424) < 0.002, g)

# 14.D7 (R14-M27/M28): K2 (die unklaren Aufträge werden in JEDER Abgleich-Runde frisch gelesen) wird seit E2 von der Kontoprobe verdeckt (mehr gesperrt als der
# Spot-Stop braucht → beidseitig) → dasselbe Szenario wie 14.K2 mit abgeschalteter Kontoprobe: K2 allein muss den Markt beidseitig sichern
_kp_alt = L._kontoprobe
L._kontoprobe = lambda *a_, **kw_: None
try:
    for was14, kw14 in (("Spot-Verkauf unklar", dict(konto="spot", seite="SELL", reduce=False)),
                        ("Rückkauf unklar", dict(konto="perp", seite="BUY", reduce=True))):
        k = neues_konto(20000)
        d = neu_buch()
        lauf([E("BTC", 0.0)], env_echt(), d)          # das Paar steht (Ernte)
        fremd14 = [True]

        def h14d7(m, pfad, p_, code, fremd14=fremd14, kw14=kw14, d=d, k=k):
            if fremd14[0] and m == "POST" and pfad == "/api/v3/order" and str(p_.get("type", "")).startswith("STOP") and code == 200:
                fremd14[0] = False
                b_ = L.buch_lesen(d, "echt")
                b_["unklar"] = (b_.get("unklar") or []) + [L.unklar_eintrag("BTC", "BTCUSDT", kw14["konto"], kw14["seite"], 0.01, kw14["reduce"])]
                L.buch_schreiben(d, "echt", b_)
                with B.lock:
                    k.frei["BTC"] -= 0.01
                    k.frei["USDT"] += 0.01 * B.kurs["BTCUSDT"]
        B.nach_jeder_anfrage = h14d7
        try:
            r = lauf([E("BTC", 0.5)], env_echt(), d)
        finally:
            B.nach_jeder_anfrage = None
        g = lage(k, "BTCUSDT")
        pruefe(f"14.D7 (K2 allein, ohne Kontoprobe) fremder unklarer Auftrag ({was14}) landet mitten im Abgleich: die nächste Runde sichert den Markt beidseitig",
               not fremd14[0] and not befunde(k, d) and g["s_qty"] > 0, (fremd14, befunde(k, d), g))
finally:
    L._kontoprobe = _kp_alt


# ── Folge-PR zur 14. Runde: E8 (Zusatzkampagne, Lauf-Seed 50802) ──
# 14.E8 (Folge-PR, Zusatzkampagne, Lauf-Seed 50802): der Not-Aus (und der Tageslauf) liest die Lage VOR dem Handeln (UID, Position, Konto, Regeln) mit dem
# langen Budget (SCHUTZ_WARTEN = 5 Versuche). Mit dem kurzen (3 Versuche) gab er nach drei Fehlversuchen in Folge auf («NICHTS angefasst») — eine eben
# gekaufte Position blieb ohne Stop bis zur Nachkontrolle. Jede Lesestelle einzeln: vier Fehlversuche in Folge (mehr als kurz, weniger als lang) → er liest weiter.
FAELLE_E8 = (("UID-Lesen im Not-Aus", "GET", "/api/v3/account", 0),
             ("Konto-Lesen der Lage im Not-Aus (nach dem UID-Lesen)", "GET", "/api/v3/account", 1),
             ("Position im Not-Aus", "GET", "/fapi/v2/positionRisk", 0),
             ("Spot-Regeln (exchangeInfo) im Not-Aus", "GET", "/api/v3/exchangeInfo", 0),
             ("Futures-Regeln (exchangeInfo) im Not-Aus", "GET", "/fapi/v1/exchangeInfo", 0))
for name_, methode_, pfad_, ab_ in FAELLE_E8:
    k = neues_konto(20000)
    d = neu_buch()
    env_ = env_echt(kapital=20000)
    lauf([E("ETH", 0.0)], env_, d)                     # Ernte-Paar (Coins + Short)
    with B.lock:                                       # dazu eben gekaufte Coins OHNE Stop (STOP kam mitten im Lauf)
        k.frei["ETH"] += 0.05
        k.frei["USDT"] -= 0.05 * B.kurs["ETHUSDT"]
    n_e8 = [0]

    def pred_(m, pfad, q, n_=n_e8, ab_=ab_, pfad_=pfad_):
        if m == "GET" and pfad == pfad_:
            n_[0] += 1
            return n_[0] > ab_
        return False
    B.regeln = [regel(methode=methode_, pfad=pfad_, pred=pred_, art="vor503", anzahl=4)]
    try:
        r = lauf([], env_, d, notaus=True)
    finally:
        B.regeln = []
    pruefe(f"14.E8 Not-Aus, {name_}: vier Fehlversuche in Folge — er liest weiter und schliesst alles",
           r.get("alles_zu") is True and P.flach(k), (r.get("alles_zu"), r["zeilen"][-3:], P.zeigen(k)))

# Nachkontrolle: das UID-Lesen am Anfang schlägt vier Mal in Folge fehl → sie gibt NICHT auf («nichts angefasst», Ende der ganzen Nachkontrolle), sondern setzt den fehlenden Stop
k = neues_konto(20000)
d = neu_buch()
env_ = env_echt(kapital=20000)
lauf([E("ETH", 0.5)], env_, d)                          # Long ETH mit Spot-Stop
cfg_ = L.einstellungen(env_)
sp_ = L.Spot(cfg_["spot"])
for o_ in sp_.eigene_stops("ETHUSDT"):                  # der Stop ist weg (z. B. nie angekommen)
    sp_.abbrechen("ETHUSDT", o_["orderId"])
b_ = L.buch_lesen(d, "echt")
b_["schutz_offen"] = ["ETH"]
L.buch_schreiben(d, "echt", b_)
B.regeln = [regel(methode="GET", pfad="/api/v3/account", art="vor503", anzahl=4)]
try:
    r = P.nachkontrolle(env_, d)
finally:
    B.regeln = []
g = lage(k, "ETHUSDT")
pruefe("14.E8 Nachkontrolle: das UID-Lesen schlägt vier Mal in Folge fehl — sie gibt nicht auf und setzt den fehlenden Spot-Stop", g["n_s"] >= 1, (g, r["zeilen"][-3:]))


# 14.E9 (Folge-PR, Zusatzkampagne, Lauf-Seed 51170, älter als die 14. Runde): Vorab verkleinert den Perp-Stop NICHT, solange die Spot-Stops zu gross sind (z. B. eben noch
# beidseitig gesichert): der Perp-Stop ist ihr Rückhalt. Verkleinerte er trotzdem und könnte der Abgleich danach nicht lesen, bliebe die Folge der zu grossen Spot-Stops ungedeckt.
for was9, spot_stop9, erwartet9, geaendert9 in (("Spot-Stop über alle Coins (zu gross, netto short)", 0.4, 1.2, False),
                                                  ("kein Spot-Stop", 0.0, 1.1, True)):
    k = neues_konto(400000)
    cfg = L.einstellungen(env_echt(kapital=400000))
    spot, fut = L.Spot(cfg["spot"]), L.Fut(cfg["futures"])
    sym = "BTCUSDT"
    k.frei["BTC"] = 0.5
    k.buchen(sym, -1.6, B.kurs[sym])                    # netto short 1,1 → Spot-Stop nicht nötig, Perp-Stop 1,1 nötig
    d = {"sym": sym, "coin": "BTC", "kurs": B.kurs[sym], "rs": spot.regeln2(sym), "rf": fut.regeln(sym)}
    fut.stop_menge(sym, "BUY", 1.2, 110000.0, d["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    if spot_stop9:
        spot.stop_verkauf(sym, spot_stop9, 80000.0, d["rs"], cid=L._kennung(L.CID_STOP_SPOT))
    geaendert = L._stops_vorab(spot, fut, L.leer_buch(), "BTC", d, {"info": {"spot_ziel": 2.5, "perp_ziel": -3.0}, "schritte": []})
    g = lage(k, sym)
    pruefe(f"14.E9 Vorab, {was9}: Perp-Stop {erwartet9:g} ({'unverändert, bis der Abgleich die Spot-Stops korrigiert' if not geaendert9 else 'wie bisher verkleinert'})",
           bool(geaendert) == geaendert9 and g["n_p"] == 1 and abs(g["p_qty"] - erwartet9) < 1e-9, (geaendert, g))

# 14.E8/E9 (Folge-PR, Zusatzkampagne im Standardmodus; beide älter als die 14. Runde, am Stand vor ihr ebenso ein Befund): Lauf-Seed 50802 = E8 (Not-Aus liest die
# Lage mit dem kurzen Budget), Lauf-Seed 51170 = E9 (Vorab verkleinert den Perp-Stop trotz zu grosser Spot-Stops, danach ist das Konto dauerhaft unlesbar)
for seed14e9, was14e9 in ((50802, "E8: STOP mitten im Lauf, Konto drei Mal nicht lesbar = genau das kurze Budget"),
                          (51170, "E9: Vorab-Verkleinerung neben zu grossen Spot-Stops, Konto danach dauerhaft unlesbar")):
    funde = P.echte(P.laeufe_runde(seed14e9, 30))
    pruefe(f"14.E8/E9 Lauf-Seed {seed14e9} ({was14e9}): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])

# 14.E10 (Folge-PR, Zusatzkampagne, Lauf-Seed 51587, älter als die 14. Runde): ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs (Kurslücke, er schützt nichts) und
# der Ausstieg per cancelReplace (Stop → Marktverkauf) bleibt unklar (503 vor der Verarbeitung) — drei Runden, drei Fehlversuche. Vorher gab es nur bei «abgelehnt» einen
# Rückfall (Not-Stop an seine Stelle), bei «unklar» nicht: der Long stand ohne wirksamen Stop da (279 USDT im Fuzzer, 8445/16898 USDT im Szenario), und die Coins des
# hängenden Auftrags galten als «Stop ausserhalb der Liste». Jetzt kommt auch nach «unklar» zum Schluss ein Not-Stop; geht cancelReplace dauerhaft nicht, wird der hängende
# (schützt ohnehin nichts) normal gelöscht und ein Not-Stop aus den freien Coins gesetzt.
for name10, anzahl10, text10 in (("dreimal", 3, "statt des hängenden Stop-Limits"), ("dauerhaft", 10 ** 6, "statt des gelöschten hängenden Stop-Limits")):
    for hebel10 in (0.5, 1.0):
        k = neues_konto(20000)
        B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
        d = neu_buch()
        e = E("BTC", hebel10)
        e["stop_long"] = 90000.0
        lauf([e], env_echt(), d)
        B.bewegen("BTCUSDT", 85000.0)                  # Lücke unter das Limit (85500): der ausgelöste STOP_LOSS_LIMIT hängt
        B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=anzahl10)]
        try:
            r = lauf([e], env_echt(), d)
        finally:
            B.regeln = []
        g10 = lage(k, "BTCUSDT")
        flach10 = abs(g10["netto"]) * g10["kurs"] < 50  # netto flach: beim Hebel 1,0 gelingt der Verkauf in der 4. Runde (nur «dreimal»), beim Hebel 0,5 verkauft er nur die Netto-Richtung (16. Prüfung H5: die Absicherung bleibt)
        pruefe(f"14.E10 hängender Stop-Limit, cancelReplace {name10} unklar (Hebel {hebel10}): ein Not-Stop unter dem Kurs schützt den Long",
               not befunde(k, d) and not P._haengend(k, "BTCUSDT") and (g10["s_qty"] > 0 or (flach10 and name10 == "dreimal"))
               and (flach10 or any(text10 in z for z in r["zeilen"])),
               (befunde(k, d), P.zeigen(k)["BTCUSDT"], r["zeilen"][-4:]))
funde = P.echte(P.laeufe_runde(51587, 30))
pruefe("14.E10 Lauf-Seed 51587: keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])


def haengend14(coins=0.3, menge=0.1, daneben=0.0):
    """Hand-Konto: `menge` Coins unter einem ausgelösten, über dem Kurs hängenden STOP_LOSS_LIMIT (+ optional ein wirksamer Stop darüber hinaus), der Rest frei.
    → (Konto, Spot, Futures, d, hängender Auftrag, lesen)."""
    k_, sp_, fu_, d_ = handlage(coins=coins, kurs=100000.0)
    B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]  # Konto ohne STOP_LOSS: der Stop ist ein STOP_LOSS_LIMIT (kann hängen)
    d_["rs"] = sp_.regeln2("BTCUSDT")
    eigener_spot_stop(sp_, d_, menge, 90000.0)
    if daneben:
        eigener_spot_stop(sp_, d_, daneben, 80000.0)
    B.bewegen("BTCUSDT", 85000.0)
    d_["kurs"] = 85000.0
    o_ = next(o for o in sp_.eigene_stops("BTCUSDT") if o.get("isWorking") is True)
    return k_, sp_, fu_, d_, o_, (lambda warten=None: L._lage(sp_, fu_, d_, warten))


def loeschen14(o_, k_, sp_, d_, lesen_, m_=0.1, st_=None):
    """_haengenden_loeschen mit Buch-Eintrag st_ → (Ergebnis, st_, Meldungen, gesetzt)."""
    st_ = {"spot": o_["orderId"]} if st_ is None else st_
    warn_, gesetzt_ = [], []
    return L._haengenden_loeschen(sp_, "BTC", d_, st_, o_, m_, warn_.append, gesetzt_, lesen_), st_, warn_, gesetzt_


# Einheit: nur die `m` Coins des hängenden Auftrags bekommen den Not-Stop, nicht die übrigen freien (Absicherung), und der Buch-Eintrag zeigt auf den neuen Stop
k, sp_, fu_, d_, o_, lesen_ = haengend14(coins=0.3, menge=0.1)
ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)
g14 = lage(k, "BTCUSDT")
pruefe("14.E10 Löschen: nur die Coins des hängenden Stops bekommen den Not-Stop (0,1 von 0,3), der hängende ist weg, das Buch zeigt auf den neuen",
       ok_ is True and not P._haengend(k, "BTCUSDT") and g14["n_s"] == 1 and abs(g14["s_qty"] - 0.1) < 1e-9
       and st_["spot"] != o_["orderId"] and st_["spot"] is not None and g_ and w_, (ok_, g14, st_, w_, g_))
# Löschen scheitert dauerhaft: der hängende bleibt, nichts Neues, kein Absturz → False (die Nachkontrolle versucht es nochmals)
k, sp_, fu_, d_, o_, lesen_ = haengend14()
B.regeln = [regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=10 ** 6)]
try:
    ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)
finally:
    B.regeln = []
g14 = lage(k, "BTCUSDT")
pruefe("14.E10 Löschen scheitert: der hängende bleibt, kein neuer Stop, Ergebnis False", ok_ is False and P._haengend(k, "BTCUSDT") > 0 and g14["n_s"] == 0
       and st_["spot"] == o_["orderId"], (ok_, g14, st_))
# das Löschen darf 4 Fehlversuche in Folge überstehen (langes Budget SCHUTZ_WARTEN = 5 Versuche)
k, sp_, fu_, d_, o_, lesen_ = haengend14()
B.regeln = [regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=4)]
try:
    ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)
finally:
    B.regeln = []
pruefe("14.E10 Löschen: vier Fehlversuche in Folge — er löscht trotzdem und setzt den Not-Stop", ok_ is True and not P._haengend(k, "BTCUSDT") and lage(k, "BTCUSDT")["n_s"] == 1,
       (ok_, lage(k, "BTCUSDT")))
# Not-Stop setzen scheitert dauerhaft: der hängende ist gelöscht (er schützte nichts), die Coins sind frei — Ergebnis False, das Buch zeigt nicht mehr auf den gelöschten
k, sp_, fu_, d_, o_, lesen_ = haengend14()
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="vor503", anzahl=10 ** 6)]
try:
    ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)
finally:
    B.regeln = []
pruefe("14.E10 Löschen: der Not-Stop wird abgelehnt — False, der gelöschte steht nicht mehr im Buch", ok_ is False and not P._haengend(k, "BTCUSDT") and lage(k, "BTCUSDT")["n_s"] == 0
       and st_["spot"] is None, (ok_, lage(k, "BTCUSDT"), st_))
# vier Fehlversuche beim Setzen des Not-Stops (langes Budget): er steht trotzdem
k, sp_, fu_, d_, o_, lesen_ = haengend14()
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="vor503", anzahl=4)]
try:
    ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)
finally:
    B.regeln = []
pruefe("14.E10 Löschen: vier Fehlversuche beim Not-Stop — er steht trotzdem, zum ersten Preis (5 % unter dem Kurs): das lange Budget gilt für jeden Preis",
       ok_ is True and lage(k, "BTCUSDT")["n_s"] == 1 and abs(lage(k, "BTCUSDT")["s_preise"][0] - 85000.0 * (1 - L.NOT_STOP_ABSTAND)) < 1.0,
       (ok_, lage(k, "BTCUSDT")))
# das frische Lesen nach dem Löschen darf 4 Fehlversuche in Folge überstehen
k, sp_, fu_, d_, o_, lesen_ = haengend14()
geloescht14 = [False]


def nach14(m_, pfad_, p_, code_):
    if m_ == "DELETE" and pfad_ == "/api/v3/order" and code_ == 200:
        geloescht14[0] = True


B.nach_jeder_anfrage = nach14
B.regeln = [regel(methode="GET", pfad="/api/v3/account", pred=lambda m_, pf_, q_: geloescht14[0], art="vor503", anzahl=4)]
try:
    ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)
finally:
    B.regeln = []
    B.nach_jeder_anfrage = None
pruefe("14.E10 Löschen: das Lesen danach scheitert vier Mal in Folge — es liest weiter und setzt den Not-Stop", ok_ is True and lage(k, "BTCUSDT")["n_s"] == 1, (ok_, lage(k, "BTCUSDT")))
# kam das Ersetzen doch an (Antwort verloren), ist der hängende schon weg (−2011) und der Ersatz-Stop sperrt seine Coins: True, KEIN zweiter Stop — die freien Coins daneben
# (0,1) sind die Absicherung eines Shorts und bekommen nie einen Stop aus diesem Rückfall
k, sp_, fu_, d_, o_, lesen_ = haengend14(coins=0.2, menge=0.1)
res_, _info_ = sp_.ersetzen("BTCUSDT", o_["orderId"], sp_.stop_params("BTCUSDT", 0.1, 80750.0, d_["rs"], L._kennung(L.CID_STOP_SPOT)))   # das Ersetzen kam an …
ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_)                                                                                   # … die Antwort ging verloren
g14 = lage(k, "BTCUSDT")
pruefe("14.E10 Löschen: der hängende ist schon weg (Ersetzen kam an) — True, kein zweiter Stop über die freien Coins daneben",
       res_ == "ok" and ok_ is True and g14["n_s"] == 1 and abs(g14["s_qty"] - 0.1) < 1e-9 and not g_, (res_, ok_, g14, g_))
pruefe("14.E10 Spot.abbrechen meldet, ob etwas storniert wurde: True beim Storno, False bei «Unknown order» (−2011)",
       sp_.abbrechen("BTCUSDT", o_["orderId"]) is False
       and sp_.abbrechen("BTCUSDT", next(o for o in sp_.eigene_stops("BTCUSDT"))["orderId"]) is True)
# nichts zu schützen (die Menge des hängenden ist Staub unter dem Binance-Minimum): gelöscht, KEIN neuer Stop, Ergebnis True (kein falscher Alarm «OHNE Stop»)
k, sp_, fu_, d_, o_, lesen_ = haengend14()
ok_, st_, w_, g_ = loeschen14(o_, k, sp_, d_, lesen_, m_=0.00001)
pruefe("14.E10 Löschen: Staub-Menge (unter dem Binance-Minimum) — True und kein neuer Stop", ok_ is True and lage(k, "BTCUSDT")["n_s"] == 0 and not g_ and not P._haengend(k, "BTCUSDT"),
       (ok_, lage(k, "BTCUSDT"), g_))
# _haengenden_ersetzen: Binance kennt cancelReplace nicht (404, «fehlt») → derselbe Rückfall (normal löschen, Not-Stop aus den freien Coins), nicht «nichts getan»
k, sp_, fu_, d_, o_, lesen_ = haengend14()
B.ersetzen_fehlt = True
try:
    st_, w_, g_ = {"spot": o_["orderId"]}, [], []
    ok_ = L._haengenden_ersetzen(sp_, "BTC", d_, st_, o_, 0.1, 85000.0, w_.append, g_, lesen_)
finally:
    B.ersetzen_fehlt = False
pruefe("14.E10 _haengenden_ersetzen: cancelReplace unbekannt (404) — der hängende wird normal gelöscht und der Not-Stop steht",
       ok_ is True and not P._haengend(k, "BTCUSDT") and lage(k, "BTCUSDT")["n_s"] == 1 and abs(lage(k, "BTCUSDT")["s_qty"] - 0.1) < 1e-9,
       (ok_, lage(k, "BTCUSDT"), g_))
# das Löschen eines hängenden Stop-Limits ist kein «selbst entfernter Schutz» (Prüf-Werkzeug): die Gegenprobe — das Löschen eines WIRKSAMEN Stops zählt
k, sp_, fu_, d_, o_, lesen_ = haengend14(coins=0.3, menge=0.1, daneben=0.1)
n0_ = len(B.log)
sp_.abbrechen("BTCUSDT", o_["orderId"])
pruefe("14.E10 Prüf-Werkzeug: das Löschen eines hängenden Stop-Limits zählt nicht als «Pilot 2.0 hat einen Stop selbst entfernt»", not P._selbst_entfernt(n0_, "BTCUSDT", "LONG_OHNE_STOP"))
wirksam_ = next(o for o in sp_.eigene_stops("BTCUSDT") if o.get("isWorking") is not True)
n0_ = len(B.log)
sp_.abbrechen("BTCUSDT", wirksam_["orderId"])
pruefe("14.E10 Prüf-Werkzeug Gegenprobe: das Löschen eines wirksamen Stops zählt", P._selbst_entfernt(n0_, "BTCUSDT", "LONG_OHNE_STOP"))

# 14.E10 (strenger Lauf-Seed 60471): derselbe hängende Stop-Limit, den Pilot 2.0 nicht gesehen hat (die Spot-Liste war nicht lesbar), erzeugt AUCH «Perp-Stop über Netto»
# (löste der Perp-Stop aus, stünden die Coins ohne wirksamen Spot-Stop da) — dieselbe bekannte Limit-Lücke, vorher nur bei LONG_OHNE_STOP so eingestuft. Gegenprobe: hat er die
# Liste nach dem Sprung gelesen, sind beide echte Befunde.
k, sp_, fu_, d_ = handlage(coins=0.3, short=0.1, kurs=100000.0)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d_["rs"] = sp_.regeln2("BTCUSDT")
eigener_spot_stop(sp_, d_, 0.3, 90000.0)
fu_.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, d_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
B.bewegen("BTCUSDT", 85000.0)
vor10 = sorted(b[0] for b in P.schutz_befunde(k))
sp_.eigene_stops("BTCUSDT")                          # jetzt hat Pilot 2.0 die Liste mit dem hängenden Stop gesehen
nach10 = sorted(b[0] for b in P.schutz_befunde(k))
pruefe("14.E10 Prüf-Werkzeug: ein ungesehener hängender Stop-Limit ist Limit-Lücke — auch beim «Perp-Stop über Netto»; nach dem Blick in die Liste sind beide echte Befunde",
       vor10 == ["LIMIT_LUECKE_LONG_OHNE_STOP", "LIMIT_LUECKE_PERP_STOP_UEBER_NETTO"] and nach10 == ["LONG_OHNE_STOP", "PERP_STOP_UEBER_NETTO"], (vor10, nach10))
P.STRENG = True
try:
    funde = P.echte(P.laeufe_runde(60471, 30))
finally:
    P.STRENG = False
    B.reduce_algo_streng = False
pruefe("14.E10 strenger Lauf-Seed 60471 (Not-Aus bei Spot-Liste dauerhaft unlesbar + Kurslücke): keine Befunde", not funde,
       [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])

# 14.E11 (Folge-PR, Not-Aus-Zusatzkampagne, Seed 30189): ohne Buch sieht der Not-Aus das Pilot-Konto nur an. Ein Rest, den Binance nicht verkauft (auf die Schrittweite
# abgerundet unter dem Mindestbetrag: hier 4,995e-05 BTC = 5,006 USDT roh, abgerundet 4,0), ist Staub und kein «das Buch kennt es nicht» — wie beim Schliessen entscheidet
# der verkaufbare Teil. Vorher meldete jeder weitere Not-Aus «NICHT alles zu» wegen eines unverkäuflichen Rests.
k_, sp_, fu_, d_ = handlage(coins=4.995e-05, kurs=100221.44)
r_ = lauf([], env_echt(), neu_buch(), notaus=True)
pruefe("14.E11 Not-Aus ohne Buch: Rest 4,995e-05 BTC (roh 5,006 USDT, abgerundet 4,0 — unverkäuflich) ist Staub", r_["alles_zu"] is True
       and not any("Buch kennt es nicht" in z for z in r_["zeilen"]), r_["zeilen"])
k_, sp_, fu_, d_ = handlage(coins=1.5e-04, kurs=100221.44)
r_ = lauf([], env_echt(), neu_buch(), notaus=True)
pruefe("14.E11 Gegenprobe: 1,5e-04 BTC (15 USDT, verkäuflich) ohne Buch werden gemeldet, nichts blind verkauft",
       r_["alles_zu"] is False and any("Buch kennt es nicht" in z for z in r_["zeilen"]) and abs(k_.frei["BTC"] - 1.5e-04) < 1e-12, (r_["zeilen"], k_.frei["BTC"]))
k_, sp_, fu_, d_ = handlage(coins=5.5e-05, kurs=100221.44)
r_ = lauf([], env_echt(), neu_buch(), notaus=True)
pruefe("14.E11 Grenze: 5,5e-05 BTC (roh 5,5 USDT, abgerundet 5,0 = der Mindestbetrag) sind verkäuflich und werden gemeldet",
       r_["alles_zu"] is False and any("Buch kennt es nicht" in z for z in r_["zeilen"]), r_["zeilen"])
funde = P.echte(P.notaus_runde(30189))
pruefe("14.E11 Not-Aus-Seed 30189: keine Befunde", not funde, [(f_[0], f_[1].get("wann")) for f_ in funde][:4])

# 14.E12 (Folge-PR, Lücken-Kampagne PRUEF_LUECKEN=1, Lauf-Seed 90256): STOP kommt mitten im Lauf, NACHDEM ein neuer Short geschickt wurde (sein Stop kommt erst im Abgleich am Laufende),
# und das Konto ist dauerhaft nicht lesbar: der Not-Aus des Laufs liest die UID nicht («NICHTS angefasst»). Wird STOP wieder aufgehoben, schützte die Nachkontrolle den neuen Short nicht
# (schutz_offen war leer): 300 USDT Short ohne Stop. Jetzt trägt der unterbrochene Lauf die Märkte, in denen er gehandelt hat, in schutz_offen ein.
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", -0.25)], env_echt(), d)                                 # ein Short mit seinem Perp-Stop
g0_ = lage(k, "ETHUSDT")
gemacht_ = [0]


def haken_(m_, pfad_, p_, code_):
    if m_ == "POST" and pfad_ == "/fapi/v1/order" and code_ == 200 and not gemacht_[0]:
        gemacht_[0] = 1
        L.BF.STOP_DATEI.write_text("")                                  # STOP genau nach dem neuen Short …
        B.regeln.append(regel(methode="GET", pfad="/api/v3/account", art="vor503", anzahl=10 ** 6))   # … und das Konto ist ab jetzt nicht mehr lesbar


B.nach_jeder_anfrage = haken_
try:
    r_ = lauf([E("ETH", -1.0)], env_echt(), d)
finally:
    B.nach_jeder_anfrage = None
    B.regeln = []
    if L.BF.STOP_DATEI.exists():
        L.BF.STOP_DATEI.unlink()                                         # STOP wieder aufgehoben
g1_ = lage(k, "ETHUSDT")
vorher_ = befunde(k, d)
rn_ = P.nachkontrolle(env_echt(), d)
nachher_ = befunde(k, d)
pruefe("14.E12 STOP mitten im Lauf nach dem neuen Short, Konto unlesbar (Not-Aus 'NICHTS angefasst'): die Nachkontrolle setzt den fehlenden Perp-Stop",
       gemacht_[0] == 1 and g1_["pos"] < g0_["pos"] - 1e-9 and any("NICHTS angefasst" in z for z in r_["zeilen"]) and not nachher_
       and lage(k, "ETHUSDT")["p_qty"] >= -lage(k, "ETHUSDT")["pos"] - 1e-9,
       (gemacht_, g0_, g1_, r_["zeilen"][-3:], vorher_, nachher_, rn_["zeilen"][-3:], lage(k, "ETHUSDT")))
# Gegenprobe: ein normaler Lauf hinterlässt keinen Vermerk (der Abgleich am Laufende streicht ihn bzw. er wird gar nicht erst gesetzt)
k = neues_konto(20000)
d = neu_buch()
lauf([E("ETH", -0.25)], env_echt(), d)
pruefe("14.E12 Gegenprobe: nach einem normalen Lauf steht kein Vermerk", not (L.buch_lesen(d, "echt") or {}).get("schutz_offen"),
       (L.buch_lesen(d, "echt") or {}).get("schutz_offen"))
P.LUECKEN = True
try:
    funde = P.echte(P.laeufe_runde(90256, 30))
finally:
    P.LUECKEN = False
pruefe("14.E12 Lücken-Lauf-Seed 90256: keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])

# 14.E13 (Folge-PR, Lücken-Kampagne, strenger Lauf-Seed 92202, 218 USDT): es hängen MEHRERE ausgelöste Stop-Limits (Stop + Zusatz-Stop) über dem Kurs. Der Ausstieg per cancelReplace
# bricht nach der ersten Ablehnung ab («nach einer Ablehnung kein weiteres cancelReplace») — und der Rückfall «Not-Stop an seine Stelle» kannte nur DEN EINEN, dessen Verkauf gescheitert
# war: die übrigen hängenden blieben, ihre Coins ohne wirksamen Stop. Jetzt merkt sich der Abbruch alle hängenden dahinter, und der Rückfall am Ende ersetzt jeden.
k_, sp_, fu_, d_ = handlage(coins=0.3, kurs=100000.0)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d_["rs"] = sp_.regeln2("BTCUSDT")
id1_ = eigener_spot_stop(sp_, d_, 0.1, 90000.0)["orderId"]
id2_ = eigener_spot_stop(sp_, d_, 0.08, 91000.0)["orderId"]
id3_ = eigener_spot_stop(sp_, d_, 0.05, 92000.0)["orderId"]
B.bewegen("BTCUSDT", 85000.0)                          # alle drei lösen aus, ihr Limit liegt über dem Kurs: sie hängen
d_["kurs"] = 85000.0
alt_ = sp_.eigene_stops("BTCUSDT")
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=1)]
try:
    L._spot_stops_verkaufen(sp_, "BTC", d_, {}, alt_, {"auftraege": []}, [].append, [], "Test", soll=0.2, schutz=[], kurs=85000.0)
finally:
    B.regeln = []
vorgemerkt_ = dict(d_.get("haengend_abgelehnt") or {})
pruefe("14.E13 Ausstieg unklar beim ersten hängenden Stop: ALLE hängenden werden für den Rückfall vorgemerkt, mit der Soll-Menge (0,2) verteilt",
       set(vorgemerkt_) == {id1_, id2_, id3_} and abs(sum(vorgemerkt_.values()) - 0.2) < 1e-9 and abs(vorgemerkt_[id1_] - 0.1) < 1e-9
       and abs(vorgemerkt_[id2_] - 0.08) < 1e-9 and abs(vorgemerkt_[id3_] - 0.02) < 1e-9, (vorgemerkt_, id1_, id2_, id3_))
# ein wirksamer Stop dahinter wird nicht vorgemerkt (er schützt und bleibt)
k_, sp_, fu_, d_ = handlage(coins=0.3, kurs=100000.0)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d_["rs"] = sp_.regeln2("BTCUSDT")
id1_ = eigener_spot_stop(sp_, d_, 0.1, 90000.0)["orderId"]
id2_ = eigener_spot_stop(sp_, d_, 0.08, 70000.0)["orderId"]   # sein Stop-Kurs liegt UNTER dem Kurs: er ist nicht ausgelöst und schützt
B.bewegen("BTCUSDT", 85000.0)
d_["kurs"] = 85000.0
alt_ = sp_.eigene_stops("BTCUSDT")
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=1)]
try:
    L._spot_stops_verkaufen(sp_, "BTC", d_, {}, alt_, {"auftraege": []}, [].append, [], "Test", soll=0.2, schutz=[], kurs=85000.0)
finally:
    B.regeln = []
pruefe("14.E13 ein wirksamer Stop hinter dem abgelehnten wird nicht als hängend vorgemerkt", set(d_.get("haengend_abgelehnt") or {}) == {id1_}, (d_.get("haengend_abgelehnt"), id1_, id2_))
P.STRENG = True
P.LUECKEN = True
try:
    funde = P.echte(P.laeufe_runde(92202, 30))
finally:
    P.STRENG = False
    P.LUECKEN = False
    B.reduce_algo_streng = False
pruefe("14.E13 strenger Lücken-Lauf-Seed 92202 (zwei hängende Stop-Limits, Ausstieg abgelehnt): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])

# 14.E14 (Folge-PR, Lücken-Kampagne, strenger Lauf-Seed 92330, 296 USDT): der Perp-Stop für einen neuen Short scheitert beim ersten Preis an Verbindungsabrissen (alle Versuche), und bevor der Not-Stop-Preis
# (5 % über dem gelesenen Kurs) drankommt, springt der Kurs darüber — Binance lehnt auch ihn ab («würde sofort auslösen», −2021). «Sofort ausgelöst» galt nur beim ERSTEN Preis als Zeichen,
# zum Markt auszusteigen; hier blieb der Short «OHNE Stop». Jetzt steigt Pilot 2.0 bei jedem Preis zum Markt aus.
k = neues_konto(20000)
d = neu_buch()
n_ = [0]


def h_(m_, pfad_, p_):
    if m_ == "POST" and pfad_ == "/fapi/v1/algoOrder":
        n_[0] += 1
        if n_[0] == 4:                                     # der Kurs springt, bevor der Not-Stop (zweiter Preis) ankommt
            B.bewegen("BTCUSDT", B.kurs["BTCUSDT"] * 1.25)


B.vor_jeder_anfrage = h_
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="abriss_vor", anzahl=3)]
try:
    r_ = lauf([E("BTC", -0.5)], env_echt(), d)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
g_ = lage(k, "BTCUSDT")
pruefe("14.E14 Not-Stop-Preis würde sofort auslösen (Kurs gesprungen): der Short ist zum Markt zurückgekauft, nicht «OHNE Stop»",
       n_[0] >= 4 and abs(g_["netto"]) < 0.002 and not befunde(k, d) and not any("OHNE Stop" in z for z in r_["zeilen"]),   # netto 0: nur die Absicherung (Ernte-Paar) steht noch
       (n_[0], g_, befunde(k, d), r_["zeilen"][-4:]))
P.STRENG = True
P.LUECKEN = True
try:
    funde = P.echte(P.laeufe_runde(92330, 30))
finally:
    P.STRENG = False
    P.LUECKEN = False
    B.reduce_algo_streng = False
pruefe("14.E14 strenger Lücken-Lauf-Seed 92330: keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])

# 14.E15 (Lücken-Not-Aus-Seed 95297, 59 USDT): ein ausgelöster STOP_LOSS_LIMIT hängt (Kurslücke, Konto ohne STOP_LOSS), der Not-Aus kann den Short nicht zurückkaufen und der Kurs-Abruf ist
# dauerhaft gesperrt (Ticker 429, Mark-Preis 503). Der Not-Aus-Schutz rechnete mit dem Kurs vom Lauf-Anfang — der lag ÜBER dem Limit des Stops, also galt der hängende Stop als wirksam und blieb
# stehen (ein Long ohne wirksamen Stop). «isWorking» allein zeigt einen hängenden Stop (ein ausführbarer Limit-Auftrag wäre sofort weg): der Kurs wird nicht mehr gebraucht.
k, sp_, fu_, d_ = handlage(coins=0.3, short=0.1, kurs=100000.0)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d_["rs"] = sp_.regeln2("BTCUSDT")
eigener_spot_stop(sp_, d_, 0.2, 90000.0)               # der Long über der Netto-Richtung (0,2)
fu_.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, d_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
B.bewegen("BTCUSDT", 85000.0)                          # Lücke unter das Limit (85500): der ausgelöste Stop hängt
w_ = []
L._notaus_schutz(sp_, fu_, {}, "BTC", "BTCUSDT", "BTC", -0.1, -0.1, 0.1, 0.2, 100000.0, d_["rs"], w_.append, "echt")   # Kurs 100000 = der veraltete vom Lauf-Anfang
g_ = lage(k, "BTCUSDT")
pruefe("14.E15 _notaus_schutz mit veraltetem Kurs (100000, echt 85000): der hängende Stop-Limit wird erkannt und ersetzt — kein Long ohne wirksamen Stop",
       not P._haengend(k, "BTCUSDT") and g_["s_qty"] > 0 and not befunde(k), (g_, befunde(k), w_))
# derselbe Fehler im Spot-Abgleich des Laufs (Gegenstück): der Kurs im Abgleich ist veraltet (100000, echt 85000), der hängende Stop-Limit wird trotzdem erkannt und zum Markt verkauft
k, sp_, fu_, d_ = handlage(coins=0.2, kurs=100000.0)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d_["rs"] = sp_.regeln2("BTCUSDT")
eigener_spot_stop(sp_, d_, 0.2, 90000.0)
B.bewegen("BTCUSDT", 85000.0)
s_ = L._soll(0.2, 0.0, 100000.0, d_)                    # Kurs 100000 = veraltet
s_.update(frei=0.0, gebunden=0.2)
w_ = []
L._spot_abgleich(sp_, "BTC", d_, {}, {"stop_long": 90000.0}, s_, {"auftraege": []}, w_.append, [], [], lambda warten=None: L._lage(sp_, fu_, d_, warten), False)
pruefe("14.E15b _spot_abgleich mit veraltetem Kurs: der hängende Stop-Limit wird erkannt und zum Markt verkauft (nicht als «Stop bleibt» gewertet)",
       not P._haengend(k, "BTCUSDT") and lage(k, "BTCUSDT")["coins"] < 0.01, (lage(k, "BTCUSDT"), w_))
P.LUECKEN = True
try:
    funde = P.echte(P.notaus_runde(95297))
finally:
    P.LUECKEN = False
pruefe("14.E15 Lücken-Not-Aus-Seed 95297: keine Befunde", not funde, [(f_[0], f_[1].get("wann")) for f_ in funde][:4])

# ══════════════ Folge-PR zur 14. Runde: Funde der 15. unabhängigen Prüfung (G1/G1b Blocker, G2, K-a, K-c, K-d, K-e) + Ausfall-Raster ══════════════
STOP_SPOT_15 = lambda m, p, q: q.get("type", "").startswith("STOP")  # noqa: E731
PERP_RED_15 = lambda m, p, q: q.get("reduceOnly") == "true"  # noqa: E731

# ── 15. Prüfung G1 / G1b / G2 / K-a / K-d / K-e / K-c + Ausfall-Raster ──

# 15.G1 (Blocker): Vorab Stufe 2 — das Löschen der alten Perp-Stops scheitert, danach ist die Perp-Liste unlesbar. Vorher blieben alt UND neu über dem Short stehen (5'111–9'985 USDT); jetzt
# merkt sich das Buch jeden nicht gelöschten alten Stop (perp_weitere), der Markt ist beidseitig gesichert, die Nachkontrolle räumt auf.
for streng in (False, True):
    for markt, z0, z1 in (("ETH", -1.0, -0.25), ("BTC", -1.0, -0.5)):
        zaehl = {"del": 0}

        def haken(m, pfad, p, zaehl=zaehl):
            if m == "DELETE" and pfad == "/fapi/v1/algoOrder":
                zaehl["del"] += 1
                if zaehl["del"] == 2 and not zaehl.get("an"):
                    zaehl["an"] = True
                    B.regeln.append(regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=3))
                    B.regeln.append(regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=12))
        k = neues_konto(20000)
        B.reduce_algo_streng = streng
        d = neu_buch()
        env = env_echt(kapital=20000)
        lauf([E(markt, z0)], env, d)
        B.vor_jeder_anfrage = haken
        try:
            lauf([E(markt, z1)], env, d)
        finally:
            B.vor_jeder_anfrage = None
            B.regeln = []
            B.reduce_algo_streng = False
        unb = R.unbekannte(k, d)
        name = f"{markt} {z0}→{z1} ({'streng' if streng else 'Standard'})"
        pruefe(f"15.G1 {name}: kein vergessener, dem Buch unbekannter alter Perp-Stop nach dem Lauf", zaehl.get("an") and not unb,
               (zaehl, unb))
        P.pending_abarbeiten()
        B.n_listen += 1000
        P.nachkontrolle(env, d)
        pruefe(f"15.G1 {name}: nach Lauf + Nachkontrolle nichts ungesichert und nichts Unbekanntes",
               not befunde(k, d) and not R.unbekannte(k, d), ([(x[0], x[-1]) for x in befunde(k, d)][:2], R.unbekannte(k, d)))

# 15.G1b: derselbe Weg, aber der NEUE Perp-Stop kam bei verlorener Antwort an (nach503 ×5 = alle Wiederholungen), das Löschen über die Kennung scheitert und die Liste ist unlesbar.
for post_nr in (1, 2):
    for n_post, n_del, n_liste in ((5, 3, 12), (5, 3, 0), (5, 0, 12), (3, 3, 12)):
        zaehl = {"post": 0}

        def haken(m, pfad, p, zaehl=zaehl, post_nr=post_nr, n_post=n_post, n_del=n_del, n_liste=n_liste):
            if m == "POST" and pfad == "/fapi/v1/algoOrder":
                zaehl["post"] += 1
                if zaehl["post"] == post_nr and not zaehl.get("an"):
                    zaehl["an"] = True
                    B.regeln.append(regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=n_post))
                    B.regeln.append(regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=n_del))
                    if n_liste:
                        B.regeln.append(regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=n_liste))
        k = neues_konto(20000)
        d = neu_buch()
        env = env_echt(kapital=20000)
        lauf([E("ETH", -1.0)], env, d)
        B.vor_jeder_anfrage = haken
        try:
            lauf([E("ETH", -0.25)], env, d)
        finally:
            B.vor_jeder_anfrage = None
            B.regeln = []
        unb_lauf = [u for u in R.unbekannte(k, d) if not u[2]]
        P.pending_abarbeiten()
        B.n_listen += 1000
        P.nachkontrolle(env, d)
        pruefe(f"15.G1b Setzen #{post_nr} (Antwort verloren ×{n_post}), Löschen scheitert ×{n_del}, Liste unlesbar ×{n_liste}: kein unbekannter Stop, am Ende nichts ungesichert",
               zaehl.get("an") and not unb_lauf and not R.unbekannte(k, d) and not befunde(k, d), (unb_lauf, R.unbekannte(k, d), [(x[0], x[-1]) for x in befunde(k, d)][:2]))

# 15.G2: _buch_vereinen — (algoId, Kennung) des aktuellen Perp-Stops sind EINE Identität: nie ein Hybrid aus der ID des einen und der Kennung des anderen Laufs
bas = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": None, "perp_weitere": None}})
mein = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": "p2aMEIN", "perp_weitere": None}})
plat = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": 1008, "perp_cid": "p2aANDERER", "perp_weitere": None}})
m = L._buch_vereinen(plat, mein, bas)["stops"]["ETH"]
pruefe("15.G2 Zusammenführen: meine Identität (None, Kennung) bleibt ganz — kein Hybrid aus fremder ID + meiner Kennung", (m.get("perp"), m.get("perp_cid")) == (None, "p2aMEIN"), m)
pruefe("15.G2 Zusammenführen: der Stop des anderen kommt als Paar ins Gedächtnis", [1008, "p2aANDERER"] in (m.get("perp_weitere") or []), m)
bas2 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": 1005, "perp_cid": "p2aALT", "perp_weitere": None}})
mein2 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": "p2aNEU", "perp_weitere": None}})
plat2 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": 1009, "perp_cid": "p2aANDERER", "perp_weitere": None}})
m2 = L._buch_vereinen(plat2, mein2, bas2)["stops"]["ETH"]
pruefe("15.G2 Zusammenführen (Basis hatte einen Stop): ebenfalls kein Hybrid", (m2.get("perp"), m2.get("perp_cid")) == (None, "p2aNEU"), m2)
# nur der ANDERE Lauf hat den Stop geändert → sein Paar gilt ganz (auch mit ID None, wenn er seine Antwort verlor)
mein3 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": 1005, "perp_cid": "p2aALT", "perp_weitere": None}})
plat3 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": "p2aANDERER", "perp_weitere": None}})
m3 = L._buch_vereinen(plat3, mein3, bas2)["stops"]["ETH"]
pruefe("15.G2 Zusammenführen: nur der andere Lauf änderte den Stop → sein Paar (None, Kennung) gilt ganz", (m3.get("perp"), m3.get("perp_cid")) == (None, "p2aANDERER"), m3)
# ohne gemeinsame Basis (3-Wege-Buch fehlt): mein Paar, sobald eines der beiden Felder gesetzt ist, sonst das der Platte
m4 = L._buch_vereinen(plat, mein)["stops"]["ETH"]
pruefe("15.G2 Zusammenführen ohne Basis: mein Paar (None, Kennung) gewinnt ganz", (m4.get("perp"), m4.get("perp_cid")) == (None, "p2aMEIN"), m4)
m5 = L._buch_vereinen(plat, dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": None}}))["stops"]["ETH"]
pruefe("15.G2 Zusammenführen ohne Basis, bei mir leer: das Paar der Platte bleibt", (m5.get("perp"), m5.get("perp_cid")) == (1008, "p2aANDERER"), m5)

# 15.K-a (Staub): die Startprüfung zählt wie der Not-Aus, was Binance verkaufen würde (auf die Schrittweite abgerundet, mindestens der Mindestbetrag): 4.995e-05 BTC bei 100'200 sind 5,005 USDT,
# verkaufbar sind aber nur 4e-05 = 4,0 USDT — kein Grund, den Start zu verweigern
k, sp_, fu_, d_ = handlage(coins=4.995e-05, kurs=100200.0)
cfg_ = L.einstellungen(env_echt())
gr_ = [g_ for g_ in L.startpruefung(sp_, fu_, cfg_, sp_.konto()) if "im Spot-Konto" in g_]
pruefe("15.K-a Startprüfung: 4.995e-05 BTC (5,005 USDT, verkaufbar nur 4,0) sind Staub — kein Grund", not gr_, gr_)
k, sp_, fu_, d_ = handlage(coins=6.5e-05, kurs=100200.0)
gr_ = [g_ for g_ in L.startpruefung(sp_, fu_, cfg_, sp_.konto()) if "im Spot-Konto" in g_]
pruefe("15.K-a Startprüfung: 6.5e-05 BTC (verkaufbar 6e-05 = 6,0 USDT) sind kein Staub — Grund bleibt", len(gr_) == 1, gr_)


# 15.K-d: die Statuszeile behauptet «beidseitig gesichert (unklarer Auftrag)» nur, wenn die Stops auch standen — hier lehnt Binance jeden Stop ab (429), der Lauf warnt «OHNE Stop»
k = neues_konto(20000)
d = neu_buch()
env = env_echt(kapital=20000)
lauf([E("BTC", 0.5)], env, d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet_u", anzahl=1),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99), regel(methode="POST", pfad="/api/v3/order", pred=STOP_SPOT_15, art="429", anzahl=99)]
r = lauf([E("BTC", -0.5)], env, d)
B.regeln = []
zeile_ = next((z_ for z_ in r["zeilen"] if z_.startswith("BTC: Spot")), "")
pruefe("15.K-d Stops dauerhaft abgelehnt: die Statuszeile behauptet nicht «beidseitig gesichert (unklarer Auftrag)»",
       zeile_ and "beidseitig gesichert" not in zeile_ and any("OHNE Stop" in z_ for z_ in r["zeilen"]), r["zeilen"])
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env, d)
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=NEUER_SHORT, art="spaet_u", anzahl=1)]
r = lauf([E("BTC", -0.5)], env, d)
B.regeln = []
zeile_ = next((z_ for z_ in r["zeilen"] if z_.startswith("BTC: Spot")), "")
pruefe("15.K-d Gegenprobe: stehen die Stops, sagt die Zeile «beidseitig gesichert (unklarer Auftrag)» und es gibt keinen Befund",
       "beidseitig gesichert (unklarer Auftrag)" in zeile_ and not befunde(k, d), (r["zeilen"], befunde(k, d)))

# 15.K-e: ein Not-Stop über den Short scheitert mit verlorener Antwort (nach503) und die Stornierung über die Kennung schlägt ebenfalls fehl — das Buch merkt den Stop, sonst bliebe er bei unlesbarer Perp-Liste unbekannt
# (die Kopplung: Position springt, Markt-Rückkauf nur zur Hälfte, Löschen scheitert ×6, Liste dauerhaft unlesbar, zweiter Stop-Versuch verliert die Antwort)
def fall_ke(sz, dl, rl, k_retry):
    markt, z0, z1 = sz
    sym = markt + "USDT"
    k = neues_konto(20000)
    d = neu_buch()
    env = env_echt(kapital=20000)
    lauf([E(markt, z0)], env, d)
    st = {"an": False, "post": 0}
    B.regeln = []

    def haken(m, pfad, p):
        if not st["an"] and m == "GET" and pfad == "/fapi/v1/openAlgoOrders":
            st["an"] = True
            B.bewegen(sym, round(B.kurs[sym] * 1.03, 2))
            B.regeln.append(dict(methode="POST", pfad="/fapi/v1/order", pred=PERP_RED_15, art="teil", anzahl=1, anzahl0=1, anteil=0.5))
            if dl:
                B.regeln.append(dict(methode="DELETE", pfad="/fapi/v1/algoOrder", pred=None, art="vor503", anzahl=dl, anzahl0=dl))
            if rl:
                B.regeln.append(dict(methode="GET", pfad="/fapi/v1/openAlgoOrders", pred=None, art="vor503", anzahl=rl, anzahl0=rl))
        elif st["an"] and m == "POST" and pfad == "/fapi/v1/algoOrder":
            st["post"] += 1
            if st["post"] == 2:
                B.regeln.append(dict(methode="POST", pfad="/fapi/v1/algoOrder", pred=None, art="nach503", anzahl=1, anzahl0=1))
                B.regeln.append(dict(methode="POST", pfad="/fapi/v1/algoOrder", pred=None, art="vor503", anzahl=k_retry, anzahl0=k_retry))
    B.vor_jeder_anfrage = haken
    try:
        lauf([E(markt, z1, stop_abstand=0.02)], env, d)
    finally:
        B.vor_jeder_anfrage = None
        B.regeln = []
    unb = R.unbekannte(k, d)
    P.pending_abarbeiten()
    B.n_listen += 1000
    P.nachkontrolle(env, d)
    return st["an"], unb, [(x[0], x[-2:]) for x in befunde(k, d)][:2], R.unbekannte(k, d)

treffer_ = []
for sz_, dl_, rl_, kr_ in ((("BTC", -1.0, -1.0), 6, 10 ** 6, 4), (("BTC", -1.0, -1.0), 3, 10 ** 6, 4), (("BTC", -1.0, -1.0), 6, 8, 2), (("ETH", -0.5, -0.5), 6, 10 ** 6, 4)):
    an_, unb_, nach_, unb2_ = fall_ke(sz_, dl_, rl_, kr_)
    if an_ and (unb_ or nach_ or unb2_):
        treffer_.append((sz_, dl_, rl_, kr_, unb_, nach_, unb2_))
pruefe("15.K-e Not-Stop mit verlorener Antwort + nicht löschbar + Liste unlesbar: kein dem Buch unbekannter Perp-Stop, am Ende nichts ungesichert", not treffer_, treffer_[:3])


# 15.K-c: ein Stop, den Binance bei cancelReplace in einer Phase «nur Stornieren» entfernt (409, der alte weg, der neue abgelehnt = Störung «nur_storno»), ist dasselbe dokumentierte Restrisiko wie die
# Börsen-Lesart «Storno zuerst» (Testnetz-Prüfpunkt B): der Fuzzer führt ihn als Klasse STORNO_ZUERST_, nicht als echten Befund (strenger Not-Aus-Seed 30583)
P.STRENG = True
try:
    funde = P.echte(P.notaus_runde(30583))
finally:
    P.STRENG = False
    B.reduce_algo_streng = False
pruefe("15.K-c strenger Not-Aus-Seed 30583: «nur_storno» zählt als Restrisiko «Storno zuerst», kein echter Befund", not funde, [(f_[0], f_[1].get("wann")) for f_ in funde][:4])

# 15.G3: Erhaltungssatz «kein vergessener Stop» — unbekannte(): eigene Perp-Stops (Kennung p2a…) an der Börse, die das Buch weder als aktuellen Stop noch in seinem Gedächtnis (perp_weitere) kennt
def algo_(k_, aid, cid, sym="BTCUSDT", menge="0.1", sichtbar_ab=0):
    k_.algos[aid] = {"symbol": sym, "side": "BUY", "quantity": menge, "triggerPrice": "110000", "reduceOnly": "true", "type": "STOP_MARKET",
                     "clientAlgoId": cid, "sichtbar_ab": sichtbar_ab}


def buch_(stops_):
    f_ = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
    json.dump({"echt": {"stops": stops_}}, f_)
    f_.close()
    return f_.name


k = neues_konto(20000)
B.n_listen = 0
algo_(k, 1, "p2aAKTUELL")                                  # der aktuelle Stop (nach ID)
algo_(k, 2, "p2aGEMERKT")                                  # gemerkt (ID + Kennung)
algo_(k, 3, "p2aNURKENNUNG")                               # gemerkt nur mit Kennung (ID unbekannt: Antwort verloren)
algo_(k, 4, "p2aNURID")                                    # gemerkt nur mit ID (Kennung leer)
algo_(k, 5, "p2aVERGESSEN", menge="0.25")                  # dem Buch unbekannt → der Fund
algo_(k, 6, "p2aVERSTECKT", menge="0.3", sichtbar_ab=99)   # unbekannt, aber die Liste zeigt ihn noch nicht
algo_(k, 7, "fremd-1")                                     # kein eigener Stop (Kennung ohne p2a)
buch = buch_({"BTC": {"perp": 1, "perp_cid": "p2aAKTUELL", "perp_weitere": [[2, "p2aGEMERKT"], [None, "p2aNURKENNUNG"], [4, None]]}})
unb = R.unbekannte(k, buch)
pruefe("15.G3 unbekannte(): aktueller, gemerkter (ID+Kennung / nur Kennung / nur ID) und fremder Stop sind bekannt bzw. ausgenommen — übrig bleibt der vergessene", [u_[:2] for u_ in unb if not u_[2]] == [("BTCUSDT", 0.25)], unb)
pruefe("15.G3 unbekannte(): ein noch unsichtbarer unbekannter Stop wird mit dem Merker «unsichtbar» gemeldet (zählt erst, wenn die Liste ihn zeigt)", ("BTCUSDT", 0.3, True) in unb, unb)
B.n_listen = 100
pruefe("15.G3 unbekannte(): nach der Listenverzögerung zählt auch er", ("BTCUSDT", 0.3, False) in R.unbekannte(k, buch), R.unbekannte(k, buch))
B.n_listen = 0
pruefe("15.G3 unbekannte(): ohne Buch ist jeder eigene Stop unbekannt", sorted(u_[1] for u_ in R.unbekannte(k, "/nirgends/buch.json")) == [0.1, 0.1, 0.1, 0.1, 0.25, 0.3], R.unbekannte(k, "/nirgends/buch.json"))

# 15.G3 klasse(): die Befundarten des Rasters (der schwerste zuerst)
sauber_ = dict(nach_lauf=[], nach_nk=[], unbekannt_lauf=[], unbekannt_nk=[], laut=False, nk_tat_etwas=False)
pruefe("15.G3 klasse(): sauber → None", R.klasse(sauber_) is None, R.klasse(sauber_))
pruefe("15.G3 klasse(): ohne Stop nach der Nachkontrolle → NACH_NK (schlägt alles andere)",
       R.klasse(dict(sauber_, nach_nk=[1], unbekannt_nk=[1], nach_lauf=[1])) == "NACH_NK")
pruefe("15.G3 klasse(): unbekannter Stop nach der Nachkontrolle → UNBEKANNT_NACH_NK", R.klasse(dict(sauber_, unbekannt_nk=[1])) == "UNBEKANNT_NACH_NK")
pruefe("15.G3 klasse(): direkt nach dem Lauf ohne Stop, der Lauf warnte nicht → NACH_LAUF_STILL", R.klasse(dict(sauber_, nach_lauf=[1])) == "NACH_LAUF_STILL")
pruefe("15.G3 klasse(): direkt nach dem Lauf ohne Stop, der Lauf warnte, die Nachkontrolle tat nichts → NACH_LAUF_LAUT_OHNE_NK",
       R.klasse(dict(sauber_, nach_lauf=[1], laut=True)) == "NACH_LAUF_LAUT_OHNE_NK")
pruefe("15.G3 klasse(): laut und die Nachkontrolle half → kein Befund", R.klasse(dict(sauber_, nach_lauf=[1], laut=True, nk_tat_etwas=True)) is None)
pruefe("15.G3 klasse(): unbekannter Stop direkt nach dem Lauf → UNBEKANNT_NACH_LAUF", R.klasse(dict(sauber_, unbekannt_lauf=[1])) == "UNBEKANNT_NACH_LAUF")

# 15.G3 Raster: die vier Zellen, in denen die 15. Prüfung G1 fand (ETH −1,0 → −0,25; Löschen des alten Stops scheitert ×3, die Perp-Liste ist unlesbar ×8 bzw. dauerhaft; Störung ab dem 1. bzw. 2. Löschen)
bad_ = []
for skip_ in (0, 1):
    for ri_ in (1, 2):
        e_ = R.fall(R.SZENARIEN[0], R.SCHREIBEN[0], skip_, R.LESEN[ri_], "bei_w")
        if e_ is None or R.klasse(e_):
            bad_.append((skip_, ri_, None if e_ is None else R.klasse(e_), None if e_ is None else (e_["nach_nk"][:1], e_["unbekannt_lauf"][:1], e_["unbekannt_nk"][:1])))
pruefe("15.G3 Raster: die vier G1-Zellen (ETH −1,0 → −0,25, Löschen ×3 scheitert, Liste unlesbar) sind sauber", not bad_, bad_)

# 15.H Raster --haengend (Folge-PR, Schlusskampagne): Konto ohne STOP_LOSS, zu Beginn von Tag 1 hängen die Spot-Stops (Kurslücke unter das Limit). Lagen ohne Spot-Stop zählen als «kein_spotstop».
pruefe("15.H Raster --haengend: eine Lage ohne Spot-Stop (ETH-Short) meldet «kein_spotstop»", R.fall(R.SZENARIEN[0], R.SCHREIBEN[0], 0, None, "bei_w", None, True) == "kein_spotstop")
i_ersetzen_ = next(i_ for i_, w_ in enumerate(R.SCHREIBEN) if w_[1] == "/api/v3/order/cancelReplace" and w_[3] == "vor503")
e_ = R.fall(R.SZENARIEN[2], R.SCHREIBEN[i_ersetzen_], 0, None, "bei_w", None, True)
pruefe("15.H Raster --haengend: BTC +0,5 → −0,5, cancelReplace scheitert ×3 (unklar) — der Stop hängt zu Beginn von Tag 1, und nach Lauf + Nachkontrolle steht alles unter Schutz",
       isinstance(e_, dict) and e_["haengt"] > 0 and R.klasse(e_) is None, e_ if not isinstance(e_, dict) else (e_["haengt"], R.klasse(e_), e_["nach_nk"][:1]))
e_ = R.fall(R.SZENARIEN[2], R.SCHREIBEN[i_ersetzen_], 0, None, "bei_w", None, False)
pruefe("15.H Raster ohne --haengend: dieselbe Zelle hat keinen hängenden Stop (Gegenprobe: das Konto hat STOP_LOSS)", isinstance(e_, dict) and e_["haengt"] == 0.0, e_ if not isinstance(e_, dict) else e_["haengt"])

# 15.E22 (Raster --haengend, Paar «cancelReplace unbekannt (404) × Löschen scheitert»): Binance kennt cancelReplace nicht, der hängende Stop-Limit lässt sich nicht löschen (503 vor der
# Verarbeitung, dreimal) — der Rückfall «Not-Stop an seine Stelle» kannte diesen Weg nicht: die Coins galten als «durch einen Auftrag gesperrt, der nicht in der Liste steht — gilt als Stop»,
# der Long stand bis zum nächsten Tageslauf ohne wirksamen Stop (0,1988 BTC ≈ 16'800 USDT im Raster, auch nach der Nachkontrolle: sie wurde nicht angestossen).
z_paare_ = {c_[0]: c_ for c_ in R.zellen(True)}
_, w_ersetzen_fehlt_, w_loeschen_, _ = z_paare_["P1.0"]
bad_ = []
for si_ in (3, 8, 10):
    e_ = R.fall(R.SZENARIEN[si_], w_ersetzen_fehlt_, 0, None, "bei_w", None, True, w_loeschen_)
    if not isinstance(e_, dict) or R.klasse(e_) or not e_["haengt"]:
        bad_.append((si_, e_ if not isinstance(e_, dict) else (e_["haengt"], R.klasse(e_), e_["nach_nk"][:1], e_["zeilen"][:3])))
pruefe("15.E22 Raster-Paar P1.0 (cancelReplace 404 × Löschen ×3 scheitert), BTC +1,0 → +0,25 / +0,5 → +1,0 / +0,25 → +0,5: nach Lauf + Nachkontrolle steht ein Stop über den Coins", not bad_, bad_)
k, sp_, fu_, d_, o_, lesen_ = haengend14(coins=0.3, menge=0.1)
B.ersetzen_fehlt = True
B.regeln = [regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=99)]
erg_, w_, g_ = {"auftraege": [], "zeilen": []}, [], []
try:
    L._spot_stops_verkaufen(sp_, "BTC", d_, {"spot": o_["orderId"]}, [o_], erg_, w_.append, g_, "Kurs unter dem Stop", soll=0.1, schutz=[], kurs=85000.0)
finally:
    B.regeln = []
    B.ersetzen_fehlt = False
pruefe("15.E22 _spot_stops_verkaufen: cancelReplace unbekannt (404) und das Löschen des HÄNGENDEN Stops scheitert → er ist für den Not-Stop am Laufende vorgemerkt (mit der Menge, die er hält)",
       set(d_.get("haengend_abgelehnt") or {}) == {o_["orderId"]} and abs(sum(d_["haengend_abgelehnt"].values()) - 0.1) < 1e-9 and P._haengend(k, "BTCUSDT") > 0, (d_.get("haengend_abgelehnt"), w_))
k, sp_, fu_, d_, o_, lesen_ = haengend14(coins=0.3, menge=0.1)
B.ersetzen_fehlt = True
erg_, w_, g_ = {"auftraege": [], "zeilen": []}, [], []
try:
    L._spot_stops_verkaufen(sp_, "BTC", d_, {"spot": o_["orderId"]}, [o_], erg_, w_.append, g_, "Kurs unter dem Stop", soll=0.1, schutz=[], kurs=85000.0)
finally:
    B.ersetzen_fehlt = False
pruefe("15.E22 Gegenprobe: gelingt das Löschen, ist der hängende weg und nichts vorgemerkt", not d_.get("haengend_abgelehnt") and not P._haengend(k, "BTCUSDT"), (d_.get("haengend_abgelehnt"), P._haengend(k, "BTCUSDT"), w_))


# 15.E23 (Raster --haengend, Paare mit unlesbarer Spot-Liste): ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs, das Ersetzen scheitert dauerhaft (503) bzw. Binance kennt cancelReplace nicht, UND die
# Spot-Auftragsliste ist unlesbar (die Wiederholungen sind verbraucht): die Coins gelten als «gesichert», am Laufende warnt der Lauf «Richtung +1,00 OHNE Stop» — aber der Markt wurde NICHT für die
# Nachkontrolle vermerkt (die Schlusswarnung kam erst NACH der Vergabe von schutz_offen). Der Long blieb bis zum nächsten Tageslauf ohne wirksamen Stop, obwohl die Liste kurz darauf wieder lesbar war
# (0,1988 BTC ≈ 16'800 USDT im Raster).
bad_, offen_ = [], []
for zid_ in ("P0.0", "P0.2", "P0.3", "P1.1", "P1.3"):
    _, w_a_, w_b_, _ = z_paare_[zid_]
    for ri_ in (3, 4):
        e_ = R.fall(R.SZENARIEN[3], w_a_, 0, R.LESEN[ri_], "bei_w", None, True, w_b_)
        if not isinstance(e_, dict) or R.klasse(e_) or not e_["haengt"]:
            bad_.append((zid_, ri_, e_ if not isinstance(e_, dict) else (e_["haengt"], R.klasse(e_), e_["nach_nk"][:1], e_["zeilen"][:3])))
        else:
            offen_.append((zid_, ri_, e_["schutz_offen"], e_["laut"]))
pruefe("15.E23 Raster-Paare (Ersetzen scheitert dauerhaft bzw. unbekannt × Löschen/Not-Stop schief) mit unlesbarer Spot-Liste, BTC +1,0 → +0,25: nach Lauf + Nachkontrolle steht ein Stop über den Coins", not bad_, bad_)
pruefe("15.E23 der Lauf vermerkt den Markt für die Nachkontrolle (schutz_offen) und warnt laut", offen_ and all("BTC" in o_[2] and o_[3] for o_ in offen_), offen_)


def flaggt_(t_):
    """Dieselbe Regel wie die Warn-Hülle in _stops_setzen: welche Meldungen den Markt für die Nachkontrolle vermerken."""
    return ("OHNE Stop" in t_ or "ohne Stop" in t_ or "nicht geprüft" in t_ or "Stop abgelehnt" in t_) and "zu klein" not in t_


# direkt: die Spot-Liste ist nicht lesbar, alle Coins sind gesperrt («gelten als gesichert») — ob ein hängender Stop darunter liegt, weiss der Lauf nicht: die Nachkontrolle muss lesen
k, sp_, fu_, d_ = handlage(coins=0.3, kurs=100000.0)
eigener_spot_stop(sp_, d_, 0.3, 90000.0)
s_ = L._soll(0.3, 0.0, 100000.0, d_)
s_.update(frei=0.0, gebunden=0.3)
w_ = []
L._spot_ohne_liste(sp_, "BTC", d_, {"spot": 1}, {"stop_long": 90000.0}, s_, w_.append, [], False, RuntimeError("liste weg"), {"auftraege": [], "zeilen": []}, lambda warten=None: None)
pruefe("15.E23 _spot_ohne_liste: die gesperrten Coins gelten als gesichert, aber nicht geprüft → die Meldung vermerkt den Markt für die Nachkontrolle", w_ and all(flaggt_(t_) for t_ in w_), w_)
k, sp_, fu_, d_ = handlage(coins=0.5, kurs=100000.0)
eigener_spot_stop(sp_, d_, 0.3, 90000.0)               # 0,3 gesperrt, 0,2 frei: der Rest bekommt einen eigenen Stop, die gesperrten gelten als gesichert
s_ = L._soll(0.5, 0.0, 100000.0, d_)
s_.update(frei=0.2, gebunden=0.3)
w_, g_ = [], []
L._spot_ohne_liste(sp_, "BTC", d_, {"spot": 1}, {"stop_long": 90000.0}, s_, w_.append, g_, False, RuntimeError("liste weg"), {"auftraege": [], "zeilen": []}, lambda warten=None: None)
pruefe("15.E23 _spot_ohne_liste: der freie Rest bekommt seinen Stop, die gesperrten gelten als gesichert (nicht geprüft) → Nachkontrolle vermerkt", g_ and w_ and all(flaggt_(t_) for t_ in w_), (w_, g_))


# 15.E24 (Muster «unverifizierter Endstand»): ändert sich der Kontostand in JEDER Abgleich-Runde (hier: ein Zufluss von Coins bei jeder Kontoabfrage), endet der Abgleich nach 3 Runden ohne Stabilität. Der Lauf
# warnte («Kontostand hat sich während des Stop-Abgleichs mehrmals geändert … bitte prüfen!»), vermerkte den Markt aber nicht für die Nachkontrolle: der letzte Stand blieb ungeprüft.
k = neues_konto(20000)
d = neu_buch()
env = env_echt(kapital=20000)
lauf([E("BTC", 0.5)], env, d)
zustand_ = {"an": False}


def zufluss_(m_, pfad_, p_, code_):
    if zustand_["an"] and m_ == "GET" and pfad_ == "/api/v3/account":
        k.frei["BTC"] += 0.002        # Zufluss: jede Lesung zeigt mehr Coins → nie «gleich»


B.nach_jeder_anfrage = zufluss_
zustand_["an"] = True
try:
    r = lauf([E("BTC", 0.5)], env, d)
finally:
    B.nach_jeder_anfrage = None
buch_ = json.loads(Path(d).read_text()).get("echt") or {}
zeilen_ = [z_[:140] for z_ in r["zeilen"] if "⚠" in z_]
pruefe("15.E24 Kontostand ändert sich in jeder Runde: der Lauf warnt UND vermerkt den Markt für die Nachkontrolle", any("mehrmals geändert" in z_ for z_ in zeilen_) and "BTC" in (buch_.get("schutz_offen") or []),
       (zeilen_, buch_.get("schutz_offen")))
k = neues_konto(20000)
d = neu_buch()
lauf([E("BTC", 0.5)], env, d)
r = lauf([E("BTC", 0.5)], env, d)
buch_ = json.loads(Path(d).read_text()).get("echt") or {}
pruefe("15.E24 Gegenprobe: ein ruhiger Lauf vermerkt nichts", not (buch_.get("schutz_offen") or []) and not any("mehrmals" in z_ for z_ in r["zeilen"]), (buch_.get("schutz_offen"), [z_[:120] for z_ in r["zeilen"]]))


# 15.N Raster --notaus: Tag 1 ist der Not-Aus; gemessen wie pruef_fuzzer.notaus_runde (Schutz direkt danach, Nachkontrolle im Not-Aus-Modus, «alles zu» nur bei flachem Konto, sauberer zweiter Not-Aus)
i_rueckkauf_ = next(i_ for i_, w_ in enumerate(R.SCHREIBEN) if w_[1] == "/fapi/v1/order" and w_[3] == "vor503")
for haengend_, name_ in ((False, "ohne"), (True, "mit hängenden Spot-Stops")):
    e_ = R.fall(R.SZENARIEN[2], R.SCHREIBEN[i_rueckkauf_], 0, None, "bei_w", None, haengend_, None, True)
    pruefe(f"15.N Raster --notaus ({name_}): BTC +0,5, der Rückkauf des Shorts scheitert ×3 — der Not-Aus schliesst, sonst nichts übrig", isinstance(e_, dict) and e_.get("notaus") and R.klasse(e_) is None
           and (not haengend_ or e_["haengt"] > 0), e_ if not isinstance(e_, dict) else (R.klasse(e_), e_["alles_zu_lauf"], e_["alles_zu_nk"], e_["nach_lauf"][:1], e_["nach_nk"][:1], e_["haengt"]))
sauber_n_ = dict(nach_lauf=[], nach_nk=[], unbekannt_lauf=[], unbekannt_nk=[], laut=False, nk_tat_etwas=False, notaus=True)
pruefe("15.N klasse() im Not-Aus: sauber → None; FALSCH_ALLES_ZU und SAUBER_NICHT_ZU schlagen alles andere; Schutz direkt nach dem Not-Aus fehlt: still → NACH_LAUF_STILL, laut + Nachkontrolle half → kein Befund",
       R.klasse(sauber_n_) is None and R.klasse(dict(sauber_n_, falsch_alles_zu=True, nach_nk=[1])) == "FALSCH_ALLES_ZU" and R.klasse(dict(sauber_n_, sauber_nicht_zu=True, nach_nk=[1])) == "SAUBER_NICHT_ZU"
       and R.klasse(dict(sauber_n_, nach_lauf=[1])) == "NACH_LAUF_STILL" and R.klasse(dict(sauber_n_, nach_lauf=[1], laut=True)) == "NACH_LAUF_LAUT_OHNE_NK"
       and R.klasse(dict(sauber_n_, nach_lauf=[1], laut=True, nk_tat_etwas=True)) is None and R.klasse(dict(sauber_n_, nach_nk=[1])) == "NACH_NK")
pruefe("15.H zellen(nur_paare=True) liefert genau die 10 Paare (je 2 Zeitpunkte); ohne haengend gibt es keine",
       len(R.zellen(True, False, True)) == 10 and all(c_[0].startswith("P") and c_[2] is not None and c_[3] == (0, 1) for c_ in R.zellen(True, False, True)) and R.zellen(False, False, True) == [])
pruefe("15.N Not-Aus-Störungen sind Teil des Rasters (Rückkauf/Marktverkauf mit verlorener Antwort oder teilweise, Löschen mit verlorener Antwort, Umbuchung); zellen() zählt sie nur mit notaus",
       len(R.SCHREIBEN_NOTAUS) == 7 and len(R.zellen(False, True)) == len(R.zellen(False)) + 7 and len(R.zellen(True, True)) == len(R.zellen(True)) + 7)


# 15.E25 (Schlusskampagne camp15d, Lücken-Läufe 110000–110150, 7 Befunde «NACHKONTROLLE_OFFEN»): die Schlusswarnung «Richtung … OHNE Stop (zu klein für Binance …)» bei einem PAAR (Coins + fast gleich grosser Short,
# Netto-Richtung wenige USDT) ist ein Dauerzustand — für so wenig nimmt Binance keinen Stop an. E23 vermerkte jeden solchen Markt für die Nachkontrolle, die ihn nie loswird (Alarm bei jeder Nachkontrolle, jeden Tag).
# Nur ein Rest, den Binance noch absichern kann (Stop-Notional am Stop-Kurs ≥ Mindestbetrag), ist ein Fall für die Nachkontrolle.
def paar_mit_rest_(netto_usdt):
    k_ = neues_konto(20000)
    d_ = neu_buch()
    env_ = env_echt(kapital=20000)
    lauf([E("ETH", 0.0), E("BTC", 0.0)], env_, d_)             # Ernte-Paar: Coins gegen gleich grossen Short
    g_ = lage(k_, "ETHUSDT")
    k_.frei["ETH"] += (netto_usdt / B.kurs["ETHUSDT"]) - (g_["coins"] + g_["pos"])   # Netto-Rest genau netto_usdt
    r_ = lauf([E("ETH", 0.0), E("BTC", 0.0)], env_, d_)
    return k_, r_, json.loads(Path(d_).read_text()).get("echt") or {}, lage(k_, "ETHUSDT")


k, r, buch_, g_ = paar_mit_rest_(5.3)
zeilen_ = [z_[:130] for z_ in r["zeilen"] if "⚠" in z_]
pruefe("15.E25 Paar mit einem Netto-Rest von 5,3 USDT (über dem Staub, am Stop-Kurs unter dem Mindestbetrag): der Lauf warnt «OHNE Stop (zu klein …)», vermerkt den Markt aber NICHT für die Nachkontrolle",
       g_["n_s"] == 0 and any("OHNE Stop" in z_ and "zu klein" in z_ for z_ in zeilen_) and "ETH" not in (buch_.get("schutz_offen") or []),
       (g_["n_s"], buch_.get("schutz_offen"), zeilen_, round((g_["coins"] + g_["pos"]) * B.kurs["ETHUSDT"], 2)))
k, r, buch_, g_ = paar_mit_rest_(9.0)
pruefe("15.E25 Gegenprobe: ein Netto-Rest von 9 USDT lässt sich absichern — er bekommt seinen Stop, nichts offen", g_["s_qty"] > 0 and "ETH" not in (buch_.get("schutz_offen") or []),
       (g_, buch_.get("schutz_offen"), [z_[:130] for z_ in r["zeilen"] if "⚠" in z_]))
# _schutzbar(): was Binance noch absichern kann (dieselbe Rechnung wie die Absicherung selbst)
d_sb_ = {"rs": {"min_notional": 5.0}, "rf": {"min_notional": 100.0}}
sb_ = lambda **kw: dict(dict(stop_spot=0.0, stop_perp=0.0, short_teil=0.0, kurs=4000.0), **kw)  # noqa: E731
pruefe("15.E25 _schutzbar(): ein Netto-Long von 100 USDT ja, 5,1 USDT (Stop 5 % unter dem Kurs, also unter dem Mindestbetrag) nein; ein Perp-Stop über Null ja; ein Short-Rest unter einem halben Futures-Schritt (auch bei 121 USDT) nein",
       L._schutzbar(sb_(stop_spot=0.025), d_sb_, {}, {}) and not L._schutzbar(sb_(stop_spot=5.1 / 4000), d_sb_, {}, {}) and L._schutzbar(sb_(stop_perp=0.001), d_sb_, {}, {})
       and not L._schutzbar(sb_(short_teil=0.000494, kurs=245245.92), d_sb_, {}, {}))
for seed_ in (110031, 110076, 110100, 110115, 110125, 110126, 112046):
    P.LUECKEN = True
    try:
        funde_ = P.echte(P.laeufe_runde(seed_, 30))
    finally:
        P.LUECKEN = False
    pruefe(f"15.E25 Lücken-Lauf-Seed {seed_}: keine Befunde (auch kein NACHKONTROLLE_OFFEN)", not funde_, [(f_[0], f_[1].get("tag")) for f_ in funde_][:4])

pruefe("15.H Raster --haengend: die zusätzlichen Störungen (Löschen/Ersetzen/Marktverkauf mit verlorener Antwort bzw. abgelehnt) sind Teil des Rasters",
       len(R.SCHREIBEN_HAENGEND) == 4 and {(w_[1], w_[3]) for w_ in R.SCHREIBEN_HAENGEND} == {("/api/v3/order", "nach503"), ("/api/v3/order/cancelReplace", "nach503"), ("/api/v3/order", "ablehnen")}, R.SCHREIBEN_HAENGEND)

# ── 15. Prüfung, direkte Aufrufe: Vorab Stufe 2 (G1/G1b), Zusammenführen (G2), Perp-Not-Stops merken (K-e) ──
PLAN_G1 = {"info": {"spot_ziel": 2.5, "perp_ziel": -3.0}, "schritte": []}


def vorab_lage(stops, short=1.6, coins=0.5):
    """Konto wie in 11.S12: Short, Coins, mehrere alte Perp-Stops (Mengen) über dem Short."""
    k_ = neues_konto(400000)
    cfg_ = L.einstellungen(env_echt(kapital=400000))
    sp_, fu_ = L.Spot(cfg_["spot"]), L.Fut(cfg_["futures"])
    sym_ = "BTCUSDT"
    k_.frei["BTC"] = coins
    k_.buchen(sym_, -short, B.kurs[sym_])
    d_ = {"sym": sym_, "coin": "BTC", "kurs": B.kurs[sym_], "rs": sp_.regeln2(sym_), "rf": fu_.regeln(sym_)}
    for m_ in stops:
        fu_.stop_menge(sym_, "BUY", m_, 110000.0, d_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    return k_, sp_, fu_, d_


# 15.G1 direkt: Vorab Stufe 2 — zwei alte Perp-Stops (0,7 + 0,7 > 1,1), der kleinere (1,1) steht, das Löschen scheitert (dauerhaft): BEIDE alten sind im Buch gemerkt, der Markt ist beidseitig,
# die Nachkontrolle ist angestossen — die Ausnahme geht trotzdem nach oben (der Markt bleibt gesperrt)
k, sp_, fu_, d_ = vorab_lage([0.7, 0.7])
alt_ = fu_.eigene_stops("BTCUSDT")
buch_ = L.leer_buch()
B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99)]
try:
    L._stops_vorab(sp_, fu_, buch_, "BTC", d_, PLAN_G1)
    raised_ = False
except Exception:  # noqa: BLE001
    raised_ = True
finally:
    B.regeln = []
st_ = buch_["stops"]["BTC"]
gem_ = [tuple(w) for w in st_.get("perp_weitere") or []]
pruefe("15.G1 Vorab: das Löschen beider alter Perp-Stops scheitert → beide im Gedächtnis des Buchs", raised_ and all((a_["algoId"], a_["clientAlgoId"]) in gem_ for a_ in alt_) and len(alt_) == 2, (raised_, gem_, [(a_["algoId"], a_["clientAlgoId"]) for a_ in alt_]))
pruefe("15.G1 Vorab: der Markt ist beidseitig gesichert und die Nachkontrolle angestossen", d_.get("beidseitig") and d_.get("nachkontrolle") and d_.get("neue_runde"), d_)
pruefe("15.G1 Vorab: der neue (kleinere) Stop ist der aktuelle des Buchs und steht an der Börse", st_.get("perp_cid") and any(a_["clientAlgoId"] == st_["perp_cid"] for a_ in fu_.eigene_stops("BTCUSDT")), (st_, fu_.eigene_stops("BTCUSDT")))

# 15.G1: scheitert erst das Löschen des ZWEITEN alten Stops (der erste ist weg), ist nur dieser gemerkt (der erste ist ja gelöscht)
k, sp_, fu_, d_ = vorab_lage([0.7, 0.7])
alt_ = fu_.eigene_stops("BTCUSDT")
buch_ = L.leer_buch()
zl_ = {"n": 0}


def haken_del_(m_, pfad_, p_):
    if m_ == "DELETE" and pfad_ == "/fapi/v1/algoOrder":
        zl_["n"] += 1
        if zl_["n"] == 2 and not zl_.get("an"):
            zl_["an"] = True
            B.regeln.append(regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99))


B.vor_jeder_anfrage = haken_del_
try:
    L._stops_vorab(sp_, fu_, buch_, "BTC", d_, PLAN_G1)
    raised_ = False
except Exception:  # noqa: BLE001
    raised_ = True
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
gem_ = [tuple(w) for w in buch_["stops"]["BTC"].get("perp_weitere") or []]
zweiter_ = (alt_[1]["algoId"], alt_[1]["clientAlgoId"])
pruefe("15.G1 Vorab: scheitert erst das Löschen des zweiten alten Stops, ist genau dieser gemerkt (der erste ist gelöscht)", raised_ and gem_ == [zweiter_] and zl_.get("an"), (raised_, gem_, zweiter_))

# 15.G1 Variante: die Antwort des neuen (kleineren) Stops geht verloren, die Wiederholung wird als Doppel erkannt (er steht) — das Löschen des alten scheitert: der alte ist gemerkt, der neue ist der aktuelle
k, sp_, fu_, d_ = vorab_lage([1.2])
alt_ = fu_.eigene_stops("BTCUSDT")
buch_ = L.leer_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=5), regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99)]
try:
    L._stops_vorab(sp_, fu_, buch_, "BTC", d_, PLAN_G1)
    raised_ = False
except Exception:  # noqa: BLE001
    raised_ = True
finally:
    B.regeln = []
st_ = buch_["stops"]["BTC"]
pruefe("15.G1 Vorab (Antwort des neuen Stops verloren, Doppel erkannt): das Löschen des alten scheitert → der alte ist gemerkt, der neue der aktuelle Stop des Buchs",
       raised_ and [alt_[0]["algoId"], alt_[0]["clientAlgoId"]] in (st_.get("perp_weitere") or []) and st_.get("perp_cid") and st_["perp_cid"] != alt_[0]["clientAlgoId"] and d_.get("beidseitig"),
       (raised_, st_, d_.get("beidseitig")))

# 15.G1b direkt: der kleinere Stop kommt an, die Antwort geht verloren und alle weiteren Versuche scheitern VOR der Verarbeitung (der Stop N steht, das Buch kennt nur die Kennung) — das Löschen über die Kennung
# scheitert → die Kennung ist im Gedächtnis des Buchs (bei unlesbarer Liste kennt ihn sonst niemand), der Markt beidseitig, die Nachkontrolle angestossen
k, sp_, fu_, d_ = vorab_lage([1.2])
buch_ = L.leer_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99),
            regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99)]
try:
    L._stops_vorab(sp_, fu_, buch_, "BTC", d_, PLAN_G1)
    raised_ = False
except Exception:  # noqa: BLE001
    raised_ = True
finally:
    B.regeln = []
st_ = buch_["stops"]["BTC"]
stehen_ = [a_["clientAlgoId"] for a_ in fu_.eigene_stops("BTCUSDT")]
pruefe("15.G1b Vorab: der kleinere Stop kam an (Antwort verloren, Wiederholungen abgewiesen) und lässt sich nicht löschen → seine Kennung ist im Gedächtnis des Buchs",
       raised_ and len(stehen_) == 2 and any(w_[0] is None and w_[1] == stehen_[1] for w_ in st_.get("perp_weitere") or []), (raised_, stehen_, st_))
pruefe("15.G1b Vorab: dazu eine neue Abgleich-Runde angestossen (die Liste entscheidet nach Mengen); der Markt ist nicht blind beidseitig (E26: im häufigen Fall «nie angekommen» schadet das)",
       d_.get("neue_runde") and not d_.get("beidseitig"), d_)
# Gegenprobe (Folge-PR E26): auch wenn sich die Kennung löschen liesse, wird der vielleicht angekommene kleinere Stop NICHT gelöscht — er ist genau der Stop, den der Plan will; er steht im Buch, beide stehen
k, sp_, fu_, d_ = vorab_lage([1.2])
buch_ = L.leer_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=99)]
try:
    L._stops_vorab(sp_, fu_, buch_, "BTC", d_, PLAN_G1)
    raised_ = False
except Exception:  # noqa: BLE001
    raised_ = True
finally:
    B.regeln = []
pruefe("15.G1b Vorab Gegenprobe: auch wenn sich die Kennung löschen liesse, bleibt der vielleicht angekommene kleinere Stop stehen und steht im Buch (E26)",
       raised_ and bool(buch_["stops"]["BTC"].get("perp_weitere")) and not d_.get("beidseitig") and len(fu_.eigene_stops("BTCUSDT")) == 2,
       (raised_, buch_["stops"]["BTC"], d_.get("beidseitig"), len(fu_.eigene_stops("BTCUSDT"))))

# 15.G2 weitere Fälle: nur ICH habe den Stop geändert (die Platte entspricht der Basis) → mein Paar; ich habe meines geleert (None, None), der andere ein neues gesetzt → das des anderen
bas2 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": 1005, "perp_cid": "p2aALT", "perp_weitere": None}})
mein6 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": "p2aNEU", "perp_weitere": None}})
m6 = L._buch_vereinen(dict(bas2), mein6, bas2)["stops"]["ETH"]
pruefe("15.G2 Zusammenführen: nur ich habe den Stop geändert (Platte = Basis) → mein Paar (None, Kennung) gilt ganz", (m6.get("perp"), m6.get("perp_cid")) == (None, "p2aNEU"), m6)
mein7 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": None, "perp_cid": None, "perp_weitere": None}})
plat7 = dict(L.leer_buch(), start="x", stops={"ETH": {"perp": 1009, "perp_cid": "p2aANDERER", "perp_weitere": None}})
m7 = L._buch_vereinen(plat7, mein7, bas2)["stops"]["ETH"]
pruefe("15.G2 Zusammenführen: ich habe meinen Stop geleert, der andere einen neuen gesetzt → sein Paar bleibt", (m7.get("perp"), m7.get("perp_cid")) == (1009, "p2aANDERER"), m7)

# 15.K-e: scheitert ein Perp-Stop-Versuch und lässt sich seine Kennung nicht löschen (die Antwort kann verloren sein, der Stop trotzdem angekommen), merkt ihn das Buch — an JEDER Stelle, an der Pilot 2.0 einen Perp-Not-Stop setzt
def stop_spion(fu_, plan):
    """fu_.stop_menge durch eine Ausnahme ersetzen: plan = Ausnahme je Kennung (die erste Kennung = Eintrag 0, die nächste Eintrag 1 …; dieselbe Kennung wiederholt ihren Eintrag).
    → Liste der Kennungen in der Reihenfolge ihres ersten Auftretens"""
    gesehen = []

    def stop_menge(symbol, seite, menge, preis, tick, cid=None):
        if cid not in gesehen:
            gesehen.append(cid)
        raise plan[min(gesehen.index(cid), len(plan) - 1)]
    fu_.stop_menge = stop_menge
    return gesehen


class _KennungNicht:
    """_kennung_weg als «lässt sich nicht löschen» (Lösch-Anfrage dauerhaft gestört) — nur in diesem Block"""
    def __enter__(self):
        self.orig = L._kennung_weg
        L._kennung_weg = lambda fut, sym, cid: False

    def __exit__(self, *a):
        L._kennung_weg = self.orig


FEHLER_ = RuntimeError("Binance-Code -1000 boom")
SOFORT_ = RuntimeError("Binance-Code -2021 Order would immediately trigger")
REDUCE_ = RuntimeError("Binance-Code -2022 ReduceOnly Order is rejected")

# (A) _notaus_schutz, fehlender Stop über den ungesicherten Short (cid_f)
k, sp_, fu_, d_ = handlage(coins=0.0, short=0.1)
st_ = {}
gesehen_ = stop_spion(fu_, [FEHLER_])
w_ = []
with _KennungNicht():
    L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -0.1, -0.1, 0.0, 0.0, 100000.0, d_["rs"], w_.append, "echt")
pruefe("15.K-e (A) Not-Aus-Schutz: Schutz-Stop über den ungesicherten Short scheitert, Kennung nicht löschbar → im Buch gemerkt",
       len(gesehen_) == 1 and [None, gesehen_[0]] in (st_.get("perp_weitere") or []), (gesehen_, st_, w_))

# (B) _notaus_schutz, zu grosser Perp-Stop wird ersetzt (cid_n): der passende (0,05) scheitert, der alte (0,1) bleibt stehen
k, sp_, fu_, d_ = handlage(coins=0.05, short=0.1)
fu_.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, d_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
st_ = {}
gesehen_ = stop_spion(fu_, [FEHLER_])
w_ = []
with _KennungNicht():
    L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -0.1, -0.1, 0.05, 0.0, 100000.0, d_["rs"], w_.append, "echt")
pruefe("15.K-e (B) Not-Aus-Schutz: Ersatz für den zu grossen Perp-Stop scheitert, Kennung nicht löschbar → im Buch gemerkt",
       len(gesehen_) >= 1 and [None, gesehen_[0]] in (st_.get("perp_weitere") or []), (gesehen_, st_, w_))

# (C) _notaus_schutz, beidseitig (unklarer Short 0,05): der Stop über 0,15 wird mit −2022 abgelehnt, der über den offenen Short (0,1) scheitert danach anders (cid_k)
k, sp_, fu_, d_ = handlage(coins=0.0, short=0.1)
st_ = {}
gesehen_ = stop_spion(fu_, [REDUCE_, FEHLER_])
w_ = []
with _KennungNicht():
    L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -0.1, -0.1, 0.0, 0.0, 100000.0, d_["rs"], w_.append, "echt", unklar=0.05)
pruefe("15.K-e (C) Not-Aus-Schutz: nach −2022 scheitert auch der Stop über den offenen Short, Kennung nicht löschbar → im Buch gemerkt",
       len(gesehen_) == 2 and [None, gesehen_[1]] in (st_.get("perp_weitere") or []) and [None, gesehen_[0]] not in (st_.get("perp_weitere") or []), (gesehen_, st_, w_))

# (D) _notaus_schutz → markt("perp") → weiter Not-Stop (breiter_notstop): der Schutz-Stop würde sofort auslösen (zweimal −2021), der Rückkauf wird abgelehnt, der WEITE Not-Stop scheitert
k, sp_, fu_, d_ = handlage(coins=0.0, short=0.1)
st_ = {}
gesehen_ = stop_spion(fu_, [SOFORT_, FEHLER_])


def auftrag_abgelehnt_(*a_, **kw_):
    raise RuntimeError("Marktauftrag abgelehnt")


fu_.auftrag = auftrag_abgelehnt_
w_ = []
with _KennungNicht():
    L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -0.1, -0.1, 0.0, 0.0, 100000.0, d_["rs"], w_.append, "echt")
pruefe("15.K-e (D) Not-Aus-Schutz: Rückkauf abgelehnt, auch der WEITE Not-Stop scheitert, Kennung nicht löschbar → im Buch gemerkt",
       len(gesehen_) == 2 and [None, gesehen_[1]] in (st_.get("perp_weitere") or []), (gesehen_, st_, w_))

# (E) _perp_notstop (Rückkauf abgelehnt, Not-Stop 5 % über dem Kurs scheitert), auch nach −2022 mit der kleineren Menge
for was_e, plan_e, wie_viele in (("generisch", [FEHLER_], 1), ("nach −2022 mit der kleineren Menge", [REDUCE_, FEHLER_], 2)):
    k, sp_, fu_, d_ = handlage(coins=0.0, short=0.1)
    st_ = {}
    gesehen_ = stop_spion(fu_, plan_e)
    w_ = []
    d_["rf"] = fu_.regeln("BTCUSDT")
    with _KennungNicht():
        ok_ = L._perp_notstop(fu_, "BTC", d_, st_, 0.15 if len(plan_e) == 2 else 0.1, 100000.0, w_.append, [], "Test", alt_steht=True)  # die alten Stops stehen noch: der Versuch soll weg
    pruefe(f"15.K-e (E) _perp_notstop {was_e}: Not-Stop scheitert (die alten Stops stehen noch), Kennung nicht löschbar → im Buch gemerkt, Markt beidseitig",
           ok_ is False and len(gesehen_) == wie_viele and [None, gesehen_[-1]] in (st_.get("perp_weitere") or []) and d_.get("beidseitig"), (ok_, gesehen_, st_, d_))

# ── Folge-PR zur 14. Runde, Lücken-Kampagne luecken2 (Seeds 100000–103000): E16 (Pilot 2.0), E17/E18 (Prüf-Werkzeug) ──
# 15.E16 (strenger Lücken-Lauf-Seed 102857): ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs (Kurslücke, Konto ohne STOP_LOSS). Der Ausstieg per cancelReplace wird abgelehnt (429), und im selben Markt scheitert die
# Perp-Seite (im Seed: ein unklarer Short, der reduceOnly-Stop wurde abgelehnt, −2022, es gab noch keine Position) — dann blieb der hängende Stop bis zur Nachkontrolle ohne Ersatz, denn der Not-Stop an seiner Stelle wurde
# nur gesetzt, wenn gar nichts scheiterte. Jetzt nur noch dann nicht, wenn der Kontostand nicht lesbar war. Hier scheitert die Perp-Seite von Hand (der Abgleich wirft), der Rest läuft wie im Seed.
k = neues_konto(20000)                                   # setzt die Börse zurück: erst danach die Schalter
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
env = env_echt(kapital=20000)
lauf([E("BTC", 0.25)], env, d)                           # ein Long mit seinem Stop-Limit
B.bewegen("BTCUSDT", round(B.kurs["BTCUSDT"] * 0.6, 2))  # Lücke unter das Limit: der Stop löst aus und hängt
g0 = lage(k, "BTCUSDT")
orig_pa_ = L._perp_abgleich


def perp_wirft_(*a_, **kw_):
    raise RuntimeError("Binance-Code -2022 ReduceOnly Order is rejected (Test: die Perp-Seite scheitert)")


L._perp_abgleich = perp_wirft_
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=1)]
try:
    r = lauf([E("BTC", 0.25)], env, d)
finally:
    L._perp_abgleich = orig_pa_
    B.regeln = []
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
g1 = lage(k, "BTCUSDT")
hing_ = P._haengend(k, "BTCUSDT")
pruefe("15.E16 hängender Stop-Limit + Ausstieg abgelehnt + Perp-Seite gescheitert: an seiner Stelle steht ein Not-Stop, die Netto-Richtung ist gestoppt",
       any("Perp-Stop nicht gesetzt" in z for z in r["zeilen"]) and hing_ == 0 and g1["s_qty"] >= g1["netto"] - 1e-4,
       (g0, g1, hing_, [z[:160] for z in r["zeilen"]]))

# 15.E17 (strenger Lücken-Lauf-Seed 102030): das Prüf-Werkzeug stufte im beidseitigen Zweig jeden Long-Rest über der Toleranz als echten Befund ein — im einseitigen gilt bis STAUB_MAX_USDT (10) Staub
# («darunter kann Binance nichts mehr absichern»: der Rest liegt am Stop-Kurs oft unter dem Mindestbetrag von 5 USDT). Seed 102030: 7,3 USDT ETH nach dem Rückkauf des Shorts, am Stop-Kurs 4,7 USDT.
k = neues_konto(20000)
B.bewegen("ETHUSDT", 3554.14)
cfg_ = L.einstellungen(env_echt())
sp_ = L.Spot(cfg_["spot"])
rs_ = sp_.regeln2("ETHUSDT")
k.frei["ETH"] = 0.227153
sp_.stop_verkauf("ETHUSDT", 0.2251, 2594.42, rs_, cid=L._kennung(L.CID_STOP_SPOT))
b_ = {x[0]: x for x in P.schutz_befunde(k, {"ETHUSDT": 0.0})}
pruefe("15.E17 beidseitig: 7,3 USDT Long ohne Stop sind Staub (STAUB_LONG_OHNE_STOP), kein echter Befund",
       "STAUB_LONG_OHNE_STOP" in b_ and "LONG_OHNE_STOP" not in b_ and not P.echte(list(b_.values())), b_)
k.frei["ETH"] = 0.227153 + 0.005                                   # 0,0071 ETH ohne Stop = 25 USDT: echt
b_ = {x[0]: x for x in P.schutz_befunde(k, {"ETHUSDT": 0.0})}
pruefe("15.E17 beidseitig: 25 USDT Long ohne Stop bleiben ein echter Befund (LONG_OHNE_STOP)", "LONG_OHNE_STOP" in b_ and P.echte(list(b_.values())), b_)

# 15.E18 (Lücken-Lauf-Seed 100890): der Folgeschaden-Test (Kurs springt unter alle sichtbaren Spot-Stops) wertete den über dem Kurs hängenden STOP_LOSS_LIMIT, den Pilot 2.0 nicht sehen konnte (die Liste war seit
# seinem Hängen nicht mehr lesbar), als echten Befund — bei der Prüfung vor dem Sprung galt dieselbe Lücke als LIMIT_LUECKE_ (Konto ohne STOP_LOSS, bekanntes Restrisiko).
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
B.bewegen("BTCUSDT", 100000.0)
cfg_ = L.einstellungen(env_echt())
sp_ = L.Spot(cfg_["spot"])
rs_ = sp_.regeln2("BTCUSDT")
k.frei["BTC"] = 0.06
sp_.stop_verkauf("BTCUSDT", 0.01, 50000.0, rs_, cid=L._kennung(L.CID_STOP_SPOT))     # sichtbar und gesund (liegt unter dem Sprung)
sp_.stop_verkauf("BTCUSDT", 0.05, 90000.0, rs_, cid=L._kennung(L.CID_STOP_SPOT))     # wird hängen
B.bewegen("BTCUSDT", 70000.0)                                       # Lücke unter beide Limits: der zweite löst aus (hängt), der erste noch nicht
B.liste_takt["BTCUSDT"] = -1                                       # Pilot 2.0 hat die Liste seit dem Sprung nicht gesehen
f_ = P.folgeschaden(k)
pruefe("15.E18 Folgeschaden mit hängendem Stop-Limit, Liste seit dem Hängen nicht gesehen: LIMIT_LUECKE_ (bekanntes Restrisiko), kein echter Befund",
       f_ and all("LIMIT_LUECKE_" in x[0] for x in f_) and not P.echte(f_), f_)
B.liste_takt["BTCUSDT"] = B.takt + 5                               # er hat die Liste NACH dem Sprung gesehen: echter Befund
f_ = P.folgeschaden(k)
pruefe("15.E18 Folgeschaden, Liste nach dem Hängen gesehen: bleibt ein echter Befund (NACH_SPRUNG_LONG_OHNE_STOP)",
       f_ and any(x[0] == "NACH_SPRUNG_LONG_OHNE_STOP" for x in f_) and P.echte(f_), f_)
B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]

# ── Folge-PR zur 14. Runde, Schlusskampagne `camp15a` (Lücken-Läufe 112000–113000 streng): E19 und E21 (Pilot 2.0), E20 (Prüf-Werkzeug) ──
# 15.E19 (strenger Lücken-Lauf-Seed 112159, 6'238 USDT): ein ausgelöster STOP_LOSS_LIMIT hängt (Kurslücke, Konto ohne STOP_LOSS), cancelReplace ist gestört (503: unklar). Der Rückfall am Ende löscht den hängenden
# Stop normal — das Löschen kommt an, aber die Antwort geht verloren (Verbindungsabriss), die Wiederholung meldet «−2011 unbekannt». Pilot 2.0 las das als «war schon weg: einer der unklaren Versuche kam an» und setzte
# keinen Not-Stop: die freigegebenen Coins standen ohne Stop da. Jetzt zählt, was das Löschen tatsächlich freigegeben hat (freie Coins vor und nach dem Löschen).
k = neues_konto(20000)                                   # setzt die Börse zurück: erst danach die Schalter
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
env = env_echt(kapital=20000)
lauf([E("BTC", 0.25)], env, d)                           # ein Long mit seinem Stop-Limit
B.bewegen("BTCUSDT", round(B.kurs["BTCUSDT"] * 0.6, 2))  # Lücke unter das Limit: der Stop löst aus und hängt
g0 = lage(k, "BTCUSDT")
hing0_ = P._haengend(k, "BTCUSDT")
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=99),
            regel(methode="DELETE", pfad="/api/v3/order", art="abriss", anzahl=1)]
try:
    r = lauf([E("BTC", 0.25)], env, d)
finally:
    B.regeln = []
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
g1 = lage(k, "BTCUSDT")
pruefe("15.E19 hängender Stop-Limit: Löschen kommt an, Antwort verloren (−2011 beim Wiederholen) — die freigegebenen Coins bekommen trotzdem ihren Not-Stop",
       hing0_ > 0 and P._haengend(k, "BTCUSDT") == 0 and not befunde(k, d),
       (g0, g1, hing0_, round(k.frei["BTC"], 6), [(x[0], x[-2:]) for x in befunde(k, d)], [z[:170] for z in r["zeilen"]]))

# 15.E20 (strenger Lücken-Lauf-Seed 112196, 197 USDT): ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs UND die Auftragsliste zeigt ihn wegen der Verzögerung noch gar nicht — Pilot 2.0 hält die gesperrten Coins für
# einen gesunden, nur noch unsichtbaren Stop (E2) und konnte vom Hängen nichts wissen. Das ist dieselbe bekannte Limit-Lücke wie bei einer seit dem Hängen nicht gelesenen Liste (LIMIT_LUECKE_), kein echter Befund.
k = neues_konto(20000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
B.bewegen("BTCUSDT", 100000.0)
cfg_ = L.einstellungen(env_echt())
sp_ = L.Spot(cfg_["spot"])
rs_ = sp_.regeln2("BTCUSDT")
k.frei["BTC"] = 0.05
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="unsichtbar", listen=50)]
try:
    sp_.stop_verkauf("BTCUSDT", 0.05, 90000.0, rs_, cid=L._kennung(L.CID_STOP_SPOT))   # für 50 Listenabfragen unsichtbar (die Antwort geht dabei verloren: 503)
except Exception:  # noqa: BLE001
    pass
B.regeln = []
B.bewegen("BTCUSDT", 70000.0)                                       # der Stop löst aus und hängt (Limit 85'500 über dem Kurs)
sp_.offene("BTCUSDT")                                               # Pilot 2.0 liest die Liste: der hängende Stop steht (noch) nicht darin
b_ = P.schutz_befunde(k, {})
pruefe("15.E20 hängender Stop-Limit, in der letzten Liste wegen der Verzögerung nicht zu sehen: LIMIT_LUECKE_ (bekanntes Restrisiko), kein echter Befund",
       b_ and all("LIMIT_LUECKE_" in x[0] for x in b_) and not P.echte(b_) and P._haengend_unsichtbar(k, "BTCUSDT") > 0.04, (b_, P._haengend_unsichtbar(k, "BTCUSDT")))
B.n_listen += 100                                                   # die Verzögerung ist vorbei, Pilot 2.0 liest die Liste erneut: jetzt steht der hängende Stop darin
sp_.offene("BTCUSDT")
b_ = P.schutz_befunde(k, {})
pruefe("15.E20 dieselbe Lage, Liste NACH der Verzögerung gelesen: bleibt ein echter Befund (LONG_OHNE_STOP)",
       any(x[0] == "LONG_OHNE_STOP" for x in b_) and P.echte(b_) and P._haengend_unsichtbar(k, "BTCUSDT") == 0, (b_, P._haengend_unsichtbar(k, "BTCUSDT")))
B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]

# 15.E21 (strenger Lücken-Lauf-Seed 112383, 1'008 USDT): der Kurs liegt schon über dem Stop-Kurs des Richtungs-Shorts, der Rückkauf wird in den ersten drei Abgleich-Runden mit 429 abgelehnt und kommt erst in der DRITTEN (letzten)
# Runde unklar (spaet_u) ins Buch — der Markt braucht damit beidseitigen Schutz (Spot-Stop über alle Coins, der Not-Stop über den ganzen Short deckt sonst die Absicherung), aber es gab keine Runde mehr dafür:
# der Perp-Not-Stop über den ganzen Short stand, die Coins nicht. Jetzt gibt es dafür Schlussrunden (höchstens zwei).
k = neues_konto(2500)
d = neu_buch()
env = env_echt(kapital=2500)
lauf([E("BTC", -0.5)], env, d)
g0 = lage(k, "BTCUSDT")
B.bewegen("BTCUSDT", round(B.kurs["BTCUSDT"] * 0.93, 2))            # der Kurs fällt, die Ernte läuft weiter
e2 = {"markt": "BTC", "hebel": 0.706, "stop_long": B.kurs["BTCUSDT"] * 0.9, "stop_short": B.kurs["BTCUSDT"] * 0.97, "stand": "x"}   # Richtungs-Short: sein Stop-Kurs liegt UNTER dem Kurs
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="429", anzahl=3), regel(methode="POST", pfad="/fapi/v1/order", pred=REDUCE, art="spaet_u", anzahl=1)]
try:
    r = lauf([e2], env, d)
finally:
    B.regeln = []
g1 = lage(k, "BTCUSDT")
b_ = befunde(k, d)
pruefe("15.E21 unklarer Rückkauf kommt erst in der letzten Abgleich-Runde ins Buch: der Markt wird noch beidseitig gesichert (Spot-Stop über alle Coins), nichts ungesichert",
       not b_ and any("Rückkauf unklar" in z for z in r["zeilen"]), (g0, g1, [(x[0], x[-2:]) for x in b_], [z[:140] for z in r["zeilen"]]))

# Die drei echten Befunde der Lücken-Kampagne (nach E8–E15): Seed 100890 (E18: Prüf-Werkzeug), 102030 (E17: Prüf-Werkzeug), 102857 (E16: Pilot 2.0)
for was_s, streng_s, seed_s in (("Lauf-Seed 100890 (Lücken, Standard)", False, 100890), ("strenger Lauf-Seed 102030 (Lücken)", True, 102030), ("strenger Lauf-Seed 102857 (Lücken)", True, 102857),
                                ("strenger Lauf-Seed 112159 (Lücken, E19)", True, 112159), ("strenger Lauf-Seed 112196 (Lücken, E20)", True, 112196),
                                ("strenger Lauf-Seed 112383 (Lücken, E21)", True, 112383)):
    P.STRENG, P.LUECKEN = streng_s, True
    try:
        funde = P.echte(P.laeufe_runde(seed_s, 30))
    finally:
        P.STRENG = P.LUECKEN = False
        B.reduce_algo_streng = False
    pruefe(f"15.E16–E21 {was_s}: keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:4])


# ───────── Folge-PR, Schlusskampagne camp15f: E26/E27 (Not-Aus-Fuzzer, strenger Lücken-Modus) ─────────
# 15.E26 (Not-Aus-Fuzzer Lücken+streng, Seed 117727): ein Perp-Stop kam an, die Antwort ging verloren (nach503), jede Wiederholung scheitert am Rate-Limit
# (429) — der «Geister-Stop» wurde über seine Kennung gelöscht und war der EINZIGE Schutz des Shorts (1'669 USDT ohne Stop). Ein vielleicht angekommener
# Stop darf nur gelöscht werden, wenn ein anderer Stop dieselbe Menge schon deckt; sonst bleibt er stehen und wird im Buch vermerkt.
def na_(coins=0.017, short=0.017, kurs=100000.0, unklar=0.0, stop_alt=None, regeln=None, stale=False):
    k_, sp_, fu_, dd_ = handlage(coins=coins, short=short, kurs=kurs)
    if stop_alt:
        rf_ = fu_.regeln("BTCUSDT")
        fu_.stop_menge("BTCUSDT", "BUY", stop_alt, kurs * 1.3, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
    st_, w_ = {}, []
    B.regeln = list(regeln or [])
    try:
        ok_ = L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -short, -short, coins, 0.0, kurs, dd_["rs"], w_.append, "echt", unklar,
                               buch={}, erg={"zeilen": [], "auftraege": []})
    finally:
        B.regeln = []
    return k_, st_, w_, ok_

GEIST = lambda: [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]  # frische Regeln je Aufruf (anzahl wird verbraucht)
k, st, w, ok = na_(regeln=GEIST())
g = lage(k, "BTCUSDT")
pruefe("15.E26a Not-Aus beidseitig: der angekommene Perp-Stop (Antwort verloren, Wiederholungen am Rate-Limit) wird NICHT gelöscht — er ist der einzige Schutz des Shorts",
       g["p_qty"] >= 0.016 and not befunde(k), (g, w, befunde(k)))
pruefe("15.E26a der Geister-Stop steht im Buch (Gedächtnis), der Not-Aus meldet «nicht gesichert» laut",
       any(c_ and str(c_).startswith(L.CID_STOP_PERP) for _a, c_ in [(x[0], x[1]) for x in (st.get("perp_weitere") or [])] + [(st.get("perp"), st.get("perp_cid"))])
       and ok is False and any("ungesichert" in x or "OHNE Stop" in x for x in w), (st, ok, w))
# Gegenprobe: ein zu grosser alter Stop steht (deckt den Short ganz) und der passende neue scheitert: der Geister-Stop darf (und soll) gelöscht werden — der alte schützt
k, st, w, ok = na_(coins=0.05, short=0.10, unklar=None, stop_alt=0.10, regeln=GEIST())
g2 = lage(k, "BTCUSDT")
pruefe("15.E26a' ein anderer Stop deckt den Short (zu gross): der Geister-Stop des Ersatzes wird gelöscht, der alte schützt weiter", g2["n_p"] == 1 and abs(g2["p_qty"] - 0.10) < 0.0015, (g2, w, st))

# b) _perp_notstop (Rückkauf abgelehnt, alte Stops schon gelöscht): derselbe Geister-Stop bleibt; stehen die alten noch (alt_steht), wird er gelöscht
for steht_, erwartet_ in ((False, True), (True, False)):
    k, sp, fu, dd = handlage(coins=0.0, short=0.017, kurs=100000.0)
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
    st_, w_ = {}, []
    try:
        ok_ = L._perp_notstop(fu, "BTC", {"sym": "BTCUSDT", "rf": fu.regeln("BTCUSDT")}, st_, 0.017, 100000.0, w_.append, [], "Test", alt_steht=steht_)
    finally:
        B.regeln = []
    g = lage(k, "BTCUSDT")
    pruefe(f"15.E26b _perp_notstop(alt_steht={steht_}): der vielleicht angekommene Not-Stop " + ("bleibt (einziger Schutz) und steht im Buch" if erwartet_ else "wird gelöscht (der alte schützt)"),
           ok_ is False and ((g["p_qty"] >= 0.016 and bool(st_.get("perp_weitere"))) if erwartet_ else (g["p_qty"] == 0 and not st_.get("perp_weitere"))), (ok_, g, st_, w_))

# c) Tageslauf: ein Richtungs-Short bekommt seinen Stop — der erste Versuch kommt an (Antwort verloren), alle weiteren am Rate-Limit: der Stop bleibt (nicht gelöscht)
for liste_weg_ in (False, True):
    k = neues_konto(20000)
    d = neu_buch()
    env_ = env_echt(kapital=20000)
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)] \
        + ([regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", pred=lambda m, p, q: k.pos["ETHUSDT"] < 0, art="429", anzahl=99)] if liste_weg_ else [])
    try:
        r = lauf([E("ETH", -0.5)], env_, d)
    finally:
        B.regeln = []
    g = lage(k, "ETHUSDT")
    pruefe(f"15.E26c Tageslauf{' mit unlesbarer Perp-Liste' if liste_weg_ else ''}: der angekommene Perp-Stop (Antwort verloren, Wiederholungen am Rate-Limit) bleibt — der Short hat seinen Stop",
           g["pos"] < 0 and g["p_qty"] > 0 and not befunde(k, d), (g, r["zeilen"][-4:], befunde(k, d)))
    pruefe(f"15.E26c Tageslauf{' (Liste unlesbar)' if liste_weg_ else ''}: der Lauf warnt laut und stösst die Nachkontrolle an (schutz_offen)",
           r.get("warnung") and "ETH" in (buch13(d).get("schutz_offen") or []), (r.get("warnung"), buch13(d).get("schutz_offen")))

# d) breiter_notstop: Kurs gesprungen (Markt 115'000, der Not-Aus kennt nur 100'000, kein frischer Kurs lesbar) → zum Markt: Rückkauf am Rate-Limit → WEITER Not-Stop; er kommt an, die Antwort geht verloren
k, sp, fu, dd = handlage(coins=0.0, short=0.017, kurs=100000.0)
k.fut = 20000.0  # Futures-Guthaben, sonst würde der Short beim Kurssprung zwangsgeschlossen
B.bewegen("BTCUSDT", 115000.0)
hoch_ = lambda m, p, q: float(q.get("triggerPrice", 0)) >= 119000  # noqa: E731
B.regeln = list(KURS_WEG) + [regel(methode="POST", pfad="/fapi/v1/order", art="429", anzahl=99),
                              regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=hoch_, art="nach503", anzahl=1),
                              regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=hoch_, art="429", anzahl=99)]
st_, w_ = {}, []
try:
    ok_ = L._notaus_schutz(sp, fu, st_, "BTC", "BTCUSDT", "BTC", -0.017, -0.017, 0.0, 0.0, 100000.0, dd["rs"], w_.append, "echt", None,
                           buch={}, erg={"zeilen": [], "auftraege": []})
finally:
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("15.E26d breiter_notstop: der weite Not-Stop kam an (Antwort verloren, Wiederholungen am Rate-Limit) und bleibt — der Short hat einen Stop, das Buch kennt ihn",
       g["p_qty"] >= 0.016 and bool(st_.get("perp_weitere")), (ok_, g, st_, w_))

# i) _geisterstop() einzeln: Löschen klappt → True, nichts gemerkt; Löschen scheitert → False, gemerkt, beidseitig; ohne Deckung (deckt=False) → nie löschen, gemerkt, neue Runde
orig_kw_ = L._kennung_weg
loesch_ = []
try:
    L._kennung_weg = lambda fut, sym, cid: loesch_.append(cid) or True
    st_, d_ = {}, {}
    r1_ = L._geisterstop(None, "BTCUSDT", "p2aA", st_, d_, deckt=True)
    pruefe("15.E26i _geisterstop(deckt=True), Löschen klappt: True, nichts gemerkt, nicht beidseitig", r1_ is True and loesch_ == ["p2aA"] and not st_ and not d_, (r1_, loesch_, st_, d_))
    L._kennung_weg = lambda fut, sym, cid: False
    st_, d_ = {}, {}
    r2_ = L._geisterstop(None, "BTCUSDT", "p2aB", st_, d_, deckt=True)
    pruefe("15.E26i _geisterstop(deckt=True), Löschen scheitert: False, im Buch gemerkt, beidseitig + neue Runde", r2_ is False and st_.get("perp_weitere") == [[None, "p2aB"]] and d_ == {"beidseitig": True, "neue_runde": True}, (r2_, st_, d_))
    L._kennung_weg = lambda fut, sym, cid: loesch_.append("NIE") or True
    loesch_.clear()
    st_, d_ = {}, {}
    r3_ = L._geisterstop(None, "BTCUSDT", "p2aC", st_, d_, deckt=False)
    pruefe("15.E26i _geisterstop(deckt=False): nie gelöscht, gemerkt, neue Runde, NICHT beidseitig (kein zweiter Stop bekannt)", r3_ is False and not loesch_ and st_.get("perp_weitere") == [[None, "p2aC"]] and d_ == {"neue_runde": True}, (r3_, loesch_, st_, d_))
    st_ = {}
    r5_ = L._geisterstop(None, "BTCUSDT", "p2aE", st_, None, deckt=False)
    pruefe("15.E26i _geisterstop ohne Markt-Dict (Not-Aus): nur gemerkt, kein Fehler", r5_ is False and st_.get("perp_weitere") == [[None, "p2aE"]] and not loesch_, (r5_, st_))
finally:
    L._kennung_weg = orig_kw_

# e) Tageslauf, der alte Stop deckt den gewachsenen Short nur teilweise, der passende neue kommt (Antwort verloren) an, jede Wiederholung am Rate-Limit: der Geister-Stop bleibt, daneben der alte → zusammen
# mindestens der ganze Short, also beidseitig gesichert (Spot-Stop über alle Coins), nichts ungesichert
k = neues_konto(20000)
d = neu_buch()
env_ = env_echt(kapital=20000)
lauf([E("ETH", -0.25)], env_, d)
g1 = lage(k, "ETHUSDT")
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
try:
    r = lauf([E("ETH", -0.75)], env_, d)
finally:
    B.regeln = []
g2 = lage(k, "ETHUSDT")
b_ = befunde(k, d)
pruefe("15.E26e alter Stop deckt den gewachsenen Short nur teilweise, der neue kommt (Geister-Stop) an: der Geister-Stop wird übernommen (er deckt den ganzen Bedarf), der zu kleine alte gelöscht — nichts ungesichert",
       g2["n_p"] == 1 and abs(g2["p_qty"] - max(0.0, -g2["netto"])) < 0.003 and not b_, (g1, g2, b_))

# e2) Raster --geist, Szenario BTC −0,25 → 0,0 (der Richtungs-Short wird heute abgebaut): Vorab setzt den kleineren Perp-Stop, er kommt an (Antwort verloren), jede Wiederholung scheitert (429). Der Geister-Stop bleibt, die
# nächste Runde sieht ihn in der Liste und löscht den ZU GROSSEN alten (er ist genau der Stop, den der Plan wollte) — vorher wurde er gelöscht, «beidseitig» verlangte danach den ganzen Short: 3'920 USDT ohne Stop
k = neues_konto(20000)
d = neu_buch()
env_ = env_echt(kapital=20000)
lauf([E("BTC", -0.25)], env_, d)
for s_ in P.SYMS:
    B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
try:
    r = lauf([E("BTC", 0.0)], env_, d)
finally:
    B.regeln = []
g = lage(k, "BTCUSDT")
b_ = befunde(k, d)
pruefe("15.E26e2 Richtungs-Short wird abgebaut, kleinerer Perp-Stop kommt an (Antwort verloren), Wiederholungen am Rate-Limit: der Geister-Stop wird übernommen, der zu grosse alte gelöscht — genau ein Perp-Stop, nichts ungesichert",
       g["n_p"] == 1 and not b_ and abs(g["p_qty"] - max(0.0, -g["netto"])) < 0.0015, (g, [(x[0], x[-2:]) for x in b_], [z[:120] for z in r["zeilen"]]))

# f) Not-Aus, Perp-Liste unlesbar, das Buch kennt einen alten Stop (0,10, deckt den Short ganz): der Ersatz scheitert (Geister-Stop kam an, Wiederholungen am Rate-Limit) — wie bisher wird der Geister-Stop
# über seine Kennung gelöscht, der bekannte alte schützt (nur ohne ihn bliebe der Geister-Stop stehen, E26)
k, sp, fu, dd = handlage(coins=0.05, short=0.10, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
r_alt = fu.stop_menge("BTCUSDT", "BUY", 0.05, 130000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
st_ = {"perp": r_alt.get("algoId"), "perp_cid": r_alt.get("cid") or r_alt.get("clientAlgoId"), "p_short": 130000.0}
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="429", anzahl=999),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
w_ = []
try:
    ok_ = L._notaus_schutz(sp, fu, st_, "BTC", "BTCUSDT", "BTC", -0.10, -0.10, 0.05, 0.0, 100000.0, dd["rs"], w_.append, "echt", None, buch={}, erg={"zeilen": [], "auftraege": []})
finally:
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("15.E26f Not-Aus, Perp-Liste unlesbar, das Buch kennt einen alten Stop + Geister-Stop: der Geister-Stop wird gelöscht (wie bisher), der alte steht allein",
       g["n_p"] == 1 and abs(g["p_qty"] - 0.05) < 0.0015 and not (st_.get("perp_weitere") or []) , (g, w_, st_))

# g) _perp_ohne_liste (Perp-Liste unlesbar): kennt das Buch einen bisherigen Stop (steht auch an der Börse) und deckt er den heutigen Bedarf noch (der Short ist heute nicht gewachsen), wird der Geister-Stop des
# gescheiterten Ersatzes gelöscht (wie bisher, der bisherige schützt). Ist der Short heute gewachsen (die Aufträge des Laufs: Perp SELL), deckt der bisherige nur einen Teil → der Geister-Stop bleibt; kennt das
# Buch keinen, bleibt er ebenfalls (E26). Rasterbefund --geist: ETH 0 → −0,5, Liste unlesbar: 4'828 USDT ohne Stop nach dem Löschen.
for bekannt_, gewachsen_ in ((True, False), (True, True), (False, False)):
    k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
    rf_ = fu.regeln("BTCUSDT")
    st_ = {}
    if bekannt_:
        groesse_ = 0.1 if gewachsen_ else 0.3          # gewachsen: der bisherige Stop deckt nur die gestrigen 0,1 des heute auf 0,3 gewachsenen Shorts
        r_alt = fu.stop_menge("BTCUSDT", "BUY", groesse_, 110000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
        st_ = {"perp": r_alt.get("algoId"), "perp_cid": r_alt.get("cid") or r_alt.get("clientAlgoId"), "p_short": 110000.0}
    s_ = L._soll(0.0, -0.3, 100000.0, dd)
    s_.update(frei=0.0, gebunden=0.0)
    d_ = dict(dd)
    w_ = []
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
    try:
        L._perp_ohne_liste(fu, "BTC", d_, st_, {"stop_short": 115000.0}, s_, w_.append, [], gewachsen_, RuntimeError("Liste nicht lesbar"),
                           {"auftraege": [("BTC", "perp", "SELL", 0.2)] if gewachsen_ else []}, lambda w=None: L._lage(sp, fu, dd, w))
    finally:
        B.regeln = []
    g = lage(k, "BTCUSDT")
    if bekannt_ and not gewachsen_:
        pruefe("15.E26g _perp_ohne_liste, das Buch kennt einen bisherigen Stop, der Short ist heute nicht gewachsen: der Geister-Stop des Ersatzes wird gelöscht, der bisherige steht allein (nicht beidseitig)",
               g["n_p"] == 1 and abs(g["p_qty"] - 0.3) < 0.002 and not st_.get("perp_weitere") and not d_.get("beidseitig"), (g, st_, d_, w_))
    elif bekannt_:
        pruefe("15.E26g _perp_ohne_liste, das Buch kennt einen bisherigen Stop, der Short ist heute gewachsen (der bisherige deckt nur einen Teil): der Geister-Stop bleibt und steht im Buch",
               g["n_p"] == 2 and abs(g["p_qty"] - 0.4) < 0.003 and bool(st_.get("perp_weitere")) and not d_.get("beidseitig"), (g, st_, d_, w_))
    else:
        pruefe("15.E26g _perp_ohne_liste, das Buch kennt keinen Stop: der Geister-Stop bleibt (einziger Schutz) und steht im Buch",
               g["n_p"] == 1 and abs(g["p_qty"] - 0.3) < 0.002 and bool(st_.get("perp_weitere")) and d_.get("neue_runde"), (g, st_, d_, w_))

# g2) Paar gewachsen: heute kamen 0,2 Coins und 0,2 Short als Absicherung dazu (Netto-Short unverändert 0,3): der bisherige Stop deckt den Bedarf weiter → der Geister-Stop wird gelöscht
k, sp, fu, dd = handlage(coins=0.2, short=0.5, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
r_alt = fu.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
st_ = {"perp": r_alt.get("algoId"), "perp_cid": r_alt.get("cid") or r_alt.get("clientAlgoId"), "p_short": 110000.0}
s_ = L._soll(0.2, -0.5, 100000.0, dd)
s_.update(frei=0.2, gebunden=0.0)
d_ = dict(dd)
w_ = []
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
try:
    L._perp_ohne_liste(fu, "BTC", d_, st_, {"stop_short": 115000.0}, s_, w_.append, [], True, RuntimeError("Liste nicht lesbar"),
                       {"auftraege": [("BTC", "spot", "BUY", 0.2), ("BTC", "perp", "SELL", 0.2)]}, lambda w=None: L._lage(sp, fu, dd, w))
finally:
    B.regeln = []
g = lage(k, "BTCUSDT")
pruefe("15.E26g2 _perp_ohne_liste, heute kam nur Absicherung dazu (Coins und Short gleich viel): der bisherige Stop deckt den Netto-Short weiter → der Geister-Stop wird gelöscht",
       g["n_p"] == 1 and abs(g["p_qty"] - 0.3) < 0.002 and not st_.get("perp_weitere"), (g, s_.get("stop_perp"), st_, w_))

# g3) _alt_deckt(): der Bedarf ist auf Futures-Schritte AUFgerundet — kein Wachstum, aber der Bedarf liegt bis zu einen Schritt über dem Netto-Short: gedeckt; echtes Wachstum (0,2): nicht gedeckt
s_r_ = {"pos": -0.5, "frei": 0.2999, "gebunden": 0.0, "stop_perp": 0.201}
pruefe("15.E26g3 _alt_deckt(): Aufrunden des Bedarfs auf den Futures-Schritt (kein Wachstum) gilt als gedeckt, echtes Wachstum um 0,2 nicht",
       L._alt_deckt({"auftraege": []}, "BTC", s_r_, 0.001) and not L._alt_deckt({"auftraege": [("BTC", "perp", "SELL", 0.2)]}, "BTC", {"pos": -0.5, "frei": 0.0, "gebunden": 0.0, "stop_perp": 0.5}, 0.001),
       (L._alt_deckt({"auftraege": []}, "BTC", s_r_, 0.001), L._alt_deckt({"auftraege": [("BTC", "perp", "SELL", 0.2)]}, "BTC", {"pos": -0.5, "frei": 0.0, "gebunden": 0.0, "stop_perp": 0.5}, 0.001)))

# h2) Not-Aus beidseitig mit unklarem Short, Perp-Liste unlesbar, das Buch kennt einen bisherigen Stop: der kleinere Schutz-Stop (cid_k) scheitert nach −2022 → sein Geister-Stop bleibt (beidseitig verlangt den ganzen Short)
k, sp, fu, dd = handlage(coins=0.017, short=0.017, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
r_alt = fu.stop_menge("BTCUSDT", "BUY", 0.017, 130000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
st_ = {"perp": r_alt.get("algoId"), "perp_cid": r_alt.get("cid") or r_alt.get("clientAlgoId"), "p_short": 130000.0}
klein_ = lambda m, p, q: float(q.get("quantity", 0)) < 0.02  # noqa: E731
B.reduce_algo_streng = True
B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="429", anzahl=999),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=klein_, art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=klein_, art="429", anzahl=99)]
w_ = []
try:
    L._notaus_schutz(sp, fu, st_, "BTC", "BTCUSDT", "BTC", -0.017, -0.017, 0.017, 0.0, 100000.0, dd["rs"], w_.append, "echt", 0.017, buch={}, erg={"zeilen": [], "auftraege": []})
finally:
    B.regeln = []
    B.reduce_algo_streng = False
g = lage(k, "BTCUSDT")
pruefe("15.E26h2 Not-Aus beidseitig (unklarer Short), Perp-Liste unlesbar, das Buch kennt einen bisherigen Stop: der Geister-Stop des kleineren Schutz-Stops bleibt — beide zusammen decken den ganzen Short (der bisherige nur einen Teil)",
       g["n_p"] == 2 and bool(st_.get("perp_weitere")), (g, st_, w_))

# h) Not-Aus beidseitig mit einem unklaren Short-Auftrag (0,017 mehr): Binance lehnt den Stop über 0,034 (mehr als der offene Short) mit −2022 ab → wenigstens den offenen Short (0,017) sichern; dieser
# kleinere Stop kommt an (Antwort verloren), jede Wiederholung am Rate-Limit: er bleibt (einziger Schutz)
k, sp, fu, dd = handlage(coins=0.017, short=0.017, kurs=100000.0)
klein_ = lambda m, p, q: float(q.get("quantity", 0)) < 0.02  # noqa: E731
B.reduce_algo_streng = True
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=klein_, art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", pred=klein_, art="429", anzahl=99)]
st_, w_ = {}, []
try:
    ok_ = L._notaus_schutz(sp, fu, st_, "BTC", "BTCUSDT", "BTC", -0.017, -0.017, 0.017, 0.0, 100000.0, dd["rs"], w_.append, "echt", 0.017, buch={}, erg={"zeilen": [], "auftraege": []})
finally:
    B.regeln = []
    B.reduce_algo_streng = False
g = lage(k, "BTCUSDT")
pruefe("15.E26h Not-Aus, Stop über offenen + unklaren Short mit −2022 abgelehnt, der kleinere (offene Short) kommt an (Antwort verloren): er bleibt stehen",
       g["p_qty"] >= 0.016 and bool(st_.get("perp_weitere")), (ok_, g, st_, w_))

# i) Not-Aus beidseitig (ganz), Perp-Liste unlesbar, das Buch kennt einen bisherigen Stop, der nur einen TEIL des Shorts deckt (0,02 von 0,05): der Stop über den GANZEN Short kommt an (Antwort verloren), jede
# Wiederholung scheitert am Rate-Limit — er bleibt stehen und steht im Buch (Rasterbefund --geist --notaus, Marktverkauf tot: 2'222 USDT ohne Stop). Nicht «ganz» (Netto-Short, der bisherige deckt ihn schon voll):
# der Geister-Stop wird wie bisher gelöscht — der bisherige schützt
for ganz_i, coins_i, alt_i, erw_i in ((True, 0.05, 0.02, "bleibt (der bisherige deckt nur einen Teil des ganzen Shorts)"), (False, 0.0, 0.05, "wird gelöscht (der bisherige deckt den Netto-Short ganz)")):
    k, sp, fu, dd = handlage(coins=coins_i, short=0.05, kurs=100000.0)
    rf_ = fu.regeln("BTCUSDT")
    r_alt = fu.stop_menge("BTCUSDT", "BUY", alt_i, 130000.0, rf_["tick"], cid=L._kennung(L.CID_STOP_PERP))
    st_ = {"perp": r_alt.get("algoId"), "perp_cid": r_alt.get("cid") or r_alt.get("clientAlgoId"), "p_short": 130000.0}
    B.regeln = [regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="429", anzahl=999),
                regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
    w_ = []
    try:
        L._notaus_schutz(sp, fu, st_, "BTC", "BTCUSDT", "BTC", -0.05, -0.05, coins_i, 0.0, 100000.0, dd["rs"], w_.append, "echt", 0.0 if ganz_i else None,
                         buch={}, erg={"zeilen": [], "auftraege": []})
    finally:
        B.regeln = []
    g = lage(k, "BTCUSDT")
    if ganz_i:
        pruefe(f"15.E26i Not-Aus beidseitig, Perp-Liste unlesbar, bisheriger Stop 0,02 von 0,05: der Geister-Stop über den ganzen Short {erw_i}, im Buch",
               g["n_p"] == 2 and g["p_qty"] >= 0.05 - 1e-9 and bool(st_.get("perp_weitere")), (g, st_, w_))
        pruefe("15.E26i … und nach beiden Auslösungen bleibt kein Short ohne Coins und ohne Stop", not befunde(k), (g, befunde(k), w_))
    else:
        pruefe(f"15.E26i Not-Aus nicht beidseitig, Perp-Liste unlesbar, bisheriger Stop 0,05 = Netto-Short: der Geister-Stop {erw_i}",
               g["n_p"] == 1 and abs(g["p_qty"] - 0.05) < 0.002 and not st_.get("perp_weitere"), (g, st_, w_))

# 15.E27 (Not-Aus-Fuzzer Lücken+streng, Seed 117974): ein alter Spot-Stop über 0,02168 von 0,025432 Coins steht (gesperrt), die Spot-Aufträge sind NICHT LESBAR (Rate-Limit). Der Not-Aus behandelte die
# gesperrten Coins als «gesichert» und deckte den Short nur über die freien Coins hinaus (auf den nächsten Futures-Schritt gerundet: 0,021): nach dem Auslösen beider Stops blieben 0,000248 BTC Short (≈ 38 USDT)
# ohne Coins und ohne Stop. Mehr Coins gesperrt als nötig + Liste unlesbar = ein zu grosser Stop kann stehen (wie bei veralteten Zahlen, und wie _spot_ohne_liste im Tageslauf): der Short bekommt seinen Stop
# über die GANZE Menge, die übrigen Coins einen eigenen Spot-Stop (beidseitig).
for coins_, short_, stop_, name_ in ((0.025432, 0.025, 0.02168, "frei 0,003752 → Absicherung 0,003 (nicht 0,004)"), (0.0275, 0.025, 0.0245, "frei 0,003 genau (Kontrolle)")):
    k, sp, fu, dd = handlage(coins=coins_, short=short_, kurs=153140.08)
    eigener_spot_stop(sp, dd, stop_, 108136.41)                      # der Spot-Stop über den grössten Teil der Coins
    g0 = lage(k, "BTCUSDT")
    B.regeln = [regel(methode="GET", pfad="/api/v3/openOrders", art="429", anzahl=99)]   # Spot-Aufträge nicht lesbar: der Stop bleibt, wie er ist
    st_, w_ = {}, []
    try:
        ok_ = L._notaus_schutz(sp, fu, st_, "BTC", "BTCUSDT", "BTC", -short_, -short_, g0["coins"] - stop_, stop_, 153140.08, dd["rs"], w_.append, "testnetz",
                               None, buch={}, erg={"zeilen": [], "auftraege": []})
    finally:
        B.regeln = []
    g = lage(k, "BTCUSDT")
    pruefe(f"15.E27 Not-Aus, Spot-Stop {stop_:g} von {coins_:g} Coins ({name_}): nach beiden Auslösungen bleibt kein Short ohne Coins und ohne Stop", not befunde(k), (g, befunde(k), w_))
    gross_ = coins_ - short_ > 0.0004 and stop_ > coins_ - short_ + 0.001   # der Spot-Stop ist viel grösser als nötig (Fall 1 und Kontrolle)
    pruefe("15.E27 beidseitig: der Perp-Stop deckt den ganzen Short, alle Coins stehen unter einem Spot-Stop", g["p_qty"] >= short_ - 1e-9 and g["s_qty"] >= coins_ - 1e-5, (g, w_))

# Raster --geist: sechs Paare «Perp-Stop kommt an (Antwort verloren) × jede Wiederholung scheitert» (Rate-Limit / 503 vor der Verarbeitung / Verbindungsabriss), je zwei Zeitpunkte, mit allen 15 Lese-Kopplungen;
# dazu die Befundart SELBST_ENTFERNT (Pilot 2.0 hat in diesem Markt selbst einen Stop der betroffenen Seite entfernt und es fehlt Schutz — auch wenn die Nachkontrolle es später heilt)
zg_ = R.zellen(False, False, True, True)
pruefe("15.G Raster --geist: 6 Paare (2 × 3), je 2 Zeitpunkte; mit --paare nur diese; ohne --geist gibt es keine; nicht mit den hängenden Paaren vermischt",
       len(zg_) == 6 and all(c_[0].startswith("G") and c_[3] == (0, 1) and c_[1][2] is None and c_[2][1] == "/fapi/v1/algoOrder" for c_ in zg_)
       and not any(c_[0].startswith("G") for c_ in R.zellen(False, False, False, False)) and len(R.zellen(True, False, True, True)) == 16, [c_[0] for c_ in zg_])
fake_ = {"nach_lauf": [("SHORT_OHNE_STOP", (1.2, 4800.0))], "nach_nk": [], "unbekannt_lauf": [], "unbekannt_nk": [], "laut": True, "nk_tat_etwas": True, "selbst_entfernt": ["SHORT_OHNE_STOP"]}
pruefe("15.G klasse(): fehlt Schutz, den Pilot 2.0 selbst entfernt hat → SELBST_ENTFERNT (auch wenn laut gewarnt und von der Nachkontrolle geheilt); ohne Selbstentfernung (laut, geheilt) kein Befund",
       R.klasse(fake_) == "SELBST_ENTFERNT" and R.klasse(dict(fake_, selbst_entfernt=[])) is None, (R.klasse(fake_), R.klasse(dict(fake_, selbst_entfernt=[]))))
for si_, zid_ in ((6, "G0.0"), (9, "G0.1"), (1, "G1.2")):
    z_ = {c_[0]: c_ for c_ in zg_}[zid_]
    e_ = R.fall(R.SZENARIEN[si_], z_[1], 0, R.LESEN[1], "anfang", None, False, z_[2], False)
    pruefe(f"15.G Raster --geist, Szenario {si_} {R.SZENARIEN[si_]}, Paar {zid_} (Perp-Liste unlesbar ab Tagesbeginn): kein Befund (Rasterbefund vor E26: SELBST_ENTFERNT, 4'828 USDT ohne Stop)",
           isinstance(e_, dict) and R.klasse(e_) is None, e_ if not isinstance(e_, dict) else (R.klasse(e_), e_["nach_lauf"], e_["selbst_entfernt"]))

# R15-M29 (E19): das Lesen der freien Coins VOR dem Löschen des hängenden Stop-Limits nutzt das lange Budget (SCHUTZ_WARTEN, 5 Versuche) — wie das Lesen danach; mit dem kurzen (3 Versuche) gäbe der
# Rückfall bei vier Fehlversuchen in Folge auf, der hängende Stop bliebe bis zur Nachkontrolle ohne Ersatz
k, sp, fu, dd = handlage(coins=0.1, short=0.0, kurs=100000.0)
st_o = eigener_spot_stop(sp, dd, 0.1, 90000.0)
o_ = {"orderId": st_o.get("orderId")}
budgets_ = []


def lesen_spion_(warten=None):
    budgets_.append(warten)
    return (k.frei["BTC"], k.gesperrt["BTC"], 0.0, 100000.0)


L._haengenden_loeschen(sp, "BTC", dict(dd), {"spot": o_["orderId"]}, o_, 0.1, [].append, [], lesen_spion_)
pruefe("15.E19b _haengenden_loeschen: beide Lesungen der freien Coins (vor und nach dem Löschen) mit dem langen Budget SCHUTZ_WARTEN", len(budgets_) == 2 and all(b_ == L.SCHUTZ_WARTEN for b_ in budgets_), budgets_)

# Testlücken der Mutationsprobe auf 07057e648: R12-M33 (nicht im Handel → keine Wiederholungsrunden; seit E24 ändern zusätzliche Runden weder Börse noch Meldungen, nur die Zahl der Anfragen: 57 statt 66)
# und R10-M4b (Nachkontrolle im Not-Aus-Modus mit notaus_offen auf flachem Konto prüft nochmals und meldet «nichts offen», statt still zu enden)
k = neues_konto(20000)
d = neu_buch()
e_ = E("BTC", 0.5)
e_["stop_long"] = 80000.0
lauf([e_], env_echt(), d)
B.bewegen("BTCUSDT", 85000.0)
B.symbol_status["BTCUSDT"] = "BREAK"
nr0_ = B.n_req
try:
    lauf([dict(e_, stop_long=90000.0)], env_echt(), d)
finally:
    B.symbol_status.clear()
pruefe("15.M33 Symbol nicht im Handel (BREAK): der Stop bleibt, der Abgleich wiederholt seine Runden nicht (57 Anfragen; ohne die Abkürzung `jenseits_gehalten` 66)", B.n_req - nr0_ <= 62, B.n_req - nr0_)
k = neues_konto(20000)
d = neu_buch()
env_ = env_echt(kapital=20000)
lauf([E("BTC", 0.5)], env_, d)
r0_ = lauf([], env_, d, notaus=True)
b_ = L.buch_lesen(d, "echt")
b_["notaus_offen"] = True                                  # ein Not-Aus-Vermerk, der noch offen ist, obwohl das Konto flach ist
L.buch_schreiben(d, "echt", b_)
res_ = P.nachkontrolle(dict(env_, KI_BOT_STOP="1"), d)
pruefe("15.M4b Nachkontrolle im Not-Aus-Modus, notaus_offen gesetzt, Konto flach: sie prüft nochmals und meldet «nichts offen» (statt still zu enden)",
       r0_["alles_zu"] is True and P.flach(k) and res_.get("alles_zu") is True and any("nichts offen" in z_ for z_ in res_.get("zeilen") or []), (r0_["alles_zu"], res_.get("alles_zu"), res_.get("zeilen")))

# R13-M26 (F4): ein Not-Aus, der den Schutz eines Marktes nicht vollständig herstellen konnte (Marktverkauf unklar, Perp-Stop kommt an und die Antwort geht verloren, danach Rate-Limit), vermerkt den Markt für die Nachkontrolle
k = neues_konto(20000)
d = neu_buch()
env_ = env_echt(kapital=20000)
lauf([E("BTC", 0.0)], env_, d)                                  # Ernte-Paar
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF, art="spaet_u", anzahl=1),
            regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
try:
    r_ = lauf([], env_, d, notaus=True)
finally:
    B.regeln = []
pruefe("15.F4 Not-Aus, der den Schutz eines Marktes nicht herstellen konnte: nicht «alles zu», der Markt steht in schutz_offen (die Nachkontrolle versucht es nochmals)",
       r_["alles_zu"] is not True and "BTC" in (buch13(d).get("schutz_offen") or []), (r_["alles_zu"], buch13(d).get("schutz_offen"), r_["zeilen"][-3:]))

# R13-M22 (F3): Perp-Liste unlesbar, der neue Stop steht → die im Buch gemerkten alten Stops werden jetzt über ihre Kennung gelöscht (auch der gerade ersetzte aktuelle); sonst stünden zwei über dem Short
k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
cid_a = L._kennung(L.CID_STOP_PERP)
cid_b = L._kennung(L.CID_STOP_PERP)
ra_ = fu.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0, rf_["tick"], cid=cid_a)    # der aktuelle Stop des Buchs
rb_ = fu.stop_menge("BTCUSDT", "BUY", 0.3, 112000.0, rf_["tick"], cid=cid_b)    # ein früher nicht löschbarer, im Gedächtnis gemerkt
st_ = {"perp": ra_.get("algoId"), "perp_cid": cid_a, "p_short": 110000.0, "perp_weitere": [[rb_.get("algoId"), cid_b]]}
s_ = L._soll(0.0, -0.3, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.0)
w_ = []
L._perp_ohne_liste(fu, "BTC", dict(dd), st_, {"stop_short": 115000.0}, s_, w_.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, lambda w=None: L._lage(sp, fu, dd, w))
g_ = lage(k, "BTCUSDT")
pruefe("15.F3 _perp_ohne_liste: der neue Stop steht, der gemerkte alte wird über seine Kennung gelöscht (und der bisherige aktuelle ersetzt) — genau ein Stop über dem Short, das Gedächtnis ist leer",
       g_["n_p"] == 1 and not st_.get("perp_weitere"), (g_, st_, w_))

# N-R10-M18 (W1, Stelle _perp_abgleich): lesbare Liste, der bisherige Stop deckt den Short nicht ganz; der neue (volle) Stop kommt an, die Antwort geht verloren, jede Wiederholung scheitert — der vielleicht angekommene Stop
# wird im Buch vermerkt (bei einer später unlesbaren Liste kennt ihn sonst niemand) und der Abgleich räumt nach Mengen auf: der Geister-Stop wird der aktuelle Stop, der zu kleine bisherige fällt weg
k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
cid_alt = L._kennung(L.CID_STOP_PERP)
ra_ = fu.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, rf_["tick"], cid=cid_alt)
st_ = {"perp": ra_.get("algoId"), "perp_cid": cid_alt, "p_short": 110000.0}
s_ = L._soll(0.0, -0.3, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.0)
w_ = []
B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="nach503", anzahl=1), regel(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=99)]
try:
    L._perp_abgleich(fu, "BTC", dict(dd), st_, {"stop_short": 115000.0}, s_, {"auftraege": []}, w_.append, [], [], lambda w=None: L._lage(sp, fu, dd, w), False)
finally:
    B.regeln = []
g_ = lage(k, "BTCUSDT")
cids_ = [a_["clientAlgoId"] for a_ in fu.eigene_stops("BTCUSDT")]
pruefe("15.W1 _perp_abgleich: der vielleicht angekommene Stop steht im Gedächtnis des Buchs, der Abgleich übernimmt ihn (genau ein Stop über dem ganzen Short, der zu kleine bisherige ist weg)",
       any(w2_[0] is None and w2_[1] in cids_ for w2_ in st_.get("perp_weitere") or []) and g_["n_p"] == 1 and abs(g_["p_qty"] - 0.3) < 0.002 and st_.get("perp_cid") in cids_, (g_, st_, w_))

# R13-M12 (K3, Zusammenführen): ich habe meinen Spot-Stop gelöscht (None), der andere Lauf hat einen neuen eingetragen — dessen ID geht nicht verloren
bas_ = dict(L.leer_buch(), start="x", stops={"BTC": {"spot": 1, "p_long": 90000.0, "perp": None, "perp_cid": None}})
mein_ = dict(L.leer_buch(), start="x", stops={"BTC": {"spot": None, "p_long": 90000.0, "perp": None, "perp_cid": None}})
platte_ = dict(L.leer_buch(), start="x", stops={"BTC": {"spot": 7, "p_long": 90000.0, "perp": None, "perp_cid": None}})
m12_ = L._buch_vereinen(dict(platte_), mein_, bas_)["stops"]["BTC"]
pruefe("15.K3 Zusammenführen: ich löschte meinen Spot-Stop (None), der andere trug einen neuen ein → seine ID bleibt", m12_.get("spot") == 7, m12_)

# R14-M7 (F1): der gerade gesetzte, in der Liste noch nicht sichtbare Stop zählt NICHT als «versteckter alter» — _perp_versteckte_weg löscht ihn nicht (aktuell_cid)
k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
cid_x = L._kennung(L.CID_STOP_PERP)
fu.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0, rf_["tick"], cid=cid_x)
cid_y = L._kennung(L.CID_STOP_PERP)
fu.stop_menge("BTCUSDT", "BUY", 0.3, 112000.0, rf_["tick"], cid=cid_y)
st_ = {"perp": None, "perp_cid": cid_x}
L._perp_versteckte_weg(fu, "BTC", {"sym": "BTCUSDT"}, st_, [].append, [{"algoId": None, "clientAlgoId": cid_x}, {"algoId": None, "clientAlgoId": cid_y}], aktuell_cid=cid_x)
bleiben_ = [a_["clientAlgoId"] for a_ in fu.eigene_stops("BTCUSDT")]
pruefe("15.F1 _perp_versteckte_weg: der gerade gesetzte Stop (aktuell_cid) bleibt stehen, der andere versteckte alte wird gelöscht", bleiben_ == [cid_x], (bleiben_, cid_x, cid_y))

for was_s, seed_s in (("Not-Aus-Seed 117727 (E26)", 117727), ("Not-Aus-Seed 117974 (E27)", 117974)):
    P.STRENG, P.LUECKEN = True, True
    try:
        funde = P.echte(P.notaus_runde(seed_s))
    finally:
        P.STRENG = P.LUECKEN = False
        B.reduce_algo_streng = False
    pruefe(f"15.E26/E27 strenger Lücken-{was_s}: keine Befunde", not funde, [(f_[0], f_[2]) for f_ in funde][:3])

# ───────── 16. Prüfung (Folge-PR): H6, H1, F-a, H7, H5/H5b und die kleinen Funde — Szenarien rot am Stand der 15. Runde, grün am neuen ─────────
# 16.H6 (16. Prüfung, Blocker; Beleg b13): Kurs +6 % (der alte Perp-Stop bei etwa +10 % steht noch), das Signal von heute hat seinen Stop-Kurs UNTER dem Kurs → «jenseits» → Ausstieg zum Markt (_perp_raus).
# Der Rückkauf (reduceOnly BUY) ist UNKLAR (503 vor der Verarbeitung = nie ausgeführt / nach der Verarbeitung = ausgeführt, Antwort verloren) oder nur TEILWEISE ausgeführt; neue Stop-Aufträge werden dauerhaft
# abgelehnt (429). Vorher löschte _perp_raus die alten Stops nach einem unklaren oder teilweisen Rückkauf, BEVOR ein Ersatz stand — der Short stand (wenn der Rückkauf nie ankam) ganz ohne Stop (10'145–20'885 USDT).
def tag0_(sz_):
    markt_, z0_, z1_ = sz_
    k_ = P.neues_konto(20000)
    d_ = P.neu_buch()
    env_ = P.env_echt(kapital=20000)
    P.lauf([P.E(markt_, z0_)], env_, d_)
    return k_, d_, env_
RUECK_ = lambda m, p, q: q.get("reduceOnly") == "true"  # noqa: E731
for art_ in ("vor503", "nach503", "teil"):
    for sz_ in (("ETH", -1.0, -0.25), ("BTC", -1.0, -0.5), ("BTC", -0.25, 0.0), ("ETH", 0.0, -0.5)):
        markt_, z0_, z1_ = sz_
        sym_ = markt_ + "USDT"
        k, d, env = tag0_(sz_)
        if k.pos[sym_] >= 0 or not [a for a in k.algos.values() if a["symbol"] == sym_]:
            continue
        kurz_ = round(-k.pos[sym_], 3)
        vorher_ = lage(k, sym_)
        absicherung_ = vorher_["coins"] > 0.5 * kurz_                                   # ein Paar: die Coins sichern den grössten Teil des Shorts ab
        B.bewegen(sym_, round(B.kurs[sym_] * 1.06, 2))                               # der alte Perp-Stop bei etwa +10 % löst NICHT aus
        e_ = {"markt": markt_, "hebel": z1_, "stop_long": B.kurs[sym_] * 0.9, "stop_short": B.kurs[sym_] * 0.97, "stand": "2026-10-13"}   # Stop-Kurs unter dem Kurs → «jenseits»
        B.regeln = [dict(methode="POST", pfad="/fapi/v1/order", pred=RUECK_, art=art_, anzahl=1 if art_ == "teil" else 10 ** 6), dict(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
        try:
            res_ = P.lauf([e_], env, d)
        finally:
            B.regeln = []
        g_ = lage(k, sym_)
        if art_ == "vor503":
            # der Rückkauf kam nie an: der alte Perp-Stop (Richtungs-Short) muss stehen bleiben — gelöscht war er vorher, bevor ein Ersatz stand
            pruefe(f"16.H6 Rückkauf {art_} nie ausgeführt, neue Perp-Stops dauerhaft abgelehnt ({sz_}, Short {kurz_}): der alte Perp-Stop steht weiter ({vorher_['p_qty']:g} → {g_['p_qty']:g})",
                   g_["n_p"] >= 1 and g_["p_qty"] >= vorher_["p_qty"] - 1e-9, (vorher_, g_))
        if not (art_ == "vor503" and absicherung_):
            # (ein Paar mit dauerhaft abgelehnten Perp-Stops und unklarem Rückkauf behält einen Rest: der Spot-Stop über die Absicherungs-Coins schützt den Fall «Rückkauf kam an», ohne Perp-Stop
            # über den ganzen Short fehlt dem Rest der Schutz im Fall «Rückkauf kam nie an» — Restrisiko, README «Bekannte Restrisiken»)
            pruefe(f"16.H6 Rückkauf {art_}, neue Perp-Stops dauerhaft abgelehnt ({sz_}, Short {kurz_}): kein Short ohne Stop ({[b_[:2] for b_ in befunde(k, d)][:2]})",
                   not befunde(k, d), (g_, befunde(k, d)[:2], res_["zeilen"][:4]))

# 16.H1 (16. Prüfung, Beleg b2): Binance kennt cancelReplace nicht (404) UND das Löschen des alten Spot-Stops scheitert dreimal (503): _spot_abgleich meldete nur «alter Spot-Stop ist noch offen — kein zweiter
# gesetzt». Wuchs der Long heute (0,5 → 1,0), deckte der alte Stop nur den alten Teil (9'859 USDT ohne Stop), und der Lauf vermerkte nichts für die Nachkontrolle. Jetzt bekommt der Rest einen Zusatz-Stop
# (nur aus freien Coins, nie doppelt), ein zu grosser alter macht den Markt beidseitig, und die Nachkontrolle versucht das Ersetzen nochmals.
import json
def tag0_(sz_, haengend_=False):
    markt_, z0_, z1_ = sz_
    k_ = P.neues_konto(20000)
    if haengend_:
        B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d_ = P.neu_buch()
    env_ = P.env_echt(kapital=20000)
    P.lauf([P.E(markt_, z0_)], env_, d_)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    return k_, d_, env_
def offen_(d_):
    try:
        return list((json.loads(open(d_).read()).get("echt") or {}).get("schutz_offen") or [])
    except (OSError, ValueError):
        return []
for sz_ in (("BTC", 0.5, 1.0), ("BTC", 0.25, 0.5), ("ETH", 0.25, 0.0)):
    markt_ = sz_[0]
    sym_ = markt_ + "USDT"
    k, d, env = tag0_(sz_)
    vor_ = lage(k, sym_)
    B.ersetzen_fehlt = True                                                                 # cancelReplace unbekannt (404)
    B.regeln = [dict(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=3)]       # das Löschen des alten Stops scheitert dreimal
    try:
        res_ = P.lauf([P.E(markt_, sz_[2])], env, d)
    finally:
        B.regeln = []
        B.ersetzen_fehlt = False
    g_ = lage(k, sym_)
    wachst_ = sz_[2] > sz_[1]
    pruefe(f"16.H1 {sz_}: cancelReplace unbekannt + Löschen scheitert ({'Long wuchs' if wachst_ else 'Long schrumpfte'}, alter Stop {vor_['s_qty']:g}): kein Long ohne Stop ({[b_[:2] for b_ in befunde(k, d)][:2]})",
           not befunde(k, d), (vor_, g_, befunde(k, d)[:2], res_["zeilen"][-3:]))
    pruefe(f"16.H1 {sz_}: der Markt ist für die Nachkontrolle vermerkt (schutz_offen {offen_(d)})", markt_ in offen_(d), (offen_(d), res_["zeilen"][-3:]))
    P.pending_abarbeiten()
    B.n_listen += 1000
    P.nachkontrolle(env, d)
    pruefe(f"16.H1 {sz_}: nach der Nachkontrolle bleibt kein Befund ({[b_[:2] for b_ in befunde(k, d)][:2]})", not befunde(k, d), (lage(k, sym_), befunde(k, d)[:2]))

# 16.F-a (16. Prüfung, Beleg b4): der Frühausstieg «Konto nicht lesbar — kein Auftrag» (Zeile ~921) liess alle Stops von gestern ungeprüft und vermerkte keinen Markt für die Nachkontrolle. Hing ein ausgelöster
# STOP_LOSS_LIMIT (Konto ohne STOP_LOSS-Typ, Kurslücke zwischen den Läufen), stand der Long bis zum nächsten Tageslauf ohne wirksamen Stop (8'410 bzw. 16'828 USDT). Jetzt vermerkt der Lauf jeden Markt mit
# Stops, die Nachkontrolle liest alle nochmals (Binance antwortet 10 Minuten später wieder).
import json
def tag0h_(sz_):
    markt_, z0_, z1_ = sz_
    k_ = P.neues_konto(20000)
    B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d_ = P.neu_buch()
    env_ = P.env_echt(kapital=20000)
    P.lauf([P.E(markt_, z0_)], env_, d_)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    sym_ = markt_ + "USDT"
    limits_ = [o["preis"] for o in k_.orders.values() if o["symbol"] == sym_ and o["typ"] == "STOP_LOSS_LIMIT" and o["status"] in ("NEW", "PARTIALLY_FILLED")]
    if not limits_:
        return None
    B.bewegen(sym_, round(min(limits_) * 0.99, 2))                                         # Kurslücke unter das tiefste Limit: der Spot-Stop ist ausgelöst und hängt über dem Kurs
    return (k_, d_, env_) if P._haengend(k_, sym_) else None
def offen_(d_):
    try:
        return list((json.loads(open(d_).read()).get("echt") or {}).get("schutz_offen") or [])
    except (OSError, ValueError):
        return []
for sz_ in (("BTC", 1.0, 0.25), ("BTC", 0.5, 1.0), ("BTC", 0.5, -0.5)):
    markt_ = sz_[0]
    sym_ = markt_ + "USDT"
    t_ = tag0h_(sz_)
    if t_ is None:
        continue
    k, d, env = t_
    B.regeln = [R._regel_lesen(("GET", "/api/v3/account", "vor503", 4))]                    # die Konto-Lesung schlägt bei Laufbeginn fehl (viermal)
    try:
        res_ = P.lauf([P.E(markt_, sz_[2])], env, d)
    finally:
        B.regeln = []
    pruefe(f"16.F-a {sz_}: «Konto nicht lesbar» ({res_['zeilen'][-1][:40]}…) vermerkt den Markt mit Stops für die Nachkontrolle (schutz_offen {offen_(d)})", markt_ in offen_(d), (offen_(d), res_["zeilen"][-2:]))
    P.pending_abarbeiten()
    B.n_listen += 1000
    P.nachkontrolle(env, d)
    pruefe(f"16.F-a {sz_}: nach der Nachkontrolle steht der Long (hängender Stop-Limit) wieder unter einem wirksamen Stop ({[b_[:2] for b_ in befunde(k, d)][:2]})", not befunde(k, d), (lage(k, sym_), befunde(k, d)[:2]))

# 16.H7 (16. Prüfung, Beleg b18): hängender Stop-Limit (Konto ohne STOP_LOSS, Kurslücke). Der Ausstieg per cancelReplace gelingt nur als Storno: Binance storniert den Stop, lehnt den neuen Marktverkauf ab, die ANTWORT GEHT
# VERLOREN (503, «nur_storno_verloren»); danach lehnt Binance auch die einzelnen Marktverkäufe ab. _haengenden_loeschen hörte «unbekannt» (−2011) und sah keinen Unterschied der freien Coins (der Storno kam VOR
# seiner ersten Lesung) → «nichts freigegeben, der Stop war schon weg» → Long ohne Stop (8'410 USDT), kein Vermerk, die Nachkontrolle sicherte nicht. Jetzt vermerkt dieser Zweig den Markt: die Nachkontrolle liest nach.
import json
def tag0h_(sz_):
    markt_, z0_, z1_ = sz_
    k_ = P.neues_konto(20000)
    B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d_ = P.neu_buch()
    env_ = P.env_echt(kapital=20000)
    P.lauf([P.E(markt_, z0_)], env_, d_)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    sym_ = markt_ + "USDT"
    limits_ = [o["preis"] for o in k_.orders.values() if o["symbol"] == sym_ and o["typ"] == "STOP_LOSS_LIMIT" and o["status"] in ("NEW", "PARTIALLY_FILLED")]
    if not limits_:
        return None
    B.bewegen(sym_, round(min(limits_) * 0.99, 2))
    return (k_, d_, env_) if P._haengend(k_, sym_) else None
def offen_(d_):
    try:
        return list((json.loads(open(d_).read()).get("echt") or {}).get("schutz_offen") or [])
    except (OSError, ValueError):
        return []
sz_ = ("BTC", 0.5, -0.5)
markt_, sym_ = sz_[0], sz_[0] + "USDT"
t_ = tag0h_(sz_)
k, d, env = t_
zaehler_ = {"cr": 0, "an_cr": False, "mk": 0, "an_mk": False}
def haken_(m_, pfad_, p_):
    if m_ == "POST" and pfad_ == "/api/v3/order/cancelReplace":
        zaehler_["cr"] += 1
        if zaehler_["cr"] == 2 and not zaehler_["an_cr"]:            # der zweite cancelReplace: nur der Storno kommt durch, die Antwort geht verloren
            zaehler_["an_cr"] = True
            B.regeln.append(R._regel_schreiben(("POST", "/api/v3/order/cancelReplace", None, "nur_storno_verloren", 1)))
    if m_ == "POST" and pfad_ == "/api/v3/order" and R.MARKT_SPOT(m_, pfad_, p_):
        if not zaehler_["an_mk"]:                                     # ab dem ersten Marktverkauf lehnt Binance die einzelnen Marktverkäufe ab (PERCENT_PRICE)
            zaehler_["an_mk"] = True
            B.regeln.append(R._regel_schreiben(("POST", "/api/v3/order", R.MARKT_SPOT, "ablehnen", 3)))
B.vor_jeder_anfrage = haken_
try:
    res_ = P.lauf([P.E(markt_, sz_[2])], env, d)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
pruefe("16.H7 Störung kam zum Zug (nur_storno_verloren und abgelehnte Marktverkäufe)", zaehler_["an_cr"] and zaehler_["an_mk"], zaehler_)
pruefe(f"16.H7 {sz_}: hängender Stop weg, Ersatz nur als Storno, Marktverkäufe abgelehnt: der Markt ist für die Nachkontrolle vermerkt (schutz_offen {offen_(d)})", markt_ in offen_(d),
       (offen_(d), res_["zeilen"][-3:], lage(k, sym_)))
P.pending_abarbeiten()
B.n_listen += 1000
P.nachkontrolle(env, d)
pruefe(f"16.H7 {sz_}: nach der Nachkontrolle steht der Long wieder unter einem wirksamen Stop ({[b_[:2] for b_ in befunde(k, d)][:2]})", not befunde(k, d), (lage(k, sym_), befunde(k, d)[:2]))

# 16.H5/H5b (16. Prüfung, Belege b9/b14): im BEIDSEITIGEN Modus (ein unklarer Perp-Auftrag, ein zu grosser Stop) ist die Stop-Grösse ALLE Coins; der Ausstieg zum Markt («Kurs schon unter dem Stop-Kurs») verkaufte
# aber dieselbe Menge — also auch die Absicherung des Shorts: der Short stand nackt da (H5: 0,046 BTC ≈ 4'650 USDT Absicherung verkauft; H5b: Test 14.E10 mit Hebel 0,5 endete mit Coins 0 und Short 0,047, weil er nur Coins zählte).
# Jetzt wird nur die Netto-Richtung verkauft (_soll_netto); die übrigen Coins bekommen im beidseitigen Modus einen Not-Stop.
def tag0_(sz_):
    markt_, z0_, z1_ = sz_
    k_ = P.neues_konto(20000)
    d_ = P.neu_buch()
    env_ = P.env_echt(kapital=20000)
    P.lauf([P.E(markt_, z0_)], env_, d_)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    return k_, d_, env_
# H5: Hebel 0 → −0,5 mit unklarem Perp-Verkauf; das Long-Stop-Niveau des Signals liegt über dem Kurs (jenseits) — netto ist nichts long, die Coins sind nur die Absicherung des Shorts
ende_ = {}
for unklar_ in (False, True):
    k, d, env = tag0_(("BTC", 0.0, -0.5))
    p_ = B.kurs["BTCUSDT"]
    e_ = {"markt": "BTC", "hebel": -0.5, "stop_long": p_ * 1.02, "stop_short": p_ * 1.10, "stand": "2026-10-13"}
    B.regeln = [R._regel_schreiben(("POST", "/fapi/v1/order", None, "spaet_u", 1))] if unklar_ else []
    try:
        res_ = P.lauf([e_], env, d)
    finally:
        B.regeln = []
    P.pending_abarbeiten()                                                                   # der unklare Verkauf kommt verspätet doch an
    ende_[unklar_] = lage(k, "BTCUSDT")
    pruefe(f"16.H5 BTC 0 → −0,5 ({'unklarer Perp-Verkauf, beidseitig' if unklar_ else 'ohne Störung'}): kein Befund ({[b_[:2] for b_ in befunde(k, d)][:2]})", not befunde(k, d), (ende_[unklar_], befunde(k, d)[:2]))
pruefe(f"16.H5 BTC 0 → −0,5: im beidseitigen Modus bleibt die Absicherung des Shorts liegen (Coins {ende_[True]['coins']:g} gegenüber {ende_[False]['coins']:g} ohne Störung)",
       ende_[True]["coins"] >= ende_[False]["coins"] - 0.002, (ende_[True], ende_[False]))
# H5b: hängender Stop-Limit (Konto ohne STOP_LOSS-Typ), Ausstieg per cancelReplace scheitert (503 vor der Verarbeitung) dreimal bzw. dauerhaft; Hebel 0,5 (Absicherung 0,047) und 1,0 (keine)
for name_, anzahl_ in (("dreimal", 3), ("dauerhaft", 10 ** 6)):
    for hebel_ in (0.5, 1.0):
        k = P.neues_konto(20000)
        B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
        d = P.neu_buch()
        e_ = P.E("BTC", hebel_)
        e_["stop_long"] = 90000.0
        P.lauf([e_], P.env_echt(), d)
        B.bewegen("BTCUSDT", 85000.0)
        B.regeln = [dict(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=anzahl_)]
        try:
            res_ = P.lauf([e_], P.env_echt(), d)
        finally:
            B.regeln = []
        g_ = lage(k, "BTCUSDT")
        pruefe(f"16.H5b hängender Stop-Limit, cancelReplace {name_} unklar (Hebel {hebel_}): der Short bleibt abgesichert (Coins {g_['coins']:.4f}, Short {-g_['pos']:.4f}) und kein Befund",
               g_["coins"] >= -g_["pos"] - 0.002 and not befunde(k, d), (g_, befunde(k, d)[:2], res_["zeilen"][-3:]))

# ───────── 16. Prüfung: kleine Funde und Folgen (H3, H4, G2', gemachte Menge, Rückfall nach «nichts», Abbruch-Scan, Einstufung) ─────────
import pruef_kill as K


def tag0_16(sz):
    """Tag 0 baut die Lage (Markt, Richtung gestern), danach ein Prozent Kursbewegung."""
    markt_, z0_, _z1 = sz
    k_ = neues_konto(20000)
    d_ = neu_buch()
    env_ = env_echt(kapital=20000)
    lauf([E(markt_, z0_)], env_, d_)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    return k_, d_, env_


def ereignisse16(liste):
    """liste: (Methode, Pfad, Bedingung, [Störungen]) — beim ERSTEN passenden Request schaltet das Ereignis seine Störungen ein (jedes einmal)."""
    fertig = [False] * len(liste)

    def haken_(m, pfad, p):
        for i_, (em, ep, epred, ws) in enumerate(liste):
            if not fertig[i_] and m == em and pfad == ep and (epred is None or epred(m, pfad, p)):
                fertig[i_] = True
                for w_ in ws:
                    r_ = R._regel_schreiben(w_)
                    if r_ is not None:
                        B.regeln.append(r_)
    B.vor_jeder_anfrage = haken_
    return fertig


# 16.H3: ein Perp-Stop kommt an, die Antwort geht verloren, die Liste zeigt ihn erst nach 12 Abfragen — jede weitere Anlage scheitert. Der nur verzögert sichtbare Stop darf nicht aus dem Gedächtnis
# des Buchs fallen (Erhaltungssatz «kein dem Buch unbekannter eigener Stop», 1'870 USDT unbekannt)
for sz_h3 in (("BTC", -0.25, 0.0), ("BTC", -0.5, -0.25)):
    for art_h3 in ("vor503", "429", "abriss_vor"):
        k, d, env = tag0_16(sz_h3)
        B.regeln = [R._regel_schreiben(("POST", "/fapi/v1/algoOrder", None, "unsichtbar", 1)), regel(methode="POST", pfad="/fapi/v1/algoOrder", art=art_h3, anzahl=10 ** 6)]
        try:
            lauf([E(sz_h3[0], sz_h3[2])], env, d)
        finally:
            B.regeln = []
        unb_lauf = [u for u in R.unbekannte(k, d) if not u[2]]
        P.pending_abarbeiten()
        B.n_listen += 1000
        P.nachkontrolle(env, d)
        unb_nk = R.unbekannte(k, d)
        pruefe(f"16.H3 {sz_h3[0]} {sz_h3[1]:+g}→{sz_h3[2]:+g}, erster Perp-Stop nur verzögert sichtbar, weitere Anlagen {art_h3}: kein dem Buch unbekannter Stop (nach Lauf, nach Nachkontrolle)",
               not unb_lauf and not unb_nk, (unb_lauf, unb_nk, json.loads(Path(d).read_text()).get("echt", {}).get("stops")))

# 16.H4: Not-Aus, der Perp-Stop-Versuch kommt an (Antwort verloren), alle weiteren scheitern, der Rückkauf wird nur teilweise ausgeführt. Der angekommene Stop wird nicht gelöscht, solange der alte den
# GANZEN Short nicht deckt (vorher 0,049 statt 0,074 von 0,095 BTC)
k, d, env = tag0_16(("BTC", -0.25, 0.0))
fertig_ = ereignisse16([("POST", "/fapi/v1/algoOrder", None, [R.GEIST_ERSTE[0], R.GEIST_ZWEITE[0]]), ("POST", "/fapi/v1/order", None, [("POST", "/fapi/v1/order", None, "teil", 1)])])
try:
    r = lauf([], env, d, notaus=True)
finally:
    B.vor_jeder_anfrage = None
    B.regeln = []
g_h4 = lage(k, "BTCUSDT")
pruefe("16.H4 Not-Aus, Geister-Stop + teilweiser Rückkauf: der angekommene Stop bleibt, die Perp-Stops decken mehr als der alte allein (0,049)",
       all(fertig_) and g_h4["p_qty"] > 0.06 and not R.unbekannte(k, d), (fertig_, g_h4, r["zeilen"][-4:]))

# 16.G2': _buch_vereinen — ein Schreiber trägt nur die algoId desselben Stops nach (gleiche Kennung wie die Basis), der andere hat ihn inzwischen ersetzt: der lebende Stop des anderen bleibt bekannt
def buch_h(perp, cid, weitere=None):
    b_ = L.leer_buch()
    b_["start"], b_["uid"], b_["stops"] = "x", 1, {"BTC": {"perp": perp, "perp_cid": cid, "perp_weitere": weitere}}
    return b_


neu_g2 = L._buch_vereinen(buch_h(104, "c2"), buch_h(106, "c1"), buch_h(None, "c1"))
s_g2 = neu_g2["stops"]["BTC"]
bekannt_g2 = {s_g2["perp_cid"]} | {(list(w) + [None, None])[1] for w in s_g2["perp_weitere"] or []}
pruefe("16.G2' _buch_vereinen: ich trage nur die algoId nach, der andere ersetzte den Stop — dessen lebender Stop (c2) ist im Gedächtnis", "c2" in bekannt_g2 and (s_g2["perp"], s_g2["perp_cid"]) == (106, "c1"), s_g2)
import pruef_vereinen as V  # noqa: E402
verstoesse_g2 = [r_ for r_ in (V.lauf(sd_) for sd_ in range(0, 400)) if r_]
pruefe("16.G2' Eigenschaftstest: drei Schreiber (Tageslauf, Not-Aus, Nachkontrolle), 400 zufällige Folgen — jeder gespeicherte lebende Stop steht danach im Buch", not verstoesse_g2, verstoesse_g2[:3])

# 16.alt_deckt: eine nur TEILWEISE ausgeführte Spot-Order wird mit der ausgeführten Menge verbucht (erg["auftraege"] speist _alt_deckt: es rechnet daraus auf die Lage vor den heutigen Aufträgen zurück)
for sz_ad in (("BTC", 0.25, 0.5), ("BTC", 0.0, 1.0), ("ETH", -0.5, 0.5)):
    k, d, env = tag0_16(sz_ad)
    coins_vor = k.frei[sz_ad[0]] + k.gesperrt[sz_ad[0]]
    B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=lambda m, p, q: q.get("type") == "MARKET" and q.get("side") == "BUY", art="teil", anzahl=1)]
    try:
        r = lauf([E(sz_ad[0], sz_ad[2])], env, d)
    finally:
        B.regeln = []
    coins_nach = k.frei[sz_ad[0]] + k.gesperrt[sz_ad[0]]
    netto_auf = sum(a_[3] if a_[2] == "BUY" else -a_[3] for a_ in r["auftraege"] if len(a_) == 4 and a_[0] == sz_ad[0] and a_[1] == "spot")
    pruefe(f"16.alt_deckt {sz_ad}: der nur teilweise ausgeführte Spot-Kauf wird mit der ausgeführten Menge verbucht (Coins +{coins_nach - coins_vor:.6f})",
           abs(netto_auf - (coins_nach - coins_vor)) < 1e-6, (netto_auf, coins_nach - coins_vor, r["auftraege"]))

# 16.Rückfall: ein ausgelöster STOP_LOSS_LIMIT hängt über dem Kurs (Konto ohne STOP_LOSS), cancelReplace lehnt JEDEN Not-Stop ab (Rate-Limit-Welle): der hängende schützt nichts — der Weg
# «löschen + neuer Auftrag» hängt an anderen Anfragen (Lücken-Lauf-Seed 102857: 26 USDT bis zur Nachkontrolle ohne wirksamen Stop)
for hebel_rf in (0.5, 1.0):
    k = neues_konto(20000)
    B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d = neu_buch()
    e = E("BTC", hebel_rf)
    e["stop_long"] = 90000.0
    lauf([e], env_echt(), d)
    B.bewegen("BTCUSDT", 85000.0)
    B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="429", anzahl=10 ** 6)]
    try:
        r = lauf([e], env_echt(), d)
    finally:
        B.regeln = []
    g_rf = lage(k, "BTCUSDT")
    pruefe(f"16.Rückfall hängender Stop-Limit, cancelReplace lehnt alles ab (Hebel {hebel_rf}): gelöscht, ein Not-Stop schützt den Long, kein Befund",
           not befunde(k, d) and not P._haengend(k, "BTCUSDT") and g_rf["s_qty"] > 0, (befunde(k, d), g_rf, r["zeilen"][-3:]))

# 16.Abbruch: der Tageslauf stirbt hart (Prozess beendet) nach dem n-ten Auftrag — der Markt steht VOR dem ersten Auftrag für die Nachkontrolle im Buch, sie holt die Stops nach.
# Gemessen am Stand der 15. Runde: bei 47 von 97 Abbruchstellen lag danach eine Position ohne Stop, und die Nachkontrolle tat nichts
for si_k in (2, 3, 8):
    sz_k = R.SZENARIEN[si_k]
    ges_k = K.schreibende(sz_k)
    ergebnisse_k = [K.abbruch(sz_k, n_) for n_ in range(0, ges_k + 1)]
    pruefe(f"16.Abbruch {sz_k}: bei jedem der {ges_k + 1} Abbrüche (nach jedem Auftrag) ist nach der Nachkontrolle nichts ungeschützt",
           all(not m_.get("fehler") and not m_["arten"] for m_ in ergebnisse_k), [(m_["n"], m_.get("arten"), m_.get("fehler")) for m_ in ergebnisse_k if m_.get("fehler") or m_["arten"]][:3])
    pruefe(f"16.Abbruch {sz_k}: lag direkt nach dem Abbruch etwas ohne Stop, stand der Markt für die Nachkontrolle im Buch",
           all(sz_k[0] in m_["schutz_offen"] for m_ in ergebnisse_k if m_.get("gestorben") and (m_["sofort"][0] > 0 or m_["sofort"][1] > 0)),
           [(m_["n"], m_["schutz_offen"], m_["sofort"]) for m_ in ergebnisse_k if m_.get("gestorben") and (m_["sofort"][0] > 0 or m_["sofort"][1] > 0) and sz_k[0] not in m_["schutz_offen"]][:3])

# 16.Abbruch der Nachkontrolle (Fund des Abbruch-Scans `pruef_kill.py --nk`): im zweiten Durchgang rechnete der Perp-Teil des Abgleichs mit der Stop-Grösse vom Rundenanfang («Perp-Stop nicht nötig»), obwohl der
# Spot-Teil den Markt eben beidseitig gemacht hatte — er löschte den frisch gesetzten Perp-Stop als «verwaist» und setzte ihn erst in der nächsten Runde neu; starb die Nachkontrolle dazwischen, stand der Short ohne Stop (4'747 USDT)
# und ohne Vermerk. Jetzt wird die Stop-Grösse für den Perp-Teil neu berechnet, und der Markt steht im Buch, solange sein Abgleich läuft
for si_nk in (2, 7):
    z_nk, f_nk = K.scan_nk(si_nk, si_nk + 1, laut=False)
    pruefe(f"16.Abbruch der Nachkontrolle {R.SZENARIEN[si_nk]}: {z_nk['abbruch']} Fälle (Tageslauf an 3 Stellen × Nachkontrolle nach 0, 1, 2 … Aufträgen), nach der zweiten Nachkontrolle nichts ungeschützt, keine Ausnahme",
           z_nk["abbruch"] >= 6 and not f_nk, (dict(z_nk), [(m_["n"], m_["n2"], m_.get("arten"), m_.get("fehler")) for m_ in f_nk[:3]]))

# 16.Abbruch × Störung: der Tageslauf stirbt hart, nachdem eine schreibende Störung (Antwort verloren, abgelehnt, …) schon gewirkt hat — der Vermerk und die Nachkontrolle tragen auch dann
z_ks, f_ks = K.scan(2, 3, stoerungen=True, jeder=23, laut=False)
pruefe(f"16.Abbruch × Störung (BTC 0,5 → −0,5, jeder 23. Fall): {z_ks['abbruch']} Abbrüche mit gewirkter Störung, keine Ausnahme, nach der Nachkontrolle nichts ungeschützt", z_ks["abbruch"] >= 3 and not f_ks, (dict(z_ks), f_ks[:2]))

# 16.Raster II: die neuen Achsen der 16. Prüfung (pruef_raster2.py) laufen — Rauchprobe je Modus (mindestens 2 Fälle, in denen die Störung wirklich traf): keine Ausnahme, kein Befund
import itertools
from collections import Counter
import pruef_raster2 as X


def probe16(gen, gewollt=2, deckel=60):
    z_, f_ = Counter(), []
    for bez_, fkt_ in itertools.islice(gen, deckel):
        zz_, ff_ = X.lauf_raster([(bez_, fkt_)], melde=lambda c: None)
        z_.update(zz_)
        f_ += ff_
        if z_["lauf"] >= gewollt:
            break
    return z_, f_


for was_x, gen_x in (("Einzelstörungen × cancelReplace unbekannt", X.zellen_basis(0, 3, "fehlt")), ("Paare mit eigenem Beginn", X.zellen_paare(0, 3)), ("Tripel", X.zellen_tripel(0, 3)),
                     ("Kurssprung mitten im Lauf", X.zellen_kurs(0, 3, schritt=7)), ("Versatz schreibend × lesend", X.zellen_versatz(0, 3)), ("Geister-Stop × Kurssprung", X.zellen_geist(0, 3, "tag_kurs")),
                     ("Geister-Stop × Rückkauf", X.zellen_geist(0, 12, "tag_rueck")), ("Not-Aus-Paare", X.zellen_paare(0, 12, notaus=True)), ("Geister-Stop im Not-Aus", X.zellen_geist(0, 12, "notaus")),
                     ("Tripel auf einem Tag mit hängenden Stop-Limits", X.zellen_tripel_h([3]))):
    z_x, f_x = probe16(gen_x)
    pruefe(f"16.Raster II {was_x}: läuft ({z_x['lauf']} Fälle getroffen), keine Befunde, keine Ausnahme", z_x["lauf"] >= 2 and not f_x and not z_x["AUSNAHME"], (dict(z_x), [(f_["art"], f_.get("fehler")) for f_ in f_x[:2]]))

# 16.Raster-II-Fund (Suchlauf der Schlusskampagne, Modus kurs --haengend): Konto ohne STOP_LOSS, der Long wächst 0,5 → 1,0, cancelReplace «nur_storno_verloren» (unklar), der Kurs springt unmittelbar vor einem der letzten
# Blicke um −15 %/−4 % durch den frisch gesetzten Stop-Limit — der hing, stand sogar in der letzten Liste, und der Lauf endete stumm mit 15'604 USDT ohne wirksamen Stop. Jetzt bekommt jeder in der letzten Liste hängende Stop-Limit einen Not-Stop
sz_rk, w_rk = ("BTC", 0.5, 1.0), X.NEU[0]
n_rk = X.anzahl_anfragen(sz_rk, haengend=True)
bad_rk, trafen_rk = [], 0
for j_rk in range(max(1, n_rk - 10), n_rk + 1):
    for fr_rk in (-0.15, -0.04):
        e_rk = X.zelle(sz_rk, [X.ev(None, j_rk - 1, X.a_kurs(fr_rk)), X.ev(X.trig(w_rk), 0, X.a_regel(w_rk))], haengend=True)
        if isinstance(e_rk, dict):
            trafen_rk += 1
            if R.klasse(e_rk):
                bad_rk.append((j_rk, fr_rk, R.klasse(e_rk), e_rk["nach_lauf"][:1]))
pruefe(f"16.Raster-II-Fund BTC +0,5 → +1,0, hängende Stop-Limits, cancelReplace nur_storno_verloren × Kurssprung vor einem der letzten {n_rk - max(1, n_rk - 10) + 1} Blicke: {trafen_rk} Fälle, kein Befund", trafen_rk >= 10 and not bad_rk, bad_rk[:3])

# 16.Einstufung: eine Lücke durch einen hängenden Stop-Limit (LIMIT_LUECKE_) ist nur entschuldigt, wenn der Lauf den Markt angesehen (der Sprung kam danach) oder für die Nachkontrolle vermerkt hat
bf_ll = [("LIMIT_LUECKE_LONG_OHNE_STOP", "BTCUSDT", 0.02, 2000.0)]
for vm_, gl_, erw_ in (([], [], False), (["BTC"], [], True), (["ETH"], [], False), ([], ["BTC"], True), ([], ["ETH"], False)):
    out_ = P._klassieren(bf_ll, {"warnung": True, "zeilen": []}, {"vermerkt": vm_, "gelesen": gl_})
    pruefe(f"16.Einstufung LIMIT_LUECKE_, vermerkt {vm_}, angesehen {gl_}: {'entschuldigt' if erw_ else 'echter Befund (der Lauf sah den Markt nie an und vermerkte nichts)'}", bool(P.echte(out_)) != erw_, out_)
out_ = P._klassieren(bf_ll, {"warnung": True, "zeilen": []}, {})
pruefe("16.Einstufung LIMIT_LUECKE_ ohne Buchangabe im Kontext (z. B. Not-Aus): wie bisher entschuldigt", not P.echte(out_), out_)
bf_vs = [("SPOT_STOP_UEBER_NETTO", "ETHUSDT", 0.3)]
zeile_vs = "⚠️ ETH: ein alter Short-Stop hat ausgelöst, Kontostand danach nicht lesbar — 0.324 ETH vorsorglich unter Spot-Stop. Bitte prüfen!"
for was_vs, erg_vs, vm_vs, erw_vs in (("Vorsorge-Stop gemeldet + vermerkt", {"warnung": True, "zeilen": [zeile_vs]}, ["ETH"], True), ("Vorsorge-Stop gemeldet, NICHT vermerkt", {"warnung": True, "zeilen": [zeile_vs]}, [], False),
                                      ("vermerkt, aber kein Vorsorge-Stop gemeldet", {"warnung": True, "zeilen": []}, ["ETH"], False), ("Vorsorge-Stop, aber der Lauf warnte nicht", {"warnung": False, "zeilen": [zeile_vs]}, ["ETH"], False)):
    out_ = P._klassieren(bf_vs, erg_vs, {"vermerkt": vm_vs})
    pruefe(f"16.Einstufung SPOT_STOP_UEBER_NETTO, {was_vs}: {'dokumentiertes Restrisiko (VORSORGE_)' if erw_vs else 'echter Befund'}", bool(P.echte(out_)) != erw_vs, out_)

# ── 16. Folge-Runde: Funde der Schlusskampagne camp16i (frische Seed-Bereiche 190000 ff.; alle am Stand a1cc2bc19 ein Befund) ──
# E31 (Lauf-Seed 192881, Standardmodus, Konto ohne STOP_LOSS): nach H5 verkauft der Ausstieg nur noch die Netto-Richtung; die übrigen Coins (im beidseitigen Markt die Absicherung des Shorts) schützt ein Not-Stop.
# Der kam mit EINEM Preis (5 %) — sprang der Kurs genau davor um −10,6 %, lehnte Binance ihn ab («würde sofort auslösen»), und 1,6 ETH blieben ohne Stop (6'907 USDT im beidseitigen Markt).
# Jetzt probiert jeder Not-Stop ohne anderen Schutz auch 10/20/35 % (`_not_preise`).
pruefe("16.E31 Lauf-Seed 192881 (Kurssprung −10,6 % genau vor dem einzigen Not-Stop, beidseitiger Markt): keine Befunde",
       not P.echte(P.laeufe_runde(192881, 30)), [(f_[0], f_[1].get("tag")) for f_ in P.echte(P.laeufe_runde(192881, 30))][:3])
pruefe("16.E31 _not_preise: 5 % zuerst, dann 10/20/35 % — unter dem Kurs (Spot-Long) und darüber (Short)",
       [round(x, 4) for x in L._not_preise(100.0)] == [95.0, 90.0, 80.0, 65.0] and [round(x, 4) for x in L._not_preise(100.0, +1)] == [105.0, 110.0, 120.0, 135.0],
       (L._not_preise(100.0), L._not_preise(100.0, +1)))
SPRUNG_SPOT = lambda: [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="kurs", sym="BTCUSDT", preis=88000.0)]   # −12 % unmittelbar vor dem ersten Stop-Auftrag
SPRUNG_PERP = lambda: [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="kurs", sym="BTCUSDT", preis=112000.0)]                    # +12 % unmittelbar vor dem ersten Stop-Auftrag
for was_, aufruf_ in (("_spot_raus", lambda sp_, fu_, dd_, w_, g_: L._spot_raus(sp_, "BTC", dd_, {}, 0.0, 100000.0, {"auftraege": []}, w_.append, g_, "Test",
                                                                                lambda w=None: L._lage(sp_, fu_, dd_, w))),
                      ("_spot_rest_sichern", lambda sp_, fu_, dd_, w_, g_: L._spot_rest_sichern(sp_, "BTC", dd_, {}, {"kurs": 100000.0, "frei": 0.5, "gebunden": 0.0}, 0.5, 95000.0, w_.append, g_)),
                      ("_spot_vorsorge", lambda sp_, fu_, dd_, w_, g_: L._spot_vorsorge(sp_, "BTC", dict(dd_, perp_ausgeloest=0.3, perp_neu=0.3), {}, {"stop_long": 95000.0},
                                                                                         {"kurs": 100000.0, "frei": 0.5}, w_.append, g_))):
    k_, sp_, fu_, dd_ = handlage(coins=0.5, kurs=100000.0)
    B.regeln = SPRUNG_SPOT()
    w_, g_ = [], []
    try:
        aufruf_(sp_, fu_, dd_, w_, g_)
    finally:
        B.regeln = []
    gl_ = lage(k_, "BTCUSDT")
    pruefe(f"16.E31 {was_}: der Kurs springt um −12 % vor den Not-Stop → ein weiterer (20 %) steht, nicht «OHNE Stop»",
           gl_["n_s"] == 1 and gl_["s_preise"][0] < 88000.0 and not any("OHNE Stop" in x_ for x_ in w_), (gl_, w_))
for alt_steht_, erw_ in ((False, True), (True, False)):
    k_, sp_, fu_, dd_ = handlage(short=0.1, kurs=100000.0)
    B.regeln = SPRUNG_PERP()
    w_, g_ = [], []
    try:
        ok_ = L._perp_notstop(fu_, "BTC", dd_, {}, 0.1, 100000.0, w_.append, g_, "Test", alt_steht=alt_steht_)
    finally:
        B.regeln = []
    gl_ = lage(k_, "BTCUSDT")
    pruefe(f"16.E31 _perp_notstop (alte Stops {'stehen noch' if alt_steht_ else 'weg'}): der Kurs springt um +12 % vor den Not-Stop → "
           + ("ein weiterer (20 %) steht" if erw_ else "enger Preis abgelehnt, die alten schützen weiter (keine weiten Preise)"),
           bool(ok_) is erw_ and (gl_["n_p"] == 1 and gl_["p_preise"][0] > 112000.0 if erw_ else gl_["n_p"] == 0), (ok_, gl_, w_))

# E32/E33 (strenge Lauf-Seeds 200479/200540; Not-Aus gleich nach dem Tageslauf): der Perp-Stop des Tageslaufs steht, die Stop-Liste zeigt ihn aber erst nach ein paar Abfragen (Verzögerung).
# Der Not-Aus hielt die Liste für leer: (a) E32 er setzte einen ZWEITEN Stop über denselben Short (2 × 2,212 ETH über einen Netto-Short von 2,211 — beim Auslösen kaufte er die Absicherung zurück),
# (b) E33 er löschte den überflüssigen nicht, als der Netto-Short zurückgekauft war und das Paar blieb (0,001 BTC über einem Paar). Jetzt kennt er die im Buch bekannten, nur nicht sichtbaren Stops
# (`_perp_versteckte`) und löscht sie über die Kennung — nach dem neuen Stop bzw. wenn keiner nötig ist.
MARKT_VERKAUF_E32 = lambda m, p, q: q.get("type") == "MARKET" and q.get("side") == "SELL"
P.STRENG = True
try:
    for seed_e32, was_e32 in ((200479, "E32: zweiter Perp-Stop über denselben Short"), (200540, "E33: überflüssiger Perp-Stop über dem verbliebenen Paar")):
        funde = P.echte(P.laeufe_runde(seed_e32, 30))
        pruefe(f"16.{was_e32} — strenger Lauf-Seed {seed_e32}: keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False
for mkt_e32, sig_e32, art_e32 in (("ETH", -0.25, "429"), ("ETH", -0.5, "429"), ("BTC", -0.25, "ablehnen"), ("BTC", -0.5, "ablehnen")):
    k = neues_konto(60000)
    d = neu_buch()
    lauf([E(mkt_e32, sig_e32)], env_echt(kapital=60000), d)
    for a_e32 in k.algos.values():
        a_e32["sichtbar_ab"] = B.n_listen + 8          # die Stops des Tages erscheinen in den Listen erst nach 8 Abfragen
    sym_e32 = mkt_e32 + "USDT"
    if art_e32 == "429":   # Rückkauf des Netto-Shorts scheitert dauerhaft → Schutz-Stop; der des Tages steht schon (unsichtbar) — keiner darf dazukommen
        B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", art="429", anzahl=10 ** 6)]
    else:                  # Rückkauf klappt, die Coins lassen sich nicht verkaufen → das Paar bleibt; der Stop des Tages (unsichtbar) ist überflüssig und darf nicht stehen bleiben
        B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=MARKT_VERKAUF_E32, art="ablehnen", anzahl=10 ** 6)]
    try:
        lauf([], env_echt(kapital=60000), d, notaus=True)
    finally:
        B.regeln = []
    g_e32 = lage(k, sym_e32)
    pruefe(f"16.E32/E33 Not-Aus {mkt_e32} {sig_e32:+.2f} ({art_e32}), Perp-Stop des Tages noch unsichtbar: "
           + ("kein zweiter Stop" if art_e32 == "429" else "der überflüssige Stop über dem Paar ist weg") + ", keine Befunde",
           not befunde(k, d) and g_e32["n_p"] == (1 if art_e32 == "429" else 0), (befunde(k, d), {x_: g_e32[x_] for x_ in ("coins", "pos", "p_qty", "n_p")}))

# E34 (strenger Lauf-Seed 203507): der Kurs springt mitten im Abgleich über den alten Perp-Stop (+8,9 %) — er löst aus und schliesst den Short. Der Perp-Teil rechnete mit der Position vom Rundenanfang, wollte einen
# Stop über den schon geschlossenen Short setzen (reduceOnly ohne Position: −2022) und warf damit den ganzen Abgleich ab (`if gescheitert: break`): die 0,19 ETH, die der Spot-Teil in der nächsten Runde
# gesichert hätte, blieben ohne Stop (811 USDT). Jetzt ist «−2022, frisch gelesen: keine Position» kein Fehler, sondern eine weitere Runde. (Der alte Code hatte ihn nicht — die Neuberechnung für den Perp-Teil
# aus dem Abbruch-Scan der Nachkontrolle machte ihn erreichbar.)
P.STRENG = True
try:
    funde = P.echte(P.laeufe_runde(203507, 30))
    pruefe("16.E34 strenger Lauf-Seed 203507 (alter Perp-Stop löst im Abgleich aus, der Short ist weg): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False
k_, sp_, fu_, dd_ = handlage(coins=0.5, short=0.0, kurs=100000.0)       # die Position ist schon zu (ein alter Stop hat ausgelöst) — der Abgleich rechnet noch mit einem Short von 0,3
dd_["beidseitig"] = True
s_ = L._soll(0.5, -0.3, 100000.0, dd_)
s_.update(frei=0.5, gebunden=0.0)
B.reduce_algo_streng = True
w_, ausn_ = [], None
try:
    L._perp_abgleich(fu_, "BTC", dd_, {}, {"stop_short": 120000.0}, s_, {"auftraege": []}, w_.append, [], [], lambda w=None: L._lage(sp_, fu_, dd_, w), False)
except Exception as ex_:  # noqa: BLE001
    ausn_ = ex_
finally:
    B.reduce_algo_streng = False
pruefe("16.E34 _perp_abgleich: Stop über einen Short, den es nicht mehr gibt (−2022, frisch gelesen: Position 0) → kein Fehler, eine weitere Runde",
       ausn_ is None and dd_.get("neue_runde") is True and lage(k_, "BTCUSDT")["n_p"] == 0, (ausn_, dd_.get("neue_runde"), lage(k_, "BTCUSDT"), w_))
w_, ausn_ = [], None
dd_ = {k_x: v_x for k_x, v_x in dd_.items() if k_x != "neue_runde"}
s_ = L._soll(0.5, -0.3, 100000.0, dd_)
s_.update(frei=0.5, gebunden=0.0)
B.reduce_algo_streng = True
try:   # Gegenprobe: die Position gibt es (Short 0,3, Kurs weiter weg) → der Stop wird ganz normal gesetzt
    k2_, sp2_, fu2_, dd2_ = handlage(coins=0.5, short=0.3, kurs=100000.0)
    dd2_["beidseitig"] = True
    s2_ = L._soll(0.5, -0.3, 100000.0, dd2_)
    s2_.update(frei=0.5, gebunden=0.0)
    L._perp_abgleich(fu2_, "BTC", dd2_, {}, {"stop_short": 120000.0}, s2_, {"auftraege": []}, w_.append, [], [], lambda w=None: L._lage(sp2_, fu2_, dd2_, w), False)
except Exception as ex_:  # noqa: BLE001
    ausn_ = ex_
finally:
    B.reduce_algo_streng = False
pruefe("16.E34 _perp_abgleich Gegenprobe: der Short existiert → der Stop steht (keine zweite Runde nötig)", ausn_ is None and lage(k2_, "BTCUSDT")["n_p"] == 1 and not dd2_.get("neue_runde"), (ausn_, lage(k2_, "BTCUSDT")))

# E35 (Lücken-Lauf-Seed 210028): die Antwort des Spot-Stops ging verloren, die Wiederholung hörte «Duplicate order» — der Stop steht, aber das Buch kennt nur seinen Kurs (`p_long`), nicht die ID (`spot: null`).
# Der Frühausstieg «Konto nicht lesbar» (F-a) vermerkte nur Märkte mit ID: der nach einer Kurslücke hängende Stop-Limit (33 USDT) blieb bis zum nächsten Tageslauf unbemerkt. Jetzt zählt jeder Stop-Eintrag im Buch.
_alt_l35 = P.LUECKEN
P.LUECKEN = True
try:
    funde = P.echte(P.laeufe_runde(210028, 30))
    pruefe("16.E35 Lücken-Lauf-Seed 210028 (Stop-ID unbekannt, Konto beim nächsten Lauf nicht lesbar): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.LUECKEN = _alt_l35
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
sz_ = ("BTC", 0.5, 1.0)
t_ = tag0h_(sz_)
if t_ is not None:
    k, d, env = t_
    b_ = json.loads(open(d).read())
    b_["echt"]["stops"][sz_[0]]["spot"] = None                           # das Buch kennt die ID des Stops nicht (nur p_long)
    open(d, "w").write(json.dumps(b_))
    B.regeln = [R._regel_lesen(("GET", "/api/v3/account", "vor503", 4))]
    try:
        P.lauf([P.E(sz_[0], sz_[2])], env, d)
    finally:
        B.regeln = []
    pruefe(f"16.E35 F-a {sz_}: «Konto nicht lesbar», das Buch kennt die Stop-ID nicht (spot: null, p_long gesetzt) → der Markt ist für die Nachkontrolle vermerkt (schutz_offen {offen_(d)})", sz_[0] in offen_(d), offen_(d))
    P.pending_abarbeiten()
    B.n_listen += 1000
    P.nachkontrolle(env, d)
    pruefe(f"16.E35 F-a {sz_}: nach der Nachkontrolle steht der Long (hängender Stop-Limit) wieder unter einem wirksamen Stop ({[b_x[:2] for b_x in befunde(k, d)][:2]})", not befunde(k, d), (lage(k, "BTCUSDT"), befunde(k, d)[:2]))
B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]

# E36 (Lauf-Seed 212699, streng + Lücken): zwei ausgelöste, über dem Kurs hängende Stop-Limits sperren die Coins; cancelReplace storniert beide, ohne den Ersatz zu setzen («nur_storno», 409). Zwei Lücken:
# (a) `_haengenden_ersetzen` kannte den Ausgang «nur_storno» nicht — die freien Coins blieben bis zur Nachkontrolle ohne Stop (der Aufrufer warnte nur); jetzt setzt `_nach_storno_stoppen` sofort einen Not-Stop aus ihnen;
# (b) die Menge für den zweiten hängenden Stop stammte vom Rundenanfang (0,1992) und kannte den Wegfall des ersten nicht (0,2545 wären nötig): jetzt rechnet der Schluss den Bedarf frisch (Soll − wirksame Stops − schon Zugeteiltes).
P.STRENG = True
_alt_l36 = P.LUECKEN
P.LUECKEN = True
try:
    funde = P.echte(P.laeufe_runde(212699, 30))
    pruefe("16.E36 streng + Lücken, Lauf-Seed 212699 (zwei hängende Stop-Limits, zweimal «nur_storno»): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.STRENG = False
    P.LUECKEN = _alt_l36
    B.reduce_algo_streng = False
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
k_, sp_, fu_, dd_ = handlage(coins=0.5, kurs=100000.0)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]                       # Konto ohne Markt-Stop (handlage setzt die Typen zurück): Börse UND Markt-Daten
dd_["rs"] = dict(dd_["rs"], typen=[x for x in dd_["rs"].get("typen", []) if x != "STOP_LOSS"])
eigener_spot_stop(sp_, dd_, 0.5, 95000.0)
B.bewegen("BTCUSDT", 85000.0)                                                       # Kurslücke unter das Limit (90250): der Stop ist ausgelöst und hängt
o_h_ = sp_.eigene_stops("BTCUSDT")[0]
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="nur_storno", anzahl=1)]
w_, g_ = [], []
try:
    ok_ = L._haengenden_ersetzen(sp_, "BTC", dict(dd_, kurs=85000.0), {}, o_h_, 0.5, 85000.0, w_.append, g_, lambda w=None: L._lage(sp_, fu_, dd_, w))
finally:
    B.regeln = []
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E36 _haengenden_ersetzen: cancelReplace storniert den hängenden Stop und lehnt den Not-Stop ab (409) → die freien Coins bekommen sofort einen Not-Stop (nicht «OHNE Stop»)",
       ok_ is True and gl_["n_s"] == 1 and abs(gl_["s_qty"] - 0.5) < 1e-6 and not any("OHNE Stop" in x_ for x_ in w_), (ok_, gl_, w_))

# E37 (Lücken-Not-Aus-Seed 214139): ein ausgelöster Stop-Limit hängt (Kurslücke); der Not-Aus will ihn per cancelReplace gegen einen Marktverkauf tauschen (503, unklar) und ihn dann löschen — drei Ablehnungen
# in Folge (503) verbrauchten die drei Versuche des Standards, die Coins blieben unter einem Stop, der nichts schützt (3'288 USDT). Jetzt löscht der Not-Aus mit dem langen Budget (SCHUTZ_WARTEN, fünf Versuche).
P.LUECKEN = True
try:
    funde = P.notaus_runde(214139)
    pruefe("16.E37 Lücken-Not-Aus-Seed 214139 (hängender Stop-Limit, drei Ablehnungen beim Löschen): keine echten Befunde", not P.echte(funde), [(f_[0], f_[2][:3] if isinstance(f_[2], (list, tuple)) else None) for f_ in P.echte(funde)][:3])
finally:
    P.LUECKEN = _alt_l36
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
k = neues_konto(60000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
d = neu_buch()
lauf([E("BTC", 0.5)], env_echt(kapital=60000), d)
_limits37 = [o_["preis"] for o_ in k.orders.values() if o_["symbol"] == "BTCUSDT" and o_["typ"] == "STOP_LOSS_LIMIT" and o_["status"] in ("NEW", "PARTIALLY_FILLED")]
if _limits37:
    B.bewegen("BTCUSDT", round(min(_limits37) * 0.99, 2))                           # Kurslücke: der Stop hängt über dem Kurs
    B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=1), regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=3)]
    try:
        lauf([], env_echt(kapital=60000), d, notaus=True)
    finally:
        B.regeln = []
    pruefe("16.E37 Not-Aus, hängender Stop-Limit, cancelReplace 503 und das Löschen dreimal 503: die Coins sind verkauft oder stehen unter einem wirksamen Stop",
           not befunde(k, d), (befunde(k, d)[:2], lage(k, "BTCUSDT")))
B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]

# E38 (Lücken-Not-Aus-Seed 214517, Prüf-Werkzeug): ein Coin-Rest von 5,994e-05 BTC lag beim Not-Aus UNTER dem Binance-Minimum (4,95 USDT); ein Kurssprung (+1,9 %) NACH dem Entscheid machte ihn verkäuflich — flach() rechnet
# mit dem Schlusskurs, der saubere Not-Aus verkauft Coins, die das Buch nicht kennt, nie von selbst. Kein Befund des Piloten: der Fuzzer unterscheidet jetzt (`_nur_coins_uebrig`).
P.LUECKEN = True
try:
    funde = P.notaus_runde(214517)
    pruefe("16.E38 Lücken-Not-Aus-Seed 214517 (Rest unter dem Minimum, Kurssprung nach dem Entscheid): keine Befunde", not P.echte(funde), [f_[0] for f_ in P.echte(funde)][:3])
finally:
    P.LUECKEN = _alt_l36
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]

# E39 (strenger Lauf-Seed 240021, auch am Stand der 15. Runde): nach Ablehnungen setzt Pilot 2.0 für gewachsene Positionen Zusatz-Stops statt eines grösseren (cancelReplace ist dann gesperrt) — über Tage standen
# fünf Spot-Stops am selben Preis, das Maximum (Filter MAX_NUM_ALGO_ORDERS). Ein weiterer Zusatz-Stop (0,00299 BTC, 241 USDT) war nicht mehr möglich, und jede Nachkontrolle scheiterte ebenso («weiterhin nicht gesichert»).
# Jetzt legt `_stops_zusammenlegen` den Zusatz-Stop mit dem grössten bestehenden zusammen (cancelReplace: die Zahl der Aufträge bleibt gleich).
P.STRENG = True
try:
    for seed_e39 in (240021, 240838):
        funde = P.echte(P.laeufe_runde(seed_e39, 30))
        pruefe(f"16.E39 strenger Lauf-Seed {seed_e39} (fünf Spot-Stops = Limit, ein weiterer Zusatz-Stop nötig): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False
k_, sp_, fu_, dd_ = handlage(coins=0.1, kurs=100000.0)
for _i39 in range(5):
    eigener_spot_stop(sp_, dd_, 0.01, 90000.0)                                                 # fünf Stops à 0,01 = das Limit des Paares
w_, g_ = [], []
L._spot_rest_sichern(sp_, "BTC", dd_, {}, {"kurs": 100000.0, "frei": 0.05, "gebunden": 0.05}, 0.08, 95000.0, w_.append, g_)
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E39 _spot_rest_sichern am Limit der Stop-Aufträge: der Zusatz-Stop (0,03) wird mit dem grössten bestehenden zusammengelegt (5 Aufträge, zusammen 0,08), nicht «ohne Stop»",
       gl_["n_s"] == 5 and abs(gl_["s_qty"] - 0.08) < 1e-6 and not any("ohne Stop" in x_ for x_ in w_), (gl_, w_, g_))
k_, sp_, fu_, dd_ = handlage(coins=0.1, kurs=100000.0)
for _i39 in range(4):
    eigener_spot_stop(sp_, dd_, 0.01, 90000.0)
w_, g_ = [], []
L._spot_rest_sichern(sp_, "BTC", dd_, {}, {"kurs": 100000.0, "frei": 0.06, "gebunden": 0.04}, 0.07, 95000.0, w_.append, g_)
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E39 Gegenprobe: unter dem Limit (4 Stops) kommt ein ganz normaler Zusatz-Stop dazu (5 Aufträge, 0,07)", gl_["n_s"] == 5 and abs(gl_["s_qty"] - 0.07) < 1e-6, (gl_, w_))
k_, sp_, fu_, dd_ = handlage(coins=0.1, kurs=100000.0)
for _i39 in range(5):
    eigener_spot_stop(sp_, dd_, 0.01, 90000.0)
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="nur_storno", anzahl=1)]
w_, g_ = [], []
try:
    L._spot_rest_sichern(sp_, "BTC", dd_, {}, {"kurs": 100000.0, "frei": 0.05, "gebunden": 0.05}, 0.08, 95000.0, w_.append, g_)
finally:
    B.regeln = []
pruefe("16.E39 Zusammenlegen: kommt nur der Storno an (409), ist die Nachkontrolle vorgemerkt (die frei gewordenen Coins bekommen dort ihren Stop)", dd_.get("nachkontrolle") is True, (dd_.get("nachkontrolle"), w_, g_))

# E40 (strenger Lauf-Seed 242916, auch am Stand der 15. Runde): der Not-Aus kauft den Netto-Short zurück, die Coins lassen sich nicht verkaufen (PERCENT_PRICE_BY_SIDE), der alte Perp-Stop (über den Netto-Short,
# jetzt zu gross) lässt sich nicht löschen (503, fünf Versuche): die Coins bekamen einen Spot-Stop über ALLES — löst DER aus, stand der Short (0,2059) nur zu 0,094 unter dem alten Stop (0,112 ETH ohne Stop).
# Jetzt steht der Markt dann beidseitig: die Perp-Stops zusammen über den ganzen Short — aber nur, wenn die Coins ihren Spot-Stop wirklich haben.
P.STRENG = True
try:
    funde = P.echte(P.laeufe_runde(242916, 30))
    pruefe("16.E40 strenger Lauf-Seed 242916 (Not-Aus, Netto-Short zurückgekauft, Coins unverkäuflich, alter Perp-Stop nicht löschbar): keine Befunde", not funde,
           [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False


def e40_notaus_(regeln_, st_=None, alte_=((0.1, 110000.0),), kurs_=100000.0, frei_=0.2, unklar_=None):
    """Paar (Coins = Short = 0,2) mit alten Perp-Stops über den Netto-Short; `_notaus_schutz` direkt. → (ok, Lage, Warnungen, Buch, Zahl der Perp-Stop-Aufträge)"""
    k0_, sp0_, fu0_, dd0_ = handlage(coins=frei_, short=0.2, kurs=kurs_)
    for m_, p_ in alte_:
        fu0_.stop_menge("BTCUSDT", "BUY", m_, p_, dd0_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    n0_ = len(B.log)
    B.regeln = regeln_
    w0_, s0_ = [], {} if st_ is None else st_
    try:
        ok0_ = L._notaus_schutz(sp0_, fu0_, s0_, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, frei_, 0.0, kurs_, dd0_["rs"], w0_.append, "echt", unklar=unklar_)
    finally:
        B.regeln = []
    neu_ = sum(1 for x_ in B.log[n0_:] if x_[1] == "POST" and x_[2] == "/fapi/v1/algoOrder" and x_[4] == 200)
    return ok0_, lage(k0_, "BTCUSDT"), w0_, s0_, neu_


LOESCHEN_KAPUTT_ = regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_])
pruefe("16.E40 Not-Aus-Schutz, Paar, alter Perp-Stop (0,1) nicht löschbar: Spot-Stop über ALLE Coins UND die Perp-Stops zusammen über den ganzen Short (alter 0,1 + neuer 0,1)",
       ok_ and abs(gl_["s_qty"] - 0.2) < 1e-6 and abs(gl_["p_qty"] - 0.2) < 1e-6 and gl_["n_p"] == 2 and neu_ == 1, (ok_, gl_, w_, neu_))
pruefe("16.E40 … das Buch kennt den neuen Perp-Stop (der alte steht nur in der Liste)", st_.get("perp") is not None and st_.get("perp_cid") and not st_.get("perp_weitere"), st_)
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_], st_={"perp": 901, "perp_cid": "p2aAAAA"})
pruefe("16.E40 … kannte das Buch den alten Stop schon, merkt es ihn als «weiteren» (beide bekannt)", st_.get("perp") != 901 and [901, "p2aAAAA"] in (st_.get("perp_weitere") or []), st_)
ok_, gl_, w_, st_, neu_ = e40_notaus_([])
pruefe("16.E40 Gegenprobe: geht das Löschen, ist das Paar neutral — weder Spot- noch Perp-Stop bleibt", ok_ and gl_["n_s"] == 0 and gl_["n_p"] == 0 and neu_ == 0, (ok_, gl_, w_, neu_))
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_, regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="vor503", anzahl=10 ** 6)])
pruefe("16.E40 der Spot-Stop über die Coins wird abgelehnt: KEIN zusätzlicher Perp-Stop (löste er mit dem alten aus, lägen die Coins ohne Absicherung UND ohne Stop) — laut gewarnt",
       ok_ is False and gl_["n_s"] == 0 and abs(gl_["p_qty"] - 0.1) < 1e-6 and neu_ == 0 and any("Schutz-Stop abgelehnt" in x_ for x_ in w_), (ok_, gl_, w_, neu_))
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_, regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)])
pruefe("16.E40 der ergänzende Perp-Stop wird abgelehnt: laut gemeldet («Sofort prüfen»), der Spot-Stop bleibt, Not-Aus nicht «ok»",
       ok_ is False and abs(gl_["s_qty"] - 0.2) < 1e-6 and abs(gl_["p_qty"] - 0.1) < 1e-6 and any("nicht gestoppt" in x_ for x_ in w_), (ok_, gl_, w_, neu_))
# Liste der Perp-Stops nicht lesbar: kennt das Buch schon zwei Stops, kommt keiner dazu (sonst käme in jedem Takt der Nachkontrolle einer dazu); kennt es nur einen, kommt einer über den ganzen Short dazu
# der ergänzende Perp-Stop würde sofort auslösen (der Kurs ist seit dem Lesen auf 115'000 gesprungen) und kein frischer Kurs ist lesbar → zum Markt: dieser Teil des Shorts (0,1) wird zurückgekauft, der alte Stop deckt den Rest
k_, sp_, fu_, dd_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
k_.fut = 20000.0                                                                           # sonst würde der Short beim Kurssprung zwangsgeschlossen
fu_.stop_menge("BTCUSDT", "BUY", 0.1, 140000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
B.bewegen("BTCUSDT", 115000.0)
B.regeln = list(KURS_WEG) + [LOESCHEN_KAPUTT_]
w_ = []
try:
    L._notaus_schutz(sp_, fu_, {}, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, 0.2, 0.0, 100000.0, dd_["rs"], w_.append, "echt")
finally:
    B.regeln = []
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E40 der ergänzende Perp-Stop würde sofort auslösen, kein frischer Kurs lesbar → zum Markt: 0,1 des Shorts zurückgekauft (Rest 0,1 unter dem alten Stop)",
       abs(gl_["pos"] + 0.1) < 1e-6 and abs(gl_["p_qty"] - 0.1) < 1e-6 and abs(gl_["s_qty"] - 0.2) < 1e-6, (gl_, w_))
LISTE_KAPUTT_ = regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6)
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_, LISTE_KAPUTT_], st_={"perp": 901, "perp_cid": "p2aAAAA", "perp_weitere": [[902, "p2aBBBB"], [903, "p2aCCCC"]]}, alte_=((0.1, 110000.0), (0.1, 111000.0), (0.1, 112000.0)))
pruefe("16.E40 Perp-Liste nicht lesbar, das Buch kennt schon PERP_BLIND_MAX (3) Stops: keiner kommt dazu (19. Prüfung K6: die Schwelle ist dieselbe wie im Tageslauf)", neu_ == 0 and gl_["n_p"] == 3 and ok_ is False, (ok_, gl_, w_, neu_))
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_, LISTE_KAPUTT_], st_={"perp": 901, "perp_cid": "p2aAAAA", "perp_weitere": [[902, "p2aBBBB"]]}, alte_=((0.1, 110000.0), (0.1, 111000.0)))
pruefe("19.K6 Perp-Liste nicht lesbar, das Buch kennt zwei Stops (0,1 + 0,1 von 0,2): ein DRITTER ganzer reduceOnly-Stop kommt dazu — vorher blieb ein Teil des Shorts ohne Stop, nur laut gemeldet",
       neu_ == 1 and gl_["n_p"] == 3 and gl_["p_qty"] >= 0.2 - 1e-9 and ok_ is True, (ok_, gl_, w_, neu_))
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_, LISTE_KAPUTT_], st_={"perp": 901, "perp_cid": "p2aAAAA"})
pruefe("16.E40 Perp-Liste nicht lesbar, das Buch kennt nur einen Stop: einer über den ganzen Short kommt dazu, der alte bleibt gemerkt", neu_ == 1 and abs(gl_["p_qty"] - 0.3) < 1e-6 and [901, "p2aAAAA"] in (st_.get("perp_weitere") or []), (ok_, gl_, w_, neu_, st_))
# … ist der Markt BEIDSEITIG (hier: ein unklarer Short-Auftrag), steht der ganze Short ohnehin unter dem neuen Stop: der alte, nicht löschbare bleibt, aber es kommt KEIN weiterer ergänzender Stop dazu (R16-M66: ohne die
# Ausnahme «beidseitig» riefe der Schluss `perp_ganz_ergaenzen` trotzdem auf, und bei unlesbarer Liste käme in jedem Takt der Nachkontrolle ein weiterer ganzer reduceOnly-Stop dazu)
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_, LISTE_KAPUTT_], st_={"perp": 901, "perp_cid": "p2aAAAA"}, unklar_=0.0)
pruefe("20.M66 Markt beidseitig (unklarer Auftrag), Perp-Liste nicht lesbar, alter Stop nicht löschbar: genau EIN neuer Stop über den ganzen Short — kein weiterer ergänzender (beide Stops stehen, der alte bleibt gemerkt)",
       neu_ == 1 and gl_["n_p"] == 2 and abs(gl_["p_qty"] - 0.3) < 1e-6 and [901, "p2aAAAA"] in (st_.get("perp_weitere") or []), (ok_, gl_, w_, neu_, st_))

# E41 (Nachprüfung zu E40, Kette von Nachkontroll-Durchgängen): steht der Markt schon beidseitig vollständig (alle Coins unter einem Spot-Stop UND der ganze Short unter Perp-Stops), räumt der Not-Aus nicht auf:
# das Aufräumen (der Spot-Stop über die Absicherung ist «zu gross») löschte den Spot-Stop in JEDEM Takt der Nachkontrolle und setzte ihn gleich neu — solange ein Perp-Stop nicht löschbar war, ein Fenster ohne Schutz.
def e41_schreibend_(n0_):
    return [(x_[1], x_[2], x_[3].get("type")) for x_ in B.log[n0_:] if x_[1] in ("POST", "DELETE")]


k_, sp_, fu_, dd_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
fu_.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
st_ = {}
B.regeln = [LOESCHEN_KAPUTT_]
schreib_ = []
try:
    for _d41 in range(4):
        n0_ = len(B.log)
        L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, k_.frei["BTC"], k_.gesperrt["BTC"], 100000.0, dd_["rs"], [].append, "echt")
        schreib_.append(e41_schreibend_(n0_))
finally:
    B.regeln = []
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E41 Not-Aus-Schutz, Paar, alter Perp-Stop nicht löschbar: nach dem ersten Durchgang stehen beide Seiten ganz — die drei folgenden schreiben NICHTS (kein Löschen und Neusetzen des Spot-Stops)",
       len(schreib_[0]) == 2 and schreib_[1:] == [[], [], []] and abs(gl_["s_qty"] - 0.2) < 1e-6 and abs(gl_["p_qty"] - 0.2) < 1e-6, (schreib_, gl_))
# Gegenprobe a: Spot-Stop über alle Coins, aber KEIN Perp-Stop → nicht vollständig: der Spot-Stop über die Absicherung wird aufgeräumt (das Paar ist neutral)
k_, sp_, fu_, dd_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
eigener_spot_stop(sp_, dd_, 0.2, 95000.0)
n0_ = len(B.log)
L._notaus_schutz(sp_, fu_, {}, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, 0.0, 0.2, 100000.0, dd_["rs"], [].append, "echt")
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E41 Gegenprobe: Spot-Stop über alle Coins, aber kein Perp-Stop (nicht beidseitig vollständig) → normaler Weg: der Spot-Stop über die Absicherung wird gelöscht", gl_["n_s"] == 0 and gl_["n_p"] == 0, (gl_, e41_schreibend_(n0_)))
# Gegenprobe b: Perp-Stops über den ganzen Short, aber der Spot-Stop deckt nur einen Teil der Coins → normaler Weg: beide Seiten werden aufgeräumt
k_, sp_, fu_, dd_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
eigener_spot_stop(sp_, dd_, 0.1, 95000.0)
fu_.stop_menge("BTCUSDT", "BUY", 0.2, 110000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
n0_ = len(B.log)
L._notaus_schutz(sp_, fu_, {}, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, 0.1, 0.1, 100000.0, dd_["rs"], [].append, "echt")
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E41 Gegenprobe: Perp-Stops über den ganzen Short, aber der Spot-Stop deckt nur die Hälfte der Coins (nicht vollständig) → normaler Weg: beide Seiten aufgeräumt", gl_["n_s"] == 0 and gl_["n_p"] == 0, (gl_, e41_schreibend_(n0_)))
# Gegenprobe c: der Spot-Stop über alle Coins ist ein HÄNGENDER Stop-Limit (Konto ohne STOP_LOSS, Kurslücke) — er schützt nichts und zählt nicht → normaler Weg: er wird gelöscht
k_, sp_, fu_, dd_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
B.stop_typen = [x_ for x_ in B.stop_typen if x_ != "STOP_LOSS"]
dd_["rs"] = dict(dd_["rs"], typen=[x_ for x_ in dd_["rs"].get("typen", []) if x_ != "STOP_LOSS"])
try:
    eigener_spot_stop(sp_, dd_, 0.2, 95000.0)
    fu_.stop_menge("BTCUSDT", "BUY", 0.2, 130000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    B.bewegen("BTCUSDT", 85000.0)                                                      # Kurslücke unter das Limit: der Stop ist ausgelöst und hängt
    n0_ = len(B.log)
    B.regeln = [regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=10 ** 6),   # er lässt sich weder löschen noch ersetzen (E42): er bleibt in der Liste, schützt aber nichts
                regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=10 ** 6)]
    w_ = []
    try:
        L._notaus_schutz(sp_, fu_, {}, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, 0.0, 0.2, 85000.0, dd_["rs"], w_.append, "echt")
    finally:
        B.regeln = []
finally:
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
pruefe("16.E41 Gegenprobe: der Spot-Stop über alle Coins hängt (ausgelöster Stop-Limit, weder löschbar noch ersetzbar) und zählt nicht als Schutz → normaler Weg (die Meldung zum zu grossen Spot-Stop kommt)",
       any("zu grosser Spot-Stop" in x_ for x_ in w_), (w_, e41_schreibend_(n0_)[:6]))

# Gegenprobe d: ein unklarer Short-Auftrag (0,05) macht den Markt beidseitig MIT dieser Menge — die Perp-Stops müssen den Short UND den unklaren Auftrag decken; «vollständig» nach dem Stand ohne ihn gilt dort nicht
k_, sp_, fu_, dd_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
eigener_spot_stop(sp_, dd_, 0.2, 95000.0)
fu_.stop_menge("BTCUSDT", "BUY", 0.2, 110000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
L._notaus_schutz(sp_, fu_, {}, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, 0.0, 0.2, 100000.0, dd_["rs"], [].append, "echt", unklar=0.05)
gl_ = lage(k_, "BTCUSDT")
pruefe("16.E41 Gegenprobe: unklarer Short-Auftrag (beidseitig) → die Perp-Stops decken Short + unklaren Auftrag (0,25), auch wenn der Stand ohne ihn vollständig aussähe", abs(gl_["p_qty"] - 0.25) < 1e-6 or gl_["p_qty"] >= 0.25 - 1e-6, gl_)

# E42 (streng + Lücken, Not-Aus-Seed 257630, 10'711 USDT): ein ausgelöster Stop-Limit hängt über dem Kurs (Kurslücke, Konto ohne STOP_LOSS), das Verkaufen wird abgelehnt (PERCENT_PRICE_BY_SIDE) UND das Löschen
# scheitert dauerhaft (429) — die Coins (netto +0,149 BTC) blieben ohne wirksamen Stop. Der Tageslauf ersetzt einen hängenden Stop per cancelReplace durch einen Not-Stop (`_haengenden_ersetzen`); der Not-Aus kannte nur
# das Löschen. Jetzt versucht er nach einem gescheiterten Löschen dasselbe Ersetzen (5/10/20/35 %).
P.STRENG = True
P.LUECKEN = True
try:
    funde = P.notaus_runde(257630)
    pruefe("16.E42 streng + Lücken, Not-Aus-Seed 257630 (hängender Stop-Limit nicht löschbar, Verkauf abgelehnt): keine echten Befunde", not P.echte(funde),
           [(f_[0], f_[2][:3] if isinstance(f_[2], (list, tuple)) else None) for f_ in P.echte(funde)][:3])
finally:
    P.STRENG = False
    P.LUECKEN = _alt_l36
    B.reduce_algo_streng = False
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]


def e42_notaus_(regeln_):
    """Long 0,5 BTC unter einem ausgelösten, hängenden Stop-Limit (Konto ohne STOP_LOSS, Kurslücke auf 85'000); `_notaus_schutz` direkt. → (ok, Lage, Warnungen, Buch)"""
    k0_, sp0_, fu0_, dd0_ = handlage(coins=0.5, kurs=100000.0)
    B.stop_typen = [x_ for x_ in B.stop_typen if x_ != "STOP_LOSS"]
    dd0_["rs"] = dict(dd0_["rs"], typen=[x_ for x_ in dd0_["rs"].get("typen", []) if x_ != "STOP_LOSS"])
    try:
        eigener_spot_stop(sp0_, dd0_, 0.5, 95000.0)
        B.bewegen("BTCUSDT", 85000.0)                                                      # Kurslücke unter das Limit: der Stop ist ausgelöst und hängt
        B.regeln = regeln_
        w0_, s0_ = [], {}
        try:
            ok0_ = L._notaus_schutz(sp0_, fu0_, s0_, "BTC", "BTCUSDT", "BTC", 0.0, 0.0, 0.0, 0.5, 85000.0, dd0_["rs"], w0_.append, "echt")
        finally:
            B.regeln = []
    finally:
        B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
    return ok0_, lage(k0_, "BTCUSDT"), w0_, s0_


LOESCHEN_SPOT_KAPUTT_ = regel(methode="DELETE", pfad="/api/v3/order", art="429", anzahl=10 ** 6)
ok_, gl_, w_, st_ = e42_notaus_([LOESCHEN_SPOT_KAPUTT_])
pruefe("16.E42 hängender Stop-Limit nicht löschbar → per cancelReplace steht ein Not-Stop über die 0,5 BTC (nicht «OHNE Stop»), das Buch kennt ihn",
       ok_ and abs(gl_["s_qty"] - 0.5) < 1e-6 and gl_["n_s"] == 1 and st_.get("spot") is not None and max(gl_["s_preise"]) < 85000.0, (ok_, gl_, w_, st_))
ok_, gl_, w_, st_ = e42_notaus_([LOESCHEN_SPOT_KAPUTT_, regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=10 ** 6)])
pruefe("16.E42 auch cancelReplace geht nicht: der hängende bleibt, die Lücke wird LAUT gemeldet («weder löschen noch ersetzen») und der Not-Aus gilt nicht als ok",
       ok_ is False and gl_["n_s"] == 0 and any("weder löschen noch ersetzen" in x_ for x_ in w_), (ok_, gl_, w_))
ok_, gl_, w_, st_ = e42_notaus_([LOESCHEN_SPOT_KAPUTT_, regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="kurs", sym="BTCUSDT", preis=80000.0, anzahl=1)])  # der Kurs fällt beim ersten Versuch unter den 5-%-Preis
pruefe("16.E42 der Kurs fällt beim cancelReplace unter den 5-%-Not-Stop (80'750 > 80'000, «würde sofort auslösen»): am Ende steht trotzdem ein Not-Stop unter dem Kurs",
       ok_ and abs(gl_["s_qty"] - 0.5) < 1e-6 and gl_["s_preise"] and max(gl_["s_preise"]) < 80000.0, (ok_, gl_, w_))
# nach dem Ersetzen ist die Stop-Liste nicht lesbar (erste Lesung ging): unbekannt, ob der Not-Stop angekommen ist → laut gemeldet
k0_, sp0_, fu0_, dd0_ = handlage(coins=0.5, kurs=100000.0)
B.stop_typen = [x_ for x_ in B.stop_typen if x_ != "STOP_LOSS"]
dd0_["rs"] = dict(dd0_["rs"], typen=[x_ for x_ in dd0_["rs"].get("typen", []) if x_ != "STOP_LOSS"])
try:
    eigener_spot_stop(sp0_, dd0_, 0.5, 95000.0)
    B.bewegen("BTCUSDT", 85000.0)
    orig_es_, n_es_ = sp0_.eigene_stops, [0]

    def es_(sym_):
        n_es_[0] += 1
        if n_es_[0] >= 2:
            raise RuntimeError("Liste nicht lesbar")
        return orig_es_(sym_)
    sp0_.eigene_stops = es_
    B.regeln = [LOESCHEN_SPOT_KAPUTT_]
    w_ = []
    try:
        ok_ = L._notaus_schutz(sp0_, fu0_, {}, "BTC", "BTCUSDT", "BTC", 0.0, 0.0, 0.0, 0.5, 85000.0, dd0_["rs"], w_.append, "echt")
    finally:
        B.regeln = []
finally:
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
pruefe("16.E42 nach dem Ersetzen ist die Stop-Liste nicht lesbar: unbekannt, ob der Not-Stop steht → laut gemeldet, nicht «ok»", ok_ is False and any("weder löschen noch ersetzen" in x_ for x_ in w_), (ok_, w_))
# Coins unter einem hängenden, weder löschbaren noch ersetzbaren Stop-Limit sind NICHT gestoppt: der ergänzende Perp-Stop (E40) käme nicht dazu — löste er aus, kaufte er die Absicherung zurück und die ungeschützten Coins
# wären netto länger. Netto long 0,2 BTC (Coins 0,3, Short 0,1), 0,2 Coins unter dem hängenden Stop, ein zu grosser, nicht löschbarer Perp-Stop (0,05).
k0_, sp0_, fu0_, dd0_ = handlage(coins=0.3, short=0.1, kurs=100000.0)
B.stop_typen = [x_ for x_ in B.stop_typen if x_ != "STOP_LOSS"]
dd0_["rs"] = dict(dd0_["rs"], typen=[x_ for x_ in dd0_["rs"].get("typen", []) if x_ != "STOP_LOSS"])
try:
    eigener_spot_stop(sp0_, dd0_, 0.2, 95000.0)
    fu0_.stop_menge("BTCUSDT", "BUY", 0.05, 130000.0, dd0_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
    B.bewegen("BTCUSDT", 85000.0)                                                      # Kurslücke: der Spot-Stop-Limit hängt
    n0_ = len(B.log)
    B.regeln = [LOESCHEN_SPOT_KAPUTT_, regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=10 ** 6), LOESCHEN_KAPUTT_]
    w_ = []
    try:
        ok_ = L._notaus_schutz(sp0_, fu0_, {}, "BTC", "BTCUSDT", "BTC", -0.1, -0.1, 0.1, 0.2, 85000.0, dd0_["rs"], w_.append, "echt")
    finally:
        B.regeln = []
finally:
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
neu_ = sum(1 for x_ in B.log[n0_:] if x_[1] == "POST" and x_[2] == "/fapi/v1/algoOrder" and x_[4] == 200)
gl_ = lage(k0_, "BTCUSDT")
pruefe("16.E42 Coins unter einem hängenden, nicht ersetzbaren Stop-Limit gelten nicht als gestoppt: KEIN ergänzender Perp-Stop (der Perp-Stop bleibt bei 0,05), die Lücke wird laut gemeldet",
       neu_ == 0 and abs(gl_["p_qty"] - 0.05) < 1e-6 and ok_ is False and any("weder löschen noch ersetzen" in x_ for x_ in w_), (ok_, gl_, w_, neu_))
ok_, gl_, w_, st_ = e42_notaus_([])
pruefe("16.E42 Gegenprobe: geht das Löschen, wird der hängende Stop gelöscht und ein Not-Stop aus den freien Coins gesetzt (kein cancelReplace nötig)",
       ok_ and abs(gl_["s_qty"] - 0.5) < 1e-6 and gl_["n_s"] == 1 and not any("durch einen Not-Stop ersetzt" in x_ for x_ in w_), (ok_, gl_, w_))

# E43 (Lücken-Not-Aus-Seed 324065, Prüf-Werkzeug): ein hängender Stop-Limit sperrt 0,00238 BTC, das Löschen UND cancelReplace werden dauerhaft abgelehnt (503) und der Perp-Stop dauerhaft (429): die Coins lassen sich
# weder freigeben noch stoppen — jeder Weg ist zu, die Lücke ist unvermeidbar (E42 meldet sie laut). Der Fuzzer stufte sie als echten Befund ein (jede der beiden Störungen allein reicht dafür nicht, 12. Prüfung K1);
# jetzt gilt beides zusammen bei einem hängenden Stop als DAUER_.
LOESCHEN_TOT_ = regel(methode="DELETE", pfad="/api/v3/order", art="vor503", anzahl=99, anzahl0=99)
ERSETZEN_TOT_ = regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=99, anzahl0=99)
k_, sp_, fu_, dd_ = handlage(coins=0.5, kurs=100000.0)
B.stop_typen = [x_ for x_ in B.stop_typen if x_ != "STOP_LOSS"]
dd_["rs"] = dict(dd_["rs"], typen=[x_ for x_ in dd_["rs"].get("typen", []) if x_ != "STOP_LOSS"])
try:
    eigener_spot_stop(sp_, dd_, 0.5, 95000.0)
    B.bewegen("BTCUSDT", 85000.0)                                                      # der Stop hängt
    pruefe("16.E43 Einstufung: hängender Stop-Limit sperrt die Coins, Löschen UND cancelReplace dauerhaft abgelehnt → DAUER_ (unvermeidbar)",
           P._dauer([LOESCHEN_TOT_, ERSETZEN_TOT_], "LONG_OHNE_STOP", k_, "BTCUSDT") is True)
    pruefe("16.E43 … jede der beiden Störungen allein reicht nicht (K1)",
           not P._dauer([LOESCHEN_TOT_], "LONG_OHNE_STOP", k_, "BTCUSDT") and not P._dauer([ERSETZEN_TOT_], "LONG_OHNE_STOP", k_, "BTCUSDT"))
    pruefe("16.E43 … und nur, wenn die Coins wirklich von einem hängenden Stop gesperrt sind (kein hängender in einem anderen Markt: nicht entschuldigt)",
           not P._dauer([LOESCHEN_TOT_, ERSETZEN_TOT_], "LONG_OHNE_STOP", k_, "ETHUSDT"))
    pruefe("16.E43 … und nicht für die Short-Seite", not P._dauer([LOESCHEN_TOT_, ERSETZEN_TOT_], "SHORT_OHNE_STOP", k_, "BTCUSDT"))
finally:
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
k_, sp_, fu_, dd_ = handlage(coins=0.5, kurs=100000.0)
eigener_spot_stop(sp_, dd_, 0.5, 95000.0)                                               # ein funktionierender Stop (kein hängender): dieselben Störungen entschuldigen nichts
pruefe("16.E43 … ohne hängenden Stop (die Coins sind frei oder gestoppt) entschuldigen dieselben Störungen nichts", not P._dauer([LOESCHEN_TOT_, ERSETZEN_TOT_], "LONG_OHNE_STOP", k_, "BTCUSDT"))
P.LUECKEN = True
try:
    funde = P.notaus_runde(324065)
    pruefe("16.E43 Lücken-Not-Aus-Seed 324065: keine echten Befunde (die unvermeidbare Lücke ist als DAUER_ eingestuft)", not P.echte(funde), [f_[0] for f_ in P.echte(funde)][:3])
finally:
    P.LUECKEN = _alt_l36
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]

# E44 (strenger Lauf-Seed 312454, Prüf-Werkzeug, wie E38): ein Konto ohne echtes Geld, der STOP kam mitten im Tageslauf, ein Coin-Rest (6e-05 BTC) lag UNTER dem Binance-Minimum (3,86 USDT) — ein Kurssprung (+31 %) machte ihn
# später verkäuflich (5,08 USDT). Den verkauft der Not-Aus nie von selbst (das Buch kennt ihn nicht) und meldet ihn in einem Testnetz-Konto nicht einmal: kein Befund. Die Marke gilt nur für Konten ohne echtes Geld —
# bei echtem Geld meldet der Not-Aus solche Coins («das Buch kennt es nicht»), und ein «alles zu» mit verkäuflichem Rest bleibt ein Befund.
P.STRENG = True
try:
    for tage_e44 in (6, 30):
        funde = P.echte(P.laeufe_runde(312454, tage_e44))
        pruefe(f"16.E44 strenger Lauf-Seed 312454 ({tage_e44} Tage, Coin-Rest unter dem Minimum wird durch einen Kurssprung verkäuflich): keine Befunde", not funde, [(f_[0], f_[1].get("tag"), f_[1].get("wann")) for f_ in funde][:3])
finally:
    P.STRENG = False
    B.reduce_algo_streng = False
k_, sp_, fu_, dd_ = handlage(coins=0.0001, kurs=100000.0)
P.MINIMUM_GESEHEN[0] = True
pruefe("16.E44 _nur_coins_uebrig: nur ein Coin-Rest, die Marke gilt (Konto ohne echtes Geld) → kein Befund", P._nur_coins_uebrig(k_, {"zeilen": []}, "unter dem Binance-Minimum", marke=True))
pruefe("16.E44 … ohne die Marke (echtes Geld) oder ohne den Hinweis in den Zeilen gilt er nicht", not P._nur_coins_uebrig(k_, {"zeilen": []}, "unter dem Binance-Minimum") and P._nur_coins_uebrig(k_, {"zeilen": ["Rest unter dem Binance-Minimum"]}, "unter dem Binance-Minimum"))
P.MINIMUM_GESEHEN[0] = False
pruefe("16.E44 … und nicht, wenn nie ein Rest unter dem Minimum lag", not P._nur_coins_uebrig(k_, {"zeilen": []}, "unter dem Binance-Minimum", marke=True))
k_, sp_, fu_, dd_ = handlage(coins=0.0001, short=0.0001, kurs=100000.0)
P.MINIMUM_GESEHEN[0] = True
pruefe("16.E44 … und nicht bei einer offenen Position (dann bleibt es ein Befund)", not P._nur_coins_uebrig(k_, {"zeilen": []}, "unter dem Binance-Minimum", marke=True))
P.MINIMUM_GESEHEN[0] = False

# ───────── 16. Prüfung: Lücken der Mutationsprobe am Endstand (Seed-Tests drifteten; jedes Muster hat jetzt ein direktes Szenario) ─────────
# R16-M2/M3/M4 (H6, zweite Schicht): die Tests 16.H6 prüften nur das Endergebnis «kein Short ohne Stop» — das erreicht auch der Code, der die alten Stops zu früh löscht, weil ein späterer
# Versuch den Rückkauf nachholt. Hier: (a) JEDER Rückkauf nur zur Hälfte ausgeführt (der Rest bleibt über alle Runden), neue Stops dauerhaft abgelehnt → der Rest braucht die alten Stops;
# (b) die alten Perp-Stops sind verzögert sichtbar (nicht in der Liste, aber im Buch), der Rückkauf kommt nie an, neue Stops dauerhaft abgelehnt → sie dürfen nicht gelöscht werden und bleiben im Buch.
import json as _json
def tag0_(sz_, unsichtbar=False):
    markt_, z0_, z1_ = sz_
    k_ = P.neues_konto(20000)
    d_ = P.neu_buch()
    env_ = P.env_echt(kapital=20000)
    if unsichtbar:
        B.regeln = [dict(methode="POST", pfad="/fapi/v1/algoOrder", art="unsichtbar", anzahl=1, listen=10 ** 6)]
    try:
        P.lauf([P.E(markt_, z0_)], env_, d_)
    finally:
        B.regeln = []
    return k_, d_, env_
RUECK_ = lambda m, p, q: q.get("reduceOnly") == "true"  # noqa: E731
def stops_im_buch_(d_, markt_):
    try:
        return _json.loads(Path(d_).read_text()).get("echt", {}).get("stops", {}).get(markt_) or {}
    except (OSError, ValueError):
        return {}
for sz_ in (("ETH", -1.0, -0.25), ("BTC", -1.0, -0.5)):
    markt_, z0_, z1_ = sz_
    sym_ = markt_ + "USDT"
    # (a) jeder Rückkauf zur Hälfte
    k, d, env = tag0_(sz_)
    if k.pos[sym_] < 0 and [a for a in k.algos.values() if a["symbol"] == sym_]:
        kurz_ = round(-k.pos[sym_], 3)
        B.bewegen(sym_, round(B.kurs[sym_] * 1.06, 2))
        e_ = {"markt": markt_, "hebel": z1_, "stop_long": B.kurs[sym_] * 0.9, "stop_short": B.kurs[sym_] * 0.97, "stand": "2026-10-13"}
        B.regeln = [dict(methode="POST", pfad="/fapi/v1/order", pred=RUECK_, art="teil", anteil=0.5, anzahl=10 ** 6), dict(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
        try:
            res_ = P.lauf([e_], env, d)
        finally:
            B.regeln = []
        g_ = lage(k, sym_)
        pruefe(f"16.H6b jeder Rückkauf nur zur Hälfte ({sz_}, Short {kurz_} → {-k.pos[sym_]:.3f}), neue Perp-Stops dauerhaft abgelehnt: der Rest bleibt unter einem Stop",
               not befunde(k, d), (g_, befunde(k, d)[:2], res_["zeilen"][:3]))
    # (b) verzögert sichtbare alte Perp-Stops, Rückkauf nie angekommen
    k, d, env = tag0_(sz_, unsichtbar=True)
    if k.pos[sym_] < 0 and [a for a in k.algos.values() if a["symbol"] == sym_]:
        kurz_ = round(-k.pos[sym_], 3)
        vorher_ = lage(k, sym_)
        B.bewegen(sym_, round(B.kurs[sym_] * 1.06, 2))
        e_ = {"markt": markt_, "hebel": z1_, "stop_long": B.kurs[sym_] * 0.9, "stop_short": B.kurs[sym_] * 0.97, "stand": "2026-10-13"}
        B.regeln = [dict(methode="POST", pfad="/fapi/v1/order", pred=RUECK_, art="vor503", anzahl=10 ** 6), dict(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=10 ** 6)]
        try:
            res_ = P.lauf([e_], env, d)
        finally:
            B.regeln = []
        g_ = lage(k, sym_)
        st_ = stops_im_buch_(d, markt_)
        bekannt_ = ([st_.get("perp")] if st_.get("perp") is not None else []) + [w[0] for w in (st_.get("perp_weitere") or [])]
        pruefe(f"16.H6b verzögert sichtbarer alter Perp-Stop ({sz_}, Short {kurz_}), Rückkauf nie angekommen, neue Stops abgelehnt: der alte Stop steht weiter ({vorher_['p_qty']:g} → {g_['p_qty']:g})",
               g_["n_p"] >= 1 and g_["p_qty"] >= vorher_["p_qty"] - 1e-9, (vorher_, g_))
        pruefe(f"16.H6b … und das Buch kennt ihn weiter ({sz_})", len(bekannt_) >= 1 or st_.get("perp_cid"), (st_,))
    # (b2) wie (b), aber der erste neue Stop wird abgelehnt und der nächste gelingt: perp_cid zeigt dann auf den NEUEN; die Kennung des verzögert sichtbaren alten muss im Gedächtnis bleiben
    k, d, env = tag0_(sz_, unsichtbar=True)
    if k.pos[sym_] < 0 and [a for a in k.algos.values() if a["symbol"] == sym_]:
        c_alt_ = stops_im_buch_(d, markt_).get("perp_cid")
        B.bewegen(sym_, round(B.kurs[sym_] * 1.06, 2))
        e_ = {"markt": markt_, "hebel": z1_, "stop_long": B.kurs[sym_] * 0.9, "stop_short": B.kurs[sym_] * 0.97, "stand": "2026-10-13"}
        B.regeln = [dict(methode="POST", pfad="/fapi/v1/order", pred=RUECK_, art="vor503", anzahl=10 ** 6), dict(methode="POST", pfad="/fapi/v1/algoOrder", art="429", anzahl=1)]
        try:
            res_ = P.lauf([e_], env, d)
        finally:
            B.regeln = []
        st_ = stops_im_buch_(d, markt_)
        kennungen_ = {st_.get("perp_cid")} | {w[1] for w in (st_.get("perp_weitere") or [])}
        pruefe(f"16.H6b verzögert sichtbarer alter Perp-Stop ({sz_}), neuer Not-Stop gelingt erst beim 2. Versuch: die Kennung des alten bleibt im Gedächtnis (kein Geister-Stop)", c_alt_ in kennungen_, (c_alt_, st_))

# R13-M10 (K2): der Not-Aus entscheidet «Rest unter dem Binance-Minimum» mit dem FRISCHEN Kurs. Der Seed-Test 13.K2 (Not-Aus-Seed 12527) traf die Lage seit den Änderungen der
# 16. Runde nicht mehr (andere Anfragefolge) — hier ein direktes Szenario: ein Teil-Verkauf lässt einen Rest zurück, der beim alten Kurs unter dem Minimum liegt; der Kurs springt, bevor
# die Nachprüfung ihn neu liest (der Sprung kommt mit der ersten Positionsabfrage NACH dem Rückkauf des Shorts, unabhängig davon, ob Pilot 2.0 den Kurs nochmals liest). Mit dem alten Kurs gälte der Rest als Staub («alles zu», obwohl er jetzt 12 USDT wert und verkäuflich ist).
k = neues_konto(20000)
B.bewegen("BTCUSDT", 40000.0)
dd = neu_buch()
e = E("BTC", 0.5)
lauf([e], env_echt(), dd)
H = lage(k, "BTCUSDT")["coins"]
rest_soll = 1.0e-4
gekauft_ = {"ja": False}
alt_hook_ = B.nach_jeder_anfrage
B.nach_jeder_anfrage = lambda m, pfad, p, code: gekauft_.update(ja=True) if (m == "POST" and pfad == "/fapi/v1/order" and p.get("side") == "BUY") else None
regel_teil_ = regel(methode="POST", pfad="/api/v3/order", art="teil", anteil=0.5, anzahl=1)
verkaeufe_ = {"n": 0}
def letzter_verkauf_(m, p, q):  # der ZWEITE Marktverkauf des Not-Aus (der erste ist der Ersatz des Spot-Stops per cancelReplace; der zweite verkauft alle freien Coins des Paares) wird bis auf `rest_soll` Coins ausgeführt
    if MARKT_VERKAUF(m, p, q):
        verkaeufe_["n"] += 1
        if verkaeufe_["n"] == 2:
            regel_teil_["anteil"] = 1.0 - rest_soll / float(q["quantity"])
            return True
    return False
regel_teil_["pred"] = letzter_verkauf_
B.regeln = [regel_teil_,
            regel(methode="GET", pfad="/fapi/v2/positionRisk", pred=lambda m, p, q: gekauft_["ja"] and q.get("symbol") == "BTCUSDT", art="kurs", sym="BTCUSDT", preis=120000.0)]
r = lauf([], env_echt(), dd, notaus=True)
B.regeln = []
B.nach_jeder_anfrage = alt_hook_
rest_ = lage(k, "BTCUSDT")["coins"]
pruefe("16.Probe R13-M10 Not-Aus, Teil-Verkauf lässt einen Rest unter dem Minimum, der Kurs springt vor der Nachprüfung: kein «alles zu» mit verkäuflichem Rest",
       rest_ * B.kurs["BTCUSDT"] < 10 or r["alles_zu"] is not True, (r["alles_zu"], rest_, r["zeilen"][-4:]))

# R14-M69 (E10 → E36): `_nach_storno_stoppen` — ist nach dem Storno des hängenden Stop-Limits nichts (mehr) zu schützen (die Menge liegt unter dem Binance-Minimum), ist das KEIN Fehlschlag:
# True, kein neuer Stop, keine Warnung «OHNE Stop» (der Aufrufer meldete sonst einen Alarm für Staub). Das Muster hing früher an `_haengenden_loeschen`; seit E36 gibt es dieselbe Zeile in
# `_nach_storno_stoppen`, und kein Test sah ihren Zweig «nichts zu schützen».
def haengend_m69(coins=0.3, menge=0.1):
    k_, sp_, fu_, d_ = handlage(coins=coins, kurs=100000.0)
    B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d_["rs"] = sp_.regeln2("BTCUSDT")
    eigener_spot_stop(sp_, d_, menge, 90000.0)
    B.bewegen("BTCUSDT", 85000.0)
    d_["kurs"] = 85000.0
    o_ = next(o for o in sp_.eigene_stops("BTCUSDT") if o.get("isWorking") is True)
    return k_, sp_, fu_, d_, o_, (lambda warten=None: L._lage(sp_, fu_, d_, warten))
k, sp_, fu_, d_, o_, lesen_ = haengend_m69()
sp_.abbrechen("BTCUSDT", o_["orderId"])                                              # Binance hat den hängenden Stop storniert (cancelReplace «nur_storno»)
w_, g_ = [], []
ok_ = L._nach_storno_stoppen(sp_, "BTC", d_, {"spot": o_["orderId"]}, o_, 0.00001, w_.append, g_, lesen_)
gl_ = lage(k, "BTCUSDT")
pruefe("16.Probe R14-M69 _nach_storno_stoppen: Staub-Menge (unter dem Binance-Minimum) — True, kein neuer Stop, keine Warnung", ok_ is True and gl_["n_s"] == 0 and not g_ and not w_, (ok_, gl_, w_, g_))
# Gegenprobe: eine echte Menge bekommt ihren Not-Stop
k, sp_, fu_, d_, o_, lesen_ = haengend_m69()
sp_.abbrechen("BTCUSDT", o_["orderId"])
w_, g_ = [], []
ok_ = L._nach_storno_stoppen(sp_, "BTC", d_, {"spot": o_["orderId"]}, o_, 0.1, w_.append, g_, lesen_)
gl_ = lage(k, "BTCUSDT")
pruefe("16.Probe R14-M69 Gegenprobe: eine echte Menge (0,1 BTC) bekommt ihren Not-Stop", ok_ is True and gl_["n_s"] == 1 and abs(gl_["s_qty"] - 0.1) < 1e-9, (ok_, gl_, w_, g_))

# R14-M79 (E13): der Rückfall am Ende des Tageslaufs ersetzt JEDEN hängenden Stop-Limit durch einen Not-Stop, nicht nur den ersten. Das Szenario der 14. Runde (Lauf-Seed 92202) traf die Lage seit den
# Änderungen der 16. Runde nicht mehr (andere Anfragefolge) — hier ein direktes: Konto ohne STOP_LOSS, zwei eigene Stop-Limits (Stop + Zusatz-Stop), beide lösen aus und hängen über dem Kurs,
# cancelReplace scheitert dauerhaft (503) → der Ausstieg bleibt abgelehnt, am Ende müssen BEIDE ersetzt sein (löschen + Not-Stop).
k = neues_konto(60000)
B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
B.bewegen("BTCUSDT", 100000.0)
dd = neu_buch()
lauf([E("BTC", 0.25, kurs=100000.0)], env_echt(kapital=60000), dd)                    # Tag 1: Coins + Stop A (STOP_LOSS_LIMIT)
cfg_ = L.einstellungen(env_echt(kapital=60000))
sp_ = L.Spot(cfg_["spot"])
rs_ = sp_.regeln2("BTCUSDT")
k.frei["BTC"] = k.frei.get("BTC", 0.0) + 0.08                                          # der Zusatz-Stop: mehr Coins, eigener Stop B (die Kennung macht ihn zu einem Stop von Pilot 2.0)
sp_.stop_verkauf("BTCUSDT", 0.08, 88000.0, rs_, cid=L._kennung(L.CID_STOP_SPOT))
limits_ = sorted(o_["preis"] for o_ in k.orders.values() if o_["symbol"] == "BTCUSDT" and o_["typ"] == "STOP_LOSS_LIMIT" and o_["status"] in ("NEW", "PARTIALLY_FILLED"))
B.bewegen("BTCUSDT", round(min(limits_) * 0.97, 2))                                   # Kurslücke unter beide Limits: beide lösen aus und hängen
vorher_ = P._haengend(k, "BTCUSDT")
B.regeln = [regel(methode="POST", pfad="/api/v3/order/cancelReplace", art="vor503", anzahl=10 ** 6)]
try:
    lauf([E("BTC", 0.25, kurs=B.kurs["BTCUSDT"])], env_echt(kapital=60000), dd)       # Tag 2: Ausstieg per cancelReplace scheitert in jeder Runde → Rückfall am Ende (löschen + Not-Stop)
finally:
    B.regeln = []
nachher_ = P._haengend(k, "BTCUSDT")
pruefe("16.Probe R14-M79 zwei hängende Stop-Limits (Stop + Zusatz-Stop), cancelReplace scheitert dauerhaft: am Ende hängt keiner mehr (der Rückfall ersetzt JEDEN)", len(limits_) >= 2 and vorher_ > 0 and nachher_ == 0, (len(limits_), vorher_, nachher_, P.zeigen(k)["BTCUSDT"]))

# R16-M10/M12 (H5, zweite Schicht): die Tests 16.H5 laufen den Tageslauf durch und trafen `_soll_netto` mit unklarem Perp-Verkauf und `_spot_ohne_liste` (Ausstieg bei unlesbarer Spot-Liste) nicht.
# Direkte Prüfung: (a) `_soll_netto` zählt einen unklaren Perp-Verkauf als ausgeführt; (b) `_spot_ohne_liste` verkauft beim Ausstieg («Stop würde sofort auslösen») nur die Netto-Richtung, nicht die
# Absicherung des Shorts.
k_, sp_, fu_, d_ = handlage(coins=0.3, short=0.1, kurs=100000.0)
pruefe("16.H5 _soll_netto: ein unklarer Perp-Verkauf (0,1) zählt als ausgeführt — netto long 0,1 statt 0,2",
       abs(L._soll_netto(0.3, -0.1, 100000.0, dict(d_, unklar_sell=0.1)) - 0.1) < 1e-9 and abs(L._soll_netto(0.3, -0.1, 100000.0, dict(d_, unklar_sell=None)) - 0.2) < 1e-9,
       (L._soll_netto(0.3, -0.1, 100000.0, dict(d_, unklar_sell=0.1)), L._soll_netto(0.3, -0.1, 100000.0, dict(d_, unklar_sell=None))))
# (b) beidseitig (ein unklarer Perp-Auftrag): Stop-Grösse = alle Coins; der Kurs fällt beim Setzen unter den Stop-Kurs (Regel «kurs») → Binance lehnt «würde sofort auslösen» ab → Ausstieg zum Markt
k_, sp_, fu_, d_ = handlage(coins=0.3, short=0.1, kurs=100000.0)
d_["unklar_sell"] = 0.0
e_ = {"markt": "BTC", "hebel": 0.5, "stop_long": 95000.0, "stop_short": 110000.0, "stand": "2026-10-13"}
s_ = L._soll(0.3, -0.1, 100000.0, d_)
s_.update(frei=0.3, gebunden=0.0, kurs=100000.0)
st_, w_, g_ = {}, [], []
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="kurs", sym="BTCUSDT", preis=94000.0)]
try:
  L._spot_ohne_liste(sp_, "BTC", d_, st_, e_, s_, w_.append, g_, set(), RuntimeError("Liste"), {"auftraege": [], "zeilen": []}, lambda warten=None: L._lage(sp_, fu_, d_, warten))
finally:
  B.regeln = []
gl_ = lage(k_, "BTCUSDT")
pruefe("16.H5 _spot_ohne_liste im beidseitigen Modus, Stop würde sofort auslösen: verkauft wird nur die Netto-Richtung (0,2), die Absicherung des Shorts (0,1 BTC) bleibt",
       gl_["coins"] >= 0.1 - 1e-6 and gl_["coins"] < 0.3 - 1e-6, (gl_, w_[:2], g_))
B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
B.regeln = []
B.ersetzen_fehlt = False
# ═════════ Folge-Runde zur 17. Prüfung (Block 17.*) ═════════
# W1 (17. Prüfung): der Vermerk vor dem ersten Auftrag wurde nicht zwingend gespeichert (`speichern()` schluckte Fehler). Ist das Buch nicht beschreibbar UND stirbt der Lauf hart, tat die Nachkontrolle nichts (48 von 170
# Abbruchstellen ohne Stop, bis 14'596 USDT). Jetzt: kurz nochmals versuchen, sonst heute kein Auftrag (wie beim Start).
def w1_lauf_(kaputt_bis_):
    """Erster Lauf eines frischen Kontos (BTC 0,5); das Speichern des Vermerks (`schutz_offen` im Buch) scheitert `kaputt_bis_` Mal (OSError). → (Ergebnis, Aufträge, Zahl der Speicherversuche mit Vermerk)"""
    k0_ = neues_konto(60000)
    d0_ = neu_buch()
    orig_ = L._buch_speichern_zusammen
    zaehler_ = [0]

    def bsz_(datei_, modus_, gesehen_, buch_):
        if buch_.get("schutz_offen"):
            zaehler_[0] += 1
            if zaehler_[0] <= kaputt_bis_:
                raise OSError("Platte voll")
        return orig_(datei_, modus_, gesehen_, buch_)
    L._buch_speichern_zusammen = bsz_
    alt_w_ = getattr(L, "VERMERK_WARTEN", None)
    L.VERMERK_WARTEN = (0.0123, 0.0456)                                               # eindeutige Werte: der Spion zählt nur die Pausen zwischen den Versuchen
    schlaf_ = []
    schlaf_orig_ = L.time.sleep

    def spion_(s_):
        if s_ in (0.0123, 0.0456):
            schlaf_.append(s_)
            return schlaf_orig_(0.0)
        return schlaf_orig_(s_)
    L.time.sleep = spion_
    n0_ = len(B.log)
    try:
        r0_ = lauf([E("BTC", 0.5)], env_echt(kapital=60000), d0_)
    finally:
        L._buch_speichern_zusammen = orig_
        L.time.sleep = schlaf_orig_
        if alt_w_ is not None:
            L.VERMERK_WARTEN = alt_w_
    auftraege_ = [x_ for x_ in B.log[n0_:] if x_[1] in ("POST", "DELETE") and x_[2] in ("/api/v3/order", "/api/v3/order/cancelReplace", "/fapi/v1/order", "/fapi/v1/algoOrder") and x_[4] == 200]
    w1_lauf_.schlaf = schlaf_
    return r0_, auftraege_, zaehler_[0], k0_


r_, auftr_, n_, k_ = w1_lauf_(10 ** 6)
pruefe("17.W1 Vermerk nicht speicherbar (dreimal OSError): KEIN Auftrag, laute Warnung, das Konto bleibt unberührt",
       not auftr_ and n_ == getattr(L, "VERMERK_VERSUCHE", 3) and r_.get("warnung") and any("Vermerk für die Nachkontrolle nicht gespeichert" in z_ for z_ in r_["zeilen"]),
       (auftr_[:2], n_, r_.get("zeilen"), lage(k_, "BTCUSDT")))
pruefe("17.W1 … und keine Position entstanden", abs(lage(k_, "BTCUSDT")["pos"]) < 1e-12 and lage(k_, "BTCUSDT")["coins"] < 1e-9, lage(k_, "BTCUSDT"))
pruefe("17.W1 … zwischen den drei Versuchen wird gewartet (zweimal, mit den eingestellten Pausen) und nur der LETZTE gescheiterte Versuch warnt «Buch nicht gespeichert»",
       w1_lauf_.schlaf == [0.0123, 0.0456] and sum("Buch nicht gespeichert" in z_ for z_ in r_["zeilen"]) == 1, (w1_lauf_.schlaf, [z_ for z_ in r_["zeilen"] if "gespeichert" in z_]))
r_, auftr_, n_, k_ = w1_lauf_(1)
pruefe("17.W1 Gegenprobe: scheitert das Speichern nur einmal, klappt der zweite Versuch — der Lauf handelt (Aufträge, Position)", len(auftr_) >= 2 and n_ >= 2 and lage(k_, "BTCUSDT")["coins"] > 0.4, (n_, len(auftr_), lage(k_, "BTCUSDT")))
pruefe("17.W1 … genau EINE Pause (vor dem zweiten Versuch) und keine Warnung, solange ein späterer Versuch klappt", w1_lauf_.schlaf == [0.0123] and not any("Buch nicht gespeichert" in z_ for z_ in r_["zeilen"]),
       (w1_lauf_.schlaf, [z_ for z_ in r_["zeilen"] if "gespeichert" in z_]))
r_, auftr_, n_, k_ = w1_lauf_(0)
pruefe("17.W1 Gegenprobe: ohne Störung genau ein Speichern des Vermerks und der Lauf handelt (keine Pause)", n_ >= 1 and len(auftr_) >= 2 and w1_lauf_.schlaf == [], (n_, len(auftr_), w1_lauf_.schlaf))

# W2 (17. Prüfung): die blinden Perp-Zweige von `_perp_ohne_liste` (Perp-Liste unlesbar) vermerkten den Markt nicht für die Nachkontrolle — nach einem Abbruch tat sie nichts, ein unbekannter alter Stop blieb stehen.
k, sp, fu, dd = handlage(coins=0.0, short=0.3, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
cid_a = L._kennung(L.CID_STOP_PERP)
ra_ = fu.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0, rf_["tick"], cid=cid_a)
st_ = {"perp": ra_.get("algoId"), "perp_cid": cid_a, "p_short": 110000.0}
s_ = L._soll(0.0, -0.3, 100000.0, dd)
s_.update(frei=0.0, gebunden=0.0)
d_ = dict(dd)
w_ = []
L._perp_ohne_liste(fu, "BTC", d_, st_, {"stop_short": 115000.0}, s_, w_.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, lambda w=None: L._lage(sp, fu, dd, w))
pruefe("17.W2 _perp_ohne_liste: der neue Stop wird blind gesetzt (Liste unlesbar) → der Markt ist für die Nachkontrolle vermerkt", d_.get("nachkontrolle") is True and lage(k, "BTCUSDT")["p_qty"] >= 0.3 - 1e-9, (d_.get("nachkontrolle"), lage(k, "BTCUSDT"), w_))
# Zweig «kein Stop nötig» (Short gedeckt, soll <= 0): der bekannte alte Stop wird blind über seine Kennung gelöscht
k, sp, fu, dd = handlage(coins=0.3, short=0.3, kurs=100000.0)
rf_ = fu.regeln("BTCUSDT")
cid_a = L._kennung(L.CID_STOP_PERP)
ra_ = fu.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0, rf_["tick"], cid=cid_a)
st_ = {"perp": ra_.get("algoId"), "perp_cid": cid_a, "p_short": 110000.0}
s_ = L._soll(0.3, -0.3, 100000.0, dd)
s_.update(frei=0.3, gebunden=0.0)
d_ = dict(dd)
w_ = []
L._perp_ohne_liste(fu, "BTC", d_, st_, {"stop_short": 115000.0}, s_, w_.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, lambda w=None: L._lage(sp, fu, dd, w))
pruefe("17.W2 _perp_ohne_liste, Short gedeckt: der bekannte alte Stop wird blind gelöscht → der Markt ist für die Nachkontrolle vermerkt (ein unbekannter kann noch stehen)",
       d_.get("nachkontrolle") is True and lage(k, "BTCUSDT")["n_p"] == 0, (d_.get("nachkontrolle"), lage(k, "BTCUSDT"), w_))

# K2 (17. Prüfung): `schritt()` buchte beim Perp-Marktauftrag die BESTELLTE Menge (`gemacht = menge`), nicht die ausgeführte — bei einer nur teilweise ausgeführten Order (EXPIRED) rechnete `_alt_deckt` mit einer Menge, die es nie gab.
k_ = neues_konto(60000)
d_ = neu_buch()
B.regeln = [regel(methode="POST", pfad="/fapi/v1/order", art="teil", anzahl=1, anteil=0.5)]
try:
    r_ = lauf([E("BTC", -0.5)], env_echt(kapital=60000), d_)
finally:
    B.regeln = []
verbucht_ = sum(a_[3] for a_ in r_["auftraege"] if a_[1] == "perp" and a_[2] == "SELL")
wirklich_ = -lage(k_, "BTCUSDT")["pos"]
pruefe("17.K2 Perp-Marktauftrag nur zur Hälfte ausgeführt: verbucht wird die AUSGEFÜHRTE Menge (gleich der Position), nicht die bestellte", wirklich_ > 0 and abs(verbucht_ - wirklich_) < 1e-9, (verbucht_, wirklich_, r_["auftraege"][:3]))

# W3 b (17. Prüfung): ein eingefrorener Lauf (Ruhezustand) merkte nach dem Aufwachen nicht, dass seine Sperre als tot übernommen war, und führte seinen veralteten Plan aus (Abweichung bis 12'318 USDT Netto).
# Jetzt prüft jeder schreibende, signierte Auftrag (Spot und Futures) vorher die Marke der Sperre; Lesen bleibt erlaubt.
import tempfile as _tf17  # noqa: E402
import sperre as SPR17  # noqa: E402
k_, sp_, fu_, dd_ = handlage(coins=0.5, short=0.2, kurs=100000.0)
stop17_ = fu_.stop_menge("BTCUSDT", "BUY", 0.2, 110000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))    # ein offener Perp-Stop VOR der Sperre: «alles löschen» und «Storno» finden etwas zu löschen
sd_ = _tf17.mkdtemp(prefix="w3b_")
lk_ = Path(sd_) / "krypto-lauf.lock"
with SPR17.lauf_sperre(ordner=sd_, warten=0):
    n0_ = len(B.log)
    sp_.konto()
    fu_.position_info("BTCUSDT")
    lk_.write_text("99999 0 fremd\n")                                                  # ein anderer Lauf hat die Sperre als tot übernommen
    erg_ = {}
    for was_, f_ in (("Spot-Markt", lambda: sp_.markt("BTCUSDT", "SELL", 0.1)), ("Futures-Markt", lambda: fu_.auftrag("BTCUSDT", "SELL", 0.1, False)),
                     ("Spot-Storno", lambda: sp_.abbrechen("BTCUSDT", 1)), ("Futures-Stop", lambda: fu_.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, dd_["rf"]["tick"])),
                     ("Futures-Storno", lambda: fu_.algo_abbrechen("BTCUSDT", stop17_["algoId"])), ("Futures-alles-löschen", lambda: fu_.alle_abbrechen("BTCUSDT"))):
        try:
            f_()
            erg_[was_] = "gesendet"
        except SPR17.SperreVerloren:
            erg_[was_] = "veto"
        except Exception as ex_:  # noqa: BLE001
            erg_[was_] = type(ex_).__name__
    lesen_ok_ = True
    try:
        sp_.konto()
        fu_.position_info("BTCUSDT")
    except Exception:  # noqa: BLE001
        lesen_ok_ = False
    schreibend_ = [x_ for x_ in B.log[n0_:] if x_[1] in ("POST", "DELETE")]
lk_.unlink(missing_ok=True)                                                              # die fremde Sperre des «anderen Laufs» bleibt beim Freigeben stehen — jetzt aufräumen
pruefe("17.W3b Sperre als tot übernommen: jeder schreibende Auftrag (Spot-Markt, Futures-Markt, Storno, Stop, Futures-Storno, alles löschen) wird abgewiesen, KEINER erreicht die Börse", all(v_ == "veto" for v_ in erg_.values()) and not schreibend_, (erg_, schreibend_))
pruefe("17.W3b … Lesen bleibt erlaubt (Konto, Position)", lesen_ok_)
with SPR17.lauf_sperre(ordner=sd_, warten=0):
    n0_ = len(B.log)
    sp_.konto()
    r_markt_ = sp_.markt("BTCUSDT", "SELL", 0.1)
pruefe("17.W3b Gegenprobe: gehört die Sperre dem Prozess, geht der Auftrag raus", len([x_ for x_ in B.log[n0_:] if x_[1] == "POST"]) == 1 and r_markt_, B.log[n0_:])

# … und mitten im Tageslauf: nach der n-ten Anfrage übernimmt ein anderer Lauf die Sperre (Ruhezustand) → danach schreibt der Lauf NICHTS mehr; der Markt steht für die Nachkontrolle im Buch
k_ = neues_konto(60000)
d_ = neu_buch()
sd_ = _tf17.mkdtemp(prefix="w3b_")
lk_ = Path(sd_) / "krypto-lauf.lock"
stand_ = {"n": 0, "log": None}


def haken_w3b_(m_, pfad_, p_):
    stand_["n"] += 1
    if m_ == "GET" and stand_["log"] is None:                  # (18. Prüfung K1) NACH dem Vermerk, vor dem ersten Auftrag — bei Anfrage 14 stand der Vermerk noch nicht im Buch und die Prüfung unten war tot
        try:
            vermerk_ = (json.loads(Path(d_).read_text()).get("echt") or {}).get("schutz_offen")
        except (OSError, ValueError):
            vermerk_ = None
        if vermerk_ == ["BTC"]:
            stand_["log"] = len(B.log)
            lk_.write_text("99999 0 fremd\n")


B.vor_jeder_anfrage = haken_w3b_
try:
    with SPR17.lauf_sperre(ordner=sd_, warten=0):
        r_ = lauf([E("BTC", 0.5)], env_echt(kapital=60000), d_)
finally:
    B.vor_jeder_anfrage = None
    lk_.unlink(missing_ok=True)
nach_ = [x_ for x_ in B.log[stand_["log"]:] if x_[1] in ("POST", "DELETE")] if stand_["log"] is not None else None
buch_ = json.loads(open(d_).read())
pruefe("17.W3b Tageslauf: nach der Übernahme der Sperre schreibt der Lauf nichts mehr (kein Auftrag, kein Stop), der Markt steht für die Nachkontrolle im Buch",
       nach_ is not None and not nach_ and "BTC" in ((buch_.get("echt") or {}).get("schutz_offen") or []),
       (nach_, list(buch_.keys())[:6], (buch_.get("echt") or {}).get("schutz_offen")))

# K1 (17. Prüfung): Perp-Liste unlesbar UND ein bekannter alter Stop lässt sich nicht löschen — in jedem Takt der Nachkontrolle kam ein weiterer Stop dazu (bis 10). Jetzt: kennt das Buch schon PERP_BLIND_MAX (3) Stops, kommt keiner mehr dazu.
def k1_lauf_(bekannt_):
    k0_, sp0_, fu0_, dd0_ = handlage(coins=0.0, short=0.3, kurs=100000.0)
    rf0_ = fu0_.regeln("BTCUSDT")
    st0_ = {}
    for i_ in range(bekannt_):
        c0_ = L._kennung(L.CID_STOP_PERP)
        r0_ = fu0_.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0 + 1000 * i_, rf0_["tick"], cid=c0_)
        if i_ == 0:
            st0_.update(perp=r0_.get("algoId"), perp_cid=c0_, p_short=110000.0)
        else:
            st0_["perp_weitere"] = (st0_.get("perp_weitere") or []) + [[r0_.get("algoId"), c0_]]
    s0_ = L._soll(0.0, -0.3, 100000.0, dd0_)
    s0_.update(frei=0.0, gebunden=0.0)
    d0_ = dict(dd0_)
    w0_ = []
    n0_ = len(B.log)
    B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]
    try:
        L._perp_ohne_liste(fu0_, "BTC", d0_, st0_, {"stop_short": 115000.0}, s0_, w0_.append, [], False, RuntimeError("Liste nicht lesbar"), {"auftraege": []}, lambda w=None: L._lage(sp0_, fu0_, dd0_, w))
    finally:
        B.regeln = []
    neu0_ = sum(1 for x_ in B.log[n0_:] if x_[1] == "POST" and x_[2] == "/fapi/v1/algoOrder" and x_[4] == 200)
    return neu0_, d0_, lage(k0_, "BTCUSDT"), w0_


neu_, d_, g_, w_ = k1_lauf_(3)
pruefe("17.K1 Perp-Liste unlesbar, das Buch kennt schon 3 Stops: KEIN weiterer blind (die Stops stapeln sich nicht), beidseitig gesichert, vermerkt", neu_ == 0 and g_["n_p"] == 3 and d_.get("beidseitig") and d_.get("nachkontrolle"), (neu_, g_["n_p"], d_.get("beidseitig"), d_.get("nachkontrolle"), w_))
neu_, d_, g_, w_ = k1_lauf_(2)
pruefe("17.K1 Gegenprobe: kennt das Buch erst 2 Stops, kommt der neue (blind) dazu", neu_ == 1 and g_["n_p"] == 3, (neu_, g_["n_p"], w_))

# (e) (17. Prüfung): Schlussnachlesen am Ende von `_perp_abgleich` — setzte die Nachkontrolle (trotz Sperre) zwischen meinem Lesen und Setzen einen eigenen Perp-Stop, standen danach zwei über demselben Short
# (Verzahnungsscan «Nachkontrolle»: 3 von 1'050, 2'581 USDT zu viel Stop). Der "fremde" Stop ist beim ersten Lesen unsichtbar (Listenverzögerung) und beim letzten sichtbar.
def e_lauf_(beidseitig_=False, alt_menge_=0.3):
    k0_, sp0_, fu0_, dd0_ = handlage(coins=0.0, short=0.3, kurs=100000.0)
    rf0_ = fu0_.regeln("BTCUSDT")
    ca_ = L._kennung(L.CID_STOP_PERP)
    ra_ = fu0_.stop_menge("BTCUSDT", "BUY", alt_menge_, 110000.0, rf0_["tick"], cid=ca_)    # der bisherige Stop des Buchs (alt_menge_ < 0,3: deckt den Short nicht ganz → der Abgleich setzt einen neuen)
    cf_ = L._kennung(L.CID_STOP_PERP)
    rfr_ = fu0_.stop_menge("BTCUSDT", "BUY", 0.3, 111000.0, rf0_["tick"], cid=cf_)           # der «fremde» eigene Stop (gleichzeitiger Lauf)
    k0_.algos[rfr_["algoId"]]["sichtbar_ab"] = B.n_listen + 2                                  # beim ersten Lesen noch nicht in der Liste, beim zweiten (Schlussnachlesen) schon
    st0_ = {"perp": ra_.get("algoId"), "perp_cid": ca_, "p_short": 110000.0}
    s0_ = L._soll(0.0, -0.3, 100000.0, dd0_)
    s0_.update(frei=0.0, gebunden=0.0, beidseitig=beidseitig_)
    w0_ = []
    L._perp_abgleich(fu0_, "BTC", dict(dd0_), st0_, {"stop_short": 115000.0}, s0_, {"auftraege": []}, w0_.append, [], [], lambda w=None: L._lage(sp0_, fu0_, dd0_, w), False)
    return lage(k0_, "BTCUSDT"), w0_


g_, w_ = e_lauf_()
pruefe("17.(e) Schlussnachlesen: der gleichzeitig gesetzte fremde Perp-Stop (beim ersten Lesen unsichtbar) wird gelöscht, sobald der neue allein den Bedarf deckt — genau EIN Stop über dem Short", g_["n_p"] == 1 and abs(g_["p_qty"] - 0.3) < 1e-9, (g_, w_))
g_, w_ = e_lauf_(beidseitig_=True)
pruefe("17.(e) Gegenprobe: im beidseitigen Markt wird nichts aufgeräumt (dort stehen absichtlich mehrere)", g_["n_p"] >= 2, (g_, w_))
g_, w_ = e_lauf_(beidseitig_=True, alt_menge_=0.1)
pruefe("17.(e) Gegenprobe: auch wenn der bisherige Stop (0,1) den Short nicht ganz deckt und der Abgleich einen neuen setzt, räumt das Schlussnachlesen im beidseitigen Markt NICHTS auf (neuer + fremder Stop stehen)",
       g_["n_p"] == 2 and not any("fremder eigener Perp-Stop" in x_ for x_ in w_), (g_, w_))

# ───────── 17. Folge-Runde: weitere Lücken der Mutationsprobe der 16. Runde (Seed-Tests drifteten; direkte Szenarien) ─────────
# R16-M94 (E32): der Not-Aus löscht die im Buch bekannten, nur verzögert sichtbaren Perp-Stops über die Kennung — NICHT den eben gesetzten aktuellen (`aktuell_cid`). Der Seed-Test (200479/200540)
# trifft die Lage seit späteren Änderungen nicht mehr; direkter Aufruf: zwei Stops über demselben Short, der aktuelle (c1) und ein alter, nur verzögert sichtbarer (c2) — nur c2 geht weg.
k_, sp_, fu_, dd_ = handlage(coins=0.0, short=0.3, kurs=100000.0)
rf_ = fu_.regeln("BTCUSDT")
c1_ = L._kennung(L.CID_STOP_PERP)
r1_ = fu_.stop_menge("BTCUSDT", "BUY", 0.3, 110000.0, rf_["tick"], cid=c1_)                 # der eben gesetzte, aktuelle Stop
c2_ = L._kennung(L.CID_STOP_PERP)
r2_ = fu_.stop_menge("BTCUSDT", "BUY", 0.3, 111000.0, rf_["tick"], cid=c2_)                 # ein alter, vom Buch gemerkter Stop (die Liste zeigte ihn nicht)
st_ = {"perp": r1_["algoId"], "perp_cid": c1_, "perp_weitere": [[r2_["algoId"], c2_]]}
versteckte_ = [{"algoId": r1_["algoId"], "clientAlgoId": c1_}, {"algoId": r2_["algoId"], "clientAlgoId": c2_}]
ok_ = L._notaus_versteckte_weg(fu_, "BTCUSDT", st_, versteckte_, aktuell_cid=c1_)
verbleibend_ = {a_.get("clientAlgoId") for a_ in fu_.eigene_stops("BTCUSDT")}
pruefe("17.Probe R16-M94 _notaus_versteckte_weg: nur der alte, verzögert sichtbare Stop (c2) wird gelöscht, der eben gesetzte aktuelle (c1) bleibt stehen und im Buch",
       ok_ is True and verbleibend_ == {c1_} and st_.get("perp_cid") == c1_ and not st_.get("perp_weitere"), (ok_, verbleibend_, st_))

# R12-M29 (F1, Seed 9330): liegt der Kurs schon unter dem Stop-Kurs des Signals und sperrt ein Auftrag, den die Liste (noch) nicht zeigt, einen Teil der Coins, dann verkauft der Ausstieg nur den Rest der
# Netto-Richtung (netto − gesperrt) — die freien Coins darüber hinaus sind die Absicherung des Shorts. Der Seed-Test 9330 trifft die Lage nicht mehr; direkter Aufruf von `_spot_abgleich`.
k_, sp_, fu_, dd_ = handlage(coins=0.3, short=0.1, kurs=100000.0)
B.regeln = [regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="unsichtbar", anzahl=1, listen=10 ** 6)]
try:
    try:
        eigener_spot_stop(sp_, dd_, 0.1, 90000.0)                                             # sperrt 0,1 Coins; die Liste zeigt den Stop nicht (die Antwort geht dabei verloren: 503)
    except Exception:  # noqa: BLE001
        pass
finally:
    B.regeln = []
vor_ = lage(k_, "BTCUSDT")
e_ = {"markt": "BTC", "hebel": 0.5, "stop_long": 105000.0, "stop_short": 110000.0, "stand": "2026-10-13"}         # Stop-Kurs des Signals ÜBER dem Kurs → Ausstieg
s_ = L._soll(0.3, -0.1, 100000.0, dd_)
s_.update(frei=0.2, gebunden=0.1)
w_, g_ = [], []
L._spot_abgleich(sp_, "BTC", dict(dd_), {}, e_, s_, {"auftraege": [], "zeilen": []}, w_.append, g_, [], lambda warten=None: L._lage(sp_, fu_, dd_, warten), False)
nach_ = lage(k_, "BTCUSDT")
pruefe("17.Probe R12-M29 Ausstieg bei gesperrtem Teil: verkauft wird netto − gesperrt (0,1 von 0,3) — die freien Coins darüber hinaus (0,1) bleiben als Absicherung des Shorts",
       abs(vor_["coins"] - 0.3) < 1e-9 and abs(nach_["coins"] - 0.2) < 1e-6, (vor_, nach_, w_[:2], g_))
B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
B.regeln = []
B.ersetzen_fehlt = False

# 17.Lot (Fund der Schlusskampagne camp17a, strenger Not-Aus-Seed 526741, ~28'700 USDT Short ohne ausreichenden Perp-Stop): gestoppt werden können nur GANZE Lots (7,099893 Coins → 7,0998). Hatten die Coins
# einen Rest unter einem Lot, aber über dem halben, galten sie als «nicht ganz gestoppt» — der ergänzende Perp-Stop (E40) kam nicht, und der nicht löschbare, zu grosse Perp-Stop deckte den Short nur zum Teil.
# Dieselbe Rechnung stand im Aufräum-Schutz (E41): der Spot-Stop wurde in jedem Takt der Nachkontrolle gelöscht und neu gesetzt.
_alt_l17 = P.LUECKEN
P.STRENG = True
P.LUECKEN = True
try:
    funde = P.notaus_runde(526741)
    pruefe("17.Lot streng + Lücken, Not-Aus-Seed 526741 (Coins mit einem Rest unter einem Lot, zu grosser Perp-Stop nicht löschbar): keine echten Befunde", not P.echte(funde),
           [(f_[0], f_[1].get("tag") if isinstance(f_[1], dict) else None) for f_ in P.echte(funde)][:3])
finally:
    P.STRENG = False
    P.LUECKEN = _alt_l17
    B.reduce_algo_streng = False
    B.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
# direkt: 0,200008 Coins (Lot 0,00001 → stoppbar sind 0,2; der Rest 0,000008 liegt über dem halben Lot) und ein Short von 0,2 unter einem nicht löschbaren Perp-Stop über 0,1
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_], frei_=0.200008)
pruefe("17.Lot Not-Aus-Schutz, Coins mit Rest über dem halben Lot (0,200008), alter Perp-Stop (0,1) nicht löschbar: der ergänzende Perp-Stop kommt — die Perp-Stops decken zusammen den ganzen Short (0,2)",
       ok_ and abs(gl_["s_qty"] - 0.2) < 1e-6 and abs(gl_["p_qty"] - 0.2) < 1e-6 and gl_["n_p"] == 2 and neu_ == 1, (ok_, gl_, w_, neu_))
ok_, gl_, w_, st_, neu_ = e40_notaus_([LOESCHEN_KAPUTT_], frei_=0.200003)
pruefe("17.Lot Gegenprobe: Rest unter dem halben Lot (0,200003) — derselbe Schutz (zusammen 0,2)", ok_ and abs(gl_["p_qty"] - 0.2) < 1e-6 and gl_["n_p"] == 2 and neu_ == 1, (ok_, gl_, w_, neu_))
# E41 mit Rest-Coins: steht der Markt ganz beidseitig (Spot-Stop über alle stoppbaren Lots, Perp-Stops über den ganzen Short), schreibt der Not-Aus in den folgenden Durchgängen NICHTS
k_, sp_, fu_, dd_ = handlage(coins=0.200008, short=0.2, kurs=100000.0)
fu_.stop_menge("BTCUSDT", "BUY", 0.1, 110000.0, dd_["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
st_ = {}
B.regeln = [LOESCHEN_KAPUTT_]
schreib_ = []
try:
    for _d17 in range(4):
        n0_ = len(B.log)
        L._notaus_schutz(sp_, fu_, st_, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, k_.frei["BTC"], k_.gesperrt["BTC"], 100000.0, dd_["rs"], [].append, "echt")
        schreib_.append(e41_schreibend_(n0_))
finally:
    B.regeln = []
gl_ = lage(k_, "BTCUSDT")
pruefe("17.Lot E41 mit Rest-Coins (0,200008): nach dem ersten Durchgang (Spot-Stop + ergänzender Perp-Stop) schreiben die drei folgenden NICHTS — kein Löschen und Neusetzen des Spot-Stops",
       len(schreib_[0]) == 2 and schreib_[1:] == [[], [], []] and abs(gl_["s_qty"] - 0.2) < 1e-6 and abs(gl_["p_qty"] - 0.2) < 1e-6, (schreib_, gl_))

# Lot-Scan (reduziert): die ganze Achse «Rest unter einem Lot» — Coins mit Bruchteilen eines Lots × Short × alter Spot-Stop × alte Perp-Stops × nicht löschbar, je drei Durchgänge; der volle Scan: `python3 -B pruef_lot.py`
import pruef_lot as LOT  # noqa: E402
n_lot_, z_lot_, bsp_lot_ = LOT.scan((0.2,), LOT.RESTE[::2])
pruefe(f"17.Lot Lot-Scan (reduziert, {n_lot_} Lagen: Coins mit Bruchteilen eines Lots × Short × alter Spot-Stop × alte Perp-Stops × nicht löschbar): keine Befunde, keine Ausnahme, der 3. Durchgang schreibt nichts",
       n_lot_ >= 800 and not (set(z_lot_) - {"Lagen"}), (dict(z_lot_), bsp_lot_))

import threading as _th18  # noqa: E402
import time as _time18  # noqa: E402
import pruef_kill as K18  # noqa: E402
# ───────── 18. Folge-Runde (R18): Funde der 18. unabhängigen Prüfung (kein Blocker; 3 wichtig, 6 klein) ─────────
# W1′ (16'055 USDT): ein als tot übernommener Lauf (Zombie, aus dem Ruhezustand erwacht) schickt zwar keine Aufträge mehr (`sperre.pruefen()` in den Brokern), schrieb aber weiter das BUCH — die Nachkontrolle, die für ihn
# arbeitet, sah ein «von einem anderen Lauf geändertes» Buch und beendete sich, bevor sie geheilt hatte (90 von 623 Lagen). Jetzt prüft jedes Buch-Schreiben die Lauf-Sperre.
sd18_ = _tf17.mkdtemp(prefix="w1z_")
bf18_ = Path(sd18_) / "bestand.json"
b18_ = L.leer_buch()
b18_["start"], b18_["uid"] = "2026-10-20", 1
L.buch_schreiben(bf18_, "echt", b18_)                        # kein Lauf-Sperre im Prozess: nichts zu prüfen
ges18_ = [json.dumps(L.buch_lesen(bf18_, "echt"), sort_keys=True)]
lk18_ = Path(sd18_) / "krypto-lauf.lock"
fehler18a_ = fehler18b_ = None
try:
    with SPR17.lauf_sperre(ordner=sd18_, warten=0):
        b18_ = L.buch_lesen(bf18_, "echt")
        b18_["schutz_offen"] = ["BTC"]
        L._buch_speichern_zusammen(bf18_, "echt", ges18_, b18_)           # die Sperre gehört dem Prozess: geschrieben
        geschrieben18_ = L.buch_lesen(bf18_, "echt")["schutz_offen"] == ["BTC"]
        inhalt18_ = bf18_.read_text()
        lk18_.write_text("99999 0 fremd\n")                               # ein anderer Lauf übernimmt die Sperre als tot
        b18_["schutz_offen"] = []
        try:
            L._buch_speichern_zusammen(bf18_, "echt", ges18_, b18_)
        except OSError as ex_:
            fehler18a_ = str(ex_)
        try:
            L.buch_schreiben(bf18_, "echt", b18_)
        except OSError as ex_:
            fehler18b_ = str(ex_)
        unveraendert18_ = bf18_.read_text() == inhalt18_
finally:
    lk18_.unlink(missing_ok=True)
pruefe("18.W1′ Gegenprobe: gehört die Lauf-Sperre dem Prozess, wird das Buch geschrieben", geschrieben18_)
pruefe("18.W1′ Sperre als tot übernommen: `_buch_speichern_zusammen` schreibt NICHTS (OSError «Lauf-Sperre verloren»), die Datei bleibt, wie sie war", fehler18a_ and "Lauf-Sperre verloren" in fehler18a_ and unveraendert18_, (fehler18a_, unveraendert18_))
pruefe("18.W1′ … ebenso `buch_schreiben` (Zurücksetzen des Buchs nach «alles zu»)", fehler18b_ and "Lauf-Sperre verloren" in fehler18b_ and unveraendert18_, (fehler18b_, unveraendert18_))

# … der Tageslauf: nach der Übernahme der Sperre ändert sich die Buch-Datei nicht mehr (der Vermerk vor dem ersten Auftrag steht)
k_ = neues_konto(60000)
d_ = neu_buch()
sd_ = _tf17.mkdtemp(prefix="w1t_")
lk_ = Path(sd_) / "krypto-lauf.lock"
stand_ = {"n": 0, "buch": None}


def haken_w1t_(m_, pfad_, p_):
    stand_["n"] += 1
    if m_ == "GET" and stand_["buch"] is None:                 # nach dem Vermerk, vor dem ersten schreibenden Auftrag: ein anderer Lauf übernimmt die Sperre
        try:
            vermerk_ = (json.loads(Path(d_).read_text()).get("echt") or {}).get("schutz_offen")
        except (OSError, ValueError):
            vermerk_ = None
        if vermerk_ == ["BTC"]:
            stand_["buch"] = Path(d_).read_text()
            lk_.write_text("99999 0 fremd\n")


B.vor_jeder_anfrage = haken_w1t_
try:
    with SPR17.lauf_sperre(ordner=sd_, warten=0):
        r_ = lauf([E("BTC", 0.5)], env_echt(kapital=60000), d_)
finally:
    B.vor_jeder_anfrage = None
    lk_.unlink(missing_ok=True)
pruefe("18.W1′ Tageslauf: nach der Übernahme der Sperre bleibt die Buch-Datei unverändert (kein Schreiben des Zombies), der Vermerk steht, kein Auftrag ging raus",
       stand_["buch"] is not None and Path(d_).read_text() == stand_["buch"] and "BTC" in (L.buch_lesen(d_, "echt")["schutz_offen"] or []) and not r_["auftraege"],
       (stand_["n"], L.buch_lesen(d_, "echt")["schutz_offen"], r_["auftraege"]))

# … die Nachkontrolle, die selbst eingefroren war: auch sie schreibt nach der Übernahme nichts mehr
kk_, dn_, envn_ = K18.tag0(("BTC", 0.5, 1.0))
bj_ = json.loads(Path(dn_).read_text())
bj_["echt"]["schutz_offen"] = ["BTC"]
Path(dn_).write_text(json.dumps(bj_))
sdn_ = _tf17.mkdtemp(prefix="w1nk_")
lkn_ = Path(sdn_) / "krypto-lauf.lock"
standn_ = {"n": 0, "buch": None}


def haken_nk18_(m_, pfad_, p_):
    standn_["n"] += 1
    if standn_["n"] == 1 and standn_["buch"] is None:
        standn_["buch"] = Path(dn_).read_text()
        lkn_.write_text("99999 0 fremd\n")


B.vor_jeder_anfrage = haken_nk18_
try:
    with SPR17.lauf_sperre(ordner=sdn_, warten=0):
        rn18_ = L.nachkontrolle(envn_, dn_)
finally:
    B.vor_jeder_anfrage = None
    lkn_.unlink(missing_ok=True)
pruefe("18.W1′ Nachkontrolle nach der Übernahme ihrer Sperre: das Buch bleibt unverändert («Buch nicht gespeichert»)",
       standn_["buch"] is not None and Path(dn_).read_text() == standn_["buch"] and any("Buch nicht gespeichert" in z_ for z_ in rn18_["zeilen"]), (rn18_["zeilen"][-3:], standn_["n"]))

# W2′ (9'405 USDT): `perp_ganz_ergaenzen` verweigerte den ergänzenden Perp-Stop, sobald das Buch ≥ 2 Stops kennt — und `_notaus_schutz` meldete trotzdem «ok». Das Buch führt nur Kennungen, keine Mengen:
# zwei Stops à 0,05 decken 0,1 von 0,2 BTC. Jetzt LAUT (nicht ok, «Sofort prüfen»).
def w2_lauf_(bekannte_):
    k0_, sp0_, fu0_, dd0_ = handlage(coins=0.2, short=0.2, kurs=100000.0)
    st0_ = {}
    for i_ in range(bekannte_):
        c0_ = L._kennung(L.CID_STOP_PERP)
        r0_ = fu0_.stop_menge("BTCUSDT", "BUY", 0.05, 110000.0 + 100 * i_, dd0_["rf"]["tick"], cid=c0_)
        if i_ == 0:
            st0_.update(perp=r0_.get("algoId"), perp_cid=c0_, p_short=110000.0)
        else:
            st0_["perp_weitere"] = (st0_.get("perp_weitere") or []) + [[r0_.get("algoId"), c0_]]
    B.regeln = [regel(methode="DELETE", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6), regel(methode="GET", pfad="/fapi/v1/openAlgoOrders", art="vor503", anzahl=10 ** 6)]
    w0_ = []
    try:
        ok0_ = L._notaus_schutz(sp0_, fu0_, st0_, "BTC", "BTCUSDT", "BTC", -0.2, -0.2, k0_.frei["BTC"], k0_.gesperrt["BTC"], 100000.0, dd0_["rs"], w0_.append, "echt")
    finally:
        B.regeln = []
    return ok0_, lage(k0_, "BTCUSDT"), w0_


ok_, gl_, w_ = w2_lauf_(3)
pruefe("18.W2′ Perp-Liste unlesbar, Löschen scheitert, das Buch kennt schon 3 Stops (PERP_BLIND_MAX; je 0,05 von 0,2): der Not-Aus meldet NICHT «ok» und warnt laut (Menge der bekannten Stops unbekannt)",
       ok_ is False and any("ob sie zusammen den" in x_ and "Sofort prüfen" in x_ for x_ in w_) and gl_["n_p"] == 3, (ok_, gl_, w_[-2:]))
ok_, gl_, w_ = w2_lauf_(2)
pruefe("19.K6 … kennt das Buch erst 2 Stops (je 0,05 von 0,2), kommt ein dritter ganzer reduceOnly-Stop über den Short dazu: das 9'405-USDT-Loch ist zu, der Not-Aus ist ok", ok_ is True and gl_["n_p"] == 3 and gl_["p_qty"] >= 0.2 - 1e-9, (ok_, gl_, w_[-2:]))
ok_, gl_, w_ = w2_lauf_(1)
pruefe("18.W2′ Gegenprobe: kennt das Buch erst EINEN Stop, kommt der ergänzende Perp-Stop über den ganzen Short dazu und der Not-Aus ist ok", ok_ is True and gl_["n_p"] == 2 and gl_["p_qty"] >= 0.2 - 1e-9, (ok_, gl_, w_[-2:]))

# W3′: die lange Nachkontrolle hielt die Lauf-Sperre bis 690 s (mit IgnoreNew der Aufgabenplanung ~57 % der Zeit) und liess den Tageslauf (wartet 190 s) still ausfallen → der 10-Minuten-Takt macht EINEN Durchgang
def nk_lauf_(einmal_):
    k0_ = neues_konto(20000)
    d0_ = neu_buch()
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6)]       # der Stop lässt sich nie setzen → der Markt bleibt vermerkt
    try:
        lauf([E("BTC", -0.5)], env_echt(), d0_)
        z0_, s0_ = [0.0], []

        def schlafen0_(s_):
            z0_[0] += s_
            s0_.append(s_)
        r0_ = L.nachkontrolle(env=env_echt(), datei=d0_, schlafen=schlafen0_, uhr=lambda: z0_[0], einmal=einmal_)
    finally:
        B.regeln = []
    return r0_, s0_, z0_[0], L.buch_lesen(d0_, "echt")


r_, schlaf_, dauer_, b_ = nk_lauf_(False)
pruefe("18.W3′ lange Nachkontrolle bei dauerhaft offenem Markt: wartet bis NACHKONTROLLE_MAX_S (Takte von 30 s) — die Sperre bliebe so lange gehalten", len(schlaf_) > 100 and dauer_ >= L.NACHKONTROLLE_MAX_S - 1, (len(schlaf_), dauer_))
r_, schlaf_, dauer_, b_ = nk_lauf_(True)
pruefe("18.W3′ Nachkontrolle einmal=True (10-Minuten-Takt): EIN Durchgang, KEIN Warten — der Markt bleibt vermerkt und wird laut gemeldet", not schlaf_ and dauer_ == 0 and b_["schutz_offen"] == ["BTC"] and any("weiterhin nicht vollständig gesichert" in z_ for z_ in r_["zeilen"]), (schlaf_[:3], dauer_, b_["schutz_offen"], r_["zeilen"][-2:]))
# einmal: ein JUNGER unklarer Auftrag erzeugt keine Dauer-Warnung («noch immer unklar») — der nächste Takt fragt wieder nach; ein alter schon
for alter_ms_, erwartet_ in ((60 * 1000, False), (L.UNKLAR_MAX_ALTER_MS + 60 * 1000, True)):
    k0_ = neues_konto(20000)
    d0_ = neu_buch()
    lauf([E("BTC", 0.0)], env_echt(), d0_)
    bj_ = json.loads(Path(d0_).read_text())
    bj_["echt"]["unklar"] = [dict(L.unklar_eintrag("BTC", "BTCUSDT", "perp", "SELL", 0.1, False, None), cid="p2xUNKLAR", zeit=int(_time18.time() * 1000) - alter_ms_)]
    Path(d0_).write_text(json.dumps(bj_))
    B.regeln = [regel(methode="GET", pfad="/fapi/v1/order", art="vor503", anzahl=10 ** 6)]               # Binance antwortet auf die Nachfrage nicht → «offen»
    try:
        r_ = L.nachkontrolle(env=env_echt(), datei=d0_, schlafen=lambda s_: None, uhr=lambda: 0.0, einmal=True)
    finally:
        B.regeln = []
    warnt_ = any("noch immer unklar" in z_ for z_ in r_["zeilen"])
    pruefe(f"18.W3′ einmal: unklarer Auftrag {'älter' if erwartet_ else 'jünger'} als UNKLAR_MAX_ALTER_MS → {'Warnung «noch immer unklar»' if erwartet_ else 'keine Dauer-Warnung (der nächste Takt fragt wieder nach)'}", warnt_ == erwartet_, (warnt_, r_["zeilen"][-3:]))

# K2: der «gespeicherte» Vermerk kann beim Zusammenführen verloren gehen (stand der Markt schon im Buch und löscht ein Schreiber ohne Sperre ihn nach meinem Lesen: Basis 1 / Platte 0 / ich 1 → 0)
k_, d_, env_ = K18.tag0(("BTC", 0.5, 1.0))
bj_ = json.loads(Path(d_).read_text())
bj_["echt"]["schutz_offen"] = ["BTC"]                       # Rest von früher: der Markt steht noch im Buch
Path(d_).write_text(json.dumps(bj_))
zust_ = {"n": 0, "geloescht": False, "erster": None}


def haken_k2_(m_, pfad_, p_):
    zust_["n"] += 1
    if zust_["n"] == 5 and not zust_["geloescht"]:            # ein anderer Schreiber (ohne Sperre) löscht den Vermerk, nachdem der Lauf das Buch gelesen hat
        zust_["geloescht"] = True
        bb_ = json.loads(Path(d_).read_text())
        bb_["echt"]["schutz_offen"] = []
        Path(d_).write_text(json.dumps(bb_))
    if m_ in ("POST", "DELETE") and zust_["erster"] is None:
        zust_["erster"] = (json.loads(Path(d_).read_text()).get("echt") or {}).get("schutz_offen")


B.vor_jeder_anfrage = haken_k2_
try:
    r_ = lauf([E("BTC", 1.0)], env_, d_)
finally:
    B.vor_jeder_anfrage = None
pruefe("18.K2 der Vermerk steht im Buch, wenn der erste Auftrag rausgeht — auch wenn ein anderer Schreiber ihn beim Zusammenführen gelöscht hatte (erneut eintragen)", zust_["geloescht"] and zust_["erster"] == ["BTC"], zust_)

# K3: `pruefen()` ist eine Momentaufnahme — gibt ein ANDERER Thread (Cockpit) eine andere Sperre genau zwischen Kopie und Lesen ordnungsgemäss frei, ist das kein Verlust von `krypto-lauf`
sd_ = _tf17.mkdtemp(prefix="k3_")
lauf_ = SPR17.lauf_sperre(name="krypto-lauf", ordner=sd_, warten=0)
lauf_.__enter__()
kurz_ = SPR17.lauf_sperre(name="x-schreiben", ordner=sd_, warten=0)
kurz_.__enter__()
fertig_k3_ = [False]
orig_rt_ = Path.read_text


def rt_k3_(self, *a, **k):
    if self.name.endswith("-schreiben.lock") and not fertig_k3_[0]:
        fertig_k3_[0] = True
        t_ = _th18.Thread(target=lambda: kurz_.__exit__(None, None, None))
        t_.start()
        t_.join()                                                # der andere Thread gibt genau jetzt frei
    return orig_rt_(self, *a, **k)


Path.read_text = rt_k3_
fehler_k3_ = None
try:
    try:
        SPR17.pruefen()
    except SPR17.SperreVerloren as ex_:
        fehler_k3_ = str(ex_)
finally:
    Path.read_text = orig_rt_
    lauf_.__exit__(None, None, None)
pruefe("18.K3 ein anderer Thread gibt seine Sperre genau während `pruefen()` frei: KEIN falsches Veto (krypto-lauf gehört dem Prozess noch)", fertig_k3_[0] and fehler_k3_ is None, fehler_k3_)
# … und das echte Veto bleibt: die eigene Sperre wurde übernommen (Marke weicht ab) bzw. ist weg, OHNE dass der Prozess sie freigegeben hätte
sd_ = _tf17.mkdtemp(prefix="k3b_")
lk_ = Path(sd_) / "krypto-lauf.lock"
with SPR17.lauf_sperre(name="krypto-lauf", ordner=sd_, warten=0):
    lk_.write_text("99999 0 fremd\n")
    try:
        SPR17.pruefen()
        veto_a_ = False
    except SPR17.SperreVerloren:
        veto_a_ = True
    lk_.unlink()
    try:
        SPR17.pruefen()
        veto_b_ = False
    except SPR17.SperreVerloren:
        veto_b_ = True
pruefe("18.K3 Gegenprobe: übernommene bzw. verschwundene eigene Sperre bleibt ein Veto", veto_a_ and veto_b_, (veto_a_, veto_b_))

# K4: ein als tot übernommener Lauf (Zombie) im Not-Aus: sauber melden, NICHT «alles zu»
k_, d_, env_ = K18.tag0(("BTC", 0.5, 1.0))
alt_notaus_ = L._notaus


def zombie_notaus_(*a, **k):
    raise SPR17.SperreVerloren("Die Sperre krypto-lauf.lock gehört inzwischen einem anderen Lauf (als tot übernommen) — kein Auftrag mehr.")


L._notaus = zombie_notaus_
try:
    rz_ = L.notaus_alle(env_, d_)
finally:
    L._notaus = alt_notaus_
pruefe("18.K4 Not-Aus eines Zombies (Sperre übernommen): kein Absturz, NICHT «alles zu», laute Meldung mit dem Hinweis auf den Lauf, der schliesst",
       rz_["alles_zu"] is False and rz_["warnung"] and any("übernommen hat, schliesst" in z_ for z_ in rz_["zeilen"]), rz_["zeilen"][-2:])

# Zombie-Scan (reduziert): ein eingefrorener Lauf wacht nach der Übernahme seiner Sperre auf — Aufträge UND Buch sind vetoed, die Nachkontrolle heilt; der volle Scan: `python3 -B pruef_zombie.py tag|notaus|nk|aufwachen 0 12`
import pruef_zombie as ZB18  # noqa: E402
_echt_pruefen18 = SPR17.pruefen
for modus18_, j18_ in (("tag", 8), ("notaus", 6)):
    z18_, f18_ = ZB18.scan(modus18_, 0, 1, j_max=j18_, ruhig=True)
    pruefe(f"18.Zombie Zombie-Scan (reduziert, {modus18_}, Szenario 0, Prüfstellen 1–{j18_ - 1}): läuft durch, 0 Befunde (nichts bleibt ohne Stop), kein Absturz", z18_["faelle"] >= 4 and not f18_ and not z18_["AUSNAHME"], (dict(z18_), f18_[:1]))
pruefe("18.Zombie der Scan stellt das echte `sperre.pruefen()` wieder her", SPR17.pruefen is _echt_pruefen18 and ZB18._echte_pruefung is _echt_pruefen18)

# ───────── 19. Folge-Runde (R19): Funde der 19. unabhängigen Prüfung (kein Blocker; 2 wichtig, 6 klein) ─────────
# W2 (244 s bei schnellen Fehlern, 49 Minuten bei hängendem Netz): ein Durchgang `einmal` der Nachkontrolle hielt die Lauf-Sperre so lange; der Tageslauf wartet nur 190 s und fiel (laut, aber) aus.
# Jetzt: die Wiederholungen von `_nochmal` dürfen im ganzen Durchgang nur EINMAL_RETRY_S Sekunden schlafen, und `stops_setzen()` läuft nicht ein zweites Mal hinter der Schleife.
schl19_, zaehl19_ = [], [0]
alt_sl19_ = L.time.sleep
L.time.sleep = schl19_.append


def kaputt19_():
    zaehl19_[0] += 1
    raise OSError("Netz weg")


try:
    L._RETRY_BUDGET[0] = 5.0
    for _i19 in range(3):
        try:
            L._nochmal(kaputt19_, (1.0, 3.0, 10.0))
        except OSError:
            pass
    rest19_ = L._RETRY_BUDGET[0]
finally:
    L._RETRY_BUDGET[0] = None
    L.time.sleep = alt_sl19_
pruefe("19.W2 `_nochmal` mit Budget 5 s: die Wiederholungen schlafen insgesamt höchstens das Budget (1 + 3, dann 1; für die 10-s-Pause reicht der Rest nie) — danach gilt der erste Fehler sofort",
       schl19_ == [1.0, 3.0, 1.0] and zaehl19_[0] == 6 and rest19_ == 0.0, (schl19_, zaehl19_, rest19_))
schl19_, zaehl19_[0] = [], 0
L.time.sleep = schl19_.append
try:
    for _i19 in range(2):
        try:
            L._nochmal(kaputt19_, (1.0, 3.0, 10.0))
        except OSError:
            pass
finally:
    L.time.sleep = alt_sl19_
pruefe("19.W2 Gegenprobe: ohne Budget (Tageslauf, Not-Aus, lange Nachkontrolle) schlafen alle Wiederholungen wie bisher (je Aufruf 1 + 3 + 10)", schl19_ == [1.0, 3.0, 10.0] * 2 and zaehl19_[0] == 8 and L._RETRY_BUDGET[0] is None, (schl19_, zaehl19_))

vor19_, nach19_ = [], []
alt_nk19_ = L._nachkontrolle


def nk19_(*a, **k):
    vor19_.append((a[-1], L._RETRY_BUDGET[0]))
    if len(vor19_) == 2:
        raise RuntimeError("Absturz")
    return {"zeilen": [], "warnung": False, "auftraege": []}


L._nachkontrolle = nk19_
try:
    L.nachkontrolle(einmal=True)
    nach19_.append(L._RETRY_BUDGET[0])
    try:
        L.nachkontrolle(einmal=True)
    except RuntimeError:
        nach19_.append(L._RETRY_BUDGET[0])
    L.nachkontrolle(einmal=False)
    nach19_.append(L._RETRY_BUDGET[0])
finally:
    L._nachkontrolle = alt_nk19_
pruefe("19.W2 `nachkontrolle(einmal=True)` setzt das Budget EINMAL_RETRY_S nur für ihren Durchgang und löscht es danach — auch nach einem Absturz; die lange Fassung läuft ohne Budget; die Grenze liegt weit unter den 190 s des Tageslaufs",
       vor19_ == [(True, L.EINMAL_RETRY_S), (True, L.EINMAL_RETRY_S), (False, None)] and nach19_ == [None, None, None] and 0 < L.EINMAL_RETRY_S <= 120, (vor19_, nach19_, L.EINMAL_RETRY_S))


def nk19_durchgang(budget_, ents_):
    """Ein Durchgang `einmal`, die Stops lassen sich nie setzen (503) — mit den ECHTEN Wartezeiten (der Prüf-Fuzzer nullt sie) und virtuellem Schlafen. → (Ergebnis, Summe der Pausen, Aufrufe von _stops_setzen, Buch)"""
    neues_konto(20000)
    d0_ = neu_buch()
    B.regeln = [regel(methode="POST", pfad="/fapi/v1/algoOrder", art="vor503", anzahl=10 ** 6),
                regel(methode="POST", pfad="/api/v3/order", pred=STOP_AUFTRAG, art="vor503", anzahl=10 ** 6)]
    alt_w_, alt_b_, alt_sl_, alt_ss_ = (L.LESE_WARTEN, L.SCHUTZ_WARTEN), L.EINMAL_RETRY_S, L.time.sleep, L._stops_setzen
    schl_, zaehl_ = [], []
    try:
        lauf(ents_, env_echt(), d0_)
        L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S = (0.5, 1.5), (0.5, 1.5, 3.0, 6.0), budget_
        L.time.sleep = schl_.append
        L._stops_setzen = lambda *a, **k: (zaehl_.append(1), alt_ss_(*a, **k))[1]
        r_ = L.nachkontrolle(env=env_echt(), datei=d0_, schlafen=lambda s_: None, uhr=lambda: 0.0, einmal=True)
    finally:
        L.time.sleep, L._stops_setzen, L.EINMAL_RETRY_S = alt_sl_, alt_ss_, alt_b_
        L.LESE_WARTEN, L.SCHUTZ_WARTEN = alt_w_
        B.regeln = []
    return r_, sum(schl_), len(zaehl_), L.buch_lesen(d0_, "echt")


r19a_, s19a_, n19a_, b19a_ = nk19_durchgang(None, [E("BTC", -0.5)])
r19b_, s19b_, n19b_, b19b_ = nk19_durchgang(3.0, [E("BTC", -0.5)])
pruefe("19.W2 Durchgang einmal, die Stops lassen sich nie setzen: ohne Budget schlafen die Wiederholungen ≥ 6 s, mit einem Budget von 3 s höchstens 3 s — der Markt bleibt vermerkt und wird laut gemeldet (nichts geht verloren)",
       s19a_ >= 6.0 and 0 < s19b_ <= 3.0 and b19b_["schutz_offen"] == ["BTC"] and any("weiterhin nicht vollständig gesichert" in z_ for z_ in r19b_["zeilen"]), (s19a_, s19b_, b19b_["schutz_offen"], r19b_["zeilen"][-2:]))
pruefe("19.W2 Durchgang einmal setzt die Stops EINMAL (die Schleife hat es schon getan) — nicht ein zweites Mal hinter der Schleife (das verdoppelte die Haltedauer der Sperre)", n19a_ == 1 and n19b_ == 1, (n19a_, n19b_))
r19c_, s19c_, n19c_, b19c_ = nk19_durchgang(None, [E("BTC", -0.5), E("ETH", -0.5)])
pruefe("19.W2 … auch mit zwei offenen Märkten: ein Aufruf von _stops_setzen für beide, beide bleiben vermerkt", n19c_ == 1 and sorted(b19c_["schutz_offen"]) == ["BTC", "ETH"], (n19c_, b19c_["schutz_offen"]))

# K1: das Buch kennt keinen recvWindow-Schutz wie die Aufträge — zwischen der ersten Prüfung und dem Umbenennen der Temp-Datei liegt das Schreiben. Jetzt prüft `_buch_schreiben_roh` UNMITTELBAR vor `replace` nochmals.
for weg19_ in ("buch_schreiben", "zusammen"):
    sd19_ = _tf17.mkdtemp(prefix="k1_")
    bf19_ = Path(sd19_) / "bestand.json"
    b19_ = L.leer_buch()
    b19_["start"], b19_["uid"] = "2026-10-20", 1
    L.buch_schreiben(bf19_, "echt", b19_)
    inhalt19_ = bf19_.read_text()
    ges19_ = [json.dumps(L.buch_lesen(bf19_, "echt"), sort_keys=True)]
    lk19_ = Path(sd19_) / "krypto-lauf.lock"
    orig_wt19_ = Path.write_text
    schreibungen19_ = [0]

    def wt19_(self, *a, **k):
        r_ = orig_wt19_(self, *a, **k)
        if self.name.startswith("bestand.json.") and self.name.endswith(".neu"):  # (20. Prüfung) die Temp-Datei trägt jetzt einen eigenen Namen je Schreiber
            schreibungen19_[0] += 1
            lk19_.write_text("99999 0 fremd\n")                       # ein anderer Lauf übernimmt die Sperre als tot — genau zwischen dem Schreiben der Temp-Datei und dem Umbenennen
        return r_
    fehler19_ = None
    try:
        with SPR17.lauf_sperre(ordner=sd19_, warten=0):
            b19_ = L.buch_lesen(bf19_, "echt")
            b19_["schutz_offen"] = ["BTC"]
            Path.write_text = wt19_
            try:
                if weg19_ == "buch_schreiben":
                    L.buch_schreiben(bf19_, "echt", b19_)
                else:
                    L._buch_speichern_zusammen(bf19_, "echt", ges19_, b19_)
            except OSError as ex_:
                fehler19_ = str(ex_)
            finally:
                Path.write_text = orig_wt19_
            unveraendert19_ = bf19_.read_text() == inhalt19_
            temp_weg19_ = not list(Path(sd19_).glob("*.neu"))
    finally:
        lk19_.unlink(missing_ok=True)
    pruefe(f"19.K1 Sperre geht ZWISCHEN dem Schreiben der Temp-Datei und dem Umbenennen verloren ({weg19_}): das Buch bleibt unverändert, die Temp-Datei ist weg, OSError «Lauf-Sperre verloren»",
           fehler19_ and "Lauf-Sperre verloren" in fehler19_ and unveraendert19_ and temp_weg19_, (fehler19_, unveraendert19_, temp_weg19_))
    # … und das Veto wird NICHT wie ein Schreibfehler wiederholt (Windows-Virenscanner-Pfad: drei Versuche, 1,3 s, jedes Mal eine neue Temp-Datei) — mit dem Aufräumen im finally (R20) ist das Endergebnis gleich, nur die Zahl der Schreibungen verrät es
    pruefe(f"19.K1 … das Veto ({weg19_}) wird nicht wiederholt: genau EINE Temp-Datei wurde geschrieben (nicht drei im Takt der Schreibfehler-Wiederholungen)", schreibungen19_[0] == 1, schreibungen19_[0])
# … Gegenprobe: gehört die Sperre dem Prozess, wird geschrieben und keine Temp-Datei bleibt liegen
sd19_ = _tf17.mkdtemp(prefix="k1b_")
bf19_ = Path(sd19_) / "bestand.json"
b19_ = L.leer_buch()
b19_["start"], b19_["uid"] = "2026-10-20", 1
with SPR17.lauf_sperre(ordner=sd19_, warten=0):
    b19_["schutz_offen"] = ["BTC"]
    L.buch_schreiben(bf19_, "echt", b19_)
pruefe("19.K1 Gegenprobe: gehört die Lauf-Sperre dem Prozess, wird das Buch geschrieben und keine Temp-Datei bleibt liegen", L.buch_lesen(bf19_, "echt")["schutz_offen"] == ["BTC"] and not list(Path(sd19_).glob("*.neu")))

# … Not-Aus innerhalb eines Durchgangs `einmal`: das Schliessen läuft OHNE Budget (es ist nicht zeitbegrenzt), der Durchgang selbst bleibt budgetiert
neues_konto(20000)
d19_ = neu_buch()
lauf([E("BTC", 0.5)], env_echt(), d19_)
bud19_ = []
alt_na19_ = L.notaus_alle


def na19_(*a, **k):
    bud19_.append(L._RETRY_BUDGET[0])
    return alt_na19_(*a, **k)


L.notaus_alle = na19_
try:
    L.nachkontrolle(env=dict(env_echt(), KI_BOT_STOP="1"), datei=d19_, schlafen=lambda s_: None, uhr=lambda: 0.0, einmal=True)
finally:
    L.notaus_alle = alt_na19_
pruefe("19.W2 Not-Aus innerhalb eines Durchgangs `einmal`: das Schliessen (notaus_alle) läuft ohne Wiederholungs-Budget — es soll so lange wiederholen, wie es seine Wiederholungen vorsehen", bud19_ and all(b_ is None for b_ in bud19_) and L._RETRY_BUDGET[0] is None, (bud19_, L._RETRY_BUDGET[0]))

# `einmal`×3 ≙ lang (die Folge von Durchgängen im 10-Minuten-Takt erreicht denselben Schutz wie die lange Nachkontrolle) — auch mit AUFGEBRAUCHTEM Budget (keine Wiederholung innerhalb des Durchgangs: der schlimmste Fall);
# der grosse Lauf: PRUEF_NK_EINMAL=3 [PRUEF_EINMAL_BUDGET=0] python3 -B pruef_fuzzer.py laeufe|notaus|listen|monotonie <von> <bis>
alt_e19_ = (P.NK_EINMAL, P.EINMAL_BUDGET)
for budget19_ in (None, "0"):
    P.NK_EINMAL, P.EINMAL_BUDGET = 3, budget19_
    funde19_ = []
    try:
        for seed_ in range(970000, 970040):
            funde19_ += P.notaus_runde(seed_)
        for seed_ in range(970100, 970106):
            funde19_ += P.laeufe_runde(seed_, 8)
    finally:
        P.NK_EINMAL, P.EINMAL_BUDGET = alt_e19_
    pruefe(f"19.einmal Fuzzer (reduziert, drei Durchgänge im 10-Minuten-Takt, Budget {'des Durchgangs' if budget19_ is None else 'AUFGEBRAUCHT'}; Not-Aus 40 Seeds, Läufe 6 Seeds × 8 Tage): keine Befunde",
           not P.echte(funde19_), [(f_[0], f_[1].get("seed")) for f_ in P.echte(funde19_)][:5])

# Prüfwerkzeug (camp19-Fund, Seed 1210012): im Takt der Aufgabenplanung darf ein FRÜHER Durchgang offen enden («nicht alles geklärt/gesichert» — ein verspäteter Auftrag ist erst im nächsten Takt sichtbar), massgebend ist der LETZTE;
# sonst meldete der Fuzzer ein Artefakt als NACHKONTROLLE_OFFEN
OFFEN19_ = "Nachkontrolle Pilot 2.0: ⚠️ nicht alles geklärt/gesichert."
GUT19_ = "Nachkontrolle Pilot 2.0: geklärt, Stops nach dem Kontostand gesetzt."


def agg19_(durchgaenge_):
    n_ = len(durchgaenge_)
    alt_ = (P.NK_EINMAL, L.nachkontrolle)
    P.NK_EINMAL = n_
    L.nachkontrolle = lambda *a, **k: {"zeilen": list(durchgaenge_.pop(0)), "auftraege": [], "warnung": False}
    try:
        return P.nachkontrolle(env_echt(), neu_buch())["zeilen"]
    finally:
        P.NK_EINMAL, L.nachkontrolle = alt_


for fall19_, dg19_, offen19_ in (("früher Durchgang offen, der zweite klärt", [[OFFEN19_, "a"], [GUT19_, "b"], []], False), ("alle offen", [[OFFEN19_], [OFFEN19_], [OFFEN19_]], True),
                                 ("gleich geklärt", [[GUT19_], [], []], False), ("zuerst geklärt, am Ende wieder offen", [[OFFEN19_], [GUT19_], [OFFEN19_]], True)):
    z19_ = agg19_([list(x_) for x_ in dg19_])
    pruefe(f"19.Werkzeug einmal-Aggregation im Fuzzer ({fall19_}): «nicht alles geklärt» zählt nur, wenn der LETZTE Durchgang offen endet", any("nicht alles geklärt" in x_ for x_ in z19_) is offen19_, z19_)
z19_ = agg19_([[OFFEN19_, "a"], [GUT19_, "b"], []])
pruefe("19.Werkzeug … die übrigen Zeilen aller Durchgänge bleiben erhalten (was ein Durchgang meldete oder tat, zählt)", "a" in z19_ and "b" in z19_ and GUT19_ in z19_, z19_)

# ───────── 20. Folge-Runde (R20): Funde der 20. unabhängigen Prüfung (kein Blocker; 1 wichtig [Cockpit-Kopfzeile], 8 klein) ─────────
import threading as _th20  # noqa: E402
import time as _time20  # noqa: E402

# klein 2 (K1-Rest): alle Schreiber teilten den Temp-Namen `<Buch>.neu`. Ein Zombie, der erst NACH dem Schreiben seiner Temp-Datei sein Veto bekommt, überschrieb die Temp-Datei des rechtmässigen Schreibers zwischen dessen
# Schreiben und Umbenennen — dessen `replace` übernahm den veralteten Inhalt, und er glaubte, gespeichert zu haben. Jetzt hat jeder Schreiber einen eigenen Namen.
sd20_ = _tf17.mkdtemp(prefix="k2_")
bf20_ = Path(sd20_) / "bestand.json"
b20_ = L.leer_buch()
b20_["start"], b20_["uid"] = "2026-10-21", 1
L.buch_schreiben(bf20_, "echt", b20_)
namen20_ = [L._buch_tmp(bf20_) for _ in range(3)]
namen_th20_ = []
_t20 = _th20.Thread(target=lambda: namen_th20_.append(L._buch_tmp(bf20_)))
_t20.start()
_t20.join()
pruefe("20.K2 Temp-Datei des Buchs: jeder Aufruf liefert einen anderen Namen (Prozess-Nummer, Thread, Zähler), im Ordner des Buchs, mit der Endung .neu — auch aus einem anderen Thread",
       len({str(n_) for n_ in namen20_ + namen_th20_}) == 4 and all(n_.parent == bf20_.parent and n_.name.startswith("bestand.json.") and n_.name.endswith(".neu") and str(os.getpid()) in n_.name for n_ in namen20_ + namen_th20_)
       and str(bf20_) + ".neu" not in {str(n_) for n_ in namen20_ + namen_th20_}, [n_.name for n_ in namen20_ + namen_th20_])

b_b20_ = L.buch_lesen(bf20_, "echt")
b_b20_["schutz_offen"] = ["BTC"]                                            # der rechtmässige Schreiber B
b_z20_ = L.buch_lesen(bf20_, "echt")
b_z20_["schutz_offen"] = ["VERALTET"]                                       # der Zombie mit dem alten Stand
pfad_z20_ = L._buch_tmp(bf20_)                                              # SEINE Temp-Datei, wie ihn der Produktionscode benennt
orig_pr20_, n_pr20_ = L._sperre_pruefen, [0]


def pruefen20_():
    n_pr20_[0] += 1
    if n_pr20_[0] == 1:                                                     # B steht zwischen dem Schreiben und dem Umbenennen: der Zombie schreibt jetzt SEINE Temp-Datei
        pfad_z20_.write_text(json.dumps({"echt": b_z20_}))
    return orig_pr20_()


L._sperre_pruefen = pruefen20_
try:
    L._buch_schreiben_roh(bf20_, "echt", b_b20_)
finally:
    L._sperre_pruefen = orig_pr20_
pruefe("20.K2 Der Zombie schreibt seine Temp-Datei, während B zwischen Schreiben und Umbenennen steht: B speichert SEINEN Stand (vorher übernahm das replace den veralteten Inhalt des Zombies)",
       L.buch_lesen(bf20_, "echt")["schutz_offen"] == ["BTC"] and pfad_z20_.exists(), (L.buch_lesen(bf20_, "echt")["schutz_offen"], pfad_z20_.exists()))
pfad_z20_.unlink(missing_ok=True)

# … verwaiste Temp-Dateien (kill -9 zwischen Schreiben und Umbenennen) werden nach TEMP_ALT_S aufgeräumt — auch die gemeinsame der früheren Fassung; eine frische (ein anderer Schreiber ist gerade dran) bleibt
alt_t20_, jung_t20_, alt_alt20_ = Path(f"{bf20_}.4242-1-0.neu"), Path(f"{bf20_}.4243-1-0.neu"), Path(str(bf20_) + ".neu")
for t_, alter_ in ((alt_t20_, L.TEMP_ALT_S + 60), (jung_t20_, 60), (alt_alt20_, L.TEMP_ALT_S + 60)):
    t_.write_text("{}")
    os.utime(t_, (_time20.time() - alter_, _time20.time() - alter_))
fremd20_ = Path(sd20_) / "anderes.json.4242-1-0.neu"
fremd20_.write_text("{}")
os.utime(fremd20_, (_time20.time() - L.TEMP_ALT_S - 60, _time20.time() - L.TEMP_ALT_S - 60))
b_b20_["schutz_offen"] = []
L._buch_schreiben_roh(bf20_, "echt", b_b20_)
pruefe("20.K2 Das Schreiben räumt alte Temp-Dateien des Buchs weg (auch die gemeinsame der früheren Fassung), lässt eine frische und die Dateien anderer Namen liegen",
       not alt_t20_.exists() and not alt_alt20_.exists() and jung_t20_.exists() and fremd20_.exists(), (alt_t20_.exists(), alt_alt20_.exists(), jung_t20_.exists(), fremd20_.exists()))
jung_t20_.unlink(missing_ok=True)
fremd20_.unlink(missing_ok=True)

# … die Frist ist absolut festgelegt, nicht nur «älter als die Konstante» (eine Frist von 100 Stunden räumte nie auf): ein Rest von zwei Stunden ist weg, ein Rest von einer Minute bleibt
zwei_h20_, eine_min20_ = Path(f"{bf20_}.4244-1-0.neu"), Path(f"{bf20_}.4245-1-0.neu")
for t_, alter_ in ((zwei_h20_, 7200), (eine_min20_, 60)):
    t_.write_text("{}")
    os.utime(t_, (_time20.time() - alter_, _time20.time() - alter_))
L._buch_schreiben_roh(bf20_, "echt", b_b20_)
pruefe("20.K2 Die Frist ist absolut gemessen: ein Rest von zwei Stunden wird aufgeräumt, einer von einer Minute bleibt (Frist weder Tage lang noch Sekunden kurz)",
       not zwei_h20_.exists() and eine_min20_.exists() and 60 < L.TEMP_ALT_S <= 7200, (zwei_h20_.exists(), eine_min20_.exists(), L.TEMP_ALT_S))
eine_min20_.unlink(missing_ok=True)

# … scheitert das Umbenennen dauerhaft (Windows: Datei gehalten), bleibt keine eigene Temp-Datei liegen
orig_rep20_, orig_bw20_ = Path.replace, L.BUCH_WARTEN


def replace_zickt20_(self, ziel):
    if self.name.startswith("bestand.json.") and self.name.endswith(".neu"):
        raise PermissionError("gehalten")
    return orig_rep20_(self, ziel)


Path.replace, L.BUCH_WARTEN = replace_zickt20_, (0, 0)
fehler_r20_ = None
try:
    L._buch_schreiben_roh(bf20_, "echt", b_b20_)
except OSError as ex_:
    fehler_r20_ = type(ex_).__name__
finally:
    Path.replace, L.BUCH_WARTEN = orig_rep20_, orig_bw20_
pruefe("20.K2 Das Umbenennen scheitert dauerhaft: OSError an den Aufrufer, die eigene Temp-Datei ist weg", fehler_r20_ == "PermissionError" and not list(Path(sd20_).glob("*.neu")), (fehler_r20_, list(Path(sd20_).glob("*.neu"))))


# … und ein Zombie, dessen Sperre SCHON weg ist, schreibt gar keine Temp-Datei mehr (die erste Prüfung der Aufrufer vor dem Schreiben; die zweite vor dem Umbenennen fängt nur das Fenster dazwischen)
def temp_schreibungen20_(f_):
    gez_ = []
    orig_ = Path.write_text

    def wt_(self, *a, **k):
        if self.name.endswith(".neu"):
            gez_.append(self.name)
        return orig_(self, *a, **k)
    Path.write_text = wt_
    try:
        f_()
    finally:
        Path.write_text = orig_
    return gez_


for weg20_ in ("buch_schreiben", "zusammen"):
    sdz20_ = _tf17.mkdtemp(prefix="k1z_")
    bfz20_ = Path(sdz20_) / "bestand.json"
    bz20_ = L.leer_buch()
    bz20_["start"], bz20_["uid"] = "2026-10-21", 1
    L.buch_schreiben(bfz20_, "echt", bz20_)
    gesz20_ = [json.dumps(L.buch_lesen(bfz20_, "echt"), sort_keys=True)]
    lkz20_ = Path(sdz20_) / "krypto-lauf.lock"
    fehler_z20_ = []
    try:
        with SPR17.lauf_sperre(ordner=sdz20_, warten=0):
            bz20_ = L.buch_lesen(bfz20_, "echt")
            bz20_["schutz_offen"] = ["BTC"]
            lkz20_.write_text("99999 0 fremd\n")                            # ein anderer Lauf hat die Sperre als tot übernommen — BEVOR der Zombie schreibt
            inhalt_z20_ = bfz20_.read_text()

            def schreiben_z20_():
                try:
                    if weg20_ == "buch_schreiben":
                        L.buch_schreiben(bfz20_, "echt", bz20_)
                    else:
                        L._buch_speichern_zusammen(bfz20_, "echt", gesz20_, bz20_)
                except OSError as ex_:
                    fehler_z20_.append(str(ex_))
            gez_z20_ = temp_schreibungen20_(schreiben_z20_)
            unveraendert_z20_ = bfz20_.read_text() == inhalt_z20_
    finally:
        lkz20_.unlink(missing_ok=True)
    pruefe(f"20.K1 Sperre schon weg ({weg20_}): der Zombie schreibt KEINE Temp-Datei (nicht nur: keine Änderung am Buch), OSError «Lauf-Sperre verloren»",
           not gez_z20_ and unveraendert_z20_ and fehler_z20_ and "Lauf-Sperre verloren" in fehler_z20_[0], (gez_z20_, unveraendert_z20_, fehler_z20_))

kk20_, dn20_, envn20_ = K18.tag0(("BTC", 0.5, 1.0))
bj20_ = json.loads(Path(dn20_).read_text())
bj20_["echt"]["schutz_offen"] = ["BTC"]
Path(dn20_).write_text(json.dumps(bj20_))
sdn20_ = _tf17.mkdtemp(prefix="k1nk_")
lkn20_ = Path(sdn20_) / "krypto-lauf.lock"
standn20_ = {"n": 0, "an": False}
gez_nk20_ = []
orig_wt20_ = Path.write_text


def wt_nk20_(self, *a, **k):
    if standn20_["an"] and self.name.endswith(".neu"):
        gez_nk20_.append(self.name)
    return orig_wt20_(self, *a, **k)


def haken_nk20_(m_, pfad_, p_):
    standn20_["n"] += 1
    if standn20_["n"] == 1:
        standn20_["an"] = True                                              # ab hier gehört die Sperre einem anderen: jede Temp-Datei, die jetzt geschrieben wird, stammt vom Zombie
        lkn20_.write_text("99999 0 fremd\n")


B.vor_jeder_anfrage = haken_nk20_
Path.write_text = wt_nk20_
try:
    with SPR17.lauf_sperre(ordner=sdn20_, warten=0):
        rn20_ = L.nachkontrolle(envn20_, dn20_)
finally:
    Path.write_text = orig_wt20_
    B.vor_jeder_anfrage = None
    lkn20_.unlink(missing_ok=True)
pruefe("20.K1 Nachkontrolle, deren Sperre übernommen wurde: kein einziges Schreiben einer Temp-Datei danach (die Prüfung vor dem Speichern greift), «Buch nicht gespeichert»",
       standn20_["an"] and not gez_nk20_ and any("Buch nicht gespeichert" in z_ for z_ in rn20_["zeilen"]), (gez_nk20_, rn20_["zeilen"][-3:]))

# Code-Review der R20: `protokoll_schreiben` teilte sich denselben Temp-Namen `<Protokoll>.neu` (zwei Schreiber → das zweite `replace` fand die Datei nicht mehr, die Ausnahme ersetzte das Ergebnis eines Laufs, dessen Aufträge
# schon raus waren) — jetzt wie beim Buch ein Name je Schreiber, und best effort (der Eintrag ist ein Beleg, kein Schutz)
import contextlib as _cl20  # noqa: E402
import io as _io20  # noqa: E402
sdp20_ = _tf17.mkdtemp(prefix="prot_")
alt_prot20_ = L.PROTOKOLL
L.PROTOKOLL = Path(sdp20_) / "broker.json"
try:
    L.protokoll_schreiben({"n": 1})
    L.protokoll_schreiben({"n": 2})
    ok_norm20_ = [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == [1, 2] and not list(Path(sdp20_).glob("*.neu"))
    pruefe("20.Protokoll Einträge werden angehängt, keine Temp-Datei bleibt liegen", ok_norm20_, list(Path(sdp20_).glob("*")))
    fremd20_ = L._buch_tmp(L.PROTOKOLL)                                       # die Temp-Datei eines ANDEREN Schreibers, wie der Produktionscode sie benennt
    orig_wt20p_, n_wt20_ = Path.write_text, [0]

    def wt20p_(self, *a, **k):
        r_ = orig_wt20p_(self, *a, **k)
        if self.name.startswith("broker.json.") and self.name.endswith(".neu") and n_wt20_[0] == 0:
            n_wt20_[0] += 1
            fremd20_.write_text(json.dumps([{"n": 99}]))                      # der andere Schreiber schreibt SEINE Temp-Datei, während dieser zwischen Schreiben und Umbenennen steht
        return r_
    Path.write_text = wt20p_
    try:
        L.protokoll_schreiben({"n": 3})
    finally:
        Path.write_text = orig_wt20p_
    pruefe("20.Protokoll Ein anderer Schreiber schreibt seine Temp-Datei zwischen Schreiben und Umbenennen: der Eintrag landet unverfälscht im Protokoll (vorher übernahm das replace die Datei des anderen), seine Datei bleibt unberührt",
           [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == [1, 2, 3] and fremd20_.exists() and json.loads(fremd20_.read_text()) == [{"n": 99}], (L.PROTOKOLL.read_text()[:200], fremd20_.exists()))
    fremd20_.unlink(missing_ok=True)
    # … zwei Schreiber gleichzeitig (Not-Aus im Cockpit-Thread und ein Lauf): Lesen-Ändern-Schreiben unter der Schreib-Sperre — der zweite wartet, KEIN Eintrag geht verloren (ohne Sperre überschrieb das replace des ersten den des zweiten)
    import threading as _th20p  # noqa: E402
    orig_wt20q_, gestartet20_, tb20_ = Path.write_text, [False], []

    def wt20q_(self, *a, **k):
        r_ = orig_wt20q_(self, *a, **k)
        if self.name.startswith("broker.json.") and self.name.endswith(".neu") and not gestartet20_[0]:
            gestartet20_[0] = True
            t_ = _th20p.Thread(target=lambda: L.protokoll_schreiben({"n": "B"}))      # der zweite Schreiber beginnt, WÄHREND der erste zwischen Schreiben und Umbenennen steht
            tb20_.append(t_)
            t_.start()
            t_.join(0.6)                                                               # mit Sperre wartet er (lebt noch); ohne Sperre ist er längst fertig und der erste überschreibt ihn gleich
        return r_
    Path.write_text = wt20q_
    try:
        L.protokoll_schreiben({"n": "A"})
    finally:
        Path.write_text = orig_wt20q_
    for t_ in tb20_:
        t_.join(30)
    pruefe("20.Protokoll Zwei Schreiber gleichzeitig: beide Einträge sind im Protokoll (der zweite wartet auf die Schreib-Sperre) — ohne Sperre ging einer verloren",
           [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == [1, 2, 3, "A", "B"], L.PROTOKOLL.read_text()[:300])
    # … ein Inhalt, der kein Protokoll ist («{}», «null» nach einem Zurücksetzen von Hand, kaputtes JSON), ist kein Absturz — er wird BEISEITEGELEGT (wie das Logbuch) und ein neues Protokoll begonnen, nicht überschrieben
    for roh_ in ("{}", "null", '"text"', "[kaputt"):
        L.PROTOKOLL.write_text(roh_)
        aus_p_ = _io20.StringIO()
        with _cl20.redirect_stdout(aus_p_):
            L.protokoll_schreiben({"n": "neu"})
        beiseite_ = sorted(Path(sdp20_).glob("broker.json.kaputt-*"))
        pruefe(f"20.Protokoll Ein Inhalt, der kein Protokoll ist ({roh_}), wird beiseitegelegt (mit dem alten Inhalt) und ein neues begonnen — kein Absturz, ein Hinweis",
               json.loads(L.PROTOKOLL.read_text()) == [{"n": "neu"}] and len(beiseite_) == 1 and beiseite_[0].read_text() == roh_ and "beiseitegelegt" in aus_p_.getvalue(),
               (L.PROTOKOLL.read_text()[:100], [b_.name for b_ in beiseite_], aus_p_.getvalue()))
        for b_ in beiseite_:
            b_.unlink()
    L.protokoll_schreiben({"n": 1})
    L.protokoll_schreiben({"n": 2})
    L.protokoll_schreiben({"n": 3})
    orig_rep20p_ = Path.replace

    def replace20p_(self, ziel):
        if self.name.startswith("broker.json.") and self.name.endswith(".neu"):
            raise PermissionError("gehalten")
        return orig_rep20p_(self, ziel)
    aus20p_, fehler20p_ = _io20.StringIO(), None
    Path.replace = replace20p_
    try:
        with _cl20.redirect_stdout(aus20p_):
            L.protokoll_schreiben({"n": 4})
    except Exception as ex_:  # noqa: BLE001
        fehler20p_ = type(ex_).__name__
    finally:
        Path.replace = orig_rep20p_
    pruefe("20.Protokoll Scheitert das Umbenennen: keine Ausnahme (der Eintrag ist ein Beleg, kein Schutz), ein Hinweis im Protokoll des Laufs, die eigene Temp-Datei ist weg, die alten Einträge unverändert",
           fehler20p_ is None and "Protokoll nicht geschrieben" in aus20p_.getvalue() and not list(Path(sdp20_).glob("*.neu")) and [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["neu", 1, 2, 3],
           (fehler20p_, aus20p_.getvalue(), list(Path(sdp20_).glob("*"))))
    aus20r_, fehler20r_ = _io20.StringIO(), None
    try:
        with _cl20.redirect_stdout(aus20r_):
            L.protokoll_schreiben({"n": object()})                                  # nicht als JSON schreibbar → TypeError, nicht OSError
    except Exception as ex_:  # noqa: BLE001
        fehler20r_ = type(ex_).__name__
    pruefe("20.Protokoll Auch eine andere Ausnahme als OSError (hier: ein nicht schreibbarer Eintrag) bleibt folgenlos für den Lauf: Hinweis statt Absturz, die Datei unverändert",
           fehler20r_ is None and "Protokoll nicht geschrieben (TypeError)" in aus20r_.getvalue() and [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["neu", 1, 2, 3] and not list(Path(sdp20_).glob("*.neu")),
           (fehler20r_, aus20r_.getvalue()))
    # … eine kurz gesperrte Datei (Windows: Virenscanner, OneDrive) wird wiederholt, nicht für «leer» gehalten und überschrieben (vorher ging die ganze Geschichte verloren)
    orig_rt20_, n_rt20_ = Path.read_text, [0]

    def rt20_(self, *a, **k):
        if self == L.PROTOKOLL and n_rt20_[0] == 0:
            n_rt20_[0] += 1
            raise PermissionError("kurz gesperrt")
        return orig_rt20_(self, *a, **k)
    Path.read_text = rt20_
    try:
        L.protokoll_schreiben({"n": 5})
    finally:
        Path.read_text = orig_rt20_
    pruefe("20.Protokoll Das Lesen scheitert einmal kurz (PermissionError): der zweite Versuch liest das Protokoll, die bisherigen Einträge bleiben — der Eintrag wird angehängt (vorher: Protokoll als leer behandelt und überschrieben)",
           [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["neu", 1, 2, 3, 5] and n_rt20_[0] == 1, (L.PROTOKOLL.read_text()[:200], n_rt20_))
    alt_bw20_ = L.BUCH_WARTEN
    L.BUCH_WARTEN = (0, 0)

    def rt20b_(self, *a, **k):
        if self == L.PROTOKOLL:
            raise PermissionError("gesperrt")
        return orig_rt20_(self, *a, **k)
    Path.read_text = rt20b_
    aus20s_ = _io20.StringIO()
    try:
        with _cl20.redirect_stdout(aus20s_):
            L.protokoll_schreiben({"n": 99})
    finally:
        Path.read_text = orig_rt20_
        L.BUCH_WARTEN = alt_bw20_
    pruefe("20.Protokoll Das Protokoll bleibt dauerhaft unlesbar: der Eintrag wird NICHT geschrieben (die bisherigen werden nie überschrieben), ein Hinweis, keine Ausnahme",
           [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["neu", 1, 2, 3, 5] and "nicht lesbar" in aus20s_.getvalue(), (L.PROTOKOLL.read_text()[:200], aus20s_.getvalue()))
    # … Bytes, die in keiner Zeichentabelle gelten (von Hand gespeichert): kein Protokoll → beiseitegelegt (mit den Bytes), ein neues begonnen — vorher fiel jeder spätere Eintrag still weg
    L.PROTOKOLL.write_bytes(b'[{"n": "\x81"}]')
    aus20u_ = _io20.StringIO()
    with _cl20.redirect_stdout(aus20u_):
        L.protokoll_schreiben({"n": "u1"})
        L.protokoll_schreiben({"n": "u2"})
    beiseite20u_ = sorted(Path(sdp20_).glob("broker.json.kaputt-*"))
    pruefe("20.Protokoll Ein Protokoll mit unlesbaren Bytes wird beiseitegelegt (die Bytes bleiben erhalten) und ein neues begonnen — beide Einträge landen darin (vorher ging jeder spätere verloren)",
           len(beiseite20u_) == 1 and beiseite20u_[0].read_bytes() == b'[{"n": "\x81"}]' and [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["u1", "u2"], (beiseite20u_, aus20u_.getvalue()))
    for b_ in beiseite20u_:
        b_.unlink()
    L.PROTOKOLL.write_text(json.dumps([{"n": "neu"}, {"n": 1}, {"n": 2}, {"n": 3}, {"n": 5}]))   # die Lage für die folgenden Fälle: neu, 1, 2, 3, 5
    # … ein kurz gesperrtes Umbenennen wird wiederholt
    orig_rep20r_, n_rep20_ = Path.replace, [0]

    def replace20r_(self, ziel):
        if self.name.startswith("broker.json.") and self.name.endswith(".neu") and n_rep20_[0] == 0:
            n_rep20_[0] += 1
            raise PermissionError("kurz gehalten")
        return orig_rep20r_(self, ziel)
    Path.replace = replace20r_
    try:
        L.protokoll_schreiben({"n": 6})
    finally:
        Path.replace = orig_rep20r_
    pruefe("20.Protokoll Das Umbenennen scheitert einmal kurz (Datei gehalten): der zweite Versuch gelingt, der Eintrag steht im Protokoll, keine Temp-Datei bleibt",
           [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["neu", 1, 2, 3, 5, 6] and n_rep20_[0] == 1 and not list(Path(sdp20_).glob("*.neu")), (L.PROTOKOLL.read_text()[:200], n_rep20_))
    # … eine belegte Schreib-Sperre hält den Not-Aus nicht auf (er ruft `protokolliere` VOR dem Schliessen): höchstens PROTOKOLL_SPERRE_WARTEN, dann wird ohne Sperre geschrieben
    (Path(sdp20_) / "broker.json-schreiben.lock").write_text("99999 0 fremd\n")
    t0_p_ = _time20.time()
    L.protokoll_schreiben({"n": 7})
    dauer_p_ = _time20.time() - t0_p_
    (Path(sdp20_) / "broker.json-schreiben.lock").unlink()
    pruefe("20.Protokoll Eine belegte Schreib-Sperre hält den Lauf höchstens PROTOKOLL_SPERRE_WARTEN (1 s) auf — der Eintrag wird dann ohne Sperre geschrieben (vorher bis 15 s am Ende eines Laufs oder Not-Aus)",
           [e_["n"] for e_ in json.loads(L.PROTOKOLL.read_text())] == ["neu", 1, 2, 3, 5, 6, 7] and 0.5 <= dauer_p_ < 5 and L.PROTOKOLL_SPERRE_WARTEN == 1.0, (dauer_p_, L.PROTOKOLL.read_text()[:200]))
    # … jeder Schreiber hat SEINEN Temp-Namen (Prozess, Thread, Zähler): zwei Schreibungen nacheinander benutzen zwei verschiedene Namen — ein gemeinsamer «<Protokoll>.neu» wäre beim Schreiben ohne Sperre
    # (die Wartezeit ist abgelaufen) ein Wettlauf; die Tests oben fangen das nur mit einem selbstgebauten Namen ab, der vom Namen des Produktionscodes abweicht
    import re as _re20  # noqa: E402
    L.PROTOKOLL = Path(sdp20_) / "eigen.json"
    namen20_, orig_wt20n_ = [], Path.write_text

    def wt20n_(self, *a, **k):
        if self.name.startswith("eigen.json.") and self.name.endswith(".neu"):
            namen20_.append(self.name)
        return orig_wt20n_(self, *a, **k)
    Path.write_text = wt20n_
    try:
        L.protokoll_schreiben({"n": "e1"})
        L.protokoll_schreiben({"n": "e2"})
    finally:
        Path.write_text = orig_wt20n_
    pruefe("20.Protokoll Jeder Schreiber hat seinen eigenen Temp-Namen <Protokoll>.<Prozess>-<Thread>-<Zähler>.neu: zwei Schreibungen benutzen zwei verschiedene Namen",
           len(namen20_) == 2 and len(set(namen20_)) == 2 and all(_re20.fullmatch(r"eigen\.json\.\d+-\d+-\d+\.neu", n_) for n_ in namen20_), namen20_)
    # … verwaiste Temp-Dateien des Protokolls (kill -9 zwischen Schreiben und Umbenennen) räumt das nächste Schreiben auf; eine frische (ein anderer Schreiber ist gerade dran) bleibt
    alt_p20_, jung_p20_ = Path(f"{L.PROTOKOLL}.4242-1-0.neu"), Path(f"{L.PROTOKOLL}.4243-1-0.neu")
    for t_, alter_ in ((alt_p20_, 7200), (jung_p20_, 60)):
        t_.write_text("[]")
        os.utime(t_, (_time20.time() - alter_, _time20.time() - alter_))
    L.protokoll_schreiben({"n": "e3"})
    pruefe("20.Protokoll Das Schreiben räumt verwaiste Temp-Dateien des Protokolls auf (zwei Stunden alt) und lässt eine frische (eine Minute) liegen",
           not alt_p20_.exists() and jung_p20_.exists(), (alt_p20_.exists(), jung_p20_.exists()))
    jung_p20_.unlink(missing_ok=True)
finally:
    L.PROTOKOLL = alt_prot20_

# Code-Review der R20: der Durchgang `einmal` stellt das Budget wieder her, das ein Aufrufer in diesem Thread schon gesetzt hatte (statt es auf None zu setzen)
neues_konto(20000)
d_b20_ = neu_buch()
L._RETRY_BUDGET[0] = 123.0
try:
    L.nachkontrolle(env=env_echt(), datei=d_b20_, schlafen=lambda s_: None, uhr=lambda: 0.0, einmal=True)
    nachher20_ = L._RETRY_BUDGET[0]
finally:
    L._RETRY_BUDGET[0] = None
pruefe("20.W8 Ein Durchgang `einmal` hinterlässt das Budget so, wie er es vorfand (123 s bleiben 123 s; vorher wurde es auf «unbegrenzt» gesetzt)", nachher20_ == 123.0, nachher20_)

# klein 8: das Wiederholungs-Budget eines Durchgangs `einmal` gilt nur für SEINEN Thread (der Cockpit-Prozess führt Not-Aus und lange Nachkontrolle in eigenen Threads aus)
res20_ = {}
schlaf20_, alt_sl20_ = [], _time20.sleep
_time20.sleep = lambda x_: schlaf20_.append((_th20.current_thread().name, x_))
L._RETRY_BUDGET[0] = 0.5


def anderer20_():
    res20_["sieht"] = L._RETRY_BUDGET[0]
    res20_["pause"] = L._pause(2.0)                                         # kein Budget in diesem Thread: schläft die ganze Zeit
    L._RETRY_BUDGET[0] = 1.0
    res20_["eigenes"] = L._RETRY_BUDGET[0]


try:
    t20_ = _th20.Thread(target=anderer20_, name="anderer")
    t20_.start()
    t20_.join()
    res20_["haupt"] = L._RETRY_BUDGET[0]
    res20_["haupt_pause"] = L._pause(2.0)                                   # 2 s > 0,5 s Budget: abgelehnt, ohne zu schlafen
finally:
    L._RETRY_BUDGET[0] = None
    _time20.sleep = alt_sl20_
try:
    L._RETRY_BUDGET[1]
    index_ok20_ = False
except IndexError:
    index_ok20_ = True
pruefe("20.W8 Das Wiederholungs-Budget ist je Thread getrennt: ein anderer Thread sieht keins, schläft ganz und setzt sein eigenes, ohne das des Hauptthreads zu ändern; im Hauptthread lehnt `_pause` ab, was das Budget übersteigt",
       res20_ == {"sieht": None, "pause": True, "eigenes": 1.0, "haupt": 0.5, "haupt_pause": False} and schlaf20_ == [("anderer", 2.0)] and index_ok20_, (res20_, schlaf20_))

# Kampagnenfund der R20 (Delta-Kampagne camp20, strenger Not-Aus-Seed 1510735 — schon im Stand der R19): ETH, Coins 0,1647, Short 0,053, Spot-Stop über die Netto-Richtung (0,1117); der Not-Aus verkauft die freien
# Coins, das Verkleinern des Spot-Stops (cancelReplace) wird zweimal mit 429 abgewiesen, beim dritten Mal kommt es an, aber die Antwort geht verloren → «zu grosser Spot-Stop vielleicht noch offen»: der Short bekommt
# seinen Stop über die GANZE Menge. Kam das Ersetzen an, waren 0,053 Coins frei und OHNE Stop, der Schutz rechnete aber mit dem alten (grossen) Stop: löste der Perp-Stop aus, standen 0,053 ETH (≈ 244 USDT) bis zur
# Wiederholung des Not-Aus ohne Stop. Jetzt wird nach einem unklaren Verkleinern neu gelesen (wie im Tageslauf) und die freien Coins bekommen den Zusatz-Stop («Spot-Stop über die übrigen Coins»).
def seed20f_(aenderung=None):
    """Seed 1510735 (streng) nachspielen; `aenderung()` verändert die Störungen des ERSTEN Not-Aus (die Nachkontrolle und der saubere Not-Aus danach laufen ohne Störung). → (Befunde, Zeilen des ersten Not-Aus)"""
    zeilen_, erst_, orig_ = [], [True], P.lauf

    def lauf_(ents_, env_, datei_, trocken=False, notaus=False, protokolliere=None):
        if not (notaus and erst_[0]):
            return orig_(ents_, env_, datei_, trocken, notaus, protokolliere)
        erst_[0] = False
        if aenderung:
            aenderung()
        r_ = orig_(ents_, env_, datei_, trocken, notaus, protokolliere)
        zeilen_.extend(r_.get("zeilen") or [])
        return r_
    P.lauf, P.STRENG = lauf_, True
    try:
        return P.notaus_runde(1510735), zeilen_
    finally:
        P.lauf, P.STRENG = orig_, False
        B.reduce_algo_streng = False


def stop_schreibungen20f_():
    """(Spot-Stop-Verkleinerungen per cancelReplace, Spot-Stops neu gesetzt) aus dem Börsen-Protokoll der letzten Runde"""
    return ([e_ for e_ in B.log if e_[2] == "/api/v3/order/cancelReplace" and e_[4] == 200 and e_[3].get("quantity") == "0.0587" and str(e_[3].get("type", "")).startswith("STOP")],
            [e_ for e_ in B.log if e_[2] == "/api/v3/order" and e_[1] == "POST" and e_[4] == 200 and str(e_[3].get("type", "")).startswith("STOP")])


funde20f_, zeilen20f_ = seed20f_()
ersetzt20f_, stops20f_ = stop_schreibungen20f_()
nach20f_ = [e_ for e_ in stops20f_ if e_[3].get("quantity") == "0.053" and B.log.index(e_) > B.log.index(ersetzt20f_[-1])] if ersetzt20f_ else []
pruefe("20.F1 Strenger Not-Aus-Seed 1510735: kam das Verkleinern des Spot-Stops (Antwort verloren) doch an, bekommen die freigegebenen Coins einen eigenen Stop — kein Befund, ein Spot-Stop über 0,053 nach dem unklaren Bescheid, die Meldung «kam an»",
       not funde20f_ and len(ersetzt20f_) >= 1 and len(nach20f_) == 1 and any("kam an (neu gelesen" in z_ for z_ in zeilen20f_),
       ([(f_[0], f_[1].get("wann")) for f_ in funde20f_][:4], len(ersetzt20f_), len(nach20f_), zeilen20f_[-3:]))
# … ist der Kontostand NACH dem unklaren Bescheid nicht lesbar (Anfragen 99 ff., fünf Versuche scheitern), weiss der Schutz nicht, was frei ist: kein Absturz, laut («NICHT vollständig gesichert», für die Nachkontrolle vermerkt),
# der Short hat seinen Perp-Stop über die ganze Menge; der saubere Not-Aus danach schliesst alles. Die freien Coins ohne Stop sind bis zur Wiederholung das dokumentierte Restrisiko (README) — bei BEIDEM: Antwort verloren UND Konto nicht lesbar.
funde20g_, zeilen20g_ = seed20f_(lambda: B.regeln.append(dict(methode="GET", pfad="/api/v3/account", art="vor503", anzahl=6, ab_req=99)))   # ab der Anfrage NACH dem unklaren cancelReplace (Nr. 98)
perp20g_ = [e_ for e_ in B.log if e_[2] == "/fapi/v1/algoOrder" and e_[1] == "POST" and e_[4] == 200]
pruefe("20.F1 Dasselbe, der Kontostand ist nach dem unklaren Bescheid nicht lesbar: kein Absturz, laut («UND Kontostand nicht lesbar», «NICHT vollständig gesichert»), der Short hat seinen Perp-Stop über die ganze Menge, nach der Wiederholung höchstens der Befund «Stop zu gross»",
       [f_[0] for f_ in funde20g_] in ([], ["PERP_STOP_UEBER_NETTO"]) and any(e_[3].get("quantity") == "0.053" for e_ in perp20g_)
       and any("UND Kontostand nicht lesbar" in z_ for z_ in zeilen20g_) and any("NICHT vollständig gesichert" in z_ for z_ in zeilen20g_),
       ([(f_[0], f_[1].get("wann")) for f_ in funde20g_][:4], [e_[3].get("quantity") for e_ in perp20g_], zeilen20g_[-3:]))


def nicht_angekommen20f_():
    for r_ in B.regeln:
        if r_.get("pfad") == "/api/v3/order/cancelReplace" and r_.get("art") == "nach503":
            r_["art"] = "vor503"                                                  # 503 VOR der Verarbeitung: das Verkleinern kam nie an


funde20h_, zeilen20h_ = seed20f_(nicht_angekommen20f_)
ersetzt20h_, stops20h_ = stop_schreibungen20f_()
pruefe("20.F1 Kam das Verkleinern NICHT an (der alte Stop steht, nichts ist frei): kein zweiter Stop über schon gesperrte Coins, kein Befund, keine Meldung «kam an»",
       not funde20h_ and not ersetzt20h_ and len(stops20h_) == 1 and not any("kam an (neu gelesen" in z_ for z_ in zeilen20h_),
       ([(f_[0], f_[1].get("wann")) for f_ in funde20h_][:4], len(ersetzt20h_), [(e_[3].get("quantity"), e_[4]) for e_ in stops20h_]))

# klein 7 (Prüfwerkzeuge): der Einzelfehler-Raster der 20. Prüfung (pruef_nk_einzelfehler.py) liegt im Repo — Rauchprobe MIT Negativkontrolle: gegen den Produktionscode findet er nichts, gegen eine Nachkontrolle, deren
# Folge-Durchgänge nichts tun (das Netz des 10-Minuten-Takts fehlt), findet er die Lücke nach Durchgang 1 (er ist nicht blind)
import pruef_nk_einzelfehler as NKE  # noqa: E402
sz20e_ = R.SZENARIEN[2]                                                      # ('BTC', 0.5, -0.5)
ref20e_ = NKE.fall(sz20e_, "stops_scheitern", [], False, True)


def sweep20_():
    ergebnis_ = []
    for i_ in range(ref20e_["anfragen"]):
        for art_ in ("vor503", "nach503", "unsichtbar"):
            m_ = NKE.fall(sz20e_, "stops_scheitern", [(i_, art_)], False, True)
            if m_ is not None:
                ergebnis_.append(m_)
    return ergebnis_


echt20e_ = [m_ for m_ in sweep20_() if m_["ausnahme"] or m_["arten"] or m_["unbekannt"]]
orig_dg20_ = NKE.durchgang
NKE.durchgang = lambda env_, d_, erster_, jung_, budget0_: orig_dg20_(env_, d_, erster_, jung_, budget0_) if erster_ else None   # Folge-Durchgänge tun nichts
try:
    mut20e_ = [m_ for m_ in sweep20_() if m_["ausnahme"] or m_["arten"] or m_["unbekannt"]]
finally:
    NKE.durchgang = orig_dg20_
pruefe("20.Werkzeug Einzelfehler-Raster (Szenario 2, Stops scheitern, 23 Anfragen × 3 Störungsarten, Budget aufgebraucht): gegen den Produktionscode keine Befunde — und nicht blind: ohne die Folge-Durchgänge findet er die Lücke",
       ref20e_ and ref20e_["anfragen"] >= 15 and not ref20e_["arten"] and not echt20e_ and len(mut20e_) >= 5, (ref20e_ and ref20e_["anfragen"], len(echt20e_), len(mut20e_)))

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
