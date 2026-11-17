#!/usr/bin/env python3
"""Mutationsprobe für lib.mjs, apply.mjs und die Regel automation/lib/silber_feingehalt.mjs: je Mutant eine Kopie im Wegwerf-Ordner (mit der Verzeichnisform des Repos),
apply_test.mjs bzw. silber_feingehalt_test.mjs muss ROT werden. Ausgangslage muss grün sein.
Lauf (Repo-Wurzel): python3 dropship/silber-bazg-1711/mutationsprobe.py"""
import os, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
WURZEL = os.path.abspath(os.path.join(HIER, '..', '..'))
TOOL = ['lib.mjs', 'apply.mjs', 'apply_test.mjs']                       # nach dropship/silber-bazg-1711/
REGEL = ['silber_feingehalt.mjs', 'silber_feingehalt_test.mjs']         # nach automation/lib/
R = 'silber_feingehalt.mjs'

def lauf(tmp, test):
    r = subprocess.run([NODE, test], capture_output=True, text=True, timeout=180)
    return r.returncode, (r.stdout + r.stderr)[-300:]

def pfad(tmp, datei):
    return os.path.join(tmp, 'automation', 'lib', datei) if datei in REGEL else os.path.join(tmp, 'dropship', 'silber-bazg-1711', datei)

def quelle_von(datei):
    return os.path.join(WURZEL, 'automation', 'lib', datei) if datei in REGEL else os.path.join(HIER, datei)

def aufbauen(tmp):
    for d in TOOL + REGEL:
        ziel = pfad(tmp, d); os.makedirs(os.path.dirname(ziel), exist_ok=True); shutil.copy(quelle_von(d), ziel)

def _ohne(tokens, i):
    return tokens[:i] + tokens[i + 1:]

def regel_mutanten():
    """Mutanten der Regel automation/lib/silber_feingehalt.mjs. Fünftes Element: erwartete Trefferzahl von `alt` (Vorgabe 1; bei 2 wird jede Stelle ersetzt)."""
    M = []
    def add(name, alt, neu, anzahl=1): M.append((R, 'Regel: ' + name, alt, neu, anzahl))
    # --- Zahlenränder
    add('Zahl darf Teil einer längeren sein (Lookbehind weg)', "const NICHT_ZAHL = '(?<![0-9])(?<![0-9][.,])';", "const NICHT_ZAHL = '';")
    add('Komma nach Ziffer zählt nicht als Zahlenteil', "const NICHT_ZAHL = '(?<![0-9])(?<![0-9][.,])';", "const NICHT_ZAHL = '(?<![0-9])';")
    add('Komma ohne Ziffer davor blockiert', "const NICHT_ZAHL = '(?<![0-9])(?<![0-9][.,])';", "const NICHT_ZAHL = '(?<![0-9.,])';")
    add('Zahl darf weitergehen (19250 träfe)', "const ZAHL_ENDE = '(?![0-9])';", "const ZAHL_ENDE = '';")
    # --- Einheiten: jede einzeln
    E = ['mah','mm','cm','ml','kg','gr','gramm','g','v','w','kw','watt','hz','khz','mhz','ghz','pa','hpa','kpa','lumen','lm','px','pixel','pcs','stk','stück','stueck','pieces','teile','perlen','blatt','steine','euro','eur','chf','usd','grad','ohm','stunden','std','min','minuten','tage','jahre','bewertungen','bewertung','kunden','sterne','mal','tvl','rpm','series','serie','millimeter','zentimeter','l(?:/h)?','meter','m']
    liste = '|'.join(E)
    for i, t in enumerate(E):
        add(f'Einheit «{t}» fehlt', "(?:(?:" + liste + ")(?![\\\\p{L}])", "(?:(?:" + '|'.join(_ohne(E, i)) + ")(?![\\\\p{L}])")
    add('Einheit ohne Wortgrenze (Münze träfe als «m»)', "|meter|m)(?![\\\\p{L}])|%", "|meter|m)|%")
    add('Prozentzeichen ist keine Einheit', "(?![\\\\p{L}])|%|[.,][0-9]|", "(?![\\\\p{L}])|[.,][0-9]|")
    add('Dezimalstelle hinter der Zahl ist keine Einheit', "|%|[.,][0-9]|[x", "|%|[x")
    add('«x» als Mass-Zeichen entfällt', "|[x×*]\\\\s?[0-9]|", "|[×*]\\\\s?[0-9]|")
    add('«×» als Mass-Zeichen entfällt', "|[x×*]\\\\s?[0-9]|", "|[x*]\\\\s?[0-9]|")
    add('«*» als Mass-Zeichen entfällt', "|[x×*]\\\\s?[0-9]|", "|[x×]\\\\s?[0-9]|")
    add('Bindestrich-Bereich (925-1050) entfällt', "|-[0-9]|\\\\s[0-9]{2}", "|\\\\s[0-9]{2}")
    add('Rufnummer (925 12 34) entfällt', "|\\\\s[0-9]{2}\\\\s[0-9]{2}))';", "))';")
    # --- Muster 925
    add('Muster 925 entfernt', "['925', new RegExp(`", "['925', new RegExp(`(?!)")
    add('925: «#» und «/» davor nicht ausgeschlossen', "(?<![\\\\p{L}#/])|(?<=", "(?<![\\\\p{L}])|(?<=")
    add('925: «#» davor nicht ausgeschlossen', "(?<![\\\\p{L}#/])|(?<=", "(?<![\\\\p{L}/])|(?<=")
    add('925: «/» davor nicht ausgeschlossen', "(?<![\\\\p{L}#/])|(?<=", "(?<![\\\\p{L}#])|(?<=")
    add('925: Buchstaben davor nicht ausgeschlossen', "(?<![\\\\p{L}#/])|(?<=", "(?<![#/])|(?<=")
    add('925: «S925» ohne «s»', "(?:s|ag)))${NICHT_ZAHL}", "(?:ag)))${NICHT_ZAHL}")
    add('925: «Ag925» ohne «ag»', "(?:s|ag)))${NICHT_ZAHL}", "(?:s)))${NICHT_ZAHL}")
    add('925: «S925» nur direkt (Wortgrenze davor fehlt)', "(?<=(?<![\\\\p{L}])(?:s|ag)", "(?<=(?:s|ag)")
    P = ['chf','eur','usd','€','\\\\$','nr\\\\.?','tel\\\\.?','sku','seite','preis:?','price:?']
    for i, t in enumerate(P):
        add(f'925: Präfix «{t}» fehlt', "(?<!(?:" + '|'.join(P) + ")\\\\s?)925", "(?<!(?:" + '|'.join(_ohne(P, i)) + ")\\\\s?)925")
    add('925: Leerzeichen nach dem Präfix nicht erlaubt', ")\\\\s?)925${ZAHL_ENDE}", ")925${ZAHL_ENDE}")
    # --- Sterling, fein
    add('Sterling entfernt', "['sterling', /sterling/g],", "['sterling', /(?!)sterling/g],")
    add('«fein»-Muster entfernt', "['fein', /(?<![\\p{L}])(?:", "['fein', /(?!)(?<![\\p{L}])(?:")
    add('«fein»: Buchstabe davor erlaubt (Geschlechter silber)', "['fein', /(?<![\\p{L}])(?:", "['fein', /(?:")
    for st in ['echt', 'rein', 'massiv']:
        add(f'«fein»: Stamm «{st}» fehlt', "(?:echt|rein|massiv)", "(?:" + '|'.join(x for x in ['echt','rein','massiv'] if x != st) + ")", 2)
    for suf in ['e', 'er', 'em', 'en', 'es']:
        add(f'«fein»: Endung «{suf}» fehlt', "(?:e|er|em|en|es)[ -]?silber", "(?:" + '|'.join(x for x in ['e','er','em','en','es'] if x != suf) + ")[ -]?silber")
    add('«fein»: Bindestrich nach der Endung entfällt', "(?:e|er|em|en|es)[ -]?silber", "(?:e|er|em|en|es)[ ]?silber")
    add('«fein»: Leerzeichen nach der Endung entfällt', "(?:e|er|em|en|es)[ -]?silber", "(?:e|er|em|en|es)[-]?silber")
    add('«fein»: Endung muss stehen', "(?:e|er|em|en|es)[ -]?silber", "(?:e|er|em|en|es)silber")
    add('«fein»: Stamm+silber ohne Endung entfällt', "|(?:echt|rein|massiv)silber|", "|")
    add('«fein»: Feinsilber entfällt', "|feinsilber|", "|")
    add('«fein»: «silber massiv» entfällt', "|silber massiv(?![\\p{L}])|", "|")
    add('«fein»: «silber massiv» ohne Wortgrenze (massivholz)', "silber massiv(?![\\p{L}])", "silber massiv")
    W = ['fine','pure','real','genuine','solid','true']
    for i, w in enumerate(W):
        add(f'«fein»: «{w} silver» entfällt', "(?:" + '|'.join(W) + ")[ -]silver", "(?:" + '|'.join(_ohne(W, i)) + ")[ -]silver")
    add('«fein»: «fine-silver» mit Bindestrich entfällt', "[ -]silver|argentium", "[ ]silver|argentium")
    add('«fein»: «fine silver» mit Leerzeichen entfällt', "[ -]silver|argentium", "[-]silver|argentium")
    add('«fein»: Argentium entfällt', "|argentium|", "|")
    add('«fein»: plata de ley entfällt', "|plata de ley|", "|")
    add('«fein»: argent massif entfällt', "|argent massif|", "|")
    # --- Feingehalt-Zahl
    add('Feingehalt-Zahl neben Silber entfernt', "['feingehalt-zahl', new RegExp(`", "['feingehalt-zahl', new RegExp(`(?!)")
    FG = ['9999','999','990','958','950','935','900','875','835','800']
    for i, z in enumerate(FG):
        add(f'Feingehalt {z} fehlt', "const FEINGEHALTE = '(?:" + '|'.join(FG) + ")';", "const FEINGEHALTE = '(?:" + '|'.join(_ohne(FG, i)) + ")';")
    add('Feingehalt: Abstand nach Silber nur 2', "${SILBERWORT}.{0,25}${NICHT_ZAHL}${FEINGEHALTE}", "${SILBERWORT}.{0,2}${NICHT_ZAHL}${FEINGEHALTE}")
    add('Feingehalt: Abstand vor Silber nur 2', "${EINHEIT_NACH}.{0,25}${SILBERWORT}", "${EINHEIT_NACH}.{0,2}${SILBERWORT}")
    add('Feingehalt: Abstand nach Silber unbegrenzt', "${SILBERWORT}.{0,25}${NICHT_ZAHL}${FEINGEHALTE}", "${SILBERWORT}.{0,90}${NICHT_ZAHL}${FEINGEHALTE}")
    add('Feingehalt: Abstand vor Silber unbegrenzt', "${EINHEIT_NACH}.{0,25}${SILBERWORT}", "${EINHEIT_NACH}.{0,90}${SILBERWORT}")
    add('Feingehalt: Zahl vor Silber entfällt', "|${NICHT_ZAHL}${FEINGEHALTE}${ZAHL_ENDE}${EINHEIT_NACH}.{0,25}${SILBERWORT}", "")
    add('Feingehalt: Zahl nach Silber entfällt', "${SILBERWORT}.{0,25}${NICHT_ZAHL}${FEINGEHALTE}${ZAHL_ENDE}${EINHEIT_NACH}|", "(?!)|")
    # --- S999 / Ag999
    add('«s-feingehalt» entfernt', "['s-feingehalt', new RegExp(`", "['s-feingehalt', new RegExp(`(?!)")
    add('«s-feingehalt»: Buchstabe davor erlaubt', "(?<![\\\\p{L}\\\\p{N}])(?:(?:s|ag)", "(?:(?:s|ag)")
    add('«s-feingehalt»: Ziffer davor erlaubt', "(?<![\\\\p{L}\\\\p{N}])(?:(?:s|ag)", "(?<![\\\\p{L}])(?:(?:s|ag)")
    add('«s-feingehalt»: «ag» fehlt', "(?:(?:s|ag)[ -]?(?:9999|999|990)|ag(?:958", "(?:(?:s)[ -]?(?:9999|999|990)|ag(?:958")
    add('«s-feingehalt»: «s» fehlt', "(?:(?:s|ag)[ -]?(?:9999|999|990)|ag(?:958", "(?:(?:ag)[ -]?(?:9999|999|990)|ag(?:958")
    for z in ['9999', '999', '990']:
        add(f'«s-feingehalt»: {z} fehlt', "(?:s|ag)[ -]?(?:9999|999|990)", "(?:s|ag)[ -]?(?:" + '|'.join(x for x in ['9999','999','990'] if x != z) + ")")
    add('«s-feingehalt»: Trenner nicht erlaubt', "(?:s|ag)[ -]?(?:9999|999|990)", "(?:s|ag)(?:9999|999|990)")
    add('«s-feingehalt»: «Ag950» ohne Zahlenliste', "|ag(?:958|950|935|900|875|835|800))${ZAHL_ENDE}", ")${ZAHL_ENDE}")
    add('«s-feingehalt»: Zahl darf weitergehen', "|ag(?:958|950|935|900|875|835|800))${ZAHL_ENDE}${EINHEIT_NACH}", "|ag(?:958|950|935|900|875|835|800))${EINHEIT_NACH}")
    add('«s-feingehalt»: Einheit nicht ausgeschlossen', "|ag(?:958|950|935|900|875|835|800))${ZAHL_ENDE}${EINHEIT_NACH}`", "|ag(?:958|950|935|900|875|835|800))${ZAHL_ENDE}`")
    # --- 92,5
    add('«92,5» entfernt', "['92,5', new RegExp(`", "['92,5', new RegExp(`(?!)")
    ZZ = '(?:92[.,]50?|99[.,]9|0[.,]925|0[.,]999)'
    for alt_z, name in [('92[.,]50?|99[.,]9|0[.,]925|0[.,]999', 'Alle'),]:
        pass
    add('«92,5»: nur Komma (Punkt fehlt)', ZZ.replace('92[.,]50?', '92[.,]50?'), '(?:92[,]50?|99[.,]9|0[.,]925|0[.,]999)', 2)
    add('«92,5»: Form «92,50» fehlt', ZZ, '(?:92[.,]5|99[.,]9|0[.,]925|0[.,]999)', 2)
    add('«92,5»: «99,9» fehlt', ZZ, '(?:92[.,]50?|0[.,]925|0[.,]999)', 2)
    add('«92,5»: «0,925» fehlt', ZZ, '(?:92[.,]50?|99[.,]9|0[.,]999)', 2)
    add('«92,5»: «0,999» fehlt', ZZ, '(?:92[.,]50?|99[.,]9|0[.,]925)', 2)
    add('«92,5»: Abstand nach Silber nur 2', "${SILBERWORT}.{0,30}${NICHT_ZAHL}" + ZZ, "${SILBERWORT}.{0,2}${NICHT_ZAHL}" + ZZ)
    add('«92,5»: Abstand vor Silber nur 2', "${EINHEIT_NACH}.{0,30}${SILBERWORT}`, 'gu')],\n  ['prozent'", "${EINHEIT_NACH}.{0,2}${SILBERWORT}`, 'gu')],\n  ['prozent'")
    add('«92,5»: Abstand nach Silber unbegrenzt', "${SILBERWORT}.{0,30}${NICHT_ZAHL}" + ZZ, "${SILBERWORT}.{0,90}${NICHT_ZAHL}" + ZZ)
    add('«92,5»: Abstand vor Silber unbegrenzt', "${EINHEIT_NACH}.{0,30}${SILBERWORT}`, 'gu')],\n  ['prozent'", "${EINHEIT_NACH}.{0,90}${SILBERWORT}`, 'gu')],\n  ['prozent'")
    # --- Prozent
    add('«prozent» entfernt', "['prozent', new RegExp(`", "['prozent', new RegExp(`(?!)")
    PZ = ['100', '99[.,]9', '99', '95', '92[.,]50?', '90', '80']
    for i, t in enumerate(PZ):
        add(f'Prozent: Wert «{t}» fehlt', "(?:" + '|'.join(PZ) + ")", "(?:" + '|'.join(_ohne(PZ, i)) + ")", 2)
    add('Prozent: «aus» als Füllwort fehlt', "(?:aus |von |echtem |reinem )?", "(?:von |echtem |reinem )?")
    add('Prozent: «von» als Füllwort fehlt', "(?:aus |von |echtem |reinem )?", "(?:aus |echtem |reinem )?")
    add('Prozent: ohne Wortgrenze nach Silber (Silbergrau)', "silber(?![\\\\p{L}])|silber(?:anteil", "silber|silber(?:anteil")
    add('Prozent: «anteil» fehlt', "silber(?:anteil|gehalt|feingehalt)?[: ]{1,3}", "silber(?:gehalt|feingehalt)?[: ]{1,3}")
    add('Prozent: «gehalt» fehlt', "silber(?:anteil|gehalt|feingehalt)?[: ]{1,3}", "silber(?:anteil|feingehalt)?[: ]{1,3}")
    add('Prozent: «feingehalt» fehlt', "silber(?:anteil|gehalt|feingehalt)?[: ]{1,3}", "silber(?:anteil|gehalt)?[: ]{1,3}")
    add('Prozent: Wortzusätze (anteil …) entfallen', "silber(?:anteil|gehalt|feingehalt)?[: ]{1,3}", "silber[: ]{1,3}")
    add('Prozent: nur ein Trennzeichen', "[: ]{1,3}", "[: ]{1,1}")
    # --- Verneinung
    FW = ['aus','um','von','vom','mit','für','fuer','ein','eine','einen','einem','einer','eines','der','die','das','dem','den','des','echt\\\\p{L}*','rein\\\\p{L}*','massiv\\\\p{L}*','pur\\\\p{L}*','solid','real','genuine','any','a','an','the','to','als','zu','oder','und','or','and','of','from','silber','silver','sterling','[\\\\p{L}\\\\p{N}]+-','[\\\\p{L}\\\\p{N}]+\\\\s+(?:oder|or)']
    for i, t in enumerate(FW):
        add(f'Füllwort «{t}» fehlt', "const FUELLWORT = '(?:" + '|'.join(FW) + ")';", "const FUELLWORT = '(?:" + '|'.join(_ohne(FW, i)) + ")';")
    VW = ['kein(?:e[nrsm]?)?','nicht','ohne','statt','anstelle(?: von)?','anstatt','nie','weder','anders als','im gegensatz zu','im vergleich zu','im unterschied zu','gegenüber','versus','vs','compared to','no','not','without','instead of','unlike']
    for i, t in enumerate(VW):
        add(f'Verneinung «{t}» fehlt', "(?:" + '|'.join(VW) + ")\\\\s+(?:${FUELLWORT}", "(?:" + '|'.join(_ohne(VW, i)) + ")\\\\s+(?:${FUELLWORT}")
    for suf in 'nrsm':
        add(f'Verneinung «kein» ohne Endung «{suf}»', "kein(?:e[nrsm]?)?", "kein(?:e[" + ''.join(c for c in 'nrsm' if c != suf) + "]?)?")
    add('Verneinung «keine» ohne Endungsgruppe', "kein(?:e[nrsm]?)?", "kein")
    add('Verneinung: kein Wortanfang nötig (Genie, Anno)', "(?:^|[\\\\s(])(?:kein", "(?:kein")
    add('Verneinung: Textanfang zählt nicht', "(?:^|[\\\\s(])(?:kein", "(?:[\\\\s(])(?:kein")
    add('Verneinung: Klammer zählt nicht als Anfang', "(?:^|[\\\\s(])(?:kein", "(?:^|[\\\\s])(?:kein")
    add('Verneinung: kein Leerzeichen nach Füllwort nötig', "(?:${FUELLWORT}\\\\s+){0,4}$`", "(?:${FUELLWORT}\\\\s*){0,4}$`")
    add('Verneinung: keine Füllwörter erlaubt', "{0,4}$`, 'u');", "{0,0}$`, 'u');")
    add('Verneinung: bis zu neun Füllwörter', "{0,4}$`, 'u');", "{0,9}$`, 'u');")
    add('Verneinung: Ende der Umgebung nicht verlangt', "(?:${FUELLWORT}\\\\s+){0,4}$`", "(?:${FUELLWORT}\\\\s+){0,4}`")
    add('Verneintes wird als Treffer gezählt', "(VERNEINUNG_DAVOR.test(davor) ? verneint : treffer).push(", "(false ? verneint : treffer).push(")
    add('Verneinung: nur zehn Zeichen davor gelesen', "Math.max(0, m.index - 40), m.index)", "Math.max(0, m.index - 10), m.index)")
    # --- bereinige
    add('bereinige entfernt kein HTML', "    .replace(/<\\/?[a-z!][^<>]{0,500}>/gi, ' ')\n", "")
    add('bereinige: Tags länger als 500 Zeichen bleiben stehen', "[^<>]{0,500}>/gi, ' ')", "[^<>]{0,5}>/gi, ' ')")
    add('bereinige: &nbsp; bleibt stehen', "    .replace(/&nbsp;|&#160;/gi, ' ')\n", "    .replace(/&#160;/gi, ' ')\n")
    add('bereinige: &#160; bleibt stehen', "    .replace(/&nbsp;|&#160;/gi, ' ')\n", "    .replace(/&nbsp;/gi, ' ')\n")
    add('bereinige: &amp; wird nicht aufgelöst', "    .replace(/&amp;/gi, '&')\n", "")
    add('bereinige: &shy; bleibt stehen', "    .replace(/&shy;|&#173;|&#xad;/gi, '')\n", "    .replace(/&#173;|&#xad;/gi, '')\n")
    add('bereinige: &#173; bleibt stehen', "    .replace(/&shy;|&#173;|&#xad;/gi, '')\n", "    .replace(/&shy;|&#xad;/gi, '')\n")
    add('bereinige: &#xad; bleibt stehen', "    .replace(/&shy;|&#173;|&#xad;/gi, '')\n", "    .replace(/&shy;|&#173;/gi, '')\n")
    add('bereinige: unsichtbare Zeichen bleiben stehen', "    .replace(/[\\u00ad\\u200b-\\u200d\\u2060\\ufeff]/g, '')\n", "")
    add('bereinige: U+00AD bleibt', "[\\u00ad\\u200b-\\u200d\\u2060\\ufeff]", "[\\u200b-\\u200d\\u2060\\ufeff]")
    add('bereinige: U+200B bis U+200D bleibt', "[\\u00ad\\u200b-\\u200d\\u2060\\ufeff]", "[\\u00ad\\u2060\\ufeff]")
    add('bereinige: U+2060 bleibt', "[\\u00ad\\u200b-\\u200d\\u2060\\ufeff]", "[\\u00ad\\u200b-\\u200d\\ufeff]")
    add('bereinige: U+FEFF bleibt', "[\\u00ad\\u200b-\\u200d\\u2060\\ufeff]", "[\\u00ad\\u200b-\\u200d\\u2060]")
    add('bereinige: NFKC entfällt (Vollbreite Ziffern)', "    .normalize('NFKC')\n", "")
    add('bereinige: Leerraum wird nicht zusammengefasst', "    .replace(/\\s+/g, ' ')\n", "")
    add('bereinige schreibt nicht klein', "    .toLowerCase();", "    ;")
    BG = ['br','\\/p','\\/li','\\/div','\\/h[1-6]','\\/tr','\\/td','\\/ul','\\/ol']
    for i, t in enumerate(BG):
        add(f'Blockgrenze «{t}» fehlt', "(?:" + '|'.join(BG) + ")\\b", "(?:" + '|'.join(_ohne(BG, i)) + ")\\b")
    add('Blockgrenzen: ohne Wortgrenze (<breadcrumb>)', "ol)\\b[^<>]{0,300}>", "ol)[^<>]{0,300}>")
    add('Blockgrenzen: Attribute im Tag nicht erlaubt', "ol)\\b[^<>]{0,300}>", "ol)\\b>")
    add('Blockgrenzen (</li>, <br>) sind kein Satzende', "    .replace(/<\\s*(?:br|\\/p|\\/li|\\/div|\\/h[1-6]|\\/tr|\\/td|\\/ul|\\/ol)\\b[^<>]{0,300}>/gi, ' . ')\n", "")
    add('Zeilenumbruch ist kein Satzende', "    .replace(/[\\r\\n\\u2028\\u2029]+/g, ' . ')\n", "")
    add('Zeilenumbruch: «\\r» allein zählt nicht', "[\\r\\n\\u2028\\u2029]+", "[\\n\\u2028\\u2029]+")
    add('Zeilenumbruch: «\\n» zählt nicht', "[\\r\\n\\u2028\\u2029]+", "[\\r\\u2028\\u2029]+")
    add('Zeilenumbruch: U+2028 zählt nicht', "[\\r\\n\\u2028\\u2029]+", "[\\r\\n\\u2029]+")
    add('Zeilenumbruch: U+2029 zählt nicht', "[\\r\\n\\u2028\\u2029]+", "[\\r\\n\\u2028]+")
    # --- Felder und Eingaben
    add('Titel nicht beachtet', "const felder = [['titel', p?.title], ", "const felder = [")
    add('Beschreibung nicht beachtet', "['beschreibung', [p?.description, p?.descriptionHtml].filter(Boolean).join('\\n')], ", "")
    add('descriptionHtml nicht beachtet', "[p?.description, p?.descriptionHtml].filter(Boolean)", "[p?.description].filter(Boolean)")
    add('description nicht beachtet', "[p?.description, p?.descriptionHtml].filter(Boolean)", "[p?.descriptionHtml].filter(Boolean)")
    add('Beschreibungsfelder ohne Satzgrenze verbunden', "filter(Boolean).join('\\n')", "filter(Boolean).join(' ')")
    add('Optionen nicht beachtet', ", ['option', optionsText(p?.options)]];", "];")
    add('«fein» zählt auch in Optionen (Farbnamen)', "ohneFein: feld === 'option'", "ohneFein: false")
    add('«fein» wird nie übersprungen', "if (ohneFein && art === 'fein') continue;", "")
    add('optionsText: Werte (values) fehlen', "x.values ?? []", "[]")
    add('optionsText: optionValues fehlen', "(x.optionValues ?? [])", "[]")
    add('optionsText: Zeichenketten in optionValues fehlen', "(typeof v === 'string' ? v : v?.name ?? '')", "(v?.name ?? '')")
    add('optionsText: leerer Eintrag in optionValues stürzt', "v?.name ?? ''", "v.name")
    add('optionsText: value fehlt', "x.value ?? []", "[]")
    add('optionsText: Einträge ohne Trenner verbunden', ".join(' ; ')", ".join(' ')")
    add('optionsText: Name ohne Doppelpunkt', "`${x.name ?? ''}: ${werte.join(' / ')}`", "`${x.name ?? ''} ${werte.join(' / ')}`")
    add('optionsText: Zeichenketten in der Liste fehlen', "if (typeof x === 'string') return x;", "")
    add('optionsText: leerer Eintrag stürzt', "if (x == null) return '';", "")
    add('optionsText: einzelnes Objekt wird nicht gelesen', "(Array.isArray(o) ? o : [o])", "(Array.isArray(o) ? o : [])")
    add('treffer immer wahr', "return { treffer: belege.length > 0, belege, verneint };", "return { treffer: true, belege, verneint };")
    add('treffer immer falsch', "return { treffer: belege.length > 0, belege, verneint };", "return { treffer: false, belege, verneint };")
    add('Beleg ohne Feldname', "belege.push({ feld, ...x })", "belege.push({ ...x })")
    add('Belegtext zeigt mehr als drei', "r.belege.slice(0, 3).map(", "r.belege.slice(0, 9).map(")
    return M

def mutanten():
    """(Datei, Name, alt, neu). `alt` muss genau einmal vorkommen, sonst gilt der Mutant als nicht anwendbar."""
    L, A = 'lib.mjs', 'apply.mjs'
    return [
        # ---- lib.mjs: Auswahl
        (L, 'Muster ohne Lookbehind (1925 träfe)', "const MUSTER = /(?<![0-9])925(?![0-9])/;", "const MUSTER = /925(?![0-9])/;"),
        (L, 'Muster ohne Lookahead (19250 träfe)', "const MUSTER = /(?<![0-9])925(?![0-9])/;", "const MUSTER = /(?<![0-9])925/;"),
        (L, 'waehle: Arbeits-Tag schliesst wieder aus (reaktivierte Produkte unbemerkt)', " && trifft(p) && !ausnahmen.has(p.handle))\n    .map", " && trifft(p) && !(p.tags || []).includes(MARKER) && !ausnahmen.has(p.handle))\n    .map"),
        (L, 'waehle: nicht sortiert', "\n    .sort((a, b) => a.handle.localeCompare(b.handle));", ";"),
        (L, 'waehle: Regel nicht verlangt', "p.handle && trifft(p) && ", "p.handle && "),
        # ---- lib.mjs: Lesen
        (L, 'LESEN: Kanal-Liste anders benannt', "pub:resourcePublicationsV2(first:50, onlyPublished:true)", "pubx:resourcePublicationsV2(first:50, onlyPublished:true)"),
        (L, 'LESEN: onlyPublished:false (vorgemerkte zählen als veröffentlicht)', "pub:resourcePublicationsV2(first:50, onlyPublished:true)", "pub:resourcePublicationsV2(first:50, onlyPublished:false)"),
        (L, 'LESEN: nur 5 Kanäle', "pub:resourcePublicationsV2(first:50, onlyPublished:true)", "pub:resourcePublicationsV2(first:5, onlyPublished:true)"),
        (L, 'flach: Kanäle nicht sortiert', ".map((x) => x.publication.id).sort(),", ".map((x) => x.publication.id),"),
        # ---- lib.mjs: Entscheid
        (L, 'entscheide: Regel nicht geprüft', "if (!trifft(ist)) return", "if (false) return"),
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
        # ---- lib.mjs: erweiterte Regel (17.11.), Ausnahmeliste, Lesen von Beschreibung und Optionen
        (L, 'trifft: Beschreibung nicht beachtet', "istSilberFeingehalt({ title: p?.title, description: p?.description, options: p?.options });", "istSilberFeingehalt({ title: p?.title, options: p?.options });"),
        (L, 'trifft: Optionen nicht beachtet', "istSilberFeingehalt({ title: p?.title, description: p?.description, options: p?.options });", "istSilberFeingehalt({ title: p?.title, description: p?.description });"),
        (L, 'waehle: Ausnahmeliste nicht beachtet', " && !ausnahmen.has(p.handle))\n    .map", ")\n    .map"),
        (L, 'waehle: regel immer «text»', "regel: hat925(p.title) ? 'titel-925' : 'text',", "regel: 'text',"),
        (L, 'waehle: Beleg fehlt', "      beleg: belegText(silberFeingehalt({ title: p.title, description: p.description, options: p.options })).slice(0, 300),\n", "      beleg: '',\n"),
        (L, 'entscheide: Ausnahmeliste nicht beachtet', "  if (ausnahmen.has(ist.handle)) return", "  if (false) return"),
        (L, 'LESEN: Beschreibung fehlt', " productType description options{name values}\n", " productType options{name values}\n"),
        (L, 'LESEN: Optionen fehlen', " productType description options{name values}\n", " productType description\n"),
        (L, 'flach: Beschreibung nicht übernommen', "    description: n.description ?? '', options: n.options || [],", "    description: '', options: n.options || [],"),
        (L, 'flach: Optionen nicht übernommen', "    description: n.description ?? '', options: n.options || [],", "    description: n.description ?? '', options: [],"),
        (A, 'Liste: Regel-Angabe ersetzt die Prüfung nicht (nur Titel-925 zählt)', "!(hat925(e.title) || e.regel)", "!hat925(e.title)"),
        (A, 'Liste: jede Liste gilt als plausibel', "!(hat925(e.title) || e.regel)", "false"),
        (A, 'Ausnahmeliste wird nicht an entscheide gegeben', "{ inSicherung: sichIds.has(e.id), ausnahmen }", "{ inSicherung: sichIds.has(e.id) }"),
        # gleichwertig (bewusst nicht aufgeführt): die Schutzzeile gegen leere Treffer (Endlosschleife) — kein Muster kann leer treffen
    ] + regel_mutanten()

def main():
    tmp = tempfile.mkdtemp(prefix='silbermut_')
    try:
        aufbauen(tmp)
        t_tool = os.path.join(tmp, 'dropship', 'silber-bazg-1711', 'apply_test.mjs')
        t_regel = os.path.join(tmp, 'automation', 'lib', 'silber_feingehalt_test.mjs')
        for test in (t_tool, t_regel):
            rc, aus = lauf(tmp, test)
            if rc != 0: print('Ausgangslage NICHT grün:', os.path.basename(test), aus); return 2
            print('Ausgangslage grün:', os.path.basename(test), aus.strip().splitlines()[-1])
        erkannt = nicht = n_a = 0
        for m in mutanten():
            datei, name, alt, neu = m[:4]
            anzahl = m[4] if len(m) > 4 else 1
            quelle = open(quelle_von(datei), encoding='utf8').read()
            if quelle.count(alt) != anzahl:
                n_a += 1; print(f'? nicht anwendbar ({quelle.count(alt)} Treffer statt {anzahl}): {name}'); continue
            aufbauen(tmp)
            open(pfad(tmp, datei), 'w', encoding='utf8').write(quelle.replace(alt, neu))
            rc, aus = lauf(tmp, t_regel if datei == R else t_tool)
            if rc != 0: erkannt += 1
            else: nicht += 1; print(f'✗ ÜBERLEBT: {name}')
        print(f'\n{erkannt} erkannt, {nicht} überlebt, {n_a} nicht anwendbar (von {erkannt + nicht + n_a})')
        return 1 if (nicht or n_a) else 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    sys.exit(main())
