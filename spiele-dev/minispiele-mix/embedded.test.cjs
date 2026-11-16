'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {fixture} = require('./embedded-fixture.cjs');
const root = path.resolve(__dirname, '../..');
const bridge = fs.readFileSync(path.join(root, 'js/minispiele-mix/result.js'), 'utf8');
const catalogSource = fs.readFileSync(path.join(root, 'js/minispiele-mix/catalog.js'), 'utf8');
const catalogVM = {window: {}};
vm.runInNewContext(catalogSource, catalogVM);
const catalog = catalogVM.window.MixCatalog;
const source = slug => fs.readFileSync(path.join(root, 'minispiele', slug + '.html'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

// Unabhängige Quellanker: Reihenfolge immer P1, P2. Zusatzlabels stehen separat.
const labels = {
  'drei-gewinnt': ['#cardX .who', '#cardO .who'],
  'vier-gewinnt': [],
  memory: ['#pc1 .pname', '#pc2 .pname'],
  'schere-stein-papier': ['#bottom .pname', '#top .pname'],
  'reaktions-duell': ['#lbl1', '#lbl2'],
  'tap-duell': ['#halfTop .who', '#halfBottom .who', '#endOverlay .scorebox.p1 .lbl', '#endOverlay .scorebox.p2 .lbl'],
  pong: ['#scP1 .name', '#scP2 .name'],
  tauziehen: ['#pad1 .lbl', '#pad2 .lbl'],
  'mathe-duell': ['#halfBot .label', '#halfTop .label'],
  'farb-klick': ['#hUnten .name', '#hOben .name'],
  elfmeter: ['#card1 .name', '#card2 .name'],
  'hoch-tief': ['#pc1 .name', '#pc2 .name'],
  simon: ['#card1 .name', '#card2 .name'],
  'schlange-duell': ['#hud .s-blue .name', '#hud .s-pink .name'],
  'ballon-pump': ['#half0 .who', '#half1 .who'],
  'auto-rennen': [],
  maulwurf: ['#half1 .hdr > span:first-child', '#half2 .hdr > span:first-child'],
  'quiz-buzzer': ['#sc1 .name', '#sc2 .name'],
  'stapel-turm': ['#sc1 .n', '#sc2 .n'],
  'punkte-jagd': ['#fieldTop .half-info > span:first-child', '#fieldBottom .half-info > span:first-child']
};

function load(slug = 'pong', options = {}) {
  const dom = options.dom === false ? null : options.dom || fixture(source(slug));
  const posts = [], timers = new Map();
  let nextTimer = 0;
  const sandbox = {
    URLSearchParams,
    location: {search: options.search ?? '?mix=token1234&p1=Ada&p2=Lin',
      pathname: '/minispiele/' + slug + '.html', origin: 'https://abannews.com'},
    performance: {now: () => 0},
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  sandbox.window = sandbox;
  sandbox.parent = options.embedded === false ? sandbox : {postMessage: (...args) => posts.push(args)};
  if (dom) Object.assign(sandbox, {document: dom.document, MutationObserver: dom.MutationObserver});
  if (options.poisonDOM) {
    Object.defineProperty(sandbox, 'document', {get() { assert.fail('Passiver Modus darf document nicht lesen'); }});
    Object.defineProperty(sandbox, 'MutationObserver', {get() { assert.fail('Passiver Modus darf keinen Observer suchen'); }});
    sandbox.addEventListener = () => assert.fail('Passiver Modus darf keinen Window-Listener registrieren');
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(bridge, context, {filename: 'result.js'});
  return {dom, posts, timers, sandbox, context, api: sandbox.MiniMix};
}

test('Katalog: alle 20 Quellen, richtige Familien und je zwei konkrete Regeln/Steuerungen', () => {
  assert.equal(catalog.length, 20);
  assert.deepEqual(plain(catalog.map(g => g.s).sort()), Object.keys(labels).sort());
  const kopf = ['drei-gewinnt', 'vier-gewinnt', 'memory', 'schere-stein-papier', 'mathe-duell', 'hoch-tief', 'simon', 'quiz-buzzer'];
  const tempo = ['reaktions-duell', 'tap-duell', 'farb-klick', 'maulwurf', 'punkte-jagd'];
  for (const game of catalog) {
    assert(source(game.s).includes('/js/minispiele-mix/result.js'), game.s);
    assert.equal(game.group, kopf.includes(game.s) ? 'kopf' : tempo.includes(game.s) ? 'tempo' : 'geschick');
    for (const key of ['s', 'e', 'n', 'd', 'goal']) assert.equal(typeof game[key], 'string');
    for (const key of ['tips', 'controls']) {
      assert.equal(game[key].length, 2);
      assert(game[key].every(text => typeof text === 'string' && text.length > 20));
    }
    game.controls.forEach((text, i) => assert(text.startsWith('P' + (i + 1) + ':')));
  }
  for (const slug of ['farb-klick', 'ballon-pump']) {
    const controls = catalog.find(g => g.s === slug).controls;
    assert(controls.every(text => /Querformat/.test(text)));
    assert.match(controls[0], slug === 'farb-klick' ? /rechts/ : /links/);
    assert.match(controls[1], slug === 'farb-klick' ? /links/ : /rechts/);
  }
});

test('Einzelspiel, Lebenspfad, ungültige Token und unbekannte Spiele bleiben vollständig DOM-passiv', () => {
  for (const options of [
    {search: ''}, {search: '?lebenspfad=1'}, {search: '?mix=short'},
    {search: '?mix=' + 'a'.repeat(101)}, {search: '?mix=token%2F1234'},
    {search: '?mix=token1234', embedded: false}, {slug: 'fremd'}
  ]) {
    const c = load(options.slug || 'pong', {...options, dom: false, poisonDOM: true});
    assert.equal(c.api.active, false);
    assert.equal(c.api.begin(), false);
    assert.equal(c.api.finish(1), false);
    assert.equal(c.posts.length, 0);
  }
});

test('Aktive Bridge ohne DOM bleibt kompatibel; Sound ist ausschließlich sound=1', () => {
  for (const value of ['', '0', '1', 'true', '01']) {
    const c = load('simon', {dom: false, search: '?mix=token1234&sound=' + value});
    assert.equal(c.api.active, true);
    assert.equal(c.api.sound, value === '1');
    assert.equal(c.api.begin(), false);
    assert.equal(c.api.finish(0), true);
    assert.equal(c.posts.length, 1);
  }
});

test('DOMReady: vorher keine DOM-Abfrage, kein CSS, kein Start; danach genau eine Einrichtung', () => {
  const c = load();
  assert.equal(c.dom.queries.length, 0);
  assert.equal(c.dom.document.listenerCount('DOMContentLoaded'), 1);
  assert.equal(c.dom.document.documentElement.classList.contains('mix-embedded'), false);
  assert.equal(c.dom.document.head.children.some(n => n.href), false);
  assert.equal(c.api.begin(), false);
  c.dom.ready();
  c.dom.ready();
  const links = c.dom.document.head.children.filter(n => n.href);
  assert.equal(links.length, 2);
  assert.match(links[0].href, /^\/css\/minispiele-mix-embedded\.css(?:\?v=[a-f0-9]+)?$/);
  assert.match(links[1].href, /^\/css\/minispiele-mix-landscape\.css(?:\?v=[a-f0-9]+)?$/);
  assert.equal(links[0].rel, 'stylesheet');
  assert.equal(c.dom.document.documentElement.classList.contains('mix-embedded'), true);
  assert.equal(c.dom.document.listenerCount('DOMContentLoaded'), 0);
  const lateDOM = fixture(source('pong'));
  lateDOM.document.readyState = 'complete';
  load('pong', {dom: lateDOM});
  assert.equal(lateDOM.document.listenerCount('DOMContentLoaded'), 0);
  assert.equal(lateDOM.document.head.children.filter(n => n.href).length, 2);
});

for (const game of catalog) {
  test(game.s + ': nur belegte reine Namenslabels und Zurücktext ändern', () => {
    const c = load(game.s);
    const expected = labels[game.s].map(selector => {
      const found = c.dom.document.querySelectorAll(selector);
      assert.equal(found.length, 1, 'Eindeutiger Quellselektor: ' + selector);
      assert.equal(found[0].children.length, 0);
      return found[0];
    });
    const back = c.dom.elements().find(n => n.tagName === 'BUTTON' && n.textContent.trim() === '← Zurück');
    assert(back, 'Original-Zurückknopf vorhanden');
    const onclick = back.getAttribute('onclick');
    const original = new Map(c.dom.elements().map(n => [n, {children: [...n.children], text: n.textContent, style: {...n.style}}]));
    c.dom.ready();
    expected.forEach((node, i) => assert(node.textContent.includes(i % 2 ? 'P2 · Lin' : 'P1 · Ada'), node.textContent));
    assert.equal(back.textContent, 'Runde unterbrechen');
    assert.equal(back.getAttribute('onclick'), onclick);
    assert.equal(c.dom.htmlWrites.length, 0, 'Brücke schreibt niemals innerHTML');
    for (const [node, before] of original) {
      if (node !== c.dom.document.head) assert.deepEqual(node.children, before.children, 'Keine Kindknoten entfernen');
      if (!before.children.length && !expected.includes(node) && node !== back) assert.equal(node.textContent, before.text);
      assert.deepEqual(node.style, before.style, 'Spielfarben/Geometrie bleiben unverändert');
    }
    const watched = [...c.dom.observers].flatMap(o => o.targets.map(t => t.target));
    assert.deepEqual(watched, game.s === 'reaktions-duell' ? expected : []);
  });
}

test('Namen sind gekürzt und nur Text; HTML, Sonderzeichen und Ersetzungsmuster bleiben inert', () => {
  const p1 = '<img src=x onerror=x>', p2 = '  $&<b>Lin</b>"\'&' + 'z'.repeat(30) + '  ';
  const c = load('memory', {search: '?' + new URLSearchParams({mix: 'token1234', p1, p2})});
  c.dom.ready();
  assert.equal(c.dom.document.querySelector('#pc1 .pname').textContent, '🔴 P1 · ' + p1.slice(0, 20));
  assert.equal(c.dom.document.querySelector('#pc2 .pname').textContent, '🔵 P2 · ' + p2.trim().slice(0, 20));
  assert.equal(c.dom.document.querySelectorAll('img').length, 0);
  assert.equal(c.dom.htmlWrites.length, 0);
  const empty = load('memory', {search: '?mix=token1234&p1=%20%20'});
  empty.dom.ready();
  assert.equal(empty.dom.document.querySelector('#pc1 .pname').textContent, '🔴 P1');
  assert.equal(empty.dom.document.querySelector('#pc2 .pname').textContent, '🔵 P2');
});

test('Abweichende oder verschachtelte Labels werden nicht überschrieben', () => {
  const c = load('memory');
  const first = c.dom.document.querySelector('#pc1 .pname');
  const second = c.dom.document.querySelector('#pc2 .pname');
  first.textContent = '🔴 Spieler 1: 42';
  const score = c.dom.document.createElement('b');
  score.textContent = '🔵 Spieler 2';
  second.textContent = ''; second.appendChild(score);
  c.dom.ready();
  assert.equal(first.textContent, '🔴 Spieler 1: 42');
  assert.equal(second.children[0], score);
  assert.equal(second.textContent, '🔵 Spieler 2');
});

test('Reaktions-Observer beobachtet nur Labels, erhält Signale und ersetzt zurückgeschriebene Namen', () => {
  const c = load('reaktions-duell');
  c.dom.ready();
  const label = c.dom.document.getElementById('lbl1');
  for (const text of ['⚡ TIPP!', '🎉 Punkt!', '😖', 'Spieler 1: 42']) {
    label.textContent = text; c.dom.flush();
    assert.equal(label.textContent, text);
  }
  label.textContent = 'Spieler 1'; c.dom.flush();
  assert.equal(label.textContent, 'P1 · Ada');
  label.childNodes[0].textContent = 'Spieler 1'; c.dom.flush();
  assert.equal(label.textContent, 'P1 · Ada');
  assert.equal([...c.dom.observers].flatMap(o => o.targets).length, 2);
});

test('begin klickt ausschließlich vorhandene geprüfte Startknöpfe genau einmal, nie automatisch', () => {
  for (const game of catalog) {
    const c = load(game.s);
    const button = c.dom.document.getElementById(game.s === 'farb-klick' ? 'btnStart' : 'startBtn');
    const clicked = [];
    c.dom.document.querySelectorAll('button').forEach(node => node.addEventListener('click', () => clicked.push(node)));
    assert.equal(c.api.begin(), false);
    c.dom.ready();
    assert.equal(clicked.length, 0);
    assert.equal(c.api.begin(), !!button, game.s);
    assert.equal(c.api.begin(), false);
    assert.deepEqual(clicked, button ? [button] : []);
    c.api.finish(1);
    assert.equal(c.api.begin(), false, 'Kein End-Restart');
  }
  const manual = load('auto-rennen');
  manual.dom.ready();
  manual.dom.document.getElementById('startBtn').click();
  assert.equal(manual.api.begin(), false, 'Manueller Start wird nicht wiederholt');
  const ended = load();
  ended.dom.ready(); ended.api.finish(2);
  assert.equal(ended.api.begin(), false, 'Kein erster Start nach Ergebnis');
  const disabled = load();
  disabled.dom.ready(); disabled.dom.document.getElementById('startBtn').disabled = true;
  assert.equal(disabled.api.begin(), false);
});

test('begin startet die Original-Reaktionsrunde; deren Signale und Punktestand bleiben wirksam', () => {
  const c = load('reaktions-duell');
  for (const script of source('reaktions-duell').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(script[1])) vm.runInContext(script[2], c.context, {filename: 'reaktions-duell-original.js'});
  }
  c.dom.ready();
  assert.equal(c.api.begin(), true);
  c.dom.flush();
  assert.equal(c.dom.document.getElementById('lbl1').textContent, 'P1 · Ada');
  assert.equal(c.dom.document.getElementById('startScreen').classList.contains('hidden'), true);
  assert.equal(c.timers.size, 1, 'Original wartet auf sein Grünsignal');
  const [id, go] = [...c.timers][0]; c.timers.delete(id); go(); c.dom.flush();
  assert.equal(c.dom.document.getElementById('lbl1').textContent, '⚡ TIPP!');
  c.dom.document.getElementById('p1').fire('mousedown'); c.dom.flush();
  assert.equal(c.dom.document.getElementById('lbl1').textContent, '🎉 Punkt!');
  assert.equal(c.dom.document.getElementById('s1').textContent, '1');
  assert.equal(c.api.begin(), false);
  assert.equal(c.dom.document.getElementById('s1').textContent, '1', 'Kein Reset durch zweiten Parent-Aufruf');
  assert.equal(c.posts.length, 0, 'Ein Zwischenpunkt ist noch kein Mix-Ergebnis');
});

test('Original-Drei-gewinnt-Züge senden über die echte Bridge exakt ein passendes Ergebnis', () => {
  const c = load('drei-gewinnt');
  for (const invalid of [-1, 3, '1', null, undefined, NaN]) assert.equal(c.api.finish(invalid), false);
  for (const script of source('drei-gewinnt').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(script[1])) vm.runInContext(script[2], c.context, {filename: 'drei-gewinnt-original.js'});
  }
  c.dom.ready();
  const cells = c.dom.document.querySelectorAll('#board .cell');
  assert.equal(cells.length, 9);
  [0, 3, 1, 4].forEach(index => cells[index].click());
  assert.equal(c.posts.length, 0);
  cells[2].click();
  assert.deepEqual(plain(c.posts), [[{type: 'mini-mix-result', round: 'token1234', game: 'drei-gewinnt', winner: 1}, 'https://abannews.com']]);
  assert.equal(c.dom.document.getElementById('scoreX').textContent, '1');
  assert.equal(c.dom.document.querySelector('#cardX .who').textContent, '❌ P1 · Ada');
  assert.equal(c.api.finish(2), false);
  assert.equal(c.api.begin(), false);
  assert.equal(c.posts.length, 1);
});

test('CSS ist auf Mix begrenzt und verändert weder Canvas noch Spielfeldmaße oder Spielerfarben', () => {
  const css = fs.readFileSync(path.join(root, 'css/minispiele-mix-embedded.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /#b5f36d/); assert.match(css, /#ac9cff/);
  assert.doesNotMatch(css, /canvas|!important|pointer-events\s*:\s*none/);
  for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    if(/display\s*:\s*none|visibility\s*:\s*hidden/.test(rule[2]))assert(['html.mix-embedded body > footer','html.mix-embedded.mix-has-bar button.mix-back'].includes(rule[1].trim()),'Nur doppelte Shell-Navigation darf verborgen werden');
  }
  assert.doesNotMatch(css, /(?:^|[;{])\s*(?:width|height|position|transform|grid-template-columns|flex-direction)\s*:/m);
  const rules = [...css.replace(/@media[^{}]*\{/g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)];
  assert(rules.length > 0);
  for (const rule of rules) assert(rule[1].trim().startsWith('html.mix-embedded'), rule[1]);
});
