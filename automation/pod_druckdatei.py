#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pod_druckdatei.py — hebt ALLE POD-Druckdateien auf die Shopify-CDN.

⚠️ GEFUNDEN AM 22.08.2026: Alle 264 aktiven Sticker trugen im Metafeld `custom.print_file`
eine Adresse auf `abannews.com/social/designs/…` — und die antwortet mit **404**. Die Domain
selbst lebt (HTTP 200), nur dieses Verzeichnis gibt es nicht mehr.

WAS DAS BEDEUTET: `printful_sync.mjs` schickt genau diese URL als Druckdatei an Printful
(Zeile 105: «Fertig-Produkte ohne Editor-Upload: festes Motiv aus Produkt-Metafeld»). Eine
Bestellung über einen dieser Sticker hätte also nicht gedruckt werden können — dieselbe
Klasse wie Bestellung #1008: bezahlt, nicht lieferbar. Und es fällt niemandem auf, bis
jemand kauft.

DIE MOTIVE SIND NICHT VERLOREN: Alle 268 PNG liegen im Repo unter `social/designs/`
(1024×1024, RGBA — die Transparenz braucht der Kiss-Cut-Konturschnitt). Sie werden auf die
Shopify-CDN geladen und das Metafeld zeigt danach dorthin. Genau derselbe Weg, den
`upload_to_shopify_cdn.mjs` schon für die Reels gehen musste — dessen Kopfkommentar nennt
«abannews.com/reels (404)» wörtlich als Anlass. Dieselbe Ursache, zweiter Ort.

⚠️ AUFLÖSUNG: 1024 px reichen für 7,6 cm (342 dpi) und 10 cm (260 dpi) gut; bei 14 cm sind
es 186 dpi. Das ist für einen Vinyl-Sticker brauchbar, aber nicht üppig — bessere Quellen
wären ein eigener Punkt, keine Ausrede, die Reparatur zu verschieben.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
NODE = "/opt/node22/bin/node"
# ⚠️ 23.08.2026 — VON DER STICKER-SONDERLOESUNG ZUM ALLGEMEINEN WAECHTER.
# Der Katalog-Audit hat gezeigt, dass der Befund nicht auf Sticker beschraenkt ist: EXAKT
# gezaehlt tragen 454 aktive Produkte eine Druckdatei, davon zeigen **190 weiterhin auf
# abannews.com** — 47 T-Shirts, 47 Tassen, 30 Taschen, 25 Kissen, 25 Mauspads, 10 Poster,
# 6 Magnete. (Der Bericht hatte ~186 geschaetzt; die exakte Zaehlung ergibt 190.)
# Die Produktgruppe wird deshalb nicht mehr ueber `product_type:Sticker` eingegrenzt,
# sondern ueber das VORHANDENSEIN des Metafelds — wer eine Druckdatei traegt, ist POD.
LOKAL = ["social", "."]                       # Suchpfade fuer die Motivdatei
LEDGER = "dropship/_pod_druckdatei.txt"
CDN_KARTE = "dropship/_sticker_cdn.json"      # Dateiname → CDN-URL, damit nie doppelt geladen wird
DRY = os.environ.get("DRY") == "1"


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper():
                time.sleep(4 + i * 3); continue
            if d.get("errors"):
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:180]); return None
        except Exception:
            pass
        time.sleep(3 + i * 2)
    return None


def hochladen(datei, karte):
    name = os.path.basename(datei)
    if name in karte:
        return karte[name]
    r = subprocess.run([NODE, "automation/upload_to_shopify_cdn.mjs", datei,
                        f"Sticker-Motiv {os.path.splitext(name)[0]}"],
                       capture_output=True, text=True,
                       env={**os.environ, "SHOPIFY_ADMIN_TOKEN": TOK, "SHOPIFY_SHOP": SHOP})
    url = (r.stdout or "").strip().splitlines()[-1] if r.stdout.strip() else ""
    if not url.startswith("https://cdn.shopify.com/"):
        print(f"   ⚠️ Upload fehlgeschlagen: {name} — {(r.stderr or '')[-90:].strip()}")
        return None
    karte[name] = url
    with open(CDN_KARTE, "w") as f:
        json.dump(karte, f, ensure_ascii=False, indent=0, sort_keys=True)
    return url


def main():
    karte = json.load(open(CDN_KARTE)) if os.path.exists(CDN_KARTE) else {}
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    cur, offen, ok, fehlt = None, [], 0, []
    while True:
        d = gql('query($c:String){products(first:150,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor} nodes{id title '
                'metafield(namespace:"custom",key:"print_file"){value}}}}', {"c": cur})
        if d is None:
            print("PAUSE (Shopify antwortet nicht) — nichts geändert")
            return
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            v = ((p.get("metafield") or {}).get("value") or "").strip()
            if not v:
                continue                      # Editor-Produkt: Motiv liefert die Kundin
            if v.startswith("https://cdn.shopify.com/"):
                ok += 1
                continue
            if p["id"] in erledigt:
                continue
            # Der Pfad hinter der Domain wird 1:1 gegen die Suchwurzeln probiert —
            # die Motive liegen unter social/designs/ UND social/posters/hoch/.
            rel = "/".join(v.split("?")[0].split("/")[3:])
            datei = next((os.path.join(w, rel) for w in LOKAL
                          if os.path.exists(os.path.join(w, rel))), None)
            if not datei:
                # ⚠️ NICHT raten. Ohne Quelldatei ist die Druckdatei nicht herstellbar —
                # das gehört gemeldet, nicht mit einem beliebigen Motiv gefüllt.
                fehlt.append((p["title"], os.path.basename(v)))
                continue
            offen.append((p["id"], p["title"], datei))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        time.sleep(0.5)

    print(f"schon auf der CDN: {ok} · zu reparieren: {len(offen)} · ohne Quelldatei: {len(fehlt)}")
    for t, f in fehlt[:10]:
        print(f"   ⚠️ {t[:52]:52} — {f} lokal nicht gefunden")
    if DRY:
        for _, t, f in offen[:8]:
            print(f"   {t[:52]:52} ← {f}")
        print("(DRY=1 — nichts geändert)")
        print("FERTIG")
        return

    n = 0
    for pid, titel, datei in offen:
        url = hochladen(datei, karte)
        if not url:
            continue
        r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
                '{userErrors{message}}}',
                {"m": [{"ownerId": pid, "namespace": "custom", "key": "print_file",
                        "type": "url", "value": url}]})
        f = (((r or {}).get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
        if r is None or f is None or f:
            print(f"   ⚠️ {titel[:44]} — {json.dumps(f)[:80] if f else 'keine Antwort'}")
            time.sleep(1); continue
        with open(LEDGER, "a") as fh:
            fh.write(f"{pid}\t{url}\t{titel[:60]}\n")
        n += 1
        time.sleep(0.3)
    print(f"\n{n} Druckdateien auf die CDN umgestellt")
    print("FERTIG")


if __name__ == "__main__":
    main()
