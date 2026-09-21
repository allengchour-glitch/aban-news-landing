#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""klinge_ch_wache.py — keine Klinge im Verkauf, die kein Lieferant liefern kann.

ANLASS (16.09.2026, Bestellung #1017). Ein Kunde bestellte ein Damast-Taschenmesser,
CJ nahm die Bestellung an, verschickte sie — und schickte sie am 15.09. aus Shanghai
zurueck: «prohibited item: a knife. There's no other way to ship it to Switzerland.»
Derselbe Kunde hatte dieselbe Ware schon am 03.09. bestellt (#1016) und dieselbe
Erstattung bekommen. Zweimal dieselbe Ursache, zweimal Geld zurueck, ein verlorener
Kunde.

DIE EIGENTLICHE LEHRE ist nicht «Klingen sind heikel» — das stand laengst im
Gedaechtnis. Sie ist: **ein Urteil, das niemand vollstreckt, ist keine Sicherung.**
`cj_versand_ch_sichtbar.py` hatte am 03./04.09. fuer 535 Handles gemessen und
protokolliert «KEINE CH-Option → DRAFT». Am 16.09. standen 95 davon immer noch im
Verkauf. Der Messlauf ohne FIX=1 schreibt nur die Quittung; den zweiten Schritt hat
nie jemand getan, und nichts hat das gemeldet. Diese Wache schliesst genau diese
Luecke: sie liest das Urteil und prueft den ZUSTAND dagegen.

Zwei unabhaengige Quellen, damit ein Ausfall der einen die andere nicht mitnimmt:
  1. das Versand-Ledger (`_cj_versand_ch_pruef.txt`, Urteil des Lieferanten)
  2. die Hausregel `ist_handklinge` ueber den Titel (faengt Neuimporte sofort,
     auch bevor je eine Frachtabfrage lief)

⚠️ `freightCalculate` allein reicht NICHT. Fuer #1017 hat CJ eine Versandoption
angeboten, das Paket angenommen, verschickt — und es dann als verbotenen Artikel
zurueckgeholt. Eine Frachtauskunft «ok» widerlegt die Kategorie also nicht; darum
sperrt Quelle 2 unabhaengig von Quelle 1.

Lauf:  python3 automation/klinge_ch_wache.py        # nur messen und melden
       FIX=1 python3 automation/klinge_ch_wache.py  # gefundene Ware draften
"""
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klingenregel import ist_handklinge                      # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_cj_versand_ch_pruef.txt")
QUITTUNG = os.path.join(REPO, "dropship", "_klinge_verboten_ch_0916.txt")
SHOP = "au3j0y-hq.myshopify.com"
FIX = os.environ.get("FIX") == "1"
TAGS = ["cj-nicht-versendbar-ch", "handklinge-kein-ch-versand"]

# ⚠️⚠️ KEINE TITEL-SUCHE (teuer belegt am 16.09.2026, Gegenprobe mit Koeder).
# Die erste Fassung fragte `title:messer*` ab und meldete «0 Handklingen im Verkauf»,
# waehrend das Fuda-TASCHENmesser — die Ware aus der zurueckgesandten Bestellung —
# aktiv im Shop stand. Shopify sucht auf WORT-Anfaengen: `messer*` findet «Messerset»,
# aber niemals «Taschenmesser», «Kochmesser», «Knochenhackmesser». Ein fuehrendes
# Sternchen hilft nicht — `title:*messer*` liefert gemessen exakt dasselbe wie ohne.
# Deutsche Zusammensetzungen tragen das Grundwort HINTEN, also ist eine Token-Suche
# fuer diese Frage grundsaetzlich blind. Einzige vollstaendige Quelle ist der
# Voll-Export; dieselbe Lehre wie bei der Titel-Wache der Importer (16c, 10.07.).
BULK = """{ products(query: "status:active") { edges { node {
            id title handle status
            variants(first: 1) { edges { node { sku } } } } } } }"""


def _tok():
    return open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None):
    letzte = None
    for i in range(8):
        r = urllib.request.Request(
            f"https://{SHOP}/admin/api/2026-01/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(),
            headers={"X-Shopify-Access-Token": _tok(), "Content-Type": "application/json"})
        try:
            d = json.loads(urllib.request.urlopen(r, timeout=60).read())
        except Exception as e:                      # Netz-/Anmeldefehler
            letzte = e
            time.sleep(2 + i * 2)
            continue
        if d.get("errors") and any("THROTTLED" in str(x) for x in d["errors"]):
            time.sleep(3 + i * 2)
            continue
        if d.get("data") is None:
            # Lehre 05.09.: ein leeres Ergebnis darf NIE wie «nichts gefunden»
            # aussehen — sonst meldet die Wache Ruhe, weil die Anmeldung weg ist.
            raise RuntimeError("GraphQL ohne data: " + json.dumps(d)[:200])
        return d
    raise RuntimeError(f"GraphQL nach 8 Versuchen erfolglos: {letzte}")


def aus_china(produkt):
    """Nur Ware ab CJ-Lager ist von der Sperre betroffen.

    Erster Lauf dieser Wache (16.09.) meldete vier Treffer — und alle vier waren
    falsch: drei Halloween-Requisiten und ein Deko-Katana ab SCHWEIZER Lager
    (SKU `fortura-…`). Fuer die faehrt kein Paket durch Shanghai, CJs Verbot gilt
    ihnen nicht. Die Klingenregel beantwortet «ist es eine Klinge?»; die Frage
    «kommt es aus China?» gehoert hierher, in den Aufrufer. Sonst raeumt eine
    Versandregel Ware aus einem Lager, das problemlos liefern kann.
    """
    sku = ((produkt.get("variants") or {}).get("nodes") or [{}])[0].get("sku") or ""
    return sku.upper().startswith("CJ")


def voll_export():
    """Alle aktiven Produkte als Liste — ueber bulkOperationRunQuery, nicht ueber Suche."""
    d = gql("""mutation($q:String!){bulkOperationRunQuery(query:$q){
                 bulkOperation{id status} userErrors{field message}}}""", {"q": BULK})
    ue = d["data"]["bulkOperationRunQuery"]["userErrors"]
    if ue:
        raise RuntimeError("Bulk abgelehnt: " + json.dumps(ue))
    url = None
    for _ in range(180):                     # bis 30 Minuten, Katalog ist gross
        time.sleep(10)
        c = gql("{currentBulkOperation{status url errorCode objectCount}}")["data"]["currentBulkOperation"]
        if c["status"] == "COMPLETED":
            url = c["url"]
            break
        if c["status"] in ("FAILED", "CANCELED"):
            raise RuntimeError(f"Bulk {c['status']}: {c.get('errorCode')}")
    if not url:
        raise RuntimeError("Bulk lief in die Zeitgrenze")
    roh = urllib.request.urlopen(url, timeout=300).read().decode("utf-8")
    produkte, skus = {}, {}
    for z in roh.splitlines():
        if not z.strip():
            continue
        o = json.loads(z)
        if o.get("__parentId"):              # Variantenzeile
            skus.setdefault(o["__parentId"], o.get("sku") or "")
        elif o.get("id", "").startswith("gid://shopify/Product/"):
            produkte[o["id"]] = o
    for pid, sku in skus.items():
        if pid in produkte:
            produkte[pid]["variants"] = {"nodes": [{"sku": sku}]}
    return list(produkte.values())


def aktive_klingen():
    """Aktive CJ-Produkte, deren Titel eine Handklinge bezeichnet."""
    alle = voll_export()
    print(f"  (Voll-Export: {len(alle)} aktive Produkte gelesen)")
    return [p for p in alle if ist_handklinge(p.get("title") or "") and aus_china(p)]


def aktive_ohne_ch_option():
    """Handles, fuer die der Lieferant KEINE CH-Versandoption gemeldet hat — und die
    trotzdem noch aktiv sind. Das ist die nicht vollstreckte Quittung."""
    if not os.path.exists(LEDGER):
        return []
    handles = {z.rstrip("\n").split("\t")[0]
               for z in open(LEDGER, encoding="utf-8")
               if len(z.split("\t")) > 4 and z.split("\t")[4].startswith("KEINE")}
    aktiv = []
    hs = sorted(h for h in handles if h)
    for i in range(0, len(hs), 40):
        teil = hs[i:i + 40]
        q = "{" + " ".join(
            f'p{j}: productByHandle(handle:"{h}"){{id title handle status}}'
            for j, h in enumerate(teil)) + "}"
        for v in (gql(q).get("data") or {}).values():
            if v and v["status"] == "ACTIVE":
                aktiv.append(v)
    return aktiv


def draften(produkte, grund):
    m = """mutation($id:ID!,$t:[String!]!){productUpdate(input:{id:$id,status:DRAFT,tags:$t}){
             product{handle status} userErrors{message}}}"""
    ok = 0
    zeilen = []
    for p in produkte:
        r = (gql(m, {"id": p["id"], "t": TAGS}).get("data") or {}).get("productUpdate") or {}
        # Zustand lesen, nicht die Absicht: eine Mutation ohne userErrors hat schon
        # mehrfach nichts geschrieben (Lehre 15.09.).
        if (r.get("product") or {}).get("status") == "DRAFT":
            ok += 1
            zeilen.append(f"{p['handle']}\tDRAFT\t{grund}")
        else:
            print(f"  ⚠️ nicht gedraftet: {p['handle']} {r.get('userErrors')}")
    if zeilen:
        with open(QUITTUNG, "a", encoding="utf-8") as f:
            f.write("\n".join(zeilen) + "\n")
    return ok


def main():
    try:
        nach_regel = aktive_klingen()
        nach_ledger = aktive_ohne_ch_option()
    except Exception as e:
        # Eine Wache, die ihren Fehler verschweigt, meldet Ruhe (Lehre 15.09.:
        # «eine Erfolgsmeldung, die nicht vom Ergebnis abhaengt, ist Dekoration»).
        print(f"KLINGEN-WACHE: unklar — {type(e).__name__}: {e}")
        return 2

    ids = {p["id"] for p in nach_regel}
    zusammen = nach_regel + [p for p in nach_ledger if p["id"] not in ids]
    if not zusammen:
        print("KLINGEN-WACHE: 0 Handklingen im Verkauf, 0 unvollstreckte Versand-Urteile")
        return 0

    print(f"KLINGEN-WACHE: {len(zusammen)} kaufbar, die nicht in die CH gehen "
          f"({len(nach_regel)} nach Hausregel, {len(nach_ledger)} mit Lieferanten-Urteil)")
    for p in zusammen[:15]:
        print("   ", p["handle"][:60], "|", (p["title"] or "")[:50])
    if len(zusammen) > 15:
        print(f"    … und {len(zusammen)-15} weitere")

    if FIX:
        n1 = draften(nach_regel, "Handklinge — kein CH-Versand (Hausregel, Klasse #1017)")
        n2 = draften([p for p in nach_ledger if p["id"] not in ids],
                     "Lieferant meldet keine CH-Versandoption")
        print(f"KLINGEN-WACHE: {n1+n2} gedraftet")
    else:
        print("KLINGEN-WACHE: nur gemessen — mit FIX=1 draften")
    return 1


if __name__ == "__main__":
    sys.exit(main())
