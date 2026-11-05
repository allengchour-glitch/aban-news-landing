import { isValidCjLookup } from './cj_readonly.mjs';

const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
const externalRead = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true };
const lookupProperties = {
  pid: { type: 'string', minLength: 6, maxLength: 40, pattern: '^[0-9]{6,40}$' },
  productSku: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$' }
};

export const CJ_MCP_TOOLS = Object.freeze([
  { name: 'luxe_cj_status',
    description: 'Prüft lokal Vorhandensein und Form der CJdropshipping-API-Key-Prozessbindung. Herkunft und CJ-Gültigkeit bleiben unbekannt. Kein Netzwerkaufruf.',
    inputSchema: emptySchema, annotations: { ...externalRead, idempotentHint: true, openWorldHint: false } },
  { name: 'luxe_cj_product_read',
    description: 'Liest genau ein CJdropshipping-Produkt per pid oder productSku. Keine Suche, Pagination, Imports, Käufe oder Shop-Schreibzugriffe.',
    inputSchema: { type: 'object', properties: lookupProperties, additionalProperties: false,
      oneOf: [{ required: ['pid'] }, { required: ['productSku'] }] }, annotations: externalRead }
]);

export const CJ_MCP_SERVER = Object.freeze({ name: 'luxestyle-cj-read', version: '1.0.0' });
export const CJ_MCP_INSTRUCTIONS = 'Rein lesender CJdropshipping-Quellenzugriff für LuxeStyle. '
  + 'Fehlende Bindung, Auth-/Quota-/Drosselungsfehler und unlesbare Antworten bleiben unbekannt. '
  + 'Keine Suche, Pagination, Imports, Bestellungen, Käufe, Render- oder Shop-Schreibzugriffe.';

export function validateCjMcpArguments(name, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
  if (name === 'luxe_cj_status') return Object.keys(args).length === 0;
  return name === 'luxe_cj_product_read' && isValidCjLookup(args);
}

export function createCjMcpHandlers(client) {
  if (!client || typeof client.status !== 'function' || typeof client.readProduct !== 'function') {
    throw new TypeError('Ein gültiger CJ-Leseclient ist erforderlich.');
  }
  return {
    luxe_cj_status: () => client.status(),
    luxe_cj_product_read: args => client.readProduct(args)
  };
}
