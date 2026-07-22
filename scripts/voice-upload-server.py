#!/usr/bin/env python3
"""Tiny upload server for voice samples. Saves to tmp/voice-samples/."""
import http.server, os, sys, re

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tmp', 'voice-samples')
os.makedirs(UPLOAD_DIR, exist_ok=True)

def parse_multipart(data, boundary):
    """Parse multipart/form-data and return {field_name: (filename, content_bytes)}."""
    boundary_bytes = ('--' + boundary).encode()
    parts = data.split(boundary_bytes)
    result = {}
    for part in parts:
        if not part or part == b'--\r\n' or part == b'--':
            continue
        # Strip leading \r\n and trailing \r\n
        part = part.lstrip(b'\r\n').rstrip(b'\r\n--')
        if not part:
            continue
        # Split headers and body
        header_end = part.find(b'\r\n\r\n')
        if header_end == -1:
            continue
        headers_raw = part[:header_end].decode('utf-8', errors='replace')
        body = part[header_end + 4:]
        # Extract field name from Content-Disposition
        name_match = re.search(r'name="([^"]*)"', headers_raw)
        filename_match = re.search(r'filename="([^"]*)"', headers_raw)
        if name_match:
            field_name = name_match.group(1)
            filename = filename_match.group(1) if filename_match else None
            result[field_name] = (filename, body)
    return result

class UploadHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_POST(self):
        content_type = self.headers.get('Content-Type', '')
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')

        if 'multipart/form-data' in content_type:
            # Extract boundary
            boundary_match = re.search(r'boundary=([^;]+)', content_type)
            if boundary_match:
                boundary = boundary_match.group(1).strip()
                content_length = int(self.headers.get('Content-Length', 0))
                data = self.rfile.read(content_length)
                fields = parse_multipart(data, boundary)
                file_info = fields.get('audio')
                if file_info and file_info[0]:
                    filename = os.path.basename(file_info[0])
                    filepath = os.path.join(UPLOAD_DIR, filename)
                    with open(filepath, 'wb') as f:
                        f.write(file_info[1])
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(f'{{"ok":true,"path":"tmp/voice-samples/{filename}"}}'.encode())
                    print(f'Saved: {filepath}')
                    return

        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":false,"error":"No file uploaded"}')

    def log_message(self, fmt, *args):
        pass  # quiet

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8768
    print(f'Voice upload server: http://localhost:{port}/upload')
    print(f'  Saving to: {UPLOAD_DIR}')
    http.server.HTTPServer(('', port), UploadHandler).serve_forever()
