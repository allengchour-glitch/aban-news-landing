/**
 * Test der Leitplanken: Regeln (Port des Claude-Mods, jede in BEIDE Richtungen), Formen der Werkzeugeingabe
 * (Shell als Text und als Liste, Patch, Dateischreiben, JavaScript des Code-Modus, mehrere Werkzeugnamen),
 * Zustand der Trockenläufe (kaputt, parallel, sicherer Dateiname) und der Hook als echter Prozess.
 * Jede Hook-Ausgabe wird gegen das Schema aus der Codex-Binärdatei geprüft (test/schemas), jede nachgespielte
 * Eingabe ebenfalls. Die Zusammenfassung steht am ENDE (fertig()).
 *
 * Geheimnisse im Test sind aus Teilen zusammengesetzt, damit hier kein echt aussehender Wert steht.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import { AUSWEGE, GEHEIMNISSE, ohneText, ohneTextAusserPfaden, pruefeBash, pruefeInhalt, pruefePfad, umgebungsAnteile } from '../lib/regeln.mjs';
import { befehlAusListe, entpacke, heredocTexte, liesJs, liesPatch, ziehePruefgut } from '../lib/eingabe_form.mjs';
import { leseTrocken, merkeTrocken, sitzungsName, trockenDatei } from '../lib/trockenlauf.mjs';
import { PRAEFIX, leitplanken } from '../hooks/leitplanken.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HIER, '..', 'hooks', 'leitplanken.mjs');
const temp = [];
const neuerOrdner = () => { const o = mkdtempSync(join(tmpdir(), 'luxe-leit-')); temp.push(o); return o; };

// ---------------------------------------------------------------- Beispielgeheimnisse (zusammengesetzt)
const HEX32 = '0123456789abcdef0123456789abcdef';
const S = {
  shopify: `shp${'at_'}${HEX32}`,
  shopifyKey: `shp${'ss_'}${HEX32}`,
  stripe: `sk${'_live_'}${'A'.repeat(24)}`,
  stripeRestricted: `rk${'_live_'}${'B'.repeat(24)}`,
  groq: `gsk${'_'}${'a'.repeat(40)}`,
  google: `AI${'za'}${'B'.repeat(35)}`,
  github: `gh${'p_'}${'c'.repeat(40)}`,
  githubPat: `github${'_pat_'}${'d'.repeat(50)}`,
  slack: `xox${'b-'}1234567890-abcdef`,
  pem: `-----BEGIN ${'RSA PRIVATE KEY-----'}`,
  openai: `sk${'-proj-'}${'e'.repeat(40)}`,
  anthropic: `sk${'-ant-'}${'f'.repeat(40)}`,
  aws: `AK${'IA'}${'ABCDEFGH12345678'}`,
};

// ================================================================ 1. Regeln: Treffer UND Nicht-Treffer
const urteil = (befehl, trocken) => pruefeBash(befehl, trocken);
const verbietet = (befehl, trocken) => typeof urteil(befehl, trocken)?.deny === 'string';
const grundZu = (befehl, trocken) => urteil(befehl, trocken)?.deny ?? '';

const FORCE_TREFFER = ['git push --force origin x', 'git push -f origin x', 'git push origin +main', 'git push --force-with-lease origin x',
  'git push --force-if-includes', 'git -C /repo push --force', 'git -c user.name=x push -f', 'git --no-pager push -f', 'cd r && git push -f origin x', 'git push origin HEAD --force'];
const FORCE_KEIN_TREFFER = ['git push -u origin claude/luxestyle-projektor-2026-10-25', 'git push origin HEAD:refs/heads/neu', 'LUXE_FORCE_OK=1 git push --force origin x',
  'git push --follow-tags', 'legit push -f', 'git pull --force', 'git fetch -f', 'git push origin feature-f', 'git -C /repo push origin x', 'git log --oneline -f'];
for (const c of FORCE_TREFFER) ist(`Force-Push gesperrt: ${c}`, [verbietet(c), grundZu(c).includes('Force-Push')], [true, true]);
for (const c of FORCE_KEIN_TREFFER) ist(`kein Force-Push: ${c}`, verbietet(c), false);

const PKILL_TREFFER = ['pkill -f laufen.py', 'sleep 1; pkill node', 'killall node', 'sudo pkill -9 x', 'ls | xargs pkill', '(pkill x)', 'ps aux | pkill -f x', 'echo ok && killall node', 'x=$(pkill y)', '{ pkill z; }'];
const PKILL_KEIN_TREFFER = ['pgrep -f "[l]aufen.py"', 'kill 1234', 'LUXE_KILL_OK=1 pkill -f x', 'mypkill x', 'git commit -m "pkill ist verboten"', 'echo "killall"',
  'rg pkill automation', 'grep -rn killall .', 'ps aux | grep pkill', 'echo killall fertig', 'git grep pkill', 'sed -n 1,5p pkill.txt'];
for (const c of PKILL_TREFFER) ist(`pkill/killall gesperrt: ${c}`, [verbietet(c), grundZu(c).includes('LUXE_KILL_OK=1')], [true, true]);
for (const c of PKILL_KEIN_TREFFER) ist(`kein pkill-Treffer: ${c}`, verbietet(c), false);

const ADD_TREFFER = ['git add -A', 'git add .', 'git add . && git commit -m x', 'git add --all', 'git -C /r add -A', 'git add ./', 'git add *', 'git add -A;git status', 'git add -- .'];
const ADD_KEIN_TREFFER = ['git add automation/x.mjs', 'git add .gitignore', 'git add ./dropship/a.md', 'git add -u automation', 'LUXE_ADD_OK=1 git add -A', 'git adder -A', 'legit add -A', 'git commit -m "git add -A war schuld"', "git commit -m 'git add .'"];
for (const c of ADD_TREFFER) ist(`git add (alles) gesperrt: ${c}`, [verbietet(c), grundZu(c).includes('LUXE_ADD_OK=1')], [true, true]);
for (const c of ADD_KEIN_TREFFER) ist(`kein git-add-Treffer: ${c}`, verbietet(c), false);

const SOCIAL_TREFFER = ['touch dropship/_SOCIAL_STOPP', 'echo x > dropship/_SOCIAL_STOPP', 'cp a dropship/_SOCIAL_STOPP', 'tee dropship/_SOCIAL_STOPP < a',
  'touch "dropship/_SOCIAL_STOPP"', "touch 'dropship/_SOCIAL_STOPP'", 'echo x >> dropship/_SOCIAL_STOPP', 'mv /tmp/a dropship/_SOCIAL_STOPP', 'git mv old dropship/_SOCIAL_STOPP'];
const SOCIAL_KEIN_TREFFER = ['rm -f dropship/_SOCIAL_STOPP', 'ls dropship/_SOCIAL_STOPP', 'test -f dropship/_SOCIAL_STOPP', 'touch docs/_SOCIAL_STOPP_notes.md', 'touch dropship/my_SOCIAL_STOPP',
  'touch dropship/_SOCIAL_STOPP.bak', 'git commit -m "touch dropship/_SOCIAL_STOPP"', 'cat dropship/_SOCIAL_STOPP', 'echo "dropship/_SOCIAL_STOPP anlegen verboten" > notiz.txt'];
for (const c of SOCIAL_TREFFER) ist(`_SOCIAL_STOPP nie neu: ${c}`, [verbietet(c), grundZu(c).includes('Besitzer')], [true, true]);
for (const c of SOCIAL_KEIN_TREFFER) ist(`_SOCIAL_STOPP kein Treffer: ${c}`, verbietet(c), false);

// LIVE=1 erst nach einem Trockenlauf desselben Skripts
const LIVE_SEO = 'LIVE=1 node automation/seo-optimizer.mjs';
ist('LIVE=1 ohne Trockenlauf gesperrt, Grund nennt Trockenlauf und Ausweg', [verbietet(LIVE_SEO), grundZu(LIVE_SEO).includes('Trockenlauf'), grundZu(LIVE_SEO).includes('LUXE_LIVE_OK=1')], [true, true, true]);
ist('LIVE=1 nach Trockenlauf DESSELBEN Skripts erlaubt', urteil(LIVE_SEO, ['automation/seo-optimizer.mjs']), undefined);
ist('Trockenlauf eines ANDEREN Skripts reicht nicht', verbietet(LIVE_SEO, ['automation/cross_sell.mjs']), true);
ist('LUXE_LIVE_OK=1 ist der Ausweg', urteil('LUXE_LIVE_OK=1 LIVE=1 node automation/price_guard.mjs'), undefined);
ist('export LIVE=1; node … zählt als scharf (Abweichung zum Claude-Mod)', verbietet('export LIVE=1; node automation/x.mjs'), true);
ist('LIVE=1 mit && und Klammer zählt als scharf', [verbietet('LIVE=1&&node automation/x.mjs'), verbietet('(LIVE=1) node automation/x.mjs')], [true, true]);
ist('LIVE=1 mit anderem Pfad zum selben Skript gilt als dasselbe Skript', [urteil('LIVE=1 node ./automation/x.mjs', ['automation/x.mjs']), urteil('LIVE=1 node /home/u/repo/automation/x.mjs', ['automation/x.mjs'])], [undefined, undefined]);
ist('LIVE=1 ohne erkennbares Skript wird nicht geraten', urteil('LIVE=1 node -e "1"'), undefined);
ist('NOLIVE=1 ist nicht LIVE=1 (Wortgrenze davor)', urteil('NOLIVE=1 node automation/x.mjs'), { merke: 'automation/x.mjs' });
ist('LIVE=1 in einer Commit-Nachricht zählt nicht', urteil('git commit -m "LIVE=1 node automation/x.mjs"'), undefined);
ist('Trockenlauf wird gemerkt', urteil('node automation/a.mjs'), { merke: 'automation/a.mjs' });
ist('Trockenlauf mit DRY_RUN=1 wird gemerkt', urteil('DRY_RUN=1 node automation/seo-optimizer.mjs'), { merke: 'automation/seo-optimizer.mjs' });
ist('python- und bash-Skripte werden gemerkt', [urteil('python3 dropship/x.py'), urteil('bash dropship/x.sh')], [{ merke: 'dropship/x.py' }, { merke: 'dropship/x.sh' }]);
ist('schon gemerktes Skript wird nicht erneut gemerkt', urteil('node automation/a.mjs', ['automation/a.mjs']), undefined);
ist('ohne Starter (cat) kein Trockenlauf', urteil('cat automation/a.mjs'), undefined);
ist('node --check ist kein Trockenlauf (das Skript läuft nie)', urteil('node --check automation/a.mjs'), undefined);
ist('bash -n und py_compile sind kein Trockenlauf', [urteil('bash -n dropship/x.sh'), urteil('python3 -m py_compile automation/x.py')], [undefined, undefined]);
ist('-n als Skriptargument ist weiter ein Trockenlauf', urteil('node automation/a.mjs -n 5'), { merke: 'automation/a.mjs' });
ist('Befehl ohne Skript und ohne Regel: nichts', [urteil('ls -la'), urteil(''), urteil(undefined)], [undefined, undefined, undefined]);
ist('trocken darf auch ein Set sein', urteil(LIVE_SEO, new Set(['automation/seo-optimizer.mjs'])), undefined);
{
  const t0 = Date.now();
  const ergebnisse = [pruefeBash('git ' + '-C '.repeat(80) + 'x'), pruefeBash('git ' + '-c a=b '.repeat(80) + 'push'), pruefeBash('git ' + '-C a '.repeat(60) + 'push --force')];
  ist('Regex: viele git-Optionen hintereinander brauchen keine Ewigkeit (kein exponentielles Zurücksetzen)', [Date.now() - t0 < 1500, ergebnisse[0], ergebnisse[1], typeof ergebnisse[2]?.deny], [true, undefined, undefined, 'string']);
}
ist('git -C ohne Wert und git -c mit Wert', [verbietet('git -C push --force'), verbietet('git -c a=b push --force'), verbietet('git -C /r -c a=b push -f')], [false, true, true]);
ist('Reihenfolge der Regeln: Force-Push vor LIVE', grundZu('git push -f && LIVE=1 node automation/x.mjs').includes('Force-Push'), true);

// ohneText: Zitate und Heredocs unsichtbar
ist('ohneText blendet Anführungszeichen aus', [ohneText('git commit -m "kein git push --force mehr"'), ohneText("echo 'git add -A'")], ['git commit -m ""', "echo ''"]);
ist('ohneText blendet Heredoc-Körper aus', ohneText("cat <<'EOF'\nkein git push --force\nEOF\necho fertig").includes('push'), false);
ist('ohneText: maskiertes Anführungszeichen im Zitat bleibt im Zitat', ohneText('echo "a \\" git push -f" ; ls'), 'echo "" ; ls');
ist('ohneText verträgt undefined', ohneText(undefined), '');
ist('ohneTextAusserPfaden: ein Wort bleibt sichtbar, Sätze nicht', [ohneTextAusserPfaden('touch "a/b"'), ohneTextAusserPfaden('git commit -m "a b"')], ['touch  a/b ', 'git commit -m ""']);
ist('umgebungsAnteile: LIVE nur ausserhalb von Zitaten, Auswege überall', [umgebungsAnteile('LIVE=1 LUXE_FORCE_OK=1 bash -c "x"'), umgebungsAnteile('git commit -m "LIVE=1"'), umgebungsAnteile('ls')], [['LIVE=1', 'LUXE_FORCE_OK=1'], [], []]);
ist('Auswege sind genau vier', AUSWEGE, ['LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK']);

// ================================================================ 2. Geheimnisse
const NAMEN_CLAUDE = ['Shopify-Token (shpat_/shpss_)', 'Stripe-Schlüssel (sk_live_/rk_live_)', 'Groq-Schlüssel (gsk_)', 'Google-API-Schlüssel (AIza)', 'GitHub-Token (ghp_/gho_/…)', 'GitHub-Token (github_pat_)', 'Slack-Token (xox…)', 'privater Schlüssel (PEM)'];
ist('GEHEIMNISSE: die acht Muster des Claude-Mods in gleicher Reihenfolge, dazu zwei', [GEHEIMNISSE.slice(0, 8).map(([n]) => n), GEHEIMNISSE.length], [NAMEN_CLAUDE, 10]);
const GEHEIM_TREFFER = [['shopify', 'Shopify'], ['shopifyKey', 'Shopify'], ['stripe', 'Stripe'], ['stripeRestricted', 'Stripe'], ['groq', 'Groq'], ['google', 'Google'], ['github', 'GitHub-Token (ghp_'],
  ['githubPat', 'github_pat_'], ['slack', 'Slack'], ['pem', 'PEM'], ['openai', 'sk-proj-'], ['anthropic', 'sk-proj-'], ['aws', 'AKIA']];
for (const [schluessel, teil] of GEHEIM_TREFFER) {
  const u = pruefeInhalt(`const t = "${S[schluessel]}"`);
  ist(`Geheimnis erkannt: ${schluessel}`, [typeof u?.deny, u?.deny.includes(teil), u?.deny.includes('luxe-geheim-ok')], ['string', true, true]);
}
const GEHEIM_KEIN_TREFFER = ['Token heisst shpat_… und ist 38 Zeichen lang', `shp${'at_'}${HEX32.slice(1)}`, `sk${'_live_'}kurz`, `gh${'p_'}kurz`, 'AKIA' + 'KURZ', 'ein ganz normaler Satz', 'sk-learn ist ein Paket', `desk-${'proj-'}${'e'.repeat(40)}`, '', undefined];
for (const t of GEHEIM_KEIN_TREFFER) ist(`kein Geheimnis: ${String(t).slice(0, 40)}`, pruefeInhalt(t), undefined);
ist('Marker luxe-geheim-ok im Text erlaubt Testwerte', pruefeInhalt(`// luxe-geheim-ok\nconst t="${S.shopify}"`), undefined);
ist('Marker im sichtbaren Umfeld einer Datei erlaubt Testwerte', [pruefeInhalt(`t="${S.shopify}"`, '// luxe-geheim-ok'), typeof pruefeInhalt(`t="${S.shopify}"`, 'anderer Kontext')?.deny], [undefined, 'string']);
ist('pruefePfad: Treffer', ['dropship/_SOCIAL_STOPP', '/repo/dropship/_SOCIAL_STOPP', '_SOCIAL_STOPP', 'C:\\repo\\dropship\\_SOCIAL_STOPP', './dropship/_SOCIAL_STOPP'].map(p => typeof pruefePfad(p)?.deny), Array(5).fill('string'));
ist('pruefePfad: Nicht-Treffer', ['docs/_SOCIAL_STOPP_notes.md', 'dropship/my_SOCIAL_STOPP', 'dropship/_SOCIAL_STOPP.bak', 'dropship/', '', undefined, 'dropship/_SOCIAL_STOPP/inner.txt'].map(p => pruefePfad(p)), Array(7).fill(undefined));

// ================================================================ 3. Hilfen der Form
ist('befehlAusListe: einfache Argumente bleiben, Leerzeichen/Sonderzeichen werden zitiert', [
  befehlAusListe(['git', 'push', '--force', 'origin', '+main']),
  befehlAusListe(['git', 'commit', '-m', 'git push --force']),
  befehlAusListe(['echo', "it's"]),
  befehlAusListe(['echo', '']),
  befehlAusListe(['git', 'add', '*']),
  befehlAusListe(['a', 'b;c']),
], ['git push --force origin +main', "git commit -m 'git push --force'", 'echo "it\'s"', "echo ''", 'git add *', "a 'b;c'"]);
ist('entpacke: bash -lc, sh -c, eval, /bin/bash und zwei Ebenen', [
  entpacke('bash -lc "git push -f"'),
  entpacke("sh -c 'pkill x'"),
  entpacke('eval "git add -A"'),
  entpacke('/bin/bash -c "ls"'),
  entpacke("bash -c 'bash -c \"git push -f\"'"),
], [
  ['bash -lc "git push -f"', 'git push -f'],
  ["sh -c 'pkill x'", 'pkill x'],
  ['eval "git add -A"', 'git add -A'],
  ['/bin/bash -c "ls"', 'ls'],
  ["bash -c 'bash -c \"git push -f\"'", 'bash -c "git push -f"', 'git push -f'],
]);
ist('entpacke: Anführungszeichen-Escapes im Skript werden aufgelöst', entpacke('bash -c "echo \\"a\\" && git push -f"')[1], 'echo "a" && git push -f');
ist('entpacke: Zitat, das bash -c nur NENNT, wird nicht ausgepackt', [
  entpacke('git commit -m "bash -c \'git push -f\'"'),
  entpacke("cat <<'EOF'\nbash -c \"git push -f\"\nEOF"),
  entpacke('echo ok # bash -c "git push -f"'),
], [['git commit -m "bash -c \'git push -f\'"'], ["cat <<'EOF'\nbash -c \"git push -f\"\nEOF"], ['echo ok # bash -c "git push -f"']]);
ist('entpacke: LIVE=1 und Auswege des Aussen-Befehls gelten für das Skript', [
  entpacke('LIVE=1 bash -lc "node automation/a.mjs"')[1],
  entpacke('LUXE_FORCE_OK=1 sh -c "git push -f"')[1],
  entpacke('bash -c "node automation/a.mjs"')[1],
], ['LIVE=1 node automation/a.mjs', 'LUXE_FORCE_OK=1 git push -f', 'node automation/a.mjs']);
ist('entpacke: PowerShell und cmd', [entpacke('powershell -Command "git push -f"')[1], entpacke('pwsh -c "git push -f"')[1], entpacke('cmd /c "git push -f"')[1]], ['git push -f', 'git push -f', 'git push -f']);
ist('entpacke: offenes Zitat und leerer Befehl werfen nicht', [entpacke('bash -c "git push -f').length, entpacke('').length, entpacke(undefined).length], [1, 1, 1]);
ist('heredocTexte: nur Körper, die in eine Datei geschrieben werden', [
  heredocTexte("cat > a.txt <<'EOF'\nINHALT\nEOF"),
  heredocTexte("cat <<EOF > a.txt\nINHALT\nEOF"),
  heredocTexte("tee a.txt <<'EOF'\nINHALT\nEOF"),
  heredocTexte("cat <<'EOF'\nINHALT\nEOF"),
  heredocTexte("node - <<'EOF'\nINHALT\nEOF"),
  heredocTexte("cat <<'EOF' 2>&1\nINHALT\nEOF"),
], [['INHALT'], ['INHALT'], ['INHALT'], [], [], []]);

// Patch lesen
const patch = (...zeilen) => ['*** Begin Patch', ...zeilen, '*** End Patch'].join('\n');
const P = liesPatch(patch('*** Add File: neu/a.txt', '+eins', '+zwei', '*** Update File: alt/b.md', '@@ kopf', ' kontext', '-entfernt', '+hinzu', '*** Move to: alt/c.md', '*** Delete File: weg.txt', '-x'));
ist('liesPatch: Dateien, Arten und Pfade', P.map(d => [d.art, d.pfad]), [['neu', 'neu/a.txt'], ['aendern', 'alt/b.md'], ['ziel', 'alt/c.md'], ['loeschen', 'weg.txt']]);
ist('liesPatch: nur Hinzugefügtes zählt als hinzu, Kontext nur im Umfeld, Entferntes nirgends', [P[0].hinzu, P[1].hinzu, P[1].umfeld, P[2].hinzu, P[3].hinzu], [['eins', 'zwei'], ['hinzu'], ['kontext', 'hinzu'], [], []]);
ist('liesPatch: Zeilen mit Kopf-Aussehen, die mit + beginnen, sind Inhalt', liesPatch(patch('*** Add File: a', '+*** Add File: dropship/_SOCIAL_STOPP')).map(d => d.pfad), ['a']);
ist('liesPatch: Windows-Zeilenenden und fehlendes End Patch', [liesPatch('*** Begin Patch\r\n*** Add File: a\r\n+x\r\n')[0]?.hinzu, liesPatch('kein Patch').length, liesPatch(undefined).length], [['x'], 0, 0]);
ist('liesPatch: Text vor dem Patch (Heredoc-Kopf) stört nicht', liesPatch("apply_patch <<'EOF'\n*** Begin Patch\n*** Add File: x\n+y\n*** End Patch\nEOF").map(d => d.pfad), ['x']);

// JavaScript des Code-Modus
const befehleAusJs = q => liesJs(q).befehle;
ist('liesJs: cmd als Zeichenkette in doppelten, einfachen und Backtick-Anführungszeichen', [
  befehleAusJs('await tools.exec_command({ cmd: "git push --force", workdir: "/r" })'),
  befehleAusJs("await tools.exec_command({ cmd: 'pkill x' })"),
  befehleAusJs('await tools.exec_command({ cmd: `git add -A` })'),
], [['git push --force'], ['pkill x'], ['git add -A']]);
ist('liesJs: Template mit ${…}, + -Kette, Variable, Kurzform, Liste', [
  befehleAusJs('tools.exec_command({ cmd: `git add ${datei}` })'),
  befehleAusJs('tools.exec_command({ cmd: "git push " + "--force" })'),
  befehleAusJs('const c = "git push -f";\nawait tools.exec_command({ cmd: c });'),
  befehleAusJs('const cmd = "pkill x"; await tools.exec_command({ cmd });'),
  befehleAusJs('tools.shell({ command: ["git", "push", "--force"] })'),
], [['git add X'], ['git push --force'], ['git push -f'], ['pkill x'], ['git push --force']]);
ist('liesJs: Aufrufe mit der Zeichenkette als erstem Argument', [
  befehleAusJs('await exec_command("pkill -f x")'),
  befehleAusJs("execSync('git add .')"),
  befehleAusJs("spawnSync('git', ['add', '.'])"),
  befehleAusJs('spawn("git", ["push", "--force"], { cwd: "/r" })'),
], [['pkill -f x'], ['git add .'], ['git add .'], ['git push --force']]);
ist('liesJs: Zeichenketten, die kein Befehl sind, bleiben unbeachtet', [
  befehleAusJs('console.log("git push --force ist verboten"); text("pkill")'),
  befehleAusJs('const meldung = "git add -A"; console.log(meldung)'),
], [[], []]);
ist('liesJs: Kommentare mit Apostroph und Escapes', [
  befehleAusJs("// don't panic\n/* it's */ tools.exec_command({ cmd: \"ls\" })"),
  befehleAusJs('tools.exec_command({ cmd: "echo \\"hi\\"\\n" })'),
  befehleAusJs('tools.exec_command({ cmd: "a\\u0062c\\x64" })'),
], [['ls'], ['echo "hi"\n'], ['abcd']]);
ist('liesJs: JSON-artige Schlüssel in Anführungszeichen', befehleAusJs('tools.exec_command({ "cmd": "git push -f" })'), ['git push -f']);
ist('liesJs: kaputter Quelltext wirft nie (ein offenes Literal gilt bis zum Ende)', [liesJs('tools.exec_command({ cmd: "offen').befehle, liesJs('{{{{ ] ) ((').befehle, liesJs(undefined).befehle], [['offen'], [], []]);
{
  const j = liesJs('fs.writeFileSync("dropship/a.txt", "inhalt");\ntools.write({ path: "b.txt", content: "mehr" });\ntools.read({ path: "nur-lesen.txt" });');
  ist('liesJs: Pfad + Inhalt gehören zusammen, ein Pfad allein nicht', [j.pfade, j.texte.map(t => t.text)], [['dropship/a.txt', 'b.txt'], ['inhalt', 'mehr']]);
}
ist('liesJs: Patch als Literal, auch zusammengesetzt', [
  liesJs('tools.apply_patch({ input: "*** Begin Patch\\n*** Add File: a\\n+x\\n*** End Patch" })').patches.length,
  liesJs('tools.apply_patch("*** Begin Patch\\n" + "*** Add File: a\\n+x\\n*** End Patch")').patches.length,
  liesJs('const p = `*** Begin Patch\n*** Add File: a\n+x\n*** End Patch`; tools.apply_patch(p)').patches.length,
], [1, 1, 1]);

// ================================================================ 4. Formen der Eingabe (ziehePruefgut)
const gut = ti => { const g = ziehePruefgut(ti); return { b: g.befehle, p: g.pfade, t: g.texte.map(x => x.text), bekannt: g.bekannt, formen: g.formen }; };
const MIT_PATCH = patch('*** Add File: dropship/neu.md', '+hallo', '*** Update File: a.md', ' ctx', '-alt', '+neu');
const FORMEN = [
  ['cmd (exec_command)', { cmd: 'ls -la', workdir: '/r', yield_time_ms: 1000 }, { b: ['ls -la'], p: [], t: [], bekannt: true }],
  ['command als Text (shell_command / Bash)', { command: 'ls', description: 'x' }, { b: ['ls'], bekannt: true }],
  ['script', { script: 'ls' }, { b: ['ls'], bekannt: true }],
  ['command als Liste (shell)', { command: ['git', 'status'], workdir: '/r', timeout_ms: 5000 }, { b: ['git status'], bekannt: true }],
  ['bash -lc als Liste: Hülle und Inhalt', { command: ['bash', '-lc', 'git status && ls'] }, { b: ["bash -lc 'git status && ls'", 'git status && ls'] }],
  ['verschachtelt (local_shell action.command)', { action: { type: 'exec', command: ['git', 'status'] } }, { b: ['git status'] }],
  ['Liste als ganze Eingabe', ['git', 'status'], { b: ['git status'] }],
  ['Zeichenkette als ganze Eingabe', 'git status', { b: ['git status'] }],
  ['command + args (MCP-Shell)', { command: 'git', args: ['push', '--force'] }, { b: ['git push --force'] }],
  ['Argument mit Leerzeichen wird zitiert', { command: ['git', 'commit', '-m', 'a b'] }, { b: ["git commit -m 'a b'"] }],
  ['JSON als Zeichenkette', '{"cmd":"git push -f"}', { b: ['git push -f'] }],
  ['Patch als ganze Eingabe', MIT_PATCH, { b: [], p: ['dropship/neu.md', 'a.md'], t: ['hallo', 'neu'], bekannt: true }],
  ['Patch im Feld command (apply_patch)', { command: MIT_PATCH }, { b: [], p: ['dropship/neu.md', 'a.md'], t: ['hallo', 'neu'] }],
  ['Patch im Feld input', { input: MIT_PATCH }, { p: ['dropship/neu.md', 'a.md'], t: ['hallo', 'neu'] }],
  ['Patch im Feld patch', { patch: MIT_PATCH }, { p: ['dropship/neu.md', 'a.md'] }],
  ['Patch in beliebigem Feld', { eingabe: { x: MIT_PATCH } }, { p: ['dropship/neu.md', 'a.md'] }],
  ['Patch als Liste [apply_patch, Patch]', { command: ['apply_patch', MIT_PATCH] }, { p: ['dropship/neu.md', 'a.md'], t: ['hallo', 'neu'] }],
  ['Heredoc schreibt eine Datei, die Patch-Zeilen nur nennt: kein Patch', { cmd: `cat > doc.md <<'EOF'\n${patch('*** Add File: dropship/_SOCIAL_STOPP', '+x')}\nEOF` }, { p: [], bekannt: true }],
  ['Text in fremdem Feld, der Patch-Zeilen nur enthält, ist keiner', { beschreibung: `Doku:\n${patch('*** Add File: dropship/_SOCIAL_STOPP', '+x')}` }, { p: [], bekannt: false }],
  ['Patch in Heredoc: Befehl UND Patch', { cmd: `apply_patch <<'EOF'\n${patch('*** Add File: x.txt', '+hi')}\nEOF` }, { p: ['x.txt'], t: ['hi'] }],
  ['Write: Pfad + Inhalt', { file_path: '/r/a.txt', content: 'inhalt' }, { b: [], p: ['/r/a.txt'], t: ['inhalt'], bekannt: true }],
  ['Edit: old_string wird nie geprüft', { file_path: '/r/a.txt', old_string: 'ALT', new_string: 'NEU' }, { p: ['/r/a.txt'], t: ['NEU'] }],
  ['Pfad ohne Inhalt (lesend): bekannt, nichts zu prüfen', { path: 'dropship/_SOCIAL_STOPP' }, { p: [], t: [], bekannt: true }],
  ['Inhalt ohne Pfad', { text: 'Hallo', channel: 'c' }, { p: [], t: ['Hallo'], bekannt: true }],
  ['MCP create_or_update_file', { path: 'a.mjs', content: 'x', message: 'm', branch: 'b' }, { p: ['a.mjs'], t: ['x'] }],
  ['MCP push_files (Liste von Dateien)', { files: [{ path: 'a.mjs', content: 'x' }, { path: 'b.mjs', content: 'y' }] }, { p: ['a.mjs', 'b.mjs'], t: ['x', 'y'] }],
  ['Inhalt als Zeilenliste', { path: 'a.txt', content: ['eins', 'zwei'] }, { p: ['a.txt'], t: ['eins\nzwei'] }],
  ['leerer Inhalt zählt als Schreiben', { file_path: 'dropship/_SOCIAL_STOPP', content: '' }, { p: ['dropship/_SOCIAL_STOPP'], t: [''] }],
  ['JavaScript als ganze Eingabe (exec)', 'const r = await tools.exec_command({ cmd: "git push --force origin x", workdir: "/r" });\ntext(r.output);', { b: ['git push --force origin x'], bekannt: true, formen: ['js'] }],
  ['JavaScript im Feld code', { code: 'await tools.exec_command({ cmd: "pkill x" })' }, { b: ['pkill x'] }],
  ['JavaScript im Feld input', { input: 'await tools.exec_command({ cmd: "pkill x" })' }, { b: ['pkill x'] }],
  ['JavaScript: bash -lc im Literal wird ausgepackt', 'await tools.exec_command({ cmd: "bash -lc \'git push -f\'" })', { b: ["bash -lc 'git push -f'", 'git push -f'] }],
  ['JavaScript: Heredoc-Datei im Literal', 'await tools.exec_command({ cmd: "cat > a.txt <<\'EOF\'\\nINHALT\\nEOF" })', { t: ['INHALT'] }],
  ['unbekannt: leeres Objekt', {}, { b: [], p: [], t: [], bekannt: false }],
  ['unbekannt: fremdes Feld', { query: '{ shop { name } }' }, { bekannt: false }],
  ['unbekannt: Beschreibung nennt einen Befehl nur', { description: 'git push --force' }, { b: [], bekannt: false }],
  ['unbekannt: null, Zahl, undefined, wahr', [null, 5, undefined, true].map(x => gut(x).bekannt), [false, false, false, false]],
];
for (const [name, ti, soll] of FORMEN) {
  if (Array.isArray(soll)) { ist(`Form ${name}`, soll, [false, false, false, false]); continue; }
  const ist_ = gut(ti);
  ist(`Form ${name}`, Object.fromEntries(Object.keys(soll).map(k => [k, ist_[k]])), soll);
}
ist('Form: zu tiefe Verschachtelung wird abgebrochen statt zu hängen', gut((function t(n) { return n ? { k: t(n - 1) } : { cmd: 'git push -f' }; })(30)).bekannt, false);

// ================================================================ 5. Der Hook im Prozess (Handler) für viele Werkzeugnamen
const zustand = neuerOrdner();
const ENV = { LUXE_CODEX_ZUSTAND: zustand };
let zaehler = 0;
const nenntAusweg = g => /LUXE_(?:FORCE|KILL|ADD|LIVE)_OK=1|luxe-geheim-ok|Einen Ausweg per Variable gibt es dafür nicht/.test(g ?? '');
async function lauf(werkzeug, ti, extra = {}) {
  const e = eingabe('PreToolUse', { tool_name: werkzeug, tool_input: ti, session_id: `s-${++zaehler}`, ...extra });
  const eingabeFehler = gueltig(e, 'pre-tool-use.command.input');
  const aus = await leitplanken(e, extra.env ?? ENV);
  return { aus, eingabeFehler, grund: aus?.hookSpecificOutput?.permissionDecisionReason, e };
}
async function verboten(name, werkzeug, ti, teil, extra) {
  const r = await lauf(werkzeug, ti, extra);
  ist(`[${werkzeug}] ${name}: gesperrt, Eingabe und Ausgabe laut Schema gültig`, [r.eingabeFehler, r.aus?.hookSpecificOutput?.permissionDecision, r.aus ? gueltig(r.aus, 'pre-tool-use.command.output') : 'keine Ausgabe'], [[], 'deny', []]);
  ist(`[${werkzeug}] ${name}: Grund mit Präfix, Teiltext «${teil}» und Ausweg`, [r.grund?.startsWith(PRAEFIX), r.grund?.includes(teil), nenntAusweg(r.grund)], [true, true, true]);
  return r;
}
async function erlaubt(name, werkzeug, ti, extra) {
  const r = await lauf(werkzeug, ti, extra);
  ist(`[${werkzeug}] ${name}: durchgelassen (Eingabe gültig, keine Ausgabe)`, [r.eingabeFehler, r.aus], [[], undefined]);
  return r;
}
const JS_FORCE = 'const r = await tools.exec_command({ cmd: "git push --force origin x", workdir: "/r" });\ntext(r.output);';

await verboten('Force-Push als cmd', 'exec_command', { cmd: 'git push --force origin x', workdir: '/r', yield_time_ms: 1000 }, 'Force-Push');
await verboten('Force-Push als Argumentliste mit bash -lc', 'shell', { command: ['bash', '-lc', 'git push -f origin x'], workdir: '/r', timeout_ms: 5000 }, 'Force-Push');
await verboten('Force-Push als blosse Argumentliste', 'shell', { command: ['git', 'push', '--force', 'origin', 'x'] }, 'Force-Push');
await verboten('Force-Push mit +Branch', 'shell_command', { command: 'git push origin +main', login: true }, 'Force-Push');
await verboten('Force-Push in local_shell', 'local_shell', { action: { type: 'exec', command: ['git', 'push', '--force-with-lease'] } }, 'Force-Push');
await verboten('Force-Push (Claude-Name Bash)', 'Bash', { command: 'git push --force', description: 'x' }, 'Force-Push');
await verboten('Force-Push in JavaScript (exec, ganze Eingabe)', 'exec', JS_FORCE, 'Force-Push');
await verboten('Force-Push in JavaScript (Feld code)', 'exec', { code: JS_FORCE }, 'Force-Push');
await verboten('Force-Push in JavaScript (Feld input)', 'exec', { input: JS_FORCE }, 'Force-Push');
await verboten('Force-Push unter git -C', 'unbekannter_name', { cmd: 'git -C /r push --force' }, 'Force-Push');
await verboten('Force-Push in verschachteltem bash -c', 'exec_command', { cmd: 'sudo bash -lc "git push -f"' }, 'Force-Push');
await verboten('pkill', 'exec_command', { cmd: 'pkill -f laufen.py' }, 'pkill/killall');
await verboten('killall als Liste', 'shell', { command: ['killall', 'node'] }, 'pkill/killall');
await verboten('pkill in JavaScript', 'exec', 'await tools.exec_command({ cmd: `sleep 1; pkill node` });', 'pkill/killall');
await verboten('git add -A', 'exec_command', { cmd: 'git add -A' }, 'git add -A');
await verboten('git add . als Liste', 'shell', { command: ['git', 'add', '.'] }, 'git add -A');
await verboten('git add . in JavaScript (spawnSync)', 'exec', "spawnSync('git', ['add', '.'])", 'git add -A');
await verboten('git add --all in bash -lc', 'shell', { command: ['bash', '-lc', 'git add --all && git status'] }, 'git add -A');
await verboten('_SOCIAL_STOPP per touch', 'exec_command', { cmd: 'touch dropship/_SOCIAL_STOPP' }, '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per Umleitung in bash -lc', 'shell', { command: ['bash', '-lc', 'echo stop > dropship/_SOCIAL_STOPP'] }, '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per Patch (Add File)', 'apply_patch', patch('*** Add File: dropship/_SOCIAL_STOPP', '+x'), '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per Patch im Feld command', 'apply_patch', { command: patch('*** Add File: dropship/_SOCIAL_STOPP', '+x') }, '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per Patch (Move to)', 'apply_patch', patch('*** Update File: dropship/a.txt', '*** Move to: dropship/_SOCIAL_STOPP', '@@', '+x'), '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per Write', 'Write', { file_path: '/repo/dropship/_SOCIAL_STOPP', content: 'x' }, '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per leerem Write', 'write_file', { path: 'dropship/_SOCIAL_STOPP', content: '' }, '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per MCP-Dateiwerkzeug', 'mcp__github__create_or_update_file', { path: 'dropship/_SOCIAL_STOPP', content: 'x', message: 'm', branch: 'b' }, '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per JavaScript-Dateischreiben', 'exec', 'fs.writeFileSync("dropship/_SOCIAL_STOPP", "x")', '_SOCIAL_STOPP');
await verboten('_SOCIAL_STOPP per Edit', 'Edit', { file_path: 'dropship/_SOCIAL_STOPP', old_string: 'a', new_string: 'b' }, '_SOCIAL_STOPP');
await verboten('LIVE=1 ohne Trockenlauf', 'exec_command', { cmd: 'LIVE=1 node automation/seo-optimizer.mjs' }, 'Trockenlauf');
await verboten('LIVE=1 in bash -lc ohne Trockenlauf', 'shell', { command: ['bash', '-lc', 'LIVE=1 node automation/seo-optimizer.mjs'] }, 'Trockenlauf');
await verboten('LIVE=1 ausserhalb von bash -lc erbt in die Hülle', 'shell', { command: ['env', 'LIVE=1', 'bash', '-lc', 'node automation/seo-optimizer.mjs'] }, 'Trockenlauf');
await verboten('LIVE=1 in JavaScript', 'exec', 'await tools.exec_command({ cmd: "LIVE=1 node automation/seo-optimizer.mjs" })', 'Trockenlauf');
await verboten('LIVE=1 per export', 'exec_command', { cmd: 'export LIVE=1; node automation/seo-optimizer.mjs' }, 'Trockenlauf');

// Auswege und Zitate: durchgelassen
await erlaubt('LUXE_FORCE_OK=1', 'Bash', { command: 'LUXE_FORCE_OK=1 git push --force origin x' });
await erlaubt('LUXE_FORCE_OK=1 vor bash -lc', 'exec_command', { cmd: 'LUXE_FORCE_OK=1 bash -lc "git push --force"' });
await erlaubt('LUXE_FORCE_OK=1 in der Hülle', 'shell', { command: ['bash', '-lc', 'LUXE_FORCE_OK=1 git push -f'] });
await erlaubt('LUXE_FORCE_OK=1 über env', 'shell', { command: ['env', 'LUXE_FORCE_OK=1', 'bash', '-lc', 'git push -f'] });
await erlaubt('LUXE_KILL_OK=1', 'exec_command', { cmd: 'LUXE_KILL_OK=1 pkill -f x' });
await erlaubt('LUXE_ADD_OK=1', 'exec_command', { cmd: 'LUXE_ADD_OK=1 git add -A' });
await erlaubt('LUXE_LIVE_OK=1', 'exec_command', { cmd: 'LUXE_LIVE_OK=1 LIVE=1 node automation/price_guard.mjs' });
await erlaubt('Ausweg gilt nur für seine Regel: LUXE_KILL_OK schützt keinen Force-Push', 'exec_command', { cmd: 'echo ok' });
{
  const r = await lauf('exec_command', { cmd: 'LUXE_KILL_OK=1 git push --force' });
  ist('LUXE_KILL_OK=1 hebt den Force-Push nicht auf', r.grund?.includes('Force-Push'), true);
}
await erlaubt('Commit-Nachricht nennt Force-Push nur', 'shell', { command: ['git', 'commit', '-m', 'kein git push --force mehr'] });
await erlaubt('Commit-Nachricht als Text', 'exec_command', { cmd: 'git commit -m "kein git push --force und kein pkill -f"' });
await erlaubt('Commit-Nachricht nennt git add -A nur', 'exec_command', { cmd: "git commit -m 'git add -A war schuld'" });
await erlaubt('Commit-Nachricht per Heredoc', 'exec_command', { cmd: 'git commit -m "$(cat <<\'EOF\'\nkein git push --force und kein pkill -f mehr\nEOF\n)"' });
await erlaubt('Commit-Nachricht nennt bash -c nur', 'exec_command', { cmd: 'git commit -m "bash -c \'git push -f\'"' });
await erlaubt('Commit-Nachricht nennt _SOCIAL_STOPP nur', 'shell', { command: ['git', 'commit', '-m', 'touch dropship/_SOCIAL_STOPP verboten'] });
await erlaubt('JavaScript gibt einen Befehl nur aus', 'exec', 'console.log("git push --force ist verboten"); text("pkill und git add -A")');
await erlaubt('Patch ändert nur Text, der Befehle nennt', 'apply_patch', patch('*** Update File: CLAUDE.md', '@@', '+Nie git push --force und nie pkill -f.', '+Nie git add -A.'));
await erlaubt('Patch legt docs/_SOCIAL_STOPP_notes.md an', 'apply_patch', patch('*** Add File: docs/_SOCIAL_STOPP_notes.md', '+Notizen'));
await erlaubt('Patch löscht dropship/_SOCIAL_STOPP (Löschen ist erlaubt)', 'apply_patch', patch('*** Delete File: dropship/_SOCIAL_STOPP'));
await erlaubt('Befehl löscht dropship/_SOCIAL_STOPP', 'exec_command', { cmd: 'rm -f dropship/_SOCIAL_STOPP' });
await erlaubt('Lesen von dropship/_SOCIAL_STOPP über ein Lesewerkzeug (Pfad ohne Inhalt)', 'read_file', { path: 'dropship/_SOCIAL_STOPP' });
await erlaubt('Write mit leerem normalem Pfad-Inhalt', 'Write', { file_path: '/repo/notiz.md', content: '' });
await erlaubt('gewöhnlicher Befehl', 'exec_command', { cmd: 'git status --short && ls' });
await erlaubt('gewöhnlicher Push', 'shell', { command: ['git', 'push', '-u', 'origin', 'claude/luxestyle-codex-mods-2810'] });

// Geheimnisse in geschriebenem Text, in jeder Schreibform
await verboten('Geheimnis in Write', 'Write', { file_path: '/repo/a.mjs', content: `const t="${S.shopify}"` }, 'Shopify');
await verboten('Geheimnis in Edit (new_string)', 'Edit', { file_path: '/repo/a.mjs', old_string: 'x', new_string: `k=${S.stripe}` }, 'Stripe');
await verboten('Geheimnis in Patch (hinzugefügte Zeile)', 'apply_patch', patch('*** Add File: a.mjs', `+const t = "${S.groq}"`), 'Groq');
await verboten('Geheimnis in Patch (Update, hinzugefügt)', 'apply_patch', patch('*** Update File: a.mjs', '@@', ' alt', `+k = "${S.github}"`), 'GitHub');
await verboten('Geheimnis in Patch im Feld input', 'apply_patch', { input: patch('*** Add File: a.mjs', `+${S.slack}`) }, 'Slack');
await verboten('Geheimnis in Patch, Datei B hat den Marker nicht', 'apply_patch', patch('*** Add File: a.mjs', '+// luxe-geheim-ok', '+x', '*** Add File: b.mjs', `+t = "${S.openai}"`), 'sk-proj-');
await verboten('Geheimnis per Heredoc in Datei', 'exec_command', { cmd: `cat > a.mjs <<'EOF'\nconst t = "${S.aws}"\nEOF` }, 'AKIA');
await verboten('Geheimnis per Heredoc in bash -lc', 'shell', { command: ['bash', '-lc', `cat > a.mjs <<'EOF'\nconst t = "${S.google}"\nEOF`] }, 'Google');
await verboten('Geheimnis in JavaScript-Patch', 'exec', `tools.apply_patch({ input: "*** Begin Patch\\n*** Add File: a.mjs\\n+k=${S.shopifyKey}\\n*** End Patch" })`, 'Shopify');
await verboten('Geheimnis in JavaScript-Dateischreiben', 'exec', `fs.writeFileSync("a.mjs", "k=${S.githubPat}")`, 'github_pat_');
await verboten('Geheimnis in MCP-Dateiliste', 'mcp__github__push_files', { files: [{ path: 'a.mjs', content: `k=${S.anthropic}` }] }, 'sk-proj-');
await verboten('Geheimnis in Text ohne Pfad (Nachricht)', 'mcp__slack__send', { channel: 'c', text: `Schlüssel: ${S.pem}` }, 'PEM');
await erlaubt('Geheimnis nur in der entfernten Zeile (Löschen)', 'apply_patch', patch('*** Update File: a.mjs', '@@', `-const t = "${S.shopify}"`, '+const t = process.env.T'));
await erlaubt('Geheimnis nur in einer Kontextzeile', 'apply_patch', patch('*** Update File: a.mjs', '@@', ` const t = "${S.shopify}"`, '+const u = 1'));
await erlaubt('Geheimnis nur in old_string', 'Edit', { file_path: '/repo/a.mjs', old_string: `k=${S.stripe}`, new_string: 'k=process.env.K' });
await erlaubt('Geheimnis in gelöschter Datei', 'apply_patch', patch('*** Delete File: a.mjs', `-const t = "${S.shopify}"`));
await erlaubt('Marker luxe-geheim-ok im Text', 'Write', { file_path: '/repo/t.mjs', content: `// luxe-geheim-ok\nconst t="${S.shopify}"` });
await erlaubt('Marker im Patch derselben Datei', 'apply_patch', patch('*** Add File: t.mjs', '+// luxe-geheim-ok', `+const t = "${S.shopify}"`));
await erlaubt('Marker in der Kontextzeile des Patches', 'apply_patch', patch('*** Update File: t.mjs', '@@', ' // luxe-geheim-ok', `+const t = "${S.shopify}"`));
await erlaubt('Auslassung statt Wert', 'Write', { file_path: '/repo/a.md', content: 'Token heisst shpat_… und ist 38 Zeichen lang' });
await erlaubt('Heredoc nur zur Ausgabe (keine Datei)', 'exec_command', { cmd: `cat <<'EOF'\nk=${S.shopify}\nEOF` });
await erlaubt('Heredoc als Programm für node', 'exec_command', { cmd: `node - <<'EOF'\nconsole.log("${S.shopify}")\nEOF` });
await erlaubt('Geheimnis nur als Zitat im Befehl (kein Schreiben)', 'exec_command', { cmd: `echo "${S.shopify}"` });

// Unbekannte Formen: durchlassen; Lernprotokoll nur auf Wunsch
await erlaubt('leere Eingabe', 'irgendein_werkzeug', {});
await erlaubt('fremdes Feld', 'mcp__shopify__graphql_query', { query: '{ shop { name } }' });
await erlaubt('Beschreibung nennt einen Befehl nur', 'mcp__x__y', { description: 'git push --force' });
await erlaubt('Eingabe ist null', 'tool', null);
await erlaubt('Eingabe ist eine Zahl', 'tool', 7);
{
  const lernOrdner = neuerOrdner();
  const lernEnv = { LUXE_CODEX_ZUSTAND: lernOrdner, LUXE_CODEX_LERNEN: '1' };
  const gelesen = () => existsSync(join(lernOrdner, 'gesehen.jsonl')) ? readFileSync(join(lernOrdner, 'gesehen.jsonl'), 'utf8').trim().split('\n').map(z => JSON.parse(z)) : [];
  await lauf('mcp__shopify__graphql_query', { query: '{ shop { name } }' }, { env: lernEnv });
  const z = gelesen();
  ist('Lernprotokoll: unbekannte Form wird mit eigener Kennung und Werkzeugnamen festgehalten', [z.length, z[0]?.hook, z[0]?.werkzeug, z[0]?.form?.query], [1, 'leitplanken:unbekannte-form', 'mcp__shopify__graphql_query', '{ shop { name } }']);
  await lauf('exec_command', { cmd: 'ls' }, { env: lernEnv });
  ist('Lernprotokoll: bekannte Form schreibt von sich aus nichts', gelesen().length, 1);
  await lauf('mcp__shopify__graphql_query', { query: 'x' }, { env: ENV });
  ist('Lernprotokoll: ohne LUXE_CODEX_LERNEN=1 bleibt es leer', gelesen().length, 1);
}
{
  const r = await lauf('exec_command', { cmd: 'git push --force' }, { hook_event_name: 'PostToolUse' });
  ist('anderes Ereignis (PostToolUse) wird nie geprüft', r.aus, undefined);
}

// ================================================================ 6. Trockenläufe über mehrere Aufrufe einer Sitzung
{
  const sitz = 'sitzung-trocken';
  const e = (name, ti, s = sitz) => ({ ...eingabe('PreToolUse', { tool_name: name, tool_input: ti, session_id: s }) });
  const ordner = neuerOrdner();
  const env = { LUXE_CODEX_ZUSTAND: ordner };
  const live = { cmd: 'LIVE=1 node automation/seo-optimizer.mjs' };
  ist('Ablauf 1: LIVE=1 vor dem Trockenlauf gesperrt', (await leitplanken(e('exec_command', live), env))?.hookSpecificOutput?.permissionDecision, 'deny');
  ist('Ablauf 2: der Trockenlauf selbst erzeugt keine Ausgabe', await leitplanken(e('exec_command', { cmd: 'DRY_RUN=1 node automation/seo-optimizer.mjs' }), env), undefined);
  ist('Ablauf 3: das Skript steht in der Zustandsdatei', leseTrocken(env, sitz), ['automation/seo-optimizer.mjs']);
  ist('Ablauf 4: danach ist LIVE=1 in DERSELBEN Sitzung erlaubt', await leitplanken(e('exec_command', live), env), undefined);
  ist('Ablauf 5: auch als Argumentliste mit bash -lc', await leitplanken(e('shell', { command: ['bash', '-lc', live.cmd] }), env), undefined);
  ist('Ablauf 6: ein anderes Skript bleibt gesperrt', (await leitplanken(e('exec_command', { cmd: 'LIVE=1 node automation/price_guard.mjs' }), env))?.hookSpecificOutput?.permissionDecision, 'deny');
  ist('Ablauf 7: eine ANDERE Sitzung hat den Trockenlauf nicht gesehen', (await leitplanken(e('exec_command', live, 'andere-sitzung'), env))?.hookSpecificOutput?.permissionDecision, 'deny');
  await leitplanken(e('exec_command', { cmd: 'node automation/a.mjs && git push -f' }), env);
  ist('Ablauf 8: ein gesperrter Aufruf merkt nichts (er läuft nie)', leseTrocken(env, sitz).includes('automation/a.mjs'), false);
  await leitplanken(e('exec_command', { cmd: 'bash -lc "node automation/b.mjs"' }), env);
  ist('Ablauf 9: ein Trockenlauf in bash -lc wird gemerkt', leseTrocken(env, sitz).includes('automation/b.mjs'), true);
  await leitplanken(e('exec', 'await tools.exec_command({ cmd: "node automation/c.mjs" })'), env);
  ist('Ablauf 10: ein Trockenlauf in JavaScript wird gemerkt', leseTrocken(env, sitz).includes('automation/c.mjs'), true);
  await leitplanken(e('exec_command', { cmd: 'LIVE=1 bash -lc "node automation/d.mjs"' }), env);
  ist('Ablauf 11: ein scharfer Lauf in bash -lc wird NICHT als Trockenlauf gemerkt', leseTrocken(env, sitz).includes('automation/d.mjs'), false);
  await leitplanken(e('exec_command', { cmd: 'node automation/x.mjs' }), env);
  await leitplanken(e('exec_command', { cmd: 'node automation/x.mjs' }), env);
  ist('Ablauf 12: dasselbe Skript zweimal gemerkt steht einmal da', leseTrocken(env, sitz).filter(s => s === 'automation/x.mjs').length, 1);
}

// ================================================================ 7. Zustandsdatei: Dateiname, kaputt, parallel
{
  const ordner = neuerOrdner();
  const env = { LUXE_CODEX_ZUSTAND: ordner };
  ist('leseTrocken: fehlende Datei = nichts gesehen', leseTrocken(env, 'neu'), []);
  merkeTrocken(env, 'neu', ['automation/a.mjs', 'automation/b.mjs']);
  merkeTrocken(env, 'neu', ['automation/c.mjs']);
  ist('merkeTrocken hängt an (nichts geht verloren)', leseTrocken(env, 'neu'), ['automation/a.mjs', 'automation/b.mjs', 'automation/c.mjs']);
  merkeTrocken(env, 'neu', []);
  merkeTrocken(env, 'neu', ['', undefined]);
  ist('merkeTrocken: leere Liste und leere Einträge ändern nichts', leseTrocken(env, 'neu').length, 3);
  writeFileSync(trockenDatei(env, 'kaputt'), '{kaputt\n"automation/ok.mjs"\n[1,2]\n\n42\nnull\n"halb');
  ist('leseTrocken: kaputte Zeilen werden einzeln übersprungen, gültige zählen', leseTrocken(env, 'kaputt'), ['automation/ok.mjs']);
  writeFileSync(trockenDatei(env, 'binaer'), Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x0a, 0x22, 0x61, 0x22, 0x0a]));
  ist('leseTrocken: Binärmüll wirft nicht', leseTrocken(env, 'binaer'), ['a']);
  merkeTrocken(env, 'kaputt', ['automation/neu.mjs']);
  ist('merkeTrocken nach einer abgebrochenen Halbzeile: der neue Eintrag geht nicht in der Halbzeile unter', leseTrocken(env, 'kaputt').includes('automation/neu.mjs'), true);
  mkdirSync(trockenDatei(env, 'ordner'));
  ist('leseTrocken: ist die Zustandsdatei ein Ordner, ist es «nichts gesehen»', leseTrocken(env, 'ordner'), []);

  // Sitzungsnamen sind sichere Dateinamen
  const GEFAEHRLICH = ['../../etc/passwd', '..\\..\\x', '/abs/pfad', 'a/b', 'a b\n', 'nul\u0000byte', '.', '..', 'ü€', 'x'.repeat(500), '-rf'];
  for (const s of GEFAEHRLICH) {
    const d = trockenDatei(env, s);
    ist(`Sitzungsname «${JSON.stringify(s).slice(0, 24)}» bleibt im Zustandsordner`, [dirname(d), /^trocken-[A-Za-z0-9_-]+\.jsonl$/.test(basename(d)), basename(d).length < 100], [ordner, true, true]);
  }
  ist('Sitzungsnamen, die gleich aufgeräumt würden, bekommen verschiedene Dateien', sitzungsName('a/b') !== sitzungsName('a_b'), true);
  ist('Sitzungsname ist stabil', sitzungsName('s-1'), sitzungsName('s-1'));
  ist('fehlende Sitzung gibt einen festen Namen', [sitzungsName(undefined) === sitzungsName(''), sitzungsName(undefined).startsWith('ohne-sitzung-')], [true, true]);
  merkeTrocken(env, '../../ausbruch', ['automation/z.mjs']);
  ist('Pfad-Ausbruch gelingt nicht: keine Datei ausserhalb, Inhalt lesbar', [existsSync(join(ordner, '..', '..', 'ausbruch')), leseTrocken(env, '../../ausbruch')], [false, ['automation/z.mjs']]);
}

// ================================================================ 8. Der Hook als echter Prozess (stdin → stdout)
function prozess(stdin, zusatz = {}) {
  const r = spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8', env: { PATH: process.env.PATH ?? '', ...zusatz }, timeout: 30000 });
  return { code: r.status, aus: r.stdout, fehler: r.stderr, signal: r.signal };
}
const jetzt = (name, ti, extra = {}) => JSON.stringify(eingabe('PreToolUse', { tool_name: name, tool_input: ti, ...extra }));
{
  const ordner = neuerOrdner();
  const Z = { LUXE_CODEX_ZUSTAND: ordner };

  const a = prozess(jetzt('exec_command', { cmd: 'git push --force origin x' }), Z);
  const aAus = JSON.parse(a.aus);
  ist('Prozess 1: Force-Push → Exit 0, eine JSON-Zeile, deny mit Grund, laut Schema gültig, stderr leer', [a.code, a.aus.endsWith('\n'), aAus.hookSpecificOutput.permissionDecision, aAus.hookSpecificOutput.permissionDecisionReason.startsWith('luxe-codex: Force-Push'), gueltig(aAus, 'pre-tool-use.command.output'), a.fehler], [0, true, 'deny', true, [], '']);

  const b = prozess(jetzt('exec_command', { cmd: 'ls -la' }), Z);
  ist('Prozess 2: harmloser Befehl → Exit 0 und keine Ausgabe', [b.code, b.aus, b.fehler], [0, '', '']);

  const c = prozess('das ist kein json', Z);
  ist('Prozess 3: kaputtes stdin → Exit 0, keine Ausgabe, kein Absturz', [c.code, c.aus, c.signal], [0, '', null]);

  const d = prozess('', Z);
  ist('Prozess 4: leeres stdin → Exit 0, keine Ausgabe', [d.code, d.aus], [0, '']);

  const live = { cmd: 'LIVE=1 node automation/seo-optimizer.mjs' };
  const e1 = prozess(jetzt('exec_command', live, { session_id: 'p-5' }), Z);
  const e2 = prozess(jetzt('exec_command', { cmd: 'node automation/seo-optimizer.mjs' }, { session_id: 'p-5' }), Z);
  const e3 = prozess(jetzt('exec_command', live, { session_id: 'p-5' }), Z);
  const e4 = prozess(jetzt('exec_command', live, { session_id: 'p-6' }), Z);
  ist('Prozess 5: LIVE=1 gesperrt → Trockenlauf (stumm) → LIVE=1 erlaubt, andere Sitzung weiter gesperrt', [JSON.parse(e1.aus).hookSpecificOutput.permissionDecision, e2.aus, e3.aus, JSON.parse(e4.aus).hookSpecificOutput.permissionDecision, [e1, e2, e3, e4].map(x => x.code)], ['deny', '', '', 'deny', [0, 0, 0, 0]]);

  const f = prozess(jetzt('apply_patch', patch('*** Add File: a.mjs', `+const t = "${S.shopify}"`)), Z);
  ist('Prozess 6: Geheimnis im Patch → deny, Grund nennt den Marker', [f.code, JSON.parse(f.aus).hookSpecificOutput.permissionDecisionReason.includes('luxe-geheim-ok')], [0, true]);

  const g = prozess(jetzt('exec_command', { cmd: 'LUXE_FORCE_OK=1 git push --force origin x' }), Z);
  ist('Prozess 7: Ausweg LUXE_FORCE_OK=1 → keine Ausgabe', [g.code, g.aus], [0, '']);

  const lernOrdner = neuerOrdner();
  const h = prozess(jetzt('mcp__x__y', { frage: 'anders' }), { LUXE_CODEX_ZUSTAND: lernOrdner, LUXE_CODEX_LERNEN: '1' });
  const zeilen = existsSync(join(lernOrdner, 'gesehen.jsonl')) ? readFileSync(join(lernOrdner, 'gesehen.jsonl'), 'utf8').trim().split('\n').map(z => JSON.parse(z).hook) : [];
  ist('Prozess 8: unbekannte Form → keine Ausgabe, mit LUXE_CODEX_LERNEN=1 im Lernprotokoll', [h.code, h.aus, zeilen], [0, '', ['leitplanken', 'leitplanken:unbekannte-form']]);

  const i = prozess(jetzt('exec', JS_FORCE), Z);
  ist('Prozess 9: JavaScript des Code-Modus (exec) mit Force-Push → deny', [i.code, JSON.parse(i.aus).hookSpecificOutput.permissionDecisionReason.includes('Force-Push')], [0, true]);

  const k = prozess(jetzt('shell', { command: ['bash', '-lc', 'git add -A'] }), Z);
  ist('Prozess 10: Argumentliste mit bash -lc → deny', [k.code, JSON.parse(k.aus).hookSpecificOutput.permissionDecisionReason.includes('git add')], [0, true]);

  const l = prozess(JSON.stringify({ ...eingabe('PostToolUse', { tool_input: { cmd: 'git push --force' } }) }), Z);
  ist('Prozess 11: PostToolUse-Eingabe → keine Ausgabe', [l.code, l.aus], [0, '']);

  const datei = join(ordner, 'ist-eine-datei');
  writeFileSync(datei, 'x');
  const m = prozess(jetzt('exec_command', { cmd: 'node automation/seo-optimizer.mjs' }, { session_id: 'p-12' }), { LUXE_CODEX_ZUSTAND: join(datei, 'unter') });
  const mAus = JSON.parse(m.aus);
  ist('Prozess 12: Zustandsordner nicht beschreibbar → Exit 0, sichtbare Meldung, Ausgabe laut Schema gültig', [m.code, mAus.systemMessage.includes('Trockenlauf konnte nicht gemerkt werden'), mAus.systemMessage.includes('luxe-codex/leitplanken'), gueltig(mAus, 'pre-tool-use.command.output'), mAus.hookSpecificOutput], [0, true, true, [], undefined]);

  const n = prozess('{"hook_event_name":"PreToolUse","tool_name":"exec_command"}', Z);
  ist('Prozess 13: Eingabe ohne tool_input (laut Schema Pflichtfeld) → Exit 0, keine Ausgabe', [n.code, n.aus], [0, '']);

  const o = prozess(jetzt('exec_command', { cmd: `git commit -m "kein git push --force"` }), Z);
  ist('Prozess 14: Commit-Nachricht, die Force-Push nur nennt → keine Ausgabe', [o.code, o.aus], [0, '']);
}

// Zwölf Hooks gleichzeitig in DERSELBEN Sitzung: kein Trockenlauf geht verloren
{
  const ordner = neuerOrdner();
  const skripte = Array.from({ length: 12 }, (_, i) => `automation/parallel_${i}.mjs`);
  const ergebnisse = await Promise.all(skripte.map(s => new Promise(fertigP => {
    const kind = spawn(process.execPath, [HOOK], { env: { PATH: process.env.PATH ?? '', LUXE_CODEX_ZUSTAND: ordner }, stdio: ['pipe', 'pipe', 'pipe'] });
    let aus = '';
    kind.stdout.on('data', d => { aus += d; });
    kind.on('close', code => fertigP({ code, aus }));
    kind.stdin.end(jetzt('exec_command', { cmd: `node ${s}` }, { session_id: 'parallel' }));
  })));
  ist('Parallel: zwölf gleichzeitige Hooks → alle Exit 0 ohne Ausgabe', [ergebnisse.map(r => r.code), ergebnisse.map(r => r.aus)], [Array(12).fill(0), Array(12).fill('')]);
  ist('Parallel: alle zwölf Trockenläufe stehen in der Zustandsdatei', leseTrocken({ LUXE_CODEX_ZUSTAND: ordner }, 'parallel').sort(), [...skripte].sort());
  ist('Parallel: es gibt genau eine Zustandsdatei (kein Rest einer Zwischendatei)', readdirSync(ordner).length, 1);
}

for (const o of temp) rmSync(o, { recursive: true, force: true });
fertig();
