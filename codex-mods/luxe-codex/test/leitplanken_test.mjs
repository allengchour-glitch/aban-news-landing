/**
 * Test der Leitplanken: Regeln (Port des Claude-Mods, jede in BEIDE Richtungen), Formen der Werkzeugeingabe
 * (Shell als Text und als Liste, Patch, Dateischreiben, JavaScript des Code-Modus, mehrere Werkzeugnamen),
 * Zustand der Trockenläufe (kaputt, parallel, sicherer Dateiname) und der Hook als echter Prozess. Abschnitt 9 hält die 23 Funde
 * der unabhängigen Prüfung fest (F1 bis F23): jeder zuerst als fehlschlagender Test, dann behoben.
 * Jede Hook-Ausgabe wird gegen das Schema aus der Codex-Binärdatei geprüft (test/schemas), jede nachgespielte
 * Eingabe ebenfalls. Die Zusammenfassung steht am ENDE (fertig()).
 *
 * Geheimnisse im Test sind aus Teilen zusammengesetzt, damit hier kein echt aussehender Wert steht.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { eingabe, fertig, gueltig, ist } from './kern.mjs';
import { AUSWEGE, GEHEIMNISSE, analysiere, erbeText, pruefeBash, pruefeInhalt, pruefePfad, zerlege } from '../lib/regeln.mjs';
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
  // Im Kindprozess mit Frist: ein Rückfall in exponentielles Zurücksetzen lässt den Test fehlschlagen statt hängen.
  const regelnUrl = pathToFileURL(join(HIER, '..', 'lib', 'regeln.mjs')).href;
  const quelle = `import { pruefeBash } from ${JSON.stringify(regelnUrl)};
    const r = [pruefeBash('git ' + '-C '.repeat(80) + 'x'), pruefeBash('git ' + '-c a=b '.repeat(80) + 'push'), pruefeBash('git ' + '-C a '.repeat(60) + 'push --force')];
    console.log(JSON.stringify([r[0] ?? null, r[1] ?? null, typeof r[2]?.deny]));`;
  const k = spawnSync(process.execPath, ['--input-type=module', '-e', quelle], { encoding: 'utf8', timeout: 8000 });
  ist('Regex: viele git-Optionen hintereinander brauchen keine Ewigkeit (kein exponentielles Zurücksetzen)', [k.status, k.signal, k.stdout.trim()], [0, null, '[null,null,"string"]']);
}
ist('git -C ohne Wert und git -c mit Wert', [verbietet('git -C push --force'), verbietet('git -c a=b push --force'), verbietet('git -C /r -c a=b push -f')], [false, true, true]);
ist('Reihenfolge der Regeln: Force-Push vor LIVE', grundZu('git push -f && LIVE=1 node automation/x.mjs').includes('Force-Push'), true);

// zerlege: Wörter ohne Anführungszeichen, Teilbefehle, Umleitungen, Heredocs (der Zerleger ersetzt die alte Textmaske)
const woerter = b => zerlege(b).filter(e => typeof e !== 'string').map(e => e.w.map(x => x.v));
const teilbefehle = b => zerlege(b).map(e => (typeof e === 'string' ? e : e.w.map(x => x.v).join(' ')));
ist('zerlege: Anführungszeichen und Maskierung fallen aus den Wörtern', woerter('git commit -m "kein git push --force mehr" \'a b\' c\\ d "x\\"y" ""'), [['git', 'commit', '-m', 'kein git push --force mehr', 'a b', 'c d', 'x"y', '']]);
ist('zerlege: Teilbefehle an ; && || | & und Zeilenumbruch', woerter('a;b && c || d | e & f\ng'), [['a'], ['b'], ['c'], ['d'], ['e'], ['f'], ['g']]);
ist('zerlege: Kommentar bis zum Zeilenende, # mitten im Wort nicht', woerter("echo a#b # nicht\nls 'x'"), [['echo', 'a#b'], ['ls', 'x']]);
ist('zerlege: Zeilenfortsetzung verbindet, auch mitten im Wort', woerter('git pu\\\nsh \\\n  --force'), [['git', 'push', '--force']]);
ist('zerlege: Anführungszeichen schützen Trenner und Kommentarzeichen', woerter('echo "a; b | c # d" \'e && f\''), [['echo', 'a; b | c # d', 'e && f']]);
ist('zerlege: $(…) und Rückticks sind eigene Teilbefehle zwischen Klammermarken', teilbefehle('x=$(pkill y); echo `ls`'), ['(', 'pkill y', ')', 'x=X', '(', 'ls', ')', 'echo X']);
ist('zerlege: Rückticks in doppelten Anführungszeichen sind Befehle, maskierte nicht', [teilbefehle('echo "a `pkill x` b"'), teilbefehle('echo "a \\`pkill x\\` b"')], [['(', 'pkill x', ')', 'echo a X b'], ['echo a `pkill x` b']]);
ist('zerlege: $(…) in doppelten Anführungszeichen wird gelesen, in einfachen nicht', [teilbefehle('echo "$(pkill a)"'), teilbefehle("echo '$(pkill a)'")], [['(', 'pkill a', ')', 'echo X'], ["echo $(pkill a)"]]);
{
  const e = zerlege("cat > a.txt <<'END-X' 2>&1\nzeile 1\nEND-X\nls")[0];
  ist('zerlege: Umleitungen und Heredoc-Körper gehören zum Teilbefehl, die Nummer vor > fällt weg', [e.w.map(x => x.v), e.umleit.map(u => [u.op, u.ziel.v]), e.heredocs.map(h => [h.koerper, h.zitiert, h.vollstaendig])], [['cat'], [['>', 'a.txt'], ['>&', '1']], [['zeile 1', true, true]]]);
  ist('zerlege: der Befehl nach der Endzeile ist wieder ein eigener Teilbefehl', woerter("cat <<EOF\nx\nEOF\nls"), [['cat'], ['ls']]);
}
ist('zerlege: Pipe-Marken', zerlege('a | b || c').filter(e => typeof e !== 'string').map(e => [e.pipeIn, e.pipeOut]), [[false, true], [true, false], [false, false]]);
ist('zerlege: offenes Zitat — der Rest ist Wortinhalt UND wird zusätzlich als Befehl gelesen (nichts bleibt verdeckt)', [teilbefehle('bash -c "git push -f'), teilbefehle("echo 'pkill x")], [['git push -f', 'bash -c git push -f'], ['pkill x', "echo pkill x"]]);
ist('zerlege: Wörter mit Zuweisung', zerlege('A=1 B="2 3" cmd').filter(e => typeof e !== 'string')[0].w.map(x => [x.v, x.zuw]), [['A=1', 'A'], ['B=2 3', 'B'], ['cmd', undefined]]);
ist('zerlege verträgt undefined, leer und kaputtes', [zerlege(undefined), zerlege(''), zerlege('((( ))) ``` <<<  \\').length >= 0], [[], [], true]);
const erbe = b => analysiere(b).map(erbeText);
ist('erbeText: je Teilbefehl, LIVE=1 zuerst dann die Auswege; Zitate und blosse Wörter zählen nicht', [erbe('LIVE=1 LUXE_FORCE_OK=1 bash -c "x"'), erbe('git commit -m "LIVE=1"'), erbe('ls'), erbe('LIVE=1 ls; ls'), erbe('export LIVE=1; ls'), erbe('echo LIVE=1; ls'), erbe('LUXE_KILL_OK=1 LUXE_ADD_OK=1 LIVE=1 ls')], [['LIVE=1 LUXE_FORCE_OK=1'], [''], [''], ['LIVE=1', ''], ['', 'LIVE=1'], ['', ''], ['LIVE=1 LUXE_KILL_OK=1 LUXE_ADD_OK=1']]);
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
  ['Mehrfach-Edit: Pfad aussen, Texte innen', { file_path: '/r/a.txt', edits: [{ old_string: 'A1', new_string: 'N1' }, { old_string: 'A2', new_string: 'N2' }] }, { p: ['/r/a.txt', '/r/a.txt'], t: ['N1', 'N2'] }],
  ['Shell-Befehl, der »await foo(« nur in Zitaten nennt, ist kein JavaScript', { cmd: 'grep -rn "await foo(" src; git push --force' }, { b: ['grep -rn "await foo(" src; git push --force'], formen: ['befehl'] }],
  ['Inhalt als Zeilenliste', { path: 'a.txt', content: ['eins', 'zwei'] }, { p: ['a.txt'], t: ['eins\nzwei'] }],
  ['leerer Inhalt zählt als Schreiben', { file_path: 'dropship/_SOCIAL_STOPP', content: '' }, { p: ['dropship/_SOCIAL_STOPP'], t: [''] }],
  ['JavaScript als ganze Eingabe (exec)', 'const r = await tools.exec_command({ cmd: "git push --force origin x", workdir: "/r" });\ntext(r.output);', { b: ['git push --force origin x'], bekannt: true, formen: ['js'] }],
  ['JavaScript mit tools["exec_command"]', 'await tools["exec_command"]({ cmd: "pkill x" })', { b: ['pkill x'], formen: ['js'] }],
  ['Text, der in eine laufende Shell getippt wird (chars)', { session_id: 12, chars: 'git push --force\n' }, { b: ['git push --force\n'], bekannt: true }],
  ['PowerShell mit NoProfile als Liste', { command: ['powershell.exe', '-NoProfile', '-Command', 'git push --force'] }, { b: ["powershell.exe -NoProfile -Command 'git push --force'", 'git push --force'] }],
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
await verboten('Force-Push in eine laufende Shell getippt (chars)', 'write_stdin', { session_id: 12, chars: 'git push --force\n' }, 'Force-Push');
await verboten('Force-Push über PowerShell-Liste', 'shell', { command: ['powershell.exe', '-NoProfile', '-Command', 'git push --force'] }, 'Force-Push');
await verboten('Mehrfach-Edit auf _SOCIAL_STOPP (Pfad aussen)', 'MultiEdit', { file_path: 'dropship/_SOCIAL_STOPP', edits: [{ old_string: 'a', new_string: 'b' }] }, '_SOCIAL_STOPP');
await verboten('Shell-Befehl mit »await foo(« im Zitat und Force-Push danach', 'exec_command', { cmd: 'grep -rn "await foo(" src; git push --force' }, 'Force-Push');
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
  const gesperrtAufruf = await leitplanken(e('exec', 'await tools.exec_command({ cmd: "node automation/a.mjs" });\nawait tools.exec_command({ cmd: "git push -f" });'), env);
  ist('Ablauf 8: ein gesperrter Aufruf merkt nichts (er läuft nie), auch nicht den Trockenlauf davor', [gesperrtAufruf?.hookSpecificOutput?.permissionDecision, leseTrocken(env, sitz).includes('automation/a.mjs')], ['deny', false]);
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
const prozessEingabeFehler = [];
const jetzt = (name, ti, extra = {}) => {
  const e = eingabe('PreToolUse', { tool_name: name, tool_input: ti, ...extra });
  prozessEingabeFehler.push(...gueltig(e, 'pre-tool-use.command.input'));
  return JSON.stringify(e);
};
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

  const postEingabe = eingabe('PostToolUse', { tool_input: { cmd: 'git push --force' } });
  const l = prozess(JSON.stringify(postEingabe), Z);
  ist('Prozess 11 (Vorbedingung): die PostToolUse-Eingabe ist laut Schema gültig', gueltig(postEingabe, 'post-tool-use.command.input'), []);
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

// ================================================================ 9. Funde der unabhängigen Prüfung (23)
// Jeder Fund wurde ZUERST als Test eingebaut (rot gegen den alten Code), erst dann der Code geändert.
// In den Zeichenketten ist `\\\n` ein Backslash mit Zeilenumbruch (Zeilenfortsetzung der Shell), `\n` ein echter Zeilenumbruch.
// Wie der Hook: alle ausgepackten Befehle (bash -lc, Heredoc, Pipe an eine Shell …) werden einzeln geprüft.
const gesperrtGanz = (c, trocken = []) => ziehePruefgut({ cmd: c }).befehle.some(b => typeof pruefeBash(b, trocken)?.deny === 'string');
const grundGanz = (c, trocken = []) => { for (const b of ziehePruefgut({ cmd: c }).befehle) { const d = pruefeBash(b, trocken)?.deny; if (d) return d; } return ''; };
const mitGrund = (name, liste, teil, trocken) => { for (const c of liste) ist(`${name}: ${JSON.stringify(c).slice(0, 80)}`, [gesperrtGanz(c, trocken), teil ? grundGanz(c, trocken).includes(teil) : true], [true, true]); };
const frei = (name, liste, trocken) => { for (const c of liste) ist(`${name}: ${JSON.stringify(c).slice(0, 80)}`, gesperrtGanz(c, trocken), false); };
const freiStreng = (name, liste, trocken) => { for (const c of liste) ist(`${name}: ${JSON.stringify(c).slice(0, 80)}`, urteil(c, trocken), undefined); };
const imKind = (quelle, frist = 25000) => {
  const t0 = Date.now();
  const k = spawnSync(process.execPath, ['--input-type=module', '-e', quelle], { encoding: 'utf8', timeout: frist });
  return { status: k.status, signal: k.signal, aus: (k.stdout ?? '').trim(), fehler: (k.stderr ?? '').trim(), ms: Date.now() - t0 };
};
const FORM_URL = pathToFileURL(join(HIER, '..', 'lib', 'eingabe_form.mjs')).href;
const REGELN_URL = pathToFileURL(join(HIER, '..', 'lib', 'regeln.mjs')).href;
const BT = '`';
const entscheidung = aus => { try { return JSON.parse(aus).hookSpecificOutput.permissionDecision; } catch { return aus === '' ? 'keine Ausgabe' : 'kaputt'; } };

// ---- F1/F16 Zeilenfortsetzung (Backslash, Zeilenumbruch, Einrückung) verdeckt Force-Push, git add, touch, pkill
mitGrund('F1/F16 Force-Push mit Zeilenfortsetzung', ['git push \\\n  --force origin x', 'git push origin x \\\n  -f', 'git push \\\n  origin \\\n  --force', 'git push \\\n--force origin x', 'git push \\\r\n  --force origin x', 'git pu\\\nsh --force origin x', 'git push origin \\\n  +main'], 'Force-Push');
mitGrund('F1/F16 git add mit Zeilenfortsetzung', ['git add \\\n  -A', 'git add \\\n  .', 'git add a.md \\\n  b.md \\\n  -A'], 'git add -A');
mitGrund('F16 touch mit Zeilenfortsetzung', ['touch \\\n  dropship/_SOCIAL_STOPP'], 'Besitzer');
mitGrund('F1 pkill mit Zeilenfortsetzung', ['pkill \\\n  -f x', 'sleep 1; \\\n  pkill node'], 'pkill/killall');
frei('F1 Zeilenfortsetzung ohne Treffer bleibt frei', ['git push \\\n  origin x', 'git push origin x \\\n  --follow-tags', 'git commit -m "a \\\n  git push --force"', "echo 'a \\\n git push --force'"]);

// ---- F2 LIVE="1" (Wert in Anführungszeichen) ist scharf und wird nie als Trockenlauf gemerkt
mitGrund('F2 LIVE mit Anführungszeichen ist scharf', ['LIVE="1" node automation/seo-optimizer.mjs', "LIVE='1' node automation/seo-optimizer.mjs", 'export LIVE="1"; node automation/seo-optimizer.mjs', 'env LIVE="1" node automation/seo-optimizer.mjs', 'LIVE=\'1\' bash -lc "node automation/seo-optimizer.mjs"'], 'Trockenlauf');
for (const c of ['LIVE=0 node automation/x.mjs', 'LIVE= node automation/x.mjs', 'LIVE="" node automation/x.mjs', 'LIVE=11 node automation/x.mjs', 'LIVE=true node automation/x.mjs']) {
  ist(`F2 nicht scharf, also ein Trockenlauf: ${c}`, urteil(c, []), { merke: 'automation/x.mjs' });
}
{
  const ordner = neuerOrdner();
  const env = { LUXE_CODEX_ZUSTAND: ordner };
  const sitz = 'f2-sitzung';
  const e = c => eingabe('PreToolUse', { tool_name: 'exec_command', tool_input: { cmd: c }, session_id: sitz });
  const a = await leitplanken(e('LIVE="1" node automation/seo-optimizer.mjs'), env);
  const b = await leitplanken(e('LIVE=1 node automation/seo-optimizer.mjs'), env);
  ist('F2 LIVE="1" wird gesperrt und NICHT als Trockenlauf gemerkt: das spätere LIVE=1 bleibt gesperrt', [a?.hookSpecificOutput?.permissionDecision, b?.hookSpecificOutput?.permissionDecision, leseTrocken(env, sitz)], ['deny', 'deny', []]);
}

// ---- F3 JS-Leser: Regex-Literale mit Apostroph, Anführungszeichen, Backtick, // oder / in der Klasse
const RX_QUELLEN = [
  ['Shell-Quote-Idiom mit /\'/g', `const sh = s => "'" + s.replace(/'/g, "'\\\\''") + "'"; await tools.exec_command({ cmd: ${BT}git push --force origin $` + `{sh(b)}${BT} });`, 'Force-Push'],
  ['/\'/g, dann pkill', `msg.replace(/'/g, ""); await tools.exec_command({ cmd: "pkill -f laufen.py" })`, 'pkill/killall'],
  ['/\\//: das // ist kein Kommentar', `const r = /\\//; await tools.exec_command({ cmd: "git push --force origin x" });`, 'Force-Push'],
  ['/"/g', `x = s.replace(/"/g, ''); await tools.exec_command({ cmd: "git add -A" })`, 'git add -A'],
  ['Backtick im Regex', `x = s.replace(/${BT}/g, ''); await tools.exec_command({ cmd: "git add -A" })`, 'git add -A'],
  ['Zeichenklasse [/\']', `const p = s.split(/[/']/); await tools.exec_command({ cmd: "pkill x" })`, 'pkill/killall'],
  ['Regex nach if (…)', `if (ok) /'/.test(b); await tools.exec_command({ cmd: "pkill x" })`, 'pkill/killall'],
  ['Regex nach return', `function f() { return /'/.test(b); } await tools.exec_command({ cmd: "pkill x" })`, 'pkill/killall'],
];
for (const [name, quelle, teil] of RX_QUELLEN) await verboten(`F3 ${name}`, 'exec', quelle, teil);
ist('F3 liesJs: Befehl nach dem Regex-Literal wird gelesen', liesJs(RX_QUELLEN[2][1]).befehle, ['git push --force origin x']);
for (const [name, quelle] of [['Division', 'const q = 10 / 2 / 5; await tools.exec_command({ cmd: "ls" })'], ['Division nach Klammer', 'const m = (a + b) / 2 / c; await tools.exec_command({ cmd: "ls" })'], ['Division nach Namen', 'const m = a / b / c; await tools.exec_command({ cmd: "ls" })'], ['/ ohne Schluss in der Zeile', 'const m = a /\n b; await tools.exec_command({ cmd: "ls" })']]) {
  ist(`F3 ${name} ist keine Regex: der Befehl danach bleibt sichtbar`, liesJs(quelle).befehle, ['ls']);
}

// ---- F4/F14/F15/F20 LIVE-Regel: je Teilbefehl, Skript nur wenn es wirklich ausgeführt wird
mitGrund('F4 LIVE=1 auf dem zweiten Skript, nur das erste gesehen', ['ls automation/seen.mjs && LIVE=1 node automation/b.mjs', 'node automation/seen.mjs; LIVE=1 node automation/b.mjs', 'cd automation && LIVE=1 node b.mjs', 'LIVE=1 node "automation/b.mjs"', "LIVE=1 node 'automation/b.mjs'"], 'automation/b.mjs', ['automation/seen.mjs']);
ist('F4 cd, cd .., cd dropship: das Skript trägt das Verzeichnis dropship/', grundGanz('cd automation; cd ..; cd dropship && LIVE=1 node b.mjs', []).includes('dropship/b.mjs'), true);
frei('F4 gleiche Skripte mit Trockenlauf sind frei', ['cd automation && LIVE=1 node b.mjs', 'LIVE=1 node "automation/b.mjs"', "LIVE=1 node 'automation/b.mjs'", '(cd automation && LIVE=1 node b.mjs)'], ['automation/b.mjs']);
ist('F4 cd über mehrere Ebenen und absolut: das Verzeichnis wird zusammengesetzt', [grundGanz('cd workers && cd shop-brain && LIVE=1 node seed.mjs', []).includes('workers/shop-brain/seed.mjs'), grundGanz('cd /home/u/repo && cd automation && LIVE=1 node b.mjs', []).includes('für automation/b.mjs'), grundGanz('cd workers; cd /abs/andere; LIVE=1 node x.mjs', []).includes('abs/andere/x.mjs')], [true, true, true]);
ist('F4 cd in Klammern wirkt nicht nach aussen', urteil('(cd automation && node a.mjs); node a.mjs'), { merke: 'automation/a.mjs', weitere: ['a.mjs'] });
mitGrund('F15 mehrere Skripte in einer Kette: jedes eigene LIVE', ['LIVE=1 node automation/a.mjs && LIVE=1 node automation/b.mjs', 'node automation/a.mjs --prep && LIVE=1 node automation/b.mjs', 'for s in automation/a.mjs automation/b.mjs; do LIVE=1 node $s; done', 's=automation/b.mjs; LIVE=1 node $s'], 'automation/b.mjs', ['automation/a.mjs']);
ist('F15 nur b gesehen: a läuft nicht scharf, also keine Sperre wegen a (alt: falsche Begründung), a wird gemerkt', urteil('node automation/a.mjs && LIVE=1 node automation/b.mjs', ['automation/b.mjs']), { merke: 'automation/a.mjs' });
ist('F15 nichts gesehen: die Sperre nennt b, nicht a', [grundGanz('node automation/a.mjs && LIVE=1 node automation/b.mjs', []).includes('für automation/b.mjs'), grundGanz('node automation/a.mjs && LIVE=1 node automation/b.mjs', []).includes('für automation/a.mjs')], [true, false]);
ist('F15 beide gesehen: frei', [urteil('LIVE=1 node automation/a.mjs && LIVE=1 node automation/b.mjs', ['automation/a.mjs', 'automation/b.mjs']), urteil('for s in automation/a.mjs automation/b.mjs; do LIVE=1 node $s; done', ['automation/a.mjs', 'automation/b.mjs'])], [undefined, undefined]);
ist('F15 mehrere Trockenläufe in einer Kette werden alle gemerkt', urteil('node automation/a.mjs && node automation/b.mjs'), { merke: 'automation/a.mjs', weitere: ['automation/b.mjs'] });
ist('F15 ein schon gesehenes Skript wird nicht erneut gemerkt', urteil('node automation/a.mjs && node automation/b.mjs', ['automation/a.mjs']), { merke: 'automation/b.mjs' });
ist('F15 dasselbe Skript zweimal in der Kette wird einmal gemerkt', urteil('node automation/a.mjs; node automation/a.mjs'), { merke: 'automation/a.mjs' });
ist('F15 export LIVE=1 gilt für die folgenden Teilbefehle, ein Prefix nur für seinen eigenen', [gesperrtGanz('export LIVE=1; node automation/a.mjs; node automation/b.mjs', []), urteil('LIVE=1 node automation/a.mjs; node automation/b.mjs', ['automation/a.mjs'])], [true, { merke: 'automation/b.mjs' }]);
{
  const ordner = neuerOrdner();
  const env = { LUXE_CODEX_ZUSTAND: ordner };
  const sitz = 'f15-sitzung';
  const e = (c, w = 'exec_command') => eingabe('PreToolUse', { tool_name: w, tool_input: { cmd: c }, session_id: sitz });
  await leitplanken(e('node automation/a.mjs && node automation/b.mjs'), env);
  ist('F15 Hook: beide Trockenläufe einer Kette stehen in der Zustandsdatei', leseTrocken(env, sitz).sort(), ['automation/a.mjs', 'automation/b.mjs']);
  ist('F15 Hook: danach ist LIVE=1 auf b erlaubt', await leitplanken(e('LIVE=1 node automation/b.mjs'), env), undefined);
}
freiStreng('F14 Lesen oder Anfassen eines Skripts ist kein Trockenlauf', ['cat automation/cross_sell_durchlauf.sh', 'chmod +x automation/x.sh', 'git add automation/x.sh', 'grep -n LIVE dropship/run.sh', 'node -v && ls automation/seo-optimizer.mjs', 'echo node automation/a.mjs', 'grep node automation/a.mjs', 'ls dropship/a.sh', 'head -3 dropship/a.sh', 'wc -l automation/x.py', 'python3 --version; cat automation/x.py', 'git commit -m "node automation/a.mjs"']);
mitGrund('F14 der dokumentierte scharfe Aufruf eines .sh-Skripts braucht den Trockenlauf', ['AB=2026-07-25T02:07:10Z RUNDEN=20 LIVE=1 bash automation/cross_sell_durchlauf.sh'], 'automation/cross_sell_durchlauf.sh');
ist('F14 bash-Skript ohne LIVE=1 ist ein Trockenlauf', urteil('RUNDEN=20 bash automation/cross_sell_durchlauf.sh'), { merke: 'automation/cross_sell_durchlauf.sh' });
{
  const ordner = neuerOrdner();
  const env = { LUXE_CODEX_ZUSTAND: ordner };
  const sitz = 'f14-sitzung';
  const e = c => eingabe('PreToolUse', { tool_name: 'exec_command', tool_input: { cmd: c }, session_id: sitz });
  await leitplanken(e('cat automation/cross_sell_durchlauf.sh'), env);
  const r = await leitplanken(e('AB=2026-07-25T02:07:10Z RUNDEN=20 LIVE=1 bash automation/cross_sell_durchlauf.sh'), env);
  ist('F14 Hook: nach dem blossen Lesen des Skripts bleibt der scharfe Aufruf gesperrt', [r?.hookSpecificOutput?.permissionDecision, leseTrocken(env, sitz)], ['deny', []]);
}
mitGrund('F20 LIVE=1 mit Skriptpfaden ausserhalb des alten Musters', ['LIVE=1 node "$PWD/automation/seo-optimizer.mjs"', 'LIVE=1 node ./seo-optimizer.mjs', 'LIVE=1 node automation/x.cjs', 'LIVE=1 npx tsx automation/x.ts', 'LIVE=1 node workers/shop-brain/seed.mjs', 'LIVE=1 node scripts/x.mjs', 'LIVE=1 python3 -u scripts/x.py', 'LIVE=1 deno run --allow-all tools/x.ts', 'LIVE=1 ./automation/x.sh', 'LIVE=1 node --env-file .env automation/x.mjs', 'LIVE=1 node -r ./register.js automation/x.mjs', 'LIVE=1 sudo -u shop node automation/x.mjs', 'LIVE=1 timeout 60 node automation/x.mjs', 'LIVE=1 source automation/x.sh'], 'LUXE_LIVE_OK=1');
ist('F20 die Sperre nennt das Skript, nicht -r register.js', grundGanz('LIVE=1 node -r ./register.js automation/x.mjs', []).includes('automation/x.mjs'), true);
ist('F20 gleiche Kennung = gleiches Skript', [urteil('LIVE=1 node workers/shop-brain/seed.mjs', ['workers/shop-brain/seed.mjs']), urteil('LIVE=1 node ./seo-optimizer.mjs', ['seo-optimizer.mjs']), urteil('LIVE=1 node ./b.mjs', ['automation/b.mjs']), urteil('LIVE=1 node "$PWD/automation/seo-optimizer.mjs"', ['automation/seo-optimizer.mjs']), urteil('LIVE=1 node automation/../automation/a.mjs', ['automation/a.mjs'])], [undefined, undefined, undefined, undefined, undefined]);
ist('F20 verschiedene Verzeichnisse bleiben verschiedene Skripte', gesperrtGanz('LIVE=1 node automation/b.mjs', ['dropship/b.mjs']), true);
frei('F20 ohne Skript wird nicht geraten', ['LIVE=1 node -e "1"', 'LIVE=1 npm run build', 'LIVE=1 echo hi', 'LIVE=1 node --check automation/a.mjs', 'LIVE=1 python3 -m http.server', 'LIVE=1 node "$X"', 'LIVE=1 bash -c "ls"']);

// ---- F8 Auswege zählen nur als Zuweisung des betroffenen Befehls, nicht als blosses Wort
mitGrund('F8 Ausweg nur genannt (echo, Commit-Nachricht, grep) hebt nichts auf', ['echo LUXE_FORCE_OK=1; git push --force origin x', 'git commit -m "doc: Ausweg LUXE_FORCE_OK=1 beschrieben" && git push --force origin x', 'grep -rn LUXE_KILL_OK=1 . ; pkill -f laufen.py', 'echo LUXE_ADD_OK=1 && git add -A', 'echo LUXE_LIVE_OK=1; LIVE=1 node automation/x.mjs', 'LUXE_FORCE_OK=1 git status && git push --force origin x', 'LUXE_FORCE_OK=0 git push -f', 'LUXE_FORCE_OK=11 git push -f', 'LUXE_FORCE_OK= git push -f']);
frei('F8 echte Auswege', ['LUXE_FORCE_OK=1 git push --force origin x', 'export LUXE_FORCE_OK=1; git push --force origin x', 'env LUXE_FORCE_OK=1 git push -f', 'LUXE_FORCE_OK=1; git push -f', 'LUXE_KILL_OK=1 sudo pkill x', 'LUXE_FORCE_OK=1 git push -f && LUXE_ADD_OK=1 git add -A', 'LUXE_FORCE_OK="1" git push -f', 'LUXE_LIVE_OK=1 LIVE=1 node automation/x.mjs']);

// ---- F9/F13 gebündelte Kurzoptionen
mitGrund('F9/F13 Force-Push mit gebündelten Kurzoptionen', ['git push -fu origin x', 'git push -uf origin x', 'git push -vf origin x', 'git push -qf origin x', 'git push -nf origin x', 'git push -fq origin x', 'git push -u -f origin x', 'git push origin x -fu'], 'Force-Push');
frei('F9/F13 Push ohne f in den Kurzoptionen', ['git push -u origin x', 'git push -vu origin x', 'git push -o ci.skip origin x', 'git push -ofoo origin x', 'git push -4 origin x', 'git push -n origin x', 'git push origin x --follow-tags -u', 'git push -o -f origin x', 'git push -o +x origin x']);
mitGrund('F13 git add mit gebündelten Kurzoptionen', ['git add -vA', 'git add -Av', 'git add -fA', 'git add -A -v', 'git add --all -v', 'git add -f .', 'git add "*"', "git add '.'", 'git add ./', 'git stage -A'], 'git add -A');
frei('F13/F19 git add ohne alles', ['git add -v automation/x.mjs', 'git add -u .', 'git add -n .', 'git add -p .', 'git add --dry-run .', 'git add -un .', 'git add --update .', 'git add *.md', 'git add *.mjs automation/x.mjs', 'git add "*.md"', 'git add -u', 'git add -N automation/x.mjs']);

// ---- F12 Skript über Heredoc, Here-String oder Pipe an eine Shell
const SHELL_ZU = [
  "bash <<'EOF'\ngit push --force origin x\nEOF", "bash -s <<'EOF'\ngit push -f origin x\nEOF", 'sh <<EOF\ngit push --force origin x\nEOF', "cat <<'EOF' | bash\ngit push --force origin x\nEOF",
  "echo 'git push -f origin x' | sh", "printf 'git push --force origin x\\n' | bash", "bash <<'EOF'\npkill -f x\nEOF", "bash <<'EOF'\ngit add -A\nEOF", "bash <<'EOF'\ntouch dropship/_SOCIAL_STOPP\nEOF",
  "bash <<< 'git push --force origin x'", "zsh -s <<'EOF'\ngit push -f\nEOF", "bash - <<'EOF'\ngit push -f\nEOF", 'echo git push -f | bash -s', 'cat <<EOF | sudo bash\ngit push -f\nEOF',
  "docker exec -i c bash <<'EOF'\ngit push -f\nEOF", 'printf "%s\\n" "git push -f" | bash', "bash <<'EOF'\nls\ngit push -f\nEOF", "bash <<-'EOF'\n\tgit push -f\n\tEOF", 'bash <<EOF\ngit push -f',
];
mitGrund('F12 Skript an eine Shell gereicht', SHELL_ZU, '');
for (const c of SHELL_ZU) ist(`F12 Hook: ${JSON.stringify(c).slice(0, 60)}`, (await lauf('exec_command', { cmd: c })).aus?.hookSpecificOutput?.permissionDecision, 'deny');
ist('F12 LIVE=1 gilt für das Skript aus dem Heredoc', [gesperrtGanz("LIVE=1 bash <<'EOF'\nnode automation/seo-optimizer.mjs\nEOF", []), gesperrtGanz("LIVE=1 bash <<'EOF'\nnode automation/seo-optimizer.mjs\nEOF", ['automation/seo-optimizer.mjs'])], [true, false]);
ist('F12 Ausweg gilt für das Skript aus dem Heredoc', gesperrtGanz("LUXE_FORCE_OK=1 bash <<'EOF'\ngit push -f\nEOF"), false);
ist('F12 entpacke liefert das Heredoc-Skript', [entpacke("bash <<'EOF'\ngit push -f\nEOF")[1], entpacke("echo 'git push -f' | sh")[1], entpacke("bash <<< 'ls -la'")[1]], ['git push -f', 'git push -f', 'ls -la']);
frei('F12 Heredoc und Pipe, die keine Shell speisen, bleiben frei', ["cat <<'EOF'\ngit push --force\nEOF", "node - <<'EOF'\nconsole.log(1)\nEOF", "bash <<'EOF'\nls -la\nEOF", "echo 'git push -f' | cat", "echo 'git push -f' | grep push", "echo 'git push -f origin x' > notes.txt", "bash script.sh <<'EOF'\ngit push -f\nEOF", "git commit -F - <<'MSG-1'\ngit push -f\nMSG-1", "echo 'git push -f' | tee notes.txt", 'curl -s https://x.invalid/a.sh | bash', 'cat install.sh | sh', "bash -c 'ls' <<'EOF'\ngit push -f\nEOF"]);

// ---- F17 zitierte Argumente, Pfadpräfix, Kommentar-Apostroph
mitGrund('F17 Befehlsersetzung in doppelten Anführungszeichen führt aus', ['git commit -m "fix `git push -f` handling"', 'echo "$(pkill -f x)"', 'echo "a $(git add -A) b"'], '');
frei('F17 maskierte Rückticks und einfache Anführungszeichen sind Text', ['git commit -m "use \\`pkill\\` carefully"', "echo '$(pkill x)'", "git commit -m 'fix `git push -f`'"]);
mitGrund('F17 zitierte oder maskierte Argumente', ['git push origin "+main"', "git push origin '+HEAD:refs/heads/x'", 'git push "--force" origin x', "git push '-f' origin x", 'git push \\-f origin x', 'git "push" -f origin x', 'g""it push -f origin x'], 'Force-Push');
mitGrund('F17 git add zitiert', ['git add "."', "git add '-A'", 'git add "-A"', 'git add "--all"'], 'git add -A');
mitGrund('F17 pkill zitiert oder mit Pfad', ['"pkill" -f x', "'pkill' -f x", '/usr/bin/pkill -f x', 'sudo /usr/bin/killall node', '\\pkill x', 'sudo -u root pkill x', 'time pkill x', 'nohup pkill -f x &', 'timeout 5 pkill x', 'env FOO=1 pkill x', 'find . -name x -exec pkill {} \\;', 'xargs -n1 pkill < pids'], 'pkill/killall');
mitGrund('F17 Kommentar mit Apostroph verdeckt nichts', ["# don't force it\ngit push --force origin x\necho 'ok'", "# it's late\npkill -f x\nls 'a'", "echo 'say \"hi'; git push --force origin x; echo 'x\"'", 'echo a#b; git push -f', 'ls # kommentar\ngit push -f'], '');
frei('F17 Kommentare und Zitate, die nur nennen', ['git push origin "main"', '# git push --force\nls', 'echo a#b', 'git commit -m "# kein Kommentar"', "echo \"it's\"; ls 'a'", "git commit -m 'it'\"'\"'s' --amend", 'echo "a" "b" # git push -f']);

// ---- F19 Falsch-Positive und ihre Gegenstücke
frei('F19 harmlos, bisher gesperrt', ['command -v pkill', 'git log -S pkill', 'git log --all --grep pkill', 'time grep -rn pkill .', 'FOO=1 grep pkill f', 'npm run killall', 'echo git push -f origin x > notes.txt', 'echo git add -A >> notes.txt', 'git push origin x # never use -f', "cat <<'END-OF-TEXT'\ngit push -f\nEND-OF-TEXT", "git commit -F - <<'MSG-1'\ngit push -f\nMSG-1", 'cp dropship/_SOCIAL_STOPP /tmp/backup.txt', 'mv dropship/_SOCIAL_STOPP /tmp/weg', 'tee /tmp/x < dropship/_SOCIAL_STOPP', 'mv dropship/_SOCIAL_STOPP dropship/_SOCIAL_STOPP.alt', 'cp dropship/_SOCIAL_STOPP /tmp/', 'man pkill', 'which killall', 'pgrep -fl node', 'yarn run pkill', 'type -a pkill']);
mitGrund('F19 die Gegenstücke bleiben gesperrt', ['cp /tmp/backup.txt dropship/_SOCIAL_STOPP', 'mv /tmp/weg dropship/_SOCIAL_STOPP', 'tee dropship/_SOCIAL_STOPP < /tmp/x', 'cp -t dropship /tmp/_SOCIAL_STOPP', 'mv /tmp/_SOCIAL_STOPP dropship/', 'git mv /tmp/x dropship/_SOCIAL_STOPP', 'cat /tmp/x > dropship/_SOCIAL_STOPP', 'cat /tmp/x | tee -a dropship/_SOCIAL_STOPP'], 'Besitzer');

// ---- F21 weitere Schreibwege auf dropship/_SOCIAL_STOPP
mitGrund('F21 weitere Schreibwege (Shell)', ['truncate -s 0 dropship/_SOCIAL_STOPP', 'dd if=/dev/null of=dropship/_SOCIAL_STOPP', 'curl -o dropship/_SOCIAL_STOPP http://x', 'curl --output dropship/_SOCIAL_STOPP http://x', 'curl -sSLo dropship/_SOCIAL_STOPP http://x', 'wget -O dropship/_SOCIAL_STOPP http://x', 'wget --output-document=dropship/_SOCIAL_STOPP http://x', 'rsync -a a dropship/_SOCIAL_STOPP', `python3 -c "open('dropship/_SOCIAL_STOPP','w')"`, `node -e "require('fs').writeFileSync('dropship/_SOCIAL_STOPP','')"`, 'install -m 644 a dropship/_SOCIAL_STOPP', 'ln -s a dropship/_SOCIAL_STOPP', 'sudo tee dropship/_SOCIAL_STOPP', ': > dropship/_SOCIAL_STOPP', 'exec 3> dropship/_SOCIAL_STOPP', 'printf x |tee -a dropship/_SOCIAL_STOPP', `perl -e 'open(F, ">dropship/_SOCIAL_STOPP")'`, 'echo x &> dropship/_SOCIAL_STOPP', 'echo x >| dropship/_SOCIAL_STOPP', 'New-Item -ItemType File -Path dropship\\_SOCIAL_STOPP', 'Set-Content dropship\\_SOCIAL_STOPP x', 'ni dropship/_SOCIAL_STOPP', 'Copy-Item a.txt dropship\\_SOCIAL_STOPP', "'x' | Out-File dropship\\_SOCIAL_STOPP", 'echo x > dropship\\_SOCIAL_STOPP', 'Add-Content -Path dropship\\_SOCIAL_STOPP -Value x', 'find . -name x -exec touch dropship/_SOCIAL_STOPP \;', 'ssh host touch dropship/_SOCIAL_STOPP', 'docker exec c cp a dropship/_SOCIAL_STOPP', 'watch -n1 touch dropship/_SOCIAL_STOPP', 'xargs -I{} cp {} dropship/_SOCIAL_STOPP < liste'], 'Besitzer');
frei('F21 Lesen und Schreiben anderswo bleibt frei', [`python3 -c "print(open('dropship/_SOCIAL_STOPP').read())"`, 'curl -o /tmp/x http://x', 'dd if=dropship/_SOCIAL_STOPP of=/tmp/x', 'rsync -a dropship/_SOCIAL_STOPP /tmp/', 'truncate -s 0 /tmp/x', 'wget -O /tmp/x http://x', 'ln -s dropship/_SOCIAL_STOPP /tmp/link', 'install -m 644 dropship/_SOCIAL_STOPP /tmp/x', `node -e "console.log(require('fs').readFileSync('dropship/_SOCIAL_STOPP','utf8'))"`, 'echo x 2>&1', 'echo x >&2', 'ls > /tmp/liste', 'Get-Content dropship\\_SOCIAL_STOPP', 'Remove-Item dropship\\_SOCIAL_STOPP', 'Copy-Item dropship\\_SOCIAL_STOPP C:\\tmp\\x', 'Move-Item dropship\\_SOCIAL_STOPP C:\\tmp\\x', 'git log --grep touch dropship/_SOCIAL_STOPP', 'grep touch dropship/_SOCIAL_STOPP', 'ssh host cat dropship/_SOCIAL_STOPP', 'find . -name _SOCIAL_STOPP -exec rm {} \;', 'find dropship -name _SOCIAL_STOPP', 'docker exec c cp dropship/_SOCIAL_STOPP /tmp/x']);
{
  const JS_SOCIAL = ['fs.writeFileSync("dropship/_SOCIAL_STOPP", new Date().toISOString())', 'fs.writeFileSync("dropship/_SOCIAL_STOPP", JSON.stringify({a:1}))', 'fs.copyFileSync("a.txt", "dropship/_SOCIAL_STOPP")', 'fs.closeSync(fs.openSync("dropship/_SOCIAL_STOPP","w"))', 'fs.renameSync("a", "dropship/_SOCIAL_STOPP")', 'fs.createWriteStream("dropship/_SOCIAL_STOPP")', 'fs.symlinkSync("a", "dropship/_SOCIAL_STOPP")', 'await fs.promises.writeFile("dropship/_SOCIAL_STOPP", String(Date.now()))', 'fs.appendFileSync("dropship/_SOCIAL_STOPP", x)', 'fs.truncateSync("dropship/_SOCIAL_STOPP")', 'await fs.promises.copyFile("a", "dropship/_SOCIAL_STOPP")', 'fs.linkSync("a", "dropship/_SOCIAL_STOPP")', 'const p = "dropship/_SOCIAL_STOPP"; fs.writeFileSync(p, Date.now().toString())'];
  for (const q of JS_SOCIAL) {
    await verboten(`F21 JavaScript ${q.slice(0, 48)}`, 'exec', q, '_SOCIAL_STOPP');
    await verboten(`F21 JavaScript im Feld code ${q.slice(0, 40)}`, 'exec', { code: q }, '_SOCIAL_STOPP');
  }
  for (const q of ['fs.readFileSync("dropship/_SOCIAL_STOPP", "utf8")', 'fs.unlinkSync("dropship/_SOCIAL_STOPP")', 'fs.copyFileSync("dropship/_SOCIAL_STOPP", "/tmp/b")', 'fs.openSync("dropship/_SOCIAL_STOPP", "r")', 'fs.renameSync("dropship/_SOCIAL_STOPP", "/tmp/x")', 'fs.writeFileSync("dropship/ok.txt", String(Date.now()))', 'fs.symlinkSync("dropship/_SOCIAL_STOPP", "/tmp/l")', 'fs.rmSync("dropship/_SOCIAL_STOPP")']) {
    await erlaubt(`F21 JavaScript lesend oder anderswo ${q.slice(0, 48)}`, 'exec', q);
  }
}

// ---- F22 Geheimnis-Muster: Lücken
const GEHEIM_LUECKEN = {
  'Google-Schlüssel endet auf - (in Anführungszeichen)': `k = "AI${'za'}${'B'.repeat(34)}-"`,
  'Google-Schlüssel endet auf - (Zeilenende)': `key=AI${'za'}${'B'.repeat(34)}-\nweiter`,
  'Google-Schlüssel endet auf - (vor Leerzeichen)': `key AI${'za'}${'B'.repeat(34)}- x`,
  'Google-Schlüssel mit _ am Ende': `AI${'za'}${'B'.repeat(34)}_`,
  'PEM verschlüsselt': `-----BEGIN ${'ENCRYPTED PRIVATE KEY'}-----`,
  'PEM PGP': `-----BEGIN ${'PGP PRIVATE KEY BLOCK'}-----`,
  'PEM EC': `-----BEGIN ${'EC PRIVATE KEY'}-----`,
  'PEM OPENSSH': `-----BEGIN ${'OPENSSH PRIVATE KEY'}-----`,
  'PEM DSA': `-----BEGIN ${'DSA PRIVATE KEY'}-----`,
  'PEM ohne Art': `-----BEGIN ${'PRIVATE KEY'}-----`,
  'sk-admin-': `sk${'-admin-'}${'g'.repeat(48)}`,
  'sk-None-': `sk${'-None-'}${'h'.repeat(48)}`,
  'sk-svcacct-': `sk${'-svcacct-'}${'i'.repeat(48)}`,
  'Altformat sk- + 48 Zeichen': `sk${'-'}${'j'.repeat(48)}`,
  'AWS-Sitzungsschlüssel ASIA': `AS${'IA'}${'ABCDEFGH12345678'}`,
  'GitHub ghs_': `gh${'s_'}${'c'.repeat(40)}`,
  'GitHub ghr_': `gh${'r_'}${'c'.repeat(40)}`,
  'GitHub gho_': `gh${'o_'}${'c'.repeat(40)}`,
  'GitHub ghu_': `gh${'u_'}${'c'.repeat(40)}`,
  'Shopify shpca_': `shp${'ca_'}${HEX32}`,
  'Shopify shppa_': `shp${'pa_'}${HEX32}`,
  'Slack xoxp-': `xox${'p-'}1234567890-abcdef`,
};
for (const [name, text] of Object.entries(GEHEIM_LUECKEN)) ist(`F22 Geheimnis erkannt: ${name}`, [typeof pruefeInhalt(text)?.deny, typeof pruefeInhalt(`// Zeile davor\nconst t = '${text}';\n`)?.deny], ['string', 'string']);
for (const [name, text] of Object.entries({
  'Google-Schlüssel zu lang': `AI${'za'}${'B'.repeat(37)}`, 'sk- mit 47 Zeichen': `sk-${'a'.repeat(47)}`, 'sk- mit 49 Zeichen': `sk-${'a'.repeat(49)}`, 'ASIA mit 15 Zeichen': `AS${'IA'}${'A'.repeat(15)}`,
  'PEM öffentlich': '-----BEGIN PUBLIC KEY-----', 'Zertifikat': '-----BEGIN CERTIFICATE-----', 'Wort davor an sk-': `desk-${'a'.repeat(48)}`, 'Kurzform ghs': `gh${'s_'}kurz`,
})) ist(`F22 kein Geheimnis: ${name}`, pruefeInhalt(text), undefined);

// ---- F23 JS-Leser: Schleifen, Listen, Rückruffunktionen, neu zugewiesene Variablen
const JS_LISTEN = [
  ['for…of über Literal', 'for (const cmd of ["git status", "git push --force"]) { await tools.exec_command({ cmd }); }', ['git status', 'git push --force'], 'Force-Push'],
  ['for…of über Variable', 'const cmds = ["pkill node","git add -A"]; for (const c of cmds) await tools.exec_command({ cmd: c });', ['pkill node', 'git add -A'], 'pkill/killall'],
  ['map mit Pfeilfunktion', 'await Promise.all(["git push -f","pkill x"].map(cmd => tools.exec_command({cmd})))', ['git push -f', 'pkill x'], 'Force-Push'],
  ['Neuzuweisung', 'let c = "ls"; c = "git push --force"; await tools.exec_command({ cmd: c });', ['ls', 'git push --force'], 'Force-Push'],
  ['forEach mit function', '["a","git push -f"].forEach(function (c) { tools.exec_command({ cmd: c }); })', ['a', 'git push -f'], 'Force-Push'],
  ['map mit Klammer um den Namen', '["git add -A"].map((c) => tools.exec_command({ cmd: c }))', ['git add -A'], 'git add -A'],
  ['for…of mit Variable über Variable', 'const a = ["git push -f"]; const b = a; for (const x of b) { await tools.exec_command({ cmd: x }) }', ['git push -f'], 'Force-Push'],
];
for (const [name, quelle, soll, teil] of JS_LISTEN) {
  ist(`F23 liesJs ${name}`, liesJs(quelle).befehle, soll);
  await verboten(`F23 ${name}`, 'exec', quelle, teil);
}
ist('F23 Kontrollen: Schleife ohne Befehl, Liste ohne Aufruf, argv-Variable bleibt ein Befehl', [
  liesJs('for (const x of ["a","b"]) { console.log(x); } await tools.exec_command({ cmd: "ls" })').befehle,
  liesJs('const q = ["git push -f"]; console.log(q)').befehle,
  liesJs('const args = ["git","status"]; await tools.exec_command({ command: args })').befehle,
], [['ls'], [], ['git status']]);
await erlaubt('F23 Schleife über harmlose Befehle', 'exec', 'for (const c of ["git status", "ls -la"]) { await tools.exec_command({ cmd: c }); }');

// ---- F5 Lücken der Testabdeckung: jede Menge einzeln (jeder Eintrag war ein überlebender Mutant)
{
  const CRLF = '*** Begin Patch\r\n*** Add File: dropship/_SOCIAL_STOPP\r\n+x\r\n*** End Patch\r\n';
  await verboten('F5 Patch mit Windows-Zeilenenden als ganze Eingabe', 'apply_patch', CRLF, '_SOCIAL_STOPP');
  await verboten('F5 Patch mit Windows-Zeilenenden im Feld input', 'apply_patch', { input: CRLF }, '_SOCIAL_STOPP');
  await verboten('F5 Geheimnis in Patch mit Windows-Zeilenenden', 'apply_patch', { patch: `*** Begin Patch\r\n*** Add File: a.mjs\r\n+t = "${S.shopify}"\r\n*** End Patch\r\n` }, 'Shopify');
  ist('F5 liesPatch-Pfade: CRLF-Patch über ziehePruefgut', ziehePruefgut(CRLF).pfade, ['dropship/_SOCIAL_STOPP']);
  await verboten('F5 CRLF-Patch als Argument von apply_patch (Liste)', 'shell', { command: ['apply_patch', CRLF] }, '_SOCIAL_STOPP');
  await verboten('F5 CRLF-Patch als Literal im JavaScript', 'exec', 'await tools.apply_patch("*** Begin Patch\\r\\n*** Add File: dropship/_SOCIAL_STOPP\\r\\n+x\\r\\n*** End Patch\\r\\n")', '_SOCIAL_STOPP');
  await verboten('F5 CRLF-Patch in einem fremden Feld', 'mcp__x__patch', { x: { y: CRLF } }, '_SOCIAL_STOPP');
  await verboten('F5 CRLF-Patch im Heredoc von apply_patch', 'exec_command', { cmd: `apply_patch <<'EOF'\r\n${CRLF}EOF\r\n` }, '_SOCIAL_STOPP');
  await verboten('F5 Zeilenkommentar mit Apostroph vor dem Aufruf', 'exec', "// don't panic\nawait tools.exec_command({ cmd: \"git push --force origin x\" })", 'Force-Push');
  for (const k of ['command', 'cmd', 'script', 'argv', 'command_line', 'commandline', 'shell_command', 'chars']) {
    ist(`F5 Befehlsfeld ${k} (Text und Liste)`, [ziehePruefgut({ [k]: 'git push --force' }).befehle, ziehePruefgut({ [k]: ['git', 'push', '--force'] }).befehle], [['git push --force'], ['git push --force']]);
  }
  for (const k of ['file_path', 'filepath', 'path', 'file', 'filename', 'file_name', 'target_file', 'target_path', 'new_path', 'output_path', 'destination', 'dest', 'target']) {
    ist(`F5 Pfadfeld ${k}`, [ziehePruefgut({ [k]: 'dropship/_SOCIAL_STOPP', content: 'x' }).pfade, (await lauf('Write', { [k]: 'dropship/_SOCIAL_STOPP', content: 'x' })).aus?.hookSpecificOutput?.permissionDecision], [['dropship/_SOCIAL_STOPP'], 'deny']);
  }
  for (const k of ['content', 'contents', 'file_text', 'file_content', 'new_string', 'new_str', 'new_text', 'new_content', 'text', 'replacement', 'insert_text']) {
    ist(`F5 Inhaltsfeld ${k}`, [ziehePruefgut({ path: 'a.txt', [k]: 'NEU' }).texte.map(t => t.text), (await lauf('Write', { path: 'a.txt', [k]: `t="${S.shopify}"` })).aus?.hookSpecificOutput?.permissionDecision], [['NEU'], 'deny']);
  }
  for (const k of ['old_string', 'old_str', 'old_text', 'old_content']) {
    ist(`F5 altes Feld ${k} wird nie geprüft`, [ziehePruefgut({ path: 'a.txt', [k]: `t="${S.shopify}"`, new_string: 'NEU' }).texte.map(t => t.text), (await lauf('Edit', { path: 'a.txt', [k]: `t="${S.shopify}"`, new_string: 'NEU' })).aus], [['NEU'], undefined]);
    ist(`F5 altes Feld ${k} wird auch als Objekt nie geprüft`, [ziehePruefgut({ path: 'a.txt', [k]: { content: `t="${S.shopify}"` }, new_string: 'NEU' }).texte.map(t => t.text), (await lauf('Edit', { path: 'a.txt', [k]: { content: `t="${S.shopify}"` }, new_string: 'NEU' })).aus], [['NEU'], undefined]);
  }
  for (const k of ['input', 'code', 'source', 'js', 'javascript', 'patch', 'diff', 'program']) {
    ist(`F5 Eingabefeld ${k}: JavaScript und Patch`, [ziehePruefgut({ [k]: 'await tools.exec_command({ cmd: "pkill x" })' }).befehle, ziehePruefgut({ [k]: patch('*** Add File: dropship/_SOCIAL_STOPP', '+x') }).pfade], [['pkill x'], ['dropship/_SOCIAL_STOPP']]);
  }
  for (const n of ['exec_command', 'shell', 'shell_command', 'local_shell', 'bash', 'exec', 'execSync', 'run_command', 'system']) {
    ist(`F5 JS-Aufruf ${n}(…)`, [liesJs(`await ${n}("pkill x")`).befehle, liesJs(`await tools.${n}({ cmd: "pkill x" })`).befehle], [['pkill x'], ['pkill x']]);
  }
  for (const n of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) ist(`F5 JS-Aufruf ${n}(…, […])`, [liesJs(`${n}("git", ["push", "--force"])`).befehle, ziehePruefgut(`${n}("git", ["push", "--force"])`).befehle], [['git push --force'], ['git push --force']]);
  for (const n of ['writeFileSync', 'writeFile', 'appendFileSync', 'appendFile']) {
    ist(`F5 JS-Aufruf ${n}(Pfad, Text)`, [liesJs(`${n}("dropship/_SOCIAL_STOPP", "x")`).pfade, liesJs(`${n}("a.txt", "NEU")`).texte.map(t => t.text), (await lauf('exec', `${n}("dropship/_SOCIAL_STOPP", "x")`)).aus?.hookSpecificOutput?.permissionDecision], [['dropship/_SOCIAL_STOPP'], ['NEU'], 'deny']);
  }
  const SHELLS = ['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash', 'fish', '/bin/bash', '/usr/bin/zsh', 'mksh', 'csh', 'tcsh'];
  for (const s of SHELLS) {
    for (const form of [`${s} -c "git push --force origin x"`, `${s} -lc 'git push --force origin x'`, `${s} -ec "git push --force origin x"`, `sudo ${s} -c "git push -f"`, `env A=1 ${s} -c "git push -f"`, `${s} --login -c "git push -f"`, `${s} -o pipefail -c "git push -f"`, `${s} -x -c "git push -f"`]) {
      ist(`F5 Hülle ${form.slice(0, 50)}`, [gesperrtGanz(form), entpacke(form).length >= 2], [true, true]);
    }
  }
  for (const form of ['eval "git push --force origin x"', 'eval git push -f', "powershell -Command 'git push -f'", 'pwsh -c "git push -f"', 'powershell.exe -NoProfile -Command git push -f', 'cmd /c "git push -f"', 'cmd.exe /k git push -f', 'PowerShell -command "git push -f"']) {
    ist(`F5 Hülle ${form.slice(0, 50)}`, [gesperrtGanz(form), entpacke(form).length >= 2], [true, true]);
  }
  for (const v of ['touch', 'tee', 'cp', 'mv', 'install', 'ln']) ist(`F5 Verb ${v} legt _SOCIAL_STOPP an`, [gesperrtGanz(`${v} a dropship/_SOCIAL_STOPP`), gesperrtGanz(`sudo ${v} a dropship/_SOCIAL_STOPP`)], [true, true]);
  ist('F5 --force-if-includes', [gesperrtGanz('git push --force-if-includes origin x'), gesperrtGanz('git push --force-with-lease=main:abc origin x')], [true, true]);
}

// ---- F10 Start des Hooks über einen Symlink (Codex könnte den Hook so aufrufen): realpathSync muss greifen
if (process.platform !== 'win32') {
  const ordner = neuerOrdner();
  const link = join(ordner, 'hook-link.mjs');
  symlinkSync(HOOK, link);
  const lauf1 = spawnSync(process.execPath, [link], { input: jetzt('exec_command', { cmd: 'git push --force origin x' }), encoding: 'utf8', env: { PATH: process.env.PATH ?? '', LUXE_CODEX_ZUSTAND: ordner }, timeout: 30000 });
  ist('F10 Start über Symlink: Exit 0 und das Urteil kommt (deny), nicht stumm', [lauf1.status, entscheidung(lauf1.stdout)], [0, 'deny']);
  const ordner2 = neuerOrdner();
  const link2 = join(ordner2, 'ein', 'zwei');
  mkdirSync(join(ordner2, 'ein'));
  symlinkSync(link, link2);
  const lauf2 = spawnSync(process.execPath, [link2], { input: jetzt('exec_command', { cmd: 'pkill -f x' }), encoding: 'utf8', env: { PATH: process.env.PATH ?? '', LUXE_CODEX_ZUSTAND: ordner2 }, timeout: 30000 });
  ist('F10 Start über Symlink auf Symlink', [lauf2.status, entscheidung(lauf2.stdout)], [0, 'deny']);
}

// ---- F7/F18 Lernprotokoll: Geheimnisse stehen nie im Klartext, Datei nur für den Besitzer lesbar
{
  const lernOrdner = join(neuerOrdner(), 'neu');
  const TOKEN = S.shopify;
  const curl = `curl -s -H "X-Shopify-Access-Token: ${TOKEN}" https://x.myshopify.com/admin/api/x.json`;
  const lauf1 = prozess(jetzt('exec_command', { cmd: curl }), { LUXE_CODEX_ZUSTAND: lernOrdner, LUXE_CODEX_LERNEN: '1' });
  const lauf2 = prozess(jetzt('Write', { file_path: '/r/a.mjs', content: `const t = '${TOKEN}'` }), { LUXE_CODEX_ZUSTAND: lernOrdner, LUXE_CODEX_LERNEN: '1' });
  const protokoll = join(lernOrdner, 'gesehen.jsonl');
  const text = existsSync(protokoll) ? readFileSync(protokoll, 'utf8') : '';
  ist('F7/F18 Lernprotokoll: das Token steht weder im Befehl noch im (gesperrten) Schreibaufruf', [lauf1.code, entscheidung(lauf2.aus), text.includes(TOKEN), text.includes(TOKEN.slice(0, 12)), text.includes('myshopify.com')], [0, 'deny', false, false, true]);
  ist('F7/F18 Lernprotokoll: Datei 0600, Ordner 0700', process.platform === 'win32' ? [0o600, 0o700] : [statSync(protokoll).mode & 0o777, statSync(lernOrdner).mode & 0o777], [0o600, 0o700]);
}

// ---- F6/F11 Laufzeit: Eingaben, die den Hook über das Zeitlimit (10 s) trieben
for (const d of [30, 60, 400]) {
  const r = imKind(`import { liesJs } from ${JSON.stringify(FORM_URL)};
    const d = ${d};
    const s = 'const a = ' + '['.repeat(d) + '1' + ']'.repeat(d) + ';\\nawait tools.exec_command({ cmd: "ls" });';
    console.log(JSON.stringify(liesJs(s).befehle));`, 8000);
  ist(`F6 verschachtelte Array-Literale (Tiefe ${d}) brauchen keine Ewigkeit und der Befehl danach wird gelesen`, [r.status, r.signal, r.aus, r.ms < 5000], [0, null, '["ls"]', true]);
}
{
  const aufgaben = {
    'a| x40000, dann Force-Push': "'a|'.repeat(40000) + '; git push --force origin main'",
    '; x40000, dann Force-Push': "'a;'.repeat(40000) + 'git push --force origin main'",
    'Force-Push, dann <<A x40000': "'git push --force origin main\\n' + '<<A\\n'.repeat(40000)",
    'node -e mit 30 KB Zuweisungen': "'node -e ' + 'a=1;b=2;c=3;'.repeat(2500) + '; git push -f'",
    'Force-Push, dann Heredoc ohne Ende mit 8000 Leerzeilen': "'git push -f\\ncat <<EOF\\n' + '\\n'.repeat(8000)",
    '$( x20000 ungeschlossen, dann pkill': "'echo $('.repeat(20000) + '; pkill x'",
    '"-Zeichen x20001 (das letzte bleibt offen)': "'echo \"'.repeat(20001) + '; git push -f'",
  };
  for (const [name, ausdruck] of Object.entries(aufgaben)) {
    const r = imKind(`import { ziehePruefgut } from ${JSON.stringify(FORM_URL)};
      import { pruefeBash } from ${JSON.stringify(REGELN_URL)};
      const text = ${ausdruck};
      const g = ziehePruefgut({ cmd: text });
      const urteile = g.befehle.map(b => pruefeBash(b, [])).filter(Boolean);
      console.log(JSON.stringify([g.befehle.length > 0, urteile.length > 0]));`, 20000);
    ist(`F11 ${name}: unter 5 s im Kindprozess, und das Verbot kommt`, [r.status, r.signal, r.aus, r.ms < 5000], [0, null, '[true,true]', true]);
  }
  const grosse = "a|".repeat(40000) + '; git push --force origin main';
  const t0 = Date.now();
  const lauf1 = prozess(jetzt('exec_command', { cmd: grosse }), { LUXE_CODEX_ZUSTAND: neuerOrdner() });
  ist('F11 echter Hook-Prozess mit 80 KB Befehl: deny innerhalb von 5 s (Zeitlimit des Hooks ist 10 s)', [lauf1.code, entscheidung(lauf1.aus), Date.now() - t0 < 5000], [0, 'deny', true]);
}

ist('Alle Eingaben der Prozess-Tests sind laut Eingabe-Schema gültig', prozessEingabeFehler, []);

for (const o of temp) rmSync(o, { recursive: true, force: true });
fertig();
