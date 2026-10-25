# LuxeStyle: Kontingentmeldung und öffentliche Indexierungsgrundlagen

25.10.2026, Abendlauf. **Nur gelesen; keine Indexierungsanträge, Sitemap-Einreichung oder Umgehungsversuche.** Die Inhabermeldung «2kontingentüberschritten» ist Hundebetten zugeordnet. Die führende «2» wird hier nicht als nachgewiesene Anzahl von Anträgen oder als Quotenhöhe interpretiert.

## Was die offizielle Google-Seite tatsächlich sagt

Genau eine Seite über Firecrawl frisch gelesen: [Ask Google to recrawl your URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), HTTP 200. Auf der Seite genannter Dokumentstand: 10.12.2025.

> “Keep in mind that there's a quota for submitting individual URLs and requesting a recrawl multiple times for the same URL won't get it crawled any faster.”

Google bestätigt ein Kontingent für einzelne URL-Einreichungen. Wiederholte Anträge für dieselbe URL beschleunigen das Crawling nicht. **Die gelesene Seite nennt keine Quotenhöhe, keinen Quotenzeitraum und keinen Resettermin.** Eine Zusage «morgen geht es wieder» wäre damit unbelegt.

> “Crawling can take anywhere from a few days to a few weeks.”

Das ist eine Aussage zur möglichen Crawlingdauer; es ist keine Aussage darüber, wann ein Kontingent zurückgesetzt wird. Ob frühere Anträge angenommen wurden oder Hundebetten schon indexiert ist, bleibt unbekannt. Die Meldung belegt weder einen 404-/noindex-Fehler noch eine Robots-Sperre der Seite.

## Zwei bekannte Shopdateien gezielt geprüft

Die beiden GETs liefen am **25.10., 19:07:58–19:07:59 CET**. Keine Anmeldung, Formübermittlung oder Google-Interaktion.

| URL | Ergebnis | Begrenzte Aussage |
|---|---|---|
| https://luxestyle.ch/robots.txt | HTTP 200; `text/plain; charset=utf-8`; 3'638 Bytes; vollständig innerhalb des Leselimits | Enthält `Sitemap: https://luxestyle.ch/sitemap.xml`. Im `User-agent: *`-Block steht `Allow: /`; spezifische Sperren für unter anderem Transaktions-, Sortier- und Mehrfachfilterpfade bleiben relevant. Daraus folgt keine pauschale Freigabe jeder URL und kein Indexierungsstatus. |
| https://luxestyle.ch/sitemap.xml | HTTP 200; `application/xml; charset=utf-8`; 15'872 Bytes; vollständig innerhalb des Leselimits | Wohlgeformtes XML mit erwartetem `sitemapindex` und Sitemap-Namespace; 123 eindeutige direkte Unter-Sitemap-Verweise, jeweils absolute HTTPS-URLs auf luxestyle.ch. Grundstruktur geprüft, keine externe XSD-Prüfung. |

Die Indexdatei enthält zwei Collection-Sitemap-Verweise für Haupt- und französische Sprachfassung. **Keine dieser Unterdateien wurde abgerufen**, weil dies für die Prüfung des Robots-Verweises und des Sitemap-Indexes nicht erforderlich ist. Ebenso keine Produkt-Sitemap, keine Pagination, kein Crawl und kein neuer Abruf der Hundebetten-Seite. Ob eine bestimmte Collection in einer Unterdatei steht, wurde nicht behauptet.

## Was offen bleibt und als Nächstes zählt

Die öffentliche Sitemap ist erreichbar und korrekt referenziert. Ob sie in Search Console eingereicht, von Google gelesen oder verarbeitet wurde, bleibt **unbekannt**. HTTP 200 und XML-Struktur beweisen keine Indexierung. Die offizielle Seite nennt Sitemaps als Weg, Google viele URLs entdecken zu lassen; daraus entsteht hier kein neuer Einreichungsauftrag.

Weitere manuelle Anträge bleiben ausgesetzt. Bestehende Inhabermeldungen zu früher erledigten URLs bleiben erhalten; keine davon wird als eigener neuer Google-Nachweis ausgegeben. Sinnvolle unabhängige Arbeit sind die bereits vorbereiteten Menü-/Seitenverbesserungen. Eine spätere legitime URL-Prüfung kann den tatsächlichen Status klären; es wurde kein erneuter Antrag, kein Konto-/API-Wechsel und kein Authflow gestartet.

Exakte Lesezeiten, HTTP-Header, Quellhashes, Scope und Grenzen: [BELEGE.json](BELEGE.json). Gesicherte Quellen: [Google-Text](google-recrawl-source.md), [robots.txt](robots.txt), [sitemap.xml](sitemap.xml). Aktuelle Übergabe und Tagesprotokoll aus `HANDOFF-SOURCE.json` wurden zuerst berücksichtigt. Keine Tageskennzahlen, Shop-/Theme-/Flow-/Budget-/DNS-Einstellung geändert.
