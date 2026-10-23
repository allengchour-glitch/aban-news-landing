// Transport only: no filesystem, network, subprocesses, or model calls.
export const MAX_MCP_LINE_BYTES = 64 * 1024;
const PROTOCOLS = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const textField = (maxLength = 4000) => ({ type: 'string', minLength: 1, maxLength });
const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
const commitField = () => ({ type: 'string', minLength: 40, maxLength: 40, pattern: '^[a-fA-F0-9]{40}$' });
const changePlanSchema = { type: 'object', properties: { baseCommit: commitField(), headCommit: commitField() },
  additionalProperties: false, oneOf: [{ maxProperties: 0 }, { required: ['baseCommit', 'headCommit'] }] };
const reviewVerdicts = ['findings', 'no_findings', 'blocked'];
const annotations = readOnly => ({ readOnlyHint: readOnly, destructiveHint: false,
  idempotentHint: readOnly, openWorldHint: false });

export const MCP_TOOLS = [
  { name: 'luxe_doctor', description: 'Lokalen Projektstatus und datierte Belege prüfen; keine Live-API-Prüfung.',
    inputSchema: emptySchema, annotations: annotations(true) },
  { name: 'luxe_checks', description: 'Ein festes lokales Offline-Testprofil ausführen; keine operativen Skripte.',
    inputSchema: { type: 'object', properties: { suite: { type: 'string', enum: ['core', 'seo', 'assist', 'changed'] } },
      required: ['suite'], additionalProperties: false }, annotations: annotations(true) },
  { name: 'luxe_handoff_read', description: 'Vorhandene lokale Übergabe lesen; fehlende Daten bleiben unbekannt.',
    inputSchema: emptySchema, annotations: annotations(true) },
  { name: 'luxe_handoff_save', description: 'Eine manuelle lokale Übergabe sichern; keine externe Aktion.',
    inputSchema: { type: 'object', properties: { summary: textField(), nextStep: textField(2000),
      blockers: { type: 'array', maxItems: 12, items: textField(500) },
      files: { type: 'array', maxItems: 6, items: textField(512) } },
      required: ['summary', 'nextStep'], additionalProperties: false }, annotations: annotations(false) },
  { name: 'luxe_review_request', description: 'Lokale Codex-Prüfaufgabe vorbereiten; ruft kein Modell und keinen Dienst auf.',
    inputSchema: { type: 'object', properties: { question: textField(),
      files: { type: 'array', maxItems: 6, items: textField(512) } },
      required: ['question'], additionalProperties: false }, annotations: annotations(false) },
  { name: 'luxe_change_plan', description: 'Lokalen Änderungsplan ermitteln, optional zwischen zwei vollständig gepinnten lokalen Commits. Reine Planung: keine Tests, kein Checkout und kein Fetch.',
    inputSchema: changePlanSchema, annotations: annotations(true) },
  { name: 'luxe_review_list', description: 'Lokal gespeicherte Prüfaufgaben und Antworten lesen; keine Modellaufrufe.',
    inputSchema: { type: 'object', properties: { after: textField(80) }, additionalProperties: false }, annotations: annotations(true) },
  { name: 'luxe_review_get', description: 'Eine lokale Prüfaufgabe mit vollständiger Frage und Antwort lesen; keine Modellaufrufe.',
    inputSchema: { type: 'object', properties: { requestId: textField(80) }, required: ['requestId'], additionalProperties: false }, annotations: annotations(true) },
  { name: 'luxe_review_answer', description: 'Antwort auf eine bestehende lokale Prüfaufgabe speichern; keine externe Aktion.',
    inputSchema: { type: 'object', properties: { requestId: textField(80),
      verdict: { type: 'string', enum: reviewVerdicts }, summary: textField(), nextStep: textField(2000),
      blockers: { type: 'array', maxItems: 12, items: textField(500) } },
      required: ['requestId', 'verdict', 'summary', 'nextStep'], additionalProperties: false }, annotations: annotations(false) },
  { name: 'luxe_context', description: 'Begrenzten lokalen Dateikontext für eine Frage lesen; keine Netzwerk- oder Modellaufrufe.',
    inputSchema: { type: 'object', properties: { files: { type: 'array', maxItems: 6, items: textField(512) },
      question: textField(2000) }, required: ['files', 'question'], additionalProperties: false }, annotations: annotations(true) }
];

function validText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function validList(value, maxLength, maxItems) {
  return Array.isArray(value) && value.length <= maxItems && value.every(item => validText(item, maxLength));
}

function validArguments(name, args) {
  if (!object(args)) return false;
  const keys = Object.keys(args);
  if (['luxe_doctor', 'luxe_handoff_read'].includes(name)) return keys.length === 0;
  if (name === 'luxe_change_plan') return keys.length === 0 || (keys.length === 2
    && own(args, 'baseCommit') && own(args, 'headCommit')
    && typeof args.baseCommit === 'string' && args.baseCommit.length === 40 && /^[a-fA-F0-9]{40}$/.test(args.baseCommit)
    && typeof args.headCommit === 'string' && args.headCommit.length === 40 && /^[a-fA-F0-9]{40}$/.test(args.headCommit));
  if (name === 'luxe_review_list') return keys.every(key => key === 'after')
    && (!own(args, 'after') || validText(args.after, 80));
  if (name === 'luxe_review_get') return keys.length === 1 && own(args, 'requestId') && validText(args.requestId, 80);
  if (name === 'luxe_checks') return keys.length === 1 && own(args, 'suite') && ['core', 'seo', 'assist', 'changed'].includes(args.suite);
  if (name === 'luxe_handoff_save') return keys.every(key => ['summary', 'nextStep', 'blockers', 'files'].includes(key))
    && validText(args.summary, 4000) && validText(args.nextStep, 2000)
    && (!own(args, 'blockers') || validList(args.blockers, 500, 12))
    && (!own(args, 'files') || validList(args.files, 512, 6));
  if (name === 'luxe_review_request') return keys.every(key => ['question', 'files'].includes(key))
    && validText(args.question, 4000) && (!own(args, 'files') || validList(args.files, 512, 6));
  if (name === 'luxe_review_answer') return keys.every(key => ['requestId', 'verdict', 'summary', 'nextStep', 'blockers'].includes(key))
    && validText(args.requestId, 80) && reviewVerdicts.includes(args.verdict)
    && validText(args.summary, 4000) && validText(args.nextStep, 2000)
    && (!own(args, 'blockers') || validList(args.blockers, 500, 12));
  if (name === 'luxe_context') return keys.every(key => ['files', 'question'].includes(key))
    && validList(args.files, 512, 6) && validText(args.question, 2000);
  return false;
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function errorResult(message) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

async function dispatch(request, handlers) {
  if (!object(request)) return rpcError(null, -32600, 'JSON-RPC-Batches und Nicht-Objekte sind nicht unterstützt.');
  // All notifications are deliberately silent, including unknown notifications.
  if (!own(request, 'id')) return null;
  const id = request.id;
  if (!(id === null || typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id)))) {
    return rpcError(null, -32600, 'Ungültige Request-ID.');
  }
  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return rpcError(id, -32600, 'Ungültiger JSON-RPC-Request.');
  }
  const result = value => ({ jsonrpc: '2.0', id, result: value });
  const params = request.params;
  if (request.method === 'initialize') {
    if (!object(params) || typeof params.protocolVersion !== 'string'
      || (own(params, 'capabilities') && !object(params.capabilities))
      || (own(params, 'clientInfo') && !object(params.clientInfo))) {
      return rpcError(id, -32602, 'initialize erwartet protocolVersion und gültige Clientdaten.');
    }
    return result({ protocolVersion: PROTOCOLS.has(params.protocolVersion) ? params.protocolVersion : '2025-06-18',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'luxestyle-claude-assist', version: '2.4.0' },
      instructions: 'Lokaler LuxeStyle-Helfer. Keine Live-APIs, Publikationen oder Modellaufrufe. Übergaben sind datierte Belege.' });
  }
  if (request.method === 'ping' || request.method === 'tools/list') {
    if (params !== undefined && (!object(params) || Object.keys(params).length !== 0)) {
      return rpcError(id, -32602, 'Diese Methode erwartet keine Argumente.');
    }
    return result(request.method === 'ping' ? {} : { tools: MCP_TOOLS });
  }
  if (request.method !== 'tools/call') return rpcError(id, -32601, 'Methode nicht unterstützt.');
  if (!object(params) || Object.keys(params).some(key => !['name', 'arguments'].includes(key))
    || typeof params.name !== 'string' || !MCP_TOOLS.some(tool => tool.name === params.name)) {
    return rpcError(id, -32602, 'Unbekanntes Tool oder ungültige Tool-Parameter.');
  }
  const args = own(params, 'arguments') ? params.arguments : {};
  if (!validArguments(params.name, args)) return rpcError(id, -32602, 'Ungültige oder zusätzliche Tool-Argumente.');
  if (!own(handlers, params.name) || typeof handlers[params.name] !== 'function') {
    return result(errorResult('Dieser lokale Handler ist nicht verfügbar.'));
  }
  try {
    const value = await handlers[params.name](args);
    const serialized = JSON.stringify(value === undefined ? null : value);
    if (Buffer.byteLength(serialized, 'utf8') > 256 * 1024) {
      return result(errorResult('Lokales Ergebnis überschreitet das Ausgabelimit.'));
    }
    return result({ content: [{ type: 'text', text: serialized }], isError: false });
  } catch (error) {
    // Handlers must provide non-sensitive messages; never expose stack traces.
    const message = typeof error?.message === 'string' ? error.message.slice(0, 1000) : 'Lokaler Helfer fehlgeschlagen.';
    return result(errorResult(message));
  }
}

/** Serve newline-delimited JSON-RPC, processing one request at a time. */
export async function serveMcp({ input, output, handlers = {} }) {
  if (!input?.[Symbol.asyncIterator] || typeof output?.write !== 'function'
    || typeof output.on !== 'function' || typeof output.removeListener !== 'function' || !object(handlers)) {
    throw new TypeError('input, output und ein Handler-Objekt sind erforderlich.');
  }
  const buffer = Buffer.alloc(MAX_MCP_LINE_BYTES);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let oversized = false;
  let outputFailed = false, abortWrite;
  const outputError = () => Error('MCP-Ausgabe geschlossen oder fehlgeschlagen.');
  const outputUnavailable = () => outputFailed || output.destroyed || output.closed
    || output.writableEnded || output.writableFinished || output.writable === false;
  // Keep an error listener throughout dispatch as a client may disconnect while
  // a handler yields, before the next response starts writing.
  const onOutputFailure = () => { outputFailed = true; abortWrite?.(); };
  output.on('error', onOutputFailure);
  output.on('close', onOutputFailure);
  async function send(response) {
    if (response === null) return;
    if (outputUnavailable()) throw outputError();
    await new Promise((resolve, reject) => {
      let settled = false, returned = false, written = false, needsDrain = false, drained = false;
      const finish = failed => {
        if (settled) return;
        settled = true;
        output.removeListener('drain', onDrain);
        abortWrite = undefined;
        if (failed) reject(outputError()); else resolve();
      };
      const complete = () => {
        if (returned && written && (!needsDrain || drained)) finish(outputUnavailable());
      };
      const onDrain = () => { drained = true; complete(); };
      abortWrite = () => finish(true);
      output.on('drain', onDrain);
      try {
        // Await the write callback even without backpressure. Otherwise a late
        // EPIPE could arrive after this server has removed its error listener.
        needsDrain = !output.write(JSON.stringify(response) + '\n', error => {
          // A standard Writable emits error before close after a failed write;
          // the lifetime listener handles that event without leaking its text.
          if (error) return;
          written = true; complete();
        });
        returned = true;
        if (outputUnavailable()) finish(true); else complete();
      } catch { finish(true); }
    });
  }
  async function finishLine() {
    if (oversized) {
      await send(rpcError(null, -32600, 'Request überschreitet 64 KiB.'));
    } else if (length > 0) {
      let request;
      try { request = JSON.parse(decoder.decode(buffer.subarray(0, length))); }
      catch { await send(rpcError(null, -32700, 'Ungültiges JSON oder UTF-8.')); length = 0; return; }
      await send(await dispatch(request, handlers));
    }
    length = 0;
    oversized = false;
  }
  try {
    if (outputUnavailable()) throw outputError();
    for await (const chunk of input) {
      if (outputUnavailable()) throw outputError();
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      let start = 0;
      while (start < bytes.length) {
        const newline = bytes.indexOf(10, start);
        const end = newline === -1 ? bytes.length : newline;
        const count = end - start;
        if (!oversized) {
          if (length + count > MAX_MCP_LINE_BYTES) { oversized = true; length = 0; }
          else { bytes.copy(buffer, length, start, end); length += count; }
        }
        if (newline === -1) break;
        await finishLine();
        start = end + 1;
      }
    }
    if (length > 0 || oversized) await finishLine();
    if (outputUnavailable()) throw outputError();
  } finally {
    // destroy(error) inside _write marks destroyed immediately but emits its
    // error on the next tick. Keep the guard through that queued event before
    // removing listeners, including streams configured with emitClose:false.
    if (output.destroyed && !outputFailed) {
      await new Promise(resolve => setImmediate(resolve));
    }
    output.removeListener('error', onOutputFailure);
    output.removeListener('close', onOutputFailure);
  }
}
