# Auftrag für PC-Claude: Kundenmails von Shopify auf Rückgabe-Aussagen lesen (9.11.2026)

Für den PC-Claude mit Brave (Port 9222, eingeloggt, siehe `dropship/BROWSER-AGENT-SETUP.md`). Besitzer-Auftrag im Chat 9.11. («alle punkte erledigen»; meine Auslegung: die letzte offene Stelle des Rückgabe-Textes schliessen). Hintergrund: `dropship/rueckgabe-0611/README.md`, Wortlaut: `dropship/rueckgabe-0611/WORTLAUT-WELLE2.md`.

## Warum nur im Browser
Die Shopify-Schnittstelle kennt keine Abfrage und keine Änderung der Kundenmail-Vorlagen (GEMESSEN 09.11. 23:5x UTC: weder `notification`-Abfragen noch -Mutationen ausser Geschenkgutscheinen). Cloud-Claude kann den heutigen Wortlaut der Mails darum weder lesen noch ändern.

## Regel, die die Mails nicht verletzen dürfen (gilt seit 06.11./09.11.)
- Normale Ware: **30 Tage Rückgabe** (Gesetzliche Rechte bleiben).
- **Selbst gestaltete Artikel** werden erst nach der Bestellung nach dem Entwurf gedruckt: **keine Rückgabe und kein Umtausch aus Meinungsänderung** oder falscher Grössen-/Farbwahl; bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust Ersatz oder Erstattung (Meldung innert 30 Tagen nach Erhalt, info@luxestyle.ch mit Bestellnummer und Foto).
- Mängel melden: **30 Tage** (nicht 7).

## Grenzen (gelten vor allem anderen)
- **Schritt 1 ist nur Lesen.** Nichts speichern, nichts senden, keine Testmail an Kundinnen. Eine Vorschau ans Konto des Besitzers ist erlaubt.
- Schritt 2 (Ändern) nur, wenn der Besitzer im Chat ausdrücklich «Ja, Bestellmail ändern» schreibt.
- Nichts bezahlen, keine anderen Einstellungen anfassen. Bei Login-Wand, 2FA oder Sicherheitsabfrage: anhalten und melden.
- Vor jeder Änderung die Vorlage als Text sichern (vollständigen Quelltext in eine Datei im Scratch kopieren), danach Rücklesen.

## Schritt 1: Lesen (immer)
1. Shopify-Admin, **Einstellungen, Benachrichtigungen, Kundenbenachrichtigungen**. Für diese Vorlagen jeweils «Code bearbeiten» öffnen, **nichts ändern**:
   Bestellbestätigung · Versandbestätigung · Bestellung storniert · Rückerstattung · Versandaktualisierung · Lieferbestätigung · Bestellung zur Abholung bereit (falls vorhanden).
2. In jedem Quelltext nach diesen Wörtern suchen (Gross-/Kleinschreibung egal): `Rückgabe`, `Rückgab`, `retour`, `return`, `refund`, `Umtausch`, `Widerruf`, `30 Tage`, `7 Tage`, `14 Tage`, `Garantie`, `Rückerstattung`.
3. Je Fundstelle melden: Vorlage, Zeile, **wörtlicher Text** (ein bis zwei Sätze Umgebung). Für Vorlagen ohne Fundstelle: «keine Rückgabe-Aussage».
4. Zusätzlich melden: Enthält die Bestellbestätigung eine Zeile, die selbst gestaltete Artikel erkennbar macht (Eigenschaften wie `_pod_karte`, `Design`, `Druckdatei`)? Nur ja/nein und wo.

## Schritt 2: Ändern (nur nach dem Ja des Besitzers)
Nur Fundstellen anpassen, die der Regel widersprechen (z. B. «30 Tage Rückgabe» ohne Ausnahme in der Bestellbestätigung eines selbst gestalteten Artikels, oder «7 Tage» bei Mängeln). Vorschlag für den Zusatz, den Claude vorher mit dem Besitzer abstimmt:

> Selbst gestaltete Artikel werden erst nach deiner Bestellung für dich gedruckt. Eine Rückgabe aus Meinungsänderung ist dort nicht möglich; bei Druckfehlern, Beschädigung oder falscher Lieferung ersetzen oder erstatten wir. Details: [Rückgabebedingungen]

Der Zusatz gehört nur dann in die Mail, wenn Liquid die selbst gestalteten Artikel erkennen kann (z. B. `{% if line_item.properties._pod_karte %}`); sonst allgemein und kurz formulieren oder weglassen und nur den Link auf `/policies/refund-policy#selbst-gestaltete-artikel` ergänzen.

## Bericht an den Besitzer (kurz, Deutsch)
Tabelle: Vorlage · Fundstelle (wörtlich) · widerspricht der Regel ja/nein. Dann: «Soll ich ändern?» Was nicht ging, offen sagen, nichts raten.

## Was danach Claude macht (nicht PC-Claude)
Zeile «Rückgabe-Text: letzte Reste» im Dashboard «Offene Punkte» und `dropship/rueckgabe-0611/README.md` nachführen.
