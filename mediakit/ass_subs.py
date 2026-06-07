"""mediakit/ass_subs.py — ASS-Untertitel (Karaoke) + SRT-Fallback.

Portiert aus video-prototypes/aban-files/aban_stock.py, aber markengetreu (Amber/Cream
statt Cyan). WICHTIG: Die [Events]-`Format:`-Zeile MUSS das Feld `Name` enthalten —
sonst rutscht in jeden Dialogue ein Komma vor den Text (libass-Bug). Jede
`Dialogue:`-Zeile trägt das leere Name-Feld (das `,,` nach dem Style).
"""
import re

from . import brand

W, H = brand.W, brand.H


def fmt_ts(t):
    """Sekunden → ASS-Timecode H:MM:SS.cc."""
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h:01d}:{m:02d}:{s:05.2f}"


def ass_color(rgb):
    """(R,G,B) → ASS-Farbe &H00BBGGRR."""
    r, g, b = rgb
    return f"&H00{b:02X}{g:02X}{r:02X}"


def _header(primary, secondary, outline, tag):
    p, sec, ol = ass_color(primary), ass_color(secondary), ass_color(outline)
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: K,DejaVu Sans,64,{p},{sec},{ol},&H64000000,1,0,0,0,100,100,0,0,1,4,3,2,80,80,470,1
Style: TAG,DejaVu Sans,40,{p},{p},{ol},&H00000000,1,0,0,0,100,100,6,0,1,2,2,8,0,0,70,1
Style: HOOK,DejaVu Sans,82,{p},{p},{ol},&H64000000,1,0,0,0,100,100,0,0,1,5,4,5,120,120,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def build_ass(words, total, path, hook="", tag="aban news",
              primary=brand.AMBER, secondary=brand.CREAM, outline=brand.INK):
    """Karaoke-ASS aus Wort-Timings [(wort, start, end), …]. `Name`-Feld ist gesetzt."""
    head = _header(primary, secondary, outline, tag)
    head += f"Dialogue: 0,{fmt_ts(0)},{fmt_ts(total)},TAG,,0,0,0,,{tag}\n"
    lines = []
    if hook:
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
            parts.append(f"{{\\k{kcs}}}{w} ")
        lines.append(f"Dialogue: 0,{fmt_ts(gs)},{fmt_ts(ge)},K,,0,0,0,,{''.join(parts).strip()}")
    open(path, "w", encoding="utf-8").write(head + "\n".join(lines) + "\n")
    return path


_SRT_TS = re.compile(r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})")


def _srt_secs(s):
    m = _SRT_TS.match(s.strip())
    if not m:
        return None
    h, mi, se, ms = map(int, m.groups())
    return h * 3600 + mi * 60 + se + ms / 1000.0


def parse_srt(path):
    """SRT → Liste von (start, end, text). Robust gegen Leerzeilen."""
    cues, cur = [], None
    for raw in open(path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if "-->" in line:
            a, _, b = line.partition("-->")
            cur = [_srt_secs(a), _srt_secs(b), []]
        elif line.strip() == "":
            if cur and cur[2]:
                cues.append((cur[0], cur[1], " ".join(cur[2]))); cur = None
        elif cur is not None and not line.strip().isdigit():
            cur[2].append(line.strip())
    if cur and cur[2]:
        cues.append((cur[0], cur[1], " ".join(cur[2])))
    return cues


def srt_to_ass(srt_path, path, hook="", tag="aban news",
               primary=brand.AMBER, secondary=brand.CREAM, outline=brand.INK):
    """Markengestylte ASS (ohne Karaoke) aus einer SRT-Datei."""
    cues = parse_srt(srt_path)
    total = cues[-1][1] if cues else 0.0
    head = _header(primary, secondary, outline, tag)
    head += f"Dialogue: 0,{fmt_ts(0)},{fmt_ts(total)},TAG,,0,0,0,,{tag}\n"
    lines = []
    if hook:
        hk = hook.upper().replace("\n", " ")
        lines.append(f"Dialogue: 1,{fmt_ts(0)},{fmt_ts(2.8)},HOOK,,0,0,0,,{{\\fad(250,350)}}{hk}")
    for (a, b, text) in cues:
        text = text.replace("\n", " ")
        lines.append(f"Dialogue: 0,{fmt_ts(a)},{fmt_ts(b)},K,,0,0,0,,{text}")
    open(path, "w", encoding="utf-8").write(head + "\n".join(lines) + "\n")
    return path
