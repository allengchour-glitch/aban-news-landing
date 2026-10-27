import copy
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from text_queue import CONFIRMED, PENDING_STATES, canonical, initialise, ingest_confirmation, next_batch, open_queue, preflight, receipt_summary, route, sha, stats, record_checkpoint, rebase_source


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.current = {'id': 'gid://shopify/Product/123', 'status': 'ACTIVE', 'descriptionHtml': '<p>Alt</p>', 'title': 'Titel', 'images': [{'url': 'https://example.test/a.jpg'}], 'variants': [{'id': 'v1', 'price': '34.90'}]}
        self.draft = {'productId': self.current['id'], 'beforeSha256': sha(self.current['descriptionHtml']), 'afterHtml': '<p>Neuer belegter Text</p>', 'basisNativeCanonicalSha256': sha(canonical(self.current)), 'qualityReviewed': True, 'qualityReviewReference': 'manual-claim-matrix.md'}

    def test_exact_source_is_review_only_never_writer(self):
        c, d = copy.deepcopy(self.current), copy.deepcopy(self.draft)
        r = preflight(c, d)
        self.assertEqual(r['state'], 'EXACT_SOURCE_MATCH_DESCRIPTION_ONLY_REVIEW_RECORDED')
        self.assertFalse(r['automaticWriteAllowed']); self.assertFalse(r['writeExecuted'])
        self.assertEqual(c, self.current); self.assertEqual(d, self.draft)

    def test_completed_exact_after_is_noop_even_stale_basis(self):
        self.current['descriptionHtml'] = self.draft['afterHtml']
        self.assertEqual(preflight(self.current, self.draft)['state'], 'ALREADY_APPLIED_NOOP')

    def test_text_changed_never_overwrites(self):
        self.current['descriptionHtml'] = '<p>Fremd geändert</p>'
        self.assertEqual(preflight(self.current, self.draft)['state'], 'SOURCE_CHANGED_REVIEW_NEW_DIFF')

    def test_variant_change_invalidates_previous_source_basis(self):
        self.current['variants'][0]['price'] = '35.90'
        self.assertEqual(preflight(self.current, self.draft)['state'], 'OTHER_NATIVE_SOURCE_CHANGED_OR_UNBOUND')

    def test_image_change_invalidates_previous_source_basis(self):
        self.current['images'][0]['url'] = 'https://example.test/b.jpg'
        self.assertEqual(preflight(self.current, self.draft)['state'], 'OTHER_NATIVE_SOURCE_CHANGED_OR_UNBOUND')

    def test_unknown_read_not_empty_description(self):
        for v in (None, {}, {'id': self.current['id'], 'descriptionHtml': None}):
            self.assertEqual(preflight(v, self.draft)['state'], 'UNKNOWN_OR_WRONG_CURRENT_SOURCE')

    def test_wrong_product_draft_status_and_unreviewed(self):
        self.draft['productId'] = 'gid://shopify/Product/456'
        self.assertEqual(preflight(self.current, self.draft)['state'], 'UNKNOWN_OR_WRONG_CURRENT_SOURCE')
        self.draft['productId'] = self.current['id']; self.current['status'] = 'DRAFT'
        self.assertEqual(preflight(self.current, self.draft)['state'], 'NOT_CURRENT_ACTIVE_SCOPE')
        self.current['status'] = 'ACTIVE'; self.draft['qualityReviewed'] = 'true'
        self.assertEqual(preflight(self.current, self.draft)['state'], 'SOURCE_MATCHES_QUALITY_REVIEW_REQUIRED')


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.root = Path(self.tmp.name); self.audit = self.root / 'audit'; self.audit.mkdir(); self.queue = self.root / 'queue.sqlite'
        c = sqlite3.connect(self.audit / 'audit.sqlite')
        c.execute('CREATE TABLE products(product_id TEXT,line_number INTEGER,status TEXT,title TEXT,handle TEXT,product_type TEXT,description_html TEXT,description_sha256 TEXT,core_word_count INTEGER,autodraft_blocked INTEGER,aban_reference INTEGER)')
        c.executemany('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?)', [('gid://shopify/Product/' + str(i), i, 'ACTIVE', 'Titel' + str(i), 'produkt-' + str(i), 'Mode', '<p>Alt</p>', sha('<p>Alt</p>'), w, blocked, 0) for i, w, blocked in [(1, 30, 0), (2, 85, 0), (3, 150, 0), (4, 50, 1)]])
        c.commit(); c.close()
        h = hashlib.sha256((self.audit / 'audit.sqlite').read_bytes()).hexdigest()
        (self.audit / 'manifest.json').write_text(json.dumps({'artifacts': {'audit.sqlite': {'sha256': h}}}))
        (self.audit / 'summary.json').write_text(json.dumps({'input_integrity_status': 'PASS', 'unique_product_ids': 4, 'input_sha256': 'a' * 64}))
        initialise(self.audit, self.queue, expected_count=4)

    def tearDown(self): self.tmp.cleanup()

    def make_receipt(self, event='changed-1', pid='gid://shopify/Product/1'):
        return {'changeId': event, 'state': 'CONFIRMED_NATIVE_AND_PUBLIC_JSON', 'productId': pid, 'checkedShop': {'domain': 'luxestyle.ch'}, 'submittedFields': ['id', 'descriptionHtml'], 'beforeSha256': sha('<p>Alt</p>'), 'afterSha256': sha('<p>Neu</p>'),
                'before': {'id': pid, 'descriptionHtml': '<p>Alt</p>', 'price': '34.90'}, 'after': {'id': pid, 'descriptionHtml': '<p>Neu</p>', 'price': '34.90'}, 'changedReturnedFields': ['descriptionHtml'], 'publicReadback': {'productId': pid.rsplit('/', 1)[1], 'status': 200, 'descriptionExact': True, 'descriptionSha256': sha('<p>Neu</p>')}}

    def save(self, value, name='receipt.json'):
        p = self.root / name; p.write_text(json.dumps(value)); return p

    def test_all_rows_retained_and_routing_not_quality(self):
        r = stats(self.queue)
        self.assertEqual(r['sourceRows'], 4); self.assertEqual(sum(r['states'].values()), 4)
        self.assertEqual(r['states']['NEEDS_QUALITY_REVIEW'], 1)
        self.assertEqual(r['ownApiOrShopWritesByThisTool'], 0)

    def test_do_not_reinitialise_existing_or_missing_queue(self):
        original = self.queue.read_bytes()
        with self.assertRaises(ValueError): initialise(self.audit, self.queue, expected_count=4)
        self.assertEqual(self.queue.read_bytes(), original)
        with self.assertRaises(ValueError): stats(self.root / 'missing.sqlite')

    def test_bounded_routes_no_autopagination(self):
        self.assertEqual(len(next_batch(self.queue, 2, 'NEEDS_SUBSTANTIVE_TEXT_REVIEW')), 2)
        self.assertEqual(next_batch(self.queue, 1, 'NEEDS_SUBSTANTIVE_TEXT_REVIEW')[0]['product_id'], 'gid://shopify/Product/1')
        for n in (0, 51, -1):
            with self.assertRaises(ValueError): next_batch(self.queue, n)
        with self.assertRaises(ValueError): next_batch(self.queue, 1, 'CONFIRMED')

    def test_receipt_once_preserved_no_repeated_work(self):
        path = self.save(self.make_receipt())
        self.assertEqual(ingest_confirmation(self.queue, path)['state'], CONFIRMED)
        self.assertEqual(ingest_confirmation(self.queue, path)['state'], 'EXISTING_CONFIRMATION_NOOP')
        r = stats(self.queue); self.assertEqual(r['events'], 1); self.assertEqual(r['states'][CONFIRMED], 1)
        self.assertNotIn('gid://shopify/Product/1', [r['product_id'] for r in next_batch(self.queue)])

    def test_changed_receipt_id_rejected_and_existing_completion_retained(self):
        r = self.make_receipt(); path = self.save(r); ingest_confirmation(self.queue, path)
        r['note'] = 'changed'; path = self.save(r)
        with self.assertRaises(ValueError): ingest_confirmation(self.queue, path)
        self.assertEqual(stats(self.queue)['events'], 1)

    def test_second_event_cannot_reset_or_replace_completed_product(self):
        ingest_confirmation(self.queue, self.save(self.make_receipt()))
        with self.assertRaises(ValueError): ingest_confirmation(self.queue, self.save(self.make_receipt('another')))
        self.assertEqual(stats(self.queue)['states'][CONFIRMED], 1)

    def test_receipt_unknown_missing_public_or_extra_write_are_not_completion(self):
        for modify in [lambda r: r.update(state='WRITE_UNKNOWN'), lambda r: r['publicReadback'].update(descriptionExact=None), lambda r: r.update(changedReturnedFields=['descriptionHtml', 'variants']), lambda r: r.update(submittedFields=['id', 'descriptionHtml', 'status']), lambda r: r['checkedShop'].update(domain='other.example')]:
            r = self.make_receipt(); modify(r)
            with self.assertRaises(ValueError): ingest_confirmation(self.queue, self.save(r))
        self.assertEqual(stats(self.queue)['events'], 0)

    def test_source_hash_conflict_requires_explicit_rebase(self):
        r = self.make_receipt(); r['beforeSha256'] = 'f' * 64
        with self.assertRaises(ValueError): ingest_confirmation(self.queue, self.save(r))
        self.assertEqual(stats(self.queue)['events'], 0)

    def test_original_source_hash_drift_refuses_initialisation(self):
        with (self.audit / 'audit.sqlite').open('ab') as f: f.write(b'drift')
        with self.assertRaises(ValueError): initialise(self.audit, self.root / 'other.sqlite', expected_count=4)
        self.assertFalse((self.root / 'other.sqlite').exists())

    def test_legacy_coat_adapter_requires_real_readback_flags(self):
        r = {'changeId': 'coat', 'shop': 'luxestyle.ch', 'productId': 'gid://shopify/Product/1', 'fields': ['descriptionHtml'], 'beforeSha256': sha('<p>Alt</p>'), 'expectedAfterSha256': sha('<p>Neu</p>'), 'state': 'CONFIRMED_NATIVE_AND_PUBLIC_READBACK', 'verification': {'nativeReadbackExact': True, 'publicReadbackExact': True, 'publicStatus': 200, 'otherNativeFieldsChanged': []}}
        self.assertEqual(receipt_summary(r)['after'], sha('<p>Neu</p>'))
        r['verification']['nativeReadbackExact'] = 'true'
        with self.assertRaises(ValueError): receipt_summary(r)

    def make_attempt(self, state='INFLIGHT', change='changed-1'):
        r = self.make_receipt(event=change)
        r.update(state=state, attemptEvidenceReference='caller-own-serial-attempt.json', writeAttempted=True)
        return r

    def make_rebase(self):
        return {'rebaseId': 'source-read-1', 'productId': 'gid://shopify/Product/1', 'checkedShop': {'domain': 'luxestyle.ch'},
                'nativeProduct': {'id': 'gid://shopify/Product/1', 'status': 'ACTIVE', 'descriptionHtml': '<p>Fresh foreign edit</p>'},
                'sourceSnapshotSha256': 'a'*64, 'previousReviewBasisSha256': sha('<p>Alt</p>'),
                'nativeReadAtUTC': '2026-10-27T08:30:00+01:00', 'qualityReviewReference': 'fresh-source-review.md'}

    def test_unknown_checkpoint_blocks_new_work_and_later_resolution_is_append_only(self):
        record_checkpoint(self.queue, self.save(self.make_attempt()))
        record_checkpoint(self.queue, self.save(self.make_attempt('WRITE_UNKNOWN')))
        self.assertNotIn('gid://shopify/Product/1', [r['product_id'] for r in next_batch(self.queue)])
        self.assertEqual(stats(self.queue)['events'], 2)
        ingest_confirmation(self.queue, self.save(self.make_receipt()))
        self.assertEqual(stats(self.queue)['events'], 3)
        self.assertEqual(stats(self.queue)['states'][CONFIRMED], 1)

    def test_unknown_cannot_reset_or_get_new_attempt_identity(self):
        record_checkpoint(self.queue, self.save(self.make_attempt('WRITE_UNKNOWN')))
        with self.assertRaises(ValueError): record_checkpoint(self.queue, self.save(self.make_attempt()))
        with self.assertRaises(ValueError): record_checkpoint(self.queue, self.save(self.make_attempt('WRITE_UNKNOWN', 'different-change')))
        with self.assertRaises(ValueError): ingest_confirmation(self.queue, self.save(self.make_receipt('different-change')))
        self.assertEqual(stats(self.queue)['states'][PENDING_STATES['WRITE_UNKNOWN']], 1)

    def test_checkpoint_repeat_noop_no_event_duplication(self):
        path = self.save(self.make_attempt())
        record_checkpoint(self.queue, path)
        self.assertEqual(record_checkpoint(self.queue, path)['state'], 'EXISTING_CHECKPOINT_NOOP')
        self.assertEqual(stats(self.queue)['events'], 1)

    def test_public403_with_native_confirmation_is_unknown_not_failed_or_retry(self):
        r = self.make_attempt('NATIVE_CONFIRMED_PUBLIC_UNKNOWN')
        r.update(nativeReadbackExact=True, nativeAfterSha256=r['afterSha256'], publicStatus=403)
        record_checkpoint(self.queue, self.save(r))
        self.assertNotIn('gid://shopify/Product/1', [r['product_id'] for r in next_batch(self.queue)])
        self.assertNotIn(CONFIRMED, stats(self.queue)['states'])

    def test_checkpoint_missing_attempt_or_false_native_flags_rejected(self):
        for change in [lambda r:r.update(writeAttempted=False),lambda r:r.update(attemptEvidenceReference='')]:
            r=self.make_attempt('WRITE_UNKNOWN');change(r)
            with self.assertRaises(ValueError):record_checkpoint(self.queue,self.save(r))
        with self.assertRaises(ValueError): record_checkpoint(self.queue,self.save(self.make_attempt('NATIVE_CONFIRMED_PUBLIC_UNKNOWN')))

    def test_changed_source_rebase_preserves_original_then_confirmation_targets_new_basis(self):
        rebase=self.make_rebase();path=self.save(rebase,'rebase.json')
        rebase_source(self.queue,path)
        self.assertEqual(rebase_source(self.queue,path)['state'],'EXISTING_SOURCE_REBASE_NOOP')
        c=open_queue(self.queue);p=dict(c.execute('SELECT * FROM products WHERE product_id=?',(rebase['productId'],)).fetchone());c.close()
        self.assertEqual(p['snapshot_description_sha256'],sha('<p>Alt</p>'))
        self.assertEqual(p['review_basis_sha256'],sha('<p>Fresh foreign edit</p>'))
        r=self.make_receipt();r['before']['descriptionHtml']='<p>Fresh foreign edit</p>';r['beforeSha256']=sha(r['before']['descriptionHtml'])
        ingest_confirmation(self.queue,self.save(r))
        self.assertEqual(stats(self.queue)['events'],2)

    def test_rebase_pending_completion_lineage_and_calendar_fail_closed(self):
        r=self.make_rebase();r['previousReviewBasisSha256']='f'*64
        with self.assertRaises(ValueError): rebase_source(self.queue,self.save(r))
        r=self.make_rebase();r['nativeReadAtUTC']='2026-02-30T12:00:00Z'
        with self.assertRaises(ValueError): rebase_source(self.queue,self.save(r))
        record_checkpoint(self.queue,self.save(self.make_attempt('WRITE_UNKNOWN')))
        with self.assertRaises(ValueError): rebase_source(self.queue,self.save(self.make_rebase()))

    def test_current_numeric_identity_and_empty_review_provenance_fail_closed(self):
        c={'id':1,'descriptionHtml':'<p>Alt</p>','status':'ACTIVE'};d={'productId':1,'afterHtml':'<p>Neu</p>'}
        self.assertEqual(preflight(c,d)['state'],'UNKNOWN_OR_WRONG_CURRENT_SOURCE')
        for w in [True,-1,'50',None]:self.assertEqual(route({'core_word_count':w})[0],'NEEDS_SOURCE_OR_IDENTITY_REVIEW')

    def test_receipt_scalar_public_wrong_product_missing_nativefield_rejected(self):
        for r in [None,[],1,'receipt']:
            with self.assertRaises(ValueError):receipt_summary(r)
        r=self.make_receipt();r['publicReadback']['productId']='2'
        with self.assertRaises(ValueError):receipt_summary(r)
        r=self.make_receipt();del r['after']['price']
        with self.assertRaises(ValueError):receipt_summary(r)

    def test_null_valued_missing_native_field_is_still_unknown(self):
        r=self.make_receipt();r['before']['optional']=None
        with self.assertRaises(ValueError):receipt_summary(r)

    def make_root_receipt(self):
        r=self.make_receipt();del r['checkedShop'];del r['submittedFields']
        r.update(state='CONFIRMED_NATIVE_PUBLIC_JSON_AND_HTML',url='https://luxestyle.ch/products/example',writeAttempts=1,blindRetries=0,
                 authorization={'scope':'descriptionHtml only; prior explicit product-text instruction remains in force','ownerInstructions':['nur text verbessern bei produkt','alle produkten']})
        for k in ['before','after']:r[k]['currencyCode']='CHF'
        old=r['publicReadback'];r['publicReadback']={'productId':r['productId'],'responseProductId':'1','url':r['url']+'.js','httpStatus':old['status'],'descriptionExact':old['descriptionExact'],'afterSha256':old['descriptionSha256']}
        r['publicHtmlReadback']={'productId':r['productId'],'url':r['url'],'httpStatus':200,'completeDocument':True,'newOpeningInNonScriptText':True,'responseSha256':'b'*64}
        return r

    def test_root_batch_keys_are_mapped_from_exact_original_evidence(self):
        r=self.make_root_receipt();original=copy.deepcopy(r)
        self.assertEqual(receipt_summary(r)['product_id'],r['productId']);self.assertEqual(r,original)
        ingest_confirmation(self.queue,self.save(r));self.assertEqual(stats(self.queue)['events'],1)

    def test_root_short_description_scope_is_accepted_without_changing_it(self):
        r=self.make_root_receipt();r['authorization']['scope']='descriptionHtml only'
        self.assertEqual(receipt_summary(r)['event_id'],r['changeId'])
        self.assertEqual(r['authorization']['scope'],'descriptionHtml only')

    def test_root_batch_missing_or_conflicting_proof_never_implies_success(self):
        for change in [lambda r:r['publicReadback'].update(responseProductId=1),lambda r:r['publicHtmlReadback'].update(newOpeningInNonScriptText=None),lambda r:r['after'].update(currencyCode='USD'),lambda r:r.update(url='https://other.example/products/example'),lambda r:r.update(writeAttempts=True),lambda r:r['authorization'].update(scope='all writes')]:
            r=self.make_root_receipt();change(r)
            with self.assertRaises(ValueError):receipt_summary(r)

    def test_semantic_corruption_missing_product_or_missing_completion_event_is_unknown(self):
        c=sqlite3.connect(self.queue);c.execute("DELETE FROM products WHERE product_id='gid://shopify/Product/4'");c.commit();c.close()
        with self.assertRaises(ValueError):stats(self.queue)
        # A separate intact fixture proves a completion cannot be invented without its event.
        q=self.root/'other.sqlite';initialise(self.audit,q,expected_count=4)
        c=sqlite3.connect(q);c.execute("UPDATE products SET state=?,known_after_sha256=?,completion_event='missing' WHERE product_id='gid://shopify/Product/1'",(CONFIRMED,'a'*64));c.commit();c.close()
        with self.assertRaises(ValueError):stats(q)


if __name__ == '__main__': unittest.main()
