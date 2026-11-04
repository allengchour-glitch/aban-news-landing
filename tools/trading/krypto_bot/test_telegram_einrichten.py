#!/usr/bin/env python3
"""Tests für den Telegram-Einrichter — gegen einen SIMULIERTEN Telegram-Server auf 127.0.0.1, ohne Netz, ohne echten Token:
python3 tools/trading/krypto_bot/test_telegram_einrichten.py

Kernfragen: Findet er NUR deinen Chat (Einmalcode, nur privat, nur Menschen)? Steht der Token jemals in einer Ausgabe, einer Fehlermeldung oder einem
Traceback? Speichert er nichts, wenn etwas schiefgeht? Und kommt er mit Netzfehlern, falschem Token und einem zweiten Leser (Cockpit) zurecht?"""
from __future__ import annotations

import ast
import builtins
import getpass
import io
import json
import os
import re
import subprocess
import sys
import threading
import traceback
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import telegram_einrichten as T  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}", file=sys.__stdout__)


TOKEN = "123456789:AAEhBOweik6ad9r_QXMENQjcrOTz-abcdefg"       # erfundener Token in der richtigen Form
CODE = "A1B2C3"


class Telegram:
    """Ein simulierter Telegram-Server: getMe, getUpdates (mit offset), sendMessage; mit einstellbaren Pannen."""

    def __init__(self, token=TOKEN, updates=None):
        self.token, self.updates = token, list(updates or [])
        self.gesendet, self.anfragen = [], []
        self.fehler_409 = False
        self.netz_weg = 0                  # so viele getUpdates-Aufrufe antworten zuerst mit 500
        self.sende_fehler = False
        t = self
        lock = threading.Lock()

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _antwort(self, code, daten):
                b = json.dumps(daten).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = urllib.parse.parse_qs(self.rfile.read(n).decode()) if n else {}
                self.do_GET(body)

            def do_GET(self, body=None):
                with lock:
                    p = urllib.parse.urlsplit(self.path)
                    q = {k: v[0] for k, v in urllib.parse.parse_qs(p.query).items()} | {k: v[0] for k, v in (body or {}).items()}
                    m = re.fullmatch(r"/bot([^/]*)/(\w+)", p.path)
                    t.anfragen.append(p.path.split("/")[-1])
                    if not m or m.group(1) != t.token:
                        return self._antwort(401, {"ok": False, "error_code": 401, "description": "Unauthorized"})
                    meth = m.group(2)
                    if meth == "getMe":
                        return self._antwort(200, {"ok": True, "result": {"id": 1, "is_bot": True, "username": "MeinTestBot"}})
                    if meth == "getUpdates":
                        if t.fehler_409:
                            return self._antwort(409, {"ok": False, "error_code": 409, "description": "Conflict: terminated by other getUpdates request"})
                        if t.netz_weg > 0:
                            t.netz_weg -= 1
                            return self._antwort(500, {"ok": False, "description": "kaputt"})
                        off = int(q.get("offset", 0) or 0)
                        t.updates = [u for u in t.updates if u["update_id"] >= off]
                        return self._antwort(200, {"ok": True, "result": list(t.updates)})
                    if meth == "sendMessage":
                        if t.sende_fehler:
                            return self._antwort(403, {"ok": False, "error_code": 403, "description": "Forbidden: bot was blocked by the user"})
                        t.gesendet.append((q.get("chat_id"), q.get("text")))
                        return self._antwort(200, {"ok": True, "result": {}})
                    return self._antwort(404, {"ok": False})

        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.basis = f"http://127.0.0.1:{self.srv.server_address[1]}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def stopp(self):
        self.srv.shutdown()
        self.srv.server_close()


def nachricht(uid, chat_id, text, typ="private", bot=False, vorname="Anna"):
    return {"update_id": uid, "message": {"message_id": uid, "chat": {"id": chat_id, "type": typ}, "from": {"id": chat_id, "is_bot": bot, "first_name": vorname}, "text": text}}


class Uhr:
    """Falsche Uhr: jedes Schlafen und jede Abfrage lässt sie weiterlaufen (der Test wartet nie wirklich)."""

    def __init__(self):
        self.t = 0.0

    def __call__(self):
        self.t += 0.01
        return self.t

    def schlafen(self, s):
        self.t += s


def lauf(tg, token=TOKEN, warte_s=180, speichern=None, env=None, code=CODE):
    ausgabe, gespeichert = [], []

    def spei(n, w):
        gespeichert.append((n, w))
        return (speichern(n, w) if speichern else (True, "gespeichert"))
    uhr = Uhr()
    rc = T.lauf(token, ausgabe=ausgabe.append, basis=tg.basis, speichern=spei, code=code, warte_s=warte_s, uhr=uhr, schlafen=uhr.schlafen, env={} if env is None else env)
    return rc, "\n".join(ausgabe), gespeichert


# ───────────────────────── 1) Form, Code ─────────────────────────
for t_ in (TOKEN, "1234567:" + "A" * 30, "123456789012:" + "a_-" * 12):
    pruefe(f"Token-Form ok: {t_[:12]}…", T.token_form_ok(t_))
for t_ in ("", None, "abc", "123456789", "123456789:", "123456789:kurz", "12345:" + "A" * 35, "1234567890123:" + "A" * 35, "123456789:" + "A" * 51, "123456789:" + "A" * 35 + " ", " 123456789:" + "A" * 35,
           "x23456789:" + "A" * 35, "123456789:" + "A" * 34 + "!", "https://api.telegram.org/bot123456789:" + "A" * 35, "123456789:" + "A" * 35 + "\n"):
    pruefe(f"Token-Form falsch: {t_!r}"[:60], not T.token_form_ok(t_))
codes = {T.neuer_code() for _ in range(300)}
pruefe("Code: sechs Zeichen Gross-Hex, 300 Stück alle verschieden", len(codes) == 300 and all(re.fullmatch(r"[0-9A-F]{6}", c) for c in codes))

# ───────────────────────── 2) Der gute Weg ─────────────────────────
tg = Telegram(updates=[
    nachricht(10, -100123, CODE, typ="group"),                      # Gruppe mit dem Code: zählt nicht
    nachricht(11, 777, "hallo"),                                    # privat, falscher Text
    nachricht(12, 888, CODE, bot=True, vorname="Spam"),             # ein Bot schickt den Code: zählt nicht
    nachricht(13, 999, CODE + "X"),                                 # Code plus etwas: zählt nicht
    nachricht(14, 4242, " a1b2c3 \n"),                              # du: Leerzeichen und Kleinschrift sind egal
    nachricht(15, 555, CODE, vorname="Fremder"),                    # ein zweiter echter Mensch NACH dir: du warst zuerst
])
env = {}
rc, aus, gesp = lauf(tg, env=env)
pruefe("Gut: Rückgabewert 0", rc == 0, aus)
pruefe("Gut: es wählt den Chat von «Anna» (4242), nicht Gruppe, Bot, Fremde", ("TELEGRAM_CHAT_ID", "4242") in gesp and all(w != "555" for n, w in gesp))
pruefe("Gut: beide Werte gespeichert (Token und Chat) und im Fenster gesetzt", gesp == [("TELEGRAM_BOT_TOKEN", TOKEN), ("TELEGRAM_CHAT_ID", "4242")] and env == {"TELEGRAM_BOT_TOKEN": TOKEN, "TELEGRAM_CHAT_ID": "4242"})
pruefe("Gut: Testnachricht an 4242 mit /uebersicht und /stop", len(tg.gesendet) == 1 and tg.gesendet[0][0] == "4242" and "/uebersicht" in tg.gesendet[0][1] and "/stop" in tg.gesendet[0][1], tg.gesendet)
pruefe("Gut: der Code und der Bot-Name stehen auf dem Bildschirm", CODE in aus and "@MeinTestBot" in aus)
pruefe("Gut: der TOKEN steht in keiner Zeile der Ausgabe", TOKEN not in aus and TOKEN.split(":")[1] not in aus and "AAEhBOweik" not in aus, aus)
pruefe("Gut: Abschluss nennt das Neuöffnen des Cockpits", "cockpit.bat neu öffnen" in aus)
pruefe("Gut: Reihenfolge der Telegram-Aufrufe getMe → getUpdates → sendMessage", tg.anfragen[0] == "getMe" and "getUpdates" in tg.anfragen and tg.anfragen[-1] == "sendMessage")
tg.stopp()

# ───────────────────────── 3) Falsches, Fehler ─────────────────────────
tg = Telegram()
rc, aus, gesp = lauf(tg, token="123456789:" + "B" * 35)
pruefe("Falscher Token (401): Rückgabewert 1, nichts gespeichert, Text «kennt diesen Token nicht»", rc == 1 and gesp == [] and "kennt diesen Token nicht" in aus and tg.gesendet == [], aus)
pruefe("Falscher Token: er steht nicht in der Ausgabe", ("B" * 35) not in aus)
n_vor = len(tg.anfragen)
rc, aus, gesp = lauf(tg, token="abc")
pruefe("Falsche Form: 1, keine einzige Anfrage an Telegram, nichts gespeichert", rc == 1 and len(tg.anfragen) == n_vor and gesp == [] and "Bot-Token" in aus)
rc, aus, gesp = lauf(tg, warte_s=30)
pruefe("Kein Code kommt an: Rückgabewert 2, nichts gespeichert, keine Testnachricht, Hinweis auf privaten Chat", rc == 2 and gesp == [] and tg.gesendet == [] and "privaten Chat" in aus, aus)
tg.stopp()

tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.fehler_409 = True
rc, aus, gesp = lauf(tg)
pruefe("Zweiter Leser (409): 1, nichts gespeichert, Hinweis auf das laufende Cockpit", rc == 1 and gesp == [] and "Cockpit" in aus and "woanders" in aus, aus)
tg.stopp()

tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.netz_weg = 3
rc, aus, gesp = lauf(tg)
pruefe("Netz wackelt (3× HTTP 500): er versucht es weiter und findet den Chat", rc == 0 and ("TELEGRAM_CHAT_ID", "4242") in gesp, aus)
tg.stopp()

tg = Telegram(updates=[nachricht(1, 4242, CODE)])
rc, aus, gesp = lauf(tg, speichern=lambda n, w: (False, "setx gibt es nur unter Windows") if n == "TELEGRAM_CHAT_ID" else (True, "gespeichert"), env={})
pruefe("Speichern scheitert für die Chat-Nummer: 1, Warnung, Handbefehl mit der Chat-Nummer aber OHNE den Token", rc == 1 and "TELEGRAM_CHAT_ID ließ sich nicht speichern" in aus and 'setx TELEGRAM_CHAT_ID "4242"' in aus
       and TOKEN not in aus and '<token>' in aus, aus)
tg.stopp()
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
env = {}
rc, aus, gesp = lauf(tg, speichern=lambda n, w: (False, "kaputt"), env=env)
pruefe("Speichern scheitert ganz: 1, die Umgebung des Fensters bleibt leer", rc == 1 and env == {}, (rc, env))
tg.stopp()

tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.sende_fehler = True
rc, aus, gesp = lauf(tg)
pruefe("Testnachricht scheitert (403): 1, Warnung, aber gespeichert ist gespeichert", rc == 1 and "Testnachricht ging nicht raus" in aus and len(gesp) == 2, aus)
tg.stopp()

# Netz ganz weg: Basis zeigt auf einen geschlossenen Port
tot = Telegram()
tot_basis = tot.basis
tot.stopp()
ausgabe_, uhr_ = [], Uhr()
rc_ = T.lauf(TOKEN, ausgabe=ausgabe_.append, basis=tot_basis, speichern=lambda n, w: (True, "x"), code=CODE, warte_s=10, uhr=uhr_, schlafen=uhr_.schlafen, env={})
aus_ = "\n".join(ausgabe_)
pruefe("Server weg: 1, «nicht erreichbar», Token nirgends", rc_ == 1 and "nicht erreichbar" in aus_ and TOKEN not in aus_, aus_)

# ───────────────────────── 4) Der Token steht auch in Ausnahmen nie ─────────────────────────
try:
    T.api(tot_basis, TOKEN, "getMe")
    pruefe("Ausnahme: api() wirft bei totem Server", False)
except T.TelegramFehler as ex:
    spur = "".join(traceback.format_exception(type(ex), ex, ex.__traceback__))
    pruefe("Ausnahme: TelegramFehler mit Code 0, ohne verkettete Ursache (die trüge die Adresse mit dem Token)", ex.code == 0 and ex.__cause__ is None and ex.__suppress_context__, (ex.code, ex.__cause__))
    pruefe("Ausnahme: der ganze Traceback enthält den Token nicht", TOKEN not in spur and "AAEhBOweik" not in spur, spur[-400:])
tg = Telegram()
try:
    T.api(tg.basis, "123456789:" + "C" * 35, "getMe")
    pruefe("Ausnahme 401: api() wirft", False)
except T.TelegramFehler as ex:
    spur = "".join(traceback.format_exception(type(ex), ex, ex.__traceback__))
    pruefe("Ausnahme 401: Code 401, Text «Unauthorized», Token nicht im Traceback", ex.code == 401 and "Unauthorized" in ex.text and ("C" * 35) not in spur and ex.__cause__ is None)
tg.stopp()

# ───────────────────────── 5) setx ─────────────────────────
_alt_name, _alt_run = os.name, subprocess.run
aufrufe = []


def falsches_run(args, **kw):
    aufrufe.append(list(args))
    return subprocess.CompletedProcess(args, falsches_run.rc, stdout="ERFOLGREICH", stderr="")


try:
    os.name = "posix"
    ok_, text_ = T.setx("A", "b")
    pruefe("setx: unter Linux/Mac nicht möglich, sagt es", ok_ is False and "Windows" in text_)
    os.name = "nt"
    subprocess.run = falsches_run
    falsches_run.rc = 0
    ok_, text_ = T.setx("TELEGRAM_CHAT_ID", "4242")
    pruefe("setx: Windows: genau [setx, Name, Wert] ohne Shell, ok bei Rückgabewert 0", ok_ and aufrufe[-1] == ["setx", "TELEGRAM_CHAT_ID", "4242"])
    falsches_run.rc = 1
    ok_, text_ = T.setx("TELEGRAM_BOT_TOKEN", TOKEN)
    pruefe("setx: Fehlschlag wird gemeldet, ohne den Wert zu nennen", ok_ is False and TOKEN not in text_ and "1" in text_)

    def wirft(args, **kw):
        raise OSError("setx nicht gefunden: " + " ".join(args))
    subprocess.run = wirft
    ok_, text_ = T.setx("TELEGRAM_BOT_TOKEN", TOKEN)
    pruefe("setx: fehlt das Programm, wird nur der Ausnahme-Typ genannt (nicht der Text mit dem Wert)", ok_ is False and text_ == "OSError" and TOKEN not in text_)
finally:
    os.name, subprocess.run = _alt_name, _alt_run

# ───────────────────────── 6) main() ─────────────────────────
_alt_input, _alt_getpass, _alt_env = builtins.input, getpass.getpass, dict(os.environ)
getpass_aufrufe = []
try:
    os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CHAT_ID"] = TOKEN, "4242"
    builtins.input = lambda *a: "n"
    getpass.getpass = lambda *a, **k: getpass_aufrufe.append(1) or "abc"
    ein, aus_ = io.StringIO(), io.StringIO()
    with redirect_stdout(ein), redirect_stderr(aus_):
        rc = T.main([])
    pruefe("main: schon eingerichtet und «n»: nichts geändert, Token wird nicht einmal gefragt", rc == 0 and "Nichts geändert" in ein.getvalue() and getpass_aufrufe == [])
    builtins.input = lambda *a: "j"
    with redirect_stdout(ein), redirect_stderr(aus_):
        rc = T.main([])
    pruefe("main: «j»: der Token wird gefragt (verdeckt, über getpass)", getpass_aufrufe == [1] and rc == 1)
    for k in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"):
        os.environ.pop(k, None)
    getpass_aufrufe.clear()
    ein = io.StringIO()
    with redirect_stdout(ein), redirect_stderr(aus_):
        rc = T.main([])
    pruefe("main: noch nichts eingerichtet: keine Rückfrage, Token wird gefragt, schlechte Form → 1", getpass_aufrufe == [1] and rc == 1 and "Bot-Token" in ein.getvalue())
finally:
    builtins.input, getpass.getpass = _alt_input, _alt_getpass
    os.environ.clear()
    os.environ.update(_alt_env)

# ───────────────────────── 7) Die Bat-Datei und der Quelltext ─────────────────────────
bat = (HIER / "telegram-einrichten.bat").read_bytes()
pruefe("Bat: nur CRLF-Zeilenenden", bat.count(b"\n") == bat.count(b"\r\n") > 5)
pruefe("Bat: nur ASCII (kein Zeichensatz-Ärger in cmd)", all(b < 128 for b in bat))
bt = bat.decode("ascii")
pruefe("Bat: wechselt in die Wurzel wie cockpit.bat, ruft den Einrichter und hält am Ende an", 'cd /d "%~dp0\\..\\..\\.."' in bt and "telegram_einrichten.py" in bt and bt.strip().endswith("pause"))
cb = (HIER / "cockpit.bat").read_text(encoding="ascii")
pruefe("Bat: gleiche Python-Suche (py, sonst python) wie cockpit.bat", "where py >nul 2>nul || set PY=python" in bt and "where py >nul 2>nul || set PY=python" in cb)
quelle = (HIER / "telegram_einrichten.py").read_text(encoding="utf-8")
baum = ast.parse(quelle)
pruefe("Quelltext: der Token wird nie in einen f-String der Ausgabe gesetzt", not re.search(r"ausgabe\(f?[\"'][^\n]*\{token\}", quelle) and not re.search(r"print\([^\n]*\{token\}", quelle))
pruefe("Quelltext: kein print(token), keine Ausgabe der Variable `token`", not re.search(r"(?:print|ausgabe)\(\s*token\s*[,)]", quelle))
pruefe("Quelltext: der Token wird nur über getpass gefragt (nie input())", quelle.count("getpass.getpass(") == 1 and len(re.findall(r"\binput\(", quelle)) == 1 and 'input("Es ist schon' in quelle)
pruefe("Quelltext: beide Ausnahmen der Schnittstelle werden ohne Verkettung geworfen (`from None`)", len(re.findall(r"raise TelegramFehler\([^\n]*\) from None", quelle)) == 2)
pruefe("Quelltext: nur Standardbibliothek", {n.module for n in ast.walk(baum) if isinstance(n, ast.ImportFrom)} <= {"__future__"} and {a.name for n in ast.walk(baum) if isinstance(n, ast.Import) for a in n.names} <= {"argparse", "getpass", "json", "os", "re", "secrets", "subprocess", "sys", "time", "urllib.error", "urllib.parse", "urllib.request"})
pruefe("Quelltext: Code stammt von `secrets`", "secrets.token_hex" in quelle and "import random" not in quelle)
pruefe("Quelltext: nur private Chats von Menschen zählen", 'chat.get("type") == "private"' in quelle and 'not von.get("is_bot")' in quelle)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
