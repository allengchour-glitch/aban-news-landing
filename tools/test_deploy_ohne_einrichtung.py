"""Statische Workflow-Gegenproben: Standard-Deployment schreibt keine Einrichtung.

Nur lokale YAML-Texte; keine Cloudflare-, GitHub- oder Secretzugriffe.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PFAD = ROOT / '.github/workflows/cf-deploy-mainsite.yml'
GUARD = "${{ github.event_name == 'workflow_dispatch' && inputs.einrichten == true }}"


def schritte(text):
    return re.findall(r'(?ms)^      - (?:name:|uses:).*?(?=^      - |\Z)', text)


def einrichtung(text):
    return [s for s in schritte(text) if re.search(r'pages (?:project create|secret put)\b', s)]


class DeploymentGrenze(unittest.TestCase):
    def setUp(self):
        self.text = PFAD.read_text()

    def test_jeder_einrichtungsschritt_braucht_manuelle_freigabe(self):
        steps = einrichtung(self.text)
        self.assertEqual(len(steps), 4)
        for step in steps:
            with self.subTest(schritt=step.splitlines()[0]):
                guards = re.findall(r'^        if: (.+)$', step, re.M)
                self.assertEqual(guards, [GUARD])

    def test_einrichtung_standardmaessig_aus(self):
        m = re.search(r'^      einrichten:\n((?:        .*\n)+)', self.text, re.M)
        self.assertIsNotNone(m)
        self.assertRegex(m[1], r'(?m)^        type: boolean$')
        self.assertRegex(m[1], r'(?m)^        default: false$')
        self.assertIn('separater Freigabe', m[1])

    def test_eigentliches_deployment_bleibt_ohne_einrichtung(self):
        steps = [s for s in schritte(self.text) if 'pages deploy _site' in s]
        self.assertEqual(len(steps), 1)
        self.assertNotRegex(steps[0], r'(?m)^        if:')
        self.assertIn('--branch=main', steps[0])

    def test_bisherige_ausloeser_und_frequenz_bleiben(self):
        trigger = self.text.split('\npermissions:', 1)[0]
        for name in ['push:', 'workflow_run:', 'schedule:', 'workflow_dispatch:']:
            self.assertEqual(trigger.count('\n  ' + name), 1)
        self.assertEqual(re.findall(r"cron: '([^']+)'", trigger), ['45 6 * * *'])


if __name__ == '__main__':
    unittest.main()
