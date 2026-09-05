"""Nimmt die Kaschmir-Behauptung aus Titeln, deren eigener Text ein anderes Material nennt.

DER BEFUND (15.08.2026): 48 aktive Produkte tragen «Kaschmir/Cashmere» im Titel. 11 davon
schwächen ehrlich ab («Kaschmir-Gefühl», «Faux-Kaschmir», «-Look», «-Effekt», «-Haptik»,
«-Print») — die sind in Ordnung und bleiben. Bei zehn weiteren nennt die EIGENE Beschreibung
ein anderes Material: «Kaschmir-Pullover» aus Polyester, «Kaschmir-Cardigan» aus Viskose,
eine «Decke aus Baumwolle und Kaschmir», deren Materialangabe Acryl sagt.

Kaschmir ist wie «Leder» eine geschützte Bezeichnung (Textilkennzeichnung); ein Polyester-
Pullover als Kaschmir ist UWG Art. 3 Abs. 1 lit. b und bei Google Merchant Misrepresentation
— dieselbe Kategorie wie die erfundenen Seiko-Werke. Und der Widerspruch steht für die Kundin
SICHTBAR auf derselben Seite: Titel sagt Kaschmir, Materialzeile sagt Polyester.

⚠️ NUR DIE BELEGTEN FÄLLE. Wo die Beschreibung KEIN Gegenmaterial nennt, wird nichts
geändert — eine Behauptung ohne Gegenbeweis zu «korrigieren» wäre selbst eine Erfindung.
⚠️ «Kaschmirblau» ist eine FARBE, kein Material — ausgeschlossen.

Ersetzt wird durch «… in Kaschmir-Optik»: die weiche Anmutung bleibt als ehrliche Aussage,
die Faserbehauptung ist weg. Geprüft wird IMMER live, nicht gegen den Export.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_kaschmir_wahrheit.txt"

WEICH = re.compile(r'gef[üu]hl|[äa]hnlich|faux|print|blend|imitat|touch|optik|style|look|'
                   r'effekt|haptik|kaschmirblau', re.I)
GEGEN = re.compile(r'\b(Polyester|Acryl|Polyacryl|Viskose|Nylon|Spandex|Elasthan)\b', re.I)

# Kompositum («Kaschmirbluse») und Bindestrich («Kaschmir-Pullover») → «<Stück> in
# Kaschmir-Optik». Reihenfolge: spezifisch vor allgemein.
REGELN = [
    (re.compile(r'(Kaschmir|Cashmere)[- ]?(Bluse|Pullover|Cardigan|Top|Leggings|Handschuhe|'
                r'Jacke|Weste|Mantel|Kurzmantel|Hoodie|Schal|Socken|Stricktop|Wollpullover|'
                r'Strickpullover|F[äa]ustlinge|Halsw[äa]rmer|Haustierjacke)', re.I),
     lambda m: m.group(2)[0].upper() + m.group(2)[1:] + ' in Kaschmir-Optik'),
    (re.compile(r'\baus (Jacquard)-(Kaschmir|Cashmere)\b', re.I), r'aus \1, Kaschmir-Optik'),
    (re.compile(r'\baus Baumwolle und (Kaschmir|Cashmere)\b', re.I),
     'aus Baumwolle, Kaschmir-Optik'),
    (re.compile(r'\baus (Kaschmir|Cashmere)\b', re.I), 'in Kaschmir-Optik'),
    (re.compile(r'\b(Winter|Lamm)[- ]?(Kaschmir|Cashmere)\b', re.I), r'\1'),
    (re.compile(r'\b(Kaschmir|Cashmere)\b[- ]?', re.I), 'Kaschmir-Optik '),
]


def saeubern(t):
    if WEICH.search(t):
        return t
    neu = t
    for rx, ers in REGELN:
        if rx.search(neu):
            neu = rx.sub(ers, neu, count=1)
            break
    neu = re.sub(r'\s{2,}', ' ', neu).strip(' -·')
    # Doppelte Optik-Nennung («… in Kaschmir-Optik in Kaschmir-Optik») abfangen.
    neu = re.sub(r'(in Kaschmir-Optik)(.*)\1', r'\1\2', neu)
    return neu


def gql(q, v=None):
    with open("/tmp/_kw.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_kw.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
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
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or p["id"] in erledigt:
            continue
        if re.search(r'kaschmir|cashmere', p.get("title") or '', re.I):
            kandidaten.append(p["id"])
    print(f"Kandidaten mit Kaschmir im Titel: {len(kandidaten)}", flush=True)

    f = None if DRY else open(LEDGER, "a")
    getan = belegt_nicht = weich = 0
    for gid in kandidaten:
        d = gql('query($id:ID!){product(id:$id){title descriptionHtml '
                'mat:metafield(namespace:"mm-google-shopping",key:"material"){value}}}', {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        t = p["title"]
        if WEICH.search(t):
            weich += 1
            continue
        text = re.sub(r'<[^>]+>', ' ', p.get("descriptionHtml") or '')
        gegen = GEGEN.findall(text)
        if not gegen:
            belegt_nicht += 1
            continue
        neu = saeubern(t)
        if neu == t:
            continue
        getan += 1
        if DRY:
            print(f"   {t[:48]:<50} → {neu[:52]}   (Text: {','.join(sorted(set(g.title() for g in gegen)))})")
            continue
        eingabe = {"id": gid, "title": neu}
        # Ein material-Metafeld «Cashmere/Kaschmir» wäre dieselbe Falschangabe im Feed.
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}', {"i": eingabe})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        mat = (p.get("mat") or {}).get("value") or ''
        if re.search(r'kaschmir|cashmere', mat, re.I):
            gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',
                {"m": [{"ownerId": gid, "namespace": "mm-google-shopping", "key": "material",
                        "type": "single_line_text_field", "value": sorted(set(g.title() for g in gegen))[0]}]})
        f.write(f"{gid}\t{neu[:60]}\n")
        f.flush()
        print(f"  ✓ {neu[:56]}", flush=True)
        time.sleep(0.3)
    print(f"FERTIG: {getan} Titel ehrlich gemacht; {belegt_nicht} ohne Gegenbeweis belassen, "
          f"{weich} schon abgeschwächt.")


if __name__ == "__main__":
    main()
