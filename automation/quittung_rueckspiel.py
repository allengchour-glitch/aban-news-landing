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
"""
import csv, io, os, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
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


def schreiben(felder, rows):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=felder, lineterminator="\n")
    w.writeheader(); w.writerows(rows)
    return buf.getvalue()


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


def main():
    stashes = [os.environ["STASH"]] if os.environ.get("STASH") else \
        [l.split(":")[0] for l in (git("stash", "list") or "").splitlines() if l.strip()]
    if not stashes:
        print("keine Stashes → nichts zu tun"); return 0
    if SCHARF and not lock_nehmen():
        print("⛔ Post-Lock seit 10 Min belegt → kein Schreiben (nächster Lauf)"); return 1
    try:
        summe = 0
        for pfad, key in QUEUES.items():
            if not os.path.exists(pfad):
                continue
            roh = open(pfad, encoding="utf-8").read()
            felder, rows = lesen(roh)
            # Schranke: nur Dateien, die csv verlustfrei zurückschreibt (ig_karussell.csv tut das nicht — 7 Zeilen
            # andere Quotierung). Sonst würde ein Rückspiel die ganze Datei umformatieren.
            treu = schreiben(felder, rows) == roh
            idx = {r.get(key): r for r in rows}
            neu = 0
            for st in stashes:
                t = git("show", f"{st}:{pfad}")
                if t is None:
                    continue
                _, srows = lesen(t)
                for s in srows:
                    k = s.get(key)
                    if not k:
                        continue
                    r = idx.get(k)
                    if r is not None:
                        if gepostet(s.get("status")) and not gepostet(r.get("status")):
                            print(f"  ✓ {pfad} {k[:50]}: {r.get('status')!r} → {s.get('status')!r} {(s.get('post_url') or '')[:30]} ({st})")
                            for c in QUITT:
                                if c in felder and c in s:
                                    r[c] = s[c]
                            neu += 1
                    elif gepostet(s.get("status")) or (s.get("ordner") and os.path.isdir(s["ordner"])):
                        print(f"  + {pfad} {k[:50]}: Zeile fehlte ({s.get('status')!r}, {st})")
                        z = {f: s.get(f, "") for f in felder}
                        rows.append(z); idx[k] = z
                        neu += 1
            if neu and SCHARF:
                if treu:
                    open(pfad, "w", encoding="utf-8").write(schreiben(felder, rows))
                else:
                    print(f"  ⚠️ {pfad}: nicht verlustfrei schreibbar → {neu} Übernahme(n) NICHT geschrieben, von Hand prüfen")
            summe += neu
        print(f"FERTIG: {summe} Quittungen/Zeilen {'zurückgespielt' if SCHARF else 'gefunden (DRY)'} aus {len(stashes)} Stash(es)")
    finally:
        if SCHARF and os.path.exists(LOCK) and open(LOCK).read().strip() == str(os.getpid()):
            os.remove(LOCK)
    return 0


if __name__ == "__main__":
    sys.exit(main())
