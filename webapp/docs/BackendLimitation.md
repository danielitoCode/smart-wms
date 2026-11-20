# Backend limitations and alignment requirements — R3 Inventory

**Status:** Backend contract gap register for R3  
**Repository:** \`danielitoCode/smart-wms\`  
**Branch reviewed:** \`svelte-webapp\`  
**Frontend scope:** \`webapp/\` (SvelteKit)  
**Related documents:** [R3 Inventory audit](./R3-Inventory-Stock-Lookup-Adjustments-Audit.md), [Migration plan](./MigrationPlan.md)

## 1. Purpose and scope

This document records the Flask backend capabilities that are missing, incomplete, or insufficiently scoped for the SvelteKit R3 workflow: inventory lookup, stock by item/bin, adjustments, audit history, and inventory movements.

It is a contract-alignment register, not a proposal to hide backend gaps with frontend calculations. The frontend may enforce local guards and communicate unsupported capabilities, but it cannot replace server-side authorization, transactional validation, or an authoritative inventory ledger.

The findings below are based on the Flask routes and schemas inspected during the R3 review. They must be revalidated against the current Flask HEAD before implementation.

## 2. Existing backend capabilities (do not duplicate)

The following contracts were found and should be preserved by Svelte:

| Capability | Existing Flask contract | Current backend behavior |
|---|---|---|
| Inventory list | \`GET /api/admin/inventory\` | Supports pagination and filters including \`warehouse_id\`, \`item_id\`, \`bin_id\`, and \`q\`. Returns on-hand, allocated, available, committed-to-orders and lot fields. |
| Exact item barcode lookup | \`GET /api/lookup/item/<barcode>\` | Exact match against SKU, UPC or \`barcode_aliases\`; returns item identity and location rows. |
| Item text search | \`GET /api/lookup/item/search?q=\` | Searches SKU/name/UPC, limited to 50 results; does not search barcode aliases. |
| Bin barcode/code lookup | \`GET /api/lookup/bin/<barcode>\` | Finds by bin barcode/code, applies warehouse scope, returns bin and its inventory rows. Out-of-scope bins are not exposed (404). |
| Bin detail | \`GET /api/admin/bins/{bin_id}\` | Returns bin and inventory; applies warehouse scope. |
| Adjustment history | \`GET /api/admin/adjustments/list\` | Paginated history with filters and warehouse scope on adjustment/bin. |
| Pending adjustments | \`GET /api/admin/adjustments/pending\` | Paginated pending queue with warehouse scope. |
| Direct adjustment | \`POST /api/admin/adjustments/direct\` | Applies an adjustment immediately and transactionally; this is a commit endpoint, not a preview endpoint. |
| Adjustment review | \`POST /api/admin/adjustments/review\` | Approves/rejects pending adjustments with row locking, scope checks and conflict handling. |
| Audit log | \`GET /api/admin/audit-log\` | General audit query exists, but the inspected handler does not enforce warehouse scope. |

Svelte must continue using the actual DTOs, permissions, response envelopes and error behavior of these routes. It must not invent additional query parameters or assume fields that are absent.

## 3. Required backend changes

### BL-R3-01 — Enforce warehouse authorization on inventory listing

**Priority:** Critical  
**Classification:** Backend limitation / security boundary

The inspected \`GET /api/admin/inventory\` handler accepts a \`warehouse_id\` filter but does not explicitly apply the same per-user warehouse authorization enforcement used by scoped bin/lookup routes. A caller-controlled filter is not an authorization boundary.

**Required backend behavior**
- Resolve the caller's authorized warehouse scope on the server.
- Reject an explicitly requested warehouse outside that scope (403 or the established non-disclosure policy).
- Apply the scope to every inventory row before pagination and totals are calculated.
- Apply the same scope to all supported combinations of \`item_id\`, \`bin_id\`, \`q\`, and pagination.
- Ensure counts, pages and aggregate values cannot reveal rows from another warehouse.
- Include \`warehouse_id\` in each returned inventory row so the client can verify row context.
- Keep ADMIN/global access behavior explicit and covered by tests.

**Acceptance tests**
- User assigned to warehouse A cannot list rows from warehouse B by changing \`warehouse_id\).
- Search, item filter, bin filter, totals and pagination remain scoped.
- A mixed query cannot leak another warehouse's rows or counts.
- ADMIN behavior is tested separately.

**Frontend handling until fixed:** require a selected warehouse, send its ID, and reject stale/mismatched UI state. This is a usability guard only; it does not secure the API.

### BL-R3-02 — Make item lookup warehouse-aware

**Priority:** High  
**Classification:** Backend limitation / contract alignment

The exact item lookup returns item metadata and \`locations[]\`. For non-ADMIN users, locations are filtered to assigned warehouses, but the request does not accept the active warehouse and each location row does not identify its \`warehouse_id\`. The frontend therefore cannot reliably associate a returned location with the currently selected warehouse.

**Required backend behavior**
- Add an optional or required \`warehouse_id\` query parameter according to the authorization policy.
- Validate that the requested warehouse is within the caller's server-side scope.
- Filter \`locations[]\` by the validated warehouse.
- Include \`warehouse_id\` in every location row.
- Define behavior for an item that exists globally but has no stock/location in the selected warehouse (prefer a valid item result with an empty locations list, not a misleading cross-warehouse location).
- Keep global item identity distinct from warehouse-specific stock.

**Acceptance tests**
- Lookup in warehouse A returns only A locations and identifies them as A.
- Lookup in unauthorized warehouse B is rejected or concealed consistently.
- An item with stock in multiple warehouses returns only the requested warehouse's locations.
- Empty-location results are represented consistently.

**Frontend handling until fixed:** Svelte may use the lookup response to identify the item, then fetch stock using the selected warehouse and item ID. It must not display unscoped lookup locations as if they belong to the active warehouse.

### BL-R3-03 — Expose the complete stock-state model

**Priority:** Medium  
**Classification:** Backend limitation / data contract

The inspected inventory DTO exposes on-hand, allocated, available, committed-to-orders and lot. It does not separately expose staging, in-transit, blocked/damaged, quarantined or other operational states.

**Required backend behavior**
- Agree on the canonical stock-state vocabulary and definitions with the WMS domain.
- Return only states that are persisted and authoritative.
- Define whether staging is included in on-hand or represented separately.
- Define whether in-transit stock belongs to source, destination, or a separate transit location.
- Expose blocked/damaged/quarantined quantities separately if the backend tracks them.
- Define the exact relationship between on-hand, allocated, committed and available; do not let the frontend recompute a competing definition.
- Preserve lot/serial and bin dimensions where applicable.

**Acceptance tests**
- State totals reconcile with the authoritative inventory records.
- Transfers and receiving do not double-count stock between locations/states.
- Missing states are distinguishable from a real zero quantity.

**Frontend handling until fixed:** show only values supplied by Flask. Do not synthesize staging, transit or blocked quantities, and do not display an absent field as zero.

### BL-R3-04 — Provide an authoritative adjustment preview and safe commit contract

**Priority:** Critical  
**Classification:** Backend limitation

The existing \`POST /api/admin/adjustments/direct\` applies the adjustment immediately. Its schema accepts positive \`item_id\`, \`bin_id\`, \`warehouse_id\`, \`adjustment_type\` (\`ADD|REMOVE\`), integer \`quantity\` (1–1,000,000), and a required trimmed \`reason\` (maximum 500 characters).

The inspected handler validates item/bin/warehouse relationship and caller scope. REMOVE is constrained by unallocated stock. The transaction uses advisory/row locks, writes the adjustment, audit record and outbox event, and returns 201; insufficient removable quantity or a conflicting state can return 409.

However, there is no server-side preview endpoint and no preview token/version/precondition that binds a preview to a later commit. Calling the direct endpoint to “preview” would mutate inventory.

**Required backend behavior**
Provide a non-mutating preview operation that:
- Accepts item, bin, warehouse, adjustment type, quantity and reason (or validates reason at commit).
- Performs the same authorization, item/bin relationship, adjustment-policy and quantity checks as commit.
- Returns current authoritative quantities, proposed delta, resulting quantity, allocated/available constraints, and any validation warnings/errors.
- Returns a server-issued version/revision or opaque preview token bound to the relevant inventory state and request parameters.
- Does not write inventory, adjustment history, audit events or outbox events.

Provide a commit operation that:
- Requires the preview token/version and the same adjustment parameters.
- Revalidates all constraints inside the committing transaction; a preview must never reserve stock or bypass transaction-time validation.
- Rejects expired/stale previews and changed stock with a deterministic conflict response (409), including enough information for the client to refresh and preview again.
- Is idempotent or accepts an idempotency key to prevent duplicate submission after retries.
- Writes inventory, adjustment, audit and outbox records atomically.
- Returns the authoritative post-commit stock and adjustment identity.

**Acceptance tests**
- Preview has no side effects.
- A stock change between preview and commit causes 409 and no partial mutation.
- Concurrent REMOVE requests cannot make available stock negative or consume allocated stock.
- Replaying the same commit request cannot apply the delta twice.
- Unauthorized warehouse/item/bin combinations are rejected.
- Audit and outbox entries exist exactly once for a successful commit.

**Frontend handling until fixed:** keep direct adjustment execution disabled in Svelte. Do not present a client-side estimate as an authoritative preview. Preserve the existing history/review functionality where supported. The backend's transactional direct endpoint is not, by itself, a safe preview-confirm workflow.

### BL-R3-05 — Enforce warehouse scope on audit queries

**Priority:** Critical for scoped audit views  
**Classification:** Backend limitation / security boundary

The inspected \`GET /api/admin/audit-log\` supports filters such as action type, user, dates and item, and returns entries including \`warehouse_id\`. The handler inspected does not apply \`warehouse_scope_clause\` or otherwise enforce the caller's warehouse scope.

Returning a \`warehouse_id\` field is not equivalent to filtering access to that warehouse.

**Required backend behavior**
- Enforce warehouse scope server-side for users with limited warehouse assignments.
- Define behavior for events with no warehouse association and for events spanning multiple warehouses.
- Apply scope before pagination, totals and filtering.
- Prevent filtering by item/user/date from exposing entries outside the authorized scope.
- Keep global audit access behind an explicit global permission.
- Return a stable, documented response envelope and pagination contract.

**Acceptance tests**
- A user assigned to warehouse A cannot retrieve audit entries belonging only to B.
- Search/filter/count/page combinations do not leak B entries.
- Cross-warehouse events follow a documented visibility policy.
- Global audit access is separately permission-tested.

**Frontend handling until fixed:** do not use this endpoint as a warehouse-scoped R3 inventory audit feed for limited users. Do not attempt to secure it by filtering the returned rows in Svelte; unauthorized data would already have crossed the API boundary.

### BL-R3-06 — Expose a canonical inventory movement ledger

**Priority:** High  
**Classification:** Backend limitation / currently unsupported contract

No complete inventory-movements/ledger endpoint was found in the inspected Flask routes. Adjustment history is only one movement category and is not a complete ledger. The general audit log is not a substitute, and the current audit handler also lacks warehouse scope.

**Required backend behavior**
Provide a canonical read endpoint/use case for inventory movements with:
- Stable movement ID and event type.
- Item, SKU/reference, quantity and unit.
- Source and destination warehouse/bin where relevant.
- Lot/serial where relevant.
- Actor/system origin, reason/reference and timestamp.
- Related document/operation IDs (receipt, put-away, transfer, pick, shipment, return, adjustment, etc.).
- Clear signed-quantity semantics and event direction.
- Server-side warehouse authorization for both source and destination sides.
- Stable ordering and cursor-based pagination (or another documented non-duplicating pagination strategy).
- Explicit treatment of voids, reversals and corrections; never silently rewrite history.
- Filters by item, bin, warehouse, movement type and date range, with scope enforced before pagination.

**Acceptance tests**
- Each supported stock-changing workflow emits exactly the expected ledger event(s).
- Transfer source and destination legs reconcile without double-counting.
- Reversals/corrections preserve the original event and link the compensating event.
- Warehouse scope applies to both sides of cross-warehouse movements according to a documented policy.
- Pagination remains stable while new events are added.

**Frontend handling until fixed:** keep \`GetInventoryMovements\`/movement history unavailable or explicitly marked unsupported. Never reconstruct an official ledger from current stock snapshots, audit-log entries, or adjustment history.

### BL-R3-07 — Add barcode aliases to the general item search contract

**Priority:** Medium  
**Classification:** Backend limitation / search parity

The exact lookup route matches SKU, UPC and \`barcode_aliases\`, while \`GET /api/lookup/item/search?q=\` searches SKU/name/UPC and does not search aliases. This creates different results depending on whether the user scans an exact code or types the same value into general search.

**Required backend behavior**
- Decide and document whether general search should include barcode aliases.
- If included, search aliases using exact/prefix/substring semantics consistent with the product-search contract and apply the same authorization policy.
- Preserve the current result limit/pagination contract or introduce documented pagination.
- Avoid returning duplicate item rows when multiple aliases match the same item.

**Acceptance tests**
- An alias resolves consistently through exact lookup and general search according to the agreed behavior.
- Multiple matching aliases do not duplicate an item.
- Search remains scoped and bounded.

**Frontend handling until fixed:** use exact barcode lookup for scanned codes; do not claim the general text-search endpoint searches aliases.

## 4. Suggested implementation order

1. **Security first:** BL-R3-01 inventory warehouse enforcement and BL-R3-05 audit warehouse enforcement.
2. **Context correctness:** BL-R3-02 warehouse-aware item lookup and location identity.
3. **Adjustment integrity:** BL-R3-04 preview/versioned commit/idempotency.
4. **Operational history:** BL-R3-06 canonical movement ledger.
5. **Data completeness and parity:** BL-R3-03 stock-state vocabulary and BL-R3-07 barcode alias search parity.

The backend team should implement and test each contract before the Svelte data layer consumes it. Any API/schema change must be reflected in DTOs, mappers, repository ports, use cases, UI states and contract/integration tests.

## 5. R3 frontend integration rules while gaps remain

- Continue using the supported inventory, item lookup, bin lookup and adjustment-history/review contracts as they exist.
- Require an active authorized warehouse in the UI, but do not treat that guard as server-side authorization.
- Do not associate an item lookup location with the active warehouse unless the response identifies that warehouse or a subsequent scoped query establishes it.
- Show only stock fields returned by the server; absent states are “not provided”, not zero.
- Keep immediate direct-adjustment execution disabled until the preview/commit contract is implemented and verified.
- Do not expose the current unscoped audit endpoint as a warehouse-filtered audit view.
- Do not display a fabricated movement ledger.
- Treat 400/403/404/409 as meaningful contract outcomes; in particular, 409 requires refresh/re-preview rather than optimistic retry.
- Do not update stock optimistically. After a successful mutation, reload authoritative inventory and related views.

## 6. Definition of backend alignment for R3

R3 backend alignment is achieved only when:
- inventory listing and all derived counts are warehouse-scoped server-side;
- item lookup can return warehouse-identifiable locations for the requested authorized warehouse;
- stock-state semantics are explicit and complete for the states the product promises to display;
- adjustment preview is non-mutating and its token/version is enforced by an atomic, idempotent commit;
- audit queries enforce warehouse scope server-side;
- a complete, scoped and paginated inventory movement ledger exists;
- barcode alias behavior is consistent and documented.

Until then, the SvelteKit R3 implementation can be considered ready to proceed with documented backend limitations, but these unsupported capabilities must remain guarded and must not be represented as operationally complete.

## 7. Change boundary

This document records backend work required for alignment. **No Flask code, schema, migration, route, or backend test was changed as part of the R3 SvelteKit work.** Backend implementation should be tracked as a separate server-side task/phase, with its own migration, permission, concurrency and regression evidence.
