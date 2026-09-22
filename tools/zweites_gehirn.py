#!/usr/bin/env python3
"""Zweites Gehirn — das Gedaechtnis der AUTOMATION, nicht der Ereignisse.

`GEDAECHTNIS-JOURNAL.md` haelt fest, WAS passiert ist. Diese Datei haelt fest, WAS LAEUFT
und ob es das tut, was die teuer gelernten Lehren verlangen. Zwei Haelften:

  --inventar   Jedes Skript in automation/: wer startet es, schreibt es ein Ledger, gibt es
               ein Log, ist es ein Waechter oder ein einmaliges Werkzeug — und die einzige
               Frage, die dieses Projekt sechsmal Geld gekostet hat: **wer startet DICH?**
  --regeln     Die Lehren als ausfuehrbare Pruefung. Eine Lehre, die nur im Journal steht,
               wird vergessen; eine Lehre als Regel meldet sich von selbst wieder.

WARUM DAS NOETIG IST (gemessen 17.09.2026):
  630 Skripte in automation/, 124 davon nennt keine andere Datei. Das Journal hat rund 400
  Abschnitte. Beides zusammen passt in keinen Kopf und in kein Kontextfenster. Genau deshalb
  ist am 16.09. ein Lieferanten-Urteil ueber 535 Klingen elf Tage lang nicht vollstreckt
  worden, und genau deshalb stand `fortura_img_runner` monatelang in der Startliste, ohne
  dass es die Datei noch gab — der Keepalive uebersprang sie mit `|| continue`, schweigend.

DIE EISERNE REGEL DIESES WERKZEUGS:
  **Jede Regel muss ihren eigenen Koeder fangen UND einen echten Fall durchlassen.**
  Schafft eine Regel das nicht, wird sie NICHT gemeldet, sondern als kaputt ausgewiesen.
  Ein Waechter, der «0» meldet, muss zeigen koennen, dass er auch «1» kann (Lehre 16.09.:
  der Klingen-Waechter meldete 0, waehrend der Koeder aktiv im Verkauf stand).

  python3 tools/zweites_gehirn.py --selbsttest   # Gegenprobe in beide Richtungen
  python3 tools/zweites_gehirn.py --regeln       # nur Befunde, Exit 1 wenn welche
  python3 tools/zweites_gehirn.py --inventar     # Ueberblick
"""
import ast, re
import os
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
AUTO = REPO / "automation"

# Namen, die einen WAECHTER ankuendigen. Ein verwaister Waechter ist gefaehrlich (er sollte
# laufen und tut es nicht); ein verwaistes Einmal-Werkzeug ist harmlos.
WAECHTER_WORT = re.compile(r"(wache|waechter|wächter|guard|pruef|prüf|kontrolle|watch|"
                           r"ampel|hygiene|qa_|_qa|scan|monitor)", re.I)
# Dateien, die mit Absicht NUR in /tmp liegen: dort stehen Geheimnisse (Hausregel).
NUR_TMP_ERLAUBT = re.compile(r"(_env|secrets|token)\.sh$", re.I)


# ═══════════════════════════════════════════════════════════════════════════════
#  Quellen einlesen
# ═══════════════════════════════════════════════════════════════════════════════
def _textdateien():
    """Alle Dateien, in denen ein Aufruf stehen koennte."""
    raus = {}
    for muster in ("*.sh", "*.md", "*.py", "*.mjs", "*.js", "*.json", "*.yml", "*.yaml"):
        for p in REPO.rglob(muster):
            if ".git/" in str(p) or "node_modules" in str(p):
                continue
            try:
                raus[p] = p.read_text(errors="replace")
            except OSError:
                pass
    return raus


def _skripte():
    raus = []
    for muster in ("*.py", "*.mjs", "*.sh"):
        raus += [p for p in AUTO.rglob(muster) if "node_modules" not in str(p)]
    return sorted(set(raus))


# ═══════════════════════════════════════════════════════════════════════════════
#  REGELN — jede aus einer datierten, teuer gelernten Lehre
#  Signatur: regel(dateien) -> Liste[(pfad, zeile, text)]
# ═══════════════════════════════════════════════════════════════════════════════
def _api_helfer(baum):
    """Funktionen, die fuer uns eine fremde Schnittstelle sprechen."""
    return [f for f in ast.walk(baum)
            if isinstance(f, (ast.FunctionDef, ast.AsyncFunctionDef))
            and f.name in ("gql", "api", "sh", "shopify", "cj", "rest")]


def r_stille_null(dateien):
    """17.09.2026 — gql() gab nach erschoepften Versuchen ein LEERES Ergebnis zurueck.
    Der Aufrufer rechnete mit `.get(...)` weiter und meldete «0 Produkte»: eine Null, die
    wie eine Messung aussieht und ein Ausfall ist. 25 Waechter waren betroffen."""
    treffer = []
    for p, t in dateien.items():
        if p.suffix != ".py":
            continue
        try:
            baum = ast.parse(t)
        except SyntaxError:
            continue
        for fn in _api_helfer(baum):
            ende = fn.body[-1]
            if not (isinstance(ende, ast.Return) and ende.value is not None):
                continue
            v = ende.value
            leer = ((isinstance(v, ast.Dict) and not v.keys)
                    or (isinstance(v, ast.List) and not v.elts)
                    or (isinstance(v, ast.Constant) and v.value is None))
            if leer:
                treffer.append((p, ende.lineno,
                                f"{fn.name}() endet mit einem leeren Ergebnis "
                                f"— der Aufrufer meldet daraus eine Null"))
    return treffer


def r_grund_verschluckt(dateien):
    """17.09.2026 — `except Exception: pass` in einem API-Helfer. 15 Waechter meldeten
    «Shopify antwortet nicht», ohne je zu sagen warum; der Grund war Drosselung."""
    treffer = []
    for p, t in dateien.items():
        if p.suffix != ".py":
            continue
        try:
            baum = ast.parse(t)
        except SyntaxError:
            continue
        for fn in _api_helfer(baum):
            # 22.09.2026: Ein Helfer, der den Grund IRGENDWO festhaelt (grund/letzte/reason/fehler
            # als Ziel einer Zuweisung), verschluckt ihn nicht — auch wenn er daneben ein
            # `except: pass` um eine Nebenrechnung hat (Wartezeit aus restoreRate, Vorgabe 12 s
            # steht davor). Ohne diese Ausnahme meldete die Regel nach den Geduld-Patches vom
            # 21.09. 23 gesunde Helfer krank; die Koeder-Regel «einen echten Fall durchlassen»
            # war damit verletzt.
            haelt_grund = any(isinstance(k, ast.Name) and re.match(r"(grund|letzte|reason|fehler)", k.id)
                              for n in ast.walk(fn) if isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign))
                              for k in (n.targets if isinstance(n, ast.Assign) else [n.target]))
            if haelt_grund:
                continue
            for knoten in ast.walk(fn):
                if not isinstance(knoten, ast.Try):
                    continue
                for h in knoten.handlers:
                    if all(isinstance(s, ast.Pass) for s in h.body):
                        treffer.append((p, h.lineno,
                                        f"{fn.name}(): except-Zweig verschluckt den Grund"))
    return treffer


def r_pgrep_falle(dateien):
    """11.08.2026 (Lehre 1) — `pgrep -f <name>` findet die EIGENE Kommandozeile. Ein halber
    Tag toter Social-Autopilot galt als gesund. Richtig ist die argv-Pruefung:
    ps -eo args --no-headers | awk '$1=="bash" && $2 ~ /name\\.sh$/'"""
    treffer = []
    for p, t in dateien.items():
        if p.suffix != ".sh" or AUTO not in p.parents:
            continue
        for i, zeile in enumerate(t.split("\n"), 1):
            nackt = zeile.strip()
            if nackt.startswith("#") or "pgrep -f" not in nackt:
                continue          # Kommentare erklaeren die Falle, sie sind nicht die Falle
            treffer.append((p, i, f"pgrep -f statt argv-Pruefung: {nackt[:70]}"))
    return treffer


def r_nur_tmp_dauerlaeufer(dateien):
    """11.08.2026 (Lehre 2) — «Ein Dauerlaeufer, der nicht committet ist, existiert nicht.»
    Zweimal verloren. GEMESSEN 17.09.: `fortura_img_runner.sh` stand in der Startliste von
    engine_keepalive.sh, lag aber weder im Repo noch in /tmp — und wurde mit `|| continue`
    schweigend uebersprungen."""
    treffer = []
    for p, t in dateien.items():
        if p.suffix != ".sh" or AUTO not in p.parents:
            continue
        for i, zeile in enumerate(t.split("\n"), 1):
            if zeile.strip().startswith("#"):
                continue
            for pfad in re.findall(r"/tmp/([A-Za-z0-9_.-]+\.sh)", zeile):
                if NUR_TMP_ERLAUBT.search(pfad):
                    continue      # Geheimnisse gehoeren nach /tmp, nicht ins Repo
                if not (AUTO / pfad).exists():
                    treffer.append((p, i, f"/tmp/{pfad} hat keine Fassung in automation/ "
                                          f"— nach dem naechsten Wipe ist sie weg"))
        # ⚠️ KORREKTUR 17.09.2026, eine Stunde nach dem Bau dieser Regel: Die Fassung oben
        # suchte nur AUSGESCHRIEBENE Pfade — und meldete darum ausgerechnet fuer den Fall
        # «0», der sie ausgeloest hatte. engine_keepalive.sh baut den Pfad naemlich aus
        # einer Schleifenvariablen:
        #     for S in cj_queue_runner autocommit fortura_img_runner …; do
        #         QUELL="/tmp/$S.sh"
        # Mein Selbsttest bestand trotzdem, weil sein Koeder ein ausgeschriebener Pfad war.
        # **Ein Koeder, den ich mir ausdenke, prueft meine Vorstellung; ein Koeder aus dem
        # echten Fall prueft die Wirklichkeit.** Darum steht der echte Schleifenkopf jetzt
        # als Koeder im Selbsttest, und die Regel liest die Namensliste mit.
        # ⚠️ DRITTER Anlauf, und diesmal GEMESSEN statt ueberlegt. Die Regel meldete
        # zweimal 0 fuer ihren Anlassfall. Grund war keine der beiden Erklaerungen, die
        # ich mir zurechtgelegt hatte, sondern: `re.search` liefert den ERSTEN Treffer,
        # und das ist in engine_keepalive.sh `/tmp/$Q.sh` aus einer anderen Schleife —
        # also suchte die Regel nach «for Q in …», das es nicht gibt, waehrend die
        # gesuchte Liste unter «for S in …» steht. **Der erste Treffer eines Musters ist
        # nicht «der» Treffer** — dieselbe Familie wie das Dateifeld von heute Morgen,
        # wo `input[type=file]` das erste statt das richtige Feld war.
        # Also ALLE Variablen sammeln, nicht die erste nehmen.
        variablen = set(re.findall(r"/tmp/\$\{?(\w+)\}?\.sh", t))
        if not variablen:
            continue
        # ⚠️ ZWEITE Korrektur derselben Regel, zehn Minuten nach der ersten. Sie meldete
        # WIEDER 0 fuer ihren Anlassfall, weil der echte Schleifenkopf ueber zwei Zeilen
        # geht und «fortura_img_runner» auf der FORTSETZUNGSZEILE steht:
        #     for S in cj_queue_runner autocommit reel_engine_runner social_autopilot \
        #              fortura_img_runner website_hygiene_runner; do
        # Mein Koeder war beide Male ein Einzeiler — also hat der Selbsttest zweimal meine
        # VORSTELLUNG geprueft statt die Wirklichkeit. Fortsetzungszeilen werden jetzt
        # zusammengezogen, und der Koeder ist woertlich der echte, zweizeilige Kopf.
        verbunden = t.replace("\\\n", " ")
        for i, zeile in enumerate(verbunden.split("\n"), 1):
            for variable in variablen:
                kopf = re.match(rf"\s*for\s+{variable}\s+in\s+(.+?)(;|$)", zeile)
                if not kopf:
                    continue
                for name in kopf.group(1).replace("\\", " ").split():
                    if name in ("do", ";") or name.startswith("$"):
                        continue
                    if not (AUTO / f"{name}.sh").exists():
                        treffer.append((p, i, f"Startliste nennt «{name}», aber "
                                              f"automation/{name}.sh gibt es nicht "
                                              f"— es laeuft nur, solange /tmp es hat"))
    return treffer


def r_stiller_uebersprung(dateien):
    """17.09.2026 — ein Starter, der eine fehlende Engine mit `|| continue` uebergeht, meldet
    dauerhaft «alles laeuft». Fehlt etwas, muss sein NAME fallen."""
    treffer = []
    for p, t in dateien.items():
        if p.suffix != ".sh" or AUTO not in p.parents:
            continue
        zeilen = t.split("\n")
        for i, zeile in enumerate(zeilen, 1):
            nackt = zeile.strip()
            if nackt.startswith("#"):
                continue
            if not re.search(r"\[ -f \"?\$\w+\"? \] \|\| continue", nackt):
                continue
            # Faellt in den drei Zeilen davor ein echo/printf, ist der Fall benannt.
            umfeld = " ".join(z for z in zeilen[max(0, i - 4):i])
            if re.search(r"\b(echo|printf|log)\b", umfeld):
                continue
            treffer.append((p, i, "fehlende Engine wird SCHWEIGEND uebersprungen "
                                  "— kein Name, keine Meldung"))
    return treffer


REGELN = [
    ("stille-null", r_stille_null, "17.09.2026"),
    ("grund-verschluckt", r_grund_verschluckt, "17.09.2026"),
    ("pgrep-falle", r_pgrep_falle, "11.08.2026"),
    ("nur-tmp-dauerlaeufer", r_nur_tmp_dauerlaeufer, "11.08.2026"),
    ("stiller-uebersprung", r_stiller_uebersprung, "17.09.2026"),
]

# ═══════════════════════════════════════════════════════════════════════════════
#  SELBSTTEST — jede Regel gegen einen Koeder UND gegen einen echten Fall
# ═══════════════════════════════════════════════════════════════════════════════
KOEDER = {
    "stille-null": ("koeder.py", "def gql(q):\n    for _ in range(3):\n        pass\n    return {}\n"),
    "grund-verschluckt": ("koeder.py", "def gql(q):\n    try:\n        x = 1\n    except Exception:\n        pass\n    return x\n"),
    "pgrep-falle": ("automation/koeder.sh", 'pgrep -f "social_autopilot" && echo laeuft\n'),
    # Der ECHTE Fall aus engine_keepalive.sh, nicht ein ausgedachter Literal-Pfad:
    "nur-tmp-dauerlaeufer": ("automation/koeder.sh",
                             'for S in cj_queue_runner autocommit \\\n'
                             '         gibt_es_nicht_xyz website_hygiene_runner; do\n'
                             '  QUELL="/tmp/$S.sh"\ndone\n'),
    "stiller-uebersprung": ("automation/koeder.sh", 'QUELL=/tmp/x.sh\n[ -f "$QUELL" ] || continue\n'),
}
# Echte Faelle, die NICHT gemeldet werden duerfen — sonst meldet die Regel Gesundes krank.
ECHT = {
    "stille-null": ("koeder.py", "def gql(q):\n    for _ in range(3):\n        pass\n    raise RuntimeError('Grund')\n"),
    # Echt: der Grund wird festgehalten — UND daneben darf ein `except: pass` um eine Nebenrechnung stehen (21.09.-Muster).
    "grund-verschluckt": ("koeder.py", "def gql(q):\n    grund = ''\n    wartezeit = 12.0\n    try:\n        wartezeit = 1 / 0\n    except Exception:\n        pass\n    try:\n        x = 1\n    except Exception as e:\n        grund = str(e)\n    return x\n"),
    "pgrep-falle": ("automation/koeder.sh", '# pgrep -f ist eine Falle, siehe Lehre 1\nps -eo args | awk \'$2 ~ /x\\.sh$/\'\n'),
    # Echt: beide Namen liegen im Repo, der Env-Pfad gehoert mit Absicht nur nach /tmp.
    "nur-tmp-dauerlaeufer": ("automation/koeder.sh",
                             'for S in autocommit social_autopilot; do\n  QUELL="/tmp/$S.sh"\ndone\n'
                             'setsid bash /tmp/secrets_env.sh &\n'),
    "stiller-uebersprung": ("automation/koeder.sh", 'QUELL=/tmp/x.sh\necho "fehlt: $QUELL"\n[ -f "$QUELL" ] || continue\n'),
}


def selbsttest():
    fehler = []
    for name, regel, _datum in REGELN:
        for richtung, quelle, muss_finden in (("Koeder", KOEDER, True), ("Echt", ECHT, False)):
            if name not in quelle:
                fehler.append(f"{name}: kein {richtung}-Fall hinterlegt")
                continue
            rel, inhalt = quelle[name]
            p = REPO / rel
            gefunden = bool(regel({p: inhalt}))
            if gefunden != muss_finden:
                fehler.append(f"{name}: {richtung}-Fall "
                              + ("NICHT gefangen" if muss_finden else "faelschlich gemeldet"))
    print(f"Regeln: {len(REGELN)} · Pruefungen: {len(REGELN) * 2}")
    if fehler:
        for f in fehler:
            print("  ❌", f)
        print("SELBSTTEST ROT — es wird NICHTS gemeldet, solange eine Regel ihre eigene "
              "Gegenprobe nicht besteht.")
        return 1
    print("✅ Jede Regel faengt ihren Koeder und laesst den echten Fall durch.")
    return 0


# ═══════════════════════════════════════════════════════════════════════════════
def regeln_laufen(still=False):
    if selbsttest() != 0:
        return 2
    dateien = _textdateien()
    gesamt = 0
    print()
    for name, regel, datum in REGELN:
        t = regel(dateien)
        gesamt += len(t)
        if not t:
            print(f"✅ {name:24} 0")
            continue
        print(f"⚠️  {name:24} {len(t)}  (Lehre {datum})")
        for p, zeile, text in sorted(t)[:8]:
            print(f"      {p.relative_to(REPO)}:{zeile}  {text}")
        if len(t) > 8:
            print(f"      … und {len(t) - 8} weitere")
    print(f"\nBEFUNDE: {gesamt}")
    return 1 if gesamt else 0


BASIS = REPO / "dropship" / "_zweites_gehirn_basis.txt"


def _alle_befunde(dateien):
    raus = []
    for name, regel, _d in REGELN:
        for pf, zeile, text in regel(dateien):
            raus.append(f"{name}\t{pf.relative_to(REPO)}\t{text[:80]}")
    return sorted(set(raus))          # ohne Zeilennummer: Verschieben ist kein neuer Befund


def wacht(schreibe_basis=False):
    """Taeglicher Lauf: meldet NUR, was seit der Grundlinie NEU ist.

    Warum nicht alle 144 Befunde taeglich: «Eine Zeile, die sich in jedem Durchgang
    wiederholt, ist keine Meldung» (Lehre 29.08.2026 — die stuendlichen «neu gestartet»-
    Zeilen uebertoenten echte Befunde). Der Altbestand steht in der Grundlinie und wird
    stueckweise abgearbeitet; gemeldet wird, was NEU dazukommt. So kann der Bestand in
    einer BEKANNTEN Weise nicht mehr schlechter werden, ohne dass es jemand sagt."""
    if selbsttest() != 0:
        return 2
    jetzt = _alle_befunde(_textdateien())
    if schreibe_basis:
        BASIS.write_text("\n".join(jetzt) + "\n")
        print(f"\nGrundlinie geschrieben: {len(jetzt)} bekannte Befunde → "
              f"{BASIS.relative_to(REPO)}")
        return 0
    alt = set(BASIS.read_text().split("\n")) if BASIS.exists() else set()
    neu = [z for z in jetzt if z not in alt]
    weg = len(alt - set(jetzt) - {""})
    print(f"\nZWEITES GEHIRN: {len(jetzt)} Befunde · {len(neu)} NEU · {weg} seit der "
          f"Grundlinie behoben")
    for z in neu[:12]:
        n, pf, txt = z.split("\t")
        print(f"  ⚠️ NEU [{n}] {pf}: {txt}")
    if len(neu) > 12:
        print(f"  … und {len(neu) - 12} weitere neue")
    return 1 if neu else 0


def inventar():
    dateien = _textdateien()
    skripte = _skripte()
    verwaiste_waechter, verwaist_sonst, bewacht = [], [], 0
    for s in skripte:
        genannt = [p for p, t in dateien.items() if p != s and s.name in t]
        if genannt:
            bewacht += 1
        elif WAECHTER_WORT.search(s.name):
            verwaiste_waechter.append(s)
        else:
            verwaist_sonst.append(s)
    print(f"Skripte in automation/:        {len(skripte)}")
    print(f"  von anderer Stelle genannt:  {bewacht}")
    print(f"  ⚠️ VERWAISTE WAECHTER:        {len(verwaiste_waechter)}  "
          f"(Name sagt Waechter, niemand startet sie)")
    print(f"  verwaist, vermutlich einmalig:{len(verwaist_sonst)}")
    print("\n⚠️ Verwaiste Waechter — jeder ist die Frage «wer startet DICH?» (Lehre 19.08.):")
    for s in verwaiste_waechter[:30]:
        print("   ", s.relative_to(REPO))
    if len(verwaiste_waechter) > 30:
        print(f"    … und {len(verwaiste_waechter) - 30} weitere")
    return 0


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "--regeln"
    if a == "--selbsttest":
        sys.exit(selbsttest())
    if a == "--inventar":
        sys.exit(inventar())
    if a == "--regeln":
        sys.exit(regeln_laufen())
    if a == "--wacht":
        sys.exit(wacht())
    if a == "--grundlinie":
        sys.exit(wacht(schreibe_basis=True))
    print(__doc__)
    sys.exit(0)
