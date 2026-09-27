#!/usr/bin/env python3
"""montage_auswahl.py — stellt aus dem ganzen Katalog ein Themen-Set für ein Sammel-Video zusammen und schreibt eine
Varianten-JSON für promo_montage.py (27.09.2026, Betreiber: «ganz verschieden und mehrere produkten hast ja 50k auswahl
kannst ja längere videos machen und passenden text?»).

Auswahl (alles live aus Shopify, nichts aus dem Kopf):
  * ACTIVE + im Onlineshop, Preis im Themenband, ≥ 2 Bilder mit kurzer Kante ≥ 560 px
  * keine Marken-/Lizenzwörter (promo_montage.MARKE), kein Kostüm/Erotik/Klinge/Medizin im Titel
  * Bild ohne Lieferanten-Werbetext: bildtext_pruefen.py (KACHELN=1) < 4 Wörter — sonst nächstes Bild/Produkt
  * verschieden: keine zwei Produkte mit denselben ersten zwei Titelwörtern; nie ein Produkt aus einer früheren Montage
    (Ledger dropship/_montage_done.txt, erst nach erfolgreichem Rendern gefüllt)
  * bevorzugt Produkte mit Bewertungen (reviews.rating_count), dann neueste
Anzeigename = die ersten Titelwörter bis ≤ 34 Zeichen (promo_montage prüft: nur Wörter aus dem Shopify-Titel).

  python3 automation/reel/montage_auswahl.py --thema gadgets --n 6 --dauer 24 --out /tmp/montage_gadgets.json
  python3 automation/reel/promo_montage.py --json /tmp/montage_gadgets.json --out-dir /tmp/montage
"""
import argparse, datetime, json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, "..", ".."))
sys.path.insert(0, HIER)
import promo_montage as pm  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_montage_done.txt")

THEMEN = {
    "gadgets":   {"q": "status:active tag:gadget", "preis": (14.9, 40), "hook": ["Gadgets, die", "du brauchst"], "emoji": "\U0001F4A1",
                  "gattung": "Gadgets", "musik": "luxe-epic-anime.wav", "deko": "keine"},
    "kueche":    {"q": "status:active tag:kueche", "preis": (14.9, 45), "hook": ["Küchenhelfer,", "die begeistern"], "emoji": "\U0001F373",
                  "gattung": "Küchenhelfer", "musik": "luxe-epic-anime.wav", "deko": "keine"},
    "haustier":  {"q": "status:active tag:haustier", "preis": (14.9, 45), "hook": ["Für deinen", "Liebling"], "emoji": "\U0001F43E",
                  "gattung": "Tier-Favoriten", "musik": "luxe-epic-anime.wav", "deko": "sterne"},
    "herbst":    {"q": "status:active tag:herbst-2026", "preis": (14.9, 60), "hook": ["Herbst-Favoriten", "für dich"], "emoji": "\U0001F342",
                  "gattung": "Herbst-Favoriten", "musik": "luxe-epic-anime.wav", "deko": "laub"},
    "fitness":   {"q": "status:active tag:fitness", "preis": (14.9, 50), "hook": ["Fit werden", "zu Hause"], "emoji": "\U0001F4AA",
                  "gattung": "Fitness-Helfer", "musik": "luxe-epic-anime.wav", "deko": "keine"},
}
VERBOTEN = re.compile(r"\b(kostüm|kostum|erotik|sexy|dessous|messer|klinge|machete|dolch|schwert|therapie|heil\w*|"
                      r"schmerz\w*|medizin\w*|perücke|perucke|lizenz|set\s*\d{2,})", re.I)

Q = """query($q:String!,$c:String){ products(first:40, after:$c, query:$q, sortKey:CREATED_AT, reverse:true){
  pageInfo{ hasNextPage endCursor }
  nodes{ handle title productType status onlineStoreUrl tags priceRangeV2{ minVariantPrice{ amount } }
         metafield(namespace:"reviews", key:"rating_count"){ value }
         media(first:12){ nodes{ mediaContentType ... on MediaImage{ image{ url width height } } } } } } }"""


def kurzname(titel, maxlen=34):
    t = re.split(r"\s[–—|]\s|,|\(", titel)[0].strip()
    w = t.split()
    out = []
    for x in w:
        if len(" ".join(out + [x])) > maxlen:
            break
        out.append(x)
    return " ".join(out) or w[0][:maxlen]


def textfrei(url):
    try:
        r = subprocess.run(["python3", os.path.join(REPO, "automation", "bildtext_pruefen.py"), "--url", url],
                           capture_output=True, text=True, timeout=120, env={**os.environ, "KACHELN": "1"})
        n = int(r.stdout.strip().split("\n")[-1])
        return 0 <= n < 4
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--thema", required=True, choices=sorted(THEMEN))
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--dauer", type=float, default=24.0)
    ap.add_argument("--bilder", type=int, default=3, help="Bilder je Produkt (schnelle Wechsel)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--musik")
    a = ap.parse_args()
    th = THEMEN[a.thema]
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if "\t" in z}
    kand, cur = [], None
    for _ in range(10):
        d = pm.gql(Q, {"q": th["q"], "c": cur})["products"]
        for p in d["nodes"]:
            preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
            bilder = [(i, m["image"]) for i, m in enumerate(x for x in p["media"]["nodes"] if x["mediaContentType"] == "IMAGE" and x.get("image"))
                      if min(m["image"]["width"], m["image"]["height"]) >= 560]
            if (p["status"] != "ACTIVE" or not p["onlineStoreUrl"] or p["handle"] in fertig or len(bilder) < 2
                    or not th["preis"][0] <= preis <= th["preis"][1] or pm.MARKE.search(p["title"] + " " + " ".join(p["tags"]))
                    or VERBOTEN.search(p["title"])):
                continue
            rc = int((p.get("metafield") or {}).get("value") or 0)
            kand.append({"handle": p["handle"], "titel": p["title"], "typ": (p.get("productType") or "").lower(), "preis": preis, "bewertungen": rc, "bilder": bilder})
        if not d["pageInfo"]["hasNextPage"] or len(kand) >= 160:
            break
        cur = d["pageInfo"]["endCursor"]
    kand.sort(key=lambda k: -k["bewertungen"])
    # 27.09.2026 (erster Lauf: 3 von 6 «Gadgets» waren Smartwatches — Betreiber will «ganz verschieden»):
    # je Produkttyp höchstens eins, und kein gemeinsames Kernwort (≥ 6 Buchstaben) mit einem schon gewählten Titel.
    wahl, typen, kernwoerter = [], set(), set()
    for k in kand:
        # Hauptwort = erstes grossgeschriebenes Wort mit ≥ 4 Buchstaben ohne Zahl («F64 Smart Armbanduhr» → «smart»,
        # «Kinder Smartwatch» → «kinder»); dazu Uhr-/Watch-Familie zusammengefasst. Die erste Fassung (alle Wörter ≥ 6)
        # sperrte über «bluetooth»/«anschluss» fast alles (Lauf 27.09.: nur 2 von 60 Kandidaten).
        haupt = next((w for w in k["titel"].split() if w[:1].isupper() and len(w) >= 4 and not any(c.isdigit() for c in w)), k["titel"].split()[0])
        kw = {pm.norm(haupt).strip()}
        if re.search(r"uhr|watch", pm.norm(k["titel"])):
            kw.add("uhr-familie")
        if (k["typ"] and k["typ"] in typen) or (kw & kernwoerter):
            continue
        # 27.09.: nach genug sauberen Bildern aufhören (vorher wurden ALLE bis zu 12 Bilder je Kandidat per OCR geprüft —
        # bei Last 24 lief die Auswahl in die 28-min-Grenze); höchstens 5 Bilder je Kandidat ansehen.
        ok_bilder = []
        for i, im in k["bilder"][:5]:
            if textfrei(im["url"]):
                ok_bilder.append(i)
                if len(ok_bilder) >= a.bilder:
                    break
        if len(ok_bilder) < 2:
            print(f"   – {k['handle']}: zu wenig textfreie Bilder")
            continue
        typen.add(k["typ"]); kernwoerter |= kw
        wahl.append({"handle": k["handle"], "name": kurzname(k["titel"]), "bilder": ok_bilder})
        print(f"   ✓ {k['preis']:6.2f}  ★{k['bewertungen']:<3} {k['titel'][:60]}  → Bilder {ok_bilder}")
        if len(wahl) >= a.n:
            break
    if len(wahl) < 3:
        sys.exit(f"Nur {len(wahl)} geeignete Produkte für «{a.thema}» — kein Video")
    datum = datetime.date.today().isoformat()
    var = {"datei": f"montage_{a.thema}_{datum}.mp4", "musik": a.musik or th["musik"], "einstieg": 0, "dauer": a.dauer,
           "hook": th["hook"], "emoji": th["emoji"], "gattung": th["gattung"], "deko": th["deko"],
           "titel": f"LuxeStyle {th['gattung']}", "thema": a.thema, "produkte": wahl}
    json.dump(var, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"→ {a.out}: {len(wahl)} Produkte, {a.dauer:.0f} s, {var['musik']}")


if __name__ == "__main__":
    main()
