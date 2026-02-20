#!/usr/bin/env python3
"""
BowlGuard Local Server
Serves static files + proxies API calls to Anthropic (bypasses CORS).

API key is read from the ANTHROPIC_API_KEY environment variable.
Set it before running:  export ANTHROPIC_API_KEY=sk-ant-...
"""
import http.server
import json
import os
import time
import requests as req_lib

PORT = 8000

# ── API Key (from environment) ──────────────────────────────────────
API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# ── Rate Limiting ───────────────────────────────────────────────────
MAX_REQUESTS_PER_MINUTE = 10
_rate_store: dict[str, list[float]] = {}   # ip -> [timestamps]


def _is_rate_limited(ip: str) -> bool:
    """Return True if this IP has exceeded MAX_REQUESTS_PER_MINUTE."""
    now = time.time()
    timestamps = _rate_store.get(ip, [])
    # Keep only timestamps from the last 60 seconds
    timestamps = [t for t in timestamps if now - t < 60]
    _rate_store[ip] = timestamps

    if len(timestamps) >= MAX_REQUESTS_PER_MINUTE:
        return True

    timestamps.append(now)
    return False


class BowlGuardHandler(http.server.SimpleHTTPRequestHandler):

    def do_POST(self):
        if self.path == '/api/chat':
            self._proxy_anthropic()
        else:
            self.send_error(404)

    def _proxy_anthropic(self):
        # ── Check API key is configured ─────────────────────────────
        if not API_KEY:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'ANTHROPIC_API_KEY environment variable is not set. '
                         'Run: export ANTHROPIC_API_KEY=sk-ant-...'
            }).encode('utf-8'))
            return

        # ── Rate limiting ───────────────────────────────────────────
        client_ip = self.client_address[0]
        if _is_rate_limited(client_ip):
            self.send_response(429)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': f'Rate limit exceeded. Max {MAX_REQUESTS_PER_MINUTE} requests per minute.'
            }).encode('utf-8'))
            return

        # ── Forward request to Anthropic ────────────────────────────
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        payload = json.loads(body)

        # Remove api_key from payload if the frontend still sends it
        payload.pop('api_key', None)

        try:
            resp = req_lib.post(
                'https://api.anthropic.com/v1/messages',
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01',
                },
                timeout=30
            )

            self.send_response(resp.status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(resp.content)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        msg = args[0] if args else ''
        if '/api/' in msg:
            print(f'[API] {msg}')

if __name__ == '__main__':
    if not API_KEY:
        print('⚠️  WARNING: ANTHROPIC_API_KEY is not set.')
        print('   AI features will return an error until you set it:')
        print('   export ANTHROPIC_API_KEY=sk-ant-...\n')
    else:
        print(f'✓ API key loaded (ends with ...{API_KEY[-4:]})')

    server = http.server.HTTPServer(('', PORT), BowlGuardHandler)
    print(f'BowlGuard running at http://localhost:{PORT}')
    server.serve_forever()
