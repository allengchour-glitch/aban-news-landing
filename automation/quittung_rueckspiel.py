#!/usr/bin/env python3
"""quittung_rueckspiel.py — Post-Quittungen aus Git-Stashes in die Queue-CSVs zurückspielen (24.09.2026).

WARUM: `repo_vorspulen.sh` (nach jedem Snapshot-Restore) stasht den Baum, setzt auf origin zurück und spielt danach
nur die Ledger `dropship/*.txt` per Union zurück. Quittungen in den Queue-CSVs blieben im Stash liegen. Gemessen am
24.09.: der Bildpost «Smartwatch Pro 1.78″» ging 02:13 UTC live (IG 18138612319620139, DdpyPQLFFjb), die Zeile trug
im Stash `posted` + IG-ID, im Repo aber `ready` — der Reiniger machte daraus später `dup-produkt-skip`. Doppelpost war
dadurch zwar gesperrt (Bild- und Produkt-Ledger sind `.txt` und kamen zurück), aber Link-in-Bio und der FB-Link-
Kommentar ordnen Posts über die IG-ID in der Queue einem Produkt zu: dieser Post hatte keinen Produktlink mehr.

WAS ES TUT (nur Quittungen, nie Rückschritte):
  1. Zeile gibt es in beiden Fassungen, Stash sagt `posted…`, Repo nicht → status/posted_at/post_url aus dem Stash.
  2. Zeile fehlt im Repo und ist im Stash `posted…` → angehängt (ein echter Post braucht seine Zeile).
  3. Karussell-Zeile fehlt im Repo, ihr Ordner liegt aber im Baum → angehängt (sonst verwaistes Set).
  Alles andere bleibt, wie es im Repo steht — der Repo-Stand ist neuer als jeder Stash.

  python3 automation/quittung_rueckspiel.py                 # DRY über alle Stashes, zeigt jede Übernahme
  SCHARF=1 python3 automation/quittung_rueckspiel.py        # schreibt (unter dem gemeinsamen Post-Lock)
  STASH='stash@{0}' SCHARF=1 python3 …                      # nur ein Stash (repo_vorspulen.sh ruft so auf)

14.10.2026: Geschrieben wird über queue_csv.umbauen() — unter der gemeinsamen Queue-Sperre FRISCH gelesen, nur die
Quittungen eingesetzt bzw. fehlende Zeilen angehängt, atomar. Vorher: Datei gelesen, je Stash `git show`, dann die GANZE
Datei mit open('w') aus der alten Kopie zurück (Lost Update gegen Poster/Motoren, die ohne Post-Lock anhängen).
"""
import csv, io, os, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
sys.path.insert(0, os.path.join(REPO, "automation"))
from queue_csv import umbauen as queue_umbauen, parse_csv, serialisieren  # noqa: E402  gemeinsame Queue-Sperre (14.10.2026)
SCHARF = os.environ.get("SCHARF") == "1"
LOCK = "/tmp/ig_post.lock"          # derselbe Lock wie post_guard.mjs (Datei, exklusiv angelegt)
QUEUES = {                           # Datei → Schlüsselspalte
    "social/posts_image.csv": "id",
    "automation/reels_seed.csv": "id",
    "social/ig_karussell.csv": "slug",
    "social/tiktok_karussell.csv": "slug",
}
QUITT = ("status", "posted_at", "post_url")


def git(*a):
    r = subprocess.run(["git", *a], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def lesen(text):
    rd = csv.DictReader(io.StringIO(text))
    return rd.fieldnames or [], list(rd)


def gepostet(s):
    return (s or "").strip().startswith("posted")


def lock_nehmen():
    for _ in range(40):
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode()); os.close(fd)
            return True
        except FileExistsError:
            alter = (time.time() - os.path.getmtime(LOCK)) / 60 if os.path.exists(LOCK) else 99
            if alter >= 20:
                open(LOCK, "w").write(str(os.getpid())); return True
            time.sleep(15)
    return False


def uebernehmen(pfad, key, rows, aus_stash):
    """Quittungen aus den Stash-Zeilen in rows (Liste von Listen, Kopf zuerst) einsetzen bzw. fehlende Zeilen anhängen.
    Ändert rows an Ort und Stelle → Zahl der Übernahmen. 14.10.2026: für SCHARF läuft das unter der Queue-Sperre auf dem
    FRISCHEN Stand — darum hier kein git und kein Netz (die Stash-Fassungen holt main() vorher)."""
    if not rows or key not in rows[0]:
        return 0
    felder = rows[0]
    pos = {f: i for i, f in enumerate(felder)}
    ki = pos[key]

    def wert(r, c):
        return r[pos[c]] if c in pos and pos[c] < len(r) else None

    idx = {(r[ki] if ki < len(r) else ""): r for r in rows[1:]}
    neu = 0
    for st, srows in aus_stash:
        for s in srows:
            k = s.get(key)
            if not k:
                continue
            r = idx.get(k)
            if r is not None:
                if gepostet(s.get("status")) and not gepostet(wert(r, "status")):
                    print(f"  ✓ {pfad} {k[:50]}: {wert(r, 'status')!r} → {s.get('status')!r} {(s.get('post_url') or '')[:30]} ({st})")
                    for c in QUITT:
                        if c in pos and c in s:
                            if pos[c] >= len(r):          # kurze Zeile (ig_karussell.csv: 7 statt 9 Felder) auffüllen
                                r.extend([""] * (pos[c] + 1 - len(r)))
                            r[pos[c]] = s[c] or ""
                    neu += 1
            elif gepostet(s.get("status")) or (s.get("ordner") and os.path.isdir(s["ordner"])):
                print(f"  + {pfad} {k[:50]}: Zeile fehlte ({s.get('status')!r}, {st})")
                z = [s.get(f) or "" for f in felder]
                rows.append(z); idx[k] = z
                neu += 1
    return neu


def main():
    stashes = [os.environ["STASH"]] if os.environ.get("STASH") else \
        [l.split(":")[0] for l in (git("stash", "list") or "").splitlines() if l.strip()]
    if not stashes:
        print("keine Stashes → nichts zu tun"); return 0
    if SCHARF and not lock_nehmen():
        print("⛔ Post-Lock seit 10 Min belegt → kein Schreiben (nächster Lauf)"); return 1
    rc = 0
    try:
        summe = 0
        for pfad, key in QUEUES.items():
            if not os.path.exists(pfad):
                continue
            # 14.10.2026: Stash-Fassungen VOR der Queue-Sperre holen — git-Aufrufe nie unter der Sperre.
            aus_stash = []
            for st in stashes:
                t = git("show", f"{st}:{pfad}")
                if t is not None:
                    aus_stash.append((st, lesen(t)[1]))
            roh = open(pfad, encoding="utf-8", newline="").read()
            # Schranke: nur Dateien, die verlustfrei zurückgeschrieben werden (sonst würde ein Rückspiel die ganze Datei
            # umformatieren). 14.10.2026: geschrieben wird mit queue_csv.serialisieren wie von allen Queue-Schreibern —
            # ig_karussell.csv (7- und 9-Feld-Zeilen) läuft damit byte-gleich rund, mit dem alten DictWriter nicht.
            treu = serialisieren(parse_csv(roh)) == roh
            if not SCHARF or not treu:
                neu = uebernehmen(pfad, key, parse_csv(roh), aus_stash)
                if neu and SCHARF:
                    print(f"  ⚠️ {pfad}: nicht verlustfrei schreibbar → {neu} Übernahme(n) NICHT geschrieben, von Hand prüfen")
            else:
                # 14.10.2026: NICHT die Kopie von oben zurückschreiben — Poster/Motoren hängen derweil an (Lost Update).
                # Unter der gemeinsamen Queue-Sperre frisch lesen, nur Quittungen einsetzen / fehlende Zeilen anhängen.
                zahl = [0]

                def setzen(frisch):
                    zahl[0] = uebernehmen(pfad, key, frisch, aus_stash)
                    return frisch if zahl[0] else None
                try:
                    queue_umbauen(pfad, setzen)
                    neu = zahl[0]
                except (RuntimeError, OSError) as e:
                    print(f"  ⚠️ {pfad}: {e} → {zahl[0]} Übernahme(n) NICHT geschrieben (nächster Lauf)")
                    neu, rc = 0, 1
            summe += neu
        print(f"FERTIG: {summe} Quittungen/Zeilen {'zurückgespielt' if SCHARF else 'gefunden (DRY)'} aus {len(stashes)} Stash(es)")
    finally:
        if SCHARF and os.path.exists(LOCK) and open(LOCK).read().strip() == str(os.getpid()):
            os.remove(LOCK)
    return rc


if __name__ == "__main__":
    sys.exit(main())
