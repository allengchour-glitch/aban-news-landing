import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import subprocess
import studio

class StudioTest(unittest.TestCase):
    def test_skript_ist_kein_video_oder_veroeffentlichung(self):
        with tempfile.TemporaryDirectory() as d:
            r=studio.bauen(Path(d)/'neu')
            self.assertTrue(r['skript_gebaut'])
            self.assertFalse(r['video_gebaut'])
            self.assertFalse(r['veroeffentlicht'])
            self.assertIsNone(r['follower'])
    def test_fehler_beim_rendern_gibt_nichts_frei(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'neu'
            with patch('studio.shutil.which',return_value='/bin/ffmpeg'),patch('studio.subprocess.run',side_effect=subprocess.CalledProcessError(1,'ffmpeg')):
                with self.assertRaises(ValueError): studio.bauen(out,True)
            self.assertFalse(json.loads((out/'status.json').read_text())['video_gebaut'])
            self.assertFalse((out/'short.mp4').exists())
    def test_keine_doppelten_folgen_oder_ueberschreiben(self):
        self.assertEqual(len({v['id'] for v in studio.FOLGEN}),len(studio.FOLGEN))
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileExistsError): studio.bauen(d)
