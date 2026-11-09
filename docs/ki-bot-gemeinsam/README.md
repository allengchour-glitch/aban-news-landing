# Gemeinsamer KI-Bot: umgesetzte Forschungsprüfungen

Neuester Auftrag: «baue alles rein». Die belegten technischen Erkenntnisse aus der [Recherche](RECHERCHE.md) sind im getrennten Offline-Labor umgesetzt. Ungelesene Paper, ungetestete Frameworks und Claudes Zustimmung gelten weiterhin nicht als bestätigt. Der bestehende Handelsbot und seine Strategie-/Risikoeinstellungen sind unverändert.

## Was integriert ist

- Datenvalidierung: positive endliche Kurse, kanonische ISO-Tage, keine Lücken, Duplikate oder umgekehrte Reihenfolge. Eine noch nicht abgeschlossene oder zukünftige Tageskerze stoppt den CLI-Lauf. Alte Daten sind für historische Forschung zulässig, werden aber ausdrücklich als ungeeignet für aktuelle Signalentscheidungen markiert.
- Gemeinsame Strategieschnittstelle: pro Tag eine Quote zwischen0 und1, kein Hebel. Ungültige Kurse, Kosten, Handelsbänder, Quoten und Messgrenzen werden abgewiesen.
- Automatische Signalprüfung: vergangene Signale aus gekürzten Präfixen mit der Vollhistorie vergleichen; letzte Signale mit250/400/1000 Kerzen Vorgeschichte prüfen. Nur diese Fälle sind geprüft, kein allgemeiner mathematischer Beweis.
- Faire einfache Vergleiche: Halten und Trend200 bleiben als unskalierte Referenzen. Zusätzlich laufen Halten, Trend150 und Trend200 mit demselben25%-Schwankungsbudget und demselben Handelsband wie der Konsens150/200. Gleiches Zielbudget bedeutet nicht exakt gleiche tatsächliche Volatilität oder Marktexposition; beide werden separat gemessen.
- Getrennte historische Abschnitte2022–2023 und2024–Datenende. Keine überlappenden Abschnitte mehr in Version2, keine Behauptung unabhängiger unbekannter Testdaten. Jede Periode startet mit Cash und endet mit kostenpflichtiger Liquidation.
- Aufgeschlüsselte Forschungskosten: Gebühren, halber Spread und Schlupf je Handelsrichtung, jeweils Basis/Stress/Extrem. Diese Zahlen sind SETZUNGEN und keine tatsächlich gemessenen Brokerkosten. Positionsdrift, Umschichtungen, Ein- und Ausstiegskosten sind berücksichtigt.
- Bericht: Rendite, maximaler Einbruch, längste Unterwasserphase, Erholungsstatus, tatsächliche Schwankung, durchschnittliche Marktexposition, Umsatz und Zahl der simulierten Aufträge.
- Entscheidungsbeleg: historische letzte Zielquoten, Kursstand, Daten-/Code-/Protokollhash und reproduzierbare Versuch-ID. Kein Brokerauftrag. Vorhandene Berichte werden nicht überschrieben; JSON wird vor dem Anlegen der Zieldatei vollständig serialisiert.
- Dauerhafte Offline-Gegenproben in `test_labor.py`, im bestehenden Workflow `deploy-check.yml` registriert. Kein neuer Dienst, Handelszeitplan oder Publisher.

## Ausführen

Nur Python-Standardbibliothek, kein Paketdownload, keine Zugangsdaten und keine Brokerverbindung:

```bash
cd /workspace/aban-news-landing
python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor.py' -v
python3 docs/ki-bot-gemeinsam/labor.py --stichtag 2026-10-29 --ausgabe /tmp/ki-forschung-neuer-lauf.json
```

Die Ausgabedatei darf nicht existieren. `--stichtag` ist der ausdrücklich gewählte UTC-Prüftag; ohne Angabe wird der UTC-Tag des ausführenden Rechners verwendet. Der enthaltene Datenstand endet am23.09.2026 und liefert keine aktuellen Handelssignale. `handelsfreigabe` bleibt im Bericht immer `false`, auch mit neueren Daten.

## Messergebnisse und Einordnung

[ergebnis-v2.json](ergebnis-v2.json) enthält36 Kombinationen aus6 Strategien,3 Kostenszenarien und2 nicht überlappenden Zeitabschnitten. [ergebnis.json](ergebnis.json) bleibt als ältere Version1 erhalten und darf wegen anderer Kosten, Vergleiche und Zeiträume nicht als identischer Versuch behandelt werden. Keine Parameteroptimierung nach dem Version2-Lauf.

GEMESSEN im Basis-Kostenszenario von insgesamt20bp je Richtung, kumulierte Rendite / maximaler Einbruch:

| Historischer Zeitraum | Trend200, Risiko25 | Konsens150/200 | Halten ohne Risikosteuerung |
| --- | --- | --- | --- |
|2022–2023|+32,2% / −18,6%|+32,7% / −16,7%|−11,7% / −67,0%|
|2024–23.09.2026|+20,9% / −23,1%|+32,9% / −17,7%|+90,0% / −53,1%|

EINORDNUNG: Der Konsens zeigt hier einen historischen Tausch zwischen Rendite und Risiko. Er hat im zweiten Abschnitt zugleich weniger durchschnittliche Marktexposition als der risikogesteuerte Trend200; Unterschiede sind daher nicht automatisch ein Timing- oder KI-Vorteil. Nur Bitcoin, bekannte Daten, kein unberührter Holdout, keine unabhängige Reproduktion. Kein Nachweis eines «besten Bots».

Das Tages-Schlusskursmodell führt ein Signal von t erst am Schlusskurs t+1 aus; erstmals verdient der Bestand t+1→t+2. Kein Intraday-Orderbuch, keine Teilfüllungen, kein Funding, kein Futures-Basisrisiko und kein Börsenausfall. Das ist ein Spot-/Long-Cash-Labor, kein vollständiger Futures-Piloten-Vergleich. Cash wird nicht verzinst. Ein Cash-Ziel schliesst Restbestände auch unterhalb des Handelsbands.

## Was bewusst nicht als fertig gilt

Die vollständigen wissenschaftlichen Originaltexte sind teilweise noch durch den Cloud-Proxy blockiert. Kein Qlib-, FinRL-, FreqAI- oder Agenten-Framework wurde ungeprüft eingebaut. Deren Projektbeschreibungen belegen keine bessere Rendite. Echte KI-Features, Point-in-Time-Nachrichten, zeitlich korrektes Modelltraining, unabhängiger Holdout, Konfidenzintervalle, vollständiges Versuchsregister und ein beobachtetes Vorwärts-Schattenkonto sind noch offen. Die Versuch-ID ersetzt kein vollständiges Register aller verworfenen Versuche.

Vorhandene Broker-/Schutzmodule wurden nicht ersetzt. Die vorhandenen Binance-Spot-Tests liefen mit21 bestandenen Prüfungen gegen einen lokalen Börsennachbau. Daraus folgt keine vollständige Prüfung aller aktuellen Futures-API-Anforderungen. Neue Brokerpfade, Echtgeld, Risikogrenzen und Not-Aus bleiben unberührt.

## Unabhängiger Auftrag an Claude Code

1. Branch `codex/ki-bot-gemeinsam`, AGENTS.md, CLAUDE.md, SHARED-MEMORY.md und docs/KRYPTO-AUTONOMIE.md lesen. Ältere Website-/Wochenberichtsänderungen liegen auf getrennten Branches; diese nicht überschreiben oder als bereits veröffentlicht melden.
2. Recherche samt noch ungelesenen Originaltexten vervollständigen. Aussagen aus Projekt-READMEs nicht als unabhängigen Leistungsbeleg behandeln.
3. Tests und Formeln unabhängig prüfen: Signalverzögerung, Kosten, Drift, fairer Risikovergleich, Datenalter, Historienlänge und gemeinsame Schnittstelle. Gezielt neue Gegenbeispiele suchen.
4. `ergebnis-v2.json` reproduzieren, Code-/Datenhash prüfen. Keinen Gewinner aus dem besten Einzelzeitraum auswählen. Unterschiede durch Exposure von möglichem Timingnutzen trennen.
5. Befunde mit Eingabe und falschem Ergebnis in `CLAUDE-REVIEW.md` dokumentieren. Ein fehlendes Review ist keine Zustimmung. Codex kann hier weder Claude CLI noch eine laufende Claude-Sitzung aufrufen; Claude hat diese Version am 09.11.2026 abends geprüft: [CLAUDE-REVIEW.md](CLAUDE-REVIEW.md) (kein Blocker, Befunde F1 bis F7, 14 Regressionstests neu).
6. Erst nach belastbarer Gegenprüfung und vorher festgelegten Kriterien den nächsten einzelnen Kandidaten wählen. Historische Daten nicht als neue Zukunftsdaten ausgeben. Kein automatisches Hochstufen in Echtgeld oder Brokerhandel.

Die technischen Statusdetails und verbleibenden Grenzen stehen in [INTEGRATION.md](INTEGRATION.md).
