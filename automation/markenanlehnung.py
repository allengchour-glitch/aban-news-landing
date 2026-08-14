"""Nimmt die Anlehnung an fremde Luxusmarken aus ALLEN Feldern — nicht nur aus dem Titel.

DER BEFUND (Fehlersuche 14.08.2026): 29 aktive Produkte bewerben sich als Nachahmung fremder
Marken («im Chanel-Stil», «Dr.-Martens-Stil», «Birkenstock-inspiriert»). Die Bereinigung vom
12.08. hat NUR den Titel angefasst — und dabei zweierlei hinterlassen:

 1. Die Aussage steht unverändert in Beschreibung (26×), SEO-Beschreibung (11×), SEO-Titel
    (2×) und in der URL (10×). Der Google-Feed liest Titel UND Beschreibung; «Impersonation/
    Counterfeit» ist bei Merchant ein Grund für die sofortige Kontosperre, und der Google-
    Kanal ist der einzige mit belegten Verkäufen. Zivilrechtlich genügt nach MSchG Art. 13
    Abs. 2 schon das Anlehnen im Werbetext.
 2. VIER TITEL SIND DABEI KAPUTTGEGANGEN und stehen so live im Shop: «Rundhals-Spitzentop im
    -Stil», «Warmer Strick-Cardigan im -Stil», «Kissenbezug mit Quasten im -Stil», «Herren
    Übergangsjacke im -Stil». Der Markenname wurde herausgeschnitten, die Hülle blieb stehen.

Das ist zum zweiten Mal dieselbe Lektion aus CLAUDE.md: «Wer eine Angabe aus einem Feld
entfernt, muss prüfen, welches ANDERE Feld sie getragen hat.»

⚠️ EINE MARKE IM TEXT IST NICHT IMMER EINE ANLEHNUNG. «Ladekabel für Apple iPhone» ist eine
Kompatibilitätsangabe und zulässig, Casio-Uhren von BigBuy sind echte Markenware. Das grobe
Muster (Marke irgendwo im Text) fand 2'968 Produkte — fast alles davon zu Recht. Getroffen
wird deshalb nur die Kombination aus Marke UND Nachahmungswort: «Chanel-Stil», «im Chanel»,
«Birkenstock-inspiriert». So bleiben 29.

⚠️ DEN MARKENNAMEN ERSATZLOS ZU STREICHEN ERZEUGT GENAU DIE VIER KAPUTTEN TITEL. Ersetzt wird
darum durch ein sachlich passendes Wort derselben Wortart, das im Kompositum keine Endung
verlangt: «im Chanel-Stil» → «im Boutique-Stil», «Dr.-Martens-Stil» → «Worker-Stil»,
«Birkenstock-inspiriert» → «Komfort-inspiriert». Der Satz bleibt heil, die Aussage bleibt
wahr, die Marke ist weg.

Die URL ist das zäheste Feld: sie überlebt jede Textkorrektur und ist genau das, was in der
Google-Suche verlinkt wird. Sie wird deshalb mitgeändert — IMMER mit 301-Weiterleitung von
der alten Adresse, sonst wird aus einem Markenproblem ein toter Link.

DRY=1 zeigt jede Änderung einzeln, ohne zu schreiben.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_markenanlehnung.txt"

# Marke → sachliches Ersatzwort. Bewusst je Warengruppe gewählt: ein Stiefel im «Boutique-Stil»
# wäre so schief wie eine Bluse im «Worker-Stil».
ERSATZ = {
    "chanel": "Boutique", "dior": "Boutique", "gucci": "Boutique", "prada": "Boutique",
    "versace": "Boutique", "burberry": "Boutique", "fendi": "Boutique", "celine": "Boutique",
    "bottega": "Boutique", "louis vuitton": "Boutique", "hermes": "Boutique",
    "hermès": "Boutique", "balenciaga": "Boutique", "supreme": "Street",
    "dr martens": "Worker", "dr. martens": "Worker", "dr.martens": "Worker",
    "birkenstock": "Komfort", "crocs": "Clog", "ugg": "Fell",
    "nike": "Sneaker", "adidas": "Sneaker", "yeezy": "Sneaker", "lululemon": "Sport",
    "rolex": "Klassik", "cartier": "Klassik", "tiffany": "Klassik",
    "ray-ban": "Piloten", "rayban": "Piloten", "ray ban": "Piloten",
}
MARKE = (r'(Chanel|Dr\.?\s?Martens|Birkenstock|Gucci|Prada|Rolex|Louis\s?Vuitton|Herm[eè]s|'
         r'Balenciaga|Dior|Versace|Cartier|Tiffany|Ray[- ]?Ban|Nike|Adidas|Yeezy|Crocs|UGG|'
         r'Lululemon|Supreme|Burberry|Fendi|Celine|Bottega)')
# Marke direkt vor einem Nachahmungswort …
MIT_WORT = re.compile(MARKE + r'([- ]?)(Stil|Style|inspiriert|Look|Optik)', re.I)
# … oder «im/à la <Marke>» ohne Nachahmungswort.
OHNE_WORT = re.compile(r'\b(im|à\s?la|a\s?la)\s+' + MARKE, re.I)
# Was der halbe Schnitt vom 12.08. hinterlassen hat.
KAPUTT = re.compile(r'\s*im\s+-\s*Stil|\s*im\s+-Stil', re.I)


def ersatz_fuer(name):
    k = re.sub(r'\s+', ' ', name.strip().lower()).replace('.', '')
    return ERSATZ.get(k) or ERSATZ.get(k.replace(' ', '')) or "Boutique"


def saeubern(text):
    if not text:
        return text
    neu = KAPUTT.sub('', text)
    neu = MIT_WORT.sub(lambda m: ersatz_fuer(m.group(1)) + '-' + m.group(3), neu)
    neu = OHNE_WORT.sub(lambda m: m.group(1) + ' ' + ersatz_fuer(m.group(2)) + '-Stil', neu)
    if neu == text:
        return text
    # ⚠️ NUR WAAGRECHTE LEERZEICHEN GLÄTTEN. Die erste Fassung liess `\s{2,}` über den ganzen
    # Text laufen — damit wurden in JEDER angefassten Beschreibung auch die Zeilenumbrüche des
    # HTML zusammengezogen. Bei einem Strick-Cardigan war das sogar die EINZIGE Änderung: ein
    # Produkt hätte eine umformatierte Beschreibung bekommen, ohne dass eine Marke darin stand.
    return re.sub(r'[ \t]{2,}', ' ', neu).strip()


def gql(q, v=None):
    with open("/tmp/_ma.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ma.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(4)
    return {}


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or p["id"] in erledigt:
            continue
        seo = p.get("seo") or {}
        felder = {"titel": p.get("title") or "", "seo_t": seo.get("title") or "",
                  "seo_d": seo.get("description") or "",
                  "beschr": p.get("descriptionHtml") or "", "handle": p.get("handle") or ""}
        if any(MIT_WORT.search(v) or OHNE_WORT.search(v) or KAPUTT.search(v)
               for v in felder.values()):
            kandidaten.append(p["id"])
    print(f"Produkte mit Marken-Anlehnung oder kaputtem Titelrest: {len(kandidaten)}", flush=True)

    f = None if DRY else open(LEDGER, "a")
    getan = umgeleitet = 0
    for gid in kandidaten:
        # ⚠️ IMMER LIVE NACHLESEN. Der Export ist vom 12.08.; ein Teil dieser Titel wurde seither
        # schon angefasst, und eine Regel auf einen veralteten Text angewandt schreibt Unsinn.
        d = gql('query($id:ID!){product(id:$id){title handle descriptionHtml seo{title description}}}',
                {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        alt = {"title": p["title"], "handle": p["handle"],
               "descriptionHtml": p["descriptionHtml"] or "",
               "seoT": (p["seo"] or {}).get("title") or "",
               "seoD": (p["seo"] or {}).get("description") or ""}
        neu = {k: saeubern(v) for k, v in alt.items()}
        # Der Handle darf keine Umlaute/Grossbuchstaben tragen.
        neu["handle"] = re.sub(r'-{2,}', '-',
                               re.sub(r'[^a-z0-9-]', '-', neu["handle"].lower())).strip('-')
        aendert = {k: v for k, v in neu.items() if v != alt[k]}
        if not aendert:
            continue
        getan += 1
        if DRY:
            print(f"\n  {gid}")
            for k in aendert:
                print(f"    {k}:\n      alt: {alt[k][:120]}\n      neu: {neu[k][:120]}")
            continue

        eingabe = {"id": gid}
        if "title" in aendert:
            eingabe["title"] = neu["title"]
        if "descriptionHtml" in aendert:
            eingabe["descriptionHtml"] = neu["descriptionHtml"]
        if "seoT" in aendert or "seoD" in aendert:
            eingabe["seo"] = {"title": neu["seoT"], "description": neu["seoD"]}
        if "handle" in aendert:
            eingabe["handle"] = neu["handle"]
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{handle} '
                'userErrors{message}}}', {"i": eingabe})
        fehler = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {gid}: {fehler[0]['message'][:70]}", flush=True)
            continue
        # Die alte Adresse steht in Googles Index — ohne Weiterleitung wird aus dem
        # Markenproblem ein 404 auf genau der Seite, die Besucher gerade bringt.
        if "handle" in aendert:
            rr = gql('mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r){'
                     'userErrors{message}}}',
                     {"r": {"path": "/products/" + alt["handle"],
                            "target": "/products/" + neu["handle"]}})
            if not ((rr.get("data") or {}).get("urlRedirectCreate") or {}).get("userErrors"):
                umgeleitet += 1
        f.write(f"{gid}\t{','.join(aendert)}\t{neu['title'][:60]}\n")
        f.flush()
        print(f"  ✓ {neu['title'][:50]}", flush=True)
        time.sleep(0.4)
    print(f"FERTIG: {getan} Produkte bereinigt, {umgeleitet} alte URLs mit 301 weitergeleitet.")


if __name__ == "__main__":
    main()
