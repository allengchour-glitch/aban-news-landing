/**
 * Test der lesenden Befehle als Skills (stand, shop-puls, lieferbar, trend, regeln), ihrer Skripte und der Hilfen.
 *
 * Dieser Baustein erzeugt KEINE Hook-Ausgabe (Skills sind Text und Skripte), darum prüft nichts hier gegen die
 * Hook-Schemas. Geprüft wird: das Frontmatter jedes Skills, dass die Befehle in den Skills WÖRTLICH so laufen, wie
 * sie dastehen (gegen falsche Skripte, die ihre Umgebung zeigen), die Handle-Prüfung samt Einschleus-Versuchen
 * durch eine echte Shell, der Bericht der Regeln gegen echte und falsche Module und das Skill-Inventar.
 * Jede Regel des Prüfens wird in BEIDE Richtungen gemessen (Treffer UND Nicht-Treffer, Gegenprobe zum Messgerät).
 * Kein Netz, kein Modell, kein Shop.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fertig, ist } from './kern.mjs';
import { AUFRUF, MAX_EINGABE, MAX_HANDLES, MAX_LAENGE, pruefeHandles, sichtbar } from '../lib/handles.mjs';
import { bericht, ERWARTET, GEGENPROBEN, geheimnisProbe, REGELN as BERICHT_REGELN, schnittstelleFehlt } from '../lib/regeln_bericht.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const REPO = join(WURZEL, '..', '..');
const SKILLS = join(WURZEL, 'skills');
const NODE = process.execPath;
const MEINE = ['stand', 'shop-puls', 'lieferbar', 'trend', 'regeln'];
const ANDERE = ['sparmodus', 'zweitmeinung'];
const NODE_PFAD_IN_SKILLS = '/opt/node22/bin/node';
const tmp = () => mkdtempSync(join(tmpdir(), 'luxe-befehle-'));
const lauf = (befehl, args, opt = {}) => spawnSync(befehl, args, { encoding: 'utf8', timeout: 30000, ...opt });
const UMGEBUNG = (dir, extra = {}) => ({ PATH: `${dirname(NODE)}${delimiter}${process.env.PATH}`, HOME: dir, LANG: 'C.UTF-8', ...extra });
const bash = (skript, dir, extra = {}) => lauf('bash', ['-c', skript], { cwd: dir, env: UMGEBUNG(dir, extra) });
const skillText = name => readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8');

// === Hilfen des Tests (jede wird unten selbst in beide Richtungen gemessen) ===================================
/** Frontmatter eines Skills: nur einzeilige «Schlüssel: Wert»-Zeilen, sonst ein Fehler. */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return { fehler: 'kein Frontmatter' };
  const felder = {};
  for (const zeile of m[1].split(/\r?\n/)) {
    const k = /^([A-Za-z][A-Za-z0-9_-]*): (.*)$/.exec(zeile);
    if (!k) return { fehler: `Zeile ohne «Schlüssel: Wert»: ${zeile}` };
    if (k[1] in felder) return { fehler: `doppelter Schlüssel ${k[1]}` };
    felder[k[1]] = k[2];
  }
  return { felder };
}

/** Was einen einfachen YAML-Text (ohne Anführungszeichen) für einen echten YAML-Leser brechen würde. */
function yamlProbleme(wert) {
  const p = [];
  if (/: |:$/.test(wert)) p.push('Doppelpunkt mit Leerzeichen oder am Ende');
  if (/ #/.test(wert)) p.push('Leerzeichen vor #');
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(wert)) p.push('beginnt mit einem YAML-Zeichen');
  if (/[\t\n\r]/.test(wert)) p.push('Tab oder Zeilenumbruch');
  if (wert !== wert.trim()) p.push('Rand-Leerzeichen');
  return p;
}

/** Alle Zeilen der Code-Blöcke, je Block eine Liste, links bündig eingerückt. */
function codeBloecke(text) {
  const aus = [];
  for (const m of text.matchAll(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```[ \t]*$/gm)) {
    const zeilen = m[1].replace(/\n$/, '').split('\n');
    const einzug = Math.min(...zeilen.filter(z => z.trim()).map(z => /^[ \t]*/.exec(z)[0].length));
    aus.push(zeilen.map(z => z.slice(einzug)));
  }
  return aus;
}

/** Sätze (Grenzen: . ! ? ; :), die `LIVE=1` nennen, ohne dass der Satz es verbietet. */
function liveOhneVerbot(text) {
  return text.split(/(?<=[.!?;:])\s+|\n/).filter(s => s.includes('LIVE=1') && !/\b(?:nie|niemals|nicht|kein|keine|keinen|keiner|ohne|verboten|verbot)\b/i.test(s));
}

/** Verbotene Befehlsformen in einer Befehlszeile: alles, was schreibt, löscht, verschickt oder die Umgebung aufbricht. */
function verboteneBefehle(zeile) {
  const f = [];
  if (/\bgit\s+(?:-C\s+\S+\s+)?(?:add|commit|push|checkout|switch|stash|reset|clean|pull|merge|rebase|rm|mv|restore|fetch|tag|branch\s+-[dD])\b/.test(zeile)) f.push('git schreibt');
  if (/(^|[\s;&|])(?:rm|mv|cp|curl|wget|sudo|chmod|kill|pkill|killall|dd|tee|touch|mkdir)(?=\s|$)/.test(zeile)) f.push('Dateibefehl oder Netz');
  if (/\bLIVE=1\b/.test(zeile)) f.push('LIVE=1');
  if (/(?:TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=/.test(zeile)) f.push('setzt Telegram');
  if (/\bDRY_RUN=0\b|\bSPEICHERN=1\b/.test(zeile)) f.push('Schreibschalter');
  return f;
}

/** Zerlegt eine Befehlszeile wie eine Shell (nur einfache und doppelte Anführungszeichen); `undefined` bei offenem Anführungszeichen. */
function zerlege(zeile) {
  const t = [];
  let akt = '', offen = null, da = false;
  for (const z of zeile) {
    if (offen) { if (z === offen) offen = null; else akt += z; }
    else if (z === "'" || z === '"') { offen = z; da = true; }
    else if (/\s/.test(z)) { if (akt !== '' || da) { t.push(akt); akt = ''; da = false; } }
    else akt += z;
  }
  if (offen) return undefined;
  if (akt !== '' || da) t.push(akt);
  return t;
}

/** `{ env, entfernt, argv }` einer Befehlszeile: Zuweisungen vorn, `env -u NAME` und das eigentliche Programm. */
function parseBefehl(zeile) {
  const t = zerlege(zeile);
  if (!t) return undefined;
  const env = {}, entfernt = [];
  let i = 0;
  const zuweisung = () => { while (i < t.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i])) { const j = t[i].indexOf('='); env[t[i].slice(0, j)] = t[i].slice(j + 1); i += 1; } };
  zuweisung();
  if (t[i] === 'env') { i += 1; while (t[i] === '-u') { entfernt.push(t[i + 1]); i += 2; } zuweisung(); }
  return { env, entfernt, argv: t.slice(i) };
}

/** Skill-Inventar: welche Ordner fremd sind und welche der erwarteten fehlen. */
function inventar(vorhandene, pflicht, erlaubt) {
  return { fremd: vorhandene.filter(n => !pflicht.includes(n) && !erlaubt.includes(n)), fehlt: pflicht.filter(n => !vorhandene.includes(n)) };
}

// === 0. Das Messgerät zuerst =====================================================================================
{
  const gut = '---\nname: x\ndescription: Zeigt etwas (A, B). Verwenden bei «a».\n---\n# T\n';
  ist('frontmatter: gültiges Beispiel', frontmatter(gut), { felder: { name: 'x', description: 'Zeigt etwas (A, B). Verwenden bei «a».' } });
  for (const [name, text] of [['ohne Fences', 'name: x\n'], ['Zeile ohne Doppelpunkt', '---\nname x\n---\n'], ['doppelter Schlüssel', '---\nname: a\nname: b\n---\n'], ['mehrzeiliger Wert', '---\nname: a\ndescription: eins\n  zwei\n---\n']]) {
    ist(`frontmatter: Gegenprobe «${name}» wird gemeldet`, 'fehler' in frontmatter(text), true);
  }
  ist('yamlProbleme: Gutes bleibt leer', yamlProbleme('Zeigt den Stand (Branch, Commits). Verwenden bei «Stand», «git status». Nicht für X.'), []);
  for (const schlecht of ['Zeigt: Branch', 'Endet mit:', 'a #b', '- liste', '"zitat" Anfang', '[eckig]', '*stern', 'a\tb', ' Rand', '@at', '`tick`', '%p', '&anker', '!tag', '|block', '>falten', '?frage', 'x\ny']) {
    ist(`yamlProbleme: Gegenprobe «${JSON.stringify(schlecht)}» wird gemeldet`, yamlProbleme(schlecht).length > 0, true);
  }
  const probe = codeBloecke('Text\n\n   ```\n   a b\n     c\n   ```\n\n```sh\nx\n```\nEnde `inline`');
  ist('codeBloecke: zwei Blöcke, Einzug entfernt, innere Einrückung bleibt', probe, [['a b', '  c'], ['x']]);
  ist('liveOhneVerbot: Verbotenes und Verneintes ist in Ordnung', liveOhneVerbot('Nie `LIVE=1` setzen. Kein `LIVE=1` ohne Trockenlauf. Das ist nicht `LIVE=1`.'), []);
  ist('liveOhneVerbot: Gegenprobe, ein Satz ohne Verbot wird gemeldet', liveOhneVerbot('Setze `LIVE=1` und starte. Nie wieder.'), ['Setze `LIVE=1` und starte.']);
  ist('liveOhneVerbot: Gegenprobe, der Verbotssatz gilt nur für seinen Satz', liveOhneVerbot('Nie anders. Dann `LIVE=1` setzen.').length, 1);
  ist('liveOhneVerbot: Wortgrenze, «nie» in «Genie» ist kein Verbot', liveOhneVerbot('Genie mit `LIVE=1` starten.').length, 1);
  for (const [zeile, soll] of [['git status -sb', []], ['GIT_OPTIONAL_LOCKS=0 git status -sb', []], ['git log --oneline -5', []], ['git add -A', ['git schreibt']], ['git -C x push', ['git schreibt']], ['git commit -m x', ['git schreibt']], ['rm -rf x', ['Dateibefehl oder Netz']], ['curl http://x', ['Dateibefehl oder Netz']], ['A=1 touch x', ['Dateibefehl oder Netz']], ['LIVE=1 node x', ['LIVE=1']], ['TELEGRAM_CHAT_ID=1 node x', ['setzt Telegram']], ['env -u TELEGRAM_CHAT_ID node x', []], ['node scripts/reset.mjs', []]]) {
    ist(`verboteneBefehle: «${zeile}»`, verboteneBefehle(zeile), soll);
  }
  ist('zerlege: Anführungszeichen schützen Leerzeichen, leerer String zählt', zerlege(`a 'b c' "d e" ''`), ['a', 'b c', 'd e', '']);
  ist('zerlege: offenes Anführungszeichen ist ein Fehler', zerlege(`a 'b`), undefined);
  ist('parseBefehl: Zuweisungen, env -u und Programm', parseBefehl(`HANDLES='a,b' ERNEUT=1 LIVE=0 node x.mjs`), { env: { HANDLES: 'a,b', ERNEUT: '1', LIVE: '0' }, entfernt: [], argv: ['node', 'x.mjs'] });
  ist('parseBefehl: env -u zweimal', parseBefehl('env -u A -u B node x.mjs'), { env: {}, entfernt: ['A', 'B'], argv: ['node', 'x.mjs'] });
  ist('inventar: fremd und fehlend werden benannt', inventar(['stand', 'boese', 'sparmodus'], ['stand', 'trend'], ['sparmodus', 'zweitmeinung']), { fremd: ['boese'], fehlt: ['trend'] });
  ist('inventar: Gegenprobe, alles Erwartete ist unauffällig', inventar(['stand', 'trend', 'zweitmeinung'], ['stand', 'trend'], ['sparmodus', 'zweitmeinung']), { fremd: [], fehlt: [] });
}

// === 1. Skill-Inventar =============================================================================================
const vorhanden = readdirSync(SKILLS, { withFileTypes: true });
const ordner = vorhanden.filter(d => d.isDirectory()).map(d => d.name).sort();
{
  const inv = inventar(ordner, MEINE, ANDERE);
  ist('Skill-Inventar: keine fremden Skills (erwartet sind nur die fünf Befehle plus sparmodus und zweitmeinung)', inv.fremd, []);
  ist('Skill-Inventar: alle fünf Befehls-Skills sind da', inv.fehlt, []);
  ist('Skill-Inventar: im Ordner skills/ liegen nur Skill-Ordner, keine losen Dateien', vorhanden.filter(d => !d.isDirectory()).map(d => d.name), []);
  ist('Skill-Inventar: jeder Skill-Ordner hat eine SKILL.md', ordner.filter(n => !existsSync(join(SKILLS, n, 'SKILL.md'))), []);
  const erlaubteDateien = { stand: ['SKILL.md'], 'shop-puls': ['SKILL.md'], trend: ['SKILL.md'], lieferbar: ['SKILL.md', 'scripts'], regeln: ['SKILL.md', 'scripts'] };
  for (const n of MEINE) ist(`Inhalt von skills/${n}: nur ${erlaubteDateien[n].join(', ')}`, readdirSync(join(SKILLS, n)).sort(), [...erlaubteDateien[n]].sort());
  ist('skills/lieferbar/scripts enthält nur handles.mjs', readdirSync(join(SKILLS, 'lieferbar', 'scripts')), ['handles.mjs']);
  ist('skills/regeln/scripts enthält nur regeln.mjs', readdirSync(join(SKILLS, 'regeln', 'scripts')), ['regeln.mjs']);
}

// === 2. Frontmatter =================================================================================================
const beschreibungen = {};
{
  const alle = ordner.filter(n => existsSync(join(SKILLS, n, 'SKILL.md')));
  const nameVon = {};
  for (const n of alle) {
    const f = frontmatter(skillText(n));
    ist(`Frontmatter ${n}: lesbar`, 'felder' in f, true);
    if (!('felder' in f)) continue;
    ist(`Frontmatter ${n}: name = Ordnername`, f.felder.name, n);
    nameVon[n] = f.felder.name;
    beschreibungen[n] = f.felder.description ?? '';
    ist(`Frontmatter ${n}: nur name und description (laut Binärdatei erlaubt sind noch license, allowed-tools, metadata)`, Object.keys(f.felder).sort(), ['description', 'name']);
    ist(`Frontmatter ${n}: name ist hyphen-case (laut Binärdatei)`, /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.felder.name), true);
    ist(`Frontmatter ${n}: die Beschreibung bricht kein YAML`, yamlProbleme(beschreibungen[n]), []);
  }
  ist('Frontmatter: alle Namen verschieden', new Set(Object.values(nameVon)).size, Object.values(nameVon).length);
  ist('Frontmatter: keine zwei gleichen Beschreibungen', new Set(Object.values(beschreibungen)).size, Object.values(beschreibungen).length);

  const phrasen = d => [...d.matchAll(/«([^»]+)»/g)].map(m => m[1].toLowerCase());
  const alleMeine = new Map();
  for (const n of MEINE) {
    const d = beschreibungen[n] ?? '';
    ist(`Beschreibung ${n}: 40 bis 400 Zeichen (Codex erlaubt laut Binärdatei 1024)`, d.length >= 40 && d.length <= 400, true);
    ist(`Beschreibung ${n}: nennt, wann sie gilt («Verwenden bei») und wann nicht («Nicht»)`, [d.includes('Verwenden bei «'), /\bNicht (?:für|zum)\b/.test(d)], [true, true]);
    ist(`Beschreibung ${n}: kein LIVE=1 in der Beschreibung`, d.includes('LIVE=1'), false);
    for (const p of phrasen(d)) {
      const schonBei = alleMeine.get(p);
      ist(`Auslöser «${p}» gehört nur zu einem Skill`, schonBei === undefined || schonBei === n, true);
      alleMeine.set(p, n);
    }
    for (const m of d.matchAll(/dafür ([a-z-]+)\)/g)) ist(`Beschreibung ${n}: der Verweis «dafür ${m[1]}» zeigt auf einen vorhandenen Skill`, ordner.includes(m[1]), true);
  }
  // Trefferprobe: eine Bitte wählt genau den passenden Skill (über die Auslöser in «…») und eine fremde Bitte keinen.
  const treffer = (bitte, p) => new RegExp(`(?<![\\p{L}\\p{N}])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(bitte);
  const waehle = bitte => MEINE.filter(n => phrasen(beschreibungen[n] ?? '').some(p => treffer(bitte, p)));
  ist('Trefferprobe: Messgerät, ganze Wörter zählen und Teilwörter nicht', [treffer('Zeig den Stand', 'stand'), treffer('Wie viel Lagerbestand', 'stand'), treffer('git status!', 'git status')], [true, false, true]);
  for (const [bitte, soll] of [['Zeig mir den Stand', ['stand']], ['bitte git status', ['stand']], ['Shop-Puls bitte', ['shop-puls']], ['wie läuft der Shop heute', ['shop-puls']], ['CJ-Lieferbarkeit prüfen für abc-123', ['lieferbar']], ['Trend-Kandidaten bitte', ['trend']], ['was darf ich hier nicht', ['regeln']], ['Regeln', ['regeln']]]) {
    ist(`Trefferprobe «${bitte}»`, waehle(bitte), soll);
  }
  for (const fremd of ['Schreib mir einen Newsletter', 'Wie ist der Status der Bestellung 1031', 'Wie viel Lagerbestand hat das Produkt', 'Lege die Kollektion an']) ist(`Trefferprobe, Gegenprobe «${fremd}» wählt keinen`, waehle(fremd), []);
  for (const n of MEINE) ist(`SKILL.md ${n}: höchstens 6000 Zeichen (jede Nutzung lädt den ganzen Text in den Kontext)`, skillText(n).length <= 6000, true);
}

// === 3. Befehle in den Skills: wörtlich, nur lesend, vorhandene Skripte ==========================================
const GUARD = "HANDLES='<geprüfte Liste>' ERNEUT=1 LIVE=0 /opt/node22/bin/node automation/lieferbarkeit_guard.mjs";
const HEREDOC_KOPF = `node "<Skill-Ordner>/scripts/handles.mjs" <<'LUXE_ENDE_7K3Q'`;
const ERWARTETE_BEFEHLE = {
  stand: [['GIT_OPTIONAL_LOCKS=0 git status -sb', 'git log --oneline -5']],
  'shop-puls': [['env -u TELEGRAM_BOT_TOKEN -u TELEGRAM_CHAT_ID /opt/node22/bin/node automation/autopilot/shop_pulse.mjs']],
  lieferbar: [[HEREDOC_KOPF, '<die Handles, wie genannt>', 'LUXE_ENDE_7K3Q'], [GUARD]],
  trend: [['LIVE=0 /opt/node22/bin/node automation/trend_entdecken.mjs']],
  regeln: [['node "<Skill-Ordner>/scripts/regeln.mjs"']],
};
const bloecke = Object.fromEntries(MEINE.map(n => [n, codeBloecke(skillText(n))]));
for (const n of MEINE) {
  ist(`Befehle ${n}: genau die erwarteten Code-Blöcke, Wort für Wort`, bloecke[n], ERWARTETE_BEFEHLE[n]);
  const text = skillText(n);
  ist(`SKILL.md ${n}: LIVE=1 steht nur dort, wo es verboten wird`, liveOhneVerbot(text), []);
  ist(`SKILL.md ${n}: kein LIVE=1 in einem Code-Block`, bloecke[n].flat().filter(z => z.includes('LIVE=1')), []);
  for (const zeile of bloecke[n].flat()) ist(`Befehl «${zeile.slice(0, 60)}» enthält nichts Schreibendes`, verboteneBefehle(zeile), []);
}
{
  // Flags, aus dem Text gelesen, nicht von Hand angenommen.
  const p = z => parseBefehl(z);
  const [status, log] = bloecke.stand[0].map(p);
  ist('stand: git status -sb ohne Index-Schreiben, git log --oneline -5', [status.env, status.argv, log.argv], [{ GIT_OPTIONAL_LOCKS: '0' }, ['git', 'status', '-sb'], ['git', 'log', '--oneline', '-5']]);
  const puls = p(bloecke['shop-puls'][0][0]);
  ist('shop-puls: beide Telegram-Zugänge werden mit env -u ENTFERNT, Programm ist das Skript', [puls.entfernt, puls.env, puls.argv], [['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'], {}, [NODE_PFAD_IN_SKILLS, 'automation/autopilot/shop_pulse.mjs']]);
  const g = p(bloecke.lieferbar[1][0]);
  ist('lieferbar: HANDLES, ERNEUT=1 und LIVE=0, das Wächter-Skript', [g.env, g.argv], [{ HANDLES: '<geprüfte Liste>', ERNEUT: '1', LIVE: '0' }, [NODE_PFAD_IN_SKILLS, 'automation/lieferbarkeit_guard.mjs']]);
  const t = p(bloecke.trend[0][0]);
  ist('trend: LIVE=0 und das Trend-Skript', [t.env, t.argv], [{ LIVE: '0' }, [NODE_PFAD_IN_SKILLS, 'automation/trend_entdecken.mjs']]);
  const r = p(bloecke.regeln[0][0]);
  ist('regeln: das Skript im Skill-Ordner, ohne Argument', r.argv, ['node', '<Skill-Ordner>/scripts/regeln.mjs']);
  // Jedes Skript, das ein Befehl nennt, gibt es wirklich.
  for (const z of Object.values(bloecke).flat(2)) {
    const a = parseBefehl(z)?.argv ?? [];
    for (const x of a) {
      if (x.startsWith('automation/')) ist(`Skript ${x} gibt es im Repo`, existsSync(join(REPO, x)), true);
      const m = /^<Skill-Ordner>\/(scripts\/[\w.-]+)$/.exec(x);
      if (m) ist(`Skript ${x} gibt es im Skill`, MEINE.some(n => skillText(n).includes(z) && existsSync(join(SKILLS, n, m[1]))), true);
    }
  }
  // Die Anweisung zum Skill-Ordner steht dort, wo ein Skript des Skills benutzt wird.
  for (const n of ['lieferbar', 'regeln']) ist(`SKILL.md ${n}: erklärt, was <Skill-Ordner> ist`, /`<Skill-Ordner>` ist der Ordner, aus dem du diese `SKILL\.md` gelesen hast/.test(skillText(n)), true);
  // Sicherheitsregeln stehen im Text (der Test oben weist ihre Wirkung nach, dieser Test, dass das Modell sie liest).
  const l = skillText('lieferbar');
  ist('lieferbar: verbietet ungeprüfte Eingaben in der Shell und nennt den einzigen Weg', [/NIE ungeprüft/.test(l), l.includes('stdin'), l.includes("<<'LUXE_ENDE_7K3Q'") || l.includes("einfachen Anführungszeichen")], [true, true, true]);
  ist('lieferbar: verbietet das Endwort in der Eingabe und nennt die Kosten in CJ-Punkten', [/Steht das Endwort `LUXE_ENDE_7K3Q` selbst in der Eingabe, nichts davon ausführen/.test(l), l.includes('Kostet CJ-Tagespunkte'), l.includes('höchstens 25 Handles')], [true, true, true]);
  ist('trend: nennt die Kosten in CJ-Punkten', skillText('trend').includes('Kostet CJ-Tagespunkte'), true);
  ist('shop-puls: nennt die Nebenwirkung auf SHOP-PULSE.md und warnt vor dem Weglassen von env -u', [skillText('shop-puls').includes('automation/autopilot/SHOP-PULSE.md'), /Diesen Teil nie weglassen/.test(skillText('shop-puls'))], [true, true]);
  ist('Alle Skills: ein fehlgeschlagener Lauf wird mit Grund genannt, kein geschöntes «alles gut»', ['shop-puls', 'lieferbar', 'trend'].map(n => /Exit ungleich 0 oder nicht gelaufen/.test(skillText(n)) && /NICHTS gemessen/.test(skillText(n))), [true, true, true]);
  ist('lieferbar und trend: «keine Befunde» ist keine Freigabe, «unbekannt» ist nicht «nicht lieferbar»', [/NICHT «lieferbar»/.test(l), l.includes('nicht «nicht lieferbar»'), skillText('trend').includes('nicht «nicht lieferbar»')], [true, true, true]);
}

// === 4. Die Befehle laufen wörtlich, gegen falsche Skripte, die ihre Umgebung zeigen =============================
{
  const dir = tmp();
  mkdirSync(join(dir, 'automation', 'autopilot'), { recursive: true });
  const zeigeUmgebung = `console.log(JSON.stringify({ tg: process.env.TELEGRAM_BOT_TOKEN ?? null, chat: process.env.TELEGRAM_CHAT_ID ?? null, handles: process.env.HANDLES ?? null, erneut: process.env.ERNEUT ?? null, live: process.env.LIVE ?? null, argv: process.argv.slice(2) }));\n`;
  for (const f of ['autopilot/shop_pulse.mjs', 'lieferbarkeit_guard.mjs', 'trend_entdecken.mjs']) writeFileSync(join(dir, 'automation', f), zeigeUmgebung);
  const elternUmgebung = { TELEGRAM_BOT_TOKEN: 'tg-test-wert', TELEGRAM_CHAT_ID: '4711', LIVE: '1' };
  const mitNode = zeile => (existsSync(NODE_PFAD_IN_SKILLS) ? zeile : zeile.replace(NODE_PFAD_IN_SKILLS, NODE));
  const zeigt = zeile => { const r = bash(mitNode(zeile), dir, elternUmgebung); return { code: r.status, aus: r.stdout.trim() ? JSON.parse(r.stdout.trim().split('\n').pop()) : null, err: r.stderr }; };

  // shop-puls
  const pulsZeile = bloecke['shop-puls'][0][0];
  const puls = zeigt(pulsZeile);
  ist('shop-puls: der Befehl aus dem Skill entfernt die Telegram-Zugänge vor dem Skript', [puls.code, puls.aus?.tg, puls.aus?.chat], [0, null, null]);
  const ohneEnv = zeigt(pulsZeile.replace(/^env (?:-u \w+ )+/, ''));
  ist('shop-puls: Gegenprobe, ohne «env -u» sähe das Skript die Zugänge (das Messgerät sieht sie)', [ohneEnv.aus?.tg, ohneEnv.aus?.chat], ['tg-test-wert', '4711']);
  const nurEiner = zeigt(pulsZeile.replace(' -u TELEGRAM_CHAT_ID', ''));
  ist('shop-puls: Gegenprobe, mit nur einem «-u» bliebe die Chat-Kennung (Mutation wird sichtbar)', [nurEiner.aus?.tg, nurEiner.aus?.chat], [null, '4711']);

  // lieferbar: die Liste wird eingesetzt, LIVE bleibt 0 trotz LIVE=1 in der Umgebung
  const wachZeile = bloecke.lieferbar[1][0].replace('<geprüfte Liste>', 'abc-def,ghi-jkl');
  const wach = zeigt(wachZeile);
  ist('lieferbar: HANDLES, ERNEUT=1 und LIVE=0 kommen im Skript an, auch wenn die Umgebung LIVE=1 trägt', [wach.code, wach.aus?.handles, wach.aus?.erneut, wach.aus?.live], [0, 'abc-def,ghi-jkl', '1', '0']);
  const wachOhne = zeigt(wachZeile.replace(' LIVE=0', ''));
  ist('lieferbar: Gegenprobe, ohne «LIVE=0» erbte das Skript LIVE=1 aus der Umgebung', wachOhne.aus?.live, '1');

  // trend
  const trendZeile = bloecke.trend[0][0];
  const trend = zeigt(trendZeile);
  ist('trend: LIVE=0 kommt im Skript an, auch wenn die Umgebung LIVE=1 trägt', [trend.code, trend.aus?.live], [0, '0']);
  ist('trend: Gegenprobe, ohne «LIVE=0» erbte das Skript LIVE=1', zeigt(trendZeile.replace('LIVE=0 ', '')).aus?.live, '1');
  rmSync(dir, { recursive: true, force: true });
}
{
  // stand: in einem echten kleinen Repo, und ausserhalb eines Repos mit Fehlertext
  const dir = tmp();
  const git = (...a) => lauf('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'init.defaultBranch=main', ...a], { cwd: dir, env: UMGEBUNG(dir, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }) });
  git('init', '-q');
  writeFileSync(join(dir, 'a.txt'), 'a\n');
  git('add', 'a.txt');
  git('commit', '-q', '-m', 'Erster Stand');
  writeFileSync(join(dir, 'a.txt'), 'geändert\n');
  writeFileSync(join(dir, 'neu.txt'), 'neu\n');
  const vorher = lauf('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout;
  const [zeileStatus, zeileLog] = bloecke.stand[0];
  const s = bash(zeileStatus, dir, { GIT_CONFIG_GLOBAL: '/dev/null' });
  const l = bash(zeileLog, dir, { GIT_CONFIG_GLOBAL: '/dev/null' });
  ist('stand: Status zeigt Branch, geänderte und unbekannte Datei', [s.status, s.stdout.includes('## main'), s.stdout.includes(' M a.txt'), s.stdout.includes('?? neu.txt')], [0, true, true, true]);
  ist('stand: Log zeigt den Commit in einer Zeile', [l.status, l.stdout.trim().split('\n').length, l.stdout.includes('Erster Stand')], [0, 1, true]);
  ist('stand: lesend, HEAD und Arbeitsbaum bleiben unverändert', [lauf('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout === vorher, readFileSync(join(dir, 'a.txt'), 'utf8')], [true, 'geändert\n']);
  const leer = tmp();
  const ausserhalb = bash(zeileStatus, leer, { GIT_CEILING_DIRECTORIES: dirname(leer) });
  ist('stand: ausserhalb eines Repos ein Exit ungleich 0 mit Fehlertext (den der Skill wörtlich nennen lässt)', [ausserhalb.status !== 0, /not a git repository/.test(ausserhalb.stderr)], [true, true]);
  rmSync(dir, { recursive: true, force: true });
  rmSync(leer, { recursive: true, force: true });
}

// === 5. Handles: Muster, Grenzen, Einschleusen ====================================================================
const hs = n => Array.from({ length: n }, (_, i) => `produkt-${i + 100}`);
{
  ist('Grenzen laut Auftrag: 25 Handles, 80 Zeichen je Handle', [MAX_HANDLES, MAX_LAENGE], [25, 80]);
  ist('gültig: ein Handle', pruefeHandles('elektrischer-fleischwolf-5l-kuchenmaschine-656962'), { handles: ['elektrischer-fleischwolf-5l-kuchenmaschine-656962'] });
  ist('gültig: Komma, Leerzeichen und beides gemischt als Trenner', [pruefeHandles('abc,def'), pruefeHandles('abc def'), pruefeHandles('abc, def ,ghi')], [{ handles: ['abc', 'def'] }, { handles: ['abc', 'def'] }, { handles: ['abc', 'def', 'ghi'] }]);
  ist('gültig: Doppelte zählen einmal, die Reihenfolge bleibt', pruefeHandles('b,a,b,a,c'), { handles: ['b', 'a', 'c'] });
  ist('gültig: Ziffer als erstes Zeichen, Doppel-Bindestrich innen, Bindestrich am Ende, ein Zeichen', pruefeHandles('0abc a--b ab- x'), { handles: ['0abc', 'a--b', 'ab-', 'x'] });
  ist('gültig: Umbruch am Ende (so endet ein Heredoc), CRLF am Ende und Rand-Leerzeichen', [pruefeHandles('abc\n'), pruefeHandles('abc\r\n'), pruefeHandles(' \t abc \n\n')], [{ handles: ['abc'] }, { handles: ['abc'] }, { handles: ['abc'] }]);
  ist('Grenze 25: genau 25 gehen durch, 26 nicht', [pruefeHandles(hs(25).join(',')).handles?.length, 'fehler' in pruefeHandles(hs(26).join(',')), pruefeHandles(hs(26).join(',')).fehler?.includes('Zu viele Handles: 26')], [25, true, true]);
  ist('Grenze 25: Doppelte zählen nicht mit (26 Angaben aus 25 verschiedenen gehen durch)', pruefeHandles([...hs(25), 'produkt-100'].join(',')).handles?.length, 25);
  const lang = n => `a${'b'.repeat(n - 1)}`;
  ist('Grenze 80: 80 Zeichen gehen durch, 81 nicht', [pruefeHandles(lang(80)).handles?.[0].length, 'fehler' in pruefeHandles(lang(81)), pruefeHandles(lang(81)).fehler?.includes('81 Zeichen')], [80, true, true]);
  ist('Grenze Eingabe: genau 5000 Zeichen werden gelesen (hier als Handle zu lang), 5001 sind zu lang', [pruefeHandles('a'.repeat(MAX_EINGABE)).fehler?.includes('Handle zu lang'), pruefeHandles('a'.repeat(MAX_EINGABE + 1)).fehler?.includes('Eingabe zu lang')], [true, true]);
  ist('Zeilenumbruch mitten in der Eingabe hat einen eigenen Fehlertext (nicht den allgemeinen)', ['abc\ndef', 'abc\r\ndef', 'abc,\n\ndef', 'abc\ndef\n'].map(t => pruefeHandles(t).fehler?.startsWith('Zeilenumbruch in der Eingabe')), [true, true, true, true]);
  for (const leer of ['', ' ', '   ', ',', ' , , ', '\n', '\r\n\r\n', '\t']) ist(`leer: ${JSON.stringify(leer)} gibt die Hilfe`, pruefeHandles(leer).fehler?.includes('Keine Handles angegeben') && pruefeHandles(leer).fehler?.includes(AUFRUF), true);
  for (const kein of [undefined, null, 5, {}, ['abc']]) ist(`kein Text: ${JSON.stringify(kein)} ist ein Fehler, keine Ausnahme`, 'fehler' in pruefeHandles(kein), true);

  const einschleusen = [
    ['Semikolon', 'abc; rm -rf /'], ['Semikolon ohne Leerzeichen', 'abc;touch PWNED'], ['$(…)', 'abc,$(touch PWNED)'], ['${…}', '${IFS}'], ['$VAR', '$HOME'], ['Backticks', '`touch PWNED`'],
    ['Zeilenumbruch mit zweiter Zeile', 'abc\ntouch PWNED'], ['Zeilenumbruch gültiger Handles', 'abc\ndef'], ['Wagenrücklauf', 'abc\rdef'], ['doppeltes Minus', '--'], ['führendes Minus', '-rf'],
    ['Option wie ein Handle', '--help'], ['Option nach einem Handle', 'abc --version'], ['nur Minus', '-'], ['Unicode-Umlaut', 'äpfel-123'], ['Unicode-Vollbreite', 'ａｂｃ'], ['Emoji', 'abc😀'],
    ['Eszett', 'strasse-ß'], ['Grossbuchstaben', 'ABC-DEF'], ['Unterstrich', 'abc_def'], ['Punkt', 'abc.def'], ['Schrägstrich', 'abc/def'], ['Pfad nach oben', '../../etc/passwd'], ['URL', 'https://luxestyle.ch/products/abc'],
    ['Pipe', 'abc|def'], ['Und-Zeichen', 'abc&&def'], ['Umleitung', 'abc>def'], ['Anführungszeichen', '"abc"'], ['Apostroph', "a'b"], ['Backslash', 'a\\b'], ['Stern', 'abc*'], ['Fragezeichen', 'abc?'], ['Tab im Handle', 'abc\tdef'],
    ['Null-Byte', 'abc\0def'], ['geschütztes Leerzeichen', 'abc def'], ['Zeilentrenner U+2028', 'abc def'], ['Klammern', 'abc(def)'], ['Tilde', '~'], ['Gleichheitszeichen', 'LIVE=1'], ['Gleichheitszeichen klein', 'live=1'],
    ['Handle mit LIVE-Zuweisung', 'abc-def LIVE=1'],
  ];
  for (const [name, text] of einschleusen) {
    const u = pruefeHandles(text);
    ist(`Einschleusen «${name}» wird abgewiesen`, 'fehler' in u, true);
  }
  ist('Einschleusen: der Fehler benennt, was nicht passt, und zeigt nur harmlose Zeichen', (() => {
    const f = pruefeHandles('abc;rm -rf').fehler;
    return [f.startsWith('Kein gültiger Handle: «abc?rm»'), f.includes('«-rf»'), /[;`$|&<>\\]/.test(f)];
  })(), [true, true, false]);
  ist('sichtbar: ersetzt jedes Zeichen ausser A-Z a-z 0-9 . _ - und kürzt', [sichtbar('a;b$(c)`d\n"e\'|&<>\\\u0000ä😀'), sichtbar('x'.repeat(30)), sichtbar('ok-1.2_3'), sichtbar(undefined)], [`«a?b??c??d??e${'?'.repeat(9)}»`, `«${'x'.repeat(24)}…»`, '«ok-1.2_3»', '«»']);
}

// Fuzz: gleich welche Eingabe, was durchgeht, ist sicher; was abgewiesen wird, echot nur Harmloses.
{
  let z = 0x2545f491;
  const zufall = () => { z ^= z << 13; z >>>= 0; z ^= z >>> 17; z ^= z << 5; z >>>= 0; return z / 4294967296; };
  const zeichen = ['a', 'b', 'x', 'z', '0', '5', '9', '-', '-', ',', ' ', ';', '$', '(', ')', '`', '\n', '\t', '\\', "'", '"', '|', '&', '<', '>', '*', '?', '{', '}', 'A', 'Z', '_', '.', '/', 'ä', 'ß', '😀', ' ', '='];
  let ok = 0, abgewiesen = 0, schlecht = [];
  for (let i = 0; i < 4000; i += 1) {
    const n = Math.floor(zufall() * 70);
    let s = '';
    // Dreiviertel der Fälle bestehen aus guten Bausteinen, damit der Annahmepfad oft genug läuft.
    for (let k = 0; k < n; k += 1) s += i % 4 === 0 ? zeichen[Math.floor(zufall() * zeichen.length)] : ['abc', 'def-1', 'x9', ',', ' ', 'q-r'][Math.floor(zufall() * 6)];
    if (i % 17 === 0) s += zeichen[Math.floor(zufall() * zeichen.length)];
    const u = pruefeHandles(s);
    if ('handles' in u) {
      ok += 1;
      const zeile = u.handles.join(',');
      if (!/^[a-z0-9][a-z0-9,-]*$/.test(zeile) || u.handles.length > MAX_HANDLES || u.handles.length === 0 || new Set(u.handles).size !== u.handles.length || u.handles.some(h => h.length > MAX_LAENGE || !/^[a-z0-9][a-z0-9-]*$/.test(h))) schlecht.push(JSON.stringify(s));
    } else {
      abgewiesen += 1;
      for (const m of u.fehler.matchAll(/«([^»]*)»/g)) if (!/^[A-Za-z0-9._?-]*…?$/.test(m[1])) schlecht.push(`Echo ${JSON.stringify(m[1])}`);
      if (/[;`$|&<>\\\r\0]/.test(u.fehler.replace(AUFRUF, ''))) schlecht.push(`Fehlertext ${JSON.stringify(u.fehler)}`);
    }
  }
  ist('Fuzz (4000 Eingaben): nichts Unsicheres geht durch, kein Echo mit Gefährlichem', schlecht.slice(0, 3), []);
  ist('Fuzz: beide Wege wurden wirklich begangen (Gegenprobe zum Messgerät)', [ok > 200, abgewiesen > 200], [true, true]);
}

// handles.mjs als Prozess
const HANDLES_SKRIPT = join(SKILLS, 'lieferbar', 'scripts', 'handles.mjs');
const handlesLauf = (eingabe, args = []) => lauf(NODE, [HANDLES_SKRIPT, ...args], { input: eingabe });
{
  const g = handlesLauf('abc-def, ghi\n');
  ist('handles.mjs: gültige Eingabe → Exit 0, EINE Zeile mit der Liste, nichts auf stderr', [g.status, g.stdout, g.stderr], [0, 'abc-def,ghi\n', '']);
  const f = handlesLauf('abc; rm -rf /\n');
  ist('handles.mjs: ungültige Eingabe → Exit 2, Fehlertext auf stderr, stdout leer', [f.status, f.stdout, f.stderr.startsWith('Kein gültiger Handle')], [2, '', true]);
  ist('handles.mjs: leere Eingabe → Exit 2 mit Hilfe', [handlesLauf('').status, handlesLauf('').stderr.includes('Keine Handles angegeben')], [2, true]);
  const ohneStdin = lauf(NODE, [HANDLES_SKRIPT], { stdio: ['ignore', 'pipe', 'pipe'] });
  ist('handles.mjs: stdin ist /dev/null → Exit 2 (nichts gelesen)', [ohneStdin.status, ohneStdin.stderr.includes('Keine Handles angegeben')], [2, true]);
  const arg = handlesLauf('abc\n', ['abc']);
  ist('handles.mjs: ein Argument wird abgewiesen (Eingabe nur über stdin), stdin bleibt ungelesen', [arg.status, arg.stdout, arg.stderr.includes('nur über stdin')], [2, '', true]);
  ist('handles.mjs: auch «--» als Argument wird abgewiesen, nicht als Optionsende gedeutet', [handlesLauf('abc\n', ['--']).status, handlesLauf('abc\n', ['--', 'abc']).status], [2, 2]);
  const gross = handlesLauf('a'.repeat(MAX_EINGABE * 4 + 500));
  ist('handles.mjs: riesige Eingabe → Exit 2 «zu lang», ohne alles zu laden', [gross.status, gross.stderr.includes('Eingabe zu lang')], [2, true]);
  ist('handles.mjs: 5001 Zeichen → Exit 2 «zu lang»', [handlesLauf('a '.repeat(2501)).status, handlesLauf('a '.repeat(2501)).stderr.includes('Eingabe zu lang')], [2, true]);
  ist('handles.mjs: 25 Handles → Exit 0, 26 → Exit 2', [handlesLauf(hs(25).join(',')).status, handlesLauf(hs(26).join(',')).status], [0, 2]);
  ist('handles.mjs: 80 Zeichen → Exit 0, 81 → Exit 2', [handlesLauf('a'.repeat(80)).status, handlesLauf('a'.repeat(81)).status], [0, 2]);
  ist('handles.mjs: UTF-8-Mehrbytezeichen werden als Zeichen gezählt und abgewiesen (kein Absturz)', [handlesLauf('äöü😀').status, handlesLauf('😀'.repeat(1500)).status], [2, 2]);
  ist('handles.mjs: Null-Byte und ungültiges UTF-8 → Exit 2, kein Absturz', [lauf(NODE, [HANDLES_SKRIPT], { input: Buffer.from([0x61, 0x00, 0x62]) }).status, lauf(NODE, [HANDLES_SKRIPT], { input: Buffer.from([0xff, 0xfe, 0x61]) }).status], [2, 2]);
  for (const [name, text] of [['Semikolon', 'abc; rm -rf /'], ['$(…)', '$(touch PWNED)'], ['Backticks', '`id`'], ['Zeilenumbruch', 'abc\ndef'], ['doppeltes Minus', '--'], ['führendes Minus', '-rf'], ['Unicode', 'äpfel'], ['26 Handles', hs(26).join(' ')]]) {
    const r = handlesLauf(text);
    ist(`handles.mjs: Einschleusen «${name}» → Exit 2, stdout leer`, [r.status, r.stdout], [2, '']);
  }
}

// === 6. Die Prüfung steht in der Shell-Kette: Heredoc mit Endwort in einfachen Anführungszeichen ==================
{
  const block = bloecke.lieferbar[0];
  const dir = tmp();
  const baue = nutzlast => [block[0].replace('<Skill-Ordner>', join(SKILLS, 'lieferbar')), nutzlast, block[2]].join('\n');
  const marker = join(dir, 'PWNED');
  const lauft = nutzlast => { const r = bash(baue(nutzlast), dir); const da = existsSync(marker); rmSync(marker, { force: true }); return { status: r.status, stdout: r.stdout, stderr: r.stderr, da }; };

  const gut = lauft('abc-def, ghi');
  ist('Heredoc aus dem Skill: gültige Eingabe → Exit 0 und die geprüfte Liste', [gut.status, gut.stdout, gut.da], [0, 'abc-def,ghi\n', false]);
  const nutzlasten = ['abc; touch PWNED', '$(touch PWNED)', '`touch PWNED`', 'abc\ntouch PWNED', 'abc && touch PWNED', 'abc | touch PWNED', 'abc > PWNED', 'abc\r\ntouch PWNED', '--', '-rf', '--help', 'abc --version', 'äpfel-123', 'ａｂｃ', 'abc😀', '${IFS}', '$HOME', "a'b", '"abc"', 'ABC-DEF', '../../etc/passwd', 'https://luxestyle.ch/products/abc', '$(touch PWNED); `touch PWNED`', 'abc\\\ntouch PWNED', hs(26).join(',')];
  for (const n of nutzlasten) {
    const r = lauft(n);
    ist(`Heredoc aus dem Skill: «${JSON.stringify(n).slice(0, 50)}» wird abgewiesen (Exit 2), die Shell führt nichts aus`, [r.status, r.stdout, r.da], [2, '', false]);
  }

  // Gegenproben: die verbotenen Formen führen die Eingabe WIRKLICH aus (sonst wäre diese Prüfung blind).
  bash(`printf '%s\\n' "abc $(touch PWNED)" | node ${JSON.stringify(HANDLES_SKRIPT)}`, dir);
  ist('Gegenprobe: die Eingabe in Anführungszeichen vor die Prüfung gesetzt führt $(…) aus (darum verbietet es der Skill)', existsSync(marker), true);
  rmSync(marker, { force: true });
  const ctrl2 = bash(`node ${JSON.stringify(HANDLES_SKRIPT)} <<EINGABE\n$(touch PWNED)\nEINGABE`, dir);
  ist('Gegenprobe: ein Heredoc mit Endwort OHNE einfache Anführungszeichen führt $(…) aus (darum steht das Endwort im Skill in einfachen)', [existsSync(marker), ctrl2.status], [true, 2]);
  rmSync(marker, { force: true });
  bash(baue('abc\nLUXE_ENDE_7K3Q\ntouch PWNED'), dir);
  ist('Gegenprobe: steht das Endwort selbst in der Eingabe, bricht die Shell aus (darum verbietet der Skill, dann etwas auszuführen)', existsSync(marker), true);
  rmSync(marker, { force: true });
  ist('Heredoc im Skill: Endwort in einfachen Anführungszeichen, Endwort am Zeilenanfang', [/<<'[A-Z0-9_]{8,}'$/.test(block[0]), block[2] === /<<'([A-Z0-9_]+)'$/.exec(block[0])?.[1]], [true, true]);
  rmSync(dir, { recursive: true, force: true });
}

// === 7. Regeln: Bericht gegen echte und falsche Module =============================================================
const REGELN_ECHT = join(WURZEL, 'lib', 'regeln.mjs');
const GUT_QUELLE = `
export const AUSWEGE = ['LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK'];
export function pruefeBash(b, trocken = []) {
  const roh = String(b);
  for (const [muster, ausweg] of [[/push --force/, 'LUXE_FORCE_OK'], [/\\bpkill\\b/, 'LUXE_KILL_OK'], [/git add -A/, 'LUXE_ADD_OK']]) {
    if (muster.test(roh) && !roh.includes(ausweg + '=1')) return { deny: 'gesperrt, Ausweg ' + ausweg };
  }
  if (/_SOCIAL_STOPP/.test(roh)) return { deny: 'wird nie neu angelegt' };
  if (/LIVE=1/.test(roh) && !roh.includes('LUXE_LIVE_OK=1') && !trocken.some(s => roh.includes(s))) return { deny: 'erst Trockenlauf' };
  return undefined;
}
export function pruefeInhalt(text) {
  if (text.includes('luxe-geheim-ok')) return undefined;
  return /shpat_[0-9a-f]{32}/.test(text) ? { deny: 'sieht nach einem Geheimnis aus' } : undefined;
}
`;
const modulAus = quelle => import(`data:text/javascript;base64,${Buffer.from(quelle).toString('base64')}`);
const mutiere = (von, nach) => { if (!GUT_QUELLE.includes(von)) throw new Error(`Mutation passt nicht: ${von}`); return GUT_QUELLE.replace(von, nach); };
{
  ist('Bericht: sechs Regeln mit Namen, Beispiel und genau einer Art von Beispiel', BERICHT_REGELN.map(r => [typeof r.name, Boolean(r.befehl) !== Boolean(r.inhalt)]), BERICHT_REGELN.map(() => ['string', true]));
  ist('Bericht: Auswege der Regeln sind die vier der Leitplanken', BERICHT_REGELN.map(r => r.ausweg).filter(Boolean), ['LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK']);
  ist('Bericht: das Geheimnis-Beispiel entsteht erst zur Laufzeit (kein Schlüssel in der Quelle)', [geheimnisProbe().startsWith('shpat_'), /shpat_[0-9a-f]{32}/.test(readFileSync(join(WURZEL, 'lib', 'regeln_bericht.mjs'), 'utf8'))], [true, false]);
  ist('schnittstelleFehlt: vollständiges Modul → nichts', schnittstelleFehlt({ pruefeBash() {}, pruefeInhalt() {}, AUSWEGE: [] }), []);
  ist('schnittstelleFehlt: leeres Objekt, null, falsche Arten → alles Fehlende', [schnittstelleFehlt({}), schnittstelleFehlt(null), schnittstelleFehlt({ pruefeBash: 1, pruefeInhalt() {}, AUSWEGE: 'x' })], [Object.keys(ERWARTET), Object.keys(ERWARTET), ['pruefeBash', 'AUSWEGE']]);

  const gut = bericht(await modulAus(GUT_QUELLE));
  ist('Bericht gegen ein passendes Modul: keine Abweichung, Schlusszeile', [gut.abweichungen, gut.text.split('\n').at(-1)], [[], 'Messung: alle 6 Regeln wie erwartet.']);
  for (const wort of ['Kein Force-Push', 'Kein pkill und kein killall', 'git add -A', '_SOCIAL_STOPP', 'LIVE=1', 'Geheimnisse', 'LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK', 'luxe-geheim-ok', 'Gegenproben']) {
    ist(`Bericht nennt «${wort}»`, gut.text.includes(wort), true);
  }
  ist('Bericht: das Geheimnis-Beispiel steht nie im Text', gut.text.includes(geheimnisProbe()), false);
  ist('Bericht: Regel ohne Ausweg sagt «keiner», die anderen nennen ihren Ausweg', [/_SOCIAL_STOPP[\s\S]*?Ausweg: keiner/.test(gut.text), (gut.text.match(/Ausweg: LUXE_[A-Z]+_OK=1 vor den Befehl \(gemessen: dann frei\)/g) ?? []).length], [true, 4]);

  const abw = async (name, quelle, erwartet) => {
    const b = bericht(await modulAus(quelle));
    ist(`Bericht, Gegenprobe «${name}»: Abweichung wird gemeldet`, [b.abweichungen.length > 0, erwartet.every(w => b.abweichungen.join(' | ').includes(w)), b.text.split('\n').at(-1).startsWith('ABWEICHUNG')], [true, true, true]);
    return b;
  };
  const NICHTS_QUELLE = "export const AUSWEGE = ['LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK']; export const pruefeBash = () => undefined; export const pruefeInhalt = () => undefined;";
  const nichtsGesperrt = await abw('nichts wird gesperrt', NICHTS_QUELLE, ['Regel 1', 'Regel 4', 'Regel 5', 'Regel 6', 'NICHT gesperrt']);
  ist('…und es sind alle sechs Regeln', nichtsGesperrt.abweichungen.filter(a => a.includes('NICHT gesperrt')).length, 6);
  await abw('alles wird gesperrt', mutiere('return undefined;\n}\nexport function pruefeInhalt', "return { deny: 'alles' };\n}\nexport function pruefeInhalt"), ['macht das Beispiel NICHT frei', 'Gegenprobe «git status -sb» wird gesperrt']);
  await abw('ein neuer Ausweg ohne Regel', GUT_QUELLE.replace("'LUXE_LIVE_OK']", "'LUXE_LIVE_OK', 'LUXE_NEU_OK']"), ['LUXE_NEU_OK steht in AUSWEGE']);
  await abw('ein Ausweg fehlt in der Liste', GUT_QUELLE.replace(", 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK']", ", 'LUXE_ADD_OK', 'LUXE_LIVE_OK']"), ['LUXE_KILL_OK steht nicht in AUSWEGE']);
  await abw('_SOCIAL_STOPP bekäme einen Ausweg', mutiere("if (/_SOCIAL_STOPP/.test(roh))", "if (/_SOCIAL_STOPP/.test(roh) && !roh.includes('LUXE_FORCE_OK=1'))"), ['hebt die Sperre auf, obwohl sie keinen Ausweg haben soll']);
  await abw('LIVE=1 bliebe nach dem Trockenlauf gesperrt', mutiere('!trocken.some(s => roh.includes(s))', 'true'), ['nach einem Trockenlauf']);
  await abw('der Ausweg für LIVE hebt nichts auf', mutiere("!roh.includes('LUXE_LIVE_OK=1') && ", ''), ['LUXE_LIVE_OK=1 macht das Beispiel NICHT frei']);
  await abw('die Geheimnisprüfung wirft', mutiere("if (text.includes('luxe-geheim-ok')) return undefined;", "throw new Error('kaputt');"), ['wirft eine Ausnahme (kaputt)']);
  await abw('der Marker hilft nicht', mutiere("if (text.includes('luxe-geheim-ok')) return undefined;", ''), ['Marker luxe-geheim-ok macht das Beispiel NICHT frei']);
  await abw('eine Sperre ohne Grund zählt als frei', mutiere("{ deny: 'erst Trockenlauf' }", "{ deny: '  ' }"), ['Regel 5']);
  await abw('die Geheimnisprüfung sperrt nichts', mutiere("? { deny: 'sieht nach einem Geheimnis aus' } : undefined", '? undefined : undefined'), ['Regel 6']);
}
{
  // Der echte Bericht gegen die echte lib/regeln.mjs (von einem anderen Baustein): sichtbar übersprungen, wenn sie fehlt.
  if (existsSync(REGELN_ECHT)) {
    const echt = await import(pathToFileURL(REGELN_ECHT).href);
    ist('Echte lib/regeln.mjs hat die erwartete Schnittstelle', schnittstelleFehlt(echt), []);
    const b = bericht(echt);
    ist('Bericht gegen die echte lib/regeln.mjs: keine Abweichung', b.abweichungen, []);
    // Die Befehle der Skills stolpern nicht über die eigenen Leitplanken und zählen nicht als LIVE.
    const gruppen = await import(pathToFileURL(join(WURZEL, 'lib', 'gruppen.mjs')).href).catch(() => undefined);
    for (const zeile of Object.values(bloecke).flat(2).filter(z => !z.startsWith('<') && !z.startsWith('LUXE_') && !z.includes('<<'))) {
      const u = echt.pruefeBash(zeile.replace('<Skill-Ordner>', join(SKILLS, 'lieferbar')).replace('<geprüfte Liste>', 'abc-def'), []);
      ist(`Leitplanken lassen «${zeile.slice(0, 50)}» durch`, u?.deny, undefined);
      if (gruppen?.istLiveBefehl) ist(`Schreibzähler zählt «${zeile.slice(0, 50)}» nicht als LIVE`, gruppen.istLiveBefehl(zeile.replace('<geprüfte Liste>', 'abc-def')), false);
    }
    ist('Leitplanken lassen den Heredoc-Befehl des Skills durch', echt.pruefeBash(`${bloecke.lieferbar[0].join('\n').replace('<die Handles, wie genannt>', 'abc-def')}`.replace('<Skill-Ordner>', '/x/skills/lieferbar'), [])?.deny, undefined);
    // Keine Datei dieses Bausteins enthält etwas, das die Geheimnis-Regel sperren würde.
    const eigene = ['lib/handles.mjs', 'lib/regeln_bericht.mjs', 'test/befehle_test.mjs', ...MEINE.map(n => `skills/${n}/SKILL.md`), 'skills/lieferbar/scripts/handles.mjs', 'skills/regeln/scripts/regeln.mjs'];
    ist('Geheimnis-Regel findet in den Dateien dieses Bausteins nichts', eigene.filter(f => echt.pruefeInhalt(readFileSync(join(WURZEL, f), 'utf8'))?.deny), []);
  } else {
    console.log('ÜBERSPRUNGEN: lib/regeln.mjs fehlt, der Bericht und die Leitplanken-Gegenprobe gegen den echten Code laufen nicht');
  }
}

// === 8. scripts/regeln.mjs als Prozess, in einer Kopie des Plugins mit mal vorhandenem, mal falschem lib/regeln.mjs
{
  const kopie = quelleDatei => {
    const dir = tmp();
    mkdirSync(join(dir, 'lib'), { recursive: true });
    mkdirSync(join(dir, 'skills', 'regeln'), { recursive: true });
    cpSync(join(WURZEL, 'lib', 'regeln_bericht.mjs'), join(dir, 'lib', 'regeln_bericht.mjs'));
    cpSync(join(SKILLS, 'regeln', 'scripts'), join(dir, 'skills', 'regeln', 'scripts'), { recursive: true });
    if (quelleDatei !== undefined) writeFileSync(join(dir, 'lib', 'regeln.mjs'), quelleDatei);
    return dir;
  };
  const starte = (dir, args = []) => lauf(NODE, [join(dir, 'skills', 'regeln', 'scripts', 'regeln.mjs'), ...args]);

  const fehlt = kopie(undefined);
  const rf = starte(fehlt);
  ist('regeln.mjs ohne lib/regeln.mjs: Exit 1, klare Meldung auf stderr, kein Bericht', [rf.status, rf.stdout, rf.stderr.includes('lib/regeln.mjs fehlt'), rf.stderr.includes('Nichts erraten')], [1, '', true, true]);
  const kaputt = kopie('export const x = ;\n');
  const rk = starte(kaputt);
  ist('regeln.mjs mit kaputtem lib/regeln.mjs: Exit 1, «lässt sich nicht laden» mit Grund', [rk.status, rk.stdout, rk.stderr.includes('lässt sich nicht laden'), /SyntaxError|Unexpected token/.test(rk.stderr)], [1, '', true, true]);
  const anders = kopie('export const x = 1;\n');
  const ra = starte(anders);
  ist('regeln.mjs mit anderer Schnittstelle: Exit 1, nennt das Fehlende', [ra.status, ra.stdout, ra.stderr.includes('pruefeBash, pruefeInhalt, AUSWEGE')], [1, '', true]);
  const gutDir = kopie(GUT_QUELLE);
  const rg = starte(gutDir);
  ist('regeln.mjs mit passendem Modul: Exit 0, Bericht auf stdout, stderr leer', [rg.status, rg.stdout.trimEnd().split('\n').at(-1), rg.stderr], [0, 'Messung: alle 6 Regeln wie erwartet.', '']);
  const abwDir = kopie(GUT_QUELLE.replace("{ deny: 'wird nie neu angelegt' }", 'undefined'));
  const rb = starte(abwDir);
  ist('regeln.mjs mit abweichendem Modul: Exit 3, Bericht UND ABWEICHUNG in der letzten Zeile', [rb.status, rb.stdout.includes('Leitplanken von luxe-codex'), rb.stdout.trimEnd().split('\n').at(-1).startsWith('ABWEICHUNG (')], [3, true, true]);
  const rarg = starte(gutDir, ['x']);
  ist('regeln.mjs mit Argument: Exit 2 und kein Bericht', [rarg.status, rarg.stdout, rarg.stderr.includes('keine Argumente')], [2, '', true]);
  const werfend = kopie("export const AUSWEGE = []; export const pruefeBash = () => { throw new Error('boom'); }; export const pruefeInhalt = () => { throw new Error('boom'); };\n");
  const rw = starte(werfend);
  ist('regeln.mjs mit werfendem Modul: kein Absturz, Exit 3 mit Abweichungen', [rw.status, rw.stdout.includes('die Prüfung wirft eine Ausnahme (boom)')], [3, true]);
  for (const d of [fehlt, kaputt, anders, gutDir, abwDir, werfend]) rmSync(d, { recursive: true, force: true });

  if (existsSync(REGELN_ECHT)) {
    const echt = lauf(NODE, [join(SKILLS, 'regeln', 'scripts', 'regeln.mjs')]);
    ist('regeln.mjs im echten Plugin: Exit 0, Schlusszeile', [echt.status, echt.stdout.trimEnd().split('\n').at(-1)], [0, 'Messung: alle 6 Regeln wie erwartet.']);
    // Der Befehl aus dem Skill, mit dem echten Skill-Ordner eingesetzt, läuft wörtlich.
    const zeile = bloecke.regeln[0][0].replace('<Skill-Ordner>', join(SKILLS, 'regeln'));
    const wortlaut = bash(zeile, REPO);
    ist('Befehl aus dem Skill regeln, wörtlich ausgeführt: Exit 0', [wortlaut.status, wortlaut.stdout.includes('Messung: alle 6 Regeln wie erwartet.')], [0, true]);
  }
  // Der Befehl aus dem Skill lieferbar, wörtlich, mit dem Heredoc: Liste kommt heraus.
  const dir = tmp();
  const r = bash([bloecke.lieferbar[0][0].replace('<Skill-Ordner>', join(SKILLS, 'lieferbar')), 'eins-111, zwei-222', 'LUXE_ENDE_7K3Q'].join('\n'), dir);
  ist('Befehl aus dem Skill lieferbar, wörtlich ausgeführt: die geprüfte Liste', [r.status, r.stdout], [0, 'eins-111,zwei-222\n']);
  rmSync(dir, { recursive: true, force: true });
}

// === 9. Die Skripte sind nur lesend, und der Terminal-Fall von handles.mjs ===========================================
{
  // Keine der Dateien, die ein Skill ausführt, schreibt, löscht, startet Prozesse oder spricht mit dem Netz.
  const SCHREIBT = /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|mkdirSync|mkdir|rmSync|rm|unlinkSync|unlink|renameSync|rename|copyFileSync|cpSync|createWriteStream|truncateSync|chmodSync|symlinkSync)\s*\(|child_process|\bspawn|\bexecFile|\bexecSync|fetch\s*\(|https?:\/\/|node:(?:net|http|https|dgram|tls)\b|process\.env\.[A-Z_]+\s*=[^=]/;
  ist('Messgerät: das Muster für Schreibendes erkennt Beispiele und lässt Lesendes durch', [
    SCHREIBT.test("writeFileSync('x', 'y')"), SCHREIBT.test("import { spawnSync } from 'node:child_process'"), SCHREIBT.test('await fetch(url)'), SCHREIBT.test("import http from 'node:https'"), SCHREIBT.test('process.env.LIVE = 1'),
    SCHREIBT.test("import { readSync } from 'node:fs'"), SCHREIBT.test('console.log(process.env.LIVE === "1")'), SCHREIBT.test('const arm = 1; farm(2)'),
  ], [true, true, true, true, true, false, false, false]);
  for (const f of ['lib/handles.mjs', 'lib/regeln_bericht.mjs', 'skills/lieferbar/scripts/handles.mjs', 'skills/regeln/scripts/regeln.mjs']) {
    const quelle = readFileSync(join(WURZEL, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    ist(`${f}: schreibt nichts, startet nichts, spricht nicht mit dem Netz`, SCHREIBT.exec(quelle)?.[0] ?? null, null);
  }
  // Die zwei Skripte lassen den Arbeitsordner unberührt.
  const dir = tmp();
  lauf(NODE, [HANDLES_SKRIPT], { input: 'abc\n', cwd: dir });
  lauf(NODE, [join(SKILLS, 'regeln', 'scripts', 'regeln.mjs')], { cwd: dir });
  ist('handles.mjs und regeln.mjs legen im Arbeitsordner nichts an', readdirSync(dir), []);
  rmSync(dir, { recursive: true, force: true });

  // stdin ist ein Terminal: Exit 2 statt zu warten (ein Pseudo-Terminal aus Python). Ohne python3 oder ohne pty-Modul
  // wird sichtbar übersprungen; ein Zeitlimit (das Skript wartet auf Eingabe) ist dagegen ein FEHLER.
  const PTY = [
    'import sys', 'try:', '    import pty, os, subprocess', 'except ImportError:', "    print('KEIN-PTY'); sys.exit(0)",
    'm, s = pty.openpty()', 'p = subprocess.Popen(sys.argv[1:], stdin=s, stdout=subprocess.PIPE, stderr=subprocess.PIPE)', 'os.close(s)',
    'try:', '    o, e = p.communicate(timeout=10)', '    print(p.returncode)', '    print(e.decode())', 'except subprocess.TimeoutExpired:', '    p.kill(); p.communicate()', "    print('ZEITLIMIT')", '',
  ].join('\n');
  const pty = lauf('python3', ['-I', '-c', PTY, NODE, HANDLES_SKRIPT]);
  if (pty.error || pty.stdout.startsWith('KEIN-PTY')) console.log('ÜBERSPRUNGEN: kein python3 mit pty-Modul, der Terminal-Fall von handles.mjs wurde nicht geprüft');
  else ist('handles.mjs: stdin ist ein Terminal → Exit 2 «Keine Eingabe über stdin», kein Warten', [pty.stdout.split('\n')[0], pty.stdout.includes('Keine Eingabe über stdin (Terminal)')], ['2', true]);
}

fertig();
