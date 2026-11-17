#!/usr/bin/env python3
"""Mutationsprobe für lib.mjs und apply.mjs: je Mutant eine Kopie im Wegwerf-Ordner, apply_test.mjs muss ROT werden. Ausgangslage muss grün sein.
Lauf (Repo-Wurzel): python3 dropship/silber-bazg-1711/mutationsprobe.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
DATEIEN = ['lib.mjs', 'apply.mjs', 'apply_test.mjs']

def lauf(ordner):
    r = subprocess.run([NODE, os.path.join(ordner, 'apply_test.mjs')], capture_output=True, text=True, timeout=180)
    return r.returncode, (r.stdout + r.stderr)[-300:]

def mutanten():
    """(Datei, Name, alt, neu). `alt` muss genau einmal vorkommen, sonst gilt der Mutant als nicht anwendbar."""
    L, A = 'lib.mjs', 'apply.mjs'
    return [
        # ---- lib.mjs: Auswahl
        (L, 'Muster ohne Lookbehind (1925 träfe)', "const MUSTER = /(?<![0-9])925(?![0-9])/;", "const MUSTER = /925(?![0-9])/;"),
        (L, 'Muster ohne Lookahead (19250 träfe)', "const MUSTER = /(?<![0-9])925(?![0-9])/;", "const MUSTER = /(?<![0-9])925/;"),
        (L, 'waehle: Arbeits-Tag nicht ausgeschlossen', " && !(p.tags || []).includes(MARKER))\n    .map", ")\n    .map"),
        (L, 'waehle: nicht sortiert', "\n    .sort((a, b) => a.handle.localeCompare(b.handle));", ";"),
        (L, 'waehle: 925 nicht verlangt', "p.handle && hat925(p.title) && ", "p.handle && "),
        # ---- lib.mjs: Lesen
        (L, 'LESEN: Kanal-Liste anders benannt', "pub:resourcePublicationsV2(first:50, onlyPublished:true)", "pubx:resourcePublicationsV2(first:50, onlyPublished:true)"),
        (L, 'LESEN: onlyPublished:false (vorgemerkte zählen als veröffentlicht)', "pub:resourcePublicationsV2(first:50, onlyPublished:true)", "pub:resourcePublicationsV2(first:50, onlyPublished:false)"),
        (L, 'LESEN: nur 5 Kanäle', "pub:resourcePublicationsV2(first:50, onlyPublished:true)", "pub:resourcePublicationsV2(first:5, onlyPublished:true)"),
        (L, 'flach: Kanäle nicht sortiert', ".map((x) => x.publication.id).sort(),", ".map((x) => x.publication.id),"),
        # ---- lib.mjs: Entscheid
        (L, 'entscheide: 925 nicht geprüft', "if (!hat925(ist.title)) return", "if (false) return"),
        (L, 'entscheide: aktiv mit Tag wird übersprungen', "if (ist.status === 'ACTIVE') return { tun: true,", "if (ist.status === 'ACTIVE' && !tag) return { tun: true,"),
        (L, 'entscheide: Entwurf mit Tag wird nochmals geschrieben', "if (tag) return { tun: false, grund: 'schon Entwurf mit Arbeits-Tag' };", ""),
        (L, 'entscheide: Sicherung wird nicht beachtet (nurTag nie)', "if (inSicherung) return { tun: true, art: 'nurTag'", "if (false) return { tun: true, art: 'nurTag'"),
        (L, 'entscheide: fremde Entwürfe werden angefasst', "return { tun: false, grund: 'Entwurf ohne Arbeits-Tag und ohne Sicherungseintrag, nicht von uns, nicht angefasst' };", "return { tun: true, art: 'nurTag', grund: '' };"),
        (L, 'entscheide: ARCHIVED wird angefasst', "return { tun: false, grund: `Status ${ist.status}, nicht angefasst` };", "return { tun: true, art: 'voll', grund: '' };"),
        (L, 'Lücken umgekehrt', "(vorher || []).filter((id) => !(nachher || []).includes(id))", "(vorher || []).filter((id) => (nachher || []).includes(id))"),
        # ---- lib.mjs: Mutation
        (L, 'Tag-Art vertauscht', "e.tag === 'add' ? 'tagsAdd' : 'tagsRemove'", "e.tag === 'add' ? 'tagsRemove' : 'tagsAdd'"),
        (L, 'Variablentyp ProductInput statt ProductUpdateInput', "kopf.push(`$p${i}:ProductUpdateInput!`);", "kopf.push(`$p${i}:ProductInput!`);"),
        (L, 'Tag-Variable ohne Pflicht [String]', "kopf.unshift('$g:[String!]!');", "kopf.unshift('$g:[String]');"),
        (L, '$g immer deklariert (variableNotUsed)', "if (braucheTag) { vars.g", "if (true) { vars.g"),
        (L, 'Zielstatus ARCHIVED erlaubt', "if (!['DRAFT', 'ACTIVE'].includes(e.status)) throw", "if (false) throw"),
        (L, 'Tag-Art unbekannt erlaubt', "if (!['add', 'remove'].includes(e.tag)) throw", "if (false) throw"),
        (L, 'leerer Auftrag erlaubt', "if (e.status === undefined && e.tag === undefined) throw new Error('Eintrag ohne Auftrag: ' + e.id);", ""),
        (L, 'Mutationsfehler werden verschluckt', "for (const e of v?.userErrors || []) {", "for (const e of []) {"),
        (L, 'Mutationsfehler ohne Index', "index: m ? Number(m[1]) : -1,", "index: -1,"),
        (L, 'Entwurf-Anweisung ohne Status', "...(art === 'voll' ? { status: 'DRAFT' } : {}), tag: 'add' })", "tag: 'add' })"),
        (L, 'Rücknahme-Anweisung: Status immer', "...(ist.status === 'DRAFT' ? { status: e.status } : {})", "{ status: e.status }"),
        (L, 'Rücknahme-Anweisung: Tag nie entfernt', "...(ist.tags.includes(MARKER) ? { tag: 'remove' } : {}) });", "});"),
        # ---- lib.mjs: Probe-Tor
        (L, 'Probe-Tor: Alter nicht geprüft', "if (!(alterH >= 0 && alterH <= maxH)) return", "if (false) return"),
        (L, 'Probe-Tor: Zukunft erlaubt', "if (!(alterH >= 0 && alterH <= maxH)) return", "if (!(alterH <= maxH)) return"),
        (L, 'Probe-Tor: Fehler nicht geprüft', "if (/FEHLER/.test(text)) return", "if (false) return"),
        (L, 'Probe-Tor: «fehlend 05» zählt als 0', "/fehlend am Ende 0\\b/.test(text)", "/fehlend am Ende 0/.test(text)"),
        (L, 'Probe-Tor: Endstatus nicht geprüft', "|| !/Endstatus DRAFT/.test(text)", ""),
        (L, 'Probe-Tor: erste statt letzte Probe', "for (let i = (zeilen || []).length - 1; i >= 0; i--) {", "for (let i = 0; i < (zeilen || []).length; i++) {"),
        # ---- apply.mjs: Lesen und Pakete
        (A, 'Paketgrösse 10 → 50', "const STAPEL = 10;", "const STAPEL = 50;"),
        (A, 'Lese-Block 50, Schritt 60 (IDs 50 bis 59 fehlen)', "i += 50) {", "i += 60) {"),
        (A, 'Lesen ohne Wiederholung', "LESEVERSUCHE = o.leseVersuche ?? 5", "LESEVERSUCHE = o.leseVersuche ?? 1"),
        (A, 'Kanal-Wartezeit nur ein Versuch', "KANALVERSUCHE = o.kanalVersuche ?? 12", "KANALVERSUCHE = o.kanalVersuche ?? 1"),
        # ---- apply.mjs: Liste
        (A, 'Alter der Liste nicht geprüft', "if (!(alterH >= 0 && alterH <= (o.listeMaxH ?? 6)))", "if (false)"),
        (A, 'Liste aus der Zukunft erlaubt', "if (!(alterH >= 0 && alterH <= (o.listeMaxH ?? 6)))", "if (!(alterH <= (o.listeMaxH ?? 6)))"),
        (A, 'Alter der Liste nur im Live-Lauf, nicht bei SICHERN', "if ((o.live || o.sichern) && liste.erzeugt)", "if (o.live && liste.erzeugt)"),
        (A, 'Obergrenze nicht geprüft', "if (eintraege.length > (o.maxAnzahl ?? 260))", "if (false)"),
        (A, 'doppelte IDs nicht geprüft', "if (new Set(eintraege.map((e) => e.id)).size !== eintraege.length)", "if (false)"),
        (A, 'Titel der Liste nicht geprüft', "if (falsch.length) {", "if (false) {"),
        (A, 'leere Liste nicht geprüft', "if (!eintraege.length) { log('Liste leer (oder ONLY trifft nichts)'); return 2; }", ""),
        (A, 'ONLY wird ignoriert', "const nurWahl = (arr) => (o.nur && o.nur.length ? arr.filter((e) => o.nur.includes(e.handle)) : arr);", "const nurWahl = (arr) => arr;"),
        # ---- apply.mjs: Sicherung und Tore
        (A, 'Sicherung allein schreibt nichts', "if (o.sichern) {", "if (false) {"),
        (A, 'Trockenlauf schreibt', "\n  if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }\n\n  // =", "\n\n  // ="),
        (A, 'Probe-Tor nicht beachtet', "if (g !== true) { log('Massenlauf verlangt", "if (false) { log('Massenlauf verlangt"),
        (A, 'Probe-Tor fehlt ganz', "if (o.probeGate) {", "if (false) {"),
        (A, 'Sicherung wird nicht vor dem Schreiben geschrieben', "  o.sicherung.schreiben([...sichAlt, ...neuSich]);\n  log(`Sicherung:", "  setTimeout(() => o.sicherung.schreiben([...sichAlt, ...neuSich]), 0);\n  log(`Sicherung:"),
        (A, 'Sicherung überschreibt statt anzuhängen (Massenlauf)', "  o.sicherung.schreiben([...sichAlt, ...neuSich]);\n  log(`Sicherung:", "  o.sicherung.schreiben([...neuSich]);\n  log(`Sicherung:"),
        (A, 'Sicherung überschreibt statt anzuhängen (allein)', "o.sicherung.schreiben([...sichAlt, ...neu]);", "o.sicherung.schreiben([...neu]);"),
        (A, 'Sicherung ohne Kanäle', "pubs: x.i.pubs, pubsAlle: x.i.pubsAlle, am: jetzt().toISOString() });", "pubs: [], pubsAlle: x.i.pubsAlle, am: jetzt().toISOString() });"),
        # ---- apply.mjs: Massenlauf
        (A, 'kein Halt bei Mutationsfehler (live)', "if (fehler.length) { log('Halt: Mutation meldet Fehler: ' + fehler.map((f) => f.text).join(' | ')); return 6; }", ""),
        (A, 'kein Halt bei Abweichung (live)', "if (abweichung) { log('Halt wegen Abweichung beim Zurücklesen (Lauf ist fortsetzbar)'); return 6; }", ""),
        (A, 'Ausnahme wird verschluckt (live)', "fehler = [{ index: -1, alias: '-', text: 'Ausnahme: ' + e.message }]; }", "fehler = []; }"),
        (A, 'Fehler im Ledger ohne Handle', "ledger('FEHLER', paket[f.index]?.e.handle ?? '-', f.text);", "ledger('FEHLER', '-', f.text);"),
        (A, 'Gegenprobe über alle entfällt', "if (offen.length) {", "if (false) {"),
        (A, 'Rücklesen prüft den Status nicht', "(x.d.art === 'nurTag' || i.status === 'DRAFT')", "true"),
        (A, 'Rücklesen prüft den Arbeits-Tag nicht', "const verifiziert = (x, i) => !!i && i.tags.includes(MARKER) && (", "const verifiziert = (x, i) => !!i && true && ("),
        (A, 'Ledger ohne ENTWURF-Zeilen', "ledger(ok ? 'ENTWURF' : 'ABWEICHUNG', x.e.handle,", "ledger(ok ? 'X' : 'ABWEICHUNG', x.e.handle,"),
        # ---- apply.mjs: Probe
        (A, 'Probe ohne Einzelprodukt-Pflicht', "if (eintraege.length !== 1) { log('Probe verlangt genau ein Produkt (ONLY=<handle>)'); return 2; }", ""),
        (A, 'Probe: Kanalverlust bleibt folgenlos', "&& fehlend === 0 && ende?.status === 'DRAFT' && ende.tags.includes(MARKER) ? 0 : 6;", "? 0 : 0;"),
        (A, 'Probe: kein Neu-Veröffentlichen', "      if (!r2.ok) {", "      if (false) {"),
        (A, 'Probe: endet nicht im Entwurf', "try { await schreibe([anweisungEntwurf(x.e, 'voll')]); } catch (e) { endFehler = e; }", ""),
        (A, 'Probe: «von selbst» immer falsch', "selbst = r2.ok;", "selbst = false;"),
        (A, 'Probe: Fehler abgebrochen werden nicht gemeldet', "} catch (e) { fehlerProbe = e; log(", "} catch (e) { log("),
        # ---- apply.mjs: Rücknahme
        (A, 'Rücknahme ohne Sicherung gibt Exit 0', "die Rücknahme ist ohne sie nicht möglich'); return 2; }", "die Rücknahme ist ohne sie nicht möglich'); return 0; }"),
        (A, 'Rücknahme: ONLY ohne Treffer gibt Exit 0', "log('ONLY trifft keinen Sicherungseintrag'); return 2; }", "log('ONLY trifft keinen Sicherungseintrag'); return 0; }"),
        (A, 'Rücknahme: Entwurf mit Tag wird nicht zurückgesetzt', "if (i.status === 'DRAFT' && tag) arbeit.push({ e, i, art: 'zurueck' });", ""),
        (A, 'Rücknahme: OHNE_TAG_OK wirkt nicht', "else if (i.status === 'DRAFT' && o.ohneTagOk) arbeit.push({ e, i, art: 'zurueck' });", ""),
        (A, 'Rücknahme: Entwurf ohne Tag immer zurück (nicht sicher von uns)', "else if (i.status === 'DRAFT') log(`übersprungen (Entwurf ohne Arbeits-Tag", "else if (i.status === 'DRAFT') arbeit.push({ e, i, art: 'zurueck' }); else if (false) log(`übersprungen (Entwurf ohne Arbeits-Tag"),
        (A, 'Rücknahme: aktiv mit Tag wird übersehen', "else if (i.status === 'ACTIVE' && tag) arbeit.push({ e, i, art: 'nurTagWeg' });", ""),
        (A, 'Rücknahme: aktive Produkte werden nicht auf Kanäle geprüft', "else if (i.status === 'ACTIVE') arbeit.push({ e, i, art: 'reparatur' });", ""),
        (A, 'Rücknahme: Trockenlauf schreibt', "    if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }\n    for (let k = 0; k < arbeit.length;", "    for (let k = 0; k < arbeit.length;"),
        (A, 'Rücknahme: kein Halt bei Mutationsfehler', "log('Rücknahme: Mutation meldet Fehler, Halt: ' + fehler.map((f) => f.text).join(' | ')); return 6; }", "log('Rücknahme: Mutation meldet Fehler, Halt: ' + fehler.map((f) => f.text).join(' | ')); }"),
        (A, 'Rücknahme: Fehler ohne Handle', "ledger('FEHLER-ZURUECK', schreib[f.index]?.e.handle ?? '-', f.text);", "ledger('FEHLER-ZURUECK', '-', f.text);"),
        (A, 'Rücknahme: fehlende Kanäle werden nicht veröffentlicht', "      if (!p2.ok) {\n        for (const x of luecken(p2.m)) {", "      if (false) {\n        for (const x of luecken(p2.m)) {"),
        (A, 'Rücknahme: alle Kanäle in einem Aufruf', "const j = await q(PUBLIZIEREN, { id, in: [{ publicationId }] });", "const j = await q(PUBLIZIEREN, { id, in: luecken.map((p) => ({ publicationId: p })) });"),
        (A, 'Rücknahme: fehlende Kanäle gelten als in Ordnung', "&& !i.tags.includes(MARKER) && l.length === 0;", "&& !i.tags.includes(MARKER);"),
        (A, 'Rücknahme: erledigte bleiben in der Sicherung', "if (erledigt.length) o.sicherung.entfernen?.(erledigt);", ""),
        (A, 'Rücknahme: kein Halt bei Abweichung', "if (abweichung) { log('Rücknahme: Halt wegen Abweichung", "if (false) { log('Rücknahme: Halt wegen Abweichung"),
        (A, 'Rücknahme: Verbucht Abweichung als ZURUECK', "ledger(ok ? 'ZURUECK' : 'ABWEICHUNG-ZURUECK', x.e.handle,", "ledger('ZURUECK', x.e.handle,"),
    ]

def main():
    tmp = tempfile.mkdtemp(prefix='silbermut_')
    try:
        for d in DATEIEN: shutil.copy(os.path.join(HIER, d), os.path.join(tmp, d))
        rc, aus = lauf(tmp)
        if rc != 0: print('Ausgangslage NICHT grün:', aus); return 2
        print('Ausgangslage grün:', aus.strip().splitlines()[-1])
        erkannt = nicht = n_a = 0
        for datei, name, alt, neu in mutanten():
            quelle = open(os.path.join(HIER, datei), encoding='utf8').read()
            if quelle.count(alt) != 1:
                n_a += 1; print(f'? nicht anwendbar ({quelle.count(alt)} Treffer): {name}'); continue
            for d in DATEIEN: shutil.copy(os.path.join(HIER, d), os.path.join(tmp, d))
            open(os.path.join(tmp, datei), 'w', encoding='utf8').write(quelle.replace(alt, neu))
            rc, aus = lauf(tmp)
            if rc != 0: erkannt += 1
            else: nicht += 1; print(f'✗ ÜBERLEBT: {name}')
        print(f'\n{erkannt} erkannt, {nicht} überlebt, {n_a} nicht anwendbar (von {erkannt + nicht + n_a})')
        return 1 if (nicht or n_a) else 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    sys.exit(main())
