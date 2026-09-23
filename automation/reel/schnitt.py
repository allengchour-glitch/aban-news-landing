#!/usr/bin/env python3
"""schnitt.py — Schnitt-Motor fuer LuxeStyle-Reels (23.09.2026, Workflow «videoschnitt-lernen»).

Warum: make_reel.sh spielt jede CJ-Quelle stumpf ab Sekunde 0 in einem 580-px-Band ab (START wird nie gelesen),
schneidet nie selbst und nie auf den Beat, laesst Lieferantentext, Schwarzbilder und Standbild-Dias durch und
wiederholt kurze Quellen per -stream_loop sichtbar. Gemessen (Lernberichte 23.09., dropship/VIDEOSCHNITT-LERNEN.md):
TikTok-Sehdauer Median 1,37 s ueber alle Laengen -> entschieden wird in den ersten 1,5 s; erste Einstellung im
Bestand Median 3,96 s; 13/56 Reels starten fast als Standbild; Produkt fuellt 9-27 % der Flaeche; Schnitte
17 % auf dem Beat (Zufall 24 %).

Stufen (jede einzeln aufrufbar, jede Entscheidung mit Grund im Entscheidungslog):
  analyse(quelle)            -> Einstellungen mit Bewertung (Schaerfe, Bewegung, Helligkeit, Fremdtext/Wasserzeichen,
                                 eingefroren/schwarz/Leerlauf), Seitenverhaeltnis, Ton. Cache: <quelle>.schnitt.json
  plan(analyse, musik, ziel) -> Schnittliste auf dem Beat-Raster: Hook (staerkste Einstellung, nicht die erste) zuerst,
                                 Laengen nach den gelernten Regeln, kein Fremdtext, keine Wiederholung, Loop-Ende.
  render(plan, out, text)    -> MP4 1080x1920, 30 fps, H.264 yuv420p + AAC 48 kHz Stereo, Ton zweistufig -14 LUFS /
                                 TP -1.5; Smart-Crop-Vollbild wenn die Quelle es hergibt, sonst Unschaerfe-Band;
                                 Text nur als PNG (Bausteine aus overlay.py) in der sicheren Zone; keine Stimme.
  kontaktbogen(video)        -> JPG: erste Sekunde in 6 Bildern + 1 Bild/s (Sichtpruefung per Read).

CLI:
  schnitt.py --analyse QUELLE
  schnitt.py --plan QUELLE --musik STUECK [--ziel 12] [--einstieg SEK]
  schnitt.py --render QUELLE --musik STUECK --out DATEI [--einstieg SEK] [--titel Z1 --titel2 Z2 --preis "CHF 19.90"
             --hook "Produkt: Nutzen"] [--zone organisch|meta] [--log DATEI.json] [--dry] [--json]
  schnitt.py --kontaktbogen VIDEO [--bogen-out BILD.jpg]
  Exit-Codes: 0 ok · 3 Quelle ungeeignet (Grund auf stdout, eine Zeile «UNGEEIGNET: …») · 1 Fehler (stderr).

SCHNITTSTELLE fuer den Reel-Motor (cj_video_reel_engine.mjs — hier NICHT geaendert; so soll er es spaeter aufrufen):
  Statt make_reel.sh:
    const r = spawnSync('python3', ['automation/reel/schnitt.py', '--render', src, '--musik', musik,
        '--einstieg', String(mw.start), '--out', out, '--titel', z1, '--titel2', z2,
        '--preis', `CHF ${k.price.toFixed(2)}`, '--hook', hook, '--json'], { encoding: 'utf8', timeout: 300000 });
    r.status === 0 -> letzte stdout-Zeile ist JSON {ok, out, dauer, frames, modus, log, pruefung};
                      Entscheidungslog liegt in <out>.schnitt.json (mit dem Reel archivieren, NICHT ins Repo).
    r.status === 3 -> Quelle ungeeignet (Fremdtext/Wasserzeichen/zu wenig sauberes Material): naechsten CJ-Clip des
                      Produkts versuchen (queryVideosByProductId liefert im Schnitt 2,4 Clips), sonst Produkt ins
                      Ledger «schnitt-ungeeignet» — NIE auf make_reel.sh zurueckfallen (das wuerde den Fremdtext posten).
    sonst          -> Fehler, Reel verwerfen, naechster Lauf.
  Preis kommt live aus Shopify (k.price), Hook aus hookFuer() (<= 24 Zeichen, Produktwort + Nutzen). Musik aus
  musikWahl() (nur eigene Stuecke); schnitt.py rastet den Einstieg auf den naechsten Beat ein.
  Lange Quellen analysiert der Motor am besten vorab: `--analyse` ist idempotent (Cache) und kostet ~10-40 s.

Umgebung: SCHNITT_TESSDATA=<ordner mit chi_sim.traineddata> (sonst kein CJK-OCR, nur Hinweis im Log),
          SCHNITT_THREADS (Standard 2). Nur vorhandene Bibliotheken: numpy, scipy, PIL, librosa, pytesseract, PyAV.
"""
import argparse, copy, hashlib, json, math, os, re, shutil, subprocess, sys, tempfile, time

os.environ.setdefault('OMP_THREAD_LIMIT', '1')   # tesseract: sonst frisst er alle Kerne (Werkzeug-Lehre 23.09.)
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, '..', '..'))
MUSIK_DIR = os.path.join(REPO, 'automation', 'music')
sys.path.insert(0, HIER)
import overlay as ov  # noqa: E402  (nur Bausteine importieren: font, spaced, wrap, text_cx, Konstanten — NICHT aendern)

FF = shutil.which('ffmpeg') or 'ffmpeg'
THREADS = str(os.environ.get('SCHNITT_THREADS', '2'))
W, H, FPS = 1080, 1920, 30
VERSION = 7
CC_BY = {'voltaic.mp3', 'electrodoodle.mp3', 'digital-lemonade.mp3'}   # CREDITS.txt: Quellenangabe in jeder Caption
# BPM-Rueckfall, falls CREDITS.txt kein Tempo nennt (GEMESSEN Inventur 23.09.; liquid-dnb-electronic = DnB-Variante)
BPM_RUECKFALL = {'luxe-cinematic-house.wav': 122, 'luxe-liquid-dnb-electronic.wav': 174}
MARKEN = re.compile(r'\b(CHANEL|GUCCI|PRADA|DIOR|VUITTON|HERMES|ROLEX|NIKE|ADIDAS|PORSCHE|BALENCIAGA|VERSACE|'
                    r'CJDROPSHIPPING|DROPSHIPPING|TIKTOK|TEMU|ALIEXPRESS|TAOBAO|AMAZON|SHEIN|ALIBABA|1688)\b', re.I)
CJK_EINFACH = set('一二三十丨卜乙八入口日中大人了小上下丁厂')


class Ungeeignet(Exception):
    """Quelle taugt nicht fuer ein sauberes Reel (Exit 3)."""


# ------------------------------------------------------------------------------------------------ Hilfen
def _r(x, n=3):
    return float(round(float(x), n))


def _run(args, text=True):
    r = subprocess.run(args, capture_output=True, text=text)
    if r.returncode:
        raise RuntimeError(f"{os.path.basename(args[0])} {r.returncode}: {(r.stderr if text else r.stderr.decode('utf8', 'ignore'))[-900:]}")
    return r


def info(p, video=True):
    """Echte Stream-Daten. /usr/local/bin/ffprobe ist hier ein Python-Ersatz, der NUR die Dauer liefert
    (GEMESSEN 23.09.) -> PyAV, Rueckfall Kopfzeile von `ffmpeg -i`."""
    d = dict(pfad=p, dauer=0.0, w=0, h=0, fps=25.0, ton=False, ar=None, kanaele=None, rotation=0)
    try:
        import av
        with av.open(p) as c:
            v = [s for s in c.streams if s.type == 'video']
            a = [s for s in c.streams if s.type == 'audio']
            if v:
                d.update(w=v[0].codec_context.width, h=v[0].codec_context.height,
                         fps=float(v[0].average_rate or 25) or 25.0)
            d['dauer'] = (c.duration or 0) / 1e6
            if a:
                d.update(ton=True, ar=a[0].codec_context.sample_rate, kanaele=a[0].codec_context.channels)
    except Exception:
        pass
    e = subprocess.run([FF, '-hide_banner', '-i', p], capture_output=True, text=True).stderr
    if not d['w'] and video:
        m = re.search(r'Video:.*?(\d{2,5})x(\d{2,5})', e)
        f = re.search(r'([\d.]+) fps', e)
        if not m:
            raise RuntimeError(f'kein Videostrom: {p}')
        d.update(w=int(m[1]), h=int(m[2]), fps=float(f[1]) if f else 25.0, ton='Audio:' in e)
    if not d['dauer']:
        m = re.search(r'Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)', e)
        if m:
            d['dauer'] = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    rot = re.search(r'rotation of (-?[\d.]+)', e) or re.search(r'rotate\s*:\s*(-?\d+)', e)
    if rot and abs(float(rot[1])) % 180 == 90:          # ffmpeg dreht beim Dekodieren -> Masse tauschen
        d['w'], d['h'], d['rotation'] = d['h'], d['w'], int(float(rot[1]))
    return d


def bilder(p, fps=None, lang=None, kurz=None, grau=False, start=None, dauer=None, i=None):
    """Einzelbilder als numpy (n,h,w[,3]). fps=None = Originalrate. Bild k liegt bei start + k/fps."""
    i = i or info(p)
    s = (lang / max(i['w'], i['h'])) if lang else (kurz / min(i['w'], i['h'])) if kurz else 1.0
    ow = max(2, int(round(i['w'] * s / 2)) * 2); oh = max(2, int(round(i['h'] * s / 2)) * 2)
    vf = ([f'fps={fps}'] if fps else []) + [f'scale={ow}:{oh}:flags=area']
    cmd = [FF, '-v', 'error', '-threads', THREADS]
    if start:
        cmd += ['-ss', f'{start:.3f}']
    cmd += ['-i', p]
    if dauer:
        cmd += ['-t', f'{dauer:.3f}']
    cmd += ['-an', '-sn', '-vf', ','.join(vf), '-f', 'rawvideo', '-pix_fmt', 'gray' if grau else 'rgb24', '-']
    raw = _run(cmd, text=False).stdout
    c = 1 if grau else 3
    a = np.frombuffer(raw, np.uint8); n = a.size // (ow * oh * c)
    return a[:n * ow * oh * c].reshape((n, oh, ow) if grau else (n, oh, ow, 3))


def bild_bei(p, t, kurz=540, i=None):
    i = i or info(p)
    A = bilder(p, kurz=kurz, grau=True, start=max(0.0, t), dauer=0.2, i=i)
    return A[0] if len(A) else None


# ------------------------------------------------------------------------------------------------ Text/OCR
def textboxen(gray, edge_thr=180):
    """Textartige Zeilen (Einblendungen jeder Schrift), kurze Seite ~540 px, ~44 ms/Bild.
    GEMESSEN Labor 23.09.: englische Bilder 16/19, chinesische 5/11, saubere 4/30 (LED-Ziffern, Sternenhimmel)."""
    g = gray.astype(np.float32); gx = nd.sobel(g, 1); gy = nd.sobel(g, 0)
    E = np.hypot(gx, gy) > edge_thr; V = np.abs(gx) > edge_thr
    M = nd.binary_opening(nd.binary_closing(E, structure=np.ones((3, 11))), structure=np.ones((2, 2)))
    lab, _ = nd.label(M); out = []
    for k, sl in enumerate(nd.find_objects(lab), 1):
        if sl is None:
            continue
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if not (7 <= h <= 70 and w >= 2 * h and w >= 24):
            continue
        if E[sl].mean() >= 0.22 and V[sl].mean() >= 0.12 and (lab[sl] == k).mean() >= 0.55:
            out.append((sl[1].start, sl[0].start, w, h))
    return out


def hat_text(gray):
    B = textboxen(gray)
    return len(B) >= 2 or sum(b[2] * b[3] for b in B) / gray.size > 0.004


def tessdata_cjk():
    for d in [os.environ.get('SCHNITT_TESSDATA', ''), '/tmp/schnitt_tessdata', '/usr/share/tesseract-ocr/5/tessdata']:
        if d and os.path.isfile(os.path.join(d, 'chi_sim.traineddata')) and \
                os.path.getsize(os.path.join(d, 'chi_sim.traineddata')) > 1_000_000:   # 378-Byte-Fehler-JSON (Labor-Falle)
            return d
    return None


def ocr(gray, lang='eng', tessdir=None):
    """Woerter mit conf und Box (Bildpixel). --psm 11 = verstreuter Text (Einblendungen)."""
    import pytesseract
    cfg = '--psm 11' + (f' --tessdata-dir {tessdir}' if tessdir else '')
    try:
        d = pytesseract.image_to_data(Image.fromarray(gray), lang=lang, config=cfg, output_type=pytesseract.Output.DICT)
    except Exception:
        return []
    out = []
    for t, c, x, y, w, h in zip(d['text'], d['conf'], d['left'], d['top'], d['width'], d['height']):
        t = (t or '').strip()
        try:
            c = float(c)
        except Exception:
            c = -1
        if t and c >= 0:
            out.append((t, c, int(x), int(y), int(w), int(h)))
    return out


def fremdtext_woerter(woerter_eng, woerter_cjk):
    """Bewertet OCR-Treffer eines Bildes. Rueckgabe: dict mit lateinischen Woertern, Handles, Marken, CJK-Paaren, Boxen."""
    lat, handles, marken, cjk, boxen = [], [], [], [], []
    for t, c, x, y, w, h in woerter_eng:
        if '@' in t and c >= 50 and re.search(r'@[\w.]{3,}', t):
            handles.append(t); boxen.append((x, y, w, h))
        if c >= 60 and re.search(r'(www\.|\.com\b|\.cn\b)', t, re.I):
            handles.append(t); boxen.append((x, y, w, h))
        m = re.sub(r'[^A-Za-zÄÖÜäöüß]', '', t)
        if c >= 60 and MARKEN.search(t):
            marken.append(t); boxen.append((x, y, w, h))
        elif c >= 75 and len(m) >= 4 and re.search(r'[aeiouyAEIOUY]', m):
            lat.append(m.lower()); boxen.append((x, y, w, h))
    for t, c, x, y, w, h in woerter_cjk:
        z = [ch for ch in t if '一' <= ch <= '鿿' and ch not in CJK_EINFACH]
        if c >= 80 and len(z) >= 2:
            cjk.append(''.join(z)); boxen.append((x, y, w, h))
    return dict(lat=lat, handles=handles, marken=marken, cjk=cjk, boxen=boxen)


def statische_ebene(G, pers=0.85, std_max=12, min_px=150):
    """Eingebrannte Logos/Texte: Kante in >=85 % der Bilder UND Pixel zeitlich ruhig (Labor: 0 Fehlalarme auf 9 Videos)."""
    g = G.astype(np.float32)
    E = np.stack([np.hypot(nd.sobel(x, 1), nd.sobel(x, 0)) > 100 for x in g])
    M = nd.binary_dilation((E.mean(axis=0) >= pers) & (g.std(axis=0) <= std_max), iterations=3)
    lab, _ = nd.label(M); boxes = []
    for k, sl in enumerate(nd.find_objects(lab), 1):
        if (lab[sl] == k).sum() >= min_px:
            boxes.append((sl[1].start, sl[0].start, sl[1].stop - sl[1].start, sl[0].stop - sl[0].start))
    return boxes


def _box_schnitt(a, b, rand=0):
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    return not (ax + aw + rand <= bx or bx + bw + rand <= ax or ay + ah + rand <= by or by + bh + rand <= ay)


def _boxen_vereinen(boxen, rand=6, maxn=40):
    B = [list(b) for b in boxen]
    geaendert = True
    while geaendert and len(B) > 1:
        geaendert = False
        for i in range(len(B)):
            for j in range(i + 1, len(B)):
                if _box_schnitt(B[i], B[j], rand):
                    x0 = min(B[i][0], B[j][0]); y0 = min(B[i][1], B[j][1])
                    x1 = max(B[i][0] + B[i][2], B[j][0] + B[j][2]); y1 = max(B[i][1] + B[i][3], B[j][1] + B[j][3])
                    B[i] = [x0, y0, x1 - x0, y1 - y0]; del B[j]; geaendert = True
                    break
            if geaendert:
                break
    return [tuple(int(v) for v in b) for b in sorted(B, key=lambda b: -b[2] * b[3])[:maxn]]


# ------------------------------------------------------------------------------------------------ Intervalle
def _abziehen(iv, loecher):
    """[a,b] minus Loecher -> Liste von Intervallen."""
    out = [list(iv)]
    for la, lb in sorted(loecher):
        neu = []
        for a, b in out:
            if lb <= a or la >= b:
                neu.append([a, b])
            else:
                if la > a:
                    neu.append([a, la])
                if lb < b:
                    neu.append([lb, b])
        out = neu
    return [[_r(a), _r(b)] for a, b in out if b - a > 1e-3]


def _laeufe(maske, dt, t0=0.0, min_s=0.0):
    """True-Laeufe einer Bildmaske -> [[a,b]] in Sekunden (nur Laeufe >= min_s)."""
    out = []; i = 0; n = len(maske)
    while i < n:
        if maske[i]:
            j = i
            while j < n and maske[j]:
                j += 1
            a, b = t0 + i * dt, t0 + j * dt
            if b - a >= min_s - 1e-9:
                out.append([_r(a), _r(b)])
            i = j
        else:
            i += 1
    return out


# ================================================================================================ 1 ANALYSE
def _cache_pfad(quelle):
    return quelle + '.schnitt.json'


def _fingerabdruck(quelle):
    st = os.stat(quelle)
    return f'{st.st_size}-{int(st.st_mtime)}-v{VERSION}'


def analyse(quelle, cache=True, cache_pfad=None, ocr_an=True):
    """Einstellungen + Bewertung. Ergebnis wird als JSON neben der Quelle gecacht (<quelle>.schnitt.json)."""
    cp = cache_pfad or _cache_pfad(quelle)
    fa = _fingerabdruck(quelle)
    if cache and os.path.exists(cp):
        try:
            d = json.load(open(cp))
            if d.get('fingerabdruck') == fa:
                d['aus_cache'] = True
                return d
        except Exception:
            pass
    T = {}; t00 = time.time()
    i = info(quelle)
    if i['dauer'] < 1.0 or i['w'] < 16:
        raise Ungeeignet(f"Quelle zu kurz oder leer ({i['dauer']:.2f} s, {i['w']}x{i['h']})")
    dur = i['dauer']; hw_ = i['h'] / i['w']
    fmt = 'hochkant' if hw_ >= 1.2 else ('quadrat' if hw_ >= 0.85 else 'quer')

    # (a) harte Schnitte aus dem scene-Wert JEDES Bildes: absolut >= 0.2 (Labor: 26/28 Schnitte, 0 Fehlalarme) ODER
    #     relativ: >= 0.08 und >= 6x Median der +-12 Nachbarbilder. GEMESSEN p3 (23.09.): Kamerawechsel zwischen
    #     aehnlichen Blickwinkeln bei 9,16 s hatte scene 0,167 (Nachbarn 0,02) -> mit 0.2 verpasst; der Hook landete genau
    #     auf dem Sprung (der Sprung zaehlte als «Bewegung») und das Loop-Ende lag auf der anderen Seite des Schnitts.
    #     Ein zusaetzlicher Schnitt schadet kaum (Einstellung wird kuerzer), ein verpasster schon.
    t0 = time.time()
    out = _run([FF, '-hide_banner', '-nostats', '-threads', THREADS, '-i', quelle, '-vf',
                "select='gte(scene,0)',metadata=print:file=-", '-an', '-f', 'null', '-']).stdout
    st_, ss_ = [], []
    cur = None
    for zeile in out.splitlines():
        m = re.search(r'pts_time:([\d.]+)', zeile)
        if m:
            cur = float(m[1]); continue
        m = re.search(r'scene_score=([\d.]+)', zeile)
        if m and cur is not None:
            st_.append(cur); ss_.append(float(m[1]))
    ss_ = np.asarray(ss_); st_ = np.asarray(st_)
    medn = nd.median_filter(ss_, size=25, mode='nearest') if len(ss_) else ss_
    # Nachbar-Test: CJ-Quellen haben oft jedes 2. Bild doppelt (scene 0,000), dann ist das naechste Bild ein
    # «Doppelschritt» — gegen den Median ein Ausreisser, gegen die Nachbarn nicht. GEMESSEN 23.09.: nur Median-Test
    # -> p1 74 statt 21 Einstellungen, p4 (eine Kamerafahrt) 7 Schnitte; mit Nachbar-Test p1 +1, p4 +1 (Ruckler), p3 +2.
    nachb = np.array([max(np.concatenate([ss_[max(0, k - 3):k], ss_[k + 1:k + 4]]) if len(ss_) > 1 else 0) for k in range(len(ss_))])
    kand_idx = [k for k in range(len(ss_)) if ss_[k] >= 0.2 or (ss_[k] >= 0.08 and ss_[k] >= 6 * max(medn[k], 0.002)
                                                              and ss_[k] >= 4 * nachb[k])]
    # schwache Spruenge (0,12-0,2): moeglicher Wechsel zwischen aehnlichen Blickwinkeln (GEMESSEN p3 9,16 s: 0,167, im
    # 15-fps-Bewegungsprofil nicht vom Handgewackel zu trennen). Kein Schnitt, aber der Hook beginnt nie darauf
    # (sonst liegt das nahtlose Loop-Ende auf der anderen Seite eines Kamerawechsels).
    verdacht = [float(st_[k]) for k in range(len(ss_)) if 0.12 <= ss_[k] and k not in set(kand_idx)]
    roh = []
    for k in kand_idx:                                    # Treffer < 0,1 s: nur den staerksten behalten
        if roh and st_[k] - roh[-1][0] <= 0.1:
            if ss_[k] > roh[-1][1]:
                roh[-1] = (float(st_[k]), float(ss_[k]))
            continue
        roh.append((float(st_[k]), float(ss_[k])))
    hart = [t for t, _ in roh if 0.1 < t < dur - 0.1]
    T['schnitte'] = _r(time.time() - t0, 2)

    # (b) 15 fps / 160 px: Bewegung (MAD, Skala wie Handwerk-Messung: Bestandsmedian 4,27), Helligkeit, Schwarz, Histogramm
    t0 = time.time()
    A = bilder(quelle, fps=15, lang=160, i=i); dt = 1 / 15
    g = A.astype(np.float32).mean(axis=3)
    n15 = len(g)
    mot = np.zeros(n15)
    if n15 > 1:
        mot[1:] = np.abs(g[1:] - g[:-1]).mean(axis=(1, 2)); mot[0] = mot[1]
    hell = g.mean(axis=(1, 2)); kontr = g.std(axis=(1, 2))
    schwarz = (g < 26).mean(axis=(1, 2)) >= 0.98            # blackdetect pix_th=0.10, pic_th=0.98
    mot_s = nd.uniform_filter1d(mot, 6) if n15 >= 6 else mot   # 0,4 s geglaettet
    q = (A // 32).reshape(n15, -1, 3).astype(np.int32)
    Hs = np.stack([np.bincount(x[:, 0] * 64 + x[:, 1] * 8 + x[:, 2], minlength=512) for x in q]).astype(np.float32)
    Hs /= Hs.sum(axis=1, keepdims=True)
    Wn = 4
    hwd = np.array([0.5 * np.abs(Hs[min(n15 - 1, k + Wn)] - Hs[max(0, k - Wn)]).sum() for k in range(n15)])
    T['bewegung'] = _r(time.time() - t0, 2)

    # (c) weiche Uebergaenge (Ueberblendung/Wischer): Fenster-Histogramm > 0.5 (Labor: q8-Ueberblendungen 0.55-0.96,
    #     scene pro Bild < 0.06 -> fuer select unsichtbar). Lokale Maxima, >0.8 s voneinander und >0.5 s von harten Schnitten.
    weich = []
    for k in np.argsort(-hwd):
        if hwd[k] < 0.5:
            break
        t = k * dt
        if t < 0.3 or t > dur - 0.3:
            continue
        if any(abs(t - h) < 0.5 for h in hart) or any(abs(t - w) < 0.8 for w in weich):
            continue
        weich.append(_r(t))
    weich.sort()
    # Verfeinern: liegt im +-0,4-s-Fenster einer Histogramm-Grenze ein einzelnes Bild mit scene-Spitze (>= 3x die
    # Nachbarn +-3 ohne das Echo-Bild k+1), ist es ein harter Schnitt mit farbgleicher Helligkeit -> exakt dort.
    # GEMESSEN Selbsttest: Schnitt bei 2,0 s (Farbdrehung + Spiegelung) scene 0,088 bei Nachbarn 0,0005/Echo 0,0226;
    # ohne Verfeinerung lag die Grenze 4 Bilder zu frueh (Plateau des Fensters). Das Echo NICHT global auszunehmen:
    # p1 (Handkamera, doppelte Bilder) bekaeme dann 13 Scheinschnitte mehr.
    weich_neu = []
    for t in weich:
        idx = np.nonzero((st_ >= t - 0.4) & (st_ <= t + 0.4))[0] if len(st_) else []
        k = int(idx[np.argmax(ss_[idx])]) if len(idx) else -1
        if k >= 0:
            nb2 = np.concatenate([ss_[max(0, k - 3):k], ss_[k + 2:k + 4]])
            if ss_[k] >= 0.02 and ss_[k] >= 3 * (nb2.max() if len(nb2) else 0) and \
                    all(abs(st_[k] - h) > 0.1 for h in hart):
                hart.append(float(st_[k])); continue
        # echtes Ueberblenden: Grenze in die Mitte des Plateaus
        k0 = int(round(t / dt)); lo, hi = max(0, k0 - 2 * Wn), min(n15, k0 + 2 * Wn + 1)
        plateau = [j for j in range(lo, hi) if hwd[j] >= 0.9 * hwd[k0]]
        weich_neu.append(_r(np.mean(plateau) * dt) if plateau else t)
    weich = sorted(weich_neu); hart = sorted(hart)

    # (d) Schwarz- und Standbild-Strecken
    schwarz_iv = _laeufe(schwarz, dt, min_s=0.2)
    einfr_iv = _laeufe(mot < 0.35, dt, min_s=0.8)                 # freezedetect-Aequivalent (Kritik: |Δ|<0,35 > 0,8 s)
    leer_iv = _laeufe(mot_s < 2.0, dt, min_s=0.8)                 # Leerlauf-Regel Handwerk (< 2/255 laenger als 0,8 s)

    # (e) 4 fps / 320 px: Schaerfe (Laplace-Varianz relativ zum Video-Median), Crop-Energie, Balken
    t0 = time.time()
    B4 = bilder(quelle, fps=4, lang=320, i=i)
    g4 = B4.astype(np.float32).mean(axis=3)
    sharp = np.array([nd.laplace(x).var() for x in g4]) if len(g4) else np.zeros(0)
    rel = sharp / max(1e-6, float(np.median(sharp))) if len(sharp) else sharp
    mot4 = np.interp(np.arange(len(g4)) / 4, np.arange(n15) * dt, mot) if len(g4) else np.zeros(0)
    unscharf4 = (rel < 0.3) & (mot4 > 1.5 * max(0.3, float(np.median(mot))))   # Labor: trifft genau die Wisch-Uebergaenge
    sx4 = i['w'] / g4.shape[2] if len(g4) else 1.0
    T['schaerfe'] = _r(time.time() - t0, 2)

    # (f) 2 fps / kurze Seite 540: Text-Heuristik; OCR je 1 s (eng; chi_sim je 2 s, falls Sprachdaten vorhanden)
    t0 = time.time()
    G2 = bilder(quelle, fps=2, kurz=540, grau=True, i=i)
    sx2 = i['w'] / G2.shape[2] if len(G2) else 1.0
    heur = [textboxen(x) for x in G2]
    text2 = np.array([len(B) >= 2 or sum(b[2] * b[3] for b in B) / x.size > 0.004 for B, x in zip(heur, G2)]) \
        if len(G2) else np.zeros(0, bool)
    tess = tessdata_cjk() if ocr_an else None
    ocr_bilder = {}
    if ocr_an and len(G2):
        idx = list(range(0, len(G2), 2))
        if len(idx) > 60:                                          # Deckel: sehr lange Quellen gleichmaessig ausduennen
            idx = sorted(set(int(round(x)) // 2 * 2 for x in np.linspace(0, len(G2) - 1, 60)))
        for k in idx:
            we = ocr(G2[k], 'eng')
            wc = ocr(G2[k], 'chi_sim', tess) if (tess and (k // 2) % 2 == 0) else []
            ocr_bilder[k] = fremdtext_woerter(we, wc)
    T['text_ocr'] = _r(time.time() - t0, 2)

    # (g) statische Ebene (Wasserzeichen/Eck-Logo): nur kleine Boxen am Rand oder mit OCR-Buchstaben zaehlen
    #     (grosse ruhige Kanten sind bei Stativ-Clips das Produkt selbst)
    logos = []
    if len(G2) >= 6:
        Gs = G2[:, ::2, ::2]
        for (x, y, w, h) in statische_ebene(Gs):
            X, Y, Wb, Hb = [int(v * sx2 * 2) for v in (x, y, w, h)]
            flaeche = Wb * Hb / (i['w'] * i['h'])
            am_rand = X < 0.2 * i['w'] or X + Wb > 0.8 * i['w'] or Y < 0.2 * i['h'] or Y + Hb > 0.8 * i['h']
            mit_ocr = any(_box_schnitt((X, Y, Wb, Hb), tuple(int(v * sx2) for v in b))
                          for fb in ocr_bilder.values() for b in fb['boxen'])
            duenn = min(Wb, Hb) < 20 or (max(Wb, Hb) / max(1, min(Wb, Hb)) > 8 and am_rand)
            if duenn:
                continue        # Randlinie/Rahmen der Quelle (GEMESSEN p4: 10x558-px-Streifen an x=0), kein Logo
            if flaeche < 0.12 and (am_rand or mit_ocr):
                logos.append(dict(box=[X, Y, Wb, Hb], flaeche=_r(flaeche, 4), am_rand=bool(am_rand), ocr=bool(mit_ocr)))

    # (h) Ton (Quellton wird nie verwendet — nur zur Doku)
    ton = dict(vorhanden=bool(i['ton']), mittel_db=None)
    if i['ton']:
        e = subprocess.run([FF, '-hide_banner', '-nostats', '-i', quelle, '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
        m = re.search(r'mean_volume:\s*(-?[\d.]+)', e)
        ton['mittel_db'] = float(m[1]) if m else None

    # (i) Einstellungen
    intern = [(t, 'hart') for t in hart] + [(t, 'weich') for t in weich]
    for a, b in schwarz_iv:
        intern += [(a, 'schwarz'), (b, 'schwarz')]
    zus = [(0.0, 'anfang')]
    for t, art in sorted(intern):
        if t - zus[-1][0] < 0.15 or dur - t < 0.15:
            continue
        zus.append((_r(t), art))
    zus.append((_r(dur), 'ende'))
    # Rand an Einstellungsgrenzen: der Anfang ist ab dem Schnittbild sicher (-ss liefert das erste Bild mit pts >= Start),
    # am Ende tastet fps=30 das letzte Bild 1/30 s VOR dem Stueckende ab -> 0,02 s genuegen. GEMESSEN p2: mit
    # 0,08/0,08 blieben von ~1-s-Einstellungen 0,84-0,92 s und kein 2-Schlag-Stueck (0,98 s) passte. Der Selbsttest
    # prueft jedes Ausgabebild gegen seine Soll-Einstellung (kein Aufblitzen der Nachbar-Einstellung).
    rand_a = {'anfang': 0.01, 'hart': 0.01, 'weich': 0.32, 'schwarz': 0.08}
    rand_e = {'ende': 0.04, 'hart': 0.02, 'weich': 0.32, 'schwarz': 0.08}
    unscharf_iv = []
    for k in np.nonzero(unscharf4)[0]:
        unscharf_iv.append([max(0.0, k / 4 - 0.2), k / 4 + 0.2])
    einst = []
    for k in range(len(zus) - 1):
        (a, ga), (b, gb) = zus[k], zus[k + 1]
        if b - a < 0.05:
            continue
        s15 = slice(int(round(a / dt)), max(int(round(a / dt)) + 1, int(round(b / dt))))
        s4 = slice(int(a * 4), max(int(a * 4) + 1, int(np.ceil(b * 4))))
        s2 = slice(int(a * 2), max(int(a * 2) + 1, int(np.ceil(b * 2))))
        e = dict(id=len(einst), start=_r(a), ende=_r(b), dauer=_r(b - a), grenze_start=ga, grenze_ende=gb)
        e['bewegung'] = _r(mot[s15].mean() if len(mot[s15]) else 0, 2)
        e['bewegung_erste_s'] = _r(mot[s15][:15].mean() if len(mot[s15]) else 0, 2)
        e['hell'] = _r(hell[s15].mean() if len(hell[s15]) else 0, 1)
        e['kontrast'] = _r(kontr[s15].mean() if len(kontr[s15]) else 0, 1)
        e['schaerfe_rel'] = _r(np.median(rel[s4]) if len(rel[s4]) else 0, 2)
        e['schwarz_anteil'] = _r(schwarz[s15].mean() if len(schwarz[s15]) else 0, 2)
        e['eingefroren_anteil'] = _r((mot[s15] < 0.35).mean() if len(mot[s15]) else 0, 2)
        e['leerlauf_anteil'] = _r((mot_s[s15] < 2.0).mean() if len(mot_s[s15]) else 0, 2)
        e['unscharf_anteil'] = _r(unscharf4[s4].mean() if len(unscharf4[s4]) else 0, 2)
        e['text_anteil'] = _r(text2[s2].mean() if len(text2[s2]) else 0, 2)
        # OCR je Einstellung
        lat, han, mar, cjk, bx, proben = set(), set(), set(), set(), [], 0
        for kk, fb in ocr_bilder.items():
            if a - 0.01 <= kk / 2 < b:
                proben += 1
                lat |= set(fb['lat']); han |= set(fb['handles']); mar |= set(fb['marken']); cjk |= set(fb['cjk'])
                bx += [tuple(int(v * sx2) for v in b_) for b_ in fb['boxen']]
        if ocr_an and proben == 0 and len(G2):                     # sehr kurze Einstellung: Mitte nachlesen
            kk = min(len(G2) - 1, int((a + b)))                      # 2 fps -> Index = t*2
            fb = fremdtext_woerter(ocr(G2[kk], 'eng'), ocr(G2[kk], 'chi_sim', tess) if tess else [])
            proben = 1; lat |= set(fb['lat']); han |= set(fb['handles']); mar |= set(fb['marken']); cjk |= set(fb['cjk'])
            bx += [tuple(int(v * sx2) for v in b_) for b_ in fb['boxen']]
        gruende = []
        if len(lat) >= 3:
            gruende.append(f"{len(lat)} lateinische Woerter ({', '.join(sorted(lat)[:6])})")
        if han:
            gruende.append(f"Handle/URL ({', '.join(sorted(han)[:3])})")
        if mar:
            gruende.append(f"Fremdmarke ({', '.join(sorted(mar)[:3])})")
        if cjk:
            gruende.append(f"CJK-Zeichen ({', '.join(sorted(cjk)[:3])})")
        for lg in logos:
            gruende.append(f"eingebranntes Logo/Einschub bei {lg['box']}")
            bx.append(tuple(lg['box']))
        # Szenentext in fremder Schrift: die Kanten-Heuristik sieht Textzeilen, OCR liest kein Latein. GEMESSEN p2 (23.09.):
        # chinesische Spuelmittel-Etiketten in Einstellung 7/8 -> Heuristik 0.67/0.25, chi_sim (conf>=85, auch 2x) 0 Treffer;
        # saubere Quellen p1/p3: Heuristik 0.0-0.14.
        e_text = float(text2[s2].mean()) if len(text2[s2]) else 0.0
        if e_text >= 0.2 and len(lat) < 3 and not (han or mar or cjk):
            gruende.append(f"Textzeilen in {e_text:.0%} der Bilder ohne lesbares Latein (Verdacht chinesische/fremde "
                           "Schrift — OCR liest Szenentext nicht)")
            for kk in range(s2.start, min(s2.stop, len(heur))):
                if text2[kk]:
                    bx += [tuple(int(v * sx2) for v in b_) for b_ in heur[kk]]
        e['ocr'] = dict(proben=proben, woerter=sorted(lat)[:20], handles=sorted(han), marken=sorted(mar), cjk=sorted(cjk))
        e['fremdtext'] = bool(gruende)
        e['fremdtext_grund'] = '; '.join(gruende)
        e['text_boxen'] = [list(b_) for b_ in _boxen_vereinen(bx)]
        # Balken (eingebrannt, je Einstellung wie cropdetect reset=1): Randzeilen/-spalten, die in JEDEM Bild dunkel sind
        fr = g4[s4] if len(g4[s4]) else g4[:1]
        mx = fr.max(axis=0) if len(fr) else np.zeros((2, 2))
        zeilen_dunkel = mx.max(axis=1) < 22; spalten_dunkel = mx.max(axis=0) < 22
        def _rand(v):
            a0 = 0
            while a0 < len(v) and v[a0]:
                a0 += 1
            b0 = len(v)
            while b0 > a0 and v[b0 - 1]:
                b0 -= 1
            return a0, b0
        y0, y1 = _rand(zeilen_dunkel); x0, x1 = _rand(spalten_dunkel)
        bal = [int(x0 * sx4), int(y0 * sx4), int((x1 - x0) * sx4), int((y1 - y0) * sx4)]
        gross_genug = (x1 - x0) >= 0.6 * len(spalten_dunkel) and (y1 - y0) >= 0.6 * len(zeilen_dunkel)
        hat_balken = gross_genug and (x0 + len(spalten_dunkel) - x1 >= 0.03 * len(spalten_dunkel) or
                                      y0 + len(zeilen_dunkel) - y1 >= 0.03 * len(zeilen_dunkel))
        e['balken'] = bal if hat_balken and e['schwarz_anteil'] < 0.5 else None
        # Crop-Energie getrennt: Kanten (Text maskiert) und Bewegung, je 64 Spalten-/Zeilen-Bins. Der Plan mischt sie
        # (Bewegung staerker): GEMESSEN Probe p1 23.09. — reine Kantenenergie zog den Ausschnitt auf grosse Pullover-
        # Buchstaben statt auf das Hundegeschirr (Labor-Falle «Kantenenergie zieht zu Gesichtern und Mustern»).
        z = (g4.shape[1], g4.shape[2]) if len(g4) else (64, 64)
        Kx, Ky, Bx, By = np.zeros(z[1]), np.zeros(z[0]), np.zeros(z[1]), np.zeros(z[0])
        for j in range(s4.start, min(s4.stop, len(g4))):
            m = np.hypot(nd.sobel(g4[j], 1), nd.sobel(g4[j], 0))
            for (bx0, by0, bw0, bh0) in textboxen(g4[j], edge_thr=120):
                m[max(0, by0 - 3):by0 + bh0 + 3, max(0, bx0 - 3):bx0 + bw0 + 3] = 0
            Kx += m.sum(axis=0); Ky += m.sum(axis=1)
            if j > s4.start:
                b_ = np.abs(g4[j] - g4[j - 1]); Bx += b_.sum(axis=0); By += b_.sum(axis=1)
        e['kanten_x'] = [_r(v, 4) for v in _bins(Kx, 64)]; e['kanten_y'] = [_r(v, 4) for v in _bins(Ky, 64)]
        e['bewegung_x'] = [_r(v, 4) for v in _bins(Bx, 64)]; e['bewegung_y'] = [_r(v, 4) for v in _bins(By, 64)]
        # nutzbare Teilintervalle: Rand an den Grenzen weg, Schwarz/Eingefroren/Unschaerf (Wisch) heraus
        iv = [a + rand_a.get(ga, 0.08), b - rand_e.get(gb, 0.08)]
        e['nutzbar'] = [] if iv[1] - iv[0] < 0.3 else _abziehen(iv, [tuple(x) for x in schwarz_iv + einfr_iv + unscharf_iv])
        e['nutzbar'] = [x for x in e['nutzbar'] if x[1] - x[0] >= 0.3]
        e['nutzbar_s'] = _r(sum(b_ - a_ for a_, b_ in e['nutzbar']), 2)
        e['schwarz'] = e['schwarz_anteil'] > 0.5
        e['standbild'] = e['leerlauf_anteil'] > 0.8
        # Bewertung (fuer Hook-Wahl und Reihenfolge): Bewegung, Schaerfe, Helligkeit; Abzuege fuer Text/Wisch
        s = min(e['bewegung'], 10) / 10 * 3 + min(e['schaerfe_rel'], 1.5) + (1 if 40 <= e['hell'] <= 225 else 0)
        s -= 2 * e['text_anteil'] + 2 * e['unscharf_anteil'] + 3 * e['schwarz_anteil'] + (1.5 if e['standbild'] else 0)
        e['bewertung'] = _r(s, 2)
        einst.append(e)
    T['gesamt'] = _r(time.time() - t00, 2)
    d = dict(version=VERSION, fingerabdruck=fa, quelle=os.path.abspath(quelle), dauer=_r(dur), w=i['w'], h=i['h'],
             fps=_r(i['fps'], 3), format=fmt, verhaeltnis=_r(i['w'] / i['h'], 4), ton=ton,
             schnitte_hart=[_r(x) for x in hart], uebergaenge_weich=weich, sprung_verdacht=[_r(x) for x in verdacht], schwarz=schwarz_iv, eingefroren=einfr_iv,
             leerlauf=leer_iv, logos=logos, einstellungen=einst,
             ocr=dict(eng=True, chi_sim=bool(tess), proben=len(ocr_bilder), tessdata=tess),
             profil=dict(dt=_r(dt, 6), bewegung=[_r(x, 2) for x in mot_s], bewegung_roh=[_r(x, 2) for x in mot],
                         hell=[_r(x, 1) for x in hell]),
             nutzbar_sauber_s=_r(sum(e['nutzbar_s'] for e in einst if not e['fremdtext']), 2), zeit_s=T)
    if cache:
        try:
            json.dump(d, open(cp, 'w'), ensure_ascii=False)
        except OSError:
            pass
    return d


def _bins(v, n):
    v = np.asarray(v, dtype=np.float64)
    if len(v) == 0:
        return np.zeros(n)
    idx = np.linspace(0, len(v), n + 1).astype(int)
    return np.array([v[idx[k]:max(idx[k] + 1, idx[k + 1])].sum() for k in range(n)])


# ================================================================================================ MUSIK / BEAT
def musik_pfad(musik):
    p = musik if os.path.isfile(musik) else os.path.join(MUSIK_DIR, os.path.basename(musik))
    if not os.path.isfile(p):
        raise FileNotFoundError(f'Musik nicht gefunden: {musik}')
    if os.path.basename(p) in CC_BY:
        raise ValueError(f'{os.path.basename(p)} ist CC BY (Quellenangabe in jeder Caption) — nur eigene Stuecke erlaubt')
    return p


def bpm_hinweis(name):
    """Tempo aus CREDITS.txt (librosa verschaetzt sich bei 5 von 12 Stuecken um eine Oktave oder ganz — GEMESSEN)."""
    try:
        txt = open(os.path.join(MUSIK_DIR, 'CREDITS.txt'), encoding='utf8').read()
    except OSError:
        txt = ''
    bloecke = re.split(r'\n(?=\s*-\s)', txt)
    for bl in bloecke:
        if re.search(r'-\s+' + re.escape(name) + r'\b', bl):
            m = re.search(r'~?(\d{2,3})\s*BPM', bl)
            if m:
                return float(m[1]), 'CREDITS.txt'
    if name in BPM_RUECKFALL:
        return float(BPM_RUECKFALL[name]), 'Rueckfall-Tabelle (Inventur 23.09.)'
    return None, None


def einstiege(name):
    try:
        E = json.load(open(os.path.join(MUSIK_DIR, '_einstiege.json')))
        return [float(x) for x in E.get(name, {}).get('einstiege', [])]
    except Exception:
        return []


def _audio_mono(p, start, dauer, sr=22050):
    raw = _run([FF, '-v', 'error', '-ss', f'{max(0, start):.3f}', '-i', p, '-t', f'{dauer:.3f}', '-vn', '-ac', '1',
                '-ar', str(sr), '-f', 'f32le', '-'], text=False).stdout
    return np.frombuffer(raw, np.float32).copy(), sr


def beat_raster(musik, einstieg, dauer_max, cache_ordner=None):
    """Beat-Raster ab dem (eingerasteten) Einstieg: Periode aus CREDITS (Oktav-sicher) fein justiert (+-1,5 %) und
    Phase per Kamm-Filter auf der Onset-Huellkurve. Rueckgabe: dict(einstieg (auf Beat), periode, bpm, guete …).
    Im Reel liegt Beat j dann bei j*periode (Phase 0)."""
    p = musik_pfad(musik); name = os.path.basename(p)
    key = f"{name}|{os.path.getsize(p)}|{einstieg:.3f}|{dauer_max:.2f}"
    cf = os.path.join(cache_ordner or tempfile.gettempdir(), '.schnitt_beats.json')
    try:
        C = json.load(open(cf))
    except Exception:
        C = {}
    if key in C:
        return C[key]
    import librosa
    mi = info(p, video=False)
    s0 = max(0.0, einstieg - 1.0)
    y, sr = _audio_mono(p, s0, min(dauer_max + 3.0, mi['dauer'] - s0))
    hop = 256
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tenv = librosa.times_like(env, sr=sr, hop_length=hop)
    tempo, beats = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=hop, units='time')
    t_lib = float(np.atleast_1d(tempo)[0]) if np.size(tempo) else 0.0
    hint, hq = bpm_hinweis(name)
    P0 = 60.0 / (hint or t_lib or 120.0)
    env = (env - env.min()) / max(1e-9, env.max() - env.min())
    best = (-1, P0, 0.0)
    for P in P0 * np.linspace(0.985, 1.015, 61):
        phis = np.arange(0, P, 0.004)
        ks = np.arange(0, int((tenv[-1] - 0.05) / P) + 1)
        pts = phis[:, None] + ks[None, :] * P
        ok = pts < tenv[-1]
        sc = (np.interp(pts, tenv, env) * ok).sum(axis=1) / np.maximum(1, ok.sum(axis=1))
        j = int(np.argmax(sc))
        if sc[j] > best[0]:
            best = (float(sc[j]), float(P), float(phis[j]))
    sc, P, phi = best
    # Phase an librosa angleichen: die Regel «Schnitt auf den Beat» ist an librosa-Beats gemessen (Fenster -100/+33 ms).
    # GEMESSEN 23.09.: bei luxe-house2 lag der Kamm-Filter eine halbe Periode neben librosa (nur 31 % der librosa-Beats
    # auf dem Raster, 97 % auf dem Halbraster) — er hatte die offenen Hi-Hats statt der Zaehlzeit gegriffen.
    bt0 = np.asarray(beats, dtype=float)
    phase_korr = False
    if len(bt0) >= 8:
        r = ((bt0 - phi) / P) % 1.0
        auf = np.mean((r < 0.15) | (r > 0.85)); halb = np.mean(np.abs(r - 0.5) < 0.15)
        if halb > auf + 0.3:
            phi = (phi + P / 2) % P; phase_korr = True
    # Einstieg auf den naechsten Beat einrasten (Inventur: Einstiege liegen 30-315 ms neben dem Beat)
    kk = round((einstieg - s0 - phi) / P)
    E2 = s0 + phi + kk * P
    if E2 < 0:
        E2 += P
    # Guete: Anteil der librosa-Beats innerhalb 50 ms eines Rasterpunkts (Raster oder Halbraster, oktavunabhaengig)
    bt = np.asarray(beats, dtype=float)
    guete = None
    if len(bt):
        d1 = np.abs(((bt - phi) / P) - np.round((bt - phi) / P)) * P
        d2 = np.abs(((bt - phi) / (P / 2)) - np.round((bt - phi) / (P / 2))) * (P / 2)
        guete = dict(beats_librosa=len(bt), auf_raster=_r((d1 <= 0.05).mean(), 3), auf_halbraster=_r((d2 <= 0.05).mean(), 3))
    r = dict(musik=name, pfad=p, einstieg_json=_r(einstieg), einstieg=_r(E2, 4), verschiebung_ms=_r((E2 - einstieg) * 1000, 1),
             periode=_r(P, 5), bpm=_r(60 / P, 2), bpm_hinweis=hint, bpm_quelle=hq or 'librosa', bpm_librosa=_r(t_lib, 1),
             kamm_score=_r(sc, 3), guete=guete, phase_an_librosa=phase_korr, musik_dauer=_r(mi['dauer'], 2))
    C[key] = r
    try:
        json.dump(C, open(cf, 'w'), ensure_ascii=False)
    except OSError:
        pass
    return r


# ================================================================================================ 2 PLAN
ZONEN = {
    # organisch: Betreiber-Screenshot 23.09. (TikTok/IG-Oberflaeche), Knopfleiste x>930 bei y 950-1500
    'organisch': dict(oben=200, unten=1440, links=0, rechts=1080, fuss_rechts=940, cx=ov.CX_FUSS),
    # Meta-Anzeigen: 14 % oben, 35 % unten, 6 % seitlich frei (Meta Ads Guide Reels)
    'meta': dict(oben=269, unten=1248, links=65, rechts=1015, fuss_rechts=1015, cx=540),
}


GEWICHT_KANTE = 0.35      # Rest = Bewegung (Hand/Produkt in Aktion); siehe Probe p1 in VIDEOSCHNITT-LERNEN.md
ZENTRUM = 0.4             # Mitte-Vorliebe: Kameraleute zentrieren das Produkt


def _fenster(qw, qh, ar, ex, ey, boxen=(), skalen=(1.0,), rand=8, zentrum=ZENTRUM):
    """Bestes Fenster (x,y,w,h) mit Seitenverhaeltnis ar=w/h (None = volle Breite), das keine Box schneidet.
    Energie aus 64er-Bins (Kanten+Bewegung, Text maskiert), leichte Mitte-Vorliebe. Rueckgabe (fenster, anteil) oder None."""
    ex = np.asarray(ex, float); ey = np.asarray(ey, float)
    xs = np.linspace(-1, 1, len(ex)); ex = ex * (1 + zentrum * (1 - xs ** 2))
    ys = np.linspace(-1, 1, len(ey)); ey = ey * (1 + zentrum * (1 - ys ** 2))
    Sx = ex.sum() or 1.0; Sy = ey.sum() or 1.0
    best = None
    for sk in skalen:
        if ar is None:
            ww = qw; hh = int(round(qh * sk / 2)) * 2
        else:
            hh = int(round(min(qh, qw / ar) * sk / 2)) * 2; ww = int(round(hh * ar / 2)) * 2
            ww = min(ww, qw - qw % 2)
        if ww < 32 or hh < 32:
            continue
        nx = max(1, int(round(ww / qw * len(ex)))); ny = max(1, int(round(hh / qh * len(ey))))
        for bx in range(0, len(ex) - nx + 1):
            for by in range(0, len(ey) - ny + 1):
                x = int(round(bx / len(ex) * qw / 2)) * 2; y = int(round(by / len(ey) * qh / 2)) * 2
                x = min(x, qw - ww); y = min(y, qh - hh)
                if any(_box_schnitt((x, y, ww, hh), tuple(b), rand) for b in boxen):
                    continue
                a = (ex[bx:bx + nx].sum() / Sx) * (ey[by:by + ny].sum() / Sy)
                sc = a * (sk ** 0.5)                     # groessere Fenster (weniger Zoom) bevorzugt
                if best is None or sc > best[0]:
                    best = (sc, [int(x), int(y), int(ww), int(hh)], float(a), sk)
    if best is None:
        return None
    return best[1], best[2], best[3]


def _ocr_fenster_sauber(quelle, e, fenster, i, zeiten=None):
    """Beweis «nachweislich sauber»: OCR (eng + ggf. chi_sim) auf dem zugeschnittenen Fenster je 0,5 s."""
    x, y, w, h = fenster
    tess = tessdata_cjk()
    zs = zeiten or list(np.arange(e['start'] + 0.1, e['ende'] - 0.05, 0.5)) or [(e['start'] + e['ende']) / 2]
    for t in zs[:16]:
        g = bild_bei(quelle, t, kurz=min(i['w'], i['h']), i=i)
        if g is None:
            continue
        sx = g.shape[1] / i['w']
        c = g[int(y * sx):int((y + h) * sx), int(x * sx):int((x + w) * sx)]
        if c.size == 0:
            continue
        fb = fremdtext_woerter(ocr(c, 'eng'), ocr(c, 'chi_sim', tess) if tess else [])
        # strenger als bei der Suche: schon 1 Wort >= 4 Buchstaben (conf >= 75) zaehlt; dazu die Kanten-Heuristik
        # (fuer Szenentext in fremder Schrift, den OCR nicht liest)
        if fb['lat'] or fb['handles'] or fb['marken'] or fb['cjk']:
            return False, f"t={t:.1f}s: {', '.join((fb['lat'] + fb['handles'] + fb['marken'] + fb['cjk'])[:4])}"
        k540 = 540 / min(c.shape)
        cc = np.asarray(Image.fromarray(c).resize((max(2, int(c.shape[1] * k540)), max(2, int(c.shape[0] * k540)))))
        if hat_text(cc):
            return False, f't={t:.1f}s: Textzeilen im Fenster (Heuristik)'
    return True, f'{min(len(zs), 16)} Proben ohne Fremdtext'


def plan(A, musik, ziel_s=12.0, einstieg=None, zone='organisch', hook_text=None, cache_ordner=None, sperren=(),
         hook_ab=None):
    """Schnittliste + Entscheidungslog. A = analyse(...). Wirft Ungeeignet, wenn kein sauberes Reel moeglich ist.
    sperren = [(a, b), …] Quellsekunden, die nach Sichtpruefung nicht verwendet werden duerfen (z. B. chinesische
    Verpackung im Hintergrund — OCR liest Szenentext nicht, GEMESSEN p2)."""
    log = []

    def L(schritt, entscheidung, grund, **werte):
        log.append(dict(schritt=schritt, entscheidung=entscheidung, grund=grund, **({'werte': werte} if werte else {})))

    quelle = A['quelle']; qw, qh = A['w'], A['h']
    mp = musik_pfad(musik); mname = os.path.basename(mp)
    ein_liste = einstiege(mname)
    E = float(einstieg) if einstieg is not None else (ein_liste[0] if ein_liste else 0.0)
    L('musik', f'{mname} ab {E:.2f} s', 'Einstieg aus _einstiege.json (gemessenes Energie-Fenster)' if einstieg is None
      else 'Einstieg vom Aufrufer (musikWahl im Reel-Motor)', einstiege_json=ein_liste)
    mdauer = info(mp, video=False)['dauer']
    if mdauer - E < 6.0 and ein_liste:
        E2 = max(ein_liste, key=lambda x: mdauer - x) if max(mdauer - x for x in ein_liste) > mdauer - E else E
        if E2 != E:
            L('musik', f'Einstieg {E:.2f} -> {E2:.2f} s', f'ab {E:.2f} s bleiben nur {mdauer - E:.1f} s Musik')
            E = E2
    R = beat_raster(mp, E, min(ziel_s + 1.0, mdauer - E), cache_ordner=cache_ordner or os.path.dirname(quelle))
    P = R['periode']
    L('beat', f"{R['bpm']:.1f} BPM, Einstieg auf Beat {R['einstieg']:.3f} s ({R['verschiebung_ms']:+.0f} ms)",
      f"Periode aus {R['bpm_quelle']} (librosa sagt {R['bpm_librosa']}), fein justiert und Phase per Kamm-Filter; "
      'Inventur: Einstiege liegen 30-315 ms neben dem Beat', guete=R['guete'], kamm=R['kamm_score'])

    # ---- Dauer: organisch 9-12 s (Handwerk: Laenge ist nicht der Hebel), auf ganze Takte, nie laenger als die Musik
    frei_musik = mdauer - R['einstieg'] - 0.05
    k_min = max(1, math.ceil(0.6 / P - 1e-9))
    k_first = max(k_min, int(1.3 / P + 1e-9))
    k_base = min((k for k in range(1, 12) if 0.8 <= k * P <= 2.5), key=lambda k: abs(k * P - 1.4), default=max(1, round(1.4 / P)))
    k_static = max(1, int(1.0 / P + 1e-9))
    nb_ziel = int(round(min(ziel_s, frei_musik) / P))
    nb = nb_ziel - nb_ziel % 4 if nb_ziel >= 8 else nb_ziel
    while nb * P > frei_musik and nb > 4:
        nb -= 4
    L('dauer', f'{nb} Schlaege = {nb * P:.2f} s', f'Ziel {ziel_s} s, auf ganze Takte (4 Schlaege) fuer ein nahtloses Loop; '
      f'Musik ab Einstieg noch {frei_musik:.1f} s', k_first=k_first, k_base=k_base, k_static=k_static, k_min=k_min)

    # ---- nutzbares Material (Kopie: der Analyse-Cache bleibt unveraendert)
    einst = copy.deepcopy(A['einstellungen'])
    if sperren:
        for e in einst:
            vorher = e['nutzbar_s']
            e['nutzbar'] = [iv2 for iv in A['einstellungen'][e['id']]['nutzbar']
                            for iv2 in _abziehen(iv, [tuple(x) for x in sperren]) if iv2[1] - iv2[0] >= 0.3]
            e['nutzbar_s'] = _r(sum(b - a for a, b in e['nutzbar']), 2)
            if e['nutzbar_s'] < vorher:
                L('sichtpruefung', f"Einstellung {e['id']}: {vorher:.2f} -> {e['nutzbar_s']:.2f} s nutzbar",
                  f'gesperrt nach Sichtpruefung: {sperren}')
    sauber, verworfen = [], []
    for e in einst:
        if e['schwarz']:
            verworfen.append((e['id'], 'Schwarzbild')); continue
        if e['nutzbar_s'] < 0.3:
            verworfen.append((e['id'], 'kein nutzbarer Rest (Uebergang/Standbild/Wisch)')); continue
        if e['fremdtext']:
            verworfen.append((e['id'], 'Fremdtext: ' + e['fremdtext_grund'])); continue
        sauber.append(e)
    fremd = [e for e in einst if e['fremdtext'] and not e['schwarz'] and e['nutzbar_s'] >= 0.3]

    # ---- Modus: Vollbild (Smart-Crop) wenn die Quelle es hergibt, sonst Band
    fmt = A['format']

    def energie(e, ax):
        k = np.asarray(e['kanten_' + ax], float); b = np.asarray(e['bewegung_' + ax], float)
        k = k / (k.sum() or 1.0); b = b / (b.sum() or 1.0)
        return GEWICHT_KANTE * k + (1 - GEWICHT_KANTE) * b if b.sum() > 0 else k

    def rahmen(e):
        """Innenrechteck (ohne eingebrannte Balken) + passend zugeschnittene Energie-Bins."""
        ex, ey = energie(e, 'x'), energie(e, 'y')
        # 2 px Rand immer weg: viele CJ-Quellen haben eine 1-px-Randlinie (GEMESSEN p4: Spalte 0 Helligkeit 68 vs. 145)
        bx0, by0, bw, bh = e['balken'] if e.get('balken') else (2, 2, qw - 4, qh - 4)
        n = len(ex)
        return bx0, by0, bw, bh, ex[int(bx0 / qw * n):max(int(bx0 / qw * n) + 1, int((bx0 + bw) / qw * n))], \
            ey[int(by0 / qh * n):max(int(by0 / qh * n) + 1, int((by0 + bh) / qh * n))]

    kand = sauber or fremd
    # Layout: das SCHMALSTE Fenster, das die Quelle hergibt. «Hergeben» = hoechstens 15 % der Bildenergie (Kanten +
    # Bewegung, ohne Mitte-Vorliebe) faellt aus dem Fenster (Median ueber die sauberen Einstellungen) und die
    # Vergroesserung bleibt <= 2,7x. GEMESSEN 23.09. (Diagnosebogen): 9:16 aus 3:4 (p1) liess 19 % draussen und schnitt
    # den Hund an; 9:16 aus 1:1 (p2) schnitt den runden Abtropfkorb in jeder Einstellung an. Rueckfall = Band: das
    # Fenster in voller Breite ueber Unschaerfe-Grund, zentriert auf die sichtbare Zone (y 200-1440).
    def draussen(e, ar):
        bx0, by0, bw, bh, _, _ = rahmen(e)
        k = np.asarray(e['kanten_x'], float); b = np.asarray(e['bewegung_x'], float)
        E = GEWICHT_KANTE * k / (k.sum() or 1) + (1 - GEWICHT_KANTE) * b / (b.sum() or 1)
        n = len(E); E = E[int(bx0 / qw * n):max(int(bx0 / qw * n) + 1, int((bx0 + bw) / qw * n))]
        ww = min(bw, bh * ar); nx = max(1, int(round(ww / bw * len(E))))
        c = np.concatenate([[0], np.cumsum(E)])
        return 1 - float((c[nx:] - c[:-nx]).max() / (c[-1] or 1))
    # Schwellen: 15 % fuer Vollbild/4:5; 25 % fuer den 1:1-Ausschnitt aus Querformat (die Alternative zeigt das Produkt
    # auf 31 % der Flaeche; was draussen bleibt, sind bei CJ-Demos meist Haende/Beine am Rand — Sichtpruefung p3)
    kandidaten_ar = [('fill', 9 / 16, 0.15), ('band 4:5', 0.8, 0.15), ('band 1:1', 1.0, 0.25)]
    modus, AR, grund = 'band', None, ''
    hw_q = qh / qw
    if hw_q >= 1.7:
        modus, AR, grund = 'fill', 9 / 16, f'Hochkant ~9:16 ({qw}x{qh}): Vollbild, Zuschnitt <= 5 %'
    else:
        pruef = []
        for name, ar, schwelle_aus in kandidaten_ar:
            if ar >= qw / qh - 1e-3:
                continue                                  # Fenster waere nicht schmaler als die Quelle
            vergr = (1920 / qh) if name == 'fill' else (1080 / (qh * ar))
            aus = float(np.median([draussen(e, ar) for e in kand])) if kand else 1.0
            pruef.append(f'{name}: {aus:.0%} draussen, {vergr:.2f}x')
            if vergr <= 2.7 and aus <= schwelle_aus:
                modus, AR = ('fill', ar) if name == 'fill' else ('band', ar)
                grund = (f'{name} haelt das Produkt ({aus:.0%} der Energie draussen <= {schwelle_aus:.0%}, '
                         f'Vergroesserung {vergr:.2f}x)')
                break
        if not grund:
            grund = f'kein Zuschnitt haelt das Produkt -> volle Breite ueber Unschaerfe-Grund'
        grund += ' | geprueft: ' + ('; '.join(pruef) or '-')
    L('layout', modus + (f' {AR:.3f}' if AR else ' voll'), grund)

    # ---- Fenster je Einstellung (ruhig: EIN Fenster pro Einstellung), Fremdtext-Einstellungen: sauberer Zuschnitt?
    fenster = {}
    info_q = info(quelle)
    zugeschnitten = set()
    for e in sauber + fremd:
        bx0, by0, bw, bh, ex, ey = rahmen(e)
        boxen = [(b[0] - bx0, b[1] - by0, b[2], b[3]) for b in e['text_boxen']] if e['fremdtext'] else []
        skalen = (1.0,) if not e['fremdtext'] else ((1.0, 0.9, 0.8, 0.7) if AR else (1.0, 0.9, 0.8, 0.72))
        f = _fenster(bw, bh, AR, ex, ey, boxen=boxen, skalen=skalen)
        if f is None:
            if e['fremdtext']:
                L('fremdtext', f"Einstellung {e['id']} verworfen", e['fremdtext_grund'] + ' — kein textfreies Fenster moeglich')
            continue
        (x, y, w, h), anteil, sk = f
        fen = [x + bx0, y + by0, w, h]
        if e['fremdtext']:
            if sk < 0.7 or not e['text_boxen']:
                L('fremdtext', f"Einstellung {e['id']} verworfen", e['fremdtext_grund']); continue
            ok, beleg = _ocr_fenster_sauber(quelle, e, fen, info_q)
            if not ok:
                L('fremdtext', f"Einstellung {e['id']} verworfen", e['fremdtext_grund'] + f' — Zuschnitt nicht sauber ({beleg})')
                continue
            L('fremdtext', f"Einstellung {e['id']} zugeschnitten {fen}", f"{e['fremdtext_grund']} — Fenster meidet alle "
              f"Textboxen, Zoom {1 / sk:.2f}x; nachweislich sauber: {beleg}")
            sauber.append(e); zugeschnitten.add(e['id'])
        if e.get('balken'):
            L('balken', f"Einstellung {e['id']}: eingebrannte Balken weg -> {e['balken']}", 'Rand in jedem Bild dunkel (cropdetect je Einstellung)')
        fenster[e['id']] = dict(fenster=fen, anteil=_r(anteil, 3), skala=sk)
    sauber = [e for e in sauber if e['id'] in fenster]
    for eid, gr in verworfen:
        L('material', f'Einstellung {eid} nicht verwendet', gr)
    U = sum(e['nutzbar_s'] for e in sauber)
    L('material', f'{len(sauber)} saubere Einstellungen, {U:.1f} s nutzbar', f"von {len(einst)} Einstellungen, Quelle {A['dauer']:.1f} s")
    if not sauber:
        grund = '; '.join(sorted({g for _, g in verworfen})[:3]) or 'keine nutzbare Einstellung'
        raise Ungeeignet(f'kein sauberes Material ({grund})')
    if U < 6.0:
        raise Ungeeignet(f'nur {U:.1f} s sauberes Material (< 6 s, Regel Handwerk: dann das ganze Video verwerfen)')
    # Quelle kuerzer als Ziel: Reel kuerzen statt Schleife (keine Stelle zweimal)
    nb_mat = int((U * 0.95) / P)
    if nb_mat < nb:
        alt = nb
        nb = max(nb_mat - nb_mat % 2, int(math.ceil(6.0 / P)))
        L('dauer', f'gekuerzt {alt} -> {nb} Schlaege = {nb * P:.2f} s', f'nur {U:.1f} s sauberes Material; keine Stelle zweimal '
          '(kein -stream_loop, Kritik: 3/61 Reels mit sichtbarem Neustart)')
    mot = np.asarray(A['profil'].get('bewegung_roh') or A['profil']['bewegung']); dtp = A['profil']['dt']
    hell = np.asarray(A['profil']['hell'])

    def mfenster(a, b):
        # getrimmtes Mittel (obere 10 % weg): ein einzelner Bildsprung (verpasster Schnitt, Blitz) ist keine Bewegung
        # (GEMESSEN p3: der Hook landete auf einem Sprung); der Median faellt dagegen bei Quellen mit doppelten Bildern
        # (jedes 2. Bild gleich, scene 0,000) auf ~0 und macht bewegte Stellen «ruhig».
        v = np.sort(mot[slice(int(a / dtp), max(int(a / dtp) + 1, int(b / dtp)))])
        if len(v) == 0:
            return 0.0
        return float(v[:max(1, int(np.ceil(len(v) * 0.9)))].mean())

    benutzt = {}          # eid -> [[a,b]]

    def frei(eid, a, b, puffer=0.08):
        return all(b <= x - puffer or a >= y + puffer for x, y in benutzt.get(eid, []))

    def kandidaten(e, laenge, schritt=1 / 15):
        for a0, b0 in e['nutzbar']:
            t = a0
            while t + laenge <= b0 + 1e-6:
                yield t
                t += schritt

    reich = U >= 1.8 * nb * P

    # ---- Hook: staerkstes Fenster (nicht Quellsekunde 0). Einstieg-Regel: Bewegung 0-1 s >= 4.0 bevorzugt, < 2.0 = Standbild.
    L0 = k_first * P
    Lt_wunsch = k_base * P
    verd = np.asarray(A.get('sprung_verdacht', []), float)
    # Intro-Zone: CJ-Demos beginnen oft mit Auspacken, Titelkarte, Schwarz oder Standbild. GEMESSEN: p3 Karton 0-4 s
    # (mit getrimmter Bewegung waere der Hook sonst genau dort gelandet), Kritik: Luftbefeuchter-Titelkarte 0-4,9 s,
    # Milchschaeumer-Karton 0-3,4 s, Hotpot-Standbild 0-3,1 s; Inventur: Projektor beginnt schwarz.
    intro = min(4.0, 0.12 * A['dauer'])
    best = None
    for e in sauber:
        for t in kandidaten(e, L0):
            auf_sprung = bool(len(verd) and np.min(np.abs(verd - t)) <= 0.1)   # moeglicher Kamerawechsel am Start
            if hook_ab is not None and not (hook_ab - 1e-6 <= t <= hook_ab + 1.0):
                continue                              # Sichtpruefung hat den Hook vorgegeben (z. B. «Anwendung»)
            m1 = mfenster(t, t + min(1.0, L0))
            h_ = float(hell[int(t / dtp):int((t + L0) / dtp) + 1].mean()) if len(hell) else 128
            sc = min(m1, 10) + 2 * min(e['schaerfe_rel'], 1.5) + (1.0 if 40 <= h_ <= 225 else -2.0) - 3 * e['unscharf_anteil']
            if m1 < 2.0:
                sc -= 4
            elif m1 >= 4.0:
                sc += 1
            vor = t - next((a0 for a0, b0 in e['nutzbar'] if a0 <= t <= b0), t)
            sc += 1.5 if vor >= k_min * P else 0.0        # Material davor -> nahtloses Loop-Ende (spart eine Einstellung)
            if auf_sprung:
                sc -= 6.0; vor = 0.0                      # nie auf einem moeglichen Kamerawechsel beginnen / nahtlos enden
            if t < intro:
                sc -= 2.5                                 # Intro-Zone der Quelle (Karton, Titelkarte, Schwarz, Standbild)
            if best is None or sc > best[0]:
                best = (sc, e, t, m1, vor)
    if best is None:
        raise Ungeeignet('keine Einstellung lang genug fuer den Hook' + (f' ab {hook_ab} s' if hook_ab is not None else ''))
    if hook_ab is not None:
        L('sichtpruefung', f'Hook ab {hook_ab:.2f} s vorgegeben', 'Aufrufer (--hook-ab) nach Sichtpruefung: Anwendung statt '
          'staerkster Bewegung')
    _, he, ht, hm1, hvor = best
    q0 = mfenster(0, 1.0)
    L('hook', f"Einstellung {he['id']} ab {ht:.2f} s ({L0:.2f} s)", f"staerkstes Fenster: Bewegung 0-1 s {hm1:.1f} "
      f"(Regel >= 4.0), Schaerfe {he['schaerfe_rel']:.2f}; Quellsekunde 0 haette Bewegung {q0:.1f}; Intro-Zone "
      f"0-{intro:.1f} s abgewertet",
      rang_bewertung=sorted([e['bewertung'] for e in sauber], reverse=True)[:5])
    stuecke = [dict(einstellung=he['id'], q_start=_r(ht), q_dauer=_r(L0), tempo=1.0, beats=k_first, rolle='hook',
                    grund=f'staerkste Stelle (Bewegung {hm1:.1f})')]
    benutzt.setdefault(he['id'], []).append([ht, ht + L0])

    # ---- Loop-Ende: das Stueck direkt VOR dem Hook-Fenster (gleiche Einstellung, gleiche Bewegungsrichtung) -> nahtlos
    loop = None
    kt = k_base
    while kt >= k_min:
        if hvor >= kt * P - 1e-6:
            loop = dict(art='natuerlich', beats=kt, q_start=_r(ht - kt * P), q_dauer=_r(kt * P))
            break
        kt -= 1
    if loop:
        benutzt[he['id']].append([ht - loop['q_dauer'], ht])
        L('loop', f"natuerlich: letztes Stueck = Einstellung {he['id']} {loop['q_start']:.2f}-{ht:.2f} s",
          'endet genau dort, wo der Hook beginnt -> beim Wiederholen laeuft das Bild ohne Sprung weiter (kein Standbild-Abspann)')
    else:
        L('loop', 'Ueberblendung 0,4 s auf das erste Bild', f'vor dem Hook nur {hvor:.2f} s Material; Labor: Naht MAD 57 -> 5')

    # ---- Mitte: Einstellungen in Quellreihenfolge (Ablauf der Demo), gute zuerst, nie dieselbe Stelle zweimal
    k_tail = loop['beats'] if loop else 0      # ohne nahtloses Ende fuellt die Mitte alles; letztes Stueck blendet ueber
    rest = nb - k_first - k_tail
    if rest < 0:
        raise Ungeeignet('Reel zu kurz fuer Hook + Ende')
    med_b = float(np.median([e['bewertung'] for e in sauber]))
    gute = [e for e in sorted(sauber, key=lambda e: e['start']) if e['bewertung'] >= med_b - 0.5]
    schwache = [e for e in sorted(sauber, key=lambda e: e['start']) if e not in gute]
    reihe = [e for e in gute if e['id'] != he['id']] + ([he] if he in gute else []) + schwache
    tempo_n = 0
    zyklus = 0; pos_r = 0
    letzte = he['id']
    while rest > 0:
        if rest < k_min:
            break                                     # Rest < Mindeststueck: geht ans Ende (unten), kein 0,5-s-Fetzen
        k = min(k_base, rest)
        if 0 < rest - k < k_min:
            k = rest
        gewaehlt = None
        for versuch in range(len(reihe) * 3):
            e = reihe[(pos_r + versuch) % len(reihe)]
            if e['id'] == letzte and len(reihe) > 1 and versuch < len(reihe):
                continue                              # nie zweimal hintereinander dieselbe Einstellung, wenn es anders geht
            # knapp: laengstes Stueck (<= 2,5 s), das in die Einstellung passt — sonst verfallen Reste, die wegen der
            # 0,4-s-Sprungregel nicht mehr nutzbar sind (GEMESSEN Selbsttest: 7,6 s Material -> 5,4 s Reel)
            reihe_k = [k] + list(range(k - 1, k_min - 1, -1)) if reich else \
                list(range(min(max(k, int(2.5 / P + 1e-9)), rest), k_min - 1, -1))
            for kk in reihe_k:
                laenge = kk * P
                statisch = e['standbild']
                if statisch and kk > k_static:
                    continue                          # Lieferanten-Dias nie laenger als 1,0 s
                tempo = 1.0
                if reich and not statisch and tempo_n < 2 and 2.0 <= e['bewegung'] < 3.0 and e['nutzbar_s'] >= 1.6 * laenge:
                    tempo = 1.5                       # Leerlauf straffen (Rhythmusmittel, nicht Originalitaet)
                src_l = laenge * tempo
                vor = stuecke[-1]
                letztes_mittel = (rest - kk == 0) and loop is not None

                def sichtbar(t, L_):
                    # Stuecke derselben Einstellung muessen in der Quelle >= 0,4 s springen, sonst ist der Schnitt
                    # unsichtbar (GEMESSEN p4: 0,07-s-Sprung, im Ergebnis nicht messbar). Gilt auch zum Loop-Ende.
                    if e['id'] == vor['einstellung'] and not (t >= vor['q_start'] + vor['q_dauer'] + 0.4 or
                                                               t + L_ <= vor['q_start'] - 0.4):
                        return False
                    if letztes_mittel and e['id'] == he['id'] and not (t + L_ <= loop['q_start'] - 0.4 or
                                                                        t >= loop['q_start'] + loop['q_dauer'] + 0.4):
                        return False
                    return True
                kands = [t for t in kandidaten(e, src_l) if frei(e['id'], t, t + src_l) and sichtbar(t, src_l)]
                if not kands and tempo != 1.0:
                    tempo = 1.0; src_l = laenge
                    kands = [t for t in kandidaten(e, src_l) if frei(e['id'], t, t + src_l) and sichtbar(t, src_l)]
                if not kands:
                    continue
                if reich:
                    t = max(kands, key=lambda t: mfenster(t, t + src_l))
                elif e['id'] == vor['einstellung']:
                    # knapp + gleiche Einstellung: vom vorderen oder hinteren Ende nehmen — je nachdem, was weiter
                    # springt (Stuecke werden umgestellt statt in Quellreihenfolge -> jeder Schnitt ist sichtbar)
                    mitte = vor['q_start'] + vor['q_dauer'] / 2
                    t = max((kands[0], kands[-1]), key=lambda t: abs(t + src_l / 2 - mitte))
                else:
                    t = kands[0]                      # knapp: dicht an dicht verbrauchen
                gewaehlt = (e, t, kk, tempo, statisch)
                break
            if gewaehlt:
                pos_r = (pos_r + versuch + 1) % len(reihe)
                break
        if not gewaehlt:
            alt = nb
            nb -= rest
            L('dauer', f'Material erschoepft: {alt} -> {nb} Schlaege = {nb * P:.2f} s', 'keine freie Stelle mehr ohne '
              'Wiederholung — Reel wird kuerzer statt eine Stelle zu wiederholen (kein -stream_loop)')
            rest = 0
            break
        e, t, kk, tempo, statisch = gewaehlt
        benutzt.setdefault(e['id'], []).append([t, t + kk * P * tempo])
        if tempo != 1.0:
            tempo_n += 1
        m = mfenster(t, t + kk * P * tempo)
        stuecke.append(dict(einstellung=e['id'], q_start=_r(t), q_dauer=_r(kk * P * tempo), tempo=tempo, beats=kk,
                            rolle='demo', grund=('Standbild-Dia <= 1,0 s' if statisch else f'Bewegung {m:.1f}') +
                            (', Tempo 1,5x (Leerlauf gestrafft)' if tempo != 1.0 else '')))
        letzte = e['id']
        rest -= kk
    if 0 < rest < k_min:
        # Rest-Schlaege: letztes Mittelstueck verlaengern, wenn die Quelle dahinter frei ist, sonst Reel kuerzer
        s_ = stuecke[-1] if len(stuecke) > 1 else None
        e_ = next((x for x in sauber if s_ and x['id'] == s_['einstellung']), None)
        neu_l = (s_['beats'] + rest) * P * s_['tempo'] if s_ else 0
        # frei() gegen die ANDEREN Stuecke der Einstellung pruefen (das eigene Intervall grenzt ja direkt an)
        andere = [iv for iv in benutzt.get(s_['einstellung'], []) if abs(iv[0] - s_['q_start']) > 1e-6] if s_ else []
        if s_ and e_ and s_['beats'] + rest <= int(2.5 / P + 1e-9) and any(a0 <= s_['q_start'] and s_['q_start'] + neu_l <= b0
                                                                           for a0, b0 in e_['nutzbar']) and \
                all(s_['q_start'] + neu_l <= x - 0.08 or s_['q_start'] + s_['q_dauer'] >= y + 0.08 for x, y in andere):
            for iv in benutzt[e_['id']]:
                if abs(iv[0] - s_['q_start']) <= 1e-6:
                    iv[1] = s_['q_start'] + neu_l
            s_['beats'] += rest; s_['q_dauer'] = _r(neu_l); s_['grund'] += f' (+{rest} Schlag, Rest)'
        else:
            nb -= rest
        rest = 0
    if loop:
        stuecke.append(dict(einstellung=he['id'], q_start=loop['q_start'], q_dauer=loop['q_dauer'], tempo=1.0,
                            beats=loop['beats'], rolle='loop_ende', grund='Material direkt vor dem Hook -> nahtlose Wiederholung'))
    elif len(stuecke) > 1:
        stuecke[-1]['rolle'] = 'loop_ende'
        stuecke[-1]['grund'] += '; Naht per 0,4-s-Ueberblendung auf das erste Bild'
    # Stuecke aus derselben Einstellung, die in der Quelle direkt aneinander liegen -> unsichtbarer Schnitt: zusammenlegen
    zus = []
    for s in stuecke:
        if zus and zus[-1]['einstellung'] == s['einstellung'] and zus[-1]['tempo'] == s['tempo'] == 1.0 and \
                abs(zus[-1]['q_start'] + zus[-1]['q_dauer'] - s['q_start']) < 0.02 and s['rolle'] != 'loop_ende':
            zus[-1]['q_dauer'] = _r(zus[-1]['q_dauer'] + s['q_dauer']); zus[-1]['beats'] += s['beats']
            zus[-1]['grund'] += ' (verlaengert statt unsichtbarem Schnitt)'
            continue
        zus.append(s)
    stuecke = zus
    nb = sum(s['beats'] for s in stuecke)
    D = nb * P

    # ---- Frames auf dem Raster (Schnitt = runder Frame des Beats: Abweichung <= 1/2 Bild = 16,7 ms, im Fenster -100/+33 ms)
    pos = 0; zoom_zuletzt = -99.0
    for k, s in enumerate(stuecke):
        s['nr'] = k
        s['beat_start'] = pos; pos += s['beats']
        s['start_frame'] = int(round(s['beat_start'] * P * FPS)); s['ende_frame'] = int(round(pos * P * FPS))
        s['frames'] = s['ende_frame'] - s['start_frame']
        s['t_start'] = _r(s['start_frame'] / FPS); s['t_ende'] = _r(s['ende_frame'] / FPS)
        f = fenster[s['einstellung']]
        s['fenster'] = f['fenster']; s['energieanteil'] = f['anteil']
        e = next(x for x in einst if x['id'] == s['einstellung'])
        m = mfenster(s['q_start'], s['q_start'] + s['q_dauer'])
        # Zoom sparsam: Drift nur fuer ruhige Stuecke, Punch-in nur an Sprungschnitten, hoechstens 1x je 3 s
        z = 'keiner'; zg = ''
        if m < 2.0 or e['standbild']:
            z, zg = 'drift', f'ruhig (Bewegung {m:.1f} < 2) -> langsamer Zoom 100->108 %'
        elif k > 0 and stuecke[k - 1]['einstellung'] == s['einstellung'] and s['t_start'] - zoom_zuletzt >= 3.0 - 1e-6:
            z, zg = 'bump', 'Sprungschnitt in derselben Einstellung -> Punch-in 106 % am Beat macht den Wechsel sichtbar'
        if k == 0 and m < 4.0 and z == 'keiner':
            z, zg = 'drift', f'Hook mit wenig Bewegung ({m:.1f} < 4) -> langsamer Zoom als Bewegung'
        if s['rolle'] == 'loop_ende' and loop and z != 'keiner':
            z, zg = 'keiner', ('nahtloses Ende ohne Zoom: der Hook beginnt bei 100 %, ein gezoomtes Ende gaebe an der Naht '
                               'einen Bildsprung (GEMESSEN p3r: Naht-MAD 23,5 bei Drift auf Hook und Ende)')
        if z == 'bump':
            zoom_zuletzt = s['t_start']
        s['zoom'] = z; s['bewegung'] = _r(m, 2)
        if zg:
            L('zoom', f"Stueck {k}: {z}", zg)
    N = int(round(D * FPS))
    grenzen = [s['start_frame'] for s in stuecke[1:]]
    if D < 5.0:
        raise Ungeeignet(f'nur {D:.1f} s Reel moeglich ohne Wiederholung (Standbild-Dias <= 1 s, Spruenge >= 0,4 s) — '
                         'unter 5 s lohnt kein Reel')

    # ---- Text-Takt (Staffelung): Bild 0 nur Marke + Hook; Titel/Preis ab ~2 s auf einem Schnitt; letzte ~2 s Preis + CTA
    hook_len = len(hook_text) if hook_text else 24
    t_hook_min = max(0.83, hook_len / 15 + 0.3)                      # Netflix 17 Z/s, konservativ 15 Z/s
    t_F = next((g / FPS for g in grenzen if g / FPS >= t_hook_min - 1e-6), min(D, t_hook_min))
    if D - t_F >= 5.0:
        t_C_min = max(t_F + 3.0, D - 3.0)
        t_C = next((g / FPS for g in grenzen if t_C_min - 1e-6 <= g / FPS <= D - 1.4), None)
        if t_C is None:
            t_C = max(t_F + 3.0, D - 2.0)
    else:
        t_C = D                        # kurzes Reel: kein eigener CTA-Block (jede Einblendung braucht ihre Lesezeit)
    text = dict(hook=[0.0, _r(t_F)], info=[_r(t_F), _r(t_C)], cta=[_r(t_C), _r(D)])
    L('text', f'Hook 0-{t_F:.2f} s, Titel+Preis {t_F:.2f}-{t_C:.2f} s, Preis+CTA {t_C:.2f}-{D:.2f} s',
      f'Bild 0 hoechstens Marke + Hook (<= 40 Zeichen); Hook-Lesezeit {t_hook_min:.2f} s (15 Z/s + 0,3 s), '
      'Wechsel auf einem Schnitt; hoechstens 2 Textbloecke gleichzeitig')

    # ---- Regelpruefung (am Plan gemessen)
    erster = grenzen[0] / FPS if grenzen else D
    in10 = {s['einstellung'] for s in stuecke if s['t_start'] < 10.0}
    wechsel10 = sum(1 for g in grenzen if g / FPS < 10.0)
    laengen = [s['frames'] / FPS for s in stuecke]
    ueberl = 0.0
    for eid, ivs in benutzt.items():
        ivs = sorted(ivs)
        for a_, b_ in zip(ivs, ivs[1:]):
            ueberl += max(0.0, a_[1] - b_[0] - 1e-3)
    zeichen0 = len('LUXESTYLE') + (len(hook_text) if hook_text else 0)
    regeln = dict(erster_wechsel_s=_r(erster, 2), erster_wechsel_ok=erster <= 1.3 + 1e-6,
                  einstellungen_verschieden_10s=len(in10), wechsel_10s=wechsel10,
                  stueck_median_s=_r(float(np.median(laengen)), 2), stueck_max_s=_r(max(laengen), 2),
                  ueberlappung_s=_r(ueberl, 3),
                  fremdtext_stuecke=sum(1 for s in stuecke if s['einstellung'] not in zugeschnitten and
                                        next(x for x in einst if x['id'] == s['einstellung'])['fremdtext']),
                  zugeschnittene_stuecke=sum(1 for s in stuecke if s['einstellung'] in zugeschnitten),
                  zeichen_bild0=zeichen0, zeichen_bild0_ok=zeichen0 <= 40,
                  hook_nicht_quellstart=stuecke[0]['q_start'] > 0.05 or hm1 >= 4.0, punch_ins=sum(1 for s in stuecke if s['zoom'] == 'bump'),
                  tempo_stuecke=sum(1 for s in stuecke if s['tempo'] != 1.0))
    L('regeln', 'Pruefung am Plan', 'Soll: erster Wechsel <= 1,3 s; >= 4 Einstellungen in 10 s; Stuecke 0,8-2,5 s (Median 1,2-1,6); '
      'keine Ueberlappung; Bild 0 <= 40 Zeichen', **regeln)
    return dict(version=VERSION, quelle=quelle, analyse_fingerabdruck=A['fingerabdruck'], quelle_format=fmt,
                quelle_masse=[qw, qh], modus=modus, zone=zone, fps=FPS, dauer=_r(D, 4), frames=N, beats=nb,
                musik=R, stuecke=stuecke, schnitt_frames=grenzen, loop=loop or dict(art='ueberblendung', dauer=0.4),
                text=text, regeln=regeln, entscheidungen=log)


# ================================================================================================ TEXTEBENEN
def text_ebenen(ordner, titel1='', titel2='', preis='', hook='', zone='organisch'):
    """PNG-Ebenen aus den overlay.py-Bausteinen (font/spaced/wrap/text_cx, Farben, KOPF_Y/HOOK_Y/FUSS_Y/CX_FUSS).
    kopf (ab Bild 0), hook (0 -> t_F), info (Titel+Preis+Fusszeile, t_F -> t_C), cta (Preis + «Link in Bio», t_C -> Ende).
    Rueckgabe: dict(pfade, textboxen, zone_ok)."""
    Z = ZONEN[zone]; os.makedirs(ordner, exist_ok=True)
    kasten = {}

    def neu():
        return Image.new('RGBA', (W, H), (0, 0, 0, 0))

    def merk(name, d, xy, s, f):
        kasten.setdefault(name, []).append(list(d.textbbox(xy, s, font=f)))

    def text_mitte(name, d, cx, y, s, f, fill, schatten=True):
        w = d.textlength(s, font=f); x = cx - w / 2
        if schatten:
            d.text((x + 2, y + 3), s, font=f, fill=(0, 0, 0, 160))
        d.text((x, y), s, font=f, fill=fill); merk(name, d, (x, y), s, f)

    oben = Z['oben']; unten = Z['unten']; cx = Z['cx']
    # Kopf: Wortmarke wie overlay.main (spaced, Serif 44, Goldlinie)
    k = neu(); d = ImageDraw.Draw(k)
    d.rectangle((0, oben, W, oben + 130), fill=(20, 20, 20, 120))
    fS = ov.font(ov.F_SERIF, 44)
    ov.spaced(d, oben + 26, 'LUXESTYLE', fS, ov.WHITE, sp=8)
    wm = sum(d.textlength(c, font=fS) + 8 for c in 'LUXESTYLE') - 8
    kasten['kopf'] = [[int((W - wm) / 2), oben + 26, int((W + wm) / 2), oben + 26 + 50]]
    d.rectangle((W / 2 - 60, oben + 92, W / 2 + 60, oben + 96), fill=ov.GOLD)
    # Hook
    hk = neu()
    if hook:
        d2 = ImageDraw.Draw(hk); fH = ov.font(ov.F_BOLD, 58)
        breite = min(880, Z['rechts'] - Z['links'] - 120)
        zeilen = ov.wrap(d2, hook, fH, breite, 2)
        hy = oben + 150; hgt = 56 + 72 * len(zeilen)
        d2.rounded_rectangle((max(60, Z['links'] + 5), hy, min(W - 60, Z['rechts'] - 5), hy + hgt), radius=28, fill=(20, 20, 20, 165))
        yy = hy + 28
        for z in zeilen:
            text_mitte('hook', d2, W / 2, yy, z, fH, ov.GOLD); yy += 72
    # Info: Titel (2 Zeilen), Preis, Fusszeile — links der Knopfleiste zentriert (CX_FUSS)
    inf = neu(); d3 = ImageDraw.Draw(inf)
    fy = unten - 270
    d3.rectangle((0, fy, W, unten), fill=(20, 20, 20, 168))
    d3.rectangle((cx - 100, fy + 16, cx + 100, fy + 20), fill=ov.GOLD)
    fT = ov.font(ov.F_BOLD, 46)
    maxw = 2 * min(cx - Z['links'] - 40, Z['fuss_rechts'] - cx - 20)
    zeilen = [z for z in (titel1, titel2) if z]
    if len(zeilen) == 1:
        zeilen = ov.wrap(d3, zeilen[0], fT, maxw, 2)
    zeilen = [z if d3.textlength(z, font=fT) <= maxw else ov.wrap(d3, z, fT, maxw, 1)[0] for z in zeilen][:2]
    y = fy + 28
    for z in zeilen:
        text_mitte('info', d3, cx, y, z, fT, ov.WHITE); y += 54
    if preis:
        text_mitte('info', d3, cx, y + 2, preis, ov.font(ov.F_BOLD, 68), ov.GOLD)
    y += 84
    fuss = 'luxestyle.ch · Klarna & TWINT · Gratis Versand ab CHF 50'     # Wortlaut wie overlay.main (keine neue Zusage)
    gr = 30
    while gr > 24 and d3.textlength(fuss, font=ov.font(ov.F_REG, gr)) > maxw:
        gr -= 1
    text_mitte('info', d3, cx, min(y, unten - gr - 12), fuss, ov.font(ov.F_REG, gr), (235, 235, 235, 255), schatten=False)
    # CTA (letzte ~2 s): Preis + «Link in Bio»
    ct = neu(); d4 = ImageDraw.Draw(ct)
    d4.rectangle((0, fy, W, unten), fill=(20, 20, 20, 168))
    d4.rectangle((cx - 100, fy + 16, cx + 100, fy + 20), fill=ov.GOLD)
    y = fy + 40
    if preis:
        text_mitte('cta', d4, cx, y, preis, ov.font(ov.F_BOLD, 76), ov.GOLD); y += 100
    text_mitte('cta', d4, cx, y, 'Link in Bio · luxestyle.ch', ov.font(ov.F_BOLD, 44), ov.WHITE)
    pfade = {}
    for name, im in (('kopf', k), ('hook', hk), ('info', inf), ('cta', ct)):
        pfade[name] = os.path.join(ordner, f'ebene_{name}.png'); im.save(pfade[name])
    # Zonenpruefung: alle Textkaesten in y oben..unten; im Knopfleisten-Band (y >= 950) rechts <= fuss_rechts
    fehler = []
    for name, ks in kasten.items():
        for (x0, y0, x1, y1) in ks:
            if y0 < oben or y1 > unten or x0 < Z['links'] or x1 > Z['rechts']:
                fehler.append(f'{name} {[int(v) for v in (x0, y0, x1, y1)]} ausserhalb {zone}')
            if y1 >= 950 and x1 > Z['fuss_rechts']:
                fehler.append(f'{name} rechts {int(x1)} > {Z["fuss_rechts"]} (Knopfleiste)')
    zeichen = dict(bild0=len('LUXESTYLE') + len(hook or ''), info=len(' '.join(zeilen)) + len(preis or '') + len(fuss),
                   cta=len(preis or '') + len('Link in Bio · luxestyle.ch'))
    return dict(pfade=pfade, textboxen={k_: [[int(v) for v in b] for b in v_] for k_, v_ in kasten.items()},
                zone=zone, zone_ok=not fehler, zone_fehler=fehler, zeichen=zeichen)


# ================================================================================================ 3 RENDER
def _zoom_expr(z, n):
    if z == 'bump':
        return "1+0.06*max(0\\,1-on/5)"
    if z == 'drift':
        return f"1+0.08*on/{max(1, n)}"
    if z == 'tight':
        return "1.12"
    return None


def render(P_, out, text=None, arbeitsordner=None, crf=23, preset='medium'):
    """Rendert den Plan. text = dict(titel1, titel2, preis, hook) oder None (nur Bild + Musik).
    Rueckgabe: Pruefung (gemessen am Ergebnis)."""
    t00 = time.time()
    tmp = tempfile.mkdtemp(prefix='schnitt_', dir=arbeitsordner or os.path.dirname(os.path.abspath(out)))
    try:
        quelle = P_['quelle']; st = P_['stuecke']; N = P_['frames']; D = N / FPS
        modus = P_['modus']
        # ---- Ton: Musik ab eingerastetem Einstieg, 48 kHz Stereo, kurze Kanten (kein Fade auf Stille), zweistufig -14 LUFS
        R = P_['musik']
        roh = os.path.join(tmp, 'musik.wav')
        _run([FF, '-y', '-v', 'error', '-ss', f"{R['einstieg']:.4f}", '-i', R['pfad'], '-t', f'{D:.4f}', '-vn',
              '-af', f'aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.02,afade=t=out:st={max(0, D - 0.15):.3f}:d=0.15,apad',
              '-t', f'{D:.4f}', '-ar', '48000', '-ac', '2', roh])
        # Ziel-TP -2.5 statt -1.5: die AAC-Kodierung hebt den True Peak um ~0,5-0,6 dB (GEMESSEN 23.09., hype2:
        # Ziel -1.5 -> -1.33 dBTP im MP4, Ziel -2.0 -> -1.31, Ziel -2.5 -> -1.93). Integrierte Lautheit bleibt -14.
        e = subprocess.run([FF, '-hide_banner', '-nostats', '-i', roh, '-af', 'loudnorm=I=-14:TP=-2.5:LRA=11:print_format=json',
                            '-f', 'null', '-'], capture_output=True, text=True).stderr
        m = json.loads(e[e.rindex('{'):e.rindex('}') + 1])
        ln = (f"loudnorm=I=-14:TP=-2.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
        mix = os.path.join(tmp, 'musik_n.wav')
        _run([FF, '-y', '-v', 'error', '-i', roh, '-af', f'{ln},aresample=48000', '-ar', '48000', '-ac', '2', mix])
        # ---- Text-Ebenen
        ebenen = None
        if text:
            ebenen = text_ebenen(tmp, text.get('titel1', ''), text.get('titel2', ''), text.get('preis', ''),
                                 text.get('hook', ''), P_.get('zone', 'organisch'))
            if not ebenen['zone_ok']:
                raise RuntimeError('Text ausserhalb der sicheren Zone: ' + '; '.join(ebenen['zone_fehler']))
        # ---- Videograph: je Stueck eigener Eingang mit -ss (framegenau), Geometrie, doppelter Trim, fps=30
        args = [FF, '-y', '-v', 'error', '-threads', THREADS, '-filter_complex_threads', THREADS]
        for s in st:
            args += ['-ss', f"{s['q_start']:.4f}", '-t', f"{s['q_dauer'] + 0.6:.4f}", '-i', quelle]
        k_mix = len(st); args += ['-i', mix]
        k_txt = {}
        if ebenen:
            for j, name in enumerate(('kopf', 'hook', 'info', 'cta')):
                k_txt[name] = len(st) + 1 + j; args += ['-i', ebenen['pfade'][name]]
        fc = []
        for k, s in enumerate(st):
            n = s['frames']; x, y, ww, hh = s['fenster']
            pts = 'setpts=PTS-STARTPTS' if s['tempo'] == 1.0 else f"setpts=(PTS-STARTPTS)/{s['tempo']}"
            # tpad: letzte Bilder klonen, falls das Stueck am Quellende liegt — sonst fehlt 1 Bild und jeder spaetere
            # Schnitt rutscht (Labor-Falle «overlay verliert je Stueck ein Bild», hier am Quellende)
            vor = (f"[{k}:v]{pts},fps=30,tpad=stop_mode=clone:stop=8,trim=start_frame=0:end_frame={n + 3},"
                   f"setpts=PTS-STARTPTS,crop={ww}:{hh}:{x}:{y}")
            ze = _zoom_expr(s['zoom'], n)
            zoom = (f",scale=2160:3840:flags=bicubic,zoompan=z='{ze}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                    f":s=1080x1920:fps=30") if ze else ''
            if modus == 'fill':
                geo = vor + (zoom if ze else ',scale=1080:1920:flags=lanczos')
                fc.append(f"{geo},setsar=1,fps=30,trim=start_frame=0:end_frame={n},setpts=PTS-STARTPTS[s{k}]")
            else:
                # Band: Fenster in voller Breite, mittig auf die sichtbare Zone (y 200-1440, Mitte 820); Grund = dasselbe
                # Fenster weichgezeichnet (so wiederholt der Grund keinen Text, den das Fenster gemieden hat)
                fw = 1080; fh = int(round(1080 * hh / ww / 2)) * 2
                if fh > 1920:
                    fh = 1920; fw = int(round(1920 * ww / hh / 2)) * 2
                fy = int(min(max(0, round(820 - fh / 2)), 1920 - fh))
                fc.append(f"{vor},split[b{k}][f{k}];[b{k}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                          f"boxblur=30:3,eq=brightness=-0.08[bb{k}];[f{k}]scale={fw}:{fh}:flags=lanczos[ff{k}];"
                          f"[bb{k}][ff{k}]overlay=(W-w)/2:{fy}{zoom},setsar=1,fps=30,"
                          f"trim=start_frame=0:end_frame={n},setpts=PTS-STARTPTS[s{k}]")
        fc.append(''.join(f'[s{k}]' for k in range(len(st))) + f'concat=n={len(st)}:v=1:a=0,fps=30[v0]')
        last = 'v0'
        if P_['loop'].get('art') == 'ueberblendung' and N > 30:
            fc.append(f"[v0]split[va][vb];[vb]trim=end_frame=1,loop=loop=11:size=1:start=0,setpts=N/30/TB,fps=30[kopfbild];"
                      f"[va][kopfbild]xfade=transition=fade:duration=0.4:offset={(N - 12) / FPS:.4f},fps=30[vl]")
            last = 'vl'
        if ebenen:
            T_ = P_['text']
            zeiten = dict(kopf=(0, D + 1), hook=tuple(T_['hook']), info=tuple(T_['info']), cta=tuple(T_['cta']))
            for j, name in enumerate(('kopf', 'hook', 'info', 'cta')):
                a, b = zeiten[name]
                if (name == 'hook' and not text.get('hook')) or b - a < 0.2:
                    continue
                en = f":enable='between(t\\,{a - 0.5 / FPS:.4f}\\,{b - 0.5 / FPS:.4f})'"
                fc.append(f"[{last}][{k_txt[name]}:v]overlay=0:0{en}[t{j}]"); last = f't{j}'
        fc.append(f'[{last}]format=yuv420p[v]')
        args += ['-filter_complex', ';'.join(fc), '-map', '[v]', '-map', f'{k_mix}:a', '-frames:v', str(N), '-t', f'{D:.4f}',
                 '-c:v', 'libx264', '-preset', preset, '-crf', str(crf), '-pix_fmt', 'yuv420p', '-r', '30',
                 '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out]
        t0 = time.time(); _run(args); t_render = time.time() - t0
        pr = pruefen(out, P_)
        pr['zeit_s'] = dict(render=_r(t_render, 1), gesamt=_r(time.time() - t00, 1))
        if ebenen:
            pr['text'] = dict(zone=ebenen['zone'], zone_ok=ebenen['zone_ok'], zeichen=ebenen['zeichen'], textboxen=ebenen['textboxen'])
        return pr
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def lautheit(p):
    e = subprocess.run([FF, '-hide_banner', '-nostats', '-i', p, '-vn', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
    try:
        m = json.loads(e[e.rindex('{'):e.rindex('}') + 1])
        return float(m['input_i']), float(m['input_tp'])
    except Exception:
        return None, None


def schnitt_versatz(p, grenzen, y0=500, y1=1150):
    """Misst im Ergebnis, wo der Bildsprung je Soll-Grenze liegt (Frames; 0 = exakt). Region zwischen Hook und Infofeld."""
    i = info(p)
    raw = _run([FF, '-v', 'error', '-threads', THREADS, '-i', p, '-an', '-vf',
                f'crop=1080:{y1 - y0}:0:{y0},scale=96:{int(96 * (y1 - y0) / 1080)}:flags=area,format=gray',
                '-f', 'rawvideo', '-'], text=False).stdout
    hh = int(96 * (y1 - y0) / 1080)
    g = np.frombuffer(raw, np.uint8)[: (len(raw) // (96 * hh)) * 96 * hh].reshape(-1, hh, 96).astype(np.float32)
    d = np.zeros(len(g)); d[1:] = np.abs(g[1:] - g[:-1]).mean(axis=(1, 2))
    out = []
    for b in grenzen:
        lo, hi = max(1, b - 3), min(len(d), b + 4)
        if lo >= hi:
            out.append(None); continue
        out.append(int(np.argmax(d[lo:hi])) + lo - b)
    naht = float(np.abs(g[-1] - g[0]).mean()) if len(g) > 1 else None
    # Referenz fuer die Naht: Bildwechsel UM die Naht (letzte 10 Bilder des Endes, erste 10 des Hooks, Schnittbilder
    # +-1 ausgenommen), 90. Perzentil. Global taugt nicht: blinkende LEDs machen auch benachbarte Quellbilder
    # verschieden (GEMESSEN p4: Naht 16,2 bei Quell-Nachbarn 15,9 = in Ordnung), waehrend Tempo-Stuecke und Handkamera
    # das globale p95 so heben, dass ein echter Zoom-Sprung durchginge (p3r: Naht 23,5 < global p95 24,8).
    maske = np.ones(len(d), bool); maske[0] = False
    for b in grenzen:
        maske[max(0, b - 1):b + 2] = False
    innen = d[maske] if maske.any() else d[1:]
    idx = [j for j in list(range(1, min(11, len(d)))) + list(range(max(1, len(d) - 10), len(d))) if maske[j]]
    lokal = d[idx] if idx else innen
    return dict(frames=len(g), versatz=out, naht_mad=_r(naht, 2) if naht is not None else None,
                bildwechsel_median=_r(float(np.median(innen)), 2) if len(innen) else None,
                naht_referenz=_r(float(np.percentile(lokal, 90)), 2) if len(lokal) else None, dauer=_r(i['dauer'], 3))


def pruefen(out, P_):
    i = info(out)
    e = subprocess.run([FF, '-hide_banner', '-i', out], capture_output=True, text=True).stderr
    pix = re.search(r'Video: (\w+).*?, (\w+)\(', e)
    I_, tp = lautheit(out)
    sv = schnitt_versatz(out, P_['schnitt_frames'])
    ok_v = [v for v in sv['versatz'] if v is not None]
    return dict(w=i['w'], h=i['h'], fps=_r(i['fps'], 3), dauer=_r(i['dauer'], 3), frames=sv['frames'], frames_soll=P_['frames'],
                codec=pix[1] if pix else None, pix_fmt=pix[2] if pix else None, audio_hz=i['ar'], audio_kanaele=i['kanaele'],
                lufs=I_, true_peak=tp, schnitt_versatz_frames=sv['versatz'],
                schnitte_im_toleranzband=sum(1 for v in ok_v if abs(v) <= 1), schnitte=len(sv['versatz']),
                loop_naht_mad=sv['naht_mad'], bildwechsel_median_mad=sv['bildwechsel_median'],
                naht_referenz_mad=sv['naht_referenz'],
                loop_naht_ok=(sv['naht_mad'] is not None and sv['naht_referenz'] is not None and
                              sv['naht_mad'] <= max(1.3 * sv['naht_referenz'], 4.0)))


# ================================================================================================ KONTAKTBOGEN
def kontaktbogen(video, out=None, spalten=6, tw=180):
    """Erste Sekunde in 6 Bildern (0,0/0,2/…/1,0 s) + 1 Bild je Sekunde + letztes Bild; Linien: sichere Zone 200/1440."""
    i = info(video); fps = i['fps'] or 30
    n_ges = max(1, int(round(i['dauer'] * fps)))
    erste = [min(n_ges - 1, int(round(k * 0.2 * fps))) for k in range(6)]
    sek = sorted(set([min(n_ges - 1, int(round(t * fps))) for t in range(0, int(i['dauer']) + 1)] + [n_ges - 1]))
    alle = sorted(set(erste + sek))
    th = int(round(tw * i['h'] / i['w'] / 2)) * 2
    sel = '+'.join(f'eq(n\\,{n})' for n in alle)
    raw = _run([FF, '-v', 'error', '-threads', THREADS, '-i', video, '-an', '-vf', f"select='{sel}',scale={tw}:{th}:flags=area",
                '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], text=False).stdout
    A = np.frombuffer(raw, np.uint8)
    A = A[: (A.size // (tw * th * 3)) * tw * th * 3].reshape(-1, th, tw, 3)
    bild = {n: A[k] for k, n in enumerate(alle[:len(A)])}
    reihen = [('0-1 s', erste)] + [('1/s', sek[j:j + spalten]) for j in range(0, len(sek), spalten)]
    kopf = 26; lab = 18
    Wb = spalten * (tw + 6) + 6; Hb = kopf + len(reihen) * (th + lab + 8) + 6
    im = Image.new('RGB', (Wb, Hb), (32, 32, 32)); d = ImageDraw.Draw(im)
    d.text((6, 5), f"{os.path.basename(video)}  {i['w']}x{i['h']}  {i['dauer']:.2f}s  {fps:.0f}fps  (oben: erste Sekunde)",
           fill=(240, 240, 240))
    y = kopf
    for r, (name, ns) in enumerate(reihen):
        for c, n in enumerate(ns):
            x = 6 + c * (tw + 6)
            if n in bild:
                im.paste(Image.fromarray(bild[n]), (x, y))
                if abs(i['w'] / i['h'] - 9 / 16) < 0.01:      # sichere Zone nur bei 9:16-Ausgaben einzeichnen
                    for yy in (200, 1440):
                        yl = y + int(yy / 1920 * th); d.line((x, yl, x + tw - 1, yl), fill=(0, 200, 255), width=1)
            d.text((x + 2, y + th + 2), f'{n / fps:.2f}s', fill=(255, 220, 120) if r == 0 else (220, 220, 220))
        y += th + lab + 8
    out = out or os.path.splitext(video)[0] + '_bogen.jpg'
    im.save(out, quality=88)
    return out


# ================================================================================================ CLI
def _drucke(d):
    print(json.dumps(d, ensure_ascii=False, indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o)))


def main(argv=None):
    ap = argparse.ArgumentParser(description='Schnitt-Motor fuer LuxeStyle-Reels (Analyse -> Plan -> Render)')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--analyse', metavar='QUELLE'); g.add_argument('--plan', metavar='QUELLE')
    g.add_argument('--render', metavar='QUELLE'); g.add_argument('--kontaktbogen', metavar='VIDEO')
    ap.add_argument('--musik'); ap.add_argument('--out'); ap.add_argument('--ziel', type=float, default=12.0)
    ap.add_argument('--einstieg', type=float); ap.add_argument('--zone', default='organisch', choices=list(ZONEN))
    ap.add_argument('--titel', default=''); ap.add_argument('--titel2', default=''); ap.add_argument('--preis', default='')
    ap.add_argument('--hook', default=''); ap.add_argument('--log'); ap.add_argument('--bogen-out')
    ap.add_argument('--dry', action='store_true'); ap.add_argument('--json', action='store_true')
    ap.add_argument('--kein-cache', action='store_true'); ap.add_argument('--crf', type=int, default=23)
    ap.add_argument('--hook-ab', type=float, help='Hook-Fenster ab dieser Quellsekunde (Sichtpruefung)')
    ap.add_argument('--sperren', default='', help='Quellsekunden nach Sichtpruefung sperren, z. B. "6.7-9.0,20.1-21.3"')
    a = ap.parse_args(argv)
    try:
        if a.kontaktbogen:
            print(kontaktbogen(a.kontaktbogen, a.bogen_out)); return 0
        quelle = a.analyse or a.plan or a.render
        if not os.path.isfile(quelle):
            raise FileNotFoundError(quelle)
        A = analyse(quelle, cache=not a.kein_cache)
        if a.analyse:
            kurz = {k: v for k, v in A.items() if k != 'profil'}
            _drucke(kurz)
            return 0 if A['nutzbar_sauber_s'] >= 6.0 else (print(f"UNGEEIGNET: nur {A['nutzbar_sauber_s']:.1f} s sauberes Material") or 3)
        if not a.musik:
            raise ValueError('--musik fehlt')
        if a.preis and not re.fullmatch(r'CHF \d+\.\d\d', a.preis.strip()):
            raise ValueError('--preis im Format «CHF 19.90» (live aus Shopify, nie erfinden)')
        hook = a.hook.strip()
        if len(hook) > 24:
            print(f'Hinweis: Hook {len(hook)} Zeichen > 24 (Regel: <= 24 Zeichen / 5 Woerter)', file=sys.stderr)
        sp = [tuple(float(v) for v in x.split('-')) for x in a.sperren.split(',') if x.strip()]
        P_ = plan(A, a.musik, ziel_s=a.ziel, einstieg=a.einstieg, zone=a.zone, hook_text=hook or None, sperren=sp,
                  hook_ab=a.hook_ab)
        if a.plan or a.dry:
            if a.log:
                json.dump(dict(analyse={k: v for k, v in A.items() if k != 'profil'}, plan=P_), open(a.log, 'w'), ensure_ascii=False, indent=1)
            _drucke(P_); return 0
        if not a.out:
            raise ValueError('--out fehlt')
        text = dict(titel1=a.titel, titel2=a.titel2, preis=a.preis, hook=hook) if (a.titel or a.preis or hook) else None
        pr = render(P_, a.out, text=text, crf=a.crf)
        logp = a.log or a.out + '.schnitt.json'
        json.dump(dict(analyse={k: v for k, v in A.items() if k != 'profil'}, plan=P_, pruefung=pr), open(logp, 'w'),
                  ensure_ascii=False, indent=1)
        erg = dict(ok=True, out=a.out, dauer=P_['dauer'], frames=P_['frames'], modus=P_['modus'], log=logp, pruefung=pr)
        print(json.dumps(erg, ensure_ascii=False) if a.json else json.dumps(erg, ensure_ascii=False, indent=1))
        return 0
    except Ungeeignet as e:
        print(f'UNGEEIGNET: {e}')
        return 3
    except Exception as e:
        print(f'FEHLER: {type(e).__name__}: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
