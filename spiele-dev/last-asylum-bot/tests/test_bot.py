"""Tests ohne Android-Gerät: python3 -m unittest discover -s tests -v"""

from __future__ import annotations

import os
import glob
import json
import random
import sys
import time
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from laa import matcher  # noqa: E402
from laa.adb import FakeDevice, ascii_fallback, decode_screencap  # noqa: E402
from laa.config import Config, ConfigError, Rule  # noqa: E402
from laa.engine import Engine, StopRun  # noqa: E402
from laa.image import Image  # noqa: E402
from laa.log import Logger  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def noise(width: int, height: int, seed: int) -> Image:
    rng = random.Random(seed)
    return Image(
        width, height, "RGB", bytearray(rng.randrange(256) for _ in range(width * height * 3))
    )


def paste(dst: Image, src: Image, x: int, y: int) -> None:
    for j in range(src.height):
        s = (j * src.width) * 3
        d = ((y + j) * dst.width + x) * 3
        dst.data[d : d + src.width * 3] = src.data[s : s + src.width * 3]
    dst._gray = None
    dst._skalen = None


def motor(bildpfad, cfg=None):
    """Engine mit der echten Konfiguration - so sieht der Bot es wirklich.

    Wichtig gegenueber matcher.find: die Engine bringt base_width, ui_skala und
    die selbst gemessenen Vorlagen-Groessen mit. Wer daran vorbei misst, prueft
    seine eigene Vermutung.
    """
    from laa.adb import FakeDevice as _FD
    if cfg is None:
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
    eng = Engine(cfg, _FD([Image.new(10, 10)], loop=True), logger=quiet(),
                 sleep=lambda s: None, seed=1)
    eng.screen = Image.load(bildpfad)
    return eng


def quiet() -> Logger:
    return Logger(level="error", color=False)


class TestImage(unittest.TestCase):
    def test_png_roundtrip_rgb(self):
        img = noise(23, 17, 1)
        again = Image.from_png(img.to_png())
        self.assertEqual((again.width, again.height, again.mode), (23, 17, "RGB"))
        self.assertEqual(bytes(again.data), bytes(img.data))

    def test_png_roundtrip_gray(self):
        gray = noise(9, 11, 2).to_gray()
        again = Image.from_png(gray.to_png())
        self.assertEqual(again.mode, "L")
        self.assertEqual(bytes(again.data), bytes(gray.data))

    def test_crop_and_scale(self):
        img = noise(40, 30, 3)
        cut = img.crop(10, 5, 12, 8)
        self.assertEqual((cut.width, cut.height), (12, 8))
        self.assertEqual(cut.pixel(0, 0), img.pixel(10, 5))
        small = img.scale(20, 15)
        self.assertEqual((small.width, small.height), (20, 15))

    def test_crop_klemmt_an_den_rand(self):
        img = noise(20, 20, 4)
        cut = img.crop(15, 15, 50, 50)
        self.assertEqual((cut.width, cut.height), (5, 5))

    def test_gray_wird_zwischengespeichert(self):
        img = noise(12, 12, 5)
        self.assertIs(img.to_gray(), img.to_gray())

    def test_diff_ratio(self):
        a = noise(30, 30, 6)
        self.assertEqual(a.diff_ratio(a), 0.0)
        self.assertGreater(a.diff_ratio(noise(30, 30, 7)), 0.3)


class TestMatcher(unittest.TestCase):
    def test_findet_template_an_der_richtigen_stelle(self):
        screen = noise(300, 200, 10)
        tpl = noise(24, 18, 11)
        paste(screen, tpl, 137, 88)
        hit = matcher.find(screen, tpl, threshold=0.9)
        self.assertIsNotNone(hit)
        self.assertEqual((hit.x, hit.y), (137, 88))
        self.assertGreater(hit.score, 0.99)
        self.assertEqual(hit.center, (137 + 12, 88 + 9))

    def test_kein_treffer_wenn_nicht_vorhanden(self):
        screen = noise(200, 160, 12)
        self.assertIsNone(matcher.find(screen, noise(20, 20, 13), threshold=0.9))

    def test_region_grenzt_die_suche_ein(self):
        screen = noise(240, 240, 14)
        tpl = noise(20, 20, 15)
        paste(screen, tpl, 20, 20)
        self.assertIsNotNone(matcher.find(screen, tpl, 0.9, region=[0.0, 0.0, 0.5, 0.5]))
        self.assertIsNone(matcher.find(screen, tpl, 0.9, region=[0.6, 0.6, 1.0, 1.0]))

    def test_find_all_liefert_mehrere_treffer(self):
        screen = noise(300, 300, 16)
        tpl = noise(22, 22, 17)
        paste(screen, tpl, 30, 40)
        paste(screen, tpl, 200, 210)
        hits = matcher.find_all(screen, tpl, threshold=0.9, limit=5)
        self.assertEqual(len(hits), 2)
        self.assertEqual({(h.x, h.y) for h in hits}, {(30, 40), (200, 210)})

    def test_pixel_matches(self):
        img = Image.new(10, 10, (10, 200, 40))
        self.assertTrue(matcher.pixel_matches(img, 0.5, 0.5, (10, 200, 40)))
        self.assertFalse(matcher.pixel_matches(img, 0.5, 0.5, (200, 10, 40), tolerance=20))

    def test_resolve_region_relativ_und_absolut(self):
        self.assertEqual(matcher.resolve_region([0.0, 0.0, 0.5, 0.5], 100, 200), (0, 0, 50, 100))
        self.assertEqual(matcher.resolve_region([10, 20, 30, 40], 100, 200), (10, 20, 30, 40))


class TestScreencap(unittest.TestCase):
    def test_dekodiert_rohformat(self):
        w, h = 4, 3
        header = (w).to_bytes(4, "little") + (h).to_bytes(4, "little") + (1).to_bytes(4, "little")
        raw = bytes(range(256))[: w * h * 4].ljust(w * h * 4, b"\x00")
        img = decode_screencap(header + raw)
        self.assertEqual((img.width, img.height), (4, 3))

    def test_dekodiert_langen_header(self):
        w, h = 2, 2
        header = b"".join(v.to_bytes(4, "little") for v in (w, h, 1, 0))
        img = decode_screencap(header + b"\x11" * (w * h * 4))
        self.assertEqual((img.width, img.height), (2, 2))

    def test_dekodiert_png(self):
        blob = noise(6, 5, 20).to_png()
        self.assertEqual(decode_screencap(blob).width, 6)


class TestAsciiFallback(unittest.TestCase):
    def test_umlaute_werden_ersetzt(self):
        self.assertEqual(ascii_fallback("Grüezi schöne Wälder"), "Grueezi schoene Waelder")

    def test_emojis_fallen_weg(self):
        self.assertEqual(ascii_fallback("Hallo 👋 Welt"), "Hallo  Welt")


class TestConfig(unittest.TestCase):
    def test_echte_konfiguration_ist_gueltig(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        self.assertEqual(cfg.validate(), [])
        self.assertEqual(cfg.package, "com.phs.global")
        self.assertTrue(cfg.rules)
        self.assertTrue(cfg.tabu_regionen)

    def test_meldet_unbekannte_aktion(self):
        cfg = Config.from_dict(
            {"rules": [{"name": "x", "match": {"always": True}, "do": [{"zaubern": 1}]}]}
        )
        self.assertTrue(any("zaubern" in p for p in cfg.validate()))

    def test_meldet_fehlendes_do(self):
        with self.assertRaises(ConfigError):
            Config.from_dict({"rules": [{"name": "x", "match": {"always": True}}]})

    def test_optionales_template_blockiert_nicht(self):
        cfg = Config.from_dict(
            {
                "rules": [
                    {
                        "name": "x",
                        "match": {"template": "gibtsnicht.png", "optional": True},
                        "do": [{"sleep": 1}],
                    }
                ]
            }
        )
        self.assertEqual(cfg.validate(), [])
        self.assertIn("gibtsnicht.png", cfg.offene_templates)

    def test_pflicht_template_wird_gemeldet(self):
        cfg = Config.from_dict(
            {"rules": [{"name": "x", "match": {"template": "fehlt.png"}, "do": [{"sleep": 1}]}]}
        )
        self.assertTrue(any("fehlt.png" in p for p in cfg.validate()))


class TestEngine(unittest.TestCase):
    def bau(self, raw, frames, **kw):
        cfg = Config.from_dict(raw)
        dev = FakeDevice(frames, loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=7, **kw)
        return cfg, dev, eng

    def test_regel_greift_und_tippt_den_treffer(self):
        tpl = noise(20, 20, 30)
        screen = noise(200, 300, 31)
        paste(screen, tpl, 60, 100)
        cfg, dev, eng = self.bau(
            {
                "base_width": 200,
                "rules": [
                    {"name": "treffer", "match": {"template": "t.png"}, "do": [{"tap_match": {}}]}
                ],
            },
            [screen],
        )
        cfg._templates["t.png"] = tpl
        eng.step()
        self.assertEqual(len(dev.taps), 1)
        x, y = dev.taps[0]
        self.assertLess(abs(x - 70), 8)
        self.assertLess(abs(y - 110), 8)

    def test_prioritaet_entscheidet(self):
        screen = noise(120, 200, 32)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {"name": "leise", "priority": 10, "match": {"always": True}, "do": [{"log": "b"}]},
                    {"name": "laut", "priority": 90, "match": {"always": True}, "do": [{"key": "A"}]},
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["A"])

    def test_cooldown_bremst_die_regel(self):
        clock = {"t": 0.0}
        screen = noise(120, 200, 33)
        cfg = Config.from_dict(
            {"rules": [{"name": "r", "cooldown": 10, "match": {"always": True}, "do": [{"key": "A"}]}]}
        )
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, clock=lambda: clock["t"], seed=1)
        eng.step()
        clock["t"] = 3.0
        eng.step()
        self.assertEqual(dev.keys, ["A"])
        clock["t"] = 20.0
        eng.step()
        self.assertEqual(dev.keys, ["A", "A"])

    def test_once_laeuft_nur_einmal(self):
        screen = noise(120, 200, 34)
        cfg, dev, eng = self.bau(
            {"rules": [{"name": "r", "once": True, "match": {"always": True}, "do": [{"key": "A"}]}]},
            [screen],
        )
        eng.step()
        eng.step()
        self.assertEqual(dev.keys, ["A"])

    def test_aufgabe_startet_sofort_und_hat_vorrang(self):
        screen = noise(120, 200, 35)
        cfg, dev, eng = self.bau(
            {
                "rules": [{"name": "r", "match": {"always": True}, "do": [{"key": "REGEL"}]}],
                "tasks": [{"name": "a", "every": 999, "at_start": True, "do": [{"key": "AUFGABE"}]}],
            },
            [screen],
        )
        eng.step()
        eng.step()
        self.assertEqual(dev.keys, ["AUFGABE", "REGEL"])

    def test_deaktivierte_aufgabe_laeuft_nie(self):
        screen = noise(120, 200, 36)
        cfg, dev, eng = self.bau(
            {
                "tasks": [
                    {"name": "aus", "every": 1, "at_start": True, "enabled": False,
                     "do": [{"key": "NEIN"}]}
                ]
            },
            [screen],
        )
        eng.step()
        eng.step()
        self.assertEqual(dev.keys, [])

    def test_tabu_zone_blockiert_kauf_tipp(self):
        screen = noise(200, 400, 37)
        cfg, dev, eng = self.bau(
            {
                "tabu_regionen": [{"name": "Shop", "box": [0.6, 0.0, 1.0, 0.1]}],
                "rules": [
                    {"name": "shop", "match": {"always": True}, "do": [{"tap": [0.9, 0.05]}]}
                ],
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.taps, [])
        self.assertEqual(eng.stats.get("tabu-blockiert"), 1)

    def test_tipp_ausserhalb_der_tabu_zone_geht_durch(self):
        screen = noise(200, 400, 38)
        cfg, dev, eng = self.bau(
            {
                "tabu_regionen": [{"name": "Shop", "box": [0.6, 0.0, 1.0, 0.1]}],
                "rules": [{"name": "ok", "match": {"always": True}, "do": [{"tap": [0.5, 0.5]}]}],
            },
            [screen],
        )
        eng.step()
        self.assertEqual(len(dev.taps), 1)

    def test_type_text_waehlt_aus_dem_topf_und_wiederholt_sich_nicht(self):
        screen = noise(120, 200, 39)
        cfg, dev, eng = self.bau(
            {
                "texte": {"p": ["eins", "zwei"]},
                "rules": [
                    {"name": "r", "match": {"always": True}, "do": [{"type_text": {"pool": "p"}}]}
                ],
            },
            [screen],
        )
        eng.step()
        eng.step()
        self.assertEqual(len(dev.texts), 2)
        self.assertNotEqual(dev.texts[0], dev.texts[1])

    def test_tap_first_nimmt_den_ersatzpunkt(self):
        screen = noise(200, 400, 40)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {
                        "name": "r",
                        "match": {"always": True},
                        "do": [{"tap_first": {"of": ["fehlt.png"], "fallback": [0.5, 0.9]}}],
                    }
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(len(dev.taps), 1)
        self.assertLess(abs(dev.taps[0][1] - 360), 20)

    def test_tap_waehlt_aus_mehreren_punkten(self):
        screen = noise(200, 400, 49)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {
                        "name": "r",
                        "match": {"always": True},
                        "do": [{"tap": [[0.2, 0.2], [0.8, 0.8]]}],
                    }
                ]
            },
            [screen],
        )
        for _ in range(8):
            eng.step()
        # Beide Punkte müssen vorkommen, sonst wird nicht wirklich gestreut.
        oben = [t for t in dev.taps if t[1] < 200]
        unten = [t for t in dev.taps if t[1] >= 200]
        self.assertTrue(oben and unten, dev.taps)

    def test_drag_zieht_lang_statt_zu_wischen(self):
        screen = noise(200, 400, 50)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {"name": "r", "match": {"always": True},
                     "do": [{"drag": [0.2, 0.5, 0.8, 0.5]}]}
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.swipes, [])
        self.assertEqual(len(dev.drags), 1)
        # Ohne ausdrückliche Dauer wird lange gezogen – ein kurzer Wisch
        # bewegt die Stadtansicht nicht.
        self.assertGreaterEqual(dev.drags[0][4], 1000)

    def test_not_bedingung(self):
        screen = noise(120, 200, 41)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {
                        "name": "r",
                        "match": {"not": {"template": "fehlt.png", "optional": True}},
                        "do": [{"key": "A"}],
                    }
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["A"])

    def test_stop_beendet_den_lauf(self):
        screen = noise(120, 200, 42)
        cfg, dev, eng = self.bau(
            {"rules": [{"name": "r", "match": {"always": True}, "do": [{"stop": True}]}]},
            [screen],
        )
        eng.run(max_steps=5)
        self.assertGreaterEqual(eng.steps, 1)

    def test_repeat_wiederholt(self):
        screen = noise(120, 200, 43)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {
                        "name": "r",
                        "match": {"always": True},
                        "do": [{"repeat": {"times": 3, "do": [{"key": "A"}]}}],
                    }
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["A", "A", "A"])

    def test_max_steps_begrenzt_den_lauf(self):
        screen = noise(120, 200, 44)
        cfg, dev, eng = self.bau(
            {"rules": [{"name": "r", "match": {"always": True}, "do": [{"key": "A"}]}]},
            [screen],
        )
        eng.run(max_steps=4)
        self.assertEqual(eng.steps, 4)


    def test_dringende_regel_schlaegt_faellige_aufgabe(self):
        screen = noise(120, 200, 45)
        cfg, dev, eng = self.bau(
            {
                "regel_vorrang": 190,
                "rules": [
                    {"name": "dringend", "priority": 200, "match": {"always": True},
                     "do": [{"key": "REGEL"}]}
                ],
                "tasks": [
                    {"name": "a", "every": 999, "at_start": True, "do": [{"key": "AUFGABE"}]}
                ],
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["REGEL"])

    def test_normale_regel_wartet_auf_die_aufgabe(self):
        screen = noise(120, 200, 46)
        cfg, dev, eng = self.bau(
            {
                "regel_vorrang": 190,
                "rules": [
                    {"name": "normal", "priority": 50, "match": {"always": True},
                     "do": [{"key": "REGEL"}]}
                ],
                "tasks": [
                    {"name": "a", "every": 999, "at_start": True, "do": [{"key": "AUFGABE"}]}
                ],
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["AUFGABE"])

    def test_wenn_nimmt_den_dann_zweig(self):
        screen = noise(120, 200, 47)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {
                        "name": "r",
                        "match": {"always": True},
                        "do": [
                            {"wenn": {"match": {"always": True},
                                      "dann": [{"key": "JA"}], "sonst": [{"key": "NEIN"}]}}
                        ],
                    }
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["JA"])

    def test_wenn_nimmt_den_sonst_zweig_bei_fehlendem_template(self):
        screen = noise(120, 200, 48)
        cfg, dev, eng = self.bau(
            {
                "rules": [
                    {
                        "name": "r",
                        "match": {"always": True},
                        "do": [
                            {"wenn": {"match": {"template": "fehlt.png", "optional": True},
                                      "dann": [{"key": "JA"}], "sonst": [{"key": "NEIN"}]}}
                        ],
                    }
                ]
            },
            [screen],
        )
        eng.step()
        self.assertEqual(dev.keys, ["NEIN"])


class TestWirkungsloseTipps(unittest.TestCase):
    """Zweimal dieselbe Stelle antippen, ohne dass sich etwas ändert, ist sinnlos."""

    def test_gleicher_tipp_auf_unveraendertem_bild_wird_uebersprungen(self):
        screen = Image.new(200, 400, (30, 30, 40))
        cfg = Config.from_dict(
            {"base_width": 200,
             "rules": [{"name": "r", "match": {"always": True},
                        "do": [{"tap": [0.5, 0.5]}]}]}
        )
        dev = FakeDevice([screen], loop=True)  # Bild bleibt gleich
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4)
        for _ in range(6):
            eng.step()
        self.assertEqual(len(dev.taps), 1, f"nur der erste Tipp zählt, war {dev.taps}")
        self.assertGreaterEqual(eng.stats.get("wirkungslos", 0), 1)

    def flaeche(self, hell: bool) -> Image:
        """Bild mit einem klaren Fleck an der Tipp-Stelle – wie eine Blase,
        die verschwindet. Rauschen taugt nicht: es mittelt sich beim
        Verkleinern zu Grau und sähe überall gleich aus."""
        img = Image.new(200, 400, (30, 30, 40))
        if hell:
            for j in range(60):
                for i in range(60):
                    p = ((170 + j) * 200 + (70 + i)) * 3
                    img.data[p : p + 3] = bytes((240, 240, 240))
        img._gray = None
        return img

    def test_bei_veraendertem_bild_wird_weiter_getippt(self):
        cfg = Config.from_dict(
            {"base_width": 200,
             "rules": [{"name": "r", "match": {"always": True},
                        "do": [{"tap": [0.5, 0.5]}]}]}
        )
        # Fleck erscheint und verschwindet – wie beim Abholen, wo nach jedem
        # Tipp der nächste Eintrag nachrückt.
        dev = FakeDevice([self.flaeche(True), self.flaeche(False)], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4)
        for _ in range(4):
            eng.step()
        self.assertEqual(len(dev.taps), 4)


    def test_auch_bei_abwechselnden_zielen(self):
        """Drei Ziele reihum – der vorherige Tipp ist nie derselbe Punkt."""
        screen = Image.new(300, 600, (30, 30, 40))
        cfg = Config.from_dict(
            {"base_width": 300,
             "rules": [{"name": "r", "match": {"always": True},
                        "do": [{"tap": [0.2, 0.2]}, {"tap": [0.5, 0.5]}, {"tap": [0.8, 0.8]}]}]}
        )
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=5)
        for _ in range(5):
            eng.step()
        self.assertEqual(len(dev.taps), 3, f"jede Stelle nur einmal, war {dev.taps}")


class TestKonfigurationGepflegt(unittest.TestCase):
    """Kleine Hygiene-Prüfungen, damit die Konfiguration lesbar bleibt."""

    def lade(self):
        return json.load(open(os.path.join(ROOT, "config", "last-asylum.json"), encoding="utf-8"))

    def test_jede_aufgabe_erklaert_sich(self):
        ohne = [t["name"] for t in self.lade()["tasks"] if not t.get("_zweck")]
        self.assertEqual(ohne, [], "Aufgaben ohne _zweck")

    def test_regel_prioritaeten_sind_eindeutig(self):
        prios = [r.get("priority", 50) for r in self.lade()["rules"]]
        doppelt = {p for p in prios if prios.count(p) > 1}
        self.assertEqual(doppelt, set(), "doppelte Prioritäten machen die Reihenfolge zufällig")


class TestLeererBildschirm(unittest.TestCase):
    """Ein schwarzes Bild vom Emulator muss auffallen, nicht still bleiben."""

    def test_einfarbiges_bild_wird_erkannt(self):
        self.assertTrue(Image.new(200, 300, (0, 0, 0)).ist_einfarbig())
        self.assertTrue(Image.new(200, 300, (17, 17, 17)).ist_einfarbig())

    def test_echtes_bild_gilt_nicht_als_leer(self):
        self.assertFalse(noise(200, 300, 120).ist_einfarbig())

    def test_motor_meldet_es_als_fehler(self):
        import io

        puffer = io.StringIO()
        cfg = Config.from_dict({"rules": [{"name": "r", "match": {"always": True},
                                           "do": [{"sleep": 0}]}]})
        dev = FakeDevice([Image.new(200, 300, (0, 0, 0))], loop=True)
        eng = Engine(cfg, dev, logger=Logger(level="error", color=False, stream=puffer),
                     sleep=lambda s: None, seed=1)
        eng.step()
        self.assertIn("LEER", puffer.getvalue())


class TestTabuZonenTreffenNichtDieBedienung(unittest.TestCase):
    """Sperrzonen dürfen keine Bedienelemente verdecken."""

    def test_zurueck_pfeil_liegt_in_keiner_tabu_zone(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        # Der Zurück-Pfeil sitzt oben links; die Regeln suchen ihn in
        # [0, 0, 0.30, 0.15]. Genau dort darf nichts gesperrt sein.
        for zone, name in zip(cfg.tabu_regionen, cfg.tabu_namen):
            l, t, r, b = zone
            ueberlappt = l < 0.30 and t < 0.15 and r > 0.0 and b > 0.0
            self.assertFalse(
                ueberlappt,
                f"Zone '{name}' {zone} verdeckt den Zurück-Pfeil - der Bot käme nicht mehr zurück",
            )


class TestTabuZoneVerdecktKeineBedienung(unittest.TestCase):
    """Eine Tabu-Zone darf nur den Shop treffen, sonst nichts.

    Am 31.07. reichte sie bis y=0.145 hinunter und verdeckte damit das
    Schliesskreuz der Dialoge bei y≈0.105. Im Protokoll stand dann
    »Tipp in Tabu-Zone blockiert … grund=ui/popup_close.png«, kurz darauf
    »Regel dialog-schliessen bewirkt nichts – stillgelegt«: der Bot kam aus
    keinem Dialog mehr heraus.
    """

    def bedienpunkte(self):
        return {
            "Schliesskreuz der Dialoge": (0.905, 0.105),
            "Schliesskreuz weiter unten": (0.90, 0.13),
            "Zurueck-Pfeil oben links": (0.08, 0.04),
            "Reiter oben rechts": (0.80, 0.09),
        }

    def test_kein_bedienpunkt_liegt_in_einer_tabu_zone(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        for was, (x, y) in self.bedienpunkte().items():
            for name, (l, t, r, b) in zip(cfg.tabu_namen, cfg.tabu_regionen):
                self.assertFalse(
                    l <= x <= r and t <= y <= b,
                    f"Zone '{name}' verdeckt {was} bei x={x} y={y} - "
                    "der Bot kaeme aus Dialogen nicht mehr heraus",
                )

    def test_der_shop_bleibt_gesperrt(self):
        """Der Einkaufswagen ganz oben rechts muss weiter tabu sein."""
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        for x, y in ((0.88, 0.02), (0.95, 0.03)):
            self.assertTrue(
                any(l <= x <= r and t <= y <= b for l, t, r, b in cfg.tabu_regionen),
                f"Echtgeld-Shop bei x={x} y={y} muss gesperrt bleiben",
            )


class TestAusdauerSicherung(unittest.TestCase):
    """Ein Nachfüll-Dialog muss geschlossen, nicht bestätigt werden."""

    def test_dialog_schliessen_schlaegt_generischen_gruenknopf(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        nach_prio = {r.name: r.priority for r in cfg.rules}
        for schliesser in ("dialog-schliessen", "dialog-schliessen-hell"):
            self.assertGreater(
                nach_prio[schliesser], nach_prio["gruener-knopf-generisch"],
                f"{schliesser} muss vor dem generischen Grün-Knopf greifen, sonst "
                "bestätigt der Bot Nachfüll-Dialoge",
            )


class TestKalibrierung(unittest.TestCase):
    """Der Bot bestimmt den Größen-Faktor der Oberfläche selbst."""

    def bau(self, faktor):
        """Bildschirm, auf dem die Vorlage um `faktor` verkleinert vorkommt."""
        import shutil
        import tempfile

        ordner = tempfile.mkdtemp()
        tdir = os.path.join(ordner, "templates", "ui")
        os.makedirs(tdir)
        marke = noise(80, 80, 130)
        marke.save(os.path.join(tdir, "back_arrow.png"))
        klein = marke.box_scale(int(80 * faktor), int(80 * faktor))
        screen = noise(600, 900, 131)
        paste(screen, klein, 200, 300)
        with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
            json.dump({"base_width": 600, "ui_skala": 1.0}, fh)
        cfg = Config.load(os.path.join(ordner, "conf.json"))
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        return ordner, cfg, eng, shutil

    def test_findet_den_verkleinerungsfaktor(self):
        ordner, cfg, eng, shutil = self.bau(0.7)
        try:
            eng.run_actions([{"kalibriere": {"templates": ["ui/back_arrow.png"],
                                             "mindest_score": 0.8, "min_belege": 1}}])
            self.assertAlmostEqual(cfg.ui_skala, 0.7, delta=0.06)
            # Gelerntes gehoert NEBEN die Konfiguration: die liegt unter Git,
            # und ein veraendertes conf.json blockiert das eigene git pull.
            with open(os.path.join(ordner, "conf.json"), encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["ui_skala"], 1.0,
                                 "die Konfiguration selbst bleibt unveraendert")
            with open(os.path.join(ordner, "gelernt.json"), encoding="utf-8") as fh:
                self.assertAlmostEqual(json.load(fh)["ui_skala"], 0.7, delta=0.06)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_unveraenderte_groesse_bleibt_bei_eins(self):
        ordner, cfg, eng, shutil = self.bau(1.0)
        try:
            eng.run_actions([{"kalibriere": {"templates": ["ui/back_arrow.png"],
                                             "mindest_score": 0.8, "min_belege": 1}}])
            self.assertAlmostEqual(cfg.ui_skala, 1.0, delta=0.06)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestFestgefahren(unittest.TestCase):
    """Wer zu lange dieselbe Ansicht sieht, muss einen Ausweg versuchen.

    Der Fall aus dem echten Lauf: der Bot stand auf 'Tägliche Aufgaben'. Eine
    Regel griff dort immer wieder, setzte die Zähler für 'unbekannter
    Bildschirm' zurück und tippte doch nichts Wirksames.
    """

    def bau(self, roh):
        cfg = Config.from_dict(roh)
        screen = noise(400, 700, 5)
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
        return cfg, dev, eng

    def test_dauernd_gleiche_ansicht_loest_ausweg_aus(self):
        roh = {
            "base_width": 400,
            "festgefahren_schritte": 4,
            "on_unknown": [{"key": "KEYCODE_BACK"}],
            # Diese Regel greift auf jedem Bild und bewirkt nichts - genau die
            # Falle, die den Bot im echten Lauf festgehalten hat.
            "rules": [{"name": "immer", "match": {"always": True},
                       "do": [{"log": "nichts"}]}],
        }
        cfg, dev, eng = self.bau(roh)
        for _ in range(12):
            eng.step()
        self.assertGreaterEqual(
            eng.stats.get("festgefahren", 0), 2,
            "der Bot muss den Stillstand bemerken, obwohl staendig eine Regel greift",
        )
        self.assertIn("KEYCODE_BACK", dev.keys, "es muss ein Ausweg versucht worden sein")

    def test_wechselnde_ansicht_bleibt_unbehelligt(self):
        roh = {
            "base_width": 400,
            "festgefahren_schritte": 4,
            "on_unknown": [{"key": "KEYCODE_BACK"}],
            "rules": [{"name": "immer", "match": {"always": True},
                       "do": [{"log": "nichts"}]}],
        }
        cfg = Config.from_dict(roh)
        bilder = []
        for i in range(12):
            bild = noise(400, 700, 20 + i)
            paste(bild, Image.new(160, 160, (250, 250, 250)), 20 + i * 18, 40 + i * 40)
            bilder.append(bild)
        eng = Engine(cfg, FakeDevice(bilder, loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1)
        for _ in range(12):
            eng.step()
        self.assertEqual(eng.stats.get("festgefahren", 0), 0)

    def test_abschaltbar(self):
        cfg, dev, eng = self.bau({"base_width": 400, "festgefahren_schritte": 0,
                                  "on_unknown": [{"key": "KEYCODE_BACK"}]})
        for _ in range(12):
            eng.step()
        self.assertEqual(eng.stats.get("festgefahren", 0), 0)


class TestUnbekanntBleibtWachsam(unittest.TestCase):
    """on_unknown darf nicht nach drei Versuchen für immer verstummen."""

    def test_ausweg_wird_auch_spaet_noch_versucht(self):
        cfg = Config.from_dict({
            "base_width": 400,
            "festgefahren_schritte": 0,   # hier nur die Serie prüfen
            "on_unknown": [{"key": "KEYCODE_BACK"}],
        })
        eng = Engine(cfg, FakeDevice([noise(400, 700, 9)], loop=True),
                     logger=quiet(), sleep=lambda s: None, seed=1)
        ausloeser = []
        for i in range(1, 81):
            vorher = len(eng.dev.keys)
            eng.step()
            if len(eng.dev.keys) > vorher:
                ausloeser.append(i)
        self.assertIn(5, ausloeser)
        self.assertGreater(
            max(ausloeser), 45,
            "auch nach dem 45. Fehlgriff muss der Bot weiter einen Ausweg suchen",
        )


class TestVorlagenGroesse(unittest.TestCase):
    """Jede Vorlage darf sich eine eigene Größe merken.

    Die Vorlagen stammen aus verschiedenen Aufnahmen - eine einzige Zahl für
    alle passt dann nie zu allen. Wer wiederholt knapp danebenliegt, wird
    einzeln nachgemessen.
    """

    def bau(self, faktor):
        import shutil
        import tempfile

        ordner = tempfile.mkdtemp()
        tdir = os.path.join(ordner, "templates", "ui")
        os.makedirs(tdir)
        marke = noise(80, 80, 77)
        marke.save(os.path.join(tdir, "knopf.png"))
        screen = noise(600, 900, 78)
        paste(screen, marke.box_scale(int(80 * faktor), int(80 * faktor)), 220, 400)
        with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
            json.dump({"base_width": 600}, fh)
        cfg = Config.load(os.path.join(ordner, "conf.json"))
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        eng.capture()
        return ordner, cfg, eng, shutil

    def test_misst_eine_einzelne_vorlage_nach(self):
        ordner, cfg, eng, shutil = self.bau(0.7)
        try:
            spec = {"template": "ui/knopf.png", "threshold": 0.85}
            for _ in range(Engine.FEHLGRIFFE_BIS_NACHMESSEN - 1):
                self.assertIsNone(eng.find(spec))
            treffer = eng.find(spec)  # jetzt wird nachgemessen - und getroffen
            self.assertIsNotNone(treffer, "nach dem Nachmessen muss die Vorlage sitzen")
            self.assertAlmostEqual(cfg.template_skalen["ui/knopf.png"], 0.7, delta=0.09)
            with open(os.path.join(ordner, "gelernt.json"), encoding="utf-8") as fh:
                gespeichert = json.load(fh)["template_skalen"]["ui/knopf.png"]
            self.assertAlmostEqual(gespeichert, 0.7, delta=0.09)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_passende_vorlage_wird_nicht_angefasst(self):
        ordner, cfg, eng, shutil = self.bau(1.0)
        try:
            spec = {"template": "ui/knopf.png", "threshold": 0.85}
            for _ in range(4):
                self.assertIsNotNone(eng.find(spec))
            self.assertEqual(cfg.template_skalen, {})
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_ausreisser_bei_der_kalibrierung_bekommt_eigenen_faktor(self):
        """Eine frisch geschnittene Vorlage neben lauter alten."""
        import shutil
        import tempfile

        ordner = tempfile.mkdtemp()
        try:
            tdir = os.path.join(ordner, "templates", "ui")
            os.makedirs(tdir)
            screen = noise(600, 900, 91)
            namen = []
            for i in range(3):  # drei alte Vorlagen: im Bild um 0.7 kleiner
                m = noise(80, 80, 100 + i)
                m.save(os.path.join(tdir, f"alt{i}.png"))
                paste(screen, m.box_scale(56, 56), 60 + i * 120, 200)
                namen.append(f"ui/alt{i}.png")
            neu = noise(56, 56, 200)  # frisch geschnitten: passt schon
            neu.save(os.path.join(tdir, "neu.png"))
            paste(screen, neu, 60, 600)
            namen.append("ui/neu.png")
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                json.dump({"base_width": 600}, fh)
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=1)
            eng.run_actions([{"kalibriere": {"templates": namen, "mindest_score": 0.8}}])
            self.assertAlmostEqual(cfg.ui_skala, 0.7, delta=0.06)
            eigen = cfg.template_skalen.get("ui/neu.png")
            self.assertIsNotNone(eigen, "die neue Vorlage braucht einen eigenen Faktor")
            self.assertAlmostEqual(cfg.ui_skala * eigen, 1.0, delta=0.1)
            for n in namen[:3]:
                self.assertNotIn(n, cfg.template_skalen)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestSelbstOptimierung(unittest.TestCase):
    """Der Bot zieht seine Takte aus den eigenen Protokollen nach."""

    def bau_umgebung(self, tipps_je_lauf, takt=1800):
        import tempfile

        ordner = tempfile.mkdtemp()
        os.makedirs(os.path.join(ordner, "logs"))
        with open(os.path.join(ordner, "logs", "l.jsonl"), "w", encoding="utf-8") as fh:
            for n in tipps_je_lauf:
                fh.write('{"ev":"aufgabe","aufgabe":"probe","tipps":%d}\n' % n)
        konf = os.path.join(ordner, "conf.json")
        with open(konf, "w", encoding="utf-8") as fh:
            json.dump({"tasks": [{"name": "probe", "every": takt,
                                  "do": [{"key": "X"}]}]}, fh)
        cfg = Config.load(konf)
        dev = FakeDevice([noise(60, 80, 90)], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        return ordner, konf, cfg, eng

    def optimiere(self, eng, ordner):
        eng.run_actions([{"optimiere_takte": {
            "logs": os.path.join(ordner, "logs", "*.jsonl"), "min_laeufe": 3}}])

    def test_leerlaufende_aufgabe_wird_seltener(self):
        import shutil

        ordner, konf, cfg, eng = self.bau_umgebung([0, 0, 0, 0, 0])
        try:
            self.optimiere(eng, ordner)
            self.assertEqual(cfg.tasks[0].every, 3600)
            # Der neue Takt landet neben der Konfiguration, nicht darin -
            # sonst blockiert die geaenderte Datei das eigene git pull.
            with open(konf, encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["tasks"][0]["every"], 1800)
            with open(os.path.join(ordner, "gelernt.json"), encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["tasks"][0]["every"], 3600)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_ergiebige_aufgabe_wird_oefter(self):
        import shutil

        ordner, konf, cfg, eng = self.bau_umgebung([12, 15, 10, 14])
        try:
            self.optimiere(eng, ordner)
            self.assertEqual(cfg.tasks[0].every, 900)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_normale_aufgabe_bleibt_unangetastet(self):
        import shutil

        ordner, konf, cfg, eng = self.bau_umgebung([2, 3, 1, 2])
        try:
            self.optimiere(eng, ordner)
            self.assertEqual(cfg.tasks[0].every, 1800)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_grenzen_werden_eingehalten(self):
        import shutil

        ordner, konf, cfg, eng = self.bau_umgebung([0, 0, 0, 0], takt=80000)
        try:
            self.optimiere(eng, ordner)
            self.assertLessEqual(cfg.tasks[0].every, 86400)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestZustandUeberNeustart(unittest.TestCase):
    """Nach einem Neustart darf nicht alles erneut abgearbeitet werden."""

    def lauf(self, ordner, uhr, tick):
        cfg = Config.from_dict(
            {"tasks": [{"name": "spenden", "every": 3600, "at_start": True,
                        "do": [{"key": "SPENDE"}]}]}
        )
        dev = FakeDevice([noise(60, 80, 80)], loop=True)
        eng = Engine(
            cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
            clock=tick, now=uhr, state_file=os.path.join(ordner, "zustand.json"),
        )
        eng.step()
        return dev

    def test_zweiter_start_wiederholt_die_aufgabe_nicht(self):
        import shutil
        import tempfile

        ordner = tempfile.mkdtemp()
        try:
            zeit = {"w": 1_000_000.0, "m": 0.0}
            uhr = lambda: zeit["w"]
            tick = lambda: zeit["m"]

            erster = self.lauf(ordner, uhr, tick)
            self.assertEqual(erster.keys, ["SPENDE"], "erster Start soll laufen")

            # Absturz und Neustart zwei Minuten spaeter – viel zu frueh.
            zeit["w"] += 120
            zeit["m"] += 120
            zweiter = self.lauf(ordner, uhr, tick)
            self.assertEqual(zweiter.keys, [], "nach Neustart zu frueh wiederholt")

            # Nach Ablauf des Intervalls dagegen schon.
            zeit["w"] += 3600
            zeit["m"] += 3600
            dritter = self.lauf(ordner, uhr, tick)
            self.assertEqual(dritter.keys, ["SPENDE"])
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestSelbstLernen(unittest.TestCase):
    """Der Bot entdeckt neue Sammel-Objekte über das, was sich zwischen zwei Bildern ändert."""

    def szene(self, mit_blase: bool) -> Image:
        img = Image.new(400, 600, (40, 60, 40))
        for y in range(0, 600, 40):  # ruhiger Hintergrund mit Struktur
            for x in range(0, 400, 40):
                if (x // 40 + y // 40) % 2:
                    for j in range(40):
                        for i in range(40):
                            p = ((y + j) * 400 + (x + i)) * 3
                            img.data[p : p + 3] = bytes((60, 80, 60))
        if mit_blase:
            for j in range(80):
                for i in range(80):
                    px, py = 150 + i, 200 + j
                    p = (py * 400 + px) * 3
                    img.data[p : p + 3] = bytes((235, 240, 245))
        img._gray = None
        return img

    def test_neue_blase_wird_gelernt_und_danach_gefunden(self):
        import shutil
        import tempfile

        ordner = tempfile.mkdtemp()
        try:
            os.makedirs(os.path.join(ordner, "templates"), exist_ok=True)
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                fh.write("{}")
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            dev = FakeDevice([self.szene(True), self.szene(False)], hold=False)
            eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
            eng.run_actions([{"lerne_objekte": {"ordner": "gelernt/blasen",
                                                "min_kante": 40, "max_kante": 200,
                                                "pause": 0}}])
            ziel = os.path.join(ordner, "templates", "gelernt", "blasen")
            gelernt = sorted(os.listdir(ziel))
            self.assertTrue(gelernt, "nichts gelernt")

            # Und die gelernte Vorlage findet die Blase danach wirklich.
            tpl = Image.load(os.path.join(ziel, gelernt[0]))
            self.assertIsNotNone(matcher.find(self.szene(True), tpl, threshold=0.9))
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_muster_findet_alle_gelernten_vorlagen(self):
        import shutil
        import tempfile

        ordner = tempfile.mkdtemp()
        try:
            ziel = os.path.join(ordner, "templates", "gelernt", "blasen")
            os.makedirs(ziel)
            marke = noise(30, 30, 70)
            marke.save(os.path.join(ziel, "00.png"))
            noise(30, 30, 71).save(os.path.join(ziel, "01.png"))
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                fh.write('{"base_width": 200}')  # sonst skaliert der Motor die Vorlagen weg
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            self.assertEqual(len(cfg.template_gruppe("gelernt/blasen/*.png")), 2)

            screen = noise(200, 200, 72)
            paste(screen, marke, 80, 90)
            dev = FakeDevice([screen], loop=True)
            eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
            eng.capture()
            hit = eng.find({"template": "gelernt/blasen/*.png", "threshold": 0.9})
            self.assertIsNotNone(hit)
            self.assertEqual((hit.x, hit.y), (80, 90))
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestAllesEinsammeln(unittest.TestCase):
    """Auf einem Bildschirm liegen mehrere Blasen - alle müssen weg."""

    def test_tippt_jede_blase_einmal(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            tdir = os.path.join(ordner, "templates", "hud")
            os.makedirs(tdir)
            blase = noise(40, 40, 60)
            blase.save(os.path.join(tdir, "blase.png"))
            screen = noise(600, 900, 61)
            stellen = [(80, 120), (300, 200), (450, 640)]
            for x, y in stellen:
                paste(screen, blase, x, y)
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                json.dump({"base_width": 600}, fh)
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            dev = FakeDevice([screen], loop=True)
            eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=2)
            eng.run_actions([{"tap_alle": {"template": "hud/blase.png",
                                           "threshold": 0.9, "runden": 1}}])
            self.assertEqual(len(dev.taps), 3, f"drei Blasen, aber {len(dev.taps)} Tipps")
            for x, y in stellen:
                self.assertTrue(
                    any(abs(tx - (x + 20)) < 25 and abs(ty - (y + 20)) < 25
                        for tx, ty in dev.taps),
                    f"Blase bei {x},{y} wurde nicht angetippt",
                )
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_ohne_blase_kein_tipp(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            tdir = os.path.join(ordner, "templates", "hud")
            os.makedirs(tdir)
            noise(40, 40, 62).save(os.path.join(tdir, "blase.png"))
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                json.dump({"base_width": 600}, fh)
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            dev = FakeDevice([noise(600, 900, 63)], loop=True)
            eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=2)
            eng.run_actions([{"tap_alle": {"template": "hud/blase.png", "threshold": 0.9}}])
            self.assertEqual(dev.taps, [])
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestSelbstAktualisieren(unittest.TestCase):
    """Der Bot holt neue Fassungen selbst und startet dafür neu."""

    def bau(self):
        import shutil, subprocess, tempfile
        fern = tempfile.mkdtemp()
        subprocess.run(["git", "init", "--bare", "-q", fern], check=True)
        arbeit = tempfile.mkdtemp()
        subprocess.run(["git", "clone", "-q", fern, arbeit], check=True)
        for name, wert in (("user.email", "a@b.c"), ("user.name", "Test")):
            subprocess.run(["git", "-C", arbeit, "config", name, wert], check=True)
        with open(os.path.join(arbeit, "conf.json"), "w", encoding="utf-8") as fh:
            json.dump({"base_width": 400}, fh)
        subprocess.run(["git", "-C", arbeit, "add", "-A"], check=True)
        subprocess.run(["git", "-C", arbeit, "commit", "-qm", "erst"], check=True)
        subprocess.run(["git", "-C", arbeit, "push", "-q", "origin", "HEAD"], check=True)
        return fern, arbeit, shutil, subprocess

    def motor(self, arbeit):
        cfg = Config.load(os.path.join(arbeit, "conf.json"))
        return Engine(cfg, FakeDevice([noise(400, 700, 70)], loop=True),
                      logger=quiet(), sleep=lambda s: None, seed=1)

    def test_ohne_neuen_stand_laeuft_er_weiter(self):
        fern, arbeit, shutil, _ = self.bau()
        try:
            eng = self.motor(arbeit)
            eng.run_actions([{"selbst_aktualisieren": {}}])  # darf nicht werfen
            self.assertEqual(eng.stats.get("selbst-aktualisiert", 0), 0)
        finally:
            shutil.rmtree(fern, ignore_errors=True)
            shutil.rmtree(arbeit, ignore_errors=True)

    def test_neuer_stand_beendet_den_lauf(self):
        import tempfile
        fern, arbeit, shutil, subprocess = self.bau()
        zweit = tempfile.mkdtemp()
        try:
            # Jemand anders schiebt einen Commit nach.
            subprocess.run(["git", "clone", "-q", fern, zweit], check=True)
            for name, wert in (("user.email", "a@b.c"), ("user.name", "Test")):
                subprocess.run(["git", "-C", zweit, "config", name, wert], check=True)
            with open(os.path.join(zweit, "neu.txt"), "w", encoding="utf-8") as fh:
                fh.write("x")
            subprocess.run(["git", "-C", zweit, "add", "-A"], check=True)
            subprocess.run(["git", "-C", zweit, "commit", "-qm", "zweit"], check=True)
            subprocess.run(["git", "-C", zweit, "push", "-q", "origin", "HEAD"], check=True)

            eng = self.motor(arbeit)
            with self.assertRaises(StopRun):
                eng.run_actions([{"selbst_aktualisieren": {}}])
            self.assertEqual(eng.stats.get("selbst-aktualisiert", 0), 1)
            self.assertTrue(os.path.exists(os.path.join(arbeit, "neu.txt")),
                            "die neue Fassung muss auch wirklich angekommen sein")
        finally:
            for o in (fern, arbeit, zweit):
                shutil.rmtree(o, ignore_errors=True)

    def test_ohne_git_passiert_nichts(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                json.dump({"base_width": 400}, fh)
            eng = self.motor(ordner)
            eng.run_actions([{"selbst_aktualisieren": {}}])
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestSpielBeendenNotbremse(unittest.TestCase):
    """»Spiel beenden?« darf nie bestätigt werden."""

    def test_regel_steht_ganz_oben_und_tippt_abbrechen(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        regel = next(r for r in cfg.rules if r.name == "spiel-beenden-abbrechen")
        self.assertEqual(cfg.rules[0].name, regel.name,
                         "die Notbremse muss vor allen anderen Regeln greifen")
        # Die zuletzt geprüfte Bedingung bestimmt, wohin getippt wird -
        # das muss der blaue Abbrechen-Knopf sein, nicht der orange.
        letzte = regel.match["all"][-1]["farbknopf"]
        r, g, b = letzte["rgb"]
        self.assertGreater(b, r, "zuletzt muss der blaue Knopf geprüft werden")
        self.assertEqual(regel.do[-2], {"tap_match": {}})

    def test_durchlauf_tippt_wirklich_den_blauen_knopf(self):
        """Der Test, der die Notbremse wirklich bewacht.

        Bisher wurde nur die FORM der Regel geprueft: steht sie oben, endet sie
        mit tap_match. Ob sie auf einem echten 'Spiel beenden?' auch greift und
        wohin sie dann tippt, blieb ungeprueft - die Notbremse haette sich
        abschalten lassen, ohne dass ein Test rot wird.
        """
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        regel = next(r for r in cfg.rules if r.name == "spiel-beenden-abbrechen")
        gold = regel.match["all"][0]["farbknopf"]
        blau = regel.match["all"][-1]["farbknopf"]

        breite, hoehe = 1440, 2560
        screen = Image.new(breite, hoehe, (28, 32, 42))

        def knopf(rgb, x0, y0, w, h):
            for y in range(y0, y0 + h):
                for x in range(x0, x0 + w):
                    for k, v in enumerate(rgb):
                        screen.data[(y * breite + x) * 3 + k] = v
            # weisser Schriftbalken, wie ihn echte Knoepfe tragen
            for y in range(y0 + h // 3, y0 + 2 * h // 3):
                for x in range(x0 + w // 5, x0 + 4 * w // 5):
                    if (x - x0) % 9 < 5:
                        for k in range(3):
                            screen.data[(y * breite + x) * 3 + k] = 255

        kw, kh = int(0.25 * breite), int(0.045 * hoehe)
        blau_x, blau_y = int(0.18 * breite), int(0.5 * hoehe)
        gold_x, gold_y = int(0.58 * breite), int(0.5 * hoehe)
        knopf(blau["rgb"], blau_x, blau_y, kw, kh)   # links: Abbrechen
        knopf(gold["rgb"], gold_x, gold_y, kw, kh)   # rechts: Beenden

        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=5)
        eng.step()

        self.assertTrue(dev.taps, "auf 'Spiel beenden?' muss die Notbremse greifen")
        x, y = dev.taps[0]
        self.assertTrue(blau_x <= x <= blau_x + kw and blau_y <= y <= blau_y + kh,
                        f"getippt wurde {x},{y} - das ist nicht der blaue Abbrechen-Knopf "
                        f"(x {blau_x}..{blau_x + kw}, y {blau_y}..{blau_y + kh})")
        self.assertFalse(gold_x <= x <= gold_x + kw,
                         "der orange Beenden-Knopf darf nie getroffen werden")


class TestLernFilter(unittest.TestCase):
    """Laufschriften sind keine Ertrags-Blasen."""

    def test_langgezogenes_wird_nicht_gelernt(self):
        from laa.engine import _veraenderte_bereiche

        a = Image.new(400, 400, (20, 20, 20))
        b = Image.new(400, 400, (20, 20, 20))
        paste(b, Image.new(96, 144, (240, 240, 240)), 100, 100)   # wie die Chatzeile
        self.assertEqual(_veraenderte_bereiche(a, b, 60, 220), [])

    def test_rundes_wird_gelernt(self):
        from laa.engine import _veraenderte_bereiche

        a = Image.new(400, 400, (20, 20, 20))
        b = Image.new(400, 400, (20, 20, 20))
        paste(b, Image.new(96, 96, (240, 240, 240)), 100, 100)
        self.assertTrue(_veraenderte_bereiche(a, b, 60, 220))


class TestNachmessenVerbrauch(unittest.TestCase):
    """Fehlversuche auf dem falschen Bildschirm dürfen nicht zählen.

    Der Bot misst eine Vorlage höchstens dreimal nach. Diese Versuche
    dürfen nicht verbraucht sein, bevor er überhaupt einmal auf dem
    Bildschirm war, auf dem die Vorlage vorkommt.
    """

    def test_vorlage_nicht_im_bild_verbraucht_keinen_versuch(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            tdir = os.path.join(ordner, "templates", "nav")
            os.makedirs(tdir)
            marke = noise(60, 60, 80)
            marke.save(os.path.join(tdir, "welt.png"))
            leer = noise(500, 800, 81)          # Vorlage kommt nicht vor
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                json.dump({"base_width": 500}, fh)
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            eng = Engine(cfg, FakeDevice([leer], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=1)
            eng.capture()
            spec = {"template": "nav/welt.png", "threshold": 0.85, "optional": True}
            for _ in range(4 * Engine.FEHLGRIFFE_BIS_NACHMESSEN):
                eng.find(spec)
            self.assertLessEqual(
                eng._nachjustiert.get("nav/welt.png", 0), 1,
                "auf dem falschen Bildschirm duerfen die Versuche nicht aufgebraucht werden",
            )

            # Jetzt taucht sie auf - verkleinert. Das muss noch gefunden werden.
            treffer = noise(500, 800, 82)
            paste(treffer, marke.box_scale(42, 42), 150, 300)
            eng.dev.frames = [treffer]
            eng.capture()
            gefunden = None
            for _ in range(2 * Engine.FEHLGRIFFE_BIS_NACHMESSEN):
                gefunden = eng.find(spec)
                if gefunden:
                    break
            self.assertIsNotNone(gefunden, "die verkleinerte Vorlage muss noch vermessen werden")
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestErsatzPunkt(unittest.TestCase):
    """Jedes tap_first braucht einen Ausweg - solange die Aufgabe laeuft.

    Der Test verlangte den Ersatz-Punkt bisher ausnahmslos. Das ist einen
    Schritt zu weit: ein GERATENER Ersatz-Punkt ist schlechter als keiner. Bei
    'zuflucht' zeigte er auf x=0.02, den aeussersten linken Bildrand, ohne dass
    je jemand nachgesehen haette, was dort liegt - und der Bot lernt aus solchen
    Blindtipps auch noch vermeintliche Auswege.

    Der Ausweg fuer abgeschaltete Aufgaben ist, dass sie nicht laufen. Der Test
    prueft darum nur, was tatsaechlich laeuft.
    """

    def test_alle_laufenden_tap_first_haben_einen_ersatz_punkt(self):
        import json as _json

        with open(os.path.join(ROOT, "config", "last-asylum.json"), encoding="utf-8") as fh:
            roh = _json.load(fh)
        ohne = []

        def pruefe(knoten, wo):
            if isinstance(knoten, dict):
                if "tap_first" in knoten and not knoten["tap_first"].get("fallback"):
                    ohne.append(wo)
                for k, v in knoten.items():
                    pruefe(v, f"{wo}>{k}")
            elif isinstance(knoten, list):
                for v in knoten:
                    pruefe(v, wo)

        for gruppe in ("rules", "tasks"):
            for eintrag in roh.get(gruppe, []):
                if not eintrag.get("enabled", True):
                    continue          # laeuft nicht, kann also nirgends steckenbleiben
                pruefe(eintrag, f"{gruppe}:{eintrag.get('name')}")
        for gruppe in ("on_unknown", "on_stuck"):
            pruefe(roh.get(gruppe, []), gruppe)
        self.assertEqual(
            ohne, [],
            "ohne Ersatz-Punkt bleibt der Bot stehen, wenn keine Vorlage passt: "
            + ", ".join(ohne),
        )


class TestGeraeteWahl(unittest.TestCase):
    """Bei zwei gemeldeten Geräten muss der Bot selbst eines nehmen.

    Sonst bricht jeder direkte Aufruf mit »more than one device/emulator«
    ab - genau das ist beim Aufruf von `bot.py entdecke` passiert.
    """

    def test_port_hat_vorrang_vor_emulator(self):
        from laa import adb as _adb

        alt = _adb.list_devices
        try:
            _adb.list_devices = lambda a="adb": ["emulator-5554", "127.0.0.1:5555"]
            self.assertEqual(_adb.waehle_geraet(), "127.0.0.1:5555")
        finally:
            _adb.list_devices = alt

    def test_einzelnes_geraet_wird_genommen(self):
        from laa import adb as _adb

        alt = _adb.list_devices
        try:
            _adb.list_devices = lambda a="adb": ["emulator-5554"]
            self.assertEqual(_adb.waehle_geraet(), "emulator-5554")
            _adb.list_devices = lambda a="adb": []
            self.assertIsNone(_adb.waehle_geraet())
        finally:
            _adb.list_devices = alt


class TestSelbstbericht(unittest.TestCase):
    """Der Bot sagt selbst, welche fehlende Vorlage am meisten kostet."""

    def test_nennt_die_teuerste_vorlage_zuerst(self):
        zeilen = []

        class Mit(Logger):
            def info(self, msg, **f):
                zeilen.append((msg, f))

        cfg = Config.from_dict({
            "rules": [{"name": "r1",
                       "match": {"template": "fehlt_a.png", "optional": True},
                       "do": [{"sleep": 1}]}],
            "tasks": [
                {"name": "t1", "do": [{"tap_template": {"template": "fehlt_a.png",
                                                        "optional": True}}]},
                {"name": "t2", "do": [{"tap_template": {"template": "fehlt_a.png",
                                                        "optional": True}}]},
                {"name": "t3", "do": [{"tap_template": {"template": "fehlt_b.png",
                                                        "optional": True}}]},
            ],
        })
        self.assertEqual(cfg.validate(), [])
        eng = Engine(cfg, FakeDevice([noise(200, 300, 90)], loop=True),
                     logger=Mit(level="info", color=False), sleep=lambda s: None)
        eng.run_actions([{"selbstbericht": {}}])
        genannt = [f["blockiert"] for m, f in zeilen if "fehlt:" in m]
        self.assertTrue(genannt, "es muss eine fehlende Vorlage genannt werden")
        erste = [m for m, f in zeilen if "fehlt:" in m][0]
        self.assertIn("fehlt_a.png", erste,
                      "die Vorlage mit den meisten Abhaengigkeiten gehoert nach oben")
        self.assertIn("Aufgabe t1", genannt[0])

    def test_ohne_luecken_kein_larm(self):
        zeilen = []

        class Mit(Logger):
            def info(self, msg, **f):
                zeilen.append(msg)

        cfg = Config.from_dict({"tasks": [{"name": "t", "do": [{"sleep": 1}]}]})
        cfg.validate()
        eng = Engine(cfg, FakeDevice([noise(200, 300, 91)], loop=True),
                     logger=Mit(level="info", color=False), sleep=lambda s: None)
        eng.run_actions([{"selbstbericht": {}}])
        self.assertTrue(any("keine Vorlage fehlt" in z for z in zeilen))


class TestVorlageOhneWirkung(unittest.TestCase):
    """Eine Vorlage, die trifft aber nie etwas auslöst, zeigt aufs Falsche.

    Genau das ist passiert, als `entdecke --blasen` die rechte Knopfspalte
    als Ertrags-Blasen übernahm: Treffer mit 1.00, aber nichts passierte.
    """

    def bau(self, ordner_name, wechselndes_bild):
        import tempfile
        ordner = tempfile.mkdtemp()
        tdir = os.path.join(ordner, "templates", ordner_name)
        os.makedirs(tdir)
        marke = noise(40, 40, 95)
        marke.save(os.path.join(tdir, "ding.png"))
        bilder = []
        for i in range(40):
            b = noise(600, 900, 96 if not wechselndes_bild else 200 + i)
            paste(b, marke, 200, 300)
            if wechselndes_bild:
                paste(b, Image.new(150, 150, (250, 250, 250)), 20 + (i % 8) * 40, 600)
            bilder.append(b)
        with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
            json.dump({"base_width": 600}, fh)
        cfg = Config.load(os.path.join(ordner, "conf.json"))
        eng = Engine(cfg, FakeDevice(bilder, loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=4)
        return ordner, cfg, eng

    def test_gelernte_vorlage_wird_aussortiert(self):
        import shutil
        ordner, cfg, eng = self.bau("gelernt", wechselndes_bild=False)
        try:
            spec = {"template": "gelernt/ding.png", "threshold": 0.9}
            for _ in range(Engine.VERDACHT_AB + 2):
                eng.capture()
                eng.run_actions([{"tap_template": dict(spec)}])
            eng.capture()
            self.assertEqual(eng.stats.get("gelerntes-verworfen", 0), 1)
            self.assertFalse(os.path.exists(
                os.path.join(ordner, "templates", "gelernt", "ding.png")))
            self.assertTrue(os.path.exists(os.path.join(
                ordner, "templates", "gelernt", "verworfen", "ding.png")),
                "die Vorlage muss aufgehoben, nicht geloescht werden")
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_von_hand_geschnittene_wird_nur_gemeldet(self):
        import shutil
        ordner, cfg, eng = self.bau("nav", wechselndes_bild=False)
        try:
            spec = {"template": "nav/ding.png", "threshold": 0.9}
            for _ in range(Engine.VERDACHT_AB + 2):
                eng.capture()
                eng.run_actions([{"tap_template": dict(spec)}])
            eng.capture()
            self.assertEqual(eng.stats.get("vorlage-verdaechtig", 0), 1)
            self.assertTrue(os.path.exists(
                os.path.join(ordner, "templates", "nav", "ding.png")),
                "von Hand geschnittene Vorlagen darf der Bot nicht wegraeumen")
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_wirksame_vorlage_bleibt_unbehelligt(self):
        import shutil
        ordner, cfg, eng = self.bau("gelernt", wechselndes_bild=True)
        try:
            spec = {"template": "gelernt/ding.png", "threshold": 0.9}
            for _ in range(Engine.VERDACHT_AB + 4):
                eng.capture()
                eng.run_actions([{"tap_template": dict(spec)}])
            eng.capture()
            self.assertEqual(eng.stats.get("gelerntes-verworfen", 0), 0)
            self.assertTrue(os.path.exists(
                os.path.join(ordner, "templates", "gelernt", "ding.png")))
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestGelernteAuswege(unittest.TestCase):
    """Der Bot merkt sich, wie er von einem Bildschirm wegkommt."""

    def bau(self, ordner, wirksamer_schritt):
        """on_unknown mit drei Schritten - nur einer ändert das Bild."""
        fest = noise(400, 700, 120)
        # Stark verkleinert sieht Rauschen ueberall gleich aus - der zweite
        # Bildschirm braucht eine Flaeche, die auch grob noch auffaellt.
        anders = noise(400, 700, 121)
        paste(anders, Image.new(300, 400, (252, 252, 252)), 50, 150)

        class Gerät(FakeDevice):
            def __init__(self):
                super().__init__([fest], loop=True)
                self.geloest = False

            def screencap(self):
                return anders if self.geloest else fest

            def key(self, code):
                super().key(code)
                if code == wirksamer_schritt:
                    self.geloest = True

        cfg = Config.from_dict({
            "base_width": 400,
            "festgefahren_schritte": 0,
            "on_unknown": [{"key": "TASTE_A"}, {"key": "TASTE_B"}, {"key": "TASTE_C"}],
        }, path=os.path.join(ordner, "conf.json"))
        dev = Gerät()
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        return dev, eng

    def test_merkt_sich_den_schritt_der_wirkt(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, "TASTE_C")
            eng.capture()
            eng._festgefahren(eng.screen)
            eng._ausweg_suchen("test")
            self.assertEqual(dev.keys, ["TASTE_A", "TASTE_B", "TASTE_C"],
                             "erst der Reihe nach durchprobieren")
            self.assertEqual(eng.stats.get("ausweg-gelernt", 0), 1)
            with open(os.path.join(ordner, "auswege.json"), encoding="utf-8") as fh:
                self.assertEqual(list(json.load(fh).values()), [2])
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_beim_naechsten_mal_gleich_der_richtige(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, "TASTE_C")
            eng.capture(); eng._festgefahren(eng.screen); eng._ausweg_suchen("test")

            # Neuer Lauf, derselbe Bildschirm: die Erinnerung überlebt.
            dev2, eng2 = self.bau(ordner, "TASTE_C")
            self.assertTrue(eng2._auswege, "die gelernten Auswege muessen geladen werden")
            eng2.capture(); eng2._festgefahren(eng2.screen); eng2._ausweg_suchen("test")
            self.assertEqual(dev2.keys, ["TASTE_C"],
                             "der bewaehrte Schritt gehoert nach vorn - ohne Umweg")
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_ohne_wirkung_wird_nichts_gemerkt(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, "GIBTS_NICHT")
            eng.capture(); eng._festgefahren(eng.screen); eng._ausweg_suchen("test")
            self.assertEqual(eng.stats.get("ausweg-gelernt", 0), 0)
            self.assertEqual(eng._auswege, {})
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestErkundungAufVerrauschtemBild(unittest.TestCase):
    """Steckt der Bot fest, probiert er selbst einen Knopf - mit Leitplanken."""

    def bau(self, ordner, knopf_rgb, wirkt=True, extra=None):
        fest = noise(400, 700, 130)
        paste(fest, Image.new(120, 26, knopf_rgb), 140, 350)   # ein Knopf
        if extra:
            paste(fest, Image.new(120, 26, extra), 140, 250)
        anders = noise(400, 700, 131)
        paste(anders, Image.new(300, 400, (252, 252, 252)), 50, 150)

        class Gerät(FakeDevice):
            def __init__(self):
                super().__init__([fest], loop=True)
                self.geloest = False

            def screencap(self):
                return anders if self.geloest else fest

            def tap(self, x, y):
                super().tap(x, y)
                if wirkt and 300 < y < 400:
                    self.geloest = True

        cfg = Config.from_dict({
            "base_width": 400, "festgefahren_schritte": 0,
            "on_unknown": [{"key": "TASTE_A"}],
        }, path=os.path.join(ordner, "conf.json"))
        dev = Gerät()
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        return dev, eng

    def lauf(self, eng):
        eng.capture()
        eng._festgefahren(eng.screen)
        eng._ausweg_suchen("test")

    def test_gruener_knopf_wird_probiert_und_gemerkt(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (120, 181, 54))
            self.lauf(eng)
            self.assertEqual(eng.stats.get("erkundet", 0), 1)
            self.assertEqual(eng.stats.get("ausweg-gelernt", 0), 1)
            with open(os.path.join(ordner, "auswege.json"), encoding="utf-8") as fh:
                self.assertIn("tap", list(json.load(fh).values())[0])
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_goldener_knopf_wird_nie_angeruehrt(self):
        """Gold ist im Spiel die Farbe fuer Kaeufe und fuer 'Spiel beenden?'."""
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (247, 168, 52))
            self.lauf(eng)
            self.assertEqual(eng.stats.get("erkundet", 0), 0,
                             "goldene Knoepfe duerfen nicht ausprobiert werden")
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_erfolgloser_knopf_wird_nicht_wiederholt(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (120, 181, 54), wirkt=False)
            for _ in range(4):
                self.lauf(eng)
            self.assertEqual(eng.stats.get("erkundet", 0), 1,
                             "derselbe Knopf darf nur einmal probiert werden")
            self.assertEqual(eng.stats.get("ausweg-gelernt", 0), 0)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_abschaltbar(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (120, 181, 54))
            eng.cfg.erkunden = False
            self.lauf(eng)
            self.assertEqual(eng.stats.get("erkundet", 0), 0)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestErkundung(unittest.TestCase):
    """Steckt der Bot fest, probiert er selbst einen Knopf - mit Leitplanken."""

    def bau(self, ordner, knopf_rgb, loesend=True):
        fest = Image.new(400, 700, (30, 30, 30))
        # Ein Knopf in der erlaubten Zone.
        paste(fest, Image.new(120, 22, knopf_rgb), 140, 350)
        anders = Image.new(400, 700, (30, 30, 30))
        paste(anders, Image.new(300, 400, (250, 250, 250)), 50, 150)

        class Gerät(FakeDevice):
            def __init__(self):
                super().__init__([fest], loop=True)
                self.geloest = False

            def screencap(self):
                return anders if self.geloest else fest

            def tap(self, x, y):
                super().tap(x, y)
                if loesend and 340 < y < 385:
                    self.geloest = True

        cfg = Config.from_dict({
            "base_width": 400, "festgefahren_schritte": 0,
            "on_unknown": [{"key": "TASTE_A"}],
        }, path=os.path.join(ordner, "conf.json"))
        dev = Gerät()
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        return dev, eng

    def test_gruener_knopf_wird_probiert_und_gemerkt(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (120, 181, 54))
            eng.capture(); eng._festgefahren(eng.screen); eng._ausweg_suchen("test")
            self.assertEqual(eng.stats.get("erkundet", 0), 1)
            self.assertEqual(eng.stats.get("ausweg-gelernt", 0), 1)
            with open(os.path.join(ordner, "auswege.json"), encoding="utf-8") as fh:
                self.assertIn("tap", list(json.load(fh).values())[0])
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_goldener_knopf_wird_nie_angefasst(self):
        """Gold ist die Haupthandlung - mal harmlos, mal teuer.

        »Zerlegen« ist gold und kostet nichts, »CHF 4.40« und »50 Spenden«
        (Diamanten) sind es auch. Am Bild ist das nicht zu unterscheiden,
        also wird Gold nie blind angetippt.
        """
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (247, 168, 52))
            eng.capture(); eng._festgefahren(eng.screen); eng._ausweg_suchen("test")
            self.assertEqual(eng.stats.get("erkundet", 0), 0)
            self.assertEqual(dev.taps, [], "auf einen goldenen Knopf darf nie getippt werden")
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_erfolgloser_knopf_wird_nicht_wiederholt(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (120, 181, 54), loesend=False)
            for _ in range(3):
                eng.capture(); eng._festgefahren(eng.screen); eng._ausweg_suchen("test")
            self.assertEqual(eng.stats.get("erkundet", 0), 1,
                             "was einmal nichts brachte, wird nicht wiederholt")
            self.assertEqual(eng.stats.get("ausweg-gelernt", 0), 0)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)

    def test_abschaltbar(self):
        import shutil, tempfile
        ordner = tempfile.mkdtemp()
        try:
            dev, eng = self.bau(ordner, (120, 181, 54))
            eng.cfg.erkunden = False
            eng.capture(); eng._festgefahren(eng.screen); eng._ausweg_suchen("test")
            self.assertEqual(eng.stats.get("erkundet", 0), 0)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestSpielImVordergrund(unittest.TestCase):
    """Steht das Spiel nicht mehr vorn, tippt der Bot ins Leere."""

    def bau(self, paket):
        class Gerät(FakeDevice):
            gestartet = 0

            def current_package(self_inner):
                return paket

            def start_app(self_inner, package, activity=None):
                Gerät.gestartet += 1

        Gerät.gestartet = 0
        cfg = Config.from_dict({
            "package": "com.phs.global", "base_width": 400,
            "tasks": [{"name": "wache", "do": [
                {"wenn": {"match": {"app_im_vordergrund": True},
                          "dann": [],
                          "sonst": [{"start_app": True}]}}]}],
        })
        self.assertEqual(cfg.validate(), [])
        eng = Engine(cfg, Gerät([noise(400, 700, 130)], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1)
        return Gerät, eng

    def test_fremde_app_wird_ersetzt(self):
        Gerät, eng = self.bau("com.android.launcher")
        eng.run_actions(eng.cfg.tasks[0].do)
        self.assertEqual(Gerät.gestartet, 1)

    def test_spiel_vorn_bleibt_unangetastet(self):
        Gerät, eng = self.bau("com.phs.global/.MainActivity")
        eng.run_actions(eng.cfg.tasks[0].do)
        self.assertEqual(Gerät.gestartet, 0)

    def test_bei_fehler_wird_nichts_neu_gestartet(self):
        """Lieber nichts tun als das laufende Spiel abschiessen."""
        class Kaputt(FakeDevice):
            gestartet = 0

            def current_package(self_inner):
                raise RuntimeError("adb weg")

            def start_app(self_inner, package, activity=None):
                Kaputt.gestartet += 1

        cfg = Config.from_dict({
            "package": "com.phs.global", "base_width": 400,
            "tasks": [{"name": "wache", "do": [
                {"wenn": {"match": {"app_im_vordergrund": True},
                          "dann": [], "sonst": [{"start_app": True}]}}]}],
        })
        eng = Engine(cfg, Kaputt([noise(400, 700, 131)], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1)
        eng.run_actions(cfg.tasks[0].do)
        self.assertEqual(Kaputt.gestartet, 0)


class TestBlasenOhneVorlage(unittest.TestCase):
    """Ertrags-Blasen an der Form einsammeln, ohne Vorlage.

    Die Vorlagen stammen aus einer anderen Auflösung und treffen oft nicht.
    Der helle Ring der Blasen ist dagegen immer derselbe.
    """

    def bau(self, stellen, rand_stellen=()):
        screen = Image.new(600, 1000, (60, 90, 40))
        for x, y in list(stellen) + list(rand_stellen):
            paste(screen, Image.new(50, 30, (196, 201, 208)), x, y)
        cfg = Config.from_dict({"base_width": 600})
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=6)
        return dev, eng

    def spec(self):
        return {"tap_alle": {
            "farbknopf": {"rgb": [195, 200, 207], "tolerance": 30,
                          "min_w": 0.03, "max_w": 0.12,
                          "min_h": 0.012, "max_h": 0.05, "min_fuellung": 0.45},
            "region": [0.0, 0.10, 1.0, 0.88], "nur_x": [0.13, 0.85], "runden": 1}}

    def test_alle_blasen_werden_getippt(self):
        stellen = [(150, 200), (300, 400), (250, 700)]
        dev, eng = self.bau(stellen)
        eng.run_actions([self.spec()])
        self.assertEqual(len(dev.taps), 3, f"drei Blasen, {len(dev.taps)} Tipps")

    def test_rand_bleibt_unangetastet(self):
        """Rechts liegen Allianz/Nachricht/Tasche - gleicher Ring, kein Ertrag."""
        dev, eng = self.bau([(300, 400)], rand_stellen=[(545, 500), (10, 600)])
        eng.run_actions([self.spec()])
        self.assertEqual(len(dev.taps), 1, "nur die Blase in der Mitte zaehlt")
        x, _ = dev.taps[0]
        self.assertTrue(0.13 * 600 <= x <= 0.85 * 600)

    def test_ohne_blasen_kein_tipp(self):
        dev, eng = self.bau([])
        eng.run_actions([self.spec()])
        self.assertEqual(dev.taps, [])


class TestUpdateHinweis(unittest.TestCase):
    """Ein einzelner goldener Knopf ist ein Hinweis, zwei Knöpfe sind ein Kauf.

    »Neue Version verfügbar« blockiert das ganze Spiel, bis man bestätigt -
    also muss dieser goldene Knopf getippt werden, obwohl Gold sonst tabu
    ist. Sicher wird das dadurch, dass ein Kauf-Dialog immer einen zweiten
    Knopf daneben hat (blau »Abbrechen« oder rot).
    """

    GOLD = (237, 170, 55)
    BLAU = (58, 142, 230)

    def bau(self, knoepfe):
        screen = Image.new(600, 1000, (210, 216, 224))
        for rgb, x in knoepfe:
            paste(screen, Image.new(140, 34, rgb), x, 520)
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=5)
        regel = next(r for r in cfg.rules if r.name == "spiel-update-bestaetigen")
        return eng, screen, regel

    def test_einzelner_goldener_knopf_wird_bestaetigt(self):
        eng, screen, regel = self.bau([(self.GOLD, 230)])
        self.assertTrue(eng.evaluate(regel.match, screen))

    def test_gold_neben_blau_wird_nicht_angefasst(self):
        """Der Diamanten-Dialog: »Abbrechen« blau, »Bestätigen« gold."""
        eng, screen, regel = self.bau([(self.BLAU, 90), (self.GOLD, 330)])
        self.assertFalse(
            eng.evaluate(regel.match, screen),
            "mit einem zweiten Knopf daneben ist es ein Kauf - Finger weg",
        )

    def test_ohne_goldenen_knopf_passiert_nichts(self):
        eng, screen, regel = self.bau([(self.BLAU, 230)])
        self.assertFalse(eng.evaluate(regel.match, screen))

    def test_regel_greift_vor_allem_ausser_der_notbremse(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        nach_prio = {r.name: r.priority for r in cfg.rules}
        self.assertGreater(nach_prio["spiel-beenden-abbrechen"],
                           nach_prio["spiel-update-bestaetigen"],
                           "»Spiel beenden?« abzubrechen bleibt wichtiger")
        for name, prio in nach_prio.items():
            if name in ("spiel-beenden-abbrechen", "spiel-update-bestaetigen"):
                continue
            self.assertLess(prio, nach_prio["spiel-update-bestaetigen"],
                            f"'{name}' darf den Update-Hinweis nicht ueberholen")


class TestRegelImKreis(unittest.TestCase):
    """Eine Regel, die dauernd greift, wird gebremst - auch ohne Stillstand.

    Am 31.07. griff »blauer-knopf-generisch« sechzehnmal in drei Minuten.
    Die Prüfung auf gleiche Ansicht sah das nicht: zwei Bildschirme
    schaukelten sich auf, jeder Durchgang sah anders aus - und trotzdem kam
    der Bot nicht weiter.
    """

    def bau(self, grenze=4):
        bilder = []
        for i in range(30):
            b = noise(400, 700, 300 + i)
            paste(b, Image.new(200, 200, (250, 250, 250)), 20 + (i % 5) * 30, 300)
            bilder.append(b)
        cfg = Config.from_dict({
            "base_width": 400,
            "festgefahren_schritte": 0,
            "regel_hoechstens_je_fenster": grenze,
            "regel_fenster": 300,
            "rules": [{"name": "immer", "match": {"always": True},
                       "do": [{"log": "x"}]}],
        })
        eng = Engine(cfg, FakeDevice(bilder, loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=2)
        return eng

    def test_wird_nach_der_grenze_gebremst(self):
        eng = self.bau(grenze=4)
        for _ in range(12):
            eng.step()
        self.assertEqual(eng.stats.get("regel-gebremst", 0), 1)
        self.assertEqual(
            eng.stats.get("rule:immer", 0), 4,
            "nach der Grenze darf die Regel nicht weiter greifen",
        )

    def test_abschaltbar(self):
        eng = self.bau(grenze=0)
        for _ in range(12):
            eng.step()
        self.assertEqual(eng.stats.get("regel-gebremst", 0), 0)
        self.assertEqual(eng.stats.get("rule:immer", 0), 12)


class TestZurueckPfeil(unittest.TestCase):
    """Die Android-Zurück-Taste ist in diesem Spiel gefährlich.

    In der Stadtansicht öffnet sie »Spiel beenden?« mit »Abbrechen« und
    »Bestätigen« nebeneinander. Am 31.07. hat der Bot sie über den
    sonst-Zweig von on_unknown gedrückt und stand vor genau diesem Dialog -
    ein Fehlgriff daneben, und das Spiel wäre zu gewesen. Sie darf deshalb
    nirgends vorkommen, auch nicht als Ersatzweg.
    """

    def test_keine_zurueck_taste_in_der_konfiguration(self):
        import json as _json

        with open(os.path.join(ROOT, "config", "last-asylum.json"), encoding="utf-8") as fh:
            roh = _json.load(fh)
        gefunden = []

        # Drei Wege fuehren zur Zurueck-Taste, nicht einer. Die erste Fassung
        # dieses Tests sah nur den ersten - {"back": true} und {"key": "4"}
        # (der Tastencode als Zahl) waeren durchgerutscht.
        verboten = {"KEYCODE_BACK", "BACK", "4"}

        def pruefe(knoten, wo):
            if isinstance(knoten, dict):
                taste = knoten.get("key")
                if taste is not None and str(taste).strip().upper() in verboten:
                    gefunden.append(f"{wo} (key={taste})")
                if "back" in knoten:
                    gefunden.append(f"{wo} (Aktion 'back')")
                for k, v in knoten.items():
                    pruefe(v, f"{wo}>{k}")
            elif isinstance(knoten, list):
                for i, v in enumerate(knoten):
                    pruefe(v, wo)

        for gruppe in ("rules", "tasks", "on_unknown", "on_stuck"):
            pruefe(roh.get(gruppe, []), gruppe)
        self.assertEqual(
            gefunden, [],
            "KEYCODE_BACK oeffnet 'Spiel beenden?' - hier gefunden: " + ", ".join(gefunden),
        )


class TestRegelOhneWirkung(unittest.TestCase):
    """Eine Regel, die folgenlos greift, muss stillgelegt werden.

    Am 31.07. griff »dialog-schliessen« auf »Tägliche Aufgaben« elfmal
    hintereinander mit Score 1.00 und bewirkte nichts.
    """

    def test_folgenlose_regel_wird_stillgelegt(self):
        tpl = noise(20, 20, 40)
        screen = noise(300, 500, 41)
        paste(screen, tpl, 100, 200)
        os.makedirs(os.path.join(HERE, "_tmp_tpl"), exist_ok=True)
        pfad = os.path.join(HERE, "_tmp_tpl", "marke.png")
        tpl.save(pfad)
        try:
            cfg = Config.from_dict({
                "base_width": 300,
                "festgefahren_schritte": 0,
                "regel_wirkungslos_grenze": 3,
                "rules": [{"name": "greift-immer",
                           "match": {"template": pfad, "threshold": 0.9},
                           "do": [{"tap_match": {}}]}],
            })
            eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=3)
            for _ in range(10):
                eng.step()
            self.assertEqual(eng.stats.get("regel-stillgelegt", 0), 1)
            self.assertLessEqual(
                eng.stats.get("rule:greift-immer", 0), 4,
                "nach der Stilllegung darf die Regel nicht weiter greifen",
            )
        finally:
            import shutil
            shutil.rmtree(os.path.join(HERE, "_tmp_tpl"), ignore_errors=True)

    def test_wirksame_regel_bleibt_aktiv(self):
        tpl = noise(20, 20, 42)
        bilder = []
        for i in range(10):
            b = noise(300, 500, 50 + i)
            paste(b, tpl, 100, 200)
            paste(b, Image.new(120, 120, (255, 255, 255)), 10 + i * 15, 300)
            bilder.append(b)
        os.makedirs(os.path.join(HERE, "_tmp_tpl2"), exist_ok=True)
        pfad = os.path.join(HERE, "_tmp_tpl2", "marke.png")
        tpl.save(pfad)
        try:
            cfg = Config.from_dict({
                "base_width": 300,
                "festgefahren_schritte": 0,
                "regel_wirkungslos_grenze": 3,
                "rules": [{"name": "greift-immer",
                           "match": {"template": pfad, "threshold": 0.9},
                           "do": [{"tap_match": {}}]}],
            })
            eng = Engine(cfg, FakeDevice(bilder, loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=3)
            for _ in range(10):
                eng.step()
            self.assertEqual(eng.stats.get("regel-stillgelegt", 0), 0)
        finally:
            import shutil
            shutil.rmtree(os.path.join(HERE, "_tmp_tpl2"), ignore_errors=True)


class TestFarbknopf(unittest.TestCase):
    """Knöpfe über Farbe finden, ohne Template — für wechselnde Beschriftungen."""

    def bild_mit_knopf(self, farbe=(120, 181, 54)):
        # Ruhiger Hintergrund: in Rauschen liegen zufaellig einzelne Pixel in der
        # Farbtoleranz und verschieben den Rahmen um ein Pixel.
        img = Image.new(400, 800, (30, 30, 40))
        # Knopf: farbige Fläche mit einem hellen "Schrift"-Streifen in der Mitte
        for y in range(300, 360):
            for x in range(100, 300):
                i = (y * img.width + x) * 3
                if 320 <= y <= 340 and 150 <= x <= 250:
                    img.data[i:i + 3] = bytes((250, 250, 250))
                else:
                    img.data[i:i + 3] = bytes(farbe)
        img._gray = None
        return img

    def test_findet_knopf_trotz_schrift(self):
        hits = matcher.find_color_button(
            self.bild_mit_knopf(), [120, 181, 54], tolerance=30,
            min_w=0.2, max_w=0.9, min_h=0.05, max_h=0.12, min_fuellung=0.5)
        self.assertTrue(hits)
        self.assertEqual((hits[0].x, hits[0].y), (100, 300))
        self.assertEqual((hits[0].w, hits[0].h), (200, 60))

    def test_falsche_farbe_kein_treffer(self):
        self.assertEqual(
            matcher.find_color_button(self.bild_mit_knopf(), [200, 40, 40], tolerance=30,
                                      min_w=0.2, max_w=0.9, min_h=0.05, max_h=0.12), [])

    def test_zu_klein_wird_verworfen(self):
        self.assertEqual(
            matcher.find_color_button(self.bild_mit_knopf(), [120, 181, 54], tolerance=30,
                                      min_w=0.8, max_w=0.99, min_h=0.05, max_h=0.12), [])

    def test_zwei_knoepfe_auf_gleicher_hoehe_bleiben_getrennt(self):
        img = self.bild_mit_knopf()
        for y in range(300, 360):
            for x in range(320, 390):
                i = (y * img.width + x) * 3
                img.data[i:i + 3] = bytes((120, 181, 54))
        img._gray = None
        hits = matcher.find_color_button(img, [120, 181, 54], tolerance=30, min_w=0.1,
                                         max_w=0.9, min_h=0.05, max_h=0.12, min_fuellung=0.5,
                                         limit=5)
        self.assertEqual(len(hits), 2)
        self.assertEqual(sorted(h.x for h in hits), [100, 320])

    def test_regel_mit_farbknopf_tippt(self):
        cfg = Config.from_dict({
            "base_width": 400,
            "rules": [{"name": "gruen", "match": {"farbknopf": {
                "rgb": [120, 181, 54], "tolerance": 30, "min_w": 0.2, "max_w": 0.9,
                "min_h": 0.05, "max_h": 0.12, "min_fuellung": 0.5}},
                "do": [{"tap_match": {}}]}]})
        dev = FakeDevice([self.bild_mit_knopf()], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=3)
        eng.step()
        self.assertEqual(len(dev.taps), 1)
        x, y = dev.taps[0]
        self.assertLess(abs(x - 200), 45)
        self.assertLess(abs(y - 330), 20)


    def test_offset_zielt_neben_den_treffer(self):
        cfg = Config.from_dict({
            "base_width": 400,
            "rules": [{"name": "gruen", "match": {"farbknopf": {
                "rgb": [120, 181, 54], "tolerance": 30, "min_w": 0.2, "max_w": 0.9,
                "min_h": 0.05, "max_h": 0.12, "min_fuellung": 0.5}},
                "do": [{"tap_match": {"jitter": False, "offset": [-0.05, 0.05]}}]}]})
        dev = FakeDevice([self.bild_mit_knopf()], loop=True)
        Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=3).step()
        self.assertEqual(dev.taps, [(200 - 20, 330 + 40)])


class TestZeitfenster(unittest.TestCase):
    """Aufgaben, die nur an bestimmten Tagen/Stunden laufen (z. B. Wochenend-Schilde)."""

    def bau(self, **felder):
        raw = {"tasks": [dict({"name": "w", "every": 999, "at_start": True,
                               "do": [{"key": "JA"}]}, **felder)]}
        cfg = Config.from_dict(raw)
        dev = FakeDevice([noise(60, 80, 61)], loop=True)
        return cfg, dev, Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=2)

    def test_ohne_fenster_laeuft_immer(self):
        cfg, dev, eng = self.bau()
        eng.step()
        self.assertEqual(dev.keys, ["JA"])

    def test_falscher_wochentag_blockiert(self):
        heute = time.localtime().tm_wday
        cfg, dev, eng = self.bau(wochentage=[(heute + 2) % 7])
        eng.step()
        self.assertEqual(dev.keys, [])

    def test_richtiger_wochentag_laeuft(self):
        cfg, dev, eng = self.bau(wochentage=[time.localtime().tm_wday])
        eng.step()
        self.assertEqual(dev.keys, ["JA"])

    def test_stundenfenster(self):
        stunde = time.localtime().tm_hour
        cfg, dev, eng = self.bau(stunden=[[stunde, stunde]])
        eng.step()
        self.assertEqual(dev.keys, ["JA"])
        cfg2, dev2, eng2 = self.bau(stunden=[[(stunde + 3) % 24, (stunde + 4) % 24]])
        eng2.step()
        self.assertEqual(dev2.keys, [])


class TestLernenPlatzhalter(unittest.TestCase):
    """PowerShell löst `*` nicht auf – das muss der Befehl selbst tun."""

    def test_muster_wird_selbst_aufgeloest(self):
        import io
        import shutil
        import tempfile
        from contextlib import redirect_stdout

        import bot as cli

        ordner = tempfile.mkdtemp()
        try:
            with open(os.path.join(ordner, "lauf-1.jsonl"), "w", encoding="utf-8") as fh:
                fh.write('{"ev":"vergleich","template":"a.png","score":0.93,'
                         '"schwelle":0.88,"treffer":true}\n')
            args = cli.build_parser().parse_args(
                ["lernen", os.path.join(ordner, "lauf-*.jsonl")]
            )
            puffer = io.StringIO()
            with redirect_stdout(puffer):
                code = args.func(args)
            self.assertEqual(code, 0)
            self.assertIn("a.png", puffer.getvalue())
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


class TestEchtesSpielMaterial(unittest.TestCase):
    """Die aus echten Screenshots geschnittenen Templates gegeneinander prüfen."""

    def test_templates_verwechseln_sich_nicht(self):
        tpl_dir = os.path.join(ROOT, "templates", "nav")
        namen = sorted(n for n in os.listdir(tpl_dir) if n.endswith(".png"))
        self.assertGreaterEqual(len(namen), 5)
        bilder = {n: Image.load(os.path.join(tpl_dir, n)) for n in namen}
        # Jedes Template findet sich selbst, aber keines findet ein anderes.
        for name, tpl in bilder.items():
            self.assertIsNotNone(matcher.find(tpl, tpl, threshold=0.99), name)
            for anderer, gross in bilder.items():
                if anderer == name:
                    continue
                if gross.width < tpl.width or gross.height < tpl.height:
                    continue
                self.assertIsNone(
                    matcher.find(gross, tpl, threshold=0.85),
                    f"{name} wird faelschlich in {anderer} gefunden",
                )


class TestEchteTemplates(unittest.TestCase):
    """Die mitgelieferten Templates müssen ladbar und brauchbar gross sein."""

    def test_templates_laden(self):
        tpl_dir = os.path.join(ROOT, "templates")
        gefunden = 0
        for wurzel, _, dateien in os.walk(tpl_dir):
            for name in dateien:
                if not name.endswith(".png"):
                    continue
                img = Image.load(os.path.join(wurzel, name))
                self.assertGreaterEqual(min(img.width, img.height), 20, name)
                gefunden += 1
        self.assertGreaterEqual(gefunden, 8)


class TestEchterBestaetigenDialog(unittest.TestCase):
    """Gegen einen echten Bildschirm gemessen, nicht gegen eine Vermutung.

    austausch/schild.png zeigt den Abbruch-Dialog "Verbindung waehrend des
    Login-Vorgangs unterbrochen [1019]" mit einem einzelnen goldenen
    Bestaetigen-Knopf. Der Bot stand davor, ohne ihn zu treffen: der Knopf ist
    0.068 hoch (die Regel liess 0.06 zu) und nur zu 45 % golden, weil die weisse
    Schrift und das Funkeln den Rest belegen (die Regel verlangte 60 %).

    Beide Schranken waren geraten. Dieser Test misst sie am Bild nach, damit
    niemand sie wieder zudreht.
    """

    BILD = os.path.join(ROOT, "austausch", "schild.png")

    def setUp(self):
        if not os.path.exists(self.BILD):
            self.skipTest("austausch/schild.png liegt nicht vor")
        self.screen = Image.load(self.BILD)
        self.cfg = json.load(open(os.path.join(ROOT, "config", "last-asylum.json"),
                                  encoding="utf-8"))

    def regel(self, name):
        for r in self.cfg["rules"]:
            if r["name"] == name:
                return r
        self.fail(f"Regel {name} fehlt")

    @staticmethod
    def suche(screen, k):
        return matcher.find_color_button(
            screen, k["rgb"], tolerance=k.get("tolerance", 45),
            min_w=k.get("min_w", 0.12), max_w=k.get("max_w", 0.8),
            min_h=k.get("min_h", 0.015), max_h=k.get("max_h", 0.06),
            region=k.get("region"), min_fuellung=k.get("min_fuellung", 0.6))

    def test_der_goldene_knopf_wird_gefunden(self):
        bed = self.regel("spiel-update-bestaetigen")["match"]["all"][0]["farbknopf"]
        treffer = self.suche(self.screen, bed)
        self.assertTrue(treffer, "der einzelne Bestaetigen-Knopf muss gefunden werden")
        m = treffer[0]
        # Der Knopf liegt bei x 437..996, y 1250..1423. Getippt wird die Mitte
        # des Fundes - die muss darin liegen, sonst geht der Tipp daneben.
        cx, cy = m.x + m.w / 2, m.y + m.h / 2
        self.assertTrue(437 <= cx <= 996 and 1250 <= cy <= 1423,
                        f"Tippziel {cx:.0f},{cy:.0f} liegt neben dem Knopf")


    def test_bestaetigen_wird_bei_einem_zweiten_knopf_nicht_getippt(self):
        """Gold kann Geld kosten - ein Kauf-Dialog hat immer einen zweiten Knopf.

        Bis zum 02.08. fehlte die Vorlage, die Regel lief also nie. Seit sie da
        ist, greift sie - ohne diese Sicherung wuerde sie jeden goldenen
        'Bestaetigen' antippen, auch den in einem Kaufangebot.
        """
        regel = self.regel("belohnung-bestaetigen")
        bedingungen = regel["match"].get("all")
        self.assertIsNotNone(bedingungen, "die Regel braucht mehr als die blosse Vorlage")
        nicht = [b["not"]["farbknopf"]["rgb"] for b in bedingungen if "not" in b]
        self.assertEqual(len(nicht), 2, f"blau und rot muessen ausgeschlossen sein: {nicht}")

        eng = motor(self.BILD)
        # Denselben Bildschirm nehmen, aber einen blauen Abbrechen-Knopf
        # danebenmalen - dann darf die Regel nicht mehr greifen.
        screen = eng.screen
        for y in range(1270, 1400):
            for x in range(120, 400):
                screen.data[(y * screen.width + x) * 3 + 0] = 58
                screen.data[(y * screen.width + x) * 3 + 1] = 142
                screen.data[(y * screen.width + x) * 3 + 2] = 230
        self.assertFalse(eng.evaluate(regel["match"], screen),
                         "mit einem zweiten Knopf daneben darf Gold nicht getippt werden")

    def test_die_schutzbedingungen_sehen_einen_zweiten_knopf(self):
        """Blau und Rot duerfen nicht an derselben Schranke scheitern.

        Uebersieht die Regel den Abbrechen-Knopf, haelt sie einen Kauf-Dialog
        faelschlich fuer einen harmlosen Hinweis und tippt Gold an.
        """
        regel = self.regel("spiel-update-bestaetigen")
        for i in (1, 2):
            k = regel["match"]["all"][i]["not"]["farbknopf"]
            self.assertGreaterEqual(k.get("max_h", 0), 0.07,
                                    "Schutzbedingung waere zu knapp fuer echte Knoepfe")
            self.assertLessEqual(k.get("min_fuellung", 0.6), 0.45,
                                 "Knoepfe mit heller Schrift erreichen keine 60 % Fuellung")
            self.assertFalse(self.suche(self.screen, k),
                             "auf diesem Hinweis-Dialog steht kein zweiter Knopf")

    def test_vorlage_bestaetigen_passt_auf_den_knopf(self):
        """Ueber die Engine pruefen, nicht ueber den Matcher direkt.

        Die erste Fassung dieses Tests rief matcher.find mit scale=4/3 auf -
        dem Faktor, den ich fuer richtig hielt. Er bestand, und die Vorlage
        traf im echten Bot trotzdem nie: base_width steht auf 1440, die Engine
        rechnet also gar nicht um. Ein Test, der die eigene Annahme einsetzt
        statt die des Programms, bestaetigt nur sich selbst.
        """
        pfad = os.path.join(ROOT, "templates", "ui", "btn_bestaetigen.png")
        if not os.path.exists(pfad):
            self.skipTest("Vorlage fehlt")
        eng = motor(self.BILD)
        regel = self.regel("belohnung-bestaetigen")
        # evaluate statt find: die Regel hat seit dem 03.08. die Kauf-Sicherung
        # und ist damit ein all-Block, kein blosser Vorlagen-Eintrag mehr.
        self.assertTrue(eng.evaluate(regel["match"], eng.screen),
                        "die Regel muss auf dem Hinweis-Dialog greifen")
        treffer = eng.last_match
        self.assertIsNotNone(treffer, "die Vorlage muss den Knopf im echten Bild finden")
        cx, cy = treffer.center
        self.assertTrue(437 <= cx <= 996 and 1250 <= cy <= 1423,
                        f"Tippziel {cx},{cy} liegt neben dem Knopf")



class TestLebenszeichen(unittest.TestCase):
    """Von aussen muss sichtbar sein, ob der Bot noch laeuft.

    Ohne das ist die Frage "laeuft der Bot?" nur am PC zu beantworten - ein
    abgestuerzter Bot sieht aus der Ferne genauso aus wie ein zufriedener.
    """

    def bau(self, ordner):
        import subprocess
        subprocess.run(["git", "init", "-q", ordner], check=True)
        for name, wert in (("user.email", "bot@test"), ("user.name", "Bot")):
            subprocess.run(["git", "-C", ordner, "config", name, wert], check=True)
        open(os.path.join(ordner, "start"), "w").write("x")
        subprocess.run(["git", "-C", ordner, "add", "-A"], check=True)
        subprocess.run(["git", "-C", ordner, "commit", "-qm", "start"], check=True)
        cfg = Config.from_dict({"package": "x", "tasks": [], "rules": []},
                               path=os.path.join(ordner, "cfg.json"))
        dev = FakeDevice([noise(120, 200, 5)], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None)
        eng.steps = 42
        eng.stats = {"tap": 7, "task:sammeln": 3}
        return eng


    def test_git_fragt_nie_nach_zugangsdaten(self):
        """Ein wartender Passwort-Dialog sieht aus wie ein toter Bot.

        git blockiert bei fehlenden Zugangsdaten, bis das Zeitlimit greift -
        alle zehn Minuten, ohne dass irgendwo ein Fehler steht.
        """
        umgebung = Engine._git_umgebung()
        self.assertEqual(umgebung.get("GIT_TERMINAL_PROMPT"), "0")
        self.assertEqual(umgebung.get("GCM_INTERACTIVE"), "never")
        self.assertIn("PATH", {k.upper(): v for k, v in umgebung.items()},
                      "die uebrige Umgebung muss erhalten bleiben")

    def test_datei_entsteht_und_nennt_den_stand(self):
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            ziel = os.path.join(ordner, "austausch", "lauf.json")
            self.assertTrue(os.path.exists(ziel), "lauf.json muss entstehen")
            d = json.load(open(ziel, encoding="utf-8"))
            self.assertEqual(d["schritte"], 42)
            self.assertEqual(d["zaehler"]["tap"], 7)
            self.assertTrue(d["zeit"] and d["fassung"])

    def test_zahl_der_offenen_vorlagen_ist_ehrlich(self):
        """"0 offen" ist die Zahl, an der man ablesen will, ob etwas laufen kann.

        Sie fuellt sich erst bei validate(). Lief das nicht, meldete der
        Bericht beruhigend 0 - auch wenn keine einzige Vorlage da war.
        """
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.cfg.rules = [Rule(
                name="test", match={"template": "gibtsnicht.png", "optional": True},
                do=[{"log": "x"}])]
            eng.cfg.offene_templates = []
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            d = json.load(open(os.path.join(ordner, "austausch", "lauf.json"),
                               encoding="utf-8"))
            self.assertEqual(d["vorlagen_offen"], 1,
                             "der Bericht muss selbst nachsehen, statt 0 zu melden")

    def test_selbst_geschnittene_vorlagen_werden_mitgesichert(self):
        """Am PC geschnittene Vorlagen lagen bisher NUR dort.

        Genau daher kam die Luecke: der Bot meldete "0 offen", waehrend im
        Repository 31 Vorlagen fehlten. Geht die Windows-Kopie verloren, ist
        die Handarbeit weg.
        """
        import subprocess
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            os.makedirs(os.path.join(ordner, "templates", "allianz"), exist_ok=True)
            noise(20, 20, 3).save(os.path.join(ordner, "templates", "allianz", "neu.png"))
            eng.run_actions([{"lebenszeichen": {}}], "test")   # hochladen an
            # Ohne Gegenstelle scheitert der Push und der Commit wird
            # zurueckgenommen - vorgemerkt bleibt die Datei trotzdem.
            vorgemerkt = subprocess.run(
                ["git", "-C", ordner, "diff", "--cached", "--name-only"],
                capture_output=True).stdout.decode()
            self.assertIn("templates/allianz/neu.png", vorgemerkt,
                          f"die Vorlage muss mitgesichert werden, vorgemerkt: {vorgemerkt!r}")

    def test_bericht_liefert_die_belege_fuer_schwellen(self):
        """Von aussen war nie zu sehen, ob eine Schwelle sitzt.

        `bot.py lernen` kann das ableiten, aber nur aus den Protokollen auf dem
        PC - und die sind per .gitignore ausgeschlossen. Selbst anwenden darf
        der Bot die Vorschlaege nicht: das schreibt in die Konfiguration und
        blockiert danach jedes 'git pull --ff-only'. Also die Belege melden.
        """
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng._vorlagen_zaehler = {
                "ui/knopf.png": (10, 4, 0.97, 0.91, 0.62),   # sitzt: 0.91 gegen 0.62
                "ui/selten.png": (2, 0, 0.30, 1.0, 0.30),    # zu wenig Belege
            }
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            d = json.load(open(os.path.join(ordner, "austausch", "lauf.json"),
                               encoding="utf-8"))
            belege = d["schwellen_belege"]
            self.assertIn("ui/knopf.png", belege)
            self.assertNotIn("ui/selten.png", belege,
                             "aus zwei Vergleichen laesst sich nichts ableiten")
            self.assertEqual(belege["ui/knopf.png"]["kleinster_treffer"], 0.91)
            self.assertEqual(belege["ui/knopf.png"]["groesster_fehlschlag"], 0.62)

    def test_alter_zaehlt_nach_dem_bericht_nicht_nach_der_datei(self):
        """git schreibt beim Pull Dateien neu - die Dateizeit luegt danach.

        Vor jedem Lauf zieht das Startskript einen neuen Stand. Waere die
        Dateizeit massgeblich, saehe ein stundenalter Bericht taufrisch aus,
        und der Bot schwiege weiter.
        """
        with tempfile.TemporaryDirectory() as ordner:
            ziel = os.path.join(ordner, "lauf.json")
            alt = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                time.gmtime(time.time() - 7200))
            with open(ziel, "w", encoding="utf-8") as fh:
                json.dump({"zeit_utc": alt}, fh)      # Datei frisch, Bericht alt
            self.assertGreater(
                Engine._alter_des_berichts(ziel), 7000,
                "das Alter muss aus dem Bericht kommen, nicht aus der Dateizeit")

    def test_absturzschleife_erzeugt_keine_commit_flut(self):
        """Ein Bot, der jede Minute neu startet, darf nicht jede Minute schreiben."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            ziel = os.path.join(ordner, "austausch", "lauf.json")
            zuerst = os.path.getmtime(ziel)
            eng.steps = 999
            eng.run_actions([{"lebenszeichen": {"hochladen": False,
                                                "mindestabstand": 600}}], "test")
            self.assertEqual(json.load(open(ziel, encoding="utf-8"))["schritte"], 42,
                             "innerhalb des Mindestabstands darf nichts neu geschrieben werden")
            self.assertEqual(os.path.getmtime(ziel), zuerst)

    def test_bild_kommt_mit_und_steht_im_bericht(self):
        """Ohne Bild weiss man DASS er laeuft, aber nicht WO er steht."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            bild = os.path.join(ordner, "austausch", "lauf.png")
            self.assertTrue(os.path.exists(bild), "lauf.png muss entstehen")
            d = json.load(open(os.path.join(ordner, "austausch", "lauf.json"),
                               encoding="utf-8"))
            self.assertEqual(d["bild"], "austausch/lauf.png")
            # Vorgabe 0.35 der Kantenlaenge des FakeDevice-Bildes (120x200)
            self.assertEqual(Image.load(bild).width, 42)

    def test_gleicher_bildschirm_erzeugt_kein_zweites_bild(self):
        """Ein zweites Bild desselben Bildschirms sagt nichts und wiegt viel."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            bild = os.path.join(ordner, "austausch", "lauf.png")
            zuerst = os.path.getmtime(bild)
            eng.run_actions([{"lebenszeichen": {"hochladen": False,
                                                "mindestabstand": 0,
                                                "bild_abstand": 0}}], "test")
            self.assertEqual(os.path.getmtime(bild), zuerst,
                             "unveraenderter Bildschirm darf kein neues Bild erzeugen")
            d = json.load(open(os.path.join(ordner, "austausch", "lauf.json"),
                               encoding="utf-8"))
            self.assertIn("unveraendert", d["bild"] or "")

    def test_bild_wird_nicht_bei_jedem_lebenszeichen_neu_geschrieben(self):
        """Zahlen sind billig, Bilder nicht - sie brauchen einen eigenen Takt."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            bild = os.path.join(ordner, "austausch", "lauf.png")
            zuerst = os.path.getmtime(bild)
            eng.run_actions([{"lebenszeichen": {"hochladen": False,
                                                "mindestabstand": 0,
                                                "bild_abstand": 3600}}], "test")
            self.assertEqual(os.path.getmtime(bild), zuerst,
                             "innerhalb des Bild-Abstands darf kein neues Bild entstehen")
            d = json.load(open(os.path.join(ordner, "austausch", "lauf.json"),
                               encoding="utf-8"))
            self.assertIsNone(d["bild"], "ohne neues Bild darf der Bericht keines melden")


    def test_ohne_mindestabstand_wird_fortgeschrieben(self):
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            eng = self.bau(ordner)
            eng.run_actions([{"lebenszeichen": {"hochladen": False}}], "test")
            eng.steps = 999
            eng.run_actions([{"lebenszeichen": {"hochladen": False,
                                                "mindestabstand": 0}}], "test")
            ziel = os.path.join(ordner, "austausch", "lauf.json")
            self.assertEqual(json.load(open(ziel, encoding="utf-8"))["schritte"], 999)



class TestGeduld(unittest.TestCase):
    """Warten muss erlaubt sein - aber nicht endlos.

    Ein Ladebildschirm sieht minutenlang gleich aus. Die Bremsen gegen
    Endlos-Schleifen wuerden genau die Regel stilllegen, die ihn erkennt, und
    der Bot faenge an, darauf herumzutippen. Umgekehrt darf er vor einem
    eingefrorenen Ladebalken nicht bis in alle Ewigkeit warten.
    """

    def bau(self, geduldig, uhr):
        tpl = noise(20, 20, 77)
        screen = noise(200, 300, 78)
        paste(screen, tpl, 40, 50)
        tpl.save(os.path.join(self.ordner, "warten.png"))
        cfg = Config.from_dict({
            "package": "x",
            "templates_dir": ".",
            "regel_wirkungslos_grenze": 2,
            "regel_hoechstens_je_fenster": 3,
            "rules": [{"name": "warten", "geduldig": geduldig,
                       "match": {"template": "warten.png", "threshold": 0.8},
                       "do": [{"sleep": 0}]}],
        }, path=os.path.join(self.ordner, "cfg.json"))
        dev = FakeDevice([screen], loop=True)
        return Engine(cfg, dev, logger=quiet(), sleep=lambda s: None,
                      seed=3, clock=uhr)

    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.ordner = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_ohne_geduld_wird_die_regel_gebremst(self):
        jetzt = [1000.0]
        eng = self.bau(False, lambda: jetzt[0])
        for _ in range(12):
            eng.step()
            jetzt[0] += 1
        self.assertTrue(eng.stats.get("regel-gebremst", 0)
                        or eng.stats.get("regel-stillgelegt", 0),
                        "eine normale Dauer-Regel muss gebremst werden")

    def test_geduldige_regel_darf_lange_warten(self):
        jetzt = [1000.0]
        eng = self.bau(True, lambda: jetzt[0])
        for _ in range(40):
            eng.step()
            jetzt[0] += 1
        self.assertEqual(eng.stats.get("regel-gebremst", 0), 0)
        self.assertEqual(eng.stats.get("regel-stillgelegt", 0), 0)
        self.assertEqual(eng.gleiche_ansicht, 0,
                         "die Festgefahren-Pruefung darf nicht hochzaehlen")

    def test_geduld_mit_grenze_laeuft_ab(self):
        jetzt = [1000.0]
        eng = self.bau(120, lambda: jetzt[0])
        for _ in range(6):          # innerhalb der Grenze: unangetastet
            eng.step()
            jetzt[0] += 10
        self.assertEqual(eng.stats.get("geduld-am-ende", 0), 0)
        for _ in range(12):         # ueber 120 Sekunden hinaus
            eng.step()
            jetzt[0] += 10
        self.assertGreater(eng.stats.get("geduld-am-ende", 0), 0,
                           "nach der Grenze muss der Bildschirm als haengend gelten")

    def test_lange_pause_startet_die_geduld_neu(self):
        """Zwei getrennte Ladevorgaenge duerfen nicht zusammengezaehlt werden."""
        jetzt = [1000.0]
        eng = self.bau(120, lambda: jetzt[0])
        for _ in range(6):
            eng.step()
            jetzt[0] += 10
        jetzt[0] += 600            # lange nichts - neuer Vorgang
        for _ in range(6):
            eng.step()
            jetzt[0] += 10
        self.assertEqual(eng.stats.get("geduld-am-ende", 0), 0)


class TestLadebildschirm(unittest.TestCase):
    """Der Startbildschirm ist kein unbekannter Bildschirm, sondern Warten."""

    def test_regel_ist_geduldig_und_tippt_nicht(self):
        cfg = json.load(open(os.path.join(ROOT, "config", "last-asylum.json"),
                             encoding="utf-8"))
        regel = next(r for r in cfg["rules"] if r["name"] == "ladebildschirm-abwarten")
        self.assertTrue(regel.get("geduldig"))
        erlaubt = {"log", "sleep"}
        for schritt in regel["do"]:
            self.assertIn(next(iter(schritt)), erlaubt,
                          "auf dem Ladebildschirm darf nichts angetippt werden")


    def test_durchlauf_auf_dem_startbildschirm_tippt_nichts(self):
        """Der Test, der den Fehler gefunden haette.

        Die Vorlagen-Tests prueften nur, ob eine Vorlage passt. Ob die Regel im
        echten Durchlauf ueberhaupt drankommt, prueft erst dieser hier: vorher
        arbeitete der Bot auf dem Ladebildschirm Aufgaben ab und tippte in der
        Stadt herum, die es gar nicht gab.
        """
        bild = os.path.join(ROOT, "austausch", "ladebildschirm.png")
        if not os.path.exists(bild):
            self.skipTest("ladebildschirm.png liegt nicht vor")
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        dev = FakeDevice([Image.load(bild)], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
        for _ in range(4):
            eng.step()
        self.assertEqual(dev.taps, [], f"auf dem Ladebildschirm wurde getippt: {dev.taps}")
        self.assertEqual(dev.swipes, [], "und gewischt werden darf auch nicht")
        self.assertGreater(eng.stats.get("rule:ladebildschirm-abwarten", 0), 0,
                           "die Warte-Regel muss ueberhaupt drankommen")

    def test_vorlage_trifft_das_echte_bild_und_sonst_nichts(self):
        """Auch hier ueber die Engine - sie bringt ihre eigene Skalierung mit."""
        bild = os.path.join(ROOT, "austausch", "ladebildschirm.png")
        anderes = os.path.join(ROOT, "austausch", "schild.png")
        pfad = os.path.join(ROOT, "templates", "ui", "ladebildschirm.png")
        for p in (bild, anderes, pfad):
            if not os.path.exists(p):
                self.skipTest(f"{os.path.basename(p)} liegt nicht vor")
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        regel = next(r for r in cfg.rules if r.name == "ladebildschirm-abwarten")
        eng = motor(bild, cfg)
        self.assertIsNotNone(eng.find(regel.match),
                             "auf dem Startbildschirm muss die Vorlage greifen")
        eng.screen = Image.load(anderes)
        self.assertIsNone(eng.find(regel.match),
                          "die Vorlage darf nicht auf einem anderen Bildschirm anschlagen")



class TestAnsichtenSammeln(unittest.TestCase):
    """Der Bot soll die fehlenden Bildschirme selbst beschaffen.

    32 Vorlagen fehlen und blockieren Aufgaben - darunter das automatische
    Beitreten zu Versammlungen. Bisher hiess das: der Nutzer macht ein Foto.
    """

    def bau(self, ordner, bilder):
        import subprocess
        subprocess.run(["git", "init", "-q", ordner], check=True)
        for k, v in (("user.email", "b@t"), ("user.name", "Bot")):
            subprocess.run(["git", "-C", ordner, "config", k, v], check=True)
        open(os.path.join(ordner, "start"), "w").write("x")
        subprocess.run(["git", "-C", ordner, "add", "-A"], check=True)
        subprocess.run(["git", "-C", ordner, "commit", "-qm", "start"], check=True)
        cfg = Config.from_dict({"package": "x", "tasks": [], "rules": []},
                               path=os.path.join(ordner, "cfg.json"))
        dev = FakeDevice(bilder, loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1,
                     state_file=os.path.join(ordner, "zustand.json"))
        return eng, dev

    def test_neue_ansichten_landen_im_ordner_gleiche_nicht(self):
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            a, b = noise(120, 200, 11), noise(120, 200, 22)
            eng, dev = self.bau(ordner, [a, b])
            aktion = [{"ansicht_sammeln": {"hochladen": False}}]
            for bild in (a, a, b, b, a):
                eng.screen = bild
                eng.run_actions(aktion, "test")
            ziel = os.path.join(ordner, "austausch", "ansichten")
            dateien = sorted(f for f in os.listdir(ziel) if f.endswith(".png"))
            self.assertEqual(len(dateien), 2,
                             f"zwei verschiedene Ansichten, gesammelt: {dateien}")
            self.assertTrue(os.path.exists(os.path.join(ziel, "liste.txt")))

    def test_obergrenze_wird_eingehalten(self):
        """Ohne Grenze laeuft das Repository mit Bildern voll."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            bilder = [noise(120, 200, 100 + i) for i in range(6)]
            eng, dev = self.bau(ordner, bilder)
            for bild in bilder:
                eng.screen = bild
                eng.run_actions([{"ansicht_sammeln": {"hochladen": False,
                                                      "hoechstens": 3}}], "test")
            ziel = os.path.join(ordner, "austausch", "ansichten")
            dateien = [f for f in os.listdir(ziel) if f.endswith(".png")]
            self.assertEqual(len(dateien), 3)

    def test_gesammeltes_ueberlebt_den_neustart(self):
        """Sonst faengt der Bot nach jedem Absturz von vorn an zu sammeln."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            a = noise(120, 200, 33)
            eng, dev = self.bau(ordner, [a])
            eng.screen = a
            eng.run_actions([{"ansicht_sammeln": {"hochladen": False}}], "test")
            cfg = Config.from_dict({"package": "x", "tasks": [], "rules": []},
                                   path=os.path.join(ordner, "cfg.json"))
            zweiter = Engine(cfg, FakeDevice([a], loop=True), logger=quiet(),
                             sleep=lambda s: None, seed=1,
                             state_file=os.path.join(ordner, "zustand.json"))
            zweiter.screen = a
            zweiter.run_actions([{"ansicht_sammeln": {"hochladen": False}}], "test")
            ziel = os.path.join(ordner, "austausch", "ansichten")
            self.assertEqual(len([f for f in os.listdir(ziel) if f.endswith(".png")]), 1,
                             "dieselbe Ansicht darf nach einem Neustart nicht erneut anfallen")

    def test_schwarzes_bild_wird_nicht_gesammelt(self):
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            leer = Image.new(120, 200, (0, 0, 0))
            eng, dev = self.bau(ordner, [leer])
            eng.screen = leer
            eng.run_actions([{"ansicht_sammeln": {"hochladen": False}}], "test")
            ziel = os.path.join(ordner, "austausch", "ansichten")
            self.assertFalse(os.path.isdir(ziel) and
                             [f for f in os.listdir(ziel) if f.endswith(".png")],
                             "ein leerer Bildschirm ist keine Ansicht")



class TestTestdateiIstGesund(unittest.TestCase):
    """Ein doppelt vergebener Klassenname loescht die erste Fassung lautlos.

    TestErkundung war zweimal definiert - vier Tests liefen monatelang nie,
    ohne dass irgendetwas rot wurde.
    """

    def test_keine_doppelten_klassennamen(self):
        import ast
        import collections
        baum = ast.parse(open(__file__, encoding="utf-8").read())
        namen = [n.name for n in baum.body if isinstance(n, ast.ClassDef)]
        doppelt = [n for n, k in collections.Counter(namen).items() if k > 1]
        self.assertEqual(doppelt, [], f"doppelt vergebene Klassennamen: {doppelt}")

    def test_keine_doppelten_testnamen_je_klasse(self):
        import ast
        import collections
        baum = ast.parse(open(__file__, encoding="utf-8").read())
        for klasse in [n for n in baum.body if isinstance(n, ast.ClassDef)]:
            namen = [f.name for f in klasse.body
                     if isinstance(f, ast.FunctionDef) and f.name.startswith("test")]
            doppelt = [n for n, k in collections.Counter(namen).items() if k > 1]
            self.assertEqual(doppelt, [], f"{klasse.name}: {doppelt}")



class TestFluchtwegWirdNichtGebremst(unittest.TestCase):
    """Die Wirkungslos-Bremse darf nicht ausgerechnet den Ausgang zumauern.

    Die Bremse fragt: hat sich an dieser Stelle beim letzten Mal etwas
    geruehrt? Auf einem festgefahrenen Bildschirm ist die Antwort immer nein -
    und genau dort setzen Ausweg-Suche und Erkundung an.
    """

    def test_gleicher_fluchttipp_wird_wiederholt(self):
        screen = noise(200, 300, 55)
        cfg = Config.from_dict({
            "package": "x",
            "on_unknown": [{"tap": [0.5, 0.5]}],
            "rules": [], "tasks": [],
        })
        dev = FakeDevice([screen], loop=True)   # Bild aendert sich NIE
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4)
        eng.screen = screen
        eng.capture()
        for _ in range(4):
            eng._ausweg_suchen("test")
        self.assertGreaterEqual(
            len(dev.taps), 4,
            f"jeder Ausweg-Versuch muss tippen duerfen, getippt wurde: {dev.taps}")

    def test_normaler_tipp_bleibt_gebremst(self):
        """Die Bremse selbst muss weiter wirken - sonst haemmert der Bot."""
        screen = noise(200, 300, 56)
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []})
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4)
        eng.screen = screen
        for _ in range(5):
            eng._tap_abs(100, 150, "Punkt")
        self.assertEqual(len(dev.taps), 1,
                         f"ausserhalb der Flucht darf nur der erste Tipp durch: {dev.taps}")

    def test_tabu_zone_gilt_auch_auf_der_flucht(self):
        """Echtgeld bleibt tabu - auch wenn der Bot festsitzt."""
        screen = noise(200, 300, 57)
        cfg = Config.from_dict({
            "package": "x", "rules": [], "tasks": [],
            "tabu_regionen": [[0.0, 0.0, 1.0, 1.0]],
        })
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4)
        eng.screen = screen
        eng._auf_der_flucht = True
        eng._tap_abs(100, 150, "Punkt")
        self.assertEqual(dev.taps, [], "die Tabu-Zone darf die Flucht nicht aushebeln")



class TestBerichtsAufgabenStehenVorn(unittest.TestCase):
    """Am 22.08. lief der Bot 48 Minuten ohne ein einziges Lebenszeichen.

    Nicht das Hochladen war schuld, sondern die Reihenfolge: sechzehn Aufgaben
    stehen auf Sofortstart, jeder Schritt fuehrt genau EINE aus - die mit der
    hoechsten Prioritaet. Mit 95 stand das Lebenszeichen an 22. Stelle, hinter
    jedem langen Rundgang durchs Spiel. Von aussen sah das aus wie ein toter
    Bot, und genau das soll es ja unterscheiden.
    """

    def aufgaben(self):
        with open(os.path.join(ROOT, "config", "last-asylum.json"), encoding="utf-8") as fh:
            return {t["name"]: t for t in json.load(fh)["tasks"]}

    def test_lebenszeichen_kommt_vor_den_langen_rundgaengen(self):
        aufg = self.aufgaben()
        melder = aufg["lebenszeichen"]["priority"]
        lang = [(t["name"], t.get("priority", 50)) for t in aufg.values()
                if t.get("at_start") and (t.get("every") or 0) >= 1800
                and t["name"] not in ("lebenszeichen", "kalibrieren")]
        zu_hoch = [(n, p) for n, p in lang if p >= melder]
        self.assertEqual(
            zu_hoch, [],
            f"das Lebenszeichen (Prioritaet {melder}) darf nicht hinter langen "
            f"Sofortstart-Aufgaben stehen: {zu_hoch}")

    # Aufgaben, die NICHT durchs Spiel laufen, sondern nur Buch fuehren oder
    # lernen. Sie kosten Sekundenbruchteile; hinter den Rundgaengen zu stehen
    # kostet sie dagegen Stunden.
    BUCHFUEHRUNG = ("lebenszeichen", "ansichten-sammeln", "selbst-aktualisieren",
                    "selbstbericht", "selbst-optimieren")

    def test_buchfuehrung_verhungert_nicht(self):
        """Billige Aufgaben hinter teuren Rundgaengen kommen praktisch nie dran.

        'selbst-aktualisieren' stand auf 100 - jede Verbesserung erreichte den
        laufenden Bot damit erst beim naechsten Neustart von Hand.
        'selbst-optimieren' stand auf 30, also an letzter Stelle: der Bot hat
        seine eigenen Takte nie nachgezogen, obwohl das Werkzeug dafuer da ist.
        """
        aufg = self.aufgaben()
        zu_tief = [(n, aufg[n]["priority"]) for n in self.BUCHFUEHRUNG
                   if aufg[n]["priority"] < 200]
        self.assertEqual(
            zu_tief, [],
            f"diese Aufgaben fuehren nur Buch und muessen vorn stehen: {zu_tief}")


class TestZiffernSatzMussVollstaendigSein(unittest.TestCase):
    """Ein halber Ziffern-Satz ist gefaehrlicher als gar keiner.

    Fehlt die 0, liest der Bot aus "20" eine "2" - und rechnet dann mit 2
    weiter. Eine Regel wie "Versammlung ab 20 Energie" ginge damit zur voellig
    falschen Zeit los. Genau so lagen die Vorlagen im Repository: fuenf von
    zehn in templates/ziffern, fuenf andere in templates/ziffern-timer.
    """

    def _engine(self, ordner):
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []},
                               path=os.path.join(ordner, "cfg.json"))
        dev = FakeDevice([noise(200, 100, 31)], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
        eng.screen = noise(200, 100, 31)
        return eng

    def _lege_ziffern(self, ordner, zeichen):
        ziel = os.path.join(ordner, "templates", "ziffern")
        os.makedirs(ziel, exist_ok=True)
        for i, z in enumerate(zeichen):
            noise(12, 18, 40 + i).save(os.path.join(ziel, f"{z}.png"))

    def test_unvollstaendiger_satz_liest_nichts(self):
        """Mit nur der 2 im Ordner las der alte Code aus "20" eine glatte 2."""
        with tempfile.TemporaryDirectory() as ordner:
            zwei, null = noise(14, 20, 71), noise(14, 20, 72)
            ziel = os.path.join(ordner, "templates", "ziffern")
            os.makedirs(ziel, exist_ok=True)
            zwei.save(os.path.join(ziel, "2.png"))       # NUR die 2 - Satz unvollstaendig
            schirm = noise(200, 100, 73)
            paste(schirm, zwei, 40, 40)
            paste(schirm, null, 56, 40)                  # daneben steht die 0
            eng = self._engine(ordner)
            eng.screen = schirm
            self.assertIsNone(
                eng.lies_zahl({}),
                "mit halbem Satz darf keine Zahl herauskommen - sonst wird aus 20 eine 2")

    def test_vollstaendiger_satz_liest_die_zahl(self):
        """Die Gegenprobe: mit allen zehn Vorlagen kommt die richtige Zahl."""
        with tempfile.TemporaryDirectory() as ordner:
            ziffern = {z: noise(14, 20, 80 + i) for i, z in enumerate("0123456789")}
            ziel = os.path.join(ordner, "templates", "ziffern")
            os.makedirs(ziel, exist_ok=True)
            for z, bild in ziffern.items():
                bild.save(os.path.join(ziel, f"{z}.png"))
            schirm = noise(200, 100, 90)
            paste(schirm, ziffern["2"], 40, 40)
            paste(schirm, ziffern["0"], 56, 40)
            eng = self._engine(ordner)
            eng.screen = schirm
            self.assertEqual(eng.lies_zahl({"hoechstens": 2}), 20)

    def test_vollstaendiger_satz_wird_benutzt(self):
        with tempfile.TemporaryDirectory() as ordner:
            self._lege_ziffern(ordner, "0123456789")
            eng = self._engine(ordner)
            self.assertEqual(len(eng._ziffern("ziffern")), 10)

    def test_zweiter_ordner_bekommt_nicht_den_ersten_satz(self):
        """Die Schriften unterscheiden sich - ein Satz passt nicht auf den anderen."""
        with tempfile.TemporaryDirectory() as ordner:
            self._lege_ziffern(ordner, "0123456789")
            eng = self._engine(ordner)
            eng._ziffern("ziffern")
            self.assertEqual(eng._ziffern("gibtsnicht"), {},
                             "ein leerer Ordner darf nicht den gemerkten Satz liefern")


class TestOffeneListeStimmt(unittest.TestCase):
    """Die Tabelle im README muss sagen, was wirklich fehlt.

    Sie stand ueber Wochen falsch: sieben laengst geschnittene Vorlagen waren
    noch aufgefuehrt, elf fehlende fehlten - darunter allianz/beitreten.png,
    von dem die zeitkritischste Regel ueberhaupt abhaengt. Wer die Liste
    abarbeitet, schneidet sonst das Falsche.
    """

    def test_readme_nennt_genau_die_fehlenden_vorlagen(self):
        import re
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        cfg.validate()
        offen = set(cfg.offene_templates)
        txt = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
        try:
            start = txt.index("### Die offene Liste")
            ende = txt.index("### \u26a0 Die Schild-Aufgabe")
        except ValueError:
            self.skipTest("Abschnitt 'Die offene Liste' gibt es nicht mehr")
        tabelle = set(re.findall(r"`([a-z_]+/[a-z0-9_]+\.png)`", txt[start:ende]))
        self.assertEqual(
            tabelle - offen, set(),
            "diese Vorlagen gibt es laengst - raus aus der Tabelle: "
            f"{sorted(tabelle - offen)}")
        self.assertEqual(
            offen - tabelle, set(),
            "diese Vorlagen fehlen wirklich, stehen aber nicht in der Tabelle: "
            f"{sorted(offen - tabelle)}")


class TestAusschnittInVollerAufloesung(unittest.TestCase):
    """Gesammelte Ansichten liegen halbiert im Repository - zu grob fuer Ziffern.

    Eine halbierte 8 ist von einer halbierten 9 kaum zu unterscheiden, und eine
    falsch gelesene Zahl ist schlimmer als gar keine. Genau daran haengt die
    Energie-Schranke ("Versammlung ab 20 Energie").
    """

    def _lauf(self, ordner, screen, **mehr):
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []})
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
        spec = {"datei": "austausch/hud-oben.png", "region": [0.0, 0.0, 1.0, 0.25],
                "hochladen": False, "mindestabstand": 0, "verzeichnis": ordner}
        spec.update(mehr)
        eng.run_actions([{"ausschnitt": spec}], "test")
        return os.path.join(ordner, "austausch", "hud-oben.png")

    def test_ausschnitt_behaelt_die_originalgroesse(self):
        with tempfile.TemporaryDirectory() as ordner:
            ziel = self._lauf(ordner, noise(400, 800, 21))
            self.assertTrue(os.path.exists(ziel), "der Ausschnitt muss abgelegt werden")
            bild = Image.load(ziel)
            self.assertEqual((bild.width, bild.height), (400, 200),
                             "Ausschnitt darf nicht verkleinert werden")

    def test_schwarzer_bildschirm_wird_nicht_abgelegt(self):
        with tempfile.TemporaryDirectory() as ordner:
            ziel = self._lauf(ordner, Image(40, 60, "RGB", bytearray(40 * 60 * 3)))
            self.assertFalse(os.path.exists(ziel),
                             "aus einem leeren Bildschirm gibt es nichts zu holen")

    def test_mindestabstand_verhindert_commit_flut(self):
        with tempfile.TemporaryDirectory() as ordner:
            ziel = self._lauf(ordner, noise(400, 800, 22))
            vorher = open(ziel, "rb").read()
            self._lauf(ordner, noise(400, 800, 23), mindestabstand=3600)
            self.assertEqual(open(ziel, "rb").read(), vorher,
                             "innerhalb des Mindestabstands bleibt die Datei stehen")


class TestLebenszeichenSagtWasLosIst(unittest.TestCase):
    """Zahlen ohne Deutung schicken einen an das falsche Ende.

    Das Lebenszeichen vom 15.08. meldete Schritt 0 und 271 gebremste gegen 3
    ausgefuehrte Tipps. Der eigentliche Grund - der Bildschirm kam vollstaendig
    schwarz an - stand nur im Bild daneben.
    """

    def _engine(self):
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []})
        dev = FakeDevice([noise(40, 60, 9)], loop=True)
        return Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)

    def test_schwarzer_bildschirm_steht_im_bericht(self):
        eng = self._engine()
        eng.screen = Image(40, 60, "RGB", bytearray(40 * 60 * 3))
        text = " ".join(eng._hinweise())
        self.assertIn("einfarbig", text)
        self.assertIn("BlueStacks", text,
                      "der Hinweis muss auch sagen, was zu tun ist")

    def test_lahmgelegte_bremse_steht_im_bericht(self):
        eng = self._engine()
        eng.screen = noise(40, 60, 10)
        eng.stats["wirkungslos"] = 271
        eng.stats["taps"] = 3
        self.assertIn("Bremse", " ".join(eng._hinweise()))

    def test_gesunder_lauf_meldet_nichts(self):
        eng = self._engine()
        eng.screen = noise(40, 60, 11)
        eng.stats["wirkungslos"] = 4
        eng.stats["taps"] = 40
        self.assertEqual(eng._hinweise(), [],
                         "ohne Befund darf der Bericht nicht schwatzen")


class TestBremseSperrtKeineKnoepfe(unittest.TestCase):
    """Die Wirkungslos-Bremse hat den Bot live komplett stillgelegt.

    Im Protokoll des laufenden Bots standen 271 gebremste gegen 3 ausgefuehrte
    Tipps. Grund: die Bremse sah nur den Fleck unter dem Finger an. Lupe,
    Welt-Symbol und Suchen-Knopf sehen nach dem Druecken aber genauso aus wie
    vorher - sie oeffnen etwas woanders. Nach dem ersten Druck galten sie als
    tot, und weil gebremste Tipps nicht in den Verlauf kommen, blieb dieser
    Befund fuer immer stehen.
    """

    @staticmethod
    def _kopie(bild):
        return Image(bild.width, bild.height, bild.mode, bytearray(bild.data))

    def _aufbau(self, seed):
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []})
        a = noise(200, 300, seed)
        dev = FakeDevice([a], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4)
        return cfg, a, dev, eng

    def test_knopf_der_sich_nicht_veraendert_bleibt_druckbar(self):
        _, a, dev, eng = self._aufbau(60)
        # Zweites Bild: unter dem Finger identisch, oben ein heller Balken -
        # so verhaelt sich jeder Knopf, der ein Fenster daneben aufmacht.
        b = self._kopie(a)
        paste(b, Image(200, 60, "RGB", bytearray([250] * 200 * 60 * 3)), 0, 0)
        eng.screen = a
        eng._tap_abs(100, 150, "nav/lupe.png")
        eng.screen = b
        eng._tap_abs(100, 150, "nav/lupe.png")
        self.assertEqual(
            len(dev.taps), 2,
            "der Knopf hat etwas bewirkt (anderer Bildschirm) - er muss wieder "
            f"gedrueckt werden duerfen, getippt wurde: {dev.taps}")

    def test_knopf_wird_nicht_zu_unrecht_verdaechtigt(self):
        """Ein gebremster Tipp zaehlt gegen die Vorlage - darum nur zu Recht."""
        _, a, dev, eng = self._aufbau(61)
        b = self._kopie(a)
        paste(b, Image(200, 60, "RGB", bytearray([250] * 200 * 60 * 3)), 0, 0)
        eng.screen = a
        eng._tap_abs(100, 150, "nav/lupe.png")
        eng.screen = b
        eng._tap_abs(100, 150, "nav/lupe.png")
        self.assertEqual(eng._folgenlos.get("nav/lupe.png", 0), 0,
                         "eine Vorlage, die etwas bewirkt, darf nicht in "
                         "Verdacht geraten")

    def test_toter_fleck_bleibt_gebremst(self):
        """Aendert sich nirgends etwas, bleibt die Bremse scharf."""
        _, a, dev, eng = self._aufbau(62)
        eng.screen = a
        for _ in range(5):
            eng._tap_abs(100, 150, "Punkt")
        self.assertEqual(len(dev.taps), 1,
                         f"auf totem Grund darf nur der erste Tipp durch: {dev.taps}")

    def test_alter_befund_verjaehrt(self):
        """Sonst steht ein einmal toter Punkt fuer immer im Verlauf."""
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []})
        a = noise(200, 300, 63)
        dev = FakeDevice([a], loop=True)
        uhr = [1000.0]
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=4,
                     clock=lambda: uhr[0])
        eng.screen = a
        eng._tap_abs(100, 150, "Punkt")
        eng._tap_abs(100, 150, "Punkt")
        self.assertEqual(len(dev.taps), 1, "sofort danach bleibt gebremst")
        uhr[0] += Engine.VERLAUF_HALTBARKEIT + 1
        eng._tap_abs(100, 150, "Punkt")
        self.assertEqual(len(dev.taps), 2,
                         "nach der Haltbarkeit muss der Punkt wieder frei sein")


class TestTaktAnpassungMisstNurNeues(unittest.TestCase):
    """Alte Protokollzeilen duerfen nicht bei jedem Durchgang erneut zaehlen.

    Sonst schraubt sich der Takt Runde um Runde weiter nach oben, obwohl gar
    keine neuen Belege dazugekommen sind - bis alles nur noch einmal am Tag
    laeuft.
    """

    def schreibe(self, ordner, eintraege):
        pfad = os.path.join(ordner, "lauf.jsonl")
        with open(pfad, "w", encoding="utf-8") as fh:
            for name, tipps, ts in eintraege:
                fh.write(json.dumps({"ev": "aufgabe", "aufgabe": name,
                                     "tipps": tipps, "ts": ts}) + "\n")
        return os.path.join(ordner, "*.jsonl")

    def motor(self, ordner, aufgaben):
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": aufgaben},
                               path=os.path.join(ordner, "cfg.json"))
        return Engine(cfg, FakeDevice([noise(40, 60, 1)], loop=True),
                      logger=quiet(), sleep=lambda s: None, seed=1)

    def test_dieselben_zeilen_wirken_nur_einmal(self):
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            muster = self.schreibe(ordner, [("leerlauf", 0, 1000.0 + i) for i in range(5)])
            eng = self.motor(ordner, [{"name": "leerlauf", "every": 600,
                                       "do": [{"log": "x"}]}])
            spec = {"logs": muster, "min_laeufe": 3, "min_takt": 300, "max_takt": 86400}
            eng._optimiere_takte(spec)
            nach_erstem = next(t.every for t in eng.cfg.tasks if t.name == "leerlauf")
            self.assertGreater(nach_erstem, 600, "leerlaufende Aufgabe muss seltener werden")
            for _ in range(3):
                eng._optimiere_takte(spec)
            nach_weiteren = next(t.every for t in eng.cfg.tasks if t.name == "leerlauf")
            self.assertEqual(nach_weiteren, nach_erstem,
                             "ohne neue Belege darf sich nichts mehr aendern")

    def test_ausnahmen_werden_nie_gedrosselt(self):
        """Waechter tippen nie - am Tipp-Mass gemessen wuerden sie totgedrosselt."""
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            muster = self.schreibe(ordner, [("lebenszeichen", 0, 1000.0 + i) for i in range(5)])
            eng = self.motor(ordner, [{"name": "lebenszeichen", "every": 900,
                                       "do": [{"log": "x"}]}])
            eng._optimiere_takte({"logs": muster, "min_laeufe": 3,
                                  "ausnahmen": ["lebenszeichen"]})
            self.assertEqual(next(t.every for t in eng.cfg.tasks if t.name == "lebenszeichen"),
                             900, "eine Ausnahme darf nicht angefasst werden")



class TestBesterTrefferStattErstemKandidaten(unittest.TestCase):
    """find() muss den besten Treffer liefern, nicht den erstbesten.

    Der grobe Vorlauf rechnet auf ~180 px Breite. Ein feines Muster mittelt
    sich dort zu Grau weg, und eine graue Flaeche anderswo sieht besser aus als
    die echte Fundstelle. Vorher brach die Schleife beim ersten Kandidaten
    ueber der Schwelle ab - das abschliessende Sortieren lief damit auf einer
    einelementigen Liste und war wirkungslos. Gemessen: alte Fassung 9 von 12,
    neue 11 von 12.
    """

    def test_feines_muster_wird_trotz_grauem_koeder_gefunden(self):
        breite, hoehe, kante = 900, 1200, 40
        tpl = Image.new(kante, kante, (0, 0, 0))
        for y in range(kante):
            for x in range(kante):
                wert = 255 if (x + y) % 2 == 0 else 0
                for k in range(3):
                    tpl.data[(y * kante + x) * 3 + k] = wert

        richtig = 0
        for versuch in range(12):
            screen = Image.new(breite, hoehe, (128, 128, 128))
            zx, zy = 600 + versuch, 800
            for y in range(kante):
                for x in range(kante):
                    for k in range(3):
                        screen.data[((zy + y) * breite + zx + x) * 3 + k] = \
                            tpl.data[(y * kante + x) * 3 + k]
            # Koeder: fast einfarbig, sieht im groben Durchlauf besser aus
            for y in range(kante):
                for x in range(kante):
                    wert = 130 if (x + y) % 2 == 0 else 126
                    for k in range(3):
                        screen.data[((200 + y) * breite + 150 + x) * 3 + k] = wert
            treffer = matcher.find(screen, tpl, threshold=0.3)
            if treffer and abs(treffer.x - zx) <= 2 and abs(treffer.y - zy) <= 2:
                richtig += 1
        self.assertGreaterEqual(richtig, 11, f"nur {richtig} von 12 richtig gefunden")



class TestVorlagenAnleitungStimmt(unittest.TestCase):
    """Die Anleitung in der Konfiguration darf nicht in die Irre fuehren.

    Sie schrieb bis zum 03.08. vor, Vorlagen auf 75 Prozent zu verkleinern -
    bei base_width 1440 ist das falsch, und danach geschnittene Vorlagen trafen
    im Bot nie. Eine falsche Anleitung kostet mehr als gar keine.
    """

    def test_anleitung_widerspricht_base_width_nicht(self):
        cfg = json.load(open(os.path.join(ROOT, "config", "last-asylum.json"),
                             encoding="utf-8"))
        text = cfg.get("_vorlagen_herkunft", "")
        self.assertTrue(text, "_vorlagen_herkunft fehlt")
        self.assertEqual(cfg.get("base_width"), 1440)
        self.assertIn("1440", text)
        self.assertIn("ORIGINALGROESSE", text.upper())

    def test_vorhandene_vorlagen_passen_zur_basisbreite(self):
        """Keine Vorlage darf breiter sein als der Bildschirm."""
        muster = os.path.join(ROOT, "templates", "**", "*.png")
        zu_breit = []
        for pfad in glob.glob(muster, recursive=True):
            bild = Image.load(pfad)
            if bild.width > 1440 or bild.height > 2560:
                zu_breit.append((os.path.relpath(pfad, ROOT), bild.width, bild.height))
        self.assertEqual(zu_breit, [], f"Vorlagen groesser als der Bildschirm: {zu_breit}")



class TestFarbschrankenSindGemessen(unittest.TestCase):
    """Fuellgrad-Schranken gegen echte Knoepfe pruefen, nicht gegen Vorstellungen.

    Dreimal in drei Tagen war eine solche Schranke gegen eine Vermutung gesetzt
    und damit unerreichbar: rote Abzeichen bei 0.75, der goldene Bestaetigen-
    Knopf bei 0.60, blaue Knoepfe bei 0.78. Eine Flaeche mit heller Schrift
    darauf erreicht diese Werte nie - die Schrift belegt den Rest.
    """

    @staticmethod
    def knopf(rgb, beschriftet=True, breite=300, hoehe=90):
        bild = Image.new(700, 400, (25, 30, 40))
        x0, y0 = 200, 150
        for y in range(y0, y0 + hoehe):
            for x in range(x0, x0 + breite):
                for k, v in enumerate(rgb):
                    bild.data[(y * 700 + x) * 3 + k] = v
        if beschriftet:
            for y in range(y0 + 26, y0 + 64):
                for x in range(x0 + 40, x0 + breite - 40):
                    if (x - x0) % 9 < 6:
                        for k in range(3):
                            bild.data[(y * 700 + x) * 3 + k] = 255
        return bild

    @staticmethod
    def abzeichen(ziffern, durchmesser=44):
        bild = Image.new(200, 200, (30, 40, 50))
        r = durchmesser // 2
        for y in range(200):
            for x in range(200):
                if (x - 100) ** 2 + (y - 100) ** 2 <= r * r:
                    for k, v in enumerate((228, 58, 52)):
                        bild.data[(y * 200 + x) * 3 + k] = v
        if ziffern:
            breite = 7 * ziffern
            for y in range(91, 109):
                for x in range(100 - breite // 2, 100 + breite // 2):
                    if (x - (100 - breite // 2)) % 7 < 5:
                        for k in range(3):
                            bild.data[(y * 200 + x) * 3 + k] = 255
        return bild

    def regel(self, name):
        cfg = json.load(open(os.path.join(ROOT, "config", "last-asylum.json"),
                             encoding="utf-8"))
        return next(r for r in cfg["rules"] if r["name"] == name)

    def test_blauer_knopf_mit_schrift_wird_erkannt(self):
        k = self.regel("blauer-knopf-generisch")["match"]["farbknopf"]
        bild = self.knopf(k["rgb"])
        treffer = matcher.find_color_button(
            bild, k["rgb"], tolerance=k["tolerance"], min_w=k["min_w"], max_w=k["max_w"],
            min_h=k["min_h"], max_h=0.30, min_fuellung=k["min_fuellung"])
        self.assertTrue(treffer,
                        f"ein beschrifteter blauer Knopf erreicht die geforderten "
                        f"{k['min_fuellung']} Fuellung nicht")

    def test_rote_abzeichen_mit_zahl_werden_erkannt(self):
        k = self.regel("roter-punkt-pruefen")["match"]["farbknopf"]
        for ziffern in (0, 1, 2):
            with self.subTest(ziffern=ziffern):
                treffer = matcher.find_color_button(
                    self.abzeichen(ziffern), k["rgb"], tolerance=k["tolerance"],
                    min_w=k["min_w"], max_w=k["max_w"], min_h=k["min_h"],
                    max_h=k["max_h"], min_fuellung=k["min_fuellung"])
                self.assertTrue(treffer,
                                f"Abzeichen mit {ziffern} Ziffern faellt durch "
                                f"min_fuellung={k['min_fuellung']}")

    def test_ein_voller_kreis_kommt_nie_ueber_785_promille(self):
        """Die Rechnung dahinter - damit niemand wieder 0.9 hinschreibt."""
        import math
        for name in ("roter-punkt-pruefen",):
            k = self.regel(name)["match"]["farbknopf"]
            self.assertLess(k["min_fuellung"], math.pi / 4,
                            f"{name}: mehr als {math.pi/4:.3f} kann ein Kreis nicht sein")



class TestSelbstberichtVerschweigtNichts(unittest.TestCase):
    """Ein Bericht, der beruhigt statt zu berichten, ist schlimmer als keiner.

    Er sammelte nur Vorlagen unter dem Schluessel 'template' - die aus
    tap_first stehen aber als blosse Zeichenketten in 'of' und blieben damit
    unsichtbar. Und ohne vorheriges validate() meldete er "keine Vorlage
    fehlt", obwohl 32 fehlten.
    """

    def motor(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        return Engine(cfg, FakeDevice([Image.new(10, 10)], loop=True),
                      logger=quiet(), sleep=lambda s: None)

    def test_ohne_validate_wird_trotzdem_berichtet(self):
        eng = self.motor()
        self.assertEqual(eng.cfg.offene_templates, [], "Vorbedingung: noch nicht geprueft")
        eng._selbstbericht({"hoechstens": 40})
        self.assertGreater(len(eng.cfg.offene_templates), 0,
                           "der Bericht muss selbst nachsehen, statt Ruhe zu melden")

    def test_tap_first_vorlagen_tauchen_auf(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        cfg.validate()
        aus_tap_first = set()

        def suche(knoten):
            if isinstance(knoten, dict):
                fuer = knoten.get("of")
                if isinstance(fuer, list):
                    for e in fuer:
                        if isinstance(e, str) and e.endswith(".png"):
                            aus_tap_first.add(e)
                for v in knoten.values():
                    suche(v)
            elif isinstance(knoten, list):
                for v in knoten:
                    suche(v)

        for task in cfg.tasks:
            suche(task.do)
        fehlend = aus_tap_first & set(cfg.offene_templates)
        if not fehlend:
            self.skipTest("derzeit fehlt keine tap_first-Vorlage")

        gesehen = []
        eng = Engine(cfg, FakeDevice([Image.new(10, 10)], loop=True),
                     logger=Logger(level="info"), sleep=lambda s: None)
        eng.log.info = lambda msg, **kw: gesehen.append(f"{msg} {kw}")
        eng._selbstbericht({"hoechstens": 40})
        text = " ".join(gesehen)
        for name in sorted(fehlend):
            self.assertIn(name, text, f"{name} fehlt im Bericht")



class TestKalibrierungRechnetNichtDoppelt(unittest.TestCase):
    """Ein alter Nachschlag darf nach einer Neukalibrierung nicht obendrauf kommen.

    Der gemessene Faktor ist absolut, der gespeicherte Nachschlag relativ zum
    Median. Bisher wurde nur eingetragen, wer GERADE aus der Reihe tanzte - wer
    beim vorigen Mal Ausreisser war und jetzt nicht mehr, behielt seinen alten
    Wert und wurde ab da zusaetzlich zum neuen Median gerechnet. Die Vorlage
    passt dann zu gross, trifft daneben, und der Bot tippt an die falsche
    Stelle.
    """

    def motor(self, skalen, ui_skala=1.0):
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                "base_width": 200})
        cfg.ui_skala = ui_skala
        cfg.template_skalen = dict(skalen)
        eng = Engine(cfg, FakeDevice([noise(200, 300, 3)], loop=True),
                     logger=quiet(), sleep=lambda s: None, seed=1)
        return cfg, eng

    def anwenden(self, eng, gefunden, median):
        """Den Nachschlag-Teil der Kalibrierung nachbilden."""
        vorher = eng.cfg.ui_skala
        neue = dict(eng.cfg.template_skalen)
        gemessen = {n for n, _, _ in gefunden}
        for name, f, _ in gefunden:
            nach = round(f / median, 3) if median else 1.0
            if abs(nach - 1.0) <= 0.03:
                neue.pop(name, None)
            else:
                neue[name] = nach
        if median and vorher and abs(median - vorher) > 0.001:
            verh = vorher / median
            for name in list(neue):
                if name in gemessen:
                    continue
                gez = round(neue[name] * verh, 3)
                if abs(gez - 1.0) <= 0.03:
                    neue.pop(name, None)
                else:
                    neue[name] = gez
        return neue

    def test_alter_nachschlag_verschwindet_wenn_er_nicht_mehr_noetig_ist(self):
        cfg, eng = self.motor({"nav/burg.png": 1.3}, ui_skala=1.0)
        neue = self.anwenden(eng, [("nav/burg.png", 1.0, 0.95),
                                   ("nav/held.png", 1.0, 0.95)], median=1.0)
        self.assertNotIn("nav/burg.png", neue,
                         "der alte Nachschlag wuerde sonst zum neuen Median dazugerechnet")

    def test_nicht_gemessene_vorlagen_behalten_ihre_groesse(self):
        """Ihr Nachschlag galt gegen den alten Median - er muss mitziehen."""
        cfg, eng = self.motor({"tasche/truhe.png": 1.3}, ui_skala=1.0)
        neue = self.anwenden(eng, [("nav/burg.png", 0.5, 0.95)], median=0.5)
        # absolute Groesse vorher 1.0*1.3 = 1.3, nachher 0.5*x = 1.3 -> x = 2.6
        self.assertAlmostEqual(neue["tasche/truhe.png"], 2.6, places=2)

    def test_echte_kalibrierung_setzt_die_werte_neu(self):
        """Gegen die Engine selbst, nicht nur gegen die nachgebaute Rechnung."""
        import inspect
        quelle = inspect.getsource(Engine._kalibriere)
        self.assertIn("neue_skalen", quelle,
                      "die Kalibrierung muss alle Nachschlaege neu setzen")
        self.assertNotIn("ausreisser[name] = round(f / median, 3)", quelle,
                         "die alte, nur ergaenzende Fassung ist noch drin")



class TestErkundungSchontVorraete(unittest.TestCase):
    """Die Erkundung darf keinen Gegenstand verbrauchen.

    Sie tippt blaue Knoepfe, weil Blau im Spiel Handlung oder Abbrechen
    bedeutet - beides harmlos. 'Benutzen' im Beutel ist aber dasselbe Blau, und
    die Ausdauer-Fläschchen sollen ausdruecklich fuer den Krieg bleiben.
    """

    def test_benutzen_knopf_wird_uebersprungen(self):
        pfad = os.path.join(ROOT, "templates", "ui", "btn_benutzen.png")
        if not os.path.exists(pfad):
            self.skipTest("ui/btn_benutzen.png fehlt")
        vorlage = Image.load(pfad)
        screen = noise(1440, 2560, 71)
        # Den echten Knopf mitten in die Erkundungs-Zone setzen.
        zx, zy = 500, 1200
        paste(screen, vorlage, zx, zy)
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=2)
        eng.screen = screen
        eng._scale = 1.0
        mitte_x, mitte_y = zx + vorlage.width // 2, zy + vorlage.height // 2
        self.assertTrue(eng._sieht_aus_wie_benutzen(mitte_x, mitte_y),
                        "der Benutzen-Knopf muss erkannt werden")

    def test_andere_stellen_werden_nicht_faelschlich_geschont(self):
        screen = noise(1440, 2560, 72)
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=2)
        eng.screen = screen
        eng._scale = 1.0
        self.assertFalse(eng._sieht_aus_wie_benutzen(700, 1500),
                         "ohne den Knopf darf nichts uebersprungen werden")



class TestFeinjustageDerVorlagenGroesse(unittest.TestCase):
    """Das Raster ist groeber als die Vorlage es vertraegt.

    FEIN_SCHRITTE springt in Acht- bis Zehn-Prozent-Schritten. Liegt der wahre
    Faktor dazwischen, bleibt der beste Rasterwert weit unter der Schwelle -
    die Vorlage gilt als nicht gefunden, oder sie trifft versetzt und der Tipp
    landet am Rand statt in der Mitte.

    Gemessen an austausch/schild.png mit echtem Faktor 1.13:
    bester Rasterwert 1.18 -> 0.737, nach dem Feinlauf 1.14 -> 0.981.
    """

    def test_feinlauf_findet_den_gipfel_zwischen_zwei_rasterpunkten(self):
        bild = os.path.join(ROOT, "austausch", "schild.png")
        vorlage = os.path.join(ROOT, "templates", "ui", "btn_bestaetigen.png")
        for p in (bild, vorlage):
            if not os.path.exists(p):
                self.skipTest(f"{os.path.basename(p)} liegt nicht vor")
        screen = Image.load(bild)
        # Die Vorlage so verkleinern, dass ihr Faktor zwischen zwei
        # Rasterpunkten liegt (1.08 und 1.18).
        ziel = 1.13
        klein = Image.load(vorlage).box_scaled_by(1.0 / ziel)

        def punkt(f):
            hit = matcher.best_score(screen, klein, scale=f)
            return hit.score if hit else 0.0

        grob_score, grob = max((punkt(f), f) for f in Engine.FEIN_SCHRITTE)
        fein_score, _fein = max((punkt(round(grob + i * 0.02, 3)), round(grob + i * 0.02, 3))
                                for i in range(-5, 6))
        self.assertLess(grob_score, 0.85,
                        "Vorbedingung: der reine Rasterwert soll unter der Schwelle liegen")
        self.assertGreater(fein_score, 0.95,
                           f"der Feinlauf muss den Gipfel finden: grob {grob_score:.3f}, "
                           f"fein {fein_score:.3f}")

    def test_nachjustieren_macht_den_feinlauf_wirklich(self):
        import inspect
        quelle = inspect.getsource(Engine._nachjustieren)
        self.assertIn("Feinjustage", quelle,
                      "ohne Feinlauf bleibt der Gipfel zwischen den Rasterpunkten liegen")



class TestGelerntesWirdGeprueft(unittest.TestCase):
    """Eine verdorbene gelernt.json darf den Bot nicht mitreissen.

    Sie wurde bisher ungeprueft uebernommen: ein Text statt einer Zahl warf
    beim Start eine Ausnahme, ein Zahlendreher wie 30 statt 3.0 machte alle
    Vorlagen zehnmal zu gross - der Bot tippte danach nur noch daneben.
    """

    def bau(self, inhalt):
        import tempfile
        self.ordner = tempfile.mkdtemp()
        with open(os.path.join(self.ordner, "gelernt.json"), "w", encoding="utf-8") as fh:
            json.dump(inhalt, fh)
        cfg = Config.from_dict({"package": "x", "rules": [],
                                "tasks": [{"name": "t", "every": 900, "do": [{"log": "x"}]}]},
                               path=os.path.join(self.ordner, "cfg.json"))
        return Engine(cfg, FakeDevice([noise(40, 60, 2)], loop=True), logger=quiet(),
                      sleep=lambda s: None, seed=1,
                      state_file=os.path.join(self.ordner, "zustand.json"))

    def tearDown(self):
        import shutil
        shutil.rmtree(getattr(self, "ordner", ""), ignore_errors=True)

    def test_unsinnige_werte_werden_uebergangen(self):
        eng = self.bau({"ui_skala": 30.0,
                        "template_skalen": {"a.png": "viel", "b.png": 1.3},
                        "tasks": [{"name": "t", "every": -5}]})
        self.assertEqual(eng.cfg.ui_skala, 1.0, "30.0 ist keine plausible Oberflaechen-Groesse")
        self.assertNotIn("a.png", eng.cfg.template_skalen)
        self.assertEqual(eng.cfg.template_skalen.get("b.png"), 1.3, "Gutes muss durchkommen")
        self.assertEqual(next(t.every for t in eng.cfg.tasks if t.name == "t"), 900,
                         "ein negativer Takt darf nicht uebernommen werden")

    def test_kaputte_datei_stoppt_den_start_nicht(self):
        import tempfile
        ordner = tempfile.mkdtemp()
        try:
            with open(os.path.join(ordner, "gelernt.json"), "w", encoding="utf-8") as fh:
                fh.write("{kein json")
            cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []},
                                   path=os.path.join(ordner, "cfg.json"))
            eng = Engine(cfg, FakeDevice([noise(40, 60, 2)], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=1,
                         state_file=os.path.join(ordner, "zustand.json"))
            self.assertEqual(eng.cfg.ui_skala, 1.0)
        finally:
            import shutil
            shutil.rmtree(ordner, ignore_errors=True)



class TestGeduldSchleifeUndErkundungsBudget(unittest.TestCase):
    """Zwei Mechanismen, die sich selbst aushebelten."""

    def test_neue_episode_liegt_ueber_der_stilllegungspause(self):
        """Sonst faengt die Geduld nach jeder Pause von vorn an.

        Ablauf der Schleife: Geduld laeuft ab -> Regel wird fuer 300 s
        stillgelegt -> kommt zurueck -> letzter Treffer liegt 300 s zurueck,
        also mehr als 60 -> "neuer Vorgang" -> volle Geduld -> wieder exempt.
        Der Haenger wird nie als Haenger behandelt.
        """
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                "regel_wirkungslos_pause": 300})
        eng = Engine(cfg, FakeDevice([noise(40, 60, 8)], loop=True),
                     logger=quiet(), sleep=lambda s: None, seed=1)
        self.assertGreater(eng._neue_episode(), cfg.regel_wirkungslos_pause,
                           "die Episoden-Grenze muss ueber der Stilllegungspause liegen")

    def test_erkundungs_budget_verfaellt(self):
        """Sonst ist die letzte Rettung nach sechs Versuchen fuer immer weg."""
        import tempfile
        ordner = tempfile.mkdtemp()
        try:
            screen = noise(1440, 2560, 9)
            cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                    "erkunden_hoechstens": 2},
                                   path=os.path.join(ordner, "cfg.json"))
            uhr = [1000.0]
            eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=1,
                         state_file=os.path.join(ordner, "zustand.json"),
                         now=lambda: uhr[0])
            eng.screen = screen
            eng._finger_jetzt = eng._ansicht_finger(screen)
            schluessel = eng._ansicht_schluessel()
            eng._erkundet[schluessel] = [[0.5, 0.5, 1000.0], [0.6, 0.6, 1000.0]]
            # Direkt nach den Versuchen: Budget erschoepft, nichts passiert.
            eng._erkunden(schluessel, eng._finger_jetzt)
            self.assertEqual(len(eng._erkundet[schluessel]), 2)
            # Eine Woche spaeter muss wieder Platz sein.
            uhr[0] += 8 * 24 * 3600
            eng._erkunden(schluessel, eng._finger_jetzt)
            self.assertLessEqual(len(eng._erkundet[schluessel]), 2)
            self.assertTrue(all(uhr[0] - e[2] < eng.ERKUNDUNG_VERFAELLT
                                for e in eng._erkundet[schluessel] if len(e) >= 3),
                            "abgelaufene Eintraege muessen verschwinden")
        finally:
            import shutil
            shutil.rmtree(ordner, ignore_errors=True)

    def test_alte_eintraege_ohne_zeitstempel_brechen_nichts(self):
        """Bestehende erkundung.json-Dateien haben nur [x, y]."""
        import tempfile
        ordner = tempfile.mkdtemp()
        try:
            screen = noise(1440, 2560, 10)
            cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []},
                                   path=os.path.join(ordner, "cfg.json"))
            eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=1,
                         state_file=os.path.join(ordner, "zustand.json"))
            eng.screen = screen
            eng._finger_jetzt = eng._ansicht_finger(screen)
            schluessel = eng._ansicht_schluessel()
            eng._erkundet[schluessel] = [[0.5, 0.5]]      # alte Form
            eng._erkunden(schluessel, eng._finger_jetzt)  # darf nicht krachen
            self.assertTrue(all(len(e) >= 3 for e in eng._erkundet[schluessel]),
                            "alte Eintraege muessen einen Zeitstempel bekommen")
        finally:
            import shutil
            shutil.rmtree(ordner, ignore_errors=True)



class TestStartskriptWirdBewacht(unittest.TestCase):
    """Textpruefung des PowerShell-Skripts - laeuft ueberall, braucht kein pwsh.

    Am Startskript sind mehrere Fehler vorbeigekommen, die kein Python-Test
    sehen konnte, weil kein Test es je angesehen hat: eine Zahl, die als
    negatives Int32 gelesen wird; zwei einander ausschliessende Parameter; ein
    git-Aufruf ohne Zeitgrenze, der auf eine Passwortabfrage wartet, die
    niemand sieht.
    """

    def skript(self, name="start-windows.ps1"):
        pfad = os.path.join(ROOT, name)
        if not os.path.exists(pfad):
            self.skipTest(f"{name} liegt nicht vor")
        return open(pfad, encoding="utf-8").read().split("\n")

    def test_kein_git_aufruf_ohne_zeitgrenze(self):
        """Ausserhalb der beiden Helfer darf kein git direkt aufgerufen werden."""
        zeilen = self.skript()
        in_helfer = False
        verdaechtig = []
        for nr, zeile in enumerate(zeilen, 1):
            nackt = zeile.strip()
            if nackt.startswith("function Git-"):
                in_helfer = True
            elif in_helfer and nackt == "}":
                in_helfer = False
            if in_helfer or nackt.startswith("#"):
                continue
            if "& git " in zeile or zeile.strip().startswith("git "):
                verdaechtig.append(f"{nr}: {nackt[:70]}")
        self.assertEqual(verdaechtig, [],
                         "git nur ueber Git-Text/Git-MitZeitlimit aufrufen: "
                         + "; ".join(verdaechtig))

    def test_ende_des_laufs_wird_vermerkt(self):
        """Ein angehaltener Bot sah von aussen aus wie ein laufender.

        Am 22.08. war der letzte Eintrag im Repository vier Stunden alt, und es
        war nicht zu entscheiden, ob der Bot arbeitet oder tot ist. Nach dem
        Lauf muss darum eine Datei mit Zeitpunkt und Rueckgabewert entstehen.
        """
        text = "\n".join(self.skript())
        self.assertIn("function Ende-Vermerken", text,
                      "es braucht einen Ende-Vermerk")
        self.assertIn("lauf-ende.txt", text)
        nach_lauf = text.split("bot.py --adb")[-1]
        self.assertIn("Ende-Vermerken", nach_lauf,
                      "der Vermerk muss NACH dem Lauf gesetzt werden")

    def test_alter_ende_vermerk_wird_beim_start_geloescht(self):
        """Sonst ist ein laengst ueberholtes 'Lauf beendet' der letzte Stand."""
        text = "\n".join(self.skript())
        anfang = text.index("function Abbruch-Vermerk-Loeschen")
        ende = text.index("function ", anfang + 10)
        self.assertIn("lauf-ende.txt", text[anfang:ende],
                      "beim erfolgreichen Start muss auch der Ende-Vermerk weg")

    def test_keine_grossen_hex_zahlen(self):
        """0x80000000 liest PowerShell als negatives Int32 - als Dezimalzahl schreiben."""
        import re
        schlimm = []
        for nr, zeile in enumerate(self.skript(), 1):
            # Kommentare ausnehmen: dort steht die Erklaerung des Fehlers vom
            # 01.08. samt der Zahl, und die soll stehen bleiben duerfen.
            code = zeile.split("#", 1)[0]
            for treffer in re.findall(r"0x[0-9a-fA-F]{8}", code):
                if int(treffer, 16) > 2147483647:
                    schlimm.append(f"{nr}: {treffer}")
        self.assertEqual(schlimm, [], "; ".join(schlimm))

    def test_start_process_bekommt_eine_zeichenkette(self):
        """-ArgumentList als Feld zerbricht an Pfaden mit Leerzeichen."""
        import re
        schlimm = []
        for name in ("start-windows.ps1", "autostart-einrichten.ps1"):
            for nr, zeile in enumerate(self.skript(name), 1):
                if "Start-Process" in zeile and re.search(r"-ArgumentList\s+@\(", zeile):
                    schlimm.append(f"{name}:{nr}")
        self.assertEqual(schlimm, [],
                         "Argumente vorher selbst in Anfuehrungszeichen setzen: "
                         + "; ".join(schlimm))

    def test_passwortabfrage_ist_abgeschaltet(self):
        text = "\n".join(self.skript())
        self.assertIn("GIT_TERMINAL_PROMPT", text,
                      "ohne das wartet git im minimierten Fenster auf eine Eingabe")



class TestVeralteteVorlagenFallenAuf(unittest.TestCase):
    """"Vorlage fehlt" und "Vorlage veraltet" sind zwei verschiedene Sachen.

    Ein Spiel-Update zeichnet Knoepfe neu. Eine Vorlage, die frueher
    zuverlaessig traf und jetzt nie mehr, ist nicht fehlend - sie ist
    ueberholt. Bisher war das voellig unsichtbar: der Bot uebersprang den
    Schritt still, und niemand erfuhr, dass ihm ein Update die Grundlage
    entzogen hat.
    """

    def motor(self):
        tpl = noise(30, 30, 61)
        screen = noise(400, 600, 62)          # Vorlage kommt NICHT vor
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                "templates_dir": self.ordner})
        tpl.save(os.path.join(self.ordner, "alt.png"))
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1)
        eng.screen = screen
        return eng

    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.ordner = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_oft_gesucht_nie_getroffen_faellt_auf(self):
        eng = self.motor()
        for _ in range(6):
            eng.find({"template": "alt.png", "threshold": 0.9, "optional": True})
        self.assertEqual(eng.veraltete_vorlagen(ab=5)[0][0], "alt.png")
        self.assertEqual(eng.veraltete_vorlagen(ab=100), [],
                         "unter der Grenze darf nichts gemeldet werden")

    def test_treffer_raeumt_den_verdacht_aus(self):
        tpl = noise(30, 30, 63)
        screen = noise(400, 600, 64)
        paste(screen, tpl, 100, 200)
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                "templates_dir": self.ordner})
        tpl.save(os.path.join(self.ordner, "gut.png"))
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1)
        eng.screen = screen
        for _ in range(6):
            eng.find({"template": "gut.png", "threshold": 0.8, "optional": True})
        self.assertEqual(eng.veraltete_vorlagen(ab=5), [],
                         "eine Vorlage, die trifft, ist nicht veraltet")

    def test_lebenszeichen_nennt_die_veralteten(self):
        import tempfile, subprocess
        with tempfile.TemporaryDirectory() as ordner:
            subprocess.run(["git", "init", "-q", ordner], check=True)
            for k, v in (("user.email", "b@t"), ("user.name", "Bot")):
                subprocess.run(["git", "-C", ordner, "config", k, v], check=True)
            eng = self.motor()
            for _ in range(6):
                eng.find({"template": "alt.png", "threshold": 0.9, "optional": True})
            eng.VERDACHT_AB = 5
            eng.run_actions([{"lebenszeichen": {"hochladen": False,
                                                "verzeichnis": ordner}}], "test")
            d = json.load(open(os.path.join(ordner, "austausch", "lauf.json"),
                               encoding="utf-8"))
            namen = [e["vorlage"] for e in d["vorlagen_veraltet"]]
            self.assertIn("alt.png", namen,
                          "das Lebenszeichen muss veraltete Vorlagen mitmelden")



class TestZahlenLesen(unittest.TestCase):
    """Der Bot konnte nur sehen OB etwas da ist, nie WIE VIEL.

    Damit war jeder Wunsch mit einer Menge darin unerreichbar: "Versammlung ab
    20 Energie", "nur Monster bis Stufe 6", "nicht beitreten wenn zu stark".
    Kein OCR noetig - die Ziffern eines Spiels sind zehn feste Bilder.
    """

    ZIFFERN = {
        "0": ((1, 1, 1), (1, 0, 1), (1, 0, 1), (1, 0, 1), (1, 1, 1)),
        "1": ((0, 1, 0), (1, 1, 0), (0, 1, 0), (0, 1, 0), (1, 1, 1)),
        "2": ((1, 1, 1), (0, 0, 1), (1, 1, 1), (1, 0, 0), (1, 1, 1)),
        "3": ((1, 1, 1), (0, 0, 1), (0, 1, 1), (0, 0, 1), (1, 1, 1)),
        "4": ((1, 0, 1), (1, 0, 1), (1, 1, 1), (0, 0, 1), (0, 0, 1)),
        "5": ((1, 1, 1), (1, 0, 0), (1, 1, 1), (0, 0, 1), (1, 1, 1)),
        "6": ((1, 1, 1), (1, 0, 0), (1, 1, 1), (1, 0, 1), (1, 1, 1)),
        "7": ((1, 1, 1), (0, 0, 1), (0, 1, 0), (0, 1, 0), (0, 1, 0)),
        "8": ((1, 1, 1), (1, 0, 1), (1, 1, 1), (1, 0, 1), (1, 1, 1)),
        "9": ((1, 1, 1), (1, 0, 1), (1, 1, 1), (0, 0, 1), (1, 1, 1)),
    }
    ZOOM = 6

    def bild(self, muster):
        h, b = len(muster), len(muster[0])
        img = Image.new(b * self.ZOOM, h * self.ZOOM, (20, 24, 30))
        for y in range(h * self.ZOOM):
            for x in range(b * self.ZOOM):
                if muster[y // self.ZOOM][x // self.ZOOM]:
                    for k in range(3):
                        img.data[(y * b * self.ZOOM + x) * 3 + k] = 240
        return img

    def vorlagen(self):
        return {z: self.bild(m) for z, m in self.ZIFFERN.items()}

    def schreibe(self, text, breite=400, hoehe=80, x0=30, y0=20):
        screen = Image.new(breite, hoehe, (20, 24, 30))
        x = x0
        for zeichen in text:
            ziffer = self.bild(self.ZIFFERN[zeichen])
            paste(screen, ziffer, x, y0)
            x += ziffer.width + 4
        return screen

    def test_einzelne_und_mehrstellige_zahlen(self):
        from laa import zahlen
        vorl = self.vorlagen()
        for text in ("7", "20", "45", "108", "999"):
            with self.subTest(text=text):
                gelesen = zahlen.lies_zahl(self.schreibe(text), vorl, threshold=0.9)
                self.assertEqual(gelesen, int(text))

    def test_doppelfunde_an_derselben_stelle_werden_eingedampft(self):
        """Eine 8 findet sich auch dort, wo eine 3 steht - nur schlechter.

        Ohne das Eindampfen kaeme aus '83' schnell '883', und mit einer falsch
        gelesenen Zahl wird danach gerechnet.
        """
        from laa import zahlen
        gelesen = zahlen.lies_zahl(self.schreibe("83"), self.vorlagen(), threshold=0.7)
        self.assertEqual(gelesen, 83)

    def test_ohne_ziffern_kein_ergebnis(self):
        from laa import zahlen
        self.assertIsNone(zahlen.lies_zahl(self.schreibe("42"), {}, threshold=0.9))
        leer = Image.new(200, 60, (20, 24, 30))
        self.assertIsNone(zahlen.lies_zahl(leer, self.vorlagen(), threshold=0.9))

    def test_bedingung_zahl_greift_nur_ueber_der_grenze(self):
        import tempfile
        with tempfile.TemporaryDirectory() as ordner:
            zordner = os.path.join(ordner, "ziffern")
            os.makedirs(zordner)
            for zeichen, muster in self.ZIFFERN.items():
                self.bild(muster).save(os.path.join(zordner, f"{zeichen}.png"))
            cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                    "templates_dir": ordner})
            for text, grenze, erwartet in (("25", 20, True), ("12", 20, False)):
                with self.subTest(text=text):
                    screen = self.schreibe(text)
                    eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                                 sleep=lambda s: None, seed=1)
                    eng.screen = screen
                    eng._scale = 1.0
                    self.assertEqual(
                        eng.evaluate({"zahl": {"mindestens": grenze, "threshold": 0.9}},
                                     screen),
                        erwartet)

    def test_fehlende_ziffern_machen_die_bedingung_falsch(self):
        """Eine Regel darf nicht losgehen, weil der Bot die Menge nicht kennt."""
        screen = self.schreibe("99")
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": []})
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: None, seed=1)
        eng.screen = screen
        self.assertFalse(eng.evaluate({"zahl": {"mindestens": 20}}, screen))

    def test_konfiguration_verlangt_eine_grenze(self):
        cfg = Config.from_dict({
            "package": "x", "tasks": [],
            "rules": [{"name": "ohne-grenze", "match": {"zahl": {"region": [0, 0, 1, 1]}},
                       "do": [{"log": "x"}]}],
        })
        self.assertTrue(any("mindestens" in p for p in cfg.validate()),
                        "eine Zahl ohne Grenze ist immer wahr - das ist nie gemeint")



class TestDringendesUnterbrichtDieAufgabe(unittest.TestCase):
    """Eine Versammlung steht nur etwa eine Minute offen.

    Aufgaben wie 'monster-jagen' laufen mit ihren Wartezeiten mehrere Minuten
    am Stueck. Ohne Unterbrechung verschlaeft der Bot alles, was in dieser Zeit
    passiert - und gerade das Beitreten ist die ergiebigste Art zu kaempfen.
    """

    def bau(self, dringend_prio=205):
        tpl = noise(40, 40, 91)
        screen = noise(400, 600, 92)
        paste(screen, tpl, 120, 300)
        cfg = Config.from_dict({
            "package": "x",
            "templates_dir": self.ordner,
            "base_width": 400,          # sonst rechnet die Engine die Vorlage klein
            "rules": [{"name": "dringend", "priority": dringend_prio,
                       "match": {"template": "eilig.png", "threshold": 0.8},
                       "do": [{"log": "sofort"}]}],
            "tasks": [],
        })
        tpl.save(os.path.join(self.ordner, "eilig.png"))
        dev = FakeDevice([screen], loop=True)
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
        eng.screen = screen
        return eng

    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.ordner = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_lange_wartezeit_wird_unterbrochen(self):
        eng = self.bau()
        eng._do_sleep([4.0, 4.0])
        self.assertGreater(eng.stats.get("rule:dringend", 0), 0,
                           "waehrend einer langen Wartezeit muss nachgesehen werden")

    def test_kurze_wartezeit_nicht(self):
        """Sonst kostet jeder Zehntelschlaf einen Bildschirm."""
        eng = self.bau()
        eng._do_sleep([0.5, 0.5])
        self.assertEqual(eng.stats.get("rule:dringend", 0), 0)

    def test_unwichtige_regeln_unterbrechen_nicht(self):
        eng = self.bau(dringend_prio=100)
        eng._do_sleep([4.0, 4.0])
        self.assertEqual(eng.stats.get("rule:dringend", 0), 0,
                         "nur Regeln ab DRINGEND_AB duerfen unterbrechen")

    def test_keine_verschachtelung(self):
        """Die gepruefte Regel darf nicht selbst wieder pruefen."""
        eng = self.bau()
        eng.cfg.rules[0].do = [{"sleep": [4.0, 4.0]}]
        eng._do_sleep([4.0, 4.0])
        self.assertLessEqual(eng.stats.get("rule:dringend", 0), 1,
                             "die Zwischenpruefung darf sich nicht selbst aufrufen")


    def test_schnelles_tempo_schaltet_die_unterbrechung_nicht_ab(self):
        """Wechselwirkung: tempo staucht die Wartezeit VOR der Schranke.

        Mit tempo 0.55 faellt eine 2.5-Sekunden-Wartezeit auf 1.4 - bei einer
        Schranke von 1.5 haette ausgerechnet das schnellere Tempo die
        Versammlungs-Reaktion abgeschaltet.
        """
        eng = self.bau()
        eng.cfg.tempo = 0.55
        eng._do_sleep([2.5, 2.5])
        self.assertGreater(eng.stats.get("rule:dringend", 0), 0,
                           "auch bei schnellem Tempo muss zwischendurch nachgesehen werden")

    def test_tempo_staucht_die_wartezeit_wirklich(self):
        gewartet = []
        tpl = noise(40, 40, 93)
        screen = noise(400, 600, 94)
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [], "tempo": 0.5})
        eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                     sleep=lambda s: gewartet.append(s), seed=1)
        eng._in_zwischenpruefung = True      # Teilung ausschalten, nur die Dauer messen
        eng._do_sleep([4.0, 4.0])
        self.assertAlmostEqual(sum(gewartet), 2.0, places=2)

    def test_untergrenze_haelt_animationen_aus(self):
        """Eine Wartezeit darf nicht auf null zusammenfallen."""
        gewartet = []
        cfg = Config.from_dict({"package": "x", "rules": [], "tasks": [],
                                "tempo": 0.1, "tempo_untergrenze": 0.35})
        eng = Engine(cfg, FakeDevice([noise(40, 60, 4)], loop=True), logger=quiet(),
                     sleep=lambda s: gewartet.append(s), seed=1)
        eng._in_zwischenpruefung = True
        eng._do_sleep([1.0, 1.0])
        self.assertGreaterEqual(sum(gewartet), 0.35)
        gewartet.clear()
        eng._do_sleep(0)                     # eine bewusste Null bleibt null
        self.assertEqual(sum(gewartet), 0)

    def test_versammlungsregel_liegt_ueber_der_unterbrechungsgrenze(self):
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        regel = next(r for r in cfg.rules if r.name == "versammlung-sofort-beitreten")
        self.assertGreaterEqual(regel.priority, Engine.DRINGEND_AB,
                                "sonst kann sie keine laufende Aufgabe unterbrechen")



class TestKalibrierungIstSchnellUndTrotzdemRichtig(unittest.TestCase):
    """44 Sekunden Kalibrierung sind zu teuer, wenn eine Versammlung 60 dauert.

    Aus dem Protokoll des Nutzers vom 04.08.: 00:44:53 Aufgabe kalibrieren,
    00:45:37 Ergebnis - 44 Sekunden, in denen der Bot nichts anderes tut. Sie
    laeuft etwa alle zwoelf Minuten.

    Der Trick: die Kalibrierung braucht nur das Groessen-VERHAELTNIS, nicht die
    Position. Das bleibt beim Verkleinern erhalten.
    """

    def test_verkleinert_findet_denselben_faktor(self):
        bild = os.path.join(ROOT, "austausch", "allianz-geschenk.png")
        if not os.path.exists(bild):
            self.skipTest("allianz-geschenk.png liegt nicht vor")
        cfg = Config.load(os.path.join(ROOT, "config", "last-asylum.json"))
        cfg.validate()
        screen = Image.load(bild)
        tpl = cfg.template("ui/back_arrow.png", optional=True)
        if tpl is None:
            self.skipTest("ui/back_arrow.png fehlt")
        schritte = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]

        def besten_faktor(bild_, tpl_):
            best, faktor = 0.0, None
            for f in schritte:
                hit = matcher.best_score(bild_, tpl_, scale=f)
                if hit and hit.score > best:
                    best, faktor = hit.score, f
            return faktor, best

        voll_faktor, voll_score = besten_faktor(screen, tpl)
        klein_faktor, klein_score = besten_faktor(screen.box_scaled_by(0.5),
                                                  tpl.box_scaled_by(0.5))
        self.assertEqual(klein_faktor, voll_faktor,
                         f"verkleinert kam {klein_faktor} statt {voll_faktor}")
        self.assertGreater(klein_score, voll_score - 0.05,
                           f"der Wert bricht ein: {klein_score:.3f} statt {voll_score:.3f}")

    def test_kalibrierung_verkleinert_wirklich(self):
        import inspect
        quelle = inspect.getsource(Engine._kalibriere)
        self.assertIn("box_scaled_by(verkleinern)", quelle,
                      "ohne Verkleinern dauert die Kalibrierung ein Vielfaches")
        self.assertIn("schritte[::2]", quelle,
                      "der grobe Vorlauf spart die Haelfte der Suchen")

    def test_untergrenze_rechnet_den_kleinsten_faktor_mit(self):
        """Gesucht wird Vorlage MAL Faktor - nicht die Vorlage allein.

        Erste Fassung dieser Grenze sah nur die Vorlagengroesse an. Bei Faktor
        0.5 und Verkleinerung 0.5 blieb von einer 80er Vorlage ein 20er Muster,
        und die Kalibrierung fand den falschen Faktor. Ein bestehender Test hat
        das aufgedeckt - dieser hier haelt die Lehre fest.
        """
        import inspect
        quelle = inspect.getsource(Engine._kalibriere)
        self.assertIn("min(schritte)", quelle,
                      "die Untergrenze muss den kleinsten gesuchten Faktor einrechnen")

    def test_verkleinerte_kalibrierung_findet_kleine_muster_trotzdem(self):
        """Gegenprobe am Verhalten statt am Quelltext."""
        import tempfile
        ordner = tempfile.mkdtemp()
        try:
            tdir = os.path.join(ordner, "templates", "ui")
            os.makedirs(tdir)
            marke = noise(80, 80, 130)
            marke.save(os.path.join(tdir, "back_arrow.png"))
            screen = noise(600, 900, 131)
            paste(screen, marke.box_scale(56, 56), 200, 300)   # Faktor 0.7
            with open(os.path.join(ordner, "conf.json"), "w", encoding="utf-8") as fh:
                json.dump({"base_width": 600, "ui_skala": 1.0}, fh)
            cfg = Config.load(os.path.join(ordner, "conf.json"))
            eng = Engine(cfg, FakeDevice([screen], loop=True), logger=quiet(),
                         sleep=lambda s: None, seed=1,
                         state_file=os.path.join(ordner, "zustand.json"))
            eng.run_actions([{"kalibriere": {"templates": ["ui/back_arrow.png"],
                                             "mindest_score": 0.8, "min_belege": 1}}])
            self.assertAlmostEqual(cfg.ui_skala, 0.7, delta=0.06,
                                   msg="auch kleine Muster muessen gefunden werden")
        finally:
            import shutil
            shutil.rmtree(ordner, ignore_errors=True)



class TestMatcherVorfilter(unittest.TestCase):
    """Fehlschlaege sind der Normalfall - sie muessen billig sein.

    Von 28 Regeln passt hoechstens eine. Gemessen kostete ein Fehlschlag
    vorher 0.500 s, weil alle sechs Grob-Kandidaten fein nachgerechnet wurden;
    ein Treffer kostet 0.22 s. Der Vorfilter dreht das um.

    Die Schranke stammt aus einer MESSUNG ueber 120 Vergleiche auf zwei echten
    Bildschirmen: echte Treffer begannen bei einem Grob-Wert von 0.847,
    Fehlschlaege endeten bei 0.839. Die Luecke ist real, aber viel zu schmal -
    darum liegt die Schranke bei 0.55, mit grossem Abstand nach unten.
    """

    def test_kein_vorfilter_auf_den_groben_wert(self):
        """Ausprobiert, gemessen, widerlegt - und darum verboten.

        Ein Vorfilter auf den groben Wert sah an 120 Vergleichen sauber aus
        (echte Treffer ab 0.847, Fehlschlaege bis 0.839). Bei einem Muster ohne
        grosse Flaechen faellt der grobe Wert aber deutlich tiefer, obwohl der
        Treffer echt ist - fuenf Tests fielen darueber. Ein stumm ausfallender
        Treffer sieht von aussen aus wie "da war nichts" und ist der teuerste
        Fehler in diesem Bot.
        """
        self.assertFalse(hasattr(matcher, "GROB_AUSSICHTSLOS"),
                         "der Vorfilter ist bewusst wieder draussen")

    def test_echte_treffer_ueberleben_den_vorfilter(self):
        faelle = [("allianz-geschenk.png", "ui/btn_abholen.png"),
                  ("allianz-geschenk.png", "allianz/geschenke.png"),
                  ("allianz-geschenk.png", "ui/back_arrow.png"),
                  ("schild.png", "ui/btn_bestaetigen.png")]
        geprueft = 0
        for bild, vorlage in faelle:
            pfad = os.path.join(ROOT, "austausch", bild)
            vpfad = os.path.join(ROOT, "templates", *vorlage.split("/"))
            if not (os.path.exists(pfad) and os.path.exists(vpfad)):
                continue
            geprueft += 1
            treffer = matcher.find(Image.load(pfad), Image.load(vpfad), threshold=0.85)
            self.assertIsNotNone(treffer, f"{vorlage} auf {bild} ging verloren")
        if not geprueft:
            self.skipTest("keine Austausch-Bilder vorhanden")

    def test_eindeutiger_treffer_bricht_frueh_ab(self):
        import inspect
        quelle = inspect.getsource(matcher.find_all)
        self.assertIn("SICHER_GENUG", quelle,
                      "ein nahezu perfekter Treffer macht weitere Kandidaten ueberfluessig")



class TestZiffernAmEchtenSpiel(unittest.TestCase):
    """Zahlen lesen, gegen echte Spielschrift gemessen - nicht gegen Testbilder.

    austausch/allianz-geschenk.png enthaelt zwei Zahlen in VERSCHIEDENEN Schriften:
    "2,109,940/2,200,000" im Fortschrittsbalken (weiss auf gruen) und
    "23:58:18" als Timer (gruen auf dunkel). Beide Saetze sind daraus
    geschnitten - und sie sind NICHT austauschbar.
    """

    BILD = os.path.join(ROOT, "austausch", "allianz-geschenk.png")
    BALKEN = [430 / 1440, 580 / 2560, 690 / 1440, 645 / 2560]
    TIMER = [78 / 1440, 1285 / 2560, 315 / 1440, 1335 / 2560]

    def setUp(self):
        if not os.path.exists(self.BILD):
            self.skipTest("allianz-geschenk.png liegt nicht vor")
        self.screen = Image.load(self.BILD)

    def satz(self, ordner):
        from laa import zahlen
        pfad = os.path.join(ROOT, "templates", ordner)
        geladen = zahlen.lade_ziffern(pfad)
        if not geladen:
            self.skipTest(f"{ordner} ist leer")
        return geladen

    def test_fortschrittsbalken_wird_gelesen(self):
        from laa import zahlen
        gelesen = zahlen.lies_zahl(self.screen, self.satz("ziffern"),
                                   region=self.BALKEN, threshold=0.85, hoechstens=12)
        self.assertEqual(gelesen, 2109940,
                         "Kommas muessen uebersprungen, Ziffern der Reihe nach "
                         f"zusammengesetzt werden - gelesen wurde {gelesen}")

    def test_timer_wird_gelesen(self):
        from laa import zahlen
        gelesen = zahlen.lies_zahl(self.screen, self.satz("ziffern-timer"),
                                   region=self.TIMER, threshold=0.85, hoechstens=8)
        self.assertEqual(gelesen, 235818, f"23:58:18 erwartet, gelesen {gelesen}")

    def test_ziffernsaetze_sind_nicht_austauschbar(self):
        """Der Beleg dafuer, dass jede Schrift ihren eigenen Satz braucht.

        Gemessen liegt die Aehnlichkeit zwischen denselben Ziffern der beiden
        Schriften bei 0.37 bis 0.49. Wer einen Satz ueberall benutzt, liest
        entweder nichts oder etwas Falsches - und mit einer falsch gelesenen
        Zahl wird danach gerechnet.
        """
        from laa import zahlen
        falsch = zahlen.lies_zahl(self.screen, self.satz("ziffern"),
                                  region=self.TIMER, threshold=0.85, hoechstens=8)
        self.assertIsNone(falsch,
                          f"der Balken-Satz darf den Timer nicht lesen, gab aber {falsch}")



if __name__ == "__main__":
    unittest.main()
