#!/usr/bin/env python3
"""filtergrenze_wache.py — Shopify blendet ALLE Filter einer Kollektion aus, sobald sie > 5'000 aktive Produkte hat.

GEMESSEN 04.10.2026: «Schmuck & Uhren» 4'932 aktiv → Filter da; «Schuhe» 5'498 → keine; nach Umstellung (ohne Kinderschuhe,
eigener Menüpunkt) 4'293 → Filter da. «Wohnen & Garten» ohne Küche (eigener Menüpunkt) 6'513 → 4'772 → Filter da.
QUELLE: help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters.
Bewusst über der Grenze (Inhalt würde sonst verfälscht): «Damen» (~9'800), Preis-Geschenkseiten (28'000–45'000).
Meldet jede Hauptmenü-Kollektion ab WARN (4'800) aktiven Produkten — Neuimporte schieben Kategorien über die Grenze.
Schreibt keine Shop-Daten. Eine Zeile «FILTERGRENZE: …»; seit 22.10.2026 zusätzlich dropship/_filtergrenze_stand.json (Stand der letzten Messung) und eine
Ampelzeile (`zeile()`): GEMESSEN 22.10. standen drei Menü-Kollektionen wieder über der Grenze (5'323 / 5'656 / 5'307), obwohl die Wache seit 04.10. täglich lief —
ihr Ergebnis landete nur in /tmp/filtergrenze_wache.log, das niemand las. Abhilfe-Werkzeug: automation/filtergrenze_reparieren.py.
"""
import json, os, sys, urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

WARN = int(os.environ.get("WARN", "4800"))
BEWUSST = {"damen-mode", "unter-chf-25", "kleine-geschenke-mitbringsel", "geschenke-unter-50-franken",
           "geschenke-unter-100-franken", "🎁-geschenke-bis-chf-30"}


STAND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dropship", "_filtergrenze_stand.json")
STAND_ALT_H = 36


def bewerte(stand, jetzt=None):
    """Rein: Ampeltext oder None. ⚠️ ab Überschreitung der Grenze, ℹ️ bei Annäherung oder veralteter Messung, sonst schweigen."""
    jetzt = jetzt or datetime.now(timezone.utc)
    if not stand or "zeit" not in stand:
        return "FILTERGRENZE: unklar (keine Messung in dropship/_filtergrenze_stand.json)"
    try:
        alter = (jetzt - datetime.fromisoformat(stand["zeit"])).total_seconds() / 3600.0
    except Exception:
        return "FILTERGRENZE: unklar (Zeitstempel unlesbar)"
    ueber = {h: n for h, n in (stand.get("werte") or {}).items() if n > 5000}
    if ueber:
        return ("⚠️ FILTERGRENZE: " + " · ".join(f"{h} {n}" for h, n in sorted(ueber.items())) + " aktive Produkte > 5'000 — Shopify blendet dort ALLE Filter aus; "
                "Abhilfe automation/filtergrenze_reparieren.py (PLAN anpassen: Regel einer Unterkategorie mit eigenem Menüpunkt streichen)")
    if alter > STAND_ALT_H:
        return f"ℹ️ FILTERGRENZE: letzte Messung vor {alter:.0f} h (Aufseher-Lauf täglich)"
    nah = {h: n for h, n in (stand.get("werte") or {}).items() if n >= WARN}
    if nah:
        return "ℹ️ FILTERGRENZE: nahe der Grenze: " + " · ".join(f"{h} {n}" for h, n in sorted(nah.items()))
    return None


def zeile():
    try:
        return bewerte(json.load(open(STAND, encoding="utf-8")))
    except (OSError, ValueError):
        return bewerte(None)


def main():
    werte = {}
    menue = [m for m in gql('{menus(first:30){nodes{handle items{url items{url items{url}}}}}}')["menus"]["nodes"]
             if m["handle"] == "main-menu"][0]["items"]
    hs = []
    def walk(it):
        for i in it:
            u = i.get("url") or ""
            if "/collections/" in u:
                hs.append(urllib.parse.unquote(u.split("/collections/")[1].split("?")[0]))
            walk(i.get("items") or [])
    walk(menue)
    befund = []
    for h in dict.fromkeys(hs):
        if h in BEWUSST:
            continue
        c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id}}', {"h": h})["collectionByIdentifier"]
        if not c:
            continue
        n = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
                {"q": f"collection_id:{c['id'].split('/')[-1]} status:active"})["productsCount"]["count"]
        werte[h] = n
        if n >= WARN:
            befund.append(f"{h} {n}{' ⛔ ohne Filter' if n > 5000 else ''}")
    if werte:
        tmp = STAND + ".tmp"
        json.dump({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "werte": werte, "warn": WARN}, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
        os.replace(tmp, STAND)
    print("FILTERGRENZE: " + ("ok (alle Menü-Kollektionen < %d aktiv)" % WARN if not befund else " · ".join(befund)))


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    jetzt = datetime(2026, 10, 22, 18, 0, tzinfo=timezone.utc)
    frisch = "2026-10-22T10:00:00+00:00"

    def faelle(m):
        f = []
        if not (m.bewerte({"zeit": frisch, "werte": {"fur-ihn": 5323, "uhren": 2100}}, jetzt) or "").startswith("⚠️ FILTERGRENZE: fur-ihn 5323"):
            f.append("A Überschreitung muss ⚠️ melden")
        if m.bewerte({"zeit": frisch, "werte": {"a": 3000}}, jetzt) is not None:
            f.append("B alles unter der Warnschwelle muss schweigen")
        if not (m.bewerte({"zeit": frisch, "werte": {"a": 4900}}, jetzt) or "").startswith("ℹ️ FILTERGRENZE: nahe"):
            f.append("C nahe der Grenze muss ℹ️ melden")
        if not (m.bewerte({"zeit": "2026-10-20T10:00:00+00:00", "werte": {"a": 3000}}, jetzt) or "").startswith("ℹ️ FILTERGRENZE: letzte Messung"):
            f.append("D veraltete Messung muss gemeldet werden")
        if "unklar" not in (m.bewerte(None, jetzt) or ""):
            f.append("E ohne Stand muss «unklar» heissen")
        if m.bewerte({"zeit": frisch, "werte": {"a": 5000}}, jetzt) is not None and (m.bewerte({"zeit": frisch, "werte": {"a": 5000}}, jetzt) or "").startswith("⚠️"):
            f.append("F genau 5'000 ist noch erlaubt (Grenze: MEHR als 5'000)")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Grenze zu tief", "if n > 5000}", "if n > 4000}"), ("Veraltung ignoriert", "if alter > STAND_ALT_H:", "if False:"),
           ("Unklar wird still", 'return "FILTERGRENZE: unklar (keine Messung in dropship/_filtergrenze_stand.json)"', "return None")]
    erkannt = 0
    for name, alt, neu in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu, 1), "mutant", "exec"), m.__dict__)
        if faelle(m):
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 6 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile() or "")
        sys.exit(0)
    main()
