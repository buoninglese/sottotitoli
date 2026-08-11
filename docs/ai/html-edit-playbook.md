# html-edit-playbook.md — Div-Balance Debugging Playbook

> **Battle-tested techniques for fixing structural HTML bugs in large files.**
> Every technique here was used during the 2026-08-05 panoramica.html audit (back when it was 12,000+ lines).
>
> **Note (2026-08-11):** `panoramica.html` is now a ~2,000-line thin shell. Panels live in `js/panoramica/panels/*.js` as ES modules. Most techniques below still apply to `caption-s8t.html` and other large pages.
>
> **Cross-refs:** `coding-procedures.md` · `solve-mistakes.md` · `docs/DECISIONS.md` (ADR-007) · `AGENTS.md`

---

## The Core Problem

In static HTML with deeply nested panels, a single missing `</div>` — especially on a `display:none` element — silently hides content. No console errors. No visual clues. Just blank panels.

The fix is always the same: find the imbalance, add the missing close, remove any orphans. This playbook makes that process systematic.

---

## Technique 1: Full-File Div Balance Check (30 seconds)

After any HTML edit, run this immediately:

```bash
python3 -c "
import re
with open('panoramica.html') as f:
    t = f.read()
print('Opens:', len(re.findall(r'<div[\s>]', t)))
print('Closes:', len(re.findall(r'</div>', t)))
"
```

**Interpretation:**
| Result | Meaning |
|--------|---------|
| `Opens == Closes` | ✅ All divs balanced |
| `Opens > Closes` | Missing closing `</div>` tags |
| `Opens < Closes` | Orphaned `</div>` tags (closing things they shouldn't) |

**Target: always zero.** Never commit with a non-zero balance.

---

## Technique 2: Region-Based Narrowing (60 seconds)

When the full-file check shows an imbalance, narrow it down to 500-line chunks:

```bash
python3 -c "
import re
with open('panoramica.html') as f:
    lines = f.readlines()
for start in range(0, len(lines), 500):
    end = min(start+500, len(lines))
    opens = sum(len(re.findall(r'<div[\s>]', lines[i])) for i in range(start, end))
    closes = sum(len(re.findall(r'</div>', lines[i])) for i in range(start, end))
    net = opens - closes
    if net != 0:
        print(f'Lines {start+1}-{end}: +{opens} -{closes} = net {net:+d}')
"
```

**How to use the output:**

```
Lines 1-500:     net +2    ← 2 divs open here, close later
Lines 501-1000:  net +1    ← 1 more opens here
Lines 3501-4000: net -3    ← 3 closes here from earlier opens
```

The imbalance should cancel out across regions. If a region has a large positive net followed by a large negative net, the positive region contains the missing `</div>`.

---

## Technique 3: The "Panels Before X Work, After X Don't" Heuristic

**When half the panels display and half don't**, the break is at a single point in the HTML. Find the last working panel and the first broken panel, then look at what's between them.

**Real example from 2026-08-05 (panoramica.html back when it was a 12K-line monolith):**

| Panel | Status | Line |
|-------|--------|------|
| Panoramica | ✅ | 340 |
| Word Banks | ✅ | 1314 |
| Vocabulary Builder | ❌ | 1860 |
| Grammar Hub | ❌ | 3680 |
| Report AI | ❌ | 2099 |
| Impostazioni | ❌ | 3465 |
| Aiuto | ❌ | 3632 |

**Root cause:** The `wbImportPopup` div (between Word Banks and Vocabulary Builder, line 1748) was missing its closing `</div>`. Everything after it was nested inside a `display:none` container.

**The heuristic:** When panels before line N work and panels after line N break, suspect a missing `</div>` in the gap between them.

---

## Technique 4: Main Tag Pairing Check

If `<main>` shows "not paired" in `get_errors`, the imbalance has propagated to the page shell:

```bash
python3 -c "
import re
with open('panoramica.html') as f:
    lines = f.readlines()
main_o = sum(1 for l in lines if re.search(r'<main[\s>]', l))
main_c = sum(1 for l in lines if '</main>' in l)
print(f'Main: {main_o} opens, {main_c} closes')
"
```

**Target:** 1 open, 1 close. If main shows 1 open / 0 closes, an unclosed div has swallowed `</main>`. Fix the div imbalance first, the main pairing will self-correct.

---

## Technique 5: Depth Tracing (For Complex Nests)

When the region check points to a specific area but the exact line isn't clear, trace depth line by line:

```bash
python3 -c "
import re
with open('panoramica.html') as f:
    lines = f.readlines()
depth = 0
started = False
for i in range(3640, 4100):  # Adjust range to target area
    line = lines[i]
    if 'sub-gh-dashboard' in line and 'tabpanel' in line:
        started = True
        depth = 1
        continue
    if not started: continue
    opens = len(re.findall(r'<div[\s>]', line))
    closes = len(re.findall(r'</div>', line))
    depth += opens - closes
    stripped = line.strip()[:100]
    # Show key structural elements
    if 'sub-gh-' in stripped or 'tabpanel' in stripped or '<!--' in stripped:
        print(f'L{i+1} d={depth:+d}: {stripped}')
    if depth == 0:
        print(f'Container closes at L{i+1}')
        break
"
```

**Interpretation:** If a container opens at depth +1 and the next structural element shows depth +3, there are 2 unclosed divs between them.

---

## Technique 6: Playwright DOM Parent Chain Verification

When the HTML looks correct but the browser shows different nesting, verify with Playwright:

```javascript
const element = page.locator('#sub-gh-explorer');
const parents = await element.evaluate(el => {
  const chain = [];
  let p = el.parentElement;
  while (p) {
    chain.push({ tag: p.tagName, id: p.id, class: p.className?.substring(0, 60) });
    p = p.parentElement;
  }
  return chain;
});
```

**Real finding:** Explorer showed `parentId: "sub-gh-dashboard"` instead of `"pnl-grammar-hub"` — confirming it was nested inside the wrong container.

---

## Technique 7: Content Panel Sibling Verification

When extracting content to a new page, verify the sibling structure:

```javascript
const panel = page.locator('#pnl-grammar-hub');
const children = await panel.evaluate(el =>
  Array.from(el.children).map(c => c.id || c.className?.substring(0, 30))
);
```

**Target:** All subtab panes should be direct children of their parent panel. If one is missing from the list, it's nested inside another pane.

---

## Technique 8: Git-Based Clean Extraction

When moving content to a new file, use `git show` to extract from a known-good commit:

```bash
# Get content from a specific commit
git show <commit-hash>:panoramica.html > /tmp/clean_copy.html

# Then extract with Python
python3 -c "
with open('/tmp/clean_copy.html') as f:
    lines = f.readlines()
# Find boundaries...
explorer_body = ''.join(lines[start:end])
with open('extracted.html', 'w') as out:
    out.write(explorer_body)
"
```

This avoids working with a file that's been partially edited and has shifted line numbers.

---

## Technique 9: Trim Extracted Content for Clean Insertion

Content extracted from deep nesting carries extra closing tags from its parent structure. Trim them:

```bash
python3 -c "
with open('/tmp/extracted.html') as f:
    lines = f.readlines()

# Count section and div imbalance
import re
sections_o = sum(1 for l in lines if '<section' in l)
sections_c = sum(1 for l in lines if '</section>' in l)
divs_o = sum(len(re.findall(r'<div[\s>]', l)) for l in lines)
divs_c = sum(len(re.findall(r'</div>', l)) for l in lines)

print(f'Sections: {sections_o} open, {sections_c} close = {sections_o - sections_c}')
print(f'Divs: {divs_o} open, {divs_c} close = {divs_o - divs_c}')

# Trim extra closes from the end
extra_sections = sections_c - sections_o
extra_divs = divs_c - divs_o
print(f'Need to remove {extra_sections} </section> and {extra_divs} </div> from end')
"
```

---

## Technique 10: Verify Rendering Without Auth Redirect

When testing pages that require authentication, use the bypass strategies from `docs/ai/auth-bypass-testing.md`. For quick structural checks, comment out the redirect in `js/auth.js`:

```javascript
// TEMPORARY: comment out for layout testing
// window.location.href = 'index.html?auth=required';
```

**⚠️ Restore before commit.**

---

## Decision Tree: Which Technique When?

```
Edit made → Technique 1 (full-file check)
    │
    ├─ Balanced → ✅ Done
    │
    └─ Imbalanced → Technique 2 (region narrowing)
            │
            ├─ Clear region → Technique 3 (working/broken panels heuristic)
            │       │
            │       └─ Fix identified → Apply fix → Technique 1 again
            │
            └─ Unclear → Technique 5 (depth tracing)
                    │
                    ├─ Complex nesting → Technique 6 (Playwright DOM chain)
                    │
                    └─ Extraction needed → Technique 8 (git extract)
                            └─ Technique 9 (trim extra closes)
```

---

## Real-World Examples

### Bug: 5 Panels Blank (2026-08-05)

**Symptom:** Vocabulary Builder, Grammar Hub, Report AI, Impostazioni, Aiuto all showed blank content. No console errors.

**Technique used:** #3 (panel heuristic) + #2 (region narrowing)

**Findings:**
- Technique 2: Lines 1748-1795 had net +1 (missing close)
- Technique 3: Word Banks (before line 1748) worked, Vocabulary Builder (after) didn't
- Root cause: `wbImportPopup` missing `</div>` at line 1778

**Fix:** Added `</div>` after inner container close, removed orphaned `</div>` at line 1794.

### Bug: Explorer Tab Empty (2026-08-05)

**Symptom:** Grammar Hub Explorer subtab showed no content. Dashboard and Strategy worked fine.

**Technique used:** #6 (Playwright DOM chain) + #5 (depth tracing) + #8 (git extract) + #9 (trim)

**Findings:**
- Technique 6: Explorer's parent chain went through `sub-gh-dashboard`
- Technique 5: Dashboard depth was +2 at Explorer start
- Explorer was nested 3 levels deep inside the Dashboard's section structure

**Resolution:** Extracted Explorer to standalone `grammarhub.html` rather than fixing the 3-level nest (see ADR-008 in `docs/DECISIONS.md`).

---

## Prevention Checklist

Before committing any HTML edit:

- [ ] Technique 1: Full-file div balance = 0
- [ ] `<main>` is paired (1 open, 1 close)
- [ ] `get_errors` returns zero errors
- [ ] All panels clicked through in browser (see `testing-checklist.md`)
- [ ] No `display:none` containers left open

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
