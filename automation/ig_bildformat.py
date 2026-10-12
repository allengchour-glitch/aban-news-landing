#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ig_bildformat.py — passt ein Bild in Instagrams Feed-Format? (12.10.2026, Verbesserungsrunde)

ANLASS (GEMESSEN 12.10.): Bild-Post «kimi-stylish-hydriert…» scheiterte bei Instagram (über Metricool) mit
«Media container not created by unknown cause». Das Bild ist 209×666 px (Seitenverhältnis 0,31). Unter den 42 wartenden
Bild-Posts lagen 3 weitere ausserhalb (0,75 · 0,71 · 0,66). Der Poster hatte elf Schichten (Doppelpost, Text im Bild, Jury,
Kaufbarkeit …), aber keine für das Format — und Bild-Posts gehen seit 09.10. nur noch auf Instagram.

REGEL (QUELLE: Meta, Instagram Content Publishing — Feed-Bilder zwischen 4:5 und 1.91:1, Breite mindestens 320 px):
  Seitenverhältnis Breite/Höhe 0,8 … 1,91 UND Breite ≥ 320 px → postbar.  Sonst → «format-skip».
  Nicht ladbar → unbekannt (Zeile bleibt «ready», wie bei den anderen Schichten).

  python3 automation/ig_bildformat.py --url URL           Exit 0 = postbar · 3 = ausserhalb · 2 = nicht ladbar
  python3 automation/ig_bildformat.py --queue [CSV]        Wächter: alle «ready»-Zeilen messen (Standard: Trockenlauf)
  SCHARF=1 python3 automation/ig_bildformat.py --queue     … und ausserhalb liegende auf «format-skip» setzen
  python3 automation/ig_bildformat.py --selbsttest
"""
import csv, io, os, sys, urllib.request

from PIL import Image

MIN_V, MAX_V, MIN_BREITE = 0.8, 1.91, 320
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_STD = os.path.join(REPO, "social/posts_image.csv")


def urteil(breite, hoehe):
    """→ (postbar, grund)."""
    if not breite or not hoehe:
        return False, "keine Masse"
    v = breite / hoehe
    if v < MIN_V:
        return False, f"zu hoch ({breite}×{hoehe}, {v:.2f} < {MIN_V})"
    if v > MAX_V:
        return False, f"zu breit ({breite}×{hoehe}, {v:.2f} > {MAX_V})"
    if breite < MIN_BREITE:
        return False, f"zu klein ({breite} px < {MIN_BREITE})"
    return True, f"{breite}×{hoehe} ({v:.2f})"


def masse(url):
    """Bildmasse; erst die ersten 64 KB (reicht für JPEG/PNG-Kopf), sonst das ganze Bild. None = nicht ladbar."""
    kopf = {"User-Agent": "Mozilla/5.0"}
    try:
        b = urllib.request.urlopen(urllib.request.Request(url, headers={**kopf, "Range": "bytes=0-65535"}), timeout=30).read()
        try:
            return Image.open(io.BytesIO(b)).size
        except Exception:
            b = urllib.request.urlopen(urllib.request.Request(url, headers=kopf), timeout=60).read()
            return Image.open(io.BytesIO(b)).size
    except Exception:
        return None


def queue(pfad, scharf):
    rows = list(csv.DictReader(open(pfad, encoding="utf-8")))
    felder = list(rows[0].keys()) if rows else []
    ready = [r for r in rows if (r.get("status") or "").strip() == "ready"]
    raus, unklar = [], 0
    for r in ready:
        m = masse((r.get("image_url") or "").strip())
        if m is None:
            unklar += 1
            continue
        ok, grund = urteil(*m)
        if not ok:
            raus.append((r, grund))
    for r, grund in raus:
        print(f"  ✗ {r['id'][:60]:60} {grund}")
    if scharf and raus:
        for r, _ in raus:
            r["status"] = "format-skip"
        tmp = pfad + ".tmp"
        with open(tmp, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=felder, lineterminator="\n")   # wie das Original (sonst 627 Zeilen Diff)
            w.writeheader()
            w.writerows(rows)
        os.replace(tmp, pfad)
    print(f"IG-FORMAT: {len(ready)} ready geprüft · {len(raus)} ausserhalb{' → format-skip' if scharf and raus else ''} · "
          f"{unklar} nicht ladbar · {len(ready) - len(raus) - unklar} postbar{'' if scharf else ' (TROCKEN)'}")
    return 0


def selbsttest():
    faelle = [((1080, 1350), True), ((1080, 1080), True), ((1080, 566), True), ((320, 400), True),
              ((209, 666), False), ((1351, 1800), False), ((1000, 1400), False), ((1325, 2000), False),
              ((2000, 1000), False), ((300, 300), False)]
    fehler = [(m, soll) for m, soll in faelle if urteil(*m)[0] != soll]
    for m, soll in faelle:
        print(f"  {'OK  ' if urteil(*m)[0] == soll else 'FEHL'} {m[0]}×{m[1]} → {urteil(*m)[1]}")
    # Gegenprobe am echten Ladeweg: ein gerendertes 209×666-Bild aus einer Datei-URL muss «ausserhalb» ergeben
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "hoch.jpg")
        Image.new("RGB", (209, 666), (240, 240, 240)).save(p)
        m = masse("file://" + p)
        lade_ok = m == (209, 666) and not urteil(*m)[0]
        print(f"  {'OK  ' if lade_ok else 'FEHL'} Ladeweg: Datei 209×666 gemessen als {m}")
    ok = not fehler and lade_ok
    print("SELBSTTEST", "OK" if ok else "FEHLER")
    return 0 if ok else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    if "--queue" in a:
        i = a.index("--queue")
        pfad = a[i + 1] if len(a) > i + 1 and not a[i + 1].startswith("-") else CSV_STD
        sys.exit(queue(pfad, os.environ.get("SCHARF") == "1"))
    if "--url" in a:
        m = masse(a[a.index("--url") + 1])
        if m is None:
            print("nicht ladbar"); sys.exit(2)
        ok, grund = urteil(*m)
        print(grund)
        sys.exit(0 if ok else 3)
    sys.exit(__doc__)
