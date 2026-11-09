# Französische Rückgaberichtlinie und AGB (09.11.2026)

**Auslöser:** Die Übersetzungen `fr` der beiden Rechtstexte waren seit Rückgabe-Welle 2 «veraltet» und nannten weiter «dans les 7 jours» (GEMESSEN auf `/fr/policies/refund-policy` am 09.11. 17:52 UTC); die französische Richtlinie kannte den Abschnitt «selbst gestaltete Artikel» nicht. Der Besitzer antwortete am 09.11.2026 auf die Frage, ob ich beide Texte neu übersetzen soll, mit «ja».

## Was LIVE ist (09.11.2026 18:29 UTC)
- `REFUND_POLICY` (Rückgaberichtlinie, 41 Textblöcke, deutsch 10 009 → französisch 10 821 Zeichen) und `TERMS_OF_SERVICE` (AGB/CGV, 35 Blöcke, 4 713 → 5 211 Zeichen), je das Feld `body` der Sprache `fr`. Vorher: 4 842 bzw. 4 266 Zeichen, beide als «veraltet» markiert.
- Inhalt: der heutige deutsche Text nach Welle 2 und «Mängelfrist 30 Tage», also auch der Abschnitt «Articles personnalisés (impression à la commande)», die Liechtenstein-Regel (FAGG) und die Frist von 30 Tagen für Mängelmeldungen.
- Anrede «vous», Schweizer Schreibweise (CHF, Suisse). Interne Links zeigen auf `/fr/…`, Mailadresse, Telefonnummern, Adresse und der Anker `#selbst-gestaltete-artikel` sind unverändert.

## Messung
- **Rücklesen:** beide Richtlinien frisch gelesen GLEICH dem Soll und nicht mehr «veraltet».
- **Storefront (curl, Browser-Kopf, 09.11. 18:3x UTC):** `/fr/policies/refund-policy` und `/fr/policies/terms-of-service` zeigen die neuen Titel, «dans les 30 jours suivant la réception», 0 mal «7 jours»; die deutsche AGB-Seite ist unverändert (30 Tage, 0 mal «7 Tagen»).
- **Test:** `node dropship/fr-richtlinien-0911/apply_test.mjs` (56 Prüfungen, offline: das deutsche Original wird aus `../rueckgabe-0611/sicherung/welle2.json` plus den zwei Fristen-Ersetzungen nachgebaut). Geprüft werden Blockzahl, Anker, Gerüst, Tag-Folge je Block, Zahlen (gleiche Ziffernfolge in beiden Sprachen), Links mit `/fr`, Restdeutsch, keine 7-Tage-Frist. Mutationsprobe im Scratch: 21 von 21 absichtlichen Fehlern erkannt (die erste Runde liess eine Lücke im Plan, mit eigenem Test geschlossen).

## Methode und Befehle
Die deutsche Richtlinie wird in Blöcke (h2, h3, p, li) zerlegt, jeder Block bekommt seinen französischen Inhalt aus `paare.mjs` (mit Anker, dem Textanfang des deutschen Blocks); das Gerüst bleibt. Geschrieben wird über `translationsRegister` mit dem frisch gelesenen Digest.
- Trockenlauf (Vorgabe): `node dropship/fr-richtlinien-0911/apply.mjs`
- Einspielen: `LIVE=1 node dropship/fr-richtlinien-0911/apply.mjs` (nur eine Richtlinie: `NUR=REFUND_POLICY`)
- **Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/fr-richtlinien-0911/apply.mjs` schreibt die alte Fassung aus `sicherung/fr-alt.json` zurück (sie gilt danach wieder als «aktuell», obwohl inhaltlich veraltet und mit «7 jours»: nur für den Notfall).
- **Ändert sich die deutsche Richtlinie** (auch nur ein Satz), schlägt der Anker oder die Prüfung an; dann `paare.mjs` nachführen, Test laufen lassen, Trockenlauf, Einspielen.

## Grenzen
- Maschinell-redaktionell von Claude übersetzt, **juristisch und sprachlich nicht von einer Fachperson geprüft** (Hypothese: sprachlich in Ordnung, juristisch ungeprüft). Vor dem Bewerben der französischen Seiten von jemandem mit Französisch und Rechtsverständnis gegenlesen lassen.
- Nicht übersetzt: die Seiten `rueckgabe`, `garantie`, `faq`, `groessentabelle` (zeigen auf `/fr/` weiter deutschen Text; der deutsche Text ist jetzt stabil, die Übersetzung wäre der nächste Schritt), die englischen Übersetzungen (die Sprache `en` ist nicht veröffentlicht).
- Wirkung auf Verkäufe nicht zu erwarten und ungemessen (in drei Monaten 1 Klick auf `/fr/`-Seiten laut Audit 07.11.).
