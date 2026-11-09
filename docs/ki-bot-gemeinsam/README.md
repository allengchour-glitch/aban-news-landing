# Gemeinsamer KI-Bot: Codex baut, Claude Code prüft unabhängig

**Neuester Auftrag: erst recherchieren, dann bauen. Weitere Entwicklung ist pausiert.** Der bisherige Prototyp ist ein unbestätigter Entwurf. [Recherche, gelesene Quellen und offene Originaltexte](RECHERCHE.md) haben Vorrang vor den älteren Entwicklungsaufträgen weiter unten.

## Ziel

Ein nachvollziehbarer Trading-Bot, dessen Nutzen nach Gebühren und Verlusten überprüfbar ist. «Der beste» ist ein Ziel, kein belegtes Ergebnis. Mehr KI, mehr Trades oder ein höherer Rückblickgewinn sind allein kein Fortschritt. Bestehender Pilot, Konten, Risikolimits und Echtgeld-Sperren bleiben unverändert. Nutzerauftrag: «das beste ki bot erfinden du und claude zusammen».

## Entwurf: mehrere Vorschläge, eine feste Risikoprüfung

1. **Datenprüfung:** abgeschlossene Kerzen, korrekte Zeit, lückenlose Reihen, Datenquelle und Prüfsumme. Veraltete oder widersprüchliche Daten erlauben keine neue Position.
2. **Vorschläge:** bestehender Pilot, einfacher Vergleich und ein erklärbarer Kandidat liefern getrennte Vorschläge. Der erste neue Kandidat verlangt Zustimmung von Trend150 und Trend200 und verkleinert seine Quote bei hoher Schwankung. Diese Regeln sind vor dem ersten Laborlauf festgelegt.
3. **KI nur als prüfbarer Teilnehmer:** Ein späteres Modell muss seinen Nutzen gegenüber dem identischen System ohne Modell zeigen. Sprachmodelle dürfen Zusammenfassungen und überprüfbare Hypothesen liefern; weder frei formulierte Nachrichten noch Modelltexte werden direkt zu Brokeraufträgen. Zeitgestempelte historische Modellmerkmale und eine getrennte Modellprüfung fehlen derzeit.
4. **Feste Risikoprüfung:** Handelslimits, Datenalter, offene Aufträge, verfügbare Mittel, Not-Aus und Plausibilität prüfen jeden Vorschlag. Keine automatische Hebelerhöhung oder Lockerung bei Verlusten. Diese vorhandenen Schutzpfade werden im Prototyp nicht verändert.
5. **Entscheidungsbeleg:** Eingabestand, Signalgrund, vorgesehene Quote, Regelversion und Ablehnungsgrund protokollieren. Eine Entscheidung muss mit denselben Eingaben reproduzierbar sein.
6. **Schattenkonto vor Nutzung:** Kandidaten laufen getrennt mit Spielgeld. Kein Gewinnerwechsel nach einzelnen guten Wochen, kein automatisches Hochstufen aus einem Forschungsbericht.

## Was bereits gebaut ist

`labor.py` ist ein ausführbarer Offline-Prototyp mit drei Reihen: Halten, Trend200 und Trend-Konsens150/200. Er liest ausschliesslich vorhandene Bitcoin-Tageskurse, schreibt nur eine ausdrücklich benannte neue Ergebnisdatei und hat keine Broker-/Netzwerk-Anbindung. Keine zusätzlichen Pakete.

SETZUNG vor dem ersten Lauf: Long/Cash, höchstens100% Quote; Konsens mit25% jährlichem Schwankungsziel über30 Tagesrenditen, 10 Prozentpunkten Handelsband;365 Kalendertage. Kosten je Handelsrichtung10/25/50 Basispunkte, Eintritt und abschliessender Verkauf eingerechnet. Positionen driften mit dem Kurs. Bei unbekannter/Null-Schwankung bleibt der Kandidat in Cash. Keine Parametersuche. Ein vollständiges Cash-Signal wird auch unterhalb des Handelsbands ausgeführt; das Band darf den Ausstieg nicht verhindern.

Signal vom Schlusskurs t wird erst am Schlusskurs t+1 umgesetzt und verdient erstmals t+1→t+2. Das konservative Tagesmodell bildet weder Intraday-Fills noch Funding, Futures-Basis oder Börsenausfälle ab. Es ist ein Spot-Experiment und kein vollständiger Vergleich mit dem Futures-Piloten. Beide Vergleiche erhalten dieselbe Verzögerung und dasselbe Kostenmodell. Teilperioden ab2022 und2024 sind überlappend und keine unabhängigen Bestätigungen.

```bash
cd /workspace/aban-news-landing
python3 docs/ki-bot-gemeinsam/labor.py --ausgabe /tmp/ki-bot-forschung-neu.json
```

Die Ausgabedatei darf noch nicht existieren. Daten-, Code- und Protokoll-Prüfsummen stehen im Ergebnis. Bekannte historische Daten sind kein unabhängiger Holdout und keine Vorregistrierung; die Hashes machen einen späteren Vergleich prüfbar, beweisen aber keine zeitliche Unabhängigkeit. Originaldaten werden nicht überschrieben. Kein komplettes Neuaufrollen alter Strategien ohne klaren Prüfgrund.

## Unabhängiger Auftrag an Claude Code

1. Aktuellen main, AGENTS.md, CLAUDE.md, SHARED-MEMORY.md und docs/KRYPTO-AUTONOMIE.md lesen. Branch `codex/ki-bot-gemeinsam` holen. Die ältere Veröffentlichung der Website/des Wochenberichts liegt auf anderen Branches; nicht überschreiben oder als bereits live melden.
2. **Zuerst Messgerät prüfen:** zukünftige Preise ändern dürfen vergangene Signale nicht verändern. Anstieg/Absturz müssen die erwarteten Vorzeichen zeigen; konstante Preise mit Ein-/Ausstiegskosten müssen Verlust ergeben. Unregelmässige, doppelte, nichtendliche und nichtpositive Tagesdaten müssen abgewiesen werden. Positionsdrift, Verzögerung und Kostenformeln unabhängig nachrechnen.
3. Den Forschungsbericht `ergebnis.json` kritisch lesen. Den besten Einzelwert nicht als Sieger auswählen. Prüfen, ob der Konsens überhaupt einen nützlichen Trade-off bietet und ob das einfache Vergleichssystem schon genügt. Neue Parameter erfordern eine neue Hypothese und neue, tatsächlich noch nicht betrachtete Daten.
4. Schriftliche Gegenprüfung in `CLAUDE-REVIEW.md`: bestätigte Fehler mit Eingabe/Ergebnis, verworfene Behauptungen und offene Grenzen getrennt dokumentieren. Den Codex-Bericht nicht einfach bestätigen. Ein leeres oder noch nicht vorhandenes Review ist keine Freigabe.
5. Erst nach belastbarer Messung gemeinsam den nächsten Kandidaten festlegen. Kein Anschluss an Broker/Telegram, kein Echtgeld und keine Schutzänderung aus diesem Forschungsauftrag ableiten. Keine angebliche Zusammenarbeit oder Ergebniszustimmung behaupten, bevor Claude selbst geprüft hat.

## Nächste gemeinsam zu lösende Arbeit

- Für einen echten Zukunftstest vor Start Quelle, Markt, Kosten, Regeln, Entscheidungskriterien und Startdatum einfrieren. Mindestens180 Kalendertage Vorwärtsdaten sammeln (SETZUNG, kein statistischer Beweis). Ein unberührter Holdout muss tatsächlich unbetrachtet bleiben.
- Vorab höchstens einen neuen Kandidaten festlegen und alle Versuche zählen, auch verworfene. Komplexität nur behalten, wenn der Mehrwert gegenüber einem einfachen Vergleich ohne Modell belastbar ist.
- Rendite nach realistischen Kosten, maximalen Einbruch, Erholungsdauer, Umschichtungsvolumen und Ausfälle gemeinsam beurteilen. Der Laborprototyp misst bislang Rendite, Einbruch und Umsatz; Konfidenzintervalle und Erholungsdauer fehlen noch. Zeitlich abhängige Daten nicht wie unabhängige Münzwürfe behandeln.
- Den erfolgreichen Kandidaten zuerst im getrennten Schattenkonto mit echten Zeitstempeln beobachten. Datenalter und Ablehnungsgründe im Cockpit sichtbar machen, bevor über eine weitergehende Verwendung entschieden wird.

## Zusammenarbeit und Grenzen

Codex kann in dieser Umgebung keinen laufenden Claude-Code-Agenten aufrufen: Claude CLI und Anthropic-Zugang sind nicht vorhanden. Der GitHub-Branch und dieser unabhängige Prüfauftrag sind die Übergabe; Claude hat den Entwurf noch nicht geprüft. GitHub-API und Live-Website waren zuletzt durch den Cloud-Proxy blockiert. Git-Push funktionierte. PR-, Merge-, Deployment- und PC-Stand müssen getrennt bestätigt werden.

## Erster Messstand (bekannte historische Daten)

GEMESSEN mit `labor.py` auf4390 vorhandenen Tageskursen vom17.09.2014 bis23.09.2026; Rohdaten-/Code-/Protokollhash und alle18 Strategie-/Kosten-/Periodenfälle in [ergebnis.json](ergebnis.json). Keine Parameter nach diesem Lauf verändert.

Kumulierte Rendite und schlimmster Einbruch, bei10 Basispunkten Kosten je Handelsrichtung:

| Zeitraum bis23.09.2026 | Halten | Trend200 | Neuer Konsens |
| --- | --- | --- | --- |
| ab2022 | +76,3% / −66,9% | +162,4% / −35,6% | +86,0% / −17,1% |
| ab2024 | +90,3% / −53,1% | +43,7% / −35,6% | +35,7% / −17,1% |

Bei50 Basispunkten sinkt die Konsens-Rendite auf +67,8% beziehungsweise +25,0%; der Einbruch steigt auf −19,3%. Das ist ein beobachteter Tausch zwischen Rendite und Risiko im beschriebenen Modell, kein Nachweis von Überlegenheit, KI-Nutzen oder zukünftiger Rendite. Beide Teilperioden überlappen. Bisher wurde nur Bitcoin untersucht.

GEMESSEN: zehn lokale Gegenproben bestanden (Ein-/Ausstiegskosten gegen geschlossene Formel, Cash, keine Rendite vor Ausführung, Gewinn nach Ausführung, Absturz/Einbruch, Positionsdrift, vollständiger Cash-Ausstieg unterhalb des Handelsbands, unveränderte Vergangenheit bei geänderter Zukunft, Datenfehler, Kostenstress). Bestehende Ausgabedatei wurde bei erneutem CLI-Aufruf abgewiesen und ihr Hash blieb unverändert. Gegenproben lagen in `/tmp/ki-bot-labor-pruefung.py`, wurden nicht als dauerhafte CI-Prüfung registriert und ersetzen keine unabhängige Gegenprüfung durch Claude. Kein vollständiger CI-Lauf oder Live-Test.

Vor Übergabe präzisiert: Ein Ziel von0% schliesst einen Restbestand auch unterhalb des Handelsbands. Die historischen Ergebniswerte blieben dadurch unverändert; Bericht mit aktuellem Codehash erneut erzeugt.
