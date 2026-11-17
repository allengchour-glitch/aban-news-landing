#!/usr/bin/env python3
"""Mutationsprobe für karat_texte.mjs: je Mutant eine Kopie im Wegwerf-Ordner (mit der Verzeichnisform des Repos), karat_texte_test.mjs muss ROT werden. Ausgangslage muss grün sein.
Lauf (Repo-Wurzel): python3 dropship/gold-bazg-1711/mutationsprobe_karat.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
DATEIEN = ['karat_texte.mjs', 'karat_texte_test.mjs']
T = 'karat_texte.mjs'

def aufbauen(tmp):
    for d in DATEIEN:
        z = os.path.join(tmp, 'dropship', 'gold-bazg-1711', d); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(HIER, d), z)

def lauf(tmp):
    r = subprocess.run([NODE, os.path.join(tmp, 'dropship', 'gold-bazg-1711', 'karat_texte_test.mjs')], capture_output=True, text=True, timeout=180)
    return r.returncode

MUT = [
    # --- Erkennung der Behauptungen
    ('KT ohne Wortgrenze rechts', "(?:k|kt|karat|carat)(?![a-zäöüß])`;\nconst KA", "(?:k|kt|karat|carat)`;\nconst KA"),
    ('KT ohne Leerzeichen/Bindestrich', "\\s?[-‑]?\\s?(?:k|kt|karat|carat)", "(?:k|kt|karat|carat)"),
    ('KT ohne Bindestrich', "\\s?[-‑]?\\s?(?:k|kt|karat|carat)", "\\s?\\s?(?:k|kt|karat|carat)"),
    ('KT ohne Leerzeichen', "\\s?[-‑]?\\s?(?:k|kt|karat|carat)", "[-‑]?(?:k|kt|karat|carat)"),
    ('KT ohne carat', "(?:k|kt|karat|carat)", "(?:k|kt|karat)"),
    ('KT ohne kt', "(?:k|kt|karat|carat)", "(?:k|karat|carat)"),
    ('KT ohne karat', "(?:k|kt|karat|carat)", "(?:k|kt|carat)"),
    ('KT ohne 24', "const KT = S`(?:9|10|14|18|22|24)", "const KT = S`(?:9|10|14|18|22)"),
    ('KT ohne 9', "const KT = S`(?:9|10|14|18|22|24)", "const KT = S`(?:10|14|18|22|24)"),
    ('Lookbehind der Zahl fehlt', "const LB = S`(?<![\\w.,])`;", "const LB = S``;"),
    ('KA (karätig) fehlt', "S`${LB}${KT}`, KA,", "S`${LB}${KT}`,"),
    ('goldplattiert fehlt', "S`gold[\\s\\-‑]?plattier`,", "S`xxplattier`,"),
    ('Goldplatierung fehlt', "S`gold[\\s\\-‑]?platier`,", "S`xxplatier`,"),
    ('goldverplattet fehlt', "S`gold[\\s\\-‑]?verplatt`,", "S`xxverplatt`,"),
    ('Gold filled fehlt', "S`gold[\\s\\-‑]?filled`,", "S`xxfilled`,"),
    ('Goldauflage fehlt', "S`gold[\\s\\-‑]?auflage`,", "S`xxauflage`,"),
    ('goldgefüllt fehlt', "S`goldgefüll`,", "S`xxgefüll`,"),
    ('Gold-Füllung fehlt', "S`gold[\\s\\-‑]?füllung`,", "S`xxfüllung`,"),
    ('Echtgold fehlt', "S`echt[\\s\\-‑]?gold`,", "S`xxgold`,"),
    ('echtes Gold fehlt', "S`echtes\\s+gold`,", "S`xxgold`,"),
    ('real gold fehlt', "S`real\\s+gold`,", "S`xxgold`,"),
    ('Echtvergoldung fehlt', "S`echt[\\s\\-‑]?vergold`,", "S`xxvergold`,"),
    ('Reinheit/Purität/Feingehalt fehlt', "S`(?<![\\w-])(?:reinheit|purität|purity|feingehalt)(?![\\w])`,", "S`xxxx`,"),
    ('Reinheit fehlt', "(?:reinheit|purität|purity|feingehalt)", "(?:purität|purity|feingehalt)"),
    ('Purität fehlt', "(?:reinheit|purität|purity|feingehalt)", "(?:reinheit|purity|feingehalt)"),
    ('Feingehalt fehlt', "(?:reinheit|purität|purity|feingehalt)", "(?:reinheit|purität|purity)"),
    ('Suche ist nicht gross-/kleinschreibungsunabhängig', "].join('|'), 'gi');", "].join('|'), 'g');"),
    ('belege zählt Kommentare mit', ".replace(/<!--[\\s\\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ')", ".replace(/<[^>]*>/g, ' ')"),
    ('belege liest Attribute mit', ".replace(/<!--[\\s\\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ')", ".replace(/<!--[\\s\\S]*?-->/g, ' ')"),
    ('norm: Zeilenenden bleiben', ".replace(/\\r\\n?/g, '\\n').replace(/\\s+$/, '')", ".replace(/\\s+$/, '')"),
    ('norm: Endleerraum bleibt', ".replace(/\\r\\n?/g, '\\n').replace(/\\s+$/, '')", ".replace(/\\r\\n?/g, '\\n')"),
    ('felderVon: nur alt', "e?.alt?.[f] !== undefined || e?.neu?.[f] !== undefined", "e?.alt?.[f] !== undefined"),
    ('felderVon: nur neu', "e?.alt?.[f] !== undefined || e?.neu?.[f] !== undefined", "e?.neu?.[f] !== undefined"),
    ('trefferZahl: alle Felder statt der genannten', "felder.reduce((n, f) => n + belege(stand?.[f]).length, 0)", "FELDER.reduce((n, f) => n + belege(stand?.[f]).length, 0)"),
    ('trefferZahl zählt nichts', "felder.reduce((n, f) => n + belege(stand?.[f]).length, 0)", "0"),
    ('gleichStand: alle Felder statt der Eintragsfelder', "felder.every((f) => gleichFeld(f, a, b))", "FELDER.every((f) => gleichFeld(f, a, b))"),
    ('gleichStand: immer gleich', "felder.every((f) => gleichFeld(f, a, b))", "true"),
    ('Grenze SEO-Titel 70 → 700', "seoTitle: 70,", "seoTitle: 700,"),
    ('Grenze SEO-Beschreibung 160 → 1600', "seoDescription: 160 }", "seoDescription: 1600 }"),
    # --- Tore
    ('Tor unvollständig aus', "if (!e || !e.handle || !e.id || !e.alt || !e.neu) return", "if (false) return"),
    ('Tor id nicht verlangt', "!e.handle || !e.id ||", "!e.handle ||"),
    ('Tor handle nicht verlangt', "!e || !e.handle || !e.id", "!e || !e.id"),
    ('Tor keine Felder aus', "if (!felder.length) return", "if (false) return"),
    ('Tor unbekanntes Feld aus', "if (!FELDER.includes(k)) p.push('unbekanntes Feld ' + k);", "if (false) p.push('unbekanntes Feld ' + k);"),
    ('Tor Text-Typ aus', "if (typeof e.alt[f] !== 'string' || typeof e.neu[f] !== 'string') return", "if (false) return"),
    ('Tor alt gleich neu aus', "if (norm(e.alt[f]) === norm(e.neu[f])) p.push", "if (false) p.push"),
    ('Tor alt ohne Behauptung aus', "if (tA === 0) p.push", "if (false) p.push"),
    ('Tor Rest-Behauptung aus', "if (tN > 0) p.push", "if (false) p.push"),
    ('Tor Rest-Behauptung erst ab 2', "if (tN > 0) p.push", "if (tN > 1) p.push"),
    ('Tor Kommentare aus', "if (JSON.stringify(kommentare(a)) !== JSON.stringify(kommentare(n))) p.push", "if (false) p.push"),
    ('Tor Kommentare ungeordnet', "JSON.stringify(kommentare(a)) !== JSON.stringify(kommentare(n))", "[...kommentare(a)].sort().join() !== [...kommentare(n)].sort().join()"),
    ('Tor Tags aus', "if ((zA.get(t) || 0) < c) {", "if (false) {"),
    ('Tor Tags nur Namen statt ganzer Tag', "const zA = zaehle(tags(a)), zN = zaehle(tags(n));", "const zA = zaehle(tags(a).map((t) => t.replace(/\\s.*/, '>'))), zN = zaehle(tags(n).map((t) => t.replace(/\\s.*/, '>')));"),
    ('Tags ohne Schliess-Tags', "match(/<\\/?[a-zA-Z][^>]*>/g)", "match(/<[a-zA-Z][^>]*>/g)"),
    ('Tor Tagzahl aus', "if (weg !== (e.tagsEntfernt ?? 0)) p.push", "if (false) p.push"),
    ('Tor Tagzahl nur nach unten', "if (weg !== (e.tagsEntfernt ?? 0)) p.push", "if (weg < (e.tagsEntfernt ?? 0)) p.push"),
    ('Tor Tagzahl nur nach oben', "if (weg !== (e.tagsEntfernt ?? 0)) p.push", "if (weg > (e.tagsEntfernt ?? 0)) p.push"),
    ('Tor leerer Text aus', "if (!klarText(n)) p.push('Text würde leer');", "if (false) p.push('Text würde leer');"),
    ('Tor Schrumpf-Bremse aus', "else if (klarText(n).length < klarText(a).length * 0.6) p.push", "else if (false) p.push"),
    ('Tor Schrumpf-Bremse 0,6 → 0,06', "klarText(a).length * 0.6) p.push", "klarText(a).length * 0.06) p.push"),
    ('Tor Titel leer aus', "if (!e.neu.title.trim()) p.push('Titel würde leer');", "if (false) p.push('Titel würde leer');"),
    ('Tor Titel-Bremse aus', "else if (e.neu.title.length < e.alt.title.length * 0.4) p.push", "else if (false) p.push"),
    ('Tor Titel-Bremse 0,4 → 0,04', "e.alt.title.length * 0.4) p.push", "e.alt.title.length * 0.04) p.push"),
    ('Tor Titel 255 → 2550', "e.neu.title.length > 255", "e.neu.title.length > 2550"),
    ('Tor SEO leer aus', "if (!e.neu[f].trim()) p.push(`${f} würde leer`);", "if (false) p.push(`${f} würde leer`);"),
    ('Tor SEO-Länge aus', "if (e.neu[f].length > Math.max(MAX_LAENGE[f], e.alt[f].length)) p.push", "if (false) p.push"),
    ('Tor SEO-Länge ohne alte Länge', "Math.max(MAX_LAENGE[f], e.alt[f].length)", "MAX_LAENGE[f]"),
    ('Tor SEO-Länge mit min statt max', "Math.max(MAX_LAENGE[f], e.alt[f].length)", "Math.min(MAX_LAENGE[f], e.alt[f].length)"),
    ('Tor Tags/Kommentare nur bei vorhandenem Feld entfällt', "if (felder.includes('descriptionHtml')) {", "if (false) {"),
    # --- Lauf
    ('flach: SEO-Titel aus der Beschreibung', "seoTitle: n.seo?.title ?? null", "seoTitle: n.seo?.description ?? null"),
    ('flach: SEO-Beschreibung aus dem Titel', "seoDescription: n.seo?.description ?? null", "seoDescription: n.seo?.title ?? null"),
    ('flach: Status fehlt', "status: n.status,", "status: 'ACTIVE',"),
    ('flach: leere Beschreibung null statt Text', "descriptionHtml: n.descriptionHtml ?? ''", "descriptionHtml: n.descriptionHtml ?? null"),
    ('Lesen: Handle-Prüfung aus', "return n && n.handle === e.handle ? flach(n) : null;", "return n ? flach(n) : null;"),
    ('Lesen: Variablenname falsch', "await o.q(LESEN, { h: e.handle })", "await o.q(LESEN, { q: e.handle })"),
    ('Schreiben: Variablenname falsch', "await o.q(SCHREIBEN, { in: eingabe })", "await o.q(SCHREIBEN, { input: eingabe })"),
    ('keine Einträge nicht abgefangen', "if (!eintraege.length) {", "if (false) {"),
    ('doppelte Einträge nicht abgefangen', "if (new Set(eintraege.map((e) => e.handle)).size !== eintraege.length) {", "if (false) {"),
    ('Tore auch bei Rücknahme', "if (!o.zurueck) {\n    let rot = 0;", "if (true) {\n    let rot = 0;"),
    ('Tore melden nicht', "if (rot) { log(`${rot} Einträge bestehen die Tore nicht, nichts geschrieben`); return 2; }", "if (false) { return 2; }"),
    ('ONLY wirkt nie', "!o.nur?.length || o.nur.includes(e.handle)", "true"),
    ('Soll bei Rücknahme falsch', "const soll = (e) => (o.zurueck ? e.alt : e.neu);", "const soll = (e) => e.neu;"),
    ('Fremd: nur Altstand gilt als eigen', "!gleichFeld(f, ist, e.alt) && !gleichFeld(f, ist, e.neu))", "!gleichFeld(f, ist, e.alt))"),
    ('Fremd: nur Neustand gilt als eigen', "!gleichFeld(f, ist, e.alt) && !gleichFeld(f, ist, e.neu))", "!gleichFeld(f, ist, e.neu))"),
    ('Fremd: alt ODER neu (||)', "!gleichFeld(f, ist, e.alt) && !gleichFeld(f, ist, e.neu))", "!gleichFeld(f, ist, e.alt) || !gleichFeld(f, ist, e.neu))"),
    ('Fremd: alle Felder statt der Eintragsfelder', "felderVon(e).filter((f) => !gleichFeld(f, ist, e.alt)", "FELDER.filter((f) => !gleichFeld(f, ist, e.alt)"),
    ('Fremdschutz aus', "if (fremd.length && !o.fremdUeberschreiben) {", "if (false) {"),
    ('FREMD_UEBERSCHREIBEN wirkt nie', "&& !o.fremdUeberschreiben) {", "&& true) {"),
    ('schon erledigt nicht erkannt', "if (gleichStand(ist, z, felder)) {", "if (false) {"),
    ('id-Prüfung aus', "if (ist.id !== e.id) {", "if (false) {"),
    ('nicht lesbarer Eintrag wird übergangen', "if (!ist) { log(`FEHLT ${k}: nicht lesbar`); ledger('FEHLER', k, 'nicht lesbar'); schlecht++; continue; }", "if (!ist) { continue; }"),
    ('MAX-Grenze aus', "if (o.live && geschrieben >= max) { ausgelassen++; continue; }", "if (false) { ausgelassen++; continue; }"),
    ('MAX-Grenze um eins zu hoch', "geschrieben >= max) {", "geschrieben > max) {"),
    ('MAX-Vorgabe 0', "const max = o.max ?? 40;", "const max = o.max ?? 0;"),
    ('Trockenlauf schreibt', "if (!o.live) continue;", ""),
    ('Update schreibt alle Felder statt der geänderten', "const aend = felder.filter((f) => !gleichFeld(f, ist, z));", "const aend = felder;"),
    ('Titel/Text vom Altstand', "x === 'title' || x === 'descriptionHtml')) eingabe[f] = z[f];", "x === 'title' || x === 'descriptionHtml')) eingabe[f] = ist[f];"),
    ('SEO-Block immer', "if (seoF.length) {", "if (true) {"),
    ('SEO-Titel vom Altstand', "seoF.includes('seoTitle') ? z.seoTitle : ist.seoTitle", "ist.seoTitle"),
    ('SEO-Beschreibung vom Altstand', "seoF.includes('seoDescription') ? z.seoDescription : ist.seoDescription", "ist.seoDescription"),
    ('SEO-Titel nicht gesendet, wenn unverändert', "seoF.includes('seoTitle') ? z.seoTitle : ist.seoTitle", "seoF.includes('seoTitle') ? z.seoTitle : null"),
    ('SEO-Beschreibung nicht gesendet, wenn unverändert', "seoF.includes('seoDescription') ? z.seoDescription : ist.seoDescription", "seoF.includes('seoDescription') ? z.seoDescription : null"),
    ('SEO-Titel auch als null senden', "if (titel != null) eingabe.seo.title = titel;", "eingabe.seo.title = titel;"),
    ('SEO-Beschreibung auch als null senden', "if (beschr != null) eingabe.seo.description = beschr;", "eingabe.seo.description = beschr;"),
    ('Fehler der Mutation verschluckt', "fehler = j.productUpdate?.userErrors || [];", "fehler = [];"),
    ('Ausnahme beim Schreiben verschluckt', "catch (x) { fehler = [{ message: 'Ausnahme: ' + x.message }]; }", "catch (x) { fehler = []; }"),
    ('Schreibfehler ohne Halt', "ledger('FEHLER', k, fehler.map((f) => f.message).join(' | ')); return 6; }", "ledger('FEHLER', k, fehler.map((f) => f.message).join(' | ')); }"),
    ('Rücklesen vergleicht mit Altstand', "if (nach && gleichStand(nach, z, felder)) { ok = true; break; }", "if (nach && gleichStand(nach, ist, felder)) { ok = true; break; }"),
    ('Rücklesen ohne Wiederholung', "const versuche = o.leseVersuche ?? 5", "const versuche = 1"),
    ('gleichFeld: SEO-Titel-Sonderfall aus', "if (f !== 'seoTitle') return false;", "return false;"),
    ('gleichFeld: leer gilt immer als gleich', "return leer(a?.seoTitle) && !leer(b?.seoTitle) && norm(b.seoTitle) === norm(a?.title);", "return leer(a?.seoTitle) && !leer(b?.seoTitle);"),
    ('gleichFeld: Titel der falschen Seite', "norm(b.seoTitle) === norm(a?.title);", "norm(b.seoTitle) === norm(b?.title);"),
    # gleichwertig, nicht aufgenommen: «!leer(b.seoTitle)» streichen – sind beide SEO-Titel leer, hat die erste Zeile von gleichFeld schon «gleich» geliefert.
    ('gleichFeld: leer-Test ignoriert Leerzeichen nicht', "const leer = (v) => v == null || norm(v) === '';", "const leer = (v) => v == null;"),
    ('Rücklesen ohne Halt', "if (!ok) { log(`ABWEICHUNG", "if (false) { log(`ABWEICHUNG"),
    ('Nebenwirkungs-Prüfung aus', "if (!unveraendert) {", "if (false) {"),
    ('Nebenwirkung: Status nicht verglichen', " && nach.status === ist.status;", ";"),
    ('Nebenwirkung: andere Felder nicht verglichen', "FELDER.filter((f) => !felder.includes(f)).every((f) => gleichFeld(f, nach, ist))", "true"),
    ('Nebenwirkung ohne Halt', "log(`ABWEICHUNG ${k}: ein Feld ausserhalb des Eintrags oder der Status hat sich geändert, Halt`); return 6; }", "log(`ABWEICHUNG ${k}`); }"),
    ('Ledger-Art bei Rücknahme falsch', "ledger(ok ? (o.zurueck ? 'ZURUECK' : 'GESCHRIEBEN') : 'ABWEICHUNG'", "ledger(ok ? 'GESCHRIEBEN' : 'ABWEICHUNG'"),
    ('Ledger ohne Abweichung', "'ABWEICHUNG', k, ok ?", "'GESCHRIEBEN', k, ok ?"),
    ('Endcode (live) immer 0', "ausgelassen: ${ausgelassen}` : ''}`);\n  return schlecht ? 6 : 0;", "ausgelassen: ${ausgelassen}` : ''}`);\n  return 0;"),
    ('Trockenlauf-Endcode immer 0', "${schlecht} Probleme`); return schlecht ? 6 : 0; }", "${schlecht} Probleme`); return 0; }"),
]

def main():
    tmp = tempfile.mkdtemp(prefix='karatmut-')
    try:
        aufbauen(tmp)
        if lauf(tmp) != 0: print('Ausgangslage ist NICHT grün, Abbruch'); return 2
        quelle = open(os.path.join(HIER, T), encoding='utf8').read()
        erkannt = ueberlebt = nicht = 0
        for name, alt, neu in MUT:
            if quelle.count(alt) != 1:
                nicht += 1; print(f'  ? nicht anwendbar ({quelle.count(alt)}×): {name}'); continue
            ziel = os.path.join(tmp, 'dropship', 'gold-bazg-1711', T)
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
