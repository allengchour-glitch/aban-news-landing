> Preservation note: This specification describes local preparation before the R227 documentation commit. The later documentation save does not change production source or initialize any checkpoint. Source snapshots remain hash-pinned local artifacts; test logs and source manifest are embedded in [shared evidence](PRINTFUL-DATEI-GUARD-20261115-R227.json).

# Printful Ready/CAS and legacy-ID preflight spec (R227)

Status: local design plus a bounded review patch candidate. Only files under this scratch directory changed; Core4, the production source tree, and GitHub remain untouched. No checkpoint was initialized, no order was migrated, no provider call was made, and no production run is authorized.

## Source pin and scope

- R227 Core4 working head: `7c009bd506bbc9b09b82383f00c4355ed9cec78f`.
- Fresh GitHub `main` ref read: `00bf41c9ab69aefd3dc297aa9607fe91880d5f78`.
- GitHub compare `9a03e4f00e5531b089388bfb88a265d1566e8f12...00bf41c9ab69aefd3dc297aa9607fe91880d5f78` returned one changed path, `dropship/cj_varianten_ledger.txt`. None of the six pinned Printful/workflow/package files changed. The exact source blobs from `9a03e4f` therefore remain the exact blobs at fresh `main`.
- Raw source snapshot and SHA-256/Git blob evidence: [`PRINTFUL-DATEI-GUARD-20261115-R227.json`](PRINTFUL-DATEI-GUARD-20261115-R227.json). The six source files are staged under `source/`.
- R225 boundary: `/dev/shm/luxestyle-review/r225/printful-review/rebase-boundary-r225.json`. Its stop conditions remain in force: no old-helper rebase, no checkpoint/register initialization, no migration, no workflow start, no production write.

## Current external behavior to preserve

1. **Provider identity stays the existing LX form.** `externalId(name,id)` in `automation/lib/printful_bestellweg.mjs:377–390` yields `LX<sanitized order name>` for normal names such as `#1034 → LX1034`. When sanitization could collapse distinct names (for example `#1034-1` versus `#10341`), it adds `N<Shopify numeric order ID>` within Printful’s 32-character limit. The code uses the order name, not the historical candidate’s shop-hash/order-ID key. Do not switch key schemes in this work.
2. **Look up before create.** `automation/printful_sync.mjs:275–285` queries `GET /orders/@<external_id>` before planning or posting. An existing order is linked/marked and never recreated or auto-confirmed. Only a definitive 404 permits the create path; other lookup results fail closed.
3. **Draft and confirmation are separate.** The create call is `POST /orders` with `external_id`, recipient and planned items. It is followed by Shopify order-id/tag marking, then a Printful order read for design-file and cost checks, and only then a separate `POST /orders/<id>/confirm`; confirmation status is read back before `printful-confirmed` is set (`printful_sync.mjs:301–359`). Keep `PRINTFUL_AUTO_CONFIRM` and this ordering intact.
4. **Variant follows the purchased order line.** `skuWaehlen()` gives the line-item SKU priority and uses the variant SKU only as fallback; disagreement is reported (`printful_bestellweg.mjs:105–121, 490–501`). Preserve that source of identity when hashing a snapshot.
5. **Existing tests cover the earlier invariants; R227 adds the missing-file-list guard.** The original 181-case synthetic suite covers LX identity (`printful_sync_test.mjs:192–199, 528–534`), no duplicate on provider lookup (`320–352`), no confirmation after marking failures (`342–352`), and separate file/cost/confirm/status handling (`545–562` and adjacent cases). Independent R227 reproduction found that null/missing/empty `items`, missing/empty `files`, and preview-only files all returned `ok`; see `printful-independent-before-probe.json`. A separate three-file local patch candidate now adds four behavior assertions covering 17 fake-runner response shapes, including missing/null/empty provider items, malformed/empty/preview-only file evidence, including missing/empty/non-string status, and a partially missing provider item list. It retains the existing `printful-synced` draft marker and blocks both confirm and `printful-confirmed` on incomplete evidence.

## Ready scope and source-snapshot contract

`Ready` must mean a manually reviewed, finite allowlist; it must never mean “all matching Shopify orders” or be auto-created by the sync. Before an order can be entered as Ready, a read-only preparation must record and independently verify:

- exact Shopify shop GID and domain, Printful store ID, Shopify API version (`2026-01` in the pinned source), source revision, scope ID, exact Shopify order GIDs, and an explicit order-count limit;
- each order’s GID, visible order name, current `externalId(name,id)`, current status/financial/fulfillment/cancellation state, current Printful `order_id` metafield if present, and every existing `printful-synced`/`printful-review` marker;
- every order line, not a truncated prefix: line-item GID, purchased SKU, variant SKU, quantities (`quantity`, `currentQuantity`), product tags/type, print-file metafield, custom attributes, discounted totals/currency, and all values used by the planner; plus shipping price/currency and recipient fields used in the Printful request;
- complete line-item pagination and a stable canonical snapshot. Include the normalized request payload and decision inputs (such as `PRINTFUL_AUTO_CONFIRM`, minimum net CHF, and stitch-color options) in the intent digest. Store only digests, not customer address/email in review logs; use a keyed digest for payloads containing personal data.

The current query fetches at most 50 line items and only reads `hasNextPage` (`printful_sync.mjs:124–133`). It does not page the nested connection. The planner hard-blocks a line-item connection whose `hasNextPage` is true (`printful_bestellweg.mjs:466–472`), which is a safe stop, but it is not a complete snapshot. Until full pagination is implemented and tested, orders over that limit are **not Ready** and must remain blocked; never hash the first 50 as if complete.

Ready preparation must fail closed for a changed order, missing identity, incomplete page, cancelled/unpaid/fulfilled order, any unresolved line-SKU conflict that changes the selected variant, stale or mismatched Printful ID, existing review marker, or ambiguous provider lookup. A failed or unknown record cannot be promoted to Ready by the runner.

## Checkpoint/CAS contract (proposed, not an existing schema)

The current `ORDERS_Q` has no checkpoint fields or CAS predicate. The source uses `printful.order_id` and order tags but does not implement a claim or `compareDigest` (`printful_sync.mjs:124–135, 137–156`). Do not assume a metafield key, type, definition, CAS argument, or server behavior has been approved. Before implementation, verify the exact Shopify `2026-01` GraphQL schema and app grants for the chosen checkpoint representation and prove the conditional write using a synthetic isolated shop fixture or server validator; if a conditional write cannot be proven, stop.

A future checkpoint should be one atomic record per order, separate from the existing `printful.order_id`, and carry only:

- schema version and one of `Ready`, `Claimed`, `DraftCreated`, `ReviewPending`, `ConfirmRequested`, `Confirmed`, `Blocked`, or `Unknown`;
- exact shop/store/order identity, the unchanged LX `external_id`, approved scope ID, source digest, intent digest, claim nonce, and provider order ID once known;
- the CAS digest returned by the current read/write, with state transitions conditional on the exact digest read immediately before the write.

Required transition protocol:

1. Read a manually prepared `Ready` value plus its non-empty expected CAS digest. Re-read the complete Shopify snapshot; compare identity and intent digests. If any field differs, transition to `Blocked` by CAS if safe, and make no provider call.
2. Atomically claim `Ready → Claimed` using the exact expected digest. Check GraphQL errors and `userErrors`, read the checkpoint back, and require the same claim nonce/state/digests before any Printful POST. A mismatch, timeout, or unverified readback makes the result `Unknown`/blocked; never issue a second claim by unconditional overwrite.
3. Query Printful using the existing LX `external_id`. A matching existing order is recovered by its provider ID and is not recreated. Only an exact 404 permits continuing. Any timeout, 429, 5xx, malformed response, or identity disagreement prevents create.
4. Re-read Shopify and CAS claim state immediately before creating. Require the same full source/intent digest and exclusive claim. Create a Printful **draft** using `POST /orders` without confirm parameters.
5. If create succeeds, first record its provider order ID and current `printful.order_id`/`printful-synced` receipt, with checked errors and readback. If that Shopify write is uncertain, recover by querying the same LX `external_id`; do not post again. If provider lookup remains uncertain, keep the claim `Unknown` and require manual reconciliation.
6. Read the draft and require complete, matching file evidence and final costs before the separate confirm request. Confirm only when the reviewed digest still matches, no blocker remains, and the existing `PRINTFUL_AUTO_CONFIRM` gate is enabled. After the request, read status; set `Confirmed` only for the same accepted statuses as the existing code. Unknown response/status stays `Unknown`, never “confirmed”.

**Baseline file-evidence gap and candidate scope:** baseline `dateienStatus()` skipped preview/mockup files and returned `ok` when no eligible file entries existed (`printful_bestellweg.mjs:363–374`). The local patch candidate adds a required expected item count at the sync call site and requires each expected returned item to have an array file list with at least one entry whose provider `type` is a non-empty string and not `preview`/`mockup`, plus a non-empty string `status` for every such entry. It classifies missing/malformed evidence as `unvollstaendig`, which routes to a soft review finding rather than a claimed Printful rejection. It does not impose a type/placement mapping or claim the returned file list is complete: provider file-type/placement mapping and partial placements remain an unresolved API-response contract. The candidate is local only; no production-source change was made.

## Legacy-ID migration preflight

The November 1 helper candidate proposed an ID derived from shop hash plus Shopify numeric order ID. R225 found it does not identify the same provider orders as the current LX name-derived ID. It is not safe to adopt it as a replacement or to treat its absence as proof that no legacy order exists.

For any later, explicitly approved migration:

- Freeze an exact allowlist and snapshot it before migration. Do not scan/migrate all paid orders implicitly and do not auto-initialize Ready/checkpoint values.
- For each exact order GID, derive the current legacy LX ID with the current `externalId()` logic. Verify the existing Shopify `printful.order_id` against the Printful record and its `external_id`; disagreements, duplicate matches, missing provider records, or unexplained status are manual-review blockers.
- If a future ID scheme is separately approved, query both the old LX ID and proposed new ID for every scoped order before any create. If both resolve, resolve the collision manually. If either query is unknown, do not create. A broad `GET /orders?external_id=` is not a substitute; the pinned source records that Printful does not filter that query as expected and uses `/orders/@<id>` instead (`printful_sync.mjs:7, 278–281`).
- Reconcile every in-flight old workflow/local writer before enabling the claim path. The pinned GitHub workflow has a `printful-sync` concurrency group for that workflow (`.github/workflows/printful-sync.yml:33–35`), but this is not a cross-process/provider lock and does not fence a local or older writer. Disable/fence every path that ignores the checkpoint before Ready can be consumed.
- Produce a read-only reconciliation table containing order GID, legacy LX ID, provider ID/status or explicit 404, existing Shopify marker/metafield, snapshot digest, and disposition. A human reviews that table and explicitly initializes only selected records as Ready. Save evidence of the review; do not store order PII in public logs or repository artifacts.

## Bounded validation and outcome

- Fresh `main` checked via `gh api` and compared to the source pin: only the CJ ledger changed; all six staged blobs match their expected Git blob IDs.
- Baseline fake-fetch log: baseline log (saved in the shared test-evidence JSON), 181 ok / 0 errors on byte-matching R225 cached sync/helper source and test behavior (Node 24.22.1). Candidate fake-fetch log: candidate log (saved in the shared test-evidence JSON), 185 ok / 0 errors: the 181 prior checks plus four assertions. The candidate run used an ephemeral test copy that redirected only the two hard-coded `/tmp` summary paths to `/dev/shm`, because `/tmp` is full; the review patch itself does not change those paths. The 17 fake-runner shapes were all local and synthetic; no provider calls or real credentials were used.
- The first isolated run lacked the existing two Printful test fixtures and imports; these were then staged from the R225 cache solely for fake-fetch testing. Their hashes and provenance are recorded in `PRINTFUL-DATEI-GUARD-20261115-R227.json`; they are not patch files.
- Candidate diff: three existing files only, saved as [`PRINTFUL-DATEI-GUARD-20261115-R227.patch`](PRINTFUL-DATEI-GUARD-20261115-R227.patch). Before/after Git blob IDs, SHA-256 values, test logs, fixture/import hashes, and the fresh main ref comparison are in [`PRINTFUL-DATEI-GUARD-20261115-R227.json`](PRINTFUL-DATEI-GUARD-20261115-R227.json). This remains a local review candidate, not a production fix, migration, or readiness approval. No credentials, real order data, provider calls, migration, workflow start, install, remote write, merge, or deployment occurred.
