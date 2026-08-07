#!/bin/zsh
# phone-disconnect.sh — Disconnect ADB from all devices
# Usage: ./scripts/phone-disconnect.sh

echo "🔌 Disconnecting all ADB devices..."
adb disconnect 2>&1
echo "✅ Done."
