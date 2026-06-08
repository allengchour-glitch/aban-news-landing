"""mediakit CLI — `python3 -m mediakit <gruppe> <befehl> …`

Gruppen:
  image   crop|resize|pad|thumb|overlay|caption   (nur Pillow, kein ffmpeg)
  video   trim|concat|vertical|captions|music|fade|thumb   (braucht imageio-ffmpeg)
  reel    <case-id>                                (Slides → fertiges 9:16-mp4)
  firefly prepare|ingest                           (Datei-Staging für Adobe-MCP)
"""
import argparse
import sys

from . import brand
from .ffmpeg_util import MediakitError


def parse_color(s):
    named = {"cream": brand.CREAM, "ink": brand.INK, "amber": brand.AMBER,
             "bg": brand.BG, "white": brand.WHITE, "strike": brand.STRIKE}
    if s in named:
        return named[s]
    try:
        r, g, b = (int(x) for x in s.split(","))
        return (r, g, b)
    except Exception:
        raise MediakitError(f"Ungültige Farbe: {s!r} (Name oder 'R,G,B')")


def build_parser():
    p = argparse.ArgumentParser(prog="mediakit", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    grp = p.add_subparsers(dest="group", required=True)

    # ---- image ----
    img = grp.add_parser("image").add_subparsers(dest="cmd", required=True)
    c = img.add_parser("crop"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--aspect", default="9:16"); c.add_argument("--mode", default="cover", choices=["cover", "contain"])
    c.add_argument("--bg", default="bg")
    c = img.add_parser("resize"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--width", type=int); c.add_argument("--height", type=int); c.add_argument("--aspect")
    c = img.add_parser("pad"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--aspect", default="9:16"); c.add_argument("--bg", default="cream")
    c = img.add_parser("thumb"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--width", type=int, default=480); c.add_argument("--aspect", default="16:9")
    c = img.add_parser("overlay"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--brand-bar", action="store_true"); c.add_argument("--logo")
    c.add_argument("--pos", default="tl", choices=["tl", "tr", "bl", "br"])
    c = img.add_parser("caption"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--text", required=True); c.add_argument("--pos", default="bottom", choices=["bottom", "top"])
    c.add_argument("--style", default="brand")

    # ---- video ----
    vid = grp.add_parser("video").add_subparsers(dest="cmd", required=True)
    c = vid.add_parser("trim"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--start"); c.add_argument("--end"); c.add_argument("--duration")
    c = vid.add_parser("concat"); c.add_argument("out"); c.add_argument("inputs", nargs="+")
    c.add_argument("--normalize", action="store_true")
    c = vid.add_parser("vertical"); c.add_argument("in_path"); c.add_argument("out")
    c = vid.add_parser("captions"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--srt"); c.add_argument("--ass"); c.add_argument("--karaoke", action="store_true")
    c = vid.add_parser("music"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--music"); c.add_argument("--ambient", action="store_true")
    c.add_argument("--gain", type=float, default=0.14); c.add_argument("--duck", action="store_true")
    c = vid.add_parser("fade"); c.add_argument("in_path"); c.add_argument("out")
    c.add_argument("--fin", type=float, default=0.5); c.add_argument("--fout", type=float, default=0.8)
    c = vid.add_parser("thumb"); c.add_argument("in_path"); c.add_argument("out"); c.add_argument("--at", default="0:01")

    # ---- reel ----
    r = grp.add_parser("reel"); r.add_argument("case_id")
    r.add_argument("--voice", action="store_true"); r.add_argument("--no-ambient", dest="ambient", action="store_false")
    r.add_argument("--ambient", dest="ambient", action="store_true"); r.set_defaults(ambient=True)
    r.add_argument("--ambient-style", default="warm", choices=["warm", "soft", "lofi", "none"],
                   help="Hintergrund-Bett (Default warm); 'none' = stumm")
    r.add_argument("--music", help="eigene (royalty-free) Musikdatei statt generiertem Bett")
    r.add_argument("--broll", action="store_true", help="Pexels-Stockvideo-Look (braucht overlay_*.png + queries.txt + PEXELS-Key)")
    r.add_argument("--gain", type=float, default=0.12); r.add_argument("--out"); r.add_argument("--from-dir")

    # ---- firefly ----
    ff = grp.add_parser("firefly").add_subparsers(dest="cmd", required=True)
    c = ff.add_parser("prepare"); c.add_argument("in_path"); c.add_argument("--stage")
    c = ff.add_parser("ingest"); c.add_argument("firefly_output"); c.add_argument("dest")
    return p


def dispatch(a):
    if a.group == "image":
        from . import image_edit as ie
        if a.cmd == "crop": ie.crop_to_aspect(a.in_path, a.out, a.aspect, a.mode, parse_color(a.bg))
        elif a.cmd == "resize": ie.resize(a.in_path, a.out, a.width, a.height, a.aspect)
        elif a.cmd == "pad": ie.pad(a.in_path, a.out, a.aspect, parse_color(a.bg))
        elif a.cmd == "thumb": ie.thumbnail(a.in_path, a.out, a.width, a.aspect)
        elif a.cmd == "overlay": ie.overlay(a.in_path, a.out, a.brand_bar, a.logo, a.pos)
        elif a.cmd == "caption": ie.caption(a.in_path, a.out, a.text, a.pos, a.style)
        print(f"  ✓ {a.out}")
    elif a.group == "video":
        from . import video_edit as ve
        if a.cmd == "trim": ve.trim(a.in_path, a.out, a.start, a.end, a.duration)
        elif a.cmd == "concat": ve.concat(a.out, a.inputs, a.normalize)
        elif a.cmd == "vertical": ve.vertical(a.in_path, a.out)
        elif a.cmd == "captions": ve.captions(a.in_path, a.out, a.srt, a.ass, a.karaoke)
        elif a.cmd == "music": ve.music(a.in_path, a.out, a.music, a.ambient, a.gain, a.duck)
        elif a.cmd == "fade": ve.fade(a.in_path, a.out, a.fin, a.fout)
        elif a.cmd == "thumb": ve.thumb(a.in_path, a.out, a.at)
        print(f"  ✓ {a.out}")
    elif a.group == "reel":
        from . import reel
        reel.render(a.case_id, out=a.out, voice=a.voice, ambient=a.ambient,
                    gain=a.gain, from_dir=a.from_dir,
                    ambient_style=a.ambient_style, music=a.music, broll=a.broll)
    elif a.group == "firefly":
        from . import firefly
        if a.cmd == "prepare": firefly.prepare(a.in_path, a.stage)
        elif a.cmd == "ingest": firefly.ingest(a.firefly_output, a.dest)


def main(argv=None):
    a = build_parser().parse_args(argv)
    try:
        dispatch(a)
    except MediakitError as e:
        print(f"Fehler: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
