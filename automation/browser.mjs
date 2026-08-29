#!/usr/bin/env node
/**
 * browser.mjs — ein Browser, den diese Session wirklich bedienen kann.
 *
 * WARUM ES DAS BRAUCHT:
 * Fast jeder offene Punkt dieses Projekts haengt an derselben Sache — eine Seite, auf der
 * jemand eingeloggt klicken muss: TikTok-Upload, Klaviyo-Kontodaten, Google Merchant,
 * Judge.me-Einstellungen. Fuer keine davon gibt es einen Schreib-Endpunkt (bei Judge.me in
 * zehn Sondierungen belegt). Ein bedienbarer Browser raeumt alle auf einmal ab.
 *
 * DAS HINDERNIS, UND WIE ES UMGANGEN WIRD:
 * Chromium kommt in dieser Umgebung NICHT ins Netz — direkt ERR_CONNECTION_RESET, ueber den
 * Proxy ERR_CERT_AUTHORITY_INVALID (der MITM-CA steckt im NSS-Store, den ein frisches
 * Playwright-Profil nicht liest, und `certutil` gibt es nicht). `curl` dagegen kommt mit dem
 * mitgelieferten CA-Bundle ueberall durch — gemessen: tiktok.com 200, example.com 200.
 * Deshalb wird JEDE Browser-Anfrage abgefangen und durch curl geschickt. Der Browser rendert,
 * curl transportiert.
 *
 * ⚠️ TLS wird dabei NICHT abgeschaltet. curl prueft gegen /root/.ccr/ca-bundle.crt — den
 *    Bundle, den die Umgebung selbst dafuer bereitstellt. `ignoreHTTPSErrors` waere der
 *    bequeme Weg und ist genau der, den man nicht nimmt.
 *
 * ⚠️ SET-COOKIE BRAUCHT EINEN UMWEG. `route.fulfill` nimmt nur EINEN Wert je Kopfzeile, eine
 *    Anmeldung schickt aber mehrere Set-Cookie. Sie werden deshalb ausgelesen und ueber
 *    ctx.addCookies() in den Cookie-Speicher gelegt. Ohne das gaebe es keine Sitzung.
 *
 * ⚠️ KEIN `-L`. Weiterleitungen folgt der BROWSER, nicht curl — sonst verliert man die
 *    Zwischenschritte und damit die Cookies, die genau dort gesetzt werden.
 *
 * ANMELDUNGEN: Diese Session kann kein 2FA. Der Betreiber meldet sich EINMAL an; die Sitzung
 * wandert danach in den Tresor (Shopify-Metafeld, ueberlebt den Rewind) und wird hier wieder
 * eingelegt. Passwoerter werden nirgends gespeichert.
 *
 * BEFEHLE
 *   schau <url> [ziel.png]        Seite oeffnen → Screenshot + sichtbarer Text
 *   skript <schritte.json>        Schrittfolge abarbeiten (siehe unten)
 *   sitzung-sichern <dienst>      Cookies+Speicher in den Tresor
 *   sitzung-laden <dienst>        Cookies+Speicher aus dem Tresor in die naechste Sitzung
 *
 * SCHRITTE (JSON-Liste), z. B.
 *   [{"gehe":"https://…"},{"tippe":["#user","name"]},{"klick":"button[type=submit]"},
 *    {"warte":3000},{"schuss":"/tmp/a.png"},{"lies":"h1"},{"datei":["input[type=file]","/pfad"]}]
 */

import { chromium } from 'playwright';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const run = promisify(execFile);
const CA = '/root/.ccr/ca-bundle.crt';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const REPO = '/home/user/aban-news-landing';
const SITZUNG = '/tmp/browser_sitzung.json';

// Kopfzeilen, die curl selbst setzt oder die den Transport stoeren.
const WEG = new Set(['accept-encoding', 'connection', 'host', 'content-length',
                     'transfer-encoding', 'upgrade-insecure-requests']);

async function transport(route) {
  const r = route.request();
  const kopfDatei = path.join(os.tmpdir(), `_hdr_${process.pid}_${Math.floor(performance.now() * 1000)}`);
  const a = ['-sS', '--compressed', '--max-time', '45', '-D', kopfDatei,
             '--cacert', CA, '-X', r.method()];
  if (PROXY) a.push('--proxy', PROXY);
  for (const [k, v] of Object.entries(r.headers())) {
    if (!WEG.has(k.toLowerCase()) && !k.startsWith(':')) a.push('-H', `${k}: ${v}`);
  }
  const rumpf = r.postData();
  if (rumpf) a.push('--data-binary', rumpf);
  a.push(r.url());

  try {
    const { stdout } = await run('curl', a, { encoding: 'buffer', maxBuffer: 80e6 });
    const roh = await fs.readFile(kopfDatei, 'utf8').catch(() => '');
    await fs.unlink(kopfDatei).catch(() => {});
    // Bei mehreren Antwortbloecken (100 Continue) zaehlt der letzte.
    const bloecke = roh.split(/\r?\n\r?\n/).filter(b => /^HTTP\//.test(b));
    const letzter = bloecke[bloecke.length - 1] || '';
    const zeilen = letzter.split(/\r?\n/);
    const status = parseInt((zeilen[0] || '').split(/\s+/)[1] || '200', 10);
    const headers = {};
    const kekse = [];
    for (const z of zeilen.slice(1)) {
      const i = z.indexOf(':');
      if (i <= 0) continue;
      const k = z.slice(0, i).trim().toLowerCase();
      const v = z.slice(i + 1).trim();
      if (k === 'set-cookie') { kekse.push(v); continue; }   // getrennt, s. Kopfkommentar
      if (WEG.has(k) || k === 'content-encoding') continue;
      headers[k] = v;
    }
    if (kekse.length) await legeKekse(route.request().url(), kekse);
    await route.fulfill({ status, headers, body: stdout });
  } catch (e) {
    await fs.unlink(kopfDatei).catch(() => {});
    await route.abort();
  }
}

let AKTIVER_CTX = null;
async function legeKekse(url, zeilen) {
  if (!AKTIVER_CTX) return;
  const host = new URL(url).hostname;
  const kekse = [];
  for (const z of zeilen) {
    const teile = z.split(';');
    const [name, ...rest] = teile[0].split('=');
    if (!name || !rest.length) continue;
    const k = { name: name.trim(), value: rest.join('=').trim(), domain: host, path: '/' };
    for (const t of teile.slice(1)) {
      const [a, b] = t.split('=');
      const s = (a || '').trim().toLowerCase();
      if (s === 'domain' && b) k.domain = b.trim().replace(/^\./, '');
      else if (s === 'path' && b) k.path = b.trim();
      else if (s === 'secure') k.secure = true;
      else if (s === 'httponly') k.httpOnly = true;
    }
    kekse.push(k);
  }
  if (kekse.length) await AKTIVER_CTX.addCookies(kekse).catch(() => {});
}

export async function starte({ sitzung = null } = {}) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const optionen = { viewport: { width: 1400, height: 900 },
                     userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
                                '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };
  if (sitzung) { try { await fs.access(sitzung); optionen.storageState = sitzung; } catch {} }
  const ctx = await browser.newContext(optionen);
  AKTIVER_CTX = ctx;
  await ctx.route('**/*', transport);
  return { browser, ctx };
}

async function seitentext(p) {
  return (await p.evaluate(() => document.body ? document.body.innerText : ''))
    .replace(/\n{3,}/g, '\n\n').trim();
}

async function tresor(...args) {
  const { stdout } = await run('python3', [path.join(REPO, 'automation/tresor.py'), ...args],
                               { cwd: REPO, maxBuffer: 20e6 });
  return stdout;
}

async function main() {
  const [befehl, ...rest] = process.argv.slice(2);

  if (befehl === 'sitzung-laden') {
    const dienst = rest[0];
    // ⚠️ Der Tresor speichert SCHLUESSEL=WERT-Paare, keine Rohbloecke — eine storageState-JSON
    // mit Anfuehrungszeichen und Gleichheitszeichen ginge dabei kaputt. Deshalb base64.
    const roh = await tresor('holen', `browser_${dienst}`);
    const zeile = roh.split(/\r?\n/).find(z => z.startsWith('daten='));
    if (!zeile) throw new Error(`keine Sitzung «${dienst}» im Tresor`);
    const klar = Buffer.from(zeile.slice(6).trim(), 'base64').toString('utf8');
    await fs.writeFile(SITZUNG, klar, { mode: 0o600 });
    console.log(`Sitzung «${dienst}» aus dem Tresor nach ${SITZUNG} gelegt.`);
    return;
  }
  if (befehl === 'sitzung-sichern') {
    const dienst = rest[0];
    const inhalt = await fs.readFile(SITZUNG, 'utf8');
    await tresor('setzen', `browser_${dienst}`,
                 'daten=' + Buffer.from(inhalt, 'utf8').toString('base64'));
    console.log(`Sitzung «${dienst}» im Tresor abgelegt (ueberlebt den Rewind).`);
    return;
  }

  const { browser, ctx } = await starte({ sitzung: SITZUNG });
  const p = await ctx.newPage();
  try {
    if (befehl === 'schau') {
      const [url, ziel = '/tmp/browser.png'] = rest;
      const r = await p.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2500);
      await p.screenshot({ path: ziel, fullPage: false });
      console.log(`STATUS ${r && r.status()}  TITEL ${await p.title()}`);
      console.log(`SCHUSS ${ziel}`);
      console.log('--- TEXT ---');
      console.log((await seitentext(p)).slice(0, 4000));
    } else if (befehl === 'skript') {
      const schritte = JSON.parse(await fs.readFile(rest[0], 'utf8'));
      for (const s of schritte) {
        if (s.gehe) { const r = await p.goto(s.gehe, { timeout: 60000, waitUntil: 'domcontentloaded' });
                      console.log(`gehe ${s.gehe} → ${r && r.status()}`); }
        else if (s.tippe) { await p.fill(s.tippe[0], s.tippe[1]); console.log(`tippe ${s.tippe[0]}`); }
        else if (s.klick) { await p.click(s.klick, { timeout: 20000 }); console.log(`klick ${s.klick}`); }
        else if (s.datei) { await p.setInputFiles(s.datei[0], s.datei[1]); console.log(`datei ${s.datei[1]}`); }
        else if (s.warte) { await p.waitForTimeout(s.warte); }
        else if (s.lies) { console.log(`lies ${s.lies}: ${(await p.textContent(s.lies) || '').trim().slice(0, 300)}`); }
        else if (s.schuss) { await p.screenshot({ path: s.schuss }); console.log(`schuss ${s.schuss}`); }
      }
      await ctx.storageState({ path: SITZUNG });
      console.log(`Sitzungsstand → ${SITZUNG}`);
    } else {
      console.log('Befehle: schau <url> [ziel.png] | skript <datei.json> | sitzung-sichern <dienst> | sitzung-laden <dienst>');
    }
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error('FEHLER:', e.message); process.exit(1); });
}
