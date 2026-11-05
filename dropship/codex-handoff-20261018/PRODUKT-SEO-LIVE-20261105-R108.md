# LuxeStyle R108 – zwei weitere Produktangaben live korrigiert

Stand: 2026-11-05T22:27:36+01:00.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanälen wurden vor den Writes frisch passend gelesen. Metricool blieb ohne Write. Vor jedem Produkt wurden die aktuellen Remote-Heads, die exakten Produkt-IDs/Handles und Shopify `updatedAt` erneut geprüft. In aktuellen Claude-Code-Änderungen wurde keine parallele Bearbeitung der beiden R108-Produkte gefunden. Eine echte Claude-Empfangsquittung beziehungsweise ein gemeinsamer Live-Lock fehlt weiterhin.

## Live korrigiert

Produkt `16655747481991` wurde von **«Patchwork-Hoodie mit lockerer Passform»** auf **«Layering-Oberteil mit Hemdoptik»** begrenzt. Alle acht aktuellen Bilder zeigen keine Kapuze, sondern eine mehrlagige Hemdoptik mit sichtbarem Kragen, langen Ärmeln, Hemdsaum und Frontschriftzug. Hoodie-/Kapuze-, lockere-Passform-, Baumwolle-/Polyester-, Knitter-, Form-, Pflege-, Gewichts-, Nur-M- und produktbezogene Liefer-/Rabattangaben waren nicht belegt und wurden entfernt. Der neue Text nennt nur die sichtbare Gestaltung sowie Grau/Schwarz und S–XL. Acht READY-Bilder erhielten bildgenaue Alttexte.

Produkt `16616678195591` wurde von **«Herren Badehose schnelltrocknend»** auf **«Herren-Badehose mit seitlichem Farbeinsatz»** begrenzt. Die 27 Varianten umfassen Modell 1 in Schwarz/Blau, Modell 2 in Dunkelblau/Weiss und Modell 3 in Schwarz/Rot, jeweils XS–5XL. Drei zusätzliche Galeriebilder in Violett, Gelb und Orange sind keiner wählbaren Variante zugeordnet und wurden nicht als Auswahl beworben. Schnell­trocknungs-, Nylon-, Wassersport-, Trainings-, Komfort-, Nur-XS-, Gewichts- und produktbezogene Lieferangaben waren unbelegt und wurden entfernt. Sechs READY-Bilder erhielten bildgenaue Alttexte.

Es liefen genau zwei `productUpdate` und zwei `fileUpdate`, ohne `userErrors`, Mutation-Retry oder unklaren Write. Ein lokaler Scriptaufruf scheiterte vor Dispatch wegen eines fehlenden temporären Store-Objekts; er löste keinen Shopify-Aufruf aus und wurde nicht als Write gezählt. Nach jedem gesendeten Write wurden Admin sowie öffentliche HTML- und Produkt-JSON-Endpunkte zurückgelesen. Beide öffentlichen Seiten antworteten mit HTTP 200. Die unabhängige Schlussprüfung ergab **2/2 GO**.

## Schutzfelder und Grenzen

ACTIVE-Status, Handles, Vendor, Produkttypen, Kategorien, Tags, Optionen, 35 Varianten-IDs/SKUs, CHF-Preise, Kaufbarkeit, ungetracktes `CONTINUE`, Mengen 0, Medien-IDs/-URLs/-Bindungen und zwölf Publikationsknoten blieben erhalten. Mengen 0 sind bei diesen ungetrackten, weiter kaufbaren Varianten kein Ausverkaufsbeleg.

Beim Layering-Oberteil blieben historischer Hoodie-Handle, Hoodie-Sortiertags und die Shopify-Taxonomie «Kapuzenpullis» erhalten. Diese Strukturfelder benötigen eine getrennte Redirect-/Collection-/Merchant-Gegenprobe. Beim Badehosenprodukt blieb der historische `schnelltrocknend`-Handle aus demselben Grund erhalten.

Auf Badehosenbildern 2–6 ist ein sichtbares Drittmarkenlogo. Authentizität sowie kommerzielle Bearbeitungs- und Werberechte sind unbekannt. Das Produkt ist deshalb für neue Social-Ausspielung blockiert; es wurde keine Markenbehauptung, kein Social-Post und keine Änderung an Tags oder Publikationen vorgenommen. Die vorhandenen sechs Kanalpublikationen wurden nur erhalten, nicht neu aktiviert.

Unter dem strengen Liveverfahren sind **41 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,07256 %**, gerundet rund **0,07 %**. **56’465** beziehungsweise rund **99,93 %** bleiben offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
