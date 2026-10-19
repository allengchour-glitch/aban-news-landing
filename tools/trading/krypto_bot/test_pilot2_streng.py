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
         [("perp", "SELL", 0.05, False)], 3.0, 2.6, 2.55)):
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
        flach10 = g10["coins"] * g10["kurs"] < 50      # beim Hebel 1,0 gelingt der Verkauf in der 4. Runde (nur «dreimal»)
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
pruefe("15.G1b Vorab: dazu ist der Markt beidseitig gesichert und die Nachkontrolle angestossen", d_.get("beidseitig") and d_.get("nachkontrolle"), d_)
# Gegenprobe: lässt sich der gerade gesetzte Stop über die Kennung löschen, bleibt nichts gemerkt, der Markt nicht beidseitig und nur der alte Stop steht
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
pruefe("15.G1b Vorab Gegenprobe: lässt sich der neue Stop über die Kennung löschen, bleibt nichts gemerkt, der Markt ist nicht beidseitig",
       raised_ and not buch_["stops"]["BTC"].get("perp_weitere") and not d_.get("beidseitig") and len(fu_.eigene_stops("BTCUSDT")) == 1,
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
        ok_ = L._perp_notstop(fu_, "BTC", d_, st_, 0.15 if len(plan_e) == 2 else 0.1, 100000.0, w_.append, [], "Test")
    pruefe(f"15.K-e (E) _perp_notstop {was_e}: Not-Stop scheitert, Kennung nicht löschbar → im Buch gemerkt, Markt beidseitig",
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
