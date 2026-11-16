# R258 final copy audit

**Result: PASS_WITH_LIMITS.** Read-only review of the six final inputs against native product snapshots, source summaries/raw records, copy diffs, and local image evidence. No API calls or writes were made.

All six native products have exactly one `Default Title` variant. Every proposed description clearly labels its sole current selection as a Standardausführung and does not invent color, size, mode, or set variants. The diff limits the proposal to product title, description, SEO title, and SEO description.

The six descriptions contain specific selection and use guidance, distinguish supplier/image observations from confirmed detail, and keep uncertain facts open. The City Ranger text correctly uses the supplier’s explicit Nylon and Canvas wording. No unsupported positive claim was identified for materials, accessories, dimensions, features, or compatibility. Swiss spelling is consistent; there is no `ß`. SEO titles differ from product titles; meta descriptions are 143–149 characters.

## Product-specific open points

- **Magnetic LED light:** mounting surface/strength, suction or translation meaning, charging connection, battery/runtime, dimensions, ingress protection and control/accessory inclusion remain open.
- **Tree-form crystal-look lamp:** exact dimensions/material, mode and button mapping, runtime, and whether particular light modes are selectable remain open.
- **Horse halter:** PP/nylon and neoprene placement, delivered size/colour, fit, load and included accessories remain open; S/M/L are not presented as selectable.
- **Water trough:** connection/pressure/mounting/accessories and adjustment mechanism remain open. Product and logistics weights are not conflated.
- **City Ranger bag:** material ratio, dimensions, strap range, accessory compatibility and water rating remain open.
- **Nylon travel duffel:** the supplier’s 56–75 L range is not treated as selectable sizes or proof of expansion; dimensions, load, flight approval and water rating remain open.

This reviews source support and draft quality only; it does not verify post-write or public-page state. Root reported reviewing all six current product heroes and the magnetic/crystal source child images; I did not repeat that visual review.


# R258 Root-Prüfung vor Live-Writes

Sechs eigene Produkttextkorrekturen im ausdrücklich genehmigten Gesamtauftrag. Ausschliesslich Titel, Beschreibung und beide SEO-Felder; unveränderte Produkt-URLs und Angebotsidentitäten. Vor jedem Write frischer nativer Vollvergleich und Shopidentität, danach unabhängig zurücklesen. Unklare Antworten nicht erneut senden.

Root sah den aktuellen nativen Sechser-Bildkontakt sowie die beiden aktuellen CJ-Kindbilder der Leuchten. Die quadratische Vierfach-Leuchte entspricht dem Lieferantenmodell, ist keine belegte Schrank-Klebeleuchte. «Suction Lamp» in der Packliste allein beweist keinen Saugnapf. Magnetisch/kabellos/wiederaufladbar werden als Lieferantenangabe bezeichnet, genaue Montage und Stromdaten bleiben offen. Die zweite Lampe ist sichtbar baumförmig/facettiert, nicht als echtes Kristallglas bestätigt. Keine Bluetooth-/Musikfunktion zugesagt. Pferdeprodukt zeigt Halfter mit Ringen, keine vollständige Reittrense.

City Ranger: Lieferanten-Fliesstext nennt ausdrücklich Nylon und Canvas. Die allgemeine Materialtaxonomie fabric ist kein Gegenbeweis. Keine Wasserfestigkeit, Nachhaltigkeit, Gerätepassform oder zweifelhafte Übersetzung «zwei Klettverschluss-Taschen» zugesagt. Keine eindeutige vollständige Zubehörliste vorhanden. Zweite Tasche: Nylon und Quellbezeichnung 56–75L, keine bestätigte Erweiterung oder auswählbaren Einzelgrössen. Rueckhol-Tag bleibt vollständig erhalten; kein Social-Write.

Tränkebecken: Kunststoff, 4L, 28×26cm, Zieltiere und einstellbarer Wasserstand aus Lieferantentext; keine garantierte Überlaufsicherheit, universelle Anschlusskompatibilität, Druck-/Gewinde-/Montageangaben erfunden. Halfter: PP oder Nylon plus Neopren nur als offene Lieferantenangabe; keine S/M/L-Auswahl, Anpassung oder Logobestellung im aktuellen Shopangebot. Grössen, Färbung und Zubehör bleiben konkret offen.

Alle sechs nativen Angebote haben genau eine Default-Variante. Lieferanten- und Shop-Abbildungen wurden für die Textidentität geprüft; kein Bild-Upload oder neue Rechtefreigabe behauptet. Altbestandene Liefer-/Qualitäts-Trustboxen und unbelegte alte Aussagen werden aus diesen sechs Beschreibungen entfernt. Das ändert keine Versand-/Rückgaberichtlinie. Bestehende verwaltete Cross-Sell-Suffixe der Leuchten bleiben erhalten. Zwei Taschen-Kategorielinks stammen aus aktuellem erreichbarem HTML; für Halfter/Vieh keine erfundene Kategorie.

Keine Behauptung vollständiger Quellenklärung, neuer CJ-Fulfilmentverbindung, Google-Freigabe, Ranking-/Umsatzwirkung oder komplett bearbeiteten Katalogs. Tagesreports und abgeschlossene Bestellwatch bleiben unberührt.

## Konkreter Nachprüfungsbefund und zwei Body-Nachbesserungen

Root sah auf dem echten mobilen Vollbild weiterhin230g in einer separaten Spezifikationstabelle. Der native Versandgewicht-Fallback ist keine bestätigte Produktgewichtsquelle; source product1070g und child1090g erklären230g nicht. Das Halfter-Material war dort festNylon, während aktuelle QuellePPoderNylon sagt. AktuellesTheme/verschachteltenRenderer perAdminGraphQL vollständig gelesen; deutsche Detailzeilenpriorität und hat_material/hat_gewicht-Fallbackunterdrückung im echten Code bestätigt. Keine Theme-, Versandgewicht- oder Metafeldänderung. Nur zwei Body-Ergänzungen mit den offenen Angaben, unabhängige native Rücklese, vorhandene Titel/SEO/alleSchutzdaten erhalten. Vier andere sichtbare Gewichte stimmen mit explizitem Source-Produktgewicht überein. Der bestehende Nylon-Merchant-Metafeldwert ist weiterhin ein separater offener Datenpunkt.


# R258 spec amendment audit

**Result: PASS_WITH_RENDER_LIMIT.** Read-only review; no API calls or edits.

Two body-only amendments are confirmed, each with `userErrors=[]` and no unknown mutation state:

- **Magnetic LED light:** `Gewicht: Produktgewicht noch nicht bestätigt` prevents the stale 230 g renderer fallback from reading as confirmed. Shopify shipping weight was not changed.
- **Horse halter:** `Material: PP oder Nylon laut Lieferant; genaue Ausführung offen` preserves the source ambiguity (the source also mentions neoprene) rather than repeating the theme’s Nylon-only fallback. Metafields were not changed.

The retained Liquid template parses `<li><strong>Key:</strong> value</li>` rows from the exact `ls-produktdetails` class. For nonempty Material/Gewicht rows it sets `hat_material` / `hat_gewicht`; later fallback rows are conditional on those flags being false. Both new rows therefore suppress the conflicting fallback without adding a second table row. The correction checkpoint confirms body readback and all other native fields unchanged; final target reads match the aggregate final native snapshot.

No post-correction public HTML was fetched in this audit. The recorded cooldown probe is rate-limited, so the renderer result above is a static trace of the retained live template, not a fresh public-render claim.
