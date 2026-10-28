/**
 * GraphQL-Zugang des Schreibwegs «Selbst gestalten»: `gql(query, variables)` → {data} | {errors}.
 *
 * WARUM EIN EIGENES STÜCK (statt shopifyGql direkt): lib/shopify_gql.mjs ist für LESENDE Wächter gebaut und wiederholt jede Anfrage bei Netzfehler,
 * Zeitüberschreitung (30 s) und HTTP 5xx bis zu sechsmal. Bei einer MUTATION ist das gefährlich: war die erste Anfrage schon ausgeführt und nur die
 * Antwort ging verloren, würde die Wiederholung dasselbe noch einmal tun. Beispiel «productSet» der Samsung-Hülle: eine zweite Ausführung legt ein
 * zweites Produkt mit zweimal 84 Varianten an und verbraucht das Tageslimit für neue Varianten, das der Auswahl-Lauf der Nacht ebenfalls braucht.
 *
 * Darum gilt hier:
 *   • Abfragen (query): wie bisher mit Geduld (Wiederholung bei Drosselung, 429, 5xx, Netzfehler) – Lesen ist unschädlich.
 *   • Mutationen: shopifyGql bekommt `versuche: 1` (KEINE stille Wiederholung). Nur wenn die Anfrage nachweislich NICHT ausgeführt wurde
 *     (GraphQL «Throttled» vor der Ausführung, HTTP 429), wird hier selbst mit wachsender Pause wiederholt. 5xx, Netzfehler und Zeitüberschreitung
 *     werden als Fehler gemeldet; der nächste Lauf liest den Shop frisch und ergänzt, was fehlt (jeder Schritt in pod_auswahl_schreiben.mjs ist so gebaut).
 *   • Fehler der Form «GraphQL: [...]» (Shopify hat geantwortet, mit `errors`) werden als {errors:[…]} zurückgegeben, damit pruefeAntwort() das
 *     Tageslimit (VARIANT_THROTTLE_EXCEEDED) erkennen kann; alle anderen Fehler (HTTP, Netz) werden geworfen.
 */
import { shopifyGql } from './shopify_gql.mjs';

/**
 * Admin-API-Version des ganzen Werkzeugs (eine Stelle). GEMESSEN 27.10.2026 (`publicApiVersions`): unterstützt sind 2026-01, 2026-04, 2026-07, 2026-10.
 * '2025-01' wird nicht mehr unterstützt: Shopify antwortet dann mit der ÄLTESTEN unterstützten Version (Header x-shopify-api-version), die bei jedem
 * Auslauf weiterrückt – das Schema wäre nicht mehr das, wogegen gebaut wurde. Darum fest auf 2026-01 (wie lib/grind_plan.mjs), und `productByIdentifier`
 * statt des veralteten `productByHandle`. Ein Test hält Version und Abfragetexte zusammen.
 */
export const API_VERSION = '2026-01';

/** Das Tageslimit für neue Varianten ist KEINE Drosselung, die sich durch Warten löst. */
const TAGESLIMIT = /VARIANT_THROTTLE|Daily variant creation limit/i;
/** Die Anfrage wurde von Shopify abgewiesen, bevor sie etwas getan hat: sicher zu wiederholen. */
const NICHT_AUSGEFUEHRT = /throttled|HTTP 429/i;

export const istMutation = (query) => /^\s*mutation\b/.test(String(query ?? ''));

/**
 * @param {{shop:string, api:string, token:string, fetch?:Function, warte?:(ms:number)=>Promise<void>, drosselVersuche?:number, basisMs?:number, shopifyGql?:Function}} o
 *   fetch/warte/shopifyGql nur für Tests (Attrappen).
 */
export function gqlFuer({ shop, api, token, fetch: fetchFn, warte, drosselVersuche = 5, basisMs = 1500, shopifyGql: sg = shopifyGql }) {
  const pause = warte ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  return async function gql(query, variables) {
    const mutation = istMutation(query);
    const opt = { ...(fetchFn ? { fetch: fetchFn } : {}), ...(warte ? { warte } : {}), ...(mutation ? { versuche: 1 } : {}) };
    for (let i = 0; ; i++) {
      try {
        return { data: await sg(shop, api, token, query, variables, opt) };
      } catch (e) {
        const m = String(e && e.message);
        if (mutation && NICHT_AUSGEFUEHRT.test(m) && !TAGESLIMIT.test(m) && i < drosselVersuche) { await pause(basisMs * 2 ** i); continue; }
        if (/^GraphQL: \[/.test(m)) return { errors: [{ message: m }] };
        throw e;
      }
    }
  };
}
