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
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

PFLICHT = ['MIN_MS=MOBIL?30000:20000', 'bannerOffen()', 'seiteOk()', 'if(!MOBIL) document.addEventListener("mouseout"']
VERBOTEN = ['setTimeout(show,', 'window.scrollY/h>=0.4){ scrollGezeigt=true; show(); }']


def main():
    th = gql('{ themes(first:1, roles:[MAIN]){ nodes{ id } } }')['themes']['nodes'][0]['id']
    r = gql('query($id:ID!){ theme(id:$id){ files(filenames:["sections/footer-group.json"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }', {'id': th})
    c = r['theme']['files']['nodes'][0]['body']['content']
    j = json.loads(c[c.find('{', c.find('*/') if '*/' in c else 0):])
    sec = j.get('sections', {}).get('custom_liquid_lxpopup')
    if not sec or sec.get('disabled'):
        print('POPUP-TOR: ok (Popup aus)'); return 0
    code = sec['settings'].get('custom_liquid', '')
    fehlt = [p for p in PFLICHT if p not in code]
    alt = [v for v in VERBOTEN if v in code]
    if fehlt or alt:
        print(f'⚠️ POPUP-TOR: Popup kann wieder sofort aufgehen (fehlt {len(fehlt)}, alte Auslöser {len(alt)}) — '
              'automation/popup_consent_patch_2026-10-05.py auf die Live-Datei anwenden'); return 1
    print('POPUP-TOR: ok'); return 0


if __name__ == '__main__':
    sys.exit(main())
