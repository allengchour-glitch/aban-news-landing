#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_jetzt — «jetzt etwas posten»: legt einen Sofort-Befehl fuer den PC aufs CDN (31.08.2026).

Sagt der Betreiber «poste jetzt», ruft die Cloud-Session dieses Werkzeug auf:
    python3 automation/tiktok_jetzt.py                 # naechster freier Beitrag
    python3 automation/tiktok_jetzt.py <slug>          # genau dieser Beitrag

Es prueft den Kandidaten (frei, Video vorhanden, nicht im Upload-Ledger, Produkt
LIVE noch ACTIVE) und schreibt dropship/tiktok_befehl.json per fileUpdate auf die
BESTEHENDE GenericFile-ID — die URL bleibt stabil, der PC pollt sie alle 10 Minuten
(luxestyle-tt-check.mjs) und postet dann sofort (SOFORT=1 hebt nur die 1/Tag-Bremse,
nie die Slug-Dedup). Ein Befehl verfaellt nach 6 h, laeuft hoechstens 3-mal an.

⚠️ Dieses Werkzeug laeuft NUR auf Zuruf des Betreibers — nie im Aufseher.
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "dropship", "tiktok_queue.json")
LEDGER = os.path.join(ROOT, "dropship", "_tiktok_upload_done.txt")
BEFEHL = os.path.join(ROOT, "dropship", "tiktok_befehl.json")
BEFEHL_GID = "gid://shopify/GenericFile/70741080342913"
SHOP = "au3j0y-hq.myshopify.com"


def token():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(ROOT, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


def gql(q, v=None):
    """Gibt DATA zurueck (nicht die volle Antwort — anders als tiktok_cowork_auftrag.gql!)."""
    body = json.dumps({"query": q, "variables": v or {}})
    with open("/tmp/_tj.json", "w") as f:
        f.write(body)
    for i in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + token(),
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_tj.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(2 * (i + 1)); continue
        if d.get("errors"):
            if "Throttled" in json.dumps(d["errors"]):
                time.sleep(3 * (i + 1)); continue
            sys.exit("GraphQL: " + json.dumps(d["errors"])[:200])
        return d.get("data") or {}
    sys.exit("Shopify blieb stumm.")


def produkt_aktiv(handle):
    d = gql('query($q:String!){products(first:3,query:$q){nodes{handle status onlineStoreUrl}}}',
            {"q": f"handle:{handle}*"})
    n = d["products"]["nodes"]
    if len(n) == 1:
        return n[0]["status"] == "ACTIVE" and bool(n[0]["onlineStoreUrl"])
    return any(x["handle"] == handle and x["status"] == "ACTIVE" and x["onlineStoreUrl"] for x in n)


def main():
    wunsch = sys.argv[1] if len(sys.argv) > 1 else ""
    q = json.load(open(QUEUE))
    schon = set()
    if os.path.exists(LEDGER):
        schon = {z.split("\t")[1].strip() for z in open(LEDGER) if "\t" in z}

    kandidat = None
    for b in q.get("beitraege", []):
        if not (b.get("frei") and b.get("video")):
            continue
        if b["slug"] in schon:
            continue
        if wunsch and b["slug"] != wunsch:
            continue
        kandidat = b
        break
    if not kandidat:
        sys.exit(f"Kein passender freier Beitrag{' fuer ' + wunsch if wunsch else ''} in der Queue.")

    einzel = not kandidat["slug"].startswith(("top-", "meisterwerk"))
    if einzel and not produkt_aktiv(kandidat["slug"]):
        sys.exit(f"⛔ {kandidat['slug']}: Produkt ist LIVE nicht mehr ACTIVE/veroeffentlicht — nicht gepostet.")

    befehl = {"id": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "slug": kandidat["slug"], "quelle": "tiktok_jetzt.py"}
    with open(BEFEHL, "w") as f:
        json.dump(befehl, f, ensure_ascii=False, indent=1)

    st = gql('mutation($i:[StagedUploadInput!]!){stagedUploadsCreate(input:$i){'
             'stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}',
             {"i": [{"resource": "FILE", "filename": "tiktok_befehl.json",
                     "mimeType": "application/json", "httpMethod": "POST",
                     "fileSize": str(os.path.getsize(BEFEHL))}]})
    t = st["stagedUploadsCreate"]["stagedTargets"]
    if not t:
        sys.exit("stagedUploadsCreate leer — Befehl NICHT beim PC angekommen.")
    cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", t[0]["url"]]
    for p in t[0]["parameters"]:
        cmd += ["-F", f"{p['name']}={p['value']}"]
    cmd += ["-F", f"file=@{BEFEHL};type=application/json"]
    rc = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
    if rc not in ("200", "201", "204"):
        sys.exit(f"Staging-Upload HTTP {rc} — Befehl NICHT beim PC angekommen.")
    r = gql('mutation($f:[FileUpdateInput!]!){fileUpdate(files:$f){'
            'files{... on GenericFile{url}} userErrors{message}}}',
            {"f": [{"id": BEFEHL_GID, "originalSource": t[0]["resourceUrl"]}]})
    if r["fileUpdate"]["userErrors"]:
        sys.exit("fileUpdate: " + json.dumps(r["fileUpdate"]["userErrors"]))
    # 02.09.: fileUpdate ist ASYNCHRON — die Verarbeitung kann NACH der Mutation scheitern
    # (belegt: FILE_STORAGE_LIMIT_EXCEEDED liess das CDN still auf dem alten Stand).
    # Ein «jetzt posten», das nie ankommt, ist schlimmer als eine klare Fehlermeldung.
    time.sleep(15)
    chk = gql('query($i:ID!){node(id:$i){... on GenericFile{fileErrors{code message}}}}',
              {"i": BEFEHL_GID})
    fehler = ((chk.get("node") or {}).get("fileErrors")) or []
    if fehler:
        sys.exit(f"⛔ Befehl NICHT auf dem CDN gelandet — {fehler[0].get('code')}: "
                 f"{fehler[0].get('message','')[:80]} (Datei-Speicher des Shopify-Plans voll?)")
    print(f"✅ Befehl {befehl['id']} liegt auf dem CDN: «{kandidat['slug']}» wird vom PC "
          f"innert ~10 Minuten gepostet (Browser startet er bei Bedarf selbst).")


if __name__ == "__main__":
    main()
