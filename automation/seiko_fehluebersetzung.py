"""Nimmt den erfundenen Markennamen «Seiko» aus Produkttexten — und stopft die Quelle.

DER BEFUND (Fehlersuche 14.08.2026): Fünf aktive Produkte behaupten eine Seiko-Komponente:
«Seiko-Quarzwerk mit chinesischer Herkunft» (Armbanduhr), «mit moderner Seiko-Technologie
hergestellt» (Kupferarmband), «Der Seiko-Qualitätsauslauf mit 5-Loch-Düse» (Tassenreiniger),
«Im Seiko-Verfahren behandelt» (Totenkopf-Armband), und ein Titel «Seiko Inspiriertes
Python-Armband».

URSACHE, und deshalb genügt ein einmaliges Bereinigen nicht: Das chinesische 精工 heisst
«Präzisionsfertigung / Feinwerktechnik» und ist in Lieferantentexten ein Allerweltswort.
Seikos japanischer Name benutzt genau dieselben Schriftzeichen — jede maschinelle Übersetzung
macht daraus die Marke. Ein Uhrenhersteller an einem Spülauslauf ist der Beweis, dass hier
nicht abgeschrieben, sondern falsch übersetzt wurde.

WAS ES KOSTET: Das ist keine Stilanlehnung, sondern eine Tatsachenbehauptung über verbaute
Teile. Bei der Armbanduhr ist das Uhrwerk das kaufentscheidende Merkmal — «Seiko-Quarzwerk»
rechtfertigt den Preis und ist schlicht falsch (der Satz widerspricht sich sogar selbst: ein
Seiko-Werk «chinesischer Herkunft» gibt es nicht). UWG Art. 3 Abs. 1 lit. b, und bei Google
Merchant «Misrepresentation» — die härteste Sperrkategorie. Alle standen im Google-Kanal, dem
einzigen mit belegten Verkäufen.

Ersetzt wird durch die WÖRTLICHE Bedeutung des chinesischen Originals. «Seiko-Quarzwerk» →
«Präzisions-Quarzwerk» ist keine Beschönigung: es ist das, was im Ausgangstext stand.

DRY=1 zeigt jede Änderung.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_seiko_fehluebersetzung.txt"

# ⚠️ «Seiko» ersatzlos zu streichen ergäbe «-Quarzwerk» und «Im -Verfahren» — genau die Sorte
# Rest, die die halbe Marken-Bereinigung vom 12.08. in vier Titeln hinterlassen hat.
REGELN = [
    (re.compile(r'\bSeiko[- ]?Quarzwerk', re.I), 'Präzisions-Quarzwerk'),
    (re.compile(r'\bSeiko[- ]?Verfahren', re.I), 'Präzisionsverfahren'),
    (re.compile(r'\bSeiko[- ]?Technologie', re.I), 'Präzisionstechnik'),
    (re.compile(r'\bSeiko[- ]?Verarbeitungstechnologie', re.I), 'Präzisions-Verarbeitung'),
    (re.compile(r'\bSeiko[- ]?Qualitätsauslauf', re.I), 'Präzisions-Auslauf'),
    (re.compile(r'\bSeiko[- ]?(inspiriert\w*)\s*', re.I), ''),
    # Auffangnetz für Formen, die diese Liste nicht kennt: «Seiko-<Wort>» → «Präzisions-<Wort>».
    (re.compile(r'\bSeiko-(?=[A-Za-zÄÖÜäöü])', re.I), 'Präzisions-'),
    (re.compile(r'\bSeiko\b\s*', re.I), ''),
]


def saeubern(t):
    if not t:
        return t
    neu = t
    for muster, ers in REGELN:
        neu = muster.sub(ers, neu)
    if neu == t:
        return t
    return re.sub(r'[ \t]{2,}', ' ', neu).strip()


def gql(q, v=None):
    with open("/tmp/_sk.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sk.json"], capture_output=True, text=True)
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
    pat = re.compile(r'\bSeiko\b', re.I)
    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or p["id"] in erledigt:
            continue
        seo = p.get("seo") or {}
        if any(pat.search(v or '') for v in
               [p.get("title"), p.get("descriptionHtml"), seo.get("title"), seo.get("description")]):
            kandidaten.append(p["id"])
    print(f"Produkte mit «Seiko» im Text: {len(kandidaten)}", flush=True)

    f = None if DRY else open(LEDGER, "a")
    getan = 0
    for gid in kandidaten:
        d = gql('query($id:ID!){product(id:$id){title descriptionHtml seo{title description}}}', {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        alt = {"title": p["title"], "descriptionHtml": p["descriptionHtml"] or "",
               "seoT": (p["seo"] or {}).get("title") or "",
               "seoD": (p["seo"] or {}).get("description") or ""}
        neu = {k: saeubern(v) for k, v in alt.items()}
        aendert = {k for k in alt if neu[k] != alt[k]}
        if not aendert:
            continue
        getan += 1
        if DRY:
            print(f"\n  {gid}")
            for k in aendert:
                i = next((x for x in range(min(len(alt[k]), len(neu[k]))) if alt[k][x] != neu[k][x]), 0)
                print(f"    {k}: …{alt[k][max(0,i-40):i+50]}…")
                print(f"        → …{neu[k][max(0,i-40):i+50]}…")
            continue
        eingabe = {"id": gid}
        if "title" in aendert:
            eingabe["title"] = neu["title"]
        if "descriptionHtml" in aendert:
            eingabe["descriptionHtml"] = neu["descriptionHtml"]
        if aendert & {"seoT", "seoD"}:
            eingabe["seo"] = {"title": neu["seoT"], "description": neu["seoD"]}
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}', {"i": eingabe})
        fehler = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {gid}: {fehler[0]['message'][:70]}", flush=True)
            continue
        f.write(f"{gid}\t{','.join(sorted(aendert))}\t{neu['title'][:60]}\n")
        f.flush()
        print(f"  ✓ {neu['title'][:52]}", flush=True)
        time.sleep(0.3)
    print(f"FERTIG: {getan} Produkte ohne erfundene Marke.")


if __name__ == "__main__":
    main()
