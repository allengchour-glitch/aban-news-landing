#!/usr/bin/env python3
"""ledger_schrumpf_tor.py — kein Ledger in dropship/ darf beim Commit still schrumpfen (15.10.2026).

WARUM (gemessen 15.10., git log --numstat über 14 T):
  · 15.10. 00:18–00:21 UTC: `dropship/_cj_lager.tsv` 58'834 → 198 Zeilen (Commit ab536a2f1, «Reel-Queue …», über
    git_sichern.sh `git add -A dropship/`), dazu `_cj_nachpruefung.tsv` 8'842 → 10 (ad98acf1d). Beide Schreiber hängen nur an
    (`open(…, "a")`), im Fenster gab es keinen Merge, keinen Stash, kein Reset (reflog) — der Auslöser ist nicht belegbar.
    Gerettet hat es zufällig ein Hand-Merge (Union mit origin), sonst wären die eigenen Lagersperren und 21-T-Wiedervorlagen weg.
  · 02.10.: `_versand_jenachland.txt` 14'403 → 1'452 beim Entfernen von Konfliktmarkern — fiel nie auf.
  Jeder Verlust muss durch EINE Tür: den Commit. Dort steht jetzt dieses Tor — unabhängig vom Auslöser.

REGEL (automation/ledger_regeln.json):
  Datei passt auf «muster» und nicht auf «ausgenommen»; die neue Fassung hat ≥ min_verlust (200) Zeilen weniger als die
  Vergleichsfassung UND weniger als anteil (50 %) davon → HEILEN: Zeilen der Vergleichsfassung in ihrer Reihenfolge, dahinter
  jede Zeile der Arbeitsfassung, die dort fehlt (Ledger: «letzte Zeile gewinnt» bleibt richtig, die neuen stehen hinten).
  Geschrieben wird an Ort und Stelle (kein os.replace: Anhänger mit offenem Griff schrieben sonst ins Leere), direkt vor dem
  Schreiben neu gelesen, damit eben angehängte Zeilen nicht verloren gehen. Danach `git add`.
  Gewollte Kürzung: dropship/_ledger_schrumpf_erlaubt.txt — «pfad<TAB>JJJJ-MM-TT», gilt nur an diesem UTC-Tag.

MODI:
  --staged      Committer, direkt vor `git commit`: Index gegen HEAD (auch gelöschte Ledger). Exit immer 0.
  --merge       git_aufloesen.sh vor dem Merge-Commit: Vergleichsfassung = Vereinigung von HEAD und MERGE_HEAD.
  --verlauf N   Aufseher stündlich: Commits der letzten N Stunden; ist eine Datei bei HEAD noch geschrumpft gegenüber der
                Fassung vor dem Schrumpf-Commit → heilen + add (committen tut der nächste Committer).
  --selbsttest  in einem Wegwerf-Repo, ohne Netz.
AUSGABE: nur bei Heilung eine Zeile «LEDGER-SCHRUMPF: …»; Ledger dropship/_ledger_schrumpf.tsv (zeit, modus, datei, vorher,
  schrumpf, nachher). --verlauf druckt immer eine Ampel-Zeile.
"""
import fnmatch, json, os, subprocess, sys, tempfile, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGELN = os.path.join(REPO, "automation", "ledger_regeln.json")


def git(repo, *a, ok=(0,)):
    r = subprocess.run(["git", "-C", repo, *a], capture_output=True, env={**os.environ, "TZ": "UTC"})   # Commit-Tag in UTC
    if r.returncode not in ok:
        return None
    return r.stdout


def zeilen_von(repo, ref_pfad):
    """Zeilen einer Fassung (z. B. 'HEAD:pfad', ':pfad'), None wenn es sie nicht gibt."""
    b = git(repo, "show", ref_pfad)
    return None if b is None else b.decode("utf-8", "replace").splitlines()


def regeln(repo):
    try:
        return json.load(open(os.path.join(repo, "automation", "ledger_regeln.json"), encoding="utf-8"))
    except Exception:
        return json.load(open(REGELN, encoding="utf-8"))


def gilt(pfad, r):
    return any(fnmatch.fnmatch(pfad, m) for m in r["muster"]) and not any(fnmatch.fnmatch(pfad, a) for a in r["ausgenommen"])


def erlaubt(repo, pfad, datum=None):
    """Kürzung für diesen Pfad an diesem UTC-Tag erlaubt? --verlauf fragt mit dem Tag des Schrumpf-Commits."""
    heute = datum or time.strftime("%Y-%m-%d", time.gmtime())
    try:
        for z in open(os.path.join(repo, "dropship", "_ledger_schrumpf_erlaubt.txt"), encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 2 and t[0].strip() == pfad and t[1].strip() == heute:
                return True
    except OSError:
        pass
    return False


def geschrumpft(alt_n, neu_n, r):
    return alt_n - neu_n >= r["min_verlust"] and neu_n < alt_n * r["anteil"]


def heilen(repo, pfad, basis):
    """Basis-Zeilen + jede Arbeitszeile, die die Basis nicht kennt. An Ort und Stelle, kurz vor dem Schreiben neu gelesen."""
    voll = os.path.join(repo, pfad)
    os.makedirs(os.path.dirname(voll), exist_ok=True)
    with open(voll, "a+", encoding="utf-8") as f:
        f.seek(0)
        arbeit = f.read().splitlines()
        bekannt = set(basis)
        neu = basis + [z for z in arbeit if z not in bekannt]
        f.seek(0)
        f.truncate()
        f.write("\n".join(neu) + ("\n" if neu else ""))
    git(repo, "add", "--", pfad)
    return len(neu)


def ledger_zeile(repo, *felder):
    p = os.path.join(repo, "dropship", "_ledger_schrumpf.tsv")
    with open(p, "a", encoding="utf-8") as f:
        f.write("\t".join(str(x) for x in felder) + "\n")


def melden(repo, modus, pfad, alt_n, neu_n, nachher):
    jetzt = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"LEDGER-SCHRUMPF: {pfad} {alt_n} → {neu_n} Zeilen ({modus}) — geheilt auf {nachher}")
    try:
        ledger_zeile(repo, jetzt, modus, pfad, alt_n, neu_n, nachher)
        git(repo, "add", "--", "dropship/_ledger_schrumpf.tsv")
    except OSError:
        pass


def staged(repo, merge=False):
    r = regeln(repo)
    raus = git(repo, "diff", "--cached", "--name-status", "--no-renames")
    if raus is None:
        return 0
    n = 0
    for z in raus.decode("utf-8", "replace").splitlines():
        teile = z.split("\t")
        if len(teile) < 2 or teile[0][:1] not in ("M", "D"):
            continue
        pfad = teile[-1]
        if not gilt(pfad, r) or erlaubt(repo, pfad):
            continue
        alt = zeilen_von(repo, f"HEAD:{pfad}")
        if alt is None:
            continue
        if merge:
            andere = zeilen_von(repo, f"MERGE_HEAD:{pfad}")
            if andere:
                s = set(alt)
                alt = alt + [x for x in andere if x not in s]
        neu = [] if teile[0].startswith("D") else (zeilen_von(repo, f":{pfad}") or [])
        if geschrumpft(len(alt), len(neu), r):
            nachher = heilen(repo, pfad, alt)
            melden(repo, "merge" if merge else "commit", pfad, len(alt), len(neu), nachher)
            n += 1
    return n


def verlauf(repo, stunden):
    r = regeln(repo)
    raus = git(repo, "log", f"--since={stunden} hours ago", "--first-parent", "--format=@@%H %cd", "--date=format-local:%Y-%m-%d", "--numstat", "--no-renames",
               "--", *r["muster"])
    if raus is None:
        print("LEDGER-SCHRUMPF: unklar (git log fehlgeschlagen)")
        return 0
    kandidaten, cur = {}, None
    for z in raus.decode("utf-8", "replace").splitlines():
        if z.startswith("@@"):
            cur = tuple(z[2:].split(" ", 1))                 # (Hash, UTC-Tag des Commits)
            continue
        t = z.split("\t")
        if cur and len(t) == 3 and t[0].isdigit() and t[1].isdigit():
            plus, minus, pfad = int(t[0]), int(t[1]), t[2]
            if minus >= r["min_verlust"] and minus > plus and gilt(pfad, r):
                kandidaten.setdefault(pfad, cur)          # git log ist neueste zuerst → ältestes Ereignis gewinnt am Ende
                kandidaten[pfad] = cur
    geheilt = 0
    for pfad, (c, tag) in kandidaten.items():
        if erlaubt(repo, pfad, tag):
            continue
        vor = zeilen_von(repo, f"{c}~1:{pfad}")
        jetzt_z = zeilen_von(repo, f"HEAD:{pfad}")
        if vor is None:
            continue
        jetzt_n = len(jetzt_z or [])
        if geschrumpft(len(vor), jetzt_n, r):
            nachher = heilen(repo, pfad, vor)
            melden(repo, f"verlauf {c[:9]}", pfad, len(vor), jetzt_n, nachher)
            geheilt += 1
    print(f"LEDGER-SCHRUMPF: {geheilt} geheilt · {len(kandidaten)} Schrumpf-Commits in {stunden} h geprüft")
    return geheilt


# ── Selbsttest ─────────────────────────────────────────────────────────────────────────────────────────────────
def selbsttest():
    fehler = 0

    def pruefe(name, ok, info=""):
        nonlocal fehler
        fehler += not ok
        print(f"  {'✅' if ok else '❌'} {name}{' — ' + info if info else ''}")

    with tempfile.TemporaryDirectory() as d:
        def g(*a):
            subprocess.run(["git", "-C", d, *a], check=True, capture_output=True)
        g("init", "-q"); g("config", "user.email", "t@t"); g("config", "user.name", "t")
        os.makedirs(os.path.join(d, "automation")); os.makedirs(os.path.join(d, "dropship", "_klassen"))
        json.dump(json.load(open(REGELN, encoding="utf-8")), open(os.path.join(d, "automation", "ledger_regeln.json"), "w"))
        led = os.path.join(d, "dropship", "_x.tsv")
        alt = [f"id{i}\t{i}\tok" for i in range(1000)]
        open(led, "w").write("\n".join(alt) + "\n")
        open(os.path.join(d, "dropship", "_klassen", "liste.txt"), "w").write("\n".join(alt) + "\n")
        open(os.path.join(d, "dropship", "_klein.tsv"), "w").write("\n".join(alt[:300]) + "\n")
        g("add", "-A"); g("commit", "-qm", "basis")
        # A: Ledger geleert, danach 3 neue Zeilen angehängt → geheilt, neue hinten
        open(led, "w").write("neu1\nneu2\nneu3\n")
        # B: Liste in _klassen/ neu gebaut (absichtlich) → bleibt
        open(os.path.join(d, "dropship", "_klassen", "liste.txt"), "w").write("nur\n")
        # C: kleine Kürzung (100 von 300) → bleibt
        open(os.path.join(d, "dropship", "_klein.tsv"), "w").write("\n".join(alt[:200]) + "\n")
        g("add", "-A")
        n = staged(d)
        z = open(led).read().splitlines()
        pruefe("A geleertes Ledger geheilt, neue Zeilen hinten", n == 1 and len(z) == 1003 and z[:2] == alt[:2] and z[-1] == "neu3",
               f"{len(z)} Zeilen")
        pruefe("A Index trägt die Heilung", len(zeilen_von(d, ":dropship/_x.tsv") or []) == 1003)
        pruefe("B _klassen-Liste unberührt", open(os.path.join(d, "dropship", "_klassen", "liste.txt")).read() == "nur\n")
        pruefe("C kleine Kürzung unberührt", len(open(os.path.join(d, "dropship", "_klein.tsv")).read().splitlines()) == 200)
        g("commit", "-qm", "nach tor")
        # D: gelöschtes Ledger → wiederhergestellt
        os.remove(led); g("add", "-A")
        staged(d)
        pruefe("D gelöschtes Ledger wiederhergestellt", os.path.exists(led) and len(open(led).read().splitlines()) == 1003)
        g("commit", "-qm", "d")
        # E: Erlaubnis-Datei für heute → Kürzung bleibt
        open(os.path.join(d, "dropship", "_ledger_schrumpf_erlaubt.txt"), "w").write(
            f"dropship/_x.tsv\t{time.strftime('%Y-%m-%d', time.gmtime())}\tTest\n")
        open(led, "w").write("gekuerzt\n"); g("add", "-A")
        staged(d)
        pruefe("E erlaubte Kürzung bleibt", open(led).read() == "gekuerzt\n")
        g("commit", "-qm", "e (erlaubt)")
        os.remove(os.path.join(d, "dropship", "_ledger_schrumpf_erlaubt.txt"))
        g("add", "-A"); g("commit", "-qm", "erlaubnis weg")
        # F: --verlauf lässt die erlaubte Kürzung (Commit-Tag steht in der Erlaubnis) stehen …
        open(os.path.join(d, "dropship", "_ledger_schrumpf_erlaubt.txt"), "w").write(
            f"dropship/_x.tsv\t{time.strftime('%Y-%m-%d', time.gmtime())}\tTest\n")
        n0 = verlauf(d, 1)
        pruefe("F --verlauf respektiert die Erlaubnis des Commit-Tags", n0 == 0 and open(led).read() == "gekuerzt\n")
        os.remove(os.path.join(d, "dropship", "_ledger_schrumpf_erlaubt.txt"))
        # G: … und heilt einen unerlaubten, schon committeten Schrumpf (ohne Tor)
        open(led, "w").write("\n".join(alt) + "\n"); g("add", "-A"); g("commit", "-qm", "wieder voll")
        open(led, "w").write("weg\n"); g("add", "-A")
        subprocess.run(["git", "-C", d, "commit", "-qm", "schrumpf ohne tor"], check=True, capture_output=True)
        n = verlauf(d, 1)
        z = open(led).read().splitlines()
        pruefe("G --verlauf heilt committeten Schrumpf", n == 1 and len(z) >= 1003, f"{len(z)} Zeilen")
    print("SELBSTTEST:", "ok" if not fehler else f"{fehler} Fehler")
    return 0 if not fehler else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    try:
        if "--verlauf" in a:
            verlauf(REPO, int(a[a.index("--verlauf") + 1]) if len(a) > a.index("--verlauf") + 1 else 26)
        elif "--merge" in a:
            staged(REPO, merge=True)
        else:
            staged(REPO)
    except Exception as e:                       # das Tor darf nie einen Commit verhindern
        print(f"LEDGER-SCHRUMPF: unklar — {type(e).__name__.replace('Error', 'Fehl')}: {str(e)[:120]}")
    sys.exit(0)
