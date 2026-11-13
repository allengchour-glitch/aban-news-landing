"""Nur temporäre Dateien und simulierte Anbieter; keine Kundendaten/Netzaufrufe."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import generate_report as report


class ReportStartTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.abo = {"id": "demo", "firma": "Demo-Firma", "branche": "Werkstatt",
                    "ort": "Bern", "leistungen": [], "email": "demo@example.com"}
        (self.root / "abos.example.json").write_text(json.dumps([self.abo]))
        for name, value in {"ROOT": self.root, "ABOS": self.root / "abos.json",
                            "OUT": self.root / "ausgabe", "VERLAUF": self.root / "verlauf.json"}.items():
            patcher = patch.object(report, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_ohne_abos_keine_anbieter_oder_dateien(self):
        with patch.dict(report.os.environ, {"ANTHROPIC_API_KEY": "demo"}, clear=True), \
                patch.object(report.live_check, "run_live") as live, \
                patch.object(report, "claude_check") as claude:
            with self.assertRaises(SystemExit) as result:
                report.main([])
            self.assertNotEqual(result.exception.code, 0)
            live.assert_not_called()
            claude.assert_not_called()
        self.assertFalse(report.OUT.exists())
        self.assertFalse(report.VERLAUF.exists())

    def test_beispiel_ignoriert_keys_und_schuetzt_verlauf(self):
        report.VERLAUF.write_text('{"demo":{"genannt":true}}')
        original = report.VERLAUF.read_bytes()
        report.ABOS.write_text('[{"id":"anderer-fall","firma":"Nicht im Beispiel"}]')
        abos_original = report.ABOS.read_bytes()
        with patch.dict(report.os.environ, {"ANTHROPIC_API_KEY": "demo", "OPENAI_API_KEY": "demo",
                                             "GEMINI_API_KEY": "demo", "PERPLEXITY_API_KEY": "demo"}, clear=True), \
                patch.object(report.live_check, "run_live") as live, \
                patch.object(report, "claude_check") as claude:
            report.main(["--beispiel"])
            live.assert_not_called()
            claude.assert_not_called()
        self.assertEqual(report.VERLAUF.read_bytes(), original)
        files = list((report.OUT / "beispiel").glob("*.html"))
        self.assertEqual(len(files), 1)
        self.assertIn("Offline-Beispiel", files[0].read_text())
        self.assertNotIn("Nicht im Beispiel", files[0].read_text())
        self.assertEqual(report.ABOS.read_bytes(), abos_original)
        self.assertEqual(list(report.OUT.glob("*.html")), [])

    def test_abodatei_nutzt_bestehenden_pruefweg(self):
        report.ABOS.write_text(json.dumps([self.abo]))
        with patch.dict(report.os.environ, {}, clear=True), \
                patch.object(report.live_check, "run_live", return_value=None) as live, \
                patch.object(report, "claude_check") as claude:
            report.main([])
            live.assert_called_once()
            claude.assert_not_called()
        self.assertEqual(len(list(report.OUT.glob("*.html"))), 1)


if __name__ == "__main__":
    unittest.main()
