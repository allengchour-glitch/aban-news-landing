#!/usr/bin/env python3
"""Selbsttest für schneiden.py (lokal; braucht ffmpeg, numpy, scipy; nicht in der CI): python3 dropship/tiktok-cj-videos-0311/schneiden_test.py"""
import json, os, shutil, struct, subprocess, sys, tempfile, wave
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import schneiden as S  # noqa: E402

ok, fehler = 0, []


def ist(c, name):
    global ok
    if c:
        ok += 1
    else:
        fehler.append(name)
        print('✗', name)


def wirft(f, teil, name):
    try:
        f()
    except S.Fehler as e:
        ist(teil in str(e), f'{name}: Meldung enthält «{teil}» (war: {e})')
        return
    except Exception as e:  # noqa
        ist(False, f'{name}: falsche Ausnahme {type(e).__name__}: {e}')
        return
    ist(False, f'{name}: keine Ausnahme')


tmp = tempfile.mkdtemp(prefix='schneiden-test-')


def klick(pfad, bpm, versatz, sek=24, sr=22050):
    x = np.zeros(int(sr * sek), dtype=np.float32)
    per = 60.0 / bpm
    t = versatz
    rng = np.random.default_rng(1)
    while t < sek - 0.2:
        i = int(t * sr)
        n = int(0.08 * sr)
        x[i:i + n] += (rng.standard_normal(n) * np.exp(-np.arange(n) / (0.015 * sr))).astype(np.float32)
        t += per
    x = np.clip(x * 0.8, -1, 1)
    with wave.open(pfad, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype('<i2').tobytes())


# 1. Beat-Analyse auf künstlichen Taktspuren
for bpm, vers in ((120, 0.20), (100, 0.35), (128, 0.10)):
    p = os.path.join(tmp, f'klick{bpm}.wav')
    klick(p, bpm, vers)
    r = S.takt_analyse(p, 0, 22)
    ist(abs(r['bpm'] - bpm) < 3.0, f'Takt {bpm} bpm erkannt (war {r["bpm"]:.1f})')
    per = 60.0 / bpm
    d = min(abs(r['phase'] - vers) % per, per - abs(r['phase'] - vers) % per)
    ist(d < 0.04, f'Phase bei {bpm} bpm stimmt (Abweichung {d:.3f} s)')
    ist(r['sicher'], f'Takt bei {bpm} bpm gilt als sicher (Konfidenz {r["konf"]:.1f})')
rauschen = os.path.join(tmp, 'rauschen.wav')
with wave.open(rauschen, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
    w.writeframes((np.random.default_rng(3).standard_normal(22050 * 24) * 3000).astype('<i2').tobytes())
r = S.takt_analyse(rauschen, 0, 22)
ist(not r['sicher'] and r['bpm'] == 120.0, 'Rauschen: Takt unsicher, Vorgabe 120 bpm')

# 2. Dauern
ist(S.schnitt_dauern([{'dauer': 2.1}, {'dauer': 0.4}, {'dauer': 5}], 0.5) == [2.0, 1.0, 5.0], 'Dauern auf ganze Takte, mindestens zwei Schläge')
ist(S.schnitt_dauern([{'dauer': 2.1}], 0.5, mit_takt=False) == [round(2.1 * 30) / 30], 'ohne Takt auf Frames gerundet')

# 3. Rendern mit synthetischen Quellen und echter Musik
a = os.path.join(tmp, 'a.mp4'); b = os.path.join(tmp, 'b.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=540x960:rate=30:duration=14', '-pix_fmt', 'yuv420p', a], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=960x960:rate=30:duration=14', '-pix_fmt', 'yuv420p', b], check=True)
plan = {'id': 'test', 'musik': 'mixkit-new-york-427.mp3', 'musik_start': 24, 'hook1': 'Probe Hook', 'hook2': 'zweite Zeile', 'endzeile': 'LuxeStyle · luxestyle.ch',
        'shots': [
            {'quelle': 'a.mp4', 'ss': 0.5, 'dauer': 2.5, 'zoom': 'in'},
            {'quelle': 'b.mp4', 'ss': 1.0, 'dauer': 2.5, 'zoom': 'out', 'cropx': 0.3, 'text': 'Erste Aussage'},
            {'quelle': 'a.mp4', 'ss': 4.0, 'dauer': 3.0, 'zoom': 'none', 'tempo': 0.8, 'text': 'Zweite Aussage'},
            {'quelle': 'b.mp4', 'ss': 6.0, 'dauer': 3.0, 'zoom': 'in', 'text': 'Dritte Aussage'},
        ]}
out = os.path.join(tmp, 'test.mp4')
info = S.baue(plan, tmp, out)
j = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt:format=duration', '-of', 'json', out], text=True))
v = next(s for s in j['streams'] if s['codec_type'] == 'video'); au = [s for s in j['streams'] if s['codec_type'] == 'audio']
ist((v['width'], v['height']) == (1080, 1920), 'Ausgabe 1080x1920')
ist(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and v['r_frame_rate'] == '30/1', 'h264, yuv420p, 30 fps')
ist(len(au) == 1 and au[0]['codec_name'] == 'aac', 'genau eine Tonspur (aac)')
ist(abs(float(j['format']['duration']) - info['gesamt_s']) < 0.12, f'Dauer {j["format"]["duration"]} s entspricht dem Plan {info["gesamt_s"]} s')
ist(8.0 <= info['gesamt_s'] <= 15.0, 'Gesamtdauer 8 bis 15 s')
# Dauern sind ganze Takte
per = 60.0 / info['bpm']
ist(all(abs(d / per - round(d / per)) < 0.02 for d in info['dauern']) or not info['takt_sicher'], 'Einstellungen dauern ganze Takte')
# Bildinhalt: Hook in den ersten Sekunden sichtbar (Differenz zum Bild ohne Text), nach 4 s kein Hook mehr
def bild(t, name):
    p = os.path.join(tmp, name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', out, '-frames:v', '1', p], check=True)
    return p
ist(os.path.getsize(bild(1.0, 'f1.png')) > 20000, 'Bild bei 1,0 s lässt sich lesen')
# Lautstärke der Musik: -16 LUFS Ziel (loudnorm Einzeldurchgang, Toleranz ±4)
e = subprocess.run(['ffmpeg', '-v', 'info', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
lufs = float([l for l in e.split('\n') if ' I:' in l][-1].split('I:')[1].split('LUFS')[0])
ist(-21 <= lufs <= -12, f'Lautheit {lufs} LUFS im Zielbereich')

# 4. Eingabeprüfung
def kopie(**kw):
    c = json.loads(json.dumps(plan)); c.update(kw); return c
wirft(lambda: S.baue(kopie(hook1="Don't"), tmp, out), 'verbotenes Zeichen', 'Apostroph im Hook')
wirft(lambda: S.baue(kopie(hook1='Viel zu langer Hook hier'), tmp, out), 'länger als 16', 'Hook zu lang')
wirft(lambda: S.baue(kopie(hook1='Größe'), tmp, out), 'ß', 'ß im Hook')
wirft(lambda: S.baue(kopie(endzeile='Nur 5%'), tmp, out), 'verbotenes Zeichen', 'Prozent in der Endzeile')
wirft(lambda: S.baue(kopie(musik='luxe-premium.wav'), tmp, out), 'Mixkit', 'Eigenproduktion als Musik')
wirft(lambda: S.baue(kopie(shots=plan['shots'][:2]), tmp, out), '3 bis 8', 'zu wenige Einstellungen')
c = kopie(); c['shots'][0]['ss'] = 13.5
wirft(lambda: S.baue(c, tmp, out), 'ragt über die Quelle', 'Ausschnitt über das Quellende')
c = kopie(); c['shots'][0]['quelle'] = 'gibtsnicht.mp4'
wirft(lambda: S.baue(c, tmp, out), 'Quelle fehlt', 'fehlende Quelle')
c = kopie(); c['shots'][1]['tempo'] = 3
wirft(lambda: S.baue(c, tmp, out), 'tempo', 'Tempo ausserhalb')
c = kopie(); c['shots'][1]['zoom'] = 'wild'
wirft(lambda: S.baue(c, tmp, out), 'zoom', 'unbekannter Zoom')
c = kopie(); c['shots'][2]['text'] = 'Das ist ein Satz mit viel zu vielen Zeichen'
wirft(lambda: S.baue(c, tmp, out), 'länger als 24', 'Kernaussage zu lang')
c = kopie(); [s.update(dauer=5) for s in c['shots']]
wirft(lambda: S.baue(c, tmp, out), 'ausserhalb von', 'Gesamtdauer über 15 s')
c = kopie(); [s.update(dauer=1) for s in c['shots']]
wirft(lambda: S.baue(c, tmp, out), 'ausserhalb von', 'Gesamtdauer unter 8 s')

# 5. Trockenlauf schreibt keine Datei
neu = os.path.join(tmp, 'trocken.mp4')
S.baue(plan, tmp, neu, trocken=True)
ist(not os.path.exists(neu), 'Trockenlauf schreibt keine Datei')


# 6. Querformat mit Weichzeichner-Rahmen, Text unter der Endkarte, Endkarte tiefer
import io, contextlib
c_ = os.path.join(tmp, 'quer.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=960x540:rate=30:duration=14', '-pix_fmt', 'yuv420p', c_], check=True)
plan_b = json.loads(json.dumps(plan)); plan_b['shots'][1].update(quelle='quer.mp4', ss=1.0, fit='blur', zoom='none')
out_b = os.path.join(tmp, 'blur.mp4')
S.baue(plan_b, tmp, out_b)
jb = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', out_b], text=True))['streams'][0]
ist((jb['width'], jb['height']) == (1080, 1920), 'Weichzeichner-Rahmen: Ausgabe 1080x1920')
plan_c = json.loads(json.dumps(plan)); plan_c['shots'][1]['fit'] = 'quatsch'
wirft(lambda: S.baue(plan_c, tmp, out), 'fit', 'unbekannter fit')
puffer = io.StringIO()
with contextlib.redirect_stdout(puffer):
    S.baue(plan, tmp, os.path.join(tmp, 'x.mp4'), trocken=True)
graph = puffer.getvalue()
ist('y=1370' in graph and 'y=1300' not in graph, 'Endkarte bei y=1370')
ist('y=1200' in graph and 'y=1240' not in graph, 'Kernaussagen bei y=1200')
es_ = info['gesamt_s'] - 2.0
import re
enden = [float(m.group(1)) for m in re.finditer(r"y=1200:enable='between\(t,[0-9.]+,([0-9.]+)\)'", graph)]
ist(enden and max(enden) <= es_ - 0.04, f'Kernaussagen enden vor der Endkarte ({max(enden) if enden else None} <= {es_ - 0.05:.2f})')


# 7. Weissabgleich: kleinere Kelvin-Zahl macht wärmer, Bereich geprüft
plan_w = json.loads(json.dumps(plan)); plan_w['shots'][0]['wb'] = 5500
puf2 = io.StringIO()
with contextlib.redirect_stdout(puf2):
    S.baue(plan_w, tmp, os.path.join(tmp, 'w.mp4'), trocken=True)
ist('colortemperature=temperature=5500,cas=' in puf2.getvalue(), 'wb wird als colortemperature vor dem Nachschärfen eingebaut')
ist(puf2.getvalue().count('colortemperature') == 1, 'wb nur an der gewählten Einstellung')
for bad in (3000, 9500, 'warm'):
    pb = json.loads(json.dumps(plan)); pb['shots'][0]['wb'] = bad
    wirft(lambda pb=pb: S.baue(pb, tmp, out), 'wb', f'wb {bad} ausserhalb')

shutil.rmtree(tmp, ignore_errors=True)
print(f'{ok} Prüfungen bestanden' + (f', {len(fehler)} FEHLER' if fehler else ''))
sys.exit(1 if fehler else 0)
