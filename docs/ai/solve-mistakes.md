# solve-mistakes.md — Common Mistakes & How to Fix Them

> **For any AI agent debugging Sottotitoli.**
> These are mistakes that have been made before. Don't make them again.
> Each entry includes: symptom → root cause → fix.

---

## 1. Syntax Errors After Editing

### Symptom
- Page loads blank or partially
- Console shows `Uncaught SyntaxError`
- Feature stops working after an edit

### Root Cause
- Unescaped quote in inline JavaScript
- Missing closing brace/bracket
- HTML entity inside JS string

### Fix
```bash
# For .js files:
node --check /path/to/file.js

# For .html files:
# Use get_errors tool in VS Code
```

### Prevention
- ALWAYS run syntax check after any JS/HTML edit
- See `/memories/syntax-check.md`

---

## 2. i18n Icons Disappearing

### Symptom
- After toggling language (IT→EN), icons (ⓘ, Font Awesome, etc.) disappear
- Text translates but inline elements are gone

### Root Cause
- `data-i18n` attribute placed on a parent element that has child elements (icons, badges, etc.)
- The i18n system's `safeForHtml` gate checks `el.children.length === 0` — when it HAS children, it falls back to `textContent` which wipes everything

### Fix
```html
<!-- Before (broken) -->
<button data-i18n="save"><i class="fa fa-check"></i> Save</button>

<!-- After (fixed) -->
<button><i class="fa fa-check"></i> <span data-i18n="save">Save</span></button>
```

### Prevention
- Always wrap translatable text in a leaf `<span>` with `data-i18n`
- Never put `data-i18n` on an element that contains child elements
- See `/memories/repo/i18n-rules.md`

---

## 3. Day/Night Mode Not Working

### Symptom
- Theme toggle does nothing on a specific page
- Colors look wrong in light mode but fine in dark (or vice versa)
- CSS variables not updating

### Root Cause
- Each page defines its OWN `:root` and `[data-theme="dark"]` variables
- Missing `[data-theme="dark"]` block on a new page
- CSS variable name mismatch between `:root` and `[data-theme="dark"]`
- Theme JS (`js/theme.js` or inline theme toggle) not loaded

### Fix
1. Check that the page has BOTH `:root` and `[data-theme="dark"]` blocks
2. Verify all variable names match between light and dark
3. Check that `<html>` has `data-theme` attribute
4. Check that theme toggle button calls the right function

### Prevention
- Copy the `:root`/`[data-theme="dark"]` block from `panoramica.html` as a template
- Test both modes after any CSS change

---

## 4. Supabase Column Name Errors

### Symptom
- Data saves but doesn't load
- Console shows "column does not exist" errors
- Settings persistence fails silently

### Root Cause
Using wrong column names. The schema has several traps:

| ❌ Wrong | ✅ Correct | Table |
|----------|-----------|-------|
| `transcript` | `transcript_text` | `sessions` |
| `wpm_avg` | `wpm` | `sessions` |
| `lemma` | `word` | `user_vocabulary` |
| `cefr` | `cefr_level` | `user_vocabulary` |
| `transaction_type` | `type` | `token_transactions` |
| `metadata` | *(doesn't exist)* | `token_transactions` |
| `earned_minutes` | *(doesn't exist)* | `referrals` |

### Fix
- Check `/memories/repo/supabase-schema.md` for verified column names
- Query the actual table via Supabase REST API to verify columns

### Prevention
- Always consult supabase-schema.md before writing Supabase queries
- Never guess column names

---

## 5. WebSocket Messages Not Received

### Symptom
- Captions not appearing on overlay pages
- Translation not working
- Room shows as empty

### Root Cause
- WebSocket message format changed
- Room ID mismatch between sender and receiver
- WebSocket relay server not running

### Fix
1. Verify message format matches exactly:
```json
{"msg": true, "final": "text", "id": 1, "label": "Speaker"}
{"msg": true, "interm": "partial text", "id": 1}
```
2. Check `localStorage` for room ID
3. Check URL params for room ID
4. Check Render dashboard for WebSocket relay status

### Prevention
- NEVER change the WebSocket message format
- Always test with both sender and receiver pages

---

## 6. Auth Race Condition

### Symptom
- "user is null" errors on page load
- User menu shows "..." or empty
- Session data doesn't load on first visit

### Root Cause
- Code tries to access `window.sottotitoliSupabase.auth.getSession()` before auth is initialized
- `js/auth.js` loads asynchronously — the user is not available at script load time

### Fix
```javascript
// ❌ Wrong — runs before auth is ready
const user = window.sottotitoliSupabase.auth.user();

// ✅ Correct — waits for session
const { data: { session } } = await window.sottotitoliSupabase.auth.getSession();
const user = session?.user;
```

### Prevention
- Always await `getSession()` before accessing user data
- Wrap user-dependent code in async functions

---

## 7. CSS Variable Not Updating

### Symptom
- Element color doesn't change with theme toggle
- Hardcoded color instead of CSS variable

### Root Cause
- Using a raw color value (`#fff`) instead of a CSS variable (`var(--text)`)
- Using a CSS variable that doesn't exist in that page's `:root` block

### Fix
```css
/* ❌ Wrong */
.my-element { color: #111827; }

/* ✅ Correct */
.my-element { color: var(--text); }
```

### Prevention
- Always use CSS variables from the page's `:root` block
- Check DESIGN.md for available variable names

---

## 8. Mobile Layout Broken

### Symptom
- Page looks fine on desktop, broken on mobile
- Elements overflow, text too small, buttons overlapping

### Root Cause
- Most pages are desktop-first — mobile was not fully designed
- Missing `@media` queries for small screens
- Fixed widths that don't adapt

### Fix
- Test at 375px width
- Add `@media (max-width: 500px)` breakpoints
- Use `clamp()` for font sizes
- Use `max-width: 100%` on images and containers

### Prevention
- Always test at 375px before claiming something works
- Use responsive units (%, vw, clamp) instead of fixed px

---

## 9. Hugging Voice Orb Dead (hugging-voice/)

### Symptom
- The main orb is not clickable
- Modals don't open
- Page loads but nothing works

### Root Cause (pick one)
1. An element with a critical `id` was removed (main.js throws on missing `$()` selectors)
2. `?embed=1` was added to the iframe src (injects `dialog{display:none!important}` which kills `showModal()`)
3. `style.css` or `main.js` was edited directly (synced from `voice-core/` by `sync_voice.py`)

### Fix
1. Restore the removed element (see `hugging-voice-rules.md` for list of 34 critical IDs)
2. Use `?captions=1` instead of `?embed=1`
3. Revert `style.css`/`main.js` changes — edit only inline styles or HTML text

### Prevention
- Read `/memories/repo/hugging-voice-rules.md` before touching `hugging-voice/`
- Never remove any element with an `id`
- Never use `?embed=1`
- Never edit `style.css` or `main.js`

---

## 10. Translation Duplicates Bug

### Symptom
- Same translation appears twice
- Sentences concatenated incorrectly

### Root Cause
- Translation provider returning results twice
- Multiple event listeners attached to the same translation trigger
- Race condition in async translation pipeline

### Status
- **Intermittent** — not fully resolved
- Known issue in `translation-providers.js`

### Mitigation
- Check for duplicate listeners before adding
- Debounce translation requests
- Clear previous results before rendering new ones

---

## 11. Version Number Not Bumped

### Symptom
- Changes to `panoramica.html` deployed but users see cached version

### Root Cause
- `.topbar-version` span not incremented
- Browser caching old version

### Fix
```html
<!-- Search for topbar-version in panoramica.html -->
<span class="topbar-version">v160</span>
<!-- Increment to v161 -->
```
Also update `/memories/repo/version.md`.

### Prevention
- Every commit to panoramica.html MUST bump the version number

---

## 12. Config.js Committed

### Symptom
- Production URLs exposed in git history
- Merge conflicts on config.js

### Root Cause
- `config.js` is gitignored but was force-added or the gitignore failed

### Fix
```bash
git rm --cached config.js
git commit -m "fix: remove config.js from tracking"
git push
```
Then restore `config.js` from `config.example.js` template.

### Prevention
- Never `git add config.js`
- Check `git status` before every commit
- Only edit `config.example.js` for template changes

---

## 13. Tabs/Content Panels Not Displaying (No Console Errors)

### Symptom
- Some sidebar tabs show empty content when clicked
- No JavaScript console errors
- The panels that DO work display fine, but 5+ panels show nothing
- **Working:** Panoramica, Word Banks, Trascrizioni, Profilo
- **Broken:** Vocabulary Builder, Grammar Hub, Report AI, Impostazioni, Aiuto
- All broken panels are AFTER the Word Banks panel in the HTML

### Root Cause
A `display:none` popup div (e.g., `wbImportPopup`) is **missing its closing `</div>`**.
This causes everything after it in the DOM to be nested INSIDE the hidden popup.
Since `display:none` hides all descendants, all subsequent content panels become invisible.

The broken panels appear AFTER the Word Banks panel because the popup divs
(wbImportPopup, wbCreatePopup) are placed between the Word Banks panel and the
Vocabulary Builder panel in the HTML.

### Detection
```bash
# Count opening vs closing div tags
python3 -c "
import re
with open('panoramica.html') as f:
    t = f.read()
print('Opens:', len(re.findall(r'<div[\s>]', t)))
print('Closes:', len(re.findall(r'</div>', t)))
"
# If count differs, a div is unclosed.

# Find the region with the imbalance:
python3 -c "
import re
with open('panoramica.html') as f:
    lines = f.readlines()
for start in range(0, len(lines), 500):
    end = min(start+500, len(lines))
    net = sum(len(re.findall(r'<div[\s>]', l)) - len(re.findall(r'</div>', l)) for l in lines[start:end])
    if net != 0:
        print(f'Lines {start+1}-{end}: net {net:+d}')
"
# Narrow down to the region and look for popup divs missing </div>
```

### Fix
Add the missing `</div>` for the popup, and remove any orphaned `</div>` that
was placed too far down (often found right after the next popup closes).

### Pattern to Recognize
When content panels before a certain point work but ALL panels after it are
broken, suspect a missing `</div>` on a `display:none` element between them.

### Prevention
- After adding/editing popup or overlay divs, verify their `</div>` is present
- Run the div balance check whenever tabs mysteriously stop displaying
- `display:none` on a parent hides ALL children — this is the most common cause
  of "invisible but no errors" bugs in static HTML sites

---

*Last updated: 2026-08-05 · Based on real bugs encountered across all sessions*
