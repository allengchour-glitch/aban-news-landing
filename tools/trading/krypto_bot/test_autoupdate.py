#!/usr/bin/env python3
"""Tests für das Selbst-Update (autoupdate.py) und die Pflege (pflege.py) — ohne Internet, ohne Schlüssel, nur in Wegwerf-Ordnern:
python3 tools/trading/krypto_bot/test_autoupdate.py"""
from __future__ import annotations

import hashlib
import io
import json
import os
import sys
import tempfile
import threading
import zipfile
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
import autoupdate as AU  # noqa: E402
import pflege as PF  # noqa: E402
import paket_bauen as PB  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def wirft(fn, *args):
    try:
        fn(*args)
    except ValueError as ex:
        return str(ex)
    return None


J0 = datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)
ISO0 = "2026-11-03T12:00:00Z"
BAT = b"@echo off\r\nrem test\r\n"
BASISDATEIEN = {
    "tools/trading/krypto_bot/autoupdate.py": b"# autoupdate\n",
    "tools/trading/krypto_bot/pflege.py": b"# pflege\n",
    "tools/trading/krypto_bot/cockpit.py": b"# cockpit v1\n",
    "tools/trading/krypto_bot/pilot.py": b"# pilot\n",
    "tools/trading/krypto_bot/sperre.py": b"# sperre\n",
    "tools/trading/krypto_bot/krypto-auto.bat": BAT,
    "tools/trading/krypto_bot/cockpit.bat": BAT,
    "tools/trading/krypto_bot/alt.py": b"# wird in v2 entfernt\n",
    "tools/trading/krypto_bot/README.md": b"# readme\n",
}


def paket(aenderungen=None, gebaut="2026-11-03T10:00:00Z", commit="abcdef1234567", datum=None):
    d = dict(BASISDATEIEN)
    for k, v in (aenderungen or {}).items():
        if v is None:
            d.pop(k, None)
        else:
            d[k] = v
    daten, m = PB.zip_bauen(d, commit, gebaut, "Testhinweis", datum=datum)
    return daten, {k: m[k] for k in ("format", "version", "commit", "gebaut", "datei", "sha256", "groesse", "hinweis")}


def installiere(wurzel, aenderungen=None, gebaut="2026-11-03T10:00:00Z", commit="abcdef1234567"):
    daten, m = paket(aenderungen, gebaut, commit)
    for rel, inhalt in AU.zip_lesen(daten, AU.manifest_pruefen(m)).items():
        AU._bytes_atomar(Path(wurzel) / rel, inhalt)
    return m


def baum(wurzel, ohne=("data/krypto-update.json", "data/krypto-update-backup", "data/krypto-update-tmp")):
    """{Pfad: Prüfsumme} aller Dateien (ohne die Update-Eigendateien) — zum Vergleichen «ist alles wie vorher?»."""
    out = {}
    for p in sorted(Path(wurzel).rglob("*")):
        rel = p.relative_to(wurzel).as_posix()
        if p.is_file() and not any(rel == o or rel.startswith(o + "/") for o in ohne):
            out[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


class Netz:
    """Ersatz für das Internet: Antwort je Adresse, Protokoll der Abrufe."""
    def __init__(self):
        self.antworten, self.aufrufe = {}, []

    def __call__(self, url, timeout=20, max_bytes=0):
        self.aufrufe.append(url)
        return self.antworten.get(url, (404, b""))

    def setze(self, daten, m, stopp=(404, b"")):
        self.antworten[AU.MANIFEST_URL] = (200, json.dumps(m).encode("utf-8"))
        self.antworten[f"{AU.BASIS}/{m['datei']}"] = (200, daten)
        self.antworten[AU.STOPP_URL] = stopp
        return self

    def zips(self):
        return [u for u in self.aufrufe if u.endswith(".zip")]


@contextmanager
def keine_sperre():
    yield


@contextmanager
def besetzte_sperre():
    raise AU.Besetzt("ein Lauf handelt gerade")
    yield  # pragma: no cover


def schlecht(wurzel, neu, loeschen):
    return False, "test_pilot.py ist durchgefallen: kaputt"


def lauf(wurzel, netz, **kw):
    kw.setdefault("env", {})
    kw.setdefault("jetzt", J0)
    kw.setdefault("pruefer", lambda w, neu, loe: (True, "Syntax und 10 Selbsttests bestanden"))
    kw.setdefault("sperre", keine_sperre)
    return AU.einspielen(wurzel=wurzel, holen=netz, **kw)


# ───────────────────────── Umgebung und Sperren ─────────────────────────
import cockpit as C  # noqa: E402

basis_env = {"PATH": "x", "BINANCE_FUTURES_TESTNET": "true", "KI_BOT_STOP": "1", "UNRELATED": "u"}
reg = {"BINANCE_FUTURES_API_KEY": "k", "KRYPTO_RISIKO": "", "unrelated": "z", "Telegram_Chat_ID": "123"}
pruefe("umgebung: identisch mit cockpit.umgebung (Kopie bleibt gleich)",
       AU.umgebung(dict(basis_env), lambda: dict(reg)) == C.umgebung(dict(basis_env), lambda: dict(reg)))
pruefe("umgebung: setx NAME \"\" entfernt den Wert", "KRYPTO_RISIKO" not in AU.umgebung({"KRYPTO_RISIKO": "2"}, lambda: {"KRYPTO_RISIKO": ""}))
pruefe("umgebung: unlesbare Registry ergibt die Prozess-Umgebung", AU.umgebung({"A": "1"}, lambda: (_ for _ in ()).throw(OSError())) == {"A": "1"})
pruefe("echtgeld_grund: Standard und «true» = Spielgeld", AU.echtgeld_grund({}) == "" and AU.echtgeld_grund({"BINANCE_FUTURES_TESTNET": "true", "BINANCE_TESTNET": "TRUE"}) == "")
pruefe("echtgeld_grund: Futures nicht im Testnetz", "Futures" in AU.echtgeld_grund({"BINANCE_FUTURES_TESTNET": "false"}))
pruefe("echtgeld_grund: Spot nicht im Testnetz (0, nein, Gross/Klein)", all("Spot" in AU.echtgeld_grund({"BINANCE_TESTNET": v}) for v in ("0", "Nein", "FALSE", " off ")))
pruefe("echtgeld_grund: Echtgeld-Freigabe gesetzt", "KI_BOT_ECHTGELD" in AU.echtgeld_grund({"KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD"}))
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    pruefe("auto_aus_grund: sauber = leer", AU.auto_aus_grund({}, td) == "")
    pruefe("auto_aus_grund: Schalter KRYPTO_AUTOUPDATE=aus", "KRYPTO_AUTOUPDATE" in AU.auto_aus_grund({"KRYPTO_AUTOUPDATE": "aus"}, td))
    pruefe("auto_aus_grund: Schalter 0/nein/off", all(AU.auto_aus_grund({"KRYPTO_AUTOUPDATE": v}, td) for v in ("0", "nein", "OFF")))
    pruefe("auto_aus_grund: «an» schaltet nicht aus", AU.auto_aus_grund({"KRYPTO_AUTOUPDATE": "an"}, td) == "")
    (td / "data").mkdir()
    (td / "data" / AU.AUS_DATEI).write_text("x")
    pruefe("auto_aus_grund: Datei data/krypto-update-aus.txt", AU.AUS_DATEI in AU.auto_aus_grund({}, td))
    (td / "data" / AU.AUS_DATEI).unlink()
    pruefe("auto_aus_grund: Echtgeld nennt den Weg «von Hand»", "von Hand" in AU.auto_aus_grund({"BINANCE_FUTURES_TESTNET": "false"}, td))

# ───────────────────────── Paketbeschreibung ─────────────────────────
_daten, _m = paket()
pruefe("manifest_pruefen: gültig", AU.manifest_pruefen(dict(_m))["version"] == _m["version"])
for _k, _v in (("format", 2), ("version", ""), ("version", "a b"), ("commit", "XYZ"), ("gebaut", "gestern"), ("datei", "../x.zip"), ("datei", "a/b.zip"),
               ("datei", "x.exe"), ("sha256", "abc"), ("sha256", "G" * 64), ("groesse", 0), ("groesse", AU.MAX_ZIP + 1), ("groesse", True), ("groesse", "5")):
    _x = dict(_m)
    _x[_k] = _v
    pruefe(f"manifest_pruefen: {_k}={_v!r} wird abgelehnt", wirft(AU.manifest_pruefen, _x) is not None)
pruefe("manifest_pruefen: kein Objekt", wirft(AU.manifest_pruefen, []) is not None and wirft(AU.manifest_pruefen, None) is not None)
_x = dict(_m)
_x.pop("sha256")
pruefe("manifest_pruefen: fehlendes Feld", wirft(AU.manifest_pruefen, _x) is not None)
pruefe("manifest_pruefen: Hinweis wird bereinigt und gekürzt", AU.manifest_pruefen({**_m, "hinweis": "a\n\nb  " + "x" * 500})["hinweis"].startswith("a b x") and len(AU.manifest_pruefen({**_m, "hinweis": "x" * 500})["hinweis"]) == 200)
pruefe("manifest_pruefen: fremde Felder fallen weg", "boese" not in AU.manifest_pruefen({**_m, "boese": 1}))

# ───────────────────────── Paket prüfen ─────────────────────────
_M = AU.manifest_pruefen(dict(_m))
_neu = AU.zip_lesen(_daten, _M)
pruefe("zip_lesen: gültiges Paket", AU.VERSION_REL in _neu and AU.LISTE_REL in _neu and _neu["tools/trading/krypto_bot/cockpit.py"] == b"# cockpit v1\n")
pruefe("zip_lesen: .bat bleibt byte-genau (CRLF)", _neu["tools/trading/krypto_bot/krypto-auto.bat"] == BAT)
pruefe("zip_lesen: falsche Grösse", "Grösse" in (wirft(AU.zip_lesen, _daten + b"x", _M) or ""))
pruefe("zip_lesen: falsche Prüfsumme", "Prüfsumme" in (wirft(AU.zip_lesen, _daten[:-1] + bytes([_daten[-1] ^ 1]), _M) or ""))


def roh_zip(eintraege, laenge_ok=True):
    """Ein beliebiges ZIP (auch ein bösartiges) mit passender Beschreibung. eintraege: [(Name, Inhalt, external_attr)]."""
    puffer = io.BytesIO()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as z:
        for name, inhalt, *rest in eintraege:
            zi = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            zi.external_attr = (rest[0] if rest else 0o644 << 16)
            z.writestr(zi, inhalt)
    d = puffer.getvalue()
    return d, {**_M, "sha256": hashlib.sha256(d).hexdigest(), "groesse": len(d)}


_gut = [(k, v) for k, v in _neu.items()]


def boese_zip(extra):
    """Ein gültiges Paket plus Zusatz-Einträge, bei denen Dateiliste und VERSION.json STIMMEN: nur die gezielte Prüfung kann sie noch ablehnen.
    extra: [(Name, Inhalt[, external_attr])]"""
    dateien = {k: v for k, v in _neu.items() if k not in (AU.VERSION_REL, AU.LISTE_REL)}
    for name, inhalt, *_rest in extra:
        dateien[name] = inhalt
    liste = {"format": 1, "version": _M["version"], "dateien": {k: hashlib.sha256(v).hexdigest() for k, v in dateien.items()}}
    eintraege = [(k, v) for k, v in dateien.items() if k not in {e[0] for e in extra}] + list(extra)
    eintraege += [(AU.VERSION_REL, _neu[AU.VERSION_REL]), (AU.LISTE_REL, json.dumps(liste).encode("utf-8"))]
    return roh_zip(eintraege)


# Kontrolle: das Gerüst selbst erzeugt ein GÜLTIGES Paket (sonst bewiese «abgelehnt» nichts)
_d0, _m0 = boese_zip([("tools/trading/krypto_bot/harmlos.py", b"x = 1\n")])
pruefe("Testgerüst: ein sonst gültiges Paket mit einer harmlosen Zusatzdatei wird angenommen", wirft(AU.zip_lesen, _d0, _m0) is None, wirft(AU.zip_lesen, _d0, _m0))
for _name, _eintrag in (("Zip-Slip «..»", ("tools/trading/../evil.py", b"x")), ("absoluter Pfad", ("/etc/evil.py", b"x")),
                        ("Backslash im Namen", ("tools/trading/a\\b.py", b"x")), ("Doppelpunkt (Laufwerk/Datenstrom)", ("tools/trading/a:b.py", b"x")),
                        ("Pfad beginnt mit Laufwerk", ("C:/evil.py", b"x")), ("Backslash-Pfad", ("tools\\trading\\x.py", b"x")),
                        ("ausserhalb von tools/trading", ("data/krypto-pilot.json", b"{}")), ("ausserhalb: tools/anderes", ("tools/anderes/x.py", b"x")),
                        ("Programmdatei .exe", ("tools/trading/x.exe", b"MZ")), ("Skript .ps1", ("tools/trading/x.ps1", b"x")),
                        ("Not-Aus-Datei STOP", ("tools/trading/ki_bot/STOP", b"x")), ("Not-Aus-Datei PAUSE", ("tools/trading/ki_bot/PAUSE", b"x")),
                        ("Kurs-Zwischenspeicher daten/", ("tools/trading/daten/x.json", b"{}")), ("Steuerzeichen im Namen", ("tools/trading/a\nb.py", b"x")),
                        ("leerer Teil «//»", ("tools/trading//x.py", b"x")), ("Verknüpfung (Inhalt wäre gültiges Python: nur die Prüfung auf Verknüpfungen kann ablehnen)", ("tools/trading/link.py", b"passwd\n", 0o120777 << 16)),
                        ("Gross/Klein-Doppelung", ("tools/trading/krypto_bot/COCKPIT.PY", b"x"))):
    _d, _mm = boese_zip([_eintrag])
    pruefe(f"zip_lesen lehnt ab (nur diese Prüfung kann es): {_name}", wirft(AU.zip_lesen, _d, _mm) is not None)
_ohne_pilot = {k: v for k, v in BASISDATEIEN.items() if not k.endswith("/pilot.py")}
try:
    PB.zip_bauen(_ohne_pilot, "abcdef1234567", "2026-11-03T10:00:00Z")
    _pflicht = False
except ValueError as ex:
    _pflicht = "Pflichtdateien" in str(ex) and "pilot.py" in str(ex)
pruefe("Pflichtdatei fehlt: schon der Bau lehnt das Paket ab (derselbe Test wie auf dem PC)", _pflicht)
_d, _mm = roh_zip([(k, v) for k, v in _gut if k != AU.LISTE_REL])
pruefe("zip_lesen: Dateiliste fehlt", wirft(AU.zip_lesen, _d, _mm) is not None)
_d, _mm = roh_zip(_gut + [("tools/trading/krypto_bot/extra.py", b"x = 1\n")])
pruefe("zip_lesen: Datei, die nicht in der Liste steht", "Dateiliste" in (wirft(AU.zip_lesen, _d, _mm) or ""))
_d, _mm = roh_zip([(k, (b"# manipuliert\n" if k.endswith("pilot.py") else v)) for k, v in _gut])
pruefe("zip_lesen: Inhalt passt nicht zur Prüfsumme in der Liste", "Prüfsumme der Datei" in (wirft(AU.zip_lesen, _d, _mm) or ""))
_d, _mm = roh_zip([(k, (json.dumps({"version": "x", "commit": "abcdef1234567", "gebaut": "2026-11-03T10:00:00Z"}).encode() if k == AU.VERSION_REL else v)) for k, v in _gut])
pruefe("zip_lesen: VERSION.json passt nicht zur Beschreibung", "VERSION.json" in (wirft(AU.zip_lesen, _d, _mm) or ""))
_x = dict(BASISDATEIEN)
_x["tools/trading/krypto_bot/kaputt.py"] = b"def (:\n"
try:
    PB.zip_bauen(_x, "abcdef1234567", "2026-11-03T10:00:00Z")
    _bau_abgelehnt = False
except ValueError as ex:
    _bau_abgelehnt = "Syntaxfehler" in str(ex)
pruefe("Syntaxfehler in einer .py-Datei: schon der Bau lehnt das Paket ab (und zip_lesen ebenso)", _bau_abgelehnt)
_save = AU.MAX_DATEI
AU.MAX_DATEI = 5
pruefe("zip_lesen: zu grosse Einzeldatei", "zu gross" in (wirft(AU.zip_lesen, _daten, _M) or ""))
AU.MAX_DATEI = _save
_save = AU.MAX_DATEIEN
AU.MAX_DATEIEN = 3
pruefe("zip_lesen: zu viele Dateien", "Dateizahl" in (wirft(AU.zip_lesen, _daten, _M) or ""))
AU.MAX_DATEIEN = _save
pruefe("zip_lesen: kein ZIP", "ZIP" in (wirft(AU.zip_lesen, b"kein zip", {**_M, "sha256": hashlib.sha256(b"kein zip").hexdigest(), "groesse": 8}) or ""))

# ───────────────────────── Plan ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    (td / "tools/trading/krypto_bot/meine_notiz.txt").write_text("nur bei mir")
    (td / "tools/trading/ki_bot").mkdir(parents=True, exist_ok=True)
    (td / "tools/trading/ki_bot/STOP").write_text("stop")
    d2, m2 = paket({"tools/trading/krypto_bot/cockpit.py": b"# cockpit v2\n", "tools/trading/krypto_bot/alt.py": None, "tools/trading/krypto_bot/neu.py": b"# neu\n"},
                   gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    n2 = AU.zip_lesen(d2, AU.manifest_pruefen(m2))
    schr, loe = AU.plan_erstellen(td, n2, AU.alte_liste(td))
    pruefe("plan: geändert und neu werden geschrieben", "tools/trading/krypto_bot/cockpit.py" in schr and "tools/trading/krypto_bot/neu.py" in schr, schr)
    pruefe("plan: Unveränderte werden übersprungen", "tools/trading/krypto_bot/pilot.py" not in schr and "tools/trading/krypto_bot/krypto-auto.bat" not in schr, schr)
    pruefe("plan: gelöscht wird nur, was die alte Paketversion mitbrachte", loe == ["tools/trading/krypto_bot/alt.py"], loe)
    pruefe("plan: eigene Dateien und Not-Aus-Dateien bleiben stehen", "tools/trading/krypto_bot/meine_notiz.txt" not in loe and "tools/trading/ki_bot/STOP" not in loe)
    pruefe("alte_liste: ohne PAKET-DATEIEN.json leer (dann wird nie gelöscht)", AU.alte_liste(td / "nirgends") == {})
    (td / AU.LISTE_REL).write_text(json.dumps({"dateien": {"tools/trading/ki_bot/STOP": "x", "tools/trading/../../etc/x": "y", "tools/trading/ok.py": "z", "daten": 5}}))
    pruefe("alte_liste: Schutzdateien und böse Pfade werden aussortiert", AU.alte_liste(td) == {"tools/trading/ok.py": "z"}, AU.alte_liste(td))

# ───────────────────────── Das Update: Erfolgsfall ─────────────────────────
V2 = {"tools/trading/krypto_bot/cockpit.py": b"# cockpit v2\n", "tools/trading/krypto_bot/alt.py": None, "tools/trading/krypto_bot/neu.py": b"# neu\n",
      "tools/trading/krypto_bot/krypto-auto.bat": b"@echo off\r\nrem v2\r\n"}
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    (td / "data").mkdir(exist_ok=True)
    (td / "data/krypto-pilot.json").write_text('{"entscheide": [1, 2, 3]}')
    (td / "data/krypto-pilot2-bestand.json").write_text('{"BTC": 0.5}')
    (td / "tools/trading/krypto_bot/meine_notiz.txt").write_text("nur bei mir")
    (td / "tools/trading/ki_bot").mkdir(parents=True, exist_ok=True)
    (td / "tools/trading/ki_bot/STOP").write_text("stop")
    (td / "tools/trading/ki_bot/PAUSE").write_text("pause")
    (td / "tools/trading/daten").mkdir(parents=True, exist_ok=True)
    (td / "tools/trading/daten/BTC.json").write_text("[1]")
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    meldungen = []
    r = lauf(td, netz, fortschritt=meldungen.append)
    nachher = baum(td)
    pruefe("Update: eingespielt, ok", r["ok"] and r["ergebnis"] == "eingespielt" and r["nach"] == m2["version"], r)
    pruefe("Update: Programmdateien sind die der neuen Version", (td / "tools/trading/krypto_bot/cockpit.py").read_bytes() == b"# cockpit v2\n"
           and (td / "tools/trading/krypto_bot/neu.py").exists() and (td / "tools/trading/krypto_bot/krypto-auto.bat").read_bytes() == b"@echo off\r\nrem v2\r\n")
    pruefe("Update: die entfernte Datei der alten Version ist weg", not (td / "tools/trading/krypto_bot/alt.py").exists())
    pruefe("Update: VERSION.json zeigt die neue Version", AU.lokale_version(td)["version"] == m2["version"])
    pruefe("Update: Logbücher und Pilot-2.0-Buch unter data/ bleiben byte-genau", all(nachher[k] == vorher[k] for k in vorher if k.startswith("data/")))
    pruefe("Update: eigene Datei, Not-Aus-Dateien und Kurs-Zwischenspeicher bleiben",
           all(nachher[k] == vorher[k] for k in ("tools/trading/krypto_bot/meine_notiz.txt", "tools/trading/ki_bot/STOP", "tools/trading/ki_bot/PAUSE", "tools/trading/daten/BTC.json")))
    pruefe("Update: sonst ändert sich nichts ausser dem Erwarteten",
           {k for k in vorher if nachher.get(k) != vorher[k]} - {AU.VERSION_REL, AU.LISTE_REL} ==
           {"tools/trading/krypto_bot/cockpit.py", "tools/trading/krypto_bot/alt.py", "tools/trading/krypto_bot/krypto-auto.bat"})
    pruefe("Update: keine Temp-Dateien übrig", not [p for p in td.rglob("*") if ".upd" in p.name or p.name.endswith(".tmp")])
    sich = sorted((td / "data" / AU.SICHERUNG).iterdir())
    pruefe("Update: Sicherung mit den alten Dateien liegt da, ohne Marke «LAEUFT»",
           len(sich) == 1 and (sich[0] / "dateien/tools/trading/krypto_bot/cockpit.py").read_bytes() == b"# cockpit v1\n" and not (sich[0] / "LAEUFT").exists()
           and (sich[0] / "dateien/tools/trading/krypto_bot/alt.py").exists())
    st = AU.status_lesen(td)
    pruefe("Update: Status geschrieben (Version, Verlauf, geprüft)", st["ergebnis"] == "eingespielt" and st["version"] == m2["version"] and st["geprueft"] == ISO0 and st["verlauf"][-1]["nach"] == m2["version"], st)
    pruefe("Update: Fortschrittsmeldungen für den Bildschirm", len(meldungen) == 3 and "Probelauf" in meldungen[1] and "tausche" in meldungen[2], meldungen)
    pruefe("Update: Text nennt Hinweis aus der Beschreibung und die Zahlen", "Neu: Testhinweis" in r["text"] and "ersetzt" in r["text"] and "entfernt" in r["text"], r["text"])
    # gleich nochmals (Tagesgrenze) und mit erzwingen (nichts Neues)
    netz.aufrufe.clear()
    r = lauf(td, netz, jetzt=J0 + timedelta(hours=2))
    pruefe("Tagesgrenze: innerhalb von 20 Stunden gar nicht erst nachfragen", r["ergebnis"] == "uebersprungen" and netz.aufrufe == [], netz.aufrufe)
    r = lauf(td, netz, jetzt=J0 + timedelta(hours=2), erzwingen=True)
    pruefe("erzwingen: fragt nach, sieht «aktuell», lädt das Paket NICHT", r["ergebnis"] == "aktuell" and netz.zips() == [], (r, netz.aufrufe))
    netz.aufrufe.clear()
    r = lauf(td, netz, jetzt=J0 + timedelta(hours=21))
    pruefe("Tagesgrenze: 19 Stunden nach der letzten Prüfung (diese war bei +2 h) wird noch nicht nachgefragt", r["ergebnis"] == "uebersprungen" and netz.aufrufe == [])
    r = lauf(td, netz, jetzt=J0 + timedelta(hours=23))
    pruefe("Tagesgrenze: 21 Stunden nach der letzten Prüfung wird wieder nachgefragt", r["ergebnis"] == "aktuell" and netz.aufrufe != [])

# ───────────────────────── Nie zurück, nie unnötig ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td, gebaut="2026-11-05T10:00:00Z", commit="fffffff1234567")
    d_alt, m_alt = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d_alt, m_alt)
    vorher = baum(td)
    r = lauf(td, netz)
    pruefe("keine Rückschritte: ein älteres Paket ersetzt die neuere Installation nicht", r["ergebnis"] == "aktuell" and baum(td) == vorher and netz.zips() == [], r)
    d_gl, m_gl = paket({}, gebaut="2026-11-06T10:00:00Z", commit="fffffff1234567", datum="2026-11-05")
    netz = Netz().setze(d_gl, m_gl)
    r = lauf(td, netz, jetzt=J0 + timedelta(days=1))
    pruefe("gleiche Version (anderer Bauzeitpunkt): kein Download, nichts geändert", r["ergebnis"] == "aktuell" and netz.zips() == [] and baum(td) == vorher, r)

# ───────────────────────── Probelauf durchgefallen: nichts angefasst, Pause nach zwei Fehlversuchen ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    (td / "data").mkdir(exist_ok=True)
    (td / "data/krypto-pilot.json").write_text("{}")
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    r = lauf(td, netz, pruefer=schlecht)
    pruefe("Probelauf durchgefallen: fehlgeschlagen, ok=False, Text nennt den Grund", not r["ok"] and r["ergebnis"] == "fehlgeschlagen" and "kaputt" in r["text"] and "nichts wurde geändert" in r["text"], r)
    pruefe("Probelauf durchgefallen: die Installation ist byte-genau wie vorher (nichts berührt)", baum(td) == vorher)
    pruefe("Probelauf durchgefallen: keine Sicherung angelegt (es gab nichts zu sichern)", not (td / "data" / AU.SICHERUNG).exists() or not list((td / "data" / AU.SICHERUNG).iterdir()))
    pruefe("Fehlversuch 1 gezählt", AU.status_lesen(td)["fehlversuche"][m2["version"]]["n"] == 1)
    r = lauf(td, netz, pruefer=schlecht, jetzt=J0 + timedelta(hours=1))
    pruefe("Fehlversuch 2 gezählt", AU.status_lesen(td)["fehlversuche"][m2["version"]]["n"] == 2)
    netz.aufrufe.clear()
    r = lauf(td, netz, pruefer=schlecht, jetzt=J0 + timedelta(hours=2))
    pruefe("nach zwei Fehlversuchen: pausiert, kein Download mehr", r["ergebnis"] == "pausiert" and netz.zips() == [] and r["ok"], r)
    r = lauf(td, netz, pruefer=lambda w, n, l: (True, "ok"), jetzt=J0 + timedelta(hours=3), hand=True)
    pruefe("Knopf «Update holen» (hand) setzt sich über die Pause hinweg", r["ergebnis"] == "eingespielt", r)

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    lauf(td, netz, pruefer=schlecht)
    lauf(td, netz, pruefer=schlecht, jetzt=J0 + timedelta(hours=1))
    r = lauf(td, netz, pruefer=lambda w, n, l: (True, "ok"), jetzt=J0 + timedelta(days=AU.PAUSE_TAGE, hours=1))
    pruefe("die Pause endet nach 3 Tagen: nochmals versucht", r["ergebnis"] == "eingespielt", r)
    d3, m3 = paket(V2, gebaut="2026-11-09T10:00:00Z", commit="9999999abcdef")
    td2 = Path(tempfile.mkdtemp())
    try:
        installiere(td2)
        netz2 = Netz().setze(d2, m2)
        lauf(td2, netz2, pruefer=schlecht)
        lauf(td2, netz2, pruefer=schlecht, jetzt=J0 + timedelta(hours=1))
        netz2.setze(d3, m3)
        r = lauf(td2, netz2, pruefer=lambda w, n, l: (True, "ok"), jetzt=J0 + timedelta(hours=2))
        pruefe("eine NEUERE Version ist von der Pause der alten nicht betroffen", r["ergebnis"] == "eingespielt" and r["nach"] == m3["version"], r)
    finally:
        import shutil
        shutil.rmtree(td2, ignore_errors=True)

# ───────────────────────── Abgelehntes Paket ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2[:-5] + b"XXXXX", m2)
    r = lauf(td, netz)
    pruefe("beschädigter Download (Prüfsumme): abgelehnt, nichts geändert, Fehlversuch gezählt", r["ergebnis"] == "fehlgeschlagen" and "Prüfsumme" in r["text"] and baum(td) == vorher
           and AU.status_lesen(td)["fehlversuche"][m2["version"]]["n"] == 1, r)
    boese, mb = roh_zip(_gut + [("tools/trading/../evil.py", b"x")])
    netz = Netz().setze(boese, {**m2, "sha256": mb["sha256"], "groesse": mb["groesse"]})
    r = lauf(td, netz, jetzt=J0 + timedelta(days=1))
    pruefe("bösartiges Paket (Zip-Slip) mit gültiger Prüfsumme: trotzdem abgelehnt", r["ergebnis"] == "fehlgeschlagen" and baum(td) == vorher and not (td.parent / "evil.py").exists(), r)

# ───────────────────────── Tausch scheitert / stirbt: alles zurück ─────────────────────────
class Platte:
    """Lässt das Schreiben in tools/trading ab der n-ten Datei scheitern (einmal, oder dauerhaft)."""
    def __init__(self, ab, dauerhaft=False, art=OSError):
        self.ab, self.dauerhaft, self.art, self.n, self.orig = ab, dauerhaft, art, 0, AU._bytes_atomar

    def __enter__(self):
        def f(ziel, daten):
            if "/tools/trading/" in Path(ziel).as_posix():
                self.n += 1
                if self.n == self.ab or (self.dauerhaft and self.n > self.ab):
                    raise self.art("Platte voll")
            return self.orig(ziel, daten)
        AU._bytes_atomar = f
        return self

    def __exit__(self, *a):
        AU._bytes_atomar = self.orig


with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    (td / "tools/trading/krypto_bot/meine_notiz.txt").write_text("nur bei mir")
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    with Platte(ab=3):
        r = lauf(td, netz)
    pruefe("Tausch scheitert mittendrin: zurückgerollt, ok=False, nicht kritisch", r["ergebnis"] == "zurueckgerollt" and not r["ok"] and not AU.status_lesen(td)["kritisch"], r)
    pruefe("Tausch scheitert mittendrin: ALLES ist wieder byte-genau wie vorher (auch die neue Datei ist weg)", baum(td) == vorher,
           {k for k in set(vorher) | set(baum(td)) if vorher.get(k) != baum(td).get(k)})
    pruefe("Tausch scheitert mittendrin: Marke «LAEUFT» entfernt (der Rückweg war vollständig)", not AU.unfertig(td))
    pruefe("Tausch scheitert mittendrin: Fehlversuch gezählt", AU.status_lesen(td)["fehlversuche"][m2["version"]]["n"] == 1)

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    with Platte(ab=3, dauerhaft=True):
        r = lauf(td, netz)
    pruefe("Rückweg selbst gestört: als KRITISCH gemeldet, Marke bleibt für die Heilung", r["ergebnis"] == "zurueckgerollt" and AU.status_lesen(td)["kritisch"] and AU.unfertig(td), r)
    pruefe("kritisch: die Ampel ist rot", AU.ampel({}, td, J0)[0] is False)
    _orig_rollen = AU._zurueckrollen
    AU._zurueckrollen = lambda w, d: ["cockpit.py (PermissionError)"]
    try:
        r = lauf(td, Netz(), jetzt=J0 + timedelta(hours=1))
    finally:
        AU._zurueckrollen = _orig_rollen
    pruefe("Heilung gescheitert: die Marke bleibt, und der Status bleibt KRITISCH (auch nach einem späteren, harmlosen Lauf)", AU.unfertig(td) and AU.status_lesen(td)["kritisch"] is True, AU.status_lesen(td))
    pruefe("Heilung beim nächsten Start: der Zustand von vorher kommt zurück", "zurückgenommen" in AU.erholen(td) and baum(td) == vorher and not AU.unfertig(td))
    r = lauf(td, Netz(), jetzt=J0 + timedelta(hours=2))
    pruefe("nach gelungener Heilung ist der Status nicht mehr kritisch", AU.status_lesen(td)["kritisch"] is False and AU.ampel({}, td, J0)[0] is not False, AU.status_lesen(td))

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    try:
        with Platte(ab=3, art=KeyboardInterrupt):      # der Prozess wird mitten im Tausch beendet (Strom weg, Fenster zu)
            lauf(td, netz)
        beendet = False
    except KeyboardInterrupt:
        beendet = True
    pruefe("Absturz mitten im Tausch: halb getauscht, Marke steht", beendet and baum(td) != vorher and AU.unfertig(td))
    netz2 = Netz()          # nächster Lauf: Internet weg — die Heilung kommt trotzdem zuerst
    r = lauf(td, netz2, jetzt=J0 + timedelta(hours=1))
    pruefe("Absturz mitten im Tausch: der nächste Lauf stellt den alten Stand wieder her", baum(td) == vorher and not AU.unfertig(td) and "zurückgenommen" in AU.status_lesen(td).get("erholt", ""), r)

# Reihenfolge beim Schreiben und Zurücklesen
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    reihenfolge, orig_b = [], AU._bytes_atomar

    def merke(ziel, daten):
        p_ = Path(ziel).as_posix()
        if "/tools/trading/" in p_:
            reihenfolge.append(p_.split("/tools/trading/", 1)[1])
        return orig_b(ziel, daten)
    AU._bytes_atomar = merke
    try:
        lauf(td, Netz().setze(d2, m2))
    finally:
        AU._bytes_atomar = orig_b
    pruefe("Schreibreihenfolge: erst Programmdateien, dann Start-Skripte (.bat), ganz zuletzt die Liste und VERSION.json (ein Abbruch davor wiederholt das Update)",
           reihenfolge == ["krypto_bot/cockpit.py", "krypto_bot/neu.py", "krypto_bot/krypto-auto.bat", "PAKET-DATEIEN.json", "VERSION.json"], reihenfolge)

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    orig_b = AU._bytes_atomar

    def verfaelscht(ziel, daten):
        if Path(ziel).name == "neu.py" and "/tools/trading/" in Path(ziel).as_posix():
            daten = b"# still verfaelscht\n"      # die Platte schreibt etwas anderes, ohne Fehler zu melden
        return orig_b(ziel, daten)
    AU._bytes_atomar = verfaelscht
    try:
        r = lauf(td, Netz().setze(d2, m2))
    finally:
        AU._bytes_atomar = orig_b
    pruefe("Zurücklesen: eine still verfälschte Datei wird erkannt und alles zurückgerollt", r["ergebnis"] == "zurueckgerollt" and "nicht korrekt" in r["text"] and baum(td) == vorher, r)

# ───────────────────────── Sperre, Schalter, Echtgeld, Stopp-Datei, Netz ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    netz = Netz().setze(d2, m2)
    r = lauf(td, netz, sperre=besetzte_sperre)
    pruefe("Lauf-Sperre besetzt: nicht getauscht, kein Fehlversuch, ok", r["ergebnis"] == "besetzt" and r["ok"] and baum(td) == vorher and not AU.status_lesen(td).get("fehlversuche"), r)
    netz.aufrufe.clear()
    r = lauf(td, netz, env={"BINANCE_FUTURES_TESTNET": "false"})
    pruefe("Echtgeld: der automatische Lauf macht nichts und fragt nicht einmal nach", r["ergebnis"] == "aus" and "von Hand" in r["text"] and baum(td) == vorher and netz.aufrufe == [], (r, netz.aufrufe))
    netz.aufrufe.clear()
    r = lauf(td, netz, env={"BINANCE_FUTURES_TESTNET": "false"}, hand=True)
    pruefe("Echtgeld: der Knopf «Update holen» (hand) darf trotzdem", r["ergebnis"] == "eingespielt", r)
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    vorher = baum(td)
    netz = Netz().setze(d2, m2)
    r = lauf(td, netz, env={"KRYPTO_AUTOUPDATE": "aus"})
    pruefe("Schalter KRYPTO_AUTOUPDATE=aus: nichts, kein Netzverkehr", r["ergebnis"] == "aus" and netz.aufrufe == [] and baum(td) == vorher)
    (td / "data").mkdir(exist_ok=True)
    (td / "data" / AU.AUS_DATEI).write_text("x")
    r = lauf(td, netz)
    pruefe("Schalter-Datei: nichts, kein Netzverkehr", r["ergebnis"] == "aus" and netz.aufrufe == [])
    (td / "data" / AU.AUS_DATEI).unlink()
    stopp = Netz().setze(d2, m2, stopp=(200, "Fehler in 1234 — vorerst halten\n".encode()))
    r = lauf(td, stopp)
    pruefe("Stopp-Datei im Repo (Not-Aus aus der Cloud): kein Update, Text sichtbar, Paket nicht geladen", r["ergebnis"] == "gestoppt" and "vorerst halten" in r["text"] and stopp.zips() == [] and baum(td) == vorher, r)
    r = lauf(td, stopp, hand=True)
    pruefe("Stopp-Datei gilt auch für den Knopf", r["ergebnis"] == "gestoppt" and stopp.zips() == [])
    leer = Netz().setze(d2, m2, stopp=(200, b"  \n"))
    r = lauf(td, leer, jetzt=J0 + timedelta(days=1))
    pruefe("leere Stopp-Datei heisst «weiter»", r["ergebnis"] == "eingespielt", r)
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    vorher = baum(td)
    d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    kaputt = Netz().setze(d2, m2, stopp=(500, b""))
    r = lauf(td, kaputt)
    pruefe("Stopp-Datei nicht prüfbar (HTTP 500): vorsichtshalber kein Update", r["ergebnis"] == "offline" and kaputt.zips() == [] and baum(td) == vorher, r)
    kaputt = Netz().setze(d2, m2, stopp=(None, b""))
    r = lauf(td, kaputt)
    pruefe("Stopp-Datei nicht erreichbar (Netz weg mitten drin): kein Update", r["ergebnis"] == "offline" and kaputt.zips() == [])
    pruefe("offline setzt «geprüft» nicht (morgen wird nochmals nachgefragt)", "geprueft" not in AU.status_lesen(td))
    r = lauf(td, Netz(), jetzt=J0)
    pruefe("kein Paket veröffentlicht (404): offline, ok", r["ergebnis"] == "offline" and r["ok"] and "404" in r["text"])
    nichts = Netz()
    nichts.antworten[AU.MANIFEST_URL] = (None, b"")
    r = lauf(td, nichts)
    pruefe("kein Internet: offline, ok=True (kein Alarm)", r["ergebnis"] == "offline" and r["ok"] and "kein Internet" in r["text"])
    nichts.antworten[AU.MANIFEST_URL] = (503, b"")
    pruefe("HTTP 503 bei der Beschreibung: offline", lauf(td, nichts)["ergebnis"] == "offline")
    nichts.antworten[AU.MANIFEST_URL] = (200, b"{kein json")
    r = lauf(td, nichts)
    pruefe("unbrauchbare Beschreibung: fehlgeschlagen, ok=False, nichts geändert", r["ergebnis"] == "fehlgeschlagen" and not r["ok"] and baum(td) == vorher, r)
    zip_weg = Netz().setze(d2, m2)
    del zip_weg.antworten[f"{AU.BASIS}/{m2['datei']}"]
    r = lauf(td, zip_weg)
    pruefe("Paket lässt sich nicht laden (404): offline, kein Fehlversuch", r["ergebnis"] == "offline" and not AU.status_lesen(td).get("fehlversuche"), r)

# ───────────────────────── Sicherungen aufräumen ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    basis = td / "data" / AU.SICHERUNG
    for i in range(6):
        (basis / f"2026110{i}-100000-x").mkdir(parents=True)
    (basis / "20260101-000000-marke").mkdir()
    (basis / "20260101-000000-marke" / "LAEUFT").write_text("x")
    AU._sicherungen_aufraeumen(td)
    rest = sorted(p.name for p in basis.iterdir())
    pruefe("Sicherungen: die letzten drei bleiben, eine unfertige (mit Marke) wird nie weggeräumt",
           rest == ["20260101-000000-marke", "20261103-100000-x", "20261104-100000-x", "20261105-100000-x"], rest)

# ───────────────────────── Selbsttests und Probelauf in der Kopie ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    kb = td / "tools/trading/krypto_bot"
    kb.mkdir(parents=True)
    (kb / "test_pilot.py").write_text("import sys\nsys.exit(0)\n")
    (kb / "test_cockpit.py").write_text("print('9 bestanden')\n")
    pruefe("schnelltests: alles grün", AU.schnelltests(td) == (True, "Syntax und 2 Selbsttests bestanden"), AU.schnelltests(td))
    (kb / "test_sammler.py").write_text("import sys\nprint('FAIL x')\nsys.exit(1)\n")
    ok, text = AU.schnelltests(td)
    pruefe("schnelltests: ein durchgefallener Test (zweimal) → False mit Name und letzter Zeile", not ok and "test_sammler.py" in text and "FAIL x" in text, text)
    (kb / "test_sammler.py").write_text("import sys\nfrom pathlib import Path\nm = Path(__file__).with_name('merk.txt')\nif m.exists():\n    sys.exit(0)\nm.write_text('1')\nsys.exit(1)\n")
    pruefe("schnelltests: ein wackliger Test, der beim zweiten Mal besteht, zählt als bestanden", AU.schnelltests(td)[0])
    (kb / "test_sammler.py").unlink()
    (kb / "test_calls.py").write_text("import time\ntime.sleep(30)\n")
    ok, text = AU.schnelltests(td, zeit=1)
    pruefe("schnelltests: ein hängender Test wird abgebrochen und scheitert", not ok and "länger als 1 Sekunden" in text, text)
    (kb / "test_calls.py").unlink()
    ok, text = AU.schnelltests(td, budget=-1)
    pruefe("schnelltests: Gesamtbudget überschritten → False", not ok and "dauert länger" in text, text)
    (kb / "kaputt.py").write_text("def (:\n")
    ok, text = AU.schnelltests(td)
    pruefe("schnelltests: Syntaxfehler in irgendeiner .py → False", not ok and "Syntaxfehler" in text and "kaputt.py" in text, text)

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    kb = td / "tools/trading/krypto_bot"
    (kb / "test_pilot.py").write_text("import sys\nsys.exit(1)\n")           # die JETZIGE Version ist kaputt
    (td / "data").mkdir(exist_ok=True)
    (td / "data/vorhanden.json").write_text("{}")
    (td / "data" / AU.SICHERUNG / "alt").mkdir(parents=True)
    (td / "data" / AU.SICHERUNG / "alt" / "gross.bin").write_text("x")
    (td / "tools/trading/ki_bot").mkdir(parents=True, exist_ok=True)
    (td / "tools/trading/ki_bot/STOP").write_text("stop")
    neu_test = ("import sys\nfrom pathlib import Path\nroot = Path(__file__).resolve().parents[3]\n"
                "(root / 'data' / 'probe.txt').write_text('x')\n"
                "assert (root / 'tools/trading/krypto_bot/neu.py').exists()\n"
                "assert not (root / 'tools/trading/ki_bot/STOP').exists()\n"
                "assert (root / 'data/vorhanden.json').exists()\n"
                "assert not (root / 'data' / 'krypto-update-backup').exists()\n"
                "sys.exit(0)\n").encode()
    d2, m2 = paket({**V2, "tools/trading/krypto_bot/test_pilot.py": neu_test}, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    n2 = AU.zip_lesen(d2, AU.manifest_pruefen(m2))
    schr, loe = AU.plan_erstellen(td, n2, AU.alte_liste(td))
    vorher = baum(td)
    ok, text = AU.vorpruefung(td, n2, loe)
    pruefe("Probelauf in der Kopie: die NEUE Version besteht (die kaputte jetzige zählt nicht)", ok, text)
    pruefe("Probelauf in der Kopie: die echte Installation ist unberührt (auch data/ und die Not-Aus-Datei)", baum(td) == vorher and not (td / "data/probe.txt").exists())
    pruefe("Probelauf in der Kopie: Arbeitsordner wieder aufgeräumt", not (td / "data" / AU.ARBEIT).exists())
    d3, m3 = paket({**V2, "tools/trading/krypto_bot/test_pilot.py": b"import sys\nsys.exit(1)\n"}, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
    n3 = AU.zip_lesen(d3, AU.manifest_pruefen(m3))
    ok, text = AU.vorpruefung(td, n3, [])
    pruefe("Probelauf in der Kopie: eine durchfallende neue Version wird erkannt", not ok and "test_pilot.py" in text, text)
    pruefe("Probelauf in der Kopie: echte Installation weiterhin unberührt", baum(td) == vorher)

# ───────────────────────── Ampel, Anzeige, Aufruf von der Kommandozeile ─────────────────────────
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    ok, text, warn = AU.ampel({}, td, J0)
    pruefe("Ampel: nie geprüft → grau, ohne Alarm", ok is None and not warn and "noch nie geprüft" in text, text)
    st = {"geprueft": "2026-11-03T04:00:00Z", "ergebnis": "aktuell", "text": "Version x ist die neueste", "ok": True}
    AU.status_schreiben(td, st)
    ok, text, warn = AU.ampel({}, td, J0)
    pruefe("Ampel: frisch geprüft → grün", ok is True and "zuletzt geprüft 2026-11-03 04:00" in text, text)
    ok, text, warn = AU.ampel({}, td, J0 + timedelta(days=5))
    pruefe("Ampel: seit 5 Tagen nicht geprüft → grau mit Warnung", ok is None and warn and "5 Tagen" in text, text)
    AU.status_schreiben(td, {**st, "ergebnis": "fehlgeschlagen", "ok": False, "text": "Version y hat den Probelauf nicht bestanden"})
    ok, text, warn = AU.ampel({}, td, J0)
    pruefe("Ampel: gescheitertes Update → Warnung (die Installation läuft ja weiter), nicht rot", ok is None and warn and "Probelauf" in text, (ok, text))
    AU.status_schreiben(td, {**st, "ergebnis": "pausiert", "ok": True, "text": "pausiert"})
    pruefe("Ampel: pausiert → Warnung", AU.ampel({}, td, J0)[2] is True)
    AU.status_schreiben(td, {**st, "ergebnis": "fehlgeschlagen", "ok": False, "kritisch": True, "text": "Rückweg unvollständig"})
    pruefe("Ampel: kritisch → rot", AU.ampel({}, td, J0)[0] is False)
    AU.status_schreiben(td, st)
    ok, text, warn = AU.ampel({"BINANCE_FUTURES_TESTNET": "false"}, td, J0)
    pruefe("Ampel: Echtgeld → grau, sagt «von Hand»", ok is None and "von Hand" in text, text)
    # status_text() kennt keine Zeitvorgabe und nimmt die ECHTE Uhr: ein fester Stand vom 03.11. wäre nach 3 Tagen «nicht geprüft» (grau, «○») und der Test
    # fiele still um, sobald J0 mehr als 3 Tage zurückliegt (GEMESSEN 08.11.2026: ab 07.11. 12:00 UTC rot, der nächste Paketbau wäre daran gescheitert).
    # Darum hier ein Stand von «jetzt».
    AU.status_schreiben(td, {**st, "geprueft": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")})
    pruefe("status_text: Kopfzeichen und Name", AU.status_text(td, {}).startswith("✓ Auto-Update: "))

_vor = AU.einspielen
AU.einspielen = lambda **kw: (_ for _ in ()).throw(RuntimeError("boom"))
import contextlib  # noqa: E402
puffer = io.StringIO()
with contextlib.redirect_stdout(puffer):
    rc = AU.main([])
pruefe("main: ein unerwarteter Fehler gibt trotzdem 0 zurück (der Tageslauf scheitert nie am Update)", rc == 0 and "unerwarteter Fehler" in puffer.getvalue(), puffer.getvalue())
AU.einspielen = lambda **kw: {"ok": True, "ergebnis": "aktuell", "text": "Version x ist die neueste", "von": "x", "nach": None, "version": "x"}
puffer = io.StringIO()
with contextlib.redirect_stdout(puffer):
    AU.main(["--still"])
    still = puffer.getvalue()
    AU.main([])
pruefe("main --still: schweigt bei «aktuell», ohne --still gibt es die Zeile", still == "" and "Auto-Update: Version x" in puffer.getvalue(), puffer.getvalue())
AU.einspielen = _vor

# ───────────────────────── Echtes Netz: lokaler Webserver ─────────────────────────
class _Handler(BaseHTTPRequestHandler):
    antworten = {}

    def do_GET(self):
        code, daten = self.antworten.get(self.path, (404, b""))
        if code in (301, 302):
            self.send_response(code)
            self.send_header("Location", daten.decode())
            self.end_headers()
            return
        self.send_response(code)
        self.send_header("Content-Length", str(len(daten)))
        self.end_headers()
        self.wfile.write(daten)

    def log_message(self, *a):
        pass


os.environ["no_proxy"] = os.environ["NO_PROXY"] = "127.0.0.1,localhost"
srv = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
host = f"http://127.0.0.1:{srv.server_address[1]}"
d2, m2 = paket(V2, gebaut="2026-11-04T10:00:00Z", commit="1234567abcdef")
_Handler.antworten = {"/paket.json": (200, json.dumps(m2).encode()), "/weiter.zip": (302, ("/" + m2["datei"]).encode()), "/" + m2["datei"]: (200, d2),
                      "/stopp.txt": (404, b""), "/gross": (200, b"x" * 5000)}
code, daten = AU._holen(host + "/paket.json")
pruefe("_holen: 200 und Inhalt", code == 200 and json.loads(daten)["version"] == m2["version"])
pruefe("_holen: Weiterleitung (GitHub leitet Release-Downloads um) wird verfolgt", AU._holen(host + "/weiter.zip") == (200, d2))
pruefe("_holen: 404 ist ein Code, kein Fehler", AU._holen(host + "/nirgends") == (404, b""))
pruefe("_holen: zu grosse Antwort → (None, leer)", AU._holen(host + "/gross", max_bytes=100) == (None, b""))
srv.shutdown()
srv.server_close()
pruefe("_holen: Server nicht erreichbar → (None, leer)", AU._holen(host + "/paket.json", timeout=2) == (None, b""))
srv2 = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
threading.Thread(target=srv2.serve_forever, daemon=True).start()
host2 = f"http://127.0.0.1:{srv2.server_address[1]}"
_alt = (AU.BASIS, AU.MANIFEST_URL, AU.STOPP_URL)
AU.BASIS, AU.MANIFEST_URL, AU.STOPP_URL = host2, host2 + "/paket.json", host2 + "/stopp.txt"
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    installiere(td)
    r = AU.einspielen(wurzel=td, env={}, jetzt=J0, pruefer=lambda w, n, l: (True, "ok"), sperre=keine_sperre)
    pruefe("Ende-zu-Ende über einen echten (lokalen) Webserver: eingespielt", r["ergebnis"] == "eingespielt" and (td / "tools/trading/krypto_bot/cockpit.py").read_bytes() == b"# cockpit v2\n", r)
AU.BASIS, AU.MANIFEST_URL, AU.STOPP_URL = _alt
srv2.shutdown()

# ───────────────────────── Pflege ─────────────────────────
class Fest:
    def __init__(self, **ergebnis):
        self.ergebnis, self.aufrufe = ergebnis, 0

    def __call__(self, **kw):
        self.aufrufe += 1
        return self.ergebnis


UP_OK = {"ok": True, "ergebnis": "aktuell", "text": "Version x ist die neueste"}
UP_FEHL = {"ok": False, "ergebnis": "fehlgeschlagen", "text": "Version y hat den Probelauf nicht bestanden (kaputt)"}
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    gesendet = []
    r = PF.pflege(wurzel=td, update=Fest(**UP_OK), heilen=lambda w: (True, "Danach: alles in Ordnung."), push=gesendet.append, jetzt=J0)
    pruefe("Pflege: alles grün → Datei geschrieben, keine Handy-Nachricht", gesendet == [] and PF.lesen(td)["heilung"]["ok"] and PF.lesen(td)["update"]["ergebnis"] == "aktuell" and r["probleme"] == [], r)
    pruefe("Pflege: Ampel grün", PF.ampel(td, J0)[0] is True)
    r = PF.pflege(wurzel=td, update=Fest(**UP_FEHL), heilen=lambda w: (True, "ok"), push=gesendet.append, jetzt=J0 + timedelta(hours=1))
    pruefe("Pflege: Update gescheitert → eine Handy-Nachricht mit dem Grund", len(gesendet) == 1 and "kaputt" in gesendet[0] and "Keine Anlageberatung" in gesendet[0], gesendet)
    r = PF.pflege(wurzel=td, update=Fest(**UP_FEHL), heilen=lambda w: (True, "ok"), push=gesendet.append, jetzt=J0 + timedelta(hours=5))
    pruefe("Pflege: dieselbe Meldung nicht nochmals innerhalb von 20 Stunden", len(gesendet) == 1)
    r = PF.pflege(wurzel=td, update=Fest(**UP_FEHL), heilen=lambda w: (True, "ok"), push=gesendet.append, jetzt=J0 + timedelta(hours=22))
    pruefe("Pflege: nach 22 Stunden wieder", len(gesendet) == 2)
    r = PF.pflege(wurzel=td, update=Fest(**UP_OK), heilen=lambda w: (False, "x\n❌ Prüflauf ohne Aufträge FEHLGESCHLAGEN: HTTP 401"), push=gesendet.append, jetzt=J0 + timedelta(days=3))
    pruefe("Pflege: Selbstheilung meldet Probleme → Handy-Nachricht mit der letzten Zeile", len(gesendet) == 3 and "HTTP 401" in gesendet[-1], gesendet)
    ok, text, warn = PF.ampel(td, J0 + timedelta(days=3))
    pruefe("Pflege-Ampel: Selbstprüfung fand etwas → rot mit Text", ok is False and "HTTP 401" in text, text)
    z = Fest(**UP_OK)
    h = []
    PF.pflege(wurzel=td, nur_update=True, update=z, heilen=lambda w: h.append(1) or (True, ""), push=gesendet.append, jetzt=J0 + timedelta(days=4))
    pruefe("Pflege --nur-update: keine Selbstheilung", z.aufrufe == 1 and h == [])
    PF.pflege(wurzel=td, ohne_update=True, update=z, heilen=lambda w: h.append(1) or (True, ""), push=gesendet.append, jetzt=J0 + timedelta(days=4))
    pruefe("Pflege --ohne-update: kein Update", z.aufrufe == 1 and h == [1])
    r = PF.pflege(wurzel=td, update=lambda **kw: (_ for _ in ()).throw(RuntimeError("boom")), heilen=lambda w: (_ for _ in ()).throw(RuntimeError("bumm")),
                  push=lambda t: (_ for _ in ()).throw(OSError("kein Kanal")), jetzt=J0 + timedelta(days=9))
    pruefe("Pflege: Ausnahmen in Update, Heilung und Handy-Kanal werfen nie, sie werden Probleme", len(r["probleme"]) == 2 and r["update"]["ergebnis"] == "fehler", r)
    td3 = Path(tempfile.mkdtemp())
    try:
        PF.pflege(wurzel=td3, update=Fest(**UP_OK), heilen=lambda w: (True, "ok"), push=gesendet.append, jetzt=J0)
        ok, text, warn = PF.ampel(td3, J0 + timedelta(hours=60))
        pruefe("Pflege-Ampel: seit über 48 Stunden nicht gelaufen → grau mit Warnung", ok is None and warn is True and "2 Tagen" in text, text)
        pruefe("Pflege-Ampel: frisch → grün", PF.ampel(td3, J0 + timedelta(hours=5))[0] is True)
    finally:
        import shutil as _sh
        _sh.rmtree(td3, ignore_errors=True)
with tempfile.TemporaryDirectory() as td:
    pruefe("Pflege-Ampel: noch nie gelaufen → grau, ohne Warnung", PF.ampel(Path(td), J0)[0] is None and not PF.ampel(Path(td), J0)[2])
    _vp = PF.pflege
    PF.pflege = lambda **kw: (_ for _ in ()).throw(RuntimeError("boom"))
    puffer = io.StringIO()
    with contextlib.redirect_stdout(puffer):
        rc = PF.main([])
    PF.pflege = _vp
    pruefe("Pflege main: auch bei unerwartetem Fehler Rückgabewert 0", rc == 0 and "unerwarteter Fehler" in puffer.getvalue())
    pruefe("Pflege: _heilen_prozess ohne cockpit.py meldet den Mangel", PF._heilen_prozess(Path(td)) == (False, "cockpit.py fehlt"))

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
