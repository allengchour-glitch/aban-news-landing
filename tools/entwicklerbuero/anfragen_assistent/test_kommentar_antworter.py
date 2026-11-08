import csv
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from kommentar_antworter import beurteilen, verarbeiten, wissen_lesen

FAQ = [{"stichwoerter": ["kontakt"], "antwort": "Freigegebene Kontaktantwort"}]


class KommentarTest(unittest.TestCase):
    def test_faq_nur_aus_freigegebenem_wissen(self):
        self.assertEqual(beurteilen("Wie nehme ich Kontakt auf?", FAQ), ("faq", "Entwurf prüfen", "Freigegebene Kontaktantwort"))
        self.assertEqual(beurteilen("Was kostet das?", FAQ), ("offene_frage", "Manuell prüfen", ""))

    def test_private_daten_vor_lob_und_faq(self):
        for text in ["Super! Kontakt: ich@example.invalid", "Meine Bestellnummer 12345", "Telefon +41 79 123 45 67", "Meine Adresse ist hier"]:
            self.assertEqual(beurteilen(text, FAQ), ("persoenliche_daten", "Manuell prüfen", ""))

    def test_beschwerden_nicht_als_lob(self):
        self.assertEqual(beurteilen("Super, wieder kaputt!", FAQ)[0:2], ("beschwerde", "Manuell prüfen"))
        self.assertEqual(beurteilen("Danke, aber nicht zufrieden", FAQ)[0], "beschwerde")

    def test_spamverdacht_kein_kommentar(self):
        self.assertEqual(beurteilen("Verdiene gratis Geld https://example.invalid", FAQ), ("spamverdacht", "Manuell prüfen", ""))

    def test_mehrere_fragen_und_teilwort(self):
        faq = FAQ + [{"stichwoerter": ["termin"], "antwort": "Terminauskunft"}]
        self.assertEqual(beurteilen("Kontakt und Termin?", faq)[0], "mehrere_fragen")
        self.assertNotEqual(beurteilen("Kontaktlinse", faq)[0], "faq")

    def test_lob_und_unklar(self):
        self.assertEqual(beurteilen("Super!", FAQ)[0:2], ("lob", "Entwurf prüfen"))
        self.assertEqual(beurteilen("Ein Text", FAQ), ("unklar", "Manuell prüfen", ""))

    def test_csv_schutzt_formeln_und_duplikate(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            wissen = root / "faq.json"
            wissen.write_text(json.dumps({"faq": FAQ}))
            quelle = root / "eingabe.csv"
            quelle.write_text('id,plattform,text\n=1+1,instagram,Kontakt?\n')
            bericht = verarbeiten(quelle, root / "out", wissen)
            self.assertEqual(bericht["veroeffentlicht"], 0)
            with (root / "out/antwortentwuerfe.csv").open(encoding="utf-8-sig", newline="") as f:
                row = next(csv.DictReader(f))
            self.assertEqual(row["id"], "'=1+1")
            self.assertNotIn("text", row)
            with self.assertRaises(ValueError):
                verarbeiten(quelle, root / "out", wissen)
            quelle.write_text('id,plattform,text\n1,instagram,Super\n1,facebook,Super\n')
            with self.assertRaises(ValueError):
                verarbeiten(quelle, root / "duplikat", wissen)
            self.assertFalse((root / "duplikat").exists())

    def vorbereiten(self, root, text="Kontakt?", antwort="Freigegebene Kontaktantwort"):
        wissen, quelle = root / "faq.json", root / "eingabe.csv"
        wissen.write_text(json.dumps({"faq": [{"stichwoerter": ["kontakt"], "antwort": antwort}]}))
        with quelle.open('w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'plattform', 'text'])
            writer.writerow(['privat-kennung', 'instagram', text])
            writer.writerow(['offen', 'youtube', 'Was kostet das?'])
        return quelle, wissen

    def test_verlauf_verhindert_doppelte_entwuerfe_aber_behaelt_prueffaelle(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            quelle, wissen = self.vorbereiten(root)
            verlauf = root / 'verlauf.json'
            eins = verarbeiten(quelle, root / 'eins', wissen, verlauf)
            zwei = verarbeiten(quelle, root / 'zwei', wissen, verlauf)
            self.assertEqual(eins['entwurf_pruefen'], 1)
            self.assertEqual(zwei['entwurf_pruefen'], 0)
            self.assertEqual(zwei['bereits_vorbereitet'], 1)
            self.assertEqual(zwei['manuell_pruefen'], 1)
            self.assertEqual(zwei['veroeffentlicht'], 0)
            state = verlauf.read_text()
            self.assertNotIn('privat-kennung', state)
            self.assertNotIn('Kontakt', state)
            self.assertEqual(len(json.loads(state)['vorbereitet']), 1)
            self.assertIn('Bereits vorbereitet', (root / 'zwei/index.html').read_text())

    def test_neuer_text_und_geaenderte_faq_werden_erneut_bearbeitet(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            quelle, wissen = self.vorbereiten(root)
            state = root / 'verlauf.json'
            verarbeiten(quelle, root / 'eins', wissen, state)
            quelle, wissen = self.vorbereiten(root, text='Wie nehme ich Kontakt auf?')
            self.assertEqual(verarbeiten(quelle, root / 'zwei', wissen, state)['entwurf_pruefen'], 1)
            quelle, wissen = self.vorbereiten(root, text='Wie nehme ich Kontakt auf?', antwort='Neue freigegebene Antwort')
            self.assertEqual(verarbeiten(quelle, root / 'drei', wissen, state)['entwurf_pruefen'], 1)
            with patch('kommentar_antworter.beurteilen', return_value=('faq', 'Entwurf prüfen', 'Neue Vorlage')):
                self.assertEqual(verarbeiten(quelle, root / 'vier', wissen, state)['entwurf_pruefen'], 2)

    def test_defekter_oder_gesperrter_verlauf_bleibt_erhalten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            quelle, wissen = self.vorbereiten(root)
            state = root / 'verlauf.json'
            state.write_text('{kaputt')
            with self.assertRaises(ValueError):
                verarbeiten(quelle, root / 'eins', wissen, state)
            self.assertEqual(state.read_text(), '{kaputt')
            self.assertFalse((root / 'verlauf.json.lock').exists())
            lock = root / 'verlauf.json.lock'
            lock.write_text('laufend')
            with self.assertRaisesRegex(ValueError, 'gesperrt'):
                verarbeiten(quelle, root / 'zwei', wissen, state)
            self.assertEqual(lock.read_text(), 'laufend')
            self.assertFalse((root / 'zwei').exists())

    def test_fehlgeschlagene_ausgabe_speichert_keine_neuen_vorbereitungen(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            quelle, wissen = self.vorbereiten(root)
            state = root / 'verlauf.json'
            verarbeiten(quelle, root / 'eins', wissen, state)
            vorher = state.read_bytes()
            quelle, wissen = self.vorbereiten(root, text='Kontakt bitte!')
            with self.assertRaises(ValueError):
                verarbeiten(quelle, root / 'eins', wissen, state)
            self.assertEqual(state.read_bytes(), vorher)
            with patch('kommentar_antworter.kommentare_erstellen', side_effect=OSError('Speichern fehlgeschlagen')):
                with self.assertRaises(OSError):
                    verarbeiten(quelle, root / 'teilweise', wissen, state)
            self.assertEqual(state.read_bytes(), vorher)
            self.assertFalse((root / 'verlauf.json.lock').exists())
            with self.assertRaises(ValueError):
                verarbeiten(quelle, root / 'drei', wissen, root / 'drei/verlauf.json')
            self.assertFalse((root / 'drei').exists())

    def test_kommentar_pruefseite_maskiert_original_und_antwort(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            quelle, wissen = self.vorbereiten(root, text='Kontakt <img src=x onerror=alert(1)>', antwort='</textarea><script>alert(2)</script>')
            verarbeiten(quelle, root / 'out', wissen)
            html = (root / 'out/index.html').read_text()
            self.assertIn('Kommentar-Assistent', html)
            self.assertIn('data-art="manuell"', html)
            self.assertIn('&lt;img src=x', html)
            self.assertIn('&lt;/textarea&gt;&lt;script&gt;', html)
            self.assertNotIn('<script>alert(', html)
            self.assertNotIn('<img src=x', html)
            self.assertEqual(html.count('<script>'), 1)
            self.assertIn('veröffentlicht keine Kommentare', html)

    def test_falsche_faq_wird_abgelehnt(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "faq.json"
            for data in [[], {"faq": [{"stichwoerter": [], "antwort": "A"}]}, {"faq": [{"stichwoerter": ["A"], "antwort": ""}]}]:
                p.write_text(json.dumps(data))
                with self.assertRaises(ValueError):
                    wissen_lesen(p)


if __name__ == "__main__":
    unittest.main()
