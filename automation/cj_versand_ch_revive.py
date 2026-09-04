#!/usr/bin/env python3
"""cj_versand_ch_revive.py — Drafts wiederbeleben, die CJ jetzt DOCH in die Schweiz liefert.

ANLASS (04.09.2026): Der CJ-Agent hat auf Nachfrage zu Bestellung #1016 einen neuen Kanal
freigeschaltet — «CJPacket EQ Sensitive». Gemessen statt geglaubt: das Messer aus #1016 hat
damit eine CH-Linie (USD 7.30), und in einer Stichprobe von 15 gedrafteten Produkten sind
9 wieder lieferbar. 1'001 Produkte tragen `cj-nicht-versendbar-ch` und stehen auf DRAFT.

⚠️ EINE QUITTUNG GILT NUR FUER DIE WELT, IN DER SIE AUSGESTELLT WURDE. Die Drafts waren zu
ihrer Zeit richtig — CJ hatte keine Linie. Jetzt hat sich nicht unsere Regel geaendert,
sondern die WIRKLICHKEIT beim Lieferanten. Deshalb wird hier jede Absage neu gemessen.

WAS ES PRUEFT, in dieser Reihenfolge:
  1. Traegt das Produkt AUSSER `cj-nicht-versendbar-ch` noch einen Risiko-Tag? → Finger weg.
     (medizinprodukt, waffengesetz, duplikat, keine-lieferanten-ref, ausverkauft, …)
  2. Gibt CJ heute eine CH-Linie? Keine → bleibt DRAFT, Quittung `keine-linie`.
  3. Traegt der Preis die GEMESSENE Fracht? Die Kostenzahl in Shopify enthaelt eine
     GESCHAETZTE Fracht (3.84 + 16.42·kg, cj_preis.mjs); die wird herausgerechnet und die
     echte eingesetzt. Verlust → bleibt DRAFT, Quittung `lieferbar-aber-verlust`.
     Das ist die Lehre vom 28.08.: bei schwerer Ware entscheidet das GEWICHT, nicht der Preis.
  4. Sonst: Tag weg, Status ACTIVE, publiziert in **Online Store + Shop**.
     ⚠️ Bewusst NICHT in den Google-Kanal. Ueber den entscheidet der tägliche
     `google_kanal_luecke_schliessen` mit seinen eigenen Regeln (Klingen-Hausregel,
     Sperr-Tags, Heilaussagen) — ein Fehlgriff dort kostet das Merchant-Konto.

  DRY=1   nur zeigen        CAP=N   hoechstens N Produkte je Lauf (Standard 60)
Ledger: dropship/_cj_versand_ch_revive.txt
"""
import json, os, re, ssl, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_cj_versand_ch_revive.txt")
PRUEF = os.path.join(REPO, "dropship", "_cj_versand_ch_pruef.txt")
DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "60"))
TAG = "cj-nicht-versendbar-ch"
KURS = 0.9                     # USD→CHF, konservativ wie im ganzen Repo
VERSANDERLOES = 7.0            # der Kunde zahlt CHF 7 (Einzelbestellung)
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")

RISIKO = {"medizinprodukt-pruefen", "waffengesetz-verboten", "duplikat-auto-draft",
          "keine-lieferanten-ref", "ausverkauft-lieferant", "cj-abgekuendigt",
          "marge-verlust-draft", "nicht-lieferbar-ch", "verdeckte-ueberwachung",
          "abhoergeraet-pruefen", "waffe-pruefen", "tierschutz-geraet",
          "bb-versand-unrentabel", "lager-unbekannt-draft"}

ONLINE = "gid://shopify/Publication/301970915713"
SHOP = "gid://shopify/Publication/301971014017"

SHOPAPI = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"


def shoptok():
    return open("/tmp/cj_shop_token.txt").read().strip()


def sgql(q, v=None, versuche=8):
    for i in range(versuche):
        try:
            req = urllib.request.Request(SHOPAPI, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                         headers={"X-Shopify-Access-Token": shoptok(),
                                                  "Content-Type": "application/json"})
            r = json.loads(urllib.request.urlopen(req, timeout=60, context=CTX).read())
        except Exception:
            time.sleep(2 * (i + 1)); continue
        errs = r.get("errors") or []
        if any("Throttled" in str(e.get("message", "")) for e in errs):
            ts = ((r.get("extensions") or {}).get("cost") or {}).get("throttleStatus", {})
            noetig = (((r.get("extensions") or {}).get("cost") or {}).get("requestedQueryCost", 150)
                      - ts.get("currentlyAvailable", 0))
            time.sleep(min(30, max(1.0, noetig / max(1, ts.get("restoreRate", 100))) + 0.5)); continue
        if errs:
            sys.stderr.write(f"GQL: {str(errs[:1])[:150]}\n"); return None
        return r.get("data")
    return None


def cjtok():
    d = json.load(open("/tmp/cj_token.json"))
    return d.get("accessToken") or (d.get("data") or {}).get("accessToken")


def cj(pfad, pl):
    req = urllib.request.Request("https://developers.cjdropshipping.com/api2.0/v1/" + pfad,
                                 data=json.dumps(pl).encode(),
                                 headers={"CJ-Access-Token": cjtok(), "Content-Type": "application/json"})
    leer = 0
    for i in range(10):
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=45, context=CTX).read())
        except Exception:
            time.sleep(2 * (i + 1)); continue
        code = str(r.get("code"))
        if code == "1600200" or "Too Many" in str(r.get("message", "")):
            time.sleep(1.5); continue
        # ⚠️ 16900500 kommt auch bei LEEREM EIMER, nicht nur am Tagesende (Lehre 03.09.).
        # Erst nach fuenf Wartezyklen gilt es als erschoepft.
        if code == "16900500":
            leer += 1
            if leer >= 5:
                return {"code": "16900500"}
            time.sleep(20); continue
        return r
    return {"code": "timeout"}


def alt_fracht(kg):
    """Die GESCHAETZTE Fracht, die in der Kostenzahl steckt (cj_preis.mjs, Stand 23.08.)."""
    return max(5.0, 3.84 + 16.42 * kg)


def main():
    vids = {}
    if os.path.exists(PRUEF):
        for z in open(PRUEF, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 2 and t[1] and t[1] != "-":
                vids[t[0]] = t[1]
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {z.split("\t")[0] for z in open(LEDGER, encoding="utf-8") if z.strip()}

    Q = """query($c:String){ products(first:50, after:$c, query:"tag:%s AND status:draft"){
      pageInfo{hasNextPage endCursor}
      nodes{ id handle title tags
        priceRangeV2{minVariantPrice{amount}}
        variants(first:1){nodes{ inventoryItem{ unitCost{amount}
            measurement{weight{value unit}} } }} } } }""" % TAG

    kand, c = [], None
    while True:
        d = sgql(Q, {"c": c})
        if d is None:
            print("PAUSE (Shopify stumm) — kein Ergebnis ist kein Befund."); return 1
        pg = d["products"]
        for p in pg["nodes"]:
            pid = p["id"].split("/")[-1]
            if pid in fertig:
                continue
            if RISIKO & set(p["tags"] or []):
                continue
            if p["handle"] not in vids:
                continue                       # ohne vid keine Frachtanfrage
            kand.append(p)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        c = pg["pageInfo"]["endCursor"]

    print(f"Drafts mit {TAG}: {len(kand)} pruefbar (ohne Risiko-Tag, mit vid, nicht quittiert)")
    n_ok = n_keine = n_verlust = n_unklar = 0
    led = open(LEDGER, "a", encoding="utf-8") if not DRY else None

    for p in kand[:CAP]:
        pid = p["id"].split("/")[-1]
        vid = vids[p["handle"]]
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        v = (p["variants"]["nodes"] or [{}])[0]
        ii = (v.get("inventoryItem") or {})
        kosten_alt = ((ii.get("unitCost") or {}) or {}).get("amount")
        kosten_alt = float(kosten_alt) if kosten_alt else None
        gw = ((ii.get("measurement") or {}).get("weight") or {})
        kg = (float(gw.get("value") or 0) / 1000.0) if gw.get("unit") == "GRAMS" else float(gw.get("value") or 0)

        r = cj("logistic/freightCalculate", {"startCountryCode": "CN", "endCountryCode": "CH",
                                             "products": [{"quantity": 1, "vid": vid}]})
        if str(r.get("code")) == "16900500":
            print("CJ-Tagesbudget erschoepft — Rest morgen."); break
        if str(r.get("code")) not in ("200",):
            n_unklar += 1
            print(f"?  {p['title'][:44]:46} code={r.get('code')} — NICHT quittiert")
            continue                            # unklar wird nie quittiert
        linien = r.get("data") or []
        if not isinstance(linien, list) or not linien:
            n_keine += 1
            print(f"✗  {p['title'][:44]:46} weiterhin keine CH-Linie")
            if led: led.write(f"{pid}\tkeine-linie\t{p['handle']}\n"); led.flush()
            continue
        billig = min(linien, key=lambda x: float(x.get("logisticPrice") or 999))
        fr_chf = float(billig.get("logisticPrice") or 0) * KURS

        if kosten_alt is not None and kg > 0:
            ware = max(0.0, kosten_alt - alt_fracht(kg))
            kosten_neu = ware + fr_chf
        elif kosten_alt is not None:
            kosten_neu = kosten_alt            # ohne Gewicht keine Korrektur moeglich
        else:
            kosten_neu = fr_chf + 12.0         # ohne Kostenzahl konservativ schaetzen
        gewinn = preis + VERSANDERLOES - kosten_neu

        if gewinn <= 0:
            n_verlust += 1
            print(f"⚖  {p['title'][:44]:46} lieferbar, aber Verlust {gewinn:+.2f} "
                  f"(VK {preis:.2f}, Fracht {fr_chf:.2f}) → bleibt DRAFT")
            if led: led.write(f"{pid}\tlieferbar-aber-verlust\t{p['handle']}\t{gewinn:.2f}\n"); led.flush()
            continue

        print(f"✓  {p['title'][:44]:46} {billig.get('logisticName')} {fr_chf:.2f} CHF · Gewinn {gewinn:+.2f}")
        n_ok += 1
        if DRY:
            continue
        a = sgql("mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}",
                 {"id": p["id"], "t": [TAG]})
        b = sgql("mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message} product{status}}}",
                 {"i": {"id": p["id"], "status": "ACTIVE"}})
        if not b or (b["productUpdate"]["userErrors"]):
            print(f"   ⛔ nicht aktiviert: {b and b['productUpdate']['userErrors']}")
            continue
        # publishVerified: die Antwort LESEN — genau ihr Fehlen hat am 22.08. 85 Produkte
        # aus dem Google-Kanal gehalten.
        pb = sgql("""mutation($id:ID!,$p:[PublicationInput!]!){
                 publishablePublish(id:$id,input:$p){userErrors{message}
                 publishable{ ... on Product{ resourcePublicationsV2(first:12){
                   nodes{publication{name} isPublished}}}}}}""",
                  {"id": p["id"], "p": [{"publicationId": ONLINE}, {"publicationId": SHOP}]})
        kanaele = []
        if pb and not pb["publishablePublish"]["userErrors"]:
            kanaele = [n["publication"]["name"] for n in
                       pb["publishablePublish"]["publishable"]["resourcePublicationsV2"]["nodes"]
                       if n["isPublished"]]
        if "Online Store" not in kanaele:
            print(f"   ⛔ nicht im Onlineshop ({kanaele}) — NICHT quittiert")
            continue
        led.write(f"{pid}\twiederbelebt\t{p['handle']}\t{fr_chf:.2f}\t{gewinn:.2f}\n"); led.flush()
        time.sleep(0.3)

    print(f"\n{'[DRY] ' if DRY else ''}wiederbelebt {n_ok} · keine Linie {n_keine} · "
          f"lieferbar-aber-Verlust {n_verlust} · unklar {n_unklar}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
