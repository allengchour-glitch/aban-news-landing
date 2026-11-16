// Gemeinsame Messfunktionen (laufen im Browser).
const ZUSTAND = () => {
  const k = document.querySelector('.lx-kk');
  const st = k && k.querySelector('.lx-kb');
  const v = st && st.querySelector('video');
  const b = k && k.querySelector('.lx-kb-knopf');
  const img = k && k.querySelector('.lx-kk__bilder img');
  const bilder = k && k.querySelector('.lx-kk__bilder');
  const clip = st && st.querySelector('.lx-kb__clip');
  const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
  const ra = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const nachKopf = document.querySelectorAll('.lx-kb[hidden], template.lx-kb-vorlage').length;
  return {
    klassen: k ? [...k.classList].filter((c) => /lx-kb/.test(c)) : null,
    buehneImKopf: !!st, buehneVersteckt: nachKopf, video: v ? { paused: v.paused, t: +v.currentTime.toFixed(2), rs: v.readyState, frames: v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality().totalVideoFrames : null, src: (v.currentSrc || v.src).split('/').pop().split('?')[0], op: cs(v, 'opacity'), breite: v.videoWidth } : null,
    knopf: b ? { hidden: b.hidden, label: b.getAttribute('aria-label'), sichtbar: b.getBoundingClientRect().width > 0 && cs(b, 'display') !== 'none', r: ra(b) } : null,
    fotoTransform: cs(img, 'transform'), fotoAnim: cs(img, 'animationName'), fotoPlay: cs(img, 'animationPlayState'), bilderTranslate: cs(bilder, 'translate'), bilderOpacity: cs(bilder, 'opacity'),
    clipTranslate: cs(clip, 'translate'), clipR: ra(clip), poster: st ? [...st.querySelectorAll('img')].map((i) => ({ ok: i.complete && i.naturalWidth > 1, src: (i.currentSrc || '').split('/').pop().split('?')[0] })) : null,
    nachher: k ? (() => { const a = getComputedStyle(k, '::after'); return { content: a.content, op: a.opacity, anim: a.animationName, transform: a.transform }; })() : null,
    textPadR: cs(k && k.querySelector('.lx-kk__text'), 'paddingRight'), imKopf: !!(k && k.querySelector('.lx-kb')),
    textUeber: k ? Math.round(k.querySelector('.lx-kk__text').getBoundingClientRect().bottom - k.getBoundingClientRect().bottom) : null,
    textRechts: k ? (() => { let m = 0; for (const el of k.querySelectorAll('.lx-kk__text h1, .lx-kk__anriss, .lx-kk__beschr summary')) { if (el.closest('details:not([open])') && !el.matches('summary')) continue; const rg = document.createRange(); rg.selectNodeContents(el); for (const r of rg.getClientRects()) if (r.width > 0) m = Math.max(m, r.right); } return Math.round(m); })() : null,
  };
};
module.exports = { ZUSTAND };
