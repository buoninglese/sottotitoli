#!/bin/zsh
# stop-all.sh — Stop all phone + laptop services

echo "🛑 Stopping all services..."
pkill -f "http.server 8000" 2>/dev/null && echo "✅ Dev server stopped" || echo "⚠️ Dev server not running"
pkill -f adb-bridge.py 2>/dev/null && echo "✅ ADB Bridge stopped" || echo "⚠️ ADB Bridge not running"
pkill -f syncthing 2>/dev/null && echo "✅ Syncthing stopped" || echo "⚠️ Syncthing not running"
adb disconnect 2>/dev/null && echo "✅ ADB disconnected"
echo "Done."
