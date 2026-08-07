# 📱 Phone Commands — Quick Reference

## Start Everything
```bash
./scripts/start-all.sh
```

## Stop Everything
```bash
./scripts/stop-all.sh
```

## Control Center (laptop browser)
```
http://localhost:8000/dev/phone-control-center.html
```

## Post Previews (phone browser)
```
localhost:8765/static/post-previews.html
```

## Phone Dashboard (phone browser)
```
localhost:8765/static/phone-dashboard.html
```

---

## Phone Commands (Termux on Samsung)
```bash
bash /sdcard/sottotitoli/keep-alive.sh     # Start bridge + syncthing
python3 /sdcard/sottotitoli/bridge-server.py  # Bridge only
syncthing --no-browser &                   # Sync only
```

## Laptop Status Checks
```bash
curl -s http://172.20.10.2:8765/health    # Phone bridge status
curl -s http://localhost:8766/health       # Laptop ADB bridge status
adb devices                                 # ADB connection status
```

## Generate Post Previews
Edit `sottotitoli-mobile/post-previews.html` → posts array → syncs to phone.
Screenshot via control center → Actions tab → 📸 Screenshot.
