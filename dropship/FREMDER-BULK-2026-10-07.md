# Fremde Bulk-Exporte: lesen und abbrechen (07.10.2026, Verbesserungsrunde 08:25)

Dieser Bericht ist die Fortsetzung von `KLINGEN-KOPFWORT-2026-10-07.md`. Dort meldete die Klingen-Wache «0 Handklingen», weil sie den Export eines anderen Wächters gelesen hatte (47'084 statt 81'415 Produkte).

## GEMESSEN
Die Gehirn-Regel `fremder-bulk` meldete 5 Werkzeuge. Beim Nachschärfen der Regel kamen 3 weitere dazu: Die Schreibweise `currentBulkOperation(type: QUERY)` war vorher nicht erfasst.

**Dasselbe Muster bei 8 Werkzeugen:** Sie starten einen Bulk-Export und holen Status und URL über `currentBulkOperation`. Das ist aber der zuletzt gestartete Export der App, nicht unbedingt der eigene.
- farbe_je_variante
- hauptbild_grossbild
- heilversprechen_seo_wache
- hype_export_bauen
- kosten_export_bauen
- alttext_lieferantencode
- **preis_senken** — ein Preiswerkzeug, das auch seine Bulk-Mutation so verfolgte
- seo_voll_audit

**Schlimmer:** `hype_export_bauen` und `kosten_export_bauen` haben einen gerade laufenden Export vor dem eigenen Start **abgebrochen** (`bulkOperationCancel` auf `currentBulkOperation`). Getroffen hat das Exporte anderer Wächter, zum Beispiel den Voll-Export der Klingen-Wache.

## GETAN
- Alle 8 Werkzeuge merken sich die ID aus `bulkOperationRunQuery` bzw. `bulkOperationRunMutation` und fragen den Status nur noch über `node(id:)` ab.
- Das Abbrechen fremder Operationen ist entfernt.
- `preis_senken.warte_bulk(art, bid)`: Mit ID wird nur die eigene Operation verfolgt. Ohne ID wartet die Funktion nur ab, liest dabei keine URL mehr.
- **Gehirn-Regel nachgeschärft:**
  - erkennt jetzt auch `(type: …)`;
  - meldet nur Abfragen, die die URL lesen (ein reiner Status-Blick vor dem Start ist harmlos);
  - meldet jedes `bulkOperationCancel`.
  - Selbsttest 22/22, `--wacht`: 0 NEU (vorher 5 bzw. 8).
- **Funktionsprobe:** `hype_export_bauen.py` mit eigener ID → FERTIG, 51'362 Zeilen. Das passt zu ~50'900 aktiven Produkten.

## OFFEN
- Nichts für den Betreiber.
- Noch unberührt: `kategorie_rein_2.py` liest `currentBulkOperation(type:MUTATION)` ohne RunQuery im selben Skript. Pro Shop läuft immer nur eine Bulk-Mutation, das Risiko ist also klein.
