#!/usr/bin/env python3
"""platzhalter_option.py — «Variante / Standard» bei Ein-Varianten-Ware entfernen (→ Shopifys «Title / Default Title») (09.10.2026).

ANLASS (Betreiber «verbessere mehr»): Die CJ-Importer legten jede Nicht-Mode-Ware mit der Platzhalter-Option «Variante» und dem
einzigen Wert «Standard» an. Shopify wertet nur «Title / Default Title» als «keine Auswahl» (hasOnlyDefaultVariant) — die
Produktseite zeigte darum ein Wahlfeld «Variante: Standard» mit einem einzigen Knopf und die Spezifikationen nochmals
«Variante: Standard» (WebFetch handpumpen-pumpe-fur-autos-779e8d, 09.10. 21:40 UTC). Export 04:28: 1'063 Produkte.
Zusätzlich hielt auswahl_nachruesten.py den Platzhalter für eine echte Option und baute nie um (19/40 besuchte Seiten).

Quelle repariert (cj_category_fill/cj_trending_import/cj_sku_import legen seit 09.10. «Title / Default Title» an); dieses
Skript räumt den Bestand und fängt Nachzügler (Runner mit altem Code bis zum Neustart).
WEG: Kandidaten aus dem Optionen-Export (EXPORT, Std. /tmp/farbmuster_export.jsonl — derselbe wie alter_im_farbwert/
farbcode_modell), live nachlesen (genau EINE Option «Variante» = [«Standard»], genau eine Variante, kein Editor/POD),
productOptionsDelete(strategy: POSITION), rücklesen: hasOnlyDefaultVariant, dieselbe Varianten-ID, SKU und Preis unverändert.
Ledger dropship/_platzhalter_option.tsv.
  python3 automation/platzhalter_option.py               # trocken
  SCHARF=1 [MAX=n] bash automation/shopify_schranke.sh python3 automation/platzhalter_option.py
"""
import datetime as dt, json, os, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_platzhalter_option.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX") or 2000)
POD = ("selbst-gestalten", "pod", "printful")


def kandidaten():
    out = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        o = p.get("options") or []
        if len(o) == 1 and o[0]["name"] == "Variante" and [v["name"] for v in o[0]["optionValues"]] == ["Standard"]:
            out.append(p["id"])
    return out


def main():
    from kaufwille_zeile import gql
    if not os.path.exists(EXPORT):
        print(f"PLATZHALTER: unklar (Export fehlt: {EXPORT})"); return 1
    try:
        fertig = {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if z.count("\t") >= 2 and "\tok\t" in z}
    except OSError:
        fertig = set()
    ks = [k for k in kandidaten() if k not in fertig]
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ} · {'SCHARF' if SCHARF else 'TROCKEN'} · {len(ks)} Kandidaten · MAX {MAX}",
          flush=True)
    zahl = {}
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for pid in ks[:MAX]:
        p = gql('query($i:ID!){product(id:$i){title status tags options{id name values} variantsCount{count} '
                'variants(first:2){nodes{id sku price}}}}', {"i": pid})["product"]
        if not p:
            st = "weg"
        elif any(t.lower() in POD for t in p["tags"]):
            st = "editor"
        elif [(o["name"], o["values"]) for o in p["options"]] != [("Variante", ["Standard"])] or p["variantsCount"]["count"] != 1:
            st = "live-anders"
        elif not SCHARF:
            st = "trocken"
        else:
            v0 = p["variants"]["nodes"][0]
            r = gql('mutation($p:ID!,$o:[ID!]!){productOptionsDelete(productId:$p,options:$o,strategy:POSITION){userErrors{message}}}',
                    {"p": pid, "o": [p["options"][0]["id"]]})["productOptionsDelete"]
            q = gql('query($i:ID!){product(id:$i){hasOnlyDefaultVariant variants(first:2){nodes{id sku price}}}}', {"i": pid})["product"]
            v1 = (q["variants"]["nodes"] or [{}])[0]
            if r["userErrors"]:
                st = "FEHLER " + r["userErrors"][0]["message"][:80]
            elif q["hasOnlyDefaultVariant"] and len(q["variants"]["nodes"]) == 1 and (v1.get("id"), v1.get("sku"), v1.get("price")) \
                    == (v0["id"], v0["sku"], v0["price"]):
                st = "ok"
            else:
                st = f"RÜCKLESEN ABWEICHEND {q}"[:160]
        k = st.split(" ")[0]; zahl[k] = zahl.get(k, 0) + 1
        if led and st != "trocken":
            led.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{pid}\t{st}\t{(p or {}).get('title', '')[:80]}\n"); led.flush()
        if k not in ("ok", "trocken"):
            print(f"  {st[:60]:60} {(p or {}).get('title', '')[:60]}", flush=True)
        if k in ("FEHLER", "RÜCKLESEN") and zahl.get("FEHLER", 0) + zahl.get("RÜCKLESEN", 0) >= 3:
            print("Abbruch nach 3 Fehlern — ein systematischer Fehler darf nicht alle Produkte anfassen"); break
    print(f"PLATZHALTER {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {zahl} · offen {max(0, len(ks) - MAX)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
