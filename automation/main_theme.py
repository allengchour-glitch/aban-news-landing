#!/usr/bin/env python3
"""main_theme.py — die ID des LIVE-Themes (role MAIN), statt einer festen Zahl im Skript.

WARUM (26.11.2026): Am 21.11. wurde «LuxeStyle – Startseite 21.11.2026» (214565814663) veröffentlicht. 13 wiederkehrende
Wächter/Schreiber trugen fest 187533001089 → seither lasen sie ein unveröffentlichtes Theme (blind, «Theme nicht MAIN»)
und die tägliche Startseiten-Rotation schrieb ins falsche Theme. Jedes Skript, das das Live-Theme meint, holt die ID hier.

  from main_theme import gid        # 'gid://shopify/OnlineStoreTheme/<id>' des MAIN-Themes
  gid()           → live abgefragt, 10 Min. in /tmp/main_theme_gid.txt zwischengespeichert
  gid(frisch=True)→ ohne Zwischenspeicher
Schlägt die Abfrage fehl und gibt es keinen frischen Zwischenspeicher, wirft gid() RuntimeError (fail-closed: lieber
gar nicht schreiben als ins falsche Theme).
  python3 automation/main_theme.py            # druckt die GID
  python3 automation/main_theme.py --selbsttest
"""
import os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
CACHE = "/tmp/main_theme_gid.txt"
MAX_ALTER = 600
PRAEFIX = "gid://shopify/OnlineStoreTheme/"


def _aus_cache(max_alter=MAX_ALTER):
    try:
        if time.time() - os.path.getmtime(CACHE) <= max_alter:
            g = open(CACHE).read().strip()
            return g if g.startswith(PRAEFIX) else None
    except OSError:
        pass
    return None


def waehle(themes):
    """Reine Funktion: Liste {id, role} → GID des einzigen MAIN-Themes (sonst RuntimeError)."""
    main = [t["id"] for t in themes if (t.get("role") or "").upper() == "MAIN"]
    if len(main) != 1 or not str(main[0]).startswith(PRAEFIX):
        raise RuntimeError(f"kein eindeutiges MAIN-Theme ({len(main)})")
    return main[0]


def gid(frisch=False):
    if not frisch:
        g = _aus_cache()
        if g:
            return g
    sys.path.insert(0, HIER)
    from seo_autopilot import gql  # gemeinsamer Admin-Zugang (Token /tmp/cj_shop_token.txt)
    letzter = None
    for versuch in range(3):
        try:
            g = waehle(gql("{themes(first:50,roles:[MAIN]){nodes{id role}}}")["themes"]["nodes"])
            try:
                with open(CACHE + ".tmp", "w") as f:
                    f.write(g)
                os.replace(CACHE + ".tmp", CACHE)
            except OSError:
                pass
            return g
        except Exception as e:  # noqa: BLE001 — Netz/Token: wiederholen, dann fail-closed
            letzter = e
            time.sleep(2 * (versuch + 1))
    raise RuntimeError(f"MAIN-Theme nicht ermittelbar: {letzter}")


def zahl(frisch=False):
    return gid(frisch).rsplit("/", 1)[1]


# 26.11.2026: Prüfgerät für «der Import eines Moduls fragt NICHTS ab» (weder gid() noch Netz). Läuft in einem frischen Prozess, in dem
# gid(), urllib.request.urlopen und Socket-Verbindungen eine Ausnahme werfen; danach wird das Modul importiert.
_PROBE = r"""
import os, socket, sys, urllib.request
for _p in reversed(sys.argv[1].split(os.pathsep)):
    sys.path.insert(0, _p)
import main_theme
def _boom(*a, **k):
    raise SystemExit("ABFRAGE BEIM IMPORT: " + (str(a[0])[:80] if a else ""))
main_theme.gid = _boom
urllib.request.urlopen = _boom
socket.create_connection = _boom
socket.socket.connect = _boom
import importlib
for m in sys.argv[2:]:
    importlib.import_module(m)
print("IMPORT-OHNE-NETZ OK")
"""


def import_ohne_netz(*module, pfad=HIER):
    """(ok, Meldung): importiert die Module in einem frischen Prozess, in dem jede gid()-/Netz-Abfrage abbricht."""
    import subprocess
    r = subprocess.run([sys.executable, "-c", _PROBE, pfad, *module], capture_output=True, text=True, timeout=60)
    aus = (r.stdout + r.stderr).strip().splitlines()
    return (r.returncode == 0 and "IMPORT-OHNE-NETZ OK" in r.stdout), (aus[-1] if aus else f"rc {r.returncode}")


def selbsttest():
    f = []
    ok, m = import_ohne_netz("main_theme")
    if not ok:
        f.append(f"main_theme selbst fragt beim Import ab: {m}")
    import tempfile
    with tempfile.TemporaryDirectory() as d:   # Gegenprobe: ein Modul, das beim Import gid() ruft, MUSS auffallen
        with open(os.path.join(d, "_probe_gid_beim_import.py"), "w") as fh:
            fh.write("from main_theme import gid\nTHEME = gid()\n")
        ok, m = import_ohne_netz("_probe_gid_beim_import", pfad=d + os.pathsep + HIER)
        if ok:
            f.append("Gegenprobe gid() beim Import nicht erkannt")
    if waehle([{"id": PRAEFIX + "1", "role": "UNPUBLISHED"}, {"id": PRAEFIX + "2", "role": "MAIN"}]) != PRAEFIX + "2":
        f.append("MAIN gewählt")
    for falsch in ([], [{"id": PRAEFIX + "1", "role": "UNPUBLISHED"}], [{"id": PRAEFIX + "1", "role": "MAIN"}, {"id": PRAEFIX + "2", "role": "MAIN"}],
                   [{"id": "123", "role": "MAIN"}]):
        try:
            waehle(falsch); f.append(f"kein Fehler bei {falsch}")
        except RuntimeError:
            pass
    print("SELBSTTEST main_theme:", "OK (7/7: Wahl MAIN, 4 Fehlfälle, Import ohne Abfrage, Gegenprobe)" if not f else "FEHLER " + "; ".join(f))
    return 1 if f else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    print(gid(frisch=True))
