"""Die Bot-Schleife: Bildschirm ansehen → passende Regel finden → Aktionen ausführen."""

from __future__ import annotations

import json
import os
import random
import time
from typing import Any, Dict, List, Optional, Sequence

from . import matcher
from .adb import Device, human_point
from .config import Config, ConfigError, Task
from .image import Image
from .log import Logger


def _veraenderte_bereiche(a: Image, b: Image, min_kante: int, max_kante: int):
    """Rechtecke, die sich zwischen zwei Aufnahmen geaendert haben.

    Arbeitet auf einem groben Raster – es geht um Objekte in Knopfgroesse,
    nicht um einzelne Pixel.
    """
    if a.width != b.width or a.height != b.height:
        return []
    raster = 16
    ga, gb = a.to_gray(), b.to_gray()
    spalten = a.width // raster
    zeilen = a.height // raster
    if spalten < 3 or zeilen < 3:
        return []

    anders = [[False] * spalten for _ in range(zeilen)]
    for zy in range(zeilen):
        for zx in range(spalten):
            px = zx * raster + raster // 2
            py = zy * raster + raster // 2
            summe = 0
            for dy in (-4, 0, 4):
                for dx in (-4, 0, 4):
                    i = (py + dy) * a.width + (px + dx)
                    summe += abs(ga.data[i] - gb.data[i])
            anders[zy][zx] = summe > 200

    besucht = [[False] * spalten for _ in range(zeilen)]
    kisten = []
    for zy in range(zeilen):
        for zx in range(spalten):
            if not anders[zy][zx] or besucht[zy][zx]:
                continue
            stapel = [(zy, zx)]
            besucht[zy][zx] = True
            felder = []
            while stapel:
                cy, cx = stapel.pop()
                felder.append((cy, cx))
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < zeilen and 0 <= nx < spalten and anders[ny][nx] and not besucht[ny][nx]:
                        besucht[ny][nx] = True
                        stapel.append((ny, nx))
            ys = [f[0] for f in felder]
            xs = [f[1] for f in felder]
            x0, x1 = min(xs) * raster, (max(xs) + 1) * raster
            y0, y1 = min(ys) * raster, (max(ys) + 1) * raster
            breite, hoehe = x1 - x0, y1 - y0
            if not (min_kante <= breite <= max_kante and min_kante <= hoehe <= max_kante):
                continue
            if not (0.6 <= breite / float(hoehe) <= 1.7):  # Blasen sind rundlich
                continue
            kisten.append((x0, y0, x1, y1))
    return kisten


def _schon_bekannt(ausschnitt: Image, ordner: str) -> bool:
    """Doppelte Vorlagen vermeiden."""
    for datei in os.listdir(ordner):
        if not datei.endswith(".png"):
            continue
        try:
            alt = Image.load(os.path.join(ordner, datei))
        except Exception:
            continue
        if abs(alt.width - ausschnitt.width) > 12 or abs(alt.height - ausschnitt.height) > 12:
            continue
        if matcher.find(alt, ausschnitt, threshold=0.9) or matcher.find(ausschnitt, alt, threshold=0.9):
            return True
    return False


class StopRun(Exception):
    """Wird von der Aktion `stop` geworfen."""


class Engine:
    def __init__(
        self,
        config: Config,
        device: Device,
        logger: Optional[Logger] = None,
        shots_dir: str = "shots",
        stop_file: Optional[str] = None,
        sleep=time.sleep,
        clock=time.monotonic,
        seed: Optional[int] = None,
        state_file: Optional[str] = None,
        now=time.time,
    ):
        self.cfg = config
        self.dev = device
        self.log = logger or Logger()
        self.shots_dir = shots_dir
        self.stop_file = stop_file
        self._sleep = sleep
        self._clock = clock
        self.rng = random.Random(seed)

        self.screen: Optional[Image] = None
        self.last_match: Optional[matcher.Match] = None
        self.stats: Dict[str, int] = {}
        self.steps = 0
        self.unknown_streak = 0

        self._rule_last: Dict[str, float] = {}
        self._rule_done = set()
        self._task_due: Dict[str, float] = {}
        self._last_text: Dict[str, str] = {}
        self._gemeldet_fehlend = set()
        self._last_frame: Optional[Image] = None
        self._last_change = clock()
        self._scale: Optional[float] = None

        # Standardmaessig aus: Tests und Replays sollen sich nichts merken.
        # Der Dauerbetrieb setzt die Datei ueber bot.py.
        self.state_file = state_file
        self._now = now
        self._letzter_lauf: Dict[str, float] = self._zustand_laden()

        jetzt_m = clock()
        jetzt_w = now()
        for task in self.cfg.tasks:
            if not task.enabled:
                continue
            frueher = self._letzter_lauf.get(task.name)
            if frueher is None:
                # Noch nie gelaufen: Sofortstart nur, wenn so gewuenscht.
                self._task_due[task.name] = jetzt_m if task.at_start else jetzt_m + task.every
            else:
                # Nach einem Neustart dort weitermachen, wo der Zeitplan stand -
                # sonst wuerde nach jedem Absturz alles erneut abgearbeitet.
                rest = max(0.0, (frueher + task.every) - jetzt_w)
                self._task_due[task.name] = jetzt_m + rest
                if rest > 0:
                    self.log.debug(
                        "Aufgabe wartet noch", aufgabe=task.name, sekunden=int(rest)
                    )

    # ------------------------------------------------------------------ Zustand
    def _zustand_laden(self) -> Dict[str, float]:
        """Wann lief welche Aufgabe zuletzt? Ueberlebt Neustarts."""
        if not self.state_file or not os.path.exists(self.state_file):
            return {}
        try:
            with open(self.state_file, "r", encoding="utf-8") as fh:
                daten = json.load(fh)
            return {k: float(v) for k, v in daten.get("aufgaben", {}).items()}
        except Exception as exc:
            self.log.warn(f"Zustand nicht lesbar, starte frisch: {exc}")
            return {}

    def _zustand_sichern(self) -> None:
        if not self.state_file:
            return
        try:
            ordner = os.path.dirname(os.path.abspath(self.state_file))
            if ordner:
                os.makedirs(ordner, exist_ok=True)
            with open(self.state_file, "w", encoding="utf-8") as fh:
                json.dump({"aufgaben": self._letzter_lauf}, fh, indent=2)
        except Exception as exc:  # pragma: no cover - Dateisystem
            self.log.warn(f"Zustand nicht schreibbar: {exc}")

    # --------------------------------------------------------------- Hilfsmittel
    def bump(self, key: str) -> None:
        self.stats[key] = self.stats.get(key, 0) + 1

    def capture(self) -> Image:
        self.screen = self.dev.screencap()
        if self._scale is None:
            self._scale = self.cfg.scale_for(self.screen.width)
            if abs(self._scale - 1.0) > 0.01:
                self.log.info(
                    "Templates werden skaliert",
                    faktor=round(self._scale, 3),
                    bildbreite=self.screen.width,
                )
        return self.screen

    def save_shot(self, name: str, image: Optional[Image] = None) -> str:
        img = image or self.screen
        if img is None:
            return ""
        os.makedirs(self.shots_dir, exist_ok=True)
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
        path = os.path.join(self.shots_dir, f"{time.strftime('%Y%m%d-%H%M%S')}-{safe}.png")
        img.save(path)
        return path

    # ------------------------------------------------------------- Bedingungen
    def evaluate(self, cond: Dict[str, Any], screen: Image) -> bool:
        if "always" in cond:
            return bool(cond["always"])
        if "any" in cond:
            return any(self.evaluate(c, screen) for c in cond["any"])
        if "all" in cond:
            return all(self.evaluate(c, screen) for c in cond["all"])
        if "not" in cond:
            return not self.evaluate(cond["not"], screen)
        if "farbknopf" in cond:
            spec = cond["farbknopf"]
            treffer = matcher.find_color_button(
                screen,
                spec.get("rgb", (120, 181, 54)),
                tolerance=int(spec.get("tolerance", 38)),
                min_w=float(spec.get("min_w", 0.12)),
                max_w=float(spec.get("max_w", 0.8)),
                min_h=float(spec.get("min_h", 0.015)),
                max_h=float(spec.get("max_h", 0.06)),
                region=spec.get("region"),
                min_fuellung=float(spec.get("min_fuellung", 0.55)),
                limit=1,
            )
            if treffer:
                self.last_match = treffer[0]
                return True
            return False
        if "pixel" in cond:
            x, y = cond["pixel"]
            return matcher.pixel_matches(
                screen, x, y, cond.get("rgb", (0, 0, 0)), int(cond.get("tolerance", 20))
            )
        if "template" in cond:
            hit = self.find(cond)
            if hit:
                self.last_match = hit
                return True
            return False
        raise ConfigError(f"Bedingung ohne bekannten Schlüssel: {cond!r}")

    def find(self, spec: Dict[str, Any], screen: Optional[Image] = None):
        screen = screen or self.screen
        if screen is None:
            screen = self.capture()
        if "*" in spec["template"]:  # Muster: bester Treffer aus allen Dateien
            bester = None
            for name in self.cfg.template_gruppe(spec["template"]):
                einzeln = dict(spec, template=name)
                hit = self.find(einzeln, screen)
                if hit and (bester is None or hit.score > bester.score):
                    bester = hit
            return bester
        tpl = self.cfg.template(spec["template"], optional=bool(spec.get("optional")))
        if tpl is None:  # noch nicht geschnitten – Schritt überspringen
            if spec["template"] not in self._gemeldet_fehlend:
                self._gemeldet_fehlend.add(spec["template"])
                self.log.debug("Template fehlt noch (optional)", template=spec["template"])
            return None
        schwelle = float(spec.get("threshold", self.cfg.default_threshold))
        bester = matcher.best_score(
            screen,
            tpl,
            region=spec.get("region"),
            scale=self._scale if self._scale is not None else 1.0,
        )
        wert = bester.score if bester else -1.0
        getroffen = bester is not None and wert >= schwelle
        # Jeder Vergleich wird protokolliert – daraus lernt `bot.py lernen`.
        self.log.datenpunkt(
            ev="vergleich", template=spec["template"],
            score=round(wert, 4), schwelle=schwelle, treffer=getroffen,
        )
        return bester if getroffen else None

    # ----------------------------------------------------------------- Aktionen
    def run_actions(self, actions: Sequence[Any], where: str = "") -> None:
        for action in actions:
            if not isinstance(action, dict) or len(action) != 1:
                raise ConfigError(f"{where}: Aktion muss genau einen Schlüssel haben: {action!r}")
            key, value = next(iter(action.items()))
            self._run_action(key, value, where)

    def _run_action(self, key: str, value: Any, where: str) -> None:
        if key == "sleep":
            self._do_sleep(value)
        elif key == "log":
            self.log.info(str(value), quelle=where)
        elif key == "tap_match":
            self._tap_match(value if isinstance(value, dict) else {})
        elif key == "tap_template":
            self._tap_template(value if isinstance(value, dict) else {"template": value})
        elif key == "tap":
            self._tap_point(value)
        elif key == "tap_first":
            self._tap_first(value)
        elif key == "type_text":
            self._type_text(value)
        elif key == "swipe":
            self._swipe(value)
        elif key == "drag":
            self._swipe(value, ziehen=True)
        elif key in ("key", "back"):
            code = "KEYCODE_BACK" if key == "back" else str(value)
            self.dev.key(code)
            self.log.debug("Taste", code=code)
        elif key == "wait_template":
            self._wait_template(value if isinstance(value, dict) else {"template": value})
        elif key == "start_app":
            self.dev.start_app(self.cfg.package, self.cfg.activity)
            self.log.info("App gestartet", paket=self.cfg.package)
        elif key == "stop_app":
            self.dev.stop_app(self.cfg.package)
            self.log.info("App beendet", paket=self.cfg.package)
        elif key == "restart_app":
            self.dev.stop_app(self.cfg.package)
            self._do_sleep(3)
            self.dev.start_app(self.cfg.package, self.cfg.activity)
            self.log.warn("App neu gestartet", paket=self.cfg.package)
            self._do_sleep(value if isinstance(value, (int, float, list)) else 20)
        elif key == "screenshot":
            path = self.save_shot(str(value) if value else "shot")
            self.log.info("Screenshot gespeichert", datei=path)
        elif key == "lerne_objekte":
            self._lerne_objekte(value if isinstance(value, dict) else {})
        elif key == "wenn":
            self._wenn(value, where)
        elif key == "repeat":
            times = int(value.get("times", 1))
            for _ in range(max(0, times)):
                self.run_actions(value.get("do", []), f"{where}>repeat")
        elif key == "run_task":
            task = next((t for t in self.cfg.tasks if t.name == value), None)
            if task is None:
                raise ConfigError(f"{where}: Aufgabe '{value}' gibt es nicht")
            self.run_actions(task.do, f"Aufgabe '{task.name}'")
        elif key == "stop":
            raise StopRun(str(value) if value not in (True, None) else "Aktion 'stop'")
        else:
            raise ConfigError(f"{where}: unbekannte Aktion '{key}'")

    # ------------------------------------------------------- einzelne Aktionen
    def _do_sleep(self, value: Any) -> None:
        if isinstance(value, (list, tuple)) and len(value) >= 2:
            self._sleep(self.rng.uniform(float(value[0]), float(value[1])))
        else:
            self._sleep(float(value))

    def _tap_match(self, spec: Dict[str, Any]) -> None:
        if self.last_match is None:
            self.log.warn("tap_match ohne vorherigen Treffer – übersprungen")
            return
        m = self.last_match
        cx, cy = m.center
        if spec.get("jitter", True):
            cx, cy = human_point(cx, cy, m.w, m.h)
        if spec.get("offset"):
            # z. B. vom roten Punkt auf den Knopf darunter zielen
            dx, dy = spec["offset"]
            screen = self.screen
            if screen is not None:
                cx += int(round(dx * screen.width)) if abs(dx) <= 1 else int(dx)
                cy += int(round(dy * screen.height)) if abs(dy) <= 1 else int(dy)
        self._tap_abs(cx, cy, f"Treffer {m.score:.2f}")

    def _tap_template(self, spec: Dict[str, Any]) -> None:
        self.capture()  # frisches Bild – der Bildschirm hat sich seit der Regel geändert
        hit = self.find(spec)
        if hit is None:
            if spec.get("optional", False):
                self.log.debug("tap_template: nicht gefunden (optional)", template=spec.get("template"))
                return
            self.log.warn("tap_template: nicht gefunden", template=spec.get("template"))
            self.bump("miss")
            return
        self.last_match = hit
        cx, cy = hit.center
        if spec.get("jitter", True):
            cx, cy = human_point(cx, cy, hit.w, hit.h)
        self._tap_abs(cx, cy, spec.get("template", ""))
        if "after" in spec:
            self._do_sleep(spec["after"])

    def _lerne_objekte(self, spec: Dict[str, Any]) -> None:
        """Neue Sammel-Objekte selbst entdecken – über das, was sich bewegt.

        Ertrags-Blasen tauchen auf und verschwinden wieder; der übrige Bildschirm
        steht still. Zwei Aufnahmen im Abstand von ein paar Sekunden zeigen also
        genau dort Unterschiede, wo etwas Einsammelbares ist. Die Ausschnitte
        landen als Vorlagen im Ordner und werden von der passenden Regel per
        Muster sofort mitbenutzt.
        """
        ordner = spec.get("ordner", "gelernt/blasen")
        min_kante = int(spec.get("min_kante", 60))
        max_kante = int(spec.get("max_kante", 220))
        grenze = int(spec.get("max_dateien", 24))
        pause = float(spec.get("pause", 4.0))

        vorher = self.capture()
        self._sleep(pause)
        nachher = self.capture()
        kisten = _veraenderte_bereiche(vorher, nachher, min_kante, max_kante)
        if not kisten:
            self.log.debug("Nichts Neues entdeckt")
            return

        ziel = os.path.join(self.cfg.root, self.cfg.templates_dir, *ordner.split("/"))
        os.makedirs(ziel, exist_ok=True)
        vorhanden = sorted(f for f in os.listdir(ziel) if f.endswith(".png"))
        neu = 0
        for x0, y0, x1, y1 in kisten:
            if len(vorhanden) + neu >= grenze:
                break
            ausschnitt = vorher.crop(x0, y0, x1 - x0, y1 - y0)
            if _schon_bekannt(ausschnitt, ziel):
                continue
            name = f"{len(vorhanden) + neu:02d}.png"
            ausschnitt.save(os.path.join(ziel, name))
            neu += 1
            self.log.info(
                "Neues Objekt gelernt", datei=f"{ordner}/{name}",
                groesse=f"{x1 - x0}x{y1 - y0}", bei=(x0, y0),
            )
        if neu:
            self.bump("gelernt")

    def _wenn(self, spec: Dict[str, Any], where: str) -> None:
        """Verzweigung mitten in einer Aufgabe – daraus wird echte Entscheidung."""
        screen = self.capture()
        treffer = self.evaluate(spec.get("match", {"always": False}), screen)
        zweig = "dann" if treffer else "sonst"
        self.log.debug(f"wenn → {zweig}", quelle=where)
        self.run_actions(spec.get(zweig, []), f"{where}>{zweig}")

    def _tap_first(self, spec: Dict[str, Any]) -> None:
        """Erstes passendes Template antippen, sonst den Ersatz-Punkt."""
        self.capture()
        for cand in spec.get("of", []):
            if isinstance(cand, str):
                cand = {"template": cand, "optional": True}
            cand.setdefault("optional", True)
            hit = self.find(cand)
            if hit:
                self.last_match = hit
                cx, cy = human_point(*hit.center, hit.w, hit.h)
                self._tap_abs(cx, cy, cand.get("template", ""))
                if "after" in spec:
                    self._do_sleep(spec["after"])
                return
        fallback = spec.get("fallback")
        if fallback:
            self.log.debug("tap_first: Ersatz-Punkt", punkt=fallback)
            self._tap_point(fallback)
            if "after" in spec:
                self._do_sleep(spec["after"])
        else:
            self.log.warn("tap_first: nichts gefunden und kein Ersatz-Punkt")
            self.bump("miss")

    def _type_text(self, value: Any) -> None:
        """Text tippen – fest vorgegeben oder abwechselnd aus einem Text-Topf."""
        if isinstance(value, str):
            text = value
        elif isinstance(value, dict) and value.get("text"):
            text = str(value["text"])
        elif isinstance(value, dict) and value.get("pool"):
            pool = self.cfg.texte.get(value["pool"], [])
            if not pool:
                self.log.warn("Text-Topf ist leer – nichts getippt", topf=value["pool"])
                return
            choices = [t for t in pool if t != self._last_text.get(value["pool"])] or pool
            text = self.rng.choice(choices)
            self._last_text[value["pool"]] = text
        else:
            self.log.warn("type_text: weder 'text' noch 'pool' angegeben")
            return
        self.dev.type_text(text)
        self.bump("nachrichten")
        self.log.info(f"⌨ getippt: {text}")

    def _tap_point(self, value: Any) -> None:
        screen = self.screen or self.capture()
        # Liste von Punkten? Einen zufaellig nehmen - so trifft man auch dann
        # freies Gelaende, wenn an einer Stelle gerade ein Gebaeude steht.
        if value and isinstance(value[0], (list, tuple)):
            value = self.rng.choice(list(value))
        x, y = value[0], value[1]
        px = int(round(x * screen.width)) if abs(x) <= 1.0 else int(x)
        py = int(round(y * screen.height)) if abs(y) <= 1.0 else int(y)
        px, py = human_point(px, py, max(6, screen.width // 60), max(6, screen.height // 120))
        self._tap_abs(px, py, "Punkt")

    def _tap_abs(self, x: int, y: int, why: str) -> None:
        screen = self.screen
        if screen is not None:
            x = max(0, min(x, screen.width - 1))
            y = max(0, min(y, screen.height - 1))
            verbot = self._tabu_treffer(x, y, screen)
            if verbot is not None:
                self.log.warn(
                    "Tipp in Tabu-Zone blockiert (Shop/Echtgeld)",
                    x=x, y=y, zone=verbot, grund=why,
                )
                self.bump("tabu-blockiert")
                return
        self.dev.tap(x, y)
        self.bump("taps")
        self.log.debug("Tipp", x=x, y=y, grund=why)

    def _tabu_treffer(self, x: int, y: int, screen: Image):
        """Liegt der Punkt in einer gesperrten Zone (Shop, Diamanten, Angebote)?"""
        for i, zone in enumerate(self.cfg.tabu_regionen):
            l, t, r, b = matcher.resolve_region(zone, screen.width, screen.height)
            if l <= x < r and t <= y < b:
                return self.cfg.tabu_namen[i] if i < len(self.cfg.tabu_namen) else str(zone)
        return None

    def _swipe(self, value: Sequence[float], ziehen: bool = False) -> None:
        screen = self.screen or self.capture()

        def px(v, size):
            return int(round(v * size)) if abs(v) <= 1.0 else int(v)

        x1 = px(value[0], screen.width)
        y1 = px(value[1], screen.height)
        x2 = px(value[2], screen.width)
        y2 = px(value[3], screen.height)
        ms = int(value[4]) if len(value) > 4 else (1200 if ziehen else 320)
        if ziehen:
            self.dev.drag(x1, y1, x2, y2, ms)
            self.bump("drags")
            self.log.debug("Ziehen", von=(x1, y1), nach=(x2, y2), ms=ms)
        else:
            self.dev.swipe(x1, y1, x2, y2, ms)
            self.bump("swipes")
            self.log.debug("Wisch", von=(x1, y1), nach=(x2, y2))

    def _wait_template(self, spec: Dict[str, Any]) -> None:
        timeout = float(spec.get("timeout", 15))
        interval = float(spec.get("interval", 1.0))
        deadline = self._clock() + timeout
        while True:
            self.capture()
            hit = self.find(spec)
            if hit:
                self.last_match = hit
                self.log.debug("gefunden", template=spec.get("template"), score=round(hit.score, 3))
                if spec.get("tap", False):
                    cx, cy = human_point(*hit.center, hit.w, hit.h)
                    self._tap_abs(cx, cy, spec.get("template", ""))
                return
            if self._clock() >= deadline:
                self.log.warn("Timeout beim Warten", template=spec.get("template"), sekunden=timeout)
                self.bump("timeout")
                if spec.get("required", False):
                    raise StopRun(f"Pflicht-Template '{spec.get('template')}' nicht erschienen")
                return
            self._sleep(interval)

    # ------------------------------------------------------------------ Schleife
    def _due_task(self) -> Optional[Task]:
        now = self._clock()
        due = [
            t
            for t in self.cfg.tasks
            if t.enabled
            and t.name in self._task_due
            and self._task_due[t.name] <= now
            and self._im_zeitfenster(t)
        ]
        if not due:
            return None
        due.sort(key=lambda t: -t.priority)
        return due[0]

    def _try_rules(self, screen: Image, min_priority: Optional[int] = None) -> bool:
        """Erste passende Regel ausführen. Gibt True zurück, wenn eine gegriffen hat."""
        for rule in self.cfg.rules:
            if min_priority is not None and rule.priority < min_priority:
                continue
            if not rule.enabled or rule.name in self._rule_done:
                continue
            if rule.cooldown and self._clock() - self._rule_last.get(rule.name, -1e9) < rule.cooldown:
                continue
            if not self.evaluate(rule.match, screen):
                continue
            self._rule_last[rule.name] = self._clock()
            if rule.once:
                self._rule_done.add(rule.name)
            self.unknown_streak = 0
            self.bump(f"rule:{rule.name}")
            score = f" ({self.last_match.score:.2f})" if self.last_match else ""
            self.log.info(f"✓ {rule.name}{score}")
            self.run_actions(rule.do, f"Regel '{rule.name}'")
            return True
        return False

    def _im_zeitfenster(self, task: Task) -> bool:
        """Wochentage/Stunden pruefen – z. B. Schilde nur am Wochenende."""
        if not task.wochentage and not task.stunden:
            return True
        jetzt = time.localtime()
        if task.wochentage and jetzt.tm_wday not in task.wochentage:
            return False
        if task.stunden:
            if not any(a <= jetzt.tm_hour <= b for a, b in task.stunden):
                return False
        return True

    def step(self) -> bool:
        """Ein Durchlauf. Gibt False zurück, wenn der Bot stoppen soll."""
        if self.stop_file and os.path.exists(self.stop_file):
            self.log.info("Stopp-Datei gefunden – Bot beendet sich", datei=self.stop_file)
            return False

        self.steps += 1
        screen = self.capture()
        self._track_change(screen)

        # Dringende Regeln (Belohnung sichtbar, Dialog im Weg) schlagen jede Aufgabe.
        if self._try_rules(screen, min_priority=self.cfg.regel_vorrang):
            return True

        task = self._due_task()
        if task is not None:
            self._task_due[task.name] = self._clock() + task.every
            self._letzter_lauf[task.name] = self._now()
            self._zustand_sichern()
            self.log.info(f"▶ Aufgabe: {task.name}")
            self.bump(f"task:{task.name}")
            vorher = self.stats.get("taps", 0)
            self.run_actions(task.do, f"Aufgabe '{task.name}'")
            # Wie viel hat die Aufgabe bewirkt? Daraus laesst sich der Takt
            # spaeter datengestuetzt nachziehen statt zu raten.
            self.log.datenpunkt(
                ev="aufgabe", aufgabe=task.name,
                tipps=self.stats.get("taps", 0) - vorher,
            )
            return True

        if self._try_rules(screen):
            return True

        self.unknown_streak += 1
        self.bump("unbekannt")
        self.log.debug("Kein Treffer", serie=self.unknown_streak)
        if self.cfg.on_unknown and self.unknown_streak in (5, 15, 45):
            self.log.warn("Unbekannter Bildschirm – on_unknown läuft", serie=self.unknown_streak)
            self.run_actions(self.cfg.on_unknown, "on_unknown")
        return True

    def _track_change(self, screen: Image) -> None:
        if self._last_frame is not None and screen.diff_ratio(self._last_frame) > 0.01:
            self._last_change = self._clock()
        elif self._last_frame is None:
            self._last_change = self._clock()
        self._last_frame = screen

        stalled = self._clock() - self._last_change
        if self.cfg.stuck_seconds and stalled > self.cfg.stuck_seconds:
            self.log.warn("Bild bewegt sich nicht mehr", sekunden=int(stalled))
            self.bump("stuck")
            self.save_shot("stuck")
            self._last_change = self._clock()
            if self.cfg.on_stuck:
                self.run_actions(self.cfg.on_stuck, "on_stuck")

    def run(self, max_seconds: Optional[float] = None, max_steps: Optional[int] = None) -> Dict[str, int]:
        start = self._clock()
        low, high = self.cfg.loop_delay
        try:
            while True:
                if max_steps is not None and self.steps >= max_steps:
                    self.log.info("Schritt-Limit erreicht", schritte=self.steps)
                    break
                if max_seconds is not None and self._clock() - start >= max_seconds:
                    self.log.info("Laufzeit-Limit erreicht", sekunden=int(max_seconds))
                    break
                if not self.step():
                    break
                self._sleep(self.rng.uniform(low, high))
        except StopRun as exc:
            self.log.info(f"Gestoppt: {exc}")
        except KeyboardInterrupt:  # pragma: no cover - interaktiv
            self.log.info("Abbruch per Tastatur")
        return self.stats

    def summary(self) -> str:
        if not self.stats:
            return "keine Aktivität"
        parts = [f"{k}={v}" for k, v in sorted(self.stats.items(), key=lambda kv: -kv[1])]
        return f"Schritte={self.steps} " + " ".join(parts)
