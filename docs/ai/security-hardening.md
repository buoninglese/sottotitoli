# security-hardening.md — Security Audit & Hardening Guide

> **Cross-refs:** `AGENTS.md` · `deploy-runbook.md` · `coding-procedures.md`
> **Audit date:** 2026-08-05

---

## 1. Audit Summary

| Finding | Severity | Status |
|---------|----------|--------|
| No Content Security Policy (CSP) | 🔴 Critical | Needs implementation |
| `target="_blank"` without `rel="noopener"` | 🔴 High | Fixed on onboarding.html, needs audit on others |
| Heavy `innerHTML` usage (~957 occurrences) | 🟠 High | Inherent — must sanitize inputs |
| No Subresource Integrity (SRI) on CDN scripts | 🟠 High | Needs implementation |
| Supabase anon key in client-side JS | 🟡 Medium | Unavoidable, needs RLS + rate limiting |
| WebSocket without authentication | 🟡 Medium | Room IDs are the only boundary |
| Inline event handlers (`onclick=`) | 🟡 Medium | Can't CSP-lock without refactor |
| No `Referrer-Policy` or `Permissions-Policy` | 🟡 Medium | Needs meta tags |
| No client-side input sanitization | 🟡 Medium | Risk with innerHTML injection |
| No rate limiting on auth attempts | 🟢 Low | Supabase handles this server-side |

---

## 2. What We Have (Good)

- ✅ `robots.txt` — 55+ blocked paths for internal files
- ✅ `serve.py` — blocks internal paths on local dev
- ✅ `security-utils.js` — room ID validation with predictable-ID detection
- ✅ HTTPS enforced by GitHub Pages
- ✅ Supabase RLS on all tables
- ✅ `config.js` gitignored
- ✅ `config.secrets.js` blocked by serve.py + robots.txt
- ✅ API keys server-side only (Render env vars, Supabase secrets)
- ✅ `noopener` on hugging-voice external links

---

## 3. What's Missing — By Priority

### 🔴 CRITICAL: Content Security Policy

**Risk:** Without CSP, injected scripts can execute freely. With ~957 `innerHTML` calls across the codebase, an XSS vulnerability in any one of them compromises the entire app.

**Fix:** Add CSP via `<meta>` tag. For a static site on GitHub Pages, HTTP headers can't be set — meta tags are the only option.

```html
<!-- Add to <head> of every production page -->
<meta http-equiv="Content-Security-Policy" 
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 
      https://cdn.jsdelivr.net 
      https://unpkg.com 
      https://cdnjs.cloudflare.com 
      https://qzqmuegbpmvqrjrlfbgk.supabase.co 
      wss://sottotitoli-websocket.onrender.com;
    style-src 'self' 'unsafe-inline' 
      https://cdnjs.cloudflare.com 
      https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
    img-src 'self' data: https:;
    connect-src 'self' 
      https://qzqmuegbpmvqrjrlfbgk.supabase.co 
      wss://sottotitoli-websocket.onrender.com 
      https://sottotitoli-websocket.onrender.com 
      https://api.mymemory.translated.net 
      https://translate.googleapis.com;
    frame-src 'self' https://*.huggingface.co;
    media-src 'self' blob:;
    worker-src 'self' blob:;
">
```

**⚠️ Caveat:** `'unsafe-inline'` and `'unsafe-eval'` are needed because the codebase uses inline scripts, `onclick` handlers, and `innerHTML`. Without a major refactor, a strict CSP isn't possible — but even a permissive CSP blocks external script injection and provides a baseline.

---

### 🔴 HIGH: `target="_blank"` Without `rel="noopener noreferrer"`

**Risk:** Tabnabbing — the opened page can redirect the original page to a phishing site via `window.opener.location`.

**Affected pages:** `onboarding.html`, `panoramica.html` (some links), `dev/dashboards.html`.

**Fix:**
```html
<!-- Before -->
<a href="termini.html" target="_blank">Termini</a>

<!-- After -->
<a href="termini.html" target="_blank" rel="noopener noreferrer">Termini</a>
```

---

### 🟠 HIGH: Subresource Integrity (SRI)

**Risk:** If a CDN is compromised, malicious code could be injected through `<script>` tags.

**Fix:** Add `integrity` hashes to external scripts:
```html
<script src="https://unpkg.com/compromise@14.14.2" 
  integrity="sha384-..." 
  crossorigin="anonymous"></script>
```

Generate hashes: `openssl dgst -sha384 -binary file.js | openssl base64 -A`

---

### 🟡 MEDIUM: Security Meta Tags

**Risk:** Missing browser security directives.

**Fix:** Add to every page's `<head>`:
```html
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="camera=self,microphone=self,geolocation=()">
```

---

### 🟡 MEDIUM: innerHTML Sanitization

**Risk:** User data from Supabase injected via `innerHTML` could contain malicious scripts.

**Current state:** `panoramica.html` uses `innerHTML` extensively for rendering session data, AI reports, and vocabulary. No sanitization before injection.

**Mitigation:**
1. For user-provided text: use `textContent` instead of `innerHTML`
2. For formatted content from trusted sources (AI reports): ensure Supabase RLS limits who can insert
3. Consider a lightweight sanitizer like DOMPurify for unavoidable innerHTML use

---

### 🟡 MEDIUM: WebSocket Room Security

**Risk:** Anyone who guesses a room ID can join and see captions.

**Current mitigation:** `security-utils.js` warns against predictable room IDs.

**Additional steps:**
- Generate room IDs with `crypto.randomUUID()` instead of user input
- Consider adding a room password/hash verification
- The relay server should validate room ID format

---

## 4. Implementation Priority

| Order | Action | Effort | Impact |
|-------|--------|--------|--------|
| 1 | Add CSP meta tag to index.html + panoramica.html + caption-s8t.html | Low | High |
| 2 | Fix `target="_blank"` on onboarding.html | Low | High |
| 3 | Add security meta tags to all production pages | Low | Medium |
| 4 | Add SRI hashes to critical CDN scripts | Medium | Medium |
| 5 | Audit innerHTML usage for unsanitized inputs | High | Medium |
| 6 | Refactor room ID generation to use crypto.randomUUID | Medium | Low |
| 7 | Implement DOMPurify for user-content injection | Medium | Medium |

---

## 5. What GitHub Pages Does For Us

- ✅ HTTPS enforced (HSTS via `.github.io` domain)
- ✅ No server-side code execution
- ✅ DDoS protection via GitHub's infrastructure
- ✅ `.nojekyll` prevents Jekyll processing

## 6. What We Can't Fix (Platform Limitations)

- ❌ HTTP security headers (CSP via header, HSTS, X-Frame-Options) — GitHub Pages doesn't support custom headers
- ❌ Server-side rate limiting — must be done on Render backend or Supabase
- ❌ CSRF tokens — not applicable (no server-side sessions, auth is JWT-based via Supabase)

---

*→ Next: `deploy-runbook.md` for deployment after security changes*
*→ Related: `coding-procedures.md` for safe innerHTML usage*
