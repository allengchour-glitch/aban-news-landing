"""Bild-Grundlagen ohne Fremd-Bibliotheken.

Absichtlich dependency-frei: PIL/OpenCV sind auf dem PC des Users nicht garantiert.
numpy wird genutzt, wenn vorhanden (nur zur Beschleunigung, siehe matcher.py).
"""

from __future__ import annotations

import struct
import zlib

try:  # numpy ist optional – beschleunigt Graustufen und Skalierung deutlich
    import numpy as _np
except Exception:  # pragma: no cover - abhängig von der Umgebung
    _np = None

_PNG_SIG = b"\x89PNG\r\n\x1a\n"


class Image:
    """Minimales Bild: mode 'RGB' (3 Byte/Pixel) oder 'L' (1 Byte/Pixel)."""

    __slots__ = ("width", "height", "mode", "data", "_gray", "_skalen")

    def __init__(self, width: int, height: int, mode: str, data: bytearray):
        self._gray = None
        self._skalen = None
        step = 3 if mode == "RGB" else 1
        if len(data) != width * height * step:
            raise ValueError(
                f"Datenlänge {len(data)} passt nicht zu {width}x{height} ({mode})"
            )
        self.width = width
        self.height = height
        self.mode = mode
        self.data = data

    # ---------------------------------------------------------------- Fabriken
    @classmethod
    def from_rgba_raw(cls, width: int, height: int, raw: bytes) -> "Image":
        """RGBA-Rohdaten (so liefert `adb exec-out screencap`) → RGB."""
        out = bytearray(width * height * 3)
        out[0::3] = raw[0::4]
        out[1::3] = raw[1::4]
        out[2::3] = raw[2::4]
        return cls(width, height, "RGB", out)

    @classmethod
    def new(cls, width: int, height: int, color=(0, 0, 0)) -> "Image":
        return cls(width, height, "RGB", bytearray(bytes(color) * (width * height)))

    # -------------------------------------------------------------- Operationen
    def pixel(self, x: int, y: int):
        if self.mode == "L":
            return self.data[y * self.width + x]
        i = (y * self.width + x) * 3
        return (self.data[i], self.data[i + 1], self.data[i + 2])

    def crop(self, x: int, y: int, w: int, h: int) -> "Image":
        x = max(0, min(x, self.width))
        y = max(0, min(y, self.height))
        w = max(1, min(w, self.width - x))
        h = max(1, min(h, self.height - y))
        step = 3 if self.mode == "RGB" else 1
        out = bytearray(w * h * step)
        row = w * step
        for j in range(h):
            src = ((y + j) * self.width + x) * step
            out[j * row : (j + 1) * row] = self.data[src : src + row]
        return Image(w, h, self.mode, out)

    def to_gray(self) -> "Image":
        """Graustufen-Fassung (wird zwischengespeichert – jede Regel braucht sie)."""
        if self.mode == "L":
            return self
        if self._gray is not None:
            return self._gray
        src = self.data
        if _np is not None:
            arr = _np.frombuffer(bytes(src), dtype=_np.uint8).reshape(-1, 3).astype(_np.uint16)
            lum = (arr[:, 0] * 77 + arr[:, 1] * 150 + arr[:, 2] * 29) >> 8
            out = bytearray(lum.astype(_np.uint8).tobytes())
        else:
            out = bytearray(self.width * self.height)
            for i in range(len(out)):
                j = i * 3
                # Ganzzahlige Luma-Näherung (BT.601) – schneller als Float-Mathematik.
                out[i] = (src[j] * 77 + src[j + 1] * 150 + src[j + 2] * 29) >> 8
        self._gray = Image(self.width, self.height, "L", out)
        return self._gray

    def scale(self, width: int, height: int) -> "Image":
        """Nearest-Neighbour-Skalierung (reicht für Template-Matching)."""
        width = max(1, width)
        height = max(1, height)
        if width == self.width and height == self.height:
            return self
        step = 3 if self.mode == "RGB" else 1
        if _np is not None:
            arr = _np.frombuffer(bytes(self.data), dtype=_np.uint8)
            arr = arr.reshape(self.height, self.width, step)
            ys = (_np.arange(height) * self.height) // height
            xs = (_np.arange(width) * self.width) // width
            out = bytearray(arr[ys][:, xs].tobytes())
            return Image(width, height, self.mode, out)
        out = bytearray(width * height * step)
        xmap = [((x * self.width) // width) * step for x in range(width)]
        src = self.data
        for y in range(height):
            sy = (y * self.height) // height
            base = sy * self.width * step
            row = y * width * step
            if step == 1:
                for x in range(width):
                    out[row + x] = src[base + xmap[x]]
            else:
                for x in range(width):
                    s = base + xmap[x]
                    d = row + x * 3
                    out[d] = src[s]
                    out[d + 1] = src[s + 1]
                    out[d + 2] = src[s + 2]
        return Image(width, height, self.mode, out)

    def scaled_by(self, factor: float) -> "Image":
        return self.scale(int(self.width * factor), int(self.height * factor))

    def box_scale(self, width: int, height: int) -> "Image":
        """Verkleinern mit Flächenmittel statt Nearest-Neighbour.

        Wichtig fürs Template-Matching: Nearest greift je nach Position ein
        anderes Quell-Pixel ab (Phasenfehler) – gemittelt ist das Ergebnis
        unabhängig davon, wo das Motiv im Bild liegt.
        """
        width = max(1, width)
        height = max(1, height)
        if width >= self.width or height >= self.height:
            return self.scale(width, height)
        step = 3 if self.mode == "RGB" else 1
        if _np is not None:
            a = _np.frombuffer(bytes(self.data), dtype=_np.uint8).reshape(
                self.height, self.width, step
            ).astype(_np.float64)
            ii = _np.zeros((self.height + 1, self.width + 1, step))
            ii[1:, 1:] = a.cumsum(0).cumsum(1)
            y0 = (_np.arange(height) * self.height) // height
            y1 = _np.maximum(((_np.arange(height) + 1) * self.height) // height, y0 + 1)
            x0 = (_np.arange(width) * self.width) // width
            x1 = _np.maximum(((_np.arange(width) + 1) * self.width) // width, x0 + 1)
            total = (
                ii[y1][:, x1] - ii[y0][:, x1] - ii[y1][:, x0] + ii[y0][:, x0]
            )
            area = ((y1 - y0)[:, None] * (x1 - x0)[None, :])[:, :, None]
            out = (total / area).round().clip(0, 255).astype(_np.uint8)
            return Image(width, height, self.mode, bytearray(out.tobytes()))

        src = self.data
        out = bytearray(width * height * step)
        for y in range(height):
            ya = (y * self.height) // height
            yb = max(ya + 1, ((y + 1) * self.height) // height)
            rows = _spread(ya, yb)
            for x in range(width):
                xa = (x * self.width) // width
                xb = max(xa + 1, ((x + 1) * self.width) // width)
                cols = _spread(xa, xb)
                d = (y * width + x) * step
                for c in range(step):
                    total = 0
                    for sy in rows:
                        base = (sy * self.width) * step + c
                        for sx in cols:
                            total += src[base + sx * step]
                    out[d + c] = total // (len(rows) * len(cols))
        return Image(width, height, self.mode, out)

    def box_scaled_by(self, factor: float) -> "Image":
        """Verkleinern, Ergebnis je Faktor gemerkt.

        GEMESSEN am 04.08.: ein Verkleinern des Bildschirms auf 1/8 kostet
        0.203 s - mehr als die eigentliche Suche (0.122 s). Da jede Regel
        dieselbe Verkleinerung erneut anforderte, ging der groesste Teil der
        Rechenzeit fuer immer dasselbe Ergebnis drauf.
        """
        schluessel = round(float(factor), 4)
        if self._skalen is None:
            self._skalen = {}
        fertig = self._skalen.get(schluessel)
        if fertig is not None:
            return fertig
        fertig = self._box_scaled_by_roh(factor)
        if len(self._skalen) > 8:    # nicht unbegrenzt wachsen lassen
            self._skalen.clear()
        self._skalen[schluessel] = fertig
        return fertig

    def _box_scaled_by_roh(self, factor: float) -> "Image":
        return self.box_scale(int(self.width * factor), int(self.height * factor))

    def draw_grid(self, step: int = 100, bold_every: int = 5) -> "Image":
        """Koordinaten-Raster einzeichnen – hilft beim Ausmessen von Templates."""
        out = Image(self.width, self.height, self.mode, bytearray(self.data))
        px = 3 if self.mode == "RGB" else 1
        thin = (255, 0, 0) if self.mode == "RGB" else (255,)
        bold = (0, 255, 255) if self.mode == "RGB" else (0,)

        def punkt(x: int, y: int, color) -> None:
            if 0 <= x < self.width and 0 <= y < self.height:
                d = (y * self.width + x) * px
                out.data[d : d + px] = bytes(color[:px])

        for x in range(0, self.width, step):
            color = bold if (x // step) % bold_every == 0 else thin
            for y in range(0, self.height, 1 if color is bold else 3):
                punkt(x, y, color)
        for y in range(0, self.height, step):
            color = bold if (y // step) % bold_every == 0 else thin
            for x in range(0, self.width, 1 if color is bold else 3):
                punkt(x, y, color)
        return out

    def draw_box(self, x0: int, y0: int, x1: int, y1: int, color=(255, 0, 0), dick: int = 4) -> None:
        """Rahmen einzeichnen – markiert gefundene Kandidaten im Uebersichtsbild."""
        px = 3 if self.mode == "RGB" else 1
        farbe = bytes(color[:px])
        for d in range(dick):
            for x in range(max(0, x0), min(self.width, x1)):
                for y in (y0 + d, y1 - 1 - d):
                    if 0 <= y < self.height:
                        i = (y * self.width + x) * px
                        self.data[i : i + px] = farbe
            for y in range(max(0, y0), min(self.height, y1)):
                for x in (x0 + d, x1 - 1 - d):
                    if 0 <= x < self.width:
                        i = (y * self.width + x) * px
                        self.data[i : i + px] = farbe
        self._gray = None

    def ist_einfarbig(self, schwelle: int = 8, samples: int = 400) -> bool:
        """Ist das Bild praktisch leer (z. B. komplett schwarz)?

        Emulatoren mit GPU-Rendering liefern bei `adb screencap` mitunter ein
        schwarzes Bild. Ohne diese Pruefung sucht der Bot stundenlang in einer
        leeren Flaeche und meldet nur 'nicht gefunden'.
        """
        grau = self.to_gray().data
        n = len(grau)
        if n == 0:
            return True
        schritt = max(1, n // samples)
        werte = grau[::schritt]
        return (max(werte) - min(werte)) < schwelle

    def diff_ratio(self, other: "Image", samples: int = 2000) -> float:
        """Grober Unterschied 0..1 – für Stuck-Erkennung (Bild bewegt sich nicht mehr)."""
        if other.width != self.width or other.height != self.height:
            return 1.0
        a, b = self.data, other.data
        n = len(a)
        stepsize = max(1, n // max(1, samples))
        diff = 0
        count = 0
        for i in range(0, n, stepsize):
            if abs(a[i] - b[i]) > 12:
                diff += 1
            count += 1
        return diff / count if count else 0.0

    # ------------------------------------------------------------------ PNG-I/O
    def to_png(self) -> bytes:
        step = 3 if self.mode == "RGB" else 1
        color_type = 2 if self.mode == "RGB" else 0
        raw = bytearray()
        row = self.width * step
        for y in range(self.height):
            raw.append(0)  # Filter "None"
            raw += self.data[y * row : (y + 1) * row]

        def chunk(tag: bytes, payload: bytes) -> bytes:
            return (
                struct.pack(">I", len(payload))
                + tag
                + payload
                + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
            )

        head = struct.pack(">IIBBBBB", self.width, self.height, 8, color_type, 0, 0, 0)
        return (
            _PNG_SIG
            + chunk(b"IHDR", head)
            + chunk(b"IDAT", zlib.compress(bytes(raw), 6))
            + chunk(b"IEND", b"")
        )

    @classmethod
    def from_png(cls, blob: bytes) -> "Image":
        if not blob.startswith(_PNG_SIG):
            raise ValueError("Keine PNG-Datei")
        pos = len(_PNG_SIG)
        idat = bytearray()
        width = height = depth = color_type = 0
        palette = b""
        while pos < len(blob):
            (length,) = struct.unpack(">I", blob[pos : pos + 4])
            tag = blob[pos + 4 : pos + 8]
            payload = blob[pos + 8 : pos + 8 + length]
            pos += 12 + length
            if tag == b"IHDR":
                width, height, depth, color_type, _, _, interlace = struct.unpack(
                    ">IIBBBBB", payload
                )
                if depth != 8 or interlace != 0:
                    raise ValueError("Nur 8-Bit, nicht-interlaced PNG wird unterstützt")
            elif tag == b"PLTE":
                palette = payload
            elif tag == b"IDAT":
                idat += payload
            elif tag == b"IEND":
                break

        channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(color_type)
        if channels is None:
            raise ValueError(f"PNG-Farbtyp {color_type} nicht unterstützt")
        raw = zlib.decompress(bytes(idat))
        stride = width * channels
        out = bytearray(stride * height)
        prev = bytearray(stride)
        pos = 0
        for y in range(height):
            filt = raw[pos]
            pos += 1
            line = bytearray(raw[pos : pos + stride])
            pos += stride
            _unfilter(filt, line, prev, channels)
            out[y * stride : (y + 1) * stride] = line
            prev = line

        if color_type == 3:  # Palette → RGB
            rgb = bytearray(width * height * 3)
            for i, idx in enumerate(out):
                rgb[i * 3 : i * 3 + 3] = palette[idx * 3 : idx * 3 + 3]
            return cls(width, height, "RGB", rgb)
        if channels == 1:
            return cls(width, height, "L", out)
        if channels == 2:  # Grau+Alpha
            return cls(width, height, "L", bytearray(out[0::2]))
        if channels == 4:  # RGBA → RGB
            rgb = bytearray(width * height * 3)
            rgb[0::3] = out[0::4]
            rgb[1::3] = out[1::4]
            rgb[2::3] = out[2::4]
            return cls(width, height, "RGB", rgb)
        return cls(width, height, "RGB", out)

    def save(self, path) -> None:
        with open(path, "wb") as fh:
            fh.write(self.to_png())

    @classmethod
    def load(cls, path) -> "Image":
        with open(path, "rb") as fh:
            return cls.from_png(fh.read())

    def __repr__(self) -> str:  # pragma: no cover - Debug-Hilfe
        return f"<Image {self.width}x{self.height} {self.mode}>"


def _spread(a: int, b: int, limit: int = 3):
    """Bis zu `limit` gleichmässig verteilte Positionen aus [a, b)."""
    span = b - a
    if span <= limit:
        return list(range(a, b))
    return [a + (i * span) // limit for i in range(limit)]


def _unfilter(filt: int, line: bytearray, prev: bytearray, bpp: int) -> None:
    if filt == 0:
        return
    n = len(line)
    if filt == 1:
        for i in range(bpp, n):
            line[i] = (line[i] + line[i - bpp]) & 0xFF
    elif filt == 2:
        for i in range(n):
            line[i] = (line[i] + prev[i]) & 0xFF
    elif filt == 3:
        for i in range(n):
            left = line[i - bpp] if i >= bpp else 0
            line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
    elif filt == 4:
        for i in range(n):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
            line[i] = (line[i] + pred) & 0xFF
    else:
        raise ValueError(f"Unbekannter PNG-Filter {filt}")
