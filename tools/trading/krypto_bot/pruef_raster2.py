#!/usr/bin/env python3
"""Ausfall-Raster II für Pilot 2.0 (aus der 16. unabhängigen Prüfung, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1.

pruef_raster.py rastert gekoppelte Störungen mit GEMEINSAMEM Beginn (Schreib- und Lesestörung setzen zusammen ein). Die 16. Prüfung fand mit neuen Achsen, was der Zufalls-Fuzzer und das erste Raster
nicht fanden (H6, H1, H7: je ein Rand, an dem zwei Störungen mit verschobenem Beginn zusammentreffen). Raster II zählt diese Achsen durch:

  Ereignisse mit EIGENEM Beginn: jede Störung zählt ihren eigenen Auslöser (die (skip+1)-te passende Anfrage) — ev(Auslöser, skip, Aktionen…, nach=Index)
  Kurssprung zu JEDER Anfrage des Tages (±4 %, ±15 %), allein und mit einer Schreibstörung
  Paare und Tripel schreibender Störungen, auch mit hängenden Stop-Limits (Konto ohne STOP_LOSS)
  Basisbedingung ab Tagesbeginn: Binance kennt cancelReplace nicht (HTTP 404)
  Versatz: die lesende Störung (dauerhaft) setzt erst k Anfragen NACH der schreibenden ein
  Geister-Stop (E26/E27) × Kurssprung / Löschen scheitert / Rückkauf scheitert, auch als Not-Aus
  neue Störungsart «nur_storno_verloren» der Prüf-Börse: cancelReplace storniert, der neue Auftrag wird abgelehnt, die ANTWORT GEHT VERLOREN (503)

Gemessen und eingestuft wird wie in pruef_raster.py (R.klasse: NACH_NK, SELBST_ENTFERNT, UNBEKANNT_*, NACH_LAUF_*; im Not-Aus FALSCH_ALLES_ZU, SAUBER_NICHT_ZU), dazu der Betrag ohne Stop in USDT.
Statistik (kein Befund): `bis_nk_ungeschuetzt` = Läufe, die DIREKT danach etwas ohne wirksamen Stop zurückliessen, laut warnten und deren Nachkontrolle es heilte; davon `selbst_entfernt_vermerkt`
= Pilot 2.0 hatte dort selbst einen Stop entfernt (cancelReplace «Storno zuerst», Vorsorge-Stop), meldete es laut, vermerkte den Markt und die Nachkontrolle heilte es (`max_usdt_…` = der grösste Betrag).

Aufruf (PRUEF_STRENG=1 für die strenge Prüf-Börse; Szenario-Index VON..BIS-1 aus pruef_raster.SZENARIEN):
  python3 -B pruef_raster2.py basis VON BIS normal|fehlt [AUSGABE] [--haengend] [--lesen-wenige]   Einzelstörungen × Basisbedingung
  python3 -B pruef_raster2.py paare VON BIS [AUSGABE] [--basis fehlt] [--haengend] [--notaus] [--tripel]
  python3 -B pruef_raster2.py kurs VON BIS [AUSGABE] [--haengend] [--notaus] [--schritt N]
  python3 -B pruef_raster2.py geist VON BIS MODUS [AUSGABE]      MODUS: tag | tag_kurs | tag_loeschen | tag_rueck | notaus | notaus_teil | notaus_kurs
  python3 -B pruef_raster2.py versatz VON BIS [AUSGABE] [--haengend] [--notaus]
  python3 -B pruef_raster2.py notaus_cr [AUSGABE] [--haengend]
  python3 -B pruef_raster2.py tripel_h INDEX,INDEX,… [AUSGABE]    Tripel auf einem Tag mit hängenden Stop-Limits
Bei jedem Modus: --jeder N = nur jede N-te Zelle (deterministische Stichprobe für grosse Läufe)."""
from __future__ import annotations

import itertools
import json
import sys
import traceback
from collections import Counter
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.dont_write_bytecode = True
import pruef_raster as R  # noqa: E402  (importiert pruef_fuzzer, startet die Prüf-Börse)

P = R.P
B = R.B
L = R.L


# ───────── Ereignisse ─────────
def ev(trigger, skip, *aktionen, nach=None):
    """trigger: (Methode, Pfad, Bedingung) oder None (= jede Anfrage). skip: die (skip+1)-te passende Anfrage löst aus.
    nach: Index eines früheren Ereignisses — gezählt wird erst, NACHDEM dieses ausgelöst hat («unterschiedlicher Beginn»)."""
    return dict(trigger=trigger, skip=skip, aktionen=list(aktionen), nach=nach)


def a_regel(t):
    """Schreibende bzw. lesende Störungsregel (Tupel wie in pruef_raster.SCHREIBEN bzw. LESEN)."""
    def f(markt):
        r = R._regel_schreiben(t) if len(t) == 5 else R._regel_lesen(t)
        if r is not None:
            B.regeln.append(r)
    return f


def a_kurs(frac):
    def f(markt):
        sym = markt + "USDT"
        B.bewegen(sym, round(B.kurs[sym] * (1 + frac), 2))
    return f


def installieren(ereignisse, markt):
    zaehler = [0] * len(ereignisse)
    fertig = [False] * len(ereignisse)

    def haken(m, pfad, p):
        for i, e in enumerate(ereignisse):
            if fertig[i]:
                continue
            if e.get("nach") is not None and not fertig[e["nach"]]:
                continue
            t = e["trigger"]
            if t is not None:
                tm, tp, tpred = t
                if not (m == tm and pfad == tp and (tpred is None or tpred(m, pfad, p))):
                    continue
            zaehler[i] += 1
            if zaehler[i] == e["skip"] + 1:
                fertig[i] = True
                for akt in e["aktionen"]:
                    akt(markt)
    B.vor_jeder_anfrage = haken
    return fertig


def betrag_ohne_stop(befunde):
    """Der grösste Betrag (USDT) unter den Befunden (Zahl am Ende des Tupels, soweit vorhanden)."""
    s = 0.0
    for b in befunde:
        zahlen = [x for x in b if isinstance(x, (int, float)) and not isinstance(x, bool)]
        if zahlen:
            s = max(s, abs(zahlen[-1]))
    return round(s, 1)


def tag0(sz, haengend=False):
    markt, z0, _z1 = sz
    k = P.neues_konto(20000)
    if haengend:
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
            return None, "kein_spotstop"
        B.bewegen(sym, round(min(limits) * 0.99, 2))
        haengt = P._haengend(k, sym)
        if not haengt:
            return None, "kein_haengender"
    return (k, d, env, haengt), None


def zelle(sz, ereignisse, basis=(), haengend=False, notaus=False, lesen_anfang=None):
    """Ein Fall. ereignisse: Liste von ev(...). basis: Wörter 'fehlt' (cancelReplace = 404 ab Tagesbeginn), 'geist' (nur Not-Aus: der Marktverkauf der Coins geht nicht). lesen_anfang: LESEN-Tupel, ab Tagesbeginn.
    → None (keine Störung kam zum Zug) | Wort («kein_spotstop», «kein_haengender») | Messung (wie R.fall, dazu 'betrag')."""
    markt, _z0, z1 = sz
    t0, wort = tag0(sz, haengend)
    if wort:
        return wort
    k, d, env, haengt = t0
    B.regeln = [R._regel_lesen(lesen_anfang)] if lesen_anfang else []
    if "fehlt" in basis:
        B.ersetzen_fehlt = True
    if notaus and "geist" in basis:
        B.regeln.append(dict(methode="POST", pfad="/api/v3/order", pred=R.MARKT_SPOT, art="vor503", anzahl=10 ** 6, anzahl0=10 ** 6))
    fertig = installieren(ereignisse, markt)
    log_na = len(B.log)
    regeln_ende = []
    try:
        res = P.lauf([] if notaus else [P.E(markt, z1)], env, d, notaus=notaus)
        regeln_ende = list(B.regeln)
    finally:
        B.vor_jeder_anfrage = None
        B.regeln = []
        B.ersetzen_fehlt = False
    if not all(fertig):
        return None
    if notaus:
        e = R._messen_notaus(k, d, env, res, regeln_ende, log_na, haengt)
        e["betrag"] = betrag_ohne_stop(P.schutz_befunde(k, P.unklar_je_markt(d)))
        return e
    nach_lauf = R._befunde(k, d)
    selbst = sorted({x[0] for x in nach_lauf if P._selbst_entfernt(log_na, x[1], x[0])})
    unbekannt_lauf = [u for u in R.unbekannte(k, d) if not u[2]]
    laut = bool(res.get("warnung"))
    try:
        offen_lauf = list((json.loads(open(d).read()).get("echt") or {}).get("schutz_offen") or [])
    except (OSError, ValueError):
        offen_lauf = []
    betrag_lauf = betrag_ohne_stop(nach_lauf)
    P.pending_abarbeiten()
    B.n_listen += 1000
    rn = P.nachkontrolle(env, d)
    nach_nk = R._befunde(k, d)
    unbekannt_nk = R.unbekannte(k, d)
    return {"nach_lauf": [(x[0], x[-2:] if len(x) > 2 else None) for x in nach_lauf][:3], "nach_nk": [(x[0], x[-2:]) for x in nach_nk][:3],
            "unbekannt_lauf": unbekannt_lauf[:3], "unbekannt_nk": unbekannt_nk[:3],
            "laut": laut, "nk_tat_etwas": bool(rn.get("zeilen")), "zeilen": [z[:150] for z in res["zeilen"] if "⚠" in z][:3], "haengt": haengt,
            "schutz_offen": offen_lauf, "selbst_entfernt": selbst, "betrag": betrag_lauf, "betrag_nk": betrag_ohne_stop(nach_nk)}


def lauf_raster(zellen, melde=print, ausgabe=None, max_funde=2000):
    """zellen: Iterable von (Bezeichnung als dict, Aufruf → Messung). → (Zähler, Funde)."""
    zaehler, funde = Counter(), []
    for bez, f in zellen:
        try:
            e = f()
        except Exception:  # noqa: BLE001
            B.vor_jeder_anfrage = None
            B.regeln = []
            B.ersetzen_fehlt = False
            zaehler["AUSNAHME"] += 1
            funde.append(dict(bez, art="AUSNAHME", fehler=traceback.format_exc()[-600:]))
            continue
        if e is None:
            zaehler["nicht_ausgeloest"] += 1
            continue
        if isinstance(e, str):
            zaehler[e] += 1
            continue
        zaehler["lauf"] += 1
        art = R.klasse(e)
        if art == "SELBST_ENTFERNT" and e.get("laut") and e.get("schutz_offen") and not e.get("nach_nk") and not e.get("unbekannt_nk"):
            # Pilot 2.0 hat dort selbst einen Stop entfernt (cancelReplace storniert und lehnt ab, Antwort verloren; Vorsorge-Stop nach verlorener Löschantwort) — die Lücke ist aber laut gemeldet,
            # für die Nachkontrolle vermerkt und von ihr geheilt: Statistik statt Befund (wie die 16. Prüfung sie einstufte); nicht vermerkt, still oder ungeheilt bleibt es ein Befund
            zaehler["selbst_entfernt_vermerkt"] += 1
            zaehler["max_usdt_selbst_entfernt_vermerkt"] = max(zaehler["max_usdt_selbst_entfernt_vermerkt"], int(e.get("betrag") or 0))
            art = None
        if e["nach_lauf"] and not art:
            zaehler["bis_nk_ungeschuetzt"] += 1
        if art:
            zaehler[art] += 1
            if len(funde) < max_funde:
                funde.append(dict(bez, art=art, **e))
    melde(dict(zaehler))
    if ausgabe:
        with open(ausgabe, "w", encoding="utf-8") as f:
            json.dump(funde, f, indent=1, default=str, ensure_ascii=False)
    return zaehler, funde


# ───────── Störungsmengen ─────────
#: neue schreibende Störungen (zusätzlich zu pruef_raster.SCHREIBEN): cancelReplace storniert und die Antwort geht verloren, Rückkäufe/Verkäufe mit verlorener Antwort oder nur teilweise ausgeführt
NEU = [("POST", "/api/v3/order/cancelReplace", None, "nur_storno_verloren", 1), ("POST", "/api/v3/order/cancelReplace", None, "nur_storno_verloren", 3),
       ("POST", "/api/v3/order/cancelReplace", None, "nach503", 1), ("POST", "/api/v3/order/cancelReplace", None, "vor503", 10 ** 6),
       ("POST", "/api/v3/order", R.STOP_SPOT, "unsichtbar", 1), ("POST", "/fapi/v1/order", None, "nach503", 3), ("POST", "/fapi/v1/order", None, "teil", 1),
       ("POST", "/api/v3/order", R.MARKT_SPOT, "nach503", 3), ("POST", "/api/v3/order", R.MARKT_SPOT, "teil", 1), ("POST", "/fapi/v1/order", None, "spaet_u", 1)]
WS = R.SCHREIBEN + NEU
LES = [None, R.LESEN[2], R.LESEN[4]]   # keine | Perp-Liste dauerhaft tot | Spot-Liste dauerhaft tot
STARTS = [(0, 0), (0, 1), (1, 0)]
KERN_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 17, 19, 21]    # Indizes aus WS für die Paare
TRIPEL_AUS = [0, 1, 2, 3, 6, 8, 9, 12, 17, 19]                          # Indizes aus WS für die Tripel
SPRUENGE = [0.04, -0.04, 0.15, -0.15]
KURS_FAULTS = [None, R.SCHREIBEN[0], R.SCHREIBEN[3], R.SCHREIBEN[5], R.SCHREIBEN[6], R.SCHREIBEN[8], NEU[0], R.SCHREIBEN[11]]
CR = [("POST", "/api/v3/order/cancelReplace", None, "nur_storno_verloren", 1), ("POST", "/api/v3/order/cancelReplace", None, "nur_storno_verloren", 3),
      ("POST", "/api/v3/order/cancelReplace", None, "nach503", 3), ("POST", "/api/v3/order/cancelReplace", None, "nur_storno", 1),
      ("POST", "/api/v3/order/cancelReplace", None, "vor503", 3)]
CR_ZWEITE = [None, ("POST", "/api/v3/order", R.MARKT_SPOT, "ablehnen", 3), ("POST", "/api/v3/order", R.MARKT_SPOT, "vor503", 10 ** 6), ("POST", "/fapi/v1/order", None, "vor503", 10 ** 6)]
READS = [("GET", "/fapi/v1/openAlgoOrders", "vor503", 10 ** 6), ("GET", "/api/v3/openOrders", "vor503", 10 ** 6), ("GET", "/api/v3/account", "vor503", 10 ** 6),
         ("GET", "/fapi/v2/positionRisk", "vor503", 10 ** 6), ("GET", "/api/v3/ticker/price", "vor503", 10 ** 6)]
VERSATZ = [0, 1, 2, 3, 5, 8, 13, 21, 34]
LOESCHEN = [("DELETE", "/fapi/v1/algoOrder", None, "vor503", 3), ("DELETE", "/fapi/v1/algoOrder", None, "vor503", 10 ** 6), ("DELETE", "/fapi/v1/algoOrder", None, "nach503", 3)]
TEIL = [("POST", "/fapi/v1/order", None, "teil", 1), ("POST", "/fapi/v1/order", None, "teil", 3), ("POST", "/fapi/v1/order", None, "nach503", 3)]
MARKT_TOT = ("POST", "/api/v3/order", R.MARKT_SPOT, "vor503", 10 ** 6)
TRIPEL_H_AUSWAHL = [WS[5], WS[6], WS[7], WS[8], WS[10]] + list(R.SCHREIBEN_HAENGEND) + list(R.HAENGEND_ERSETZEN)


def trig(w):
    return (w[0], w[1], w[2])


def wdef(w):
    return str(w[:2]) + w[3] + str(w[4])


def anzahl_anfragen(sz, haengend=False, notaus=False, geist=False):
    """Zahl der Anfragen des sauberen Tages (bzw. Not-Aus; mit geist: Marktverkauf tot) — die Kurssprung-Zeitpunkte."""
    t0, wort = tag0(sz, haengend)
    if wort:
        return 0
    _k, d, env, _ = t0
    n0 = B.n_req
    if notaus and geist:
        B.regeln = [R._regel_schreiben(MARKT_TOT)]
    P.lauf([] if notaus else [P.E(sz[0], sz[2])], env, d, notaus=notaus)
    B.regeln = []
    return B.n_req - n0


def _erste_notaus(si):
    """Not-Aus-Szenarien mit gleichem Markt und gleicher Richtung gestern zählen einmal."""
    sz = R.SZENARIEN[si]
    return not any(sz[:2] == R.SZENARIEN[x][:2] for x in range(si))


# ───────── Zellen ─────────
def zellen_basis(von, bis, basis="normal", haengend=False, wenige=False):
    """Einzelstörungen × Beginn (4 Zeitpunkte) × lesende Störung × Basisbedingung."""
    ws = WS + (R.SCHREIBEN_HAENGEND if haengend else [])
    lesen = R.LESEN if not wenige else [None, R.LESEN[2], R.LESEN[4], R.LESEN[5]]
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        for wi, w in enumerate(ws):
            for skip in (0, 1, 2, 3):
                for ri, r in enumerate(lesen):
                    for modus in (("bei_w", "anfang") if r is not None else ("bei_w",)):
                        akt = [a_regel(w)] + ([a_regel(r)] if (r is not None and modus == "bei_w") else [])
                        bez = dict(sz=sz, w=wi, wdef=wdef(w), skip=skip, r=ri, modus=modus, basis=basis)
                        yield bez, (lambda sz=sz, t=trig(w), skip=skip, akt=akt, r=r, modus=modus:
                                    zelle(sz, [ev(t, skip, *akt)], basis=(("fehlt",) if basis == "fehlt" else ()), haengend=haengend,
                                          lesen_anfang=(r if (r is not None and modus == "anfang") else None)))


def zellen_paare(von, bis, basis="normal", haengend=False, notaus=False):
    """ALLE geordneten Paare schreibender Störungen mit EIGENEM Beginn je Störung, dazu eine lesende Störung (keine / Perp-Liste tot / Spot-Liste tot)."""
    ws = ([WS[i] for i in (0, 1, 2, 3, 4, 5, 6, 9, 10, 11)] if notaus else [WS[i] for i in KERN_IDX]) + (R.SCHREIBEN_HAENGEND if haengend else []) + (R.SCHREIBEN_NOTAUS if notaus else [])
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        if notaus and not _erste_notaus(si):
            continue
        for i, j in itertools.permutations(range(len(ws)), 2):
            for (s1, s2) in STARTS:
                for ri, r in enumerate(LES):
                    w1, w2 = ws[i], ws[j]
                    evs = [ev(trig(w1), s1, a_regel(w1), *([a_regel(r)] if r else [])), ev(trig(w2), s2, a_regel(w2))]
                    bez = dict(sz=sz, w1=i, w2=j, s=(s1, s2), r=ri, basis=basis, w1def=wdef(w1), w2def=wdef(w2))
                    yield bez, (lambda sz=sz, evs=evs: zelle(sz, evs, basis=(("fehlt",) if basis == "fehlt" else ()), haengend=haengend, notaus=notaus))


def zellen_tripel(von, bis, basis="normal", haengend=False):
    ws = WS + (R.SCHREIBEN_HAENGEND if haengend else [])
    idx = TRIPEL_AUS if not haengend else TRIPEL_AUS + [len(WS) + 0, len(WS) + 1, len(WS) + 3]
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        for tri in itertools.combinations(idx, 3):
            for s in (0, 1):
                for ri, r in enumerate(LES):
                    evs = [ev(trig(ws[t]), s, a_regel(ws[t]), *([a_regel(r)] if (r and n == 0) else [])) for n, t in enumerate(tri)]
                    bez = dict(sz=sz, tri=tri, s=s, r=ri, basis=basis)
                    yield bez, (lambda sz=sz, evs=evs: zelle(sz, evs, basis=(("fehlt",) if basis == "fehlt" else ()), haengend=haengend))


def zellen_kurs(von, bis, haengend=False, notaus=False, schritt=1):
    """Kurssprung unmittelbar VOR der j-ten Anfrage des Tages (±4 %, ±15 %), allein und mit je einer Schreibstörung (Beginn: erste passende Anfrage)."""
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        if notaus and not _erste_notaus(si):
            continue
        n = anzahl_anfragen(sz, haengend, notaus)
        for j in range(1, n + 1, schritt):
            for fr in SPRUENGE:
                for fi, w in enumerate(KURS_FAULTS):
                    evs = [ev(None, j - 1, a_kurs(fr))] + ([ev(trig(w), 0, a_regel(w))] if w else [])
                    bez = dict(sz=sz, j=j, N=n, sprung=fr, w=fi, wdef=wdef(w) if w else None)
                    yield bez, (lambda sz=sz, evs=evs: zelle(sz, evs, haengend=haengend, notaus=notaus))


def zellen_versatz(von, bis, haengend=False, notaus=False):
    """Schreibende Störung × lesende (dauerhaft), die erst k Anfragen NACH dem Beginn der schreibenden einsetzt."""
    ws = ([WS[i] for i in KERN_IDX] if not notaus else [WS[i] for i in (0, 1, 2, 3, 4, 5, 6, 9, 10, 11)] + R.SCHREIBEN_NOTAUS) + (R.SCHREIBEN_HAENGEND if haengend else [])
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        if notaus and not _erste_notaus(si):
            continue
        for wi, w in enumerate(ws):
            for ri, r in enumerate(READS):
                for v in VERSATZ:
                    evs = [ev(trig(w), 0, a_regel(w)), ev(None, max(0, v - 1), a_regel(r), nach=0)] if v else [ev(trig(w), 0, a_regel(w), a_regel(r))]
                    bez = dict(sz=sz, w=wi, wdef=wdef(w), r=ri, versatz=v)
                    yield bez, (lambda sz=sz, evs=evs: zelle(sz, evs, haengend=haengend, notaus=notaus))


def zellen_geist(von, bis, modus):
    """Geister-Stop (E26/E27: der Perp-Stop kommt an, die Antwort geht verloren, jede Wiederholung scheitert) × neue Achsen. MODUS: tag | tag_kurs | tag_loeschen | tag_rueck | notaus | notaus_teil | notaus_kurs."""
    notaus = modus.startswith("notaus")
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        if notaus and not _erste_notaus(si):
            continue
        n = anzahl_anfragen(sz, False, notaus, geist=True) if ("kurs" in modus or modus == "tag_rueck") else 0
        for gi, g1 in enumerate(R.GEIST_ERSTE):
            for gj, g2 in enumerate(R.GEIST_ZWEITE):
                basis_ev = [ev(trig(g1), 0, a_regel(g1), a_regel(g2))]
                basis_w = {"basis": ("geist",)} if notaus else {}
                if modus in ("tag", "notaus"):
                    yield dict(sz=sz, g=(gi, gj), modus=modus), (lambda sz=sz, e=basis_ev: zelle(sz, e, notaus=notaus, **basis_w))
                elif modus in ("tag_loeschen", "notaus_teil"):
                    dritte = LOESCHEN if modus == "tag_loeschen" else TEIL
                    for hi, w3 in enumerate(dritte):
                        for s3 in (0, 1):
                            e = basis_ev + [ev(trig(w3), s3, a_regel(w3))]
                            yield dict(sz=sz, g=(gi, gj), dritte=hi, s3=s3, modus=modus), (lambda sz=sz, e=e: zelle(sz, e, notaus=notaus, **({} if modus == "notaus_teil" else basis_w)))
                elif modus == "tag_rueck":
                    rueck = ("POST", "/fapi/v1/order", lambda m, p, q: q.get("reduceOnly") == "true", "vor503", 10 ** 6)
                    for j in range(1, n + 1, 2):
                        for fr in (0.04, 0.15):
                            e = basis_ev + [ev(trig(rueck), 0, a_regel(rueck)), ev(None, j - 1, a_kurs(fr))]
                            yield dict(sz=sz, g=(gi, gj), j=j, sprung=fr, modus=modus), (lambda sz=sz, e=e: zelle(sz, e))
                elif modus in ("tag_kurs", "notaus_kurs"):
                    for j in range(1, n + 1, 2):
                        for fr in SPRUENGE:
                            e = basis_ev + [ev(None, j - 1, a_kurs(fr))]
                            yield dict(sz=sz, g=(gi, gj), j=j, sprung=fr, modus=modus), (lambda sz=sz, e=e: zelle(sz, e, notaus=notaus, **basis_w))
                else:
                    raise ValueError(modus)


def zellen_notaus_cr(haengend=False):
    """Not-Aus × cancelReplace-Störungen (auch «nur_storno_verloren») × Marktverkauf abgelehnt/tot."""
    for si, sz in enumerate(R.SZENARIEN):
        if not _erste_notaus(si):
            continue
        for w in CR:
            for skip in (0, 1, 2):
                for z in CR_ZWEITE:
                    evs = [ev(trig(w), skip, a_regel(w))] + ([ev(trig(z), 0, a_regel(z))] if z else [])
                    bez = dict(sz=sz, w=w[3] + str(w[4]), skip=skip, z=(z[1] + z[3]) if z else None)
                    yield bez, (lambda sz=sz, evs=evs: zelle(sz, evs, haengend=haengend, notaus=True))


def zellen_tripel_h(indizes):
    """Tripel schreibender Störungen auf einem Tag mit HÄNGENDEN Stop-Limits (Konto ohne STOP_LOSS)."""
    for si in indizes:
        sz = R.SZENARIEN[si]
        for tri in itertools.combinations(range(len(TRIPEL_H_AUSWAHL)), 3):
            for s in (0, 1):
                for ri, r in enumerate(LES):
                    evs = [ev(trig(TRIPEL_H_AUSWAHL[t]), s, a_regel(TRIPEL_H_AUSWAHL[t]), *([a_regel(r)] if (r and n == 0) else [])) for n, t in enumerate(tri)]
                    bez = dict(sz=sz, tri=tri, s=s, r=ri)
                    yield bez, (lambda sz=sz, evs=evs: zelle(sz, evs, haengend=True))


def _ausgabe_name(modus, von, bis, *teile):
    streng = "_streng" if P.STRENG else ""
    return str(HIER / f"pruef_raster2_{modus}{''.join('_' + t for t in teile if t)}{streng}_{von}_{bis}.json")


def main(argv):
    modus = argv[0]
    argv = list(argv)
    werte = {}
    for opt in ("--jeder", "--schritt"):   # Schalter mit Zahlenwert: nicht als Position lesen
        if opt in argv:
            i = argv.index(opt)
            werte[opt] = int(argv[i + 1])
            del argv[i:i + 2]
    schalter = {x for x in argv[1:] if x.startswith("--")}
    a = [x for x in argv[1:] if not x.startswith("--")]
    haengend, notaus = "--haengend" in schalter, "--notaus" in schalter
    if modus == "notaus_cr":
        out = a[0] if a else _ausgabe_name(modus, 0, 0)
        gen = zellen_notaus_cr(haengend)
    elif modus == "tripel_h":
        idx = [int(x) for x in a[0].split(",")]
        out = a[1] if len(a) > 1 else _ausgabe_name(modus, idx[0], idx[-1])
        gen = zellen_tripel_h(idx)
    else:
        von, bis = int(a[0]), int(a[1])
        rest = a[2:]
        if modus == "basis":
            basis = rest[0]
            out = rest[1] if len(rest) > 1 else _ausgabe_name(modus, von, bis, basis, "h" if haengend else "")
            gen = zellen_basis(von, bis, basis, haengend, "--lesen-wenige" in schalter)
        elif modus == "paare":
            basis = "fehlt" if "--basis" in schalter and "fehlt" in rest else "normal"
            rest = [x for x in rest if x != "fehlt"]
            tripel = "--tripel" in schalter
            out = rest[0] if rest else _ausgabe_name("tripel" if tripel else modus, von, bis, basis, "h" if haengend else "", "na" if notaus else "")
            gen = zellen_tripel(von, bis, basis, haengend) if tripel else zellen_paare(von, bis, basis, haengend, notaus)
        elif modus == "kurs":
            out = rest[0] if rest else _ausgabe_name(modus, von, bis, "h" if haengend else "", "na" if notaus else "")
            gen = zellen_kurs(von, bis, haengend, notaus, werte.get("--schritt", 1))
        elif modus == "versatz":
            out = rest[0] if rest else _ausgabe_name(modus, von, bis, "h" if haengend else "", "na" if notaus else "")
            gen = zellen_versatz(von, bis, haengend, notaus)
        elif modus == "geist":
            out = rest[1] if len(rest) > 1 else _ausgabe_name(modus, von, bis, rest[0])
            gen = zellen_geist(von, bis, rest[0])
        else:
            raise SystemExit(f"unbekannter Modus {modus!r} — siehe Kopf der Datei")
    if werte.get("--jeder", 1) > 1:   # Stichprobe: jede N-te Zelle (deterministisch, ab der ersten)
        gen = itertools.islice(gen, 0, None, werte["--jeder"])
    zaehler, funde = lauf_raster(gen, ausgabe=out)
    print(len(funde), "Befunde ->", out)
    return 1 if funde else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
