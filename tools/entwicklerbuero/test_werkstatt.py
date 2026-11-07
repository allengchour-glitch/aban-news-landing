import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import werkstatt


class WerkstattTest(unittest.TestCase):
    def test_fehlerhafte_pruefung_gibt_kein_paket_frei(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            produkt = root / "produkt"
            produkt.mkdir()
            (produkt / "test_rot.py").write_text("import unittest\nclass Rot(unittest.TestCase):\n def test_rot(self): self.fail('Absichtliche Gegenprobe')\n")
            with patch.object(werkstatt, "PRODUKT", produkt):
                self.assertEqual(werkstatt.lauf(root / "ausgabe"), 1)
            status = json.loads((root / "ausgabe/status.json").read_text())
            self.assertEqual(status["stationen"]["pruefen"], "fehlgeschlagen")
            self.assertEqual(status["stationen"]["bauen"], "offen")
            self.assertFalse((root / "ausgabe/anfragen-assistent.zip").exists())

    def test_bestehende_ausgabe_wird_nicht_ueberschrieben(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                werkstatt.lauf(Path(tmp))

    def test_buero_lehnt_unbelegte_paketfreigabe_ab(self):
        path = Path(__file__).resolve().parents[1] / "buero/make_buero.py"
        spec = importlib.util.spec_from_file_location("buero", path)
        buero = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(buero)
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "status.json"
            report.write_text(json.dumps({"version": 1, "projekt": "anfragen-assistent", "dauerlauf": False,
                "gemessen": "2026-11-07T23:00:00Z", "stationen": {"bauen": "bestanden", "pruefen": "fehlgeschlagen", "angebot": "offen"}}))
            with self.assertRaises(ValueError):
                buero.werkstatt_einlesen(report, buero.ROWS)
            self.assertTrue(all(r["status"] == "gelb" for r in buero.ROWS if r["id"].startswith("dev_")))


if __name__ == "__main__":
    unittest.main()
