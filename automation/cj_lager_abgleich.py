#!/usr/bin/env python3
"""cj_lager_abgleich.py — CJ-Lagerbestand je VARIANTE → Shop zeigt «ausverkauft» (06.10.2026).

Betreiber 06.10.: «cj lagerstatus check und dann unser webseite auch bei alle produkten».
GEMESSEN 06.10.: CJ-Ware läuft mit inventoryPolicy CONTINUE (kein Bestand geführt) → jede Variante wirkt kaufbar.
Vorhandene Wächter prüfen nur «gibt es das Produkt/die Variante noch» (cj_verfuegbarkeit, cj_varianten_wache) — beide
standen am 06.10. still («Insufficient API points … Remaining 0», der Grind braucht ~110–126k Punkte/Tag, Topf ab ~04:30
leer). Der BESTAND (totalInventory) wurde nur von cj_stock_guard.mjs geprüft, der in keiner Startliste stand.
GEMESSEN 06.10.: `product/query?productSku=…&features=enable_inventory` liefert je Variante `inventories[]` (totalInventory = cj +
  factory); OHNE features ist `inventories` None (Doku 1.10 sagt «automatisch» — falsch)
— EINE Anfrage je Produkt für alle Varianten.

REGEL (umkehrbar, nichts löschen, nichts draften):
  * Variante mit Summe totalInventory == 0 und Policy CONTINUE → DENY (Shop: «ausverkauft», Google: out of stock).
  * Variante, die DIESES Werkzeug auf DENY gesetzt hat (Ledger) und wieder Bestand > 0 hat → zurück auf CONTINUE.
  * Fremde DENY (andere Wächter) bleiben unberührt. Variante fehlt in der CJ-Antwort → «unklar», nichts tun
    (cj_varianten_wache ist dafür zuständig; Lehre 21.09.: ein «nicht gefunden» aus der falschen Anfrage beweist nichts).
  * Fabrikbestand ZÄHLT (Journal 05.10. #1021: factory 20'000 bei «out of stock» — n=1, noch keine Regel).
  * KANARIENVOGEL: erste Antwort muss variants[].inventories tragen, sonst Abbruch (Format geändert = blind).
  * Punkte: Lauf endet sauber bei «Insufficient API points» (kein Ledger-Eintrag, nächster Lauf holt nach).
Reihenfolge: nie geprüfte zuerst, dann die am längsten nicht geprüften (Ledger `dropship/_cj_lager.tsv`).
Läuft im CJ-Vorrang-Fenster (00:00–01:30 UTC, direkt nach dem Punkte-Reset) mit CAP; Bericht `dropship/CJ-LAGER.md`.
  DRY=1 python3 automation/cj_lager_abgleich.py          # messen
  CAP=1500 python3 automation/cj_lager_abgleich.py       # schreiben
  python3 automation/cj_lager_abgleich.py --probe CJDS2337796   # Rohantwort einer productSku
  python3 automation/cj_lager_abgleich.py --selbsttest
"""
import collections, datetime, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_cj_lager.tsv")
BERICHT = os.path.join(REPO, "dropship", "CJ-LAGER.md")
EXPORT = "/tmp/cj_lager_export.jsonl"
DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "1500"))
RECHECK_S = int(os.environ.get("RECHECK_TAGE", "7")) * 86400


def kern(sku):
    """«CJ-CJDS233779601AZ» und «CJDS233779601AZ» → «CJDS233779601AZ» (44'956 Varianten ohne «CJ-», gemessen 06.10.)."""
    return re.sub(r"^CJ-", "", (sku or "").strip(), flags=re.I).upper()


def produkt_sku(variant_sku):
    """→ productSku: Varianten-Anhang (2 Ziffern + 2 Buchstaben) ab; eine Produkt-SKU ohne Anhang («CJJJJTJT22925») bleibt."""
    k = kern(variant_sku)
    m = re.match(r"^(CJ[A-Z]{2,6}\d{5,9})(\d{2}[A-Z]{2})$", k)
    if m:
        return m.group(1)
    return k if re.match(r"^CJ[A-Z]{2,6}\d{5,9}$", k) else None


def bestand(variante):
    inv = variante.get("inventories")
    if not isinstance(inv, list):
        return None
    try:
        return sum(int(x.get("totalInventory") or 0) for x in inv)
    except Exception:
        return None


def entscheiden(shop_varianten, cj_varianten, eigene_deny):
    """→ (deny_ids, zurueck_ids, unklar). shop: [{id, sku, inventoryPolicy}], cj: [{variantSku, inventories}]."""
    cj = {kern(v.get("variantSku")): bestand(v) for v in cj_varianten or []}
    einzeln = len(shop_varianten) == 1 and len(cj_varianten or []) == 1   # Produkt-SKU ohne Anhang ↔ einzige CJ-Variante
    deny, zurueck, unklar = [], [], 0
    for v in shop_varianten:
        b = cj.get(kern(v.get("sku")))
        if b is None and einzeln:
            b = bestand(cj_varianten[0])
        if b is None:
            unklar += 1; continue
        if b == 0 and v.get("inventoryPolicy") == "CONTINUE":
            deny.append(v["id"])
        elif b > 0 and v.get("inventoryPolicy") == "DENY" and v["id"] in eigene_deny:
            zurueck.append(v["id"])
    return deny, zurueck, unklar


def export_holen():
    from kaufwille_zeile import gql
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 20 * 3600:
        return
    q = ('{ products(query:"tag:cj-real status:active") { edges { node { id handle title '
         'variants { edges { node { id sku inventoryPolicy } } } } } } }')
    b = gql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}", {"q": q})["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise SystemExit(f"Bulk: {b['userErrors']}")
    for _ in range(240):
        time.sleep(15)
        s = gql("query($i:ID!){node(id:$i){... on BulkOperation{status url objectCount errorCode}}}", {"i": b["bulkOperation"]["id"]})["node"]
        if s["status"] == "COMPLETED":
            urllib.request.urlretrieve(s["url"], EXPORT + ".teil"); os.replace(EXPORT + ".teil", EXPORT); return
        if s["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {s['status']} {s['errorCode']}")
    raise SystemExit("Bulk: Zeitüberschreitung")


def produkte():
    P = {}
    for l in open(EXPORT, encoding="utf-8"):
        o = json.loads(l)
        if "__parentId" in o:
            P.setdefault(o["__parentId"], {"v": []})["v"].append(o)
        else:
            P.setdefault(o["id"], {"v": []}).update(o)
    return P


def ledger():
    zuletzt, eigene = {}, set()
    if os.path.exists(LEDGER):
        for l in open(LEDGER, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) < 3:
                continue
            zuletzt[t[0]] = float(t[1])
            for teil in t[3:]:
                if teil.startswith("deny:"):
                    eigene |= set(filter(None, teil[5:].split(",")))
                elif teil.startswith("zurueck:"):
                    eigene -= set(filter(None, teil[8:].split(",")))
    return zuletzt, eigene


def main():
    import cj_varianten_wache as w          # gemeinsamer CJ-Takt, Token, Drossel (gleiches cj() wie die Varianten-Wache)
    export_holen()
    P = produkte(); zuletzt, eigene = ledger(); jetzt = time.time()
    prio = set()   # besuchte Landeseiten zuerst (Liste der Lieferbarkeits-Wache), dann nie geprüft, dann älteste Prüfung
    try:
        prio = {l.split("\t")[0] for l in open(os.path.join(REPO, "dropship", "_besuchte_seiten_geprueft.tsv"), encoding="utf-8")}
    except Exception:
        pass
    arbeit = sorted((pid for pid, p in P.items() if p.get("v") and jetzt - zuletzt.get(pid, 0) > RECHECK_S),
                    key=lambda pid: (P[pid].get("handle") not in prio, zuletzt.get(pid, 0)))[:CAP]
    print(f"CJ-Ware aktiv {len(P)} · fällig {len(arbeit)} (CAP {CAP}) · eigene DENY {len(eigene)} · {'DRY' if DRY else 'SCHARF'}", flush=True)
    stat = collections.Counter(); bsp = []; geprueft_format = False
    led = open(LEDGER if not DRY else os.devnull, "a", encoding="utf-8")   # DRY schreibt keinen Ledger (sonst gilt «geprüft»)
    for pid in arbeit:
        p = P[pid]; shop_v = [{"id": v["id"], "sku": v.get("sku"), "inventoryPolicy": v.get("inventoryPolicy")} for v in p["v"]]
        ps = next((produkt_sku(v["sku"]) for v in shop_v if produkt_sku(v["sku"])), None)
        if not ps:
            stat["keine-cj-sku"] += 1; led.write(f"{pid}\t{jetzt:.0f}\tkeine-cj-sku\n"); continue
        d = w.cj(f"/api2.0/v1/product/query?productSku={ps}&features=enable_inventory")   # ohne features: inventories None (gemessen 06.10.)
        msg = str(d.get("message") or "")
        if "Insufficient API points" in msg or str(d.get("code")) == "16900500":
            stat["punkte-leer"] += 1; print("  CJ-Punkte leer — sauberer Abbruch", flush=True); break
        data = d.get("data") or {}
        vs = data.get("variants") if isinstance(data, dict) else None
        if not vs:
            stat["unklar"] += 1; led.write(f"{pid}\t{jetzt:.0f}\tunklar\tcode {d.get('code')} {msg[:50]}\n"); continue
        if not geprueft_format:
            if not any(isinstance(v.get("inventories"), list) for v in vs):
                print(f"  ⛔ KANARIENVOGEL: variants[].inventories fehlt ({ps}) — CJ-Format geändert, Abbruch ohne Schreiben", flush=True)
                stat["format-fehlt"] += 1; break
            geprueft_format = True
        deny, zurueck, unklar = entscheiden(shop_v, vs, eigene)
        stat["geprüft"] += 1; stat["varianten-unklar"] += unklar
        if deny or zurueck:
            if len(bsp) < 12:
                bsp.append(f"{p.get('title', '')[:50]} — {len(deny)} ausverkauft, {len(zurueck)} wieder da (von {len(shop_v)})")
            if not DRY:
                eingaben = [{"id": i, "inventoryPolicy": "DENY"} for i in deny] + [{"id": i, "inventoryPolicy": "CONTINUE"} for i in zurueck]
                try:
                    r = w.gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){'
                              'productVariants{id inventoryPolicy} userErrors{message}}}', {"p": pid, "v": eingaben})
                    x = (r.get("data") or {}).get("productVariantsBulkUpdate") or {}
                    if x.get("userErrors"):
                        raise RuntimeError(str(x["userErrors"])[:120])
                    soll = {i: "DENY" for i in deny} | {i: "CONTINUE" for i in zurueck}
                    ist = {v["id"]: v["inventoryPolicy"] for v in x.get("productVariants") or []}
                    if any(ist.get(i) != s for i, s in soll.items()):
                        raise RuntimeError("Rücklesen weicht ab")
                except Exception as e:
                    stat["schreibfehler"] += 1
                    led.write(f"{pid}\t{jetzt:.0f}\tfehler\t{str(e)[:80]}\n"); led.flush(); continue
            stat["varianten-ausverkauft"] += len(deny); stat["varianten-wieder-da"] += len(zurueck)
            stat["produkte-ganz-ausverkauft"] += int(len(deny) == len(shop_v))
        led.write(f"{pid}\t{jetzt:.0f}\t{'dry' if DRY else 'ok'}\tdeny:{','.join(deny) if not DRY else ''}\tzurueck:{','.join(zurueck) if not DRY else ''}\n")
        led.flush()
    led.close()
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# CJ-Lagerabgleich ({datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC, {'DRY' if DRY else 'SCHARF'})\n\n"
                "Werkzeug `automation/cj_lager_abgleich.py` — Regel im Kopf. Bestand 0 → Variante «ausverkauft» (DENY), "
                "Bestand zurück → wieder kaufbar. Nichts gelöscht, nichts gedraftet.\n\n"
                f"CJ-Ware aktiv: {len(P)} · in diesem Lauf fällig: {len(arbeit)}\n\n| Zustand | Anzahl |\n|---|---:|\n" +
                "".join(f"| {k} | {v} |\n" for k, v in sorted(stat.items())) + "\n## Beispiele\n\n" + "".join(f"- {b}\n" for b in bsp))
    print(f"CJ-LAGER: {dict(stat)}", flush=True)
    return 0


def selbsttest():
    sv = [{"id": "a", "sku": "CJ-CJDS233779601AZ", "inventoryPolicy": "CONTINUE"},
          {"id": "b", "sku": "CJ-CJDS233779602BY", "inventoryPolicy": "CONTINUE"},
          {"id": "c", "sku": "CJ-CJDS233779603CX", "inventoryPolicy": "DENY"},
          {"id": "d", "sku": "CJ-CJDS233779604DW", "inventoryPolicy": "DENY"},
          {"id": "e", "sku": "CJ-CJDS233779605EV", "inventoryPolicy": "CONTINUE"}]
    cv = [{"variantSku": "CJDS233779601AZ", "inventories": [{"totalInventory": 0}, {"totalInventory": 0}]},
          {"variantSku": "CJDS233779602BY", "inventories": [{"totalInventory": 0}, {"totalInventory": 12}]},
          {"variantSku": "CJDS233779603CX", "inventories": [{"totalInventory": 5}]},
          {"variantSku": "CJDS233779604DW", "inventories": [{"totalInventory": 9}]}]
    d, z, u = entscheiden(sv, cv, {"c"})
    t = [
        (produkt_sku("CJ-CJDS233779601AZ") == "CJDS2337796", "productSku aus Varianten-SKU"),
        (produkt_sku("CJ-CJYD286336001AZ") == "CJYD2863360", "CJYD-Form"),
        (produkt_sku("fortura-12345") is None, "Nicht-CJ = nichts"),
        (produkt_sku("CJYD291508502BY") == "CJYD2915085", "ohne CJ-Präfix"),
        (produkt_sku("CJ-CJJJJTJT22925") == "CJJJJTJT22925", "Produkt-SKU ohne Anhang"),
        (entscheiden([{"id": "x", "sku": "CJJJJTJT22925", "inventoryPolicy": "CONTINUE"}], [{"variantSku": "CJJJJTJT2292501AZ", "inventories": [{"totalInventory": 0}]}], set())[0] == ["x"], "Einzelvariante zugeordnet"),
        (entscheiden([{"id": "y", "sku": "CJYD291508502BY", "inventoryPolicy": "CONTINUE"}], [{"variantSku": "CJYD291508502BY", "inventories": [{"totalInventory": 0}]}, {"variantSku": "CJYD291508501AZ", "inventories": [{"totalInventory": 3}]}], set())[0] == ["y"], "Shop-SKU ohne CJ- trifft"),
        (d == ["a"], "Bestand 0 → DENY"),
        ("b" not in d, "Fabrik/ein Lager > 0 → bleibt kaufbar"),
        (z == ["c"], "eigenes DENY + Bestand → zurück"),
        ("d" not in z, "fremdes DENY bleibt"),
        (u == 1, "fehlt bei CJ → unklar, nichts tun"),
        (bestand({"inventories": None}) is None and bestand({}) is None, "ohne inventories = unbekannt, nie 0"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}"); return 0 if ok == len(t) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--probe" in sys.argv:
        import cj_varianten_wache as w
        print(json.dumps(w.cj(f"/api2.0/v1/product/query?productSku={sys.argv[sys.argv.index('--probe') + 1]}"), ensure_ascii=False)[:3000])
        sys.exit(0)
    sys.exit(main())
