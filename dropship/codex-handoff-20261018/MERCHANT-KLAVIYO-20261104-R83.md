# LuxeStyle R83 – Merchant- und Klaviyo-Delta

**Stand:** 04.11.2026
**Scope:** enge Auswertung bereits vorhandener R77–R82-Belege; keine neue Merchant- oder Klaviyo-API-Abfrage, kein Feed-/Flow-Write, keine Aktivierung und keine Nachricht an Kunden.

## 1. Merchant: fünf P0-Produkte aus lokalen CSV-Belegen

Die folgenden Angaben stammen aus der in R82 normalisierten lokalen Merchant-CSV-Serie mit dem Quellenfenster **02.11.2026 12:41:30–13:04:55**. Sie sind historische Diagnosebeobachtungen, kein frisch gelesener Live-Status. Ein fehlender neuerer Befund bedeutet **unbekannt**, nicht behoben und nicht null.

Legende: DR = Dynamic Remarketing; FL = Free Listings; SA = Shopping Ads; CH = Schweiz; LI = Liechtenstein. Alle aufgeführten Diagnosen hatten in der CSV-Serie die Schwere `SEVERITY_DISAPPROVED`.

| Shopify-Produkt | Historische Merchant-Diagnose | Betroffene Angebote / Kontexte | Historischer Item-Status | Enge Einordnung |
|---|---|---|---|---|
| `15483793244545` – Automatischer Seifenspender | `Tobacco products & related equipment` | 3 Angebote; fr-CH: DR, FL, SA | `NOT_ELIGIBLE_OR_DISAPPROVED` | Offensichtlicher Klassifikationsprüffall. Vor einem Eingriff exaktes aktuelles Merchant-Item, Datenquelle und Google-Produktkategorie lesen; keine Policy-Umgehung und keine Textänderung nur zur Umgehung. |
|  | `Over capacity for Shopping ads (in CSS program)` | 1 Angebot; fr-CH: DR, SA | `NOT_ELIGIBLE_OR_DISAPPROVED` | Konto-/Programmkontext getrennt von Produkttext prüfen. |
| `15509968880001` – Hopfenfilter aus Edelstahl | `Alcoholic beverages` | 1 Angebot; de-LI: FL, SA | `ELIGIBLE_LIMITED` | Produktbezug kann sachlich mit der Richtlinie zusammenhängen; Einschränkung nicht pauschal entfernen. |
|  | `Personalized advertising: legal restrictions` | 1 Angebot; de-LI, de-CH, fr-CH: jeweils DR | `ELIGIBLE_LIMITED` | Zielmarkt- und Remarketing-Richtlinie aktuell je Kontext prüfen. |
| `15448534122881` – Grosser Einteiler mit Karomuster | `Personalized advertising: legal restrictions` | 5 Angebote; fr-CH: DR | `ELIGIBLE_LIMITED` | Exakte Varianten und Quelle aktuell gegenprüfen; historische CSV allein begründet keine Produktänderung. |
|  | `Over capacity for Shopping ads (in CSS program)` | 1 Angebot; fr-CH: DR, SA | `ELIGIBLE_LIMITED` | Separater CSS-Konto-/Kapazitätsbefund. |
| `15512184586625` – Alkoholmeter-Set für Selbstgebranntes | `Alcoholic beverages` | 1 Angebot; de-LI: FL, SA | `ELIGIBLE_LIMITED` | Richtlinienbezug ist plausibel; Compliance-Sperren erhalten und aktuellen Zielmarktstatus prüfen. |
|  | `Personalized advertising: legal restrictions` | 1 Angebot; de-LI, de-CH, fr-CH: jeweils DR | `ELIGIBLE_LIMITED` | Remarketing-Einschränkung nicht blind entfernen. |
| `15454092558721` – Katzenspielzeug mit Drehkopf | `Tobacco products & related equipment` | 1 Angebot; de-LI, de-CH, fr-CH: jeweils DR, FL, SA | `NOT_ELIGIBLE_OR_DISAPPROVED` | Offensichtlicher Klassifikationsprüffall. Zuerst aktuelles Item, Quelle und Taxonomie lesen; keine Policy-Umgehung. |
|  | `Over capacity for Shopping ads (in CSS program)` | 1 Angebot; fr-CH: DR, SA | `NOT_ELIGIBLE_OR_DISAPPROVED` | Separater CSS-Konto-/Kapazitätsbefund. |

**Delta und Konsequenz:** R82 macht für diese fünf P0-Produkte die betroffenen Angebote, Märkte und Marketingmethoden nachvollziehbar. Es liegt aber kein neuer Live-Merchant-Read nach dem CSV-Fenster vor. Deshalb wird weder eine Behebung noch eine weiterhin aktuelle Ablehnung behauptet. `Over capacity for Shopping ads (in CSS program)` ist als Konto-/Programmthema zu behandeln und darf nicht durch Änderungen an Produktbeschreibungen «repariert» werden. Es wurde kein Merchant-Write, Einspruch, Feed-Edit oder Datenquellenwechsel ausgeführt.

## 2. Klaviyo: datierte Wiederverwendung des heute abgeschlossenen R77-Reports

Dieser Abschnitt verwendet ausschliesslich den am **04.11.2026 um 08:10:41 Europe/Zurich** abgeschlossenen R77-Read. Es erfolgte für R83 **keine neue Klaviyo-Abfrage**.

- Konto: `XWqMAD`, LuxeStyle CH, Zeitzone `Europe/Zurich`.
- Klaviyo-Kontowährung: **USD**. Shopify-Shopwährung: **CHF**. Währungswerte werden nicht addiert oder vermischt; in diesem Delta werden keine Revenue-Summen ausgewiesen.
- Frisch entdeckte Placed-Order-Metrik im R77-Read: `W7XTVD` – `Placed Order`.
- Reportfenster: **28.10.2026 00:00 bis 04.11.2026 00:00 Europe/Zurich**, sieben abgeschlossene lokale Tage.
- Gegenüber R64: Flowdefinitionen und Status unverändert; nur das gleitende Sieben-Tage-Fenster hat sich verschoben.

| Flow / Capture | R77-Status und begrenzter Reportbefund |
|---|---|
| Abandoned Checkout `Vse76a` | `draft`. Keine Reportzeile zurückgegeben; Performance **unbekannt**, nicht null. Placed-Order-Profilfilter verweist auf `W7XTVD` und verlangt seit Flowstart einen Bestellzähler von 0. |
| Welcome Series `VbLQj6` | `draft`. 2 Empfänger, 2 zugestellt, 1 eindeutige Öffnung, 0 eindeutige Klicks, 0 report-attribuierte Conversions. Die Nullen gelten nur für diese Reportstatistiken und belegen weder fehlende Shopbestellungen noch fehlenden Sync. |
| Post-Purchase `RnTvsY` | `draft`. Trigger `Placed Order` (`W7XTVD`). 4 Empfänger, 4 zugestellt, 1 eindeutige Öffnung, 0 eindeutige Klicks, 0 report-attribuierte Conversions. Gleiche Begrenzung wie oben. |
| Welcome/Capture | Liste `T2VHfu` – `Newsletter Subscribers`, `single_opt_in`. Die vollständig paginierte Forms-Abfrage lieferte keine Zeile; weitere Capture-Wege und die End-to-End-Funktion bleiben unbekannt. |
| Warenkorb-Rückgewinnung | Metrik `Added to Cart` = `TFy7Yn`; die R77-Beziehungsabfrage lieferte keinen zugeordneten Flow. Das beweist nicht, dass Shopify-/Theme-Capture oder andere Recovery-Wege fehlen. |

## 3. Genau eine Flowverbesserung zur Freigabe

**Freigabeentwurf für Abandoned Checkout `Vse76a`, dritte E-Mail:** Nachricht `WNFHjV`, Vorlage `WaQaDv`, Aktion `108024959`.

- Betreff von `Email #3 Subject` zu **«Möchtest du deine Bestellung fortsetzen?»** ändern.
- Unbelegte Verknappung und Frist entfernen: `Letzte Chance – fast ausverkauft`, `sehr gefragt und fast vergriffen` sowie `gilt nur noch heute`.
- Neutraler Inhalt: **«Dein Einkauf bei LuxeStyle»** und der Hinweis, dass der begonnene Einkauf im Checkout angesehen und fortgesetzt werden kann. Beim vorhandenen Code `WELCOME10` wird auf die im Checkout angezeigten Bedingungen verwiesen; seine aktuelle Gültigkeit bleibt unbekannt.
- CTA, Checkout-URL-Token, übrige Personalisierung/HTML-/Coupon-Tokens, Abmeldemechanik, Absender, Tracking, Verzögerungen und `draft`-Status bleiben unverändert.

Die Änderung ist nur vorbereitet und **nicht angewendet**. Es gab keine Flowaktivierung, keine Testmail, keinen Versand und keine Rabattkonfiguration. Vor einer späteren Anwendung sind konkrete Freigabe, Codegültigkeit, Consent, Rendering mit Laufzeitdaten und Versandzeitpunkt zu prüfen. Eine zweite Klaviyo-Verbesserung wird in diesem Lauf nicht vorgeschlagen.

## 4. Belegquellen

- `PRODUKTKATALOG-LIVE-BATCH-01-50-20261104-R82.json`
- `LAUFBELEGE-20261104-R77.json`
- `MORGENPAKET-20261104-R77.md`
- `CHECKOUT-EMAIL3-ABGLEICH-20261104-R77.json`
- `CHECKOUT-EMAIL3-KORREKTUR-20261103-R64.diff`
