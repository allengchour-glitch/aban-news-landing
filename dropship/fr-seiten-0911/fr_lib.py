"""Französische Seiten: reine Logik (ohne Netz). Methode wie bei den Richtlinien (09.11.), aber für beliebiges Seiten-HTML.

Das deutsche HTML wird in «Läufe» zerlegt: zusammenhängender Text samt Inline-Tags (a, strong, em, br …) zwischen zwei
Block-Tags (p, h2, li, td, div …). Nur der Inhalt der Läufe wird übersetzt; Gerüst, Attribute, Stile und Skripte bleiben
Zeichen für Zeichen gleich. So kann die Gestaltung nicht verrutschen.
Geprüft wird: gleiche Laufzahl, gleiches Gerüst, gleiche Inline-Tag-Folge (interne Links mit /fr), gleiche Ziffern,
kein deutscher Restsatz, keine unübersetzten deutschen Pfade.
"""
import html as _html
import re

INLINE = {'a', 'strong', 'b', 'em', 'i', 'span', 'br', 'u', 'small', 'sup', 'sub', 'mark', 'code', 'abbr', 'wbr', 's'}
OPAK = {'style', 'script'}
BUCHSTABE = re.compile(r'[A-Za-zÀ-ÿ]')
KURZ_UNVERAENDERT = re.compile(r'^[A-Z0-9/\-–.,+ ×x"\'()]{1,6}$')  # Grössenkürzel, Zahlen: bleiben, brauchen keine Übersetzung


def klartext(s):
    return re.sub(r'\s+', ' ', _html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def zerlege(h):
    """Rückgabe: (teile, laeufe). teile: Liste ('g', Gerüst) | ('l', Index). laeufe: Liste der Lauf-Inhalte (roh)."""
    toks = re.split(r'(<[^>]+>)', h)
    teile, laeufe = [], []
    lauf = []          # Tokens des aktuellen Laufs
    opak = None        # Name eines offenen style/script

    def schliesse():
        nonlocal lauf
        if not lauf:
            return
        inhalt = ''.join(lauf)
        kt = klartext(inhalt)
        if BUCHSTABE.search(kt) and not KURZ_UNVERAENDERT.match(kt):
            teile.append(('l', len(laeufe)))
            laeufe.append(inhalt)
        else:
            teile.append(('g', inhalt))
        lauf = []

    for t in toks:
        if t == '':
            continue
        if opak:
            teile.append(('g', t))
            m = re.match(r'</\s*(\w+)', t)
            if m and m.group(1).lower() == opak:
                opak = None
            continue
        if t.startswith('<'):
            m = re.match(r'</?\s*([a-zA-Z0-9]+)', t)
            name = m.group(1).lower() if m else ''
            if name in INLINE:
                lauf.append(t)
                continue
            schliesse()
            teile.append(('g', t))
            if name in OPAK and not t.startswith('</'):
                opak = name
            continue
        if not lauf and not t.strip():
            teile.append(('g', t))
        else:
            lauf.append(t)
    schliesse()
    return teile, laeufe


def baue(h_de, fr_laeufe):
    """Setzt die französischen Läufe in das deutsche Gerüst ein. Rückgabe: (html, probleme)."""
    teile, laeufe = zerlege(h_de)
    probleme = []
    if len(fr_laeufe) != len(laeufe):
        probleme.append(f'Laufzahl: deutsch {len(laeufe)}, französisch {len(fr_laeufe)}')
        return None, probleme
    out = []
    for art, wert in teile:
        if art == 'g':
            out.append(wert)
            continue
        de = laeufe[wert]
        fr = fr_laeufe[wert]
        lead = de[:len(de) - len(de.lstrip())]
        trail = de[len(de.rstrip()):]
        out.append(lead + fr.strip() + trail)
    return ''.join(out), probleme


def inline_tags(inhalt):
    return [re.sub(r'\s+', ' ', m.group(0)) for m in re.finditer(r'<[^>]+>', inhalt)]


def erwartet_fr(tag):
    return re.sub(r'href="/(policies|pages|collections|products|blogs)/', r'href="/fr/\1/', tag)


def ziffern(inhalt):
    return sorted(re.findall(r'\d+', klartext(inhalt)))


DEUTSCH = re.compile(r'\b(und|der|die|das|ist|nicht|für|mit|bei|wir|dein|deine|deinen|deiner|ein|eine|auf|oder|wenn|dir|dich|ihr|euch|sind|wird|werden|kann|kannst|noch|nur|auch|aber|bitte|Werktage|Rückgabe|Versand|Lieferung|Artikel|Bestellung|Grösse|Grösse|Rücksendung|Kundenservice)\b')


def rest_deutsch(inhalt):
    treffer = []
    for satz in re.split(r'(?<=[.!?:;])\s+|\s{2,}', klartext(inhalt)):
        m = DEUTSCH.search(satz)
        if m:
            treffer.append(f'{satz[:90]}  ← {m.group(1)}')
    return treffer


SKRIPT = re.compile(r'(<script[^>]*>)(.*?)(</script>)', re.S)
LD = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)


def neutral(h):
    """Skript-Inhalte (strukturierte Daten) werden getrennt geprüft: fürs Gerüst durch § ersetzen."""
    return SKRIPT.sub(r'\1§\3', h)


def json_ld_bauen(h, daten):
    """Ersetzt im (deutschen) HTML den FAQPage-Block durch die französische Fassung. daten: {'inLanguage','@id','fragen':[(f,a)]}"""
    import json
    m = LD.search(h)
    if not m:
        raise RuntimeError('kein JSON-LD-Block gefunden')
    j = json.loads(m.group(2))
    if len(j['mainEntity']) != len(daten['fragen']):
        raise RuntimeError(f"JSON-LD: {len(j['mainEntity'])} Fragen deutsch, {len(daten['fragen'])} französisch")
    j['inLanguage'] = daten['inLanguage']
    j['@id'] = daten['@id']
    for q, (frage, antwort) in zip(j['mainEntity'], daten['fragen']):
        q['name'] = frage
        q['acceptedAnswer']['text'] = antwort
    return h[:m.start(2)] + json.dumps(j, ensure_ascii=False) + h[m.end(2):]


def pruefe_json_ld(h_de, h_fr):
    import json
    f = []
    a, b = LD.search(h_de), LD.search(h_fr)
    if bool(a) != bool(b):
        return ['JSON-LD nur auf einer Seite vorhanden']
    if not a:
        return f
    try:
        jd, jf = json.loads(a.group(2)), json.loads(b.group(2))
    except Exception as e:
        return [f'JSON-LD nicht lesbar: {e}']
    if len(jd.get('mainEntity', [])) != len(jf.get('mainEntity', [])):
        f.append('JSON-LD: Zahl der Fragen weicht ab')
    if jf.get('inLanguage') != 'fr-CH':
        f.append('JSON-LD: inLanguage ist nicht fr-CH')
    if '/fr/' not in jf.get('@id', ''):
        f.append('JSON-LD: @id zeigt nicht auf /fr/')
    for q in jf.get('mainEntity', []):
        for s in (q['name'], q['acceptedAnswer']['text']):
            for r in rest_deutsch(s):
                f.append(f'JSON-LD: Deutsch im Französischen: {r}')
    return f


def pruefe(h_de, h_fr):
    """Leere Liste = in Ordnung."""
    f = pruefe_json_ld(h_de, h_fr)
    h_de, h_fr = neutral(h_de), neutral(h_fr)
    td, ld = zerlege(h_de)
    tf, lf = zerlege(h_fr)
    if len(ld) != len(lf):
        return f + [f'Laufzahl deutsch {len(ld)} gegen französisch {len(lf)}']
    if [x for x in td if x[0] == 'g'] != [x for x in tf if x[0] == 'g']:
        f.append('Gerüst (Block-Tags, Attribute, Stile, Skripte) weicht ab')
    for i, (a, b) in enumerate(zip(ld, lf)):
        ta = [erwartet_fr(t) for t in inline_tags(a)]
        tb = inline_tags(b)
        if ta != tb:
            f.append(f'Lauf {i}: Inline-Tags weichen ab ({"".join(ta)[:80]} gegen {"".join(tb)[:80]})')
        if ziffern(a) != ziffern(b):
            f.append(f'Lauf {i}: Ziffern weichen ab ({ziffern(a)} gegen {ziffern(b)})')
        for r in rest_deutsch(b):
            f.append(f'Lauf {i}: Deutsch im Französischen: {r}')
    if re.search(r'href="/(policies|pages|collections|products|blogs)/', h_fr):
        f.append('französischer Text enthält einen internen Link ohne /fr')
    return f
