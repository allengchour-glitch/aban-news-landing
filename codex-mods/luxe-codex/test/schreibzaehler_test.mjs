/**
 * Test des Schreibzählers: Gruppenmuster in BEIDE Richtungen, Erfolgs-Auswertung, LIVE=1-Erkennung, Zähler-Datei
 * (fehlend, kaputt, parallel), Ausgaben gegen die Schemas und der Hook als Prozess über stdin/stdout.
 */
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import { ausgang, befehleAus, gruppeFuer, GRUPPEN, gruppeVon, istLiveBefehl, leererZaehler, statusText, zaehleHoch } from '../lib/gruppen.mjs';
import { analysiere } from '../lib/shell_live.mjs';
import { behandle, haengeAn, leseStand, raeumeAuf, sichererName, zaehlerDatei } from '../lib/zaehler.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HIER, '..', 'hooks', 'schreibzaehler.mjs');
const tmp = () => mkdtempSync(join(tmpdir(), 'luxe-zaehler-'));

// === 1. Gruppenmuster, beide Richtungen ======================================================================
let geprueft = 0;
const fuerAlle = (titel, namen, soll) => { for (const n of namen) { geprueft += 1; ist(`${titel}: ${n || '(leer)'}`, gruppeVon(n), soll); } };

fuerAlle('Shop zählt', [
  'mcp__Shopify__graphql_mutation', 'mcp__Shopify__create-product', 'mcp__Shopify__create-collection', 'mcp__Shopify__create-discount',
  'mcp__Shopify__create-digital-product-from-link', 'mcp__Shopify__update-product', 'mcp__Shopify__update-collection',
  'mcp__Shopify__bulk-update-product-status', 'mcp__Shopify__add-to-collection', 'mcp__Shopify__set-inventory', 'mcp__Shopify__publish-digital-product',
], 'shop');
fuerAlle('Shop zählt nie (Lesen)', [
  'mcp__Shopify__graphql_query', 'mcp__Shopify__graphql_schema', 'mcp__Shopify__validate_graphql_codeblocks', 'mcp__Shopify__get-product',
  'mcp__Shopify__get-order', 'mcp__Shopify__get-collection', 'mcp__Shopify__get-inventory-levels', 'mcp__Shopify__get-shop-info',
  'mcp__Shopify__list-orders', 'mcp__Shopify__list-customers', 'mcp__Shopify__search_products', 'mcp__Shopify__search_collections',
  'mcp__Shopify__search_docs_chunks', 'mcp__Shopify__run-analytics-query',
], undefined);
fuerAlle('Shop: ähnliche Namen zählen nicht (Wortgrenze)', [
  'mcp__Other__graphql_mutation', 'Shopify__graphql_mutation', 'xmcp__Shopify__graphql_mutation', 'mcp__Shopify__graphql_mutation_vorschau',
  'mcp__Shopify__graphql_mutations', 'mcp__Shopify__create-', 'mcp__Shopify__createproduct', 'mcp__Shopify__set-inventory-levels',
  'mcp__Shopify__add-to-collection-x', 'mcp__Shopify2__graphql_mutation', 'mcp__MyShopify__graphql_mutation', 'mcp__Shopify__', 'mcp__Shopify',
], undefined);
fuerAlle('Kein MCP-Name', ['Bash', 'Write', 'exec_command', 'shell', 'local_shell', 'apply_patch', 'exec', '', 'graphql_mutation'], undefined);

const metricool = 'mcp__Metricool_Social_Media_Management__';
fuerAlle('Social Metricool zählt', ['createScheduledPost', 'updateScheduledPost', 'sendScheduledPostForReview'].map(n => metricool + n), 'social');
ist('Social: anderer Zusatz im Servernamen gilt ebenso', gruppeVon('mcp__Metricool_Zweitkonto__createScheduledPost'), 'social');
ist('Social: Servername ohne Zusatz gilt in Codex ebenso (Nutzer wählt den Namen; Abweichung vom Claude-Code-Mod)', gruppeVon('mcp__metricool__createScheduledPost'), 'social');
fuerAlle('Social Metricool zählt nie', ['getScheduledPosts', 'getBrandSettings', 'getBestTimeToPostByNetwork', 'getAnalyticsDataByMetrics', 'getAnalyticsAvailableMetrics'].map(n => metricool + n), undefined);
ist('Social: createScheduledPostForReview ist nur ein Entwurf und zählt nicht, createScheduledPost schon', [gruppeVon(`${metricool}createScheduledPostForReview`), gruppeVon(`${metricool}createScheduledPost`)], [undefined, 'social']);
fuerAlle('Social: fremder Server', ['mcp__Andere_Social__createScheduledPost', 'mcp__Metricoolx__createScheduledPost', 'mcp__NichtMetricool__createScheduledPost'], undefined);

fuerAlle('Social TikTok zählt', [
  'ad_create', 'ad_update', 'ad_status_update', 'adgroup_create', 'adgroup_budget_update', 'campaign_create', 'campaign_status_update', 'smart_plus_ad_material_status_update',
].map(n => `mcp__TikTok_Ads__${n}`), 'social');
fuerAlle('Social TikTok zählt nie', [
  'mcp__TikTok_Ads__ad_get', 'mcp__TikTok_Ads__campaign_get', 'mcp__TikTok_Ads__adgroup_quota_get', 'mcp__TikTok_Ads__ad_review_info_get',
  'mcp__TikTok_Ads__report_integrated_get', 'mcp__TikTok_Ads__targeting_search', 'mcp__TikTok_Ads__tool_region_get', 'mcp__TikTok_Ads__create',
  'mcp__TikTok_Ads__ad_created', 'mcp__TikTok_Ads__ad_update_log_get', 'mcp__Other_Ads__ad_create',
], undefined);
ist('Social vidIQ: nur das Veröffentlichen eines Reels', gruppeVon('mcp__vidIQ__vidiq_instagram_publish_reel'), 'social');
fuerAlle('Social vidIQ zählt nie', ['vidiq_instagram_connected_accounts', 'vidiq_instagram_owner_insights', 'vidiq_video_stats', 'vidiq_generate_script', 'vidiq_update_video'].map(n => `mcp__vidIQ__${n}`), undefined);

fuerAlle('Mail zählt', ['mcp__Gmail__send_message', 'mcp__Gmail__reply', 'mcp__Gmail__forward', 'mcp__Klaviyo__send_campaign'], 'mail');
fuerAlle('Mail zählt nie (Entwurf, Lesen, Aufräumen)', [
  'mcp__Gmail__create_draft', 'mcp__Gmail__update_draft', 'mcp__Gmail__delete_draft', 'mcp__Gmail__search_threads', 'mcp__Gmail__get_message',
  'mcp__Gmail__get_thread', 'mcp__Gmail__trash_message', 'mcp__Klaviyo__create_campaign', 'mcp__Klaviyo__update_campaign', 'mcp__Klaviyo__get_campaigns',
  'mcp__Klaviyo__cancel_campaign_send', 'mcp__Gmail__reply_all_vorschau',
], undefined);

// Codex-Schreibweisen des Servers (Nutzer wählt den Namen, Bindestrich kann zu Unterstrich werden)
fuerAlle('Schreibweise: Kleinbuchstaben und Unterstrich statt Bindestrich', ['mcp__shopify__graphql_mutation', 'mcp__SHOPIFY__graphql_mutation', 'mcp__shopify__create_product', 'mcp__shopify__bulk_update_product_status'], 'shop');
fuerAlle('Schreibweise: tiktok-ads', ['mcp__tiktok-ads__ad_create', 'mcp__tiktok_ads__campaign_status_update'], 'social');
fuerAlle('Schreibweise: gmail klein', ['mcp__gmail__send_message'], 'mail');
fuerAlle('Schreibweise: Lesen bleibt Lesen', ['mcp__shopify__graphql_query', 'mcp__shopify__get_product', 'mcp__tiktok-ads__ad_get'], undefined);
ist('Gruppenliste: vier Gruppen, «live» zuletzt', GRUPPEN, ['shop', 'social', 'mail', 'live']);
ist('mindestens 40 Werkzeugnamen in beide Richtungen geprüft', geprueft >= 40, true);

// === 2. Zählen und Statuszeile ================================================================================
{
  const null0 = leererZaehler();
  const eins = zaehleHoch(null0, 'shop');
  ist('zaehleHoch: ein Treffer', eins, { shop: 1, social: 0, mail: 0, live: 0 });
  ist('zaehleHoch: der alte Stand bleibt unverändert', null0, { shop: 0, social: 0, mail: 0, live: 0 });
  ist('zaehleHoch: je Gruppe', zaehleHoch(eins, 'social'), { shop: 1, social: 1, mail: 0, live: 0 });
  ist('zaehleHoch: live ist die vierte Gruppe', zaehleHoch(undefined, 'live'), { shop: 0, social: 0, mail: 0, live: 1 });
  ist('zaehleHoch: dreimal Mail', zaehleHoch(zaehleHoch(zaehleHoch(undefined, 'mail'), 'mail'), 'mail').mail, 3);
  ist('zaehleHoch: kaputte Werte (NaN, negativ, Text) zählen als 0', zaehleHoch({ shop: Number.NaN, social: -4, mail: 'x' }, 'shop'), { shop: 1, social: 0, mail: 0, live: 0 });
  ist('zaehleHoch: Kommazahl wird abgerundet', zaehleHoch({ shop: 2.9 }, 'shop').shop, 3);
  ist('zaehleHoch: unbekannte Gruppe ändert nichts', zaehleHoch({ shop: 1 }, 'unsinn'), { shop: 1, social: 0, mail: 0, live: 0 });
  ist('statusText: Reihenfolge Shop, Social, Mail, Live', statusText({ shop: 3, social: 12, mail: 1, live: 2 }), 'Schreibzugriffe · Shop 3 · Social 12 · Mail 1 · Live 2');
  ist('statusText: nur Gruppen mit Zugriffen', statusText({ shop: 0, social: 12, mail: 0, live: 0 }), 'Schreibzugriffe · Social 12');
  ist('statusText: Reihenfolge unabhängig von der Schlüsselreihenfolge', statusText({ live: 1, mail: 2, shop: 1, social: 0 }), 'Schreibzugriffe · Shop 1 · Mail 2 · Live 1');
  ist('statusText: ohne Zugriffe «keine»', [statusText(leererZaehler()), statusText(undefined)], ['Schreibzugriffe · keine', 'Schreibzugriffe · keine']);
  ist('statusText: Beispiel aus dem Auftrag', statusText({ shop: 2, social: 1 }), 'Schreibzugriffe · Shop 2 · Social 1');
}

// === 3. Ausgang einer Antwort: mindestens 5 Formen (die echte Form von Codex ist UNBEKANNT) ======================
const KOPF = (code, rest = 'fertig') => `Chunk ID: ab12cd\nWall time: 0.2 seconds\nProcess exited with code ${code}\nOriginal token count: 3\nOutput:\n${rest}`;
const AUSGANG = [
  ['exit_code 0', { exit_code: 0, stdout: 'ok' }, 'erfolg'],
  ['exit_code 2', { exit_code: 2, stdout: '' }, 'fehler'],
  ['exitCode 0', { exitCode: 0 }, 'erfolg'],
  ['exitCode 1', { exitCode: 1 }, 'fehler'],
  ['exit_code als Text «0»', { exit_code: '0' }, 'erfolg'],
  ['success true', { success: true }, 'erfolg'],
  ['success false', { success: false }, 'fehler'],
  ['metadata.exit_code 0 (klassische Shell-Antwort)', { output: 'x', metadata: { exit_code: 0, duration_seconds: 0.1 } }, 'erfolg'],
  ['metadata.exit_code 1', { output: 'x', metadata: { exit_code: 1, duration_seconds: 0.1 } }, 'fehler'],
  ['verschachteltes result.exit_code 0', { result: { exit_code: 0 } }, 'erfolg'],
  ['JSON-Text mit exit_code 0', '{"exit_code":0,"stdout":""}', 'erfolg'],
  ['JSON-Text der klassischen Antwort, Exit 3', '{"output":"boese","metadata":{"exit_code":3}}', 'fehler'],
  ['Textkopf «Process exited with code 0»', KOPF(0), 'erfolg'],
  ['Textkopf «Process exited with code 1»', KOPF(1), 'fehler'],
  ['Textkopf «Exit code: 0»', 'Exit code: 0\nWall time: 1 seconds\nOutput:\nok', 'erfolg'],
  ['Textkopf «Exit code: 127»', 'Exit code: 127\nWall time: 1 seconds\nOutput:\nnicht gefunden', 'fehler'],
  ['Textkopf: laufender Prozess ist noch nicht fertig', 'Chunk ID: ab\nWall time: 1.0 seconds\nProcess running with session ID 4711\nOriginal token count: 0\nOutput:\n', 'unbekannt'],
  ['Textkopf: die Ausgabe selbst druckt «Process exited with code 0», der Kopf sagt 1', KOPF(1, 'Process exited with code 0'), 'fehler'],
  ['Textkopf: Prozess läuft noch, die Ausgabe druckt «Process exited with code 0» → nur der Kopf zählt', 'Chunk ID: ab\nWall time: 1.0 seconds\nProcess running with session ID 4711\nOriginal token count: 5\nOutput:\nProcess exited with code 0', 'unbekannt'],
  ['Textkopf: Prozess läuft noch, die Ausgabe druckt «Exit code: 0»', 'Chunk ID: ab\nWall time: 1.0 seconds\nProcess running with session ID 4711\nOutput:\nExit code: 0', 'unbekannt'],
  ['Text ohne Kopf, der «Process exited with code 0» enthält', 'ich habe das gemacht\nProcess exited with code 0', 'unbekannt'],
  ['MCP-Inhalt mit Textkopf', { content: [{ type: 'text', text: KOPF(0) }] }, 'erfolg'],
  ['MCP isError true', { content: [{ type: 'text', text: 'kaputt' }], isError: true }, 'fehler'],
  ['MCP is_error true', { is_error: true }, 'fehler'],
  ['MCP isError false allein beweist bei einer Shell nichts', { content: [{ type: 'text', text: 'x' }], isError: false }, 'unbekannt'],
  ['error mit Text', { error: 'boom' }, 'fehler'],
  ['error als Objekt', { error: { message: 'x' } }, 'fehler'],
  ['error null', { error: null }, 'unbekannt'],
  ['error leer', { error: '' }, 'unbekannt'],
  ['Fehler gewinnt gegen Erfolg: success true, aber Exit 1', { success: true, exit_code: 1 }, 'fehler'],
  ['Fehler gewinnt: Exit 0, aber unterbrochen', { exit_code: 0, interrupted: true }, 'fehler'],
  ['Fehler gewinnt: Exit 0, aber Zeitüberschreitung', { exit_code: 0, timed_out: true }, 'fehler'],
  ['Fehler gewinnt: Exit 0, aber error-Feld', { exit_code: 0, error: 'timeout' }, 'fehler'],
  ['MCP-Liste mit isError', [{ type: 'text', text: 'x', isError: true }], 'fehler'],
  ['MCP-Liste ohne Angabe', [{ type: 'text', text: 'x' }], 'unbekannt'],
  ['leeres Objekt', {}, 'unbekannt'],
  ['unbekannte Form', { foo: 'bar', status: 'done' }, 'unbekannt'],
  ['null', null, 'unbekannt'],
  ['undefined', undefined, 'unbekannt'],
  ['Zahl', 42, 'unbekannt'],
  ['einfacher Text', 'fertig', 'unbekannt'],
  ['kaputtes JSON als Text', '{"exit_code":', 'unbekannt'],
  ['zu tief verschachtelt zählt nicht', { result: { result: { result: { result: { result: { exit_code: 0 } } } } } }, 'unbekannt'],
];
for (const [name, antwort, soll] of AUSGANG) ist(`ausgang: ${name}`, ausgang(antwort), soll);
ist('ausgang: mindestens fünf verschiedene Antwortformen geprüft', AUSGANG.length >= 5, true);

// === 4. LIVE=1 in Shell-Befehlen: beide Richtungen ===============================================================
const LIVE_JA = [
  'LIVE=1 node automation/x.mjs',
  'cd dropship && LIVE=1 node automation/x.mjs',
  'cd dropship; LIVE=1 python3 x.py --alle',
  'env LIVE=1 node x.mjs',
  'env -i LIVE=1 node x.mjs',
  'export LIVE=1; node x.mjs',
  'FOO=bar LIVE=1 python3 x.py',
  'LIVE=1 FOO=bar node x.mjs',
  'LIVE="1" node x.mjs',
  "LIVE='1' node x.mjs",
  'for f in a b; do LIVE=1 node x.mjs $f; done',
  'LIVE=1 node x.mjs | tee log.txt',
  'LIVE=1 node x.mjs 2>&1 | tail -5',
  "bash -lc 'LIVE=1 node x.mjs'",
  'sh -c "cd a && LIVE=1 node x.mjs"',
  'echo start && LIVE=1 node x.mjs',
  'bash -c "bash -c \'LIVE=1 node x.mjs\'"',
  '(LIVE=1 node x.mjs)',
  'echo $(LIVE=1 node x.mjs)',
  'LIVE=1\tnode x.mjs',
  'LIVE=1 \\\n  node x.mjs',
  'time LIVE=1 node x.mjs',
  'if true; then LIVE=1 node x.mjs; fi',
  'echo "kommt gleich" # nur ein Kommentar\nLIVE=1 node x.mjs',
  'cat <<EOF > a.txt\ntext\nEOF\nLIVE=1 node x.mjs',
  '>log.txt LIVE=1 node x.mjs',
  'LIVE=1 node x.mjs; echo fertig',
  'git status && LIVE=1 ./start.sh',
];
const LIVE_NEIN = [
  'node automation/x.mjs',
  'LIVE=0 node x.mjs',
  'LIVE=10 node x.mjs',
  'LIVE=1x node x.mjs',
  'LIVE=11 node x.mjs',
  'LIVE=true node x.mjs',
  'LIVE= node x.mjs',
  'NOLIVE=1 node x.mjs',
  'XLIVE=1 node x.mjs',
  '_LIVE=1 node x.mjs',
  'live=1 node x.mjs',
  'FOO=LIVE=1 node x.mjs',
  'echo "LIVE=1 node x.mjs"',
  "echo 'LIVE=1 node x.mjs'",
  'git commit -m "Fix: LIVE=1 setzt die Preise"',
  "git commit -m 'LIVE=1 kommt erst nach dem Trockenlauf'",
  "cat <<'EOF' > notiz.md\nLIVE=1 node x.mjs\nEOF",
  'git commit -F - <<EOF\nLIVE=1 node x.mjs\nEOF',
  'cat <<-EOF\n\tLIVE=1 node x.mjs\n\tEOF',
  'echo LIVE=1',
  'echo LIVE=1 node x.mjs',
  'grep LIVE=1 README.md',
  'grep -n "LIVE=1" README.md',
  'cat README.md | grep LIVE=1',
  'node x.mjs LIVE=1',
  'node x.mjs --hinweis LIVE=1',
  'LIVE=1',
  'LIVE=1; echo fertig',
  '"LIVE=1" node x.mjs',
  "'LIVE'=1 node x.mjs",
  '# LIVE=1 node x.mjs',
  'echo hallo # LIVE=1 node x.mjs',
  'export LIVE=0',
  'export PATH',
  'bash -lc "echo LIVE=1"',
  'bash -c \'echo "LIVE=1 node x"\'',
  'sed -n 1,5p LIVE=1.txt',
  '',
  '   ',
];
for (const b of LIVE_JA) ist(`LIVE=1 erkannt: ${JSON.stringify(b)}`, istLiveBefehl(b), true);
for (const b of LIVE_NEIN) ist(`LIVE=1 nicht erkannt: ${JSON.stringify(b)}`, istLiveBefehl(b), false);
ist('istLiveBefehl: kein Text', [istLiveBefehl(undefined), istLiveBefehl(null), istLiveBefehl(42)], [false, false, false]);
ist('istLiveBefehl: zu tief verschachtelte Shells werden nicht endlos verfolgt', istLiveBefehl("bash -c \"bash -c \\\"bash -c 'LIVE=1 node x'\\\"\""), false);

// === 5. Welche Shell-Texte hat ein Aufruf? Alle Namen, die Codex haben könnte ===================================
const B = 'LIVE=1 node automation/x.mjs';
ist('befehleAus: exec_command {cmd}', befehleAus('exec_command', { cmd: B, workdir: '/tmp/x', yield_time_ms: 1000 }), [B]);
ist('befehleAus: shell {command: [bash, -lc, …]}', befehleAus('shell', { command: ['bash', '-lc', B], workdir: '/tmp/x' }), [B]);
ist('befehleAus: shell mit direktem argv (env LIVE=1 node …)', istLiveBefehl(befehleAus('shell', { command: ['env', 'LIVE=1', 'node', 'x.mjs'] })[0]), true);
ist('befehleAus: argv mit Text, der LIVE=1 nur als Argument trägt', istLiveBefehl(befehleAus('shell', { command: ['echo', 'LIVE=1', 'ist', 'gesetzt'] })[0]), false);
ist('befehleAus: argv mit einem Argument, das LIVE=1 enthält, aber Leerzeichen hat', istLiveBefehl(befehleAus('shell', { command: ['git', 'commit', '-m', 'LIVE=1 node x'] })[0]), false);
ist('befehleAus: local_shell {action:{command:[…]}}', befehleAus('local_shell', { action: { type: 'exec', command: ['bash', '-c', B] } }), [B]);
ist('befehleAus: shell_command {command: Text}', befehleAus('shell_command', { command: B, workdir: '/x' }), [B]);
ist('befehleAus: Bash {command: Text}', befehleAus('Bash', { command: B, description: 'x' }), [B]);
ist('befehleAus: container.exec {cmd: [Liste]}', istLiveBefehl(befehleAus('container.exec', { cmd: ['env', 'LIVE=1', 'node', 'x.mjs'] })[0]), true);
ist('befehleAus: Name ist egal, die Form entscheidet (unbekannter Name mit cmd)', befehleAus('irgendein_neuer_name', { cmd: B }), [B]);
ist('befehleAus: reiner Text bei bekanntem Shell-Namen', befehleAus('exec_command', B), [B]);
ist('befehleAus: reiner Text bei unbekanntem Namen ist kein Befehl (könnte ein Patch sein)', befehleAus('apply_patch', `*** Begin Patch\n- ${B}\n*** End Patch`), []);
ist('befehleAus: apply_patch {input} hat weder cmd noch command', befehleAus('apply_patch', { input: `*** Begin Patch\n*** Add File: README.md\n+ ${B}\n*** End Patch` }), []);
ist('befehleAus: exec (JavaScript) mit Literal in Anführungszeichen', befehleAus('exec', `const r = await tools.exec_command({ cmd: "${B}", yield_time_ms: 500 });\ntext(r);`), [B]);
ist('befehleAus: exec (JavaScript) in {code: …} und mit einfachen Anführungszeichen', befehleAus('exec', { code: `await tools.exec_command({cmd: '${B}'})` }), [B]);
ist('befehleAus: exec (JavaScript) mit Template-Literal ohne Platzhalter', befehleAus('exec', `await tools.exec_command({ cmd: \`${B}\` })`), [B]);
ist('befehleAus: exec (JavaScript) mit Escapes', befehleAus('exec', 'await tools.exec_command({ cmd: "cd a\\nLIVE=1 node \\"x y.mjs\\"" })'), ['cd a\nLIVE=1 node "x y.mjs"']);
ist('befehleAus: exec (JavaScript) mit Platzhalter ist unbekannt und zählt nicht', befehleAus('exec', 'await tools.exec_command({ cmd: `LIVE=1 node ${datei}` })'), []);
ist('befehleAus: exec (JavaScript) mit Variable statt Literal ist unbekannt', befehleAus('exec', 'const c = "LIVE=1 node x"; await tools.exec_command({ cmd: c })'), []);
ist('befehleAus: JavaScript ohne exec_command ist kein Befehl', befehleAus('exec', `console.log("cmd: '${B}'")`), []);
ist('befehleAus: MCP-Werkzeuge liefern nie Shell-Texte', befehleAus('mcp__desktop__run', { command: B }), []);
ist('befehleAus: leere und fremde Eingaben', [befehleAus('shell', undefined), befehleAus('shell', null), befehleAus('shell', 5), befehleAus('shell', {}), befehleAus('shell', { command: [] }), befehleAus('shell', { command: [1, 2] })], [[], [], [], [], [], []]);

// === 6. gruppeFuer: Name + Eingabe + Antwort ======================================================================
const ok0 = { exit_code: 0, stdout: 'ok' };
ist('gruppeFuer: MCP-Schreibzugriff ohne Fehler zählt', gruppeFuer('mcp__Shopify__graphql_mutation', { query: 'mutation {}' }, { content: [{ type: 'text', text: '{}' }] }), 'shop');
ist('gruppeFuer: MCP-Schreibzugriff mit unbekannter Antwortform zählt (wie im Claude-Code-Mod: nur Fehler zählt nicht)', gruppeFuer('mcp__Shopify__graphql_mutation', {}, 'irgendwas'), 'shop');
ist('gruppeFuer: MCP-Schreibzugriff ohne Antwort zählt', gruppeFuer('mcp__Gmail__send_message', {}, undefined), 'mail');
ist('gruppeFuer: MCP mit isError zählt nicht', gruppeFuer('mcp__Shopify__graphql_mutation', {}, { isError: true }), undefined);
ist('gruppeFuer: MCP mit error zählt nicht', gruppeFuer('mcp__Gmail__send_message', {}, { error: 'Quota' }), undefined);
ist('gruppeFuer: MCP-Lesen zählt nie', gruppeFuer('mcp__Shopify__graphql_query', {}, { content: [] }), undefined);
for (const [name, form] of [
  ['exec_command', { cmd: B }],
  ['shell', { command: ['bash', '-lc', B] }],
  ['local_shell', { action: { type: 'exec', command: ['bash', '-lc', B] } }],
  ['shell_command', { command: B }],
  ['Bash', { command: B }],
  ['exec', `await tools.exec_command({ cmd: "${B}" })`],
]) {
  ist(`gruppeFuer live: ${name} mit Exit 0 zählt`, gruppeFuer(name, form, ok0), 'live');
  ist(`gruppeFuer live: ${name} mit Exit 1 zählt nicht`, gruppeFuer(name, form, { exit_code: 1 }), undefined);
  ist(`gruppeFuer live: ${name} mit unbekannter Antwortform zählt NICHT`, gruppeFuer(name, form, { foo: 1 }), undefined);
  ist(`gruppeFuer live: ${name} ohne Antwort zählt nicht`, gruppeFuer(name, form, undefined), undefined);
}
ist('gruppeFuer live: Textkopf-Antwort mit Exit 0', gruppeFuer('exec_command', { cmd: B }, KOPF(0)), 'live');
ist('gruppeFuer live: Textkopf-Antwort mit Exit 1', gruppeFuer('exec_command', { cmd: B }, KOPF(1)), undefined);
ist('gruppeFuer live: success true', gruppeFuer('exec_command', { cmd: B }, { success: true }), 'live');
ist('gruppeFuer live: isError false allein reicht nicht', gruppeFuer('exec_command', { cmd: B }, { isError: false }), undefined);
ist('gruppeFuer live: Befehl ohne LIVE=1 zählt nicht', gruppeFuer('exec_command', { cmd: 'node automation/x.mjs' }, ok0), undefined);
ist('gruppeFuer live: LIVE=1 nur im Commit-Text zählt nicht', gruppeFuer('exec_command', { cmd: 'git commit -m "LIVE=1 kommt später"' }, ok0), undefined);
ist('gruppeFuer live: LIVE=1 nur im Heredoc zählt nicht', gruppeFuer('exec_command', { cmd: "cat <<'EOF' > a.md\nLIVE=1 node x.mjs\nEOF" }, ok0), undefined);
ist('gruppeFuer live: apply_patch mit LIVE=1 im Text zählt nicht', gruppeFuer('apply_patch', { input: `*** Begin Patch\n+ ${B}\n*** End Patch` }, ok0), undefined);
ist('gruppeFuer live: MCP-Server mit Feld command zählt nicht als live', gruppeFuer('mcp__desktop__run', { command: B }, ok0), undefined);
ist('gruppeFuer: kein Name, keine Form', [gruppeFuer(undefined, undefined, undefined), gruppeFuer('', {}, {})], [undefined, undefined]);

// === 7. Zähler-Datei: fehlend, kaputt, parallel, Sitzungen ======================================================
{
  const z = tmp();
  const datei = zaehlerDatei(z, 's-1');
  ist('Datei: fehlend → Nullstand ohne Warnung', leseStand(datei), { stand: leererZaehler(), warnung: '' });
  haengeAn(datei, 'shop'); haengeAn(datei, 'shop'); haengeAn(datei, 'live');
  ist('Datei: angehängte Zeilen werden gezählt', leseStand(datei).stand, { shop: 2, social: 0, mail: 0, live: 1 });
  writeFileSync(datei, 'shop\nshop\x00\x01binär☃\n{"shop":9}\nSHOP\nshop extra\nsocial');
  ist('Datei: kaputte Zeilen werden ignoriert, die letzte Zeile ohne Zeilenende zählt', leseStand(datei).stand, { shop: 1, social: 1, mail: 0, live: 0 });
  haengeAn(datei, 'mail');
  ist('Datei: nach einer Zeile ohne Zeilenende wächst der Zähler sauber weiter (kein Zusammenkleben)', leseStand(datei).stand, { shop: 1, social: 1, mail: 1, live: 0 });
  writeFileSync(datei, 'shop\nsho');
  haengeAn(datei, 'social');
  ist('Datei: eine halbe Zeile («sho») klebt nicht an der nächsten', leseStand(datei).stand, { shop: 1, social: 1, mail: 0, live: 0 });
  writeFileSync(datei, '');
  ist('Datei: leer → Nullstand', leseStand(datei).stand, leererZaehler());
  writeFileSync(datei, Buffer.from(Array.from({ length: 5000 }, (_, i) => (i * 7919) % 256)));
  ist('Datei: reiner Binärmüll → Nullstand, keine Ausnahme', leseStand(datei).stand, leererZaehler());
  rmSync(datei);
  mkdirSync(datei);
  const l = leseStand(datei);
  ist('Datei: ein Ordner an der Stelle → Nullstand MIT Warnung, keine Ausnahme', [l.stand, l.warnung.includes('unlesbar')], [leererZaehler(), true]);
  let wirft = false; try { haengeAn(datei, 'shop'); } catch { wirft = true; }
  ist('Datei: Anhängen an einen Ordner wirft (der Hook meldet das sichtbar)', wirft, true);
  rmSync(z, { recursive: true, force: true });
}
{
  ist('Dateiname: gewöhnliche Sitzungskennung bleibt', sichererName('019a-bc_12'), '019a-bc_12');
  const bös = sichererName('../../etc/passwd');
  ist('Dateiname: Pfadtrenner und «..» verschwinden', [bös.includes('/'), bös.includes('.'), bös.startsWith('______etc_passwd-')], [false, false, true]);
  ist('Dateiname: zwei verschiedene Kennungen mit gleichem Rest bleiben verschieden', sichererName('a/b') !== sichererName('a_b'), true);
  ist('Dateiname: fehlende Kennung', [sichererName(undefined), sichererName('')], ['ohne-sitzung', 'ohne-sitzung']);
  ist('Dateiname: sehr lange Kennung wird gekürzt', sichererName('x'.repeat(500)).length < 90, true);
  ist('zaehlerDatei liegt im Ordner', zaehlerDatei('/z', 's-1'), '/z/zaehler-s-1.log');
}
{
  const z = tmp();
  const alt = join(z, 'zaehler-alt.log'); const neu = join(z, 'zaehler-neu.log'); const fremd = join(z, 'gesehen.jsonl'); const eigen = join(z, 'zaehler-eigen.log');
  for (const d of [alt, neu, fremd, eigen]) writeFileSync(d, 'shop\n');
  const vor30 = new Date(Date.now() - 30 * 86_400_000);
  for (const d of [alt, eigen, fremd]) utimesSync(d, vor30, vor30);
  const weg = raeumeAuf(z, { behalte: eigen });
  ist('Aufräumen: nur alte Zählerdateien, nicht die eigene, nicht fremde Dateien', [weg, existsSync(alt), existsSync(neu), existsSync(eigen), existsSync(fremd)], [1, false, true, true, true]);
  ist('Aufräumen: fehlender Ordner stört nicht', raeumeAuf(join(z, 'gibt-es-nicht')), 0);
  rmSync(z, { recursive: true, force: true });
}

// === 8. Ausgaben gegen die Schemas (in-process) ===================================================================
{
  const z = tmp();
  const env = { LUXE_CODEX_ZUSTAND: z };
  const start = await behandle(eingabe('SessionStart'), env, true);
  ist('Ausgabe SessionStart ist laut Schema gültig und nennt «keine»', [gueltig(start, 'session-start.command.output'), start.systemMessage], [[], 'Schreibzugriffe · keine']);
  const post = await behandle(eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: { query: 'mutation {}' }, tool_response: { content: [] } }), env);
  ist('Ausgabe PostToolUse ist laut Schema gültig und nutzt kein additionalContext', [gueltig(post, 'post-tool-use.command.output'), post.systemMessage, 'hookSpecificOutput' in post], [[], 'Schreibzugriffe · Shop 1', false]);
  ist('Eingaben der Tests sind laut Eingabe-Schema gültig', [
    gueltig(eingabe('SessionStart'), 'session-start.command.input'),
    gueltig(eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: { query: 'x' }, tool_response: { content: [] } }), 'post-tool-use.command.input'),
  ], [[], []]);
  ist('PostToolUse eines Lesezugriffs: keine Ausgabe', await behandle(eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_query', tool_input: {}, tool_response: {} }), env), undefined);
  ist('Fremdes Ereignis (PreToolUse) ohne Argument: keine Ausgabe, kein Zählen', await behandle(eingabe('PreToolUse', { tool_name: 'mcp__Shopify__graphql_mutation' }), env, false), undefined);
  ist('Fremdes Ereignis (Stop) auch mit Argument «start»: keine Ausgabe', await behandle(eingabe('Stop'), env, true), undefined);
  ist('Stand nach alledem: genau ein Shop-Zugriff', leseStand(zaehlerDatei(z, 's-1')).stand, { shop: 1, social: 0, mail: 0, live: 0 });
  const wieder = await behandle(eingabe('SessionStart', { source: 'resume' }), env, true);
  ist('SessionStart bei Wiederaufnahme zeigt den Stand der Sitzung', wieder.systemMessage, 'Schreibzugriffe · Shop 1');
  ist('SessionStart einer anderen Sitzung beginnt bei «keine»', (await behandle(eingabe('SessionStart', { session_id: 's-2' }), env, true)).systemMessage, 'Schreibzugriffe · keine');
  const kaputt = await behandle(eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} , session_id: undefined }), env);
  ist('Fehlende session_id: zählt in eine Ersatzdatei statt zu scheitern', kaputt.systemMessage, 'Schreibzugriffe · Shop 1');
  rmSync(z, { recursive: true, force: true });
}

// === 9. Der Hook als Prozess über stdin/stdout ====================================================================
const prozessEnv = z => ({ PATH: process.env.PATH, HOME: z, LUXE_CODEX_ZUSTAND: join(z, 'zustand') });
function hook(z, wert, args = [], extraEnv = {}) {
  const r = spawnSync(process.execPath, [HOOK, ...args], { input: typeof wert === 'string' ? wert : JSON.stringify(wert), env: { ...prozessEnv(z), ...extraEnv }, encoding: 'utf8', timeout: 15_000 });
  let json; try { json = r.stdout.trim() ? JSON.parse(r.stdout) : undefined; } catch { json = 'KEIN JSON'; }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
}
const nach = (n, rest) => eingabe('PostToolUse', { tool_use_id: `t-${n}`, ...rest });
const SCHEMA_POST = 'post-tool-use.command.output';
{
  const z = tmp();
  let r = hook(z, eingabe('SessionStart'), ['start']);
  ist('Prozess 1: SessionStart + «start» zeigt «keine», Exit 0, gültige Ausgabe', [r.code, r.json.systemMessage, gueltig(r.json, 'session-start.command.output')], [0, 'Schreibzugriffe · keine', []]);
  r = hook(z, nach(1, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: { query: 'mutation { x }' }, tool_response: { content: [{ type: 'text', text: '{}' }] } }));
  ist('Prozess 2: Shopify-Mutation zählt', [r.code, r.json.systemMessage, gueltig(r.json, SCHEMA_POST)], [0, 'Schreibzugriffe · Shop 1', []]);
  r = hook(z, nach(2, { tool_name: 'mcp__Metricool_Social_Media_Management__createScheduledPost', tool_input: {}, tool_response: { content: [] } }));
  ist('Prozess 3: Metricool-Beitrag zählt in Social', [r.code, r.json.systemMessage], [0, 'Schreibzugriffe · Shop 1 · Social 1']);
  r = hook(z, nach(3, { tool_name: 'mcp__Metricool_Social_Media_Management__createScheduledPostForReview', tool_input: {}, tool_response: { content: [] } }));
  ist('Prozess 4: Entwurf zur Prüfung zählt nicht, keine Ausgabe', [r.code, r.out], [0, '']);
  r = hook(z, nach(4, { tool_name: 'mcp__Shopify__graphql_query', tool_input: { query: '{ shop { name } }' }, tool_response: { content: [] } }));
  ist('Prozess 5: graphql_query zählt nie, keine Ausgabe', [r.code, r.out], [0, '']);
  r = hook(z, nach(5, { tool_name: 'exec_command', tool_input: { cmd: 'LIVE=1 node automation/x.mjs', workdir: '/tmp' }, tool_response: { exit_code: 0, stdout: 'ok' } }));
  ist('Prozess 6: LIVE=1 mit Exit 0 zählt als Live', [r.code, r.json.systemMessage, gueltig(r.json, SCHEMA_POST)], [0, 'Schreibzugriffe · Shop 1 · Social 1 · Live 1', []]);
  r = hook(z, nach(6, { tool_name: 'exec_command', tool_input: { cmd: 'LIVE=1 node automation/x.mjs' }, tool_response: { exit_code: 1, stdout: 'Fehler' } }));
  ist('Prozess 7: LIVE=1 mit Exit 1 zählt nicht, keine Ausgabe', [r.code, r.out], [0, '']);
  r = hook(z, nach(7, { tool_name: 'exec_command', tool_input: { cmd: 'LIVE=1 node automation/x.mjs' }, tool_response: { rätselhaft: true } }));
  ist('Prozess 8: LIVE=1 mit unbekannter Antwortform zählt NICHT', [r.code, r.out], [0, '']);
  r = hook(z, nach(8, { tool_name: 'exec_command', tool_input: { cmd: 'git commit -m "LIVE=1 erst nach dem Trockenlauf"' }, tool_response: { exit_code: 0 } }));
  ist('Prozess 9: LIVE=1 nur im Zitat zählt nicht', [r.code, r.out], [0, '']);
  r = hook(z, nach(9, { tool_name: 'apply_patch', tool_input: { input: '*** Begin Patch\n*** Add File: a.md\n+ LIVE=1 node x.mjs\n*** End Patch' }, tool_response: { exit_code: 0 } }));
  ist('Prozess 10: apply_patch mit LIVE=1 im Text zählt nicht', [r.code, r.out], [0, '']);
  r = hook(z, nach(10, { tool_name: 'shell', tool_input: { command: ['bash', '-lc', 'cd a && LIVE=1 node x.mjs'] }, tool_response: '{"output":"ok","metadata":{"exit_code":0,"duration_seconds":0.3}}' }));
  ist('Prozess 11: shell mit argv und klassischer JSON-Antwort zählt', [r.code, r.json.systemMessage], [0, 'Schreibzugriffe · Shop 1 · Social 1 · Live 2']);
  r = hook(z, nach(11, { tool_name: 'mcp__Gmail__send_message', tool_input: {}, tool_response: { isError: true, content: [{ type: 'text', text: 'abgelehnt' }] } }));
  ist('Prozess 12: fehlgeschlagener Mailversand zählt nicht', [r.code, r.out], [0, '']);
  r = hook(z, nach(12, { tool_name: 'mcp__Gmail__send_message', tool_input: {}, tool_response: { content: [] } }));
  ist('Prozess 13: gelungener Mailversand zählt', [r.code, r.json.systemMessage], [0, 'Schreibzugriffe · Shop 1 · Social 1 · Mail 1 · Live 2']);
  r = hook(z, eingabe('SessionStart', { source: 'resume' }), ['start']);
  ist('Prozess 14: SessionStart bei Wiederaufnahme zeigt den Stand', r.json.systemMessage, 'Schreibzugriffe · Shop 1 · Social 1 · Mail 1 · Live 2');
  r = hook(z, eingabe('SessionStart', { session_id: 'andere' }), ['start']);
  ist('Prozess 15: andere Sitzung beginnt bei «keine»', r.json.systemMessage, 'Schreibzugriffe · keine');
  r = hook(z, nach(13, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {}, session_id: 'andere' }));
  ist('Prozess 16: der Zähler der anderen Sitzung ist getrennt', r.json.systemMessage, 'Schreibzugriffe · Shop 1');
  r = hook(z, eingabe('SessionStart'), []);
  ist('Prozess 17: SessionStart auch ohne Argument «start» (Ereignis entscheidet)', [r.code, r.json.systemMessage], [0, 'Schreibzugriffe · Shop 1 · Social 1 · Mail 1 · Live 2']);
  r = hook(z, eingabe('PreToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {} }));
  ist('Prozess 18: ein PreToolUse-Ereignis zählt nichts und gibt nichts aus', [r.code, r.out], [0, '']);
  r = hook(z, 'das ist kein json');
  ist('Prozess 19: kaputtes stdin → Exit 0, keine Ausgabe', [r.code, r.out], [0, '']);
  r = hook(z, '');
  ist('Prozess 20: leeres stdin → Exit 0, keine Ausgabe', [r.code, r.out], [0, '']);
  r = hook(z, nach(14, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {}, session_id: undefined }));
  ist('Prozess 21: Eingabe ohne session_id wird trotzdem verarbeitet', [r.code, r.json.systemMessage], [0, 'Schreibzugriffe · Shop 1']);
  const dateien = readdirSync(join(z, 'zustand')).filter(n => n.startsWith('zaehler-')).sort();
  ist('Zustandsordner enthält nur Zählerdateien der drei Sitzungen, nichts im Arbeitsordner', dateien, ['zaehler-andere.log', 'zaehler-ohne-sitzung.log', 'zaehler-s-1.log']);
  rmSync(z, { recursive: true, force: true });
}
{
  // Kaputte Zählerdatei, mitten in einer Sitzung
  const z = tmp();
  mkdirSync(join(z, 'zustand'));
  writeFileSync(zaehlerDatei(join(z, 'zustand'), 's-1'), 'shop\nshop\n\x00\x00MÜLL\nmail');
  const r = hook(z, nach(1, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }));
  ist('Prozess: kaputte Zählerdatei → Exit 0, Zähler läuft weiter', [r.code, r.json.systemMessage], [0, 'Schreibzugriffe · Shop 3 · Mail 1']);
  rmSync(z, { recursive: true, force: true });
}
{
  // Der Zustandsordner ist unbeschreibbar: ein Fehler im Hook darf nie blockieren, aber nie stumm bleiben
  const z = tmp();
  writeFileSync(join(z, 'datei'), 'x');
  const r = hook(z, nach(1, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }), [], { LUXE_CODEX_ZUSTAND: join(z, 'datei', 'unten') });
  ist('Prozess: unbeschreibbarer Zustandsordner → Exit 0 und sichtbare Meldung', [r.code, r.json?.systemMessage?.includes('luxe-codex/schreibzaehler'), r.json?.systemMessage?.includes('Fehler im Hook'), gueltig(r.json, SCHEMA_POST)], [0, true, true, []]);
  rmSync(z, { recursive: true, force: true });
}
{
  // Parallel: zwölf Hooks gleichzeitig, kein Zähler geht verloren
  const z = tmp();
  const starte = n => new Promise(fertigDann => {
    const kind = spawn(process.execPath, [HOOK], { env: prozessEnv(z), stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    kind.stdout.on('data', d => { out += d; });
    kind.on('close', code => fertigDann({ code, out }));
    kind.stdin.end(JSON.stringify(nach(n, { tool_name: n % 2 ? 'mcp__Shopify__graphql_mutation' : 'exec_command', tool_input: n % 2 ? {} : { cmd: 'LIVE=1 node x.mjs' }, tool_response: n % 2 ? {} : { exit_code: 0 } })));
  });
  const ergebnisse = await Promise.all(Array.from({ length: 12 }, (_, i) => starte(i + 1)));
  ist('Parallel: alle zwölf Hooks enden mit Exit 0 und gültiger Ausgabe', ergebnisse.map(r => [r.code, gueltig(JSON.parse(r.out), SCHEMA_POST).length]), Array.from({ length: 12 }, () => [0, 0]));
  ist('Parallel: kein Zähler geht verloren (6 Shop + 6 Live)', leseStand(zaehlerDatei(join(z, 'zustand'), 's-1')).stand, { shop: 6, social: 0, mail: 0, live: 6 });
  rmSync(z, { recursive: true, force: true });
}
{
  // hooks.json verweist auf die Datei, und «start» steht am SessionStart-Aufruf
  const hooks = JSON.parse(readFileSync(join(HIER, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  const befehle = ev => (hooks[ev] ?? []).flatMap(g => g.hooks.map(h => h.command));
  ist('hooks.json: SessionStart ruft schreibzaehler.mjs mit «start»', befehle('SessionStart').some(c => /schreibzaehler\.mjs"? start$/.test(c)), true);
  ist('hooks.json: PostToolUse ruft schreibzaehler.mjs ohne Argument', befehle('PostToolUse').some(c => /schreibzaehler\.mjs"?$/.test(c)), true);
  ist('hooks.json: die Hook-Datei gibt es', existsSync(HOOK), true);
}

// === 10. Nachprüfung vom 28.10.: die 21 bestätigten Funde (jeder Test trägt seine Nummer, F1 … F21) ================
// Jeder Fund wurde zuerst als fehlschlagender Test eingebaut (rot gegen den Stand vor der Behebung), dann behoben.
const alle = (titel, liste, soll, f) => { for (const x of liste) ist(`${titel}: ${JSON.stringify(x)}`, f(x), soll); };
const zeitMs = f => { const t0 = Date.now(); const r = f(); return [r, Date.now() - t0]; };
const zaehlt = (cmd, antwort = ok0, name = 'exec_command') => gruppeFuer(name, { cmd }, antwort) === 'live';

// --- F4: rohe Programmausgabe in output/stdout ist kein Antwortkopf -------------------------------------------
for (const [name, antwort, soll] of [
  ['stdout trägt rohe Ausgabe «Exit code: 1», Prozess-Code 0', { exit_code: 0, stdout: 'Exit code: 1\nTeilfehler ignoriert, 12 Produkte aktualisiert' }, 'erfolg'],
  ['output (klassisch) trägt rohe Ausgabe «Exit code: 1», metadata 0', { output: 'Exit code: 1\nfoo', metadata: { exit_code: 0 } }, 'erfolg'],
  ['stdout «Process exited with code 3», Prozess-Code 0', { exit_code: 0, stdout: 'Process exited with code 3' }, 'erfolg'],
  ['stdout mit rohem Kopfwort «Chunk ID: …», Prozess-Code 0', { exit_code: 0, stdout: 'Chunk ID: ab\nWall time: 1 seconds\nProcess exited with code 2' }, 'erfolg'],
  ['output formatiert (mit «Output:»): Kopf Exit 0, die Ausgabe druckt «Exit code: 1»', { output: 'Chunk ID: ab\nExit code: 0\nOutput:\nExit code: 1', metadata: { exit_code: 0 } }, 'erfolg'],
  ['Gegenprobe: output formatiert (mit «Output:») mit Kopf Exit 1, sonst nichts', { output: 'Exit code: 1\nWall time: 1 seconds\nOutput:\nboese' }, 'fehler'],
  ['Gegenprobe: rohes stdout mit Kopfwort ohne strukturierten Code ist unbekannt', { stdout: 'Exit code: 1\nfoo' }, 'unbekannt'],
  ['JSON-Text mit rohem stdout «Exit code: 1», Code 0', '{"exit_code":0,"stdout":"Exit code: 1\\nrest"}', 'erfolg'],
  ['MCP-Inhalt mit rohem Text «Exit code: 1» (ohne Output-Marker), Code 0', { exit_code: 0, content: [{ type: 'text', text: 'Exit code: 1\nTeilfehler' }] }, 'erfolg'],
  // F10 (Testlücken G8 und timedOut): Leerraum um den JSON-Text, camelCase-Zeitüberschreitung
  ['F10 JSON-Text mit führendem Leerzeichen', ' {"exit_code":0}', 'erfolg'],
  ['F10 JSON-Text mit Zeilenumbrüchen drumherum', '\n{"exit_code":0}\n', 'erfolg'],
  ['F10 timedOut (camelCase) gewinnt gegen Exit 0', { exit_code: 0, timedOut: true }, 'fehler'],
]) ist(`F4 ausgang: ${name}`, ausgang(antwort), soll);
ist('F4 gruppeFuer: Lauf mit Exit 0 zählt, auch wenn stdout «Exit code: 1» druckt', gruppeFuer('exec_command', { cmd: B }, { exit_code: 0, stdout: 'Exit code: 1\nTeilfehler ignoriert, 12 Produkte aktualisiert' }), 'live');
{
  const z = tmp();
  const r = hook(z, nach(1, { tool_name: 'exec_command', tool_input: { cmd: B }, tool_response: { exit_code: 0, stdout: 'Exit code: 1\nTeilfehler ignoriert' } }));
  ist('F4 Prozess: ein gelungener LIVE-Lauf mit «Exit code: 1» in der Ausgabe wird gezählt', [r.code, r.json?.systemMessage], [0, 'Schreibzugriffe · Live 1']);
  rmSync(z, { recursive: true, force: true });
}

// --- F12 / F19: Heredocs (Rest der Öffnungszeile, ungewöhnliche Begrenzer, kein Abschluss) -----------------------
alle('F12 Heredoc: der Rest der Öffnungszeile bleibt Befehl, LIVE=1 erkannt', [
  "cat <<'EOF' | LIVE=1 node automation/x.mjs\n{\"a\":1}\nEOF",
  'cat > h.txt <<EOF && LIVE=1 node automation/x.mjs\na\nEOF',
  "bash <<'EOF'\nLIVE=1 node automation/x.mjs\nEOF",
  "LIVE=1 node x.mjs <<'EOF'\ndaten\nEOF",
  'cat <<EOF > a.txt; LIVE=1 node x.mjs\ntext\nEOF',
  'sh -s <<EOF\nLIVE=1 node x.mjs\nEOF',
  'cat <<A <<B | LIVE=1 node x.mjs\n1\nA\n2\nB',
  'cat <<EOF\ntext\nEOF\ncat <<EOF2\nmehr\nEOF2\nLIVE=1 node x.mjs',
], true, istLiveBefehl);
alle('F12 Heredoc (Gegenprobe): der Körper bleibt Körper, keine LIVE-Zuweisung am Befehl', [
  "cat <<'EOF' | grep x\nLIVE=1 node x.mjs\nEOF",
  'cat <<EOF | tee a.txt\nLIVE=1 node x.mjs\nEOF',
  'cat <<A <<B\nLIVE=1 node x.mjs\nA\nLIVE=1 node y.mjs\nB',
  "bash <<'EOF'\necho LIVE=1 node x.mjs\nEOF",
  'cat <<EOF\ntext\nEOF\nnode x.mjs',
], false, istLiveBefehl);
alle('F19 Heredoc-Begrenzer mit \\, - oder . (Gegenprobe): der Körper ist kein Befehl', [
  'cat <<\\EOF > notiz.md\nLIVE=1 node x.mjs\nEOF',
  "cat <<'END-DOC' > notiz.md\nLIVE=1 node x.mjs\nEND-DOC",
  "git commit -F - <<'MSG-1'\nLIVE=1 node automation/x.mjs\nMSG-1",
  "cat <<'END.DOC' > n.md\nLIVE=1 node x.mjs\nEND.DOC",
  'cat <<"END-DOC" > n.md\nLIVE=1 node x.mjs\nEND-DOC',
  'cat <<EOF\nLIVE=1 node x.mjs',
  'cat <<-EOF\n\tLIVE=1 node x.mjs\n\tEOF',
  "cat <<-'EOF'\n\tLIVE=1 node x.mjs\n\tEOF",
], false, istLiveBefehl);
alle('F19 Heredoc-Begrenzer: nach dem Abschluss geht es weiter', [
  'cat <<\\EOF > n.md\nLIVE=1 node x.mjs\nEOF\nLIVE=1 node y.mjs',
  "cat <<'END-DOC' > n.md\nx\nEND-DOC\nLIVE=1 node y.mjs",
], true, istLiveBefehl);
ist('F19 Heredoc: ein eingerückter Abschluss ohne «-» beendet den Körper nicht (wie in bash)', istLiveBefehl('cat <<EOF\ntext\n  EOF\nLIVE=1 node x.mjs'), false);

// --- F5: Laufzeit wächst nicht mehr quadratisch ---------------------------------------------------------------
{
  const [r1, ms1] = zeitMs(() => istLiveBefehl(`LIVE=1 node x.mjs\n${'a<<b '.repeat(60000)}`));
  ist('F5 292 KB mit unbeendeten «<<wort» in unter 3 s (vorher 15 s)', [r1, ms1 < 3000], [true, true]);
  const [r2, ms2] = zeitMs(() => istLiveBefehl(`LIVE=1 node x.mjs\n${'cat <<EOF\n'.repeat(20000)}`));
  ist('F5 195 KB mit 20 000 «cat <<EOF» in unter 3 s (vorher 8 s)', [r2, ms2 < 3000], [true, true]);
  const [r3, ms3] = zeitMs(() => istLiveBefehl(`cat > a.cpp <<\\EOF\n${'cout << "wort" << endl;\n'.repeat(12000)}`));
  ist('F19 F5 Quelltext mit «<<» in einem Heredoc: 300 KB in unter 3 s', [r3, ms3 < 3000], [false, true]);
  const [r4, ms4] = zeitMs(() => istLiveBefehl(`${'echo hallo; '.repeat(80000)}LIVE=1 node x.mjs`));
  ist('F5 Gegenprobe: 1 MB gewöhnlicher Befehle in unter 3 s und das LIVE=1 am Ende wird gefunden', [r4, ms4 < 3000], [true, true]);
  const [r5, ms5] = zeitMs(() => gruppeFuer('exec_command', { cmd: `LIVE=1 node x.mjs\n${'a<<b '.repeat(60000)}` }, ok0));
  ist('F5 gruppeFuer mit dem 292-KB-Befehl: in unter 3 s', ms5 < 3000, true);
  ist('F5 …und das Ergebnis ist bekannt: der erste Befehl ist gefolgt von weiterem Text, also nicht beweisbar', r5, undefined);
  // Der Leser für JavaScript des Code-Modus bleibt linear, auch bei Text voller «exec_command({» ohne Ende
  for (const [titel, text] of [
    ['«tools.exec_command({» 20 000-mal', 'tools.exec_command({'.repeat(20000)],
    ['«exec_command({ a: (» 20 000-mal (nie geschlossene Klammer)', 'tools.exec_command({ a: ('.repeat(20000)],
    ['«exec_command({cmd: "» 20 000-mal (nie geschlossenes Literal)', 'exec_command({cmd: "'.repeat(20000)],
    ['ein 400-KB-Literal ohne Ende', `exec_command({ cmd: "${'x'.repeat(400000)}`],
  ]) {
    const [r, ms] = zeitMs(() => befehleAus('exec', text));
    ist(`F5 befehleAus (Code-Modus) ${titel}: in unter 3 s, nichts erkannt`, [r, ms < 3000], [[], true]);
  }
  const [rg, msg] = zeitMs(() => befehleAus('exec', `await tools.exec_command({ cmd: "${'x'.repeat(300000)} LIVE=1 node x.mjs" })`));
  ist('F5 befehleAus: ein 300-KB-Literal wird gelesen (in unter 3 s)', [rg.length, msg < 3000], [1, true]);
}

// --- F13: LIVE=1 vor einer Zuweisung mit $(…) oder Backticks ---------------------------------------------------
alle('F13 Zuweisung mit Befehlsersetzung: LIVE=1 erkannt', [
  'LIVE=1 HANDLES=$(cat /tmp/h.txt) node automation/x.mjs',
  'LIVE=1 STAMP=$(date +%F) node automation/x.mjs',
  'LIVE=1 HANDLES=`paste -sd, /tmp/h.txt` node automation/x.mjs',
  'HANDLES=$(cat /tmp/h.txt) LIVE=1 node x.mjs',
  'LIVE=1 node x.mjs --handles "$(cat h)"',
  'LIVE=1 HANDLES="$(cat /tmp/h.txt)" node x.mjs',
  'LIVE=1 X=$(echo "a)b") node x.mjs',
  'LIVE=1 X=$(echo $(date)) node x.mjs',
  'X=$(LIVE=1 node x.mjs)',
  'echo "$(LIVE=1 node x.mjs)"',
  'echo `LIVE=1 node x.mjs`',
], true, istLiveBefehl);
alle('F13 Befehlsersetzung (Gegenprobe): LIVE=1 steht nicht vor einem Befehl', [
  'echo $(cat h) LIVE=1',
  'X=$(date) node x.mjs',
  'echo $(cat h)',
  'node x.mjs HANDLES=$(cat h) LIVE=1',
  "echo '$(LIVE=1 node x.mjs)'",
  'echo `echo LIVE=1 node x.mjs`',
  'echo $((1 + 2)) LIVE=1',
  'LIVE=1 HANDLES=$(cat h)',
], false, istLiveBefehl);
ist('F13 gruppeFuer: LIVE=1 mit $(…) in der Zuweisung und Exit 0 zählt', zaehlt('LIVE=1 HANDLES=$(cat /tmp/h.txt) node automation/x.mjs'), true);

// --- F14: Wrapper vor env/bash -c und Shell-Optionen vor -c ---------------------------------------------------
alle('F14 Wrapper und Shell-Optionen: LIVE=1 erkannt', [
  'timeout 600 env LIVE=1 node automation/x.mjs',
  'nohup env LIVE=1 node automation/x.mjs &',
  "nohup bash -c 'LIVE=1 node automation/x.mjs' > /tmp/l.log 2>&1 &",
  "setsid -f bash -c 'LIVE=1 node automation/x.mjs'",
  "timeout 3000 bash -c 'LIVE=1 node automation/x.mjs'",
  'exec env LIVE=1 node x.mjs',
  'command env LIVE=1 node x.mjs',
  'nice env LIVE=1 node x.mjs',
  'nice -n 10 env LIVE=1 node x.mjs',
  '/usr/bin/env LIVE=1 node x.mjs',
  'env -C /tmp LIVE=1 node x.mjs',
  'env "LIVE=1" node x.mjs',
  "env 'LIVE=1' node x.mjs",
  'env -u FOO LIVE=1 node x.mjs',
  'bash -euo pipefail -c "LIVE=1 node x.mjs"',
  'bash -o pipefail -c "LIVE=1 node x.mjs"',
  'bash -x -e -c "LIVE=1 node x.mjs"',
  'timeout -s KILL 10 env LIVE=1 node x.mjs',
  'timeout --signal=KILL 10 env LIVE=1 node x.mjs',
  'stdbuf -oL env LIVE=1 node x.mjs',
  'sudo -u www env LIVE=1 node x.mjs',
  'eval "LIVE=1 node x.mjs"',
  'LIVE=1 nohup node x.mjs',
  'env LIVE=1 timeout 600 node x.mjs',
  'unset LIVE; LIVE=1 node x.mjs',
], true, istLiveBefehl);
alle('F14 Wrapper und Shell-Optionen (Gegenprobe): kein LIVE=1 am Befehl', [
  'timeout 600 node x.mjs',
  'nohup node x.mjs &',
  'timeout 600 env FOO=1 node x.mjs',
  "nohup bash -c 'node x.mjs'",
  'env -C /tmp node x.mjs LIVE=1',
  'bash -o pipefail -c "node x.mjs"',
  'bash -euo pipefail -c "echo LIVE=1"',
  'env -i node x.mjs',
  'env LIVE=1',
  'LIVE=1 env -i node x.mjs',
  'timeout 600 env LIVE=0 node x.mjs',
  'nice -n 10 node x.mjs LIVE=1',
  'command -v node',
  'eval "echo LIVE=1"',
], false, istLiveBefehl);
for (const [name, form] of [
  ['shell', { command: ['timeout', '600', 'env', 'LIVE=1', 'node', 'x.mjs'] }],
  ['shell', { command: ['bash', '-o', 'pipefail', '-lc', 'LIVE=1 node x.mjs'] }],
  ['local_shell', { action: { command: ['nohup', 'env', 'LIVE=1', 'node', 'x.mjs'] } }],
]) ist(`F14 argv ${JSON.stringify(form.command ?? form.action.command)} mit Exit 0 zählt`, gruppeFuer(name, form, ok0), 'live');
ist('F14 argv mit «-o pipefail» behält die Option, damit die Pipe im Skript beweisbar bleibt', gruppeFuer('shell', { command: ['bash', '-o', 'pipefail', '-lc', 'LIVE=1 node x.mjs | tail'] }, ok0), 'live');
ist('F14 argv mit einfacher Option liefert weiter das Skript selbst', befehleAus('shell', { command: ['bash', '-lc', B] }), [B]);
ist('F14 gruppeFuer: Wrapper-Befehl mit Exit 1 zählt nicht', zaehlt('timeout 600 env LIVE=1 node automation/x.mjs', { exit_code: 1 }), false);

// --- F17: export LIVE=1 allein, überschrieben oder entfernt ----------------------------------------------------
alle('F17 export (Gegenprobe): LIVE=1 erreicht keinen Befehl', [
  'export LIVE=1',
  'export LIVE=1; echo gesetzt',
  'export LIVE=1; unset LIVE; node x.mjs',
  'export LIVE=1; export LIVE=0; node x.mjs',
  'export LIVE=1; LIVE=0; node x.mjs',
  'LIVE=1 LIVE=0 node x.mjs',
  'LIVE=1 env -u LIVE node x.mjs',
  'LIVE=1 env --unset=LIVE node x.mjs',
  'LIVE=1; node x.mjs',
  'export -n LIVE; LIVE=1; node x.mjs',
  'export -n LIVE=1; node x.mjs',
  'export LIVE=1\necho gesetzt\n',
  'LIVE=1 echo hallo',
  'LIVE=1 printf "%s" x',
], false, istLiveBefehl);
alle('F17 export: LIVE=1 erreicht einen Befehl', [
  'export LIVE=1; node x.mjs',
  'export LIVE=1 && node x.mjs',
  'export LIVE=1\nnode x.mjs',
  'LIVE=0 LIVE=1 node x.mjs',
  'export LIVE=0; export LIVE=1; node x.mjs',
  'LIVE=1; export LIVE; node x.mjs',
  'export LIVE=1; env node x.mjs',
  'export LIVE=1; bash -c "node x.mjs"',
  'unset LIVE; LIVE=1 node x.mjs',
], true, istLiveBefehl);
ist('F17 gruppeFuer: «export LIVE=1» allein mit Exit 0 zählt nicht', zaehlt('export LIVE=1'), false);
{
  const z = tmp();
  const r = hook(z, nach(1, { tool_name: 'exec_command', tool_input: { cmd: 'export LIVE=1' }, tool_response: { exit_code: 0 } }));
  ist('F17 Prozess: «export LIVE=1» allein gibt nichts aus', [r.code, r.out], [0, '']);
  rmSync(z, { recursive: true, force: true });
}

// --- F18: Erfolg ist nur beweisbar, wenn nichts den Exit-Code des LIVE-Befehls verdeckt -----------------------------
alle('F18 Exit 0 beweist den Erfolg des LIVE-Befehls', [
  'LIVE=1 node x.mjs',
  'cd a && LIVE=1 node x.mjs',
  'echo a; LIVE=1 node x.mjs',
  'LIVE=1 node x.mjs && echo ok',
  'LIVE=1 node x.mjs;',
  'LIVE=1 node x.mjs\n',
  'cat ids.txt | LIVE=1 node x.mjs',
  'set -o pipefail; LIVE=1 node x.mjs 2>&1 | tail -5',
  'bash -o pipefail -c "LIVE=1 node x.mjs | tail"',
  'if true; then LIVE=1 node x.mjs; fi',
  'nohup env LIVE=1 node x.mjs &',
  'export LIVE=1; node x.mjs',
  "bash -lc 'LIVE=1 node x.mjs'",
  '(LIVE=1 node x.mjs)',
  'LIVE=1 node x.mjs # Kommentar',
  'LIVE=1 node x.mjs <<EOF\ndaten\nEOF',
  'LIVE=1 node a.mjs; LIVE=1 node b.mjs',
], true, c => zaehlt(c));
alle('F18 Exit 0 beweist den Erfolg NICHT (Pipe, Semikolon, || true, Schleife): kein Zählen', [
  'LIVE=1 node automation/x.mjs; echo "exit=$?"',
  'LIVE=1 node x.mjs 2>&1 | tail -5',
  'LIVE=1 node x.mjs | tee log.txt',
  'LIVE=1 node x.mjs || true',
  'LIVE=1 node x.mjs; echo fertig',
  'LIVE=1 node x.mjs || echo kaputt',
  'LIVE=1 node x.mjs && echo ok || echo fehler',
  "bash -lc 'LIVE=1 node x.mjs; echo fertig'",
  'bash -lc "LIVE=1 node x.mjs | tail"',
  'for f in a b; do LIVE=1 node x.mjs $f; done',
  'while read f; do LIVE=1 node x.mjs $f; done < ids.txt',
  'echo $(LIVE=1 node x.mjs)',
  'if LIVE=1 node x.mjs; then echo ok; fi',
  'export LIVE=1; node x.mjs; echo fertig',
  'LIVE=1 node x.mjs\necho fertig',
  'LIVE=1 node x.mjs |& tee log.txt',
], false, c => zaehlt(c));
ist('F18 …die Befehle werden trotzdem als LIVE erkannt (nur der Erfolg ist unbewiesen)', ['LIVE=1 node x.mjs 2>&1 | tail -5', 'LIVE=1 node x.mjs || true', 'echo $(LIVE=1 node x.mjs)'].map(c => istLiveBefehl(c)), [true, true, true]);
ist('F18 Fundfall: stdout «Fehler: Throttled / exit=3» bei «; echo exit=$?» zählt nicht', gruppeFuer('exec_command', { cmd: 'LIVE=1 node automation/x.mjs; echo "exit=$?"' }, { exit_code: 0, stdout: 'Fehler: Throttled\nexit=3' }), undefined);
ist('F18 Fundfall: «| tail -5» mit Fehlertext in der Ausgabe zählt nicht', gruppeFuer('exec_command', { cmd: 'LIVE=1 node x.mjs 2>&1 | tail -5' }, { exit_code: 0, stdout: 'Error: SHOPIFY_TOKEN fehlt' }), undefined);
{
  const z = tmp();
  const r = hook(z, nach(1, { tool_name: 'exec_command', tool_input: { cmd: 'LIVE=1 node x.mjs 2>&1 | tail -5' }, tool_response: { exit_code: 0, stdout: 'Error: SHOPIFY_TOKEN fehlt' } }));
  ist('F18 Prozess: ein durch «| tail» maskierter Lauf wird nicht gezählt', [r.code, r.out], [0, '']);
  const r2 = hook(z, nach(2, { tool_name: 'exec_command', tool_input: { cmd: 'set -o pipefail; LIVE=1 node x.mjs 2>&1 | tail -5' }, tool_response: { exit_code: 0, stdout: 'ok' } }));
  ist('F18 Prozess: mit «set -o pipefail» ist der Erfolg beweisbar und der Lauf zählt', [r2.code, r2.json?.systemMessage], [0, 'Schreibzugriffe · Live 1']);
  rmSync(z, { recursive: true, force: true });
}

// --- F10: Testlücken der Befehls-Erkennung ---------------------------------------------------------------------
alle('F10 maskierte Zeichen ergeben keine Zuweisung (bash führt «\\LIVE=1» als Befehl aus)', ['\\LIVE=1 node x.mjs', 'L\\IVE=1 node x.mjs', 'LIVE\\=1 node x.mjs'], false, istLiveBefehl);
ist('F10 exec-Eingabe mit mehreren Textfeldern: ein Feld ohne exec_command (davor oder danach) verdeckt das andere nicht', [
  befehleAus('exec', { description: 'Deploy', code: `await tools.exec_command({ cmd: "${B}" })` }),
  befehleAus('exec', { code: 'const a = 1;', input: `await tools.exec_command({ cmd: "${B}" })` }),
  befehleAus('exec', { code: `await tools.exec_command({ cmd: "${B}" })`, input: 'const a = 1;' }),
  befehleAus('exec', { code: `await tools.exec_command({ cmd: "${B}" })`, hinweis: 'nur Text' }),
], [[B], [B], [B], [B]]);
ist('F10 exec-Eingabe: zwei Felder mit je einem Aufruf liefern beide Befehle, in der Reihenfolge der Felder', befehleAus('exec', { code: 'tools.exec_command({ cmd: "echo a" })', input: `tools.exec_command({ cmd: "${B}" })` }), ['echo a', B]);
ist('F10 \\u0026 im JS-Literal wird zu «&» entschlüsselt, der LIVE-Befehl danach erkannt', [
  befehleAus('exec', 'await tools.exec_command({ cmd: "echo start \\u0026 LIVE=1 node x.mjs" })'),
  istLiveBefehl(befehleAus('exec', 'await tools.exec_command({ cmd: "echo start \\u0026 LIVE=1 node x.mjs" })')[0]),
], [['echo start & LIVE=1 node x.mjs'], true]);
ist('F10 \\x26 im JS-Literal wird ebenso entschlüsselt', befehleAus('exec', 'await tools.exec_command({ cmd: "a \\x26 b" })'), ['a & b']);

// --- F15: Wort exec_command / Feld command allein macht keinen Shell-Befehl --------------------------------------
{
  const js = 'await tools.exec_command({ cmd: "LIVE=1 node x.mjs" })';
  const patch = `*** Begin Patch\n*** Update File: test/x.mjs\n@@\n+ ${js}\n*** End Patch`;
  const patchKontext = `*** Begin Patch\n*** Update File: test/x.mjs\n@@\n ${B.replace('node automation/x.mjs', 'PHASE=tags node automation/kategorien.mjs')}\n+ neu\n*** End Patch`;
  for (const antwort of [ok0, { success: true }, KOPF(0)]) {
    ist(`F15 apply_patch {input} mit JS-Beispieltext zählt nicht (Antwort ${typeof antwort === 'string' ? 'Textkopf' : JSON.stringify(antwort)})`, gruppeFuer('apply_patch', { input: patch }, antwort), undefined);
  }
  ist('F15 apply_patch mit Patch als reinem Text zählt nicht', gruppeFuer('apply_patch', patch, ok0), undefined);
  ist('F15 befehleAus: Patch mit JS-Beispieltext liefert nichts', [befehleAus('apply_patch', { input: patch }), befehleAus('apply_patch', patch)], [[], []]);
  ist('F15 git commit mit «exec_command … cmd: \'LIVE=1 …\'» im Text zählt nicht', zaehlt('git commit -m "Zähler: erkennt exec_command mit cmd: \'LIVE=1 node x.mjs\'"'), false);
  ist('F15 Heredoc mit JS-Quelltext (cat > t.mjs <<EOF) zählt nicht', zaehlt(`cat > t.mjs <<'EOF'\n${js}\nEOF`), false);
  ist('F15 echo mit JS-Quelltext zählt nicht', zaehlt(`echo '${js}'`), false);
  ist('F15 Feld command trägt einen Patch (apply_patch): zählt nicht', gruppeFuer('apply_patch', { command: patchKontext }, ok0), undefined);
  ist('F15 Feld command trägt einen Patch (update_plan): zählt nicht', gruppeFuer('update_plan', { command: patchKontext }, ok0), undefined);
  ist('F15 befehleAus: Patch im Feld command liefert nichts', [befehleAus('apply_patch', { command: patchKontext }), befehleAus('update_plan', { cmd: patchKontext })], [[], []]);
  ist('F15 Dateischreib-Werkzeug mit JS-Text im Inhalt zählt nicht', gruppeFuer('Write', { file_path: 't.mjs', content: js }, ok0), undefined);
  ist('F15 Dateischreib-Werkzeug (new_string) mit JS-Text zählt nicht', gruppeFuer('Edit', { file_path: 't.mjs', old_string: 'x', new_string: js }, ok0), undefined);
  ist('F15 Gegenprobe: der Code-Modus (exec) mit demselben JS zählt weiter', [gruppeFuer('exec', js, ok0), gruppeFuer('exec', { code: js }, ok0), gruppeFuer('exec', { input: js }, ok0)], ['live', 'live', 'live']);
  ist('F15 Gegenprobe: Shell-Werkzeug mit {cmd} zählt weiter', gruppeFuer('exec_command', { cmd: B }, ok0), 'live');
  ist('F15 Gegenprobe: Shell-Name mit Text, der exec_command nur als Argument nennt, bleibt ein Shell-Befehl', befehleAus('exec_command', `${B} --tool exec_command`), [`${B} --tool exec_command`]);
  ist('F15 exec: andere Eigenschaften vor cmd (Zeichenketten mit Klammern, Objekt)', befehleAus('exec', 'tools.exec_command({ workdir: "/x}y", env: { A: "1" }, yield_time_ms: 500, cmd: "LIVE=1 node x.mjs" })'), ['LIVE=1 node x.mjs']);
  ist('F15 exec: Schlüssel in Anführungszeichen', befehleAus('exec', 'tools.exec_command({ "cmd": "LIVE=1 node x.mjs" })'), ['LIVE=1 node x.mjs']);
  ist('F15 exec: cmd steht nicht im Aufruf von exec_command, sondern woanders', befehleAus('exec', 'const a = { cmd: "LIVE=1 node x.mjs" }; tools.exec_command(a)'), []);
  ist('F15 exec: cmd aus zusammengesetztem Ausdruck ist unbekannt', befehleAus('exec', 'tools.exec_command({ cmd: "LIVE=1 " + "node x.mjs" })'), []);
  ist('F15 exec: zwei Aufrufe liefern beide Befehle', befehleAus('exec', 'tools.exec_command({ cmd: "echo a" });\ntools.exec_command({ cmd: \'LIVE=1 node x.mjs\' })'), ['echo a', 'LIVE=1 node x.mjs']);
}

// --- F16: Gruppenmuster ---------------------------------------------------------------------------------------
const tt = n => `mcp__TikTok_Ads__${n}`;
alle('F16 TikTok schreibt (Löschen, Verschieben, Hochladen, Einladen …): zählt als Social', [
  'comment_delete', 'creative_asset_delete', 'catalog_product_delete', 'dmp_custom_audience_delete', 'bc_transfer', 'bc_pixel_transfer',
  'bc_member_invite', 'bc_asset_assign', 'bc_asset_unassign', 'catalog_product_upload', 'file_video_ad_upload', 'file_image_ad_upload', 'adgroup_appeal', 'smart_plus_ad_appeal',
  'rf_order_cancel', 'audience_segment_operate', 'bc_advertiser_disable', 'campaign_gmv_max_session_delete', 'subscription_unsubscribe_cancel',
  'bc_partner_add', 'search_ad_negative_keyword_add', 'catalog_eventsource_bind', 'catalog_eventsource_unbind', 'tt_video_authorize_apply', 'tt_video_unbind',
  'tto_tcm_campaign_link', 'playable_save', 'term_confirm', 'catalog_capitalize_migrate', 'page_library_transfer', 'split_test_promote_run', 'comment_post_create',
  'campaign_copy_task_create', 'blockedword_create', 'creative_auto_message_create',
].map(tt), 'social', gruppeVon);
alle('F16 TikTok-Berichts- und Prüfaufträge, Vorschau (Gegenprobe): zählt nie', [
  'report_task_create', 'changelog_task_create', 'blockedword_task_create', 'comment_task_create', 'page_lead_task_create', 'bc_invoice_task_create',
  'diagnostic_catalog_product_task_create', 'creative_ads_preview_create', 'video_fix_task_create', 'report_task_cancel',
  'report_task_check', 'report_task_download', 'report_integrated_get', 'changelog_task_download', 'campaign_copy_task_check',
  'catalog_eventsource_bind_get', 'bc_pixel_link_get', 'dmp_custom_audience_apply_log_get', 'dmp_custom_audience_share_get', 'comment_list_get',
  'smart_plus_material_report_breakdown_run', 'smart_plus_material_report_overview_run', 'blockedword_check', 'tool_url_validate', 'playable_validate',
  'tiktok_ads_diagnosis_agent', 'ad_audience_size_estimate', 'rf_inventory_estimate', 'file_name_check', 'bc_invoice_task_get',
].map(tt), undefined, gruppeVon);
alle('F16 Klaviyo: plant den Versand an Empfänger → Mail', ['mcp__Klaviyo__schedule_campaign_message', 'mcp__Klaviyo__send_campaign', 'mcp__klaviyo__schedule_campaign_message'], 'mail', gruppeVon);
alle('F16 Klaviyo (Gegenprobe): Entwurf, Lesen, Absage, Zeitplan-Änderung zählt nicht', [
  'mcp__Klaviyo__create_campaign', 'mcp__Klaviyo__get_campaign', 'mcp__Klaviyo__cancel_campaign_send', 'mcp__Klaviyo__update_campaign_message_schedule',
  'mcp__Klaviyo__schedule_campaign_message_vorschau', 'mcp__Klaviyo__reschedule_campaign_message',
], undefined, gruppeVon);
alle('F16 Shopify: Hochladen und Importieren in den Shop → Shop', [
  'mcp__Shopify__upload-digital-product-file', 'mcp__Shopify__upload-digital-product-media', 'mcp__Shopify__import-mock-shop-catalog', 'mcp__shopify__upload_digital_product_file',
], 'shop', gruppeVon);
alle('F16 Shopify (Gegenprobe): Suchen, Vorschau, Verbindung prüfen zählt nicht', [
  'mcp__Shopify__find-mock-shop-catalogs', 'mcp__Shopify__open-digital-products-install', 'mcp__Shopify__test-digital-products-connection', 'mcp__Shopify__generate-business-names',
  'mcp__Shopify__generate-domain-names', 'mcp__Shopify__switch-shop', 'mcp__Shopify__show-collective-products', 'mcp__Shopify__get-new-store-previews',
  'mcp__Shopify__upload', 'mcp__Shopify__import', 'mcp__Shopify__uploads-digital-product-file',
], undefined, gruppeVon);
ist('F16 Ende zu Ende: bc_transfer (Guthaben verschieben) mit Antwort ohne Fehler zählt als Social', gruppeFuer(tt('bc_transfer'), {}, { content: [] }), 'social');
ist('F16 Ende zu Ende: report_task_create zählt nicht', gruppeFuer(tt('report_task_create'), {}, { content: [] }), undefined);
{
  const z = tmp();
  let r = hook(z, nach(1, { tool_name: tt('bc_transfer'), tool_input: {}, tool_response: { content: [] } }));
  ist('F16 Prozess: bc_transfer wird gezählt', [r.code, r.json?.systemMessage], [0, 'Schreibzugriffe · Social 1']);
  r = hook(z, nach(2, { tool_name: tt('report_task_create'), tool_input: {}, tool_response: { content: [] } }));
  ist('F16 Prozess: report_task_create gibt nichts aus', [r.code, r.out], [0, '']);
  r = hook(z, nach(3, { tool_name: 'mcp__Klaviyo__schedule_campaign_message', tool_input: {}, tool_response: { content: [] } }));
  ist('F16 Prozess: schedule_campaign_message wird als Mail gezählt', [r.code, r.json?.systemMessage], [0, 'Schreibzugriffe · Social 1 · Mail 1']);
  rmSync(z, { recursive: true, force: true });
}

// --- F3 / F7 / F8: Aufräumen, Zustandsordner, Dateiname ---------------------------------------------------------
{
  const z = tmp();
  const ordner = join(z, 'zustand');
  mkdirSync(ordner);
  const altern = (name, tage, inhalt = 'shop\nshop\n') => {
    const d = zaehlerDatei(ordner, name);
    writeFileSync(d, inhalt);
    const t = new Date(Date.now() - tage * 86_400_000);
    utimesSync(d, t, t);
    return d;
  };
  const d = { freitag: altern('freitag', 5), zwoelf: altern('zwoelf', 12), dreizehn: altern('dreizehn', 13), halb: altern('vierzehnhalb', 14.5), fuenfzehn: altern('fuenfzehn', 15), uralt: altern('uralt', 30) };
  const weg = raeumeAuf(ordner, { behalte: zaehlerDatei(ordner, 'montag') });
  ist('F3 Aufräumen: nur Dateien über 14 Tage fallen weg (14,5 / 15 / 30), 5 / 12 / 13 Tage bleiben', [weg, Object.fromEntries(Object.entries(d).map(([k, v]) => [k, existsSync(v)]))], [3, { freitag: true, zwoelf: true, dreizehn: true, halb: false, fuenfzehn: false, uralt: false }]);
  const d2 = altern('uralt2', 30);
  const d3 = altern('mittel', 20);
  ist('F3 Aufräumen: eine kleinere Frist wird beachtet (tage: 10 löscht die 12 Tage alte)', [raeumeAuf(ordner, { tage: 10 }), existsSync(d.zwoelf), existsSync(d.freitag)], [4, false, true]);
  ist('F3 …die Reste (uralt2, mittel) sind schon weg', [existsSync(d2), existsSync(d3)], [false, false]);
  rmSync(z, { recursive: true, force: true });
}
{
  // Ende zu Ende über den Hook-Prozess: der SessionStart räumt auf, die Wiederaufnahme der 5 Tage alten Sitzung behält ihren Stand
  const z = tmp();
  const ordner = join(z, 'zustand');
  mkdirSync(ordner);
  const altern = (name, tage) => {
    const d = zaehlerDatei(ordner, name);
    writeFileSync(d, 'shop\nshop\n');
    const t = new Date(Date.now() - tage * 86_400_000);
    utimesSync(d, t, t);
    return d;
  };
  const freitag = altern('freitag', 5); const uralt = altern('uralt', 30); const halb = altern('halb', 14.5);
  const start = hook(z, eingabe('SessionStart', { session_id: 'montag' }), ['start']);
  ist('F3 Prozess: SessionStart einer neuen Sitzung beginnt bei «keine» und räumt Zählerdateien über 14 Tage weg', [start.code, start.json?.systemMessage, existsSync(uralt), existsSync(halb), existsSync(freitag)], [0, 'Schreibzugriffe · keine', false, false, true]);
  const wieder = hook(z, eingabe('SessionStart', { session_id: 'freitag', source: 'resume' }), ['start']);
  ist('F3 Prozess: die Wiederaufnahme der 5 Tage alten Sitzung zeigt ihren Stand (Shop 2)', wieder.json?.systemMessage, 'Schreibzugriffe · Shop 2');
  rmSync(z, { recursive: true, force: true });
}
{
  const z = tmp();
  const tief = join(z, 'a', 'b', 'c');
  const r = await behandle(eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }), { LUXE_CODEX_ZUSTAND: tief });
  ist('F7 Zustandsordner mit mehreren neuen Ebenen wird angelegt, der Zähler zählt', [r?.systemMessage, existsSync(zaehlerDatei(tief, 's-1'))], ['Schreibzugriffe · Shop 1', true]);
  const p1 = hook(z, nach(1, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }), [], { LUXE_CODEX_ZUSTAND: join(z, 'x', 'y', 'z') });
  ist('F7 Prozess: LUXE_CODEX_ZUSTAND mit mehreren neuen Ebenen zählt (kein ENOENT)', [p1.code, p1.json?.systemMessage], [0, 'Schreibzugriffe · Shop 1']);
  const p2 = hook(z, nach(2, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }), [], { LUXE_CODEX_ZUSTAND: undefined, CLAUDE_PLUGIN_DATA: join(z, 'daten', 'plugin', 'luxe') });
  ist('F7 Prozess: ein noch nicht angelegtes CLAUDE_PLUGIN_DATA zählt (kein ENOENT)', [p2.code, p2.json?.systemMessage], [0, 'Schreibzugriffe · Shop 1']);
  rmSync(z, { recursive: true, force: true });
}
{
  const verschieden = ['a/b', 'a?b', 'a b', 'a.b', 'a:b'].map(sichererName);
  ist('F8 Dateiname: fünf verschieden veränderte Kennungen mit gleichem Rest bleiben alle verschieden', new Set(verschieden).size, 5);
  ist('F8 Dateiname: veränderte Kennung trägt eine 8-stellige Prüfsumme', verschieden.every(n => /^a_b-[0-9a-f]{8}$/.test(n)), true);
  const z = tmp();
  const datei = join(z, 'zaehler-crlf.log');
  writeFileSync(datei, '\r\nshop\r\n\r\nshop\r\nmail\r\n');
  ist('F8 Zählerdatei mit Windows-Zeilenenden (CRLF) wird gezählt', leseStand(datei).stand, { shop: 2, social: 0, mail: 1, live: 0 });
  writeFileSync(datei, ' shop \n\tmail\t\n');
  ist('F8 Zählerdatei mit Leerzeichen und Tabs um die Zeile wird gezählt', leseStand(datei).stand, { shop: 1, social: 0, mail: 1, live: 0 });
  rmSync(z, { recursive: true, force: true });
}

// --- F1: die Hooks geben nie blockierende Felder aus (continue, decision, reason, stopReason, suppressOutput) ---------
{
  const VERBOTEN = ['continue', 'decision', 'reason', 'stopReason', 'suppressOutput'];
  const z = tmp();
  const env = { LUXE_CODEX_ZUSTAND: z };
  const a1 = await behandle(eingabe('SessionStart'), env, true);
  const a2 = await behandle(eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }), env);
  const a3 = await behandle(eingabe('PostToolUse', { tool_name: 'exec_command', tool_input: { cmd: B }, tool_response: ok0, tool_use_id: 't-2' }), env);
  const a4 = await behandle(eingabe('SessionStart', { source: 'resume' }), env, true);
  ist('F1 behandle SessionStart: genau {systemMessage}', a1, { systemMessage: 'Schreibzugriffe · keine' });
  ist('F1 behandle PostToolUse (Shop): genau {systemMessage}', a2, { systemMessage: 'Schreibzugriffe · Shop 1' });
  ist('F1 behandle PostToolUse (Live): genau {systemMessage}', a3, { systemMessage: 'Schreibzugriffe · Shop 1 · Live 1' });
  ist('F1 behandle Wiederaufnahme: genau {systemMessage}', a4, { systemMessage: 'Schreibzugriffe · Shop 1 · Live 1' });
  ist('F1 keine Ausgabe trägt ein blockierendes Feld', [a1, a2, a3, a4].map(a => VERBOTEN.filter(k => k in a)), [[], [], [], []]);
  const p = hook(z, nach(9, { tool_name: 'mcp__Gmail__send_message', tool_input: {}, tool_response: {} }));
  ist('F1 Prozess: genau {systemMessage} und nichts sonst', p.json, { systemMessage: 'Schreibzugriffe · Mail 1' });
  writeFileSync(join(z, 'im-weg'), 'x');
  const fehler = hook(z, nach(10, { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }), [], { LUXE_CODEX_ZUSTAND: join(z, 'im-weg', 'unten') });
  ist('F1 Prozess (Fehlerpfad): nur systemMessage, kein blockierendes Feld, Exit 0', [fehler.code, Object.keys(fehler.json ?? {}), VERBOTEN.filter(k => k in (fehler.json ?? {}))], [0, ['systemMessage'], []]);
  rmSync(z, { recursive: true, force: true });
}

// --- Gegenprobe gegen echte bash: erreicht LIVE=1 wirklich ein Programm? Beweist Exit 0 wirklich den Erfolg? -----------------------
// Die Wahrheit wird nicht von Hand beschriftet, sondern GEMESSEN: ein Attrappen-`node` schreibt, was es in $LIVE sieht, und endet mit
// einem vorgegebenen Exit-Code. Fehlt bash (z. B. unter Windows), wird sichtbar übersprungen.
{
  const z = tmp();
  const bashDa = spawnSync('bash', ['-c', 'exit 0'], { encoding: 'utf8' });
  if (bashDa.error || bashDa.status !== 0) {
    console.log('ÜBERSPRUNGEN: bash fehlt, die Gegenprobe der LIVE-Erkennung gegen echte bash läuft nicht');
  } else {
    mkdirSync(join(z, 'bin')); mkdirSync(join(z, 'cwd', 'a'), { recursive: true });
    writeFileSync(join(z, 'bin', 'node'), `#!/bin/sh\necho "LIVE=\${LIVE-unset}" >> "${z}/log"\nexit $(cat "${z}/exitcode")\n`, { mode: 0o755 });
    const lauf = (befehl, exitcode) => {
      writeFileSync(join(z, 'exitcode'), String(exitcode)); rmSync(join(z, 'log'), { force: true });
      const echt = befehl.replace(/\bnode\b/g, join(z, 'bin', 'node'));
      const r = spawnSync('bash', ['-c', echt], { cwd: join(z, 'cwd'), encoding: 'utf8', timeout: 10_000, env: { PATH: '/usr/bin:/bin', HOME: z } });
      const hintergrund = /&\s*$/.test(befehl);
      for (let n = 0; hintergrund && n < 40 && !existsSync(join(z, 'log')); n += 1) spawnSync('sleep', ['0.05']);
      return { status: r.status, sah: existsSync(join(z, 'log')) ? readFileSync(join(z, 'log'), 'utf8').trim().split('\n') : [] };
    };
    const KORPUS = [
      'LIVE=1 node x', 'node x', 'LIVE=0 node x', 'LIVE=1 LIVE=0 node x', 'LIVE=0 LIVE=1 node x', 'env LIVE=1 node x', 'LIVE=1 env -u LIVE node x', 'env -i LIVE=1 node x',
      'LIVE=1 env -i node x', 'FOO=bar LIVE=1 node x', 'LIVE=1 HANDLES=$(echo a) node x', 'LIVE=1 H=`echo a` node x', 'echo $(LIVE=1 node x)', 'echo "$(LIVE=1 node x)"', "echo '$(LIVE=1 node x)'",
      'export LIVE=1; node x', 'export LIVE=1; unset LIVE; node x', 'export LIVE=1; LIVE=0; node x', 'LIVE=1; node x', 'LIVE=1; export LIVE; node x', 'export LIVE=1', 'export LIVE=1; env node x', 'export -n LIVE=1; node x', 'export -n LIVE; LIVE=1; node x',
      'echo a | export LIVE=1; node x', 'echo a | LIVE=1; export LIVE; node x',
      'timeout 5 env LIVE=1 node x', 'nice -n 5 env LIVE=1 node x', 'nohup env LIVE=1 node x', 'exec env LIVE=1 node x', 'command env LIVE=1 node x', 'stdbuf -oL env LIVE=1 node x', 'env -C . LIVE=1 node x', 'env "LIVE=1" node x',
      'bash -c "LIVE=1 node x"', 'bash -c "node x"', 'bash -o pipefail -c "LIVE=1 node x"', 'bash -euo pipefail -c "LIVE=1 node x"', 'sh -c "cd a && LIVE=1 node x"', 'eval "LIVE=1 node x"', 'LIVE=1 bash -c "node x"', "bash -c 'echo LIVE=1 node x'",
      "cat <<'EOF' | LIVE=1 node x\n{}\nEOF", 'cat > h.txt <<EOF && LIVE=1 node x\na\nEOF', "bash <<'EOF'\nLIVE=1 node x\nEOF", "cat <<'EOF' > n.md\nLIVE=1 node x\nEOF", 'cat <<\\EOF > n.md\nLIVE=1 node x\nEOF',
      "cat <<'END-DOC' > n.md\nLIVE=1 node x\nEND-DOC", 'cat <<EOF\nLIVE=1 node x', 'cat <<EOF\nt\n  EOF\nLIVE=1 node x', 'cat <<-EOF\n\tLIVE=1 node x\n\tEOF', 'cat <<EOF\nt\nEOF\nLIVE=1 node x', 'LIVE=1 node x <<EOF\nd\nEOF',
      '\\LIVE=1 node x', 'L\\IVE=1 node x', 'LIVE\\=1 node x', 'LIVE=\\1 node x', '"LIVE=1" node x', 'LIVE="1" node x', "LIVE='1' node x", 'echo LIVE=1 node x', 'node x LIVE=1', 'echo "LIVE=1 node x"',
      '# LIVE=1 node x', 'echo a # LIVE=1 node x', 'for i in 1; do LIVE=1 node x; done', 'if true; then LIVE=1 node x; fi', '(LIVE=1 node x)', '{ LIVE=1 node x; }', 'cd a && LIVE=1 node x', 'echo a; LIVE=1 node x', 'LIVE=1 \\\n node x',
    ];
    const falsch = [];
    for (const b of KORPUS) {
      const wahr = lauf(b, 0).sah.includes('LIVE=1');
      if (istLiveBefehl(b) !== wahr) falsch.push({ befehl: b, analyse: istLiveBefehl(b), bash: wahr });
    }
    ist(`Gegenprobe gegen echte bash: ${KORPUS.length} Befehle, die Erkennung stimmt mit dem überein, was ein Programm in $LIVE sieht`, falsch, []);
    // Beweisbar heisst: scheitert der LIVE-Befehl (Exit 3), endet die ganze Zeile NICHT mit Exit 0 (ausser beim Hintergrundstart)
    const SUFFIXE = ['', ' | tail -1', ' || true', '; echo a', ' && echo a', ' 2>&1', ' |& cat', '\necho b', ' &'];
    const PRAEFIXE = ['', 'cd a && ', 'echo a; ', 'set -o pipefail; ', 'echo a | '];
    let geprueft = 0; const unsicher = [];
    for (const b of KORPUS) for (const s of SUFFIXE) for (const p of PRAEFIXE) {
      const c = `${p}${b}${s}`;
      if (!analysiere(c).beweisbar || /&\s*$/.test(c)) continue;
      geprueft += 1;
      const r = lauf(c, 3);
      if (r.status === 0 && r.sah.includes('LIVE=1')) unsicher.push(c);
    }
    ist(`Gegenprobe gegen echte bash: ${geprueft} als beweisbar erkannte Zeilen, bei denen ein scheiternder LIVE-Befehl die Zeile nie mit Exit 0 enden lässt`, [unsicher, geprueft > 400], [[], true]);
  }
  rmSync(z, { recursive: true, force: true });
}

// --- F2: hooks.json: Aufbau und die Befehlszeilen selbst ausführen (auch bei Leerzeichen im Plugin-Pfad) ---------------
{
  const hooks = JSON.parse(readFileSync(join(HIER, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  const ERLAUBT = new Set(['type', 'command', 'timeout', 'statusMessage']);
  const gruppen = Object.entries(hooks).flatMap(([ereignis, gs]) => gs.map(g => ({ ereignis, g })));
  const handler = gruppen.flatMap(({ ereignis, g }) => (g.hooks ?? []).map(h => ({ ereignis, g, h })));
  ist('F2 hooks.json: genau diese Ereignisse', Object.keys(hooks).sort(), ['PostToolUse', 'PreToolUse', 'SessionStart', 'UserPromptSubmit']);
  ist('F2 hooks.json: keine Gruppe hat einen matcher (sonst schweigt der Zähler bei MCP-Zugriffen)', gruppen.filter(({ g }) => g.matcher !== undefined).map(x => x.ereignis), []);
  ist('F2 hooks.json: Gruppen tragen nur das Feld hooks', gruppen.map(({ g }) => Object.keys(g)), gruppen.map(() => ['hooks']));
  ist('F2 hooks.json: jeder Handler ist vom Typ command', handler.filter(({ h }) => h.type !== 'command').map(x => x.h), []);
  ist('F2 hooks.json: jeder Handler hat ein ganzzahliges Zeitlimit zwischen 1 und 60', handler.filter(({ h }) => !(Number.isInteger(h.timeout) && h.timeout >= 1 && h.timeout <= 60)).map(x => x.h), []);
  ist('F2 hooks.json: kein Handler ist async', handler.filter(({ h }) => 'async' in h).map(x => x.h), []);
  ist('F2 hooks.json: nur bekannte Felder im Handler (ein Tippfehler wie «timout» fällt auf)', handler.flatMap(({ h }) => Object.keys(h).filter(k => !ERLAUBT.has(k))), []);
  ist('F2 hooks.json: jeder Befehl setzt den Pfad in Anführungszeichen', handler.filter(({ h }) => !/^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[a-z]+\.mjs"( start)?$/.test(h.command)).map(x => x.h.command), []);
  const befehleVon = (ev, datei) => handler.filter(x => x.ereignis === ev).map(x => x.h.command).filter(c => c.includes(`/${datei}"`));
  ist('F2 hooks.json: SessionStart ruft kontext.mjs und schreibzaehler.mjs «start», in dieser Reihenfolge', handler.filter(x => x.ereignis === 'SessionStart').map(x => x.h.command), ['node "${CLAUDE_PLUGIN_ROOT}/hooks/kontext.mjs"', 'node "${CLAUDE_PLUGIN_ROOT}/hooks/schreibzaehler.mjs" start']);
  ist('F2 hooks.json: UserPromptSubmit ruft genau kontext.mjs', handler.filter(x => x.ereignis === 'UserPromptSubmit').map(x => x.h.command), ['node "${CLAUDE_PLUGIN_ROOT}/hooks/kontext.mjs"']);
  ist('F2 hooks.json: PostToolUse ruft genau schreibzaehler.mjs ohne Argument', handler.filter(x => x.ereignis === 'PostToolUse').map(x => x.h.command), ['node "${CLAUDE_PLUGIN_ROOT}/hooks/schreibzaehler.mjs"']);
  ist('F2 hooks.json: PreToolUse ruft leitplanken.mjs', befehleVon('PreToolUse', 'leitplanken.mjs').length, 1);

  // Die Befehlszeilen selbst ausführen, mit einem Plugin-Pfad MIT Leerzeichen (so, wie Codex sie über die Shell startet)
  const shDa = spawnSync('sh', ['-c', 'exit 0']);
  if (shDa.error || shDa.status !== 0) console.log('ÜBERSPRUNGEN: sh fehlt, die Befehlszeilen aus hooks.json laufen nicht');
  else {
    const z = tmp();
    const wurzel = join(z, 'a b', 'luxe-codex');
    mkdirSync(wurzel, { recursive: true });
    for (const teil of ['lib', 'hooks']) cpSync(join(HIER, '..', teil), join(wurzel, teil), { recursive: true });
    const lauf = (befehl, wert) => spawnSync('sh', ['-c', befehl], {
      input: JSON.stringify(wert), encoding: 'utf8', timeout: 15_000,
      env: { PATH: `${dirname(process.execPath)}:${process.env.PATH}`, HOME: z, CLAUDE_PLUGIN_ROOT: wurzel, LUXE_CODEX_ZUSTAND: join(z, 'zustand') },
    });
    const EINGABE_JE = {
      SessionStart: eingabe('SessionStart'),
      UserPromptSubmit: eingabe('UserPromptSubmit'),
      PreToolUse: eingabe('PreToolUse', { tool_name: 'exec_command', tool_input: { cmd: 'ls' } }),
      PostToolUse: eingabe('PostToolUse', { tool_name: 'mcp__Shopify__graphql_mutation', tool_input: {}, tool_response: {} }),
    };
    const ergebnisse = handler.map(({ ereignis, h }) => ({ ereignis, h, r: lauf(h.command, EINGABE_JE[ereignis]) }));
    ist('F2 Befehlszeilen mit Leerzeichen im Plugin-Pfad: alle enden mit Exit 0 ohne Fehlermeldung', ergebnisse.map(({ r }) => [r.status, r.stderr]), ergebnisse.map(() => [0, '']));
    const aus = (ereignis, datei) => ergebnisse.find(x => x.ereignis === ereignis && x.h.command.includes(`/${datei}"`))?.r.stdout;
    ist('F2 …kontext.mjs liefert beim SessionStart die Projektregeln', JSON.parse(aus('SessionStart', 'kontext.mjs') || '{}').hookSpecificOutput?.additionalContext?.startsWith('LuxeStyle-Projektregeln'), true);
    ist('F2 …schreibzaehler.mjs «start» zeigt «keine»', JSON.parse(aus('SessionStart', 'schreibzaehler.mjs') || '{}').systemMessage, 'Schreibzugriffe · keine');
    ist('F2 …schreibzaehler.mjs zählt die Shopify-Mutation', JSON.parse(aus('PostToolUse', 'schreibzaehler.mjs') || '{}').systemMessage, 'Schreibzugriffe · Shop 1');
    ist('F2 …kontext.mjs schweigt beim Prompt (Sparmodus AUS)', aus('UserPromptSubmit', 'kontext.mjs'), '');
    rmSync(z, { recursive: true, force: true });
  }
}

fertig();
