#!/usr/bin/env python3
"""Mutationsprobe für den Bau des Dashboards: jeder eingebaute Fehler in bauen.py muss einen Test rot machen.

    python3 tools/buero/dashboard/mutationsprobe.py                      # nur der schnelle Bau-Test (test_bauen.py)
    python3 tools/buero/dashboard/mutationsprobe.py --browser <Bauordner>  # Überlebende zusätzlich gegen den Browsertest

<Bauordner> ist ein fertiger Ordner für test_dashboard.mjs (kb3d-*.js, kb-geldmanager.js, buero.json); die Probe kopiert ihn
je Mutant und baut index.html und die lx-Dateien mit dem veränderten bauen.py neu. Sie arbeitet nur in Temp-Ordnern.
Vorab muss die unveränderte Kopie grün sein, sonst gälte jeder Mutant als «erkannt». Ein Muster, das nicht genau einmal
vorkommt, zählt als «nicht anwendbar» (Exit 1)."""
import os
import shutil
import subprocess
import sys
import tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, "..", "..", ".."))
QUELLE = open(os.path.join(HIER, "bauen.py"), encoding="utf-8").read()

# (Name, altes Stück, neues Stück)
M = [
    ("B01 Offene Punkte: Zeichnungen werden nicht umbenannt", 'OFFEN_ZEICHNUNGEN = {"zahl": "op-zahl", "balken": "op-balken", "tabelle": "op-tabelle"}', "OFFEN_ZEICHNUNGEN = {}"),
    ("B02 Umbenennen nur im Gerüst, nicht im Skript", "        skript = re.sub(r\"(dash\\.draw\\(\\s*')%s'\" % re.escape(alt), r\"\\g<1>%s'\" % neu, skript)\n", ""),
    ("B03 Umbenennen nur im Skript, nicht im Gerüst", "        geruest = re.sub(r'data-draw=\"%s\"' % re.escape(alt), f'data-draw=\"{neu}\"', geruest)\n", ""),
    ("B04 fehlender Name beim Umbenennen wird hingenommen", "        if not n_html or not n_js:", "        if False:"),
    ("B05 Seite ohne Meta-Zeile wird hingenommen", "    if not html.startswith(META):\n        raise Baufehler(f\"{name}: die Seite beginnt nicht mit {META}\")\n", ""),
    ("B06 mehrere Stil- oder Skriptblöcke werden hingenommen", "    if len(stile) != 1 or len(skripte) != 1 or len(re.findall(r\"<script\\b\", html)) != 1 or len(re.findall(r\"<style\\b\", html)) != 1:", "    if False:"),
    ("B07 Skript mit Attribut wird hingenommen", " or len(re.findall(r\"<script\\b\", html)) != 1", ""),
    ("B08 fremde Klassen im Gerüst werden hingenommen", "    if fremd:\n        raise Baufehler(f\"{name}: Klassen ohne Präfix", "    if False:\n        raise Baufehler(f\"{name}: Klassen ohne Präfix"),
    ("B09 Klasse, die nur mit dem Präfix beginnt, gilt als eigen", "if k != praefix and not k.startswith(praefix + \"-\")", "if not k.startswith(praefix)"),
    ("B10 nackte Stil-Selektoren werden hingenommen", "            if \".\" + praefix not in teil:", "            if False:"),
    ("B11 nur der erste Selektor einer Regel wird geprüft", "        for teil in kopf.split(\",\"):\n            if \".\" + praefix not in teil:", "        for teil in kopf.split(\",\")[:1]:\n            if \".\" + praefix not in teil:"),
    ("B12 doppelte Namen zwischen den Seiten werden hingenommen", "                if doppelt:\n                    raise Baufehler(f\"{art} doppelt", "                if False:\n                    raise Baufehler(f\"{art} doppelt"),
    ("B13 zu grosse Dokumente werden hingenommen", "        if groesse > MAX_DOKUMENT:", "        if False:"),
    ("B14 Baugrenze 1 MB statt 250 000 Byte", "MAX_DOKUMENT = 250_000 ", "MAX_DOKUMENT = 1_000_000 "),
    ("B15 Büro-Abschnitt ist beim Start zu", "'<section class=\"lx-seite\" id=\"buero\" data-lx-seite=\"buero\">',", "'<section class=\"lx-seite\" id=\"buero\" data-lx-seite=\"buero\" hidden>',"),
    ("B16 Abschnitt «Offene Punkte» ist beim Start offen", "'<section class=\"lx-seite\" id=\"offen\" data-lx-seite=\"offen\" hidden>',", "'<section class=\"lx-seite\" id=\"offen\" data-lx-seite=\"offen\">',"),
    ("B17 Abschnitt «Suchanfragen» ist beim Start offen", "'<section class=\"lx-seite\" id=\"suche\" data-lx-seite=\"suche\" hidden>',", "'<section class=\"lx-seite\" id=\"suche\" data-lx-seite=\"suche\">',"),
    ("B18 Meta-Zeile fehlt in der fertigen Seite", "    index = \"\\n\".join([\n        META,\n", "    index = \"\\n\".join([\n"),
    ("B19 Büro-Seite wird gekürzt eingebettet", "        buero[len(META):].strip(\"\\n\"),", "        buero[len(META):].strip(\"\\n\")[:-40],"),
    ("B20 Stil der Offenen Punkte wird nicht eingebunden", "        '<link rel=\"stylesheet\" href=\"lx-offen.css\">',\n", ""),
    ("B21 Stil der Suchanfragen wird nicht eingebunden", "        '<link rel=\"stylesheet\" href=\"lx-suche.css\">',\n", ""),
    ("B22 Skript der Offenen Punkte wird nicht eingebunden", "        '<script src=\"lx-offen.js\"></script>',\n", ""),
    ("B23 Skript der Suchanfragen wird nicht eingebunden", "        '<script src=\"lx-suche.js\"></script>',\n", ""),
    ("B24 zweiter Knopf ist beim Start markiert", "aria-current=\"{\"page\" if i == 0 else \"false\"}\"", "aria-current=\"{\"page\" if i == 1 else \"false\"}\""),
    ("B25 --dokumente schreibt keinen Bearbeitungsvermerk", "json.dumps({\"text\": text, \"edit\": {\"via\": \"claude\", \"at\": jetzt}}, ensure_ascii=False)", "json.dumps({\"text\": text}, ensure_ascii=False)"),
    ("B26 Aufruf ohne Ordner gibt Exit 0", "        print(__doc__)\n        return 2", "        print(__doc__)\n        return 0"),
    ("B27 Unter-Reiter der Suchanfragen werden nicht geprüft", "        if f'id=\"ks-tab-{reiter}\"' not in s_geruest:", "        if False:"),
    ("B28 Abschnitt «Offene Punkte» trägt nicht den Namen seines Links als id", "'<section class=\"lx-seite\" id=\"offen\" data-lx-seite=\"offen\" hidden>',", "'<section class=\"lx-seite\" id=\"lx-seite-offen\" data-lx-seite=\"offen\" hidden>',"),
    ("B29 Seiten dürfen die Namen der Abschnitte als id tragen", "if x.startswith(\"lx-\") or x in eigene)", "if x.startswith(\"lx-\"))"),
    ("B30 Seiten dürfen Namen mit «lx-» tragen", "if x.startswith(\"lx-\") or x in eigene)", "if x in eigene)"),
    ("B31 Namen der Hülle werden gar nicht geprüft", "    huelle_namen_pruefen(belegt)\n", ""),
    # Hülle (Skript in der Seite): diese erkennt erst der Browsertest
    ("H01 Hülle zeigt die falschen Abschnitte", "s.hidden = s.dataset.lxSeite !== ziel;", "s.hidden = s.dataset.lxSeite === ziel;"),
    ("H02 Hülle markiert keinen Knopf", "t.dataset.lxZiel === ziel ? 'page' : 'false'", "t.dataset.lxZiel === ziel ? 'false' : 'false'"),
    ("H03 Hülle setzt beim Wechsel keinen Link", "    if (!ohneLink) dash.setLink(ziel);\n", ""),
    ("H04 Öffnen aus der Adresse setzt einen Link", "  if (LX_SEITEN.indexOf(lxOrt) > 0) lxZeige(lxOrt, true);", "  if (LX_SEITEN.indexOf(lxOrt) > 0) lxZeige(lxOrt);"),
    ("H05 Adresse #offen wird nicht geöffnet", "  if (LX_SEITEN.indexOf(lxOrt) > 0) lxZeige(lxOrt, true);", "  if (LX_SEITEN.indexOf(lxOrt) > 5) lxZeige(lxOrt, true);"),
    ("H06 Unter-Reiter in der Adresse öffnet die Suchanfragen nicht", "  else if (LX_SUCHE_REITER.indexOf(lxOrt) !== -1) lxZeige('suche', true);", ""),
    ("H07 Knöpfe reagieren nicht", "  document.querySelectorAll('.lx-tab').forEach((t) => t.addEventListener('click', () => lxZeige(t.dataset.lxZiel)));\n", ""),
    ("H08 unbekanntes Ziel bleibt ohne Rückfall auf das Büro", "    if (LX_SEITEN.indexOf(ziel) === -1) ziel = LX_SEITEN[0];\n", ""),
]


def baum(tmp, quelltext):
    ziel = os.path.join(tmp, "tools", "buero", "dashboard")
    os.makedirs(ziel)
    with open(os.path.join(ziel, "bauen.py"), "w", encoding="utf-8") as f:
        f.write(quelltext)
    for name in ("test_bauen.py", "offen.html", "test_dashboard.mjs"):
        shutil.copy(os.path.join(HIER, name), os.path.join(ziel, name))
    os.symlink(os.path.join(REPO, "tools", "buero", "seite.html"), os.path.join(tmp, "tools", "buero", "seite.html"))
    os.symlink(os.path.join(REPO, "dropship"), os.path.join(tmp, "dropship"))
    return ziel


def lauf(quelltext, browser):
    """→ 'bau', 'browser' (welcher Test den Mutanten erkannt hat) oder None (überlebt)."""
    with tempfile.TemporaryDirectory() as tmp:
        ziel = baum(tmp, quelltext)
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        r = subprocess.run([sys.executable, "-I", os.path.join(ziel, "test_bauen.py")], capture_output=True, text=True, env=env, timeout=120)
        if r.returncode != 0:
            return "bau"
        if not browser:
            return None
        bau = os.path.join(tmp, "bau")
        shutil.copytree(browser, bau, ignore=shutil.ignore_patterns("harness_*.html", "dok", "index.html", "lx-*"))
        r = subprocess.run([sys.executable, "-I", os.path.join(ziel, "bauen.py"), bau], capture_output=True, text=True, env=env, timeout=120)
        if r.returncode != 0:
            return "bau"
        with open(os.path.join(tmp, "aus.log"), "w") as aus:   # Ausgabe in eine Datei: Chromium hält sonst die Rohre offen
            r = subprocess.run(["node", os.path.join(ziel, "test_dashboard.mjs"), bau], stdout=aus, stderr=subprocess.STDOUT, timeout=600)
        return "browser" if r.returncode != 0 else None


def main():
    browser = None
    if "--browser" in sys.argv:
        browser = os.path.abspath(sys.argv[sys.argv.index("--browser") + 1])
    if lauf(QUELLE, browser) is not None:
        print("ABBRUCH: die unveränderte Kopie ist nicht grün, die Probe wäre wertlos.")
        return 1
    nur = [a for a in sys.argv[1:] if a[:1] in "BH" and a[1:3].isdigit()]
    erkannt, ueberlebt, unpassend = {"bau": 0, "browser": 0}, [], []
    for name, alt, neu in M:
        if nur and name.split()[0] not in nur:
            continue
        if QUELLE.count(alt) != 1:
            unpassend.append(name)
            print(f"?  {name}: Muster kommt {QUELLE.count(alt)}-mal vor")
            continue
        wer = lauf(QUELLE.replace(alt, neu), browser)
        if wer is None:
            ueberlebt.append(name)
            print(f"!! {name}: ÜBERLEBT" + ("" if browser else " (ohne Browsertest)"))
        else:
            erkannt[wer] += 1
    gesamt = erkannt["bau"] + erkannt["browser"] + len(ueberlebt) + len(unpassend)
    print(f"Mutationsprobe dashboard: {erkannt['bau'] + erkannt['browser']} von {gesamt} erkannt "
          f"(Bau-Test {erkannt['bau']}, Browsertest {erkannt['browser']}), {len(ueberlebt)} überlebt, {len(unpassend)} nicht anwendbar")
    return 1 if ueberlebt or unpassend else 0


if __name__ == "__main__":
    raise SystemExit(main())
