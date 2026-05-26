#!/usr/bin/env python3
import sys
with open('studio.html', 'r') as f:
    lines = f.readlines()
print(f"Total lines: {len(lines)}")
# Print structure
for i, line in enumerate(lines):
    stripped = line.strip()
    if any(x in stripped for x in ['tab-panel', 'id="tab', 'tab-btn', 'id="modeTitle', 'id="analysisRoot', 'id="progressRoot', 'panels = {', 'id="studioTabBar"']):
        print(f"Line {i+1}: {stripped[:120]}")
