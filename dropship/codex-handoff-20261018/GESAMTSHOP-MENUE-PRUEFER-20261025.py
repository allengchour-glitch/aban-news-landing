"""Read-only validation of archived LuxeStyle menu migration; no network or writes.

Requires lxml, already present in this workspace. Does not install dependencies.
"""
from pathlib import Path
from collections import Counter
from lxml import html
import argparse, hashlib, json, re, unicodedata

def text(node):
    return re.sub(r'\s+', ' ', ' '.join(node.itertext())).strip()

def pointer(document, value):
    for part in value.strip('/').split('/'):
        document=document[int(part)] if isinstance(document,list) else document[part]
    return document

def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--base',type=Path,default=Path(__file__).resolve().parent.parent)
    base=cli.parse_args().base.resolve()
    migration=base/'migration'
    data=json.loads((migration/'MENU-MIGRATION.json').read_text())
    assert data['status']=='LOCAL_REVIEW_DRAFT_NOT_APPLIED'
    assert data['scope']['new_network_requests']==0 and data['scope']['shop_writes']==0
    assert data['scope']['prototype_changes']==0
    assert data['scope']['native_shopify_menu_source_available'] is False
    for source in data['source_manifest']:
        raw=(base/source['path']).read_bytes()
        assert len(raw)==source['bytes'],source['path']
        assert hashlib.sha256(raw).hexdigest()==source['sha256'],source['path']
    dom=html.fromstring((base/'structure/sources/technik.html').read_bytes())
    tree=dom.getroottree()
    nav=dom.xpath('//nav[contains(concat(" ",@class," ")," menu-list ")]')[0]
    anchors=nav.xpath('.//a[@href]')
    entries=data['entries']
    assert len(entries)==len(anchors)==218
    assert len({x['id'] for x in entries})==len(entries)
    assert [x['source_dom_xpath'] for x in entries]==[tree.getpath(a) for a in anchors]
    lookup={x['id']:x for x in entries}
    for row,a in zip(entries,anchors):
        assert row['source_label_exact']==text(a),row['id']
        assert row['original_url']==row['preserved_target_url']==a.get('href'),row['id']
        assert row['mutation']=='NONE'
        hierarchy=row['source_hierarchy']
        assert len(hierarchy)==row['source_depth']
        assert hierarchy[-1]['entry_id']==row['id']
        assert hierarchy[0]['url']==a.xpath('ancestor-or-self::li[contains(concat(" ",@class," ")," menu-list__list-item ")]/a')[0].get('href')
        for ancestor in hierarchy:
            original=lookup[ancestor['entry_id']]
            assert ancestor['url']==original['original_url']
            assert ancestor['label']==original['source_label_exact']
        placement=row['migration']
        assert len(placement['proposed_path'] or [])<=3
        if placement['proposed_main_group']:
            assert placement['status']=='MAPPED_DRAFT'
            assert placement['proposed_main_group'] in data['proposed_six_groups']
            assert placement['proposed_path'][0]==placement['proposed_main_group']
        else:
            assert 'OPEN' in placement['status']
    assert Counter(str(x['source_depth']) for x in entries)=={'1':13,'2':174,'3':31}
    all_urls={x['original_url'] for x in entries}
    protected=data['preserved_destinations']
    assert len(protected)==len(all_urls)==195
    assert {x['url'] for x in protected}==all_urls
    assert all(x['must_preserve'] is True and x['target_write']=='NONE' for x in protected)
    current=json.loads((base/'structure/CURRENT-EVIDENCE.json').read_text())
    derived=data['derived_json_coverage']
    assert len(derived)==sum(1+len(g['items']) for g in current['current_desktop_navigation'])==214
    assert len({x['json_pointer'] for x in derived})==214
    for row in derived:
        source=pointer(current,row['json_pointer'])
        assert source['url']==row['url']
        assert all(lookup[key]['original_url']==row['url'] for key in row['raw_entry_ids'])
    supplements=[x for x in entries if not x['derived_json_pointers']]
    assert {x['id'] for x in supplements}==set(data['supplemental_raw_entries'])
    assert {x['original_url'] for x in supplements}=={
        'https://luxestyle.ch/pages/selbst-gestalten',
        'https://luxestyle.ch/blogs/ratgeber',
        'https://luxestyle.ch/pages/alle-kategorien',
        'https://luxestyle.ch/pages/marken-kategorien'}
    mobile_nav=dom.xpath('//nav[contains(concat(" ",@class," ")," menu-drawer__navigation ")]')[0]
    mobile_anchors=mobile_nav.xpath('.//a[@href]')
    mobile=data['mobile_rendered_links']
    assert len(mobile)==len(mobile_anchors)==196
    for row,a in zip(mobile,mobile_anchors):
        assert row['source_dom_xpath']==tree.getpath(a)
        assert row['url']==a.get('href') and row['source_label_exact']==text(a)
    mobile_urls={x['url'] for x in mobile}
    assert len(mobile_urls)==181 and mobile_urls<=all_urls
    assert set(data['desktop_destinations_without_mobile_href'])==all_urls-mobile_urls
    counts=Counter(x['original_url'] for x in entries)
    duplicates=data['repeated_targets']
    assert {x['url']:x['occurrence_count'] for x in duplicates}=={u:c for u,c in counts.items() if c>1}
    assert len(duplicates)==22 and sum(x['occurrence_count']-1 for x in duplicates)==23
    routes=data['filter_route_families']
    assert len(routes)==5
    for row in routes:
        found=dom.xpath(row['source_dom_xpath'])
        assert len(found)==1 and found[0].get('href')==row['url']
        assert row['menu_entry'] is False
        assert '/collections/elektronik-technik/' in row['url']
    assert len(data['proposed_six_groups'])==6
    assert all('%F0%9F' in x['original_url'] for x in entries if 'PERCENT_ENCODED_HANDLE_PRESERVE_EXACTLY' in x['review_flags'])
    report=(migration/'MENU-MIGRATION.md').read_text()
    assert not any(unicodedata.category(c)=='So' for c in report)
    assert all(x['id'] in report for x in entries)
    summary={'status':'PASS','desktop_occurrences':len(entries),'preserved_unique_destinations':len(protected),
             'derived_json_entries_covered':len(derived),'supplemental_non_collection_links':len(supplements),
             'mobile_occurrences':len(mobile),'desktop_destinations_without_mobile_href':len(all_urls-mobile_urls),
             'mapped_draft_occurrences':sum(bool(x['migration']['proposed_main_group']) for x in entries),
             'open_placement_occurrences':sum(not x['migration']['proposed_main_group'] for x in entries),
             'tag_route_appendix':len(routes),'checks':'Local archived completeness and unchanged targets; no live/admin completeness claim.'}
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
