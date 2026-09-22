// Eimer-Etikette fuer Massen-Schreiber (Node) — Begruendung und Regel: siehe eimer_etikette.py.
// Nutzung:  import { nachlauf } from './eimer_etikette.mjs';  const j = await r.json(); await nachlauf(j);
const BODEN = parseFloat(process.env.EIMER_BODEN || '600');
const ZIEL = parseFloat(process.env.EIMER_ZIEL || '1000');
const DECKEL = parseFloat(process.env.EIMER_DECKEL || '20');
const AUS = process.env.EIMER_AUS === '1';
export const bilanz = { n: 0, s: 0 };
export async function nachlauf(j) {
  if (AUS || !j || typeof j !== 'object') return 0;
  const ts = j.extensions?.cost?.throttleStatus || {};
  const avail = Number(ts.currentlyAvailable), rate = Number(ts.restoreRate || 0);
  if (!Number.isFinite(avail) || avail >= BODEN || !(rate > 0)) return 0;
  const warte = Math.min(DECKEL, Math.max(1, (ZIEL - avail) / rate));
  bilanz.n++; bilanz.s += warte;
  await new Promise(r => setTimeout(r, warte * 1000));
  return warte;
}
