"""Macht aus der leeren Kategorie «Schule & Büro» eine echte Saisonseite.

DER BEFUND (11.08.2026): Von 505 Kollektionen sind drei leer und 20 haben ein bis drei Artikel.
Die leeren sind alle unveröffentlicht, hängen also niemandem im Weg. Eine der dünnen aber schon:
`schule-buro` ist **live und enthält genau ein Produkt** — mitten im Schweizer Schulanfang
(Mitte August). Eine leere Saisonkategorie zur Saison ist keine Kleinigkeit, sondern verschenkte
Nachfrage.

Im Katalog steckt die Ware längst: 23 passende Artikel, davon zehn Schulrucksäcke, dazu
Notizbücher, Aktentaschen, Laptoptaschen und Schreibtisch-Organizer.

⚠️ WARUM DIE AUSWAHL ZWEIMAL GEFILTERT WIRD: Ein erster, breiter Suchbegriff fand 70 Artikel —
darunter ein **Etui**kleid (Kompositum, kein Etui), einen «Konturformer Radian **Lineal**»
(ein Make-up-Werkzeug), ein «Aquarium für den **Schreibtisch**» und vier Katzenbetten, die
ebenfalls «für den Schreibtisch» heissen. Deutsche Zusammensetzungen treffen fast jedes
Schlagwort irgendwo. Deshalb: eine Liste eindeutiger Schul-/Bürowörter UND eine Sperrliste
für die bekannten Fallen (Regel 9b).

Vorgehen: Die Artikel bekommen den Tag `schule-buero`, die Kollektion wird auf diese Regel
umgestellt und bekommt Text plus Suchmaschinen-Beschreibung. Damit füllt sie sich künftig von
selbst, wenn neue Schulware importiert wird.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
TAG = "schule-buero"
HANDLE = "schule-buro"

JA = re.compile(r'\b(Schulrucksack|Schulranzen|Federm[äa]ppchen|Federmappe|Laptoptasche|'
                r'Aktentasche|Notizbuch|Schreibmappe|Klemmbrett|Stifteh?alter|Stiftek[öo]cher|'
                r'Pinnwand|Whiteboard|Taschenrechner|Textmarker|Karteikarten|Brotdose|'
                r'Zn[üu]nibox|Schreibtischlampe|Schreibtisch-?Organizer)\b', re.I)
# Die Fallen, die der erste Durchlauf zutage förderte — alle echt, alle aus dem Katalog.
NEIN = re.compile(r'Etui-?Kleid|Kontur|Make-?up|Aquarium|Hunde|Katzen|Zahn', re.I)


def gql(q, v=None):
    with open("/tmp/_sb.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sb.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors"):
                print("  ", str(d["errors"])[:120], flush=True)
        except Exception:
            pass
        time.sleep(4)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    cur, treffer, tot = None, [], 0
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title tags}}}', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Abbruch — Katalogliste unvollständig, nichts geändert", flush=True)
            return
        for p in pg["nodes"]:
            tot += 1
            if JA.search(p["title"]) and not NEIN.search(p["title"]):
                treffer.append(p)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    offen = [p for p in treffer if TAG not in p["tags"]]
    print(f"{tot} aktive Produkte | passend: {len(treffer)} | noch ohne Tag: {len(offen)}",
          flush=True)
    for p in treffer[:30]:
        print(f"   {p['title'][:60]}", flush=True)
    if len(treffer) < 8:
        print("  ⛔ Zu wenige Artikel für eine eigene Kategorie — nichts geändert.", flush=True)
        return
    if DRY:
        return

    for p in offen:
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": p["id"], "t": [TAG]})
        time.sleep(0.15)
    print(f"  {len(offen)} Artikel getaggt", flush=True)

    d = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": HANDLE})
    cid = ((d.get("data") or {}).get("collectionByHandle") or {}).get("id")
    if not cid:
        print(f"  ⚠️ Kollektion {HANDLE} nicht gefunden", flush=True)
        return
    text = ("<p>Alles für Schulstart und Schreibtisch: Schulrucksäcke für Primar- und "
            "Oberstufe, Notizbücher, Etuis, Laptop- und Aktentaschen sowie Ordnung für den "
            "Arbeitsplatz. Versand innerhalb der Schweiz, gratis ab CHF 50, 30 Tage "
            "Rückgabe.</p>")
    r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{handle '
            'productsCount{count}} userErrors{message}}}',
            {"i": {"id": cid, "descriptionHtml": text,
                   "ruleSet": {"appliedDisjunctively": True,
                               "rules": [{"column": "TAG", "relation": "EQUALS",
                                          "condition": TAG}]},
                   "seo": {"title": "Schule & Büro – Schulrucksäcke, Notizbücher & Ordnung | LuxeStyle",
                           "description": "Schulrucksäcke, Etuis, Notizbücher und Schreibtisch-"
                                          "Organizer. Versand in der Schweiz, gratis ab CHF 50."}}})
    u = (r.get("data") or {}).get("collectionUpdate") or {}
    if u.get("userErrors"):
        print("  ⚠️", u["userErrors"][0]["message"], flush=True)
        return
    print(f"  Kollektion umgestellt: {(u.get('collection') or {}).get('productsCount')}", flush=True)


if __name__ == "__main__":
    main()
