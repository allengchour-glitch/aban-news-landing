#!/usr/bin/env python3
"""seiten_tote_produktlinks.py — Links auf gedraftete Produkte in Shopify-SEITEN (nicht Artikel) umhängen oder streichen (22.10.2026).

ANLASS (Sauber-Inventur, Spähtrupp «theme» T6): `tote_links.py` fand 2 gedraftete Produkte in 4 veröffentlichten Ratgeber-SEITEN (pages, nicht Blog-Artikel):
  dr-meinaier-sussholz-serum-anti-aging-lsf-50-154306 (DRAFT, topische Kosmetik bleibt draussen, Entscheid 30.08.) in beauty-routine-10-minuten + maennerpflege-guide-2026
  slim-wallet-mit-rfid-schutz-und-kartenautomati-532929 (DRAFT, cj-nicht-versendbar-ch) in reise-essentials-sommerferien-2026 + spa-hotels-schweiz-2026
Der Besucher liest die Empfehlung, klickt und landet auf einer 404. Die Artikel-Variante (ratgeber_tote_links_2026_10_08.py) fasst Seiten nicht an.

REGEL: Ein Listenpunkt, der NUR das tote Produkt verlinkt (<li><a href="/products/<tot>">…</a></li>), wird gestrichen; ein Link in einem Absatz/Listenpunkt mit anderem
Inhalt zeigt stattdessen auf die Ersatz-Kollektion (nur wenn eine angegeben ist). Sicherung des alten Textes: dropship/_ratgeber_vorher/<handle>_2026-10-22-seite.json.
Rücklesen: der tote Handle kommt im Text nicht mehr vor, alles andere (Länge ±) bleibt.
  python3 automation/seiten_tote_produktlinks.py            # trocken
  SCHARF=1 python3 automation/seiten_tote_produktlinks.py
  python3 automation/seiten_tote_produktlinks.py --selbsttest
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
SCHARF = os.environ.get("SCHARF") == "1"
VORHER = os.path.join(REPO, "dropship", "_ratgeber_vorher")
# toter Produkt-Handle → (Seite, …) ; Ersatz-Kollektion oder None (= Listenpunkt streichen, sonst Link entfernen)
PLAN = {
    "dr-meinaier-sussholz-serum-anti-aging-lsf-50-154306": (None, ["beauty-routine-10-minuten", "maennerpflege-guide-2026"]),
    "slim-wallet-mit-rfid-schutz-und-kartenautomati-532929": ("portemonnaie", ["reise-essentials-sommerferien-2026", "spa-hotels-schweiz-2026"]),
}


def umhaengen(body, tot, ersatz):
    """Rein: (neuer Text, Anzahl Änderungen). Zuerst Listenpunkte, die NUR diesen Link tragen → gestrichen, wenn kein Ersatz; sonst href auf die Kollektion."""
    n = 0
    li = re.compile(r'\s*<li>\s*(?:[^<]{0,12})?<a href="/products/' + re.escape(tot) + r'">[^<]*</a>\s*(?:[^<]{0,12})?</li>', re.I)
    if ersatz is None:
        body, k = li.subn("", body)
        n += k
        if f"/products/{tot}" in body:   # Link im Absatz: nicht erraten
            return body, -1
        return body, n
    neu = body.replace(f'href="/products/{tot}"', f'href="/collections/{ersatz}"')
    return neu, body.count(f'href="/products/{tot}"')


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    pb = '<ul> <li><a href="/products/xyz">✨ Anti-Aging Serum</a></li> <li><a href="/products/ok">Rest</a></li> </ul>'

    def faelle(m):
        f = []
        b, n = m.umhaengen(pb, "xyz", None)
        if n != 1 or "xyz" in b or "/products/ok" not in b or b.count("<li>") != 1:
            f.append(f"A Listenpunkt streichen, Nachbarn behalten: {n} {b}")
        b, n = m.umhaengen('<p><a href="/products/xyz">👉 ansehen</a></p>', "xyz", None)
        if n != -1:
            f.append("B Link im Absatz ohne Ersatz darf nicht geraten werden (−1)")
        b, n = m.umhaengen('<p><a href="/products/xyz">👉 ansehen</a></p><li><a href="/products/xyzzy">x</a></li>', "xyz", "portemonnaie")
        if n != 1 or 'href="/collections/portemonnaie"' not in b or "/products/xyzzy" not in b:
            f.append(f"C href-Ersatz, ähnlicher Handle bleibt: {n} {b}")
        b, n = m.umhaengen("<p>nichts</p>", "xyz", None)
        if n != 0:
            f.append("D ohne Treffer: 0 Änderungen")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("href ohne Anführungszeichen-Grenze", """f'href="/products/{tot}"', f'href="/collections/{ersatz}"'""", """f'/products/{tot}', f'/collections/{ersatz}'"""),
           ("Absatz-Link wird geraten", "        if f\"/products/{tot}\" in body:", "        if False:"),
           ("Listenpunkt-Muster zu gierig", """(?:[^<]{0,12})?</li>'""", """(?:[^<]{0,12})?</li>.*?</li>'""")]
    erkannt = 0
    for name, alt, ers in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, ers, 1), "mutant", "exec"), m.__dict__)
        try:
            ok = bool(faelle(m))
        except Exception:
            ok = True
        if ok:
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 4 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


def main():
    from kaufwille_zeile import gql
    os.makedirs(VORHER, exist_ok=True)
    fehler = 0
    for tot, (ersatz, seiten) in PLAN.items():
        if ersatz:
            c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id}}', {"h": ersatz})["collectionByIdentifier"]
            if not c:
                print(f"⛔ Ersatz-Kollektion {ersatz} fehlt → {tot} übersprungen")
                fehler += 1
                continue
        p = gql('query($h:String!){productByHandle(handle:$h){status}}', {"h": tot})["productByHandle"]
        if p and p["status"] == "ACTIVE":
            print(f"= {tot} ist wieder ACTIVE → nichts zu tun")
            continue
        for h in seiten:
            d = gql('query($q:String!){pages(first:3,query:$q){nodes{id handle body}}}', {"q": "handle:" + h})["pages"]["nodes"]
            s = next((x for x in d if x["handle"] == h), None)
            if not s:
                print(f"? Seite {h} nicht gefunden")
                fehler += 1
                continue
            neu, n = umhaengen(s["body"], tot, ersatz)
            if n == 0:
                print(f"= {h}: kein Link auf {tot[:30]}… (mehr)")
                continue
            if n < 0:
                print(f"⚠️ {h}: Link steht im Absatz, ohne Ersatz nicht gestrichen → von Hand")
                fehler += 1
                continue
            print(f"{'→' if SCHARF else '[TROCKEN]'} {h}: {n} Änderung(en) für {tot[:34]}… ({'Listenpunkt gestrichen' if not ersatz else '→ /collections/' + ersatz})")
            if not SCHARF:
                continue
            json.dump({"handle": h, "body": s["body"]}, open(os.path.join(VORHER, f"{h}_2026-10-22-seite.json"), "w", encoding="utf-8"), ensure_ascii=False)
            r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){page{body} userErrors{message}}}', {"id": s["id"], "p": {"body": neu}})["pageUpdate"]
            if r["userErrors"] or f"/products/{tot}" in (r["page"] or {}).get("body", ""):
                print(f"   ⚠️ Schreiben/Rücklesen: {r['userErrors'] or 'Link steht noch'}")
                fehler += 1
    return 1 if fehler else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(main())
