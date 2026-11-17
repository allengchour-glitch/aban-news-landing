#!/usr/bin/env python3
"""Mutationsprobe für gold_entwurf.mjs: je Mutant eine Ersetzung (muss genau einmal passen), Test muss fehlschlagen. Datei wird immer zurückgesetzt.
   python3 dropship/gold-bazg-1711/mutationsprobe_gold.py   (aus dem Repo-Wurzelordner)"""
import subprocess, sys, pathlib
D = pathlib.Path(__file__).parent
ZIEL = D / 'gold_entwurf.mjs'
ORIG = ZIEL.read_text(encoding='utf8')
M = [
 ('Stapel 4 → 40', 'const STAPEL = 4;', 'const STAPEL = 40;'),
 ('Listengrenze 20 → 200', 'e.length > 20', 'e.length > 200'),
 ('leere Liste erlaubt', 'e.length < 1', 'e.length < 0'),
 ('Handle-Regel offen', "/^[a-z0-9][a-z0-9-]*$/.test(x?.handle || '')", "(x?.handle || '').length > 0"),
 ('Produkt-ID-Regel offen', "/^gid:\\/\\/shopify\\/Product\\/\\d+$/.test(x.id || '')", "(x.id || '').length > 0"),
 ('Beleg-Mindestlänge 6 → 1', ">= 6))", ">= 1))"),
 ('Doppelte nicht erkannt', 'if (seen.has(x.handle) || seen.has(x.id)) return', 'if (false) return'),
 ('belegDa: every statt some', '(belege || []).some(', '(belege || []).every('),
 ('belegDa: Groß/Klein', 'textVon(p).includes(norm(b))', 'textVon(p).includes(b)'),
 ('belegDa: leerer Satz zählt', 'b && textVon(p)', 'textVon(p)'),
 ('Entscheid: Handle/ID nicht geprüft', 'if (ist.handle !== e.handle || ist.id !== e.id) return', 'if (false) return'),
 ('Entscheid: schon Entwurf mit Tag wird erneut angefasst', "if (ist.status === 'DRAFT' && ist.tags.includes(MARKER_GOLD)) return", 'if (false) return'),
 ('Entscheid: Status nicht geprüft', "if (ist.status !== 'ACTIVE') return", 'if (false) return'),
 ('Entscheid: Beleg nicht geprüft', 'if (!belegDa(ist, e.beleg)) return', 'if (false) return'),
 ('Entscheid: nicht lesbar ist kein Fehler', "{ tun: false, fehler: true, grund: 'Produkt nicht lesbar' }", "{ tun: false, grund: 'Produkt nicht lesbar' }"),
 ('Mutation: ARCHIVED erlaubt', "['DRAFT', 'ACTIVE'].includes(e.status)", "['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(e.status)"),
 ('Mutation: $g immer deklariert', 'if (tag) { vars.g', 'if (true) { vars.g'),
 ('Mutation: Tag-Art unbekannt erlaubt', "['add', 'remove'].includes(e.tag)", "['add', 'remove', 'set'].includes(e.tag)"),
 ('Eingabefehler ignoriert', 'if (!o.zurueck && fehler) {', 'if (false) {'),
 ('Harte Fehler ignoriert', 'if (hartFehler) {', 'if (false) {'),
 ('Sicherung überschreibt', 'o.sicherung.schreiben([...alt, ...neu]);', 'o.sicherung.schreiben(neu);'),
 ('Sichern: auch Produkte ohne Auftrag', 'const neu = zuTun.filter(', 'const neu = urteile.filter('),
 ('Live ohne vollständige Sicherung', 'if (fehlt.length) {', 'if (false) {'),
 ('Sicherung ohne Kanalliste ok', '|| !Array.isArray(s.pubs)', ''),
 ('Sicherung mit anderem Status ok', "|| s.status !== 'ACTIVE'", ''),
 ('Schreibfehler ignoriert', "if (fe.length) { log('FEHLER beim Schreiben: '", "if (false) { log('FEHLER beim Schreiben: '"),
 ('Rücklesen nicht erzwungen', "if (!w.ok) { log('FEHLER: Rücklesen weicht ab (Status", "if (false) { log('FEHLER: Rücklesen weicht ab (Status"),
 ('Rücklesen: Status nicht geprüft', "x && x.status === 'DRAFT' && x.tags.includes(MARKER_GOLD)", "x && x.tags.includes(MARKER_GOLD)"),
 ('Rücklesen: Tag nicht geprüft', "x && x.status === 'DRAFT' && x.tags.includes(MARKER_GOLD)", "x && x.status === 'DRAFT'"),
 ('Live: Trockenlauf schreibt', 'if (!o.live || !zuTun.length) return 0;\n\n  const sich', 'if (!zuTun.length) return 0;\n\n  const sich'),
 ('Live: kein Tag gesetzt', "status: 'DRAFT', tag: 'add' }", "status: 'DRAFT' }"),
 ('Live: nur Tag, kein Status', "status: 'DRAFT', tag: 'add' }", "tag: 'add' }"),
 ('Rücknahme: Produkte ohne Tag werden angefasst', "if (!i.tags.includes(MARKER_GOLD)) { log(", "if (false) { log("),
 ('Rücknahme: Status fest ACTIVE statt gesichert', "{ status: e.status } : {}), tag: 'remove' }", "{ status: 'ACTIVE' } : {}), tag: 'remove' }"),
 ('Rücknahme: Tag bleibt', "tag: 'remove' } })", "} })"),
 ('Rücknahme: Rücklesen nicht geprüft', "if (!w.ok) { log('FEHLER: Rücklesen nach der Rücknahme", "if (false) { log('FEHLER: Rücklesen nach der Rücknahme"),
 ('Rücknahme: Status nicht geprüft', "x && x.status === p.e.status && !x.tags", "x && !x.tags"),
 ('Rücknahme: keine Kanalprüfung', 'let l = await luecken(p);', 'let l = [];'),
 ('Rücknahme: Kanäle nicht neu veröffentlicht', 'for (const publicationId of l) { try {', 'for (const publicationId of []) { try {'),
 ('Rücknahme: fehlende Kanäle bleiben ohne Fehler', 'if (l.length) code = 6;', ''),
 ('Rücknahme: ONLY ignoriert', "const nurWahl = (arr) => (o.nur && o.nur.length ? arr.filter(", "const nurWahl = (arr) => (false ? arr.filter("),
 ('Rücknahme: ohne Sicherung kein Fehler', "if (!wahl.length) { log('Rücknahme: keine Sicherung", "if (false) { log('Rücknahme: keine Sicherung"),
 ('Ledger: nie geschrieben', "const ledger = (art, handle, text = '') => o.ledger?.(", "const ledger = (art, handle, text = '') => void (("),
 ('Rücknahme: Ledger ohne Kanalzahl', "Kanäle fehlend am Ende ${l.length}`);\n      log(", "Kanäle fehlend am Ende 0`);\n      log("),
 ('ONLY ohne Treffer ist kein Fehler', "if (!wahl.length) { log('ONLY trifft keinen Eintrag'); return 2; }", "if (!wahl.length) { log('ONLY trifft keinen Eintrag'); return 0; }"),
]
ueberlebt = []; nicht = []
for name, alt, neu in M:
    n = ORIG.count(alt)
    if n != 1:
        nicht.append((name, n)); continue
    try:
        ZIEL.write_text(ORIG.replace(alt, neu), encoding='utf8')
        r = subprocess.run(['/opt/node22/bin/node', str(D / 'gold_entwurf_test.mjs')], capture_output=True, text=True, timeout=120)
        if r.returncode == 0: ueberlebt.append(name)
    except subprocess.TimeoutExpired:
        pass  # Zeitüberschreitung = erkannt
    finally:
        ZIEL.write_text(ORIG, encoding='utf8')
print(f'{len(M) - len(ueberlebt) - len(nicht)} von {len(M)} erkannt, {len(ueberlebt)} überlebt, {len(nicht)} nicht anwendbar')
for n in ueberlebt: print('ÜBERLEBT:', n)
for n, c in nicht: print(f'NICHT ANWENDBAR ({c}x):', n)
sys.exit(1 if ueberlebt or nicht else 0)
