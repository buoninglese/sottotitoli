# CEFR Integration Roadmap — caption-s8t.html
# ==============================================
# Hand this to your dedicated agent. It describes all CEFR-related additions
# to caption-s8t.html, what data is available, and how to build each component.
#
# Prerequisites (already built):
#   - js/cefr-gse.js  →  window.SottotitoliGSE.analyze(text, vocabLookup)
#   - Render API:        POST /api/cefr/batch  and  POST /api/cefr/analyze
#
# Script to add in <head> (after cefr-levels.js):
#   <script src="js/cefr-gse.js"></script>
# =============================================

---

## COMPONENT 1: Enhance Slide 2 — `vocabPanel`

**Where:** The second `.h-panel` div (`#vocabPanel`). Already has POS tag stacks
on the left and CEFR breakdown bars on the right.

### 1a. Add GSE Score to CEFR Breakdown

**Current state:** The right side has vertical bars for A1-C2 percentages.

**Enhancement:** Below the bars, add:
- A large GSE number (e.g., "34")
- A CEFR band label below it (e.g., "A2 · Elementary")
- A small 3-line sparkline showing the last 10 sentence GSE scores

**How it works:**
Every time a caption finalizes (WebSocket `final` message), do:
1. Extract the sentence text
2. Tokenize → extract unique words
3. POST to `/api/cefr/batch` with `{ words: [...] }` → get word→level map
4. Feed text + word map to `window.SottotitoliGSE.analyze(text, vocabLookup)`
5. Get back `{ overallGSE, cefrBand, cefrColor }`
6. Store the GSE in a rolling array (last 10 scores)
7. Re-render the sparkline + GSE display
8. Re-render the CEFR breakdown bars with the updated distribution

**API call debouncing:** Don't call on every interim result. Only when
`message.final` is truthy (WebSocket final = confirmed sentence).
Batch all unique words from the sentence into ONE API call.

**Sparkline SVG (simple implementation):**
```javascript
function drawSparkline(scores, container) {
  if (!scores.length) return;
  var w = container.clientWidth;
  var h = 40;
  var min = Math.min(...scores) - 2;
  var max = Math.max(...scores) + 2;
  var range = max - min || 1;
  var points = scores.map((s, i) => {
    var x = (i / (scores.length - 1)) * w;
    var y = h - ((s - min) / range) * h;
    return x + ',' + y;
  }).join(' ');
  container.innerHTML = '<svg width="' + w + '" height="' + h + '">' +
    '<polyline points="' + points + '" fill="none" stroke="var(--accent-purple)" stroke-width="2"/>' +
    '</svg>';
}
```

### 1b. "Above Your Level" Word Highlighting

In the POS tag stacks (left side of vocabPanel), color-code words:
- Words at or below session GSE level → normal color
- Words 1 CEFR band above → **bold + gold glow**
- Words 2+ CEFR bands above → **bold + red glow**

Implementation: After getting the batch lookup, compare each word's level
to the overall session GSE. Apply CSS classes `.cefr-at-level`, `.cefr-above`,
`.cefr-way-above`.

### 1c. Live GSE Mini-Badge in Caption Box

Add a small badge near the timer/mic indicators in the caption box:
```
┌─────────────────────────────────────┐
│  ● REC   00:23   GSE 34 (A2)  │     │
└─────────────────────────────────────┘
```
Updates on each finalized sentence. Shows the running average GSE.

---

## COMPONENT 2: New Slide 5 — Topic Explorer (`topicPanel`)

**Where:** Add a 5th `.h-panel` div after `#grammarCorrectPanel`.

**Add a 5th dot to the navigation:**
```html
<div class="slide-dot" data-slide="4" title="Topics">
  <i class="fa-solid fa-tags"></i>
  <span>Topics</span>
</div>
```
(Update the `data-slide` attributes and any JS that references slide indices.)

### Layout: Split 50/50

**Left side (50%):** Topic Donut Chart
- Fetch `POST /api/cefr/analyze` with ALL accumulated transcript text
- Response includes `topicDistribution`: `{ "Food and drink": 45, "Travel": 12, ... }`
- Render as a colored donut chart (hand-rolled SVG, no chart library needed — 
  the project already avoids chart libraries per AGENTS.md)
- Each segment clickable → filters the right side list
- Legend below with topic name + count + percentage

**Right side (50%):** Word List by Topic
- Default: show words from the largest topic in the donut
- Each word card: word, POS tag, CEFR level badge (color-coded), frequency bar
- Sort toggle: by frequency (most common first) or by level (hardest first)
- Search/filter input to find specific words

**How the donut chart is built (pure SVG, no library):**
```javascript
function drawDonut(topics, container) {
  var total = Object.values(topics).reduce((a,b) => a+b, 0);
  var colors = ['#a855f7','#3b82f6','#22c55e','#eab308','#f97316','#ef4444',
                '#8b5cf6','#06b6d4','#84cc16','#f59e0b','#f43f5e'];
  var cx = 100, cy = 100, r = 70, strokeWidth = 30;
  var circumference = 2 * Math.PI * r;
  var offset = 0;
  var paths = '';
  var legendItems = '';
  var i = 0;
  for (var [topic, count] of Object.entries(topics).sort((a,b) => b[1]-a[1])) {
    var pct = count / total;
    var dash = pct * circumference;
    var color = colors[i % colors.length];
    paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + 
      '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth +
      '" stroke-dasharray="' + dash + ' ' + (circumference - dash) +
      '" stroke-dashoffset="' + (-offset) + '" style="cursor:pointer" ' +
      'data-topic="' + topic + '"/>';
    legendItems += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">' +
      '<span style="width:12px;height:12px;border-radius:3px;background:' + color + '"></span>' +
      '<span style="flex:1">' + topic + '</span>' +
      '<span style="font-weight:600">' + count + '</span>' +
      '<span style="color:var(--text-secondary)">' + Math.round(pct*100) + '%</span></div>';
    offset += dash;
    i++;
  }
  container.innerHTML = 
    '<div style="display:flex;align-items:center;gap:20px">' +
    '<svg width="200" height="200">' + paths + '</svg>' +
    '<div style="flex:1;max-height:230px;overflow-y:auto">' + legendItems + '</div>' +
    '</div>';
  // Add click handlers to filter right-side list
}
```

### Update trigger:
Call `POST /api/cefr/analyze` with the accumulated transcript each time the user
switches to this slide (debounced: max once per 30 seconds). Cache the result.

---

## COMPONENT 3: Word Frequency Rarity Indicator

**Where:** In the caption box or as a subtle UI element visible during captioning.

**What:** When a rare word (low frequency_count in the DB) appears in the transcript,
show a subtle sparkle or highlight effect. This draws attention to "interesting" 
vocabulary.

**Implementation:**
- After each batch lookup, check if any word has frequency_count < 1000
- If yes, briefly highlight that word in the transcript with a CSS animation
- Store "rare words spotted" in a set to avoid re-highlighting duplicates

**CSS:**
```css
.word-rare { animation: rarePulse 1.5s ease-out; }
@keyframes rarePulse {
  0% { text-shadow: 0 0 8px var(--accent-amber); }
  100% { text-shadow: 0 0 0 transparent; }
}
```

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Slide index update:** Adding a 5th slide means updating:
   - The `data-slide` attributes on all dots
   - Any JS that references slide counts (search for `.h-panel` or `data-slide`)
   - The mobile scroll behavior (may need CSS adjustments)

2. **API rate limiting:** The `/api/cefr/batch` endpoint should be called
   at most once per finalized sentence. Do NOT call on interim results.
   Debounce to max 1 call per 2 seconds.

3. **Language gating:** Check `LANGUAGE_CAPABILITIES` before making API calls.
   The CEFR API only works for English. For Italian/Spanish/etc., hide the
   GSE badge and topic slide. Show "English only" placeholder.

4. **Cache the batch results:** Words repeat across sentences. Maintain a
   `sessionWordCache` Map that accumulates all looked-up words. Only send
   NEW words to the API. This dramatically reduces API calls.

5. **Script loading:** Add `<script src="js/cefr-gse.js"></script>` after the
   existing script tags. The module is already verified with `node --check`.

6. **Fullscreen mode:** When in fullscreen (`body.fullscreen-active`), the
   GSE badge should still be visible. Add it to the caption box itself,
   not the topbar (which is hidden in fullscreen).
