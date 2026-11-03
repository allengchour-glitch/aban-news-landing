#!/usr/bin/env python3
"""Selbst-Update des Krypto-Programms auf dem PC: ohne Git, ohne Klick, NUR mit Spielgeld.

  py tools/trading/krypto_bot/autoupdate.py            # nach einer neuen Version schauen (höchstens 1x je Tag) und sie einspielen
  py tools/trading/krypto_bot/autoupdate.py --jetzt    # sofort schauen (die Tagesgrenze zählt nicht)
  py tools/trading/krypto_bot/autoupdate.py --hand     # wie der Knopf «Update holen»: gilt auch bei ausgeschaltetem Auto-Update und mit echtem Geld
  py tools/trading/krypto_bot/autoupdate.py --status   # nur anzeigen

Woher: das GitHub-Release «krypto-latest». Es entsteht in .github/workflows/krypto-paket.yml aus `main`, aber erst NACHDEM dort alle
Selbsttests grün waren und das fertige Paket entpackt seinen eigenen Selbsttest bestanden hat (tools/trading/paket_bauen.py).

Was ersetzt wird: nur Programmdateien unter tools/trading/ (nicht daten/, nicht die Not-Aus-Dateien STOP und PAUSE). Alles unter data/
(Logbücher, Buch von Pilot 2.0, Einstellungen) bleibt unberührt; die Schlüssel liegen ohnehin in der Windows-Umgebung. Dateien, die es
nur bei dir gibt, werden nie gelöscht: gelöscht wird nur, was die vorherige Paketversion selbst mitgebracht hat.

Ablauf, jeder Schritt bricht bei einem Fehler SAUBER ab und lässt die laufende Version stehen:
  1. Sperren prüfen: Schalter «aus», echtes Geld im Spiel, Tagesgrenze, zwei Fehlversuche mit derselben Version.
  2. Paketbeschreibung (paket.json) und Stopp-Datei im Repo holen. Eine Stopp-Datei hält alle PCs an (Not-Aus aus der Cloud).
  3. Paket laden, Prüfsumme prüfen, jeden Pfad prüfen (kein «..», nichts ausserhalb von tools/trading, keine Verknüpfungen, nur bekannte
     Dateiarten), jede .py-Datei auf Syntax prüfen.
  4. PROBELAUF IN EINER KOPIE: die neue Version bestehen ihre Selbsttests in einem Duplikat von tools/trading und data. Die echte
     Installation ist bis hierher unberührt. (Der lange test_pilot2_streng läuft beim nächsten Tageslauf, wie immer.)
  5. Erst jetzt, unter der Lauf-Sperre des Piloten: alte Dateien sichern (data/krypto-update-backup), neue schreiben, zurücklesen.
     Scheitert etwas, kommt alles aus der Sicherung zurück. Ein Absturz mitten im Tausch wird beim nächsten Start geheilt.

Nur Standardbibliothek, absichtlich allein stehend: es muss auch eine halb kaputte Installation reparieren können.
Rückgabewert immer 0: ein Update darf den Tageslauf nie scheitern lassen.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]          # der Ordner mit tools/ und data/

REPO = "allengchour-glitch/aban-news-landing"
BASIS = f"https://github.com/{REPO}/releases/download/krypto-latest"
MANIFEST_URL = f"{BASIS}/paket.json"
STOPP_URL = f"https://raw.githubusercontent.com/{REPO}/main/docs/KRYPTO-UPDATE-STOPP.txt"

STATUS_DATEI = "krypto-update.json"   # in data/: letztes Ergebnis, Verlauf, Fehlversuche
AUS_DATEI = "krypto-update-aus.txt"   # in data/: gibt es sie, sucht der automatische Lauf nicht nach Updates
SICHERUNG = "krypto-update-backup"    # in data/: die letzten drei Sicherungen
ARBEIT = "krypto-update-tmp"          # in data/: Probelauf-Kopie (wird aufgeräumt)

PRAEFIX = "tools/trading/"
VERSION_REL = PRAEFIX + "VERSION.json"
LISTE_REL = PRAEFIX + "PAKET-DATEIEN.json"
ERLAUBTE_ENDUNGEN = {".py", ".html", ".md", ".json", ".bat", ".vbs", ".txt", ".js", ".css", ".csv"}
SKRIPT_ENDUNGEN = {".bat", ".vbs"}     # werden beim Tausch ZULETZT geschrieben (cmd liest sie zeilenweise während des Laufs)
GESCHUETZT = (PRAEFIX + "ki_bot/STOP", PRAEFIX + "ki_bot/PAUSE", PRAEFIX + "daten/")   # Not-Aus-Dateien und Kurs-Zwischenspeicher: nie anfassen
PFLICHT = ("krypto_bot/autoupdate.py", "krypto_bot/pflege.py", "krypto_bot/cockpit.py", "krypto_bot/pilot.py", "krypto_bot/sperre.py",
           "krypto_bot/krypto-auto.bat", "krypto_bot/cockpit.bat")
# Die Selbsttests aus krypto-auto.bat ohne den sehr langen test_pilot2_streng (ca. 6 Minuten; läuft beim nächsten Tageslauf)
SCHNELLTESTS = ("test_pilot.py", "test_sammler.py", "test_infos.py", "test_cockpit.py", "test_profit.py", "test_calls.py",
                "test_pilot2_plan.py", "test_pilot2_live.py", "test_testnetz_pruefung.py", "test_news_waechter.py")

MAX_ZIP = 25_000_000
MAX_ENTPACKT = 120_000_000
MAX_DATEI = 30_000_000
MAX_DATEIEN = 3000
TAGESGRENZE_STUNDEN = 20      # so selten schaut der automatische Lauf nach (der Tageslauf kommt ohnehin nur einmal)
FEHLVERSUCHE_MAX = 2          # so oft darf dieselbe Version scheitern, dann wird sie ausgesetzt ...
PAUSE_TAGE = 3                # ... und nach so vielen Tagen nochmals versucht (oder sofort, wenn eine neuere kommt)
SICHERUNGEN_BEHALTEN = 3

_ZEIT = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")
_FALSCH = ("false", "0", "nein", "no", "off")


class Besetzt(RuntimeError):
    """Ein Pilot-Lauf hält die Lauf-Sperre."""


# ───────────────────────── Umgebung und Sperren ─────────────────────────
# (Kopie von cockpit.umgebung: dieses Modul steht absichtlich allein; ein Test hält beide gleich.)
UMGEBUNG_PRAEFIXE = ("BINANCE_", "KI_BOT_", "KRYPTO_", "CALLS_", "TELEGRAM_", "ANTHROPIC_", "ETH_", "ALPACA_", "PILOT2_")


def _registry_lesen():
    """Windows: die Benutzer-Variablen, wie setx sie gerade gespeichert hat (HKCU\\Environment)."""
    import winreg
    out = {}
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
        i = 0
        while True:
            try:
                name, wert, _ = winreg.EnumValue(k, i)
            except OSError:
                break
            out[name] = str(wert)
            i += 1
    return out


def umgebung(basis=None, lesen=None):
    env = dict(os.environ if basis is None else basis)
    if lesen is None:
        if os.name != "nt":
            return env
        lesen = _registry_lesen
    try:
        werte = lesen() or {}
    except OSError:
        return env
    for name, wert in werte.items():
        if name.upper().startswith(UMGEBUNG_PRAEFIXE):
            if wert:
                env[name.upper()] = wert
            else:
                env.pop(name.upper(), None)  # setx NAME "" = entfernt
    return env


def echtgeld_grund(env):
    """Warum unbeaufsichtigte Updates NICHT laufen dürfen (echtes Geld könnte im Spiel sein). Leer = alles Spielgeld."""
    for name, was in (("BINANCE_FUTURES_TESTNET", "Futures"), ("BINANCE_TESTNET", "Spot")):
        if (env.get(name) or "true").strip().lower() in _FALSCH:
            return f"das {was}-Konto ist nicht im Testnetz ({name})"
    if (env.get("KI_BOT_ECHTGELD") or "").strip():
        return "die Echtgeld-Freigabe ist gesetzt (KI_BOT_ECHTGELD)"
    return ""


def auto_aus_grund(env, wurzel=None):
    """Grund, warum der AUTOMATISCHE Lauf nicht nach Updates sucht. Leer = er darf. (Der Knopf «Update holen» darf immer.)"""
    if (env.get("KRYPTO_AUTOUPDATE") or "").strip().lower() in ("aus", "0", "nein", "no", "off", "false"):
        return "ausgeschaltet (KRYPTO_AUTOUPDATE=aus)"
    if (Path(wurzel or ROOT) / "data" / AUS_DATEI).exists():
        return f"ausgeschaltet (Datei data\\{AUS_DATEI})"
    g = echtgeld_grund(env)
    if g:
        return f"aus, weil echtes Geld im Spiel sein könnte: {g}. Updates dann nur von Hand (Knopf «Update holen»)"
    return ""


@contextmanager
def _lauf_sperre(ordner=None):
    """Dieselbe Sperre wie der Pilot-Lauf (data/krypto-lauf.lock): während des Tausches handelt kein Lauf."""
    try:
        import sperre as S
    except Exception:  # noqa: BLE001 — ohne das Modul gibt es nichts abzustimmen
        yield
        return
    try:
        with S.lauf_sperre("krypto-lauf", warten=0.0, ordner=ordner or ROOT / "data"):
            yield
    except S.Besetzt as ex:
        raise Besetzt(str(ex)) from None


# ───────────────────────── Netz ─────────────────────────
def _holen(url, timeout=20, max_bytes=MAX_ZIP):
    """→ (HTTP-Statuscode, Bytes). Kein Netz, Zeitüberschreitung oder zu grosse Antwort: (None, b'')."""
    req = urllib.request.Request(url, headers={"User-Agent": "krypto-autoupdate/1"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            daten = r.read(max_bytes + 1)
            if len(daten) > max_bytes:
                return None, b""
            return r.status, daten
    except urllib.error.HTTPError as ex:
        return ex.code, b""
    except Exception:  # noqa: BLE001 — URLError, Zeitlimit, TLS: alles heisst «gerade nicht erreichbar»
        return None, b""


# ───────────────────────── Paket prüfen ─────────────────────────
def manifest_pruefen(m):
    """Die Paketbeschreibung (paket.json) streng prüfen. → bereinigtes Dict oder ValueError."""
    if not isinstance(m, dict):
        raise ValueError("keine Beschreibung")
    if m.get("format") != 1:
        raise ValueError("unbekanntes Format")
    for k, muster in (("version", r"[0-9A-Za-z._+-]{1,60}"), ("commit", r"[0-9a-f]{7,40}"), ("gebaut", _ZEIT.pattern),
                      ("datei", r"[A-Za-z0-9._-]{1,80}\.zip"), ("sha256", r"[0-9a-f]{64}")):
        w = m.get(k)
        if not isinstance(w, str) or not re.fullmatch(muster, w):
            raise ValueError(f"«{k}» fehlt oder ist ungültig")
    g = m.get("groesse")
    if not isinstance(g, int) or isinstance(g, bool) or not 1 <= g <= MAX_ZIP:
        raise ValueError("«groesse» fehlt oder ist ungültig")
    out = {k: m[k] for k in ("format", "version", "commit", "gebaut", "datei", "sha256", "groesse")}
    out["hinweis"] = " ".join(str(m.get("hinweis") or "").split())[:200]
    return out


def geschuetzt(rel):
    return any(rel == g or (g.endswith("/") and rel.startswith(g)) for g in GESCHUETZT)


def _name_ok(name):
    """Liegt der Pfad sicher UNTER tools/trading/? (Zip-Slip, Laufwerksbuchstaben, Backslashes, Steuerzeichen)"""
    if not isinstance(name, str) or not name.startswith(PRAEFIX) or "\\" in name or ":" in name:
        return False
    if any(ord(c) < 32 for c in name):
        return False
    return not any(t in ("", ".", "..") for t in name.split("/"))


def zip_lesen(daten, m):
    """Prüft das Paket vollständig und liefert {Pfad: Inhalt}. Wirft ValueError mit dem Grund. Berührt die Festplatte nicht."""
    if len(daten) != m["groesse"]:
        raise ValueError("die Grösse passt nicht zur Paketbeschreibung")
    if hashlib.sha256(daten).hexdigest() != m["sha256"]:
        raise ValueError("die Prüfsumme passt nicht (Download beschädigt oder verändert)")
    try:
        z = zipfile.ZipFile(io.BytesIO(daten))
        infos = [i for i in z.infolist() if not i.is_dir()]
    except (zipfile.BadZipFile, OSError) as ex:
        raise ValueError(f"kein gültiges ZIP ({ex})") from None
    if not infos or len(infos) > MAX_DATEIEN:
        raise ValueError(f"unplausible Dateizahl ({len(infos)})")
    neu, klein, gesamt = {}, set(), 0
    for i in infos:
        name = i.filename
        if not _name_ok(name):
            raise ValueError(f"unzulässiger Pfad im Paket: {name!r}")
        if name.lower() in klein:
            raise ValueError(f"doppelter Eintrag (Windows unterscheidet Gross und Klein nicht): {name}")
        klein.add(name.lower())
        if geschuetzt(name):
            raise ValueError(f"geschützte Datei im Paket: {name}")
        if PurePosixPath(name).suffix.lower() not in ERLAUBTE_ENDUNGEN:
            raise ValueError(f"nicht erlaubte Dateiart im Paket: {name}")
        if (i.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError(f"Verknüpfung im Paket: {name}")
        gesamt += i.file_size
        if i.file_size > MAX_DATEI or gesamt > MAX_ENTPACKT:
            raise ValueError("das Paket ist entpackt zu gross")
        try:
            inhalt = z.read(i)
        except (zipfile.BadZipFile, OSError, RuntimeError, ValueError) as ex:
            raise ValueError(f"{name} lässt sich nicht entpacken ({ex})") from None
        if len(inhalt) != i.file_size:
            raise ValueError(f"{name}: Grösse passt nicht")
        neu[name] = inhalt
    try:
        ver = json.loads(neu[VERSION_REL].decode("utf-8"))
        liste = json.loads(neu[LISTE_REL].decode("utf-8"))["dateien"]
    except (KeyError, ValueError, UnicodeDecodeError, TypeError):
        raise ValueError("VERSION.json oder PAKET-DATEIEN.json fehlt oder ist unlesbar") from None
    if not isinstance(ver, dict) or ver.get("version") != m["version"] or ver.get("commit") != m["commit"]:
        raise ValueError("VERSION.json passt nicht zur Paketbeschreibung")
    inhalt_namen = set(neu) - {VERSION_REL, LISTE_REL}
    if not isinstance(liste, dict) or set(liste) != inhalt_namen:
        raise ValueError("die Dateiliste passt nicht zum Inhalt")
    for rel, sha in liste.items():
        if hashlib.sha256(neu[rel]).hexdigest() != sha:
            raise ValueError(f"Prüfsumme der Datei {rel} stimmt nicht")
    fehlt = [p for p in PFLICHT if PRAEFIX + p not in neu]
    if fehlt:
        raise ValueError("Pflichtdateien fehlen: " + ", ".join(fehlt))
    for rel, inhalt in neu.items():
        if rel.endswith(".py"):
            try:
                compile(inhalt, rel, "exec")
            except (SyntaxError, ValueError) as ex:
                raise ValueError(f"Syntaxfehler in {rel}: {ex}") from None
    return neu


# ───────────────────────── Zustand auf der Platte ─────────────────────────
def lokale_version(wurzel=None):
    """{version, commit, gebaut} der Installation oder None (das Paket vor dem Auto-Update hat keine)."""
    try:
        d = json.loads((Path(wurzel or ROOT) / VERSION_REL).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if isinstance(d, dict) and isinstance(d.get("version"), str) and isinstance(d.get("gebaut"), str) and _ZEIT.fullmatch(d["gebaut"]):
        return {"version": d["version"], "commit": str(d.get("commit", "")), "gebaut": d["gebaut"]}
    return None


def alte_liste(wurzel=None):
    """Die Dateien, die die installierte Paketversion selbst mitgebracht hat {Pfad: Prüfsumme}. Nur was hier steht, darf ein Update löschen."""
    try:
        d = json.loads((Path(wurzel or ROOT) / LISTE_REL).read_text(encoding="utf-8"))["dateien"]
    except (OSError, ValueError, KeyError, TypeError):
        return {}
    if not isinstance(d, dict):
        return {}
    return {k: v for k, v in d.items() if isinstance(k, str) and isinstance(v, str) and _name_ok(k) and not geschuetzt(k)}


def status_lesen(wurzel=None):
    try:
        d = json.loads((Path(wurzel or ROOT) / "data" / STATUS_DATEI).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return d if isinstance(d, dict) else {}


def _bytes_atomar(ziel, daten):
    ziel = Path(ziel)
    ziel.parent.mkdir(parents=True, exist_ok=True)
    tmp = ziel.with_name(f".{ziel.name}.upd{os.getpid()}")
    try:
        tmp.write_bytes(daten)
        os.replace(tmp, ziel)
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass


def _kopieren_atomar(quelle, ziel):
    _bytes_atomar(ziel, Path(quelle).read_bytes())


def status_schreiben(wurzel, st):
    _bytes_atomar(Path(wurzel or ROOT) / "data" / STATUS_DATEI, (json.dumps(st, ensure_ascii=False, indent=1) + "\n").encode("utf-8"))


def _sha(daten):
    return hashlib.sha256(daten).hexdigest()


def plan_erstellen(wurzel, neu, alt):
    """→ (zu schreiben, zu löschen). Schreiben nur, was sich unterscheidet; löschen nur, was die ALTE Paketversion selbst mitbrachte."""
    wurzel = Path(wurzel)
    schreiben = []
    for rel in sorted(neu):
        if geschuetzt(rel):
            continue
        ziel = wurzel / rel
        try:
            gleich = ziel.is_file() and _sha(ziel.read_bytes()) == _sha(neu[rel])
        except OSError:
            gleich = False
        if not gleich:
            schreiben.append(rel)
    loeschen = [rel for rel in sorted(alt) if rel not in neu and not geschuetzt(rel) and (wurzel / rel).is_file()]
    return schreiben, loeschen


def _rang(rel):
    """Reihenfolge beim Schreiben: Programmdateien, dann Start-Skripte, ganz zuletzt die Versionsdateien (ein Abbruch davor wiederholt das Update)."""
    if rel in (VERSION_REL, LISTE_REL):
        return 2
    return 1 if PurePosixPath(rel).suffix.lower() in SKRIPT_ENDUNGEN else 0


# ───────────────────────── Tausch mit Sicherung und Rückweg ─────────────────────────
def _zurueckrollen(wurzel, sdir):
    """Stellt den Zustand vor dem Tausch aus der Sicherung wieder her. → Liste der Probleme (leer = alles zurück)."""
    sdir = Path(sdir)
    try:
        plan = json.loads((sdir / "plan.json").read_text(encoding="utf-8"))
        rels = list(plan.get("schreiben", [])) + list(plan.get("loeschen", []))
        neu_angelegt = set(plan.get("neu_angelegt", []))
    except (OSError, ValueError, AttributeError, TypeError):
        return ["der Plan der Sicherung ist unlesbar"]
    probleme = []
    for rel in rels:
        if not _name_ok(rel) or geschuetzt(rel):
            continue
        ziel, alt = Path(wurzel) / rel, sdir / "dateien" / rel
        try:
            if alt.is_file():
                _kopieren_atomar(alt, ziel)
            elif rel in neu_angelegt and ziel.exists():
                ziel.unlink()
        except OSError as ex:
            probleme.append(f"{rel} ({type(ex).__name__})")
    return probleme


def _anwenden(wurzel, neu, schreiben, loeschen, sdir, jetzt_iso, von, nach):
    """Sichert die alten Dateien, tauscht aus und liest zurück. Wirft bei jedem Fehler (der Aufrufer rollt zurück)."""
    wurzel, sdir = Path(wurzel), Path(sdir)
    neu_angelegt = [rel for rel in schreiben if not (wurzel / rel).is_file()]
    for rel in schreiben + loeschen:
        quelle = wurzel / rel
        if quelle.is_file():
            ziel = sdir / "dateien" / rel
            ziel.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(quelle, ziel)
    plan = {"von": von, "nach": nach, "zeit": jetzt_iso, "schreiben": schreiben, "neu_angelegt": neu_angelegt, "loeschen": loeschen}
    _bytes_atomar(sdir / "plan.json", (json.dumps(plan, ensure_ascii=False) + "\n").encode("utf-8"))
    _bytes_atomar(sdir / "LAEUFT", jetzt_iso.encode("ascii"))     # Marke: ist sie beim nächsten Start noch da, starb der Tausch mittendrin
    for rel in sorted(schreiben, key=lambda r: (_rang(r), r)):
        _bytes_atomar(wurzel / rel, neu[rel])
    for rel in loeschen:
        try:
            (wurzel / rel).unlink()
        except FileNotFoundError:
            pass
    for rel in schreiben:                                          # zurücklesen: steht wirklich drin, was drinstehen soll?
        if _sha((wurzel / rel).read_bytes()) != _sha(neu[rel]):
            raise OSError(f"{rel} wurde nicht korrekt geschrieben")


def unfertig(wurzel=None):
    """Gibt es eine Sicherung mit der Marke «LAEUFT»? Dann starb ein Tausch mittendrin (oder er läuft gerade)."""
    try:
        return any((d / "LAEUFT").exists() for d in (Path(wurzel or ROOT) / "data" / SICHERUNG).iterdir() if d.is_dir())
    except OSError:
        return False


def erholen(wurzel=None):
    """Ein früherer Tausch starb mittendrin (Strom weg, Prozess beendet): aus der Sicherung zurückholen. → Text oder ''. Nur unter der Lauf-Sperre aufrufen."""
    basis = Path(wurzel or ROOT) / "data" / SICHERUNG
    if not basis.is_dir():
        return ""
    texte = []
    for d in sorted(basis.iterdir()):
        marke = d / "LAEUFT"
        if not (d.is_dir() and marke.exists()):
            continue
        probleme = _zurueckrollen(wurzel or ROOT, d)
        if probleme:
            texte.append("Wiederherstellung unvollständig: " + ", ".join(probleme[:5]))
        else:
            try:
                marke.unlink()
            except OSError:
                pass
            texte.append(f"ein abgebrochener Tausch ({d.name}) wurde zurückgenommen")
    return "; ".join(texte)


def _sicherungen_aufraeumen(wurzel):
    basis = Path(wurzel) / "data" / SICHERUNG
    try:
        alle = sorted(d for d in basis.iterdir() if d.is_dir() and not (d / "LAEUFT").exists())
    except OSError:
        return
    for d in alle[:-SICHERUNGEN_BEHALTEN]:
        shutil.rmtree(d, ignore_errors=True)


# ───────────────────────── Selbsttests ─────────────────────────
def schnelltests(wurzel, python=None, zeit=300, budget=900):
    """Syntax aller .py-Dateien und die Selbsttests von krypto-auto.bat (ohne den langen Streng-Test). → (ok, Text).
    Jeder Test darf einmal wiederholt werden; alle zusammen höchstens `budget` Sekunden (ein hängender Test hält die Aufgabenplanung nicht auf)."""
    wurzel = Path(wurzel)
    ende = time.monotonic() + budget
    for p in sorted((wurzel / "tools" / "trading").rglob("*.py")):
        if "__pycache__" in p.parts:
            continue
        try:
            compile(p.read_bytes(), str(p), "exec")
        except (SyntaxError, ValueError, OSError) as ex:
            return False, f"Syntaxfehler in {p.name}: {ex}"
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    ausgefuehrt = 0
    for name in SCHNELLTESTS:
        pfad = wurzel / "tools" / "trading" / "krypto_bot" / name
        if not pfad.is_file():
            continue
        for _versuch in (1, 2):
            if time.monotonic() > ende:
                return False, f"der Probelauf dauert länger als {budget} Sekunden (bei {name})"
            try:
                r = subprocess.run([python or sys.executable, str(pfad)], cwd=str(wurzel), env=env, capture_output=True, text=True,
                                   encoding="utf-8", errors="replace", timeout=zeit)
                rc, out = r.returncode, (r.stdout or "") + "\n" + (r.stderr or "")
            except subprocess.TimeoutExpired:
                rc, out = -1, f"länger als {zeit} Sekunden"
            if rc == 0:
                ausgefuehrt += 1
                break
        else:
            letzte = next((x.strip() for x in reversed(out.splitlines()) if x.strip()), "keine Ausgabe")
            return False, f"{name} ist durchgefallen: {letzte[:200]}"
    return True, f"Syntax und {ausgefuehrt} Selbsttests bestanden"


def vorpruefung(wurzel, neu, loeschen=(), python=None, zeit=300):
    """Probelauf der NEUEN Version in einer Kopie von tools/trading und data — die echte Installation bleibt unberührt. → (ok, Text)."""
    wurzel = Path(wurzel)
    arbeit = wurzel / "data" / ARBEIT
    td = None
    try:
        arbeit.mkdir(parents=True, exist_ok=True)
        td = Path(tempfile.mkdtemp(prefix="pruef-", dir=str(arbeit)))
        quelle = wurzel / "tools" / "trading"
        if quelle.is_dir():
            shutil.copytree(quelle, td / "tools" / "trading", ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "STOP", "PAUSE", "*.lock"))
        daten = wurzel / "data"
        if daten.is_dir():
            shutil.copytree(daten, td / "data", ignore=shutil.ignore_patterns("*.lock", "*.log", SICHERUNG, ARBEIT, ".*.tmp*", "*.tmp*"))
        for rel in loeschen:
            try:
                (td / rel).unlink()
            except OSError:
                pass
        for rel, inhalt in neu.items():
            _bytes_atomar(td / rel, inhalt)
        return schnelltests(td, python=python, zeit=zeit)
    except (OSError, shutil.Error) as ex:
        return False, f"der Probelauf in der Kopie war nicht möglich ({type(ex).__name__}: {str(ex)[:120]})"
    finally:
        if td is not None:
            shutil.rmtree(td, ignore_errors=True)
        try:
            arbeit.rmdir()      # nur, wenn leer
        except OSError:
            pass


# ───────────────────────── Das Update ─────────────────────────
def _fehlversuche(st, version, jetzt):
    """Wie oft ist diese Version in den letzten PAUSE_TAGE Tagen gescheitert?"""
    e = (st.get("fehlversuche") or {}).get(version)
    try:
        zeit = datetime.strptime(e["zeit"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        return int(e["n"]) if jetzt - zeit < timedelta(days=PAUSE_TAGE) else 0
    except (TypeError, KeyError, ValueError):
        return 0


def einspielen(wurzel=None, env=None, hand=False, erzwingen=False, jetzt=None, holen=None, pruefer=None, sperre=None, fortschritt=None):
    """Schaut nach einer neueren Version und spielt sie ein. → {ok, ergebnis, text, von, nach, version}.
    ergebnis: aktuell · eingespielt · uebersprungen · aus · offline · besetzt · gestoppt · pausiert · fehlgeschlagen · zurueckgerollt.
    hand=True: wie der Knopf «Update holen» (Schalter «aus», Echtgeld, Tagesgrenze und Fehlversuch-Pause zählen nicht; die Stopp-Datei IMMER).
    ok ist nur bei fehlgeschlagen und zurueckgerollt False. fortschritt(Text): Zwischenmeldungen, die es nur gibt, wenn wirklich eine neue Version eingespielt wird."""
    wurzel = Path(wurzel or ROOT)
    jetzt = jetzt or datetime.now(timezone.utc)
    env = umgebung() if env is None else env
    holen, pruefer = holen or _holen, pruefer or vorpruefung
    sag = fortschritt or (lambda _t: None)
    sperre = sperre or (lambda: _lauf_sperre(wurzel / "data"))
    iso = jetzt.strftime("%Y-%m-%dT%H:%M:%SZ")
    st = status_lesen(wurzel)
    lokal = lokale_version(wurzel)
    von = lokal["version"] if lokal else None

    def fertig(art, text, ok=True, nach=None, geprueft=False, verlauf=False, kritisch=False):
        st.update({"ergebnis": art, "text": text[:500], "ok": ok, "zeit": iso, "kritisch": bool(kritisch)})
        if geprueft:
            st["geprueft"] = iso
        neu_lokal = lokale_version(wurzel)
        st["version"] = neu_lokal["version"] if neu_lokal else None
        if verlauf:
            st["verlauf"] = (st.get("verlauf") or [])[-19:] + [{"zeit": iso, "ergebnis": art, "von": von, "nach": nach, "text": text[:200]}]
        try:
            status_schreiben(wurzel, st)
        except OSError:
            pass
        return {"ok": ok, "ergebnis": art, "text": text, "von": von, "nach": nach, "version": st["version"]}

    def gescheitert(version, art, text, kritisch=False):
        fv = dict(st.get("fehlversuche") or {})
        fv[version] = {"n": _fehlversuche(st, version, jetzt) + 1, "zeit": iso}
        st["fehlversuche"] = dict(list(fv.items())[-10:])
        return fertig(art, text, ok=False, nach=version, verlauf=True, kritisch=kritisch)

    # Ein früherer Tausch starb mittendrin? Erst heilen, egal ob Schalter oder Tagesgrenze (nur unter der Lauf-Sperre: sonst wäre es vielleicht ein lebender Tausch)
    if unfertig(wurzel):
        try:
            with sperre():
                geheilt = erholen(wurzel)
            if geheilt:
                st["erholt"] = geheilt
        except Besetzt:
            pass
    if not hand:
        grund = auto_aus_grund(env, wurzel)
        if grund:
            return fertig("aus", f"Auto-Update {grund}")
        if not erzwingen and st.get("geprueft"):
            try:
                if jetzt - datetime.strptime(st["geprueft"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) < timedelta(hours=TAGESGRENZE_STUNDEN):
                    return {"ok": True, "ergebnis": "uebersprungen", "text": "heute schon geprüft", "von": von, "nach": None, "version": von}
            except ValueError:
                pass
    code, roh = holen(MANIFEST_URL, 20, 200_000)
    if code is None:
        return fertig("offline", "kein Internet oder GitHub gerade nicht erreichbar — nächster Versuch beim nächsten Lauf")
    if code == 404:
        return fertig("offline", "es ist noch kein Paket veröffentlicht (HTTP 404)")
    if code != 200:
        return fertig("offline", f"die Paketbeschreibung ist gerade nicht lesbar (HTTP {code})")
    try:
        m = manifest_pruefen(json.loads(roh.decode("utf-8")))
    except (ValueError, UnicodeDecodeError) as ex:
        return fertig("fehlgeschlagen", f"die Paketbeschreibung ist unbrauchbar ({ex}) — es wurde nichts geändert", ok=False)
    scode, stext = holen(STOPP_URL, 15, 5000)       # Not-Aus aus der Cloud: gilt immer, auch für den Knopf
    stopp = " ".join(stext.decode("utf-8", "replace").split())[:200] if scode == 200 else ""
    if stopp:
        return fertig("gestoppt", f"Updates sind angehalten: {stopp}", geprueft=True)
    if scode not in (200, 404):
        return fertig("offline", "die Stopp-Datei ist gerade nicht prüfbar — vorsichtshalber kein Update")
    nach = m["version"]
    if lokal and (lokal["version"] == nach or lokal["gebaut"] >= m["gebaut"]):
        return fertig("aktuell", f"Version {von} ist die neueste", geprueft=True)
    if not hand and _fehlversuche(st, nach, jetzt) >= FEHLVERSUCHE_MAX:
        return fertig("pausiert", f"Version {nach} ist {FEHLVERSUCHE_MAX}× gescheitert ({st.get('text', '')[:120]}) — es bleibt bei {von or 'der jetzigen Version'}, "
                      f"in {PAUSE_TAGE} Tagen oder bei einer neueren Version nochmals", geprueft=True)
    sag(f"Programm: neue Version {nach} gefunden (jetzt {von or 'ohne Nummer'}) — lade sie …")
    code, daten = holen(f"{BASIS}/{m['datei']}", 180, MAX_ZIP)
    if code != 200:
        return fertig("offline", f"das Paket {nach} lässt sich gerade nicht laden (HTTP {code})")
    try:
        neu = zip_lesen(daten, m)
    except ValueError as ex:
        return gescheitert(nach, "fehlgeschlagen", f"Version {nach} wurde abgelehnt: {ex}. Es wurde nichts geändert.")
    schreiben, loeschen = plan_erstellen(wurzel, neu, alte_liste(wurzel))
    sag("Programm: Probelauf der neuen Version in einer Kopie (kann 1–2 Minuten dauern; dein laufendes Programm bleibt unberührt) …")
    ok, text = pruefer(wurzel, neu, loeschen)
    if not ok:
        return gescheitert(nach, "fehlgeschlagen", f"Version {nach} hat den Probelauf nicht bestanden ({text}). Die jetzige Version {von or ''} bleibt, nichts wurde geändert.")
    sdir = wurzel / "data" / SICHERUNG / (jetzt.strftime("%Y%m%d-%H%M%S") + "-" + re.sub(r"[^0-9A-Za-z._-]", "_", von or "unbekannt"))
    sag("Programm: Probelauf bestanden — tausche aus …")
    try:
        with sperre():
            try:
                _anwenden(wurzel, neu, schreiben, loeschen, sdir, iso, von, nach)
            except Exception as ex:  # noqa: BLE001 — jeder Fehler beim Tausch: zurück auf den alten Stand
                probleme = _zurueckrollen(wurzel, sdir)
                if not probleme:
                    try:
                        (sdir / "LAEUFT").unlink()
                    except OSError:
                        pass
                    return gescheitert(nach, "zurueckgerollt", f"Version {nach} liess sich nicht einspielen ({type(ex).__name__}: {str(ex)[:120]}). Alles ist wieder wie vorher.")
                return gescheitert(nach, "zurueckgerollt", f"Version {nach} liess sich nicht einspielen ({type(ex).__name__}), und das Zurücksetzen ist unvollständig: "
                                   f"{', '.join(probleme[:5])}. Sicherung: {sdir}", kritisch=True)
            try:
                (sdir / "LAEUFT").unlink()
            except OSError:
                pass
    except Besetzt:
        return fertig("besetzt", f"Version {nach} ist bereit; ein Lauf handelt gerade — das Update kommt beim nächsten Mal")
    _sicherungen_aufraeumen(wurzel)
    st.get("fehlversuche", {}).pop(nach, None)
    st.pop("erholt", None)
    teile = [f"✅ Programm aktualisiert: {von or 'unbekannt'} → {nach}", f"{len(schreiben)} Dateien ersetzt, {len(loeschen)} entfernt", text]
    if m["hinweis"]:
        teile.append("Neu: " + m["hinweis"])
    return fertig("eingespielt", ". ".join(teile) + ".", nach=nach, geprueft=True, verlauf=True)


# ───────────────────────── Anzeige ─────────────────────────
def ampel(env=None, wurzel=None, jetzt=None):
    """(ok, Text, warnung) für die Gesundheits-Ampel des Cockpits."""
    wurzel = Path(wurzel or ROOT)
    env = umgebung() if env is None else env
    jetzt = jetzt or datetime.now(timezone.utc)
    st, lokal = status_lesen(wurzel), lokale_version(wurzel)
    ver = lokal["version"] if lokal else "ohne Versionsnummer"
    ergebnis = st.get("ergebnis")
    if st.get("kritisch"):
        return False, f"{ver} · Update-Tausch unvollständig zurückgesetzt: {st.get('text', '')}", False
    if (ergebnis in ("fehlgeschlagen", "zurueckgerollt") and st.get("ok") is False) or ergebnis == "pausiert":
        return None, f"{ver} · {st.get('text', '')}", True
    aus = auto_aus_grund(env, wurzel)
    if aus:
        return None, f"{ver} · Auto-Update {aus}", False
    if not st.get("geprueft"):
        return None, f"{ver} · noch nie geprüft — das passiert nach dem nächsten Tageslauf von selbst", False
    try:
        tage = (jetzt - datetime.strptime(st["geprueft"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).days
    except ValueError:
        tage = 99
    if tage > 3:
        return None, f"{ver} · seit {tage} Tagen nicht auf Updates geprüft (kein Internet, oder läuft der Tageslauf nicht?)", True
    return True, f"{ver} · zuletzt geprüft {st['geprueft'][:16].replace('T', ' ')} UTC: {st.get('text', '')[:160]}", False


def status_text(wurzel=None, env=None):
    ok, text, _w = ampel(env=env, wurzel=wurzel)
    return ("✓ " if ok else "✗ " if ok is False else "○ ") + "Auto-Update: " + text


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--jetzt", action="store_true", help="sofort schauen, Tagesgrenze ignorieren")
    ap.add_argument("--hand", action="store_true", help="wie der Knopf «Update holen» (auch bei Schalter «aus» und mit echtem Geld)")
    ap.add_argument("--status", action="store_true", help="nur anzeigen")
    ap.add_argument("--still", action="store_true", help="nichts ausgeben, wenn es nichts zu berichten gibt")
    a = ap.parse_args(argv)
    try:
        if a.status:
            print(status_text())
            return 0
        r = einspielen(hand=a.hand, erzwingen=a.jetzt or a.hand, fortschritt=print)
        if not (a.still and r["ergebnis"] in ("aktuell", "uebersprungen", "offline", "aus", "besetzt")):
            print("Auto-Update: " + r["text"])
    except Exception as ex:  # noqa: BLE001 — ein Update darf nie einen Lauf scheitern lassen
        print(f"Auto-Update: unerwarteter Fehler {type(ex).__name__}: {ex}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
