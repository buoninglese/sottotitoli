import re

with open('/Users/sebastiankrauwel/Desktop/sottotitoli/studio.html', 'r') as f:
    content = f.read()

lines = content.split('\n')

print("=== Lines containing 'studio.html' ===")
for i, line in enumerate(lines):
    if 'studio.html' in line:
        print(f"  Line {i}: {line.strip()}")

print("\n=== Lines containing 'app.html' ===")
for i, line in enumerate(lines):
    if 'app.html' in line:
        print(f"  Line {i}: {line.strip()}")

print("\n=== Lines containing 'new URL' ===")
for i, line in enumerate(lines):
    if 'new URL' in line:
        print(f"  Line {i}: {line.strip()}")
