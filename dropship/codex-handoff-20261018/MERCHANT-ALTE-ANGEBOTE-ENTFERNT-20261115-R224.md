# Zwei alte Merchant-Einträge entfernt – R224, 15.11.2026 Europe/Zurich

Der Inhaber hat das konkret vorgelegte Paar mit «bedtätige» bestätigt. Nach frischer Shop-/Merchant-/Metricool-Identitätsprüfung, exakten Angebots-/Quellenreads, Shopify-DRAFT-/Variantenprüfung und erneuten echten Website404-Gegenproben wurden genau zwei delete_product-Aktionen ausgeführt:

| Merchant-Angebot | Zugehöriges Shopprodukt | Schlusszustand |
|---|---|---|
| shopify_ZZ_15516154462593_56177866178945 | Smartwatch mit Kamera und GPS für Kinder | Google404 / ITEM_NOT_FOUND für exakte Ressource |
| shopify_ZZ_15516156395905_56177868177793 | i9L Kinder 4G Videoanruf-Uhr | Google404 / ITEM_NOT_FOUND für exakte Ressource |

Beide deutschen Angebote betrafen Quelle10667445201 (Shopify App API), de/CHF_99383214465. Vorher-Datensätze sind vollständig gesichert. Beide API-Löschbestätigungen und genaue Rückleseantworten liegen im Belegpaket. Zwei Writes insgesamt, keine blinde Wiederholung.

## Unabhängige Rücklesung

HYPD liefert nach der Löschung als Wrappercode INVALID_ARGUMENT, im enthaltenen Google-Fehler aber jeweils ausdrücklich HTTP404, reason notFound, ITEM_NOT_FOUND, merchantapi.googleapis.com und genau den zuvor vorhandenen Ressourcennamen. Das wird nicht pauschal aus dem Wrappercode abgeleitet: Ein bekanntes lebendes Nagellack-Angebot aus derselben Quelle wurde gleichzeitig erfolgreich gelesen. Damit sind die zwei NotFound-Antworten kein unterstellter Auth-/Quota-/Timeout-Ausfall.

Beide Shopify-Produkte wurden danach nativ wieder gelesen: unverändert DRAFT, identische Titel/Handles/updatedAt, onlineStoreUrl=null; die alten Varianten bleiben null. Die Quelle bleibt über das lebende Kontrollangebot nachgewiesen. Keine Shopify-Produkte, Quelle, Preise, Versandwerte oder andere Merchant-Einträge gelöscht. Die ursprünglichen Website404-Seiten wurden nicht zu Produktseiten gemacht; die veralteten Merchant-Zuordnungen wurden entfernt.

Das neu angefragte Windsor-Quellenprofil kam aus dem Cache vom14.11.22:34:18 UTC; dieser Zeitstempel wurde beibehalten. Exakte Produkt-/Quell-IDs wurden direkt frisch gelesen, und die ausgeführten API-Aktionen bestätigten die konkrete Primärquelle. Kein kostenpflichtiges Refresh-Upgrade oder Cache-Umgehungsversuch.

## Weiterer Stand

R222-Nagellack-Bildkorrekturen bleiben erhalten; das Kontrollangebot ist weiterhin genehmigt. Der DRAFT-Workout-Fall aus AUTOFEED10678939025 und die Nettoinhalts-/Grundpreisfrage bleiben getrennt offen. Die R223-FR-Texte bleiben Entwurf. Keine zusätzlichen Löschungen oder Quelldatenregeln.

Der heutige Tagesblock ist **15.11.2026 Europe/Zurich**; UTC-Zeitstempel können noch14.11. tragen. Es wurden keine neuen Tages-Kennzahlen-, Klaviyo-, GSC- oder Kauf-Watch-Reports gelesen. Die bestehenden Frequenzen bleiben erhalten. Keine Kundenansprache, Posts, Renders, Workflowstarts, Deployments, Merges, neue Automation, Ads-/Budget-/Rabatt-/Flow-/DNS-/Versandänderungen. Keine globale0-Fehler- oder Umsatzbehauptung; Claude-Empfang unbekannt.
