/**
 * Gegenprobe zur Puls-Kadenz (21.09.2026).
 *
 * Anlass: 274 Agenten-Commits in 24 h, 273 davon nur auf `auftraege/_puls.json`,
 * 248 unter der Meldung «Auftrag erledigt» bei genau EINEM Auftrag. Die Stundenbremse
 * im Runner war richtig — sie wurde eine Schicht hoeher ausgehebelt, weil der Starter
 * alles committet, was unter `auftraege/` schmutzig ist.
 *
 * Diese Probe prueft deshalb nicht «wird gepusht?», sondern die Frage, an der es lag:
 * **bleibt der Arbeitsbaum zwischen zwei Pushes sauber?** Getestet wird der ECHTE
 * Quelltext aus luxe_auftrag_runner.mjs (herausgeschnitten, nicht nachgebaut) — eine
 * Kopie im Test wuerde nur beweisen, dass die Kopie stimmt.
 *
 * Lauf: /opt/node22/bin/node server/puls_kadenz.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const QUELLE = new URL('./luxe_auftrag_runner.mjs', import.meta.url).pathname;
const src = fs.readFileSync(QUELLE, 'utf8');
const von = src.indexOf("const PULS = path.join(REPO, 'auftraege/_puls.json');");
const bis = src.indexOf('\nif (!offen.length) {');
if (von < 0 || bis < 0 || bis <= von) {
  console.error('✗ Puls-Block nicht gefunden — Test wuerde gruen melden, ohne etwas zu pruefen.');
  process.exit(1);
}
const block = src.slice(von, bis);

let fehler = 0;
const pruefe = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ist=${JSON.stringify(ist)} soll=${JSON.stringify(soll)}`}`);
};

/** Baut eine frische Spielwiese und liefert schreibe_puls() mit Attrappen. */
function werkstatt({ pushSchlaegtFehl = false } = {}) {
  const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'pulstest-'));
  fs.mkdirSync(path.join(REPO, 'auftraege'), { recursive: true });
  const lokal = path.join(REPO, 'lokal.json');          // ausserhalb von auftraege/
  const protokoll = [];
  let repoStandHEAD = null;                             // was «git checkout --» wiederherstellt
  // ⚠️ Erste Fassung las `a[a.indexOf('-C') + 2]` — und bekam beim Commit «-c», weil
  // dort `-c user.name=… -c user.email=…` davorsteht. Dadurch meldeten VIER Proben rot,
  // obwohl der geprueste Code stimmte: der Test mass sich selbst. Also die Optionspaare
  // ueberspringen, statt eine feste Stelle zu raten.
  const unterbefehlVon = (a) => {
    let i = a.indexOf('-C') + 2;
    while (i < a.length && a[i] === '-c') i += 2;
    return a[i];
  };
  const execFileSync = (_bin, a) => {
    const unterbefehl = unterbefehlVon(a);
    protokoll.push(unterbefehl);
    if (unterbefehl === 'push' && pushSchlaegtFehl) throw new Error('kein Netz');
    if (unterbefehl === 'commit') repoStandHEAD = leseRepo();
    if (unterbefehl === 'checkout') {
      if (repoStandHEAD === null) { try { fs.unlinkSync(path.join(REPO, 'auftraege/_puls.json')); } catch {} }
      else fs.writeFileSync(path.join(REPO, 'auftraege/_puls.json'), repoStandHEAD);
    }
    return '';
  };
  const leseRepo = () => { try { return fs.readFileSync(path.join(REPO, 'auftraege/_puls.json'), 'utf8'); } catch { return null; } };
  const offen = [];
  const fabrik = new Function('fs', 'path', 'execFileSync', 'REPO', 'offen', 'process',
    `${block}\n return schreibe_puls;`);
  const schreibe_puls = fabrik(fs, path, execFileSync, REPO, offen,
    { env: { LUXE_PULS_LOKAL: lokal, LUXE_BRANCH: 'testzweig' } });
  return { schreibe_puls, leseRepo, lokal, protokoll,
           // «schmutzig» = Repo-Datei weicht vom zuletzt committeten Stand ab
           schmutzig: () => leseRepo() !== repoStandHEAD };
}

// 1) Erster Lauf ueberhaupt: es gibt keinen gepushten Stand → Puls MUSS raus.
{
  const w = werkstatt();
  w.schreibe_puls('leer');
  pruefe('1) erster Lauf: committet und gepusht', w.protokoll, ['add', 'commit', 'push']);
  pruefe('1) erster Lauf: Repo-Datei existiert', w.leseRepo() !== null, true);
  pruefe('1) erster Lauf: Arbeitsbaum danach sauber', w.schmutzig(), false);
}

// 2) DER ANLASSFALL: 11 weitere Laeufe binnen einer Stunde duerfen NICHTS anfassen.
{
  const w = werkstatt();
  w.schreibe_puls('leer');
  const nachErstem = w.leseRepo();
  w.protokoll.length = 0;
  for (let i = 0; i < 11; i++) w.schreibe_puls('leer');
  pruefe('2) 11 Laeufe in der Stunde: kein git-Aufruf', w.protokoll, []);
  pruefe('2) 11 Laeufe in der Stunde: Repo-Datei unveraendert', w.leseRepo(), nachErstem);
  pruefe('2) 11 Laeufe in der Stunde: Arbeitsbaum sauber', w.schmutzig(), false);
  const l = JSON.parse(fs.readFileSync(w.lokal, 'utf8'));
  pruefe('2) lokaler Stand zaehlt trotzdem mit', l.laeufe_seit_push, 11);
}

// 3) Nach ueber 55 Minuten ist er wieder faellig.
{
  const w = werkstatt();
  w.schreibe_puls('leer');
  const p = JSON.parse(w.leseRepo());
  p.zuletzt_gepusht = new Date(Date.now() - 56 * 60 * 1000).toISOString();
  fs.writeFileSync(path.join(path.dirname(w.lokal), 'auftraege/_puls.json'),
                   JSON.stringify(p, null, 2) + '\n');
  w.protokoll.length = 0;
  w.schreibe_puls('leer');
  pruefe('3) nach 56 Minuten: wieder committet und gepusht', w.protokoll, ['add', 'commit', 'push']);
}

// 4) Scheitert der Push, darf keine schmutzige Datei zurueckbleiben — sonst pusht sie
//    der Starter doch, und zwar unter «Auftrag erledigt».
{
  const w = werkstatt({ pushSchlaegtFehl: true });
  w.schreibe_puls('leer');
  pruefe('4) Push scheitert: zurueckgesetzt (checkout gerufen)', w.protokoll.includes('checkout'), true);
  pruefe('4) Push scheitert: Arbeitsbaum sauber', w.schmutzig(), false);
}

// 5) SABOTAGE: wuerde die alte Fassung (immer schreiben) hier auffallen?
{
  const w = werkstatt();
  w.schreibe_puls('leer');
  const vorher = w.leseRepo();
  fs.writeFileSync(path.join(path.dirname(w.lokal), 'auftraege/_puls.json'), vorher + ' ');
  pruefe('5) Sabotage: veraenderte Repo-Datei gilt als schmutzig', w.schmutzig(), true);
}

// 6) Fehlertext (20.10.): das Journal muss den GRUND zeigen, nicht nur den Befehl — und
//    darf keinen Token verraten. Vorher stand bei 100 Zeichen Schnitt nur «Command failed:
//    git -C … push -q origin HEAD:…»; die Antwort von GitHub kam nie an.
{
  const fehlertext = new Function('fs', 'path', 'execFileSync', 'REPO', 'offen', 'process',
    `${block}\n return fehlertext;`)(fs, path, () => '', os.tmpdir(), [], { env: {} });
  const gitFehler = Object.assign(
    new Error('Command failed: git -C /opt/luxe-agent/repo push -q origin HEAD:claude/x\nremote: Permission to a/b.git denied to c.'),
    { stderr: Buffer.from("remote: Permission to a/b.git denied to c.\nfatal: unable to access 'https://ghp_ABCDEFGHIJKLMNOP1234@github.com/a/b.git/': The requested URL returned error: 403\n") });
  const t = fehlertext(gitFehler);
  pruefe('6) Fehlertext nennt den Grund (403 / Permission)', /403/.test(t) && /Permission/.test(t), true);
  pruefe('6) Fehlertext kuerzt den Befehl auf «git push fehlgeschlagen»', t.startsWith('git push fehlgeschlagen'), true);
  pruefe('6) Fehlertext schwaerzt den Token', /ghp_ABCDEFGH/.test(t) || /1234@/.test(t), false);
  pruefe('6) Fehlertext schwaerzt Zugangsdaten in URLs allgemein', /\/\/\*\*\*@github\.com/.test(t) || !/\/\/[^/@\s]+@/.test(t), true);
  pruefe('6) Token ohne URL (nackt im Text) wird ebenfalls geschwaerzt',
    /ghp_ZZZZ/.test(fehlertext(Object.assign(new Error('Command failed: git -C x push -q o h'),
      { stderr: 'remote: Invalid username or token ghp_ZZZZZZZZZZZZZZZZ1234 rejected' }))), false);
  pruefe('6) Fehlertext hoechstens 300 Zeichen', fehlertext(new Error('x'.repeat(900))).length, 300);
  pruefe('6) schlichter Fehler bleibt lesbar', fehlertext(new Error('kein Netz')), 'kein Netz');
  pruefe('6) Nicht-Error-Wert (String) bleibt lesbar', fehlertext('kaputt'), 'kaputt');
}

// 7) Token-Ablauf im Puls (20.10.): steht das Datum in der Datei, landet es im gepushten Puls; fehlt die Datei, bleibt das Feld null.
{
  const ablaufDatei = path.join(os.tmpdir(), `token_ablauf_${process.pid}`);
  fs.writeFileSync(ablaufDatei, '2026-10-21 02:04:25 UTC\n');
  const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'pulstest-'));
  fs.mkdirSync(path.join(REPO, 'auftraege'), { recursive: true });
  const bauen = (envPfad) => new Function('fs', 'path', 'execFileSync', 'REPO', 'offen', 'process',
    `${block}\n return schreibe_puls;`)(fs, path, () => '', REPO, [],
    { env: { LUXE_PULS_LOKAL: path.join(REPO, 'lokal.json'), LUXE_BRANCH: 'testzweig', LUXE_TOKEN_ABLAUF: envPfad } });
  bauen(ablaufDatei)('leer');
  pruefe('7) Token-Ablauf steht im Puls', JSON.parse(fs.readFileSync(path.join(REPO, 'auftraege/_puls.json'), 'utf8')).token_ablauf, '2026-10-21 02:04:25 UTC');
  fs.unlinkSync(path.join(REPO, 'auftraege/_puls.json'));
  bauen(path.join(os.tmpdir(), 'gibt-es-nicht-' + process.pid))('leer');
  pruefe('7) ohne Datei: Feld null (kein Absturz, kein erfundenes Datum)', JSON.parse(fs.readFileSync(path.join(REPO, 'auftraege/_puls.json'), 'utf8')).token_ablauf, null);
  fs.unlinkSync(ablaufDatei);
}

console.log(fehler ? `\n${fehler} Probe(n) ROT` : '\nalle Proben gruen');
process.exit(fehler ? 1 : 0);
