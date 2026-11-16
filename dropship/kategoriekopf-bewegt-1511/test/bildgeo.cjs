// W1: Ausschnitt der Kopffotos. Im Browser: Ken Burns auf Zeit 0 einfrieren, Text/Knopf/Glanz ausblenden, Geometrie lesen.
// In Node: zwei PNG pixelgenau vergleichen (ffmpeg -> rgb24).
const { spawnSync } = require('child_process');
// ruhig=true: nach dem Einfrieren auf Zeit 0 die Animationsebenen ausschalten (gleiche Lage, aber ohne Glaettung der Grafikebene).
const VORBEREITEN = async (ruhig) => {
  const im = [...document.querySelectorAll('.lx-kk__bilder img')];
  await Promise.all(im.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 8000); }))));
  await Promise.all(im.map((i) => (i.decode ? i.decode().catch(() => null) : null)));
  for (const a of document.getAnimations()) { const n = a.animationName || ''; if (/^lxkb-[a-d]$/.test(n)) { a.pause(); a.currentTime = 0; } }
  const st = document.createElement('style'); st.id = 'lx-w1-test';
  st.textContent = '.lx-kk__text,.lx-kb-knopf{visibility:hidden!important}.lx-kk::after{display:none!important}' + (ruhig ? '.lx-kk .lx-kk__bilder,.lx-kk .lx-kk__bilder img{animation:none!important;will-change:auto!important;backface-visibility:visible!important}' : '');
  document.head.appendChild(st);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const ra = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left * 100) / 100, Math.round((b.top + scrollY) * 100) / 100, Math.round(b.width * 100) / 100, Math.round(b.height * 100) / 100]; };
  const k = document.querySelector('.lx-kk');
  return { kk: k ? ra(k) : null, bilder: [...document.querySelectorAll('.lx-kk__bilder picture')].map((p) => { const i = p.querySelector('img'); return { pic: ra(p), img: i ? ra(i) : null, tf: i ? getComputedStyle(i).transform : null, src: i ? (i.currentSrc || '').split('/').pop().split('?')[0].slice(0, 40) : null }; }), opacity: document.querySelector('.lx-kk__bilder') ? getComputedStyle(document.querySelector('.lx-kk__bilder')).opacity : null };
};
function roh(png) { const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 29 }); return r.stdout; }
function pixelVergleich(a, b) {
  const A = roh(a), B = roh(b);
  if (!A || !B || A.length !== B.length) return { gleich: false, grund: 'Groesse', a: A && A.length, b: B && B.length };
  let n = 0, max = 0;
  for (let i = 0; i < A.length; i += 3) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (d) { n++; if (d > max) max = d; } }
  return { gleich: n === 0, pixel: A.length / 3, abweichend: n, anteil: +(n / (A.length / 3)).toFixed(6), max };
}
function geoGleich(g0, g1) {
  if (!g0 || !g1 || g0.bilder.length !== g1.bilder.length) return false;
  return g0.bilder.every((x, i) => JSON.stringify(x.pic) === JSON.stringify(g1.bilder[i].pic) && JSON.stringify(x.img) === JSON.stringify(g1.bilder[i].img));
}
module.exports = { VORBEREITEN, pixelVergleich, geoGleich };
