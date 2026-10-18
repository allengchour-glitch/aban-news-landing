# LuxeStyle: vorhandene Semrush-Ergebnisse konkret umgesetzt

Stand 18.10.2026. Code implementiert und offline geprüft; Seitenänderungen sind konkrete Entwürfe zur Inhaberfreigabe. Kein Shop-Write, kein Workflow-Dispatch, kein Deployment, kein kostenpflichtiger Abruf und keine Nachricht ausgeführt. Historische Semrush-Daten vom 04.10. samt späteren Korrekturen wiederverwendet. Die gewählte Stichprobe ist kein Katalogscan und liefert keine aktuellen Rankings oder Verkäufe.

## Codeänderung

`automation/seo-optimizer.mjs` arbeitet standardmässig als Vorschlagswerkzeug. Es verlangt eine explizite Liste von 1–6 Produkt-IDs und prüft Shopname, Admin-Host, primäre Domain und CHF. Lesegrenze und Vorschlagsgrenze sind getrennt; es gibt keine Katalogpagination. Bereits ausgefüllte SEO-Felder bleiben bytegetreu erhalten und werden nicht in eine Änderungsoperation aufgenommen. Neue Beschreibungsentwürfe enthalten keine automatisch übernommenen Rabatt-/Versandversprechen.

Fehlende Daten, Auth-/429-/Transportfehler bleiben unbekannt. Mutationsfehler und fehlende Erfolgs-ID zählen nicht als Erfolg; explizite Ablehnungen liefern einen Fehlerstatus. Eine etwaige spätere autorisierte Änderung verlangt unmittelbar vorher einen Vergleich von Identität, Status, Titel und SEO-Feldern und danach die frische Rücklesung. Unklarer Write wird nicht wiederholt und stoppt weitere Writes. Diese Möglichkeit im Code ist keine Freigabe, heute Änderungen zu senden.

Der manuelle Workflow ist fest auf Review gesetzt: DRY_RUN=1, APPLY_SEO_APPROVED=0, keine Telegram-Secrets, kein Cron. Ein Bericht wird als Artefakt gesichert. Die CI führt die neuen Offline-Regressionen aus; hier wurde kein Workflow manuell gestartet. Der vorhandene Titel-/GraphQL-/Secret-Helfer bleibt unverändert. Ein kleiner bereits lokal vorhandener Hostprüfer wird als neue, explizite Abhängigkeit beigefügt.

**Bewusste Schnittstellenänderung:** Alte Aufrufe mit LIMIT=150/5000 und ohne PRODUCT_IDS werden blockiert. Sie dürfen nicht unverändert weiterverwendet werden. Der neue manuelle Workflow ist angepasst; fremde GitLab-/Server-Aufrufer wurden nicht als aktuell deployt verifiziert. Vor Merge/Deployment diese Aufrufer prüfen. Ein täglicher Autolauf wurde nicht eingerichtet.

## Zwei Semrush-Ziele, drei Beschreibungstext-Diffs

1. **Hausschuhe & Slipper**, Collection 689776001409: veraltete Artikel-/Preis-/Materialstatistiken und pauschale Grössen-/Pflegebehauptungen durch konkrete Auswahlhinweise ersetzt. Redaktionelle Zwischenüberschriften auf H2. Keine neue statische Artikelzahl gesetzt: alte Beschreibung 179, öffentlicher Ergebniszähler 197, native Gesamtzahl 209 haben unterschiedliche Zeit-/Datenscopes. Der gesamte bestehende Abschnitt nach «Gut zu wissen» inklusive Versand-/Zahlungstexten und Elternlink bleibt bytegetreu erhalten.
2. **Schuhe**, Collection 688018162049: genau ein redaktioneller Link zur vorhandenen Hausschuhe-Collection in «Passend dazu» ergänzt.
3. **T-Shirts & Tops**, Collection 689775182209: genau ein sachlicher Kontextlink zur bestehenden Camisole-Produktseite ergänzt. Kein Material aus dem alten Baumwoll-Handle abgeleitet; der sichtbare Produktname und das echte Bild zeigen das Corsagen-Top. Der Produkttext selbst, Titel, SEO-Metadaten und Tags werden nicht verändert. `rueckhol-0907` bleibt eine Sperre für neue Social-Ausspielung.

[Vorher/Nachher-Vorschau](VORSCHAU.html), [Manifest mit Ressourcen-IDs, Feldnamen und exakten Inhalts-Hashes](content/changes.json). Die .before.html-Dateien entsprechen den vollständigen nativ gelesenen descriptionHtml-Werten. Vor einem späteren Shop-Write Originale erneut lesen und Hash gegenprüfen; bei Abweichung neuen Diff bilden. Die öffentlichen Ziele und Elternseiten lieferten in der gezielten Probe jeweils HTTP 200 und passende Canonicals. Bilder wurden als Referenz angesehen. Daraus folgt keine aktuelle Indexierung oder Umsatzwirkung.

## Prüfung und Grenzen

- 22 neue Offline-Regressionstests bestanden: Grenzen, falsche Hosts, Feldschutz, Dry-run ohne Telegram, frische Gegenprobe, Fehlerantworten, unbekannte Writes, Readback und Medien-Stichprobe.
- Bestehende Titelprüfungen bestanden; beide geänderten Workflowdateien mit YAML-Parser und Review-Zwang geprüft.
- Die tatsächliche neue READ-Abfrage wurde nativ für die ausgewählte Camisole erfolgreich ausgeführt. Eine lokale Wiedergabe dieser echten Antwort erzeugte keine Änderung, weil die SEO-Felder bereits vorhanden sind.
- ProductUpdateInput/SEOInput und Rückgabefelder wurden gegen die aktuelle Admin-Schema-/Dokumentationsquelle geprüft. Der native eigenständige Validator meldete «skipped». Eine echte Mutation wurde nicht ausgeführt; Live-Schreibkompatibilität wird deshalb nicht als getestet behauptet.
- Medien werden ausdrücklich nur als Stichprobe von höchstens drei Einträgen bezeichnet; PROCESSING ist nicht FAILED. Weitere Medienseiten bleiben ungeprüft.

Offline wiederholen: `node --test automation/seo-optimizer_test.mjs` und `node automation/lib/seo_titel_test.mjs`. Keine echten Credentials für Tests verwenden. Der aktuelle Runtime-Zugang hatte keine bereitgestellten Shopify-CLI-Credentials; Kontozugang erfolgte über native Connectoren. Kein Auth-/Quota-Fehler wird als leerer Shop ausgegeben.

Shop-/Versand-/Feed-/Flow-/DNS-Regeln, Kundendomäne, Rabatte, Budgets, bestehende Inhalte und der offene professionelle Film wurden nicht aktiviert oder geändert. Die CHF-40.50-/CHF-45-Tarifabweichung bleibt ein gesonderter bereits dokumentierter Entscheidungsbedarf. Der Code-PR ist kein Deployment; die drei Shoptexte bleiben zur Freigabe vorbereitet.
