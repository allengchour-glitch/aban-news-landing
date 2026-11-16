"""Sperre der Zahlungswache (16.11.2026): Bestellungen mit Artikeln, deren Personalisierung der Shop nicht erfasst,
werden NICHT automatisch bei CJ angelegt, sondern als Warnung gemeldet. Am Shop ändert sich nichts."""
import json, os

def lade(pfad):
    return json.load(open(pfad, encoding="utf-8"))["produkte"]

def trenne(bestellungen, produkt_ids_je_bestellung, sperrliste):
    """bestellungen: Liste der Engine; produkt_ids_je_bestellung: {name: [gid,…]}; liefert (frei, gesperrt[(name, [handles])])."""
    frei, gesperrt = [], []
    for o in bestellungen:
        ids = produkt_ids_je_bestellung.get(o.get("name"))
        if ids is None:
            gesperrt.append((o.get("name"), ["(Produkte nicht lesbar)"]))
            continue
        treffer = [sperrliste[i] for i in ids if i in sperrliste]
        (gesperrt.append((o.get("name"), treffer)) if treffer else frei.append(o))
    return frei, gesperrt
