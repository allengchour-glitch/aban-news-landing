# Konkrete Code-Zuarbeit für Claude, 28.10.2026

Claude führt die Umsetzung. Codex hat auf den Auftrag «kannst du von hier aus unterstützen» zwei aktuelle Codefälle unabhängig gegengeprüft. **Beide sind offline reproduziert, nicht produktiv korrigiert.** Keine neuen Shop-/Merchant-/Social-/Kundenaktionen oder Kennzahl-/Bestellabfragen; keine Installation und kein Workflowstart.

GEMESSEN: aktuelle GitHub-Quellen gelesen, lokale Bytes gegen Gitblob geprüft und vor Abschluss frisch gegengeprüft. CLI `automation/gmc_schaufenster.mjs`: Blob `f77a7ef680f83c7cc5aeae0e9fa4ec8c2fb000ba`; Logik `automation/lib/gmc_schaufenster.mjs`: `90cf27308debe167ae9cd20bcfa763efd3e59f30`. Beide beim abschliessenden Read unverändert. Ausführung nur unter Node v24.19.0; der in AGENTS.md genannte /opt/node22/bin/node ist lokal nicht vorhanden. Keine Aussage über Claudes andere Runtime.

## 1. Fehlende Shopbindung vor dem Credential-Request

**GEMESSEN, CLI Zeile41 sowie67–76:** `SHOP` übernimmt SHOPIFY_SHOP direkt. `holeToken` baut damit die URL und sendet Client-ID/Secret, bevor die spätere Hostprüfung in shopifyGql erreicht wird. Vorher gibt es im vollständigen CLI keinen Hostguard.

Reproduktion mit unverändertem Funktionsauszug in einer VM: Der korrekte LuxeStyle-Host als Positivkontrolle, ein anderer myshopify-Host und ein fremder .test-Host erhalten jeweils einen Mock-Request mit rein künstlichem Credential-Text. Die beiden fremden Ziele hätten vor jedem Request abgewiesen werden müssen. **Drei Fixtures, davon zwei belegte fehlende Abweisungen; null echte Netzwerkaufrufe.** Der vorhandene `normalizeShopifyHost`-Helfer plus exakter Vergleich auf `au3j0y-hq.myshopify.com` akzeptiert in drei Gegenproben nur den erlaubten Shop.

Kein tatsächlicher Datenabfluss und keine reale Fehlkonfiguration nachgewiesen. Die Gegenprüfung hat keine echten Zugangsdaten gelesen. Ein zweiter Prüfer hat den fehlenden früheren Guard am vollständigen Originalcode bestätigt.

Konkrete Aufgabe für Claude: vorhandenen Hosthelfer vor dem ersten Credentialzugriff verwenden und anschliessend die exakte LuxeStyle-Shopbindung prüfen. Ein lediglich syntaktisch gültiger fremder myshopify-Host reicht nicht. Fehlende/fremde/malformed Hosts müssen vor fetch enden; erlaubter kanonischer Host bleibt Positivkontrolle. Redirects und Fehlerausgaben im Authpfad bei der Implementierung ebenfalls eng prüfen; aus dieser Reproduktion wird dafür kein zusätzlicher Vorfall behauptet.

## 2. Überlappende Rücknahme kann einen neueren Rücknahmebeleg verlieren

**GEMESSEN, CLI Zeile234/242, Logik Zeile268–278:** Abwahl schreibt vor dem Aufruf `ab-versucht`; Rücknahme schreibt nach der Antwort `auf`. parseManifest lässt die letzte angehängte Aktion je Produkt gewinnen. Eine gemeinsame Schreibsperre über die schreibenden Phasen fehlt.

Reproduktion mit dem unveränderten Mutationsteil und echten Hilfsfunktionen:

1. Eigene Abwahl setzt das künstliche Produkt auf nicht publiziert und schreibt `ab-versucht`.
2. Rücknahme publiziert es; ihre erfolgreiche Antwort wird im Fake-Shop zurückgehalten.
3. Ein neuerer Abwahllauf schreibt ein neues `ab-versucht` und nimmt das Produkt wieder vom Kanal.
4. Die ältere Rücknahme-Antwort kommt an und hängt zuletzt `auf` an.
5. Der Fake-Shop steht weiterhin auf nicht publiziert; die Manifest-ID ist jedoch entfernt. Die echte plan-Funktion bietet keine Rücknahme mehr an.

Die serielle Gegenprobe endet korrekt auf publiziert. Beide Planfixtures haben `p.ok=true`, Budget40’000 Varianten und den unveränderten Kategorie-Standard. Codex hat die unabhängige Reproduktion nochmals ausgeführt und das Ergebnis bestätigt. **Keine echte Shopmutation.** Tatsächliche überlappende Produktionsläufe und Schäden sind unbekannt.

Konkrete Aufgabe für Claude: einen gemeinsamen Schreibschutz für abwaehlen/aufnehmen/zuruecksetzen vom relevanten frischen Lesen bis nach Mutation, Checkpoint und Rücklesung halten. Bei mehreren Hosts muss der Schutz gemeinsam gelten; ein separater lokaler Lock je Rechner genügt allein nicht. Lauf-/Operations-IDs und Versionsgegenprobe müssen verhindern, dass eine verspätete Antwort einen neueren Checkpoint aufhebt. Ungeklärte Antworten bleiben unknown und werden gezielt abgeglichen. Serielle Kontrolle und überlappender Ablauf sind konkrete Regressionanforderungen.

SETZUNG Priorität: beide vor einer weiteren produktiven Automatisierung dieses Werkzeugs prüfen und beheben. Kein pauschaler Befund gegen alle bestehenden Tests: die dokumentierten 159 Regel-/44 Ablaufprüfungen wurden in dieser Zuarbeit nicht erneut ausgeführt. Ein anfangs fehlender Parameter der unabhängigen Testhülle wurde lokal korrigiert; erst der danach erfolgreiche Lauf und die serielle Kontrolle tragen den Befund.

## Nachweise und Arbeitsgrenze

[Quellversionen, zwei Reproduktionen, Ergebnisse und Gegenprüfung](CLAUDE-ZUARBEIT-BELEGE-20261028.json). Das Archiv enthält ausdrücklich Reviewquellen; keine Runtimeintegration, kein Deployment und kein neues Produkt-/Publikationsregister. Die Reproduktionen verwenden ausschliesslich künstliche Werte, VM-/Fake-Shop-Funktionen und lokale Testdateien.

QUELLE: Claudes aktuelle Dokumentation meldet einen kleinen Live-Test und einen vom Berechtigungssystem blockierten Massenlauf. Codex hat diese fremden Aktionen weder ausgeführt noch als eigene bestätigt und den blockierten Lauf nicht über einen anderen Weg oder Teilläufe gestartet. Diese Zuarbeit ist die davon unabhängige Codeprüfung.

Vor einer Umsetzung Quellen erneut prüfen, konkrete Diffs ansehen und passende Regressionen ausführen. Keine Änderung an Preisen, Verkaufskanälen, Ausschlüssen, Bestellungen, Flows, DNS, Budgets oder Socialposts durch diesen Bericht. Öffentliche CHF50/interne CHF45, Kundendomäne und bisherige Freigabegrenzen erhalten. Die gemeinsame GitHub-Übergabe ist der belegte Transport; eine direkte Verbindung zu Claudes laufender Session oder automatische Übernahme wird nicht behauptet.
