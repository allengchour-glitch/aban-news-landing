#!/usr/bin/env python3
"""schnitt_test.py — Selbsttests fuer schnitt.py, ohne Netz (synthetische Quellen aus ffmpeg-lavfi + PIL-Text).

Aufruf:  python3 automation/reel/schnitt_test.py [--behalten]
Arbeitsordner: $SCHNITT_TEST_DIR (sonst ein Temp-Ordner, danach geloescht). Exit 0 = alles gruen.

Geprueft wird (Soll aus den Lernberichten 23.09.):
  1  Analyse: Einstellungsgrenzen der Testquelle (harte Schnitte, eingefrorene Strecke, Schwarzstrecke) +-2 Bilder,
     Schwarz/Standbild erkannt, eingeblendeter Text (PIL) als Fremdtext erkannt, saubere Einstellungen nicht.
  2  Plan: kein Stueck aus Schwarz, Standbild oder Fremdtext; keine Stelle zweimal; Hook nicht aus der Schwarz-/
     Standbild-/Text-Einstellung; Schnittzeiten auf dem Beat-Raster (<= 1/2 Bild Rundung); erster Wechsel <= 1,3 s.
  3  Render: 1080x1920, 30 fps, H.264 yuv420p, AAC 48 kHz Stereo, Bildzahl = Plan, Schnitte im Ergebnis +-1 Bild
     zum Plan, Lautheit -14 +-1 LUFS, True Peak <= -1,5 dBTP, JEDES Bild gehoert zur geplanten Einstellung
     (Farbmarke je Einstellung — kein Aufblitzen der Nachbar-Einstellung an den Schnitten).
  4  Rueckfaelle: Ein-Einstellungs-Quelle ohne Ton -> Beat-Stuecke mit Punch-in statt Schleife (gerendert);
     alles mit Fremdtext -> Exit 3 «UNGEEIGNET»; zu kurze Quelle -> Exit 3; Querformat -> Band/Ausschnitt im Bild.
  5  Beat-Raster an einer Klickspur (120 BPM, Phase 0,25 s) ohne CREDITS-Tempo: Periode +-3 ms, Einstieg auf dem Klick.
  6  Textebenen: sichere Zone organisch und Meta, Bild 0 <= 40 Zeichen.
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


def ok(name, bed, info=''):
    ERG.append((name, bool(bed), info))
    print(('  OK   ' if bed else '  FEHL ') + name + (f'  [{info}]' if info else ''), flush=True)
    return bed


def ff(*args):
    r = subprocess.run([FF, '-v', 'error', '-y', *args], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-600:])


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
    """A 0-2 | B 2-3.6 | C 3.6-5.0 eingefroren | D 5.0-6.0 schwarz | E 6-8 mit Text | F 8-10 | G 10-12 (540x960, 25 fps)."""
    tp = os.path.join(arbeit, 'text_e.png')
    text_png(tp, ['BUY YOURS NOW', 'Everybody needs', 'this amazing gadget'], 330)
    fc = (f"{ts2(2.0, box('A'))}[a];"
          f"{ts2(1.6, 'hue=h=180,vflip,' + box('B'))}[b];"
          f"smptehdbars=s=540x960:r=25:d=1.4[c];"
          f"color=c=black:s=540x960:r=25:d=1.0[d];"
          f"{ts2(2.0, 'negate,' + box('E'))}[e0];movie={tp}[tx];[e0][tx]overlay=0:0[e];"
          f"mandelbrot=s=540x960:r=25,trim=duration=2.0,setpts=PTS-STARTPTS,{box('F')}[f];"
          f"{ts2(2.0, 'hue=h=90,hflip,' + box('G'))}[g];"
          f"[a][b][c][d][e][f][g]concat=n=7:v=1:a=0,format=yuv420p[v]")
    args = ['-filter_complex', fc]
    if ton:
        args += ['-f', 'lavfi', '-i', 'sine=f=330:d=12', '-map', '[v]', '-map', '0:a']
    else:
        args += ['-map', '[v]']
    ff(*args, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-r', '25', '-t', '12', pfad)


def farbe_von(rgb):
    return min(FARBEN, key=lambda k: sum((a - b) ** 2 for a, b in zip(FARBEN[k], rgb)))


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
        ok('eingefrorene Strecke 3,6-5,0 erkannt', any(a <= 3.75 and b >= 4.85 for a, b in A['eingefroren']) and e_bei(4.3)['nutzbar_s'] == 0,
           f"eingefroren {A['eingefroren']}")
        ok('eingeblendeter Text (6-8 s) = Fremdtext', e_bei(7.0)['fremdtext'], e_bei(7.0)['fremdtext_grund'][:80])
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
        ok('keine Stelle zweimal', P['regeln']['ueberlappung_s'] == 0.0)
        hook_e = next(e for e in A['einstellungen'] if e['id'] == P['stuecke'][0]['einstellung'])
        ok('Hook aus sauberer, bewegter Einstellung', not (hook_e['schwarz'] or hook_e['fremdtext'] or hook_e['standbild']),
           f"Einstellung {hook_e['id']} ab {P['stuecke'][0]['q_start']}")
        per = P['musik']['periode']
        abw = [min(abs(g / 30 - j * per) for j in range(0, 60)) for g in P['schnitt_frames']]
        ok('Schnitte auf dem Beat-Raster (<= 1/2 Bild)', all(a <= 0.5 / 30 + 1e-6 for a in abw), f'max {max(abw) * 1000:.1f} ms')
        ok('erster Wechsel <= 1,3 s', P['regeln']['erster_wechsel_ok'], f"{P['regeln']['erster_wechsel_s']} s")
        ok('Bild 0 <= 40 Zeichen', P['regeln']['zeichen_bild0_ok'])
        ok('Entscheidungslog mit Grund je Schritt', all(x.get('grund') for x in P['entscheidungen']) and len(P['entscheidungen']) >= 6)

        # ------------------------------------------------------------------ 3 Render
        print('3 Render')
        out = os.path.join(arbeit, 'reel.mp4')
        pr = S.render(P, out, text=None, arbeitsordner=arbeit)
        ok('1080x1920 / 30 fps', (pr['w'], pr['h'], round(pr['fps'])) == (1080, 1920, 30), f"{pr['w']}x{pr['h']} {pr['fps']}")
        ok('H.264 yuv420p', pr['codec'] == 'h264' and pr['pix_fmt'] == 'yuv420p', f"{pr['codec']} {pr['pix_fmt']}")
        ok('AAC 48 kHz Stereo', pr['audio_hz'] == 48000 and pr['audio_kanaele'] == 2, f"{pr['audio_hz']} {pr['audio_kanaele']}")
        ok('Bildzahl = Plan (Dauer)', pr['frames'] == P['frames'], f"{pr['frames']}/{P['frames']} = {pr['dauer']} s")
        ok('Reel-Dauer 6-10 s aus 7,6 s sauberem Material', 6.0 <= P['dauer'] <= 10.0, f"{P['dauer']:.2f} s")
        ok('Schnitte im Ergebnis +-1 Bild zum Plan', all(v is not None and abs(v) <= 1 for v in pr['schnitt_versatz_frames']),
           str(pr['schnitt_versatz_frames']))
        ok('Lautheit -14 +-1 LUFS', pr['lufs'] is not None and abs(pr['lufs'] + 14) <= 1.0, f"{pr['lufs']} LUFS")
        ok('True Peak <= -1,5 dBTP', pr['true_peak'] is not None and pr['true_peak'] <= -1.5, f"{pr['true_peak']} dBTP")
        # jedes Bild gegen seine Soll-Einstellung (Farbmarke y 600-710 der Quelle -> Ausgabe ~1195-1415)
        raw = subprocess.run([FF, '-v', 'error', '-i', out, '-vf', 'crop=400:60:340:1275,scale=40:6', '-f', 'rawvideo',
                              '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, 6, 40, 3).mean(axis=(1, 2))
        seg = lambda t: 'A' if t < 2 else 'B' if t < 3.6 else 'E' if 6 <= t < 8 else 'F' if 8 <= t < 10 else 'G' if t >= 10 else '?'
        falsch = []
        ueberbl = P['loop'].get('art') == 'ueberblendung'
        for s in P['stuecke']:
            soll_f = seg(s['q_start'] + 0.01)
            for f in range(s['start_frame'], s['ende_frame']):
                if ueberbl and f >= P['frames'] - 12:
                    continue
                if farbe_von(fr[f]) != soll_f:
                    falsch.append((f, soll_f, farbe_von(fr[f])))
        ok('jedes Bild aus der geplanten Einstellung (kein Aufblitzen)', not falsch, f'{len(falsch)} falsch {falsch[:4]}')
        bogen = S.kontaktbogen(out, os.path.join(arbeit, 'bogen.jpg'))
        ok('Kontaktbogen geschrieben', os.path.getsize(bogen) > 10000)

        # ------------------------------------------------------------------ 4 Rueckfaelle
        print('4 Rueckfaelle')
        q1 = os.path.join(arbeit, 'eine_einstellung_ohne_ton.mp4')
        ff('-f', 'lavfi', '-i', ts2(8.0, box('A')), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', q1)
        A1 = S.analyse(q1)
        ok('Ein-Einstellungs-Quelle: 1 Einstellung, kein Ton', len(A1['einstellungen']) == 1 and not A1['ton']['vorhanden'])
        P1 = S.plan(A1, MUSIK, ziel_s=12.0, einstieg=MUSIK_EIN)
        ok('Unterteilung in mehrere Beat-Stuecke', len(P1['stuecke']) >= 3, f"{len(P1['stuecke'])} Stuecke, {P1['dauer']:.2f} s")
        ok('keine Schleife: keine Stelle zweimal, Reel <= Quelle', P1['regeln']['ueberlappung_s'] == 0 and P1['dauer'] <= 8.0)
        ok('Punch-in an einem Sprungschnitt', P1['regeln']['punch_ins'] >= 1)
        pr1 = S.render(P1, os.path.join(arbeit, 'reel_kurz.mp4'), text=dict(titel1='Testprodukt', titel2='', preis='CHF 19.90',
                                                                              hook='Test: kurz'), arbeitsordner=arbeit)
        ok('Render ohne Quellton, Bildzahl stimmt', pr1['frames'] == P1['frames'] and pr1['audio_hz'] == 48000)
        ok('Text in der sicheren Zone', pr1.get('text', {}).get('zone_ok') is True)

        qt = os.path.join(arbeit, 'alles_text.mp4'); tp = os.path.join(arbeit, 'text_alles.png')
        text_png(tp, ['BUY YOURS NOW', 'Everybody needs', 'this amazing gadget'], 330)
        ff('-filter_complex', f"{ts2(8.0)}[a];movie={tp}[t];[a][t]overlay=0:0,format=yuv420p[v]", '-map', '[v]',
           '-c:v', 'libx264', '-preset', 'ultrafast', qt)
        r = subprocess.run([sys.executable, os.path.join(HIER, 'schnitt.py'), '--plan', qt, '--musik', MUSIK],
                           capture_output=True, text=True)
        ok('alles Fremdtext -> Exit 3 mit Grund', r.returncode == 3 and r.stdout.startswith('UNGEEIGNET'), r.stdout.strip()[:90])

        qk = os.path.join(arbeit, 'zu_kurz.mp4')
        ff('-f', 'lavfi', '-i', ts2(4.0), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', qk)
        r = subprocess.run([sys.executable, os.path.join(HIER, 'schnitt.py'), '--plan', qk, '--musik', MUSIK],
                           capture_output=True, text=True)
        ok('zu wenig Material (4 s) -> Exit 3', r.returncode == 3 and 'UNGEEIGNET' in r.stdout, r.stdout.strip()[:90])

        qq = os.path.join(arbeit, 'quer.mp4')
        ff('-filter_complex', "testsrc2=s=1060x620:r=25:d=4,crop=960:540:90:70[a];"
           "testsrc2=s=1060x620:r=25:d=4,crop=960:540:90:70,hue=h=150,hflip[b];[a][b]concat=n=2:v=1:a=0,format=yuv420p[v]",
           '-map', '[v]', '-c:v', 'libx264', '-preset', 'ultrafast', qq)
        Aq = S.analyse(qq); Pq = S.plan(Aq, MUSIK, ziel_s=6.0, einstieg=MUSIK_EIN)
        im_bild = all(0 <= s['fenster'][0] and s['fenster'][0] + s['fenster'][2] <= 960 and 0 <= s['fenster'][1]
                      and s['fenster'][1] + s['fenster'][3] <= 540 for s in Pq['stuecke'])
        ok('Querformat: Layout gewaehlt, Fenster im Bild', Pq['modus'] in ('fill', 'band') and im_bild,
           f"{Pq['modus']} {Pq['stuecke'][0]['fenster']}")

        # ------------------------------------------------------------------ 5 Beat-Raster
        print('5 Beat-Raster (Klickspur 120 BPM, Phase 0,25 s)')
        import soundfile as sf
        sr = 44100; y = np.zeros(int(sr * 24), np.float32)
        for k in range(48):
            i0 = int((0.25 + k * 0.5) * sr); n = int(0.02 * sr)
            y[i0:i0 + n] += 0.8 * np.sin(2 * np.pi * 1000 * np.arange(n) / sr) * np.exp(-np.arange(n) / (0.004 * sr))
        klick = os.path.join(arbeit, 'klick_test.wav'); sf.write(klick, y, sr)
        R = S.beat_raster(klick, 4.1, 12.0, cache_ordner=arbeit)
        ok('Periode 0,500 s +-3 ms', abs(R['periode'] - 0.5) <= 0.003, f"{R['periode']} s ({R['bpm']} BPM)")
        ph = (R['einstieg'] - 0.25) % 0.5
        ok('Einstieg auf dem Klick eingerastet (+-15 ms)', min(ph, 0.5 - ph) <= 0.015, f"{R['einstieg']} s")

        # ------------------------------------------------------------------ 6 Textebenen
        print('6 Textebenen')
        for z in ('organisch', 'meta'):
            T = S.text_ebenen(os.path.join(arbeit, 'txt_' + z), 'Hundegeschirr-Set für', 'kleine bis mittelgrosse Hunde',
                              'CHF 19.90', 'Geschirr-Set für Hunde', zone=z)
            ok(f'Textebenen in der sicheren Zone ({z})', T['zone_ok'], '; '.join(T['zone_fehler'])[:120])
        ok('Bild 0 <= 40 Zeichen (Marke + Hook)', T['zeichen']['bild0'] <= 40, str(T['zeichen']))
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
