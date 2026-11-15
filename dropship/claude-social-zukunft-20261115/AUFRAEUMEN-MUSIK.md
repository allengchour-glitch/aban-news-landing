# Für Claude: beanstandete Beiträge entfernen, auch wegen Musik

**Neuer Besitzerauftrag, 15.11.2026:** «lösche die schlechten post auch musik gemeint». Das ergänzt den vorherigen Zukunftsplan um einen gesonderten Aufräumauftrag. Schlechte beziehungsweise vom Besitzer abgelehnte Musik zählt ausdrücklich als Grund. Der konkrete Entfernungswunsch liegt vor; eine Liste aus alten Unterlagen ersetzt aber nicht die eindeutige Zuordnung zum heutigen Beitrag.

**Ausführungsstand:** Hier kein Social-Werkzeug/Kontozugriff verfügbar, kein Live-Beitrag gelesen und nichts gelöscht. Die lokale MCP-Brücke hat ausschliesslich lesende Werkzeuge und keine Löschfunktion. Diese Datei ist eine Übergabe für den verbundenen Claude-/PC-Claude-Arbeitsablauf, keine ausgeführte Löschliste und kein API-Payload.

## Musik, die bereits ausdrücklich beanstandet wurde

QUELLE: `SHARED-MEMORY.md`, Stand 10.11., `dropship/REEL-REGELN.md`, Musiknachtrag 10.11., und `dropship/CODEX-RUECKMELDUNG-1111.md`, Abschnitt 4:

- Mixkit **New York, Nr. 427** (`mixkit-new-york-427.mp3`): im Hacker-Reel vom Besitzer abgelehnt.
- Mixkit **Violin Uplift, Nr. 675** (`mixkit-violin-uplift-675.mp3`): im Haussocken-Reel vom Besitzer abgelehnt.

Nicht pauschal alle Musik als schlecht einstufen. Insbesondere ist damit weder jede Codex-Musik noch der Vasen-Prototyp mit «Serene View» als abgelehnt belegt. Alter oder wenige Aufrufe allein reichen ebenfalls nicht als Löschgrund.

## Zuerst die älteren Veröffentlichungen suchen

Diese älteren Clips verwenden laut `dropship/tiktok-cj-videos-0311/cj_clips.json` dieselben Tracks. `PAKET.md` dokumentiert die folgenden damaligen Planungen, Stand **04.11.2026**. Dass der Termin inzwischen vergangen ist, beweist keine Veröffentlichung. Aktuellen Status und heutige Tonfassung frisch prüfen.

| Kandidat | Quelle des Musikbezugs | Alter Termin, Europe/Zurich | Alte Metricool-UUID |
| --- | --- | --- | --- |
| Rose im Glas, Instagram + Facebook | `luxe-cj-rose-0411.mp4`, Violin Uplift 675 | 09.11., 19:30 | `3863915044291300024` |
| Rose im Glas, TikTok | dieselbe Vorlage | 09.11., 12:30 | `-7257455683644011058` |
| Gemüsehobel, Instagram + Facebook | `luxe-cj-hobel-0411.mp4`, New York 427 | 11.11., 20:30 | `3963843144054620883` |
| Gemüsehobel, TikTok | dieselbe Vorlage | 10.11., 18:00 | `2172266762404316928` |

Die UUIDs sind Suchschlüssel für Metricool, **keine** Instagram-/Facebook-/TikTok-Beitrags-IDs. Prüf-Links stehen in `musik-aufraeumliste.json`; sie öffnen nur die gespeicherte Zuordnung, führen keine Löschung aus.

Wenn ein solcher Beitrag noch live ist und tatsächlich die beanstandete Tonfassung enthält, den passenden veröffentlichten Beitrag entfernen. Bei einem kombinierten IG/FB-Objekt beide Plattformen einzeln prüfen und nur tatsächlich vorhandene, passende Veröffentlichungen als gelöscht melden. Wenn der Clip inzwischen mit anderer Musik korrigiert wurde, nicht wegen der alten UUID löschen.

## Danach gehaltene Entwürfe und weitere Kopien prüfen

Hacker-Datei `luxe-w1611-hacker-reel.mp4`, Track New York 427. Laut Notiz vom 10.11. und Rückmeldung vom 11.11. liegen diese **gehaltenen Entwürfe** vor:

| Netzwerk | Überlieferter Termin 18.11., Europe/Zurich | Beitrags-ID | UUID |
| --- | --- | --- | --- |
| Instagram + Facebook | 10:00 | `423483793` | `4659816415037836014` |
| Threads | 11:00 | `423484712` | `-8339089096074181290` |
| TikTok | 12:00 | `423484773` | `-8305910546945982140` |
| YouTube | 18:00 | `423484839` | `-3731207601091163105` |

Wenn noch dieselbe schlechte Tonfassung im Entwurf liegt, diese im zuständigen Planer-/Browser-Arbeitsablauf entfernen, sofern die tatsächliche Oberfläche eine Löschfunktion anbietet. Bis eine Entfernung sicher bestätigt ist, die vorhandene Halteliste beibehalten. Nicht aus der Halteliste nehmen, um eine vermeintliche Bereinigung zu melden. Keine fremden Entwürfe oder andere künftige Beiträge verändern.

Haussocken-Datei `luxe-w1611-haussocken-reel.mp4`, Track Violin Uplift 675: laut den gelesenen Unterlagen unveröffentlicht; **kein Planerobjekt mit ID belegt**. Nur tatsächlich vorhandene Kopien mit dieser Tonfassung entfernen. Ohne Fund keine Löschung erfinden. Keine Shop-Dateien oder Produktbilder löschen: Auftrag betrifft Social-Beiträge.

## So führt der verbundene Arbeitsablauf den Auftrag aus

1. Marke/Konto LuxeStyle bestätigen. Kandidaten anhand UUID und Originalmedium finden, aktuellen Status und aktuelle Tonfassung prüfen. Keine anderen Marken, insbesondere nicht «Pias friedliche Welt», anfassen.
2. Vor der irreversiblen Entfernung Beitragslink, Caption und vorhandene Medienreferenz lokal sichern. Keine Zugangsdaten sichern. Bei unklarer Identität keinen ähnlichen Beitrag auswählen.
3. Veröffentlichte Posts über die unterstützte Plattformfunktion beziehungsweise den eingeloggten Browser entfernen. Die Löschung eines Planerobjekts beweist nicht, dass ein Instagram-, Facebook- oder TikTok-Post entfernt wurde. Kein erfundenes DELETE-API und keine Update-Schleifen benutzen.
4. Unveröffentlichte, eindeutig passende Entwürfe getrennt bearbeiten. Ein auf Entwurf gesetzter Beitrag ist nicht gelöscht. Wenn die benötigte Löschfunktion fehlt, genau diesen Rest als offen melden; nicht ersatzweise andere Kontoeinstellungen ändern.
5. Nachher frisch prüfen: tatsächlich entfernt, bereits vorher nicht vorhanden, korrigierte Fassung behalten oder blockiert. Nur bestätigte Ergebnisse als erledigt melden. Kein Neuveröffentlichen oder Ersatzvideo aus diesem Aufräumauftrag heraus starten.

## Bereits separat beauftragter alter Clip

Der Besitzer hatte schon am 04.11. den TikTok-Clip «Kuscheldecke Hasenfell-Imitat Tie-Dye» vom 25.10. zur Entfernung benannt. Falls noch offen, den eindeutigen Clip nach `dropship/BROWSER-BEFEHL-TIKTOK-LOESCHEN-0411.md` bearbeiten. Das ist ein eigener konkret dokumentierter Löschwunsch, kein Beweis für einen der oben genannten Tracks. Die aktuelle Existenz bleibt unbekannt.

## Ergebnisbericht für den Besitzer

Je Plattform: Beitrag-URL, heutiger Befund, Bezug zur beanstandeten Musik, Aktion, anschliessend gemessener Status und Prüfzeit. Entwürfe und veröffentlichte Beiträge getrennt zählen. Im Ausgangsstand dieser Datei: **0 bestätigte Online-Löschungen**. Claude-Empfang und Ausführung noch nicht bestätigt.
