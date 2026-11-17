#!/usr/bin/env python3
"""Mutationsprobe für den Gold-Wächter: gold_wahl.mjs (Test gold_wahl_test.mjs) und gold_melden.mjs (Test gold_melden_test.mjs).
Je Mutant eine Kopie im Wegwerf-Ordner (Verzeichnisform des Repos), der zugehörige Test muss ROT werden. Ausgangslage muss grün sein.
Lauf (Repo-Wurzel): python3 dropship/gold-bazg-1711/mutationsprobe_goldwaechter.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.abspath(os.path.join(HIER, '..', '..'))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
G = 'dropship/gold-bazg-1711'
DATEIEN = [f'{G}/gold_wahl.mjs', f'{G}/gold_wahl_test.mjs', f'{G}/gold_entwurf.mjs', f'{G}/gold_melden.mjs', f'{G}/gold_melden_test.mjs',
           'dropship/silber-bazg-1711/lib.mjs', 'automation/lib/silber_feingehalt.mjs', 'automation/lib/gold_feingehalt.mjs']

def aufbauen(tmp):
    for d in DATEIEN:
        z = os.path.join(tmp, d); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(WURZEL, d), z)

def lauf(tmp, test):
    r = subprocess.run([NODE, os.path.join(tmp, G, test)], capture_output=True, text=True, timeout=240)
    return r.returncode

WAHL = [
    ('Obergrenze 12 → 13', "export const MAX_JE_LAUF = 12;", "export const MAX_JE_LAUF = 13;"),
    ('Obergrenze 12 → 11', "export const MAX_JE_LAUF = 12;", "export const MAX_JE_LAUF = 11;"),
    ('Beleg-Fenster viel zu gross', "const FENSTER = 14;", "const FENSTER = 400;"),
    ('Beleg-Fenster 0', "const FENSTER = 14;", "const FENSTER = 0;"),
    ('Beleg: höchstens drei fehlt', "    if (aus.length >= 3) break;\n", ""),
    ('Beleg: Doppelte erlaubt', "    if (!aus.includes(b)) aus.push(b);", "    aus.push(b);"),
    ('Beleg: Kern nicht klein geschrieben', "const kern = String(t?.kern ?? '').toLowerCase();", "const kern = String(t?.kern ?? '');"),
    ('Beleg: Kern nicht gefunden wird nicht übersprungen', "if (i < 0) continue;", ""),
    ('Beleg: leerer Kern gesucht', "const i = kern ? roh.indexOf(kern) : -1;", "const i = roh.indexOf(kern);"),
    ('Beleg aus anderem Text als gold_entwurf.textVon', "const roh = textVon(p);", "const roh = String(p?.title ?? '').toLowerCase();"),
    ('Liste: ohne Beleg wird trotzdem entworfen', "if (beleg.length) gut.push({ ...e, beleg }); else ohneBeleg.push(e);", "gut.push({ ...e, beleg });"),
    ('Liste: Treffer ohne Beleg verschwinden', "if (beleg.length) gut.push({ ...e, beleg }); else ohneBeleg.push(e);", "if (beleg.length) gut.push({ ...e, beleg });"),
    ('Liste: Obergrenze > → >=', "zuViele: gut.length > max", "zuViele: gut.length >= max"),
    ('Liste: Obergrenze zählt alle statt der entwerfbaren', "zuViele: gut.length > max", "zuViele: eintraege.length + ohneBeleg.length > max"),
    ('Liste: anzahl zählt Hinweise mit', "anzahl: gut.length,", "anzahl: gut.length + hinweise.length,"),
    ('Liste: Ausnahmen werden nicht weitergereicht', "waehleGold(alle, { ausnahmen })", "waehleGold(alle, {})"),
    ('Liste: gelesenAktiv falsch', "gelesenAktiv: (alle || []).length", "gelesenAktiv: gut.length"),
    ('Liste: Hinweise fehlen', "eintraege: gut, ohneBeleg, hinweise, zuViele:", "eintraege: gut, ohneBeleg, hinweise: [], zuViele:"),
]

MELDEN = [
    ('Fehler zählt ABWEICHUNG nicht', "zeile('FEHLER').length + zeile('ABWEICHUNG').length", "zeile('FEHLER').length"),
    ('Ledger-Spalte falsch', "String(z).split('|')[1] === art", "String(z).split('|')[2] === art"),
    ('Lese-Schritt nicht gelaufen ist grün', "if (listeRc === '' && !liste) return { senden: true, rot: true,", "if (listeRc === '' && !liste) return { senden: true, rot: false,"),
    ('Lese-Schritt nicht gelaufen: keine Meldung', "if (listeRc === '' && !liste) return { senden: true,", "if (listeRc === '' && !liste) return { senden: false,"),
    ('Lese-Fehler ist grün', "if (listeRc !== '' && Number(listeRc) !== 0) return { senden: true, rot: true,", "if (listeRc !== '' && Number(listeRc) !== 0) return { senden: true, rot: false,"),
    ('Lese-Fehler wird nicht geprüft', "if (listeRc !== '' && Number(listeRc) !== 0) return", "if (false) return"),
    ('Obergrenze wird nicht geprüft', "if (liste?.zuViele) return", "if (false) return"),
    ('Obergrenze ist grün', "if (liste?.zuViele) return { senden: true, rot: true,", "if (liste?.zuViele) return { senden: true, rot: false,"),
    ('Schreibfehler wird nicht geprüft', "if (applyRc !== '' && Number(applyRc) !== 0) {", "if (false) {"),
    ('Schreibfehler ist grün', "return { senden: true, rot: true, hinweis, text: `Gold-Wächter: FEHLER beim Setzen auf Entwurf", "return { senden: true, rot: false, hinweis, text: `Gold-Wächter: FEHLER beim Setzen auf Entwurf"),
    ('ruhiger Tag meldet immer', "return { senden: !!immer, rot: false, hinweis, text: `Gold-Wächter: in Ordnung", "return { senden: true, rot: false, hinweis, text: `Gold-Wächter: in Ordnung"),
    ('ruhiger Tag ignoriert «immer»', "return { senden: !!immer, rot: false, hinweis, text: `Gold-Wächter: in Ordnung", "return { senden: false, rot: false, hinweis, text: `Gold-Wächter: in Ordnung"),
    ('ruhiger Tag trotz Treffer ohne Beleg', "if (anzahl === 0 && ohneBeleg === 0)", "if (anzahl === 0)"),
    ('nur Treffer ohne Beleg wird nicht gemeldet', "if (anzahl === 0) return { senden: true, rot: false, hinweis, text: `Gold-Wächter: ${ohneBeleg} Treffer ohne Belegsatz", "if (anzahl === 0) return { senden: false, rot: false, hinweis, text: `Gold-Wächter: ${ohneBeleg} Treffer ohne Belegsatz"),
    ('live: 0 Entwürfe wird nicht erkannt', "if (fertig === 0) return", "if (false) return"),
    ('live: zählt falsche Ledger-Art', "const fertig = zeile('ENTWURF').length;", "const fertig = zeile('GESCHRIEBEN').length;"),
    ('live: Meldung ohne Rücknahme', "(Edelmetallkontrolle): ${kurz(liste)}.${ohne} ${RUECKNAHME}${link}", "(Edelmetallkontrolle): ${kurz(liste)}.${ohne}${link}"),
    ('live: Meldung ohne Treffer ohne Beleg', "(Edelmetallkontrolle): ${kurz(liste)}.${ohne} ${RUECKNAHME}", "(Edelmetallkontrolle): ${kurz(liste)}. ${RUECKNAHME}"),
    ('lesen: Freigabe-Hinweis vertauscht', "${freigabe ? ', Handstart ohne Schreiben' : ', keine Freigabedatei'}", "${freigabe ? ', keine Freigabedatei' : ', Handstart ohne Schreiben'}"),
    ('Handle-Kürzung bei 8 → 80', "const kurz = (liste, n = 8)", "const kurz = (liste, n = 80)"),
    ('Handle-Kürzung ohne Rest-Zähler', "` … (+${liste.eintraege.length - n})` : '');\nconst kurzOhne", "'' : '');\nconst kurzOhne"),
    ('Beleg-lose Kürzung 5 → 50', "const kurzOhne = (liste, n = 5)", "const kurzOhne = (liste, n = 50)"),
    ('Hinweis wird nicht gebaut', "const hinweis = hinweise ? `Hinweis:", "const hinweis = false ? `Hinweis:"),
    ('Hinweis nennt nur ein Produkt', "(liste.hinweise || []).slice(0, 8).map", "(liste.hinweise || []).slice(0, 1).map"),
    ('Rücknahme ohne Freigabedatei', "1) dropship/GOLD-WAECHTER-FREI.txt löschen (sonst entwirft der Wächter morgen wieder), ", ""),
    ('Rücknahme ohne Artefakt', "2) Artefakt «gold-waechter-protokoll» des Laufs herunterladen, ", ""),
    ('Rücknahme ohne Ausnahmeliste', "4) Fehltreffer in dropship/gold-bazg-1711/gold-ausnahmen.json eintragen.", ""),
    ('sende: ohne Zugangsdaten gesendet', "if (!token || !chat) return false;", ""),
    ('sende: HTTP-Fehler als Erfolg', "return !!r.ok;", "return true;"),
    ('sende: Ausnahme als Erfolg', "} catch { return false; }", "} catch { return true; }"),
    ('CLI: Telegram-Fehler nicht rot', "process.exit(m.rot || !zustellung ? 1 : 0);", "process.exit(m.rot ? 1 : 0);"),
    ('CLI: DRY sendet trotzdem', "if (m.senden && E.DRY !== '1') {", "if (m.senden) {"),
    ('CLI: Hinweis nicht ausgegeben', "  if (m.hinweis) console.log(m.hinweis);\n", ""),
]

def gruppe(tmp, datei, test, muts):
    quelle = open(os.path.join(WURZEL, datei), encoding='utf8').read()
    erkannt = ueberlebt = nicht = 0
    for name, alt, neu in muts:
        if quelle.count(alt) != 1:
            nicht += 1; print(f'  ? nicht anwendbar ({quelle.count(alt)}×): {name}'); continue
        ziel = os.path.join(tmp, datei)
        open(ziel, 'w', encoding='utf8').write(quelle.replace(alt, neu))
        rc = lauf(tmp, test)
        open(ziel, 'w', encoding='utf8').write(quelle)
        if rc != 0: erkannt += 1
        else: ueberlebt += 1; print(f'  ! ÜBERLEBT: {name}')
    return erkannt, ueberlebt, nicht

def main():
    tmp = tempfile.mkdtemp(prefix='goldwaechtermut-')
    try:
        aufbauen(tmp)
        for t in ('gold_wahl_test.mjs', 'gold_melden_test.mjs'):
            if lauf(tmp, t) != 0: print(f'Ausgangslage ist NICHT grün ({t}), Abbruch'); return 2
        a = gruppe(tmp, f'{G}/gold_wahl.mjs', 'gold_wahl_test.mjs', WAHL)
        b = gruppe(tmp, f'{G}/gold_melden.mjs', 'gold_melden_test.mjs', MELDEN)
        e, u, n = a[0] + b[0], a[1] + b[1], a[2] + b[2]
        print(f'{e} von {len(WAHL) + len(MELDEN)} erkannt (gold_wahl {a[0]}/{len(WAHL)}, gold_melden {b[0]}/{len(MELDEN)}), {u} überlebt, {n} nicht anwendbar')
        return 0 if u == 0 and n == 0 else 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__': sys.exit(main())
