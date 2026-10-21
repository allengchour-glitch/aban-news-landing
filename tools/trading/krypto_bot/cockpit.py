#!/usr/bin/env python3
"""Krypto-Cockpit — Live-Dashboard im Browser und Steuerung per Telegram, für Pilot, KI-Trader (Claude) und ETH-Sammler.

  py tools/trading/krypto_bot/cockpit.py            # startet http://127.0.0.1:8765 und öffnet den Browser
  py tools/trading/krypto_bot/cockpit.py --kein-browser --port 8765

Das Cockpit liest nur die Logbücher in data/ und den Zwischenspeicher der Markt-Infos und handelt nicht selbst.
/markt ist die Live-Ansicht im Stil einer Börse (Kerzen, Volumen, MA/BOLL, RSI, MACD, Orderbuch, Markttiefe, Trades, Märkte):
der Browser holt die Kurse direkt bei Binance (öffentliche Marktdaten, ohne Schlüssel). Einzige Aktion: der Not-Aus-Knopf (schliesst die Pilot-Positionen und stoppt alle Bots, wie stop.bat).
Es lauscht nur auf diesem PC (127.0.0.1), nicht im Netzwerk.

Telegram-Steuerung (läuft mit, wenn TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID gesetzt sind). Befehle nur aus deinem Chat:
  /profit  Gewinn + offene Positionen · /status  Pilot heute · /konto  Wochenbericht · /ki  Claude-Einschätzung · /lage  Markt-Infos
  /news    die letzten News-Alarme (der News-Wächter läuft mit dem Cockpit alle 30 Minuten und meldet Hacks, gestoppte
           Abhebungen, Insolvenzen, Depegs, SEC/ETF und BTC/ETH-Delistings — nur Info, der Bot handelt nicht nach News)
  /stop    Not-Aus: Positionen schliessen, alle Bots stoppen · /weiter  Not-Aus aufheben · /hilfe
"""
from __future__ import annotations

import argparse
import json
import queue
import os
import re
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))

ROOT = HIER.parents[2]
DATA = ROOT / "data"
STOP = HIER.parent / "ki_bot" / "STOP"    # Not-Aus: nichts eröffnen, der Pilot schliesst seine Positionen
PAUSE = HIER.parent / "ki_bot" / "PAUSE"  # Auto-Handel aus: nichts handeln, Positionen bleiben
SEITE = HIER / "cockpit.html"
MARKT = HIER / "markt.html"
HILFE = ("Befehle: /profit Gewinn und Positionen · /status Pilot heute · /konto Wochenbericht · /ki Claude-Einschätzung · /lage Markt-Infos · "
         "/calls Telegram-Calls (Schatten-Bilanz) · /news News-Alarme · "
         "/stop Not-Aus (Positionen schliessen) · /weiter Not-Aus aufheben")


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
    """Umgebung für Not-Aus, Knöpfe und Anzeige: os.environ, darüber die AKTUELLEN Benutzer-Variablen aus der Registry.
    Ein seit Tagen laufendes Cockpit sähe sonst einen Wechsel auf Echtgeld oder neue Schlüssel nicht (setx wirkt nur in
    neuen Prozessen) — und der Not-Aus würde das falsche Konto prüfen und «alles zu» melden."""
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


def notaus_env_aktiv(env=None):
    env = umgebung() if env is None else env
    return STOP.exists() or env.get("KI_BOT_STOP", "") == "1"


def _json(name, standard):
    p = DATA / name
    try:
        return json.loads(p.read_text(encoding="utf-8")) if p.exists() else standard
    except ValueError:
        return standard


# ───────────────────────── Aktionen (Cockpit-Knopf und Telegram) ─────────────────────────
def notaus_an(schliessen=True, ausfuehren=None):
    """Not-Aus setzen und die Pilot-Positionen sofort schliessen (reduceOnly). Meldet je Markt, was WIRKLICH zu ist:
    «geschlossen» nur, wenn die Position danach 0 ist. Scheitert das Schliessen, bleibt der bisherige Stop an der Börse."""
    STOP.parent.mkdir(parents=True, exist_ok=True)
    STOP.write_text(datetime.now(timezone.utc).isoformat(timespec="seconds") + " Not-Aus (Cockpit/Telegram)\n", encoding="utf-8")
    if not schliessen:
        return "🛑 Not-Aus aktiv."
    import pilot as PI
    import sperre
    vorab, alles_zu = [], True
    try:
        gesperrt = sperre.lauf_sperre(warten=60, alt_nach=sperre.ALT_NACH_TOT)  # (16. Prüfung) eine tote Sperre (kein Herzschlag seit 150 s) hält den Not-Aus nicht auf
        gesperrt.__enter__()
    except sperre.Besetzt:
        gesperrt = None
        alles_zu = False  # ein anderer Lauf könnte gleichzeitig noch etwas aufgebaut haben → nicht «alles zu» melden
        # (17. Prüfung K4) die Sperre kann auch ein ABGESTÜRZTER Lauf hinterlassen haben: sie gilt erst nach ALT_NACH_TOT (150 s) ohne Herzschlag als tot — länger als die 60 s Wartezeit hier. Die Nachkontrolle unten
        # (Not-Aus-Modus) wartet darauf und schliesst Pilot 2.0 dann selbst; die Meldung sagt es.
        vorab.append("⚠️ Ein anderer Lauf hält die Sperre (oder ist abgestürzt: eine tote Sperre gilt erst nach 150 s als tot) — Not-Aus trotzdem ausgeführt; die Nachkontrolle schliesst Pilot 2.0, sobald die Sperre frei "
                     "oder tot ist. In 5 Minuten nochmals «Not-Aus» drücken.")
    try:
        env = umgebung()  # aktuelle Schalter + Schlüssel (auch PILOT2_*) aus der Einstellungsdatei, nicht die beim Start
        if ausfuehren is None:
            import broker_futures as BF

            def ausfuehren(e, symbol, gewicht):
                return BF.ausfuehren(e, env=env, symbol=symbol, gewicht=gewicht)
        zu, zeilen = PI.schliessen_alle(ausfuehren, env=env, ohne_p2=gesperrt is None)  # Sperre besetzt: P2 schliesst der andere Lauf
        alles_zu = alles_zu and zu
    finally:
        if gesperrt is not None:
            gesperrt.__exit__(None, None, None)
    zeilen = vorab + zeilen
    PI.lauf_merken(alles_zu, ["Not-Aus (Cockpit/Telegram)"] + zeilen, logbuch=DATA / "krypto-pilot.json")
    try:  # wie stop.bat: blieb bei Pilot 2.0 etwas unklar oder offen, versucht es die Nachkontrolle in jedem Takt nochmals
        if nachkontrolle_starten():
            zeilen.append("Nachkontrolle Pilot 2.0 läuft im Hintergrund (bis ~11 Minuten: klärt Unklares, schliesst nochmals) — "
                          "sie meldet sich per Telegram.")
    except Exception as ex:  # noqa: BLE001
        zeilen.append(f"⚠️ Nachkontrolle Pilot 2.0 nicht gestartet ({type(ex).__name__}) — zusätzlich stop.bat ausführen!")
    return ("🛑 Not-Aus aktiv." if alles_zu else "🛑 Not-Aus aktiv — ⚠️ NICHT ALLES GESCHLOSSEN!") + "\n" + "\n".join(zeilen)


def nachkontrolle_starten():
    """Wie stop.bat: nach dem Not-Aus die Nachkontrolle von Pilot 2.0 als eigenen Prozess im Hintergrund (bis ~11 Minuten:
    unklare Aufträge klären, in jedem Takt nochmals schliessen) — nur, wenn Pilot 2.0 einen Bestand hat. Sie meldet sich selbst
    per Telegram. → True = gestartet"""
    import pilot2_live as P2L
    if not Path(P2L.BESTAND).exists():
        return False
    threading.Thread(target=_skript, args=(["pilot.py", "--nachkontrolle"], P2L.NACHKONTROLLE_MAX_S + 600), daemon=True).start()
    return True


def pause_an():
    PAUSE.parent.mkdir(parents=True, exist_ok=True)
    PAUSE.write_text(datetime.now(timezone.utc).isoformat(timespec="seconds") + " Pause (Cockpit)\n", encoding="utf-8")
    return "⏸ Auto-Handel aus. Die Bots handeln nicht mehr; offene Positionen bleiben stehen, ihr Stop an der Börse bleibt aktiv. Sofort schliessen: roter Not-Aus-Knopf."


def notaus_aus():
    for d in (STOP, PAUSE):
        if d.exists():
            d.unlink()
    return "✅ Not-Aus aufgehoben. Der nächste Lauf handelt wieder."


# ───────────────────────── Knöpfe (nur fest eingetragene Aktionen, kein beliebiger Befehl) ─────────────────────────
# Name → (Skript und Argumente, Zeitlimit in Sekunden, Titel)
AKTIONEN = {
    "probe": (["pilot.py", "--lauf", "--trocken"], 300, "Pilot – Probelauf ohne Aufträge"),
    # Handels-Läufe nie nach Minuten hart beenden (ein Abbruch zwischen Auftrag und Stop liesse eine Position ohne Schutz);
    # die Skripte haben eigene Zeitlimits je Anfrage. 1 Std. ist nur das Netz unter dem Netz.
    "handeln": (["pilot.py", "--lauf"], 3600, "Pilot – jetzt handeln"),
    "ki": (["ki_trader.py", "--lauf"], 900, "Claude fragen"),
    "sparplan": (["eth_sammler.py", "--lauf"], 3600, "ETH-Sparplan ausführen"),
    "infos": (["infos.py"], 600, "Markt-Infos aktualisieren"),
    "backtest": (["pilot.py", "--backtest"], 600, "Backtest rechnen"),
    "selbsttest": ([], 900, "Selbsttest"),
    "aufgabe": ([], 60, "Täglich automatisch einrichten"),
    "update": ([], 180, "Update holen"),
    "bericht": ([], 120, "Wochenbericht aufs Handy"),
    "auto_an": ([], 10, "Auto-Handel an"),
    "risiko_1": ([], 10, "Risiko-Stufe 1× (Standard)"),
    "risiko_1_5": ([], 10, "Risiko-Stufe 1,5×"),
    "risiko_1_75": ([], 10, "Risiko-Stufe 1,75×"),
    "risiko_2": ([], 10, "Risiko-Stufe 2×"),
    "auto_aus": ([], 10, "Auto-Handel aus"),
}
SELBSTTESTS = ["test_pilot.py", "test_sammler.py", "test_infos.py", "test_binance.py", "test_profit.py", "test_calls.py",
              "test_pilot2_plan.py", "test_pilot2_live.py", "test_pilot2_streng.py", "test_testnetz_pruefung.py"]
PROTOKOLL = deque(maxlen=40)
_LAUFEND, _SPERRE = {}, threading.Lock()  # Name → Startzeit


def _skript(args, zeit):
    """Ein Bot-Skript als eigenen Prozess starten (wie von Hand), Ausgabe einsammeln."""
    env = dict(umgebung(), PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    try:
        r = subprocess.run([sys.executable, str(HIER / args[0]), *args[1:]], capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=zeit, cwd=str(ROOT), env=env)
        return r.returncode == 0, (r.stdout + ("\n" + r.stderr if r.stderr.strip() else "")).strip()
    except subprocess.TimeoutExpired:
        return False, f"Abgebrochen: länger als {zeit} Sekunden."


AUFGABE = "Krypto-Pilot"
AUFGABE_NK = "Krypto-Pilot-Nachkontrolle"  # (17. Prüfung W4) zweite Aufgabe: alle 10 Minuten und bei der Anmeldung die Nachkontrolle von Pilot 2.0


def _befehl(cmd, zeit):
    """Fester Befehl (Liste, keine Shell) mit gesammelter Ausgabe."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=zeit, cwd=str(ROOT))
        return r.returncode == 0, (r.stdout + ("\n" + r.stderr if r.stderr.strip() else "")).strip() or "(keine Ausgabe)"
    except FileNotFoundError as ex:
        return False, f"Programm nicht gefunden: {ex.filename}"
    except subprocess.TimeoutExpired:
        return False, f"Abgebrochen: länger als {zeit} Sekunden."


def aufgabe_befehl():
    """Einfacher Rückfall: täglich 02:30 krypto-auto.bat «auto» (Windows-Standard: nicht auf Akku, verpasst = verpasst)."""
    bat = HIER / "krypto-auto.bat"
    return ["schtasks", "/create", "/sc", "daily", "/st", "02:30", "/tn", AUFGABE, "/tr", f'"{bat}" auto', "/f"]


def aufgabe_xml():
    """Aufgabe als XML: täglich 02:30, AUCH AUF AKKU, und ein verpasster Lauf (PC aus/Schlaf) wird beim nächsten Start
    nachgeholt (StartWhenAvailable). Läuft nur, wenn der Benutzer angemeldet ist — wie die einfache Variante."""
    from xml.sax.saxutils import escape
    bat = escape(str(HIER / "krypto-auto.bat"))
    return f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Krypto-Pilot: täglicher Lauf (krypto-auto.bat auto)</Description></RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-01-01T02:30:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec><Command>{bat}</Command><Arguments>auto</Arguments></Exec>
  </Actions>
</Task>
"""


NK_LEBT = "krypto-nachkontrolle-lebt.txt"      # Lebenszeichen: krypto-auto.bat «nachkontrolle» schreibt es bei JEDEM Start (data/) — fehlt es zu lange, läuft der unsichtbare Starter nicht (Windows Script Host gesperrt, Virenscanner, Pfad)
NK_RC = "krypto-nachkontrolle-rc.txt"          # (18. Prüfung K5) die Bat schreibt hier NACH der Nachkontrolle «<Zeit> rc=N»: 0 = in Ordnung, 3 = Warnung (schon gemeldet), alles andere = Absturz von pilot.py
NK_LEBT_MAX_MIN = 30                           # drei verpasste Takte der Aufgabe (alle 10 Minuten) — dann steht die Ampel auf Rot
NK_ENDE_MAX_MIN = 15                           # (19. Prüfung K5) so lange darf ein Durchgang höchstens laufen, bevor «nie zu Ende gegangen» gilt (normal: Sekunden bis wenige Minuten; die Aufgabe startet alle 10 Minuten)
NK_DURCHGANG_MAX_MIN = 5                       # (20. Prüfung, klein 1) so lange darf ein einzelner Durchgang höchstens laufen (Wiederholungs-Budget 60 s + Anfragen); ist der Rückgabewert dann noch älter als NK_LEBT_MAX_MIN, gingen die letzten Durchgänge nie zu Ende
NK_SERIE = "krypto-nachkontrolle-serie.json"   # (20. Prüfung) `pilot.py --nachkontrolle --einmal` führt hier Buch über die Reihe gleichartiger Durchgänge: {art: ok|warnung|besetzt, anzahl, seit, zeit}
NK_WARN_ROT = 2                                # so viele Durchgänge IN FOLGE mit Warnung (Rückgabewert 3) sind eine Dauerwarnung → rot; ein einzelner bleibt grau (⚠) mit Text
NK_BESETZT_ROT = 4                             # so viele Durchgänge in Folge «Lauf-Sperre besetzt» (Rückgabewert 0) → rot: der Tageslauf braucht Minuten, die lange Nachkontrolle höchstens 11,5 — mehr als 2 in Folge sind kein Zufall, der Halter steht (z. B. angeklicktes Konsolenfenster)
NK_SERIE_VORSPRUNG_MIN = 2                     # (Code-Review der R20) liegt der letzte Eintrag der Reihe mehr als so viele Minuten VOR dem Rückgabewert der Bat, hat die Bat danach einen Durchgang beendet, der `pilot.py` gar nicht aufrief (`:nk_ohne_buch`, kein Buch → rc=0): die Reihe ist überholt und zählt nicht
NK_STARTER = "krypto-nachkontrolle-still.vbs"  # startet krypto-auto.bat «nachkontrolle» ohne sichtbares Fenster (alle 10 Minuten ein Konsolenfenster würde stören — und dazu verleiten, die Aufgabe abzuschalten)


def aufgabe_befehl_nk():
    """Einfacher Rückfall der Nachkontroll-Aufgabe: alle 10 Minuten der unsichtbare Starter (wscript → krypto-auto.bat «nachkontrolle»)."""
    return ["schtasks", "/create", "/sc", "minute", "/mo", "10", "/tn", AUFGABE_NK, "/tr", f'wscript.exe //B //Nologo "{HIER / NK_STARTER}"', "/f"]


def _anmelde_benutzer():
    """«RECHNER\\Benutzer» der laufenden Anmeldung (Windows: USERDOMAIN\\USERNAME), sonst None. Ein Anmelde-Auslöser OHNE Benutzer gilt für JEDEN Benutzer und lässt sich nur mit Administratorrechten anlegen
    (schtasks: «Zugriff verweigert») — mit dem eigenen Benutzer geht er ohne."""
    d_, u_ = os.environ.get("USERDOMAIN"), os.environ.get("USERNAME")
    return f"{d_}\\{u_}" if d_ and u_ else None


def aufgabe_xml_nk(benutzer=None):
    """(17. Prüfung W4) Die Nachkontrolle von Pilot 2.0 hatte keinen eigenen Takt: sie lief nur hinter dem Tageslauf (krypto-auto.bat) und nach «Jetzt handeln». Starb die Bat mit dem Prozess (Fenster zu, Neustart),
    blieb ein unvermerkter oder unfertiger Markt bis zum nächsten Tageslauf (02:30) ohne Stop. Diese Aufgabe startet krypto-auto.bat «nachkontrolle» (über den unsichtbaren Starter krypto-nachkontrolle-still.vbs) alle 10 Minuten UND bei jeder
    Anmeldung — ohne Vermerk im Buch ist sie nach einer Sekunde fertig. Auch auf Akku, nie zwei Instanzen zugleich."""
    from xml.sax.saxutils import escape
    vbs = escape(str(HIER / NK_STARTER))
    benutzer = _anmelde_benutzer() if benutzer is None else benutzer
    # Anmelde-Auslöser nur MIT Benutzer (sonst Administratorrechte nötig → die ganze XML-Variante scheiterte und es bliebe die einfache ohne Anmeldung); ohne Benutzer fehlt er — StartWhenAvailable holt den Takt nach dem Einschalten nach
    logon = f"\n    <LogonTrigger><Enabled>true</Enabled><UserId>{escape(benutzer)}</UserId></LogonTrigger>" if benutzer else ""
    return f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Krypto-Pilot: Nachkontrolle von Pilot 2.0 (alle 10 Minuten und, wenn der Benutzer bekannt ist, bei der Anmeldung; ohne sichtbares Fenster; ohne Vermerk sofort fertig)</Description></RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <Repetition><Interval>PT10M</Interval></Repetition>
      <StartBoundary>2026-01-01T00:03:00</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>{logon}
  </Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <ExecutionTimeLimit>PT30M</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec><Command>wscript.exe</Command><Arguments>//B //Nologo "{vbs}"</Arguments></Exec>
  </Actions>
</Task>
"""


def _aufgabe_nk_einrichten(befehl, td):
    """Die Nachkontroll-Aufgabe: erst XML, sonst die einfache Variante. → (ok, Text). Scheitert sie, geht die tägliche trotzdem."""
    datei = Path(td) / "krypto-pilot-nachkontrolle.xml"
    datei.write_text(aufgabe_xml_nk(), encoding="utf-16")
    ok, text = befehl(["schtasks", "/create", "/tn", AUFGABE_NK, "/xml", str(datei), "/f"], 60)
    if ok:
        return True, "Nachkontrolle: alle 10 Minuten und bei der Anmeldung (Aufgabe «" + AUFGABE_NK + "»)."
    ok2, text2 = befehl(aufgabe_befehl_nk(), 60)
    if ok2:
        return True, ("Nachkontrolle: alle 10 Minuten (einfache Variante, Aufgabe «" + AUFGABE_NK + "») — OHNE die Einstellungen «auch auf Akku» und «verpassten Lauf nachholen»: "
                      "auf einem Laptop im Akkubetrieb läuft sie dann nicht, und nach dem Einschalten wartet sie auf den nächsten Takt.")
    return False, "⚠️ Die Nachkontroll-Aufgabe ließ sich nicht einrichten (" + (text2 or text or "?").strip()[:120] + ") — ohne sie läuft die Nachkontrolle nur hinter dem Tageslauf."


def aufgabe_einrichten(befehl=None, ordner=None):
    """Erst die XML-Variante (Akku + nachholen); geht die nicht, die einfache. Dazu (zuerst, best effort) die Nachkontroll-Aufgabe. → (ok, Text)."""
    befehl = befehl or _befehl
    import tempfile
    with tempfile.TemporaryDirectory(dir=ordner) as td:
        nk_ok, nk_text = _aufgabe_nk_einrichten(befehl, td)  # zuerst: der letzte Befehl bleibt der der täglichen Aufgabe
        datei = Path(td) / "krypto-pilot-aufgabe.xml"
        datei.write_text(aufgabe_xml(), encoding="utf-16")
        ok, text = befehl(["schtasks", "/create", "/tn", AUFGABE, "/xml", str(datei), "/f"], 60)
    if ok:
        return True, ("✅ Eingerichtet: täglich 02:30 startet krypto-auto.bat (Aufgabe «" + AUFGABE + "»), auch auf Akku. "
                      "War der PC aus oder im Ruhezustand, läuft er beim nächsten Start nach.\n" + nk_text + "\n" + text)
    ok2, text2 = befehl(aufgabe_befehl(), 60)
    if ok2:
        return True, ("✅ Eingerichtet (einfache Variante): täglich 02:30 startet krypto-auto.bat. Achtung: Windows startet sie dann "
                      "nicht auf Akku und holt verpasste Läufe nicht nach.\n" + nk_text + "\n" + text2)
    return False, "❌ Einrichten fehlgeschlagen:\n" + text + "\n" + text2 + "\n" + nk_text


def aufgabe_da(befehl=None, name=None):
    """True/False auf Windows, None anderswo. name: die Aufgabe (Standard: die tägliche; AUFGABE_NK = die Nachkontrolle)."""
    if os.name != "nt" and befehl is None:
        return None
    ok, _ = (befehl or _befehl)(["schtasks", "/query", "/tn", name or AUFGABE], 20)
    return ok


def aktion(name, starter=None, befehl=None):
    """Führt eine Knopf-Aktion aus → Protokoll-Eintrag {zeit, aktion, titel, ok, text}. starter: für Tests."""
    if name not in AKTIONEN:
        raise KeyError(name)
    args, zeit, titel = AKTIONEN[name]
    with _SPERRE:
        if name in _LAUFEND:
            return {"aktion": name, "titel": titel, "ok": False, "text": "Läuft schon — bitte warten.", "besetzt": True}
        _LAUFEND[name] = time.time()
    try:
        starter = starter or _skript
        if name == "auto_an":
            ok, text = True, notaus_aus().replace("Not-Aus aufgehoben", "Auto-Handel an")
        elif name == "auto_aus":
            ok, text = True, pause_an()
        elif name.startswith("risiko_"):
            import pilot_kern as K
            stufe = {"risiko_1": 1.0, "risiko_1_5": 1.5, "risiko_1_75": 1.75, "risiko_2": 2.0}[name]
            gesetzt = umgebung().get("KRYPTO_RISIKO")
            if gesetzt:  # zuerst prüfen: sonst läge eine nie bestätigte Stufe gespeichert und wirkte später still
                ok, text = False, (f"KRYPTO_RISIKO={gesetzt} ist als Umgebungsvariable gesetzt und hat Vorrang — NICHTS geändert. "
                                   "Erst entfernen (setx KRYPTO_RISIKO \"\"), dann nochmals wählen.")
            else:
                K.EINSTELLUNGEN.parent.mkdir(parents=True, exist_ok=True)
                K.EINSTELLUNGEN.write_text(json.dumps({"risiko": stufe, "geaendert": datetime.now(timezone.utc).isoformat(timespec="seconds")}) + "\n",
                                           encoding="utf-8")
                r = K.risiko({}, K.EINSTELLUNGEN)
                ok, text = True, (f"Risiko-Stufe {r['stufe']:g}×: Schwankungsziel {r['ziel_vol'] * 100:.0f} %, Hebel höchstens {r['max_hebel']:g}×. "
                                  "Gilt ab dem nächsten Lauf." + ("" if stufe == 1 else " Achtung: im Test deutlich tiefere Einbrüche als mit 1×."))
        elif name == "handeln" and (notaus_env_aktiv() or PAUSE.exists()):
            ok, text = False, ("Not-Aus ist aktiv — erst Auto-Handel einschalten." if notaus_env_aktiv()
                               else "Auto-Handel ist aus (Pause) — erst einschalten.")
        elif name == "selbsttest":
            teile, ok = [], True
            for t in SELBSTTESTS:
                o, out = starter([t], zeit)
                ok = ok and o
                teile.append(f"{t}: {out.strip().splitlines()[-1] if out.strip() else 'keine Ausgabe'}")
            text = "\n".join(teile)
        elif name == "aufgabe":
            if os.name != "nt" and befehl is None:
                ok, text = False, ("Die Aufgabenplanung gibt es nur unter Windows. Linux/Mac: crontab -e und eintragen:\n"
                                   f"30 2 * * * cd {ROOT} && {sys.executable} tools/trading/krypto_bot/pilot.py --lauf")
            else:
                ok, text = aufgabe_einrichten(befehl)
                _AUFGABE_CACHE["zeit"] = 0.0  # Ampel sofort neu prüfen, nicht erst nach 5 Minuten
        elif name == "update":
            # Die Bots schreiben eingecheckte Kursdateien (tools/trading/daten) bei jedem Lauf neu; als «lokale Änderung»
            # würden sie git pull blockieren. Es sind nur Zwischenspeicher — der nächste Lauf lädt sie frisch.
            (befehl or _befehl)(["git", "checkout", "--", "tools/trading/daten"], 60)
            ok, text = (befehl or _befehl)(["git", "pull", "--ff-only"], zeit)
            if ok and "Already up to date" not in text and "Bereits aktuell" not in text:
                text += "\n\n→ Neue Version geladen. Cockpit-Fenster schliessen und cockpit.bat neu starten, damit alles wirkt."
            elif not ok:
                text = "Update fehlgeschlagen (eigene Änderungen im Ordner? Internet? Anmeldung bei GitHub?):\n" + text
        elif name == "bericht":
            import pilot as PI
            import signale as SG
            t = PI.wochenbericht(PI.lies(), datetime.now(timezone.utc).date().isoformat(), erzwingen=True)
            ok, text = (True, t + "\n\n→ gesendet (Telegram/ntfy, falls eingerichtet)") if t else (False, "Noch kein Kontostand — erst ein Lauf mit Futures-Schlüssel.")
            if t:
                SG.push(t + "\nKeine Anlageberatung.")
        else:
            ok, text = starter(args, zeit)
            if name == "handeln":  # (16. Prüfung) wie krypto-auto.bat: danach die Nachkontrolle von Pilot 2.0 (klärt Unklares, holt fehlende Stops nach, auch nach einem Zeitlimit-Abbruch)
                try:
                    nachkontrolle_starten()
                except Exception:  # noqa: BLE001 — nicht startbar: der nächste Lauf prüft ohnehin
                    pass
            if name == "backtest":
                _BACKTEST.clear()  # neue Kursdateien: Diagramm beim nächsten Abruf neu rechnen (nicht erst nach Neustart)
    finally:
        with _SPERRE:
            _LAUFEND.pop(name, None)
    e = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "aktion": name, "titel": titel, "ok": ok, "text": text[-6000:]}
    PROTOKOLL.appendleft(e)
    return e


# ───────────────────────── Profit (Binance-Konto, nur lesen) ─────────────────────────
_PROFIT, _PROFIT_SPERRE = {"zeit": 0.0, "daten": None}, threading.Lock()


def profit_stand(max_alter=14.0, abrufen=None):
    """Profit vom Konto, höchstens alle max_alter Sekunden neu abgefragt (mehrere offene Fenster teilen sich den Abruf)."""
    with _PROFIT_SPERRE:
        if _PROFIT["daten"] is None or time.time() - _PROFIT["zeit"] > max_alter:
            if abrufen is None:
                import profit as PR
                abrufen = PR.abrufen
            try:
                _PROFIT["daten"] = abrufen()
            except Exception as ex:  # noqa: BLE001
                _PROFIT["daten"] = {"hinweis": f"Profit nicht lesbar: {type(ex).__name__}"}
            _PROFIT["zeit"] = time.time()
        return _PROFIT["daten"]


# ───────────────────────── Daten fürs Cockpit ─────────────────────────
_BACKTEST = {}


def backtest_kurven():
    """Pilot (BTC 150 + ETH 200 + MVRV-Bremse) gegen Bitcoin halten ab 2019 — nur aus dem Zwischenspeicher, einmal je Start."""
    if "k" in _BACKTEST:
        return _BACKTEST["k"]
    try:
        import info_pruefung as IP
        import pilot_kern as K
        import pilot_pruefung as P
        daten = HIER.parent / "daten"
        if not ((daten / "BTC-USD_hlc.json").exists() and (daten / "ETH-USD_hlc.json").exists()):
            _BACKTEST["k"] = None
            return None
        tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([P.ohlc("BTC-USD"), P.ohlc("ETH-USD")])
        zb = IP.filter_z(K.roh_hebel(cb, n_sma=150), *IP.bremsen("mvrv_tief", IP.flaggen("btc", tage, nur_speicher=True)))
        ze = IP.filter_z(K.roh_hebel(ce, n_sma=200), *IP.bremsen("mvrv_tief", IP.flaggen("eth", tage, nur_speicher=True)))
        a = next(i for i, t in enumerate(tage) if t >= "2019-01-01")
        wb, _ = P.lauf(zb, hb, lb, cb, a, len(cb), K.STOP_SIGMA)
        we, _ = P.lauf(ze, he, le, ce, a, len(ce), K.STOP_SIGMA)
        halten = [cb[i] / cb[a - 1] for i in range(a - 1, len(cb))]  # echtes Halten (Spot), kein Perpetual mit Funding
        t = tage[a:]
        schritt = max(1, len(t) // 400)  # höchstens ~400 Punkte
        mix = P.mix_taeglich(wb, we)  # täglich neu aufgeteilt, wie live
        _BACKTEST["k"] = {"Pilot": [[t[i], round(mix[i], 4)] for i in range(0, len(t), schritt)],
                          "BTC halten": [[t[i], round(halten[i], 4)] for i in range(0, len(t), schritt)]}
    except Exception:  # noqa: BLE001
        _BACKTEST["k"] = None
    return _BACKTEST["k"]


def konto_anteil(env):
    """Welcher Teil des Kontos der Pilot einsetzt (KI_BOT_ANTEIL, Standard 0,5). Die Testzahlen je Stufe gelten für das GANZE Konto —
    bei 50 % wirken Rendite und Einbruch aufs Gesamtkonto etwa halb so stark. None, wenn nicht lesbar."""
    try:
        import broker_futures as BF
        return BF.einstellungen(env)["anteil"]
    except Exception:  # noqa: BLE001
        return None


def stufen_test():
    """Testzahlen je Risiko-Stufe für Anzeige und Rückfrage. Quelle: der Max-Profit-Prüfstand (ab 2020 und ab 2022, dazu die
    Wahrscheinlichkeit eines Jahres mit Einbruch unter −60 %); fehlt eine Stufe dort, der ältere Hebel-Prüfstand (ab 2019)."""
    mp = _json("krypto-maxprofit-pruefung.json", {}).get("kandidaten", {})
    hb = _json("krypto-hebel-pruefung.json", {}).get("varianten", {})
    out = {}
    for st, kand, alt in ((1.0, "F-1", "B alles × 1×"), (1.5, "F-1.5", "B alles × 1.5×"), (1.75, "F-1.75", None), (2.0, "F-2", "B alles × 2×")):
        k = mp.get(kand)
        if k and all(x in k for x in ("cagr_oos", "einbruch_oos", "cagr_2022", "einbruch_2022")):
            out[f"{st:g}"] = {"2020–heute": {"cagr": k["cagr_oos"], "einbruch": k["einbruch_oos"]},
                              "2022–heute": {"cagr": k["cagr_2022"], "einbruch": k["einbruch_2022"]}}
            if k.get("p_einbruch60") is not None:
                out[f"{st:g}"]["p60"] = k["p_einbruch60"]
        elif alt:
            v = hb.get(alt, {})
            out[f"{st:g}"] = {f: {"cagr": v[f]["cagr"], "einbruch": v[f]["einbruch"]} for f in ("2019–heute", "2022–heute") if f in v}
        else:
            out[f"{st:g}"] = {}
    return out


def stand(env=None):
    env = umgebung() if env is None else env
    import ki_trader as KT
    import pilot as PI
    lb = _json("krypto-pilot.json", {"entscheide": [], "kontostand": []})
    lb.setdefault("entscheide", [])
    lb.setdefault("kontostand", [])
    maerkte = {}
    for e in lb["entscheide"]:
        maerkte[e.get("markt", "BTC")] = e
    ks = PI.kontostand_modus(lb["kontostand"])  # Testnetz und Echtgeld nie mischen
    konto = None
    if ks:
        jetzt, start, spitze = ks[-1]["kapital"], ks[0]["kapital"], max(x["kapital"] for x in ks)
        vor7 = [x for x in ks if (datetime.fromisoformat(ks[-1]["tag"]) - datetime.fromisoformat(x["tag"])).days >= 7]
        konto = {"wert": jetzt, "seit_start": jetzt / start - 1 if start else None,
                 "seit_woche": jetzt / vor7[-1]["kapital"] - 1 if vor7 and vor7[-1]["kapital"] else None,
                 "unter_hoch": jetzt / spitze - 1 if spitze else None, "start_tag": ks[0]["tag"],
                 "modus": ks[-1].get("modus", "testnetz")}
    auftraege = []
    for p in reversed(_json("ki-bot-broker.json", [])):
        if p.get("broker") != "binance-futures":
            continue
        for a in p.get("auftraege", []):
            auftraege.append({"zeit": p["zeit"], "symbol": p.get("symbol"), "modus": p.get("modus"), "trocken": p.get("trocken"),
                              "seite": a.get("seite"), "menge": a.get("menge"), "nur_verkleinern": a.get("reduce_only"),
                              "status": a.get("status") or a.get("fehler") or ("trocken" if p.get("trocken") else ""),
                              "fehler": bool(a.get("fehler"))})
        if p.get("hinweis") and not p.get("auftraege"):
            auftraege.append({"zeit": p["zeit"], "symbol": p.get("symbol"), "modus": p.get("modus"), "hinweis": p["hinweis"]})
        if len(auftraege) >= 25:
            break
    try:
        import infos as I
        lage = I.lagebild(nur_speicher=True)
    except Exception:  # noqa: BLE001
        lage = {}
    ki = _json("ki-trader.json", {"entscheide": []})
    vgl = {}
    if ki.get("entscheide"):
        try:
            reihen = KT.kurse_laden(offline=True)
            vgl = KT.vergleich(ki, lb["entscheide"], {c: dict(reihen[c]) for c in KT.COINS})
        except Exception:  # noqa: BLE001
            vgl = {}
    import pilot_kern as K
    risiko = {"stufe": K.risiko()["stufe"], "test": stufen_test(), "anteil": konto_anteil(env)}
    sam = _json("eth-sammler.json", {})
    echt_futures = (env.get("BINANCE_FUTURES_TESTNET") or "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == "JA, MIT ECHTEM GELD"
    echt_spot = (env.get("BINANCE_TESTNET") or "true").strip().lower() == "false" and env.get("KI_BOT_ECHTGELD", "") == "JA, MIT ECHTEM GELD"
    buch = sam.get("echtgeld" if echt_spot else "testnetz", {"kaeufe": [], "gestakt": []})
    kaeufe = buch.get("kaeufe", [])
    sammler = None
    if kaeufe:
        # «unklar» gebuchte Käufe (Antwort verloren) haben 0 ETH: aus Ø-Preis und Gewinn heraushalten, getrennt zeigen
        klar = [k for k in kaeufe if not k.get("unklar")]
        unklar = [k for k in kaeufe if k.get("unklar")]
        usdt, eth = sum(k["usdt"] for k in klar), sum(k["eth"] for k in klar)
        sammler = {"kaeufe": len(kaeufe), "eingesetzt": round(usdt, 2), "eth": round(eth, 6), "schnitt": round(usdt / eth, 2) if eth else None,
                   "gestakt": round(sum(s["eth"] for s in buch.get("gestakt", [])), 4), "letzte": kaeufe[-8:],
                   "unklar": len(unklar), "unklar_usdt": round(sum(k["usdt"] for k in unklar), 2),
                   "modus": "ECHTGELD" if echt_spot else "TESTNETZ"}
    gesund = gesundheit(env, lb, ki)
    return {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modus": "ECHTGELD" if echt_futures else "TESTNETZ",
            "modus_spot": "ECHTGELD" if echt_spot else "TESTNETZ",
            "gesundheit": gesund,
            "notaus": notaus_env_aktiv(env), "pause": PAUSE.exists(), "maerkte": [maerkte[m] for m in PI.MAERKTE if m in maerkte], "konto": konto,
            "kontostand": [[x["tag"], x["kapital"]] for x in ks], "auftraege": auftraege, "lage": lage,
            "ki": {"letzter": ki["entscheide"][-1] if ki.get("entscheide") else None, "vergleich": vgl,
                   "kosten": round(sum(x.get("kosten_usd", 0) for x in ki.get("entscheide", [])), 2)},
            "sammler": sammler, "backtest": backtest_kurven(), "risiko": risiko, "telegram": bool(env.get("TELEGRAM_BOT_TOKEN") and env.get("TELEGRAM_CHAT_ID")),
            "calls": calls_stand()}


def calls_stand():
    """Telegram-Calls fürs Cockpit: Schatten-Bilanz je Gruppe, letzte Calls, Prüfung (None, wenn nie eingerichtet)."""
    import calls_kopierer as CK
    if not ((DATA / "calls-kopierer.json").exists() or (DATA / "calls-pruefung.json").exists()):
        return None
    try:
        return CK.stand(DATA / "calls-kopierer.json", DATA / "calls-pruefung.json")
    except Exception as ex:  # noqa: BLE001
        return {"hinweis": f"Calls nicht lesbar: {type(ex).__name__}", "gruppen": {}, "letzte": []}


_AUFGABE_CACHE = {"zeit": 0.0, "wert": None}


def nk_serie(jetzt=None):
    """(20. Prüfung) Die Reihe gleichartiger Durchgänge der Nachkontrolle (data/krypto-nachkontrolle-serie.json, von `pilot.py --nachkontrolle --einmal` geführt) → {art, anzahl, seit, zeit}
    oder None, wenn die Datei fehlt, kaputt oder älter als NK_LEBT_MAX_MIN ist (dann sagt sie nichts über die Gegenwart)."""
    jetzt = time.time() if jetzt is None else jetzt
    try:
        d = json.loads((DATA / NK_SERIE).read_text())
        serie = {"art": str(d["art"]), "anzahl": int(d["anzahl"]), "seit": float(d["seit"]), "zeit": float(d["zeit"])}
    except Exception:  # noqa: BLE001 — fehlt/kaputt: keine Reihe
        return None
    return serie if 0 <= jetzt - serie["zeit"] <= NK_LEBT_MAX_MIN * 60 else None


def gesundheit(env, lb, ki, heute=None):
    """Ampel-Liste: was läuft, was fehlt. Jeder Punkt: {name, ok (True/False/None = Info), text}; ein grauer Punkt mit warnung=True ist eine WARNUNG (zählt in der Kopfzeile mit)."""
    heute = heute or datetime.now(timezone.utc).date()
    punkte = []

    def p(name, ok, text, warnung=False):
        punkte.append({"name": name, "ok": ok, "text": text, **({"warnung": True} if warnung else {})})

    p("Futures-Schlüssel (Pilot)", bool(env.get("BINANCE_FUTURES_API_KEY") and env.get("BINANCE_FUTURES_API_SECRET")),
      "gesetzt" if env.get("BINANCE_FUTURES_API_KEY") else "fehlt — ohne Schlüssel nur Probeläufe")
    if env.get("ETH_SPARPLAN_BETRAG"):
        p("ETH-Sparplan", bool(env.get("BINANCE_API_KEY")), f"an: {env['ETH_SPARPLAN_BETRAG']} USDT" if env.get("BINANCE_API_KEY")
          else "eingeschaltet, aber BINANCE_API_KEY (Spot) fehlt")
    else:
        p("ETH-Sparplan", None, "aus (einschalten: setx ETH_SPARPLAN_BETRAG \"50\")")
    if env.get("ANTHROPIC_API_KEY"):
        letzte_ki = max((x.get("stand", "") for x in (ki or {}).get("entscheide", [])), default="")
        alt_ki = (heute - datetime.fromisoformat(letzte_ki).date()).days if letzte_ki else None
        p("Claude (KI-Trader)", alt_ki is not None and alt_ki <= 2, f"letzte Einschätzung {letzte_ki}" if letzte_ki and alt_ki <= 2
          else (f"letzte Einschätzung {alt_ki} Tage alt — Guthaben/Schlüssel prüfen" if letzte_ki else "noch keine Einschätzung"))
    else:
        p("Claude (KI-Trader)", None, "nicht gesetzt (optional)")
    p("Handy-Nachrichten", True if (env.get("TELEGRAM_BOT_TOKEN") and env.get("TELEGRAM_CHAT_ID")) or env.get("KI_BOT_NTFY") else None,
      "Telegram" if env.get("TELEGRAM_BOT_TOKEN") else "ntfy" if env.get("KI_BOT_NTFY") else "nicht eingerichtet (optional)")
    letzte = max((e.get("stand", "") for e in lb.get("entscheide", [])), default="")
    if letzte:
        alt = (heute - datetime.fromisoformat(letzte).date()).days
        p("Letzter Pilot-Lauf", alt <= 2, f"Tagesstand {letzte}" + ("" if alt <= 2 else f" — {alt} Tage alt: läuft der tägliche Start?"))
    else:
        p("Letzter Pilot-Lauf", False, "noch nie — Knopf «Probelauf» oder krypto-auto.bat starten")
    ll = lb.get("letzter_lauf")
    if ll and ll.get("zeit"):
        alt = (heute - datetime.fromisoformat(ll["zeit"]).date()).days
        warn = next((h for h in ll.get("hinweise", []) if "⚠️" in h or "❌" in h), "") or "Warnung (siehe Handy-Nachricht)"
        p("Letzter Lauf mit Aufträgen", bool(ll.get("ok")) and alt <= 2,
          f"{ll['zeit'][:16].replace('T', ' ')} UTC — " + ("ohne Warnung" if ll.get("ok") else warn[:200])
          + ("" if alt <= 2 else f" — {alt} Tage alt"))
    elif env.get("BINANCE_FUTURES_API_KEY"):
        p("Letzter Lauf mit Aufträgen", None, "noch keiner — kommt mit dem ersten Lauf ohne «Probe»")
    auto = _json("krypto-auto-status.json", None)
    if isinstance(auto, dict) and auto.get("zeit"):
        alt = (heute - datetime.fromisoformat(auto["zeit"]).date()).days
        p("Täglicher Lauf (krypto-auto.bat)", bool(auto.get("ok")) and alt <= 2,
          f"{auto['zeit'][:16].replace('T', ' ')} UTC — " + (auto.get("text") or ("ok" if auto.get("ok") else "Fehler"))[:200]
          + ("" if alt <= 2 else f" — {alt} Tage alt: läuft der PC um 02:30?"))
    if env.get("TELEGRAM_CALL_GRUPPEN"):
        lebt = _json("calls/leser-lebt.json", None)
        if isinstance(lebt, dict) and lebt.get("zeit"):
            minuten = (datetime.now(timezone.utc) - datetime.fromisoformat(lebt["zeit"])).total_seconds() / 60
            p("Telegram-Calls mitlesen", minuten < 15, f"läuft ({', '.join(lebt.get('gruppen', []))})" if minuten < 15
              else f"seit {minuten / 60:.0f} Std. still — calls.bat läuft nicht?")
        else:
            p("Telegram-Calls mitlesen", False, "noch nie gelaufen — calls.bat starten")
    na = notaus_env_aktiv(env)
    p("Not-Aus", not na, "aus" if not na else "AKTIV — der Pilot schliesst seine Positionen, nichts Neues"
      + (" (Variable KI_BOT_STOP=1 — aufheben: setx KI_BOT_STOP \"\")" if env.get("KI_BOT_STOP") == "1" and not STOP.exists() else ""))
    p("Auto-Handel", not PAUSE.exists(), "an" if not PAUSE.exists() else "aus (Pause) — es wird nicht gehandelt, Positionen bleiben")
    if os.name == "nt":
        if time.time() - _AUFGABE_CACHE["zeit"] > 300:
            _AUFGABE_CACHE.update({"zeit": time.time(), "wert": aufgabe_da(), "wert_nk": aufgabe_da(name=AUFGABE_NK)})
        da = _AUFGABE_CACHE["wert"]
        p("Täglicher Start (Aufgabenplanung)", da, "eingerichtet (02:30)" if da else "fehlt — Knopf «Täglich automatisch einrichten»")
        da_nk = _AUFGABE_CACHE.get("wert_nk")  # (17. Prüfung W4) ohne sie läuft die Nachkontrolle nur hinter dem Tageslauf — stirbt der mit dem Prozess, bleibt ein Markt bis morgen ohne Stop
        # Der Starter läuft UNSICHTBAR (kein Konsolenfenster alle 10 Minuten) — ein stiller Ausfall (Windows Script Host gesperrt, Virenscanner, falscher Pfad) wäre sonst nicht zu sehen: das Lebenszeichen zeigt es
        try:
            minuten_nk = (time.time() - (DATA / NK_LEBT).stat().st_mtime) / 60
        except OSError:
            minuten_nk = None
        if not da_nk:
            p("Nachkontrolle (Aufgabenplanung)", da_nk, "fehlt — Knopf «Täglich automatisch einrichten» legt sie mit an")
        elif minuten_nk is None:
            p("Nachkontrolle (Aufgabenplanung)", None, "eingerichtet (alle 10 Minuten), noch kein Lauf gesehen — bis zu 10 Minuten warten, dann sollte hier ein Lebenszeichen stehen")
        elif minuten_nk > NK_LEBT_MAX_MIN:
            p("Nachkontrolle (Aufgabenplanung)", False, f"eingerichtet, aber seit {minuten_nk:.0f} Min. kein Lauf — läuft der unsichtbare Starter ({NK_STARTER}) nicht? "
              "Aufgabenplanung → «Krypto-Pilot-Nachkontrolle» → Verlauf ansehen, Windows Script Host und Virenscanner prüfen")
        else:
            rc_nk, rc_alter = None, None  # (18. Prüfung K5) das Lebenszeichen schreibt die Bat VOR Python — ein abstürzendes `pilot.py --nachkontrolle` liess die Ampel grün; der Rückgabewert steht NACH dem Lauf in NK_RC
            try:
                rc_datei = DATA / NK_RC
                rc_alter = (time.time() - rc_datei.stat().st_mtime) / 60
                if rc_alter <= NK_LEBT_MAX_MIN:
                    m_rc = re.search(r"rc=(-?\d+)\s*$", rc_datei.read_text(errors="replace").strip())  # (19. Prüfung) auch negative Rückgabewerte (NTSTATUS bei Kill/Absturz) sind ein Absturz
                    rc_nk = int(m_rc.group(1)) if m_rc else None
            except OSError:
                rc_nk = None
            serie = nk_serie()  # (20. Prüfung) die Reihe der letzten Durchgänge: seit wann steht eine Warnung, wie lange war die Sperre besetzt
            if serie is not None and rc_alter is not None and (time.time() - serie["zeit"]) / 60 - rc_alter > NK_SERIE_VORSPRUNG_MIN:
                serie = None  # überholt: die Bat hat nach dem letzten Eintrag einen Durchgang ohne pilot.py beendet (kein Buch) — ein alter Stand «besetzt ×4» bliebe sonst bis zu 30 Minuten rot
            if minuten_nk > NK_ENDE_MAX_MIN and (rc_alter is None or rc_alter > minuten_nk):
                # (19. Prüfung K5) jeder Start schreibt NACH seinem Ende einen neuen Rückgabewert (auch «ohne Buch»): ist der letzte Start älter als NK_ENDE_MAX_MIN und der Rückgabewert älter als er, ging der Durchgang nie zu Ende
                # (hängt, oder das Zeitlimit der Aufgabe beendet ihn jedes Mal) — das Lebenszeichen allein zeigte «läuft»
                p("Nachkontrolle (Aufgabenplanung)", False, f"gestartet vor {minuten_nk:.0f} Min., aber der Durchgang ist nie zu Ende gegangen (kein neuer Rückgabewert) — hängt er oder beendet ihn das Zeitlimit der Aufgabe? "
                  "Aufgabenplanung → «Krypto-Pilot-Nachkontrolle» → Verlauf und data\\krypto-nachkontrolle.log ansehen")
            elif (rc_alter is None or rc_alter > NK_LEBT_MAX_MIN) and minuten_nk > NK_DURCHGANG_MAX_MIN:
                # (20. Prüfung, klein 1) das Lebenszeichen ist frisch, der Rückgabewert aber älter als drei Takte (oder gar nicht da): die Durchgänge gehen seit einer halben Stunde nicht mehr zu Ende — vorher stand die Ampel in den ersten
                # 15 Minuten nach jedem Start grün (rund 43 % der Zeit), wenn das Zeitlimit der Aufgabe jeden Durchgang abbrach, und blieb es ganz, wenn die Rückgabewert-Datei nie erneuert wurde (Code-Review: auch wenn sie fehlte)
                rc_wort = "es gibt noch gar keinen Rückgabewert" if rc_alter is None else f"der letzte Rückgabewert ist {rc_alter:.0f} Min. alt"
                p("Nachkontrolle (Aufgabenplanung)", False, f"gestartet vor {minuten_nk:.0f} Min., aber {rc_wort} — die Durchgänge gehen nicht zu Ende (hängt es, oder beendet das Zeitlimit der Aufgabe jeden?) "
                  "Aufgabenplanung → «Krypto-Pilot-Nachkontrolle» → Verlauf und data\\krypto-nachkontrolle.log ansehen")
            elif rc_nk not in (None, 0, 3):
                p("Nachkontrolle (Aufgabenplanung)", False, f"läuft (zuletzt vor {minuten_nk:.0f} Min.), aber `pilot.py --nachkontrolle` endete mit Rückgabewert {rc_nk} — Absturz? data\\krypto-nachkontrolle.log ansehen")
            elif rc_nk == 3:
                # (19. Prüfung) eine Dauerwarnung («Markt weiterhin nicht vollständig gesichert») ist nicht «grün» — grau mit Text, der Push kommt höchstens einmal je Stunde
                # (20. Prüfung, wichtig 1) … und sie steht in der Kopfzeile (warnung=True); hält sie über NK_WARN_ROT Durchgänge in Folge an, ist sie rot — ein Markt, den zwei Durchgänge nacheinander nicht sichern konnten, braucht einen Menschen
                n_warn = serie["anzahl"] if serie and serie["art"] == "warnung" else 1
                if n_warn >= NK_WARN_ROT:
                    seit_min = max(0.0, (time.time() - serie["seit"]) / 60)
                    p("Nachkontrolle (Aufgabenplanung)", False, f"läuft (zuletzt vor {minuten_nk:.0f} Min.), aber die WARNUNG (Rückgabewert 3: ein Markt nicht vollständig gesichert oder ein Auftrag noch unklar) steht seit {n_warn} Durchgängen "
                      f"in Folge (rund {seit_min:.0f} Min.) — bitte im Binance-Konto prüfen; Handy-Nachricht und data\\krypto-nachkontrolle.log ansehen")
                else:
                    p("Nachkontrolle (Aufgabenplanung)", None, f"läuft (zuletzt vor {minuten_nk:.0f} Min.), der letzte Durchgang meldete eine WARNUNG (Rückgabewert 3: ein Markt nicht vollständig gesichert oder ein Auftrag noch unklar) — Handy-Nachricht und data\\krypto-nachkontrolle.log ansehen",
                      warnung=True)
            elif serie and serie["art"] == "besetzt" and serie["anzahl"] >= NK_BESETZT_ROT:
                # (20. Prüfung, klein 8) ein überspringender Durchgang (die Sperre hält ein anderer Lauf) endet mit Rückgabewert 0 — hielte den Hauptfaden des Halters etwas an (angeklicktes Konsolenfenster), lebt sein Herzschlag weiter und
                # niemand prüft mehr
                seit_min = max(0.0, (time.time() - serie["seit"]) / 60)
                p("Nachkontrolle (Aufgabenplanung)", False, f"die letzten {serie['anzahl']} Durchgänge (rund {seit_min:.0f} Min.) wurden übersprungen: die Lauf-Sperre hält ein anderer Lauf — hängt der Tageslauf oder die lange Nachkontrolle "
                  "(ein angeklicktes Konsolenfenster hält ein Programm an)? Fenster ansehen, Taste drücken oder schliessen; data\\krypto-nachkontrolle.log ansehen")
            else:
                p("Nachkontrolle (Aufgabenplanung)", True, f"eingerichtet (alle 10 Minuten), zuletzt vor {minuten_nk:.0f} Min."
                  + (f" — der letzte Durchgang wurde übersprungen (Lauf-Sperre belegt, {serie['anzahl']}×)" if serie and serie["art"] == "besetzt" else ""))
    mvrv = HIER.parent / "daten" / "info_mvrv_btc.json"
    if mvrv.exists():
        stunden = (time.time() - mvrv.stat().st_mtime) / 3600
        p("Markt-Infos", stunden < 72, f"vor {stunden:.0f} Std. geladen" + ("" if stunden < 72 else " — Knopf «Markt-Infos»"))
    return punkte


# ───────────────────────── Webserver (nur 127.0.0.1) ─────────────────────────
class Cockpit(BaseHTTPRequestHandler):
    port = 8765

    def _senden(self, code, daten, typ="application/json; charset=utf-8"):
        b = daten if isinstance(daten, bytes) else json.dumps(daten, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", typ)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")  # keine fremde Seite darf das Cockpit einbetten (Clickjacking)
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(b)

    def _host_ok(self):
        """DNS-Rebinding: eine fremde Seite, deren Name plötzlich auf 127.0.0.1 zeigt, schickt ihren eigenen Host-Kopf."""
        return (self.headers.get("Host") or "").lower() in {f"127.0.0.1:{self.port}", f"localhost:{self.port}"}

    def do_GET(self):
        if not self._host_ok():
            return self._senden(403, {"fehler": "falscher Host — Cockpit nur über http://127.0.0.1"})
        pfad = urllib.parse.urlparse(self.path).path
        if pfad in ("/", "/index.html"):
            return self._senden(200, SEITE.read_bytes(), "text/html; charset=utf-8")
        if pfad in ("/markt", "/markt.html"):
            return self._senden(200, MARKT.read_bytes(), "text/html; charset=utf-8")
        if pfad == "/api/profit":
            return self._senden(200, profit_stand())
        if pfad == "/api/protokoll":
            jetzt = time.time()
            return self._senden(200, {"protokoll": list(PROTOKOLL), "laufend": [
                {"aktion": n, "titel": AKTIONEN[n][2], "sekunden": round(jetzt - t)} for n, t in sorted(_LAUFEND.items())]})
        if pfad == "/api/stand":
            try:
                return self._senden(200, stand())
            except Exception as ex:  # noqa: BLE001
                return self._senden(500, {"fehler": type(ex).__name__})
        return self._senden(404, {"fehler": "nicht gefunden"})

    def do_POST(self):
        # Schutz gegen fremde Webseiten: eigener Kopf (löst im Browser eine Vorabfrage aus, die wir nicht beantworten)
        herkunft = self.headers.get("Origin")
        erlaubt = {f"http://127.0.0.1:{self.port}", f"http://localhost:{self.port}"}
        if not self._host_ok() or self.headers.get("X-Cockpit") != "1" or (herkunft and herkunft not in erlaubt):
            return self._senden(403, {"fehler": "verboten"})
        pfad = urllib.parse.urlparse(self.path).path
        if pfad not in ("/api/notaus", "/api/aktion"):
            return self._senden(404, {"fehler": "nicht gefunden"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            daten = json.loads(self.rfile.read(n).decode() or "{}")
        except ValueError:
            return self._senden(400, {"fehler": "ungültig"})
        if pfad == "/api/aktion":
            name = str(daten.get("aktion", ""))
            if name not in AKTIONEN:
                return self._senden(400, {"fehler": "unbekannte Aktion"})
            if name in _LAUFEND:
                return self._senden(409, {"fehler": "läuft schon"})
            # Im Hintergrund: manche Läufe dauern Minuten (erster Abruf der Markt-Infos), der Browser fragt das Protokoll ab
            threading.Thread(target=aktion, args=(name,), daemon=True).start()
            return self._senden(202, {"gestartet": name})
        an = bool(daten.get("an"))
        meldung = notaus_an() if an else notaus_aus()
        PROTOKOLL.appendleft({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "aktion": "notaus" if an else "auto_an",
                              "titel": "Not-Aus" if an else "Not-Aus aufgehoben", "ok": "NICHT ALLES" not in meldung, "text": meldung})
        return self._senden(200, {"meldung": meldung, "notaus": STOP.exists()})

    def log_message(self, *a):
        pass


# ───────────────────────── Telegram ─────────────────────────
def befehl(text):
    """Antworttext auf einen Telegram-Befehl (None = ignorieren)."""
    b = (text or "").strip().split()[0].split("@")[0].lower() if (text or "").strip() else ""
    if b in ("/start", "/hilfe", "/help"):
        return HILFE
    if b == "/profit":
        import profit as PR
        return PR.text(profit_stand())  # gemeinsamer Zwischenspeicher + Sperre mit den Cockpit-Fenstern
    if b == "/stop":
        return notaus_an()
    if b == "/weiter":
        return notaus_aus()
    if b == "/status":
        import pilot as PI
        teile = [PI.text(PI.entscheid(m, offline=True)) for m in PI.maerkte()]  # Kurse aus dem Speicher: schnell
        return "\n".join(teile) + ("\n🛑 Not-Aus ist aktiv." if STOP.exists() else "")
    if b == "/konto":
        import pilot as PI
        return PI.wochenbericht(PI.lies(), datetime.now(timezone.utc).date().isoformat(), erzwingen=True) or "Noch kein Kontostand."
    if b == "/ki":
        import ki_trader as KT
        ki = KT.lies()
        return KT.stand_text(ki, KT.vergleich(ki, KT.pilot_entscheide(), {c: dict(r) for c, r in KT.kurse_laden(offline=True).items()}))
    if b == "/lage":
        import infos as I
        return "Lagebild (nur Info, Stand des letzten Laufs): " + I.text(I.lagebild(nur_speicher=True))
    if b == "/news":
        import news_waechter as NW
        return NW.letzte()
    if b == "/calls":
        import calls_kopierer as CK
        s = calls_stand()
        return CK.stand_text(s) if s and s.get("gruppen") is not None else "📣 Telegram-Calls: noch nicht eingerichtet (calls_leser.py)."
    return None


SOFORT = {"/stop", "/weiter", "/hilfe", "/help", "/start"}  # Not-Aus nie hinter langsamen Info-Befehlen einreihen


def _tg_senden(url, chat, text):
    daten = urllib.parse.urlencode({"chat_id": chat, "text": text[:4000]}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(f"{url}/sendMessage", data=daten), timeout=15).close()
    except Exception:  # noqa: BLE001
        pass


def _rueckstau_ueberspringen(url, chat):
    """Was ankam, während das Cockpit aus war, wird NICHT ausgeführt (ein altes /weiter dürfte sonst einen Not-Aus
    aufheben) — unabhängig von der PC-Uhr: der letzte Eintrag (offset=-1) gibt die Stelle, ab der gelesen wird.
    Wirft bei Netzfehler: dann wird es später nochmals versucht und bis dahin NICHTS ausgeführt."""
    with urllib.request.urlopen(f"{url}/getUpdates?{urllib.parse.urlencode({'offset': -1, 'timeout': 0})}", timeout=20) as r:
        letzte = json.load(r).get("result", [])
    if not letzte:
        return None
    m = letzte[-1].get("message") or {}
    if str((m.get("chat") or {}).get("id")) == chat and (m.get("text") or "").startswith("/"):
        _tg_senden(url, chat, f"⏳ «{m['text'][:40]}» kam, als das Cockpit aus war — aus Sicherheit NICHT ausgeführt. "
                              "Bitte jetzt nochmals senden.")
    return letzte[-1]["update_id"] + 1


def telegram_schleife(env=None, basis="https://api.telegram.org", runden=None, warte=50):
    """Liest Befehle per getUpdates. Nur Nachrichten aus TELEGRAM_CHAT_ID; der Rückstau vor dem Start wird übersprungen.
    /stop und /weiter laufen sofort; Info-Befehle (/lage, /status, /profit …) nebenher, einer nach dem anderen."""
    env = os.environ if env is None else env
    token, chat = env.get("TELEGRAM_BOT_TOKEN", ""), str(env.get("TELEGRAM_CHAT_ID", ""))
    if not token or not chat:
        return
    url = f"{basis.rstrip('/')}/bot{token}"
    offset, n, bereit = None, 0, False
    nebenher = runden is None  # in Tests alles der Reihe nach
    arbeit = queue.Queue()

    def ausfuehren(text):
        try:
            antwort = befehl(text)
        except Exception as ex:  # noqa: BLE001
            antwort = f"Fehler: {type(ex).__name__}"
        if antwort:
            _tg_senden(url, chat, antwort)

    def arbeiter():
        while True:
            ausfuehren(arbeit.get())

    if nebenher:
        threading.Thread(target=arbeiter, daemon=True).start()
    while runden is None or n < runden:
        n += 1
        if not bereit:
            try:
                offset, bereit = _rueckstau_ueberspringen(url, chat), True
            except Exception:  # noqa: BLE001 — Netz noch nicht da: warten, NICHTS ausführen
                time.sleep(5 if runden is None else 0)
                continue
        try:
            q = {"timeout": warte} | ({"offset": offset} if offset is not None else {})
            with urllib.request.urlopen(f"{url}/getUpdates?{urllib.parse.urlencode(q)}", timeout=warte + 15) as r:
                updates = json.load(r).get("result", [])
        except Exception:  # noqa: BLE001 — Netz weg: kurz warten, weiter
            time.sleep(5 if runden is None else 0)
            continue
        for u in updates:
            offset = u["update_id"] + 1
            m = u.get("message") or {}
            if str((m.get("chat") or {}).get("id")) != chat:
                continue
            text = m.get("text", "") or ""
            b = text.strip().split()[0].split("@")[0].lower() if text.strip() else ""
            if b in SOFORT or not nebenher:
                ausfuehren(text)
            else:
                arbeit.put(text)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--kein-browser", action="store_true")
    ap.add_argument("--ohne-telegram", action="store_true")
    ap.add_argument("--ohne-news", action="store_true")
    a = ap.parse_args()
    Cockpit.port = a.port
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Cockpit)
    adresse = f"http://127.0.0.1:{a.port}"
    print(f"Krypto-Cockpit läuft: {adresse}  (Fenster schliessen = Cockpit aus; die Bots laufen unabhängig davon)")
    if os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID") and not a.ohne_telegram:
        threading.Thread(target=telegram_schleife, daemon=True).start()
        print("Telegram-Steuerung aktiv: /status /konto /ki /lage /stop /weiter")
    if not a.ohne_news:
        import news_waechter as NW
        import signale as SG
        threading.Thread(target=NW.schleife, args=(SG.push,), daemon=True).start()
        print(f"News-Wächter aktiv: prüft alle {NW.NEWS_MINUTEN} Minuten, Alarme kommen aufs Handy (/news zeigt die letzten).")
    if not a.kein_browser:
        import webbrowser
        threading.Timer(1.0, lambda: webbrowser.open(adresse)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
