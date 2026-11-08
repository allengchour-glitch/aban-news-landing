# R153 – Plugin-gestützter Ranking-Push

Stand: 08.11.2026, 22:02 Europe/Zurich. Scope: ausschliesslich LuxeStyle.

## Eingesetzte Plugins

Firecrawl prüfte eine begrenzte Auswahl öffentlicher Seiten, HYPD las Search Console und Merchant Center, vidIQ prüfte die YouTube-Verbindung und öffentliche Suchnachfrage. Shopify wurde für genau eine belegte Produktverbesserung verwendet. Die Identitäten passten für `luxestyle.ch`, Search Console und Merchant-Shop `5797470070`. vidIQ lieferte keinen autorisierten Kanal; deshalb gab es dort keine privaten Analysen oder Änderungen.

## Belegter Suchhebel und Live-Änderung

Search Console zeigte für 09.10.–05.11.2026 die Suchanfrage «elektrischer futterspender für katzen» mit 45 Impressionen, 0 Klicks und durchschnittlicher Position 18,0222 auf der bereits indexierten Produktseite `futterautomat-fur-katze-527488`. Die URL-Inspection war grün: abrufbar, indexiert, robots erlaubt, Mobile-Crawl und übereinstimmender Google-/User-Canonical. Das Wort «elektrisch» war am Produkt nicht belegt und wurde bewusst nicht übernommen.

Produkt `15523986473345` wurde eng aktualisiert:

- Titel/H1: «Futterautomat für Katze» → «Automatischer Futterspender für Katzen»
- SEO-Titel: «Automatischer Futterspender für Katzen | LuxeStyle CH»
- SEO-Beschreibung: «Automatischer Futterspender für Katzen mit Fütterungsfunktion. Aus Edelstahl gefertigt und für die Futterausgabe während deiner Abwesenheit.»
- Der produktspezifische Block mit «Lieferung 10–20 Werktage» und Symbolen wurde entfernt.

Handle/URL, Produkt- und Varianten-ID, SKU, ACTIVE-Status, CHF96.90, Bilder, Tags und Inventory-Felder blieben unverändert. Menge0 bleibt bei `tracked=false`/`CONTINUE` kein Bestands- oder Lieferbeleg. Es wurden keine elektrischen Eigenschaften, Reviews, Lieferzeiten oder Swiss-made-Angaben ergänzt.

Shopify-Admin-Readback war ohne UserError. Firecrawl las danach öffentlich HTTP200, Sprache `de`, den neuen Titel, H1 und die neue Meta-Description; `og:url` blieb die saubere Produkt-URL. Readback-Scrape: `01a1bcf5-901f-7766-9f99-d5e17cdda9b7`.

## Weitere bestätigte Ranking-Blocker

- Jede geprüfte Seite rendert rund 746 verschiedene Collection-Links serverseitig; der HTML-Umfang lag in drei Beispielen zwischen rund 1,04 und 1,72 MB. Das schwächt die Informationsarchitektur und erhöht Crawl-/Renderaufwand. Eine Reduktion der globalen Navigation braucht zuerst Theme-Preview sowie Desktop-/Mobile-QA.
- `/fr/`, `/fr/pages/selbst-gestalten` und zwei geprüfte FR-Produkte enthalten weiterhin deutsche SEO- oder Haupttexte. Noindex bei den Produkten vermindert Duplicate-Risiko, verhindert aber FR-Rankings. Noindex darf erst nach vollständiger fachlicher Übersetzung entfernt werden.
- Zwei aktuelle Merchant-Angebote sind als `fr` markiert, liefern aber deutsche Inhalte. Drei eng geprüfte Legacy-Angebote sind in CH freigegeben und in LI wegen fehlender Versanddefinition abgelehnt. Keine Versand- oder Merchant-Einstellung wurde geändert.
- Eine alte Emoji-Produkt-URL steht noch in Firecrawls Map, liefert live aber 404. Vor Redirect oder Sitemap-Massnahme muss die aktuelle Produkt-Sitemap gezielt gegengeprüft werden.
- Judge.me lädt im gerenderten DOM weiterhin einzelne englische UI-Texte. Keine App-/Shop-Einstellung wurde verändert.
- vidIQ konnte den erwarteten LuxeStyle-Kanal nicht als autorisiert bestätigen. Der Produktfilm bleibt zusätzlich durch fehlende professionelle Master-MP4 und Rechte blockiert.

Keine Budgets, Preise, Rabatte, Versand-, Merchant-, Locale-, Shop-, Flow-, DNS- oder Social-Einstellungen wurden verändert. Aus Impressionen wurde kein Verkauf abgeleitet.
