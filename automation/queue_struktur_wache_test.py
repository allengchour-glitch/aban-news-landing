#!/usr/bin/env python3
"""queue_struktur_wache_test.py — Mutationstest für queue_struktur_wache.py (19.10.2026).

ANLASS: Zwei unabhängige Prüfer fuhren Mutationen gegen den Selbsttest der Wache (Kopien mit absichtlich eingebautem Fehler). Der Test des
Umsetzers fing 14 von 14, die Prüfer aber fanden 7 überlebende Mutationen — Zeilennummern aller Zeichen-Befunde, Instabil→unklar in pruefen(),
leere ID bei «pending», «id-doppelt-offen» mit posting/posting-unklar-pruefen, Negativfälle der Status-Familien — und ein ausgefallenes Statuswort
(«hold») liess den Selbsttest grün, obwohl die echten Queues danach 23 Befunde hatten. Ein Test, der nur das Bestehen prüft, beweist nichts:
hier wird die Gegenprobe dauerhaft gemacht. Jede Mutation hier ist ein Fehler, der dem Selbsttest (oder den main()-Prüfungen unten) auffallen MUSS.

WIE: Der Quelltext der Wache wird im Speicher gelesen, GENAU EINE Textstelle ersetzt (kommt der alte Text nicht genau einmal vor, ist die Mutation
«nicht anwendbar» = Fehler dieses Tests — sonst würde ein Umbau der Wache Mutationen still abschalten), das Ergebnis per exec() in einen eigenen
Namensraum geladen (`__file__` bleibt der echte Pfad: gleiche echten Queues, gleiches Repo) und geprüft:
  Ziel «selbsttest»  selbsttest() liefert Fehler (oder wirft)
  Ziel «haupt»       die main()-Prüfungen (Exit-Codes, Ausgabe; selbsttest()/parser_abgleich*/pruefen durch Attrappen ersetzt = schnell)
  Ziel «node»        main() mit NODE=/nonexistent/node: Selbsttest + Abgleich dürfen NICHT «ok»/Exit 0 sein (volle Läufe, ~3 s)
KONTROLLEN (ohne die wäre «alle gefangen» wertlos):
  K1  der unveränderte Quelltext besteht beide Prüfungen (keine Fehler)
  K2  eine Mutation, die nur einen Kommentar ändert, darf NICHT gefangen werden (sonst meldet der Test immer «gefangen»)
Läuft in einem Kind-Prozess je Mutation (fork), Zeitlimit 90 s je Mutation (Hänger = gefangen). Schreibt nichts (kein __pycache__, keine Dateien).

    python3 automation/queue_struktur_wache_test.py        alle Mutationen; Exit 0 = alle gefangen + Kontrollen ok, 1 = Überlebende/Kontrollfehler
    python3 automation/queue_struktur_wache_test.py --liste  nur die Mutationen auflisten
  Jeder andere Schalter: Meldung auf stderr, Exit 2, KEIN Lauf.
"""
import contextlib
import io
import multiprocessing
import os
import signal
import sys

sys.dont_write_bytecode = True

HIER = os.path.dirname(os.path.abspath(__file__))
WACHE = os.path.join(HIER, "queue_struktur_wache.py")
ZEIT_S = 90


# ------------------------------------------------------------------------------------------------------------------------------ Mutationen
def _stumm(art):
    """Mutation: der Aufruf `melde("<art>", …)` tut nichts mehr (der Befund fällt weg)."""
    return (f"stumm: Befund «{art}» wird nie gemeldet", f'melde("{art}",', f'(lambda *a, **k: None)("{art}",', "selbsttest")


MUTATIONEN = [
    # --- die sieben Überlebenden der Prüfer
    ("Instabil verschwindet in pruefen() (statt «unklar»)", '        except Instabil as e:\n            erg["unklar"].append((q, str(e)))',
     '        except Instabil as e:\n            pass', "selbsttest"),
    ("Zeilennummer aller Zeichen-Befunde immer 1", "z = satz_zeile if z is None else z", "z = 1 if z is None else z", "selbsttest"),
    ("pending nicht mehr «offen» (leere ID unbemerkt)", 'OFFEN = frozenset({"ready", "posting", "posting-unklar-pruefen", "pending"})',
     'OFFEN = frozenset({"ready", "posting", "posting-unklar-pruefen"})', "selbsttest"),
    ("leere ID nur noch bei SCHARF statt OFFEN", "if st in OFFEN:", "if st in SCHARF:", "selbsttest"),
    ("doppelte ID zählt OFFEN statt SCHARF (pending/pending würde Befund)", "offen = [x for x in zs if x[1] in SCHARF]", "offen = [x for x in zs if x[1] in OFFEN]", "selbsttest"),
    ("SCHARF ohne «posting»", 'SCHARF = frozenset({"ready", "posting", "posting-unklar-pruefen"})', 'SCHARF = frozenset({"ready", "posting-unklar-pruefen"})', "selbsttest"),
    ("SCHARF ohne «posting-unklar-pruefen»", 'SCHARF = frozenset({"ready", "posting", "posting-unklar-pruefen"})', 'SCHARF = frozenset({"ready", "posting"})', "selbsttest"),
    ("Familie posted offen: «posted.*» (postedx gilt)", 'r"posted(-[a-z0-9]+)+",', 'r"posted.*",', "selbsttest"),
    ("Familie skip ohne Bindestrich (xskip gilt)", 'r"([a-z0-9]+-)+skip",', 'r"[a-z0-9-]+skip",', "selbsttest"),
    ("Familie hold ohne Bindestrich (xhold gilt)", 'r"([a-z0-9]+-)+hold",', 'r"[a-z0-9-]+hold",', "selbsttest"),
    ("Familie archived ohne Grund (archived gilt)", r'(archived|verworfen|aussortiert)(-[a-z0-9]+)+"', r'(archived|verworfen|aussortiert)(-[a-z0-9]+)*"', "selbsttest"),
    # --- Fehler-Familie (Befund 1: youtube-fehler / instagram-fehler)
    ("Fehler-Familie ohne Bindestrich (tiktokfehler gilt)", 'r"[a-z0-9]+-fehler",', 'r"[a-z0-9]+-?fehler",', "selbsttest"),
    ("Fehler-Familie fällt weg (youtube-fehler unbekannt)", 'r"[a-z0-9]+-fehler",', 'r"(?!x)x",', "selbsttest"),
    # --- Wortschatz an die echten Queues gebunden (Befund 2: «hold» fiel aus STATUS_FEST, Selbsttest blieb grün)
    ("«hold» und «needs-rehost» fallen aus STATUS_FEST", '"posting-unklar-pruefen", "pending", "hold", "needs-rehost", "tiktok-entwurf",\n                         "produkt-nicht-aktiv"',
     '"posting-unklar-pruefen", "pending", "tiktok-entwurf",\n                         "produkt-nicht-aktiv"', "selbsttest"),
    ("«pending» fällt aus STATUS_FEST (7 echte Zeilen)", 'STATUS_FEST = frozenset({"ready", "posting", "posting-unklar-pruefen", "pending",',
     'STATUS_FEST = frozenset({"ready", "posting", "posting-unklar-pruefen",', "selbsttest"),
    ("«scheduled» fällt aus STATUS_FEST", '"skipped-nonjpg", "scheduled", "text-pruefen", "tiktok-fehler"})', '"skipped-nonjpg", "text-pruefen", "tiktok-fehler"})', "selbsttest"),
    # (kein Mutant für «ig-fehler»/«tiktok-fehler» in STATUS_FEST: beide deckt die Familie «<netz>-fehler» zusätzlich ab — äquivalent, würde überleben)
    ("status_bekannt kennt nur STATUS_FEST (Familien tot)", "return st in STATUS_FEST or any(p.fullmatch(st) for p in STATUS_FAMILIEN)", "return st in STATUS_FEST", "selbsttest"),
    # --- ID im offenen Satz (Befund 5)
    ("offene ID wieder der Dateirest (Quote in Feld 0)", 'info["offen_id"] = (satz[0] if satz else "")[:ID_MAX]', 'info["offen_id"] = satz[0] if satz else "".join(feld)', "selbsttest"),
    ("offene ID ungekappt", 'info["offen_id"] = (satz[0] if satz else "")[:ID_MAX]', 'info["offen_id"] = (satz[0] if satz else "")', "selbsttest"),
    # --- Plattform-Wortschatz (Befund 3)
    ("Metricool-Wortschatz fällt weg (linkedin unbekannt)", '"plattformen": METRICOOL_NETZE},', '},', "selbsttest"),
    ("Plattform-Wortschatz überall der weite (linkedin gilt bei reels_seed)", 'sp.get("plattformen", PLATTFORMEN)', "ALLE_NETZE", "selbsttest"),
    ("Spalten-Shift kennt nur die sechs Netze", "if f.strip().lower() in ALLE_NETZE:", "if f.strip().lower() in PLATTFORMEN:", "selbsttest"),
    ("Spalten-Shift wird nie erkannt", "    if len(r) <= n_kopf:\n        return None\n    best, lauf, start = None, 0, 0",
     "    return None\n    best, lauf, start = None, 0, 0", "selbsttest"),
    # --- Beständigkeit / Instabil
    ("pruefe_queue meldet ewiges Flackern nicht (gibt die letzte Lesung zurück)", '        raise Instabil(f"ändert sich bei jedem Lesen ({versuche}×, {pause} s Abstand)")', "        return res", "selbsttest"),
    ("pruefe_queue liest nie ein zweites Mal (halb geschriebene Datei = Befund)", "    for _ in range(versuche - 1):", "    for _ in range(0):", "selbsttest"),
    # --- Befundarten (die 14 des Umsetzers, sinngemäss, plus die Prüfer-Funde)
    _stumm("cr-im-feld"), _stumm("leerzeile"), _stumm("cr-allein"), _stumm("text-nach-geschlossenem-feld"),
    _stumm("anfuehrungszeichen-im-feld"), _stumm("ende-ohne-umbruch"), _stumm("offenes-anfuehrungszeichen"),
    ("Feldzahl wird nie geprüft", "        if len(r) != len(kopf):\n            sh = _shift_signatur(r, len(kopf))", "        if False:\n            sh = _shift_signatur(r, len(kopf))", "selbsttest"),
    ("Statuswort wird nie geprüft", "if st is not None and not status_bekannt(st):", "if False:", "selbsttest"),
    ("Plattform wird nie geprüft", "            if unbek:", "            if False:", "selbsttest"),
    ("doppelte offene ID wird nie gemeldet", "if offen and len(offen) + len(gepostet) >= 2:", "if False:", "selbsttest"),
    ("fehlende Pflichtspalte wird nie gemeldet", "    if fehlt:\n        befunde.append((1", "    if False:\n        befunde.append((1", "selbsttest"),
    ("fehlende Kopfzeile wird nie gemeldet", "    if sum(1 for p in pflicht if p in kopf) == 0:", "    if False:", "selbsttest"),
    ("BOM wird nie gemeldet", 'if text.startswith("\\ufeff"):\n        befunde.append', 'if False:\n        befunde.append', "selbsttest"),
    ("OSError beim Lesen gilt als ok (statt unklar)", '        except OSError as e:\n            erg["unklar"].append((q, f"nicht lesbar ({e.__class__.__name__})"))',
     '        except OSError as e:\n            pass', "selbsttest"),
    ("fehlende Datei gilt als ok (statt unklar)", '        except FileNotFoundError:\n            erg["unklar"].append((q, "Datei fehlt"))', '        except FileNotFoundError:\n            pass', "selbsttest"),
    # --- Exit-Codes und Ausgabe von main() (Befund 6: node fehlt → Selbsttest/Abgleich trotzdem «ok»)
    ("Selbsttest ohne node bleibt Exit 0", '(node fehlt oder scheiterte) · {bestand_txt}")\n                return 3', '(node fehlt oder scheiterte) · {bestand_txt}")\n                return 0', "haupt"),
    ("Selbsttest ohne node druckt trotzdem ✅", 'print(f"⚠️ queue_struktur_wache Selbsttest UNKLAR:', 'print(f"✅ queue_struktur_wache Selbsttest UNKLAR:', "haupt"),
    ("--parser-abgleich gibt immer Exit 0", "return abgleich_exit(*parser_abgleich_bericht())", "parser_abgleich_bericht()\n            return 0", "haupt"),
    ("abgleich_exit kennt «unklar» nicht", "return 1 if unterschiede else (3 if unklar else 0)", "return 1 if unterschiede else 0", "haupt"),
    ("abgleich_exit kennt «Unterschied» nicht", "return 1 if unterschiede else (3 if unklar else 0)", "return 3 if unklar else 0", "haupt"),
    ("«nicht gelaufen» zählt als Unterschied statt unklar", "            if t.startswith(NICHT_GELAUFEN):\n                unklar += 1", "            if False:\n                unklar += 1", "haupt"),
    ("Selbsttest-Fehler geben Exit 0", '"\\n - ".join(f))\n                return 1', '"\\n - ".join(f))\n                return 0', "haupt"),
    ("Bestand-Befunde werden nicht gemeldet", '                           f"Bestand: {bestand} Befund(e)', '                           f"Bestand: 0 Befund(e)', "haupt"),
    ("unbekannter Schalter läuft trotzdem (Exit 0)", '"Erlaubt: (nichts) | --still | --parser-abgleich | --selbsttest | --help", file=sys.stderr)\n        return 2',
     '"Erlaubt: (nichts) | --still | --parser-abgleich | --selbsttest | --help", file=sys.stderr)\n        return 0', "haupt"),
    ("Wächter-Ausnahme bei --parser-abgleich gibt Exit 0", 'return 3 if modus == "--parser-abgleich" else 0', "return 0", "haupt"),
    ("--still druckt die unklar-Zeile nicht", "            z = still_zeile(erg)\n            if z:\n                print(z)", "            z = still_zeile(erg)\n            if False:\n                print(z)", "haupt"),
    ("mjs_lief ist immer wahr (fehlendes node unbemerkt)", 'mjs_lief = all(e["n"]["queue_csv.mjs"] is not None for e in abgleich if "n" in e)', "mjs_lief = True", "node"),
]
KONTROLLE_UEBERLEBT = ("K2 Kontrolle: nur ein Kommentar ändert sich", "# hier ist eine leere ID gefährlich", "# hier ist eine leere ID sehr gefährlich", "selbsttest")


# ----------------------------------------------------------------------------------------------------------------------- Prüfung einer Kopie
def laden(src):
    ns = {"__file__": WACHE, "__name__": "queue_struktur_wache_mut"}
    exec(compile(src, WACHE, "exec"), ns)
    return ns


def aufruf(fn, args):
    """main() mit Argumenten → (Exit, stdout, stderr)."""
    o, e = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(o), contextlib.redirect_stderr(e):
        rc = fn(args)
    return rc, o.getvalue(), e.getvalue()


def haupt_tests(ns, voll=False):
    """Prüfungen von main(): Attrappen für die teuren Teile, damit sie schnell laufen. → [Fehlertext]. voll=True: zusätzlich die echten
    Läufe mit NODE=/nonexistent/node (node fehlt → nie «ok»)."""
    f = []
    main = ns["main"]

    def soll(was, ist, erwartet):
        if not ist == erwartet:
            f.append(f"{was}: erwartet {erwartet!r}, gemeldet {ist!r}")

    def selbst(ergebnis):
        ns["selbsttest"] = lambda: ergebnis
        return aufruf(main, ["--selbsttest"])
    echt = ns["selbsttest"], ns["parser_abgleich_bericht"], ns["parser_abgleich"], ns["pruefen"]
    try:
        rc, out, _ = selbst(([], 10, True, 0))
        soll("Selbsttest ok → Exit", rc, 0)
        soll("Selbsttest ok → ✅ und Bestand", out.startswith("✅") and "Bestand: 0 Befunde" in out, True)
        rc, out, _ = selbst(([], 10, True, 7))
        soll("Selbsttest mit Bestand-Befunden → Exit 0 (Daten, kein Werkzeugfehler)", rc, 0)
        soll("Selbsttest nennt die 7 Befunde des Bestands", "7 Befund" in out and "Daten, kein Werkzeugfehler" in out, True)
        rc, out, _ = selbst(([], 10, True, None))
        soll("Selbsttest mit unlesbarer echter Queue sagt «unklar»", rc == 0 and "Bestand: unklar" in out, True)
        rc, out, _ = selbst(([], 10, False, 0))
        soll("Selbsttest OHNE node → Exit", rc, 3)
        soll("Selbsttest OHNE node → kein ✅, aber «UNKLAR»", "✅" not in out and "UNKLAR" in out, True)
        rc, out, _ = selbst((["kaputt"], 10, True, 0))
        soll("Selbsttest mit Fehlern → Exit 1 und ❌", rc == 1 and out.startswith("❌") and "kaputt" in out, True)
        # --parser-abgleich: Exit-Code aus dem Ergebnis
        for erg, exit_soll in (((0, 0), 0), ((2, 0), 1), ((0, 3), 3), ((1, 1), 1)):
            ns["parser_abgleich_bericht"] = lambda erg=erg: erg
            soll(f"--parser-abgleich {erg} → Exit", aufruf(main, ["--parser-abgleich"])[0], exit_soll)

        def kaputt():
            raise RuntimeError("Attrappe")
        ns["parser_abgleich_bericht"] = kaputt
        rc, out, _ = aufruf(main, ["--parser-abgleich"])
        soll("Ausnahme im Abgleich → Exit 3 und «unklar»", rc == 3 and "unklar" in out, True)
        # parser_abgleich_bericht selbst: Einteilung in Unterschied / unklar
        ns["parser_abgleich_bericht"] = echt[1]
        kopf = {"q": "x.csv", "n": {"dieser Leser": 3, "Python csv": 3, "queue_csv.py": 3, "queue_csv.mjs": None},
                "abweichler": {"dieser Leser": 0, "Python csv": 0, "queue_csv.py": 0, "queue_csv.mjs": None}}
        for name, ergeb, soll_paar in (
                ("nur node nicht gelaufen", [dict(kopf, unterschiede=[("queue_csv.mjs", None, ns["NICHT_GELAUFEN"] + " (unklar)")])], (0, 1)),
                ("echter Unterschied", [dict(kopf, unterschiede=[("Python csv", 3, "Satz 3: 5 Felder (dieser Leser) vs 4")])], (1, 0)),
                ("Leser abgestürzt (FEHLER …) ist ein Unterschied", [dict(kopf, unterschiede=[("queue_csv.py", None, "FEHLER Error: x")])], (1, 0)),
                ("Datei nicht lesbar", [{"q": "y.csv", "fehler": "nicht lesbar (OSError)"}], (0, 1)),
                ("einig", [dict(kopf, unterschiede=[])], (0, 0))):
            ns["parser_abgleich"] = lambda repo=None, ergeb=ergeb: ergeb
            with contextlib.redirect_stdout(io.StringIO()):
                paar = ns["parser_abgleich_bericht"]()
            soll(f"parser_abgleich_bericht «{name}»", paar, soll_paar)
        # --still: «unklar» kommt in die Stunden-Zeile; sauber = still
        ns["pruefen"] = lambda: {"queues": {}, "unklar": [("social/x.csv", "Datei fehlt")]}
        rc, out, _ = aufruf(main, ["--still"])
        soll("--still bei unklar", rc == 0 and out.startswith("QUEUE-STRUKTUR: unklar ("), True)
        ns["pruefen"] = lambda: {"queues": {}, "unklar": []}
        rc, out, _ = aufruf(main, ["--still"])
        soll("--still bei sauber ist still", (rc, out), (0, ""))
        # Schalter: unbekannt → Exit 2, nichts auf stdout, kein Lauf
        ns["pruefen"] = lambda: (_ for _ in ()).throw(AssertionError("Lauf trotz unbekanntem Schalter"))
        for args in (["--gibtsnicht"], ["--still", "--selbsttest"], ["bericht"], ["--help", "--still"]):
            rc, out, err = aufruf(main, args)
            soll(f"Schalter {args}", (rc, out, "unbekannter Schalter" in err), (2, "", True))
    except Exception as e:   # eine Attrappe/der Namensraum ist kaputt → die Mutation ist gefangen
        f.append(f"Ausnahme in den main()-Prüfungen: {type(e).__name__}: {e}")
    finally:
        ns["selbsttest"], ns["parser_abgleich_bericht"], ns["parser_abgleich"], ns["pruefen"] = echt
    if voll:   # echte Läufe ohne node
        real = ns["NODE"]
        ns["NODE"] = "/nonexistent/node"
        try:
            rc, out, _ = aufruf(main, ["--selbsttest"])
            soll("Selbsttest bei fehlendem node: Exit", rc, 3)
            soll("Selbsttest bei fehlendem node: kein ✅", "✅" not in out and "UNKLAR" in out, True)
            rc, out, _ = aufruf(main, ["--parser-abgleich"])
            soll("--parser-abgleich bei fehlendem node: Exit", rc, 3)
            soll("--parser-abgleich bei fehlendem node: UNKLAR gedruckt", "UNKLAR" in out, True)
        except Exception as e:
            f.append(f"Ausnahme im node-Test: {type(e).__name__}: {e}")
        finally:
            ns["NODE"] = real
    return f


def pruefe_kopie(src, ziel):
    """→ (gefangen, Grund). Gefangen = die Prüfung meldet mindestens einen Fehler oder bricht ab."""
    try:
        ns = laden(src)
        if ziel == "selbsttest":
            fehler = ns["selbsttest"]()[0]
        else:
            fehler = haupt_tests(ns, voll=(ziel == "node"))
    except Exception as e:
        return True, f"Ausnahme {type(e).__name__}: {str(e)[:80]}"
    return bool(fehler), (fehler[0][:110] if fehler else "")


def _zeit(sig, frm):
    raise TimeoutError(f"Zeitlimit {ZEIT_S} s")


def kind(arbeit):
    nr, name, src, ziel = arbeit
    signal.signal(signal.SIGALRM, _zeit)
    signal.alarm(ZEIT_S)
    try:
        return (nr,) + pruefe_kopie(src, ziel)
    except Exception as e:   # Zeitlimit (Hänger) = gefangen
        return nr, True, f"{type(e).__name__}: {e}"
    finally:
        signal.alarm(0)


# ---------------------------------------------------------------------------------------------------------------------------------- main
def main(argv=None):
    args = sys.argv[1:] if argv is None else list(argv)
    if args and (len(args) != 1 or args[0] not in ("--liste", "--help", "-h")):
        print(f"queue_struktur_wache_test: unbekannter Schalter/Kombination {' '.join(args)!r} — kein Lauf.\nErlaubt: (nichts) | --liste | --help", file=sys.stderr)
        return 2
    if args and args[0] in ("--help", "-h"):
        print(__doc__)
        return 0
    if args and args[0] == "--liste":
        for i, (name, _, _, ziel) in enumerate(MUTATIONEN, 1):
            print(f"{i:>3}  [{ziel}] {name}")
        return 0
    try:
        with open(WACHE, encoding="utf-8") as f:
            src = f.read()
    except OSError as e:
        print(f"QUEUE-STRUKTUR-TEST: unklar (Wächter nicht lesbar: {e.__class__.__name__})")
        return 3
    arbeiten, unanwendbar = [(0, "K1 unverändert", src, "selbsttest"), (-1, "K1 unverändert (main)", src, "node")], []
    for i, (name, alt, neu, ziel) in enumerate(MUTATIONEN, 1):
        if src.count(alt) != 1:
            unanwendbar.append(f"{name}: alter Text kommt {src.count(alt)}× vor (erwartet 1×)")
            continue
        arbeiten.append((i, name, src.replace(alt, neu), ziel))
    kname, kalt, kneu, kziel = KONTROLLE_UEBERLEBT
    if src.count(kalt) != 1:
        unanwendbar.append(f"{kname}: alter Text kommt {src.count(kalt)}× vor (erwartet 1×)")
    else:
        arbeiten.append((len(MUTATIONEN) + 1, kname, src.replace(kalt, kneu), kziel))
    namen = {a[0]: a[1] for a in arbeiten}
    ergebnis = {}
    ctx = multiprocessing.get_context("fork")
    haengt = False
    with ctx.Pool(processes=min(4, os.cpu_count() or 1)) as pool:
        it = pool.imap_unordered(kind, arbeiten)
        for _ in arbeiten:
            try:
                nr, gefangen, grund = it.next(timeout=ZEIT_S * 2)   # ein Regex-Hänger im Kind wird vom Signal nicht unterbrochen — diese Grenze schon
            except multiprocessing.TimeoutError:
                haengt = True
                break
            ergebnis[nr] = (gefangen, grund)
    fehler = list(unanwendbar)
    if haengt:
        fehler.append(f"Zeitüberschreitung: keine Antwort binnen {ZEIT_S * 2} s — fehlende Ergebnisse: " + ", ".join(namen[a[0]] for a in arbeiten if a[0] not in ergebnis))
    for nr in (0, -1):
        if nr not in ergebnis:
            continue
        g, grund = ergebnis[nr]
        if g:
            fehler.append(f"K1 {namen[nr]}: der UNVERÄNDERTE Quelltext fällt durch ({grund})")
    for nr in sorted(k for k in ergebnis if k > 0):   # (fehlende Ergebnisse stehen schon als Zeitüberschreitung da)
        g, grund = ergebnis[nr]
        if nr == len(MUTATIONEN) + 1:
            if g:
                fehler.append(f"K2 {namen[nr]}: wurde GEFANGEN ({grund}) — der Test meldet alles als gefangen")
        elif not g:
            fehler.append(f"ÜBERLEBT: {namen[nr]}")
    n_mut = sum(1 for a in arbeiten if 0 < a[0] <= len(MUTATIONEN))
    if fehler:
        print(f"❌ queue_struktur_wache_test: {len(fehler)} Fehler ({n_mut} Mutationen angewendet)\n - " + "\n - ".join(fehler))
        return 1
    print(f"✅ queue_struktur_wache_test: {n_mut} von {len(MUTATIONEN)} Mutationen angewendet und ALLE gefangen · K1 unverändert besteht · K2 Kommentar-Mutation überlebt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
