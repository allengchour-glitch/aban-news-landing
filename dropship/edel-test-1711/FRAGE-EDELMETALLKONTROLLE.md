# Silberschmuck und die Schweizer Edelmetallkontrolle (Stand 17.11.2026, nachgeführt 08:2x UTC)

**Der Brief ist fertig** (`dropship/silber-bazg-1711/ANFRAGE-EDELMETALLKONTROLLE.md`) und liegt als Entwurf in Gmail. **Gesendet ist nichts.** Keine Rechtsberatung: alles, was nicht wörtlich zitiert ist, ist Hypothese.

## Befund (GEMESSEN 17.11.2026, Quelle selbst gelesen)

Quelle: Bundesamt für Zoll und Grenzsicherheit (BAZG), «FAQ Edelmetallkontrolle», https://www.bazg.admin.ch/de/faq-edelmetallkontrolle, am 17.11.2026 zweimal von mir gelesen (früh am Morgen und um 08:1x UTC, dazu zwei unabhängige Prüfer):

- «Alle in der Schweiz in den Handel gesetzten Edelmetall-, Mehrmetall- sowie Plaquéwaren müssen neben der entsprechenden Feingehaltsangabe auch mit einer registrierten und gültigen Verantwortlichkeitsmarke gekennzeichnet sein.» (Abschnitt «Wann brauche ich eine Verantwortlichkeitsmarke»)
- «Dies gilt sowohl für importierte Ware aus dem Ausland wie auch für in der Schweiz hergestellte Artikel.»
- «Ware aus dem Ausland muss bereits zum Zeitpunkt der Einfuhr mit den entsprechenden Markierungen versehen sein.»
- «Die Kosten belaufen sich auf CHF 800.00 für eine Laufzeit von 20 Jahren.»
- «Es gibt in der Schweiz **keine** Gewichtslimiten.» (Abschnitt «Gewichtslimiten»: die beiden Sätze, die mein erster Abruf nicht zeigte, stehen dort; die Erklärung «anderer Abschnitt» ist damit belegt)
- «Sollte Ihre Ware den gesetzlichen Vorgaben … nicht entsprechen, kann sie von der EMK angehalten oder zurückgewiesen werden.» (Abschnitt zur blockierten Sendung)
- **Eigengebrauch (neu gefunden):** für «Schmuck zum Eigengebrauch» in die Schweiz verweist die FAQ nur auf die allgemeinen Zollbestimmungen («In der Regel fallen Zoll und Mehrwertsteuer an»), ohne Hinweis auf die Marke. Für «importierten Schmuck in der Schweiz verkaufen» verlangt sie die Bedingungen schon bei der Einfuhr. **Unser Fall liegt dazwischen** (Lieferant schickt direkt an Privatpersonen, wir vermitteln den Verkauf): ob die Käuferin als Importeurin zum Eigengebrauch gilt oder der Shop «in den Handel setzt», sagt die Seite nicht. Das ist die Kernfrage des Briefs (Fragen 1 und 2).

## Was das heissen könnte (Hypothese, ungeklärt)

- Die Silberwaren tragen laut Bildern höchstens einen Herstellerstempel «S925», keine Schweizer Marke. Mit Direktversand ab China wäre die Pflicht voraussichtlich nicht erfüllbar, **falls** sie den Shop trifft.
- **Zahl korrigiert:** der Shop führte **207 aktive Produkte mit «925» im Titel** (GEMESSEN am vollständigen Katalog, 56 495 aktive Produkte, 17.11. 08:19 UTC). Meine erste Zahl «129» kam aus der Shopify-Suche `title:*925*`, die «S925…»-Titel (78) nicht findet. Dazu 30 Titel mit «Sterling» ohne «925» und 205 mit «Silber» ohne beides (ob echtes Silber oder «silberfarben», nicht geprüft). Die 207 sind vorläufig auf Entwurf (`dropship/silber-bazg-1711/`).
- Ungeklärt bleibt, ob die Kundin als Importeurin gilt, ob «Inverkehrbringen» den Shop trifft, und ob die übrigen Silber-Angebote (ohne «925» im Titel) ebenso betroffen sind.

## Vorschlag (Entscheid bei dir)

1. Brief senden (liegt fertig in Gmail).
2. Bis zur Antwort nichts Silbernes neu aufnehmen. Die 207 bleiben Entwurf; die Rücknahme ist ein Befehl (`ZURUECK=1 LIVE=1 node dropship/silber-bazg-1711/apply.mjs`).
3. Silber-Muster (Nr. 1 und 2 der Muster-Liste) gibt es nicht: du hast am 17.11. keine Muster gewollt.
