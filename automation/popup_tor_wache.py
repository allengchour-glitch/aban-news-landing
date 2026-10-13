#!/usr/bin/env python3
"""popup_tor_wache.py — hält das Newsletter-Popup von der ersten Sekunde fern (05.10.2026).

ANLASS (Clarity, Betreiber 05.10., 6 Sitzungen, 0 Käufe): Popup + Cookie-Banner lagen 2–7 s nach Ankunft gleichzeitig über
der Seite — mobil über dem ganzen Bildschirm, desktop über «In den Warenkorb». Ursache: 40-%-Scroll (kurze Handy-Produktseite
= 2–3 s) und Exit-Intent im Popup `custom_liquid_lxpopup` (sections/footer-group.json). Fix 05.10.: nie vor 20 s (mobil 30 s),
nie solange das Shopify-Cookie-Banner sichtbar ist, nie auf Warenkorb/Konto; danach 60 % Scroll, Exit-Intent (nur Desktop)
oder Timer 45/75 s. Gemessen im Handy-Browser: 3/8/15/19 s (inkl. 70 % Scroll) Popup zu.

Diese Wache liest die LIVE-Datei (Theme-Editor/Apps können sie überschreiben) und meldet nur, wenn das Tor fehlt.
  python3 automation/popup_tor_wache.py      → «POPUP-TOR: ok» oder «⚠️ POPUP-TOR: …» (Exit 1)
Reparatur: automation/popup_consent_patch_2026-10-05.py (Backup theme_backup/footer-group.json.vor-popup-consent-1005).

NACHTRAG 13.10.2026 (Kauf-Strecke Klasse 1, Cookie-Banner über «In den Warenkorb»): GEMESSEN 390×844 — das eigene Banner
#lx-cookie-banner wurde um 90 px angehoben, sobald die Kaufleiste im DOM war, auch unsichtbar (opacity 0): Banner y=650..754
über dem Hauptknopf y=698..750, ein Tipp traf das Banner. Fix in layout/theme.liquid: Anheben nur bei
`.sticky-add-to-cart__bar[data-stuck="true"]` (CSS + lxBannerPlatzieren mit MutationObserver), Handy einzeilig bottom:0;
dazu config/settings_data.json auto_open_cart_drawer = true (vorher fehlte der Schlüssel → Standard false, nach dem Tippen
ging keine Schublade auf). Zwei weitere Prüfungen hier: (1) Bedingung «sichtbar» in der Live-Datei, alte Existenz-Regel weg;
(2) Einstellung true. Backups: theme_backup/layout__theme.liquid.vor-kaufstrecke-1013, config__settings_data.json.vor-kaufstrecke-1013.
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

PFLICHT = ['MIN_MS=MOBIL?30000:20000', 'bannerOffen()', 'seiteOk()', 'if(!MOBIL) document.addEventListener("mouseout"']
VERBOTEN = ['setTimeout(show,', 'window.scrollY/h>=0.4){ scrollGezeigt=true; show(); }']
# 13.10.2026: Cookie-Banner darf nur über einer SICHTBAREN Kaufleiste schweben
BANNER_PFLICHT = ['.sticky-add-to-cart__bar[data-stuck="true"]) #lx-cookie-banner', 'leiste.dataset.stuck==="true"']
BANNER_VERBOTEN = ['body:has(.sticky-add-to-cart__bar) #lx-cookie-banner { bottom: 90px', 'var h=leiste?Math.round(']  # alte Existenz-Regel (CSS + JS); der 14.08.-Kommentar zitiert die CSS-Zeile mit calc() — zählt nicht


def _datei(th, name):
    r = gql('query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }',
            {'id': th, 'f': [name]})
    return r['theme']['files']['nodes'][0]['body']['content']


def banner_befunde(th):
    """Kauf-Strecke Klasse 1: Banner-Bedingung «sichtbar» + Schublade öffnet nach dem Tippen."""
    b = []
    t = _datei(th, 'layout/theme.liquid')
    if 'lx-cookie-banner' in t:
        fehlt = [p for p in BANNER_PFLICHT if p not in t]
        alt = [v for v in BANNER_VERBOTEN if v in t]
        if fehlt or alt:
            b.append(f'Cookie-Banner hebt sich wieder ohne sichtbare Kaufleiste (fehlt {len(fehlt)}, alte Regel {len(alt)}) — '
                     'Patch aus theme_backup/layout__theme.liquid.vor-kaufstrecke-1013 vs. Live neu anwenden')
    c = _datei(th, 'config/settings_data.json')
    try:
        cur = json.loads(c[c.find('{', c.find('*/') if '*/' in c else 0):]).get('current', {})
    except ValueError:
        return b + ['settings_data.json nicht lesbar']
    if cur.get('cart_type') == 'drawer' and cur.get('auto_open_cart_drawer') is not True:
        b.append(f"auto_open_cart_drawer={cur.get('auto_open_cart_drawer')} — nach «In den Warenkorb» öffnet keine Schublade")
    return b


def main():
    th = gql('{ themes(first:1, roles:[MAIN]){ nodes{ id } } }')['themes']['nodes'][0]['id']
    r = gql('query($id:ID!){ theme(id:$id){ files(filenames:["sections/footer-group.json"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }', {'id': th})
    c = r['theme']['files']['nodes'][0]['body']['content']
    j = json.loads(c[c.find('{', c.find('*/') if '*/' in c else 0):])
    sec = j.get('sections', {}).get('custom_liquid_lxpopup')
    bef = banner_befunde(th)
    zusatz = ' · Banner sichtbar-Bedingung + Schublade ok'
    if bef:
        print('⚠️ POPUP-TOR: ' + ' | '.join(bef)); return 1
    if not sec or sec.get('disabled'):
        print('POPUP-TOR: ok (Popup aus)' + zusatz); return 0
    code = sec['settings'].get('custom_liquid', '')
    fehlt = [p for p in PFLICHT if p not in code]
    alt = [v for v in VERBOTEN if v in code]
    if fehlt or alt:
        print(f'⚠️ POPUP-TOR: Popup kann wieder sofort aufgehen (fehlt {len(fehlt)}, alte Auslöser {len(alt)}) — '
              'automation/popup_consent_patch_2026-10-05.py auf die Live-Datei anwenden'); return 1
    print('POPUP-TOR: ok' + zusatz); return 0


if __name__ == '__main__':
    sys.exit(main())
