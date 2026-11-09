# R157 – Theme-/SEO-Ursachenanalyse

Stand: 09.11.2026, 20:25 UTC. Umfang: Shopify- und Storefront-Lesungen sowie ein lokaler Patch-Entwurf. Es gab keine Theme-, Menü-, Workflow-, Übersetzungs- oder Deployment-Schreibaktion.

## Identität und geprüfter Stand

- Der verbundene Shopify-Shop wurde als LuxeStyle auf `luxestyle.ch` bestätigt.
- Aktives Theme: `gid://shopify/OnlineStoreTheme/213013037447`, Rolle `MAIN`, Name «LuxeStyle – Schrift und Banner 02.11.2026».
- Betroffene Live-Datei `snippets/meta-tags.liquid`: MD5 `c7e3f66093cbdb59f29210b62ebd1447`, zuletzt geändert am 08.11.2026 um 23:01:50 UTC.
- Hauptmenü: `gid://shopify/Menu/310224093569`, Handle `main-menu`.

## Ursache von `og:image` mit HTTP

Die Ursache ist exakt in `snippets/meta-tags.liquid` lokalisiert:

- Zeile 122 erzeugt für `page_image` absichtlich `content="http:{{ page_image | image_url }}"`.
- Zeile 126 liefert direkt danach dieselbe Datei als `og:image:secure_url` mit `https:`.
- Der Logo-Fallback wiederholt dasselbe Muster in den Zeilen 141 und 145.

Dieses Muster stammt aus Horizons Meta-Snippet und ist kein CDN- oder Redirect-Fehler. Der öffentliche Audit hatte jeweils das erste `og:image` ausgewertet. Tatsächlich besitzen alle fünf geprüften Seiten zusätzlich ein funktionierendes `og:image:secure_url` über HTTPS. Die Startseite hat ausserdem ein zweites, hart codiertes HTTPS-`og:image` in `layout/theme.liquid`; dadurch stehen dort zwei unterschiedliche `og:image`-Tags.

Der lokale Patch `og-image-https.patch` ändert nur die beiden primären `og:image`-Ausgaben von `http:` auf `https:`. `og:image:secure_url`, Titel, Beschreibungen, Französisch-Inhalte und alle anderen Theme-Teile bleiben unverändert. Der Patch ist an den oben genannten Quelldigest gebunden und wurde nicht angewendet.

## Ursache der 744 bis 751 Collection-Ziele

Die Ursache ist keine Collection-Pagination im Theme. Sie besteht aus einem sehr grossen administrativen Hauptmenü und dessen serverseitiger Ausgabe für zwei responsive Varianten:

- Aktuelle Admin-Lesung: 784 Menüeinträge auf drei Ebenen, davon 21 auf Ebene 1, 243 auf Ebene 2 und 520 auf Ebene 3.
- 779 Einträge zeigen auf Collections; sie ergeben 742 eindeutige Collection-URLs.
- `blocks/_header-menu.liquid` rendert den Desktop-Baum vollständig. `snippets/mega-menu-list.liquid` läuft durch Kinder und Enkel.
- `snippets/header-drawer.liquid` rendert denselben Baum zusätzlich für das mobile Drawer-Menü, ebenfalls inklusive Kinder und Enkel.
- `snippets/luxe-studio-navigation-link.liquid` ergänzt «Selbst gestalten», wenn der Menübaum dieses Ziel nicht enthält.
- Der leere Warenkorb enthält `/collections/all` zweimal. Damit hat jede geprüfte Kopfzeile 744 eindeutige Collection-Ziele.
- Der Seiteninhalt ergänzt je URL weitere, teilweise schon im Menü vorhandene Collection-Links. Deshalb schwankt die Gesamtzahl zwischen 744 und 751 eindeutigen Zielen. In allen fünf gespeicherten Seiten bleibt die Kopfzeile konstant bei 744 eindeutigen Zielen und 1473 Collection-Link-Instanzen.

Die Repo-Historie zeigt die Automation als Quelle des Wachstums: Die Sicherung vor dem Tassen-Umbau hatte 218 Knoten und 190 eindeutige Collection-Ziele. Die folgenden Taxonomie- und `menuUpdate`-Läufe erweiterten den gesamten Baum schrittweise; spätere Sicherungen liegen bei 742 bis 784 Knoten. Besonders relevant sind die Menü-Automationen für Bereiche, Wohnen, Jacken/Kleider, Kleidergruppen sowie Küche/Geschirr. Das Theme gibt diese gespeicherte Struktur nur aus.

## Präziser Blocker für eine Linkreduktion

Es gibt keinen kleinen Theme-Patch, der die Zahl von 742 Menü-Zielen senkt und zugleich alle heutigen Desktop-/Mobil-Navigationswege erhält. Eine Leerraum-Minifizierung von `header-drawer.liquid` kann das HTML verkleinern, ändert aber weder die 744 eindeutigen Header-Ziele noch die Verteilung interner Links. Das Auslassen der dritten Ebene würde zahlreiche sichtbare Navigationsziele entfernen. Ein Laden erst nach Nutzerinteraktion wäre ein Architekturwechsel mit JavaScript-, Tastatur-, Screenreader- und Fehlerfallprüfung.

Der sichere nächste Entwurfsschritt ist deshalb eine getrennte Informationsarchitektur-Prüfung: priorisierte, indexierbare Kategorie-Hubs als Hauptmenü, tiefe Ziele auf den jeweils passenden Hub-Seiten, danach Theme-Vorschau auf Desktop und Mobil. Vor einem späteren Menü-Write müssten der vollständige Baum frisch gelesen, die aktuelle Struktur gegen einen Digest geprüft, alle entfernten Ziele auf alternative interne Links kontrolliert und das Resultat streng zurückgelesen werden. Dieser Schritt wurde nicht ausgeführt.

## Tests und Artefakte

- `test_theme_seo.py`: 21 Prüfungen bestanden.
- Der Test bestätigt den Quelldigest, exakt zwei HTTP-zu-HTTPS-Ersetzungen, keine weitere Dateiänderung, 784/779/742 für den Menübaum sowie 744 eindeutige Header-Ziele auf allen fünf Seiten.
- `evidence.json` enthält die Theme-Metadaten, öffentliche Zählungen, Menü-Historie und Patch-Digests.
- `live-main-menu-collection-urls.txt` enthält die 742 aktuell gelesenen eindeutigen Collection-URLs.
- `og-image-https.before.liquid`, `og-image-https.after.liquid` und `og-image-https.patch` bilden den nicht angewendeten Minimaldiff.

Die französische Übersetzungsarbeit ist von diesem Paket vollständig getrennt.
