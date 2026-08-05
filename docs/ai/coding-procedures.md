# coding-procedures.md — Safe Coding Procedures

> **Cross-refs:** `solve-mistakes.md` · `testing-checklist.md` · `css-theme-guide.md` · `AGENTS.md`

---

## 1. Before You Write Any Code

### Read These First
| Order | File | Why |
|-------|------|-----|
| 1 | `../AGENTS.md` | Architecture, conventions, pitfalls |
| 2 | `glossary.md` | Understand the vocabulary |
| 3 | `solve-mistakes.md` | Don't repeat known bugs |
| 4 | `/memories/repo/supabase-schema.md` | Correct column names |
| 5 | `/memories/repo/i18n-rules.md` | Leaf-span i18n pattern |

---

## 2. Editing HTML Files

### CSS Variable Pattern
Every page has its OWN `:root` and `[data-theme="dark"]` block. See `css-theme-guide.md`.

### i18n Leaf-Span (MUST FOLLOW)
```html
<!-- ❌ WRONG — wipes child icons -->
<button data-i18n="key"><i class="fa fa-check"></i> Save</button>

<!-- ✅ CORRECT -->
<button><i class="fa fa-check"></i> <span data-i18n="key">Save</span></button>
```
See `/memories/repo/i18n-rules.md` for full details.

### Script Loading Order (Auth Pages)
1. `supabase-js@2` (CDN)
2. `config.js`
3. `js/auth.js`
4. `js/theme.js`
5. Page-specific scripts

---

## 3. Editing JavaScript Files

### Syntax Check (MANDATORY)
```bash
node --check /path/to/file.js
```
For HTML: use `get_errors` tool.

### Config Access
Always use `window.SOTTOTITOLI_CONFIG`. Never hardcode URLs.

### Auth Access
Always `await window.sottotitoliSupabase.auth.getSession()`. User not available at load time.

### Supabase Column Traps
| ❌ Wrong | ✅ Correct | Table |
|----------|-----------|-------|
| `transcript` | `transcript_text` | sessions |
| `wpm_avg` | `wpm` | sessions |
| `lemma` | `word` | user_vocabulary |
| `cefr` | `cefr_level` | user_vocabulary |

### WebSocket Format (DO NOT CHANGE)
```json
{"msg": true, "final": "text", "id": counter, "label": "label"}
```

---

## 4. Git Workflow

```bash
git status                           # Check what changed
git add <files>                      # Stage (NEVER config.js!)
git commit -m "type: description"    # fix:, feat:, style:, refactor:
git push origin main                 # ALWAYS push
```

Commit conventions: `fix:`, `feat:`, `style:`, `refactor:`, `docs:`

---

## 5. Testing (See `testing-checklist.md` for full list)

Minimum before commit:
- [ ] Syntax check passed
- [ ] Desktop (1200px+) + mobile (375px)
- [ ] Day + night mode
- [ ] No console errors
- [ ] config.js NOT staged
- [ ] Version bumped if editing panoramica.html

---

*→ Next: `testing-checklist.md` for the full checklist*
*→ Related: `solve-mistakes.md` for bugs to avoid*
