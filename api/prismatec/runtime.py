"""Composition root for optional decentralized capabilities."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any
from .contracts import ContentAddressedStore, CoreGateway, EventStore, NodeIdentity, PeerTransport

@dataclass
class WMSNodeRuntime:
    """A node composes ports; no specific database or network is mandatory."""
    identity: NodeIdentity
    events: EventStore
    content: ContentAddressedStore | None = None
    transport: PeerTransport | None = None
    core: CoreGateway | None = None

    def capabilities(self) -> dict[str, Any]:
        core_state = "unconfigured"
        if self.core is not None:
            try:
                core_state = "available" if self.core.health().get("status") == "ok" else "degraded"
            except Exception:
                core_state = "unreachable"
        return {
            "node_id": self.identity.node_id,
            "peer_id": self.identity.peer_id,
            "root_cid": self.identity.root_cid,
            "event_store": type(self.events).__name__,
            "content_store": type(self.content).__name__ if self.content else "unconfigured",
            "peer_transport": type(self.transport).__name__ if self.transport else "unconfigured",
            "prismatec_core": core_state,
        }
