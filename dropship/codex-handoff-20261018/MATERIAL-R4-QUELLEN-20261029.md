# Material r4: API und Nachherprüfung

Offizielle Quellen wurden am 29.10.2026, 06:18–06:20 UTC, gezielt gelesen. Keine Shopdaten, Tokens oder Mutationen wurden dafür abgerufen.

Die Zielversion wird ausdrücklich von 2025-01 auf **2026-10** geändert. Die aufgerufenen 2026-10-Seiten kanonisieren auf `latest`, zeigen dort aber ausdrücklich Version 2026-10. Der native Schema-Helfer bestätigt die benötigten aktuellen Felder, bietet jedoch keinen Versionsparameter. Der gesonderte Codeblock-Validator meldete erneut «GraphQL validation skipped»; ein Compiler-/Live-Erfolg wird deshalb nicht behauptet.

| Oberfläche | Nachweis |
|---|---|
| `currentBulkOperation(type: QUERY)` | [2026-10-Dokumentation](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/currentBulkOperation): noch vorhanden, deprecated; Argument `type: BulkOperationType`, Default QUERY. Bezeichnet die jüngste Operation der App. Nur die bestehende Vorabprüfung bleibt darauf bestehen. |
| Parallele Bulk-Queries | [Bulk-Guide](https://shopify.dev/docs/apps/build/apis/graphql-admin/bulk-operations/queries#limitations): ab 2026-01 bis zu fünf gleichzeitig je App/Shop. Polling muss daher an die gestartete ID gebunden sein. |
| `bulkOperation(id:)` | Derselbe Guide empfiehlt Polling nach ID; Schema bestätigt `bulkOperation(id: ID!): BulkOperation`. Der Runner verlangt dieselbe ID auch in der Antwort. |
| `bulkOperationRunQuery` | [2026-10-Dokumentation](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/bulkOperationRunQuery): `query: String!`; `groupObjects: Boolean!` mit Default false. Rückgabe: `bulkOperation`, `userErrors`. Der Start erhält genau einen Versuch. |
| Material | [Metafield 2026-10](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Metafield): `value`, `type`, `compareDigest` sind `String!`; aktuelle Schemaabfrage bestätigt dies. Nach dem Schreiben werden Wert und Typ gemeinsam geprüft. |
| Knoten | [nodes 2026-10](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/nodes): `nodes(ids: [ID!]!): [Node]!`; einzelne Knoten können fehlen. Die r3-Sperren bleiben bestehen. |
| Material setzen | [metafieldsSet 2026-10](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet): atomar, maximal 25 Einträge; CAS mit explizitem null nur für belegte Abwesenheit. |
| Authentifizierung | [Client-Credentials-Grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#client-credentials-grant): unversionierter POST `/admin/oauth/access_token`, App und Shop derselben Organisation vorausgesetzt. GraphQL-Versionsheader wird nicht am OAuth-Endpunkt verlangt. Tatsächlicher App-Grant/Bulk-Zugriff wurde nicht live geprüft. |

`X-Shopify-API-Version` muss im LIVE-Pfad weiterhin exakt der angeforderten Version entsprechen. Ein Fallback oder fehlender Header blockiert vor Produktmutationen. Die richtige Version ist keine Identitäts-, Quellen- oder Schreibfreigabe.

Frisch aus main gelesen: `automation/material_nachtragen.mjs` Git-Blob `fbdbc9d1e0dd96e402602454828d7b69ab169576`, `AGENTS.md` Git-Blob `5b907b6f18cebf82784afbae89b63983a788a600`; gegenüber der letzten Gegenprobe unverändert. Lokale Patchbasis ist r3, nicht direkt main. Allgemeine Shopify-Helfer bleiben unverändert.
