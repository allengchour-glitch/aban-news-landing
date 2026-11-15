#!/usr/bin/env python3
"""Tests ohne Netz für die Zählhilfen von merchant_bildprobleme.py (Aufruf: python3 -I automation/merchant_bildprobleme_test.py).

Die Pakete requests und google-auth werden durch leere Attrappen ersetzt: getestet wird nur reine Logik.
"""
import os, sys, types

for name in ("requests", "requests.exceptions", "google", "google.oauth2", "google.oauth2.service_account",
             "google.auth", "google.auth.transport", "google.auth.transport.requests"):
    sys.modules.setdefault(name, types.ModuleType(name))
sys.modules["google.oauth2"].service_account = sys.modules["google.oauth2.service_account"]
sys.modules["google.auth.transport.requests"].Request = object
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merchant_bildprobleme as m  # noqa: E402

fehler = 0


def gleich(ist, soll, was):
    global fehler
    if ist != soll:
        fehler += 1
        print(f"FEHLER {was}: ist {ist!r}, soll {soll!r}")


# Herkunft und Produkt-ID
gleich(m.herkunft("shopify_ZZ_15507580649857_56147913113985"), "shopify-app", "App-Format")
gleich(m.herkunft("15450832765313_cj-cjjjcfcf00032-brown"), "autofeed-produkt-sku", "Autofeed mit SKU")
gleich(m.herkunft("16882423843509892988"), "autofeed-nummer", "Autofeed reine Nummer")
gleich(m.herkunft("abc_def"), "andere", "fremdes Format")
gleich(m.herkunft(None), "andere", "leer")
gleich(m.produkt_id("shopify_ZZ_15507580649857_56147913113985"), "15507580649857", "Produkt-ID App")
gleich(m.produkt_id("15450832765313_cj-cjjjcfcf00032-brown"), "15450832765313", "Produkt-ID Autofeed")
gleich(m.produkt_id("16882423843509892988"), None, "reine Nummer hat keine Produkt-ID")
gleich(m.produkt_id("shopify_ZZ_x_1"), None, "kaputtes App-Format")

# Manifest: die letzte Aktion je Produkt gilt, «auf» holt zurück, kaputte Zeilen werden übersprungen
manifest = [
    '{"id":"gid://shopify/Product/1","am":"2026-10-28","aktion":"ab-versucht"}',
    '{"id":"gid://shopify/Product/2","am":"2026-10-28","aktion":"ab-versucht"}',
    '{"id":"gid://shopify/Product/2","am":"2026-10-29","aktion":"auf"}',
    '{"id":"gid://shopify/Product/3","am":"2026-10-29","aktion":"auf"}',
    '{"id":"gid://shopify/Product/3","am":"2026-11-01","aktion":"ab"}',
    '{"id":"gid://shopify/Product/4","am":"2026-11-01"}',
    'kaputt', '', '{"id":"gid://shopify/Collection/9","aktion":"ab"}',
]
gleich(m.gesperrte_produkte(manifest), {"1", "3", "4"}, "gesperrte Produkte aus dem Manifest")

# Zählung: Produkt 1 gesperrt und nur im Autofeed, Produkt 5 in App und Autofeed, Produkt 3 gesperrt aber in der App
z = m.autofeed_zaehlen([
    "1_sku-a", "1_sku-b", "5_sku-x", "shopify_ZZ_5_50", "shopify_ZZ_3_30", "777", "fremd",
], {"1", "3"})
gleich(z["zeilen"], {"autofeed-produkt-sku": 3, "shopify-app": 2, "autofeed-nummer": 1, "andere": 1}, "Zeilen je Format")
gleich((z["produkte_app"], z["produkte_autofeed"]), (2, 2), "Produkte je Quelle")
gleich((z["autofeed_zeilen_gesperrt"], z["autofeed_produkte_gesperrt"]), (2, 1), "gesperrte im Autofeed")
gleich((z["app_zeilen_gesperrt"], z["app_produkte_gesperrt"]), (1, 1), "gesperrte in der App")
gleich((z["nur_autofeed"], z["nur_autofeed_gesperrt"]), (1, 1), "nur im Autofeed")
gleich(z["beispiele_gesperrt"], ["1"], "Beispiele")
gleich(m.autofeed_zaehlen([], set())["nur_autofeed"], 0, "leere Eingabe")

# Leistung je Herkunft: Autofeed getrennt nach gesperrt (Schaufenster) und frei
l = m.leistung_je_herkunft([
    {"productPerformanceView": {"offerId": "shopify_ZZ_5_50", "clicks": "2", "impressions": "40"}},
    {"productPerformanceView": {"offerId": "1_sku-a", "clicks": "1", "impressions": "10"}},
    {"productPerformanceView": {"offerId": "1_sku-b", "impressions": "5"}},
    {"productPerformanceView": {"offerId": "9_sku-c", "clicks": "0", "impressions": "3"}},
    {"productPerformanceView": {"offerId": "777", "clicks": "1"}},
], {"1"})
gleich(l["shopify-app"], {"klicks": 2, "einblendungen": 40, "angebote_mit_klick": 1}, "Leistung App")
gleich(l["autofeed-produkt-sku-gesperrt"], {"klicks": 1, "einblendungen": 15, "angebote_mit_klick": 1}, "Leistung Autofeed gesperrt")
gleich(l["autofeed-produkt-sku"], {"klicks": 0, "einblendungen": 3, "angebote_mit_klick": 0}, "Leistung Autofeed frei")
gleich(l["autofeed-nummer"]["klicks"], 1, "Leistung reine Nummer")

print(f"{'OK' if not fehler else 'FEHLGESCHLAGEN'}: {fehler} Fehler")
sys.exit(1 if fehler else 0)
