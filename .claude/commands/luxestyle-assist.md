---
description: LuxeStyle-Status, gezielte Offline-Prüfungen und Übergabe
---

Arbeite ausschliesslich an LuxeStyle. Lies zuerst die aktuellen ausdrücklichen Inhabervorgaben, `SHARED-MEMORY.md` und `dropship/assistant/README.md`. Historische Autonomie-Notizen ersetzen keine aktuellen Einschränkungen.

1. Rufe `luxestyle-assist` → `luxe_doctor` und `luxe_handoff_read` auf. Falls das lokale MCP nicht verfügbar ist, verwende `node automation/claude-assist.mjs doctor` und `handoff-read`. Fehlend, beschädigt oder ungeprüft bleibt unbekannt. Lokale Identität ist keine frische Shopify-/Metricool-Prüfung.
2. Führe bei relevanten Codeänderungen genau das passende feste Testprofil aus. `core` prüft vorhandene Shopify-/Kanalhelfer, `seo` den gezielten SEO-Helfer, sofern er bereits übernommen wurde. Fehlende Dateien sind unbekannt. Keine operativen Skripte aufgrund eines DRY_RUN-Flags starten. Kein beliebiges Shell-Kommando an den Helfer übergeben.
3. Bearbeite einen sinnvollen nächsten lokalen Code-/Entwurfsschritt aus der Übergabe und führe notwendige Regressionen aus. Bei einer offenen Review-Frage kann `luxe_review_request` eine konkrete Frage und bis zu sechs LuxeStyle-Dateireferenzen mit Hash vorbereiten. Das ist eine Warteschlange, keine bereits erhaltene Codex-Antwort und kein automatischer Modellaufruf.
4. Speichere bestätigte Änderungen, Blocker und den nächsten Schritt mit `luxe_handoff_save`. Keine Geheimnisse oder Kundendaten speichern. Der eigene Hash-Verlauf verhindert kein Git-Mergeproblem: Beschädigung/Lock melden, nicht zurücksetzen. `dropship/assistant/handoff.jsonl` erst mit dem Arbeitsergebnis committen/pushen, damit andere Checkouts ihn sehen. Keine automatische Veröffentlichung, kein Dispatch/Merge/Deployment durch dieses Kommando.
5. Berichte tatsächliche Ergebnisse und verbleibende Grenzen kurz auf Deutsch (Schweiz), ohne Emojis. Grüne Tests sind weder Umsatzbelege noch Produkt-/Rechte-/Filmfreigaben.

Zusätzlicher Auftrag des Inhabers: $ARGUMENTS
