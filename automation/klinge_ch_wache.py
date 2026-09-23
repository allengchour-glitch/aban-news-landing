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

⚠️⚠️ PING-PONG (gemessen 22.09.2026). Die Wache draftete am 16.09. 207 Klingen. Der
Rueckholer `cj_versand_ch_revive.py` holte noch am selben Tag fuenf davon zurueck
(inkl. das Fuda-Taschenmesser aus #1017) und am 21.09. 22:10Z den Samurai-Katana —
sein Risiko-Set kannte den Sperr-Tag nicht, und «freightCalculate ok» galt ihm als
Beweis. Drei Ursachen auf dieser Seite, alle hier behoben:
  (a) Die Wache las nur `status:active`. Eine gedraftete Klinge ohne Sperr-Tag bekam
      ihn nie, und jeder Rueckholer «ohne Risiko-Tag» durfte sie reaktivieren.
      Jetzt: Voll-Export ueber ACTIVE **und** DRAFT; Drafts bekommen nur die Tags.
  (b) Die Wache schrieb Tags per `productUpdate(input:{tags})` — das ERSETZT alle
      Tags. 104 Produkte trugen danach nur noch die zwei Sperr-Tags: kein `cj-real`,
      keine Kategorie, kein `bild-ok`. Jetzt: nur `tagsAdd`, nie `productUpdate(tags)`.
  (c) Niemand sah, WER reaktiviert. Jetzt steht der Verursacher (`product.events`,
      juengstes «draft to active») im Bericht und in der Quittung.
Die Gegenseite (das Tor im Rueckholer) importiert `klingen_tor()` von HIER — eine
Regelquelle, zwei Fragen: Sperr-Tag ODER Hausregel → nie reaktivieren.

Lauf:  python3 automation/klinge_ch_wache.py        # nur messen und melden
       FIX=1 python3 automation/klinge_ch_wache.py  # gefundene Ware draften/taggen
"""
import json
import os
import re
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
SPERR_TAG = "handklinge-kein-ch-versand"
TAGS = ["cj-nicht-versendbar-ch", SPERR_TAG]

# ⚠️⚠️ KEINE TITEL-SUCHE (teuer belegt am 16.09.2026, Gegenprobe mit Koeder).
# Die erste Fassung fragte `title:messer*` ab und meldete «0 Handklingen im Verkauf»,
# waehrend das Fuda-TASCHENmesser — die Ware aus der zurueckgesandten Bestellung —
# aktiv im Shop stand. Shopify sucht auf WORT-Anfaengen: `messer*` findet «Messerset»,
# aber niemals «Taschenmesser», «Kochmesser», «Knochenhackmesser». Ein fuehrendes
# Sternchen hilft nicht — `title:*messer*` liefert gemessen exakt dasselbe wie ohne.
# Deutsche Zusammensetzungen tragen das Grundwort HINTEN, also ist eine Token-Suche
# fuer diese Frage grundsaetzlich blind. Einzige vollstaendige Quelle ist der
# Voll-Export; dieselbe Lehre wie bei der Titel-Wache der Importer (16c, 10.07.).
# 22.09.: ACTIVE **und** DRAFT (Ping-Pong-Lehre (a) oben) und `tags` mitlesen.
BULK = """{ products(query: "status:active OR status:draft") { edges { node {
            id title handle status tags
            variants(first: 1) { edges { node { sku } } } } } } }"""


def klingen_tor(titel, tags):
    """Das EINE Tor vor jeder Reaktivierung: (gesperrt, grund).

    Zwei unabhaengige Fragen, jede fuer sich ausreichend:
      1. Traegt das Produkt den Sperr-Tag `handklinge-kein-ch-versand`? Dann hat eine
         Wache oder ein Mensch geurteilt — ein Rueckholer hebt das nicht auf. (Der
         Katana vom 21.09. hiess «Japanischer Samurai mit Katana-Schwert, 30 cm»; der
         Tag haette gereicht, das Risiko-Set des Rueckholers kannte ihn nicht.)
      2. Sagt die Hausregel `ist_handklinge(titel)` Klinge? Dann liegt eine Klinge im
         Paket, egal was `freightCalculate` heute antwortet (#1017: Option ja, Paket
         zurueck).
    Wer reaktiviert, ruft das VOR der Status-Mutation auf und loggt den Grund. Die
    Lieferantenfrage («kommt es aus China?») bleibt beim Aufrufer — s. `aus_china`.
    """
    for t in tags or []:
        if t == SPERR_TAG:
            return True, f"Sperr-Tag {SPERR_TAG}"
    if ist_handklinge(titel or ""):
        return True, "Handklinge nach Hausregel (klingenregel.ist_handklinge)"
    return False, ""


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
    """Alle aktiven UND gedrafteten Produkte — ueber bulkOperationRunQuery, nicht ueber Suche."""
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
    return export_lesen(roh.splitlines())


def export_lesen(zeilen):
    """JSONL des Bulk-Exports → Produktliste mit variants.nodes[0].sku (auch fuer Tests)."""
    produkte, skus = {}, {}
    for z in zeilen:
        if not z.strip():
            continue
        o = json.loads(z)
        if o.get("__parentId"):              # Variantenzeile
            skus.setdefault(o["__parentId"], o.get("sku") or "")
        elif o.get("id", "").startswith("gid://shopify/Product/"):
            if isinstance(o.get("tags"), str):
                o["tags"] = [t.strip() for t in o["tags"].split(",") if t.strip()]
            o.setdefault("tags", [])
            produkte[o["id"]] = o
    for pid, sku in skus.items():
        if pid in produkte:
            produkte[pid]["variants"] = {"nodes": [{"sku": sku}]}
    return list(produkte.values())


def klingen_sortieren(alle):
    """(aktive Klingen, gedraftete Klingen OHNE Sperr-Tag) — beides CJ-Ware nach Hausregel.

    Drafts mit Sperr-Tag sind erledigt (das Tor haelt sie). Drafts OHNE Sperr-Tag sind
    die stille Klasse (a): heute unsichtbar, morgen von einem Rueckholer reaktiviert.
    """
    aktiv, draft_ohne_tag = [], []
    for p in alle:
        if not (ist_handklinge(p.get("title") or "") and aus_china(p)):
            continue
        if p.get("status") == "ACTIVE":
            aktiv.append(p)
        elif p.get("status") == "DRAFT" and SPERR_TAG not in (p.get("tags") or []):
            draft_ohne_tag.append(p)
    return aktiv, draft_ohne_tag


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
            f'p{j}: productByHandle(handle:"{h}"){{id title handle status tags}}'
            for j, h in enumerate(teil)) + "}"
        for v in (gql(q).get("data") or {}).values():
            if v and v["status"] == "ACTIVE":
                aktiv.append(v)
    return aktiv


_AKTIVIERT = re.compile(r"status from draft to active", re.I)


def verursacher(pid):
    """Wer hat das Produkt zuletzt auf ACTIVE gestellt? Aus `product.events`.

    Alle unsere Automaten laufen ueber EINE Custom-App («autopilot2»), der appTitle
    allein unterscheidet sie also nicht — der Zeitstempel tut es: er passt auf das Log
    des Rueckholers (21.09. 22:10:41Z = `cj_versand_ch_revive`, gemessen am Katana).
    """
    try:
        d = gql("""query($id:ID!){ product(id:$id){ events(first:20, sortKey:CREATED_AT, reverse:true){
                     nodes{ appTitle createdAt message } } } }""", {"id": pid})
        for e in ((d["data"].get("product") or {}).get("events") or {}).get("nodes") or []:
            if _AKTIVIERT.search(e.get("message") or ""):
                return f"{e.get('appTitle') or 'unbekannt'} {e.get('createdAt')}"
    except Exception as e:                  # Verursacher ist Zusatzinfo, kein Tor
        return f"unklar ({type(e).__name__})"
    return "unbekannt (kein draft→active-Ereignis in den letzten 20)"


def _ruecklesen(pid):
    d = gql("query($id:ID!){product(id:$id){status tags}}", {"id": pid})
    p = (d.get("data") or {}).get("product") or {}
    return p.get("status"), set(p.get("tags") or [])


def taggen(produkte, grund, status_erwartet):
    """Sperr-Tags per tagsAdd (NIE productUpdate(tags) — Lehre (b)), dann RUECKLESEN."""
    ok = 0
    zeilen = []
    for p in produkte:
        r = (gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
                 {"id": p["id"], "t": TAGS}).get("data") or {}).get("tagsAdd") or {}
        st, tags = _ruecklesen(p["id"])
        if st == status_erwartet and set(TAGS) <= tags:
            ok += 1
            zeilen.append(f"{p['handle']}\t{st}\t{grund}")
        else:
            print(f"  ⚠️ nicht getaggt: {p['handle']} status={st} fehlt={set(TAGS)-tags} {r.get('userErrors')}")
    if zeilen:
        with open(QUITTUNG, "a", encoding="utf-8") as f:
            f.write("\n".join(zeilen) + "\n")
    return ok


def draften(produkte, grund):
    """ACTIVE → DRAFT (nur der Status!) + tagsAdd, Zustand ruecklesen, Verursacher notieren."""
    m = """mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){
             product{handle status} userErrors{message}}}"""
    ok = 0
    zeilen = []
    for p in produkte:
        wer = verursacher(p["id"])
        r = (gql(m, {"id": p["id"]}).get("data") or {}).get("productUpdate") or {}
        gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
            {"id": p["id"], "t": TAGS})
        # Zustand lesen, nicht die Absicht: eine Mutation ohne userErrors hat schon
        # mehrfach nichts geschrieben (Lehre 15.09.).
        st, tags = _ruecklesen(p["id"])
        if st == "DRAFT" and set(TAGS) <= tags:
            ok += 1
            zeilen.append(f"{p['handle']}\tDRAFT\t{grund} · reaktiviert von {wer}")
            print(f"  ⛔ gedraftet: {p['handle'][:55]} — reaktiviert von {wer}")
        else:
            print(f"  ⚠️ nicht gedraftet: {p['handle']} status={st} {r.get('userErrors')}")
    if zeilen:
        with open(QUITTUNG, "a", encoding="utf-8") as f:
            f.write("\n".join(zeilen) + "\n")
    return ok


def main():
    try:
        alle = voll_export()
        print(f"  (Voll-Export: {len(alle)} Produkte ACTIVE+DRAFT gelesen)")
        nach_regel, draft_ohne_tag = klingen_sortieren(alle)
        nach_ledger = aktive_ohne_ch_option()
    except Exception as e:
        # Eine Wache, die ihren Fehler verschweigt, meldet Ruhe (Lehre 15.09.:
        # «eine Erfolgsmeldung, die nicht vom Ergebnis abhaengt, ist Dekoration»).
        print(f"KLINGEN-WACHE: unklar — {type(e).__name__}: {e}")
        return 2

    ids = {p["id"] for p in nach_regel}
    zusammen = nach_regel + [p for p in nach_ledger if p["id"] not in ids]
    if not zusammen and not draft_ohne_tag:
        print("KLINGEN-WACHE: 0 Handklingen im Verkauf, 0 unvollstreckte Versand-Urteile, "
              "0 Drafts ohne Sperr-Tag")
        return 0

    if zusammen:
        print(f"KLINGEN-WACHE: {len(zusammen)} kaufbar, die nicht in die CH gehen "
              f"({len(nach_regel)} nach Hausregel, {len(nach_ledger)} mit Lieferanten-Urteil)")
        for p in zusammen[:15]:
            print("   ", p["handle"][:60], "|", (p["title"] or "")[:50],
                  "| reaktiviert von", verursacher(p["id"]))
        if len(zusammen) > 15:
            print(f"    … und {len(zusammen)-15} weitere")
    if draft_ohne_tag:
        print(f"KLINGEN-WACHE: {len(draft_ohne_tag)} gedraftete Klingen OHNE Sperr-Tag "
              f"(fuer jeden Rueckholer «ohne Risiko-Tag» reaktivierbar)")
        for p in draft_ohne_tag[:10]:
            print("   ", p["handle"][:60], "|", (p["title"] or "")[:50])

    if FIX:
        n1 = draften(nach_regel, "Handklinge — kein CH-Versand (Hausregel, Klasse #1017)")
        n2 = draften([p for p in nach_ledger if p["id"] not in ids],
                     "Lieferant meldet keine CH-Versandoption")
        n3 = taggen(draft_ohne_tag, "Draft ohne Sperr-Tag — Tor gesetzt (Ping-Pong 22.09.)", "DRAFT")
        print(f"KLINGEN-WACHE: {n1+n2} gedraftet, {n3} Drafts mit Sperr-Tag versehen")
        # Nach dem Vollstrecken den Zustand messen, nicht die Absicht.
        try:
            for t in TAGS:
                c = gql('{productsCount(query:"status:active tag:%s"){count precision}}' % t)["data"]["productsCount"]
                print(f"  MESSUNG status:active tag:{t} = {c['count']} ({c['precision']})")
        except Exception as e:
            print(f"  MESSUNG unklar: {e}")
    else:
        print("KLINGEN-WACHE: nur gemessen — mit FIX=1 draften/taggen")
    return 1


if __name__ == "__main__":
    sys.exit(main())
