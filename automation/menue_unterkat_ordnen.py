#!/usr/bin/env python3
"""menue_unterkat_ordnen.py — Menü-Unterpunkte nach Relevanz ordnen und vorhandene Fachkollektionen als 3. Ebene einhängen (22.10.2026).

ANLASS (Betreiber-Screenshot der App «Elektronik & Technik», 22.10.): «so viele Produkte — kann man besser filtern oder Unterkategorien
erstellen?». GEMESSEN: Die App-Chips sind die Menü-Unterpunkte; unter «Technik & Gaming» standen «Lifestyle & Trends» (2'641 Produkte)
und «Elektronik-Kleinteile» vor den starken Gruppen, und 20+ fertige Fachkollektionen (Powerbanks 347, Lautsprecher 236, Mikrofone 286,
Tastaturen & Mäuse 296, Controller 216, Drohnen & FPV 305 …) hatten KEINEN Menüplatz — sie existierten nur für die Suche.

Je Menüpunkt (Titel) im PLAN:
  reihenfolge  Handles in Sollreihenfolge; nicht genannte Unterpunkte folgen danach in alter Reihenfolge
  einhaengen   (Titel, Handle, Eltern-Handle): neuer Eintrag UNTER dem Eltern-Unterpunkt (3. Ebene) bzw. Eltern-Handle = None → 2. Ebene am Ende

Bedingungen je neuem Eintrag (sonst übersprungen und gemeldet, nichts wird veröffentlicht): ≥ MIN_AKTIV aktive Produkte, veröffentlicht im
Onlineshop UND im Headless-Kanal (sonst Link ins Leere bzw. «Kategorie nicht gefunden» in der App), noch nicht im Menü.

  python3 automation/menue_unterkat_ordnen.py              # DRY: zeigt Reihenfolge und Neuzugänge
  SCHARF=1 python3 automation/menue_unterkat_ordnen.py     # Sicherung nach dropship/, menuUpdate, Rücklesen (verlorene IDs, Reihenfolge)
  python3 automation/menue_unterkat_ordnen.py --selbsttest
  python3 automation/menue_unterkat_ordnen.py --zurueck DATEI   # Menü aus einer Sicherung wiederherstellen
"""
import json
import os
import sys
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
REPO = os.path.dirname(HIER)
SCHARF = os.environ.get("SCHARF") == "1"
MIN_AKTIV = int(os.environ.get("MIN_AKTIV", "30"))
ONLINESHOP = "gid://shopify/Publication/301970915713"
HEADLESS = "gid://shopify/Publication/391626359175"

PLAN = {
    "Technik & Gaming": {
        # Relevanz statt Zufall: starke Fachgruppen zuerst, Sammel-/Randgruppen zuletzt («Lifestyle & Trends» ist keine Elektronik)
        "reihenfolge": ["elektronik-technik", "smartwatches-wearables", "kopfhoerer-audio", "elektronik-laden", "handy-zubehoer", "kabel-adapter",
                        "gaming", "drohnen-kameras", "beamer-heimkino", "pc-homeoffice", "buro-home-office", "smart-home-gadgets",
                        "usb-sticks", "auto-kfz-zubehoer", "elektronik-kleinteile", "trends-gadgets"],
        "einhaengen": [
            ("Uhrenarmbänder & Smartwatch-Armbänder", "uhrenarmbaender", "smartwatches-wearables"),
            ("Lautsprecher & Boxen", "lautsprecher", "kopfhoerer-audio"),
            ("Mikrofone & Streaming", "mikrofone", "kopfhoerer-audio"),
            ("Powerbanks", "handy-powerbanks", "handy-zubehoer"),
            ("Halterungen & MagSafe", "handy-halterungen", "handy-zubehoer"),
            ("Handyhüllen & Cases", "handy-huellen", "handy-zubehoer"),
            ("Controller & Gamepads", "gaming-controller", "gaming"),
            ("PC-Gaming", "pc-gaming", "gaming"),
            ("Gaming-Mäuse", "gaming-maeuse", "gaming"),
            ("Retro & Handheld-Gaming", "retro-handheld", "gaming"),
            ("Drohnen & FPV", "drohnen-fpv", "drohnen-kameras"),
            ("Foto & Video", "foto-tech", "drohnen-kameras"),
            ("Tastaturen & Mäuse", "tastatur-maus", "pc-homeoffice"),
            ("Laptop- & Tablet-Zubehör", "laptop-tablet-zubehoer", "pc-homeoffice"),
            ("PC-Komponenten & Speicher", "pc-komponenten", "pc-homeoffice"),
            ("Netzwerk & WLAN", "netzwerk-router", "pc-homeoffice"),
            ("Smart Home & smarte Gadgets", "smart-home-gadgets", None),
        ],
    },
    # Datengestützt aus dropship/UNTERKATEGORIEN-ABDECKUNG.md (Kandidaten = bestehende Kollektionen, die Lücken-Produkte abdecken)
    "Schmuck & Uhren": {
        "reihenfolge": ["premium-schmuck", "uhren", "sub-armbaender", "sub-ringe", "sub-halsketten", "sub-ohrringe", "schmuck-sets", "sonnenbrillen-alle"],
        "einhaengen": [   # 462 der Produkte ohne Unterkollektion sind Smartwatches; unter «Uhren» gruppiert
            ("Smartwatches & Wearables", "smartwatches-wearables", "uhren"),
            ("Herrenuhren", "uhren-herren", "uhren"),
            ("Damenuhren", "uhren-damen", "uhren"),
            ("Uhrenarmbänder & Smartwatch-Armbänder", "uhrenarmbaender", "uhren"),
            ("Chronographen & Automatik", "chronographen-automatik", "uhren"),
        ],
    },
    "Beauty & Pflege": {
        "reihenfolge": ["beauty-pflege", "make-up", "hautpflege-skincare", "beauty-haar", "haarstyling-geraete", "naegel-manikuere", "wimpern-lashes", "parfum-duefte"],
        "einhaengen": [   # Diffuser/Luftbefeuchter/Geräte liegen in der Kategorie, hatten aber keinen Chip
            ("Beauty-Geräte & Haarentfernung", "beauty-geraete", None),
            ("Gesichtspflege-Geräte", "gesichtspflege-geraete", None),
            ("Aroma & Diffuser", "sub-aroma-diffuser", None),
            ("Luftbefeuchter", "luftbefeuchter", None),
            ("Schminkspiegel", "schminkspiegel", None),
        ],
    },
    "Kinder & Haustier": {
        "reihenfolge": [],
        "einhaengen": [("Geschenke für Kinder", "geschenke-fuer-kinder", None)],
    },
    "Sport & Party": {
        "reihenfolge": [],
        "einhaengen": [("Velo & Radsport", "velo-radsport", None)],
    },
}


def handle_von(i):
    u = (i.get("url") or "")
    return u.split("/collections/", 1)[1].split("?")[0].strip("/") if "/collections/" in u else None


def neu_ordnen(items, reihenfolge):
    """Sortiert die Geschwister nach `reihenfolge` (Handles); Unbekannte behalten ihre relative Reihenfolge und folgen danach."""
    pos = {h: n for n, h in enumerate(reihenfolge)}
    return sorted(items, key=lambda i: (pos.get(handle_von(i), len(pos)),))


def einhaengen(items, titel, handle, eltern):
    """Hängt «titel» unter den Unterpunkt mit Handle `eltern` (3. Ebene, ans Ende der Enkel) bzw. ans Ende von `items`. Gibt True zurück, wenn gesetzt."""
    eintrag = {"title": titel, "type": "HTTP", "url": f"/collections/{handle}", "items": []}
    if eltern is None:
        items.append(eintrag)
        return True
    for i in items:
        if handle_von(i) == eltern:
            i.setdefault("items", []).append(eintrag)
            return True
    return False


def alle_handles(items, acc=None):
    acc = set() if acc is None else acc
    for i in items:
        h = handle_von(i)
        if h:
            acc.add(h)
        alle_handles(i.get("items") or [], acc)
    return acc


def pruefe_ziel(gql, handle):
    c = gql('query($h:String!){collectionByHandle(handle:$h){id publishedOnPublication(publicationId:"%s") hl: publishedOnPublication(publicationId:"%s")}}' % (ONLINESHOP, HEADLESS),
            {"h": handle})["collectionByHandle"]
    if not c:
        return None, "Kollektion fehlt"
    n = gql('query($q:String!){productsCount(query:$q, limit:null){count}}', {"q": f"collection_id:{c['id'].split('/')[-1]} status:active"})["productsCount"]["count"]
    if n < MIN_AKTIV:
        return n, f"nur {n} aktive"
    if not c["publishedOnPublication"]:
        return n, "nicht im Onlineshop veröffentlicht"
    if not c["hl"]:
        return n, "nicht im Headless-Kanal (App)"
    return n, None


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        I = lambda h: {"title": h, "url": f"/collections/{h}", "items": []}
        a = m.neu_ordnen([I("c"), I("x"), I("a"), I("y"), I("b")], ["a", "b", "c"])
        if [m.handle_von(i) for i in a] != ["a", "b", "c", "x", "y"]:
            f.append(f"A Reihenfolge {[m.handle_von(i) for i in a]}")
        items = [I("p"), I("q")]
        if not m.einhaengen(items, "Neu", "n1", "q") or m.handle_von(items[1]["items"][0]) != "n1" or items[0]["items"]:
            f.append("B 3. Ebene unter dem falschen Eltern-Punkt")
        if m.einhaengen(items, "Neu2", "n2", "gibtsnicht") or len(items) != 2:
            f.append("C unbekannter Eltern-Punkt darf nichts einhängen")
        if not m.einhaengen(items, "Neu3", "n3", None) or m.handle_von(items[-1]) != "n3":
            f.append("D Eltern=None soll ans Ende der 2. Ebene")
        if m.alle_handles(items) != {"p", "q", "n1", "n3"}:
            f.append(f"E alle_handles {m.alle_handles(items)}")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Sortierung kehrt um", "key=lambda i: (pos.get(handle_von(i), len(" + "pos)),)", "key=lambda i: (-pos.get(handle_von(i), len(pos)),)"),
           ("falscher Eltern-Vergleich", "if handle_von(i) == " + "eltern:", "if handle_von(i) != eltern:"),
           ("3. Ebene wird 2. Ebene", "i.setdefault(\"items\", []).append(" + "eintrag)", "items.append(eintrag)")]
    erkannt = 0
    for name, alt, neu in mut:
        if quelle.count(alt) != 1:
            fehler.append(f"Mutant «{name}»: Stelle {quelle.count(alt)}× (soll 1×)")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu), "mutant", "exec"), m.__dict__)
        try:
            if faelle(m):
                erkannt += 1
            else:
                fehler.append(f"Mutant «{name}» NICHT erkannt")
        except Exception:
            erkannt += 1
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 5 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


def main():
    from kollektion_accessoires_fix import _menu_lesen, _als_input, _zaehle_items, gql
    if "--zurueck" in sys.argv:
        sich = json.load(open(sys.argv[sys.argv.index("--zurueck") + 1], encoding="utf-8"))
        r = gql('mutation($id:ID!,$t:String!,$h:String,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$items){menu{id} userErrors{field message}}}',
                {"id": sich["id"], "t": sich["title"], "h": sich["handle"], "items": _als_input(sich["items"])})["menuUpdate"]
        print("ZURÜCK:", r["userErrors"] or "ok")
        return 1 if r["userErrors"] else 0
    m = _menu_lesen()
    vorher = _zaehle_items(m["items"])
    items = _als_input(m["items"])
    neu_n = 0
    for titel_punkt, plan in PLAN.items():
        punkt = next((i for i in items if i["title"].strip() == titel_punkt), None)
        if not punkt:
            print(f"  ⛔ Menüpunkt «{titel_punkt}» nicht gefunden"); continue
        punkt["items"] = neu_ordnen(punkt["items"], plan["reihenfolge"])
        print(f"«{titel_punkt}» Reihenfolge: " + " › ".join((handle_von(i) or i["title"]) for i in punkt["items"]))
        drin_hier = alle_handles(punkt["items"])    # Doppelplatz in einem ANDEREN Hauptpunkt ist gewollt (Smartwatches unter Technik UND Uhren)
        for titel, handle, eltern in plan["einhaengen"]:
            if handle in drin_hier:
                print(f"  = «{titel}» steht schon unter «{titel_punkt}»"); continue
            n, grund = pruefe_ziel(gql, handle)
            if grund:
                print(f"  ⏭️ «{titel}» ({handle}): {grund} — nicht verlinkt"); continue
            if einhaengen(punkt["items"], titel, handle, eltern):
                neu_n += 1
                print(f"  + «{titel}» ({n} aktiv) → {'unter ' + eltern if eltern else 'Ebene 2 am Ende'}")
            else:
                print(f"  ⛔ Eltern-Unterpunkt {eltern} nicht gefunden (für «{titel}»)")
        punkt["items"] = neu_ordnen(punkt["items"], plan["reihenfolge"])   # Ebene-2-Neuzugänge (z. B. Smart Home) an ihren Sollplatz
    print(f"Menü vorher: {vorher} Einträge · geplant: +{neu_n}" + ("" if SCHARF else " · DRY"))
    if not SCHARF:
        return 0
    sich = os.path.join(REPO, "dropship", f"menu_backup_{datetime.now(timezone.utc):%Y-%m-%d_%H%M}_vor_unterkat_ordnen.json")
    json.dump(m, open(sich, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("  Sicherung:", os.path.relpath(sich, REPO))
    r = gql('mutation($id:ID!,$t:String!,$h:String,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$items){menu{id} userErrors{field message}}}',
            {"id": m["id"], "t": m["title"], "h": m["handle"], "items": items})["menuUpdate"]
    if r["userErrors"]:
        print("  ⛔ menuUpdate:", r["userErrors"]); return 1
    n = _menu_lesen()
    nachher = _zaehle_items(n["items"])

    def ids(its, acc):
        for i in its:
            acc.add(i["id"]); ids(i.get("items") or [], acc)
        return acc
    verloren = ids(m["items"], set()) - ids(n["items"], set())
    reihe = {}
    for punkt in n["items"]:
        if punkt["title"].strip() in PLAN:
            reihe[punkt["title"].strip()] = [handle_von(i) for i in punkt["items"]]
    soll_reihe = {t: [h for h in PLAN[t]["reihenfolge"] if h in reihe.get(t, [])] for t in reihe}
    ist_reihe = {t: [h for h in reihe[t] if h in PLAN[t]["reihenfolge"]] for t in reihe}
    ok = nachher == vorher + neu_n and not verloren and soll_reihe == ist_reihe
    print(f"Menü nachher: {nachher} (vorher {vorher}, erwartet {vorher + neu_n}) · verlorene IDs: {len(verloren)} · Reihenfolge {'ok' if soll_reihe == ist_reihe else 'ABWEICHEND'}")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(main())
