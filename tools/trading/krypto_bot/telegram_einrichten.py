#!/usr/bin/env python3
"""Telegram einrichten (einmalig, auf dem PC): verbindet das Krypto-Cockpit mit DEINEM privaten Telegram-Bot.

  Doppelklick auf telegram-einrichten.bat   (oder: py tools\\trading\\krypto_bot\\telegram_einrichten.py)

Ablauf:
  1. In Telegram «@BotFather» öffnen → /newbot → Namen wählen → den langen Token kopieren («123456789:AA…»).
  2. Dieses Programm fragt den Token. Die Eingabe bleibt UNSICHTBAR (richtig so; Rechtsklick fügt ein). Den Token nie in einen Chat schicken.
  3. Es zeigt einen Einmalcode. Du schickst diesen Code deinem neuen Bot. So weiss das Programm sicher, dass DEIN Chat der richtige ist
     (nur wer den Code auf diesem Bildschirm sieht, kann sich als Besitzer eintragen).
  4. Es speichert Token und Chat-Nummer für dein Windows-Benutzerkonto (setx) und schickt eine Testnachricht.
  5. Cockpit-Fenster schliessen und cockpit.bat neu öffnen. Danach in Telegram: /uebersicht, /status, /profit, /handy, /stop …

Der Token steht nie in einer Ausgabe oder Fehlermeldung (Telegram trägt ihn in der Adresse: Fehler werden darum nur als Typ und Nummer gezeigt).
Nur Python-Standardbibliothek; im Test läuft alles gegen einen simulierten Telegram-Server."""
from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASIS = "https://api.telegram.org"
TOKEN_FORM = re.compile(r"\d{6,12}:[A-Za-z0-9_-]{30,50}")
WARTE_S = 180


class TelegramFehler(Exception):
    """Fehler der Telegram-Schnittstelle: .code = HTTP-Nummer (0 = Netz), .text = kurze Beschreibung (nie mit Token)."""

    def __init__(self, code, text=""):
        super().__init__(f"{code} {text}")
        self.code, self.text = code, text


def api(basis, token, methode, params=None, timeout=20):
    """Ruft Telegram auf. Wirft nur TelegramFehler — OHNE die ursprüngliche Ausnahme zu verketten: deren Text und Traceback enthielten die Adresse mit dem Token."""
    url = f"{basis.rstrip('/')}/bot{token}/{methode}"
    daten = urllib.parse.urlencode(params).encode() if params else None
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=daten), timeout=timeout) as r:
            antwort = json.load(r)
    except urllib.error.HTTPError as ex:
        try:
            beschr = str(json.load(ex).get("description", ""))[:120]
        except Exception:  # noqa: BLE001
            beschr = ""
        raise TelegramFehler(ex.code, beschr) from None
    except Exception as ex:  # noqa: BLE001
        raise TelegramFehler(0, type(ex).__name__) from None
    if not isinstance(antwort, dict) or antwort.get("ok") is not True:
        raise TelegramFehler(200, "Telegram sagt nicht ok")
    return antwort


def token_form_ok(token):
    return TOKEN_FORM.fullmatch(token or "") is not None


def bot_name(basis, token):
    """getMe → @Name des Bots (prüft zugleich, dass der Token stimmt). Wirft TelegramFehler."""
    r = api(basis, token, "getMe")
    res = r.get("result") if isinstance(r.get("result"), dict) else {}
    return str(res.get("username") or "")


def neuer_code():
    return secrets.token_hex(3).upper()      # sechs Zeichen, z. B. «A1B2C3»


def chat_finden(basis, token, code, warte_s=WARTE_S, uhr=time.time, schlafen=time.sleep):
    """Wartet, bis in einem PRIVATEN Chat von einem Menschen genau `code` ankommt. → (chat_id, Vorname) oder None (Zeit um).
    Wirft TelegramFehler(409), wenn derselbe Bot schon anderswo gelesen wird (zum Beispiel vom laufenden Cockpit)."""
    ende = uhr() + warte_s
    offset = None
    while uhr() < ende:
        p = {"timeout": 15, "allowed_updates": json.dumps(["message"])}
        if offset is not None:
            p["offset"] = offset
        try:
            r = api(basis, token, "getUpdates", p, timeout=30)
        except TelegramFehler as ex:
            if ex.code in (401, 404, 409):
                raise
            schlafen(2)                       # Netz kurz weg: nochmals versuchen
            continue
        gesehen = False
        for u in r.get("result") or []:
            gesehen = True
            if isinstance(u.get("update_id"), int):
                offset = u["update_id"] + 1
            m = u.get("message") if isinstance(u.get("message"), dict) else {}
            chat = m.get("chat") if isinstance(m.get("chat"), dict) else {}
            von = m.get("from") if isinstance(m.get("from"), dict) else {}
            if chat.get("type") == "private" and not von.get("is_bot") and str(m.get("text", "")).strip().upper() == code.upper() and chat.get("id") is not None:
                return str(chat["id"]), str(von.get("first_name") or "")
        if not gesehen:
            schlafen(0.5)
    return None


def senden(basis, token, chat, text):
    api(basis, token, "sendMessage", {"chat_id": chat, "text": text})


def setx(name, wert):
    """Windows: dauerhaft für dein Benutzerkonto speichern (neue Fenster sehen es). → (ok, kurzer Text ohne den Wert)."""
    if os.name != "nt":
        return False, "setx gibt es nur unter Windows"
    try:
        r = subprocess.run(["setx", name, wert], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError) as ex:
        return False, type(ex).__name__
    return r.returncode == 0, ("gespeichert" if r.returncode == 0 else "setx meldet einen Fehler (Rückgabewert " + str(r.returncode) + ")")


def lauf(token, ausgabe=print, basis=BASIS, speichern=setx, code=None, warte_s=WARTE_S, uhr=time.time, schlafen=time.sleep, env=None):
    """Der ganze Ablauf mit schon eingegebenem Token. → 0 = fertig, 1 = Fehler, 2 = nichts gefunden. Der Token steht in KEINER Ausgabe."""
    env = os.environ if env is None else env
    if not token_form_ok(token):
        ausgabe("❌ Das sieht nicht nach einem Bot-Token aus (richtig wäre «123456789:AA…», mit Doppelpunkt). Bitte bei @BotFather noch einmal nachsehen.")
        return 1
    try:
        name = bot_name(basis, token)
    except TelegramFehler as ex:
        ausgabe("❌ Telegram kennt diesen Token nicht (falsch kopiert?)." if ex.code == 401 else f"❌ Telegram nicht erreichbar ({ex.code} {ex.text}). Internet prüfen und nochmals starten.")
        return 1
    ausgabe(f"✅ Bot gefunden: @{name}" if name else "✅ Bot gefunden.")
    code = code or neuer_code()
    ausgabe(f"\nJetzt in Telegram deinem Bot @{name or 'dein Bot'} diese Nachricht schicken (genau so):\n\n    {code}\n\nIch warte bis zu {warte_s // 60} Minuten …")
    try:
        treffer = chat_finden(basis, token, code, warte_s=warte_s, uhr=uhr, schlafen=schlafen)
    except TelegramFehler as ex:
        ausgabe("❌ Der Bot wird gerade schon woanders gelesen (meist vom laufenden Cockpit). Cockpit-Fenster schliessen und dieses Programm nochmals starten."
                if ex.code == 409 else f"❌ Telegram meldet einen Fehler ({ex.code}).")
        return 1
    if treffer is None:
        ausgabe("⏳ Es kam nichts an. Bitte nochmals starten und den Code deinem Bot in einem privaten Chat schicken (nicht in einer Gruppe).")
        return 2
    chat, vorname = treffer
    ausgabe(f"✅ Gefunden: Chat von {vorname or 'dir'}.")
    fehler = []
    for n, w in (("TELEGRAM_BOT_TOKEN", token), ("TELEGRAM_CHAT_ID", chat)):
        ok, text = speichern(n, w)
        if ok:
            env[n] = w                        # für dieses Fenster; neue Fenster sehen es über setx
        else:
            fehler.append(n)
            ausgabe(f"⚠️ {n} ließ sich nicht speichern ({text}).")
    try:
        senden(basis, token, chat, "✅ Krypto-Cockpit verbunden. Probier /uebersicht, /status, /profit oder /hilfe. Der Not-Aus ist /stop.")
        ausgabe("✅ Testnachricht gesendet: schau in Telegram.")
    except TelegramFehler as ex:
        ausgabe(f"⚠️ Die Testnachricht ging nicht raus ({ex.code}).")
        fehler.append("Testnachricht")
    if fehler:
        ausgabe("\nNicht alles hat geklappt (siehe oben). Von Hand geht es in der Eingabeaufforderung mit  setx TELEGRAM_BOT_TOKEN \"<token>\"  und  setx TELEGRAM_CHAT_ID \"" + chat + "\".")
        return 1
    ausgabe("\nFertig. Jetzt das Cockpit-Fenster schliessen und cockpit.bat neu öffnen. Danach in Telegram /uebersicht schicken.")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--basis", default=BASIS, help="nur für Tests: Adresse eines simulierten Telegram-Servers")
    a = ap.parse_args(argv)
    if os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID"):
        if input("Es ist schon ein Telegram-Bot eingerichtet. Neu einrichten? (j/N) ").strip().lower() not in ("j", "ja"):
            print("Nichts geändert.")
            return 0
    token = getpass.getpass("Bot-Token von @BotFather (die Eingabe bleibt unsichtbar, Rechtsklick fügt ein): ").strip()
    return lauf(token, basis=a.basis)


if __name__ == "__main__":
    sys.exit(main())
