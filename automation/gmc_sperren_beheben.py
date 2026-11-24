#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gmc_sperren_beheben.py — geprüfte Korrekturen für Google-Merchant-Sperren umsetzen (24.11.2026).

ANLASS: Betreiber-CSV «Produktprobleme» (Merchant Center, 24.11.): 25 Produkte NICHT zugelassen in den Gratis-Einträgen
(18 «Anzeigen-Overlay auf Bild», 3 «Verkauf lebender Tiere», 2 «Tabak», 1 «Lokale Anforderungen», 1 «Bild zu klein").
Wir haben keinen Merchant-Center-Zugang (kein API-Konto, kein Konnektor) — Google liest den Shop über die Shopify-App.
Behoben wird darum die URSACHE im Shop; Google prüft beim nächsten Feed-Abgleich selbst neu.

EINGABE: JSON-Liste aus dem Workflow «gmc-sperren-beheben» — je Gruppe {vorschlag:{produkte:[{ordner,handle,aktionen}]},
urteil:{urteile:[{handle,aktion_index,ok,grund}]}}. Umgesetzt wird NUR, was der unabhängige Prüfer mit ok=true bestätigt hat.

AKTIONEN: variantenbild_setzen (vorhandenes Bild nr) · neues_bild_variante (Datei hochladen, an Varianten hängen) ·
hauptbild_setzen (vorhandenes Bild an Position 1) · neues_bild_haupt (hochladen, an Position 1) · text_ersetzen (title /
descriptionHtml, exakter Teilstring). Nie wird ein Bild gelöscht. Vorher-Sicherung je Produkt nach dropship/gmc-sperren-2411/.
Hauptbild-Wechsel stehen im Ledger dropship/_google_bild_tausch.tsv (Art «tausch») → bildtausch_sperre hält andere
Umsortierer fern.

  python3 automation/gmc_sperren_beheben.py ergebnis.json          # Trockenlauf
  LIVE=1 python3 automation/gmc_sperren_beheben.py ergebnis.json   # schreiben + zurücklesen
"""
import datetime, json, os, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
import bild_quadrat_auffuellen as bq  # sgql() + hochladen() — derselbe geprüfte Upload-Weg wie google_overlay_bereinigen

LIVE = os.environ.get("LIVE") == "1"
SICHERUNG = os.path.join(REPO, "dropship", "gmc-sperren-2411")
LEDGER = os.path.join(REPO, "dropship", "_google_bild_tausch.tsv")
IDS = os.path.join(REPO, "dropship", "_google_bild_tausch_ids.tsv")
HEUTE = datetime.date.today().isoformat()


def g(q, v=None):
    d = bq.sgql(q, v) or {}
    if d.get("errors"):
        raise RuntimeError(str(d["errors"])[:300])
    return d.get("data") or {}


def lese(pid):
    return g('''query($id:ID!){product(id:$id){id handle title descriptionHtml
      media(first:60){nodes{id status ... on MediaImage{image{url width height}}}}
      variants(first:100){nodes{id title media(first:1){nodes{id}}}}}}''', {"id": pid})["product"]


def hochladen_als_medium(pid, datei, alt):
    jpg = "/tmp/_gmc_upload.jpg"
    subprocess.run(["convert", datei, "-background", "white", "-flatten", "-quality", "92", jpg], check=True)
    src = bq.hochladen(open(jpg, "rb").read(), os.path.basename(datei).rsplit(".", 1)[0] + ".jpg")
    if not src:
        raise RuntimeError("Upload ohne Ziel")
    cr = g('mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}',
           {"id": pid, "m": [{"originalSource": src, "mediaContentType": "IMAGE", "alt": alt[:250]}]})["productCreateMedia"]
    if cr["mediaUserErrors"] or not cr["media"]:
        raise RuntimeError(f"productCreateMedia: {cr['mediaUserErrors']}")
    mid = cr["media"][0]["id"]
    for _ in range(30):
        time.sleep(3)
        st = g('query($id:ID!){node(id:$id){... on MediaImage{status image{width height}}}}', {"id": mid})["node"]
        if st and st["status"] in ("READY", "FAILED"):
            break
    if not st or st["status"] != "READY":
        g('mutation($id:ID!,$m:[ID!]!){productDeleteMedia(productId:$id,mediaIds:$m){deletedMediaIds}}', {"id": pid, "m": [mid]})
        raise RuntimeError(f"Medium nicht READY ({st and st['status']}) → wieder entfernt")
    return mid, st["image"]


def varianten_setzen(pid, vids, mid):
    r = g('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
          {"p": pid, "v": [{"id": v, "mediaId": mid} for v in vids]})["productVariantsBulkUpdate"]
    if r["userErrors"]:
        raise RuntimeError(str(r["userErrors"]))


def nach_vorne(pid, mid):
    r = g('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}',
          {"id": pid, "m": [{"id": mid, "newPosition": "0"}]})["productReorderMedia"]
    if r["userErrors"]:
        raise RuntimeError(str(r["userErrors"]))


def main():
    ergebnisse = json.load(open(sys.argv[1]))
    os.makedirs(SICHERUNG, exist_ok=True)
    bilanz = {"umgesetzt": 0, "abgelehnt": 0, "nichts": 0, "fehler": 0}
    bericht = []
    for e in ergebnisse:
        ok = {(u["handle"], u["aktion_index"]): u for u in (e.get("urteil") or {}).get("urteile", [])}
        for p in e["vorschlag"]["produkte"]:
            daten = json.load(open(os.path.join(p["ordner"], "daten.json")))
            pid = f"gid://shopify/Product/{daten['pid']}"
            nr2id = {m["nr"]: m["id"] for m in daten["medien"]}
            freigegeben = []
            for i, a in enumerate(p["aktionen"]):
                u = ok.get((p["handle"], i)) or ok.get((daten["handle"], i))
                if a["art"] == "nichts":
                    bilanz["nichts"] += 1
                    bericht.append(f"| {daten['handle'][:40]} | nichts | {a['begruendung'][:120]} |")
                    continue
                if not u or not u["ok"]:
                    bilanz["abgelehnt"] += 1
                    bericht.append(f"| {daten['handle'][:40]} | ABGELEHNT {a['art']} | {(u or {}).get('grund', 'kein Urteil')[:140]} |")
                    continue
                freigegeben.append(a)
            if not freigegeben:
                continue
            vorher = lese(pid)
            json.dump(vorher, open(os.path.join(SICHERUNG, f"{daten['handle'][:60]}-vorher.json"), "w"), ensure_ascii=False, indent=1)
            for a in freigegeben:
                art = a["art"]
                kurz = f"{daten['handle'][:40]} {art} nr={a.get('bild_nr')} datei={os.path.basename(a.get('neue_datei') or '')} v={len(a['variant_ids'])}"
                if not LIVE:
                    print("TROCKEN", kurz); bilanz["umgesetzt"] += 1
                    bericht.append(f"| {daten['handle'][:40]} | (trocken) {art} | {a['begruendung'][:120]} |")
                    continue
                try:
                    if art == "text_ersetzen":
                        feld = a["feld"]; akt = lese(pid)[feld]
                        if a["alt"] not in akt:
                            raise RuntimeError("alt-Text nicht (mehr) im Feld")
                        neu = akt.replace(a["alt"], a["neu"], 1)
                        r = g('mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{message}}}',
                              {"p": {"id": pid, feld: neu}})["productUpdate"]
                        if r["userErrors"]:
                            raise RuntimeError(str(r["userErrors"]))
                        if a["neu"] not in lese(pid)[feld]:
                            raise RuntimeError("Rücklesen: neuer Text fehlt")
                    elif art in ("variantenbild_setzen", "neues_bild_variante"):
                        if art == "variantenbild_setzen":
                            mid = nr2id[a["bild_nr"]]
                        else:
                            mid, _ = hochladen_als_medium(pid, a["neue_datei"], daten["titel"])
                        varianten_setzen(pid, a["variant_ids"], mid)
                        akt = {v["id"]: (v["media"]["nodes"][0]["id"] if v["media"]["nodes"] else None) for v in lese(pid)["variants"]["nodes"]}
                        falsch = [v for v in a["variant_ids"] if akt.get(v) != mid]
                        if falsch:
                            raise RuntimeError(f"Rücklesen: {len(falsch)} Varianten ohne neues Bild")
                    elif art in ("hauptbild_setzen", "neues_bild_haupt"):
                        alt_erst = vorher["media"]["nodes"][0]["id"] if vorher["media"]["nodes"] else ""
                        if art == "hauptbild_setzen":
                            mid = nr2id[a["bild_nr"]]
                        else:
                            mid, _ = hochladen_als_medium(pid, a["neue_datei"], daten["titel"])
                        nach_vorne(pid, mid)
                        for _ in range(10):
                            time.sleep(2)
                            if lese(pid)["media"]["nodes"][0]["id"] == mid:
                                break
                        else:
                            raise RuntimeError("Rücklesen: neues Hauptbild nicht an Position 1")
                        with open(LEDGER, "a") as f:
                            f.write(f"{daten['handle']}\t{HEUTE}\ttausch\t{alt_erst}\t{mid}\tGMC-Overlay/Sperre 24.11.: {a['begruendung'][:150]}\n")
                        with open(IDS, "a") as f:
                            f.write(f"{daten['handle']}\t{pid}\n")
                    print("OK", kurz); bilanz["umgesetzt"] += 1
                    bericht.append(f"| {daten['handle'][:40]} | {art} | {a['begruendung'][:120]} |")
                except Exception as ex:
                    print("FEHLER", kurz, str(ex)[:200]); bilanz["fehler"] += 1
                    bericht.append(f"| {daten['handle'][:40]} | FEHLER {art} | {str(ex)[:120]} |")
    print("BILANZ", json.dumps(bilanz))
    with open(os.path.join(SICHERUNG, "BERICHT.md" if LIVE else "BERICHT-TROCKEN.md"), "w") as f:
        f.write(f"# Google-Merchant-Sperren 24.11.2026 — {'umgesetzt' if LIVE else 'Trockenlauf'}\n\nBilanz: {json.dumps(bilanz)}\n\n"
                "| Produkt | Aktion | Begründung / Grund |\n|---|---|---|\n" + "\n".join(bericht) + "\n")


if __name__ == "__main__":
    main()
