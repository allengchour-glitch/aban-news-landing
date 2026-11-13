# Bestehender Publisher: konkrete Schutzlücke und Ergänzungsentwurf

13.11.2026, Abendlauf. Die sechs erneut aktivierten Beiträge wurden separat in Metricool wieder auf Entwurf gestellt und frisch zurückgelesen. Der Verursacher ihrer zwischenzeitlichen Aktivierung ist weiterhin unbekannt. Diese Codeprüfung beweist keinen bestimmten Workflowlauf und keine Verursachung durch den Dokumentations-Push.

## Geprüfter Stand

Vier direkt relevante Dateien sind frisch auf Commit `bec31b16b67a65b37d5a5ba6e7978d9c79a2594d` gebunden; ihre Bytes stimmen mit dem kurz zuvor gelesenen Main-Stand `4574ade3df5b1f46349a76b049a04459d50546ab` überein. Dateihashes und Quellen stehen im JSON. Es wurden keine Secrets oder Workflowausführungen gelesen und kein Workflow gestartet.

Der Workflow `.github/workflows/metricool-freigabe.yml` hat einen täglichen Schedule um 05:41 UTC sowie `workflow_dispatch`, aber keinen `push`-Trigger. Pull Requests auf seine Codepfade führen nur Tests aus. Seine Freigabedatei ist vorhanden; bei einem entsprechenden tatsächlichen Lauf kann der bestehende Freigabeschritt dadurch `LIVE=1` verwenden. Ein gespeicherter Code oder eine vorhandene Datei belegt keine heutige Ausführung.

`automation/metricool_freigabe.py` nimmt bewusst `draft=true/autoPublish=false` als Freigabekandidaten auf (Zeilen 328–345). Es berücksichtigt die vorhandene Halteliste vor weiteren Prüfungen (303–320, 355–361). Der Freigabepayload setzt anschliessend `draft=false/autoPublish=true` und bei Instagram den Kanalwert auf true (273–299). Die geprüften technischen Pflichtfeld-, Produkt-, Termin- und URL-Prüfungen belegen weder Pflichtmusik, kommerzielle Medienrechte, kreative Premiumabnahme noch die Masterhistorie. Eine Metricool-Sperre allein ist deshalb kein dauerhafter Schutz gegen diesen Freigabepfad.

## Ein enger, bereits vorbereiteter Diff

In der aktuellen `dropship/METRICOOL-HALTEN.txt` stehen vier andere bestehende Einträge. Keine der elf heute bestätigten LuxeStyle-Sperr-UUIDs steht darin. Der lokale Patch ergänzt ausschliesslich diese sieben Audio- und vier R176-Projektor-UUIDs. Die bestehenden Datei-Bytes bleiben ein unveränderter Präfix, alle vier alten Gründe erhalten. Stabile UUIDs schützen auch nach einem Wechsel der numerischen Metricool-ID.

Quelle: Git-Blob `a3bbb009d8bca47d420aeefe11f8589adb0e690c`, SHA-256 `821b6c310e90076ce682d706cb6444eee30515ca76a6b6a6bf6c9ed8debd11fc`. Entwurf: SHA-256 `086d106d8eec3f49f474951808d39b7173a9a9d80e8e595567599e550b3996f1`. Der konkrete Patch ist separat beigefügt; vor einer Übernahme aktuelle Quelldatei und Diff erneut vergleichen.

Die vorhandenen zwei reinen Funktionen `lade_halten` und `halte_grund` wurden ohne Ausführung des Hauptprogramms auf genau die elf aktuellen UUIDs angewendet: vorher kein Treffer, im Entwurf alle elf gehalten; vier bisherige Gründe unverändert. `git apply --check` bestand in einer isolierten Kopie der ursprünglichen Datei. Keine Testsendung, Plattformabfrage oder Netzwerkanfrage war Teil dieser Funktionsprüfung.

**Nur ein geprüfter lokaler Schutzentwurf:** Weder Main noch die operative Halteliste im Handoff wurde geändert, kein Freigabeflag entfernt, kein Workflow gestartet, kein Zeitplan geändert. Die Dokumentationsablage des Patches aktiviert den Schutz nicht. Er wirkt nach einer späteren geprüften Übernahme nur für den hier untersuchten Repository-Publisher, nicht für andere Schreibzugänge. Die jeweils aktuelle ausdrückliche Inhabervorgabe bleibt massgebend; diese technische Sperre ersetzt keine spätere Produkt-, Rechte- oder Filmfreigabe.

[Konkreter Patchentwurf](METRICOOL-HALTEN-ENTWURF-20261113-R196.patch) · [Quellen und Validierung](PUBLISHER-HALTESCHUTZ-20261113-19H-R196.json).
