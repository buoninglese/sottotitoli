#!/bin/zsh
# start-all.sh — One-click launcher for all phone + laptop services
# Usage: double-click in Finder, or run from terminal: ./scripts/start-all.sh

echo "🚀 Starting all services..."

# 1. Connect ADB (try both old and new port)
echo -n "📱 ADB: "
adb connect 172.20.10.2:41923 2>/dev/null | grep -q "connected" && echo "✅" || { adb connect 172.20.10.2:5555 2>/dev/null | grep -q "connected" && echo "✅ (5555)" || echo "⚠️ Check phone: Settings → Wireless Debugging → ON"; }

# 2. Dev server (port 8000)
echo -n "🌐 Dev server: "
if curl -s http://localhost:8000/ >/dev/null 2>&1; then
    echo "✅ already running"
else
    cd /Users/sebastiankrauwel/sottotitoli
    python3 -m http.server 8000 > /dev/null 2>&1 &
    sleep 1
    curl -s http://localhost:8000/ >/dev/null 2>&1 && echo "✅ started" || echo "❌"
fi

# 3. ADB Bridge (port 8766)
echo -n "🔧 ADB Bridge: "
if curl -s http://localhost:8766/health >/dev/null 2>&1; then
    echo "✅ already running"
else
    python3 /Users/sebastiankrauwel/sottotitoli/scripts/adb-bridge.py > /dev/null 2>&1 &
    sleep 2
    curl -s http://localhost:8766/health >/dev/null 2>&1 && echo "✅ started" || echo "❌"
fi

# 4. Syncthing
echo -n "🔄 Syncthing: "
if curl -s http://localhost:8384/rest/system/status >/dev/null 2>&1; then
    echo "✅ already running"
else
    syncthing --no-browser --no-restart > /dev/null 2>&1 &
    sleep 3
    curl -s http://localhost:8384/rest/system/status >/dev/null 2>&1 && echo "✅ started" || echo "❌"
fi

echo ""
echo "=== PHONE CHECK ==="
echo -n "📱 Phone Bridge (8765): "
curl -s http://172.20.10.2:8765/health 2>/dev/null | python3 -c "import sys,json; print('✅', json.load(sys.stdin).get('bridge','?'))" 2>/dev/null || echo "⚠️ Run on phone: bash /sdcard/sottotitoli/keep-alive.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All services started!"
echo ""
echo "📊 Control Center: http://localhost:8000/dev/phone-control-center.html"
echo "📱 Phone Previews: http://localhost:8765/static/post-previews.html"
echo ""
echo "To stop everything: ./scripts/stop-all.sh"
