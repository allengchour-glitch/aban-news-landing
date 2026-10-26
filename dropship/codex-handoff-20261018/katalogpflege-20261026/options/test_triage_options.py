import copy
import json
from pathlib import Path
import unittest

from triage_options import analyse, SOURCE


def product(options=None, text='Vorhandener Produkttext.'):
    p={'id':'gid://shopify/Product/1','title':'Fixture','descriptionHtml':'<p>'+text+'</p>',
       'tags':['auswahl-offen','rueckhol','nicht-bewerben']}
    if options is not None:
        p['options']=options
    return p


def option(name='Farbe', labels=('Rot','Blau')):
    return {'name':name,'optionValues':[{'name':v,'hasVariants':True} for v in labels]}


def codes(result):
    return {s['code'] for s in result['signals']}


class SafetyTests(unittest.TestCase):
    def test_missing_null_invalid_and_empty_options_are_unknown(self):
        for value in ['MISSING',None,{},'Farbe',[]]:
            p=product()
            if value!='MISSING': p['options']=value
            result=analyse(p)
            self.assertEqual(result['optionsCoverage'],'UNKNOWN_OR_INVALID')
            self.assertFalse(result['defaultTitleMetadataOnly'])
            self.assertEqual(result['variantMappingVerdict'],'UNKNOWN_NOT_EXPORTED')
            self.assertIn('UNKNOWN_OPTION_COVERAGE',codes(result))

    def test_only_exact_boolean_true_is_configured_positive(self):
        for val in [None,'true',1,0,{},[],'MISSING']:
            o=option(labels=('Original',))
            if val=='MISSING': del o['optionValues'][0]['hasVariants']
            else: o['optionValues'][0]['hasVariants']=val
            result=analyse(product([o]))
            self.assertEqual(result['exactTrueValueCount'],0)
            self.assertEqual(result['optionsCoverage'],'UNKNOWN_OR_INVALID')
            self.assertNotIn('STRUCTURED_LABEL_CONFLICT_REVIEW',codes(result))

    def test_default_title_alone_is_ordinary_metadata(self):
        p=product([option('Title',('Default Title',))])
        result=analyse(p)
        self.assertTrue(result['defaultTitleMetadataOnly'])
        self.assertEqual(result['signals'],[])
        self.assertEqual(result['observedExportedVariantNodes'],None)

    def test_all_false_is_manual_not_zero_variants_or_defect(self):
        o=option(labels=('Rot',))
        o['optionValues'][0]['hasVariants']=False
        result=analyse(product([o]))
        self.assertIn('NO_POSITIVELY_CONFIGURED_LABEL_REVIEW',codes(result))
        self.assertEqual(result['observedExportedVariantNodes'],None)
        self.assertNotIn('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW',codes(result))

    def test_exact_mixed_label_is_label_conflict_with_both_paths(self):
        o=option(labels=('Rot','Rot'))
        o['optionValues'][1]['hasVariants']=False
        result=analyse(product([o]))
        signal=next(s for s in result['signals'] if s['code']=='STRUCTURED_LABEL_CONFLICT_REVIEW')
        values=signal['evidence']['sourceValues']
        self.assertEqual([v['hasVariantsState'] for v in values],['TRUE','FALSE'])
        self.assertNotEqual(values[0]['sourcePath'],values[1]['sourcePath'])
        self.assertEqual(result['variantMappingVerdict'],'UNKNOWN_NOT_EXPORTED')

    def test_case_or_whitespace_equivalence_is_not_exact_conflict(self):
        o=option(labels=('Rot','rot',' Rot '))
        o['optionValues'][1]['hasVariants']=False
        self.assertNotIn('STRUCTURED_LABEL_CONFLICT_REVIEW',codes(analyse(product([o]))))

    def test_incomplete_options_suppress_structured_conflict_claim(self):
        o=option(labels=('Rot','Rot','Blau'))
        o['optionValues'][1]['hasVariants']=False
        del o['optionValues'][2]['hasVariants']
        result=analyse(product([o]))
        self.assertNotIn('STRUCTURED_LABEL_CONFLICT_REVIEW',codes(result))
        self.assertIn('DUPLICATE_EXACT_VALUE_LABEL_REVIEW',codes(result))

    def test_missing_null_empty_and_partial_variants_are_distinct(self):
        p=product([option()]); result=analyse(p)
        self.assertEqual(result['variantsCoverage'],'NOT_EXPORTED')
        p['variants']=None
        self.assertEqual(analyse(p)['variantsCoverage'],'UNKNOWN_NULL')
        p['variants']={'edges':[]}
        self.assertEqual(analyse(p)['variantsCoverage'],'UNKNOWN_PAGINATION')
        p['variants']={'edges':[],'pageInfo':{'hasNextPage':False,'hasPreviousPage':False}}
        self.assertEqual(analyse(p)['observedExportedVariantNodes'],0)
        p['variants']['pageInfo']['hasNextPage']=True
        self.assertEqual(analyse(p)['variantsCoverage'],'PARTIAL_CONNECTION')

    def test_selected_option_contradiction_requires_covered_evidence(self):
        p=product([option()])
        p['variants']={'edges':[{'node':{'selectedOptions':[{'name':'Farbe','value':'Grün'}]}}], 'pageInfo':{'hasNextPage':True,'hasPreviousPage':False}}
        self.assertNotIn('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW',codes(analyse(p)))
        p['variants']['pageInfo']['hasNextPage']=False
        self.assertIn('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW',codes(analyse(p)))
        p['options'][0]['optionValues'][0]['hasVariants']=None
        self.assertNotIn('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW',codes(analyse(p)))

    def test_unknown_selected_options_and_duplicate_names_not_false_proof(self):
        p=product([option(),option()])
        p['variants']={'edges':[{'node':{'selectedOptions':[{'name':'Farbe','value':'Grün'}]}}], 'pageInfo':{'hasNextPage':False,'hasPreviousPage':False}}
        self.assertNotIn('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW',codes(analyse(p)))
        p['variants']['edges'][0]['node']['selectedOptions']=None
        self.assertEqual(analyse(p)['variantsCoverage'],'UNKNOWN_SELECTED_OPTIONS')

    def test_prose_colours_sizes_are_manual_suspicion_only(self):
        p=product([option('Title',('Default Title',))], 'In verschiedenen Farben und verschiedenen Grössen erhältlich.')
        result=analyse(p)
        self.assertEqual(sum(s['code']=='PROSE_MULTIPLE_CHOICES_UNMAPPED_REVIEW' for s in result['signals']),2)
        self.assertTrue(result['defaultTitleMetadataOnly'])
        self.assertTrue(all(s['severity']=='MANUAL_SUSPICION' for s in result['signals']))

    def test_one_fixed_colour_is_not_missing_choice_claim(self):
        result=analyse(product([option('Title',('Default Title',))], 'Farbe: schwarz. Material: Edelstahl.'))
        self.assertEqual(result['signals'],[])

    def test_size_material_scope_never_becomes_variant_fact(self):
        p=product([option('Grösse',('S','XL'))], 'Material: Baumwolle. Länge: 70 cm.')
        result=analyse(p)
        self.assertIn('SPECIFICATION_SCOPE_ACROSS_CHOICES_REVIEW',codes(result))
        self.assertFalse(result['variantCombinationsInferred'])
        self.assertFalse(result['productDataGenerated'])
        self.assertEqual(result['variantMappingVerdict'],'UNKNOWN_NOT_EXPORTED')

    def test_real_regional_size_labels_are_retained_not_physical_sizes(self):
        path=next((SOURCE.parent/'generator/fixtures').glob('06-*.source.json'))
        p=json.loads(path.read_text())
        before=copy.deepcopy(p); result=analyse(p)
        self.assertEqual(p,before)
        self.assertEqual([v['name'] for v in result['options'][0]['values']],['AU','UK','US','EU'])
        self.assertEqual(result['options'][0]['name'],'Grösse')
        self.assertIn('REGIONAL_LABELS_UNDER_SIZE_NAME_MEANING_REVIEW',codes(result))
        self.assertNotIn('SPECIFICATION_SCOPE_ACROSS_CHOICES_REVIEW',codes(result))
        self.assertEqual(result['swissCompatibilityVerdict'],'UNKNOWN_NOT_ESTABLISHED_BY_THIS_TRIAGE')

    def test_services_guards_rueckhol_preserved_and_no_prose_false_positive(self):
        p=product([option('Title',('Default Title',))])
        p['descriptionHtml']='<p>Produkttext.</p><h3>Versand und Rückgabe</h3><p>Verschiedene Farben. USB EU-Stecker oder US-Stecker.</p>'
        before=copy.deepcopy(p); result=analyse(p)
        self.assertEqual(p,before)
        self.assertEqual(result['signals'],[])
        self.assertEqual(result['retainedReviewTags'],p['tags'])
        self.assertEqual(result['powerTextEvidence'],[])

    def test_multiple_plug_text_never_confers_swiss_compatibility(self):
        p=product([option('Grösse',('EU','US'))], 'EU-Stecker oder US-Stecker. USB-C, Spannung 5V.')
        result=analyse(p)
        self.assertIn('PROSE_MULTIPLE_PLUG_TYPES_UNMAPPED_REVIEW',codes(result))
        self.assertEqual(result['swissCompatibilityVerdict'],'UNKNOWN_NOT_ESTABLISHED_BY_THIS_TRIAGE')
        self.assertGreater(len(result['powerTextEvidence']),0)
        p['options']=[option('Stecker',('EU','US'))]
        self.assertNotIn('PROSE_MULTIPLE_PLUG_TYPES_UNMAPPED_REVIEW',codes(analyse(p)))

    def test_last_variant_page_is_not_whole_connection(self):
        p=product([option()])
        p['variants']={'edges':[{'node':{'selectedOptions':[{'name':'Farbe','value':'Grün'}]}}], 'pageInfo':{'hasNextPage':False,'hasPreviousPage':True}}
        result=analyse(p)
        self.assertEqual(result['variantsCoverage'],'PARTIAL_CONNECTION')
        self.assertNotIn('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW',codes(result))
        del p['variants']['pageInfo']['hasPreviousPage']
        self.assertEqual(analyse(p)['variantsCoverage'],'UNKNOWN_PAGINATION')

    def test_duplicate_true_labels_do_not_create_multiple_choices(self):
        result=analyse(product([option('Grösse',('S','S'))], 'Material Baumwolle.'))
        self.assertEqual(result['multiValueCustomOptionCount'],0)
        self.assertNotIn('SPECIFICATION_SCOPE_ACROSS_CHOICES_REVIEW',codes(result))
        self.assertNotIn('EXACT_LABEL_GUIDE_REVIEW_CANDIDATE',codes(result))

    def test_dimensions_cover_size_prose_as_name_hint_only(self):
        p=product([option('Abmessung',('127 × 178 cm','150 × 200 cm'))], 'Mehrere Grössen vorhanden.')
        result=analyse(p)
        self.assertNotIn('PROSE_MULTIPLE_CHOICES_UNMAPPED_REVIEW',codes(result))
        self.assertFalse(result['productDataGenerated'])


if __name__=='__main__': unittest.main()
