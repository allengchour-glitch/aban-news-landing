# Lokaler CI-Nachweis ohne privilegierte Host-Mounts

Der alte Aufruf `bash automation/ci_simulation.sh` benötigt ein beschreibbares HOME und einen erlaubten Mount-Namespace. Beides fehlt in dieser Codex-Cloud. Die Prüfung hier verwendet stattdessen den vorhandenen lokalen Docker-Dienst; am Originalskript und an den geprüften Tests wird nichts abgeschwächt.

`pruefen.py` liest Workflow, Befehle und Quellstand aus einem ausdrücklichen Git-Commit. Für `ci-tests` werden alle neun `run`-Schritte des Jobs `tests` aus `luxestyle-automation-tests.yml` mit dessen Sparse-Dateisatz ausgeführt. Für `forschung` wird der vorhandene KI-Bot-Testschritt aus `deploy-check.yml` gewählt. Der Checkout stammt aus `git archive`, nicht aus dem Arbeitsbaum oder dessen `node_modules`.

Der Container läuft als normaler Benutzer mit zwei CPUs,2GiB Speicher, ohne Netzwerk und mit zunächst leerem `/tmp`. Das frische tmpfs ist ausführbar: Die vorhandenen Tests erzeugen absichtlich Shell-Attrappen unter `/tmp`. `nosuid`/`nodev` bleiben gesetzt. Es gibt keine privilegierten Container, kein Hostnetz, keine Schlüssel-/Credential-Mounts und keinen Docker-Socket im inneren Container. Nur die isolierte Testkopie und der Ergebnisordner sind beschreibbar.

Die Befehle laufen mit Bash `-e -o pipefail`; jeder Exitcode, Laufzeit und vollständige stdout-/stderr-Datei bleibt im neuen Ergebnisordner erhalten. Ein Timeout ist ein Fehler. Die Forschungssuite muss tatsächlich Tests ausführen. Der Gesamtstatus wird nur grün, wenn jeder ausgewählte Schritt abgeschlossen und erfolgreich ist. Das ist ein lokaler Prüfbeleg, kein GitHub-Check oder Deploymentnachweis.

## Image vorbereiten

Die Dockerfile verwendet offizielle Node-/Python-Images, verifizierte Debian-Pakete und PyYAML6.0.3. Die Cloud-CA wird nur während des Builds als Secret eingebunden; TLS und Paketsignaturen bleiben aktiv. Base-Tags können sich weiterentwickeln, daher werden beim Lauf tatsächliche Versionen und Image-ID aufgezeichnet. Der Bau wird dadurch nicht als bitweise reproduzierbar behauptet.

```bash
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock build --build-arg PYTHON_VERSION=3.12 \
  --secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt \
  -t codex-ki-ci:py312-node22 docs/ki-bot-gemeinsam/ci-container

env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock build --build-arg PYTHON_VERSION=3.11 \
  --secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt \
  -t codex-ki-ci:py311-node22 docs/ki-bot-gemeinsam/ci-container
```

## Eingecheckten Stand prüfen

```bash
python3 docs/ki-bot-gemeinsam/ci-container/pruefen.py --suite ci-tests \
  --image codex-ki-ci:py312-node22 --rev HEAD --ausgabe /workspace/ci-ergebnisse/neuer-ci-lauf
python3 docs/ki-bot-gemeinsam/ci-container/pruefen.py --suite forschung \
  --image codex-ki-ci:py311-node22 --rev HEAD --ausgabe /workspace/ci-ergebnisse/neuer-forschungslauf
```

Zielordner müssen neu sein. Die aktuellen Workflow-Vorgaben werden gelesen: Node22/Python3.12 für den allgemeinen Job, Python3.11 für die Forschung. Eine abweichende Python-/Node-Version verhindert die Prüfung. Die Hilfsprogramme benötigen auf dem Host Python3.12 mit PyYAML und Zugriff auf den lokalen verwalteten Docker-Socket. Die Entfernung von Docker-Endpunktselektoren verhindert die versehentliche Verwendung eines anderen Daemons; Registry-Konfiguration und vorhandene Credentials werden nicht gelesen oder überschrieben.

`plan.json` enthält Commit, Workflowhash und ausgewählte Befehle. `evidence/summary.json` enthält Image-ID, Laufzeitversionen, Einzelstatus und Gesamtstatus. Die Rohprotokolle bleiben lokal; keine privaten Inhalte daraus ungeprüft ins Repository übernehmen.

## Während der Einrichtung diagnostizierte Fehler

1. Docker setzte ohne ausdrückliches `exec` für tmpfs automatisch `noexec`: Shell-Attrappen konnten nicht starten. Der erste Vorversuch war deshalb rot. Mount-Flags wurden gelesen und die Ursache belegt, dann die Containeroption passend zur ursprünglichen Testisolation korrigiert.
2. Im schlanken Image fehlte `curl`. Der vorhandene Varianten-Test erwartet dessen tatsächlichen Fehler beim Laden eines absichtlich unlesbaren Bildes; ohne das Programm entstand stattdessen `stdout=undefined`. `curl` wurde als reguläre Voraussetzung ergänzt. Test und Anwendungscode blieben unverändert.

Die roten Vorversuche sind keine bestandenen Läufe und wurden nicht überschrieben. Abschliessende Resultate stehen im Abschlussdokument eine Ebene höher.
