#!/usr/bin/env node
/**
 * luxe_auftrag_runner.mjs — führt Browser-Aufträge aus, die als JSON im Repo liegen.
 *
 * Läuft auf dem Hetzner-Server (46.225.75.125), aufgerufen vom systemd-Timer
 * luxe-agent.timer. Holt den Auftragsbranch, arbeitet auftraege/offen/*.json ab,
 * legt Ergebnisse nach auftraege/erledigt/ + auftraege/ergebnis/ und pusht zurück.
 *
 * ⛔ SICHERHEIT: Es wird NIE Shell- oder JS-Code aus der Auftragsdatei ausgeführt.
 *    Erlaubt sind ausschliesslich die Arten in ARTEN, und ein "skript"-Auftrag darf nur
 *    eine Datei aus automation/browser/ starten, die im Repo steht (Basename, kein Pfad).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const REPO    = process.env.LUXE_REPO    || '/opt/abannews';
const PROFIL  = process.env.LUXE_PROFIL  || '/var/lib/luxe-agent/chrome-profil';
const OFFEN   = path.join(REPO, 'auftraege/offen');
const FERTIG  = path.join(REPO, 'auftraege/erledigt');
const ERGEBNIS= path.join(REPO, 'auftraege/ergebnis');

const ARTEN = new Set(['screenshot', 'seite_text', 'skript']);

function sicherer_name(s) {               // gegen ../../etc/passwd und Leerzeichen-Tricks
  return typeof s === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(s) && !s.startsWith('.');
}

async function fuehre_aus(auftrag, ctx) {
  const art = auftrag.typ;
  if (!ARTEN.has(art)) throw new Error(`unbekannte Auftragsart: ${art}`);

  if (art === 'screenshot' || art === 'seite_text') {
    if (!/^https:\/\//.test(auftrag.url || '')) throw new Error('url fehlt oder ist nicht https');
    const seite = await ctx.newPage();
    try {
      await seite.goto(auftrag.url, { waitUntil: 'networkidle', timeout: 60000 });
      if (art === 'seite_text') {
        const text = await seite.evaluate(() => document.body.innerText.slice(0, 20000));
        return { text };
      }
      const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
      await seite.screenshot({ path: datei, fullPage: !!auftrag.ganze_seite });
      return { datei: path.relative(REPO, datei) };
    } finally { await seite.close(); }
  }

  // art === 'skript': nur ein Modul aus automation/browser/, das im Repo steht
  if (!sicherer_name(auftrag.skript) || !auftrag.skript.endsWith('.mjs'))
    throw new Error('skript muss ein Basename wie "merchant_pruefen.mjs" sein');
  const pfad = path.join(REPO, 'automation/browser', auftrag.skript);
  if (!fs.existsSync(pfad)) throw new Error(`skript nicht im Repo: ${pfad}`);
  const modul = await import(`file://${pfad}`);
  if (typeof modul.default !== 'function') throw new Error('skript exportiert kein default()');
  return await modul.default({ ctx, auftrag, REPO, ERGEBNIS });
}

const offen = fs.existsSync(OFFEN)
  ? fs.readdirSync(OFFEN).filter(f => f.endsWith('.json')).sort()
  : [];
if (!offen.length) { console.log('· keine offenen Aufträge'); process.exit(0); }

fs.mkdirSync(FERTIG, { recursive: true });
fs.mkdirSync(ERGEBNIS, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFIL, {
  headless: true,
  args: ['--no-sandbox'],          // CDP wird BEWUSST nicht geöffnet (kein --remote-debugging-port)
  viewport: { width: 1440, height: 900 },
  locale: 'de-CH',
});

for (const datei of offen) {
  const pfad = path.join(OFFEN, datei);
  let auftrag;
  try { auftrag = JSON.parse(fs.readFileSync(pfad, 'utf8')); }
  catch (e) { console.log(`✗ ${datei}: kein gültiges JSON — ${e.message}`); continue; }
  auftrag.id = sicherer_name(auftrag.id) ? auftrag.id : path.basename(datei, '.json');

  let quittung;
  try {
    const ergebnis = await fuehre_aus(auftrag, ctx);
    quittung = { ...auftrag, stand: 'ok', ergebnis };
    console.log(`✓ ${auftrag.id} (${auftrag.typ})`);
  } catch (e) {
    quittung = { ...auftrag, stand: 'fehler', fehler: String(e.message || e) };
    console.log(`✗ ${auftrag.id}: ${quittung.fehler}`);
  }
  // Auch ein Fehlschlag bekommt eine Quittung — ein Automat, der still scheitert,
  // ist für den Betreiber dasselbe wie keiner.
  fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(quittung, null, 2));
  fs.unlinkSync(pfad);
}

await ctx.close();
