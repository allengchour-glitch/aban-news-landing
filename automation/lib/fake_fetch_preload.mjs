// fake_fetch_preload.mjs — wiederverwendbares Fake-fetch für Offline-Tests von Node-Skripten (19.10.2026).
//
// ANLASS: Idee aus Codex-PR #2673 (Skript im Wegwerf-Ordner starten, fetch per --import fälschen, env nur mit PATH, jeden
// Aufruf in calls.jsonl festhalten). Dort war das Fake in jeder Testdatei neu in einen String geschrieben. Hier EINMAL, mit
// kleiner, fester Schnittstelle — andere Tests (Wächter, Importer) hängen sich mit zwei Umgebungsvariablen ein.
//
// BENUTZUNG (der Test startet das Skript als Kindprozess; Helfer dafür: automation/lib/fake_fetch_lauf.mjs):
//   env -i PATH=… FAKE_FETCH_SCENARIO=/tmp/x/szenario.json FAKE_FETCH_CALLS=/tmp/x/calls.jsonl \
//     node --import ./automation/lib/fake_fetch_preload.mjs skript.mjs
//   FAKE_FETCH_SCENARIO  Pflicht. Pfad zur Szenario-Datei (JSON). Fehlt sie oder ist sie ungültig, bricht der Prozess beim Start
//                        ab — es gibt NIE einen stillen Rückfall auf echtes Netz.
//   FAKE_FETCH_CALLS     Pfad der Protokolldatei (JSON Lines, wird angehängt; Default calls.jsonl im Arbeitsverzeichnis).
//
// SZENARIO (JSON):
//   { "hosts": ["test.myshopify.com"],    optional: erlaubte Hosts; jeder andere Host wird protokolliert und abgewiesen
//     "fastTimers": true,                 optional: setTimeout(fn, ms) feuert sofort; die gewünschte Wartezeit steht im Protokoll
//     "routes": [ { "name": "oauth",
//        "match":   { "method":"POST", "host":"…", "path":"/admin/oauth/access_token", "pathRegex":"graphql\\.json$",
//                     "headers": {"x-shopify-access-token":"fake-token"},       Namen klein; Werte werden NIE protokolliert
//                     "json": {"client_id":"…"},                                Teilmenge des JSON-Bodys (tief)
//                     "queryRegex": "publishablePublish", "variables": {"id":"gid://…"}   für GraphQL-Bodies
//                   },
//        "times":   1,                    optional: so oft gültig, danach wird die Route übersprungen
//        "respond": { "status":200, "json":{…} }        oder "text":"…" · "headers":{…}
//                  | { "graphqlErrors":[{"message":"…"}] }   (Status 200, Body {errors:[…]})
//                  | { "networkError":"fetch failed" }       (fetch wirft TypeError)
//                  | { "sequence":[ {respond}, {respond} ] } (Aufruf 1, 2, …; danach bleibt die letzte)
//     } ] }
//   Form-Bodys (URLSearchParams oder Content-Type application/x-www-form-urlencoded) werden wie ein flaches JSON-Objekt behandelt: «match.json»
//   passt darauf, im Protokoll steht es geschwärzt unter bodyJson.
//   Die erste Route, deren «match» passt (und die noch «times» übrig hat), antwortet. Ohne Treffer wirft fetch
//   «FAKE_FETCH: keine Route …» und das Protokoll trägt route:null — ein vergessener Aufruf fällt so laut auf.
//   Unbekannte Schlüssel in «match»/«respond» sind ein Ladefehler (Tippfehler dürfen nicht still durchrutschen).
//
// PROTOKOLL (eine JSON-Zeile je fetch; Timer als {"timer":ms,"nachAufruf":n}):
//   n, method, host, path, queryParams (nur Namen), headerNames (nur Namen, sortiert), redirect, hasSignal,
//   query/variables (GraphQL), bodyJson (sonstige JSON-Bodys), bodyBytes (Nicht-JSON), route (Name/Index/null), status | fehler
//   GESCHWÄRZT wird alles unter Schlüsseln wie secret/token/password/authorization/api-key → «redacted»; Header-WERTE
//   und die Werte aus «match» werden nie geschrieben. Tests dürfen also behaupten: ein Schlüssel steht NIE in calls.jsonl.
//
// GRENZEN: ersetzt nur globalThis.fetch (und bei fastTimers globalThis.setTimeout/clearTimeout). Kein http/https/net-Modul, kein WebSocket.
// Header dürfen als Objekt, Paarliste oder Headers-Instanz kommen; bei einer Request-Instanz zählen deren Header und (geklont gelesener) Body.
// Streams/FormData/Blob als Body werden nicht gelesen (nur bodyBytes entfällt). fastTimers: setTimeout gibt ein Timer-Objekt (unref/ref/refresh)
// zurück, clearTimeout VOR dem Feuern verhindert den Aufruf wie im echten Node; setInterval bleibt echt.
import fs from 'node:fs';

export const SCHEMA = 1;
const MATCH_KEYS = new Set(['method', 'host', 'path', 'pathRegex', 'headers', 'json', 'queryRegex', 'variables']);
const RESPOND_KEYS = new Set(['status', 'json', 'text', 'headers', 'graphqlErrors', 'networkError', 'sequence']);
const GEHEIM = /secret|token|passw|authoriz|api[-_]?key|credential/i;

const pfad = process.env.FAKE_FETCH_SCENARIO;
if (!pfad) throw new Error('fake_fetch_preload: FAKE_FETCH_SCENARIO fehlt — ohne Szenario gibt es kein Fake (und nie echtes Netz)');
let S;
try { S = JSON.parse(fs.readFileSync(pfad, 'utf8')); } catch (e) { throw new Error('fake_fetch_preload: Szenario nicht lesbar: ' + e.message); }
const pruefeRespond = (r, wo) => {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error(`fake_fetch_preload: ${wo}: respond fehlt`);
  for (const k of Object.keys(r)) if (!RESPOND_KEYS.has(k)) throw new Error(`fake_fetch_preload: ${wo}: unbekannter respond-Schlüssel «${k}»`);
  for (const [i, x] of (r.sequence || []).entries()) pruefeRespond(x, `${wo}.sequence[${i}]`);
};
if (!Array.isArray(S.routes)) throw new Error('fake_fetch_preload: Szenario braucht «routes» (Liste)');
S.routes.forEach((rt, i) => {
  const wo = `routes[${i}]${rt?.name ? ' «' + rt.name + '»' : ''}`;
  for (const k of Object.keys(rt.match || {})) if (!MATCH_KEYS.has(k)) throw new Error(`fake_fetch_preload: ${wo}: unbekannter match-Schlüssel «${k}»`);
  pruefeRespond(rt.respond, wo);
});

const LOG = process.env.FAKE_FETCH_CALLS || 'calls.jsonl';
const schreibe = obj => fs.appendFileSync(LOG, JSON.stringify(obj) + '\n');
const schwaerzen = x => Array.isArray(x) ? x.map(schwaerzen)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, GEHEIM.test(k) ? '«redacted»' : schwaerzen(v)])) : x;
const teilmenge = (soll, ist) => soll && typeof soll === 'object'
  ? !!ist && typeof ist === 'object' && Object.entries(soll).every(([k, v]) => teilmenge(v, ist[k])) : soll === ist;

const genutzt = S.routes.map(() => 0);
let zaehler = 0;

function passt(m = {}, a) {
  if (m.method && m.method.toUpperCase() !== a.method) return false;
  if (m.host && m.host !== a.host) return false;
  if (m.path && m.path !== a.path) return false;
  if (m.pathRegex && !new RegExp(m.pathRegex).test(a.path)) return false;
  if (m.headers && !Object.entries(m.headers).every(([k, v]) => a.headers[k.toLowerCase()] === v)) return false;
  if (m.json && !teilmenge(m.json, a.json)) return false;
  if (m.queryRegex && !new RegExp(m.queryRegex).test(String(a.json?.query ?? ''))) return false;
  if (m.variables && !teilmenge(m.variables, a.json?.variables)) return false;
  return true;
}
function antwort(r, aufruf, opts) {
  const wahl = r.sequence ? r.sequence[Math.min(aufruf, r.sequence.length - 1)] : r;
  if (wahl.networkError !== undefined) throw new TypeError(String(wahl.networkError || 'fetch failed'));
  const headers = { ...(wahl.headers || {}) };
  let body, status = wahl.status ?? 200;
  if (wahl.graphqlErrors) { body = JSON.stringify({ errors: wahl.graphqlErrors }); status = wahl.status ?? 200; }
  else if ('json' in wahl) body = JSON.stringify(wahl.json);
  else body = wahl.text ?? '';
  if ('json' in wahl || wahl.graphqlErrors) headers['content-type'] ??= 'application/json';
  if (status >= 300 && status < 400 && opts.redirect === 'error') throw new TypeError('fetch failed');   // wie das echte fetch
  return { status, res: new Response(status === 204 || status === 304 ? null : body, { status, headers }) };
}

globalThis.fetch = async (input, opts = {}) => {
  const n = ++zaehler;
  const istReq = typeof Request !== 'undefined' && input instanceof Request;
  const url = new URL(istReq ? input.url : String(input));
  const roh = {}, kopf = new Headers(istReq ? input.headers : undefined);
  if (opts.headers) for (const [k, v] of new Headers(opts.headers)) kopf.set(k, v);   // Objekt, Paarliste und Headers-Instanz gleich behandeln
  for (const [k, v] of kopf) roh[k.toLowerCase()] = String(v);
  const istForm = opts.body instanceof URLSearchParams;
  if (istForm && !roh['content-type']) roh['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';   // setzt das echte fetch selbst
  let text = typeof opts.body === 'string' ? opts.body : istForm ? opts.body.toString() : undefined;
  if (text === undefined && istReq && opts.body === undefined && !['GET', 'HEAD'].includes(input.method)) { try { text = await input.clone().text(); } catch { /* Body nicht lesbar */ } }
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  if (json === undefined && text && (istForm || /application\/x-www-form-urlencoded/i.test(roh['content-type'] || ''))) json = Object.fromEntries(new URLSearchParams(text));
  const a = { method: String(opts.method || (istReq ? input.method : 'GET')).toUpperCase(), host: url.hostname, path: url.pathname, headers: roh, json };
  const e = { n, method: a.method, host: a.host, path: a.path, ...(url.search ? { queryParams: [...url.searchParams.keys()] } : {}),
    headerNames: Object.keys(roh).sort(), redirect: opts.redirect, hasSignal: !!opts.signal };
  if (json && typeof json === 'object') {
    if (typeof json.query === 'string') { e.query = json.query; if (json.variables) e.variables = schwaerzen(json.variables); }
    else e.bodyJson = schwaerzen(json);
  } else if (text) e.bodyBytes = text.length;

  if (Array.isArray(S.hosts) && !S.hosts.includes(a.host)) { schreibe({ ...e, route: null, fehler: 'host-nicht-erlaubt' }); throw new TypeError(`FAKE_FETCH: Host nicht erlaubt: ${a.host}`); }
  const i = S.routes.findIndex((rt, k) => (rt.times === undefined || genutzt[k] < rt.times) && passt(rt.match, a));
  if (i < 0) { schreibe({ ...e, route: null, fehler: 'keine-route' }); throw new Error(`FAKE_FETCH: keine Route für ${a.method} ${a.host}${a.path}`); }
  const aufruf = genutzt[i]++, rt = S.routes[i], name = rt.name ?? i;
  if (opts.signal?.aborted) { schreibe({ ...e, route: name, fehler: 'abgebrochen' }); throw opts.signal.reason; }
  try {
    const { status, res } = antwort(rt.respond, aufruf, opts);
    schreibe({ ...e, route: name, status });
    return res;
  } catch (err) { schreibe({ ...e, route: name, fehler: err.message }); throw err; }
};

if (S.fastTimers) {
  const meine = new WeakSet(), abgebrochen = new WeakSet(), echtesClear = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => {
    schreibe({ timer: ms, nachAufruf: zaehler });
    const t = { unref() { return t; }, ref() { return t; }, hasRef() { return false; }, refresh() { return t; }, [Symbol.toPrimitive]() { return 0; } };
    meine.add(t);
    queueMicrotask(() => { if (!abgebrochen.has(t)) fn(...args); });
    return t;
  };
  globalThis.clearTimeout = t => { if (meine.has(t)) abgebrochen.add(t); else echtesClear(t); };
}
