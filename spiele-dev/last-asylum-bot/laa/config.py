"""Konfiguration laden und prüfen (JSON, kommentarfrei)."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .image import Image


class ConfigError(ValueError):
    pass


@dataclass
class Rule:
    name: str
    match: Dict[str, Any]
    do: List[Any]
    priority: int = 50
    cooldown: float = 0.0
    once: bool = False
    enabled: bool = True
    # Regeln, die absichtlich immer wieder dasselbe tun: warten. Die Bremsen
    # gegen Endlos-Schleifen wuerden genau die stilllegen - ein Ladebildschirm
    # sieht nun einmal minutenlang gleich aus, und das ist kein Fehler.
    #   false  - normale Regel
    #   true   - unbegrenzt geduldig
    #   <Zahl> - so viele Sekunden geduldig, danach gilt der Bildschirm als
    #            haengend und die ueblichen Auswege greifen wieder. Ohne diese
    #            Grenze wuerde der Bot vor einem eingefrorenen Ladebalken bis
    #            in alle Ewigkeit warten.
    geduldig: Any = False


@dataclass
class Task:
    name: str
    every: float
    do: List[Any]
    at_start: bool = False
    priority: int = 100
    enabled: bool = True
    wochentage: Optional[List[int]] = None   # 0 = Montag … 6 = Sonntag
    stunden: Optional[List[List[int]]] = None  # [[18, 23]] = 18:00 bis 23:59


@dataclass
class Config:
    path: str
    package: str = ""
    activity: Optional[str] = None
    base_width: int = 1080
    default_threshold: float = 0.85
    loop_delay: List[float] = field(default_factory=lambda: [1.0, 2.0])
    # EIN Regler fuer das Tempo. Die Konfiguration hat 186 Wartepunkte mit
    # zusammen rund 347 Sekunden - das ist der groesste Zeitfresser, groesser
    # als die gesamte Bilderkennung. Statt 186 Zahlen einzeln zu aendern (und
    # dabei die Verhaeltnisse zu zerstoeren) werden hier alle mit demselben
    # Faktor gestreckt oder gestaucht.
    #   1.0  = wie geschrieben
    #   0.5  = doppelt so schnell
    # Die Untergrenze verhindert, dass Wartezeiten, die eine Animation
    # abdecken sollen, auf null zusammenfallen - dann tippt der Bot, bevor der
    # Bildschirm ueberhaupt umgeschaltet hat.
    tempo: float = 1.0
    tempo_untergrenze: float = 0.35   # Sekunden, unter die keine echte Wartezeit faellt
    stuck_seconds: float = 240.0
    festgefahren_schritte: int = 15  # so viele Schritte gleiche Ansicht = Ausweg suchen
    regel_wirkungslos_grenze: int = 3   # so oft darf eine Regel folgenlos greifen
    regel_wirkungslos_pause: float = 300.0
    # Fuenf Treffer je Fenster reichen fuer jede sinnvolle Regel. Bei acht kam
    # 'blauer-knopf-generisch' am 31.07. auf 26 Treffer in zwanzig Minuten,
    # ohne dass die Bremse je ausloeste - sechs bis sieben je Fenster.
    regel_hoechstens_je_fenster: int = 5   # so oft darf eine Regel im Fenster greifen
    regel_fenster: float = 300.0
    regel_vorrang: int = 190  # ab dieser Priorität schlägt eine Regel jede fällige Aufgabe
    on_stuck: List[Any] = field(default_factory=list)
    on_unknown: List[Any] = field(default_factory=list)
    templates_dir: str = "templates"
    input_method: str = "input"
    ui_skala: float = 1.0  # zusaetzlicher Faktor, vom Bot selbst kalibriert
    # Zeitstempel der zuletzt ausgewerteten Protokollzeile. Ohne den zaehlen
    # dieselben alten Laeufe bei jeder Takt-Anpassung erneut mit.
    takte_stand: float = 0.0
    template_skalen: Dict[str, float] = field(default_factory=dict)
    kritische_templates: List[str] = field(default_factory=list)
    erkunden: bool = True          # feststeckend selbst einen Knopf probieren
    erkunden_hoechstens: int = 6   # so viele Versuche je Bildschirm
    texte: Dict[str, List[str]] = field(default_factory=dict)
    tabu_regionen: List[List[float]] = field(default_factory=list)
    tabu_namen: List[str] = field(default_factory=list)
    rules: List[Rule] = field(default_factory=list)
    tasks: List[Task] = field(default_factory=list)
    offene_templates: List[str] = field(default_factory=list)
    _templates: Dict[str, Image] = field(default_factory=dict, repr=False)

    # ------------------------------------------------------------------- Laden
    @classmethod
    def load(cls, path: str) -> "Config":
        with open(path, "r", encoding="utf-8") as fh:
            try:
                raw = json.load(fh)
            except json.JSONDecodeError as exc:
                raise ConfigError(f"{path}: ungültiges JSON – {exc}") from exc
        return cls.from_dict(raw, path)

    @classmethod
    def from_dict(cls, raw: Dict[str, Any], path: str = "<inline>") -> "Config":
        cfg = cls(path=path)
        cfg.package = raw.get("package", "")
        cfg.activity = raw.get("activity")
        cfg.base_width = int(raw.get("base_width", 1080))
        cfg.default_threshold = float(raw.get("default_threshold", 0.85))
        delay = raw.get("loop_delay", [1.0, 2.0])
        if isinstance(delay, (int, float)):
            delay = [float(delay), float(delay)]
        cfg.loop_delay = [float(delay[0]), float(delay[-1])]
        cfg.tempo = max(0.1, min(3.0, float(raw.get("tempo", 1.0))))
        cfg.tempo_untergrenze = float(raw.get("tempo_untergrenze", 0.35))
        cfg.stuck_seconds = float(raw.get("stuck_seconds", 240))
        cfg.festgefahren_schritte = int(raw.get("festgefahren_schritte", 15))
        cfg.regel_wirkungslos_grenze = int(raw.get("regel_wirkungslos_grenze", 3))
        cfg.regel_wirkungslos_pause = float(raw.get("regel_wirkungslos_pause", 300))
        cfg.regel_hoechstens_je_fenster = int(raw.get("regel_hoechstens_je_fenster", 5))
        cfg.regel_fenster = float(raw.get("regel_fenster", 300))
        cfg.regel_vorrang = int(raw.get("regel_vorrang", 190))
        cfg.on_stuck = raw.get("on_stuck", [])
        cfg.on_unknown = raw.get("on_unknown", [])
        cfg.templates_dir = raw.get("templates_dir", "templates")
        cfg.input_method = raw.get("input_method", "input")
        cfg.ui_skala = float(raw.get("ui_skala", 1.0))
        cfg.takte_stand = float(raw.get("takte_stand", 0.0))
        cfg.template_skalen = {
            str(k): float(v) for k, v in raw.get("template_skalen", {}).items()
        }
        cfg.kritische_templates = list(raw.get("kritische_templates", []))
        cfg.erkunden = bool(raw.get("erkunden", True))
        cfg.erkunden_hoechstens = int(raw.get("erkunden_hoechstens", 6))
        cfg.texte = {k: list(v) for k, v in raw.get("texte", {}).items()}
        for zone in raw.get("tabu_regionen", []):
            if isinstance(zone, dict):
                cfg.tabu_regionen.append(list(zone["box"]))
                cfg.tabu_namen.append(str(zone.get("name", zone["box"])))
            else:
                cfg.tabu_regionen.append(list(zone))
                cfg.tabu_namen.append(str(zone))

        for i, item in enumerate(raw.get("rules", [])):
            name = item.get("name") or f"regel-{i + 1}"
            if "match" not in item:
                raise ConfigError(f"Regel '{name}': Feld 'match' fehlt")
            if not item.get("do"):
                raise ConfigError(f"Regel '{name}': Feld 'do' fehlt oder leer")
            cfg.rules.append(
                Rule(
                    name=name,
                    match=item["match"],
                    do=list(item["do"]),
                    priority=int(item.get("priority", 50)),
                    cooldown=float(item.get("cooldown", 0.0)),
                    once=bool(item.get("once", False)),
                    enabled=bool(item.get("enabled", True)),
                    geduldig=item.get("geduldig", False),
                )
            )
        cfg.rules.sort(key=lambda r: -r.priority)

        for i, item in enumerate(raw.get("tasks", [])):
            name = item.get("name") or f"aufgabe-{i + 1}"
            if not item.get("do"):
                raise ConfigError(f"Aufgabe '{name}': Feld 'do' fehlt oder leer")
            cfg.tasks.append(
                Task(
                    name=name,
                    every=float(item.get("every", 900)),
                    do=list(item["do"]),
                    at_start=bool(item.get("at_start", False)),
                    priority=int(item.get("priority", 100)),
                    enabled=bool(item.get("enabled", True)),
                    wochentage=list(item["wochentage"]) if item.get("wochentage") else None,
                    stunden=[list(f) for f in item["stunden"]] if item.get("stunden") else None,
                )
            )
        return cfg

    # --------------------------------------------------------------- Templates
    @property
    def root(self) -> str:
        return os.path.dirname(os.path.abspath(self.path)) if self.path != "<inline>" else os.getcwd()

    def template_path(self, name: str) -> str:
        if os.path.isabs(name):
            return name
        return os.path.join(self.root, self.templates_dir, name)

    def template_gruppe(self, muster: str) -> List[str]:
        """Alle Dateien zu einem Muster wie 'gelernt/blasen/*.png'.

        Damit nimmt der Bot selbst gelernte Vorlagen sofort in Betrieb, ohne
        dass jemand die Konfiguration anfassen muss.
        """
        import glob as _glob

        treffer = sorted(_glob.glob(self.template_path(muster)))
        wurzel = os.path.join(self.root, self.templates_dir) + os.sep
        return [t[len(wurzel):].replace(os.sep, "/") for t in treffer if t.startswith(wurzel)]

    def template(self, name: str, optional: bool = False) -> Optional[Image]:
        """Template laden. `optional=True` → None statt Fehler, wenn die Datei fehlt."""
        if name not in self._templates:
            path = self.template_path(name)
            if not os.path.exists(path):
                if optional:
                    return None
                raise ConfigError(
                    f"Template '{name}' fehlt ({path}). "
                    "Mit `bot.py capture` + `bot.py crop` anlegen."
                )
            self._templates[name] = Image.load(path)
        return self._templates[name]

    def scale_for(self, screen_width: int) -> float:
        """Faktor, mit dem Vorlagen skaliert werden.

        Die Breite allein reicht nicht: dieses Spiel bemisst seine Oberflaeche
        an der Bildhoehe. In einem flacheren Fenster ist bei gleicher Breite
        alles kleiner. `ui_skala` faengt das ab und wird vom Bot selbst
        kalibriert (siehe Aktion 'kalibriere').
        """
        breite = screen_width / float(self.base_width) if self.base_width else 1.0
        return breite * self.ui_skala

    def scale_for_template(self, name: str, screen_width: int) -> float:
        """Faktor fuer eine einzelne Vorlage.

        Die Vorlagen stammen aus verschiedenen Quellen: manche wurden am
        grossen Handy geschnitten, andere spaeter am Emulator neu aufgenommen.
        Ein einziger Faktor fuer alle passt dann nie zu beiden. Darum darf sich
        jede Vorlage einen eigenen Nachschlag merken (1.0 = nichts extra), den
        der Bot beim Danebengreifen selbst ermittelt.
        """
        return self.scale_for(screen_width) * float(self.template_skalen.get(name, 1.0))

    # ------------------------------------------------------------------ Prüfen
    def validate(self) -> List[str]:
        """Harte Probleme zurückgeben. Fehlende *optionale* Templates landen
        in `self.offene_templates` – die blockieren den Start nicht."""
        problems: List[str] = []
        self.offene_templates = []
        known_actions = {
            "tap_match", "tap_template", "tap", "tap_first", "tap_alle", "swipe", "drag", "key", "sleep",
            "wait_template", "start_app", "stop_app", "restart_app", "log",
            "screenshot", "repeat", "stop", "back", "run_task", "type_text", "wenn",
            "lerne_objekte", "optimiere_takte", "kalibriere", "selbst_aktualisieren", "selbstbericht",
            "lebenszeichen", "ansicht_sammeln",
        }
        task_names = {t.name for t in self.tasks}

        def check_actions(where: str, actions: List[Any]) -> None:
            for act in actions:
                if not isinstance(act, dict) or len(act) != 1:
                    problems.append(
                        f"{where}: Aktion muss ein Objekt mit genau einem Schlüssel sein, "
                        f"ist {act!r}"
                    )
                    continue
                key, value = next(iter(act.items()))
                if key not in known_actions:
                    problems.append(f"{where}: unbekannte Aktion '{key}'")
                    continue
                if key == "repeat":
                    check_actions(f"{where}>repeat", value.get("do", []))
                elif key == "wenn":
                    check_match(f"{where}>wenn", value.get("match", {}))
                    check_actions(f"{where}>wenn>dann", value.get("dann", []))
                    check_actions(f"{where}>wenn>sonst", value.get("sonst", []))
                elif key == "run_task" and value not in task_names:
                    problems.append(f"{where}: run_task '{value}' gibt es nicht")
                elif key == "tap_alle":
                    if isinstance(value, dict) and "farbknopf" in value:
                        pass  # Farbsuche braucht keine Vorlage
                    else:
                        self._check_template(f"{where}>tap_alle", value, problems)
                elif key in ("tap_template", "wait_template"):
                    self._check_template(f"{where}>{key}", value, problems)
                elif key == "tap_first":
                    for cand in value.get("of", []):
                        spec = {"template": cand} if isinstance(cand, str) else dict(cand)
                        spec.setdefault("optional", True)  # tap_first hat immer einen Ersatzweg
                        self._check_template(f"{where}>tap_first", spec, problems)
                elif key == "type_text":
                    pool = value.get("pool") if isinstance(value, dict) else None
                    if pool and pool not in self.texte:
                        problems.append(f"{where}: Text-Topf '{pool}' fehlt unter 'texte'")

        def check_match(where: str, cond: Dict[str, Any]) -> None:
            if not isinstance(cond, dict):
                problems.append(f"{where}: Bedingung muss ein Objekt sein")
                return
            for combi in ("any", "all"):
                if combi in cond:
                    for sub in cond[combi]:
                        check_match(f"{where}>{combi}", sub)
                    return
            if "not" in cond:
                check_match(f"{where}>not", cond["not"])
                return
            if "template" in cond:
                self._check_template(where, cond, problems)
            elif "pixel" in cond:
                if "rgb" not in cond:
                    problems.append(f"{where}: 'pixel' braucht 'rgb'")
            elif "farbknopf" in cond:
                if not isinstance(cond["farbknopf"], dict):
                    problems.append(f"{where}: 'farbknopf' braucht ein Objekt mit 'rgb'")
            elif "app_im_vordergrund" in cond:
                pass
            elif "zahl" in cond:
                spec = cond["zahl"]
                if not isinstance(spec, dict):
                    problems.append(f"{where}: 'zahl' braucht ein Objekt")
                elif not ("mindestens" in spec or "hoechstens" in spec):
                    # Eine Zahl ohne Grenze zu lesen und dann immer wahr zu
                    # sein, ist mit Sicherheit nicht gemeint.
                    problems.append(f"{where}: 'zahl' braucht 'mindestens' oder 'hoechstens'")
            elif "always" not in cond:
                problems.append(
                    f"{where}: Bedingung ohne template/pixel/farbknopf/zahl/"
                    f"app_im_vordergrund/always")

        for rule in self.rules:
            check_match(f"Regel '{rule.name}'", rule.match)
            check_actions(f"Regel '{rule.name}'", rule.do)
        for task in self.tasks:
            check_actions(f"Aufgabe '{task.name}'", task.do)
        check_actions("on_stuck", self.on_stuck)
        check_actions("on_unknown", self.on_unknown)
        return problems

    def _check_template(self, where: str, spec: Any, problems: List[str]) -> None:
        name = spec.get("template") if isinstance(spec, dict) else spec
        if not name:
            problems.append(f"{where}: 'template' fehlt")
            return
        if "*" in name:  # Muster – die Dateien entstehen erst zur Laufzeit
            return
        if os.path.exists(self.template_path(name)):
            return
        if isinstance(spec, dict) and spec.get("optional"):
            if name not in self.offene_templates:
                self.offene_templates.append(name)
            return
        problems.append(f"{where}: Template-Datei fehlt → {self.template_path(name)}")
