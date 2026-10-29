# Material r3: Quellen und Versionsgrenze

Stand: 29.10.2026. Nur Dokumentation und Schema gelesen; keine echten Shopify-Produktabfragen, Mutationen oder Tokens.

## Offizielle Shopify-Belege

- [metafieldsSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet): compare-and-set seit API 2024-07. Ein explizites `compareDigest: null` erlaubt die Neuanlage nur, solange das Feld fehlt. Ein bestehendes leeres Feld braucht seinen tatsächlichen Digest. Fehlender Parameter deaktiviert den Vergleich. Die Mutation ist atomar: ein Fehler verwirft den gesamten Stapel.
- [MetafieldsSetInput.compareDigest](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/MetafieldsSetInput#fields-compareDigest): nullable `String`. Die native Schemaabfrage bestätigte denselben Feldtyp, lieferte aber keine genaue API-Version.
- [Metafield.compareDigest](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metafield#field-Metafield.fields.compareDigest): `String!`; der Serverwert wird unverändert verwendet.
- [MetafieldsSetUserErrorCode](https://shopify.dev/docs/api/admin-graphql/latest/enums/MetafieldsSetUserErrorCode): unter anderem `STALE_OBJECT` und `INVALID_COMPARE_DIGEST`. Der Runner blockiert jeden `userError`, nicht nur einen bestimmten Fehlercode.
- [API-Versionierung](https://shopify.dev/docs/api/usage/versioning#release-schedule): alte nicht mehr zugängliche Versionen fallen auf eine verfügbare Version vor. Die aktuelle Liste beginnt bei 2026-01.
- [Tatsächlich ausgeführte API-Version](https://shopify.dev/docs/api/usage/versioning#making-requests-to-an-api-version): Antwortheader `X-Shopify-API-Version`. Die Prüfung muss vor einer Mutation mit einem Leseaufruf stattfinden; eine Kontrolle erst nach dem Schreiben käme zu spät.

## Belastbarkeit

Die aufgerufenen Dokumentations-URLs für 2025-01 (Mutation, Input, Objekt) sowie 2024-07 leiten auf `latest` weiter; beim Abruf war dies 2026-10. Damit ist das exakte historische Schema 2025-01 nicht unabhängig bestätigt. Der native Schema-Connector bestätigt `compareDigest` und `QueryRoot.nodes(ids: [ID!]!): [Node]!`, hat jedoch keinen Versionsparameter bzw. Versionsnachweis. Nullable oder fehlende Knoten dürfen deshalb nicht als fehlende Metafelder ausgelegt werden.

Die GraphQL-Codevalidierung meldete ausdrücklich: «GraphQL validation skipped. Continue with graphql_query or graphql_mutation which will perform the validation.» Es wurde keine echte Shop-Operation als Ersatz ausgeführt. Es gibt somit keinen behaupteten Live-Validierungserfolg.

Die Konfiguration bleibt bewusst `2025-01`. Vor jedem Schreibteil verlangt der Entwurf zunächst den exakt passenden Header einer Leseantwort; fehlt er oder zeigt er eine andere Version, wird abgebrochen. Jede weitere LIVE-GraphQL-Antwort läuft durch denselben Runner-spezifischen Wächter. Weil 2025-01 laut aktueller Versionsliste nicht mehr verfügbar ist, ist für einen echten Lauf ein Versions-Fallback und damit eine Sperre zu erwarten. Es wurde kein tatsächlicher Shop-Header gemessen. Eine separat geprüfte Versionsmigration ist weiterhin nötig; der Entwurf migriert nichts stillschweigend.

## Repository-Gegenprobe

- Elternaufgabe bestätigt main `b708c809c2b9ef074bf48999fdfe5b28d0ee3bbe`.
- In diesem Lauf frisch aus `main` gelesen: `automation/material_nachtragen.mjs`, Git-Blob `fbdbc9d1e0dd96e402602454828d7b69ab169576`.
- Frisch gelesene `AGENTS.md`: Git-Blob `5b907b6f18cebf82784afbae89b63983a788a600`.
- Zusätzlich beachtet: Shopify-Skill v1.17.1 und die bereits gelesene Repository-Regel `shop-messen-nicht-raten`.
- Patchbasis ist das unveränderte lokale r2-Paket unter `selected-four-20261029/integration/after`, nicht direkt main. Dieses Delta setzt r1/r2 voraus.
