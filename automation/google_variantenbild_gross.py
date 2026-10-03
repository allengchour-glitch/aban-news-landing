#!/usr/bin/env python3
"""google_variantenbild_gross.py — Google-Blocker «Image too small»: zu kleine VARIANTEN-Bilder an Ort und Stelle vergrössern.

GEMESSEN 03.10.2026: Die 14 Produkte mit «Image too small» haben alle ein grosses Hauptbild (≥ 500 px). Zu klein sind die
Varianten-Bilder (z. B. Hawaiihemd: 60/60 Varianten mit 188×245 px). Google nimmt je Variante deren Bild; für Bekleidung
verlangt es mindestens 250×250 px. `bild_klein_fix.py` schaut nur aufs Hauptbild und findet hier nichts.

REGEL
  - Quelle: Klasse «Image too small» aus dropship/_google_feedback_stand.json (google_feedback_wache, täglich).
  - Je Produkt jedes Varianten-Bild mit kürzerer Seite < MIN (250): Bild laden, mit Lanczos auf kürzere Seite ZIEL (600)
    vergrössern, per stagedUploadsCreate hochladen und mit `fileUpdate` die DATEI ERSETZEN — die Media-ID bleibt, damit
    bleibt die Zuordnung zur Variante (Farbe) erhalten. Nichts wird gelöscht.
  - Rücklesen: Bildbreite/-höhe ≥ MIN nach dem Ersetzen (Shopify verarbeitet asynchron → bis 60 s warten).
  - Ledger dropship/_google_variantenbild_gross.tsv (datum, handle, media-id, alt BxH, alte URL, Status).
  - DRY (Standard) zählt; SCHARF=1 schreibt.
"""
import datetime as dt, io, json, os, sys, time, urllib.request, uuid

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from seo_autopilot import gql
from PIL import Image

REPO = os.path.dirname(HIER)
STAND = os.path.join(REPO, "dropship", "_google_feedback_stand.json")
LEDGER = os.path.join(REPO, "dropship", "_google_variantenbild_gross.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MIN, ZIEL = 250, 600
KLASSE = "Image too small"

Q = ('query($h:String!){p:productByIdentifier(identifier:{handle:$h}){id status variants(first:100){nodes{media(first:1)'
     '{nodes{id ... on MediaImage{image{url width height}}}}}}}}')


def laden(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=60).read()


def vergroessern(roh):
    im = Image.open(io.BytesIO(roh)).convert("RGB")
    f = ZIEL / min(im.size)
    im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=90); return b.getvalue(), im.size


def hochladen(daten):
    name = f"lx-var-{uuid.uuid4().hex[:10]}.jpg"
    t = gql("""mutation($i:[StagedUploadInput!]!){stagedUploadsCreate(input:$i){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}""",
            {"i": [{"resource": "IMAGE", "filename": name, "mimeType": "image/jpeg", "httpMethod": "POST", "fileSize": str(len(daten))}]})["stagedUploadsCreate"]
    if t["userErrors"]:
        raise RuntimeError(t["userErrors"])
    z = t["stagedTargets"][0]
    grenze = "----lx" + uuid.uuid4().hex
    teile = b""
    for p in z["parameters"]:
        teile += f'--{grenze}\r\nContent-Disposition: form-data; name="{p["name"]}"\r\n\r\n{p["value"]}\r\n'.encode()
    teile += (f'--{grenze}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: image/jpeg\r\n\r\n'
              ).encode() + daten + f"\r\n--{grenze}--\r\n".encode()
    r = urllib.request.Request(z["url"], data=teile, method="POST",
                               headers={"Content-Type": f"multipart/form-data; boundary={grenze}"})
    urllib.request.urlopen(r, timeout=120).read()
    return z["resourceUrl"]


def ersetzen(mid, quelle):
    r = gql("""mutation($f:[FileUpdateInput!]!){fileUpdate(files:$f){files{id fileStatus} userErrors{field message code}}}""",
            {"f": [{"id": mid, "originalSource": quelle}]})["fileUpdate"]
    if r["userErrors"]:
        raise RuntimeError(r["userErrors"])
    for _ in range(20):
        time.sleep(3)
        n = gql('query($i:ID!){node(id:$i){... on MediaImage{status image{width height}}}}', {"i": mid})["node"]
        im = (n or {}).get("image") or {}
        if (n or {}).get("status") == "READY" and min(im.get("width") or 0, im.get("height") or 0) >= MIN:
            return f"{im['width']}x{im['height']}"
    return None


def main():
    handles = json.load(open(STAND))["handles"].get(KLASSE) or []
    erledigt = {z.split("\t")[2] for z in open(LEDGER, encoding="utf-8")
                if z.rstrip("\n").endswith("\tok")} if os.path.exists(LEDGER) else set()
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'} · {len(handles)} Produkte «{KLASSE}»", flush=True)
    n_klein = ok = fehler = 0
    for h in handles:
        p = gql(Q, {"h": h})["p"]
        if not p or p["status"] != "ACTIVE":
            continue
        gesehen = {}
        for v in p["variants"]["nodes"]:
            for m in v["media"]["nodes"]:
                im = m.get("image") or {}
                if im and min(im["width"], im["height"]) < MIN and m["id"] not in erledigt:
                    gesehen[m["id"]] = im
        n_klein += len(gesehen)
        print(f"  {h[:55]}: {len(gesehen)} zu kleine Variantenbilder", flush=True)
        if not SCHARF:
            continue
        for mid, im in gesehen.items():
            try:
                daten, groesse = vergroessern(laden(im["url"]))
                neu = ersetzen(mid, hochladen(daten))
                status = "ok" if neu else "nicht-bestaetigt"
                ok += bool(neu)
            except Exception as e:
                status = f"FEHLER {str(e)[:120]}"
                fehler += 1
            with open(LEDGER, "a", encoding="utf-8") as f:
                f.write(f"{dt.date.today()}\t{h}\t{mid}\t{im['width']}x{im['height']}\t{im['url']}\t{status}\n")
    print(f"FERTIG: {n_klein} zu kleine Variantenbilder · {ok} vergrössert+zurückgelesen · {fehler} Fehler")


if __name__ == "__main__":
    main()
