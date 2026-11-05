// Mutationsprobe für den Fortura-Bestandsabgleich im Dauerbetrieb: verändert je EINE Stelle in Stempel-Skript, Workflow, Feed-Skript oder dem
// erprobten Abgleich-Skript und prüft, ob mindestens ein Test rot wird. Überlebt ein Mutant, ist ein Test zu schwach (oder der Mutant gleichwertig:
// dann steht er unten mit Begründung in GLEICHWERTIG). Ein Muster, das nicht genau einmal vorkommt, ist ein Fehler der Probe selbst («nicht anwendbar»).
//   node dropship/lagerbestand-0511/stempel_mutation.mjs
// Läuft auf einer Kopie des Baums im Wegwerfordner; das Repo bleibt unberührt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '../..');
const BAUM = fs.mkdtempSync(path.join(os.tmpdir(), 'lxmut-'));
const KOPIE = [
  'automation/fortura_bestand_sync.mjs', 'automation/fortura_bestand_stempel.mjs', 'automation/fortura_feed_holen.sh',
  'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs',
  '.github/workflows/fortura-bestand.yml', 'dropship/_fortura_sperr_varianten.txt',
  'dropship/lagerbestand-0511/stempel_test.mjs', 'dropship/lagerbestand-0511/feed_holen_test.mjs',
];
for (const f of KOPIE) { fs.mkdirSync(path.dirname(path.join(BAUM, f)), { recursive: true }); fs.copyFileSync(path.join(WURZEL, f), path.join(BAUM, f)); }

const S = 'automation/fortura_bestand_stempel.mjs', W = '.github/workflows/fortura-bestand.yml', F = 'automation/fortura_feed_holen.sh', Y = 'automation/fortura_bestand_sync.mjs';
// [Name, Datei, von (muss genau einmal vorkommen), zu, Tests]
const M = [
  // --- Stempel-Skript: das Gate ---
  ['S01 Live-Exit 1 gilt als Erfolg', S, 'else if (liveExit !== 0)', 'else if (liveExit > 1)', 'stempel'],
  ['S02 Grenze >= statt >', S, 'if (z.zuAendern > grenze)', 'if (z.zuAendern >= grenze)', 'stempel'],
  ['S03 1 % aufgerundet', S, 'Math.floor(summe * ABWEICHUNG_ANTEIL)', 'Math.ceil(summe * ABWEICHUNG_ANTEIL)', 'stempel'],
  ['S04 Mindestgrenze 20 statt 40', S, 'export const ABWEICHUNG_MIN = 40;', 'export const ABWEICHUNG_MIN = 20;', 'stempel'],
  ['S05 Anteil 2 % statt 1 %', S, 'export const ABWEICHUNG_ANTEIL = 0.01;', 'export const ABWEICHUNG_ANTEIL = 0.02;', 'stempel'],
  ['S06 Feed-Alter >= statt >', S, 'else if (alterH > feedMax)', 'else if (alterH >= feedMax)', 'stempel'],
  ['S07 Feed darf 48 Stunden alt sein', S, 'export const FEED_MAX_STUNDEN = 36;', 'export const FEED_MAX_STUNDEN = 48;', 'stempel'],
  ['S08 offen > 0 statt !== 0 (undefined/leer geht durch)', S, 'if (stand.offen !== 0)', 'if (stand.offen > 0)', 'stempel'],
  ['S09 Nachprüfung muss nicht zu Ende gelaufen sein', S, 'if (!ende.zuEnde)', 'if (false)', 'stempel'],
  ['S10 ABBRUCH im Text wird ignoriert', S, 'if (ende.abbruch)', 'if (false)', 'stempel'],
  ['S11 Mindestzahl Varianten entfällt', S, 'if (summe < minVar)', 'if (summe < 0)', 'stempel'],
  ['S12 Stand-Datei darf beliebig alt sein', S, 'else if (min > standMax)', 'else if (min > standMax * 1000)', 'stempel'],
  ['S13 Fingerabdruck wird nicht verglichen', S, 'stand.feed_hash !== fpNach', 'false', 'stempel'],
  ['S14 Feeddatei aus der Zukunft geht durch', S, 'if (jetztMs - feedMtimeMs < -ZUKUNFT_TOLERANZ_MS)', 'if (false)', 'stempel'],
  ['S15 Stand aus der Zukunft geht durch', S, 'if (jetztMs - t < -ZUKUNFT_TOLERANZ_MS)', 'if (false)', 'stempel'],
  ['S16 Gate-Ergebnis wird ignoriert', S, '  if (!e.ok) {', '  if (false) {', 'stempel'],
  ['S17 Exit des Live-Laufs fehlt = 0', S, 'const liveExit = ganzzahl(env.LIVE_EXIT);', 'const liveExit = ganzzahl(env.LIVE_EXIT) ?? 0;', 'stempel'],
  ['S18 unlesbarer Nachprüfungs-Exit = 0', S, "(ganzzahl(env.NACH_EXIT) ?? -1)", "(ganzzahl(env.NACH_EXIT) ?? 0)", 'stempel'],
  ['S19 Exit des Nachprüfungs-Laufs wird nicht geprüft', S, 'if (nachExit !== 0) gruende.push', 'if (false) gruende.push', 'stempel'],
  ['S20 letzte Abgleich-Zeile zählt nicht (erste)', S, 'for (let i = zeilen.length - 1; i >= 0; i--) {', 'for (let i = 0; i < zeilen.length; i++) {', 'stempel'],
  // --- Stempel-Skript: Schreiben ---
  ['S21 schreibt auch ohne Freigabedatei', S, "env.LIVE === '1' && env.DRY !== '1' && fs.existsSync(freigabe)", "env.LIVE === '1' && env.DRY !== '1'", 'stempel'],
  ['S22 schreibt trotz DRY=1', S, "env.LIVE === '1' && env.DRY !== '1' && fs.existsSync(freigabe)", "env.LIVE === '1' && fs.existsSync(freigabe)", 'stempel'],
  ['S23 schreibt ohne LIVE=1', S, "env.LIVE === '1' && env.DRY !== '1' && fs.existsSync(freigabe)", "env.DRY !== '1' && fs.existsSync(freigabe)", 'stempel'],
  ['S24 Namespace lux statt luxe', S, "export const NAMESPACE = 'luxe';", "export const NAMESPACE = 'lux';", 'stempel'],
  ['S25 anderer Schlüssel', S, "export const KEY = 'fortura_bestand_stand';", "export const KEY = 'fortura_stand';", 'stempel'],
  ['S26 Typ json statt single_line_text_field', S, "export const TYP = 'single_line_text_field';", "export const TYP = 'json';", 'stempel'],
  ['S27 API-Version 2026-01', S, "export const API = '2025-01';", "export const API = '2026-01';", 'stempel'],
  ['S28 ownerId fest statt Shop-GID', S, 'ownerId: shopId,', "ownerId: 'gid://shopify/Shop/1',", 'stempel'],
  ['S29 Millisekunden bleiben im Stempel', S, ".replace(/\\.\\d{3}Z$/, 'Z')", '', 'stempel'],
  ['S30 userErrors werden ignoriert', S, 'if (w.userErrors && w.userErrors.length)', 'if (false)', 'stempel'],
  ['S31 Zurücklesen wird nicht verglichen', S, 'if (zurueck !== wert)', 'if (false)', 'stempel'],
  ['S32 fremde Shop-Domain wird nicht geprüft', S, 'normalizeShopifyHost(env.SHOPIFY_SHOP) || STANDARD_SHOP', 'env.SHOPIFY_SHOP || STANDARD_SHOP', 'stempel'],
  ['S33 anderer Standard-Shop', S, "export const STANDARD_SHOP = 'au3j0y-hq.myshopify.com';", "export const STANDARD_SHOP = 'anderer.myshopify.com';", 'stempel'],
  ['S34 Skript startet beim Import', S, "if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {", 'if (true) {', 'stempel'],
  ['S35 Gate-Fehler endet mit Exit 0', S, "for (const g of e.gruende) fehlerLog('  - ' + g);\n    return 1;", "for (const g of e.gruende) fehlerLog('  - ' + g);\n    return 0;", 'stempel'],
  ['S36 fehlender Shopify-Zugang endet mit Exit 1 statt 2', S, "Es wird nichts geschrieben.'); return 2; }", "Es wird nichts geschrieben.'); return 1; }", 'stempel'],
  ['S37 Secret wird nicht bereinigt', S, 'secret = shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET)', 'secret = env.SHOPIFY_CLIENT_SECRET', 'stempel'],
  ['S38 Token-Fehler ignoriert (HTTP-Status)', S, "if (!r.ok) throw new Error(`Token: HTTP ${r.status}`);", '', 'stempel'],
  ['S39 Token-Aufruf folgt Weiterleitungen', S, "redirect: 'error', signal: AbortSignal.timeout(30000),", 'signal: AbortSignal.timeout(30000),', 'stempel'],
  // --- erprobtes Abgleich-Skript: jede Änderung fällt auf ---
  ['Y01 Abgleich-Skript verändert (Puffer 2)', Y, ': 1;\nconst BESTAND_SPALTE', ': 2;\nconst BESTAND_SPALTE', 'stempel'],
  // --- Workflow ---
  ['W01 Zeitplan 04:51', W, "- cron: '51 3 * * *'", "- cron: '51 4 * * *'", 'stempel'],
  ['W02 Stempel auch im Trockenlauf', W, "if: ${{ !cancelled() && steps.modus.outputs.live == '1' && steps.sync.outputs.rc != '' }}", "if: ${{ !cancelled() && steps.sync.outputs.rc != '' }}", 'stempel'],
  ['W03 Modus: schedule UND Eingabe nötig', W, 'if [ "$EREIGNIS" = "schedule" ] || [ "$SCHREIBEN_EINGABE" = "true" ]; then live=1; fi', 'if [ "$EREIGNIS" = "schedule" ] && [ "$SCHREIBEN_EINGABE" = "true" ]; then live=1; fi', 'stempel'],
  ['W04 Modus ohne Freigabedatei-Prüfung', W, 'if [ -f dropship/FORTURA-BESTAND-FREI.txt ]; then', 'if true; then', 'stempel'],
  ['W05 contents: write', W, 'contents: read', 'contents: write', 'stempel'],
  ['W06 andere concurrency-Gruppe', W, 'group: fortura-bestand', 'group: fortura-x', 'stempel'],
  ['W07 Zeitlimit 120 Minuten', W, 'timeout-minutes: 60', 'timeout-minutes: 120', 'stempel'],
  ['W08 Abgleich schreibt im Trockenlauf', W, 'if [ "$LIVE" = "1" ]; then unset DRY; else export DRY=1; fi', 'unset DRY', 'stempel'],
  ['W09 Nachprüfung ohne DRY=1', W, 'DRY=1 node automation/fortura_bestand_sync.mjs 2>&1 | tee lauf-nach.txt', 'node automation/fortura_bestand_sync.mjs 2>&1 | tee lauf-nach.txt', 'stempel'],
  ['W10 shopify_host.mjs fehlt im Sparse-Checkout', W, '            automation/lib/shopify_host.mjs\n', '', 'stempel'],
  ['W11 roter Abgleich bleibt grün', W, 'exit "$rc"\n\n      - name: Nachprüfung (erneuter Trockenlauf)', 'exit 0\n\n      - name: Nachprüfung (erneuter Trockenlauf)', 'stempel'],
  ['W12 Stempel bekommt festen Live-Exit 0', W, 'LIVE_EXIT: ${{ steps.sync.outputs.rc }}', "LIVE_EXIT: '0'", 'stempel'],
  ['W13 Artefakt nur bei Erfolg', W, '      - name: Protokoll aufbewahren\n        if: always()\n', '      - name: Protokoll aufbewahren\n', 'stempel'],
  ['W14 Feed im Artefakt', W, '            dropship/_fortura_bestand_stand.json\n', '            dropship/_fortura_bestand_stand.json\n            ${{ runner.temp }}/fortura_feed.csv\n', 'stempel'],
  ['W15 Passwort wird ausgegeben', W, 'bash automation/fortura_feed_holen.sh "$FORTURA_CSV" 2>&1 | tee lauf-feed.txt', 'echo "$FORTURA_FTP_PW"; bash automation/fortura_feed_holen.sh "$FORTURA_CSV" 2>&1 | tee lauf-feed.txt', 'stempel'],
  ['W16 Zugangsprüfung ohne Passwort', W, '          [ -n "$FORTURA_FTP_PW" ] || fehlt="$fehlt FORTURA_FTP_PW"\n', '', 'stempel'],
  ['W17 Sparse-Checkout im Cone-Modus', W, 'sparse-checkout-cone-mode: false', 'sparse-checkout-cone-mode: true', 'stempel'],
  ['W18 Abgleich ohne Secret-Bereinigung', W, `          SHOPIFY_CLIENT_SECRET="$(node -e "import('./automation/lib/shopify_secret.mjs').then(m=>process.stdout.write(m.shopifyClientSecret()))")"\n          export SHOPIFY_CLIENT_SECRET\n          mkdir -p dropship`, '          mkdir -p dropship', 'stempel'],
  ['W18b Abgleich: export entfällt', W, '          export SHOPIFY_CLIENT_SECRET\n          mkdir -p dropship', '          mkdir -p dropship', 'stempel'],
  ['W22 Nachprüfung ohne Secret-Bereinigung', W, `          SHOPIFY_CLIENT_SECRET="$(node -e "import('./automation/lib/shopify_secret.mjs').then(m=>process.stdout.write(m.shopifyClientSecret()))")"\n          export SHOPIFY_CLIENT_SECRET\n          DRY=1 node`, '          DRY=1 node', 'stempel'],
  ['W19 Modus meldet immer live', W, 'echo "live=$live" >> "$GITHUB_OUTPUT"', 'echo "live=1" >> "$GITHUB_OUTPUT"', 'stempel'],
  ['W20 Stempel-Schritt ohne Nachprüfungs-Exit', W, '          NACH_EXIT: ${{ steps.nach.outputs.rc }}\n', '', 'stempel'],
  ['W21 Nachprüfung läuft auch bei Exit 2', W, "(steps.sync.outputs.rc == '0' || steps.sync.outputs.rc == '1')", "steps.sync.outputs.rc != ''", 'stempel'],
  // --- Feed-Skript ---
  ['F01 keine Mindestgrösse', F, 'if [ "$BYTES" -lt "$MIN_BYTES" ]; then', 'if [ "$BYTES" -lt 1 ]; then', 'feed'],
  ['F02 falsches Passwort wird wiederholt', F, '[ $rc -eq 20 ] && fehler', '[ $rc -eq 99 ] && fehler', 'feed'],
  ['F03 Mindestgrösse 50 Bytes', F, 'MIN_BYTES="${FORTURA_MIN_BYTES:-5000000}"', 'MIN_BYTES="${FORTURA_MIN_BYTES:-50}"', 'feed'],
  ['F04 Passwort in der Befehlszeile', F, '--data-urlencode "passwd@$ARBEIT/p"', '--data-urlencode "passwd=$FORTURA_FTP_PW"', 'feed'],
  ['F05 keine Kopfzeilen-Prüfung', F, `elif ! { head -c 4000 "$ARBEIT/feed" > "$ARBEIT/kopf"; grep -a -q 'ArtNr' "$ARBEIT/kopf"; }; then`, 'elif false; then', 'feed'],
  ['F06 Zertifikatsprüfung aus', F, 'TLS=()', 'TLS=(-k)', 'feed'],
  ['F07 Ersatzadresse ohne FORTURA_TEST', F, 'if [ "${FORTURA_TEST:-}" = "1" ] && [ -n "${FORTURA_BASIS:-}" ]; then', 'if [ -n "${FORTURA_BASIS:-}" ]; then', 'feed'],
  ['F08 Serverzeit wird nicht gesetzt', F, 'touch -d "@$SERVER" "$ARBEIT/feed" 2>/dev/null || SERVER=""', 'true', 'feed'],
  ['F09 Fehler enden mit Exit 1', F, 'fehler() { echo "FEHLER (Fortura-Feed): $*" >&2; exit 2; }', 'fehler() { echo "FEHLER (Fortura-Feed): $*" >&2; exit 1; }', 'feed'],
  ['F10 keine Abmeldung nach einem Fehlversuch', F, '  abmelden\n  [ "$n" -ge "$VERSUCHE" ] && fehler', '  [ "$n" -ge "$VERSUCHE" ] && fehler', 'feed'],
  ['F11 HTTP-Fehler am Login wird nicht wiederholt', F, 'if [ "$http" != "200" ]; then echo "  Login: HTTP $http" >&2; return 10; fi', 'true', 'feed'],
  ['F17 HTML-Antwort am Login gilt als falsches Passwort', F, 'FEHLERCODE:keine-json-antwort|FEHLERCODE:feld-fehlt) echo', 'FEHLERCODE:nie) echo', 'feed'],
  ['F12 Dateien mit Zugangsdaten bleiben liegen', F, 'trap aufraeumen EXIT', 'trap abmelden EXIT', 'feed'],
  ['F13 Dateien lesbar für alle', F, 'umask 077', 'umask 022', 'feed'],
  ['F14 Download ohne Zeitlimit', F, '--connect-timeout 30 --max-time 900 -G', '--connect-timeout 30 -G', 'feed'],
  ['F15 Zugangsprüfung nur auf den Benutzer', F, '[ -n "${FORTURA_FTP_USER:-}" ] && [ -n "${FORTURA_FTP_PW:-}" ] || {', '[ -n "${FORTURA_FTP_USER:-}" ] || {', 'feed'],
  ['F16 Zieldatei wird direkt geschrieben (nicht erst nach der Prüfung)', F, 'cp -p "$ARBEIT/feed" "$TMPZIEL" || { rm -f "$TMPZIEL"; fehler "Zieldatei nicht schreibbar: $OUT"; }\nmv -f "$TMPZIEL" "$OUT" || { rm -f "$TMPZIEL"; fehler "Zieldatei nicht ersetzbar: $OUT"; }', ': > "$OUT"; cp -p "$ARBEIT/feed" "$OUT"', 'feed'],
];

// Mutanten, die laut Probe gleichwertig sind (kein Test kann sie unterscheiden, weil sich nur etwas ändert, das die Attrappe nicht kennt).
const GLEICHWERTIG = {
  'W18b Abgleich: export entfällt': 'SHOPIFY_CLIENT_SECRET kommt schon aus dem env-Block des Schritts in die Umgebung und ist damit bereits exportiert; die Zuweisung davor genügt (bash behält das Export-Merkmal)',
  'S39 Token-Aufruf folgt Weiterleitungen': 'redirect:"error" schützt vor einer Umleitung des Token-Aufrufs auf einen fremden Host; die Attrappe leitet nie um, ein Unterschied wäre nur mit einem echten Server sichtbar',
  'F16 Zieldatei wird direkt geschrieben (nicht erst nach der Prüfung)': 'die Zieldatei wird in beiden Fassungen erst NACH der Prüfung angefasst; der Unterschied (atomares Ersetzen) zeigt sich nur bei einem Absturz mitten im Kopieren',
  'S38 Token-Fehler ignoriert (HTTP-Status)': 'ohne die r.ok-Prüfung scheitert der Aufruf eine Zeile später an «Antwort ohne access_token» mit demselben Exit 1; nur der Text der Meldung unterscheidet sich',
};

const TESTS = {
  stempel: 'dropship/lagerbestand-0511/stempel_test.mjs',
  feed: 'dropship/lagerbestand-0511/feed_holen_test.mjs',
};
const lauf = (art) => spawnSync(process.execPath, [path.join(BAUM, TESTS[art])], { cwd: BAUM, encoding: 'utf8', timeout: 180000, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: os.tmpdir() } });

// Ausgangslage: beide Tests müssen auf der Kopie grün sein
for (const art of Object.keys(TESTS)) {
  const r = lauf(art);
  if (r.status !== 0) { console.log(`Ausgangslage: ${art}-Test ist auf der Kopie NICHT grün:\n` + (r.stdout + r.stderr).split('\n').slice(-15).join('\n')); process.exit(2); }
  console.log(`Ausgangslage ${art}: ${(r.stdout.match(/(\d+) Prüfungen/) || [])[0] || 'grün'}`);
}

let erkannt = 0, gleichwertig = 0, ueberlebt = 0, unanwendbar = 0;
const liste = [];
for (const [name, datei, von, zu, art] of M) {
  const pfad = path.join(BAUM, datei);
  const orig = fs.readFileSync(pfad, 'utf8');
  const vorkommen = orig.split(von).length - 1;
  if (vorkommen !== 1) { unanwendbar++; liste.push(`  ? ${name}: Muster kommt ${vorkommen}x vor (verlangt: genau 1)`); continue; }
  fs.writeFileSync(pfad, orig.replace(von, () => zu));
  const r = lauf(art);
  fs.writeFileSync(pfad, orig);
  const rot = r.status !== 0;
  if (rot) { erkannt++; liste.push(`  ✓ ${name}`); }
  else if (GLEICHWERTIG[name]) { gleichwertig++; liste.push(`  = ${name}: gleichwertig. ${GLEICHWERTIG[name]}`); }
  else { ueberlebt++; liste.push(`  ✗ ${name}: ÜBERLEBT (kein Test wurde rot)`); }
}
console.log(liste.join('\n'));
console.log(`\n${M.length} Mutanten: ${erkannt} erkannt, ${gleichwertig} gleichwertig, ${ueberlebt} überlebt, ${unanwendbar} nicht anwendbar`);
fs.rmSync(BAUM, { recursive: true, force: true });
process.exit(ueberlebt || unanwendbar ? 1 : 0);
