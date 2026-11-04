#!/usr/bin/env python3
"""Profi-Schnitt für TikTok/Reels: Schnittplan (JSON) -> 1080x1920-Video. Schreibt NUR die lokale MP4 (und mit --musik-log eine Zeile ins Musik-Log).

Was der Schnitt tut (anders als veredeln.sh, das nur einen Ausschnitt nimmt):
  * mehrere Einstellungen aus verschiedenen Quellvideos, Schnitte auf dem Takt der Musik (Beat-Analyse mit numpy/scipy, Dauer je Einstellung = ganze Takte)
  * je Einstellung: Entrauschen (hqdn3d), optionaler Weissabgleich (wb in Kelvin), Zuschnitt auf 9:16 (oder fit=blur: ganzes Querformat mit Weichzeichner-Rahmen), Hochskalieren mit Lanczos, sanfter Zoom (Ken Burns), Nachschärfen (cas), leichte Farbkorrektur
  * Hook in zwei Zeilen (erste 2,7 s), Kernaussage je Einstellung (untere Drittelmitte, ausserhalb der TikTok-Oberfläche), Endkarte mit Wegweiser, Ausblenden von Bild und Ton
  * Musik rotierend aus den fünf Mixkit-Stücken (dropship/reel-vorlage/musik_waehlen.sh), -16 LUFS, Originalton der Quelle wird nie verwendet
Eingabe: Schnittplan (siehe schnittplaene.json) mit Clips; je Clip id, musik, musik_start, hook1, hook2, endzeile, shots[{quelle, ss, dauer, zoom, cropx, cropy, tempo, text}].
Aufruf:  python3 schneiden.py plan.json --id duft --quellen /pfad/zu/cjvid --out /pfad/duft.mp4 [--trocken] [--ohne-takt]
Grenzen (offen gesagt): Die Beat-Analyse kann bei Stücken ohne klaren Schlag (ambient) danebenliegen; dann meldet sie «Takt unsicher» und nimmt 120 bpm. Gehört hat das Ergebnis niemand von uns (kein Gehör hier).
"""
import argparse, json, math, os, subprocess, sys, tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
FONTS = {
    'hook': ['/usr/share/fonts/opentype/inter/Inter-Black.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
    'text': ['/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
    'end': ['/usr/share/fonts/opentype/inter/Inter-Bold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
}
MUSIK_STUECKE = ['mixkit-serene-view-443.mp3', 'mixkit-majestic-475.mp3', 'mixkit-dreamy-jazz-645.mp3', 'mixkit-new-york-427.mp3', 'mixkit-violin-uplift-675.mp3']
VERBOTEN = set("'\":%\\")
FPS = 30
MIN_S, MAX_S = 8.0, 15.0
LUFS = -16   # reine Musik ohne Stimme: -16 (Prüfer-Fund 03.11.: -22 klang neben anderen Beiträgen zu leise)


class Fehler(Exception):
    pass


def font(art):
    for p in FONTS[art]:
        if os.path.exists(p):
            return p
    raise Fehler(f'Keine Schrift für «{art}» gefunden')


def repo_root():
    return subprocess.check_output(['git', '-C', HIER, 'rev-parse', '--show-toplevel'], text=True).strip()


def pruefe_text(name, wert, maxlen, pflicht=True):
    if not wert:
        if pflicht:
            raise Fehler(f'{name} fehlt')
        return
    if len(wert) > maxlen:
        raise Fehler(f'{name} länger als {maxlen} Zeichen: «{wert}»')
    if any(c in VERBOTEN for c in wert):
        raise Fehler(f"{name} enthält ein verbotenes Zeichen (' \" : % \\): «{wert}»")
    if 'ß' in wert:
        raise Fehler(f'{name} enthält ß (Schweizer Rechtschreibung): «{wert}»')


def sonde(pfad):
    j = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', pfad], text=True))
    s = j['streams'][0]
    return int(s['width']), int(s['height']), float(j['format']['duration'])


def takt_analyse(pfad, start, laenge=40.0, lo=80.0, hi=150.0):
    """Tempo, Phase und Zuverlässigkeit der Taktung. Rückgabe: dict(bpm, periode, phase, konf, sicher)."""
    import numpy as np
    from scipy import signal
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(laenge), '-i', pfad, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, dtype=np.float32)
    sr, hop, n = 22050, 256, 1024
    if len(x) < sr * 6:
        return dict(bpm=120.0, periode=0.5, phase=0.0, konf=0.0, sicher=False)
    _, _, z = signal.stft(x, fs=sr, nperseg=n, noverlap=n - hop)
    mag = np.log1p(np.abs(z) * 10.0)
    flux = np.maximum(0.0, np.diff(mag, axis=1)).sum(axis=0)
    flux = np.maximum(0.0, flux - signal.medfilt(flux, 31))
    fps = sr / hop
    ac = signal.correlate(flux, flux, mode='full')[len(flux) - 1:]
    lags = np.arange(int(fps * 60 / hi), int(fps * 60 / lo) + 1)
    seg = ac[lags]
    bpms = 60.0 * fps / lags
    prior = np.exp(-0.5 * (np.log2(bpms / 110.0) / 0.7) ** 2)
    k = int(np.argmax(seg * prior))
    periode = lags[k] / fps
    konf = float(seg[k] / (np.median(seg) + 1e-9))
    # Verfeinern: Taktlänge und Phase gemeinsam suchen (die Autokorrelation kennt nur ganze Frames, der Fehler summiert sich über viele Schläge)
    glatt = signal.convolve(flux, np.exp(-0.5 * (np.arange(-3, 4) / 1.2) ** 2), mode='same')
    best, phase = -1.0, 0.0
    for p in np.linspace(periode * 0.97, periode * 1.03, 61):
        for ph in np.arange(0.0, p, 0.5 / fps):
            t = np.arange(ph, laenge - 1, p)
            idx = np.rint(t * fps).astype(int)
            idx = idx[idx < len(glatt)]
            sc = float(glatt[idx].sum()) / max(1, len(idx))
            if sc > best:
                best, phase, periode_fein = sc, float(ph), float(p)
    periode = periode_fein
    sicher = konf >= 1.6
    if not sicher:
        return dict(bpm=120.0, periode=0.5, phase=0.0, konf=konf, sicher=False)
    return dict(bpm=60.0 / periode, periode=periode, phase=phase, konf=konf, sicher=True)


def schnitt_dauern(shots, periode, mit_takt=True):
    """Dauern auf ganze Takte runden (mindestens 2), sonst auf Frames."""
    out = []
    for s in shots:
        d = float(s['dauer'])
        if mit_takt:
            n = max(2, round(d / periode))
            d = n * periode
        else:
            d = round(d * FPS) / FPS
        out.append(d)
    return out


def baue(clip, quellen, out, mit_takt=True, musik_log=False, trocken=False):
    root = repo_root()
    rd = os.path.join(root, 'dropship', 'reel-vorlage')
    pruefe_text('id', clip.get('id', ''), 24)
    pruefe_text('hook1', clip.get('hook1', ''), 16)
    pruefe_text('hook2', clip.get('hook2', ''), 16, pflicht=False)
    pruefe_text('endzeile', clip.get('endzeile', 'LuxeStyle · luxestyle.ch'), 28)
    shots = clip.get('shots') or []
    if not 3 <= len(shots) <= 8:
        raise Fehler('Ein Schnittplan braucht 3 bis 8 Einstellungen')
    musik = clip.get('musik', '')
    if musik not in MUSIK_STUECKE:
        raise Fehler(f'musik muss eines der fünf Mixkit-Stücke sein: {musik}')
    mpfad = os.path.join(root, 'automation', 'music', musik)
    if not os.path.exists(mpfad):
        raise Fehler(f'Musikdatei fehlt: {mpfad}')
    mstart = float(clip.get('musik_start', 0))
    takt = takt_analyse(mpfad, mstart) if mit_takt else dict(bpm=120.0, periode=0.5, phase=0.0, konf=0.0, sicher=False)
    periode = takt['periode']
    dauern = schnitt_dauern(shots, periode, mit_takt)
    total = sum(dauern)
    if not MIN_S <= total <= MAX_S:
        raise Fehler(f'Gesamtdauer {total:.2f} s liegt ausserhalb von {MIN_S} bis {MAX_S} s (nach Taktung): Einstellungen anpassen')
    work = tempfile.mkdtemp(prefix='schneiden-')
    eingaben, kette, namen, grenzen = [], [], [], []
    t0 = 0.0
    for i, (s, d) in enumerate(zip(shots, dauern)):
        pruefe_text(f'shots[{i}].text', s.get('text', ''), 24, pflicht=False)
        q = s['quelle'] if os.path.isabs(s['quelle']) else os.path.join(quellen, s['quelle'])
        if not os.path.exists(q):
            raise Fehler(f'Quelle fehlt: {q}')
        w, h, dq = sonde(q)
        tempo = float(s.get('tempo', 1.0))
        if not 0.5 <= tempo <= 2.0:
            raise Fehler(f'shots[{i}].tempo muss zwischen 0.5 und 2.0 liegen')
        ss = float(s['ss'])
        span = d * tempo
        if ss < 0 or ss + span > dq + 0.05:
            raise Fehler(f'shots[{i}]: Ausschnitt {ss}+{span:.2f} s ragt über die Quelle ({dq:.2f} s) hinaus: {os.path.basename(q)}')
        zoom = s.get('zoom', 'in')
        if zoom not in ('in', 'out', 'none'):
            raise Fehler(f'shots[{i}].zoom muss in, out oder none sein')
        cx_f, cy_f = float(s.get('cropx', 0.5)), float(s.get('cropy', 0.5))
        if w * 16 > h * 9:
            cw, ch = (int(h * 9 / 16) // 2) * 2, h
        else:
            cw, ch = w, (int(w * 16 / 9) // 2) * 2
        cx = (int((w - cw) * cx_f) // 2) * 2
        cy = (int((h - ch) * cy_f) // 2) * 2
        frames = max(2, round(d * FPS))
        dz = float(s.get('zoomstaerke', 0.10))
        if zoom == 'in':
            z = f"z='1+{dz}*on/{frames}'"
        elif zoom == 'out':
            z = f"z='{1 + dz}-{dz}*on/{frames}'"
        else:
            z = None
        eingaben += ['-ss', f'{ss:.3f}', '-t', f'{span + 0.3:.3f}', '-i', q]
        wb = s.get('wb')
        if wb is not None and not (isinstance(wb, (int, float)) and 3500 <= wb <= 9000):
            raise Fehler(f'shots[{i}].wb (Weissabgleich in Kelvin) muss zwischen 3500 und 9000 liegen; kleiner = wärmer')
        wbf = f"colortemperature=temperature={int(wb)}," if wb else ''
        fit = s.get('fit', 'crop')
        if fit not in ('crop', 'blur'):
            raise Fehler(f'shots[{i}].fit muss crop oder blur sein')
        if fit == 'blur':
            # Querformat-Quelle ohne harten Beschnitt: ganzes Bild auf 1080 Breite, Rest als abgedunkelte, weichgezeichnete Vergrösserung desselben Bildes
            v = (f"[{i}:v]fps={FPS},trim=duration={span:.3f},setpts=(PTS-STARTPTS)/{tempo},hqdn3d=1.4:1.4:3:3,split=2[a{i}][b{i}];"
                 f"[a{i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=45,eq=brightness=-0.14:saturation=1.15[g{i}];"
                 f"[b{i}]scale=1080:-2:flags=lanczos[f{i}];[g{i}][f{i}]overlay=(W-w)/2:(H-h)/2,")
        else:
            v = (f"[{i}:v]fps={FPS},trim=duration={span:.3f},setpts=(PTS-STARTPTS)/{tempo},hqdn3d=1.4:1.4:3:3,crop={cw}:{ch}:{cx}:{cy},"
                 f"scale=1620:2880:flags=lanczos,")
            if z:
                v += f"zoompan={z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps={FPS},"
            else:
                v += "scale=1080:1920:flags=lanczos,"
        v += f"{wbf}cas=strength=0.5,eq=contrast=1.05:saturation=1.10,setsar=1,fps={FPS},trim=duration={d:.3f},setpts=PTS-STARTPTS,format=yuv420p[v{i}]"
        kette.append(v)
        namen.append(f'v{i}')
        grenzen.append((t0, t0 + d, s.get('text', '')))
        t0 += d
    kette.append(''.join(f'[{n}]' for n in namen) + f'concat=n={len(namen)}:v=1:a=0[vc]')

    def txt(name, inhalt):
        p = os.path.join(work, name)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(inhalt)
        return p

    stufen = []
    fh, ft, fe = font('hook'), font('text'), font('end')
    ha = "if(lt(t,0.35),(t-0.15)/0.2,if(gt(t,2.45),(2.7-t)/0.25,1))"
    for zeile, (key, y0) in enumerate((('hook1', 360), ('hook2', 480))):
        if not clip.get(key):
            continue
        p = txt(f'{key}.txt', clip[key])
        stufen.append(f"drawtext=fontfile={fh}:textfile={p}:fontsize=96:fontcolor=white:borderw=7:bordercolor=black:shadowcolor=black@0.55:shadowx=0:shadowy=6:"
                      f"x=(w-text_w)/2:y='{y0}+34*(1-min(1,max(0,(t-0.15)/0.25)))':enable='between(t,0.15,2.7)':alpha='{ha}'")
    es = total - 2.0
    for i, (a, b, text) in enumerate(grenzen):
        if not text:
            continue
        p = txt(f'text{i}.txt', text)
        a2, b2 = a + 0.12, min(b - 0.10, es - 0.05)     # Kernaussagen nie unter der Endkarte
        a2 = max(a2, 2.8)                # nie gleichzeitig mit dem Hook
        if b2 - a2 < 0.8:
            continue
        al = f"if(lt(t,{a2:.2f}+0.2),(t-{a2:.2f})/0.2,if(gt(t,{b2:.2f}-0.15),({b2:.2f}-t)/0.15,1))"
        stufen.append(f"drawtext=fontfile={ft}:textfile={p}:fontsize=66:fontcolor=white:borderw=6:bordercolor=black:shadowcolor=black@0.5:shadowx=0:shadowy=5:"
                      f"x=(w-text_w)/2:y=1200:enable='between(t,{a2:.2f},{b2:.2f})':alpha='{al}'")
    pe = txt('end.txt', clip.get('endzeile', 'LuxeStyle · luxestyle.ch'))
    stufen.append(f"drawtext=fontfile={fe}:textfile={pe}:fontsize=56:fontcolor=white:borderw=3:bordercolor=black@0.7:box=1:boxcolor=black@0.58:boxborderw=26:"
                  f"x=(w-text_w)/2:y=1370:enable='gte(t,{es:.2f})':alpha='if(lt(t,{es:.2f}+0.3),(t-{es:.2f})/0.3,1)'")
    stufen.append(f"fade=t=out:st={total - 0.45:.2f}:d=0.45,format=yuv420p")
    kette.append('[vc]' + ','.join(stufen) + '[v]')
    n = len(shots)
    eingaben += ['-ss', f"{mstart + takt['phase']:.3f}", '-t', f'{total + 1:.2f}', '-i', mpfad]
    kette.append(f"[{n}:a]atrim=duration={total:.3f},asetpts=PTS-STARTPTS,loudnorm=I={LUFS}:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.3,afade=t=out:st={total - 0.9:.2f}:d=0.9,aresample=48000,atrim=duration={total:.3f}[a]")
    skript = os.path.join(work, 'graph.txt')
    with open(skript, 'w', encoding='utf-8') as f:
        f.write(';\n'.join(kette))
    info = dict(id=clip['id'], bpm=round(takt['bpm'], 1), takt_sicher=takt['sicher'], konfidenz=round(takt['konf'], 2), phase=round(takt['phase'], 3), gesamt_s=round(total, 3),
                dauern=[round(d, 3) for d in dauern], musik=musik)
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-nostdin', '-y'] + eingaben + ['-filter_complex_script', skript, '-map', '[v]', '-map', '[a]', '-t', f'{total:.3f}',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart',
           '-metadata', f"title=LuxeStyle {clip['id']} - TikTok", out]
    if trocken:
        print(json.dumps(info, ensure_ascii=False))
        print(open(skript, encoding='utf-8').read())
        return info
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise Fehler('ffmpeg fehlgeschlagen: ' + r.stderr[-800:])
    if musik_log:
        import datetime
        with open(os.path.join(rd, 'musik-log.txt'), 'a', encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}\t{clip['id']}\t{musik}\n")
    print(json.dumps(info, ensure_ascii=False))
    return info


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('plan')
    ap.add_argument('--id', required=True)
    ap.add_argument('--quellen', default='.')
    ap.add_argument('--out', default=None)
    ap.add_argument('--trocken', action='store_true')
    ap.add_argument('--ohne-takt', action='store_true')
    ap.add_argument('--musik-log', action='store_true')
    a = ap.parse_args(argv)
    try:
        plan = json.load(open(a.plan, encoding='utf-8'))
        clip = next((c for c in plan['clips'] if c['id'] == a.id), None)
        if clip is None:
            raise Fehler(f'Clip «{a.id}» nicht im Plan')
        baue(clip, a.quellen, a.out or f'./{a.id}.mp4', mit_takt=not a.ohne_takt, musik_log=a.musik_log, trocken=a.trocken)
    except Fehler as e:
        print(f'FEHLER: {e}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
