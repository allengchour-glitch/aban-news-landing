#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidCjPid } from './lib/cj_identity.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SERVER = 'luxestyle-cj-read';
const TOOL_STATUS = 'luxe_cj_status';
const TOOL_PRODUCT = 'luxe_cj_product_read';
const TOOL_INVENTORY = 'luxe_cj_inventory_read';
const MAX_OUTPUT = 512 * 1024;
const MAX_SUMMARY = 128 * 1024;
const TIMEOUT_MS = 45_000;
const MAX_VARIANTS = 50;
const MAX_COUNTRIES_PER_VARIANT = 20;
const REASONS = new Set([
  'authentication_rejected', 'authentication_response_rejected', 'authentication_token_invalid',
  'throttled', 'quota', 'upstream_unavailable', 'timeout', 'response_too_large',
  'response_body_unavailable', 'response_invalid_utf8', 'response_invalid_json', 'redirect_rejected',
  'network_error', 'transport_unknown', 'product_not_found', 'product_removed', 'variant_removed',
  'api_response_rejected', 'inventory_api_response_rejected', 'credential_echo_blocked',
  'product_identity_mismatch', 'malformed_product_data', 'malformed_inventory_data',
  'missing_or_invalid_pid', 'credential_binding_missing', 'credential_binding_invalid',
  'invalid_lookup', 'invalid_pid_lookup', 'inventory_output_too_large',
  'product_prerequisite_not_verified', 'inventory_variant_set_mismatch',
  'product_request_budget_exhausted', 'inventory_request_budget_exhausted'
]);

const request = (id, method, params) => JSON.stringify({ jsonrpc: '2.0', id, method,
  ...(params === undefined ? {} : { params }) });

function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function operationFromValue(value = 'product') {
  const operation = String(value || 'product').trim();
  if (operation !== 'product' && operation !== 'inventory') throw Error('invalid_operation');
  return operation;
}

export function lookupFromValues(pid = '', productSku = '', operation = 'product') {
  const selected = operationFromValue(operation);
  const p = String(pid || '').trim();
  const s = String(productSku || '').trim();
  if (selected === 'inventory') {
    if (!isValidCjPid(p) || s) throw Error('inventory_pid_only_required');
    return { pid: p };
  }
  if ((p ? 1 : 0) + (s ? 1 : 0) !== 1) throw Error('exactly_one_lookup_required');
  if (p) {
    if (!isValidCjPid(p)) throw Error('invalid_pid');
    return { pid: p };
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(s)) throw Error('invalid_product_sku');
  return { productSku: s };
}

export function probeInput(lookup, operation = 'product') {
  const selected = operationFromValue(operation);
  const frames = [
    request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {},
      clientInfo: { name: 'luxestyle-cj-actions-probe', version: '1' } }),
    request(2, 'tools/list'),
    request(3, 'tools/call', { name: TOOL_STATUS, arguments: {} }),
    request(4, 'tools/call', { name: TOOL_PRODUCT, arguments: lookup })
  ];
  if (selected === 'inventory') {
    frames.push(request(5, 'tools/call', { name: TOOL_INVENTORY, arguments: lookup }));
    frames.push(request(6, 'tools/call', { name: TOOL_STATUS, arguments: {} }));
  } else {
    frames.push(request(5, 'tools/call', { name: TOOL_STATUS, arguments: {} }));
  }
  return frames.join('\n') + '\n';
}

function content(response, id) {
  if (!object(response) || response.id !== id || !object(response.result)
    || response.result.isError !== false || !Array.isArray(response.result.content)
    || response.result.content.length !== 1 || response.result.content[0]?.type !== 'text'
    || typeof response.result.content[0].text !== 'string') throw Error('invalid_mcp_response');
  let value;
  try { value = JSON.parse(response.result.content[0].text); } catch { throw Error('invalid_tool_json'); }
  if (!object(value)) throw Error('invalid_tool_result');
  return value;
}

function allowed(value, values, fallback = 'unknown') {
  return typeof value === 'string' && values.has(value) ? value : fallback;
}

function identity(value, pattern, max) {
  return typeof value === 'string' && value.length <= max && pattern.test(value) ? value : null;
}

function requestCount(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1 ? value : null;
}

function safeInventoryNumber(value) {
  return value === null || Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function vidIdentity(value) {
  return identity(value, /^[0-9A-Za-z][0-9A-Za-z-]{5,63}$/, 64);
}

function pidIdentity(value) { return isValidCjPid(value) ? value : null; }

function safeCountryRow(value) {
  if (!object(value)) return null;
  return {
    countryCode: value.countryCode === null
      || typeof value.countryCode === 'string' && /^[A-Z]{2}$/.test(value.countryCode)
      ? value.countryCode : null,
    totalInventory: safeInventoryNumber(value.totalInventory),
    cjInventory: safeInventoryNumber(value.cjInventory),
    factoryInventory: safeInventoryNumber(value.factoryInventory),
    verifiedWarehouse: value.verifiedWarehouse === 1 || value.verifiedWarehouse === 2
      ? value.verifiedWarehouse : null
  };
}

function productFields(read) {
  return {
    readState: allowed(read.state, new Set(['unknown', 'mismatch', 'product_identity_verified'])),
    readReason: read.reason === null ? null : allowed(read.reason, REASONS),
    authenticationRequests: requestCount(read.requests?.authentication),
    productRequests: requestCount(read.requests?.product),
    returnedPid: pidIdentity(read.product?.product?.pid),
    returnedProductSku: identity(read.product?.product?.productSku,
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/, 200)
  };
}

function productIdentityMatchesLookup(product, lookup) {
  if (!object(lookup) || Object.keys(lookup).length !== 1
    || product.returnedPid === null || product.returnedProductSku === null) return false;
  if (typeof lookup.pid === 'string') return product.returnedPid === lookup.pid;
  return typeof lookup.productSku === 'string' && product.returnedProductSku === lookup.productSku;
}

function completeVariantRecords(value, expectedState, identityField) {
  if (!object(value) || value.state !== expectedState || value.partial !== false
    || !Number.isInteger(value.reported) || value.reported <= 0 || value.reported > MAX_VARIANTS
    || value.returned !== value.reported || !Array.isArray(value.records)
    || value.records.length !== value.reported) return null;
  const records = [];
  const identities = new Set();
  const skus = new Set();
  for (const record of value.records) {
    if (!object(record)) return null;
    const vid = vidIdentity(record.vid);
    const vidKey = vid?.toUpperCase();
    if (!vid || identities.has(vidKey)) return null;
    identities.add(vidKey);
    if (identityField === 'product') {
      const variantSku = identity(record.variantSku, /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/, 200);
      const skuKey = variantSku?.toUpperCase();
      if (!variantSku || skus.has(skuKey)) return null;
      skus.add(skuKey);
      records.push({ record, vid, vidKey, variantSku });
    } else records.push({ record, vid, vidKey });
  }
  return { records, identities };
}

function inventoryVariants(productRead, inventoryRead) {
  const product = completeVariantRecords(productRead.product?.product?.variants,
    'supplier_metadata_returned', 'product');
  const inventory = completeVariantRecords(inventoryRead.inventory?.variants,
    'supplier_inventory_returned', 'inventory');
  if (!product || !inventory || product.records.length !== inventory.records.length
    || [...product.identities].some(vid => !inventory.identities.has(vid))) return null;
  const byVid = new Map();
  for (const value of inventory.records) byVid.set(value.vidKey, value.record);
  const records = product.records.map(value => {
    const found = byVid.get(value.vidKey);
    const countries = found?.countries;
    if (!found || !object(countries) || countries.state !== 'supplier_inventory_returned'
      || countries.partial !== false || !Number.isInteger(countries.reported)
      || countries.reported < 0 || countries.reported > MAX_COUNTRIES_PER_VARIANT
      || countries.returned !== countries.reported || !Array.isArray(countries.records)
      || countries.records.length !== countries.reported) {
      return { vid: value.vid, variantSku: value.variantSku,
        inventoryState: 'unknown', countries: null };
    }
    const safeCountries = countries.records.map(safeCountryRow);
    if (safeCountries.some(row => row === null)) {
      return { vid: value.vid, variantSku: value.variantSku,
        inventoryState: 'unknown', countries: null };
    }
    return { vid: value.vid, variantSku: value.variantSku,
      inventoryState: 'returned', countries: safeCountries };
  });
  const hasMappedInventory = records.some(value => value.inventoryState !== 'unknown'
    && value.countries?.some(country => country.totalInventory !== null
      || country.cjInventory !== null || country.factoryInventory !== null));
  return { records, hasMappedInventory };
}

function parseResponses(stdout, expected) {
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout, 'utf8') > MAX_OUTPUT) {
    throw Error('invalid_mcp_output');
  }
  let responses;
  try { responses = stdout.trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch { throw Error('invalid_mcp_output'); }
  if (responses.length !== expected || responses[0]?.id !== 1 || responses[1]?.id !== 2) {
    throw Error('invalid_mcp_sequence');
  }
  if (responses[0]?.result?.serverInfo?.name !== SERVER
    || responses[0]?.result?.protocolVersion !== '2025-06-18') throw Error('unexpected_mcp_server');
  const tools = responses[1]?.result?.tools;
  if (!Array.isArray(tools) || tools.length !== 3
    || tools[0]?.name !== TOOL_STATUS || tools[1]?.name !== TOOL_PRODUCT
    || tools[2]?.name !== TOOL_INVENTORY) throw Error('unexpected_mcp_tools');
  return responses;
}

export function summariseProbe(stdout, lookup, operation = 'product') {
  const selected = operationFromValue(operation);
  const responses = parseResponses(stdout, selected === 'inventory' ? 6 : 5);
  const before = content(responses[2], 3);
  const productRead = content(responses[3], 4);
  const after = content(responses[selected === 'inventory' ? 5 : 4], selected === 'inventory' ? 6 : 5);
  const binding = allowed(before.credentialBinding, new Set(['missing', 'invalid', 'bound_unverified']));
  const product = productFields(productRead);
  const connection = allowed(after.connection, new Set(['unknown_until_product_read', 'verified_by_product_read']));
  const lastRead = allowed(after.lastProductReadState, new Set(['not_attempted', 'unknown', 'verified']));
  const productIdentityBound = productIdentityMatchesLookup(product, lookup);
  if (selected === 'product') {
    const verified = binding === 'bound_unverified' && product.readState === 'product_identity_verified'
      && product.readReason === null && product.authenticationRequests === 1 && product.productRequests === 1
      && productIdentityBound && connection === 'verified_by_product_read' && lastRead === 'verified';
    return {
      provider: 'CJdropshipping', mode: 'read_only', operation: selected, transport: 'ok', lookup,
      credentialBinding: binding, authenticationRequests: product.authenticationRequests,
      productRequests: product.productRequests, readState: product.readState, readReason: product.readReason,
      returnedPid: product.returnedPid, returnedProductSku: product.returnedProductSku,
      connectionAfter: connection, lastProductReadState: lastRead, verified
    };
  }

  const inventoryRead = content(responses[4], 5);
  const inventoryState = allowed(inventoryRead.state, new Set(['unknown', 'inventory_returned']));
  const inventoryReason = inventoryRead.reason === null ? null : allowed(inventoryRead.reason, REASONS);
  const inventoryAuthentication = requestCount(inventoryRead.requests?.authentication);
  const inventoryRequests = requestCount(inventoryRead.requests?.inventory);
  const authenticationRequests = product.authenticationRequests === null || inventoryAuthentication === null
    ? null : product.authenticationRequests + inventoryAuthentication;
  const inventoryPid = pidIdentity(inventoryRead.inventory?.pid);
  const variantBinding = inventoryVariants(productRead, inventoryRead);
  const variants = variantBinding?.records ?? null;
  const inventoryPartial = inventoryRead.inventory?.variants?.partial === true;
  const lastInventoryRead = allowed(after.lastInventoryReadState,
    new Set(['not_attempted', 'unknown', 'returned']));
  const verified = binding === 'bound_unverified' && product.readState === 'product_identity_verified'
    && product.readReason === null && product.authenticationRequests === 1 && product.productRequests === 1
    && inventoryState === 'inventory_returned' && inventoryReason === null
    && inventoryAuthentication === 0 && authenticationRequests === 1 && inventoryRequests === 1
    && productIdentityBound && inventoryPid === lookup.pid
    && variantBinding?.hasMappedInventory === true
    && connection === 'verified_by_product_read' && lastRead === 'verified'
    && lastInventoryRead === 'returned';
  const summary = {
    provider: 'CJdropshipping', mode: 'read_only', operation: selected, transport: 'ok', lookup,
    credentialBinding: binding, authenticationRequests, productRequests: product.productRequests,
    inventoryRequests, productReadState: product.readState, productReadReason: product.readReason,
    inventoryReadState: inventoryState, inventoryReadReason: inventoryReason,
    returnedPid: product.returnedPid, returnedProductSku: product.returnedProductSku,
    variants: variants?.filter(Boolean) ?? null, inventoryPartial,
    countryAggregation: false, deliveryToSwitzerland: 'unknown',
    connectionAfter: connection, lastProductReadState: lastRead,
    lastInventoryReadState: lastInventoryRead, verified
  };
  if (Buffer.byteLength(JSON.stringify(summary), 'utf8') > MAX_SUMMARY) throw Error('summary_too_large');
  return summary;
}

export function runConfiguredProbe({ root = ROOT, env = process.env, spawn = spawnSync,
  read = readFileSync } = {}) {
  const operation = operationFromValue(env.CJ_MCP_OPERATION || 'product');
  const lookup = lookupFromValues(env.CJ_MCP_PID, env.CJ_MCP_PRODUCT_SKU, operation);
  let config;
  try { config = JSON.parse(read(path.join(root, '.mcp.json'), 'utf8')); }
  catch { throw Error('invalid_mcp_config'); }
  const selected = config?.mcpServers?.[SERVER];
  if (!object(selected) || selected.type !== 'stdio' || typeof selected.command !== 'string'
    || !selected.command || !Array.isArray(selected.args) || !selected.args.length
    || selected.args.some(value => typeof value !== 'string') || !object(selected.env)
    || Object.keys(selected.env).some(key => /CJ_|TOKEN|SECRET|KEY/i.test(key))) {
    throw Error('invalid_mcp_config');
  }
  const child = spawn(selected.command, selected.args, { cwd: root,
    input: probeInput(lookup, operation), encoding: 'utf8', env: { ...env, ...selected.env },
    timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT, windowsHide: true });
  if (child?.error || child?.status !== 0 || child?.signal || typeof child?.stdout !== 'string') {
    throw Error('mcp_probe_process_failed');
  }
  return summariseProbe(child.stdout, lookup, operation);
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  try {
    const summary = runConfiguredProbe();
    console.log(`CJ_MCP_PROBE=${JSON.stringify(summary)}`);
    if (!summary.verified) process.exitCode = 1;
  } catch {
    console.log('CJ_MCP_PROBE={"provider":"CJdropshipping","mode":"read_only","transport":"failed","verified":false,"reason":"probe_failed"}');
    process.exitCode = 1;
  }
}
