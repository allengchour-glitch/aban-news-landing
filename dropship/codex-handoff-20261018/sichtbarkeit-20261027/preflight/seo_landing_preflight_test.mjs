import assert from 'node:assert/strict';
import { link, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyseHtml, analyseXRobotsTag, main, run, validateTargets } from './seo_landing_preflight.mjs';
const url = 'https://luxestyle.ch/products/example';
const target = { url };
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`ok ${name}`); }
const immediate = async () => {};
function fake(status, html = '', contentType = 'text/html') {
  return { status, url, headers: { get: () => contentType }, text: async () => html };
}
test('multiline/reordered canonical', () => {
  const html = `<link\n href="${url}"\n rel='canonical'\n><title>Example</title><h1>Example</h1>`;
  assert.equal(analyseHtml(html, url).canonicalMatches, true);
});
test('script/comment examples cannot create a canonical', () => {
  assert.equal(analyseHtml(`<!-- <link rel="canonical" href="${url}"> --><script>"<link rel='canonical' href='${url}'>"</script>`, url).canonicalCount, 0);
});
for (const status of [401, 403, 407, 429, 503]) {
  const report = await run([target], { fetch: async () => fake(status), warte: immediate });
  test(`${status} is unknown`, () => {
    assert.equal(report.results[0].state, 'unknown');
    assert.equal('canonicalMatches' in report.results[0], false);
  });
}
{
  const r = await run([target], { fetch: async () => { throw new Error('network'); }, warte: immediate });
  test('transport is unknown', () => assert.equal(r.results[0].reason, 'transport_error'));
}
{
  let count = 0;
  const r = await run([target], { fetch: async () => { count++; return fake(404); }, warte: immediate });
  test('404 is separately unavailable without retry', () => { assert.equal(r.results[0].state, 'unavailable'); assert.equal(count, 1); });
}
{
  let count = 0;
  const r = await run([target], { fetch: async () => fake(++count === 1 ? 429 : 200, `<link rel="canonical" href="${url}">`), warte: immediate });
  test('429 followed by a real page is measured', () => { assert.equal(r.results[0].state, 'measured'); assert.equal(r.results[0].canonicalMatches, true); assert.equal(count, 2); });
}
test('hard six URL limit and no external hosts', () => {
  assert.throws(() => validateTargets(Array.from({ length: 7 }, (_, i) => ({ url: `https://luxestyle.ch/products/p-${i}` }))));
  for (const value of ['https://evil.example/products/a','https://luxestyle.ch.evil.example/products/a','http://luxestyle.ch/products/a','https://user@luxestyle.ch/products/a']) assert.throws(() => validateTargets([{ url: value }]));
});
{
  let calls = 0;
  await assert.rejects(run([target, { url: 'https://other.example/products/a' }], { fetch: async () => { calls++; return fake(200); } }));
  test('batch validation precedes all requests', () => assert.equal(calls, 0));
}
{
  const expectedCanonical = 'https://luxestyle.ch/collections/example';
  const r = await run([{ url, expectedCanonical }], {
    fetch: async () => fake(200, '<head><link rel="canonical" href="./example"></head>')
  });
  test('relative canonical resolves against actual document, never the expected target', () => {
    assert.equal(r.results[0].canonical, url);
    assert.equal(r.results[0].canonicalMatches, false);
  });
  test('relative canonical without a document URL cannot be confirmed', () => {
    assert.equal(analyseHtml('<link rel="canonical" href="./example">', expectedCanonical).canonicalMatches, false);
  });
  test('relative canonical can correctly match its actual document URL', () => {
    assert.equal(analyseHtml('<head><link rel="canonical" href="./example"></head>', url, url).canonicalMatches, true);
  });
}
for (const [name, html] of [
  ['inert template', `<head><template><link rel="canonical" href="${url}"></template></head>`],
  ['nested inert template', `<head><template><template></template><link rel="canonical" href="${url}"></template></head>`],
  ['body link', `<head><title>Example</title></head><body><link rel="canonical" href="${url}"></body>`],
  ['head already implicitly closed', `<div>Body</div><link rel="canonical" href="${url}">`],
  ['RCDATA title example', `<head><title><link rel="canonical" href="${url}"></title></head>`],
  ['unclosed script example', `<head><script>"<link rel='canonical' href='${url}'>"`],
  ['fake custom link element', `<head><link-preview rel="canonical" href="${url}"></head>`]
]) {
  test(`${name} cannot establish a canonical`, () => {
    const r = analyseHtml(html, url, url);
    assert.equal(r.canonicalMatches, false);
    assert.equal(r.canonicalCount, 0);
  });
}
test('active head canonical survives ignored template/head-looking content', () => {
  const html = `<html><head><template><template></template></head><body><link rel="canonical" href="https://luxestyle.ch/products/wrong"></template><link rel="canonical" href="${url}"></head><body></body></html>`;
  assert.equal(analyseHtml(html, url, url).canonicalMatches, true);
});
test('document base does not create a false match for a relative canonical', () => {
  const html = '<head><base href="https://other.invalid/products/"><link rel="canonical" href="example"></head>';
  assert.equal(analyseHtml(html, url, url).canonicalMatches, false);
});
for (const status of [301, 302, 307, 308]) {
  let calls = 0;
  const r = await run([target], { fetch: async (_url, init) => {
    calls++;
    assert.equal(init.redirect, 'manual');
    return fake(status);
  }});
  test(`${status} stays unknown and is never followed`, () => {
    assert.equal(r.results[0].state, 'unknown');
    assert.equal('canonicalMatches' in r.results[0], false);
    assert.equal(calls, 1);
  });
}
{
  const root = await mkdtemp(join(tmpdir(), 'luxe-seo-output-'));
  try {
    const input = join(root, 'targets.json');
    const original = JSON.stringify([target]) + '\n';
    await writeFile(input, original);
    const symlinkOutput = join(root, 'symlink-output.json');
    const hardlinkOutput = join(root, 'hardlink-output.json');
    const directoryAlias = join(root, 'directory-alias');
    await symlink(input, symlinkOutput);
    await link(input, hardlinkOutput);
    await symlink(root, directoryAlias);
    for (const [name, output] of [
      ['same path', input], ['normalised path', join(root, '.', 'targets.json')],
      ['symlink alias', symlinkOutput], ['hardlink alias', hardlinkOutput],
      ['symlinked directory', join(directoryAlias, 'targets.json')]
    ]) {
      let calls = 0;
      await assert.rejects(main([input, output], {fetch: async () => { calls++; return fake(200); }}),
        /must not overwrite/);
      test(`${name} fails before fetch and preserves the input`, () => assert.equal(calls, 0));
      assert.equal(await readFile(input, 'utf8'), original);
    }
    const lateAlias = join(root, 'late-alias.json');
    await assert.rejects(main([input, lateAlias], {fetch: async () => {
      await symlink(input, lateAlias);
      return fake(200);
    }}), /must not overwrite/);
    const inputAfterAlias = await readFile(input, 'utf8');
    test('alias changed during scan is rechecked before writing', () => assert.equal(inputAfterAlias, original));
    const reportFile = join(root, 'report.json');
    await main([input, reportFile], {fetch: async () => fake(200, `<link rel="canonical" href="${url}">`)});
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    test('a distinct output writes only a preparation report', () => {
      assert.equal(report.preparationOnly, true);
      assert.equal(report.results[0].canonicalMatches, true);
    });
    assert.equal(await readFile(input, 'utf8'), original);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
}
test('active description and Google noindex use reordered mixed-case head attributes', () => {
  const r = analyseHtml(`<head><meta content='Make-up &amp; Pinsel' NAME='Description'>
    <meta CONTENT='max-snippet:50, NOINDEX' name='Googlebot'></head>`, url, url);
  assert.equal(r.metaDescription, 'Make-up & Pinsel');
  assert.equal(r.metaDescriptionPresent, true);
  assert.equal(r.metaDescriptionCount, 1);
  assert.equal(r.htmlNoindex, true);
});
for (const [name, html] of [
  ['comment', '<head><!-- <meta name="robots" content="noindex"><meta name="description" content="fake"> --></head>'],
  ['script', '<head><script>"<meta name=robots content=noindex><meta name=description content=fake>"</script></head>'],
  ['unclosed script', '<head><script>"<meta name=robots content=noindex><meta name=description content=fake>"'],
  ['nested template', '<head><template><template></template><meta name=robots content=noindex><meta name=description content=fake></template></head>'],
  ['title text', '<head><title><meta name=robots content=noindex><meta name=description content=fake></title></head>'],
  ['style text', '<head><style>/* <meta name=robots content=noindex><meta name=description content=fake> */</style></head>'],
  ['body', '<head></head><body><meta name=robots content=noindex><meta name=description content=fake></body>'],
  ['implicit body', '<div>Body</div><meta name=robots content=noindex><meta name=description content=fake>'],
  ['custom element', '<head><meta-preview name=robots content=noindex><meta-preview name=description content=fake></head>']
]) {
  test(`${name} cannot invent active description or noindex`, () => {
    const r = analyseHtml(html, url, url);
    assert.equal(r.htmlNoindex, false);
    assert.equal(r.metaDescriptionPresent, false);
    assert.equal(r.metaDescription, null);
    assert.equal(r.metaDescriptionCount, 0);
  });
}
test('Google rules combine conservatively and an index rule cannot cancel noindex', () => {
  const r = analyseHtml('<head><meta name=robots content="noindex, follow"><meta name=googlebot content=index></head>', url, url);
  assert.equal(r.htmlNoindex, true);
  assert.equal(r.robotsMeta.length, 2);
});
test('other crawler meta does not block Google and none does block', () => {
  assert.equal(analyseHtml('<head><meta name=bingbot content=noindex><meta name=googlebot-news content=noindex></head>', url, url).htmlNoindex, false);
  assert.equal(analyseHtml('<head><meta name=robots content=none></head>', url, url).htmlNoindex, true);
});
test('empty and duplicate descriptions remain observable without invented copy', () => {
  const r = analyseHtml('<head><meta name=description content="  "><meta name=description content="Second"></head>', url, url);
  assert.equal(r.metaDescription, null);
  assert.equal(r.metaDescriptionCount, 2);
  assert.equal(r.metaDescriptionPresent, true);
});
test('duplicate HTML attributes honour the first value', () => {
  const r = analyseHtml('<head><meta name=other name=robots content=noindex><meta name=description content=real content=fake></head>', url, url);
  assert.equal(r.htmlNoindex, false);
  assert.equal(r.metaDescription, 'real');
});
test('numeric HTML entities decode once in meta names and values', () => {
  assert.equal(analyseHtml('<head><meta name="r&#111;bots" content="&#x6e;oindex"></head>', url, url).htmlNoindex, true);
  assert.equal(analyseHtml('<head><meta name=robots content="&amp;#110;oindex"></head>', url, url).htmlNoindex, false);
  assert.equal(analyseHtml('<head><meta name=description content="&#9;&#10;"></head>', url, url).metaDescriptionPresent, false);
});
for (const [header, expected] of [
  ['noindex, nofollow', true],
  ['googlebot: noindex', true],
  ['ALL: NONE', true],
  ['bingbot: noindex', false],
  ['googlebot-news: noindex', false],
  ['bingbot: noindex, googlebot: index', false],
  ['googlebot: index, bingbot: noindex', false],
  ['bingbot: noindex, googlebot: max-snippet: 0, noindex', true],
  ['max-snippet: 0, noindex', true],
  ['index, follow', false],
  ['noindex-preview', false],
  ['&#110;oindex', false],
  ['bingbot: index, noindex', null],
  ['googlebot-news: index, none', null]
]) test(`X-Robots-Tag ${header}`, () => assert.equal(analyseXRobotsTag(header), expected));
test('a script literal comment opener cannot remove real head metadata after the script', () => {
  const r = analyseHtml(`<head><script>const x="<!--";</script><meta name="robots" content="noindex"><meta name="description" content="Real"><link rel="canonical" href="${url}"><!-- done --></head>`, url, url);
  assert.equal(r.htmlNoindex, true);
  assert.equal(r.metaDescription, 'Real');
  assert.equal(r.canonicalMatches, true);
});
test('a real comment close followed by body text cannot create active head metadata', () => {
  const r = analyseHtml('<head><!-- <script>const x="-->";</script><meta name=robots content=noindex></head>', url, url);
  assert.equal(r.htmlNoindex, false); // Text after the actual --> implicitly closes the head.
});
test('a custom script-looking close cannot end raw script text', () => {
  const r = analyseHtml('<head><script>"</script:fake><meta name=robots content=noindex>"</script></head>', url, url);
  assert.equal(r.htmlNoindex, false);
});
test('known raw header boundaries distinguish foreign scopes from separate global fields', () => {
  assert.equal(analyseXRobotsTag(['bingbot: index', 'noindex']), true);
  assert.equal(analyseXRobotsTag(['bingbot: index, noindex']), false);
  assert.equal(analyseXRobotsTag(['googlebot: index', 'bingbot: noindex']), false);
});
{
  const headers = new Headers({'content-type': 'text/html'});
  headers.append('X-Robots-Tag', 'bingbot: index');
  headers.append('X-Robots-Tag', 'noindex');
  const r = await run([target], {fetch: async () => ({
    status: 200, url, headers, text: async () => '<head><title>Real</title></head>'
  })});
  test('real Fetch Headers losing line boundaries preserve unknown noindex rather than false', () => {
    assert.equal(headers.get('x-robots-tag'), 'bingbot: index, noindex');
    assert.equal(r.results[0].xRobotsRawFields, null);
    assert.equal(r.results[0].xRobotsNoindex, null);
    assert.equal(r.results[0].noindexDetected, null);
    assert.equal(r.results[0].noindexDetectionReason, 'combined_x_robots_scope_unknown');
    assert.equal(r.results[0].googleIndexStatus, 'unknown');
  });
  const blocked = await run([target], {fetch: async () => ({
    status: 200, url, headers, text: async () => '<head><meta name=robots content=noindex></head>'
  })});
  test('proven HTML noindex stays true when header scope is unknown', () => {
    assert.equal(blocked.results[0].xRobotsNoindex, null);
    assert.equal(blocked.results[0].noindexDetected, true);
  });
}
{
  const fields = ['bingbot: index', 'noindex'];
  const r = await run([target], {fetch: async () => ({
    status: 200, url, headers: {
      get: name => name === 'content-type' ? 'text/html' : fields.join(', '),
      raw: () => ({'x-robots-tag': fields})
    }, text: async () => '<head><title>Real</title></head>'
  })});
  test('a raw-capable fetch response preserves real separate global header evidence', () => {
    assert.deepEqual(r.results[0].xRobotsRawFields, fields);
    assert.equal(r.results[0].xRobotsNoindex, true);
    assert.equal(r.results[0].noindexDetected, true);
  });
}
{
  const r = await run([target], {fetch: async () => ({
    status: 200, url, headers: new Headers({'content-type': 'text/html', 'x-robots-tag': 'googlebot: noindex'}),
    text: async () => '<head><meta name=description content="Actual description"></head>'
  })});
  test('HTTP header can block despite permissive HTML and measured never proves indexing', () => {
    assert.equal(r.results[0].state, 'measured');
    assert.equal(r.results[0].htmlNoindex, false);
    assert.equal(r.results[0].xRobotsNoindex, true);
    assert.equal(r.results[0].noindexDetected, true);
    assert.equal(r.results[0].googleIndexStatus, 'unknown');
    assert.equal(r.results[0].measurementScope, 'http_and_html_only');
    assert.match(r.measuredMeaning, /Google indexing is unknown/);
  });
}
{
  const r = await run([target], {fetch: async () => ({
    status: 200, url, headers: new Headers({'content-type': 'text/html'}),
    text: async () => '<head><meta name=robots content=noindex></head>'
  })});
  test('HTML noindex works without an X-Robots-Tag and absence never proves Google indexing', () => {
    assert.equal(r.results[0].xRobotsTag, null);
    assert.equal(r.results[0].xRobotsNoindex, false);
    assert.equal(r.results[0].noindexDetected, true);
    assert.equal(r.results[0].googleIndexStatus, 'unknown');
  });
}


// 27.10.2026: title evidence must come from the same active document head.
for (const [name, html] of [
  ['inert title', '<head><template><title>Fake</title></template></head>'],
  ['nested inert title', '<head><template><template></template><title>Fake</title></template></head>'],
  ['embedded srcdoc title', '<head></head><body><iframe srcdoc="<title>Embedded</title>"></iframe></body>'],
  ['body title', '<head></head><body><title>Wrong scope</title></body>'],
  ['comment title', '<head><!-- <title>Fake</title> --></head>'],
  ['script title', '<head><script>const html="<title>Fake</title>";</script></head>'],
  ['noscript title', '<head><noscript><title>Fake</title></noscript></head>'],
  ['implicit body title', '<div>Body</div><title>Wrong scope</title>']
]) test(`${name} cannot establish a page title`, () => {
  const result = analyseHtml(html, url, url);
  assert.equal(result.titlePresent, false);
  assert.equal(result.title, null);
  assert.equal(result.titleCount, 0);
});
test('active title text decodes once and normalises whitespace', () => {
  const r = analyseHtml('<head><title>  Mode &amp; Wohnen \n bei LuxeStyle </title></head>', url, url);
  assert.equal(r.title, 'Mode & Wohnen bei LuxeStyle');
  assert.equal(r.titlePresent, true);
  assert.equal(r.titleCount, 1);
});
test('active title survives a fake head boundary inside inert template', () => {
  const html = '<head><template></head><title>Fake</title></template><title>Real</title></head>';
  const r = analyseHtml(html, url, url);
  assert.equal(r.title, 'Real');
  assert.equal(r.titleCount, 1);
});
test('RCDATA title retains literal markup and does not invent a canonical', () => {
  const r = analyseHtml('<head><title>Real <b>Title</b></title></head>', url, url);
  assert.equal(r.title, 'Real <b>Title</b>');
  assert.equal(r.titleCount, 1);
  assert.equal(r.canonicalCount, 0);
});
test('unclosed active title retains its text to end of document', () => {
  const r = analyseHtml('<head><title>Real title', url, url);
  assert.equal(r.title, 'Real title');
  assert.equal(r.titlePresent, true);
});
test('empty first active title remains empty despite nonempty duplicate', () => {
  const r = analyseHtml('<head><title> </title><title>Second</title></head>', url, url);
  assert.equal(r.title, null);
  assert.equal(r.titlePresent, false);
  assert.equal(r.titleCount, 2);
});
test('nonempty first active title stays authoritative with duplicate', () => {
  const r = analyseHtml('<head><title>First</title><title>Second</title></head>', url, url);
  assert.equal(r.title, 'First');
  assert.equal(r.titlePresent, true);
  assert.equal(r.titleCount, 2);
});
test('numeric title entities decode only once', () => {
  const r = analyseHtml('<head><title>&#x4c;uxeStyle &amp;#65;</title></head>', url, url);
  assert.equal(r.title, 'LuxeStyle &#65;');
});
console.log(`${checks} checks passed`);
