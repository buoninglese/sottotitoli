#!/usr/bin/env python3
"""
composio-bridge.py — Composio ↔ Phone Bridge Automation
Monitors Gmail for phone commands and executes via bridge API.

Pattern: Email "PHONE: [command]" → Bridge API → Phone executes

Usage: python3 composio-bridge.py
"""

import urllib.request, json, time, os

BRIDGE = "http://172.20.10.2:8765"
PHONE_EMAIL = "sebastianspersonalassistant@gmail.com"

def bridge(endpoint, method="GET", data=None):
    """Call phone bridge API."""
    url = f"{BRIDGE}/{endpoint}"
    req = urllib.request.Request(url, method=method)
    if data:
        req.data = json.dumps(data).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"error": str(e)}

def phone_exec(cmd):
    """Run a shell command on the phone."""
    return bridge("shell", "POST", {"command": cmd})

def phone_notify(title, msg):
    """Send notification to phone."""
    return bridge("notify", "POST", {"title": title, "content": msg})

def check_phone():
    """Quick health check."""
    h = bridge("health")
    b = bridge("device/battery")
    if b.get("ok"):
        bi = json.loads(b["stdout"])
        return f"📱 {h.get('bridge','?')} | 🔋 {bi['percentage']}% {bi['status']}"
    return f"📱 {h.get('bridge','?')}"

if __name__ == "__main__":
    print(f"🔗 Composio Bridge Monitor")
    print(f"   Phone: {BRIDGE}")
    print(f"   Status: {check_phone()}")
    print(f"   Email: {PHONE_EMAIL}")
    print(f"\nUsage examples:")
    print(f"  phone_exec('ls /sdcard/')")
    print(f"  phone_notify('Hello', 'From laptop')")
    print(f"\nSend email with subject 'PHONE: <command>' to trigger actions.")
