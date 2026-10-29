# Schneestiefel: begrenzter lokaler Quellenabgleich, 29.10.2026

Task-ID: `product-attribute-completeness`. Fortsetzung vorhandener Quellenprüfung; kein neuer API-/Shopabruf, kein Produktwrite, keine neue Material- oder Massbestätigung.

## Ergebnis

Für Produkt `15495118520705`, Handle `gefutterte-damen-schneestiefel-mit-kunstfellkr-601700`, wurde **keine neue unabhängige Lieferanten-/Modellquelle** in den gezielt gelesenen lokalen Unterlagen gefunden. Der bereits dokumentierte Materialkonflikt und die fehlende Fusslängentabelle bleiben bestehen. Dieser Bericht präzisiert Quellenalter, Suchschlüssel und zulässige Verwendung; er zählt die alte Shopprüfung nicht nochmals als aktuelle Live-Verifikation.

## Tatsächlich vorhandene Zuordnung

- Native Produktkopie: geprüft `2026-10-28T23:23:13.498Z` = 29.10., 00:23:13 Zürich; Konfliktdatei `2026-10-28T23:24:35.021Z` = 00:24:35 Zürich.
- 27 vorhandene Varianten: Schwarz/Grau/Blau × Grössenlabels 36–44. Lokal erneut auf eindeutige Varianten-IDs, SKUs und vollständiges kartesisches Paarset geprüft: 27/27. Das belegt die gespeicherte Auswahltabelle, keine Fusslängen oder Passform.
- Erster eindeutiger Suchschlüssel: Shopify-Variante `56086768976257`, gespeicherte SKU `CJ-CJYD271840501AZ`, Auswahl Schwarz / 36.
- Weitere Kontrollschlüssel: Grau / 36 = Variante `56086769271169`, SKU `CJ-CJYD271840510JQ`; Blau / 36 = Variante `56086769566081`, SKU `CJ-CJYD271840519SH`.
- Die gespeicherten SKUs teilen die Zeichenfolge `CJ-CJYD2718405…`. `CJYD2718405` ist damit ein vorhandener Suchansatz; es wurde **keine authentifizierte CJ-pid/vid-Verknüpfung** nachgewiesen. Weder Titelähnlichkeit noch dieser Präfix allein darf ein fremdes Datenblatt zuordnen.

## Welche Angaben verwendbar sind

| Angabe | Beleg und zulässige Verwendung |
|---|---|
| Varianten-IDs, gespeicherte SKUs, Farb-/Grössenlabels | Für exakt begrenzte weitere Quellenabgleiche verwenden. Vor jedem abhängigen Live-Write aktuell zurücklesen. |
| Materialmetafeld «Baumwolle» | Historischer gespeicherter Wert, aktualisiert 27.10. 20:55:30 UTC; kein unabhängig bestätigtes Gesamt-/Obermaterial. |
| Baumwollfutter, Kunststoff, Polyurethan-Sohle | Vorhandene Shoptextbehauptungen; Komponenten getrennt prüfen. Nicht zu einer geratenen Gesamtmaterialmischung zusammenführen. |
| Grössen 36–44 | Vorhandene Auswahlbezeichnungen. Keine Umrechnung zu EU-/UK-/US-Grössen oder Fusslängen ohne exakte Lieferantentabelle. |
| Schaft 23 cm, Absatz 3.5 cm, Gewichtsspanne und Wasserdicht-/Rutschfest-Aussagen | Nur bestehende Shoptexte, hier nicht unabhängig bestätigt. Keine neue Freigabe oder Werbeaussage daraus. |
| Zwei bereits betrachtete Galeriebilder | Historischer Bericht beschreibt Produktfotos ohne Material-/Masstabelle. In diesem Schritt keine erneute Bildprüfung. |

## Enger nächster Schritt

Mit legitimem CJ-Lesezugriff zunächst genau die drei genannten Variantensuchschlüssel einem gemeinsamen Liefermodell und dessen echten pid/vid zuordnen. Dann ein datiertes originales Komponentenblatt und die vollständige Grössentabelle dieses Modells beschaffen. Pro Grösse muss klar sein, ob der Wert Fusslänge, Innenlänge oder Aussensohlenlänge bedeutet; keine dieser Längen gleichsetzen. Erst bei dieser Quellenkette einen konkreten Material-/Grössendiff erstellen. Keine Kundenansprache, keine Installation oder Bestellung nötig. `rueckhol-0907` aus der vorhandenen Kopie bleibt Sperrhinweis für Social; aktuelle Tags vor abhängigen Aktionen frisch prüfen.

## Gelesene lokale Hauptbelege

- `/workspace/luxestyle-review/attribute-work-20261029/products/LIVE-PRODUKTBELEG.json` — SHA-256 `37b97e52a4e6f3c9689399ae145ab99e0351333109838b134263e3bbdf419f11`
- `/workspace/luxestyle-review/attribute-work-20261029/products/MATERIAL-KONFLIKT.json` — SHA-256 `f87d7b9a227d00a6d4ddde6447dfd1758320a9d7cd3cdf3bd93eb52f2b1d79fd`
- `/workspace/luxestyle-review/attribute-work-20261029/products/BERICHT.md` — SHA-256 `09548b8aab9b2e45188ce5fb4f0604d749d38b4b759f6ab245eedb63ace42b9d`

Die Suche nach exakter Produkt-ID und SKU-Familie war auf vorhandene lokale LuxeStyle-Arbeitsunterlagen und projektbezogene Repo-Unterlagen begrenzt. Keine Behauptung, dass weltweit oder in nicht gelesenen Ablagen kein Datenblatt existiert. Katalogqualität und heutige Nachpflegequote bleiben unbekannt.
