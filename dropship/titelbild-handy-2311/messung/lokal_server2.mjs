// Wie lokal_server.mjs, aber zweistufig wie live beobachtet: Kopf (bis </head>) nach t1 ms, Rest nach t2 ms (Brotli-Strom mit Flush).
// Live gemessen (Browser, 4G-Drosselung): respStart 188-366 ms, respEnd 927-1418 ms, Hero-Bild-Abruf ab 937-1524 ms.
import https from 'node:https'; import { readFileSync } from 'node:fs'; import zlib from 'node:zlib';
const BASIS = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/live2311/';
const port = +(process.argv[2] || 8444), t1 = +(process.argv[3] || 200), t2 = +(process.argv[4] || 850);
https.createServer({ key: readFileSync(BASIS + 'skeptiker/tls/key.pem'), cert: readFileSync(BASIS + 'skeptiker/tls/cert.pem') }, (req, res) => {
  const m = req.url.match(/^\/(replay_[a-z]+\.html)/); if (!m) { res.writeHead(404); return res.end(); }
  const d = readFileSync(BASIS + m[1]); const cut = d.indexOf('</head>') + 7;
  const br = zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
  setTimeout(() => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'br', 'cache-control': 'no-store' });
    br.pipe(res); br.write(d.subarray(0, cut)); br.flush();
    setTimeout(() => { br.end(d.subarray(cut)); }, t2 - t1);
  }, t1);
}).listen(port, '127.0.0.1', () => console.log('lauscht', port, 't1', t1, 't2', t2));
