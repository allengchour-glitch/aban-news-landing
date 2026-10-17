import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { reviewKey } from './lib/cj_review_ledger.mjs';

// Every process gets a disposable working directory and a fetch replacement.
// Credentials and token caches are fake; no parent credentials are inherited.
const COMMENTS = [
  { id: 'comment-one', score: 5, comment: 'The bag is beautifully made.', commentUser: 'Buyer One', commentDate: '2026-10-01' },
  { id: 'comment-two', score: 4, comment: 'Useful bag with a nice finish.', commentUser: 'Buyer Two', commentDate: '2026-10-02' }
];
const PRODUCT_ID = '101';
const CJ_PID = 'fake-cj-product';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-cj-checkpoint-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'automation'));
  fs.mkdirSync(path.join(root, 'dropship'));
  fs.cpSync(new URL('lib/', import.meta.url), path.join(root, 'automation/lib'), { recursive: true });
  const script = path.join(root, 'automation/cj_reviews_import.mjs');
  fs.copyFileSync(new URL('cj_reviews_import.mjs', import.meta.url), script);
  fs.writeFileSync(path.join(root, 'fake-token.json'), JSON.stringify({ accessToken: 'fake-cj-token', exp: Date.now() + 86400000 }));
  return { root, script };
}

function run(f, config = {}) {
  const preload = path.join(f.root, 'fake.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';
    console.log=(...args)=>fs.writeSync(1,args.join(' ')+'\\n');
    console.error=(...args)=>fs.writeSync(2,args.join(' ')+'\\n');
    globalThis.setTimeout=(fn)=>{fn();return 0;};
    const config=${JSON.stringify(config)};
    const comments=config.comments || ${JSON.stringify(COMMENTS)};
    let posts=0;
    const response=(status,body)=>({ok:status>=200&&status<300,status,
      json:async()=>body,text:async()=>JSON.stringify(body)});
    globalThis.fetch=async(input,opts={})=>{
      const url=new URL(String(input));
      fs.appendFileSync('api-calls.jsonl',JSON.stringify({host:url.hostname,path:url.pathname})+'\\n');
      if(url.hostname==='test.myshopify.com' && url.pathname.endsWith('/graphql.json')) {
        const query=JSON.parse(opts.body).query;
        return response(200,{data:query.includes('products(')?{products:{edges:[{node:{
          id:'gid://shopify/Product/${PRODUCT_ID}',handle:'test-bag',title:'Test bag',
          variants:{edges:[{node:{sku:'CJ-TEST-SKU'}}]}
        }}],pageInfo:{hasNextPage:false}}}:{shop:{name:'Test shop'}}});
      }
      if(url.hostname==='developers.cjdropshipping.com' && url.pathname.endsWith('/product/query')) {
        return response(200,config.queryResponse || {result:true,data:{pid:'${CJ_PID}'}});
      }
      if(url.hostname==='developers.cjdropshipping.com' && url.pathname.endsWith('/product/productComments')) {
        return response(200,config.commentsResponse || {result:true,data:{list:comments}});
      }
      if(url.hostname==='judge.me' && url.pathname==='/api/v1/reviews' && opts.method!=='POST') {
        // Abgleich: Judge.me bestaetigt einen POST mit HTTP 201 OHNE Review-ID, der Importer
        // liest darum die neuesten Bewertungen nach. Standardmaessig liegt dort, was gepostet
        // wurde; config.shopReviews deckt den Fall ab, dass sie NICHT angekommen ist.
        if(config.shopReviews!==undefined) return response(200,{reviews:config.shopReviews});
        const gepostet=fs.existsSync('judge-posts.jsonl')
          ? fs.readFileSync('judge-posts.jsonl','utf8').trim().split('\\n').filter(Boolean).map(JSON.parse) : [];
        return response(200,{reviews:gepostet.map(p=>({product_external_id:'${PRODUCT_ID}',body:p.body}))});
      }
      if(url.hostname==='judge.me' && url.pathname==='/api/v1/reviews' && opts.method==='POST') {
        const body=JSON.parse(opts.body);
        const ledger=fs.readFileSync('dropship/cj_review_items.jsonl','utf8').trim().split('\\n').map(JSON.parse);
        if(ledger.at(-1)?.status!=='sending')throw new Error('MISSING DURABLE SENDING CHECKPOINT');
        fs.appendFileSync('judge-posts.jsonl',JSON.stringify({body:body.body,name:body.name})+'\\n');
        const outcome=config.outcomes?.[posts++] || {status:201,body:{review:{id:123}}};
        if(outcome.networkError)throw new TypeError('fake-private-token connection reset');
        return response(outcome.status,outcome.body);
      }
      fs.appendFileSync('unexpected-network',url.origin+url.pathname+'\\n');
      throw new Error('UNEXPECTED NETWORK REQUEST');
    };`);
  const result = spawnSync(process.execPath, ['--import', preload, f.script], {
    cwd: f.root, encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, CJ_EMAIL: 'fake@example.invalid', CJ_API_KEY: 'fake-cj-key',
      JUDGEME_PRIVATE_TOKEN: 'fake-private-token', SHOPIFY_SHOP: 'test.myshopify.com',
      SHOPIFY_ADMIN_TOKEN: 'fake-shopify-token', LIMIT: '1', SCAN: '1', PER: '2',
      CJ_TOKEN_CACHE: path.join(f.root, 'fake-token.json') }
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(fs.existsSync(path.join(f.root, 'unexpected-network')), false, result.stdout + result.stderr);
  return result;
}

function lines(f, file) {
  const location = path.join(f.root, file);
  return fs.existsSync(location) ? fs.readFileSync(location, 'utf8').trim().split('\n').filter(Boolean) : [];
}

const posts = f => lines(f, 'judge-posts.jsonl').map(JSON.parse);
const states = f => new Map(lines(f, 'dropship/cj_review_items.jsonl').map(line => {
  const entry = JSON.parse(line);
  return [entry.key, entry.status];
}));
const key = comment => reviewKey(PRODUCT_ID, CJ_PID, comment);
const success = { status: 201, body: { review: { id: 123 } } };
const rejected = { status: 422, body: { error: 'Invalid review' } };

test('CJ-Teilerfolg wird vor Retry gespeichert; nur die fehlende Bewertung wird erneut gesendet', t => {
  const f = fixture(t);
  const first = run(f, { outcomes: [success, rejected] });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  assert.deepEqual(posts(f).map(post => post.body), COMMENTS.map(comment => comment.comment));
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.equal(states(f).get(key(COMMENTS[1])), 'failed');
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
  const second = run(f);
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.deepEqual(posts(f).map(post => post.body), [COMMENTS[0].comment, COMMENTS[1].comment, COMMENTS[1].comment]);
  assert.deepEqual([...states(f).values()], ['sent', 'sent']);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
});

test('Alle abgelehnten Bewertungen lassen das Produkt unerledigt', t => {
  const f = fixture(t);
  const result = run(f, { outcomes: [rejected, rejected] });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(posts(f).length, 2);
  assert.deepEqual([...states(f).values()], ['failed', 'failed']);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
});

test('Malformed CJ-Erfolg ohne data darf weder leeres noch erledigtes Produkt erzeugen', async t => {
  for (const stage of ['queryResponse', 'commentsResponse']) {
    await t.test(stage, t => {
      const f = fixture(t);
      const result = run(f, { [stage]: { result: true } });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /CJ_DATA/);
      assert.deepEqual(posts(f), []);
      assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
      assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
    });
  }
});

test('Unklarer Netzwerkfehler bleibt uncertain und löst im nächsten Lauf keinen erneuten POST aus', t => {
  const f = fixture(t);
  const first = run(f, { comments: [COMMENTS[0]], outcomes: [{ networkError: true }] });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  assert.equal(posts(f).length, 1);
  assert.doesNotMatch(first.stdout + first.stderr, /fake-private-token/);
  const second = run(f, { comments: [COMMENTS[0]] });
  assert.equal(second.status, 1, second.stdout + second.stderr);
  assert.equal(posts(f).length, 1);
  assert.match(second.stderr, /CJ_REVIEW_UNCERTAIN/);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
});

test('HTTP200 mit explizitem Fehlerbody wird als failed gespeichert und nicht als erledigt gezählt', async t => {
  for (const body of [{ error: 'Invalid product' }, { errors: ['Invalid product'] }, { success: false }, { result: false }]) {
    await t.test(JSON.stringify(body), t => {
      const f = fixture(t);
      const result = run(f, { comments: [COMMENTS[0]], outcomes: [{ status: 200, body }] });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.equal(states(f).get(key(COMMENTS[0])), 'failed');
      assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
    });
  }
});

// Judge.me bestaetigt einen erfolgreichen POST mit HTTP 201 und OHNE Review-ID im Body
// (live gemessen 2026-10-17: die Bewertungen lagen danach im Shop, der Importer meldete „0").
// Darum liest der Importer nach — und nur was er im Shop findet, zaehlt als gesendet.
test('HTTP201 ohne Review-ID zählt als gesendet, wenn die Bewertung im Shop liegt', t => {
  const f = fixture(t);
  const first = run(f, { comments: [COMMENTS[0]], outcomes: [{ status: 201, body: {} }] });
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
  assert.match(first.stdout, /1 echte Reviews/);
  const second = run(f, { comments: [COMMENTS[0]] });
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.equal(posts(f).length, 1, 'kein zweiter POST derselben Bewertung');
});

// GEGENPROBE: findet der Abgleich die Bewertung NICHT, bleibt es beim alten, sicheren Verhalten.
test('HTTP201 ohne Review-ID bleibt uncertain, wenn der Shop sie nicht hat, und wird nicht erneut gesendet', t => {
  const f = fixture(t);
  const first = run(f, { comments: [COMMENTS[0]], outcomes: [{ status: 200, body: {} }], shopReviews: [] });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  const second = run(f, { comments: [COMMENTS[0]], shopReviews: [] });
  assert.equal(second.status, 1, second.stdout + second.stderr);
  assert.equal(posts(f).length, 1);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
});

// GEGENPROBE: eine Bewertung eines ANDEREN Produkts darf den Abgleich nicht bestaetigen.
test('Abgleich zählt nur Bewertungen desselben Produkts', t => {
  const f = fixture(t);
  const r = run(f, { comments: [COMMENTS[0]], outcomes: [{ status: 201, body: {} }],
    shopReviews: [{ product_external_id: '999', body: COMMENTS[0].comment }] });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
});

test('Stabile CJ-Kommentar-ID verhindert Doppelimport nach nachträglicher Textänderung', t => {
  const f = fixture(t);
  const first = run(f, { outcomes: [success, rejected] });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  const changed = { ...COMMENTS[0], comment: 'Updated wording for the same customer review.',
    commentUser: 'Updated buyer name', commentDate: '2026-10-03', score: 4 };
  const second = run(f, { comments: [changed, COMMENTS[1]] });
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.deepEqual(posts(f).map(post => post.body), [COMMENTS[0].comment, COMMENTS[1].comment, COMMENTS[1].comment]);
  assert.equal(states(f).size, 2);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
});

test('commentId ist ebenfalls stabil; Produkt und CJ-Quelle bleiben getrennt', () => {
  const review = { ...COMMENTS[0], id: undefined, commentId: 'source-comment-id' };
  const changed = { ...review, comment: 'The buyer corrected the review wording.', commentUser: 'New display name', score: 4 };
  assert.equal(key(review), key(changed));
  assert.notEqual(key(review), reviewKey('another-product', CJ_PID, review));
  assert.notEqual(key(review), reviewKey(PRODUCT_ID, 'another-cj-source', review));
});

test('Ohne CJ-Kommentar-ID dedupliziert derselbe Inhalt; verschiedene Texte bleiben verschiedene Bewertungen', () => {
  const review = { ...COMMENTS[0] };
  delete review.id;
  assert.equal(key(review), key({ ...review }));
  assert.notEqual(key(review), key({ ...review, comment: 'Another distinct review of the product.' }));
  assert.notEqual(key(review), key({ ...review, commentUser: 'Another buyer' }));
});

test('Vorhandene Review-Sperre verhindert API-Aufrufe und POSTs vor dem Lesen des Ledgers', t => {
  const f = fixture(t);
  const lock = path.join(f.root, 'dropship/cj_review_items.jsonl.lock');
  fs.writeFileSync(lock, 'another-process');
  fs.writeFileSync(path.join(f.root, 'dropship/cj_review_items.jsonl'), 'malformed ledger must not be read\n');
  const result = run(f);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /CJ_REVIEW_LOCK/);
  assert.doesNotMatch(result.stderr, /CJ_REVIEW_LEDGER/);
  assert.deepEqual(lines(f, 'api-calls.jsonl'), []);
  assert.deepEqual(posts(f), []);
  assert.equal(fs.readFileSync(lock, 'utf8'), 'another-process');
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
});
