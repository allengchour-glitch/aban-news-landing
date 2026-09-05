"""Nimmt sperr-riskante Ware aus dem Google-Kanal — und die verbotene Waffe ganz aus dem Shop.

NACHKONTROLLE ZUM 11.08.-LAUF (12.08.2026): Der damalige Ausschluss beim Nachziehen von 1'084
Produkten hat gewirkt — aber nur für Ware, die schon durch den Titel oder die Warengruppe
auffiel. Übrig geblieben sind ausgerechnet die Fälle, bei denen das Risiko NICHT im Titel steht:

 1. RAUCHZUBEHÖR (24). Siebzehn davon tragen die Warengruppe «Raucherzubehör» und die Tags
    `raucher` + `18plus` — und stehen trotzdem im Feed. Fünf weitere Aschenbecher sind als
    «Aufbewahrung & Organizer», «Gadgets» oder «Elektronik» einsortiert und rutschen deshalb
    durch jede Warengruppenprüfung. Google zählt Aschenbecher, Etuis und den
    Shisha-Kohleanzünder als Tabakzubehör; die Sanktion dafür ist die Kontosperre.

 2. REFURBISHED, ABER ALS «NEU» GEMELDET (5). Der gefährlichste Befund, und er entstand aus
    einer früheren Verbesserung: Sessions haben den Refurb-Zusatz («Restauriert A») aus den
    TITELN gestrippt, damit sie sauber aussehen. Die Aussage blieb im Beschreibungstext stehen,
    das Metafeld `condition` blieb auf `new`. Damit meldet der Shop generalüberholte Ware als
    fabrikneu — das ist keine heikle Warengruppe mehr, sondern eine Falschangabe.
    → `condition` auf `refurbished` korrigieren UND aus dem Kanal nehmen.

 3. WAFFEN (14). Dreizehn Klingen, alle als «Küche & Bar» getarnt und mit
    `google_product_category = Home & Garden > Kitchen & Dining` gemeldet, dazu ein
    Gewehrriemen unter «Aufbewahrung & Organizer». Ein Fund geht über Google hinaus: das
    **faltbare Butterfly-Messer** ist in der Schweiz nach Waffengesetz Art. 4 eine verbotene
    Waffe. Das gehört nicht aus dem Kanal, das gehört aus dem Verkauf → DRAFT.

 4. EROTIK (4). «Weisses Babydoll-Kleid» trägt die Tags `nicht-bewerben` und `nur-onlineshop` —
    und steht im Google-Kanal. Die Entscheidung wurde also getroffen, aber nie durchgesetzt.
    Dasselbe Produkt steht zudem in der Warengruppe **«Kinder»**; Erotikware in der
    Kinder-Warengruppe ist der Auslöser mit der kürzesten Zündschnur, den es bei Google gibt.

 5. FREMDE MARKEN IM EIGENEN TITEL (5). «Cropped Blazer im **Chanel**-Stil», «Nagelpuder im
    **Barbie**-Stil», «**Iron Man** Wireless Charger». Eine Luxusmarke zu nennen, um einen Stil
    zu beschreiben, wertet Google als Markenrechtsverstoss. Hier wird nicht nur der Kanal
    bereinigt, sondern der Markenname aus dem Titel genommen — das Produkt bleibt verkäuflich.

⚠️ WAS BEWUSST STEHEN BLEIBT (jeder dieser Fehltreffer stand im ersten Entwurf drin):
   «Washed **Machete** Jeans» ist eine Waschung. «Knöchelboots mit **Stitch**-Detail» meint die
   Naht. «Japanischer Samurai mit Katana-Schwert, 30 cm» ist eine Dekofigur. «für Nintendo
   Switch» ist eine Kompatibilitätsangabe und erlaubt. Puma-, Adidas- und Hello-Kitty-Artikel
   von BigBuy sind echte Markenware, kein Nachbau. Die 59 Produkte mit Tag `kostuem-accessoire`
   sind zu 90 % gewöhnliche Handtaschen — der Tag beschreibt den Regalplatz des Lieferanten.

DRY=1 zeigt jeden Treffer mit Grund und Preis, ändert nichts.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_google_kanal_gesaeubert.txt"
GOOGLE = "gid://shopify/Publication/302872297857"
# 02.09.2026: SEIT=<tage> liest LIVE die seit N Tagen angelegten aktiven Produkte statt des
# Export-Schnappschusses. Grund: Der Lauf stand in KEINER Aufseher-Liste und las
# /tmp/export.jsonl vom 30.08. — 18 Feuerzeuge und 10 Rauchartikel aus Importen danach standen
# unbemerkt bei Google. Ein Wächter, der einen Schnappschuss liest, bewacht die Vergangenheit.
SEIT = int(os.environ.get("SEIT") or 0)
# Hausregel 29.08.: Eine Warengruppe, die aus dem Google-Kanal fliegt, gehört auch aus den
# übrigen WERBEkanälen — die Verbote sind dieselben. Online Store/Shop/POS bleiben unberührt.
WERBUNG = {
    "TikTok": "gid://shopify/Publication/302032716161",
    "Facebook & Instagram": "gid://shopify/Publication/302566834561",
    "Google & YouTube": GOOGLE,
    "Pinterest": "gid://shopify/Publication/302994456961",
}
ALLE_WERBEKANAELE = {"rauchzubehoer", "waffe", "waffe-verboten", "erotik", "cuttermesser-hausregel"}

# ── Rauchzubehör ──────────────────────────────────────────────────────────────
RAUCH_TITEL = re.compile(
    r'Aschenbecher|Zigarett\w*|Zigarr\w*|Zigarill\w*|Schnupftabak\w*|'
    r'Kohleanz[üu]nder|Shisha|Wasserpfeife|\bBong\b|\bGrinder\b|Feuerzeug|'
    r'Pfeifenreiniger|Humidor\w*|Tabakpfeif\w*|'
    r'Vape\b|E-Zigarette|Tabak(?:beutel|dose)?|'
    # 02.09.2026 Betreiber «kiffer zubehör rein · feuerzeug, papes, rips»: Nachschub über
    # cj_search_queue (rolling papers/tips/trays/grinder/stash). Die Importer publizieren in
    # alle sechs Kanäle — diese Stämme holen die Ware wieder aus den Werbekanälen. «Cone» und
    # «Tray» absichtlich NICHT allein (Eiswaffel, Serviertablett); nur in der Rauch-Bindung.
    r'Drehpapier|Papes\b|Rolling[- ]?(?:Paper|Tray)|Drehunterlage|Filter[- ]?Tips|'
    r'Kräutermühle|Stash[- ]?(?:Bag|Box|Jar)|Pre[- ]?Rolled|Blunt\b|Joint(?:hülle|halter|s)\b', re.I)
# «Anzünder» allein ist ein Grillanzünder; erst mit Kohle wird es Shisha.
# 02.09.2026 Live-Trockenlauf: «Multifunktionaler Mixer, Entsafter & Grinder» und «Zigarre,
# Maserung & Ölgemälde Leinwand-Set» (Malvorlage) fielen unter RAUCH_TITEL — Küchengerät und
# Bastelbedarf. Ein Gegenmuster statt einer Ausnahmeliste je Wort (Substring-Familie).
KEIN_RAUCH = re.compile(r'Mixer|Entsafter|Seifen|Kaffeem[üu]hle|Gewürzm[üu]hle|Leinwand|'
                        r'Ölgemälde|Malen nach Zahlen|Diamond Painting|Kostüm|Fasnacht|Spielzeug', re.I)
# ⚠️ 28.08.2026 — WARUM DIE STÄMME statt der Wortliste: Am 21.–26.08. legte der Grind NEUN
# Rauchzubehör-Artikel an, alle ACTIVE im Google-Kanal, sieben davon mit productType
# «Werkzeug & Heimwerken» (Tags heimwerken/neu/werkzeug) — die Warengruppen-Prüfung oben
# (`typ.startswith("raucher")`) läuft an dieser Tarnung vorbei, und der Tag-Test ebenso.
# Die alte Titel-Liste hätte nur VIER der neun gefangen: «Zigaretten(?:etui|halter|spitze|
# schachtel)» verlangt einen der vier Suffixe, «Zigarrenetui» das Wort ganz — deshalb rutschten
# «Zigarrenbohrer», «Zigarren-Lüftungsnadel», «Zigarren-Clip», «Zigarrenanzünder» und der
# «Zigaretten-Brecher» durch. Ein Stamm (Zigarr\w*/Zigarett\w*) kennt jede Zusammensetzung,
# die der nächste Import erfindet; eine Suffixliste kennt nur die vier, die man schon gesehen hat.
# BEWUSST OHNE Kostüm-/Deko-Ausnahme: Ein Fasnachts-Plastikzigarre aus dem Google-Kanal zu
# nehmen kostet ein Listing, ein übersehener Zigarrenbohrer kostet nach Googles
# «Prohibited Content» das ganze Konto — der einzige Kanal mit belegten Verkäufen.

# ── Waffen ────────────────────────────────────────────────────────────────────
# Ein Klingen-Nomen ist Pflicht. «Machete» allein trifft die «Washed Machete Jeans».
KLINGE = re.compile(
    r'Butterfly[- ]?Messer|Schmetterlingsmesser|'
    r'\bMachete\b(?!.*(?:Jeans|Hose|Shirt|Waschung))|'
    r'(?:Klapp|Survival|Jagd|Taktisch\w*|Outdoor|Wurf|Bajonett|Karambit)[- ]?Messer|'
    r'Messer.{0,30}(?:Klinge|Klingen)|(?:Gezackte|Feststehende|D2-)\s*Klinge|'
    r'Schlagring|Teleskopschlagstock|Butterflymesser|'
    r'Gewehrriemen|Waffenriemen|Pistolenholster|Schulterholster|Achselholster', re.I)
# «Achselholster» ergänzt 28.08.2026: CJ nennt 1775498255665737728 im Original
# «Neoprene Hidden Armpit Holster / 腋下枪套 … glock枪包» (Glock-Pistolentasche) und die
# Produktbilder zeigen eine Pistole samt Magazintasche — der deutsche Titel «Neopren-
# Achselholster» und der Text («taktische Einsätze») nennen die Waffe nirgends mehr.
# Der Artikel stand als productType «Taschen» im Google-Kanal.
# In der Schweiz nach WG Art. 4 verboten — nicht nur ein Google-Problem.
VERBOTEN = re.compile(r'Butterfly[- ]?Messer|Schmetterlingsmesser|Butterflymesser|'
                      r'Schlagring|Teleskopschlagstock|Wurfstern', re.I)
# Deko und Küche sind keine Waffen.
KEINE_WAFFE = re.compile(r'Dekofigur|Deko-Figur|Figur\b|Samurai|Statue|Briefö|Tortenmesser|'
                         r'K[äa]semesser|Buttermesser|Schmetterlings(?:kette|ohrring|brosche)', re.I)
# Cuttermesser mit Wechselklingen sind Werkzeug, keine Waffe — Google beanstandet sie nicht.
# Sie fliegen trotzdem raus, aber nach der HAUSREGEL «Messer nicht bewerben», nicht wegen
# eines Richtlinienverstosses. Der Unterschied gehört ins Ledger, sonst liest sich später
# jeder Eintrag wie ein Sperrgrund.
CUTTER = re.compile(r'Ersatzklingen|Wechselklingen|Schnellwechsel|Retraktions|Einziehmesser|'
                    r'Ausklappmesser|Cutter|Teppichmesser|Bastelmesser', re.I)

# ── Erotik ────────────────────────────────────────────────────────────────────
EROTIK_TAG = {"erotik-mode", "erotik", "adult", "18plus-erotik"}
# ⚠️ «Straps» stand im ersten Entwurf hier drin und traf zwei harmlose Produkte: «Damen
# Plus-Grössen **Straps** Flachschuhe» und «Leopard-Print **Straps** Gaze Kleid». Das ist das
# englische Wort für Riemen, wörtlich stehen gelassen — Riemchenschuhe und ein Trägerkleid,
# keine Reizwäsche. Das deutsche «Strapse» sieht identisch aus; deshalb fällt das Muster ganz
# weg und die Erotik-Erkennung stützt sich auf Tags und eindeutige Wörter.
EROTIK_TITEL = re.compile(r'Babydoll|Dessous|Reizw[äa]sche|Ouvert|'
                          r'Aufblasbare[rs]?\s+(?:Frauen|M[äa]nner)puppe|Liebespuppe', re.I)

# ── Fremde Marken im eigenen Titel ────────────────────────────────────────────
# NUR die «im X-Stil»-Bauform und klare Figurennamen. Echte Markenware (Puma-Schuh
# von BigBuy) trägt den Namen zu Recht und wird hier nicht erfasst.
MARKE_STIL = re.compile(r'\bim\s+(Chanel|Gucci|Prada|Dior|Louis Vuitton|Herm[èe]s|Rolex|'
                        r'Barbie|Balenciaga|Versace|Burberry)[- ]?Stil\b', re.I)
FIGUR = re.compile(r'\bIron[- ]?Man\b|\bPikachu\b|Super[- ]?Mario\b|Mickey[- ]?Mouse\b|'
                   r'\bSpiderman\b|\bSpider-Man\b|\bBatman\b|\bElsa\b(?!\w)', re.I)

# ── Refurbished ───────────────────────────────────────────────────────────────
REFURB = re.compile(r'Restauriert\w*\s*[A-C]\b|Restaurierte[rs]?\s+[A-C][- ]Ware|'
                    r'Generalüberholt|Refurbished|B-Ware', re.I)


def gql(q, v=None):
    with open("/tmp/_gks.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gks.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def pruefen(p):
    """Gibt (grund, zusatz) zurück oder None. Der erste Grund gewinnt — Reihenfolge = Schwere."""
    t = p["title"]
    typ = (p.get("productType") or "")
    tags = {x.lower() for x in (p.get("tags") or [])}
    html = p.get("descriptionHtml") or ""
    mf = {m["key"]: m["value"] for m in ((p.get("mf") or {}).get("nodes") or [])}

    if REFURB.search(html) and mf.get("condition") == "new":
        return "refurb-als-neu", "condition"
    if KLINGE.search(t) and not KEINE_WAFFE.search(t):
        if VERBOTEN.search(t):
            return "waffe-verboten", "draft"
        return ("cuttermesser-hausregel", "") if CUTTER.search(t) else ("waffe", "")
    if typ.lower().startswith("raucher") or {"raucher"} & tags or (RAUCH_TITEL.search(t) and not KEIN_RAUCH.search(t)):
        return "rauchzubehoer", ""
    if EROTIK_TAG & tags or EROTIK_TITEL.search(t):
        return "erotik", "kinder-typ" if typ.strip().lower() in ("kinder", "baby") else ""
    if {"nicht-bewerben", "nur-onlineshop"} & tags:
        return "als-nicht-bewerben-markiert", ""
    m = MARKE_STIL.search(t) or FIGUR.search(t)
    if m:
        return "fremde-marke-im-titel", m.group(0)
    return None


def titel_ohne_marke(t):
    """«Cropped Blazer im Chanel-Stil · Damen» → «Cropped Blazer · Damen»."""
    neu = MARKE_STIL.sub("", t)
    neu = re.sub(r'\s{2,}', ' ', neu).strip(" ·-–,")
    return neu


def produkte_live(tage):
    """Aktive Produkte der letzten N Tage, LIVE, in der Form des Exports (title, productType,
    tags, descriptionHtml, mf, priceRangeV2) plus `kanaele` = Werbekanäle, in denen sie stehen.
    `g` ist wahr, wenn das Produkt in IRGENDEINEM Werbekanal steht — geprüft wird dann gegen
    alle vier, nicht nur gegen Google. resourcePublicationsV2 statt publishedOnPublication:
    Letzteres braucht read_product_listings und macht sonst die GANZE Antwort null (22.08.)."""
    seit = time.strftime("%Y-%m-%d", time.gmtime(time.time() - tage * 86400))
    Q = """query($after:String,$q:String!){ products(first:100, after:$after, query:$q){
             pageInfo{ hasNextPage endCursor }
             nodes{ id title status productType tags descriptionHtml
                    priceRangeV2{ minVariantPrice{ amount } }
                    mf: metafields(first:3, keys:["mm-google-shopping.condition"]){ nodes{ key value } }
                    resourcePublicationsV2(first:8){ nodes{ publication{ name } } } } } }"""
    out, after = [], None
    while True:
        d = gql(Q, {"after": after, "q": f"status:active AND created_at:>={seit}"})
        if not d:
            print("⚠️ Live-Abfrage ohne Antwort — Abbruch statt stiller Lücke", flush=True)
            break
        conn = d["data"]["products"]
        for p in conn["nodes"]:
            kan = {r["publication"]["name"] for r in p["resourcePublicationsV2"]["nodes"]} & set(WERBUNG)
            p["kanaele"] = kan
            p["g"] = bool(kan)
            out.append(p)
        if not conn["pageInfo"]["hasNextPage"]:
            break
        after = conn["pageInfo"]["endCursor"]
        time.sleep(0.4)
    print(f"LIVE seit {seit}: {len(out)} aktive Produkte geprüft", flush=True)
    return out


def main():
    treffer = []
    quelle = produkte_live(SEIT) if SEIT else (json.loads(z) for z in open(EXPORT))
    for p in quelle:
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        r = pruefen(p)
        if r:
            treffer.append((p, r[0], r[1]))

    nach_grund = {}
    for p, grund, _ in treffer:
        nach_grund.setdefault(grund, []).append(p)
    print(f"Sperr-riskante Ware im Google-Kanal: {len(treffer)}", flush=True)
    for grund, ps in sorted(nach_grund.items(), key=lambda x: -len(x[1])):
        print(f"\n── {grund}: {len(ps)}", flush=True)
        for p in ps[:12 if DRY else 4]:
            pr = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
            print(f"     CHF {pr:>6.2f}  {p['title'][:56]:<58} [{(p.get('productType') or '—')[:18]}]",
                  flush=True)
    if DRY or not treffer:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = draft = titel = cond = 0
    for p, grund, zusatz in treffer:
        gid = p["id"]
        if gid in done:
            continue
        # 1. Aus dem Google-Kanal nehmen — das gilt für jeden Grund. Rauch/Waffe/Erotik
        #    zusätzlich aus TikTok, Facebook/Instagram und Pinterest (Hausregel 29.08.);
        #    Refurb/Marke sind Google-spezifisch und bleiben dort.
        if grund in ALLE_WERBEKANAELE:
            ziele = [WERBUNG[k] for k in (p.get("kanaele") or set(WERBUNG))]
        else:
            ziele = [GOOGLE]
        r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,'
                'input:$i){userErrors{message}}}', {"id": gid, "i": [{"publicationId": z} for z in ziele]})
        e = ((r.get("data") or {}).get("publishableUnpublish") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {p['title'][:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        # 2. Zusätzliche Massnahme je nach Grund.
        if zusatz == "draft":
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "status": "DRAFT"}})
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": ["waffengesetz-verboten"]})
            draft += 1
        elif zusatz == "condition":
            gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
                '{userErrors{message}}}',
                {"m": [{"ownerId": gid, "namespace": "mm-google-shopping",
                        "key": "condition", "type": "single_line_text_field",
                        "value": "refurbished"}]})
            cond += 1
        elif zusatz == "kinder-typ":
            # Erotikware in der Warengruppe «Kinder» — die Warengruppe ist schlicht falsch.
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "productType": "Damenmode"}})
        elif grund == "fremde-marke-im-titel" and MARKE_STIL.search(p["title"]):
            neu = titel_ohne_marke(p["title"])
            if len(neu) >= 12:
                gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                    {"i": {"id": gid, "title": neu}})
                titel += 1
        f.write(f"{gid}\t{grund}\t{p['title']}\n")
        f.flush()
        time.sleep(0.3)
    print(f"\nFERTIG: {n} aus dem Google-Kanal genommen · {draft} gedraftet (verbotene Waffe) · "
          f"{cond} condition korrigiert · {titel} Markenname aus dem Titel")


if __name__ == "__main__":
    main()
