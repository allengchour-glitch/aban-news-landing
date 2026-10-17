import fs from 'node:fs';
import { createHash } from 'node:crypto';

export function reviewKey(productId, cjPid, review) {
  const sourceId=review.id ?? review.commentId;
  const source=sourceId !== undefined && sourceId !== null && String(sourceId).trim() !== ''
    ? [String(productId),String(cjPid),'source-id',String(sourceId)]
    : [String(productId),String(cjPid),'content',String(review.commentUser ?? ''),
      String(review.commentDate ?? ''),Number(review.score),String(review.comment ?? '')];
  return createHash('sha256').update(JSON.stringify(source)).digest('hex');
}

export function loadReviewStates(file) {
  const states=new Map();
  if (!fs.existsSync(file)) return states;
  for (const line of fs.readFileSync(file,'utf8').split('\n').filter(Boolean)) {
    let entry;
    try { entry=JSON.parse(line); } catch { throw new Error('CJ_REVIEW_LEDGER: ungültige Zeile, Abgleich erforderlich'); }
    if (typeof entry.key!=='string' || !['sending','sent','failed','uncertain'].includes(entry.status)) {
      throw new Error('CJ_REVIEW_LEDGER: ungültiger Status, Abgleich erforderlich');
    }
    states.set(entry.key,entry.status);
  }
  return states;
}

export function recordReviewState(file, states, key, status) {
  const fd=fs.openSync(file,'a',0o600);
  try {
    fs.writeSync(fd,JSON.stringify({key,status,updated_at:new Date().toISOString()})+'\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  states.set(key,status);
}
