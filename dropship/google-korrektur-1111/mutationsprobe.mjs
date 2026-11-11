// Mutationsprobe für anwenden.mjs: jeder absichtliche Fehler muss mindestens einen Test rot machen.
// Aufruf: /opt/node22/bin/node mutationsprobe.mjs        (--muster: nur prüfen, ob jedes Muster genau 1× passt)
// Wertung: «erkannt» nur, wenn der Testlauf mit Exit 1 UND Zusammenfassungszeile endet (echte rote Prüfung).
// Endet er ohne Zusammenfassung (Syntaxfehler, Absturz, Zeitlimit), zählt er als «ungeklärt», nie als «erkannt».
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const QUELLE = readFileSync(join(HIER, 'anwenden.mjs'), 'utf8');
const NODE = process.execPath;

const M = [
  ['Schreibsperre aus', "if (istMutation(q) && !live) throw new Error('Trockenlauf: Schreibzugriff verweigert');\n    return gql(q, v);", 'return gql(q, v);'],
  ['Trockenlauf schreibt doch', "if (!cfg.live) { log('  Trockenlauf: nichts geschrieben.'); return EXIT.OK; }\n\n    // 0)", "if (!cfg.live) { log('  Trockenlauf: nichts geschrieben.'); }\n\n    // 0)"],
  ['NUR-Pflicht weg', 'if (cfg.live && !(cfg.nur && cfg.nur.length)) {', 'if (false) {'],
  ['html: 2 Treffer erlaubt', 'if (nO !== 1 || nH !== 1) {', 'if (nO === 0) {'],
  ['html: Zwischenstand egal', 'if (nO !== 1 || nH !== 1) {', 'if (nO !== 1) {'],
  ['html: Ziel aus aktuellem statt gesichertem Text', 'const origHtml = s ? s.produkt.descriptionHtml : p.descriptionHtml;', 'const origHtml = p.descriptionHtml;'],
  ['html: Ersatz mit $-Mustern', 'h = h.replace(alt, () => neu);', 'h = h.replace(alt, neu);'],
  ['Variante verliert Bild erlaubt', "else for (const id of orig) if (loesenSet.has(id)) F.push(`Variante ${wer}: ihr Bild ${kurzId(id)} wird gelöst, ein neues bekommt sie nicht`);", 'else {}'],
  ['Variante ohne Bild erlaubt', "else if (!orig.length) F.push(`Variante ${wer} hat kein Bild und bekommt nach dem Plan keines`);", 'else if (!orig.length) {}'],
  ['fehlende media_id erlaubt', "for (const id of loesen) if (!origIds.includes(id)) F.push(`media_id ${kurzId(id)} (medien_loesen) gibt es am Produkt nicht`);", ''],
  ['nicht quadratisch erlaubt', 'if (w !== h) F.push', 'if (false) F.push'],
  ['700-px-Grenze 500', 'if (Math.min(w, h) < MIN_PX)', 'if (Math.min(w, h) < 500)'],
  ['mindestens 2 statt 3 Bilder', 'if (bilderDanach < MIN_BILDER)', 'if (bilderDanach < 2)'],
  ['Video zählt als Bild', "behalten.filter((id) => typVon.get(id) === 'IMAGE').length", 'behalten.length'],
  ['kein «ausstehend» vor dem Anlegen', "journal(handle, b.e.datei, { status: 'ausstehend', vorher, neu: null, alt: b.e.alt, sha256: b.sha256, zeit: jetztIso() });", ''],
  ['verlorene Antwort = Abbruch', 'if (fehler && !ausnahme) { journal(handle, b.e.datei, { status: \'nicht_angelegt\'', 'if (fehler) { journal(handle, b.e.datei, { status: \'nicht_angelegt\''],
  ['Kandidat ohne Vorher-Vergleich', 'const kand = q.media.nodes.filter((m) => !vorher.includes(m.id) && !vergeben.has(m.id) && (m.alt || \'\') === b.e.alt);', 'const kand = q.media.nodes.filter((m) => !vergeben.has(m.id) && (m.alt || \'\') === b.e.alt);'],
  ['ausstehend wird nie übernommen', 'if (kand.length === 1) { uebernahme[datei] = kand[0].id; bekannt.add(kand[0].id); }', 'if (false) {}'],
  ['nicht auf READY warten', "      await bereit(handle, idVon.get(b.e.datei), b.name);\n", ''],
  ['Variante vor dem Anhängen nicht lösen', 'const mitBild = zu.filter((v) => mids(v).length);\n    if (mitBild.length) {', 'const mitBild = zu.filter((v) => mids(v).length);\n    if (false) {'],
  ['kein Ausgleich nach Fehler beim Anhängen', "const w = q2 ? await ausgleich(q2) : 'frisch lesen ging nicht';", "const w = 'kein Ausgleich';"],
  ['vor dem Lösen: fremde Bindung egal', 'if (haengt.length) throw new Abbruch', 'if (false) throw new Abbruch'],
  ['vor dem Lösen: neues Bild nicht geprüft', "if (!gleich(mids(v), [idVon.get(b.e.datei)])) throw new Abbruch(EXIT.ABBRUCH, `Variante ${v?.sku || kurzId(vid)} trägt nicht ihr neues Bild: nichts gelöst`);", ''],
  ['Hauptbild nicht an Stelle 0', 'if (hauptbildAlt) slots[0] = hauptbildAlt;', ''],
  ['Reihenfolge nur einmal nachlesen', 'const ok = await warteBis(handle, (x) => gleich(medienIds(x), reihe), { versuche: 16, ms: 4000 });', 'const ok = await warteBis(handle, (x) => gleich(medienIds(x), reihe), { versuche: 1, ms: 4000 });'],
  ['Rücklesen ohne Beschreibung', "if (q.descriptionHtml !== soll.html) f.push('Beschreibung ≠ Soll');", ''],
  ['Rücklesen ohne Kernfelder', "if (kern(q) !== soll.kern) f.push('Kernfelder (Handle, Status, Tags, Varianten, SKUs, Preise, Optionen) haben sich verändert');", ''],
  ['Rücklesen ohne Dateiprüfung', 'if (verloren.length) f.push(`gelöste Dateien', 'if (false) f.push(`gelöste Dateien'],
  ['Rücklesen ohne Metafelder', "if (m.soll === null ? ist !== null : !(ist && ist.value === m.soll && ist.type === m.typ)) f.push(`Metafeld ${m.k}", "if (false) f.push(`Metafeld ${m.k}"],
  ['SEO: null-Regel weg', '|| (ist == null && titel != null && norm(soll) === norm(titel))', ''],
  ['Metafeld leeren statt löschen', "const eintrag = { ...m, k, zu: false, soll: m.neu === '' ? null : m.neu };", 'const eintrag = { ...m, k, zu: false, soll: m.neu };'],
  ['Metafeld-Typ egal', 'ist !== null && ist.value === m.alt && ist.type === m.typ;', 'ist !== null && ist.value === m.alt;'],
  ['Option: Kollision erlaubt', 'if (vA.length === 1 && !vN.length) {', 'if (vA.length === 1) {'],
  ['fremde Medien erlaubt', 'if (fremd.length) F.push(`unbekannte Medien am Produkt (nicht in der Sicherung', 'if (false) F.push(`unbekannte Medien am Produkt (nicht in der Sicherung'],
  ['sha-Änderung egal', "if (b.id && j?.sha256 && b.sha256 && j.sha256 !== b.sha256) F.push", 'if (false) F.push'],
  ['Sicherung wird überschrieben', '    if (!s0) {\n      const alle = sLesen();', '    if (true) {\n      const alle = sLesen();'],
  ['Ledger auch im Trockenlauf', 'const ledger = (handle, art, detail) => {\n    if (!cfg.live) return;', 'const ledger = (handle, art, detail) => {'],
  ['Sperrdatei bleibt liegen', 'finally { if (cfg.live) { try { unlinkSync(sperre); }', 'finally { if (cfg.live) { try { void sperre; }'],
  ['Rücknahme: alte Medien nicht wieder anhängen', "    if (fehlend.length) {\n      await zr('fileUpdate referencesToAdd'", "    if (false) {\n      await zr('fileUpdate referencesToAdd'"],
  ['Rücknahme: Variantenbilder nicht zurück', 'if (anh.length) await zr(', 'if (false) await zr('],
  ['Rücknahme: Metafelder nicht zurück', 'if (mL.length) await zr(', 'if (false) await zr('],
  ['Rücknahme: neue Bilder bleiben', '    if (neuJetzt.length) {\n      if (q.variants.nodes.some', '    if (false) {\n      if (q.variants.nodes.some'],
  ['Rücknahme: alte Reihenfolge nicht zurück', 'if (!gleich(medienIds(q), origIds)) {\n      let fehler = null, ausnahme = false;', 'if (false) {\n      let fehler = null, ausnahme = false;'],
  ['Plan: neues Hauptbild an beliebiger Stelle', "else if (e.position !== 0) F.push('hauptbild (neues Bild) muss position 0 haben');", ''],
  ['Plan: Variante bei zwei Bildern erlaubt', "if (new Set(varianten).size !== varianten.length) F.push('neue_bilder: eine Variante steht bei zwei Bildern');", ''],
  ['Plan: treffer ungleich 1 erlaubt', 'if (x?.treffer !== undefined && x.treffer !== 1)', 'if (false)'],
  ['PNG als JPEG hochladen', "return { typ: 'png', mime: 'image/png',", "return { typ: 'png', mime: 'image/jpeg',"],
  // Gegenprüfung 11.11.
  ['zaehle nicht überlappend', 'for (let i = s.indexOf(t); i >= 0; i = s.indexOf(t, i + 1)) n++;', 'for (let i = s.indexOf(t); i >= 0; i = s.indexOf(t, i + t.length)) n++;'],
  ['Bild aus früherem Plan erlaubt', 'if (!planDateien.has(datei) && id && istIds.includes(id)) F.push', 'if (false) F.push'],
  ['SEO-Beschreibung mit Titel-Null-Regel', "tAlt = f === 'title' ? p.title : null,", 'tAlt = p.title,'],
  ['neues Plan-Metafeld nicht nachgesichert', 'e.metafelder.push({ namespace: m.namespace, key: m.key, type: ist?.type ?? null, value: ist?.value ?? null, nachgetragen: jetztIso() });', 'void ist;'],
  ['Ziel: Beschreibung nicht festgehalten', 'if (an.ber.paare) z.descriptionHtml = an.ber.soll;', ''],
  ['Ziel: Optionswerte nicht festgehalten', 'for (const o of an.optSoll) z.optionen[o.id] = o.name;', ''],
  ['Rücknahme: fremde Änderung egal', 'if (!cfg.fremdUeberschreiben) throw new Abbruch(EXIT.ZURUECK, `${t}; nichts geschrieben', 'if (false) throw new Abbruch(EXIT.ZURUECK, `${t}; nichts geschrieben'],
  ['Rücknahme: Beschreibung ohne Fremd-Prüfung', "fremdFeld.push('Beschreibung');", ';'],
  ['Rücknahme: Variantenbild ohne Fremd-Prüfung', 'if (!(gleich(cur, v.media) || !cur.length || (cur.length === 1 && unsere.has(cur[0])))) fremdFeld.push', 'if (false) fremdFeld.push'],
  ['Rücknahme: eigenes neues Bild gilt als fremd', '|| (cur.length === 1 && unsere.has(cur[0]))', ''],
  ['Rücknahme: gefundener Upload ohne ID im Journal', 'const id = j.neu || gefunden[datei];', 'const id = j.neu;'],
  ['ohne Sicherung: Bild des Plans schon am Produkt erlaubt', 'if (da.length) F.push(', 'if (false) F.push('],
  ['ohne Sicherung: nur Alt-Text verglichen', '&& (!m.image?.url || urlBasis(m.image.url).startsWith(stamm))', ''],
  ['LIVE mit GK_ZEIT unter 1 erlaubt', "if (live && env.GK_ZEIT !== undefined && !(Number(env.GK_ZEIT) >= 1)) {", 'if (false) {'],
];

const nurMuster = process.argv.includes('--muster');
let nicht = 0;
for (const [name, aus] of M) { const n = QUELLE.split(aus).length - 1; if (n !== 1) { nicht++; console.log(`NICHT ANWENDBAR (${n}×): ${name}`); } }
console.log(`${M.length} Mutanten, ${M.length - nicht} anwendbar`);
if (nurMuster) process.exit(nicht ? 1 : 0);

const lauf = (pfad) => spawnSync(NODE, [join(HIER, 'anwenden_test.mjs')], { env: { ...process.env, GK_WERKZEUG: pfad, GK_LAUT: '' }, encoding: 'utf8', timeout: 240000 });
const dir = mkdtempSync(join(tmpdir(), 'gk-mut-'));
try {
  const basis = join(dir, 'anwenden.mjs');
  writeFileSync(basis, QUELLE);
  const a = lauf(basis);
  const az = (a.stdout.match(/(\d+) Prüfungen, (\d+) bestanden, (\d+) rot/) || []);
  if (a.status !== 0 || az[3] !== '0') { console.log('AUSGANGSLAGE NICHT GRÜN: ' + a.stdout.slice(-1500)); process.exit(2); }
  console.log(`Ausgangslage grün: ${az[0]}`);
  let erkannt = 0, ueberlebt = 0, ungeklaert = 0;
  for (const [name, aus, ein] of M) {
    if (QUELLE.split(aus).length - 1 !== 1) continue;
    const pfad = join(dir, 'anwenden.mjs');
    writeFileSync(pfad, QUELLE.replace(aus, () => ein));
    const t0 = Date.now(), r = lauf(pfad), s = ((Date.now() - t0) / 1000).toFixed(1);
    const z = r.stdout.match(/(\d+) Prüfungen, (\d+) bestanden, (\d+) rot/);
    if (r.status === 1 && z && Number(z[3]) > 0) { erkannt++; const erste = (r.stdout.match(/^ROT: (.*)$/m) || [])[1] || ''; console.log(`erkannt   ${name} (${z[3]} rot, ${s} s) · ${erste.slice(0, 110)}`); }
    else if (r.status === 0) { ueberlebt++; console.log(`ÜBERLEBT  ${name} (${s} s)`); }
    else { ungeklaert++; console.log(`UNGEKLÄRT ${name}: Exit ${r.status}${r.signal ? ' ' + r.signal : ''} ${String(r.stderr || r.stdout).slice(-300)}`); }
  }
  console.log(`\nMutationsprobe: ${erkannt} erkannt, ${ueberlebt} überlebt, ${ungeklaert} ungeklärt, ${nicht} nicht anwendbar (von ${M.length})`);
  process.exit(ueberlebt || ungeklaert || nicht ? 1 : 0);
} finally { rmSync(dir, { recursive: true, force: true }); }
