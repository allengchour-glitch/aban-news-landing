#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SERVER = 'luxestyle-cj-read';
const TOOL_STATUS = 'luxe_cj_status';
const TOOL_PRODUCT = 'luxe_cj_product_read';
const MAX_OUTPUT = 512 * 1024;
const TIMEOUT_MS = 45_000;
const REASONS = new Set([
  'authentication_rejected', 'authentication_response_rejected', 'authentication_token_invalid',
  'throttled', 'quota', 'upstream_unavailable', 'timeout', 'response_too_large',
  'response_body_unavailable', 'response_invalid_utf8', 'response_invalid_json', 'redirect_rejected',
  'network_error', 'transport_unknown', 'product_not_found', 'product_removed', 'variant_removed',
  'api_response_rejected', 'credential_echo_blocked', 'product_identity_mismatch',
  'malformed_product_data', 'missing_or_invalid_pid', 'credential_binding_missing',
  'credential_binding_invalid', 'invalid_lookup'
]);

const request = (id, method, params) => JSON.stringify({ jsonrpc: '2.0', id, method,
  ...(params === undefined ? {} : { params }) });

function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function lookupFromValues(pid = '', productSku = '') {
  const p = String(pid || '').trim();
  const s = String(productSku || '').trim();
  if ((p ? 1 : 0) + (s ? 1 : 0) !== 1) throw Error('exactly_one_lookup_required');
  if (p) {
    if (!/^[0-9]{6,40}$/.test(p)) throw Error('invalid_pid');
    return { pid: p };
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(s)) throw Error('invalid_product_sku');
  return { productSku: s };
}

export function probeInput(lookup) {
  const frames = [
    request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {},
      clientInfo: { name: 'luxestyle-cj-actions-probe', version: '1' } }),
    request(2, 'tools/list'),
    request(3, 'tools/call', { name: TOOL_STATUS, arguments: {} }),
    request(4, 'tools/call', { name: TOOL_PRODUCT, arguments: lookup }),
    request(5, 'tools/call', { name: TOOL_STATUS, arguments: {} })
  ];
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

export function summariseProbe(stdout, lookup) {
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout, 'utf8') > MAX_OUTPUT) {
    throw Error('invalid_mcp_output');
  }
  let responses;
  try { responses = stdout.trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch { throw Error('invalid_mcp_output'); }
  if (responses.length !== 5 || responses[0]?.id !== 1 || responses[1]?.id !== 2) {
    throw Error('invalid_mcp_sequence');
  }
  if (responses[0]?.result?.serverInfo?.name !== SERVER
    || responses[0]?.result?.protocolVersion !== '2025-06-18') throw Error('unexpected_mcp_server');
  const tools = responses[1]?.result?.tools;
  if (!Array.isArray(tools) || tools.length !== 2
    || tools[0]?.name !== TOOL_STATUS || tools[1]?.name !== TOOL_PRODUCT) throw Error('unexpected_mcp_tools');
  const before = content(responses[2], 3);
  const read = content(responses[3], 4);
  const after = content(responses[4], 5);
  const binding = allowed(before.credentialBinding, new Set(['missing', 'invalid', 'bound_unverified']));
  const readState = allowed(read.state, new Set(['unknown', 'mismatch', 'product_identity_verified']));
  const reason = read.reason === null ? null : allowed(read.reason, REASONS);
  const connection = allowed(after.connection, new Set(['unknown_until_product_read', 'verified_by_product_read']));
  const lastRead = allowed(after.lastProductReadState, new Set(['not_attempted', 'unknown', 'verified']));
  const authentication = Number.isInteger(read.requests?.authentication)
    && read.requests.authentication >= 0 && read.requests.authentication <= 1 ? read.requests.authentication : null;
  const product = Number.isInteger(read.requests?.product)
    && read.requests.product >= 0 && read.requests.product <= 1 ? read.requests.product : null;
  const returnedPid = identity(read.product?.product?.pid, /^[0-9]{6,40}$/, 40);
  const returnedProductSku = identity(read.product?.product?.productSku,
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/, 200);
  const verified = binding === 'bound_unverified' && readState === 'product_identity_verified'
    && reason === null && authentication === 1 && product === 1
    && connection === 'verified_by_product_read' && lastRead === 'verified';
  return {
    provider: 'CJdropshipping', mode: 'read_only', transport: 'ok', lookup,
    credentialBinding: binding, authenticationRequests: authentication,
    productRequests: product, readState, readReason: reason,
    returnedPid, returnedProductSku, connectionAfter: connection,
    lastProductReadState: lastRead, verified
  };
}

export function runConfiguredProbe({ root = ROOT, env = process.env, spawn = spawnSync,
  read = readFileSync } = {}) {
  const lookup = lookupFromValues(env.CJ_MCP_PID, env.CJ_MCP_PRODUCT_SKU);
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
  const child = spawn(selected.command, selected.args, { cwd: root, input: probeInput(lookup), encoding: 'utf8',
    env: { ...env, ...selected.env }, timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT, windowsHide: true });
  if (child?.error || child?.status !== 0 || child?.signal || typeof child?.stdout !== 'string') {
    throw Error('mcp_probe_process_failed');
  }
  return summariseProbe(child.stdout, lookup);
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
