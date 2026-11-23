// Logik-Simulation (keine Browser-Messung): echter Starter-Code aus der neuen Liquid-Datei + echtes mountScrollHero()
// aus luxe-scroll-hero.js gegen Attrappen fuer video/img/IntersectionObserver. Prueft Reihenfolgen/Rennen.
import fs from 'node:fs'; import vm from 'node:vm';
const D = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/live2311/';
const liq = fs.readFileSync(D + 'neu1/sections/luxe-edit-home.liquid', 'utf8');
const sa = liq.indexOf('(function () {\n        var s = document.currentScript'); const sb = liq.indexOf('})();', sa) + 5;
const STARTER = liq.slice(sa, sb);
let MOD = fs.readFileSync(D + 'live/assets/luxe-scroll-hero.js', 'utf8');
MOD = MOD.replace(/^import .*$/m, '').replace('export function mountScrollHero', 'function mountScrollHero');
MOD = MOD.slice(0, MOD.indexOf('class LuxeScrollHero')) + '\nglobalThis.mountScrollHero = mountScrollHero;';
const tick = () => new Promise(r => setTimeout(r, 0));

function welt({ blockAutoplay = false, mobile = true, imBild = true } = {}) {
  let definiert = false;
  const log = [];
  class Vid extends EventTarget {
    constructor() { super(); this.attrs = { 'data-src': 'https://cdn/desk.mp4', 'data-src-mobile': 'https://cdn/handy.mp4?v=1' }; this.dataset = { src: 'https://cdn/desk.mp4', srcMobile: 'https://cdn/handy.mp4?v=1' }; this.paused = true; this.preload = 'none'; this.readyState = 0; this.error = null; this._pending = []; this.srcSets = 0; this.failNext = false; }
    hasAttribute(n) { return n in this.attrs; } getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }
    setAttribute(n, v) { this.attrs[n] = String(v); if (n === 'src') { this.srcSets++; log.push('src=' + v); this._reset(); } }
    removeAttribute(n) { delete this.attrs[n]; if (n === 'src') log.push('src entfernt'); }
    _reset() { this.readyState = 0; this.error = null; for (const p of this._pending.splice(0)) p.rej(Object.assign(new Error('abort'), { name: 'AbortError' })); }
    load() { this._reset(); }
    play() {
      if (blockAutoplay) return Promise.reject(Object.assign(new Error('na'), { name: 'NotAllowedError' }));
      this.paused = false;
      return new Promise((res, rej) => { this._pending.push({ res, rej }); setTimeout(() => this._daten(), 5); });
    }
    _daten() {
      if (!this.hasAttribute('src') || this.paused) return;
      if (this.failNext) { this.failNext = false; this.error = { code: 4 }; for (const p of this._pending.splice(0)) p.rej(Object.assign(new Error('ns'), { name: 'NotSupportedError' })); this.dispatchEvent(new Event('error')); return; }
      this.readyState = 4; for (const p of this._pending.splice(0)) p.res(); this.dispatchEvent(new Event('playing'));
    }
    pause() { if (!this.paused) { this.paused = true; for (const p of this._pending.splice(0)) p.rej(Object.assign(new Error('abort'), { name: 'AbortError' })); this.dispatchEvent(new Event('pause')); } }
  }
  const video = new Vid();
  const img = Object.assign(new EventTarget(), { complete: false });
  const button = Object.assign(new EventTarget(), { textContent: '' });
  const controls = { hidden: true, querySelector: () => button, contains: () => false };
  const stage = { querySelector: (s) => s === '[data-scroll-video]' ? video : s === '[data-scroll-controls]' ? controls : null };
  const root = { localName: 'luxe-scroll-hero', dataset: { holdLabel: 'Pause', resumeLabel: 'Abspielen' }, focus() {}, getBoundingClientRect: () => imBild ? { top: 16, bottom: 503 } : { top: -1500, bottom: -1013 },
    querySelector: (s) => s === '[data-scroll-stage]' ? stage : s === '[data-scroll-video]' ? video : s === '.lx-campaign-hero__media img' ? img : null };
  const script = { previousElementSibling: root };
  let ioCb = null;
  const mq = (q) => ({ matches: q.includes('max-width: 760px') ? mobile : false, addEventListener() {} });
  const docT = new EventTarget();
  const document = Object.assign(docT, { hidden: false, currentScript: script, activeElement: null });
  const ctx = { console, setTimeout, clearTimeout, queueMicrotask, AbortController, Promise, Number, isFinite, Event,
    matchMedia: mq, document, innerHeight: 851, scrollY: 0, HTMLMediaElement: { HAVE_FUTURE_DATA: 3 },
    navigator: { connection: { effectiveType: '4g', saveData: false, addEventListener() {} }, deviceMemory: 8 },
    IntersectionObserver: class { constructor(cb) { ioCb = cb; } observe() {} disconnect() {} }, customElements: { get: (n) => definiert && n === 'luxe-scroll-hero' ? {} : undefined } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(MOD, ctx);
  const starter = () => vm.runInContext(STARTER, ctx);
  const mount = () => { definiert = true; return ctx.mountScrollHero(root); };
  const io = (inView) => ioCb([{ intersectionRatio: inView ? 1 : 0 }]);
  const zustand = () => ({ src: video.getAttribute('src'), srcSets: video.srcSets, paused: video.paused, hasFrame: !!root.dataset.hasFrame, controlsHidden: controls.hidden, button: button.textContent });
  return { video, img, root, starter, mount, io, zustand, log, ctx };
}
const fall = async (name, f) => { const r = await f(); console.log(name.padEnd(62), JSON.stringify(r)); };

await fall('S1 Normal: Starter, img load, Modul, IO sichtbar', async () => {
  const w = welt(); w.starter(); w.img.dispatchEvent(new Event('load')); await tick(); await new Promise(r => setTimeout(r, 20));
  w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S2 Modul zuerst, Held NICHT im Bild (Scroll), dann img load', async () => {
  const w = welt(); w.starter(); w.mount(); w.io(false); await tick();
  const vorher = w.zustand(); w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 20));
  return { vorher_src: vorher.src, nachher: w.zustand() };
});
await fall('S3 Modul zuerst, Video-Fehler -> usePoster, dann img load', async () => {
  const w = welt(); w.starter(); w.video.failNext = true; w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20));
  const nachFehler = w.zustand(); w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 20));
  return { nachFehler_src: nachFehler.src, nachImgLoad: w.zustand(), log: w.log };
});
await fall('S4 Starter, Video-Fehler VOR Modul, dann Modul+IO', async () => {
  const w = welt(); w.starter(); w.video.failNext = true; w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 20));
  w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S4b live-Vergleich: nur Modul, Video-Fehler', async () => {
  const w = welt(); w.video.failNext = true; w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S5 Autoplay gesperrt: Starter, img load, Modul, IO', async () => {
  const w = welt({ blockAutoplay: true }); w.starter(); w.img.dispatchEvent(new Event('load')); await tick();
  w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S6 Modul zuerst, Held sichtbar, dann img load (kein Doppelstart?)', async () => {
  const w = welt(); w.starter(); w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20));
  w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S7 Starter spielt, Modul mountet, Nutzer drueckt Pause', async () => {
  const w = welt(); w.starter(); w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 20));
  w.mount(); w.io(true); await tick(); (w.root.querySelector('[data-scroll-stage]').querySelector('[data-scroll-controls]').querySelector()).dispatchEvent(new Event('click'));
  await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S8 Starter, play() haengt (keine Daten), Modul IO unsichtbar', async () => {
  const w = welt(); w.starter(); w.img.dispatchEvent(new Event('load')); w.mount(); w.io(false); await new Promise(r => setTimeout(r, 20)); return w.zustand();
});
await fall('S9 Starter, Held beim img load NICHT im Bild (Scroll-Wiederherstellung)', async () => {
  const w = welt({ imBild: false }); w.starter(); w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 20));
  const vorModul = w.zustand(); w.mount(); w.io(false); await new Promise(r => setTimeout(r, 20)); return { vorModul, nachModul: w.zustand() };
});
await fall('S10 Starter, Video spielt, Modul kommt nie (10-s-Waechter, Zeit gerafft)', async () => {
  const w = welt(); const st = w.ctx.setTimeout; w.ctx.setTimeout = (f, ms) => st(f, ms >= 10000 ? 30 : ms);
  w.starter(); w.img.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 15)); const spielt = w.zustand();
  await new Promise(r => setTimeout(r, 60)); const nach = w.zustand(); w.mount(); w.io(true); await new Promise(r => setTimeout(r, 20));
  return { spielt, nach10s: nach, modulSpaet: w.zustand() };
});
