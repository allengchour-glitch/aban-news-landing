import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('luxe_render',Path(__file__).with_name('render_brand_video.py'))
renderer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class RendererTests(unittest.TestCase):
    def test_import_does_not_start_rendering(self):
        self.assertIsNone(renderer.TMP)
        self.assertIsNone(renderer.SEG)

    def test_project_root_is_portable(self):
        self.assertEqual(Path(renderer.HERE),Path(__file__).resolve().parents[2])

    def test_audio_uses_only_premium_music(self):
        calls=[]
        with tempfile.TemporaryDirectory() as root:
            with patch.object(renderer,'TMP',root),patch.object(renderer,'SEG',root),patch.object(renderer,'run',side_effect=lambda args:calls.append(args)):
                renderer.build('test',[('card','LuxeStyle','Text'),('card','Entdecken','luxestyle.ch')],3,.4,str(Path(root)/'master-text.mp4'))
        self.assertTrue(any('automation/music/luxe-premium.wav' in arg for cmd in calls for arg in cmd))
        self.assertFalse(any('vo30' in arg or 'vo60' in arg or 'adelay' in arg or 'amix' in arg for cmd in calls for arg in cmd))
        self.assertEqual(calls[-1][calls[-1].index('-map',calls[-1].index('-map')+1)+1],'1:a')


if __name__=='__main__':
    unittest.main()
