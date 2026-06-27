#!/usr/bin/env python3
"""Verify studio.html structure - run this directly"""
import os, sys

path = os.path.expanduser("~/Desktop/sottotitoli/studio.html")
with open(path) as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}\n")

checks = [
    ('data-tab="caption"', 'Caption tab button'),
    ('data-tab="translate"', 'Translate tab button'),
    ('data-tab="analysis"', 'Analysis tab button'),
    ('data-tab="progress"', 'Progress tab button'),
    ('id="tabCaption"', 'Caption panel'),
    ('id="tabTranslate"', 'Translate panel'),
    ('id="tabAnalysis"', 'Analysis panel'),
    ('id="tabProgress"', 'Progress panel'),
    ('analysisRoot', 'Analysis root div'),
    ('progressRoot', 'Progress root div'),
    ('family-tab', 'Family tabs'),
    ('module-card', 'Module cards'),
    ('progress-stat', 'Progress stat cards'),
    ('loadProgress', 'Progress JS function'),
    ('initAnalysis', 'Analysis JS init'),
    ('config.js', '✓ Config JS include'),
    ('session-utils.js', '✓ Session utils include'),
    ('app.js', '✗ app.js (should be gone)'),
    ('ws-publisher.js', '✗ WS publisher (should be gone)'),
    ('lesson-report.js', '✗ Lesson report (should be gone)'),
    ('translation-providers.js', '✗ Translation providers (should be gone)'),
    ('tabReport', '✗ Old tabReport (should be gone)'),
    ('tabSession', '✗ Old tabSession (should be gone)'),
]

all_ok = True
for term, desc in checks:
    found = any(term in line for line in lines)
    if desc.startswith('✗'):
        status = '❌ FOUND (should be removed!)' if found else '✓ absent'
        if found: all_ok = False
    elif desc.startswith('✓'):
        status = '✓ found' if found else '❌ MISSING'
        if not found: all_ok = False
    else:
        status = '✓ found' if found else '❌ MISSING'
        if not found: all_ok = False
    print(f"  {status}  {desc}")

print(f"\n{'✓ ALL CHECKS PASSED' if all_ok else '❌ SOME CHECKS FAILED'}")
sys.exit(0 if all_ok else 1)

