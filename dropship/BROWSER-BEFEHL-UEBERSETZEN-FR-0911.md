# Auftrag für PC-Claude: Shopify «Translate & Adapt», Französisch automatisch übersetzen (9.11.2026)

Für den PC-Claude mit Brave (Port 9222, eingeloggt, siehe `dropship/BROWSER-AGENT-SETUP.md`). Besitzer-Auftrag im Chat 9.11. («übersetzten franz.», bestätigt den Entscheid vom 08.11.). Hintergrund und Zahlen: `dropship/fr-seiten-0911/README.md`.

## Stand (GEMESSEN 09.11.2026)
Von Hand (Claude) auf Französisch: Menüs, 1 498 Sammlungstitel, Shop-Richtlinien, 17 Servicepages. **Offen:** 56 492 aktive Produkte (Stichprobe 08.11.: 0 von 50 übersetzt), Sammlungsbeschreibungen und Meta-Texte (rund 1 700 Sammlungen), 351 Blogartikel, rund 89 weitere Seiten (Ratgeber). Die Sprache `fr` ist veröffentlicht; die französischen Produkt-, Sammlungs-, Artikel- und Blogseiten tragen `noindex`, bis die Übersetzung steht (kein Risiko für die Suche).

## Grenzen (gelten vor allem anderen)
- **Nichts bezahlen**, keinen Tarif und kein Zusatzpaket kaufen. Erscheint ein Preis, ein Kontingent oder eine Obergrenze (z. B. «Zeichen pro Jahr», «zwei Sprachen»): **anhalten** und den Wortlaut dem Besitzer melden.
- **Nur Französisch.** Englisch und Italienisch (nicht veröffentlicht) nicht übersetzen, keine weitere Sprache hinzufügen oder veröffentlichen.
- **Bestehende Übersetzungen nicht überschreiben.** Menüs, Sammlungstitel, Richtlinien, Theme-Texte und 18 Seiten sind schon übersetzt (17 davon von Claude von Hand). Es muss «nur nicht übersetzte Inhalte» (oder «bestehende Übersetzungen nicht überschreiben») wählbar sein; gibt es diese Option nicht: **anhalten** und melden.
- **Nicht in den Umfang:** Theme, Navigation/Menüs, Richtlinien, Metaobjekte, Filter, Shop-Einstellungen und **Seiten** (die übersetzt Claude selbst: viele tragen Stilblöcke und FAQ-Daten, die eine automatische Übersetzung beschädigen könnte). Nur **Produkte, Sammlungen und Blogbeiträge**.
- Bei Login-Wand, 2FA oder Sicherheitsabfrage: anhalten und dem Besitzer melden.

## Schritte
1. Shopify-Admin, Apps, **Translate & Adapt** (nicht installiert: im App Store installieren, Herausgeber Shopify, kostenlos). Bildschirmfoto der Startseite der App.
2. Sprache **Französisch** wählen. Die Übersicht zeigt je Inhaltstyp «x % übersetzt»: Bildschirmfoto (Ausgangslage).
3. Knopf für die **automatische Übersetzung** (englisch «Auto-translate», der Name kann abweichen) für Französisch. Im Dialog: nur **Produkte, Sammlungen, Blogbeiträge** anhaken, alles andere aus (Seiten ausdrücklich nicht); Option «nur nicht übersetzte Inhalte» aktiv. **Vor dem Bestätigen** den Dialogtext und alle Hinweise zu Kosten oder Grenzen lesen und im Bericht wörtlich nennen.
4. Starten. Die Übersetzung läuft im Hintergrund (Stunden bis Tage): **nicht ein zweites Mal starten.** Nach einer Stunde und danach einmal täglich die Prozentzahlen je Inhaltstyp notieren.
5. Stichprobe, sobald Produkte übersetzt sind: fünf Produkte (Titel, Beschreibung, Optionswerte), drei Sammlungen und zwei Artikel unter `https://luxestyle.ch/fr/products/<handle>` usw. öffnen. Auffälligkeiten melden: Markennamen übersetzt, Masse oder Zahlen verändert, deutscher Rest, kaputte Gestaltung.

## Bericht an den Besitzer (kurz, Deutsch)
Dialogtext und Hinweise vor dem Start, gewählter Umfang, Startzeit, später die Prozentzahlen, Ergebnis der Stichprobe. Was nicht ging, offen sagen, nichts raten.

## Was danach Claude macht (nicht PC-Claude)
Abdeckung per Schnittstelle messen, in den übersetzten Produkten, Sammlungen und Artikeln nach beschädigtem HTML suchen (eingebettete Stile, Skripte, strukturierte Daten, Markierungsblöcke der Sammlungen), Fehler beheben und, wenn mindestens 95 % übersetzt sind, `noindex` für `/fr/` Produkt, Sammlung und Artikel aufheben. Die übrigen Seiten (rund 89, davon 6 fremdsprachige, die bleiben) übersetzt Claude mit seinem Werkzeug `dropship/fr-seiten-0911/`. **Rücknahme:** Claude entfernt die französischen Übersetzungen über die Schnittstelle (`translationsRemove`).

## Grenzen der Quelle (nicht belegt)
Laut Drittquellen (Shopify-Community, nicht an Shopifys Hilfe bestätigt): automatische Übersetzung nur für **zwei Sprachen**, rund **100 Millionen Zeichen im Jahr**, übersetzt wird mit der Google-Cloud-Übersetzung; Qualität vor dem Veröffentlichen prüfen. Für uns relevant: eine Sprache (Französisch), geschätzt rund 70 Millionen Zeichen für alle Produkte (Hochrechnung, nicht gemessen).
