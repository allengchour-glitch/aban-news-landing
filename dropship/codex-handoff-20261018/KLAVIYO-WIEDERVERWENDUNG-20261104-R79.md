# LuxeStyle – Klaviyo-Beleg aus R77 für den Mittagslauf R79

Datierte Quelle: geprüft am **04.11.2026 um 07:10:41 UTC / 08:10:41 Europe/Zurich**. R79 verwendet diesen bereits heute erhobenen Beleg; **keine neue Klaviyo-Abfrage und keine erneute Live-Statusprüfung**. Zeitraum des Reports: 28.10.–03.11.2026, sieben abgeschlossene Tage in Europe/Zurich. Die Placed-Order-Metrik W7XTVD wurde in R77 vor dem Report entdeckt.

| Flow | Status in R77 | Zugestellt | Eindeutige Öffnungen | Eindeutige Klicks | Attribuierte Conversions |
|---|---|---:|---:|---:|---:|
| Abandoned Checkout Vse76a | draft | unbekannt | unbekannt | unbekannt | unbekannt |
| Welcome Series VbLQj6 | draft | 2 | 1 | 0 | 0 |
| Post-Purchase RnTvsY | draft | 4 | 1 | 0 | 0 |

Für Abandoned Checkout lieferte der Report keine Zeile; das bedeutet unbekannt, nicht null. Die drei Flowdefinitionen und ihre Sendeschritte waren in R77 draft. Frühere Sendungen im Reportzeitraum stehen dazu nicht im Widerspruch. Die ausgewiesenen Conversion-Nullen betreffen nur die Reportattribution und belegen weder fehlende Shopkäufe noch fehlenden Bestell-Sync. Seit der Morgenprüfung ist der Live-Zustand in R79 nicht neu geprüft.

Capture laut R77: erfolgreiche, vollständig paginierte Klaviyo-Formenliste ohne Einträge; Welcome-Liste T2VHfu «Newsletter Subscribers» mit single_opt_in vorhanden. Zur Added-to-Cart-Metrik TFy7Yn wurden keine Flowbeziehungen geliefert. Andere Shopify-/Theme-Capturewege, wirksame Einwilligung und Ende-zu-Ende-Übergabe bleiben unbekannt. Kein Signup, Testversand, Profil-, Ereignis- oder Bestellabruf. Shop CHF und Klaviyo-Konto USD bleiben getrennt; keine Umsatzwerte ausgewertet oder zusammengerechnet.

## Ein bestehender Textentwurf zur Freigabe

Proposal-ID `checkout-email3-quality-20261103`, Flow Vse76a, Nachricht WNFHjV, Vorlage WaQaDv, Aktion 108024959. Derselbe R64-Entwurf wurde in R77 mit dem Original bytegenau abgeglichen; R79 erstellt keine neue Textrevision.

- Betreff: «Möchtest du deine Bestellung fortsetzen?» statt «Email #3 Subject».
- HTML-Zeile 15: «Dein Einkauf bei LuxeStyle» statt «Letzte Chance – fast ausverkauft».
- HTML-Zeilen 18 und 19: «Hey {{ first_name|default:'' }}, du kannst deinen begonnenen Einkauf im Checkout ansehen und fortsetzen. Falls du den Code WELCOME10 verwenden möchtest, prüfe die dort angezeigten Bedingungen.» Die tatsächlichen HTML-Tokens und der vorhandene Zeilenumbruch bleiben gemäss bestehendem Diff erhalten.

Umfang ausschliesslich Betreff und genau drei HTML-Zeilen: 15, 18, 19. Übrige HTML-Bytes, Personalisierung, CTA-/Checkout-/Abmelde-/Coupon-Tokens, Absender, Trackingflags, Verzögerungen und Flow-/Sendestatus bleiben unverändert. **Nicht angewendet und nicht sendebereit.** Konkrete Textabnahme sowie Coupon-Gültigkeit, Einwilligung, Ereignis-/Checkout-Darstellung und Zeitpunkt sind nicht als freigegeben oder funktional getestet belegt. Der vorhandene Code wird weder aktiviert, verändert noch neu versprochen. Daraus folgt keine Versand-, Aktivierungs-, Rabatt- oder sonstige Rechtefreigabe. Kein zweiter Verbesserungsvorschlag.

Quellenhashes und der eng abgegrenzte Umfang stehen in `LAUFBELEGE-20261104-R79.json` (Klaviyo-Abschnitt). Lokale Quellenprüfung in R79, keine Kontoabfragen, Remote-Writes oder Kundenansprache.

