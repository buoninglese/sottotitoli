import re

with open('/Users/sebastiankrauwel/Desktop/sottotitoli/studio.html', 'r') as f:
    lines = f.readlines()

print("=== Caption grid links ===")
for i, line in enumerate(lines):
    if 'captionGrid' in line or 'lang-btn' in line and ('caption-en' in line or 'caption-it' in line or 'caption-fr' in line or 'caption-de' in line or 'caption-es' in line or 'caption-pt' in line or 'caption-nl' in line or 'caption-pl' in line):
        print(f"{i}: {line.rstrip()}")

print("\n=== Quick pair chips ===")
for i, line in enumerate(lines):
    if 'pair-chip' in line and 'translate-' in line:
        print(f"{i}: {line.rstrip()}")

print("\n=== URL line in router script ===")
for i, line in enumerate(lines):
    if 'new URL' in line:
        print(f"{i}: {line.rstrip()}")
