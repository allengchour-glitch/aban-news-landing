"""Shop-Sperren nur mit erfundenem Katalog/Status prüfen; Stripe-Aufrufe sind verboten."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('shop_verfuegbarkeit_test', ROOT / 'automation/stripe_sync.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class ShopVerfuegbarkeitTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.catalog = self.root / 'katalog.json'
        self.state = self.root / 'status.json'
        self.out = self.root / 'shop.json'
        self.products = [
            {'slug': 'en-demo-eigen', 'title': 'Own English demo pack',
             'desc': 'English source pack not ready. Currently unavailable to buy.',
             'price_cents': 1400, 'currency': 'eur', 'standalone': True, 'available': False},
            {'slug': 'en-demo-branche', 'title': 'Available industry demo',
             'desc': 'Existing demo description', 'price_cents': 1200, 'currency': 'eur'},
        ]
        self.old_state = {
            'en-demo-eigen': {'product': 'prod_demo_eigen', 'price': 'price_demo_eigen',
                              'link': 'https://example.invalid/own-old', 'link_id': 'plink_demo_eigen',
                              'cents': 1900, 'currency': 'eur', 'own_note': 'retain this existing field'},
            'en-demo-branche': {'product': 'prod_demo_branche', 'price': 'price_demo_branche',
                                'link': 'https://example.invalid/own-industry', 'link_id': 'plink_demo_branche',
                                'cents': 1200, 'currency': 'eur'},
        }

    def run_sync(self, key='sk_demo_not_real'):
        self.catalog.write_text(json.dumps(self.products))
        self.state.write_text(json.dumps(self.old_state))
        argv = ['stripe_sync.py', '--catalog', str(self.catalog), '--state', str(self.state), '--out', str(self.out)]
        env = {'STRIPE_API_KEY': key, 'DOWNLOAD_SALT': 'nur-demo-salt'}
        with patch('sys.argv', argv), patch.dict(os.environ, env, clear=True), \
             patch.object(sync, 'stripe', side_effect=AssertionError('Kein Stripe-Schreibaufruf im Test')) as write_api, \
             patch.object(sync, 'stripe_get', side_effect=AssertionError('Kein Stripe-Leseaufruf im Test')) as read_api, \
             contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(sync.main(), 0)
            write_api.assert_not_called()
            read_api.assert_not_called()
        return {p['slug']: p for p in json.loads(self.out.read_text())}

    def test_gesperrtes_produkt_bleibt_trotz_key_ohne_kaufziel_und_api(self):
        for key in ('sk_demo_not_real', ''):
            with self.subTest(mit_key=bool(key)):
                result = self.run_sync(key)
                blocked = result['en-demo-eigen']
                self.assertEqual(blocked['buy'], '')
                self.assertEqual(blocked['price'], '€14')
                self.assertEqual(blocked['title'], self.products[0]['title'])
                self.assertEqual(blocked['desc'], self.products[0]['desc'])
                self.assertEqual(json.loads(self.state.read_text()), self.old_state)
                self.assertEqual(result['en-demo-branche']['buy'], self.old_state['en-demo-branche']['link'])
                self.assertEqual(result['en-demo-branche']['price'], '€12')

    def test_neues_gesperrtes_produkt_wird_ohne_api_angezeigt(self):
        self.old_state.pop('en-demo-eigen')
        result = self.run_sync()
        self.assertEqual(result['en-demo-eigen']['buy'], '')
        self.assertEqual(result['en-demo-eigen']['price'], '€14')
        self.assertEqual(json.loads(self.state.read_text()), self.old_state)
        self.assertEqual(result['en-demo-branche']['buy'], self.old_state['en-demo-branche']['link'])

    def test_ruecknahme_der_sperre_kann_bestehendes_eigenes_ziel_wiederverwenden(self):
        before = self.run_sync('')
        self.assertEqual(before['en-demo-eigen']['buy'], '')
        self.products[0]['available'] = True
        self.products[0]['price_cents'] = self.old_state['en-demo-eigen']['cents']
        after = self.run_sync('')
        self.assertEqual(after['en-demo-eigen']['buy'], self.old_state['en-demo-eigen']['link'])
        self.assertEqual(after['en-demo-eigen']['price'], '€19')
        self.assertEqual(json.loads(self.state.read_text()), self.old_state)
        self.assertEqual(after['en-demo-branche'], before['en-demo-branche'])


if __name__ == '__main__':
    unittest.main()
