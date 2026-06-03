#!/usr/bin/env python3
"""ABAN Files - Stock-Footage Pipeline (GRATIS).
ElevenLabs ABAN-Stimme + Pexels-Stockclips + Karaoke-Untertitel (ASS) + Dark-Drone
-> cinematisches 9:16-Video. Aufruf:  XI=<el> PEXELS=<key> python3 aban_stock.py <ep>
"""
import os, sys, re, json, base64, subprocess, urllib.request, urllib.parse
import imageio_ffmpeg

XI = os.environ["XI"]; PEXELS = os.environ["PEXELS"]
PIXABAY = os.environ.get("PIXABAY", "")   # optionale 2. Quelle (mehr Auswahl)
VOICE = os.environ.get("VOICE", "pNInz6obpgDQGcFmaJgB")
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

SCENES = {
    "ep1": ["futuristic server room blue light", "supercomputer data center", "glowing circuit board macro",
            "ai neural network animation", "earth from space at night city lights", "deep underground cave glowing",
            "futuristic city night rain neon", "robot hand artificial intelligence", "digital code matrix green",
            "ancient stone temple dark", "fiber optic light particles", "dark tunnel mysterious light"],
    "ep2": ["moon surface craters close up", "full moon dark night sky", "rocket launch at night",
            "astronaut on the moon", "spacecraft orbiting earth", "satellite floating in space",
            "lunar landscape barren", "futuristic space base 3d render", "space station interior corridor",
            "stars galaxy time lapse", "radar telescope dish night", "alien planet surface"],
    "ep3": ["data center server racks", "blinking server lights close up", "high voltage power lines night",
            "electricity sparks dark", "server cooling fans spinning", "underground industrial tunnel",
            "glowing fiber optic cables", "power plant at night", "electric grid city aerial night",
            "steam vapor machinery dark", "circuit electricity flowing", "neon data flow abstract"],
    "ep4": ["smartphone screen glowing dark", "person using phone at night", "macro phone camera lens",
            "security camera surveillance", "data privacy concept", "city people walking phones",
            "microphone close up dark", "server room blue light", "eye reflection screen",
            "fingerprint biometric scan", "social media interface", "dark room phone light face"],
    "ep5": ["old books library dark", "burning paper embers", "newspaper archive macro",
            "glitch digital distortion", "ai generated face morph", "computer code scrolling",
            "old film projector light", "museum statues dim", "deepfake screen abstract",
            "shredded documents", "hourglass time dark", "memory brain neural abstract"],
    "ep6": ["milky way galaxy night sky", "radio telescope array night", "deep space nebula",
            "stars time lapse desert", "satellite dish pointing sky", "alien planet landscape",
            "observatory dome night", "distant galaxies hubble", "lone figure looking at stars",
            "ufo light in sky", "cosmic void dark", "earth from deep space"],
    "ep7": ["open pit mine aerial", "mining excavator digging", "raw mineral crystals macro",
            "underground mine tunnel", "lithium salt flats aerial", "molten metal foundry",
            "electric car battery", "heavy mining machinery", "deep earth rock strata",
            "miners headlamps dark", "conveyor belt ore", "glowing magma cracks"],
    "ep8": ["satellites orbiting earth", "starlink train of lights", "night sky satellites streaks",
            "rocket launch night sky", "earth orbit space view", "radar dish rotating night",
            "city lights from space", "surveillance grid abstract", "antenna array night",
            "drone flying dusk", "global network map glowing", "telescope pointing stars"],
    "ep9": ["particle accelerator tunnel", "fusion reactor glowing", "plasma energy ball",
            "underground physics lab", "blue energy core abstract", "scientific machinery huge",
            "electric arc lightning", "deep tunnel concrete", "control room screens",
            "atom nucleus animation", "glowing ring structure", "sealed metal vault door"],
    "ep10": ["robot arm factory automation", "humanoid robot face", "empty office automated",
             "ai control room screens", "robotic assembly line", "human silhouette fading",
             "server farm endless", "city aerial night future", "machine hand human hand",
             "dark throne empty hall", "earth slowly rotating space", "glowing red eye dark"],
    "ep11": ["egyptian pyramids at sunset", "ancient stone temple ruins", "hieroglyphics carved wall",
             "mayan pyramid jungle", "stonehenge megalith dusk", "giant ancient statue close up",
             "desert ruins aerial", "starry night sky over pyramids", "carved serpent stone relief",
             "ancient gold artifact museum", "prehistoric cave painting", "monolith standing stones desert",
             "ancient temple interior torchlight", "ufo light over desert night", "ancient ruins drone shot",
             "milky way over ancient ruins"],
    "ep12": ["underwater ancient ruins", "deep ocean dark blue", "sunken city underwater", "ocean waves aerial storm",
             "underwater statue ruins", "stormy sea dark", "deep sea trench", "diver dark water",
             "old nautical map", "coral reef ruins", "giant wave ocean", "underwater light rays"],
    "ep13": ["antarctica ice aerial", "glacier dark blue", "snow blizzard storm", "ice cave blue glow",
             "antarctic research station", "frozen icy landscape", "iceberg dark ocean", "military plane snow",
             "ice core drilling", "aurora over ice", "deep ice crevasse", "frozen tunnel cave"],
    "ep14": ["stormy ocean huge waves", "ship in storm sea", "airplane over ocean", "compass spinning close up",
             "dark sea fog mysterious", "lightning over ocean", "ship sinking dark", "ocean whirlpool",
             "radar screen night", "airplane cockpit storm", "deep dark ocean", "thick fog over water"],
    "ep15": ["glitch digital distortion", "matrix green code", "reality warp abstract", "broken mirror shards",
             "tv static noise", "surreal endless hallway", "empty city street eerie", "pixel dissolve abstract",
             "brain neural network glow", "double exposure face", "simulation grid wireframe", "distorted melting clock"],
    "ep16": ["nazca lines aerial", "desert aerial drone", "ancient geoglyph ground", "vast desert dunes",
             "archaeological dig site", "ufo over desert night", "stars over desert", "ancient rock carving",
             "sand dunes aerial sunset", "mysterious ancient symbols", "desert ruins dusk", "night sky over desert"],
    "ep17": ["person sleeping in dark", "surreal dream landscape", "floating in space dream", "dark bedroom moonlight",
             "brain waves abstract", "foggy dreamscape", "eye closing macro", "starry void cosmos",
             "glowing door in fog", "clouds time lapse night", "silhouette sleeping", "abstract mind swirl"],
    "ep18": ["earth cross section diagram", "deep glowing cave", "huge underground cavern", "seismograph needle readings",
             "earth from space", "lava tube cave", "deep drilling rig", "tunnel descending into earth",
             "glowing planet core abstract", "underground river cave", "earthquake city shaking", "vast cavern with light"],
    "ep19": ["ufo lights night sky", "glowing orbs in sky", "fighter jet sky", "crowd looking up at sky",
             "strange lights over city night", "dark sky mysterious lights", "drone swarm formation night",
             "ancient omen in sky", "silhouette looking at sky", "stars moving time lapse", "eerie sky at dusk",
             "light descending through fog"],
    "ep20": ["ballot box voting election", "crowd protest street", "royal palace ornate interior",
             "old oil portrait gallery dark", "gold bars vault", "secret meeting silhouettes dark",
             "ancient family crest", "stock exchange trading floor", "world leaders handshake",
             "puppet on strings dark", "luxury mansion aerial", "old castle dusk", "chess king piece dark",
             "dark boardroom long table"],
    "ep21": ["sumerian clay tablet cuneiform", "ancient mesopotamia ruins", "planet approaching in space",
             "dark rogue planet space", "observatory telescope night", "ancient god statue", "solar system animation",
             "ufo over ancient temple night", "starry sky milky way", "comet in deep space", "alien planet red",
             "night sky stars time lapse"],
    "ep22": ["giant skeleton excavation", "archaeology dig site bones", "museum skeleton hall dim",
             "huge fossil bone", "ancient cave bones", "dusty archive vault", "old sepia photograph",
             "skull close up dark", "desert excavation", "ancient ruins giant statue", "flood water dark",
             "museum corridor night"],
    "ep23": ["tesla coil electricity", "electric arcs laboratory", "old vintage laboratory", "lightning bolt night",
             "electricity meter close up", "old radio transmission tower", "glowing plasma sphere", "dark inventor workshop",
             "power lines at sunset", "old blueprint papers", "electric spark dark", "vintage machine gears"],
    "ep24": ["mars red planet surface", "rover on mars", "rocket launch into space", "spacecraft travelling to mars",
             "mars barren landscape", "earth from space fragile", "astronaut on red planet", "dust storm mars",
             "futuristic space colony", "rocket night launch", "billionaire private rocket", "stars deep space"],
    "ep25": ["underground tunnel dark", "tunnel boring machine", "deep concrete bunker", "empty subway tunnel",
             "military underground base", "deep cave passage", "industrial tunnel lights", "heavy metal vault door",
             "dark corridor underground", "huge excavation machine", "stairs descending into dark", "glowing tunnel end"],
    "ep26": ["blood moon red eclipse", "lunar eclipse night sky", "full moon dark clouds", "ancient observatory stars",
             "comet over city night", "stars time lapse night", "old astronomical star chart", "moon craters close up",
             "solar eclipse corona", "ancient ruins under stars", "planets alignment space", "eerie red sky"],
    "ep27": ["mirror reflection dark", "broken mirror shards", "double exposure portrait", "surreal mirror hallway",
             "silhouette facing mirror", "foggy reflection window", "old vintage photograph", "identical twin figures",
             "dark room single mirror", "face half in shadow", "endless reflection corridor", "distorted reflection water"],
    "ep28": ["giant ocean wave", "flood water in city", "stormy dark sea", "heavy rain storm night",
             "ancient wooden ark boat", "tsunami aerial view", "rising flood water", "dark storm clouds lightning",
             "ancient flooded ruins", "ocean horizon storm", "submerged street water", "lightning over ocean"],
}

# Stichwort -> passender Stock-Suchbegriff: das Bild matcht den gesprochenen Satz.
# Reihenfolge = Priorität (spezifisch zuerst).
KW = [
    (r"moon|lunar", "moon surface craters close up"),
    (r"rocket|launch|flag", "rocket launch at night"),
    (r"satellite|orbit|\bstars?\b|the sky|night sky|lattice", "satellites orbiting earth night"),
    (r"pyramid|megalith|temple|monument|serpent|ancient|\bstone|gods?|myth|wheel|calendar|harvest|watcher|feathered", "ancient egyptian pyramid ruins"),
    (r"phone|glass|pocket|listen|camera|advertis|whisper|microphone|confession", "smartphone screen dark surveillance"),
    (r"mine|lithium|cobalt|metal|mineral|\bdig|excavat|vein|cars?\b", "open pit mine excavator dark"),
    (r"fusion|reactor|collision|captive sun|plasma|\batom|knock|door|sealed", "fusion reactor plasma energy"),
    (r"robot|automat|assembl|factory|inherit|caretaker|hands?\b", "humanoid robot factory automation"),
    (r"histor|memory|forget|record|photograph|\bpast\b|archive|eras|update", "old library archive paper dark"),
    (r"cave|underground|chamber|below|beneath|tunnel|vault|down here", "deep underground tunnel cave glowing"),
    (r"data center|data centre|server|silicon|chip|circuit|machine|intelligence|\bai\b|model|algorithm|feed|grid|current|heat|power", "server room data center blue lights"),
    (r"mars|red planet|rover", "mars red planet surface rover"),
    (r"tesla|coil|free energy|inventor|invention|patent|the meter|subscription", "tesla coil electricity lab"),
    (r"giant|giants|skeleton|\bbones?\b|fossil|nephilim", "giant skeleton excavation museum"),
    (r"mirror|reflection|doppel|copies|\bversions?\b|drafts", "mirror reflection dark surreal"),
    (r"flood|tsunami|\bark\b|the waters|the sea will|drowned not", "giant ocean wave flood"),
    (r"sumerian|anunnaki|cuneiform|tablet|wanderer|heavens came", "sumerian clay tablet ancient"),
    (r"eclipse|blood moon|comet|alignment|conjunction", "blood moon eclipse night sky"),
    (r"election|vote|ballot|democrac", "ballot box voting election"),
    (r"gold|wealth|rich|fortune|\bbank|stock exchange", "gold bars vault wealth"),
    (r"family|families|bloodline|lineage|dynasty|breed|whip|reins|throne|crown|royal|palace", "royal palace portrait gallery"),
    (r"city|cities|world|future|progress", "futuristic city night aerial"),
    (r"earth|planet|space|cosmos|galax|silence|universe|quarantine", "earth from space stars"),
    (r"throne|rule|\bking|reign|claim|empire|guided|design|obey|orders?", "dark throne hall ominous"),
]


def pick_query(text, pool, idx):
    t = text.lower()
    for pat, q in KW:
        if re.search(pat, t):
            return q
    return pool[idx % len(pool)]


def sentence_segments(words, min_dur=2.4):
    """Saetze mit Zeitspannen bilden; zu kurze zu >= min_dur zusammenfassen."""
    segs, cur = [], []
    for w, ws, we in words:
        cur.append((w, ws, we))
        if w.rstrip().endswith((".", "!", "?", "…")):
            segs.append(cur); cur = []
    if cur:
        segs.append(cur)
    out = []
    for s in segs:
        st, en, txt = s[0][1], s[-1][2], " ".join(x[0] for x in s)
        if out and (out[-1][1] - out[-1][0]) < min_dur:
            out[-1][1] = en; out[-1][2] += " " + txt
        else:
            out.append([st, en, txt])
    return out


def tts(text):
    body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
                       "voice_settings": {"stability": 0.5, "similarity_boost": 0.8,
                                          "style": 0.45, "use_speaker_boost": True}}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=body, method="POST", headers={"xi-api-key": XI, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open("/tmp/_a.mp3", "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]; ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur, ws, we = [], "", None, None
    for c, s, e in zip(ch, st, en):
        if c.strip() == "":
            if cur:
                words.append((cur, ws, we)); cur, ws, we = "", None, None
            continue
        if ws is None:
            ws = s
        cur += c; we = e
    if cur:
        words.append((cur, ws, we))
    return words, (en[-1] if en else 0.0)


UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def _search(params):
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": PEXELS, "User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=60)).get("videos", [])


def _rank(vids):
    """Pro Video bestes File -> Liste (score, video_id, link), beste zuerst."""
    out = []
    for v in vids:
        best, bs = None, -1
        for f in v.get("video_files", []):
            h, w = f.get("height", 0), f.get("width", 0)
            sc = h + (5000 if h >= w else 0) + min(h, 1920)
            if sc > bs:
                bs, best = sc, f["link"]
        if best:
            out.append((bs, v.get("id"), best))
    out.sort(reverse=True)
    return out


def pexels_links(query, cache):
    if query in cache:
        return cache[query]
    vids = _search({"query": query, "orientation": "portrait", "per_page": 15, "size": "medium"})
    if not vids:
        vids = _search({"query": query, "per_page": 15})
    cache[query] = _rank(vids)
    return cache[query]


def pixabay_links(query, cache):
    """2. Quelle (optional): Pixabay-Videos -> (score, 'pix-<id>', link)."""
    if not PIXABAY:
        return []
    k = "px:" + query
    if k in cache:
        return cache[k]
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode(
        {"key": PIXABAY, "q": query, "per_page": 20, "safesearch": "true"})
    out = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        for h in d.get("hits", []):
            best, bw = None, 0
            for size in ("large", "medium", "small", "tiny"):
                v = h.get("videos", {}).get(size)
                if v and v.get("url") and v.get("width", 0) > bw:
                    bw, best = v["width"], v["url"]
            if best:
                out.append((bw, "pix-" + str(h.get("id")), best))
        out.sort(reverse=True)
    except Exception:
        out = []
    cache[k] = out
    return out


NASA_KW = re.compile(r"moon|mars|earth|space|rocket|satellite|\bsun\b|galaxy|planet|nebula|"
                     r"eclipse|astronaut|lunar|orbit|cosmos|\bstars?\b|comet|aurora|spacecraft", re.I)


def nasa_links(query, cache):
    """3. Quelle (kein Key): echte NASA-Weltraum-Videos, public domain. Nur fuer Space-Queries."""
    if not NASA_KW.search(query):
        return []
    k = "nasa:" + query
    if k in cache:
        return cache[k]
    out = []
    try:
        url = "https://images-api.nasa.gov/search?" + urllib.parse.urlencode({"q": query, "media_type": "video"})
        items = json.load(urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40)
        ).get("collection", {}).get("items", [])
        for it in items[:5]:
            href = it.get("href")
            if not href:
                continue
            try:
                files = json.load(urllib.request.urlopen(
                    urllib.request.Request(href, headers={"User-Agent": UA}), timeout=30))
            except Exception:
                continue
            mp4 = {t: f for f in files for t in ("medium", "small", "mobile", "large") if f.endswith("~%s.mp4" % t)}
            link = mp4.get("medium") or mp4.get("small") or mp4.get("mobile") or mp4.get("large")
            if link:
                out.append((1, "nasa-" + href.split("/")[-2], link))
    except Exception:
        out = []
    cache[k] = out
    return out


def fetch_clip(query, idx, used, cache):
    """Laedt den besten NOCH NICHT verwendeten Clip (Pexels + Pixabay + NASA, kein Wiederholen)."""
    for sc, vid, link in pexels_links(query, cache) + pixabay_links(query, cache) + nasa_links(query, cache):
        if vid in used:
            continue
        used.add(vid)
        out = f"/tmp/_stock_{idx}.mp4"
        try:
            dreq = urllib.request.Request(link, headers={"User-Agent": UA})
            with urllib.request.urlopen(dreq, timeout=120) as r, open(out, "wb") as fo:
                fo.write(r.read())
            return out
        except Exception:
            continue
    return None


def media_dur(path):
    out = subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", out)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0


def fmt_ts(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:01d}:{m:02d}:{s:05.2f}"


def build_ass(words, total, path, hook=""):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: K,DejaVu Sans,64,&H004FCFFF,&H00F2F2F2,&H00101010,&H64000000,1,0,0,0,100,100,0,0,1,4,3,2,80,80,470,1
Style: TAG,DejaVu Sans,40,&H0050C8FF,&H0050C8FF,&H00101010,&H00000000,1,0,0,0,100,100,6,0,1,2,2,8,0,0,70,1
Style: HOOK,DejaVu Sans,82,&H0050C8FF,&H0050C8FF,&H00101010,&H64000000,1,0,0,0,100,100,0,0,1,5,4,5,120,120,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,{fmt_ts(0)},{fmt_ts(total)},TAG,,0,0,0,,A B A N   F I L E S
"""
    lines = []
    if hook:
        # Retention-Hook: grosser Text in den ersten ~2.8s (50-60% Drop-off-Zone)
        hk = hook.upper().replace("\n", " ")
        lines.append(f"Dialogue: 1,{fmt_ts(0)},{fmt_ts(2.8)},HOOK,,0,0,0,,{{\\fad(250,350)}}{hk}")
    groups = [words[i:i + 4] for i in range(0, len(words), 4)]
    for gi, g in enumerate(groups):
        gs = g[0][1]
        ge = groups[gi + 1][0][1] if gi + 1 < len(groups) else (g[-1][2] + 0.4)
        parts = []
        for wi, (w, ws, we) in enumerate(g):
            nxt = g[wi + 1][1] if wi + 1 < len(g) else ge
            kcs = max(1, int((nxt - ws) * 100))
            parts.append(f"{{\\k{kcs}}}{w.replace('Ahbahn', 'ABAN')} ")
        lines.append(f"Dialogue: 0,{fmt_ts(gs)},{fmt_ts(ge)},K,,0,0,0,,{''.join(parts).strip()}")
    open(path, "w").write(head + "\n".join(lines) + "\n")


def render(ep):
    pool = SCENES[ep]
    sc_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aban_scripts.json")
    sc = json.load(open(sc_path))[ep]
    # "ABAN" -> Lautschrift fuer deutsche Aussprache (Untertitel zeigen via Remap wieder ABAN)
    tts_text = sc["text"].replace("ABAN", "Ahbahn")
    words, dur = tts(text=tts_text)
    # Video MUSS das ganze Audio abdecken, sonst schneidet -shortest die letzten Worte ab
    total = max(dur, media_dur("/tmp/_a.mp3")) + 0.6
    # pro SATZ ein passender Clip, exakt auf die Satzdauer getimt (Bild matcht Text)
    segs = sentence_segments(words)
    bounds = [s[0] for s in segs] + [total]
    norm, last_src, used, cache = [], None, set(), {}
    for i, s in enumerate(segs):
        seg_dur = max(0.8, bounds[i + 1] - bounds[i])
        q = pick_query(s[2], pool, i)
        # passender Clip; bei Wiederholung der Query automatisch ein ANDERER (used-Set).
        # Fallbacks: Episoden-Pool (rotierend), sonst letzter Clip.
        src = fetch_clip(q, i, used, cache)
        for k in range(len(pool)):
            if src:
                break
            src = fetch_clip(pool[(i + k) % len(pool)], 900 + i * 9 + k, used, cache)
        src = src or last_src
        if not src:
            continue
        last_src = src
        out = f"/tmp/_seg_{i}.mp4"
        subprocess.run([FF, "-y", "-stream_loop", "5", "-i", src, "-t", f"{seg_dur:.2f}",
                        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}",
                        "-an", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", out],
                       check=True, capture_output=True)
        norm.append(out)
    concat = "/tmp/_concat.txt"
    open(concat, "w").write("\n".join(f"file '{p}'" for p in norm))
    subprocess.run([FF, "-y", "-f", "concat", "-safe", "0", "-i", concat, "-c", "copy", "/tmp/_base.mp4"],
                   check=True, capture_output=True)
    # Audio: Stimme + Drone
    subprocess.run([FF, "-y", "-i", "/tmp/_a.mp3", "-ar", "44100",
                    "-af", "highpass=f=60,dynaudnorm=f=200", "/tmp/_vo.wav"], check=True, capture_output=True)
    build_ass(words, total, "/tmp/_subs.ass", sc.get("hook", ""))
    # dunkler Ambient-Score (a-moll-Pad) statt nur Drone -> fuellt stille Stellen
    music = ("sine=f=110,volume=0.5[m1];sine=f=164.81,volume=0.4[m2];sine=f=220,volume=0.3[m3];"
             "sine=f=329.63,volume=0.12[m4];[m1][m2][m3][m4]amix=inputs=4:normalize=0,"
             "tremolo=f=0.12:d=0.45,lowpass=f=1500,aecho=0.8:0.7:450|800:0.4|0.25,volume=0.2[d]")
    vf = (f"eq=brightness=-0.12:saturation=0.92:contrast=1.05,vignette=PI/4.5,"
          f"noise=alls=7:allf=t,subtitles=/tmp/_subs.ass")
    subprocess.run([FF, "-y", "-i", "/tmp/_base.mp4", "-i", "/tmp/_vo.wav",
                    "-filter_complex", f"[0:v]{vf}[v];{music};[1:a]volume=1.0[vo];[vo][d]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[ao]",
                    "-map", "[v]", "-map", "[ao]", "-c:v", "libx264", "-crf", "22", "-preset", "veryfast",
                    "-c:a", "aac", "-b:a", "160k", "-shortest", f"/tmp/aban_stock_{ep}.mp4"],
                   check=True, capture_output=True)
    print(f"[{ep}] done {dur:.1f}s {len(norm)} scenes -> /tmp/aban_stock_{ep}.mp4", flush=True)


if __name__ == "__main__":
    render(sys.argv[1] if len(sys.argv) > 1 else "ep1")
