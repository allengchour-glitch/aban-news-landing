#!/usr/bin/env python3
"""botwellen.py — erkennt Wellen automatischer Produktaufrufe, die Shopify als «Mensch» zählt (12.10.2026, Kauf-Strecke Tag 2).

ANLASS: Die 12-Tage-Bilanz fand 189 Produktsitzungen ohne Herkunft mit 0 Warenkörben (Spitze 01./02.10.) und konnte nicht
sagen, ob das Menschen sind. GEMESSEN 12.10. (ShopifyQL, human_or_bot_session = 'human'):
  - 01.10. 21:00 UTC: 41 Sitzungen ohne utm und ohne Referrer in EINER Stunde, auf 41 VERSCHIEDENEN Produktseiten
    (jede genau 1×), Geräte genau 25 iOS / 25 Android (mit den 9 «social» derselben Stunde), Orte von Aarau über Madrid,
    Istanbul, Niš bis Norridge (USA), 0 Warenkörbe. Mit der TikTok-Werbewelle derselben Tage hängt es nicht zusammen
    (Korrelation je Stunde r = −0,01, n = 55).
  - Dasselbe Muster wiederholt sich: 03.09. 09h 24/24 Seiten · 05.09. 07h 16/16 · 14.09. 20h 14/14 · 13.09. 21h 12/10.
  Ein Mensch öffnet nicht in einer Stunde 41 verschiedene Produkte über 41 getrennte Sitzungen. Das ist ein Abgraser
  (Spionage-Werkzeug, Katalog-Prüfer) mit Handy-Kennung und wechselnden Adressen.

REGEL (SETZUNG, an diesen 5 Wellen kalibriert): Eine Stunde ist eine Welle, wenn dort
  ≥ MIN_SITZ Produkt-Sitzungen ohne utm und ohne Referrer landen, mindestens MIN_ANTEIL davon je auf einer ANDEREN
  Produktseite, und KEINE einen Warenkorb hat.
Gegenprobe: Eine echte Werbewelle landet auf wenigen Seiten (TikTok 01.–04.10.: 104 Sitzungen auf 3 Seiten) und hat
utm → nie eine Welle. Ein Warenkorb macht die Stunde menschlich.

Wellen werden NICHT gelöscht oder versteckt, nur in der Bilanz getrennt ausgewiesen (`tools/webseite_bilanz.py`).

  python3 tools/botwellen.py                       # Wellen seit 01.09. + Anteil
  python3 tools/botwellen.py "SINCE -30d UNTIL today"
  python3 tools/botwellen.py --selbsttest
"""
import collections, os, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

MIN_SITZ = 6
MIN_ANTEIL = 0.8
BEDINGUNG = ("human_or_bot_session = 'human' AND landing_page_type = 'Product' "
             "AND utm_source IS NULL AND referrer_source = 'direct'")


def ist_welle(sitzungen, seiten, koerbe):
    """→ True, wenn die Stunde nach der Regel oben eine Welle ist."""
    return sitzungen >= MIN_SITZ and seiten >= MIN_ANTEIL * sitzungen and koerbe == 0


def stunden(fenster):
    """{Stunde: (Sitzungen, verschiedene Seiten, Warenkörbe)} für Produkt-Sitzungen ohne Herkunft im Fenster."""
    from werbetest_trichter import ql
    rows = ql(f"FROM sessions SHOW sessions, sessions_with_cart_additions GROUP BY hour, landing_page_path "
              f"WHERE {BEDINGUNG} {fenster} ORDER BY sessions DESC LIMIT 10000")
    s, p, k = collections.Counter(), collections.defaultdict(set), collections.Counter()
    for r in rows:
        h = (r.get("hour") or "")[:13]
        s[h] += int(r.get("sessions") or 0)
        p[h].add(r.get("landing_page_path"))
        k[h] += int(r.get("sessions_with_cart_additions") or 0)
    return {h: (s[h], len(p[h]), k[h]) for h in s}


def wellen(fenster):
    """→ (Liste [(Stunde, Sitzungen, Seiten)], Sitzungen in Wellen, alle Produkt-Sitzungen ohne Herkunft)."""
    st = stunden(fenster)
    w = sorted(((h, n, sp) for h, (n, sp, k) in st.items() if ist_welle(n, sp, k)), key=lambda x: x[0])
    return w, sum(n for _, n, _ in w), sum(n for n, _, _ in st.values())


def selbsttest():
    faelle = [((41, 41, 0), True, "01.10. 21h"), ((24, 24, 0), True, "03.09. 09h"), ((12, 10, 0), True, "13.09. 21h"),
              ((6, 6, 0), True, "Untergrenze"), ((5, 5, 0), False, "zu wenige"), ((40, 3, 0), False, "Werbewelle auf 3 Seiten"),
              ((8, 8, 1), False, "mit Warenkorb = Mensch"), ((10, 7, 0), False, "70 % verschiedene Seiten")]
    fehler = 0
    for (n, sp, k), soll, name in faelle:
        ok = ist_welle(n, sp, k) == soll
        fehler += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {name:28} {n:>3} Sitz. / {sp:>3} Seiten / {k} Korb → {'Welle' if ist_welle(n, sp, k) else '—'}")
    print("SELBSTTEST", "OK" if not fehler else f"FEHLER ({fehler})")
    return 0 if not fehler else 1


def main():
    a = sys.argv[1:]
    if "--selbsttest" in a:
        return selbsttest()
    fenster = a[0] if a else "SINCE 2026-09-01 UNTIL today"
    w, in_w, alle = wellen(fenster)
    print(f"BOT-WELLEN ({fenster}): {len(w)} Stunden · {in_w} von {alle} Produkt-Sitzungen ohne Herkunft "
          f"({100 * in_w / alle:.0f} %)" if alle else f"BOT-WELLEN ({fenster}): keine Produkt-Sitzungen ohne Herkunft")
    for h, n, sp in w:
        print(f"  {h}:00 UTC  {n:>3} Sitzungen auf {sp:>3} Seiten")
    return 0


if __name__ == "__main__":
    sys.exit(main())
