#!/usr/bin/env python3
"""Deterministischer Ausfall-Raster für Pilot 2.0 (aus der 15. unabhängigen Prüfung, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1.

Die Zufalls-Fuzzer (pruef_fuzzer.py) fanden den Befund G1 der 15. Prüfung nicht: er braucht eine ganz bestimmte Folge — das Löschen der alten
Perp-Stops scheitert nach dem Setzen des neuen UND danach ist die Perp-Liste unlesbar. Der Raster zählt solche Kopplungen systematisch durch:

  Tag 0 baut eine Lage (Markt, Richtung z0), Tag 1 läuft mit ZWEI gekoppelten Störungen:
    W = eine SCHREIBENDE Störung (Löschen/Setzen/Ersetzen/Markt), die ab dem (skip+1)-ten passenden Request wirkt,
    R = eine LESE-Störung (Liste/Konto/Position/Kurs), die ab demselben Zeitpunkt («bei_w») oder ab Tagesbeginn («anfang») wirkt.
    K = optional (--kurs) ein Kurssprung im selben Augenblick: der Markt springt um +4 %, −4 %, +15 % oder −15 % bei der nächsten Anfrage nach Störungsbeginn.
    H = optional (--haengend) Konto OHNE STOP_LOSS und eine Kurslücke zwischen Tag 0 und Tag 1: jeder Spot-Stop (STOP_LOSS_LIMIT) ist ausgelöst und HÄNGT über dem Kurs
        (der Weg der Befunde E10, E13–E16, E19, E21 — der Zufalls-Fuzzer fand ihn nur im gezielten Modus PRUEF_LUECKEN=1). Lagen ohne Spot-Stop zählen als «kein_spotstop».
  Gemessen wird nach dem Lauf, nach verspätet ankommenden Aufträgen + Nachkontrolle (Störungen AUS) und nach einem Kurssprung.
    N = optional (--notaus) Tag 1 ist der NOT-AUS (STOP) statt des Tageslaufs: gemessen wird wie in pruef_fuzzer.notaus_runde — Schutz direkt nach dem Not-Aus (ohne Störungen am Ende
        «alles zu» erwartet), nach verspäteten Aufträgen + der Nachkontrolle im Not-Aus-Modus, «alles zu» nur bei flachem Konto (FALSCH_ALLES_ZU), und ein sauberer zweiter Not-Aus (SAUBER_NICHT_ZU).

Befunde (jeder ist ein Fehler):
  NACH_NK                    nach dem Lauf + der ungestörten Nachkontrolle bleibt etwas ohne Stop (Selbstheilung fehlt)
  NACH_LAUF_STILL            direkt nach dem Lauf ohne Stop und der Lauf warnte nicht
  NACH_LAUF_LAUT_OHNE_NK     direkt nach dem Lauf ohne Stop, der Lauf warnte, die Nachkontrolle tat aber nichts
  SELBST_ENTFERNT            direkt nach dem Lauf fehlt Schutz, und Pilot 2.0 hat in diesem Markt selbst einen Stop der betroffenen Seite entfernt (gelöscht oder per cancelReplace storniert,
                             ohne dass der Ersatz kam) — die Lücke war also nicht unvermeidbar (E26: der «Geister-Stop» eines gescheiterten Versuchs wurde gelöscht und war der einzige Schutz),
                             auch wenn die Nachkontrolle sie später heilt
  UNBEKANNT_NACH_LAUF        an der Börse steht ein eigener Perp-Stop (Kennung p2a…), den das Buch weder als aktuellen Stop noch in seinem
                             Gedächtnis (perp_weitere) kennt, und er ist sichtbar (Erhaltungssatz «kein vergessener Stop»)
  UNBEKANNT_NACH_NK          dasselbe nach der Nachkontrolle — dann kennt ihn niemand mehr
  AUSNAHME                   der Lauf warf eine Ausnahme nach aussen
  Nur mit --notaus:
  FALSCH_ALLES_ZU            der Not-Aus (bzw. seine Nachkontrolle) meldet «alles zu», das Konto ist aber nicht flach
  SAUBER_NICHT_ZU            auch ein zweiter, ungestörter Not-Aus bringt das Konto nicht auf flach
  Statistik (kein Befund): `bis_nk_ungeschuetzt` zählt Läufe/Not-Aus, die DIREKT danach einen Long oder Short ohne wirksamen Stop zurückliessen, LAUT warnten und deren Nachkontrolle es heilte
  (Not-Aus mit zwei gleichzeitigen Störungen, z. B. cancelReplace tot × Spot-Liste unlesbar bei hängendem Stop: bis zur nächsten Nachkontrolle, höchstens 30 s, kann nichts geschützt werden).

Aufruf (PRUEF_STRENG=1 für die strenge Prüf-Börse):
  python3 -B pruef_raster.py VON BIS [AUSGABE.json]     # Szenario-Index VON..BIS-1 (12 Szenarien; je Szenario 12 × 4 × 15 Fälle)
  python3 -B pruef_raster.py VON BIS --kurs             # dazu die Kurssprung-Kopplung (4 Sprünge, je Szenario 4 × 720 Fälle)
  python3 -B pruef_raster.py VON BIS --haengend         # Konto ohne STOP_LOSS, die Spot-Stops hängen zu Beginn von Tag 1 (kombinierbar mit --kurs)
  python3 -B pruef_raster.py VON BIS --notaus           # Tag 1 ist der Not-Aus (kombinierbar mit --haengend und --kurs; Szenarien mit gleichem Tag 0 zählen einmal)
  python3 -B pruef_raster.py VON BIS --haengend --paare # nur die 10 Paare schreibender Störungen (z. B. mit --kurs: 4× so viele Zellen)
  python3 -B pruef_raster.py VON BIS --notaus --geist   # (Not-Aus + --geist: zusätzlich geht der Marktverkauf der Coins nicht — der Not-Aus muss schützen, dann setzt er Perp-Stops)
  python3 -B pruef_raster.py VON BIS --geist            # dazu die 6 Paare «Perp-Stop kommt an, Antwort verloren × jede Wiederholung scheitert» (Geister-Stop, E26; mit --paare nur diese; kombinierbar mit --notaus)
"""
from __future__ import annotations

import json
import sys
import traceback
from collections import Counter

import pilot2_live as L
import pruef_fuzzer as P

B = P.B

STOP_SPOT = lambda m, p, q: q.get("type", "").startswith("STOP")  # noqa: E731
MARKT_SPOT = lambda m, p, q: q.get("type") == "MARKET"  # noqa: E731

#: (Markt, Richtung gestern, Richtung heute)
SZENARIEN = [("ETH", -1.0, -0.25), ("BTC", -1.0, -0.5), ("BTC", 0.5, -0.5), ("BTC", 1.0, 0.25), ("ETH", -0.5, 0.5), ("BTC", -0.25, 0.0),
             ("ETH", 0.0, -0.5), ("ETH", 0.25, 0.0), ("BTC", 0.5, 1.0), ("ETH", -0.25, -1.0), ("BTC", 0.25, 0.5), ("BTC", -0.5, -0.25)]
#: schreibende Störungen: (Methode, Pfad, Bedingung, Art, Anzahl)
SCHREIBEN = [("DELETE", "/fapi/v1/algoOrder", None, "vor503", 3), ("DELETE", "/fapi/v1/algoOrder", None, "nach503", 3),
             ("POST", "/fapi/v1/algoOrder", None, "vor503", 3), ("POST", "/fapi/v1/algoOrder", None, "nach503", 3),
             ("POST", "/api/v3/order", STOP_SPOT, "nach503", 3), ("POST", "/api/v3/order", STOP_SPOT, "vor503", 3),
             ("DELETE", "/api/v3/order", None, "vor503", 3), ("POST", "/api/v3/order/cancelReplace", None, "nur_storno", 1),
             ("POST", "/api/v3/order/cancelReplace", None, "vor503", 3), ("POST", "/fapi/v1/order", None, "vor503", 3),
             ("POST", "/api/v3/order", MARKT_SPOT, "vor503", 3), ("POST", "/fapi/v1/algoOrder", None, "unsichtbar", 1)]
#: zusätzliche schreibende Störungen für --haengend (Konto ohne STOP_LOSS, die Spot-Stops hängen): das Löschen des hängenden Stops kommt an und nur die Antwort geht verloren (E19),
#: das Ersetzen (Stop → Marktverkauf bzw. Not-Stop) kommt an und die Antwort geht verloren, der Marktverkauf wird abgelehnt («nichts») oder kommt an und die Antwort geht verloren
SCHREIBEN_HAENGEND = [("DELETE", "/api/v3/order", None, "nach503", 3), ("POST", "/api/v3/order/cancelReplace", None, "nach503", 3),
                      ("POST", "/api/v3/order", MARKT_SPOT, "ablehnen", 3), ("POST", "/api/v3/order", MARKT_SPOT, "nach503", 3)]
#: zusätzliche schreibende Störungen für --notaus: Rückkauf des Shorts (Futures) mit verlorener Antwort bzw. nur teilweise ausgeführt, Marktverkauf der Coins mit verlorener Antwort / abgelehnt / teilweise,
#: Löschen eines Spot-Stops mit verlorener Antwort, Umbuchung abgelehnt
SCHREIBEN_NOTAUS = [("POST", "/fapi/v1/order", None, "nach503", 3), ("POST", "/fapi/v1/order", None, "teil", 1), ("POST", "/api/v3/order", MARKT_SPOT, "nach503", 3),
                    ("POST", "/api/v3/order", MARKT_SPOT, "teil", 1), ("POST", "/api/v3/order", MARKT_SPOT, "ablehnen", 3), ("DELETE", "/api/v3/order", None, "nach503", 3),
                    ("POST", "/sapi/v1/asset/transfer", None, "vor503", 3)]
#: Paare schreibender Störungen für --haengend (gleicher Beginn): das Ersetzen des hängenden Stops (Stop → Marktverkauf bzw. Not-Stop) scheitert DAUERHAFT (unklar) oder Binance kennt
#: cancelReplace nicht («fehlt», HTTP 404) — dann nimmt Pilot 2.0 den Weg «hängenden Stop löschen, Not-Stop aus den freien Coins» (E10/E19) — UND dazu geht das Löschen bzw. der
#: Not-Stop-Auftrag selbst schief. Das ist die Kopplung, die der Zufalls-Fuzzer erst mit E19 (Lücken-Lauf-Seed 112159) fand.
HAENGEND_ERSETZEN = [("POST", "/api/v3/order/cancelReplace", None, "vor503", 10 ** 6), ("POST", "/api/v3/order/cancelReplace", None, "fehlt", 1)]
HAENGEND_ZWEITE = [("DELETE", "/api/v3/order", None, "vor503", 3), ("DELETE", "/api/v3/order", None, "nach503", 1), ("DELETE", "/api/v3/order", None, "nach503", 3),
                   ("POST", "/api/v3/order", STOP_SPOT, "vor503", 3), ("POST", "/api/v3/order", STOP_SPOT, "nach503", 3)]
#: Paare für --geist (Folge-PR, E26): der Perp-Stop kommt an, nur die Antwort geht verloren («nach503», ein- oder dreimal) — danach scheitert jede Wiederholung (Rate-Limit, 503 vor der Verarbeitung,
#: Verbindungsabriss). Das ist der «Geister-Stop» des Befunds E26 (Not-Aus-Fuzzer-Seed 117727: Pilot 2.0 löschte ihn über die Kennung und stand ohne Stop da).
GEIST_ERSTE = [("POST", "/fapi/v1/algoOrder", None, "nach503", 1), ("POST", "/fapi/v1/algoOrder", None, "nach503", 3)]
GEIST_ZWEITE = [("POST", "/fapi/v1/algoOrder", None, "429", 10 ** 6), ("POST", "/fapi/v1/algoOrder", None, "vor503", 10 ** 6), ("POST", "/fapi/v1/algoOrder", None, "abriss_vor", 10 ** 6)]
#: lesende Störungen: None oder (Methode, Pfad, Art, Anzahl)
LESEN = [None, ("GET", "/fapi/v1/openAlgoOrders", "vor503", 8), ("GET", "/fapi/v1/openAlgoOrders", "vor503", 10 ** 6),
         ("GET", "/api/v3/openOrders", "vor503", 8), ("GET", "/api/v3/openOrders", "vor503", 10 ** 6),
         ("GET", "/api/v3/account", "vor503", 4), ("GET", "/fapi/v2/positionRisk", "vor503", 4), ("GET", "/api/v3/ticker/price", "vor503", 8)]


def unbekannte(k, datei):
    """Erhaltungssatz «kein vergessener Stop»: eigene Perp-Stops (Kennung p2a…) an der Börse, die das Buch weder als aktuellen Stop noch in
    seinem Gedächtnis (perp_weitere) kennt. → [(Symbol, Menge, noch_unsichtbar)]; unsichtbare (Listenverzögerung) zählen erst, wenn sie sichtbar sind."""
    try:
        b = json.loads(open(datei).read()).get("echt") or {}
    except (OSError, ValueError):
        b = {}
    bekannt_id, bekannt_cid = set(), set()
    for st in (b.get("stops") or {}).values():
        paare = [(st.get("perp"), st.get("perp_cid"))] + [tuple((list(w) + [None, None])[:2]) for w in st.get("perp_weitere") or []]
        for aid, cid in paare:
            if aid is not None:
                bekannt_id.add(str(aid))
            if cid:
                bekannt_cid.add(cid)
    out = []
    for aid, a in k.algos.items():
        if (str(a.get("clientAlgoId", "")).startswith(L.CID_STOP_PERP) and str(aid) not in bekannt_id
                and a.get("clientAlgoId") not in bekannt_cid):
            out.append((a["symbol"], float(a["quantity"]), a.get("sichtbar_ab", 0) > B.n_listen))
    return out


#: Kurssprünge der optionalen dritten Kopplung (relativ zum Kurs im Augenblick des Störungsbeginns)
KURSE = [0.04, -0.04, 0.15, -0.15]


def _regel_schreiben(t):
    m, pfad, pred, art, n = t
    if art == "fehlt":  # keine Regel, ein Schalter der Börse: cancelReplace unbekannt (404)
        B.ersetzen_fehlt = True
        return None
    r = dict(methode=m, pfad=pfad, pred=pred, art=art, anzahl=n, anzahl0=n)
    if art == "unsichtbar":
        r["listen"] = 12
    return r


def _regel_lesen(t):
    m, pfad, art, n = t
    return dict(methode=m, pfad=pfad, pred=None, art=art, anzahl=n, anzahl0=n)


def _befunde(k, d):
    return P.echte(P.schutz_befunde(k, P.unklar_je_markt(d)) + P.folgeschaden(k))


def fall(sz, w, skip, r, modus, kurs=None, haengend=False, w2=None, notaus=False, geist=False):
    """Ein Fall → None (die Störung kam nie zum Zug), ein Wort («kein_spotstop», «kein_haengender»: die Lage lässt keinen hängenden Stop zu) oder die Messung.
    kurs: relativer Kurssprung im Augenblick des Störungsbeginns (None = keiner). haengend: Konto ohne STOP_LOSS, die Spot-Stops hängen zu Beginn von Tag 1.
    w2: eine zweite schreibende Störung mit demselben Beginn (nur sinnvoll mit haengend). notaus: Tag 1 ist der Not-Aus statt des Tageslaufs (z1 zählt dann nicht)."""
    markt, z0, z1 = sz
    k = P.neues_konto(20000)
    if haengend:  # nach neues_konto (es setzt die Auftragstypen zurück): Spot-Stops sind STOP_LOSS_LIMIT und können bei einer Kurslücke hängen
        B.stop_typen = [x for x in B.stop_typen if x != "STOP_LOSS"]
    d = P.neu_buch()
    env = P.env_echt(kapital=20000)
    P.lauf([P.E(markt, z0)], env, d)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    haengt = 0.0
    if haengend:
        sym = markt + "USDT"
        limits = [o["preis"] for o in k.orders.values() if o["symbol"] == sym and o["typ"] == "STOP_LOSS_LIMIT" and o["status"] in ("NEW", "PARTIALLY_FILLED")]
        if not limits:
            return "kein_spotstop"
        B.bewegen(sym, round(min(limits) * 0.99, 2))  # Kurslücke unter das tiefste Limit: jeder Spot-Stop ist ausgelöst und hängt über dem Kurs
        haengt = P._haengend(k, sym)
        if not haengt:
            return "kein_haengender"
    st = {"n": 0, "an": False}
    wm, wp, wpred = w[0], w[1], w[2]
    B.regeln = [_regel_lesen(r)] if (r is not None and modus == "anfang") else []
    if geist and notaus:  # der Verkauf der Coins geht nicht (Rate-Limit / 503 vor der Verarbeitung): der Not-Aus muss schützen statt schliessen — erst dann setzt er Perp-Stops, die der Geist-Stop treffen kann
        B.regeln.append(dict(methode="POST", pfad="/api/v3/order", pred=MARKT_SPOT, art="vor503", anzahl=10 ** 6, anzahl0=10 ** 6))

    def haken(m, pfad, p):
        if m == wm and pfad == wp and (wpred is None or wpred(m, pfad, p)):
            st["n"] += 1
            if st["n"] == skip + 1 and not st["an"]:
                st["an"] = True
                for w_ in (w,) + ((w2,) if w2 is not None else ()):
                    r_ = _regel_schreiben(w_)
                    if r_ is not None:
                        B.regeln.append(r_)
                if r is not None and modus == "bei_w":
                    B.regeln.append(_regel_lesen(r))
                if kurs is not None:
                    B.regeln.append(dict(art="kurs", sym=markt + "USDT", preis=round(B.kurs[markt + "USDT"] * (1 + kurs), 2), anzahl=1, anzahl0=1))
    B.vor_jeder_anfrage = haken
    log_na = len(B.log)
    regeln_ende = []
    try:
        res = P.lauf([] if notaus else [P.E(markt, z1)], env, d, notaus=notaus)
        regeln_ende = list(B.regeln)  # mit «anzahl0»: _dauer rechnet mit den ursprünglichen Anzahlen
    finally:
        B.vor_jeder_anfrage = None
        B.regeln = []
        B.ersetzen_fehlt = False
    if not st["an"]:
        return None
    if notaus:
        return _messen_notaus(k, d, env, res, regeln_ende, log_na, haengt)
    nach_lauf = _befunde(k, d)
    selbst = sorted({x[0] for x in nach_lauf if P._selbst_entfernt(log_na, x[1], x[0])})  # fehlender Schutz, obwohl Pilot 2.0 selbst einen Stop dieser Seite entfernt hat
    unbekannt_lauf = [u for u in unbekannte(k, d) if not u[2]]
    laut = bool(res.get("warnung"))
    try:  # welche Märkte hat der Lauf für die Nachkontrolle vermerkt?
        offen_lauf = list((json.loads(open(d).read()).get("echt") or {}).get("schutz_offen") or [])
    except (OSError, ValueError):
        offen_lauf = []
    P.pending_abarbeiten()
    B.n_listen += 1000  # 10 Minuten später zeigen die Listen jeden Auftrag
    rn = P.nachkontrolle(env, d)
    nach_nk = _befunde(k, d)
    unbekannt_nk = unbekannte(k, d)
    return {"nach_lauf": [(x[0], x[-2:] if len(x) > 2 else None) for x in nach_lauf][:3], "nach_nk": [(x[0], x[-2:]) for x in nach_nk][:3],
            "unbekannt_lauf": unbekannt_lauf[:3], "unbekannt_nk": unbekannt_nk[:3],
            "laut": laut, "nk_tat_etwas": bool(rn.get("zeilen")), "zeilen": [z[:150] for z in res["zeilen"] if "⚠" in z][:3], "haengt": haengt,
            "schutz_offen": offen_lauf, "selbst_entfernt": selbst}


def _messen_notaus(k, d, env, res, regeln, log_na, haengt):
    """Die Messung nach einem Not-Aus mit Störungen — dieselben Stufen und Entschuldigungen wie pruef_fuzzer.notaus_runde (DAUER_ / STORNO_ZUERST_ / STAUB / LIMIT_LUECKE_ über P.echte)."""
    laut = bool(res.get("warnung"))
    storno = any(r_.get("art") == "nur_storno" for r_ in regeln) and bool(P._storno409(log_na)) and laut
    vor = []
    if res["alles_zu"] is not True:  # Stand direkt nach dem Not-Aus (verspätete Aufträge noch unterwegs)
        vor = [(("STORNO_ZUERST_" if storno else "")
                + ("DAUER_" if P._dauer(regeln, b[0], k, b[1]) and laut and not P._selbst_entfernt(log_na, b[1], b[0]) else "") + b[0], b)
               for b in P.schutz_befunde(k, P.unklar_je_markt(d))]
    P.pending_abarbeiten()
    res2, nk_tat = res, False
    if res["alles_zu"] is not True:  # Nachkontrolle im Not-Aus-Modus (stop.bat, Tagesaufgabe) schliesst Verspätetes
        rn = P.nachkontrolle(dict(env, KI_BOT_STOP="1"), d)
        nk_tat = bool(rn.get("zeilen"))
        res2 = rn if rn.get("alles_zu") is not None else res
    falsch = res2["alles_zu"] is True and not P.flach(k)
    nach = [(b[0], b) for b in P.schutz_befunde(k, P.unklar_je_markt(d)) + P.folgeschaden(k)] if res2["alles_zu"] is not True else []
    r3 = P.sauber_schliessen(env, d)
    sauber_nicht = r3["alles_zu"] is not True or not P.flach(k)
    selbst = sorted({x[0] for x in P.echte(vor) if P._selbst_entfernt(log_na, x[1][1], x[1][0])})
    return {"notaus": True, "selbst_entfernt": selbst, "nach_lauf": [(x[0], x[1][-2:]) for x in P.echte(vor)][:3], "nach_nk": [(x[0], x[1][-2:]) for x in P.echte(nach)][:3],
            "unbekannt_lauf": [], "unbekannt_nk": [], "laut": laut, "nk_tat_etwas": nk_tat, "falsch_alles_zu": falsch, "sauber_nicht_zu": sauber_nicht,
            "alles_zu_lauf": res["alles_zu"], "alles_zu_nk": res2["alles_zu"], "zeilen": [z[:150] for z in res["zeilen"] if "⚠" in z][:3], "haengt": haengt}


def klasse(e):
    """Befundart einer Messung aus fall() (siehe oben) — None = sauber. Die Reihenfolge ist der Rang: der schwerste Befund zuerst."""
    if e.get("falsch_alles_zu"):
        return "FALSCH_ALLES_ZU"
    if e.get("sauber_nicht_zu"):
        return "SAUBER_NICHT_ZU"
    if e.get("selbst_entfernt"):
        return "SELBST_ENTFERNT"
    if e["nach_nk"]:
        return "NACH_NK"
    if e["unbekannt_nk"]:
        return "UNBEKANNT_NACH_NK"
    if e["nach_lauf"] and not e["laut"]:
        return "NACH_LAUF_STILL"
    if e["nach_lauf"] and not e["nk_tat_etwas"]:
        return "NACH_LAUF_LAUT_OHNE_NK"
    if e["unbekannt_lauf"]:
        return "UNBEKANNT_NACH_LAUF"
    return None


def zellen(haengend=False, notaus=False, nur_paare=False, geist=False):
    """Die schreibenden Störungen des Rasters als [(Bezeichnung, w, w2, Zeitpunkte)]. Einzelne Störungen: 4 Zeitpunkte; mit --haengend dazu die zusätzlichen
    Einzelstörungen und die Paare (Ersetzen scheitert dauerhaft × Löschen/Not-Stop schief) mit je 2 Zeitpunkten; mit --notaus die Störungen des Not-Aus."""
    out = [(str(i), w, None, (0, 1, 2, 3)) for i, w in enumerate(SCHREIBEN + (SCHREIBEN_HAENGEND if haengend else []) + (SCHREIBEN_NOTAUS if notaus else []))]
    if haengend:
        out += [(f"P{i}.{j}", w1, w2, (0, 1)) for i, w1 in enumerate(HAENGEND_ERSETZEN) for j, w2 in enumerate(HAENGEND_ZWEITE)]
    if geist:
        out += [(f"G{i}.{j}", w1, w2, (0, 1)) for i, w1 in enumerate(GEIST_ERSTE) for j, w2 in enumerate(GEIST_ZWEITE)]
    return [c for c in out if c[0][0] in "PG"] if nur_paare else out


def raster(von, bis, ausgabe=None, melde=print, kurse=(None,), haengend=False, notaus=False, nur_paare=False, geist=False):
    """Szenarien von..bis-1 durchzählen → (Zähler, Funde). kurse: Kurssprünge der dritten Kopplung (None = ohne Sprung). haengend: Spot-Stops hängen zu Beginn von Tag 1.
    notaus: Tag 1 ist der Not-Aus (Szenarien mit gleichem Markt und gleichem Tag 0 zählen einmal)."""
    zaehler, funde = Counter(), []
    gesehen = set()
    for si in range(von, min(bis, len(SZENARIEN))):
        sz = SZENARIEN[si]
        if notaus:
            if sz[:2] in gesehen:
                continue
            gesehen.add(sz[:2])
        for wi, w, w2, skips in zellen(haengend, notaus, nur_paare, geist):
            for skip in skips:
                for ri, r in enumerate(LESEN):
                    for modus in (("bei_w", "anfang") if r is not None else ("bei_w",)):
                        for kurs in kurse:
                            try:
                                e = fall(sz, w, skip, r, modus, kurs, haengend, w2, notaus, geist)
                            except Exception:  # noqa: BLE001
                                B.vor_jeder_anfrage = None
                                B.regeln = []
                                B.ersetzen_fehlt = False
                                zaehler["AUSNAHME"] += 1
                                funde.append(dict(sz=sz, w=wi, skip=skip, r=ri, modus=modus, kurs=kurs, art="AUSNAHME", fehler=traceback.format_exc()[-600:]))
                                continue
                            if e is None:
                                zaehler["nicht_ausgeloest"] += 1
                                continue
                            if isinstance(e, str):
                                zaehler[e] += 1
                                continue
                            zaehler["lauf"] += 1
                            art = klasse(e)
                            if e["nach_lauf"] and not art:
                                zaehler["bis_nk_ungeschuetzt"] += 1
                            if art:
                                zaehler[art] += 1
                                funde.append(dict(sz=sz, w=wi, skip=skip, r=ri, modus=modus, kurs=kurs, art=art, **e))
    melde(dict(zaehler))
    if ausgabe:
        with open(ausgabe, "w", encoding="utf-8") as f:
            json.dump(funde, f, indent=1, default=str, ensure_ascii=False)
    return zaehler, funde


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    kurse = tuple(KURSE) if "--kurs" in argv else (None,)
    haengend = "--haengend" in argv
    notaus = "--notaus" in argv
    nur_paare = "--paare" in argv
    geist = "--geist" in argv
    argv = [a for a in argv if a not in ("--kurs", "--haengend", "--notaus", "--paare", "--geist")]
    von, bis = int(argv[0]), int(argv[1])
    ausgabe = argv[2] if len(argv) > 2 else (f"pruef_raster{'_notaus' if notaus else ''}{'_haengend' if haengend else ''}{'_kurs' if kurse != (None,) else ''}"
                                             f"{'_paare' if nur_paare else ''}{'_geist' if geist else ''}{'_streng' if P.STRENG else ''}_{von}_{bis}.json")
    zaehler, funde = raster(von, bis, ausgabe, kurse=kurse, haengend=haengend, notaus=notaus, nur_paare=nur_paare, geist=geist)
    echte = [f for f in funde if f["art"] != "UNBEKANNT_NACH_LAUF"]
    print(f"{len(funde)} Befunde ({len(echte)} ohne UNBEKANNT_NACH_LAUF) → {ausgabe}")
    return 1 if funde else 0


if __name__ == "__main__":
    sys.exit(main())
