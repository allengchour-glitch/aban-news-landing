#!/usr/bin/env python3
"""Handy-Ansicht: das Krypto-Cockpit NUR LESEN, vom Handy im Heimnetz und über einen privaten Tunnel (Tailscale).

STANDARD: AUS. Eingeschaltet wird sie nur auf dem PC (Karte «Handy-Ansicht» im Cockpit); mit `setx KRYPTO_FERN aus`
bleibt sie in jedem Fall aus. Zusätzlich zum Cockpit auf 127.0.0.1 läuft dann ein zweiter, EIGENER Webserver (Port 8766):

  • nur lesend: nur GET/HEAD und vier feste Adressen (Seite, Markt-Seite, Kontostand, Profit). Es gibt keine Knöpfe und keine
    Schreib-Adresse — Aufträge, Einstellungen und Not-Aus erreicht man hier nicht (Not-Aus: Telegram /stop oder am PC)
  • mit Zugangsschlüssel: 192 Bit Zufall. Den Link einmal öffnen, der Browser merkt sich den Zugang (Cookie), der Schlüssel
    verschwindet aus der Adresszeile; im Protokoll steht er nie. Ausschalten und «Schlüssel erneuern» machen alle bisherigen Links ungültig
  • nur aus dem Heimnetz (192.168.x.x, 10.x.x.x, 172.16–31.x.x), dem Tailscale-Netz (100.64–127.x.x) und von diesem PC selbst:
    eine Anfrage aus dem öffentlichen Internet wird abgewiesen — auch dann, wenn jemand am Router einen Port freigibt
  • nur mit passendem Host-Kopf (gegen DNS-Rebinding: eine fremde Seite, deren Name plötzlich auf diesen PC zeigt)
  • Sperre einer Quelle nach fünf falschen Schlüsseln (15 Minuten; ein Link, den eine fremde Webseite unsichtbar lädt, zählt nicht mit); höchstens 32 gleichzeitige
    Verbindungen, höchstens 8 je Quelle, keine länger als 30 Sekunden; eine Quelle ausserhalb der erlaubten Netze bekommt nicht einmal einen Faden
  • jede erstmals gesehene Quelladresse wird per Telegram gemeldet (mit Link oder mit gespeichertem Zugang)
  • Kontodaten ohne Pfade dieses PCs

Von unterwegs (Mobilfunk) kommt man NUR durch einen PRIVATEN Tunnel (Tailscale: PC und Handy im selben privaten, verschlüsselten
Netz). Ein Port am Router ins offene Internet wird bewusst NICHT unterstützt: es gäbe kein HTTPS, der Schlüssel liefe im Klartext.

Das Modul kennt das Cockpit nicht (Seite, Kontostand und Profit kommen als Funktionen herein): es kann daher nichts auslösen.
Nur Python-Standardbibliothek.
"""
from __future__ import annotations

import hashlib
import hmac
import getpass
import ipaddress
import json
import os
import re
import secrets
import socket
import sys
import threading
import time
import urllib.parse
from collections import OrderedDict
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8766
DATEI = "krypto-fern.json"          # in data/: {"an": bool, "schluessel": "...", "port": 8766, "erzeugt": "..."}
COOKIE = "krypto_fern"
COOKIE_SEKUNDEN = 30 * 24 * 3600
MAX_FEHLER = 5                      # so viele falsche Schlüssel je Quelle …
FEHLER_FENSTER_S = 600              # … innerhalb von zehn Minuten sperren die Quelle …
SPERRE_S = 900                      # … für eine Viertelstunde
MIN_SCHLUESSEL = 20                 # ein kürzerer Schlüssel in der Datei gilt als kaputt: dann bleibt alles aus
ZWISCHEN_S = 5.0                    # Kontostand und Profit höchstens alle fünf Sekunden neu berechnen (mehrere Geräte, schnelles Neuladen)

# Quell-Adressen, die überhaupt bedient werden: Heimnetz, Link-Local, Tailscale (CGNAT 100.64.0.0/10) und dieser PC selbst.
# Absichtlich ausgeschrieben statt `is_private`: dessen Antwort hat sich zwischen Python-Versionen geändert.
_NETZE_V4 = [ipaddress.ip_network(n) for n in ("127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "100.64.0.0/10")]
_NETZE_V6 = [ipaddress.ip_network(n) for n in ("::1/128", "fc00::/7", "fe80::/10")]
_TAILSCALE = ipaddress.ip_network("100.64.0.0/10")

SICHERHEIT = (
    ("Cache-Control", "no-store"),
    ("X-Content-Type-Options", "nosniff"),
    ("X-Frame-Options", "DENY"),
    ("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"),
    ("Referrer-Policy", "no-referrer"),
    ("X-Robots-Tag", "noindex, nofollow"),
)

ZUGANG_SEITE = ("<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                "<meta name=\"robots\" content=\"noindex\"><title>Krypto-Cockpit</title></head>"
                "<body style=\"font:16px/1.5 system-ui,sans-serif;margin:2rem auto;max-width:30rem;padding:0 1rem\">"
                "<h1>🔒 Zugang nötig</h1><p>Bitte den Link mit dem Schlüssel öffnen. Er steht im Cockpit am PC in der Karte «Handy-Ansicht».</p>"
                "</body></html>").encode("utf-8")


# ───────────────────────── Einstellung (data/krypto-fern.json) ─────────────────────────
def _datei(daten):
    return Path(daten) / DATEI


def neuer_schluessel():
    return secrets.token_urlsafe(24)    # 192 Bit, 32 Zeichen aus A–Z a–z 0–9 - _


def lesen(daten):
    """→ {an, schluessel, port, erzeugt}. Fehlt die Datei, ist sie kaputt oder der Schlüssel zu kurz, ist die Ansicht AUS (im Zweifel zu).
    Wirft nie."""
    try:
        d = json.loads(_datei(daten).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        d = {}
    if not isinstance(d, dict):
        d = {}
    s = d.get("schluessel") if isinstance(d.get("schluessel"), str) else ""
    gut = len(s) >= MIN_SCHLUESSEL and re.fullmatch(r"[A-Za-z0-9_-]+", s) is not None
    p = d.get("port")
    port = p if isinstance(p, int) and not isinstance(p, bool) and 1024 <= p <= 65535 else PORT
    return {"an": d.get("an") is True and gut, "schluessel": s if gut else "", "port": port, "erzeugt": str(d.get("erzeugt") or "")}


def schreiben(daten, einst):
    """Atomar schreiben (Wegwerfdatei, dann ersetzen), wo möglich nur für den Besitzer lesbar. Windows verweigert das Ersetzen, solange ein anderer Faden die Datei
    gerade liest: dann vier Versuche mit kurzer Pause. Scheitert es doch, bleibt keine Wegwerfdatei liegen und der Fehler geht weiter."""
    Path(daten).mkdir(parents=True, exist_ok=True)
    ziel = _datei(daten)
    tmp = ziel.with_name(ziel.name + ".tmp")
    try:
        tmp.write_text(json.dumps({"an": bool(einst.get("an")), "schluessel": einst.get("schluessel", ""), "port": einst.get("port", PORT),
                                   "erzeugt": einst.get("erzeugt", "")}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        try:
            os.chmod(tmp, 0o600)
        except OSError:
            pass
        for versuch in range(4):
            try:
                os.replace(tmp, ziel)
                return
            except PermissionError:
                if versuch == 3:
                    raise
                time.sleep(0.05 * (versuch + 1))
    except BaseException:
        try:
            tmp.unlink()
        except OSError:
            pass
        raise


def einschalten(daten, erneuern=False):
    """Ansicht an. Einen vorhandenen Schlüssel behält sie, ausser `erneuern` (dann sind alle bisherigen Links und Cookies ungültig)."""
    e = lesen(daten)
    s, erzeugt = e["schluessel"], e["erzeugt"]
    if erneuern or not s:
        s, erzeugt = neuer_schluessel(), datetime.now(timezone.utc).isoformat(timespec="seconds")
    schreiben(daten, {"an": True, "schluessel": s, "port": e["port"], "erzeugt": erzeugt})
    return lesen(daten)


def ausschalten(daten):
    """Ansicht aus UND Schlüssel vergessen: alle bisherigen Links und angemeldeten Geräte sind damit ungültig (so schliesst man ein verlorenes Handy aus);
    Einschalten erzeugt einen neuen Schlüssel."""
    e = lesen(daten)
    schreiben(daten, {"an": False, "schluessel": "", "port": e["port"], "erzeugt": ""})
    return lesen(daten)


def von_umgebung_gesperrt(env=None):
    return str((os.environ if env is None else env).get("KRYPTO_FERN", "")).strip().lower() == "aus"


def eingeschaltet(daten, env=None):
    return lesen(daten)["an"] and not von_umgebung_gesperrt(env)


# ───────────────────────── Wer darf überhaupt fragen? ─────────────────────────
def quelle_erlaubt(adresse):
    """Quell-Adresse einer Verbindung: Heimnetz, Tailscale, link-local oder dieser PC. Alles andere (öffentliches Internet, Unsinn) nein."""
    try:
        ip = ipaddress.ip_address(str(adresse).split("%")[0])
    except ValueError:
        return False
    if ip.version == 6 and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return any(ip in n for n in (_NETZE_V4 if ip.version == 4 else _NETZE_V6))


def ist_tailscale(adresse):
    try:
        ip = ipaddress.ip_address(str(adresse))
    except ValueError:
        return False
    return ip.version == 4 and ip in _TAILSCALE


def host_erlaubt(host, port, namen=()):
    """Host-Kopf der Anfrage (gegen DNS-Rebinding): immer mit dem richtigen Port, und entweder eine erlaubte IP-Adresse (siehe quelle_erlaubt),
    ein Name aus `namen` (Rechnername) oder ein Tailscale-Name (…ts.net)."""
    h = str(host or "").strip().lower()
    if not h or len(h) > 255 or any(z in h for z in " \t\r\n/\\@?#"):
        return False
    if h.startswith("["):
        ende = h.find("]")
        return ende > 0 and h[ende + 1:] == f":{port}" and quelle_erlaubt(h[1:ende])
    name, sep, p = h.rpartition(":")
    if not sep or not name or p != str(port) or ":" in name:
        return False
    try:
        ipaddress.ip_address(name)
    except ValueError:
        return name in namen or (name.endswith(".ts.net") and len(name) > len(".ts.net"))
    return quelle_erlaubt(name)         # eine IP-Adresse nur aus den erlaubten Netzen — nie über die Namensliste


# ───────────────────────── Schlüssel und Cookie ─────────────────────────
def _gleich(a, b):
    """Zeitkonstanter Vergleich zweier Zeichenketten (auch bei Unsinn in `a`)."""
    return hmac.compare_digest(str(a).encode("utf-8", "replace"), str(b).encode("utf-8", "replace"))


def cookie_wert(schluessel):
    """Der Wert, den der Browser als Cookie bekommt: aus dem Schlüssel abgeleitet, nicht der Schlüssel selbst. Ein neuer Schlüssel macht alte Cookies ungültig."""
    return hmac.new(str(schluessel).encode("utf-8"), b"krypto-fern-cookie-v1", hashlib.sha256).hexdigest()


def _cookie_lesen(kopf):
    for teil in str(kopf or "").split(";"):
        name, sep, wert = teil.strip().partition("=")
        if sep and name == COOKIE:
            return wert.strip()
    return ""


class Sperre:
    """Zählt falsche Schlüssel je Quelle. Gesperrt wird NUR das Vorzeigen eines Schlüssels (Link, Kopf) — wer schon angemeldet ist (Cookie), bleibt
    unberührt. Das Cookie wird nicht mitgezählt: nach «Schlüssel erneuern» schickt ein altes Cookie sonst im Minutentakt Fehlversuche und sperrt den Besitzer aus."""

    def __init__(self, max_fehler=MAX_FEHLER, fenster=FEHLER_FENSTER_S, dauer=SPERRE_S, uhr=time.time):
        self.max_fehler, self.fenster, self.dauer, self.uhr = max_fehler, fenster, dauer, uhr
        self._lock = threading.Lock()
        self._fehler, self._bis = {}, {}

    def gesperrt(self, quelle):
        with self._lock:
            return self.uhr() < self._bis.get(quelle, 0)

    def fehler(self, quelle):
        jetzt = self.uhr()
        with self._lock:
            liste = [t for t in self._fehler.get(quelle, []) if jetzt - t < self.fenster] + [jetzt]
            if len(liste) >= self.max_fehler:
                self._bis[quelle] = jetzt + self.dauer
                liste = []
            self._fehler[quelle] = liste
            if len(self._fehler) > 500:      # nie unbegrenzt wachsen
                for q in [q for q, l in self._fehler.items() if not l or jetzt - l[-1] >= self.fenster]:
                    self._fehler.pop(q, None)
                for q in [q for q, b in self._bis.items() if b <= jetzt]:
                    self._bis.pop(q, None)

    def erfolg(self, quelle):
        with self._lock:
            self._fehler.pop(quelle, None)


# ───────────────────────── Was die Seite zeigt ─────────────────────────
# Ein Windows-Pfad darf Leerzeichen in den ORDNER-Namen haben («C:\\Users\\Anna Beispiel\\…»), der letzte Teil (Dateiname) endet am Leerzeichen; Rückstriche dürfen doppelt stehen
# (so druckt repr() sie). Die Trennzeichen sind je Pfad EINHEITLICH (nur «\\» oder nur «/»): so frisst ein Pfad nicht den Satz bis zum nächsten Pfad.
_PFAD_WIN = re.compile(r"(?:(?<![A-Za-z0-9])[A-Za-z]:\\+(?:[^\\\n\r\"'<>|:*?]+\\+)*([^\\\s\"'<>|:*?]*)|\\\\+(?:[^\\\n\r\"'<>|:*?]+\\+)*([^\\\s\"'<>|:*?]*))")
_PFAD_WIN_SLASH = re.compile(r"(?<![A-Za-z0-9])[A-Za-z]:/+(?:[^/\\\n\r\"'<>|:*?]+/+)*([^/\\\s\"'<>|:*?]*)")
_PFAD_POSIX = re.compile(r"(?<![\w.~:-])/(?:home|Users|root|tmp|var|opt|mnt|srv|media|usr|etc|proc|run|cygdrive|[A-Za-z](?=/Users/))/(?:[^/\s\"'<>|]+/)*([^/\s\"'<>|]*)")
_PFAD_UNC_SLASH = re.compile(r"(?<![:\w/])//[^/\s\"'<>|]+/(?:[^/\s\"'<>|]+/)*([^/\s\"'<>|]*)")
_BENUTZER_NIE = {"root", "user", "users", "admin", "administrator", "test", "default", "public", "home", "guest", "system"}


def eigene_namen():
    """Benutzername dieses PCs (aus dem Anmeldenamen und dem Ordner des Benutzers): wird in den Daten für das Handy überall durch «…» ersetzt, auch wo kein Pfad davor steht.
    Gängige Allerweltsnamen («root», «user», «admin» …) bleiben unberührt, sonst würde normaler Text zerhackt."""
    namen = set()
    for quelle in (lambda: getpass.getuser(), lambda: os.environ.get("USERNAME"), lambda: os.environ.get("USER"), lambda: Path.home().name):
        try:
            n = str(quelle() or "").strip()
        except Exception:  # noqa: BLE001
            continue
        if len(n) >= 4 and n.lower() not in _BENUTZER_NIE:
            namen.add(n)
    return tuple(sorted(namen, key=len, reverse=True))


def bereinigen(x, geheim=(), _tiefe=0):
    """Kopie von Daten für die Handy-Ansicht: in Texten (und Schlüsselnamen) verschwinden Ordnerpfade dieses PCs («C:\\Users\\…\\data\\x.json» → «…\\x.json»)
    und die Namen aus `geheim` (der Benutzername)."""
    if _tiefe > 12:
        return None
    if isinstance(x, str):
        t = _PFAD_WIN.sub(lambda m: "…\\" + (m.group(1) if m.group(1) is not None else m.group(2) or ""), x)
        t = _PFAD_WIN_SLASH.sub(lambda m: "…\\" + m.group(1), t)
        t = _PFAD_UNC_SLASH.sub(lambda m: "…/" + m.group(1), _PFAD_POSIX.sub(lambda m: "…/" + m.group(1), t))
        for g in geheim:
            t = re.sub(re.escape(g), "…", t, flags=re.IGNORECASE)
        return t
    if isinstance(x, dict):
        return {(bereinigen(k, geheim, _tiefe + 1) if isinstance(k, str) else k): bereinigen(v, geheim, _tiefe + 1) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [bereinigen(v, geheim, _tiefe + 1) for v in x]
    return x


def seite_lesend(roh):
    """Die Cockpit-Seite im Lesemodus: <html> bekommt `data-nur-lesen="1"` (die Seite blendet dann alle Knöpfe aus und fragt nichts Schreibendes mehr),
    dazu «nicht indexieren». Der Server verbietet Schreibendes ohnehin — das hier ist nur die Anzeige."""
    s = roh.decode("utf-8") if isinstance(roh, (bytes, bytearray)) else str(roh)
    s, n = re.subn(r"<html\b([^>]*)>", lambda m: "<html" + m.group(1) + ' data-nur-lesen="1">', s, count=1)
    if n != 1:
        raise ValueError("kein <html>-Kopf in der Seite")
    s = s.replace("<head>", '<head>\n<meta name="robots" content="noindex, nofollow">', 1)
    return s.encode("utf-8")


# ───────────────────────── Adressen für die Anzeige am PC ─────────────────────────
def lokale_ips():
    """IPv4-Adressen dieses PCs (Standardroute und Rechnername). Es wird nichts gesendet: die UDP-«Verbindung» wählt nur die Route."""
    gefunden = []

    def add(ip):
        if ip not in gefunden:
            gefunden.append(ip)

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("192.0.2.1", 9))
            add(s.getsockname()[0])
        finally:
            s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            add(info[4][0])
    except OSError:
        pass
    return gefunden


def adressen(port, schluessel, ips=None):
    """Links für das Handy: [{art, tailscale, anzeige (ohne Schlüssel), url (mit Schlüssel)}], Heimnetz zuerst."""
    out = []
    for ip in (lokale_ips() if ips is None else ips):
        try:
            a = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if a.version != 4 or a.is_loopback or a.is_link_local or not quelle_erlaubt(ip):
            continue
        ts = a in _TAILSCALE
        out.append({"art": "Tailscale (von unterwegs)" if ts else "Heimnetz (WLAN/LAN)", "tailscale": ts,
                    "anzeige": f"http://{ip}:{port}/", "url": f"http://{ip}:{port}/?k={schluessel}"})
    out.sort(key=lambda x: (x["tailscale"], x["anzeige"]))
    return out


# ───────────────────────── Der Webserver ─────────────────────────
ROUTEN = ("/", "/index.html", "/markt", "/markt.html", "/api/stand", "/api/profit")      # die einzigen Adressen, die überhaupt etwas liefern


class _Handler(BaseHTTPRequestHandler):
    ctx = None                          # der FernServer (wird je Server als Unterklasse gesetzt)
    timeout = 10                        # eine hängende Verbindung hält keinen Faden länger als zehn Sekunden fest
    server_version = "KryptoFern"
    sys_version = ""

    def version_string(self):
        return self.server_version

    def log_message(self, *a):
        pass                            # kein Zugriffsprotokoll auf der Konsole: die Adresse kann den Schlüssel enthalten

    def send_error(self, code, message=None, explain=None):
        self._senden(code, {"fehler": "ungültige Anfrage"})

    def _senden(self, code, daten, typ="application/json; charset=utf-8", extra=()):
        b = daten if isinstance(daten, bytes) else json.dumps(daten, ensure_ascii=False).encode("utf-8")
        self.close_connection = True
        try:
            self.send_response(code)
            self.send_header("Content-Type", typ)
            self.send_header("Content-Length", str(len(b)))
            for k, v in SICHERHEIT + tuple(extra):
                self.send_header(k, v)
            self.end_headers()
            if getattr(self, "command", None) != "HEAD":
                self.wfile.write(b)
        except OSError:                 # Gerät weg (Funkloch, Tunnel zu): nichts zu tun
            pass

    def _nein(self):
        self.ctx.ereignis("methode", self.client_address[0], str(self.command))
        self._senden(405, {"fehler": "nur lesen"}, extra=(("Allow", "GET, HEAD"),))

    do_POST = do_PUT = do_DELETE = do_PATCH = do_OPTIONS = _nein

    def do_GET(self):
        self._bearbeiten()

    def do_HEAD(self):
        self._bearbeiten()

    def _vorgezeigt(self, query):
        """→ (Schlüssel oder None, wo): ein Schlüssel im Link («k»), im Kopf X-Krypto-Fern oder als «Bearer»."""
        try:
            q = urllib.parse.parse_qs(query, keep_blank_values=True, max_num_fields=20)
        except ValueError:
            return "", "link"
        if "k" in q:
            return q["k"][0], "link"
        h = self.headers.get("X-Krypto-Fern")
        if h is not None:
            return h.strip(), "kopf"
        a = self.headers.get("Authorization") or ""
        if a[:7].lower() == "bearer ":
            return a[7:].strip(), "kopf"
        return None, ""

    def _bearbeiten(self):
        c = self.ctx
        quelle = self.client_address[0]
        if not quelle_erlaubt(quelle):
            c.ereignis("fremde-quelle", quelle)
            return self._senden(403, {"fehler": "verboten"})
        if not host_erlaubt(self.headers.get("Host"), c.port, c.namen()):
            c.ereignis("falscher-host", quelle)
            return self._senden(403, {"fehler": "falscher Host"})
        teile = urllib.parse.urlsplit(self.path)
        pfad = teile.path
        if teile.scheme or teile.netloc or not pfad.startswith("/") or pfad.startswith("//") or "\\" in pfad or any(ord(z) < 32 or ord(z) == 127 for z in pfad):
            return self._senden(400, {"fehler": "ungültige Adresse"})      # «/\\evil» liest mancher Browser als «//evil»: Rückstriche und Steuerzeichen gar nicht erst zulassen
        schluessel = c.schluessel()
        if not schluessel:
            return self._senden(503, {"fehler": "Handy-Ansicht ist ausgeschaltet"})
        vorgezeigt, wo = self._vorgezeigt(teile.query)
        if vorgezeigt is not None and wo == "link":
            # Ein Link mit Schlüssel wird als SEITE geöffnet (Tippen, Lesezeichen). Eine fremde Webseite, die im Browser des Besitzers unsichtbar Bilder, Skripte oder Rahmen
            # mit falschem Schlüssel lädt, zählt nicht als Fehlversuch: sonst sperrte sie den Besitzer aus (die Sperre gilt je Quelladresse)
            ziel_art, modus = (self.headers.get("Sec-Fetch-Dest") or "").lower(), (self.headers.get("Sec-Fetch-Mode") or "").lower()
            if (ziel_art and ziel_art != "document") or (modus and modus != "navigate"):
                c.ereignis("fremder-aufruf", quelle, ziel_art or modus)
                return self._senden(403, {"fehler": "den Link bitte als Seite öffnen"})
        if vorgezeigt is not None:
            if c.sperre.gesperrt(quelle):
                c.ereignis("gesperrt", quelle)
                return self._senden(429, {"fehler": "zu viele falsche Schlüssel — später nochmals"}, extra=(("Retry-After", str(SPERRE_S)),))
            if not _gleich(vorgezeigt, schluessel):
                c.sperre.fehler(quelle)
                c.ereignis("falscher-schluessel", quelle)
                return self._senden(401, ZUGANG_SEITE, "text/html; charset=utf-8")
            c.sperre.erfolg(quelle)
            c.angemeldet(quelle)
            if wo == "link":
                # Zugang merken und die Adresszeile säubern: der Schlüssel bleibt weder im Verlauf noch im Lesezeichen-Vorschlag hängen
                cookie = f"{COOKIE}={cookie_wert(schluessel)}; Path=/; Max-Age={COOKIE_SEKUNDEN}; HttpOnly; SameSite=Strict"
                ziel = pfad if pfad in ROUTEN else "/"                       # nur zu einer bekannten Adresse zurück, nie zu etwas, das der Aufrufer sich ausdenkt
                return self._senden(303, b"", "text/plain; charset=utf-8", extra=(("Location", ziel), ("Set-Cookie", cookie)))
        elif not _gleich(_cookie_lesen(self.headers.get("Cookie")), cookie_wert(schluessel)):
            return self._senden(401, ZUGANG_SEITE, "text/html; charset=utf-8")
        c.zugriff(quelle)
        if pfad in ROUTEN[0:2]:
            return self._antwort(c.seite, "text/html; charset=utf-8")
        if pfad in ROUTEN[2:4]:
            return self._antwort(c.markt, "text/html; charset=utf-8")
        if pfad == "/api/stand":
            return self._antwort(c.stand)
        if pfad == "/api/profit":
            return self._antwort(c.profit)
        return self._senden(404, {"fehler": "nicht gefunden"})

    def _antwort(self, quelle_fn, typ="application/json; charset=utf-8"):
        try:
            daten = quelle_fn()
        except Exception as ex:  # noqa: BLE001
            self.ctx.ereignis("fehler", self.client_address[0], type(ex).__name__)
            return self._senden(500, {"fehler": type(ex).__name__})
        return self._senden(200, daten, typ)


class _Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = os.name != "nt"     # Windows: SO_REUSEADDR liesse einen zweiten Prozess denselben Port belegen (zwei Cockpit-Fenster würden sich die Anfragen teilen)
    MAX_GLEICHZEITIG = 32               # mehr gleichzeitige Verbindungen werden sofort geschlossen: der Cockpit-Prozess bekommt nie unbegrenzt viele Fäden
    JE_QUELLE = 8                       # davon höchstens so viele von EINER Quelladresse (ein Browser öffnet bis zu sechs auf einmal)
    MAX_DAUER_S = 30.0                  # absolute Obergrenze für eine Verbindung: ein Gerät, das alle paar Sekunden ein Byte tröpfelt, hält sonst einen Platz ohne Ende

    def __init__(self, *a, **k):
        self._platz = threading.BoundedSemaphore(self.MAX_GLEICHZEITIG)
        self._sperre = threading.Lock()
        self._je_quelle, self._offen = {}, {}
        self._ende = threading.Event()
        super().__init__(*a, **k)
        threading.Thread(target=self._aufpassen, daemon=True).start()

    def _aufpassen(self):
        """Ein einziger Wächter: schliesst Verbindungen, die länger als MAX_DAUER_S offen sind (das Zeitlimit des Handlers gilt nur je Lesen)."""
        while not self._ende.wait(1.0):
            jetzt = time.monotonic()
            with self._sperre:
                alt = [r for r, t in self._offen.items() if jetzt - t > self.MAX_DAUER_S]
            for r in alt:
                try:
                    r.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass

    def verify_request(self, request, client_address):
        """Schon VOR dem Faden: eine Quelle ausserhalb von Heimnetz, Tailscale und diesem PC bekommt weder einen Faden noch eine Antwort (die Verbindung wird einfach geschlossen)."""
        if not quelle_erlaubt(client_address[0]):
            ctx = getattr(self.RequestHandlerClass, "ctx", None)
            if ctx is not None:
                ctx.ereignis("fremde-quelle", client_address[0])
            return False
        return True

    def process_request(self, request, client_address):
        ip = client_address[0]
        with self._sperre:
            zu_viele = self._je_quelle.get(ip, 0) >= self.JE_QUELLE
        if zu_viele or not self._platz.acquire(blocking=False):
            self.shutdown_request(request)
            return
        with self._sperre:
            self._je_quelle[ip] = self._je_quelle.get(ip, 0) + 1
            self._offen[request] = time.monotonic()
        try:
            super().process_request(request, client_address)
        except BaseException:
            self._frei(request, ip)     # der Faden ließ sich nicht starten
            raise

    def _frei(self, request, ip):
        with self._sperre:
            self._offen.pop(request, None)
            n = self._je_quelle.get(ip, 0) - 1
            if n > 0:
                self._je_quelle[ip] = n
            else:
                self._je_quelle.pop(ip, None)
        self._platz.release()

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._frei(request, client_address[0])

    def server_close(self):
        self._ende.set()
        super().server_close()

    def handle_error(self, request, client_address):
        ex = sys.exc_info()[1]
        ctx = getattr(self.RequestHandlerClass, "ctx", None)
        if ctx is not None:             # still festhalten statt ein Traceback im Cockpit-Fenster
            ctx.ereignis("fehler", client_address[0] if client_address else "?", type(ex).__name__)


class FernServer:
    """Der zweite, lesende Server samt Einstellung, Protokoll der Zugriffe und Zwischenspeicher. Vom Cockpit gebaut, aber ohne Verweis darauf:
    Seite, Kontostand und Profit kommen als Funktionen herein."""

    def __init__(self, daten, stand_fn, profit_fn, seite_fn, markt_fn, meldung=None, env=None, uhr=time.time, ttl=ZWISCHEN_S,
                 adresse="0.0.0.0", port=None, meldung_im_faden=True, sperre=None):
        self.daten, self.env, self.uhr, self.ttl = daten, (os.environ if env is None else env), uhr, ttl
        self._stand_fn, self._profit_fn, self._seite_fn, self._markt_fn = stand_fn, profit_fn, seite_fn, markt_fn
        self.meldung, self.meldung_im_faden = meldung, meldung_im_faden
        self.adresse, self._port = adresse, port
        self.sperre = sperre or Sperre(uhr=uhr)
        self.fehler = ""
        self._srv = self._faden = None
        self._lock = threading.RLock()
        self._cache = {}
        self._ereignisse = OrderedDict()   # (Art, Quelle) → Ereignis mit Zähler: derselbe Vorfall derselben Quelle belegt nur EINEN Platz (60 verschiedene), ein Flut-Versuch spült nichts weg
        self._zuletzt = {}              # Quelle → letzter erlaubter Zugriff (Zeit)
        self._bekannt = set()           # Quellen, die schon einmal hineinkamen (nur die erste löst eine Meldung aus), gleich ob mit Link oder mit gespeichertem Zugang
        self._geheim = eigene_namen()   # der Benutzername dieses PCs: kommt in den Daten für das Handy nie vor

    # ── Einstellung ──
    @property
    def port(self):
        if self._srv is not None:
            return self._srv.server_address[1]
        return self._port if self._port is not None else lesen(self.daten)["port"]

    def schluessel(self):
        """Der gültige Schlüssel — leer, wenn die Ansicht gerade aus ist (die Datei wird bei jeder Anfrage gelesen: Aus und «Erneuern» wirken sofort)."""
        e = lesen(self.daten)
        return e["schluessel"] if e["an"] and not von_umgebung_gesperrt(self.env) else ""

    def namen(self):
        """Namen, unter denen dieser PC im Host-Kopf stehen darf (neben IP-Adressen und …ts.net)."""
        rechner = socket.gethostname().strip().lower()
        extra = {n.strip().lower() for n in str(self.env.get("KRYPTO_FERN_HOSTS", "")).split(",") if n.strip()}
        return ({rechner, rechner + ".local"} if rechner else set()) | {"localhost"} | extra

    # ── Protokoll ──
    def ereignis(self, art, quelle, info=""):
        """Merkt einen Vorfall. Derselbe Vorfall (Art + Quelle) zählt hoch und rückt nach vorn, statt einen neuen Platz zu belegen."""
        jetzt = datetime.now(timezone.utc).isoformat(timespec="seconds")
        schluessel = (str(art), str(quelle)[:64])
        with self._lock:
            e = self._ereignisse.pop(schluessel, None)
            e = dict(e, zeit=jetzt, info=str(info)[:40], n=e["n"] + 1) if e else {"zeit": jetzt, "art": schluessel[0], "quelle": schluessel[1], "info": str(info)[:40], "n": 1}
            self._ereignisse[schluessel] = e
            while len(self._ereignisse) > 60:
                self._ereignisse.popitem(last=False)

    def _neues_geraet(self, quelle, wie):
        """Die erste Sichtung einer Quelladresse geht per Telegram raus (die Karte am PC zeigt sie ohnehin)."""
        if not self.meldung:
            return
        text = (f"📱 Handy-Ansicht: ein neues Gerät hat die Ansicht geöffnet ({quelle}, {wie}). Warst du das nicht, im Cockpit am PC «Schlüssel erneuern» drücken "
                "oder in Telegram /handy aus schicken.")

        def senden():
            try:
                self.meldung(text)
            except Exception:  # noqa: BLE001 — eine Meldung darf die Ansicht nie stören
                pass
        if self.meldung_im_faden:
            threading.Thread(target=senden, daemon=True).start()
        else:
            senden()

    def zugriff(self, quelle):
        """Ein erlaubter Zugriff (Link, Kopf oder Cookie). Eine bisher nie gesehene Quelle wird gemeldet — auch wenn sie nur ein gespeichertes Cookie vorzeigt."""
        with self._lock:
            self._zuletzt[quelle] = self.uhr()
            if len(self._zuletzt) > 50:
                for q in sorted(self._zuletzt, key=self._zuletzt.get)[:len(self._zuletzt) - 50]:
                    self._zuletzt.pop(q, None)
            neu = quelle not in self._bekannt
            self._bekannt.add(quelle)
        if neu:
            self.ereignis("neues-geraet", quelle)
            self._neues_geraet(quelle, "mit gespeichertem Zugang")

    def angemeldet(self, quelle):
        with self._lock:
            neu = quelle not in self._bekannt
            self._bekannt.add(quelle)
        self.ereignis("angemeldet", quelle)
        if neu:
            self._neues_geraet(quelle, "mit dem Schlüssel")

    def geraete(self):
        jetzt = self.uhr()
        with self._lock:
            return [{"quelle": q, "vor_s": max(0, round(jetzt - t))} for q, t in sorted(self._zuletzt.items(), key=lambda x: -x[1])]

    # ── Inhalte (mit kurzem Zwischenspeicher) ──
    def _zwischen(self, name, fn):
        jetzt = self.uhr()
        with self._lock:
            t, wert = self._cache.get(name, (0, None))
            if wert is not None and 0 <= jetzt - t < self.ttl:
                return wert
        wert = fn()                      # nicht unter der Sperre: eine langsame Berechnung blockiert keine anderen Anfragen
        with self._lock:
            self._cache[name] = (self.uhr(), wert)
        return wert

    def stand(self):
        return self._zwischen("stand", lambda: bereinigen(self._stand_fn(), self._geheim))

    def profit(self):
        return self._zwischen("profit", lambda: bereinigen(self._profit_fn(), self._geheim))

    def seite(self):
        return seite_lesend(self._seite_fn())

    def markt(self):
        return seite_lesend(self._markt_fn())

    # ── Start und Stopp ──
    def laeuft(self):
        return self._srv is not None

    def starten(self):
        """Server starten, wenn die Ansicht eingeschaltet ist. → True, wenn er läuft."""
        with self._lock:
            if self._srv is not None:
                return True
            e = lesen(self.daten)
            if von_umgebung_gesperrt(self.env):
                self.fehler = "gesperrt: die Umgebungsvariable KRYPTO_FERN steht auf «aus»"
                return False
            if not e["an"]:
                self.fehler = ""
                return False
            port = self._port if self._port is not None else e["port"]
            klasse = type("FernAnsicht", (_Handler,), {"ctx": self})
            try:
                srv = _Server((self.adresse, port), klasse)
            except OSError as ex:
                self.fehler = f"Port {port} ist nicht frei ({ex.strerror or type(ex).__name__}) — läuft das Cockpit schon in einem zweiten Fenster?"
                return False
            self.fehler = ""
            self._srv = srv
            self._faden = threading.Thread(target=srv.serve_forever, kwargs={"poll_interval": 0.2}, daemon=True)
            self._faden.start()
            return True

    def stoppen(self):
        with self._lock:
            srv, faden, self._srv, self._faden = self._srv, self._faden, None, None
        if srv is None:
            return
        srv.shutdown()
        srv.server_close()
        if faden is not None:
            faden.join(5)

    def schalten(self, an, erneuern=False):
        """Vom Cockpit am PC: ein-, ausschalten oder den Schlüssel erneuern. → (ok, Text).
        Beim Ausschalten wird ZUERST der Server gestoppt und erst dann gespeichert: scheitert das Speichern (Windows hält die Datei gerade offen), antwortet trotzdem nichts mehr."""
        if an:
            if von_umgebung_gesperrt(self.env):
                return False, "Gesperrt: die Umgebungsvariable KRYPTO_FERN steht auf «aus» (Eingabeaufforderung: setx KRYPTO_FERN \"\", dann das Cockpit neu öffnen)."
            try:
                einschalten(self.daten, erneuern=erneuern)
            except OSError as ex:
                return False, f"⚠️ Die Einstellung ließ sich nicht speichern ({type(ex).__name__})."
            if not self.starten():
                return False, "⚠️ Die Handy-Ansicht ließ sich nicht starten: " + (self.fehler or "unbekannter Grund")
            return True, ("Neuer Schlüssel: alle bisherigen Links und angemeldeten Geräte sind ungültig." if erneuern else "Handy-Ansicht ist an (nur lesen).")
        self.stoppen()
        try:
            ausschalten(self.daten)
        except OSError as ex:
            return False, (f"⚠️ Die Handy-Ansicht ist GESTOPPT, aber die Einstellung ließ sich nicht speichern ({type(ex).__name__}): nach dem nächsten Öffnen des Cockpits wäre sie wieder an. "
                           "Die Datei data\\krypto-fern.json prüfen (zum Beispiel ein offenes Programm, das sie hält).")
        return True, "Handy-Ansicht ist aus. Alle bisherigen Links und angemeldeten Geräte sind ungültig; beim nächsten Einschalten gibt es einen neuen Schlüssel."

    def status(self):
        """Stand OHNE Schlüssel und ohne Adressen (für Telegram): an/läuft, Port, Fehler, zuletzt gesehene Geräte, letzte Ereignisse."""
        e = lesen(self.daten)
        laeuft = self.laeuft()
        with self._lock:
            ereignisse = [dict(e) for e in reversed(self._ereignisse.values())][:10]
        return {"an": e["an"], "laeuft": laeuft, "port": self.port if laeuft else e["port"], "gesperrt_durch_umgebung": von_umgebung_gesperrt(self.env), "fehler": self.fehler,
                "geraete": self.geraete(), "ereignisse": ereignisse}

    def ui(self, ips=None):
        """Für die Karte im Cockpit am PC: der Stand plus die Links MIT Schlüssel (nur über 127.0.0.1 ausliefern)."""
        e = lesen(self.daten)
        u = self.status()
        return dict(u, adressen=adressen(u["port"], e["schluessel"], ips) if e["an"] and e["schluessel"] else [], erzeugt=e["erzeugt"])


if __name__ == "__main__":
    print(__doc__)
