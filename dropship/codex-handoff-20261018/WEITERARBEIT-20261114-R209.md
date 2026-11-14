# LuxeStyle: Freigegebener SEO-Publish abgewiesen, Merchant-Listen eingeordnet (R209)

## SEO-Veröffentlichung: freigegeben, technisch abgewiesen

Der Inhaber hat das konkrete Theme **LuxeStyle – SEO 14.11.2026 / 213991391623** ausdrücklich zum Live-Schalten freigegeben. Diese Freigabe ist gespeichert und wird nicht erneut verlangt.

Vorher frische Shopify-/Metricool-Identität und Dateiprüfung: luxestyle.ch/CHF, Metricool6227837/EuropeZurich und alle sechs Konten passen. Das MAIN-Theme meldet updatedAt12.11., vor Erzeugung der Kopie am14.11.13:42Z. Die drei gezielt verglichenen Dateichecksums sind unverändert; die beiden SEO-Dateien der Kopie stimmen mit R208 überein, keine Verarbeitung ausstehend.

Genau ein `theme_publish(userConfirmed=true)` wurde ausgeführt. Die Schnittstelle antwortete **published=false / publish_refused / «Only agent-created themes can be published here»**, pending=[]. Das ist eine ausdrückliche technische Ablehnung, kein unklarer Write. Der anschliessende Rollen-Read bestätigt: altes Theme213013037447 bleibt MAIN, vorbereitetes213991391623 bleibt UNPUBLISHED. Keine andere Publishing-API, kein Retry oder Umgehen der Beschränkung.

Die Kopie wurde in R208 tatsächlich über themeDuplicate angelegt und mit dem geprüften Zwei-Datei-Fix gespeichert; die Schnittstelle akzeptiert sie dennoch nicht als «agent-created». Nächste praktische Handlung mit bereits vorhandener Freigabe: In Shopify **Onlineshop → Themes → «LuxeStyle – SEO 14.11.2026» → Veröffentlichen**. Wenn inzwischen am bisherigen MAIN weitergearbeitet wird, vorher neu abgleichen. Der neue neutrale Meta-/OG-/Twitter-Text ist derzeit nur in der gespeicherten Vorschau bestätigt, nicht auf der Live-Startseite.

## Zwei neue Drive-Exporte vollständig geprüft

Mit dem Google-Drive-Skill die vom Inhaber verlinkten Dateien per Metadaten geerdet und authentifiziert vollständig gelesen, je Bytezahl und SHA256 geprüft. Der erste Attachment-Downloader scheiterte am vollen Workspace; die authentifizierte Rohdatei konnte unabhängig erfolgreich in den Task-/tmp-Bereich gelesen werden. Kein Zugriffsausfall oder leere CSV daraus abgeleitet. Keine Freigaben, Dateiablage oder Inhalte im Drive geändert.

Die kleinere Datei ist exakt eine Teilmenge der grösseren. Sie enthält drei Problemarten; im grossen Export sind **16 weitere Problemarten** vorhanden, insgesamt19. 3’555 unterschiedliche Kontextzeilen betreffen2’005 rohe Artikel-IDs. Es sind nicht3’555 Produkte und keine zusätzlich erwiesenen16 ausgewählten Produkte. Der [Fehlerplan](MERCHANT-FEHLERPLAN-20261114-R209.md) ordnet alle19 Klassen zu, ohne Mengendruck oder pauschale Bereinigung.

## Konkrete neue Befunde

- **Versand:**995IDs/LabelDE haben ausschliesslich Deutschland-Probleme. Die gezielte Quellenabfrage liefert vier Quellen, deren Produkt-Länder CH/LI nennen; keine nenntDE. Deshalb kein Deutschland-Versand hinzugefügt und keine Quelle aus dieser Diskrepanz blind gelöscht.
- **Preise:**517IDs/LabelCH haben Preisfehler. Ein exakt zugeordnetes Shopify-Beispiel besitzt CHF44.90, ist aber DRAFT und ohne Shop-URL. Eine neue kleine Merchant-Einzelfallabfrage läuft in einen MCP-Timeout; Quelle/Preis dort bleiben unbekannt. Keine zusätzliche Preisänderung oder Aktivierung.
- **Produktseiten:**Drei Offers sind im Export betroffen, zwei Elternprodukte wurden gezielt geprüft: beide DRAFT, nicht veröffentlicht und ohne Shop-URL. Die alten Varianten-IDs ergebennull. Kein Mapping auf neue gleichfarbige Varianten, keine erzeugtenURLs oder angenommener404-Fehler.
- **Bilder und Richtlinien:**Die übrigen Klassen sind einzeln erfasst. Die tatsächlichen eingereichten Bild-/Attributwerte und Rechts-/Produktbelege bleiben vor jeder Korrektur notwendig. Keine erfundenen Reviews, Materialien, Funktionen oder Produktklassifikationen und keine Sperren-/Ausschlussentfernung.

**Kein Merchant-Fall wird als behoben bezeichnet.** CSV-Klassifizierung und Datenquellen-Gegenprobe sind belegter Fortschritt; sie sind keine Feedänderung. Die Shopify-Entwürfe werden nicht zur Beseitigung von Merchant-Meldungen aktiviert.

## Tageszwischenstand

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| SEO-Publish | Konkrete Freigabe gespeichert, Identität/Stand geprüft, einen Publishversuch und Rollen-Read ausgeführt | Tool ausdrücklich abgewiesen; bisheriges MAIN bleibt live, SEO-Kopie UNPUBLISHED. Keine erneute Freigabefrage |
| CSV | Zwei vollständige neue Drive-Exporte gehasht, dedupliziert und unabhängig gegengerechnet |19Problemarten, davon16zusätzlich zur kleinen CSV;3’555Kontextzeilen/2’005roheIDs. Keine Produkt- oder Erfolgsgleichsetzung |
| Merchant | Vier Quellen sowie drei genaue Shopify-Produktfälle geprüft | Ein vorhandener Preis in DRAFT, zwei unveröffentlichte URL-Fälle/alteVariantIDsnull; tatsächliche Merchant-Werte teilweise unbekannt.0Feed-/Shopwrites |
| Kontinuität | Quellen, Grenzen und nächsten Schritt in Core4 gesichert |24IDs/Historie und bestehende Freigaben erhalten. Keine neuen Kennzahl-/Flow-/Kauf-Watchabfragen, Socialposts, Renders, Budgets, Versand-/DNS-/Flowänderungen oder Automationen |

R200-Kennzahlen/Klaviyo und R207-Planung bleiben datierte Befunde und wurden nicht erneut gelesen. Bestehender professioneller Master, Rechte-/Ton-/Ledger-/Kanalregeln bleiben unverändert; keine neue MP4 oder Publikation. Vier DNS-Ergänzungen weiterhin bereits genehmigt, Writer nicht bestätigt. ÖffentlicheCHF50/interneCHF45 und account.luxestyle.com.co unverändert. Kein Claude-Empfang ohne Beleg behauptet.
