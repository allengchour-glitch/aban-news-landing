import { Component } from '@theme/component';

/** R272 local integration candidate. Requires real-media and native preview acceptance. */
export function scrollProgress(rect, stageHeight, stickyTop = 0) {
  const distance = rect.height - stageHeight;
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  return Math.min(1, Math.max(0, (stickyTop - rect.top) / distance));
}

export function timeAtProgress(progress, duration) {
  if (!Number.isFinite(progress) || !Number.isFinite(duration) || duration <= 0) return null;
  return Math.min(1, Math.max(0, progress)) * Math.max(0, duration - 0.001);
}

/**
 * Each owner must supply translated labels in data-* and a verified film URL.
 * Returns cleanup for theme section unloading. Uses native APIs, never play().
 */
export function mountScrollHero(root, options = {}) {
  const stage = root?.querySelector('[data-scroll-stage]');
  const video = root?.querySelector('[data-scroll-video]');
  const controls = root?.querySelector('[data-scroll-controls]');
  const hold = root?.querySelector('[data-scroll-hold]');
  const range = root?.querySelector('[data-scroll-range]');
  const status = root?.querySelector('[data-scroll-status]');
  const labels = root?.dataset;
  const noop = () => {};
  if (!stage || !video || !controls || !hold || !range || !status || !video.dataset.src ||
      !labels.holdLabel || !labels.resumeLabel || !labels.scrollLabel ||
      !labels.pausedLabel || !labels.manualLabel || !labels.posterLabel ||
      !window.IntersectionObserver || !window.ResizeObserver || !window.matchMedia) return noop;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const controller = new AbortController();
  const { signal } = controller;
  let raf = 0;
  let inView = false;
  let metadata = video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0;
  let failed = false;
  let frozen = false;
  let manual = null;
  let destroyed = false;
  let lastMode = '';
  const weak = () => options.forcePoster === true || connection?.saveData === true ||
    /^(slow-)?2g$/.test(connection?.effectiveType || '') ||
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 2);
  const eligible = () => !destroyed && !failed && !reduced.matches && !weak();
  const active = () => eligible() && inView && !document.hidden;
  const mode = name => {
    root.dataset.scrollMode = name;
    if (name !== lastMode) {
      status.textContent = name === 'poster' ? labels.posterLabel :
        name === 'manual' ? labels.manualLabel :
        name === 'paused' ? labels.pausedLabel : labels.scrollLabel;
      lastMode = name;
    }
    hold.setAttribute('aria-pressed', String(frozen));
    hold.textContent = frozen ? labels.resumeLabel : labels.holdLabel;
  };
  const progress = () => {
    const rect = root.getBoundingClientRect();
    const stickyTop = Number.parseFloat(getComputedStyle(root).getPropertyValue('--lx-scroll-sticky-top')) || 0;
    if (root.hasAttribute('data-scroll-tall')) {
      const travel = Math.max(1, video.parentElement?.offsetHeight || stage.offsetHeight);
      return Math.min(1, Math.max(0, (stickyTop - rect.top) / travel));
    }
    return scrollProgress(rect, stage.offsetHeight, stickyTop);
  };
  const poster = () => {
    if (controls.contains(document.activeElement) && !document.hidden) root.focus({ preventScroll: true });
    delete root.dataset.hasFrame;
    if (!eligible()) delete root.dataset.scrollEnhanced;
    controls.hidden = true;
    video.pause();
    mode('poster');
  };
  const schedule = () => { if (!raf && !destroyed) raf = requestAnimationFrame(update); };
  const update = () => {
    raf = 0;
    if (!active()) {
      poster();
      return;
    }
    if (!video.hasAttribute('src')) {
      video.src = matchMedia('(max-width: 760px)').matches && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src;
      video.preload = 'metadata';
      video.load();
    }
    if (!metadata || video.seeking) return; // seeked retries the latest position.
    const stickyTop = Number.parseFloat(getComputedStyle(root).getPropertyValue('--lx-scroll-sticky-top')) || 0;
    root.toggleAttribute('data-scroll-tall', stage.offsetHeight > innerHeight - stickyTop - 16);
    root.dataset.scrollEnhanced = 'true';
    controls.hidden = false;
    if (video.readyState >= 2) root.dataset.hasFrame = 'true';
    mode(frozen ? manual === null ? 'paused' : 'manual' : 'scroll');
    if (frozen && manual === null) return;
    const p = frozen ? manual : progress();
    const target = timeAtProgress(p, video.duration);
    if (target === null) return;
    if (document.activeElement !== range) range.value = String(Math.round(p * 1000));
    range.setAttribute('aria-valuetext', new Intl.NumberFormat(document.documentElement.lang || undefined,
      { style: 'percent', maximumFractionDigits: 0 }).format(p));
    if (Math.abs(video.currentTime - target) >= 0.04) {
      try { video.currentTime = target; } catch { failed = true; poster(); }
    }
  };
  video.muted = true;
  video.playsInline = true;
  video.autoplay = false;
  video.loop = false;
  video.pause();
  controls.hidden = true;
  mode('poster');
  video.addEventListener('loadedmetadata', () => {
    metadata = Number.isFinite(video.duration) && video.duration > 0;
    if (!metadata) failed = true;
    schedule();
  }, { signal });
  const frameReady = () => { if (active() && video.readyState >= 2) root.dataset.hasFrame = 'true'; schedule(); };
  video.addEventListener('loadeddata', frameReady, { signal });
  video.addEventListener('seeked', frameReady, { signal });
  video.addEventListener('error', () => { failed = true; poster(); }, { signal });
  hold.addEventListener('click', () => { frozen = !frozen; manual = null; mode(frozen ? 'paused' : 'scroll'); schedule(); }, { signal });
  range.addEventListener('input', () => {
    frozen = true;
    manual = Math.min(1, Math.max(0, Number(range.value) / 1000));
    mode('manual'); schedule();
  }, { signal });
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', schedule, { signal });
  reduced.addEventListener('change', schedule, { signal });
  connection?.addEventListener?.('change', schedule, { signal });
  const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; schedule(); }, { threshold: 0.05 });
  const resize = new ResizeObserver(schedule);
  intersection.observe(root);
  resize.observe(root);
  resize.observe(stage);
  schedule();
  return () => {
    destroyed = true;
    controller.abort();
    intersection.disconnect();
    resize.disconnect();
    cancelAnimationFrame(raf);
    video.pause();
    delete root.dataset.hasFrame;
    delete root.dataset.scrollEnhanced;
    controls.hidden = true;
    mode('poster');
  };
}


/** Native theme owner: clean resources before updates and disconnects. */
class LuxeScrollHero extends Component {
  #cleanup = null;
  #mountQueued = false;

  connectedCallback() {
    super.connectedCallback();
    this.#queueMount();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#queueMount();
  }

  disconnectedCallback() {
    this.#cleanup?.();
    this.#cleanup = null;
    super.disconnectedCallback();
  }

  #queueMount() {
    this.#cleanup?.();
    this.#cleanup = null;
    if (this.#mountQueued) return;
    this.#mountQueued = true;
    queueMicrotask(() => {
      this.#mountQueued = false;
      if (this.isConnected) this.#cleanup = mountScrollHero(this);
    });
  }
}

if (!customElements.get('luxe-scroll-hero')) customElements.define('luxe-scroll-hero', LuxeScrollHero);
