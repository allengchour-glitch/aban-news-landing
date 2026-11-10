#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { aktualisierePodSeite, ERWARTET, istTrockenlauf, sha256, shopHost, zeilenDiff } from './update_pod_page.mjs';

let ok = 0, fehler = 0;
function ist(name, erhalten, erwartet) {
  const a = JSON.stringify(erhalten), b = JSON.stringify(erwartet);
  if (a === b) { ok++; return; }
  fehler++; console.error(`FEHLER ${name}\n  erhalten: ${a}\n  erwartet: ${b}`);
}
function wahr(name, wert) { ist(name, !!wert, true); }

ist('sha256 roh und mit Schluss-Newline verschieden', [sha256('<main>neu</main>'), sha256('<main>neu</main>\n')], [
  '14e15484df7494e5df104ce8c0530af4deddc140ab1b9268fd7aeb0c4b002e1f',
  'f89ff2464b06f4f420170b1110c37aed63cf5dba1674102ba9e673cd0655db45',
]);
ist('Shop-Host wird normalisiert', shopHost(' HTTPS://AU3J0Y-HQ.MYSHOPIFY.COM/ '), ERWARTET.shop);
for (const [wert, soll] of [[undefined, true], ['', true], ['1', true], ['true', true], ['yes', true], ['0', false], ['false', false], ['nein', false], ['off', false]]) {
  ist(`Trockenlauf ${String(wert)}`, istTrockenlauf(wert), soll);
}
const diff = zeilenDiff('eins\nalt\ndrei', 'eins\nneu\ndrei');
wahr('Diff zeigt entfernte Zeile', diff.includes('- L2: "alt"'));
wahr('Diff zeigt neue Zeile', diff.includes('+ L2: "neu"'));
ist('Gleicher Inhalt hat keinen Diff', zeilenDiff('gleich', 'gleich'), '(keine Änderung)');
wahr('Diff wird begrenzt', zeilenDiff('a\nb\nc', 'x\ny\nz', 1).includes('weitere geänderte Zeilen'));
const wsDiff = zeilenDiff('<script>const x = "a  b";</script>', '<script>const x = "a b";</script>');
wahr('Diff erhält bedeutende doppelte Leerzeichen', wsDiff.includes('- L1: "<script>const x = \\"a  b\\";</script>"') && wsDiff.includes('+ L1: "<script>const x = \\"a b\\";</script>"'));

const ALT = '<main>alt</main>\n';
const NEU = '<main>neu</main>\n';
const DRITT = '<main>dritter Stand</main>\n';
const envBasis = {
  SHOPIFY_SHOP: ERWARTET.shop,
  SHOPIFY_CLIENT_ID: 'test-id',
  SHOPIFY_CLIENT_SECRET: 'test-secret',
};

const antwort = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
const stand = (body, extra = {}) => ({
  shop: { name: 'LuxeStyle', myshopifyDomain: ERWARTET.shop, primaryDomain: { host: ERWARTET.primaer, url: `https://${ERWARTET.primaer}` }, ...(extra.shop || {}) },
  page: { id: ERWARTET.pageId, title: 'Selbst gestalten', handle: ERWARTET.pageHandle, body, updatedAt: '2026-11-08T12:00:00Z', ...(extra.page || {}) },
});

function attrappe({ lese = [], mutation = null, tokenStatus = 200 } = {}) {
  const prot = { aufrufe: [], lesen: 0, mutationen: [] };
  const fetchFn = async (url, options = {}) => {
    prot.aufrufe.push({ url, options });
    if (url.endsWith('/admin/oauth/access_token')) return antwort(tokenStatus === 200 ? { access_token: 'test-token' } : { error: 'kaputt' }, tokenStatus);
    const req = JSON.parse(options.body || '{}');
    if (/mutation\s+PodPageUpdate/.test(req.query || '')) {
      prot.mutationen.push(req.variables);
      if (typeof mutation === 'function') return mutation(req.variables, prot);
      if (mutation) return mutation;
      return antwort({ data: { pageUpdate: { page: { id: ERWARTET.pageId, title: 'Selbst gestalten', handle: ERWARTET.pageHandle, body: req.variables.page.body }, userErrors: [] } } });
    }
    const wert = lese[prot.lesen++];
    if (wert?.ok !== undefined && typeof wert.json === 'function') return wert;
    return antwort({ data: wert });
  };
  return { fetchFn, prot };
}

async function lauf({ env = {}, lese = [stand(ALT)], mutation = null, ziel = NEU } = {}) {
  const a = attrappe({ lese, mutation });
  const logs = [], errors = [];
  const code = await aktualisierePodSeite({
    env: { ...envBasis, ...env }, fetchFn: a.fetchFn,
    existsSync: () => true, readFileSync: () => ziel,
    log: (x) => logs.push(String(x)), error: (x) => errors.push(String(x)),
  });
  return { code, logs, errors, ...a.prot };
}
const live = (extra = {}) => ({ DRY_RUN: '0', POD_EXPECTED_TARGET_SHA256: sha256(NEU), ...extra });

{
  const r = await lauf();
  ist('Vorgabe trocken: Exit 0 und keine Mutation', [r.code, r.lesen, r.mutationen.length], [0, 1, 0]);
  wahr('Trockenlauf nennt Vorher- und Zielhash', r.logs.some((x) => x.includes(sha256(ALT)) && x.includes(sha256(NEU))));
  wahr('Trockenlauf zeigt Diff', r.logs.some((x) => x.includes('- L1: "<main>alt</main>"') && x.includes('+ L1: "<main>neu</main>"')));
  wahr('Trockenlauf nennt beide freizugebenden Hashes', r.logs.some((x) => x.includes(`POD_EXPECTED_BEFORE_SHA256=${sha256(ALT)}`) && x.includes(`POD_EXPECTED_TARGET_SHA256=${sha256(NEU)}`)));
}

{
  const r = await lauf({ ziel: ALT, env: { DRY_RUN: '0', POD_EXPECTED_TARGET_SHA256: sha256(ALT) } });
  ist('Identischer Zielinhalt: kein Vorher-Hash nötig, keine Mutation', [r.code, r.lesen, r.mutationen.length], [0, 1, 0]);
  wahr('Identischer Zielinhalt wird als unverändert gemeldet', r.logs.some((x) => x.includes('UNVERÄNDERT')));
}

for (const [name, env] of [
  ['Scharf ohne Vorher-Hash', live()],
  ['Scharf mit kaputtem Vorher-Hash', live({ POD_EXPECTED_BEFORE_SHA256: 'abc' })],
  ['Scharf mit falschem Vorher-Hash', live({ POD_EXPECTED_BEFORE_SHA256: '0'.repeat(64) })],
  ['Scharf ohne Ziel-Hash', { DRY_RUN: '0', POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }],
  ['Scharf mit kaputtem Ziel-Hash', { DRY_RUN: '0', POD_EXPECTED_BEFORE_SHA256: sha256(ALT), POD_EXPECTED_TARGET_SHA256: 'abc' }],
  ['Scharf mit falschem Ziel-Hash', { DRY_RUN: '0', POD_EXPECTED_BEFORE_SHA256: sha256(ALT), POD_EXPECTED_TARGET_SHA256: '0'.repeat(64) }],
]) {
  const r = await lauf({ env });
  ist(`${name}: Abbruch ohne Mutation`, [r.code, r.mutationen.length], [1, 0]);
  wahr(`${name}: Abbruch vor Write`, r.errors.some((x) => x.startsWith('ABBRUCH vor Write')));
}

{
  const r = await lauf({ ziel: DRITT, env: live({ POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }) });
  ist('Checkout-Ziel nach Review geändert: Abbruch vor OAuth und Mutation', [r.code, r.aufrufe.length, r.mutationen.length], [1, 0, 0]);
  wahr('Abweichender Ziel-Hash wird klar benannt', r.errors.some((x) => x.includes('Ziel-Hash abweichend')));
}

{
  const r = await lauf({ env: live({ POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }), lese: [stand(ALT), stand(DRITT)] });
  ist('CAS-Drift: zwei Lesungen, keine Mutation', [r.code, r.lesen, r.mutationen.length], [1, 2, 0]);
  wahr('CAS-Drift wird klar benannt', r.errors.some((x) => x.includes('CAS abgebrochen')));
}

{
  const r = await lauf({ env: live({ POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }), lese: [stand(ALT), stand(NEU)] });
  ist('Ziel zwischenzeitlich erreicht: Exit 0, keine Mutation', [r.code, r.lesen, r.mutationen.length], [0, 2, 0]);
  wahr('Zwischenzeitliches Ziel wird gemeldet', r.logs.some((x) => x.includes('zwischenzeitlich bereits erreicht')));
}

{
  const r = await lauf({ env: live({ POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }), lese: [stand(ALT), stand(ALT), stand(NEU)] });
  ist('Scharfer Erfolg: drei Lesungen, genau eine Mutation', [r.code, r.lesen, r.mutationen.length], [0, 3, 1]);
  ist('Mutation enthält nur erwartete Seite und Body', r.mutationen[0], { id: ERWARTET.pageId, page: { body: NEU } });
  wahr('Erfolg erst nach Rücklesung', r.logs.some((x) => x.includes('GESCHRIEBEN UND ZURÜCKGELESEN') && x.includes(sha256(NEU))));
}

{
  const r = await lauf({ env: live({ POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }), lese: [stand(ALT), stand(ALT), stand(ALT)] });
  ist('Abweichende Rücklesung: genau ein Write, kein Retry', [r.code, r.lesen, r.mutationen.length], [1, 3, 1]);
  wahr('Abweichende Rücklesung bleibt unbekannt', r.errors.some((x) => x.startsWith('SCHREIBZUSTAND UNBEKANNT') && x.includes('Rücklesung abweichend')));
}

{
  const mutation = antwort({ data: { pageUpdate: { page: null, userErrors: [{ field: ['body'], message: 'abgelehnt' }] } } });
  const r = await lauf({ env: live({ POD_EXPECTED_BEFORE_SHA256: sha256(ALT) }), lese: [stand(ALT), stand(ALT)], mutation });
  ist('Mutation userErrors: genau ein Write-Versuch, keine Rücklese/Retry', [r.code, r.lesen, r.mutationen.length], [1, 2, 1]);
  wahr('Mutation userErrors werden gemeldet', r.errors.some((x) => x.includes('abgelehnt')));
}

for (const [name, extra] of [
  ['fremder myshopify-Shop', { shop: { myshopifyDomain: 'fremd.myshopify.com' } }],
  ['fremde Primärdomain', { shop: { primaryDomain: { host: 'fremd.ch', url: 'https://fremd.ch' } } }],
  ['falscher Page-Handle', { page: { handle: 'andere-seite' } }],
  ['falsche Page-ID', { page: { id: 'gid://shopify/Page/1' } }],
]) {
  const r = await lauf({ lese: [stand(ALT, extra)] });
  ist(`${name}: keine Mutation`, [r.code, r.mutationen.length], [1, 0]);
}

{
  const r = await lauf({ env: { SHOPIFY_SHOP: 'fremd.myshopify.com' } });
  ist('Fremdes SHOPIFY_SHOP stoppt vor OAuth', [r.code, r.aufrufe.length, r.mutationen.length], [1, 0, 0]);
}
{
  const r = await lauf({ env: { POD_PAGE_ID: 'gid://shopify/Page/1' } });
  ist('Fremde POD_PAGE_ID stoppt vor OAuth', [r.code, r.aufrufe.length, r.mutationen.length], [1, 0, 0]);
}
{
  const r = await lauf({ env: { SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' } });
  ist('Fehlender Zugang ist sichtbarer No-op', [r.code, r.aufrufe.length, r.mutationen.length], [0, 0, 0]);
  wahr('No-op nennt den Grund', r.logs.some((x) => x.includes('Zugang fehlt')));
}

const pageWorkflow = readFileSync('.github/workflows/pod-page-update.yml', 'utf8');
const injectWorkflow = readFileSync('.github/workflows/pod-inject-designer.yml', 'utf8');
wahr('Page-Workflow: dry_run Vorgabe true', /dry_run:\s*[\s\S]*?default:\s*true/.test(pageWorkflow));
wahr('Page-Workflow: Vorher-Hash verdrahtet', /POD_EXPECTED_BEFORE_SHA256:\s*\$\{\{ github\.event\.inputs\.expected_before_sha256 \}\}/.test(pageWorkflow));
wahr('Page-Workflow: Ziel-Hash ist eine Eingabe', /expected_target_sha256:\s*[\s\S]*?type:\s*string/.test(pageWorkflow));
wahr('Page-Workflow: Ziel-Hash verdrahtet', /POD_EXPECTED_TARGET_SHA256:\s*\$\{\{ github\.event\.inputs\.expected_target_sha256 \}\}/.test(pageWorkflow));
wahr('Page-Workflow: DRY_RUN explizit 0 oder 1', /DRY_RUN:\s*\$\{\{ github\.event\.inputs\.dry_run == 'false' && '0' \|\| '1' \}\}/.test(pageWorkflow));
wahr('Page-Workflow: scharfer Fremd-Branch wird abgebrochen', /DRY_RUN_EINGABE[^]*= "false"[^]*AKTUELLER_REF[^]*!= "refs\/heads\/main"/.test(pageWorkflow));
wahr('Inject-Workflow: dry_run Vorgabe true', /dry_run:\s*[\s\S]*?default:\s*true/.test(injectWorkflow));
wahr('Inject-Workflow: nur exakt false wird scharf', /DRY_RUN:\s*\$\{\{ github\.event\.inputs\.dry_run == 'false' && '0' \|\| '1' \}\}/.test(injectWorkflow));
for (const [eingabe, envWert] of [[undefined, '1'], ['', '1'], ['true', '1'], ['yes', '1'], ['0', '1'], ['false', '0']]) {
  ist(`Inject-Workflow Abbildung ${String(eingabe)}`, eingabe === 'false' ? '0' : '1', envWert);
}
wahr('Inject-Workflow: scharfer Fremd-Branch wird abgebrochen', /DRY_RUN_EINGABE[^]*= "false"[^]*AKTUELLER_REF[^]*!= "refs\/heads\/main"/.test(injectWorkflow));

console.log(`${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
