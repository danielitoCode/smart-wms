# PrismaTEC-Core boundary and WMS genesis

## Security boundary

`smart-wms` is a shared/public repository. It MUST NOT contain PrismaTEC-Core source, private packages, private schemas, implementation algorithms, signing keys, peer credentials, or deployment secrets. The Core is a separately deployed private service. This repository contains only the WMS-owned domain, public versioned wire contracts, ports, and replaceable adapters.

A Git submodule pointing to a private repository is not a source-code hiding mechanism: it exposes repository metadata and requires separate access control. Do not add the private Core as a submodule here. Do not ship its source in this repository's releases or container build context.

## Identity and content

- `node_id`: identity of this WMS node/participant.
- `peer_id`: libp2p network identity, assigned by the libp2p implementation.
- `root_cid`: CID of the canonical organism/manifest definition.

These values are not interchangeable. A CID identifies content; it does not authenticate its publisher or guarantee availability. A peer ID identifies a network peer; it does not prove business authority.

## Genesis capabilities

The WMS runtime depends on ports, not on PostgreSQL, IPFS, libp2p, or a private Core SDK. SQLite is supplied as a local durable event journal for standalone development and single-node operation. It is not a distributed database and does not make multi-writer inventory safe. A production deployment should bind the ports to the private Core and to dedicated IPFS/libp2p services.

Kademlia is discovery/routing, libp2p is peer transport, GossipSub distributes messages, and IPFS stores CID-addressed content. Event delivery is at-least-once; consumers must deduplicate by stable event ID. Network partition does not imply safe concurrent inventory writes.

## Inventory authority

Before enabling multi-writer operation, the deployment must define an authority lease per inventory partition (minimum: warehouse + item/lot), a monotonically increasing fencing token, idempotency keys, and conflict/reconciliation policy. A node with an expired fencing token MUST reject writes. Offline writes may be staged as proposals, but cannot be committed as authoritative stock mutations until authority is revalidated. Mind/Genes may produce evidence and recommendations; authorization remains a separate policy decision.

## Current implementation boundary

`api/prismatec/contracts.py` defines public ports. `SQLiteEventStore` is a durable local journal with a SHA-256 hash chain. A hash chain is tamper-evident only when its trusted head is anchored externally; it is not a digital signature. `HttpCoreGateway` is a versioned HTTP client contract adapter; the private Core endpoint contract must be agreed and implemented on the Core side before it can connect. The deterministic rule evaluator is advisory and always returns `authorized: false`.

## Compatibility strategy

Do not change existing `/api/*` route shapes, methods, payloads, authentication, status codes, or error envelopes without a versioned compatibility plan and contract tests against both `admin/` and `mobile/`. The legacy SQL-backed API remains the active execution path until each feature has a tested adapter migration. This initial boundary package is not a claim that PostgreSQL has already been removed from the legacy application.
