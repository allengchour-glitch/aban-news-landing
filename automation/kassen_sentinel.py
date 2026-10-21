#!/usr/bin/env python3
"""kassen_sentinel.py — hat jede Sorte Ware an der Kasse einen Versandtarif? (21.10.2026)

ANLASS: Stufe 2 des Druck-Profils (20.10. 02:14 UTC) legte Hoodie + Jutebeutel «selbst gestalten» in ein Profil, dessen Standortblock nur
«Shop location» kennt, während ihr Bestand am Fulfillment-Standort «Printful» liegt → `draftOrderCalculate` lieferte KEINEN Tarif, Kundinnen
kamen nicht zur Zahlung (~25 h, unbemerkt). Gefunden wurde es nur, weil die Korb-Matrix des Druck-Profils crashte. Eine Zufallsstichprobe
über den Katalog (150 Produkte, 21.10.) findet so etwas NICHT: 148 von 150 liegen im General profile am «Shop location». Die Fehler wohnen in
SELTENEN SCHICHTEN — deshalb schichtet dieser Wächter:

  Schicht «Standort: <Name>»  je Standort (auch Fulfillment-Standorte, `includeLegacy`): bis K_ORT aktive, kaufbare Varianten mit Bestand dort
  Schicht «Profil: <Name>»    je Versandprofil ausser dem Standardprofil: bis K_PROFIL aktive, kaufbare Varianten aus den Profil-Produkten
  Schicht «Neueste»           die jüngsten aktiven Produkte (frische Importe)

Je Variante ein Warenkorb nach CH und nach LI (`ch_lager_profil.korb`): leere Tarifliste = Befund. Ein Rechenfehler (Zwischensumme None) ist
«unklar», nie «in Ordnung». Erwartete Lücken (z. B. ein Profil, das bewusst nicht nach LI liefert) stehen in `dropship/_kassen_sentinel_erlaubt.json`
{"Schicht-Name": ["CH"|"LI", …]} und lösen keinen Alarm aus — NEUE Lücken schon.

  python3 automation/kassen_sentinel.py              Lauf (Shopify lesen, Warenkörbe rechnen, Stand schreiben, Exit 1 bei Befund)
  python3 automation/kassen_sentinel.py --selbsttest
  python3 automation/kassen_sentinel.py --zeile      Ampelzeile aus dem Stand (leer = in Ordnung)
"""
import datetime as dt
import json
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
STAND = os.path.join(REPO, "dropship", "_kassen_sentinel.json")
ERLAUBT = os.path.join(REPO, "dropship", "_kassen_sentinel_erlaubt.json")
K_ORT = 4
K_PROFIL = 3
K_NEUESTE = 4
LAENDER = ("CH", "LI")
ALT_TAGE = 2.0


def waehle(kandidaten, k):
    """Kandidaten = [(variant_id, produkt_id, aktiv, kaufbar)] → bis k Varianten verschiedener Produkte, nur aktiv UND kaufbar."""
    aus, produkte = [], set()
    for vid, pid, aktiv, kaufbar in kandidaten:
        if not (vid and aktiv and kaufbar) or pid in produkte:
            continue
        produkte.add(pid)
        aus.append(vid)
        if len(aus) >= k:
            break
    return aus


def urteil(proben, erlaubt=()):
    """proben = [{"handle", "vid", "n": {"CH": int|None, "LI": int|None}}] → (ohne_tarif[(handle, land)], unklar[(handle, land)]).
    n == 0 = leere Tarifliste (Befund, ausser das Land ist erlaubt); n is None = Rechenfehler (unklar)."""
    ohne, unklar = [], []
    for p in proben:
        for land in LAENDER:
            n = (p.get("n") or {}).get(land)
            if n is None:
                unklar.append((p["handle"], land))
            elif n == 0 and land not in erlaubt:
                ohne.append((p["handle"], land))
    return ohne, unklar


def schichten_laden(gql):
    """→ [(Name, [(vid, handle)])] — Standorte, Nicht-Standard-Profile, Neueste."""
    out = []
    q_ort = ('query($id:ID!){location(id:$id){inventoryLevels(first:40){nodes{item{variant{id availableForSale '
             'product{id handle status}}}}}}}')
    orte = gql('{locations(first:50,includeInactive:true,includeLegacy:true){nodes{id name isActive}}}')["locations"]["nodes"]
    for o in orte:
        if not o.get("isActive"):
            continue
        nodes = gql(q_ort, {"id": o["id"]})["location"]["inventoryLevels"]["nodes"]
        kand, namen = [], {}
        for n in nodes:
            v = (n.get("item") or {}).get("variant")
            if not v:
                continue
            p = v["product"]
            kand.append((v["id"], p["id"], p["status"] == "ACTIVE", bool(v["availableForSale"])))
            namen[v["id"]] = p["handle"]
        vids = waehle(kand, K_ORT)
        if vids:
            out.append((f"Standort: {o['name']}", [(v, namen[v]) for v in vids]))
    q_prof = ('query($c:String){deliveryProfiles(first:50,after:$c){pageInfo{hasNextPage endCursor} nodes{id name default '
              'profileItems(first:12){nodes{product{id handle status} variants(first:3){nodes{id availableForSale}}}}}}}')
    cur = None
    while True:
        d = gql(q_prof, {"c": cur})["deliveryProfiles"]
        for pr in d["nodes"]:
            if pr.get("default"):
                continue
            kand, namen = [], {}
            for it in pr["profileItems"]["nodes"]:
                p = it["product"]
                for v in it["variants"]["nodes"]:
                    kand.append((v["id"], p["id"], p["status"] == "ACTIVE", bool(v["availableForSale"])))
                    namen[v["id"]] = p["handle"]
            vids = waehle(kand, K_PROFIL)
            if vids:
                out.append((f"Profil: {pr['name']}", [(v, namen[v]) for v in vids]))
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    neu = gql('{products(first:12,sortKey:CREATED_AT,reverse:true,query:"status:active"){nodes{id handle status '
              'variants(first:1){nodes{id availableForSale}}}}}')["products"]["nodes"]
    kand, namen = [], {}
    for p in neu:
        for v in p["variants"]["nodes"]:
            kand.append((v["id"], p["id"], p["status"] == "ACTIVE", bool(v["availableForSale"])))
            namen[v["id"]] = p["handle"]
    vids = waehle(kand, K_NEUESTE)
    if vids:
        out.append(("Neueste", [(v, namen[v]) for v in vids]))
    return out


def erlaubt_lesen(pfad=None):
    try:
        d = json.load(open(pfad or ERLAUBT, encoding="utf-8"))
        return {k: list(v) for k, v in d.items() if not k.startswith("_")}
    except Exception:  # noqa: BLE001
        return {}


def lauf():
    from ch_lager_profil import gql, korb
    schichten = schichten_laden(gql)
    erl = erlaubt_lesen()
    stand = {"stand": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "schichten": {}, "befunde": [], "unklar": []}
    for name, varianten in schichten:
        proben = []
        for vid, handle in varianten:
            n = {}
            for land in LAENDER:
                try:
                    sub, rates = korb([vid], land)
                    n[land] = None if sub is None else len(rates)
                except Exception:  # noqa: BLE001
                    n[land] = None
            proben.append({"handle": handle, "vid": vid.rsplit("/", 1)[-1], "n": n})
        ohne, unklar = urteil(proben, erl.get(name, ()))
        stand["schichten"][name] = {"proben": len(proben), "ohne_tarif": [f"{h} ({l})" for h, l in ohne],
                                    "unklar": len(unklar)}
        stand["befunde"] += [f"{name}: {h} ohne Tarif {l}" for h, l in ohne]
        stand["unklar"] += [f"{name}: {h} {l}" for h, l in unklar]
        print(f"  {'✗' if ohne else '✓'} {name}: {len(proben)} Varianten · ohne Tarif {len(ohne)} · unklar {len(unklar)}", flush=True)
    tmp = STAND + ".tmp"
    json.dump(stand, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)
    print(f"KASSEN-SENTINEL: {len(schichten)} Schichten · {sum(s['proben'] for s in stand['schichten'].values())} Varianten × {len(LAENDER)} Länder · "
          f"Befunde {len(stand['befunde'])} · unklar {len(stand['unklar'])}", flush=True)
    for b in stand["befunde"][:12]:
        print(f"  ⚠️ {b}", flush=True)
    return 1 if stand["befunde"] else 0


def zeile(pfad=None, jetzt=None):
    """Ampelzeile aus dem Stand; None = in Ordnung. Fehlender/alter/unlesbarer Stand ist 'unklar', nie 'in Ordnung'."""
    pfad = pfad or STAND
    jetzt = jetzt or dt.datetime.now(dt.timezone.utc)
    try:
        d = json.load(open(pfad, encoding="utf-8"))
        t = dt.datetime.strptime(d["stand"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    except Exception as e:  # noqa: BLE001
        return f"⚠️ KASSEN-SENTINEL: kein lesbarer Stand ({type(e).__name__}) — Wächter lief nie oder ist gestorben (automation/kassen_sentinel.py)"
    teile = []
    if d.get("befunde"):
        teile.append(f"{len(d['befunde'])} Variante(n) OHNE Versandtarif an der Kasse — Kundinnen können nicht zahlen: " + "; ".join(d["befunde"][:3]))
    if not d.get("schichten"):
        teile.append("keine Schicht geprüft")
    alter = (jetzt - t).total_seconds() / 86400.0
    if alter > ALT_TAGE:
        teile.append(f"Stand {int(alter)} Tage alt")
    return ("⚠️ KASSEN-SENTINEL: " + " · ".join(teile)) if teile else None


def selbsttest():
    import tempfile
    f = []

    def ok(n, b): f.append((n, bool(b)))
    gut = lambda h, ch=1, li=1: {"handle": h, "vid": "v", "n": {"CH": ch, "LI": li}}   # noqa: E731
    ok("Auswahl: nur aktiv UND kaufbar, ein Produkt nur einmal, höchstens k",
       waehle([("a", "p1", True, True), ("b", "p1", True, True), ("c", "p2", False, True), ("d", "p3", True, False),
               ("e", "p4", True, True), ("f", "p5", True, True)], 2) == ["a", "e"])
    ok("Auswahl: leer → leer", waehle([], 3) == [])
    ok("alles mit Tarif → kein Befund", urteil([gut("x"), gut("y", 2, 1)]) == ([], []))
    ok("leere Tarifliste CH → Befund", urteil([gut("x", 0, 1)]) == ([("x", "CH")], []))
    ok("leere Tarifliste LI → Befund", urteil([gut("x", 1, 0)]) == ([("x", "LI")], []))
    ok("beide leer → zwei Befunde", urteil([gut("x", 0, 0)])[0] == [("x", "CH"), ("x", "LI")])
    ok("Rechenfehler (None) ist unklar, kein Befund", urteil([gut("x", None, 1)]) == ([], [("x", "CH")]))
    ok("erlaubte Lücke LI löst keinen Alarm aus", urteil([gut("x", 1, 0)], ("LI",)) == ([], []))
    ok("erlaubte Lücke gilt nur für ihr Land", urteil([gut("x", 0, 0)], ("LI",))[0] == [("x", "CH")])
    jetzt = dt.datetime(2026, 10, 21, 8, 0, tzinfo=dt.timezone.utc)
    with tempfile.TemporaryDirectory() as dd:
        p = os.path.join(dd, "s.json")
        ok("fehlender Stand → Warnung", (zeile(os.path.join(dd, "x.json"), jetzt) or "").startswith("⚠️ KASSEN-SENTINEL: kein lesbarer Stand"))

        def schreibe(**kw):
            d = {"stand": "2026-10-21T06:00:00Z", "schichten": {"Neueste": {"proben": 4}}, "befunde": [], "unklar": []}
            d.update(kw)
            json.dump(d, open(p, "w"))
        schreibe()
        ok("frisch und sauber → None", zeile(p, jetzt) is None)
        schreibe(befunde=["Standort: Printful: hoodie ohne Tarif CH"])
        z = zeile(p, jetzt) or ""
        ok("Befund → Warnung mit Handle", "OHNE Versandtarif" in z and "hoodie" in z)
        schreibe(stand="2026-10-17T06:00:00Z")
        ok("Stand 4 Tage alt → Warnung", "4 Tage alt" in (zeile(p, jetzt) or ""))
        schreibe(stand="2026-10-19T08:00:00Z")
        ok("genau 2,0 Tage → noch in Ordnung", zeile(p, jetzt) is None)
        schreibe(schichten={})
        ok("keine Schicht geprüft → Warnung (leerer Lauf ist kein grüner Lauf)", "keine Schicht" in (zeile(p, jetzt) or ""))
        open(p, "w").write("{kaputt")
        ok("kaputter Stand → Warnung", zeile(p, jetzt) is not None)
        e = os.path.join(dd, "e.json")
        json.dump({"_hinweis": "x", "Profil: A": ["LI"]}, open(e, "w"))
        ok("Erlaubt-Datei: Schlüssel mit Unterstrich sind Kommentare", erlaubt_lesen(e) == {"Profil: A": ["LI"]})
        ok("Erlaubt-Datei fehlt → leer", erlaubt_lesen(os.path.join(dd, "nix.json")) == {})
    # schichten_laden gegen eine falsche gql: Standort mit Levels, Profil mit Items, Standardprofil wird übersprungen
    def gql_falsch(q, v=None):
        if "locations(" in q:
            return {"locations": {"nodes": [{"id": "L1", "name": "Printful", "isActive": True}, {"id": "L2", "name": "Alt", "isActive": False}]}}
        if "inventoryLevels" in q:
            lv = [{"item": {"variant": {"id": f"gid://v/{i}", "availableForSale": True, "product": {"id": f"p{i}", "handle": f"h{i}", "status": "ACTIVE"}}}}
                  for i in range(6)]
            return {"location": {"inventoryLevels": {"nodes": lv}}}
        if "deliveryProfiles" in q:
            return {"deliveryProfiles": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": [
                {"id": "D0", "name": "General profile", "default": True, "profileItems": {"nodes": []}},
                {"id": "D1", "name": "Druck", "default": False, "profileItems": {"nodes": [
                    {"product": {"id": "q1", "handle": "druck1", "status": "ACTIVE"}, "variants": {"nodes": [{"id": "gid://v/q1", "availableForSale": True}]}}]}}]}}
        return {"products": {"nodes": [{"id": "n1", "handle": "neu1", "status": "ACTIVE", "variants": {"nodes": [{"id": "gid://v/n1", "availableForSale": True}]}}]}}
    sch = dict((n, v) for n, v in schichten_laden(gql_falsch))
    ok("Schichten: Standort mit K_ORT Varianten, inaktiver Standort fehlt", len(sch.get("Standort: Printful", [])) == K_ORT and "Standort: Alt" not in sch)
    ok("Schichten: Nicht-Standard-Profil drin, Standardprofil nicht", "Profil: Druck" in sch and "Profil: General profile" not in sch)
    ok("Schichten: Neueste drin", sch.get("Neueste") == [("gid://v/n1", "neu1")])
    # Gesamtlauf gegen eine falsche Kasse: Variante v/0 bekommt in CH keinen Tarif → lauf() muss Exit 1, Stand mit Befund, Ampelzeile liefern
    import contextlib
    import io
    import types
    global STAND
    alt_stand, alt_modul = STAND, sys.modules.get("ch_lager_profil")
    with tempfile.TemporaryDirectory() as dd:
        STAND = os.path.join(dd, "stand.json")
        sys.modules["ch_lager_profil"] = types.SimpleNamespace(
            gql=gql_falsch,
            korb=lambda zeilen, land: (10.0, []) if (zeilen[0].endswith("/0") and land == "CH") else (10.0, [(7.0, "Standard")]))
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                rc = lauf()
            d = json.load(open(STAND))
            ok("Gesamtlauf: fehlender CH-Tarif → Exit 1", rc == 1)
            ok("Gesamtlauf: Befund nennt Schicht, Produkt und Land", any("h0 ohne Tarif CH" in b and b.startswith("Standort: Printful") for b in d["befunde"]))
            ok("Gesamtlauf: nur dieser eine Befund", len(d["befunde"]) == 1)
            ok("Gesamtlauf → Ampelzeile warnt", "OHNE Versandtarif" in (zeile(STAND, dt.datetime.now(dt.timezone.utc)) or ""))
            sys.modules["ch_lager_profil"].korb = lambda zeilen, land: (10.0, [(7.0, "Standard")])
            with contextlib.redirect_stdout(io.StringIO()):
                rc2 = lauf()
            ok("Gesamtlauf mit funktionierender Kasse → Exit 0", rc2 == 0 and zeile(STAND, dt.datetime.now(dt.timezone.utc)) is None)
        finally:
            STAND = alt_stand
            if alt_modul is not None:
                sys.modules["ch_lager_profil"] = alt_modul
            else:
                sys.modules.pop("ch_lager_profil", None)
    for n, b in f:
        print(("  ok   " if b else "  FEHL ") + n)
    return 0 if all(b for _, b in f) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile() or "")
        sys.exit(0)
    t0 = time.time()
    rc = lauf()
    print(f"({time.time() - t0:.0f} s)", flush=True)
    sys.exit(rc)
