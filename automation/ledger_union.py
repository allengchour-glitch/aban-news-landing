#!/usr/bin/env python3
"""ledger_union.py — Anhänge eines Ledgers nach einem Snapshot-Restore retten, ohne Gelöschtes wiederzubeleben (07.10.2026).

GEMESSEN 07.10.2026 (Verbesserungsrunde, Plan-Tag 7): repo_vorspulen.sh vereinigte nur dropship/*.txt. Die 85 .tsv-Ledger
(Bildtausch, Lagerabgleich, Kategorie-fein, Anstupser …) verloren bei `git reset --hard` jede noch nicht gepushte Zeile.
Beleg: Bildtausch 06.10. 17:17 tauschte «hawaiihemd-…-606700» und «mushroom-luftkissen-…» (Log), die Ledger-Zeilen fehlen;
um 20:43 hielt der nächste Lauf beide für offen und tauschte sie ein zweites Mal (jeder Tausch = neue Google-Prüfung).

REGEL «Schwanz-Union»: Zurückgespielt werden nur Zeilen, die im Snapshot NACH der letzten Zeile stehen, die auch origin hat —
das sind Anhänge. Was im Snapshot weiter vorne steht und origin fehlt, wurde dort bewusst gelöscht (Purge) und bleibt draussen
(Zombie-Ledger-Klasse, Lehre 15.08.). Teilen Snapshot und origin KEINE Zeile, ist die Datei eine neu geschriebene Tabelle →
nichts zurückspielen. Zeilen mit «cj-ohne-antwort» nie.
  python3 automation/ledger_union.py <snapshot-ordner> <glob>   # z. B. "*.tsv" — hängt an dropship/<datei> an, druckt Zähler
  python3 automation/ledger_union.py --selbsttest
"""
import fnmatch, os, sys


def schwanz_neu(origin_zeilen, snap_zeilen):
    """Zeilen aus snap, die nach der letzten auch in origin vorhandenen Zeile stehen und origin fehlen."""
    have = set(origin_zeilen)
    letzte = -1
    for i, l in enumerate(snap_zeilen):
        if l in have:
            letzte = i
    if letzte < 0:
        return []
    return [l for l in snap_zeilen[letzte + 1:] if l.strip() and l not in have and "cj-ohne-antwort" not in l]


def vereinigen(snap, muster, ziel="dropship"):
    gesamt = 0
    for f in sorted(os.listdir(snap)):
        if not fnmatch.fnmatch(f, muster):
            continue
        repo = os.path.join(ziel, f)
        if not os.path.exists(repo):
            continue
        roh = open(repo, errors="ignore").read()
        neu = schwanz_neu(roh.splitlines(), open(os.path.join(snap, f), errors="ignore").read().splitlines())
        if neu:
            with open(repo, "a") as out:
                out.write(("" if not roh or roh.endswith("\n") else "\n") + "\n".join(neu) + "\n")
            gesamt += len(neu)
            print(f, "+", len(neu))
    print(f"union {muster}:", gesamt)
    return gesamt


def selbsttest():
    t = [
        (schwanz_neu(["a", "b"], ["a", "b", "c", "d"]) == ["c", "d"], "Anhang hinten wird gerettet"),
        (schwanz_neu(["a", "c"], ["a", "b", "c"]) == [], "Purge mittendrin (b) bleibt draussen"),
        (schwanz_neu(["a", "c"], ["a", "b", "c", "d"]) == ["d"], "Purge vorne + Anhang hinten → nur Anhang"),
        (schwanz_neu(["x", "y"], ["p", "q"]) == [], "keine gemeinsame Zeile = neu geschriebene Tabelle → nichts"),
        (schwanz_neu(["a"], ["a", "z\tcj-ohne-antwort"]) == [], "cj-ohne-antwort nie zurück"),
        (schwanz_neu(["a", "b", "c"], ["a", "b"]) == [], "origin weiter als Snapshot → nichts"),
        (schwanz_neu(["a", "b"], ["a", "b", "", "c"]) == ["c"], "Leerzeilen fallen weg"),
        # echter Fall 06.10.: origin hat die 20:43-Zeilen nicht, Snapshot hat 17:17 hinter der letzten gemeinsamen Zeile
        (schwanz_neu(["h1\t2026-10-05\ttausch"], ["h1\t2026-10-05\ttausch", "hawaii\t2026-10-06\ttausch-g"]) == ["hawaii\t2026-10-06\ttausch-g"],
         "Bildtausch-Zeile 17:17 wird gerettet"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}")
    return 0 if ok == len(t) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    vereinigen(sys.argv[1], sys.argv[2])
