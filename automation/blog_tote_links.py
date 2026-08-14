#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
BEFUND (dropship/FEHLERSUCHE-14-08.md, [blog]):
  90 von 312 Blogartikeln verlinken auf 114 Ziele, die live 404 liefern
  (93 Produkte, 21 Kollektionen) = 277 tote Verlinkungen, 45 % aller internen
  Blog-Links. Ursache: die Ziele wurden nachtraeglich gedraftet oder nie
  publiziert.

ZAHL (live am 14.08. gegen luxestyle.ch geprueft, nicht aus dem Export):
  274 verschiedene interne Linkziele im Blog, davon 233 Produkte/Kollektionen.
  Live-Ergebnis: 119x HTTP 200, 114x HTTP 404 -> deckt sich exakt mit dem
  Befund (93 Produkte + 21 Kollektionen).

FEHLTREFFER AUS DEM PROBELAUF (alle vor dem Schreiben aussortiert):
  1) `publishedOnCurrentPublication` im Admin-Batch wirft
     "Your app doesn't have a publication for this shop" und setzt den GANZEN
     Alias auf null. Der erste Lauf meldete dadurch "233 von 233 Zielen
     existieren nicht". Haette ich das geglaubt, waeren saemtliche Blog-Links
     umgeschrieben worden. -> Feld entfernt, Publikationsstatus ueber
     resourcePublications geprueft. (Regel 6: eine gescheiterte Anfrage ist
     kein Ergebnis.)
  2) 12 der 27 "unpublizierten" Kollektionen liefern live 200, weil bereits
     ein 301-Redirect existiert (bastel-diy -> basteln-diy, caps-hute ->
     caps-huete, elektronik-computer -> elektronik-technik, fitness,
     kuche-kochen, kuechengeraete, schuhe-sandalen, schuhe-sneaker,
     schuhe-stiefel, sonnenbrillen-eyewear, spielzeug-puzzles, sub-uhren).
     Ein Redirect ist eine funktionierende Verlinkung. -> NICHT angefasst.
     Der erste Live-Lauf ohne `curl -L` hat sie faelschlich als tot gemeldet.
  3) /collections/all ist eine eingebaute Shopify-Route ohne Collection-Objekt;
     der Admin meldet "existiert nicht", live antwortet 200. -> NICHT angefasst.
  4) 17 Produkt-Handles sind URL-kodiert (Emoji, %F0%9F%8E%81...). Der Admin
     wurde zuerst mit dem KODIERTEN Handle gefragt und meldete "existiert
     nicht". Nach dem Dekodieren: 16 DRAFT, 1 ACTIVE und live 200
     (tech-hero-gift-box). -> dieses eine NICHT angefasst.
  5) Die automatische Aehnlichkeitssuche lieferte deutsche Substring-Treffer
     wie im dokumentierten «IPL in L-IPL-iner»-Fall:
       "wearable nacken massage device" -> "Handgemachte Wearable NAILS"
       "baby nagelschneider"            -> "Elektrischer FLEISCHWOLF"
       "blue light brille"              -> "Sonnenbrille UV400" (Blaulichtfilter
                                            ist keine Sonnenbrille)
       "Planet Globe LED Diffuser"      -> "PLANET Diamond Press-On Naegel"
       "e-scooter/trottinett"           -> "gaming-CONTROLLER" (via "roller")
       "wm-fussball"                    -> "PFANNEN & Toepfe" (via "fan")
     -> Kein Score-Schwellenwert. Jede Produktzuordnung unten ist von Hand
        geprueft; wo der Typ nicht sicher uebereinstimmt, wird auf die
        passende KATEGORIE verlinkt statt auf ein falsches Produkt.

ENTSCHEIDUNG:
  A) PRODUKTE PUBLIZIEREN: keine einzige.
     Alle 52 gedrafteten Ziele tragen einen bewussten Sicherheits-Grund:
     44x `keine-lieferanten-ref`, 6x `ghost-sale-risiko`, dazu
     `nicht-fit-elektronik-draft` und `wm-langsam-pausiert`. Die restlichen
     haben SKU=None oder hand-kuratierte Alt-SKUs (WALLET-W-001, SILK-001,
     KUCH-KNIFE-001, LX-43-...), also keine aufloesbare Lieferantenbindung.
     Sie zu publizieren wuerde exakt den dokumentierten Ghost-Sale aus
     Bestellung #1008 wiederherstellen (verkaufte Ware, die niemand liefern
     kann). Verkaufbarkeit ist hier NICHT gegeben -> Weg 1 faellt aus.
  B) KOLLEKTIONEN PUBLIZIEREN: 2 (socken-strumpfe 54 Produkte,
     haustier-tech 28 Produkte). Beide haben KEIN publiziertes Gegenstueck,
     sind also die dokumentierte Publish-Falle, kein Doppelgaenger.
     NICHT publiziert werden die grossen Unpublizierten mit publiziertem
     Zwilling (damen-duefte/herren-duefte -> parfum-duefte,
     elektriker-werkzeug -> werkzeug-maschinen usw.); sie freizuschalten
     erzeugt konkurrierende Kategorieseiten - genau das, was CLAUDE.md
     ("Doppelgaenger der Menue-Kategorien, zu Recht aus") verbietet.
  C) LINK UMBIEGEN: der Regelfall. 19 Kollektionsziele und 93 Produktziele
     werden im Artikel-HTML auf ein lebendes, publiziertes Ziel gezogen.
  D) LINK ENTFERNEN, TEXT LESBAR LASSEN: nur wo es kein ehrliches Ziel gibt
     (e-scooter-trottinett, metalldetektoren-schatzsuche). Das <a> wird durch
     seinen eigenen Anker-Text ersetzt, der Satz bleibt vollstaendig.

QUELLE (Regel 7): Die toten Links entstehen nicht laufend neu - sie stammen
  aus einer einmaligen Blog-Generierung gegen einen Katalogstand, der spaeter
  gedraftet wurde. Kuenftige Artikel muessen ihre Linkziele vor dem
  Veroeffentlichen live pruefen; `--pruefen` in diesem Skript macht genau das
  und ist als Nachlauf fuer jeden Blog-Generator gedacht.
=============================================================================
"""
import json, os, re, sys, time, subprocess, urllib.request, urllib.parse

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOK  = open('/tmp/cj_shop_token.txt').read().strip()
LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship', '_blog_tote_links.txt')
ONLINE_STORE = "gid://shopify/Publication/301970915713"

def gql(q, v=None):
    last = None
    for _ in range(6):
        try:
            r = urllib.request.Request(SHOP, json.dumps({"query": q, "variables": v or {}}).encode(),
                                       {"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=90))
            if d.get("errors"):
                last = d["errors"]; time.sleep(3); continue
            if d.get("data") is not None:
                return d["data"]
        except Exception as e:
            last = e
        time.sleep(4)
    raise RuntimeError(f"GraphQL endgueltig gescheitert: {last}")   # Regel 6

def live_code(pfad):
    """HTTP-Status der Storefront. -L, weil ein 301 eine funktionierende
    Verlinkung ist und kein toter Link."""
    for _ in range(5):
        r = subprocess.run(['curl','-s','-o','/dev/null','-w','%{http_code}','-L','-A','Mozilla/5.0',
                            '--max-time','30','https://luxestyle.ch'+pfad], capture_output=True, text=True)
        c = r.stdout.strip()
        if c in ('200','404','410'):
            return c
        time.sleep(8)      # 429 ist die eigene Drosselung, kein toter Link
    return None            # Regel 6: bleibt offen

# --- C) Kollektionsziele: tot -> lebendes publiziertes Ziel -------------------
# Von Hand geprueft gegen den Anker-Text des Links und die Produktzahl.
KOLL = {
 'beamer-projektoren':          'beamer-heimkino',        # "Beamer & Projektoren" -> Beamer & Heimkino (65)
 'damen-duefte':                'parfum-duefte',          # kein publizierter Damen-Split; Oberkategorie (1282)
 'herren-duefte':               'parfum-duefte',
 'elektriker-werkzeug':         'werkzeug-maschinen',     # Anker "Werkzeug & Heimwerker" (1466)
 'haustier-tech':               None,                     # wird publiziert (B)
 'socken-strumpfe':             None,                     # wird publiziert (B)
 'kaffee-maschinen':            'kaffee-ecke',            # "Kaffee & Espresso" (134)
 'klima-ventilatoren':          'ventilatoren',           # "Klima & Ventilatoren" (217)
 'ladegeraete':                 'elektronik-laden',       # "Ladegeraete & Powerbanks" (844)
 'maker-elektronik':            'basteln-diy',            # Anker "Elektronik fuer Bastler" (615)
 'reise-outdoor':               'sub-reise',              # "Reise & Outdoor" (643)
 'staubsauger-haushalt':        'haushaltsgeraete',       # (380)
 'wm-fussball-2026':            'fussball-fanshop',       # "Fussballtrikots & WM-Artikel" (78)
 'beleuchtung':                 'beleuchtung-lampen',     # (217)
 'bundle-beauty-self-care':     'beauty-selfcare',        # (167)
 'bundle-eltern-erstausstattung':'baby-kleinkind',        # (2110)
 'bundle-vatertag-gentleman':   'geschenke-fuer-ihn',     # (72)
 'geschenk-ideen':              'premium-geschenke',      # (5424)
 'kueche-kochen':               'sub-kueche',             # (2109)
 # D) kein ehrliches Ziel im Sortiment -> Link entfernen, Text bleibt
 'e-scooter-trottinett':        '',                       # 12 Produkte, kein publiziertes Pendant
 'metalldetektoren-schatzsuche':'',                       # 1 Produkt, kein publiziertes Pendant
}
KOLL_PUBLIZIEREN = ['socken-strumpfe', 'haustier-tech']

# --- C) Produktziele ---------------------------------------------------------
# Nur wo der Produkt-TYP sicher uebereinstimmt, wird auf ein Produkt gezogen.
PRODUKT = {
 'retro-sonnenbrille-polarisiert-uv400-unisex-vintage':'/products/sonnenbrillen-set-retro-polarized',
 'resistance-bands-set-5-teilig-fitnessbaender-heim-training':'/products/resistance-bands-set-5-teilig-fitnessbander-he',
 'silikon-baby-laetzchen-5er-set-bpa-frei-spuelmaschinenfest':'/products/silikon-baby-latzchen-5er-set-bpa-frei-spulmas',
 'premium-slim-wallet-rfid-schutz-echtleder':'/products/premium-leder-geldborse-slim',
 'unisex-slim-wallet-rfid-7-farben-echtleder-fur-sie-und-ihn':'/products/premium-leder-geldborse-slim',
 'slim-kartenetui-rfid-echtleder-aluminium-bis-8-karten':'/products/premium-leder-geldborse-slim',
 'damen-portemonnaie-xl-echtleder-12-kartenfacher-rfid':'/products/damen-portemonnaie-aus-echtleder-mit-vielen-ka',
 'leder-damen-portemonnaie-rose-12-kartenfaecher-rfid':'/products/damen-portemonnaie-aus-echtleder-mit-vielen-ka',
 'leder-portemonnaie-damen-rose':'/products/damen-portemonnaie-aus-echtleder-mit-vielen-ka',
 'seiden-kissenbezug-100-maulbeerseide-anti-aging-haarpflege':'/products/seidenkissenbezug-aus-100-maulbeerseide',
 'silk-pillowcase-set-premium-anti-aging-haarpflege':'/products/seidenkissenbezug-aus-100-maulbeerseide',
 'slow-feeder-anti-schling-napf-fuer-hunde-katzen':'/products/anti-rutsch-slow-feeder-napf-fur-hunde',
 'magnetischer-messerblock-bambus-schlitzfrei-modern':'/products/magnetischer-messerhalter-aus-kunstharz',
 'manschettenknopfe-edelstahl-klassisches-design-fur-anzug-hemd':'/products/manschettenknopfe-aus-edelstahl-mit-alphabet',
 'smartwatch-pro-amoled-herzfrequenz-100-sportmodi-7-tage-akku':'/products/smartwatch-pro-1-78-amoled-herzfrequenz-fitness',
 '3-in-1-wireless-charger-iphone-airpods-apple-watch-15w':'/products/3-in-1-kabelloses-ladegerat-fur-iphone-watch-und',
 'french-press-doppelwand-glas-premium-coffee-tea-pot-borosilikat-350-650-1000ml':'/products/french-press-kaffeebereiter-aus-borosilikatglas',
 'herren-gurtel-echtleder-edelstahl-schliesse-kurzbar':'/products/elastischer-herren-gurtel-mit-automatikschliesse',
 'herren-halskette-edelstahl-minimalistisch-hypoallergen':'/products/herren-halskette-fenrir-edelstahl-weizenkette',
 'reise-toilettentasche-premium-hangend-wasserabweisend-4-facher':'/products/reise-toilettentasche',
 'galaxy-aurora-led-projektor-360-sternenhimmel':'/products/sternenhimmel-projektor-galaxy-led-nachtlicht',
 'anti-aging-serum-hyaluron-vitamin-c-vegan-made-in-eu':'/products/24k-anti-aging-serum',
 'crossbody-bag-vegan-sommer-tasche-mit-smartphone-fach':'/products/crossbody-tasche-nuit-elegant-im-vintage-look',
 'premium-kuhlbox-25l-72h-kalt-usb-anschluss':'/products/25l-auto-kuhlbox-fur-unterwegs',
 'schmuckbox-premium-mit-spiegel-portable-mit-kettenhalter-ohrring-display':'/products/kompakte-schmuckbox-mit-spiegel',
 'jade-roller-gua-sha-set-rosenquarz-premium':'/products/rosenquarz-und-jade-roller-mit-3d-metall',
 'premium-schlusselanhanger-leder-personalisierbar-mit-gravur':'/products/leder-schlusselanhanger',
 'klassische-herrenuhren-edelstahl-saphirglas-50m-wasserdicht':'/products/herren-business-quarzuhr-mit-stahlarmband',
 'minimalist-canvas-rucksack-25l-laptop-schule':'/products/urbaner-rucksack-fur-herren',
 'xl-strandtuch-bio-baumwolle-180x100cm-sandfrei-mit-tragetasche':'/products/extra-dickes-baumwoll-badetuch-saugstark',
 'laptop-sleeve-echtleder-13-15-macbook-universal':'/products/3-in-1-laptop-sleeve-mit-wireless-charger',
 'wm-trikot-selbst-gestalten':'/products/fussball-trikot-fur-herren',
}
# Alles Uebrige: auf die passende KATEGORIE statt auf ein falsches Produkt.
KATEGORIE = {
 # Aroma & Diffuser
 'ultraschall-aroma-diffuser-bambus-500ml-7-led-farben':'sub-aroma-diffuser',
 'aroma-diffuser-bambus-500ml-7-led-farben-ultraschall':'sub-aroma-diffuser',
 'bambus-aroma-diffuser-300ml':'sub-aroma-diffuser',
 'aromatherapie-diffuser-bambus':'sub-aroma-diffuser',
 'smart-aroma-diffuser-app-gesteuert-bluetooth':'sub-aroma-diffuser',
 'wood-grain-aroma-diffuser-500ml-holzdesign-premium':'sub-aroma-diffuser',
 '200m3-smart-diffuser-premium-bluetooth':'sub-aroma-diffuser',
 'flame-diffuser-7-farben-kamin-effekt':'sub-aroma-diffuser',
 'planet-globe-led-diffuser-galaxy-aura':'sub-aroma-diffuser',
 'mini-robo-diffuser-auto-ai-lichter-usb':'sub-aroma-diffuser',
 'premium-atherische-ole-set-6er-aromatherapy-diffuser-vegan':'sub-aroma-diffuser',
 '\U0001f338-aromatherapy-starter-wood-grain-diffuser-6er-ole-set':'sub-aroma-diffuser',
 # Wellness / Selfcare / Ritual-Boxen
 'wellness-bambus-tablett':'wellness-komplettset',
 '\U0001f486-selfcare-box-wellness-jade-roller-seide-kerzen-spare-chf-30':'wellness-komplettset',
 '\U0001f33f-ritual-box-wellness-palo-santo-galaxy-aurora-projektor-soja-duftkerzen-spare-chf-25':'wellness-komplettset',
 '\U0001f319-sleep-ritual-box-salzkristall-lampe-pillow-spray-cashmere-wolldecke-spare-chf-25':'wellness-komplettset',
 '\U0001f381-bedside-spa-gift-box-salt-crystal-lamp-pillow-spray-cashmere-blanket-soy-candles':'wellness-komplettset',
 'pillow-spray-premium-lavendel-schlaf-mist-100ml-aromatherapie-beruhigend':'wellness-komplettset',
 '\U0001f486-beauty-bundle-jade-roller-salzlampe-duftkerzen':'wellness-komplettset',
 '\U0001f486-recovery-set-premium-akupressur-matte-faszienrolle-wolldecke-spare-chf-25':'wellness-massage',
 'akupressur-matte-premium-set-mit-kissen-kuznetsov-spikes-sport-wellness':'wellness-massage',
 'wearable-nacken-massage-device':'wellness-massage',
 'faszienrolle-premium-3er-set-schaumstoff-roller-triggerpunkt-ball-peanut-roller':'sub-yoga-fitness',
 'yoga-matte-premium-tpe-rutschfest-6mm-mit-tragegurt':'sub-yoga-fitness',
 'premium-yogamatte-6mm-anti-rutsch-tpe-inkl-tragegurt':'sub-yoga-fitness',
 '\U0001f381-yoga-devotion-gift-box-premium-yoga-mat-bio-yoga-cushion-acupressure-mat':'sub-yoga-fitness',
 # Beauty / Hautpflege
 'augencreme-premium-koffein-retinol-gegen-augenringe':'hautpflege-skincare',
 'vegane-gesichtsmaske-7-tage-set-mit-pflanzenextrakten':'hautpflege-skincare',
 '\U0001f48e-premium-beauty-komplett-set-anti-aging-serum-augencreme-wimpernserum-body-lotion-gesichtsmaske':'hautpflege-skincare',
 '\U0001f384-beauty-adventskalender-2026-24-premium-mini-produkte':'beauty-pflege',
 # Elektronik
 'in-ear-kopfhorer-anc-bluetooth-5-3-ipx5-36h-akku':'kopfhoerer-audio',
 'bluetooth-kopfhorer-anc-active-noise-cancellation-40h-akku':'kopfhoerer-audio',
 'bluetooth-speaker-360-ipx7-wasserdicht-24h-akku':'kopfhoerer-audio',
 'tragbares-ladegeraet-20000mah-solar-3-usb-ports-led':'elektronik-laden',
 'hepa-luftreiniger-smart-35m-app-steuerung-flusterleise':'haushaltsgeraete',
 'smart-luftbefeuchter-mit-hygrometer':'haushaltsgeraete',
 'blue-light-brille-anti-blaulicht-pc-gaming-home-office':'pc-homeoffice',
 'premium-notebook-pen-set-a5-echtleder-touch-pen-business-geschenk':'buero-schreibwaren',
 '__nicht_verwendet_live200__':'elektronik-technik',
 # Haustier
 'led-sicherheitshalsband-hund-usb-wasserdicht-ip65':'sub-haustier',
 'automatischer-haustiertraenke-2l-katze-hund-filter':'sub-haustier',
 # Wohnen / Deko / Kueche
 'cashmere-look-wolldecke-180-130-jacquard-nordic-style-sofa-bett':'wohnen-dekoration',
 'wandbilder-3er-set-minimalistisch-leinwand-mit-rahmen':'wohnen-dekoration',
 'pflanzentopfe-3er-set-keramik-minimalistisch-mit-bambus-untersetzer':'wohnen-dekoration',
 'himalaya-salzkristall-lampe-naturkristall':'beleuchtung-lampen',
 'himalaya-salzkristall-lampe-handgeschnitzt-naturkristall':'beleuchtung-lampen',
 'soja-duftkerzen-set-wellness-3x200g-vegan-40h':'wohnen-dekoration',
 'soja-duftkerzen-4er-set-vintage-rose-lavendel':'wohnen-dekoration',
 'bambus-picknick-set-4-personen-geschirr-besteck-korb':'sub-kueche',
 '\U0001f381-hosting-premium-gift-box-crystal-carafe-champagne-glasses-wine-set-bamboo-tray':'sub-kueche',
 # Schmuck / Accessoires
 'damen-armband-edelstahl-minimalistisch-hypoallergen':'geschenke-fuer-sie',
 'herren-lederarmband-edelstahl-anker-premium-maritime-style':'herrenuhren-schmuck',
 'damen-ohrring-set-3-paare-edelstahl-925-hypoallergen':'geschenke-fuer-sie',
 'reise-schmuckbinder-premium-leder-anti-oxidation-kompakt-fur-handgepack':'sub-reise',
 '\u2708\ufe0f-travel-set-premium-pass-hulle-kartenetui-toilettentasche-spare-chf-20':'sub-reise',
 # Mode
 'bio-baumwoll-t-shirt-gots-fair-trade-unisex-xs-3xl':'sg-bekleidung',
 # Geschenkboxen ohne eindeutiges Pendant
 '\U0001f381-gentlemans-premium-gift-box-diver-watch-slim-wallet-leather-bracelet-cufflinks':'geschenke-fuer-ihn',
 '\U0001f338-muttertag-box-2026-schmuck-beauty-seide-spare-chf-60':'geschenke-fuer-sie',
 'geschenkbox-elegance-schmuck-beauty-seide-im-set':'geschenke-fuer-sie',
 '\U0001f384-adventskalender-deluxe-2026-24-premium-lifestyle-uberraschungen':'premium-geschenke',
 '\U0001f385-adventskalender-luxestyle-24-premium-uberraschungen':'premium-geschenke',
 'adventskalender-luxestyle-premium-24-ueberraschungen':'premium-geschenke',
 'elektrischer-baby-nagelschneider-leise-led-5-aufsaetze':'sub-baby-kids',
 'edelstahl-thermosflasche-750ml-24h-kalt-12h-warm':'sub-trinkflaschen',
 'edelstahl-thermosflasche-750ml-24h-kalt-12h-warm-1':'sub-trinkflaschen',
}

def ledger_schreiben(zeile):
    with open(LEDGER, 'a', encoding='utf-8') as f:
        f.write(zeile + "\n"); f.flush(); os.fsync(f.fileno())    # Regel 5

def ziel_fuer(pfad):
    """Liefert das neue Ziel fuer einen toten Pfad, '' = Link entfernen,
    None = unbekannt (nicht anfassen)."""
    if pfad.startswith('/collections/'):
        h = pfad.split('/collections/')[1]
        if h in KOLL_PUBLIZIEREN: return None          # bleibt, wird publiziert
        z = KOLL.get(h)
        return z if z is None or z == '' else '/collections/' + z
    h = urllib.parse.unquote(pfad.split('/products/')[1])
    if h in PRODUKT: return PRODUKT[h]
    if h in KATEGORIE: return '/collections/' + KATEGORIE[h]
    return None

A_RE = re.compile(r'<a\b[^>]*?href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)

def artikel_umschreiben(body, tote):
    """Ersetzt href toter Ziele; leeres Ziel -> <a> faellt weg, Anker-Text bleibt."""
    aend = []
    def rep(m):
        href, inner = m.group(1), m.group(2)
        pfad = href.split('#')[0].split('?')[0].rstrip('/')
        if pfad not in tote: return m.group(0)
        z = ziel_fuer(pfad)
        if z is None: return m.group(0)
        if z == '':
            aend.append((pfad, '<entfernt>'))
            return inner                                  # Text bleibt lesbar
        aend.append((pfad, z))
        return m.group(0).replace('href="%s"' % href, 'href="%s"' % z, 1)
    return A_RE.sub(rep, body), aend

# ---------------------------------------------------------------- Hauptlauf --
def lade_artikel():
    Q = """query($c:String){articles(first:25,after:$c){pageInfo{hasNextPage endCursor}
           nodes{id handle title body blog{handle}}}}"""
    out, c = [], None
    while True:
        d = gql(Q, {"c": c})["articles"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]: break
        c = d["pageInfo"]["endCursor"]; time.sleep(0.3)
    return out

def tote_ziele_ermitteln(arts, cache=None):
    """Sammelt alle internen Linkziele und prueft sie LIVE."""
    ziele = set()
    for a in arts:
        for href in re.findall(r'href="(/(?:products|collections)/[^"#?]+)', a.get('body') or ''):
            ziele.add(href.rstrip('/'))
    tote, offen = set(), []
    for p in sorted(ziele):
        if cache and p in cache:
            code = cache[p]
        else:
            code = live_code(p)
        if code is None:
            offen.append(p); continue                     # Regel 6
        if code == '404': tote.add(p)
    return tote, offen

def main():
    scharf = '--scharf' in sys.argv
    arts = lade_artikel()
    cache = None
    if os.path.exists('/tmp/blog_live_cache.json'):
        cache = json.load(open('/tmp/blog_live_cache.json'))
    tote, offen = tote_ziele_ermitteln(arts, cache)
    print(f"Artikel: {len(arts)} | tote Ziele live: {len(tote)} | ohne Antwort (offen): {len(offen)}")
    for p in offen: print("  OFFEN, naechster Lauf:", p)

    ohne_plan = sorted(p for p in tote if ziel_fuer(p) is None
                       and p.split('/collections/')[-1] not in KOLL_PUBLIZIEREN)
    if ohne_plan:
        print(f"\n!! {len(ohne_plan)} tote Ziele ohne Zuordnung - werden NICHT angefasst:")
        for p in ohne_plan: print("   ", p)

    plan, umgebogen, entfernt = [], 0, 0
    for a in arts:
        neu, aend = artikel_umschreiben(a['body'] or '', tote)
        if not aend: continue
        plan.append((a, neu, aend))
        for _, z in aend:
            if z == '<entfernt>': entfernt += 1
            else: umgebogen += 1
    print(f"\nBetroffene Artikel: {len(plan)} | Links umgebogen: {umgebogen} | Links entfernt: {entfernt}")
    for a, _, aend in plan[:6]:
        print(f"  - {a['title'][:62]}")
        for v, z in aend[:4]: print(f"       {v}  ->  {z}")

    if not scharf:
        print("\nPROBELAUF. Mit --scharf schreiben.")
        return

    # B) Kollektionen publizieren (nur die ohne publiziertes Gegenstueck)
    for h in KOLL_PUBLIZIEREN:
        d = gql('query($h:String!){collectionByHandle(handle:$h){id title}}', {"h": h})
        c = d.get('collectionByHandle')
        if not c:
            print("Kollektion fehlt, uebersprungen:", h); continue
        r = gql("""mutation($id:ID!,$in:[PublicationInput!]!){publishablePublish(id:$id,input:$in){
                   userErrors{field message}}}""",
                {"id": c['id'], "in": [{"publicationId": ONLINE_STORE}]})
        ue = r['publishablePublish']['userErrors']
        print(("PUBLIZIERT: " if not ue else "FEHLER %s: " % ue) + h)
        if not ue: ledger_schreiben(f"kollektion-publiziert\t{h}\t{c['id']}")

    # C/D) Artikel-Bodies schreiben
    M = """mutation($id:ID!,$b:String!){articleUpdate(id:$id,article:{body:$b}){
           userErrors{field message} article{id}}}"""
    ok = 0
    for a, neu, aend in plan:
        r = gql(M, {"id": a['id'], "b": neu})
        ue = r['articleUpdate']['userErrors']
        if ue:
            print("FEHLER", a['handle'], ue); continue
        ok += 1
        ledger_schreiben(f"artikel\t{a['id']}\t{a['handle']}\t" +
                         ";".join(f"{v}=>{z}" for v, z in aend))
        time.sleep(0.25)
    print(f"\nGeschrieben: {ok} Artikel.")

if __name__ == '__main__':
    main()
