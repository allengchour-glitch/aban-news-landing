#!/usr/bin/env python3
"""LuxeStyle — metricool_freigabe.py

Prüft Entwürfe im Metricool-Planer und plant die geprüften ein.
Auftrag des Besitzers am 09.11.2026: «freigeben, einfach automation machen ohne zu fragen».

Ohne LIVE=1 ist es ein Trockenlauf (nichts wird geändert). Bei LIVE=1 wird jeder Entwurf, der ALLE Tore
besteht, mit autoPublish eingeplant; alles andere bleibt Entwurf und wird gemeldet (Telegram, Zusammenfassung).
Es wird nie etwas gelöscht und nie ein Text umgeschrieben, ausser: Instagram-Beiträge auf höchstens fünf
Hashtags kürzen (letzte zuerst) und beim TikTok-Beitrag die Kennzeichnung «Eigenwerbung» setzen.

Tore je Entwurf (jedes Nein = Entwurf bleibt):
  1. Termin liegt mindestens 2 Stunden in der Zukunft (vergangene Termine werden NICHT neu gesetzt).
  2. Netzwerke und Pflichtfelder passen (Medien, YouTube-Titel höchstens 100 Zeichen, madeForKids gesetzt).
  3. Text enthält nichts Verbotenes (Weihnachts-Bestellschluss, Fasnacht, Halloween, Heil-/Garantieversprechen).
  4. Produkt erkannt: ein Produkt der Wegweiser-Sammlung `aus-tiktok-und-instagram`, ACTIVE, lieferbar.
  5. Jeder genannte Preis stimmt mit dem Shop überein («ab CHF» = niedrigster Preis, «bis/unter CHF N» = Obergrenze).
  6. Medien erreichbar (HTTP 200/206, Bild oder Video).
  7. Mindestens 3 Stunden Abstand zu jedem anderen Beitrag desselben Netzwerks (Stories und Pinterest ausgenommen);
     bei Verstoss wird am selben Tag zwischen 09:00 und 21:00 nach dem nächsten freien Platz gesucht.
  8. Der Entwurf kommt nur einmal im Planer vor (gleiche uuid mehrfach = Kopie, wird nie angefasst).

Nach jedem Update wird der Planer frisch gelesen: genau ein Beitrag mit der uuid, geplant, Datum/Text/Medien wie erwartet.
Bei der ersten Abweichung wird gestoppt (ein Update kann trotz Fehlermeldung eine Kopie anlegen).

Aufruf:
  python3 automation/metricool_freigabe.py                  Trockenlauf
  LIVE=1 python3 automation/metricool_freigabe.py           einplanen
  python3 automation/metricool_freigabe.py --status         nur Fehler/Hänger der letzten 3 Tage melden
  --planer-datei X.json --produkte-datei Y.json             offline (Vorschau/Test), nie live

ENV: METRICOOL_USER_TOKEN (Pflicht), METRICOOL_USER_ID (4801419), METRICOOL_BLOG_ID (6227837),
     SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
     MAX_JE_LAUF (12), HORIZONT_TAGE (10).
"""
import copy
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None

TZ = 'Europe/Zurich'
BASE = 'https://app.metricool.com/api'
WEGWEISER = 'aus-tiktok-und-instagram'
MIN_ABSTAND_H = 3
MIN_VORLAUF_H = 2
SPIELRAUM_H = (1, -1, 2, -2, 3, -3, 4, 5, 6)  # Verschiebungen in Stunden am selben Tag, in dieser Reihenfolge (später zuerst)
TAGESFENSTER = (9, 21)                        # früheste/späteste Uhrzeit beim Verschieben
GENERISCH = {7.0, 14.9, 45.0, 50.0}           # Versand CH, Versand LI, Gratis-Schwelle (Text 50, Regel 45)
NETZE_OK = {'facebook', 'instagram', 'tiktok', 'youtube', 'threads', 'pinterest'}
NETZ_SCHLUESSEL = [('facebook', 'facebookData'), ('instagram', 'instagramData'), ('tiktok', 'tiktokData'),
                   ('youtube', 'youtubeData'), ('threads', 'threadsData'), ('pinterest', 'pinterestData')]
STOP = {'mit', 'fur', 'aus', 'und', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einer', 'in', 'im', 'von', 'zum',
        'zur', 'sie', 'ihn', 'set', 'teilig', 'pro', 'stuck', 'pcs', 'auf', 'bei', 'nach', 'ohne', 'cm', 'nr'}
VERBOTEN = [
    (r'weihnacht\w*[^.\n]{0,60}\b(bestell\w*|ankomm\w*|geliefert|rechtzeitig)', 'Weihnachts-Bestellschluss/Lieferversprechen'),
    (r'\b(bestell\w*)[^.\n]{0,60}weihnacht', 'Weihnachts-Bestellschluss/Lieferversprechen'),
    (r'bestellschluss|rechtzeitig (zu|vor|bis)', 'Bestellschluss'),
    (r'fasnacht|fasching|karneval', 'Fasnacht (kein Social für Fasnacht)'),
    (r'halloween', 'Halloween (Saison vorbei)'),
    (r'garantiert|\bheilt\b|heilung|schlafstörung|gegen schmerzen', 'Garantie-/Heilversprechen'),
]


# ---------------------------------------------------------------- reine Funktionen (getestet)
def norm(s):
    s = unicodedata.normalize('NFKD', str(s).lower())
    s = ''.join(c for c in s if not unicodedata.combining(c)).replace('ß', 'ss')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def tokens(s):
    seen, out = set(), []
    for t in norm(s).split():
        if len(t) >= 3 and t not in STOP and t not in seen:
            seen.add(t)
            out.append(t)
    return out


def handle_ohne_id(handle):
    teile = handle.split('-')
    if len(teile) > 1 and re.fullmatch(r'[a-z]*\d[a-z0-9]*', teile[-1]) and len(teile[-1]) >= 5:
        teile = teile[:-1]
    return ' '.join(teile)


def hashtags(text):
    return re.findall(r'#\w+', text)


def kuerze_hashtags(text, maximal=5):
    """Entfernt überzählige Hashtags von hinten, aber nur wenn sie am Textende stehen. (neuer Text, entfernte)"""
    tags = hashtags(text)
    entfernt = []
    while len(tags) > maximal:
        t = tags[-1]
        if not text.rstrip().endswith(t):
            return text, entfernt      # steht nicht am Ende: nicht anfassen
        text = text.rstrip()[: -len(t)].rstrip()
        entfernt.append(t)
        tags = hashtags(text)
    return text, entfernt


def preise(text):
    """(alle Beträge nach CHF, Obergrenzen «bis/unter CHF N», «ab»-Beträge)"""
    alle, kappen, abs_ = [], [], []
    for m in re.finditer(r'(\b(?:bis|unter|ab)\s+)?CHF\s*(\d+(?:[.,]\d+)?)', text):
        v = float(m.group(2).replace(',', '.'))
        wort = (m.group(1) or '').strip()
        if wort in ('bis', 'unter'):
            kappen.append((wort, v))
        elif wort == 'ab':
            abs_.append(v)
            alle.append(v)
        else:
            alle.append(v)
    return alle, kappen, abs_


def token_trifft(t, zt):
    if t in zt:
        return True
    return len(t) >= 6 and any((t in w or w in t) for w in zt if len(w) >= 6)


def finde_produkte(text, produkte):
    zt = set(norm(text).split())
    treffer = []
    for p in produkte:
        for quelle in (p['title'], handle_ohne_id(p['handle'])):
            t = tokens(quelle)
            if not t:
                continue
            noetig = 1 if len(t) == 1 else 2
            if sum(1 for x in t if token_trifft(x, zt)) >= noetig:
                treffer.append(p)
                break
    return treffer


def produkt_preise(p):
    return sorted({round(float(v['price']), 2) for v in p.get('variants', []) if v.get('price') is not None})


def pruefe_produkte(text, produkte):
    """Tore 4 und 5. Gibt (Probleme, erkannte Produkte) zurück."""
    treffer = finde_produkte(text, produkte)
    if not treffer:
        return ['Produkt nicht erkannt (oder nicht in der Wegweiser-Sammlung)'], []
    probleme = []
    for p in treffer:
        if p.get('status') != 'ACTIVE':
            probleme.append(f"Produkt nicht ACTIVE: {p['handle']}")
        if p.get('tracksInventory') and (p.get('totalInventory') or 0) <= 0:
            probleme.append(f"Produkt ausverkauft: {p['handle']}")
        elif not any(v.get('availableForSale') for v in p.get('variants', [])):
            probleme.append(f"Produkt nicht lieferbar: {p['handle']}")
    alle, kappen, abs_ = preise(text)
    erlaubt = set()
    for p in (treffer if len(treffer) == 1 else produkte):
        erlaubt.update(produkt_preise(p))
    for v in alle:
        if round(v, 2) in GENERISCH or any(abs(v - g) < 0.005 for g in GENERISCH):
            continue
        if not any(abs(v - e) < 0.005 for e in erlaubt):
            probleme.append(f'Preis CHF {v:g} stimmt nicht mit dem Shop überein')
    for v in abs_:
        if any(abs(v - g) < 0.005 for g in GENERISCH):
            continue
        niedrigste = [min(produkt_preise(p)) for p in treffer if produkt_preise(p)]
        if len(treffer) == 1 and niedrigste and abs(v - niedrigste[0]) > 0.005:
            probleme.append(f'«ab CHF {v:g}» ist nicht der niedrigste Preis ({niedrigste[0]:g})')
    for wort, v in kappen:
        for p in treffer:
            pr = produkt_preise(p)
            if pr and ((wort == 'bis' and pr[0] > v) or (wort == 'unter' and pr[0] >= v)):
                probleme.append(f"«{wort} CHF {v:g}» wird von {p['handle']} nicht eingehalten")
    return probleme, treffer


def pruefe_text(text, netze):
    probleme = []
    for muster, name in VERBOTEN:
        if re.search(muster, text, re.I):
            probleme.append('Text: ' + name)
    return sorted(set(probleme))


def netz_schluessel(post, netz):
    """Für den Abstand: Stories zählen getrennt (und werden nicht geprüft), Pinterest ebenso."""
    if netz == 'facebook' and (post.get('facebookData') or {}).get('type') == 'STORY':
        return 'facebook-story'
    if netz == 'instagram' and (post.get('instagramData') or {}).get('type') == 'STORY':
        return 'instagram-story'
    return netz


def stunden(a, b):
    return abs((a - b).total_seconds()) / 3600


def frei_fuer(netz, zeit, andere):
    """andere = Liste (netz, datetime) der übrigen Beiträge. Wahr, wenn überall ≥ MIN_ABSTAND_H Abstand."""
    if netz.endswith('story') or netz == 'pinterest':
        return True
    return all(stunden(zeit, z) >= MIN_ABSTAND_H - 1e-9 for n, z in andere if n == netz)


def finde_zeit(netze, zeit, andere):
    """Behält die Zeit, wenn sie frei ist, sonst die nächste freie am selben Tag. None = kein Platz."""
    def ok(z):
        return all(frei_fuer(n, z, andere) for n in netze)
    if ok(zeit):
        return zeit
    for h in SPIELRAUM_H:
        z = zeit + timedelta(hours=h)
        stunde = z.hour + z.minute / 60
        if z.date() == zeit.date() and TAGESFENSTER[0] <= stunde <= TAGESFENSTER[1] and ok(z):
            return z
    return None


def ist_video(url):
    return bool(re.search(r'\.(mp4|mov|m4v|webm)$', str(url).split('?')[0].lower()))


def pflichtfelder(post):
    probleme = []
    netze = [p['network'] for p in post['providers']]
    if not netze or any(n not in NETZE_OK for n in netze):
        probleme.append('Netzwerk nicht erlaubt: ' + ','.join(netze))
    if not post.get('media'):
        probleme.append('keine Medien')
    if 'youtube' in netze:
        yd = post.get('youtubeData') or {}
        if not yd.get('title') or len(yd['title']) > 100:
            probleme.append('YouTube-Titel fehlt oder über 100 Zeichen')
        if yd.get('madeForKids') is None:
            probleme.append('YouTube madeForKids nicht gesetzt')
    medien = post.get('media') or []
    braucht_video = 'youtube' in netze or (post.get('instagramData') or {}).get('type') == 'REEL' or (post.get('facebookData') or {}).get('type') == 'REEL'
    if braucht_video and medien and not all(ist_video(u) for u in medien):
        probleme.append('YouTube/Reel braucht ein Video, das Medium sieht nicht danach aus')
    if 'pinterest' in netze:
        pd = post.get('pinterestData') or {}
        if not pd.get('boardId') or not pd.get('pinTitle'):
            probleme.append('Pinterest: Board oder Pin-Titel fehlt')
    if 'threads' in netze and not post.get('threadsData'):
        probleme.append('threadsData fehlt')
    if 'facebook' in netze and (post.get('facebookData') or {}).get('type') == 'REEL' and not post['facebookData'].get('title'):
        probleme.append('Facebook-Reel ohne Titel')
    nur_story = bool(netze) and all(netz_schluessel(post, n).endswith('story') for n in netze)
    if not (post.get('text') or '').strip() and not nur_story:
        probleme.append('kein Text')
    return probleme


def baue_put(post, ziel, text):
    netze = [p['network'] for p in post['providers']]
    b = {
        'text': text,
        'firstCommentText': post.get('firstCommentText', ''),
        'providers': [{'network': n} for n in netze],
        'media': list(post.get('media', [])),
        'mediaAltText': list(post.get('mediaAltText', [])),
        'autoPublish': True,
        'draft': False,
        'shortener': bool(post.get('shortener', False)),
        'hasNotReadNotes': bool(post.get('hasNotReadNotes', False)),
        'publicationDate': {'dateTime': ziel.strftime('%Y-%m-%dT%H:%M:%S'), 'timezone': TZ},
        'descendants': [],
        'smartLinkData': {'ids': []},
    }
    for netz, schluessel in NETZ_SCHLUESSEL:
        if netz in netze and post.get(schluessel) is not None:
            b[schluessel] = copy.deepcopy(post[schluessel])
    if 'instagram' in netze:
        b['instagramData']['autoPublish'] = True
    if 'tiktok' in netze:
        b['tiktokData']['commercialContentOwnBrand'] = True      # TikTok verlangt die Kennzeichnung für Werbung in eigener Sache
    return b


def zeit_von(post):
    return datetime.fromisoformat(post['publicationDate']['dateTime'])


def plane_lauf(planer, produkte, jetzt, horizont_tage=10, max_je_lauf=12, medien_ok=lambda url: True):
    """Reine Planung. Gibt Liste von Entscheidungen zurück:
    {'id','uuid','netze','alt','neu','text','text_neu','fixes','probleme','ok'}."""
    uuid_zaehler = {}
    for p in planer:
        uuid_zaehler[p['uuid']] = uuid_zaehler.get(p['uuid'], 0) + 1
    andere = []          # (netz, zeit) aller geplanten Beiträge ab jetzt (kein Entwurf)
    for p in planer:
        if p.get('draft'):
            continue
        z = zeit_von(p)
        if z < jetzt - timedelta(hours=MIN_ABSTAND_H):
            continue
        for q in p['providers']:
            andere.append((netz_schluessel(p, q['network']), z))
    kandidaten = [p for p in planer if p.get('draft') and not p.get('autoPublish')
                  and jetzt - timedelta(days=1) <= zeit_von(p) <= jetzt + timedelta(days=horizont_tage)]
    kandidaten.sort(key=lambda p: (zeit_von(p), p['id']))
    ergebnis, freigegeben = [], 0
    vorlaeufig = {p['id']: [(netz_schluessel(p, q['network']), zeit_von(p)) for q in p['providers']]
                  for p in kandidaten if zeit_von(p) >= jetzt + timedelta(hours=MIN_VORLAUF_H)}
    for p in kandidaten:
        vorlaeufig.pop(p['id'], None)
        netze = [q['network'] for q in p['providers']]
        netze_s = [netz_schluessel(p, n) for n in netze]
        e = {'id': p['id'], 'uuid': p['uuid'], 'netze': netze, 'alt': zeit_von(p), 'neu': None, 'text': p['text'],
             'text_neu': p['text'], 'fixes': [], 'probleme': [], 'ok': False, 'produkte': []}
        ergebnis.append(e)
        if uuid_zaehler[p['uuid']] > 1:
            e['probleme'].append('uuid kommt mehrfach vor (Kopie), nicht angefasst')
            continue
        if e['alt'] < jetzt + timedelta(hours=MIN_VORLAUF_H):
            e['probleme'].append('Termin liegt in der Vergangenheit oder weniger als 2 Stunden voraus (wird nicht neu gesetzt)')
        e['probleme'] += pflichtfelder(p)
        text = p['text']
        if 'instagram' in netze:
            text, entfernt = kuerze_hashtags(text, 5)
            if entfernt:
                e['fixes'].append('Hashtags gekürzt: ' + ' '.join(reversed(entfernt)))
            if len(hashtags(text)) > 5:
                e['probleme'].append('mehr als 5 Hashtags und nicht am Textende')
        e['text_neu'] = text
        e['probleme'] += pruefe_text(text, netze)
        pp, treffer = pruefe_produkte(text, produkte)
        e['probleme'] += pp
        e['produkte'] = [t['handle'] for t in treffer]
        for url in p.get('media', []):
            if not medien_ok(url):
                e['probleme'].append('Medium nicht erreichbar: ' + url[-40:])
        if 'tiktok' in netze and not (p.get('tiktokData') or {}).get('commercialContentOwnBrand'):
            e['fixes'].append('TikTok: Eigenwerbung gesetzt')
        if e['probleme']:
            continue
        nachbarn = [x for v in vorlaeufig.values() for x in v]
        zeit = finde_zeit(netze_s, e['alt'], andere + nachbarn)
        if zeit is None:
            zeit = finde_zeit(netze_s, e['alt'], andere)          # ohne Rücksicht auf die noch offenen Nachbarn
        if zeit is None:
            e['probleme'].append('kein Platz mit 3 Stunden Abstand am selben Tag')
            continue
        if zeit != e['alt']:
            e['fixes'].append(f"Zeit {e['alt']:%H:%M} → {zeit:%H:%M} (Abstand 3 Stunden)")
        if freigegeben >= max_je_lauf:
            e['probleme'].append(f'Obergrenze {max_je_lauf} Freigaben je Lauf erreicht (kommt beim nächsten Lauf)')
            continue
        e['neu'] = zeit
        e['ok'] = True
        freigegeben += 1
        for n in netze_s:
            andere.append((n, zeit))
    return ergebnis


def pruefe_nachher(planer, vorher_id, erwartet):
    """Nach einem Update: genau ein Beitrag mit der uuid, geplant, Datum/Text/Medien/Netze wie erwartet."""
    mit = [p for p in planer if p['uuid'] == erwartet['uuid']]
    fehler = []
    if len(mit) != 1:
        fehler.append(f'{len(mit)} Beiträge mit uuid (ids {[p["id"] for p in mit]})')
    if any(p['id'] == vorher_id for p in planer):
        fehler.append('alte id noch vorhanden')
    if mit:
        p = mit[0]
        if p.get('draft') or not p.get('autoPublish'):
            fehler.append('noch Entwurf oder autoPublish aus')
        if zeit_von(p) != erwartet['neu']:
            fehler.append('Datum ' + p['publicationDate']['dateTime'])
        if p['text'] != erwartet['text_neu']:
            fehler.append('Text weicht ab')
        if p.get('media') != erwartet['media']:
            fehler.append('Medien weichen ab')
        if sorted(q['network'] for q in p['providers']) != sorted(erwartet['netze']):
            fehler.append('Netzwerke weichen ab')
        if any(q['status'] != 'PENDING' for q in p['providers']):
            fehler.append('Status ' + str([q['status'] for q in p['providers']]))
    return fehler


def status_befunde(planer, jetzt, rueckblick_h=72):
    """Beiträge der letzten Tage, die nicht veröffentlicht wurden (Fehler oder hängend)."""
    out = []
    for p in planer:
        if p.get('draft'):
            continue
        z = zeit_von(p)
        if not (jetzt - timedelta(hours=rueckblick_h) <= z <= jetzt - timedelta(minutes=45)):
            continue
        for q in p['providers']:
            s = (q.get('status') or '').upper()
            if s not in ('PUBLISHED', 'PUBLISHING'):
                out.append({'id': p['id'], 'netz': q['network'], 'status': q.get('status'), 'detail': q.get('detailedStatus'),
                            'zeit': z, 'text': p['text'][:40].replace('\n', ' ')})
    return out


# ---------------------------------------------------------------- Ein-/Ausgabe
def jetzt_lokal():
    if ZoneInfo is None:
        return datetime.utcnow() + timedelta(hours=1)
    return datetime.now(ZoneInfo(TZ)).replace(tzinfo=None)


class Metricool:
    def __init__(self, token, user, blog):
        self.token, self.user, self.blog = token, user, blog

    def call(self, methode, pfad, params=None, body=None, timeout=120, accept='application/json'):
        q = {'userId': self.user, 'blogId': self.blog}
        q.update(params or {})
        daten = None if body is None else json.dumps(body).encode('utf-8')
        req = urllib.request.Request(BASE + pfad + '?' + urllib.parse.urlencode(q), data=daten, method=methode,
                                     headers={'X-Mc-Auth': self.token, 'Content-Type': 'application/json', 'Accept': accept})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode('utf-8', 'replace')[:400]
        except Exception as e:  # Netz, Zeitlimit: Antwort unbekannt
            return -1, type(e).__name__

    def planer(self, von, bis):
        s, t = self.call('GET', '/v2/scheduler/posts', {'start': von.strftime('%Y-%m-%dT%H:%M:%S'),
                                                        'end': bis.strftime('%Y-%m-%dT%H:%M:%S'), 'timezone': TZ})
        if s != 200:
            raise RuntimeError(f'Metricool-Planer nicht lesbar (HTTP {s})')
        return json.loads(t)['data']


def shopify_token(shop, cid, secret):
    m = re.match(r'^shpss_[0-9a-f]{32}', (secret or '').strip())
    secret = m.group(0) if m else (secret or '').strip()
    req = urllib.request.Request(f'https://{shop}/admin/oauth/access_token', method='POST',
                                 data=json.dumps({'client_id': cid, 'client_secret': secret, 'grant_type': 'client_credentials'}).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['access_token']


def wegweiser_produkte(shop, token):
    q = '''query($h:String!){ collectionByHandle(handle:$h){ products(first:100){ nodes{ title handle status tracksInventory totalInventory
           variants(first:100){ nodes{ price availableForSale } } } } } }'''
    req = urllib.request.Request(f'https://{shop}/admin/api/2025-01/graphql.json', method='POST',
                                 data=json.dumps({'query': q, 'variables': {'h': WEGWEISER}}).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': token})
    with urllib.request.urlopen(req, timeout=60) as r:
        j = json.loads(r.read())
    c = (j.get('data') or {}).get('collectionByHandle')
    if not c:
        raise RuntimeError('Wegweiser-Sammlung nicht lesbar')
    out = []
    for n in c['products']['nodes']:
        n['variants'] = n['variants']['nodes']
        out.append(n)
    return out


def medium_erreichbar(url):
    req = urllib.request.Request(url, headers={'Range': 'bytes=0-1023', 'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            ct = (r.headers.get('content-type') or '').lower()
            return r.status in (200, 206) and (ct.startswith('video/') or ct.startswith('image/') or 'octet-stream' in ct)
    except Exception:
        return False


def telegram(text, token, chat):
    if not token or not chat:
        return None
    req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage', method='POST',
                                 data=json.dumps({'chat_id': chat, 'text': text, 'disable_web_page_preview': True}).encode(),
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except Exception:
        return False


def melde_liste(gehalten, jetzt, stunden=48):
    """Welche gehaltenen Entwürfe per Telegram genannt werden: nur Termine in den nächsten 48 Stunden (oder gerade vorbei), keine Kopien.
    So kommt jeder Entwurf höchstens zwei- bis dreimal vor, eine bekannte Kopie nie (sie lässt sich nur von Hand im Planer löschen)."""
    return [e for e in gehalten
            if not any('Kopie' in p for p in e['probleme']) and e['alt'] - jetzt <= timedelta(hours=stunden)]


def zeile(e):
    return f"{e['alt']:%d.%m. %H:%M} {'+'.join(e['netze'])} (id {e['id']})"


def main(argv):
    live = os.environ.get('LIVE') == '1'
    status_modus = '--status' in argv
    arg = lambda name: argv[argv.index(name) + 1] if name in argv else None
    planer_datei, produkte_datei = arg('--planer-datei'), arg('--produkte-datei')
    if planer_datei or produkte_datei:
        live = False
    horizont = int(os.environ.get('HORIZONT_TAGE') or 10)
    max_lauf = int(os.environ.get('MAX_JE_LAUF') or 12)
    token = os.environ.get('METRICOOL_USER_TOKEN', '')
    mc = Metricool(token, os.environ.get('METRICOOL_USER_ID') or '4801419', os.environ.get('METRICOOL_BLOG_ID') or '6227837')
    jetzt = jetzt_lokal()
    tg = (os.environ.get('TELEGRAM_BOT_TOKEN', '').strip(), os.environ.get('TELEGRAM_CHAT_ID', '').strip())
    zusammen = []

    if planer_datei:
        planer = json.load(open(planer_datei, encoding='utf-8'))
    else:
        if not token:
            print('METRICOOL_USER_TOKEN fehlt: nichts getan.')
            return 0
        planer = mc.planer(jetzt - timedelta(days=4), jetzt + timedelta(days=horizont + 1))

    if status_modus:
        befunde = status_befunde(planer, jetzt)
        for b in befunde:
            print(f"BEFUND {b['zeit']:%d.%m. %H:%M} {b['netz']} Status {b['status']}/{b['detail']} id {b['id']} {b['text']}")
        if befunde and live:
            telegram('⚠️ Metricool: ' + str(len(befunde)) + ' Beitrag/Beiträge nicht veröffentlicht:\n' + '\n'.join(
                f"{b['zeit']:%d.%m. %H:%M} {b['netz']}: {b['status']} ({b['text']})" for b in befunde[:8]), *tg)
        print(f'Status: {len(befunde)} Befund(e)')
        return 0

    if produkte_datei:
        produkte = json.load(open(produkte_datei, encoding='utf-8'))
    else:
        shop = os.environ.get('SHOPIFY_SHOP') or 'au3j0y-hq.myshopify.com'
        produkte = wegweiser_produkte(shop, shopify_token(shop, os.environ.get('SHOPIFY_CLIENT_ID', ''), os.environ.get('SHOPIFY_CLIENT_SECRET', '')))
    print(f'Planer: {len(planer)} Beiträge | Wegweiser-Produkte: {len(produkte)} | {"LIVE" if live else "Trockenlauf"} | jetzt {jetzt:%d.%m. %H:%M}')

    entscheidungen = plane_lauf(planer, produkte, jetzt, horizont, max_lauf, medium_erreichbar if not planer_datei else (lambda u: True))
    ok = [e for e in entscheidungen if e['ok']]
    gehalten = [e for e in entscheidungen if not e['ok']]
    for e in ok:
        print(f"FREI   {zeile(e)} -> {e['neu']:%d.%m. %H:%M}" + (' | ' + '; '.join(e['fixes']) if e['fixes'] else '') + f" | {','.join(e['produkte'])}")
    for e in gehalten:
        print(f"HALTEN {zeile(e)} | " + '; '.join(e['probleme']))
    print(f'Entwürfe geprüft: {len(entscheidungen)} | frei: {len(ok)} | gehalten: {len(gehalten)}')

    fehler_lauf = False
    eingeplant = 0
    if live and ok:
        for e in ok:
            frisch = mc.planer(jetzt - timedelta(days=4), jetzt + timedelta(days=horizont + 1))
            cur = [p for p in frisch if p['id'] == e['id']]
            if len(cur) != 1 or cur[0]['uuid'] != e['uuid'] or not cur[0].get('draft') or cur[0]['text'] != e['text']:
                print(f"ÜBERSPRUNGEN {e['id']}: Beitrag hat sich seit der Prüfung verändert")
                e['probleme'].append('verändert seit der Prüfung')
                continue
            p = cur[0]
            body = baue_put(p, e['neu'], e['text_neu'])
            s, t = mc.call('PUT', f"/v2/scheduler/posts/{e['id']}", None, body, timeout=240)
            nach = mc.planer(jetzt - timedelta(days=4), jetzt + timedelta(days=horizont + 1))
            f = pruefe_nachher(nach, e['id'], {'uuid': e['uuid'], 'neu': e['neu'], 'text_neu': e['text_neu'], 'media': p['media'], 'netze': e['netze']})
            print(f"PUT {e['id']} HTTP {s} Kontrolle: {'OK' if not f else f}")
            if s != 200 or f:
                print('STOPP: Abweichung, bitte von Hand im Planer prüfen (Kopien möglich).')
                zusammen.append(f"🛑 Metricool-Freigabe gestoppt bei id {e['id']}: HTTP {s} {f or ''}. Bitte im Planer auf Kopien prüfen.")
                fehler_lauf = True
                break
            eingeplant += 1
            time.sleep(2)

    if live:
        if eingeplant:
            zusammen.append(f'✅ Metricool: {eingeplant} Entwurf/Entwürfe geprüft und eingeplant:\n' + '\n'.join(
                f"• {e['neu']:%d.%m. %H:%M} {'+'.join(e['netze'])}: {e['text'][:42].replace(chr(10), ' ')}" for e in ok[:eingeplant]))
        melde = melde_liste(gehalten, jetzt)
        if melde:
            zusammen.append(f'⏸️ {len(melde)} Entwurf/Entwürfe bleiben Entwurf:\n' + '\n'.join(
                f"• {zeile(e)}: {e['probleme'][0]}" for e in melde[:6]))
        if zusammen:
            telegram('\n\n'.join(zusammen), *tg)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write(f'### Metricool-Freigabe ({"LIVE" if live else "Trockenlauf"})\n\nfrei {len(ok)} · eingeplant {eingeplant} · gehalten {len(gehalten)}\n\n')
            for e in ok:
                f.write(f"- FREI {zeile(e)} -> {e['neu']:%d.%m. %H:%M} {'; '.join(e['fixes'])}\n")
            for e in gehalten:
                f.write(f"- HALTEN {zeile(e)}: {'; '.join(e['probleme'])}\n")
    return 1 if fehler_lauf else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
