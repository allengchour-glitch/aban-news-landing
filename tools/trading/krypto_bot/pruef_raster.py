#!/usr/bin/env python3
"""Deterministischer Ausfall-Raster für Pilot 2.0 (aus der 15. unabhängigen Prüfung, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1.

Die Zufalls-Fuzzer (pruef_fuzzer.py) fanden den Befund G1 der 15. Prüfung nicht: er braucht eine ganz bestimmte Folge — das Löschen der alten
Perp-Stops scheitert nach dem Setzen des neuen UND danach ist die Perp-Liste unlesbar. Der Raster zählt solche Kopplungen systematisch durch:

  Tag 0 baut eine Lage (Markt, Richtung z0), Tag 1 läuft mit ZWEI gekoppelten Störungen:
    W = eine SCHREIBENDE Störung (Löschen/Setzen/Ersetzen/Markt), die ab dem (skip+1)-ten passenden Request wirkt,
    R = eine LESE-Störung (Liste/Konto/Position/Kurs), die ab demselben Zeitpunkt («bei_w») oder ab Tagesbeginn («anfang») wirkt.
  Gemessen wird nach dem Lauf, nach verspätet ankommenden Aufträgen + Nachkontrolle (Störungen AUS) und nach einem Kurssprung.

Befunde (jeder ist ein Fehler):
  NACH_NK                    nach dem Lauf + der ungestörten Nachkontrolle bleibt etwas ohne Stop (Selbstheilung fehlt)
  NACH_LAUF_STILL            direkt nach dem Lauf ohne Stop und der Lauf warnte nicht
  NACH_LAUF_LAUT_OHNE_NK     direkt nach dem Lauf ohne Stop, der Lauf warnte, die Nachkontrolle tat aber nichts
  UNBEKANNT_NACH_LAUF        an der Börse steht ein eigener Perp-Stop (Kennung p2a…), den das Buch weder als aktuellen Stop noch in seinem
                             Gedächtnis (perp_weitere) kennt, und er ist sichtbar (Erhaltungssatz «kein vergessener Stop»)
  UNBEKANNT_NACH_NK          dasselbe nach der Nachkontrolle — dann kennt ihn niemand mehr
  AUSNAHME                   der Lauf warf eine Ausnahme nach aussen

Aufruf (PRUEF_STRENG=1 für die strenge Prüf-Börse):
  python3 -B pruef_raster.py VON BIS [AUSGABE.json]     # Szenario-Index VON..BIS-1 (12 Szenarien; je Szenario 12 × 4 × 15 Fälle)
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


def _regel_schreiben(t):
    m, pfad, pred, art, n = t
    r = dict(methode=m, pfad=pfad, pred=pred, art=art, anzahl=n, anzahl0=n)
    if art == "unsichtbar":
        r["listen"] = 12
    return r


def _regel_lesen(t):
    m, pfad, art, n = t
    return dict(methode=m, pfad=pfad, pred=None, art=art, anzahl=n, anzahl0=n)


def _befunde(k, d):
    return P.echte(P.schutz_befunde(k, P.unklar_je_markt(d)) + P.folgeschaden(k))


def fall(sz, w, skip, r, modus):
    """Ein Fall → None (die Störung kam nie zum Zug) oder die Messung."""
    markt, z0, z1 = sz
    k = P.neues_konto(20000)
    d = P.neu_buch()
    env = P.env_echt(kapital=20000)
    P.lauf([P.E(markt, z0)], env, d)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    st = {"n": 0, "an": False}
    wm, wp, wpred = w[0], w[1], w[2]
    B.regeln = [_regel_lesen(r)] if (r is not None and modus == "anfang") else []

    def haken(m, pfad, p):
        if m == wm and pfad == wp and (wpred is None or wpred(m, pfad, p)):
            st["n"] += 1
            if st["n"] == skip + 1 and not st["an"]:
                st["an"] = True
                B.regeln.append(_regel_schreiben(w))
                if r is not None and modus == "bei_w":
                    B.regeln.append(_regel_lesen(r))
    B.vor_jeder_anfrage = haken
    try:
        res = P.lauf([P.E(markt, z1)], env, d)
    finally:
        B.vor_jeder_anfrage = None
        B.regeln = []
    if not st["an"]:
        return None
    nach_lauf = _befunde(k, d)
    unbekannt_lauf = [u for u in unbekannte(k, d) if not u[2]]
    laut = bool(res.get("warnung"))
    P.pending_abarbeiten()
    B.n_listen += 1000  # 10 Minuten später zeigen die Listen jeden Auftrag
    rn = P.nachkontrolle(env, d)
    nach_nk = _befunde(k, d)
    unbekannt_nk = unbekannte(k, d)
    return {"nach_lauf": [(x[0], x[-2:] if len(x) > 2 else None) for x in nach_lauf][:3], "nach_nk": [(x[0], x[-2:]) for x in nach_nk][:3],
            "unbekannt_lauf": unbekannt_lauf[:3], "unbekannt_nk": unbekannt_nk[:3],
            "laut": laut, "nk_tat_etwas": bool(rn.get("zeilen")), "zeilen": [z[:150] for z in res["zeilen"] if "⚠" in z][:3]}


def klasse(e):
    """Befundart einer Messung aus fall() (siehe oben) — None = sauber. Die Reihenfolge ist der Rang: der schwerste Befund zuerst."""
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


def raster(von, bis, ausgabe=None, melde=print):
    """Szenarien von..bis-1 durchzählen → (Zähler, Funde)."""
    zaehler, funde = Counter(), []
    for si in range(von, min(bis, len(SZENARIEN))):
        sz = SZENARIEN[si]
        for wi, w in enumerate(SCHREIBEN):
            for skip in (0, 1, 2, 3):
                for ri, r in enumerate(LESEN):
                    for modus in (("bei_w", "anfang") if r is not None else ("bei_w",)):
                        try:
                            e = fall(sz, w, skip, r, modus)
                        except Exception:  # noqa: BLE001
                            B.vor_jeder_anfrage = None
                            B.regeln = []
                            zaehler["AUSNAHME"] += 1
                            funde.append(dict(sz=sz, w=wi, skip=skip, r=ri, modus=modus, art="AUSNAHME", fehler=traceback.format_exc()[-600:]))
                            continue
                        if e is None:
                            zaehler["nicht_ausgeloest"] += 1
                            continue
                        zaehler["lauf"] += 1
                        art = klasse(e)
                        if art:
                            zaehler[art] += 1
                            funde.append(dict(sz=sz, w=wi, skip=skip, r=ri, modus=modus, art=art, **e))
    melde(dict(zaehler))
    if ausgabe:
        with open(ausgabe, "w", encoding="utf-8") as f:
            json.dump(funde, f, indent=1, default=str, ensure_ascii=False)
    return zaehler, funde


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    von, bis = int(argv[0]), int(argv[1])
    ausgabe = argv[2] if len(argv) > 2 else f"pruef_raster{'_streng' if P.STRENG else ''}_{von}_{bis}.json"
    zaehler, funde = raster(von, bis, ausgabe)
    echte = [f for f in funde if f["art"] != "UNBEKANNT_NACH_LAUF"]
    print(f"{len(funde)} Befunde ({len(echte)} ohne UNBEKANNT_NACH_LAUF) → {ausgabe}")
    return 1 if funde else 0


if __name__ == "__main__":
    sys.exit(main())
