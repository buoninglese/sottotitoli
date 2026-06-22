#!/usr/bin/env python3
"""Simple action logger for Sottotitoli mockups."""
import json, sys, os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'actions.log')

class Logger(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode()
        data = json.loads(body)
        
        entry = {
            'action': data.get('action', '?'),
            'card': data.get('card', '?'),
            'page': data.get('page', '?'),
        }
        
        with open(LOG_FILE, 'a') as f:
            f.write(json.dumps(entry) + '\n')
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, format, *args):
        pass  # silence

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    print(f'Action logger on port {port} -> {LOG_FILE}')
    HTTPServer(('', port), Logger).serve_forever()
