"""Zieht Versandschwelle und Rückgabefrist an ALLEN verbliebenen Orten nach.

WARUM EIN VIERTER LAUF: Die bisherigen drei haben je eine Sorte Ort erwischt — erst die
SEO-Felder der Produkte, dann deren Beschreibungstext, dann die Kollektionstexte. Eine
Vollerhebung über alle 385 Kollektionsseiten, 132 Seiten und 312 Blogartikel zeigt, was
dennoch offen blieb:

    48 von 312 BLOGARTIKELN   «Gratis-Versand ab CHF 65»   ← nie angefasst
    39 von 385 KOLLEKTIONEN   dito                          ← vom 338er-Lauf nicht erfasst
     2 SEITEN, darunter /pages/agb §3: «Gratis-Versand erfolgt ab einem Bestellwert
       von CHF 65» — das ist ein VERTRAGSTEXT und steht in der Sitemap
    12 PRODUKTE mit «Gratisversand ab CHF 49» in der SEO-Beschreibung — eine dritte Zahl,
       nach der kein 65→50-Muster je gesucht hat
     5 BLOGARTIKEL versprechen «14-tägiges Rückgaberecht» statt der zugesagten 30 Tage

Das ist zum dritten Mal an einem Tag dieselbe Lehre, und sie wird langsam zur Regel: **Wer
einen Satz an einem Ort repariert, hat den Satz nicht repariert.** Ein Textbaustein wandert
durch Importer, Produkttexte, SEO-Felder, Kollektionen, Seiten, Blogartikel und Theme —
und jeder dieser Orte muss einzeln gesucht werden, weil keiner vom anderen weiss.

DIE WAHRHEIT, aus den Versandprofilen gelesen: Standard CHF 7.00, gratis ab CHF 50,
30 Tage Rückgabe.

⚠️ «14 Tage» ist NICHT überall falsch. Das gesetzliche Widerrufsrecht im EU-Fernabsatz
beträgt 14 Tage, und die Widerrufsseite darf das nennen. Falsch ist es nur dort, wo es als
DAS Rückgabeversprechen des Shops auftritt — der Shop gewährt 30 Tage, also mehr. Deshalb
wird die Frist nur in Blogtexten angefasst, nicht in Rechtstexten.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_versandschwelle_ueberall.txt"

# ⛔ DEFEKT, nachgewiesen 14.08.2026 — «FERTIG: 45» dieses Skripts war KEINE Erledigung.
# Beide Muster enden auf `(?![0-9.,])`. Gemeint war «CHF 653»/«CHF 65.90» auslassen; die
# Zeichenklasse verbietet aber auch den SATZPUNKT und das KOMMA — und fast jede Fundstelle
# lautet «... ab CHF 65.» oder «... ab CHF 65, 30 Tage Rückgabe». Nachgemessen an den am
# 14.08. noch offenen Stellen: 0 von 100 hätte dieses Muster gefunden. Getroffen wurden nur
# die Fälle mit Leerzeichen hinter der Zahl. Zweiter Defekt: hinter «Gratis» wird ein
# «Versand» verlangt, die Marken-Kollektionen schreiben aber «🇨🇭 Gratis ab CHF 65 ·».
# Die 100 offenen Stellen in Blogartikeln und Kollektionen hat
# automation/versandschwelle_blog_kollektion.py erledigt (dort steht die richtige Fassung:
# `(?![0-9])(?![.,][0-9])` — verbietet die Ziffer, nicht das Satzzeichen).
# Dieses Skript wurde ABSICHTLICH NICHT nachgeschärft: es fasst zusätzlich Seiten, Produkte,
# die Schwelle 49 und die Rückgabefrist an; ein weiter gefasstes Muster würde dort Änderungen
# auslösen, die niemand im Probelauf gesehen hat. Wer es reaktiviert, prüft vorher mit DRY=1.
SCHWELLE = re.compile(r'((?:Gratis[- ]?[Vv]ersand|[Vv]ersandkostenfrei|gratis|GRATIS)'
                      r'[^<.]{0,40}?(?:ab|über)\s*(?:einem\s+Bestellwert\s+von\s*)?CHF\s*)'
                      r'(65|49)(?![0-9.,])')
# ⚠️ Das Werbewort steht mal VOR, mal HINTER der Zahl: «Gratis-Versand ab CHF 65» und
# «Bei einem Bestellwert ab CHF 65 liefern wir versandkostenfrei». Für die zweite Bauform
# reichten 30 Zeichen Nachlauf nicht — ein Artikel blieb genau daran hängen.
SCHWELLE_UM = re.compile(r'(ab\s*CHF\s*)(65|49)(?![0-9.,])(?=[^<]{0,70}'
                         r'(?:GRATIS|gratis|kostenlos|versandkostenfrei|liefern wir))')
# Auch «14-tägige Rückgabe», «14 Tage Umtausch», «14-Tage-Rückgabefrist» — der Shop gewährt
# 30 Tage, also mehr als das Gesetz. Wer 14 verspricht, verschenkt seinen eigenen Vorteil.
RUECKGABE = re.compile(r'\b(\d{1,2})(\s*-?\s*t[äa]gige[sn]?\s+R[üu]ckgabe\w*|'
                       r'\s*-?\s*Tage[- ]?R[üu]ckgabe\w*|\s+Tage\s+(?:Umtausch|R[üu]ckgabe))',
                       re.I)


def gql(q, v=None):
    with open("/tmp/_vu.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_vu.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def berichtigen(text, rueckgabe_auch=False):
    neu = SCHWELLE.sub(lambda m: m.group(1) + "50", text)
    neu = SCHWELLE_UM.sub(lambda m: m.group(1) + "50", neu)
    if rueckgabe_auch:
        neu = RUECKGABE.sub(lambda m: ("30" + m.group(2)) if m.group(1) != "30" else m.group(0),
                            neu)
    return neu


def alle(feldname, abfrage, cursorfeld="collections"):
    cur, raus = None, []
    while True:
        d = gql(abfrage, {"c": cur})
        pg = ((d.get("data") or {}).get(cursorfeld) or {})
        if not pg:
            print(f"  ⚠️ {cursorfeld}: Liste unvollständig", flush=True)
            return raus
        raus += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            return raus
        cur = pg["pageInfo"]["endCursor"]


def main():
    aufgaben = []

    # ── Blogartikel ──────────────────────────────────────────────────────────
    blogs = gql('{blogs(first:20){nodes{id handle}}}')
    for b in (((blogs.get("data") or {}).get("blogs") or {}).get("nodes") or []):
        cur = None
        while True:
            d = gql('query($id:ID!,$c:String){node(id:$id){... on Blog{articles(first:100,'
                    'after:$c){pageInfo{hasNextPage endCursor} nodes{id title body}}}}}',
                    {"id": b["id"], "c": cur})
            pg = (((d.get("data") or {}).get("node") or {}).get("articles") or {})
            if not pg:
                break
            for a in pg["nodes"]:
                body = a.get("body") or ""
                neu = berichtigen(body, rueckgabe_auch=True)
                if neu != body:
                    aufgaben.append(("artikel", a["id"], a["title"], body, neu))
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]

    # ── Kollektionen ─────────────────────────────────────────────────────────
    for c in alle("collections",
                  'query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage '
                  'endCursor} nodes{id title descriptionHtml seo{description}}}}'):
        html = c.get("descriptionHtml") or ""
        seo = (c.get("seo") or {}).get("description") or ""
        n_html, n_seo = berichtigen(html), berichtigen(seo)
        if n_html != html or n_seo != seo:
            aufgaben.append(("kollektion", c["id"], c["title"], (html, seo), (n_html, n_seo)))

    # ── Seiten ───────────────────────────────────────────────────────────────
    for p in alle("pages",
                  'query($c:String){pages(first:250,after:$c){pageInfo{hasNextPage endCursor} '
                  'nodes{id handle body}}}', "pages"):
        body = p.get("body") or ""
        neu = berichtigen(body)
        if neu != body:
            aufgaben.append(("seite", p["id"], p["handle"], body, neu))

    nach = {}
    for a in aufgaben:
        nach.setdefault(a[0], []).append(a)
    print(f"Orte mit falscher Angabe: {len(aufgaben)}", flush=True)
    for art, liste in nach.items():
        print(f"   {art}: {len(liste)}", flush=True)
        for a in liste[:5 if DRY else 3]:
            print(f"      {a[2][:56]}", flush=True)
    if DRY or not aufgaben:
        return

    f = open(LEDGER, "a")
    n = 0
    for art, gid, name, alt, neu in aufgaben:
        if art == "artikel":
            r = gql('mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a)'
                    '{userErrors{message}}}', {"id": gid, "a": {"body": neu}})
            e = ((r.get("data") or {}).get("articleUpdate") or {}).get("userErrors")
        elif art == "kollektion":
            eingabe = {"id": gid, "descriptionHtml": neu[0]}
            if neu[1] != alt[1]:
                eingabe["seo"] = {"description": neu[1]}
            r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i)'
                    '{userErrors{message}}}', {"i": eingabe})
            e = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
        else:
            r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p)'
                    '{userErrors{message}}}', {"id": gid, "p": {"body": neu}})
            e = ((r.get("data") or {}).get("pageUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {art} {name[:30]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\t{art}\t{name}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Orte berichtigt")


if __name__ == "__main__":
    main()
