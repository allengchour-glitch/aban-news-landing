"""Geschützten Paketbau nur mit erfundenen ZIPs prüfen; kein Netz oder Stripe."""
from contextlib import redirect_stdout
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("kit_bau_test", ROOT / "automation/build_kit_zips.py")
bau = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bau)


class KitBauTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for name in ("data", "automation", "fixtures", "downloads/kits"):
            (self.root / name).mkdir(parents=True)
        self.kits = self.root / "downloads/kits"
        (self.kits / "bisher.zip").write_bytes(b"erfundener vorheriger Stand")
        (self.kits / "behalten.txt").write_text("erfundene Notiz")
        self.catalog([{"slug": "demo"}], [])

    def catalog(self, de, en):
        for lang, rows in [("", de), ("-en", en)]:
            (self.root / f"data/kit-catalog{lang}.json").write_text(json.dumps(rows))

    def archive(self, slug, lang):
        out = self.root / "fixtures" / (lang + "-" + slug + ".zip")
        with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_STORED) as z:
            z.writestr("DEMO.txt", "NUR-ERFUNDENE-TESTDATEN")
        return out

    def run_build(self, single=None, bundle=None, salt=" demo-salt\n"):
        stdout = io.StringIO()
        with patch.object(bau, "REPO", self.root), patch.object(bau, "KITS", self.kits), \
             patch.object(bau, "build_single", side_effect=single or self.archive), \
             patch.object(bau, "build_bundle", side_effect=bundle or (lambda s, members, lang: self.archive(s, lang))), \
             patch.dict(os.environ, {"DOWNLOAD_SALT": salt}, clear=True), redirect_stdout(stdout):
            rc = bau.main()
        self.assertFalse(list((self.root / "automation").glob(".kit-bau-*")))
        return rc, stdout.getvalue()

    def old_unchanged(self):
        self.assertEqual((self.kits / "bisher.zip").read_bytes(), b"erfundener vorheriger Stand")
        self.assertEqual({p.name for p in self.kits.iterdir()}, {"bisher.zip", "behalten.txt"})

    def test_ohne_salt_kein_bau_und_keine_loeschung(self):
        def forbidden(*args):
            self.fail("Paketbau ohne Salt")
        self.assertEqual(self.run_build(single=forbidden, salt="  ")[0], 0)
        self.old_unchanged()

    def test_vollstaendiger_bau_ersetzt_nur_zip_satz(self):
        self.catalog([{"slug": "demo"}], [{"slug": "en-demo"}])
        rc, log = self.run_build()
        self.assertEqual(rc, 0)
        expected = {bau.dl_hash(s, "demo-salt") + ".zip" for s in ["demo", "en-demo"]}
        self.assertEqual({p.name for p in self.kits.glob("*.zip")}, expected)
        self.assertTrue((self.kits / "behalten.txt").exists())
        for p in self.kits.glob("*.zip"):
            with zipfile.ZipFile(p) as z:
                self.assertIsNone(z.testzip())
        self.assertIn("2 Kit-ZIP(s)", log)

    def test_bundle_kommt_nach_einzelpaketen_ohne_standalone_im_bundle(self):
        self.catalog([{"slug": "bundle", "bundle": True}, {"slug": "demo"}, {"slug": "eigen", "standalone": True}], [])
        order = []
        def single(slug, lang):
            order.append(slug)
            return self.archive(slug, lang)
        def bundle(slug, members, lang):
            self.assertEqual(order, ["demo", "eigen"])
            self.assertEqual(members, ["demo"])
            return self.archive(slug, lang)
        self.assertEqual(self.run_build(single=single, bundle=bundle)[0], 0)

    def test_fehler_nach_erster_zip_gibt_keinen_teilbestand_frei(self):
        self.catalog([{"slug": "demo"}, {"slug": "kaputt"}], [])
        def single(slug, lang):
            if slug == "kaputt":
                raise RuntimeError("NICHT-IN-LOGS-SCHREIBEN")
            return self.archive(slug, lang)
        rc, log = self.run_build(single=single)
        self.assertEqual(rc, 1)
        self.old_unchanged()
        self.assertNotIn("NICHT-IN-LOGS-SCHREIBEN", log)
        self.assertNotIn("demo-salt", log)

    def test_en_fehler_nach_de_bau_behaelt_alten_satz(self):
        self.catalog([{"slug": "demo"}], [{"slug": "en-demo"}])
        def single(slug, lang):
            if lang == "en":
                raise OSError("nur Test")
            return self.archive(slug, lang)
        self.assertEqual(self.run_build(single=single)[0], 1)
        self.old_unchanged()

    def test_fehlender_katalog_ist_keine_erfolgreiche_teilmenge(self):
        (self.root / "data/kit-catalog-en.json").unlink()
        self.assertEqual(self.run_build()[0], 1)
        self.old_unchanged()

    def test_kaputte_und_leere_kataloge_sind_keine_freigabe(self):
        for rows in [[], {}, [None], [{"slug": ""}], [{"slug": 123}]]:
            with self.subTest(rows=rows):
                self.catalog(rows, [])
                self.assertEqual(self.run_build()[0], 1)
                self.old_unchanged()

    def test_doppelte_slugs_innerhalb_oder_zwischen_sprachen(self):
        for de, en in [([{"slug": "demo"}, {"slug": "demo"}], []), ([{"slug": "demo"}], [{"slug": "demo"}])]:
            with self.subTest(de=de, en=en):
                self.catalog(de, en)
                self.assertEqual(self.run_build()[0], 1)
                self.old_unchanged()

    def test_nicht_zip_und_leeres_archiv_werden_abgewiesen(self):
        for empty in [False, True]:
            with self.subTest(empty=empty):
                p = self.root / "fixtures/defekt.zip"
                if empty:
                    with zipfile.ZipFile(p, "w"):
                        pass
                else:
                    p.write_bytes(b"keine ZIP")
                self.assertEqual(self.run_build(single=lambda *args: p)[0], 1)
                self.old_unchanged()

    def test_falsche_crc_wird_vor_der_uebernahme_erkannt(self):
        p = self.archive("demo", "de")
        data = p.read_bytes()
        self.assertIn(b"NUR-ERFUNDENE-TESTDATEN", data)
        p.write_bytes(data.replace(b"NUR-ERFUNDENE-TESTDATEN", b"XUR-ERFUNDENE-TESTDATEN"))
        self.assertEqual(self.run_build(single=lambda *args: p)[0], 1)
        self.old_unchanged()

    def test_uebernahmefehler_bricht_ab_ohne_alte_dateien_zu_loeschen(self):
        with patch.object(Path, "replace", side_effect=OSError("nur Test")):
            self.assertEqual(self.run_build()[0], 1)
        self.old_unchanged()


class DeploySperreTest(unittest.TestCase):
    def prefix(self):
        source = (ROOT / "build-pages.sh").read_text()
        marker = "# Seitensuche-Index"
        self.assertIn(marker, source)
        return source.split(marker, 1)[0] + "\nprintf WEITER > weiter\n"

    def test_shell_darf_einen_fehlgeschlagenen_paketbau_nicht_verschlucken(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bin_dir = root / "bin"
            bin_dir.mkdir()
            python = bin_dir / "python3"
            python.write_text('#!/bin/sh\nif [ "$1" = "automation/build_kit_zips.py" ]; then exit 17; fi\nexit 0\n')
            python.chmod(0o700)
            proc = subprocess.run([shutil.which("bash"), "-c", self.prefix()], cwd=root,
                env={"PATH": str(bin_dir) + os.pathsep + os.environ["PATH"], "DOWNLOAD_SALT": "nur-demo"}, capture_output=True, timeout=10)
            self.assertEqual(proc.returncode, 17, proc.stderr)
            self.assertFalse((root / "weiter").exists())

    def test_python_fehlend_blockiert_nur_mit_konfiguriertem_salt(self):
        for salt in ["nur-demo", ""]:
            with self.subTest(salt=bool(salt)), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                bin_dir = root / "bin"
                bin_dir.mkdir()
                for cmd in ["rm", "mkdir"]:
                    (bin_dir / cmd).symlink_to(shutil.which(cmd))
                proc = subprocess.run([shutil.which("bash"), "-c", self.prefix()], cwd=root,
                    env={"PATH": str(bin_dir), "DOWNLOAD_SALT": salt}, capture_output=True, timeout=10)
                self.assertEqual(proc.returncode, 1 if salt else 0, proc.stderr)
                self.assertEqual((root / "weiter").exists(), not bool(salt))


if __name__ == "__main__":
    unittest.main()
