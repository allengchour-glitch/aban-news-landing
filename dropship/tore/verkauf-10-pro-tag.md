# Tore: «10 Verkäufe am Tag» — Schritte 1–3 (Betreiber 25.11.2026 «ja dann bis 3, sehr intensiv»)

Ausgangslage GEMESSEN 25.11. (30 T): 4'448 Besuche → 83 Warenkorb → 44 Kasse → 16 bezahlt (0,36 %), Ø Bestellung CHF 39.87,
Bruttogewinn CHF 235.82 auf 19 Bestellungen (≈ CHF 12.40 je Bestellung, ohne Versanderlös).
Prüfen: `python3 tools/tore.py dropship/tore/verkauf-10-pro-tag.md`. Umsetzungs-Tore (T6 ff.) werden nach der Analyse ergänzt, VOR dem Umsetzen.

- [ ] T1: Kassen-Abbruch-Analyse mit Zahlen liegt vor (Bericht mit Abschnitt «Befunde» und «Massnahmen»)
    PRUEFUNG: f=dropship/verkauf-2511/ANALYSE.md; test -s $f && grep -q "## Befunde" $f && grep -q "## Massnahmen" $f && echo TOR-OK
    ERWARTET: TOR-OK
- [ ] T2: Gewinn-je-Bestellung-Analyse mit Zahlen liegt vor (Abschnitt «Gewinn je Bestellung»)
    PRUEFUNG: grep -q "## Gewinn je Bestellung" dropship/verkauf-2511/ANALYSE.md && echo TOR-OK
    ERWARTET: TOR-OK
- [ ] T3: Werbetest-Anleitung für den Betreiber liegt vor (Budget, Dauer, Produkte, Abbruchregel, Messung)
    PRUEFUNG: f=dropship/verkauf-2511/WERBETEST-ANLEITUNG.md; test -s $f && grep -q "Abbruch" $f && grep -q "CHF 10" $f && echo TOR-OK
    ERWARTET: TOR-OK
- [ ] T4: Betreiber startet den Werbetest (Google Ads) nach der Anleitung
    HAND: Betreiber-Klick in Google Ads (Konto 7198263241); danach misst die Sitzung Klickpreis und Kosten je Verkauf
- [ ] T5: Handy-Produktseiten zeigen die Kaufleiste schon im ersten Bildschirm (vorher 0/1, Knopf bei 1'005 px)
    PRUEFUNG: timeout 300 /opt/node22/bin/node tools/kaufleiste_pruefen.mjs "https://luxestyle.ch/products/beruhigungsspielzeug-fur-haustiere-617100?cb=$(date +%s)" "https://luxestyle.ch/products/roter-weihnachtssweater-fur-hunde-442176?cb=$(date +%s)" 2>&1 | tail -1
    ERWARTET: /KAUFLEISTE (\d+)\/\1 sichtbar/
- [ ] T6: Live-Theme trägt alle drei Änderungen (Kaufleiste früh + Auswahl-Sprung, Hilfe-Knopf kompakt auf Produktseiten, Masstabelle scrollt)
    PRUEFUNG: python3 -c "import sys;sys.path.insert(0,'automation');from seo_autopilot import gql;n={x['filename']:x['body']['content'] for x in gql('{theme(id:\"gid://shopify/OnlineStoreTheme/214565814663\"){files(filenames:[\"assets/sticky-add-to-cart.js\",\"sections/lux-assistent.liquid\",\"layout/theme.liquid\"],first:3){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}')['theme']['files']['nodes']};ok=['#earlyMobile' in n['assets/sticky-add-to-cart.js'],'#hatAuswahl()' in n['assets/sticky-add-to-cart.js'],'data-seite=\"produkt\"' in n['sections/lux-assistent.liquid'],'.ls-masstabelle { max-width: 100%' in n['layout/theme.liquid']];print(ok);assert all(ok);print('TOR-OK')"
    ERWARTET: TOR-OK
