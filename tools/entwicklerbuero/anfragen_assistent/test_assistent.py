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

    def test_doppelte_csv_spalten_stoppen_vor_ausgabe(self):
        beschwerde = 'Beschwerde: defekt.\nBitte dringend prüfen.'
        kontakt = 'Wie kann ich Kontakt aufnehmen?\nBitte Büroauskunft.'
        basis = ['id', 'betreff', 'nachricht']
        faelle = [
            ('id', basis + ['id'], ['demo-1', 'Anfrage', beschwerde, 'demo-2']),
            ('betreff', basis + ['betreff'], ['demo-1', 'Beschwerde', kontakt, 'Kontakt']),
            ('nachricht', basis + ['nachricht'], ['demo-1', 'Anfrage', beschwerde, kontakt]),
            ('nachricht umgekehrt', basis + ['nachricht'], ['demo-1', 'Anfrage', kontakt, beschwerde]),
            ('zusatzspalte', basis + ['notiz', 'notiz'], ['demo-1', 'Anfrage', kontakt, 'eins', 'zwei']),
        ]
        for name, spalten, werte in faelle:
            with self.subTest(spalte=name), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                quelle, out = root / 'eingabe.csv', root / 'ausgabe'
                with quelle.open('w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f, quoting=csv.QUOTE_ALL)
                    writer.writerow(spalten)
                    writer.writerow(werte)
                vorher = quelle.read_bytes()
                with self.assertRaisesRegex(ValueError, r'^CSV-Spaltennamen müssen eindeutig sein\.$'):
                    verarbeiten(quelle, out, 'Erfundener Demobetrieb')
                self.assertEqual(quelle.read_bytes(), vorher)
                self.assertFalse(out.exists())

    def test_eindeutige_umgeordnete_spalten_mit_zusatz_bleiben_nutzbar(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            quelle, out = root / 'eingabe.csv', root / 'ausgabe'
            with quelle.open('w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f, quoting=csv.QUOTE_ALL)
                writer.writerow(['notiz', 'nachricht', 'id', 'betreff'])
                writer.writerow(['Zusatz, "nur intern"', 'Die Arbeit ist defekt.\nBitte dringend prüfen.', 'demo-1', 'Beschwerde'])
            vorher = quelle.read_bytes()
            bericht = verarbeiten(quelle, out, 'Erfundener Demobetrieb')
            self.assertEqual((bericht['anfragen'], bericht['entwuerfe'], bericht['zur_sichtung'], bericht['versendet']), (1, 1, 1, 0))
            with (out / 'uebersicht.csv').open(encoding='utf-8-sig', newline='') as f:
                row = next(csv.DictReader(f))
            self.assertEqual((row['id'], row['betreff'], row['kategorie'], row['prioritaet']),
                             ('demo-1', 'Beschwerde', 'reklamation', 'zuerst prüfen'))
            self.assertIn('Bitte beschreiben Sie den Mangel', (out / row['entwurf']).read_text())
            self.assertEqual(quelle.read_bytes(), vorher)

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
