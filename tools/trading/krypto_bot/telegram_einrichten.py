#!/usr/bin/env python3
"""Telegram einrichten (einmalig, auf dem PC): verbindet das Krypto-Cockpit mit DEINEM privaten Telegram-Bot.

  Doppelklick auf telegram-einrichten.bat   (oder: py tools\\trading\\krypto_bot\\telegram_einrichten.py)

Ablauf:
  1. In Telegram «@BotFather» öffnen → /newbot → Namen wählen → den langen Token kopieren («123456789:AA…»).
  2. Dieses Programm fragt den Token. Die Eingabe bleibt UNSICHTBAR (richtig so; Rechtsklick fügt ein). Den Token nie in einen Chat schicken.
  3. Es zeigt einen Einmalcode. Du schickst diesen Code deinem neuen Bot. So findet das Programm DEINEN Chat.
  4. Der Bot schickt dir darauf eine Bestätigungszahl. Die gibst du im Fenster auf dem PC ein: nur wer am PC sitzt UND den Chat besitzt, kommt durch
     (hätte sich ein Fremder mit dem Code vor dich gedrängt, bekäme er die Zahl, nicht du: nichts wird gespeichert).
  5. Es speichert Token und Chat-Nummer für dein Windows-Benutzerkonto (setx) und schickt eine Testnachricht.
  6. Cockpit-Fenster schliessen und cockpit.bat neu öffnen. Danach in Telegram: /uebersicht, /status, /profit, /handy, /stop …

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
TOKEN_FORM = re.compile(r"[0-9]{6,12}:[A-Za-z0-9_-]{30,50}")      # nur ASCII-Ziffern
WARTE_S = 180
MAX_NETZFEHLER = 6                 # so viele Netzfehler in Folge beim Warten auf deine Nachricht: dann meldet das Programm «Telegram nicht erreichbar» statt zu schweigen
# Eine Nachricht mit einem dieser Felder ist weitergeleitet, über einen Bot gelaufen oder von einem Kanal: sie zählt nie als «du hast den Code geschickt»
FREMDE_SPUREN = ("forward_origin", "forward_from", "forward_from_chat", "forward_date", "forward_sender_name", "via_bot", "sender_chat", "is_automatic_forward")


class TelegramFehler(Exception):
    """Fehler der Telegram-Schnittstelle: .code = HTTP-Nummer (0 = Netz), .text = kurze Beschreibung (nie mit Token)."""

    def __init__(self, code, text=""):
        super().__init__(f"{code} {text}")
        self.code, self.text = code, text


def _sauber(text, laenge=40):
    """Namen aus Telegram nur als schlichten Text ausgeben (keine Steuerzeichen, keine Umkehr der Schreibrichtung)."""
    return re.sub(r"[^\w .\-@]", "", str(text or ""))[:laenge]


def _ohne_token(text, token=""):
    """Entfernt den Token (und alles, was wie «bot<Zahl>:<Schlüssel>» aussieht) aus einem Text, den ein Server uns geschickt hat."""
    t = str(text or "")
    if token:
        t = t.replace(token, "***")
    return re.sub(r"bot[0-9]+:[A-Za-z0-9_-]+", "bot***", t)


def api(basis, token, methode, params=None, timeout=20):
    """Ruft Telegram auf. Wirft nur TelegramFehler — OHNE die ursprüngliche Ausnahme zu verketten: deren Text und Traceback enthielten die Adresse mit dem Token."""
    url = f"{basis.rstrip('/')}/bot{token}/{methode}"
    daten = urllib.parse.urlencode(params).encode() if params else None
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=daten), timeout=timeout) as r:
            antwort = json.load(r)
    except urllib.error.HTTPError as ex:
        try:
            beschr = _ohne_token(str(json.load(ex).get("description", ""))[:200], token)[:120]
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


def nachricht_zaehlt(m, code):
    """Nur eine eigene, direkte Nachricht mit genau dem Code in einem PRIVATEN Chat eines Menschen: kein Bot, keine Weiterleitung, kein Kanal, keine Gruppe;
    die Chat-Nummer eines privaten Chats ist die Nutzernummer (positive ganze Zahl und gleich der des Absenders)."""
    if not isinstance(m, dict) or any(k in m for k in FREMDE_SPUREN):
        return False
    chat, von = m.get("chat"), m.get("from")
    if not isinstance(chat, dict) or not isinstance(von, dict) or chat.get("type") != "private" or von.get("is_bot") is not False:
        return False
    cid, vid = chat.get("id"), von.get("id")
    if not (isinstance(cid, int) and not isinstance(cid, bool) and cid > 0 and cid == vid):
        return False
    return isinstance(m.get("text"), str) and m["text"].strip().upper() == code.upper()


def chat_finden(basis, token, code, warte_s=WARTE_S, uhr=time.time, schlafen=time.sleep):
    """Wartet, bis in einem PRIVATEN Chat von einem Menschen genau `code` ankommt. → (chat_id, Vorname) oder None (Zeit um).
    Es wird KEINE Nachricht bestätigt (kein `offset`): ein /stop, das du in dieser Zeit schicktest, bleibt für das Cockpit liegen statt verschluckt zu werden.
    Wirft TelegramFehler(409), wenn derselbe Bot schon anderswo gelesen wird (zum Beispiel vom laufenden Cockpit), und TelegramFehler(0), wenn Telegram
    MAX_NETZFEHLER-mal in Folge nicht erreichbar war."""
    ende = uhr() + warte_s
    netzfehler = 0
    while uhr() < ende:
        try:
            r = api(basis, token, "getUpdates", {"timeout": 15, "allowed_updates": json.dumps(["message"])}, timeout=30)
        except TelegramFehler as ex:
            if ex.code in (401, 404, 409):
                raise
            netzfehler += 1
            if netzfehler >= MAX_NETZFEHLER:
                raise TelegramFehler(0, "Telegram antwortet nicht") from None
            schlafen(2)                       # Netz kurz weg: nochmals versuchen
            continue
        netzfehler = 0
        for u in r.get("result") or []:
            m = u.get("message") if isinstance(u, dict) else None
            if nachricht_zaehlt(m, code):
                return str(m["chat"]["id"]), _sauber(m["from"].get("first_name"))
        schlafen(1.0)                         # alte, nicht passende Nachrichten kommen sofort zurück: nicht im Sekundentakt nachfragen
    return None


def senden(basis, token, chat, text):
    api(basis, token, "sendMessage", {"chat_id": chat, "text": text})


def setx(name, wert):
    """Windows: dauerhaft für dein Benutzerkonto speichern (neue Fenster sehen es). → (ok, kurzer Text ohne den Wert)."""
    if os.name != "nt":
        return False, "setx gibt es nur unter Windows"
    try:      # die Ausgabe von setx wird gar nicht gelesen: sie kommt in der Oem-Zeichentafel der Konsole und ließ sich mit text=True nicht immer dekodieren
        r = subprocess.run(["setx", name, wert], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
    except (OSError, subprocess.SubprocessError, ValueError) as ex:
        return False, type(ex).__name__
    return r.returncode == 0, ("gespeichert" if r.returncode == 0 else "setx meldet einen Fehler (Rückgabewert " + str(r.returncode) + ")")


def lauf(token, ausgabe=print, basis=BASIS, speichern=setx, code=None, warte_s=WARTE_S, uhr=time.time, schlafen=time.sleep, env=None, eingabe=input):
    """Der ganze Ablauf mit schon eingegebenem Token. → 0 = fertig, 1 = Fehler, 2 = nichts gefunden. Der Token steht in KEINER Ausgabe.
    Gespeichert wird erst, wenn die Bestätigungszahl stimmt; zuerst der Token, dann die Chat-Nummer (scheitert die zweite, sagt das Programm es und nennt den Handbefehl)."""
    env = os.environ if env is None else env
    if not token_form_ok(token):
        ausgabe("❌ Das sieht nicht nach einem Bot-Token aus (richtig wäre «123456789:AA…», mit Doppelpunkt). Bitte bei @BotFather noch einmal nachsehen.")
        return 1
    ausgabe("Falls das Cockpit-Fenster offen ist: bitte zuerst schliessen (es würde denselben Bot mitlesen).")
    try:
        name = _sauber(bot_name(basis, token))
    except TelegramFehler as ex:
        ausgabe("❌ Telegram kennt diesen Token nicht (falsch kopiert?)." if ex.code == 401 else f"❌ Telegram nicht erreichbar ({ex.code} {_sauber(ex.text, 60)}). Internet prüfen und nochmals starten.")
        return 1
    ausgabe(f"✅ Bot gefunden: @{name}" if name else "✅ Bot gefunden.")
    code = code or neuer_code()
    ausgabe(f"\nJetzt in Telegram deinem Bot @{name or 'dein Bot'} diese Nachricht schicken (genau so):\n\n    {code}\n\nIch warte bis zu {warte_s // 60} Minuten …")
    try:
        treffer = chat_finden(basis, token, code, warte_s=warte_s, uhr=uhr, schlafen=schlafen)
    except TelegramFehler as ex:
        if ex.code == 409 and "webhook" in ex.text.lower():
            ausgabe("❌ Für diesen Bot ist ein Webhook eingerichtet (eine andere Software nutzt ihn). Lege bei @BotFather mit /newbot einen neuen Bot an.")
        elif ex.code == 409:
            ausgabe("❌ Der Bot wird gerade schon woanders gelesen (meist vom laufenden Cockpit). Cockpit-Fenster schliessen und dieses Programm nochmals starten.")
        elif ex.code == 0:
            ausgabe("❌ Telegram ist nicht erreichbar (Internet prüfen) und nochmals starten.")
        else:
            ausgabe(f"❌ Telegram meldet einen Fehler ({ex.code}).")
        return 1
    if treffer is None:
        ausgabe("⏳ Es kam nichts an. Bitte nochmals starten und den Code deinem Bot in einem privaten Chat schicken (nicht in einer Gruppe, nicht weitergeleitet).")
        return 2
    chat, vorname = treffer
    ausgabe(f"✅ Gefunden: Chat von {vorname or 'dir'}.")
    # Zweite Zahl: sie geht NUR an diesen Chat. Wer am PC sitzt, muss sie aus Telegram abtippen: so ist die Anmeldung an die Person am PC gebunden
    zahl = f"{secrets.randbelow(10000):04d}"
    try:
        senden(basis, token, chat, f"Bestätigung: {zahl}\nGib diese Zahl im Fenster auf dem PC ein.")
    except TelegramFehler as ex:
        ausgabe(f"❌ Die Bestätigungszahl ging nicht raus ({ex.code}). Nichts gespeichert.")
        return 1
    if str(eingabe("Bestätigungszahl aus Telegram (vier Ziffern): ")).strip() != zahl:
        ausgabe("❌ Das war nicht die Zahl aus deinem Telegram. Abgebrochen, nichts gespeichert. (Wer den Code vor dir geschickt hätte, bekäme die Zahl statt dir.)")
        return 1
    ok, text = speichern("TELEGRAM_BOT_TOKEN", token)
    if not ok:
        ausgabe(f"❌ TELEGRAM_BOT_TOKEN ließ sich nicht speichern ({text}). Nichts verändert. Von Hand: Eingabeaufforderung, setx TELEGRAM_BOT_TOKEN \"<token>\" und setx TELEGRAM_CHAT_ID \"{chat}\".")
        return 1
    env["TELEGRAM_BOT_TOKEN"] = token         # für dieses Fenster; neue Fenster sehen es über setx
    ok, text = speichern("TELEGRAM_CHAT_ID", chat)
    if not ok:
        ausgabe(f"⚠️ Der Token ist gespeichert, die Chat-Nummer NICHT ({text}). Telegram bleibt aus, bis du in der Eingabeaufforderung eingibst:  setx TELEGRAM_CHAT_ID \"{chat}\"")
        return 1
    env["TELEGRAM_CHAT_ID"] = chat
    try:
        senden(basis, token, chat, "✅ Krypto-Cockpit verbunden. Probier /uebersicht, /status, /profit oder /hilfe. Der Not-Aus ist /stop.")
    except TelegramFehler as ex:
        ausgabe(f"⚠️ Alles ist gespeichert, aber die Testnachricht ging nicht raus ({ex.code}). Nach dem Neuöffnen des Cockpits in Telegram /uebersicht schicken, um es zu prüfen.")
        return 1
    ausgabe("✅ Testnachricht gesendet: schau in Telegram.")
    ausgabe("\nFertig. Jetzt das Cockpit-Fenster schliessen und cockpit.bat neu öffnen. Danach in Telegram /uebersicht schicken.")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--basis", default=BASIS, help="nur für Tests: Adresse eines simulierten Telegram-Servers (https:// oder http://127.0.0.1)")
    a = ap.parse_args(argv)
    if not (a.basis.startswith("https://") or a.basis.startswith("http://127.0.0.1")):
        print("❌ --basis nur mit https:// oder http://127.0.0.1 (der Token würde sonst unverschlüsselt gesendet).")
        return 1
    if not sys.stdin.isatty():
        print("❌ Bitte in einem normalen Fenster starten (Doppelklick auf telegram-einrichten.bat): die Eingabe des Tokens muss unsichtbar bleiben können.")
        return 1
    if os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID"):
        if input("Es ist schon ein Telegram-Bot eingerichtet. Neu einrichten? (j/N) ").strip().lower() not in ("j", "ja"):
            print("Nichts geändert.")
            return 0
    token = getpass.getpass("Bot-Token von @BotFather (die Eingabe bleibt unsichtbar, Rechtsklick fügt ein): ").strip()
    return lauf(token, basis=a.basis)


if __name__ == "__main__":
    sys.exit(main())
