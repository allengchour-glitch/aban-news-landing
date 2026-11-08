import csv
import json
from pathlib import Path
import tempfile
import unittest
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

    def test_falsche_faq_wird_abgelehnt(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "faq.json"
            for data in [[], {"faq": [{"stichwoerter": [], "antwort": "A"}]}, {"faq": [{"stichwoerter": ["A"], "antwort": ""}]}]:
                p.write_text(json.dumps(data))
                with self.assertRaises(ValueError):
                    wissen_lesen(p)


if __name__ == "__main__":
    unittest.main()
