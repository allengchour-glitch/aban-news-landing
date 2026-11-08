import { isValidCjLookup, isValidCjPidLookup } from './cj_readonly.mjs';
import { CJ_PID_JSON_PATTERN } from './cj_identity.mjs';

const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
const externalRead = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true };
const lookupProperties = {
  pid: { type: 'string', minLength: 6, maxLength: 40, pattern: CJ_PID_JSON_PATTERN },
  productSku: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$' },
  variantSku: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$' }
};

export const CJ_MCP_TOOLS = Object.freeze([
  { name: 'luxe_cj_status',
    description: 'Prüft lokal Vorhandensein und Form der CJdropshipping-API-Key-Prozessbindung. Herkunft und CJ-Gültigkeit bleiben unbekannt. Kein Netzwerkaufruf.',
    inputSchema: emptySchema, annotations: { ...externalRead, idempotentHint: true, openWorldHint: false } },
  { name: 'luxe_cj_product_read',
    description: 'Liest genau ein CJdropshipping-Produkt per pid, productSku oder variantSku. variantSku wird nur gegen eine vollständig gelieferte Variantenliste gebunden. Keine Suche, Pagination, Imports, Käufe oder Shop-Schreibzugriffe.',
    inputSchema: { type: 'object', properties: lookupProperties, additionalProperties: false,
      oneOf: [{ required: ['pid'] }, { required: ['productSku'] }, { required: ['variantSku'] }] }, annotations: externalRead },
  { name: 'luxe_cj_inventory_read',
    description: 'Liest genau einen begrenzten CJ-Lagerbericht per pid. Länder bleiben getrennt; Bestand belegt keine Lieferbarkeit in die Schweiz.',
    inputSchema: { type: 'object', properties: { pid: lookupProperties.pid },
      required: ['pid'], additionalProperties: false }, annotations: externalRead }
]);

export const CJ_MCP_SERVER = Object.freeze({ name: 'luxestyle-cj-read', version: '1.2.0' });
export const CJ_MCP_INSTRUCTIONS = 'Rein lesender CJdropshipping-Quellenzugriff für LuxeStyle. '
  + 'Fehlende Bindung, Auth-/Quota-/Drosselungsfehler und unlesbare Antworten bleiben unbekannt. '
  + 'Lagerwerte bleiben je Variante und Land getrennt und belegen keine Lieferbarkeit in die Schweiz. '
  + 'Keine Suche, Pagination, Imports, Bestellungen, Käufe, Render- oder Shop-Schreibzugriffe.';

export function validateCjMcpArguments(name, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
  if (name === 'luxe_cj_status') return Object.keys(args).length === 0;
  if (name === 'luxe_cj_product_read') return isValidCjLookup(args);
  return name === 'luxe_cj_inventory_read' && isValidCjPidLookup(args);
}

export function createCjMcpHandlers(client) {
  if (!client || typeof client.status !== 'function' || typeof client.readProduct !== 'function'
    || typeof client.readInventory !== 'function') {
    throw new TypeError('Ein gültiger CJ-Leseclient ist erforderlich.');
  }
  return {
    luxe_cj_status: () => client.status(),
    luxe_cj_product_read: args => client.readProduct(args),
    luxe_cj_inventory_read: args => client.readInventory(args)
  };
}
