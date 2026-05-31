# Archiv aufräumen — bildlose Phantom-Produkte (2026-05-31)

## Befund (Bulk-Export, maschinell ausgewertet)
- Archiviert gesamt: **4.915**
- MIT mind. 1 Bild (behalten): **207** (alter Premium-Katalog mit Stock-/echten Fotos)
- OHNE jedes Bild (= Phantom/KI-Reste, löschbar): **4.708**

Stichprobe bestätigt bildlos & wertlos: Reisepass-Hülle, A5-Notizbuch, 3-tlg Pfannen-Set —
alle status ARCHIVED, mediaCount 0, vendor LuxeStyle.

## Status
- 20 bildlose bereits per API-Batch gelöscht (Test, erfolgreich). Verbleibend: **4.688**.
- `bulkOperationRunMutation` (Server-Bulk-Delete) ist sicherheitsgesperrt → API-Einzellöschung
  von 4.688 unpraktikabel/fehleranfällig.

## Empfohlener Weg (Shopify Admin, ~30 Sek, alle auf einmal)
1. Admin → Produkte
2. Filter: Status = Archiviert
3. Oben links „Alle auswählen" → „Alle 4.6xx auswählen"
4. Massenaktionen → Produkte löschen → bestätigen
⚠️ Achtung: löscht ALLE archivierten (auch die 207 mit Bild). Falls die 207 erhalten bleiben
sollen: vorher nur die bildlosen per ID-Liste löschen (Liste liegt in /tmp/arch_noimg.json,
reproduzierbar via Bulk-Export `products(query:"status:archived")` + Filter featuredMedia=null).

## Daten
Liste der 4.708 bildlosen IDs: maschinell erzeugt aus Bulk-Export (nicht eingecheckt, da gross).
Reproduzierbar jederzeit über denselben Export.
