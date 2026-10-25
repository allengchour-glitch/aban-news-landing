# LuxeStyle: native Menüquelle jetzt belegt

Abendlauf 25.10.2026, Europe/Zurich. **Nur Leseprüfung und lokaler Review; kein Menüwrite.** Die frühere Grenze «native Menüquelle unbekannt» ist durch diesen neuen Befund für genau das Hauptmenü aufgehoben. Historische Berichte bleiben unverändert erhalten.

Shopify liefert `gid://shopify/Menu/310224093569`, Handle `main-menu`, Titel `Main menu`. Eine begrenzte Menü-Kopfzeilenabfrage lieferte drei Menüs und `hasNextPage=false`; nur dieses Hauptmenü wurde vollständig gelesen. Seine 13 Hauptpunkte liegen unter dem Limit50; alle drei Unterebenen und ein leerer vierter Ebenenindikator wurden erfasst.

**218 echte Menüeinträge / 195 verschiedene normalisierte Ziele stimmen vollständig mit dem heute archivierten Desktopmenü überein:** Originaltitel, URL, Elternstruktur und Reihenfolge passen für jedes Vorkommen. Der neue ID-Abgleich erhält die 204 bisherigen Platzierungsvorschläge und alle14 offenen Fälle. Es wurde nichts zu einem fertigen freigegebenen Menübaum erklärt.

## Konkreter Gewinn für die weitere Umsetzung

Die spätere Gegenprobe kann jetzt echte Menü-/Item-IDs nutzen, statt einen neu erfundenen Menübaum oder allein die44 Vorschau-Einstiege zu überschreiben. `NATIVE-MENU-MAPPING.json` enthält den vollständigen aktuellen nativen Snapshot und die verlustfreie218-Zeilen-Zuordnung zur bisherigen Migration.

Alle218 Einträge sind heute als Typ `HTTP` konfiguriert, mit `resourceId=null` und leeren `MenuItem.tags`. Das ist keine Fehlermeldung. Es wird keine Umwandlung zu `COLLECTION` und keine ungeprüfte Ressourcenzuordnung vorgeschlagen. Die separat archivierten fünf Technik-Filterrouten gehören zum Kategorie-Kontext und haben menu_entry=false. Sie sind keine der218 nativen Menüeinträge und werden keinem nativen Menü-ID-Feld zugeordnet. Ihre URL-Bestandteile bleiben als eigener Reviewumfang erhalten. Leere Navigations-Tags sind von Produkt-/Social-Sperrtags zu unterscheiden.

14 Platzierungen bleiben offen, unter anderem sensible oder unbelegte Lager-/Topseller-/Premium-Labels und Utilitylinks. Dieser Abgleich löst ihre redaktionelle Entscheidung nicht. Keine Collection-/Produktzuordnung, Lieferfähigkeit, Ziel-Erreichbarkeit, Indexierung oder Filmfreigabe aus den Menülinks ableiten.

## Validierung und Begrenzung

QueryRoot, Menu und MenuItem wurden frisch über die Schemawerkzeuge gelesen. Native Dokumentation bestätigt den benötigten `read_online_store_navigation`-Scope; der tatsächliche Read war erfolgreich. Der native Vorvalidator delegierte die Prüfung an die Ausführung. Die lokale CLI-Dokusuche meldete `fetch failed`; der lokale CLI-Validator hat fehlende Toolkit-Assets und konnte keine Feldvalidierung liefern. Diese Werkzeugfehler sind keine leere Menüquelle oder403-Antwort. Keine Installation, Attrappen oder blinden Retries.

Quelle: [Shopify Menu 2026-10](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Menu). Die Vollständigkeit dieser Menüantwort ersetzt keinen vollständigen Theme-/Mobiltest. Der bestehende Prototyp bleibt unverändert.

Nächster Schritt: die14 offenen Plätze als konkreten Review entscheiden, dann dieselbe native Quelle frisch gegenprüfen und einen engen IDs-/Hierarchie-Diff mit Rücksetzreferenz vorbereiten. Liveumsetzung benötigt weiterhin die konkrete Freigabe. Öffentliche CHF50, interne CHF45 und account.luxestyle.com.co bleiben erhalten.
