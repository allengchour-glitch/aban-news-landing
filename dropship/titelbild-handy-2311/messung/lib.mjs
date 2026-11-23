// Gemeinsame Helfer: Replay-Dokument aus Datei, alles andere echt vom CDN. Keine Drosselung.
import { startArgumente, PLAYWRIGHT } from '/home/user/aban-news-landing/tools/browser.mjs';
import { readFileSync } from 'node:fs';
export const { chromium, devices } = await import(PLAYWRIGHT);
export const BASIS = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/live2311';
export const AUS = BASIS + '/pruef_darstellung';
export const MOBIL_Q = '(max-width: 760px), (max-width: 1000px) and (hover: none) and (pointer: coarse)';

export async function browserStart() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: startArgumente() });
}

export const GERAETE = {
  handy: () => ({ ...devices['Pixel 5'], locale: 'de-CH' }),
  tab768: () => ({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-CH' }),
  tab820: () => ({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-CH' }),
  tab1000: () => ({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-CH' }),
  desk1440: () => ({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'de-CH' }),
};

/** variante: 'vor' | 'neu' | 'dvor' | 'dneu'; opts: { blockMp4, reduced, init } */
export async function oeffne(browser, geraet, variante, opts = {}) {
  const ctxOpts = { ...GERAETE[geraet]() };
  if (opts.reduced) ctxOpts.reducedMotion = 'reduce';
  const ctx = await browser.newContext(ctxOpts);
  const html = readFileSync(variante.startsWith('/') ? variante : `${BASIS}/replay_${variante}.html`);
  await ctx.route(u => u.hostname === 'luxestyle.ch' && u.pathname === '/', rt => rt.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  const mp4 = [];
  await ctx.route(u => /\.mp4/.test(u.pathname), rt => { mp4.push(rt.request().url().split('/').pop().split('?')[0]); return opts.blockMp4 ? rt.fulfill({ status: 404, body: 'x' }) : rt.continue(); });
  const p = await ctx.newPage();
  if (opts.init) await p.addInitScript(opts.init);
  await p.goto('https://luxestyle.ch/?cb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await p.evaluate(() => { const i = document.querySelector('.lx-campaign-hero__media img'); return i && i.decode ? i.decode().catch(() => {}) : null; });
  return { ctx, p, mp4 };
}

export const OHNE_UEBERLAGERUNG = `.lx-home .lx-background-hero.lx-campaign-hero::before{display:none!important}
.lx-home .lx-hero-copy,.lx-home .lx-scroll-hero__controls{visibility:hidden!important}
#shopify-section-announcement-bar, .shopify-section-group-header-group{visibility:visible}`;

export async function zustand(p) {
  return p.evaluate((MQ) => {
    const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const root = document.querySelector('luxe-scroll-hero');
    const media = document.querySelector('.lx-campaign-hero__media');
    const img = media && media.querySelector('img');
    const pic = media && media.querySelector('picture');
    const v = media && media.querySelector('video');
    const cs = e => e && getComputedStyle(e);
    const dpr = devicePixelRatio;
    let upscale = null;
    if (img && img.naturalWidth) { const b = img.getBoundingClientRect(); upscale = +(Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight) * dpr).toFixed(2); }
    return {
      vw: innerWidth, vh: innerHeight, dpr, mobilQ: matchMedia(MQ).matches,
      hoverNone: matchMedia('(hover: none)').matches, coarse: matchMedia('(pointer: coarse)').matches,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      section: r(document.querySelector('section[data-scroll-stage]')), media: r(media),
      picture: pic ? { display: cs(pic).display, rect: r(pic) } : null,
      img: img && { rect: r(img), natural: [img.naturalWidth, img.naturalHeight], current: (img.currentSrc || '').split('/').pop(), fit: cs(img).objectFit, pos: cs(img).objectPosition, complete: img.complete, display: cs(img).display, position: cs(img).position },
      upscale,
      video: v && { rect: r(v), pos: cs(v).objectPosition, fit: cs(v).objectFit, clip: cs(v).clipPath, display: cs(v).display, opacity: cs(v).opacity, transition: cs(v).transition, poster: v.getAttribute('poster'), src: (v.getAttribute('src') || '').split('/').pop().split('?')[0], paused: v.paused, readyState: v.readyState, t: +v.currentTime.toFixed(3), vw: v.videoWidth, vh: v.videoHeight, error: v.error && v.error.code },
      hasFrame: root ? root.hasAttribute('data-has-frame') : null,
      controlsHidden: (document.querySelector('[data-scroll-controls]') || {}).hidden,
      moduleDefined: !!customElements.get('luxe-scroll-hero'),
    };
  }, MOBIL_Q);
}
