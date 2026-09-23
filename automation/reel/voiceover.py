#!/usr/bin/env python3
"""voiceover.py (23.09.2026) — Sprechtext -> WAV fuer Reels (<= 9 s, Stille getrimmt, -16 LUFS).

Betreiber 23.09.: «Bilder/Video/Stimme auf hoechstem Niveau». Hausregel bis heute: Reels OHNE Voiceover.
Die Stimme laeuft deshalb als A/B (Anteil im Reel-Motor, Merkmal im Verlauf), nicht als neue Pflicht.

Motor-Wahl GEMESSEN 23.09. (Probe «Kennst du das schon? Der Sternenhimmel-Projektor fuer neunundzwanzig Franken
neunzig — jetzt bei LuxeStyle.», Whisper-small-Rueckhoeren + DNSMOS + Tonhoehen-Spanne; Tabelle automation/music/STIMME.md):
  edge   de-CH-JanNeural   6.0 s · 5/5 Schluesselwoerter · P808 4.16 · Spanne 13.3 Halbtoene  <- Standard (Schweizer Stimme)
  edge   de-CH-LeniNeural  7.1 s · 5/5 · P808 4.08 · Spanne 7.7 (flacher)                     <- Beauty/Schmuck (Hypothese, A/B)
  piper  thorsten-medium   5.9 s · 5/5 · P808 3.91 · Spitze 0 dBFS (clippt, wird hier gesenkt) <- Notnagel ohne Netz
  gemini flash-preview-tts 7.3 s · 2-3/5 («Projekt hier», «Luxusteil»)                           <- nur auf Wunsch (--motor gemini)
  espeak: im Container nicht installiert — kein Kandidat.
LIZENZ: edge-tts spricht den Vorlese-Dienst von Microsoft Edge an (inoffiziell, fuer Werbung nicht ausdruecklich
freigegeben). Dieselben Stimmen gibt es offiziell ueber Azure AI Speech (--motor azure, AZURE_SPEECH_KEY/_REGION);
auto nimmt Azure zuerst, sobald der Schluessel da ist. piper/thorsten = CC0-Datensatz, frei.

Aufruf:
  voiceover.py --out x.wav --text "…"                               # fertiger Text
  voiceover.py --out x.wav --hook H --name N [--nutzen U] --preis 39.90 [--thema beauty]
      baut Varianten lang -> kurz (Hook+Name+Nutzen+Preis, ohne Nutzen, Hook+Preis) und nimmt die erste <= --max
  Optionen: --motor auto|azure|edge|piper|gemini · --stimme <edge-Stimme> · --max 9 · --dry (nur Text zeigen)
  --vergleich DIR   Probe-Satz mit allen Kandidaten nach DIR (Dauer, LUFS; Whisper-Rueckhoeren, falls installiert)
Ausgabe: EINE JSON-Zeile auf stdout {ok, datei, dauer, motor, stimme, text}; Exit 0 = ok, 3 = keine Stimme moeglich.
Zugang: GEMINI_API_KEY nur fuer --motor gemini (aus Env oder /tmp/dienste.env; Wert wird nie ausgegeben).
"""
import argparse, asyncio, json, os, re, ssl, subprocess, sys, tempfile

PIPER_DIR = os.environ.get('PIPER_DIR', '/tmp/piper_voices')
PIPER_MODELL = os.environ.get('PIPER_MODELL', 'de_DE-thorsten-medium')
PIPER_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/'
EDGE_STANDARD = 'de-CH-JanNeural'
EDGE_WEIBLICH = 'de-CH-LeniNeural'
ZIEL_LUFS = -16.0          # Sprache allein; die Mischung in make_reel.sh geht danach auf -14
PROBE = 'Kennst du das schon? Der Sternenhimmel-Projektor für neunundzwanzig Franken neunzig — jetzt bei LuxeStyle.'


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ------------------------------------------------------------------ Zahlen sprechbar (Schweizer Schreibung: ss)
EINER = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf',
         'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn']
ZEHNER = ['', '', 'zwanzig', 'dreissig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig']


def zahl(n, ein='eins'):
    n = int(n)
    if n < 0:
        return 'minus ' + zahl(-n)
    if n < 20:
        return ein if n == 1 else EINER[n]
    if n < 100:
        e, z = n % 10, n // 10
        return ZEHNER[z] if e == 0 else ('ein' if e == 1 else EINER[e]) + 'und' + ZEHNER[z]
    if n < 1000:
        h, r = divmod(n, 100)
        return ('ein' if h == 1 else EINER[h]) + 'hundert' + (zahl(r) if r else '')
    if n < 1_000_000:
        t, r = divmod(n, 1000)
        return ('ein' if t == 1 else zahl(t, 'ein')) + 'tausend' + (zahl(r) if r else '')
    return str(n)


def preis_wort(p):
    """39.90 -> «neununddreissig Franken neunzig», 15.00 -> «fünfzehn Franken», 1.00 -> «ein Franken»."""
    p = round(float(p) + 1e-9, 2)
    fr, rp = int(p), int(round((p - int(p)) * 100))
    s = ('ein' if fr == 1 else zahl(fr)) + ' Franken'
    return s + (' ' + zahl(rp) if rp else '')


EINHEIT = [(r'mAh', 'Milliamperestunden'), (r'mm', 'Millimeter'), (r'cm', 'Zentimeter'), (r'ml', 'Milliliter'),
           (r'kg', 'Kilo'), (r'g', 'Gramm'), (r'm', 'Meter'), (r'l', 'Liter'), (r'W', 'Watt'), (r'V', 'Volt'),
           (r'h', 'Stunden'), (r'Min\.?', 'Minuten'), (r'Stk\.?', 'Stück')]


def sprechbar(t):
    t = re.sub(r'[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]', '', t)            # Emojis
    t = t.replace('«', '').replace('»', '').replace('"', '').replace('ß', 'ss')
    t = re.sub(r'(?:CHF|Fr\.)\s*(\d+(?:[.,]\d{1,2})?)(?:\s*[.–-]+)?', lambda m: preis_wort(m.group(1).replace(',', '.')), t)
    t = re.sub(r'(\d+)\s*[-–]\s*in\s*[-–]\s*(\d+)', lambda m: zahl(m.group(1)) + ' in ' + zahl(m.group(2)), t)
    t = re.sub(r'(\d+)\s*[x×]\s*(\d+)', lambda m: m.group(1) + ' mal ' + m.group(2), t)
    t = re.sub(r'(\d+(?:[.,]\d+)?)\s*°', r'\1 Grad', t)
    t = re.sub(r'(\d+(?:[.,]\d+)?)\s*%', r'\1 Prozent', t)
    for e, w in EINHEIT:
        t = re.sub(r'(\d)\s*' + e + r'\b', r'\1 ' + w, t)
    t = re.sub(r'(\d+)[.,](\d+)', lambda m: zahl(m.group(1)) + ' Komma ' + ' '.join(zahl(c) for c in m.group(2)), t)
    t = re.sub(r'\d+', lambda m: zahl(m.group(0)), t)
    t = t.replace('&', ' und ').replace('+', ' plus ').replace('/', ' ')
    t = re.sub(r'\s+([,.!?])', r'\1', re.sub(r'\s+', ' ', t)).strip()
    return t


def name_sprechbar(name):
    n = re.split(r'[,(|·•]', name)[0]
    n = re.sub(r'\b[A-Z]{1,3}-?\d{1,4}[A-Z]{0,2}\b', '', n)                     # Modellcodes (P62, X9, K10S)
    return re.sub(r'\s+', ' ', n).strip(' -–')


def varianten(hook, name, nutzen, preis):
    h = hook.strip().rstrip('.!?') + ('?' if hook.strip().endswith('?') else '.')
    n = name_sprechbar(name)
    p = preis_wort(preis) if preis else ''
    u = (nutzen or '').strip().rstrip('.')
    schluss = f'Für {p}, jetzt bei LuxeStyle.' if p else 'Jetzt bei LuxeStyle.'
    if 'luxestyle' in h.lower():                     # Hook «Neu bei LuxeStyle» -> Marke nicht zweimal sagen
        schluss = f'Für {p}.' if p else ''
    satz = lambda *teile: ' '.join(x for x in teile if x and x.strip(' .'))
    out = []
    if u and len(u) <= 90:
        out.append(satz(h, n and n + '.', u + '.', schluss))
    out.append(satz(h, n and n + '.', schluss))
    out.append(satz(h, n and n + ',', ('für ' + p + '.') if p else 'jetzt bei LuxeStyle.'))
    out.append(satz(n and n + '.', schluss))
    return [sprechbar(x) for x in dict.fromkeys(out) if x.strip()]


# ------------------------------------------------------------------ Motoren
def edge(text, out_mp3, stimme, rate):
    try:
        import edge_tts
    except ImportError:
        if os.environ.get('STIMME_PIP', '1') != '1':
            raise
        log('edge-tts fehlt -> pip install (einmalig, STIMME_PIP=0 schaltet das ab)')
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'edge-tts'], timeout=180, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import edge_tts
    import edge_tts.communicate as ec
    # Der Agent-Proxy terminiert TLS neu; edge_tts nimmt sonst nur certifi -> CERTIFICATE_VERIFY_FAILED (gemessen 23.09.).
    ca = os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
    if os.path.exists(ca):
        ec._SSL_CTX = ssl.create_default_context(cafile=ca)
    asyncio.run(asyncio.wait_for(edge_tts.Communicate(text, stimme, rate=rate).save(out_mp3), 60))
    if not os.path.exists(out_mp3) or os.path.getsize(out_mp3) < 2000:
        raise RuntimeError('edge: leere Datei')


def piper(text, out_wav):
    try:
        import piper as _p  # noqa: F401
    except ImportError:
        if os.environ.get('STIMME_PIP', '1') != '1':
            raise
        log('piper-tts fehlt -> pip install (einmalig)')
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'piper-tts'], timeout=300, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    onnx = os.path.join(PIPER_DIR, PIPER_MODELL + '.onnx')
    if not os.path.exists(onnx) or not os.path.exists(onnx + '.json'):
        os.makedirs(PIPER_DIR, exist_ok=True)
        for suf in ('.onnx', '.onnx.json'):
            ziel = onnx if suf == '.onnx' else onnx + '.json'
            subprocess.run(['curl', '-sSL', '--fail', '--max-time', '240', '-o', ziel, PIPER_URL + PIPER_MODELL + suf], check=True)
    subprocess.run([sys.executable, '-m', 'piper', '-m', onnx, '-f', out_wav], input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)


def azure(text, out_wav, stimme):
    """Lizenzsaubere Fassung DERSELBEN Stimmen (Azure AI Speech, Gratis-Stufe F0 = 0.5 Mio. Zeichen/Monat).
    UNGETESTET (23.09.: kein Schluessel im Container) — braucht AZURE_SPEECH_KEY + AZURE_SPEECH_REGION."""
    import urllib.request
    from xml.sax.saxutils import escape
    key, reg = os.environ.get('AZURE_SPEECH_KEY', ''), os.environ.get('AZURE_SPEECH_REGION', '')
    if not key or not reg:
        raise RuntimeError('kein AZURE_SPEECH_KEY/_REGION')
    lang = '-'.join(stimme.split('-')[:2])
    ssml = f"<speak version='1.0' xml:lang='{lang}'><voice name='{stimme}'>{escape(text)}</voice></speak>"
    req = urllib.request.Request(f'https://{reg}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode(),
                                 headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
                                          'X-Microsoft-OutputFormat': 'riff-48khz-16bit-mono-pcm', 'User-Agent': 'luxestyle-voiceover'})
    open(out_wav, 'wb').write(urllib.request.urlopen(req, timeout=60).read())


def gemini_key():
    k = os.environ.get('GEMINI_API_KEY', '')
    if not k and os.path.exists('/tmp/dienste.env'):
        for z in open('/tmp/dienste.env', encoding='utf8'):
            m = re.match(r'\s*(?:export\s+)?GEMINI_API_KEY=["\']?([^"\'\s]+)', z)
            if m:
                k = m.group(1)
    return k


def gemini(text, out_wav, stimme):
    import base64, urllib.request
    key = gemini_key()
    if not key:
        raise RuntimeError('kein GEMINI_API_KEY')
    body = {'contents': [{'parts': [{'text': 'Sprich locker und warm wie in einem kurzen Social-Video: ' + text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'],
                                 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': stimme or 'Puck'}}}}}
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': key,
                                                                          'User-Agent': 'luxestyle-voiceover/1'})
    j = json.load(urllib.request.urlopen(req, timeout=120))
    pcm = base64.b64decode(j['candidates'][0]['content']['parts'][0]['inlineData']['data'])
    raw = out_wav + '.pcm'
    open(raw, 'wb').write(pcm)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw, out_wav], check=True)
    os.remove(raw)


# ------------------------------------------------------------------ Nachbearbeitung
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,'
        'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')


def dauer(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def lautheit(f):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', e)
    p = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', e)
    return (float(i[-1]) if i else None), (p[-1] if p else None)


def veredeln(roh, out, tempo=1.0):
    """Stille trimmen, Rumpeln weg, sanft komprimieren, -3 dB Vorhalt (piper liefert 0 dBFS), dann loudnorm zweistufig."""
    tmp = out + '.vor.wav'
    kette = f'aresample=48000,{TRIM},highpass=f=80,volume=-3dB,acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=1'
    if tempo > 1.001:
        kette += f',atempo={tempo:.3f}'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', roh, '-af', kette, '-ac', '1', '-ar', '48000', tmp], check=True)
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af',
                        f'loudnorm=I={ZIEL_LUFS}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    m = json.loads(e[e.rindex('{'):e.rindex('}') + 1])
    lin = (f"loudnorm=I={ZIEL_LUFS}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
           f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', lin + ',aresample=48000', '-ac', '1', '-ar', '48000', out], check=True)
    os.remove(tmp)


def stimme_fuer(thema):
    if os.environ.get('STIMME_NAME'):
        return os.environ['STIMME_NAME']
    return EDGE_WEIBLICH if thema in ('beauty', 'schmuck') else EDGE_STANDARD


def sprich(text, out, motor, stimme, tmpdir, tempo=1.0):
    """-> (motor, stimme) oder Exception. Roh-Datei nach tmpdir, Endfassung nach out."""
    # auto: Azure nur wenn Schluessel da (gleiche Stimme, lizenzsauber), sonst edge (inoffizieller Vorlese-Dienst), dann piper
    reihe = (['azure'] if os.environ.get('AZURE_SPEECH_KEY') else []) + ['edge', 'piper'] if motor == 'auto' else [motor]
    fehler = []
    for mo in reihe:
        try:
            if mo == 'edge':
                roh = os.path.join(tmpdir, 'roh.mp3')
                edge(text, roh, stimme, os.environ.get('STIMME_RATE', '+0%'))
                used = stimme
            elif mo == 'azure':
                roh = os.path.join(tmpdir, 'roh.wav')
                azure(text, roh, stimme)
                used = 'azure:' + stimme
            elif mo == 'piper':
                roh = os.path.join(tmpdir, 'roh.wav')
                piper(text, roh)
                used = PIPER_MODELL
            elif mo == 'gemini':
                roh = os.path.join(tmpdir, 'roh.wav')
                gemini(text, roh, os.environ.get('GEMINI_STIMME', 'Puck'))
                used = 'gemini:' + os.environ.get('GEMINI_STIMME', 'Puck')
            else:
                raise ValueError('unbekannter Motor ' + mo)
            veredeln(roh, out, tempo)
            return mo, used
        except Exception as e:  # naechster Motor
            fehler.append(f'{mo}: {str(e)[:120]}')
            log('  Stimme', mo, 'scheitert:', str(e)[:160])
    raise RuntimeError(' | '.join(fehler))


def vergleich(ziel):
    os.makedirs(ziel, exist_ok=True)
    kandidaten = [('edge', v) for v in ('de-CH-JanNeural', 'de-CH-LeniNeural', 'de-DE-FlorianMultilingualNeural',
                                        'de-DE-SeraphinaMultilingualNeural', 'de-DE-ConradNeural')] + [('piper', PIPER_MODELL)]
    if os.environ.get('MIT_GEMINI') == '1':
        kandidaten.append(('gemini', 'Puck'))
    try:
        from faster_whisper import WhisperModel
        ohr = WhisperModel('small', device='cpu', compute_type='int8')
    except Exception:
        ohr = None
    for mo, st in kandidaten:
        out = os.path.join(ziel, f'{mo}_{st}.wav')
        with tempfile.TemporaryDirectory() as td:
            try:
                if mo == 'gemini':
                    os.environ['GEMINI_STIMME'] = st
                sprich(PROBE, out, mo, st, td)
            except Exception as e:
                print(f'{mo:6s} {st:36s} FEHLER {str(e)[:80]}')
                continue
        i, p = lautheit(out)
        hoer = ''
        if ohr:
            segs, _ = ohr.transcribe(out, language='de', beam_size=5)
            txt = ' '.join(s.text for s in segs)
            s = re.sub(r'[^a-z0-9äöü]', '', txt.lower())
            treffer = sum(['kennstdudasschon' in s, 'himmelprojektor' in s, '2990' in s or '29franken90' in s,
                           'franken' in s, 'luxestyle' in s])
            hoer = f'{treffer}/5 «{txt.strip()}»'
        print(f'{mo:6s} {st:36s} {dauer(out):4.2f} s  {i} LUFS  Spitze {p}  {hoer}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out')
    ap.add_argument('--text')
    ap.add_argument('--hook', default='')
    ap.add_argument('--name', default='')
    ap.add_argument('--nutzen', default='')
    ap.add_argument('--preis', default='')
    ap.add_argument('--thema', default='')
    ap.add_argument('--motor', default=os.environ.get('STIMME_MOTOR', 'auto'))
    ap.add_argument('--stimme', default='')
    ap.add_argument('--max', type=float, default=float(os.environ.get('STIMME_MAX', '9')))
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--vergleich')
    a = ap.parse_args()
    if a.vergleich:
        vergleich(a.vergleich)
        return 0
    texte = [sprechbar(a.text)] if a.text else varianten(a.hook, a.name, a.nutzen, a.preis)
    stimme = a.stimme or stimme_fuer(a.thema)
    if a.dry or not a.out:
        print(json.dumps({'ok': True, 'dry': True, 'stimme': stimme, 'motor': a.motor, 'varianten': texte}, ensure_ascii=False))
        return 0
    with tempfile.TemporaryDirectory() as td:
        letzte = None
        for t in texte:
            try:
                mo, used = sprich(t, a.out, a.motor, stimme, td)
            except Exception as e:
                print(json.dumps({'ok': False, 'fehler': str(e)[:300]}, ensure_ascii=False))
                return 3
            d = dauer(a.out)
            letzte = (t, mo, used, d)
            if d <= a.max:
                break
        t, mo, used, d = letzte
        if d > a.max:                                   # kuerzeste Fassung zu lang: hoechstens 12 % schneller
            tempo = d / a.max
            if tempo > 1.12:
                os.remove(a.out)
                print(json.dumps({'ok': False, 'fehler': f'zu lang ({d:.1f} s > {a.max} s)', 'text': t}, ensure_ascii=False))
                return 3
            mo, used = sprich(t, a.out, mo, stimme, td, tempo=tempo)
            d = dauer(a.out)
    i, p = lautheit(a.out)
    print(json.dumps({'ok': True, 'datei': a.out, 'dauer': round(d, 2), 'lufs': i, 'spitze': p, 'motor': mo,
                      'stimme': used, 'text': t}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
