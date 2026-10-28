import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as ledger from './lib/cj_review_ledger.mjs';
const { reviewKey } = ledger;

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
    globalThis.setTimeout=(fn,ms)=>{fs.appendFileSync('waits.log',String(ms)+'\\n');fn();return 0;};
    const config=${JSON.stringify(config)};
    const comments=config.comments || ${JSON.stringify(COMMENTS)};
    let posts=0;
    let gemCalls=0;
    let widgetCalls=0;
    const response=(status,body,headers={})=>({ok:status>=200&&status<300,status,
      headers:{get:k=>headers[String(k).toLowerCase()] ?? null},
      json:async()=>body,text:async()=>JSON.stringify(body)});
    globalThis.fetch=async(input,opts={})=>{
      const url=new URL(String(input));
      fs.appendFileSync('api-calls.jsonl',JSON.stringify({host:url.hostname,path:url.pathname,signal:opts.signal instanceof AbortSignal})+'\\n');
      if(url.hostname==='test.myshopify.com' && url.pathname.endsWith('/graphql.json')) {
        const query=JSON.parse(opts.body).query;
        const produkte=config.products || [{id:'${PRODUCT_ID}',handle:'test-bag'}];
        return response(200,{data:query.includes('products(')?{products:{edges:produkte.map(x=>({node:{
          id:'gid://shopify/Product/'+x.id,handle:x.handle,title:'Test bag',
          variants:{edges:[{node:{sku:'CJ-TEST-SKU'}}]}
        }})),pageInfo:{hasNextPage:false}}}:{shop:{name:'Test shop'}}});
      }
      if(url.hostname==='developers.cjdropshipping.com' && url.pathname.endsWith('/product/query')) {
        return response(200,config.queryResponse || {result:true,data:{pid:'${CJ_PID}'}});
      }
      if(url.hostname==='developers.cjdropshipping.com' && url.pathname.endsWith('/product/productComments')) {
        return response(200,config.commentsResponse || {result:true,data:{list:comments}});
      }
      if(url.hostname==='judge.me' && url.pathname==='/reviews/reviews_for_widget') {
        // Ausfallarten des Shop-Abgleichs: HTTP-Fehler, Netzfehler, Antwort ohne Objekt.
        if(config.widgetNetz) throw new TypeError('widget connection reset');
        if(config.widgetStatus) return response(config.widgetStatus,{error:'widget kaputt'});
        if(config.widgetNull) return response(200,null);
        // widgetAb: die ersten N Aufrufe normal, danach HTTP 429 (Drosselung setzt mitten im Lauf ein).
        if(config.widgetAb!==undefined && widgetCalls++>=config.widgetAb) return response(429,{error:'Too Many Requests'});
        // Die oeffentliche Widget-Antwort filtert wirklich nach Produkt (nachgemessen 18.10.).
        const pid=url.searchParams.get('product_id');
        // widgetStatusPid: Ausfall nur fuer bestimmte Produkte ({'101':500}).
        if((config.widgetStatusPid||{})[pid]) return response(config.widgetStatusPid[pid],{error:'widget kaputt'});
        const quelle=config.shopReviews!==undefined ? config.shopReviews
          : (fs.existsSync('judge-posts.jsonl')
              ? fs.readFileSync('judge-posts.jsonl','utf8').trim().split('\\n').filter(Boolean).map(JSON.parse)
                  .filter(p=>p.angenommen!==false).map(p=>({product_external_id:'${PRODUCT_ID}',body:p.body}))
              : []);
        const eigene=quelle.filter(r=>String(r.product_external_id)===String(pid));
        return response(200,{number_of_reviews:eigene.length,
          reviews:eigene.map(r=>({body_html:'<p>'+r.body+'</p>',rating:5}))});
      }
      if(url.hostname==='judge.me' && url.pathname==='/api/v1/reviews' && opts.method!=='POST') {
        // Abgleich: Judge.me bestaetigt einen POST mit HTTP 201 OHNE Review-ID, der Importer
        // liest darum die neuesten Bewertungen nach. Standardmaessig liegt dort, was gepostet
        // wurde; config.shopReviews deckt den Fall ab, dass sie NICHT angekommen ist.
        if(config.shopReviews!==undefined) return response(200,{reviews:config.shopReviews});
        // Nur ein ANGENOMMENER POST wird eine Bewertung im Shop. Ein mit 422 abgelehnter
        // Text liegt dort nicht — sonst wuerde der Doppel-Schutz einen echten Nachholversuch
        // verhindern (beim Bauen des Schutzes am 18.10. genau so aufgefallen).
        const gepostet=fs.existsSync('judge-posts.jsonl')
          ? fs.readFileSync('judge-posts.jsonl','utf8').trim().split('\\n').filter(Boolean).map(JSON.parse) : [];
        return response(200,{reviews:gepostet.filter(p=>p.angenommen!==false)
          .map(p=>({product_external_id:'${PRODUCT_ID}',body:p.body}))});
      }
      if(url.hostname==='judge.me' && url.pathname==='/api/v1/reviews' && opts.method==='POST') {
        const body=JSON.parse(opts.body);
        const ledger=fs.readFileSync('dropship/cj_review_items.jsonl','utf8').trim().split('\\n').map(JSON.parse);
        if(ledger.at(-1)?.status!=='sending')throw new Error('MISSING DURABLE SENDING CHECKPOINT');
        const outcome=config.outcomes?.[posts++] || {status:201,body:{review:{id:123}}};
        const angenommen=!outcome.networkError && outcome.status>=200 && outcome.status<300;
        fs.appendFileSync('judge-posts.jsonl',JSON.stringify({body:body.body,name:body.name,rating:body.rating,angenommen})+'\\n');
        if(outcome.networkError)throw new TypeError('fake-private-token connection reset');
        return response(outcome.status,outcome.body,outcome.headers);
      }
      if(url.hostname==='generativelanguage.googleapis.com') {
        // Gemini-Attrappe: config.gemini = Liste von Antworten je Aufruf ({arr:[...]} oder {status,body}); danach HTTP 500.
        const prompt=JSON.parse(opts.body).contents[0].parts[0].text;
        fs.appendFileSync('gemini-calls.jsonl',JSON.stringify({texte:JSON.parse(prompt.slice(prompt.lastIndexOf('\\n')+1))})+'\\n');
        const a=(config.gemini||[])[gemCalls++] || {status:500,body:{error:{message:'Gemini kaputt'}}};
        if(a.arr!==undefined) return response(200,{candidates:[{content:{parts:[{text:JSON.stringify(a.arr)}]}}]});
        return response(a.status,a.body);
      }
      if(url.hostname==='api.groq.com') {
        // Groq-Attrappe: config.groq = {Schluessel: {arr:[...]} oder {status,body}}; jeder andere Schluessel -> HTTP 500.
        const token=String(opts.headers?.Authorization||'').replace('Bearer ','');
        const req=JSON.parse(opts.body);
        fs.appendFileSync('groq-calls.jsonl',JSON.stringify({token,modell:req.model})+'\\n');
        const a=(config.groq||{})[token] || {status:500,body:{error:{message:'Groq kaputt'}}};
        if(a.arr!==undefined) return response(200,{choices:[{message:{content:JSON.stringify(a.arr)}}]});
        return response(a.status,a.body);
      }
      fs.appendFileSync('unexpected-network',url.origin+url.pathname+'\\n');
      throw new Error('UNEXPECTED NETWORK REQUEST');
    };`);
  const result = spawnSync(process.execPath, ['--import', preload, f.script], {
    cwd: f.root, encoding: 'utf8', timeout: 10000,
    // DRY_RUN=0: seit der Korrektur ist ohne diese Zeile Trockenlauf. ALLOW_ORIGINAL=1: ohne Übersetzungsdienst bliebe jedes Produkt
    // liegen; diese Tests prüfen Ledger und Checkpoints mit den Originaltexten. config.env überschreibt (undefined = Variable fehlt).
    env: { PATH: process.env.PATH, CJ_EMAIL: 'fake@example.invalid', CJ_API_KEY: 'fake-cj-key',
      JUDGEME_PRIVATE_TOKEN: 'fake-private-token', SHOPIFY_SHOP: 'test.myshopify.com',
      SHOPIFY_ADMIN_TOKEN: 'fake-shopify-token', LIMIT: '1', SCAN: '1', PER: '2',
      CJ_TOKEN_CACHE: path.join(f.root, 'fake-token.json'), DRY_RUN: '0', ALLOW_ORIGINAL: '1', ...config.env }
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

test('Text liegt beim Produkt schon im Shop → wird nicht erneut gesendet', t => {
  // Der Schluessel aendert sich, wenn CJ-Daten sich aendern; der Shop ist die Wahrheit.
  const f = fixture(t);
  const r = run(f, { shopReviews: [{ product_external_id: PRODUCT_ID, body: COMMENTS[0].comment }] });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(posts(f).map(post => post.body), [COMMENTS[1].comment]);
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.equal(states(f).get(key(COMMENTS[1])), 'sent');
});

test('GEGENPROBE: derselbe Text bei einem ANDEREN Produkt sperrt nicht', t => {
  const f = fixture(t);
  const r = run(f, { shopReviews: [{ product_external_id: '999', body: COMMENTS[0].comment }] });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(posts(f).map(post => post.body), COMMENTS.map(c => c.comment));
});

test('Ein nachträglich geänderter Kommentar gilt als neue Bewertung (bewusster Preis)', t => {
  // Vorher deckte die Produkt-Kommentar-ID diesen Fall ab — zum Preis, dass alle Kommentare
  // EINES Produkts denselben Schluessel hatten (gemessen 18.10., siehe reviewKey). Der
  // haeufige Fall ist jetzt durch den Text-Abgleich im Shop gedeckt; ein wirklich geaenderter
  // Text ist ein anderer Text und darf einmal nachrutschen.
  const f = fixture(t);
  const first = run(f, { outcomes: [success, rejected] });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  const changed = { ...COMMENTS[0], comment: 'Updated wording for the same customer review.',
    commentUser: 'Updated buyer name', commentDate: '2026-10-03', score: 4 };
  const second = run(f, { comments: [changed, COMMENTS[1]] });
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.deepEqual(posts(f).map(post => post.body), [COMMENTS[0].comment, COMMENTS[1].comment, changed.comment, COMMENTS[1].comment]);
  assert.equal(states(f).size, 3);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
});

test('Gleiche commentId, anderer Text = andere Bewertung (CJ vergibt EINE ID je Produkt)', () => {
  // Gemessen 2026-10-18 an pid 1616334321445515264: alle sieben Kommentare tragen
  // commentId 1616344932124471300. Wer die Kennung allein nimmt, importiert je Produkt
  // genau eine Bewertung und zaehlt die uebrigen als Fehler.
  const review = { ...COMMENTS[0], id: undefined, commentId: 'source-comment-id' };
  const anderer = { ...review, comment: 'Zweiter Kaeufer, derselbe Produkt-Kommentarblock.', commentUser: 'P***s', score: 4 };
  assert.notEqual(key(review), key(anderer));
  // Gegenprobe: derselbe Kommentar ergibt denselben Schluessel — Idempotenz bleibt.
  assert.equal(key(review), key({ ...review }));
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

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Funde der Prüfung vom 28.10.2026 (cjrev_funde.json): je Fund Fehlerfall UND Normalfall.
// Alle Tests laufen mit Attrappen; nichts spricht mit Shopify, Judge.me, CJ oder einem Übersetzungsdienst.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const ledgerZeilen = f => lines(f, 'dropship/cj_review_items.jsonl').map(JSON.parse);
const aufrufe = (f, host, pfad) => lines(f, 'api-calls.jsonl').map(JSON.parse).filter(a => a.host === host && (!pfad || a.path.endsWith(pfad)));
const wartezeiten = f => lines(f, 'waits.log').map(Number);
const imShop = (...texte) => texte.map(body => ({ product_external_id: PRODUCT_ID, body }));
// Zwei deutsche Fassungen der Kommentare; GEM2 formuliert anders (die Übersetzung ist nicht deterministisch).
const GEM = { arr: ['Die Tasche ist wunderschön verarbeitet.', 'Praktische Tasche mit schönem Finish.'] };
const GEM2 = { arr: ['Eine sehr schön gemachte Tasche.', 'Nützliche Tasche, sauber verarbeitet.'] };
const MIT_UEBERSETZUNG = { GEMINI_API_KEY: 'fake-gemini', ALLOW_ORIGINAL: undefined };
const lebt = (f, r) => r.stdout + r.stderr + posts(f).map(p => p.body).join('|');

// ── Fund 1: Shop-Abgleich war fail-open ──
test('Fund 1: Shop-Abgleich nicht lesbar (HTTP 429/500, Netzfehler, leere Antwort) → NICHTS gesendet, Exit 1, kein Dauerstau', async t => {
  const faelle = [['HTTP 429', { widgetStatus: 429 }], ['HTTP 500', { widgetStatus: 500 }],
    ['Netzfehler', { widgetNetz: true }], ['Antwort null', { widgetNull: true }]];
  for (const [name, ausfall] of faelle) {
    await t.test(name, t => {
      const f = fixture(t);
      // Szenario des Fundes: beide Bewertungen liegen schon im Shop, das Ledger kennt sie nicht (Schlüssel fehlt).
      const shop = imShop(COMMENTS[0].comment, COMMENTS[1].comment);
      const r = run(f, { ...ausfall, shopReviews: shop });
      assert.equal(r.status, 1, lebt(f, r));
      assert.deepEqual(posts(f), [], 'unbekannt ist nicht „nicht im Shop": nichts senden');
      assert.match(r.stderr, /CJ_ABGLEICH_FEHLT/);
      assert.equal(states(f).size, 0, 'kein „uncertain" für etwas, das nie gesendet wurde (es würde die Bewertung dauerhaft sperren)');
      assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
      assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
      // Nächster Lauf, Shop wieder lesbar: die Bewertungen werden als vorhanden erkannt, weiterhin ohne POST.
      const zwei = run(f, { shopReviews: shop });
      assert.equal(zwei.status, 0, lebt(f, zwei));
      assert.deepEqual(posts(f), []);
      assert.deepEqual([...states(f).values()], ['sent', 'sent']);
      assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
    });
  }
});

test('Fund 1 (Gegenprobe): Shop lesbar und leer → beide Bewertungen werden gesendet', t => {
  const f = fixture(t);
  const r = run(f, { shopReviews: [] });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), COMMENTS.map(c => c.comment));
  assert.deepEqual([...states(f).values()], ['sent', 'sent']);
});

// ── Fund 2: Übersetzung fällt aus ──
test('Fund 2: Übersetzung fällt aus → Produkt wird NICHT gesendet (kein sent, kein done), Exit 1; der nächste Lauf holt es nach', t => {
  const f = fixture(t);
  const eins = run(f, { env: MIT_UEBERSETZUNG, gemini: [] });     // Gemini antwortet HTTP 500
  assert.equal(eins.status, 1, lebt(f, eins));
  assert.deepEqual(posts(f), [], 'englische Originaltexte dürfen nicht live gehen');
  assert.equal(states(f).size, 0);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
  assert.match(eins.stderr, /Übersetzung fehlt/);
  const zwei = run(f, { env: MIT_UEBERSETZUNG, gemini: [GEM] });
  assert.equal(zwei.status, 0, lebt(f, zwei));
  assert.deepEqual(posts(f).map(p => p.body), GEM.arr);
  assert.deepEqual([...states(f).values()], ['sent', 'sent']);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
});

test('Fund 2: ohne Übersetzungsschlüssel und ohne ALLOW_ORIGINAL=1 wird nichts gesendet; MIT ALLOW_ORIGINAL=1 geht das bewusste Original', t => {
  const f = fixture(t);
  const ohne = run(f, { env: { ALLOW_ORIGINAL: undefined } });
  assert.equal(ohne.status, 1, lebt(f, ohne));
  assert.deepEqual(posts(f), []);
  assert.match(ohne.stderr, /kein Schlüssel gesetzt/);
  // Die Logzeile sagt die Wahrheit: nichts Unübersetztes geht hinaus (früher stand dort «nutze Originalsprache»).
  assert.doesNotMatch(ohne.stderr, /nutze Originalsprache/);
  assert.match(ohne.stderr, /bleiben liegen/);
  const bewusst = run(f, { env: { ALLOW_ORIGINAL: '1' } });
  assert.equal(bewusst.status, 0, lebt(f, bewusst));
  assert.match(bewusst.stderr, /sende Originalsprache \(ALLOW_ORIGINAL=1\)/);
  assert.deepEqual(posts(f).map(p => p.body), COMMENTS.map(c => c.comment));
});

test('Fund 2 (Gegenprobe): ein schon deutscher Kommentar braucht bei Ausfall keine Übersetzung; ein englischer neben ihm hält das Produkt zurück', t => {
  const deutsch = [{ ...COMMENTS[0], comment: 'Sehr gute Qualität und schnell geliefert, ich bin zufrieden.' },
    { ...COMMENTS[1], comment: 'Die Tasche ist schön und passt auch gut zu meinem Mantel.' }];
  const f = fixture(t);
  const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [], comments: deutsch });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), deutsch.map(c => c.comment));
  const g = fixture(t);
  const gemischt = run(g, { env: MIT_UEBERSETZUNG, gemini: [], comments: [deutsch[0], COMMENTS[1]] });
  assert.equal(gemischt.status, 1, lebt(g, gemischt));
  assert.deepEqual(posts(g), []);
});

test('Fund 2: ein leerer Eintrag in der Übersetzung gilt als „nicht übersetzt" und hält das Produkt zurück', t => {
  const f = fixture(t);
  const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [{ arr: [GEM.arr[0], '  '] }] });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), [], 'der englische Rest darf nicht neben einem deutschen live gehen');
  assert.match(r.stderr, /Übersetzung fehlt für 1 von 2/);
});

// ── Fund 3: gesendete Fassung speichern, wiederverwenden, Originaltext mitprüfen ──
test('Fund 3: die gesendete Fassung steht im Ledger und wird nach einer Ablehnung WIEDERVERWENDET, nicht neu übersetzt', t => {
  const f = fixture(t);
  const eins = run(f, { env: MIT_UEBERSETZUNG, gemini: [GEM], outcomes: [rejected, rejected] });
  assert.equal(eins.status, 1, lebt(f, eins));
  assert.deepEqual(ledgerZeilen(f).filter(z => z.status === 'sending').map(z => z.body), GEM.arr, 'Fassung steht schon beim Checkpoint „sending"');
  assert.deepEqual(ledgerZeilen(f).filter(z => z.status === 'failed').map(z => z.body), GEM.arr);
  const zwei = run(f, { env: MIT_UEBERSETZUNG, gemini: [GEM, GEM2] });       // ein zweiter Aufruf würde GEM bekommen, nicht GEM2 ...
  assert.equal(zwei.status, 0, lebt(f, zwei));
  assert.deepEqual(posts(f).slice(2).map(p => p.body), GEM.arr, 'dieselbe fertige Fassung wie beim ersten Versuch');
  assert.equal(lines(f, 'gemini-calls.jsonl').length, 1, 'zweiter Lauf fragt den Übersetzer nicht mehr');
  assert.deepEqual([...states(f).values()], ['sent', 'sent']);
});

test('Fund 3: ein unklarer Eintrag findet seine Bewertung im Shop wieder, obwohl eine neue Übersetzung anders klänge', t => {
  const f = fixture(t);
  const eins = run(f, { env: MIT_UEBERSETZUNG, gemini: [{ arr: [GEM.arr[0]] }], comments: [COMMENTS[0]], outcomes: [{ networkError: true }] });
  assert.equal(eins.status, 1, lebt(f, eins));
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  // Der Post kam doch an: im Shop steht die gesendete Fassung. Eine neue Übersetzung (GEM2) wäre nicht gleich.
  const zwei = run(f, { env: MIT_UEBERSETZUNG, gemini: [{ arr: [GEM2.arr[0]] }], comments: [COMMENTS[0]], shopReviews: imShop(GEM.arr[0]) });
  assert.equal(zwei.status, 0, lebt(f, zwei));
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.equal(posts(f).length, 1, 'kein zweiter Post');
  assert.equal(lines(f, 'gemini-calls.jsonl').length, 1);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
});

test('Fund 3: liegt der ORIGINALtext schon im Shop (früher unübersetzt gesendet), wird er trotz neuer Übersetzung nicht doppelt gepostet', t => {
  const f = fixture(t);
  const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [GEM], shopReviews: imShop(COMMENTS[0].comment) });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), [GEM.arr[1]], 'nur der zweite Kommentar geht neu hinaus');
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.equal(states(f).get(key(COMMENTS[1])), 'sent');
});

test('Fund 3 (Ledger): Fassung überlebt Neuladen; spätere Zeile ohne Fassung löscht sie nicht; ungültiger Typ bricht ab', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-ledger-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const datei = path.join(root, 'items.jsonl');
  const st = ledger.loadReviewStates(datei);
  ledger.recordReviewState(datei, st, 'k1', 'sending', 'Deutscher Text');
  ledger.recordReviewState(datei, st, 'k2', 'sending');                     // alter Aufruf ohne Fassung bleibt gültig
  ledger.recordReviewState(datei, st, 'k1', 'uncertain');                   // spätere Zeile ohne Fassung
  const neu = ledger.loadReviewStates(datei);
  assert.equal(neu.get('k1'), 'uncertain');
  assert.equal(ledger.reviewBody(neu, 'k1'), 'Deutscher Text');
  assert.equal(ledger.reviewBody(st, 'k1'), 'Deutscher Text', 'auch im laufenden Speicher');
  assert.equal(ledger.reviewBody(neu, 'k2'), '');
  assert.equal(ledger.reviewBody(neu, 'fehlt'), '');
  fs.appendFileSync(datei, JSON.stringify({ key: 'k3', status: 'sent', body: 42 }) + '\n');
  assert.throws(() => ledger.loadReviewStates(datei), /CJ_REVIEW_LEDGER/);
  // Eine Map, die nicht aus loadReviewStates stammt, darf recordReviewState nicht zum Absturz bringen; die Fassung wird trotzdem gemerkt.
  const frisch = new Map();
  assert.doesNotThrow(() => ledger.recordReviewState(path.join(root, 'andere.jsonl'), frisch, 'k', 'sent', 'Text'));
  assert.equal(frisch.get('k'), 'sent');
  assert.equal(ledger.reviewBody(frisch, 'k'), 'Text');
});

// ── Fund 4: Anzeigename ──
test('Fund 4: Klarnamen und E-Mail-Adressen aus CJ werden nicht veröffentlicht; schon maskierte Namen bleiben', t => {
  const namen = ['Anna Muster', 'anna.muster@gmail.com', '', 'C***t', 'Özlem', 'Customer', 'A**b'];
  const kommentare = namen.map((n, i) => ({ id: 'n' + i, score: 5, comment: `Kommentar Nummer ${i} zum Produkt.`, commentUser: n, commentDate: '2026-10-01' }));
  const f = fixture(t);
  const r = run(f, { comments: kommentare, env: { PER: '8' } });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.name), ['A***r', 'A***m', 'CJ-Kundenbewertung', 'C***t', 'Ö***m', 'CJ-Kundenbewertung', 'A***b']);
  assert.ok(posts(f).every(p => !/[@\s]/.test(p.name)), 'kein Leerzeichen und kein @ im Namen');
});

// ── Fund 8: Sterne ──
test('Fund 8: nur ganze Sterne 1 bis 5 gehen hinaus; 6, 50, 4.5 und Unbrauchbares werden verworfen und gemeldet', t => {
  const scores = [6, 50, '4.5', 3.99, '5', 4, 5, 2, '', null, 'abc'];
  const kommentare = scores.map((s, i) => ({ id: 's' + i, score: s, comment: `Bewertung Nummer ${i} mit Text.`, commentUser: 'B***r', commentDate: '2026-10-01' }));
  const f = fixture(t);
  const r = run(f, { comments: kommentare, env: { PER: '8' } });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.rating), [5, 4, 5]);
  assert.deepEqual(posts(f).map(p => p.body), ['Bewertung Nummer 4 mit Text.', 'Bewertung Nummer 5 mit Text.', 'Bewertung Nummer 6 mit Text.']);
  // Unbrauchbar sind NUR vorhandene, kaputte Werte (6, 50, '4.5', 3.99, 'abc'); '' und null sind „keine Angabe" und zählen nicht mit.
  assert.match(r.stdout, /5 Kommentar\(e\) mit unplausibler Sternezahl verworfen/);
});

test('Fund 8: lauter unbrauchbare Sterne gelten als unbekannt, nicht als „leer" (kein 60-Tage-Eintrag) und sind ein Fehler (Exit 1)', t => {
  const kommentare = [{ id: 'x', score: 'abc', comment: 'Ein Kommentar ohne brauchbare Sterne.', commentUser: 'B***r' }];
  const f = fixture(t);
  const r = run(f, { comments: kommentare });
  assert.equal(r.status, 1, lebt(f, r));
  assert.match(r.stderr, /alle 1 Sternewerte unbrauchbar/);
  assert.deepEqual(posts(f), []);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
  // Gegenprobe: gültige, aber niedrige Sterne sind ein echtes „leer"
  const g = fixture(t);
  const niedrig = run(g, { comments: [{ id: 'y', score: 2, comment: 'Ein Kommentar mit zwei Sternen.', commentUser: 'B***r' }] });
  assert.equal(niedrig.status, 0, lebt(g, niedrig));
  assert.equal(lines(g, 'dropship/cj_reviews_leer.txt').length, 1);
});

// ── Fund 9: Trockenlauf ist die Vorgabe ──
test('Fund 9: live NUR bei DRY_RUN=0; fehlt die Variable oder ist sie „1", „true", „TRUE", „yes", leer → Trockenlauf', async t => {
  for (const wert of [undefined, '', '1', 'true', 'TRUE', 'yes']) {
    await t.test(`DRY_RUN=${wert === undefined ? '(fehlt)' : JSON.stringify(wert)}`, t => {
      const f = fixture(t);
      const r = run(f, { env: { DRY_RUN: wert } });
      assert.equal(r.status, 0, lebt(f, r));
      assert.deepEqual(posts(f), []);
      assert.equal(fs.existsSync(path.join(f.root, 'dropship/cj_review_items.jsonl')), false, 'nichts ins Ledger');
      assert.equal(fs.existsSync(path.join(f.root, 'dropship/cj_reviews_done.txt')), false);
      assert.match(r.stdout, /TROCKENLAUF/);
      assert.match(r.stdout, /\[DRY\]/);
    });
  }
  const live = fixture(t);
  const r = run(live, { env: { DRY_RUN: '0' } });
  assert.equal(r.status, 0, lebt(live, r));
  assert.equal(posts(live).length, 2, 'DRY_RUN=0 ist der einzige Weg zu echten Posts');
});

test('Fund 9: die Aufrufer setzen DRY_RUN ausdrücklich (cj-reviews.yml: „1" für den Test, „0" für den echten Lauf)', t => {
  const yml = new URL('../.github/workflows/cj-reviews.yml', import.meta.url);
  if (!fs.existsSync(yml)) return t.skip('Workflow-Datei nicht im Checkout (sparse)');
  const text = fs.readFileSync(yml, 'utf8');
  assert.match(text, /DRY_RUN:\s*\$\{\{\s*inputs\.dry_run && '1' \|\| '0'\s*\}\}/);
});

// ── Fund 10: Typ der Übersetzungsantwort (Einheitstests in lib/uebersetzen_test.mjs) ──
test('Fund 10: liefert der Übersetzer Objekte oder Zahlen statt Texten, geht nichts hinaus (kein „[object Object]", kein „5")', async t => {
  for (const [name, arr] of [['Objekte', [{ text: GEM.arr[0] }, { text: GEM.arr[1] }]], ['Zahl', [GEM.arr[0], 5]], ['null', [GEM.arr[0], null]]]) {
    await t.test(name, t => {
      const f = fixture(t);
      const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [{ arr }] });
      assert.equal(r.status, 1, lebt(f, r));
      assert.deepEqual(posts(f), []);
    });
  }
});

// ── Fund 11: „sending"/„uncertain" heilt über den Shop-Abgleich ──
test('Fund 11: „uncertain" wird zu „sent", sobald die Bewertung im Shop sichtbar ist; kein zweiter Post', t => {
  const f = fixture(t);
  const eins = run(f, { comments: [COMMENTS[0]], outcomes: [{ networkError: true }] });
  assert.equal(eins.status, 1, lebt(f, eins));
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  const zwei = run(f, { comments: [COMMENTS[0]], shopReviews: imShop(COMMENTS[0].comment) });
  assert.equal(zwei.status, 0, lebt(f, zwei));
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.equal(posts(f).length, 1);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
  assert.match(zwei.stdout, /aufgelöst/);
});

test('Fund 11: auch ein hängengebliebenes „sending" (Lauf abgebrochen) wird über den Shop aufgelöst', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'dropship/cj_review_items.jsonl'),
    JSON.stringify({ key: key(COMMENTS[0]), status: 'sending', updated_at: '2026-10-27T10:00:00.000Z' }) + '\n');   // altes Ledger ohne Fassung
  const r = run(f, { comments: [COMMENTS[0]], shopReviews: imShop(COMMENTS[0].comment) });
  assert.equal(r.status, 0, lebt(f, r));
  assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
  assert.deepEqual(posts(f), []);
});

test('Fund 11 (gegenprobe): nicht im Shop oder Shop nicht lesbar → bleibt unklar, wird gemeldet, nie erneut gepostet', async t => {
  for (const [name, config] of [['Shop leer', { shopReviews: [] }], ['Shop HTTP 500', { widgetStatus: 500 }], ['Shop Netzfehler', { widgetNetz: true }]]) {
    await t.test(name, t => {
      const f = fixture(t);
      const eins = run(f, { comments: [COMMENTS[0]], outcomes: [{ networkError: true }] });
      assert.equal(eins.status, 1);
      const zwei = run(f, { comments: [COMMENTS[0]], ...config });
      assert.equal(zwei.status, 1, lebt(f, zwei));
      assert.match(zwei.stderr, /CJ_REVIEW_UNCERTAIN/);
      assert.equal(posts(f).length, 1, 'nie doppelt posten');
      assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
      assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
    });
  }
});

// ── Fund 12: Judge.me drosselt ──
const zweiProdukte = { products: [{ id: '101', handle: 'erstes' }, { id: '102', handle: 'zweites' }], env: { LIMIT: '2', SCAN: '2' } };
const gedrosselt = (extra = {}) => ({ status: 429, body: { error: 'Too Many Requests' }, ...extra });

test('Fund 12: HTTP 429 beim POST → einmal warten (Retry-After beachtet) und wiederholen; danach läuft alles normal weiter', t => {
  const f = fixture(t);
  const r = run(f, { outcomes: [gedrosselt({ headers: { 'retry-after': '7' } }), success, success] });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), [COMMENTS[0].comment, COMMENTS[0].comment, COMMENTS[1].comment]);
  assert.deepEqual([...states(f).values()], ['sent', 'sent']);
  assert.ok(wartezeiten(f).includes(7000), 'Retry-After 7 s beachtet: ' + wartezeiten(f));
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
  // ohne Kopfzeile: feste kurze Pause; ein Datum als Retry-After zählt als nicht genannt, 999 wird auf 30 s begrenzt
  const g = fixture(t);
  run(g, { comments: [COMMENTS[0]], outcomes: [gedrosselt(), success] });
  assert.ok(wartezeiten(g).includes(5000), 'Standardpause 5 s: ' + wartezeiten(g));
  const h = fixture(t);
  run(h, { comments: [COMMENTS[0]], outcomes: [gedrosselt({ headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' } }), success] });
  assert.ok(wartezeiten(h).includes(5000));
  const i = fixture(t);
  run(i, { comments: [COMMENTS[0]], outcomes: [gedrosselt({ headers: { 'retry-after': '999' } }), success] });
  assert.ok(wartezeiten(i).includes(30000) && !wartezeiten(i).includes(999000));
});

test('Fund 12: bleibt es bei HTTP 429, endet der LAUF (kein Hämmern, die übrigen Produkte bleiben ungeprüft)', t => {
  const f = fixture(t);
  const r = run(f, { ...zweiProdukte, outcomes: [gedrosselt(), gedrosselt()] });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), [COMMENTS[0].comment, COMMENTS[0].comment], 'ein Versuch + eine Wiederholung, sonst nichts');
  assert.equal(states(f).get(key(COMMENTS[0])), 'failed', 'abgelehnt = nicht gesendet = später wiederholbar');
  assert.equal(states(f).has(key(COMMENTS[1])), false, 'die zweite Bewertung wurde gar nicht erst versucht');
  assert.equal(aufrufe(f, 'developers.cjdropshipping.com', '/product/productComments').length, 1, 'das zweite Produkt wurde nicht angefragt');
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
});

test('Fund 12: HTTP 503 beim POST → Ergebnis unbekannt: uncertain, KEINE blinde Wiederholung, Lauf endet', t => {
  const f = fixture(t);
  const r = run(f, { ...zweiProdukte, outcomes: [{ status: 503, body: {} }] });
  assert.equal(r.status, 1, lebt(f, r));
  assert.equal(posts(f).length, 1, '503 wird nicht blind wiederholt (der Post könnte angekommen sein)');
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  assert.equal(states(f).has(key(COMMENTS[1])), false);
  assert.equal(aufrufe(f, 'developers.cjdropshipping.com', '/product/productComments').length, 1);
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
});

test('Fund 12: drosselt das Widget beim Shop-Abgleich (HTTP 429), endet der Lauf ebenfalls; nichts wird gesendet', t => {
  const f = fixture(t);
  const r = run(f, { ...zweiProdukte, widgetStatus: 429 });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), []);
  assert.equal(aufrufe(f, 'developers.cjdropshipping.com', '/product/productComments').length, 1);
  assert.equal(aufrufe(f, 'judge.me', '/reviews/reviews_for_widget').length, 1, 'eine einzige Abfrage, dann Schluss');
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
});

test('Fund 12: jeder Judge.me-Aufruf (POST und Widget) hat ein Zeitlimit', t => {
  const f = fixture(t);
  const r = run(f, { outcomes: [{ status: 201, body: {} }] });       // 201 ohne ID erzwingt auch den Nachlese-Aufruf
  assert.equal(r.status, 0, lebt(f, r));
  const jm = aufrufe(f, 'judge.me');
  assert.ok(jm.length >= 3, 'Widget, POST, Nachlesen: ' + JSON.stringify(jm));
  assert.ok(jm.every(a => a.signal === true), 'Zeitlimit fehlt: ' + JSON.stringify(jm));
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Funde der zweiten Prüfung (28.10.2026, K1–K8 und W1–W6): Teilübersetzung, Drosselpfade, Bedingung „braucht Übersetzung",
// Sterne-Typen, unlesbares Widget, Übersetzungsausfall, alle vier Groq-Schlüssel.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const COMMENT3 = { id: 'comment-three', score: 5, comment: 'Third review: sturdy zipper and roomy inside.', commentUser: 'Buyer Three', commentDate: '2026-10-03' };
const DREI = [...COMMENTS, COMMENT3];
const ledgerVorbelegen = (f, zeilen) => fs.writeFileSync(path.join(f.root, 'dropship/cj_review_items.jsonl'),
  zeilen.map(z => JSON.stringify({ updated_at: '2026-10-27T10:00:00.000Z', ...z })).join('\n') + '\n');
const AUS = { status: 500, body: { error: { message: 'Gemini kaputt' } } };
const fuenfProdukte = { products: [101, 102, 103, 104, 105].map(n => ({ id: String(n), handle: 'p' + n })), env: { LIMIT: '5', SCAN: '5' } };
const cjKommentarAbfragen = f => aufrufe(f, 'developers.cjdropshipping.com', '/product/productComments').length;
const widgetAbfragen = f => aufrufe(f, 'judge.me', '/reviews/reviews_for_widget').length;

// ── K1: Teilübersetzung (nur ein Teil der Kommentare braucht eine Übersetzung) ──
test('K1: nur der noch nicht gesendete Kommentar wird übersetzt, und seine Fassung landet beim RICHTIGEN Kommentar', t => {
  const f = fixture(t);
  ledgerVorbelegen(f, [{ key: key(COMMENTS[0]), status: 'sent' }]);          // altes Ledger: Kommentar 1 ist raus (ohne Fassung)
  const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [{ arr: [GEM.arr[1]] }] });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), [GEM.arr[1]], 'deutsche Fassung des ZWEITEN Kommentars, nicht das englische Original');
  assert.deepEqual(lines(f, 'gemini-calls.jsonl').map(z => JSON.parse(z).texte), [[COMMENTS[1].comment]], 'der Übersetzer bekommt nur den neuen Text');
  assert.deepEqual([...states(f).values()], ['sent', 'sent']);
});

test('K1: zwei neue Kommentare neben einem gesendeten → jede Übersetzung gehört zu ihrem Kommentar (Index der Auswahl ≠ Index der Übersetzung)', t => {
  const f = fixture(t);
  ledgerVorbelegen(f, [{ key: key(COMMENTS[0]), status: 'sent' }]);
  const de = ['Nützliche Tasche mit schönem Finish.', 'Dritte Bewertung: stabiler Reissverschluss, viel Platz.'];
  const r = run(f, { env: { ...MIT_UEBERSETZUNG, PER: '3' }, comments: DREI, gemini: [{ arr: de }] });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), de);
  assert.equal(lines(f, 'gemini-calls.jsonl').length, 1);
});

test('K1: fehlt bei der Teilübersetzung ein Eintrag, bleibt das Produkt zurück (auch wenn der leere Eintrag vorn ODER hinten steht)', async t => {
  const faelle = [['leer vorn', ['', 'Dritte Bewertung: stabiler Reissverschluss.']], ['leer hinten', ['Nützliche Tasche mit schönem Finish.', '']]];
  for (const [name, arr] of faelle) {
    await t.test(name, t => {
      const f = fixture(t);
      ledgerVorbelegen(f, [{ key: key(COMMENTS[0]), status: 'sent' }]);
      const r = run(f, { env: { ...MIT_UEBERSETZUNG, PER: '3' }, comments: DREI, gemini: [{ arr }] });
      assert.equal(r.status, 1, lebt(f, r));
      assert.deepEqual(posts(f), [], 'nichts Englisches darf live gehen');
      assert.match(r.stderr, /Übersetzung fehlt für 1 von 2/);
      assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
    });
  }
});

// ── K2: die vier Drosselpfade der Fund-12-Korrektur ──
test('K2: Widget antwortet mit HTTP 503 → der Lauf endet wie bei 429 (zweites Produkt wird nicht angefragt)', t => {
  const f = fixture(t);
  const r = run(f, { ...zweiProdukte, widgetStatus: 503 });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), []);
  assert.equal(cjKommentarAbfragen(f), 1);
  assert.equal(widgetAbfragen(f), 1);
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
});

test('K2: Heilpfad („uncertain" im Ledger) trifft auf ein drosselndes Widget → Lauf endet, das zweite Produkt wird nicht angefragt', t => {
  const f = fixture(t);
  ledgerVorbelegen(f, [{ key: key(COMMENTS[0]), status: 'uncertain', body: COMMENTS[0].comment }]);
  const r = run(f, { ...zweiProdukte, comments: [COMMENTS[0]], widgetStatus: 429 });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), []);
  assert.match(r.stderr, /CJ_REVIEW_UNCERTAIN/);
  assert.equal(cjKommentarAbfragen(f), 1, 'zweites Produkt ungeprüft');
  assert.equal(widgetAbfragen(f), 1);
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
});

test('K2: die Nachlese nach „201 ohne ID" läuft in die Drosselung → Lauf endet (kein zweites Produkt)', t => {
  const f = fixture(t);
  const r = run(f, { ...zweiProdukte, comments: [COMMENTS[0]], outcomes: [{ status: 201, body: {} }], widgetAb: 1 });
  assert.equal(r.status, 1, lebt(f, r));
  assert.equal(posts(f).length, 1);
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  assert.equal(cjKommentarAbfragen(f), 1);
  assert.equal(widgetAbfragen(f), 2, 'Vorab-Abgleich + Nachlese, danach nichts mehr');
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
});

test('K2: drosselt der POST zweimal, wird das Widget für die Nachlese NICHT noch einmal gefragt; die offene Bewertung bleibt „uncertain"', t => {
  const f = fixture(t);
  const r = run(f, { outcomes: [{ status: 201, body: {} }, gedrosselt(), gedrosselt()] });
  assert.equal(r.status, 1, lebt(f, r));
  assert.equal(states(f).get(key(COMMENTS[0])), 'uncertain');
  assert.equal(states(f).get(key(COMMENTS[1])), 'failed');
  assert.equal(widgetAbfragen(f), 1, 'nur der Vorab-Abgleich');
  assert.match(r.stderr, /JUDGE\.ME DROSSELT/);
});

// ── K3: wann wird übersetzt? (Ausfall des Übersetzers darf Wiederholung und Heilung nicht blockieren) ──
test('K3: Übersetzer ausgefallen → eine abgelehnte Bewertung mit gespeicherter Fassung geht trotzdem raus; die gesendete wird nicht neu übersetzt', t => {
  const f = fixture(t);
  ledgerVorbelegen(f, [{ key: key(COMMENTS[0]), status: 'sent' }, { key: key(COMMENTS[1]), status: 'failed', body: GEM.arr[1] }]);
  const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [] });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), [GEM.arr[1]]);
  assert.deepEqual(lines(f, 'gemini-calls.jsonl'), [], 'der Übersetzer wird gar nicht gefragt');
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), [PRODUCT_ID]);
});

test('K3: Übersetzer ausgefallen → ein altes „sending"/„uncertain" ohne Fassung heilt über den Shop, ohne den Übersetzer zu fragen', async t => {
  for (const status of ['sending', 'uncertain']) {
    await t.test(status, t => {
      const f = fixture(t);
      ledgerVorbelegen(f, [{ key: key(COMMENTS[0]), status }]);
      const r = run(f, { env: MIT_UEBERSETZUNG, gemini: [], comments: [COMMENTS[0]], shopReviews: imShop(COMMENTS[0].comment) });
      assert.equal(r.status, 0, lebt(f, r));
      assert.deepEqual(lines(f, 'gemini-calls.jsonl'), []);
      assert.deepEqual(posts(f), []);
      assert.equal(states(f).get(key(COMMENTS[0])), 'sent');
    });
  }
});

// ── K4: Sterne-Typen ──
test('K4: Sterne als Liste, Text-Liste, Wahrheitswert, 0 oder negativ sind unbrauchbar und gehen NICHT als 5/4 Sterne hinaus', t => {
  const scores = [[5], ['4'], true, 0, -3, 5];
  const kommentare = scores.map((s, i) => ({ id: 'k' + i, score: s, comment: `Bewertung Nummer ${i} mit Text.`, commentUser: 'B***r', commentDate: '2026-10-01' }));
  const f = fixture(t);
  const r = run(f, { comments: kommentare, env: { PER: '8' } });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), ['Bewertung Nummer 5 mit Text.']);
  assert.deepEqual(posts(f).map(p => p.rating), [5]);
  assert.match(r.stdout, /5 Kommentar\(e\) mit unplausibler Sternezahl verworfen/);
});

test('K4: nur 0 und negative Sterne → Fehler (Exit 1), kein „leer"-Eintrag', t => {
  const kommentare = [0, -3].map((s, i) => ({ id: 'n' + i, score: s, comment: `Bewertung Nummer ${i} mit Text.`, commentUser: 'B***r' }));
  const f = fixture(t);
  const r = run(f, { comments: kommentare });
  assert.equal(r.status, 1, lebt(f, r));
  assert.match(r.stderr, /alle 2 Sternewerte unbrauchbar/);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
  assert.deepEqual(posts(f), []);
});

// ── K5 / W6: ein einzelner kaputter Wert verhindert das „leer" nicht; fehlende Sterne zählen wie bisher als „unter MIN_SCORE" ──
test('K5: ein kaputter Sternewert neben einem brauchbaren niedrigen → das Produkt gilt als leer (sonst kostet jeder Lauf wieder CJ-Punkte)', t => {
  const kommentare = [{ id: 'a', score: 6, comment: 'Ein Kommentar mit kaputtem Wert.', commentUser: 'B***r' },
    { id: 'b', score: 2, comment: 'Ein Kommentar mit zwei Sternen.', commentUser: 'B***r' }];
  const f = fixture(t);
  const r = run(f, { comments: kommentare });
  assert.equal(r.status, 0, lebt(f, r));
  assert.equal(lines(f, 'dropship/cj_reviews_leer.txt').length, 1);
  assert.match(r.stdout, /1 Kommentar\(e\) mit unplausibler Sternezahl verworfen/);
  assert.deepEqual(posts(f), []);
});

test('W6: fehlende, leere oder null-Sterne sind „keine Angabe": kein Fehler, kein Hinweis, das Produkt gilt als leer', t => {
  const kommentare = [{ id: 'a', score: null, comment: 'Ein Kommentar ohne Sterne (null).', commentUser: 'B***r' },
    { id: 'b', score: '', comment: 'Ein Kommentar ohne Sterne (leer).', commentUser: 'B***r' },
    { id: 'c', comment: 'Ein Kommentar ganz ohne Sternefeld.', commentUser: 'B***r' }];
  const f = fixture(t);
  const r = run(f, { comments: kommentare });
  assert.equal(r.status, 0, lebt(f, r));
  assert.equal(lines(f, 'dropship/cj_reviews_leer.txt').length, 1);
  assert.doesNotMatch(r.stdout + r.stderr, /unplausibel|unbrauchbar/);
  assert.deepEqual(posts(f), []);
  // zweiter Lauf mit übernommenem Leer-Ledger fragt CJ nicht mehr
  const zwei = run(f, { comments: kommentare });
  assert.equal(zwei.status, 0, lebt(f, zwei));
  assert.equal(cjKommentarAbfragen(f), 1, 'zweiter Lauf: das Produkt wird übersprungen');
});

// ── K6: unlesbares Widget ohne 429/503 ──
test('K6: Widget dauerhaft HTTP 500 → je Produkt eine Abfrage, nach 3 Produkten in Folge endet der Lauf (CJ-Punkte werden nicht verbrannt)', t => {
  const f = fixture(t);
  const r = run(f, { ...fuenfProdukte, widgetStatus: 500 });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), []);
  assert.equal(cjKommentarAbfragen(f), 3, 'Produkt 4 und 5 bleiben ungeprüft');
  assert.equal(widgetAbfragen(f), 3, 'eine Abfrage je Produkt, nicht je Bewertung');
  assert.match(r.stderr, /JUDGE\.ME DROSSELT ODER FÄLLT AUS \(Widget bei 3 Produkten in Folge unlesbar\)/);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
});

test('K6: ein unlesbares Widget wird je Produkt nur EINMAL gefragt, nicht für jede Bewertung neu', t => {
  const f = fixture(t);
  const r = run(f, { widgetNetz: true });
  assert.equal(r.status, 1, lebt(f, r));
  assert.equal(widgetAbfragen(f), 1, 'zwei Bewertungen, eine Abfrage');
  assert.equal((r.stderr.match(/CJ_ABGLEICH_FEHLT/g) || []).length, 2, 'beide Bewertungen werden zurückgehalten');
});

test('K6 (Gegenprobe): ein lesbares Produkt setzt den Zähler zurück → 2 + 1 + 2 Ausfälle beenden den Lauf nicht', t => {
  const f = fixture(t);
  const r = run(f, { ...fuenfProdukte, widgetStatusPid: { 101: 500, 102: 500, 104: 500, 105: 500 } });
  assert.equal(r.status, 1, lebt(f, r));            // die ausgefallenen Produkte sind Fehler
  assert.equal(cjKommentarAbfragen(f), 5, 'alle fünf Produkte wurden angefragt');
  assert.deepEqual(posts(f).map(p => p.body), COMMENTS.map(c => c.comment), 'nur das lesbare Produkt 103 geht hinaus');
  assert.doesNotMatch(r.stderr, /FÄLLT AUS/);
});

// ── K7 / W2: Übersetzung fällt dauerhaft aus ──
test('K7: Übersetzer fällt für alle aus → nach 3 zurückgehaltenen Produkten in Folge endet der Lauf (nicht jedes Produkt kostet weiter CJ-Abfragen)', t => {
  const f = fixture(t);
  const r = run(f, { ...fuenfProdukte, env: { ...fuenfProdukte.env, ...MIT_UEBERSETZUNG }, gemini: [] });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), []);
  assert.equal(cjKommentarAbfragen(f), 3);
  assert.match(r.stderr, /ÜBERSETZUNG FÄLLT AUS \(3 Produkte in Folge/);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_leer.txt'), []);
  assert.deepEqual(lines(f, 'dropship/cj_reviews_done.txt'), []);
});

test('K7 (Gegenprobe): eine gelungene Übersetzung setzt den Zähler zurück; mit ALLOW_ORIGINAL=1 gibt es keinen Abbruch', t => {
  const f = fixture(t);
  const r = run(f, { ...fuenfProdukte, env: { ...fuenfProdukte.env, ...MIT_UEBERSETZUNG }, gemini: [AUS, AUS, { arr: GEM.arr }, AUS, AUS] });
  assert.equal(r.status, 1, lebt(f, r));
  assert.equal(cjKommentarAbfragen(f), 5);
  assert.deepEqual(posts(f).map(p => p.body), GEM.arr);
  assert.doesNotMatch(r.stderr, /FÄLLT AUS/);
  const g = fixture(t);
  const bewusst = run(g, { ...fuenfProdukte });                    // Vorgabe des Harness: ALLOW_ORIGINAL=1, keine Schlüssel
  assert.equal(bewusst.status, 0, lebt(g, bewusst));
  assert.equal(cjKommentarAbfragen(g), 5);
  assert.equal(posts(g).length, 10);
});

// ── W1: alle vier Groq-Schlüssel gelten, nicht nur der erste ──
test('W1: Gemini ohne Guthaben und Groq-Schlüssel 1 erschöpft → Schlüssel 2 übersetzt, die Bewertungen gehen hinaus', t => {
  const f = fixture(t);
  const r = run(f, {
    env: { GEMINI_API_KEY: 'fake-gemini', GROQ_API_KEY: 'q1', GROQ_API_KEY2: 'q2', ALLOW_ORIGINAL: undefined },
    gemini: [{ status: 402, body: { error: { message: 'Your prepayment credits are depleted' } } }],
    groq: { q1: { status: 429, body: { error: { message: 'rate limit' } } }, q2: { arr: GEM.arr } } });
  assert.equal(r.status, 0, lebt(f, r));
  assert.deepEqual(posts(f).map(p => p.body), GEM.arr);
  const tokens = lines(f, 'groq-calls.jsonl').map(z => JSON.parse(z).token);
  assert.equal(tokens[0], 'q1');
  assert.ok(tokens.includes('q2'), 'Schlüssel 2 wurde gefragt: ' + tokens);
  assert.match(r.stdout, /Übersetzung über groq/);
});

test('W1 (Gegenprobe): sind alle gesetzten Groq-Schlüssel erschöpft, geht nichts hinaus', t => {
  const f = fixture(t);
  const r = run(f, {
    env: { GEMINI_API_KEY: 'fake-gemini', GROQ_API_KEY: 'q1', GROQ_API_KEY2: 'q2', GROQ_API_KEY4: 'q4', ALLOW_ORIGINAL: undefined },
    groq: { q1: { status: 429, body: {} }, q2: { status: 429, body: {} }, q4: { status: 429, body: {} } } });
  assert.equal(r.status, 1, lebt(f, r));
  assert.deepEqual(posts(f), []);
  assert.deepEqual([...new Set(lines(f, 'groq-calls.jsonl').map(z => JSON.parse(z).token))], ['q1', 'q2', 'q4']);
});

// ── W1 (Workflow) / W3: der Aufruf-Workflow reicht alle Groq-Schlüssel durch, und die CI sieht ihn überhaupt (sparse-checkout) ──
test('W1/W3: cj-reviews.yml reicht GROQ_API_KEY bis _4 durch; die Test-CI nimmt cj-reviews.yml in den sparse-checkout auf (sonst läuft der DRY_RUN-Wächter nie)', t => {
  const yml = new URL('../.github/workflows/cj-reviews.yml', import.meta.url);
  const ci = new URL('../.github/workflows/luxestyle-automation-tests.yml', import.meta.url);
  if (!fs.existsSync(yml) || !fs.existsSync(ci)) return t.skip('Workflow-Dateien nicht im Checkout (sparse)');
  const text = fs.readFileSync(yml, 'utf8');
  for (const n of ['GROQ_API_KEY', 'GROQ_API_KEY2', 'GROQ_API_KEY3', 'GROQ_API_KEY4']) {
    assert.match(text, new RegExp(`${n}:\\s*\\$\\{\\{\\s*secrets\\.${n}\\s*\\}\\}`), n);
  }
  const sparse = fs.readFileSync(ci, 'utf8').split('sparse-checkout: |')[1]?.split('sparse-checkout-cone-mode')[0] || '';
  assert.ok(sparse.length > 100, 'sparse-checkout-Block nicht gefunden');
  assert.match(sparse, /^\s*\.github\/workflows\/cj-reviews\.yml\s*$/m);
});

// ── K8 / W4: die Aufrufer-Dokumentation sagt die Wahrheit ──
test('K8/W4: die Docs behaupten nicht mehr, der Importer schreibe ohne DRY_RUN=1', t => {
  const wurzel = new URL('../', import.meta.url);
  const dateien = ['AGENTS.md', '.claude/skills/shop-messen-nicht-raten/SKILL.md', 'dropship/skill-entwuerfe-2610/shop-messen-nicht-raten/SKILL.md', 'dropship/NAECHSTE-AUFGABEN-1810.md'];
  const da = dateien.filter(d => fs.existsSync(new URL(d, wurzel)));
  if (!da.length) return t.skip('Docs nicht im Checkout (sparse)');
  for (const d of da) {
    const text = fs.readFileSync(new URL(d, wurzel), 'utf8');
    assert.doesNotMatch(text, /cj_reviews_import\.mjs`? \(schreiben ohne `?DRY_RUN=1/, d);
    assert.doesNotMatch(text, /`seo-optimizer\.mjs` und `cj_reviews_import\.mjs` schreiben ohne/, d);
    if (d.endsWith('NAECHSTE-AUFGABEN-1810.md')) assert.match(text, /DRY_RUN=0 QUERY=.*cj_reviews_import\.mjs/, d);
  }
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ZUSAMMENFASSUNG (Stand 28.10.2026)
//   Fund 1  → „Fund 1" (4 Ausfallarten × 2 Läufe) + Gegenprobe
//   Fund 2  → 4 Tests (Ausfall, Schlüssel/ALLOW_ORIGINAL, deutsch/gemischt, leerer Eintrag)
//   Fund 3  → 4 Tests (Wiederverwendung, unklar + neue Übersetzung, Originaltext im Shop, Ledger-Fassung)
//   Fund 4  → 1 Test      Fund 8 → 2 Tests      Fund 9 → 2 Tests (6 Werte + Workflow)      Fund 10 → 3 Fälle
//   Fund 11 → 3 Tests (uncertain, sending, Gegenprobe ×3)      Fund 12 → 5 Tests (Retry, Abbruch 429, 503, Widget 429, Zeitlimit)
//   GEMESSEN gegen das ORIGINAL (Kopie ohne die Korrekturen, mit diesen Testdateien): 60 Prüfungen, 34 ROT, 26 grün. Grün bleiben die 14 alten
//   Tests (20 Prüfungen) und 3 Gegenproben (Fund 1 Normalfall, Fund 9 Workflow-Datei, Fund 11 «bleibt unklar»); mit der Korrektur: 60 von 60 grün.
//   Harness: DRY_RUN=0 und ALLOW_ORIGINAL=1 als Vorgabe (die alten Tests prüfen Ledger/Checkpoints mit Originaltexten), je Test überschreibbar.
//   MUTATIONSPROBE (/tmp/cm/cjrev_mut/mutprobe.mjs): 12 von 12 Pflicht-Mutanten und 6 von 6 Zusatzproben werden von diesen Dateien erkannt.
//   NICHT behoben und darum ohne Test (Entscheid, kein Code): Fund 5, 6, 7.
//   ZWEITE PRÜFUNG (14 bestätigte Funde): K1 (Teilübersetzung: 3 Tests), K2 (4 Drosselpfade: 4 Tests), K3 (braucht-Bedingung: 2 Tests, 3 Fälle),
//   K4 (Sterne-Typen: 2 Tests; Ledger-Wächter im Ledger-Test; wirktDeutsch in lib/uebersetzen_test.mjs), K5 + W6 (Sterne: 3 Tests),
//   K6 (unlesbares Widget: 3 Tests), K7 + W2 (Übersetzungsausfall: 2 Tests), W1 (4 Groq-Schlüssel: 2 Tests + Workflow), W3 (sparse-checkout) + W1-Workflow (1 Test),
//   K8 + W4 (Docs: 1 Test), W5 (Logzeile: im Fund-2-Test). Harness neu: widgetStatusPid, widgetAb, Groq-Attrappe (config.groq).
//   Mutationsprobe 2: /tmp/cm/cjrev_mut/mutprobe2.mjs (alte 12 + 6 Zusatz, 14 aus Prüfung 2 und 14 für den neuen Code).
// ════════════════════════════════════════════════════════════════════════════════════════════════
