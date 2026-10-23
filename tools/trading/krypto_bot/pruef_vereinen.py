#!/usr/bin/env python3
"""Eigenschaftstest für pilot2_live._buch_vereinen mit DREI Schreibern (aus der 16. unabhängigen Prüfung, Oktober 2026) — reine Rechnung, keine Börse, kein Netz.

Modell: eine Börse mit Perp-Stops (algoId, Kennung); der Tageslauf (T), der Not-Aus (N) und die Nachkontrolle (K) haben je einen Speicher-Stand und die Basis (was sie zuletzt gelesen haben)
und führen zufällige Aktionen aus (neuen Stop setzen und den alten löschen oder merken, Geister-Stop mit oder ohne Ankunft, Eintrag leeren, einen sichtbaren Stop übernehmen, das Gedächtnis
prüfen, gemerkte löschen) und speichern zusammengeführt wie _buch_speichern_zusammen.

Erhaltungssatz: jeder LEBENDE Stop, den irgendein Schreiber schon gespeichert hat, steht danach als aktueller Stop oder im Gedächtnis (perp_weitere) der Datei — «kein dem Buch unbekannter
eigener Stop». Verletzt = ein Stop steht an der Börse, den nach dem Speichern niemand mehr kennt (er bliebe bei unlesbarer Liste unbekannt und zu gross stehen).

Aufruf:  python3 -B pruef_vereinen.py VON BIS     # Seeds VON..BIS-1, 40 Schritte je Folge; Ausgabe: Zahl der Verstösse + die ersten"""
from __future__ import annotations

import copy
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
import pilot2_live as L  # noqa: E402

K = "BTC"


def leer():
    b = L.leer_buch()
    b["start"], b["uid"], b["stops"] = "x", 1, {K: {}}
    return b


class Welt:
    def __init__(self, rng):
        self.rng, self.live, self.n, self.datei, self.w = rng, {}, 100, leer(), {}
        self.gespeichert = set()   # Stops (Kennung), die irgendein Schreiber gespeichert hat
        for name in "TNK":
            self.w[name] = dict(buch=copy.deepcopy(self.datei), gesehen=json.dumps(self.datei, sort_keys=True))

    def neu(self):
        self.n += 1
        return self.n, f"p2a{self.n}"

    def st(self, name):
        return self.w[name]["buch"]["stops"][K]

    def lesen(self, name):
        self.w[name]["buch"] = copy.deepcopy(self.datei)
        self.w[name]["gesehen"] = json.dumps(self.datei, sort_keys=True)

    def speichern(self, name):
        w = self.w[name]
        if json.dumps(self.datei, sort_keys=True) != w["gesehen"]:  # ein anderer hat dazwischen geschrieben: 3-Wege-Vereinigung mit dem gelesenen Stand als Basis
            neu = L._buch_vereinen(self.datei, w["buch"], json.loads(w["gesehen"]))
            L._buch_uebernehmen(w["buch"], neu)
        self.datei = copy.deepcopy(w["buch"])
        w["gesehen"] = json.dumps(self.datei, sort_keys=True)
        st = self.datei["stops"].get(K, {})
        for _aid, cid in [(st.get("perp"), st.get("perp_cid"))] + [tuple((list(x) + [None, None])[:2]) for x in st.get("perp_weitere") or []]:
            if cid:
                self.gespeichert.add(cid)

    def aktion(self, name):
        r, st = self.rng, self.st(name)
        a = r.choice(["setzen_loesche", "setzen_merke", "geist_ankunft", "geist_nie", "leeren", "pruefen", "weitere_weg", "uebernehmen"])
        if a in ("setzen_loesche", "setzen_merke"):
            alt = (st.get("perp"), st.get("perp_cid"))
            aid, cid = self.neu()
            self.live[cid] = aid
            st["perp"], st["perp_cid"] = (aid, cid) if r.random() < 0.6 else (None, cid)   # (None, Kennung): Antwort ohne algoId (nachgesehen)
            if alt != (None, None):
                if a == "setzen_loesche":
                    self.live.pop(alt[1], None)
                else:
                    L._perp_merken(st, alt[0], alt[1])
        elif a in ("geist_ankunft", "geist_nie"):
            aid, cid = self.neu()
            if a == "geist_ankunft":
                self.live[cid] = aid
            L._perp_merken(st, None, cid)
        elif a == "uebernehmen" and self.live:       # einen sichtbaren Stop zum aktuellen machen, die anderen löschen oder merken
            cid = r.choice(sorted(self.live))
            aid = self.live[cid]
            alt = (st.get("perp"), st.get("perp_cid"))
            st["perp"], st["perp_cid"] = aid, cid
            if alt != (None, None) and alt[1] != cid:
                if r.random() < 0.5:
                    self.live.pop(alt[1], None)
                else:
                    L._perp_merken(st, alt[0], alt[1])
        elif a == "leeren":
            if st.get("perp_cid"):
                self.live.pop(st["perp_cid"], None)
            st["perp"] = st["perp_cid"] = None
        elif a == "pruefen":      # _perp_weitere_pruefen mit der aktuellen (sichtbaren) Liste
            L._perp_weitere_pruefen(st, [{"algoId": aid, "clientAlgoId": cid} for cid, aid in self.live.items()])
        elif a == "weitere_weg":  # alle gemerkten über die Kennung löschen
            for x in list(st.get("perp_weitere") or []):
                aid, cid = (list(x) + [None, None])[:2]
                if not L._ist_aktuell(st, aid, cid):
                    self.live.pop(cid, None)
            st["perp_weitere"] = None

    def unbekannt(self):
        st = self.datei["stops"].get(K, {})
        bek = {st.get("perp_cid")} | {(list(x) + [None, None])[1] for x in st.get("perp_weitere") or []}
        return [c for c in self.live if c in self.gespeichert and c not in bek]


def lauf(seed, schritte=40):
    """→ None (Erhaltungssatz hält) oder (seed, Schritt, [unbekannte Kennungen], Spur)."""
    rng = random.Random(seed)
    w = Welt(rng)
    spur = []
    for i in range(schritte):
        name = rng.choice("TNK")
        op = rng.choice(["lesen", "aktion", "aktion", "aktion", "speichern", "speichern"])
        if op == "lesen":
            w.lesen(name)
        elif op == "aktion":
            w.aktion(name)
        else:
            w.speichern(name)
        spur.append((name, op))
        u = w.unbekannt()
        if u and op == "speichern":
            return seed, i, u, spur
    return None


if __name__ == "__main__":
    von, bis = int(sys.argv[1]), int(sys.argv[2])
    schlecht = [r for r in (lauf(sd) for sd in range(von, bis)) if r]
    print(f"Seeds {von}..{bis - 1}: {len(schlecht)} Verstösse", [r[:3] for r in schlecht[:3]])
    sys.exit(1 if schlecht else 0)
