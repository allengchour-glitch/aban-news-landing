#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shop_kanal.py — «Ist das im Onlineshop veröffentlicht?», ohne auf einen
Anzeigenamen hereinzufallen.

DER FUND (29.08.2026): Derselbe Publikations-Kanal meldet sich unter ZWEI Namen.
Über die rohe Admin-API heisst er **«Online Store»**, über die Shopify-MCP-
Werkzeuge **«Onlineshop»** — je nachdem, welche Sprache der Client anfragt.
Ein Vergleich auf einen dieser Namen prüft also die Sprache des Aufrufers, nicht
den Zustand des Shops. Beim Setzen der Weiterleitungen hat genau das acht
einwandfreie, live veröffentlichte Kollektionen als «NICHT VERÖFFENTLICHT»
gemeldet — hätte ich das geglaubt, wäre der Befund «der Shop hat keine
Kategorien mehr» gewesen.

**Ein Anzeigename ist keine Kennung.** Dieselbe Familie wie «eine PID ist ein
Name, kein Zeitstempel» (20.08.) und «der CDN-Dateiname beweist nichts über den
Inhalt» (27.08.): ein Feld, das für Menschen da ist, taugt nicht als Schlüssel.

⚠️ Die saubere Lösung wäre, gegen die Publikations-ID zu prüfen statt gegen den
Namen. Die ID des Onlineshops ist im Repo dokumentiert (301970915713), aber die
Wächter fragen `resourcePublications{publication{name}}` ab und bekommen die ID
gar nicht mit — sie umzustellen hiesse, jede Abfrage anzufassen. Diese Liste ist
der billige, ehrliche Zwischenschritt: sie deckt beide bekannten Schreibweisen
ab und ist an EINER Stelle erweiterbar.

Nutzung:
    from shop_kanal import im_onlineshop
    if not im_onlineshop(pubs_dict): ...          # {name: isPublished}
    if not im_onlineshop_liste(nodes): ...        # [{publication:{name},isPublished}]
"""

# Beide belegten Schreibweisen. Neue Sprachen NUR hier ergänzen.
ONLINE_STORE_NAMEN = ("Online Store", "Onlineshop", "Online-Shop", "Boutique en ligne")


def im_onlineshop(pubs):
    """pubs: {Kanalname: isPublished} — True, wenn der Onlineshop dabei ist."""
    return any(pubs.get(n) for n in ONLINE_STORE_NAMEN)


def im_onlineshop_liste(nodes):
    """nodes: [{publication:{name:…}, isPublished:…}] aus resourcePublications(V2)."""
    return any(
        n.get("isPublished") and (n.get("publication") or {}).get("name") in ONLINE_STORE_NAMEN
        for n in (nodes or [])
    )
