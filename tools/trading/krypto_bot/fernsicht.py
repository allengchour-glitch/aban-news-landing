#!/usr/bin/env python3
"""Handy-Ansicht: das Krypto-Cockpit NUR LESEN, vom Handy im Heimnetz und über einen privaten Tunnel (Tailscale).

STANDARD: AUS. Eingeschaltet wird sie nur auf dem PC (Karte «Handy-Ansicht» im Cockpit); mit `setx KRYPTO_FERN aus`
bleibt sie in jedem Fall aus. Zusätzlich zum Cockpit auf 127.0.0.1 läuft dann ein zweiter, EIGENER Webserver (Port 8766):

  • nur lesend: nur GET/HEAD und vier feste Adressen (Seite, Markt-Seite, Kontostand, Profit). Es gibt keine Knöpfe und keine
    Schreib-Adresse — Aufträge, Einstellungen und Not-Aus erreicht man hier nicht (Not-Aus: Telegram /stop oder am PC)
  • mit Zugangsschlüssel: 192 Bit Zufall. Den Link einmal öffnen, der Browser merkt sich den Zugang (Cookie), der Schlüssel
    verschwindet aus der Adresszeile; im Protokoll steht er nie
  • nur aus dem Heimnetz (192.168.x.x, 10.x.x.x, 172.16–31.x.x), dem Tailscale-Netz (100.64–127.x.x) und von diesem PC selbst:
    eine Anfrage aus dem öffentlichen Internet wird abgewiesen — auch dann, wenn jemand am Router einen Port freigibt
  • nur mit passendem Host-Kopf (gegen DNS-Rebinding: eine fremde Seite, deren Name plötzlich auf diesen PC zeigt)
  • Sperre einer Quelle nach fünf falschen Schlüsseln (15 Minuten)
  • Kontodaten ohne Pfade dieses PCs

Von unterwegs (Mobilfunk) kommt man NUR durch einen PRIVATEN Tunnel (Tailscale: PC und Handy im selben privaten, verschlüsselten
Netz). Ein Port am Router ins offene Internet wird bewusst NICHT unterstützt: es gäbe kein HTTPS, der Schlüssel liefe im Klartext.

Das Modul kennt das Cockpit nicht (Seite, Kontostand und Profit kommen als Funktionen herein): es kann daher nichts auslösen.
Nur Python-Standardbibliothek.
"""
from __future__ import annotations

import hashlib
import hmac
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
from collections import deque
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
    """Atomar schreiben (Wegwerfdatei, dann ersetzen), wo möglich nur für den Besitzer lesbar."""
    Path(daten).mkdir(parents=True, exist_ok=True)
    ziel = _datei(daten)
    tmp = ziel.with_name(ziel.name + ".tmp")
    tmp.write_text(json.dumps({"an": bool(einst.get("an")), "schluessel": einst.get("schluessel", ""), "port": einst.get("port", PORT),
                               "erzeugt": einst.get("erzeugt", "")}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    os.replace(tmp, ziel)


def einschalten(daten, erneuern=False):
    """Ansicht an. Einen vorhandenen Schlüssel behält sie, ausser `erneuern` (dann sind alle bisherigen Links und Cookies ungültig)."""
    e = lesen(daten)
    s, erzeugt = e["schluessel"], e["erzeugt"]
    if erneuern or not s:
        s, erzeugt = neuer_schluessel(), datetime.now(timezone.utc).isoformat(timespec="seconds")
    schreiben(daten, {"an": True, "schluessel": s, "port": e["port"], "erzeugt": erzeugt})
    return lesen(daten)


def ausschalten(daten):
    """Ansicht aus; der Schlüssel bleibt gespeichert (einschalten nimmt ihn wieder)."""
    e = lesen(daten)
    schreiben(daten, {"an": False, "schluessel": e["schluessel"], "port": e["port"], "erzeugt": e["erzeugt"]})
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
_PFAD_WIN = re.compile(r"(?:(?<![A-Za-z0-9])[A-Za-z]:[\\/]|\\\\)(?:[^\\/\s\"'<>|:*?]+[\\/])*([^\\/\s\"'<>|:*?]*)")   # «https://…» ist kein Laufwerk: davor darf kein Buchstabe stehen
_PFAD_POSIX = re.compile(r"(?<![\w.~-])/(?:home|Users|root|tmp|var|opt|mnt)/(?:[^/\s\"'<>|]+/)*([^/\s\"'<>|]*)")


def bereinigen(x, _tiefe=0):
    """Kopie von Daten für die Handy-Ansicht: in Texten verschwinden Ordnerpfade dieses PCs («C:\\Users\\…\\data\\x.json» → «…\\x.json»)."""
    if _tiefe > 12:
        return None
    if isinstance(x, str):
        return _PFAD_POSIX.sub(lambda m: "…/" + m.group(1), _PFAD_WIN.sub(lambda m: "…\\" + m.group(1), x))
    if isinstance(x, dict):
        return {k: bereinigen(v, _tiefe + 1) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [bereinigen(v, _tiefe + 1) for v in x]
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
        if teile.scheme or teile.netloc or not teile.path.startswith("/") or teile.path.startswith("//"):
            return self._senden(400, {"fehler": "ungültige Adresse"})
        pfad = teile.path
        schluessel = c.schluessel()
        if not schluessel:
            return self._senden(503, {"fehler": "Handy-Ansicht ist ausgeschaltet"})
        vorgezeigt, wo = self._vorgezeigt(teile.query)
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
                return self._senden(303, b"", "text/plain; charset=utf-8", extra=(("Location", pfad), ("Set-Cookie", cookie)))
        elif not _gleich(_cookie_lesen(self.headers.get("Cookie")), cookie_wert(schluessel)):
            return self._senden(401, ZUGANG_SEITE, "text/html; charset=utf-8")
        c.zugriff(quelle)
        if pfad in ("/", "/index.html"):
            return self._antwort(c.seite, "text/html; charset=utf-8")
        if pfad in ("/markt", "/markt.html"):
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
        self._ereignisse = deque(maxlen=60)
        self._zuletzt = {}              # Quelle → letzter erlaubter Zugriff (Zeit)
        self._bekannt = set()           # Quellen, die sich schon angemeldet haben (nur die erste löst eine Meldung aus)

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
        e = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "art": art, "quelle": str(quelle)[:64], "info": str(info)[:40]}
        with self._lock:
            self._ereignisse.append(e)

    def zugriff(self, quelle):
        with self._lock:
            self._zuletzt[quelle] = self.uhr()
            if len(self._zuletzt) > 50:
                for q in sorted(self._zuletzt, key=self._zuletzt.get)[:len(self._zuletzt) - 50]:
                    self._zuletzt.pop(q, None)

    def angemeldet(self, quelle):
        with self._lock:
            neu = quelle not in self._bekannt
            self._bekannt.add(quelle)
        self.ereignis("angemeldet", quelle)
        if neu and self.meldung:
            text = (f"📱 Handy-Ansicht: ein Gerät hat sich mit dem Schlüssel angemeldet ({quelle}). Warst du das nicht, im Cockpit am PC «Schlüssel erneuern» drücken.")

            def senden():
                try:
                    self.meldung(text)
                except Exception:  # noqa: BLE001 — eine Meldung darf die Ansicht nie stören
                    pass
            if self.meldung_im_faden:
                threading.Thread(target=senden, daemon=True).start()
            else:
                senden()

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
        return self._zwischen("stand", lambda: bereinigen(self._stand_fn()))

    def profit(self):
        return self._zwischen("profit", lambda: bereinigen(self._profit_fn()))

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
        """Vom Cockpit am PC: ein-, ausschalten oder den Schlüssel erneuern. → (ok, Text)."""
        try:
            if an:
                if von_umgebung_gesperrt(self.env):
                    return False, "Gesperrt: die Umgebungsvariable KRYPTO_FERN steht auf «aus» (Eingabeaufforderung: setx KRYPTO_FERN \"\", dann das Cockpit neu öffnen)."
                einschalten(self.daten, erneuern=erneuern)
                if not self.starten():
                    return False, "⚠️ Die Handy-Ansicht ließ sich nicht starten: " + (self.fehler or "unbekannter Grund")
                return True, ("Neuer Schlüssel: alle bisherigen Links und angemeldeten Geräte sind ungültig." if erneuern else "Handy-Ansicht ist an (nur lesen).")
            ausschalten(self.daten)
            self.stoppen()
            return True, "Handy-Ansicht ist aus. Der Schlüssel bleibt gespeichert; beim nächsten Einschalten gilt er wieder."
        except OSError as ex:
            return False, f"⚠️ Die Einstellung ließ sich nicht speichern ({type(ex).__name__})."

    def ui(self, ips=None):
        """Für die Karte im Cockpit am PC (die Adressen tragen den Schlüssel — nur über 127.0.0.1 ausliefern)."""
        e = lesen(self.daten)
        laeuft = self.laeuft()
        port = self.port if laeuft else e["port"]
        with self._lock:
            ereignisse = list(self._ereignisse)[-10:][::-1]
        return {"an": e["an"], "laeuft": laeuft, "port": port, "gesperrt_durch_umgebung": von_umgebung_gesperrt(self.env), "fehler": self.fehler,
                "adressen": adressen(port, e["schluessel"], ips) if e["an"] and e["schluessel"] else [], "erzeugt": e["erzeugt"],
                "geraete": self.geraete(), "ereignisse": ereignisse}


if __name__ == "__main__":
    print(__doc__)
