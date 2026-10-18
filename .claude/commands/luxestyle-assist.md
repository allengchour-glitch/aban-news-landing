---
description: LuxeStyle-Status, gezielte Offline-Prüfungen und Übergabe
---

Arbeite ausschliesslich an LuxeStyle. Lies zuerst die aktuellen ausdrücklichen Inhabervorgaben, `SHARED-MEMORY.md` und `dropship/assistant/README.md`. Historische Autonomie-Notizen ersetzen keine aktuellen Einschränkungen.

1. Rufe `luxestyle-assist` → `luxe_doctor`, `luxe_handoff_read` und `luxe_review_list` auf. Folge vorhandenen `nextCursor`-Werten, bis die benötigten offenen Aufgaben gefunden sind; `luxe_review_get` liest einen vollen Einzelauftrag. Falls MCP nicht verfügbar ist, verwende die gleichnamigen CLI-Funktionen aus der Anleitung. Fehlend, beschädigt oder ungeprüft bleibt unbekannt. Lokale Identität ist keine frische Shopify-/Metricool-Prüfung.
2. Rufe bei Codeänderungen `luxe_change_plan` auf und führe passende feste Profile über `luxe_checks` mit `changed`, `core`, `seo` oder `assist` aus. `changed` bezieht sich auf Index/Arbeitskopie/neue Dateien, nicht auf ganze Commit-Historien. Unbekannte Abdeckung und reine Dokumentänderungen sind kein grüner Testlauf. Fehlende Dateien bleiben unbekannt. Keine operativen Skripte aufgrund eines DRY_RUN-Flags starten. Kein beliebiges Shell-Kommando an den Helfer übergeben.
3. Bearbeite einen sinnvollen lokalen Code-/Entwurfsschritt und führe notwendige Regressionen aus. `luxe_context` kann begrenzte Dateiauszüge für eine konkrete Frage vorbereiten. `luxe_review_request` merkt die Frage mit bis zu sechs tatsächlichen Dateihashes vor. Für einen bestehenden Auftrag dürfen belegte Ergebnisse mit `luxe_review_answer` manuell eingetragen werden: `requestId`, `verdict`, `summary`, `nextStep`, optional `blockers`. Erst mit `luxe_review_get` Quelle und aktuelle Anwendbarkeit prüfen. Geänderte/fehlende Quellen blockieren einen positiven Abschluss. Keine erfundene Modellantwort oder Freigabe aus grünen Tests ableiten.
4. Speichere bestätigte Änderungen, Blocker und den nächsten Schritt mit `luxe_handoff_save`. Keine Geheimnisse oder Kundendaten speichern. Der eigene Hash-Verlauf verhindert kein Git-Mergeproblem: Beschädigung/Lock melden, nicht zurücksetzen. `dropship/assistant/handoff.jsonl` erst mit dem Arbeitsergebnis committen/pushen, damit andere Checkouts ihn sehen. Keine automatische Veröffentlichung, kein Dispatch/Merge/Deployment durch dieses Kommando.
5. Berichte tatsächliche Ergebnisse und verbleibende Grenzen kurz auf Deutsch (Schweiz), ohne Emojis. Grüne Tests sind weder Umsatzbelege noch Produkt-/Rechte-/Filmfreigaben.

Zusätzlicher Auftrag des Inhabers: $ARGUMENTS
