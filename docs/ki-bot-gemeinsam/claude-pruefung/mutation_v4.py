#!/usr/bin/env python3
"""Mutationsprobe für die Streaming-Fassung (Protokollversion 4) von docs/ki-bot-gemeinsam/labor.py.

Jeder Mutant ändert genau eine Stelle von labor.py in einer Kopie des Ordners; erkannt = mindestens ein Test der
gemeinsamen Reihe `test_labor*.py` (wie im CI) wird rot. Ausgangslage wird zuerst grün geprüft. Läuft parallel (4 Prozesse),
schreibt nichts ins Repository. Aufruf:  python3 mutation_v4.py [--seriell]
"""
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASIS = Path(__file__).resolve().parents[1]   # docs/ki-bot-gemeinsam
WURZEL = BASIS.parents[1]
ORIG = (BASIS / 'labor.py').read_text(encoding='utf-8')
PARALLEL = 1 if '--seriell' in sys.argv else 4

VALID_ALT = '''        if (isinstance(kurs, bool) or not isinstance(kurs, (int, float))
                or not math.isfinite(kurs) or kurs <= 0):
            raise ValueError("Kurs muss endlich und positiv sein")
        self._historie.append(float(kurs))
        self.anzahl += 1
'''
VALID_NEU_ZUERST_ZUSTAND = '''        self._historie.append(float(kurs))
        self.anzahl += 1
        if (isinstance(kurs, bool) or not isinstance(kurs, (int, float))
                or not math.isfinite(kurs) or kurs <= 0):
            raise ValueError("Kurs muss endlich und positiv sein")
'''

MUTANTEN = [
    # --- SignalStrom
    ('S01 Aufwärmphase einen Kurs kürzer', 'if self.anzahl <= max(self.lang - 1, self.kurz - 1, self.fenster):', 'if self.anzahl < max(self.lang - 1, self.kurz - 1, self.fenster):'),
    ('S02 Aufwärmphase einen Kurs länger', 'if self.anzahl <= max(self.lang - 1, self.kurz - 1, self.fenster):', 'if self.anzahl <= max(self.lang, self.kurz - 1, self.fenster):'),
    ('S03 MA200 ohne heutigen Kurs', 'ma200 = sum(p[-self.lang:]) / self.lang', 'ma200 = sum(p[-self.lang - 1:-1]) / self.lang'),
    ('S04 MA150 rechnet mit dem 200er Fenster', 'ma150 = sum(p[-self.kurz:]) / self.kurz', 'ma150 = sum(p[-self.lang:]) / self.lang'),
    ('S05 Volatilitätsfenster um einen Tag verschoben', 'for j in range(len(p) - self.fenster, len(p))]', 'for j in range(len(p) - self.fenster - 1, len(p) - 1)]'),
    ('S06 Annualisierung 252 statt 365', 'vol = stdev(r) * math.sqrt(365)', 'vol = stdev(r) * math.sqrt(252)'),
    ('S07 Risikoquote ohne Obergrenze (Hebel)', 'q = min(1.0, self.ziel / vol) if vol > 0 else 0.0', 'q = self.ziel / vol if vol > 0 else 0.0'),
    ('S08 Konsens braucht nur eine Bedingung', 'q if kurs > ma150 and kurs > ma200 else 0.0})', 'q if kurs > ma150 or kurs > ma200 else 0.0})'),
    ('S09 Trend 200: >= statt >', '"Trend 200": float(kurs > ma200)', '"Trend 200": float(kurs >= ma200)'),
    ('S10 Trend 200 nutzt MA150', '"Trend 200": float(kurs > ma200)', '"Trend 200": float(kurs > ma150)'),
    ('S11 Trend 150 Risiko nutzt MA200', '"Trend 150 Risiko 25": q if kurs > ma150 else 0.0', '"Trend 150 Risiko 25": q if kurs > ma200 else 0.0'),
    ('S12 Trend 200 Risiko nutzt MA150', '"Trend 200 Risiko 25": q if kurs > ma200 else 0.0', '"Trend 200 Risiko 25": q if kurs > ma150 else 0.0'),
    ('S13 Halten ist 0 statt 1', 'out["Halten"] = 1.0', 'out["Halten"] = 0.0'),
    ('S14 Historie unbegrenzt', 'self._historie = deque(maxlen=max(self.kurz, self.lang, self.fenster + 1))', 'self._historie = deque()'),
    ('S15 Historie einen Kurs zu kurz', 'self._historie = deque(maxlen=max(self.kurz, self.lang, self.fenster + 1))', 'self._historie = deque(maxlen=max(self.kurz, self.lang, self.fenster + 1) - 1)'),
    ('S16 Zustand ändert sich vor der Kursprüfung', VALID_ALT, VALID_NEU_ZUERST_ZUSTAND),
    ('S17 Schwankungsziel live aus dem Protokoll gelesen', 'q = min(1.0, self.ziel / vol)', 'q = min(1.0, PROTOKOLL["vol_ziel"] / vol)'),
    ('S18 Trendfenster live aus dem Protokoll gelesen', 'ma200 = sum(p[-self.lang:]) / self.lang', 'ma200 = sum(p[-PROTOKOLL["trend_tage"][1]:]) / PROTOKOLL["trend_tage"][1]'),
    ('S19 Wahrheitswerte als Kurs erlaubt', '        if (isinstance(kurs, bool) or not isinstance(kurs, (int, float))\n                or not math.isfinite(kurs) or kurs <= 0):\n            raise ValueError("Kurs muss endlich und positiv sein")',
     '        if (not isinstance(kurs, (int, float))\n                or not math.isfinite(kurs) or kurs <= 0):\n            raise ValueError("Kurs muss endlich und positiv sein")'),
    ('S20 NaN und unendlich als Kurs erlaubt', '        if (isinstance(kurs, bool) or not isinstance(kurs, (int, float))\n                or not math.isfinite(kurs) or kurs <= 0):\n            raise ValueError("Kurs muss endlich und positiv sein")',
     '        if (isinstance(kurs, bool) or not isinstance(kurs, (int, float))\n                or kurs <= 0):\n            raise ValueError("Kurs muss endlich und positiv sein")'),
    ('S21 Kurs 0 erlaubt', '                or not math.isfinite(kurs) or kurs <= 0):\n            raise ValueError("Kurs muss endlich und positiv sein")', '                or not math.isfinite(kurs) or kurs < 0):\n            raise ValueError("Kurs muss endlich und positiv sein")'),
    ('S22 dasselbe Ausgabe-Dictionary wird wiederverwendet', 'out = dict.fromkeys(self.namen, 0.0)', 'out = self.__dict__.setdefault("_ausgabe", dict.fromkeys(self.namen, 0.0))'),
    ('S23 Populationsstreuung statt Stichprobe', 'vol = stdev(r) * math.sqrt(365)', 'vol = (sum((x - sum(r) / len(r)) ** 2 for x in r) / len(r)) ** 0.5 * math.sqrt(365)'),
    ('S24 logarithmische Renditen', 'r = [p[j] / p[j - 1] - 1 for j', 'r = [math.log(p[j] / p[j - 1]) for j'),
    ('S25 Risikoziel 20 % statt 25 %', '"vol_ziel": 0.25', '"vol_ziel": 0.20'),
    ('S26 Volatilität null: volle Position statt Cash', 'q = min(1.0, self.ziel / vol) if vol > 0 else 0.0', 'q = min(1.0, self.ziel / vol) if vol > 0 else 1.0'),
    ('S27 Schwankungsziel bis 2 erlaubt', 'or not 0 < self.ziel <= 1):', 'or not 0 < self.ziel <= 2):'),
    ('S28 Fenster ab 1 erlaubt', 'for n in (self.kurz, self.lang, self.fenster)):', 'for n in (self.kurz, self.lang, self.fenster) if False):'),
    # --- Prüfungen und Simulation
    ('P01 Signalprüfung standardmässig nur Stichprobe', 'def signalpruefung(p, erzeuger=signale, streng=True):', 'def signalpruefung(p, erzeuger=signale, streng=False):'),
    ('P02 strenge Prüfung überspringt jedes zweite Präfix', 'enden = range(1, len(p)) if streng else', 'enden = range(1, len(p), 2) if streng else'),
    ('P03 Verkürzte-Vorgeschichte-Prüfung nur 1000', 'for laenge in (250, 400, 1000):', 'for laenge in (1000,):'),
    ('P04 Live-Signal-Toleranz riesig', 'abs(teil[name][-1] - q[-1]) > 1e-12', 'abs(teil[name][-1] - q[-1]) > 1.0'),
    ('P05 Ausführung ohne Verzögerung (Signal von heute)', 'signal_tag = i - verzoegerung + 1', 'signal_tag = i - verzoegerung + 2'),
    ('P06 Mindestverzögerung 1 statt 2 erlaubt', 'or verzoegerung < 2:', 'or verzoegerung < 1:'),
    ('P07 Lücken in der Zeitreihe erlaubt', 'if tage and (tag - tage[-1]).days != 1:', 'if tage and (tag - tage[-1]).days < 1:'),
    ('P08 Kerze mit Alter 0 gilt als abgeschlossen', '"abgeschlossen": alter >= 1', '"abgeschlossen": alter >= 0'),
    ('P09 «aktuell» bis 3 Tage', '"aktuell": 1 <= alter <= 2', '"aktuell": 1 <= alter <= 3'),
    ('P10 Handelsband strikt (> statt >=)', 'abs(quote - bestand / kapital) >= band', 'abs(quote - bestand / kapital) > band'),
    ('P11 Handelsband auch für Halten und Trend 200', 'PROTOKOLL["handelsband"] if name != "Halten" and name != "Trend 200" else 0.0', 'PROTOKOLL["handelsband"]'),
    ('P12 Schlussliquidation ohne Kosten', 'schlusskosten = kosten * bestand', 'schlusskosten = 0.0'),
    ('P13 Stress-Gebühr gleich Basis', '"stress": {"gebuehr": 25,', '"stress": {"gebuehr": 10,'),
    ('P14 Handelsfreigabe im Bericht wahr', '"handelsfreigabe": False,', '"handelsfreigabe": True,'),
    ('P15 Berichtsschutz: bestehende Datei überschreiben', 'with args.ausgabe.open("x", encoding="utf-8") as f:', 'with args.ausgabe.open("w", encoding="utf-8") as f:'),
    ('P16 Versuchs-ID ohne Stichtag', '"protokoll": protokollhash, "stichtag": str(args.stichtag),', '"protokoll": protokollhash,'),
    ('P17 Datenhash über leere Bytes', 'return tage, preise, hashlib.sha256(raw).hexdigest()', 'return tage, preise, hashlib.sha256(b"").hexdigest()'),
]


def lauf(quelltext):
    with tempfile.TemporaryDirectory() as d:
        ziel_wurzel = Path(d) / 'w'
        shutil.copytree(BASIS, ziel_wurzel / 'docs' / 'ki-bot-gemeinsam', ignore=shutil.ignore_patterns('__pycache__', 'claude-pruefung'))
        daten = ziel_wurzel / 'tools' / 'trading' / 'daten'
        daten.mkdir(parents=True)
        shutil.copy(WURZEL / 'tools' / 'trading' / 'daten' / 'BTC-USD.json', daten / 'BTC-USD.json')
        (ziel_wurzel / 'docs' / 'ki-bot-gemeinsam' / 'labor.py').write_text(quelltext, encoding='utf-8')
        r = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(ziel_wurzel / 'docs' / 'ki-bot-gemeinsam'), '-p', 'test_labor*.py'],
                           capture_output=True, text=True, timeout=600)
        rot = [z.split(' (')[0].replace('FAIL: ', '').replace('ERROR: ', '') for z in r.stderr.splitlines()
               if z.startswith(('FAIL:', 'ERROR:'))]
        return r.returncode, rot


def einzeln(m):
    name, alt, neu = m
    if ORIG.count(alt) != 1:
        return name, 'na', f'Muster kommt {ORIG.count(alt)}× vor'
    rc, rot = lauf(ORIG.replace(alt, neu))
    return name, ('erkannt' if rc != 0 else 'ueberlebt'), (', '.join(rot[:3]) if rot else '')


def main():
    rc, _ = lauf(ORIG)
    print('Ausgangslage grün:', rc == 0, flush=True)
    if rc != 0:
        return 1
    erkannt, ueberlebt, na = [], [], []
    with ThreadPoolExecutor(max_workers=PARALLEL) as ex:
        for name, status, info in ex.map(einzeln, MUTANTEN):
            marke = {'erkannt': 'ok ', 'ueberlebt': 'LEBT', 'na': '?  '}[status]
            print(f'  {marke} {name}  {info}', flush=True)
            {'erkannt': erkannt, 'ueberlebt': ueberlebt, 'na': na}[status].append(name)
    print(f'\nErkannt {len(erkannt)} von {len(MUTANTEN) - len(na)} anwendbaren; überlebt {len(ueberlebt)}; nicht anwendbar {len(na)}')
    for n in ueberlebt:
        print('  überlebt:', n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
