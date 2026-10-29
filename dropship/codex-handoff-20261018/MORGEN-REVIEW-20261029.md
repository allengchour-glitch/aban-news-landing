# Unabhängige Prüfung des Morgenlaufs 29.10.2026

Nur lokale Quellenprüfung durch Codex. Keine zusätzlichen API-, Bestell-, Kennzahl- oder Kontoschreibzugriffe. Geprüft: KAUFBELEG.json, ADS-STATUS.json, Klaviyo-Bericht, kuratierte Belege, Vorher-/Nachher-HTML, Diff und ausgewählte lokale Originalantworten. Zusätzlich wurden Masterpaket, Facebook-Caption-Diff, Metricool-Bericht samt bestehender unabhängiger Offline-Gegenprobe, Verkaufs- und Auswahl-Ledger-Berichte sowie das zusammengeführte MORGENPAKET.md gelesen.

## Kaufbeleg

- Die Baseline entspricht Abschnitt 18: `2026-10-28T23:48:36Z`.
- Vollständiges geprüftes Fenster: 29.10.2026 00:48:36 bis 08:09:37 Europe/Zurich. Die native Antwort enthält keine Bestellungen und `hasNextPage=false`.
- Zulässige Aussage: In diesem Fenster kein neuer qualifizierender Kauf bestätigt. Keine Aussage über frühere Käufe, spätere Käufe oder Ursache/Wirkung einer Massnahme.
- Die festgehaltene Kaufdefinition verlangt PAID, Nicht-Test, nicht storniert, positiven aktuellen Bestellwert, keine vollständige Rückerstattung und eine erfolgreiche positive Nicht-Test-SALE/CAPTURE über ein nicht manuelles Gateway. Da die Liste leer ist, wurde die Qualifikation hier auf keinem tatsächlichen Auftrag ausgeübt.

## Google Ads

- Die gelieferte Zielkampagne ist PAUSED. ENABLED bei Anzeigengruppe, Anzeige und Keywordkriterien belegt keine aktuelle Auslieferung unter dieser Kampagne.
- Acht eindeutige Keywordkriterien mit vier verschiedenen Texten geliefert. Ohne Matchtypen und vollständige Zuordnung ist daraus keine Duplikatdiagnose abzuleiten.
- Die fehlgeschlagene Feldkombination wird als Fehler erhalten; die korrigierte kleine Abfrage ist separat dokumentiert.
- Auto-Tagging liefert keine Zeilen und bleibt unbekannt. Das Purchase-Ziel bleibt ohne GOAL_SETUP_READY-Beleg unbekannt. CHF 58 und Zeitraum stammen ausdrücklich aus der Inhabervorgabe, nicht aus einer hier bestätigten Budgetabfrage.

## Klaviyo

- Genau ein kleiner Report, vier bekannte Flows, sieben abgeschlossene Zürcher Kalendertage. Das UTC-Fenster umfasst wegen der Zeitumstellung korrekt 169 Stunden.
- Die beiden kuratierten Reportzeilen und sämtliche ausgewählten Statistikwerte stimmen mit der lokalen Originalantwort überein. Fehlende Recovery-/Abbruchzeilen bleiben unbekannt. Attribution-Nullen werden nicht als fehlende Shopkäufe oder fehlender Sync ausgegeben.
- USD-Konto und Shopify-CHF bleiben getrennt; unerwartete monetäre Felder wurden nicht summiert.
- Genau eine Verbesserung: Verfeinerung des bestehenden Welcome-Serviceabschnitts. Zwei HTML-Zeilen ändern sich. Vorher-/Nachher-Hashes stimmen; übrige Bytes, Haupt-CTA, Gutschein und technische Platzhalter bleiben erhalten. Kein Flowstart oder Versand.
- Die öffentliche Versandpolicy trägt die im Entwurf verwendete Abgrenzung: Standardversand innerhalb der Schweiz ab CHF 50 nach Rabatten; interne CHF 45 unverändert.
- Leere Forms-API bedeutet nicht fehlendes Capture. Der lokale HTML-Quelltext enthält Popup- und Footer-Scripts mit passender Site-/Listen-ID und Client-Subscriptions-Endpunkt. Ausführung, echte Anmeldung und Zustellung bleiben ungetestet.

## Datenschutz und Belegqualität

In den vier kuratierten Hauptbelegen keine Kundenprofile, E-Mail-Adressen, privaten Schlüssel oder Zugangstokens gefunden. Rohes Policy-/Widget-HTML gehört nicht zusätzlich in die dauerhafte Übergabe.

Der ursprünglich abweichende Capture-HTML-Hash wurde vom zuständigen Agenten korrigiert: `sourceHtmlSha256` entspricht jetzt den echten HTTP-Bytes der lokalen shipping-policy.html (`b99818535986e3337c2ed0b2bf932cba955111be9f612d03246ddd3164dc241c`). Genau ein CRLF wird beim Textlesen zu LF normalisiert; dadurch entsteht unabhängig reproduziert der separate Normalformhash `f7b106769a87df8c677a69196e87fb911e055371d5e34c41e72af273eeb68eed`.

Der zusätzliche `selectedScriptSha256`-Wert `7bb6f71f…` ist weder als Popup-/Footer-Body noch als vollständiges oder getrimmtes Script reproduziert. Er bleibt unbestätigt und darf nicht als unabhängig geprüft bezeichnet werden. Ersatzbelege wurden Root bereitgestellt: UTF-8-Quelle, CRLF→LF, Regex `<script\b[^>]*>([\s\S]*?)</script>` mit `re.I`, SHA-256 über UTF-8 von Gruppe 1 ohne Trim. Popup mit `lx_popup_v1`: 4’098 Zeichen, SHA-256 `38a0828e787fc168414065f555df1d0711e12c707fe26b70a40065e85d6e4707`; Footer: 1’287 Zeichen, SHA-256 `eaf906628dd1fabcd8e12127f1c856a9d523476d2cc8af0e77a9847cae5ef7d2`. Die sachliche Capture-Quellcodeaussage ist lokal bestätigt; keine Anmeldung wurde ausgeführt.

## Master und Metricool

- Derselbe 18-Sekunden-Master und dieselbe masterId werden fortgesetzt. Referenzplan, neue Strom-Beleganforderungen und eine Facebook-Caption sind als Vorbereitung eingeordnet; keine MP4, eigene Veröffentlichung oder Rechteabnahme behauptet.
- Die aktuelle Facebook-Caption enthält keine neue Funktionsbehauptung. Ihr Diff ändert genau die Caption desselben Kanals/Masters; Produkt-UTM und übrige Texte bleiben laut enger Gegenprobe erhalten.
- Der Projektor und der ausgewählte LX-Diffuser werden korrekt voneinander und vom früher anders geprüften Diffuser unterschieden. Mengenstand 0 bei ungetracktem Bestand/CONTINUE wird nicht als ausverkauft bewertet. Bildgrafiken werden nicht als unabhängiger Material-/Funktionsbeleg behandelt.
- Instagram/TikTok behaupten weder ein vorhandenes Projektor-Bioziel noch klickbare Caption-Links. Pinterest bleibt ohne bestätigtes Board blockiert. Die bestehende YouTube-Zielgruppenentscheidung wird von der heute nicht gelesenen Plattformeinstellung getrennt.
- Metricool trennt vollständige Views-Reihen (Instagram 1’481, Facebook 1’191, jeweils 7/7 Tage) von Teilreihen. TikTok 3’482/28 bei 4/7, YouTube 2’812 bei 5/7, Pinterest 8’227/137 bei 5/7 und Threads-Einzelwerte werden nicht als vollständige Wochenwerte oder Verkäufe ausgegeben.
- Planung: 16 bestehende Objekte/UUIDs und 28 PENDING-Kanalzustände. Keine neue eigene Veröffentlichung; Vergleich der bestehenden UUIDs statt Behauptung identischer Zeitfenster. Der Teil 05.11. bis 08:10 bleibt als Teilfenster gekennzeichnet. Fehlende Termine werden nicht in automatische Postingpflicht umgedeutet.

## Verkaufsgrundlagen und fremder Ablauf

- Der Pyjama-Bericht behandelt die bereits sichtbare Preis-Klarstellung als geprüfte bestehende Änderung. Die Gesamtpreisspanne ist nativ; fünf einzelne Varianten sind ausdrücklich eine Stichprobe. HTTP 200, Canonical und robots-Gegenprobe sind kein Indexierungs-/Rankingnachweis.
- Der rueckhol-Tag bleibt erhalten; neue Social-Ausspielung bleibt dadurch gesperrt. Kein Budget, Rabatt, Preis oder Anzeigenstatus geändert.
- Die 1’910 neu als GESCHRIEBEN protokollierten Handles sind ein Beleg des bestehenden fremden Ablaufs. Der Bericht grenzt sie korrekt von 2’600 neuen Ledger-Zeilen, eigenen Codex-Writes und einer aktuellen Katalog-Vollständigkeitsquote ab. Handles werden nicht als native Produkt-IDs ausgegeben; fehlender Einzelprodukt-Readback bleibt offen.
- Öffentliche CHF 50 und interne CHF 45 werden nicht verändert. Keine neue Restprozentzahl aus unpassenden Nennern erzeugt.

## Zusammengeführtes Morgenpaket

Das MORGENPAKET.md hält die geprüften Grenzen ein: keine vollen Wochenwerte aus Teilreihen, keine Budgetaktivierung, keine fremden oder älteren Änderungen als neue Codex-Umsetzung und genau eine Welcome-Service-Freigabevorlage. Eine Sprachpräzisierung wurde Root gemeldet: «Keine Kundenprofile oder Kontaktdaten abgefragt; keine Bestellidentitäten geliefert» statt pauschal «Keine Kundendaten abgefragt», weil die leere Orderquery auch id/name-Felder vorsieht.

Die vorbereitete Publish-Fassung MORGENPAKET-20261029.md enthält diese Präzisierung. Sie und MASTER-STORYBOARD-20261029.md wurden ebenfalls gelesen: keine ungelösten relativen Markdownlinks abseits der vorhandenen kanonischen Arbeitsstand-/Protokolldateien; Bildreferenzen verwenden die echten CDN-Adressen. Beide JSON-Bundles enthalten in der gezielten Prüfung keine E-Mail-Adressen, privaten Schlüssel oder Zugangstokens. Im Master-JSON ist nur die Facebook-Caption geändert; sechs eindeutige UTMs zeigen auf dieselbe geprüfte Produktvariante und tragen passende Kanalquellen.

Zwei abschliessende Verpackungspunkte wurden Root gemeldet: den unbestätigten zusätzlichen Scripthash ersetzen oder ausdrücklich abgrenzen; die im Mastertext verlinkte alte Captionquelle CAPTIONS-UTM-ABEND.json im Bundle ergänzen oder das Linklabel auf den vorhandenen Provenienznachweis präzisieren. Diese Punkte verändern keine Leistungswerte oder Freigaben.

Stand: Keine weitere konkrete fachliche Beanstandung. Diese Prüfung ist keine Produktionsfreigabe.


## Root-Nachtrag: Verpackung geprüft

29.10.2026: Beide Reviewpunkte korrigiert. Das kuratierte Bundle kennzeichnet den alten nicht reproduzierbaren Scripthash als unbekannt und enthält beide unabhängig bestätigten Bodyhashes mit exakter Extraktionsregel. Root hat diese gegen die gespeicherten HTTP-Bytes erneut berechnet. Die alte Captionquelle ist vollständig unter ihrem Originalnamen im Master-Bundle erhalten. Sechs eindeutige UTMs und stabile masterId gegen die vorherige Captionquelle verglichen; keine MP4 behauptet. Alle JSON-Dokumente lesbar. Keine neuen API-Abfragen oder operativen Writes für diese begrenzte Validierung.
