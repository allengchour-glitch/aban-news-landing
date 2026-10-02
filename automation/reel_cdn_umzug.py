#!/usr/bin/env python3
"""reel_cdn_umzug.py — wartende Reels aus dem Repo (raw.githubusercontent) ins Shopify-CDN (02.10.2026).

ANLASS: Betreiber «nutze grow speicherplatz». Während der Dateispeicher voll war (bis 01.10.), legte der Reel-Motor seine
Reels im Repo `social/reels/` ab (682 MB, 254 Dateien) und die Queue zeigte auf raw.githubusercontent.com. Seit 01.10. lädt
der Motor neue Reels zuerst ins CDN; die 56 schon wartenden (`ready`) zeigten weiter auf GitHub — Metricool/Meta holen
sie von dort, das Repo bleibt aufgebläht und jeder Branch-Wechsel bricht die Links (Pfad enthält den Branchnamen).

Was es tut, je wartendem Reel mit GitHub-URL:
  1. lokale Datei `social/reels/<name>.mp4` vorhanden? sonst überspringen (Grund im Log)
  2. Upload über `upload_to_shopify_cdn.mjs` (READY abwarten) → CDN-URL
  3. CDN-URL per HTTP prüfen (200, video/*, Grösse = lokale Datei)
  4. `reels_seed.csv` NEU lesen und nur die Zeile ändern, die noch `ready` ist UND noch die alte URL trägt (atomar,
     os.replace) — 20+ Skripte schreiben die Datei (Lost-Update-Lehre 28.09.)
Der Dateiname bleibt gleich (`reel_<id>.mp4`) → die Doppelpost-Sperre über Video-Basenames greift weiter.
Repo-Dateien werden NICHT gelöscht (Rückfall); Aufräumen ist ein eigener, späterer Schritt.

  python3 automation/reel_cdn_umzug.py            # Trockenlauf (Standard)
  SCHARF=1 python3 automation/reel_cdn_umzug.py   # lädt hoch + schreibt
"""
import csv, os, re, subprocess, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
CSV = os.path.join(HIER, "reels_seed.csv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX", "80"))
NODE = "/opt/node22/bin/node"


def lokal(url):
    m = re.search(r"/social/reels/([^/?#]+\.mp4)", url or "")
    return os.path.join(REPO, "social", "reels", m.group(1)) if m else None


def hochladen(pfad):
    env = {k: v for k, v in os.environ.items() if k not in ("SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET")}
    env["SHOPIFY_ADMIN_TOKEN"] = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    p = subprocess.run([NODE, os.path.join(HIER, "upload_to_shopify_cdn.mjs"), pfad], cwd=REPO, env=env,
                       capture_output=True, text=True, timeout=600)
    url = [l.strip() for l in p.stdout.splitlines() if l.strip().startswith("https://cdn.shopify.com/")]
    if p.returncode != 0 or not url:
        raise RuntimeError(f"Upload gescheitert (rc {p.returncode}): {(p.stderr or p.stdout)[-200:]}")
    return url[-1]


def pruefen(url, groesse):
    letzter = ""
    for a in range(6):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=60)
            typ, laenge = r.headers.get("Content-Type", ""), int(r.headers.get("Content-Length") or 0)
            if r.status == 200 and typ.startswith("video/") and laenge == groesse:
                return True
            letzter = f"{r.status} {typ} {laenge}≠{groesse}"
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:100]}"
        time.sleep(5 + 5 * a)
    raise RuntimeError("CDN-Prüfung: " + letzter)


def zeile_umschreiben(rid, alt, neu):
    with open(CSV, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f); felder = rd.fieldnames; rows = list(rd)
    n = 0
    for r in rows:
        if r.get("id") == rid and (r.get("status") or "").strip() == "ready" and r.get("video_url") == alt:
            r["video_url"] = neu; n += 1
    if n:
        tmp = CSV + ".tmp"
        with open(tmp, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=felder, lineterminator="\n"); w.writeheader(); w.writerows(rows)
        os.replace(tmp, CSV)
    return n


def main():
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    rows = list(csv.DictReader(open(CSV, newline="", encoding="utf-8")))
    offen = [r for r in rows if (r.get("status") or "").strip() == "ready" and "raw.githubusercontent.com" in (r.get("video_url") or "")]
    print(f"{len(offen)} wartende Reels zeigen auf GitHub", flush=True)
    ok = fehlt = fehler = 0
    for r in offen[:MAX]:
        pfad = lokal(r["video_url"])
        if not pfad or not os.path.isfile(pfad):
            fehlt += 1; print(f"  ⚠️ {r['id']}: lokale Datei fehlt ({pfad})", flush=True); continue
        if not SCHARF:
            print(f"  (trocken) {r['id']} ← {os.path.basename(pfad)} {os.path.getsize(pfad)//1024} KB"); continue
        try:
            neu = hochladen(pfad)
            pruefen(neu, os.path.getsize(pfad))
            if zeile_umschreiben(r["id"], r["video_url"], neu):
                ok += 1; print(f"  ✅ {r['id']} → {neu}", flush=True)
            else:
                print(f"  · {r['id']}: Zeile inzwischen geändert (nicht mehr ready/andere URL) — CDN-Datei bleibt ungenutzt", flush=True)
        except Exception as e:
            fehler += 1; print(f"  ✗ {r['id']}: {e}", flush=True)
    print(f"FERTIG: {ok} umgezogen, {fehlt} ohne lokale Datei, {fehler} Fehler", flush=True)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
