#!/usr/bin/env python3
"""Conservative local triage of exact exported option labels; no network/writes.

This reads the immutable JSONL and the existing text audit read-only. Output is
review evidence, never product data or a publisher queue.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import sys
from typing import Any
import unicodedata

SOURCE = Path('/workspace/luxestyle-review/produkttexte-20261026/katalog')
sys.path.insert(0, str(SOURCE))
from classify_product_texts import text_metrics, unique_json_object, reject_json_constant, TAG_GUARD

VERSION = 'options-triage-1.0.1'
EXPECTED_SHA = '481c98a41cd614a50b0bd7b5ff4a52e5845f10b10a8310bc0710ac42f271c994'
EXPECTED_BYTES = 127880954
EXPECTED_ROWS = 56630
MISSING = object()
COLOUR_NAMES = {'farbe', 'farbe 2', 'farbnamen', 'farbe & grosse', 'grosse & farbe'}
SIZE_NAMES = {'grosse', 'ringgrosse', 'abmessung', 'lange', 'breite', 'farbe & grosse', 'grosse & farbe',
              'ausfuhrung & grosse', 'grosse & ausfuhrung', 'muster & grosse'}
MATERIAL_NAMES = {'material'}
PLUG_NAMES = {'stecker', 'plattenbreite & stecker', 'speicher & stecker'}
REGIONAL_LABELS = {'AU', 'UK', 'US', 'EU', 'CH'}
CHOICE_CUES = {
    'colour': re.compile(r'\b(?:(?:verschieden\w*|mehrer\w*|divers\w*|\d+)\s+Farben|Farben\s+(?:zur\s+Auswahl|erhältlich)|(?:Farb(?:en)?auswahl|Farbvarianten))\b', re.I),
    'size': re.compile(r'\b(?:(?:verschieden\w*|mehrer\w*|divers\w*|\d+)\s+Gr(?:ö|oe|o|ó)[sß]s?en|Gr(?:ö|oe|o|ó)[sß]s?en\s+(?:zur\s+Auswahl|erhältlich)|Gr(?:ö|oe|o|ó)[sß]s?enauswahl)\b', re.I),
}
SPEC_CUE = re.compile(r'\b\d+(?:[.,]\d+)?\s*(?:cm|mm|kg|g|%)\b|\b(?:Material|Baumwolle|Polyester|Leder|Nylon|PVC|Bambus|Edelstahl)\b', re.I)
POWER_CUE = re.compile(r'\b(?:USB(?:[- ]?(?:C|A))?|Netzteil|Netzstecker|Stecker\w*|Stromversorgung|Spannung|\d+(?:[.,]\d+)?\s*(?:V|Volt|W|Watt))\b', re.I)
PLUG_TOKEN = re.compile(r'\b(?:EU|US|UK|AU|CH)(?=\s*[-/]?\s*(?:Stecker|Plug|Standard|Norm))|\b(?:Stecker|Plug)\s*[:\-]?\s*(EU|US|UK|AU|CH)\b', re.I)
PLUG_LIST = re.compile(r'\b(?:EU|US|UK|AU|CH)(?:\s*[/,|]\s*(?:EU|US|UK|AU|CH))+\b', re.I)
REVIEW_TAG = re.compile(r'auswahl-offen|rueckhol|rückhol|sperr|entwurf|review', re.I)


def folded(value: str) -> str:
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD', value.casefold())
                            if not unicodedata.combining(c)).split())


def valid_label(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        value.encode('utf-8', 'strict')
    except UnicodeError:
        return False
    return True


def state(value: Any) -> str:
    if value is MISSING:
        return 'MISSING'
    if value is None:
        return 'NULL'
    if type(value) is bool:
        return 'TRUE' if value else 'FALSE'
    return 'INVALID_' + type(value).__name__


def excerpt(text: str, start: int, end: int) -> str:
    return text[max(0, start - 70):min(len(text), end + 100)]


def exact_present(label: str, text: str) -> bool:
    # Source spelling is preserved in all output; this is lexical guidance only.
    return bool(re.search(r'(?<!\w)' + re.escape(label) + r'(?!\w)', text, re.I))


def variant_coverage(product: dict) -> tuple[str, list[dict]]:
    """Only a fully covered connection permits comparisons requiring absence.

    No fallback from absent variants to a single default variant is possible.
    This snapshot contains no variants field; other shapes are safety fixtures.
    """
    raw = product.get('variants', MISSING)
    if raw is MISSING:
        return 'NOT_EXPORTED', []
    if raw is None:
        return 'UNKNOWN_NULL', []
    if not isinstance(raw, dict):
        return 'UNKNOWN_INVALID_SHAPE', []
    edges = raw.get('edges', MISSING)
    page = raw.get('pageInfo', MISSING)
    if not isinstance(edges, list):
        return 'UNKNOWN_MISSING_OR_INVALID_EDGES', []
    nodes = []
    for edge in edges:
        if not isinstance(edge, dict) or not isinstance(edge.get('node'), dict):
            return 'UNKNOWN_INVALID_EDGE', []
        node = edge['node']
        pairs = node.get('selectedOptions', MISSING)
        if not isinstance(pairs, list) or not pairs or not all(
                isinstance(p, dict) and valid_label(p.get('name')) and valid_label(p.get('value'))
                for p in pairs):
            return 'UNKNOWN_SELECTED_OPTIONS', []
        nodes.append(node)
    if not isinstance(page, dict) or type(page.get('hasNextPage')) is not bool or type(page.get('hasPreviousPage')) is not bool:
        return 'UNKNOWN_PAGINATION', nodes
    if page['hasNextPage'] or page['hasPreviousPage']:
        return 'PARTIAL_CONNECTION', nodes
    return 'COMPLETE_CONNECTION', nodes


def analyse(product: dict, *, core_text: str | None = None) -> dict:
    if not isinstance(product, dict):
        raise TypeError('Expected one exported product object')
    signals: list[dict] = []
    def add(code: str, evidence: Any, *, severity: str = 'MANUAL_SUSPICION') -> None:
        signals.append({'code': code, 'severity': severity, 'evidence': evidence})

    raw = product.get('options', MISSING)
    options: list[dict] = []
    problems: list[dict] = []
    complete = isinstance(raw, list) and len(raw) > 0
    if not complete:
        problems.append({'path': 'options', 'state': 'EMPTY_LIST' if raw == [] else state(raw)})
    if isinstance(raw, list):
        for i, option in enumerate(raw):
            path = f'options[{i}]'
            if not isinstance(option, dict) or not valid_label(option.get('name')):
                complete = False
                problems.append({'path': path, 'state': 'INVALID_OPTION_OR_NAME'})
                continue
            values = option.get('optionValues', MISSING)
            item = {'sourcePath': path, 'name': option['name'], 'values': []}
            options.append(item)
            if not isinstance(values, list) or not values:
                complete = False
                problems.append({'path': path + '.optionValues', 'state': 'EMPTY_LIST' if values == [] else state(values)})
                continue
            for j, val in enumerate(values):
                vpath = path + f'.optionValues[{j}]'
                if not isinstance(val, dict) or not valid_label(val.get('name')):
                    complete = False
                    problems.append({'path': vpath, 'state': 'INVALID_VALUE_OR_NAME'})
                    continue
                flag = val.get('hasVariants', MISSING)
                item['values'].append({'sourcePath': vpath, 'name': val['name'],
                                       'hasVariantsState': state(flag)})
                if type(flag) is not bool:
                    complete = False
                    problems.append({'path': vpath + '.hasVariants', 'state': state(flag)})
    if problems:
        add('UNKNOWN_OPTION_COVERAGE', problems, severity='COVERAGE_UNKNOWN')
    option_state = 'COMPLETE_VALID' if complete else 'UNKNOWN_OR_INVALID'
    for option in options:
        seen: dict[str, list[dict]] = defaultdict(list)
        for val in option['values']:
            seen[val['name']].append(val)
        for label, duplicates in seen.items():
            if len(duplicates) > 1:
                mixed = {v['hasVariantsState'] for v in duplicates} == {'TRUE', 'FALSE'}
                add('STRUCTURED_LABEL_CONFLICT_REVIEW' if complete and mixed else 'DUPLICATE_EXACT_VALUE_LABEL_REVIEW',
                    {'optionName': option['name'], 'valueName': label, 'sourceValues': duplicates},
                    severity='STRUCTURED_LABEL_CONFLICT' if complete and mixed else 'MANUAL_STRUCTURE_REVIEW')
        if complete and not any(v['hasVariantsState'] == 'TRUE' for v in option['values']):
            add('NO_POSITIVELY_CONFIGURED_LABEL_REVIEW', {'optionName': option['name'], 'sourcePath': option['sourcePath'],
                'meaning': 'All exported flags are false; no inference about zero variants or storefront choices.'}, severity='MANUAL_STRUCTURE_REVIEW')
    option_names = Counter(o['name'] for o in options)
    if any(n > 1 for n in option_names.values()):
        add('DUPLICATE_EXACT_OPTION_NAME_REVIEW', [o for o in options if option_names[o['name']] > 1], severity='MANUAL_STRUCTURE_REVIEW')
    default = complete and len(options) == 1 and options[0]['name'] == 'Title' and options[0]['values'] == [
        {'sourcePath': 'options[0].optionValues[0]', 'name': 'Default Title', 'hasVariantsState': 'TRUE'}]
    custom = [o for o in options if o['name'] != 'Title']
    multi = [o for o in custom if len({v['name'] for v in o['values'] if v['hasVariantsState'] == 'TRUE'}) > 1]
    for option in multi:
        true_values = [v for v in option['values'] if v['hasVariantsState'] == 'TRUE']
        if folded(option['name']) == 'grosse' and all(v['name'] in REGIONAL_LABELS for v in true_values):
            add('REGIONAL_LABELS_UNDER_SIZE_NAME_MEANING_REVIEW', {'optionName': option['name'],
                'sourcePath': option['sourcePath'], 'exactSourceValues': true_values,
                'meaning': 'Intended selection meaning unverified; no plug, norm or physical-size interpretation inferred.'})
    all_true = sum(v['hasVariantsState'] == 'TRUE' for o in options for v in o['values'])
    all_false = sum(v['hasVariantsState'] == 'FALSE' for o in options for v in o['values'])

    variant_state, variants = variant_coverage(product)
    variant_verdict = 'UNKNOWN_' + variant_state
    if variant_state == 'COMPLETE_CONNECTION' and complete:
        variant_verdict = 'NO_COVERED_CONTRADICTION_OBSERVED'
        for vi, variant in enumerate(variants):
            for pair in variant['selectedOptions']:
                matching = [o for o in options if o['name'] == pair['name']]
                labels = [v for o in matching for v in o['values'] if v['name'] == pair['value']]
                # Ambiguous duplicate names/values never establish identity mismatch.
                if len(matching) > 1 or len(labels) > 1:
                    continue
                if not matching or not labels or labels[0]['hasVariantsState'] == 'FALSE':
                    variant_verdict = 'COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW'
                    add('COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW', {'variantPath': f'variants.edges[{vi}].node',
                        'selectedOption': pair, 'matchingExportedValues': labels}, severity='STRUCTURED_CONTRADICTION')
    # Prose is never promoted to a structured contradiction, missing-choice fact,
    # validated size/material specification or regional power compatibility.
    if core_text is None:
        desc = product.get('descriptionHtml')
        core_text = text_metrics(desc)['core_text'] if isinstance(desc, str) else None
    power_evidence: list[dict] = []
    if isinstance(core_text, str):
        for kind, cue in CHOICE_CUES.items():
            match = cue.search(core_text)
            allowed_names = COLOUR_NAMES if kind == 'colour' else SIZE_NAMES
            configured = [o for o in custom if folded(o['name']) in allowed_names and any(v['hasVariantsState'] == 'TRUE' for v in o['values'])]
            if match and complete and not configured:
                add('PROSE_MULTIPLE_CHOICES_UNMAPPED_REVIEW', {'sourceNameHint': kind,
                    'coreTextExcerpt': excerpt(core_text, match.start(), match.end()),
                    'matchedText': match.group(0), 'optionNames': [o['name'] for o in options]})
        false_mentions = []
        for o in custom:
            for v in o['values']:
                if v['hasVariantsState'] == 'FALSE' and len(v['name']) >= 3:
                    m = re.search(r'(?<!\w)' + re.escape(v['name']) + r'(?!\w)', core_text, re.I)
                    if m:
                        false_mentions.append({'optionName': o['name'], 'valueName': v['name'],
                            'valuePath': v['sourcePath'], 'hasVariants': False,
                            'coreTextExcerpt': excerpt(core_text, m.start(), m.end())})
        if false_mentions:
            add('PROSE_FALSE_LABEL_MENTION_REVIEW', false_mentions)
        scope_options = [o for o in multi if folded(o['name']) in SIZE_NAMES | MATERIAL_NAMES
                         and not all(v['name'] in REGIONAL_LABELS for v in o['values'] if v['hasVariantsState'] == 'TRUE')]
        match = SPEC_CUE.search(core_text)
        if scope_options and match:
            add('SPECIFICATION_SCOPE_ACROSS_CHOICES_REVIEW', {'optionNames': [o['name'] for o in scope_options],
                'coreTextExcerpt': excerpt(core_text, match.start(), match.end()), 'matchedText': match.group(0),
                'meaning': 'Prose scope requires review; label-to-size/material facts and variant differences are not inferred.'})
        plug_tokens: list[str] = []
        for m in PLUG_TOKEN.finditer(core_text):
            plug_tokens.append(m.group(1) or m.group(0).split()[0])
        for m in PLUG_LIST.finditer(core_text):
            # Only lists adjacent to an explicit plug/connector context qualify.
            if re.search(r'stecker|plug', excerpt(core_text, m.start(), m.end()), re.I):
                plug_tokens.extend(re.findall(r'\b(?:EU|US|UK|AU|CH)\b', m.group(0), re.I))
        power_evidence = [{'matchedText': m.group(0), 'coreTextExcerpt': excerpt(core_text, m.start(), m.end())}
                          for m in POWER_CUE.finditer(core_text)]
        plug_options = [o for o in multi if folded(o['name']) in PLUG_NAMES]
        if len(set(x.upper() for x in plug_tokens)) > 1 and not plug_options:
            add('PROSE_MULTIPLE_PLUG_TYPES_UNMAPPED_REVIEW', {'matchedSourceTokens': list(dict.fromkeys(plug_tokens)),
                'optionNames': [o['name'] for o in options], 'coreTextExcerpts': power_evidence,
                'meaning': 'No Swiss compatibility, included adapter or plug mapping inferred.'})
    guide = []
    if complete and isinstance(core_text, str):
        for option in multi:
            missing = [v['name'] for v in option['values'] if v['hasVariantsState'] == 'TRUE' and not exact_present(v['name'], core_text)]
            if missing:
                guide.append({'optionName': option['name'], 'labelsNotLexicallyFoundInCoreText': missing})
    if guide:
        add('EXACT_LABEL_GUIDE_REVIEW_CANDIDATE', guide, severity='EDITORIAL_CANDIDATE')
    tags = product.get('tags')
    retained_tags = [tag for tag in tags if isinstance(tag, str) and (REVIEW_TAG.search(tag) or TAG_GUARD.search(tag))] if isinstance(tags, list) else None
    return {'optionsCoverage': option_state, 'options': options, 'defaultTitleMetadataOnly': default,
            'customOptionCount': len(custom), 'multiValueCustomOptionCount': len(multi),
            'exactTrueValueCount': all_true, 'exactFalseValueCount': all_false,
            'variantsCoverage': variant_state, 'observedExportedVariantNodes': len(variants) if variant_state == 'COMPLETE_CONNECTION' else None,
            'variantMappingVerdict': variant_verdict, 'signals': signals,
            'retainedReviewTags': retained_tags, 'powerTextEvidence': power_evidence,
            'swissCompatibilityVerdict': 'UNKNOWN_NOT_ESTABLISHED_BY_THIS_TRIAGE',
            'variantCombinationsInferred': False, 'productDataGenerated': False}


def compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def run(source: Path, db: Path, out: Path) -> dict:
    if out.exists() and any(out.iterdir()):
        raise ValueError('Output directory must be empty')
    if source.stat().st_size != EXPECTED_BYTES:
        raise ValueError('Unexpected input byte count')
    out.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect('file:' + str(db) + '?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT line_number, product_id, description_sha256, core_text, core_word_count, classification, guard_matches_json, issues_json, autodraft_blocked, exclusion_blocks_json FROM products ORDER BY line_number')
    counts = Counter(); field_types = defaultdict(Counter); field_presence = Counter(); option_names = Counter(); flags = Counter(); value_fields = Counter(); option_fields = Counter()
    groups = defaultdict(Counter); signal_counts = Counter(); severity_counts = Counter(); variant_coverage_counts = Counter(); options_coverage_counts = Counter(); configurations = Counter(); tag_counts = Counter()
    verification = json.loads((Path(__file__).parent/'source-verification.json').read_text(encoding='utf-8'))
    if verification['observedSha256'] != EXPECTED_SHA or verification['observedBytes'] != EXPECTED_BYTES or verification['observedRows'] != EXPECTED_ROWS:
        raise ValueError('Missing matching initial local source verification')
    seen_ids = set(); candidates = []
    fields = ['line_number','product_id','url','title','product_type','core_word_count','classification','options_coverage','default_title_metadata_only','custom_options','multi_value_custom_options','exact_true_values','exact_false_values','variants_coverage','variant_mapping_verdict','existing_autodraft_blocked','existing_guard_matches','existing_issues','retained_review_tags','triage_signal_codes','power_text_evidence_count']
    with source.open('rb') as stream, (out/'triage-products.csv').open('w',encoding='utf-8',newline='') as cf, (out/'triage-evidence.jsonl').open('w',encoding='utf-8') as jf:
        writer = csv.writer(cf); writer.writerow(fields)
        for line, raw in enumerate(stream, 1):
            p = json.loads(raw, object_pairs_hook=unique_json_object, parse_constant=reject_json_constant)
            row = next(rows, None)
            if row is None or row['line_number'] != line or row['product_id'] != p.get('id'):
                raise ValueError('Existing text-audit row mismatch')
            if hashlib.sha256(p['descriptionHtml'].encode('utf-8')).hexdigest() != row['description_sha256']:
                raise ValueError('Existing text-audit description mismatch')
            if p['id'] in seen_ids or p.get('status') != 'ACTIVE':
                raise ValueError('Duplicate/non-ACTIVE source outside expected snapshot')
            seen_ids.add(p['id']); field_presence.update(p.keys())
            for key, val in p.items(): field_types[key][type(val).__name__] += 1
            for o in p.get('options', []):
                option_fields.update(o.keys()); option_names[o['name']] += 1
                for v in o.get('optionValues', []):
                    value_fields.update(v.keys()); flags[state(v.get('hasVariants', MISSING))] += 1
            configurations[tuple(o['name'] for o in p['options'])] += 1
            r = analyse(p, core_text=row['core_text'])
            codes = [s['code'] for s in r['signals']]
            t = p.get('productType'); g = groups[t]
            counts['products'] += 1; g['products'] += 1
            for key, yes in {'default_title_metadata_only':r['defaultTitleMetadataOnly'], 'custom_options_observed':r['customOptionCount']>0,
                'multi_value_custom_options_observed':r['multiValueCustomOptionCount']>0, 'contains_false_values':r['exactFalseValueCount']>0,
                'editorial_guide_candidates':'EXACT_LABEL_GUIDE_REVIEW_CANDIDATE' in codes, 'power_text_evidence':bool(r['powerTextEvidence']),
                'existing_autodraft_blocked':bool(row['autodraft_blocked']), 'existing_review_tags':bool(r['retainedReviewTags']),
                'short_core_under_120':row['core_word_count'] is not None and row['core_word_count']<120,
                'manual_triage_signals':any(s['severity']!='EDITORIAL_CANDIDATE' for s in r['signals'])}.items():
                if yes: counts[key] += 1; g[key] += 1
            options_coverage_counts[r['optionsCoverage']] += 1; variant_coverage_counts[r['variantsCoverage']] += 1
            signal_counts.update(set(codes)); severity_counts.update(set(s['severity'] for s in r['signals']))
            for code in set(codes): g['signal:'+code] += 1
            for tag in r['retainedReviewTags'] or []: tag_counts[tag] += 1
            result = {'lineNumber':line,'productId':p['id'],'url':'https://luxestyle.ch/products/'+p['handle'],'title':p['title'],'productType':t,
                'coreWordCount':row['core_word_count'],'textClassification':row['classification'],
                'descriptionSha256':row['description_sha256'], 'existingAutodraftBlocked':bool(row['autodraft_blocked']),
                'existingGuardMatches':json.loads(row['guard_matches_json']), 'existingIssues':json.loads(row['issues_json']),
                'existingExcludedServiceAndLinkBlocks':json.loads(row['exclusion_blocks_json']), **r}
            jf.write(compact(result)+'\n')
            writer.writerow([line,p['id'],result['url'],p['title'],t,row['core_word_count'],row['classification'],r['optionsCoverage'],int(r['defaultTitleMetadataOnly']),r['customOptionCount'],r['multiValueCustomOptionCount'],r['exactTrueValueCount'],r['exactFalseValueCount'],r['variantsCoverage'],r['variantMappingVerdict'],row['autodraft_blocked'],row['guard_matches_json'],row['issues_json'],compact(r['retainedReviewTags']),compact(codes),len(r['powerTextEvidence'])])
            if codes:
                # Evidence is compact and restricted to option labels/core snippets.
                candidates.append({k:v for k,v in result.items() if k not in {'existingExcludedServiceAndLinkBlocks'}})
        if next(rows, None) is not None:
            raise ValueError('Existing audit has extra rows')
    if counts['products'] != EXPECTED_ROWS:
        raise ValueError('Unexpected raw source count')
    group_columns = ['product_type']+sorted({key for group in groups.values() for key in group})
    with (out/'product-types.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.writer(f); w.writerow(group_columns)
        for name,group in sorted(groups.items(),key=lambda x:(-x[1]['products'],str(x[0]))):
            w.writerow([name]+[group[k] for k in group_columns[1:]])
    summary = {'version':VERSION, 'scope':'Existing complete ACTIVE export; snapshot evidence, no live checks',
        'input':{'path':str(source),'bytes':source.stat().st_size,'rows':counts['products'],'sha256':EXPECTED_SHA,
            'sha256_verified_once_in_initial_local_scan':str(Path(__file__).parent/'source-verification.json')},
        'text_audit_read_only':str(db),'existing_text_audit_id_line_and_raw_description_sha_matches':counts['products'],
        'counts':counts,'options_coverage':options_coverage_counts,'variants_coverage':variant_coverage_counts,
        'signal_product_counts_overlapping':signal_counts,'severity_product_counts_overlapping':severity_counts,
        'field_presence':field_presence,'field_types':field_types,'option_name_occurrences_exact':option_names,
        'option_field_occurrences':option_fields,'option_value_field_occurrences':value_fields,'hasVariants_states':flags,
        'option_name_configurations_exact':[{'names':list(k),'products':v} for k,v in configurations.most_common()],
        'review_tags_retained_exact':tag_counts,'product_types':len(groups),
        'known_absent_top_level_fields':{key:counts['products']-field_presence[key] for key in ['variants','variantCount','totalVariants','hasOnlyDefaultVariant','onlineStoreUrl','publishedAt','resourcePublications']},
        'limits':[
            'No variant nodes/selectedOptions exported. Variant IDs, number, combinations, stock, availability, storefront controls and live state are unknown.',
            'hasVariants true proves only that the exact option-value label has an associated variant in the snapshot; false is not configured-positive and not a defect by itself.',
            'Default Title is ordinary default metadata, never proof of missing required choices.',
            'Colour/size/material/plug prose yields manual suspicion only; source-name hints do not validate the label semantics.',
            'No Cartesian combinations, CH compatibility, adapters, product facts, licence or CJ variation mapping inferred.',
            'Signals overlap and are not a product-error rate. Editorial label absence is lexical only, not a quality or storefront defect.',
            'Services, Sperrtags, auswahl-offen and Rueckhol remain preserved; no change or permission is inferred.'
        ],'shop_api_calls':0,'shop_writes':0,'generated_product_descriptions':0,'workflow_writes':0}
    (out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # A small, type-diverse priority list. Review suspicions are ranked ahead of
    # editorial guidance; guards remain attached and never bypassed.
    rank={'STRUCTURED_LABEL_CONFLICT_REVIEW':0,'COVERED_SELECTED_OPTION_CONTRADICTION_REVIEW':0,
          'REGIONAL_LABELS_UNDER_SIZE_NAME_MEANING_REVIEW':1,
          'PROSE_MULTIPLE_PLUG_TYPES_UNMAPPED_REVIEW':1,'PROSE_FALSE_LABEL_MENTION_REVIEW':2,
          'PROSE_MULTIPLE_CHOICES_UNMAPPED_REVIEW':3,'SPECIFICATION_SCOPE_ACROSS_CHOICES_REVIEW':4,
          'EXACT_LABEL_GUIDE_REVIEW_CANDIDATE':5}
    def score(x):
        return (min(rank.get(s['code'],1) for s in x['signals']), x['coreWordCount'] if x['coreWordCount'] is not None else -1, x['lineNumber'])
    priorities=[]; used_types=Counter(); used_code=Counter()
    for x in sorted(candidates,key=score):
        main=min(x['signals'],key=lambda s:rank.get(s['code'],1))['code']
        if used_types[x['productType']]>=2 or used_code[main]>=4: continue
        priorities.append(x);used_types[x['productType']]+=1;used_code[main]+=1
        if len(priorities)>=12: break
    (out/'priority-review.json').write_text(json.dumps({'reviewOnly':True,'liveWriteAllowed':False,'selection':'12 candidates ranked by evidence kind, short core, and product-type diversity; not a representative error sample','products':priorities},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    conn.close()
    return summary


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--input',type=Path,default=SOURCE/'active-products.jsonl')
    parser.add_argument('--text-audit',type=Path,default=SOURCE/'audit-v1/audit.sqlite')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    result=run(args.input,args.text_audit,args.output)
    print(json.dumps({'version':VERSION,'input':result['input'],'counts':result['counts'],'signals':result['signal_product_counts_overlapping'],'variants_coverage':result['variants_coverage']},ensure_ascii=False,indent=2))
