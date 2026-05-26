#!/usr/bin/env python3
with open('/Users/sebastiankrauwel/Desktop/sottotitoli/studio.html', 'r') as f:
    lines = f.readlines()
print(f"Total lines: {len(lines)}")
# Print structure
for i, line in enumerate(lines):
    stripped = line.strip()
    if any(x in stripped for x in ['tab-panel', 'tab-btn', 'analysisRoot', 'progressRoot', 'panels = {', 'tabReport', 'tabSession', 'tabTranslate', 'tabCaption', 'tabAnalysis', 'tabProgress']):
        print(f"Line {i+1}: {stripped[:160]}")

