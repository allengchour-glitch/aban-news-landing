"""Local catalogue worklist and receipts. No network or Shopify writer exists here."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlsplit

VERSION = 'text-worklist-1.1.0'
CONFIRMED = 'CONFIRMED_LIVE_PREVIOUSLY_READ_BACK'
DIGEST = re.compile(r'^[a-f0-9]{64}$')
GID = re.compile(r'^gid://shopify/Product/[0-9]+$')
REVIEW_STATES = frozenset({'NEEDS_SOURCE_OR_IDENTITY_REVIEW', 'NEEDS_SUBSTANTIVE_TEXT_REVIEW', 'NEEDS_QUALITY_REVIEW'})
PENDING_STATES = {'INFLIGHT': 'INFLIGHT_TARGETED_READBACK_REQUIRED', 'WRITE_UNKNOWN': 'WRITE_UNKNOWN_TARGETED_READBACK_REQUIRED',
                  'NATIVE_CONFIRMED_PUBLIC_UNKNOWN': 'NATIVE_CONFIRMED_PUBLIC_UNKNOWN_TARGETED_READBACK_REQUIRED'}


def is_text(value):
    return isinstance(value, str) and bool(value.strip())


def object_value(value, label):
    if not isinstance(value, dict):
        raise ValueError(label + ' must be an object, not missing/null/scalar data.')
    return value


def receipt_identity(receipt):
    r = object_value(receipt, 'Receipt')
    pid, event = r.get('productId'), r.get('changeId')
    before, after = r.get('beforeSha256'), r.get('afterSha256', r.get('expectedAfterSha256'))
    if not isinstance(pid, str) or not GID.fullmatch(pid) or not is_text(event):
        raise ValueError('Exact product/event identity required.')
    if not all(isinstance(v, str) and DIGEST.fullmatch(v) for v in (before, after)):
        raise ValueError('Exact before/after digests required.')
    if before == after:
        raise ValueError('Unchanged description is not a new completed improvement.')
    return {'event_id': event, 'product_id': pid, 'before': before, 'after': after}


def sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def file_sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def canonical(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def route(row: dict) -> tuple[str, int, list]:
    """A review route, never a quality verdict or permission to change a product."""
    words = row.get('core_word_count')
    if row.get('autodraft_blocked') or row.get('aban_reference') or type(words) is not int or words < 0:
        return 'NEEDS_SOURCE_OR_IDENTITY_REVIEW', 0, ['inherited_audit_routing_only']
    if words < 60:
        return 'NEEDS_SUBSTANTIVE_TEXT_REVIEW', 10, ['short_core_under_60_words_is_editorial_heuristic']
    if words < 120:
        return 'NEEDS_SUBSTANTIVE_TEXT_REVIEW', 20, ['short_core_under_120_words_is_editorial_heuristic']
    return 'NEEDS_QUALITY_REVIEW', 30, ['length_does_not_prove_quality_or_need_for_rewrite']


def open_queue(path: Path, writable=False):
    if not path.is_file():
        raise ValueError('Missing queue means UNKNOWN. Do not initialise over an expected existing queue.')
    c = sqlite3.connect('file:' + str(path.resolve()) + ('?mode=rw' if writable else '?mode=ro'), uri=True)
    c.row_factory = sqlite3.Row
    row = c.execute("SELECT value FROM meta WHERE key='version'").fetchone()
    if row is None or row[0] != VERSION:
        c.close()
        raise ValueError('Unsupported or corrupt queue; do not reset it.')
    check = c.execute('PRAGMA quick_check').fetchone()[0]
    if check != 'ok':
        c.close()
        raise ValueError('Queue integrity unknown; no reset or blind retry.')
    expected = c.execute("SELECT value FROM meta WHERE key='source_rows'").fetchone()
    if expected is None or not str(expected[0]).isdigit() or c.execute('SELECT count(*) FROM products').fetchone()[0] != int(expected[0]):
        c.close()
        raise ValueError('Worklist row coverage is unknown or incomplete; do not reset.')
    bad_completion = c.execute('''SELECT 1 FROM products p LEFT JOIN events e ON e.event_id=p.completion_event
      WHERE (p.state=? AND (p.completion_event IS NULL OR p.known_after_sha256 IS NULL OR e.event_id IS NULL OR
             e.product_id!=p.product_id OR e.event_state!=? OR e.after_sha256!=p.known_after_sha256))
         OR (p.state!=? AND (p.completion_event IS NOT NULL OR p.known_after_sha256 IS NOT NULL)) LIMIT 1''', (CONFIRMED, CONFIRMED, CONFIRMED)).fetchone()
    if bad_completion:
        c.close()
        raise ValueError('Completion/event lineage is unknown; preserve checkpoint for inspection.')
    pending_states = tuple(PENDING_STATES.values())
    bad_pending = c.execute('''SELECT 1 FROM products p WHERE
       (p.state IN (?,?,?) AND (p.pending_change_id IS NULL OR NOT EXISTS
          (SELECT 1 FROM events e WHERE e.product_id=p.product_id AND e.change_id=p.pending_change_id AND e.event_state=p.state)))
       OR (p.state NOT IN (?,?,?) AND p.pending_change_id IS NOT NULL) LIMIT 1''', (*pending_states, *pending_states)).fetchone()
    if bad_pending:
        c.close()
        raise ValueError('Pending/event lineage is unknown; no automatic retry.')
    conflicting_change = c.execute('''SELECT 1 FROM events GROUP BY change_id
       HAVING count(DISTINCT product_id)!=1 OR count(DISTINCT before_sha256)!=1 OR count(DISTINCT after_sha256)!=1 LIMIT 1''').fetchone()
    if conflicting_change:
        c.close()
        raise ValueError('Attempt identity/target history conflicts; do not reset or retry.')
    return c


def initialise(audit_dir: Path, output: Path, expected_count=56630, reuse_recorded_source_validation=False):
    if output.exists():
        raise ValueError('Queue already exists; first initialisation only, never overwrite/reset.')
    manifest = json.loads((audit_dir / 'manifest.json').read_text())
    summary = json.loads((audit_dir / 'summary.json').read_text())
    source = audit_dir / 'audit.sqlite'
    if summary.get('input_integrity_status') != 'PASS' or summary.get('unique_product_ids') != expected_count:
        raise ValueError('Unconfirmed original snapshot scope.')
    artifact = manifest['artifacts']['audit.sqlite']
    if reuse_recorded_source_validation:
        if not isinstance(artifact.get('bytes'), int) or source.stat().st_size != artifact['bytes']:
            raise ValueError('Recorded source byte count unavailable or changed.')
        source_hash = artifact['sha256']
        source_check = 'Recorded prior full validation reused; byte count plus every description/id/status checked during routing. Whole DB not rehashed.'
    else:
        source_hash = file_sha(source)
        if source_hash != artifact['sha256']:
            raise ValueError('Existing audit database hash changed.')
        source_check = 'Whole source database freshly hashed; every description/id/status also checked.'
    src = sqlite3.connect('file:' + str(source.resolve()) + '?mode=ro', uri=True)
    src.row_factory = sqlite3.Row
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents accidental reinitialisation at a known path.
    with output.open('xb'):
        pass
    dst = sqlite3.connect(output)
    try:
        dst.executescript('''
          CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE products(
            product_id TEXT PRIMARY KEY, line_number INTEGER UNIQUE NOT NULL,
            title TEXT NOT NULL, handle TEXT, product_type TEXT, snapshot_description_sha256 TEXT NOT NULL,
            core_word_count INTEGER, state TEXT NOT NULL, priority INTEGER NOT NULL,
            reasons_json TEXT NOT NULL, review_basis_sha256 TEXT NOT NULL,
            source_rebase_event TEXT, pending_change_id TEXT, known_after_sha256 TEXT, completion_event TEXT);
          CREATE TABLE events(
            event_id TEXT PRIMARY KEY, change_id TEXT NOT NULL, product_id TEXT NOT NULL, event_state TEXT NOT NULL,
            recorded_at_utc TEXT NOT NULL, receipt_path TEXT NOT NULL,
            receipt_sha256 TEXT NOT NULL, before_sha256 TEXT, after_sha256 TEXT,
            metadata_json TEXT NOT NULL);
          CREATE INDEX work_order ON products(priority, line_number);
        ''')
        dst.executemany('INSERT INTO meta VALUES (?,?)', [
            ('version', VERSION), ('shop', 'luxestyle.ch'), ('created_at_utc', utc()),
            ('source_snapshot_sha256', summary['input_sha256']), ('source_audit_sha256', source_hash),
            ('source_validation_mode', source_check),
            ('source_rows', str(expected_count)), ('no_network_or_writer', 'true'),
            ('coverage', 'Original ACTIVE snapshot only; drafts/archived/current additions not exported')])
        count = 0
        for row in src.execute('SELECT * FROM products ORDER BY line_number'):
            r = dict(row)
            if not GID.fullmatch(r['product_id']) or r['status'] != 'ACTIVE':
                raise ValueError('Source identity/status mismatch.')
            if not isinstance(r['description_html'], str) or sha(r['description_html']) != r['description_sha256']:
                raise ValueError('Stored source description/hash mismatch.')
            state, priority, reasons = route(r)
            dst.execute('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL)', (
                r['product_id'], r['line_number'], r['title'], r['handle'], r['product_type'],
                r['description_sha256'], r['core_word_count'], state, priority, canonical(reasons), r['description_sha256']))
            count += 1
        if count != expected_count:
            raise ValueError('Snapshot row count mismatch.')
        dst.commit()
    except BaseException:
        dst.rollback()
        # Preserve the partial file for inspection, never recreate it silently.
        output.with_suffix(output.suffix + '.FAILED.json').write_text(canonical({'state': 'INVALID_PARTIAL_OUTPUT', 'createdAt': utc()}))
        raise
    finally:
        src.close()
        dst.close()


def receipt_summary(receipt: dict) -> dict:
    """Adapt the two recorded receipt formats; syntactic proof only, not truth validation."""
    identity = receipt_identity(receipt)
    state, product_id, after = receipt.get('state'), identity['product_id'], identity['after']
    if state == 'CONFIRMED_NATIVE_AND_PUBLIC_READBACK':
        v = object_value(receipt.get('verification'), 'Legacy verification')
        if receipt.get('shop') != 'luxestyle.ch' or receipt.get('fields') != ['descriptionHtml']:
            raise ValueError('Receipt must cover only descriptionHtml in LuxeStyle.')
        if v.get('nativeReadbackExact') is not True or v.get('publicReadbackExact') is not True or v.get('publicStatus') != 200:
            raise ValueError('Both confirmed readbacks required.')
        if v.get('otherNativeFieldsChanged') != []:
            raise ValueError('Other native fields changed or unknown.')
    elif state in ('CONFIRMED_NATIVE_AND_PUBLIC_JSON', 'CONFIRMED_NATIVE_PUBLIC_JSON_AND_HTML'):
        p = object_value(receipt.get('publicReadback'), 'Public readback')
        b = object_value(receipt.get('after'), 'Native after readback')
        old = object_value(receipt.get('before'), 'Native before readback')
        if state == 'CONFIRMED_NATIVE_PUBLIC_JSON_AND_HTML' and ('checkedShop' in receipt or 'submittedFields' in receipt):
            raise ValueError('Advanced root receipt cannot mix legacy scope/readback keys.')
        if 'checkedShop' in receipt or 'submittedFields' in receipt:
            checked_shop = object_value(receipt.get('checkedShop'), 'Checked shop')
            if checked_shop.get('domain') != 'luxestyle.ch' or receipt.get('submittedFields') != ['id', 'descriptionHtml']:
                raise ValueError('Receipt must cover only descriptionHtml in LuxeStyle.')
            public_status, public_hash, public_pid = p.get('status'), p.get('descriptionSha256'), p.get('productId')
        else:
            # Root's exact batch-record format: keep original state and fields,
            # map explicit readback keys without inventing submitted/checked flags.
            auth = object_value(receipt.get('authorization'), 'Root authorization context')
            if auth.get('scope') not in ('descriptionHtml only', 'descriptionHtml only; prior explicit product-text instruction remains in force') or auth.get('ownerInstructions') != ['nur text verbessern bei produkt', 'alle produkten']:
                raise ValueError('Unknown root batch scope; no inferred write authorisation.')
            url = receipt.get('url')
            if not isinstance(url, str):
                raise ValueError('Explicit root product URL required.')
            parsed = urlsplit(url)
            if parsed.scheme != 'https' or parsed.hostname != 'luxestyle.ch' or parsed.username or parsed.password or parsed.port is not None or not parsed.path.startswith('/products/') or parsed.query or parsed.fragment:
                raise ValueError('Root receipt product URL is not the exact LuxeStyle product scope.')
            if old.get('currencyCode') != 'CHF' or b.get('currencyCode') != 'CHF' or p.get('url') != url + '.js' or p.get('productId') != product_id:
                raise ValueError('Root native/public product scope not bound.')
            if type(receipt.get('writeAttempts')) is not int or receipt['writeAttempts'] != 1 or receipt.get('blindRetries') != 0:
                raise ValueError('Root receipt must record one non-retried write.')
            public_status, public_hash, public_pid = p.get('httpStatus'), p.get('afterSha256'), p.get('responseProductId')
        if not isinstance(b.get('descriptionHtml'), str) or not isinstance(old.get('descriptionHtml'), str):
            raise ValueError('Native before/after descriptions must be actual strings.')
        if old.get('id') != product_id or b.get('id') != product_id or sha(old['descriptionHtml']) != identity['before'] or sha(b['descriptionHtml']) != after:
            raise ValueError('Native description readback/identity invalid.')
        if old.keys() != b.keys():
            raise ValueError('Native readback field set changed or is unknown.')
        actual_changed = [k for k in old.keys() | b.keys() if old.get(k) != b.get(k)]
        if receipt.get('changedReturnedFields') != ['descriptionHtml'] or actual_changed != ['descriptionHtml']:
            raise ValueError('Other supplied native fields changed or are missing.')
        if public_status != 200 or p.get('descriptionExact') is not True or public_hash != after:
            raise ValueError('Public description readback missing/unknown.')
        if public_pid != product_id.rsplit('/', 1)[1]:
            raise ValueError('Public product identity not exactly bound.')
        if state == 'CONFIRMED_NATIVE_PUBLIC_JSON_AND_HTML':
            h = object_value(receipt.get('publicHtmlReadback'), 'HTML readback')
            if h.get('httpStatus') != 200 or h.get('completeDocument') is not True or h.get('newOpeningInNonScriptText') is not True or h.get('productId') != product_id or h.get('url') != receipt.get('url') or not isinstance(h.get('responseSha256'), str) or not DIGEST.fullmatch(h['responseSha256']):
                raise ValueError('Complete public HTML readback evidence missing or conflicting.')
    else:
        raise ValueError('Unknown/inflight/draft/merely-scheduled state is never completed.')
    return identity


def existing_event(c, event_id, digest):
    existing = c.execute('SELECT * FROM events WHERE event_id=?', (event_id,)).fetchone()
    if not existing:
        return False
    if existing['receipt_sha256'] == digest:
        return True
    raise ValueError('Same event stage with altered receipt: preserve history and review conflict.')


def assert_change_identity(c, change_id, pid, before, after):
    records = c.execute('SELECT product_id,before_sha256,after_sha256 FROM events WHERE change_id=?', (change_id,)).fetchall()
    if any((r['product_id'], r['before_sha256'], r['after_sha256']) != (pid, before, after) for r in records):
        raise ValueError('Stable change identity cannot change product, source or target between stages.')


def insert_event(c, event_id, change_id, pid, state, receipt_path, digest, before, after, metadata):
    c.execute('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?)', (
        event_id, change_id, pid, state, utc(), str(receipt_path.resolve()), digest, before, after, canonical(metadata)))


def ingest_confirmation(queue: Path, receipt_path: Path) -> dict:
    raw = receipt_path.read_text()
    r = receipt_summary(json.loads(raw))
    digest = sha(raw)
    stage_id = r['event_id'] + '::CONFIRMED'
    c = open_queue(queue, writable=True)
    try:
        c.execute('BEGIN IMMEDIATE')
        assert_change_identity(c, r['event_id'], r['product_id'], r['before'], r['after'])
        if existing_event(c, stage_id, digest):
            return {'state': 'EXISTING_CONFIRMATION_NOOP', 'eventId': stage_id}
        product = c.execute('SELECT * FROM products WHERE product_id=?', (r['product_id'],)).fetchone()
        if product is None or product['review_basis_sha256'] != r['before']:
            raise ValueError('Receipt before hash differs from original scope; explicit fresh-source rebase needed.')
        if product['completion_event']:
            raise ValueError('Existing confirmed product must not be overwritten by another event.')
        if product['pending_change_id'] not in (None, r['event_id']):
            raise ValueError('A different in-flight change must be resolved by targeted readback first.')
        insert_event(c, stage_id, r['event_id'], r['product_id'], CONFIRMED, receipt_path, digest, r['before'], r['after'],
                     {'receiptState': json.loads(raw)['state'], 'previouslyConfirmedNotFreshlyRechecked': True, 'previousQueueState': product['state']})
        c.execute('UPDATE products SET state=?,known_after_sha256=?,completion_event=?,pending_change_id=NULL WHERE product_id=?',
                  (CONFIRMED, r['after'], stage_id, r['product_id']))
        c.commit()
        return {'state': CONFIRMED, 'eventId': r['event_id'], 'productId': r['product_id']}
    finally:
        c.close()


def record_checkpoint(queue: Path, receipt_path: Path) -> dict:
    """Append supplied attempt evidence; unknown/inflight never re-enters a work batch."""
    raw = receipt_path.read_text()
    receipt = object_value(json.loads(raw), 'Attempt checkpoint')
    r = receipt_identity(receipt)
    state = receipt.get('state')
    if state not in PENDING_STATES:
        raise ValueError('Only explicit in-flight/unknown/readback-unknown checkpoints are accepted.')
    if object_value(receipt.get('checkedShop'), 'Checked shop').get('domain') != 'luxestyle.ch' or receipt.get('submittedFields') != ['id', 'descriptionHtml']:
        raise ValueError('Attempt must cover one description field in LuxeStyle.')
    if not is_text(receipt.get('attemptEvidenceReference')):
        raise ValueError('Attempt evidence is required; a draft is not an attempted write.')
    if state != 'INFLIGHT' and receipt.get('writeAttempted') is not True:
        raise ValueError('Unknown write requires an explicitly recorded attempted write.')
    if state == 'NATIVE_CONFIRMED_PUBLIC_UNKNOWN' and (receipt.get('nativeReadbackExact') is not True or receipt.get('nativeAfterSha256') != r['after']):
        raise ValueError('Native-confirmed checkpoint requires exact native target evidence.')
    stage_id = r['event_id'] + '::' + state
    digest = sha(raw)
    c = open_queue(queue, writable=True)
    try:
        c.execute('BEGIN IMMEDIATE')
        assert_change_identity(c, r['event_id'], r['product_id'], r['before'], r['after'])
        if existing_event(c, stage_id, digest):
            return {'state': 'EXISTING_CHECKPOINT_NOOP', 'eventId': stage_id}
        p = c.execute('SELECT * FROM products WHERE product_id=?', (r['product_id'],)).fetchone()
        if p is None or p['review_basis_sha256'] != r['before'] or p['completion_event']:
            raise ValueError('Checkpoint source out of scope or already completed.')
        if p['pending_change_id'] not in (None, r['event_id']):
            raise ValueError('Different pending attempt cannot replace existing uncertainty.')
        if p['state'] in (PENDING_STATES['WRITE_UNKNOWN'], PENDING_STATES['NATIVE_CONFIRMED_PUBLIC_UNKNOWN']) and state == 'INFLIGHT':
            raise ValueError('Unknown write cannot be reset to in-flight; target existing item for readback.')
        insert_event(c, stage_id, r['event_id'], r['product_id'], PENDING_STATES[state], receipt_path, digest, r['before'], r['after'],
                     {'receiptState': state, 'attemptEvidenceReference': receipt['attemptEvidenceReference'], 'previousQueueState': p['state']})
        c.execute('UPDATE products SET state=?,pending_change_id=? WHERE product_id=?', (PENDING_STATES[state], r['event_id'], r['product_id']))
        c.commit()
        return {'state': PENDING_STATES[state], 'eventId': stage_id}
    finally:
        c.close()


def rebase_source(queue: Path, receipt_path: Path) -> dict:
    """Record a supplied fresh native review basis, preserving immutable snapshot and history."""
    raw = receipt_path.read_text()
    receipt = object_value(json.loads(raw), 'Fresh-source rebase')
    native = object_value(receipt.get('nativeProduct'), 'Native product')
    pid, rebase_id = receipt.get('productId'), receipt.get('rebaseId')
    if not isinstance(pid, str) or not GID.fullmatch(pid) or native.get('id') != pid or native.get('status') != 'ACTIVE':
        raise ValueError('Fresh native active product identity required.')
    if not is_text(rebase_id) or not isinstance(native.get('descriptionHtml'), str) or not is_text(receipt.get('qualityReviewReference')):
        raise ValueError('Fresh description/review provenance required.')
    if object_value(receipt.get('checkedShop'), 'Checked shop').get('domain') != 'luxestyle.ch':
        raise ValueError('Wrong or unknown shop.')
    read_at = receipt.get('nativeReadAtUTC')
    if not isinstance(read_at, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})', read_at):
        raise ValueError('An explicit real timezone-aware source-read instant is required.')
    try:
        if datetime.fromisoformat(read_at.replace('Z', '+00:00')).tzinfo is None:
            raise ValueError('No timezone')
    except ValueError as error:
        raise ValueError('Invalid source-read calendar timestamp.') from error
    new_hash, digest, stage_id = sha(native['descriptionHtml']), sha(raw), rebase_id + '::SOURCE_REBASE'
    c = open_queue(queue, writable=True)
    try:
        c.execute('BEGIN IMMEDIATE')
        assert_change_identity(c, rebase_id, pid, receipt.get('previousReviewBasisSha256'), new_hash)
        if existing_event(c, stage_id, digest):
            return {'state': 'EXISTING_SOURCE_REBASE_NOOP', 'eventId': stage_id}
        p = c.execute('SELECT * FROM products WHERE product_id=?', (pid,)).fetchone()
        snapshot = c.execute("SELECT value FROM meta WHERE key='source_snapshot_sha256'").fetchone()[0]
        if p is None or p['completion_event'] or p['pending_change_id']:
            raise ValueError('Missing/completed/pending product cannot be rebased; preserve its state.')
        if receipt.get('sourceSnapshotSha256') != snapshot or receipt.get('previousReviewBasisSha256') != p['review_basis_sha256']:
            raise ValueError('Source lineage conflict; do not reset queue history.')
        if new_hash == p['review_basis_sha256']:
            return {'state': 'SOURCE_ALREADY_MATCHES_NOOP'}
        insert_event(c, stage_id, rebase_id, pid, 'FRESH_NATIVE_SOURCE_REBASE', receipt_path, digest, p['review_basis_sha256'], new_hash,
                     {'nativeReadAtUTC': read_at, 'qualityReviewReference': receipt['qualityReviewReference'], 'nativeCanonicalSha256': sha(canonical(native)), 'notAuthenticatedOrFreshlyFetchedByThisTool': True})
        c.execute('UPDATE products SET review_basis_sha256=?,source_rebase_event=?,state=? WHERE product_id=?',
                  (new_hash, stage_id, 'NEEDS_SUBSTANTIVE_TEXT_REVIEW', pid))
        c.commit()
        return {'state': 'FRESH_SOURCE_BASIS_RECORDED_REVIEW_REQUIRED', 'eventId': stage_id}
    finally:
        c.close()


def stats(queue: Path) -> dict:
    c = open_queue(queue)
    try:
        return {'version': VERSION, 'shop': 'luxestyle.ch', 'sourceRows': int(c.execute("SELECT value FROM meta WHERE key='source_rows'").fetchone()[0]),
                'states': {r[0]: r[1] for r in c.execute('SELECT state,count(*) FROM products GROUP BY state')},
                'events': c.execute('SELECT count(*) FROM events').fetchone()[0], 'ownApiOrShopWritesByThisTool': 0,
                'meaning': 'Worklist routes and previously confirmed external receipts, not new descriptions or current live facts.'}
    finally:
        c.close()


def next_batch(queue: Path, limit: int = 10, route_state: str | None = None) -> list:
    if not 1 <= limit <= 50:
        raise ValueError('Bounded read batch must be 1..50.')
    c = open_queue(queue)
    try:
        if route_state is not None:
            if route_state not in REVIEW_STATES:
                raise ValueError('Unknown worklist route.')
            return [dict(r) for r in c.execute('SELECT * FROM products WHERE state=? ORDER BY priority,line_number LIMIT ?', (route_state, limit))]
        return [dict(r) for r in c.execute('SELECT * FROM products WHERE state IN (?,?,?) ORDER BY priority,line_number LIMIT ?', (*sorted(REVIEW_STATES), limit))]
    finally:
        c.close()


def preflight(current: dict, draft: dict) -> dict:
    """Compare supplied fresh native data only. Never authorises or executes a write."""
    out = {'writeExecuted': False, 'automaticWriteAllowed': False, 'scope': ['descriptionHtml']}
    if not isinstance(current, dict) or not isinstance(draft, dict) or not isinstance(current.get('id'), str) or current.get('id') != draft.get('productId') or not isinstance(current.get('descriptionHtml'), str):
        return {**out, 'state': 'UNKNOWN_OR_WRONG_CURRENT_SOURCE'}
    if not GID.fullmatch(current['id']) or current.get('status') != 'ACTIVE':
        return {**out, 'state': 'NOT_CURRENT_ACTIVE_SCOPE'}
    after = draft.get('afterHtml')
    if not isinstance(after, str) or not after.strip():
        return {**out, 'state': 'DRAFT_MISSING'}
    if current['descriptionHtml'] == after:
        return {**out, 'state': 'ALREADY_APPLIED_NOOP'}
    if sha(current['descriptionHtml']) != draft.get('beforeSha256'):
        return {**out, 'state': 'SOURCE_CHANGED_REVIEW_NEW_DIFF'}
    if draft.get('basisNativeCanonicalSha256') != sha(canonical(current)):
        return {**out, 'state': 'OTHER_NATIVE_SOURCE_CHANGED_OR_UNBOUND'}
    if draft.get('qualityReviewed') is not True or not is_text(draft.get('qualityReviewReference')):
        return {**out, 'state': 'SOURCE_MATCHES_QUALITY_REVIEW_REQUIRED'}
    return {**out, 'state': 'EXACT_SOURCE_MATCH_DESCRIPTION_ONLY_REVIEW_RECORDED', 'afterSha256': sha(after),
            'limits': ['Caller must independently authenticate review and freshness.', 'No Shopify compare-and-swap guarantee; write serially and read back.', 'Only exact field owner authorisation applies.']}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    s = p.add_subparsers(dest='command', required=True)
    i = s.add_parser('init'); i.add_argument('--audit-dir', type=Path, required=True); i.add_argument('--output', type=Path, required=True); i.add_argument('--reuse-recorded-source-validation', action='store_true')
    for name in ('stats', 'next', 'ingest-confirmation', 'record-checkpoint', 'rebase-source'):
        x = s.add_parser(name); x.add_argument('--queue', type=Path, required=True)
        if name == 'next':
            x.add_argument('--limit', type=int, default=10)
            x.add_argument('--route', choices=['NEEDS_SOURCE_OR_IDENTITY_REVIEW', 'NEEDS_SUBSTANTIVE_TEXT_REVIEW', 'NEEDS_QUALITY_REVIEW'])
        if name in ('ingest-confirmation', 'record-checkpoint', 'rebase-source'): x.add_argument('--receipt', type=Path, required=True)
    a = p.parse_args()
    if a.command == 'init': initialise(a.audit_dir, a.output, reuse_recorded_source_validation=a.reuse_recorded_source_validation); result = stats(a.output)
    elif a.command == 'stats': result = stats(a.queue)
    elif a.command == 'next': result = next_batch(a.queue, a.limit, a.route)
    elif a.command == 'ingest-confirmation': result = ingest_confirmation(a.queue, a.receipt)
    elif a.command == 'record-checkpoint': result = record_checkpoint(a.queue, a.receipt)
    else: result = rebase_source(a.queue, a.receipt)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
