#!/usr/bin/env python3
"""Offline-Test für automation/ki_trader_cloud.py: kein Netz, kein Schlüssel, nichts im echten data/.

    python3 automation/test_ki_trader_cloud.py

Alle Zeiten sind relativ zu «jetzt» (kein fester Stichtag, sonst wird der Test still rot). Der Schlüssel im Test ist eine
erfundene Zeichenkette ohne das Muster eines echten Schlüssels.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import ki_trader_cloud as KC  # noqa: E402

KT = KC._kt()
OPUS, HAIKU = KT.MODELL_STANDARD, KT.MODELL_GUENSTIG
JETZT = datetime.now(timezone.utc)
GEHEIM = "nur-ein-testwert-kein-echter-schluessel"
ANTWORT = {"btc": {"position": 0.5, "begruendung": "über dem 200-Tage-Schnitt", "sicherheit": 0.8},
           "eth": {"position": 0.0, "begruendung": "kein klares Bild", "sicherheit": 0.8}, "kommentar": "ruhiger Markt"}
FEHLER, GEPRUEFT = [], [0]


def pruefe(name, ok, info=None):
    GEPRUEFT[0] += 1
    if not ok:
        FEHLER.append(name)
        print(f"FEHLER: {name}" + (f"\n        {info!r}" if info is not None else ""))


class Fake:
    """Steht für den Anthropic-Client: zählt die Anfragen, antwortet je Modell oder wirft."""

    def __init__(self, antworten=None, fehler=None):
        self.aufrufe, self.antworten, self.fehler = [], antworten or {}, fehler
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    @property
    def modelle(self):
        return [a["model"] for a in self.aufrufe]

    def _create(self, **kw):
        self.aufrufe.append(kw)
        if self.fehler:
            raise self.fehler
        a = self.antworten.get(kw["model"], ANTWORT)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=json.dumps(a))], stop_reason="end_turn", model=kw["model"],
                               usage=SimpleNamespace(input_tokens=1000, output_tokens=500))


def reihen(jetzt, alter=1, tage=260, schritt=0.0005):
    """Künstliche Tagesschlüsse, der letzte `alter` Tage vor `jetzt`; ruhig steigend (kein Schnitt wird gekreuzt)."""
    ende = jetzt.date() - timedelta(days=alter)
    out = {"btc": [], "eth": []}
    for i in range(tage):
        tag = (ende - timedelta(days=tage - 1 - i)).isoformat()
        out["btc"].append((tag, 70000.0 * (1 + schritt) ** i))
        out["eth"].append((tag, 2000.0 * (1 + schritt) ** i))
    return out


@contextlib.contextmanager
def wurzel(frei=True, kosten=None, pilot=None):
    """Ein leeres Repo-Gerüst im Temp-Ordner: data/, docs/, auf Wunsch Freigabedatei, Kostenbuch und Pilot-Schattenbuch."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "data").mkdir()
        (root / "docs").mkdir()
        if frei:
            (root / KC.FREIGABE).write_text("frei\n", encoding="utf-8")
        if kosten is not None:
            (root / KC.ORDNER).mkdir(parents=True)
            (root / KC.ORDNER / KT.KOSTEN_BUCH.name).write_text(json.dumps(kosten), encoding="utf-8")
        if pilot is not None:
            (root / KC.PILOT_SCHATTEN).write_text(json.dumps(pilot), encoding="utf-8")
        yield root


def logbuch(root):
    p = root / KC.ORDNER / "ki-trader.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def kostenbuch(root):
    p = root / KC.ORDNER / KT.KOSTEN_BUCH.name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


ENV = {"ANTHROPIC_API_KEY": GEHEIM}
HEUTE = JETZT.date().isoformat()
MONATSANFANG = JETZT.date().replace(day=1)
VORMONAT = (MONATSANFANG - timedelta(days=1)).isoformat()


def test_schalter_und_schluessel():
    with wurzel(frei=False) as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Ohne Freigabedatei: aus, keine Anfrage, nichts angelegt",
               erg["status"] == "aus" and not f.aufrufe and not (root / KC.ORDNER).exists() and "KI-TRADER-CLOUD-FREI" in erg["text"], erg)
    with wurzel() as root:
        for env in ({}, {"ANTHROPIC_API_KEY": ""}, {"ANTHROPIC_API_KEY": "   "}):
            erg = KC.lauf(env, root, None, JETZT, reihen(JETZT), "x")
            pruefe(f"Ohne Schlüssel ({env!r}): übersprungen, nichts angelegt", erg["status"] == "kein-schluessel" and not (root / KC.ORDNER).exists(), erg)


def test_kurse_alt():
    with wurzel() as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT, alter=3), "x")
        pruefe("Letzter Tagesschluss 3 Tage alt: übersprungen, keine Anfrage", erg["status"] == "kurse-alt" and not f.aufrufe and "3 Tage" in erg["text"], erg)
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT, alter=2), "x")
        pruefe("Letzter Tagesschluss 2 Tage alt: gilt noch (eine Anfrage)", erg["status"] == "neu" and len(f.aufrufe) == 1, erg)


def test_erster_lauf_und_wiederholung():
    with wurzel() as root:
        f = Fake()
        r = reihen(JETZT)
        erg = KC.lauf(ENV, root, f, JETZT, r, "Angst-und-Gier 40")
        lb, kb = logbuch(root), kostenbuch(root)
        e = (lb or {}).get("entscheide", [{}])[-1]
        pruefe("Erster Lauf: neue Einschätzung von Opus (ohne frühere Einschätzung gibt es keinen Ruhetag)",
               erg["status"] == "neu" and f.modelle == [OPUS] and e.get("stand") == r["btc"][-1][0] and e.get("stufe") == "opus"
               and e.get("modell") == OPUS and e["btc"]["position"] == 0.5, (erg, e))
        pruefe("Erster Lauf: Opus mit Ersatzmodell, Aufwand hoch, festes JSON-Schema",
               f.aufrufe[0].get("fallbacks") == "default" and f.aufrufe[0]["output_config"]["effort"] == "high"
               and f.aufrufe[0]["output_config"]["format"]["type"] == "json_schema", f.aufrufe[0].keys())
        pruefe("Erster Lauf: Kosten 0,014 USD im Eintrag und im Kostenbuch der Cloud (Aufgabe «entscheid»)",
               abs(e.get("kosten_usd", 0) - 0.014) < 1e-9 and kb["summen"][OPUS]["n"] == 1 and abs(kb["summen"][OPUS]["usd"] - 0.014) < 1e-9
               and kb["zeilen"][-1]["aufgabe"] == "entscheid", (e, kb))
        pruefe("Erster Lauf: der Text nennt Position, Vergleich braucht zwei Tage, Monatskosten und Grenze",
               "BTC LONG 0.50" in erg["text"] and "0.01 von 3.00 USD" in erg["text"], erg["text"])
        pruefe("Der Markt-Info-Text geht in die Anfrage", "Angst-und-Gier 40" in f.aufrufe[0]["messages"][0]["content"])
        erg2 = KC.lauf(ENV, root, f, JETZT, r, "x")
        pruefe("Zweiter Lauf am selben Tagesschluss: liegt schon vor, keine weitere Anfrage, Logbuch unverändert",
               erg2["status"] == "liegt-vor" and len(f.aufrufe) == 1 and logbuch(root) == lb, erg2)
        # nächster Tag, ruhig: Haiku allein
        morgen = JETZT + timedelta(days=1)
        f2 = Fake()
        erg3 = KC.lauf(ENV, root, f2, morgen, reihen(morgen), "x")
        e3 = logbuch(root)["entscheide"][-1]
        pruefe("Folgetag ohne Bewegung: Haiku entscheidet allein (eine Anfrage, Stufe haiku, kein Ersatzmodell)",
               erg3["status"] == "neu" and f2.modelle == [HAIKU] and e3["stufe"] == "haiku" and "fallbacks" not in f2.aufrufe[0]
               and len(logbuch(root)["entscheide"]) == 2, (erg3, e3))
        # übernächster Tag: Haiku will stark verschieben → Opus entscheidet, beide Anfragen stehen in den Kosten
        ueber = JETZT + timedelta(days=2)
        f3 = Fake({HAIKU: {**ANTWORT, "btc": {**ANTWORT["btc"], "position": -0.5}}})
        erg4 = KC.lauf(ENV, root, f3, ueber, reihen(ueber), "x")
        e4 = logbuch(root)["entscheide"][-1]
        pruefe("Will Haiku eine Position stark verschieben, entscheidet Opus (zwei Anfragen, Kosten beider: 0,01435 USD)",
               erg4["status"] == "neu" and f3.modelle == [HAIKU, OPUS] and e4["stufe"] == "opus" and e4["eskaliert"]["von"] == HAIKU
               and abs(e4["kosten_usd"] - 0.01435) < 1e-9, (erg4, e4))


def test_grenzen():
    voll = {"version": 1, "summen": {}, "zeilen": [], "tage": {MONATSANFANG.isoformat(): {"n": 40, "usd": 1.75}, HEUTE: {"n": 1, "usd": 1.25}}}
    if MONATSANFANG.isoformat() == HEUTE:   # am Monatsersten gibt es nur einen Tag: die ganze Summe steht dort
        voll["tage"] = {HEUTE: {"n": 1, "usd": 3.0}}
    with wurzel(kosten=voll) as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Monatskosten 3,00 USD bei Grenze 3: übersprungen, keine Anfrage", erg["status"] == "kostengrenze" and not f.aufrufe and "3.00 von 3.00" in erg["text"], erg)
        erg = KC.lauf({**ENV, "KI_CLOUD_MAX_USD_MONAT": "10"}, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Grenze per Umgebung auf 10 USD: der Lauf fragt", erg["status"] == "neu" and len(f.aufrufe) == 1, erg)
    knapp = {"version": 1, "summen": {}, "zeilen": [], "tage": {HEUTE: {"n": 1, "usd": 2.99}}}
    with wurzel(kosten=knapp) as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Monatskosten 2,99 USD: knapp unter der Grenze, der Lauf fragt", erg["status"] == "neu" and len(f.aufrufe) == 1, erg)
    alt = {"version": 1, "summen": {}, "zeilen": [], "tage": {VORMONAT: {"n": 900, "usd": 99.0}}}
    with wurzel(kosten=alt) as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Kosten des Vormonats zählen nicht zur Grenze dieses Monats", erg["status"] == "neu" and len(f.aufrufe) == 1, erg)
    for name, wert in (("leer", ""), ("unlesbar", "abc"), ("null", "0"), ("negativ", "-5"), ("unendlich", "inf")):
        pruefe(f"Grenze {name}: es gilt die Vorgabe 3 USD", KC.grenze_usd({"KI_CLOUD_MAX_USD_MONAT": wert}) == 3.0)
    pruefe("Grenze mit Komma («2,5») wird gelesen", KC.grenze_usd({"KI_CLOUD_MAX_USD_MONAT": "2,5"}) == 2.5)
    viele = {"version": 1, "summen": {}, "zeilen": [], "tage": {HEUTE: {"n": 4, "usd": 0.05}}}
    with wurzel(kosten=viele) as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Heute schon 4 Anfragen gebucht: übersprungen, keine Anfrage", erg["status"] == "tagesgrenze" and not f.aufrufe and "4 Anfragen" in erg["text"], erg)
        erg = KC.lauf({**ENV, "KI_CLOUD_MAX_ANFRAGEN_TAG": "9"}, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Tagesgrenze per Umgebung auf 9: der Lauf fragt", erg["status"] == "neu" and len(f.aufrufe) == 1, erg)
    drei = {"version": 1, "summen": {}, "zeilen": [], "tage": {HEUTE: {"n": 3, "usd": 0.05}}}
    with wurzel(kosten=drei) as root:
        f = Fake()
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        pruefe("Heute 3 Anfragen gebucht: unter der Grenze, der Lauf fragt", erg["status"] == "neu" and len(f.aufrufe) == 1, erg)
    pruefe("Ein kaputtes Kostenbuch zählt als leer (Monat 0, heute 0)",
           KC.monat_usd({"tage": {HEUTE: "kaputt", "x": None}}, JETZT) == 0.0 and KC.anfragen_heute({"tage": {HEUTE: "kaputt"}}, JETZT) == 0)


def test_fehler_und_geheimnis():
    with wurzel() as root:
        f = Fake(fehler=ConnectionError(f"Verbindung weg, Kopfzeile x-api-key: {GEHEIM}"))
        erg = KC.lauf(ENV, root, f, JETZT, reihen(JETZT), "x")
        lb = logbuch(root)
        pruefe("Scheitert die Anfrage: Ausgang «fehler», kein Eintrag, der Grund steht im Logbuch",
               erg["status"] == "fehler" and lb["entscheide"] == [] and "nicht erreichbar" in lb["letzter_fehler"]["hinweis"], (erg, lb))
        pruefe("Der Schlüssel steht weder im Text noch im Logbuch (es liegt im Repo)",
               GEHEIM not in erg["text"] and GEHEIM not in json.dumps(lb) and "***" in lb["letzter_fehler"]["hinweis"], (erg, lb))
        pruefe("Eine gescheiterte Anfrage kostet nichts (kein Kostenbuch oder Summe 0)", KC.monat_usd(kostenbuch(root) or {}, JETZT) == 0.0)
        aus = io.StringIO()
        ziel = root / "zusammenfassung.md"
        with contextlib.redirect_stdout(aus):
            KC.melden(erg, {**ENV, "GITHUB_STEP_SUMMARY": str(ziel)})
        pruefe("Ein Fehler steht als Warnung im Lauf und in der Zusammenfassung, ohne Schlüssel",
               "::warning::KI-Trader (Cloud): keine Einschätzung" in aus.getvalue() and "fehler" in ziel.read_text(encoding="utf-8")
               and GEHEIM not in aus.getvalue() + ziel.read_text(encoding="utf-8"), aus.getvalue())
        f_ok = Fake()
        erg_ok = KC.lauf(ENV, root, f_ok, JETZT, reihen(JETZT), "x")
        pruefe("Nach einem Fehlversuch klappt der nächste Lauf: Eintrag da, der Fehlvermerk ist weg",
               erg_ok["status"] == "neu" and "letzter_fehler" not in logbuch(root) and len(logbuch(root)["entscheide"]) == 1, erg_ok)
        aus = io.StringIO()
        with contextlib.redirect_stdout(aus):
            KC.melden(erg_ok, {})
        pruefe("Ein guter Lauf erzeugt keine Warnung", "::warning::" not in aus.getvalue() and "BTC LONG" in aus.getvalue(), aus.getvalue())
    pruefe("ohne_geheimnis ersetzt den Schlüssel, lässt Text ohne Schlüssel gleich und ersetzt nie einen leeren oder winzigen Wert",
           KC.ohne_geheimnis(f"a {GEHEIM} b", ENV) == "a *** b" and KC.ohne_geheimnis("a b", ENV) == "a b"
           and KC.ohne_geheimnis("abc", {"ANTHROPIC_API_KEY": ""}) == "abc" and KC.ohne_geheimnis("abc", {"ANTHROPIC_API_KEY": "b"}) == "abc")


def test_pilot_vergleich():
    r = reihen(JETZT, schritt=0.01)   # steigender Markt: wer long ist, gewinnt
    erster = r["btc"][-1][0]
    pilot = {"tage": [{"stand": (JETZT.date() - timedelta(days=5)).isoformat(), "maerkte": {"BTC": {"kurs": 1.0, "hebel": 1.0}, "ETH": {"kurs": 1.0, "hebel": 1.0}}}]}
    pruefe("Pilot aus dem Schattenbuch: je Markt ein Entscheid mit Stand, Markt und Hebel",
           sorted((e["markt"], e["hebel"]) for e in _pilot_aus_dict(pilot)) == [("BTC", 1.0), ("ETH", 1.0)])
    with wurzel(pilot=pilot) as root:
        KC.lauf(ENV, root, Fake(), JETZT, r, "x")
        morgen = JETZT + timedelta(days=1)
        r2 = {c: r[c] + [(JETZT.date().isoformat(), r[c][-1][1] * 1.01)] for c in r}
        f = Fake({HAIKU: ANTWORT, OPUS: ANTWORT})
        erg = KC.lauf(ENV, root, f, morgen, r2, "x")
        pruefe("Nach zwei Tagen zeigt der Text den Vergleich nach Gebühr und Funding: Claude (halb long in Bitcoin) +0,2 %, Pilot (voll long) und Halten +0,9 %",
               erg["status"] == "neu" and f"Seit {erster}:" in erg["text"] and "Pilot +0.9 %" in erg["text"] and "Halten +0.9 %" in erg["text"]
               and "Claude +0.2 %" in erg["text"], erg["text"])
    with wurzel() as root:   # ohne Schattenbuch des Piloten: er steht flach im Vergleich
        KC.lauf(ENV, root, Fake(), JETZT, r, "x")
        erg = KC.lauf(ENV, root, Fake(), JETZT + timedelta(days=1), r2, "x")
        pruefe("Ohne Schattenbuch des Piloten steht er flach im Vergleich (+0,0 %), der Lauf klappt trotzdem",
               erg["status"] == "neu" and "Pilot +0.0 %" in erg["text"] and "Halten +0.9 %" in erg["text"], erg["text"])
    with wurzel() as root:
        pruefe("Fehlt das Schattenbuch des Piloten oder ist es kaputt: leere Liste, kein Absturz",
               KC.pilot_aus_schatten(root / KC.PILOT_SCHATTEN) == [] and _pilot_aus_dict({"tage": [{"stand": "x"}, {"maerkte": {"BTC": {}}}]}) == [])


def test_keine_handy_nachricht():
    rufe = []
    attrappe = SimpleNamespace(push=lambda t: rufe.append(t))
    morgen = JETZT + timedelta(days=1)
    with wurzel() as root, mock.patch.dict(sys.modules, {"signale": attrappe}):
        KC.lauf(ENV, root, Fake(), JETZT, reihen(JETZT), "x")
        KC.lauf(ENV, root, Fake(fehler=ConnectionError("weg")), morgen, reihen(morgen), "x")
    pruefe("Der Cloud-Lauf schickt keine Handy-Nachricht, weder bei einer Einschätzung noch bei einem Fehler", rufe == [], rufe)


def test_stand_und_main():
    with wurzel() as root:
        KC.lauf(ENV, root, Fake(), JETZT, reihen(JETZT), "x")
        t = KC.stand(root)
        pruefe("--stand: letzte Einschätzung, Monatskosten, Freigabe ja; keine Anfrage nötig", "BTC LONG 0.50" in t and "0.01 USD" in t and "Freigabe: ja" in t, t)
    with wurzel(frei=False) as root:
        pruefe("--stand ohne Logbuch und ohne Freigabe: Hinweis statt Absturz", "noch keine Einschätzung" in KC.stand(root) and "Freigabe: nein" in KC.stand(root))
    echt = KC.lauf
    try:
        KC.lauf = lambda: {"status": "liegt-vor", "text": "KI-Trader (Cloud): die Einschätzung liegt schon vor."}
        aus = io.StringIO()
        with contextlib.redirect_stdout(aus), mock.patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": ""}):
            code = KC.main(["--lauf"])
        pruefe("main --lauf: Exit 0 bei «liegt schon vor», Text gedruckt, keine Warnung", code == 0 and "liegt schon vor" in aus.getvalue() and "::warning::" not in aus.getvalue(), aus.getvalue())

        def kaputt():
            raise RuntimeError(f"unerwartet {GEHEIM}")
        KC.lauf = kaputt
        aus = io.StringIO()
        with contextlib.redirect_stdout(aus), mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": GEHEIM}):
            code = KC.main(["--lauf"])
        pruefe("main --lauf: ein Programmfehler gibt Exit 1 und eine Fehlerzeile ohne Schlüssel",
               code == 1 and "::error::KI-Trader (Cloud): Programmfehler: RuntimeError" in aus.getvalue() and GEHEIM not in aus.getvalue(), aus.getvalue())
    finally:
        KC.lauf = echt
    aus = io.StringIO()
    with contextlib.redirect_stdout(aus):
        code = KC.main([])
    pruefe("main ohne Schalter: Hilfe, Exit 0", code == 0 and "--lauf" in aus.getvalue())


def main():
    echte = [KT.LOGBUCH, KT.KOSTEN_BUCH, KC.ROOT / KC.ORDNER / "ki-trader.json", KC.ROOT / KC.ORDNER / KT.KOSTEN_BUCH.name]
    vorher = [p.read_bytes() if p.exists() else None for p in echte]
    for t in (test_schalter_und_schluessel, test_kurse_alt, test_erster_lauf_und_wiederholung, test_grenzen, test_fehler_und_geheimnis,
              test_pilot_vergleich, test_keine_handy_nachricht, test_stand_und_main):
        t()
    pruefe("Die echten Logbücher (PC und Cloud) im Repo bleiben vom Test unberührt", vorher == [p.read_bytes() if p.exists() else None for p in echte])
    pruefe("Die Vorgaben stehen fest: 3 USD je Monat, 4 Anfragen je Tag, Kurse höchstens 2 Tage alt, Freigabedatei unter docs/, eigener Ordner data/ki-cloud",
           (KC.MAX_USD_MONAT, KC.MAX_ANFRAGEN_TAG, KC.MAX_KURS_ALTER_TAGE, KC.FREIGABE.as_posix(), KC.ORDNER.as_posix())
           == (3.0, 4, 2, "docs/KI-TRADER-CLOUD-FREI.txt", "data/ki-cloud"))
    if FEHLER:
        print(f"\n{len(FEHLER)} von {GEPRUEFT[0]} Prüfungen FEHLGESCHLAGEN")
        return 1
    print(f"ki_trader_cloud: {GEPRUEFT[0]} Prüfungen bestanden")
    return 0


def _pilot_aus_dict(lb):
    """pilot_aus_schatten über eine Temp-Datei (die Funktion liest einen Pfad)."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "p.json"
        p.write_text(json.dumps(lb), encoding="utf-8")
        return KC.pilot_aus_schatten(p)


if __name__ == "__main__":
    raise SystemExit(main())
