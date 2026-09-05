"""Korrigiert `age_group=newborn` bei Ware, die Neugeborenen um Jahre zu gross ist.

DER BEFUND: 164 aktive Produkte melden Google `newborn` — das ist bei Google ausdrücklich
«bis 3 Monate». 34 davon führen Grössen von 90 bis 130 cm Körpergrösse (ca. 2 bis 8 Jahre).
Wer im Google-Shopping nach Neugeborenen-Ware filtert, bekommt Schulkind-Outfits; Merchant
wertet den Widerspruch zwischen Grössenangabe und age_group als Datenqualitätsfehler.

DIE ZUORDNUNG folgt Googles eigener Definition über die GRÖSSTE angebotene Grösse:
   bis 80 cm  → newborn/infant bleibt (nicht angefasst — die Messlatte hier sind die 34)
   bis 110 cm → toddler  (1–5 Jahre)
   darüber    → kids     (5–13 Jahre)
Ein Produkt, das 90–130 cm überspannt, bekommt `kids` — ein gröberer richtiger Wert ist im
Feed besser als ein präziser falscher (dieselbe Lehre wie bei den Google-Kategorien).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_newborn_altersgruppe.txt"


def gql(q, v=None):
    with open("/tmp/_na.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_na.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(4)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    alter, opts = {}, {}
    for l in open("/tmp/meta.jsonl"):
        d = json.loads(l)
        if "__parentId" not in d and ((d.get("age") or {}) or {}).get("value") == "newborn":
            alter[d["id"]] = d.get("title", "")
    for l in open("/tmp/opts_keep.jsonl"):
        d = json.loads(l)
        if d["id"] in alter:
            opts[d["id"]] = d.get("options") or []

    aufgaben = []
    for pid, os_ in opts.items():
        if pid in erledigt:
            continue
        cm = []
        for o in os_:
            if o["name"].lower() not in ("grösse", "groesse", "size", "grosse"):
                continue
            for v in (o["values"] or []):
                m = re.search(r'\b(\d{2,3})\s*cm\b', str(v))
                if m:
                    cm.append(int(m.group(1)))
        if not cm or max(cm) <= 80:
            continue
        # ⚠️ NICHT vom Maximum allein: die LIVE-Optionen können sich seit dem Export geändert
        # haben — der Wert wird vor dem Schreiben nochmals live gelesen.
        aufgaben.append((pid, alter[pid], max(cm)))
    print(f"newborn-Produkte mit zu grossen Grössen: {len(aufgaben)}", flush=True)

    f = None if DRY else open(LEDGER, "a")
    getan = 0
    for pid, t, _ in aufgaben:
        d = gql('query($id:ID!){product(id:$id){options{name values}}}', {"id": pid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        cm = [int(m.group(1)) for o in p["options"]
              if o["name"].lower() in ("grösse", "groesse", "size", "grosse")
              for v in o["values"] for m in [re.search(r'\b(\d{2,3})\s*cm\b', str(v))] if m]
        if not cm or max(cm) <= 80:
            continue
        wert = "toddler" if max(cm) <= 110 else "kids"
        if DRY:
            print(f"   {t[:46]:<48} max {max(cm)}cm → {wert}")
            getan += 1
            continue
        r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',
                {"m": [{"ownerId": pid, "namespace": "mm-google-shopping", "key": "age_group",
                        "type": "single_line_text_field", "value": wert}]})
        if ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors"):
            continue
        getan += 1
        f.write(f"{pid}\t{wert}\t{t[:50]}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {getan} Altersgruppen korrigiert.")


if __name__ == "__main__":
    main()
