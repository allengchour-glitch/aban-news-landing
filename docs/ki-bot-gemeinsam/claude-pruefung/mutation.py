#!/usr/bin/env python3
"""Mutationsprobe für Codex' Tests (docs/ki-bot-gemeinsam/test_labor.py): jeder Mutant ändert genau eine Stelle von labor.py
in einer Kopie; der Mutant gilt als erkannt, wenn mindestens ein Test rot wird. Ausgangslage zuerst grün prüfen."""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BASIS = Path(__file__).resolve().parents[1]   # docs/ki-bot-gemeinsam
ORIG = (BASIS / 'labor.py').read_text(encoding='utf-8')
MIT_REGRESSION = '--mit-regression' in sys.argv

MUTANTEN = [
    ('M01 Ausführung ohne Verzögerung (Signal von heute)', 'quote = ziel[i - 1]', 'quote = ziel[i]'),
    ('M02 Exposure immer 0', 'exposure.append(bestand / vorher)', 'exposure.append(0.0)'),
    ('M03 Kursdrift mit falschem Vortag', 'bestand *= p[i] / p[i - 1]', 'bestand *= p[i] / p[max(i - 2, 0)]'),
    ('M04 Verkaufskosten fehlen', 'cash = kapital - neu - kosten * volumen', 'cash = kapital - neu - (kosten * volumen if neu > bestand else 0.0)'),
    ('M05 Schlussliquidation ohne Kosten', 'schlusskosten = kosten * bestand', 'schlusskosten = 0.0'),
    ('M06 Handelsband strikt (> statt >=)', 'abs(quote - bestand / kapital) >= band', 'abs(quote - bestand / kapital) > band'),
    ('M07 Volatilitätsziel ohne Obergrenze (Hebel)', 'q = min(1.0, PROTOKOLL["vol_ziel"] / vol) if vol > 0 else 0.0', 'q = PROTOKOLL["vol_ziel"] / vol if vol > 0 else 0.0'),
    ('M08 MA200 ohne den heutigen Kurs', 'ma200 = sum(p[i - lang + 1:i + 1]) / lang', 'ma200 = sum(p[i - lang:i]) / lang'),
    ('M09 Trend 200: >= statt >', 'out["Trend 200"].append(float(kurs > ma200))', 'out["Trend 200"].append(float(kurs >= ma200))'),
    ('M10 Volatilitätsfenster verschoben', 'for j in range(i - fenster + 1, i + 1)]', 'for j in range(i - fenster, i)]'),
    ('M11 Annualisierung mit 252 statt 365', 'vol = stdev(r) * math.sqrt(365)', 'vol = stdev(r) * math.sqrt(252)'),
    ('M12 Risikoziel 20 % statt 25 %', '"vol_ziel": 0.25', '"vol_ziel": 0.20'),
    ('M13 Handelsband 5 % statt 10 %', '"handelsband": 0.10', '"handelsband": 0.05'),
    ('M14 Band auch für Halten und Trend 200', 'PROTOKOLL["handelsband"] if name != "Halten" and name != "Trend 200" else 0.0', 'PROTOKOLL["handelsband"]'),
    ('M15 Kerze mit Alter 0 gilt als abgeschlossen', '"abgeschlossen": alter >= 1', '"abgeschlossen": alter >= 0'),
    ('M16 «aktuell» bis 3 Tage', '"aktuell": 1 <= alter <= 2', '"aktuell": 1 <= alter <= 3'),
    ('M17 Teilperiode beginnt einen Tag später', 'if d.isoformat() >= beginn), len(p))', 'if d.isoformat() > beginn), len(p))'),
    ('M18 Mindestlänge einer Periode 100 statt 180 Tage', 'stop - start < 180', 'stop - start < 100'),
    ('M19 Signalprüfung nur mit Präfix 250', 'for ende in sorted({250, min(400, len(p) - 1), len(p) - 1}):', 'for ende in sorted({250}):'),
    ('M20 Live-Signal-Toleranz riesig', 'abs(teil[name][-1] - q[-1]) > 1e-12', 'abs(teil[name][-1] - q[-1]) > 1.0'),
    ('M21 Lücken in der Zeitreihe erlaubt', 'if tage and (tag - tage[-1]).days != 1:', 'if tage and (tag - tage[-1]).days < 1:'),
    ('M22 Auftragszähler zählt jede Runde', 'auftraege += int(volumen > 1e-12)', 'auftraege += 1'),
    ('M23 Umsatz ohne Schlusshandel', 'umsatz += bestand\n    hoch,', 'hoch,'),
    ('M24 Stress-Gebühr gleich Basis', '"stress": {"gebuehr": 25,', '"stress": {"gebuehr": 10,'),
    ('M25 Handelsfreigabe im Bericht wahr', '"handelsfreigabe": False,', '"handelsfreigabe": True,'),
    ('M26 Kaufkosten nicht im Zielgewicht', 'neu = quote * (kapital + kosten * bestand) / (1 + quote * kosten)', 'neu = quote * (kapital + kosten * bestand) / (1 + kosten)'),
    ('M27 Konsens braucht nur eine Bedingung', 'out["Konsens 150/200"].append(q if kurs > ma150 and kurs > ma200 else 0.0)', 'out["Konsens 150/200"].append(q if kurs > ma150 or kurs > ma200 else 0.0)'),
    ('M28 Trend 150 nutzt MA200', 'out["Trend 150 Risiko 25"].append(q if kurs > ma150 else 0.0)', 'out["Trend 150 Risiko 25"].append(q if kurs > ma200 else 0.0)'),
    ('M29 Vorwärts-/Vollhistorie: Fenster 1000 statt 250 ohne Prüfung', 'for laenge in (250, 400, 1000):', 'for laenge in (1000,):'),
    ('M30 Berichtsschutz: bestehende Datei überschreiben', 'with args.ausgabe.open("x", encoding="utf-8") as f:', 'with args.ausgabe.open("w", encoding="utf-8") as f:'),
    ('M31 Datenhash über leere Bytes', 'return tage, preise, hashlib.sha256(raw).hexdigest()', 'return tage, preise, hashlib.sha256(b"").hexdigest()'),
    ('M32 Versuchs-ID ohne Stichtag', '"protokoll": protokollhash, "stichtag": str(args.stichtag),', '"protokoll": protokollhash,'),
]


def lauf(quelltext):
    with tempfile.TemporaryDirectory() as d:
        ziel = Path(d) / 'docs' / 'ki-bot-gemeinsam'
        ziel.mkdir(parents=True)
        shutil.copy(BASIS / 'test_labor.py', ziel / 'test_labor.py')
        (ziel / 'labor.py').write_text(quelltext, encoding='utf-8')
        muster = 'test_labor.py'
        if MIT_REGRESSION:
            shutil.copy(BASIS / 'test_labor_regression.py', ziel / 'test_labor_regression.py')
            shutil.copy(BASIS / 'ergebnis-v2.json', ziel / 'ergebnis-v2.json')
            daten = Path(d) / 'tools' / 'trading' / 'daten'
            daten.mkdir(parents=True)
            shutil.copy(BASIS.parents[1] / 'tools/trading/daten/BTC-USD.json', daten / 'BTC-USD.json')
            muster = 'test_labor*.py'
        r = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(ziel), '-p', muster],
                           capture_output=True, text=True, timeout=300)
        rot = [z.split(' (')[0].replace('FAIL: ', '').replace('ERROR: ', '') for z in r.stderr.splitlines()
               if z.startswith(('FAIL:', 'ERROR:'))]
        return r.returncode, rot


def main():
    rc, _ = lauf(ORIG)
    print('Ausgangslage grün:', rc == 0)
    if rc != 0:
        return 1
    erkannt, ueberlebt, na = [], [], []
    for name, alt, neu in MUTANTEN:
        if ORIG.count(alt) != 1:
            na.append(name)
            print(f'  ?   {name}: Muster kommt {ORIG.count(alt)}× vor (nicht anwendbar)')
            continue
        rc, rot = lauf(ORIG.replace(alt, neu))
        if rc != 0:
            erkannt.append(name)
            print(f'  ok  {name}  <- rot: {", ".join(rot[:3]) or "(Fehler beim Laden)"}')
        else:
            ueberlebt.append(name)
            print(f'  ÜBERLEBT {name}')
    print(f'\nErgebnis: {len(erkannt)} erkannt, {len(ueberlebt)} überlebt, {len(na)} nicht anwendbar (von {len(MUTANTEN)})')
    for n in ueberlebt:
        print('  Lücke:', n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
