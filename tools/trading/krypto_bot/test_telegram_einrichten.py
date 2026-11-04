#!/usr/bin/env python3
"""Tests für den Telegram-Einrichter — gegen einen SIMULIERTEN Telegram-Server auf 127.0.0.1, ohne Netz, ohne echten Token:
python3 tools/trading/krypto_bot/test_telegram_einrichten.py

Kernfragen: Findet er NUR deinen Chat (Einmalcode, nur privat, nur Menschen, keine Weiterleitung) und bindet er ihn an die Person AM PC (zweite Zahl)?
Steht der Token jemals in einer Ausgabe, einer Fehlermeldung oder einem Traceback? Speichert er nichts, wenn etwas schiefgeht, und sagt er es ehrlich?
Verschluckt er nie einen /stop? Und kommt er mit Netzfehlern, falschem Token, Webhook und einem zweiten Leser (Cockpit) zurecht?"""
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
    """Ein simulierter Telegram-Server: getMe, getUpdates (bestätigt nichts, wenn kein offset kommt), sendMessage; mit einstellbaren Pannen."""

    def __init__(self, token=TOKEN, updates=None):
        self.token, self.updates = token, list(updates or [])
        self.gesendet, self.anfragen, self.update_parameter = [], [], []
        self.fehler_409 = None             # None oder der Text der 409-Beschreibung
        self.netz_weg = 0                  # so viele getUpdates-Aufrufe antworten zuerst mit 500
        self.sende_fehler = False
        self.sende_fehler_ab = 0           # sendMessage scheitert erst ab der n-ten Nachricht (0 = nie früh)
        self.pfad_in_beschreibung = False  # ein «böser» Server, der den Pfad (mit Token) in der Fehlerbeschreibung wiederholt
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
                        beschr = "Unauthorized" + (": " + p.path if t.pfad_in_beschreibung else "")
                        return self._antwort(401, {"ok": False, "error_code": 401, "description": beschr})
                    meth = m.group(2)
                    if meth == "getMe":
                        return self._antwort(200, {"ok": True, "result": {"id": 1, "is_bot": True, "username": "MeinTestBot"}})
                    if meth == "getUpdates":
                        t.update_parameter.append(dict(q))
                        if t.fehler_409:
                            return self._antwort(409, {"ok": False, "error_code": 409, "description": t.fehler_409})
                        if t.netz_weg > 0:
                            t.netz_weg -= 1
                            return self._antwort(500, {"ok": False, "description": "kaputt"})
                        off = int(q.get("offset", 0) or 0)
                        if "offset" in q:                       # wie bei Telegram: ein offset bestätigt (löscht) alles davor
                            t.updates = [u for u in t.updates if u["update_id"] >= off]
                        return self._antwort(200, {"ok": True, "result": list(t.updates)})
                    if meth == "sendMessage":
                        if t.sende_fehler or (t.sende_fehler_ab and len(t.gesendet) + 1 >= t.sende_fehler_ab):
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


def nachricht(uid, chat_id, text, typ="private", bot=False, vorname="Anna", von_id=None, **extra):
    vid = von_id if von_id is not None else (chat_id if chat_id > 0 else 999)
    m = {"message_id": uid, "chat": {"id": chat_id, "type": typ}, "from": {"id": vid, "is_bot": bot, "first_name": vorname}, "text": text}
    m.update(extra)
    return {"update_id": uid, "message": m}


def zahl_aus_telegram(tg, chat):
    """Wie ein Mensch: die Bestätigungszahl aus der letzten Nachricht lesen, die AN DIESEN CHAT ging."""
    for c, text in reversed(tg.gesendet):
        mt = re.search(r"Bestätigung: (\d{4})", text or "")
        if c == chat and mt:
            return mt.group(1)
    return ""


class Uhr:
    """Falsche Uhr: jedes Schlafen und jede Abfrage lässt sie weiterlaufen (der Test wartet nie wirklich)."""

    def __init__(self):
        self.t = 0.0

    def __call__(self):
        self.t += 0.01
        return self.t

    def schlafen(self, s):
        self.t += s


def lauf(tg, token=TOKEN, warte_s=180, speichern=None, env=None, code=CODE, eingabe=None, chat_des_besitzers="4242"):
    """Ein Durchlauf. `eingabe` None = der Besitzer liest die Zahl aus seinem Telegram (dem Chat «4242») und tippt sie richtig ein."""
    ausgabe, gespeichert, fragen = [], [], []

    def spei(n, w):
        gespeichert.append((n, w))
        return (speichern(n, w) if speichern else (True, "gespeichert"))

    def tippen(frage):
        fragen.append(frage)
        return eingabe(frage) if eingabe else zahl_aus_telegram(tg, chat_des_besitzers)
    uhr = Uhr()
    rc = T.lauf(token, ausgabe=ausgabe.append, basis=tg.basis, speichern=spei, code=code, warte_s=warte_s, uhr=uhr, schlafen=uhr.schlafen, env={} if env is None else env, eingabe=tippen)
    return rc, "\n".join(ausgabe), gespeichert, fragen


# ───────────────────────── 1) Form, Code, Namen, Beschreibungen ─────────────────────────
for t_ in (TOKEN, "1234567:" + "A" * 30, "123456789012:" + "a_-" * 12):
    pruefe(f"Token-Form ok: {t_[:12]}…", T.token_form_ok(t_))
for t_ in ("", None, "abc", "123456789", "123456789:", "123456789:kurz", "12345:" + "A" * 35, "1234567890123:" + "A" * 35, "123456789:" + "A" * 51, "123456789:" + "A" * 35 + " ", " 123456789:" + "A" * 35,
           "x23456789:" + "A" * 35, "123456789:" + "A" * 34 + "!", "https://api.telegram.org/bot123456789:" + "A" * 35, "123456789:" + "A" * 35 + "\n", "١٢٣٤٥٦٧٨٩:" + "A" * 35):
    pruefe(f"Token-Form falsch: {t_!r}"[:60], not T.token_form_ok(t_))
codes = {T.neuer_code() for _ in range(300)}
pruefe("Code: sechs Zeichen Gross-Hex, 300 Stück alle verschieden", len(codes) == 300 and all(re.fullmatch(r"[0-9A-F]{6}", c) for c in codes))
pruefe("Namen: Steuerzeichen, Klammern und Umkehr der Schreibrichtung fliegen raus, Buchstaben und Umlaute bleiben", T._sauber("Anna\x1b[31m\u202eÄ-ö_x.") == "Anna31mÄ-ö_x.", T._sauber("Anna\x1b[31m\u202eÄ-ö_x."))
pruefe("Namen: ESC und U+202E sind weg", "\x1b" not in T._sauber("A\x1b[0m‮B") and "‮" not in T._sauber("A‮B") and T._sauber("A‮B") == "AB")
pruefe("Namen: höchstens 40 Zeichen, None und Zahlen gehen", len(T._sauber("x" * 100)) == 40 and T._sauber(None) == "" and T._sauber(12) == "12")
pruefe("Beschreibung: der Token wird geschwärzt, auch in der Form «bot<Zahl>:<Schlüssel>»", T._ohne_token(f"Not Found: /bot{TOKEN}/getMe", TOKEN) == "Not Found: /bot***/getMe"
       and T._ohne_token("x /bot111111111:" + "Z" * 35 + "/y") == "x /bot***/y" and TOKEN not in T._ohne_token(TOKEN + TOKEN, TOKEN))

# ───────────────────────── 2) Welche Nachrichten zählen? ─────────────────────────
def zaehlt(m):
    return T.nachricht_zaehlt(m, CODE)


gut = nachricht(1, 4242, CODE)["message"]
pruefe("Nachricht zählt: privat, Mensch, Chat = Absender, Code genau", zaehlt(gut))
pruefe("Nachricht zählt: Kleinschrift und Leerzeichen", zaehlt(nachricht(1, 4242, " a1b2c3\n")["message"]))
NEIN = {
    "Code plus etwas": nachricht(1, 4242, CODE + "X")["message"], "Code nur als Teil": nachricht(1, 4242, "mein Code: " + CODE)["message"], "falscher Text": nachricht(1, 4242, "hallo")["message"],
    "Gruppe": nachricht(1, -100123, CODE, typ="group")["message"], "Supergruppe": nachricht(1, -100123, CODE, typ="supergroup")["message"], "Kanal": nachricht(1, -100123, CODE, typ="channel")["message"],
    "von einem Bot": nachricht(1, 4242, CODE, bot=True)["message"], "ohne is_bot-Angabe": {**gut, "from": {"id": 4242, "first_name": "Anna"}},
    "weitergeleitet (forward_origin)": nachricht(1, 4242, CODE, forward_origin={"type": "user"})["message"], "weitergeleitet (forward_from)": nachricht(1, 4242, CODE, forward_from={"id": 5})["message"],
    "weitergeleitet (forward_date)": nachricht(1, 4242, CODE, forward_date=1)["message"], "weitergeleitet (forward_sender_name)": nachricht(1, 4242, CODE, forward_sender_name="X")["message"],
    "über einen Bot (via_bot)": nachricht(1, 4242, CODE, via_bot={"id": 7})["message"], "für einen Kanal (sender_chat)": nachricht(1, 4242, CODE, sender_chat={"id": -1})["message"],
    "automatisch weitergeleitet": nachricht(1, 4242, CODE, is_automatic_forward=True)["message"],
    "negative Chat-Nummer (privat)": nachricht(1, -5, CODE, von_id=-5)["message"], "Chat-Nummer null": nachricht(1, 0, CODE, von_id=0)["message"],
    "Absender ≠ Chat": nachricht(1, 4242, CODE, von_id=777)["message"], "Chat-Nummer als Text": {**gut, "chat": {"id": "4242", "type": "private"}, "from": {"id": "4242", "is_bot": False}},
    "Chat-Nummer als Wahrheitswert": {**gut, "chat": {"id": True, "type": "private"}, "from": {"id": True, "is_bot": False}}, "ohne from": {k: v for k, v in gut.items() if k != "from"},
    "ohne chat": {k: v for k, v in gut.items() if k != "chat"}, "chat kein Objekt": {**gut, "chat": 5}, "from kein Objekt": {**gut, "from": "Anna"}, "text keine Zeichenkette": {**gut, "text": 123},
    "ohne text": {k: v for k, v in gut.items() if k != "text"}, "Beschriftung statt Text": {**{k: v for k, v in gut.items() if k != "text"}, "caption": CODE}, "Nachricht ist None": None, "Nachricht ist Liste": [gut],
}
for n_, m_ in NEIN.items():
    pruefe(f"Nachricht zählt NICHT: {n_}", zaehlt(m_) is False, m_)

# ───────────────────────── 3) Der gute Weg ─────────────────────────
tg = Telegram(updates=[
    nachricht(10, -100123, CODE, typ="group"),                      # Gruppe mit dem Code: zählt nicht
    nachricht(11, 777, "hallo"),                                    # privat, falscher Text
    nachricht(12, 888, CODE, bot=True, vorname="Spam"),             # ein Bot schickt den Code: zählt nicht
    nachricht(13, 999, CODE + "X"),                                 # Code plus etwas: zählt nicht
    nachricht(14, 4242, " a1b2c3 \n"),                              # du: Leerzeichen und Kleinschrift sind egal
    nachricht(15, 555, CODE, vorname="Fremder"),                    # ein zweiter echter Mensch NACH dir: du warst zuerst
    nachricht(16, 4242, "/stop"),                                   # ein /stop von dir, während der Einrichtung
])
env = {}
rc, aus, gesp, fragen = lauf(tg, env=env)
pruefe("Gut: Rückgabewert 0", rc == 0, aus)
pruefe("Gut: es wählt den Chat von «Anna» (4242), nicht Gruppe, Bot, Fremde", ("TELEGRAM_CHAT_ID", "4242") in gesp and all(w != "555" for n, w in gesp))
pruefe("Gut: Token zuerst, dann die Chat-Nummer; beide im Fenster gesetzt", gesp == [("TELEGRAM_BOT_TOKEN", TOKEN), ("TELEGRAM_CHAT_ID", "4242")] and env == {"TELEGRAM_BOT_TOKEN": TOKEN, "TELEGRAM_CHAT_ID": "4242"})
pruefe("Gut: zwei Nachrichten an 4242: erst die Bestätigungszahl, dann die Testnachricht mit /uebersicht und /stop", len(tg.gesendet) == 2 and all(c == "4242" for c, _ in tg.gesendet) and tg.gesendet[0][1].startswith("Bestätigung: ")
       and "/uebersicht" in tg.gesendet[1][1] and "/stop" in tg.gesendet[1][1], tg.gesendet)
pruefe("Gut: die Zahl wird im Fenster abgefragt (eine Frage) und der Code und der Bot-Name stehen auf dem Bildschirm", len(fragen) == 1 and "Bestätigungszahl" in fragen[0] and CODE in aus and "@MeinTestBot" in aus)
pruefe("Gut: der TOKEN steht in keiner Zeile der Ausgabe", TOKEN not in aus and TOKEN.split(":")[1] not in aus and "AAEhBOweik" not in aus, aus)
pruefe("Gut: Abschluss nennt das Neuöffnen des Cockpits, der Anfang das Schliessen", "cockpit.bat neu öffnen" in aus and "zuerst schliessen" in aus)
pruefe("Gut: Reihenfolge der Telegram-Aufrufe getMe → getUpdates → sendMessage (Zahl) → sendMessage (Test)", tg.anfragen[0] == "getMe" and "getUpdates" in tg.anfragen and tg.anfragen[-2:] == ["sendMessage", "sendMessage"])
pruefe("Gut: es wird NIE ein offset gesendet und nichts bestätigt: das /stop und alle anderen Nachrichten liegen noch für das Cockpit bereit",
       all("offset" not in p_ for p_ in tg.update_parameter) and len(tg.updates) == 7 and any(u["message"]["text"] == "/stop" for u in tg.updates), (tg.update_parameter[:2], len(tg.updates)))
tg.stopp()

# ───────────────────────── 4) Die Anmeldung gehört der Person am PC ─────────────────────────
tg = Telegram(updates=[nachricht(1, 555, CODE, vorname="Fremder"), nachricht(2, 4242, CODE)])
rc, aus, gesp, fragen = lauf(tg, eingabe=lambda frage: "0000")   # der Besitzer sieht die Zahl nicht: sie ging an den Fremden
pruefe("Fremder zuerst: die Zahl geht NUR an den Fremden (555), der Besitzer tippt etwas anderes → 1, nichts gespeichert, keine Testnachricht",
       rc == 1 and gesp == [] and [c for c, _ in tg.gesendet] == ["555"] and "Abgebrochen" in aus, (rc, tg.gesendet, aus))
pruefe("Fremder zuerst: der Token steht nicht in der Ausgabe", TOKEN not in aus)
tg.stopp()
for falsch in ("", "abc", "12345", " ", "0000"):
    tg = Telegram(updates=[nachricht(1, 4242, CODE)])
    zahl_echt = {}

    def tippe_falsch(frage, falsch=falsch, tg=tg):
        zahl_echt["z"] = zahl_aus_telegram(tg, "4242")
        return falsch if falsch != zahl_echt["z"] else "9999" if zahl_echt["z"] != "9999" else "8888"
    rc, aus, gesp, _ = lauf(tg, eingabe=tippe_falsch)
    pruefe(f"Falsche Zahl {falsch!r}: 1, nichts gespeichert, nur die Bestätigungsnachricht gesendet", rc == 1 and gesp == [] and len(tg.gesendet) == 1 and "nicht die Zahl" in aus, (rc, aus))
    tg.stopp()
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
rc, aus, gesp, _ = lauf(tg, eingabe=lambda frage: " " + zahl_aus_telegram(tg, "4242") + " \n")
pruefe("Richtige Zahl mit Leerzeichen und Zeilenende geht", rc == 0 and len(gesp) == 2)
tg.stopp()
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.sende_fehler = True
rc, aus, gesp, fragen = lauf(tg)
pruefe("Die Bestätigungszahl lässt sich nicht senden (403): 1, nichts gespeichert, keine Frage am PC", rc == 1 and gesp == [] and fragen == [] and "Bestätigungszahl ging nicht raus" in aus, aus)
tg.stopp()

# ───────────────────────── 5) Nachrichten, die NICHT zählen, führen zu «nichts gefunden» ─────────────────────────
for n_, m_ in (("weitergeleitet", nachricht(1, 4242, CODE, forward_origin={"type": "user"})), ("über einen Bot", nachricht(1, 4242, CODE, via_bot={"id": 7})), ("Gruppe", nachricht(1, -100123, CODE, typ="group")),
               ("von einem Bot", nachricht(1, 4242, CODE, bot=True)), ("bearbeitet", {"update_id": 1, "edited_message": nachricht(1, 4242, CODE)["message"]}),
               ("Kanalbeitrag", {"update_id": 1, "channel_post": nachricht(1, -100123, CODE, typ="channel")["message"]})):
    tg = Telegram(updates=[m_])
    rc, aus, gesp, fragen = lauf(tg, warte_s=20)
    pruefe(f"Nur «{n_}»: Rückgabewert 2, nichts gespeichert, keine Zahl gesendet", rc == 2 and gesp == [] and tg.gesendet == [] and fragen == [], (rc, aus))
    tg.stopp()

# ───────────────────────── 6) Falsches, Fehler ─────────────────────────
tg = Telegram()
rc, aus, gesp, _ = lauf(tg, token="123456789:" + "B" * 35)
pruefe("Falscher Token (401): Rückgabewert 1, nichts gespeichert, Text «kennt diesen Token nicht»", rc == 1 and gesp == [] and "kennt diesen Token nicht" in aus and tg.gesendet == [], aus)
pruefe("Falscher Token: er steht nicht in der Ausgabe", ("B" * 35) not in aus)
n_vor = len(tg.anfragen)
rc, aus, gesp, _ = lauf(tg, token="abc")
pruefe("Falsche Form: 1, keine einzige Anfrage an Telegram, nichts gespeichert", rc == 1 and len(tg.anfragen) == n_vor and gesp == [] and "Bot-Token" in aus)
rc, aus, gesp, _ = lauf(tg, warte_s=30)
pruefe("Kein Code kommt an: Rückgabewert 2, nichts gespeichert, keine Testnachricht, Hinweis auf privaten Chat", rc == 2 and gesp == [] and tg.gesendet == [] and "privaten Chat" in aus, aus)
tg.stopp()

tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.fehler_409 = "Conflict: terminated by other getUpdates request; make sure that only one bot instance is running"
rc, aus, gesp, _ = lauf(tg)
pruefe("Zweiter Leser (409): 1, nichts gespeichert, Hinweis auf das laufende Cockpit", rc == 1 and gesp == [] and "Cockpit" in aus and "woanders" in aus, aus)
tg.fehler_409 = "Conflict: can't use getUpdates method while webhook is active; use deleteWebhook to delete the webhook first"
rc, aus, gesp, _ = lauf(tg)
pruefe("Webhook (409): eigener Text über den Webhook, NICHT «Cockpit schliessen»", rc == 1 and gesp == [] and "Webhook" in aus and "Cockpit-Fenster schliessen" not in aus, aus)
tg.stopp()

tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.netz_weg = 3
rc, aus, gesp, _ = lauf(tg)
pruefe("Netz wackelt (3× HTTP 500): er versucht es weiter und findet den Chat", rc == 0 and ("TELEGRAM_CHAT_ID", "4242") in gesp, aus)
tg.stopp()
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.netz_weg = 10_000
rc, aus, gesp, _ = lauf(tg)
pruefe("Netz nach getMe ganz weg (HTTP 500 ohne Ende): nach sechs Fehlern in Folge 1 und «nicht erreichbar» (nicht still 2 «Es kam nichts an»)", rc == 1 and gesp == [] and "nicht erreichbar" in aus and "Es kam nichts an" not in aus, aus)
pruefe("Netz weg: genau sechs getUpdates-Versuche, dann Schluss", len(tg.update_parameter) == T.MAX_NETZFEHLER, len(tg.update_parameter))
tg.stopp()

# Speichern: erst der Token, dann die Chat-Nummer; ehrliche Texte
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
rc, aus, gesp, _ = lauf(tg, speichern=lambda n, w: (False, "setx gibt es nur unter Windows") if n == "TELEGRAM_CHAT_ID" else (True, "gespeichert"), env={})
pruefe("Chat-Nummer lässt sich nicht speichern: 1, der Token IST gespeichert (das sagt der Text), Handbefehl mit der Chat-Nummer, KEIN «verbunden» an Telegram",
       rc == 1 and "Der Token ist gespeichert, die Chat-Nummer NICHT" in aus and 'setx TELEGRAM_CHAT_ID "4242"' in aus and len(tg.gesendet) == 1 and TOKEN not in aus, (rc, aus, tg.gesendet))
tg.stopp()
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
env = {}
rc, aus, gesp, _ = lauf(tg, speichern=lambda n, w: (False, "kaputt"), env=env)
pruefe("Token lässt sich nicht speichern: 1, die Chat-Nummer wird GAR NICHT erst versucht, Umgebung leer, kein «verbunden»", rc == 1 and gesp == [("TELEGRAM_BOT_TOKEN", TOKEN)] and env == {} and len(tg.gesendet) == 1, (rc, gesp, env))
pruefe("Token lässt sich nicht speichern: der Handbefehl nennt nur den Platzhalter <token>, nie den Token", "<token>" in aus and TOKEN not in aus, aus)
tg.stopp()
tg = Telegram(updates=[nachricht(1, 4242, CODE)])
tg.sende_fehler_ab = 2                    # die Zahl geht (1. Nachricht), die Testnachricht (2.) nicht
rc, aus, gesp, _ = lauf(tg)
pruefe("Testnachricht scheitert (403): 1, aber alles ist gespeichert, und der Text sagt NICHT «von Hand setx», sondern «Alles ist gespeichert»", rc == 1 and len(gesp) == 2 and "Alles ist gespeichert" in aus and "von Hand" not in aus, aus)
tg.stopp()

# Netz ganz weg: Basis zeigt auf einen geschlossenen Port
tot = Telegram()
tot_basis = tot.basis
tot.stopp()
ausgabe_, uhr_ = [], Uhr()
rc_ = T.lauf(TOKEN, ausgabe=ausgabe_.append, basis=tot_basis, speichern=lambda n, w: (True, "x"), code=CODE, warte_s=10, uhr=uhr_, schlafen=uhr_.schlafen, env={}, eingabe=lambda f: "")
aus_ = "\n".join(ausgabe_)
pruefe("Server weg: 1, «nicht erreichbar», Token nirgends", rc_ == 1 and "nicht erreichbar" in aus_ and TOKEN not in aus_, aus_)

# ───────────────────────── 7) Der Token steht auch in Ausnahmen nie ─────────────────────────
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
tg = Telegram()
tg.pfad_in_beschreibung = True
falsch_token = "123456789:" + "D" * 35
try:
    T.api(tg.basis, falsch_token, "getMe")
    pruefe("Böser Server: api() wirft", False)
except T.TelegramFehler as ex:
    pruefe("Böser Server wiederholt den Pfad MIT Token in der Beschreibung: geschwärzt in .text und im Traceback", ("D" * 35) not in ex.text and "bot***" in ex.text and ("D" * 35) not in "".join(traceback.format_exception(type(ex), ex, ex.__traceback__)), ex.text)
ausgabe_, uhr_ = [], Uhr()
T.lauf(falsch_token, ausgabe=ausgabe_.append, basis=tg.basis, speichern=lambda n, w: (True, "x"), code=CODE, warte_s=10, uhr=uhr_, schlafen=uhr_.schlafen, env={}, eingabe=lambda f: "")
pruefe("Böser Server: auch die Ausgabe des Programms enthält den Token nicht", ("D" * 35) not in "\n".join(ausgabe_), ausgabe_)
tg.stopp()

# ───────────────────────── 8) Namen aus Telegram werden sauber ausgegeben ─────────────────────────
tg = Telegram(updates=[nachricht(1, 4242, CODE, vorname="Anna\x1b[31m‮Evil")])
rc, aus, gesp, _ = lauf(tg)
pruefe("Vorname mit ESC und Umkehrzeichen: nichts davon landet auf dem Bildschirm", rc == 0 and "\x1b" not in aus and "‮" not in aus and "Gefunden: Chat von Anna31mEvil" in aus, aus)
tg.stopp()

# ───────────────────────── 9) setx ─────────────────────────
_alt_name, _alt_run = os.name, subprocess.run
aufrufe = []


def falsches_run(args, **kw):
    aufrufe.append((list(args), dict(kw)))
    return subprocess.CompletedProcess(args, falsches_run.rc, stdout=None, stderr=None)


try:
    os.name = "posix"
    ok_, text_ = T.setx("A", "b")
    pruefe("setx: unter Linux/Mac nicht möglich, sagt es", ok_ is False and "Windows" in text_)
    os.name = "nt"
    subprocess.run = falsches_run
    falsches_run.rc = 0
    ok_, text_ = T.setx("TELEGRAM_CHAT_ID", "4242")
    args_, kw_ = aufrufe[-1]
    pruefe("setx: Windows: genau [setx, Name, Wert] ohne Shell, ok bei Rückgabewert 0", ok_ and args_ == ["setx", "TELEGRAM_CHAT_ID", "4242"] and not kw_.get("shell"))
    pruefe("setx: die Ausgabe von setx wird NICHT gelesen und nie dekodiert (kein text=, kein capture_output, Ausgabe nach DEVNULL)", kw_.get("stdout") == subprocess.DEVNULL and kw_.get("stderr") == subprocess.DEVNULL
           and "text" not in kw_ and "capture_output" not in kw_ and "universal_newlines" not in kw_ and "encoding" not in kw_, kw_)
    falsches_run.rc = 1
    ok_, text_ = T.setx("TELEGRAM_BOT_TOKEN", TOKEN)
    pruefe("setx: Fehlschlag wird gemeldet, ohne den Wert zu nennen", ok_ is False and TOKEN not in text_ and "1" in text_)

    def wirft_os(args, **kw):
        raise OSError("setx nicht gefunden: " + " ".join(args))
    subprocess.run = wirft_os
    ok_, text_ = T.setx("TELEGRAM_BOT_TOKEN", TOKEN)
    pruefe("setx: fehlt das Programm, wird nur der Ausnahme-Typ genannt (nicht der Text mit dem Wert)", ok_ is False and text_ == "OSError" and TOKEN not in text_)

    def wirft_dekodieren(args, **kw):
        raise UnicodeDecodeError("utf-8", b"\x84", 0, 1, "invalid start byte")
    subprocess.run = wirft_dekodieren
    ok_, text_ = T.setx("TELEGRAM_BOT_TOKEN", TOKEN)
    pruefe("setx: eine Dekodier-Ausnahme (Oem-Zeichentafel) stürzt nicht ab, sondern gilt als Fehlschlag", ok_ is False and text_ == "UnicodeDecodeError")

    def wirft_zeit(args, **kw):
        raise subprocess.TimeoutExpired(args, 30)
    subprocess.run = wirft_zeit
    ok_, text_ = T.setx("TELEGRAM_BOT_TOKEN", TOKEN)
    pruefe("setx: Zeitüberschreitung gilt als Fehlschlag", ok_ is False and text_ == "TimeoutExpired")
finally:
    os.name, subprocess.run = _alt_name, _alt_run

# ───────────────────────── 10) main() ─────────────────────────
class Tastatur(io.StringIO):
    def isatty(self):
        return True


_alt_input, _alt_getpass, _alt_env, _alt_stdin = builtins.input, getpass.getpass, dict(os.environ), sys.stdin
getpass_aufrufe = []
try:
    getpass.getpass = lambda *a, **k: getpass_aufrufe.append(1) or "abc"
    sys.stdin = io.StringIO("")                                         # Rohr statt Tastatur
    ein = io.StringIO()
    with redirect_stdout(ein), redirect_stderr(io.StringIO()):
        rc = T.main([])
    pruefe("main: ohne Tastatur (Rohr, Aufgabenplanung) wird gar nicht gestartet, der Token würde sonst sichtbar", rc == 1 and getpass_aufrufe == [] and "normalen Fenster" in ein.getvalue())
    sys.stdin = Tastatur("")
    for basis_, erlaubt_ in (("http://evil.example", False), ("http://api.telegram.org", False), ("http://127.0.0.1:1234", True), ("https://api.telegram.org", True), ("ftp://x", False), ("http://127.0.0.1.evil.example", True)):
        getpass_aufrufe.clear()
        ein = io.StringIO()
        for k in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"):
            os.environ.pop(k, None)
        with redirect_stdout(ein), redirect_stderr(io.StringIO()):
            rc = T.main(["--basis", basis_])
        abgelehnt = "unverschlüsselt" in ein.getvalue()
        if basis_ == "http://127.0.0.1.evil.example":
            continue                                                    # (Präfix «http://127.0.0.1» passt auch hier: nur für Tests, siehe unten)
        pruefe(f"main: --basis {basis_}: {'erlaubt' if erlaubt_ else 'abgelehnt'} (Token nie im Klartext ins Netz)", abgelehnt is (not erlaubt_) and (getpass_aufrufe == [1]) is erlaubt_, (rc, ein.getvalue()[:80]))
    os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CHAT_ID"] = TOKEN, "4242"
    builtins.input = lambda *a: "n"
    getpass_aufrufe.clear()
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
    builtins.input, getpass.getpass, sys.stdin = _alt_input, _alt_getpass, _alt_stdin
    os.environ.clear()
    os.environ.update(_alt_env)

# ───────────────────────── 11) Die Bat-Datei und der Quelltext ─────────────────────────
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
pruefe("Quelltext: der Token wird nur über getpass gefragt, input() nur für «neu einrichten?»; die Zahl kommt über `eingabe`", quelle.count("getpass.getpass(") == 1 and len(re.findall(r"\binput\(", quelle)) == 1 and 'input("Es ist schon' in quelle and 'eingabe("Bestätigungszahl' in quelle)
pruefe("Quelltext: alle drei Ausnahmen der Schnittstelle werden ohne Verkettung geworfen (`from None`)", len(re.findall(r"raise TelegramFehler\([^\n]*\) from None", quelle)) == 3)
pruefe("Quelltext: nur Standardbibliothek", {n.module for n in ast.walk(baum) if isinstance(n, ast.ImportFrom)} <= {"__future__"} and {a.name for n in ast.walk(baum) if isinstance(n, ast.Import) for a in n.names} <= {"argparse", "getpass", "json", "os", "re", "secrets", "subprocess", "sys", "time", "urllib.error", "urllib.parse", "urllib.request"})
pruefe("Quelltext: Codes stammen von `secrets`", "secrets.token_hex" in quelle and "secrets.randbelow" in quelle and "import random" not in quelle)
pruefe("Quelltext: nur private Chats von Menschen ohne Weiterleitung zählen", '!= "private"' in quelle and "is not False" in quelle and "FREMDE_SPUREN" in quelle and quelle.count("forward_origin") == 1)
pruefe("Quelltext: kein offset in den Aufrufen von getUpdates (nichts wird bestätigt)", '"offset"' not in quelle and "'offset'" not in quelle)
_kw = {k.arg for n in ast.walk(baum) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "run" for k in n.keywords}
pruefe("Quelltext: der Aufruf von subprocess.run liest die Ausgabe nicht (kein capture_output, kein text), Ausgabe nach DEVNULL", _kw == {"stdout", "stderr", "timeout"}, _kw)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
