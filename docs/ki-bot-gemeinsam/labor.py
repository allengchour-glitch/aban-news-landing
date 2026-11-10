#!/usr/bin/env python3
"""Offline-Prototyp: Trend-Konsens gegen feste Vergleiche; keine Broker-Anbindung."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
from collections import deque
from datetime import date, datetime, timezone
from pathlib import Path
from statistics import stdev

ROOT = Path(__file__).resolve().parents[2]
PROTOKOLL = {
    "version": 5,
    "markt": "BTC-USD, Spot, Long/Cash, kein Hebel",
    "trend_tage": [150, 200],
    "vol_tage": 30,
    "vol_ziel": 0.25,
    "handelsband": 0.10,
    "signal_verzoegerung_tage": 2,
    "historische_teilperioden": [["2022-01-01", "2024-01-01"], ["2024-01-01", None]],
    "kostenmodell": "Pauschale Forschungsszenarien, keine gemessenen Brokergebühren",
    "kosten_szenarien_bp": {
        "basis": {"gebuehr": 10, "halber_spread": 5, "schlupf": 5},
        "stress": {"gebuehr": 25, "halber_spread": 10, "schlupf": 15},
        "extrem": {"gebuehr": 50, "halber_spread": 25, "schlupf": 25},
    },
    "vorwaertstest_mindesttage": 180,
    "numerik_grenzen": {"kurs_min": 1e-12, "kurs_max": 1e12, "sprung_faktor_max": 1e6},
}


def laden(path):
    raw = path.read_bytes()
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) < 400:
        raise ValueError("Mindestens 400 Tageskurse erforderlich")
    tage, preise = [], []
    for row in rows:
        if not isinstance(row, list) or len(row) != 2 or not isinstance(row[0], str):
            raise ValueError("Erwartet wird je Zeile [ISO-Datum, Schlusskurs]")
        tag = date.fromisoformat(row[0])
        if tag.isoformat() != row[0]:
            raise ValueError("Datum muss YYYY-MM-DD entsprechen")
        kurs = row[1]
        if isinstance(kurs, bool) or not isinstance(kurs, (int, float)) or not math.isfinite(kurs) or kurs <= 0:
            raise ValueError("Kurse müssen endlich und positiv sein")
        if tage and (tag - tage[-1]).days != 1:
            raise ValueError("Bitcoin-Tagesreihe hat Lücken, doppelte oder unsortierte Tage")
        tage.append(tag)
        preise.append(float(kurs))
    return tage, preise, hashlib.sha256(raw).hexdigest()


class SignalStrom:
    """Erhält genau einen bereits abgeschlossenen Kurs pro Schritt, keine Zukunftsreihe.

    Begrenzte Historie und feste Konfiguration je Instanz. Kein Broker, keine
    externe Datenquelle und keine Behauptung eines Python-Sicherheits-Sandkastens.
    """
    namen = ("Halten", "Trend 200", "Halten Risiko 25", "Trend 150 Risiko 25",
             "Trend 200 Risiko 25", "Konsens 150/200")

    def __init__(self):
        self.kurz, self.lang = PROTOKOLL["trend_tage"]
        self.fenster = PROTOKOLL["vol_tage"]
        self.ziel = PROTOKOLL["vol_ziel"]
        g = PROTOKOLL["numerik_grenzen"]
        self.kurs_min, self.kurs_max, self.sprung_max = g["kurs_min"], g["kurs_max"], g["sprung_faktor_max"]
        if (any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x)
                for x in (self.kurs_min, self.kurs_max, self.sprung_max))
                or not 1e-12 <= self.kurs_min <= self.kurs_max <= 1e12
                or not 1 < self.sprung_max <= 1e6):
            raise ValueError("Ungültige numerische Kursgrenzen")
        if any(isinstance(n, bool) or not isinstance(n, int) or n < 2
               for n in (self.kurz, self.lang, self.fenster)):
            raise ValueError("Indikatorfenster müssen ganze Zahlen ab 2 sein")
        if (isinstance(self.ziel, bool) or not isinstance(self.ziel, (int, float))
                or not math.isfinite(self.ziel) or not 0 < self.ziel <= 1):
            raise ValueError("Ungültiges Schwankungsziel")
        self._historie = deque(maxlen=max(self.kurz, self.lang, self.fenster + 1))
        self.anzahl = 0

    def schritt(self, kurs):
        if isinstance(kurs, bool) or not isinstance(kurs, (int, float)):
            raise ValueError("Kurs muss endlich und positiv sein")
        try:
            kurs = float(kurs)
        except OverflowError as e:
            raise ValueError("Kurs ist numerisch nicht darstellbar") from e
        if not math.isfinite(kurs) or not self.kurs_min <= kurs <= self.kurs_max:
            raise ValueError("Kurs ausserhalb des dokumentierten numerischen Bereichs")
        if self._historie and not 1 / self.sprung_max <= kurs / self._historie[-1] <= self.sprung_max:
            raise ValueError("Unplausibler Kurssprung; Datenquelle prüfen")
        # Erst auf einer Kopie rechnen. Auch unerwartete Rechenfehler dürfen
        # weder Historie noch Zähler des weiterverwendbaren Stroms ändern.
        kandidat = deque(self._historie, maxlen=self._historie.maxlen)
        kandidat.append(kurs)
        anzahl = self.anzahl + 1
        out = self._quoten(list(kandidat), anzahl, kurs)
        if (set(out) != set(self.namen) or any(isinstance(q, bool) or not isinstance(q, (int, float))
                or not math.isfinite(q) or not 0 <= q <= 1 for q in out.values())):
            raise ValueError("Ungültiges Rechenergebnis")
        self._historie, self.anzahl = kandidat, anzahl
        return out

    def _quoten(self, p, anzahl, kurs):
        out = dict.fromkeys(self.namen, 0.0)
        out["Halten"] = 1.0
        if anzahl <= max(self.lang - 1, self.kurz - 1, self.fenster):
            return out
        ma200 = sum(p[-self.lang:]) / self.lang
        ma150 = sum(p[-self.kurz:]) / self.kurz
        r = [p[j] / p[j - 1] - 1 for j in range(len(p) - self.fenster, len(p))]
        vol = stdev(r) * math.sqrt(365)
        if not math.isfinite(vol):
            raise ValueError("Schwankung numerisch nicht auswertbar")
        q = min(1.0, self.ziel / vol) if vol > 0 else 0.0
        out.update({"Trend 200": float(kurs > ma200), "Halten Risiko 25": q,
                    "Trend 150 Risiko 25": q if kurs > ma150 else 0.0,
                    "Trend 200 Risiko 25": q if kurs > ma200 else 0.0,
                    "Konsens 150/200": q if kurs > ma150 and kurs > ma200 else 0.0})
        return out


def signale(p):
    """Batch-Adapter über denselben schrittweisen Kern, auch für einmalige Iteratoren."""
    strom = SignalStrom()
    out = {name: [] for name in strom.namen}
    for kurs in p:
        for name, quote in strom.schritt(kurs).items():
            out[name].append(quote)
    return out


def datenalter(tage, stichtag):
    """Tageskerzen gelten frühestens am folgenden UTC-Tag als abgeschlossen."""
    alter = (stichtag - tage[-1]).days
    return {"stichtag_utc": str(stichtag), "alter_tage": alter,
            "abgeschlossen": alter >= 1, "aktuell": 1 <= alter <= 2,
            "befund": "aktuell" if 1 <= alter <= 2 else
                      "Kerze nicht abgeschlossen oder aus der Zukunft" if alter < 1 else
                      "Historische Daten: keine aktuelle Signalentscheidung möglich"}


def signalpruefung(p, erzeuger=signale, streng=True):
    """Streng: jedes Präfix prüfen (quadratischer Aufwand). Sonst nur Stichproben.

    Der CLI-Kurslauf nutzt ausschliesslich eingebaute, separat nachgerechnete
    Strategien und kennzeichnet seine schnellere Stichprobe ausdrücklich.
    """
    voll = erzeuger(p)
    fehler = []
    for name, q in voll.items():
        if len(q) != len(p) or any(isinstance(x, bool) or not isinstance(x, (int, float))
                                  or not math.isfinite(x) or not 0 <= x <= 1 for x in q):
            fehler.append(f"{name}: ungültige Positionsreihe")
    if fehler:
        return {"bestanden": False, "fehler": fehler}
    enden = range(1, len(p)) if streng else sorted({250, min(400, len(p) - 1), len(p) - 1})
    for ende in enden:
        if ende < 1 or ende >= len(p):
            continue
        teil = erzeuger(p[:ende])
        if set(teil) != set(voll):
            fehler.append("Strategien wechseln mit der Historienlänge")
            continue
        for name, q in voll.items():
            if teil[name] != q[:ende]:
                fehler.append(f"{name}: Zukunftswissen bei Präfix {ende}")
        if fehler:
            break
    for laenge in (250, 400, 1000):
        if len(p) <= laenge:
            continue
        teil = erzeuger(p[-laenge:])
        if set(teil) != set(voll):
            fehler.append("Strategien wechseln bei verkürzter Vorgeschichte")
            continue
        for name, q in voll.items():
            if not teil[name] or abs(teil[name][-1] - q[-1]) > 1e-12:
                fehler.append(f"{name}: abweichendes Live-Signal bei {laenge} Kerzen")
    return {"bestanden": not fehler, "fehler": fehler,
            "modus": "alle_praefixe" if streng else "stichprobe",
            "grenze": "Prüft diese Kursreihe und Historien; kein allgemeiner Beweis oder Schutz gegen externe Datenlecks"}


def simulieren(p, ziel, kosten, start=201, band=0.0):
    """Start mit Cash. Erst Schlusskurs t+1 handeln, nachdem Signal t bekannt war.

    Der so gehaltene Bestand verdient erstmals die Rendite t+1→t+2. Cash
    verzinst sich nicht. Position driftet mit dem Kurs; Kosten belasten echtes
    Umschichtungsvolumen. Letzter Bestand wird gegen Kosten liquidiert.
    """
    if (len(p) != len(ziel) or not isinstance(start, int) or isinstance(start, bool)
            or not 1 <= start < len(p)):
        raise ValueError("Kurs-/Signalreihe oder Messbeginn ungültig")
    for reihe, obergrenze in ((p, None), (ziel, 1)):
        if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x)
               or (x <= 0 if obergrenze is None else not 0 <= x <= obergrenze) for x in reihe):
            raise ValueError("Ungültige Kurse oder Quoten; nur Long/Cash ohne Hebel")
    if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x)
           or not 0 <= x < 1 for x in (kosten, band)):
        raise ValueError("Kosten und Handelsband müssen endlich und zwischen 0 und 1 liegen")
    verzoegerung = PROTOKOLL["signal_verzoegerung_tage"]
    if isinstance(verzoegerung, bool) or not isinstance(verzoegerung, int) or verzoegerung < 2:
        raise ValueError("Signalverzögerung muss mindestens zwei Tagesabschnitte betragen")
    cash, bestand, werte, umsatz = 1.0, 0.0, [1.0], 0.0
    renditen, exposure, gebuehren, auftraege = [], [], 0.0, 0
    for i in range(start, len(p)):
        vorher = cash + bestand
        exposure.append(bestand / vorher)
        bestand *= p[i] / p[i - 1]
        kapital = cash + bestand
        signal_tag = i - verzoegerung + 1
        quote = ziel[signal_tag] if signal_tag >= 0 else 0.0
        if quote == 0 or abs(quote - bestand / kapital) >= band:
            # Kosten für den Handel sind Teil der Zielgewichts-Gleichung.
            neu = quote * (kapital + kosten * bestand) / (1 + quote * kosten)
            if neu < bestand:
                neu = quote * (kapital - kosten * bestand) / (1 - quote * kosten)
            volumen = abs(neu - bestand)
            cash = kapital - neu - kosten * volumen
            gebuehren += kosten * volumen
            auftraege += int(volumen > 1e-12)
            bestand = neu
            umsatz += volumen
        werte.append(cash + bestand)
        renditen.append(werte[-1] / vorher - 1)
    schlusskosten = kosten * bestand
    werte[-1] -= schlusskosten
    gebuehren += schlusskosten
    auftraege += int(bestand > 1e-12)
    renditen[-1] = werte[-1] / werte[-2] - 1
    umsatz += bestand
    hoch, dd, dauer, laengste = 1.0, 0.0, 0, 0
    for w in werte:
        hoch = max(hoch, w)
        dd = min(dd, w / hoch - 1)
        dauer = dauer + 1 if w < hoch - 1e-12 else 0
        laengste = max(laengste, dauer)
    return {"rendite": werte[-1] - 1, "max_einbruch": dd,
            "umsatz_pro_startkapital": umsatz, "mess_tage": len(werte) - 1,
            "kosten_pro_startkapital": gebuehren, "auftraege": auftraege,
            "exposure_schnitt": sum(exposure) / len(exposure),
            "vol_realisiert": stdev(renditen) * math.sqrt(365) if len(renditen) > 1 else 0.0,
            "laengste_unterwasserphase_tage": laengste,
            "noch_nicht_erholt": werte[-1] < hoch - 1e-12}


def auswerten(tage, p):
    qs = signale(p)
    out = {}
    minimum = PROTOKOLL["vorwaertstest_mindesttage"]
    if isinstance(minimum, bool) or not isinstance(minimum, int) or minimum < 1:
        raise ValueError("Mindestlänge muss eine positive ganze Tageszahl sein")
    for beginn, ende in PROTOKOLL["historische_teilperioden"]:
        start = next((i for i, d in enumerate(tage) if d.isoformat() >= beginn), len(p))
        stop = next((i for i, d in enumerate(tage) if ende and d.isoformat() >= ende), len(p))
        if start < 201 or stop - start < minimum:
            continue
        out[beginn] = {"von": str(tage[start]), "bis": str(tage[stop - 1]), "szenarien": {}}
        for szenario, teile in PROTOKOLL["kosten_szenarien_bp"].items():
            out[beginn]["szenarien"][szenario] = {
                name: simulieren(p[:stop], q[:stop], sum(teile.values()) / 10000, start,
                                 PROTOKOLL["handelsband"] if name != "Halten" and name != "Trend 200" else 0.0)
                for name, q in qs.items()
            }
    return out


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--daten", type=Path, default=ROOT / "tools/trading/daten/BTC-USD.json")
    a.add_argument("--ausgabe", type=Path, required=True, help="Neue Ergebnisdatei; bestehende werden nicht überschrieben")
    a.add_argument("--stichtag", type=date.fromisoformat,
                   default=datetime.now(timezone.utc).date(), help="UTC-Stichtag für Datenalter")
    a.add_argument("--nachrichten", type=Path, help="Optionale Offline-News mit Zeitstempeln und Modellwerten")
    a.add_argument("--entscheidungszeit", help="ISO-Zeit mit Zeitzone; nur zusammen mit --nachrichten")
    args = a.parse_args()
    if bool(args.nachrichten) != bool(args.entscheidungszeit):
        a.error("--nachrichten und --entscheidungszeit müssen zusammen angegeben werden")
    tage, p, datenhash = laden(args.daten)
    qualitaet = datenalter(tage, args.stichtag)
    if not qualitaet["abgeschlossen"]:
        raise ValueError(qualitaet["befund"])
    pruefung = signalpruefung(p, streng=False)
    if not pruefung["bestanden"]:
        raise ValueError("Signalprüfung fehlgeschlagen: " + "; ".join(pruefung["fehler"]))
    protokollhash = hashlib.sha256(json.dumps(PROTOKOLL, sort_keys=True).encode()).hexdigest()
    result = {"status": "FORSCHUNG, KEINE HANDELSFREIGABE", "protokoll": PROTOKOLL,
              "python_version": platform.python_version(),
              "protokoll_sha256": protokollhash, "daten_sha256": datenhash,
              "code_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "daten_von": str(tage[0]), "daten_bis": str(tage[-1]),
              "datenqualitaet": qualitaet, "signalpruefung": pruefung,
              "handelsfreigabe": False,
              "historischer_signalbeleg": {
                  "stand": str(tage[-1]), "schlusskurs": p[-1],
                  "zielquoten": {n: q[-1] for n, q in signale(p).items()},
                  "warnung": "Historischer Rechenstand, kein Brokerauftrag oder aktuelles Handelssignal"},
              "hinweis": "Bekannte historische Daten, kein unabhängiger Holdout. Schlusskurs-Modell ohne Intraday-Ausführung; kein Funding, Spread in pauschalen Kosten, kein Börsenausfall. Kein KI-Nachweis.",
              "ergebnisse": auswerten(tage, p)}
    if not result["ergebnisse"]:
        raise ValueError("Keine ausreichend lange vorab festgelegte Teilperiode vorhanden")
    if args.nachrichten:
        from nachrichten import pruefen, zeit
        entscheidung = zeit(args.entscheidungszeit)
        if entscheidung.date() > args.stichtag:
            raise ValueError("Nachrichten-Entscheidungszeit liegt nach dem gewählten Stichtag")
        raw = args.nachrichten.read_bytes()
        result["nachrichten_pruefung"] = pruefen(json.loads(raw), args.entscheidungszeit, "BTC-USD")
        result["nachrichten_sha256"] = hashlib.sha256(raw).hexdigest()
        result["nachrichten_code_sha256"] = hashlib.sha256(
            Path(__file__).with_name("nachrichten.py").read_bytes()).hexdigest()
        result["nachrichten_strategiewirkung"] = "Keine: separater Datencheck, nicht rückwirkend in Kurssignale eingemischt"
    fingerabdruck = {
        "code": result["code_sha256"], "daten": datenhash,
        "protokoll": protokollhash, "stichtag": str(args.stichtag),
    }
    if args.nachrichten:
        fingerabdruck.update(nachrichten=result["nachrichten_sha256"],
                            nachrichten_code=result["nachrichten_code_sha256"],
                            entscheidungszeit=args.entscheidungszeit)
    result["versuch_id"] = hashlib.sha256(json.dumps(fingerabdruck, sort_keys=True).encode()).hexdigest()
    payload = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    with args.ausgabe.open("x", encoding="utf-8") as f:
        f.write(payload)
    print(f"Historischer Forschungsbericht: {args.ausgabe}; Daten bis {tage[-1]}")


if __name__ == "__main__":
    main()
