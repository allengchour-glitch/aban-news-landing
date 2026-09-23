#!/usr/bin/env python3
"""schnitt_test.py — Selbsttests fuer schnitt.py, ohne Netz (synthetische Quellen aus ffmpeg-lavfi + PIL-Text).

Aufruf:  python3 automation/reel/schnitt_test.py [--behalten]
Arbeitsordner: $SCHNITT_TEST_DIR (sonst ein Temp-Ordner, danach geloescht). Exit 0 = alles gruen.

Geprueft wird (Soll aus den Lernberichten und der Pruefung 23.09.):
  1  Analyse: Einstellungsgrenzen der Testquelle +-2 Bilder, Schwarz/Standbild erkannt, eingeblendeter Text als
     Fremdtext — und zwar weil die OCR die Woerter WIRKLICH gelesen hat (nicht nur ueber die Kanten-Heuristik).
  2  Plan: kein Stueck aus Schwarz/Standbild/Fremdtext; Ueberlappung aus den Stuecken NACHGERECHNET; Hook sauber;
     ganze Takte; erster Wechsel <= 1,3 s; Bild 0 <= 40 Zeichen; --sperren und --hook-ab wirken.
  3  Render: Format, Bildzahl = Plan, Schnitte +-1 Bild und sichtbar, -14 +-1 LUFS, TP <= -1,5, JEDES Bild aus der
     geplanten Einstellung (Farbmarke), Tor ok; ein manipulierter Plan faellt durch das Tor.
  4  Rueckfaelle: eine Kamerafahrt >= 8 s -> nur Vorwaerts-Spruenge (hoechstens 1 Ruecksprung); < 8 s -> Exit 3;
     alles Fremdtext -> Exit 3; 4-s-Quelle -> Exit 3; 0-Byte-Quelle -> Exit 3; abgeschnittene Quelle -> Dauer =
     dekodierbar; Querformat gerendert; Stativ-Quelle ohne Logo-Fehlalarm; Musik ausserhalb automation/music -> Fehler;
     5-s-Musik -> Exit 1 (nicht 3).
  5  Beat: Klickspur 120 BPM (Periode, Einstieg); Kick auf dem Schlag + lautere Hi-Hat auf dem Offbeat -> Raster auf
     dem Kick (Technik-Pruefung: house2 lag auf dem Offbeat); Scheinschnitte durch periodisches Ruckeln.
  6  Text: sichere Zone organisch und Meta, Bild 0 <= 40 Zeichen, Fremdpreis-Erkennung (Regel + echte OCR),
     True-Peak-Nachregelung nach AAC.
"""
import json, os, shutil, subprocess, sys, tempfile, time, traceback

import numpy as np
from PIL import Image, ImageDraw

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import schnitt as S  # noqa: E402

FF = S.FF
MUSIK = 'luxe-cinematic-house.wav'          # eigenes Stueck (CREDITS: 122 BPM), liegt im Repo
MUSIK_EIN = 31.5
ERG = []
FARBEN = {'A': (255, 0, 0), 'B': (0, 255, 0), 'E': (0, 0, 255), 'F': (255, 255, 0), 'G': (255, 0, 255)}
SCHNITT = os.path.join(HIER, 'schnitt.py')


def ok(name, bed, info=''):
    ERG.append((name, bool(bed), info))
    print(('  OK   ' if bed else '  FEHL ') + name + (f'  [{info}]' if info else ''), flush=True)
    return bed


def ff(*args):
    r = subprocess.run([FF, '-v', 'error', '-y', '-threads', '2', *args], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-600:])


def cli(*args, env=None):
    return subprocess.run([sys.executable, SCHNITT, *args], capture_output=True, text=True,
                          env=dict(os.environ, **(env or {})))


def text_png(pfad, zeilen, y0, w=540, h=960, gr=40):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = S.ov.font(S.ov.F_BOLD, gr)
    y = y0
    for z in zeilen:
        tw = d.textlength(z, font=f)
        d.rectangle(((w - tw) / 2 - 12, y - 6, (w + tw) / 2 + 12, y + gr + 10), fill=(0, 0, 0, 200))
        d.text(((w - tw) / 2, y), z, font=f, fill=(255, 255, 255, 255)); y += gr + 22
    im.save(pfad)


def ts2(dauer, extra=''):
    # testsrc2 hat oben links einen Zeitstempel-Kasten -> groesser erzeugen und wegschneiden (sonst «Logo»);
    # scroll: testsrc2 bewegt sich kaum (MAD 0,56/255) und galte sonst als Standbild-Dia (<= 1 s je Einstellung)
    return f"testsrc2=s=620x1060:r=25:d={dauer},crop=540:960:70:90,scroll=h=0.012:v=0.004{(',' + extra) if extra else ''}"


def box(farbe):
    r, g, b = FARBEN[farbe]
    return f"drawbox=x=0:y=600:w=540:h=110:color=0x{r:02x}{g:02x}{b:02x}@1:t=fill"


def synth_haupt(pfad, arbeit, ton=True):
    """A 0-2 | B 2-3.6 | C 3.6-5.0 eingefroren | D 5.0-6.0 schwarz | E 6-8 mit Text | F 8-10 | G 10-12 (540x960, 25 fps).
    Text-PNG als eigener Eingang (-i), nicht per movie= (Code-Pruefung: Pfad im Filtergraph ungeschuetzt)."""
    tp = os.path.join(arbeit, 'text_e.png')
    text_png(tp, ['BUY YOURS NOW', 'Everybody needs', 'this amazing gadget'], 330)
    fc = (f"{ts2(2.0, box('A'))}[a];"
          f"{ts2(1.6, 'hue=h=180,vflip,' + box('B'))}[b];"
          f"smptehdbars=s=540x960:r=25:d=1.4[c];"
          f"color=c=black:s=540x960:r=25:d=1.0[d];"
          f"{ts2(2.0, 'negate,' + box('E'))}[e0];[e0][0:v]overlay=0:0:shortest=1[e];"
          f"mandelbrot=s=540x960:r=25,trim=duration=2.0,setpts=PTS-STARTPTS,{box('F')}[f];"
          f"{ts2(2.0, 'hue=h=90,hflip,' + box('G'))}[g];"
          f"[a][b][c][d][e][f][g]concat=n=7:v=1:a=0,format=yuv420p[v]")
    args = ['-loop', '1', '-framerate', '25', '-t', '2', '-i', tp, '-filter_complex', fc]
    if ton:
        args += ['-f', 'lavfi', '-i', 'sine=f=330:d=12', '-map', '[v]', '-map', '1:a']
    else:
        args += ['-map', '[v]']
    ff(*args, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-r', '25', '-t', '12', pfad)


def farbe_von(rgb):
    return min(FARBEN, key=lambda k: sum((a - b) ** 2 for a, b in zip(FARBEN[k], rgb)))


def ueberlappung(stuecke):
    """Unabhaengig vom Plan nachgerechnet: Summe der Quell-Ueberlappungen je Einstellung (Loop-Ende und Hook
    grenzen aneinander, ueberlappen aber nicht)."""
    je = {}
    for s in stuecke:
        je.setdefault(s['einstellung'], []).append((s['q_start'], s['q_start'] + s['q_dauer']))
    u = 0.0
    for ivs in je.values():
        ivs.sort()
        for (a0, b0), (a1, b1) in zip(ivs, ivs[1:]):
            u += max(0.0, b0 - a1 - 1e-3)
    return u


def klickspur(pfad, sr=44100, sek=24, kick_auf=True, hat_off=False, phase=0.25, per=0.5):
    """Klick bei phase + k*per (1 kHz) — oder Kick (60 Hz) auf dem Schlag + lautere Hi-Hat (Rauschen > 6 kHz) auf dem Offbeat."""
    import soundfile as sf
    from scipy import signal
    y = np.zeros(int(sr * sek), np.float32)
    n = int(0.03 * sr); tt = np.arange(n) / sr
    rng = np.random.default_rng(1)
    hp = signal.butter(4, 6000, btype='high', fs=sr, output='sos')
    for k in range(int((sek - phase) / per)):
        i0 = int((phase + k * per) * sr)
        if hat_off:
            y[i0:i0 + n] += (0.5 * np.sin(2 * np.pi * 60 * tt) * np.exp(-tt / 0.012)).astype(np.float32)
            j0 = int((phase + (k + 0.5) * per) * sr)
            hat = signal.sosfilt(hp, rng.standard_normal(n)) * np.exp(-tt / 0.004)
            y[j0:j0 + n] += (0.9 * hat / (np.abs(hat).max() + 1e-9)).astype(np.float32)
        else:
            y[i0:i0 + n] += (0.8 * np.sin(2 * np.pi * 1000 * tt) * np.exp(-tt / 0.004)).astype(np.float32)
    sf.write(pfad, y, sr)
    return pfad


def main():
    behalten = '--behalten' in sys.argv
    basis = os.environ.get('SCHNITT_TEST_DIR')
    arbeit = tempfile.mkdtemp(prefix='schnitt_test_', dir=basis) if basis else tempfile.mkdtemp(prefix='schnitt_test_')
    t00 = time.time()
    print(f'Arbeitsordner: {arbeit}')
    try:
        # ------------------------------------------------------------------ 1 Analyse
        print('1 Analyse (synthetische Quelle mit 6 Grenzen)')
        q = os.path.join(arbeit, 'synth.mp4'); synth_haupt(q, arbeit)
        A = S.analyse(q, cache=True)
        starts = [e['start'] for e in A['einstellungen']]
        soll = [2.0, 3.6, 5.0, 6.0, 8.0, 10.0]
        treffer = [min(abs(s - x) for s in starts) for x in soll]
        ok('Einstellungsgrenzen +-2 Bilder (0,08 s)', all(t <= 0.081 for t in treffer), f'Abweichung {[round(t, 3) for t in treffer]}')
        ok('keine Zusatz-Grenzen', len(A['einstellungen']) == 7, f"{len(A['einstellungen'])} Einstellungen: {starts}")
        def e_bei(t):
            return next(e for e in A['einstellungen'] if e['start'] - 0.05 <= t < e['ende'])
        ok('Schwarzstrecke 5,0-6,0 als schwarz', e_bei(5.5)['schwarz'])
        ok('eingefrorene Strecke 3,6-5,0 erkannt (Beginn <= 3,65 s)', any(a <= 3.65 and b >= 4.85 for a, b in A['eingefroren'])
           and e_bei(4.3)['nutzbar_s'] == 0, f"eingefroren {A['eingefroren']}")
        ok('eingeblendeter Text (6-8 s) = Fremdtext', e_bei(7.0)['fremdtext'], e_bei(7.0)['fremdtext_grund'][:80])
        ok('OCR hat die Woerter wirklich gelesen (nicht nur Kanten-Heuristik)',
           'lateinische Woerter' in e_bei(7.0)['fremdtext_grund'] and A['ocr']['eng'] and A['ocr']['fehler_eng'] == 0,
           f"{e_bei(7.0)['ocr']['woerter'][:5]} · OCR {A['ocr']['aufrufe_eng']} Aufrufe, {A['ocr']['fehler_eng']} Fehler")
        sauber_ok = [not e_bei(t)['fremdtext'] for t in (1.0, 2.8, 9.0, 11.0)]
        ok('saubere Einstellungen ohne Fremdtext-Alarm', all(sauber_ok), str(sauber_ok))
        ok('Cache neben der Arbeitsdatei', os.path.exists(q + '.schnitt.json') and S.analyse(q).get('aus_cache'))

        # ------------------------------------------------------------------ 2 Plan
        print('2 Plan')
        P = S.plan(A, MUSIK, ziel_s=10.0, einstieg=MUSIK_EIN, hook_text='Testprodukt: sauber')
        verboten = [(3.6, 6.0), (6.0, 8.0)]     # Standbild+Schwarz, Text
        schlecht = [s for s in P['stuecke'] for a, b in verboten if s['q_start'] < b - 0.01 and s['q_start'] + s['q_dauer'] > a + 0.01]
        ok('kein Stueck aus Schwarz/Standbild/Fremdtext (kein Schnitt mitten in Schwarz)', not schlecht,
           f"{[(s['q_start'], s['q_dauer']) for s in schlecht]}")
        ok('keine Stelle zweimal (aus den Stuecken nachgerechnet)', ueberlappung(P['stuecke']) == 0.0,
           f"{ueberlappung(P['stuecke']):.3f} s")
        hook_e = next(e for e in A['einstellungen'] if e['id'] == P['stuecke'][0]['einstellung'])
        ok('Hook aus sauberer, bewegter Einstellung', not (hook_e['schwarz'] or hook_e['fremdtext'] or hook_e['standbild']),
           f"Einstellung {hook_e['id']} ab {P['stuecke'][0]['q_start']}")
        per = P['musik']['periode']; fps = P['fps']
        abw = [min((j * per - g / fps for j in range(0, 60) if j * per - g / fps >= -1e-6), default=9) for g in P['schnitt_frames']]
        ok('Plan: jeder Schnitt auf oder hoechstens 1 Bild VOR dem Beat (Fenster -100/+33 ms)',
           all(0 <= a <= 1.0 / fps + 1e-6 for a in abw), f'Schnitt vor Beat max {max(abw) * 1000:.1f} ms bei {fps} fps')
        ok('ganze Takte (Schlaege % 4 == 0)', P['beats'] % 4 == 0, f"{P['beats']} Schlaege")
        ok('erster Wechsel <= 1,3 s', P['regeln']['erster_wechsel_ok'], f"{P['regeln']['erster_wechsel_s']} s")
        ok('Bild 0 <= 40 Zeichen', P['regeln']['zeichen_bild0_ok'])
        ok('Entscheidungslog mit Grund je Schritt', all(x.get('grund') for x in P['entscheidungen']) and len(P['entscheidungen']) >= 6)
        ok('25-fps-Quelle -> 25-fps-Plan (keine eingefuegten Doppelbilder)', fps == 25, f'{fps}')
        Ps = S.plan(A, MUSIK, ziel_s=10.0, einstieg=MUSIK_EIN, sperren=[(11.5, 12.0)])
        ok('--sperren: kein Stueck aus 11,5-12 s', not [s for s in Ps['stuecke'] if s['q_start'] + s['q_dauer'] > 11.5 + 1e-6],
           str([(s['q_start'], s['q_dauer']) for s in Ps['stuecke']]))
        Ph = S.plan(A, MUSIK, ziel_s=10.0, einstieg=MUSIK_EIN, hook_ab=10.2)
        ok('--hook-ab: Hook beginnt in [10,2; 11,2]', 10.2 - 1e-6 <= Ph['stuecke'][0]['q_start'] <= 11.2,
           f"{Ph['stuecke'][0]['q_start']}")

        # ------------------------------------------------------------------ 3 Render
        print('3 Render')
        out = os.path.join(arbeit, 'reel.mp4')
        pr = S.render(P, out, text=None, arbeitsordner=arbeit)
        ok('1080x1920 bei Plan-fps', (pr['w'], pr['h'], round(pr['fps'])) == (1080, 1920, fps), f"{pr['w']}x{pr['h']} {pr['fps']}")
        ok('H.264 yuv420p', pr['codec'] == 'h264' and pr['pix_fmt'] == 'yuv420p', f"{pr['codec']} {pr['pix_fmt']}")
        ok('AAC 48 kHz Stereo', pr['audio_hz'] == 48000 and pr['audio_kanaele'] == 2, f"{pr['audio_hz']} {pr['audio_kanaele']}")
        ok('Bildzahl = Plan (Dauer)', pr['frames'] == P['frames'], f"{pr['frames']}/{P['frames']} = {pr['dauer']} s")
        ok('Reel-Dauer 5-10 s aus 7,6 s sauberem Material (ganze Takte)', 5.0 <= P['dauer'] <= 10.0, f"{P['dauer']:.2f} s")
        ok('Schnitte im Ergebnis +-1 Bild zum Plan', all(v is not None and abs(v) <= 1 for v in pr['schnitt_versatz_frames']),
           str(pr['schnitt_versatz_frames']))
        ok('jeder Schnitt sichtbar (Staerke >= 2,5)', not pr['unsichtbare_schnitte'], str(pr['schnitt_staerke']))
        ok('Lautheit -14 +-1 LUFS', pr['lufs'] is not None and abs(pr['lufs'] + 14) <= 1.0, f"{pr['lufs']} LUFS")
        ok('True Peak <= -1,5 dBTP', pr['true_peak'] is not None and pr['true_peak'] <= -1.5, f"{pr['true_peak']} dBTP")
        ok('Tor: ok', pr['ok'], '; '.join(pr['verstoesse']))
        # jedes Bild gegen seine Soll-Einstellung (Farbmarke y 600-710 der Quelle -> Ausgabe ~1195-1415)
        raw = subprocess.run([FF, '-v', 'error', '-i', out, '-vf', f"crop=400:60:340:{int(P['band']['y'] + P['band']['h'] * 655 / 960) - 30},scale=40:6",
                              '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, 6, 40, 3).mean(axis=(1, 2))
        seg = lambda t: 'A' if t < 2 else 'B' if t < 3.6 else 'E' if 6 <= t < 8 else 'F' if 8 <= t < 10 else 'G' if t >= 10 else '?'
        falsch = []
        ueberbl = P['loop'].get('art') == 'ueberblendung'
        nbl = int(round(0.4 * fps))
        for s in P['stuecke']:
            soll_f = seg(s['q_start'] + 0.01)
            for f in range(s['start_frame'], s['ende_frame']):
                if ueberbl and f >= P['frames'] - nbl:
                    continue
                if farbe_von(fr[f]) != soll_f:
                    falsch.append((f, soll_f, farbe_von(fr[f])))
        ok('jedes Bild aus der geplanten Einstellung (kein Aufblitzen)', not falsch, f'{len(falsch)} falsch {falsch[:4]}')
        bogen = S.kontaktbogen(out, os.path.join(arbeit, 'bogen.jpg'))
        ok('Kontaktbogen geschrieben', os.path.getsize(bogen) > 10000)
        P_kaputt = json.loads(json.dumps(P)); P_kaputt['frames'] += 10
        pk = S.pruefen(out, P_kaputt)
        ok('Tor: manipulierter Plan (Bildzahl +10) faellt durch', not pk['ok'] and any('Bildzahl' in v for v in pk['verstoesse']),
           '; '.join(pk['verstoesse'])[:90])

        # ------------------------------------------------------------------ 4 Rueckfaelle
        print('4 Rueckfaelle')
        q1 = os.path.join(arbeit, 'eine_fahrt_10s_ohne_ton.mp4')
        ff('-f', 'lavfi', '-i', ts2(10.0, box('A')), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', q1)
        A1 = S.analyse(q1)
        ok('eine Kamerafahrt: 1 Einstellung, kein Ton', len(A1['einstellungen']) == 1 and not A1['ton']['vorhanden'])
        P1 = S.plan(A1, MUSIK, ziel_s=12.0, einstieg=MUSIK_EIN)
        mitte = [s for s in P1['stuecke'] if s['rolle'] == 'demo']
        rueck = sum(1 for a_, b_ in zip(P1['stuecke'], P1['stuecke'][1:]) if b_['rolle'] == 'demo' and b_['q_start'] < a_['q_start'])
        ok('eine Fahrt: mehrere Beat-Stuecke, hoechstens 1 Ruecksprung (vorwaerts statt Ruckeln)',
           len(P1['stuecke']) >= 3 and rueck <= 1 and P1['regeln']['eine_fahrt'],
           f"{len(P1['stuecke'])} Stuecke, {rueck} Ruecksprung(e), q {[s['q_start'] for s in P1['stuecke']]}")
        ok('keine Schleife: Ueberlappung 0, Reel <= Quelle', ueberlappung(P1['stuecke']) == 0 and P1['dauer'] <= 10.0)
        ok('Punch-in an einem Sprungschnitt', P1['regeln']['punch_ins'] >= 1)
        pr1 = S.render(P1, os.path.join(arbeit, 'reel_kurz.mp4'), text=dict(titel1='Testprodukt', titel2='', preis='CHF 19.90',
                                                                              hook='Test: kurz'), arbeitsordner=arbeit)
        ok('Render ohne Quellton, Bildzahl stimmt', pr1['frames'] == P1['frames'] and pr1['audio_hz'] == 48000)
        ok('Text in der sicheren Zone', pr1.get('text', {}).get('zone_ok') is True)
        ok('kein Reel ohne CTA (kurzes Reel: «Link in Bio» im Infofeld, sonst eigener CTA-Block)',
           P1['text']['info_variante'] == 'cta' or P1['text']['cta'][1] - P1['text']['cta'][0] >= 1.4,
           f"{P1['text']}")
        q7 = os.path.join(arbeit, 'eine_fahrt_7s.mp4')
        ff('-f', 'lavfi', '-i', ts2(7.0, box('B')), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', q7)
        r = cli('--plan', q7, '--musik', MUSIK, '--einstieg', str(MUSIK_EIN))
        ok('eine Kamerafahrt < 8 s -> Exit 3', r.returncode == 3 and 'Kamerafahrt' in r.stdout, r.stdout.strip()[:90])

        qt = os.path.join(arbeit, 'alles_text.mp4'); tp = os.path.join(arbeit, 'text_alles.png')
        text_png(tp, ['BUY YOURS NOW', 'Everybody needs', 'this amazing gadget'], 330)
        ff('-loop', '1', '-framerate', '25', '-t', '8', '-i', tp, '-filter_complex',
           f"{ts2(8.0)}[a];[a][0:v]overlay=0:0:shortest=1,format=yuv420p[v]", '-map', '[v]',
           '-c:v', 'libx264', '-preset', 'ultrafast', '-t', '8', qt)
        r = cli('--plan', qt, '--musik', MUSIK)
        ok('alles Fremdtext -> Exit 3 mit Grund', r.returncode == 3 and r.stdout.startswith('UNGEEIGNET'), r.stdout.strip()[:90])

        qk = os.path.join(arbeit, 'zu_kurz.mp4')
        ff('-f', 'lavfi', '-i', ts2(4.0), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', qk)
        r = cli('--plan', qk, '--musik', MUSIK)
        ok('zu wenig Material (4 s) -> Exit 3', r.returncode == 3 and 'UNGEEIGNET' in r.stdout, r.stdout.strip()[:90])

        q0 = os.path.join(arbeit, 'null.mp4'); open(q0, 'wb').close()
        r = cli('--plan', q0, '--musik', MUSIK)
        ok('0-Byte-Quelle -> Exit 3 «nicht dekodierbar» (naechster Clip)', r.returncode == 3 and 'dekodierbar' in r.stdout,
           (r.stdout + r.stderr).strip()[:90])

        qa = os.path.join(arbeit, 'abgeschnitten.mp4'); qf = os.path.join(arbeit, 'fast.mp4')
        ff('-i', q, '-c', 'copy', '-movflags', '+faststart', qf)
        b_ = open(qf, 'rb').read(); open(qa, 'wb').write(b_[:len(b_) * 55 // 100])
        Aa = S.analyse(qa, cache=False)
        ok('abgeschnittener Download: Dauer = dekodierbar, nicht Kopfzeile', Aa.get('abgeschnitten') is not None and
           Aa['dauer'] < 11.0 and Aa['einstellungen'][-1]['ende'] <= Aa['dauer'] + 1e-6, f"{Aa.get('abgeschnitten')}")

        qq = os.path.join(arbeit, 'quer.mp4')
        ff('-filter_complex', "testsrc2=s=1060x620:r=25:d=4,crop=960:540:90:70,scroll=h=0.01[a];"
           "testsrc2=s=1060x620:r=25:d=4,crop=960:540:90:70,hue=h=150,hflip,scroll=h=0.01[b];[a][b]concat=n=2:v=1:a=0,format=yuv420p[v]",
           '-map', '[v]', '-c:v', 'libx264', '-preset', 'ultrafast', qq)
        Aq = S.analyse(qq); Pq = S.plan(Aq, MUSIK, ziel_s=6.0, einstieg=MUSIK_EIN)
        im_bild = all(0 <= s['fenster'][0] and s['fenster'][0] + s['fenster'][2] <= 960 and 0 <= s['fenster'][1]
                      and s['fenster'][1] + s['fenster'][3] <= 540 for s in Pq['stuecke'])
        prq = S.render(Pq, os.path.join(arbeit, 'reel_quer.mp4'), text=None, arbeitsordner=arbeit)
        ok('Querformat: gerendert, Fenster im Bild, Tor ok', im_bild and prq['ok'] and prq['frames'] == Pq['frames'],
           f"{Pq['modus']} band {Pq['band']} · {'; '.join(prq['verstoesse'])}")

        qs = os.path.join(arbeit, 'stativ.mp4')
        ff('-filter_complex', "color=c=0x806040:s=540x960:r=25:d=10,drawbox=x=40:y=520:w=460:h=12:color=white@1:t=fill,"
           "drawbox=x=60:y=700:w=120:h=80:color=0x202020@1:t=fill,drawbox=x=360:y=140:w=150:h=40:color=0xe0e0e0@1:t=fill[bg];"
           "color=c=red:s=160x160:r=25:d=10,drawbox=x=20:y=20:w=120:h=120:color=yellow@1:t=8[obj];[bg][obj]overlay=x='60+30*t':y=300,format=yuv420p[v]",
           '-map', '[v]', '-c:v', 'libx264', '-preset', 'ultrafast', qs)
        As = S.analyse(qs, cache=False)
        ok('Stativ-Quelle (ruhig): Szenenkanten sind kein «Logo»', not As['logos'] and not any(e['fremdtext'] for e in As['einstellungen']),
           f"ruhig {As['ruhige_pixel']}, logos {As['logos']}, verworfen {len(As['logos_verworfen'])}")

        mfremd = os.path.join(arbeit, 'fremd.wav'); shutil.copy(os.path.join(S.MUSIK_DIR, MUSIK), mfremd)
        try:
            S.plan(A, mfremd, ziel_s=10.0, einstieg=MUSIK_EIN)
            ok('Musik ausserhalb automation/music -> Fehler', False)
        except S.MusikFehler as e:
            ok('Musik ausserhalb automation/music -> Fehler', True, str(e)[:80])
        m5 = os.path.join(arbeit, 'musik_5s.wav')
        ff('-i', os.path.join(S.MUSIK_DIR, 'luxe-house1.wav'), '-t', '5', m5)
        r = cli('--plan', q, '--musik', m5, env={'SCHNITT_MUSIK_FREI': '1'})
        ok('5-s-Musik -> Exit 1 (Musikfehler, Quelle bleibt unbeschuldigt)', r.returncode == 1 and 'Musik' in r.stderr,
           r.stderr.strip()[:90])

        # ------------------------------------------------------------------ 5 Beat
        print('5 Beat (Klickspuren)')
        os.environ['SCHNITT_MUSIK_FREI'] = '1'
        klick = klickspur(os.path.join(arbeit, 'klick_test.wav'))
        R = S.beat_raster(klick, 4.1, 12.0, cache_ordner=arbeit)
        ok('Periode 0,500 s +-3 ms', abs(R['periode'] - 0.5) <= 0.003, f"{R['periode']} s ({R['bpm']} BPM)")
        ph = (R['einstieg'] - 0.25) % 0.5
        ok('Einstieg auf dem Klick eingerastet (+-15 ms)', min(ph, 0.5 - ph) <= 0.015, f"{R['einstieg']} s")
        kick = klickspur(os.path.join(arbeit, 'kick_hat.wav'), hat_off=True)
        Rk = S.beat_raster(kick, 4.1, 12.0, cache_ordner=arbeit)
        ph = (Rk['einstieg'] - 0.25) % 0.5
        ok('Kick auf dem Schlag, lautere Hi-Hat auf dem Offbeat -> Raster auf dem Kick (+-20 ms)', min(ph, 0.5 - ph) <= 0.02,
           f"Einstieg {Rk['einstieg']} s, Kick-Phase {Rk.get('kick_phase')}")
        os.environ.pop('SCHNITT_MUSIK_FREI', None)
        # Scheinschnitte: Spitze alle 4 Bilder (p1 20,36-21,04 s) -> kein Schnitt; einzelne Spitze -> Schnitt
        st_ = np.arange(300) / 25.0; ss_ = np.full(300, 0.004)
        ss_[100:200:4] = 0.105; ss_[148] = 0.128
        ss_[250] = 0.15
        roh, _ = S._schnitt_kandidaten(st_, ss_, 12.0)
        ok('periodisches Ruckeln -> kein Scheinschnitt, echte Einzelspitze -> Schnitt',
           [round(t, 2) for t, _, _ in roh] == [10.0], str([(round(t, 2), round(s_, 3)) for t, s_, _ in roh]))

        # ------------------------------------------------------------------ 6 Text / Preise / Ton
        print('6 Textebenen, Fremdpreise, True Peak')
        for z in ('organisch', 'meta'):
            T = S.text_ebenen(os.path.join(arbeit, 'txt_' + z), 'Hundegeschirr-Set für', 'kleine bis mittelgrosse Hunde',
                              'CHF 19.90', 'Geschirr-Set für Hunde', zone=z)
            ok(f'Textebenen in der sicheren Zone ({z})', T['zone_ok'], '; '.join(T['zone_fehler'])[:120])
        ok('Bild 0 <= 40 Zeichen (Marke + Hook)', T['zeichen']['bild0'] <= 40, str(T['zeichen']))
        fb = S.fremdtext_woerter([('$12.99', 88, 0, 0, 40, 12), ('50%', 80, 50, 0, 20, 12), ('OFF', 80, 72, 0, 20, 12)],
                                 [('39.9元', 70, 0, 20, 40, 12)])
        ok('Fremdpreis-Regel: $12.99, 50% OFF, 39.9元', len(fb['preise']) == 3, str(fb['preise']))
        pim = Image.new('L', (540, 300), 235); d = ImageDraw.Draw(pim)
        d.text((150, 110), '$12.99', font=S.ov.font(S.ov.F_BOLD, 64), fill=20)
        w_ = S.ocr(np.asarray(pim), 'eng')
        fb = S.fremdtext_woerter(w_, [])
        ok('Fremdpreis per echter OCR gelesen', bool(fb['preise']), f"OCR {[x[0] for x in (w_ or [])]}")
        mt = os.path.join(arbeit, 'tp_probe'); os.makedirs(mt, exist_ok=True)
        Rt = dict(einstieg=0.2138, pfad=S.musik_pfad('luxe-house2.wav')); Dt = 11.4343
        mix = S._ton_normiert(Rt, Dt, mt); vt = os.path.join(mt, 'v.mp4')
        ff('-f', 'lavfi', '-i', f'color=c=black:s=320x568:r=25:d={Dt}', '-i', mix, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264',
           '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', f'{Dt:.4f}', vt)
        verlauf = S._tp_nachregeln(vt, mix, Dt, mt)
        ok('True Peak nach AAC nachgeregelt (house2 ab 0,21 s: vorher > -1,5)', verlauf[0]['true_peak'] > -1.5 and
           verlauf[-1]['true_peak'] <= -1.5 and abs(verlauf[-1]['lufs'] + 14) <= 1.0,
           ' -> '.join(f"{v['true_peak']} dBTP/{v['lufs']} LUFS" for v in verlauf))
    except Exception:
        traceback.print_exc()
        ok('Testlauf ohne Ausnahme', False)
    finally:
        if not behalten:
            shutil.rmtree(arbeit, ignore_errors=True)
    n_ok = sum(1 for _, b, _ in ERG if b)
    print(f'\n{n_ok}/{len(ERG)} gruen in {time.time() - t00:.0f} s')
    return 0 if ERG and n_ok == len(ERG) else 1


if __name__ == '__main__':
    sys.exit(main())
