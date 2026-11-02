# Claude: konkreter Website-Auftrag, 02.11.2026, R53

Die aktuelle Inhaberbitte lautet «mache weiter dann claude veröffentliche». Der konkrete Website-Breitenfix ist bereits durch die bestehende Website-/Sortiererlaubnis gedeckt. Diese Erlaubnis erneut nicht abfragen. Der Inhaber hat die Zielauswahl inzwischen ausdrücklich mit «Die Website-Verbesserungen» beantwortet. Dieser Auftrag gilt für die Website. Welcome und Produktfilm sind davon ausgeschlossen; keine erneute gleiche Zielfrage.

**Status:** Vorbereitung und frische Gegenprobe abgeschlossen. Kein MAIN-Write, keine Theme-Veröffentlichung und kein tatsächlicher Claude-Start. Im aktuellen Toolkatalog ist kein Claude-Dienst aufrufbar; im PATH fehlt die Claude-CLI. Das Speichern dieses Auftrags im Repo ist kein bestätigter Empfang durch Claude. Ein vorhandener legitimer Claude-Code-Zugang kann den folgenden konkreten Auftrag ausführen.

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Identität | Shop und Metricool mit allen sechs erwarteten Konten frisch geprüft | luxestyle.ch / CHF, Marke 6227837 / Europe/Zurich passen |
| Aktueller Website-Stand | Vier Dateiinhalte und zusätzlich 13 bekannte Releasepfade per Prüfsumme verglichen | MAIN 213013037447; 11 von 13 bekannten Dateien mit gleicher Prüfsumme, darunter Galerie, Editor, Sprachen und Startseite. CSS enthält zusätzlich aktuelle Hero-Abstände; Collection-Breitenfix offen. Keine vollständige UI-/Themeabnahme |
| Breitenfix | Genau eine CSS-Regel aus frisch gelesener MAIN-Datei korrigiert | Alle anderen Bytes erhalten, JSON-Struktur erhalten und geänderter Liquid-Block VALID/SUCCESS. Kandidat nur lokal, nicht live |
| Mobile Gegenprobe | Zwei echte MAIN- und zwei echte Entwurfsansichten bei 390 px ohne Overrides geprüft | MAIN 18/26, acht Breiten-/Scrollfehler: Dokument 406 statt 390 px. Entwurf 26/26, Dokument 390 px. Vorschau ist kein MAIN-Fix |
| Claude / Welcome | Tatsächlichen Übergabeweg und genau VZnxDz frisch geprüft | R5-Quellen und Hashkette verified, aber review_only und Empfang unbekannt. Welcome-Original unverändert; kein Templatewrite, keine Nachricht |

## Ausführbarer Umfang für Claude

1. Vor jeder Aktion aktuelle Inhabervorgaben und die vier kanonischen Dateien in diesem Handoff-Ordner frisch lesen. Shop muss luxestyle.ch / CHF sein. Tatsächlichen MAIN und Rolle nochmals nativ lesen. Der aktuell geprüfte MAIN ist **213013037447**, «LuxeStyle – Schrift und Banner 02.11.2026».
2. Genau **templates/collection.json** aus diesem aktuellen MAIN lesen. Ausgangs-MD5 **6c0ccc1bf403cc94bf55d1dd98b3ea84**, SHA-256 **5f18ff70271c79cda33efeceb51cfeb27ccb601d0c9b0b49f61ed494ed63f0f0**. Vollständiger Vorhertext, Kandidat und exakter Diff stehen in den [R53-Belegen](CLAUDE-PUBLISH-BELEGE-20261102-R53.json). Bei irgendeiner Quellenabweichung nur den tatsächlichen neuen Diff prüfen und die einzelne Regel neu binden; nichts still überschreiben.
3. Nur den folgenden CSS-Präfix im bestehenden lux_subchips-Block ändern. Genau ein Treffer, keine anderen Bytes oder Felder ändern:

Vorher:

```css
.lx-uf{max-width:min(var(--page-width,1200px),100vw);
```

Nachher:

```css
.lx-uf{max-width:min(var(--page-width,1200px),100%);width:100%;min-width:0;
```

4. Diese eine Regel über einen vorhandenen legitimen, für MAIN-Dateien befugten Shopify-Zugang übernehmen. Der hier verfügbare Shopify-Toolvertrag sperrt MAIN-Dateiwrites und Theme-Publikation; er wurde nicht umgangen und kein gesperrter Write versucht. Keine neue Installation, Hook-/Credential-/Workflowroute oder neue Theme-Kopie dafür erzeugen. Fehlt auch bei Claude der legitime Writer, den konkreten technischen Blocker melden.
5. **Nicht den ganzen alten Entwurf 212978598279 veröffentlichen.** Er hat ältere Stile. Aktuelle MAIN-Schrift-/Banneränderungen und sämtliche anderen Codebytes bleiben erhalten. Die 11 frisch identischen bekannten Pfade nicht nochmals übertragen. In assets/luxe-edit.css ist der vollständige Entwurfsinhalt bereits enthalten, ergänzt um aktuelle mobile Hero-Höhe, Textabstände und Buttonabstand; diese Ergänzung bewahren. Die Prüfsummen belegen Dateien im MAIN, keine vollständige gerenderte Selbstgestalten-/Checkoutabnahme. Für weitergehende Änderungen ist ein vollständiger frischer Diff nötig.
6. Danach dieselbe MAIN-Datei frisch zurücklesen. Erwarteter Kandidaten-MD5 **bbacad38aabc5e292ed819b3d1b01782**, SHA-256 **53c20c7e9162ea449e3f81a6cccf7744660e0d00534bf51409048df0dd2cf88b** und vollständiger Text müssen exakt passen. Bei unklarer Antwort zuerst dieselbe Datei lesen, keine blinden Wiederholungen. Es wird das vorhandene Live-Theme gezielt ergänzt, keine alte Gesamtkopie aktiviert.
7. Öffentliche [Handy-Gruppe](https://luxestyle.ch/collections/handy-zubehoer) und [Kabel-Unterkategorie](https://luxestyle.ch/collections/ladekabel-datenkabel) nach der Änderung in getrennten Kontexten auf 390 und 1440 px prüfen. DE/FR-Sprachpfade, Unterfilterziele, aktive Markierung, Dokumentbreite ohne seitlichen Überlauf sowie neue Schrift/Banner erhalten. Keine Cookies akzeptieren, Warenkörbe schreiben oder Tracking-/Checkoutabnahme daraus ableiten.
8. Tatsächlichen Ausführungsbeleg liefern: Zeitpunkt/Europe-Zurich, Writer-/Run- oder Commitreferenz, Shop und MAIN, Datei, vorher/nachher Hash, API-Ergebnis und exakte native sowie öffentliche Rücklesebelege. Empfang und Ausführung getrennt dokumentieren. Eine selbst eingetragene actor=claude-Zeile beweist keine aufrufbare Sitzung. Nur belegte eigene Tätigkeit im heutigen Tagesprotokoll mit frischem SHA fortschreiben.

## Welcome und Produktfilm getrennt erhalten

Die Welcome-Vorlage VZnxDz ist frisch unverändert bestätigt. Derselbe R52-Zwei-Zeilen-Entwurf hat vorher SHA-256 1739b5bb2a2a532d478e766927a413b68d3c1a8ee881f61f2479ed28d802fb8b und nachher 16472801fde74ce010e16ccb5b4561b3501ac1ba6dfa0ae305f926e493fb496a. **Hier nicht anwenden:** Der Inhaber hat ausdrücklich die Website ausgewählt; die Welcome-Korrektur gehört nicht zu diesem Veröffentlichungsauftrag. Bei späterer eindeutiger Freigabe denselben vorhandenen Diff verwenden, konkrete aktuelle Flow-/Transactional-Bindung prüfen und ausschliesslich zwei HTML-Zeilen schreiben, ohne Testversand, Flow-/Coupon-/Trackingänderung. Vollständiger bedingter Auftrag und aktuelle Gates stehen in den Belegen. Keine bereits beantwortete Freigabe später erneut verlangen.

Der eine Projektor-Master bleibt wegen fehlender passender Originaltakes, Ausführungs-/Motivbindung, kommerzieller Filmrechte und fertiger MP4-Abnahme blockiert. Diese Weiterarbeitsbitte ersetzt keinen Nachweis. Kein Foto-Zoom-Ersatz, Altclip oder Social-Push. Bestehende bestätigte Termine und Register erhalten.

Öffentliche Versandgrenze CHF 50, interne CHF 45 nach Rabatt und account.luxestyle.com.co bleiben erhalten. Keine Kundenkontakte, zusätzlichen Report-/Kauf-Watchabfragen, Rabatte, Budgets, Ads-/DNS-/Flow-/Shop-Einstellungen, Installationen oder neue Automationen/Frequenzen. Nur LuxeStyle bearbeiten. Die R5-Prüfung bestätigt fünf historische Quellen und die R4-Kette; sie ist keine neue Code-/Produktionsabnahme oder echte Claude-Quittung.
