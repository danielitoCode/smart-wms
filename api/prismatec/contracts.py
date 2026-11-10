"""Public ports. No PrismaTEC-Core implementation details belong here."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

@dataclass(frozen=True)
class NodeIdentity:
    node_id: str
    peer_id: str | None = None
    root_cid: str | None = None

@dataclass(frozen=True)
class EventRecord:
    event_id: str
    event_type: str
    aggregate_type: str
    aggregate_id: str
    occurred_at: str
    payload: Mapping[str, Any]
    previous_hash: str
    record_hash: str

class EventStore(Protocol):
    def append(self, event: Mapping[str, Any]) -> EventRecord: ...
    def read_after(self, cursor: int, limit: int = 100) -> Sequence[EventRecord]: ...
    def verify(self) -> bool: ...

class ContentAddressedStore(Protocol):
    def put(self, content: bytes, filename: str | None = None) -> str: ...
    def get(self, cid: str) -> bytes: ...

class PeerTransport(Protocol):
    def publish(self, topic: str, message: Mapping[str, Any]) -> None: ...
    def peers(self) -> Sequence[str]: ...

class CoreGateway(Protocol):
    def health(self) -> Mapping[str, Any]: ...
    def persist(self, namespace: str, key: str, value: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def evaluate(self, gene: str, facts: Mapping[str, Any]) -> Mapping[str, Any]: ...
