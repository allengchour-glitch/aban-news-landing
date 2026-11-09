# Übergabe an Claude Code: Website und KI-/Krypto-Bot veröffentlichen

## Auftrag und Freigabe

Der Nutzer hat Website-Optimierungen und die Fortsetzung am Trading-/Krypto-Bot bestätigt und anschliessend ausdrücklich «mach alles besser und live» beauftragt. Nun soll Claude Code übernehmen. Die Veröffentlichung der hier beschriebenen Änderungen ist damit freigegeben. Echtgeld-Handel, neue Strategien, andere Risikolimits und Kontozugriffe sind nicht Teil dieses Auftrags.

AGENTS.md, CLAUDE.md, SHARED-MEMORY.md und docs/KRYPTO-AUTONOMIE.md lesen. Bestehende parallele Arbeiten erhalten. Keine Force-Pushes. Die Änderungen wurden bereits umgesetzt: nicht neu implementieren.

## Auf GitHub vorhanden

Beide Branches wurden erfolgreich gepusht und ihre Commitstände anschliessend per `git ls-remote` bestätigt. Es wurden noch keine PRs erstellt, keine Änderungen gemergt und keine Deployments ausgelöst oder bestätigt.

| Bereich | Branch | geprüfter Code-Commit |
| --- | --- | --- |
| Website | `codex/abannews-website-optimierung` | `6e6e8c9c1d864dc1dc209c57960b72a176ac3fd6` |
| Bot/Wochenbericht | `codex/ki-bot-wochenbericht` | `55e8bed2f50ce7c2836ef4858ebc60c860e21fb8` |

Ausgangsstand beider Branches: `989827a7d`. Diese Übergabe wird als zusätzlicher Dokumentationscommit auf den Bot-Branch gepusht. Vor weiterer Arbeit main und die Branches frisch lesen; alte Commitstände nicht als aktuellen main voraussetzen.

## Website

- Newsletter: Pflicht-Einwilligung dem Formular zugeordnet, native E-Mail-/Pflichtfeldprüfung aktiviert. Rückkehr zur Seite stellt den bedienbaren Abonnierknopf wieder her.
- Vollständige Metadaten für das vorhandene 1200×630-Social-PNG und vorhandene Favicons. Archivgenerator verweist dauerhaft auf PNG statt SVG.
- Archiv: Lesebreite höchstens 70ch, lange Links umbrechen, Bilder proportional auf Textbreite begrenzen; Generator und ausgeliefertes CSS synchron.
- Footer-Überlauf bei 320px behoben; sichtbarer mobiler Abonnierlink auf about.html nicht mehr vor Screenreadern verborgen.
- GEMESSEN: HTML ohne Fehler/Warnungen, interne Links gültig; Browseransichten bei 320/390/1280px für Startseite, about.html und Archiv-Ausgabe025 bestanden. Formular mit/ohne JavaScript geprüft, sämtliche externen Browseranfragen abgefangen, keine echte Anmeldung. Generator mit erfundener Ausgabe im Speicher geprüft, keine Archiv-/Sitemap-Neugenerierung.

Dateien: `index.html`, `about.html`, `archive/archive.css`, `tools/build_archive.py`, plus Übergabe/Shared Memory.

## Bot

- Reproduziert: Optionales Labor-/Satellitenbuch als JSON-Liste, Zahl oder Zeichenkette konnte den gesamten Wochenbericht abbrechen; eine leere Liste blieb ohne Warnung.
- Korrigiert: Keine erfundenen Zusatzkennzahlen; Hauptbericht bleibt nutzbar und nennt das unlesbare Buch im Gesundheitsabschnitt. `None` und `{}` bleiben für noch nicht eingerichtete Zusatzbücher zulässig. Gültige bisherige Berichtsausgabe mit leeren/fehlenden Zusatzbüchern bytegleich.
- GEMESSEN: Acht neue Fehlerfälle vor Korrektur rot, danach 116 Berichtstests bestanden. 35 Pakettests und zusätzlich 170 Auto-Update-Tests bestanden. Zuvor 53 KI-Bot- und 501 Cockpitprüfungen bestanden. Lokale Broker-/Telegram-Nachbauten, keine echten Aufträge oder Nachrichten.
- Bestehender Workflow `.github/workflows/krypto-paket.yml` ruft nun zusätzlich `schatten/test_wochenbericht.py` auf. Kein neuer Workflow oder Zeitplan. Diese Workflowänderung gehört zur Update-Kette; die Nutzerfreigabe zur Veröffentlichung liegt für die beschriebene Änderung vor.
- Grenze: Oberste JSON-Struktur abgesichert; nicht jedes beschädigte verschachtelte Feld. Handelslogik, Not-Aus, Limits, Zugangsdaten und Echtgeld-Schalter unverändert.

## Warum noch nicht live

Die Codex-Cloud erlaubte Git-Lesen und -Push, blockierte aber `https://api.github.com` und `https://abannews.com` schon beim Proxy-CONNECT mit HTTP403. Das ist kein nachgewiesener GitHub-Authentifizierungsfehler. Vorhandene GitHub-Authentifizierung nutzen, keine Tokens in Chat oder Dateien anfordern/kopieren.

Im Cloud-Konfigurationsentwurf sind `api.github.com`, `abannews.com` und `www.abannews.com` gespeichert. Der letzte Laufzeitstatus zeigte weiterhin keine angewandten zusätzlichen Domains. Eine Chat-Freigabe übernimmt diese Einstellungen nicht automatisch. Falls Claude Code dieselbe Cloud benutzt: Freigaben in den Umgebungseinstellungen übernehmen lassen und danach frisch prüfen. In einer anderen Umgebung deren tatsächlichen Zugriff testen.

Vollständige lokale CI-Simulation `bash automation/ci_simulation.sh` scheiterte bereits bei `mktemp` im schreibgeschützten `/home/agent`. Das ist kein bestandener CI-Lauf. Socket-Tests liefen erst mit regulärer Ausführung ausserhalb der Socket-Sandbox erfolgreich. Schutzprüfungen nicht abschalten.

## Nächste Schritte für Claude Code

1. Aktuellen main und beide Branches holen, offene PRs/Checks abgleichen. Bei Bedarf main normal integrieren; gemeinsame Änderungen an Übergabe/Shared Memory erhalten. Kein Force-Push und keine parallelen Änderungen überschreiben.
2. Für beide Branches zunächst Entwurfs-PRs erstellen. Den aktuellen finalen Diff und die obigen Ergebnisse als PR-Beschreibung verwenden. Die Website- und Bot-Änderungen sind getrennt überprüfbar.
3. Echte Repository-Prüfungen laufen lassen und Ergebnisse lesen. Zusätzlich beim Bot die bestehenden Krypto-Paket-Prüfungen prüfen. Die drei dokumentierten «Workers Builds»-Checks nicht mit einem fehlgeschlagenen echten Deployment verwechseln. Fehlende oder nicht ausgeführte Prüfungen sind nicht grün.
4. Nach erfolgreichen erforderlichen Checks PRs freigeben und regulär mergen. Der Nutzer hat die Veröffentlichung bereits beauftragt; keine erneute pauschale Freigabefrage. Keine Schutzprüfung umgehen.
5. Website: regulären Cloudflare-Pages-Bereitstellungslauf und danach tatsächlichen Live-Stand prüfen. Workflow-Erfolg allein bestätigt die Domain nicht. Formular ohne echte Anmeldung auf gültige/ungültige Eingaben prüfen; mobile Darstellung und Assets frisch abrufen.
6. Bot: nach Merge den Lauf «Krypto-Paket» sowie Release `krypto-latest` samt Prüfstand kontrollieren. Release-Veröffentlichung ist nicht der Nachweis, dass das Update auf dem Windows-PC angekommen ist. Die Cloud hat keinen Zugriff auf den PC; dortige Installation nur anhand echter PC-/Cockpit-Belege bestätigen. Kein Echtgeld-Handel einschalten.
7. Tatsächlichen Merge-, Deployment- und Paketstand in den Übergabedateien festhalten. Blocker und ungemessene Punkte ausdrücklich nennen.

## Lokale Hilfsdateien dieser Codex-Umgebung

`/workspace/release-vorbereitung/website-pr.md` und `bot-pr.md` enthalten vorbereitete PR-Texte. `/tmp/abannews-check.mjs` sowie `/tmp/abannews-optimiert-*.png` sind flüchtige Browserbelege. Sie sind nicht im Repository und müssen in einer anderen Umgebung neu erzeugt werden. Der Archivgenerator verwendet weiterhin private lokale Quellpfade; keinen vollständigen Archiv-Neubau ohne passende Quellen starten.
