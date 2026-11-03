#!/usr/bin/env python3
"""Tests für den Paketbau (paket_bauen.py), aus dem das Auto-Update des PCs sein Programm bekommt — braucht Git, kein Internet:
python3 tools/trading/test_paket_bauen.py"""
from __future__ import annotations

import hashlib
import io
import json
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import paket_bauen as PB  # noqa: E402

AU = PB.AU
OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def wirft(fn, *args, **kw):
    try:
        fn(*args, **kw)
    except ValueError as ex:
        return str(ex)
    return None


BAT = b"@echo off\r\nrem x\r\n"
BASIS = {
    "tools/trading/krypto_bot/autoupdate.py": b"# a\n", "tools/trading/krypto_bot/pflege.py": b"# p\n", "tools/trading/krypto_bot/cockpit.py": b"# c\n",
    "tools/trading/krypto_bot/pilot.py": b"# pi\n", "tools/trading/krypto_bot/sperre.py": b"# s\n",
    "tools/trading/krypto_bot/krypto-auto.bat": BAT, "tools/trading/krypto_bot/cockpit.bat": BAT,
}
GEBAUT, COMMIT = "2026-11-03T10:00:00Z", "abcdef1234567890"

d1, m1 = PB.zip_bauen(dict(BASIS), COMMIT, GEBAUT, "Hinweis")
d2, m2 = PB.zip_bauen(dict(BASIS), COMMIT, GEBAUT, "Hinweis")
pruefe("reproduzierbar: zweimal gebaut = dieselben Bytes und dieselbe Prüfsumme", d1 == d2 and m1["sha256"] == m2["sha256"])
mf = AU.manifest_pruefen({k: m1[k] for k in ("format", "version", "commit", "gebaut", "datei", "sha256", "groesse", "hinweis")})
pruefe("Beschreibung besteht die Prüfung des PCs", mf["sha256"] == hashlib.sha256(d1).hexdigest() and mf["groesse"] == len(d1))
pruefe("Version = Commit-Datum.Kurzform; der Dateiname enthält sie (ein neues Paket überschreibt nie ein altes)",
       m1["version"] == "2026-11-03." + COMMIT[:7] and m1["datei"] == f"krypto-paket-{m1['version']}.zip" and PB.zip_name(m1["version"]) == m1["datei"])
_d3, _m3 = PB.zip_bauen(dict(BASIS), COMMIT, "2026-11-09T10:00:00Z", "", datum="2026-11-03")
pruefe("gleicher Commit, später gebaut: dieselbe Version (löst auf dem PC kein Update aus)", _m3["version"] == m1["version"] and _m3["gebaut"] != m1["gebaut"])
inhalt = AU.zip_lesen(d1, mf)
pruefe("Inhalt: alle Dateien + VERSION.json + PAKET-DATEIEN.json", set(inhalt) == set(BASIS) | {AU.VERSION_REL, AU.LISTE_REL})
v = json.loads(inhalt[AU.VERSION_REL])
pruefe("VERSION.json: Version, Commit, Bauzeit", v == {"version": m1["version"], "commit": COMMIT, "gebaut": GEBAUT}, v)
liste = json.loads(inhalt[AU.LISTE_REL])["dateien"]
pruefe("PAKET-DATEIEN.json: jede Datei mit ihrer Prüfsumme, ohne sich selbst", set(liste) == set(BASIS) and all(hashlib.sha256(BASIS[k]).hexdigest() == h for k, h in liste.items()))
pruefe(".bat bleibt byte-genau (CRLF)", inhalt["tools/trading/krypto_bot/krypto-auto.bat"] == BAT)
z = zipfile.ZipFile(io.BytesIO(d1))
pruefe("feste Zeitstempel und sortierte Einträge", {i.date_time for i in z.infolist()} == {PB.FEST} and [i.filename for i in z.infolist()] == sorted(i.filename for i in z.infolist()))

# Ausschlüsse
viel = dict(BASIS)
viel.update({"tools/trading/daten/BTC.json": b"[]", "tools/trading/krypto_bot/__pycache__/x.cpython-311.pyc": b"x", "tools/trading/krypto_bot/y.pyc": b"x",
             "tools/trading/ki_bot/STOP": b"stop", "tools/trading/ki_bot/PAUSE": b"pause", AU.VERSION_REL: b'{"version": "eingeschmuggelt"}', AU.LISTE_REL: b'{"dateien": {}}',
             "tools/trading/schatten/bild.png": b"\x89PNG", "tools/trading/krypto_bot/README.md": b"# readme\n"})
d4, m4 = PB.zip_bauen(viel, COMMIT, GEBAUT)
n4 = AU.zip_lesen(d4, AU.manifest_pruefen({k: m4[k] for k in ("format", "version", "commit", "gebaut", "datei", "sha256", "groesse")}))
pruefe("Ausschluss: Kurs-Zwischenspeicher, Bytecode, Not-Aus-Dateien", not any(k.startswith("tools/trading/daten/") or "pycache" in k or k.endswith(".pyc") or k.endswith(("/STOP", "/PAUSE")) for k in n4), sorted(n4))
pruefe("Ausschluss: mitgebrachte VERSION.json und Liste werden durch die eigenen ersetzt", json.loads(n4[AU.VERSION_REL])["version"] == m4["version"])
pruefe("unbekannte Dateiart (.png) wird übersprungen und genannt, nicht still verschluckt", "tools/trading/schatten/bild.png" not in n4 and m4["uebersprungen"] == ["tools/trading/schatten/bild.png"])
pruefe("erlaubte Dateiart (.md) bleibt", "tools/trading/krypto_bot/README.md" in n4)

# Ablehnungen schon beim Bau
for name, aend, muster in (("LF-Zeilenenden in einer .bat", {"tools/trading/krypto_bot/krypto-auto.bat": b"@echo off\nrem x\n"}, "Zeilenenden"),
                           ("gemischte Zeilenenden in einer .bat", {"tools/trading/krypto_bot/cockpit.bat": b"@echo off\r\nrem x\n"}, "Zeilenenden"),
                           ("LF in einer .vbs", {"tools/trading/krypto_bot/x.vbs": b"a\nb\n"}, "Zeilenenden"),
                           ("Syntaxfehler in einer .py", {"tools/trading/krypto_bot/kaputt.py": b"def (:\n"}, "Syntaxfehler"),
                           ("unzulässiger Pfad", {"tools/trading/krypto_bot/../x.py": b"x"}, "unzulässig")):
    x = dict(BASIS)
    x.update(aend)
    pruefe(f"Bau lehnt ab: {name}", muster in (wirft(PB.zip_bauen, x, COMMIT, GEBAUT) or ""))
for fehlt in ("autoupdate.py", "pflege.py", "cockpit.py", "pilot.py", "sperre.py", "krypto-auto.bat", "cockpit.bat"):
    x = {k: v for k, v in BASIS.items() if not k.endswith("/" + fehlt)}
    pruefe(f"Bau lehnt ab: Pflichtdatei {fehlt} fehlt", "Pflichtdateien" in (wirft(PB.zip_bauen, x, COMMIT, GEBAUT) or ""))
pruefe("Bau lehnt ab: Commit fehlt oder zu kurz", wirft(PB.zip_bauen, dict(BASIS), "abc", GEBAUT) is not None and wirft(PB.zip_bauen, dict(BASIS), None, GEBAUT) is not None)
pruefe("Hinweis wird bereinigt und gekürzt", PB.zip_bauen(dict(BASIS), COMMIT, GEBAUT, "a\n\n  b" + "x" * 400)[1]["hinweis"].startswith("a b") and len(PB.zip_bauen(dict(BASIS), COMMIT, GEBAUT, "x" * 400)[1]["hinweis"]) == 200)

# Das echte Repo
repo = HIER.parents[1]
if (repo / ".git").exists():
    echte = PB.sammeln(repo)
    pruefe("Repo: tools/trading wird gelesen", len(echte) > 50 and "tools/trading/krypto_bot/cockpit.py" in echte)
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(repo), capture_output=True, text=True).stdout.strip()
    dr, mr = PB.zip_bauen(echte, commit, GEBAUT, "Test", datum=PB.commit_datum(repo, commit))
    nr = AU.zip_lesen(dr, AU.manifest_pruefen({k: mr[k] for k in ("format", "version", "commit", "gebaut", "datei", "sha256", "groesse")}))
    pruefe("Repo: das echte Paket besteht die Prüfung des PCs", len(nr) > 50, mr)
    pruefe("Repo: enthält Updater und Pflege, aber keine Kurs-Zwischenspeicher", "tools/trading/krypto_bot/autoupdate.py" in nr and "tools/trading/krypto_bot/pflege.py" in nr
           and not any(k.startswith("tools/trading/daten/") for k in nr))
    pruefe("Repo: jede .bat/.vbs im Paket hat reine Windows-Zeilenenden", all(v.count(b"\n") == v.count(b"\r\n") for k, v in nr.items() if k.endswith((".bat", ".vbs"))))
    pruefe("Repo: Paket ist klein (unter 5 MB)", mr["groesse"] < 5_000_000, mr["groesse"])
    pruefe("commit_datum: Format JJJJ-MM-TT", re.fullmatch(r"\d{4}-\d{2}-\d{2}", PB.commit_datum(repo, commit) or "") is not None)
    pruefe("commit_datum: unbekannter Commit → None", PB.commit_datum(repo, "0" * 40) is None)
    with tempfile.TemporaryDirectory() as td:
        rc = PB.main(["--out", td, "--commit", commit, "--gebaut", GEBAUT, "--hinweis", "Aufruf"])
        beschr = json.loads((Path(td) / "paket.json").read_text(encoding="utf-8"))
        zip_datei = Path(td) / beschr["datei"]
        pruefe("Aufruf: schreibt ZIP und paket.json, die zusammenpassen", rc == 0 and zip_datei.is_file() and hashlib.sha256(zip_datei.read_bytes()).hexdigest() == beschr["sha256"]
               and beschr["hinweis"] == "Aufruf" and beschr["commit"] == commit)
else:
    print("(kein Git-Repo: Prüfungen am echten Repo übersprungen)")

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
