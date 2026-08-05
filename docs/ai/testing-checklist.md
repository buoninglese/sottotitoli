# testing-checklist.md — Pre-Commit & Pre-Deploy Checklist

> **For any AI agent committing code to Sottotitoli.**
> Run through this BEFORE every commit. It takes 2 minutes and prevents hours of debugging.

---

## 1. Syntax Validation

```bash
# For .js files:
node --check /path/to/file.js

# For .html files with inline scripts:
# Use get_errors tool in VS Code
```

- [ ] No `SyntaxError` in any file
- [ ] No unescaped quotes in inline JS
- [ ] No missing closing braces/brackets/parentheses

---

## 2. Visual Testing

### Desktop (1200px+)
- [ ] All elements visible and correctly positioned
- [ ] No overflow/hidden content
- [ ] Buttons clickable, hover states work
- [ ] Modals open/close correctly
- [ ] Dropdowns expand/collapse

### Mobile (375px)
- [ ] Layout doesn't break
- [ ] Text is readable (no overflow)
- [ ] Buttons are tappable (min 44px touch target)
- [ ] No horizontal scroll
- [ ] Sidebar collapses correctly (if applicable)
- [ ] Cards stack vertically

---

## 3. Theme Testing

### Day Mode (`data-theme="light"`)
- [ ] Background is light (not dark)
- [ ] Text is dark and readable
- [ ] Cards have correct border/shadow
- [ ] Accent colors match light palette

### Night Mode (`data-theme="dark"`)
- [ ] Background is dark (not light)
- [ ] Text is light and readable
- [ ] Cards have correct border/shadow
- [ ] Accent colors match dark palette

### Theme Toggle
- [ ] Clicking toggle switches mode
- [ ] Preference persists after page reload
- [ ] No flicker during transition

---

## 4. i18n Testing

- [ ] Toggle language (IT→EN→IT) — no icons disappear
- [ ] All translatable text has `data-i18n` attributes
- [ ] No English text showing in Italian mode
- [ ] No Italian text showing in English mode

---

## 5. Auth Testing

- [ ] Login flow works (Google OAuth)
- [ ] User name/avatar appears in topbar
- [ ] Session persists across page navigation
- [ ] Logout clears session correctly
- [ ] Protected features hidden when logged out

---

## 6. Console Check

Open browser console (F12) and verify:
- [ ] No red errors
- [ ] No yellow warnings (unless pre-existing/known)
- [ ] No "Failed to load resource" (404 on critical files)
- [ ] No CORS errors
- [ ] No Supabase policy errors

---

## 7. WebSocket Check (if applicable)

- [ ] Room ID present in URL or localStorage
- [ ] Messages sent in correct format
- [ ] Messages received by overlay pages
- [ ] No connection errors in console

---

## 8. Config & Security

- [ ] No hardcoded URLs (use `window.SOTTOTITOLI_CONFIG`)
- [ ] No API keys exposed in code
- [ ] `config.js` is NOT staged in git (`git status`)
- [ ] All external resources loaded over HTTPS

---

## 9. Version Bump

If editing `panoramica.html`:
- [ ] `.topbar-version` span incremented (e.g., v160 → v161)
- [ ] `/memories/repo/version.md` updated

---

## 10. Git Hygiene

```bash
git status              # Check what's staged
git diff --staged       # Review changes
```

- [ ] Only intended files are staged
- [ ] `config.js` is NOT in the staging area
- [ ] No backup files accidentally staged
- [ ] No node_modules or temporary files

---

## 11. Commit & Push

```bash
git commit -m "type: description"
git push origin main
```

- [ ] Commit message follows convention (`fix:`, `feat:`, `style:`, etc.)
- [ ] Push succeeded (no rejected/fast-forward errors)

---

## Quick Script

For the most common checks:
```bash
# Run these before every commit
node --check js/auth.js 2>&1 && echo "✓ auth.js syntax OK"
node --check js/theme.js 2>&1 && echo "✓ theme.js syntax OK"
git status | grep -q "config.js" && echo "⚠ config.js is staged!" || echo "✓ config.js not staged"
grep -r "topbar-version" panoramica.html | grep -o "v[0-9]*"
```

---

*Last updated: 2026-08-05*
