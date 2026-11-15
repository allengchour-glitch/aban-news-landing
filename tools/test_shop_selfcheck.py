"""Preisabweichungen nur mit erfundenen Katalog- und Exportdaten prüfen."""
from contextlib import redirect_stdout
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import shop_selfcheck as check


class PreisabgleichTest(unittest.TestCase):
    def lauf(self, preis='CHF 12', lang='de', buy='https://example.invalid/kaufen'):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for rel in ('shop.html', 'danke-kit.html', 'functions/api/kit-download.js'):
                p = root / rel
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text('NUR-TESTDATEN')
            (root / 'data').mkdir()
            for suffix in ('', '-en'):
                catalog = [{'slug': 'demo' + suffix, 'price_cents': 1200, 'currency': 'chf'}]
                products = [{'slug': 'demo' + suffix, 'price': preis if (suffix == '-en') == (lang == 'en') else 'CHF 12', 'buy': buy}]
                (root / f'data/kit-catalog{suffix}.json').write_text(json.dumps(catalog))
                (root / f'data/shop-products{suffix}.json').write_text(json.dumps(products))
            with patch.object(check, 'REPO', root), patch.object(check, 'ok', []), patch.object(check, 'warn', []), patch.object(check, 'fail', []), patch.dict(os.environ, {}, clear=True), redirect_stdout(io.StringIO()):
                return check.main()

    def test_passende_preise_beider_sprachen(self):
        self.assertEqual(self.lauf(), 0)

    def test_abweichender_preis_und_waehrung_blockieren(self):
        for lang in ('de', 'en'):
            for price in ('CHF 13', 'EUR 12', 'CHF 12.001', 'CHF 12 und mehr', ''):
                with self.subTest(lang=lang, price=price):
                    self.assertEqual(self.lauf(price, lang), 1)

    def test_nicht_kaufbares_angebot_bleibt_hinweis(self):
        self.assertEqual(self.lauf('', buy=''), 0)

    def test_fehlende_katalogzuordnung_blockiert(self):
        self.assertTrue(check.preisfehler([], [{'slug': 'demo', 'buy': 'https://example.invalid', 'price': 'CHF 12'}]))

    def test_centbetrag_und_eurozeichen(self):
        c = [{'slug': 'demo', 'price_cents': 1295, 'currency': 'eur'}]
        self.assertEqual(check.preisfehler(c, [{'slug': 'demo', 'buy': 'https://example.invalid', 'price': '€ 12.95'}]), [])


if __name__ == '__main__':
    unittest.main()
