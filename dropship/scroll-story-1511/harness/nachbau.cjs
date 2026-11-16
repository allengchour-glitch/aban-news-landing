// Nachbau der Testvorlage im Browser: gesicherte echte Startseite + lokal gerenderter Abschnitt (vor luxe_reviews eingefügt;
// das Inline-Skript des Abschnitts setzt ihn selbst hinter den Hero). Theme-Dateien lx-story.* und Videos/Poster kommen lokal,
// alle übrigen Dateien vom echten CDN, einmal geladen und auf Platte zwischengespeichert (keine Storefront-Seitenaufrufe).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const HIER = __dirname, BASIS = path.join(HIER, '..');
const CACHE = path.join(HIER, 'cache'); fs.mkdirSync(CACHE, { recursive: true });
const ERLAUBT = /^https:\/\/(luxestyle\.ch\/cdn\/|cdn\.shopify\.com\/|fonts\.(googleapis|gstatic)\.com\/)/;
const START = 'https://luxestyle.ch/?nachbau';

function seite(storyHtml, opt = {}) {
  opt = opt || {};
  let h = fs.readFileSync(path.join(HIER, 'start_live.html'), 'utf8');
  const marke = '<div id="shopify-section-template--34138457768327__luxe_reviews"';
  if (!h.includes(marke)) throw new Error('Marke luxe_reviews fehlt');
  if (opt.ohneStory) return h;
  // {% stylesheet %}-Inhalte (Shopify: kompilierte Theme-Stile im <head>) aus dem Abschnitt holen und in den <head> setzen.
  const stile = [];
  const holen = (x) => x.replace(/<!--LXCSS-->([\s\S]*?)<!--\/LXCSS-->/g, (m, c) => { stile.push(c); return ''; });
  storyHtml = holen(storyHtml);
  h = h.replace(marke, `<div id="shopify-section-template--34138457768327__lx_story" class="shopify-section lx-story-abschnitt">${storyHtml}</div>\n` + marke);
  if (!opt.ohnePlatz) {
    const m2 = '<div id="shopify-section-template--34138457768327__luxe_home"';
    if (!h.includes(m2)) throw new Error('Marke luxe_home fehlt');
    const platz = require('child_process').execFileSync(process.execPath, [path.join(BASIS, 'harness', 'render.mjs'), opt.theme || path.join(BASIS, 'theme'), '-', 'platz'], { encoding: 'utf8' });
    h = h.replace(m2, `<div id="shopify-section-template--34138457768327__lx_story_platz" class="shopify-section">${holen(platz)}</div>\n` + m2);
  }
  if (stile.length && !opt.stilImBody) { if (!h.includes('</head>')) throw new Error('</head> fehlt'); h = h.replace('</head>', `<style data-lx-kompiliert>${stile.join('\n')}</style></head>`); }
  return h;
}

async function einrichten(page, storyHtml, opt = {}) {
  const theme = opt.theme || path.join(BASIS, 'theme');
  const stat = { videoBytes: 0, videoAnfragen: [], posterAnfragen: [], storyDateien: [] };
  page.__stat = stat;
  await page.route('**/*', async (route) => {
    const req = route.request(), url = req.url();
    if (url.startsWith(START)) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: seite(storyHtml, opt) });
    const m = url.match(/\/assets\/(lx-story\.(?:js|css))/);
    if (m) { stat.storyDateien.push(m[1]); const p = path.join(theme, 'assets', m[1]); return route.fulfill({ status: 200, contentType: m[1].endsWith('.js') ? 'application/javascript' : 'text/css', body: fs.readFileSync(p), headers: { 'Cache-Control': 'no-store' } }); }
    const k = url.match(/\/files\/(lx-story-[a-z0-9-]+\.(mp4|webp))/);
    if (k) {
      const p = path.join(BASIS, 'kodiert', k[1]);
      if (!fs.existsSync(p)) return route.fulfill({ status: 404, body: '' });
      if (opt.videoFehler && k[2] === 'mp4') return route.fulfill({ status: 500, body: '' });
      const buf = fs.readFileSync(p);
      if (k[2] === 'mp4') {
        if (opt.videoVerzoegerung) await new Promise((r) => setTimeout(r, opt.videoVerzoegerung));
        stat.videoAnfragen.push({ datei: k[1], zeit: Date.now() });
        const range = req.headers()['range'];
        if (range) {
          const [a, b] = range.replace('bytes=', '').split('-');
          const s = Number(a), e = b ? Math.min(Number(b), buf.length - 1) : buf.length - 1;
          stat.videoBytes += e - s + 1;
          return route.fulfill({ status: 206, contentType: 'video/mp4', body: buf.subarray(s, e + 1), headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${s}-${e}/${buf.length}` } });
        }
        stat.videoBytes += buf.length;
        return route.fulfill({ status: 200, contentType: 'video/mp4', body: buf, headers: { 'Accept-Ranges': 'bytes' } });
      }
      stat.posterAnfragen.push(k[1]);
      return route.fulfill({ status: 200, contentType: 'image/webp', body: buf });
    }
    if (!ERLAUBT.test(url)) return route.abort();
    if (/\/(hero|luxe-hero)[^/]*\.mp4/.test(url) && opt.ohneHeroVideo) return route.abort();
    const key = crypto.createHash('sha1').update(url + '|' + (req.headers()['accept'] || '').slice(0, 20)).digest('hex');
    const f = path.join(CACHE, key);
    if (fs.existsSync(f + '.bin')) { const meta = JSON.parse(fs.readFileSync(f + '.json', 'utf8')); return route.fulfill({ status: meta.status, headers: meta.headers, body: fs.readFileSync(f + '.bin') }); }
    try {
      const resp = await route.fetch();
      const body = await resp.body();
      const headers = { 'content-type': resp.headers()['content-type'] || 'application/octet-stream', 'access-control-allow-origin': '*' };
      if (resp.status() === 200 && body.length < 8e6) { fs.writeFileSync(f + '.bin', body); fs.writeFileSync(f + '.json', JSON.stringify({ status: 200, headers })); }
      return route.fulfill({ status: resp.status(), headers, body });
    } catch (e) { return route.abort(); }
  });
  return stat;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
function kontext(b, form, extra = {}) {
  const handy = form === 'handy';
  return b.newContext(Object.assign({ viewport: handy ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: handy ? UAM : UA, locale: 'de-CH', isMobile: handy, hasTouch: handy }, extra));
}
module.exports = { einrichten, kontext, START, seite };
