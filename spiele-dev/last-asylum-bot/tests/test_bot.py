"""Tests ohne Android-Gerät: python3 -m unittest discover -s tests -v"""

from __future__ import annotations

import os
import json
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
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
        return ordner, cfg, eng, shutil

    def test_findet_den_verkleinerungsfaktor(self):
        ordner, cfg, eng, shutil = self.bau(0.7)
        try:
            eng.run_actions([{"kalibriere": {"templates": ["ui/back_arrow.png"],
                                             "mindest_score": 0.8, "min_belege": 1}}])
            self.assertAlmostEqual(cfg.ui_skala, 0.7, delta=0.06)
            with open(os.path.join(ordner, "conf.json"), encoding="utf-8") as fh:
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
                     sleep=lambda s: None, seed=1)
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
            with open(os.path.join(ordner, "conf.json"), encoding="utf-8") as fh:
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
        eng = Engine(cfg, dev, logger=quiet(), sleep=lambda s: None, seed=1)
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
            with open(konf, encoding="utf-8") as fh:  # auch in der Datei
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
    """Jedes tap_first braucht einen Ausweg."""

    def test_alle_tap_first_haben_einen_ersatz_punkt(self):
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

        for gruppe in ("rules", "tasks", "on_unknown", "on_stuck"):
            pruefe(roh.get(gruppe, []), gruppe)
        self.assertEqual(
            ohne, [],
            "ohne Ersatz-Punkt bleibt der Bot stehen, wenn keine Vorlage passt: "
            + ", ".join(ohne),
        )


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

        def pruefe(knoten, wo):
            if isinstance(knoten, dict):
                if knoten.get("key") == "KEYCODE_BACK":
                    gefunden.append(wo)
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


if __name__ == "__main__":
    unittest.main()
