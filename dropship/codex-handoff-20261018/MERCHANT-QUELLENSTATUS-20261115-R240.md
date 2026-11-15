# R240 – Merchant: offene Quellenfehler konkretisiert – 15.11.2026

Der Inhaber meldet weiterhin **18 Fehlergruppen im Dashboard**. Der vollständige heutige UI-Gruppenumfang ist mit den verfügbaren Lesewerkzeugen weiterhin **unbekannt**. Frisch geprüft wurden eine auf 5'000 Produkte begrenzte, abgeschnittene Summary und zwei Seiten mit je 100 abgelehnten Angeboten. Keine Kataloghochrechnung. Die Kontoissue-Antwort war leer; das bedeutet nicht, dass Produktfehler behoben sind.

**Die vier bereits korrigierten Nagellack-Angebote 1/6/7/11 sind weiterhin für CH und LI in allen sechs gelieferten Kontexten genehmigt; keine erneuten Bildwrites.** Modell 6 hat jetzt sechs kontextbezogene Hinweise zur fehlenden Grundpreis-Mengenangabe, jeweils severity NOT_IMPACTED. Keine Ablehnung daraus ableiten und keine ml-/g-Angabe erfinden. Bei 1/7/11 waren itemLevelIssues leer.

**Zwei konkrete AUTOFEED-Fälle:** Primer-Offer 10283932347178265394 fehlt bei Google weiterhin der Preis; Variante 56210226708865 / CJMJ173930601AZ ist frisch nativ und auf der tatsächlichen Angebots-URL mit **CHF 56.90** bestätigt. Drei JSON-LD-Blöcke sind gültig; kein belegter Preis-Markupfehler. Beim Elefanten-Wandteppich-Offer 10301937935043325310 fehlt Google availability und meldet zusätzlich **landing_page_pending_crawl**. Die einzige aktuelle Shopify-Variante 56075316363649 kostet CHF 15.90, ist untracked/CONTINUE und öffentlich kaufbar; ihr gültiges Offer-Markup enthält InStock. Das ist kein Nachweis physischen Lagerbestands oder eines erfolgten Google-Crawls. Beide Angebote stammen frisch bestätigt aus **AUTOFEED 10678939025**. Der verfügbare Update-Writer unterstützt API-Quellen; kein legitimer AUTOFEED-Editor oder bestätigter bestehender API-Override. Keine Quelle, Regel, Preiszahl oder pauschale Verfügbarkeit auf Verdacht geschrieben.

**Ein zusätzlicher Bildfix ist konkret vorbereitet:** Garagentor-Offer shopify_ZZ_15448882938241_55878125060481 stammt aus API 10667445201 und verwendet weiterhin das alte Voice-Control-Werbebild. Das bereits vorhandene Shopify-Hauptbild ist 1024×1024, HTTP 200, SHA-256 fc00a9b0cc04a12573852da3ee04ad971b2833964dc382347440c770bdec3a66. Visuell ohne grosse Werbeheadline, aber mit Appdarstellung und Sensor. Exakter Diff würde ausschliesslich image_link ersetzen. **Kommerzielle Bearbeitungs-/Werberechte und Produkt-/Farbtreue einschliesslich Sensorumfang und seitlicher Anschlüsse sind nicht bestätigt.** Frühere Nagellackfreigaben gelten nicht für dieses neue Garagentorbild. Deshalb nur ein vorbereiteter Diff, kein Feedwrite, keine neue Freigabe behauptet. Aktuelle Shopify-Hauptbildposition ist kein Rechtenachweis; rueckhol-0907 bleibt eine Socialsperre.

Shop luxestyle.ch/CHF/Europe/Zurich, Metricool 6227837 samt allen sechs erwarteten Kanalidentitäten und Merchant 5797470070 passen. Keine Kennzahl-, Flow-, Funnel- oder Bestellreport-Wiederholung, Kauf-Watch beendet. Keine Shop-, Theme-, Feed-, Flow-, Budget-, DNS-, Rabatt- oder Frequenzänderung; keine kostenpflichtigen Renders. R239-Theme-Versanddiff bleibt getrennt offen.

Die anschliessende Frage zum Kauf einer Game-Boy-ähnlichen Konsole ist mangels Modell/Produktlink offen; gezielt danach gefragt, keine enthaltenen Spiele behauptet und kein Warenkorb/Kauf erstellt. Claude-Empfang unbekannt.

[Prüfbelege](MERCHANT-QUELLEN-BELEGE-20261115-R240.json) · [Partielle Arbeitsliste](MERCHANT-ARBEITSLISTE-20261115-R240.csv) · [vorbereiteter, gesperrter Bilddiff](MERCHANT-GARAGENTOR-BILDDIFF-20261115-R240.json).

[LUXESTYLE_R240_20261115]


### R240 – Merchant-Quellen und nächste Bildkorrektur

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Identität / Begrenzung | Core4 Revision 239 und heutigen Tagesblock frisch gelesen; Shop, Marke und Merchant abgeglichen. | luxestyle.ch/CHF/Europe/Zurich, Metricool 6227837 samt sechs Kanälen und Merchant 5797470070 bestätigt. |
| Merchant / Teilprüfung | Eine abgeschnittene 5'000-Produkte-Summary und zwei Disapproval-Seiten mit je 100 Angeboten gelesen. | Weiterhin konkrete Ablehnungen; 18 UI-Gruppen nicht vollständig erfasst. Leere Kontoissue-Antwort bedeutet keine fehlerfreien Produkte. |
| Vier bisherige Bildfixes | Exakte Angebote für Nagellack 1/6/7/11 frisch direkt gelesen. | Alle vier in sechs gelieferten Kontexten CH/LI genehmigt, keine Overlay-Meldung. Modell 6 hat NOT_IMPACTED-Grundpreishinweise; keine Mengen erfunden, keine neuen Writes. |
| Quellen / Preis und Availability | Primer und Elefanten-Wandteppich an native Varianten und aktuelle öffentliche Offer-Markups gebunden. | CHF 56.90 beziehungsweise CHF 15.90/InStock im Shop belegt, Google-AUTOFEED weiterhin unvollständig; beim Wandteppich zusätzlich Pending Crawl. Kein unterstützter AUTOFEED-Writer oder echter Google-Neucrawl belegt. |
| Bild / vorbereiteter Diff | Garagentor-API-Offer, vollständiges Shopify-Produkt und drei echte Bilddateien verglichen; ausschliesslichen image_link-Diff vorbereitet. | Neues vorhandenes Hauptbild 1024×1024; Rechte und genaue Produkt-/Sensor-/Porttreue unbekannt. Kein Feedwrite und keine Ausweitung der Nagellackfreigaben. |
| Konsole / offene Rückfrage | Für die neue Kaufanfrage nach genauem Modell oder Produktlink gefragt. | Enthaltene Spiele unbekannt; kein Kauf oder Warenkorb erstellt. |
| Grenzen / Memory | Fehlerhafte lokale Extraktion korrigiert, Teilnachweise und Blocker dokumentiert. | Keine heutigen Leistungs-/Flow-/Funnel-/Bestellreports wiederholt; keine operativen Änderungen oder neue Automation. Claude-Empfang unbekannt. |

[Bericht](MERCHANT-QUELLENSTATUS-20261115-R240.md) · [Belege](MERCHANT-QUELLEN-BELEGE-20261115-R240.json).

