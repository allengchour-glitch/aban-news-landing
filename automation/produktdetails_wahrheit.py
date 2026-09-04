#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Produktdetails: Nicht-Aussagen und falsche Grössen aus dem Faktenblock nehmen
=============================================================================
BEFUND (23.08.2026): Der Block «Produktdetails» (div.ls-feed-details bzw.
div.gmc-details) trägt bei 3'418 aktiven Produkten Angaben, die entweder gar
nichts sagen oder schlicht falsch sind:

  · «Material: hochwertiges Material»   2'573×  — eine Werbefloskel in einem
    Faktenfeld. Sie sagt der Kundin nichts und lässt die Seite maschinell wirken.
  · «Farbe: verschiedene Farben»        1'406×  — dasselbe: keine Angabe.
  · «Grösse: XS, S, M, L, XL»             841×  — und DAS ist die teure Klasse:
    Ein Smart-Anzuchtset mit LED-Pflanzenlampe (15412678328705) hat live GENAU
    EINE Variante («Default Title») und bewirbt trotzdem fünf Kleidergrössen.
    Ebenso ein Silikon-Lätzchen-Set, eine Schreibtischlampe, eine SKY-Fern-
    bedienung und ein Sushi-Teller-Set. Der Baustein wurde beim Import über
    JEDES Produkt gelegt, unabhängig davon, was es ist.

WAS DAS WERKZEUG TUT — und woher es die Wahrheit nimmt:
  Nicht aus einer Vermutung, sondern aus dem Produkt selbst. Für jedes Produkt
  werden LIVE seine Optionen gelesen:
    · Gibt es eine Grössen-Option, werden deren ECHTE Werte eingesetzt.
      Gibt es keine, wird die Grössenzeile ENTFERNT — nicht geraten.
    · Dasselbe für Farbe.
    · «Material: hochwertiges Material» wird ersatzlos entfernt. Ein echtes
      Material stünde nur bei CJ; das Tagesbudget dort ist eine eigene Frage
      (ein leeres Feld ist besser als eine Floskel — dieselbe Regel wie beim
      Metafeld material und bei google_product_category).
  Bleibt kein Punkt übrig, fällt der ganze Block weg statt als leere
  Überschrift stehen zu bleiben.

⚠️ ES WIRD NICHTS ERFUNDEN. Zeilen, die eine echte Aussage tragen («Muster:
   Unifarben», «Schnitt: A-Linie», «Material: Denim»), bleiben unberührt.
⚠️ GEPRÜFT WIRD GEGEN LIVE, nicht gegen den Export. Der Export liefert nur die
   Kandidatenliste; die Beschreibung kann seither von einem anderen Reiniger
   angefasst worden sein (Lehre 15.08.: ein Massen-Schreiber mit alter Basis
   macht fremde Reparaturen rückgängig).

BENUTZUNG:  DRY=1 CAP=20 python3 automation/produktdetails_wahrheit.py
            DRY=0 CAP=400 python3 automation/produktdetails_wahrheit.py
"""
import json, os, re, sys, time, urllib.request

SHOP   = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN  = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
DRY    = os.environ.get('DRY') == '1'
CAP    = int(os.environ.get('CAP', '200'))
QUELLE = os.environ.get('QUELLE', '/tmp/hc_prods.jsonl')
# LISTE (04.09.2026): Arbeitsliste des taeglichen Klassen-Vollscans
# (dropship/_klassen/<klasse>.txt, Spalte 1 = Produkt-ID). Ein Scan, viele Arbeitslisten —
# ein Werkzeug, dessen Quelle ein alter Export ist, meldet Vollzug ueber eine Vergangenheit.
LISTE  = os.environ.get('LISTE', '')
MODUS  = os.environ.get('MODUS', 'floskel')   # floskel | spiegel
LEDGER = ('dropship/_produktdetails_wahrheit.txt' if MODUS == 'floskel'
          else 'dropship/_produktdetails_spiegel.txt')

FLOSKEL_MAT   = 'hochwertiges material'
FLOSKEL_FARBE = 'verschiedene farben'
GENERISCH_GR  = 'xs, s, m, l, xl'

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    for i in range(8):
        try:
            j = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception:
            if i == 7: raise
            time.sleep(2 ** i); continue
        # Drosselung ist eine Warteanweisung, kein Abbruchgrund (Lehre 21.08.)
        if 'errors' in j and any('hrottl' in str(e) for e in j['errors']):
            st = (j.get('extensions', {}).get('cost', {}) or {}).get('throttleStatus', {})
            warte = max(1.0, (st.get('requestedQueryCost', 100) - st.get('currentlyAvailable', 0))
                        / max(1, st.get('restoreRate', 100)))
            time.sleep(min(20, warte)); continue
        return j
    raise RuntimeError('gql erschoepft')

def erledigt():
    # IGNORIERE_LEDGER=1 (02.09.2026): 433 quittierte Produkte trugen die Material-Floskel wieder
    # (Zombie-Klasse 15.08.) — eine alte Quittung darf einen Inhalts-Treffer nicht schuetzen.
    if os.environ.get('IGNORIERE_LEDGER') or not os.path.exists(LEDGER): return set()
    return {z.split('\t')[0] for z in open(LEDGER).read().splitlines() if z.strip()}

# ---------------------------------------------------------------- Textchirurgie
LI = re.compile(r'<li>\s*\n?\s*<strong>([^<]+?):</strong>\s*([^<]*)</li>', re.I)

def optwerte(options, *namen):
    """Echte Optionswerte des Produkts, oder None wenn es die Option nicht gibt."""
    for o in options:
        if o['name'].strip().lower() in namen:
            w = [v['name'].strip() for v in o['optionValues'] if v['name'].strip()]
            if len(w) == 1 and w[0].lower() in ('default title', 'default'):
                return None
            return w
    return None

def liste(werte, max_n=8):
    if not werte: return None
    if len(werte) > max_n:
        return ', '.join(werte[:max_n]) + ' u. a.'
    return ', '.join(werte)

def reparieren(html, options):
    """Gibt (neues_html, [was]) zurueck. Aendert nur die drei bekannten Klassen."""
    was = []
    farben  = optwerte(options, 'farbe', 'color', 'colour')
    groesse = optwerte(options, 'grösse', 'groesse', 'größe', 'size')

    def ersetze(m):
        label, wert = m.group(1).strip(), m.group(2).strip()
        lw, ll = wert.lower(), label.lower()
        if ll.startswith('material') and lw == FLOSKEL_MAT:
            was.append('material-floskel-entfernt'); return ''
        if ll.startswith('farbe') and lw == FLOSKEL_FARBE:
            neu = liste(farben)
            if neu:
                was.append('farbe-aus-varianten')
                return '<li>\n<strong>%s:</strong> %s</li>' % (label, neu)
            was.append('farbe-floskel-entfernt'); return ''
        if ll.startswith(('grösse', 'groesse', 'größe')) and lw == GENERISCH_GR:
            neu = liste(groesse)
            if neu:
                if neu.lower() == wert.lower():
                    return m.group(0)          # stimmt zufaellig — nichts zu tun
                was.append('groesse-aus-varianten')
                return '<li>\n<strong>%s:</strong> %s</li>' % (label, neu)
            was.append('groesse-ohne-deckung-entfernt'); return ''
        return m.group(0)

    def spiegeln(m):
        """Zweiter Modus: Der Textblock muss die ECHTEN Optionswerte nennen.

        Die Kandidaten aus dem Audit («Farbe: Black-38-With velvet, …» ·
        «Beige-2XL-Men's, …» · «JJF106230color-Dad 2XL») sind der rohe
        CJ-Variantenschluessel, wie er beim Import im Text festgeschrieben
        wurde. Live sind die Optionen laengst sauber — beim Strick-Cardigan
        15448591892865 steht in der Option «Dunkelgrau, Schwarz, Weiss …»,
        im Text «Dark Gray-XXS, Dunkelgrau, Black-XXS, …».
        Der Text ist also nicht falsch geraten, sondern STEHENGEBLIEBEN.
        Deshalb braucht es keine Wortliste: Die Option ist die Wahrheit,
        der Text hat sie zu spiegeln. Wo es die Option nicht gibt, wird
        NICHTS angefasst — «Farbe: Schwarz» bei einem einfarbigen Artikel
        ohne Farbwahl ist eine richtige Aussage."""
        label, wert = m.group(1).strip(), m.group(2).strip()
        ll = label.lower()
        if ll.startswith(('farbe', 'color')):
            echt = liste(farben)
        elif ll.startswith(('grösse', 'groesse', 'größe', 'size')):
            echt = liste(groesse)
        else:
            return m.group(0)
        if not echt:
            return m.group(0)
        def norm(x):
            return re.sub(r'[\s,]+', ' ', x.strip().lower())
        if norm(echt) == norm(wert):
            return m.group(0)
        was.append(('farbe' if ll.startswith(('farbe', 'color')) else 'groesse') + '-gespiegelt')
        return '<li>\n<strong>%s:</strong> %s</li>' % (label, echt)

    neu = LI.sub(spiegeln if MODUS == 'spiegel' else ersetze, html)
    if not was:
        return html, []
    # Leergeraeumte Bloecke ganz entfernen statt als nackte Ueberschrift stehen lassen
    neu = re.sub(r'<div class="(?:ls-feed-details|gmc-details|ls-produktdetails)">\s*'
                 r'<h[34]>[^<]*</h[34]>\s*<ul>\s*</ul>\s*</div>', '', neu, flags=re.I)
    neu = re.sub(r'\n{3,}', '\n\n', neu)
    return neu, was

# ---------------------------------------------------------------- Kandidaten
def kandidaten():
    hat = erledigt(); out = []
    if LISTE:
        # ⚠️ Die Arbeitsliste stammt aus einer LIVE-Messung am Objekt — dann darf das Ledger
        # sie NICHT filtern. Gemessen 04.09.2026: alle 124 Floskel-Faelle standen bereits als
        # «material-floskel-entfernt» quittiert und trugen die Floskel trotzdem live, weil sie
        # im ZWEITEN (doppelten) Produktdetails-Block steht, den der damalige Lauf nicht sah.
        # Eine Quittung sagt, was einmal geschrieben wurde — nicht, was jetzt gilt.
        # Geschrieben wird ohnehin nur, wenn der LIVE-Text den Befund noch traegt.
        for ln in open(LISTE):
            pid = ln.split('\t')[0].strip().rsplit('/', 1)[-1]
            if pid.isdigit():
                out.append(pid)
        return out
    for ln in open(QUELLE):
        try: o = json.loads(ln)
        except Exception: continue
        d = o.get('d') or ''
        if str(o['id']) in hat: continue
        if MODUS == 'spiegel':
            if re.search(r'(?:Farbe|Grösse):\s*\S', d):
                out.append(str(o['id']))
        elif (FLOSKEL_MAT in d.lower() or FLOSKEL_FARBE in d.lower()
                or re.search(r'Grösse:\s*XS, S, M, L, XL(?![,0-9])', d)):
            out.append(str(o['id']))
    return out

Q = '''query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product {
  id title status descriptionHtml options{name optionValues{name}} } } }'''
M = '''mutation($id:ID!,$d:String!){ productUpdate(input:{id:$id,descriptionHtml:$d}){
  userErrors{field message} } }'''

def main():
    ids = kandidaten()
    print(f'Kandidaten aus {LISTE or QUELLE}: {len(ids)} (CAP={CAP}, DRY={DRY})')
    ids = ids[:CAP]
    geaendert = 0; unveraendert = 0
    fh = None if DRY else open(LEDGER, 'a')
    for i in range(0, len(ids), 25):
        block = ['gid://shopify/Product/%s' % x for x in ids[i:i+25]]
        j = gql(Q, {'ids': block})
        for p in (j.get('data', {}).get('nodes') or []):
            if not p: continue
            pid = p['id'].split('/')[-1]
            if p.get('status') != 'ACTIVE':
                if fh: fh.write('%s\tnicht-aktiv\t%s\n' % (pid, p['title'][:60]))
                unveraendert += 1; continue
            neu, was = reparieren(p['descriptionHtml'] or '', p['options'])
            if not was:
                if fh: fh.write('%s\tlive-schon-sauber\t%s\n' % (pid, p['title'][:60]))
                unveraendert += 1; continue
            print('  %s %-58s %s' % (pid, p['title'][:58], ','.join(was)))
            if DRY:
                geaendert += 1; continue
            r = gql(M, {'id': p['id'], 'd': neu})
            err = (r.get('data', {}).get('productUpdate', {}) or {}).get('userErrors') or []
            if err:
                print('    ⛔', err); continue
            fh.write('%s\t%s\t%s\n' % (pid, ','.join(sorted(set(was))), p['title'][:60]))
            fh.flush(); geaendert += 1
            time.sleep(0.35)
    if fh: fh.close()
    print(f'FERTIG: {geaendert} geaendert, {unveraendert} ohne Befund.')

if __name__ == '__main__':
    main()
