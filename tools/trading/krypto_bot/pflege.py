#!/usr/bin/env python3
"""Pflege ohne Klick: neue Programmversion holen (nur Spielgeld) und sich selbst prüfen und reparieren.

  py tools/trading/krypto_bot/pflege.py --still                  # nach dem Tageslauf (krypto-auto.bat): erst Update, dann Selbstheilung
  py tools/trading/krypto_bot/pflege.py --nur-update --still     # beim Start des Cockpits (cockpit.bat): nur das Update

Sendet NIE Aufträge. Der Rückgabewert ist immer 0: die Pflege darf den Tageslauf nie scheitern lassen.
Ergebnis: data/krypto-pflege.json (das Cockpit zeigt es in der Ampel). Bei Problemen zusätzlich aufs Handy (Telegram/ntfy, falls
eingerichtet), dieselbe Meldung höchstens einmal in 20 Stunden.

Die Selbstheilung läuft als eigener Prozess aus dem gerade installierten cockpit.py (`cockpit.py --heilen`): nach einem Update heilt
also schon die neue Version.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import autoupdate as AU  # noqa: E402

DATEI = "krypto-pflege.json"
MELDE_PAUSE_STUNDEN = 20
HEILEN_ZEIT = 900


def _heilen_prozess(wurzel, zeit=HEILEN_ZEIT):
    """`cockpit.py --heilen` aus der Installation. → (ok, Ausgabe)."""
    cockpit = Path(wurzel) / "tools" / "trading" / "krypto_bot" / "cockpit.py"
    if not cockpit.is_file():
        return False, "cockpit.py fehlt"
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    try:
        r = subprocess.run([sys.executable, str(cockpit), "--heilen"], cwd=str(wurzel), env=env, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=zeit)
    except subprocess.TimeoutExpired:
        return False, f"die Selbstheilung dauerte länger als {zeit} Sekunden"
    return r.returncode == 0, ((r.stdout or "") + ("\n" + r.stderr if (r.stderr or "").strip() else "")).strip()


def _push(text):
    import signale as SG
    SG.push(text)


def lesen(wurzel=None):
    try:
        d = json.loads((Path(wurzel or AU.ROOT) / "data" / DATEI).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return d if isinstance(d, dict) else {}


def _schreiben(wurzel, d):
    AU._bytes_atomar(Path(wurzel) / "data" / DATEI, (json.dumps(d, ensure_ascii=False, indent=1) + "\n").encode("utf-8"))


def pflege(nur_update=False, ohne_update=False, wurzel=None, update=None, heilen=None, push=None, jetzt=None, fortschritt=None):
    """Update, dann Selbstheilung. → Ergebnis als Dict (steht auch in data/krypto-pflege.json). Wirft nie."""
    wurzel = Path(wurzel or AU.ROOT)
    jetzt = jetzt or datetime.now(timezone.utc)
    iso = jetzt.strftime("%Y-%m-%dT%H:%M:%SZ")
    update, heilen, push = update or AU.einspielen, heilen or _heilen_prozess, push or _push
    alt = lesen(wurzel)
    erg = {"zeit": iso, "update": None, "heilung": None, "gemeldet": dict(alt.get("gemeldet") or {})}
    probleme = []
    if not ohne_update:
        try:
            u = update(wurzel=wurzel, fortschritt=fortschritt)
            erg["update"] = {"ergebnis": u["ergebnis"], "text": u["text"][:500], "ok": bool(u["ok"])}
        except Exception as ex:  # noqa: BLE001
            erg["update"] = {"ergebnis": "fehler", "text": f"{type(ex).__name__}: {str(ex)[:200]}", "ok": False}
        if not erg["update"]["ok"]:
            probleme.append("Update: " + erg["update"]["text"][:300])
    if not nur_update:
        try:
            ok, text = heilen(wurzel)
        except Exception as ex:  # noqa: BLE001
            ok, text = False, f"{type(ex).__name__}: {str(ex)[:200]}"
        erg["heilung"] = {"ok": bool(ok), "text": text[-1500:]}
        if not ok:
            letzte = next((x.strip() for x in reversed(text.splitlines()) if x.strip()), "keine Ausgabe")
            probleme.append("Selbstheilung: " + letzte[:300])
    # Meldung aufs Handy: nur Probleme, dieselbe höchstens alle MELDE_PAUSE_STUNDEN
    if probleme:
        text = "⚠️ Krypto-PC braucht einen Blick: " + " | ".join(probleme) + "\nDetails: Cockpit, Block Gesundheit. Keine Anlageberatung."
        marke = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
        try:
            zuletzt = datetime.strptime(erg["gemeldet"].get(marke, ""), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        except ValueError:
            zuletzt = None
        if zuletzt is None or jetzt - zuletzt >= timedelta(hours=MELDE_PAUSE_STUNDEN):
            try:
                push(text)
                erg["gemeldet"] = dict(list(erg["gemeldet"].items())[-9:])
                erg["gemeldet"][marke] = iso
            except Exception:  # noqa: BLE001 — kein Handy-Kanal eingerichtet o. ä.: das Cockpit zeigt es ohnehin
                pass
    try:
        _schreiben(wurzel, erg)
    except OSError:
        pass
    erg["probleme"] = probleme
    return erg


def zeile(erg):
    teile = []
    if erg.get("update"):
        teile.append("Update: " + erg["update"]["text"].splitlines()[0][:160])
    if erg.get("heilung"):
        teile.append("Selbstprüfung: " + ("ok" if erg["heilung"]["ok"] else "Probleme"))
    return "Pflege: " + " · ".join(teile) if teile else "Pflege: nichts zu tun"


def ampel(wurzel=None, jetzt=None):
    """(ok, Text, warnung) für die Gesundheits-Ampel: lief die automatische Pflege in den letzten 48 Stunden, und war die Selbstprüfung grün?"""
    jetzt = jetzt or datetime.now(timezone.utc)
    d = lesen(wurzel)
    try:
        alter = jetzt - datetime.strptime(d["zeit"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (KeyError, ValueError):
        return None, "noch nicht gelaufen — kommt nach dem nächsten Tageslauf (oder Knopf «Alles prüfen & reparieren»)", False
    wann = d["zeit"][:16].replace("T", " ") + " UTC"
    h = d.get("heilung")
    if h and not h.get("ok"):
        letzte = next((x.strip() for x in reversed(str(h.get("text", "")).splitlines()) if x.strip()), "")
        return False, f"{wann}: die Selbstprüfung fand etwas, das sie nicht allein beheben kann — {letzte[:200]}", False
    if alter > timedelta(hours=48):
        return None, f"zuletzt {wann} — seit über 2 Tagen keine automatische Pflege (läuft der Tageslauf, ist der PC an?)", True
    return True, f"{wann}: " + (zeile(d)[len("Pflege: "):] or "nichts zu tun"), False


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nur-update", action="store_true", help="nur das Update, keine Selbstheilung")
    ap.add_argument("--ohne-update", action="store_true", help="nur die Selbstheilung")
    ap.add_argument("--still", action="store_true", help="nur ausgeben, wenn etwas zu berichten ist")
    a = ap.parse_args(argv)
    try:
        erg = pflege(nur_update=a.nur_update, ohne_update=a.ohne_update, fortschritt=print)
        ruhig = (not erg["probleme"]) and (erg.get("update") or {}).get("ergebnis") in (None, "aktuell", "uebersprungen", "offline", "aus", "besetzt")
        if not (a.still and ruhig and a.nur_update):
            print(zeile(erg))
        for p in erg["probleme"]:
            print("  ⚠ " + p)
    except Exception as ex:  # noqa: BLE001 — die Pflege darf den Tageslauf nie scheitern lassen
        print(f"Pflege: unerwarteter Fehler {type(ex).__name__}: {ex}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
