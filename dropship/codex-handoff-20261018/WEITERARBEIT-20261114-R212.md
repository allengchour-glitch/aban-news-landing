# LuxeStyle – Weiterarbeit R212, 14.11.2026

Der Repo-Feedfehler ist korrigiert und die echte Kern-CI ist grün. Der Code steht auf einem getrennten Zweig, noch nicht produktiv. Neu ist der belegte Google-Zugang über den vorhandenen Workflow: drei exakte Angebote wurden gelesen, mit konkreten Source-, Preis- und Bildbefunden. **0 Merchant-Fehler ist nicht bestätigt.**

[Codezweig](https://github.com/allengchour-glitch/aban-news-landing/tree/codex/luxestyle-merchant-fix-20261114-r212) · [drei erfolgreiche CI-Jobs](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/43615418470) · [Claude-Code-Übergabe](CLAUDE-CODE-HANDOFF-20261114-R212.md) · [Merchant-Belege](MERCHANT-GEGENPROBE-20261114-R212.json).

Der Preisfall stammt aus Source10678939025; seine Produktadresse leitet auf eine Kategorie um. Die beiden Nagellackfälle stammen aus Source10667445201 und nutzen bei Google alte Textbilder, während der Shop bereits textfreie Variantenbilder zeigt. Der neue Reader bewahrt bekannte Felder auch bei fehlenden Statusdaten; seine drei Läufe endeten deshalb ausdrücklich partial_read/Exit2. Das ist keine vollständige Freigabe und kein gescheiterter Login.

Nächste konkrete Verkaufsverbesserung: genau diese alte Produkt-/Autofeed-Zuordnung und die zwei bestehenden Google-Bildzuordnungen bereinigen, jeweils erst nach frischem Objekt-/Rechteabgleich. Für direkte Shopkorrekturen gilt der letzte bekannte Reauth-Blocker; für den Shop-wirksamen Code-Merge gilt die bestehende Arbeitsteilung mit Claude. Keine DRAFT-Produkte aktivieren, keine Länder-/Versanddienste erfinden, keine gesamte Quelle pauschal löschen. Das zusätzliche potenziell erforderliche Attribut von Modell6 bleibt unbekannt.

Das SEO-Theme213991391623 bleibt im R211 bestätigten Live-Stand; in R212 kein weiterer Theme-Publish. Kein neuer Film, Socialpost, Rabatt, Budget, Kundenkontakt, Flow-/DNS-/Versandwrite oder Kaufwatch. Die aktuellen Tageskennzahlen/Klaviyo aus R200 werden weiterverwendet.

### R212 – Feed-Fix, echte CI und drei konkrete Merchant-Gegenproben, 14.11.2026

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Feed-Code | Kennungsfehler korrigiert, Mutationsreihenfolge ohne weniger Tests optimiert, zwei Commits auf eigenem Codezweig gespeichert und alle sechs Dateien zurückgelesen | Kerncommit7d2d79a; Lesercommit807b6bc. Nicht main, kein produktiver Feedlauf oder Google-Fix |
| CI | Alte/neue Fassung mit allen221 Mutanten verglichen; vollständigen lokalen Job und bestehenden GitHub-CI-Workflow geprüft | Beide221/221;350.580s→259.868s im Vergleich. Lokal9/9 in405.312s. Echte GitHub-CI drei Jobs erfolgreich; Reader-Head Quality Check erfolgreich |
| Merchant | Bestehenden Workflow nach Code-/Identitäts-/Schutzprüfung für drei exakte CSV-Angebote nur lesend ausgeführt | GCP-Zugang funktioniert; Source-/Preis-/Bild-/Issue-Werte gelesen. Drei partial_read/Exit2 wegen unbekannter Statusfelder; keine Business-Writes, keine0-Fehler-Behauptung |
| Zielseite | Exakten Google-Link des Preisfalls mit und ohne Redirect-Folgen geprüft | Produktadresse301→Damenmode-Kategorie200; Google-Preis null, Source10678939025. Kein echter404, kein Preis-/DRAFT-/Autofeedwrite |
| Bilder | Zwei echte Google-Bilder und zwei aktuelle Shop-Variantenbilder geladen und angesehen; öffentliche Variantenantwort geprüft | Google nutzt alte Textbilder DT282/DT284; Shop zeigt textfreie PNGs für dieselben IDs. Je Google CHF15.90; Rechte-/vollständige Produktabnahme nicht neu belegt, keine neue Bildbearbeitung |
| Gedächtnis | R212-Belege, konkrete Claude-Code-Übergabe und Core4 fortgeschrieben |24 Aufgaben-IDs/Historien/Tagesschranke/Zeitplan erhalten. Claude-Code-Empfang unbekannt. Keine neuen Tagesreports, Orders, Socialposts oder Renders |
