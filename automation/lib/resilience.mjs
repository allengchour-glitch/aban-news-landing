/* LuxeStyle — resilience.mjs  ·  Selbstheilungs-Kern (Recherche-Lehre n8n/Nate Herk/Sabrina 2026)
 * =============================================================================================
 * Wiederverwendbare Robustheit fuer ALLE Bots — damit ein Fehler nie still den Lauf killt und
 * jede Session sofort sieht, was schief lief. Dependency-frei (nur Node built-ins).
 *
 *   import { withRetry, errorSink, deadLetter, guard } from '../lib/resilience.mjs';
 *   await withRetry(() => fetchX(), { tries: 3 });           // Retry mit Backoff
 *   errorSink('tutti-post', err, { item });                  // Fehler -> reports/failures.jsonl
 *   deadLetter({ file }, 'QA 3x failed');                    // endgueltig raus -> reports/dead-letter.json
 *   await guard('konto-analyse', () => run());               // faengt + protokolliert, wirft nie
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
const REPORTS = path.join(ROOT, 'reports');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const append = (file, obj) => { try { fs.mkdirSync(REPORTS, { recursive: true }); fs.appendFileSync(path.join(REPORTS, file), JSON.stringify(obj) + '\n'); } catch {} };

/** Fuehrt fn aus, wiederholt bei Fehler mit Backoff (default 2s/8s/30s). Wirft erst nach allen Versuchen. */
export async function withRetry(fn, { tries = 3, backoffMs = [2000, 8000, 30000], label = '' } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; if (i < tries - 1) { console.log(`… ${label || 'retry'} Versuch ${i + 1}/${tries} fiel aus (${String(e).slice(0, 60)}) → warte`); await sleep(backoffMs[Math.min(i, backoffMs.length - 1)]); } }
  }
  throw last;
}

/** Fehler durabel protokollieren (reports/failures.jsonl) — eine Quelle fuer "was lief schief". */
export function errorSink(task, error, extra = {}) {
  append('failures.jsonl', { ts: new Date().toISOString(), task, error: String(error?.stack || error).slice(0, 400), ...extra });
  console.log(`🔴 errorSink[${task}]: ${String(error).slice(0, 100)}`);
}

/** Item endgueltig aussortieren (nach N Fehlversuchen) statt endlos zu retryen. */
export function deadLetter(item, reason) {
  append('dead-letter.jsonl', { ts: new Date().toISOString(), reason, item });
  console.log(`📪 dead-letter: ${reason}`);
}

/** Wrapper: fuehrt fn aus, faengt ALLES, protokolliert in errorSink, wirft NIE (ein kaputter Schritt
 *  bricht nie den ganzen Lauf — "Continue on error"-Pattern). Gibt {ok, value|error} zurueck. */
export async function guard(task, fn) {
  try { return { ok: true, value: await fn() }; }
  catch (e) { errorSink(task, e); return { ok: false, error: String(e) }; }
}

/** Heartbeat-Datei (reports/heartbeat-<name>.txt) — Watchdog kann stale Tasks erkennen. */
export function heartbeat(name) {
  try { fs.mkdirSync(REPORTS, { recursive: true }); fs.writeFileSync(path.join(REPORTS, `heartbeat-${name}.txt`), new Date().toISOString()); } catch {}
}
