# solve-mistakes.md — Common Mistakes & Fixes

> **Cross-refs:** `coding-procedures.md` · `testing-checklist.md` · `css-theme-guide.md`
> **Also see:** `/memories/repo/i18n-rules.md` · `/memories/repo/supabase-schema.md` · `/memories/repo/hugging-voice-rules.md`

---

## 1. Syntax Errors After Editing

**Symptom:** Page blank, console `SyntaxError`.
**Root cause:** Unescaped quote, missing brace in inline JS.
**Fix:** `node --check <file.js>` or `get_errors` for .html.
**Prevention:** Syntax check after EVERY edit. See `coding-procedures.md`.

---

## 2. i18n Icons Disappearing

**Symptom:** After IT→EN toggle, icons (ⓘ, Font Awesome) vanish.
**Root cause:** `data-i18n` on parent element with children. System falls back to `textContent` which wipes child elements.
**Fix:** Wrap text in `<span>`:
```html
<!-- Before --> <button data-i18n="save"><i class="fa fa-check"></i> Save</button>
<!-- After  --> <button><i class="fa fa-check"></i> <span data-i18n="save">Save</span></button>
```
**Prevention:** Never put `data-i18n` on an element with children. See `/memories/repo/i18n-rules.md`.

---

## 3. Day/Night Mode Broken

**Symptom:** Theme toggle does nothing on one page.
**Root cause:** Missing `[data-theme="dark"]` block, or variable name mismatch.
**Fix:** Verify both `:root` and `[data-theme="dark"]` blocks exist with matching variable names.
**Prevention:** Copy the template from `panoramica.html`. Test both modes. See `css-theme-guide.md`.

---

## 4. Supabase Column Name Errors

**Symptom:** Data saves but doesn't load. "column does not exist" errors.
**Root cause:** Wrong column names:
| ❌ | ✅ | Table |
|----|-----|-------|
| `transcript` | `transcript_text` | sessions |
| `wpm_avg` | `wpm` | sessions |
| `lemma` | `word` | user_vocabulary |
| `cefr` | `cefr_level` | user_vocabulary |

**Prevention:** Always check `/memories/repo/supabase-schema.md`.

---

## 5. WebSocket Messages Not Received

**Symptom:** Captions not appearing. Room empty.
**Root cause:** Message format changed, room ID mismatch, or relay server down.
**Fix:** Verify format: `{"msg":true, "final":"...", "id":N, "label":"..."}`. Check room ID in URL/localStorage. Check Render dashboard.
**Prevention:** NEVER change the message format.

---

## 6. Auth Race Condition

**Symptom:** "user is null" errors on load.
**Root cause:** Code accesses user before `getSession()` resolves.
**Fix:** Always `await window.sottotitoliSupabase.auth.getSession()`.

---

## 7. CSS Variable Not Updating

**Symptom:** Color doesn't change with theme toggle.
**Root cause:** Raw hex color instead of `var(--variable)`.
**Fix:** Use `var(--text)` not `#111827`.

---

## 8. Mobile Layout Broken

**Symptom:** Fine on desktop, broken on mobile.
**Root cause:** Desktop-first design without mobile breakpoints.
**Fix:** Test at 375px. Add `@media (max-width: 500px)` breakpoints. Use `clamp()`.

---

## 9. Hugging Voice Orb Dead

**Symptom:** Orb not clickable, modals don't open.
**Root cause (pick one):**
1. Critical `id` removed (main.js throws on missing `$()`)
2. `?embed=1` in iframe src (kills `showModal()`)
3. `style.css`/`main.js` edited directly (synced from voice-core/)

**Fix:** See `/memories/repo/hugging-voice-rules.md` — 34 critical IDs listed.

---

## 10. Translation Duplicates

**Symptom:** Same translation appears twice.
**Root cause:** Multiple listeners, race condition in async pipeline.
**Status:** Intermittent. Mitigation: debounce requests, clear previous results.

---

## 11. Version Number Not Bumped

**Symptom:** Changes deployed but users see cached version.
**Fix:** Increment `.topbar-version` span in panoramica.html. Update `/memories/repo/version.md`.

---

## 12. config.js Committed

**Symptom:** Production URLs in git history.
**Fix:** `git rm --cached config.js && git commit && git push`. Restore from `config.example.js`.
**Prevention:** Never `git add config.js`. Check `git status` before every commit.

---

## 13. Mismatched `<div>` Tags in HTML (panoramica.html)

**Symptom:** Multiple tabs show blank content, or content overflows into sidebar area.
**Root cause:** Extra or missing `</div>` tags that shift element nesting. A single wrong `</div>` at line 1747 closed `<main>` 2,300 lines early, pushing 6 panels outside `.workspace`. A missing `</div>` at line 1794 nested 6 panels inside a `display:none` popup.
**Fix:** Track div depth through the edited section:
```bash
python3 -c "
import re
with open('panoramica.html') as f:
    lines = f.readlines()
depth = 0
for i in range(START_LINE-1, END_LINE):
    line = lines[i]
    opens = len(re.findall(r'<div\b', line))
    closes = len(re.findall(r'</div>', line))
    depth += opens - closes
    if depth < 0:
        print(f'L{i+1}: OVER-CLOSE depth={depth}')
```
**Prevention:** After any HTML edit, run `get_errors`. If `<main>` shows "not paired" or `</div>` shows "no start tag", review nesting. Never add or remove a single `</div>` without tracing its matching `<div>`.

---

*→ Next: `testing-checklist.md` to prevent these before they happen*
*→ Related: `coding-procedures.md` for the editing rules that avoid these*
