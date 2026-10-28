/**
 * Test des Schreibzählers: Gruppenmuster in BEIDE Richtungen, Erfolgs-Auswertung, LIVE=1-Erkennung, Zähler-Datei
 * (fehlend, kaputt, parallel), Ausgaben gegen die Schemas und der Hook als Prozess über stdin/stdout.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import { ausgang, befehleAus, gruppeFuer, GRUPPEN, gruppeVon, istLiveBefehl, leererZaehler, statusText, zaehleHoch } from '../lib/gruppen.mjs';
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

fertig();
