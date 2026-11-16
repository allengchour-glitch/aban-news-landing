'use strict';

const assert = require('node:assert/strict');

// Begrenzte DOM-Fixture für statisches Original-HTML und die Brücke.
// Kein Layout, kein Browser, keine Ausführung von HTML-Ereignisattributen.
function fixture(html) {
  const observers = new Set(), htmlWrites = [], queries = [];
  function events(target) {
    const listeners = new Map();
    target.addEventListener = (type, fn, options = {}) => {
      const entry = {fn, once: !!options.once};
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(entry);
    };
    target.fire = (type, extra = {}) => {
      for (const entry of [...(listeners.get(type) || [])]) {
        if (entry.once) listeners.set(type, listeners.get(type).filter(x => x !== entry));
        entry.fn({type, target, preventDefault() {}, ...extra});
      }
    };
    target.listenerCount = type => (listeners.get(type) || []).length;
    return target;
  }
  function changed(node, type) {
    for (const observer of observers) {
      for (const {target, options} of observer.targets) {
        let current = node;
        while (current) {
          if (current === target && options[type]) {
            observer.records.push({target: node, type});
            break;
          }
          if (!options.subtree) break;
          current = current.parentNode;
        }
      }
    }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = []; this.records = []; observers.add(this); }
    observe(target, options) { this.targets.push({target, options}); }
    disconnect() { this.targets = []; this.records = []; }
  }
  function flush() {
    for (let count = 0; [...observers].some(o => o.records.length); count++) {
      assert(count < 10, 'MutationObserver muss zur Ruhe kommen');
      for (const observer of observers) {
        if (!observer.records.length) continue;
        const records = observer.records.splice(0);
        observer.callback(records);
      }
    }
  }
  function textNode(text) {
    let value = text;
    return {nodeType: 3, parentNode: null,
      get textContent() { return value; },
      set textContent(text) { value = String(text); changed(this, 'characterData'); }
    };
  }
  function descendants(node) {
    return node.children.flatMap(child => [child, ...descendants(child)]);
  }
  function simple(node, selector) {
    const first = selector.endsWith(':first-child');
    selector = selector.replace(/:first-child$/, '');
    assert.match(selector, /^(?:[a-z][\w-]*)?(?:[.#][\w-]+)*$/i, 'Unterstützter Fixture-Selektor');
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
    const id = selector.match(/#([\w-]+)/)?.[1];
    const classes = [...selector.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
    return node.nodeType === 1 && (!tag || node.tagName === tag.toUpperCase()) &&
      (!id || node.id === id) && classes.every(c => node.classList.contains(c)) &&
      (!first || node.parentNode.children[0] === node);
  }
  function matches(node, selector) {
    const parts = selector.replace(/>/g, ' > ').trim().split(/\s+/);
    let index = parts.length - 1, current = node;
    if (!simple(current, parts[index--])) return false;
    while (index >= 0) {
      current = current.parentNode;
      if (parts[index] === '>') {
        index--;
        if (!current || !simple(current, parts[index--])) return false;
      } else {
        while (current && !simple(current, parts[index])) current = current.parentNode;
        if (!current) return false;
        index--;
      }
    }
    return true;
  }
  function select(root, selector) {
    queries.push(selector);
    return descendants(root).filter(node => selector.split(',').some(s => matches(node, s)));
  }
  function element(tag) {
    const attrs = {}, classes = new Set();
    const node = events({nodeType: 1, tagName: tag.toUpperCase(), parentNode: null,
      childNodes: [], style: {}, disabled: false,
      get children() { return this.childNodes.filter(c => c.nodeType === 1); },
      get id() { return attrs.id || ''; },
      set id(value) { attrs.id = value; },
      get className() { return [...classes].join(' '); },
      set className(value) { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
      get textContent() { return this.childNodes.map(c => c.textContent).join(''); },
      set textContent(value) {
        this.childNodes.forEach(c => { c.parentNode = null; });
        this.childNodes = [];
        if (String(value)) this.appendChild(textNode(String(value)));
        changed(this, 'childList');
      },
      get innerHTML() { throw Error('innerHTML-Lesen ist in dieser Fixture nicht implementiert'); },
      set innerHTML(value) {
        htmlWrites.push(this);
        this.textContent = '';
        parse(String(value), this);
      },
      appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        this.childNodes.push(child); child.parentNode = this; changed(this, 'childList'); return child;
      },
      removeChild(child) {
        assert(this.childNodes.includes(child));
        this.childNodes = this.childNodes.filter(c => c !== child); child.parentNode = null;
        changed(this, 'childList');
      },
      setAttribute(key, value) { if (key === 'class') this.className = value; else attrs[key] = String(value); },
      getAttribute(key) { return key === 'class' ? this.className : (attrs[key] ?? null); },
      querySelectorAll(selector) { return select(this, selector); },
      querySelector(selector) { return select(this, selector)[0] || null; },
      click() { if (!this.disabled) this.fire('click'); }
    });
    node.classList = {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: name => classes.has(name),
      toggle(name, on = !classes.has(name)) { if (on) classes.add(name); else classes.delete(name); return on; }
    };
    return node;
  }
  function decode(text) {
    const entities = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0'};
    return text.replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, key) => entities[key]);
  }
  function parse(source, root) {
    const clean = source.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!doctype[^>]*>/gi, '');
    const stack = [root], voidTags = new Set(['META', 'LINK', 'BR', 'HR', 'INPUT', 'IMG']);
    for (const match of clean.matchAll(/<[^>]+>|[^<]+/g)) {
      const token = match[0];
      if (token.startsWith('</')) {
        const tag = token.slice(2, -1).trim().toUpperCase();
        assert.equal(stack.at(-1).tagName, tag, 'Fixture liest balanciertes Original-HTML');
        stack.pop();
      } else if (token.startsWith('<')) {
        const name = token.match(/^<([\w-]+)/)[1];
        const child = element(name);
        for (const attr of token.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
          child.setAttribute(attr[1], decode(attr[2] ?? attr[3]));
        }
        stack.at(-1).appendChild(child);
        if (!voidTags.has(child.tagName) && !token.endsWith('/>')) stack.push(child);
      } else {
        stack.at(-1).appendChild(textNode(decode(token)));
      }
    }
    assert.equal(stack.length, 1, 'Fixture schließt alle Elemente');
  }
  const root = element('fixture');
  parse(html, root);
  const document = events({
    readyState: 'loading',
    documentElement: root.querySelector('html'),
    head: root.querySelector('head'), body: root.querySelector('body'),
    createElement: element,
    getElementById: id => root.querySelector('#' + id),
    querySelector: selector => root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector)
  });
  queries.length = 0;
  return {document, MutationObserver, observers, flush, htmlWrites, queries,
    ready() { document.readyState = 'interactive'; document.fire('DOMContentLoaded'); },
    elements() { return descendants(root); }
  };
}

module.exports = {fixture};
