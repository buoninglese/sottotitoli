#!/bin/zsh
# phone-connect.sh — Auto-connect ADB to Samsung Galaxy A14 on iPhone hotspot LAN
# Usage: ./scripts/phone-connect.sh

set -e

HOTSPOT_NET="172.20.10"
PHONE_MODEL="SM-A146P"

echo "🔍 Scanning $HOTSPOT_NET.0/24 for Samsung Galaxy A14..."

# Try known IPs first (hotspot DHCP usually assigns .2 or .3)
for i in 2 3 4 5 6 7 8 9 10; do
    IP="${HOTSPOT_NET}.${i}"
    if timeout 2 bash -c "echo >/dev/tcp/$IP/41923" 2>/dev/null; then
        echo "📱 Found device at $IP:41923, connecting..."
        adb connect "$IP:41923" 2>&1
        if adb -s "$IP:41923" shell getprop ro.product.model 2>/dev/null | grep -q "$PHONE_MODEL"; then
            echo "✅ Connected to $PHONE_MODEL at $IP:41923"
            exit 0
        fi
    fi
done

# Fallback: try adb mdns
echo "🔍 Trying mDNS discovery..."
adb mdns discover 2>/dev/null || true
sleep 2

echo "⚠️  Phone not found on $HOTSPOT_NET.0/24. Is the iPhone hotspot on? Is the phone connected?"
exit 1
