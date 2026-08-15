"""Schweizer Rechtschreibung: ß → ss in Titel und Beschreibung (2026-08-15).

Der Katalog wird von Übersetzern beliefert, die bundesdeutsches Deutsch schreiben —
Stand 15.08.: 198 aktive Titel und 2'279 Beschreibungen mit ß («Große Shisha»,
«Reißverschluss», «weißes Rauschen»). Ein Schweizer Shop schreibt durchgehend ss;
die amtliche Schweizer Orthografie kennt kein ß, die Ersetzung ß→ss ist darum in
JEDEM Wort korrekt (auch «Maße»→«Masse» — im CH-Kontext üblich und richtig).

Quelle der Kandidaten ist ein Export-Schnappschuss, geschrieben wird aber gegen den
LIVE-Text (Lehre vom 15.08.: Massen-Schreiber mit alter Basis beleben alte Fehler
wieder). Enthält der Live-Text kein ß mehr, wird still übersprungen.

DRY=1 zeigt nur. Ledger: dropship/_ss_statt_scharf_s.txt
⚠️ Die QUELLE nachwachsender ß ist mit-gepatcht (cj_category_fill/cj_sku_import/
cj_trending_import ersetzen ß jetzt vor dem Anlegen) — dieser Lauf ist der Backfill.
"""
import json, os, re, sys, time, urllib.request

DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/frisch.jsonl")
LEDGER = "dropship/_ss_statt_scharf_s.txt"
TOK = open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None):
    for i in range(6):
        try:
            r = urllib.request.Request(
                "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                data=json.dumps({"query": q, "variables": v or {}}).encode(),
                headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=45).read())
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(3 * (i + 1))
    return {}


def umstellen(s):
    return s.replace("ß", "ss").replace("ẞ", "SS")


def main():
    if not os.path.exists(EXPORT):
        # /tmp-Wipe: Kandidatenquelle weg. PAUSE statt Crash-Loop — der nächste Voll-Export
        # (oder ein Lauf mit EXPORT=…) macht weiter. KEIN FERTIG: es ist nichts erledigt.
        print(f"PAUSE (Kandidatenquelle {EXPORT} fehlt — nach dem nächsten Voll-Export weiter)")
        return
    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if not p["id"].startswith("gid://shopify/Product/"):
            continue
        if "ß" in (p.get("title") or "") or "ß" in (p.get("descriptionHtml") or ""):
            kandidaten.append((p["id"], p.get("title", "")))
    print(f"Kandidaten mit ß: {len(kandidaten)}", flush=True)
    if DRY:
        for _, t in kandidaten[:10]:
            print(f"   {t[:60]} → {umstellen(t)[:60]}", flush=True)
        return

    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, _ in kandidaten:
        if gid in fertig:
            continue
        d = gql('query($id:ID!){node(id:$id){... on Product{title descriptionHtml status}}}',
                {"id": gid})
        k = ((d.get("data") or {}).get("node")) or {}
        if not k:
            print(f"⚠️ Shopify antwortet nicht bei {gid} — PAUSE, nächster Lauf macht weiter",
                  flush=True)
            return                      # kein FERTIG schreiben: ein NULL ist kein Erledigt
        t, h = k.get("title") or "", k.get("descriptionHtml") or ""
        nt, nh = umstellen(t), umstellen(h)
        if nt == t and nh == h:
            f.write(gid + "\tlive-schon-sauber\n")
            continue
        inp = {"id": gid}
        if nt != t:
            inp["title"] = nt
        if nh != h:
            inp["descriptionHtml"] = nh
        r = gql('mutation($p:ProductInput!){productUpdate(input:$p){userErrors{message}}}',
                {"p": inp})
        err = (((r.get("data") or {}).get("productUpdate")) or {}).get("userErrors")
        if err:
            print("✗", gid, err, flush=True)
            continue
        f.write(gid + "\tumgestellt\n")
        f.flush()
        n += 1
        if n % 100 == 0:
            print(f"  … {n}", flush=True)
        time.sleep(0.35)
    print(f"FERTIG: {n} Produkte auf Schweizer Schreibung umgestellt", flush=True)


if __name__ == "__main__":
    main()
