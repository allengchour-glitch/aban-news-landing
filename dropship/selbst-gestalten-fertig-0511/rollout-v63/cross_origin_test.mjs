/** Echte Browser-Gegenprobe: Shopify-fremder Ursprung lädt v6.3-Script und Karten-JSON. */
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwright } from '../../../pod/v6/test/lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, '../../../');
const MAPS = resolve(REPO, 'pod/v6/maps');
const EDITOR_NAME = 'lspod-designer-v6-6.3.0.js';
const editor = readFileSync(resolve(REPO, 'pod/v6', EDITOR_NAME));
const mapName = readdirSync(MAPS).filter((name) => name.endsWith('.karte.json')).sort()[0];
if (!mapName) throw new Error('Keine öffentliche v6-Karte für die Cross-Origin-Prüfung');
const map = readFileSync(resolve(MAPS, mapName));
const headersText = readFileSync(resolve(REPO, '_headers'), 'utf8');
const blocks = new Map();
let current = null;
for (const raw of headersText.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  if (!/^\s/.test(raw)) { current = line; blocks.set(current, []); continue; }
  if (current) blocks.get(current).push(line);
}
const pod = blocks.get('/pod/v6/*') || [];
const editorHeaders = blocks.get('/pod/v6/lspod-designer-v6-*.js') || [];
const exaktEinmal = (lines, value) => lines.filter((line) => line === value).length === 1;
if (!exaktEinmal(pod, '! Cross-Origin-Resource-Policy')
  || !exaktEinmal(pod, 'Access-Control-Allow-Origin: *')
  || !exaktEinmal(pod, 'Cross-Origin-Resource-Policy: cross-origin')) {
  throw new Error('_headers entfernt den globalen CORP-Wert für /pod/v6/* nicht eindeutig');
}
if (!exaktEinmal(editorHeaders, '! Cache-Control')
  || !exaktEinmal(editorHeaders, 'Cache-Control: public, max-age=31536000, immutable')
  || editorHeaders.some((line) => /^(?:Access-Control-Allow-Origin|Cross-Origin-Resource-Policy):/.test(line))) {
  throw new Error('_headers verdoppelt Editor-CORS/CORP oder den Cache-Control-Wert');
}

function listen(server, host = '127.0.0.1') {
  return new Promise((ok, fail) => { server.once('error', fail); server.listen(0, host, () => ok(server.address().port)); });
}
function close(server) { return new Promise((ok) => server.close(ok)); }
const cors = { 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'no-store' };
const assetServer = createServer((req, res) => {
  if (req.url === `/pod/v6/${EDITOR_NAME}`) {
    res.writeHead(200, { ...cors, 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(editor); return;
  }
  if (req.url === `/pod/v6/maps/${mapName}`) {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' }); res.end(map); return;
  }
  res.writeHead(404, cors); res.end('nicht gefunden');
});
const assetPort = await listen(assetServer);
const assetBase = `http://127.0.0.1:${assetPort}`;
const pageServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="de"><head><script src="${assetBase}/pod/v6/${EDITOR_NAME}"></script></head><body>Cross-Origin-Test</body></html>`);
});
const pagePort = await listen(pageServer);

const { chromium } = playwright();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  // localhost und 127.0.0.1 sind verschiedene Sites; ein globales CORP same-site
  // würde diesen klassischen Script-Load blockieren.
  await page.goto(`http://localhost:${pagePort}/`, { waitUntil: 'load' });
  const version = await page.evaluate(() => window.LSPOD6?.version || null);
  if (version !== '6.3.0') throw new Error(`Cross-Origin-Script nicht geladen (Version ${version})`);
  const fetched = await page.evaluate(async (url) => {
    const response = await fetch(url);
    return { ok: response.ok, body: await response.json() };
  }, `${assetBase}/pod/v6/maps/${mapName}`);
  if (!fetched.ok || fetched.body?.schema !== 1) throw new Error('Cross-Origin-Karte nicht als Schema 1 gelesen');
  if (errors.length) throw new Error(`Browserfehler: ${errors.join(' | ')}`);
  console.log(`CROSS_ORIGIN_OK script=${EDITOR_NAME} map=${mapName}`);
} finally {
  await page.close(); await browser.close(); await close(pageServer); await close(assetServer);
}
