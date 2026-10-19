#!/usr/bin/env python3
"""bulk_laden.py — Shopify-Bulk-Export atomar nach `ziel` laden (19.10.2026, Prüfung PL-5).

WARUM: sechs Skripte luden den Export mit `curl -o ZIEL` direkt auf den Endpfad. Bricht curl ab (Platte voll, Netz, Container-Neustart), bleibt eine halbe Datei
mit FRISCHEM mtime liegen; elf Bulk-Verbraucher prüfen nur das Alter (versprechen_wache: bis 48 h gültig). Ein Schnitt mitten in der Zeile wirft beim Lesen, ein glatter
Schnitt an einer Zeilengrenze lieferte still eine zu kurze Liste. Vorfall gleicher Klasse: 06.10. «No space left», /tmp/export.jsonl fehlte für sechs Wächter.

REGEL: laden nach ZIEL.teil → prüfen → erst dann os.replace (atomar).
  (a) curl-Rückgabecode 0, (b) Datei nicht leer und letzte Zeile ist vollständiges JSON, (c) Grösse ≥ 80 % der Vorrunde (eine Vorrunde gibt es nur, wenn ZIEL schon existiert),
  (d) vorher Platz: frei ≥ 1,5 GiB + Grösse der Vorrunde. Bei Fehler: ZIEL.teil weg, ZIEL bleibt unberührt (die Vorrunde gilt weiter), Rückgabe False und eine klare Zeile.

    from bulk_laden import bulk_laden
    if not bulk_laden(url, ziel): sys.exit(3)

    python3 automation/bulk_laden.py --selbsttest
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

MIN_FREI = int(os.environ.get("BULK_MIN_FREI", str(1536 * 1024 * 1024)))   # 1,5 GiB
MIN_ANTEIL = float(os.environ.get("BULK_MIN_ANTEIL", "0.8"))


def _letzte_zeile_ok(pfad):
    """Letzte nicht leere Zeile ist vollständiges JSON (liest nur das Dateiende)."""
    try:
        gr = os.path.getsize(pfad)
        if gr == 0:
            return False
        with open(pfad, "rb") as f:
            f.seek(max(0, gr - 262144))
            rest = f.read().splitlines()
        zeilen = [z for z in rest if z.strip()]
        if not zeilen:
            return False
        # fing der Lesepuffer mitten in der Datei an, ist die erste Zeile abgeschnitten — wir brauchen nur die LETZTE
        json.loads(zeilen[-1])
        return True
    except (OSError, ValueError):
        return False


def bulk_laden(url, ziel, curl_args=None, frei_pfad=None, laden=None, gueltig=None):
    """→ True, wenn ZIEL jetzt eine vollständige, plausible Datei ist. `laden(url, teil)` ersetzt curl (Selbsttest).
    `gueltig(pfad) -> bool` (optional): Formatprüfung. Eine UNGÜLTIGE Vorrunde zählt für die 80-%-Regel nicht (Prüfung wf_659d6d94 BULK-1: die Format-Heilung
    von /tmp/export.jsonl wäre sonst an einer grossen fremden Kopie gescheitert); der neue Export muss die Prüfung selbst bestehen."""
    teil = ziel + ".teil"
    vorrunde = os.path.getsize(ziel) if os.path.exists(ziel) else 0
    if vorrunde and gueltig is not None:
        try:
            if not gueltig(ziel):
                vorrunde = 0
        except Exception:
            vorrunde = 0
    try:
        frei = shutil.disk_usage(frei_pfad or os.path.dirname(os.path.abspath(ziel)) or ".").free
    except OSError:
        frei = None
    if frei is not None and frei < MIN_FREI + vorrunde:
        print(f"⛔ bulk_laden: zu wenig Platz ({frei // 1048576} MiB frei, nötig {(MIN_FREI + vorrunde) // 1048576} MiB) — {os.path.basename(ziel)} bleibt wie es ist "
              f"(Ausweg: Platz schaffen oder BULK_MIN_FREI=<Bytes> senken)", flush=True)
        return False
    try:
        os.remove(teil)
    except OSError:
        pass
    try:
        if laden:
            laden(url, teil)
        else:
            subprocess.run(["curl", "-sS", "--fail", "--max-time", "900", *(curl_args or []), "-o", teil, url], check=True)
    except (subprocess.CalledProcessError, OSError) as e:
        rc = getattr(e, "returncode", None)
        print(f"⛔ bulk_laden: Download fehlgeschlagen (curl Exit {rc if rc is not None else '?'}: {str(e)[:90]}) — {os.path.basename(ziel)} bleibt wie es ist", flush=True)
        _weg(teil)
        return False
    if not os.path.exists(teil) or not _letzte_zeile_ok(teil):
        print(f"⛔ bulk_laden: {os.path.basename(teil)} unvollständig (leer oder letzte Zeile kein JSON) — verworfen", flush=True)
        _weg(teil)
        return False
    if gueltig is not None:
        try:
            ok_fmt = bool(gueltig(teil))
        except Exception:
            ok_fmt = False
        if not ok_fmt:
            print(f"⛔ bulk_laden: {os.path.basename(teil)} hat nicht das erwartete Format — verworfen", flush=True)
            _weg(teil)
            return False
    neu = os.path.getsize(teil)
    if vorrunde and neu < vorrunde * MIN_ANTEIL:
        print(f"⛔ bulk_laden: neuer Export {neu // 1024} KiB < {int(MIN_ANTEIL * 100)} % der Vorrunde ({vorrunde // 1024} KiB) — verworfen, Vorrunde bleibt "
              f"(Ausweg bei echtem Schrumpfen: BULK_MIN_ANTEIL=0 setzen oder {os.path.basename(ziel)} löschen)", flush=True)
        _weg(teil)
        return False
    os.replace(teil, ziel)
    return True


def _weg(pfad):
    try:
        os.remove(pfad)
    except OSError:
        pass


def selbsttest():
    fehler = []
    d = tempfile.mkdtemp()
    try:
        def pr(name, bed):
            if not bed:
                fehler.append(name)

        def schreib(inhalt):
            def f(url, teil):
                with open(teil, "w", encoding="utf-8") as o:
                    o.write(inhalt)
            return f
        gut = "".join(json.dumps({"id": i, "t": "x" * 50}) + "\n" for i in range(100))
        z = os.path.join(d, "e.jsonl")
        pr("erster Export (keine Vorrunde) wird übernommen", bulk_laden("u", z, laden=schreib(gut)) and os.path.getsize(z) == len(gut) and not os.path.exists(z + ".teil"))
        pr("zweiter, gleich grosser Export ersetzt atomar", bulk_laden("u", z, laden=schreib(gut + json.dumps({"id": 999}) + "\n")))
        halb = gut[: len(gut) // 2 + 7]
        pr("mitten in der Zeile abgeschnitten → verworfen", not bulk_laden("u", z, laden=schreib(halb)) and not os.path.exists(z + ".teil"))
        pr("Vorrunde nach Verwerfen unberührt", os.path.getsize(z) > len(gut))
        glatt = "".join(json.dumps({"id": i, "t": "x" * 50}) + "\n" for i in range(30))
        pr("glatter Schnitt an Zeilengrenze (30 %) → verworfen", not bulk_laden("u", z, laden=schreib(glatt)))
        pr("leere Datei → verworfen", not bulk_laden("u", z, laden=schreib("")))

        def kaputt(url, teil):
            open(teil, "w").write("{")
            raise subprocess.CalledProcessError(23, "curl")
        pr("curl-Fehler → verworfen, Vorrunde bleibt", not bulk_laden("u", z, laden=kaputt) and os.path.getsize(z) > len(gut))
        os.environ["BULK_MIN_FREI"] = str(10 ** 15)
        import importlib
        sys.modules[__name__].MIN_FREI = 10 ** 15
        pr("zu wenig Platz → nichts geladen", not bulk_laden("u", z, laden=schreib(gut)))
        sys.modules[__name__].MIN_FREI = 0
        # BULK-1: ungültige (fremdformatige) grosse Vorrunde darf die Heilung nicht blockieren
        fremd = "".join(json.dumps({"id": i, "x": "y" * 400}) + "\n" for i in range(400))
        z2 = os.path.join(d, "f.jsonl")
        open(z2, "w").write(fremd)
        schlank = "".join(json.dumps({"id": i, "status": "ACTIVE"}) + "\n" for i in range(100))
        fmt = lambda pfad: all("status" in json.loads(z_) for z_ in open(pfad).read().splitlines() if z_.strip())
        pr("grosse Fremdformat-Vorrunde blockiert die Heilung nicht", bulk_laden("u", z2, laden=schreib(schlank), gueltig=fmt) and os.path.getsize(z2) == len(schlank))
        pr("falsches Format des neuen Exports wird verworfen", not bulk_laden("u", z2, laden=schreib(fremd), gueltig=fmt) and os.path.getsize(z2) == len(schlank))
    finally:
        shutil.rmtree(d, ignore_errors=True)
    print(f"bulk_laden Selbsttest: {10 - len(fehler)}/10")
    for f in fehler:
        print("  FAIL", f)
    return not fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    print(__doc__)
