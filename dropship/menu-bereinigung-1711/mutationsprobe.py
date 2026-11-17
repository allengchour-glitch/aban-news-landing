#!/usr/bin/env python3
"""Mutationsprobe für das Menü-Bereinigungswerkzeug: jeder Mutant einzeln auf einer Kopie der nötigen Dateien, der Test muss fehlschlagen.
Aufruf aus der Repo-Wurzel:  python3 dropship/menu-bereinigung-1711/mutationsprobe.py [Nummern …]    (Exit 1, wenn ein Mutant überlebt oder nicht anwendbar ist)
Stand 17.11.2026: 68 Mutanten, 67 erkannt, 1 gleichwertig (Nr. 32: `k.id` im letzten Block von pruefePlan ist doppelt abgesichert, jede Fälschung fällt vorher auf)."""
import shutil, subprocess, sys, os, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATEIEN = ['automation/lib/menu_bereinigen.mjs', 'automation/lib/menu_bereinigen_test.mjs', 'automation/lib/menu_verschieben.mjs', 'automation/lib/menue_plan.mjs',
           'automation/lib/menu_uebersetzung.mjs', 'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs',
           'automation/menu_bereinigen.mjs', 'dropship/menu-bereinigung-1711/aenderungen.json', 'dropship/menu-bereinigung-1711/menu_vorher.json']
NODE = shutil.which('node') or '/opt/node22/bin/node'
LIB = 'automation/lib/menu_bereinigen.mjs'
RUN = 'automation/menu_bereinigen.mjs'

M = [
 # --- Lib: plane ---
 (LIB, "if (t.length !== 1) { fehler.push(`${w}: «${pfadText(o.pfad)}» ${t.length ? `ist mehrdeutig (${t.length} Treffer)` : (gefiltert", "if (t.length < 1) { fehler.push(`${w}: «${pfadText(o.pfad)}» ${t.length ? `ist mehrdeutig (${t.length} Treffer)` : (gefiltert", 'entfernen: Mehrdeutigkeit zugelassen'),
 (LIB, "if (!zeigtAuf(e, { handle: o.handle, colId: colIds[o.handle] })) {", "if (false) {", 'entfernen: Ziel-Handle nicht geprüft'),
 (LIB, "if ((e.items || []).length) {", "if (false) {", 'entfernen: Kinder nicht geprüft'),
 (LIB, "elternListe(b, t[0].idx).splice(t[0].idx[t[0].idx.length - 1], 1);", "", 'entfernen: Eintrag bleibt stehen'),
 (LIB, "if (e.type !== 'HTTP') {", "if (false) {", 'url: Typ nicht geprüft'),
 (LIB, "if (shopPfad(e.url) !== o.von) {", "if (false) {", 'url: alte Adresse nicht geprüft'),
 (LIB, "if (!colIds[ziel]) {", "if (false) {", 'url: Ziel-Collection nicht geprüft'),
 (LIB, "e.url = o.nach;", "", 'url: Adresse wird nicht geändert'),
 (LIB, "if (kinder.some(", "if (false && kinder.some(", 'einfügen: Dublette nicht geprüft'),
 (LIB, "if (o.pos > kinder.length) {", "if (false) {", 'einfügen: pos nicht geprüft'),
 (LIB, "if (o.eltern.length + 1 > MAX_TIEFE) {", "if (false) {", 'einfügen: Tiefe nicht geprüft'),
 (LIB, "kinder.splice(o.pos, 0, ", "kinder.splice(kinder.length, 0, ", 'einfügen: falsche Stelle'),
 (LIB, "type: 'COLLECTION', resourceId: rid, items: [] }", "type: 'COLLECTION', items: [] }", 'einfügen: ohne resourceId'),
 (LIB, "const unerlaubt = info.verwaist.filter(h => !verwaistOk.includes(h));", "const unerlaubt = [];", 'verwaist: nie ein Fehler'),
 (LIB, "const vorher = menueHandles(alt, ridZuHandle), nachher = menueHandles(b, ridZuHandle);", "const vorher = menueHandles(alt), nachher = menueHandles(b);", 'verwaist: resourceId ignoriert'),
 (LIB, "if (e.type === 'COLLECTION' && e.resourceId && ridZuHandle[e.resourceId]) s.add(ridZuHandle[e.resourceId]);", "", 'menueHandles: resourceId ignoriert'),
 (LIB, "if (tiefe(b) > MAX_TIEFE) fehler.push(", "if (false) fehler.push(", 'Plan: Gesamttiefe nicht geprüft'),
 (LIB, "return { treffer: t.filter(x => zeigtAuf(x.eintrag, { handle, colId })), gefiltert: true };", "return { treffer: t, gefiltert: true };", 'trefferFuer: kein Filter'),
 (LIB, "if (t.length <= 1) return { treffer: t, gefiltert: false };", "if (t.length <= 2) return { treffer: t, gefiltert: false };", 'trefferFuer: Schwelle'),
 (LIB, "return { treffer: t.filter(x => zeigtAuf(x.eintrag, { handle, colId })), gefiltert: true };", "return { treffer: t.filter(x => zeigtAuf(x.eintrag, { handle })), gefiltert: true };", 'trefferFuer: colId vergessen'),
 # --- Lib: pruefePlan ---
 (LIB, "if (JSON.stringify(fehlend.sort()) !== JSON.stringify([...erwEntfernt].sort())) f.push(", "if (false) f.push(", 'pruefePlan: fehlende Einträge'),
 (LIB, "if (zuviel.length) f.push(", "if (false) f.push(", 'pruefePlan: unbekannte ids'),
 (LIB, "if (neue.length !== erwNeu.length) f.push(", "if (false) f.push(", 'pruefePlan: Zahl neuer Einträge'),
 (LIB, "for (const fl of ['title', 'type', 'resourceId', 'tags'])", "for (const fl of ['type', 'resourceId', 'tags'])", 'pruefePlan: Titel nicht verglichen'),
 (LIB, "for (const fl of ['title', 'type', 'resourceId', 'tags'])", "for (const fl of ['title', 'resourceId', 'tags'])", 'pruefePlan: Typ nicht verglichen'),
 (LIB, "for (const fl of ['title', 'type', 'resourceId', 'tags'])", "for (const fl of ['title', 'type', 'tags'])", 'pruefePlan: resourceId nicht verglichen'),
 (LIB, "for (const fl of ['title', 'type', 'resourceId', 'tags'])", "for (const fl of ['title', 'type', 'resourceId'])", 'pruefePlan: Tags nicht verglichen'),
 (LIB, "else if (urlA !== urlP) f.push(", "else if (false) f.push(", 'pruefePlan: fremde Adresse'),
 (LIB, "if (erwUrl.has(k)) { if (urlP !== erwUrl.get(k)) f.push(", "if (erwUrl.has(k)) { if (false) f.push(", 'pruefePlan: erwartete Adresse'),
 (LIB, "if (a.eltern !== p.eltern) f.push(", "if (false) f.push(", 'pruefePlan: Eltern'),
 (LIB, "if (JSON.stringify(x) !== JSON.stringify(y)) f.push(", "if (false) f.push(", 'pruefePlan: Reihenfolge'),
 (LIB, "if (!k || k.id || k.title !== o.titel || k.type !== 'COLLECTION' || !k.resourceId || k.resourceId !== colIds[o.handle] || k.url || (k.tags || []).length || (k.items || []).length) f.push(", "if (!k) f.push(", 'pruefePlan: neuer Eintrag nicht geprüft'),
 (LIB, "if (!k || k.id || k.title !== o.titel", "if (!k || k.title !== o.titel", 'pruefePlan: neuer Eintrag mit id'),
 (LIB, "if (zaehle(plan) !== zaehle(alt) - erwEntfernt.size + erwNeu.length) f.push(", "if (false) f.push(", 'pruefePlan: Anzahl'),
 (LIB, "if (tiefe(plan) > MAX_TIEFE) f.push(", "if (false) f.push(", 'pruefePlan: Tiefe'),
 # --- Lib: Nachlesen ---
 (LIB, "if (a.length !== r.length) fehler.push(", "if (false) fehler.push(", 'Nachlesen: Anzahl'),
 (LIB, "for (const fl of ['pfad', 'title', 'type', 'ziel', 'tags'])", "for (const fl of ['pfad', 'title', 'type', 'tags'])", 'Nachlesen: Ziel'),
 (LIB, "for (const fl of ['pfad', 'title', 'type', 'ziel', 'tags'])", "for (const fl of ['title', 'type', 'ziel', 'tags'])", 'Nachlesen: Pfad'),
 (LIB, "if (s.id) { if (s.id !== i.id) fehler.push(", "if (s.id) { if (false) fehler.push(", 'Nachlesen: id bleibt'),
 (LIB, "else if (!i.id || altIds.has(i.id)) fehler.push(", "else if (!i.id) fehler.push(", 'Nachlesen: neue id'),
 (LIB, "if (nurIds && !nurIds.has(gid)) continue;", "", 'verlorene: Auswahl'),
 (LIB, "if ((nachher[gid]?.[l]?.[k]) !== v) aus.push(", "if ((nachher[gid]?.[l]?.[k]) === undefined) aus.push(", 'verlorene: abweichender Wert'),
 (LIB, "if (new Set(eltern).size !== eltern.length) f.push(", "if (false) f.push(", 'pruefeOps: zwei Einfügungen unter demselben Eltern'),
 (LIB, "if (o.fr !== undefined && o.fr !== null && (typeof o.fr !== 'string'", "if (false && o.fr !== undefined && o.fr !== null && (typeof o.fr !== 'string'", 'pruefeOps: fr nicht geprüft'),
 (LIB, "|| k.resourceId !== colIds[o.handle] || k.url ||", "|| k.url ||", 'pruefePlan: resourceId des neuen Eintrags'),
 (LIB, "k.resourceId !== colIds[o.handle] || k.url || (k.tags || []).length || (k.items || []).length) f.push(", "k.resourceId !== colIds[o.handle] || (k.tags || []).length || (k.items || []).length) f.push(", 'pruefePlan: neuer Eintrag mit Adresse'),
 (LIB, "|| k.url || (k.tags || []).length || (k.items || []).length) f.push(", "|| k.url || (k.items || []).length) f.push(", 'pruefePlan: neuer Eintrag mit Tags'),
 (LIB, "|| (k.tags || []).length || (k.items || []).length) f.push(", "|| (k.tags || []).length) f.push(", 'pruefePlan: neuer Eintrag mit Kindern'),
 (LIB, "if (ra.length === rr.length) ra.forEach((u, n) => { if (u !== undefined && rr[n] !== u)", "if (ra.length === rr.length) ra.forEach((u, n) => { if (false && u !== undefined && rr[n] !== u)", 'Nachlesen: rohe HTTP-Adresse'),
 # --- Runner ---
 (RUN, "if (!live) { out('Trockenlauf: nichts geschrieben.');", "if (false) { out('Trockenlauf: nichts geschrieben.');", 'Runner: Trockenlauf schreibt'),
 (RUN, "if (!g.gleich) {", "if (false) {", 'Runner: Menü zwischenzeitlich geändert'),
 (RUN, "if (!Array.isArray(ue) || ue.length) {", "if (false) {", 'Runner: userErrors'),
 (RUN, "if (!zurueck || zurueck.id !== m.id) {", "if (false) {", 'Runner: Nachlesen unlesbar'),
 (RUN, "if (v.fehler.length) { err('ABWEICHUNG nach dem Schreiben", "if (false) { err('ABWEICHUNG nach dem Schreiben", 'Runner: Abweichung beim Nachlesen'),
 (RUN, "const weg = verlorene(ueVorher, ueNach, idsPlan);", "const weg = [];", 'Runner: Übersetzungen nicht wiederhergestellt'),
 (RUN, "if (!e.fr) continue;", "continue;", 'Runner: fr nie eingetragen'),
 (RUN, "if (offen.length) { err('ÜBERSETZUNG offen", "if (false) { err('ÜBERSETZUNG offen", 'Runner: offene Übersetzung still'),
 (RUN, "sicherungSchreiben(sicherungDir, `${menue}-vor-bereinigen-uebersetzungen`, jetzt(), ueVorher);", "", 'Runner: Übersetzungs-Sicherung fehlt'),
 (RUN, "sicherung = sicherungSchreiben(sicherungDir, `${menue}-vor-bereinigen`, jetzt(), m);", "sicherung = '(keine)';", 'Runner: Menü-Sicherung fehlt'),
 (RUN, "catch (x) { err(`ABBRUCH, nichts geschrieben: Übersetzungen nicht lesbar", "catch (x) { if (0) err(`ABBRUCH, nichts geschrieben: Übersetzungen nicht lesbar", 'Runner: Übersetzungen nicht lesbar'),
 (RUN, "if (lf.length) { err(`ABBRUCH, nichts geschrieben: das gelesene Menü ist unvollständig", "if (false) { err(`ABBRUCH, nichts geschrieben: das gelesene Menü ist unvollständig", 'Runner: Leseform'),
 (RUN, "if (r.fehler.length) { err('ABBRUCH, nichts geschrieben:\\n- '", "if (false) { err('ABBRUCH, nichts geschrieben:\\n- '", 'Runner: Plan-Fehler ignoriert'),
 (RUN, "  if (pf0.length) { err('ABBRUCH (Aufruf):", "  if (false) { err('ABBRUCH (Aufruf):", 'Runner: Aufruf-Fehler ignoriert'),
 (RUN, "if (!Array.isArray(verwaistOk) || !verwaistOk.every(", "if (false && !verwaistOk.every(", 'Runner: verwaistOk nicht geprüft'),
 (RUN, "      } catch (x) { offen.push(`${gid}: ${x.message}`); }", "      } finally { }", 'Runner: Wiederherstellen je Link abgesichert'),
 (RUN, "      } catch (x) { offen.push(`${e.title}: fr eintragen: ${x.message}`); }", "      } finally { }", 'Runner: fr eintragen je Eintrag abgesichert'),
 (RUN, "catch (x) { err(`ABWEICHUNG: das zurückgelesene Menü ließ sich nicht vergleichen", "catch (x) { if (0) err(`ABWEICHUNG: das zurückgelesene Menü ließ sich nicht vergleichen", 'Runner: Vergleichsfehler nach dem Schreiben'),
 (RUN, "i: plan }", "i: eingabeAus(m.items) }", 'Runner: schreibt alten statt neuen Baum'),
]


only = sys.argv[1:]
killed = survived = n_a = 0
tmp = tempfile.mkdtemp(prefix='mut-')
try:
    for i, (f, alt, neu, name) in enumerate(M):
        if only and str(i) not in only:
            continue
        d = os.path.join(tmp, f'm{i}')
        for rel in DATEIEN:
            os.makedirs(os.path.dirname(os.path.join(d, rel)), exist_ok=True)
            shutil.copy(os.path.join(REPO, rel), os.path.join(d, rel))
        pfad = os.path.join(d, f)
        s = open(pfad, encoding='utf-8').read()
        if s.count(alt) < 1:
            n_a += 1
            print(f'[{i:2}] NICHT ANWENDBAR  {name}')
            shutil.rmtree(d)
            continue
        open(pfad, 'w', encoding='utf-8').write(s.replace(alt, neu, 1))
        try:
            r = subprocess.run([NODE, 'automation/lib/menu_bereinigen_test.mjs'], cwd=d, capture_output=True, text=True, timeout=240)
            rc, last = r.returncode, (r.stdout.strip().splitlines() or [''])[-1]
        except subprocess.TimeoutExpired:
            rc, last = 99, 'Zeitlimit'
        if rc != 0:
            killed += 1; print(f'[{i:2}] erkannt          {name}  ({last[:60]})')
        else:
            survived += 1; print(f'[{i:2}] ÜBERLEBT         {name}')
        shutil.rmtree(d)
finally:
    shutil.rmtree(tmp, ignore_errors=True)
print(f'\nerkannt {killed}, überlebt {survived}, nicht anwendbar {n_a}, gesamt {len(M)}')
sys.exit(1 if survived or n_a else 0)
