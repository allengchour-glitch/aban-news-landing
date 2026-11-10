# Abschlussstand der offenen technischen Arbeiten

Nutzerauftrag: «offene sachen abschliessen». Alle noch ausstehenden Codekorrekturen sind auf `codex/offene-abschliessen` zusammengeführt. Der neue Branch entstand von aktuellem `origin/main` `c33f30e00`; andere Sitzungsarbeiten wurden erhalten. Geprüfter Code-Commit: `fed25db4146dfa609f1bf0746bcdb9c6927ae867`. Nachfolgende Abschlussdokumentation verändert diesen geprüften Anwendungscode nicht.

## Zusätzlicher Veröffentlichungsnachweis

Nach «das geht besser weiter» wurde `main` bis `a58f95003` konfliktfrei übernommen. Geprüfter Build-Commit: `ca289cde075a4cfbe2c4e3fa6f1c61a0d3d6b7cf`. Dessen Anwendungscode ist identisch zum bereits geprüften `fed25db41`; hinzu kamen ausschließlich Gedächtnis-/Übergabedateien und Claudes Indexliste.

GEMESSEN: vollständiger frischer Git-Export, echter `bash build-pages.sh` im netzlosen Container, Exit0. Das fertige Paket enthält7381 Dateien;2707 HTML-Dateien wurden vom vorhandenen Reparaturprüfer gegengeprüft, keine zusätzliche Reparatur nötig. Keine Datei über24MiB, keine internen Markdown-Dateien außerhalb Produktdownloads und keine ausgeschlossenen privaten Verzeichnisse im Paket. Pflichtdateien, Social-PNG und Favicons vorhanden. Geschützte Kit-ZIPs ohne `DOWNLOAD_SALT` ausdrücklich nicht getestet.

Anschließend30 Browser-Prüfungen am **gebauten Paket** bestanden: Formular mit/ohne JavaScript, verweigerte Anmeldung ohne Einwilligung oder mit falscher E-Mail, Rückkehrnavigation, Startseite/Über-uns/Archiv bei320/390/1280px, lange Links, große Bilder und Favicons. Externe Anfragen wurden abgefangen, keine echte Anmeldung. Sitemap, JSON-LD und Launch-Seite bestehen die zusätzlichen Original-Predeploy-Befehle. Die originale Brand-Voice-Dateiauswahl findet für diesen Branch keine anwendbaren Content-Markdown-Dateien.

Warnungen korrekt eingeordnet: Die rohe Predeploy-Linkprüfung löst dynamische Ziele/Redirects nicht auf. Der Build-Linkprüfer meldet `/markt` in der ausgeschlossenen lokalen Cockpit-Vorlage; `cockpit.py` bedient diesen Pfad tatsächlich. Deshalb kein falscher Website- oder Bot-Linkfix. Keine vollständige Fehlerfreiheit aller Seiten behauptet. Rohprotokolle: `/workspace/ci-ergebnisse/abschluss-pages` und `/workspace/ci-ergebnisse/abschluss-predeploy`; sanitiserter Nachweis in [ABSCHLUSS-NACHWEIS.json](ABSCHLUSS-NACHWEIS.json).

## Erledigt

| Punkt | Abschluss und Nachweis |
| --- | --- |
| Unabhängige Claude-Prüfung von Version4 | Auf main vorhanden: [CLAUDE-REVIEW-V4.md](CLAUDE-REVIEW-V4.md) und acht zusätzliche Regressionstests übernommen. Nicht als neue Prüfung von Version5 ausgeben. |
| Claude-BefundF8 | Extremwerte/implausible Kurssprünge werden vor Übernahme abgewiesen. Rechnung auf einer Kopie, Zustandsübernahme erst nach vollständiger erfolgreicher Prüfung; Rechenfehler verändern weder Historie noch Zähler. Fünf neue Regressionen, vor Korrektur rot. |
| Forschungsstand Version5 | Alle70 Tests inklusive Claudes Prüfungen im frischen Container mit Python3.11.18 bestanden. Alle36 historischen Ergebnisfälle und letzten Zielquoten unter derselben Python-Version unverändert zu Version4. Neuer [Bericht](ergebnis-v5.json); keine Parameteroptimierung. |
| Bisher blockierte CI-Simulation | Alle neun Befehlsabschnitte des Jobs `tests` mit identischem Sparse-Dateisatz aus dem Commit in einem netzlosen Container mit leerem `/tmp`, Node22.23.4 und Python3.12.16 erfolgreich. [Reproduzierbarer Containerweg](ci-container/README.md). Das alte Hostskript braucht weiterhin nicht verfügbare Mountrechte; sein Testumfang wurde stattdessen vollständig isoliert ausgeführt. |
| Frühere Website-Korrekturen | Ursprünglich geprüfte Änderungen aus `6e6e8c9c1` in den Abschlussbranch übernommen: Formularvalidierung/Einwilligung, Rückkehrknopf, Social-PNG/Favicons, Lesedarstellung, mobiler Footer und Screenreader-Warnung. HTML ohne Fehler/Warnungen, interne Links gültig, Desktop-/Mobilbrowser mit/ohne JavaScript geprüft. Keine echte Anmeldung. |
| Archivgenerator | PNG-Verweise in erzeugter Beispielausgabe und Index sowie Gleichheit der relevanten CSS-Regeln geprüft; keine vollständige Neugenerierung oder Überschreibung des Archivs. |
| Frühere Wochenberichtkorrektur | Änderungen aus `55e8bed2f` übernommen; beschädigte optionale JSON-Bücher verhindern den Hauptbericht nicht mehr.116 Prüfungen bestanden; vorhandener Paket-Workflow führt sie aus. |
| Paketbau |35 vorhandene Paketbauprüfungen auf dem Abschlussstand bestanden; keine echte Broker-, Kunden- oder Telegram-Aktion. |
| Gemeinsame Übergabe | Konkreter Abschlussbranch, PR-Text und nachvollziehbare Ergebnisse statt verstreuter nur lokal vorgemerkter Korrekturen. Alte Branches bleiben bis zum regulären Merge als Belege erhalten. |

Die lokalen Ergebnisse stammen aus tatsächlichen Läufen, nicht aus angenommenen GitHub-Checks. Sanitisiert gespeichert in [ABSCHLUSS-NACHWEIS.json](ABSCHLUSS-NACHWEIS.json); vollständige Rohprotokolle dieser Instanz ausserhalb Git unter `/workspace/ci-ergebnisse/abschluss-final-ci` und `/workspace/ci-ergebnisse/abschluss-final-forschung`.

## Was Version5 genau ändert

SETZUNG für dieses Bitcoin-Forschungslabor: Kurse zwischen10⁻¹² und10¹², höchstens Faktor10⁶ zwischen zwei aufeinanderfolgenden Werten. Diese weiten numerischen Plausibilitätsgrenzen verhindern die nachgestellten Überläufe und sind je Strominstanz eingefroren. Das sind keine Börsen-, Hebel- oder Portfoliorisikogrenzen. Auf den vorhandenen Daten greift kein neuer Ausschluss; die Ergebnisse bleiben exakt gleich. Ungültige Schritte werden nicht still übersprungen: der Aufrufer erhält einen Fehler und muss die Datenquelle prüfen.

Claudes Extremkurs (`sys.float_info.min`) wurde vor der Korrektur angenommen; der nächste normale Kurs scheiterte mit `AttributeError`, der Zähler war trotzdem um2 gestiegen. Nachher wird der Extremkurs vor jeder Übernahme abgewiesen. Auch ein absichtlich ausgelöster Rechenfehler oder NaN im Rechenweg lässt den Strom unverändert; anschliessender normaler Schritt stimmt mit einem ungestörten Referenzstrom überein.

## Verbleibende externe Voraussetzungen

1. **PR, Merge, Remote-Checks und Live-Kontrolle:** Der frische `gh api`-Aufruf auf das Repository wird weiterhin vom Cloud-Proxy mit `Forbidden` abgewehrt. Git-Lesen und -Push funktionieren. Die Freigaben für `api.github.com`, `abannews.com` und `www.abannews.com` sind im Konfigurationsentwurf gespeichert, laut Laufzeitstatus aber noch nicht angewendet. Keine weitere pauschale Genehmigung zum Veröffentlichen erforderlich: der Nutzer hat «mach alles besser und live» und den Abschluss ausdrücklich beauftragt. Die tatsächliche Netzwerkeinstellung muss in der Umgebung übernommen werden.
2. **YouTube und Originaltexte:** Die gespeicherten zusätzlichen Quellenfreigaben sind ebenfalls noch nicht angewendet. Videos/Untertitel wurden hier nicht gesehen; Begleitcode und Claude-Befunde ersetzen das nicht. Dokumentation bleibt entsprechend gekennzeichnet.
3. **Ankunft auf dem Windows-PC:** Kein Zugriff auf den PC. Ein GitHub-Release allein würde keine installierte PC-Version beweisen; dafür den tatsächlichen Versions-/Updatezustand im Cockpit prüfen. Keine PC-Aufgaben, Konten oder Schalter aus der Cloud verändern.
4. **Neuer Zukunftsnachweis:** Echte neue Vorwärtsdaten und vollständig datierte Nachrichten-/Modellprovenienz liegen nicht vor. Historische Ergebnisse, Testanzahl oder künstliche Nachrichten sind kein unabhängiger Zukunfts- oder Renditenachweis. Ein tatsächlich unbeobachteter Holdout und das Register aller früheren unbekannten Versuche lassen sich nicht nachträglich erfinden. Diese Forschungsgrenzen sind keine noch unbehobenen Codefehler.

## Veröffentlichung nach verfügbarer Verbindung

Frischen main/Branch und offene PRs lesen. Für `codex/offene-abschliessen` einen Entwurfs-PR anlegen; vorbereiteter [PR-Text](PR-TEXT.md). Tatsächliche erforderliche GitHub-Checks lesen und bei Erfolg regulär mergen. Die drei dokumentierten Workers-Builds nicht mit einem gescheiterten echten Check verwechseln. Keine Prüfungen umgehen und kein direkter Force-/Main-Push.

Danach Website-Deployment und Domain frisch prüfen; beim Bot den bestehenden Krypto-Paket-Lauf und das Release prüfen. Die Workflowänderung fügt nur den Wochenbericht-Test hinzu, keine neue Strategie oder Häufigkeit. Handelsregeln, Echtgeld-Schalter, Konten, Schlüssel und Schutzcode bleiben unverändert. Die neue Version5-Korrektur ist nicht als erneute unabhängige Claude-Freigabe oder bereits erfolgte Live-Bereitstellung zu bezeichnen.
