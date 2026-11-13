#!/usr/bin/env python3
"""Last-Asylum-Bot – Kommandozeile.

Befehle:
  devices     angeschlossene Geräte auflisten
  capture     Screenshot vom Gerät holen (Grundlage für Templates)
  crop        Ausschnitt aus einem Screenshot als Template speichern
  check       Konfiguration + Templates prüfen (ohne Gerät)
  find        Template im aktuellen Bildschirm suchen (Feintuning der Schwelle)
  run         Bot laufen lassen
  replay      Bot gegen einen Ordner mit Screenshots testen (kein Gerät nötig)
  entdecke    Knöpfe im Bild automatisch finden und als Vorlage übernehmen
  lernen      aus den Protokollen echter Läufe bessere Schwellen ableiten

Beispiel:
  python3 bot.py capture -o shots/start.png
  python3 bot.py crop shots/start.png --box 820,60,980,150 -o templates/ui/close_x.png
  python3 bot.py run --config config/last-asylum.json --minutes 30
"""

from __future__ import annotations

import argparse
import glob
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Die Ausgabe muss Umlaute und Zeichen wie "○" vertragen - sonst stirbt der Bot
# an seiner eigenen Meldung. Genau das ist am 29.08. passiert: die Windows-
# Konsole laeuft auf cp1252, 'bot.py check' druckte das Kreissymbol vor
# "31 optionale Templates fehlen noch", und Python warf einen
# UnicodeEncodeError. Rueckgabewert 1, das Startskript brach ab ("Konfiguration
# ist fehlerhaft"), die Neustart-Schleife versuchte es 60 Sekunden spaeter
# wieder - und wieder. Der Bot stand einen halben Tag, weil er ein Zeichen
# nicht drucken konnte.
#
# 'errors="replace"' ist Absicht: eine Meldung mit einem Fragezeichen darin ist
# unendlich viel besser als ein Bot, der daran stirbt.
for _strom in (sys.stdout, sys.stderr):
    try:
        _strom.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # sehr alte Fassungen oder umgeleitete Stroeme
        pass

from laa import matcher  # noqa: E402
from laa.adb import AdbDevice, DeviceError, FakeDevice, list_devices  # noqa: E402
from laa.config import Config, ConfigError  # noqa: E402
from laa.engine import Engine  # noqa: E402
from laa.image import Image  # noqa: E402
from laa.log import Logger  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONFIG = os.path.join(HERE, "config", "last-asylum.json")


def make_device(args, dry_run: bool = False) -> AdbDevice:
    return AdbDevice(serial=args.serial, adb=args.adb, dry_run=dry_run)


def load_config(args) -> Config:
    cfg = Config.load(args.config)
    problems = cfg.validate()
    if problems:
        print("⚠ Konfiguration hat Probleme:", file=sys.stderr)
        for p in problems:
            print(f"  – {p}", file=sys.stderr)
        if not getattr(args, "force", False):
            raise SystemExit(2)
    return cfg


# --------------------------------------------------------------------- Befehle
def cmd_devices(args) -> int:
    serials = list_devices(args.adb)
    if not serials:
        print("Kein Gerät gefunden. Prüfen: USB-Debugging an, `adb devices`, ggf. `adb connect IP:5555`.")
        return 1
    for s in serials:
        print(s)
    return 0


def cmd_capture(args) -> int:
    dev = make_device(args)
    img = dev.screencap()
    out = args.output or os.path.join("shots", f"{time.strftime('%Y%m%d-%H%M%S')}.png")
    os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
    if args.scale and args.scale != 1.0:
        img = img.box_scale(int(img.width * args.scale), int(img.height * args.scale))
    if args.raster:
        img = img.draw_grid(args.raster)
        print(f"Raster: duenne Linie alle {args.raster} px, kraeftige alle {args.raster * 5} px")
    img.save(out)
    print(f"{out} ({img.width}x{img.height})")
    if img.ist_einfarbig():
        print("\n⚠ Das Bild ist LEER (einfarbig) - der Bot koennte so nichts erkennen.")
        print("  Emulatoren mit GPU-Rendering liefern bei screencap oft ein schwarzes Bild.")
        print("  BlueStacks: Einstellungen -> Grafik -> Renderer wechseln (DirectX <-> OpenGL),")
        print("  'Erweiterter Grafikmodus' aus, danach BlueStacks neu starten.")
        return 1
    return 0


def cmd_crop(args) -> int:
    img = Image.load(args.source)
    box = [float(v) for v in args.box.split(",")]
    if len(box) != 4:
        print("--box braucht 4 Werte: l,t,r,b (Pixel oder 0..1 relativ)", file=sys.stderr)
        return 2
    l, t, r, b = matcher.resolve_region(box, img.width, img.height)
    cut = img.crop(l, t, r - l, b - t)
    os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
    cut.save(args.output)
    print(f"{args.output} ({cut.width}x{cut.height}) aus {args.source} [{l},{t},{r},{b}]")
    return 0


def cmd_check(args) -> int:
    try:
        cfg = Config.load(args.config)
    except (ConfigError, OSError) as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 2
    problems = cfg.validate()
    print(f"Konfiguration: {cfg.path}")
    print(f"  Paket        : {cfg.package or '(nicht gesetzt)'}")
    print(f"  Regeln       : {len(cfg.rules)}")
    print(f"  Aufgaben     : {len(cfg.tasks)}")
    print(f"  Templates    : {os.path.join(cfg.root, cfg.templates_dir)}")
    print(f"  numpy        : {'ja (schnell)' if matcher.HAVE_NUMPY else 'nein (langsam, `pip install numpy`)'}")
    if cfg.offene_templates:
        print(f"\n○ {len(cfg.offene_templates)} optionale Templates fehlen noch "
              "(die Schritte werden übersprungen, bis du sie schneidest):")
        for name in cfg.offene_templates:
            print(f"  – templates/{name}")
        print("  → python3 bot.py capture -o shots/x.png && python3 bot.py crop shots/x.png "
              "--box l,t,r,b -o templates/<name>.png")
    if problems:
        print(f"\n✗ {len(problems)} Problem(e):")
        for p in problems:
            print(f"  – {p}")
        return 1
    print("\n✓ Konfiguration lauffähig")
    return 0


def cmd_package(args) -> int:
    """Paketname der App, die gerade im Vordergrund ist."""
    dev = make_device(args)
    pkg = dev.current_package()
    if not pkg:
        print("Konnte den Vordergrund-Prozess nicht lesen. Spiel offen? `adb devices` prüfen.",
              file=sys.stderr)
        return 1
    print(pkg)
    return 0


def cmd_find(args) -> int:
    if args.image:
        screen = Image.load(args.image)
    else:
        screen = make_device(args).screencap()
    tpl = Image.load(args.template)
    scale = args.scale if args.scale else 1.0
    region = [float(v) for v in args.region.split(",")] if args.region else None
    t0 = time.time()
    hits = matcher.find_all(screen, tpl, threshold=args.threshold, region=region, scale=scale, limit=args.limit)
    dt = time.time() - t0
    if not hits:
        print(f"kein Treffer ≥ {args.threshold} ({dt:.2f}s, numpy={matcher.HAVE_NUMPY})")
        return 1
    for h in hits:
        print(f"score={h.score:.3f} bei x={h.x} y={h.y} ({h.w}x{h.h}) → Mitte {h.center}")
    print(f"({dt:.2f}s, numpy={matcher.HAVE_NUMPY})")
    return 0


# Farbfamilien, in denen dieses Spiel seine Knöpfe malt.
ENTDECK_FARBEN = [
    ("gruen", (120, 181, 54), 40),
    ("orange", (237, 183, 59), 45),
    ("blau", (79, 153, 226), 45),
    ("hellblau", (150, 190, 225), 40),
    ("rot", (228, 58, 52), 45),
    ("weiss", (238, 240, 244), 26),
    # Der Rand der Ertrags-Blasen ist hellgrau-blau, nicht weiss - ohne diese
    # Familie werden Weizen, Holz, Kraut und Tickets schlicht uebersehen.
    ("blase", (195, 200, 207), 30),
]


def _lage(m, breite: int, hoehe: int) -> str:
    """Grobe Ortsangabe – damit sich aus der reinen Textausgabe erkennen lässt,
    welcher Knopf gemeint ist, ohne das Bild sehen zu müssen."""
    cx, cy = m.center
    rx, ry = cx / breite, cy / hoehe
    waag = "links" if rx < 0.34 else ("mitte" if rx < 0.67 else "rechts")
    senk = "oben" if ry < 0.25 else ("obere Mitte" if ry < 0.5 else
                                     ("untere Mitte" if ry < 0.78 else "unten"))
    return f"{senk} {waag} (x={rx:.2f} y={ry:.2f})"


def cmd_teilen(args) -> int:
    """Bildschirm aufnehmen und ins Git schieben - damit Claude ihn sehen kann.

    Claude laeuft in der Cloud und kommt an diesen PC nicht heran. Screenshots
    von Hand zu schicken funktioniert, kostet aber jedes Mal Aufwand und
    landet oft verkleinert an. Der Bot kann das Bild dagegen in voller
    Aufloesung aufnehmen und ueber das Repository weiterreichen.
    """
    import subprocess

    ordner = os.path.join(HERE, "austausch")
    os.makedirs(ordner, exist_ok=True)

    # Alte Bilder wegraeumen - das Repository soll nicht zulaufen.
    # Ohne die ausgeschriebene Rechnung: bei --behalten 1 ergab alte[:-0] eine
    # LEERE Liste, es wurde also nie etwas geloescht und der Ordner wuchs
    # unbegrenzt. Negative Scheiben sind hier eine Falle.
    alte = sorted(glob.glob(os.path.join(ordner, "*.png")))
    behalten = max(0, int(args.behalten) - 1) if args.behalten else 0
    zu_loeschen = alte[:len(alte) - behalten] if behalten else alte
    for pfad in zu_loeschen:
        os.remove(pfad)

    img = Image.load(args.image) if args.image else make_device(args).screencap()
    if img.ist_einfarbig():
        print("Das Bild ist leer - so ist nichts zu sehen. Siehe Hinweis bei 'capture'.",
              file=sys.stderr)
        return 1
    marke = args.als or time.strftime("%Y%m%d-%H%M%S")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in marke)
    ziel = os.path.join(ordner, f"{safe}.png")
    img.save(ziel)
    print(f"{ziel} ({img.width}x{img.height})")

    def git(*rest):
        return subprocess.run(["git", "-C", HERE, *rest], capture_output=True, timeout=180)

    git("add", "--", ordner)
    ergebnis = git("commit", "-m", f"Bildschirm zum Anschauen: {safe}")
    if ergebnis.returncode != 0 and b"nothing to commit" not in ergebnis.stdout:
        # Frueher lief es hier weiter und meldete am Ende "Hochgeladen" - obwohl
        # gar nichts eingetragen war. Der haeufigste Grund (git kennt auf
        # diesem Rechner keinen Namen) stand dabei in stderr, das weggeworfen
        # wurde.
        text = (ergebnis.stdout + ergebnis.stderr).decode("utf-8", "replace")
        print("Eintragen fehlgeschlagen:", " ".join(text.split())[:300], file=sys.stderr)
        return 1
    schub = git("push")
    if schub.returncode != 0:
        print("Hochladen fehlgeschlagen:",
              schub.stderr.decode("utf-8", "replace").strip()[:300], file=sys.stderr)
        return 1
    print("Hochgeladen. Claude kann das Bild jetzt sehen.")
    return 0


def cmd_entdecke(args) -> int:
    """Knopf-Kandidaten im aktuellen Bildschirm finden und nummeriert ablegen.

    Damit brauchst du keine Koordinaten mehr abzulesen: einmal `entdecke`,
    dann im Übersichtsbild die Nummer suchen und mit `--nimm` übernehmen.
    """
    ordner = os.path.join(HERE, "templates", "entdeckt")
    if args.nimm is not None:
        quelle = os.path.join(ordner, f"{args.nimm:02d}.png")
        if not os.path.exists(quelle):
            print(f"Kandidat {args.nimm} gibt es nicht ({quelle}).", file=sys.stderr)
            return 1
        if not args.als:
            print("--nimm braucht --als, z. B. --als hud/bubble_metall", file=sys.stderr)
            return 2
        ziel = os.path.join(HERE, "templates", args.als.replace("/", os.sep) + ".png")
        os.makedirs(os.path.dirname(ziel), exist_ok=True)
        Image.load(quelle).save(ziel)
        print(f"Kandidat {args.nimm} → templates/{args.als}.png")
        return 0

    screen = Image.load(args.image) if args.image else make_device(args).screencap()
    if screen.ist_einfarbig():
        print("Das Bild ist leer - so ist nichts zu finden. Siehe Hinweis bei 'capture'.",
              file=sys.stderr)
        return 1
    os.makedirs(ordner, exist_ok=True)
    for alt in glob.glob(os.path.join(ordner, "*.png")):
        os.remove(alt)

    kandidaten = []
    for name, rgb, tol in ENTDECK_FARBEN:
        treffer = matcher.find_color_button(
            screen, rgb, tolerance=tol,
            min_w=args.min_breite, max_w=args.max_breite,
            min_h=args.min_hoehe, max_h=args.max_hoehe,
            min_fuellung=0.5, limit=12,
        )
        for m in treffer:
            if any(abs(m.x - k[1].x) < 20 and abs(m.y - k[1].y) < 20 for k in kandidaten):
                continue
            kandidaten.append((name, m))
    kandidaten.sort(key=lambda k: (k[1].y, k[1].x))

    if not kandidaten:
        print("Keine Knopf-Kandidaten gefunden. Grenzen lockern, z. B. --min-breite 60")
        return 1

    uebersicht = Image(screen.width, screen.height, screen.mode, bytearray(screen.data))
    print(f"Bildschirm {screen.width}x{screen.height} – {len(kandidaten)} Kandidaten:\n")
    print(f"  {'Nr':>2}  {'Farbe':9} {'Groesse':>11}  Lage")
    for i, (farbe, m) in enumerate(kandidaten, 1):
        rand = max(4, min(m.w, m.h) // 12)
        cut = screen.crop(m.x - rand, m.y - rand, m.w + 2 * rand, m.h + 2 * rand)
        cut.save(os.path.join(ordner, f"{i:02d}.png"))
        uebersicht.draw_box(m.x - rand, m.y - rand, m.x + m.w + rand, m.y + m.h + rand)
        print(f"  {i:2d}  {farbe:9} {m.w:5d}x{m.h:<5d}  "
              f"{_lage(m, screen.width, screen.height)}")

    if args.blasen:
        # Alle Ertrags-Blasen auf einmal uebernehmen: sie landen im Lern-Ordner,
        # den die Sammel-Regel ohnehin per Muster ausliest. Kein Zuordnen noetig.
        ordner_blasen = os.path.join(HERE, "templates", "gelernt", "blasen")
        os.makedirs(ordner_blasen, exist_ok=True)
        vorhanden = len([f for f in os.listdir(ordner_blasen) if f.endswith(".png")])
        genommen = 0
        verworfen = []
        for farbe, m in kandidaten:
            if farbe != "blase":
                continue
            # Ertrags-Blasen sind rund und schweben ueber den Gebaeuden. Die
            # Randleisten (Allianz/Nachricht/Tasche rechts, Symbolspalte links)
            # haben denselben hellen Rahmen und wuerden sonst mit uebernommen.
            seiten = m.w / float(m.h)
            rx = m.center[0] / float(screen.width)
            # Grosszuegig: der Ring wird je nach Untergrund unten angeschnitten,
            # dadurch messen Blasen oft breiter als hoch.
            if not (0.55 <= seiten <= 1.8):
                verworfen.append((m, f"nicht rund ({m.w}x{m.h})"))
                continue
            if not (0.13 < rx < 0.85):
                verworfen.append((m, f"am Bildrand (x={rx:.2f})"))
                continue
            rand = max(4, min(m.w, m.h) // 12)
            cut = screen.crop(m.x - rand, m.y - rand, m.w + 2 * rand, m.h + 2 * rand)
            cut.save(os.path.join(ordner_blasen, f"{vorhanden + genommen:02d}.png"))
            genommen += 1
        if genommen:
            print(f"\n{genommen} Ertrags-Blase(n) übernommen → templates/gelernt/blasen/")
            print("Die Sammel-Regel benutzt sie ab sofort, ohne Neustart.")
        else:
            print("\nKeine Ertrags-Blasen übernommen. Steht die Basis-Ansicht offen und "
                  "sind Blasen sichtbar?")
        for m, grund in verworfen:
            print(f"  übersprungen: {m.w}x{m.h} bei {_lage(m, screen.width, screen.height)}"
                  f" – {grund}")
        return 0

    ziel = args.output or os.path.join("shots", "entdeckt.png")
    os.makedirs(os.path.dirname(os.path.abspath(ziel)) or ".", exist_ok=True)
    uebersicht.save(ziel)
    print(f"\nÜbersicht mit Rahmen: {ziel}")
    print(f"Einzelbilder: templates/entdeckt/01.png …")
    print("Übernehmen mit:  python bot.py entdecke --nimm 3 --als hud/bubble_metall")
    return 0


MIN_BELEGE = 5   # so viele Treffer braucht ein Schwellen-Vorschlag


def cmd_lernen(args) -> int:
    """Aus den JSONL-Protokollen echter Läufe bessere Schwellen ableiten."""
    import json as _json

    # PowerShell loest Platzhalter nicht auf - anders als eine Unix-Shell reicht es
    # 'logs\lauf-*.jsonl' woertlich durch. Also hier selbst aufloesen.
    dateien = []
    for muster in args.jsonl:
        treffer_muster = sorted(glob.glob(muster)) if any(c in muster for c in "*?[") else [muster]
        if not treffer_muster:
            print(f"Keine Datei passt auf {muster}", file=sys.stderr)
        dateien.extend(treffer_muster)
    if not dateien:
        print("Keine Protokolle gefunden. Erst einen Lauf mit --jsonl machen.", file=sys.stderr)
        return 1

    treffer, daneben, aufgaben = {}, {}, {}
    zeilen = 0
    for pfad in dateien:
        with open(pfad, "r", encoding="utf-8") as fh:
            for zeile in fh:
                try:
                    d = _json.loads(zeile)
                except ValueError:
                    continue
                if d.get("ev") == "aufgabe":
                    aufgaben.setdefault(d["aufgabe"], []).append(int(d.get("tipps", 0)))
                    continue
                if d.get("ev") != "vergleich":
                    continue
                zeilen += 1
                topf = treffer if d.get("treffer") else daneben
                topf.setdefault(d["template"], []).append(float(d["score"]))

    if not zeilen and not aufgaben:
        print("Keine Auswertungs-Daten gefunden. Lauf den Bot mit --jsonl logs/lauf.jsonl.",
              file=sys.stderr)
        return 1

    print(f"{zeilen} Vergleiche aus {len(dateien)} Datei(en)\n")
    print(f"{'Template':38} {'Treffer':>8} {'min':>7} {'bester Fehlschlag':>18} {'Vorschlag':>10}")
    vorschlaege = {}
    for name in sorted(set(treffer) | set(daneben)):
        ja, nein = sorted(treffer.get(name, [])), sorted(daneben.get(name, []))
        ja_min = ja[0] if ja else None
        nein_max = nein[-1] if nein else None
        neu = ""
        # Mindestens fuenf Treffer verlangen. Aus einem einzigen Vergleich eine
        # Schwelle abzuleiten heisst, den Zufall eines Laufs festzuschreiben -
        # und eine zu niedrige Schwelle greift danach dauerhaft daneben.
        if len(ja) < MIN_BELEGE:
            neu = f"zu wenig ({len(ja)})"
        elif ja_min is not None and nein_max is not None and nein_max < ja_min - 0.02:
            # Genau in die Lücke legen – mit etwas Abstand nach unten.
            neu = round(max(0.5, (ja_min + nein_max) / 2), 3)
            vorschlaege[name] = neu
        elif ja_min is not None and nein_max is None:
            neu = round(max(0.5, ja_min - 0.03), 3)
            vorschlaege[name] = neu
        elif ja_min is not None and nein_max is not None:
            neu = "unklar"
        print(f"{name:38} {len(ja):>8} {('%.3f' % ja_min) if ja_min is not None else '   -':>7} "
              f"{('%.3f' % nein_max) if nein_max is not None else '     -':>18} {str(neu):>10}")

    if aufgaben:
        print(f"\n{'Aufgabe':30} {'Läufe':>6} {'Tipps':>7} {'Ø':>6}   Hinweis")
        for name in sorted(aufgaben):
            werte = aufgaben[name]
            schnitt = sum(werte) / len(werte)
            if schnitt == 0 and len(werte) >= 3:
                hinweis = "läuft immer leer → Takt erhöhen oder Vorlage fehlt"
            elif schnitt < 0.5 and len(werte) >= 5:
                hinweis = "selten etwas zu tun → Takt erhöhen"
            elif schnitt > 8:
                hinweis = "sehr ergiebig → Takt verkürzen lohnt sich"
            else:
                hinweis = ""
            print(f"{name:30} {len(werte):>6} {sum(werte):>7} {schnitt:>6.1f}   {hinweis}")

    if not args.anwenden:
        print("\n→ Mit --anwenden werden die Vorschläge in die Konfiguration geschrieben.")
        return 0

    with open(args.config, "r", encoding="utf-8") as fh:
        roh = _json.load(fh)
    geaendert = _schwellen_setzen(roh, vorschlaege)
    if geaendert:
        with open(args.config, "w", encoding="utf-8") as fh:
            _json.dump(roh, fh, ensure_ascii=False, indent=2)
        print(f"\n{geaendert} Schwelle(n) in {args.config} angepasst.")
    else:
        print("\nNichts anzupassen.")
    return 0


def _schwellen_setzen(knoten, vorschlaege, zaehler=None) -> int:
    """Rekursiv jede Stelle mit 'template' auf die gelernte Schwelle setzen."""
    if zaehler is None:
        zaehler = [0]
    if isinstance(knoten, dict):
        name = knoten.get("template")
        if isinstance(name, str) and name in vorschlaege:
            neu = vorschlaege[name]
            if knoten.get("threshold") != neu:
                knoten["threshold"] = neu
                zaehler[0] += 1
        for wert in knoten.values():
            _schwellen_setzen(wert, vorschlaege, zaehler)
    elif isinstance(knoten, list):
        for wert in knoten:
            _schwellen_setzen(wert, vorschlaege, zaehler)
    return zaehler[0]


def cmd_run(args) -> int:
    cfg = load_config(args)
    logger = Logger(level=args.log_level, jsonl_path=args.jsonl)
    try:
        dev = make_device(args, dry_run=args.dry_run)
        dev.input_method = cfg.input_method
    except DeviceError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 2
    if args.dry_run:
        logger.warn("TROCKENLAUF – es wird nichts angetippt")
    if not matcher.HAVE_NUMPY:
        logger.warn("numpy fehlt – Bildsuche ist deutlich langsamer (`pip install numpy`)")

    engine = Engine(
        cfg,
        dev,
        logger=logger,
        shots_dir=args.shots,
        stop_file=args.stop_file,
        seed=args.seed,
        state_file=args.state_file,
    )
    # Jeder Lauf legt ein Bild in voller Aufloesung ab - damit liegt immer eine
    # frische Vorlage zum Nachschneiden bereit, ohne extra Befehl.
    try:
        pfad = engine.save_shot("start", engine.capture())
        logger.info("Startbild abgelegt", datei=pfad)
    except Exception as exc:  # pragma: no cover - haengt am Geraet
        logger.warn(f"Startbild nicht moeglich: {exc}")

    if args.start_app and cfg.package:
        dev.start_app(cfg.package, cfg.activity)
        logger.info("App gestartet, warte auf Ladebildschirm", paket=cfg.package)
        time.sleep(args.start_wait)

    max_seconds = args.minutes * 60 if args.minutes else None
    engine.run(max_seconds=max_seconds, max_steps=args.steps)
    logger.info("Bilanz: " + engine.summary())
    logger.close()
    return 0


def cmd_replay(args) -> int:
    cfg = load_config(args)
    files = sorted(glob.glob(os.path.join(args.folder, "*.png")))
    if not files:
        print(f"Keine PNG-Dateien in {args.folder}", file=sys.stderr)
        return 2
    frames = [Image.load(f) for f in files]
    dev = FakeDevice(frames, hold=True)
    logger = Logger(level=args.log_level)
    engine = Engine(cfg, dev, logger=logger, shots_dir=args.shots, sleep=lambda s: None, seed=1)
    logger.info(f"Replay über {len(frames)} Bilder aus {args.folder}")
    for i, name in enumerate(files):
        dev.index = i  # ein Bild = ein Schritt (der Bildschirm steht still)
        logger.info(f"— Bild {i + 1}/{len(files)}: {os.path.basename(name)}")
        engine.step()
    print()
    print("Bilanz:", engine.summary())
    print(f"Tipps: {dev.taps}")
    if dev.swipes:
        print(f"Wische: {dev.swipes}")
    return 0


# ------------------------------------------------------------------------ CLI
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="bot.py",
        description="Bildschirm-Bot für das Android-Spiel Last Asylum (ADB-gesteuert)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--adb", default=os.environ.get("ADB", "adb"), help="Pfad zur adb-Binärdatei")
    p.add_argument("-s", "--serial", default=os.environ.get("ANDROID_SERIAL"), help="Geräte-Seriennummer")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("devices", help="angeschlossene Geräte auflisten").set_defaults(func=cmd_devices)
    sub.add_parser("package", help="Paketnamen der App im Vordergrund zeigen").set_defaults(func=cmd_package)

    c = sub.add_parser("teilen", help="Bildschirm aufnehmen und Claude zeigen")
    c.add_argument("--als", help="Name statt Zeitstempel, z. B. versammlung")
    c.add_argument("--image", help="statt vom Geraet: aus dieser Datei")
    c.add_argument("--behalten", type=int, default=4,
                   help="so viele Bilder im Ordner behalten (Standard 4)")
    c.set_defaults(func=cmd_teilen)

    c = sub.add_parser("capture", help="Screenshot holen")
    c.add_argument("-o", "--output", help="Zieldatei (Standard: shots/<zeit>.png)")
    c.add_argument("--scale", type=float, default=1.0, help="Screenshot verkleinern, z. B. 0.5")
    c.add_argument("--raster", type=int, nargs="?", const=100, default=0,
                   help="Koordinaten-Raster einzeichnen (Standard alle 100 px) – zum Ausmessen")
    c.set_defaults(func=cmd_capture)

    c = sub.add_parser("crop", help="Template aus einem Screenshot schneiden")
    c.add_argument("source", help="Screenshot-Datei")
    c.add_argument("--box", required=True, help="l,t,r,b in Pixeln oder relativ (0..1)")
    c.add_argument("-o", "--output", required=True, help="Ziel-Template (PNG)")
    c.set_defaults(func=cmd_crop)

    c = sub.add_parser("check", help="Konfiguration prüfen")
    c.add_argument("--config", default=DEFAULT_CONFIG)
    c.set_defaults(func=cmd_check)

    c = sub.add_parser("find", help="Template suchen (Schwellenwert einstellen)")
    c.add_argument("template")
    c.add_argument("--image", help="Screenshot-Datei statt Live-Gerät")
    c.add_argument("--threshold", type=float, default=0.8)
    c.add_argument("--region", help="l,t,r,b (relativ oder Pixel)")
    c.add_argument("--scale", type=float, default=1.0)
    c.add_argument("--limit", type=int, default=3)
    c.set_defaults(func=cmd_find)

    c = sub.add_parser("run", help="Bot starten")
    c.add_argument("--config", default=DEFAULT_CONFIG)
    c.add_argument("--minutes", type=float, default=0, help="Laufzeit-Limit (0 = ohne Limit)")
    c.add_argument("--steps", type=int, help="Höchstzahl an Schleifen-Durchläufen")
    c.add_argument("--dry-run", action="store_true", help="nichts antippen, nur erkennen")
    c.add_argument("--start-app", action="store_true", help="App zu Beginn starten")
    c.add_argument("--start-wait", type=float, default=25, help="Wartezeit nach App-Start (s)")
    c.add_argument("--shots", default="shots", help="Ordner für Screenshots")
    c.add_argument("--jsonl", help="Ereignis-Log als JSONL")
    c.add_argument("--stop-file", default="STOP", help="Datei, deren Existenz den Bot beendet")
    c.add_argument("--state-file", default="zustand.json", dest="state_file",
                   help="merkt sich, wann welche Aufgabe zuletzt lief (überlebt Neustarts)")
    c.add_argument("--log-level", default="info", choices=["debug", "info", "warn", "error"])
    c.add_argument("--seed", type=int, help="Zufalls-Startwert (reproduzierbare Läufe)")
    c.add_argument("--force", action="store_true", help="trotz Konfigurations-Warnungen starten")
    c.set_defaults(func=cmd_run)

    c = sub.add_parser("entdecke", help="Knopf-Kandidaten finden und als Vorlage übernehmen")
    c.add_argument("--image", help="Screenshot-Datei statt Live-Gerät")
    c.add_argument("-o", "--output", help="Übersichtsbild (Standard: shots/entdeckt.png)")
    c.add_argument("--nimm", type=int, help="Nummer eines Kandidaten übernehmen")
    c.add_argument("--blasen", action="store_true",
                   help="alle gefundenen Ertrags-Blasen auf einmal übernehmen (ohne Nummern)")
    c.add_argument("--als", help="Zielname, z. B. hud/bubble_metall")
    c.add_argument("--min-breite", type=float, default=55, dest="min_breite")
    c.add_argument("--max-breite", type=float, default=700, dest="max_breite")
    c.add_argument("--min-hoehe", type=float, default=40, dest="min_hoehe")
    c.add_argument("--max-hoehe", type=float, default=240, dest="max_hoehe")
    c.set_defaults(func=cmd_entdecke)

    c = sub.add_parser("lernen", help="Schwellen aus echten Läufen nachjustieren")
    c.add_argument("jsonl", nargs="+", help="JSONL-Protokolle aus `run --jsonl`")
    c.add_argument("--config", default=DEFAULT_CONFIG)
    c.add_argument("--anwenden", action="store_true", help="Vorschläge in die Konfiguration schreiben")
    c.set_defaults(func=cmd_lernen)

    c = sub.add_parser("replay", help="gegen gespeicherte Screenshots testen")
    c.add_argument("folder", help="Ordner mit PNG-Screenshots")
    c.add_argument("--config", default=DEFAULT_CONFIG)
    c.add_argument("--shots", default="shots")
    c.add_argument("--log-level", default="info", choices=["debug", "info", "warn", "error"])
    c.add_argument("--force", action="store_true")
    c.set_defaults(func=cmd_replay)
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except (ConfigError, DeviceError) as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 2
    except FileNotFoundError as exc:
        print(f"✗ Datei nicht gefunden: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
