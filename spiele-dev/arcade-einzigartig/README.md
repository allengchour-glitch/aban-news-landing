# Arcade: eigene Spielkerne

Besitzerauftrag 16.11.2026: «Traumhaus macht schon jemand», «du machst alles andere bis jedes Spiel einzigartig ist». Traumhaus gehört der anderen Sitzung. Dessen Spielcode und Hauptspiel-Hero werden in diesem Durchgang nicht verändert.

Das [Inventar](inventar.json) umfasst **31 andere aktive Spiele**. Vier alte Neon-Adressen sind Weiterleitungen und zählen nicht zusätzlich. «Eigenständig» bedeutet hier eine andere zentrale Entscheidung innerhalb dieser Sammlung, nicht die Behauptung, klassische Spielregeln weltweit neu erfunden zu haben.

## Neun überarbeitete Spielkerne

| Spiel | Eigene Entscheidung und Fortschritt | Abschluss |
|---|---|---|
| [Prisma Rallye](../../neon-racer.html) | Spur und Plus-/Minuspol für 18 Resonanztore kombinieren; drei Treffer laden einen aktiv einsetzbaren Boost. Drei Sektoren wechseln die Torfolgen. | 2.800 m und mindestens acht Resonanzen; Bronze/Silber/Gold, gespeicherte Zeit/Punkte, Wiederholung oder Endlos-Training. |
| [Lichtschienen](../../neon-jump.html) | Im Sprung Schienen fangen, entlang gekrümmter Bahnen gleiten oder abspringen; drei gesicherte Impulse pro Strecke, gemeinsame Checkpoints. | Solo oder beide lokalen Spieler am freigeschalteten Portal; drei Strecken, Checkpoint-Retry. |
| [Lichterpremiere](../../neon-park.html) | Vier Regie-Fahrten: trägen Motor regeln, Drehnachlauf ausgleichen, Pendel im Tal anschieben, Achterbahn dosieren/bremsen. Zwölf Teilziele und Komfortsterne. | Zehnsekündige Lichtshow nach allen vier Probefahrten; Solo/Online-Koop mit Hostzustand. |
| [Nexus-Wacht](../../neon-survivor.html) | Nicht nur ausweichen: den Reaktor verteidigen und gemeinsamen Schrott zwischen Reparatur und Verteidigung aufteilen; Waffen-Build und Wellen bleiben erhalten. | NEXUS besiegen, solange der Reaktor steht; bei Reaktorausfall verliert das Team, Retry mit erhaltenem Meta. |
| [Kolossprüfungen](../../neon-dungeon.html) | Steinringe überspringen; bei gerichtetem Frost Deckung suchen; im wandernden Lava-Sektor bleiben. Gemeinsame Prüfuhr und bestätigte Treffer. | Verwundbare Faust nach dem Angriff treffen; getrennte Rekorde nach Ebene/Modus, abgestimmtes Online-Rückspiel. |
| [Tipp-Duell](../../minispiele/tap-duell.html) | Zwölf Beats präzise treffen, pro Schlag ein gewerteter Versuch; Spam kostet Punkte. | Zehnsekündiges Takt-Duell, Ergebnis und Neustart. |
| [Schalt-Rennen](../../minispiele/auto-rennen.html) | Gas halten, Drehzahl lesen und im passenden Fenster hochschalten. | Erstes Auto im Ziel; getrennte Gas-/Schalttasten für beide Spieler, Neustart. |
| [Tauziehen](../../minispiele/tauziehen.html) | Kraft verbraucht Ausdauer; rechtzeitiges Loslassen regeneriert, Erschöpfung sperrt vollen Zug. | Zwei Rundensiege; Zeitentscheid bzw. Wiederholung bei exakt ausgeglichener Runde. |
| [Stapel-Turm](../../minispiele/stapel-turm.html) | Bewegte Blöcke genau platzieren; Überhang fällt ab. Bei gleicher Höhe zählt die durchschnittlich erhaltene Breite als Präzision in 0,1%-Schritten. | Höherer Turm gewinnt, bei gleicher Höhe präziserer Turm; gleicher Wert bleibt Remis, Neustart. |

Die drei Tippvarianten belohnten vorher vor allem die Zahl gleichartiger Druckereignisse. Die neue Steuerung trennt Rhythmus, Schaltzeitpunkt und Ausdauer. Der Stapel-Turm meldete selbst bei deutlich verschiedener verbleibender Breite gleich hoher Türme Remis; der identische Originalfunktions-Test ist am gesicherten Altstand rot und am neuen Stand grün.

Die Bildprüfung bestätigte außerdem zwei Landschaftsfehler der Rallye: zufällige Hügel konnten die Fahrbahn schneiden, und der verkleinerte GLB-Ring ragte in die vorausliegende Straße. Hügel stehen nun außerhalb des gesamten Fahrbahnkorridors; die Ringöffnung umfasst die sichtbare Strecke.

Die Rallye erhielt nach dem ersten Botlauf eine klare Hindernis-/Tortrennung: Ein Lauf mit elf richtigen Toren starb zuvor an konkurrierenden Zufallsbarrieren. Im neuen Rallyemodus stehen Hindernisse außerhalb der Pflichtlinien und mit Abstand zu den Toren; im Endlosmodus bleibt die bisherige Zufallsstrecke. Ein Zieleinlauf ohne acht passende Tore qualifiziert nicht. Der entfernte Bergring rotiert nicht mehr mit der Distanz; Licht/Bloom sind zurückgenommen, HUD-Updates gedrosselt. Neue Tore und Zielbanner verwenden feste Geometrien und keine zusätzlichen Lichtquellen.

## 22 bereits unterschiedliche Spielkerne erhalten

| Spiel | Zentrale Entscheidung / Ende |
|---|---|
| [Lebenspfad](../../lebenspfad.html) | Lebensentscheidungen und Abzweige auf einem Würfelbrett; Kapitel, Familie und abschließende Biografie. |
| [Wildnis](../../neon-wildnis.html) | Tagsüber Ressourcen/Basis vorbereiten, nachts überleben und Quests erfüllen; Stationswelt und gespeicherter Fortschritt. |
| [Aether Run](../../neon-flug.html) | Gemeinsame Fluglinie, Doppelringe, Dash und Partnerrettung über drei Kapitel. |
| [Tempel der Zwei](../../neon-zusammen.html) | Unterschiedliche Elementarrollen verbinden, Platten/Impulse koordinieren und vier Siegel öffnen. |
| [Wort des Tages](../../wort-des-tages.html) | Buchstabenpositionen aus Rückmeldungen erschließen, sechs gültige Versuche. |
| [Wortbrücke](../../wortbruecke.html) | Gemeinsamen Wortteil zweier Zusammensetzungen finden; Hinweise statt Versuchslimit. |
| [Drei gewinnt](../../minispiele/drei-gewinnt.html) | Freie Zelle besetzen und Dreierlinie vorbereiten/blockieren. |
| [Vier gewinnt](../../minispiele/vier-gewinnt.html) | Durch Schwerkraft beschränkte Spaltenwahl und Viererlinie. |
| [Memory](../../minispiele/memory.html) | Verdeckte räumliche Positionen merken und Paare finden; Treffer gibt Extrazug. |
| [Simon](../../minispiele/simon.html) | Eine wachsende zeitliche Licht-/Tonfolge wiederholen. |
| [Pong](../../minispiele/pong.html) | Schläger kontinuierlich positionieren, Abprall über Treffpunkt beeinflussen. |
| [Schlangen-Duell](../../minispiele/schlange-duell.html) | Gleichzeitige Raumplanung auf dem Raster; wachsen und Kollisionen vermeiden. |
| [Reaktions-Duell](../../minispiele/reaktions-duell.html) | Auf ein unvorhersehbares Signal warten; Frühstart verliert den Punkt. |
| [Schere–Stein–Papier](../../minispiele/schere-stein-papier.html) | Verdeckte zyklische Gegenwahl, Auflösung erst nach beiden Entscheidungen. |
| [Elfmeter](../../minispiele/elfmeter.html) | Getrennte Schützen-/Torwartwahl und wechselnde Rollen, begrenzte Schussserie. |
| [Ballon-Pump](../../minispiele/ballon-pump.html) | Gegen unbekannte Platzgrenze weiter riskieren oder rechtzeitig sichern. |
| [Hoch–Tief](../../minispiele/hoch-tief.html) | Wahrscheinlichkeit der nächsten Karte abschätzen, begrenzte Tippzahl. |
| [Farb-Klick](../../minispiele/farb-klick.html) | Wortbedeutung gegen abweichende Druckfarbe erkennen. |
| [Mathe-Duell](../../minispiele/mathe-duell.html) | Generierte Rechnung lösen; falsche Antwort sperrt den Versuch. |
| [Quiz-Buzzer](../../minispiele/quiz-buzzer.html) | Erst Antwortrecht sichern, dann die Wissensfrage beantworten. |
| [Maulwurf](../../minispiele/maulwurf.html) | Kurzzeitig aktive Ziele in festen Löchern erkennen und rechtzeitig treffen. |
| [Punkte-Jagd](../../minispiele/punkte-jagd.html) | Einzelnes frei wechselndes Ziel präzise treffen, neue Position erfassen. |

## Integration und Prüfumfang

Die Übersicht erhält fünf eigene Direktstarts mit den tatsächlichen Regeln; die Minispiele-Sammlung beschreibt Takt, Gangwechsel und Ausdauer. Die bisherigen Wildnis-Stationen und das Lebenspfad-`mini-back`-Protokoll bleiben erhalten. Jump ist lokaler Koop, nicht Online-Koop. Park, Arena und Dungeon behalten Online-Koop; die Rallye ist Solo. Bestehende Speicher- und Bestzeitdaten werden erhalten bzw. neue Kategorien getrennt angelegt.

Die alte Sammelregression erwartete einen Sieg nach 57 bzw. 18 schnellen Mausereignissen. Sie wird an gehaltenes Gas, echte zeitbegrenzte Tauzieh-Runden und getrennte Rhythmus-Beats angepasst; Ziel-/Ende-/Neustartassertions bleiben erhalten. Eigene Mechanikprüfungen vergleichen gute Strategie ausdrücklich mit Spam und prüfen Fokusverlust, getrennte Spieler und gemischte Eingaben.

GEMESSEN am finalen Stand: Lichtschienen neun Browserprüfungen, Übersichten 17 Layout-/Linkbedingungen und Sicherheitsintegration 23 Bedingungen grün. Die Sicherheitsprüfung lädt echte Lebenspfad-/Wildnis-Frames sowie Modell-Blobs und behält die tatsächlichen CSP-Header bei. Weitere Einzelbelege stehen unten. Einzelberichte: [Prisma Rallye](../prisma-racer/README.md), [Parcours](../parcours/README.md), [Park](../neon-park/ABNAHME.md), [Arena](../arena-nexus/QA.md), [Dungeon](../dungeon-trials/README.md), [drei Minispiele](../minispiele-identitaet/README.md). Ein grüner VM-Test ist kein Render-/WebRTC-Nachweis. Lokales natives WebRTC ist kein Test über zwei Internetanschlüsse. Die Cloud-Software-GPU ist kein Leistungsnachweis für ein physisches Handy. Es wird keine vollständige Fehlerfreiheit der 31 Spiele behauptet.

GEMESSEN zur Sammlung: drei neue Minispiele368/368 Browserbedingungen grün; Wortspiele642Bedingungen grün. Alte20er-Sammelreihe59/60, genau ein überholter Sofort-Tipp-Test rot. Derselbe Touch/Maus-/Ende-/Neustartfall wurde auf zwei gültige getrennte Beats umgestellt und im ausdrücklich gefilterten Nachlauf1/1 bestanden. Das ist eine59+1-Integration, kein behaupteter neuer vollständiger60er-Lauf. Der Altbericht bleibt erhalten.


GEMESSEN zusätzlich:45 unveränderte Aether-Core-/Timing-/Profiltests und acht
vorhandene reine Lebenspfad-Suiten (Batches, Chunks, Terrain, Scenery, Waterside,
Path-Art, World-Sites und Path) grün. Die Wortspielprüfung umfasst88 Tageswörter
und33 Brücken in schmaler/weiter Ansicht. Das belegt keine gesamte Lebenspfad-
Kampagne oder neue Internet-Koop-Verbindung.

Browser-Rohberichte und ausgewählte tatsächlich geprüfte Bilder liegen unter
[belege/](belege/README.md). Historische Fehlberichte sind als solche bezeichnet.
Die lokale Gesamt-CI endet bereits beim temporären Plan im schreibgeschützten
HOME; keine Rechte-/HOME-Umgehung. Tatsächliche PR-Prüfungen und öffentliche
Bereitstellung werden im zugehörigen Pull Request mit exakten Kennungen belegt.


Arena: GEMESSEN18 CPU-/VM-Fälle grün. Im ersten Browserlauf10 positive
Solo-/Touch-Fälle; danach überdeckte Stations-Rückkehr. Nach Korrektur von
Rückkehr-Ebene, Desktop-Bossleiste und Favicon gezielt11 Stations-/native
Netzbedingungen ohne Seiten-, Konsolen- oder HTTP-Fehler grün. Alle22 Bilder
wurden einzeln geprüft. Dies sind getrennte Läufe, kein neu behaupteter
vollständiger Solo-/Touch-Durchlauf nach den lokalen Darstellungsänderungen.

Park: GEMESSEN11 Node-/VM-Fälle; getrennt12 positive frühere Solo-/Touch-
Bedingungen und sieben native Vier-Fahrten-Bedingungen. Der ursprüngliche
Finale-Timeout entsteht bei3,45 von zehn Simulationssekunden im Softwarezeichner.
Der fokussierte Nachlauf mit gültigem vorher bestätigtem Vier-Fahrten-Zustand
besteht sieben Bedingungen: echte E-Aktion, zehn normale Simulationssekunden,
identisches Host-/Gast-Ende, keine Gast-Simulation und erkannter Kanalabschluss.
Alle16 finalen Bilder geprüft; Details und Originalfehlversuche bleiben erhalten.


Dungeon: GEMESSEN23 Node-/VM-Fälle und28 gezielte Browserbedingungen grün.
Der erste unveränderte Render ist separat belegt. Ein zunächst falsch unter
allgemeiner Seiten-CSP gehosteter Test-Iframe wurde auf die tatsächliche Dungeon-
Antwort mit deren unveränderten Headern verlegt. Eine Ringsprung-Sonde wurde
auf die echte kurze Kollisionsphase kalibriert; Gefahren-/Herzlogik unverändert.
Alle drei Mechaniken und Siege sind über echte Tastatur-/Touchaktionen geprüft;
Verlust, Stations-Rückkehr, gemeinsame native Prüfuhr, Gasttreffer, synchroner
Sieg, Rückspiel nach zwei Zustimmungen und Kanalabschluss ebenfalls. Positions-
und Phasen-Fixtures überspringen Laufwege; kein vollständiger menschlicher
Parcourslauf. Die Bildprüfung und endgültige Quellenfassung stehen im Einzelbericht.

GEMESSEN abschließend: Prisma15 Browserbedingungen nach der Landschaftskorrektur
erneut grün, Bilder auf Desktop und Touch geöffnet. Fünf Geometriegruppen grün;
dieselben vier Altfehler auch am Repository-Ausgangsstand reproduziert.
Die drei Minispiele bestehen zusätzlich92 gezielte Bedingungen am endgültigen
CSS-Stand, sechs Originalseiten-Fälle mit echten Touch-/Tastatureingaben. Zwei
vorherige Layoutberichte mit je83/84 bleiben erhalten; symmetrische Spielflächen
beheben Timerüberdeckung und abgeschnittene Rückmeldung. Drei finale Querformat-
Spielbilder wurden geöffnet und geprüft. Der368er-Bericht bleibt ausdrücklich
sein früherer CSS-Stand. Dungeon: alle33 Bilder nachträglich einzeln geprüft;
Originalberichte mit `visualInspection: pending` bleiben unveränderte Laufdaten.
