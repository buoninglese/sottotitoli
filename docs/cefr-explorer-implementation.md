# CEFR Explorer — Brutalist Card UI Implementation
# ==================================================
# Drop-in patch for panoramica.html
# Replaces the old table-based CEFR Explorer (lines ~8280–8400)
# with Vocabulary Builder-style brutalist cards.
#
# PREREQUISITES: The Render API at /api/cefr/* must be live
# (already deployed — https://sottotitoli-websocket.onrender.com/api/cefr)
# ==================================================

---

## VERIFIED: All 39 CEFR Categories (from production API)

```
 1. Adjectives: personality, description, feelings
 2. Arts
 3. Books and literature
 4. Clothes
 5. Collocation
 6. Colours
 7. Daily life
 8. Dimensions
 9. Education
10. Family life
11. Film
12. Food and drink
13. Free time, entertainment
14. Health and body care
15. Hobbies and lifestyles
16. Hobbies and pastimes
17. Holidays
18. House and home, environment
19. Idiomatic expressions
20. Language
21. Leisure activities
22. Media
23. Nationalities and countries
24. News, lifestyles and current affairs
25. Objects and rooms
26. Personal identification
27. Personal information
28. Places
29. Relations with other people
30. Scientific development
31. Services
32. Shopping
33. Technical and legal language
34. Things in the town, shops and shopping
35. Travel
36. Travel and services vocab
37. Ways of travelling
38. Weather
39. Work and jobs
```

The drop-in patch calls `GET /api/cefr/categories` at runtime — it dynamically renders ALL 39 categories from the live API. No hardcoded topic names in the production code.

---

## CSS SPEC (exact values)

### Spacing

| Element | Property | Value |
|---------|----------|-------|
| Card padding | `padding` | `16px` |
| Card min-height | `min-height` | `160px` |
| Card border | `border` | `2px solid #000` |
| Card shadow | `box-shadow` | `4px 4px 0 rgba(0,0,0,0.12)` |
| Card hover shadow | `box-shadow` | `6px 6px 0 rgba(0,0,0,0.22)` |
| Card hover lift | `transform` | `translate(-2px, -2px)` |
| Grid gap | `gap` | `16px` |
| Grid min column | `minmax` | `220px` |
| Pill padding | `padding` | `14px` |
| Pill grid gap | `gap` | `12px` |
| Pill min column | `minmax` | `180px` |
| Pill shadow | `box-shadow` | `3px 3px 0 rgba(0,0,0,0.08)` |
| Pill hover shadow | `box-shadow` | `5px 5px 0 rgba(0,0,0,0.14)` |
| Save button | `width/height` | `36px × 36px` |
| Save button font | `font-size` | `18px` |
| Frequency bar height | `height` | `4px` |
| Frequency bar border | `border` | `1px solid #000` |
| CEFR left border | `border-left` | `6px solid <color>` |

### Typography

| Element | Class | `font-size` | `font-weight` | Other |
|---------|-------|-------------|---------------|-------|
| Word | `.wbx-w` | `1.25rem` | `900` | `letter-spacing:-0.02em`, `text-transform:lowercase` |
| POS | `.wbx-pos` | `0.85rem` | `600` | `color:#6b7280`, uppercase |
| IPA | `.wbx-ipa` | `0.85rem` | — | `font-family:monospace`, `color:#6b7280` |
| Definition | `.wbx-def` | `0.85rem` | — | `line-height:1.35`, 3-line clamp |
| CEFR badge | `.wbx-cefr` | `0.7rem` | `900` | `border:2px solid #000` |
| Freq label | `.freq-label` | `0.7rem` | `600` | `color:#6b7280` |
| Pill name | `.pill-name` | `1.05rem` | `800` | — |
| Pill meta | `.pill-meta` | `0.8rem` | — | `color:#6b7280` |

### CEFR Colors

| Level | Left border | Badge bg (light) | Badge text |
|-------|-------------|------------------|------------|
| A1 | `#34d399` | `#34d399` | `#064e3b` |
| A2 | `#10b981` | `#a7f3d0` | `#064e3b` |
| B1 | `#059669` | `#fb923c` | `#431407` |
| B2 | `#047857` | `#fdba74` | `#431407` |
| C1 | `#064e3b` | `#fda4af` | `#500724` |
| C2 | `#0e7490` | `#06b6d4` | `#083344` |

### 8 Color Schemes (data-wb-scheme)

| Scheme | `--s-bg` | `--s-accent` |
|--------|----------|--------------|
| 0 (Sky) | `#dbeafe` | `#0369a1` |
| 1 (Indigo) | `#e0e7ff` | `#4338ca` |
| 2 (Sky alt) | `#e0f2fe` | `#0369a1` |
| 3 (Ocean) | `#cffafe` | `#0e7490` |
| 4 (Forest) | `#d1fae5` | `#047857` |
| 5 (Violet) | `#ede9fe` | `#6d28d9` |
| 6 (Amber) | `#fef3c7` | `#b45309` |
| 7 (Rose) | `#ffe4e6` | `#be185d` |

---

## ANTI-PATTERNS (do NOT do these)

| Anti-pattern | Why it breaks |
|--------------|---------------|
| `innerHTML +=` in a loop | Re-parses entire container, destroys event listeners, O(n²) slowdown |
| Calling `getUserVocabularySet()` per category/word | 39× Supabase round-trips |
| Fetching definitions for 40 cards at once | Rate-limit / waterfall latency |
| Mixing `display:flex` and `display:grid` on same container class | Layout thrashing |
| Using `filter:invert()` for dark mode | Colors invert unpredictably |

---

## IMPLEMENTATION STEPS

### Step 1: Replace HTML
Find the existing CEFR Explorer panel `<div>` in `panoramica.html` (around line ~2006 where `<!-- ═══ CEFR Explorer ═══ -->` appears). Replace the entire panel div with the HTML from the Drop-in Patch below.

### Step 2: Append CSS
Add the CSS block from the Drop-in Patch to the existing `<style>` section. If your Vocabulary Builder panel already has `.wbx-box` and `.wbx-grid` defined globally, check for conflicts — if cards render differently between panels, scope the CEFR rules under `#pnl-cefr-explorer`.

### Step 3: Replace JS
Find the block starting around line ~8280 (`// ── Topic Browser ──` through `loadCefrFrequencies`). Replace the entire block with the JS from the Drop-in Patch below.

### Step 4: Verify
1. Open `panoramica.html` in browser
2. Click CEFR Explorer in sidebar → confirm 39 topic pills appear
3. Click a pill → confirm word cards render with CEFR colors
4. Switch to Tab B → confirm family cards render
5. Switch to Tab C → confirm gap sections appear
6. Check console for errors

---

## DROP-IN PATCH (HTML + CSS + JS)

### HTML (replace existing CEFR panel div)

```html
        <!-- ═══ CEFR Explorer (Brutalist Card Redesign) ═══ -->
        <div class="content-panel" id="pnl-cefr-explorer" data-wb-scheme="0">
          <div class="cefr-topbar">
            <h1>🧭 CEFR Explorer</h1>
            <div style="flex:1"></div>
            <label style="font-weight:700;font-size:0.9rem">My Level:</label>
            <select id="cefrMyLevel" onchange="refreshCefrAll()">
              <option>A1</option><option>A2</option><option selected>B1</option>
              <option>B2</option><option>C1</option><option>C2</option>
            </select>
            <div class="cefr-scheme-dots" id="cefrSchemeDots"></div>
          </div>
          <div class="cefr-tabs">
            <button class="cefr-tab active" onclick="switchCefrTab('a')">Suggested by Topic</button>
            <button class="cefr-tab" onclick="switchCefrTab('b')">Suggested by Your Sessions</button>
            <button class="cefr-tab" onclick="switchCefrTab('c')">Your Vocabulary Gaps</button>
          </div>
          <div class="cefr-panel active" id="cefr-tab-a">
            <div class="cefr-toolbar">
              <div class="cefr-seg">
                <button class="active" onclick="filterCefrTopics('relevant')">Relevant to me</button>
                <button onclick="filterCefrTopics('all')">All topics</button>
              </div>
              <input type="text" id="cefrTopicSearch" placeholder="Search topics…" oninput="renderCefrTopicList()">
            </div>
            <div id="cefr-topic-pills" class="cefr-pill-grid"></div>
            <div id="cefr-topic-header" class="cefr-section-title" style="display:none">Words in <span id="cefr-active-topic"></span></div>
            <div id="cefr-word-grid" class="wbx-grid"></div>
          </div>
          <div class="cefr-panel" id="cefr-tab-b">
            <div class="cefr-toolbar">
              <div class="cefr-seg">
                <button class="active" onclick="filterCefrFamilySource('sessions')">From popular roots</button>
                <button onclick="filterCefrFamilySource('search')">Search</button>
              </div>
              <input type="text" id="cefr-family-input" placeholder="Type a lemma…" style="display:none" onkeydown="if(event.key==='Enter')searchCefrFamily()">
              <button class="cefr-primary" onclick="surpriseCefrFamily()">🎲 Surprise me</button>
            </div>
            <div id="cefr-family-hint" style="margin-bottom:8px;color:var(--text-muted);font-size:0.9rem">Popular English word families to explore.</div>
            <div id="cefr-family-grid" class="wbx-grid"></div>
          </div>
          <div class="cefr-panel" id="cefr-tab-c">
            <div class="cefr-gap-header">
              <div><strong style="font-size:1.1rem">Words just outside your comfort zone</strong></div>
              <select id="cefrGapSort" onchange="loadCefrFrequencies()">
                <option value="freq-desc">Most frequent first</option>
                <option value="freq-asc">Rare first</option>
              </select>
            </div>
            <div id="cefr-gap-sections"></div>
          </div>
        </div>
```

### CSS (append to existing `<style>` block)

```css
/* ═══ CEFR Explorer Brutalist Cards ═══ */
#pnl-cefr-explorer { font-family:system-ui,-apple-system,sans-serif; color:#111827; }
#pnl-cefr-explorer .cefr-topbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:16px 20px;background:var(--card,#fff);border-bottom:2px solid #000;position:sticky;top:0;z-index:10}
#pnl-cefr-explorer .cefr-topbar h1{margin:0;font-size:1.25rem;letter-spacing:-.02em}
#pnl-cefr-explorer .cefr-scheme-dots{display:flex;gap:6px}
#pnl-cefr-explorer .cefr-scheme-dots .dot{width:18px;height:18px;border-radius:50%;border:2px solid #000;cursor:pointer}
#pnl-cefr-explorer .cefr-scheme-dots .dot.active{outline:2px solid #000;outline-offset:2px}
#pnl-cefr-explorer .cefr-tabs{display:flex;gap:0;border-bottom:2px solid #000;background:var(--card,#fff);padding:0 20px}
#pnl-cefr-explorer .cefr-tab{padding:12px 18px;border:none;background:transparent;border-right:2px solid #000;cursor:pointer;font-weight:700;font-size:.9rem}
#pnl-cefr-explorer .cefr-tab.active{background:#000;color:#fff}
#pnl-cefr-explorer .cefr-panel{display:none;padding:20px}
#pnl-cefr-explorer .cefr-panel.active{display:block}
#pnl-cefr-explorer .cefr-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
#pnl-cefr-explorer .cefr-seg{display:inline-flex;border:2px solid #000;background:#fff}
#pnl-cefr-explorer .cefr-seg button{border:none;background:transparent;border-right:2px solid #000;padding:6px 14px;cursor:pointer;font-weight:600;font-size:.85rem}
#pnl-cefr-explorer .cefr-seg button:last-child{border-right:none}
#pnl-cefr-explorer .cefr-seg button.active{background:#000;color:#fff}
#pnl-cefr-explorer input[type="text"],#pnl-cefr-explorer select{border:2px solid #000;padding:6px 10px;background:#fff;font-weight:600}
#pnl-cefr-explorer button.cefr-primary{border:2px solid #000;background:#000;color:#fff;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;box-shadow:3px 3px 0 rgba(0,0,0,.15)}
#pnl-cefr-explorer .cefr-pill-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:24px}
#pnl-cefr-explorer .topic-pill{border:2px solid #000;padding:14px;cursor:pointer;text-align:left;background:#fff;box-shadow:3px 3px 0 rgba(0,0,0,.08);transition:transform .06s,box-shadow .06s;position:relative}
#pnl-cefr-explorer .topic-pill:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 rgba(0,0,0,.14)}
#pnl-cefr-explorer .pill-name{font-weight:800;font-size:1.05rem;margin-bottom:4px}
#pnl-cefr-explorer .pill-meta{font-size:.8rem;color:#6b7280}
#pnl-cefr-explorer .pill-new{position:absolute;top:-8px;right:-8px;background:#be185d;color:#fff;border:2px solid #000;font-size:.75rem;font-weight:800;padding:2px 8px;box-shadow:2px 2px 0 rgba(0,0,0,.15)}
#pnl-cefr-explorer .wbx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
#pnl-cefr-explorer .wbx-box{border:2px solid #000;padding:16px;position:relative;display:flex;flex-direction:column;min-height:160px;background:#fff;box-shadow:4px 4px 0 rgba(0,0,0,.12);transition:transform .08s,box-shadow .08s}
#pnl-cefr-explorer .wbx-box:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 rgba(0,0,0,.22)}
#pnl-cefr-explorer .wbx-box[data-cefr="A1"]{border-left:6px solid #34d399}
#pnl-cefr-explorer .wbx-box[data-cefr="A2"]{border-left:6px solid #10b981}
#pnl-cefr-explorer .wbx-box[data-cefr="B1"]{border-left:6px solid #059669}
#pnl-cefr-explorer .wbx-box[data-cefr="B2"]{border-left:6px solid #047857}
#pnl-cefr-explorer .wbx-box[data-cefr="C1"]{border-left:6px solid #064e3b}
#pnl-cefr-explorer .wbx-box[data-cefr="C2"]{border-left:6px solid #0e7490}
#pnl-cefr-explorer .wbx-word-zone{flex:1;padding-right:36px}
#pnl-cefr-explorer .wbx-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
#pnl-cefr-explorer .wbx-w{font-weight:900;font-size:1.25rem;letter-spacing:-.02em;text-transform:lowercase}
#pnl-cefr-explorer .wbx-cefr{font-size:.7rem;font-weight:900;padding:2px 8px;border:2px solid #000;display:inline-block}
#pnl-cefr-explorer .wbx-cefr[data-level="A1"]{background:#34d399;color:#064e3b}
#pnl-cefr-explorer .wbx-cefr[data-level="A2"]{background:#a7f3d0;color:#064e3b}
#pnl-cefr-explorer .wbx-cefr[data-level="B1"]{background:#fb923c;color:#431407}
#pnl-cefr-explorer .wbx-cefr[data-level="B2"]{background:#fdba74;color:#431407}
#pnl-cefr-explorer .wbx-cefr[data-level="C1"]{background:#fda4af;color:#500724}
#pnl-cefr-explorer .wbx-cefr[data-level="C2"]{background:#06b6d4;color:#083344}
#pnl-cefr-explorer .wbx-pos{font-size:.85rem;font-weight:600;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
#pnl-cefr-explorer .wbx-ipa{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.85rem;color:#6b7280;margin-bottom:6px}
#pnl-cefr-explorer .wbx-def{font-size:.85rem;line-height:1.35;color:#111827;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
#pnl-cefr-explorer .freq-bar{height:4px;background:#e5e7eb;border:1px solid #000;margin-top:10px;display:flex}
#pnl-cefr-explorer .freq-bar>i{height:100%;background:#000;display:block;border-right:1px solid #000}
#pnl-cefr-explorer .freq-label{font-size:.7rem;margin-top:4px;color:#6b7280;font-weight:600}
#pnl-cefr-explorer .wbx-save-col{position:absolute;top:0;right:0;display:flex;flex-direction:column;border-left:2px solid #000;border-bottom:2px solid #000}
#pnl-cefr-explorer .wbx-save-col button{width:36px;height:36px;background:transparent;border:none;border-bottom:2px solid #000;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
#pnl-cefr-explorer .wbx-save-col button:last-child{border-bottom:none}
#pnl-cefr-explorer .wbx-save-col button:hover{background:rgba(0,0,0,.06)}
#pnl-cefr-explorer .wbx-save-col button.saved{background:var(--s-accent,#000);color:#fff}
#pnl-cefr-explorer .cefr-section-title{font-weight:800;font-size:1.05rem;margin:24px 0 12px;display:flex;align-items:center;gap:8px}
#pnl-cefr-explorer .cefr-section-title .count{background:#000;color:#fff;padding:2px 8px;font-size:.8rem}
#pnl-cefr-explorer .cefr-empty{border:2px dashed #000;padding:40px;text-align:center;background:#fff}
#pnl-cefr-explorer .cefr-empty h3{margin:0 0 8px}
#pnl-cefr-explorer .cefr-gap-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px}
#pnl-cefr-explorer[data-wb-scheme="0"] .wbx-box{background:#dbeafe}
#pnl-cefr-explorer[data-wb-scheme="1"] .wbx-box{background:#e0e7ff}
#pnl-cefr-explorer[data-wb-scheme="2"] .wbx-box{background:#e0f2fe}
#pnl-cefr-explorer[data-wb-scheme="3"] .wbx-box{background:#cffafe}
#pnl-cefr-explorer[data-wb-scheme="4"] .wbx-box{background:#d1fae5}
#pnl-cefr-explorer[data-wb-scheme="5"] .wbx-box{background:#ede9fe}
#pnl-cefr-explorer[data-wb-scheme="6"] .wbx-box{background:#fef3c7}
#pnl-cefr-explorer[data-wb-scheme="7"] .wbx-box{background:#ffe4e6}
```

### JavaScript (replace lines ~8280–8400 — ALL FIXES APPLIED)

```javascript
/* ═══════════════════════════════════════
   CEFR Explorer — Brutalist Card Refactor v2 (all review fixes applied)
   - Single /api/cefr/gaps endpoint replaces 39 parallel fetches
   - Real morphology via /api/cefr/word-family (no mock "analyzely")
   - Frequency label uses formatted count (80.2M), not raw int
   - Promise-lock on getUserVocabularySet prevents duplicate auth
   - Fetch nonce guards against stale renders on rapid tab switching
   - Sort stability: secondary key on word name
   - Pill word counts from API's new word_count field
   ═══════════════════════════════════════ */
var _cefrVocabCache = null;
var _cefrVocabPromise = null;  // deduplicate in-flight auth
var _cefrTopicFilter = 'relevant';
var _cefrFamilySource = 'sessions';
var _cefrCurrentScheme = 0;
var _cefrFetchNonce = 0;       // stale-render guard
var CEFR_LEVEL_ORDER = {A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
function cefrLevelNum(l){return CEFR_LEVEL_ORDER[l]||3}

async function getUserVocabularySet(){
  if(_cefrVocabCache)return _cefrVocabCache;
  if(_cefrVocabPromise)return _cefrVocabPromise;
  _cefrVocabPromise = (async function(){
    var sb=window.sottotitoliSupabase;
    if(!sb)return new Set();
    var r=await sb.auth.getSession();
    if(!r.data||!r.data.session)return new Set();
    var uid=r.data.session.user.id;
    var d=await sb.from('user_vocabulary').select('lemma').eq('user_id',uid).eq('lang','en');
    return new Set((d.data||[]).map(function(w){return w.lemma.toLowerCase()}))
  })();
  _cefrVocabCache = await _cefrVocabPromise;
  _cefrVocabPromise = null;
  return _cefrVocabCache
}
function invalidateCefrVocabCache(){_cefrVocabCache=null;_cefrVocabPromise=null}

function esc(t){return String(t).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}
function escA(t){return esc(t).replace(/'/g,\"\\\\'\")}
function fmtFreq(n){if(!n||n<1000)return String(n||0);if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e3)return (n/1e3).toFixed(1)+'K';return String(n)}

function renderCefrCard(w,knownSet){
  var n=document.createElement('div');n.className='wbx-box';
  var cefr=w.level||w.cefr||'B1',pos=w.tag||w.pos||'noun',word=w.word||w.lemma||'unknown';
  var freq=w.frequency_count||w.freq||0,ipa=w.ipa||'',def=w.def||'';
  n.setAttribute('data-cefr',cefr);n.setAttribute('data-pos',pos);
  var saved=knownSet&&knownSet.has(word.toLowerCase())?'saved':'';
  var pct=Math.max(4,Math.min(100,Math.round(Math.log10(Math.max(freq,1))*10)));
  n.innerHTML='<div class=\"wbx-word-zone\"><div class=\"wbx-header\"><span class=\"wbx-w\">'+esc(word)+'</span><span class=\"wbx-cefr\" data-level=\"'+esc(cefr)+'\">'+esc(cefr)+'</span></div><div class=\"wbx-pos\">'+esc(pos)+'</div>'+(ipa?'<div class=\"wbx-ipa\">'+esc(ipa)+'</div>':'')+(def?'<div class=\"wbx-def\">'+esc(def)+'</div>':'')+'<div class=\"freq-bar\"><i style=\"width:'+pct+'%\"></i></div><div class=\"freq-label\">'+fmtFreq(freq)+'</div></div><div class=\"wbx-save-col\"><button class=\"wbx-save-btn '+saved+'\" onclick=\"toggleCefrSave(\\''+escA(word)+'\\',this)\">+</button><button class=\"wbx-bookmark-btn\" onclick=\"toggleCefrBookmark(this)\">☆</button></div>';
  return n
}

/* --- Tab A: Topics --- */
function loadCefrTopics(){
  var w=document.getElementById('cefr-topic-pills');if(!w)return;
  w.innerHTML='<div class=\"cefr-empty\"><h3>Loading topics…</h3></div>';
  getUserVocabularySet().then(function(k){
    var api=(window.SOTTOTITOLI_CONFIG&&window.SOTTOTITOLI_CONFIG.cefrApiUrl)||'/api/cefr';
    fetch(api+'/categories?counts=1').then(function(r){return r.json()}).then(function(cats){
      window._cefrCategories=cats||[];renderCefrTopicList()
    }).catch(function(){w.innerHTML='<div class=\"cefr-empty\"><h3>Error loading topics.</h3></div>'})
  })
}
function renderCefrTopicList(){
  var w=document.getElementById('cefr-topic-pills');
  var q=(document.getElementById('cefrTopicSearch')||{}).value||'';q=q.trim().toLowerCase();
  var cats=window._cefrCategories||[],kn=_cefrVocabCache||new Set();
  w.innerHTML='';
  cats.forEach(function(c){
    if(q&&c.category_title&&!c.category_title.toLowerCase().includes(q))return;
    var id=c.category_id,title=c.category_title||'Topic',wc=c.word_count||0;
    var pill=document.createElement('div');pill.className='topic-pill';
    pill.innerHTML='<div class=\"pill-name\">'+esc(title)+'</div><div class=\"pill-meta\">'+wc+' words</div>';
    pill.onclick=function(){openCefrTopic(id,title)};
    w.appendChild(pill)
  })
}
function filterCefrTopics(mode){
  _cefrTopicFilter=mode;
  document.querySelectorAll('#cefr-tab-a .cefr-seg button').forEach(function(b){b.classList.toggle('active',b.textContent.toLowerCase().indexOf(mode)>=0)});
  renderCefrTopicList()
}
function openCefrTopic(id,title){
  var g=document.getElementById('cefr-word-grid'),h=document.getElementById('cefr-topic-header'),nm=document.getElementById('cefr-active-topic');
  if(h)h.style.display='flex';if(nm)nm.textContent=title||'';if(!g)return;
  g.innerHTML='';
  var api=(window.SOTTOTITOLI_CONFIG&&window.SOTTOTITOLI_CONFIG.cefrApiUrl)||'/api/cefr';
  getUserVocabularySet().then(function(k){
    fetch(api+'/category/'+encodeURIComponent(id)).then(function(r){return r.json()}).then(function(words){
      var f=document.createDocumentFragment();g.innerHTML='';
      words.forEach(function(w){f.appendChild(renderCefrCard(w,k))});g.appendChild(f)
    })
  })
}
function renderCefrWords(arr,knownSet){
  var g=document.getElementById('cefr-word-grid');if(!g)return;
  var words=Array.isArray(arr)?arr:(window.cefrWordsData||[]);
  g.innerHTML='';var f=document.createDocumentFragment();
  words.forEach(function(w){f.appendChild(renderCefrCard(w,knownSet))});g.appendChild(f)
}

/* --- Tab B: Word Family --- */
function searchCefrFamily(){
  var inp=document.getElementById('cefr-family-input'),lemma=inp?inp.value.trim():'';
  if(!lemma)return;var g=document.getElementById('cefr-family-grid');if(!g)return;
  g.innerHTML='<div class=\"cefr-empty\"><h3>Searching…</h3></div>';
  var api=(window.SOTTOTITOLI_CONFIG&&window.SOTTOTITOLI_CONFIG.cefrApiUrl)||'/api/cefr';
  getUserVocabularySet().then(function(k){
    fetch(api+'/word-family?lemma='+encodeURIComponent(lemma)).then(function(r){return r.json()}).then(function(words){
      g.innerHTML='';var f=document.createDocumentFragment();
      if(!words.length){g.innerHTML='<div class=\"cefr-empty\"><h3>No family found.</h3></div>';return}
      words.forEach(function(w){f.appendChild(renderCefrCard(w,k))});g.appendChild(f)
    })
  })
}
function filterCefrFamilySource(mode){
  _cefrFamilySource=mode;
  var s=document.getElementById('cefr-family-input'),h=document.getElementById('cefr-family-hint');
  if(s)s.style.display=mode==='search'?'inline-block':'none';
  if(h)h.style.display=mode==='sessions'?'block':'none';
  if(mode==='sessions')loadCefrSessionFamily()
}
function loadCefrSessionFamily(){
  var roots=['communicate','analyze','develop','create','structure','environment','strategy','identify','produce','establish'];
  var g=document.getElementById('cefr-family-grid');if(!g)return;
  g.innerHTML='<div class=\"cefr-empty\"><h3>Loading family trees…</h3></div>';
  var api=(window.SOTTOTITOLI_CONFIG&&window.SOTTOTITOLI_CONFIG.cefrApiUrl)||'/api/cefr';
  getUserVocabularySet().then(function(k){
    g.innerHTML='';var f=document.createDocumentFragment(),pending=roots.length;
    roots.forEach(function(root){
      fetch(api+'/word-family?lemma='+encodeURIComponent(root)).then(function(r){return r.json()}).then(function(words){
        if(words&&words.length)words.forEach(function(w){f.appendChild(renderCefrCard(w,k))});
        pending--;if(pending===0&&!f.children.length)g.innerHTML='<div class=\"cefr-empty\"><h3>No families found.</h3><p>Try searching for a word instead.</p></div>';
      }).catch(function(){pending--})
    })
  })
}
function surpriseCefrFamily(){
  var pool=['communicate','analyze','develop','create','structure','environment','strategy','identify','produce','establish'];
  getUserVocabularySet().then(function(k){
    var unseen=pool.filter(function(w){return!k.has(w.toLowerCase())});
    var pick=(unseen.length?unseen:pool)[Math.floor(Math.random()*(unseen.length||pool.length))];
    var inp=document.getElementById('cefr-family-input');if(inp)inp.value=pick;
    searchCefrFamily()
  })
}

/* --- Tab C: Gaps (single endpoint — no 39 fetches) --- */
function loadCefrFrequencies(){
  var w=document.getElementById('cefr-gap-sections');if(!w)return;
  w.innerHTML='<div class=\"cefr-empty\"><h3>Analyzing gaps…</h3></div>';
  var ul=document.getElementById('cefrMyLevel').value,un=cefrLevelNum(ul);
  var sm=document.getElementById('cefrGapSort').value;
  var lv=['A1','A2','B1','B2','C1','C2'],below=lv[un-2],above=lv[un];
  var nonce=++_cefrFetchNonce;
  var api=(window.SOTTOTITOLI_CONFIG&&window.SOTTOTITOLI_CONFIG.cefrApiUrl)||'/api/cefr';
  Promise.all([
    getUserVocabularySet(),
    fetch(api+'/gaps?below='+(below||'')+'&above='+(above||'')).then(function(r){return r.json()})
  ]).then(function(r){
    if(nonce!==_cefrFetchNonce)return;
    var kn=r[0],data=r[1];
    function sorter(pool){
      if(sm==='freq-desc')pool.sort(function(a,b){var fa=a.frequency_count||0,fb=b.frequency_count||0;return fb!==fa?fb-fa:(a.word||'').localeCompare(b.word||'')});
      else if(sm==='freq-asc')pool.sort(function(a,b){var fa=a.frequency_count||0,fb=b.frequency_count||0;return fa!==fb?fa-fb:(a.word||'').localeCompare(b.word||'')});
      else if(sm==='alpha')pool.sort(function(a,b){return(a.word||'').localeCompare(b.word||'')});
    }
    function renderSection(title,arr,icon){
      if(!arr||!arr.length)return null;
      var pool=arr.filter(function(x){return x.word&&!kn.has(x.word.toLowerCase())});
      if(!pool.length)return null;
      sorter(pool);
      var h=document.createElement('div');h.className='cefr-section-title';
      h.innerHTML=icon+' '+title+' <span class=\"count\">'+pool.length+'</span>';
      var g=document.createElement('div');g.className='wbx-grid';
      var f=document.createDocumentFragment();pool.forEach(function(x){f.appendChild(renderCefrCard(x,kn))});g.appendChild(f);
      var b=document.createElement('div');b.appendChild(h);b.appendChild(g);return b
    }
    w.innerHTML='';var any=false;
    if(data.below){var n=renderSection(below+' words you might have missed',data.below,'📊');if(n){w.appendChild(n);any=true}}
    if(data.above){var n=renderSection(above+' words to stretch toward',data.above,'🚀');if(n){w.appendChild(n);any=true}}
    if(!any)w.innerHTML='<div class=\"cefr-empty\"><h3>No gaps detected!</h3><p>Try adjusting your level or explore topics.</p></div>'
  })
}

/* --- Save wiring --- */
async function toggleCefrSave(word,btn){
  var wd=word.toLowerCase(),kn=await getUserVocabularySet(),sb=window.sottotitoliSupabase;
  if(kn.has(wd)){
    if(sb){var r=await sb.auth.getSession();if(r.data&&r.data.session)await sb.from('user_vocabulary').delete().eq('user_id',r.data.session.user.id).eq('lemma',wd).eq('lang','en')}
    kn.delete(wd);btn.classList.remove('saved')
  }else{
    if(sb){var r=await sb.auth.getSession();if(r.data&&r.data.session)await sb.from('user_vocabulary').insert({user_id:r.data.session.user.id,lemma:wd,lang:'en',created_at:new Date().toISOString()})}
    kn.add(wd);btn.classList.add('saved')
  }
  invalidateCefrVocabCache();refreshCefrAll()
}
function toggleCefrBookmark(btn){btn.textContent=btn.textContent==='☆'?'★':'☆'}

function refreshCefrAll(){
  if(document.getElementById('cefr-tab-a')&&document.getElementById('cefr-tab-a').classList.contains('active')){renderCefrTopicList();var g=document.getElementById('cefr-word-grid');if(g&&g.children.length){}}
  if(document.getElementById('cefr-tab-b')&&document.getElementById('cefr-tab-b').classList.contains('active'))filterCefrFamilySource(_cefrFamilySource);
  if(document.getElementById('cefr-tab-c')&&document.getElementById('cefr-tab-c').classList.contains('active'))loadCefrFrequencies()
}
function switchCefrTab(name){
  var idx={'a':0,'b':1,'c':2}[name];if(idx===undefined)return;
  document.querySelectorAll('#pnl-cefr-explorer .cefr-tab').forEach(function(b,i){b.classList.toggle('active',i===idx)});
  document.querySelectorAll('#pnl-cefr-explorer .cefr-panel').forEach(function(p,i){p.classList.toggle('active',i===idx)});
  if(name==='a')loadCefrTopics();if(name==='b')filterCefrFamilySource('sessions');if(name==='c')loadCefrFrequencies()
}

function renderCefrSchemeDots(){
  var w=document.getElementById('cefrSchemeDots');if(!w)return;w.innerHTML='';
  var cols=['#0369a1','#4338ca','#0369a1','#0e7490','#047857','#6d28d9','#b45309','#be185d'];
  for(var i=0;i<8;i++){var d=document.createElement('div');d.className='dot'+(i===_cefrCurrentScheme?' active':'');d.style.background=cols[i];d.onclick=(function(ii){return function(){_cefrCurrentScheme=ii;document.getElementById('pnl-cefr-explorer').setAttribute('data-wb-scheme',ii);renderCefrSchemeDots()}})(i);w.appendChild(d)}
}

(function(){renderCefrSchemeDots();if(document.getElementById('cefr-tab-a')&&document.getElementById('cefr-tab-a').classList.contains('active'))loadCefrTopics()})();
```

---

## VERIFICATION CHECKLIST

After pasting the patch:
1. Save backup of `panoramica.html`
2. Comment out old `loadCefrTopics`…`loadCefrFrequencies` block
3. Open browser → click CEFR Explorer → confirm 39 pills render from API
4. Click a pill → confirm `.wbx-box` cards render with CEFR left-border colors
5. Tab B → type `happy` → confirm `/api/cefr/word-family` returns cards
6. Tab C → confirm gap sections appear with `📊` and `🚀` headers
7. Scheme dots → click each to confirm card background changes
8. Save button → click `+` on a card → confirm it toggles `saved` class
