#!/usr/bin/env python3
# =============================================================================
#  verzeichnis_urls.py — Verzeichnisse, deren eigene Adresse ins Leere läuft
# -----------------------------------------------------------------------------
#  /vergleich/ enthielt 197 Seiten, hatte aber weder ein index.html noch eine
#  Regel in _redirects. Wer die Adresse zurückkürzt, einem abgeschnittenen Link
#  folgt oder sie aus einer Mail kopiert, landete auf 404. Gefunden am
#  29.08.2026, damals acht Verzeichnisse mit zusammen 324 Seiten.
#
#  Ein Verzeichnis ist in Ordnung, wenn es EINES von beiden hat:
#    * ein index.html, oder
#    * eine _redirects-Regel auf seinen Hub.
#
#  Ausgenommen sind Verzeichnisse, deren Seiten alle noindex tragen (Downloads
#  nach dem Kauf) — dort wäre eine öffentliche Übersicht falsch, nicht fehlend.
#
#  Aufruf:  python3 tools/verzeichnis_urls.py [--selbsttest]
# =============================================================================

import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NICHT_SCANNEN = {"node_modules", "node_modules_pw", "_site", ".git", "_manuscripts",
                 "spiele-dev", "dropship", "data", "video-prototypes", "automation",
                 "reports", "tools", "functions", "assets", "pod", "reels", "social"}
NOINDEX = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', re.I)


def redirect_quellen():
    """Alle Quellpfade aus _redirects, mit und ohne Schrägstrich am Ende."""
    pfad = os.path.join(ROOT, "_redirects")
    raus = set()
    if not os.path.isfile(pfad):
        return raus
    for z in open(pfad, encoding="utf-8", errors="ignore"):
        z = z.strip()
        if not z or z.startswith("#"):
            continue
        q = z.split()[0]
        raus.add(q.rstrip("/"))
        raus.add(q.rstrip("/") + "/")
    return raus


def verzeichnisse():
    """Verzeichnisse mit HTML-Seiten, relativ zur Wurzel."""
    raus = []
    for tiefe in ("*", "*/*"):
        for d in sorted(glob.glob(os.path.join(ROOT, tiefe))):
            if not os.path.isdir(d):
                continue
            rel = os.path.relpath(d, ROOT).replace(os.sep, "/")
            if any(teil in NICHT_SCANNEN for teil in rel.split("/")) or rel.startswith("."):
                continue
            seiten = glob.glob(os.path.join(d, "*.html"))
            if seiten:
                raus.append((rel, seiten))
    return raus


def pruefe():
    quellen = redirect_quellen()
    offen = []
    for rel, seiten in verzeichnisse():
        if os.path.isfile(os.path.join(ROOT, rel, "index.html")):
            continue
        if "/" + rel in quellen or "/" + rel + "/" in quellen:
            continue
        # Verzeichnisse, in denen ALLE Seiten noindex sind, brauchen keine Übersicht.
        sichtbar = 0
        for s in seiten:
            if not NOINDEX.search(open(s, encoding="utf-8", errors="ignore").read(4000)):
                sichtbar += 1
        if sichtbar == 0:
            continue
        offen.append((rel, len(seiten), sichtbar))
    return offen


def selbsttest():
    """⚠️ Ein Prüfer, der nichts mehr findet, sieht aus wie Erfolg. Dieser Test legt
    ein Verzeichnis an, das WEDER index.html NOCH eine Regel hat, und verlangt, dass
    es gemeldet wird — und dass es nach dem Anlegen eines index.html schweigt."""
    import shutil
    d = os.path.join(ROOT, "_selbsttest_verz")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    try:
        open(os.path.join(d, "a.html"), "w", encoding="utf-8").write(
            '<!doctype html><meta charset="utf-8"><title>a</title><h1>a</h1>')
        ohne = any(r[0] == "_selbsttest_verz" for r in pruefe())
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(
            '<!doctype html><meta charset="utf-8"><title>i</title><h1>i</h1>')
        mit = any(r[0] == "_selbsttest_verz" for r in pruefe())
    finally:
        shutil.rmtree(d, ignore_errors=True)
    ok = ohne and not mit
    print(f"  {'✔' if ohne else '✖'} ohne index.html und ohne Regel → gemeldet: {ohne} (erwartet True)")
    print(f"  {'✔' if not mit else '✖'} mit index.html → geschwiegen: {not mit} (erwartet True)")
    return 0 if ok else 1


def main():
    if "--selbsttest" in sys.argv:
        print("Selbsttest verzeichnis_urls.py:")
        return selbsttest()
    offen = pruefe()
    if not offen:
        print("✔ jede Verzeichnis-Adresse führt irgendwohin (index.html oder _redirects)")
        return 0
    gesamt = sum(o[1] for o in offen)
    print(f"⚠ {len(offen)} Verzeichnis(se) ohne index.html und ohne _redirects-Regel "
          f"({gesamt} Seiten dahinter):")
    for rel, n, sichtbar in offen:
        print(f"   /{rel}/  — {n} Seiten, davon {sichtbar} indexierbar")
    print("   → entweder ein index.html anlegen oder eine Regel in _redirects auf den Hub")
    return 1


if __name__ == "__main__":
    sys.exit(main())
