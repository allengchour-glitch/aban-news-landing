"""Tests ohne Android-Gerät: python3 -m unittest discover -s tests -v"""

from __future__ import annotations

import os
import random
import sys
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from laa import matcher  # noqa: E402
from laa.adb import FakeDevice, ascii_fallback, decode_screencap  # noqa: E402
from laa.config import Config, ConfigError  # noqa: E402
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


if __name__ == "__main__":
    unittest.main()
