// T4: Zustaende ohne laufendes Video (Handy): reduced motion, Autoplay gesperrt (iOS-Stromsparmodus nachgebildet),
// Videofehler vor Modulstart (404). Dazu Barrierefreiheit: aria-Baum + fokussierbare Elemente im Hero.
import { browserStart, oeffne, zustand, AUS } from './lib.mjs';
const b = await browserStart();
const sel = 'section[data-scroll-stage]';
const AUTOPLAY_SPERRE = () => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('The request is not allowed by the user agent', 'NotAllowedError')); }; };
const faelle = [
  ['reduziert', { reduced: true }],
  ['autoplay_gesperrt', { init: AUTOPLAY_SPERRE }],
  ['fehler404', { blockMp4: true }],
  ['normal', {}],
];
for (const [name, opts] of faelle) for (const v of ['vor', 'fin']) {
  const { ctx, p, mp4 } = await oeffne(b, 'handy', v, opts);
  await p.waitForTimeout(6000);
  const z = await zustand(p);
  const a11y = await p.evaluate(() => {
    const s = document.querySelector('section[data-scroll-stage]');
    const fokus = [...s.querySelectorAll('a[href],button,input,select,textarea,video,[tabindex]')]
      .filter(e => e.tabIndex >= 0 && !e.disabled && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'))
      .map(e => e.tagName + (e.textContent.trim() ? ':' + e.textContent.trim().slice(0, 20) : ''));
    const media = s.querySelector('.lx-campaign-hero__media');
    return { mediaAriaHidden: media.getAttribute('aria-hidden'), fokus, pictureCount: s.querySelectorAll('picture').length };
  });
  const aria = await p.locator(sel).ariaSnapshot();
  console.log(name, v, JSON.stringify({ hasFrame: z.hasFrame, controlsHidden: z.controlsHidden, img: z.img.current, video: { display: z.video.display, opacity: z.video.opacity, src: z.video.src, paused: z.video.paused, error: z.video.error, poster: !!z.video.poster, transition: z.video.transition }, mp4, ...a11y }));
  console.log('ARIA', name, v, JSON.stringify(aria));
  await p.locator(sel).screenshot({ path: `${AUS}/t4_${name}_${v}.png` });
  if (name === 'fehler404' || name === 'autoplay_gesperrt') {
    // Tastatur: Schaltflaeche erreichbar? Was passiert beim Druecken?
    const btn = p.locator('[data-scroll-hold]');
    if (!(await p.evaluate(() => document.querySelector('[data-scroll-controls]').hidden))) {
      await btn.focus();
      const vorher = await btn.textContent();
      await p.locator('[data-scroll-controls]').screenshot({ path: `${AUS}/t4_${name}_${v}_knopf.png` }).catch(() => {});
      await btn.press('Enter'); await p.waitForTimeout(1500);
      const nachher = await p.evaluate(() => { const x = document.querySelector('[data-scroll-video]'); return { text: document.querySelector('[data-scroll-hold]').textContent, paused: x.paused, error: x.error && x.error.code, hasFrame: document.querySelector('luxe-scroll-hero').hasAttribute('data-has-frame') }; });
      console.log('KNOPF', name, v, JSON.stringify({ vorher, nachher }));
    } else console.log('KNOPF', name, v, 'verborgen');
  }
  await ctx.close();
}
await b.close();
