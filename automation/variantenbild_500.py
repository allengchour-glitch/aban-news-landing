#!/usr/bin/env python3
"""variantenbild_500.py — Google «Bild zu klein für die bevorstehende Maßnahme»: Variantenbilder auf ≥ 500 × 500 px.

DER BEFUND (Merchant Center, Betreiber-Screenshot 25.11.2026): 5'773 Angebote (3,4 %) haben ein Bild unter 500 × 500 px.
«Nach dem 31. Januar 2027 werden Bilder, die diese Mindestgröße nicht erfüllen, nicht mehr angezeigt.»
GEMESSEN 25.11.2026 (Bulk-Export, 55'883 aktive Produkte, 596'381 Varianten): 15'641 Varianten zeigen ein Bild < 500 px,
davon 15'511 über ihr eigenes VARIANTENBILD (nur 130 über das Hauptbild). Dahinter stehen 7'016 verschiedene Bilder,
fast alle 300–499 px (400×400 allein 711) — CJ liefert die Farbbilder so klein; ein grösseres Original gibt es dort nicht
(gleicher Befund wie bild_gross_nachladen.py bei den Hauptbildern). Google nimmt je Angebot das Variantenbild als image_link.

`google_variantenbild_gross.py` (03.10.) macht dasselbe, aber nur für die Google-Klasse «Image too small» und mit der
alten Grenze 250 px (Bekleidung). Die neue Regel gilt ab 500 px für ALLE Angebote — darum dieser eigene Lauf über den
ganzen aktiven Katalog.

REGEL
  - Liste: eigener Bulk-Export (Varianten → Bild-ID, URL, Masse), höchstens LISTE_STUNDEN (20) alt, atomar über bulk_laden.
  - Je VERSCHIEDENES Bild mit kürzerer Seite < 500 (und ≥ MIN_QUELLE 150, darunter wird nicht hochgerechnet):
    laden → mit Lanczos auf kürzere Seite ZIEL (600) → JPEG q92 → stagedUpload → `fileUpdate` ERSETZT DIE DATEI.
    Die Media-ID bleibt, damit bleibt die Zuordnung Farbe ↔ Bild an jeder Variante erhalten. Nichts wird gelöscht.
  - Rücklesen: Status READY und beide Kanten ≥ 500, erst dann «ok» ins Ledger.
  - Ausgeschlossen: Druck auf Bestellung / Editor (Tags printful_personalized_product, pod, printful*) — Editor ist heilig.
  - Extremformat (lange Seite wäre > 4096 px) → übersprungen, im Ledger als «format».
  - Ledger dropship/_variantenbild_500.tsv (datum, handle, media-id, alt BxH, neu BxH, Status) — ok/format/zu-klein
    werden nicht wiederholt, Fehler schon.
  - Hauptbilder bleiben Sache von bild_klein_fix.py / bild_quadrat_auffuellen.py (dort gilt «nie hochskalieren»).

ENV: SCHARF=1 schreibt (Vorgabe: trocken zählen) · CAP (Bilder je Lauf, Vorgabe 400) · WORKERS (4) · NEU=1 (Liste neu)
"""
import datetime as dt, io, json, os, subprocess, sys, threading, time, urllib.request, uuid
from concurrent.futures import ThreadPoolExecutor

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from seo_autopilot import gql
from bulk_laden import bulk_laden
from PIL import Image

REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_variantenbild_500.tsv")
LISTE = "/tmp/variantenbild_500.jsonl"
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "400"))
WORKERS = int(os.environ.get("WORKERS", "4"))
LISTE_STUNDEN = float(os.environ.get("LISTE_STUNDEN", "20"))
GRENZE, ZIEL, MIN_QUELLE, MAX_KANTE = 500, 600, 150, 4096
ENDGUELTIG = ("ok", "format", "zu-klein")
SPERR = ("printful_personalized_product", "pod")

# ⚠️ 25.11.: `variant.image` liefert eine ProductImage-ID — `fileUpdate` braucht die MediaImage-ID (Probelauf: 6×
# «Invalid id: gid://shopify/ProductImage/…»). Darum Varianten oben und ihr Medium als verschachtelte Verbindung.
BULK_Q = '''{ productVariants(query:"product_status:active"){ edges{ node{ id product{ handle status tags }
  media(first:1){ edges{ node{ id ... on MediaImage{ image{ url width height } } } } } } } } }'''


def bulk_holen():
    if (not os.environ.get("NEU") and os.path.exists(LISTE)
            and time.time() - os.path.getmtime(LISTE) < LISTE_STUNDEN * 3600):
        return True
    r = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}', {"q": BULK_Q})
    fe = r["bulkOperationRunQuery"]["userErrors"]
    if fe:
        print(f"BULK belegt/abgelehnt: {fe} — nächster Lauf", flush=True)
        return os.path.exists(LISTE)
    for _ in range(180):
        time.sleep(10)
        s = gql("{currentBulkOperation{status url errorCode}}")["currentBulkOperation"]
        if s["status"] in ("COMPLETED", "FAILED", "CANCELED"):
            break
    if s["status"] != "COMPLETED" or not s.get("url"):
        print(f"BULK {s['status']} {s.get('errorCode')}", flush=True)
        return os.path.exists(LISTE)
    return bulk_laden(s["url"], LISTE)


def arbeitsliste(erledigt):
    var, bilder = {}, {}
    with open(LISTE, encoding="utf-8") as f:
        for z in f:
            o = json.loads(z)
            if "__parentId" not in o:
                var[o["id"]] = o.get("product") or {}
                continue
            mid, im = o.get("id") or "", o.get("image")
            if not im or not mid.startswith("gid://shopify/MediaImage/") or mid in bilder or mid in erledigt:
                continue
            w, h = im.get("width") or 0, im.get("height") or 0
            if not w or min(w, h) >= GRENZE:
                continue
            p = var.get(o["__parentId"]) or {}
            if p.get("status") != "ACTIVE":
                continue
            tags = [t.lower() for t in p.get("tags") or []]
            if any(t in SPERR or t.startswith("printful") for t in tags):
                continue
            bilder[mid] = dict(mid=mid, url=im["url"], w=w, h=h, handle=p.get("handle", "?"))
    return list(bilder.values())


def laden(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=60).read()


def vergroessern(roh):
    im = Image.open(io.BytesIO(roh))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        weiss = Image.new("RGB", im.size, (255, 255, 255))
        weiss.paste(im, mask=im.split()[-1])
        im = weiss
    else:
        im = im.convert("RGB")
    kurz = min(im.size)
    if kurz < MIN_QUELLE:
        return None, "zu-klein"
    f = ZIEL / kurz
    neu = (round(im.width * f), round(im.height * f))
    if max(neu) > MAX_KANTE:
        return None, "format"
    im = im.resize(neu, Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, "JPEG", quality=92, optimize=True)
    return b.getvalue(), f"{neu[0]}x{neu[1]}"


def hochladen(daten):
    name = f"lx-var500-{uuid.uuid4().hex[:10]}.jpg"
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
    for _ in range(25):
        time.sleep(3)
        n = gql('query($i:ID!){node(id:$i){... on MediaImage{status image{width height}}}}', {"i": mid})["node"]
        im = (n or {}).get("image") or {}
        if (n or {}).get("status") == "READY" and min(im.get("width") or 0, im.get("height") or 0) >= GRENZE:
            return f"{im['width']}x{im['height']}"
        if (n or {}).get("status") == "FAILED":
            raise RuntimeError("Medium FAILED nach fileUpdate")
    return None


SCHLOSS = threading.Lock()
ZAEHLER = {"ok": 0, "fehler": 0, "anders": 0}


def eintragen(b, neu, status):
    with SCHLOSS:
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{b['handle']}\t{b['mid']}\t{b['w']}x{b['h']}\t{neu}\t{status}\n")
        ZAEHLER["ok" if status == "ok" else ("fehler" if status.startswith("FEHLER") else "anders")] += 1


def eins(b):
    try:
        daten, info = vergroessern(laden(b["url"]))
        if daten is None:
            eintragen(b, "-", info)
            return
        neu = ersetzen(b["mid"], hochladen(daten))
        eintragen(b, neu or info, "ok" if neu else "nicht-bestaetigt")
    except Exception as e:
        eintragen(b, "-", f"FEHLER {str(e)[:120]}")


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 6 and t[5] in ENDGUELTIG:
                erledigt.add(t[2])
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'} · Ledger erledigt {len(erledigt)}", flush=True)
    if not bulk_holen():
        print("FERTIG: keine Liste (Bulk fehlgeschlagen)")
        return
    liste = arbeitsliste(erledigt)
    print(f"offen: {len(liste)} verschiedene Variantenbilder < {GRENZE} px", flush=True)
    if not SCHARF:
        for b in liste[:10]:
            print(f"  {b['handle'][:50]} {b['w']}x{b['h']}", flush=True)
        print(f"FERTIG (trocken): {len(liste)} offen")
        return
    arbeit = liste[:CAP]
    with ThreadPoolExecutor(WORKERS) as ex:
        list(ex.map(eins, arbeit))
    print(f"FERTIG: {len(arbeit)} bearbeitet · {ZAEHLER['ok']} ok · {ZAEHLER['anders']} übersprungen/unbestätigt · "
          f"{ZAEHLER['fehler']} Fehler · noch offen ~{len(liste) - ZAEHLER['ok'] - ZAEHLER['anders']}")


if __name__ == "__main__":
    main()
