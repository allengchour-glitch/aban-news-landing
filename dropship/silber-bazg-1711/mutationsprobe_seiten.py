#!/usr/bin/env python3
"""Mutationsprobe für seitentexte.mjs: je Mutant eine Kopie im Wegwerf-Ordner (mit der Verzeichnisform des Repos), seitentexte_test.mjs muss ROT werden. Ausgangslage muss grün sein.
Lauf (Repo-Wurzel): python3 dropship/silber-bazg-1711/mutationsprobe_seiten.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
WURZEL = os.path.abspath(os.path.join(HIER, '..', '..'))
DATEIEN = ['seitentexte.mjs', 'seitentexte_test.mjs']
T = 'seitentexte.mjs'

def aufbauen(tmp):
    for d in DATEIEN + (['seitentexte.json'] if os.path.exists(os.path.join(HIER, 'seitentexte.json')) else []):
        z = os.path.join(tmp, 'dropship', 'silber-bazg-1711', d); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(HIER, d), z)
    z = os.path.join(tmp, 'automation', 'lib', 'silber_feingehalt.mjs'); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(WURZEL, 'automation', 'lib', 'silber_feingehalt.mjs'), z)

def lauf(tmp):
    r = subprocess.run([NODE, os.path.join(tmp, 'dropship', 'silber-bazg-1711', 'seitentexte_test.mjs')], capture_output=True, text=True, timeout=180)
    return r.returncode

MUT = [
    ('Tor Artikel ohne blog aus', "if (e.art === 'Artikel' && !e.blog) p.push", "if (false) p.push"),
    ('Tor art unbekannt zugelassen', "!['Seite', 'Artikel'].includes(e.art)", "false"),
    ('Tor unvollständiger Eintrag aus', "if (!e || !e.handle ||", "if (false ||"),
    ('Tor Text-Typ aus', "if (typeof e.alt[f] !== 'string' || typeof e.neu[f] !== 'string') return", "if (false) return"),
    ('Tor keine Felder aus', "if (!felder.length) return", "if (false) return"),
    ('Tor Seite mit summary erlaubt', "if (e.art === 'Seite' && felder.includes('summary')) p.push", "if (false) p.push"),
    ('Tor SEO-Titel 70 → 700', "e.neu.seoTitle.length > 70", "e.neu.seoTitle.length > 700"),
    ('Tor SEO-Titel leer erlaubt', "if (!e.neu.seoTitle.trim()) p.push", "if (false) p.push"),
    ('Tor SEO-Beschreibung 160 → 1600', "e.neu.seoDescription.length > 160", "e.neu.seoDescription.length > 1600"),
    ('Tor SEO-Beschreibung leer erlaubt', "if (!e.neu.seoDescription.trim()) p.push", "if (false) p.push"),
    ('Tor Tags/Kommentare nur für body', "for (const f of felder.filter((x) => HTML_FELDER.includes(x))) {", "for (const f of felder.filter((x) => x === 'body')) {"),

    ('Tor rest fehlt aus', "if (!Number.isInteger(e.rest) || e.rest < 0) p.push", "if (false) p.push"),
    ('Tor rest negativ erlaubt', "|| e.rest < 0) p.push", ") p.push"),
    ('Tor «entfernt nichts» aus', "if (tN >= tA) p.push", "if (false) p.push"),
    ('Tor «entfernt nichts» nur bei mehr', "if (tN >= tA) p.push", "if (tN > tA) p.push"),
    ('Tor Restzahl aus', "if (Number.isInteger(e.rest) && tN !== e.rest) p.push", "if (false) p.push"),
    ('Tor Restzahl nur nach oben', "if (Number.isInteger(e.rest) && tN !== e.rest) p.push", "if (Number.isInteger(e.rest) && tN > e.rest) p.push"),
    ('Tor Restzahl nur nach unten', "if (Number.isInteger(e.rest) && tN !== e.rest) p.push", "if (Number.isInteger(e.rest) && tN < e.rest) p.push"),
    ('Tor Kommentare aus', "if (JSON.stringify(kommentare(e.alt[f])) !== JSON.stringify(kommentare(e.neu[f]))) p.push", "if (false) p.push"),
    ('Tor Kommentare ungeordnet', "JSON.stringify(kommentare(e.alt[f])) !== JSON.stringify(kommentare(e.neu[f]))", "[...kommentare(e.alt[f])].sort().join() !== [...kommentare(e.neu[f])].sort().join()"),
    ('Tor Tags aus', "if ((zA.get(t) || 0) < c) {", "if (false) {"),
    ('Tor Tags nur Namen statt ganzer Tag', "const zA = zaehle(tags(e.alt[f])), zN = zaehle(tags(e.neu[f]));", "const zA = zaehle(tags(e.alt[f]).map((t) => t.replace(/\\s.*/, '>'))), zN = zaehle(tags(e.neu[f]).map((t) => t.replace(/\\s.*/, '>')));"),
    ('Tor leerer Text aus', "if (!klar(e.neu.body)) p.push('Text würde leer');", "if (false) p.push('Text würde leer');"),
    ('Tor Schrumpf-Bremse aus', "else if (klar(e.neu.body).length < klar(e.alt.body).length * 0.4) p.push", "else if (false) p.push"),
    ('Tor Schrumpf-Bremse 0,4 → 0,04', "length * 0.4) p.push", "length * 0.04) p.push"),
    ('trefferZahl zählt nichts', "export const trefferZahl = (stand, felder = FELDER) =>", "export const trefferZahl = (stand, felder = FELDER) => 0 &&"),
    ('trefferZahl: Zeichenkette zählt nicht als body', "typeof stand === 'string' ? trefferFeld('body', stand) :", "false ? 0 :"),
    ('trefferZahl: alle Felder statt der genannten', "felder.reduce((n, f) => n + trefferFeld(f, stand?.[f]), 0)", "FELDER.reduce((n, f) => n + trefferFeld(f, stand?.[f]), 0)"),
    ('felderVon: nur alt', "e?.alt?.[f] !== undefined || e?.neu?.[f] !== undefined", "e?.alt?.[f] !== undefined"),
    ('felderVon: nur neu', "e?.alt?.[f] !== undefined || e?.neu?.[f] !== undefined", "e?.neu?.[f] !== undefined"),
    ('gleichStand: Felder ausserhalb des Eintrags zählen', "felder.every((f) => norm(a?.[f]) === norm(b?.[f]))", "FELDER.every((f) => norm(a?.[f]) === norm(b?.[f]))"),
    ('flach: SEO-Titel aus dem falschen Schlüssel', "seoTitle: mf('title_tag')", "seoTitle: mf('description_tag')"),
    ('flach: SEO-Beschreibung aus dem falschen Schlüssel', "seoDescription: mf('description_tag')", "seoDescription: mf('title_tag')"),
    ('flach: Metafelder fremder Namensräume zählen', "m.namespace === 'global' && m.key === k", "m.key === k"),
    ('norm: Zeilenenden bleiben', "String(s ?? '').replace(/\\r\\n?/g, '\\n').replace(/\\s+$/, '')", "String(s ?? '').replace(/\\s+$/, '')"),
    ('norm: Endleerraum bleibt', "'\\n').replace(/\\s+$/, '')", "'\\n')"),
    ('Schlüssel ohne Blog', "${e.art === 'Artikel' ? e.blog || '' : ''}", "${''}"),
    ('Schlüssel ohne Art', "`${e.art}:${e.art === 'Artikel'", "`${''}:${e.art === 'Artikel'"),
    ('keine Einträge nicht abgefangen', "if (!eintraege.length) {", "if (false) {"),
    ('doppelte Einträge nicht abgefangen', "if (new Set(eintraege.map(schluessel)).size !== eintraege.length) {", "if (false) {"),
    ('Tore auch bei Rücknahme', "if (!o.zurueck) {\n    let rot = 0;", "if (true) {\n    let rot = 0;"),
    ('Tore melden nicht', "if (rot) { log(`${rot} Einträge bestehen die Tore nicht, nichts geschrieben`); return 2; }", "if (false) { return 2; }"),
    ('Seite liest Artikelabfrage', "const j = await o.q(LESEN_SEITE, { q: `handle:${e.handle}` });", "const j = await o.q(LESEN_ARTIKEL, { q: `handle:${e.handle}` });"),
    ('Artikel ohne Blog-Prüfung beim Lesen', "x.handle === e.handle && x.blog?.handle === e.blog", "x.handle === e.handle"),
    ('Seite nimmt ersten Treffer', "(j.pages?.nodes || []).find((x) => x.handle === e.handle)", "(j.pages?.nodes || [])[0]"),
    ('Artikel nimmt ersten Treffer', "(j.articles?.nodes || []).find((x) => x.handle === e.handle && x.blog?.handle === e.blog)", "(j.articles?.nodes || [])[0]"),
    ('Soll bei Rücknahme falsch', "const soll = (e) => (o.zurueck ? e.alt : e.neu);", "const soll = (e) => e.neu;"),
    ('Fremd: nur Altstand gilt als eigen', "norm(ist[f]) !== norm(e.alt[f]) && norm(ist[f]) !== norm(e.neu[f]))", "norm(ist[f]) !== norm(e.alt[f]))"),
    ('Fremd: nur Neustand gilt als eigen', "norm(ist[f]) !== norm(e.alt[f]) && norm(ist[f]) !== norm(e.neu[f]))", "norm(ist[f]) !== norm(e.neu[f]))"),
    ('Fremd: alt ODER neu reicht nicht (||)', "norm(ist[f]) !== norm(e.alt[f]) && norm(ist[f]) !== norm(e.neu[f]))", "norm(ist[f]) !== norm(e.alt[f]) || norm(ist[f]) !== norm(e.neu[f]))"),
    ('Fremd: alle Felder statt der Eintragsfelder', "felderVon(e).filter((f) => norm(ist[f])", "FELDER.filter((f) => norm(ist[f])"),
    ('schon erledigt nicht erkannt', "if (gleichStand(ist, z, felder)) {", "if (false) {"),
    ('Fremdschutz aus', "if (fremd.length && !o.fremdUeberschreiben) {", "if (false) {"),
    ('FREMD_UEBERSCHREIBEN wirkt nie', "&& !o.fremdUeberschreiben) {", "&& true) {"),
    ('Trockenlauf schreibt', "if (!o.live) continue;", ""),
    ('Seite schreibt mit Artikelabfrage', "const j = e.art === 'Seite' ? await o.q(SCHREIBEN_SEITE,", "const j = e.art === 'Seite' ? await o.q(SCHREIBEN_ARTIKEL,"),
    ('Artikel schreibt mit Seitenabfrage', ": await o.q(SCHREIBEN_ARTIKEL, { id: ist.id, in: eingabe });", ": await o.q(SCHREIBEN_SEITE, { id: ist.id, in: eingabe });"),
    ('Update auch ohne Änderung (alle HTML-Felder)', "for (const f of felder.filter((x) => HTML_FELDER.includes(x) && norm(ist[x]) !== norm(z[x]))) eingabe[f] = z[f];", "for (const f of felder.filter((x) => HTML_FELDER.includes(x))) eingabe[f] = z[f];"),
    ('Update-Aufruf auch bei leerer Eingabe', "if (Object.keys(eingabe).length) {", "if (true) {"),
    ('SEO nur bei Fehlerfreiheit entfällt', "if (!fehler.length && seoGeaendert.length) {", "if (seoGeaendert.length) {"),
    ('SEO wird nie geschrieben', "if (!fehler.length && seoGeaendert.length) {", "if (false) {"),
    ('SEO schreibt alle Felder statt der geänderten', "seoGeaendert.map((f) => ({ ownerId", "felder.filter((x) => SEO_SCHLUESSEL[x]).map((f) => ({ ownerId"),
    ('SEO-Schlüssel vertauscht', "const SEO_SCHLUESSEL = { seoTitle: 'title_tag', seoDescription: 'description_tag' };", "const SEO_SCHLUESSEL = { seoTitle: 'description_tag', seoDescription: 'title_tag' };"),
    ('SEO-Namensraum falsch', "namespace: 'global', key: SEO_SCHLUESSEL[f]", "namespace: 'custom', key: SEO_SCHLUESSEL[f]"),
    ('SEO-Fehler werden verschluckt', "fehler = j.metafieldsSet?.userErrors || [];", "fehler = [];"),
    ('SEO-Wert vom Altstand', "type: 'single_line_text_field', value: z[f] }", "type: 'single_line_text_field', value: ist[f] }"),
    ('Fehler der Mutation werden verschluckt', "fehler = (e.art === 'Seite' ? j.pageUpdate : j.articleUpdate)?.userErrors || [];", "fehler = [];"),
    ('Ausnahme beim Schreiben wird verschluckt', "catch (x) { fehler = [{ message: 'Ausnahme: ' + x.message }]; }", "catch (x) { fehler = []; }"),
    ('Schreibfehler ohne Halt', "ledger('FEHLER', k, fehler.map((f) => f.message).join(' | ')); return 6; }", "ledger('FEHLER', k, fehler.map((f) => f.message).join(' | ')); }"),
    ('Rücklesen ohne Halt', "if (!ok) { log(`ABWEICHUNG", "if (false) { log(`ABWEICHUNG"),
    ('Rücklesen vergleicht mit Altstand', "if (jetztIst && gleichStand(jetztIst, z, felder)) { ok = true; break; }", "if (jetztIst && gleichStand(jetztIst, ist, felder)) { ok = true; break; }"),
    ('Rücklesen ohne Wiederholung', "const versuche = o.leseVersuche ?? 5", "const versuche = 1"),
    ('nicht lesbarer Eintrag wird übergangen', "if (!ist) { log(`FEHLT ${k}: nicht lesbar`); ledger('FEHLER', k, 'nicht lesbar'); schlecht++; continue; }", "if (!ist) { continue; }"),
    ('ONLY wirkt nie', "!o.nur?.length || o.nur.includes(e.handle)", "true"),
    ('Endcode immer 0', "return schlecht ? 6 : 0;\n}\n\n// ----", "return 0;\n}\n\n// ----"),
    ('Trockenlauf-Endcode immer 0', "if (!o.live) { log(`Trockenlauf: ${eintraege.length - schon - schlecht} würden geschrieben, ${schon} schon erledigt, ${schlecht} Probleme`); return schlecht ? 6 : 0; }", "if (!o.live) { log('Trockenlauf'); return 0; }"),
    ('Ledger-Art bei Rücknahme falsch', "ledger(ok ? (o.zurueck ? 'ZURUECK' : 'GESCHRIEBEN') : 'ABWEICHUNG'", "ledger(ok ? 'GESCHRIEBEN' : 'ABWEICHUNG'"),
    ('Ledger ohne Abweichung', "'ABWEICHUNG', k, ok ?", "'GESCHRIEBEN', k, ok ?"),
]

def main():
    tmp = tempfile.mkdtemp(prefix='seitenmut-')
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
