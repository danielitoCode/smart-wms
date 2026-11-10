"""Small durable local event journal; not a distributed transaction manager."""
from __future__ import annotations
import hashlib, json, sqlite3, uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping
from ..contracts import EventRecord

GENESIS = "0" * 64

class SQLiteEventStore:
    def __init__(self, path: str):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("PRAGMA synchronous=FULL")
            db.execute("CREATE TABLE IF NOT EXISTS wms_events (seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL UNIQUE, event_type TEXT NOT NULL, aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL, occurred_at TEXT NOT NULL, payload TEXT NOT NULL, previous_hash TEXT NOT NULL, record_hash TEXT NOT NULL UNIQUE)")

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level="IMMEDIATE")
        db.row_factory = sqlite3.Row
        return db

    @staticmethod
    def _canonical(value: Mapping[str, Any]) -> str:
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

    def append(self, event: Mapping[str, Any]) -> EventRecord:
        required = ("event_type", "aggregate_type", "aggregate_id", "payload")
        if any(k not in event for k in required):
            raise ValueError("event requires event_type, aggregate_type, aggregate_id and payload")
        if not isinstance(event["payload"], Mapping):
            raise ValueError("event payload must be an object")
        event_id = str(event.get("event_id") or uuid.uuid4())
        occurred = str(event.get("occurred_at") or datetime.now(timezone.utc).isoformat())
        with self._connect() as db:
            existing = db.execute("SELECT * FROM wms_events WHERE event_id=?", (event_id,)).fetchone()
            if existing:
                return self._record(existing)
            tail = db.execute("SELECT record_hash FROM wms_events ORDER BY seq DESC LIMIT 1").fetchone()
            previous = tail[0] if tail else GENESIS
            body = {"event_id": event_id, "event_type": str(event["event_type"]), "aggregate_type": str(event["aggregate_type"]), "aggregate_id": str(event["aggregate_id"]), "occurred_at": occurred, "payload": event["payload"]}
            digest = hashlib.sha256((previous + self._canonical(body)).encode("utf-8")).hexdigest()
            db.execute("INSERT INTO wms_events(event_id,event_type,aggregate_type,aggregate_id,occurred_at,payload,previous_hash,record_hash) VALUES(?,?,?,?,?,?,?,?)", (event_id, body["event_type"], body["aggregate_type"], body["aggregate_id"], occurred, self._canonical(event["payload"]), previous, digest))
            row = db.execute("SELECT * FROM wms_events WHERE event_id=?", (event_id,)).fetchone()
            return self._record(row)

    @staticmethod
    def _record(row):
        return EventRecord(row["event_id"], row["event_type"], row["aggregate_type"], row["aggregate_id"], row["occurred_at"], json.loads(row["payload"]), row["previous_hash"], row["record_hash"])

    def read_after(self, cursor: int = 0, limit: int = 100):
        if cursor < 0 or not 1 <= limit <= 1000:
            raise ValueError("cursor must be non-negative and limit in [1,1000]")
        with self._connect() as db:
            rows = db.execute("SELECT * FROM wms_events WHERE seq>? ORDER BY seq LIMIT ?", (cursor, limit)).fetchall()
            return [self._record(row) for row in rows]

    def verify(self) -> bool:
        with self._connect() as db:
            rows = db.execute("SELECT * FROM wms_events ORDER BY seq").fetchall()
        previous = GENESIS
        for row in rows:
            body = {"event_id": row["event_id"], "event_type": row["event_type"], "aggregate_type": row["aggregate_type"], "aggregate_id": row["aggregate_id"], "occurred_at": row["occurred_at"], "payload": json.loads(row["payload"])}
            expected = hashlib.sha256((previous + self._canonical(body)).encode("utf-8")).hexdigest()
            if row["previous_hash"] != previous or row["record_hash"] != expected:
                return False
            previous = expected
        return True
