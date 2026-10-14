#!/usr/bin/env python3
"""Pilot 2.0 gegen die STRENGE Prüf-Börse (pruef_boerse.py) — die Belege der 8. (p1–p11), 9. (9.p1–9.p10) und 10. Prüfung (10.*)
und die Fuzzer-Funde als feste Szenarien, dazu ein kleiner Fuzzer mit festen Seeds (pruef_fuzzer.py). Ohne Netz, nur 127.0.0.1.
    python3 -B tools/trading/krypto_bot/test_pilot2_streng.py"""
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
