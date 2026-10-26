# LuxeStyle: Auftrag für die weitere Katalogpflege

Dateipfade wie options/, swiss-power/ und pilot/ beziehen sich auf das Arbeitsverzeichnis bzw. das vollständige ZIP. GitHub enthält die Reviewquellen und Belege; grosse CSV-/JSONL-Dateien sind dort nicht als dauerhaft bereitgestellter Betriebsbestand abgelegt.

Stand 26.10.2026, Europe/Zurich. Ausführbarer Prüf- und Reviewauftrag, keine Livefreigabe und kein neuer Zeitplan. Ausschliesslich LuxeStyle/luxestyle.ch/CHF. Vorhandene CJ-Helfer weiterverwenden, keine Neuinstallation oder breite Import-/Authdiagnose als Zugangstest. Dokumentierte Ausgangsbelege und Tagesprotokoll zuerst lesen; Fortschritt dort im selben Datumsblock ergänzen.

## 1. Bestehende Daten nutzen und kleine Arbeitsmengen bilden

Der heutige vollständige ACTIVE-Leseexport enthält 56’630 Produkte. Er wurde bereits nach Text und Optionsfeldern ausgewertet. `options/snapshot-v2` ist der endgültige Auswertungsstand; v1 bleibt Zwischenstand. Kein erneuter vollständiger Export nur für diesen Auftrag.

Die 29’720 Default-only-Produkte sind keine bestätigten Auswahlfehler. Optionswerte mit hasVariants=true sind nur belegte Labels, keine vollständigen Variantenkombinationen. Der Export enthält keine Varianten-IDs/SKUs, keine Verfügbarkeit und keine Lieferanten-vids. Verdachtsrouten überlappen und dürfen nicht als Fehlerquote addiert werden.

Pro Arbeitsrunde höchstens drei konkrete Produkte aus `options/snapshot-v2/priority-review.json` prüfen. Zuerst Strom-/Lieferumfangswidersprüche und unklare Auswahlbedeutung, danach Text-/Grössen-/Materialzuordnung. Vorhandene `auswahl-offen`, Sperr-, rueckhol-, DRAFT- und Kanaleinstellungen unverändert lassen. Eine redaktionelle Kennzeichnung erteilt keine Werbe- oder Schreibfreigabe.

## 2. Shopify und CJ exakt zusammenführen

Je Produkt frisch Shopify-ID, Beschreibungshash, Status, Tags, Optionen sowie tatsächlich vorhandene Varianten mit ID, SKU, selectedOptions, CHF-Preis, Inventar-Tracking und inventoryPolicy lesen. Nur begrenzte Produktabfragen. Öffentliches Produkt-JSON/Formular zur Gegenprobe verwenden, keine Bestellung oder Kundenansprache.

Danach CJ über die im aktuellen Repo vorhandenen Strategien auflösen: Varianten-SKU beziehungsweise belegte pid verwenden, erfolgreiche Antwort und exakte String-IDs prüfen. Eine Produkt-pid ist keine Varianten-vid. Pro geplanter Variante braucht es die konkrete vid, Varianten-SKU, unveränderten variantKey und zugeordnetes echtes Bild. Keine fehlenden Kombinationen durch kartesisches Multiplizieren erzeugen. Vorhandene Shopify-Varianten nicht aus einem neuen CJ-Snapshot löschen oder ersetzen; unklare historische Auftragszuordnungen offen halten.

Aktuelle Helfer: automation/lib/cj_token.mjs, cj_fetch.mjs, cj_response.mjs; automation/cj_varianten_nachziehen.mjs, cj_variantenbilder.mjs und cj_fakten_block.mjs. Der vorhandene Variantenhelfer unterstützt genaue Handles und Trockenlauf; er überspringt bereits mehrvariantige oder markierte Produkte. `LIMIT` begrenzt Produkte, nicht API-Requests. Fracht wird je Gewichtsklasse geprüft; ein Frachtangebot ist keine Versanddauer- oder Bestandszusage. Der Faktenhelfer kann vorhandenen Cache lesen; FORCE allein belegt keine frische Quelle. Cachealter und tatsächliche Antwortaufnahme dokumentieren, keine alten Dateien als neu ausgeben.

CJ-Zugang ist in GitHub Actions belegt: bestehender Probelauf 40364261840, kein eigener Start. Lokale Runtime 586 besitzt keine gebundenen CJ-Secrets; GitHub-Secrets werden nicht ausgelesen oder in den Chat kopiert. Der bestehende Probe-Workflow umfasst zusätzlich Installation/KI/Kandidatenscan und wurde hierfür nicht ausgelöst. Wenn der sichere, begrenzte Ausführungskontext fehlt, Quellenfall blockiert belassen und unabhängig prüfbare Daten weiterbearbeiten. Vor einem späteren Dispatch vollständigen Code, Credential-Bindings, Umfang und Ausgabepfade prüfen; keine blinden Wiederholungen nach unklarem Zustand.

## 3. Schweizer Stecker und Stromversorgung pro Ausführung

Vorhandenen Stecker-Wächter als Vorsortierung erhalten. Sein Ergebnis ist kein positiver CH-Konformitätsnachweis. Der neue reine Review-Export liegt nur als Entwurf in `swiss-power/entwurf/stecker_cj.mjs` und ist im produktiven Caller nicht eingebunden.

Je exakt zugeordnetem Variantenpaar belegen: tatsächlicher Lieferumfang, mitgeliefertes Netzteil/Netzkabel oder nur USB-Kabel, konkrete Steckerform, lesbares Typenschild mit AC-Eingangsspannung und Frequenz, Gerätebedarf und Netzteilausgang sowie notwendige Schutz-/Konformitätsunterlagen. Bild/Datenblatt mit Datum, URL und SHA-256 archivieren. «EU», «US», CE, USB oder eine Variantenübersetzung allein genügen nicht. Die USB-Gerätespannung ist nicht die Netzteil-Eingangsspannung.

Schweizer Netzreferenz 230 V / 50 Hz. Schweizer Stecker und belegter Eurostecker sind zu unterscheiden; ein Schuko-/E/F-Stecker ist kein Typ-C-Eurostecker. ESTI beschreibt Voraussetzungen für bestimmte Fixadapter; ein beliebiger beigelegter Reiseadapter begründet keine Freigabe. Adapter- und gemischte Lieferfälle bleiben fachlich zu prüfen. Keine Stecker-/Spannungsbehauptungen aus Geschwistervarianten übernehmen.

Der Entwurf gibt unknown/reject/needsReview/evidenceComplete zurück, niemals approved. evidenceComplete bestätigt nur die Struktur und den dokumentierten manuellen Nachweissatz. Bei USB-only wird kein Schweizer Netzteil bestätigt. Originalquelle und Grenzen stehen in `swiss-power/SOURCE.md`, aktuelle Abrufarchive in ESTI-LIVE.json/SWISS-TOURISM-LIVE.json. Die erste Caller-Prüfung war wegen fehlender lokaler Quelldatei blockiert. Der spätere isolierte Frozen-Snapshot-Lauf bestätigt fünf Legacy-Fälle gegen Baseline und Entwurf. Der neue Evidenzreview bleibt dabei ohne Aufruf im produktiven Caller.

## 4. Gute Texte aus belegten Angaben schreiben

Schweizer Standarddeutsch, ss, verständliche Auswahlhilfe. Nutzen und Design nur aus tatsächlichen Merkmalen ableiten. Masse, Material, Spannung, Lieferumfang und Bedienung nur für die passende Ausführung nennen. Modellabhängige Angaben bei der jeweiligen Variante aufführen; gemeinsame Beschreibung nur für tatsächlich gemeinsame Eigenschaften. Grössenlabels S/M/XL sind keine Körper- oder Kleidermasse. Keine «normal bestellen»-Empfehlung ohne Mass-/Passformbeleg.

Echte Variantenbilder zuordnen; ein Bildvergleich allein ersetzt keine SKU-/vid-Bindung. Fehlende technische Angaben intern als Quellenaufgabe führen. Keine erfundenen Werte, Bewertungen, Gesundheitswirkungen, Swiss-made-, Lager- oder Lieferzeitversprechen. Bestehende Service-/Policylinks erhalten, keine Rabatte oder pauschalen «geprüft»-Badges neu einführen. Wortzahl dient nur zur Vorauswahl, nicht als SEO-Mindestvorgabe.

Je Entwurf erzeugen: Produkt-/Varianten-ID, aktueller BEFORE-Hash, genaue Herkunftsbelege, AFTER-HTML, enger Feld-Diff, offene Fragen und Validierung. Feldänderungen klar von vorhandenen korrekten Daten trennen. Kein pauschaler Import der 18’180 früheren Auswahlhilfen oder der 20’395 aktuellen redaktionellen Kandidaten.

## 5. Konkreter erster Text: genehmigt und umgesetzt

Genau der vorhandene Trenchcoat-Entwurf für Produkt 16603335754119, ausschliesslich descriptionHtml. Aktuelle Vorlage bytegleich zum geprüften BEFORE; vorher 271cb88215210b259b1d549af75ec9e98374c2f69ab54f3c7df02650f8e281a6, nachher c8922da85f1b0df162251ebc91e19479c5901efffc8e96d6d0ce10571cd96963.

Er beschreibt sichtbares Revers/Knopfreihen, Stylingideen und die echten acht Farben/sechs Grössen. Alle 48 Varianten wurden nativ und im öffentlichen Produkt-JSON mit ID/SKU/Titel/Preis gegengeprüft. Keine neue Material-, Mass-, Wärme- oder Passformzusage. Text/Diff und frische Gegenprobe in `pilot/TRENCHCOAT-TEXT-FREIGABE.json` und dem vorhandenen Trenchcoat-Diff. Bestehender Entwurf neu validiert und danach einmalig ausdrücklich genehmigt übernommen; keine neue Neufassung. Implementierungsbeleg in pilot/TRENCHCOAT-IMPLEMENTIERUNG-20261026.json.

Für diesen konkreten Trenchcoat-Text ist die Freigabe inzwischen ausdrücklich erteilt und der einmalige Write nativ/öffentlich bestätigt. Nicht nochmals anfragen oder anwenden. Bei weiteren Texten die jeweils konkrete Freigabe beachten und unmittelbar Quelle/Hash erneut lesen; bei Abweichung stoppen und Diff erneuern. Preis, Optionen, Varianten-IDs/SKUs, Inventar, Bilder, Tags, Versand, Flows und Kundendomäne bleiben ausserhalb dieses einen Textwrites. Nach einem erlaubten Write Beschreibung frisch zurücklesen; unklaren Write als unknown erfassen, nicht blind erneut senden.

## 6. Dauerhafte Nachweise und laufender Rhythmus

Bestehenden Zeitplan beibehalten. In jeder vorhandenen Runde einen sinnvollen, belegten Schritt weiterführen. Keine neue Frequenz oder automatische Produktbereinigung eingerichtet. Prozesszustände getrennt führen: entdeckt → Quelle offen → Vorschlag erstellt → geprüft → konkret freigegeben → geschrieben → zurückgelesen. Wiederholte Prüfungen nicht als neue Umsetzung zählen.

Katalogprüfung ersetzt kein Master-Publikationsledger. Socialausspielung weiter nur über Metricool und nach sämtlichen Produkt-, Rechte-, Qualitäts-, Kanal- und Doppelpostprüfungen. Der eine professionelle 18s-Master bleibt derselbe; keine Ersatzclips für ungeklärte Produktausführungen. Öffentliche Versandschwelle CHF 50, interne CHF 45 nach Rabatt und account.luxestyle.com.co bleiben erhalten. Keine anderen Marken, Kundenansprache, kostenpflichtigen Renders, Shop-/Feed-/Flow-/Budget-/Rabatt-/DNS-Aktivierungen.
