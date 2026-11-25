#!/usr/bin/env python3
"""tore.py — «fertig» nur mit Beweis: führt die Tore einer Tor-Datei aus und zählt erfüllt / offen / aufgegeben.

Nach dem Skill «unlazy» (Leonxlnx/unlazy, Idee übernommen, Code eigen, 25.11.2026) — schlank, ohne Freigabe-Speicher und
ohne Stop-Hook: hier laufen NUR Prüfbefehle, die wir selbst geschrieben haben. Nie eine Tor-Datei aus fremder Quelle ausführen.

FORMAT (Markdown, eine Datei je Aufgabe, z. B. dropship/tore/<aufgabe>.md):
    - [ ] T1: beobachtbares Ergebnis in einem Satz
        PRUEFUNG: bash-Befehl, der das Ergebnis SELBST misst
        ERWARTET: TOR-OK            (Teilstring) oder /regex/
    - [ ] T2: Ergebnis, das kein Befehl entscheiden kann (Betreiber-Klick, Google-Anzeige)
        HAND: wer/was es bestätigt
    AUFGEGEBEN: T3 Grund (Spalte 1; zählt nie als erfüllt, muss in der Meldung stehen)

Ein Prüf-Tor ist erfüllt, wenn der Befehl mit 0 endet UND ERWARTET in der Ausgabe steht. Ein Hand-Tor bleibt offen,
bis seine Zeile «- [x]» trägt (vom Menschen/Betreiber bestätigt). Keine Tore, doppelte IDs, halbe Tore = Fehler.

    python3 tools/tore.py dropship/tore/x.md        # führt aus, Exit 0 nur wenn alles erfüllt
    python3 tools/tore.py --selbsttest              # Gegenprobe gegen Kopien in einem Temp-Ordner
"""
import os, re, subprocess, sys, tempfile

TOR = re.compile(r"^- \[( |x|X)\] (T[\w.-]*): (.+)$")
ATTR = re.compile(r"^\s+(PRUEFUNG|ERWARTET|HAND):\s*(.*)$")
AUFG = re.compile(r"^AUFGEGEBEN:\s*(T[\w.-]*)\s+(\S.*)$")


def lesen(pfad):
    tore, aufg, fehler = [], {}, []
    for nr, z in enumerate(open(pfad, encoding="utf-8").read().splitlines(), 1):
        m = TOR.match(z)
        if m:
            tore.append(dict(id=m[2], titel=m[3], haken=m[1] != " ", nr=nr))
            continue
        m = ATTR.match(z)
        if m:
            if not tore:
                fehler.append(f"Zeile {nr}: {m[1]} ohne Tor")
            else:
                tore[-1][m[1]] = m[2]
            continue
        if z.lstrip().startswith(("PRUEFUNG:", "ERWARTET:", "HAND:")):
            fehler.append(f"Zeile {nr}: Attribut nicht eingerückt")
        m = AUFG.match(z)
        if m:
            aufg[m[1]] = m[2]
        elif z.startswith("AUFGEGEBEN:"):
            fehler.append(f"Zeile {nr}: AUFGEGEBEN ohne ID oder Grund")
    ids = [t["id"] for t in tore]
    if not tore:
        fehler.append("keine Tore — eine leere Liste ist kein «fertig»")
    for i in set(ids):
        if ids.count(i) > 1:
            fehler.append(f"doppelte ID {i}")
    for i in aufg:
        if i not in ids:
            fehler.append(f"AUFGEGEBEN nennt unbekanntes Tor {i}")
    for t in tore:
        p, e, h = "PRUEFUNG" in t, "ERWARTET" in t, "HAND" in t
        if p != e:
            fehler.append(f"{t['id']}: PRUEFUNG und ERWARTET nur zusammen")
        if not p and not h:
            fehler.append(f"{t['id']}: weder PRUEFUNG noch HAND")
        if p and h:
            fehler.append(f"{t['id']}: PRUEFUNG und HAND zugleich")
    return tore, aufg, fehler


def passt(ausgabe, erw):
    if len(erw) > 2 and erw.startswith("/") and erw.endswith("/"):
        return re.search(erw[1:-1], ausgabe, re.M) is not None
    return erw in ausgabe


def ausfuehren(pfad, cwd=None, zeitlimit=600):
    tore, aufg, fehler = lesen(pfad)
    if fehler:
        for f in fehler:
            print(f"FEHLER {f}")
        return 2, {}
    stand = {"erfüllt": 0, "offen": 0, "aufgegeben": 0}
    for t in tore:
        if t["id"] in aufg:
            stand["aufgegeben"] += 1
            print(f"AUFGEGEBEN {t['id']}: {t['titel']} — {aufg[t['id']]}")
            continue
        if "HAND" in t:
            ok = t["haken"]
            info = "bestätigt" if ok else f"wartet auf: {t['HAND']}"
        else:
            try:
                r = subprocess.run(["bash", "-c", t["PRUEFUNG"]], capture_output=True, text=True,
                                   timeout=zeitlimit, cwd=cwd or os.getcwd())
                aus = (r.stdout + r.stderr).strip()
                ok = r.returncode == 0 and passt(aus, t["ERWARTET"])
                info = f"exit {r.returncode} · {aus.splitlines()[-1][:110] if aus else '(keine Ausgabe)'}"
            except subprocess.TimeoutExpired:
                ok, info = False, f"Zeitlimit {zeitlimit}s"
        stand["erfüllt" if ok else "offen"] += 1
        print(f"{'ERFÜLLT' if ok else 'OFFEN  '} {t['id']}: {t['titel']} — {info}")
    print(f"STAND: {stand['erfüllt']} erfüllt · {stand['offen']} offen · {stand['aufgegeben']} aufgegeben"
          f" → {'ALLES ERFÜLLT' if stand['offen'] == stand['aufgegeben'] == 0 else 'NICHT FERTIG'}")
    return (0 if stand["offen"] == stand["aufgegeben"] == 0 else 1), stand


def selbsttest():
    fall = {
        "gut.md": ("- [ ] T1: eins\n    PRUEFUNG: echo TOR-OK\n    ERWARTET: TOR-OK\n"
                   "- [x] T2: hand\n    HAND: Betreiber\n", 0),
        "falsch_exit.md": ("- [ ] T1: exit 1 trotz Marke\n    PRUEFUNG: echo TOR-OK; exit 1\n    ERWARTET: TOR-OK\n", 1),
        "falsch_marke.md": ("- [ ] T1: ohne Marke\n    PRUEFUNG: echo nein\n    ERWARTET: TOR-OK\n", 1),
        "hand_offen.md": ("- [ ] T1: hand offen\n    HAND: Betreiber\n", 1),
        "aufgegeben.md": ("- [ ] T1: x\n    PRUEFUNG: echo TOR-OK\n    ERWARTET: TOR-OK\nAUFGEGEBEN: T1 geht nicht\n", 1),
        "leer.md": ("# nichts\n", 2),
        "doppelt.md": ("- [ ] T1: a\n    HAND: x\n- [ ] T1: b\n    HAND: y\n", 2),
        "halb.md": ("- [ ] T1: a\n    PRUEFUNG: echo TOR-OK\n", 2),
        "uneingerueckt.md": ("- [ ] T1: a\nPRUEFUNG: echo TOR-OK\nERWARTET: TOR-OK\n", 2),
        "regex.md": ("- [ ] T1: regex\n    PRUEFUNG: echo 'offen 0'\n    ERWARTET: /^offen 0$/\n", 0),
        "regex_falsch.md": ("- [ ] T1: regex\n    PRUEFUNG: echo 'offen 10'\n    ERWARTET: /^offen 0$/\n", 1),
    }
    fehl = 0
    with tempfile.TemporaryDirectory() as d:
        for name, (text, soll) in fall.items():
            p = os.path.join(d, name)
            open(p, "w", encoding="utf-8").write(text)
            alt = sys.stdout
            sys.stdout = open(os.devnull, "w")
            try:
                ist, _ = ausfuehren(p, cwd=d)
            finally:
                sys.stdout.close()
                sys.stdout = alt
            if ist != soll:
                fehl += 1
                print(f"SELBSTTEST FALSCH {name}: Exit {ist}, erwartet {soll}")
    print(f"SELBSTTEST {'OK' if not fehl else 'FEHLER'}: {len(fall) - fehl}/{len(fall)}")
    return 1 if fehl else 0


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--selbsttest":
        sys.exit(selbsttest())
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(ausfuehren(sys.argv[1])[0])
