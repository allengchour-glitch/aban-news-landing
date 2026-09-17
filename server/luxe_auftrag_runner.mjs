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
import { execFileSync } from 'node:child_process';
import { ist_anmeldeseite } from './anmelde_erkennung.mjs';

const REPO    = process.env.LUXE_REPO    || '/opt/abannews';
const PROFIL  = process.env.LUXE_PROFIL  || '/var/lib/luxe-agent/chrome-profil';
const OFFEN   = path.join(REPO, 'auftraege/offen');
const FERTIG  = path.join(REPO, 'auftraege/erledigt');
const ERGEBNIS= path.join(REPO, 'auftraege/ergebnis');

const ARTEN = new Set(['screenshot', 'seite_text', 'skript']);

function sicherer_name(s) {               // gegen ../../etc/passwd und Leerzeichen-Tricks
  return typeof s === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(s) && !s.startsWith('.');
}

/**
 * Prueft einen Auftrag, BEVOR er geclaimt wird.
 *
 * Gefunden im Testlauf 17.09.: ein Auftrag mit unbekannter Art wurde erst
 * geclaimt (Quittung geschrieben, committet, gepusht) und dann verworfen. Das
 * verschwendet nicht nur einen Commit — es verschiebt die Fehlermeldung hinter
 * einen Schritt, der selbst scheitern kann, und dann sieht niemand den echten
 * Grund. Erst pruefen, dann festhalten, dann handeln.
 */
function pruefe(auftrag) {
  const art = auftrag.typ;
  if (!ARTEN.has(art)) throw new Error(`unbekannte Auftragsart: ${art}`);
  if (art === 'screenshot' || art === 'seite_text') {
    if (!/^https:\/\//.test(auftrag.url || '')) throw new Error('url fehlt oder ist nicht https');
    return;
  }
  if (!sicherer_name(auftrag.skript) || !auftrag.skript.endsWith('.mjs'))
    throw new Error('skript muss ein Basename wie "merchant_pruefen.mjs" sein');
  const pfad = path.join(REPO, 'automation/browser', auftrag.skript);
  if (!fs.existsSync(pfad)) throw new Error(`skript nicht im Repo: ${pfad}`);
}

async function fuehre_aus(auftrag, ctx) {
  const art = auftrag.typ;

  if (art === 'screenshot' || art === 'seite_text') {
    const seite = await ctx.newPage();
    try {
      // 77 % unserer Besucherinnen sind auf dem Handy — deshalb muss eine
      // Handy-Breite moeglich sein. (Das ist die Breite, keine Geraete-Emulation:
      // die Kennung bleibt Desktop. Horizon entscheidet ueber CSS, das genuegt.)
      if (auftrag.mobil) await seite.setViewportSize({ width: 390, height: 844 });
      await seite.goto(auftrag.url, { waitUntil: 'networkidle', timeout: 60000 });
      const ziel = seite.url();
      if (ist_anmeldeseite(ziel)) {
        const e = new Error(`nicht angemeldet — umgeleitet auf ${ziel}`);
        e.nichtAngemeldet = true;
        throw e;
      }
      if (art === 'seite_text') {
        const text = await seite.evaluate(() => document.body.innerText.slice(0, 20000));
        return { ziel, text };
      }
      const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
      await seite.screenshot({ path: datei, fullPage: !!auftrag.ganze_seite });
      return { ziel, mobil: !!auftrag.mobil, datei: path.relative(REPO, datei) };
    } finally { await seite.close(); }
  }

  // art === 'skript': nur ein Modul aus automation/browser/, das im Repo steht (pruefe())
  const pfad = path.join(REPO, 'automation/browser', auftrag.skript);
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
  // Auf dem Hetzner-Server installiert das Setup den passenden Chromium selbst.
  // LUXE_CHROME erlaubt einen vorhandenen Build (z. B. zum Testen in einer
  // Umgebung, deren Browser nicht zur Playwright-Version passt).
  ...(process.env.LUXE_CHROME ? { executablePath: process.env.LUXE_CHROME } : {}),
  args: ['--no-sandbox'],          // CDP wird BEWUSST nicht geöffnet (kein --remote-debugging-port)
  viewport: { width: 1440, height: 900 },
  locale: 'de-CH',
});

/**
 * Schreibt eine Quittung, loescht den offenen Auftrag und PUSHT das — bevor die
 * Nebenwirkung passiert.
 *
 * Warum: Der Runner setzt zu Beginn `git checkout -B` auf origin. Scheitert der
 * Push am Ende (Container weg, Netz weg), kommt die Auftragsdatei beim naechsten
 * Lauf ZURUECK und alles wird nochmal ausgefuehrt. Fuer einen Screenshot ist das
 * egal; fuer ein Skript, das ein Ticket absendet oder etwas anklickt, waere es ein
 * zweiter Vorgang, den niemand wollte. Das ist dieselbe Falle, die hier schon
 * IG-Doppelposts erzeugt hat (CLAUDE.md Regel 10).
 *
 * Regel: erst claimen und committen, DANN die Nebenwirkung — nie umgekehrt.
 * Gelingt der Push nicht, wird der Auftrag NICHT ausgefuehrt: unverrichtet ist
 * harmlos, doppelt ausgefuehrt nicht.
 */
function claim_und_push(auftrag, offenPfad) {
  const quittung = { ...auftrag, stand: 'laufend',
    hinweis: 'Vor der Ausfuehrung gesichert. Steht hier spaeter immer noch "laufend", '
           + 'ist der Lauf mittendrin gestorben — dann VON HAND pruefen, was passiert ist, '
           + 'und den Auftrag nicht einfach wiederholen.' };
  fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(quittung, null, 2));
  fs.unlinkSync(offenPfad);
  const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { stdio: 'pipe' });
  try {
    git('add', 'auftraege');
    git('-c', 'user.name=luxe-agent', '-c', 'user.email=agent@luxestyle.ch',
        'commit', '-q', '-m', `Auftrag ${auftrag.id} beginnt (Hetzner-Agent) [skip ci]`);
    git('push', '-q', 'origin', `HEAD:${process.env.LUXE_BRANCH || 'claude/luxestyle-status-tztnn1'}`);
    return true;
  } catch (e) {
    console.log(`· ${auftrag.id}: Claim konnte nicht gesichert werden (${String(e.message||e).slice(0,120)}) — NICHT ausgefuehrt, naechster Lauf versucht es erneut`);
    return false;
  }
}

for (const datei of offen) {
  const pfad = path.join(OFFEN, datei);
  let auftrag;
  try { auftrag = JSON.parse(fs.readFileSync(pfad, 'utf8')); }
  catch (e) {
    // Gefunden im Testlauf 17.09.: eine kaputte Datei blieb liegen und wurde ALLE
    // FUENF MINUTEN neu gemeldet — eine Fehlermeldung, die sich endlos wiederholt,
    // wird nach dem dritten Mal nicht mehr gelesen. Also Quittung und weg damit.
    const id = path.basename(datei, '.json');
    fs.writeFileSync(path.join(FERTIG, `${id}.json`), JSON.stringify(
      { id, stand: 'fehler', fehler: `kein gültiges JSON — ${e.message}` }, null, 2));
    fs.unlinkSync(pfad);
    console.log(`✗ ${datei}: kein gültiges JSON — ${e.message}`);
    continue;
  }
  auftrag.id = sicherer_name(auftrag.id) ? auftrag.id : path.basename(datei, '.json');

  // Nur lesende Arten duerfen gefahrlos wiederholt werden. Alles, was klicken oder
  // absenden kann, wird vorher gesichert.
  try { pruefe(auftrag); }
  catch (e) {
    fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(
      { ...auftrag, stand: 'fehler', fehler: String(e.message || e) }, null, 2));
    fs.unlinkSync(pfad);
    console.log(`✗ ${auftrag.id}: ${e.message}`);
    continue;
  }

  const nurLesend = auftrag.typ === 'screenshot' || auftrag.typ === 'seite_text';
  let geclaimt = false;
  if (!nurLesend) {
    if (!claim_und_push(auftrag, pfad)) continue;
    geclaimt = true;
  }

  let quittung;
  try {
    const ergebnis = await fuehre_aus(auftrag, ctx);
    quittung = { ...auftrag, stand: 'ok', ergebnis };
    console.log(`✓ ${auftrag.id} (${auftrag.typ})`);
  } catch (e) {
    // «nicht angemeldet» ist kein gewoehnlicher Fehler, sondern eine Aufgabe fuer
    // den Betreiber (Profil einmal einloggen) — deshalb ein eigener Stand.
    const stand = e.nichtAngemeldet ? 'nicht-angemeldet' : 'fehler';
    quittung = { ...auftrag, stand, fehler: String(e.message || e) };
    console.log(`✗ ${auftrag.id}: ${quittung.fehler}`);
  }
  // Auch ein Fehlschlag bekommt eine Quittung — ein Automat, der still scheitert,
  // ist für den Betreiber dasselbe wie keiner.
  fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(quittung, null, 2));
  if (!geclaimt) fs.unlinkSync(pfad);
}

await ctx.close();
