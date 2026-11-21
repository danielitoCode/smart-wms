# R7 — Returns, RMA and Refunds Audit

**Scope:** SvelteKit frontend only (webapp/, branch svelte-webapp).  
**Traceability:** F3.5 Returns, F3.6 RMA, F3.7 Refunds, Inventory, Orders, Audit.  
**Status:** FRONTEND_IMPLEMENTATION_IN_PROGRESS / BLOCKED_BACKEND.  
**Backend changes:** none. Flask/Python was inspected as the source of truth and was not modified.

## 1. Verified Flask contracts

| Operation | Contract | Server behavior | Frontend status |
|---|---|---|---|
| Find original sale | GET /api/admin/sales-orders?order_type=sale&status=SHIPPED | Sales Orders page permission; listing applies warehouse scope | Supported |
| Original sale detail | GET /api/admin/sales-orders/{id} | Sales Orders/Fraud permission; warehouse-scoped | Supported |
| Family / prior RMA lookup | GET /api/admin/sales-orders/{id}/related | Sales Orders permission; no warehouse scope in route/query | Admin-only call |
| Create RMA | POST /api/admin/sales-orders/{saleId}/create-rma | Sales Orders page permission; locks original sale and source lines; validates item/line relationship and requested qty against shipped qty minus non-voided RMA authorizations | Supported, Admin-only in UI due missing server warehouse scope |
| RMA detail | GET /api/admin/sales-orders/{rmaId} | Sales Orders/Fraud permission; warehouse-scoped | Supported |
| Receipt history | GET /api/admin/sales-orders/{rmaId}/return-receipts | Sales Orders permission; no warehouse scope | Admin-only call |
| Receive physical return | POST /api/admin/sales-orders/{rmaId}/receive-return | Sales Orders page permission; locks RMA/line; checks remaining expected qty; validates bin belongs to supplied warehouse; inserts item_receipts, increments inventory, advances status, writes audit and emits return.received | Supported, Admin-only in UI due missing server warehouse scope |
| Void RMA | POST /api/admin/sales-orders/{rmaId}/void-return | ADMIN-only; only OPEN, no receipts and no linked refund; row lock, idempotent soft void, audit | Supported, Admin-only |
| Edit memo | PATCH /api/admin/sales-orders/{id}/memo | Fraud page permission and warehouse scope | Only when Fraud grant or ADMIN |
| List refund credit memos | GET /api/admin/sales-orders?order_type=refund | Sales Orders/Fraud permission; listing applies warehouse scope | Supported, read-only |
| Refund detail | GET /api/admin/sales-orders/{refundId} | Sales Orders/Fraud permission; warehouse-scoped | Supported, read-only |
| Refund family | GET /api/admin/sales-orders/{refundId}/related | Sales Orders permission; no warehouse scope | Admin-only call |
| Execute refund | POST /api/v1/pos/refund | POS token (X-WMS-Token, pos.dispatch), 90-day window, tender lock, idempotency, DB locks, negative credit-memo SO/lines, inventory increment, POS audit | NOT_SUPPORTED from admin session |

## 2. RMA quantity and state rules

- RMA creation accepts non-empty lines with positive integer item_id, quantity and original_so_line_id.
- The service locks the original sale and original sales-order lines. It verifies the original is a sale, each source line belongs to that sale and the item matches.
- Remaining authorization is calculated as quantity_shipped - SUM(quantity_ordered on non-voided child return lines). This server-side check is serialized by the original sale lock.
- RMA states observed in service/DTO: OPEN, PARTIALLY_RECEIVED, RECEIVED.
- Receipt validates quantity <= quantity_ordered - quantity_received, verifies bin/warehouse consistency and can replay safely when a stable idempotency key is supplied.
- Receipt transaction creates an item_receipts row and immediately increments inventory. It is not a neutral receipt awaiting classification.
- Void is soft-delete only; it refuses non-OPEN RMAs, RMAs with receipts, and RMAs linked to a refund.

## 3. Material backend gaps / safety blockers

1. **Warehouse isolation is missing** from create-rma, receive-return, return-receipts and related. The frontend therefore limits these paths/reads to ADMIN rather than pretending page grants provide warehouse isolation. List/detail reads remain available through their scoped endpoints.
2. **Receive does not reject voided RMAs** in the service lookup; it filters by order_type='return' but not voided_at IS NULL. A direct request may receive against a voided RMA. Frontend hides voided records, but this is not a server guarantee.
3. **Receive identifies a line by item_id, not so_line_id**. If an RMA contains two source lines for the same item, the service selects one matching line with fetchone(). The frontend policy blocks duplicate item IDs in one RMA until Flask exposes line-specific receipt identity.
4. **Idempotency key is optional in Flask.** The Svelte client always sends a stable UUID per in-flight line operation and retains it when a response is uncertain; external clients can still omit it.
5. **Disposition/classification is not modeled.** There is no condition enum, quarantine/discard decision, or separate inventory disposition endpoint. The chosen destination bin is only a location. receive-return always increments inventory.
6. **No independent RMA approval endpoint/state** exists. Creating the RMA itself is the authorization. ApproveRMA is therefore NOT_SUPPORTED.
7. **No separate restock endpoint** exists. Restocking is inseparable from receive-return; a separate RestockReturn command is NOT_SUPPORTED.
8. **Create-RMA is not idempotent and does not write a dedicated creation audit row** in the inspected service path. A timeout after commit cannot be safely retried by the admin UI. The frontend blocks another create POST after any uncertain response for the mounted session; the operator must inspect the RMA list before retrying after reload.
9. **Refund and physical return are separate workflows with no direct line-level reconciliation.** POS refund also increments inventory in the original sale locations, while RMA receipt increments inventory in its selected destination bin. Issuing both for the same units can double-increment stock unless a future backend rule links/limits the two ledgers.
10. **Refund execution is POS-only.** The admin Svelte API client has no POS token/tender contract. It must not call or emulate the POS refund endpoint.
11. **Family endpoint scope:** related is used to calculate prior RMA authorizations and display siblings. It is called only for ADMIN until server-side warehouse scoping is added.

## 4. Frontend implementation in this R7 slice

- Added ReturnLifecycleContract and RefundLifecycleContract with explicit supported/unsupported capabilities and typed fail-closed errors.
- Added ReturnQuantityPolicy: positive integer quantities, valid source line/item, no duplicate source line, no duplicate item ID (because receive API is item-based), and no quantity above shipped less previously authorized.
- Added search for shipped original sales, calculation of already-authorized units from non-voided RMA family members and child detail, and the create-RMA UI.
- Create-RMA mutation sends original line IDs; Flask remains authoritative and serializes concurrent quantity authorization. Because the endpoint has no idempotency key, the UI blocks a second create after an uncertain response until the operator reloads and inspects the RMA list.
- Existing receive flow keeps idempotency key on uncertain failure and reloads RMA detail for reconciliation. Receipt history and unscoped family reads are restricted to ADMIN.
- Memo edit is enabled only for ADMIN or users with the fraud page grant, matching the actual PATCH route.
- Refunds remain read-only; family reconciliation is ADMIN-only because related lacks warehouse scope.
- GetRefund is supported. CreateRefund throws RefundCapabilityNotSupportedError before any request.
- ApproveRMA, ClassifyReturnedItem and separate RestockReturn throw ReturnCapabilityNotSupportedError; no fake mutations are exposed.

## 5. Required next backend work before integral R7 acceptance

- Apply warehouse scope to create/receive/receipt-history/related endpoints and enforce the target warehouse against the user's grants.
- Reject receipt against voided_at IS NOT NULL; include a conditional state transition in the locked transaction.
- Add so_line_id to receive request/response and validate that exact RMA line; enforce unique idempotency as mandatory.
- Add an explicit condition/disposition model (sellable/quarantine/damaged/discard) and inventory postings appropriate to each condition.
- Link return authorization/receipt quantities with POS refund quantities so physical stock cannot be incremented twice.
- Define whether approval is a separate workflow; if so, add endpoint/state and audit.
- Add PostgreSQL integration tests for concurrent create-RMA allowance, duplicate receipt/replay, receive-vs-void, repeated-item lines, cross-warehouse access, and refund-vs-return stock reconciliation.

## 6. Verification

CI has not yet been run for the current R7 implementation. Typecheck, build and all frontend suites must be checked on the final HEAD before marking the frontend slice complete. No backend tests are claimed here.
