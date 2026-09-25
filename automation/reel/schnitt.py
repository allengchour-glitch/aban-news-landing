#!/usr/bin/env python3
"""schnitt.py — Schnitt-Motor fuer LuxeStyle-Reels (23.09.2026, Workflow «videoschnitt-lernen», Nachbesserung nach drei
Pruefberichten — Bildjury, Technik, Code — am selben Tag).

Warum: make_reel.sh spielt jede CJ-Quelle stumpf ab Sekunde 0 in einem 580-px-Band ab (START wird nie gelesen),
schneidet nie selbst und nie auf den Beat, laesst Lieferantentext, Schwarzbilder und Standbild-Dias durch und
wiederholt kurze Quellen per -stream_loop sichtbar. Gemessen (Lernberichte 23.09., dropship/VIDEOSCHNITT-LERNEN.md):
TikTok-Sehdauer Median 1,37 s ueber alle Laengen -> entschieden wird in den ersten 1,5 s; erste Einstellung im
Bestand Median 3,96 s; 13/56 Reels starten fast als Standbild; Videofenster 9-27 % der Flaeche; Schnitte
17 % auf dem Beat (Zufall 24 %).

Stufen (jede einzeln aufrufbar, jede Entscheidung mit Grund im Entscheidungslog):
  analyse(quelle)            -> Einstellungen mit Bewertung (Schaerfe, Bewegung, Helligkeit, Fremdtext/Fremdpreis/Logo,
                                 eingefroren/schwarz/Leerlauf), Kamerafahrten (schwache Grenzen), Dauer = dekodierbar.
                                 Cache: <quelle>.schnitt.json (Fingerabdruck inkl. OCR-Ausstattung)
  plan(analyse, musik, ziel) -> Schnittliste auf dem Beat-Raster (Phase auf dem Kick): Hook (staerkste Stelle ohne
                                 Uebergang, nie im Quell-Intro), Intro-Zone fuer ALLE Stuecke gesperrt, je Einstellung
                                 hoechstens 2 Auftritte, eine Kamerafahrt nur vorwaerts, ganze Takte, Loop-Ende,
                                 Band senkrecht nach verdeckter Energie, kurzes Reel mit «Link in Bio» im Infofeld.
  render(plan, out, text)    -> MP4 1080x1920, 25 fps (25/50-fps-Quellen) sonst 30, H.264 yuv420p + AAC 48 kHz Stereo,
                                 Ton zweistufig -14 LUFS / TP-Ziel -2,5, True Peak NACH dem Mux gemessen und per
                                 Limiter nachgeregelt; Zoom nur im Fenster; Text nur als PNG (overlay.py-Bausteine) in
                                 der sicheren Zone; keine Stimme. Rueckgabe: Pruefung mit ok/verstoesse (Tor).
  kontaktbogen(video)        -> JPG: erste Sekunde in 6 Bildern + 1 Bild/s (Sichtpruefung per Read).

CLI:
  schnitt.py --analyse QUELLE
  schnitt.py --plan QUELLE --musik STUECK [--ziel 12] [--einstieg SEK]
  schnitt.py --render QUELLE --musik STUECK --out DATEI [--einstieg SEK] [--titel Z1 --titel2 Z2 --preis "CHF 19.90"
             --hook "Produkt: Nutzen"] [--zone organisch|meta] [--sperren a-b,..] [--hook-ab SEK] [--log DATEI.json]
             [--arbeitsordner ORDNER] [--dry] [--json]
  schnitt.py --kontaktbogen VIDEO [--bogen-out BILD.jpg]
  schnitt.py --tessdata-holen ORDNER        (chi_sim.traineddata fuer SCHNITT_TESSDATA, einmalig, nie ins Repo)
  Exit-Codes: 0 ok (letzte stdout-Zeile JSON, pruefung.ok = true)
              3 Quelle ungeeignet (Fremdtext, zu wenig Material, eine kurze Kamerafahrt, nicht dekodierbar) —
                eine Zeile «UNGEEIGNET: …» auf stdout
              4 Reel gebaut, aber das Pruef-Tor am Ergebnis scheiterte (Bildzahl, Schnittversatz, erster Schnitt
                unsichtbar, LUFS, True Peak, Loop-Naht, Zone) — Datei geloescht, «PRUEFUNG: …» auf stdout, Log bleibt
              1 Fehler (stderr), u. a. Musikfehler (nicht in automation/music, keine CREDITS-Zeile, < 6 s ab Einstieg)

SCHNITTSTELLE fuer den Reel-Motor (cj_video_reel_engine.mjs — hier NICHT geaendert; so soll er es spaeter aufrufen):
  Statt make_reel.sh:
    const r = spawnSync('python3', ['automation/reel/schnitt.py', '--render', src, '--musik', musik,
        '--einstieg', String(mw.start), '--out', out, '--titel', z1, '--titel2', z2,
        '--preis', `CHF ${k.price.toFixed(2)}`, '--hook', hook, '--arbeitsordner', '/tmp/reelbuild/schnitt', '--json'],
        { encoding: 'utf8', timeout: 300000,
          env: { ...process.env, SCHNITT_TESSDATA: '/tmp/schnitt_tessdata' } });   // vorher einmal --tessdata-holen
    r.status === 0 -> letzte stdout-Zeile ist JSON {ok, out, dauer, frames, fps, modus, log, pruefung};
                      Entscheidungslog im Arbeitsordner (<out-name>.schnitt.json) — nach dem Posten loeschen oder
                      ausserhalb des Repos archivieren (das Repo ist oeffentlich; nur das Reel selbst gehoert nach
                      social/reels/, wie der Motor es heute ablegt).
    r.status === 3 -> Quelle ungeeignet: naechsten CJ-Clip des Produkts versuchen (queryVideosByProductId liefert im
                      Schnitt 2,4 Clips), sonst Produkt ins Ledger «schnitt-ungeeignet» — NIE auf make_reel.sh
                      zurueckfallen (das wuerde den Fremdtext posten).
    r.status === 4 -> Reel verwerfen, Clip ins Ledger «schnitt-pruefung» (deterministisch: nicht endlos wiederholen).
    sonst          -> Fehler (Musik/Umgebung), Reel verwerfen, naechster Lauf.
  Preis kommt live aus Shopify (k.price). Hook: Bild 0 = LUXESTYLE + Hook <= 40 Zeichen ist Pflicht (sonst Exit 1),
  Ziel <= 24 Zeichen (Produktwort + Nutzen). Die HOOKS des heutigen Motors sind generisch und bis 36 Zeichen lang —
  die Umstellung braucht eine eigene Hook-Funktion. Musik aus musikWahl() (nur eigene Stuecke mit CREDITS-Zeile);
  schnitt.py rastet den Einstieg auf den naechsten Kick-Schlag ein.
  Laufzeit ohne Cache bis ~90 s bei langen Text-Quellen (Technik-Pruefung x1) -> timeout >= 180 s; `--analyse` vorab
  ist idempotent (Cache) und kostet ~10-40 s.

Umgebung: SCHNITT_TESSDATA=<ordner mit chi_sim.traineddata> (sonst kein CJK-OCR: Hinweis im Log, pruefung.cjk_ocr=false),
          SCHNITT_THREADS (Standard 2, je ffmpeg-Eingang und Encoder), SCHNITT_MUSIK_FREI=1 nur fuer Selbsttests.
          Nur vorhandene Bibliotheken: numpy, scipy, PIL, librosa, pytesseract, PyAV.
"""
import argparse, copy, json, math, os, re, shlex, shutil, subprocess, sys, tempfile, time

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
W, H, FPS = 1080, 1920, 30          # FPS = Rueckfall; der Plan waehlt 25 fuer 25/50-fps-Quellen (siehe plan: 'fps')
VERSION = 9
TESS_URL = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/chi_sim.traineddata'   # 2'469'156 Byte
# Pruef-Tor am fertigen Reel (Exit 4, Datei geloescht): alles GEMESSEN am Ergebnis, nicht am Plan
TOR = dict(lufs=-14.0, lufs_tol=1.0, tp_max=-1.5, versatz_max=1, sicht_min=2.5)
CC_BY = {'voltaic.mp3', 'electrodoodle.mp3', 'digital-lemonade.mp3'}   # CREDITS.txt: Quellenangabe in jeder Caption
# BPM-Rueckfall, falls CREDITS.txt kein Tempo nennt (GEMESSEN Inventur 23.09.; liquid-dnb-electronic = DnB-Variante)
BPM_RUECKFALL = {'luxe-cinematic-house.wav': 122, 'luxe-liquid-dnb-electronic.wav': 174}
MARKEN = re.compile(r'\b(CHANEL|GUCCI|PRADA|DIOR|VUITTON|HERMES|ROLEX|NIKE|ADIDAS|PORSCHE|BALENCIAGA|VERSACE|'
                    r'CJDROPSHIPPING|DROPSHIPPING|TIKTOK|TEMU|ALIEXPRESS|TAOBAO|AMAZON|SHEIN|ALIBABA|1688)\b', re.I)
CJK_EINFACH = set('一二三十丨卜乙八入口日中大人了小上下丁厂')


class Ungeeignet(Exception):
    """Quelle taugt nicht fuer ein sauberes Reel (Exit 3)."""


class MusikFehler(ValueError):
    """Musik ungeeignet (Lizenz, Tempo, Laenge) — nie der Quelle anlasten (Exit 1, nicht 3)."""


def _thr():
    """-threads gilt in ffmpeg je Eingang/Ausgang (AVCodecContext-Option) — vor JEDES -i und vor die Ausgabe setzen."""
    return ['-threads', THREADS]


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
    cmd = [FF, '-v', 'error', '-filter_threads', THREADS, *_thr()]
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


OCR_STAT = {}          # lang -> [aufrufe, fehler]; OCR_FEHLER: die ersten Fehlermeldungen (Pruefbericht Code 23.09.)
OCR_FEHLER = []


def ocr(gray, lang='eng', tessdir=None):
    """Woerter mit conf und Box (Bildpixel). --psm 11 = verstreuter Text (Einblendungen).
    Rueckgabe None bei OCR-Fehler (nie still [] — ein stummer Ausfall machte den Fremdtext-Filter blind, Code-Pruefung
    23.09.). tessdir wird geschuetzt uebergeben: pytesseract zerlegt config per shlex (Pfad mit Leerzeichen)."""
    import pytesseract
    cfg = '--psm 11' + (f' --tessdata-dir {shlex.quote(tessdir)}' if tessdir else '')
    st = OCR_STAT.setdefault(lang, [0, 0]); st[0] += 1
    try:
        d = pytesseract.image_to_data(Image.fromarray(gray), lang=lang, config=cfg, output_type=pytesseract.Output.DICT)
    except Exception as e:
        st[1] += 1
        if len(OCR_FEHLER) < 5:
            OCR_FEHLER.append(f'{lang}: {type(e).__name__}: {str(e)[:160]}')
        return None
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


# Fremdpreise (Betreiber-Vorgabe «keine Fremdpreise im Bild»): Waehrungszeichen vor/nach einer Zahl, Waehrungscode,
# «50% OFF». Schon EIN Treffer macht die Einstellung zu Fremdtext (Pruefbericht Code 23.09.: «$12.99» ging durch).
PREIS = re.compile(r'([$€£¥￥₩]\s?\d)|(\d\s?[$€£¥￥₩元円])|(\d+(?:[.,]\d{1,2})?\s?(USD|EUR|RMB|CNY|JPY|KRW)\b)', re.I)
PROZENT_OFF = re.compile(r'\d+\s?%\s*(off|rabatt|sale)\b', re.I)


def _cjk_zeichen(t):
    """Han (ohne die einfachsten Striche), Kana (U+3040-30FF), Hangul (U+AC00-D7A3)."""
    return [ch for ch in t if (('一' <= ch <= '鿿' and ch not in CJK_EINFACH) or '぀' <= ch <= 'ヿ'
                               or '가' <= ch <= '힣')]


def fremdtext_woerter(woerter_eng, woerter_cjk):
    """Bewertet OCR-Treffer eines Bildes. Rueckgabe: dict mit lateinischen Woertern, Handles, Marken, CJK-Paaren,
    Fremdpreisen, Boxen. None-Listen (OCR-Fehler) zaehlen als leer — der Fehler wird separat gezaehlt (OCR_STAT)."""
    lat, handles, marken, cjk, preise, boxen = [], [], [], [], [], []
    woerter_eng = woerter_eng or []; woerter_cjk = woerter_cjk or []
    for t, c, x, y, w, h in woerter_eng:
        if '@' in t and c >= 50 and re.search(r'@[\w.]{3,}', t):
            handles.append(t); boxen.append((x, y, w, h))
        if c >= 60 and re.search(r'(www\.|\.com\b|\.cn\b)', t, re.I):
            handles.append(t); boxen.append((x, y, w, h))
        if c >= 50 and PREIS.search(t):
            preise.append(t); boxen.append((x, y, w, h))
        m = re.sub(r'[^A-Za-zÄÖÜäöüß]', '', t)
        if c >= 60 and MARKEN.search(t):
            marken.append(t); boxen.append((x, y, w, h))
        elif c >= 75 and len(m) >= 4 and re.search(r'[aeiouyAEIOUY]', m):
            lat.append(m.lower()); boxen.append((x, y, w, h))
    # «50% OFF» steht oft als zwei OCR-Woerter -> auf der Zeile (Nachbarwort) pruefen
    sich = [(t, c, x, y, w, h) for t, c, x, y, w, h in woerter_eng if c >= 50]
    for k, (t, c, x, y, w, h) in enumerate(sich):
        nachbar = sich[k + 1][0] if k + 1 < len(sich) else ''
        if '%' in t and PROZENT_OFF.search(f'{t} {nachbar}'):
            preise.append(f'{t} {nachbar}'.strip()); boxen.append((x, y, w, h))
    for t, c, x, y, w, h in woerter_cjk:
        z = _cjk_zeichen(t)
        if c >= 80 and len(z) >= 2:
            cjk.append(''.join(z)); boxen.append((x, y, w, h))
        if c >= 50 and PREIS.search(t):
            preise.append(t); boxen.append((x, y, w, h))
    return dict(lat=lat, handles=handles, marken=marken, cjk=cjk, preise=preise, boxen=boxen)


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
def _cache_pfad(quelle, ordner=None):
    return os.path.join(ordner, os.path.basename(quelle) + '.schnitt.json') if ordner else quelle + '.schnitt.json'


def _fingerabdruck(quelle, ocr_an=True):
    """Quelle + Version + OCR-Ausstattung: eine Analyse ohne CJK-OCR darf nicht aus dem Cache kommen, wenn jetzt
    chi_sim da ist (Code-Pruefung 23.09.: --analyse ohne, --render mit SCHNITT_TESSDATA las still den alten Cache)."""
    st = os.stat(quelle)
    return f"{st.st_size}-{int(st.st_mtime)}-v{VERSION}-ocr{int(bool(ocr_an))}-cjk{int(bool(ocr_an and tessdata_cjk()))}"


NACHBAR_FENSTER = 8     # Bilder je Seite (war 3)


def _schnitt_kandidaten(st_, ss_, dur):
    """Harte Schnitte aus dem scene-Wert JEDES Bildes -> ([(t, score, stark)], verdacht).
    stark = absolut >= 0,2 (Labor: 26/28 Schnitte, 0 Fehlalarme); schwach = relativ: >= 0,08, >= 6x Median der +-12
    Nachbarbilder, >= 4x das Maximum der +-3 UND >= 1,5x das Maximum der +-8 Nachbarbilder.
    GEMESSEN p3 (23.09.): Kamerawechsel zwischen aehnlichen Blickwinkeln bei 9,16 s hatte scene 0,167 (Nachbarn 0,02).
    GEMESSEN Technik-Pruefung 23.09.: periodisches Ruckeln (Spitze alle 4 Bilder: p1 20,36/20,52/20,68/20,84 s je
    0,09-0,13; p4 um 4,72 s) ueberlistete den +-3-Nachbartest -> Scheinschnitte (p1 Bild 271 scdet 3,3, p4 Bild 29
    = Ruckler). Im +-8-Fenster liegt die naechste Spitze. Schwache Grenzen tragen die Marke 'stark=False': der
    Plan behandelt Einstellungen hinter einer schwachen Grenze als dieselbe Kamerafahrt (Sprungregel 0,4 s)."""
    ss_ = np.asarray(ss_, float); st_ = np.asarray(st_, float)
    if len(ss_) == 0:
        return [], []
    medn = nd.median_filter(ss_, size=25, mode='nearest')

    def nachbarn(k, n):
        v = np.concatenate([ss_[max(0, k - n):k], ss_[k + 1:k + n + 1]])
        return float(v.max()) if len(v) else 0.0
    nah = np.array([nachbarn(k, 3) for k in range(len(ss_))])
    weit = np.array([nachbarn(k, NACHBAR_FENSTER) for k in range(len(ss_))])
    # nah (+-3): >= 4x (Doppelbild-Quellen, Doppelschritt); weit (+-8): >= 1,5x (periodisches Ruckeln alle 4 Bilder).
    # GEMESSEN 23.09.: p1 20,68 s 0,128 bei weit 0,107 (1,2x, Schein) und p4 4,72 s ~1,0x (Schein) fallen raus;
    # p3 27,96 s 0,194 bei nah 0,038 / weit 0,107 (1,8x) ist ein echter Kamerawechsel (Sichtpruefung) und bleibt.
    kand_idx = [k for k in range(len(ss_)) if ss_[k] >= 0.2 or (ss_[k] >= 0.08 and ss_[k] >= 6 * max(medn[k], 0.002)
                                                              and ss_[k] >= 4 * nah[k] and ss_[k] >= 1.5 * weit[k])]
    # schwache Spruenge (0,12-0,2) ohne Schnitt-Status: der Hook beginnt nie darauf (Loop-Naht)
    ki = set(kand_idx)
    verdacht = [float(st_[k]) for k in range(len(ss_)) if 0.12 <= ss_[k] and k not in ki]
    roh = []
    for k in kand_idx:                                    # Treffer < 0,1 s: nur den staerksten behalten
        if roh and st_[k] - roh[-1][0] <= 0.1:
            if ss_[k] > roh[-1][1]:
                roh[-1] = (float(st_[k]), float(ss_[k]), bool(ss_[k] >= 0.2))
            continue
        roh.append((float(st_[k]), float(ss_[k]), bool(ss_[k] >= 0.2)))
    return [x for x in roh if 0.1 < x[0] < dur - 0.1], verdacht


def analyse(quelle, cache=True, cache_pfad=None, ocr_an=True):
    """Einstellungen + Bewertung. Ergebnis wird als JSON neben der Quelle gecacht (<quelle>.schnitt.json)."""
    cp = cache_pfad or _cache_pfad(quelle)
    fa = _fingerabdruck(quelle, ocr_an)
    if cache and os.path.exists(cp):
        try:
            d = json.load(open(cp))
            if d.get('fingerabdruck') == fa:
                d['aus_cache'] = True
                return d
        except Exception:
            pass
    T = {}; t00 = time.time()
    try:
        i = info(quelle)
    except RuntimeError as e:
        # kaputter Download (0 Byte, Zufall, moov fehlt, nur Ton): naechsten Clip nehmen statt «Fehler, naechster Lauf»
        # (Technik-Pruefung 23.09.: Exit 1 liess den Motor denselben Clip endlos wieder versuchen)
        raise Ungeeignet(f'Quelle nicht dekodierbar ({e}) — Download pruefen')
    if i['dauer'] < 1.0 or i['w'] < 16:
        raise Ungeeignet(f"Quelle zu kurz oder leer ({i['dauer']:.2f} s, {i['w']}x{i['h']})")
    dur = i['dauer']; hw_ = i['h'] / i['w']
    fmt = 'hochkant' if hw_ >= 1.2 else ('quadrat' if hw_ >= 0.85 else 'quer')

    # (a) harte Schnitte aus dem scene-Wert jedes Bildes (Regeln in _schnitt_kandidaten)
    t0 = time.time()
    out = _run([FF, '-hide_banner', '-nostats', '-filter_threads', THREADS, *_thr(), '-i', quelle, '-vf',
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
    roh, verdacht = _schnitt_kandidaten(st_, ss_, dur)
    hart = [t for t, _, _ in roh]
    schwach_t = [t for t, _, stark in roh if not stark]
    T['schnitte'] = _r(time.time() - t0, 2)

    # (b) 15 fps / 160 px: Bewegung (MAD, Skala wie Handwerk-Messung: Bestandsmedian 4,27), Helligkeit, Schwarz, Histogramm
    t0 = time.time()
    A = bilder(quelle, fps=15, lang=160, i=i); dt = 1 / 15
    g = A.astype(np.float32).mean(axis=3)
    n15 = len(g)
    if n15 < 15:
        raise Ungeeignet(f'Quelle nicht dekodierbar (nur {n15} Bilder) — Download pruefen')
    # Dauer = was sich DEKODIEREN laesst, nicht die Kopfzeile. GEMESSEN Technik-Pruefung 23.09.: abgebrochener
    # Faststart-Download (Kopf 26,04 s, dekodierbar 13,6 s) -> Plan nahm Stuecke ab 13,7 s, Reel 7,8 statt 11,5 s,
    # ohne CTA und Loop-Ende — und Exit 0.
    abgeschnitten = None
    if n15 * dt < dur - 0.3:
        abgeschnitten = dict(kopf_s=_r(dur, 2), dekodiert_s=_r(n15 * dt, 2))
        dur = n15 * dt
        hart = [t for t in hart if t < dur - 0.1]
        schwach_t = [t for t in schwach_t if t < dur - 0.1]
        verdacht = [t for t in verdacht if t < dur]
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
    # mot[k] = |Bild k - Bild k-1|: ein Lauf mot<thr ab k heisst, Bild k-1 steht schon still -> Lauf ein Abtastbild
    # frueher beginnen lassen (Code-Pruefung 23.09.: sonst blieben die ersten 1/15 s jedes Standbilds «nutzbar»)
    def _vorziehen(m):
        m = np.asarray(m, bool)
        return m | np.r_[m[1:], False]
    einfr_iv = _laeufe(_vorziehen(mot < 0.35), dt, min_s=0.8)     # freezedetect-Aequivalent (Kritik: |Δ|<0,35 > 0,8 s)
    leer_iv = _laeufe(_vorziehen(mot_s < 2.0), dt, min_s=0.8)     # Leerlauf-Regel Handwerk (< 2/255 laenger als 0,8 s)

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
    st0 = {k: list(v) for k, v in OCR_STAT.items()}
    if ocr_an and len(G2):
        idx = list(range(0, len(G2), 2))
        if len(idx) > 60:                                          # Deckel: sehr lange Quellen gleichmaessig ausduennen
            idx = sorted(set(int(round(x)) // 2 * 2 for x in np.linspace(0, len(G2) - 1, 60)))
        for k in idx:
            we = ocr(G2[k], 'eng')
            wc = ocr(G2[k], 'chi_sim', tess) if (tess and (k // 2) % 2 == 0) else []
            ocr_bilder[k] = fremdtext_woerter(we, wc)
    T['text_ocr'] = _r(time.time() - t0, 2)

    def _ocr_delta(lang):
        a, f = OCR_STAT.get(lang, [0, 0]); a0, f0 = st0.get(lang, [0, 0])
        return a - a0, f - f0
    eng_n, eng_f = _ocr_delta('eng'); cjk_n, cjk_f = _ocr_delta('chi_sim')
    if ocr_an and eng_n and eng_f == eng_n:
        # stummer OCR-Ausfall = blinder Fremdtext-Filter -> nie weiterrechnen (Code-Pruefung 23.09.)
        raise RuntimeError('OCR (eng) faellt bei jedem Aufruf aus: ' + '; '.join(OCR_FEHLER[:2]))

    # (g) statische Ebene (Wasserzeichen/Eck-Logo): nur kleine Boxen am Rand oder mit OCR-Buchstaben zaehlen
    #     (grosse ruhige Kanten sind bei Stativ-Clips das Produkt selbst)
    # Ruhige Quelle (Stativ, eine Einstellung): dort steht fast alles still, jede Szenenkante wird «statisch».
    # GEMESSEN Technik-Pruefung 23.09.: 12 s aus p3-E6 -> Exit 3 «Logo» fuer Tischkante, Sandalenriemen, Fuss. Anteil
    # ruhiger Pixel (std <= 12 ueber alle 2-fps-Bilder): Mehr-Einstellungs-Quellen p1-p3, x1-x3 0,000-0,022;
    # Stativ/Einzelfahrt p4 0,452, eine_einstellung 0,499, kurz6_5 0,302 -> Schwelle 0,15. In ruhigen Quellen zaehlt
    # eine statische Box nur mit OCR-Buchstaben, Schrift-Kanten (textboxen in >= 50 % der Bilder) oder in einer Ecke.
    logos, logos_verworfen = [], []
    ruhig_anteil = None
    if len(G2) >= 6:
        Gs = G2[:, ::2, ::2]
        ruhig_anteil = float((Gs.astype(np.float32).std(axis=0) <= 12).mean())
        ruhig = ruhig_anteil > 0.15
        for (x, y, w, h) in statische_ebene(Gs):
            X, Y, Wb, Hb = [int(v * sx2 * 2) for v in (x, y, w, h)]
            flaeche = Wb * Hb / (i['w'] * i['h'])
            am_rand = X < 0.2 * i['w'] or X + Wb > 0.8 * i['w'] or Y < 0.2 * i['h'] or Y + Hb > 0.8 * i['h']
            mit_ocr = any(_box_schnitt((X, Y, Wb, Hb), tuple(int(v * sx2) for v in b))
                          for fb in ocr_bilder.values() for b in fb['boxen'])
            duenn = min(Wb, Hb) < 20 or (max(Wb, Hb) / max(1, min(Wb, Hb)) > 8 and am_rand)
            if duenn:
                continue        # Randlinie/Rahmen der Quelle (GEMESSEN p4: 10x558-px-Streifen an x=0), kein Logo
            if not (flaeche < 0.12 and (am_rand or mit_ocr)):
                continue
            if ruhig and not mit_ocr:
                schrift = np.mean([any(_box_schnitt((X, Y, Wb, Hb), tuple(int(v * sx2) for v in b_)) for b_ in B)
                                   for B in heur]) if heur else 0.0
                ecke = ((X + Wb <= 0.25 * i['w'] or X >= 0.75 * i['w']) and
                        (Y + Hb <= 0.15 * i['h'] or Y >= 0.85 * i['h']) and flaeche < 0.03)
                if schrift < 0.5 and not ecke:
                    logos_verworfen.append(dict(box=[X, Y, Wb, Hb], grund=f'ruhige Quelle ({ruhig_anteil:.0%} ruhige Pixel): '
                                                f'statische Szenenkante ohne Schrift ({schrift:.0%}) und nicht in einer Ecke'))
                    continue
            logos.append(dict(box=[X, Y, Wb, Hb], flaeche=_r(flaeche, 4), am_rand=bool(am_rand), ocr=bool(mit_ocr)))

    # (h) Ton (Quellton wird nie verwendet — nur zur Doku)
    ton = dict(vorhanden=bool(i['ton']), mittel_db=None)
    if i['ton']:
        e = subprocess.run([FF, '-hide_banner', '-nostats', '-i', quelle, '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
        m = re.search(r'mean_volume:\s*(-?[\d.]+)', e)
        ton['mittel_db'] = float(m[1]) if m else None

    # (i) Einstellungen
    schwach_set = {_r(t) for t in schwach_t}
    intern = [(t, 'hart_schwach' if _r(t) in schwach_set else 'hart') for t in hart] + [(t, 'weich') for t in weich]
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
    rand_a = {'anfang': 0.01, 'hart': 0.01, 'hart_schwach': 0.01, 'weich': 0.32, 'schwarz': 0.08}
    rand_e = {'ende': 0.04, 'hart': 0.02, 'hart_schwach': 0.02, 'weich': 0.32, 'schwarz': 0.08}
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
        lat, han, mar, cjk, pre, bx, proben = set(), set(), set(), set(), set(), [], 0
        for kk, fb in ocr_bilder.items():
            if a - 0.01 <= kk / 2 < b:
                proben += 1
                lat |= set(fb['lat']); han |= set(fb['handles']); mar |= set(fb['marken']); cjk |= set(fb['cjk'])
                pre |= set(fb['preise'])
                bx += [tuple(int(v * sx2) for v in b_) for b_ in fb['boxen']]
        if ocr_an and proben == 0 and len(G2):                     # sehr kurze Einstellung: Mitte nachlesen
            kk = min(len(G2) - 1, int((a + b)))                      # 2 fps -> Index = t*2
            fb = fremdtext_woerter(ocr(G2[kk], 'eng'), ocr(G2[kk], 'chi_sim', tess) if tess else [])
            proben = 1; lat |= set(fb['lat']); han |= set(fb['handles']); mar |= set(fb['marken']); cjk |= set(fb['cjk'])
            pre |= set(fb['preise'])
            bx += [tuple(int(v * sx2) for v in b_) for b_ in fb['boxen']]
        gruende = []
        if pre:
            gruende.append(f"Fremdpreis ({', '.join(sorted(pre)[:3])})")
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
        if e_text >= 0.2 and len(lat) < 3 and not (han or mar or cjk or pre):
            gruende.append(f"Textzeilen in {e_text:.0%} der Bilder ohne lesbares Latein (Verdacht chinesische/fremde "
                           "Schrift — OCR liest Szenentext nicht)")
            for kk in range(s2.start, min(s2.stop, len(heur))):
                if text2[kk]:
                    bx += [tuple(int(v * sx2) for v in b_) for b_ in heur[kk]]
        e['ocr'] = dict(proben=proben, woerter=sorted(lat)[:20], handles=sorted(han), marken=sorted(mar), cjk=sorted(cjk),
                        preise=sorted(pre))
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
             leerlauf=leer_iv, logos=logos, logos_verworfen=logos_verworfen,
             ruhige_pixel=_r(ruhig_anteil, 3) if ruhig_anteil is not None else None, einstellungen=einst,
             abgeschnitten=abgeschnitten,
             ocr=dict(an=bool(ocr_an), eng=bool(ocr_an and eng_n > eng_f), chi_sim=bool(tess and cjk_n > cjk_f),
                      proben=len(ocr_bilder), tessdata=tess, aufrufe_eng=eng_n, fehler_eng=eng_f,
                      aufrufe_cjk=cjk_n, fehler_cjk=cjk_f, fehler=OCR_FEHLER[:3]),
             profil=dict(dt=_r(dt, 6), bewegung=[_r(x, 2) for x in mot_s], bewegung_roh=[_r(x, 2) for x in mot],
                         hell=[_r(x, 1) for x in hell], schaerfe4=[_r(x, 2) for x in rel]),
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
def _credits_original():
    """Dateinamen aus den ORIGINAL-Abschnitten von CREDITS.txt (alles nach der ersten «— ORIGINAL»-Zeile)."""
    try:
        txt = open(os.path.join(MUSIK_DIR, 'CREDITS.txt'), encoding='utf8').read()
    except OSError:
        return set()
    k = txt.find('— ORIGINAL')
    return set(re.findall(r'^\s*-\s+([\w.-]+\.(?:wav|mp3|m4a|flac))\b', txt[k:] if k >= 0 else '', re.M))


def musik_pfad(musik, log=None):
    """Nur eigene Stuecke aus automation/music/ (Betreiber-Vorgabe). Code-Pruefung 23.09.: vorher nahm musik_pfad jeden
    existierenden Pfad an. Ausnahme nur fuer Selbsttests: SCHNITT_MUSIK_FREI=1 (Klickspuren)."""
    p = musik if os.path.isfile(musik) else os.path.join(MUSIK_DIR, os.path.basename(musik))
    if not os.path.isfile(p):
        raise MusikFehler(f'Musik nicht gefunden: {musik}')
    name = os.path.basename(p)
    if name in CC_BY:
        raise MusikFehler(f'{name} ist CC BY (Quellenangabe in jeder Caption) — nur eigene Stuecke erlaubt')
    if os.environ.get('SCHNITT_MUSIK_FREI') == '1':
        return p
    if os.path.dirname(os.path.realpath(p)) != os.path.realpath(MUSIK_DIR):
        raise MusikFehler(f'{p} liegt nicht in automation/music/ — nur eigene, in CREDITS.txt freigegebene Stuecke')
    if name not in _credits_original():
        if name in BPM_RUECKFALL:
            if log is not None:
                log.append(f'{name}: Lizenzzeile fehlt in CREDITS.txt (Material-Inventur 23.09.) — zugelassen ueber '
                           'BPM_RUECKFALL, Zeile nachtragen')
        else:
            raise MusikFehler(f'{name} steht in keinem ORIGINAL-Abschnitt von CREDITS.txt — erst Lizenz und Tempo '
                              'eintragen, dann einstiege.py laufen lassen')
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
    """Einstiege aus _einstiege.json. Fehlende Datei/Eintrag -> []; kaputtes JSON -> Fehler (nicht still 0,0 s)."""
    pf = os.path.join(MUSIK_DIR, '_einstiege.json')
    if not os.path.isfile(pf):
        return []
    try:
        E = json.load(open(pf))
    except ValueError as e:
        raise MusikFehler(f'_einstiege.json nicht lesbar: {e}')
    return [float(x) for x in E.get(name, {}).get('einstiege', [])]


def _audio_mono(p, start, dauer, sr=22050):
    raw = _run([FF, '-v', 'error', *_thr(), '-ss', f'{max(0, start):.3f}', '-i', p, '-t', f'{dauer:.3f}', '-vn', '-ac', '1',
                '-ar', str(sr), '-f', 'f32le', '-'], text=False).stdout
    return np.frombuffer(raw, np.float32).copy(), sr


def _tiefton_huelle(y, sr, hop, fg=150.0):
    """Onset-Huelle des Tieftons (< fg Hz): positive Differenz des log-RMS je hop. Fuer die Kick-Phase."""
    from scipy import signal
    sos = signal.butter(4, fg, btype='low', fs=sr, output='sos')
    yl = signal.sosfilt(sos, np.asarray(y, np.float64))
    n = len(yl) // hop
    if n < 4:
        return np.zeros(0), np.zeros(0)
    rms = np.sqrt((yl[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
    lg = np.log(rms + 1e-5)
    env = np.maximum(0.0, np.diff(lg, prepend=lg[0]))
    return env, np.arange(n) * hop / sr


def _phasen_score(env, t, phi, P, tol=0.025):
    """Mittlere Spitze der Huelle an den Rasterpunkten phi + k*P (+-tol)."""
    if len(env) == 0:
        return 0.0
    ks = np.arange(0, int((t[-1] - phi) / P) + 1)
    werte = []
    for k in ks:
        m = (t >= phi + k * P - tol) & (t <= phi + k * P + tol)
        if m.any():
            werte.append(float(env[m].max()))
    return float(np.mean(werte)) if werte else 0.0


def beat_raster(musik, einstieg, dauer_max, cache_ordner=None):
    """Beat-Raster ab dem (eingerasteten) Einstieg: Periode aus CREDITS (Oktav-sicher) fein justiert (+-1,5 %) und
    Phase per Kamm-Filter auf der Onset-Huellkurve. Rueckgabe: dict(einstieg (auf Beat), periode, bpm, guete …).
    Im Reel liegt Beat j dann bei j*periode (Phase 0)."""
    p = musik_pfad(musik); name = os.path.basename(p)
    key = f"v{VERSION}|{name}|{os.path.getsize(p)}|{einstieg:.3f}|{dauer_max:.2f}"
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
    # Phase = Kick (Zaehlzeit), nicht librosa. Der Kamm-Filter greift bei lauten Offbeat-Hi-Hats die halbe Periode
    # daneben; die fruehere Angleichung an librosa machte es bei luxe-house2 schlimmer (librosa lag selbst auf dem
    # Offbeat). GEMESSEN Technik-Pruefung 23.09. am AUSGABE-Ton: house2 0/14 Schnitte im Fenster -100/+33 ms zum Kick,
    # Schnitt minus Kick +177..+227 ms bei 475 ms Periode; eigene Messung aller 12 Stuecke: house2-Kicks 0 % auf dem
    # Raster / 100 % auf dem Halbraster, alle anderen mit klarem Kick auf dem Raster (house1/hype1-3 100 %).
    # Entscheid: Tiefton-Onsets (< 150 Hz) an Raster vs. Halbraster; nur bei klarem Unterschied (>= 1,3x) umlegen.
    phase_korr = False
    kick = None
    envk, tk = _tiefton_huelle(y, sr, hop)
    if len(envk):
        k0 = _phasen_score(envk, tk, phi, P); k1 = _phasen_score(envk, tk, (phi + P / 2) % P, P)
        kick = dict(raster=_r(k0, 4), halbraster=_r(k1, 4))
        if k1 >= 1.3 * k0 and k1 > 0.02:
            phi = (phi + P / 2) % P; phase_korr = True
            kick['umgelegt'] = True
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
             kamm_score=_r(sc, 3), guete=guete, phase_auf_kick=phase_korr, kick_phase=kick, musik_dauer=_r(mi['dauer'], 2))
    C[key] = r
    try:
        json.dump(C, open(cf, 'w'), ensure_ascii=False)
    except OSError:
        pass
    return r


# ================================================================================================ 2 PLAN
ZONEN = {
    # organisch: Betreiber-Screenshot 23.09. (TikTok/IG-Oberflaeche), Knopfleiste x > 930 bei y 950-1500 (overlay.py)
    # oben=ov.KOPF_Y (25.09.: 200 → 250, IG-Profilraster schneidet auf 3:4 = y 240-1680, Reel-Symbol bei y 270-355)
    'organisch': dict(oben=ov.KOPF_Y, unten=1440, links=0, rechts=1080, fuss_rechts=930, cx=ov.CX_FUSS),
    # Meta-Anzeigen: 14 % oben, 35 % unten, 6 % seitlich frei (Meta Ads Guide Reels)
    'meta': dict(oben=269, unten=1248, links=65, rechts=1015, fuss_rechts=1015, cx=540),
}
KOPF_H = 130               # Kopfleiste oben .. oben+130 (wie overlay.KOPF_Y 200-330)
HOOK_OFS = 150             # Hook-Kasten ab oben+150, Hoehe 56 + 72 je Zeile
INFO_H = 270               # Infofeld/CTA unten-270 .. unten (wie overlay.FUSS_Y 1170-1440)


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
    """Beweis «nachweislich sauber»: OCR (eng + ggf. chi_sim, Fremdpreise) + Kanten-Heuristik auf dem zugeschnittenen
    Fenster, Proben gleichmaessig ueber die GANZE Einstellung (Abstand <= 1 s, 3-10 Proben).
    Code-/Technik-Pruefung 23.09.: vorher nur die ersten 8 s (je 0,5 s, hoechstens 16) und «sauber» auch dann, wenn keine
    einzige Probe gelesen wurde; x1 (53,7 s, 12 Text-Einstellungen) brauchte damit 89 s."""
    x, y, w, h = fenster
    tess = tessdata_cjk()
    dauer = max(0.0, e['ende'] - e['start'] - 0.15)
    n = min(10, max(3, int(math.ceil(dauer / 1.0))))
    zs = zeiten or (list(np.linspace(e['start'] + 0.1, e['ende'] - 0.05, n)) if dauer > 0 else [(e['start'] + e['ende']) / 2])
    geprueft = 0
    for t in zs:
        g = bild_bei(quelle, t, kurz=min(i['w'], i['h']), i=i)
        if g is None:
            continue
        sx = g.shape[1] / i['w']
        c = g[int(y * sx):int((y + h) * sx), int(x * sx):int((x + w) * sx)]
        if c.size == 0:
            continue
        we = ocr(c, 'eng')
        if we is None:
            return False, f't={t:.1f}s: OCR-Fehler (kein Nachweis moeglich)'
        fb = fremdtext_woerter(we, ocr(c, 'chi_sim', tess) if tess else [])
        # strenger als bei der Suche: schon 1 Wort >= 4 Buchstaben (conf >= 75) zaehlt; dazu die Kanten-Heuristik
        # (fuer Szenentext in fremder Schrift, den OCR nicht liest)
        treffer = fb['lat'] + fb['handles'] + fb['marken'] + fb['cjk'] + fb['preise']
        if treffer:
            return False, f"t={t:.1f}s: {', '.join(treffer[:4])}"
        k540 = 540 / min(c.shape)
        cc = np.asarray(Image.fromarray(c).resize((max(2, int(c.shape[1] * k540)), max(2, int(c.shape[0] * k540)))))
        if hat_text(cc):
            return False, f't={t:.1f}s: Textzeilen im Fenster (Heuristik)'
        geprueft += 1
    if geprueft < min(3, len(zs)):
        return False, f'nur {geprueft} von {len(zs)} Proben lesbar — kein Nachweis'
    return True, f'{geprueft} Proben ueber {dauer:.1f} s ohne Fremdtext'


def _hook_zeilen(hook):
    """Zeilenzahl des Hook-Kastens (wie text_ebenen: Bold 58, Breite 880, hoechstens 2 Zeilen)."""
    if not hook:
        return 0
    d = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
    return len(ov.wrap(d, hook, ov.font(ov.F_BOLD, 58), 880, 2))


def plan(A, musik, ziel_s=12.0, einstieg=None, zone='organisch', hook_text=None, cache_ordner=None, sperren=(),
         hook_ab=None):
    """Schnittliste + Entscheidungslog. A = analyse(...). Wirft Ungeeignet, wenn kein sauberes Reel moeglich ist,
    MusikFehler bei unbrauchbarer Musik.
    sperren = [(a, b), …] Quellsekunden, die nach Sichtpruefung nicht verwendet werden duerfen (z. B. chinesische
    Verpackung im Hintergrund — OCR liest Szenentext nicht, GEMESSEN p2)."""
    log = []

    def L(schritt, entscheidung, grund, **werte):
        log.append(dict(schritt=schritt, entscheidung=entscheidung, grund=grund, **({'werte': werte} if werte else {})))

    quelle = A['quelle']; qw, qh = A['w'], A['h']
    hinweise = []
    mp = musik_pfad(musik, log=hinweise); mname = os.path.basename(mp)
    for h_ in hinweise:
        L('musik', 'Lizenzhinweis', h_)
    ein_liste = einstiege(mname)
    if einstieg is not None:
        E = float(einstieg); e_grund = 'Einstieg vom Aufrufer (musikWahl im Reel-Motor)'
    elif ein_liste:
        E = ein_liste[0]; e_grund = 'Einstieg aus _einstiege.json (gemessenes Energie-Fenster)'
    else:
        E = 0.0; e_grund = 'KEIN Eintrag in _einstiege.json -> 0,0 s (Intro des Stuecks!) — automation/music/einstiege.py laufen lassen'
    L('musik', f'{mname} ab {E:.2f} s', e_grund, einstiege_json=ein_liste)
    mdauer = info(mp, video=False)['dauer']
    if mdauer - E < 6.0 and ein_liste:
        E2 = max(ein_liste, key=lambda x: mdauer - x) if max(mdauer - x for x in ein_liste) > mdauer - E else E
        if E2 != E:
            L('musik', f'Einstieg {E:.2f} -> {E2:.2f} s', f'ab {E:.2f} s bleiben nur {mdauer - E:.1f} s Musik')
            E = E2
    if mdauer - E < 6.0:
        # Musikfehler nie der Quelle anlasten (Technik-Pruefung 23.09.: 5-s-Musik gab Exit 3 «nur 3,9 s Reel moeglich»
        # und haette ein gutes Produkt ins Ledger «schnitt-ungeeignet» geschrieben)
        raise MusikFehler(f'Musik ab Einstieg zu kurz: {mname} ab {E:.2f} s hat nur {max(0.0, mdauer - E):.1f} s (< 6 s)')
    hint, _ = bpm_hinweis(mname)
    R = beat_raster(mp, E, min(ziel_s + 1.0, mdauer - E), cache_ordner=cache_ordner or os.path.dirname(quelle))
    P = R['periode']
    gu = R.get('guete') or {}
    raster_q = max(gu.get('auf_raster') or 0, gu.get('auf_halbraster') or 0)
    if not hint and raster_q < 0.6:
        # ohne Tempo aus CREDITS/Rueckfall nur librosa; ohne belastbares Raster sind «Schnitte auf dem Beat» Zufall
        # (Technik-Pruefung 23.09.: hype2 unter neuem Namen -> 164 statt 146 BPM, 4/9 Schnitte im Kick-Fenster)
        raise MusikFehler(f'{mname}: kein Tempo in CREDITS.txt und Raster-Guete {raster_q:.0%} < 60 % — Tempo eintragen, '
                          'einstiege.py laufen lassen')
    L('beat', f"{R['bpm']:.1f} BPM, Einstieg auf Beat {R['einstieg']:.3f} s ({R['verschiebung_ms']:+.0f} ms)",
      f"Periode aus {R['bpm_quelle']} (librosa sagt {R['bpm_librosa']}), fein justiert; Phase per Kamm-Filter, "
      f"Kick-Pruefung (Tiefton < 150 Hz an Raster/Halbraster){' -> auf den Kick umgelegt' if R.get('phase_auf_kick') else ''}; "
      'Inventur: Einstiege liegen 30-315 ms neben dem Beat', guete=gu, kamm=R['kamm_score'], kick=R.get('kick_phase'))
    if raster_q < 0.6:
        L('beat', 'Raster unsicher', f'nur {raster_q:.0%} der librosa-Beats auf Raster/Halbraster (kein klarer Schlag, '
          'z. B. orchestra) — Schnitte folgen dem CREDITS-Tempo')

    # ---- Bildrate: 25 fps fuer 25/50-fps-Quellen (alle 7 Proben-Quellen 25 fps). Bildjury 23.09.: 25 -> 30 fps
    #      verdoppelt jedes 5. Bild (p2: Quelle 0 % Doppelbilder, Reel 17 %). Raster-Rundung dann <= 20 ms (Fenster -100/+33).
    fps_q = float(A.get('fps') or 25.0)
    fps = 25 if (abs(fps_q - 25) < 0.6 or abs(fps_q - 50) < 1.2) else FPS
    L('fps', f'{fps} fps', f'Quelle {fps_q:.2f} fps' + (' -> keine eingefuegten Doppelbilder' if fps == 25 else ''))

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

    def _sperre(liste, loecher):
        for e in liste:
            e['nutzbar'] = [iv2 for iv in e['nutzbar'] for iv2 in _abziehen(iv, [tuple(x) for x in loecher])
                            if iv2[1] - iv2[0] >= 0.3]
            e['nutzbar_s'] = _r(sum(b - a for a, b in e['nutzbar']), 2)
    if sperren:
        vorher = {e['id']: e['nutzbar_s'] for e in einst}
        _sperre(einst, sperren)
        for e in einst:
            if e['nutzbar_s'] < vorher[e['id']]:
                L('sichtpruefung', f"Einstellung {e['id']}: {vorher[e['id']]:.2f} -> {e['nutzbar_s']:.2f} s nutzbar",
                  f'gesperrt nach Sichtpruefung: {sperren}')
    # Intro-Zone min(4 s, 12 %) fuer ALLE Stuecke sperren, wenn der Rest fuer das Reel reicht. Bildjury 23.09.: die Zone
    # schuetzte nur den Hook — p3 zeigte das Auspacken als 2. Stueck (Karton bei 1,0-3,4 s). Belege fuer schwache
    # Quellanfaenge: p3 Karton 0-4 s; Kritik: Titelkarte 0-4,9 s, Milchschaeumer-Karton 0-3,4 s, Hotpot-Standbild 0-3,1 s.
    intro = min(4.0, 0.12 * A['dauer'])

    def _u(liste):
        return sum(e['nutzbar_s'] for e in liste if not e['schwarz'] and not e['fremdtext'])
    U_vor = _u(einst)
    probe = copy.deepcopy(einst); _sperre(probe, [(0.0, intro)])
    U_ohne = _u(probe)
    intro_gesperrt = U_ohne < U_vor - 1e-6 and U_ohne >= max(6.0, min(0.95 * U_vor, nb * P))
    if intro_gesperrt:
        einst = probe
        L('intro', f'Quellsekunden 0-{intro:.1f} fuer alle Stuecke gesperrt', f'Intro der Quelle (Karton/Titelkarte/Schwarz); '
          f'ohne sie bleiben {U_ohne:.1f} von {U_vor:.1f} s sauberes Material')
    elif U_ohne < U_vor - 1e-6:
        L('intro', f'Intro-Zone 0-{intro:.1f} s nur fuer den Hook abgewertet', f'ohne sie blieben nur {U_ohne:.1f} s '
          f'(< {max(6.0, min(0.95 * U_vor, nb * P)):.1f} s) — Sichtpruefung auf Karton/Titelkarte')
    sauber, verworfen = [], []
    for e in einst:
        if e['schwarz']:
            verworfen.append((e['id'], 'Schwarzbild')); continue
        if e['nutzbar_s'] < 0.3:
            verworfen.append((e['id'], 'kein nutzbarer Rest (Uebergang/Standbild/Wisch/Intro)')); continue
        if e['fremdtext']:
            verworfen.append((e['id'], 'Fremdtext: ' + e['fremdtext_grund'])); continue
        sauber.append(e)
    fremd = [e for e in einst if e['fremdtext'] and not e['schwarz'] and e['nutzbar_s'] >= 0.3]
    # Kamerafahrten: Einstellungen hinter einer nur RELATIV erkannten Grenze (scene < 0,2, 'hart_schwach') gelten als
    # dieselbe Fahrt (Technik-Pruefung 23.09.: Scheinschnitte durch Ruckeln -> unsichtbare Schnitte p1 Bild 271)
    kette, kid = {}, 0
    for e in sorted(einst, key=lambda x: x['start']):
        if e['grenze_start'] != 'hart_schwach':
            kid += 1
        kette[e['id']] = kid

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
    # Fenster in voller Breite ueber Unschaerfe-Grund, senkrecht so gesetzt, dass Text/Oberflaeche wenig verdecken.
    def draussen(e, ar):
        bx0, by0, bw, bh, _, _ = rahmen(e)
        k = np.asarray(e['kanten_x'], float); b = np.asarray(e['bewegung_x'], float)
        E_ = GEWICHT_KANTE * k / (k.sum() or 1) + (1 - GEWICHT_KANTE) * b / (b.sum() or 1)
        n = len(E_); E_ = E_[int(bx0 / qw * n):max(int(bx0 / qw * n) + 1, int((bx0 + bw) / qw * n))]
        ww = min(bw, bh * ar); nx = max(1, int(round(ww / bw * len(E_))))
        c = np.concatenate([[0], np.cumsum(E_)])
        return 1 - float((c[nx:] - c[:-nx]).max() / (c[-1] or 1))
    # Schwellen: 15 % fuer Vollbild/4:5; 25 % fuer den 1:1-Ausschnitt aus Querformat (die Alternative zeigt das Produkt
    # auf 31 % der Flaeche; was draussen bleibt, sind bei CJ-Demos meist Haende/Beine am Rand — Sichtpruefung p3).
    # Setzung, kalibriert an n = 4 Quellen (BEHAUPTUNG bis zur Auswertung von 20-30 Entscheidungslogs).
    kandidaten_ar = [('fill', 9 / 16, 0.15), ('band 4:5', 0.8, 0.15), ('band 1:1', 1.0, 0.25)]
    modus, AR, grund = 'band', None, ''
    hw_q = qh / qw
    if hw_q >= 1.7:
        a_q = qw / qh
        verlust = (1 - (9 / 16) / a_q) if a_q > 9 / 16 else (1 - a_q / (9 / 16))
        modus, AR, grund = 'fill', 9 / 16, (f"Hochkant ~9:16 ({qw}x{qh}): Vollbild, Zuschnitt {verlust:.0%} "
                                           f"{'der Breite' if a_q > 9 / 16 else 'der Hoehe'}")
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
    ketten_sauber = sorted({kette[e['id']] for e in sauber})
    eine_fahrt = len(ketten_sauber) == 1
    if eine_fahrt and U < 8.0:
        # Bildjury 23.09. (p4, 6,96 s, eine Kamerafahrt): umgestellte Teile einer Fahrt wirken wie Ruckeln, 25/40 Punkte
        raise Ungeeignet(f'eine einzige Kamerafahrt mit nur {U:.1f} s sauberem Material (< 8 s): Teile einer Fahrt '
                         'umzustellen wirkt wie Ruckeln — naechsten Clip nehmen')
    if eine_fahrt:
        L('material', 'eine Kamerafahrt', f'{len(sauber)} Teil(e) ohne harten Schnitt dazwischen -> nur vorwaerts springen '
          '(Zeitraffer-Sprung), einmal zurueck an den Anfang, Ende nahtlos in den Hook')
    # Quelle kuerzer als Ziel: Reel kuerzen statt Schleife (keine Stelle zweimal), auf ganze Takte
    nb_mat = int((U * 0.95) / P)
    if nb_mat < nb:
        alt = nb
        nb = max(nb_mat - nb_mat % 4, 4 * int(math.ceil(6.0 / P / 4)))
        L('dauer', f'gekuerzt {alt} -> {nb} Schlaege = {nb * P:.2f} s', f'nur {U:.1f} s sauberes Material; keine Stelle zweimal '
          '(kein -stream_loop, Kritik: 3/61 Reels mit sichtbarem Neustart); ganze Takte')
    mot = np.asarray(A['profil'].get('bewegung_roh') or A['profil']['bewegung']); dtp = A['profil']['dt']
    hell = np.asarray(A['profil']['hell'])
    sh4 = np.asarray(A['profil'].get('schaerfe4') or [], float)

    def mfenster(a, b):
        # getrimmtes Mittel (obere 10 % weg): ein einzelner Bildsprung (verpasster Schnitt, Blitz) ist keine Bewegung
        # (GEMESSEN p3: der Hook landete auf einem Sprung); der Median faellt dagegen bei Quellen mit doppelten Bildern
        # (jedes 2. Bild gleich, scene 0,000) auf ~0 und macht bewegte Stellen «ruhig».
        v = np.sort(mot[slice(int(a / dtp), max(int(a / dtp) + 1, int(b / dtp)))])
        if len(v) == 0:
            return 0.0
        return float(v[:max(1, int(np.ceil(len(v) * 0.9)))].mean())

    benutzt = {}          # eid -> [[a,b]] — gerundet wie die Stuecke (Code-Pruefung 23.09.: ungerundet t vs. _r(t)
    #                        liess die Rest-Verlaengerung am 1e-6-Vergleich scheitern)

    def belege(eid, a, b):
        benutzt.setdefault(eid, []).append([_r(a), _r(b)])

    def frei(eid, a, b, puffer=0.08):
        return all(b <= x - puffer + 1e-6 or a >= y + puffer - 1e-6 for x, y in benutzt.get(eid, []))

    def kandidaten(e, laenge, schritt=1 / 15):
        for a0, b0 in e['nutzbar']:
            t = a0
            while t + laenge <= b0 + 1e-6:
                yield t
                t += schritt

    reich = U >= 1.8 * nb * P

    # ---- Hook: staerkstes Fenster. Einstieg-Regel: Bewegung 0-1 s >= 4.0 bevorzugt, < 2.0 = Standbild.
    L0 = k_first * P
    verd = np.asarray(A.get('sprung_verdacht', []), float)
    best = None
    for e in sauber:
        s15 = mot[int(e['start'] / dtp):max(int(e['start'] / dtp) + 1, int(e['ende'] / dtp))]
        med_e = float(np.median(s15)) if len(s15) else 0.0
        spaet = any(b0 - max(a0, e['start'] + 0.25) >= L0 - 1e-6 for a0, b0 in e['nutzbar'])
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
            # Bild 0 darf kein Uebergang sein. Bildjury 23.09. (p2): Hook-Bild 0 zeigte Glastisch + fallende Nudeln,
            # das Produkt erst ab 0,33 s — «staerkste Bewegung» (14,2) war eine Wischbewegung direkt nach dem Schnitt.
            if m1 > 12.0:
                sc -= 0.5 * (m1 - 12.0)               # hektisch (Wisch/Schwenk): das Produkt ist verwischt
            m_start = float(np.mean(mot[int(t / dtp):int(t / dtp) + 3])) if len(mot) else 0.0
            if m_start > max(8.0, 2.5 * med_e):
                sc -= 2.0                             # Bewegungsspitze in den ersten 0,2 s
            if len(sh4):
                s_start = float(np.interp(t + 0.1, np.arange(len(sh4)) / 4.0, sh4))
                if s_start < 0.5:
                    sc -= 2.5                         # unscharfes erstes Bild
            if spaet and t < e['start'] + 0.25:
                sc -= 1.0                             # die ersten 0,25 s nach einem Schnitt sind oft Eintritt/Uebergang
            vor = t - next((a0 for a0, b0 in e['nutzbar'] if a0 <= t <= b0), t)
            sc += 1.5 if vor >= k_min * P else 0.0        # Material davor -> nahtloses Loop-Ende (spart eine Einstellung)
            if auf_sprung:
                sc -= 6.0; vor = 0.0                      # nie auf einem moeglichen Kamerawechsel beginnen / nahtlos enden
            if t < intro:
                sc -= 2.5                                 # Intro-Zone der Quelle (falls nicht ganz gesperrt)
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
      f"(Regel >= 4.0{'' if hm1 >= 4.0 else ' — NICHT erfuellt' + (', per --hook-ab erzwungen' if hook_ab is not None else '')}), "
      f"Schaerfe {he['schaerfe_rel']:.2f}; Quellsekunde 0 haette Bewegung {q0:.1f}; Uebergaenge am Start abgewertet",
      rang_bewertung=sorted([e['bewertung'] for e in sauber], reverse=True)[:5])
    stuecke = [dict(einstellung=he['id'], q_start=_r(ht), q_dauer=_r(L0), tempo=1.0, beats=k_first, rolle='hook',
                    grund=f'staerkste Stelle (Bewegung {hm1:.1f})')]
    belege(he['id'], ht, ht + L0)

    # ---- Loop-Ende: das Stueck direkt VOR dem Hook-Fenster (gleiche Einstellung, gleiche Bewegungsrichtung) -> nahtlos
    loop = None
    kt = k_base
    while kt >= k_min:
        if hvor >= kt * P - 1e-6:
            loop = dict(art='natuerlich', beats=kt, q_start=_r(ht - kt * P), q_dauer=_r(kt * P))
            break
        kt -= 1
    if loop:
        belege(he['id'], ht - loop['q_dauer'], ht)
        L('loop', f"natuerlich: letztes Stueck = Einstellung {he['id']} {loop['q_start']:.2f}-{ht:.2f} s",
          'endet genau dort, wo der Hook beginnt -> beim Wiederholen laeuft das Bild ohne Sprung weiter (kein Standbild-Abspann)')
    else:
        L('loop', 'Ueberblendung 0,4 s auf das erste Bild', f'vor dem Hook nur {hvor:.2f} s Material; Labor: Naht MAD 57 -> 5')

    # ---- Mitte: Einstellungen in Quellreihenfolge (Ablauf der Demo), gute zuerst, nie dieselbe Stelle zweimal.
    #      Nutzungsdeckel: jede Einstellung hoechstens EIN Mittelstueck, die Hook-Einstellung keins (sie laeuft schon als
    #      Hook + Loop-Ende); Ausnahme nur, wenn das Reel sonst unter 8 s bliebe (Bildjury 23.09.: p3 zeigte «Tank
    #      aufsetzen» dreimal aus E6).
    k_tail = loop['beats'] if loop else 0      # ohne nahtloses Ende fuellt die Mitte alles; letztes Stueck blendet ueber
    rest = nb - k_first - k_tail
    if rest < 0:
        raise Ungeeignet('Reel zu kurz fuer Hook + Ende')
    med_b = float(np.median([e['bewertung'] for e in sauber]))
    gute = [e for e in sorted(sauber, key=lambda e: e['start']) if e['bewertung'] >= med_b - 0.5]
    schwache = [e for e in sorted(sauber, key=lambda e: e['start']) if e not in gute]
    reihe = [e for e in gute if e['id'] != he['id']] + ([he] if he in gute else []) + schwache
    if eine_fahrt:
        reihe = sorted(sauber, key=lambda e: e['start'])
    nutzung = {}
    tempo_n = 0
    pos_r = 0
    letzte = he['id']
    mehrfach = []
    # Wenige Einstellungen fuer viele Schlaege: laengere Mittelstuecke (<= 2,5 s) statt Wiederholung
    verfuegbar = [e for e in sauber if e['id'] != he['id'] and max((b - a for a, b in e['nutzbar']), default=0) >= k_min * P]
    k_mitte = k_base
    if verfuegbar and not eine_fahrt and rest > 0:
        bedarf = int(math.ceil(rest / len(verfuegbar)))
        if bedarf > k_base:
            k_mitte = min(bedarf, max(k_base, int(2.5 / P + 1e-9)))
            L('dauer', f'Mittelstuecke bis {k_mitte} statt {k_base} Schlaege', f'nur {len(verfuegbar)} Einstellungen fuer '
              f'{rest} Schlaege — laengere Stuecke (<= 2,5 s) statt eine Einstellung zu wiederholen')
    while rest > 0:
        if rest < k_min:
            break                                     # Rest < Mindeststueck: geht ans Ende (unten), kein 0,5-s-Fetzen
        k = min(k_mitte, rest)
        if 0 < rest - k < k_min:
            k = rest
        gewaehlt = None
        vor = stuecke[-1]
        vor_ende = vor['q_start'] + vor['q_dauer']
        if eine_fahrt:
            # eine Fahrt: ueber ALLE Teile hinweg der naechste freie Punkt >= 0,4 s VOR-waerts; erst wenn nichts mehr
            # vorne liegt, einmal zurueck an den fruehesten Punkt (Zeitraffer-Spruenge statt Ruckeln, Bildjury p4)
            reihe_k = [k] + list(range(k - 1, k_min - 1, -1)) if reich else \
                list(range(min(max(k, int(2.5 / P + 1e-9)), rest), k_min - 1, -1))
            for kk in reihe_k:
                laenge = kk * P
                letztes_mittel = (rest - kk == 0) and loop is not None
                alle = []
                for e in reihe:
                    if e['standbild'] and kk > k_static:
                        continue
                    for t in kandidaten(e, laenge):
                        if not frei(e['id'], t, t + laenge):
                            continue
                        if not (t >= vor_ende + 0.4 - 1e-6 or t + laenge <= vor['q_start'] - 0.4 + 1e-6):
                            continue
                        if letztes_mittel and not (t + laenge <= loop['q_start'] - 0.4 + 1e-6 or
                                                   t >= loop['q_start'] + loop['q_dauer'] + 0.4 - 1e-6):
                            continue
                        alle.append((t, e))
                if alle:
                    vorw = [x for x in alle if x[0] >= vor_ende + 0.4 - 1e-6]
                    t, e = min(vorw or alle, key=lambda x: x[0])
                    gewaehlt = (e, t, kk, 1.0, e['standbild'], 1)
                    break
        # Phase 3 (alte Regel: jede freie Stelle, nie zweimal hintereinander dieselbe Fahrt) nur, solange das Reel sonst
        # unter 8 s bliebe — lieber eine Einstellung wiederholen als ein 4-s-Reel oder Exit 3.
        # Eine «zweite Nutzung mit Abstand» (Phase 2) gibt es NICHT mehr: GEMESSEN 23.09. p3 E6 — die Bildjury sah bei
        # Quelle 9,8 s und 19,7 s zweimal «Tank aufsetzen», der Abstand war 10 s und der Bildabstand (64-px-Vorschau,
        # MAD) 29,0 bei Median 23,9 aller Paare >= 4 s: weder Zeit- noch Pixelabstand erkennen die Wiederholung.
        kurz_noch = (sum(x['beats'] for x in stuecke) + k_tail) * P < 8.0
        for phase in (((1, 3) if kurz_noch else (1,)) if not eine_fahrt else ()):
            for versuch in range(len(reihe) * 3):
                e = reihe[(pos_r + versuch) % len(reihe)]
                if phase == 1 and (nutzung.get(e['id'], 0) >= 1 or e['id'] == he['id']):
                    continue
                if kette[e['id']] == kette[letzte] and len(reihe) > 1 and versuch < len(reihe):
                    continue                          # nie zweimal hintereinander dieselbe Fahrt, wenn es anders geht
                # knapp: laengstes Stueck (<= 2,5 s), das in die Einstellung passt — sonst verfallen Reste, die wegen der
                # 0,4-s-Sprungregel nicht mehr nutzbar sind (GEMESSEN Selbsttest: 7,6 s Material -> 5,4 s Reel)
                reihe_k = [k] + list(range(k - 1, k_min - 1, -1)) if reich else \
                    list(range(min(max(k, int(2.5 / P + 1e-9)), rest), k_min - 1, -1))
                for kk in reihe_k:
                    laenge = kk * P
                    statisch = e['standbild']
                    if statisch and kk > k_static:
                        continue                      # Lieferanten-Dias nie laenger als 1,0 s
                    tempo = 1.0
                    if reich and not statisch and tempo_n < 2 and 2.0 <= e['bewegung'] < 3.0 and e['nutzbar_s'] >= 1.6 * laenge:
                        tempo = 1.5                   # Leerlauf straffen (Rhythmusmittel, nicht Originalitaet)
                    src_l = laenge * tempo
                    letztes_mittel = (rest - kk == 0) and loop is not None
                    gleiche_fahrt = kette[e['id']] == kette[vor['einstellung']]

                    def sichtbar(t, L_):
                        # Stuecke derselben Fahrt muessen in der Quelle >= 0,4 s springen, sonst ist der Schnitt
                        # unsichtbar (GEMESSEN p4: 0,07-s-Sprung, im Ergebnis nicht messbar). Gilt auch zum Loop-Ende.
                        if gleiche_fahrt and not (t >= vor['q_start'] + vor['q_dauer'] + 0.4 or t + L_ <= vor['q_start'] - 0.4):
                            return False
                        if letztes_mittel and kette[e['id']] == kette[he['id']] and not (
                                t + L_ <= loop['q_start'] - 0.4 or t >= loop['q_start'] + loop['q_dauer'] + 0.4):
                            return False
                        return True
                    kands = [t for t in kandidaten(e, src_l) if frei(e['id'], t, t + src_l) and sichtbar(t, src_l)]
                    if not kands and tempo != 1.0:
                        tempo = 1.0; src_l = laenge
                        kands = [t for t in kandidaten(e, src_l) if frei(e['id'], t, t + src_l) and sichtbar(t, src_l)]
                    if not kands:
                        continue
                    if gleiche_fahrt:
                        # vorwaerts springen statt zurueck (Bildjury 23.09., p4: rueckwaerts umgestellte Teile einer
                        # Fahrt wirken wie Ruckeln); sonst an den Anfang (einmal zurueck, Ende laeuft nahtlos in den Hook)
                        vorw = [t for t in kands if t >= vor['q_start'] + vor['q_dauer'] + 0.4 - 1e-6]
                        t = vorw[0] if vorw else kands[0]
                    elif reich:
                        t = max(kands, key=lambda t: mfenster(t, t + src_l))
                    else:
                        t = kands[0]                  # knapp: dicht an dicht verbrauchen
                    gewaehlt = (e, t, kk, tempo, statisch, phase)
                    break
                if gewaehlt:
                    pos_r = (pos_r + versuch + 1) % len(reihe)
                    break
            if gewaehlt:
                break
        if not gewaehlt:
            alt = nb
            nb -= rest
            L('dauer', f'Material erschoepft: {alt} -> {nb} Schlaege = {nb * P:.2f} s', 'keine freie Stelle mehr ohne '
              'Wiederholung — Reel wird kuerzer statt eine Stelle zu wiederholen (kein -stream_loop)')
            rest = 0
            break
        e, t, kk, tempo, statisch, phase = gewaehlt
        belege(e['id'], t, t + kk * P * tempo)
        nutzung[e['id']] = nutzung.get(e['id'], 0) + 1
        if tempo != 1.0:
            tempo_n += 1
        m = mfenster(t, t + kk * P * tempo)
        gr_ = ('Standbild-Dia <= 1,0 s' if statisch else f'Bewegung {m:.1f}') + \
            (', Tempo 1,5x (Leerlauf gestrafft)' if tempo != 1.0 else '')
        if phase == 3:
            gr_ += ' (Einstellung erneut: Reel sonst < 8 s)'
            mehrfach.append(e['id'])
        stuecke.append(dict(einstellung=e['id'], q_start=_r(t), q_dauer=_r(kk * P * tempo), tempo=tempo, beats=kk,
                            rolle='demo', grund=gr_))
        letzte = e['id']
        rest -= kk
    if 0 < rest < k_min:
        # Rest-Schlaege: letztes Mittelstueck verlaengern, wenn die Quelle dahinter frei ist, sonst Reel kuerzer
        s_ = stuecke[-1] if len(stuecke) > 1 else None
        e_ = next((x for x in sauber if s_ and x['id'] == s_['einstellung']), None)
        neu_l = (s_['beats'] + rest) * P * s_['tempo'] if s_ else 0
        # frei() gegen die ANDEREN Stuecke der Einstellung pruefen (das eigene Intervall grenzt ja direkt an)
        andere = [iv for iv in benutzt.get(s_['einstellung'], []) if abs(iv[0] - s_['q_start']) > 1e-3] if s_ else []
        if s_ and e_ and s_['beats'] + rest <= int(2.5 / P + 1e-9) and any(a0 <= s_['q_start'] + 1e-6 and s_['q_start'] + neu_l <= b0 + 1e-6
                                                                           for a0, b0 in e_['nutzbar']) and \
                all(s_['q_start'] + neu_l <= x - 0.08 + 1e-6 or s_['q_start'] >= y + 0.08 - 1e-6 for x, y in andere):
            for iv in benutzt[e_['id']]:
                if abs(iv[0] - s_['q_start']) <= 1e-3:
                    iv[1] = _r(s_['q_start'] + neu_l)
            s_['beats'] += rest; s_['q_dauer'] = _r(neu_l); s_['grund'] += f' (+{rest} Schlag, Rest)'
            L('dauer', f'Rest {rest} Schlag an Stueck {len(stuecke) - 1} angehaengt', 'Quelle dahinter frei')
        else:
            nb -= rest
        rest = 0
    if loop:
        stuecke.append(dict(einstellung=he['id'], q_start=loop['q_start'], q_dauer=loop['q_dauer'], tempo=1.0,
                            beats=loop['beats'], rolle='loop_ende', grund='Material direkt vor dem Hook -> nahtlose Wiederholung'))
    elif len(stuecke) > 1:
        stuecke[-1]['rolle'] = 'loop_ende'
        stuecke[-1]['grund'] += '; Naht per 0,4-s-Ueberblendung auf das erste Bild'
    # Ganze Takte: Summe der Schlaege auf ein Vielfaches von 4 (Code-Pruefung 23.09.: p4 hatte 13 Schlaege; beim
    # Wiederholen springt die Musik sonst neben den Takt). Erst verlaengern (fehlen 1-2 Schlaege), sonst kuerzen
    # (>= k_min), sonst ein Mittelstueck weglassen.
    def _verlaengerbar(j, plus):
        s = stuecke[j]
        e = next((x for x in sauber if x['id'] == s['einstellung']), None)
        if e is None or s['rolle'] != 'demo':
            return False
        neu_l = (s['beats'] + plus) * P * s['tempo']
        if e['standbild'] or neu_l > 2.5 + 1e-6:
            return False
        a0, b0 = s['q_start'], s['q_start'] + neu_l
        if not any(x <= a0 + 1e-6 and b0 <= y + 1e-6 for x, y in e['nutzbar']):
            return False
        for x, y in benutzt.get(e['id'], []):
            if abs(x - s['q_start']) <= 1e-3:
                continue
            if not (b0 <= x - 0.08 + 1e-6 or a0 >= y + 0.08 - 1e-6):
                return False
        for nb_ in (stuecke[j + 1] if j + 1 < len(stuecke) else None,):
            if nb_ is not None and kette[nb_['einstellung']] == kette[s['einstellung']]:
                if not (nb_['q_start'] >= b0 + 0.4 - 1e-6 or nb_['q_start'] + nb_['q_dauer'] <= a0 - 0.4 + 1e-6):
                    return False
        return True
    summe = sum(s['beats'] for s in stuecke)
    uebrig = summe % 4
    if uebrig and summe > 8:
        weg = uebrig
        plus = 4 - uebrig
        if plus <= 2:
            for j in range(len(stuecke) - 1, 0, -1):
                if plus == 0:
                    break
                while plus and _verlaengerbar(j, 1):
                    s = stuecke[j]; s['beats'] += 1; plus -= 1
                    s['q_dauer'] = _r(s['beats'] * P * s['tempo'])
                    for iv in benutzt.get(s['einstellung'], []):
                        if abs(iv[0] - s['q_start']) <= 1e-3:
                            iv[1] = _r(s['q_start'] + s['q_dauer'])
            if plus == 0:
                weg = 0
                L('dauer', f'+{4 - uebrig} Schlag fuer ganze Takte', 'Mittelstueck(e) verlaengert, Quelle dahinter frei')
            else:
                # Teilverlaengerung zuruecknehmen ist nicht noetig: dann eben kuerzen, was jetzt uebrig ist
                weg = sum(s['beats'] for s in stuecke) % 4
        uebrig2 = weg
        for s in reversed(stuecke):
            if weg == 0:
                break
            if s['rolle'] != 'demo':
                continue
            while weg and s['beats'] - 1 >= k_min:
                s['beats'] -= 1; weg -= 1
            s['q_dauer'] = _r(s['beats'] * P * s['tempo'])
        if weg:
            # kein Stueck laesst sich kuerzen: ein Mittelstueck mit genau `weg` Schlaegen weglassen, wenn die Nachbarn
            # danach nicht zur selben Fahrt gehoeren (sonst entstuende ein unsichtbarer Schnitt)
            for j in range(len(stuecke) - 1, 0, -1):
                s = stuecke[j]
                if s['rolle'] != 'demo' or s['beats'] != weg or j + 1 >= len(stuecke):
                    continue
                a_, b_ = stuecke[j - 1], stuecke[j + 1]
                if kette[a_['einstellung']] == kette[b_['einstellung']]:
                    continue
                del stuecke[j]; weg = 0
                L('dauer', f'Mittelstueck E{s["einstellung"]} ({s["beats"]} Schlaege) weggelassen', 'ganze Takte: kein '
                  'Stueck liess sich kuerzen (alle am Mindestmass)')
                break
        if uebrig2 and weg == 0:
            L('dauer', f'-{uebrig2} Schlag fuer ganze Takte', 'Mittelstuecke gekuerzt/weggelassen (nahtloses Musik-Loop)')
        elif weg:
            L('dauer', f'Takt-Rest {weg} bleibt', 'kein Mittelstueck laesst sich verlaengern, kuerzen oder weglassen — Musik '
              'springt beim Wiederholen neben den Takt')
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

    # ---- Frames auf dem Raster: Schnitt = letztes Bild AUF oder VOR dem Beat (abrunden, nicht runden). Das Fenster ist
    #      schief (-100/+33 ms: lieber zu frueh als zu spaet). GEMESSEN 23.09. am Ausgabeton p3 (25 fps, gerundet):
    #      Schnitt minus Kick 0..+45 ms, 4/6 im Fenster — der Raster-Punkt liegt ~20 ms hinter dem Kick-Onset und die
    #      Rundung legte bis zu 20 ms drauf; abgerundet: Schnitt minus Raster -40..0 ms.
    pos = 0; zoom_zuletzt = -99.0
    for k, s in enumerate(stuecke):
        s['nr'] = k
        s['beat_start'] = pos; pos += s['beats']
        s['start_frame'] = int(math.floor(s['beat_start'] * P * fps + 1e-6))
        s['ende_frame'] = int(math.floor(pos * P * fps + 1e-6))
        s['frames'] = s['ende_frame'] - s['start_frame']
        s['t_start'] = _r(s['start_frame'] / fps); s['t_ende'] = _r(s['ende_frame'] / fps)
        f = fenster[s['einstellung']]
        s['fenster'] = f['fenster']; s['energieanteil'] = f['anteil']
        e = next(x for x in einst if x['id'] == s['einstellung'])
        m = mfenster(s['q_start'], s['q_start'] + s['q_dauer'])
        # Zoom sparsam: Drift nur fuer ruhige Stuecke, Punch-in nur an Sprungschnitten, hoechstens 1x je 3 s
        z = 'keiner'; zg = ''
        if m < 2.0 or e['standbild']:
            z, zg = 'drift', f'ruhig (Bewegung {m:.1f} < 2) -> langsamer Zoom 100->108 %'
        elif k > 0 and kette[stuecke[k - 1]['einstellung']] == kette[s['einstellung']] and s['t_start'] - zoom_zuletzt >= 3.0 - 1e-6:
            z, zg = 'bump', 'Sprungschnitt in derselben Fahrt -> Punch-in 106 % am Beat macht den Wechsel sichtbar'
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
    N = stuecke[-1]['ende_frame']
    D = N / fps
    grenzen = [s['start_frame'] for s in stuecke[1:]]
    if D < 5.0:
        raise Ungeeignet(f'nur {D:.1f} s Reel moeglich ohne Wiederholung (Standbild-Dias <= 1 s, Spruenge >= 0,4 s) — '
                         'unter 5 s lohnt kein Reel')

    # ---- Text-Takt (Staffelung): Bild 0 nur Marke + Hook; Titel/Preis ab ~2 s auf einem Schnitt; letzte ~2 s Preis + CTA
    hook_len = len(hook_text) if hook_text else 24
    if hook_text and len(hook_text) > 24:
        L('text', f'Hook {len(hook_text)} Zeichen > 24', 'Regel <= 24 Zeichen / 5 Woerter (Produktwort + Nutzen); '
          'laengere Hooks verlaengern die Lesezeit auf Bild 0')
    t_hook_min = max(0.83, hook_len / 15 + 0.3)                      # Netflix 17 Z/s, konservativ 15 Z/s
    t_F = next((g / fps for g in grenzen if g / fps >= t_hook_min - 1e-6), min(D, t_hook_min))
    info_variante = 'normal'
    if D - t_F >= 5.0:
        t_C_min = max(t_F + 3.0, D - 3.0)
        t_C = next((g / fps for g in grenzen if t_C_min - 1e-6 <= g / fps <= D - 1.4), None)
        if t_C is None:
            t_C = max(t_F + 3.0, D - 2.0)
    else:
        # kurzes Reel: kein eigener CTA-Block, aber das Infofeld traegt «Link in Bio» statt der Fusszeile
        # (Bildjury 23.09., p4: cta [5,806, 5,806] = 0 s — ein Reel ohne CTA)
        t_C = D; info_variante = 'cta'
    text = dict(hook=[0.0, _r(t_F)], info=[_r(t_F), _r(t_C)], cta=[_r(t_C), _r(D)], info_variante=info_variante)
    L('text', f'Hook 0-{t_F:.2f} s, Titel+Preis {t_F:.2f}-{t_C:.2f} s' + (f', Preis+CTA {t_C:.2f}-{D:.2f} s' if t_C < D else
                                                                           ' mit «Link in Bio» im Infofeld'),
      f'Bild 0 hoechstens Marke + Hook (<= 40 Zeichen); Hook-Lesezeit {t_hook_min:.2f} s (15 Z/s + 0,3 s), '
      'Wechsel auf einem Schnitt; hoechstens 2 Textbloecke gleichzeitig')

    # ---- Band senkrecht setzen: moeglichst wenig Produkt-Energie unter Text und Plattform-Oberflaeche.
    #      Bildjury 23.09.: Band fest auf y 820 zentriert -> Infofeld (1170-1440) lag ~6,5 s ueber 18-20 % der Bandhoehe,
    #      Marken-/Hook-Balken ueber dem Gesicht (p1). Gewicht je Ausgabezeile = Deckkraft x Anteil der Reel-Zeit.
    Z = ZONEN[zone]
    wy = np.zeros(H)
    wy[:Z['oben']] = 1.0; wy[Z['unten']:] = 1.0
    wy[Z['oben']:Z['oben'] + KOPF_H] = 0.45
    hz = _hook_zeilen(hook_text) if hook_text else 1
    ha = Z['oben'] + HOOK_OFS; hb = ha + 56 + 72 * max(1, hz)
    wy[ha:hb] = np.maximum(wy[ha:hb], 0.65 * (t_F / D if hook_text else 0.0))
    wy[Z['unten'] - INFO_H:Z['unten']] = np.maximum(wy[Z['unten'] - INFO_H:Z['unten']], 0.66 * (D - t_F) / D)

    def _profil_y(s):
        """(Ausgabe-y-Mittelpunkte relativ zur Bandoberkante in Bandhoehen-Anteil, Energie) je Quell-Bin im Fenster."""
        e = next(x for x in einst if x['id'] == s['einstellung'])
        ey = energie(e, 'y'); n = len(ey)
        x_, y_, w_, h_ = s['fenster']
        c = (np.arange(n) + 0.5) / n * qh
        m = (c >= y_) & (c <= y_ + h_)
        return (c[m] - y_) / max(1, h_), ey[m] * s['frames']
    profile = [_profil_y(s) for s in stuecke]
    fw0, fh0 = 1080, 1920
    if modus == 'band':
        ww0, hh0 = stuecke[0]['fenster'][2], stuecke[0]['fenster'][3]
        fh0 = int(round(1080 * hh0 / ww0 / 2)) * 2
        if fh0 > 1920:
            fh0 = 1920; fw0 = int(round(1920 * ww0 / hh0 / 2)) * 2

    def kosten(fy):
        num = den = 0.0
        for rel, en in profile:
            yy = np.clip((fy + rel * fh0).astype(int), 0, H - 1)
            num += float((en * wy[yy]).sum()); den += float(en.sum())
        return num / (den or 1.0)

    mitte_zone = (Z['oben'] + Z['unten']) / 2
    fy_mitte = int(min(max(0, round(mitte_zone - fh0 / 2)), H - fh0))
    if modus == 'band' and fh0 < H:
        wahl = [(kosten(fy), abs(fy - fy_mitte), fy) for fy in range(0, H - fh0 + 1, 10)]
        k_best, _, band_y = min(wahl)
        k_mitte = kosten(fy_mitte)
        L('band', f'Band {fw0}x{fh0} bei y {band_y}-{band_y + fh0}', f'verdeckte Produkt-Energie {k_best:.0%} (mittig auf '
          f'die Zone, y {fy_mitte}: {k_mitte:.0%}); Gewicht = Deckkraft x Zeitanteil von Kopfleiste, Hook, Infofeld, '
          'Plattform-Oberflaeche')
    else:
        band_y = 0 if fh0 >= H else fy_mitte
        k_best = kosten(band_y); k_mitte = k_best
    frei_anteil = 1.0 - k_best

    # ---- Regelpruefung (am Plan gemessen)
    erster = grenzen[0] / fps if grenzen else D
    in10 = {s['einstellung'] for s in stuecke if s['t_start'] < 10.0}
    wechsel10 = sum(1 for g in grenzen if g / fps < 10.0)
    laengen = [s['frames'] / fps for s in stuecke]
    ueberl = 0.0
    for eid, ivs in benutzt.items():
        ivs = sorted(ivs)
        for a_, b_ in zip(ivs, ivs[1:]):
            ueberl += max(0.0, a_[1] - b_[0] - 1e-3)
    zeichen0 = len('LUXESTYLE') + (len(hook_text) if hook_text else 0)
    auftritte = {}
    for s in stuecke:
        if s['rolle'] != 'loop_ende' or not loop:
            auftritte[s['einstellung']] = auftritte.get(s['einstellung'], 0) + 1
    regeln = dict(erster_wechsel_s=_r(erster, 2), erster_wechsel_ok=erster <= 1.3 + 1e-6,
                  einstellungen_verschieden_10s=len(in10), wechsel_10s=wechsel10,
                  stueck_median_s=_r(float(np.median(laengen)), 2), stueck_min_s=_r(min(laengen), 2),
                  stueck_max_s=_r(max(laengen), 2), ueberlappung_s=_r(ueberl, 3),
                  fremdtext_stuecke=sum(1 for s in stuecke if s['einstellung'] not in zugeschnitten and
                                        next(x for x in einst if x['id'] == s['einstellung'])['fremdtext']),
                  zugeschnittene_stuecke=sum(1 for s in stuecke if s['einstellung'] in zugeschnitten),
                  zeichen_bild0=zeichen0, zeichen_bild0_ok=zeichen0 <= 40,
                  hook_nicht_quellstart=stuecke[0]['q_start'] > 0.05, hook_bewegung_ok=hm1 >= 4.0,
                  hook_erzwungen=hook_ab is not None, intro_gesperrt=bool(intro_gesperrt),
                  punch_ins=sum(1 for s in stuecke if s['zoom'] == 'bump'),
                  tempo_stuecke=sum(1 for s in stuecke if s['tempo'] != 1.0), takt_ok=nb % 4 == 0,
                  eine_fahrt=eine_fahrt, einstellung_max_auftritte=max(auftritte.values()) if auftritte else 0,
                  einstellungen_wiederholt=sorted(set(mehrfach)), energie_unverdeckt=_r(frei_anteil, 3),
                  energie_unverdeckt_mittig=_r(1.0 - k_mitte, 3), videoflaeche=_r(fw0 * fh0 / (W * H), 3))
    L('regeln', 'Pruefung am Plan', 'Soll: erster Wechsel <= 1,3 s; >= 4 Einstellungen in 10 s; Stuecke 0,6-2,5 s (Median '
      '1,2-1,6); keine Ueberlappung; Bild 0 <= 40 Zeichen; ganze Takte; je Einstellung 1 Auftritt (Hook+Loop = 1)', **regeln)
    return dict(version=VERSION, quelle=quelle, analyse_fingerabdruck=A['fingerabdruck'], quelle_format=fmt,
                quelle_masse=[qw, qh], modus=modus, zone=zone, fps=fps, dauer=_r(D, 4), frames=N, beats=nb,
                band=dict(y=int(band_y), w=int(fw0), h=int(fh0)), kette={str(k_): v for k_, v in kette.items()},
                musik=R, stuecke=stuecke, schnitt_frames=grenzen, loop=loop or dict(art='ueberblendung', dauer=0.4),
                text=text, regeln=regeln, entscheidungen=log)


# ================================================================================================ TEXTEBENEN
def text_ebenen(ordner, titel1='', titel2='', preis='', hook='', zone='organisch'):
    """PNG-Ebenen aus den overlay.py-Bausteinen (font/spaced/wrap/text_cx, Farben, KOPF_Y/HOOK_Y/FUSS_Y/CX_FUSS).
    kopf (ab Bild 0), hook (0 -> t_F), info (Titel+Preis+Fusszeile, t_F -> t_C), infocta (wie info, aber «Link in Bio»
    statt Fusszeile — fuer kurze Reels ohne eigenen CTA-Block), cta (Preis + «Link in Bio», t_C -> Ende).
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
    fy = unten - INFO_H
    fT = ov.font(ov.F_BOLD, 46)
    maxw = 2 * min(cx - Z['links'] - 40, Z['fuss_rechts'] - cx - 20)
    fuss = 'luxestyle.ch · Klarna & TWINT · Gratis Versand ab CHF 50'     # Wortlaut wie overlay.main (keine neue Zusage)

    def info_ebene(name, fusstext, fett):
        im = neu(); d3 = ImageDraw.Draw(im)
        d3.rectangle((0, fy, W, unten), fill=(20, 20, 20, 168))
        d3.rectangle((cx - 100, fy + 16, cx + 100, fy + 20), fill=ov.GOLD)
        zl = [z for z in (titel1, titel2) if z]
        if len(zl) == 1:
            zl = ov.wrap(d3, zl[0], fT, maxw, 2)
        zl = [z if d3.textlength(z, font=fT) <= maxw else ov.wrap(d3, z, fT, maxw, 1)[0] for z in zl][:2]
        y = fy + 28
        for z in zl:
            text_mitte(name, d3, cx, y, z, fT, ov.WHITE); y += 54
        if preis:
            text_mitte(name, d3, cx, y + 2, preis, ov.font(ov.F_BOLD, 68), ov.GOLD)
        y += 84
        gr = 34 if fett else 30
        fnt = ov.F_BOLD if fett else ov.F_REG
        while gr > 24 and d3.textlength(fusstext, font=ov.font(fnt, gr)) > maxw:
            gr -= 1
        text_mitte(name, d3, cx, min(y, unten - gr - 12), fusstext, ov.font(fnt, gr),
                   (255, 255, 255, 255) if fett else (235, 235, 235, 255), schatten=bool(fett))
        return im, zl
    inf, zeilen = info_ebene('info', fuss, False)
    # kurzes Reel (< 5 s nach dem Hook): Infofeld traegt «Link in Bio» statt der Fusszeile (Bildjury 23.09.: p4 ohne CTA)
    infc, _ = info_ebene('infocta', 'Link in Bio · luxestyle.ch', True)
    # CTA (letzte ~2 s): Preis + «Link in Bio»
    ct = neu(); d4 = ImageDraw.Draw(ct)
    d4.rectangle((0, fy, W, unten), fill=(20, 20, 20, 168))
    d4.rectangle((cx - 100, fy + 16, cx + 100, fy + 20), fill=ov.GOLD)
    y = fy + 40
    if preis:
        text_mitte('cta', d4, cx, y, preis, ov.font(ov.F_BOLD, 76), ov.GOLD); y += 100
    text_mitte('cta', d4, cx, y, 'Link in Bio · luxestyle.ch', ov.font(ov.F_BOLD, 44), ov.WHITE)
    pfade = {}
    for name, im in (('kopf', k), ('hook', hk), ('info', inf), ('infocta', infc), ('cta', ct)):
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


def _ton_normiert(R, D, tmp):
    """Musik ab eingerastetem Einstieg, 48 kHz Stereo, kurze Kanten (kein Fade auf Stille), zweistufig -14 LUFS.
    Ziel-TP -2,5 statt -1,5: die AAC-Kodierung hebt den True Peak (GEMESSEN 23.09., hype2: +0,5-0,6 dB; Technik-Pruefung
    23.09., house2 ab 0,21 s: +1,9 dB) — der Rest wird NACH dem Mux gemessen und nachgeregelt (_tp_nachregeln)."""
    roh = os.path.join(tmp, 'musik.wav')
    _run([FF, '-y', '-v', 'error', *_thr(), '-ss', f"{R['einstieg']:.4f}", '-i', R['pfad'], '-t', f'{D:.4f}', '-vn',
          '-af', f'aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.02,afade=t=out:st={max(0, D - 0.15):.3f}:d=0.15,apad',
          '-t', f'{D:.4f}', '-ar', '48000', '-ac', '2', roh])
    e = subprocess.run([FF, '-hide_banner', '-nostats', '-i', roh, '-af', 'loudnorm=I=-14:TP=-2.5:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(e[e.rindex('{'):e.rindex('}') + 1])
    ln = (f"loudnorm=I=-14:TP=-2.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    mix = os.path.join(tmp, 'musik_n.wav')
    _run([FF, '-y', '-v', 'error', *_thr(), '-i', roh, '-af', f'{ln},aresample=48000', '-ar', '48000', '-ac', '2', mix])
    return mix


def _tp_nachregeln(out, mix, D, tmp, versuche=3):
    """True Peak am FERTIGEN MP4 messen; liegt er ueber dem Tor (-1,5 dBTP), nur den Ton neu bauen: Limiter bei 4x
    Ueberabtastung (192 kHz, echte Zwischenwerte) mit gesenkter Grenze, neu AAC-kodieren, Video per copy.
    Technik-Pruefung 23.09.: x1 mit house2 -> -0,63 dBTP im MP4 (Roh-WAV +0,74, normierte WAV -2,46) und trotzdem Exit 0."""
    I_, tp = lautheit(out)
    verlauf = [dict(lufs=I_, true_peak=tp, grenze_db=None)]
    grenze = -2.5
    for n in range(versuche):
        if tp is not None and tp <= TOR['tp_max'] - 0.1:
            break
        grenze = grenze - ((tp if tp is not None else 0.0) - (TOR['tp_max'] - 0.5))
        lin = max(0.0625, 10 ** (grenze / 20))
        mix2 = os.path.join(tmp, f'musik_tp{n}.wav')
        _run([FF, '-y', '-v', 'error', *_thr(), '-i', mix, '-af',
              f'aresample=192000,alimiter=limit={lin:.5f}:attack=1:release=60:level=false,aresample=48000',
              '-ar', '48000', '-ac', '2', mix2])
        tmp_out = os.path.join(tmp, f'tp{n}.mp4')
        _run([FF, '-y', '-v', 'error', *_thr(), '-i', out, *_thr(), '-i', mix2, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
              *_thr(), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', f'{D:.4f}', '-movflags', '+faststart',
              tmp_out])
        shutil.move(tmp_out, out)
        I_, tp = lautheit(out)
        verlauf.append(dict(lufs=I_, true_peak=tp, grenze_db=_r(grenze, 2)))
    return verlauf


def render(P_, out, text=None, arbeitsordner=None, crf=23, preset='medium'):
    """Rendert den Plan. text = dict(titel1, titel2, preis, hook) oder None (nur Bild + Musik).
    Rueckgabe: Pruefung (gemessen am Ergebnis, mit ok/verstoesse — das Tor wertet main() aus)."""
    t00 = time.time()
    tmp = tempfile.mkdtemp(prefix='schnitt_', dir=arbeitsordner or os.path.dirname(os.path.abspath(out)))
    try:
        quelle = P_['quelle']; st = P_['stuecke']; N = P_['frames']
        fps = int(P_.get('fps') or FPS); D = N / fps
        modus = P_['modus']
        R = P_['musik']
        mix = _ton_normiert(R, D, tmp)
        # ---- Text-Ebenen
        ebenen = None
        if text:
            ebenen = text_ebenen(tmp, text.get('titel1', ''), text.get('titel2', ''), text.get('preis', ''),
                                 text.get('hook', ''), P_.get('zone', 'organisch'))
            if not ebenen['zone_ok']:
                raise RuntimeError('Text ausserhalb der sicheren Zone: ' + '; '.join(ebenen['zone_fehler']))
        # ---- Videograph: je Stueck eigener Eingang mit -ss (framegenau), Geometrie, doppelter Trim, fps
        #      -threads je Eingang und vor der Ausgabe (Code-Pruefung 23.09.: vorher nur Eingang 0, Encoder auf «auto»)
        args = [FF, '-y', '-v', 'error', '-filter_complex_threads', THREADS]
        for s in st:
            args += [*_thr(), '-ss', f"{s['q_start']:.4f}", '-t', f"{s['q_dauer'] + 0.6:.4f}", '-i', quelle]
        k_mix = len(st); args += [*_thr(), '-i', mix]
        k_txt = {}
        namen = ('kopf', 'hook', 'info', 'infocta', 'cta')
        if ebenen:
            for j, name in enumerate(namen):
                k_txt[name] = len(st) + 1 + j; args += ['-i', ebenen['pfade'][name]]
        band = P_.get('band') or {}
        mitte = (band['y'] + band['h'] / 2) if band else 820
        fc = []
        for k, s in enumerate(st):
            n = s['frames']; x, y, ww, hh = s['fenster']
            pts = 'setpts=PTS-STARTPTS' if s['tempo'] == 1.0 else f"setpts=(PTS-STARTPTS)/{s['tempo']}"
            # tpad: letzte Bilder klonen, falls das Stueck am Quellende liegt — sonst fehlt 1 Bild und jeder spaetere
            # Schnitt rutscht (Labor-Falle «overlay verliert je Stueck ein Bild», hier am Quellende)
            vor = (f"[{k}:v]{pts},fps={fps},tpad=stop_mode=clone:stop=8,trim=start_frame=0:end_frame={n + 3},"
                   f"setpts=PTS-STARTPTS,crop={ww}:{hh}:{x}:{y}")
            ze = _zoom_expr(s['zoom'], n)
            if modus == 'fill':
                zoom = (f",scale=2160:3840:flags=bicubic,zoompan=z='{ze}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                        f":s=1080x1920:fps={fps}") if ze else ',scale=1080:1920:flags=lanczos'
                fc.append(f"{vor}{zoom},setsar=1,fps={fps},trim=start_frame=0:end_frame={n},setpts=PTS-STARTPTS[s{k}]")
            else:
                # Band: Fenster in voller Breite, senkrecht wie im Plan (band.y: wenig Produkt unter Text/Oberflaeche);
                # Grund = dasselbe Fenster weichgezeichnet (so wiederholt der Grund keinen Text, den das Fenster mied).
                # Zoom NUR auf dem Fenster, die Bandkante steht (Bildjury 23.09.: Drift auf dem ganzen Komposit liess
                # die Bandunterkante 1359 -> 1391 px kriechen und am Schnitt zurueckspringen)
                fw = 1080; fh = int(round(1080 * hh / ww / 2)) * 2
                if fh > 1920:
                    fh = 1920; fw = int(round(1920 * ww / hh / 2)) * 2
                fy = int(min(max(0, round(mitte - fh / 2)), 1920 - fh))
                fz = (f"scale={2 * fw}:{2 * fh}:flags=bicubic,zoompan=z='{ze}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                      f":s={fw}x{fh}:fps={fps}") if ze else f"scale={fw}:{fh}:flags=lanczos"
                fc.append(f"{vor},split[b{k}][f{k}];[b{k}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                          f"boxblur=30:3,eq=brightness=-0.08[bb{k}];[f{k}]{fz},setpts=PTS-STARTPTS[ff{k}];"
                          f"[bb{k}][ff{k}]overlay=(W-w)/2:{fy},setsar=1,fps={fps},"
                          f"trim=start_frame=0:end_frame={n},setpts=PTS-STARTPTS[s{k}]")
        fc.append(''.join(f'[s{k}]' for k in range(len(st))) + f'concat=n={len(st)}:v=1:a=0,fps={fps}[v0]')
        last = 'v0'
        nb_ = int(round(0.4 * fps))
        if P_['loop'].get('art') == 'ueberblendung' and N > fps:
            fc.append(f"[v0]split[va][vb];[vb]trim=end_frame=1,loop=loop={nb_ - 1}:size=1:start=0,setpts=N/{fps}/TB,fps={fps}[kopfbild];"
                      f"[va][kopfbild]xfade=transition=fade:duration=0.4:offset={(N - nb_) / fps:.4f},fps={fps}[vl]")
            last = 'vl'
        if ebenen:
            T_ = P_['text']
            info_name = 'infocta' if T_.get('info_variante') == 'cta' else 'info'
            zeiten = {'kopf': (0, D + 1), 'hook': tuple(T_['hook']), info_name: tuple(T_['info']), 'cta': tuple(T_['cta'])}
            for j, name in enumerate(namen):
                if name not in zeiten:
                    continue
                a, b = zeiten[name]
                if (name == 'hook' and not text.get('hook')) or b - a < 0.2:
                    continue
                en = f":enable='between(t\\,{a - 0.5 / fps:.4f}\\,{b - 0.5 / fps:.4f})'"
                fc.append(f"[{last}][{k_txt[name]}:v]overlay=0:0{en}[t{j}]"); last = f't{j}'
        fc.append(f'[{last}]format=yuv420p[v]')
        args += ['-filter_complex', ';'.join(fc), '-map', '[v]', '-map', f'{k_mix}:a', '-frames:v', str(N), '-t', f'{D:.4f}',
                 *_thr(), '-c:v', 'libx264', '-preset', preset, '-crf', str(crf), '-pix_fmt', 'yuv420p', '-r', str(fps),
                 '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out]
        t0 = time.time(); _run(args); t_render = time.time() - t0
        tp_verlauf = _tp_nachregeln(out, mix, D, tmp)
        pr = pruefen(out, P_)
        pr['ton_nachregelung'] = tp_verlauf
        pr['zeit_s'] = dict(render=_r(t_render, 1), gesamt=_r(time.time() - t00, 1))
        if ebenen:
            pr['text'] = dict(zone=ebenen['zone'], zone_ok=ebenen['zone_ok'], zeichen=ebenen['zeichen'],
                              textboxen=ebenen['textboxen'], info_variante=P_['text'].get('info_variante', 'normal'))
            if not ebenen['zone_ok']:
                pr['verstoesse'].append('Text ausserhalb der sicheren Zone'); pr['ok'] = False
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
    """Misst im Ergebnis, wo der Bildsprung je Soll-Grenze liegt (Frames; 0 = exakt) und wie STARK er ist.
    staerke = Bildwechsel am Schnitt / Median der Bildwechsel +-15 Bilder (Schnitte ausgenommen). GEMESSEN 23.09.:
    sichtbare Schnitte der 5 Proben 3,1-290, der unsichtbare Scheinschnitt p1 Bild 271 1,9 (scdet 3,3) -> Schwelle 2,5.
    Technik-Pruefung 23.09.: argmax im +-3-Fenster liefert IMMER einen Versatz, auch fuer einen unsichtbaren Schnitt."""
    i = info(p)
    raw = _run([FF, '-v', 'error', *_thr(), '-i', p, '-an', '-vf',
                f'crop=1080:{y1 - y0}:0:{y0},scale=96:{int(96 * (y1 - y0) / 1080)}:flags=area,format=gray',
                '-f', 'rawvideo', '-'], text=False).stdout
    hh = int(96 * (y1 - y0) / 1080)
    g = np.frombuffer(raw, np.uint8)[: (len(raw) // (96 * hh)) * 96 * hh].reshape(-1, hh, 96).astype(np.float32)
    d = np.zeros(len(g))
    if len(g) > 1:
        d[1:] = np.abs(g[1:] - g[:-1]).mean(axis=(1, 2))
    maske = np.ones(len(d), bool)
    if len(maske):
        maske[0] = False
    for b in grenzen:
        maske[max(0, b - 1):b + 2] = False
    innen = d[maske] if maske.any() else d[1:]
    out, staerke = [], []
    for b in grenzen:
        lo, hi = max(1, b - 3), min(len(d), b + 4)
        if lo >= hi:
            out.append(None); staerke.append(None); continue
        # Gleichstand zaehlt fuer den Plan: ist der Sprung AM Soll-Bild fast so gross wie das Maximum (>= 80 %), liegt der
        # Schnitt dort. GEMESSEN 23.09. (Stativ-Einzelfahrt, Handbewegung): Soll-Bild 42,9, Bild +3 43,3 -> argmax
        # meldete +3, obwohl der Schnitt exakt sass; ein echter Versatz zeigt am Soll-Bild nur Inhalts-Wechsel.
        v = int(np.argmax(d[lo:hi])) + lo - b
        if b < len(d) and d[b] >= 0.8 * float(d[lo:hi].max()):
            v = 0
        out.append(v)
        pk = float(d[max(1, b - 1):min(len(d), b + 2)].max())
        idx = [j for j in range(max(1, b - 15), min(len(d), b + 16)) if maske[j]]
        loc = float(np.median(d[idx])) if idx else (float(np.median(innen)) if len(innen) else 0.0)
        staerke.append(_r(pk / max(loc, 0.3), 1))
    naht = float(np.abs(g[-1] - g[0]).mean()) if len(g) > 1 else None
    # Referenz fuer die Naht: Bildwechsel UM die Naht (letzte 10 Bilder des Endes, erste 10 des Hooks, Schnittbilder
    # +-1 ausgenommen), 90. Perzentil. Global taugt nicht: blinkende LEDs machen auch benachbarte Quellbilder
    # verschieden (GEMESSEN p4: Naht 16,2 bei Quell-Nachbarn 15,9 = in Ordnung), waehrend Tempo-Stuecke und Handkamera
    # das globale p95 so heben, dass ein echter Zoom-Sprung durchginge (p3r: Naht 23,5 < global p95 24,8).
    idx = [j for j in list(range(1, min(11, len(d)))) + list(range(max(1, len(d) - 10), len(d))) if maske[j]]
    lokal = d[idx] if idx else innen
    return dict(frames=len(g), versatz=out, staerke=staerke, naht_mad=_r(naht, 2) if naht is not None else None,
                bildwechsel_median=_r(float(np.median(innen)), 2) if len(innen) else None,
                naht_referenz=_r(float(np.percentile(lokal, 90)), 2) if len(lokal) else None, dauer=_r(i['dauer'], 3))


def pruefen(out, P_):
    """Messung am fertigen Reel + Tor. ok=False, wenn eine Pflichtpruefung scheitert (main(): Datei weg, Exit 4).
    Technik-/Code-Pruefung 23.09.: vorher mass pruefen() nur und main() meldete immer ok — ein abgeschnittenes 7,8-s-Reel
    ohne CTA (frames 234/345, Versatz None) und ein Reel mit -0,63 dBTP gingen mit Exit 0 durch."""
    i = info(out)
    e = subprocess.run([FF, '-hide_banner', '-i', out], capture_output=True, text=True).stderr
    pix = re.search(r'Video: (\w+).*?, (\w+)\(', e)
    I_, tp = lautheit(out)
    sv = schnitt_versatz(out, P_['schnitt_frames'])
    ok_v = [v for v in sv['versatz'] if v is not None]
    fps_soll = int(P_.get('fps') or FPS)
    pr = dict(w=i['w'], h=i['h'], fps=_r(i['fps'], 3), fps_soll=fps_soll, dauer=_r(i['dauer'], 3), frames=sv['frames'],
              frames_soll=P_['frames'], codec=pix[1] if pix else None, pix_fmt=pix[2] if pix else None,
              audio_hz=i['ar'], audio_kanaele=i['kanaele'], lufs=I_, true_peak=tp,
              schnitt_versatz_frames=sv['versatz'], schnitt_staerke=sv['staerke'],
              unsichtbare_schnitte=[k for k, s_ in enumerate(sv['staerke']) if s_ is not None and s_ < TOR['sicht_min']],
              schnitte_im_toleranzband=sum(1 for v in ok_v if abs(v) <= TOR['versatz_max']), schnitte=len(sv['versatz']),
              loop_naht_mad=sv['naht_mad'], bildwechsel_median_mad=sv['bildwechsel_median'],
              naht_referenz_mad=sv['naht_referenz'],
              loop_naht_ok=(sv['naht_mad'] is not None and sv['naht_referenz'] is not None and
                            sv['naht_mad'] <= max(1.3 * sv['naht_referenz'], 4.0)))
    ver = []
    if (pr['w'], pr['h']) != (W, H) or abs(pr['fps'] - fps_soll) > 0.05:
        ver.append(f"Format {pr['w']}x{pr['h']} {pr['fps']} fps (Soll {W}x{H} {fps_soll})")
    if pr['codec'] != 'h264' or pr['pix_fmt'] != 'yuv420p' or pr['audio_hz'] != 48000 or pr['audio_kanaele'] != 2:
        ver.append(f"Codec {pr['codec']}/{pr['pix_fmt']}, Ton {pr['audio_hz']} Hz x {pr['audio_kanaele']}")
    if pr['frames'] != pr['frames_soll']:
        ver.append(f"Bildzahl {pr['frames']} statt {pr['frames_soll']}")
    if any(v is None or abs(v) > TOR['versatz_max'] for v in sv['versatz']):
        ver.append(f"Schnittversatz {sv['versatz']} (Soll -1..1)")
    if I_ is None or abs(I_ - TOR['lufs']) > TOR['lufs_tol']:
        ver.append(f'Lautheit {I_} LUFS (Soll -14 +-1)')
    if tp is None or tp > TOR['tp_max']:
        ver.append(f'True Peak {tp} dBTP (Soll <= {TOR["tp_max"]})')
    if not pr['loop_naht_ok']:
        ver.append(f"Loop-Naht {sv['naht_mad']} > 1,3 x Referenz {sv['naht_referenz']}")
    if sv['staerke'] and sv['staerke'][0] is not None and sv['staerke'][0] < TOR['sicht_min']:
        ver.append(f"erster Schnitt unsichtbar (Staerke {sv['staerke'][0]} < {TOR['sicht_min']}) — Hook-Regel <= 1,3 s verletzt")
    pr['verstoesse'] = ver
    pr['ok'] = not ver
    return pr


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


def tessdata_holen(ordner):
    """chi_sim.traineddata (tessdata_fast, 2'469'156 Byte) nach ORDNER laden — einmalig, fuer SCHNITT_TESSDATA.
    github.com/…/raw liefert ueber den Proxy 378 Byte Fehler-JSON (Labor-Falle) -> raw.githubusercontent.com + Groessen-
    pruefung. Nie ins Repo (2,4 MB Blob in einem oeffentlichen Repo)."""
    os.makedirs(ordner, exist_ok=True)
    ziel = os.path.join(ordner, 'chi_sim.traineddata')
    if os.path.isfile(ziel) and os.path.getsize(ziel) > 1_000_000:
        return ziel
    tmp = ziel + '.teil'
    r = subprocess.run(['curl', '-sS', '-L', '--fail', '-o', tmp, TESS_URL], capture_output=True, text=True)
    if r.returncode or not os.path.isfile(tmp) or os.path.getsize(tmp) < 1_000_000:
        groesse = os.path.getsize(tmp) if os.path.isfile(tmp) else 0
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise RuntimeError(f'chi_sim nicht geladen ({groesse} Byte): {r.stderr.strip()[:200]}')
    os.replace(tmp, ziel)
    return ziel


def main(argv=None):
    ap = argparse.ArgumentParser(description='Schnitt-Motor fuer LuxeStyle-Reels (Analyse -> Plan -> Render)')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--analyse', metavar='QUELLE'); g.add_argument('--plan', metavar='QUELLE')
    g.add_argument('--render', metavar='QUELLE'); g.add_argument('--kontaktbogen', metavar='VIDEO')
    g.add_argument('--tessdata-holen', metavar='ORDNER', help='chi_sim.traineddata nach ORDNER laden (fuer SCHNITT_TESSDATA)')
    ap.add_argument('--musik'); ap.add_argument('--out'); ap.add_argument('--ziel', type=float, default=12.0)
    ap.add_argument('--einstieg', type=float); ap.add_argument('--zone', default='organisch', choices=list(ZONEN))
    ap.add_argument('--titel', default=''); ap.add_argument('--titel2', default=''); ap.add_argument('--preis', default='')
    ap.add_argument('--hook', default=''); ap.add_argument('--log'); ap.add_argument('--bogen-out')
    ap.add_argument('--dry', action='store_true'); ap.add_argument('--json', action='store_true')
    ap.add_argument('--kein-cache', action='store_true'); ap.add_argument('--crf', type=int, default=23)
    ap.add_argument('--hook-ab', type=float, help='Hook-Fenster ab dieser Quellsekunde (Sichtpruefung)')
    ap.add_argument('--sperren', default='', help='Quellsekunden nach Sichtpruefung sperren, z. B. "6.7-9.0,20.1-21.3"')
    ap.add_argument('--arbeitsordner', help='Ordner fuer Analyse-Cache, Beat-Cache, Render-Temp und Log '
                                            '(Standard: neben Quelle bzw. Ausgabe); nach dem Posten loeschen')
    a = ap.parse_args(argv)
    try:
        if a.tessdata_holen:
            print(tessdata_holen(a.tessdata_holen)); return 0
        if a.kontaktbogen:
            print(kontaktbogen(a.kontaktbogen, a.bogen_out)); return 0
        quelle = a.analyse or a.plan or a.render
        if not os.path.isfile(quelle):
            raise FileNotFoundError(quelle)
        ao = a.arbeitsordner
        if ao:
            os.makedirs(ao, exist_ok=True)
        if a.musik and not a.analyse:
            musik_pfad(a.musik)                  # Musikfehler vor der teuren Analyse melden (Technik-Pruefung: 17 s umsonst)
        A = analyse(quelle, cache=not a.kein_cache, cache_pfad=_cache_pfad(quelle, ao) if ao else None)
        if a.analyse:
            kurz = {k: v for k, v in A.items() if k != 'profil'}
            _drucke(kurz)
            return 0 if A['nutzbar_sauber_s'] >= 6.0 else (print(f"UNGEEIGNET: nur {A['nutzbar_sauber_s']:.1f} s sauberes Material") or 3)
        if not a.musik:
            raise ValueError('--musik fehlt')
        if a.preis and not re.fullmatch(r'CHF \d+\.\d\d', a.preis.strip()):
            raise ValueError('--preis im Format «CHF 19.90» (live aus Shopify, nie erfinden)')
        hook = a.hook.strip()
        # Bild 0 = Marke + Hook <= 40 Zeichen ist Pflicht (Code-Pruefung 23.09.: die Motor-Hooks sind bis 36 Zeichen
        # lang, Bild 0 haette 45 Zeichen); > 24 Zeichen nur Hinweis (Lesezeit steigt, steht im Entscheidungslog)
        if len('LUXESTYLE') + len(hook) > 40:
            raise ValueError(f'Hook {len(hook)} Zeichen: Bild 0 haette {len("LUXESTYLE") + len(hook)} > 40 Zeichen — '
                             'Hook kuerzen (<= 24 Zeichen: Produktwort + Nutzen)')
        if len(hook) > 24:
            print(f'Hinweis: Hook {len(hook)} Zeichen > 24 (Regel: <= 24 Zeichen / 5 Woerter)', file=sys.stderr)
        sp = [tuple(float(v) for v in x.split('-')) for x in a.sperren.split(',') if x.strip()]
        P_ = plan(A, a.musik, ziel_s=a.ziel, einstieg=a.einstieg, zone=a.zone, hook_text=hook or None, sperren=sp,
                  hook_ab=a.hook_ab, cache_ordner=ao)
        if not A['ocr'].get('chi_sim'):
            P_['entscheidungen'].append(dict(schritt='fremdtext', entscheidung='CJK-OCR aus', grund=(
                'kein chi_sim (SCHNITT_TESSDATA / --tessdata-holen): chinesischer Text wird nur ueber die Kanten-Heuristik '
                'erkannt — Sichtpruefung am Kontaktbogen umso wichtiger')))
        if a.plan or a.dry:
            if a.log:
                json.dump(dict(analyse={k: v for k, v in A.items() if k != 'profil'}, plan=P_), open(a.log, 'w'), ensure_ascii=False, indent=1)
            _drucke(P_); return 0
        if not a.out:
            raise ValueError('--out fehlt')
        text = dict(titel1=a.titel, titel2=a.titel2, preis=a.preis, hook=hook) if (a.titel or a.preis or hook) else None
        pr = render(P_, a.out, text=text, crf=a.crf, arbeitsordner=ao)
        pr['cjk_ocr'] = bool(A['ocr'].get('chi_sim'))
        logp = a.log or (os.path.join(ao, os.path.basename(a.out) + '.schnitt.json') if ao else a.out + '.schnitt.json')
        json.dump(dict(analyse={k: v for k, v in A.items() if k != 'profil'}, plan=P_, pruefung=pr), open(logp, 'w'),
                  ensure_ascii=False, indent=1)
        if not pr['ok']:
            # Tor: ein Reel, das die eigene Messung nicht besteht, wird nie ausgegeben (Datei weg, Log bleibt)
            try:
                os.remove(a.out)
            except OSError:
                pass
            print('PRUEFUNG: ' + ' | '.join(pr['verstoesse']))
            print(json.dumps(dict(ok=False, out=None, log=logp, verstoesse=pr['verstoesse']), ensure_ascii=False))
            return 4
        erg = dict(ok=True, out=a.out, dauer=P_['dauer'], frames=P_['frames'], fps=P_['fps'], modus=P_['modus'], log=logp,
                   pruefung=pr)
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
