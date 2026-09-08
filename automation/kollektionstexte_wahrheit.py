#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Meldet Kollektionstexte, die Ware BEWERBEN, die es nicht (mehr) kaufbar gibt.

WARUM ES DIESEN WAECHTER GIBT (08.09.2026)
An einem Vormittag zweimal dieselbe Klasse gefunden, beide auf Seiten MIT gemessenem
Suchverkehr:
  * `camping-kueche` bewarb «Geschirrspueler von Bosch, Samsung, Cecotec und Whirlpool»
    und eine «Outdoor Adventure Gift Box» — alles BigBuy-DRAFT bzw. Phantom.
  * `sommer` bewarb «Markgraefin Kleidern» (3 Treffer, ALLE DRAFT) und den «weissen
    Tennisrock» (DRAFT).
  * `frontpage` (die Startseite!) bewarb «Casio Damenuhren» und «Dolce & Gabbana
    «The One»» — beide DRAFT, beide FREMDE Marken.
`ratgeber_ohne_ware.py` kennt diese Klasse — aber nur fuer BLOGARTIKEL. Kollektionstexte
hat nie jemand geprueft, obwohl sie auf jeder Kategorieseite ueber der Ware stehen.

WIE GEMESSEN WIRD
Der Hausstil setzt Produkt-Eigennamen in « ». Fuer jeden solchen Namen wird gefragt, ob
es ein AKTIVES Produkt gibt, dessen Titel ihn traegt. Gibt es keins, ist der Satz eine
Falschaussage.

⚠️ FEHLALARM-KLASSE, die dieser Waechter bewusst ausschliesst (am 08.09. selbst
   hineingelaufen): « » steht nicht immer um einen Produktnamen. `home-office-setup`
   schreibt «fuer einen aufgeraeumten «Clean Desk»» — ein Konzept. Ebenso stehen
   Kategorienamen und Emoji-Ueberschriften in « ». Deshalb werden Namen mit Emoji,
   mit «&»/«&amp;» und aus der IGNORIEREN-Liste uebersprungen; und ein Name, der NIRGENDS
   im Katalog vorkommt (auch nicht als DRAFT), gilt als Konzept, nicht als Phantom —
   ein Produkt, das der Shop nie hatte, wurde hier nie beworben.

⚠️ MELDET NUR. Ein Kollektionstext ist eine redaktionelle Entscheidung; ihn automatisch
   umzuschreiben hiesse, den Grund fuer den Satz zu erfinden. Genau deshalb hat der
   Ratgeber-Waechter seit dem 28.08. auch keinen Auto-Fix.
"""
import json, os, re, sys, time, urllib.request

SHOP = os.environ.get("SHOPIFY_SHOP", "au3j0y-hq.myshopify.com")
BERICHT = "dropship/KOLLEKTIONSTEXTE-WAHRHEIT.md"
IGNORIEREN = {"clean desk", "office-look", "buero & schreibwaren", "hello kitty"}


def token():
    for p in ("/tmp/cj_shop_token.txt", "/tmp/shop_token.txt"):
        if os.path.exists(p):
            t = open(p).read().strip()
            if t:
                return t
    sys.exit("PAUSE (kein Shop-Token)")


T = token()


def gql(q, v=None):
    """Eine Drosselung ist kein Abbruchgrund (Lehre 23.08.) — sie sagt nur, wie lange."""
    for versuch in range(8):
        try:
            r = urllib.request.Request(
                "https://%s/admin/api/2024-10/graphql.json" % SHOP,
                data=json.dumps({"query": q, "variables": v or {}}).encode(),
                headers={"X-Shopify-Access-Token": T, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=60).read())
        except Exception:
            time.sleep(2 + versuch * 2)
            continue
        if "errors" in d:
            if "hrott" in json.dumps(d["errors"]):
                time.sleep(2 + versuch * 2)
                continue
            # Ein Fehler, der NICHT gedrosselt ist, gehoert gelesen — nicht verschluckt.
            print("GQL-FEHLER: %s" % json.dumps(d["errors"])[:200], file=sys.stderr)
            return None
        return d.get("data")
    return None


NAME = re.compile(r"«([^»]{3,60})»")
KEIN_PRODUKT = re.compile(r"(&amp;|&|[\U0001F300-\U0001FAFF])")


def kollektionen():
    out, cur = [], None
    while True:
        d = gql("""query($c:String){collections(first:50,after:$c){
          pageInfo{hasNextPage endCursor}
          nodes{handle title descriptionHtml
            resourcePublicationsV2(first:15){nodes{publication{name} isPublished}}}}}""",
                {"c": cur})
        if not d or not d.get("collections"):
            return None                     # Ausfall ist KEIN Nullbefund
        c = d["collections"]
        for n in c["nodes"]:
            if any(x["publication"]["name"] in ("Online Store", "Onlineshop") and x["isPublished"]
                   for x in n["resourcePublicationsV2"]["nodes"]):
                out.append(n)
        if not c["pageInfo"]["hasNextPage"]:
            return out
        cur = c["pageInfo"]["endCursor"]
        time.sleep(0.3)


def treffer(name):
    """(aktiv, gesamt) Produkte, deren TITEL den Namen traegt. None = nicht messbar."""
    d = gql('{products(first:50,query:%s){nodes{title status}}}' % json.dumps(name))
    if d is None:
        return None
    n = [p for p in d["products"]["nodes"] if name.lower() in p["title"].lower()]
    return sum(1 for p in n if p["status"] == "ACTIVE"), len(n)


def main():
    ks = kollektionen()
    if ks is None:
        print("PAUSE (Kollektionen nicht ladbar)")
        return 1
    funde, geprueft, konzepte = [], 0, 0
    for k in ks:
        for name in {x.strip() for x in NAME.findall(k["descriptionHtml"] or "")}:
            if KEIN_PRODUKT.search(name) or name.lower() in IGNORIEREN:
                continue
            geprueft += 1
            t = treffer(name)
            time.sleep(0.25)
            if t is None:
                continue                    # Leseausfall zaehlt nie als Befund
            aktiv, gesamt = t
            if gesamt == 0:
                konzepte += 1               # kein Produkt dieses Namens -> Konzept, kein Phantom
            elif aktiv == 0:
                funde.append((k["handle"], k["title"], name, gesamt))
    print("Kollektionen im Onlineshop: %d · Namen geprueft: %d · davon Konzepte: %d"
          % (len(ks), geprueft, konzepte))
    print("PHANTOME (nur DRAFT, kein aktives Produkt): %d" % len(funde))
    for h, t, n, g in funde:
        print("  %-30s «%s» — %d Treffer, alle DRAFT" % (h, n, g))
    if funde:
        with open(BERICHT, "w") as f:
            f.write("# Kollektionstexte bewerben nicht kaufbare Ware\n\n")
            f.write("Stand: %s UTC · MELDET NUR, ein Kollektionstext ist eine redaktionelle "
                    "Entscheidung.\n\n" % time.strftime("%d.%m.%Y %H:%M"))
            f.write("| Kollektion | beworbener Name | Treffer im Katalog |\n|---|---|---:|\n")
            for h, t, n, g in funde:
                f.write("| `%s` (%s) | «%s» | %d, alle DRAFT |\n" % (h, t, n, g))
    elif os.path.exists(BERICHT):
        os.remove(BERICHT)                  # ohne Befund kein Bericht
    print("FERTIG")
    return 0


if __name__ == "__main__":
    sys.exit(main())
