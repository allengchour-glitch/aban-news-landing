import copy
import json
from pathlib import Path
import unittest

from selection_drafts import generate_draft, START, END

ROOT = Path(__file__).parent


def fixture(number):
    return json.loads(next((ROOT / 'fixtures').glob(number + '-*.source.json')).read_text())


class SelectionReview(unittest.TestCase):
    def test_real_source_preserved_and_exact_values_only(self):
        source = fixture('01')
        before = copy.deepcopy(source)
        result = generate_draft(source)
        self.assertEqual(result['status'], 'DRAFT_REVIEW_ONLY')
        self.assertEqual(source, before)
        offset = result['insertion']['charOffset']
        insertion = '\n' + result['selectionBlockHtml'] + '\n'
        self.assertEqual(result['afterHtml'][:offset] + result['afterHtml'][offset + len(insertion):], source['descriptionHtml'])
        for fact in result['facts']:
            self.assertTrue(any(option['name'] == fact['optionName'] and any(value['name'] == fact['value'] and value['hasVariants'] is True for value in option['optionValues']) for option in source['options']))
        self.assertTrue(result['existingHrefsPreservedExactly'])

    def test_real_default_and_existing_values_do_not_get_filler(self):
        for number in ['02', '04', '05']:
            result = generate_draft(fixture(number))
            self.assertEqual(result['status'], 'BLOCKED_NEEDS_SOURCE')
            self.assertIsNone(result['afterHtml'])

    def test_only_exact_boolean_true_is_used(self):
        source = fixture('01')
        for option in source['options']:
            for value in option['optionValues']:
                value['hasVariants'] = 'true'
        self.assertEqual(generate_draft(source)['status'], 'BLOCKED_NEEDS_SOURCE')

    def test_regional_labels_are_not_promoted_to_size_claims(self):
        result = generate_draft(fixture('06'))
        block = result['selectionBlockHtml']
        self.assertIn('«AU»', block)
        self.assertIn('Auswahl «Grösse»', block)
        self.assertNotIn('Grössenauswahl', block)
        self.assertFalse(result['variantCombinationsInferred'])

    def test_leading_delivery_badge_stays_before_product_intro(self):
        source = fixture('01')
        source['descriptionHtml'] = '<p class="ls-liefer">Versand Schweiz.</p><h2>Produkt entdecken</h2><p>Vorhandenes Produktintro.</p><h3>Versand und Rückgabe</h3><p>Richtlinie.</p>'
        result = generate_draft(source)
        self.assertEqual(result['status'], 'DRAFT_REVIEW_ONLY')
        self.assertTrue(result['afterHtml'].startswith('<p class="ls-liefer">'))
        self.assertGreater(result['afterHtml'].index(START), result['afterHtml'].index('Vorhandenes Produktintro.'))
        self.assertLess(result['afterHtml'].index(END), result['afterHtml'].index('<h3>Versand'))

    def test_unknown_structure_or_active_html_blocked(self):
        for bad in ['<div><p>Kaputt</div>', '<p onclick="evil()">Text.</p>', '<script>evil()</script><p>Text</p>']:
            source = fixture('01')
            source['descriptionHtml'] = bad
            self.assertEqual(generate_draft(source)['status'], 'BLOCKED_NEEDS_SOURCE')

    def test_second_insertion_is_blocked(self):
        source = fixture('01')
        source['descriptionHtml'] = generate_draft(source)['afterHtml']
        self.assertEqual(generate_draft(source)['status'], 'BLOCKED_NEEDS_SOURCE')

    def test_numeric_labels_remain_quoted_not_new_specifications(self):
        result = generate_draft(fixture('07'))
        self.assertFalse(result['newPhysicalClaims'])
        self.assertIn('TECHNICAL_LABELS_ARE_NOT_VERIFIED_SPECIFICATIONS', [flag['code'] for flag in result['internalFlags']])
        self.assertIn('zum Beispiel', result['selectionBlockHtml'])

    def test_catalog_input_rejected(self):
        with self.assertRaises(TypeError):
            generate_draft([fixture('01')])


if __name__ == '__main__':
    unittest.main()
