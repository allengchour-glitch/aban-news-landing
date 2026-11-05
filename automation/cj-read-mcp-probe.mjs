#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'product_prerequisite_not_verified'
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
    if (!/^[0-9]{6,40}$/.test(p) || s) throw Error('inventory_pid_only_required');
    return { pid: p };
  }
  if ((p ? 1 : 0) + (s ? 1 : 0) !== 1) throw Error('exactly_one_lookup_required');
  if (p) {
    if (!/^[0-9]{6,40}$/.test(p)) throw Error('invalid_pid');
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
    returnedPid: identity(read.product?.product?.pid, /^[0-9]{6,40}$/, 40),
    returnedProductSku: identity(read.product?.product?.productSku,
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/, 200)
  };
}

function inventoryVariants(productRead, inventoryRead) {
  const product = productRead.product?.product?.variants?.records;
  const inventory = inventoryRead.inventory?.variants?.records;
  if (!Array.isArray(product) || product.length > MAX_VARIANTS || !Array.isArray(inventory)
    || inventory.length > MAX_VARIANTS) return null;
  const byVid = new Map();
  const duplicates = new Set();
  for (const value of inventory) {
    if (!object(value)) continue;
    const vid = vidIdentity(value.vid);
    if (!vid) continue;
    if (byVid.has(vid)) duplicates.add(vid);
    byVid.set(vid, value);
  }
  return product.map(value => {
    if (!object(value)) return null;
    const vid = vidIdentity(value.vid);
    const variantSku = identity(value.variantSku, /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/, 200);
    if (!vid || !variantSku) return null;
    const found = byVid.get(vid);
    if (!found || duplicates.has(vid) || !object(found.countries)
      || !Array.isArray(found.countries.records)
      || found.countries.records.length > MAX_COUNTRIES_PER_VARIANT) {
      return { vid, variantSku, inventoryState: 'unknown', countries: null };
    }
    const countries = found.countries.records.map(safeCountryRow);
    if (countries.some(row => row === null)) {
      return { vid, variantSku, inventoryState: 'unknown', countries: null };
    }
    return { vid, variantSku,
      inventoryState: found.countries.partial === true ? 'partial' : 'returned', countries };
  });
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
  if (selected === 'product') {
    const verified = binding === 'bound_unverified' && product.readState === 'product_identity_verified'
      && product.readReason === null && product.authenticationRequests === 1 && product.productRequests === 1
      && connection === 'verified_by_product_read' && lastRead === 'verified';
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
  const inventoryPid = identity(inventoryRead.inventory?.pid, /^[0-9]{6,40}$/, 40);
  const variants = inventoryVariants(productRead, inventoryRead);
  const inventoryPartial = inventoryRead.inventory?.variants?.partial === true;
  const lastInventoryRead = allowed(after.lastInventoryReadState,
    new Set(['not_attempted', 'unknown', 'returned']));
  const verified = binding === 'bound_unverified' && product.readState === 'product_identity_verified'
    && product.readReason === null && product.authenticationRequests === 1 && product.productRequests === 1
    && inventoryState === 'inventory_returned' && inventoryReason === null
    && inventoryAuthentication === 0 && authenticationRequests === 1 && inventoryRequests === 1
    && product.returnedPid === lookup.pid && inventoryPid === lookup.pid
    && product.returnedProductSku !== null && variants !== null && variants.every(Boolean)
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
