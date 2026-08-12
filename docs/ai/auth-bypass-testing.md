# auth-bypass-testing.md — Local Testing Without Login

> **How to test authenticated pages locally without a real Supabase session.**
> Applies to: `panoramica.html`, `caption-s8t.html`, `duo-s8t.html`, `grammarhub.html`, `ai-s8t.html`, `traduzione-s8t.html`
>
> **Cross-refs:** `AGENTS.md` · `docs/DECISIONS.md` (ADR-011) · `docs/ai/architecture.md` · `js/auth.js`

---

## The Problem

`js/auth.js` runs on every authenticated page. When it detects no Supabase session, it redirects to:

```
http://localhost:8000/index.html?auth=required
```

This means you can't load `panoramica.html` or `grammarhub.html` locally to test layout changes without logging in first.

## Solution 1: Comment Out Redirect (Fastest)

Open `js/auth.js` and find the redirect line (~line 80):

```javascript
window.location.href = 'index.html?auth=required';
```

Comment it out:

```javascript
// window.location.href = 'index.html?auth=required';
```

**⚠️ Never commit this change.** Restore before `git commit`.

### When to use
- Quick visual checks after CSS/HTML edits
- Testing layout at specific breakpoints (375px, 1160px)
- Verifying day/night mode

---

## Solution 2: Browser DevTools Override (No Code Changes)

1. Open Chrome DevTools → Sources → Overrides
2. Select a local folder for overrides
3. Find `js/auth.js` in the Network tab
4. Right-click → "Override content"
5. Comment out the redirect line
6. Refresh the page

This persists across page reloads but doesn't modify the actual file.

### When to use
- Repeated testing sessions
- When you can't modify files (CI/CD context)

---

## Solution 3: `?bypass_auth=1` Query Parameter (Recommended)

**✅ Already implemented in `js/auth.js`** — no code change needed. Just append
`?bypass_auth=1` to any authenticated page URL. It installs a mock session so
data calls fail gracefully (mock token → Supabase 401) while the UI renders.

Also supported by the same check:
- `?mock=1` — allow any page without auth
- `window.SOTTOTITOLI_BYPASS_AUTH = true` — programmatic toggle

For reference, the implemented check is equivalent to:

```javascript
// At the top of the auth check, before the redirect:
if (window.location.search.includes('bypass_auth=1')) {
  console.warn('⚠️ Auth bypass active — using mock session');
  window.sottotitoliSupabase = null;  // Prevent real API calls
  return;  // Skip auth check entirely
}
```

Then test with:

```
http://localhost:8000/panoramica.html?bypass_auth=1
http://localhost:8000/grammarhub.html?bypass_auth=1
```

### When to use
- Permanent solution (commit the bypass check, never commit the parameter)
- Automated testing (Playwright scripts can add `?bypass_auth=1`)
- The `serve.py` dev server can auto-append this parameter

---

## Solution 4: `serve.py` Auto-Bypass (Best for Daily Dev)

Modify `serve.py` to detect localhost and serve all requests without auth:

```python
# In serve.py, add before the request handler:
import urllib.parse

class AuthBypassHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        # Auto-add bypass for local dev on authenticated pages
        auth_pages = ['panoramica', 'caption-s8t', 'duo-s8t', 'grammarhub', 'ai-s8t', 'traduzione-s8t']
        if any(p in parsed.path for p in auth_pages):
            if 'bypass_auth' not in parsed.query:
                # Redirect to bypass version
                new_query = parsed.query + ('&' if parsed.query else '') + 'bypass_auth=1'
                new_path = parsed.path + '?' + new_query
                self.send_response(302)
                self.send_header('Location', new_path)
                self.end_headers()
                return
        super().do_GET()
```

### When to use
- Daily development workflow
- Never deployed to production

---

## What Happens Without Auth

When auth is bypassed, the page loads in **offline mode**:

| Feature | Without Auth | With Auth |
|---------|-------------|-----------|
| Panels display | ✅ All static content renders | ✅ Full data |
| Word banks | ❌ "No banks yet" | ✅ Loaded from Supabase |
| Session history | ❌ "No sessions found" | ✅ Loaded from Supabase |
| AI Reports | ❌ Can't generate | ✅ Full functionality |
| Theme toggle | ✅ Works (localStorage) | ✅ Works |
| Language switch | ✅ Works (localStorage) | ✅ Works |
| Sidebar nav | ✅ Works | ✅ Works |
| Sub-tabs | ✅ Works | ✅ Works |

For layout testing, offline mode is sufficient 95% of the time. The static HTML structure, CSS, and panel switching all work without a session.

---

## Testing Checklist (Offline Mode)

When testing without auth, verify:

- [ ] All sidebar links navigate correctly
- [ ] All sub-tabs within panels switch correctly
- [ ] Day/night theme toggle works (icon swaps, colors change)
- [ ] Mobile responsive at 375px (sidebar collapses to icons)
- [ ] No JavaScript console errors (red errors only — yellow warnings about missing data are expected)
- [ ] No HTML lint errors (`get_errors` tool)
- [ ] Div balance is 0 (`python3 -c "..."` check)
- [ ] `<main>` tag is paired (1 open, 1 close)

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
