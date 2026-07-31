"""Geräte-Anbindung über ADB (echtes Handy, Emulator – oder Fake für Tests)."""

from __future__ import annotations

import base64
import os
import random
import re
import shutil
import struct
import subprocess
import time
from typing import List, Optional, Tuple

from .image import Image


class DeviceError(RuntimeError):
    pass


class Device:
    """Gemeinsame Schnittstelle: screencap / tap / swipe / key / App-Steuerung."""

    dry_run = False

    def screencap(self) -> Image:  # pragma: no cover - Interface
        raise NotImplementedError

    def tap(self, x: int, y: int) -> None:  # pragma: no cover - Interface
        raise NotImplementedError

    def swipe(self, x1: int, y1: int, x2: int, y2: int, ms: int = 300) -> None:  # pragma: no cover
        raise NotImplementedError

    def key(self, keycode: str) -> None:  # pragma: no cover - Interface
        raise NotImplementedError

    def type_text(self, text: str) -> None:  # pragma: no cover - Interface
        raise NotImplementedError

    def drag(self, x1: int, y1: int, x2: int, y2: int, ms: int = 1200) -> None:  # pragma: no cover
        raise NotImplementedError

    def start_app(self, package: str, activity: Optional[str] = None) -> None:  # pragma: no cover
        raise NotImplementedError

    def stop_app(self, package: str) -> None:  # pragma: no cover - Interface
        raise NotImplementedError

    def current_package(self) -> str:  # pragma: no cover - Interface
        return ""


class AdbDevice(Device):
    def __init__(
        self,
        serial: Optional[str] = None,
        adb: str = "adb",
        dry_run: bool = False,
        timeout: int = 30,
        input_method: str = "input",
    ):
        self.serial = serial
        self.adb = adb
        self.dry_run = dry_run
        self.timeout = timeout
        self.input_method = input_method
        self._size: Optional[Tuple[int, int]] = None
        gefunden = shutil.which(adb) or _adb_suchen(adb)
        if gefunden is None:
            raise DeviceError(
                f"'{adb}' nicht gefunden. Android-Platform-Tools installieren "
                "und im PATH haben (oder --adb /pfad/zu/adb angeben)."
            )
        self.adb = gefunden
        if not self.serial:
            self.serial = waehle_geraet(self.adb)

    # ------------------------------------------------------------------ intern
    def _args(self, *rest: str) -> List[str]:
        base = [self.adb]
        if self.serial:
            base += ["-s", self.serial]
        return base + list(rest)

    def _run(self, *args: str, binary: bool = False):
        proc = subprocess.run(
            self._args(*args), capture_output=True, timeout=self.timeout
        )
        if proc.returncode != 0:
            err = proc.stderr.decode("utf-8", "replace").strip()
            if self._neu_verbinden(err):
                proc = subprocess.run(
                    self._args(*args), capture_output=True, timeout=self.timeout
                )
                err = proc.stderr.decode("utf-8", "replace").strip()
            if proc.returncode != 0:
                raise DeviceError(f"adb {' '.join(args)} fehlgeschlagen: {err}")
        return proc.stdout if binary else proc.stdout.decode("utf-8", "replace")

    def _neu_verbinden(self, fehler: str) -> bool:
        """Bei einer Port-Verbindung einmal `adb connect` nachschieben.

        Ueber den Port gesteuert (127.0.0.1:5555) reisst die Verbindung ab,
        sobald BlueStacks kurz haengt oder neu startet. Ein `adb connect`
        stellt sie wieder her - ohne das wuerde der Bot bis zum naechsten
        Neustart ins Leere laufen.
        """
        if not self.serial or ":" not in self.serial:
            return False
        if not any(w in fehler.lower() for w in
                   ("offline", "not found", "no devices", "closed", "connection reset")):
            return False
        try:
            antwort = subprocess.run(
                [self.adb, "connect", self.serial],
                capture_output=True, timeout=self.timeout,
            ).stdout.decode("utf-8", "replace")
        except Exception:
            return False
        return "connected to" in antwort

    def shell(self, cmd: str) -> str:
        return self._run("shell", cmd)

    # ---------------------------------------------------------------- Aufnahme
    def screencap(self) -> Image:
        raw = self._run("exec-out", "screencap", binary=True)
        try:
            return decode_screencap(raw)
        except DeviceError:
            # Manche Windows-/ROM-Kombinationen liefern das Rohformat verstuemmelt.
            # PNG ist langsamer, aber unempfindlich gegen Zeilenende-Umwandlung.
            return decode_screencap(self._run("exec-out", "screencap", "-p", binary=True))

    def size(self) -> Tuple[int, int]:
        if self._size is None:
            out = self.shell("wm size")
            # "Physical size: 1080x2400" (ggf. zusätzlich "Override size: ...")
            line = [l for l in out.splitlines() if "size:" in l]
            w, h = 1080, 1920
            if line:
                try:
                    w, h = (int(v) for v in line[-1].split(":")[1].strip().split("x"))
                except ValueError:
                    pass
            self._size = (w, h)
        return self._size

    # ----------------------------------------------------------------- Eingabe
    def tap(self, x: int, y: int) -> None:
        if self.dry_run:
            return
        self.shell(f"input tap {int(x)} {int(y)}")

    def swipe(self, x1: int, y1: int, x2: int, y2: int, ms: int = 300) -> None:
        if self.dry_run:
            return
        self.shell(f"input swipe {int(x1)} {int(y1)} {int(x2)} {int(y2)} {int(ms)}")

    def key(self, keycode: str) -> None:
        if self.dry_run:
            return
        self.shell(f"input keyevent {keycode}")

    def drag(self, x1: int, y1: int, x2: int, y2: int, ms: int = 1200) -> None:
        """Gedrueckt halten und schieben – so verschiebt man die Stadtansicht.

        Ein kurzer Wisch wird als Schleuder-Geste gewertet und bewegt die Kamera
        gar nicht oder unkontrolliert. Erst eine lange Zieh-Dauer wirkt wie ein
        Finger, der aufliegt und schiebt.
        """
        if self.dry_run:
            return
        self.shell(f"input swipe {int(x1)} {int(y1)} {int(x2)} {int(y2)} {max(600, int(ms))}")

    def type_text(self, text: str) -> None:
        """Text ins fokussierte Eingabefeld tippen.

        `input text` kann nur ASCII – Umlaute werden ersetzt. Wer Umlaute/Emojis
        braucht, installiert die ADBKeyboard-App und setzt
        `"input_method": "adbkeyboard"` in der Konfiguration.
        """
        if self.dry_run or not text:
            return
        if self.input_method == "adbkeyboard":
            payload = base64.b64encode(text.encode("utf-8")).decode("ascii")
            self.shell(f"am broadcast -a ADB_INPUT_B64 --es msg {payload}")
            return
        for chunk in _ascii_chunks(ascii_fallback(text)):
            self.shell("input text '" + chunk.replace("'", "'\\''") + "'")
            time.sleep(0.25)

    # --------------------------------------------------------------------- App
    def start_app(self, package: str, activity: Optional[str] = None) -> None:
        if self.dry_run:
            return
        if activity:
            self.shell(f"am start -n {package}/{activity}")
        else:
            self.shell(
                f"monkey -p {package} -c android.intent.category.LAUNCHER 1"
            )

    def stop_app(self, package: str) -> None:
        if self.dry_run:
            return
        self.shell(f"am force-stop {package}")

    def current_package(self) -> str:
        """Paket der App im Vordergrund. Filtert selbst statt per `grep` –
        nicht jede Android-Variante (z. B. in Emulatoren) bringt eines mit."""
        for befehl in ("dumpsys window", "dumpsys activity activities"):
            try:
                out = self.shell(befehl)
            except DeviceError:
                continue
            for zeile in out.splitlines():
                if not any(
                    marke in zeile
                    for marke in ("mCurrentFocus", "mFocusedApp", "mResumedActivity",
                                  "topResumedActivity")
                ):
                    continue
                for token in zeile.replace("/", " ").split():
                    if "." in token and not token.startswith("(") and "=" not in token:
                        return token.strip("{}")
        return ""


class FakeDevice(Device):
    """Gerät aus einer Liste von Bildern – für Tests und `--replay`."""

    def __init__(self, frames: List[Image], loop: bool = False, hold: bool = False):
        """`hold=True`: screencap() liefert immer dasselbe Bild, bis `index`
        von aussen weitergesetzt wird – so entspricht ein Bild einem Schritt."""
        if not frames:
            raise DeviceError("FakeDevice braucht mindestens ein Bild")
        self.frames = frames
        self.loop = loop
        self.hold = hold
        self.index = 0
        self.taps: List[Tuple[int, int]] = []
        self.swipes: List[Tuple[int, int, int, int, int]] = []
        self.drags: List[Tuple[int, int, int, int, int]] = []
        self.keys: List[str] = []
        self.texts: List[str] = []
        self.dry_run = True

    def screencap(self) -> Image:
        frame = self.frames[min(self.index, len(self.frames) - 1)]
        if not self.hold:
            self.index += 1
            if self.loop and self.index >= len(self.frames):
                self.index = 0
        return frame

    @property
    def exhausted(self) -> bool:
        return not self.loop and self.index >= len(self.frames)

    def tap(self, x: int, y: int) -> None:
        self.taps.append((int(x), int(y)))

    def swipe(self, x1: int, y1: int, x2: int, y2: int, ms: int = 300) -> None:
        self.swipes.append((int(x1), int(y1), int(x2), int(y2), int(ms)))

    def drag(self, x1: int, y1: int, x2: int, y2: int, ms: int = 1200) -> None:
        self.drags.append((int(x1), int(y1), int(x2), int(y2), int(ms)))

    def key(self, keycode: str) -> None:
        self.keys.append(keycode)

    def type_text(self, text: str) -> None:
        self.texts.append(text)

    def start_app(self, package: str, activity: Optional[str] = None) -> None:
        self.keys.append(f"start:{package}")

    def stop_app(self, package: str) -> None:
        self.keys.append(f"stop:{package}")


def decode_screencap(raw: bytes) -> Image:
    """`adb exec-out screencap` (roh) → Image.

    Header ist je nach Android-Version 12 oder 16 Byte (Farbraum-Feld) –
    daher aus der Gesamtlänge herleiten statt raten.
    """
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return Image.from_png(raw)
    if len(raw) < 12:
        raise DeviceError("screencap lieferte zu wenig Daten")
    width, height, fmt = struct.unpack("<III", raw[:12])
    if width <= 0 or height <= 0 or width > 20000 or height > 20000:
        raise DeviceError(f"screencap: unplausible Grösse {width}x{height}")
    body = len(raw) - width * height * 4
    if body not in (12, 16):
        raise DeviceError(
            f"screencap: unerwartetes Format (w={width} h={height} f={fmt} "
            f"Header={body}). Ggf. 'adb exec-out screencap -p' nutzen."
        )
    return Image.from_rgba_raw(width, height, raw[body:])


def _adb_suchen(name: str) -> Optional[str]:
    r"""Uebliche Ablageorte absuchen, wenn adb nicht im PATH steht.

    Auf Windows landen die Platform-Tools meist in C:\platform-tools oder im
    Android-SDK - ohne das hier scheitert jeder direkte Aufruf von bot.py,
    obwohl adb laengst installiert ist.
    """
    if os.path.sep in name or name.lower().endswith(".exe"):
        return name if os.path.exists(name) else None
    kandidaten = []
    for basis in (
        os.environ.get("ANDROID_SDK_ROOT"),
        os.environ.get("ANDROID_HOME"),
        os.environ.get("LOCALAPPDATA", "") and os.path.join(os.environ["LOCALAPPDATA"], "Android", "Sdk"),
        os.environ.get("USERPROFILE"),
        "C:\\",
        os.path.expanduser("~"),
    ):
        if basis:
            kandidaten.append(os.path.join(basis, "platform-tools"))
    kandidaten += ["/usr/lib/android-sdk/platform-tools", "/opt/platform-tools"]
    for ordner in kandidaten:
        for datei in ("adb.exe", "adb"):
            pfad = os.path.join(ordner, datei)
            if os.path.exists(pfad):
                return pfad
    return None


_UMLAUTE = {
    "ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
    "ß": "ss", "é": "e", "è": "e", "à": "a", "ç": "c", "„": '"', "“": '"',
    "”": '"', "–": "-", "—": "-", "…": "...", "’": "'", "‘": "'",
}


def ascii_fallback(text: str) -> str:
    """Nicht-ASCII entschärfen – `adb shell input text` kann nur ASCII."""
    out = []
    for ch in text:
        if ch in _UMLAUTE:
            out.append(_UMLAUTE[ch])
        elif ord(ch) < 128:
            out.append(ch)
        # alles andere (Emojis etc.) fällt weg
    return "".join(out).strip()


def _ascii_chunks(text: str, size: int = 60) -> List[str]:
    """Lange Texte stückeln – manche ROMs verschlucken sonst Zeichen."""
    return [text[i : i + size] for i in range(0, len(text), size)] or [""]


def list_devices(adb: str = "adb") -> List[str]:
    if shutil.which(adb) is None:
        return []
    try:
        out = subprocess.run([adb, "devices"], capture_output=True, timeout=15)
    except Exception:
        return []
    serials = []
    for line in out.stdout.decode("utf-8", "replace").splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            serials.append(parts[0])
    return serials


def waehle_geraet(adb: str = "adb") -> Optional[str]:
    """Genau ein Geraet festlegen, wenn mehrere gemeldet sind.

    BlueStacks meldet sich doppelt (emulator-5554 und 127.0.0.1:5555). Ohne
    -s verweigert adb dann jeden Befehl mit 'more than one device/emulator'.
    Vorrang hat die Port-Verbindung: die laesst sich mit `adb connect`
    jederzeit neu aufbauen, der Emulator-Eintrag nicht.
    """
    geraete = list_devices(adb)
    if len(geraete) < 2:
        return geraete[0] if geraete else None
    for serial in geraete:
        if re.match(r"^\d+\.\d+\.\d+\.\d+:\d+$", serial):
            return serial
    return geraete[0]


def human_point(x: int, y: int, w: int, h: int, jitter: float = 0.18) -> Tuple[int, int]:
    """Tippt nicht exakt auf denselben Pixel – streut innerhalb des Treffers."""
    dx = int(random.uniform(-jitter, jitter) * max(2, w))
    dy = int(random.uniform(-jitter, jitter) * max(2, h))
    return (x + dx, y + dy)


def human_sleep(low: float, high: Optional[float] = None) -> None:
    if high is None or high <= low:
        time.sleep(max(0.0, low))
    else:
        time.sleep(random.uniform(low, high))
