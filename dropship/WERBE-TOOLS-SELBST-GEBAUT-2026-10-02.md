# Werbe-Tools wie Soro: was wir selbst haben, was sich nicht lohnt, was neu ist (02.10.2026)

Betreiber: «ich sehe viele werbungen anzeigen wie soro? mache das beste draus von allem? programmiere tools selber».
Regel: erst messen, ob die Klasse bei uns ein Hebel ist, dann bauen. Quellen der Tool-Liste (QUELLE, nicht geprüft):
omnisend.com/blog/shopify-ai-tools, ringly.io/blog/best-ai-tools-for-shopify, txtcart.ai/blog/best-shopify-ai-tools,
cleancommit.io/blog/indexnow-for-shopify, apps.shopify.com (IndexNow-Apps).

## Die beworbenen Klassen gegen unsere Zahlen

| Beworben (Beispiele) | Was es tut | Bei uns | Entscheid |
|---|---|---|---|
| Soro, SEOWILL | KI-Ratgeber, SEO-Autopilot | `seo_autopilot.py` täglich (02.10.) | **schon selbst gebaut** |
| Simprosys, Feed-Optimierer | Google-Feed: Kategorien, Titel, Fehler | `google_kategorie_fein.py`, `google_fein_ki.py`, `google_feedback_wache.py`, `google_bild_tausch.py`, `google_nachfrage_luecke.py` | **schon selbst gebaut**. Titel-Optimierer verworfen: GEMESSEN Titel < 25 Zeichen 3,4 Besuche/1000 Produkte, 25–40 Zeichen 2,2/1000 → kurze Titel schaden nicht |
| IndexNow Kit, InstaIndex («for Bing ChatGPT») | meldet neue Seiten sofort an Bing | fehlte | **NEU: `indexnow_melden.py`** |
| Klaviyo, Omnisend, TxtCart | E-Mail/SMS-Rückholung, Newsletter | GEMESSEN 30 T: **1** abgebrochene Kasse; 6 von 1'517 Kunden mit Newsletter-Zustimmung | lohnt jetzt nicht — nichts zum Zurückholen |
| Rebuy, LimeSpot | Empfehlungen, Upsell | Horizon zeigt Empfehlungen schon; 590 Sitzungen/Woche, 6 Warenkörbe | lohnt erst mit Verkehr |
| Tidio, Gorgias | Chatbot | 4 Bestellungen im Monat | lohnt nicht |
| Triple Whale | Kanal-Analytik | Ampel-Zeilen (VERKAUF-ZIEL, KAUFWILLE, GOOGLE, BESTELLUNGEN) | schon selbst gebaut |
| Semrush | Suchvolumen | Konnektor da, **keine API-Einheiten** | Betreiber-Entscheid (Einheiten kaufen) |

## Der Befund, der den Ausschlag gab (GEMESSEN, Admin-API `customerJourneySummary`)
- Letzte 4 echte Bestellungen: **#1021 ChatGPT**, #1020 direkt, #1019 Google, **#1018 ChatGPT**. Beide ChatGPT-Käufe
  landeten direkt auf der Produktseite (`utm_source=chatgpt.com`).
- ChatGPT-Sitzungen (ShopifyQL): Juli 2, August 7, September 16 — wächst; in 90 T 23 Sitzungen gegen 539 von Google
  (5 Käufe). ChatGPT bringt also wenige Besucher, aber gemessen den höchsten Kaufanteil.
- ChatGPT-Suche, Copilot und DuckDuckGo lesen den **Bing-Index**. Shopify meldet Änderungen dort nicht selbst
  (QUELLE: App-Beschreibungen; kein natives IndexNow).

## Gebaut: `automation/indexnow_melden.py`
- Schlüssel `dropship/_indexnow_key.txt` (öffentlich per Protokoll). Datei im Shopify-CDN, URL-Redirect
  `luxestyle.ch/<key>.txt` → CDN (GEMESSEN: 301, Inhalt = Schlüssel).
- Täglich im Aufseher, höchstens 10'000 Adressen pro Lauf. Reihenfolge: Startseite/Kollektionen/Artikel/Seiten,
  dann Kaufwillen-Produkte, dann der Rest. Nur Seiten im Onlineshop. Dieselbe Adresse frühestens nach 30 Tagen wieder.
- Probe HTTP 202 (Schlüssel in Prüfung), erster Lauf **10'000 Adressen HTTP 200** (Schlüssel bestätigt).
  50'744 öffentliche Seiten, Rückstand 40'744 → in ~4 Tagen alles einmal gemeldet. Stichprobe 8/8 Adressen HTTP 200.
- Ledger `dropship/_indexnow_gemeldet.tsv`, Protokoll `dropship/_indexnow_laeufe.tsv`.

## Messen (Basis heute)
- ChatGPT-Sitzungen: September 16 (≈ 4/Woche), Bing: 50 in 90 T. Nachmessen am 16.10. und 02.11.
- Gegenprobe: IndexNow beschleunigt das Crawlen, ein Ranking verspricht es nicht.

## Offen für den Betreiber (optional)
- Bing Webmaster Tools: luxestyle.ch anmelden (Import aus der Google Search Console geht mit einem Klick). Dort sieht
  man die IndexNow-Annahmen und die Bing-Klicks — von hier aus nicht messbar.
