#!/usr/bin/env python3
"""texte_befunde_2026_10_22.py — acht kleine, belegte Text-Befunde der Sauber-Inventur (Spähtrupp «texte», 22.10.2026) in einem Lauf beheben.

Jeder Schritt: LIVE lesen · exakte Zeichenkette prüfen (kommt sie nicht genau einmal vor → übersprungen und gemeldet) · Sicherung des Alttexts in
dropship/_ratgeber_vorher/ · schreiben · zurücklesen. Trocken ist der Standard (`SCHARF=1` schreibt). Werbetest-Sperre (dropship/_werbetest_sperre.txt) wird beachtet.

  T2a  Gürteltasche «Swiss Made Qualität …» auf China-Ware → Listenpunkt gestrichen (Swissness-Recht, UWG)
  T2b  «Springseil für Fitness und Gewichtsverlust» → Titel ohne Gewichtsverlust-Versprechen
  T2c  «Ultraschall-Fettabbaugerät» (Cellulite-/Fettabbau-Versprechen im Titel UND Text) → DRAFT, Tag heilversprechen-draft
  T12  Multipack-Titel ohne Stückzahl (Lotto-Box à 5000, Holzbausteine à 24) → «· N Stück/Teile» (Regel vom 26.07.)
  T7   Kollektionen loreal + trainingsanzuege-sets (Markentext, Marken nicht mehr im Sortiment) → aus ALLEN Kanälen genommen (umkehrbar)
  T8   Ratgeber: «Schweizer Qualität» / «authentische Markenware» auf Ware von internationalen Lieferanten → neutralisiert (6 Sätze in 5 Artikeln)
  T6a  Seite versand-lieferung: Liechtenstein (CHF 14.90, ohne Gratisversand, 15–45 Tage) wie in der Versandrichtlinie ergänzt
  T1b  Hauptmenü «EU-Lager — Schnell geliefert» → «EU-Lager» (die Kasse zeigt für EU-Lager 06.–20.11., die Seite 26.10.–02.11.: «schnell» ist eine Zusage, die die Kasse nicht hält)

  python3 automation/texte_befunde_2026_10_22.py            # trocken
  SCHARF=1 python3 automation/texte_befunde_2026_10_22.py
  python3 automation/texte_befunde_2026_10_22.py --selbsttest
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

# (Handle, alter Text, neuer Text) — "" als neu = Listenpunkt/Satz streichen
PRODUKT_TEXT = [
    ("crazy-horse-leder-herren-gurteltasche-mit-hand-628200", "\n<li>Swiss Made Qualität mit traditioneller Handwerkskunst</li>", ""),
]
PRODUKT_TITEL = [
    ("springseil-fur-fitness-und-gewichtsverlust-fd0617", "Springseil für Fitness und Gewichtsverlust", "Springseil für Fitness und Training"),
    ("lotto-abdeckplattli-box-15-mm-fga85530", "Lotto Abdeckplättli-Box, 15 mm", "Lotto Abdeckplättli-Box, 15 mm · 5000 Stück"),
    ("regenbogen-bausteine-aus-holz-und-acryl-426816", "Holzbausteine mit Pflanzen-Einlagen aus Acryl", "Holzbausteine mit Pflanzen-Einlagen aus Acryl · 24 Teile"),
]
DRAFTEN = ["ultraschall-fettabbaugerat-244032"]
KOLLEKTIONEN_RAUS = ["loreal", "trainingsanzuege-sets"]
ARTIKEL = [   # (Artikel-Handle, alt, neu)
    ("caps-sommerhuete-2026-sonnenschutz-stil", "hochwertige Verarbeitung, die den Schweizer Qualitätsansprüchen gerecht wird", "saubere Verarbeitung und stabile Nähte"),
    ("caps-sommerhuete-2026-sonnenschutz-stil", "Schweizer Qualität und Stil im Fokus", "Qualität und Stil im Fokus"),
    ("garten-balkon-2026-ideen", "Langlebigkeit in Schweizer Qualität", "Langlebigkeit im Alltag"),
    ("parfum-kaufen-2026-duftnoten-ratgeber", "Bei LuxeStyle legen wir Wert auf Originalität und Schweizer Qualität, damit Sie stets authentische Markenware zu fairen CHF-Preisen erhalten",
     "Achten Sie beim Kauf auf klare Angaben zur Herkunft und auf faire CHF-Preise"),
    ("damenuhren-2026-elegante-uhren-ratgeber", "Eine Uhr aus hochwertigen Materialien, wie sie bei uns Standard sind, ist eine Investition in Schweizer Qualität, die sich auszahlt",
     "Eine Uhr aus hochwertigen Materialien ist eine Investition, die sich auszahlt"),
    ("wasserfester-schmuck-2026-ratgeber", "die sich in der Schweizer Qualitätstradition bewährt", "die sich im Alltag bewährt"),
]
SEITE_LI = [   # (alt, neu) in versand-lieferung
    ("<li>📦 <strong>Direktversand ab Lieferantenlager:</strong> 10–20 Werktage</li>",
     "<li>📦 <strong>Direktversand ab Lieferantenlager:</strong> 10–20 Werktage</li>\n<li>🇱🇮 <strong>Nach Liechtenstein:</strong> in der Regel 15–45 Tage (eigene Versandlinie, länger als innerhalb der Schweiz)</li>"),
    ("<li>🇨🇭 <strong>Schweiz:</strong> CHF 7.00 · GRATIS ab CHF 50</li>",
     "<li>🇨🇭 <strong>Schweiz:</strong> CHF 7.00 · GRATIS ab CHF 50</li>\n<li>🇱🇮 <strong>Liechtenstein:</strong> CHF 14.90 · kein Gratisversand</li>"),
]
MENUE_ALT, MENUE_NEU = "EU-Lager — Schnell geliefert", "EU-Lager"


def ersetze_einmal(text, alt, neu):
    """Rein: ersetzt `alt` durch `neu`, aber nur wenn `alt` GENAU einmal vorkommt. → (neuer Text, Treffer)."""
    n = text.count(alt)
    return (text.replace(alt, neu, 1), 1) if n == 1 else (text, n)


def sichern(name, inhalt):
    os.makedirs(VORHER, exist_ok=True)
    json.dump(inhalt, open(os.path.join(VORHER, name), "w", encoding="utf-8"), ensure_ascii=False)


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        if m.ersetze_einmal("a X b", "X", "Y") != ("a Y b", 1):
            f.append("A genau ein Treffer wird ersetzt")
        if m.ersetze_einmal("a X b X", "X", "Y") != ("a X b X", 2):
            f.append("B zwei Treffer: nichts ändern, Anzahl melden")
        if m.ersetze_einmal("a b", "X", "Y") != ("a b", 0):
            f.append("C kein Treffer: nichts ändern")
        if m.ersetze_einmal("<ul>\n<li>x</li>\n<li>Swiss Made</li>\n</ul>", "\n<li>Swiss Made</li>", "")[0] != "<ul>\n<li>x</li>\n</ul>":
            f.append("D Listenpunkt streichen")
        for h, alt, neu in m.ARTIKEL:
            if not alt or alt == neu or "Schweizer Qualität" in neu or "authentische Markenware" in neu:
                f.append(f"E Ersatz darf die Aussage nicht wiederholen: {h}")
        for h, alt, neu in m.PRODUKT_TITEL:
            if not neu.startswith(alt.split(" · ")[0][:20]):
                f.append(f"F Titel-Ersatz verändert den Anfang: {h}")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("n==1 egal", "return (text.replace(alt, neu, 1), 1) if n == 1 else (text, n)", "return (text.replace(alt, neu, 1), 1) if n >= 1 else (text, n)"),
           ("Aussage bleibt im Ersatz", '"Eine Uhr aus hochwertigen Materialien ist eine Investition, die sich auszahlt"', '"Eine Investition in Schweizer Qualität, die sich auszahlt"')]
    erkannt = 0
    for name, alt, ers in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, ers, 1), "mutant", "exec"), m.__dict__)
        if faelle(m):
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 6 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


def main():
    from kaufwille_zeile import gql
    try:
        from werbetest_sperre import gesperrte_ids
        sperre = {str(x).rsplit("/", 1)[-1] for x in gesperrte_ids()}
    except Exception:
        print("⛔ Werbetest-Sperre nicht lesbar → kein Lauf")
        return 1
    fehler = 0

    def tu(msg, ok):
        nonlocal fehler
        print(("   ✓ " if ok else "   ⚠️ ") + msg)
        fehler += 0 if ok else 1

    def produkt(h):
        p = gql('query($h:String!){productByHandle(handle:$h){id title status tags descriptionHtml}}', {"h": h})["productByHandle"]
        if not p:
            print(f"? Produkt {h} nicht gefunden"); return None
        if p["id"].rsplit("/", 1)[-1] in sperre:
            print(f"⏭️ {h}: Werbetest-Sperre"); return None
        return p

    # T2a / Text
    for h, alt, neu in PRODUKT_TEXT:
        p = produkt(h)
        if not p:
            continue
        body, n = ersetze_einmal(p["descriptionHtml"], alt, neu)
        print(f"{'→' if SCHARF else '[TROCKEN]'} T2a {h}: {n} Treffer")
        if n != 1 or not SCHARF:
            continue
        sichern(f"{h}_2026-10-22-text.json", {"handle": h, "body": p["descriptionHtml"]})
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{descriptionHtml} userErrors{message}}}', {"p": {"id": p["id"], "descriptionHtml": body}})["productUpdate"]
        tu("zurückgelesen: Aussage weg", not r["userErrors"] and alt.strip(" <li>/").split("</li>")[0][:20] not in (r["product"] or {}).get("descriptionHtml", alt))
    # T2b / T12 Titel
    for h, alt, neu in PRODUKT_TITEL:
        p = produkt(h)
        if not p:
            continue
        print(f"{'→' if SCHARF else '[TROCKEN]'} Titel {h}: «{p['title']}» → «{neu}»" + ("" if p["title"] == alt else "  ⚠️ Titel weicht vom Befund ab → übersprungen"))
        if p["title"] != alt or not SCHARF:
            continue
        sichern(f"{h}_2026-10-22-titel.json", {"handle": h, "title": p["title"]})
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title handle} userErrors{message}}}', {"p": {"id": p["id"], "title": neu}})["productUpdate"]
        tu(f"Titel zurückgelesen, Handle bleibt {r['product']['handle'] if r['product'] else '?'}", not r["userErrors"] and r["product"]["title"] == neu and r["product"]["handle"] == h)
    # T2c draften
    for h in DRAFTEN:
        p = produkt(h)
        if not p:
            continue
        print(f"{'→' if SCHARF else '[TROCKEN]'} DRAFT {h}: «{p['title']}» ({p['status']})")
        if p["status"] != "ACTIVE" or not SCHARF:
            continue
        sichern(f"{h}_2026-10-22-draft.json", {"handle": h, "status": p["status"], "tags": p["tags"]})
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{status} userErrors{message}}}', {"p": {"id": p["id"], "status": "DRAFT", "tags": sorted(set(p["tags"]) | {"heilversprechen-draft"})}})["productUpdate"]
        tu("Status DRAFT zurückgelesen", not r["userErrors"] and r["product"]["status"] == "DRAFT")
    # T7 Kollektionen aus allen Kanälen
    for h in KOLLEKTIONEN_RAUS:
        c = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id title productsCount{count} resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}', {"h": h})["collectionByIdentifier"]
        if not c:
            print(f"? Kollektion {h} nicht gefunden"); continue
        pubs = [n["publication"] for n in c["resourcePublicationsV2"]["nodes"] if n["isPublished"]]
        print(f"{'→' if SCHARF else '[TROCKEN]'} T7 {h} ({c['productsCount']['count']} Produkte): aus {len(pubs)} Kanälen nehmen: {', '.join(p['name'] for p in pubs)}")
        if not pubs or not SCHARF:
            continue
        sichern(f"{h}_2026-10-22-kanaele.json", {"handle": h, "id": c["id"], "kanaele": pubs})
        r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,input:$i){userErrors{message}}}', {"id": c["id"], "i": [{"publicationId": p["id"]} for p in pubs]})["publishableUnpublish"]
        c2 = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){resourcePublicationsV2(first:30){nodes{isPublished}}}}', {"h": h})["collectionByIdentifier"]
        tu("in keinem Kanal mehr veröffentlicht", not r["userErrors"] and not any(n["isPublished"] for n in c2["resourcePublicationsV2"]["nodes"]))
    # T8 Artikel
    nach = {}
    for h, alt, neu in ARTIKEL:
        nach.setdefault(h, []).append((alt, neu))
    for h, paare in nach.items():
        d = gql('query($q:String!){articles(first:5,query:$q){nodes{id handle body}}}', {"q": "handle:" + h})["articles"]["nodes"]
        a = next((x for x in d if x["handle"] == h), None)
        if not a:
            print(f"? Artikel {h} nicht gefunden"); continue
        body, ok = a["body"], True
        for alt, neu in paare:
            body, n = ersetze_einmal(body, alt, neu)
            print(f"{'→' if SCHARF else '[TROCKEN]'} T8 {h}: «{alt[:50]}…» {n} Treffer")
            ok = ok and n == 1
        if not ok or not SCHARF:
            continue
        sichern(f"{h}_2026-10-22-qualitaet.json", {"handle": h, "body": a["body"]})
        r = gql('mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){article{body} userErrors{message}}}', {"id": a["id"], "a": {"body": body}})["articleUpdate"]
        tu("Artikel zurückgelesen, Aussagen weg", not r["userErrors"] and all(alt not in r["article"]["body"] for alt, _ in paare))
    # T6a Seite
    d = gql('query($q:String!){pages(first:3,query:$q){nodes{id handle body}}}', {"q": "handle:versand-lieferung"})["pages"]["nodes"]
    s = next((x for x in d if x["handle"] == "versand-lieferung"), None)
    if s:
        body, ok = s["body"], True
        if "Liechtenstein" in body:
            print("= T6a versand-lieferung nennt Liechtenstein schon → nichts zu tun")
        else:
            for alt, neu in SEITE_LI:
                body, n = ersetze_einmal(body, alt, neu)
                ok = ok and n == 1
            print(f"{'→' if SCHARF else '[TROCKEN]'} T6a versand-lieferung: Liechtenstein-Zeilen {'passen' if ok else 'PASSEN NICHT (Seite verändert?)'}")
            if ok and SCHARF:
                sichern("versand-lieferung_2026-10-22-li.json", {"handle": "versand-lieferung", "body": s["body"]})
                r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){page{body} userErrors{message}}}', {"id": s["id"], "p": {"body": body}})["pageUpdate"]
                tu("Seite zurückgelesen, Liechtenstein steht drin", not r["userErrors"] and "Liechtenstein" in r["page"]["body"])
    # T1b Menü-Label
    from kollektion_accessoires_fix import _menu_lesen, _als_input
    m = _menu_lesen()
    items = _als_input(m["items"])
    treffer = []

    def walk(its):
        for i in its:
            if i["title"].strip() == MENUE_ALT:
                treffer.append(i)
            walk(i.get("items") or [])
    walk(items)
    print(f"{'→' if SCHARF else '[TROCKEN]'} T1b Menü «{MENUE_ALT}» → «{MENUE_NEU}»: {len(treffer)} Eintrag")
    if len(treffer) == 1 and SCHARF:
        sich = os.path.join(REPO, "dropship", "menu_backup_2026-10-22_eu_lager_label.json")
        json.dump(m, open(sich, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        treffer[0]["title"] = MENUE_NEU
        r = gql('mutation($id:ID!,$t:String!,$h:String,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$items){menu{id} userErrors{message}}}',
                {"id": m["id"], "t": m["title"], "h": m["handle"], "items": items})["menuUpdate"]
        n2 = _menu_lesen()
        titel = []

        def sammle(its):
            for i in its:
                titel.append(i["title"].strip())
                sammle(i.get("items") or [])
        sammle(n2["items"])
        tu("Menü zurückgelesen: neues Label da, altes weg", not r["userErrors"] and MENUE_NEU in titel and MENUE_ALT not in titel)
    print(f"FERTIG: texte_befunde_2026_10_22 {'SCHARF' if SCHARF else 'TROCKEN'} · {fehler} Fehler")
    return 1 if fehler else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(main())
