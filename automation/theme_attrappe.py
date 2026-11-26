#!/usr/bin/env python3
"""theme_attrappe.py — Prüfgerät für die --selbsttest der Theme-Wächter (26.11.2026, dropship/theme-id-2611/URTEILE.md).

WARUM: Die Selbsttests von warenkorb_gratisversand / warenkorb_einig / google_org_richtlinien / abendaktion prüften nur reine
Hilfsfunktionen. pruefen() lief nie — der Vertrag mit dem Aufseher (fixer_keepalive.sh wertet die LETZTE Zeile aus: nur das
Reizwort, z. B. «Hinweis fehlt», löst einen SCHARF-Lauf aus, jede andere ⚠️-Zeile wird nur gemeldet) und die MAIN-Wachen vor dem
Schreiben waren ungetestet (Skeptiker 26.11.: 12 von 14 eigenen Mutanten überlebten). Hiermit laufen pruefen()/einfuegen()/
schreiben()/start() OHNE Netz gegen ein Attrappen-Theme.

  Attrappe(dateien, role)  gql-Ersatz: beantwortet theme(id:…){role files(…)} und die Produkt-Seite «tag:profil-ch-lager»;
                           merkt sich jede abgefragte Theme-ID; JEDE mutation → AssertionError (und in .schreibversuche)
  ersetzt((ziel, name, wert), …)  setzt Attribute (Modul/Objekt oder globals()-dict) und stellt sie danach zurück
  ohne_netz()              zweite Sicherung: Socket, urlopen und main_theme.gid() brechen ab — ein vergessener Ersatz erreicht
                           den Shop nicht, er fällt im Test auf
  reiz(skript)             das Reizwort des Aufsehers für «automation/<skript> --pruefen», aus fixer_keepalive.sh gelesen
  aufseher(zeile, reiz)    REPARATUR / MELDEN / STILL — wie das dortige case auf «tail -1»
  lauf(fn, …)              (rc, letzte Zeile, ganze Ausgabe) wie der Aufseher sie sieht (SystemExit-Text = letzte Zeile)
"""
import contextlib, io, os, re, socket, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
AUFSEHER = os.path.join(HIER, "fixer_keepalive.sh")


class Attrappe:
    def __init__(self, dateien, role="MAIN", produkte=()):
        self.dateien, self.role, self.produkte = dict(dateien), role, list(produkte)
        self.themes, self.schreibversuche, self.abfragen = [], [], 0

    def gql(self, q, v=None, **_):
        self.abfragen += 1
        v = v or {}
        if "mutation" in q:
            self.schreibversuche.append((q[:80], v))
            raise AssertionError("SCHREIBVERSUCH im Selbsttest")
        if "theme(id:" in q:
            self.themes.append(v.get("id"))
            namen = v.get("f") or re.findall(r'filenames:\["([^"]+)"\]', q)
            knoten = [{"filename": n, "body": {"content": self.dateien[n]}} for n in namen if n in self.dateien]
            return {"theme": {"role": self.role, "files": {"nodes": knoten}}}
        if "products(" in q and "tag:profil-ch-lager" in q:
            return {"products": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": self.produkte}}
        raise AssertionError(f"unerwartete Abfrage im Selbsttest: {q[:60]}")


@contextlib.contextmanager
def ersetzt(*paare):
    alt = []
    try:
        for ziel, name, wert in paare:
            if isinstance(ziel, dict):
                alt.append((ziel, name, ziel[name])); ziel[name] = wert
            else:
                alt.append((ziel, name, getattr(ziel, name))); setattr(ziel, name, wert)
        yield
    finally:
        for ziel, name, wert in reversed(alt):
            if isinstance(ziel, dict):
                ziel[name] = wert
            else:
                setattr(ziel, name, wert)


@contextlib.contextmanager
def ohne_netz():
    import main_theme

    def netz(*a, **k):
        raise ConnectionRefusedError("Netz im Selbsttest gesperrt")

    def kein_gid(*a, **k):
        raise AssertionError("main_theme.gid() im Selbsttest (live_theme nicht ersetzt)")
    with ersetzt((socket.socket, "connect", netz), (socket, "create_connection", netz), (urllib.request, "urlopen", netz),
                 (main_theme, "gid", kein_gid)):
        yield


def reiz(skript, aufseher=AUFSEHER):
    """Reizwort der Reparatur-Zeile im Aufseher (z. B. «Hinweis fehlt»); None, wenn der Aufruf «--pruefen … | tail -1» oder
    die case-Zeile mit SCHARF=1 dahinter fehlt."""
    try:
        z = open(aufseher, encoding="utf-8").read().splitlines()
    except OSError:
        return None
    for i, s in enumerate(z):
        if f"automation/{skript} --pruefen" in s and "=$(" in s:
            if "| tail -1)" not in s:
                return None
            for t in z[i + 1:i + 6]:
                m = re.match(r'\s*\*"([^"]+)"\*\)', t)
                if m and m.group(1) != "⚠️" and "SCHARF=1" in t:
                    return m.group(1)
            return None
    return None


def aufseher(zeile, reizwort):
    if reizwort and reizwort in zeile:
        return "REPARATUR"
    return "MELDEN" if "⚠️" in zeile else "STILL"


def lauf(fn, *a, **k):
    buf = io.StringIO()
    rc, rest = None, None
    try:
        with contextlib.redirect_stdout(buf):
            rc = fn(*a, **k)
    except SystemExit as e:
        rc, rest = (e.code, None) if isinstance(e.code, int) or e.code is None else (1, str(e.code))
    except Exception as e:  # noqa: BLE001 — im Test sichtbar machen statt abstürzen
        rc, rest = f"{type(e).__name__}: {e}", f"{type(e).__name__}: {e}"
    aus = buf.getvalue().strip().splitlines() + ([rest] if rest else [])
    return rc, (aus[-1] if aus else ""), "\n".join(aus)


def selbsttest():
    f, n = [], 0

    def pruefe(ok, was):
        nonlocal n
        n += 1
        if not ok:
            f.append(was)

    a = Attrappe({"x": "1"}, "UNPUBLISHED")
    r = a.gql('query($id:ID!,$f:[String!]){theme(id:$id){role files(filenames:$f){nodes{filename}}}}', {"id": "T", "f": ["x", "y"]})
    pruefe(r["theme"]["role"] == "UNPUBLISHED" and [k["filename"] for k in r["theme"]["files"]["nodes"]] == ["x"] and a.themes == ["T"],
           "Attrappe beantwortet theme(…) falsch")
    try:
        a.gql("mutation{x}")
        pruefe(False, "mutation nicht abgelehnt")
    except AssertionError:
        pruefe(len(a.schreibversuche) == 1, "Schreibversuch nicht gezählt")
    import main_theme
    with ohne_netz():
        try:
            socket.create_connection(("127.0.0.1", 9))
            pruefe(False, "Netz nicht gesperrt")
        except ConnectionRefusedError:
            pruefe(True, "")
        try:
            main_theme.gid()
            pruefe(False, "main_theme.gid() nicht gesperrt")
        except AssertionError:
            pruefe(True, "")
    import tempfile
    with tempfile.TemporaryDirectory() as d:   # Gegenprobe: ohne «| tail -1» bzw. ohne SCHARF=1 in der case-Zeile gibt es kein Reizwort
        for zeilen, soll in ((['  X=$(python3 automation/s.py --pruefen 2>&1 | tail -1)', '  case "$X" in', '    *"fehlt"*) ( SCHARF=1 x ) ;;'], "fehlt"),
                             (['  X=$(python3 automation/s.py --pruefen 2>&1)', '  case "$X" in', '    *"fehlt"*) ( SCHARF=1 x ) ;;'], None),
                             (['  X=$(python3 automation/s.py --pruefen 2>&1 | tail -1)', '  case "$X" in', '    *"fehlt"*) echo x ;;'], None)):
            pf = os.path.join(d, "a.sh")
            open(pf, "w", encoding="utf-8").write("\n".join(zeilen) + "\n")
            pruefe(reiz("s.py", pf) == soll, f"reiz() an Probe {zeilen[0][-20:]} / {zeilen[2][-14:]}: {reiz('s.py', pf)!r} ≠ {soll!r}")
    for skript, soll in (("warenkorb_gratisversand.py", "Hinweis fehlt"), ("warenkorb_einig.py", "Marke fehlt"),
                         ("google_org_richtlinien.py", "Markup fehlt")):
        pruefe(reiz(skript) == soll, f"reiz {skript} = {reiz(skript)!r} ≠ {soll!r}")
    pruefe(aufseher("⚠️ X: Hinweis fehlt", "Hinweis fehlt") == "REPARATUR" and aufseher("⚠️ X", "Hinweis fehlt") == "MELDEN"
           and aufseher("X ✓", "Hinweis fehlt") == "STILL", "aufseher() ≠ case im Aufseher")

    def stopp():
        raise SystemExit("Theme nicht MAIN")
    pruefe(lauf(stopp)[:2] == (1, "Theme nicht MAIN"), "lauf(): SystemExit-Text nicht letzte Zeile")
    print(f"SELBSTTEST theme_attrappe: {'OK' if not f else 'FEHLER'} ({n - len(f)}/{n})" + ("" if not f else " — " + " · ".join(f)))
    return 1 if f else 0


if __name__ == "__main__":
    import sys
    sys.exit(selbsttest())
