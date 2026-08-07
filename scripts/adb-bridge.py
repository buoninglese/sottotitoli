#!/usr/bin/env python3
"""
Local ADB Bridge — runs on laptop, wraps ADB commands the phone bridge can't do.
Port 8766. Called by phone-control-center.html for screenshots, app listing, etc.
"""

import json, subprocess, base64, os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = 8766
ADB = "adb"
PHONE = "172.20.10.2:41923"

def adb(cmd, timeout=15):
    """Run an ADB command and return result."""
    full = f"{ADB} -s {PHONE} {cmd}"
    try:
        r = subprocess.run(full, shell=True, capture_output=True, text=True, timeout=timeout)
        return {"ok": r.returncode == 0, "stdout": r.stdout.strip(), "stderr": r.stderr.strip(), "code": r.returncode}
    except subprocess.TimeoutExpired:
        return {"ok": False, "stdout": "", "stderr": "timeout", "code": -1}
    except Exception as e:
        return {"ok": False, "stdout": "", "stderr": str(e), "code": -1}

def adb_binary(cmd, timeout=15):
    """Run an ADB command that returns binary data."""
    full = f"{ADB} -s {PHONE} {cmd}"
    try:
        r = subprocess.run(full, shell=True, capture_output=True, timeout=timeout)
        return r.stdout
    except:
        return b""

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send(self, data, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if isinstance(data, dict):
            self.wfile.write(json.dumps(data).encode())
        else:
            self.wfile.write(data)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length))

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/health":
            self._send({"status": "ok", "role": "laptop-adb-bridge", "port": PORT})
        elif path == "/screenshot":
            data = adb_binary("exec-out screencap -p")
            if data:
                self._send(data, 200, "image/png")
            else:
                self._send({"error": "screencap failed"}, 500)
        elif path == "/apps":
            result = adb("shell pm list packages")
            self._send(result)
        elif path == "/device":
            result = adb("shell getprop ro.product.model")
            self._send({"model": result["stdout"], **result})
        else:
            self._send({"error": "not found", "endpoints": ["/health","/screenshot","/apps","/device"]}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        body = self._read_body()

        if path == "/shell":
            cmd = body.get("command", "echo no command")
            result = adb(f"shell {cmd}")
            self._send(result)
        elif path == "/install":
            apk = body.get("apk_path", "")
            result = adb(f"install {apk}")
            self._send(result)
        elif path == "/tap":
            x, y = body.get("x", 0), body.get("y", 0)
            result = adb(f"shell input tap {x} {y}")
            self._send(result)
        elif path == "/text":
            text = body.get("text", "")
            result = adb(f"shell input text '{text}'")
            self._send(result)
        elif path == "/keyevent":
            key = body.get("key", "HOME")
            result = adb(f"shell input keyevent {key}")
            self._send(result)
        elif path == "/apps/launch":
            pkg = body.get("package", "")
            result = adb(f"shell monkey -p {pkg} -c android.intent.category.LAUNCHER 1")
            self._send(result)
        else:
            self._send({"error": "not found"}, 404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    print(f"🔗 ADB Bridge starting on port {PORT}...")
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"✅ Ready: http://localhost:{PORT}/health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down.")
        server.server_close()
