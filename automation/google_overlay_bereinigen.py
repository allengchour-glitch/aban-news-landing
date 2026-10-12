#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_overlay_bereinigen.py — «Promotional overlay on image»: Werbetext auf hellem Grund aus dem Hauptbild entfernen (12.10.2026).

ANLASS: 31 Produkte mit diesem Google-Blocker; beim Bildtausch fand sich für die Hälfte kein sauberes Ersatzbild. Manche Hauptbilder
tragen nur ein Etikett auf hellem Grund («RED» über einer Lesebrille) — das lässt sich entfernen, ohne den Artikel anzufassen.

VERFAHREN je Produkt (Klasse aus dem letzten Google-Scan, Bildtausch-Sperre wird respektiert):
  1. Erstes Bild laden, `tools/bild_text_weg.py` anwenden — nur Status «bereinigt» zählt (gleichmässiger Rand, kein Balken,
     danach 0 Wörter). Alles andere bleibt unverändert.
  2. Bereinigtes Bild als NEUES Medium hochladen (auf READY warten, sonst wieder löschen), an Stelle 1 setzen, zurücklesen.
     Das Original bleibt als Bild 2 erhalten — nichts wird gelöscht.
  3. Ledger dropship/_google_bild_tausch.tsv, Art «bereinigt» (alte/neue Media-ID) → sperrt andere Umsortierer
     (bildtausch_sperre.py). Rückweg: `python3 automation/google_bild_tausch.py --rueckweg <handle>` (SCHARF=1).

  python3 automation/google_overlay_bereinigen.py              # Trockenlauf
  SCHARF=1 python3 automation/google_overlay_bereinigen.py
"""
import io, json, os, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
sys.path.insert(0, os.path.join(REPO, "tools"))
import bild_quadrat_auffuellen as bq       # hochladen() + sgql() — derselbe geprüfte Upload-Weg
import bild_text_weg as btw
import bildtausch_sperre as bs
from PIL import Image

SCHARF = os.environ.get("SCHARF") == "1"
KLASSE = os.environ.get("KLASSE", "Promotional overlay on image")
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
LEDGER = os.path.join(REPO, "dropship/_google_bild_tausch.tsv")
IDS = os.path.join(REPO, "dropship/_google_bild_tausch_ids.tsv")
GOOGLE = "gid://shopify/Publication/302872297857"


def g(q, v=None):
    return (bq.sgql(q, v) or {}).get("data") or {}


def main():
    stand = json.load(open(STAND))
    handles = stand["handles"].get(KLASSE) or []
    gesperrt = bs.gesperrte_handles()
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {KLASSE} · {len(handles)} gemeldet (Stand {stand['stand']}) · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    zahl = {"bereinigt": 0, "unsicher": 0, "sauber": 0, "rest_text": 0, "gesperrt": 0, "nicht_aktiv": 0, "fehler": 0}
    for h in handles:
        if h in gesperrt:
            zahl["gesperrt"] += 1; continue
        p = g('query($h:String!){ productByHandle(handle:$h){ id title status publishedOnPublication(publicationId:"%s") '
              'media(first:10){ nodes{ id ... on MediaImage{ image{ url } } } } } }' % GOOGLE, {"h": h}).get("productByHandle")
        if not p or p["status"] != "ACTIVE" or not p.get("publishedOnPublication"):
            zahl["nicht_aktiv"] += 1; continue
        med = [m for m in p["media"]["nodes"] if (m.get("image") or {}).get("url")]
        if not med:
            zahl["fehler"] += 1; continue
        alt_id, url = med[0]["id"], med[0]["image"]["url"]
        try:
            img = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=60).read()))
        except Exception as e:
            print(f"  ✗ {h}: Bild nicht ladbar ({e})"); zahl["fehler"] += 1; continue
        st, info, neu = btw.bearbeite(img)
        zahl[st] += 1
        if st != "bereinigt":
            print(f"  · {st:9} {h[:55]:55} {info.get('grund', info.get('text', ''))[:50]}", flush=True)
            continue
        print(f"  ✓ bereinigt {h[:55]:55} weg: {info.get('text', '')[:40]}", flush=True)
        if not SCHARF:
            continue
        buf = io.BytesIO(); neu.save(buf, "JPEG", quality=92)
        src = bq.hochladen(buf.getvalue(), f"{h[:40]}-ohne-text.jpg")
        if not src:
            print(f"  ✗ {h}: Upload fehlgeschlagen"); zahl["fehler"] += 1; continue
        cr = g('mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$m){ media{ id } mediaUserErrors{ message } } }',
               {"id": p["id"], "m": [{"originalSource": src, "mediaContentType": "IMAGE", "alt": p["title"][:250]}]}).get("productCreateMedia") or {}
        mid = ((cr.get("media") or [{}])[0] or {}).get("id")
        if cr.get("mediaUserErrors") or not mid:
            print(f"  ✗ {h}: Medium nicht angelegt {cr.get('mediaUserErrors')}"); zahl["fehler"] += 1; continue
        status = "PROCESSING"
        for _ in range(15):
            time.sleep(3)
            status = (g('query($id:ID!){ node(id:$id){ ... on MediaImage{ status } } }', {"id": mid}).get("node") or {}).get("status") or status
            if status in ("READY", "FAILED"):
                break
        if status != "READY":
            g('mutation($id:ID!,$m:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$m){ deletedMediaIds } }', {"id": p["id"], "m": [mid]})
            print(f"  ✗ {h}: Medium {status} — wieder entfernt"); zahl["fehler"] += 1; continue
        g('mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ userErrors{ message } } }',
          {"id": p["id"], "m": [{"id": mid, "newPosition": "0"}]})
        erstes = None
        for _ in range(10):
            time.sleep(2)
            n = g('query($id:ID!){ product(id:$id){ media(first:1){ nodes{ id } } } }', {"id": p["id"]}).get("product") or {}
            erstes = ((n.get("media") or {}).get("nodes") or [{}])[0].get("id")
            if erstes == mid:
                break
        if erstes != mid:
            print(f"  ✗ {h}: Reihenfolge nicht bestätigt (vorne {erstes})"); zahl["fehler"] += 1; continue
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{h}\t{time.strftime('%Y-%m-%d')}\tbereinigt\t{alt_id}\t{mid}\tText weg: {info.get('text', '')[:60]}\n")
        bekannt = {z.split("\t")[0] for z in open(IDS, encoding="utf-8")} if os.path.exists(IDS) else set()
        if h not in bekannt:
            with open(IDS, "a", encoding="utf-8") as f:
                f.write(f"{h}\t{p['id']}\n")
        print(f"    → neues Hauptbild vorne, zurückgelesen ({mid.split('/')[-1]}), Original als Bild 2", flush=True)
    print("FERTIG:", " · ".join(f"{k} {v}" for k, v in zahl.items() if v), flush=True)
    return 0 if zahl["fehler"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
