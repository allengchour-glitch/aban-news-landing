#!/usr/bin/env python3
"""Mutationsprobe für automation/lib/gold_feingehalt.mjs: je Mutant eine Kopie im Wegwerf-Ordner (Verzeichnisform des Repos), gold_feingehalt_test.mjs muss ROT werden.
Ausgangslage muss grün sein. Lauf (Repo-Wurzel): python3 dropship/gold-bazg-1711/mutationsprobe_goldregel.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.abspath(os.path.join(HIER, '..', '..'))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
LIB = 'automation/lib'
DATEIEN = ['gold_feingehalt.mjs', 'gold_feingehalt_test.mjs', 'silber_feingehalt.mjs']
T = 'gold_feingehalt.mjs'

def aufbauen(tmp):
    for d in DATEIEN:
        z = os.path.join(tmp, LIB, d); os.makedirs(os.path.dirname(z), exist_ok=True); shutil.copy(os.path.join(WURZEL, LIB, d), z)

def lauf(tmp):
    r = subprocess.run([NODE, os.path.join(tmp, LIB, 'gold_feingehalt_test.mjs')], capture_output=True, text=True, timeout=240)
    return r.returncode

MUT = [
    # --- Karat
    ('Karat ohne 8', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:9|10|14|18|21|22|24)`;"),
    ('Karat ohne 9', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|10|14|18|21|22|24)`;"),
    ('Karat ohne 10', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|9|14|18|21|22|24)`;"),
    ('Karat ohne 14', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|9|10|18|21|22|24)`;"),
    ('Karat ohne 18', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|9|10|14|21|22|24)`;"),
    ('Karat ohne 21', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|9|10|14|18|22|24)`;"),
    ('Karat ohne 22', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|24)`;"),
    ('Karat ohne 24', "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;", "const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22)`;"),
    ('Karat: Lookbehind Buchstabe/Ziffer fehlt', "S`(?<![\\p{L}\\p{N}])(?<![\\p{N}][.,])${KARAT_ZAHL}", "S`(?<![\\p{N}][.,])${KARAT_ZAHL}"),
    ('Karat: Lookbehind Zahl mit Komma fehlt', "S`(?<![\\p{L}\\p{N}])(?<![\\p{N}][.,])${KARAT_ZAHL}", "S`(?<![\\p{L}\\p{N}])${KARAT_ZAHL}"),
    ('Karat: ohne Leerzeichen', "${KARAT_ZAHL}\\s?-?\\s?(?:k|kt", "${KARAT_ZAHL}-?(?:k|kt"),
    ('Karat: ohne Bindestrich', "${KARAT_ZAHL}\\s?-?\\s?(?:k|kt", "${KARAT_ZAHL}\\s?\\s?(?:k|kt"),
    ('Karat: ohne kt', "(?:k|kt|karat|carat|karät\\p{L}*)", "(?:k|karat|carat|karät\\p{L}*)"),
    ('Karat: ohne karat', "(?:k|kt|karat|carat|karät\\p{L}*)", "(?:k|kt|carat|karät\\p{L}*)"),
    ('Karat: ohne carat', "(?:k|kt|karat|carat|karät\\p{L}*)", "(?:k|kt|karat|karät\\p{L}*)"),
    ('Karat: ohne karätig', "(?:k|kt|karat|carat|karät\\p{L}*)", "(?:k|kt|karat|carat)"),
    ('Karat: Wortende fehlt', "karät\\p{L}*)(?![\\p{L}\\p{N}])(?!\\s?(?:hz", "karät\\p{L}*)(?!\\s?(?:hz"),
    ('Karat: Einheiten-Ausschluss fehlt', "(?![\\p{L}\\p{N}])(?!\\s?(?:hz|ohm|mah|bild|video|drohne|kamera|uhd|auflösung))", "(?![\\p{L}\\p{N}])"),
    # --- Feingehalt
    ('Fein ohne 333', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:375|417|585|750|916|999)(?:er)?"),
    ('Fein ohne 375', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|417|585|750|916|999)(?:er)?"),
    ('Fein ohne 417', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|375|585|750|916|999)(?:er)?"),
    ('Fein ohne 585', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|375|417|750|916|999)(?:er)?"),
    ('Fein ohne 750', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|375|417|585|916|999)(?:er)?"),
    ('Fein ohne 916', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|375|417|585|750|999)(?:er)?"),
    ('Fein ohne 999', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|375|417|585|750|916)(?:er)?"),
    ('Fein ohne «er»', "(?:333|375|417|585|750|916|999)(?:er)?", "(?:333|375|417|585|750|916|999)"),
    ('Fein: Lookbehind fehlt', "S`(?<![\\p{L}\\p{N}.,])(?:333", "S`(?:333"),
    ('Fein: Lookahead Zahlenende fehlt', "(?:er)?(?![\\p{L}\\p{N}.,])(?!\\s?(?:mm", "(?:er)?(?!\\s?(?:mm"),
    ('Fein: Einheiten-Ausschluss fehlt', "(?![\\p{L}\\p{N}.,])(?!\\s?(?:mm|cm|ml|mah|g\\b|gr\\b|kg|v\\b|w\\b|hz|ohm|stk|stück|pcs|teile|perlen|euro|eur|chf|usd|%|pa\\b|lumen|lm\\b))`, 'gu');", "(?![\\p{L}\\p{N}.,])`, 'gu');"),
    # --- Stempel
    ('Stempel ohne Au', "(?:au\\s?-?\\s?(?:333|375|417|585|750|916|999)|pt", "(?:xx|pt"),
    ('Stempel ohne Pt', "|pt\\s?-?\\s?(?:850|900|950|999)|pd", "|xx|pd"),
    ('Stempel ohne Pd', "|pd\\s?-?\\s?(?:500|950))(?![\\p{L}\\p{N}])/gu;", "|xx)(?![\\p{L}\\p{N}])/gu;"),
    ('Stempel: Lookbehind fehlt', "const AUPT = /(?<![\\p{L}\\p{N}])(?:au", "const AUPT = /(?:au"),
    # --- Goldwort
    # --- Echt-Wörter
    ('Echt: Lookbehind fehlt', "const ECHT = new RegExp(S`(?<![\\p{L}\\p{N}])(?:echt", "const ECHT = new RegExp(S`(?:echt"),
    ('Echt: Lookahead fehlt', "|hartgold|kaltgold)(?![\\p{L}\\p{N}])`, 'gu');", "|hartgold|kaltgold)`, 'gu');"),
    ('Echt ohne echtgold', "(?:echt-?\\s?gold|echtes?\\s+gold", "(?:xx|echtes?\\s+gold"),
    ('Echt ohne echtes Gold', "|echtes?\\s+gold|echtem\\s+gold", "|xx|echtem\\s+gold"),
    ('Echt ohne echtem Gold', "|echtem\\s+gold|echter\\s+gold", "|xx|echter\\s+gold"),
    ('Echt ohne echter Gold', "|echter\\s+gold|real\\s+gold", "|xx|real\\s+gold"),
    ('Echt ohne real gold', "|real\\s+gold|solid\\s+gold", "|xx|solid\\s+gold"),
    ('Echt ohne solid gold', "|solid\\s+gold|massive[rsnm]?\\s+gold", "|xx|massive[rsnm]?\\s+gold"),
    ('Echt ohne massives Gold', "|massive[rsnm]?\\s+gold|massiv-?gold", "|xx|massiv-?gold"),
    ('Echt ohne Massivgold', "|massiv-?gold|reine[mrsn]?\\s+gold", "|xx|reine[mrsn]?\\s+gold"),
    ('Echt ohne reines Gold', "|reine[mrsn]?\\s+gold|pure\\s+gold", "|xx|pure\\s+gold"),
    ('Echt ohne pure gold', "|pure\\s+gold|feingold", "|xx|feingold"),
    ('Echt ohne Feingold', "|feingold|reingold", "|xx|reingold"),
    ('Echt ohne Reingold', "|reingold|k-gold", "|xx|k-gold"),
    ('Echt ohne K-Gold', "|k-gold|hartgold", "|xx|hartgold"),
    ('Echt ohne Hartgold', "|hartgold|kaltgold)", "|xx|kaltgold)"),
    ('Echt ohne Kaltgold', "|hartgold|kaltgold)", "|hartgold|xx)"),
    ('Aus-Echt fehlt', "(?:reinem|echtem|massivem|feinem)\\s+gold/gu;", "(?:reinem|echtem|massivem|xxxx)\\s+gold/gu;"),
    # --- Platin
    ('Platin ohne echtes Platin', "(?:(?:echtes|reines|echtem|reinem|massives|massivem|massiver)\\s+(?:platin|palladium)(?![\\p{L}])|", "(?:(?:xx)\\s+(?:platin|palladium)(?![\\p{L}])|"),
    ('Platin ohne Massivplatin', "|massiv-?(?:platin|palladium)|", "|xx|"),
    ('Platin ohne Platin 950', "|(?:platin|platinum|palladium)\\s?-?\\s?(?:850|900|950|999|500)(?![\\p{L}\\p{N}]))/gu;", "|xx)/gu;"),
    # --- Plattierung
    ('Platt ohne vergold', "S`vergold`, S`plattier`", "S`xx`, S`plattier`"),
    ('Platt ohne plattier', "S`plattier`, S`platier`", "S`xx`, S`platier`"),
    ('Platt ohne platier', "S`platier`, S`plated`", "S`xx`, S`plated`"),
    ('Platt ohne plated', "S`plated`, S`plating`", "S`xx`, S`plating`"),
    ('Platt ohne plating', "S`plating`, S`verplatt`", "S`xx`, S`verplatt`"),
    ('Platt ohne verplatt', "S`verplatt`, S`galvan`", "S`xx`, S`galvan`"),
    ('Platt ohne galvan', "S`galvan`, S`beschicht`", "S`xx`, S`beschicht`"),
    ('Platt ohne beschicht', "S`beschicht`, S`überzog`", "S`xx`, S`überzog`"),
    ('Platt ohne überzog', "S`überzog`, S`überzug`", "S`xx`, S`überzug`"),
    ('Platt ohne überzug', "S`überzug`, S`pvd`", "S`xx`, S`pvd`"),
    ('Platt ohne pvd', "S`pvd`, S`vermeil`", "S`xx`, S`vermeil`"),
    ('Platt ohne vermeil', "S`vermeil`,\n", "S`xx`,\n"),
    ('Platt ohne plaqué', "S`plaqu[eé](?![\\p{L}])`, S`doubl", "S`xx`, S`doubl"),
    ('Platt ohne doublé', "S`doubl[eé](?![\\p{L}])`, S`coat", "S`xx`, S`coat"),
    ('Platt ohne coated', "S`coat(?:ed|ing)`", "S`xx`"),
    ('Platt ohne coating', "S`coat(?:ed|ing)`", "S`coated`"),
    ('Platt ohne Goldauflage', "gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|filled)", "gold[\\s-]?(?:xx|schicht|füllung|gefüllt|filled)"),
    ('Platt ohne Goldschicht', "gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|filled)", "gold[\\s-]?(?:auflage|xx|füllung|gefüllt|filled)"),
    ('Platt ohne Goldfüllung', "gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|filled)", "gold[\\s-]?(?:auflage|schicht|xx|gefüllt|filled)"),
    ('Platt ohne Goldgefüllt', "gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|filled)", "gold[\\s-]?(?:auflage|schicht|füllung|xx|filled)"),
    ('Platt ohne Goldfilled', "gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|filled)", "gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|xx)"),
    ('Platt: Gold-Pflicht vor Gefüllt fehlt', "S`gold[\\s-]?(?:auflage|schicht|füllung|gefüllt|filled)`", "S`(?:auflage|schicht|füllung|gefüllt|filled)`"),
    ('Platt ohne filled gold', "S`filled\\s+gold`", "S`xx`"),
    ('Platt ohne veredel', "S`veredel`,\n]", "S`xx`,\n]"),
    # --- Kosmetik, Farbliste, Verneinung, Stein
    ('Kosmetik wird nicht erkannt', "const kosm = KOSMETIK.test(ganz) && !SCHMUCKWORT.test(`${titel} ${bereinige(p?.productType)}`);", "const kosm = false;"),
    ('Kosmetik: Schmuckwort im Titel ignoriert', "const kosm = KOSMETIK.test(ganz) && !SCHMUCKWORT.test(`${titel} ${bereinige(p?.productType)}`);", "const kosm = KOSMETIK.test(ganz);"),
    ('Kosmetik ohne Serum', "const KOSMETIK = /(?:anti-?aging|serum|", "const KOSMETIK = /(?:anti-?aging|xx|"),
    ('Farbliste fehlt', "|| FARB_VOR.test(davor.slice(-45))) return false;", ") return false;"),
    ('Farbliste: Fenster zu gross', "|available in)[^.;|]{0,24}$/u;", "|available in)[^.;|]{0,80}$/u;"),
    ('Farbliste: Fenster 0', "|available in)[^.;|]{0,24}$/u;", "|available in)[^.;|]{0,0}$/u;"),
    ('Farbliste ohne «erhältlich in»', "|erhältlich in|verfügbar in|", "|xx|verfügbar in|"),
    ('Farbliste ohne Farb', "const FARB_VOR = /(?:farb\\p{L}*|", "const FARB_VOR = /(?:xx|"),
    ('Verneinung fehlt', "if (VERNEINUNG.test(davor) || FARB_VOR", "if (FARB_VOR"),
    ('Verneinung: Reichweite 0 Wörter', "\\s+(?:[\\p{L}\\p{N}-]+\\s+){0,3}$/u;", "\\s+(?:[\\p{L}\\p{N}-]+\\s+){0,0}$/u;"),
    ('Verneinung: Reichweite 10 Wörter', "\\s+(?:[\\p{L}\\p{N}-]+\\s+){0,3}$/u;", "\\s+(?:[\\p{L}\\p{N}-]+\\s+){0,10}$/u;"),
    ('Verneinung ohne «kein»', "(?:kein(?:e[nrsm]?)?|nicht|", "(?:xx|nicht|"),
    ('Verneinung ohne «nicht»', "(?:kein(?:e[nrsm]?)?|nicht|ohne|", "(?:kein(?:e[nrsm]?)?|xx|ohne|"),
    ('Verneinung ohne «ohne»', "|nicht|ohne|statt|", "|nicht|xx|statt|"),
    ('Stein danach fehlt', "(STEIN_DANACH.test(t.slice(h.i + h.t.length)) || STEIN_DAVOR.test(davor))", "(STEIN_DAVOR.test(davor))"),
    ('Stein davor fehlt', "(STEIN_DANACH.test(t.slice(h.i + h.t.length)) || STEIN_DAVOR.test(davor))", "(STEIN_DANACH.test(t.slice(h.i + h.t.length)))"),
    ('Stein gilt auch für Feingehalt', "if (h.art === 'karat' && (STEIN", "if ((STEIN"),
    # --- Nähe von Zahl und Gold
    ('Goldwort: Ausschluss fehlt', "const golds = alle(GOLDTOKEN, ganz).filter((g) => !GOLD_KEIN_MATERIAL.test(g.t));", "const golds = alle(GOLDTOKEN, ganz);"),
    ('Goldwort: goldfarben nicht ausgeschlossen', "|gold-?(?:farb|ton|töne|optik|look|finish|glanz|schimmer)[\\p{L}]*)$/u;", ")$/u;"),
    ('Goldwort: golden nicht ausgeschlossen', "|golden[\\p{L}]*|gold-?(?:farb", "|gold-?(?:farb"),
    ('Goldwort: Goldfisch nicht ausgeschlossen', "goldfisch|goldfish|", ""),
    ('Goldwort: Bindestrich-Suffix fehlt', "(?:-(?:farb|ton|töne|optik|look|finish|glanz|schimmer)[\\p{L}]*)?/gu;", "/gu;"),
    ('Nähe: Zeiger-Anfang 28 → 1', "golds[lo].i + golds[lo].t.length < z.i - 28", "golds[lo].i + golds[lo].t.length < z.i - 1"),
    ('Nähe: Zeiger-Anfang 28 → 60', "golds[lo].i + golds[lo].t.length < z.i - 28", "golds[lo].i + golds[lo].t.length < z.i - 60"),
    ('Nähe: 28 → 60 (Zeiger-Ende)', "golds[j].i <= z.i + z.t.length + 28", "golds[j].i <= z.i + z.t.length + 60"),
    ('Nähe: Zeiger-Ende 28 → 2', "golds[j].i <= z.i + z.t.length + 28", "golds[j].i <= z.i + z.t.length + 2"),
    ('Nähe: Satzende ignoriert', "!/[.;|]/.test(luecke)", "true"),
    ('Nähe: Semikolon kein Satzende', "!/[.;|]/.test(luecke)", "!/[.|]/.test(luecke)"),
    ('Nähe: Gold vor der Zahl wird nicht gesucht', ": ganz.slice(g.i + g.t.length, z.i);", ": '.';"),
    ('Stempel braucht Goldwort', "let nah = z.art === 'aupt';", "let nah = false;"),
    ('Titel und Beschreibung ohne Trenner', "const ganz = `${titel} . ${text}`;", "const ganz = `${titel} ${text}`;"),
    # --- Entscheid und Ausgabe
    ('Plattierung in Optionen ignoriert', "const plattText = `${ganz} . ${bereinige(optionsText(p?.options))}`;", "const plattText = ganz;"),
    ('Plattierung wird ignoriert', "if (platt) {", "if (false) {"),
    ('Zahl nicht nötig für Plattierungs-Hinweis', "const mitZahl = treffer.some((x) => x.art.startsWith('zahl-'));", "const mitZahl = true;"),
    ('Zahl immer nötig verneint', "const mitZahl = treffer.some((x) => x.art.startsWith('zahl-'));", "const mitZahl = false;"),
    ('Kosmetik ohne Behauptung meldet falsch', "if (kosm) return { art: null, grund: 'kosmetik', treffer: [] };", "if (kosm) return { art: 'massiv', grund: 'kosmetik', treffer: [] };"),
    ('Befund: mehr als drei Treffer', ".slice(0, 3).map(({ art, kern, text }) =>", ".slice(0, 9).map(({ art, kern, text }) =>"),
    ('Stelle zu lang', "t.slice(Math.max(0, i - 28), Math.min(t.length, i + n + 36)).trim()", "t.slice(Math.max(0, i - 280), Math.min(t.length, i + n + 360)).trim()"),
    # --- Auswahl
    ('waehle: Ausnahme ignoriert', "    if (ausnahmen.has(p.handle)) continue;\n", ""),
    ('waehle: Arbeits-Tag ignoriert', "    if ((p.tags || []).includes(GOLD_MARKER)) continue;\n", ""),
    ('waehle: ID nicht nötig', "if (!p?.handle || !p?.id) continue;", "if (!p?.handle) continue;"),
    ('waehle: Handle nicht nötig', "if (!p?.handle || !p?.id) continue;", "if (!p?.id) continue;"),
    ('waehle: Hinweise werden Einträge', "else if (b.art === 'plattiert-mit-zahl') hinweise.push(", "else if (b.art === 'plattiert-mit-zahl') eintraege.push("),
    ('waehle: Hinweise fehlen', "else if (b.art === 'plattiert-mit-zahl') hinweise.push({ handle: p.handle, id: p.id, art: b.art, treffer: b.treffer });", ""),
    ('Marker falsch', "export const GOLD_MARKER = 'bazg-gold-1711';", "export const GOLD_MARKER = 'bazg-gold-1712';"),
]

def main():
    tmp = tempfile.mkdtemp(prefix='goldregelmut-')
    try:
        aufbauen(tmp)
        if lauf(tmp) != 0: print('Ausgangslage ist NICHT grün, Abbruch'); return 2
        quelle = open(os.path.join(WURZEL, LIB, T), encoding='utf8').read()
        erkannt = ueberlebt = nicht = 0
        for name, alt, neu in MUT:
            if quelle.count(alt) != 1:
                nicht += 1; print(f'  ? nicht anwendbar ({quelle.count(alt)}×): {name}'); continue
            ziel = os.path.join(tmp, LIB, T)
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
