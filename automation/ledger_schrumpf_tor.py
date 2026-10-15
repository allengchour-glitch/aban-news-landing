#!/usr/bin/env python3
"""ledger_schrumpf_tor.py — kein Ledger in dropship/ darf beim Commit still schrumpfen (15.10.2026).

WARUM (gemessen 15.10., git log --numstat über 14 T):
  · 15.10. 00:18–00:21 UTC: `dropship/_cj_lager.tsv` 58'834 → 198 Zeilen (Commit ab536a2f1, «Reel-Queue …», über
    git_sichern.sh `git add -A dropship/`), dazu `_cj_nachpruefung.tsv` 8'842 → 10 (ad98acf1d, Hand-Commit der Sitzung). Beide
    Schreiber hängen nur an (`open(…, "a")`); im Fenster kein Merge, kein Stash, kein Reset (reflog) — Auslöser nicht belegbar.
    `_cj_lager.tsv` rettete zufällig ein Hand-Merge; `_cj_nachpruefung.tsv` lag geschrumpft auf origin, bis die Rückschau es heilte.
  · 02.10.: `_versand_jenachland.txt` 14'403 → 1'452 beim Entfernen von Konfliktmarkern — fiel nie auf.
  Jeder Verlust muss durch EINE Tür: den Commit. Dort steht dieses Tor — unabhängig vom Auslöser.

REGEL (automation/ledger_regeln.json):
  Datei passt auf «muster» und nicht auf «ausgenommen»; die neue Fassung hat ≥ min_verlust (200) Zeilen weniger als die
  Vergleichsfassung UND weniger als anteil (50 %) davon → HEILEN: Zeilen der Vergleichsfassung in ihrer Reihenfolge, dahinter die
  Arbeitszeilen AB DER ERSTEN, die die Vergleichsfassung nicht kennt (davor = Überbleibsel des Schrumpfs). So bleiben wortgleich
  wieder angehängte Zeilen erhalten und «letzte Zeile gewinnt» stimmt (Prüfung wf_52c54405: Mengen-Abgleich verlor sie).
  Byteweise (keine Umkodierung, CRLF bleibt), an Ort und Stelle (kein os.replace: Anhänger mit offenem Griff), Platz vorher
  reserviert (posix_fallocate — eine volle Platte bricht VOR dem Kürzen ab), unmittelbar vorher neu gelesen, danach `git add`.
  Fehler je Datei werden gemeldet, die übrigen Dateien weiter geprüft. Umbenennungen (git -M) sind kein Schrumpf.
  Gewollte Kürzung: dropship/_ledger_schrumpf_erlaubt.txt — «pfad<TAB>JJJJ-MM-TT<TAB>Grund». Gilt für Kürzungen an diesem
  UTC-Tag; die Rückschau akzeptiert auch den Vortag (ein Merge nach Mitternacht trägt das Datum des Merges).

MODI:
  --staged       pre-commit-Hook / Committer: Index gegen HEAD. Exit immer 0.
  --merge        pre-commit-Hook bei offenem Merge: Vergleichsfassung = Vereinigung HEAD + MERGE_HEAD. Exit 0.
  --vor-merge    pre-merge-commit-Hook: wie --staged; wurde geheilt → Exit 1 (der Merge bleibt offen, `git commit --no-edit`
                 schliesst ihn mit dem geheilten Index — ein Hook, der nur heilt, hätte den Merge-Commit nicht mehr erreicht).
  --verlauf N    Aufseher stündlich (unter /tmp/git_repo.lock): alle Schrumpf-Commits der letzten N Stunden je Datei; der
                 NEUESTE entscheidet — erlaubt → nichts; sonst Basis = Vereinigung der Vorfassungen aller unerlaubten Schrümpfe,
                 geheilt, wenn HEAD noch geschrumpft ist. Bei offenem Merge: übersprungen.
  --haken        core.hooksPath auf automation/githooks setzen (idempotent; engine_keepalive bei jedem Lauf).
  --selbsttest   Wegwerf-Repos, ohne Netz.
AUSGABE: bei Heilung eine Zeile «LEDGER-SCHRUMPF: …»; Ledger dropship/_ledger_schrumpf.tsv. --verlauf druckt immer eine Zeile.
"""
import fnmatch, json, os, subprocess, sys, tempfile, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGELN = os.path.join(REPO, "automation", "ledger_regeln.json")
UMGEBUNG = {**os.environ, "TZ": "UTC"}


def git(repo, *a):
    r = subprocess.run(["git", "-C", repo, *a], capture_output=True, env=UMGEBUNG)
    return None if r.returncode else r.stdout


def zerlegen(b):
    z = b.split(b"\n")
    return z[:-1] if z and z[-1] == b"" else z


def zeilen_von(repo, ref_pfad):
    """Zeilen (bytes, ohne \\n) einer Fassung wie 'HEAD:pfad' oder ':pfad'; None, wenn es sie nicht gibt."""
    b = git(repo, "show", ref_pfad)
    return None if b is None else zerlegen(b)


def regeln(repo):
    try:
        return json.load(open(os.path.join(repo, "automation", "ledger_regeln.json"), encoding="utf-8"))
    except Exception:
        return json.load(open(REGELN, encoding="utf-8"))


def gilt(pfad, r):
    return any(fnmatch.fnmatch(pfad, m) for m in r["muster"]) and not any(fnmatch.fnmatch(pfad, a) for a in r["ausgenommen"])


def erlaubt(repo, pfad, tage):
    try:
        for z in open(os.path.join(repo, "dropship", "_ledger_schrumpf_erlaubt.txt"), encoding="utf-8", errors="replace"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 2 and t[0].strip() == pfad and t[1].strip() in tage:
                return True
    except OSError:
        pass
    return False


def tag(sek):
    return time.strftime("%Y-%m-%d", time.gmtime(sek))


def geschrumpft(alt_n, neu_n, r):
    return alt_n - neu_n >= r["min_verlust"] and neu_n < alt_n * r["anteil"]


def merge_offen(repo):
    gd = (git(repo, "rev-parse", "--git-dir") or b".git").decode().strip()
    gd = gd if os.path.isabs(gd) else os.path.join(repo, gd)
    return os.path.exists(os.path.join(gd, "MERGE_HEAD")) or bool((git(repo, "ls-files", "-u") or b"").strip())


def heilen(repo, pfad, basis):
    """Basis-Zeilen + Arbeitszeilen ab der ersten unbekannten. Platz vorher reservieren; nie halb geschrieben zurücklassen."""
    voll = os.path.join(repo, pfad)
    os.makedirs(os.path.dirname(voll), exist_ok=True)
    fd = os.open(voll, os.O_RDWR | os.O_CREAT, 0o644)
    with os.fdopen(fd, "rb+") as f:
        arbeit = zerlegen(f.read())
        bekannt = set(basis)
        k = 0
        while k < len(arbeit) and arbeit[k] in bekannt:
            k += 1
        neu = basis + arbeit[k:]
        inhalt = b"\n".join(neu) + (b"\n" if neu else b"")
        try:
            os.posix_fallocate(f.fileno(), 0, len(inhalt))     # volle Platte → Fehler HIER, vor dem Kürzen
        except AttributeError:
            pass
        except OSError as e:
            if e.errno not in (95, 22):                         # 95/22 = Dateisystem kann es nicht → normal weiter
                raise
        f.seek(0)
        f.write(inhalt)
        f.truncate(len(inhalt))
    if git(repo, "add", "--", pfad) is None:
        raise RuntimeError("git add fehlgeschlagen — Heilung liegt nur im Arbeitsbaum")
    return len(neu)


def ledger_zeile(repo, *felder):
    p = os.path.join(repo, "dropship", "_ledger_schrumpf.tsv")
    with open(p, "a", encoding="utf-8") as f:
        f.write("\t".join(str(x) for x in felder) + "\n")


def melden(repo, modus, pfad, alt_n, neu_n, nachher):
    print(f"LEDGER-SCHRUMPF: {pfad} {alt_n} → {neu_n} Zeilen ({modus}) — geheilt auf {nachher}")
    try:
        ledger_zeile(repo, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), modus, pfad, alt_n, neu_n, nachher)
        git(repo, "add", "--", "dropship/_ledger_schrumpf.tsv")
    except OSError:
        pass


def gestagte(repo):
    """[(status, pfad)] mit Umbenennungserkennung; -z, damit Namen mit Umlauten nicht in Anführungszeichen stehen."""
    raus = git(repo, "diff", "--cached", "-z", "--name-status", "-M")
    if raus is None:
        return []
    teile, aus, i = raus.split(b"\0"), [], 0
    while i < len(teile) and teile[i]:
        st = teile[i].decode()
        if st[:1] in ("R", "C"):
            aus.append((st, teile[i + 2].decode("utf-8", "replace")))
            i += 3
        else:
            aus.append((st, teile[i + 1].decode("utf-8", "replace")))
            i += 2
    return aus


def staged(repo, merge=False, modus=None):
    r = regeln(repo)
    heute = tag(time.time())
    n = 0
    for st, pfad in gestagte(repo):
        if st[:1] not in ("M", "D") or not gilt(pfad, r) or erlaubt(repo, pfad, {heute}):
            continue
        try:
            alt = zeilen_von(repo, f"HEAD:{pfad}")
            if alt is None:
                continue
            if merge:
                andere = zeilen_von(repo, f"MERGE_HEAD:{pfad}")
                if andere:
                    s = set(alt)
                    alt = alt + [x for x in andere if x not in s]
            neu = [] if st.startswith("D") else (zeilen_von(repo, f":{pfad}") or [])
            if geschrumpft(len(alt), len(neu), r):
                nachher = heilen(repo, pfad, alt)
                melden(repo, modus or ("merge" if merge else "commit"), pfad, len(alt), len(neu), nachher)
                n += 1
        except Exception as e:                    # eine Datei darf das Tor für die anderen nicht abschalten
            print(f"LEDGER-SCHRUMPF: unklar {pfad} — {type(e).__name__.replace('Error', 'Fehl')}: {str(e)[:100]}")
    return n


def verlauf(repo, stunden):
    r = regeln(repo)
    if merge_offen(repo):
        print("LEDGER-SCHRUMPF: übersprungen (Merge offen)")
        return 0
    raus = git(repo, "log", f"--since={stunden} hours ago", "--first-parent", "--format=@@%H %ct", "--numstat", "-M",
               "--", *r["muster"])
    if raus is None:
        print("LEDGER-SCHRUMPF: unklar (git log fehlgeschlagen)")
        return 0
    je_datei, cur = {}, None
    for z in raus.decode("utf-8", "replace").splitlines():
        if z.startswith("@@"):
            h, ct = z[2:].split(" ", 1)
            cur = (h, int(ct))
            continue
        t = z.split("\t")
        if cur and len(t) == 3 and t[0].isdigit() and t[1].isdigit():
            plus, minus, pfad = int(t[0]), int(t[1]), t[2]
            if "=>" in pfad:                     # Umbenennung: kein Schrumpf
                continue
            if minus >= r["min_verlust"] and minus > plus and gilt(pfad, r):
                je_datei.setdefault(pfad, []).append(cur)        # neueste zuerst (git log)
    geheilt, commits = 0, sum(len(v) for v in je_datei.values())
    for pfad, liste in je_datei.items():
        try:
            def ist_erlaubt(c):
                return erlaubt(repo, pfad, {tag(c[1]), tag(c[1] - 86400)})
            if ist_erlaubt(liste[0]):            # der neueste Schrumpf entscheidet
                continue
            basis = []
            for h, ct in reversed(liste):        # Vorfassungen aller unerlaubten Schrümpfe, älteste zuerst
                if ist_erlaubt((h, ct)):
                    basis = []                   # eine erlaubte Kürzung setzt die Basis zurück
                    continue
                vor = zeilen_von(repo, f"{h}~1:{pfad}") or []
                s = set(basis)
                basis = basis + [x for x in vor if x not in s]
            jetzt = zeilen_von(repo, f"HEAD:{pfad}")
            if jetzt is None:
                um = git(repo, "log", "-1", "--format=%H", "-M", "--diff-filter=R", "--", pfad)
                if um and um.strip():            # nach einer Umbenennung weg — nicht wiederbeleben
                    continue
            jetzt_n = len(jetzt or [])
            if basis and geschrumpft(len(basis), jetzt_n, r):
                nachher = heilen(repo, pfad, basis)
                melden(repo, f"verlauf {liste[0][0][:9]}", pfad, len(basis), jetzt_n, nachher)
                geheilt += 1
        except Exception as e:
            print(f"LEDGER-SCHRUMPF: unklar {pfad} — {type(e).__name__.replace('Error', 'Fehl')}: {str(e)[:100]}")
    print(f"LEDGER-SCHRUMPF: {geheilt} geheilt · {len(je_datei)} Dateien mit {commits} Schrumpf-Commits in {stunden} h geprüft")
    return geheilt


def haken(repo):
    ziel = "automation/githooks"
    if (git(repo, "config", "core.hooksPath") or b"").decode().strip() != ziel:
        git(repo, "config", "core.hooksPath", ziel)
        print(f"LEDGER-SCHRUMPF: core.hooksPath → {ziel}")


# ── Selbsttest ─────────────────────────────────────────────────────────────────────────────────────────────────
def selbsttest():
    fehler = 0

    def pruefe(name, ok, info=""):
        nonlocal fehler
        fehler += not ok
        print(f"  {'✅' if ok else '❌'} {name}{' — ' + info if info else ''}")

    def neues_repo(d):
        def g(*a):
            subprocess.run(["git", "-C", d, *a], check=True, capture_output=True, env=UMGEBUNG)
        g("init", "-q"); g("config", "user.email", "t@t"); g("config", "user.name", "t")
        os.makedirs(os.path.join(d, "automation"), exist_ok=True)
        os.makedirs(os.path.join(d, "dropship", "_klassen"), exist_ok=True)
        json.dump(json.load(open(REGELN, encoding="utf-8")), open(os.path.join(d, "automation", "ledger_regeln.json"), "w"))
        return g

    def lies(p):
        return open(p, "rb").read().decode("utf-8", "replace").splitlines()

    alt = [f"id{i}\t{i}\tok" for i in range(1000)]
    with tempfile.TemporaryDirectory() as d:
        g = neues_repo(d)
        led = os.path.join(d, "dropship", "_x.tsv")
        open(led, "w").write("\n".join(alt) + "\n")
        open(os.path.join(d, "dropship", "_klassen", "liste.txt"), "w").write("\n".join(alt) + "\n")
        open(os.path.join(d, "dropship", "_klein.tsv"), "w").write("\n".join(alt[:300]) + "\n")
        g("add", "-A"); g("commit", "-qm", "basis")
        open(led, "w").write("neu1\nneu2\nid999\t999\tok\n")      # A: geleert, angehängt (auch eine wortgleiche Zeile)
        open(os.path.join(d, "dropship", "_klassen", "liste.txt"), "w").write("nur\n")
        open(os.path.join(d, "dropship", "_klein.tsv"), "w").write("\n".join(alt[:200]) + "\n")
        g("add", "-A")
        n = staged(d)
        z = lies(led)
        pruefe("A geleertes Ledger geheilt, neue Zeilen hinten", n == 1 and len(z) == 1003 and z[:2] == alt[:2] and z[-2] == "neu2",
               f"{len(z)} Zeilen")
        pruefe("A wortgleich wieder angehängte Zeile bleibt hinten («letzte gewinnt»)", z[-1] == "id999\t999\tok")
        pruefe("A Index trägt die Heilung", len(zeilen_von(d, ":dropship/_x.tsv") or []) == 1003)
        pruefe("B _klassen-Liste unberührt", open(os.path.join(d, "dropship", "_klassen", "liste.txt")).read() == "nur\n")
        pruefe("C kleine Kürzung unberührt", len(lies(os.path.join(d, "dropship", "_klein.tsv"))) == 200)
        g("commit", "-qm", "nach tor")
        os.remove(led); g("add", "-A"); staged(d)
        pruefe("D gelöschtes Ledger wiederhergestellt", os.path.exists(led) and len(lies(led)) == 1003)
        g("commit", "-qm", "d")
        g("mv", "dropship/_x.tsv", "dropship/_y.tsv"); staged(d)
        pruefe("E Umbenennung ist kein Schrumpf", not os.path.exists(led))
        g("commit", "-qm", "umbenannt")
        y = os.path.join(d, "dropship", "_y.tsv")
        erl = os.path.join(d, "dropship", "_ledger_schrumpf_erlaubt.txt")
        open(erl, "w").write(f"dropship/_y.tsv\t{tag(time.time())}\tTest\n")
        open(y, "w").write("gekuerzt\n"); g("add", "-A"); staged(d)
        pruefe("F erlaubte Kürzung bleibt (commit)", open(y).read() == "gekuerzt\n")
        g("commit", "-qm", "erlaubt")
        n0 = verlauf(d, 1)
        pruefe("G --verlauf respektiert die Erlaubnis", n0 == 0 and open(y).read() == "gekuerzt\n")
        os.remove(erl)
        open(y, "w").write("\n".join(alt) + "\n"); g("add", "-A"); g("commit", "-qm", "wieder voll")
        open(y, "w").write("weg\n"); g("add", "-A"); g("commit", "--no-verify", "-qm", "schrumpf ohne tor")
        n = verlauf(d, 1)
        z = lies(y)
        # Die Erlaubnis von F ist gelöscht → auch jene ältere Kürzung zählt jetzt als unerlaubt; ihre Zeilen kommen mit zurück.
        pruefe("H --verlauf heilt den NEUESTEN unerlaubten Schrumpf", n == 1 and len(z) >= 1001 and z[-1] == "weg", f"{len(z)} Zeilen")
        g("commit", "-qm", "geheilt")
        k = os.path.join(d, "dropship", "_k.tsv")              # I: eine Datei scheitert (schreibgeschützt), die andere heilt
        open(k, "w").write("\n".join(alt) + "\n")
        g("add", "-A"); g("commit", "-qm", "k")
        open(k, "w").write("x\n"); open(y, "w").write("x\n"); g("add", "-A")
        os.chmod(k, 0o444)
        staged(d)
        os.chmod(k, 0o644)
        pruefe("I ein Fehler schaltet die anderen Dateien nicht ab", len(lies(y)) >= 1001)
        c = os.path.join(d, "dropship", "_crlf.tsv")           # J: CRLF bleibt byte-genau
        open(c, "wb").write(b"".join(f"r{i}\r\n".encode() for i in range(500)))
        g("add", "-A"); g("commit", "-qm", "crlf")
        open(c, "wb").write(b"neu\r\n"); g("add", "-A"); staged(d)
        b = open(c, "rb").read()
        pruefe("J CRLF bleibt byte-genau", b.startswith(b"r0\r\nr1\r\n") and b.endswith(b"neu\r\n"))
    with tempfile.TemporaryDirectory() as d:                    # K/L: Hooks
        g = neues_repo(d)
        os.makedirs(os.path.join(d, "automation", "githooks"))
        for h in ("pre-commit", "pre-merge-commit"):
            q = os.path.join(REPO, "automation", "githooks", h)
            if os.path.exists(q):
                ziel = os.path.join(d, "automation", "githooks", h)
                open(ziel, "w").write(open(q).read().replace(
                    '"$(git rev-parse --show-toplevel)/automation/ledger_schrumpf_tor.py"',
                    f'"{os.path.abspath(__file__)}" --repo "$(git rev-parse --show-toplevel)"'))
                os.chmod(ziel, 0o755)
        g("config", "core.hooksPath", "automation/githooks")
        led = os.path.join(d, "dropship", "_m.tsv")
        open(led, "w").write("\n".join(alt) + "\n"); g("add", "-A"); g("commit", "-qm", "basis")
        g("checkout", "-qb", "seite"); open(led, "w").write("x\n"); g("add", "-A"); g("commit", "--no-verify", "-qm", "schrumpf")
        g("checkout", "-q", "-")
        open(os.path.join(d, "dropship", "_n.tsv"), "w").write("a\n"); g("add", "-A"); g("commit", "-qm", "n")
        r = subprocess.run(["git", "-C", d, "merge", "-q", "--no-edit", "seite"], capture_output=True, env=UMGEBUNG)
        angehalten = r.returncode != 0 and os.path.exists(os.path.join(d, ".git", "MERGE_HEAD"))
        subprocess.run(["git", "-C", d, "commit", "-q", "--no-edit"], capture_output=True, env=UMGEBUNG)
        z = zeilen_von(d, "HEAD:dropship/_m.tsv") or []
        eltern = (git(d, "log", "-1", "--format=%P") or b"").split()
        pruefe("K pre-merge-commit hält Schrumpf-Merge an, Abschluss geheilt", angehalten and len(z) >= 1000 and len(eltern) == 2,
               f"angehalten={angehalten} zeilen={len(z)} eltern={len(eltern)}")
        open(led, "w").write("y\n"); g("add", "-A")
        subprocess.run(["git", "-C", d, "commit", "-qm", "hand"], capture_output=True, env=UMGEBUNG)
        pruefe("L pre-commit heilt Hand-Commit", len(zeilen_von(d, "HEAD:dropship/_m.tsv") or []) >= 1000)
    print("SELBSTTEST:", "ok" if not fehler else f"{fehler} Fehler")
    return 0 if not fehler else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--repo" in a:
        REPO = a[a.index("--repo") + 1]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    rc = 0
    try:
        if "--verlauf" in a:
            i = a.index("--verlauf")
            verlauf(REPO, int(a[i + 1]) if len(a) > i + 1 and a[i + 1].isdigit() else 26)
        elif "--haken" in a:
            haken(REPO)
        elif "--merge" in a:
            staged(REPO, merge=True)
        elif "--vor-merge" in a:
            rc = 1 if staged(REPO, modus="vor-merge") else 0
        else:
            staged(REPO)
    except Exception as e:                       # das Tor verhindert nie einen Commit (ausser --vor-merge nach einer Heilung)
        print(f"LEDGER-SCHRUMPF: unklar — {type(e).__name__.replace('Error', 'Fehl')}: {str(e)[:120]}")
    sys.exit(rc)
