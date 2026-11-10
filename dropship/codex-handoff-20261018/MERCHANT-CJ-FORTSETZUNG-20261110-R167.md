# Merchant-, Ranking- und CJ-Fortsetzung R167

Stand: 2026-11-10T10:48:17+01:00

## Ergebnis

Der vom Inhaber bereitgestellte Google-Drive-Link wurde frisch gelesen. Er enthält kein Film- oder Rechtepaket, sondern den Merchant-Export `product_issues_2026-11-08_07-46-23.csv` mit 110'213'899 Byte. Der professionelle Projektor-Master bleibt deshalb wegen fehlender Produktbindung, kommerzieller Medienrechte, nativer Hochkantquelle und finaler MP4 blockiert. Es wurde kein Ersatzfilm erzeugt und nichts über Metricool veröffentlicht.

Die beiden zusätzlich angehängten Dateien sind bytegleich. Der grosse Export und die kleinere Auswahl sind unterschiedliche Snapshots und dürfen nicht addiert oder als identische Vollauszüge behandelt werden.

## Merchant-Export: vollständige Offline-Auswertung

| Datei | Datenzeilen | SHA-256 |
|---|---:|---|
| Drive-Export `product_issues_2026-11-08_07-46-23.csv` | 367'594 | `c5ea57cb3f3ddae717285d86e63c9d0f6c0c83c5e493a4830c85071ceb24e7b1` |
| Anhang `product_issues_2026-11-08_07-47-38.csv` | 14'245 | `e0b47ecf0a21cd7751866678e1614ce9278be68c6863576a9cdee054dc800bf4` |

Der grosse Export enthält 275'537 eindeutige Merchant-Item-IDs, 275'158 unterschiedliche Titel und keine identischen Vollzeilen. 83'405 Items haben mehrere Problemzeilen. Alle 367'594 Zeilen tragen `SEVERITY_DISAPPROVED`; das ist eine Zeileneigenschaft und keine addierbare Zahl abgelehnter Produkte.

| Beanstandung | Zeilen | eindeutige Items |
|---|---:|---:|
| Fehlende Versandinformationen | 358'792 | 275'537 |
| CSS-Kapazität überschritten | 6'456 | 3'228 |
| Werbeeinblendung im Bild | 1'398 | 357 |
| Personalisierte Werbung: persönliche Notlagen | 448 | 224 |
| Fehlende Verfügbarkeit | 110 | 55 |
| Bild zu klein | 102 | 43 |
| Produktseite nicht verfügbar | 36 | 6 |

Weitere kleine Richtliniengruppen sind im Maschinenbeleg einzeln ausgewiesen. 357'409 Versandzeilen betreffen Liechtenstein und 1'383 Deutschland. Ohne aktuelle Lieferfähigkeit, Kosten und Laufzeit ist keine Versandaktivierung zulässig. Die 6'456 CSS-Zeilen sind ein Konto-/CSS-Kapazitätsthema und kein Produktattributfehler.

Die beiden kleinen Anhänge sind bytegleich und enthalten ausschliesslich Feed `CHF_99383214465`: 12'950 deutsche und 1'295 französische Zeilen. Alle deutschen Zeilen liegen auch im grossen Export; die 1'295 französischen Zeilen nicht als identische Vollzeilen. Sechs französische CSS-Item-IDs fehlen im grossen Export vollständig. Der Kleinexport ist damit eine abweichende Sprach-/Feed-Auswahl.

## Aktuelle Merchant-Gegenprobe mit HYPD

HYPD bestätigte read-only genau ein verbundenes Konto: `LuxeStyle CH`, Merchant Center `5797470070`. Keine Konto-, Feed- oder Produktänderung.

### Fehlende Verfügbarkeit: ein klar gebundener Fall

Merchant-Angebot `13331643115375957532`, Datenquelle `accounts/5797470070/dataSources/10678939025`, Feedlabel `CH`, Sprache `de`:

- aktuell in Merchant vorhanden und für Free Listings in CH und LI abgelehnt;
- aktueller Fehler `item_missing_required_attribute`, Attribut `availability`;
- zusätzliche LI-Versandbeanstandung bleibt getrennt;
- Shopify-Produkt `15500960530817` ist ACTIVE und öffentlich erreichbar;
- einzige Variante `56110933803393`, CHF 15.90, `availableForSale=true`, `inventoryPolicy=CONTINUE`, Tracking deaktiviert.

Die aktuelle Repo-Datei `automation/autopilot/merchant_feed.mjs` auf Main `a58f950030880f94fe7472dd1f8d30632aef3b8b` erzeugt für ihre eigenen Einträge bereits ein Availability-Feld und verwendet Handle-IDs. Das betroffene numerische Angebot ist im aktuellen Repo-Feed nicht enthalten. Ein Patch an diesem Generator wäre daher nicht als Korrektur der tatsächlich betroffenen Quelle belegt. Der sichere Verkaufshebel ist ein feldgenauer Source-Mapping-Fix in Datenquelle `10678939025`: aus dem aktuellen Shopify-Boolean `availableForSale=true` `in_stock` erzeugen, danach genau dieses Angebot zurücklesen. Nicht manuell einen ungebundenen Merchant-Wert setzen.

### Sechs Fälle «Produktseite nicht verfügbar»

Shopify-Identität wurde frisch als LuxeStyle / `luxestyle.ch` / CHF / Schweiz bestätigt. Alle sechs betroffenen Produkte sind heute DRAFT, ohne Online-Store-Publikation; alle öffentlichen URLs liefern HTTP 404 ohne Weiterleitung. Die sechs im Export referenzierten Varianten existieren nicht mehr.

| Produkt-ID | veraltete Varianten-ID | Shopify heute |
|---:|---:|---|
| `15516154462593` | `56177866178945` | DRAFT, 404, keine Publikation |
| `15493853544833` | `56080492429697` | DRAFT, 404, keine Publikation |
| `15519834636673` | `56191247778177` | DRAFT, 404, keine Publikation |
| `15516156395905` | `56177868177793` | DRAFT, 404, keine Publikation |
| `15524696949121` | `56221047292289` | DRAFT, 404, keine Publikation |
| `15522193998209` | `56204390433153` | DRAFT, 404, keine Publikation |

HYPD lieferte zwei dieser Angebote in Datenquelle `10667445201` weiterhin als CH/LI-abgelehnt mit `landing_page_error`: `shopify_ZZ_15516154462593_56177866178945` und `shopify_ZZ_15516156395905_56177868177793`. Die vier anderen exakten Statusaufrufe antworteten `INVALID_ARGUMENT`; daraus wird weder Löschung noch fortbestehender Status behauptet.

Saubere Massnahme: Die sechs veralteten Offer-Referenzen an ihrer jeweiligen verifizierten Quelle ausschliessen beziehungsweise aus dem nächsten vollständigen Sync entfernen. Die DRAFT-Produkte nicht aktivieren und keine Redirects auf unpassende Produkte setzen.

## Bildbeanstandungen

Vier konkrete Overlay-Fälle aus dem Kleinexport wurden gegen aktuelle Variantenmedien geprüft: Rollball, Wasserwellenleuchte Set 8, Eyeliner Dunkelbraun und Holzuhr Grün. Die gebundenen Bilder enthalten Text oder Collagen; vorhandene Alternativen belegen die genaue Variante nicht. Ergebnis: null sicher ausführbare Bildtausche. Erforderlich bleiben exaktes CJ-Varianten-Matching und ein kommerzieller Rechtebeleg.

## Pinterest-Boardbindung

Der bisherige Eigentumsblocker ist öffentlich aufgelöst:

| Board-ID | Board | Eigentümer |
|---|---|---|
| `1111333714239114020` | Geschenkideen Schweiz | `luxestyleCH` |
| `1111333714239531706` | Herrenmode Schweiz | `luxestyleCH` |

Beide Boards sind öffentlich dem Profil `LuxeStyle CH`, Owner-ID `1111333782956748766`, zugeordnet. Unbekannt bleibt, ob beide IDs aktuell in der Metricool-Boardauswahl verfügbar sind. Es gab keinen Metricool-Write.

## Ranking-Gegenprobe

Die heutige GSC-Abfrage aus R162 wurde nicht wiederholt. Die historische Black-Friday-Produktspur leitet auf einen ASCII-Handle und endet HTTP 404; Produkt `15402554229121` ist DRAFT und fehlt in der aktuellen Produktsitemap sowie in den begrenzt geprüften Kernseiten. Kein irreführender Redirect.

Der R166-Futterspender ist HTTP 200, selbstkanonisch und indexierbar. Product-JSON-LD enthält SKU `CJ-1418384701726527488`, CHF 96.90 und Verfügbarkeit, aber keine erfundenen Reviewdaten. Die URL steht mit `lastmod` 10.11.2026 in Produktsitemap 47 und ist auf Seite 2 der passenden Futterautomaten-Kategorie dreimal verlinkt; die Pagination ist crawlbar. Nächster redaktioneller Ranking-Hebel ist ein einzelner passender interner Link von einer Katzen-/Futterspender-Hubseite oder Kategorieeinleitung. Dieser Link ist vorbereitet, nicht live geschrieben: `Futterspender für Katzen in Weiss ansehen` → `/products/futterautomat-fur-katze-527488`.

## CJ-Grind: Kandidat exakt gebunden

Shopify-DRAFT `16690383454599` blieb unverändert. Zielvariante `67886035009927`, SKU `CJZR164957201AZ`, CHF 67.90.

Genau zwei hash- und commitgesicherte Nur-Lese-Läufe am Remote-Main-Commit `a58f950030880f94fe7472dd1f8d30632aef3b8b`:

1. Run `42793821605`, Job `129753733206`: Produktidentität verifiziert, PID `1607242452115664896`, Produkt-SKU `CJZR1649572`, vollständiger Variantensatz, kein Search/Pagination/Retry.
2. Run `42794106913`, Job `129754697683`: Inventory vollständig, 37 Variantenzeilen, ausschliesslich CN, keine Länderaggregation und keine Teilantwort.

Aktuelle vier Shopify-SKUs im Supplier-Read:

| SKU | VID | Land | Fabrik | CJ |
|---|---:|---|---:|---:|
| `CJZR164957201AZ` | `1607242452195356672` | CN | 12'416 | 0 |
| `CJZR164957202BY` | `1607242452199550976` | CN | 10'165 | 0 |
| `CJZR164957203CX` | `1607242452199550977` | CN | 10'654 | 0 |
| `CJZR164957237KP` | `2507260157271607400` | CN | 9'400 | 0 |

Die CN-Fabrikwerte und `verifiedWarehouse=2` belegen weder physischen CJ-/CH-Bestand noch Schweizer Lieferbarkeit, Prime, Fracht, Lieferzeit oder Medienrechte. Keine Route, Aktivierung oder Produktänderung. Die 32-Zoll-Variante zu CHF 18.90 bleibt ein ungeklärter Preis-Ausreisser.

## Content- und Verkaufsstatus

Der 18-Sekunden-Projektor-Master aus R165 bleibt derselbe ausgearbeitete Entwurf mit den Hooks «Dein Raum. Neues Licht.» und «Licht im Detail.» sowie CTA «Produkt ansehen». Der Drive-Link lieferte keine neue Filmquelle. Es gibt weiterhin keine freigabefähige professionelle Master-MP4; deshalb keine zusätzliche Variante und keine Social-Terminierung.

Konkrete Verkaufsaktion zur Freigabe: ausschliesslich beim Angebot `13331643115375957532` die Availability-Abbildung in der tatsächlich gebundenen Datenquelle `10678939025` aus dem aktuellen Shopify-Boolean ableiten und nach dem nächsten Sync exakt zurücklesen. Keine Versand-, Preis-, Rabatt-, Budget-, Produktstatus- oder Länderänderung.

## Writes und Grenzen

- Shopify: 0
- Merchant/Feed: 0
- Metricool/Social: 0
- Klaviyo/Kunden: 0
- DNS/Theme/Budget/Rabatt: 0
- GitHub Actions: genau zwei read-only CJ-Läufe, keine produktiven Writes
- kostenpflichtige Renders: 0

Ranking- und Verkaufswirkung bleiben unbekannt. Claude-Code-Kenntnisnahme bleibt `unknown_no_claude_receipt`.

[LUXESTYLE_R167_20261110]
