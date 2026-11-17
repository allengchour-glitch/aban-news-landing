#!/usr/bin/env python3
"""Mutationsprobe für sammlungstexte.mjs: je Mutant eine Kopie im Wegwerf-Ordner (mit der Verzeichnisform des Repos), sammlungstexte_test.mjs muss ROT werden. Ausgangslage muss grün sein.
Lauf (Repo-Wurzel): python3 dropship/silber-bazg-1711/mutationsprobe_sammlungen.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
WURZEL = os.path.abspath(os.path.join(HIER, '..', '..'))
DATEIEN = ['sammlungstexte.mjs', 'sammlungstexte_test.mjs', 'sammlungstexte.json']
T = 'sammlungstexte.mjs'

def aufbauen(tmp):
    for d in DATEIEN:
        z = os.path.join(tmp, 'dropship', 'silber-bazg-1711', d); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(HIER, d), z)
    z = os.path.join(tmp, 'automation', 'lib', 'silber_feingehalt.mjs'); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(WURZEL, 'automation', 'lib', 'silber_feingehalt.mjs'), z)

def lauf(tmp):
    r = subprocess.run([NODE, os.path.join(tmp, 'dropship', 'silber-bazg-1711', 'sammlungstexte_test.mjs')], capture_output=True, text=True, timeout=180)
    return r.returncode

MUT = [
    ('Tor Feingehalt aus', "if (r.treffer) p.push(", "if (false) p.push("),
    ('Tor Kommentare aus', "if (JSON.stringify(kA) !== JSON.stringify(kN)) p.push", "if (false) p.push"),
    ('Tor Tags aus', "if ((tA.get(t) || 0) < c) {", "if (false) {"),
    ('Tor SEO-Titel 70 → 700', "length > 70)", "length > 700)"),
    ('Tor SEO-Beschreibung 160 → 1600', "length > 160)", "length > 1600)"),
    ('Tor leere Beschreibung aus', "if (String(e.alt.descriptionHtml || '').trim() &&", "if (false &&"),
    ('Tor alt=neu aus', "if (gleichFelder(e.alt, e.neu)) p.push", "if (false) p.push"),
    ('Tor unvollständiger Eintrag aus', "if (!e || !e.handle || !e.alt || !e.neu) return", "if (false) return"),
    ('Tor Feingehalt prüft nur Beschreibung', "{ title: n.seoTitle || '', description: `${n.descriptionHtml || ''} ${n.seoDescription || ''}` }", "{ title: '', description: `${n.descriptionHtml || ''}` }"),
    ('keine Einträge nicht abgefangen', "if (!eintraege.length) {", "if (false) {"),
    ('doppelte Handles nicht abgefangen', "if (new Set(eintraege.map((e) => e.handle)).size !== eintraege.length) {", "if (false) {"),
    ('Tore auch bei Rücknahme', "if (!o.zurueck) {\n    let rot = 0;", "if (true) {\n    let rot = 0;"),
    ('Tore melden nicht (rot nie)', "if (rot) { log(`${rot} Einträge bestehen die Tore nicht, nichts geschrieben`); return 2; }", "if (false) { return 2; }"),
    ('schon erledigt nicht erkannt', "if (gleichFelder(ist, soll(e))) {", "if (false) {"),
    ('Fremdschutz aus', "if (!gleichFelder(ist, andere(e)) && !o.fremdUeberschreiben) {", "if (false) {"),
    ('FREMD_UEBERSCHREIBEN wirkt nie', "&& !o.fremdUeberschreiben) {", "&& true) {"),
    ('Trockenlauf schreibt', "if (!o.live) continue;", ""),
    ('Soll bei Rücknahme falsch', "const soll = (e) => (o.zurueck ? e.alt : e.neu);", "const soll = (e) => e.neu;"),
    ('Rücklesen ohne Halt', "if (!ok) { log(`ABWEICHUNG", "if (false) { log(`ABWEICHUNG"),
    ('Schreibfehler ohne Halt', "return 6; }\n    await pause(schreibPause);", "}\n    await pause(schreibPause);"),
    ('Rücklesen vergleicht mit Altstand', "const erwartet = { descriptionHtml: z.descriptionHtml ?? ist.descriptionHtml, seoTitle: eingabe.seo.title, seoDescription: eingabe.seo.description };", "const erwartet = { descriptionHtml: ist.descriptionHtml, seoTitle: eingabe.seo.title, seoDescription: eingabe.seo.description };"),
    ('SEO-Beschreibung nicht mitgeschrieben', "description: z.seoDescription !== undefined && z.seoDescription !== null ? z.seoDescription : ist.seoDescription }", "description: ist.seoDescription }"),
    ('Beschreibung nicht mitgeschrieben', "descriptionHtml: z.descriptionHtml ?? ist.descriptionHtml, seo:", "descriptionHtml: ist.descriptionHtml, seo:"),
    ('nicht lesbare Sammlung wird übergangen', "if (!ist) { log(`FEHLT ${e.handle}: Sammlung nicht lesbar`); ledger('FEHLER', e.handle, 'nicht lesbar'); schlecht++; continue; }", "if (!ist) { continue; }"),
    ('ONLY wirkt nie', "!o.nur?.length || o.nur.includes(e.handle)", "true"),
    ('Handle-Suche nimmt ersten Treffer', "(j.collections?.nodes || []).find((x) => x.handle === handle)", "(j.collections?.nodes || [])[0]"),
    ('Endcode immer 0', "return schlecht ? 6 : 0;\n}\n\n// ----", "return 0;\n}\n\n// ----"),
    ('null und leer nicht gleich', "(a?.[f] || null) === (b?.[f] || null));", "(a?.[f]) === (b?.[f]));"),
    ('Kommentare ungeordnet verglichen', "JSON.stringify(kA) !== JSON.stringify(kN)", "[...kA].sort().join() !== [...kN].sort().join()"),
]

def main():
    tmp = tempfile.mkdtemp(prefix='sammlmut-')
    try:
        aufbauen(tmp)
        if lauf(tmp) != 0: print('Ausgangslage ist NICHT grün, Abbruch'); return 2
        quelle = open(os.path.join(HIER, T), encoding='utf8').read()
        erkannt = ueberlebt = nicht = 0
        for name, alt, neu in MUT:
            if quelle.count(alt) != 1:
                nicht += 1; print(f'  ? nicht anwendbar ({quelle.count(alt)}×): {name}'); continue
            ziel = os.path.join(tmp, 'dropship', 'silber-bazg-1711', T)
            open(ziel, 'w', encoding='utf8').write(quelle.replace(alt, neu))
            rc = lauf(tmp)
            open(ziel, 'w', encoding='utf8').write(quelle)
            if rc != 0: erkannt += 1
            else: ueberlebt += 1; print(f'  ! ÜBERLEBT: {name}')
        print(f'{erkannt} von {len(MUT)} erkannt, {ueberlebt} überlebt, {nicht} nicht anwendbar')
        return 0 if ueberlebt == 0 and nicht == 0 else 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__': sys.exit(main())
