import tempfile, unittest
from pathlib import Path
from prismatec.adapters.sqlite_event_store import SQLiteEventStore
from prismatec.mind.rules import evaluate
from prismatec.runtime import WMSNodeRuntime
from prismatec.contracts import NodeIdentity

class GenesisPortsTests(unittest.TestCase):
    def test_event_journal_is_durable_idempotent_and_verifiable(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "node" / "events.db")
            store = SQLiteEventStore(path)
            event = {"event_id":"evt-1", "event_type":"inventory.adjusted", "aggregate_type":"inventory", "aggregate_id":"sku-1", "payload":{"delta":2}}
            first = store.append(event)
            second = store.append(event)
            self.assertEqual(first.record_hash, second.record_hash)
            self.assertTrue(store.verify())
            reopened = SQLiteEventStore(path)
            self.assertEqual(len(reopened.read_after(0)), 1)

    def test_rule_engine_preserves_unknown_and_never_authorizes(self):
        result = evaluate([{"id":"r1","fact":"stock_ok","equals":True}], {})
        self.assertEqual(result["conclusion"], "unknown")
        self.assertFalse(result["authorized"])

    def test_runtime_reports_distinct_identity_fields(self):
        runtime = WMSNodeRuntime(NodeIdentity("node-a", "peer-a", "bafy-root"), SQLiteEventStore(":memory:"))
        caps = runtime.capabilities()
        self.assertEqual(caps["node_id"], "node-a")
        self.assertEqual(caps["peer_id"], "peer-a")
        self.assertEqual(caps["root_cid"], "bafy-root")

if __name__ == "__main__": unittest.main()
