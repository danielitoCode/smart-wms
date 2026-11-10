"""HTTP adapter for the private Core service's versioned public API."""
from __future__ import annotations
import json, os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

class HttpCoreGateway:
    def __init__(self, base_url=None, token=None, timeout=5):
        self.base_url = (base_url or os.getenv("PRISMA_CORE_URL", "")).rstrip("/")
        self.token = token or os.getenv("PRISMA_CORE_TOKEN", "")
        self.timeout = timeout
        if not self.base_url:
            raise ValueError("PRISMA_CORE_URL is required for the HTTP Core adapter")

    def _request(self, method, path, body=None):
        data = None if body is None else json.dumps(body).encode()
        headers = {"Accept": "application/json"}
        if data is not None: headers["Content-Type"] = "application/json"
        if self.token: headers["Authorization"] = f"Bearer {self.token}"
        req = Request(self.base_url + path, data=data, headers=headers, method=method)
        try:
            with urlopen(req, timeout=self.timeout) as response:
                raw = response.read(1024 * 1024)
                return json.loads(raw) if raw else {}
        except (HTTPError, URLError, TimeoutError) as exc:
            raise RuntimeError(f"PrismaTEC-Core gateway request failed: {type(exc).__name__}") from exc

    def health(self): return self._request("GET", "/api/v1/health")
    def persist(self, namespace, key, value): return self._request("PUT", "/api/v1/wms/state", {"namespace": namespace, "key": key, "value": value})
    def evaluate(self, gene, facts): return self._request("POST", "/api/v1/mind/evaluate", {"gene": gene, "facts": facts})
