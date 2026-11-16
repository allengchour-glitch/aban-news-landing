'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Führt die vollständigen Originalskripte aus. Nur Browser-APIs sind Attrappen;
// der eingefügte Testzugang liest/setzt den Zustand im unveränderten Spielabschluss.
function loadGame(name, { mix = true } = {}) {
  const filename = path.resolve(__dirname, '../../minispiele', name + '.html');
  const html = fs.readFileSync(filename, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.filter(s => s[1].includes('/js/minispiele-mix/result.js')).length, 1);
  assert.match(scripts[0][1], /src="\/js\/minispiele-mix\/result\.js(?:\?v=[a-f0-9]+)?"/);

  let now = 0, nextId = 0;
  const timers = new Map(), frames = new Map(), nodes = [], byId = new Map();
  const calls = [];
  const noop = () => {};
  const canvas = new Proxy({
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: value => ({ width: String(value).length * 8 })
  }, { get: (target, key) => key in target ? target[key] : noop });

  function select(list, selector) {
    return list.filter(node => selector.split(',').some(s => {
      s = s.trim();
      return s[0] === '#' ? node.id === s.slice(1) :
        s[0] === '.' ? node.classList.contains(s.slice(1)) : node.tagName === s.toUpperCase();
    }));
  }

  function element(tag = 'div', attrs = {}) {
    let content = '';
    const listeners = new Map();
    const node = {
      tagName: tag.toUpperCase(), id: attrs.id, className: attrs.class || '',
      children: [], parentNode: null, disabled: false, textContent: '',
      clientWidth: 436, clientHeight: 500, offsetWidth: 436,
      style: { setProperty(key, value) { this[key] = value; } },
      get innerHTML() { return content; },
      set innerHTML(value) {
        content = value;
        for (const child of [...this.children]) this.removeChild(child);
      },
      getAttribute: key => attrs[key] ?? null,
      getBoundingClientRect: () => ({ width: 436, height: 500, left: 0, top: 0 }),
      getContext: () => canvas,
      setPointerCapture: noop,
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(callback);
      },
      dispatch(type, data = {}) {
        for (const callback of listeners.get(type) || []) {
          callback({ preventDefault: noop, stopPropagation: noop, ...data });
        }
      },
      appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
      removeChild(child) {
        this.children.splice(this.children.indexOf(child), 1);
        child.parentNode = null;
      },
      remove() { if (this.parentNode) this.parentNode.removeChild(this); },
      querySelectorAll(selector) { return select(this.children, selector); }
    };
    node.classList = {
      contains: value => node.className.split(/\s+/).includes(value),
      add(...values) { node.className = [...new Set([...node.className.split(/\s+/), ...values])].join(' '); },
      remove(...values) { node.className = node.className.split(/\s+/).filter(v => !values.includes(v)).join(' '); },
      toggle(value, force) {
        const on = force === undefined ? !this.contains(value) : force;
        if (on) this.add(value); else this.remove(value);
        return on;
      }
    };
    nodes.push(node);
    if (node.id) byId.set(node.id, node);
    return node;
  }
  // Die vorhandenen IDs/Attribute kommen aus der jeweiligen HTML-Datei.
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(a => [a[1], a[2]]));
    element(match[1], attrs);
  }
  const document = {
    body: nodes.find(n => n.tagName === 'BODY'), hidden: false,
    getElementById(id) { assert.ok(byId.has(id), `Fehlende Original-ID: ${id}`); return byId.get(id); },
    createElement: element,
    querySelectorAll: selector => select(nodes, selector),
    querySelector: selector => select(nodes, selector)[0] || null,
    addEventListener: noop
  };
  function timer(callback, delay = 0, interval = false) {
    const id = ++nextId;
    timers.set(id, { callback, at: now + delay, interval: interval ? delay : 0 });
    return id;
  }
  const sandbox = {
    document, console, devicePixelRatio: 1, addEventListener: noop,
    performance: { now: () => now },
    Date: class extends Date { static now() { return now; } },
    Math: Object.assign(Object.create(Math), { random: () => 0.25 }),
    setTimeout: (callback, delay) => timer(callback, delay),
    clearTimeout: id => timers.delete(id),
    setInterval: (callback, delay) => timer(callback, delay, true),
    clearInterval: id => timers.delete(id),
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  };
  sandbox.window = sandbox;
  if (mix) sandbox.MiniMix = { finish: winner => calls.push(winner) };
  const context = vm.createContext(sandbox);
  const inline = scripts.filter(s => !/\bsrc\s*=/.test(s[1]));
  inline.forEach((script, index) => {
    let source = script[2];
    if (index === inline.length - 1) {
      const close = source.lastIndexOf('})();');
      assert.ok(close >= 0, 'Spielabschluss der Original-IIFE gefunden');
      source = source.slice(0, close) + '\nwindow.__evaluate = function(source){ return eval(source); };\n' + source.slice(close);
    }
    vm.runInContext(source, context, { filename, timeout: 1000 });
  });
  return {
    calls, document,
    evaluate(source) {
      sandbox.__testSource = source;
      return vm.runInContext('__evaluate(__testSource)', context, { timeout: 1000 });
    },
    setNow(value) { now = value; },
    advance(ms) {
      const until = now + ms;
      for (let count = 0; ; count++) {
        const entry = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        assert.ok(count < 10000, 'Timer-Schleife begrenzt');
        const [id, t] = entry;
        now = t.at;
        if (t.interval) t.at += t.interval; else timers.delete(id);
        t.callback();
      }
      now = until;
    }
  };
}

module.exports = { loadGame };
