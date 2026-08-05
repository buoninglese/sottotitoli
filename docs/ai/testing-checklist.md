# testing-checklist.md — Pre-Commit & Pre-Deploy Checklist

> **Cross-refs:** `coding-procedures.md` · `solve-mistakes.md` · `deploy-runbook.md`

---

## 1. Syntax Validation
```bash
node --check /path/to/file.js       # .js files
# get_errors tool                    # .html files
```
- [ ] No `SyntaxError` anywhere
- [ ] No unescaped quotes
- [ ] No missing braces/brackets

## 2. Visual Testing
### Desktop (1200px+)
- [ ] All elements visible, correctly positioned
- [ ] No overflow/hidden content
- [ ] Buttons clickable, hover states work
- [ ] Modals open/close correctly

### Mobile (375px)
- [ ] Layout doesn't break
- [ ] Text readable (no overflow)
- [ ] Buttons tappable (min 44px)
- [ ] No horizontal scroll

## 3. Theme Testing
### Day Mode
- [ ] Background is light
- [ ] Text is dark and readable
- [ ] Accent colors match light palette

### Night Mode
- [ ] Background is dark
- [ ] Text is light and readable
- [ ] Accent colors match dark palette

### Toggle
- [ ] Clicking toggle switches mode
- [ ] Preference persists after reload

## 4. i18n Testing
- [ ] IT→EN→IT toggle — no icons disappear
- [ ] All text has `data-i18n` attributes

## 5. Auth Testing
- [ ] Google OAuth login works
- [ ] User name/avatar appears
- [ ] Session persists across navigation
- [ ] Logout clears session

## 6. Console Check
- [ ] No red errors
- [ ] No unexpected warnings
- [ ] No 404s on critical files

## 7. WebSocket Check
- [ ] Room ID present in URL/localStorage
- [ ] Messages sent in correct format
- [ ] Overlay pages receive messages

## 8. Config & Security
- [ ] No hardcoded URLs
- [ ] No API keys exposed
- [ ] `config.js` NOT staged (`git status`)

## 9. Version Bump (panoramica.html)
- [ ] `.topbar-version` incremented (v160 → v161)
- [ ] `/memories/repo/version.md` updated

## 10. Git Hygiene
```bash
git status && git diff --staged
```
- [ ] Only intended files staged
- [ ] No config.js, backups, or temp files

## 11. Commit & Push
```bash
git commit -m "type: description"
git push origin main
```
- [ ] Commit follows convention (`fix:`, `feat:`, `style:`)
- [ ] Push succeeded

---

*→ Next: `deploy-runbook.md` to ship your changes*
*→ Related: `coding-procedures.md` for what to check before you even start*
