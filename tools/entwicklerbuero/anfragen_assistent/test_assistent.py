import csv
import tempfile
import unittest
from pathlib import Path
from assistent import einordnen, lesen, tabellenwert, verarbeiten


class AssistentTest(unittest.TestCase):
    def test_reklamation_vor_preis(self):
        self.assertEqual(einordnen("Defekt", "Bitte Angebot für Ersatz"), ("reklamation", "normal"))

    def test_offerte_und_dringlichkeit(self):
        self.assertEqual(einordnen("Offerte", "Bitte heute ansehen"), ("offerte", "zuerst prüfen"))

    def test_keine_teilwort_treffer(self):
        self.assertEqual(einordnen("Terminologie", "Kostenloser Ratgeber"), ("allgemein", "normal"))

    def test_unbekannt_bleibt_allgemein(self):
        self.assertEqual(einordnen("Hello", "Thank you"), ("allgemein", "normal"))

    def test_formeln_sind_text(self):
        for wert in ["=HYPERLINK(1)", "  +1", "@SUM(A1)", "\tTest", "-5"]:
            self.assertTrue(tabellenwert(wert).startswith("'"))
        self.assertEqual(tabellenwert("Normal"), "Normal")

    def datei(self, root, rows):
        p = root / "eingabe.csv"
        with p.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["id", "betreff", "nachricht"])
            w.writerows(rows)
        return p

    def test_paket_und_pfadschutz(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.datei(root, [["../../fremd", "=1+1", "Offerte"], ["2", "Notfall", "Defekt"]])
            out = root / "ausgabe"
            bericht = verarbeiten(p, out, "Beispielbetrieb (Demo)")
            self.assertEqual(bericht["entwuerfe"], 2)
            self.assertEqual(bericht["versendet"], 0)
            self.assertFalse((root / "fremd").exists())
            with (out / "uebersicht.csv").open(encoding="utf-8-sig", newline="") as f:
                rows = list(csv.DictReader(f))
            self.assertEqual(rows[0]["id"], "2")
            self.assertEqual(rows[1]["betreff"], "'=1+1")
            self.assertIn("Ausführungsort", (out / "entwurf-0001.txt").read_text())
            with self.assertRaises(ValueError):
                verarbeiten(p, out, "Demo")

    def test_doppelte_ids_keine_ausgabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.datei(root, [["1", "A", "B"], ["1", "C", "D"]])
            with self.assertRaises(ValueError):
                verarbeiten(p, root / "ausgabe", "Demo")
            self.assertFalse((root / "ausgabe").exists())

    def test_falsches_schema(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "falsch.csv"
            p.write_text("name,text\nA,B\n")
            with self.assertRaises(ValueError):
                lesen(p)

    def test_leer_und_beschaedigt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for rows in [[], [["", "A", "B"]], [["1", "A"]], [["1", "A", "B", "C"]]]:
                with self.assertRaises(ValueError):
                    lesen(self.datei(root, rows))

    def test_firma_keine_zeileninjektion(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.datei(root, [["1", "A", "B"]])
            with self.assertRaises(ValueError):
                verarbeiten(p, root / "ausgabe", "Firma\nFalsche Zusage")


if __name__ == "__main__":
    unittest.main()
