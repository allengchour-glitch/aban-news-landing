# LuxeStyle: Sichtbarkeit gezielt ausbauen

Stand 27.10.2026, Prüfung ab 18:24 CET (Europe/Zurich). Eine weitere Produktbeschreibung tatsächlich verbessert, vier konkrete Kategorie-Felddiffs zur Freigabe fertiggestellt und einen vorhandenen lokalen SEO-Prüfer verbessert. Kein belegter Ranking-, Indexierungs- oder Verkaufszuwachs aus dieser Arbeit.

## Was jetzt live verbessert ist

Die [Ohrstecker «Lumière»](https://luxestyle.ch/products/ohrstecker-lumiere-elegante-high-end-studs) haben eine produktspezifische Beschreibung mit geometrischer Gestaltung, der echten Auswahlbezeichnung «Silber», Stylinghilfe und erhaltenen Kategorie-Links. Sieben aktuelle Bilder wurden zweimal unabhängig angesehen, ein Titelbild zusätzlich durch den Hauptagenten. «Silber» ist eine Optionsbezeichnung, kein Materialnachweis. Unbelegte Komfort-, Qualitäts- und Lieferzusagen wurden im Beschreibungstext entfernt. Keine neuen Masse, Materialien, Prüfzeichen oder Wirkungsversprechen.

Genau ein Write, nur `descriptionHtml`. Frische native Rücklesung, öffentliches Produkt-JSON und sichtbares HTML bestätigen den Zieltext; alle anderen gelieferten nativen Felder unverändert. Heute insgesamt 14 und kumuliert **16 belegte Beschreibungen**. Der übrige Katalog ist nicht erledigt. Die vorhandene Arbeitsliste bleibt erhalten: 22 Events, darunter ein neuer Versuchscheckpoint und ein neuer Abschluss; die früheren 20 Events exakt unverändert. Quellenbasis ist weiterhin der historische ACTIVE-Snapshot, kein neuer Live-Katalogexport.

## Wichtigste nächste Verbesserungen

| Priorität | Konkreter Befund | Vorbereitete Verbesserung / Status |
|---|---|---|
| 1 | Das aktuelle öffentliche Versand-JSON-LD nennt kostenlose CH-Lieferung ab CHF 40.50; verbindlich öffentlich CHF 50 | Bestehenden engen Template-Diff 40.49→49.99 und 40.5→50 zur Freigabe erhalten. Heute öffentliche Gegenprobe, native Templatequelle zuletzt am 26.10. bestätigt. Keine Tarife geändert; interne CHF 45 erhalten |
| 2 | Technik und Wohnen nutzen fast gleiche Service-Metatexte statt konkreter Kategorieorientierung; Einleitungen nennen ungeprüfte tägliche Neuheiten beziehungsweise feste Artikelzahl | Je eine spezifische Meta-Description und ein neuer erster Absatz. Beide nativen Collection-IDs, vollständige Beschreibungstexte und SEO-Ausgangswerte aktuell bestätigt. Vier genaue Felddiffs, **nicht angewendet** |
| 3 | Ein weiterer Ring zeigt zwei unterschiedliche Formen; die Auswahl heisst nur «Variante 1/2» | Konkreter Quellenblocker statt beliebiger Grössen-/Material-/Ausführungsbehauptung. CJ-SKUs sind dokumentiert; genaue Original-Variantenbindung vor Textübernahme nötig. Kein Ringwrite |
| 4 | Der lokale SEO-Prüfer konnte einen Titel im Template/Frame als Seitentitel zählen | Bestehenden Kopf-Scanner für echte Titel weiterentwickelt. 73 Baseline- und danach 88 Tests grün; unabhängige Zusatzfälle ebenfalls bestanden. Vollständige Reviewfassung und Patch, **nicht produktiv integriert** |

### Die zwei Kategorie-Metatexte

**Technik:** Elektronik & Technik bei LuxeStyle: Ladegeräte, Audio und Zubehör entdecken. Vergleiche Anschlüsse, Stromversorgung und die Angaben zur Kompatibilität.

**Wohnen:** Wohnen & Dekoration bei LuxeStyle: Beleuchtung, Aufbewahrung und Wohntextilien entdecken. Vergleiche die Angaben zu Abmessungen und Ausführung.

Die vollständigen Vorher-/Nachher-Felder liegen in `SICHTBARKEIT-KATEGORIE-DIFFS-20261027.json`. Nur der erste Beschreibungsabsatz wird ersetzt; sämtliche Folgebytes und Links bleiben erhalten. Titel, H1, Handles, Produktauswahl, Preise, Varianten, Regeln und Einstellungen bleiben erhalten. Die Änderungen bereinigen nicht sämtliche weiterhin ungeprüften Serviceaussagen in anderen Seitenteilen.

## Was bereits funktioniert und erhalten bleibt

Neun eindeutige Landingpages gezielt per öffentlichem GET geprüft: Startseite, Technik, Wohnen, Damenschuhe, Herrenmode, Schuhe, Beauty, Parfum und Küche. Alle HTTP 200, jeweils passender deklarierter Canonical, Seitentitel und Haupt-H1; kein gelieferter Root-Head-noindex beziehungsweise X-Robots-Tag. Firecrawl unabhängig für Startseite und drei Kategorien. Die aggregierte Scrape-Angabe `robots=none` stammt aus eingebettetem Kontoinhalt und wird nicht als Root-noindex verwendet. Das ist keine vollständige Seitenprüfung des Shops.

robots.txt und sitemap.xml HTTP 200. Der Sitemapindex enthält 123 eindeutige Referenzen. Genau eine deutsche Collection-Teilsitemap frisch gelesen: 792 eindeutige deklarierte URLs; alle 30 ausgewählten Collection-Links des Startseiten-Hauptinhalts plus Damenschuhe darin vorhanden. Keine Produkt-Sitemap-Pagination und kein Vollcrawl. Weder Sitemap-Präsenz noch HTTP 200 beweisen Google-Indexierung, die von Google gewählte Canonical oder Ranking. Kein erneuter Indexierungsantrag und keine Quota-Umgehung.

Die richtige Ausbaufolge ist: diese belegten Daten-/Suchtextkonflikte beheben, danach anhand tatsächlicher Search-Console-Abfragen passende Kategorien priorisieren und deren Produktinformationen fortlaufend vervollständigen. Nicht alle 792 Kategorien ungeprüft zur Indexierung einreichen oder Keywordseiten vervielfachen. Search-Console-Ränge, Suchvolumen, Klickrate, Backlinks und Core Web Vitals wurden in diesem Lauf nicht gemessen; deren Wirkung bleibt unbekannt. Der HTML-Umfang allein ist kein Performanceurteil.

## Tageszwischenstand

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Produkttexte | Die 13 früheren heutigen und zwei gestrigen Abschlüsse erhalten; einen neuen bild-/quellengeprüften Ohrsteckertext geschrieben | Heute 14, insgesamt 16. Ein neuer nativer/JSON-/HTML-Abschluss; nicht der ganze Katalog |
| Sichtbarkeit | Neun Landingpages, robots/Sitemapindex und eine Collection-Sitemap begrenzt gegengeprüft | Erreichbarkeit und deklarierte Canonicals bestätigt; Google-Indexierung/Ranking unbekannt |
| Suchtexte / Schema | Zwei Kategorien nativ und öffentlich abgeglichen; vier Felddiffs vervollständigt; alten Versandkonflikt öffentlich erneut bestätigt | Konkrete Entwürfe, keine Kategorie-/Meta-/Theme-/Tarifänderung |
| Prüfer / Quellen | Lokalen Titelscanner verbessert, gegen Baseline und unabhängig geprüft; einen Ring als Ausführungsfall dokumentiert | 88 Tests plus unabhängige Zusatzfälle bestanden; kein Deployment und kein Ringwrite |
| Konten / Routine | Shop und Metricool mit sechs Identitäten frisch verifiziert; frühere Tageskennzahlen/Flowbefunde erhalten | Passend. Keine weiteren Kennzahl-/Flow-/Verkaufsreports; keine neue Social-Publikation, kein Workflowstart |

## Grenzen und Übergabe

Ausdrückliche Livefreigabe besteht für Produktbeschreibungen. Kategorie-/SEO-/Theme-Diffs bleiben gemäss Inhabervorgaben konkrete Freigabeentwürfe. Es wird weder dieselbe Beschreibung noch der bereits genehmigte Footer-/DNS-Einmalauftrag erneut zur Genehmigung vorgelegt. Keine neuen DNS-/Shop-/Feed-/Flow-/Budget-/Rabattänderungen, Kundenkontakte, bezahlten Renders, Installationen oder Deployments. CHF 50/45 und account.luxestyle.com.co erhalten.

Derselbe professionelle 18-Sekunden-Master bleibt offen; kein neuer Film in diesem Sichtbarkeitsschritt. Keine Bild-/Filmrechte, Produkt-/Stromzuordnung oder Qualitätsabnahme aus einem verbesserten Text abgeleitet. Keine SEO- oder Verkaufsversprechen.

Belege: `SICHTBARKEIT-BELEGE-20261027.json`, `SICHTBARKEIT-PRODUKTTEXT-20261027.json`, `SICHTBARKEIT-KATEGORIE-DIFFS-20261027.json`, `SICHTBARKEIT-PREFLIGHT-20261027.patch` und Reviewquellen unter `sichtbarkeit-20261027/preflight/`. Der Code ist ein lokaler Prüfentwurf, kein deployter Wächter. Bereits vorhandene Versandkorrektur als `SICHTBARKEIT-VERSAND-ENTWURF-20261027.diff`; kein neuer Änderungsauftrag und keine bestätigte produktive Umsetzung.
