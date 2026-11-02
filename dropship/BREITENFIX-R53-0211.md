# Breitenfix Unterfilter-Zeile (Codex R53) — live am 2.11.2026

**Auftrag:** `CLAUDE-PUBLISH-AUFTRAG-20261102-R53.md` (Codex-Zweig `codex/luxestyle-claude-handoff-20261018`), vom Besitzer per Link übergeben.
**Shop/Theme:** luxestyle.ch / CHF, MAIN `gid://shopify/OnlineStoreTheme/213013037447` («LuxeStyle – Schrift und Banner 02.11.2026»), Rolle MAIN vor dem Schreiben nativ gelesen.

## Änderung (GEMESSEN)
Datei `templates/collection.json`, Block `lux_subchips`, genau ein Treffer:

| | CSS |
|---|---|
| vorher | `.lx-uf{max-width:min(var(--page-width,1200px),100vw);` |
| nachher | `.lx-uf{max-width:min(var(--page-width,1200px),100%);width:100%;min-width:0;` |

Sonst keine Byte-Änderung. Kein Theme veröffentlicht, kein anderer Pfad angefasst, der alte Entwurf 212978598279 NICHT übernommen.

## Hashes
- Codex-Ausgangswert MD5 `6c0ccc1bf403cc94bf55d1dd98b3ea84` ist meine Sicherung vor der Tab-Doppel-Entfernung (`dropship/antworten-0211/collection-vor-dedupe.json`). Die LIVE-Datei wich davon ab, weil ich heute die Doppel-Entfernung (`lx_seen`) eingebaut hatte: Vor-Hash live `dd9b8aac924d3c573b0460b433487022`.
- Nach dem Schreiben live: MD5 `457082cc5d27f1f348ba45f1722d40c1`; Rücklesung identisch mit dem Kandidaten; Datei-JSON gültig (nach Abzug des Kopfkommentars).
- Gegenprobe: dieselbe Ersetzung auf Codex' Basis ergibt MD5 `bbacad38aabc5e292ed819b3d1b01782` und SHA-256 `53c20c7e9162ea449e3f81a6cccf7744660e0d00534bf51409048df0dd2cf88b`, also exakt die von Codex erwarteten Werte. Die Regel ist Codex' Regel; die Differenz zum Codex-Endhash ist allein meine Tab-Änderung.

## Öffentliche Rücklesung (2.11., Playwright, ohne Cookies/Warenkorb)
| Seite | Breite | Dokument | Fenster | `.lx-uf` | Ergebnis |
|---|---|---|---|---|---|
| handy-zubehoer | 390 | 390 | 390 | 358 | kein Überlauf |
| ladekabel-datenkabel | 390 | 390 | 390 | 358 | kein Überlauf |
| handy-zubehoer | 1440 | 1440 | 1440 | 1360 | kein Überlauf |
| ladekabel-datenkabel | 1440 | 1440 | 1440 | 1360 | kein Überlauf |

Chips: 9 je Seite; Tab-Zeile auf der Gruppenseite 7 Einträge. Nicht geprüft: FR-Sprachpfade und die aktive Markierung einzeln.

## Rücknahme
In `templates/collection.json` des MAIN-Themes die Regel zurücktauschen (nachher → vorher, Tabelle oben) und per `themeFilesUpsert` schreiben.

Nicht umgesetzt (laut Codex ausdrücklich nicht Teil des Auftrags): Welcome-Mail VZnxDz, Projektor-Film.
