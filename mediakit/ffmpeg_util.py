"""ffmpeg-Auflösung + dünner Lauf-Wrapper für mediakit.

ffmpeg ist NICHT im Container vorinstalliert. Wir holen es — wie die bestehende
aban-files-Pipeline — über das pip-Paket `imageio-ffmpeg` (liefert ein gebündeltes
ffmpeg-Binary inkl. libass für Untertitel). Fehlt es, gibt es einen klaren
Install-Hinweis statt eines kryptischen Tracebacks.
"""
import re
import subprocess


class MediakitError(RuntimeError):
    """Saubere, benutzerlesbare Fehler (kein Stacktrace nötig)."""


_FF = None


def get_ffmpeg():
    """Pfad zum ffmpeg-Binary. Wirft MediakitError mit Install-Hinweis, wenn nichts da."""
    global _FF
    if _FF:
        return _FF
    try:
        import imageio_ffmpeg
    except ImportError:
        raise MediakitError(
            "ffmpeg ist nicht verfügbar. Installiere die optionale Video-Abhängigkeit:\n"
            "    pip install imageio-ffmpeg\n"
            "(Bild-Befehle `mediakit image …` brauchen ffmpeg NICHT.)"
        )
    _FF = imageio_ffmpeg.get_ffmpeg_exe()
    return _FF


def run(args, **kw):
    """subprocess.run mit check + capture; bei Fehler die ffmpeg-stderr-Tail zeigen."""
    kw.setdefault("check", True)
    kw.setdefault("capture_output", True)
    try:
        return subprocess.run(args, **kw)
    except subprocess.CalledProcessError as e:
        tail = (e.stderr or b"")
        if isinstance(tail, bytes):
            tail = tail.decode("utf-8", "ignore")
        tail = "\n".join(tail.strip().splitlines()[-12:])
        raise MediakitError(f"ffmpeg-Fehler:\n{tail}")


def probe_dimensions(path):
    """(width, height) eines Videos/Bilds — liest die ffmpeg-Banner-Ausgabe (stderr)."""
    ff = get_ffmpeg()
    p = subprocess.run([ff, "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True)
    m = re.search(r"(\d{2,5})x(\d{2,5})", p.stderr)
    if not m:
        raise MediakitError(f"Konnte Maße nicht lesen aus: {path}")
    return int(m.group(1)), int(m.group(2))
