#!/usr/bin/env python3
"""Mutationsprobe für test_liveboard.js: baut absichtlich fehlerhafte Fassungen der Büro-Quellen und prüft, ob der Test jede erkennt.

Aufruf: python3 -I tools/buero/pruefung/mutation_liveboard.py <buero.json> [Namen der Mutanten ...]
Jeder Mutant ist eine einzige, genau einmal vorkommende Textersetzung in einer Kopie von tools/buero (die echten Dateien bleiben unberührt).
Zuerst läuft die unveränderte Kopie: sie MUSS bestehen, sonst ist die Probe wertlos («Ausgangslage grün»).
Danach gilt: Test schlägt fehl = Mutant erkannt; Test besteht = Mutant überlebt (Lücke im Test, im Bericht benannt).
Dauer: rund 25 Sekunden je Mutant (Software-WebGL). Braucht node, playwright und Chromium wie die Rauchprobe."""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[3]

# (Name, Datei unter tools/buero, alter Text, neuer Text). «Was der Fehler wäre» steht im Namen.
MUTANTEN = [
    ("keine-pickbox-fuer-liveboards", "3d/kb3d-buero.js",
     "Object.keys(W.live).forEach(function (name) { var b = W.live[name]; picks.push({ id: '__live:' + name, mn: b.mn, mx: b.mx }); });", ""),
    ("du-wird-als-alt-gezaehlt", "3d/kb3d-buero.js",
     "if (z[e.state] != null) z[e.state]++; else z.alt++;", "if (e.state !== 'du' && z[e.state] != null) z[e.state]++; else z.alt++;"),
    ("raumwechsel-rueckwaerts", "3d/kb3d-buero.js",
     "focusMonitor(liste[((k < 0 ? 0 : k) + r + liste.length) % liste.length]);", "focusMonitor(liste[((k < 0 ? 0 : k) - r + liste.length) % liste.length]);"),
    ("beschriftungen-bleiben-im-monitor", "3d/kb3d-buero.js",
     "show = !monitorMode && (near", "show = (near"),
    ("shop-rueckt-an-chefbuero-heran", "3d/kb3d-world.js",
     "'Shop': { x0: -11.8, z0: -1.2, west: 'hoch' },", "'Shop': { x0: -11.8, z0: -3.5, west: 'hoch' },"),
    ("zwei-schreibtische-zu-nah", "3d/kb3d-world.js",
     "{ room: 'Shop', i: 1, u: 4.6, v: 3.1,", "{ room: 'Shop', i: 1, u: 3.6, v: 3.1,"),
    ("liveboard-zu-klein", "3d/kb3d-world.js",
     "var BW = 4.8, BH = 2.4, BY = 1.85;", "var BW = 3.0, BH = 1.5, BY = 1.85;"),
    ("bild-wird-immer-neu-gezeichnet", "3d/kb3d-world.js",
     "if (key !== b.key) { b.key = key; R.retex(b.tex, T.liveboard(mo)); }", "{ b.key = key; R.retex(b.tex, T.liveboard(mo)); }"),
    ("liveboard-weit-weg-von-der-wand", "3d/kb3d-world.js",
     "var cx = d.x0 + uc, cz = d.z0 + t + 0.1;", "var cx = d.x0 + uc, cz = d.z0 + 3.0;"),
    ("siebter-shop-platz-fehlt", "3d/kb3d-world.js",
     "    { room: 'Shop', i: 6, u: 8.3, v: 5.3, h: 0, kind: 'single', style: 'white', chair: '#769b8a', who: 'man' },\n", ""),
    ("zentral-links-bei-raeumen-sichtbar", "seite.html",
     "if(nz)nz.hidden=!zentral;", "if(nz)nz.hidden=false;"),
    ("falscher-titel-der-monitorleiste", "seite.html",
     "'Liveboard · '+(name==='Entwicklerbüro'", "'Raum · '+(name==='Entwicklerbüro'"),
    ("messstand-geht-verloren", "seite.html",
     "colors: lampHex(), stand: stand };", "colors: lampHex(), stand: '' };"),
    ("textfassung-wird-nicht-gefuellt", "seite.html",
     "liveText(an?(name||'Zentral'):null);", ""),
    ("zeilennamen-fehlen-im-bild", "3d/kb3d-tex.js",
     "g.fillText(lbFit(g, z.name, 355), 84, y + 27);", ""),
    ("sonderzahl-fehlt", "3d/kb3d-buero.js",
     "if (!kpi && (e.figur === 'tafel' || e.figur === 'paket') && e.menge != null && e.menge !== '') kpi = ", "if (false) kpi = "),
    ("zurueck-stellt-kamera-nicht-her", "3d/kb3d-buero.js",
     "if(previous){userDist=previous.dist;cam.go(previous,!!cfg.reduced);}", ""),
    ("uhr-leer", "3d/kb3d-buero.js",
     "var ents = (lastState && lastState.ents) || [], zeit = swissClock(),", "var ents = (lastState && lastState.ents) || [], zeit = '',"),
    ("fusszeile-ueberlappt-letzte-zeile", "3d/kb3d-tex.js",
     "y0 = 216, zh = 36, max = 7;", "y0 = 216, zh = 39, max = 7;"),
    ("ueberlauf-hinweis-nicht-auf-der-fusszeile", "3d/kb3d-tex.js",
     "' weitere Zeilen im Raum', 976, 492);", "' weitere Zeilen im Raum', 976, 511);"),
    ("zentral-schrift-im-verdeckten-rand", "3d/kb3d-tex.js",
     "m && m.zeit, farben, 28);", "m && m.zeit, farben, 0);"),
    ("zentral-kacheln-im-verdeckten-rand", "3d/kb3d-tex.js",
     "tw = 209, th = 168, gap = 12, x0 = 76, y0 = 120;", "tw = 221, th = 168, gap = 14, x0 = 48, y0 = 120;"),
    ("zentral-kachelname-wird-abgekuerzt", "3d/kb3d-tex.js",
     "g.font = 'bold 21px ' + FONT; g.textAlign = 'left'; g.fillText(lbFit(g, titel, tw - 24), cx + 16, cy + 36);",
     "g.font = 'bold 23px ' + FONT; g.textAlign = 'left'; g.fillText(lbFit(g, titel, tw - 30), cx + 16, cy + 36);"),
]


def lauf(daten, mutant=None):
    tmp = Path(tempfile.mkdtemp(prefix="mut-lb-"))
    try:
        shutil.copytree(WURZEL / "tools" / "buero", tmp / "tools" / "buero", ignore=shutil.ignore_patterns("__pycache__"))
        os.symlink(WURZEL / "models", tmp / "models")
        if mutant:
            name, datei, alt, neu = mutant
            pfad = tmp / "tools" / "buero" / datei
            text = pfad.read_text(encoding="utf-8")
            if text.count(alt) != 1:
                return ("nicht-anwendbar", f"{name}: Muster kommt {text.count(alt)}-mal vor")
            pfad.write_text(text.replace(alt, neu), encoding="utf-8")
        aus = tmp / "aus"
        aus.mkdir()
        shutil.copy(daten, aus / "buero.json")
        shutil.copy(tmp / "tools" / "buero" / "seite.html", aus / "seite.html")
        subprocess.run(["node", str(tmp / "tools/buero/3d/bauen.mjs"), str(aus)], check=True, capture_output=True, cwd=tmp)
        subprocess.run([sys.executable, "-I", str(tmp / "tools/buero/pruefung/harness.py"), str(aus)], check=True, capture_output=True, cwd=tmp)
        # Ausgabe in Dateien statt Rohren: Chromium-Kindprozesse halten sonst die Rohre offen und das Lesen hängt
        log_aus, log_fehler = tmp / "test.out", tmp / "test.err"
        try:
            with open(log_aus, "w", encoding="utf-8") as fo, open(log_fehler, "w", encoding="utf-8") as fe:
                r = subprocess.run(["node", str(tmp / "tools/buero/pruefung/test_liveboard.js"), str(aus)], stdout=fo, stderr=fe, timeout=300, cwd=tmp)
        except subprocess.TimeoutExpired:
            return ("zeitueberschreitung", "")
        fehler = [z for z in log_aus.read_text(encoding="utf-8").splitlines() if z.startswith("FEHLER")]
        return ("besteht" if r.returncode == 0 else "faellt-durch", "; ".join(f[7:70] for f in fehler[:3]) or log_fehler.read_text(encoding="utf-8")[-200:])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    daten = Path(sys.argv[1]).resolve()
    auswahl = set(sys.argv[2:])
    print("Ausgangslage (unveränderte Kopie) ...", flush=True)
    status, info = lauf(daten)
    print("  ->", status, info)
    if status != "besteht":
        print("Die Ausgangslage besteht nicht: die Probe wäre wertlos. Abbruch.")
        return 1
    erkannt = ueberlebt = unklar = 0
    for m in MUTANTEN:
        if auswahl and m[0] not in auswahl:
            continue
        status, info = lauf(daten, m)
        if status == "faellt-durch":
            erkannt += 1
            print(f"erkannt     {m[0]:<38} {info}", flush=True)
        elif status == "besteht":
            ueberlebt += 1
            print(f"ÜBERLEBT    {m[0]:<38} (der Test merkt den Fehler nicht)", flush=True)
        else:
            unklar += 1
            print(f"UNKLAR      {m[0]:<38} {status} {info}", flush=True)
    print(f"\nerkannt {erkannt}, überlebt {ueberlebt}, unklar {unklar} (von {erkannt + ueberlebt + unklar})")
    return 1 if (ueberlebt or unklar) else 0


if __name__ == "__main__":
    sys.exit(main())
