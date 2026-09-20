#!/usr/bin/env node
/**
 * ig-reel-lesen.mjs — liest ein Instagram-Reel aus dem EINGELOGGTEN Brave und schreibt
 * Text, Urheber und Zahlen als JSON heraus, damit eine Cloud-Session damit arbeiten kann.
 *
 * WARUM DAS NÖTIG IST (gemessen 2026-09-20, mit Gegenprobe):
 * Instagram liefert an diesen Container nur eine leere JS-Hülle — 628 KB, `<title>Instagram</title>`,
 * **0 og-Tags**, keine Video-URL, kein Nutzername, `"caption":null`. Vier Wege geprüft:
 *   1. Browser-Kennung + `stkn`-Share-Parameter → dieselbe leere Hülle
 *   2. `?__a=1&__d=dis`                          → HTTP 404, „not-logged-in"
 *   3. `api.instagram.com/oembed`                → HTTP 302 (abgeschafft, braucht FB-App-Token)
 *   4. **Gegenprobe:** ein anderer öffentlicher Beitrag → identische 628 KB, 0 og-Tags
 * Die Gegenprobe ist der Punkt: es liegt nicht am einzelnen Reel, sondern an Instagram.
 * Anders als bei TikTok (dort steckt die Untertitelspur in den Metadaten) gibt es hier
 * keinen Weg ohne angemeldeten Browser.
 *
 * LAUF AUF DEM PC (nicht in der Cloud-Session):
 *   1) Brave läuft mit  --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\brave-agent"
 *      und ist bei Instagram angemeldet.
 *   2) (einmalig)  npm install playwright-core
 *   3)  node automation/local/ig-reel-lesen.mjs "https://www.instagram.com/reel/XXXX/"
 *
 *   node automation/local/ig-reel-lesen.mjs --selbsttest   # läuft überall, braucht keinen Browser
 *
 * Ergebnis: `automation/local/ig-reel-<kennung>.json` — Urheber, Text, Datum, Zahlen,
 * Video-Adresse. Den Inhalt in die Sitzung kopieren, dann kann dort ausgewertet werden.
 *
 * ⚠️ Das Skript LIEST nur. Es liked nicht, folgt nicht, kommentiert nicht und postet nicht.
 */

import { writeFileSync } from 'node:fs';

/* ------------------------------ Reine Helfer ------------------------------ */

/** `.../reel/DdWw0s5IEng/?stkn=…` → `DdWw0s5IEng`. `null`, wenn es kein Beitrag ist. */
export function kennung(url) {
  const m = String(url).match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Deutsche und englische Kurzzahlen aus Instagram-Oberflächen.
 * `null` statt 0, wenn nichts Zählbares dasteht — eine fehlende Zahl ist UNBEKANNT.
 */
export function zahlAusText(text) {
  if (!text) return null;
  const m = String(text).replace(/ /g, ' ')
    .match(/(\d+(?:[.,]\d+)?)\s*(Tsd\.?|Mio\.?|Mrd\.?|K|M|B)?/i);
  if (!m) return null;
  // Deutsche Schreibweise: Punkt trennt Tausender, Komma ist das Dezimalzeichen.
  const roh = m[2] ? m[1].replace(',', '.') : m[1].replace(/\./g, '').replace(',', '.');
  const zahl = Number(roh);
  if (!Number.isFinite(zahl)) return null;
  const faktor = { tsd: 1e3, k: 1e3, mio: 1e6, m: 1e6, mrd: 1e9, b: 1e9 };
  const e = (m[2] || '').toLowerCase().replace('.', '');
  return Math.round(zahl * (faktor[e] ?? 1));
}

/** Schneidet „… mehr", „… more" und Leerraum weg, ohne den Text zu kürzen. */
export function textSaeubern(t) {
  return String(t || '')
    .replace(/\s*\.\.\.\s*(mehr|more)\s*$/i, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** `@name` aus einer Kopfzeile. `null`, wenn keiner dasteht — nicht raten. */
export function handleAus(text) {
  const m = String(text || '').match(/@?([a-z0-9._]{2,30})/i);
  return m ? m[1].replace(/^@/, '') : null;
}

/* -------------------------------- Browser -------------------------------- */

const log = (...a) => console.log(...a);

async function brave() {
  const { chromium } = await import('playwright-core');
  try { return await chromium.connectOverCDP('http://localhost:9222'); }
  catch {
    log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten und bei Instagram angemeldet sein.');
    process.exit(1);
  }
}

async function lesen(url) {
  const id = kennung(url);
  if (!id) { log(`❌ Das sieht nicht nach einem Instagram-Beitrag aus: ${url}`); process.exit(2); }

  const browser = await brave();
  const ctx = browser.contexts()[0] ?? await browser.newContext();
  const seite = await ctx.newPage();
  await seite.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await seite.waitForTimeout(3500);

  // „mehr"/„more" aufklappen, sonst steht nur der halbe Text da.
  for (const s of ['text=mehr', 'text=more', 'button:has-text("mehr")']) {
    try { await seite.locator(s).first().click({ timeout: 1200 }); break; } catch { /* nicht da */ }
  }
  await seite.waitForTimeout(600);

  const roh = await seite.evaluate(() => {
    const t = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;
    const video = document.querySelector('video');
    return {
      titel: document.title,
      urheber: t('header a[role="link"]') ?? t('a[href^="/"][role="link"]'),
      text: t('h1') ?? t('[data-testid="post-comment-root"]') ?? null,
      zeit: document.querySelector('time')?.getAttribute('datetime') ?? null,
      zahlen: [...document.querySelectorAll('section span, span')]
        .map((e) => e.textContent?.trim()).filter((s) => s && /^[\d.,]+\s*(Tsd\.?|Mio\.?|K|M)?$/i.test(s)).slice(0, 6),
      video_adresse: video?.currentSrc || video?.src || null,
      angemeldet: !/Anmelden|Log in/i.test(document.body.innerText.slice(0, 400)),
    };
  });

  const ergebnis = {
    kennung: id,
    url,
    gelesen_am: new Date().toISOString(),
    angemeldet: roh.angemeldet,
    urheber: handleAus(roh.urheber),
    text: textSaeubern(roh.text),
    veroeffentlicht: roh.zeit,
    zahlen_roh: roh.zahlen,
    zahlen: roh.zahlen.map(zahlAusText),
    video_adresse: roh.video_adresse,
  };

  const datei = `automation/local/ig-reel-${id}.json`;
  writeFileSync(datei, JSON.stringify(ergebnis, null, 2) + '\n');
  await seite.close();

  if (!ergebnis.angemeldet) log('⚠️ Brave scheint NICHT angemeldet zu sein — der Text bleibt dann leer.');
  if (!ergebnis.text) log('⚠️ Kein Text gefunden. Instagram ändert die Oberfläche oft; die Auswahl oben anpassen.');
  log(JSON.stringify(ergebnis, null, 2));
  log(`\n→ geschrieben: ${datei}  ·  Inhalt in die Sitzung kopieren.`);
  process.exit(0);
}

/* ------------------------------- Selbsttest ------------------------------- */

function selbsttest() {
  let ok = 0; const fehler = [];
  const p = (name, b) => { if (b) ok++; else fehler.push(name); };

  // Kennung
  p('Reel-Adresse', kennung('https://www.instagram.com/reel/DdWw0s5IEng/') === 'DdWw0s5IEng');
  p('mit Share-Token', kennung('https://www.instagram.com/reel/DdWw0s5IEng/?stkn=emRnYXphM2Noc2Vy') === 'DdWw0s5IEng');
  p('Beitrag statt Reel', kennung('https://instagram.com/p/AbC-1_2/') === 'AbC-1_2');
  p('fremde Adresse ergibt null', kennung('https://www.tiktok.com/@x/video/123') === null);
  p('Profilseite ist kein Beitrag', kennung('https://www.instagram.com/luxestyle.ch/') === null);

  // Zahlen — deutsche Schreibweise
  p('1.234 sind Eintausendzweihundertvierunddreissig', zahlAusText('1.234') === 1234);
  p('12,3 Tsd.', zahlAusText('12,3 Tsd.') === 12300);
  p('1,2 Mio.', zahlAusText('1,2 Mio.') === 1200000);
  p('12.3K englisch', zahlAusText('12.3K') === 12300);
  p('blosse Zahl', zahlAusText('842') === 842);
  p('ohne Zahl kommt null, NICHT 0', zahlAusText('Gefällt mir') === null);
  p('leerer Text ergibt null', zahlAusText('') === null);
  p('null bleibt null', zahlAusText(null) === null);

  // Text
  p('„… mehr" faellt weg', textSaeubern('Drei Tipps für deinen Shop... mehr') === 'Drei Tipps für deinen Shop');
  p('„... more" faellt weg', textSaeubern('Three tips ... more') === 'Three tips');
  p('das Wort „mehr" MITTEN im Satz bleibt', textSaeubern('mehr Umsatz mit weniger Produkten') === 'mehr Umsatz mit weniger Produkten');
  p('Absaetze bleiben erhalten', textSaeubern('A\n\nB') === 'A\n\nB');

  // Handle
  p('@name wird gelesen', handleAus('@herr_tech') === 'herr_tech');
  p('ohne @ auch', handleAus('luxestyle.ch') === 'luxestyle.ch');
  p('leer ergibt null, nicht ""', handleAus('') === null);

  console.log(`${ok} Pruefungen bestanden, ${fehler.length} gescheitert`);
  for (const f of fehler) console.log('  ✗ ' + f);
  return fehler.length === 0;
}

const direkt = process.argv[1] && process.argv[1].endsWith('ig-reel-lesen.mjs');
if (direkt) {
  const a = process.argv[2];
  if (a === '--selbsttest') process.exit(selbsttest() ? 0 : 1);
  else if (!a) { console.error('Aufruf: node automation/local/ig-reel-lesen.mjs "<instagram-url>"'); process.exit(2); }
  else await lesen(a);
}
