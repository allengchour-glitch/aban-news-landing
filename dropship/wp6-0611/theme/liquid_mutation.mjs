// Mutationsprobe für den Liquid-Patch (patches.mjs): verändert je EINE Stelle des Patch-Textes und prüft, ob liquid_test.mjs rot wird.
// Überlebt ein Mutant, ist eine Prüfung zu schwach (oder der Mutant gleichwertig: dann steht er unten in GLEICHWERTIG mit Begründung).
// Ein Muster, das nicht genau einmal vorkommt, ist ein Fehler der Probe selbst («nicht anwendbar»). Die Ausgangslage (unveränderter Patch) muss vorher grün sein.
//   node dropship/wp6-0611/theme/liquid_mutation.mjs [--pruefen]        (läuft auf Kopien im Wegwerfordner, das Repo bleibt unberührt; Browser-Mutanten nacheinander, die anderen 3 gleichzeitig)
// Umgebung wie liquid_test.mjs (LIQUIDJS_DIR, RUBY_LIQUID_GEMS, NODE_PATH für Chromium).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PATCH = fs.readFileSync(path.join(HIER, 'patches.mjs'), 'utf8');
const DATEIEN = ['liquid_test.mjs', 'liquid_render.rb', 'sicherung/snippets__cart-products.liquid.vor'];

// [Name, von (muss genau einmal vorkommen), zu, browser?]
const M = [
  // --- Adresse prüfen ---
  ['L01 Host nicht geprüft', " or lx_vs_teile[2] != 'res.cloudinary.com'", ''],
  ['L02 Schema nicht geprüft', " or lx_vs_teile[0] != 'https:'", ''],
  ['L03 leeres Segment nach https: nicht geprüft', " or lx_vs_teile[1] != ''", ''],
  ['L04 «image» nicht geprüft', " or lx_vs_teile[4] != 'image'", ''],
  ['L05 «upload» nicht geprüft', " or lx_vs_teile[5] != 'upload'", ''],
  ['L06 Cloud-Segment darf leer sein', " or lx_vs_teile[3] == ''", ''],
  ['L07 Mindestanzahl der Teile weg', 'lx_vs_teile.size < 7 or ', ''],
  ['L08 Mindestanzahl der Teile zu klein', 'lx_vs_teile.size < 7', 'lx_vs_teile.size < 6'],
  ['L09 Längengrenze weg', 'lx_vs_wert.size > ${MAX_LAENGE} or ', ''],
  ['L10 Längengrenze ≥ statt >', 'lx_vs_wert.size > ${MAX_LAENGE}', 'lx_vs_wert.size >= ${MAX_LAENGE}'],
  ['L11 Längengrenze um 1 zu gross', 'lx_vs_wert.size > ${MAX_LAENGE}', 'lx_vs_wert.size > 301'],
  ['L12 «..» nicht geprüft', " or lx_vs_wert contains '..'", ''],
  ['L13 Zeichenprüfung weg (immer erlaubt)', 'unless lx_vs_erlaubt contains lx_vs_z', 'unless true'],
  ['L14 Zeichenprüfung setzt nichts', 'assign lx_vs_gut = false\n                            break', 'break'],
  ['L15 Zeichenprüfung bricht nicht ab, setzt aber', 'assign lx_vs_gut = false\n                            break', 'assign lx_vs_gut = false'],
  ['L16 Zeichenprüfung kehrt um', 'unless lx_vs_erlaubt contains lx_vs_z', 'if lx_vs_erlaubt contains lx_vs_z'],
  ['L17 Zeichenprüfung läuft nur, wenn nicht gut', "      if lx_vs_gut\n                        assign lx_vs_zeichen", "      unless lx_vs_gut\n                        assign lx_vs_zeichen"],
  ['L18 Feste Cloud wird nie geprüft', 'if lx_vs_gut and lx_vs_cloud != \'\'', 'if false'],
  ['L19 Feste Cloud umgekehrt', 'if lx_vs_teile[3] != lx_vs_cloud', 'if lx_vs_teile[3] == lx_vs_cloud'],
  ['L20 Feste Cloud: leere Cloud zählt als gesetzt', "if lx_vs_gut and lx_vs_cloud != ''", 'if lx_vs_gut'],
  ['L21 Schlüssel nur ähnlich (enthält «vorschau»)', "if lx_vs_p.first == '_vorschau'", "if lx_vs_p.first contains 'vorschau'"],
  ['L22 Schlüssel ohne Unterstrich', "if lx_vs_p.first == '_vorschau'", "if lx_vs_p.first == 'vorschau'"],
  ['L23 Ergebnis wird nie gesetzt', 'assign lx_vs_url = lx_vs_wert', 'assign lx_vs_url = \'\''],
  ['L24 Ergebnis wird auch bei ungültiger Adresse gesetzt', "      if lx_vs_gut\n                        assign lx_vs_url = lx_vs_wert\n                      endif", "      assign lx_vs_url = lx_vs_wert"],
  ['L25 Ergebnis wird nicht je Zeile zurückgesetzt', "                  assign lx_vs_url = ''\n                  assign lx_vs_cloud", "                  assign lx_vs_cloud"],
  // --- erlaubte Zeichen (Mutationen an der Konstante im Patch) ---
  ['L26 Anführungszeichen erlaubt', "export const ERLAUBT = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~:,/';", "export const ERLAUBT = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~:,/\"';"],
  ['L27 Prozentzeichen erlaubt', "0123456789-_.~:,/';", "0123456789-_.~:,/%';"],
  ['L28 Leerzeichen erlaubt', "0123456789-_.~:,/';", "0123456789-_.~:,/ ';"],
  ['L29 «<» erlaubt', "0123456789-_.~:,/';", "0123456789-_.~:,/<';"],
  ['L30 Fragezeichen erlaubt', "0123456789-_.~:,/';", "0123456789-_.~:,/?';"],
  ['L31 Komma nicht erlaubt', "0123456789-_.~:,/';", "0123456789-_.~:/';"],
  ['L32 Unterstrich nicht erlaubt', "0123456789-_.~:,/';", "0123456789-.~:,/';"],
  ['L33 Doppelpunkt nicht erlaubt', "0123456789-_.~:,/';", "0123456789-_.~,/';"],
  ['L34 Tilde nicht erlaubt', "0123456789-_.~:,/';", "0123456789-_.:,/';"],
  ['L35 Ziffern nicht erlaubt', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-'],
  ['L36 Grossbuchstaben nicht erlaubt', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123', 'abcdefghijklmnopqrstuvwxyz0123'],
  ['L37 Höchstlänge im Patch 3000', 'export const MAX_LAENGE = 300;', 'export const MAX_LAENGE = 3000;'],
  // --- Ausgabe ---
  ['L38 src nicht maskiert', 'src="{{ lx_vs_url | escape }}"', 'src="{{ lx_vs_url }}"'],
  ['L39 alt nicht maskiert', 'alt="{{ item.product.title | escape }}"', 'alt="{{ item.product.title }}"'],
  ['L40 Stil nicht maskiert', 'style="{{ border_override | escape }}"', 'style="{{ border_override }}"'],
  ['L41 Kennzeichen data-lx-vorschau fehlt', '                          data-lx-vorschau="1"\n', '\n'],
  ['L42 Klasse border-style fehlt', 'cart-items__media-image--vorschau border-style"', 'cart-items__media-image--vorschau"'],
  ['L43 Klasse der Miniatur fehlt', 'class="cart-items__media-image cart-items__media-image--vorschau', 'class="cart-items__media-image'],
  ['L44 Breite 400', 'width="800"', 'width="400"'],
  ['L45 Höhe 400', 'height="800"', 'height="400"'],
  ['L46 lazy fehlt', '                          loading="lazy"\n', '\n'],
  ['L47 Rückfall-Adresse fehlt', 'data-lx-fallback="{{ item.image | image_url: width: 250 | escape }}"', ''],
  ['L48 onerror fehlt', "onerror=\"this.onerror=null;var f=this.getAttribute('data-lx-fallback');if(f){this.src=f;this.removeAttribute('data-lx-vorschau')}\"", ''],
  ['L49 Rückfall ersetzt src nicht', 'if(f){this.src=f;', 'if(f){', true],
  ['L50 Rückfall entfernt die Marke nicht', ";this.removeAttribute('data-lx-vorschau')}", '}', true],
  ['L51 Rückfall liest falsches Attribut', "this.getAttribute('data-lx-fallback')", "this.getAttribute('data-x')", true],
  ['L52 Rückfall ohne Selbstabschaltung (Endlosschleife möglich)', 'this.onerror=null;var f', 'var f'],
  ['L53 Rückfall auch ohne Variantenbild', '{%- if item.image %}\n                          data-lx-fallback', '{%- if true %}\n                          data-lx-fallback'],
  // --- Seitenverhältnis, Bedingung, Rückfallzweig ---
  ['L54 Seitenverhältnis bleibt wie beim Variantenbild', "\\n                      if lx_vs_url != ''\\n                        assign ratio = 1\\n                      endif\\n                    %}`;", "\\n                    %}`;"],
  ['L55 Seitenverhältnis 0.8', 'assign ratio = 1\\n                      endif\\n                    %}`;', 'assign ratio = 0.8\\n                      endif\\n                    %}`;'],
  ['L56 Miniatur nur mit Variantenbild', "const N2 = `{% if item.image or lx_vs_url != '' -%}`;", "const N2 = `{% if item.image -%}`;"],
  ['L57 Rückfallzweig fehlt (Variantenbild nie)', '{%- else -%}\n                      {%- liquid\n                        echo item.image | image_url: width: 250 | image_tag: class: \'cart-items__media-image border-style\', style: border_override\n                      -%}\n                      {%- endif -%}`;', '{%- endif -%}`;'],
  ['L58 Variantenbild in anderer Breite', "{%- else -%}\n                      {%- liquid\n                        echo item.image | image_url: width: 250", "{%- else -%}\n                      {%- liquid\n                        echo item.image | image_url: width: 300"],
  ['L59 Weiche kehrt um', "{%- if lx_vs_url != '' -%}\n                        <img", "{%- if lx_vs_url == '' -%}\n                        <img"],
  ['L60 Zeilenumbruch hinter dem for-Tag (Ausgabe ändert sich)', '`{% for item in cart.items %}${rechnen(cloud)}\\n              <tr', '`{% for item in cart.items %}\\n${rechnen(cloud)}\\n              <tr'],
  ['L61 Trimmzeichen um das Bild fehlen (Leerraum im Link)', "{%- if lx_vs_url != '' -%}\n                        <img", "{% if lx_vs_url != '' -%}\n                        <img"],
  ['L62 Trimmzeichen am Ende des Bildes fehlen', '                        >\n                      {%- else -%}', '                        >\n                      {% else -%}'],
  ['L63 Zeile ohne Vorschau gibt ein leeres Bild aus', "{%- else -%}\n                      {%- liquid\n                        echo item.image | image_url: width: 250 | image_tag: class: 'cart-items__media-image border-style', style: border_override\n                      -%}", "{%- else -%}\n                      {%- liquid\n                        echo item.image | image_url: width: 250 | image_tag: class: 'cart-items__media-image', style: border_override\n                      -%}"],
  ['L64 Ausgangsstand falsch (MD5_VOR)', "export const MD5_VOR = '86a84bf9ff1862b97025bd1a841b8080';", "export const MD5_VOR = '86a84bf9ff1862b97025bd1a841b8081';"],
  ['L65 Anker «for» zu weit gefasst', 'const A1 = `{% for item in cart.items %}\\n              <tr\\n                role="row"`;', 'const A1 = `{% for item in cart.items %}`;'],
  ['L66 Doppelanwendung nicht abgefangen', "if (text.includes(MARKE) || text.includes('lx_vs_url')) throw new Error('Eingriff steckt schon im Snippet');", ''],
  ['L67 Cloud-Name wird nicht geprüft', 'if (typeof cloud !== \'string\' || !CLOUD_MUSTER.test(cloud)) throw', 'if (false) throw'],
  ['L68 Umkehrung lässt den Rechenblock stehen', "[n1(cloud), A1, 'for'], ", ''],
];

// Gleichwertige Mutanten (kein sichtbarer Unterschied): leer, solange jeder Mutant erkannt wird
const GLEICHWERTIG = {
  'L15 Zeichenprüfung bricht nicht ab, setzt aber': 'der Schalter bleibt falsch, ob die Schleife weiterläuft oder nicht: nur Rechenzeit, kein anderes Ergebnis',
  'L38 src nicht maskiert': 'zweite Schicht (Gürtel und Hosenträger): die erlaubten Zeichen enthalten nichts, was escape ändert; sichtbar wird der Unterschied nur, wenn die Zeichenprüfung versagt (dann fängt Mutant L13 den Fehler)',
  'L40 Stil nicht maskiert': 'der Stil stammt aus Theme-Einstellungen mit festen Auswahlwerten (Breite, Linienart, Deckkraft, Radius), kein Wert kann ein Anführungszeichen tragen',
};

function ersetze(text, von, zu) {
  const teile = text.split(von);
  if (teile.length !== 2) return { fehler: `Muster kommt ${teile.length - 1}× vor (erwartet 1×)` };
  return { text: teile.join(zu) };
}
function lauf(dir, browser) {
  return new Promise((resolve) => {
    const env = { ...process.env }; if (!browser) env.OHNE_BROWSER = '1';
    const p = spawn(process.execPath, [path.join(dir, 'liquid_test.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = ''; p.stdout.on('data', (d) => { aus += d; }); p.stderr.on('data', (d) => { aus += d; });
    const t = setTimeout(() => p.kill('SIGKILL'), 240000);
    p.on('exit', (code) => { clearTimeout(t); resolve({ code, aus }); });
  });
}
function kopie(patchText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lxmut-'));
  fs.mkdirSync(path.join(dir, 'sicherung'));
  for (const f of DATEIEN) fs.copyFileSync(path.join(HIER, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'patches.mjs'), patchText);
  return dir;
}

// --pruefen: nur prüfen, dass jedes Muster noch genau einmal im Quelltext vorkommt (schnell, für die CI); die volle Probe läuft von Hand
if (process.argv.includes('--pruefen')) {
  const schlecht = M.map(([name, von, zu]) => [name, ersetze(PATCH, von, zu)]).filter(([, m]) => m.fehler || m.text === PATCH);
  for (const [name, m] of schlecht) console.log('nicht anwendbar', name, m.fehler || 'Mutant gleich Original');
  console.log(`${M.length} Mutanten, ${M.length - schlecht.length} anwendbar, ${schlecht.length} nicht anwendbar`);
  process.exit(schlecht.length ? 1 : 0);
}

// Ausgangslage grün?
{
  const dir = kopie(PATCH); const r = await lauf(dir, true); fs.rmSync(dir, { recursive: true, force: true });
  if (r.code !== 0) { console.error('Ausgangslage ist NICHT grün: Mutationsprobe abgebrochen\n' + r.aus.split('\n').slice(-12).join('\n')); process.exit(2); }
  console.log('Ausgangslage grün:', (r.aus.match(/(\d+) Prüfungen, 0 Fehler[^\n]*/) || ['?'])[0]);
}

const ergebnis = [];
async function einer([name, von, zu, browser]) {
  const m = ersetze(PATCH, von, zu);
  if (m.fehler) { ergebnis.push({ name, status: 'nicht anwendbar', info: m.fehler }); return; }
  if (m.text === PATCH) { ergebnis.push({ name, status: 'nicht anwendbar', info: 'Mutant gleich Original' }); return; }
  const dir = kopie(m.text); let r = await lauf(dir, !!browser);
  // «erkannt» zählt nur mit einer fehlgeschlagenen Prüfung (✗); ein Lauf ohne ✗ (Absturz, Zeitlimit) wird wiederholt
  let abs = false;
  if (r.code !== 0 && !r.aus.includes('✗')) { const r2 = await lauf(dir, !!browser); abs = r2.code !== 0 && !r2.aus.includes('✗'); r = r2; if (!abs && r.code === 0) { ergebnis.push({ name, status: 'unklar', info: 'erster Lauf ohne Prüfungsfehler gescheitert, zweiter grün (Zufallsfehler?)' }); fs.rmSync(dir, { recursive: true, force: true }); return; } }
  fs.rmSync(dir, { recursive: true, force: true });
  const rot = r.code !== 0;
  const grund = rot ? (abs ? 'Absturz: ' : '') + (r.aus.split('\n').find((z) => z.includes('✗')) || r.aus.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 150) : '';
  ergebnis.push({ name, status: rot ? 'erkannt' : (GLEICHWERTIG[name] ? 'gleichwertig' : 'ÜBERLEBT'), info: rot ? grund : (GLEICHWERTIG[name] || '') });
}
const ohneBrowser = M.filter((m) => !m[3]), mitBrowser = M.filter((m) => m[3]);
let nächster = 0;
await Promise.all(Array.from({ length: 3 }, async () => { for (;;) { const i = nächster++; if (i >= ohneBrowser.length) return; await einer(ohneBrowser[i]); } }));
for (const m of mitBrowser) await einer(m);   // höchstens ein Chromium zugleich

ergebnis.sort((a, b) => a.name.localeCompare(b.name));
for (const e of ergebnis) console.log(`${e.status.padEnd(15)} ${e.name}${e.info ? '  ← ' + e.info : ''}`);
const zaehl = (s) => ergebnis.filter((e) => e.status === s).length;
console.log(`\n${M.length} Mutanten: ${zaehl('erkannt')} erkannt, ${zaehl('gleichwertig')} gleichwertig, ${zaehl('ÜBERLEBT')} überlebt, ${zaehl('unklar')} unklar, ${zaehl('nicht anwendbar')} nicht anwendbar`);
process.exit(zaehl('ÜBERLEBT') || zaehl('nicht anwendbar') || zaehl('unklar') ? 1 : 0);
