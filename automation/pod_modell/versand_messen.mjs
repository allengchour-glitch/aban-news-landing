#!/usr/bin/env node
/**
 * NUR LESEN: misst die Printful-Versandrate in die Schweiz für eine Variante, die WIRKLICH im Produkt steckt (Fund beider Gegenleser 05.11.2026: bei 57 von 448 anlegbaren Modellen war die Rate für eine Variante
 * gemessen, die das Produkt gar nicht anbietet, z. B. Hoodie 146 mit Ash/2XL statt der gewählten Farben; Preis und Lieferzeit stützten sich auf eine fremde Variante). Das Tor `rate_variante` verlangt es jetzt.
 *
 * `POST /shipping/rates` ist eine Preisauskunft, kein Auftrag und kein Entwurf: es entsteht nichts bei Printful, nichts bei Shopify. Eine Anfrage je Modell, 700 ms Pause, bei 429 Warten und Wiederholen.
 *
 * Eingaben (Dateien):  PLAENE=<Ordner mit den Plan-JSON-Dateien des Trockenlaufs>   VERSAND=<versand_alle.json>   [MODELLE=760,146,…]   [ALLE=1: jedes Modell des Ordners, nicht nur die mit fremder Rate]
 * Umgebung: PRINTFUL_API_KEY, PRINTFUL_STORE_ID (nie ausgeben).  [PAUSE_MS=700]
 * Wirkung: ändert NUR die Datei VERSAND (Eintrag je Modell: {variante, http, raten, fehler, gemessenFuer:'auswahl'}). Schlägt eine Messung fehl, bleibt der alte Eintrag stehen.
 * Danach den Trockenlauf wiederholen (neuer Plan-Hash).
 *
 * Welche Variante? Die erste Farbe der Auswahl, darin die LETZTE Variante (grösste Grösse; die Auswahl ist nach Grösse aufsteigend geordnet): Versand wächst mit der Grösse, die Rate gilt für alle Varianten des Produkts,
 * also lieber die höchste (der Preis ist dann für kleine Grössen eher zu hoch als zu tief). Das ist eine Setzung; je Variante zu messen (Hinweis `versand_je_groesse`) bleibt offen.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Die Variante, für die die Rate gemessen wird: {printfulVariantId, grund} oder null (Plan ohne Varianten). */
export function repraesentant(plan) {
  const v = plan?.varianten ?? [];
  if (!v.length) return null;
  const ersteFarbe = v[0].farbe ?? null;
  const darin = v.filter((x) => (x.farbe ?? null) === ersteFarbe);
  const x = darin[darin.length - 1];
  return { printfulVariantId: x.printfulVariantId, grund: `erste Farbe${ersteFarbe ? ` (${ersteFarbe})` : ''}, grösste Grösse (${x.groesse ?? 'ohne Grösse'})` };
}

/** Welche Modelle brauchen eine neue Messung? Die Rate fehlt oder gehört zu einer Variante ausserhalb der Auswahl (oder ALLE). */
export function brauchtMessung(plan, eintrag, alle = false) {
  if (!plan || !(plan.varianten ?? []).length || plan.stufe == null) return false;
  if (alle) return true;
  const ids = new Set(plan.varianten.map((x) => x.printfulVariantId));
  return !eintrag || !Array.isArray(eintrag.raten) || !eintrag.raten.length || !ids.has(eintrag.variante);
}

export async function messeEine(variantId, { fetchFn = fetch, key, store, pause = (ms) => new Promise((r) => setTimeout(r, ms)), versuche = 5 }) {
  for (let i = 0; i < versuche; i++) {
    const r = await fetchFn('https://api.printful.com/shipping/rates', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'X-PF-Store-Id': String(store), 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { country_code: 'CH', zip: '8001' }, items: [{ variant_id: variantId, quantity: 1 }] }),
    });
    if (r.status === 429) { await pause((parseInt(r.headers?.get?.('retry-after') || '15', 10) || 15) * 1000); continue; }
    const j = await r.json().catch(() => ({}));
    const raten = Array.isArray(j.result) ? j.result.map((x) => ({ id: x.id, rateUsd: x.rate, tageMin: x.minDeliveryDays, tageMax: x.maxDeliveryDays })) : [];
    return { variante: variantId, http: r.status, raten, fehler: raten.length ? null : (typeof j.result === 'string' ? j.result : JSON.stringify(j.error || j).slice(0, 160)), gemessenFuer: 'auswahl' };
  }
  return { variante: variantId, http: 429, raten: [], fehler: '429 dauerhaft', gemessenFuer: 'auswahl' };
}

export async function main(env = process.env, deps = {}) {
  const log = deps.log ?? console.log;
  if (!env.PLAENE || !env.VERSAND) { log('PLAENE (Ordner mit Plan-JSON) und VERSAND (versand_alle.json) sind Pflicht.'); return 1; }
  const key = env.PRINTFUL_API_KEY, store = env.PRINTFUL_STORE_ID;
  if (!key || !store) { log('PRINTFUL_API_KEY und PRINTFUL_STORE_ID fehlen.'); return 1; }
  const versand = existsSync(env.VERSAND) ? JSON.parse(readFileSync(env.VERSAND, 'utf8')) : {};
  const nur = env.MODELLE ? new Set(String(env.MODELLE).split(',').map((x) => Number(x.trim())).filter(Boolean)) : null;
  const dateien = readdirSync(env.PLAENE).filter((f) => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  let n = 0, besser = 0, schlecht = 0;
  for (const f of dateien) {
    const plan = JSON.parse(readFileSync(join(env.PLAENE, f), 'utf8'));
    const id = plan.printfulProductId;
    if (nur && !nur.has(id)) continue;
    if (!brauchtMessung(plan, versand[id], env.ALLE === '1')) continue;
    const rep = repraesentant(plan);
    const neu = await messeEine(rep.printfulVariantId, { fetchFn: deps.fetch ?? fetch, key, store, pause: deps.pause });
    n++;
    if (neu.raten.length) { versand[id] = neu; besser++; log(`✓ ${id}: Variante ${rep.printfulVariantId} (${rep.grund}): ${neu.raten.map((r) => `${r.id} ${r.rateUsd} USD ${r.tageMin}-${r.tageMax} Tage`).join(', ')}`); }
    else { schlecht++; log(`✗ ${id}: Variante ${rep.printfulVariantId}: keine Rate (${neu.fehler}); der alte Eintrag bleibt`); }
    writeFileSync(env.VERSAND, JSON.stringify(versand));
    await (deps.pause ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(Number(env.PAUSE_MS ?? 700));
  }
  log(`FERTIG: ${n} Modelle gemessen, ${besser} neu eingetragen, ${schlecht} ohne Rate. Danach den Trockenlauf wiederholen.`);
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().then((c) => process.exit(c)).catch((e) => { console.error('Fataler Fehler:', e.message); process.exit(1); });
}
