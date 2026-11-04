# LuxeStyle: öffentliche Prüfung von fünf Produkten

**Prüfzeit:** 4. November 2026, 19:04–19:06 Uhr Europe/Zurich
**Umfang:** Ausschliesslich öffentliche Produktseiten, öffentliche Shopify-Produkt-JSONs und die dort ausgelieferten Bilder. Keine Admin-, Produkt-, Preis-, Bestands-, Kanal- oder Theme-Änderung; kein Warenkorb- oder Checkout-Versuch.

## Methode und Beleggrenze

- Alle fünf Seiten wurden unter `https://luxestyle.ch/products/<handle>` mit HTTP 200 erreicht.
- Die Produktdaten wurden unverändert aus `https://luxestyle.ch/products/<handle>.js` gespeichert. Die öffentlichen HTML-Seiten weisen CHF als Währung aus.
- `available: true` und sichtbare Kauf-Schaltflächen belegen, dass die jeweilige öffentliche Seite mindestens eine kaufbare Variante anbietet. Ein erfolgreicher Warenkorb, Checkout, tatsächlicher Lagerbestand, `inventoryPolicy`, Tracking und die Storefront-Kanalzuweisung wurden in dieser öffentlichen Prüfung nicht verifiziert.
- Bild- und Textrechte lassen sich aus einer öffentlichen Produktseite nicht nachweisen. Die gespeicherten Bildmontagen dienen nur der internen Qualitätsprüfung.
- Alle fünf öffentlichen JSONs enthalten den Tag `rueckhol-0907`. Nach den aktuellen LuxeStyle-Regeln blockiert das neue Social-Ausspielung. Dieser Befund ist kein Auftrag, den Tag zu entfernen.

## Ergebnis auf einen Blick

| Produkt | Öffentlicher Preis / Varianten | Öffentliche Kaufbarkeit | Hauptrisiko | Priorität |
|---|---:|---|---|---|
| 15483793244545, Automatischer Seifenspender | CHF 52.90; 5 Varianten, davon 2 öffentlich verfügbar | Teilweise belegt | Galerie mischt sichtbar zwei unterschiedliche Geräte; Mengenvarianten sind nicht zugeordnet; Text behauptet Akku, Bild verlangt 4 AAA-Batterien | P0 |
| 15509968880001, Hopfenfilter aus Edelstahl | CHF 23.90; 18 cm und 29 cm verfügbar | Belegt auf Seitenebene | Absolute und unbelegte Sicherheitsaussagen wie «steril», «ungiftig» und «absolut sicher» | P1 |
| 15448534122881, Grosser Einteiler mit Karomuster | CHF 17.90–18.90; 0XL–4XL verfügbar | Belegt auf Seitenebene | Titel verschleiert, dass es ein Badeanzug ist; Text verlangt eine Masstabelle, die in den sechs Bildern fehlt | P0 |
| 15512184586625, Alkoholmeter-Set für Selbstgebranntes | CHF 20.90; eine Variante verfügbar | Belegt auf Seitenebene | Präzisions- und Messbereichsaussagen sind bildlich nicht sauber lesbar; «integriertes» Thermometer ist laut Bildern ein separates Teil | P1 |
| 15454092558721, Katzenspielzeug mit Drehkopf | CHF 44.90; eine Variante verfügbar | Belegt auf Seitenebene | Stromversorgung fehlt; englische Bildgrafiken machen weitergehende Funktions- und Materialversprechen; falscher öffentlicher Tag `hund` | P0 |

## 1. Automatischer Seifenspender

**Produkt:** 15483793244545
**Handle:** `automatischer-seifenspender-1adb26`
**URL:** <https://luxestyle.ch/products/automatischer-seifenspender-1adb26>
**Montage:** intern lokal geprüft; wegen ungeklärter Bildrechte nicht ins Repository übernommen.

### Sichtbarer Ist-Zustand

- Titel: «Automatischer Seifenspender»; klar, aber für die gemischte Galerie zu unspezifisch.
- Preis: CHF 52.90 bei allen Varianten.
- Die Option heisst «Farbe», enthält jedoch zugleich Menge und Farbe: «Schwarz · 4 Stück», «Schwarz», «Blau», «Schwarz · 2 Stück», «Schwarz · 3 Stück».
- Öffentlich verfügbar sind nur «Schwarz · 4 Stück» und «Schwarz · 3 Stück». Schwarz einzeln, Blau und Schwarz · 2 Stück sind als nicht verfügbar ausgewiesen.
- Keine Variante besitzt im öffentlichen JSON ein zugeordnetes Variantenbild. Kundinnen und Kunden können deshalb nicht erkennen, welches Bild genau zu welcher Auswahl gehört.

### Bilder

- Bilder 1–3 und 5–7 sowie 9 zeigen ein schwarzes, hohes Gerät mit Sichtfenster und der Aufschrift «AUTO».
- Bilder 4, 8 und 10 zeigen ein anderes, weiss-hellblaues Gerät. Bild 10 zeigt zusätzlich die Fremdverpackung «Soap Magic». Form, Deckel, Gehäuse und Tank unterscheiden sich deutlich vom schwarzen Modell.
- Die Galerie zeigt keine 2er-, 3er- oder 4er-Packung. Die Mengenvarianten sind damit visuell nicht belegt.
- Bild 2 weist ausdrücklich «Install 4 × AAA battery (not included)» aus. Die Beschreibung nennt das Gerät dagegen «Akku-betrieben». Ein Akku und eine Ladebuchse sind weder beschrieben noch abgebildet.
- Mehrere Infografiken sind nur auf Englisch. Bild 2 hat ausserdem eine doppelte Schrittnummer und sprachlich fehlerhafte Anweisungen.
- Bild 7 nennt Masse von ungefähr 10 × 11 × 20.5 cm; diese Masse stehen nicht im deutschen Produkttext. Sie sollten erst nach Abgleich mit der tatsächlich verkauften Variante übernommen werden.

### Irreführende oder unbelegte Aussagen

- «Akku-betrieben» widerspricht dem öffentlichen Batteriebild. Bis zur Varianten- und Lieferumfangsprüfung entfernen oder korrekt als Batteriebetrieb mit exakter Batterieangabe ausweisen.
- «verhindert eine zweite Kreuzinfektion» ist medizinisch klingend, absolut und sprachlich falsch. Eine berührungslose Bedienung kann beschrieben werden; eine Infektionsverhinderung ist öffentlich nicht belegt.
- «Innovatives Design ohne Tropfenbildung» ist ein absolutes Leistungsversprechen ohne Beleg.
- «intelligente Infrarot-Sensor-Technologie» ist unnötig werblich. «Sensor aktiviert die Ausgabe berührungslos» wäre sachlicher, sofern die konkrete Variante geprüft ist.
- Sprachfehler: «Seife zu dispensieren», «oeffentlichen», «Fülleoeffnung».

### Empfohlene Korrektur vor Werbung

1. Zuerst anhand SKU und Lieferantendaten bestimmen, ob das schwarze Gerät, das weiss-hellblaue «Soap Magic»-Gerät oder beide tatsächlich geliefert werden.
2. Fremdproduktbilder aus der Galerie entfernen oder sauber einer echten Variante zuordnen; kommerzielle Bild- und Markennutzungsrechte separat belegen.
3. Die Option in «Ausführung» umbenennen oder Farbe und Stückzahl getrennt abbilden. Die identischen Preise für drei und vier Stück fachlich prüfen.
4. Stromversorgung und Lieferumfang verifizieren. Bis dahin keinen Akku-Claim und keine Batterieangabe aus einem möglicherweise fremden Variantenbild übernehmen.

**Urteil:** Aktuell öffentlich kaufbar, aber nicht freigabefähig für neue Social- oder Paid-Bewerbung. Der bestehende `rueckhol-0907`-Block ist sachlich passend.

## 2. Hopfenfilter aus Edelstahl

**Produkt:** 15509968880001
**Handle:** `hopfenfilter-aus-edelstahl-9f9627`
**URL:** <https://luxestyle.ch/products/hopfenfilter-aus-edelstahl-9f9627>
**Montage:** intern lokal geprüft; wegen ungeklärter Bildrechte nicht ins Repository übernommen.

### Sichtbarer Ist-Zustand

- Titel, Produkt und Bilder passen grundsätzlich zusammen: zylindrischer Metall-Meshfilter.
- Varianten «29CM» und «18CM» kosten je CHF 23.90 und sind verfügbar.
- Beide Varianten haben im öffentlichen JSON ein eigenes Bild: Bild 5 zeigt die lange, Bild 6 die kurze Ausführung. Das ist die sauberste Variantenabbildung in dieser Stichprobe.
- Schreibweise kundenfreundlich auf «29 cm» und «18 cm» normalisieren, sofern das Varianten-Mapping erhalten bleibt.

### Bilder

- Bilder 1–4 zeigen den Filter, Deckel/Öse und einen möglichen Einsatz bei Bier. Bilder 5–6 zeigen Masse: 29 cm beziehungsweise 18 cm Länge, je ungefähr 7 cm Durchmesser.
- Die Grössenbilder 5 und 6 besitzen im öffentlichen JSON keinen Alternativtext. Die übrigen Alternativtexte sind generisch nummeriert.
- Es gibt keine Nahaufnahme, auf der «300 Mikron» oder die Materialgüte «304» belegt beziehungsweise lesbar ist.

### Irreführende oder unbelegte Aussagen

- «absolut sicher und steril im Gebrauch» ist sachlich falsch formuliert: Ein Produkt ist nicht dauerhaft steril, nur weil es aus Edelstahl besteht.
- «ungiftig» und «sicher» sind absolute Sicherheitsversprechen ohne sichtbaren Material- oder Prüfbeleg.
- «Beständig gegen Säuren, Laugen und extreme Temperaturen», «304er Edelstahl» und «300-Mikron-Sieb» sind konkrete technische Daten. Sie dürfen erst nach Abgleich mit der zugehörigen SKU als bestätigt gelten.
- «exzellente Verarbeitung und Langlebigkeit» ist eine nicht belegte Qualitätswertung.

### Empfohlene Korrektur vor Werbung

- Titel kann bleiben. Beschreibung auf überprüfbare Bauart, verfügbare Längen und Anwendungszweck reduzieren.
- Technische Daten nur aus einer verifizierten Lieferanten-Spezifikation übernehmen; «steril», «ungiftig», «absolut sicher» und «extreme Temperaturen» entfernen.
- Fehlende Alternativtexte der beiden Grössenbilder ergänzen und eine lesbare Detailaufnahme von Gewebe/Deckel hinzufügen, falls Rechte und Quelle geklärt sind.

**Urteil:** Seiten- und Variantenlogik wirken kaufbar und nachvollziehbar. Die Claim-Bereinigung ist vor neuer Bewerbung erforderlich. Wegen Alkoholbezug in Bild/Text keine Merchant-Policy-Einstufung umgehen; sachliche Produktdaten verwenden.

## 3. Grosser Einteiler mit Karomuster

**Produkt:** 15448534122881
**Handle:** `grosser-einteiler-mit-karomuster-614700`
**URL:** <https://luxestyle.ch/products/grosser-einteiler-mit-karomuster-614700>
**Montage:** intern lokal geprüft; wegen ungeklärter Bildrechte nicht ins Repository übernommen.

### Sichtbarer Ist-Zustand

- Die Bilder zeigen eindeutig einen karierten Damen-Badeanzug mit schmalen Trägern und vorderem Ausschnittdetail. «Grosser Einteiler» ist als Produkttitel unklar und klingt nach einem grossen Kleidungsstück statt nach Bademode in grossen Grössen.
- Eine sachlichere Titelfassung wäre «Karierter Badeanzug in grossen Grössen», sofern die Zielgruppe und Grössenbezeichnung in der Quelle bestätigt sind.
- Varianten: eine Farbe «Wie abgebildet» und die Grössen 0XL bis 4XL; alle verfügbar.
- Preise: 0XL und 1XL CHF 17.90; 2XL bis 4XL CHF 18.90.

### Bilder

- Die sechs Bilder sind farblich und produktseitig konsistent und hoch genug aufgelöst. Vorder- und Rückansicht sind vorhanden.
- Fünf Bilder sind sehr ähnliche Modelposen. Es fehlt eine Stoff-, Naht- oder Verschlussdetailaufnahme.
- Entscheidend: Der Text fordert die Kundin auf, «die Masstabelle sorgfältig zu prüfen», aber in der öffentlichen Galerie ist keine Masstabelle vorhanden. 0XL–4XL sind ohne Brust-, Taille-, Hüft- oder Längenmass nicht belastbar wählbar.

### Irreführende oder unbelegte Aussagen

- «95% Polyester (Terylen)» und gleichzeitig «hohe Elastizität» sind anhand der Seite nicht belegt. Polyester allein erklärt keine hohe Elastizität; ein möglicher Elastananteil bleibt unbekannt.
- «optimaler Tragekomfort» und «perfekte Passform» sind absolute subjektive Versprechen.
- «asiatische Grössen ... kleiner» ist eine pauschale Herkunftsaussage. Nützlicher wären die tatsächlichen Produktmasse je Variante.
- «europäisch-amerikanischer Stil» hilft der Kaufentscheidung kaum und ist unbelegt.

### Empfohlene Korrektur vor Werbung

1. Titel eindeutig als Badeanzug formulieren.
2. Lieferanten-Grössentabelle der exakt zugeordneten SKU prüfen und als metrische Tabelle in cm ergänzen. Bis dahin die Aufforderung zum Prüfen einer nicht vorhandenen Tabelle entfernen.
3. Materialzusammensetzung, Futter, Elastizität und Pflegehinweise nur nach Quellenabgleich nennen.
4. Eine rechtsgeklärte Detailaufnahme von Stoff und Verarbeitung ergänzen; die bestehenden Produktbilder nicht künstlich als andere Farben oder Schnitte variieren.

**Urteil:** Öffentlich kaufbar, visuell kohärent, aber die fehlende Masstabelle macht die Grössenwahl unnötig riskant. Das ist die wichtigste Conversion- und Retourenverbesserung dieses Produkts.

## 4. Alkoholmeter-Set für Selbstgebranntes

**Produkt:** 15512184586625
**Handle:** `alkoholmeter-set-fur-selbstgebranntes-002496`
**URL:** <https://luxestyle.ch/products/alkoholmeter-set-fur-selbstgebranntes-002496>
**Montage:** intern lokal geprüft; wegen ungeklärter Bildrechte nicht ins Repository übernommen.

### Sichtbarer Ist-Zustand

- Preis CHF 20.90, eine verfügbare Standardvariante.
- Die Bilder zeigen einen blauen Kasten mit mehreren Glas-Messinstrumenten, einem separaten gelben Thermometer und einem gefalteten Blatt mit chinesischem Text.
- «Default Title» ist die technische Variantenbezeichnung. Sie ist bei einem Einvariantenprodukt meist nicht sichtbar nötig, bleibt aber im öffentlichen JSON als Variantenwert vorhanden.

### Bilder

- Die fünf Bilder sind mit 780 Pixel Breite vergleichsweise klein, dunkel und stark repetitiv.
- Skalen und Messbereiche sind in den Übersichten nicht zuverlässig lesbar. Damit lassen sich die beworbenen Bereiche 0–40 %, 40–70 % und 70–100 % aus der Galerie nicht sicher gegenprüfen.
- Das Thermometer liegt separat im Kasten; «integriertes Thermometer» beschreibt die sichtbare Ausführung daher missverständlich. «Set inklusive separatem Thermometer» wäre sachlich passender, sofern der Lieferumfang bestätigt ist.
- Die abgebildete Umrechnungstabelle ist für deutschsprachige Kundinnen und Kunden wegen der chinesischen Beschriftung nicht unmittelbar nutzbar.

### Irreführende oder unbelegte Aussagen

- «präzise», «genau» und «präzise Ergebnisse» werden mehrfach versprochen, aber Toleranz, Kalibrierung, Messprinzip und geeignete Flüssigkeiten fehlen.
- Die Messbereiche und die Referenztemperatur 20 °C müssen an der konkreten SKU beziehungsweise einer Spezifikation bestätigt werden.
- «ideal ... für die Herstellung von Spirituosen» ist werblich und erzeugt unnötigen Alkohol-Policy-Kontext. Eine sachliche Beschreibung des Messgeräts ist ausreichend; eine bestehende Plattformklassifizierung darf nicht umgangen werden.

### Empfohlene Korrektur vor Werbung

- Titel sachlicher als «Alkoholmeter-Set mit Thermometer» formulieren, wenn Lieferumfang und Messzweck bestätigt sind.
- Saubere Nahaufnahme jeder Skala, lesbare Messbereiche und eine verständliche deutsche Anleitung ergänzen; keine Werte aus dem unscharfen Bild erraten.
- Präzisionsversprechen durch belegte Messbereiche, Referenztemperatur, Toleranz und Anwendungsvoraussetzungen ersetzen. Falls diese Daten fehlen, keine Genauigkeit behaupten.

**Urteil:** Öffentlich kaufbar, aber die Informationsqualität reicht für ein Messgerät noch nicht. Die Seite braucht zuerst lesbare, quellengestützte Spezifikationen.

## 5. Katzenspielzeug mit Drehkopf

**Produkt:** 15454092558721
**Handle:** `katzenspielzeug-mit-drehkopf-618400`
**URL:** <https://luxestyle.ch/products/katzenspielzeug-mit-drehkopf-618400>
**Montage:** intern lokal geprüft; wegen ungeklärter Bildrechte nicht ins Repository übernommen.

### Sichtbarer Ist-Zustand

- Preis CHF 44.90, eine verfügbare Standardvariante.
- Die Bilder zeigen ein pinkes, elektrisch wirkendes Drehspielzeug mit Federstab. Der Titel «mit Drehkopf» ist verständlich, aber weniger konkret als «Automatisches Katzenspielzeug mit Drehfeder», sofern die Funktion bestätigt ist.
- Der öffentliche Tag `hund` passt nicht zum Produkt und kann falsche Kategorieseiten, Suche oder interne Zuordnung verursachen. Die übrigen Katzen-/Spielzeug-Tags sind plausibel.

### Bilder

- Sechs konsistente 800 × 800-Pixel-Bilder, jedoch fünf davon als englische Lieferanten-Infografiken.
- Bild 4 nennt ungefähr 18 cm Basisbreite, 15 cm Höhe und 25.5 cm Federstablänge. Diese Masse fehlen im deutschen Text und sind erst nach SKU-Abgleich zu übernehmen.
- Die Bilder behaupten zusätzlich automatische Rotation, zwei Geschwindigkeiten, Zufallsmodus und eine 15-Minuten-Verzögerung. Die öffentliche Beschreibung nennt nur automatische Rotation.
- Bild 3 behauptet «Environmentally friendly ABS» sowie Sturzfestigkeit und Langlebigkeit. Dafür ist auf der Seite kein Prüf- oder Materialbeleg sichtbar.
- Die Stromversorgung ist weder in der Beschreibung noch in den Bildern eindeutig angegeben. Bei einem elektrischen Spielzeug ist das eine zentrale Kauf- und Lieferumfangsinformation.

### Irreführende oder unbelegte Aussagen

- «Hergestellt aus ABS-Kunststoff» muss anhand der Lieferanten-Spezifikation geprüft werden.
- «zum Anregen des Jagdinstinkts» ist als Zweckbeschreibung plausibel; Aussagen wie «cat is happy» oder unbeaufsichtigte Beschäftigung in den Bildern sind nicht belegbar und sollten nicht als Ergebnisversprechen verwendet werden.
- Die weitergehenden Bildversprechen zu zwei Geschwindigkeiten, Zufallsmodus und Verzögerung gehören entweder verifiziert in die deutsche Beschreibung oder aus der Galerie entfernt. Ein Bild darf nicht mehr Funktion versprechen als die gelieferte Variante bietet.

### Empfohlene Korrektur vor Werbung

1. Stromversorgung, Batterien beziehungsweise Kabel, Einschaltlogik, Modi und Lieferumfang anhand der SKU verifizieren.
2. Den falschen `hund`-Tag nach einer Admin-Gegenprobe gezielt entfernen; keine pauschale Retagging-Aktion.
3. Englische Claim-Grafiken durch rechtsgeklärte, sachliche deutsche Produktgrafiken ersetzen oder bereinigen.
4. Sicherheits- und Aufsichtshinweise nur aus belastbarer Quelle übernehmen; keine erfundenen Haustiersicherheitsversprechen.

**Urteil:** Öffentlich kaufbar, aber vor Bewerbung fehlen zentrale Funktions- und Lieferumfangsdaten. Der bestehende Rückhol-Tag blockiert neue Social-Ausspielung korrekt.

## Gemeinsame Qualitätsbefunde

1. **Pauschaler Vertrauensblock:** Alle fünf Beschreibungen enthalten «Geprüfte Angaben», eine feste Lieferung von 10–20 Werktagen, 30 Tage Rückgabe und Zahlungsarten. Diese Prüfung hat weder Lieferzeit noch Rückgabe- oder Checkout-Zahlungsarten bestätigt. Besonders «Geprüfte Angaben» wirkt widersprüchlich, solange technische Claims und Variantenkonflikte offen sind.
2. **Rechte:** Die öffentliche Auslieferung belegt keine kommerziellen Bearbeitungs-, Werbe- oder Filmrechte. Besonders beim «Soap Magic»-Verpackungsbild und bei Model-/Tierbildern ist vor neuer Werbung ein Rechtebeleg nötig.
3. **Kaufbarkeit:** Alle fünf Seiten sind erreichbar und melden mindestens eine verfügbare Variante. Das ist kein Nachweis für Bestand, Dropshipping-Fulfillment, Checkout-Erfolg oder Liefertermin.
4. **Social:** Auf allen fünf Produkten steht `rueckhol-0907`. Keines dieser Produkte darf aus diesem Prüfstand neu über Metricool ausgespielt werden.
5. **Bilder:** Nur der Hopfenfilter hat eine klare Variantenbild-Zuordnung. Beim Seifenspender ist diese Zuordnung vollständig offen; beim Badeanzug fehlt die versprochene Masstabelle; beim Alkoholmeter fehlen lesbare Skalen; beim Katzenspielzeug fehlt die Stromversorgung.

## Reihenfolge für eine sichere Korrekturrunde

1. **Seifenspender:** Produktidentität, Varianten, Stückzahlen, Preise und Stromversorgung klären; falsche oder fremde Bilder entfernen.
2. **Badeanzug:** eindeutigen Titel und verifizierte Grössentabelle ergänzen.
3. **Katzenspielzeug:** Stromversorgung, Modi und Lieferumfang bestätigen; falschen Hund-Tag gezielt korrigieren.
4. **Alkoholmeter:** lesbare Skalen, Messbereiche, Toleranz und deutsche Anleitung beschaffen.
5. **Hopfenfilter:** absolute Sicherheitsclaims entfernen und technische Daten belegen.

Erst danach sollten neue Bildvarianten, Kategorie-Videos oder Social-Inhalte für diese fünf Produkte vorbereitet werden.

## Integritätsnachweise der öffentlichen Produkt-JSONs

| Handle | SHA-256 |
|---|---|
| `automatischer-seifenspender-1adb26` | `39960ad7fa8e8a971548988dc77dcfba0c9d5f899d83c639f57ec8933af089f2` |
| `hopfenfilter-aus-edelstahl-9f9627` | `1078c1d89d4354c6f618a6997fa5faadd7536179f3a5f1342211adf87fc202f3` |
| `grosser-einteiler-mit-karomuster-614700` | `d3a18ae57ea93b1dbf0539c45695fee018cf05ec8d059dc944e35a315c924284` |
| `alkoholmeter-set-fur-selbstgebranntes-002496` | `383420782dabdaf52b12e2eb198c70860b6d9f253b09ea25a5d1c401d9023b0b` |
| `katzenspielzeug-mit-drehkopf-618400` | `fdb3d48865892e938cc15d48401c8aefcf4b969517238b6637d50fc171bd4de2` |
