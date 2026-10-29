# Material: persistenter Schutz gegen erneutes Senden

29.10.2026. Lokaler Bibliotheksentwurf für die bestehende Aufgabe `product-attribute-completeness`. Keine Netzwerkaufrufe, Zugangsdaten, Produktwrites, echten Ledger-Initialisierungen, Installationen oder Deployments.

## Konkreter Befund und Änderung

Der bisherige r3-Runner schreibt seine Zusammenfassung erst nach dem Lauf in `material_ledger.txt`. Verliert er die Antwort nach einer ausgeführten Mutation, gibt es vor dem Send keinen dauerhaften Checkpoint. Ein neuer Planpfad kann die unbeantwortete Änderung in einem späteren Lauf verdecken. Der bereits vorhandene `compareDigest` schützt parallele Änderungen, ersetzt jedoch diese Verlaufssperre nicht.

Die neue isolierte Bibliothek `automation/lib/material_write_ledger.mjs` speichert vor dem Send einen `inflight`-Anspruch mit SHA-256 der exakten Planbytes, Produkt-IDs, Vorwert/Typ, Zielwert/Typ und Quellenbezug. Nur das erstmals zurückgegebene `decision: claimed_once` darf vom integrierenden Runner zu einer Mutation führen. Ein bereits beanspruchtes Produkt blockiert den ganzen neuen Stapel, auch bei anderem Laufnamen oder geändertem Planhash. Disjunkte Produkte im ausdrücklich abgegrenzten Scope bleiben möglich.

Der enge Scope ist absichtlich einmalig: Auch `confirmed` und `rejected` werden nicht automatisch erneut gesendet. Eine spätere neue Pflege derselben Produkte braucht einen separat abgeglichenen Arbeitsauftrag und eine bewusst geregelte neue Abgrenzung. Dieses Modul bietet keinen Reset-, Retry-, Undo- oder Resume-Send-Aufruf.

## Wiederverwendete Prinzipien

Zuerst geprüft wurden die vorhandenen lokalen Quellen:

- `next-improvements-20261018/automation/master_publication_ledger.mjs`, SHA-256 `d593a1e25dc978f085240d480d36c2ee7fad7c4a5e1bcb4e040f4e1cf8cfdc2a`: exklusiver Lock, `fsync`, temporäre Datei im selben Verzeichnis, atomarer Rename, keine automatische alte Lock-Entfernung.
- `luxestyle-codex/codex-mods/luxe-codex/lib/uebergabe.mjs`, SHA-256 `54547f449be8f8b633c434a7854bde0870ebad6f60e5fdb9bee96f443740c316`: exklusive Dateianlage und gesicherte Kontrollpunkte.

Die Prinzipien wurden begrenzt auf Material-Stapel übertragen. Die bestehende Publikationsbibliothek wurde nicht importiert, weil ihr Master-/Kanal-Schema und ihre Zustandsübergänge andere Fachbedeutung haben. Die vorhandenen Dateien bleiben unverändert.

Fehlende oder beschädigte Ledgerdaten bleiben unbekannt. `beginMaterialBatch` und `readMaterialLedger` initialisieren nichts. Erstinitialisierung erfordert einen ausdrücklichen begrenzten Produkt-Scope sowie Referenzen auf historischen Abgleich und bestätigte Speicherpersistenz. Eine Referenz oder ein Boolean ist dabei eine Angabe des Aufrufers und ersetzt deren tatsächliche Prüfung nicht. Symlink-Dateien und aliasierte Verzeichnisse sind ausgeschlossen. Die lokale Testdatei beweist keine übergreifende produktive Persistenz.

Vor LIVE muss eine feste gemeinsame dauerhafte Ledgerroute für alle beteiligten Läufe und Akteure belegt sein. Absolute Pfade und kanonische Verzeichnisse allein genügen dafür nicht: Wer ein zweites unabhängiges Ledger neu initialisiert, könnte frühere Ansprüche aufteilen. Das Modul ist deshalb keine globale Projektsperre und kein allgemeiner laufender Katalogscheduler. Es bietet keinen automatischen Init, Defaultpfad oder Ausweichpfad unter `/tmp`; seine Einmalproduktscope-Sperre bleibt bewusst konservativ.

## Quellenalter ohne erfundene Frist

Es wurde keine fachliche TTL für LuxeStyle festgesetzt. Ohne ausdrückliche dokumentierte `sourceAgePolicy` blockiert die Bibliothek. Der Aufrufer muss Policy-ID, Quellenreferenz und `maxAgeMs` liefern. Für jedes Produkt werden die tatsächlich übergebenen Quellbytes gegen deren SHA-256, eine Referenz sowie einen bekannten, nicht zukünftigen Prüfzeitpunkt geprüft. Alte Quellen und fehlende Zeit-/Hashangaben sperren.

Diese Prüfung bindet Bytes und Zeitangaben. Sie beweist nicht, dass ein Lieferant korrekt zugeordnet ist, dass ein Materialhinweis sachlich zutrifft oder dass eine selbst gesetzte Policy vom Inhaber freigegeben wäre. Produktidentität, aktuelle Quelle, erlaubter Umfang und Faktentreue bleiben eigenständige Voraussetzungen.

## Schnittstelle für die Integration

- `initializeMaterialLedger({ ledgerPath, shopDomain, ownerIds, baselineEvidenceReference, persistenceEvidenceReference, initializationConfirmed, now })`: separate bewusste Erstinitialisierung, niemals automatisch aus einem Schreiblauf.
- `beginMaterialBatch({ ledgerPath, shopDomain, planBytes, batch, runId, sourceEvidence, sourceAgePolicy, now })`: vor der Mutation; bei jeder anderen Entscheidung als `claimed_once` kein Send.
- `finishMaterialBatch({ ledgerPath, key, claimToken, expectedRevision, state, readbacks, userErrors, reason, now })`: Zustand nach der Operation fortschreiben. Der originale Claim und seine aktuelle Revision sind erforderlich.
- `readMaterialLedger({ ledgerPath })`: nur lesen.
- `checkSourceFreshness({ source, policy, now })`: reine Vorprüfung ohne I/O.

`batch` enthält exakte geparste Planzeilen (`id`, `wert`, `vorher`, `sourceEvidence` und unveränderte weitere Felder). Der Planbeleg muss `{ ownerId, sha256, reference, checkedAt }` enthalten und exakt zu den übergebenen Quellen passen; nur der Zeitstempel wird zum Vergleich normalisiert. Fehlende Metadaten sperren LIVE. `sourceEvidence` ist je Produkt `{ ownerId, bytes, sha256, reference, checkedAt }`. `sourceAgePolicy` ist `{ id, reference, maxAgeMs }`. `confirmed` benötigt vollständige eindeutige `{ ownerId, value, type, checkedAt }`-Rücklesungen für alle Stapelprodukte. Jede Rücklesung muss nach dem letzten Kontrollpunkt erfolgt sein. Ein Bestätigungszustand belegt beobachtete Zielwerte, nicht allein deren kausale Urheberschaft.

`rejected` erfordert eine definitive nicht leere `metafieldsSet.userErrors`-Antwort aus dem ursprünglichen inflight-Schritt. Fehlende Antwort, unklare Daten oder nicht vollständige Rücklesung werden `unknown`; Abweichungen können `conflict` werden. Danach ist nur ein neuer Leseabgleich zur Bestätigung vorgesehen, kein erneuter Schreibversuch. Der Fehlergrund wird erhalten; Rohantworten oder Kundendaten müssen nicht ins Ledger.

## Begrenzte Validierung

55 lokale Regressionen bestanden (44 aktualisierte Basisfälle und elf neue Bindungs-/Strukturregressionen), Node 24.19.0. Die Prüfung verwendet eigene temporäre Dateiverzeichnisse und synthetische Produkt-/Quellangaben. Enthalten sind fehlende/beschädigte Dateien, Sperrdateien, Planwechsel, überlappende Stapel, falsche Typen/IDs, fehlende Quellenalter-Policy, stale/future-Quellen und verlorene Schreibantworten. Zwei echte Kindprozesse belegen Wiedererkennung über Prozessgrenzen sowie höchstens einen neuen Claim bei Konkurrenz. Alle drei JavaScript-Dateien bestehen `node --check`.

Die 55 Fälle sind Library-Prüfungen, kein erneuter Test der 253 r3-Fälle. Ein integrierter Runner muss gesondert beweisen, dass kein Fehlerpfad die Sperre umgeht und dass ein Checkpoint vor dem Send liegt. Voll-CI, Node22, tatsächlicher dauerhafter Speicher, legitime Laufzeit-Zugänge, Quellenalter-Policy und Live-Ausführung bleiben offen. Die operative r3-Version wurde nicht verändert.


## Zweite lokale Revision nach Gegenprüfung

Die unabhängige Gegenprüfung fand zwei reale Lücken im ersten noch unveröffentlichten Bibliotheksentwurf: Ein frischer Beleg für eine andere Quelle konnte den Plan erfüllen; eine strukturell kaputte Bestätigung wurde nach neuer Prüfsumme akzeptiert. Diese Revision bindet Quellenowner, Hash, Referenz und normalisierte Prüfzeit zusätzlich an genau die Planzeile. Der Leser validiert den vollständigen Anspruch samt Quellen-/Policy-Struktur, Revisionszahl, Zeitfolge, erlaubten Zustandsübergängen und vollständigen typisierten Bestätigungsbelegen. Jeder historische unbekannte Ausgang behält seinen Grund auch nach einer späteren Gegenprobe.

Die zehn neuen Regressionen scheitern sämtlich am ursprünglichen lokalen Entwurf und bestehen hier. Eine Prüfsumme und formale Strukturprüfung sind kein kryptografischer Echtheitsnachweis: Wer alle Dateien kontrolliert, kann formal konsistente Daten erfinden. Baseline, Dauerhaftigkeit, Projektregel, aktuelle Produktquellen und Herkunft der Rücklesedaten müssen legitim belegt bleiben. Die frühere lokale Revision wurde erhalten; nur `r2/after` ist die aktuelle Integrationsquelle. Meldungen und Kommentare sind Deutsch, die stabilen API-Bezeichner bleiben unverändert.

Eine weitere enge Gegenprobe fand Zusatzfelder im Vorwert, die der Claim zunächst akzeptierte, der Leser anschliessend jedoch ablehnte. Vor dem Speichern werden nun dieselben exakten Vorwertfelder verlangt und der gesamte neue Anspruch mit dem Leser-Schema gegengeprüft. Der elfte neue Test belegt die Sperre vor Speicherung bei unveränderten Ledgerbytes.

Die unabhängige Schlussgegenprobe durch `copy_review` bestätigte alle drei gefundenen Punkte als behoben: Quelltausch und ungültiger Endzustand blockieren; der Vorwert-Zusatzfall erzeugt keinen Anspruch und lässt das Ledger bytegleich. Das ist eine begrenzte Codeprüfung, keine Produktionsfreigabe.
