# Mängelmeldung «30 Tage» für alle Ware (09.11.2026)

**Auslöser:** Seit Welle 2 (Rückgabe-Text «selbst gestaltete Artikel», 06./09.11.) galten für defekte, beschädigte oder falsch gelieferte Ware zwei Fristen: 30 Tage bei selbst gestalteten Artikeln, aber «innerhalb von 7 Tagen nach Erhalt» bei Standardware. Der Besitzer beantwortete am 09.11.2026 eine gezielte Frage (Gegenstand, Umfang, Rücknahme) mit **«Ja, überall 30 Tage»**. Gesetzliche Mängelrechte bleiben unberührt und stehen unverändert in den Texten.

## Was geändert wurde (7 Ersetzungen in 6 Zielen, LIVE 09.11.2026 ca. 17:50 UTC)

| Nr | Ziel | Änderung |
|---|---|---|
| M1 | Rückgaberichtlinie (`REFUND_POLICY`), Abschnitt «Defekte, beschädigte oder falsch gelieferte Artikel» | «7 Tagen» → «30 Tagen» (der Folgesatz zu selbst gestalteten Artikeln bleibt, er nennt zusätzlich «Ersatz oder Erstattung») |
| M2 | AGB (`TERMS_OF_SERVICE`), Gewährleistung | «7 Tagen» → «30 Tagen» (Folgesätze bleiben) |
| M3 | Seite `garantie` | «innert 7 Tagen … (bei selbst gestalteten Artikeln bitte innert 30 Tagen)» → «innert 30 Tagen»; die Klammer entfällt, weil sie nichts mehr unterscheidet |
| M4 | Seite `about-us-en` (englisch, veröffentlicht) | «within 7 days» → «within 30 days» |
| M5 | Seite `refund-policy-en` (englisch, veröffentlicht) | «within 7 days» → «within 30 days» |
| M6, M7 | Chat-Assistent `sections/lux-assistent.liquid`, zwei Antworten («defekt», «Gewährleistung») | wie M3: Frist 30 Tage, Klammer entfällt |

Nicht angefasst (bewusst): die unveröffentlichte Seite `widerruf` (nennt noch «innert 7 Tagen», ist für Kundschaft nicht sichtbar), Stellen, die mit Mängeln nichts zu tun haben («5–7 Tage Geduld» bei der Sendungsverfolgung, «2–7 Werktage» Lieferzeit, Karenzzeiten in internen Seiten), und die **französischen Übersetzungen** der beiden Richtlinien (siehe unten).

## Offener Befund: französische Fassung der Richtlinien (nicht geändert)

Die Übersetzungen `fr` von `REFUND_POLICY` und `TERMS_OF_SERVICE` sind seit Welle 2 als «veraltet» markiert (Quelltext geändert, Übersetzung nicht nachgeführt) und werden trotzdem ausgeliefert: GEMESSEN am 09.11.2026 auf `/fr/policies/refund-policy`: «veuillez nous contacter dans les 7 jours suivant la réception». Die französische Richtlinie kennt ausserdem den Abschnitt «selbst gestaltete Artikel» noch nicht. Eine Neuübersetzung beider Texte ist ein eigener Schritt (Rechtstexte, braucht ein Ja des Besitzers). Die englische Übersetzung der AGB nennt eine private Mailadresse als Kontakt (veraltet); die Sprache `en` ist im Shop nicht aufrufbar (früher gemessen: `/en/` liefert 404), ob die Übersetzung sonst irgendwo sichtbar wird, ist ungemessen.

## Messung

- **Admin-Rücklesen:** alle 6 Ziele frisch zurückgelesen GLEICH dem Soll; danach unabhängig frisch aus Shopify gelesen: 0 verbleibende «7 Tage»/«7 days»-Fristen in den 6 Zielen.
- **Storefront (curl mit Browser-Kopf, 09.11.2026 ca. 17:52 UTC):** Richtlinie, AGB, Garantie, `about-us-en` und die Startseite (trägt das Chat-Skript) zeigen den neuen Wortlaut, 0 «7 Tage» im sichtbaren Text. `refund-policy-en` antwortete mit HTTP 429 (Drosselung): dort ist nur das Admin-Rücklesen belegt.
- **Test:** `node dropship/maengelfrist-0911/apply_test.mjs` (118 Prüfungen, auch gegen die echten Texte vom 09.11. aus `../rueckgabe-0611/sicherung/welle2.json`). Mutationsprobe im Scratch: 16 von 16 absichtlichen Fehlern erkannt (Datenprüfung, Planung, Änderungsarten, Platzhalter, Hochkommas des Chat-Skripts).

## Befehle

- Trockenlauf (Vorgabe, nur lesen): `node dropship/maengelfrist-0911/apply.mjs`
- Einspielen: `LIVE=1 node dropship/maengelfrist-0911/apply.mjs` (je Ziel muss der alte Wortlaut genau einmal vorkommen, sonst bleibt das Ziel unberührt; Sicherung `sicherung/maengelfrist.json` zuerst)
- **Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/maengelfrist-0911/apply.mjs` (schreibt nur, wenn der heutige Text noch dem Stand danach entspricht)

## Lehren

1. Eine Frist, die in einer Klammer «für selbst gestaltete Artikel» abweicht, wird mit der Vereinheitlichung sinnlos: die Klammer gehört mit raus (sonst steht «innert 30 Tagen (bei selbst gestalteten Artikeln innert 30 Tagen)»).
2. Vor dem Ändern einer Rechtsfrist nach **allen** Fundstellen suchen, auch in Übersetzungen und englischen Seiten: der Quelltext war an 7 Stellen in 6 Zielen, die Übersetzungen kommen noch dazu.
3. Das Werkzeug von Welle 2 (`apply2.mjs`) lässt sich wiederverwenden (`ersetzeAlle`, `gruppiere`): ein neuer Auftrag braucht nur eine Datendatei, einen dünnen Lauf und einen Test.
