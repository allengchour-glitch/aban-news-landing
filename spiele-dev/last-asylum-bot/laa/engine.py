"""Die Bot-Schleife: Bildschirm ansehen → passende Regel finden → Aktionen ausführen."""

from __future__ import annotations

import calendar
import json
import os
import random
import time
from typing import Any, Dict, List, Optional, Sequence

from . import matcher, zahlen
from .adb import Device, human_point
from .config import Config, ConfigError, Task
from .image import Image
from .log import Logger


def _veraenderte_bereiche(a: Image, b: Image, min_kante: int, max_kante: int,
                         seiten=(0.75, 1.35)):
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
            if not (seiten[0] <= breite / float(hoehe) <= seiten[1]):
                # Ertrags-Blasen sind rund. Ohne diese Schranke lernt der Bot
                # Laufschriften mit: am 31.07. eine 96x144 grosse Chatzeile.
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
        self.gleiche_ansicht = 0
        self._ansicht_letzte: Optional[bytes] = None
        self._finger_jetzt: Optional[bytes] = None
        self._regel_finger: Dict[str, tuple] = {}
        self._regel_pause: Dict[str, float] = {}
        self._regel_zeiten: Dict[str, list] = {}
        self._geduld: Dict[str, tuple] = {}   # Regel -> (seit, zuletzt)
        self._ansichten_datei = (
            os.path.join(os.path.dirname(os.path.abspath(state_file)), "ansichten.json")
            if state_file else None
        )
        self._ansichten: Dict[str, str] = {}
        self._bild_finger: Optional[bytes] = None
        self._offene_pruefung: Optional[tuple] = None
        self._folgenlos: Dict[str, int] = {}   # Vorlage -> Tipps ohne jede Wirkung
        self._verworfen: set = set()           # aussortiert - nicht mehr suchen
        self._auswege_datei = (
            os.path.join(os.path.dirname(os.path.abspath(state_file)), "auswege.json")
            if state_file else None
        )
        self._auswege: Dict[str, Any] = {}
        self._erkundung_datei = (
            os.path.join(os.path.dirname(os.path.abspath(state_file)), "erkundung.json")
            if state_file else None
        )
        self._erkundet: Dict[str, list] = {}
        self._gelernt_datei = (
            os.path.join(os.path.dirname(os.path.abspath(state_file)), "gelernt.json")
            if state_file else None
        )
        self._wirksam: Dict[str, int] = {}     # Vorlage -> Tipps, nach denen sich etwas tat

        self._rule_last: Dict[str, float] = {}
        self._rule_done = set()
        self._task_due: Dict[str, float] = {}
        self._last_text: Dict[str, str] = {}
        self._gemeldet_fehlend = set()
        self._tipp_verlauf: List[tuple] = []
        # Waehrend Ausweg-Suche und Erkundung gilt die Wirkungslos-Bremse nicht:
        # auf einem festgefahrenen Bildschirm ruehrt sich per Definition nichts,
        # und genau dann wuerde die Bremse den Fluchtweg stumm legen.
        self._auf_der_flucht = False
        self._in_zwischenpruefung = False
        self._schwarz_gemeldet = False
        self._last_frame: Optional[Image] = None
        self._last_change = clock()
        self._scale: Optional[float] = None
        self._knapp: Dict[str, int] = {}          # Vorlage -> Fehlgriffe am Stueck
        # Vorlage -> (gesucht, getroffen, bester je erreichter Wert)
        self._vorlagen_zaehler: Dict[str, tuple] = {}
        self._ziffern_cache: Optional[Dict[str, Dict[str, Image]]] = None
        self._nachjustiert: Dict[str, int] = {}   # Vorlage -> wie oft schon vermessen

        # Standardmaessig aus: Tests und Replays sollen sich nichts merken.
        # Der Dauerbetrieb setzt die Datei ueber bot.py.
        self.state_file = state_file
        self._now = now
        self._letzter_lauf: Dict[str, float] = self._zustand_laden()
        self._auswege = self._auswege_laden()
        self._ansichten = self._ansichten_laden()
        self._erkundet = self._erkundung_laden()
        self._gelerntes_anwenden()

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
        if self.screen.ist_einfarbig() and not self._schwarz_gemeldet:
            self._schwarz_gemeldet = True
            self.log.error(
                "Der Bildschirm kommt LEER an - der Bot sieht nichts. "
                "Bei BlueStacks: Einstellungen -> Grafik -> Renderer auf DirectX bzw. OpenGL "
                "umstellen und 'Erweiterter Grafikmodus' ausschalten, dann neu starten. "
                "Pruefen mit: bot.py capture -o shots\\test.png"
            )
        elif not self.screen.ist_einfarbig():
            self._schwarz_gemeldet = False
        if self._offene_pruefung is not None:
            name, vorher = self._offene_pruefung
            self._offene_pruefung = None
            if self._ansicht_finger(self.screen) == vorher:
                self._folgenlos[name] = self._folgenlos.get(name, 0) + 1
                self._pruefe_verdacht(name)
            else:
                self._wirksam[name] = self._wirksam.get(name, 0) + 1
                self._folgenlos[name] = 0
        if self._scale is None:
            self._scale = self.cfg.scale_for(self.screen.width)
            if abs(self._scale - 1.0) > 0.01:
                self.log.info(
                    "Templates werden skaliert",
                    faktor=round(self._scale, 3),
                    bildbreite=self.screen.width,
                )
        return self.screen

    VERDACHT_AB = 5  # so viele folgenlose Tipps, dann stimmt die Vorlage nicht

    def _pruefe_verdacht(self, name: str) -> None:
        """Eine Vorlage, die nie etwas ausloest, zeigt auf das falsche Ding.

        Selbst gelernte wandern dann nach 'gelernt/verworfen'. Von Hand
        geschnittene bleiben liegen - die darf der Bot nicht einfach
        wegraeumen -, werden aber im Selbstbericht benannt.
        """
        if self._folgenlos.get(name, 0) < self.VERDACHT_AB or self._wirksam.get(name):
            return
        self._folgenlos[name] = 0
        if not name.startswith("gelernt/"):
            self.bump("vorlage-verdaechtig")
            self.log.warn(
                f"Vorlage trifft, bewirkt aber nie etwas: {name}",
                hinweis="zeigt vermutlich auf das falsche Bild - neu schneiden",
            )
            return
        ziel = os.path.join(self.cfg.root, self.cfg.templates_dir, "gelernt", "verworfen")
        try:
            os.makedirs(ziel, exist_ok=True)
            quelle = self.cfg.template_path(name)
            os.replace(quelle, os.path.join(ziel, os.path.basename(quelle)))
            self.cfg._templates.pop(name, None)
            self._verworfen.add(name)
            self.bump("gelerntes-verworfen")
            self.log.warn(f"Selbst gelernte Vorlage bewirkt nichts - aussortiert: {name}")
        except OSError as exc:  # pragma: no cover - Dateisystem
            self.log.warn(f"Vorlage nicht verschiebbar: {exc}")

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
        if "zahl" in cond:
            # Bedingung auf eine gelesene Zahl: {"zahl": {"region": [...],
            # "mindestens": 20}}. Fehlen die Ziffern-Vorlagen oder ist an der
            # Stelle nichts zu lesen, gilt die Bedingung als NICHT erfuellt -
            # eine Regel, die eine Menge voraussetzt, darf nicht losgehen, nur
            # weil der Bot die Menge nicht kennt.
            spec = cond["zahl"]
            wert = self.lies_zahl(spec)
            if wert is None:
                return False
            if "mindestens" in spec and wert < float(spec["mindestens"]):
                return False
            if "hoechstens" in spec and wert > float(spec["hoechstens"]):
                return False
            return True
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
        if "app_im_vordergrund" in cond:
            # Laeuft das Spiel ueberhaupt noch? Ohne diese Pruefung tippt der
            # Bot stundenlang auf einen Startbildschirm des Emulators.
            erwartet = bool(cond["app_im_vordergrund"])
            try:
                vorn = self.dev.current_package()
            except Exception as exc:
                self.log.debug(f"Vordergrund-App nicht abfragbar: {exc}")
                return erwartet  # im Zweifel nichts anfassen
            passt = bool(self.cfg.package) and self.cfg.package in vorn
            if not passt:
                self.log.debug("Andere App im Vordergrund", app=vorn.strip()[:60])
            return passt if erwartet else not passt
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
        name = spec["template"]
        if name in self._verworfen:
            # Aussortiert - und die Datei liegt nicht mehr da. Ohne diesen
            # Riegel bricht die naechste Suche mit "Template fehlt" ab.
            return None
        tpl = self.cfg.template(name, optional=bool(spec.get("optional")))
        if tpl is None:  # noch nicht geschnitten – Schritt überspringen
            if name not in self._gemeldet_fehlend:
                self._gemeldet_fehlend.add(name)
                self.log.debug("Template fehlt noch (optional)", template=name)
            return None
        schwelle = float(spec.get("threshold", self.cfg.default_threshold))
        eigen = float(self.cfg.template_skalen.get(name, 1.0))
        bester = matcher.best_score(
            screen,
            tpl,
            region=spec.get("region"),
            scale=(self._scale if self._scale is not None else 1.0) * eigen,
        )
        wert = bester.score if bester else -1.0
        getroffen = bester is not None and wert >= schwelle
        # Jeder Vergleich wird protokolliert – daraus lernt `bot.py lernen`.
        self.log.datenpunkt(
            ev="vergleich", template=name,
            score=round(wert, 4), schwelle=schwelle, treffer=getroffen,
        )
        # Mitzaehlen, wie oft eine Vorlage gesucht wurde und wie oft sie traf.
        # Ein Spiel-Update zeichnet Knoepfe neu; eine Vorlage, die frueher
        # zuverlaessig traf und jetzt hundertmal hintereinander danebenliegt,
        # ist veraltet - nicht fehlend. Ohne diese Zaehlung sieht das niemand:
        # der Bot ueberspringt den Schritt einfach still.
        # Kleinster Treffer und groesster Fehlschlag getrennt: nur aus diesen
        # beiden Zahlen laesst sich eine Schwelle begruenden. Liegen sie weit
        # auseinander, steht die Schwelle sicher; beruehren sie sich, ist die
        # Vorlage nicht trennscharf - und ein Nachjustieren waere geraten.
        gesucht, traf, bestwert, kleinster, groesster = self._vorlagen_zaehler.get(
            name, (0, 0, 0.0, 1.0, 0.0))
        self._vorlagen_zaehler[name] = (
            gesucht + 1,
            traf + (1 if getroffen else 0),
            max(bestwert, wert),
            min(kleinster, wert) if getroffen else kleinster,
            groesster if getroffen else max(groesster, wert),
        )
        if getroffen:
            self._knapp.pop(name, None)
            return bester
        # Wer nie trifft, hat meist die falsche Groesse - nicht die falsche
        # Stelle. Nach ein paar Fehlgriffen misst der Bot diese eine Vorlage
        # selbst nach, statt sie dauerhaft zu verfehlen.
        self._knapp[name] = self._knapp.get(name, 0) + 1
        if self._knapp[name] >= self.FEHLGRIFFE_BIS_NACHMESSEN:
            self._knapp[name] = 0
            if self._nachjustiert.get(name, 0) < self.MAX_NACHMESSEN:
                self._nachjustiert[name] = self._nachjustiert.get(name, 0) + 1
                if self._nachjustieren(name, tpl, screen, schwelle, wert):
                    return self.find(spec, screen)
        return None

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
        elif key == "tap_alle":
            self._tap_alle(value if isinstance(value, dict) else {"template": value})
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
        elif key == "kalibriere":
            self._kalibriere(value if isinstance(value, dict) else {})
        elif key == "optimiere_takte":
            self._optimiere_takte(value if isinstance(value, dict) else {})
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
        elif key == "selbstbericht":
            self._selbstbericht(value if isinstance(value, dict) else {})
        elif key == "selbst_aktualisieren":
            self._selbst_aktualisieren(value if isinstance(value, dict) else {})
        elif key == "ansicht_sammeln":
            self._ansicht_sammeln(value if isinstance(value, dict) else {})
        elif key == "ausschnitt":
            self._ausschnitt(value if isinstance(value, dict) else {})
        elif key == "lebenszeichen":
            self._lebenszeichen(value if isinstance(value, dict) else {})
        elif key == "stop":
            raise StopRun(str(value) if value not in (True, None) else "Aktion 'stop'")
        else:
            raise ConfigError(f"{where}: unbekannte Aktion '{key}'")

    # ------------------------------------------------------- einzelne Aktionen
    # Regeln ab dieser Prioritaet duerfen eine laufende Aufgabe unterbrechen.
    # Eine Versammlung steht nur etwa eine Minute offen; eine Aufgabe wie
    # 'monster-jagen' laeuft mit ihren Wartezeiten aber mehrere Minuten am
    # Stueck. Ohne Unterbrechung kaeme der Bot regelmaessig zu spaet - und
    # gerade das Beitreten ist die ergiebigste Art zu kaempfen.
    DRINGEND_AB = 200
    VERLAUF_HALTBARKEIT = 90.0  # so lange gilt ein "hat nichts bewirkt"
    ZWISCHENPRUEFUNG_AB = 0.8   # erst ab dieser Wartezeit lohnt das Nachsehen

    def _do_sleep(self, value: Any) -> None:
        if isinstance(value, (list, tuple)) and len(value) >= 2:
            dauer = self.rng.uniform(float(value[0]), float(value[1]))
        else:
            dauer = float(value)
        # Ein Regler fuer alle 186 Wartepunkte. Die Untergrenze gilt nur fuer
        # Wartezeiten, die ueberhaupt eine waren - eine bewusste Null bleibt
        # null, sonst wuerde jeder Schritt kuenstlich gebremst.
        tempo = float(getattr(self.cfg, "tempo", 1.0) or 1.0)
        if tempo != 1.0 and dauer > 0:
            unten = float(getattr(self.cfg, "tempo_untergrenze", 0.35))
            dauer = max(min(dauer, unten), dauer * tempo)
        # Lange Wartezeiten aufteilen und dazwischen nach dringenden Regeln
        # sehen. Sonst verschlaeft der Bot alles, was waehrend einer Aufgabe
        # passiert.
        #
        # ACHTUNG, Wechselwirkung: die Schranke greift auf die BEREITS
        # gestauchte Dauer. Mit tempo 0.55 faellt eine 2.5-Sekunden-Wartezeit
        # auf 1.4 - waere die Schranke bei 1.5 geblieben, haette ausgerechnet
        # das schnellere Tempo die Versammlungs-Reaktion abgeschaltet. Darum
        # 0.8: schneller heisst oefter nachsehen, nicht seltener.
        if dauer < self.ZWISCHENPRUEFUNG_AB or self._in_zwischenpruefung:
            self._sleep(dauer)
            return
        haelfte = dauer / 2.0
        self._sleep(haelfte)
        self._zwischenpruefung()
        self._sleep(haelfte)

    def _zwischenpruefung(self) -> None:
        """Waehrend einer Wartezeit kurz nach dringenden Regeln sehen.

        Nur Regeln ab DRINGEND_AB, und nur eine je Wartezeit: das kostet einen
        Bildschirm und ein paar Zehntel, verhindert aber, dass eine Versammlung
        oder ein Angriffs-Hinweis minutenlang unbemerkt bleibt.

        Der Schalter verhindert Verschachtelung - sonst koennte die gepruefte
        Regel selbst wieder warten und dabei erneut pruefen.
        """
        self._in_zwischenpruefung = True
        try:
            screen = self.capture()
            if self._try_rules(screen, min_priority=self.DRINGEND_AB):
                self.bump("zwischendurch-gehandelt")
        except Exception as exc:  # pragma: no cover - Geraet
            self.log.debug("Zwischenpruefung uebersprungen", grund=str(exc)[:120])
        finally:
            self._in_zwischenpruefung = False

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

    def _tap_alle(self, spec: Dict[str, Any]) -> None:
        """Jeden Treffer antippen, nicht nur den besten.

        Auf einem Bildschirm liegen meist mehrere Ertrags-Blasen gleichzeitig.
        `tap_template` nimmt davon nur eine - der Rest bleibt liegen, bis die
        Regel das naechste Mal greift. Hier wird alles abgeraeumt, was da ist,
        und danach noch einmal nachgesehen: durch das Einsammeln rutscht die
        Ansicht manchmal nach, und dann liegt schon die naechste Blase da.
        """
        runden = int(spec.get("runden", 2))
        grenze = int(spec.get("hoechstens", 12))
        pause = spec.get("zwischen", [0.35, 0.6])
        farbe = spec.get("farbknopf")
        muster = spec.get("template") or f"farbe {farbe.get('rgb') if farbe else '?'}"
        # Der Rand gehoert der festen Bedienung: rechts Allianz/Nachricht/
        # Tasche, links die Symbolspalte. Was dort liegt, ist kein Ertrag.
        rand_links, rand_rechts = spec.get("nur_x", [0.0, 1.0])
        getippt = 0
        for runde in range(runden):
            screen = self.capture()
            treffer = []
            if farbe is not None:
                treffer.extend(matcher.find_color_button(
                    screen, farbe.get("rgb", (195, 200, 207)),
                    tolerance=int(farbe.get("tolerance", 30)),
                    min_w=float(farbe.get("min_w", 0.03)),
                    max_w=float(farbe.get("max_w", 0.12)),
                    min_h=float(farbe.get("min_h", 0.012)),
                    max_h=float(farbe.get("max_h", 0.05)),
                    region=spec.get("region"),
                    min_fuellung=float(farbe.get("min_fuellung", 0.45)),
                    limit=grenze,
                ))
            namen = ([] if farbe is not None else
                     (self.cfg.template_gruppe(muster) if "*" in muster else [muster]))
            for name in namen:
                tpl = self.cfg.template(name, optional=True)
                if tpl is None:
                    continue
                treffer.extend(matcher.find_all(
                    screen, tpl,
                    threshold=float(spec.get("threshold", self.cfg.default_threshold)),
                    region=spec.get("region"),
                    scale=self.cfg.scale_for_template(name, screen.width),
                    limit=grenze,
                ))
            if not treffer:
                if runde == 0 and not spec.get("optional", True):
                    self.log.warn("tap_alle: nichts gefunden", template=muster)
                break
            # Von oben nach unten abraeumen - so verdeckt nichts das Naechste.
            treffer.sort(key=lambda h: (h.y, h.x))
            gesetzt: List[tuple] = []
            for hit in treffer[:grenze]:
                cx, cy = hit.center
                rx = cx / float(screen.width)
                if not (rand_links <= rx <= rand_rechts):
                    continue
                # Zwei Vorlagen finden oft dieselbe Blase; doppelt tippen bringt nichts.
                if any(abs(cx - px) < hit.w and abs(cy - py) < hit.h for px, py in gesetzt):
                    continue
                gesetzt.append((cx, cy))
                jx, jy = human_point(cx, cy, hit.w, hit.h)
                self._tap_abs(jx, jy, muster)
                getippt += 1
                self._do_sleep(pause)
        if getippt:
            self.log.info(f"Eingesammelt: {getippt} Stueck", vorlage=muster)

    def _kalibriere(self, spec: Dict[str, Any]) -> None:
        """Den Groessen-Faktor der Oberflaeche selbst bestimmen.

        Das Spiel bemisst seine Oberflaeche an der Bildhoehe, nicht an der
        Breite. In einem flacheren Fenster sind alle Knoepfe kleiner, und samt-
        liche Vorlagen treffen dann nur noch mit 0,3 bis 0,65 statt ueber 0,9.
        Statt jede einzeln neu zu schneiden, wird hier eine Vorlage bei
        verschiedenen Groessen probiert - der Faktor, der am besten trifft,
        gilt danach fuer alle.
        """
        namen = spec.get("templates") or [
            "ui/back_arrow.png", "ui/popup_close.png", "nav/allianz.png",
            "nav/tasche.png", "nav/welt.png", "nav/held.png", "nav/burg.png",
        ]
        schritte = spec.get("faktoren") or [
            0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.10
        ]
        mindest = float(spec.get("mindest_score", 0.86))
        # KEIN frueher Abbruch beim ersten hohen Wert: das unterstellt, dass
        # die Werte bis zum Gipfel steigen. Sie tun es nicht - ein falscher
        # Faktor kann frueh hoch punkten, und der richtige wird dann nie
        # probiert. Zwei bestehende Tests haben genau das aufgedeckt. Die
        # Beschleunigung kommt stattdessen vom verkleinerten Suchbild.
        genug = int(spec.get("genug_belege", 4))
        aussichtslos = float(spec.get("aussichtslos_unter", 0.6))
        verkleinern = float(spec.get("verkleinern", 0.5))
        versuche, hoechster = 0, 0.0
        screen = self.capture()
        if screen.ist_einfarbig():
            return

        basis = screen.width / float(self.cfg.base_width) if self.cfg.base_width else 1.0
        gefunden = []
        for name in namen:
            tpl = self.cfg.template(name, optional=True)
            if tpl is None:
                continue
            # Auf einem VERKLEINERTEN Bild suchen. Die Kalibrierung braucht nur
            # das Groessen-VERHAELTNIS, nicht die Position - und das bleibt beim
            # Verkleinern erhalten. Gemessen an austausch/allianz-geschenk.png: 31.5 s bei
            # voller Groesse, 9.3 s bei halber, gefundener Faktor in beiden
            # Faellen 1.00 (Score 1.000 gegen 0.996). Sehr kleine Vorlagen
            # bleiben aussen vor, von denen bliebe sonst nichts uebrig.
            such_bild, such_tpl = screen, tpl
            # Die Untergrenze muss den KLEINSTEN gesuchten Faktor einrechnen,
            # nicht nur die Vorlagengroesse: gesucht wird Vorlage mal Faktor.
            # Mit Faktor 0.5 und Verkleinerung 0.5 bleibt von einer 80er
            # Vorlage ein 20er Muster - zu wenig fuer einen verlaesslichen
            # Vergleich. Genau daran ist ein bestehender Test haengen
            # geblieben, und der hatte recht.
            kleinste = min(tpl.width, tpl.height) * verkleinern * min(schritte)
            if kleinste >= 28:
                such_bild = screen.box_scaled_by(verkleinern)
                such_tpl = tpl.box_scaled_by(verkleinern)

            # ZWEISTUFIG statt zwoelf Faktoren am Stueck. Vorher liefen immer
            # 7 Vorlagen x 12 Faktoren = 84 volle Suchen - auf dem PC des
            # Nutzers gemessene 39 bis 44 Sekunden, in denen der Bot nichts
            # anderes tut. Erst jede zweite Stufe probieren, dann nur um den
            # Sieger herum nachfahren: gleiche Genauigkeit, halb so viele
            # Suchen.
            grob = schritte[::2] or list(schritte)
            bester, bester_faktor = 0.0, None
            for f in grob:
                hit = matcher.best_score(such_bild, such_tpl, scale=basis * f)
                if hit and hit.score > bester:
                    bester, bester_faktor = hit.score, f
            if bester_faktor is not None:
                stelle = schritte.index(bester_faktor)
                for nachbar in (stelle - 1, stelle + 1):
                    if 0 <= nachbar < len(schritte) and schritte[nachbar] not in grob:
                        hit = matcher.best_score(such_bild, such_tpl,
                                                 scale=basis * schritte[nachbar])
                        if hit and hit.score > bester:
                            bester, bester_faktor = hit.score, schritte[nachbar]
            versuche += 1
            hoechster = max(hoechster, bester)
            if bester >= mindest and bester_faktor:
                gefunden.append((name, bester_faktor, bester))
                # Genug Belege beisammen? Dann reicht es. Der Median aus drei
                # bis vier Vorlagen ist so gut wie der aus sieben.
                if len(gefunden) >= genug:
                    break
            elif not gefunden and versuche >= 3 and hoechster < aussichtslos:
                # Drei Navigations-Vorlagen probiert, keine auch nur in der
                # Naehe: das ist nicht die Stadt, sondern ein Dialog oder ein
                # Vollbild. Weiterzusuchen kostet nur Zeit - im Protokoll des
                # Nutzers 44 Sekunden fuer ein Ergebnis, das von Anfang an
                # feststand ("zu wenig Belege").
                self.log.debug("Kalibrierung: falscher Bildschirm - spaeter erneut",
                               bester=round(hoechster, 3))
                break

        # Ein einziger Beleg ist keine Messung. Auf einem Vollbild wie
        # 'Taegliche Aufgaben' ist von den Navigations-Vorlagen ohnehin keine
        # zu sehen - dann lieber gleich noch einmal versuchen als sechs
        # Stunden lang mit einem Zufallswert weiterarbeiten.
        mindest_belege = int(spec.get("min_belege", 3))
        if len(gefunden) < mindest_belege:
            self.log.info(
                "Kalibrierung: zu wenig Belege im Bild - spaeter erneut",
                belege=len(gefunden), noetig=mindest_belege,
            )
            self._bald_erneut(spec)
            return
        faktoren = sorted(f for _, f, _ in gefunden)
        median = faktoren[len(faktoren) // 2]
        for name, f, score in gefunden:
            self.log.debug("Kalibrierung", template=name, faktor=f, score=round(score, 3))

        # Vorlagen, die deutlich aus der Reihe tanzen, stammen aus einer anderen
        # Aufnahme-Groesse. Statt sie den Median verfaelschen zu lassen, bekommt
        # jede von ihnen ihren eigenen Nachschlag.
        # WICHTIG - hier steckte ein Fehler, der zu falschen Tippstellen fuehrt.
        # Der gemessene Faktor f ist ABSOLUT (die Messung oben laesst den
        # eigenen Nachschlag bewusst weg), gesucht ist aber der Nachschlag
        # RELATIV zum Median. Bisher wurde nur eingetragen, wer diesmal aus der
        # Reihe tanzte. Eine Vorlage, die beim vorigen Mal Ausreisser war und
        # jetzt nicht mehr, behielt ihren alten Nachschlag - und der wurde ab
        # da zusaetzlich zum neuen Median gerechnet. Beispiel: eigen 1.3 aus
        # Lauf 1, in Lauf 2 misst sich dieselbe Vorlage zu 1.0 bei Median 1.0 -
        # gesucht 1.0, gerechnet 1.3. Die Vorlage passt dann 30 % zu gross,
        # trifft daneben, und der Bot tippt an der falschen Stelle.
        #
        # Darum: fuer JEDE gemessene Vorlage neu setzen (oder loeschen, wenn
        # kein Nachschlag noetig ist) und die nicht gemessenen umrechnen,
        # damit ihre absolute Groesse gleich bleibt.
        vorher_skala = self.cfg.ui_skala
        neue_skalen = dict(self.cfg.template_skalen)
        gemessen = {name for name, _, _ in gefunden}
        for name, f, _ in gefunden:
            nachschlag = round(f / median, 3) if median else 1.0
            if abs(nachschlag - 1.0) <= 0.03:
                neue_skalen.pop(name, None)
            else:
                neue_skalen[name] = nachschlag
        if median and vorher_skala and abs(median - vorher_skala) > 0.001:
            # Nicht gemessene Vorlagen: ihr Nachschlag galt gegen den ALTEN
            # Median. Damit sie gleich gross bleiben, mit dem Verhaeltnis
            # nachziehen.
            verhaeltnis = vorher_skala / median
            for name in list(neue_skalen):
                if name in gemessen:
                    continue
                gezogen = round(neue_skalen[name] * verhaeltnis, 3)
                if abs(gezogen - 1.0) <= 0.03:
                    neue_skalen.pop(name, None)
                else:
                    neue_skalen[name] = gezogen

        if neue_skalen != self.cfg.template_skalen:
            entfallen = sorted(set(self.cfg.template_skalen) - set(neue_skalen))
            self.cfg.template_skalen = neue_skalen
            self.log.info(
                "Vorlagen mit eigener Groesse aufgefrischt",
                vorlagen=", ".join(f"{n}={v}" for n, v in sorted(neue_skalen.items())) or "keine",
                entfallen=", ".join(entfallen) or "keine",
            )
            self._config_patch(
                lambda roh: roh.__setitem__("template_skalen", dict(neue_skalen))
            )

        if abs(median - self.cfg.ui_skala) < 0.03:
            self.log.info(f"Kalibrierung bestaetigt: Faktor {median:.2f}",
                          belege=len(gefunden))
            return
        alt = self.cfg.ui_skala
        self.cfg.ui_skala = median
        self._scale = None  # beim naechsten Bild neu bestimmen
        self.log.info(
            f"Groessen-Faktor der Oberflaeche neu bestimmt: {alt:.2f} -> {median:.2f}",
            belege=len(gefunden), templates=", ".join(n for n, _, _ in gefunden),
        )
        self.bump("kalibriert")
        self._skala_sichern(median)

    FEIN_SCHRITTE = [0.55, 0.62, 0.70, 0.78, 0.86, 0.94, 1.00, 1.08, 1.18, 1.30, 1.45, 1.60]
    FEHLGRIFFE_BIS_NACHMESSEN = 3
    MAX_NACHMESSEN = 3  # danach ist die Vorlage schlicht nicht im Bild
    NUR_GROESSE_AB = 0.5  # darunter fehlt die Vorlage, statt nur falsch gross zu sein

    def _nachjustieren(
        self, name: str, tpl: Image, screen: Image, schwelle: float, bisher: float
    ) -> bool:
        """Eine einzelne Vorlage in verschiedenen Groessen probieren.

        Greift, wenn eine Vorlage mehrfach nicht gefunden wurde. Passt eine
        andere Groesse deutlich besser, merkt sich der Bot diesen Nachschlag
        nur fuer diese Vorlage - alle anderen bleiben unberuehrt.
        """
        basis = self._scale if self._scale is not None else 1.0
        bester, bester_faktor = bisher, None
        for f in self.FEIN_SCHRITTE:
            hit = matcher.best_score(screen, tpl, scale=basis * f)
            if hit and hit.score > bester + 0.02:
                bester, bester_faktor = hit.score, f

        # Das Raster springt in Schritten von acht bis zehn Prozent - deutlich
        # gröber, als eine Vorlage es vertraegt. Schon fuenf Prozent daneben
        # kosten spuerbar Punkte, der wahre Gipfel liegt also oft ZWISCHEN zwei
        # Rasterpunkten. Darum um den besten Rasterwert herum noch einmal fein
        # nachfahren: das kostet ein paar Sekunden und trifft danach die Mitte
        # des Knopfes statt seinen Rand.
        if bester_faktor is not None:
            fein = bester_faktor
            schritt = 0.02
            umgebung = [round(bester_faktor + i * schritt, 3) for i in range(-5, 6) if i]
            for f in umgebung:
                if f <= 0:
                    continue
                hit = matcher.best_score(screen, tpl, scale=basis * f)
                if hit and hit.score > bester:
                    bester, fein = hit.score, f
            if fein != bester_faktor:
                self.log.debug("Feinjustage", template=name,
                               grob=bester_faktor, fein=fein, score=round(bester, 3))
            bester_faktor = fein

        if bester_faktor is None or bester < schwelle:
            # Sehr niedrige Werte heissen: die Vorlage ist gar nicht im Bild.
            # Das ist kein Groessen-Problem und darf keinen der drei Versuche
            # verbrauchen - sonst sind sie aufgebraucht, bevor der Bot ueberhaupt
            # einmal auf dem passenden Bildschirm war.
            if bester < float(self.NUR_GROESSE_AB):
                self._nachjustiert[name] = max(0, self._nachjustiert.get(name, 1) - 1)
            self.log.debug(
                "Nachmessen brachte nichts", template=name,
                bester=round(bester, 3), schwelle=schwelle,
            )
            return False
        self.cfg.template_skalen[name] = bester_faktor
        self._knapp.pop(name, None)
        self.log.info(
            f"Vorlage neu vermessen: {name} passt bei Faktor {bester_faktor:.2f}",
            vorher=round(bisher, 3), nachher=round(bester, 3),
        )
        self.bump("vorlage-nachgemessen")
        self._config_patch(lambda roh: roh.setdefault("template_skalen", {}).update(
            {name: round(bester_faktor, 3)}
        ))
        return True

    def _config_patch(self, aendern) -> None:
        """Gelerntes sichern - NEBEN der Konfiguration, nicht darin.

        Die Konfiguration liegt unter Git. Schriebe der Bot seine gemessenen
        Groessen und Takte dort hinein, wuerde sein eigenes `git pull` beim
        naechsten Mal mit 'local changes would be overwritten' abbrechen - und
        er bekaeme nie wieder eine neue Fassung. Darum eine eigene Datei, die
        beim Start ueber die Konfiguration gelegt wird.
        """
        if not self._gelernt_datei:
            return
        try:
            roh = {}
            if os.path.exists(self._gelernt_datei):
                with open(self._gelernt_datei, "r", encoding="utf-8") as fh:
                    roh = json.load(fh)
            aendern(roh)
            ordner = os.path.dirname(os.path.abspath(self._gelernt_datei))
            if ordner:
                os.makedirs(ordner, exist_ok=True)
            with open(self._gelernt_datei, "w", encoding="utf-8") as fh:
                json.dump(roh, fh, ensure_ascii=False, indent=2)
        except Exception as exc:  # pragma: no cover - Dateisystem
            self.log.warn(f"Gelerntes nicht gespeichert: {exc}")

    def _gelerntes_anwenden(self) -> None:
        """Beim Start das Gelernte ueber die Konfiguration legen."""
        if not self._gelernt_datei or not os.path.exists(self._gelernt_datei):
            return
        try:
            with open(self._gelernt_datei, "r", encoding="utf-8") as fh:
                roh = json.load(fh)
        except Exception as exc:
            self.log.warn(f"Gelerntes nicht lesbar: {exc}")
            return
        # Alles Gelernte kommt aus dem Bot selbst - eine halb geschriebene oder
        # von Hand verstellte Datei darf ihn aber weder abstuerzen lassen noch
        # mit unsinnigen Werten weiterlaufen lassen. Also jeden Wert einzeln
        # pruefen und begrenzen, statt der Datei zu glauben.
        def zahl(wert, unten, oben):
            try:
                z = float(wert)
            except (TypeError, ValueError):
                return None
            return z if unten <= z <= oben and z == z else None

        verworfen = []
        skala = zahl(roh.get("ui_skala"), 0.2, 3.0)
        if "ui_skala" in roh:
            if skala is None:
                verworfen.append(f"ui_skala={roh.get('ui_skala')!r}")
            else:
                self.cfg.ui_skala = skala
        for name, wert in (roh.get("template_skalen") or {}).items():
            eigen = zahl(wert, 0.2, 5.0)
            if eigen is None:
                verworfen.append(f"{name}={wert!r}")
                continue
            self.cfg.template_skalen[str(name)] = eigen
        takte = {}
        for eintrag in roh.get("tasks", []):
            if not isinstance(eintrag, dict) or "every" not in eintrag:
                continue
            takt = zahl(eintrag.get("every"), 5.0, 86400.0)
            if takt is None:
                verworfen.append(f"Takt {eintrag.get('name')}={eintrag.get('every')!r}")
                continue
            takte[eintrag.get("name")] = takt
        for task in self.cfg.tasks:
            if task.name in takte:
                task.every = takte[task.name]
        if verworfen:
            self.log.warn("Unsinnige Werte im Gelernten uebergangen",
                          werte=", ".join(verworfen[:8]))
        if roh:
            self.log.info(
                "Gelerntes uebernommen", datei=os.path.basename(self._gelernt_datei),
                groessen=len(roh.get("template_skalen") or {}), takte=len(takte),
            )

    VERDACHT_AB = 25          # so oft gesucht, bevor "trifft nie" etwas heisst

    def veraltete_vorlagen(self, ab: Optional[int] = None) -> List[tuple]:
        """Vorlagen, die oft gesucht wurden und nie trafen.

        Das ist der Unterschied zwischen "Vorlage fehlt" (nie geschnitten) und
        "Vorlage veraltet" (geschnitten, aber das Spiel sieht heute anders
        aus). Der zweite Fall war bisher voellig unsichtbar - der Bot
        uebersprang den Schritt still, und niemand erfuhr, dass ein Update ihm
        die Grundlage entzogen hat.

        Der beste je erreichte Wert sagt dabei, woran es liegt: nahe an der
        Schwelle heisst 'knapp daneben, vielleicht nur die Groesse', sehr
        niedrig heisst 'dieses Bild gibt es so nicht mehr'.
        """
        grenze = int(ab if ab is not None else self.VERDACHT_AB)
        raus = []
        for name, (gesucht, traf, bestwert, _kleinster, _groesster) in \
                self._vorlagen_zaehler.items():
            if gesucht >= grenze and traf == 0:
                raus.append((name, gesucht, round(bestwert, 3)))
        raus.sort(key=lambda e: -e[1])
        return raus

    def _ziffern(self, ordner: str = "ziffern") -> Dict[str, Image]:
        """Die Ziffern-Vorlagen eines Ordners, einmal geladen und gemerkt.

        Nach ORDNER gemerkt, nicht global: die Zahlen im Spiel stehen in
        verschiedenen Schriften (HUD, Timer, Fenstertitel), und ein Satz passt
        nicht auf den anderen. Ein gemeinsamer Puffer haette beim zweiten
        Ordner stillschweigend den ersten Satz zurueckgegeben.
        """
        if getattr(self, "_ziffern_cache", None) is None:
            self._ziffern_cache = {}
        if ordner not in self._ziffern_cache:
            pfad = os.path.join(self.cfg.root, self.cfg.templates_dir, ordner)
            self._ziffern_cache[ordner] = zahlen.lade_ziffern(pfad)
            if self._ziffern_cache[ordner]:
                self.log.debug("Ziffern geladen", ordner=ordner,
                               anzahl=len(self._ziffern_cache[ordner]))
        return self._ziffern_cache[ordner]

    def lies_zahl(self, spec: Dict[str, Any]) -> Optional[int]:
        """Eine Zahl vom Bildschirm lesen - Energie, Stufe, Staerke.

        Ohne das kann der Bot nur erkennen, OB etwas da ist, nie WIE VIEL.
        Alle Wuensche mit einer Menge darin - 'Versammlung ab 20 Energie',
        'nur Monster bis Stufe 6', 'nicht beitreten wenn zu stark' - haengen
        daran.
        """
        screen = self.screen or self.capture()
        ordner = spec.get("ordner", "ziffern")
        ziffern = self._ziffern(ordner)
        # Ein UNVOLLSTAENDIGER Satz ist gefaehrlicher als gar keiner: fehlt die
        # 0, liest der Bot aus "20" eine "2" - und rechnet dann mit 2 weiter.
        # Eine Regel wie "Versammlung ab 20 Energie" ginge damit zur voellig
        # falschen Zeit los. Lieber nichts wissen als etwas Falsches glauben.
        fehlend = [z for z in "0123456789" if z not in ziffern]
        if fehlend:
            if ordner not in self._gemeldet_fehlend:
                self._gemeldet_fehlend.add(ordner)
                self.log.info(
                    "Zahlen lesen geht noch nicht - der Ziffern-Satz ist unvollstaendig",
                    ordner=ordner, fehlt="".join(fehlend),
                    hilfe=f"templates/{ordner}/0.png bis 9.png aus einem Screenshot schneiden",
                )
            return None
        skala = self._scale if self._scale is not None else 1.0
        skala *= float(spec.get("skala", 1.0))
        wert = zahlen.lies_zahl(
            screen, ziffern,
            region=spec.get("region"),
            threshold=float(spec.get("threshold", 0.80)),
            scale=skala,
            hoechstens=int(spec.get("hoechstens", 6)),
        )
        self.log.debug("Zahl gelesen", wert=wert, region=spec.get("region"))
        return wert

    def _selbstbericht(self, spec: Dict[str, Any]) -> None:
        """Sagen, was gerade fehlt - und was es kostet.

        Der Bot kann viele Vorlagen nicht selbst schneiden. Statt still
        daneben zu greifen, zaehlt er, welche fehlende Vorlage wie viele
        Aufgaben blockiert, und nennt die teuersten zuerst. Dann weiss man
        genau, welcher Ausschnitt am meisten bringt.
        """
        # offene_templates fuellt sich erst bei validate(). Wird der Bericht
        # aus einem Zusammenhang gerufen, in dem das nicht lief, meldete er
        # froehlich "keine Vorlage fehlt" - obwohl 32 fehlten. Lieber einmal
        # selbst nachsehen als eine beruhigende Unwahrheit ausgeben.
        if not self.cfg.offene_templates:
            try:
                self.cfg.validate()
            except Exception as exc:  # pragma: no cover - Konfigurationsfehler
                self.log.debug("Selbstbericht: validate ging nicht", grund=str(exc)[:120])
        offen = list(self.cfg.offene_templates)
        if not offen:
            self.log.info("Selbstbericht: keine Vorlage fehlt")
            return

        betroffen: Dict[str, set] = {n: set() for n in offen}

        def suche(knoten, wo):
            if isinstance(knoten, dict):
                name = knoten.get("template")
                if isinstance(name, str) and name in betroffen:
                    betroffen[name].add(wo)
                # tap_first fuehrt seine Vorlagen als blosse Zeichenketten in
                # 'of'. Ohne diesen Zweig blieben sie im Bericht unsichtbar -
                # von 32 fehlenden Vorlagen tauchten nur sechs ueberhaupt auf,
                # und ausgerechnet die aus tap_first fehlten alle.
                fuer = knoten.get("of")
                if isinstance(fuer, list):
                    for eintrag in fuer:
                        if isinstance(eintrag, str) and eintrag in betroffen:
                            betroffen[eintrag].add(wo)
                for v in knoten.values():
                    suche(v, wo)
            elif isinstance(knoten, list):
                for v in knoten:
                    suche(v, wo)

        for regel in self.cfg.rules:
            suche(regel.match, f"Regel {regel.name}")
            suche(regel.do, f"Regel {regel.name}")
        for task in self.cfg.tasks:
            suche(task.do, f"Aufgabe {task.name}")

        # Erst das, ohne das der Bot Schaden nicht abwenden kann - danach das,
        # woran die meisten Aufgaben haengen.
        kritisch = list(self.cfg.kritische_templates)
        rang = sorted(
            betroffen.items(),
            key=lambda kv: (kritisch.index(kv[0]) if kv[0] in kritisch else len(kritisch),
                            -len(kv[1]), kv[0]),
        )
        # Vorgabe hochgesetzt: bei sechs blieben 26 von 32 fehlenden Vorlagen
        # ungenannt - der Bericht sagte damit vor allem, was er verschweigt.
        wieviele = int(spec.get("hoechstens", 20))
        self.log.info(
            f"Selbstbericht: {len(offen)} Vorlagen fehlen - die wichtigsten zuerst"
        )
        for name, wo in rang[:wieviele]:
            if not wo and name not in kritisch:
                continue
            marke = "WICHTIG " if name in kritisch else ""
            self.log.info(f"   {marke}fehlt: {name}",
                          blockiert=", ".join(sorted(wo)) or "Schutzschild")
        self.log.info("   Schneiden mit: python bot.py entdecke (Bildschirm vorher hinstellen)")
        verdacht = sorted(
            ((n, c) for n, c in self._folgenlos.items()
             if c >= 2 and not self._wirksam.get(n)),
            key=lambda kv: -kv[1],
        )
        for name, wie_oft in verdacht[:4]:
            self.log.info(f"   verdaechtig: {name} trifft, bewirkt aber nichts",
                          folgenlose_tipps=wie_oft)
        if self._auswege:
            self.log.info("   Gelernte Auswege", bildschirme=len(self._auswege))
        veraltet = self.veraltete_vorlagen()
        if veraltet:
            self.log.warn(
                f"   {len(veraltet)} Vorlage(n) treffen nie mehr - moeglicherweise "
                f"vom Spiel neu gezeichnet")
            for name, gesucht, bestwert in veraltet[:8]:
                self.log.warn(f"      {name}", gesucht=gesucht, bester_wert=bestwert)
        gelernt = len(self.cfg.template_gruppe("gelernt/blasen/*.png"))
        verworfen = len(self.cfg.template_gruppe("gelernt/verworfen/*.png"))
        self.log.info(
            "   Selbst gelernt", brauchbar=gelernt, aussortiert=verworfen,
            eigene_groessen=len(self.cfg.template_skalen),
        )

    def _ansicht_sammeln(self, spec: Dict[str, Any]) -> None:
        """Jede noch nie gesehene Ansicht einmal ins Repository legen.

        32 Vorlagen fehlen, und jede blockiert Aufgaben - Versammlung
        beitreten, Allianz-Forschung, Falkenturm. Vorlagen kann nur schneiden,
        wer den Bildschirm sieht; bisher hiess das: der Nutzer macht ein Foto.
        Der Bot laeuft aber ohnehin durch all diese Bildschirme.

        Also sammelt er sie selbst ein: neue Ansicht (nach dem groben
        Fingerabdruck, der auch Haenger erkennt) -> einmal ablegen, nie wieder.
        Halbe Kantenlaenge reicht zum Erkennen, was drauf ist; wo es dann um
        Millimeter geht, holt 'ausschnitt' den Streifen in voller Aufloesung nach.
        """
        import subprocess

        hoechstens = int(spec.get("hoechstens", 40))
        if len(self._ansichten) >= hoechstens:
            return
        screen = self.screen
        if screen is None or screen.ist_einfarbig():
            return

        finger = self._ansicht_finger(screen).hex()[:24]
        if finger in self._ansichten:
            return

        wurzel = self._projekt_wurzel(spec)
        ordner = os.path.join(wurzel, "austausch", "ansichten")
        nummer = len(self._ansichten) + 1
        name = f"{nummer:02d}-{finger[:8]}.png"
        try:
            os.makedirs(ordner, exist_ok=True)
            screen.box_scaled_by(float(spec.get("bild_faktor", 0.5))).save(
                os.path.join(ordner, name))
        except (OSError, ValueError) as exc:
            self.log.debug("Ansicht liess sich nicht ablegen", grund=str(exc)[:120])
            return

        self._ansichten[finger] = name
        self._ansichten_sichern()
        # Wonach der Bot gerade sucht, sagt oft mehr ueber den Bildschirm als
        # das Bild allein - das steht in der Liste daneben.
        letzte = sorted(self.stats.items(), key=lambda p: -p[1])[:3]
        # Das Wichtigste an einer neuen Ansicht ist, ob der Bot ueberhaupt
        # wusste, was er damit anfangen soll. Unbekannte Bildschirme sind
        # genau die, fuer die eine Vorlage fehlt - und die zuerst dran sind.
        kennung = "UNBEKANNT" if self.unknown_streak > 0 else "bekannt"
        try:
            with open(os.path.join(ordner, "liste.txt"), "a", encoding="utf-8") as fh:
                fh.write(f"{name}\t{time.strftime('%Y-%m-%d %H:%M:%S')}\t"
                         f"Schritt {self.steps}\t{kennung}\t{dict(letzte)}\n")
        except OSError:
            pass
        self.bump("ansicht-gesammelt")
        self.log.info(f"Neue Ansicht abgelegt ({nummer}/{hoechstens})", datei=name)

        # Nicht bei jedem Bild hochladen - das gaebe vierzig Commits.
        stapel = int(spec.get("stapel", 5))
        if nummer % stapel and nummer < hoechstens:
            return
        if not spec.get("hochladen", True):
            return

        def git(*rest):
            return subprocess.run(["git", "-C", wurzel, *rest], capture_output=True,
                                  timeout=180, env=self._git_umgebung())
        try:
            git("add", "--", os.path.join("austausch", "ansichten"))
            eingetragen = git("commit", "-m", f"Bildschirme gesammelt: {nummer} Ansichten")
            if eingetragen.returncode != 0:
                return
            if git("push").returncode != 0:
                # Wie beim Lebenszeichen: ein liegengebliebener Commit blockiert
                # jedes spaetere 'pull --ff-only'.
                git("reset", "--soft", "HEAD~1")
                self.log.warn("Ansichten nicht hochgeladen - Commit zurueckgenommen")
        except Exception as exc:  # pragma: no cover - Netz/Umgebung
            self.log.warn("Ansichten nicht hochgeladen", grund=str(exc)[:120])

    def _ausschnitt(self, spec: Dict[str, Any]) -> None:
        """Einen Bildausschnitt in voller Aufloesung ablegen und hochladen.

        Die gesammelten Ansichten liegen halbiert im Repository - gut genug, um
        zu sehen, WAS auf dem Bildschirm ist, aber zu grob, um Vorlagen daraus
        zu schneiden. Fuer Ziffern reicht das nicht: eine halbierte 8 ist von
        einer halbierten 9 kaum zu unterscheiden, und eine falsch gelesene Zahl
        ist schlimmer als gar keine.

        Genau daran haengt die Energie-Schranke ("Versammlung ab 20 Energie"):
        dafuer braucht es den Zahlenstreifen am oberen Rand in Originalgroesse.
        Der Bot laeuft ohnehin staendig an ihm vorbei - also holt er ihn selbst.
        """
        import subprocess

        # Frisch aufnehmen: das zuletzt gesehene Bild stammt oft vom Tipp
        # davor und zeigt darum noch den vorigen Bildschirm.
        screen = self.capture() if spec.get("frisch", True) else self.screen
        if screen is None or screen.ist_einfarbig():
            return
        ziel_rel = str(spec.get("datei") or "austausch/ausschnitt.png")
        wurzel = self._projekt_wurzel(spec)
        ziel = os.path.join(wurzel, *ziel_rel.split("/"))

        # Ohne Mindestabstand schriebe der Bot denselben Streifen bei jedem
        # Durchgang neu und lieferte einen Commit pro Minute.
        abstand = float(spec.get("mindestabstand", 3600))
        if abstand > 0 and os.path.exists(ziel):
            try:
                if time.time() - os.path.getmtime(ziel) < abstand:
                    return
            except OSError:
                pass

        l, t, r, b = matcher.resolve_region(
            spec.get("region") or [0.0, 0.0, 1.0, 1.0], screen.width, screen.height)
        if r - l < 2 or b - t < 2:
            self.log.warn("Ausschnitt waere leer", region=spec.get("region"))
            return
        try:
            os.makedirs(os.path.dirname(ziel) or ".", exist_ok=True)
            screen.crop(l, t, r - l, b - t).save(ziel)
        except (OSError, ValueError) as exc:
            self.log.debug("Ausschnitt liess sich nicht ablegen", grund=str(exc)[:120])
            return
        self.bump("ausschnitt")
        self.log.info("Ausschnitt abgelegt", datei=ziel_rel)

        if not spec.get("hochladen", True):
            return

        def git(*rest):
            return subprocess.run(["git", "-C", wurzel, *rest], capture_output=True,
                                  timeout=180, env=self._git_umgebung())
        try:
            git("add", "--", os.path.join(*ziel_rel.split("/")))
            eingetragen = git("commit", "-m", f"Ausschnitt {ziel_rel}")
            if eingetragen.returncode != 0:
                return
            if git("push").returncode != 0:
                # Wie beim Lebenszeichen: ein liegengebliebener Commit blockiert
                # jedes spaetere 'pull --ff-only'.
                git("reset", "--soft", "HEAD~1")
                self.log.warn("Ausschnitt nicht hochgeladen - Commit zurueckgenommen")
        except Exception as exc:  # pragma: no cover - Netz/Umgebung
            self.log.warn("Ausschnitt nicht hochgeladen", grund=str(exc)[:120])

    def _ansichten_laden(self) -> Dict[str, str]:
        if not self._ansichten_datei or not os.path.exists(self._ansichten_datei):
            return {}
        try:
            with open(self._ansichten_datei, "r", encoding="utf-8") as fh:
                daten = json.load(fh)
            return {str(k): str(v) for k, v in daten.items()} if isinstance(daten, dict) else {}
        except (OSError, ValueError):
            return {}

    def _ansichten_sichern(self) -> None:
        if not self._ansichten_datei:
            return
        try:
            with open(self._ansichten_datei, "w", encoding="utf-8") as fh:
                json.dump(self._ansichten, fh, ensure_ascii=False, indent=1)
        except OSError:
            pass

    def _projekt_wurzel(self, spec: Dict[str, Any]) -> str:
        """Der Bot-Ordner - nicht der Ordner der Konfigurationsdatei.

        cfg.root zeigt dorthin, wo last-asylum.json liegt, also nach config/.
        Lebenszeichen und gesammelte Ansichten landeten damit in
        config/austausch/, waehrend alle Werkzeuge und die Doku in austausch/
        nachsehen. Von aussen sah es aus, als schriebe der Bot gar nichts.

        Darum von dort aus aufwaerts suchen, bis ein Ordner nach dem Projekt
        aussieht (bot.py) oder ein eigenes Git-Verzeichnis hat.
        """
        vorgabe = spec.get("verzeichnis")
        if vorgabe:
            return str(vorgabe)
        ordner = self.cfg.root
        for _ in range(4):
            if (os.path.exists(os.path.join(ordner, "bot.py"))
                    or os.path.exists(os.path.join(ordner, ".git"))):
                return ordner
            eltern = os.path.dirname(ordner)
            if eltern == ordner:
                break
            ordner = eltern
        return self.cfg.root

    @staticmethod
    def _git_umgebung() -> Dict[str, str]:
        """Umgebung fuer jeden git-Aufruf: niemals nach Zugangsdaten fragen.

        Fragt git nach Benutzer und Passwort, wartet es auf eine Eingabe, die
        hier nie kommt - der Aufruf haengt bis zum Zeitlimit, und das alle paar
        Minuten. Von aussen sieht der Bot dann eingefroren aus, ohne dass
        irgendwo ein Fehler steht. Lieber sauber scheitern.
        """
        umgebung = dict(os.environ)
        umgebung["GIT_TERMINAL_PROMPT"] = "0"
        umgebung["GCM_INTERACTIVE"] = "never"
        return umgebung

    def _schwellen_belege(self, hoechstens: int = 12) -> Dict[str, Any]:
        """Womit sich Schwellen begruenden lassen - fuer den Blick von aussen.

        `bot.py lernen` kann das aus den Protokollen ableiten, aber die liegen
        auf dem PC und sind per .gitignore ausgeschlossen; von hier aus ist
        also nie zu sehen, ob eine Schwelle sitzt. Und automatisch anwenden
        darf der Bot sie nicht: `--anwenden` schreibt in die Konfiguration, und
        eine geaenderte Datei blockiert danach jedes 'git pull --ff-only' - der
        Bot bekaeme nie wieder eine neue Fassung.

        Also nur die Belege melden: kleinster Treffer und groesster
        Fehlschlag. Liegen sie weit auseinander, sitzt die Schwelle; beruehren
        sie sich, ist die Vorlage nicht trennscharf.
        """
        raus = []
        for name, (gesucht, traf, _best, kleinster, groesster) in self._vorlagen_zaehler.items():
            if gesucht < 3:
                continue
            raus.append((gesucht, name, traf, kleinster, groesster))
        raus.sort(key=lambda e: -e[0])
        return {
            name: {
                "gesucht": gesucht,
                "traf": traf,
                "kleinster_treffer": round(kleinster, 3) if traf else None,
                "groesster_fehlschlag": round(groesster, 3) if traf < gesucht else None,
            }
            for gesucht, name, traf, kleinster, groesster in raus[:hoechstens]
        }

    @staticmethod
    def _alter_des_berichts(ziel: str) -> float:
        """Wie alt ist das Lebenszeichen wirklich - in Sekunden.

        NICHT nach der Dateizeit: das Startskript zieht vor jedem Lauf einen
        neuen Stand, und git schreibt dabei geaenderte Dateien neu. Die
        Dateizeit ist danach die des Checkouts, nicht die des Berichts - ein
        stundenalter Bericht sieht taufrisch aus, und der Bot schweigt weiter.
        Im Bericht selbst steht die richtige Zeit.
        """
        try:
            with open(ziel, "r", encoding="utf-8") as fh:
                gemeldet = json.load(fh).get("zeit_utc")
            wann = time.strptime(str(gemeldet), "%Y-%m-%dT%H:%M:%SZ")
            return max(0.0, time.time() - calendar.timegm(wann))
        except Exception:
            pass
        try:
            return time.time() - os.path.getmtime(ziel)
        except OSError:
            return 1e9

    def _hinweise(self) -> List[str]:
        """Was die Zahlen im Lebenszeichen entwertet - in Klartext.

        Das Lebenszeichen vom 15.08. meldete Schritt 0 und 271 zu 3 Tipps. Was
        wirklich los war, stand nur im Bild: der Bildschirm kam vollstaendig
        schwarz an. Wer nur die Zahlen liest, sucht danach am falschen Ende.
        Solche Befunde gehoeren darum in den Bericht, nicht ins Bild.
        """
        hinweise: List[str] = []
        if self.screen is not None and self.screen.ist_einfarbig():
            hinweise.append(
                "Der Bildschirm kommt einfarbig an - der Bot sieht nichts. "
                "BlueStacks: Einstellungen -> Grafik -> Renderer auf DirectX "
                "bzw. OpenGL umstellen, 'Erweiterter Grafikmodus' aus, dann "
                "neu starten.")
        gebremst = int(self.stats.get("wirkungslos", 0))
        durch = int(self.stats.get("taps", 0))
        if gebremst >= 20 and gebremst > 3 * max(durch, 1):
            hinweise.append(
                f"Die Bremse hat {gebremst} Tipps gesperrt und nur {durch} "
                "durchgelassen - so kommt der Bot nicht zum Handeln.")
        blockiert = int(self.stats.get("tabu-blockiert", 0))
        if blockiert:
            hinweise.append(
                f"{blockiert} Tipps lagen in einer Tabu-Zone (Shop/Echtgeld) "
                "und wurden blockiert.")
        return hinweise

    def _lebenszeichen(self, spec: Dict[str, Any]) -> None:
        """Kurz ins Repository schreiben, dass der Bot lebt - und was er tut.

        Bisher war die Frage 'laeuft der Bot?' nur am PC zu beantworten. Von
        aussen sah ein abgestuerzter Bot genauso aus wie ein zufriedener: gar
        nichts. Diese Datei schliesst die Luecke - Zeitpunkt, Schrittzahl,
        Fassung und die haeufigsten Zaehler. Steht der Zeitstempel still, ist
        der Bot stehengeblieben, und man sieht sofort, bei welchem Stand.
        """
        import subprocess

        wurzel = self._projekt_wurzel(spec)
        ziel = os.path.join(wurzel, "austausch", "lauf.json")

        def git(*rest):
            return subprocess.run(["git", "-C", wurzel, *rest], capture_output=True,
                                  timeout=120, env=self._git_umgebung())

        # Ein abstuerzender Bot startet jede Minute neu. Ohne Sperre schriebe
        # er dann jede Minute einen Commit - genau dann, wenn ohnehin niemand
        # etwas davon hat. Also ein Mindestabstand, unabhaengig vom Takt.
        abstand = float(spec.get("mindestabstand", 600))
        if abstand > 0 and os.path.exists(ziel):
            if self._alter_des_berichts(ziel) < abstand:
                self.log.debug("Lebenszeichen noch frisch - nichts zu tun")
                return

        try:
            kopf = git("rev-parse", "--short", "HEAD").stdout.decode().strip()
        except Exception as exc:  # pragma: no cover - Netz/Umgebung
            self.log.debug("Lebenszeichen: kein Git", grund=str(exc)[:120])
            return

        # Ein Bild dazu, sonst weiss man zwar DASS er laeuft, aber nicht WO er
        # steht. Halbe Groesse reicht zum Wiedererkennen und kostet ein Drittel;
        # fuer volle Aufloesung gibt es die Aktion 'ausschnitt'. Eigener,
        # laengerer Abstand - ein Bild wiegt hundertmal so viel wie die Zahlen.
        # Wie beim Selbstbericht: offene_templates fuellt sich erst bei
        # validate(). Lief das nicht, meldete der Bericht beruhigend "0 offen"
        # - genau die Zahl, an der man ablesen will, ob eine Aufgabe ueberhaupt
        # laufen KANN.
        if not self.cfg.offene_templates:
            try:
                self.cfg.validate()
            except Exception as exc:  # pragma: no cover - Konfigurationsfehler
                self.log.debug("Lebenszeichen: validate ging nicht", grund=str(exc)[:120])

        dateien = [os.path.join("austausch", "lauf.json")]
        bild_name = None
        bild_abstand = float(spec.get("bild_abstand", 3600))
        bild_ziel = os.path.join(wurzel, "austausch", "lauf.png")
        if bild_abstand >= 0:
            faellig = True
            if bild_abstand > 0 and os.path.exists(bild_ziel):
                try:
                    faellig = time.time() - os.path.getmtime(bild_ziel) >= bild_abstand
                except OSError:
                    pass
            if faellig:
                try:
                    # Frisch aufnehmen: das zuletzt gesehene Bild kann vom
                    # letzten Tipp stammen und damit schon veraltet sein.
                    schirm = self.capture()
                    finger = self._ansicht_finger(schirm)
                    if finger == self._bild_finger and os.path.exists(bild_ziel):
                        # Derselbe Bildschirm wie beim letzten Mal - ein zweites
                        # Bild davon sagt nichts Neues und wiegt ein Vielfaches
                        # des Berichts. Bei stuendlich sind das sonst 15 MB am
                        # Tag, die dauerhaft in der Git-Historie liegen bleiben.
                        bild_name = "austausch/lauf.png (unveraendert)"
                    else:
                        os.makedirs(os.path.dirname(bild_ziel), exist_ok=True)
                        schirm.box_scaled_by(
                            float(spec.get("bild_faktor", 0.35))).save(bild_ziel)
                        self._bild_finger = finger
                        bild_name = "austausch/lauf.png"
                        dateien.append(os.path.join("austausch", "lauf.png"))
                except Exception as exc:  # pragma: no cover - Geraet/Datei
                    self.log.debug("Lebenszeichen ohne Bild", grund=str(exc)[:120])

        # Die groessten Zaehler zuerst - das ist die Kurzfassung dessen, womit
        # der Bot seine Zeit verbracht hat.
        oben = sorted(self.stats.items(), key=lambda p: -p[1])[:12]
        bericht = {
            "zeit": time.strftime("%Y-%m-%d %H:%M:%S"),
            "zeit_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "hinweise": self._hinweise(),
            "fassung": kopf,
            "schritte": self.steps,
            "gleiche_ansicht": self.gleiche_ansicht,
            "unbekannt_am_stueck": self.unknown_streak,
            "zaehler": dict(oben),
            "vorlagen_offen": len(self.cfg.offene_templates),
            "vorlagen_veraltet": [
                {"vorlage": n, "gesucht": g, "bester_wert": b}
                for n, g, b in self.veraltete_vorlagen()[:10]
            ],
            "verworfene_vorlagen": sorted(self._verworfen),
            "verdaechtige_regeln": {k: v for k, v in self._folgenlos.items() if v >= 2},
            "schwellen_belege": self._schwellen_belege(),
            "bild": bild_name,
        }
        try:
            os.makedirs(os.path.dirname(ziel), exist_ok=True)
            with open(ziel, "w", encoding="utf-8") as fh:
                json.dump(bericht, fh, ensure_ascii=False, indent=1)
                fh.write("\n")
        except OSError as exc:
            self.log.warn(f"Lebenszeichen liess sich nicht schreiben: {exc}")
            return

        if not spec.get("hochladen", True):
            return
        try:
            git("add", "--", *dateien)
            # Vorlagen, die am PC geschnitten wurden, liegen sonst NUR dort.
            # Die Selbstbericht-Zahl "0 offen" bei 31 im Repository fehlenden
            # Vorlagen kam genau daher: der Bot hatte sie, das Repository nicht.
            # Geht die Windows-Kopie verloren, ist die Handarbeit weg.
            #
            # NUR NEUE Dateien, ausdruecklich keine geaenderten oder geloeschten.
            # Der erste Versuch nahm alles ("git add templates") und richtete
            # prompt Schaden an: die Windows-Kopie war aelter, also loeschte der
            # Commit hud/quest_vorschlag.png aus dem Repository und ersetzte
            # vier Vorlagen durch schlechtere - nav/held.png passte danach mit
            # 0.9995 mitten in nav/nachricht.png. Der Bot darf beitragen, aber
            # nichts wegnehmen. (templates/entdeckt und templates/gelernt sind
            # per .gitignore ohnehin aussen vor.)
            if spec.get("vorlagen_sichern", True):
                neue = git("ls-files", "--others", "--exclude-standard", "--", "templates")
                pfade = [z for z in neue.stdout.decode("utf-8", "replace").splitlines()
                         if z.strip()]
                if pfade:
                    git("add", "--", *pfade[:200])
            eingetragen = git("commit", "-m",
                              f"Lebenszeichen {bericht['zeit']} - Schritt {self.steps}")
            if eingetragen.returncode != 0:
                text = (eingetragen.stdout + eingetragen.stderr).decode("utf-8", "replace")
                if "nothing to commit" not in text:
                    # Der haeufigste Grund: git kennt auf diesem Rechner keinen
                    # Namen. Bisher fiel das nirgends auf - der Bot schrieb
                    # brav Dateien, die nie jemand zu sehen bekam.
                    self.log.warn("Lebenszeichen liess sich nicht eintragen",
                                  grund=" ".join(text.split())[:200])
                return
            schub = git("push")
        except Exception as exc:  # pragma: no cover - Netz/Umgebung
            self.log.debug("Lebenszeichen nicht hochgeladen", grund=str(exc)[:120])
            return
        if schub.returncode != 0:
            # WICHTIG: der Commit liegt jetzt lokal und die Branch ist der
            # Ferne voraus. Bliebe er liegen, scheiterte jedes kuenftige
            # 'git pull --ff-only' - der Bot bekaeme nie wieder eine neue
            # Fassung, wegen einer blossen Statusmeldung. Also zuruecknehmen;
            # die Datei bleibt im Arbeitsstand und faehrt beim naechsten Mal mit.
            zurueck = git("reset", "--soft", "HEAD~1")
            self.log.warn(
                "Lebenszeichen nicht hochgeladen - Commit zurueckgenommen"
                if zurueck.returncode == 0 else
                "Lebenszeichen nicht hochgeladen UND nicht zurueckgenommen - "
                "die Branch ist der Ferne voraus, kuenftige Updates blockieren",
                           grund=schub.stderr.decode("utf-8", "replace").strip()[:160])

    def _selbst_aktualisieren(self, spec: Dict[str, Any]) -> None:
        """Neue Fassung holen und sich dafuer selbst beenden.

        Der Bot laeuft in einer Schleife, die ihn nach dem Ende neu startet.
        Kam per `git pull` neuer Code an, muss er also nur aussteigen - beim
        naechsten Start laeuft die neue Fassung. Ohne das braeuchte jede
        Verbesserung einen Handgriff am PC.
        """
        import subprocess

        wurzel = spec.get("verzeichnis") or self.cfg.root
        try:
            umgebung = self._git_umgebung()
            vorher = subprocess.run(["git", "-C", wurzel, "rev-parse", "HEAD"],
                                    capture_output=True, timeout=60, env=umgebung)
            if vorher.returncode != 0:
                self.log.debug("Kein Git-Verzeichnis - kein Selbst-Update")
                return
            hole = subprocess.run(["git", "-C", wurzel, "pull", "--ff-only"],
                                  capture_output=True, timeout=180, env=umgebung)
            nachher = subprocess.run(["git", "-C", wurzel, "rev-parse", "HEAD"],
                                     capture_output=True, timeout=60, env=umgebung)
        except Exception as exc:  # pragma: no cover - Netz/Umgebung
            self.log.warn(f"Selbst-Update nicht moeglich: {exc}")
            return
        if hole.returncode != 0:
            grund = hole.stderr.decode("utf-8", "replace").strip()
            abgedriftet = ("not possible to fast-forward" in grund.lower()
                           or "diverged" in grund.lower())
            if "would be overwritten" in grund or "local changes" in grund or abgedriftet:
                # Genau die Falle, wegen der Gelerntes jetzt daneben liegt:
                # eine von Hand oder frueher vom Bot geaenderte Datei blockiert
                # jede neue Fassung - still, bis es jemand bemerkt.
                self.log.warn(
                    "Neue Fassung blockiert: geaenderte Dateien im Ordner",
                    hilfe="git checkout -- config/ && git pull",
                    grund=grund.splitlines()[0][:160] if grund else "",
                )
            else:
                # Nicht auf debug verstecken: die Aufgabe laeuft nur alle 30
                # Minuten, es droht also keine Log-Flut - und ohne Meldung
                # bleibt der Bot stumm auf einer alten Fassung stehen.
                self.log.warn("Selbst-Update fehlgeschlagen - Bot bleibt auf alter Fassung",
                              grund=" ".join(grund.split())[:200])
            return
        alt = vorher.stdout.decode().strip()
        neu = nachher.stdout.decode().strip()
        if alt == neu:
            self.log.debug("Schon auf dem neuesten Stand")
            return
        self.bump("selbst-aktualisiert")
        self.log.info(f"Neue Fassung geholt ({alt[:7]} -> {neu[:7]}) - Neustart")
        raise StopRun("neue Fassung geholt")

    def _bald_erneut(self, spec: Dict[str, Any]) -> None:
        """Die laufende Aufgabe frueher wieder faellig machen."""
        name = spec.get("aufgabe", "kalibrieren")
        if name in self._task_due:
            self._task_due[name] = self._clock() + float(spec.get("erneut_in", 600))

    def _skala_sichern(self, wert: float) -> None:
        self._config_patch(lambda roh: roh.__setitem__("ui_skala", round(wert, 3)))

    def _optimiere_takte(self, spec: Dict[str, Any]) -> None:
        """Eigene Protokolle auswerten und die Takte selbst nachziehen.

        Jeder Aufgaben-Lauf notiert, wie viele Tipps er ausgeloest hat. Wer
        wiederholt leer laeuft, wird seltener aufgerufen; wer viel bewirkt,
        oefter. Aenderungen sind auf Faktor zwei je Durchgang begrenzt und
        bleiben in festen Grenzen - so kann sich nichts aufschaukeln.
        """
        import glob as _glob

        muster = spec.get("logs", os.path.join("logs", "*.jsonl"))
        min_laeufe = int(spec.get("min_laeufe", 5))
        unten = float(spec.get("min_takt", 300))
        oben = float(spec.get("max_takt", 86400))
        # Aufgaben, deren Sinn NICHT im Antippen liegt: Waechter, Selbstpflege,
        # Berichte. Am Erfolgsmass "wie viele Tipps" gemessen laufen die
        # zwangslaeufig leer und wuerden bis auf 24 Stunden gedrosselt - also
        # genau die Aufgaben, die haeufig laufen muessen, damit ueberhaupt
        # jemand merkt, wenn etwas klemmt.
        ausnahmen = set(spec.get("ausnahmen", []))

        # Nur Zeilen seit der letzten Anpassung auswerten. Sonst zaehlen
        # dieselben alten Laeufe bei jedem Durchgang erneut mit, und der Takt
        # schraubt sich Runde um Runde weiter nach oben, ohne dass je neue
        # Belege dazukommen.
        stand = float(getattr(self.cfg, "takte_stand", 0.0) or 0.0)
        neuster = stand

        werte: Dict[str, List[int]] = {}
        for pfad in sorted(_glob.glob(muster)):
            try:
                with open(pfad, "r", encoding="utf-8") as fh:
                    for zeile in fh:
                        try:
                            d = json.loads(zeile)
                        except ValueError:
                            continue
                        if d.get("ev") != "aufgabe":
                            continue
                        ts = float(d.get("ts", 0.0) or 0.0)
                        if ts and ts <= stand:
                            continue
                        neuster = max(neuster, ts)
                        werte.setdefault(d["aufgabe"], []).append(int(d.get("tipps", 0)))
            except OSError:
                continue

        if not werte:
            self.log.debug("Keine neuen Aufgaben-Daten seit der letzten Anpassung")
            return

        aenderungen = {}
        for task in self.cfg.tasks:
            reihe = werte.get(task.name)
            if not task.enabled or not reihe or len(reihe) < min_laeufe:
                continue
            if task.name in ausnahmen:
                continue
            schnitt = sum(reihe) / len(reihe)
            alt = task.every
            if schnitt == 0:
                neu = min(oben, alt * 2)
            elif schnitt < 0.5:
                neu = min(oben, alt * 1.5)
            elif schnitt > 8:
                neu = max(unten, alt / 2)
            else:
                continue
            if abs(neu - alt) < max(60, alt * 0.1):
                continue
            task.every = neu
            aenderungen[task.name] = (alt, neu, schnitt, len(reihe))

        # Auch ohne Aenderung den Stand fortschreiben - sonst werden dieselben
        # Zeilen beim naechsten Durchgang wieder angerechnet.
        if neuster > stand:
            self.cfg.takte_stand = neuster
            self._config_patch(lambda roh: roh.__setitem__("takte_stand", neuster))

        if not aenderungen:
            self.log.info("Takte passen - nichts zu aendern")
            return

        for name, (alt, neu, schnitt, n) in aenderungen.items():
            richtung = "seltener" if neu > alt else "oefter"
            self.log.info(
                f"Takt angepasst: {name} {richtung}",
                von=f"{int(alt / 60)}min", auf=f"{int(neu / 60)}min",
                tipps_schnitt=round(schnitt, 1), laeufe=n,
            )
        self.bump("takt-angepasst")
        self._takte_sichern(aenderungen)

    def _takte_sichern(self, aenderungen: Dict[str, Any]) -> None:
        """Neue Takte in die Konfigurationsdatei zurueckschreiben."""

        def anwenden(roh):
            liste = roh.setdefault("tasks", [])
            for name, (_alt, neu, _s, _n) in aenderungen.items():
                for eintrag in liste:
                    if eintrag.get("name") == name:
                        eintrag["every"] = neu
                        break
                else:
                    liste.append({"name": name, "every": neu})

        self._config_patch(anwenden)

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
        seiten = tuple(spec.get("seitenverhaeltnis", (0.75, 1.35)))

        vorher = self.capture()
        # Nur dort lernen, wo es Ertrag gibt. In Menues und Chatfenstern bewegt
        # sich auch etwas - das ist aber nichts zum Einsammeln.
        wo = spec.get("nur_wenn")
        if wo and not self.evaluate(wo, vorher):
            self.log.debug("Nicht die richtige Ansicht zum Lernen")
            return
        self._sleep(pause)
        nachher = self.capture()
        kisten = _veraenderte_bereiche(vorher, nachher, min_kante, max_kante, seiten)
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
            # Freie Nummer suchen statt zaehlen: sortiert _pruefe_verdacht eine
            # Vorlage aus, entsteht eine Luecke in der Nummerierung - und die
            # naechste gelernte Vorlage ueberschriebe dann eine vorhandene.
            i = 0
            while os.path.exists(os.path.join(ziel, f"{i:02d}.png")):
                i += 1
            name = f"{i:02d}.png"
            ausschnitt.save(os.path.join(ziel, name))
            vorhanden.append(name)
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

    def _tap_point(self, value: Any, zwingend: bool = False) -> None:
        screen = self.screen or self.capture()
        # Liste von Punkten? Einen zufaellig nehmen - so trifft man auch dann
        # freies Gelaende, wenn an einer Stelle gerade ein Gebaeude steht.
        if value and isinstance(value[0], (list, tuple)):
            value = self.rng.choice(list(value))
        x, y = value[0], value[1]
        px = int(round(x * screen.width)) if abs(x) <= 1.0 else int(x)
        py = int(round(y * screen.height)) if abs(y) <= 1.0 else int(y)
        px, py = human_point(px, py, max(6, screen.width // 60), max(6, screen.height // 120))
        self._tap_abs(px, py, "Punkt", zwingend=zwingend)

    def _tap_abs(self, x: int, y: int, why: str, zwingend: bool = False) -> None:
        """Antippen. 'zwingend' hebt nur die Wirkungslos-Bremse auf, nie die Tabu-Zone.

        Die Bremse fragt: hat sich an dieser Stelle beim letzten Mal etwas
        geruehrt? Auf einem festgefahrenen Bildschirm lautet die Antwort immer
        nein - und genau dort setzen Ausweg-Suche und Erkundung an. Ohne diese
        Ausnahme legt die Bremse also ausgerechnet den Fluchtweg stumm, und der
        Bot bleibt stehen, obwohl er den Ausgang schon gefunden hatte.
        """
        screen = self.screen
        if screen is not None:
            x = max(0, min(x, screen.width - 1))
            y = max(0, min(y, screen.height - 1))
            if not (zwingend or self._auf_der_flucht) and self._wirkungslos(x, y, screen):
                self.log.debug("Gleicher Tipp ohne Wirkung - uebersprungen", x=x, y=y)
                self.bump("wirkungslos")
                # Uebersprungen heisst: derselbe Tipp hat schon einmal nichts
                # bewirkt. Das zaehlt genauso gegen die Vorlage wie ein Tipp,
                # nach dem sich das Bild nicht ruehrt.
                if "/" in str(why) and str(why).endswith(".png"):
                    self._folgenlos[str(why)] = self._folgenlos.get(str(why), 0) + 1
                    self._pruefe_verdacht(str(why))
                return
            verbot = self._tabu_treffer(x, y, screen)
            if verbot is not None:
                self.log.warn(
                    "Tipp in Tabu-Zone blockiert (Shop/Echtgeld)",
                    x=x, y=y, zone=verbot, grund=why,
                )
                self.bump("tabu-blockiert")
                return
        self.dev.tap(x, y)
        if screen is not None:
            finger = self._ansicht_finger(screen)
            if "/" in str(why) and str(why).endswith(".png"):
                # Beim naechsten Bild nachsehen, ob dieser Tipp etwas bewirkt
                # hat. Eine Vorlage, die zwar trifft aber nie etwas ausloest,
                # zeigt auf das falsche Ding - das faellt sonst niemandem auf.
                self._offene_pruefung = (str(why), finger)
            self._tipp_verlauf.append(
                (x, y, self._umgebung(screen, x, y), finger, self._clock())
            )
            del self._tipp_verlauf[:-12]  # nur die letzten paar merken
        self.bump("taps")
        self.log.debug("Tipp", x=x, y=y, grund=why)

    def _wirkungslos(self, x: int, y: int, screen: Optional[Image]) -> bool:
        """Wurde genau hier schon getippt, ohne dass sich etwas geruehrt hat?

        Eine eingesammelte Blase verschwindet, ein gedrueckter Knopf veraendert
        den Bildschirm. Bleibt beides aus, war der Tipp wirkungslos - dann noch
        zwanzigmal auf dieselbe Stelle zu haemmern bringt nichts und sieht
        ausserdem nach Maschine aus. Wiederholtes Abholen an gleicher Stelle
        bleibt erlaubt, weil sich dort jedes Mal etwas aendert.

        Es werden die letzten zwoelf Stellen geprueft, nicht nur die vorige:
        Aufgaben tippen reihum mehrere Ziele an, da ist der unmittelbar
        vorherige Tipp nie derselbe Punkt.

        Zwei Einschraenkungen, ohne die die Bremse den Bot lahmlegt - genau das
        ist live passiert (271 gebremste gegen 3 ausgefuehrte Tipps):

        1. Die meisten Knoepfe veraendern sich selbst gar nicht. Die Lupe, das
           Welt-Symbol, der Suchen-Knopf sehen nach dem Druecken aus wie vorher
           - was sich aendert, ist der Bildschirm daneben. Wer nur die Umgebung
           des Fingers ansieht, haelt jeden dieser Knoepfe fuer tot und ruehrt
           ihn nie wieder an. Darum zaehlt ein Tipp nur dann als wirkungslos,
           wenn sich auch die ganze Ansicht nicht geruehrt hat.
        2. Der Verlauf wird nur nach Anzahl gekuerzt, und gebremste Tipps
           kommen nicht hinein. Steht dort erst einmal ein toter Punkt, bleibt
           er ewig stehen. Nach VERLAUF_HALTBARKEIT Sekunden ist der Befund
           verjaehrt - das Spiel laeuft ja weiter.
        """
        if screen is None or not self._tipp_verlauf:
            return False
        jetzt_finger: Optional[bytes] = None
        # Nur den juengsten Tipp an dieser Stelle vergleichen: kehrt der
        # Bildschirm spaeter in einen frueheren Zustand zurueck - etwa weil nach
        # dem Abholen die naechste, gleich aussehende Zeile nachrueckt -, soll
        # wieder getippt werden duerfen.
        for lx, ly, alt, alt_finger, wann in reversed(self._tipp_verlauf):
            if abs(lx - x) > 25 or abs(ly - y) > 25:
                continue
            if self._clock() - wann > self.VERLAUF_HALTBARKEIT:
                return False  # zu lange her, das Spiel ist weitergelaufen
            if jetzt_finger is None:
                jetzt_finger = self._ansicht_finger(screen)
            if jetzt_finger != alt_finger:
                return False  # anderer Bildschirm - der alte Befund gilt nicht
            jetzt = self._umgebung(screen, lx, ly)
            unterschiede = sum(1 for a, b in zip(alt, jetzt) if abs(a - b) > 12)
            return unterschiede <= 2  # an dieser Stelle hat sich nichts getan
        return False

    @staticmethod
    def _umgebung(screen: Image, x: int, y: int) -> bytes:
        """Fingerabdruck nur der Umgebung des Tipps.

        Ein Fingerabdruck des ganzen Bildschirms wuerde eine einzelne
        verschwundene Blase kaum bemerken - sie ist ein Promille der Flaeche.
        Direkt um die Tipp-Stelle herum ist die Aenderung dagegen deutlich.
        """
        kante = max(48, screen.width // 12)
        ausschnitt = screen.crop(x - kante // 2, y - kante // 2, kante, kante)
        return bytes(ausschnitt.to_gray().box_scale(8, 8).data)

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
            if self._regel_ohne_wirkung(rule):
                continue
            self._rule_last[rule.name] = self._clock()
            if rule.once:
                self._rule_done.add(rule.name)
            self.unknown_streak = 0
            self.bump(f"rule:{rule.name}")
            score = f" ({self.last_match.score:.2f})" if self.last_match else ""
            self.log.info(f"✓ {rule.name}{score}")
            if self._noch_geduldig(rule):
                # Sonst zaehlt die Festgefahren-Pruefung den Ladebildschirm hoch
                # und schickt den Bot nach fuenfzehn Schritten auf Ausweg-Suche
                # - mitten in einen Vorgang, der von allein fertig wird.
                self.gleiche_ansicht = 0
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
        if self._festgefahren(screen):
            return True

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
        # Alle zehn Schritte erneut, nicht nur drei Mal: eine feste Liste
        # (5, 15, 45) hiess, dass der Bot ab dem 46. Fehlgriff nie wieder
        # einen Ausweg versucht haette.
        if self.cfg.on_unknown and self.unknown_streak >= 5 and self.unknown_streak % 10 == 5:
            self.log.warn("Unbekannter Bildschirm – on_unknown läuft", serie=self.unknown_streak)
            self._ausweg_suchen("on_unknown")
        return True

    def _ausweg_suchen(self, woher: str) -> None:
        """Den Ausweg von diesem Bildschirm suchen - und ihn sich merken.

        Bisher lief bei jedem Haenger dieselbe Kette von vorn ab: erst das
        Schliesskreuz, dann der Zurueck-Pfeil, dann die freie Flaeche. Auf
        einem Bildschirm, den der Bot schon dutzendmal gesehen hat, ist das
        verschwendete Zeit. Er probiert die Schritte darum einzeln durch,
        merkt sich, welcher gewirkt hat, und faengt beim naechsten Mal damit
        an. Was noch nie gewirkt hat, wird nicht wiederholt.
        """
        schluessel = self._ansicht_schluessel()
        if schluessel is None:
            self._auf_der_flucht = True
            try:
                self.run_actions(self.cfg.on_unknown, woher)
            finally:
                self._auf_der_flucht = False
            return
        schritte = list(self.cfg.on_unknown)
        gemerkt = self._auswege.get(schluessel)
        if isinstance(gemerkt, dict) and "tap" in gemerkt:
            # Auf diesem Bildschirm hat der Bot den Knopf selbst gefunden.
            xr, yr = gemerkt["tap"]
            self.log.debug("Bekannter Bildschirm - selbst gefundener Knopf", bei=f"{xr}/{yr}")
            self._tap_point([[xr, yr]], zwingend=True)
            self._do_sleep([0.8, 1.2])
            if self._ansicht_finger(self.capture()) != self._finger_jetzt:
                return
        reihenfolge = list(range(len(schritte)))
        if isinstance(gemerkt, int) and 0 <= gemerkt < len(schritte):
            reihenfolge.remove(gemerkt)
            reihenfolge.insert(0, gemerkt)
            self.log.debug("Bekannter Bildschirm - bewaehrter Ausweg zuerst",
                           schritt=gemerkt + 1)
        vorher = self._finger_jetzt
        for nr in reihenfolge:
            self._auf_der_flucht = True
            try:
                self.run_actions([schritte[nr]], woher)
            finally:
                self._auf_der_flucht = False
            self._do_sleep([0.8, 1.2])
            jetzt = self._ansicht_finger(self.capture())
            if jetzt == vorher:
                continue
            if self._auswege.get(schluessel) != nr:
                self._auswege[schluessel] = nr
                self._auswege_sichern()
                self.bump("ausweg-gelernt")
                self.log.info(
                    f"Ausweg gelernt: Schritt {nr + 1} von {len(schritte)} bringt hier weiter",
                    bildschirme=len(self._auswege),
                )
            return
        self.log.debug("Kein Schritt hat gewirkt", bildschirm=schluessel[:8])
        self._erkunden(schluessel, vorher)

    # Farben der Aktions-Knoepfe. Gold/Orange fehlt mit Absicht - nicht weil
    # Gold immer Geld bedeutet, sondern weil es die Farbe der Haupthandlung
    # ist und die harmlos ('Zerlegen') oder teuer sein kann ('CHF 4.40',
    # '50 Spenden' mit Diamant). Am Bild ist das nicht zu unterscheiden.
    # Blau ist entweder eine Handlung oder 'Abbrechen' - beides ungefaehrlich.
    ERKUNDUNGS_FARBEN = [(120, 181, 54), (58, 142, 230)]
    # Oben liegt das Angebots-Banner, ganz unten die Navigationsleiste.
    ERKUNDUNGS_ZONE = [0.05, 0.18, 0.95, 0.88]
    ERKUNDUNG_VERFAELLT = 7 * 24 * 3600.0   # nach einer Woche darf neu probiert werden

    def _sieht_aus_wie_benutzen(self, cx: int, cy: int) -> bool:
        """Liegt an dieser Stelle der 'Benutzen'-Knopf?

        Die Erkundung tippt blaue Knoepfe, weil Blau im Spiel Handlung oder
        Abbrechen bedeutet - beides harmlos. 'Benutzen' im Beutel ist aber
        dasselbe Blau, und ein Tipp darauf verbraucht einen Gegenstand.
        Ausdauer-Fläschchen sollen fuer den Krieg bleiben, also lieber einen
        Erkundungs-Versuch auslassen als einen Vorrat.
        """
        vorlage = self.cfg.template("ui/btn_benutzen.png", optional=True)
        if vorlage is None or self.screen is None:
            return False
        breite = int(vorlage.width * 1.6) + 40
        hoehe = int(vorlage.height * 1.6) + 40
        x = max(0, min(cx - breite // 2, self.screen.width - 1))
        y = max(0, min(cy - hoehe // 2, self.screen.height - 1))
        breite = min(breite, self.screen.width - x)
        hoehe = min(hoehe, self.screen.height - y)
        if breite < vorlage.width or hoehe < vorlage.height:
            return False
        ausschnitt = self.screen.crop(x, y, breite, hoehe)
        skala = self._scale if self._scale is not None else 1.0
        skala *= float(self.cfg.template_skalen.get("ui/btn_benutzen.png", 1.0))
        return matcher.find(ausschnitt, vorlage, threshold=0.82, scale=skala) is not None

    def _erkunden(self, schluessel: str, vorher) -> None:
        """Letzte Stufe: einen Knopf ausprobieren, den es noch nicht kennt.

        Greift nur, wenn der Bot auf diesem Bildschirm ohnehin feststeckt und
        keiner der vorgesehenen Auswege gewirkt hat - die Alternative waere,
        gar nichts zu tun. Probiert werden nur gruene und blaue Knoepfe;
        Gold ist im Spiel die Farbe fuer Kaeufe und fuer 'Bestaetigen' bei
        'Spiel beenden?'. Was einmal nichts gebracht hat, wird auf diesem
        Bildschirm nie wieder angetippt.
        """
        if not self.cfg.erkunden or self.screen is None:
            return
        schon = self._erkundet.setdefault(schluessel, [])
        # Das Budget verfaellt nach einer Weile. Bisher galt es endgueltig und
        # ueberlebte jeden Neustart: nach sechs Versuchen war die letzte
        # Rettung fuer diesen Bildschirm FUER IMMER verbraucht - auch wenn das
        # Spiel dort inzwischen ganz andere Knoepfe zeigt. Ein Bildschirm
        # aendert sich mit Updates und Events; das Gedaechtnis darf nicht
        # starrer sein als das Spiel.
        jetzt = self._now()
        frisch = []
        for eintrag in schon:
            if len(eintrag) >= 3:
                if jetzt - float(eintrag[2]) < self.ERKUNDUNG_VERFAELLT:
                    frisch.append(eintrag)
            else:
                frisch.append(list(eintrag) + [jetzt])   # alte Form nachruesten
        if frisch != schon:
            # Nicht nur auf die Laenge schauen: Eintraege der alten Form
            # ([x, y] ohne Zeitstempel) bekommen hier einen - dabei bleibt die
            # Laenge gleich, und der Nachtrag ginge sonst verloren.
            schon[:] = frisch
            self._erkundung_sichern()
        if len(schon) >= int(self.cfg.erkunden_hoechstens):
            return
        for rgb in self.ERKUNDUNGS_FARBEN:
            for treffer in matcher.find_color_button(
                self.screen, rgb, tolerance=40, min_w=0.12, max_w=0.7,
                min_h=0.015, max_h=0.07, region=self.ERKUNDUNGS_ZONE, limit=6,
            ):
                cx, cy = treffer.center
                xr = round(cx / self.screen.width, 3)
                yr = round(cy / self.screen.height, 3)
                if any(abs(xr - e[0]) < 0.04 and abs(yr - e[1]) < 0.03 for e in schon):
                    continue
                if self._tabu_treffer(cx, cy, self.screen) is not None:
                    continue
                # 'Benutzen' im Beutel hat genau dieses Blau. Ein Erkundungs-
                # Tipp darauf verbraucht einen Gegenstand - und die Ausdauer-
                # Fläschchen sollen ausdruecklich fuer den Krieg bleiben. Was
                # aussieht wie dieser Knopf, wird darum uebersprungen.
                if self._sieht_aus_wie_benutzen(cx, cy):
                    self.log.debug("Erkundung: sieht aus wie 'Benutzen' - uebersprungen",
                                   bei=f"{xr:.2f}/{yr:.2f}")
                    continue
                schon.append([xr, yr, self._now()])
                self._erkundung_sichern()
                self.bump("erkundet")
                self.log.info(
                    "Nichts half - unbekannten Knopf ausprobieren",
                    bei=f"{xr:.2f}/{yr:.2f}", schon_probiert=len(schon),
                )
                self._tap_abs(cx, cy, "erkundung", zwingend=True)
                self._do_sleep([1.0, 1.5])
                if self._ansicht_finger(self.capture()) != vorher:
                    self._auswege[schluessel] = {"tap": [xr, yr]}
                    self._auswege_sichern()
                    self.bump("ausweg-gelernt")
                    self.log.info(
                        "Ausweg selbst gefunden - Knopf gemerkt",
                        bei=f"{xr:.2f}/{yr:.2f}", bildschirme=len(self._auswege),
                    )
                return

    def _erkundung_sichern(self) -> None:
        if not self._erkundung_datei:
            return
        try:
            ordner = os.path.dirname(os.path.abspath(self._erkundung_datei))
            if ordner:
                os.makedirs(ordner, exist_ok=True)
            with open(self._erkundung_datei, "w", encoding="utf-8") as fh:
                json.dump(self._erkundet, fh, indent=2)
        except OSError as exc:  # pragma: no cover - Dateisystem
            self.log.warn(f"Erkundung nicht schreibbar: {exc}")

    def _erkundung_laden(self) -> Dict[str, list]:
        if not self._erkundung_datei or not os.path.exists(self._erkundung_datei):
            return {}
        try:
            with open(self._erkundung_datei, "r", encoding="utf-8") as fh:
                return {str(k): list(v) for k, v in json.load(fh).items()}
        except Exception as exc:
            # Die beiden Geschwister-Lader melden sich, dieser schluckte alles.
            # Ein verlorenes Erkundungs-Gedaechtnis ist verschmerzbar - dass es
            # verloren ging, sollte trotzdem irgendwo stehen.
            self.log.warn(f"Erkundung nicht lesbar, fange frisch an: {exc}")
            return {}

    def _ansicht_schluessel(self) -> Optional[str]:
        if self._finger_jetzt is None:
            return None
        return self._finger_jetzt.hex()

    def _auswege_laden(self) -> Dict[str, Any]:
        if not self._auswege_datei or not os.path.exists(self._auswege_datei):
            return {}
        try:
            with open(self._auswege_datei, "r", encoding="utf-8") as fh:
                return {str(k): v for k, v in json.load(fh).items()}
        except Exception as exc:
            self.log.warn(f"Gelernte Auswege nicht lesbar: {exc}")
            return {}

    def _auswege_sichern(self) -> None:
        if not self._auswege_datei:
            return
        try:
            ordner = os.path.dirname(os.path.abspath(self._auswege_datei))
            if ordner:
                os.makedirs(ordner, exist_ok=True)
            with open(self._auswege_datei, "w", encoding="utf-8") as fh:
                json.dump(self._auswege, fh, indent=2)
        except OSError as exc:  # pragma: no cover - Dateisystem
            self.log.warn(f"Gelernte Auswege nicht schreibbar: {exc}")

    def _regel_ohne_wirkung(self, rule) -> bool:
        """Greift eine Regel wieder und wieder, ohne dass sich etwas tut?

        Am 31.07. griff 'dialog-schliessen' auf 'Taegliche Aufgaben' elfmal
        mit Score 1.00 - die Vorlage passte auf etwas, das kein Schliesskreuz
        war. Solche Regeln werden fuer eine Weile stillgelegt, damit der Bot
        weiterkommt, statt auf derselben Stelle zu treten.
        """
        if self._clock() < self._regel_pause.get(rule.name, -1e9):
            return True
        if self._noch_geduldig(rule):
            # Eine wartende Regel bewirkt per Definition nichts am Bild. Beide
            # Bremsen wuerden sie darum stilllegen - und der Bot faenge an, auf
            # einem Ladebildschirm herumzutippen, statt ihn zu Ende laden zu
            # lassen. Genau davor schuetzt dieses Feld.
            return False
        if self._regel_ausser_rand(rule):
            return True
        grenze = int(getattr(self.cfg, "regel_wirkungslos_grenze", 0) or 0)
        if grenze <= 0 or self._finger_jetzt is None:
            return False
        vorher, zaehler = self._regel_finger.get(rule.name, (None, 0))
        if vorher != self._finger_jetzt:
            self._regel_finger[rule.name] = (self._finger_jetzt, 1)
            return False
        zaehler += 1
        self._regel_finger[rule.name] = (self._finger_jetzt, zaehler)
        if zaehler <= grenze:
            return False
        pause = float(getattr(self.cfg, "regel_wirkungslos_pause", 300.0))
        self._regel_pause[rule.name] = self._clock() + pause
        self._regel_finger.pop(rule.name, None)
        self.bump("regel-stillgelegt")
        self.log.warn(
            f"Regel '{rule.name}' bewirkt nichts - fuer eine Weile stillgelegt",
            versuche=zaehler, pause_sekunden=int(pause),
        )
        self._gelerntes_verwerfen(rule)
        return True

    def _gelerntes_verwerfen(self, rule) -> None:
        """Selbst gelernte Vorlagen aussortieren, die nur stoeren.

        Der Bot lernt Sammel-Objekte aus dem, was sich bewegt. Manchmal ist
        das kein Ertrag, sondern eine Laufschrift oder ein Werbebanner - dann
        greift die Regel dauernd und bewirkt nichts. Was hier auffaellt,
        wandert nach 'gelernt/verworfen' und wird nicht mehr benutzt.
        """
        muster = rule.match.get("template") if isinstance(rule.match, dict) else None
        if not muster or "gelernt/" not in str(muster) or "*" not in str(muster):
            return
        screen = self.screen
        if screen is None:
            return
        ziel = os.path.join(self.cfg.root, self.cfg.templates_dir, "gelernt", "verworfen")
        schwelle = float(rule.match.get("threshold", self.cfg.default_threshold))
        for name in self.cfg.template_gruppe(muster):
            tpl = self.cfg.template(name, optional=True)
            if tpl is None:
                continue
            hit = matcher.best_score(
                screen, tpl, scale=self.cfg.scale_for_template(name, screen.width)
            )
            if not hit or hit.score < schwelle:
                continue
            try:
                os.makedirs(ziel, exist_ok=True)
                quelle = self.cfg.template_path(name)
                os.replace(quelle, os.path.join(ziel, os.path.basename(quelle)))
                self.cfg._templates.pop(name, None)
                self._verworfen.add(name)
                self.bump("gelerntes-verworfen")
                self.log.warn(
                    f"Selbst gelernte Vorlage taugt nicht - aussortiert: {name}",
                    score=round(hit.score, 2),
                )
            except OSError as exc:  # pragma: no cover - Dateisystem
                self.log.warn(f"Vorlage nicht verschiebbar: {exc}")

    NEUE_EPISODE = 60.0   # Untergrenze; der tatsaechliche Wert kommt aus _neue_episode

    def _neue_episode(self) -> float:
        """Ab welcher Pause gilt das Warten als neuer Vorgang?

        Fest auf 60 Sekunden war das eine Schleife: eine Regel, deren Geduld
        abgelaufen ist, wird fuer regel_wirkungslos_pause (300 s) stillgelegt.
        Kommt sie danach zurueck, liegt der letzte Treffer 300 Sekunden
        zurueck - also mehr als 60, also "neuer Vorgang", also wieder volle
        Geduld. Ein wirklich haengender Bildschirm wurde so nie als haengend
        behandelt. Die Grenze muss darum ueber der Stilllegungspause liegen.
        """
        pause = float(getattr(self.cfg, "regel_wirkungslos_pause", 300.0) or 300.0)
        return max(self.NEUE_EPISODE, pause * 2.0)

    def _noch_geduldig(self, rule) -> bool:
        """Darf diese Regel gerade beliebig oft greifen, ohne zu wirken?

        'geduldig: true' heisst unbegrenzt, eine Zahl heisst so viele Sekunden.
        Die Grenze ist wichtig: ein Ladebildschirm, der laedt, wird von allein
        fertig - einer, der haengt, nicht. Ohne Grenze wartet der Bot vor einem
        eingefrorenen Balken bis in alle Ewigkeit.
        """
        wert = getattr(rule, "geduldig", False)
        if wert is False or wert is None:
            return False
        jetzt = self._clock()
        seit, zuletzt = self._geduld.get(rule.name, (jetzt, jetzt))
        # NEUE_EPISODE darf nicht groesser sein als die Pause, mit der eine
        # Regel stillgelegt wird - sonst gilt nach jeder Pause wieder ein
        # frischer Vorgang, und ein wirklich haengender Bildschirm wird nie als
        # solcher behandelt.
        if jetzt - zuletzt > self._neue_episode():
            seit = jetzt          # war lange nicht dran: neuer Vorgang
        self._geduld[rule.name] = (seit, jetzt)
        if wert is True:
            return True
        grenze = float(wert)
        if grenze <= 0 or jetzt - seit < grenze:
            return True
        self.bump("geduld-am-ende")
        self.log.warn(
            f"Regel '{rule.name}' wartet zu lange - ab jetzt als haengend behandeln",
            sekunden=int(jetzt - seit),
        )
        return False

    def _regel_ausser_rand(self, rule) -> bool:
        """Eine Regel, die staendig greift, kommt offensichtlich nicht weiter.

        Die Pruefung auf gleiche Ansicht reicht dafuer nicht: schaukeln sich
        zwei Bildschirme gegenseitig auf, sieht jeder Durchgang anders aus und
        trotzdem passiert nichts. Am 31.07. griff 'blauer-knopf-generisch' so
        sechzehnmal in drei Minuten. Wer im Zeitfenster zu oft dran war, macht
        Pause - unabhaengig davon, was das Bild sagt.
        """
        grenze = int(getattr(self.cfg, "regel_hoechstens_je_fenster", 0) or 0)
        if grenze <= 0:
            return False
        fenster = float(getattr(self.cfg, "regel_fenster", 300.0))
        jetzt = self._clock()
        zeiten = [t for t in self._regel_zeiten.get(rule.name, []) if jetzt - t < fenster]
        if len(zeiten) < grenze:
            zeiten.append(jetzt)
            self._regel_zeiten[rule.name] = zeiten
            return False
        self._regel_zeiten[rule.name] = []
        pause = float(getattr(self.cfg, "regel_wirkungslos_pause", 300.0))
        self._regel_pause[rule.name] = jetzt + pause
        self.bump("regel-gebremst")
        self.log.warn(
            f"Regel '{rule.name}' laeuft im Kreis - Pause",
            treffer=len(zeiten), in_sekunden=int(fenster), pause_sekunden=int(pause),
        )
        return True

    @staticmethod
    def _ansicht_finger(screen: Image) -> bytes:
        """Grobe Kennung der Ansicht - unempfindlich gegen Zappeleien.

        `_track_change` schaut auf das ganze Bild und meldet darum nie einen
        Haenger: die Serverzeit tickt, Banner wackeln, irgendwas bewegt sich
        immer. Stark verkleinert und grob gerastert bleibt davon nichts uebrig
        - ein wirklich anderer Bildschirm faellt trotzdem sofort auf.
        """
        klein = screen.to_gray().box_scale(16, 28)
        return bytes(b // 24 for b in klein.data)

    def _festgefahren(self, screen: Image) -> bool:
        """Seit zu vielen Schritten dieselbe Ansicht? Dann hier raus.

        Ohne das bleibt der Bot an einem Vollbild wie 'Taegliche Aufgaben'
        haengen: eine Regel greift dort immer wieder, setzt die Zaehler fuer
        'unbekannter Bildschirm' zurueck und tippt doch nichts Wirksames.
        Diese Pruefung laeuft vor allen Regeln und sieht nur auf das Bild.
        """
        finger = self._ansicht_finger(screen)
        self._finger_jetzt = finger
        grenze = int(getattr(self.cfg, "festgefahren_schritte", 0) or 0)
        if grenze <= 0:
            return False
        if finger != self._ansicht_letzte:
            self._ansicht_letzte = finger
            self.gleiche_ansicht = 0
            return False
        self.gleiche_ansicht += 1
        if self.gleiche_ansicht < grenze:
            return False
        self.gleiche_ansicht = 0
        self.bump("festgefahren")
        self.log.warn(
            "Seit vielen Schritten dieselbe Ansicht - Ausweg suchen",
            schritte=grenze,
        )
        self.save_shot("festgefahren", screen)
        if self.cfg.on_unknown:
            self._ausweg_suchen("festgefahren")
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
        if self.cfg.template_skalen:
            self.log.info(
                "Selbst vermessene Vorlagen",
                vorlagen=", ".join(
                    f"{n}={v:g}" for n, v in sorted(self.cfg.template_skalen.items())
                ),
            )
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
