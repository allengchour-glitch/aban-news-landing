# LuxeStyle: zusätzliche Verbesserungen vom 18.10.2026

Stand ca. 19:44 Uhr Europe/Zurich. Shop LuxeStyle/luxestyle.ch/CHF und Metricool 6227837/Europe/Zurich samt sechs erwarteten Konten frisch bestätigt. Kleine gezielte Teilprüfung, kein Katalogcrawl. Keine neuen Kennzahlen-/Flow-Gesamtreports am selben Tag. Keine Posts, Terminierungen, Shop-/Tarif-/Feed-/Flow-/DNS-Änderungen, Kundenansprache oder kostenpflichtigen Renders.

## 1. Höchste Priorität: aktive Versandkonfiguration widerspricht der Projektgrundlage

Die neue öffentliche Gegenprobe fand auf Projektor- und Beleuchtungsseite Gratisversand ab **CHF 40.50** im Organization-JSON-LD und im ausgelieferten Warenkorb-JavaScript. Die Collection-Metabeschreibung nennt **CHF 50**. Die konkrete Inhabervorgabe lautet **CHF 50 öffentlich / CHF 45 nach Rabatt intern erhalten**.

Daraufhin erfolgte eine neue, begrenzte native Shopify-Gegenprobe. Ergebnis im **Allgemeinen Profil**, ID `gid://shopify/DeliveryProfile/132124180865`, CH-Zone:

| Regel | Aktuell aktiv | Bedingung |
|---|---|---|
| Standard, CHF 7 | ja | keine Mindestpreisbedingung |
| Standard, CHF 0 | ja | TOTAL_PRICE >= CHF 65 |
| Kostenloser Versand, CHF 0 | nein | TOTAL_PRICE >= CHF 45 |
| Kostenloser Versand, CHF 0 | ja | TOTAL_PRICE >= CHF 40.50 |

Eine zweite gezielte Abfrage bestätigt, dass Projektor-Variante `56197916361089` genau diesem Profil zugeordnet ist. Die CHF-40.50-Regel ist somit nicht bloss ein historischer Kommentar oder ein isolierter Schemawert. **Bestätigt ist die heutige Konfiguration; ein realer Checkout wurde nicht durchlaufen.** Aktive Rabatte, Versandrabatte und gemischte Warenkörbe wurden nicht erneut vollständig geprüft. Die alte Aussage «interne CHF-45-Regel aktuell bestätigt» wäre daher falsch; CHF 45 ist hier die Inhabervorgabe, nicht der beobachtete aktive Tarif.

Ein Offline-Rechenfall CHF 49.80 minus angenommene 10% = CHF 44.82 zeigt die Differenz zwischen 40.50 und 45. Er beweist keinen gerade aktiven Rabatt oder tatsächlich berechneten Checkoutpreis. Der ausgelieferte Code nennt einen historischen «Entscheid D»; die Ursache wird nicht als versehentlicher doppelter Rabatt ausgegeben.

**Konkreter Entscheidungsentwurf:** Zuerst den heute gefundenen Tarifkonflikt mit dem Inhaber klären. Für die gewünschte CHF-50-/CHF-45-Logik anschliessend getrennte Diffs für Tarifkonfiguration, Schema und Warenkorbanzeige vorbereiten und freigeben lassen. Vor Umsetzung alle betroffenen aktuellen Originaldateien/Regel-IDs, Rabatte und Lagerausnahmen lesen; Grenze knapp darunter/genau darauf sowie CH/LI getrennt gegenprüfen. Kein pauschales Ersetzen von 40.50 durch 45 oder 50. Bestehende Sonderprofile und Länder bleiben erhalten. **Keine Tarif-/Rabattänderung aus diesem Suchauftrag ableiten.**

Beleg: [native Gegenprobe samt Varianten-Zuordnung](shipping-native-countercheck.json). Insgesamt nur die ersten drei Versandprofile gelesen, weitere vorhanden; keine Massenpagination und keine katalogweite Aussage. Die drei Zonen und die bis zu sechs Methoden innerhalb des geprüften allgemeinen Profils waren in dieser Antwort vollständig.

## 2. Rückgabe am Kaufweg klarer formulieren

Der offene Abschnitt «Rückgabe & Umtausch» nennt 30 Tage und kostenlose Rücksendung bei Defekt/falscher Lieferung. Die normale Rücksendekostenpflicht und vorherige Anmeldung stehen erst in der verlinkten Richtlinie. Der vorhandene Kurztext verspricht keine allgemeine Gratisretoure; eine Rechtsverletzung wird nicht behauptet.

**Enger Textzusatz zur Freigabe:** «Melde deine Rückgabe zuerst an; die gültige Retourenadresse erhältst du von uns. Bei freiwilliger Rückgabe trägst du die Rücksendekosten.» Bestehenden Policy-Link und Defekt-Satz erhalten. Keine Adresse oder Frist erfinden.

[Konkreter HTML-Textdiff](return-disclosure.diff). Nur Entwurf, keine Live-Anwendung und keine vollständige Theme-Validierung. Er ändert keine Rückgaberegel, sondern macht die vorhandene Richtlinie direkt sichtbar.

## 3. Lieferland direkt am Datum nennen

Die beobachtete CH-Produktansicht zeigt ein voraussichtliches Datum ohne Land in derselben Zeile. Die Richtlinie unterscheidet CH und Liechtenstein. Eine LI-Ansicht wurde nicht geprüft; kein nachgewiesen falsches LI-Datum behaupten und keine neue Lieferzeit versprechen.

**Entwurf:** «Lieferung in die Schweiz voraussichtlich …». Das Land muss aus dem tatsächlich gewählten Lieferziel stammen, das Datum dynamisch bleiben. [Textdiff nur für die beobachtete CH-Ansicht](date-country-label.diff). Das darin enthaltene Novemberdatum ist eine Belegaufnahme, kein einzubauender fixer Text. Vor einer LI-Ausspielung den Länderzweig gesondert prüfen.

## 4. Publikationsnachweis im lokalen Entwurf robuster machen

Zwei neue Fehler ausschliesslich im **lokalen, nicht deployten Ledgerhelfer** reproduziert:

- Eine bestätigte Rücklesung mit gleicher Post-ID, aber leerer/null/undefined UUID konnte die bekannte UUID löschen. Der separate Kandidat erhält bestätigte ID/UUID bei Teilantworten.
- Eine UUID-only-Beobachtung konnte mit einer späteren ID-only-Beobachtung ohne gemeinsame Identität verbunden werden. Der Kandidat verlangt einen überlappenden Nachweis. Legitimer ID-Wechsel unter gleicher UUID bekommt eine Historie mit alter/neuer ID und Prüfzeit.

[Enger Korrektur-Diff](ledger-identity.patch). Drei neue Regressionen sind am alten Entwurf rot; Kandidat **15/15 Offline-Tests grün**, inklusive der bisherigen Parallelprozessprüfung. Zwei unabhängige Reviews ohne blockierenden Befund im engen Diff. Der vorhandene Entwurf und Produktionsdateien sind unverändert. Kein operatives Register angelegt, keine dauerhafte Speicherung bestätigt und keine Publikation freigegeben.

Integrationsgrenze: Ein `unknown` mit fremden, nicht korrelierbaren IDs wird ebenfalls abgewiesen. Ein künftiger Aufrufer muss die Rohbeobachtung getrennt sichern und `unknown` ohne diese fremden IDs, mit Grund/Belegreferenz speichern. Keine neue Sendung daraus ableiten. Vor Runtime-Integration ist dieser Aufruferpfad abzusichern.

Zusätzlich frisch festgestellt: PR [2673](https://github.com/allengchour-glitch/aban-news-landing/pull/2673) mit bereits vorbereiteter Queue-/Datumsprüfung ist weiterhin Entwurf, ungemergt und nicht konfliktfrei. Die Prüfung fehlt im gelesenen main-Publisher. Das ist eine bekannte offene Integration, kein neu erfundener Zeitprüfer. Kein Merge/Dispatch ausgeführt.

## Weitere Teilprüfungen ohne künstliche Fehlerliste

Produkt und Beleuchtungs-Collection liefern HTTP 200 und passende Canonicals; in dieser Probe kein Noindex. Robots und Sitemap-Index erreichbar, keine Sitemap-Unterseiten geladen. Das beweist keine Google-Indexierung oder Rankings. Search Console/Semrush wurden nicht neu abgefragt.

Ein mobiler Chromium-Leselauf mit 390 × 844 Pixeln zeigt den Haupt-Kaufbutton aktiv und die richtige Varianten-ID, keinen horizontalen Überlauf. Der primäre Bildrequest nutzt `fetchpriority=high`. Ein automatischer Verdacht auf einen unbeschrifteten Sticky-Button wurde nicht als belegter Fehler übernommen: im HTML existiert ein Textspan; zugänglicher Name im tatsächlich sichtbaren Sticky-Zustand wurde nicht abschliessend geprüft. Einzelne lokale Ladezeiten unter GET/HEAD-Schutz sind keine echten Core-Web-Vitals-Felddaten. Keine pauschale Geschwindigkeits-/Umsatzbehauptung.

Der professionelle Master bleibt durch hochwertige Quelle, Motivset-Zuordnung und Filmrechte blockiert. Die bereits genehmigten vier DNS-Ergänzungen warten weiter auf sicheren Schreibzugang; nicht erneut dieselbe Zustimmung verlangen. Neue Findings ersetzen weder Filmabnahme noch andere Freigaben.

## Übergabe und Status

Die Originalbelege und Kandidatdateien liegen in dieser Codex-Umgebung unter `/workspace/luxestyle-review/new-improvements-20261018/`. Für Claude werden dieser Bericht, die native Versandgegenprobe und die drei engen Diffs als Dokumentation in derselben Wissens-PR abgelegt. Keine Roh-HTML-/Browserantworten mit Sitzungsmetadaten hochladen. Testprotokolle und vollständiger lokaler Helfer sind damit nicht automatisch auf einem anderen Worker verfügbar; vor Integration dort prüfen.
