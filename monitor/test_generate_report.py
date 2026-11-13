"""Nur temporäre Dateien und simulierte Anbieter; keine Kundendaten/Netzaufrufe."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
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


class LiveStatusTest(unittest.TestCase):
    def run_engines(self, answers, prompts=None):
        def provider(answer):
            def call(*_):
                if isinstance(answer, Exception):
                    raise answer
                return answer
            return call
        names = ['ChatGPT Demo', 'Perplexity']
        providers = [(names[i], provider(answer)) for i, answer in enumerate(answers)]
        with patch.object(report.live_check, 'PROVIDERS', providers):
            return report.live_check.run_live({'firma': 'Demo-Firma'},
                ['Demo-Frage'] if prompts is None else prompts,
                {'OPENAI_API_KEY': 'demo', 'PERPLEXITY_API_KEY': 'demo'})

    def test_alle_anbieterfehler_sind_unbekannt(self):
        result = self.run_engines([RuntimeError('Demo-Ausfall'), RuntimeError('Demo-Ausfall')])
        self.assertIsNone(result['genannt'])

    def test_teilfehler_ohne_treffer_ist_unbekannt(self):
        self.assertIsNone(self.run_engines(['Andere Firma', RuntimeError('Demo-Ausfall')])['genannt'])

    def test_vollstaendig_ohne_treffer_ist_negativ(self):
        self.assertIs(self.run_engines(['Andere Firma', 'Andere Firma'])['genannt'], False)

    def test_belegter_treffer_bleibt_bei_teilfehler_positiv(self):
        self.assertIs(self.run_engines(['Demo-Firma', RuntimeError('Demo-Ausfall')])['genannt'], True)

    def test_ohne_verwertbare_antwort_unbekannt(self):
        for answer in [None, '', '   ']:
            with self.subTest(answer=answer):
                self.assertIsNone(self.run_engines([answer])['genannt'])
        self.assertIsNone(self.run_engines(['Andere Firma'], prompts=[])['genannt'])

    def test_abgebrochene_promptreihe_ohne_treffer_unbekannt(self):
        provider = Mock(side_effect=['Andere Firma', None])
        with patch.object(report.live_check, 'PROVIDERS', [('ChatGPT Demo', provider)]):
            result = report.live_check.run_live({'firma': 'Demo-Firma'}, ['Frage1', 'Frage2'], {'OPENAI_API_KEY': 'demo'})
        self.assertIsNone(result['genannt'])

    def test_ausfallbericht_ist_keine_negative_messung(self):
        result = self.run_engines([RuntimeError('Demo-Ausfall')])
        html = report.render({'firma': 'Demo-Firma'}, '2026-11', result, True)
        self.assertIn('Nicht vollständig geprüft', html)
        self.assertNotIn('diesen Monat nicht mehr', html)
        self.assertNotIn('Noch nicht in KI-Antworten genannt', html)

    def test_ausfall_erhaelt_bisherigen_status(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            abos = root / 'abos.json'
            verlauf = root / 'verlauf.json'
            abos.write_text(json.dumps([{'id': 'demo', 'firma': 'Demo-Firma'}]))
            verlauf.write_text(json.dumps({'demo': {'genannt': True, 'beleg': 'vorher'}}))
            old = json.loads(verlauf.read_text())
            old_bytes = verlauf.read_bytes()
            with patch.multiple(report, ABOS=abos, VERLAUF=verlauf, OUT=root/'ausgabe'), \
                    patch.dict(report.os.environ, {}, clear=True), \
                    patch.object(report.live_check, 'run_live', return_value={'live': True, 'genannt': None, 'engines': []}):
                report.main([])
            self.assertEqual(json.loads(verlauf.read_text()), old)
            self.assertEqual(verlauf.read_bytes(), old_bytes)


if __name__ == "__main__":
    unittest.main()
