#!/usr/bin/env python3
"""Tests für die Handy-Ansicht (nur lesend) — gegen einen ECHTEN Server auf 127.0.0.1 mit Wegwerf-Ordner, ohne Netz, ohne Schlüssel:
python3 tools/trading/krypto_bot/test_fernsicht.py

Kernfragen: Kommt man ohne Schlüssel an etwas heran? Gibt es irgendeine Schreib-Adresse oder -Methode? Hilft ein falscher Host, eine fremde Quelle,
ein altes Cookie? Landet der Schlüssel irgendwo im Protokoll? Und: kann das Modul überhaupt etwas auslösen (Aufträge, Prozesse, Netz nach aussen)?"""
from __future__ import annotations

import ast
import http.client
import io
import json
import os
import re
import socket
import sys
import tempfile
import threading
import time
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import fernsicht as F  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}", file=sys.__stdout__)


# ───────────────────────── Hilfen ─────────────────────────
def anfrage(port, methode="GET", pfad="/", host=None, kopf=None, cookie=None, body=None):
    """Roher HTTP-Aufruf mit frei wählbarem Host-Kopf (host=False: gar keiner). → (Status, Köpfe in Kleinschrift, Körper)."""
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
    try:
        c.putrequest(methode, pfad, skip_host=True, skip_accept_encoding=True)
        if host is not False:
            c.putheader("Host", host if host is not None else f"127.0.0.1:{port}")
        for k, v in (kopf or {}).items():
            c.putheader(k, v)
        if cookie:
            c.putheader("Cookie", f"{F.COOKIE}={cookie}")
        c.endheaders(body)
        r = c.getresponse()
        daten = r.read()
        return r.status, {k.lower(): v for k, v in r.getheaders()}, daten
    finally:
        c.close()


def roh(port, text):
    """Schickt rohe Bytes und liest ALLES bis zum Schliessen. → (Kopf, Körper)."""
    s_ = socket.create_connection(("127.0.0.1", port), timeout=10)
    try:
        s_.sendall(text.encode("latin-1"))
        daten = b""
        while True:
            stuck = s_.recv(65536)
            if not stuck:
                break
            daten += stuck
    finally:
        s_.close()
    kopf, _, body = daten.partition(b"\r\n\r\n")
    return kopf.decode("latin-1"), body


class Welt:
    """Ein laufender Fern-Server mit Spielfunktionen, die zählen, wie oft sie gerufen wurden."""

    def __init__(self, ttl=0.0, an=True, env=None):
        self.td = tempfile.TemporaryDirectory()
        self.daten = Path(self.td.name)
        self.aufrufe = {"stand": 0, "profit": 0, "seite": 0, "markt": 0}
        self.zeit = [1000.0]
        self.meldungen = []
        self.stand_fehler = False
        self.env = dict(env or {})
        w = self

        def stand_fn():
            w.aufrufe["stand"] += 1
            if w.stand_fehler:
                raise RuntimeError("Geheimtext C:\\Users\\alleng\\data\\x.json")
            return {"zeit": "2026-11-04T10:00:00+00:00", "konto": {"wert": 5000.0}, "kontostand": [["2026-11-03", 5000.0]],
                    "gesundheit": [{"name": "Datei", "ok": None, "text": "fehlt: C:\\Users\\alleng\\krypto\\data\\krypto-pilot.json und /home/alleng/x/y.txt"}],
                    "modus": "TESTNETZ"}

        def profit_fn():
            w.aufrufe["profit"] += 1
            return {"modus": "TESTNETZ", "stand": "ok", "hinweis": "gelesen aus C:\\Users\\alleng\\krypto\\data\\profit.json"}

        def seite_fn():
            w.aufrufe["seite"] += 1
            return b'<!doctype html>\n<html lang="de">\n<head>\n<title>T</title></head><body>SEITE-GEHEIM<button data-a="handeln"></button></body></html>'

        def markt_fn():
            w.aufrufe["markt"] += 1
            return b'<!doctype html><html lang="de"><head><title>M</title></head><body>MARKT-GEHEIM</body></html>'

        self.s = F.FernServer(self.daten, stand_fn, profit_fn, seite_fn, markt_fn, meldung=self.meldungen.append, env=self.env,
                              uhr=lambda: self.zeit[0], ttl=ttl, adresse="127.0.0.1", port=0, meldung_im_faden=False)
        if an:
            F.einschalten(self.daten)
        self.laeuft = self.s.starten()
        self.key = F.lesen(self.daten)["schluessel"]
        self.cookie = F.cookie_wert(self.key) if self.key else ""

    @property
    def port(self):
        return self.s.port

    def stopp(self):
        self.s.stoppen()
        self.td.cleanup()


def alles_text(x):
    return json.dumps(x, ensure_ascii=False, default=str)


# ───────────────────────── 1) Einstellung ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    d = Path(td)
    e0 = F.lesen(d)
    pruefe("Einstellung: ohne Datei ist alles aus und ohne Schlüssel", e0 == {"an": False, "schluessel": "", "port": F.PORT, "erzeugt": ""})
    e1 = F.einschalten(d)
    pruefe("Einstellung: einschalten erzeugt einen Schlüssel aus 32 Zeichen (192 Bit)", e1["an"] and len(e1["schluessel"]) == 32 and re.fullmatch(r"[A-Za-z0-9_-]{32}", e1["schluessel"]) is not None)
    pruefe("Einstellung: Port 8766 und Erzeugungszeit gesetzt", e1["port"] == 8766 and e1["erzeugt"].startswith("20"))
    e2 = F.einschalten(d)
    pruefe("Einstellung: nochmaliges Einschalten behält den Schlüssel", e2["schluessel"] == e1["schluessel"] and e2["erzeugt"] == e1["erzeugt"])
    e3 = F.einschalten(d, erneuern=True)
    pruefe("Einstellung: erneuern gibt einen anderen Schlüssel", e3["an"] and e3["schluessel"] != e1["schluessel"] and len(e3["schluessel"]) == 32)
    schluessel_viele = {F.neuer_schluessel() for _ in range(200)}
    pruefe("Einstellung: 200 neue Schlüssel sind alle verschieden", len(schluessel_viele) == 200)
    e4 = F.ausschalten(d)
    pruefe("Einstellung: ausschalten VERGISST den Schlüssel (alle bisherigen Links ungültig), an=False", not e4["an"] and e4["schluessel"] == "" and e4["erzeugt"] == "")
    pruefe("Einstellung: eingeschaltet() sieht das", not F.eingeschaltet(d, {}))
    F.einschalten(d)
    pruefe("Einstellung: Einschalten nach dem Ausschalten erzeugt einen NEUEN Schlüssel", F.lesen(d)["schluessel"] not in ("", e3["schluessel"]) and len(F.lesen(d)["schluessel"]) == 32)
    pruefe("Einstellung: eingeschaltet() ohne Sperre ja", F.eingeschaltet(d, {}))
    pruefe("Einstellung: KRYPTO_FERN=aus sperrt in jedem Fall", not F.eingeschaltet(d, {"KRYPTO_FERN": "aus"}) and not F.eingeschaltet(d, {"KRYPTO_FERN": " AUS "}))
    pruefe("Einstellung: andere Werte von KRYPTO_FERN sperren nicht", F.eingeschaltet(d, {"KRYPTO_FERN": ""}) and F.eingeschaltet(d, {"KRYPTO_FERN": "an"}))
    pruefe("Einstellung: keine Wegwerfdatei bleibt liegen", [p.name for p in d.iterdir()] == [F.DATEI])
    if os.name != "nt":
        pruefe("Einstellung: Datei nur für den Besitzer lesbar (0600)", (d / F.DATEI).stat().st_mode & 0o777 == 0o600)
    # kaputte und unsinnige Dateien → im Zweifel AUS
    gut = F.lesen(d)["schluessel"]
    faelle = {
        "kein JSON": "{{{",
        "kein Objekt": "[1,2]",
        "an als Text": json.dumps({"an": "true", "schluessel": gut}),
        "an als Zahl": json.dumps({"an": 1, "schluessel": gut}),
        "Schlüssel zu kurz": json.dumps({"an": True, "schluessel": "abc"}),
        "Schlüssel fehlt": json.dumps({"an": True}),
        "Schlüssel mit Leerzeichen": json.dumps({"an": True, "schluessel": "a" * 19 + " " + "b" * 12}),
        "Schlüssel mit Sonderzeichen": json.dumps({"an": True, "schluessel": "a" * 31 + "é"}),
        "Schlüssel keine Zeichenkette": json.dumps({"an": True, "schluessel": 12345678901234567890123}),
        "leere Datei": "",
    }
    for name, inhalt in faelle.items():
        (d / F.DATEI).write_text(inhalt, encoding="utf-8")
        e = F.lesen(d)
        pruefe(f"Einstellung kaputt «{name}»: AUS und kein Schlüssel", e["an"] is False and (name in ("an als Text", "an als Zahl") or e["schluessel"] == "") , e)
    (d / F.DATEI).write_text(json.dumps({"an": True, "schluessel": gut, "port": True}), encoding="utf-8")
    pruefe("Einstellung: Port True zählt nicht als Zahl", F.lesen(d)["port"] == F.PORT)
    for p in (80, 1023, 65536, "8766", 8766.5, None, -1):
        (d / F.DATEI).write_text(json.dumps({"an": True, "schluessel": gut, "port": p}), encoding="utf-8")
        pruefe(f"Einstellung: Port {p!r} ungültig → Standard", F.lesen(d)["port"] == F.PORT)
    (d / F.DATEI).write_text(json.dumps({"an": True, "schluessel": gut, "port": 9000}), encoding="utf-8")
    pruefe("Einstellung: Port 9000 gültig", F.lesen(d)["port"] == 9000)
    (d / F.DATEI).unlink()
    (d / F.DATEI).mkdir()                       # ein Ordner statt Datei: OSError beim Lesen
    pruefe("Einstellung: Ordner statt Datei → AUS, kein Absturz", F.lesen(d)["an"] is False)

# ───────────────────────── 2) Quell-Adressen ─────────────────────────
ERLAUBT = ["127.0.0.1", "127.9.9.9", "10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.255.255", "192.168.0.1", "192.168.255.254", "169.254.1.1",
           "100.64.0.1", "100.101.102.103", "100.127.255.254", "::1", "fd00::1", "fc00::5", "fe80::1", "fe80::1%eth0", "::ffff:192.168.1.5", "::ffff:100.64.0.9"]
VERBOTEN = ["8.8.8.8", "1.1.1.1", "172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "192.167.1.1", "192.169.0.1", "11.0.0.1", "9.255.255.255",
            "0.0.0.0", "255.255.255.255", "2001:4860:4860::8888", "fe7f::1", "::", "::ffff:8.8.8.8", "", "abc", "1.2.3.4.5", "999.1.1.1", None, "192.168.1", "224.0.0.1"]
for a in ERLAUBT:
    pruefe(f"Quelle erlaubt: {a}", F.quelle_erlaubt(a) is True)
for a in VERBOTEN:
    pruefe(f"Quelle verboten: {a!r}", F.quelle_erlaubt(a) is False)
pruefe("Tailscale erkannt: 100.64.0.1 ja, 192.168.1.1 nein, IPv6 nein", F.ist_tailscale("100.64.0.1") and not F.ist_tailscale("192.168.1.1") and not F.ist_tailscale("fd00::1") and not F.ist_tailscale("x"))

# ───────────────────────── 3) Host-Kopf ─────────────────────────
NAMEN = {"mein-pc", "mein-pc.local", "localhost"}
H_JA = ["127.0.0.1:8766", "192.168.1.23:8766", "10.1.1.1:8766", "100.101.102.103:8766", "[::1]:8766", "[fd00::5]:8766", "mein-pc:8766", "MEIN-PC:8766",
        "mein-pc.local:8766", "localhost:8766", "laptop.tail1234.ts.net:8766", "a.b.ts.net:8766"]
H_NEIN = ["", None, "192.168.1.23", "192.168.1.23:80", "192.168.1.23:8767", "192.168.1.23:8766:8766", "8.8.8.8:8766", "evil.com:8766", "mein-pc.evil.com:8766",
          "192.168.1.23.evil.com:8766", "evil.com", "ts.net:8766", ".ts.net:8766", "evil.ts.net.evil.com:8766", "x.ts.net.:8766", "mein-pc:8766 evil", "mein-pc:8766/x",
          "user@mein-pc:8766", "[::1]", "[::1]:80", "[8.8.8.8]:8766", "::1:8766", "[::1:8766", "mein-pc :8766", "mein-pc\r\nX: y:8766", "a" * 300 + ":8766",
          "public.example.org:8766", "mein-pc.local.:8766", ":8766", "[]:8766", "0.0.0.0:8766", "172.32.0.1:8766", "100.128.0.1:8766"]
for h in H_JA:
    pruefe(f"Host erlaubt: {h}", F.host_erlaubt(h, 8766, NAMEN) is True)
for h in H_NEIN:
    pruefe(f"Host verboten: {h!r}", F.host_erlaubt(h, 8766, NAMEN) is False)
pruefe("Host: ein IP-Literal kommt nie über die Namensliste (öffentliche IP in `namen` hilft nicht)", F.host_erlaubt("8.8.8.8:8766", 8766, {"8.8.8.8"}) is False)
pruefe("Host: der Port muss zum Server passen", F.host_erlaubt("192.168.1.2:9000", 9000, ()) and not F.host_erlaubt("192.168.1.2:8766", 9000, ()))

# ───────────────────────── 4) Schlüssel, Cookie ─────────────────────────
k1, k2 = F.neuer_schluessel(), F.neuer_schluessel()
pruefe("Cookie: 64 Hex-Zeichen, nicht der Schlüssel, nicht darin enthalten", re.fullmatch(r"[0-9a-f]{64}", F.cookie_wert(k1)) is not None and k1 not in F.cookie_wert(k1))
pruefe("Cookie: gleich bei gleichem Schlüssel, anders bei anderem", F.cookie_wert(k1) == F.cookie_wert(k1) and F.cookie_wert(k1) != F.cookie_wert(k2))
pruefe("Vergleich: gleich/ungleich, ungleiche Länge, Unsinn, Umlaute", F._gleich("abc", "abc") and not F._gleich("abc", "abd") and not F._gleich("abc", "abcd") and not F._gleich("", "abc")
       and not F._gleich("é" * 40, "abc") and F._gleich("é", "é") and not F._gleich(None, "abc"))
pruefe("Cookie lesen: richtiger Name, mehrere Cookies, fremder Name, leer", F._cookie_lesen("a=1; krypto_fern=XYZ; b=2") == "XYZ" and F._cookie_lesen("krypto_fern=Q") == "Q"
       and F._cookie_lesen("x_krypto_fern=Q") == "" and F._cookie_lesen("") == "" and F._cookie_lesen(None) == "" and F._cookie_lesen("krypto_fern") == "")

# ───────────────────────── 5) Sperre ─────────────────────────
uhr = [0.0]
sp = F.Sperre(uhr=lambda: uhr[0])
for _ in range(4):
    sp.fehler("a")
pruefe("Sperre: vier Fehler sperren noch nicht", not sp.gesperrt("a"))
sp.fehler("a")
pruefe("Sperre: der fünfte sperrt", sp.gesperrt("a"))
pruefe("Sperre: eine andere Quelle bleibt frei", not sp.gesperrt("b"))
uhr[0] = F.SPERRE_S - 1
pruefe("Sperre: kurz vor Ablauf noch gesperrt", sp.gesperrt("a"))
uhr[0] = F.SPERRE_S + 1
pruefe("Sperre: nach 15 Minuten wieder frei", not sp.gesperrt("a"))
uhr[0] = 10_000.0
for _ in range(4):
    sp.fehler("c")
uhr[0] += F.FEHLER_FENSTER_S + 1
sp.fehler("c")
pruefe("Sperre: Fehler ausserhalb des Zehn-Minuten-Fensters zählen nicht mit", not sp.gesperrt("c"))
for _ in range(3):
    sp.fehler("d")
sp.erfolg("d")
for _ in range(4):
    sp.fehler("d")
pruefe("Sperre: ein Erfolg setzt den Zähler zurück", not sp.gesperrt("d"))
sp2 = F.Sperre(uhr=lambda: uhr[0])
for i in range(600):
    sp2.fehler(f"q{i}")
uhr[0] += F.FEHLER_FENSTER_S + 5
sp2.fehler("neu")
pruefe("Sperre: der Speicher wächst nicht unbegrenzt (alte Quellen werden geräumt)", len(sp2._fehler) < 50, len(sp2._fehler))

# ───────────────────────── 6) Daten für die Handy-Seite ─────────────────────────
pruefe("Bereinigen: Windows-Pfad → nur der Dateiname", F.bereinigen("fehlt: C:\\Users\\alleng\\krypto\\data\\krypto-pilot.json") == "fehlt: …\\krypto-pilot.json")
pruefe("Bereinigen: Laufwerk mit Schrägstrichen", F.bereinigen("D:/Daten/x/y.json!") == "…\\y.json!")
pruefe("Bereinigen: Netzwerkpfad", F.bereinigen("\\\\SERVER\\freigabe\\a\\b.txt zu") == "…\\b.txt zu")
pruefe("Bereinigen: POSIX-Pfad", F.bereinigen("in /home/user/aban/data/x.json gelesen") == "in …/x.json gelesen")
pruefe("Bereinigen: Adressen und normale Texte bleiben", F.bereinigen("https://data-api.binance.vision/api/v3/ticker?symbol=ETHUSDT und «C:» und 5 : 3") == "https://data-api.binance.vision/api/v3/ticker?symbol=ETHUSDT und «C:» und 5 : 3")
pruefe("Bereinigen: URL mit /home/ bleibt (kein Pfad dieses PCs)", F.bereinigen("https://example.org/home/foo/bar") == "https://example.org/home/foo/bar")
pruefe("Bereinigen: verschachtelt, Zahlen und None bleiben, Schlüssel bleiben", F.bereinigen({"a": [1, 2.5, None, True, {"b": "C:\\x\\y.txt"}], "C:\\k": 3}) == {"a": [1, 2.5, None, True, {"b": "…\\y.txt"}], "C:\\k": 3})
tief = x = {}
for _ in range(40):
    x["n"] = {}
    x = x["n"]
pruefe("Bereinigen: absurd tiefe Daten stürzen nicht ab", isinstance(F.bereinigen(tief), dict))

roh_seite = b'<!doctype html>\n<html lang="de">\n<head>\n<title>T</title></head><body>x</body></html>'
lesend = F.seite_lesend(roh_seite).decode("utf-8")
pruefe("Seite lesend: <html> trägt data-nur-lesen genau einmal", lesend.count('data-nur-lesen="1"') == 1 and '<html lang="de" data-nur-lesen="1">' in lesend)
pruefe("Seite lesend: noindex-Meta nach <head>, Rest unverändert", '<head>\n<meta name="robots" content="noindex, nofollow">' in lesend and "<title>T</title></head><body>x</body></html>" in lesend)
try:
    F.seite_lesend(b"<p>kein html-Kopf</p>")
    pruefe("Seite lesend: Text ohne <html> wird abgelehnt", False)
except ValueError:
    pruefe("Seite lesend: Text ohne <html> wird abgelehnt", True)
echt = (HIER / "cockpit.html").read_bytes()
echt_lesend = F.seite_lesend(echt).decode("utf-8")
pruefe("Seite lesend: die ECHTE cockpit.html bekommt das Merkmal genau einmal und wird nur länger", echt_lesend.count('data-nur-lesen="1"') == 1 and len(F.seite_lesend(echt)) > len(echt))
pruefe("Seite lesend: die ECHTE markt.html geht auch", b'data-nur-lesen="1"' in F.seite_lesend((HIER / "markt.html").read_bytes()))

# ───────────────────────── 7) Adressen für die Anzeige ─────────────────────────
KEY = "K" * 32
adr = F.adressen(8766, KEY, ips=["192.168.1.23", "100.101.102.103", "127.0.0.1", "8.8.8.8", "169.254.5.5", "fe80::1", "abc", "10.0.0.4", "192.168.1.23", "::1"])
pruefe("Adressen: nur Heimnetz und Tailscale, ohne Loopback/öffentlich/Unsinn/IPv6, Heimnetz zuerst", [a["anzeige"] for a in adr] == ["http://10.0.0.4:8766/", "http://192.168.1.23:8766/", "http://192.168.1.23:8766/", "http://100.101.102.103:8766/"], adr)
pruefe("Adressen: URL trägt den Schlüssel, die Anzeige nicht, Art stimmt", all(a["url"] == a["anzeige"] + "?k=" + KEY and KEY not in a["anzeige"] for a in adr) and adr[-1]["tailscale"] and adr[-1]["art"].startswith("Tailscale") and adr[0]["art"].startswith("Heimnetz"))
pruefe("Adressen: ohne Treffer leer", F.adressen(8766, KEY, ips=[]) == [])
_alt_socket = socket.socket
_alt_gai = socket.getaddrinfo


def _kaputt(*a, **k):
    raise OSError("kein Netz")


socket.socket, socket.getaddrinfo = _kaputt, _kaputt
try:
    pruefe("Adressen: ohne Netzwerk keine Ausnahme, leere Liste", F.lokale_ips() == [])
finally:
    socket.socket, socket.getaddrinfo = _alt_socket, _alt_gai
ips_echt = F.lokale_ips()
pruefe("Adressen: lokale_ips() liefert IPv4-Zeichenketten", isinstance(ips_echt, list) and all(re.fullmatch(r"\d+\.\d+\.\d+\.\d+", i) for i in ips_echt), ips_echt)

# ───────────────────────── 8) Echter Server ─────────────────────────
mit_ausgabe = io.StringIO(), io.StringIO()
with redirect_stdout(mit_ausgabe[0]), redirect_stderr(mit_ausgabe[1]):
    # 8a) ausgeschaltet = es lauscht nichts
    w = Welt(an=False)
    pruefe("Server: ausgeschaltet startet nichts", not w.laeuft and not w.s.laeuft() and w.s.fehler == "")
    w.stopp()
    w = Welt(env={"KRYPTO_FERN": "aus"})
    pruefe("Server: KRYPTO_FERN=aus startet trotz «an» nichts und sagt warum", not w.laeuft and "KRYPTO_FERN" in w.s.fehler)
    datei_vor = (w.daten / F.DATEI).read_bytes()
    ok_, text_ = w.s.schalten(True, erneuern=True)
    pruefe("Server: einschalten bei gesperrter Umgebung wird abgelehnt und schreibt nichts (auch keinen neuen Schlüssel)", not ok_ and "Gesperrt" in text_ and (w.daten / F.DATEI).read_bytes() == datei_vor)
    w.stopp()

    w = Welt()
    P, KEY, COOKIE = w.port, w.key, w.cookie
    pruefe("Server: läuft nach dem Einschalten, auf 127.0.0.1 gebunden (Test)", w.laeuft and P > 0)
    pruefe("Server: starten ist wiederholbar", w.s.starten() is True and w.s.port == P)

    # 8b) ohne Zugang
    st, kopf, body = anfrage(P, "GET", "/")
    pruefe("Ohne Zugang: / → 401 mit Hinweisseite", st == 401 and "Zugang nötig".encode() in body and b"SEITE-GEHEIM" not in body)
    for pfad in ("/", "/index.html", "/markt", "/markt.html", "/api/stand", "/api/profit", "/nichts", "/api/aktion"):
        st, kopf, body = anfrage(P, "GET", pfad)
        pruefe(f"Ohne Zugang: {pfad} → 401 und nichts davon verraten", st == 401 and b"GEHEIM" not in body and b"5000" not in body and b"TESTNETZ" not in body)
    pruefe("Ohne Zugang: keine einzige Berechnung wurde ausgelöst", sum(w.aufrufe.values()) == 0, w.aufrufe)

    # 8c) Anmelden mit dem Link
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Link mit Schlüssel: 303 nach «/» ohne Schlüssel in der Adresse", st == 303 and kopf.get("location") == "/" and KEY not in kopf.get("location", "") and body == b"")
    setcookie = kopf.get("set-cookie", "")
    pruefe("Link: Cookie HttpOnly, SameSite=Strict, Path=/, 30 Tage, abgeleiteter Wert", f"{F.COOKIE}={COOKIE}" in setcookie and "HttpOnly" in setcookie and "SameSite=Strict" in setcookie
           and "Path=/" in setcookie and f"Max-Age={F.COOKIE_SEKUNDEN}" in setcookie, setcookie)
    pruefe("Link: im Cookie steht der Schlüssel NICHT", KEY not in setcookie and KEY not in alles_text(kopf))
    st, kopf, body = anfrage(P, "GET", f"/api/stand?k={KEY}&x=1")
    pruefe("Link mit weiteren Angaben: auch hier 303 auf den reinen Pfad", st == 303 and kopf.get("location") == "/api/stand")
    pruefe("Link: die Anmeldung selbst löst keine Berechnung aus", sum(w.aufrufe.values()) == 0)

    # 8d) mit Cookie
    st, kopf, body = anfrage(P, "GET", "/", cookie=COOKIE)
    pruefe("Mit Cookie: / → 200, Lesemodus-Merkmal, Seite geliefert", st == 200 and b"SEITE-GEHEIM" in body and b'data-nur-lesen="1"' in body and "text/html" in kopf["content-type"])
    st, kopf, body = anfrage(P, "GET", "/markt", cookie=COOKIE)
    pruefe("Mit Cookie: /markt → 200", st == 200 and b"MARKT-GEHEIM" in body and b'data-nur-lesen="1"' in body)
    st, kopf, body = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    j = json.loads(body) if st == 200 else {}
    pruefe("Mit Cookie: /api/stand → 200, JSON, Konto da", st == 200 and j.get("konto", {}).get("wert") == 5000.0 and "application/json" in kopf["content-type"])
    pruefe("Mit Cookie: Pfade des PCs sind aus den Texten verschwunden", "alleng" not in body.decode() and "…\\krypto-pilot.json" in body.decode().replace("\\\\", "\\") and "…/y.txt" in body.decode(), body[:300])
    st, kopf, body = anfrage(P, "GET", "/api/profit?x=1", cookie=COOKIE)
    pruefe("Mit Cookie: /api/profit mit Abfrage-Teil → 200", st == 200 and json.loads(body).get("stand") == "ok")
    pruefe("Mit Cookie: auch im Profit sind die Pfade des PCs verschwunden", "alleng" not in body.decode() and "profit.json" in body.decode(), body[:200])
    pruefe("Mit Cookie: die Berechnungen liefen je einmal", w.aufrufe == {"stand": 1, "profit": 1, "seite": 1, "markt": 1}, w.aufrufe)
    for pfad in ("/api/aktion", "/api/notaus", "/api/fern", "/api/protokoll", "/api/stand/", "/api/stand.json", "/INDEX.HTML", "/../etc/passwd", "/%2e%2e/x", "/api/%73tand", "/cockpit.py",
                 "/data/krypto-fern.json", "/krypto-fern.json", "/.git/config", "/favicon.ico"):
        st, kopf, body = anfrage(P, "GET", pfad, cookie=COOKIE)
        pruefe(f"Mit Cookie: unbekannte Adresse {pfad} → 404, nichts verraten", st == 404 and KEY.encode() not in body and b"GEHEIM" not in body)
    st, kopf, body = anfrage(P, "GET", "//evil.example/x", cookie=COOKIE)
    pruefe("Adresse mit «//»: 400 oder 404 (nie als fremder Host gelesen, nie geliefert)", st in (400, 404) and b"GEHEIM" not in body, st)
    st, kopf, body = anfrage(P, "GET", "http://evil.example/", cookie=COOKIE)
    pruefe("Absolute Adresse (Proxy-Form): 400", st == 400)

    # 8e) Kopf-Schlüssel
    st, kopf, body = anfrage(P, "GET", "/api/stand", kopf={"X-Krypto-Fern": KEY})
    pruefe("Schlüssel im Kopf X-Krypto-Fern: 200 ohne Cookie, kein Umleiten", st == 200 and "set-cookie" not in kopf)
    st, kopf, body = anfrage(P, "GET", "/api/stand", kopf={"Authorization": f"Bearer {KEY}"})
    pruefe("Schlüssel als Bearer: 200", st == 200)
    st, kopf, body = anfrage(P, "GET", "/api/stand", kopf={"Authorization": "Basic " + KEY})
    pruefe("Authorization «Basic» zählt nicht", st == 401)

    # 8f) Methoden: nichts Schreibendes, auch nicht mit gültigem Zugang
    vor = dict(w.aufrufe)
    for m in ("POST", "PUT", "DELETE", "PATCH", "OPTIONS"):
        for pfad in ("/", "/api/aktion", "/api/notaus", "/api/fern", "/api/stand", "/api/profit", "/markt"):
            st, kopf, body = anfrage(P, m, pfad, cookie=COOKIE, kopf={"X-Cockpit": "1", "Content-Type": "application/json", "Origin": f"http://127.0.0.1:{P}"},
                                     body=b'{"aktion": "handeln", "an": true}' if m in ("POST", "PUT", "PATCH", "DELETE") else None)
            pruefe(f"Methode {m} {pfad} mit Cookie → 405, Allow nur GET/HEAD", st == 405 and kopf.get("allow") == "GET, HEAD", (st, kopf.get("allow")))
        st, kopf, body = anfrage(P, m, "/api/aktion", kopf={"X-Krypto-Fern": KEY}, body=b"{}")
        pruefe(f"Methode {m} mit Schlüssel im Kopf → 405", st == 405)
    for m, pfad in (("TRACE", "/"), ("CONNECT", "evil.example:443"), ("PROPFIND", "/"), ("BREW", "/")):
        st, kopf, body = anfrage(P, m, pfad, cookie=COOKIE)
        pruefe(f"Unbekannte Methode {m} → 501, nie 200", st == 501, st)
    pruefe("Schreib-Versuche lösten KEINE Berechnung und keinen Aufruf aus", w.aufrufe == vor, (vor, w.aufrufe))

    # 8g) Host-Kopf
    vor = dict(w.aufrufe)
    for h in ("evil.example:%d" % P, "8.8.8.8:%d" % P, "192.168.1.23.evil.example:%d" % P, "127.0.0.1", "127.0.0.1:1", "[2001:db8::1]:%d" % P, "localhost", "evil.example", False):
        st, kopf, body = anfrage(P, "GET", "/api/stand", host=h, cookie=COOKIE)
        pruefe(f"Falscher Host {h!r}: 403 trotz gültigem Cookie", st == 403 and b"5000" not in body, st)
        st, kopf, body = anfrage(P, "GET", f"/?k={KEY}", host=h)
        pruefe(f"Falscher Host {h!r}: auch der Link mit Schlüssel geht nicht", st == 403 and "set-cookie" not in kopf)
    pruefe("Falscher Host löste nichts aus", w.aufrufe == vor)
    st, kopf, body = anfrage(P, "GET", "/api/stand", host=f"localhost:{P}", cookie=COOKIE)
    pruefe("Host «localhost» mit Port geht (dieser PC)", st == 200)

    # 8h) fremde Quelle (das Netz lässt sich hier nicht fälschen: die Prüfung wird für diese eine Anfrage «öffentlich»)
    vor = dict(w.aufrufe)
    _alt_q = F.quelle_erlaubt
    F.quelle_erlaubt = lambda a: False
    try:
        st, kopf, body = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
        st2, _, body2 = anfrage(P, "GET", f"/?k={KEY}")
    finally:
        F.quelle_erlaubt = _alt_q
    pruefe("Fremde Quelle: 403, auch mit gültigem Cookie oder Schlüssel", st == 403 and st2 == 403 and b"5000" not in body and b"GEHEIM" not in body2)
    pruefe("Fremde Quelle: nichts ausgelöst, im Protokoll vermerkt", w.aufrufe == vor and any(e["art"] == "fremde-quelle" for e in w.s.ui()["ereignisse"]))

    # 8i) falsche Schlüssel und Sperre
    for i in range(4):
        st, kopf, body = anfrage(P, "GET", "/?k=falsch%d" % i)
        pruefe(f"Falscher Schlüssel {i + 1}: 401, kein Cookie", st == 401 and "set-cookie" not in kopf)
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Nach vier Fehlern geht der richtige Schlüssel noch (und setzt den Zähler zurück)", st == 303)
    for i in range(5):
        anfrage(P, "GET", "/?k=nochmals%d" % i)
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Fünf Fehler: sogar der RICHTIGE Schlüssel wird abgewiesen (429, Retry-After)", st == 429 and kopf.get("retry-after") == str(F.SPERRE_S) and "set-cookie" not in kopf)
    st, kopf, body = anfrage(P, "GET", "/api/stand", kopf={"X-Krypto-Fern": KEY})
    pruefe("Gesperrt: auch ein Schlüssel im Kopf zählt nicht", st == 429)
    st, kopf, body = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Gesperrt: wer schon angemeldet ist (Cookie), bleibt unberührt", st == 200)
    w.zeit[0] += F.SPERRE_S + 1
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Nach 15 Minuten geht der richtige Schlüssel wieder", st == 303)
    for i in range(3):
        anfrage(P, "GET", "/?k=vorher%d" % i)
    st, _, _ = anfrage(P, "GET", f"/?k={KEY}")
    for i in range(3):
        anfrage(P, "GET", "/?k=nachher%d" % i)
    st2, _, _ = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Ein erfolgreicher Schlüssel setzt den Zähler zurück: 3 Fehler, Erfolg, 3 Fehler sperren nicht", st == 303 and st2 == 303, (st, st2))
    # knapp daneben ist trotzdem falsch (Vergleich über die ganze Länge, nicht nur ein Anfang)
    for nahe, name in ((KEY[:-1] + ("A" if KEY[-1] != "A" else "B"), "letztes Zeichen anders"), (KEY[:-1], "ein Zeichen zu kurz"), (KEY + "x", "ein Zeichen zu lang"),
                       (("A" if KEY[0] != "A" else "B") + KEY[1:], "erstes Zeichen anders")):
        st, kopf, body = anfrage(P, "GET", f"/?k={nahe}")
        pruefe(f"Schlüssel knapp daneben ({name}): 401", st == 401 and "set-cookie" not in kopf)
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("…und der echte danach geht wieder (Zähler zurückgesetzt)", st == 303)
    for nahe_c, name in ((COOKIE[:-1] + ("0" if COOKIE[-1] != "0" else "1"), "letztes Zeichen anders"), (COOKIE[:-1], "zu kurz"), (COOKIE + "0", "zu lang"), (KEY, "der Schlüssel selbst als Cookie"), (COOKIE.upper(), "Grossschreibung")):
        st, _, _ = anfrage(P, "GET", "/api/stand", cookie=nahe_c)
        pruefe(f"Cookie knapp daneben ({name}): 401", st == 401)
    # falsches Cookie zählt nicht
    for i in range(12):
        st, kopf, body = anfrage(P, "GET", "/api/stand", cookie="0" * 64)
        pruefe(f"Falsches Cookie {i + 1}: 401", st == 401)
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Zwölf falsche Cookies sperren niemanden aus (nach «Schlüssel erneuern» schickt das alte Cookie sonst Fehler im Minutentakt)", st == 303)

    # 8j) Köpfe der Antworten
    for st_, pfad_, ck in ((200, "/api/stand", COOKIE), (401, "/", None), (404, "/x", COOKIE), (405, "/", COOKIE), (403, "/", COOKIE)):
        s2, kopf, body = anfrage(P, "POST" if st_ == 405 else "GET", pfad_, cookie=ck, host=("evil.example:1" if st_ == 403 else None))
        pruefe(f"Köpfe bei {s2}: no-store, nosniff, DENY, CSP, no-referrer, noindex", s2 == st_ and kopf.get("cache-control") == "no-store" and kopf.get("x-content-type-options") == "nosniff"
               and kopf.get("x-frame-options") == "DENY" and "frame-ancestors 'none'" in kopf.get("content-security-policy", "") and kopf.get("referrer-policy") == "no-referrer"
               and "noindex" in kopf.get("x-robots-tag", ""), kopf)
        pruefe(f"Köpfe bei {s2}: Server nennt weder Python noch Version", kopf.get("server") == "KryptoFern" and "python" not in alles_text(kopf).lower())
    st, kopf, body = anfrage(P, "HEAD", "/api/stand", cookie=COOKIE)
    pruefe("HEAD: 200, Länge gesetzt, kein Körper", st == 200 and body == b"" and int(kopf.get("content-length", "0")) > 10)
    st, kopf, body = anfrage(P, "HEAD", "/", cookie=COOKIE)
    pruefe("HEAD auf die Seite: kein Körper", st == 200 and body == b"")
    st, kopf, body = anfrage(P, "HEAD", "/api/stand")
    pruefe("HEAD ohne Zugang: 401", st == 401)
    for pfad_h, cookie_h in (("/api/stand", COOKIE), ("/", COOKIE), ("/api/stand", "0" * 64)):
        k_, b_ = roh(P, f"HEAD {pfad_h} HTTP/1.0\r\nHost: 127.0.0.1:{P}\r\nCookie: {F.COOKIE}={cookie_h}\r\n\r\n")
        pruefe(f"HEAD roh gelesen {pfad_h} ({'mit' if cookie_h == COOKIE else 'ohne gültiges'} Cookie): nach dem Kopf kommt kein einziges Byte", b_ == b"" and k_.startswith("HTTP/1."), (k_[:40], b_[:40]))
    k_, b_ = roh(P, f"GET /api/stand HTTP/1.0\r\nHost: 127.0.0.1:{P}\r\nCookie: {F.COOKIE}={COOKIE}\r\n\r\n")
    pruefe("Zum Vergleich: GET roh gelesen liefert den Körper", b_.startswith(b"{") and b"5000" in b_)

    # 8k) Schlüssel erneuern und Ausschalten wirken sofort, ohne Neustart
    alter_cookie, alter_key = COOKIE, KEY
    ok_, text_ = w.s.schalten(True, erneuern=True)
    neu = F.lesen(w.daten)["schluessel"]
    pruefe("Erneuern: neuer Schlüssel, Server läuft weiter auf demselben Port", ok_ and neu != alter_key and w.s.port == P and "ungültig" in text_)
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=alter_cookie)
    pruefe("Erneuern: das alte Cookie gilt nicht mehr", st == 401)
    st, _, _ = anfrage(P, "GET", f"/?k={alter_key}")
    pruefe("Erneuern: der alte Link gilt nicht mehr", st == 401)
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=F.cookie_wert(neu))
    pruefe("Erneuern: Cookie zum neuen Schlüssel geht", st == 200)
    KEY, COOKIE = neu, F.cookie_wert(neu)
    # Datei von Hand auf «aus»: sofort 503
    e = F.lesen(w.daten)
    F.schreiben(w.daten, {"an": False, "schluessel": e["schluessel"], "port": e["port"], "erzeugt": e["erzeugt"]})
    st, kopf, body = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Datei auf «aus» gestellt: sofort 503, nichts geliefert", st == 503 and b"5000" not in body)
    st, kopf, body = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Datei «aus»: auch der Link geht nicht", st == 503 and "set-cookie" not in kopf)
    F.schreiben(w.daten, {"an": True, "schluessel": e["schluessel"], "port": e["port"], "erzeugt": e["erzeugt"]})
    w.s.env["KRYPTO_FERN"] = "aus"
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Umgebung KRYPTO_FERN=aus während des Laufs: sofort 503", st == 503)
    w.s.env["KRYPTO_FERN"] = ""
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("…und wieder frei, wenn die Sperre fällt", st == 200)
    ok_, text_ = w.s.schalten(False)
    pruefe("Ausschalten: Server stoppt, Datei an=False, der Schlüssel ist VERGESSEN, der Text sagt «ungültig»", ok_ and not w.s.laeuft() and not F.lesen(w.daten)["an"] and F.lesen(w.daten)["schluessel"] == "" and "ungültig" in text_)
    u_aus = w.s.ui(ips=["192.168.1.23"])
    pruefe("Ausschalten: die Karte zeigt dann KEINE Adresse und keinen Schlüssel", not u_aus["an"] and not u_aus["laeuft"] and u_aus["adressen"] == [] and KEY not in alles_text(u_aus), u_aus)
    try:
        anfrage(P, "GET", "/", cookie=COOKIE)
        pruefe("Ausschalten: der Port ist zu", False)
    except ConnectionRefusedError:      # nicht irgendein OSError: ein offener, aber nicht bedienter Port würde bis zur Zeitüberschreitung hängen
        pruefe("Ausschalten: der Port ist zu (Verbindung verweigert)", True)
    except OSError as ex:
        pruefe("Ausschalten: der Port ist zu (Verbindung verweigert)", False, type(ex).__name__)
    ok_, text_ = w.s.schalten(True)
    neu_key = F.lesen(w.daten)["schluessel"]
    pruefe("Wieder einschalten: NEUER Schlüssel, Server läuft", ok_ and w.s.laeuft() and neu_key not in ("", KEY) and len(neu_key) == 32)
    P = w.s.port
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Wieder eingeschaltet: das Cookie von VORHER gilt nicht mehr (ein verlorenes Handy bleibt ausgesperrt)", st == 401)
    st, _, _ = anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Wieder eingeschaltet: der alte Link gilt nicht mehr", st == 401)
    alter_key2 = KEY
    KEY, COOKIE = neu_key, F.cookie_wert(neu_key)
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Wieder eingeschaltet: das Cookie zum neuen Schlüssel geht", st == 200)

    # 8l) Protokoll, Meldung
    ui = w.s.ui(ips=["192.168.1.23", "100.64.0.5"])
    pruefe("Karte: an, läuft, Port, zwei Adressen mit Schlüssel", ui["an"] and ui["laeuft"] and ui["port"] == P and len(ui["adressen"]) == 2 and all(KEY in a["url"] for a in ui["adressen"]))
    arten = [e["art"] for e in ui["ereignisse"]]
    pruefe("Karte: Ereignisse neueste zuerst, höchstens 10", len(ui["ereignisse"]) <= 10 and all({"zeit", "art", "quelle", "info"} <= set(e) for e in ui["ereignisse"]))
    pruefe("Karte: jedes Ereignis nennt die Quelle (Adresse des Geräts) und eine Zeit", all(e["quelle"] == "127.0.0.1" and e["zeit"].startswith("20") for e in ui["ereignisse"]), ui["ereignisse"][:2])
    alle = []
    with w.s._lock:
        alle = list(w.s._ereignisse)
    pruefe("Protokoll: bekannte Arten vorhanden (angemeldet, falscher-schluessel, gesperrt, methode, falscher-host, fremde-quelle)",
           {"angemeldet", "falscher-schluessel", "gesperrt", "methode", "falscher-host", "fremde-quelle"} <= {e["art"] for e in alle}, {e["art"] for e in alle})
    pruefe("Protokoll: der Schlüssel steht in KEINEM Ereignis (auch kein alter, kein falscher)", all(k_ not in alles_text(alle) for k_ in (KEY, alter_key, alter_key2, "falsch0", "nochmals0")))
    pruefe("Karte: Ereignisse und Geräte tragen keinen Schlüssel", KEY not in alles_text(ui["ereignisse"]) and KEY not in alles_text(ui["geraete"]))
    stt = w.s.status()
    pruefe("status() (für Telegram): KEIN Schlüssel, keine Adressen, keine Links; aber an, läuft, Port, Ereignisse, Geräte", KEY not in alles_text(stt) and "adressen" not in stt and "http" not in alles_text(stt) and stt["an"] is True
           and stt["laeuft"] is True and stt["port"] == P and {"geraete", "ereignisse", "fehler", "gesperrt_durch_umgebung"} <= set(stt), stt)
    pruefe("ui() ist status() plus Adressen und Erzeugungszeit (nichts sonst)", set(ui) == set(stt) | {"adressen", "erzeugt"}, set(ui) ^ set(stt))
    pruefe("Geräte: die Quelle 127.0.0.1 ist als zuletzt gesehen vermerkt", any(g["quelle"] == "127.0.0.1" for g in ui["geraete"]))
    pruefe("Meldung: genau EINE (erste Anmeldung der Quelle), ohne Schlüssel", len(w.meldungen) == 1 and "127.0.0.1" in w.meldungen[0] and KEY not in w.meldungen[0] and alter_key not in w.meldungen[0], w.meldungen)
    anfrage(P, "GET", f"/?k={KEY}")
    pruefe("Meldung: eine zweite Anmeldung derselben Quelle meldet nichts mehr", len(w.meldungen) == 1)

    # 8m) Fehler in der Berechnung, Zwischenspeicher
    w.stand_fehler = True
    st, kopf, body = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Berechnung wirft: 500 mit dem Typ, ohne Text und ohne Pfade", st == 500 and json.loads(body) == {"fehler": "RuntimeError"} and b"Geheimtext" not in body)
    w.stand_fehler = False
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("…der Server lebt weiter", st == 200)

    # 8n) Müll und Gleichzeitigkeit
    s_ = socket.create_connection(("127.0.0.1", P), timeout=5)
    s_.sendall(b"GARBAGE\r\n\r\n")
    try:
        s_.recv(4096)
    except OSError:
        pass
    s_.close()
    st, kopf, body = anfrage(P, "GET", "/", kopf={"X-Big": "a" * 70000}, cookie=COOKIE)
    pruefe("Riesiger Kopf: 431/400, kein Absturz", st in (400, 431), st)
    s_ = socket.create_connection(("127.0.0.1", P), timeout=5)
    s_.sendall(b"GET /" + b"a" * 70000 + b" HTTP/1.1\r\n\r\n")
    try:
        s_.recv(4096)
    except OSError:
        pass
    s_.close()
    st, _, _ = anfrage(P, "GET", "/api/stand", cookie=COOKIE)
    pruefe("Nach Müll und Überlänge antwortet der Server noch", st == 200)
    ergebnisse = []

    def lauf():
        ergebnisse.append(anfrage(P, "GET", "/api/stand", cookie=COOKIE)[0])
    faeden = [threading.Thread(target=lauf) for _ in range(24)]
    for f_ in faeden:
        f_.start()
    for f_ in faeden:
        f_.join(20)
    pruefe("24 gleichzeitige Anfragen: alle 200", ergebnisse == [200] * 24, ergebnisse)
    w.stopp()

    # 8n2) Höchstens 32 gleichzeitige Verbindungen
    w5 = Welt()
    P5, C5 = w5.port, w5.cookie
    basis_faeden = threading.active_count()
    stille = []
    for _ in range(100):
        try:
            stille.append(socket.create_connection(("127.0.0.1", P5), timeout=5))
        except OSError:
            break
    time.sleep(0.7)
    mehr = threading.active_count() - basis_faeden
    pruefe("Flut: 100 stille Verbindungen bringen höchstens 32 zusätzliche Fäden (der Cockpit-Prozess wächst nicht ohne Ende)", mehr <= F._Server.MAX_GLEICHZEITIG + 1, mehr)
    pruefe("Flut: die Grenze ist 32", F._Server.MAX_GLEICHZEITIG == 32)
    for s_ in stille:
        s_.close()
    time.sleep(0.5)
    st, _, _ = anfrage(P5, "GET", "/api/stand", cookie=C5)
    pruefe("Flut vorbei: der Server antwortet wieder (alle Plätze sind frei)", st == 200)
    for _ in range(3):
        stille = [socket.create_connection(("127.0.0.1", P5), timeout=5) for _ in range(40)]
        time.sleep(0.3)
        for s_ in stille:
            s_.close()
        time.sleep(0.4)
    st, _, _ = anfrage(P5, "GET", "/api/stand", cookie=C5)
    pruefe("Dreimal Flut und wieder frei: kein Platz ist verloren gegangen (jeder Platz wird zurückgegeben)", st == 200)
    pruefe("Plätze: nach allem sind wieder alle 32 frei", w5.s._srv._platz._value == F._Server.MAX_GLEICHZEITIG, w5.s._srv._platz._value)
    _alt_start = threading.Thread.start
    _versuche = []

    def _start_kaputt(self_):
        if getattr(self_, "_target", None) is not None and getattr(self_._target, "__name__", "") == "process_request_thread":
            _versuche.append(1)
            raise RuntimeError("can't start new thread")
        return _alt_start(self_)
    threading.Thread.start = _start_kaputt
    try:
        k_ = socket.create_connection(("127.0.0.1", P5), timeout=5)
        time.sleep(0.5)
        k_.close()
    finally:
        threading.Thread.start = _alt_start
    pruefe("Plätze: lässt sich ein Faden nicht starten, wird der Platz sofort zurückgegeben (kein stilles Auslaufen)", _versuche and w5.s._srv._platz._value == F._Server.MAX_GLEICHZEITIG, (_versuche, w5.s._srv._platz._value))
    st, _, _ = anfrage(P5, "GET", "/api/stand", cookie=C5)
    pruefe("Nach dem Fehlstart antwortet der Server weiter", st == 200)
    w5.stopp()

    # 8o) Port belegt
    belegt = socket.socket()
    belegt.bind(("127.0.0.1", 0))
    belegt.listen(1)
    w2 = Welt(an=True)
    w2.s.stoppen()
    w2.s._port = belegt.getsockname()[1]
    pruefe("Port belegt: starten schlägt mit lesbarer Meldung fehl, ohne Ausnahme", w2.s.starten() is False and "nicht frei" in w2.s.fehler and "Cockpit" in w2.s.fehler, w2.s.fehler)
    ok_, text_ = w2.s.schalten(True)
    pruefe("Port belegt: schalten meldet es", not ok_ and "ließ sich nicht starten" in text_)
    belegt.close()
    w2.stopp()

    # 8p) Zwischenspeicher
    w3 = Welt(ttl=5.0)
    P3, C3 = w3.port, w3.cookie
    for _ in range(3):
        anfrage(P3, "GET", "/api/stand", cookie=C3)
    pruefe("Zwischenspeicher: drei Aufrufe innerhalb von 5 s rechnen einmal", w3.aufrufe["stand"] == 1, w3.aufrufe)
    w3.zeit[0] += 6
    anfrage(P3, "GET", "/api/stand", cookie=C3)
    pruefe("Zwischenspeicher: nach Ablauf wird neu gerechnet", w3.aufrufe["stand"] == 2)
    w3.zeit[0] -= 100                                   # Uhr springt zurück: nie ein «uralter» Wert für immer
    anfrage(P3, "GET", "/api/stand", cookie=C3)
    pruefe("Zwischenspeicher: springt die Uhr zurück, wird neu gerechnet", w3.aufrufe["stand"] == 3)
    w3.stopp()

    # 8q) Meldung schlägt fehl → Ansicht läuft weiter
    w4 = Welt()

    def kaputte_meldung(text):
        raise RuntimeError("Telegram weg")
    w4.s.meldung = kaputte_meldung
    st, _, _ = anfrage(w4.port, "GET", f"/?k={w4.key}")
    pruefe("Meldung wirft: Anmeldung klappt trotzdem", st == 303)
    st, _, _ = anfrage(w4.port, "GET", "/api/stand", cookie=w4.cookie)
    pruefe("Meldung wirft: Ansicht läuft weiter", st == 200)
    w4.stopp()

pruefe("Nichts auf Konsole oder Fehlerausgabe gedruckt (kein Zugriffsprotokoll, kein Traceback)", mit_ausgabe[0].getvalue() == "" and mit_ausgabe[1].getvalue() == "", (mit_ausgabe[0].getvalue()[:200], mit_ausgabe[1].getvalue()[:200]))

# ───────────────────────── 9) Sicherheits-Invarianten im Quelltext ─────────────────────────
quelle = (HIER / "fernsicht.py").read_text(encoding="utf-8")
baum = ast.parse(quelle)
importiert = set()
for n in ast.walk(baum):
    if isinstance(n, ast.Import):
        importiert |= {a.name for a in n.names}
    elif isinstance(n, ast.ImportFrom):
        importiert.add(n.module or "")
ERLAUBTE_IMPORTE = {"__future__", "hashlib", "hmac", "ipaddress", "json", "os", "re", "secrets", "socket", "sys", "threading", "time", "urllib.parse", "collections", "datetime", "http.server", "pathlib"}
pruefe("Invariante: nur Standardbibliothek-Module, kein Netz nach aussen, keine Prozesse", importiert <= ERLAUBTE_IMPORTE, importiert - ERLAUBTE_IMPORTE)
pruefe("Invariante: kennt weder Cockpit noch Pilot, Broker, Sperre, Binance, Telegram", not re.search(r"^\s*(?:import|from)\s+(?:cockpit|pilot|broker|sperre|signale|satellit|binance|telegram|urllib\.request|http\.client|subprocess|ssl)", quelle, re.M))
pruefe("Invariante: kein exec/eval/os.system/subprocess/__import__ im Quelltext", not re.search(r"\b(?:exec|eval|__import__)\s*\(|os\.system|subprocess|os\.popen", quelle))
klasse = next(n for n in baum.body if isinstance(n, ast.ClassDef) and n.name == "_Handler")
do_namen = set()
for n in klasse.body:
    if isinstance(n, ast.FunctionDef) and n.name.startswith("do_"):
        do_namen.add(n.name)
    if isinstance(n, ast.Assign):
        for t in n.targets:
            if isinstance(t, ast.Name) and t.id.startswith("do_"):
                do_namen.add(t.id)
pruefe("Invariante: der Handler kennt nur GET, HEAD und die fünf Verbote", do_namen == {"do_GET", "do_HEAD", "do_POST", "do_PUT", "do_DELETE", "do_PATCH", "do_OPTIONS"}, do_namen)
zuweisung = next(n for n in klasse.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "do_POST" for t in n.targets))
pruefe("Invariante: POST/PUT/DELETE/PATCH/OPTIONS sind genau `_nein`", sorted(t.id for t in zuweisung.targets) == ["do_DELETE", "do_OPTIONS", "do_PATCH", "do_POST", "do_PUT"] and isinstance(zuweisung.value, ast.Name) and zuweisung.value.id == "_nein")
nein = next(n for n in klasse.body if isinstance(n, ast.FunctionDef) and n.name == "_nein")
pruefe("Invariante: `_nein` ruft nichts ausser Protokoll und Antwort", {c.func.attr for c in ast.walk(nein) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)} <= {"ereignis", "_senden"})
pruefe("Invariante: die festen Adressen sind genau vier Seiten/Daten", set(re.findall(r'pfad (?:in \(|== )"([^"]+)"', quelle)) | set(re.findall(r'"(/[a-z/.]*)"', quelle[quelle.index("def _bearbeiten"):quelle.index("def _antwort")])) >= {"/", "/api/stand", "/api/profit"})
pruefe("Invariante: die Plätze (Semaphore) werden beim Beenden des Fadens zurückgegeben und beim Fehlstart auch", quelle.count("self._platz.release()") == 2 and "BoundedSemaphore" in quelle)
pruefe("Invariante: Dateien werden nur in `schreiben` geschrieben", quelle.count(".write_text(") == 1 and "open(" not in quelle and ".write(" in quelle and quelle.count(".write(") == 1)
pruefe("Invariante: kein Schlüssel in print/Protokoll (kein print im Modul ausser der Hilfe)", len(re.findall(r"\bprint\(", quelle)) == 1)
pruefe("Invariante: der Schlüssel kommt von `secrets`, nicht von `random`", "secrets.token_urlsafe" in quelle and "import random" not in quelle)

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
