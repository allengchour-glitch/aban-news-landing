# LuxeStyle: Merchant- und GSC-Diagnose vom 06.11.2026

## Umfang

Dieser Lauf wertet den vollständigen Inhaber-Export `product_issues_2026-11-06_12-51-44.csv` sowie zwei vom Inhaber verlinkte Google-Sheets-Berichte aus. Die Tabelleninhalte sind Diagnosewerte und keine Handlungsanweisungen. Shopify wurde frisch als `LuxeStyle` / `luxestyle.ch` / CHF / Schweiz bestätigt. Es gab keine Änderung an Shopify-Produkten, Bildern, Publikationen, Merchant-Quellen, Versandländern, Redirects, Themes, Metricool, Klaviyo oder anderen externen Systemen.

## Google Merchant: aktueller Export

Der Export ist technisch lesbar: 5'879'774 Bytes, SHA-256 `a631f4dec17909ede81e677da19e43e0bac0b60cca04abda683ee22610f131ae`, 17'014 vollständige Zeilen, keine exakt doppelte Vollzeile und 8'374 unterschiedliche Item-ID-Strings. Eine Item-ID kann mehrere Länder-, Kanal- und Fehlerkontexte tragen; die Gruppen dürfen deshalb nicht addiert und als Produktzahl ausgegeben werden.

| Befund | Unterschiedliche Item-IDs | Einordnung |
|---|---:|---|
| CSS-Kapazität für Shopping-Anzeigen | 4'483 | Konto-/Kapazitätsbefund; kein Produkttext-Fix |
| Fehlender Produktpreis | 1'598 | eingereichte Quelle/Rohfelder zuerst lesen |
| Versandangaben in einigen Ländern fehlen | 1'487 | ausschliesslich Feed-Label DE / Deutschland; Länder-/Versandkonfiguration, nicht Produkttext |
| Werbeeinblendung auf Bild | 400 | Bildprüfung am Original nötig; keine automatische Bildersetzung |
| Personalisierte Werbung: persönliche Notlagen | 231 | Richtlinienprüfung; keine Textumschreibung zur Umgehung |
| Verfügbarkeit fehlt | 48 | eingereichte Quelle/Rohfelder zuerst lesen |
| Bild zu klein | 41 | Originalauflösung und Rechte je Bild prüfen |
| Sexuelle Interessen / eingeschränkte Inhalte | je 31 | Richtlinienprüfung und bestehende Sperren erhalten |
| Waffen und Teile | 20 | Richtlinienklassifizierung; Fehlklassifikationen nur belegt anfechten |
| Zusatztext im Bild | 18 | Originalbild einzeln prüfen |
| Tabakprodukte/Zubehör | 16 | Richtlinienklassifizierung |
| Rechtliche Einschränkungen | 12 | Richtlinienklassifizierung |
| Produktseite nicht verfügbar | 9 | Produkt-/Quellenstatus und Ziel-URL einzeln prüfen |
| Alkohol / Verkauf lebender Tiere | je 8 | Richtlinienklassifizierung |
| Erwachsenenorientierte Inhalte | 6 | Richtlinienklassifizierung |
| Identität/Glaube | 5 | Richtlinienklassifizierung |
| Bild nicht verarbeitet / lokale Anforderungen / Waffen / Verarbeitung ausstehend | je 1 | Einzelprüfung beziehungsweise Verarbeitung abwarten |

Gegen die drei getrennten Exporte vom 05.11. sind 7'434 Item-IDs weiterhin enthalten, 7'654 dort vorhandene IDs fehlen im neuen Export und 940 erscheinen neu. Der Vergleich beweist keine Ursache oder Eigenwirkung. Belastbar sichtbar sind folgende ID-Änderungen: Preis 3'008 auf 1'598 (−1'410), CSS-Kapazität 10'628 auf 4'483 (−6'145), Verfügbarkeit 61 auf 48 (−13), Deutschland-Versand 1'452 auf 1'487 (+35). Werbeeinblendungen und mehrere Richtliniengruppen wurden im neuen Export erheblich breiter zurückgeliefert; ein Scope-/Reprocessing-Effekt ist deshalb nicht ausgeschlossen.

## Begrenzte Shopify-Gegenprobe

- `15516154462593`, im Export als «Produktseite nicht verfügbar»: aktuell DRAFT, vier Varianten zu CHF 78.90. DRAFT bleibt DRAFT; keine Aktivierung zur Fehlerkosmetik.
- `16614814843271`, im Export mit Bild-/Policykontext: aktuell ACTIVE, zwei Varianten zu CHF 70.90 beziehungsweise 89.90 und vier Bilder. Der Export allein beweist nicht, welches Bild Google beanstandet oder ob eine zulässige Ersatzquelle existiert.
- `15493863997825`, im Export mit fehlender Versandinformation für Deutschland: aktuell ACTIVE, 50 Varianten zu CHF 17.90–18.90. Shopify-Preiswerte sind vorhanden. Das repariert die fehlende DE-Versandkonfiguration nicht und rechtfertigt keinen Produktpreis-Write.

Die CSV enthält weder aktive Merchant-Quellen-ID noch eingereichte URL, Rohpreis, Rohverfügbarkeit oder Rohversandfelder. Wie in R101 bleibt deshalb ein externer Feed-Write ohne authentifizierten Einzelartikel-Read unsicher.

Der bestehende zeitgesteuerte Google-Schaufenster-Lauf `42217557695` vom 06.11.2026 12:25 UTC ist erfolgreich abgeschlossen und enthält den vorgesehenen Schritt «Schaufenster (abwählen)». Er liegt zeitlich nahe am Rückgang der CSS-Kapazitätsfälle, beweist ihn aber nicht als Ursache. Es wurde kein zusätzlicher Workflow gestartet.

## GSC Video-Indexierung

Die erste Tabelle trägt das Problem «Das Video befindet sich nicht auf einer Wiedergabeseite»: 128 Zeilen, 103 normalisierte Grundpfade beziehungsweise Video-IDs, 20 Mehrfachgruppen, 42 `/fr/`-URLs und 21 URLs mit Query-Parametern. Alle 128 Zustände sind `Ausstehend`; das ist weder bestanden noch fehlgeschlagen.

Claude hat `VideoObject` bereits am 22.10.2026 eingebaut. Das aktuelle Repo belegt `name`, `description`, `thumbnailUrl`, `uploadDate` und `contentUrl`; `embedUrl` fehlt, ist bei selbst gehostetem MP4 aber kein belegter Hauptfehler. Der dokumentierte Hauptbefund bleibt: Das Video erscheint erst nach Interaktion im DOM, und die Produktseite ist keine videozentrierte Wiedergabeseite. Das bestehende Markup wird nicht doppelt gepusht. Ein sinnvoller nächster Schritt wäre ein Pilot mit höchstens ein bis drei videozentrierten Seiten und anschliessender GSC-Gegenprobe.

## GSC Coverage / 404

Die zweite Tabelle trägt das Problem «Nicht gefunden (404)»: genau 1'000 Zeilen, alle `Ausstehend`, Crawl-Daten 07.–24.10.2026. Verteilung der URL-Sprache: 910 Grundsprache, 53 `/en/`, 32 `/it/`, 5 `/fr/`. 264 URLs enthalten Query-Parameter; nach Entfernen von Sprache und Query bleiben 874 normalisierte Grundpfade. Es gibt 89 Mehrfachgruppen mit zusammen 215 Zeilen. Diese Normalisierung ist eine Analysehilfe und kein Canonical-Beweis.

Eine erste Crawler-Stichprobe von sechs URLs zeigte vier HTTP-404-Seiten und zwei scheinbare Startseitenantworten mit HTTP 200. Die Gegenprobe per direktem `curl` am 06.11.2026 um 21:06 UTC widerlegt diese beiden Weiterleitungen: Beide Pfade liefern echte HTTP 404, keinen `Location`-Header, null Redirects und behalten die angefragte URL. Der begrenzte Mischbefund besteht somit aus vier Crawler-404-Antworten und zwei direkt bestätigten 404-Antworten; daraus wird keine Quote für die 1'000 Tabellenzeilen abgeleitet. Die zwei zusätzlich per `curl` geprüften Handles gehören zu DRAFT-Produkten:

- `drei-stab-keramik-glatte-lockenstab-153856`, Produkt `15454105076097`, DRAFT, Tag `stecker-unpassend-ch` und `rueckhol-0907`;
- `sonnensegel-uv-schutz-schattenspender`, Produkt `15411030557057`, DRAFT, Tag `keine-lieferanten-ref`.

Für beide Pfade liefert Shopifys `urlRedirects`-Abfrage keinen Eintrag. `origin/main` enthält keine Produkt-404-Weiterleitung: `automation/link_guard.mjs` behandelt nur sichere Collection-Pendants; der letzte versionierte MAIN-Layout-Snapshot enthält ebenfalls keine 404-Redirectlogik. Das vollständige Live-Theme ist nicht im Repository versioniert. Ein DRAFT-Produkt wird nicht aktiviert. Ohne nachgewiesenen identischen Nachfolger bleibt der entfernte Pfad 404/410; nur belegte Nachfolger erhalten einen zielgenauen 301. Interne Links, Sitemap- und Feed-Ursprung sind davor einzeln zu bereinigen.

## Entscheidung und nächster sicherer Schritt

1. Für Merchant je genau einen aktiven Preisfall und einen DE-Versandfall in der tatsächlich einreichenden Quelle lesen: Quellen-ID, eingereichte URL, Preis/Währung, Verfügbarkeit, Zielland und Versand. Erst danach einen engen Quelldiff vorbereiten.
2. Für Coverage die 1'000 URLs begrenzt nach belegtem Nachfolger, veraltetem Query-/Sprachpfad und weiterhin referenzierter Quelle klassifizieren. Keine Massenweiterleitungen und keine Reaktivierung gesperrter DRAFT-Produkte.
3. Für Video-Indexierung das bestehende `VideoObject` erhalten und höchstens einen 1–3-Seiten-Wiedergabeseiten-Pilot zur Freigabe ausarbeiten.

Es erfolgten keine externen Writes. GSC-Validierungen bleiben ausstehend; Merchant-Neuverarbeitung und Ursachenwirkung sind unbekannt.
