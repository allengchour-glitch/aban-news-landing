/* Node-VM mit echten Three-Geometrien, ohne Browser, Renderer oder GPU. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const three = require(path.join(root, 'js/vendor/three.min.js'));
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.style = {}; this.dataset = {}; this.children = []; this.attributes = {}; this.listeners = {}; this.classList = { add() {}, remove() {} }; this.hidden = false; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set innerHTML(value) { this.textContent = value; }
  get innerHTML() { return this.textContent; }
  appendChild(e) { e.parentNode = this; this.children.push(e); return e; }
  insertBefore(e, before) { e.parentNode = this; const i = this.children.indexOf(before); if (i < 0) this.children.push(e); else this.children.splice(i, 0, e); return e; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); }
  setAttribute(k, v) { this.attributes[k] = v; }
  addEventListener(k, f) { (this.listeners[k] ||= []).push(f); }
  querySelector(k) { return this.children.find(c => c.tagName === k) || null; }
  closest() { return null; }
  getContext() { return { createRadialGradient() { return { addColorStop() {} }; }, fillRect() {}, fillText() {} }; }
}
function game({ level = 0, station = false, master = false, clock = 0 } = {}) {
  const html = fs.readFileSync(path.join(root, 'neon-dungeon.html'), 'utf8');
  const ids = {}, events = {}, storage = new Map(), posts = [], timers = new Map();
  let now = clock, timerId = 0, nextFrame;
  const document = { body: new Element('body'), documentElement: new Element('html'), visibilityState: 'visible',
    createElement: tag => new Element(tag), addEventListener(k, f) { (events[k] ||= []).push(f); },
    getElementById(id) { return ids[id] || null; },
    querySelectorAll(selector) { return selector === '.trial-levels button' ? (ids.ov.children.find(c => c.className === 'trial-levels')?.children || []) : []; } };
  for (const match of html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)) { const e = new Element(match[1]); e.id = match[2]; ids[e.id] = e; document.body.appendChild(e); }
  ids.ov.appendChild(new Element('h1')); ids.ov.appendChild(new Element('p'));
  for (const id of ['startBtn', 'ovChips', 'trialBrief', 'dCoopBtn', 'dHostBtn', 'dJoinBtn', 'dCode', 'dCoopStatus']) ids.ov.appendChild(ids[id]);
  const location = { pathname: '/neon-dungeon.html', search: '?lvl=' + level + '&station=1' + (master ? '&ng=1' : ''), origin: 'http://node.test', href: 'http://node.test/neon-dungeon.html?lvl=' + level + '&station=1', replace(u) { this.href = u; } };
  const THREE = { ...three, WebGLRenderer: class { constructor() { this.domElement = new Element('canvas'); } setPixelRatio() {} setSize() {} render() {} }, TextureLoader: class { load() { return new three.Texture(); } } };
  const context = { document, location, navigator: { maxTouchPoints: 0 }, innerWidth: 1100, innerHeight: 800, devicePixelRatio: 1,
    THREE, console, performance: { now: () => now }, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) },
    addEventListener(k, f) { (events[k] ||= []).push(f); }, removeEventListener() {},
    setTimeout(f, delay = 0) { timers.set(++timerId, { f, at: now + delay }); return timerId; }, clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(f) { nextFrame = f; } };
  context.window = context; context.parent = station ? { postMessage: m => posts.push(m) } : context; context.postMessage = m => posts.push(m);
  vm.createContext(context);
  for (const file of ['state.js', 'view.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js/dungeon-trials', file), 'utf8'), context, { filename: file });
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean);
  for (let source of scripts) {
    if (source.includes('window.__nd=')) source = source.replace(/\}\)\(\);\s*$/, 'window.__original = function(code){return eval(code);};\n})();');
    vm.runInContext(source, context, { filename: 'neon-dungeon.html' });
  }
  function timersUntil(end) {
    for (let i = 0; i < 10000; i++) { const item = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!item) break; timers.delete(item[0]); now = item[1].at; item[1].f(); }
    now = end;
  }
  return { context, ids, posts, storage, events,
    run: code => context.__original(code), state: () => JSON.parse(JSON.stringify(context.__nd.state())),
    step(dt = 0.05) { timersUntil(now + dt * 1000); const f = nextFrame; nextFrame = null; if (f) f(now); },
    timers(ms) { timersUntil(now + ms); },
    press(key) { (events.keydown || []).forEach(f => f({ key, preventDefault() {} })); },
    release(key) { (events.keyup || []).forEach(f => f({ key })); } };
}
function pair(host, guest) {
  const queue = [], sessions = [];
  for (const [i, g] of [host, guest].entries()) {
    const session = { role: i === 0 ? 'host' : 'guest', code: 'ABCD', statusHandlers: [], messageHandlers: [],
      onStatus(f) { this.statusHandlers.push(f); }, onMessage(f) { this.messageHandlers.push(f); },
      send(d) { queue.push({ from: i, data: JSON.parse(JSON.stringify(d)) }); } };
    sessions.push(session);
    g.context.MP = { host(namespace) { session.namespace = namespace; return session; }, join(namespace) { session.namespace = namespace; return session; } };
    g.run(i === 0 ? 'dHost()' : 'dJoin("ABCD")');
  }
  function status(i, value) { sessions[i].statusHandlers.forEach(f => f(value)); }
  function flush() { for (let i = 0; queue.length; i++) { if (i > 1000) throw Error('Nachrichtenschleife'); const m = queue.shift(); sessions[1 - m.from].messageHandlers.forEach(f => f(m.data)); } }
  status(1, 'connected'); status(0, 'connected'); flush();
  return { queue, sessions, flush, status,
    deliver(to, d) { sessions[to].messageHandlers.forEach(f => f(JSON.parse(JSON.stringify(d)))); },
    step(dt = 0.05) { host.step(dt); guest.step(dt); flush(); } };
}
module.exports = { game, pair };
