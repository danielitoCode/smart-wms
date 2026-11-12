#!/usr/bin/env python3
"""Same-origin lab proxy for admin SPA verification against the twin.

  Browser  ->  http://127.0.0.1:3080/
                 /api/*  ->  WMS_TWIN_BASE (default http://127.0.0.1:5001)
                 /*      ->  ADMIN_DEV   (default http://127.0.0.1:3000)

Does not modify the frontend. Point Vite at any upstream via this proxy:
  1) start twin:  ./scripts/start-lab.sh
  2) start admin: cd admin && npm run dev -- --host 127.0.0.1 --port 3000
     (vite still proxies to api:5000 inside docker; for local, run admin
      through this proxy so /api hits the twin on 5001)
  3) open http://127.0.0.1:3080/

If admin vite cannot be reconfigured, build is optional; API checks still work
via admin-e2e-cookie.sh.
"""
from __future__ import annotations

import http.client
import http.server
import os
import sys
import urllib.parse

TWIN = os.environ.get("WMS_TWIN_BASE", "http://127.0.0.1:5001").rstrip("/")
ADMIN = os.environ.get("ADMIN_DEV", "http://127.0.0.1:3000").rstrip("/")
LISTEN = int(os.environ.get("ADMIN_LAB_PORT", "3080"))


def split(url: str):
    u = urllib.parse.urlparse(url)
    return u.hostname or "127.0.0.1", u.port or (443 if u.scheme == "https" else 80), u.scheme


class Handler(http.server.BaseHTTPRequestHandler):
    def _proxy(self, target_base: str):
        host, port, scheme = split(target_base)
        path = self.path
        body = None
        if self.command in ("POST", "PUT", "PATCH", "DELETE"):
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else None
        conn_cls = http.client.HTTPSConnection if scheme == "https" else http.client.HTTPConnection
        conn = conn_cls(host, port, timeout=60)
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length")}
        headers["Host"] = f"{host}:{port}"
        try:
            conn.request(self.command, path, body=body, headers=headers)
            resp = conn.getresponse()
            data = resp.read()
            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() in ("transfer-encoding", "connection"):
                    continue
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
        except Exception as exc:
            msg = f"proxy error: {exc}\n".encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
        finally:
            conn.close()

    def do_GET(self):
        self._dispatch()

    def do_POST(self):
        self._dispatch()

    def do_PUT(self):
        self._dispatch()

    def do_PATCH(self):
        self._dispatch()

    def do_DELETE(self):
        self._dispatch()

    def do_OPTIONS(self):
        self._dispatch()

    def do_HEAD(self):
        self._dispatch()

    def _dispatch(self):
        if self.path.startswith("/api"):
            self._proxy(TWIN)
        else:
            self._proxy(ADMIN)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    print(f"Admin lab proxy on http://127.0.0.1:{LISTEN}", flush=True)
    print(f"  /api  -> {TWIN}", flush=True)
    print(f"  /     -> {ADMIN}", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", LISTEN), Handler).serve_forever()
