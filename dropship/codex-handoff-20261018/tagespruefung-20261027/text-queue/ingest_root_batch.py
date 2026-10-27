"""Split verified root receipts without changing their fields; local queue only."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from text_queue import ingest_confirmation, open_queue, receipt_summary, stats


def ingest_root_batch(queue: Path, source: Path, receipt_directory: Path, proof_directory: Path):
    raw = source.read_bytes()
    batch = json.loads(raw)
    if not isinstance(batch, dict) or batch.get('ownerScope') != 'all product descriptions only':
        raise ValueError('Unsupported batch scope.')
    rows = batch.get('records')
    if not isinstance(rows, list) or not 1 <= len(rows) <= 50:
        raise ValueError('Explicit bounded receipt batch required, not an empty/missing result.')
    count = len(rows)
    if any(type(batch.get(k)) is not int or batch[k] != count for k in ('writes', 'confirmedNative', 'confirmedNativeAndPublic')):
        raise ValueError('Root counters do not match the explicit confirmed receipt count.')
    # All supplied proof and source lineage must match before appending any item.
    proofs = [receipt_summary(r) for r in rows]
    if len({r['event_id'] for r in proofs}) != count or len({r['product_id'] for r in proofs}) != count:
        raise ValueError('Duplicate event/product identity in one root batch.')
    c = open_queue(queue)
    try:
        for r in proofs:
            p = c.execute('SELECT * FROM products WHERE product_id=?', (r['product_id'],)).fetchone()
            if p is None or p['review_basis_sha256'] != r['before']:
                raise ValueError('Root before-source differs; explicit fresh-source rebase required, never reset.')
            if not re.fullmatch(r'[A-Za-z0-9_-]+', r['event_id']):
                raise ValueError('Unsupported receipt filename identity.')
    finally:
        c.close()
    receipt_directory.mkdir(parents=True, exist_ok=True)
    proof_directory.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(raw).hexdigest()
    result = {'sourcePath': str(source.resolve()), 'sourceSha256': digest, 'sourceBytes': len(raw),
              'recordCount': count, 'conversion': 'Original record objects split exactly. No state, identity, submittedFields or checkedShop flags synthesised.',
              'events': [], 'ownShopOrApiWrites': 0}
    for index, (record, proof) in enumerate(zip(rows, proofs)):
        path = receipt_directory / (proof['event_id'] + '.json')
        content = json.dumps(record, ensure_ascii=False, indent=2) + '\n'
        if path.exists() and path.read_text() != content:
            raise ValueError('Existing receipt has different content; preserve it, do not blindly repeat.')
        if not path.exists():
            path.write_text(content)
        if json.loads(path.read_text()) != record:
            raise ValueError('Receipt object changed during split.')
        ingest = ingest_confirmation(queue, path)
        result['events'].append({'sourceIndex': index, 'changeId': proof['event_id'], 'stateAsRecorded': record['state'],
                                 'receiptPath': str(path.resolve()), 'receiptSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                                 'queueResult': ingest})
    proof_path = proof_directory / ('ROOT-BATCH-SPLIT-PROOF-' + digest[:12] + '.json')
    # Re-running an already confirmed batch is a no-op in the worklist; preserve
    # the first append proof, rather than replacing it with no-op outcomes.
    if not proof_path.exists():
        proof_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return {'splitProof': str(proof_path.resolve()), 'worklist': stats(queue), 'results': result['events']}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--queue', required=True, type=Path)
    p.add_argument('--batch', required=True, type=Path)
    p.add_argument('--receipt-directory', required=True, type=Path)
    p.add_argument('--proof-directory', required=True, type=Path)
    a = p.parse_args()
    print(json.dumps(ingest_root_batch(a.queue, a.batch, a.receipt_directory, a.proof_directory), ensure_ascii=False, indent=2))
