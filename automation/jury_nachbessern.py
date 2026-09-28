#!/usr/bin/env python3
"""jury_nachbessern.py — von der Gemini-Jury gesperrte Bildposts reparieren statt wegwerfen (28.09.2026).

Anlass: Betreiber «mehr verbessern». Nach dem Einbau der Jury standen 32 Bildposts auf `jury-skip`, 28 davon aus der
Kimi-Queue. Die Gründe (GEMESSEN, Jury-Begründungen) fallen in zwei reparierbare Klassen:
  BILD     englischer Lieferantentext / Fremdlogo / schwaches erstes Bild auf dem gewählten Produktbild
           → dasselbe Produkt hat meist 3–8 weitere Bilder: das nächste nehmen, das die Jury besteht.
  CAPTION  die Kimi-Zeile verspricht, was das Bild nicht zeigt («Mondstein», «Reise-Rucksack», «Color-Block»)
           → erste zwei Zeilen aus dem ECHTEN Shopify-Titel und dem Live-Preis neu bauen (keine KI, keine Erfindung).
Nicht reparierbar (bleibt jury-skip): K.-o. heilversprechen / waffe / anstoessig, Produkt nicht kaufbar.

Ablauf je Zeile (einmal je Zeile, Ledger dropship/_jury_nachbesserung.tsv):
  1. Produkt über die tokenlose Storefront API (Zeilen-ID endet auf die Shopify-ID): Titel, Preis, Bilder, kaufbar.
  2. Kandidaten: (Bild, Caption) — ehrliche Caption zuerst mit dem alten Bild, dann mit jedem anderen Bild.
     Bilder, die schon gepostet wurden (dropship/_posted_media.txt, Dateiname), fallen weg.
  3. gemini_jury.py je Kandidat (höchstens VERSUCHE=4 je Zeile). Der erste bestandene gewinnt.
  4. Zeile bekommt neues Bild + Caption + «ready» — nur wenn sie in der Datei NOCH «jury-skip» ist (nachgelesen,
     atomar; Lehre Lost Update 28.09.). Der Poster prüft vor dem Post ohnehin noch einmal (gleicher Cache).

  python3 automation/jury_nachbessern.py              → Trockenlauf (urteilt, schreibt nichts in die Queue)
  SCHARF=1 python3 automation/jury_nachbessern.py     → schreiben;  MAX=n Zeilen je Lauf (Standard 12)
"""
import csv, json, os, re, subprocess, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
Q = "social/posts_image.csv"
LEDGER = "dropship/_jury_nachbesserung.tsv"
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX", "12"))
VERSUCHE = int(os.environ.get("VERSUCHE", "4"))
NICHT_REPARIERBAR = {"heilversprechen", "waffe", "anstoessig"}


def sf(pid):
    q = ('{ product(id:"gid://shopify/Product/%s"){ title availableForSale onlineStoreUrl '
         'priceRange{minVariantPrice{amount} maxVariantPrice{amount}} images(first:10){nodes{url width height}} } }' % pid)
    for a in range(3):
        try:
            r = urllib.request.Request("https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json",
                                       data=json.dumps({"query": q}).encode(), headers={"Content-Type": "application/json"})
            return (json.load(urllib.request.urlopen(r, timeout=30)).get("data") or {}).get("product")
        except Exception:
            time.sleep(3 * (a + 1))
    return None


def jury(bild, caption):
    p = subprocess.run(["python3", "automation/gemini_jury.py", bild, "--caption", caption, "--typ", "bild"],
                       capture_output=True, text=True, timeout=400)
    try:
        v = json.loads((p.stdout or "").strip().splitlines()[-1])
    except Exception:
        v = {}
    return p.returncode, v


def ehrliche_caption(alt, titel, preis):
    """Zeile 1 (Hook) + Zeile 2 (Name · Preis) aus dem echten Titel; ab Zeile 3 bleibt der bewährte Rest."""
    teile = re.split(r"\s+[–—-]\s+", titel.strip(), maxsplit=1)
    vor, nach = (teile + [""])[:2]
    hook = (nach[:1].upper() + nach[1:]) if nach else "Neu bei LuxeStyle 🇨🇭"
    rest = alt.split("\n")[2:]
    return "\n".join([hook, f"{vor} · CHF {preis:.2f}"] + rest)


def jpg(url):
    return url + ("&" if "?" in url else "?") + "format=jpg" if not re.search(r"\.jpe?g(\?|$)", url, re.I) else url


def main():
    gemacht = set()
    if os.path.exists(LEDGER):
        gemacht = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    gepostet = set()
    if os.path.exists("dropship/_posted_media.txt"):
        gepostet = {l.strip() for l in open("dropship/_posted_media.txt", encoding="utf-8") if l.strip()}
    rows = list(csv.DictReader(open(Q, encoding="utf-8")))
    offen = [r for r in rows if r["status"] == "jury-skip" and r["id"] not in gemacht]
    print(f"jury-skip offen: {len(offen)} (bereits versucht: {len(gemacht)}) · diese Runde höchstens {MAX}")
    neu, log = {}, []
    for r in offen[:MAX]:
        zid = r["id"]
        m = re.search(r"(\d{12,})\s*$", zid)
        if not m:
            log.append((zid, "keine-id", "")); continue
        _, alt_v = jury(r["image_url"], r["caption"])
        if set(alt_v.get("ko") or []) & NICHT_REPARIERBAR:
            log.append((zid, "nicht-reparierbar", ",".join(alt_v["ko"]))); continue
        p = sf(m.group(1))
        if not p or not p.get("availableForSale") or not p.get("onlineStoreUrl"):
            log.append((zid, "nicht-kaufbar", "")); continue
        preis = float(p["priceRange"]["minVariantPrice"]["amount"])
        cap = ehrliche_caption(r["caption"], p["title"], preis)
        alt_bild = r["image_url"].split("?")[0].rsplit("/", 1)[-1]
        bilder = [r["image_url"]] + [jpg(n["url"]) for n in p["images"]["nodes"]
                                     if n["url"].split("?")[0].rsplit("/", 1)[-1] not in (alt_bild,)
                                     and n["url"].split("?")[0].rsplit("/", 1)[-1] not in gepostet
                                     and min(n.get("width") or 0, n.get("height") or 0) >= 600]
        treffer = None
        for b in bilder[:VERSUCHE]:
            rc, v = jury(b, cap)
            print(f"  {zid[:48]:48s} {'altes' if b == r['image_url'] else 'neues'} Bild → {rc} {v.get('schnitt')} "
                  f"{','.join(v.get('ko') or [])} {str(v.get('gruende',''))[:90]}", flush=True)
            if rc == 0:
                treffer = (b, v); break
        if treffer:
            neu[zid] = (treffer[0], cap)
            log.append((zid, "repariert", f"{treffer[1].get('schnitt')} {'bild+caption' if treffer[0] != r['image_url'] else 'caption'}"))
        else:
            log.append((zid, "kein-kandidat", f"{len(bilder[:VERSUCHE])} versucht"))
    if SCHARF:
        if neu:
            aktuell = list(csv.DictReader(open(Q, encoding="utf-8")))
            felder = list(aktuell[0].keys())
            n = 0
            for r in aktuell:
                if r["id"] in neu and r["status"] == "jury-skip":
                    r["image_url"], r["caption"] = neu[r["id"]]; r["status"] = "ready"; n += 1
            tmp = Q + ".tmp"
            with open(tmp, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=felder, lineterminator="\n"); w.writeheader(); w.writerows(aktuell)
            os.replace(tmp, Q)
            print(f"geschrieben: {n} Zeile(n) zurück auf ready")
        with open(LEDGER, "a", encoding="utf-8") as f:
            for z in log:
                f.write(f"{z[0]}\t{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{z[1]}\t{z[2]}\n")
    from collections import Counter
    print(("" if SCHARF else "TROCKEN — ") + "FERTIG: " + " · ".join(f"{k} {v}" for k, v in Counter(x[1] for x in log).most_common()))


if __name__ == "__main__":
    main()
