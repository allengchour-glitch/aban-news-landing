#!/usr/bin/env python3
"""Französisch Stufe 5: Produkte übersetzen (Gemini + Läufe-Methode aus fr-seiten-0911, Schreiben über translationsRegister).

Besitzer 09.11. abends: «produkte doch mit übersetztung?» und «arbeite ohne pause durch».
Je Produkt: title, body_html, meta_title, meta_description, product_type und die Namen der Optionen und Optionswerte.
Das Gerüst der Beschreibung (Tags, Stile, Kommentare) bleibt Zeichen für Zeichen gleich, nur die Textläufe werden ersetzt;
Prüfung wie bei den Seiten (fr_lib.pruefe). Boilerplate-Läufe kommen aus dem Übersetzungsspeicher (tm.json), die Links
«Das könnte dir auch gefallen» aus den französischen Sammlungstiteln (gleiche Namen wie das Menü).

Aufruf (Vorgabe: Trockenlauf, übersetzt und prüft, schreibt NICHTS nach Shopify; Vorschau in lauf/vorschau/):
  python3 dropship/fr-produkte-0911/fr_produkte.py --selbsttest
  IDS=dropship/fr-produkte-0911/auswahl-stufe5a.json LIMIT=10 python3 dropship/fr-produkte-0911/fr_produkte.py
  LIVE=1 IDS=… LIMIT=10 python3 …                        schreibt (nutzt die Vorschau, wenn der deutsche Text gleich blieb)
  ZURUECK=1 LIVE=1 IDS=… python3 …                       entfernt genau die vom Werkzeug geschriebenen französischen Felder
  NUR=handle1,handle2 …                                  begrenzt auf diese Handles
Geschrieben wird nur Sprache fr, nur Felder aus FELDER sowie name von Option und Optionswert, mit frisch gelesenem Digest.
"""
import hashlib
import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..', 'fr-seiten-0911'))
import fr_lib as L  # noqa: E402
import llm  # noqa: E402
import shop as S  # noqa: E402

FELDER = ['title', 'body_html', 'meta_title', 'meta_description', 'product_type']
LAUF = os.path.join(HIER, 'lauf')
VORSCHAU = os.path.join(LAUF, 'vorschau')
LEDGER = os.path.join(LAUF, 'ledger.json')
TM_DATEI = os.path.join(HIER, 'tm.json')
FEST_DATEI = os.path.join(HIER, 'ueberschreiben.json')     # {handle: {"title": "…"}}: von Hand gesetzte französische Titel
PREIS_EIN = float(os.environ.get('FR_PREIS_EIN', '0.10'))    # Annahme in USD je Million Tokens (nicht belegt)
PREIS_AUS = float(os.environ.get('FR_PREIS_AUS', '0.40'))

# Feste Übersetzungen häufiger Optionsnamen (Konsistenz über den Katalog)
OPTIONSNAMEN = {'Farbe': 'Couleur', 'Grösse': 'Taille', 'Größe': 'Taille', 'Ausführung': 'Version', 'Material': 'Matière',
                'Stil': 'Style', 'Muster': 'Motif', 'Modell': 'Modèle', 'Typ': 'Type', 'Länge': 'Longueur', 'Menge': 'Quantité',
                'Variante': 'Variante', 'Set': 'Set', 'Anzahl': 'Quantité', 'Form': 'Forme', 'Breite': 'Largeur', 'Höhe': 'Hauteur'}

Q_PRODUKT = '''query($id:ID!){ product(id:$id){ id handle title status options{ id name optionValues{ id name } } } }'''
Q_RES = '''query($ids:[ID!]!){ translatableResourcesByIds(resourceIds:$ids, first:250){ nodes{ resourceId
  translatableContent{ key value digest } translations(locale:"fr"){ key value outdated } } } }'''
Q_SAMMLUNGEN = '''query($c:String){ translatableResources(resourceType:COLLECTION, first:100, after:$c){
  pageInfo{ hasNextPage endCursor } nodes{ resourceId translatableContent{ key value } translations(locale:"fr"){ key value } } } }'''
M_REG = '''mutation($id:ID!,$tr:[TranslationInput!]!){ translationsRegister(resourceId:$id, translations:$tr){
  translations{ key locale } userErrors{ field message code } } }'''
M_DEL = '''mutation($id:ID!,$keys:[String!]!){ translationsRemove(resourceId:$id, translationKeys:$keys, locales:["fr"]){
  userErrors{ field message code } } }'''

# ----------------------------------------------------------------------------- reine Logik (ohne Netz)
RE_HREF = re.compile(r'href="(/(?:collections|products|pages|blogs|policies)/)')
RE_UND = re.compile(r'&(?!(?:[A-Za-z][A-Za-z0-9]*|#\d+|#[xX][0-9A-Fa-f]+);)')
RE_ZIFFERN = re.compile(r'\d+')
META_TITEL_DE = re.compile(r'^(?P<t>.+) \| LuxeStyle CH$')
META_BESCHR_DE = re.compile(r'^(?P<t>.+) bei LuxeStyle – Schweizer Online-Shop\. Gratis-Versand ab CHF 50, 30 Tage Rückgabe\. Jetzt –10% mit Code WELCOME10\.$')
RE_VERWANDT = re.compile(r'<a href="/collections/([^"/?#]+)">([^<]*)</a>')


def erster_buchstabe(s):
    """Index des ersten Buchstabens ausserhalb von Tags und Entities, sonst -1."""
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == '<':
            j = s.find('>', i)
            if j < 0:
                return -1
            i = j + 1
            continue
        if c == '&':
            j = s.find(';', i)
            if 0 < j - i <= 8:
                i = j + 1
                continue
        if c.isalpha():
            return i
        i += 1
    return -1


def anfang_gross(de, fr):
    """Beginnt der deutsche Eintrag gross (Etikett, Satz) und der französische klein (Wörterbuch), wird gross geschrieben."""
    a, b = erster_buchstabe(de), erster_buchstabe(fr)
    if a >= 0 and b >= 0 and de[a].isupper() and fr[b].islower():
        return fr[:b] + fr[b].upper() + fr[b + 1:]
    return fr


NACHBESSERN = [('30 jours retour', '30 jours de retour'), ('30 jours de droit de retour', '30 jours de droit de retour')]


ENTITAETEN = [('&quot;', '"'), ('&#39;', "'"), ('&#x27;', "'"), ('&apos;', "'"), ('&lt;', '<'), ('&gt;', '>'), ('&amp;', '&')]


def nachbessern(s):
    for a, b in NACHBESSERN:
        s = s.replace(a, b)
    return s


def nachbearbeiten(s):
    """Für Läufe in der Beschreibung (HTML): interne Links bekommen /fr, nackte & werden zu &amp;."""
    return RE_UND.sub('&amp;', RE_HREF.sub(r'href="/fr\1', nachbessern(s)))


def klartext(s):
    """Für Felder ohne HTML (Titel, Produkttyp, Optionen, Meta-Texte): Entities auflösen, nichts maskieren.
    Das Theme maskiert selbst; ein `&amp;` in der Übersetzung wird im <title> zu «&amp;amp;» und im Tab wörtlich angezeigt (GEMESSEN 09.11.)."""
    for a, b in ENTITAETEN:
        s = s.replace(a, b)
    return s


def html_form(s):
    """Der Übersetzungsspeicher führt Texte in HTML-Form (Gegenstück zu klartext)."""
    return RE_UND.sub('&amp;', s)


RE_BR = re.compile(r'(?:\s*<br\s*/?>\s*)+', re.I)


def umbrueche_wie_quelle(de, fr):
    """Gemini setzt gern `<br>` vor Aufzählungsstriche, wo die Quelle reinen Text hat (GEMESSEN am Rennrad-Produkt: drei Runden lang
    «Tags weichen ab»). Hat die Quelle kein `<br>`, werden fremde Umbrüche zu Leerzeichen: so wird es dargestellt wie das Deutsche."""
    if re.search(r'<br', de, re.I):
        return fr
    return RE_BR.sub(' ', fr)


def ziffern(s):
    return sorted(RE_ZIFFERN.findall(re.sub(r'<[^>]+>', ' ', s)))


def meta_titel_fr(de, titel_fr):
    m = META_TITEL_DE.match(de or '')
    return f'{titel_fr} | LuxeStyle CH' if m else None


def meta_beschr_fr(de, titel_fr):
    m = META_BESCHR_DE.match(de or '')
    if not m:
        return None
    return (f'{titel_fr} chez LuxeStyle – boutique en ligne suisse. Livraison gratuite dès CHF 50, 30 jours de retour. '
            f'–10 % avec le code WELCOME10.')


def verwandt_fr(de_lauf, titel_fr):
    """Der Block «Das könnte dir auch gefallen» ist eine Vorlage: Etikett fest, Linktexte = französische Sammlungstitel."""
    if '<strong>🛍️ Das könnte dir auch gefallen:</strong>' not in de_lauf:
        return None
    fehlt = []

    def ers(m):
        de_fr = titel_fr.get(m.group(1))
        if not de_fr or html.unescape(m.group(2)) != de_fr[0]:       # Linktext weicht vom Sammlungstitel ab: Gemini
            fehlt.append(m.group(1))
            return m.group(0)
        return f'<a href="/collections/{m.group(1)}">{html.escape(de_fr[1], quote=False)}</a>'
    out = RE_VERWANDT.sub(ers, de_lauf.replace('Das könnte dir auch gefallen:', 'Cela pourrait aussi vous plaire :'))
    return None if fehlt else out


def standard_option(name, werte):
    """Die Standard-Option eines Produkts ohne Auswahl («Title» / «Default Title») wird nirgends angezeigt."""
    return name == 'Title' and list(werte) == ['Default Title']


def tm_laden():
    if os.path.exists(TM_DATEI):
        return json.load(open(TM_DATEI, encoding='utf-8'))
    return {}


def tm_speichern(tm):
    tmp = TM_DATEI + '.tmp'
    json.dump(tm, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, TM_DATEI)


def gemini_geteilt(texte, kontext, nutzung):
    """Ein Aufruf; scheitert er (falsche Zahl, ungültige Antwort), wird die Liste halbiert und jede Hälfte einzeln übersetzt."""
    try:
        erg, nu = llm.aufruf(texte, kontext=kontext)
    except RuntimeError:
        if len(texte) == 1:
            raise
        h = len(texte) // 2
        return gemini_geteilt(texte[:h], kontext, nutzung) + gemini_geteilt(texte[h:], kontext, nutzung)
    for k in ('ein', 'aus', 'denk'):
        nutzung[k] = nutzung.get(k, 0) + nu.get(k, 0)
    nutzung['aufrufe'] = nutzung.get('aufrufe', 0) + 1
    return erg


def uebersetze(eintraege, kontext, tm, nutzung, titel_fr, runden=3):
    """eintraege: Liste von (art, de) mit art in {'lauf','kurz'}. Rückgabe: Liste französischer Texte (nachbearbeitet).
    Reihenfolge: Übersetzungsspeicher, Vorlagen, Gemini (nur der Rest, gesammelt); Fehler lösen höchstens `runden` Aufrufe aus."""
    ergebnis = [None] * len(eintraege)
    offen = []
    for i, (art, de) in enumerate(eintraege):
        if de in tm:
            ergebnis[i] = tm[de] if art == 'lauf' else klartext(tm[de])
            continue
        v = verwandt_fr(de, titel_fr) if art == 'lauf' else None
        if v is not None:
            ergebnis[i] = nachbearbeiten(v)
            continue
        offen.append(i)
    for runde in range(runden):
        if not offen:
            break
        erg = gemini_geteilt([eintraege[i][1] for i in offen], kontext, nutzung)
        neu_offen = []
        for i, fr in zip(offen, erg):
            art, de = eintraege[i]
            roh = fr.strip()
            fr = anfang_gross(de, nachbearbeiten(umbrueche_wie_quelle(de, roh)) if art == 'lauf' else klartext(nachbessern(roh)))
            if einzelpruefung(de, fr):
                neu_offen.append(i)
            else:
                ergebnis[i] = fr
        offen = neu_offen
    if offen:
        raise ValueError(f'{len(offen)} Einträge nach {runden} Runden nicht prüfbar: ' + ' | '.join(eintraege[i][1][:50] for i in offen[:3]))
    return ergebnis


def einzelpruefung(de, fr):
    """Fehlerliste für einen einzelnen Eintrag (leer = in Ordnung): Ziffern, Inline-Tags, Länge, deutscher Rest."""
    f = []
    if not fr.strip():
        f.append('leer')
    if ziffern(de) != ziffern(fr):
        f.append('Ziffern weichen ab')
    tags = lambda s: re.findall(r'<[^>]+>', s)  # noqa: E731
    if [re.sub(r'href="/fr/', 'href="/', t) for t in tags(fr)] != tags(de):
        f.append('Tags weichen ab')
    if len(fr) > 4 * max(len(de), 20):
        f.append('viel zu lang')
    if L.rest_deutsch(re.sub(r'<[^>]+>', ' ', fr)):
        f.append('deutscher Rest')
    return f


def produkt_uebersetzen(inhalt, optionen, tm, titel_fr, nutzung, titel_fest=None):
    """inhalt: {key: de}; optionen: [(name, [wert, …]), …]. Rückgabe (fr_felder, fr_optionen, neue_tm_eintraege)."""
    teile, laeufe = L.zerlege(inhalt['body_html'] or '')
    eintraege = [('kurz', inhalt['title'])]
    if inhalt.get('product_type'):
        eintraege.append(('kurz', inhalt['product_type']))
    namen_fest = {}
    for name, werte in optionen:
        if standard_option(name, werte):
            continue
        if name in OPTIONSNAMEN:
            namen_fest[name] = OPTIONSNAMEN[name]
        else:
            eintraege.append(('kurz', name))
        for w in werte:
            eintraege.append(('kurz', w))
    for lauf in laeufe:
        eintraege.append(('lauf', lauf))
    # Meta-Texte nach dem Titel (Vorlage), sonst als Eintrag
    meta_t, meta_b = inhalt.get('meta_title') or '', inhalt.get('meta_description') or ''
    # Erst alle ausser Meta; Meta braucht den französischen Titel
    fr_liste = uebersetze(eintraege, inhalt['title'], tm, nutzung, titel_fr)
    pos = 0
    titel = titel_fest or fr_liste[pos]
    pos += 1
    ptyp = None
    if inhalt.get('product_type'):
        ptyp = fr_liste[pos]
        pos += 1
    fr_optionen = []
    for name, werte in optionen:
        if standard_option(name, werte):
            fr_optionen.append((name, list(werte)))
            continue
        if name in namen_fest:
            n_fr = namen_fest[name]
        else:
            n_fr = fr_liste[pos]
            pos += 1
        w_fr = fr_liste[pos:pos + len(werte)]
        pos += len(werte)
        fr_optionen.append((n_fr, w_fr))
    fr_laeufe = fr_liste[pos:]
    body, probleme = L.baue(inhalt['body_html'] or '', fr_laeufe)
    if body is None:
        raise ValueError('Gerüst: ' + '; '.join(probleme))
    probleme += L.pruefe(inhalt['body_html'] or '', body)
    if probleme:
        raise ValueError('Prüfung body_html: ' + '; '.join(probleme[:4]))
    out = {'title': titel, 'body_html': body}
    if inhalt.get('product_type'):
        out['product_type'] = ptyp
    if meta_t:
        out['meta_title'] = meta_titel_fr(meta_t, titel) or uebersetze([('kurz', meta_t)], inhalt['title'], tm, nutzung, titel_fr)[0]
    if meta_b:
        out['meta_description'] = meta_beschr_fr(meta_b, titel) or uebersetze([('kurz', meta_b)], inhalt['title'], tm, nutzung, titel_fr)[0]
    if len(out['title']) > 255:
        raise ValueError('Titel zu lang')
    # Übersetzungsspeicher: kurze Läufe und Etiketten, die geprüft sind
    neu = {}
    for (art, de), fr in zip(eintraege, fr_liste):
        if len(de) <= 220 and de != fr and de not in tm and de != inhalt['title']:
            neu[de] = fr if art == 'lauf' else html_form(fr)
    return out, fr_optionen, neu


# ----------------------------------------------------------------------------- Netz
def titel_fr_laden(shop, tok):
    c, out = None, {}
    while True:
        d = S.gql(shop, tok, Q_SAMMLUNGEN, {'c': c})['translatableResources']
        for n in d['nodes']:
            inh = {x['key']: x['value'] for x in n['translatableContent']}
            fr = {t['key']: t['value'] for t in n['translations']}
            if inh.get('handle') and fr.get('title') and inh.get('title'):
                out[inh['handle']] = (inh['title'], fr['title'])
        if not d['pageInfo']['hasNextPage']:
            return out
        c = d['pageInfo']['endCursor']


def produkt_lesen(shop, tok, pid):
    p = S.gql(shop, tok, Q_PRODUKT, {'id': pid})['product']
    ids = [pid] + [o['id'] for o in p['options']] + [v['id'] for o in p['options'] for v in o['optionValues']]
    res = {}
    for i in range(0, len(ids), 250):
        for n in S.gql(shop, tok, Q_RES, {'ids': ids[i:i + 250]})['translatableResourcesByIds']['nodes']:
            res[n['resourceId']] = n
    return p, res


def inhalt_von(n):
    return {x['key']: x['value'] for x in n['translatableContent']}, {x['key']: x['digest'] for x in n['translatableContent']}


def schreiben(shop, tok, rid, felder_werte, digests):
    tr = [{'locale': 'fr', 'key': k, 'value': v, 'translatableContentDigest': digests[k]} for k, v in felder_werte.items()]
    r = S.gql(shop, tok, M_REG, {'id': rid, 'tr': tr})['translationsRegister']
    if r['userErrors']:
        raise RuntimeError(json.dumps(r['userErrors'], ensure_ascii=False)[:300])


def stapel_schreiben(shop, tok, auftraege, groesse=15):
    """auftraege: Liste von (resourceId, {key: wert}, {key: digest}). Schreibt in Paketen als Aliase EINER Mutation
    (ein HTTP-Aufruf statt einem je Ressource). Wirft RuntimeError mit allen userErrors."""
    fehler = []
    for i in range(0, len(auftraege), groesse):
        paket = auftraege[i:i + groesse]
        kopf = ','.join(f'$id{j}:ID!,$tr{j}:[TranslationInput!]!' for j in range(len(paket)))
        koerper = ' '.join(f'a{j}: translationsRegister(resourceId:$id{j}, translations:$tr{j}){{ userErrors{{ field message code }} }}'
                           for j in range(len(paket)))
        var = {}
        for j, (rid, fw, dig) in enumerate(paket):
            var[f'id{j}'] = rid
            var[f'tr{j}'] = [{'locale': 'fr', 'key': k, 'value': v, 'translatableContentDigest': dig[k]} for k, v in fw.items()]
        d = S.gql(shop, tok, f'mutation({kopf}){{ {koerper} }}', var)
        for j in range(len(paket)):
            if d[f'a{j}']['userErrors']:
                fehler.append((paket[j][0], d[f'a{j}']['userErrors']))
    if fehler:
        raise RuntimeError(json.dumps(fehler, ensure_ascii=False)[:400])


def plan_felder(fr, inh, dig, vorhanden):
    """Welche Produktfelder werden geschrieben, welche entfernt? Geschrieben wird, was vom Quelltext abweicht; ist die Übersetzung
    gleich dem Quelltext (z. B. «Sport & Outdoor»), wird nichts geschrieben, eine ältere Übersetzung dieses Felds aber entfernt
    (sonst bliebe sie stehen, GEMESSEN an drei Produkten mit altem «Sport &amp; Outdoor»)."""
    felder = {k: v for k, v in fr.items() if k in dig and v != inh.get(k)}
    entfernen = [k for k, v in fr.items() if k in dig and v == inh.get(k) and k in vorhanden]
    return felder, entfernen


def hash_de(inhalt, optionen, titel_fest=None):
    return hashlib.sha256(json.dumps([inhalt, optionen, titel_fest], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]


def bearbeite(shop, tok, pid, live, tm, titel_fr, ledger, nutzung, fest=None):
    p, res = produkt_lesen(shop, tok, pid)
    inh, dig = inhalt_von(res[pid])
    optionen = [(o['name'], [v['name'] for v in o['optionValues']]) for o in p['options']]
    titel_fest = ((fest or {}).get(p['handle']) or {}).get('title')
    h = hash_de(inh, optionen, titel_fest)
    vp = os.path.join(VORSCHAU, pid.split('/')[-1] + '.json')
    if os.path.exists(vp) and json.load(open(vp, encoding='utf-8')).get('hash') == h:
        v = json.load(open(vp, encoding='utf-8'))
        fr, fr_opt = v['fr'], [tuple(x) for x in v['optionen']]
        quelle = 'Vorschau'
    else:
        fr, fr_opt, neu = produkt_uebersetzen(inh, optionen, tm, titel_fr, nutzung, titel_fest)
        os.makedirs(VORSCHAU, exist_ok=True)
        json.dump({'hash': h, 'handle': p['handle'], 'de_titel': inh['title'], 'fr': fr, 'optionen': fr_opt},
                  open(vp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        tm.update(neu)
        quelle = 'Gemini'
    if not live:
        return p['handle'], quelle, 'trocken', fr
    felder, entfernen = plan_felder(fr, inh, dig, {t['key'] for t in res[pid]['translations']})
    auftraege = [(pid, felder, dig)]
    geschrieben_opt, geschrieben_wert = [], []
    entfernen_res = [(pid, entfernen)] if entfernen else []      # Übersetzung gleich dem Quelltext, aber eine alte steht noch da
    for o, (n_fr, w_fr) in zip(p['options'], fr_opt):
        _, d_o = inhalt_von(res[o['id']])
        if n_fr != o['name']:
            auftraege.append((o['id'], {'name': n_fr}, d_o))
            geschrieben_opt.append(o['id'])
        elif any(t['key'] == 'name' for t in res[o['id']]['translations']):
            entfernen_res.append((o['id'], ['name']))
        for v, wf in zip(o['optionValues'], w_fr):
            if wf != v['name']:
                _, d_v = inhalt_von(res[v['id']])
                auftraege.append((v['id'], {'name': wf}, d_v))
                geschrieben_wert.append(v['id'])
            elif any(t['key'] == 'name' for t in res[v['id']]['translations']):
                entfernen_res.append((v['id'], ['name']))
    stapel_schreiben(shop, tok, auftraege)
    for rid, keys in entfernen_res:
        r = S.gql(shop, tok, M_DEL, {'id': rid, 'keys': keys})['translationsRemove']
        if r['userErrors']:
            raise RuntimeError(json.dumps(r['userErrors'])[:300])
    # Rücklesen
    p2, res2 = produkt_lesen(shop, tok, pid)
    gl = {t['key']: t for t in res2[pid]['translations']}
    gleich = all(k in gl and gl[k]['value'] == v and not gl[k]['outdated'] for k, v in felder.items())
    gleich = gleich and all(k not in gl for k in entfernen)
    for o, (n_fr, w_fr) in zip(p2['options'], fr_opt):
        if o['id'] in geschrieben_opt:
            t = {x['key']: x for x in res2[o['id']]['translations']}
            gleich = gleich and t.get('name', {}).get('value') == n_fr and not t['name']['outdated']
        for v, wf in zip(o['optionValues'], w_fr):
            if v['id'] in geschrieben_wert:
                t = {x['key']: x for x in res2[v['id']]['translations']}
                gleich = gleich and t.get('name', {}).get('value') == wf and not t['name']['outdated']
    ledger[pid] = {'handle': p['handle'], 'felder': list(felder), 'optionen': geschrieben_opt, 'werte': geschrieben_wert,
                   'zeit': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC'), 'rueckgelesen_gleich': gleich}
    return p['handle'], quelle, 'GLEICH' if gleich else 'ABWEICHUNG', fr


def zuruecknehmen(shop, tok, pid, eintrag):
    if eintrag['felder']:
        r = S.gql(shop, tok, M_DEL, {'id': pid, 'keys': eintrag['felder']})['translationsRemove']
        if r['userErrors']:
            raise RuntimeError(json.dumps(r['userErrors'])[:300])
    for rid in eintrag['optionen'] + eintrag['werte']:
        r = S.gql(shop, tok, M_DEL, {'id': rid, 'keys': ['name']})['translationsRemove']
        if r['userErrors']:
            raise RuntimeError(json.dumps(r['userErrors'])[:300])


def ledger_laden():
    return json.load(open(LEDGER, encoding='utf-8')) if os.path.exists(LEDGER) else {}


def ledger_speichern(ledger):
    os.makedirs(LAUF, exist_ok=True)
    tmp = LEDGER + '.tmp'
    json.dump(ledger, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, LEDGER)


def main():
    if '--selbsttest' in sys.argv:
        import selbsttest
        return selbsttest.laufen()
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    ids_datei = os.environ.get('IDS')
    if not ids_datei:
        print('IDS=<Datei mit Produktliste> setzen')
        return 2
    auswahl = json.load(open(ids_datei, encoding='utf-8'))
    nur = [x for x in os.environ.get('NUR', '').split(',') if x]
    if nur:
        auswahl = [a for a in auswahl if a['handle'] in nur]
    limit = int(os.environ.get('LIMIT', '0') or 0)
    if limit:
        auswahl = auswahl[:limit]
    shop, tok = S.token()
    ledger = ledger_laden()
    exit_code = 0
    if zurueck:
        for a in auswahl:
            e = ledger.get(a['id'])
            if not e:
                print(f"{a['handle']}: nichts zu entfernen")
                continue
            print(f"{a['handle']}: Rücknahme von {e['felder']} + {len(e['optionen'])} Optionen + {len(e['werte'])} Werte")
            if live:
                zuruecknehmen(shop, tok, a['id'], e)
                del ledger[a['id']]
        if live:
            ledger_speichern(ledger)
        else:
            print('TROCKENLAUF: nichts entfernt. Mit LIVE=1.')
        return 0
    tm = tm_laden()
    fest = json.load(open(FEST_DATEI, encoding='utf-8')) if os.path.exists(FEST_DATEI) else {}
    titel_fr = titel_fr_laden(shop, tok)
    print(f'{len(titel_fr)} französische Sammlungstitel geladen, Übersetzungsspeicher {len(tm)} Einträge, {len(auswahl)} Produkte, {"LIVE" if live else "Trockenlauf"}')
    nutzung = {}
    t0 = time.time()
    ok = fehler = 0
    for i, a in enumerate(auswahl, 1):
        try:
            if a['id'] in ledger and live and not os.environ.get('NEU'):
                print(f"[{i}] {a['handle']}: schon im Ledger, übersprungen")
                continue
            h, quelle, status, fr = bearbeite(shop, tok, a['id'], live, tm, titel_fr, ledger, nutzung, fest)
            ok += 1
            if status == 'ABWEICHUNG':
                exit_code = 2
            print(f"[{i}] {h[:48]:48} {quelle:8} {status:9} {fr['title'][:60]}")
            if live and i % 10 == 0:
                ledger_speichern(ledger)
                tm_speichern(tm)
        except Exception as e:  # ein Produkt darf den Lauf nicht beenden
            fehler += 1
            print(f"[{i}] {a['handle']}: FEHLER {str(e)[:200]}")
    tm_speichern(tm)
    if live:
        ledger_speichern(ledger)
    kosten = nutzung.get('ein', 0) / 1e6 * PREIS_EIN + (nutzung.get('aus', 0) + nutzung.get('denk', 0)) / 1e6 * PREIS_AUS
    print(f"fertig: {ok} Produkte, {fehler} Fehler, {time.time() - t0:.0f} s | Tokens ein {nutzung.get('ein', 0)}, aus {nutzung.get('aus', 0)}, "
          f"Denken {nutzung.get('denk', 0)}, Aufrufe {nutzung.get('aufrufe', 0)} | geschätzte Kosten {kosten:.3f} USD "
          f"(Annahme {PREIS_EIN}/{PREIS_AUS} USD je Million Tokens, nicht belegt)")
    if not live:
        print('TROCKENLAUF: nichts nach Shopify geschrieben. Vorschau in', VORSCHAU)
    return 1 if fehler and not ok else exit_code


if __name__ == '__main__':
    sys.exit(main())
