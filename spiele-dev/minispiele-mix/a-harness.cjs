'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Vollständige Originalskripte; nur Browser-APIs und die Ergebnis-Brücke sind Stubs.
function loadGame(name, {bridge = true} = {}) {
  const filename = path.resolve(__dirname, '../../minispiele', name + '.html');
  const html = fs.readFileSync(filename, 'utf8');
  const elements = new Map(), nodes = new Set(), timers = new Map(), frames = new Map();
  const reports = [];
  let now = 0, nextId = 0, seed = 73;
  function target() {
    const listeners = new Map();
    return {
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      fire(type, extra = {}) {
        const event = {preventDefault() {}, button: 0, pointerType: 'touch', ...extra};
        for (const fn of listeners.get(type) || []) fn(event);
      }
    };
  }
  const canvas = new Proxy({}, {
    get(object, key) {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        return () => ({addColorStop() {}});
      }
      return object[key] ?? (() => {});
    }
  });
  function element(tag = 'div') {
    let classes = new Set(), markup = '';
    const el = {...target(),
      tagName: tag.toUpperCase(), style: {}, dataset: {}, children: [], textContent: '',
      clientWidth: 360, clientHeight: 600, parentNode: null,
      classList: {
        add(...names) { names.forEach(n => classes.add(n)); },
        remove(...names) { names.forEach(n => classes.delete(n)); },
        contains(name) { return classes.has(name); },
        toggle(name, on = !classes.has(name)) {
          if (on) classes.add(name); else classes.delete(name);
          return on;
        }
      },
      get className() { return [...classes].join(' '); },
      set className(value) { classes = new Set(value.split(/\s+/).filter(Boolean)); },
      get innerHTML() { return markup; },
      set innerHTML(value) {
        markup = value;
        el.children.forEach(child => { child.parentNode = null; });
        el.children = [];
        // Pong erstellt den Wiederholen-Knopf erst im Endbildschirm.
        for (const match of value.matchAll(/<([\w-]+)\b[^>]*\bid=["']([^"']+)["'][^>]*>/g)) {
          const child = element(match[1]);
          elements.set(match[2], child);
          el.appendChild(child);
        }
      },
      appendChild(child) { el.children.push(child); child.parentNode = el; return child; },
      removeChild(child) {
        el.children = el.children.filter(n => n !== child); child.parentNode = null;
      },
      setAttribute(key, value) { el[key] = value; },
      getAttribute(key) { return el[key]; },
      querySelectorAll(selector) {
        return el.children.flatMap(child => [
          ...(child.classList.contains(selector.slice(1)) ? [child] : []),
          ...child.querySelectorAll(selector)
        ]);
      },
      blur() {}, setPointerCapture() {},
      getContext() { return canvas; },
      getBoundingClientRect() { return {left: 0, top: 0, width: 360, height: 600}; }
    };
    nodes.add(el);
    return el;
  }
  for (const match of html.matchAll(/<([\w-]+)\b[^>]*\bid=["']([^"']+)["'][^>]*>/g)) {
    const el = element(match[1]);
    el.className = match[0].match(/\bclass=["']([^"']*)["']/)?.[1] || '';
    elements.set(match[2], el);
  }
  function el(id) {
    assert.ok(elements.has(id), 'Fehlende HTML-ID: ' + id);
    return elements.get(id);
  }
  const document = Object.assign(target(), {
    body: element('body'), hidden: false, getElementById: el, createElement: element,
    querySelectorAll(selector) {
      assert.ok(selector.startsWith('.'));
      return [...nodes].filter(n => n.classList.contains(selector.slice(1)));
    }
  });
  function schedule(fn, delay, interval = false) {
    const id = ++nextId;
    timers.set(id, {fn, due: now + delay, interval: interval ? delay : 0});
    return id;
  }
  const math = Object.create(Math);
  math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  const sandbox = Object.assign(target(), {
    document, Math: math, innerWidth: 390, devicePixelRatio: 1,
    performance: {now: () => now},
    setTimeout: (fn, delay = 0) => schedule(fn, delay),
    setInterval: (fn, delay) => schedule(fn, delay, true),
    clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  let inlineSeen = false, loaders = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = match[1].match(/\bsrc=["']([^"']+)["']/)?.[1];
    if (src) {
      assert.match(src, /^\/js\/minispiele-mix\/result\.js(?:[?#].*)?$/);
      assert.equal(inlineSeen, false, 'Ergebnis-Modul muss vor der Spiellogik laden');
      loaders++;
      if (bridge) sandbox.MiniMix = {finish(winner) { reports.push(winner); }};
      continue;
    }
    inlineSeen = true;
    let source = match[2];
    // Nur einen Zugang zum IIFE-Scope ergänzen, keine Spielfunktion ersetzen.
    if (/\}\)\(\);\s*$/.test(source)) {
      source = source.replace(/\}\)\(\);\s*$/, 'window.__inspect = function(source) { return eval(source); };\n})();');
    }
    vm.runInContext(source, context, {filename, timeout: 1000});
  }
  assert.equal(loaders, 1, 'Genau ein Ergebnis-Modul');
  assert.equal(typeof sandbox.__inspect, 'function');
  function run(source) {
    return vm.runInContext(`__inspect(${JSON.stringify(source)})`, context, {timeout: 1000});
  }
  function advance(ms) {
    const end = now + ms;
    let count = 0;
    while (true) {
      const entry = [...timers].filter(([, t]) => t.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!entry) break;
      assert.ok(++count < 10000, 'Timer läuft nicht aus');
      const [id, timer] = entry;
      now = timer.due;
      if (timer.interval) timer.due += timer.interval; else timers.delete(id);
      timer.fn();
    }
    now = end;
  }
  function frame(ms = 16) {
    advance(ms);
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(fn => fn(now));
  }
  function snapshot() {
    return [...elements].map(([id, node]) => [id, node.textContent, node.innerHTML, node.className]);
  }
  return {run, reports, advance, frame, el, snapshot};
}

module.exports = {loadGame};
