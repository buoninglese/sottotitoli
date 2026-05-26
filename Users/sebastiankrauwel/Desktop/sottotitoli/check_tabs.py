import re
with open('/Users/sebastiankrauwel/Desktop/sottotitoli/studio.html') as f:
    content = f.read()

checks = {
    'data-tab="caption"': 'Caption tab button',
    'data-tab="translate"': 'Translate tab button',
    'data-tab="analysis"': 'Analysis tab button',
    'data-tab="progress"': 'Progress tab button',
    'id="tabCaption"': 'Caption panel',
    'id="tabTranslate"': 'Translate panel',
    'id="tabAnalysis"': 'Analysis panel',
    'id="tabProgress"': 'Progress panel',
    'analysisRoot': 'Analysis root',
    'progressRoot': 'Progress root',
    'config.js': 'config.js include',
    'session-utils.js': 'session-utils.js include',
    'app.js': 'app.js (⚠️ should be gone)',
    'ws-publisher.js': 'ws-publisher.js (⚠️ should be gone)',
    'lesson-report.js': 'lesson-report.js (⚠️ should be gone)',
    'tabReport': 'old tabReport (⚠️ should be gone)',
    'tabSession': 'old tabSession (⚠️ should be gone)',
}
for term, desc in checks.items():
    found = term in content
    print(f"{'✓' if found else '✗'} {desc}: {'found' if found else 'MISSING'}")
