"""Räumt widersprüchliche Lagerstände auf.

ANLASS (Sauber-Lauf 2026-08-10): Fünf aktive Produkte melden Bestand 0. Sie zerfallen in
zwei völlig verschiedene Fälle, die man nicht gleich behandeln darf:

 A) DENY + 0 + tracked  → das Produkt ist im Shop sichtbar, aber NICHT kaufbar
    («Ausverkauft»-Knopf). Für Kunden und Google ist das eine tote Seite. Solche Artikel
    gehören auf DRAFT, bis der Lieferant wieder liefert — nicht gelöscht, damit die
    Historie und die URL erhalten bleiben (dieselbe Regel wie beim Duplikate-Handling).

 B) CONTINUE + 0 + tracked → kaufbar, aber die Bestandsverfolgung ist sinnlos
    eingeschaltet. Bei Dropship/Print-on-Demand gibt es kein eigenes Lager; die Zählung
    steht dauerhaft auf 0 und meldet Google widersprüchliche Verfügbarkeit. Hier wird
    lediglich `tracked` abgeschaltet — am Kaufverhalten ändert sich nichts.

Der Unterschied ist wichtig: Fall B einfach mitzudraften würde den Editor («Selbst
gestalten») aus dem Shop nehmen — laut Projektregel ein heiliger Bereich.

DRY=1 meldet nur.
"""
import json, os, subprocess, sys, time

# Der Aufseher startet die /tmp-Kopie; dort fehlt klingenregel.json → immer die Repo-Fassung laden.
sys.path.insert(0, "/home/user/aban-news-landing/automation")
sys.path.insert(0, os.path.join(os.getcwd(), "automation"))
from klingenregel import ist_klinge, ist_handklinge  # noqa: E402
from preis_verlustschutz import boden, netto_schlimmst, MAX_FAKTOR, M as PV_M  # noqa: E402

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_lagerstand_hygiene.txt"


def gql(q, v=None):
    with open("/tmp/_lh.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_lh.json"], capture_output=True, text=True)
        # ⚠️ 17.09.2026: Hier stand `except Exception: pass` — der GRUND wurde
        # verschluckt. 15 Waechter meldeten «Shopify antwortet nicht», und keiner
        # konnte sagen warum. Ein Fehler ohne Grund ist eine Sackgasse fuer den,
        # der ihn als naechstes liest.
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            grund = str(d.get("errors") or d)[:300]
            # THROTTLED ist kein Fehler, sondern eine Bitte um Geduld: der Eimer
            # fuellt sich mit restoreRate pro Sekunde, eine teure Abfrage braucht
            # laenger als der feste Kurzschlaf.
            if "THROTTLED" in grund.upper():
                # ⚠️ 21.09.2026: der feste 12-s-Schlaf reichte nicht. Nach JEDEM stuendlichen
                # Container-Neustart startet der Aufseher ~25 Waechter auf EINEN 2000-Punkte-
                # Eimer (100/s Nachlauf); wer hier nach 4 Versuchen aufgab, schrieb einen
                # Traceback ins Log und wartete auf den naechsten Aufseher-Zyklus — 30 min fuer
                # die 13 Reiniger, 24 h fuer die Tageswaechter (Start nach Log-ALTER). Gemessen
                # 09:08-Runde: 4 von 21 Waechtern so gestorben. Shopify sagt
                # in throttleStatus, wie lange es dauert — fragen statt raten (menue_links, frueh).
                drossel += 1
                wartezeit = 12.0
                try:
                    _k = (d.get("extensions") or {}).get("cost") or {}
                    _t = _k.get("throttleStatus") or {}
                    _fehlt = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                    _rate = float(_t.get("restoreRate") or 0)
                    if _fehlt > 0 and _rate > 0:
                        wartezeit = min(30.0, _fehlt / _rate + 0.5)
                except Exception:
                    pass
                time.sleep(wartezeit)
                if drossel < 12:
                    continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund
                break
        except Exception as e:
            roh = (r.stdout or "")[:200]
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + roh
        versuche += 1
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


def main():
    # ⚠️ 25.09.2026: Hier stand `products(first:100)` OHNE Seitenwechsel. Es gibt 222 aktive
    # Produkte mit Bestand 0; 221 davon sind gemischt (einzelne Varianten ausverkauft, der Rest
    # kaufbar) und fuellten die erste Seite — das einzige wirklich unkaufbare («Pluesch Ohnezahn
    # 60 cm», alle Varianten DENY+0) stand auf Seite 3 und wurde nie gesehen. «0 gedraftet» hiess
    # «Seite 1 gesehen», nicht «alles gesehen».
    nodes, cur = [], None
    for _seite in range(200):
        d = gql('query($c:String){products(first:100,after:$c,query:"status:ACTIVE AND inventory_total:0"){'
                'pageInfo{hasNextPage endCursor} nodes{'
                'id title variants(first:100){nodes{id inventoryPolicy '
                'inventoryItem{id tracked}}}}}}', {"c": cur})
        P = ((d.get("data") or {}).get("products") or {})
        nodes += P.get("nodes") or []
        if not (P.get("pageInfo") or {}).get("hasNextPage"):
            break
        cur = P["pageInfo"]["endCursor"]
    print(f"aktive Produkte mit Bestand 0: {len(nodes)}", flush=True)
    f = open(LEDGER, "a")
    gedraftet = entkoppelt = 0
    for p in nodes:
        vs = p["variants"]["nodes"]
        blockiert = [v for v in vs if v["inventoryPolicy"] == "DENY"
                     and v["inventoryItem"]["tracked"]]
        if blockiert and len(blockiert) == len(vs):
            # Fall A: kein einziger Variantenkauf möglich -> aus dem Schaufenster nehmen.
            gedraftet += 1
            print(f"  ⛔ DRAFT (nicht kaufbar): {p['title'][:52]}", flush=True)
            if not DRY:
                gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                    {"i": {"id": p["id"], "status": "DRAFT"}})
                # tagsAdd statt tags im ProductInput: letzteres ERSETZT die Liste und
                # würde Kategorie-/Kollektions-Tags mitreissen.
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t)'
                    '{userErrors{message}}}',
                    {"id": p["id"], "t": ["ausverkauft-lieferant"]})
                f.write(f"{p['id']}\tdraft-ausverkauft\t{p['title']}\n"); f.flush()
            continue
        # Fall B: kaufbar (CONTINUE) -> nur die sinnlose Bestandsverfolgung abschalten.
        falsch = [v for v in vs if v["inventoryItem"]["tracked"]
                  and v["inventoryPolicy"] == "CONTINUE"]
        if not falsch:
            continue
        entkoppelt += len(falsch)
        print(f"  🔧 {len(falsch)} Variante(n) entkoppeln: {p['title'][:46]}", flush=True)
        if DRY:
            continue
        for v in falsch:
            gql('mutation($id:ID!,$in:InventoryItemInput!){inventoryItemUpdate(id:$id,input:$in)'
                '{userErrors{message}}}',
                {"id": v["inventoryItem"]["id"], "in": {"tracked": False}})
            time.sleep(0.2)
        f.write(f"{p['id']}\tuntracked:{len(falsch)}\t{p['title']}\n"); f.flush()
    f.close()
    zurueck = rueckholen()
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {gedraftet} gedraftet, "
          f"{entkoppelt} Varianten entkoppelt, {zurueck} wieder aktiv")


# Tags, die ein ANDERER Waechter gesetzt hat: dann ist «ausverkauft» nicht mehr der einzige
# Grund fuer den Entwurf, und die Rueckholung waere eine Rueckholung ueber fremde Entscheide.
SPERR_TAGS = ("duplikat", "waffe", "klinge", "handklinge", "nicht-lieferbar", "keine-lieferanten-ref",
              "heilversprechen", "medizin", "verdeckte-ueberwachung", "tierschutz", "verlust",
              "fremde-variante", "lizenz-sperre", "erotik", "adult", "bb-versand", "kein-ch-versand",
              "cj-nicht-mehr", "manuell", "betreiber", "zusammengefuehrt", "ersetzt", "sperre")


def rueckholen():
    """Fall C (25.09.2026): Rueckweg fuer Fall A.

    Fall A draftet ein Produkt, dessen Varianten alle DENY+0 stehen. Bei Fortura hebt der
    Bestandsabgleich die Menge wieder an, sobald der Artikel zurueck im Feed ist — aber er
    draftet und aktiviert NIE (Absicht, fortura_bestand_sync.mjs Kopf). Also blieb jeder
    Entwurf dieses Waechters fuer immer liegen: gemessen 77 von 154 wieder lieferbar, darunter
    Peruecken, Fluegel und Masken fuenf Wochen vor Halloween. Wer einen Zustand herstellt,
    muss ihn auch wieder aufheben — sonst ist «vorlaeufig» dasselbe wie «endgueltig».

    Zurueck auf ACTIVE nur, wenn ALLES stimmt: Entwurf dieses Waechters (Ledger), Tag
    `ausverkauft-lieferant` noch da, mindestens eine Variante kaufbar, kein fremder Sperr-Tag,
    keine Weiterleitung weg von der Produktadresse, keine SKU in einem anderen aktiven Produkt
    (Einzelgroessen-Produkte wurden zu Varianten-Produkten zusammengefuehrt).
    """
    try:
        zeilen = open(LEDGER).read().splitlines()
    except OSError:
        return 0
    ids = list(dict.fromkeys(z.split("\t")[0] for z in zeilen if "\tdraft-ausverkauft" in z))
    zurueck_schon = {z.split("\t")[0] for z in zeilen if "\treaktiviert" in z}
    zurueck = 0
    f = open(LEDGER, "a")
    for i in range(0, len(ids), 50):
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title handle status tags '
                'variants(first:100){nodes{id sku price compareAtPrice inventoryPolicy inventoryQuantity '
                'inventoryItem{tracked unitCost{amount}}}}}}}',
                {"ids": ids[i:i + 50]})
        for p in (d.get("data") or {}).get("nodes") or []:
            if not p or p.get("status") != "DRAFT" or "ausverkauft-lieferant" not in p["tags"]:
                continue
            vs = p["variants"]["nodes"]
            if not any(not v["inventoryItem"]["tracked"] or v["inventoryPolicy"] == "CONTINUE"
                       or (v["inventoryQuantity"] or 0) > 0 for v in vs):
                continue
            fremd = [t for t in p["tags"] if t != "ausverkauft-lieferant"
                     and any(s in t.lower() for s in SPERR_TAGS)]
            # Klingen (16.09.: keine Klingen mehr im Verkauf) tragen oft KEINEN Sperr-Tag, weil
            # der Entwurf schon aus einem anderen Grund bestand — «Messer silber Ghost Face 33cm»
            # stand in der ersten Kandidatenliste. Die Hausregel entscheidet am Titel.
            if ist_klinge(p["title"]) or ist_handklinge(p["title"]):
                fremd = fremd or ["klingenregel"]
            if fremd:
                print(f"  ⏸ bleibt Entwurf (Tag {fremd[0]}): {p['title'][:50]}", flush=True)
                continue
            # Preisschutz (24.09., «nie verlust»: Codes bleiben, Preise decken 25 %) und EK-Nachtrag
            # laufen nur ueber ACTIVE — ein Entwurf hat beide verpasst (25.09.: 75 von 75 ohne EK, nach
            # dem Nachtrag 72 unter dem Boden). Also hier dieselbe Regel wie preis_verlustschutz.py:
            # jede kaufbare Variante braucht einen EK; liegt der Preis unter dem Boden, wird er auf den
            # Boden gehoben — mehr als MAX_FAKTOR (2×) nicht, dann bleibt der Entwurf liegen.
            heben, grund = [], None
            for v in vs:
                if v["inventoryItem"]["tracked"] and v["inventoryPolicy"] == "DENY" and (v["inventoryQuantity"] or 0) <= 0:
                    continue
                ek = float(((v["inventoryItem"].get("unitCost") or {}).get("amount")) or 0)
                preis = float(v["price"])
                if ek <= 0:
                    grund = f"kein EK ({preis:.2f})"; break
                if netto_schlimmst(preis, ek) >= 0:
                    continue
                neu = boden(ek)
                if preis <= 0 or neu / preis > MAX_FAKTOR:
                    grund = f"Boden {neu:.2f} > {MAX_FAKTOR:g}× Preis {preis:.2f} (EK {ek:.2f})"; break
                streich = v.get("compareAtPrice")
                heben.append({"id": v["id"], "price": f"{neu:.2f}", **({"compareAtPrice": None}
                              if streich and float(streich) <= neu else {}), "_alt": preis})
            if grund:
                print(f"  ⏸ bleibt Entwurf ({grund}): {p['title'][:44]}", flush=True)
                continue
            doppel = None
            for sku in [v["sku"] for v in vs if v.get("sku")][:5]:
                r = gql('query($q:String){productVariants(first:10,query:$q){nodes{sku product{id status title}}}}',
                        {"q": 'sku:"%s"' % sku.replace('"', '')})
                for n in ((r.get("data") or {}).get("productVariants") or {}).get("nodes") or []:
                    if n["sku"] == sku and n["product"]["id"] != p["id"] and n["product"]["status"] == "ACTIVE":
                        doppel = n["product"]["title"]
                        break
                if doppel:
                    break
            if doppel:
                print(f"  ⏸ bleibt Entwurf (SKU aktiv in «{doppel[:40]}»): {p['title'][:40]}", flush=True)
                continue
            if p["id"] in zurueck_schon:
                print(f"  ↻ erneut zurueck (war schon einmal reaktiviert): {p['title'][:50]}", flush=True)
            zurueck += 1
            hub = ", ".join(f"{h['_alt']:.2f}→{h['price']}" for h in heben[:3])
            print(f"  ✅ wieder lieferbar → ACTIVE: {p['title'][:52]}" + (f"  (Preis {hub})" if hub else ""), flush=True)
            if DRY:
                continue
            if heben:
                r = gql(PV_M, {"p": p["id"], "v": [{k: x for k, x in h.items() if k != "_alt"} for h in heben]})
                pb = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {})
                ist = {x["id"]: x for x in pb.get("productVariants") or []}
                if pb.get("userErrors") or any(f"{float((ist.get(h['id']) or {}).get('price') or 0):.2f}" != h["price"]
                                               for h in heben):
                    print(f"    ⚠️ Preis nicht bestaetigt, bleibt Entwurf: {pb.get('userErrors')}", flush=True)
                    zurueck -= 1
                    continue
                f.write(f"{p['id']}\tpreis-gehoben\t{hub}\n"); f.flush()
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{message}}}',
                    {"i": {"id": p["id"], "status": "ACTIVE"}})
            pu = ((r.get("data") or {}).get("productUpdate") or {})
            if pu.get("userErrors") or (pu.get("product") or {}).get("status") != "ACTIVE":
                print(f"    ⚠️ nicht aktiviert: {pu.get('userErrors')}", flush=True)
                zurueck -= 1
                continue
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                {"id": p["id"], "t": ["ausverkauft-lieferant"]})
            f.write(f"{p['id']}\treaktiviert\t{p['title']}\n"); f.flush()
    f.close()
    return zurueck


if __name__ == "__main__":
    main()
