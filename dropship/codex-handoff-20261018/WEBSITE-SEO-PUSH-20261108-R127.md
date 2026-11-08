# LuxeStyle Website- und SEO-Push – 08.11.2026, R127

Stand: 00:55 Uhr Europe/Zurich. Dieser Lauf übernimmt vorhandene Claude-/Codex-Arbeit, prüft sie gegen den aktuellen Live-Shop und ergänzt nur reviewbare Schutzregeln. Es wurde nichts in Shopify, im Theme oder auf Social Media live geschrieben.

## Identität und Tagesgrenze

- Shopify-Admin wurde frisch als `LuxeStyle`, `au3j0y-hq.myshopify.com`, CHF und Primärdomain `luxestyle.ch` / `https://luxestyle.ch` bestätigt.
- Metricool wurde frisch als brandId `6227837`, Europe/Zurich und mit den sechs erwarteten Kanalidentitäten bestätigt: Instagram/Threads/TikTok `luxestyle.ch`, Facebook `1049840534888592`, Pinterest `luxestyleCH`, YouTube `UCSfCEYjAsdOyYxyfTClXRZA`.
- Tageskennzahlen, Klaviyo-Flows und Bestellungen wurden in R127 nicht erneut gelesen. Der beendete Kauf-Watch blieb beendet.

## Semrush und Firecrawl

- Semrush ist verbunden, doch aktuelle Projekt-, Audit- und Domainabfragen endeten mit `no_api_units`, `retryable=false`. Historische Semrush-Zahlen wurden nicht als aktueller Befund wiederholt; keine blinden Wiederholungen.
- Firecrawl mapte `luxestyle.ch` begrenzt auf höchstens 200 URLs ohne Queryparameter; Map-ID `01a1b863-52a9-705d-9e71-f5932608aa60`. Danach wurden zwölf repräsentative Start-, Collection-, Produkt- und Sprachseiten strukturiert geprüft.
- Der beobachtete Kontostand sank von 1’615 auf 1’485 von 5’000 Credits. Die Differenz von 130 Credits ist der Saldo des Arbeitsfensters; der Kontostand kann sie nicht einzelnen URLs oder Clients zuordnen.
- Firecrawl normalisierte eine angefragte `/fr/products/...`-Adresse teilweise auf die deutsche Produkt-URL. Für Locale-Befunde ist deshalb die direkte Roh-HTTP-Gegenprobe massgebend; künftige Automatik muss `sourceURL` und Ziel-URL vergleichen und bei verlorenem `/fr/` abbrechen.

## Belegte Live-Befunde

- `/fr`, `/fr/pages/versand-lieferung`, `/fr/pages/rueckgabe`, `/fr/pages/impressum` und `/fr/pages/alle-kategorien` liefern HTTP 200, deklarieren Französisch und sind selbst-kanonisch, enthalten aber deutsche oder gemischte Inhalte. In der Stichprobe fehlt dort `noindex`.
- Die geprüften französischen Produkt- und Collection-Seiten tragen `noindex, follow`, bleiben aber selbst-kanonisch und per `hreflang=fr` verlinkt. Das reduziert die Indexierung dieser Seitentypen, löst die Sprach- und Hreflang-Konsistenz jedoch nicht.
- Der Sitemap-Index enthält 62 französische Child-Sitemaps: 57 Produkt-, zwei Collection-, je eine Page-, Blog- und Article-Sitemap. Die französische Page-Sitemap enthält 105 URLs.
- Zwölf Rohseiten waren rund 869 KB bis 1,72 MB gross und enthielten 779 bis 818 eindeutige interne URLs; selbst Produktseiten lagen bei rund 781. Das ist eine begrenzte Messung, kein Katalogaudit.
- Die gezielte MAIN-Gegenprobe bestätigt die Ursache: Theme `gid://shopify/OnlineStoreTheme/213013037447`, zuletzt 07.11. 19:56 UTC, verwendet `header-group` mit `main-menu`. Startseite 1’043’816 Bytes/813 eindeutige Rohlinks, Produktseite 1’217’887/778, Collection 1’649’323/799 und Selbstgestalten 1’348’375/794. Der Header allein rendert 1’487 Anker/751 eindeutige Ziele, der Produkt-Hauptinhalt nur zehn/acht. Mobile und Desktop geben die vollständige Navigation doppelt aus.
- Ein blindes Gruppenlimit ist nicht sicher: Cap 6 würde 83 URLs nur von rund 781 auf 698 reduzieren, Cap 4 insgesamt 192. Mobile Gruppen verwenden `summary` ohne eigenes `href`, und die Repo-Dokumentation warnt davor, Links zu entfernen. Deshalb kein Menü-Patch oder Theme-Write.
- 45 gleichmässig verteilte Sitemap-URLs und zwölf zusätzliche interne Ziele lieferten HTTP 200 ohne Redirect. JSON-LD war auf allen zwölf Rohseiten syntaktisch gültig.
- Die Versandtexte bleiben widersprüchlich: DE-Blitzversand nennt 2–3 Werktage, die französische Variante 1–2, während globale Texte weitere Zeitfenster nennen. Ohne aktuellen Fulfillment-/Lagerbeleg wurde nichts vereinheitlicht.
- Die aktuelle MAIN-Theme-Gegenprobe fand in `theme.liquid` mit Checksum `cf5ee5a64ca940edf4120b09c073e58f` und `meta-tags.liquid` mit Checksum `de2a6f9cf9200f49fe65ad6ca42f1643` je null `hreflang`-/`alternate`-Quellen. Die Alternates kommen serverseitig über `content_for_header`; ein Theme-Patch wäre deshalb nicht belegt. Eine native Locale-/Markt-Einstellung bleibt ausserhalb dieses Auftrags.

## Doppelarbeit vermieden

- Der doppelte Collection-Satz auf `blitzversand-schweiz` ist live nicht mehr vorhanden. Ursache und exakter Fix sind bereits in Claude-PR 2912 enthalten; kein zweiter Patch.
- Die früher beanstandeten TikTok-Kuscheldecken-/Halterungslinks sowie «Versand nur in der Schweiz» waren auf den drei gezielt geprüften Produktseiten nicht mehr vorhanden. Kein erneuter Produkt- oder Theme-Write.
- Alte breite SEO-Writer, datierte Theme-Schreiber und der bisherige Workflow mit bis zu 150 Live-Writes wurden nicht gestartet.

## Reviewbare Korrekturen

### FR-Eindämmung

Draft-PR [2916](https://github.com/allengchour-glitch/aban-news-landing/pull/2916), Head `b2bd3edb9b53fd268797937982947200bc3d7313`, liegt gestapelt auf Claude-PR 2912. Er erweitert den temporären `noindex, follow`-Schutz auf `/fr`, französische Pages und Listenansichten, migriert nur den exakt bekannten V1-Block und enthält ein bewusst ungesetztes Freigabe-Metafeld für eine spätere vollständige Übersetzungsabnahme. 44/44 statische und echte LiquidJS-Renderprüfungen sowie Syntax- und Diff-Prüfung sind grün. Kein Theme-Write, Publish oder Merge.

### Sicherer SEO-/Website-Push

Draft-PR [2918](https://github.com/allengchour-glitch/aban-news-landing/pull/2918), Head `22d109fff1a6119112a1423fd2da6ed77d37e32a`, enthält:

- manuellen SEO-Review für exakt 1–6 Produkt-IDs, standardmässig `DRY_RUN=1`, ohne Katalogpagination oder Telegram; Shop-Identität, Prewrite-Gegenprobe, Shopify-SEO-Replace-Semantik und Readback werden geschützt;
- deterministische, kollisionssichere ASCII-Handles für drei CJ-Writer; Emoji und Sonderzeichen gelangen künftig nicht mehr in neu erzeugte Handles, fehlende CJ-Produkt-IDs werden übersprungen;
- globale Shopvideos nur auf der Startseite; Produktseiten lesen ausschliesslich `product.metafields.luxe.video_url`. Der direkte Startseiten-Snippetpfad bleibt ausdrücklich freigegeben.

Die lokale Suite bestand 37/37 SEO-, Handle- und Video-Scope-Prüfungen; die vorhandenen Videoquellen-Regressionen waren ebenfalls vollständig grün. Ein unabhängiges Code-Review fand vor dem Push zwei Blocker: fehlende Startseitenfreigabe im direkten Snippetpfad und die falsche CJ-Handle-Identität `productSku`. Beide wurden korrigiert und erneut geprüft. `automation/ci_simulation.sh` konnte lokal wegen verweigertem `unshare` nicht laufen. In GitHub waren LuxeStyle-Tests, beide `check`-Jobs, Lagerbestand, Selbstgestalten und der Cloudflare-Pages-Job erfolgreich. `Pre-deploy validation` endete nach 8:11 Minuten im repo-weiten Schritt `Validate HTML files` als `cancelled`, ohne konkrete fehlgeschlagene Assertion oder Logausgabe; spätere Schritte wurden übersprungen. Drei bekannte Workers-Builds blieben rot. Beim erfolgreichen Pages-Job waren Checkout und `wrangler pages deploy` ausdrücklich `skipped`; weder der Job noch die abgebrochene Pre-deploy-Prüfung belegen ein Deployment.

### Text-only-Social-Schutz

Draft-PR [2919](https://github.com/allengchour-glitch/aban-news-landing/pull/2919), Head `732c251fb8aa38de5ffac888087387c5c1d8fe92`, liegt gestapelt auf PR 2914. Er entfernt Voiceover-/Piper-Pfade aus der aktiven LuxeStyle-Reel-Konfiguration, verlangt für Musik `automation/music/luxe-premium.wav` samt Rechteflag und lässt alte bezahlte oder Voiceover-Workflows fail-closed enden. Die erste GitHub-Gegenprobe scheiterte im reinen Trockenlauf, weil das Ubuntu-26-Abbild kein `ffmpeg` bereitstellte. Der Folgecommit verschob Tool-/Fontchecks hinter Voice-/Rechte-Gates und führt sie nur noch bei einem echten Render vor dem Fetch aus. 28/28 lokale Prüfungen sind grün. Der automatische Run `42427691007` ist vollständig `SUCCESS`: `tests`, `lagerbestand` und `selbst-gestalten` einschliesslich des zuvor roten Schritts `Renderer stays text-only` sind grün. Es gab weiterhin keinen Merge, Dispatch, Render, Post oder Deploy.

## Offene nächste Schritte

1. PR 2916 erst nach Review von PR 2912 und vollständiger FR-Abdeckung zusammenführen; Hreflang/Sitemaps und vollständige Übersetzung bleiben separat offen.
2. PR 2918 anhand der erfolgreichen Kernprüfungen und der abgebrochenen Pre-deploy-Prüfung reviewen; weder alten breiten SEO-Workflow noch Live-Apply starten. Ein späterer Produktwrite braucht konkrete 1–6 IDs und neue inhaltliche Freigabe.
3. PR 2919 nach dem vollständig grünen GitHub-Gesamtlauf inhaltlich reviewen; weiterhin keinen Render oder Social-Write ohne alle bestehenden Material-, Rechte-, Identitäts- und Kanalbelege starten.
4. Vor einem Menü-Patch die 84 Gruppen-Landeseiten und Child-Abdeckung prüfen, mobile «Alle in …»-Ziele sowie active/current erhalten und erst in einem unveröffentlichten Theme mit Tastatur-, Mobil-, Desktop- und No-JS-QA testen.
5. Versandtexte erst nach produkt- und lagerbezogenem Fulfillmentbeleg angleichen.

## Tatsächliche Änderungen dieses Laufs

Drei Draft-PRs beziehungsweise Branch-Pushes wurden reviewbar gespeichert: PR 2916, PR 2918 und PR 2919. Es gab keinen Shopify-Produktwrite, Theme-Write, Metricool-Post, keine Veröffentlichung, keinen manuellen Workflow-Dispatch, Merge, Render, keine Kundenansprache und keine Änderung an Flow, DNS, Rabatt, Budget, Shop-Einstellung oder Versandgrenze. Automatische PR-Prüfungen sind Prüfungen und kein Nachweis produktiver Ausführung.
