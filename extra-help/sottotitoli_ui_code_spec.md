# Sottotitoli · Complete UI/Code Spec
## studio-caption.html · analysis.html · account.html
### Version for implementation agent — June 2026

This document is an implementation brief, not a design proposal.
Every change is specified with: target element, exact change, CSS/JS/HTML to write.
Do not change what is not listed. Do not invent new features.

---

# PART 1 — analysis.html

## Current state (from reading the live code)
- 3 sidebar tabs: Report (market), I miei report, FAQ
- Marketplace grid with band-based layout (included / unlockable / locked / core / premium)
- REPORT_CATALOG has 7 reports: snapshot, repeating, vocabulary, comprehensive, cefr, transfer, cambridge
- KPI row: reports generated, credits, sessions, avg score
- Session picker modal → generate → poller → view detail modal
- FAQ accordion, 8 items
- Cambridge report is in the catalog (must be removed per roadmap decision)
- No profile-completion nudge visible
- No insufficient-data state templates
- No multi-session selector for Repeating Errors (needs 3–5 sessions selected, not one)
- PDF download is currently a plain .txt export, not a real PDF
- Report detail modal renders raw `summary_text` with newlines → `<br>`, no structured sections
- No "readiness" states with dynamic messaging tied to actual session count

---

## analysis.html — Changes required

### CHANGE A1 — Remove Cambridge report from REPORT_CATALOG
**Location:** `var REPORT_CATALOG=[...]` in the `<script>` block.
**Action:** Delete the entire object `{id:'cambridge', ...}` from the array.
**Also remove:** `11:{icon:'🏅',name:'Cambridge Companion'}` from `REPORT_MODULES`.
**Reason:** No viable data source. Cutting per roadmap v2 decision.

---

### CHANGE A2 — Add profile-completion nudge banner
**Location:** Inside `<div class="cs active" id="cs-market">`, immediately after `.hero` div, before `.content-wrap`.
**Insert this block:**

```html
<div id="profileNudge" style="display:none;margin:0 32px 14px;padding:12px 16px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:12px;display:flex;align-items:center;gap:12px;font-size:12.5px">
  <span style="font-size:18px">👤</span>
  <div style="flex:1">
    <strong style="color:var(--amber)">Completa il tuo profilo</strong>
    <span style="color:var(--t2)"> · I report diventano più precisi e personalizzati quando conosci i tuoi obiettivi e il tuo contesto.</span>
  </div>
  <a href="account.html#tab-profile" style="font-size:11.5px;font-weight:700;color:var(--amber);white-space:nowrap;padding:6px 12px;border:1px solid rgba(251,191,36,.3);border-radius:8px;text-decoration:none">Completa ora →</a>
  <button onclick="this.parentElement.style.display='none';localStorage.setItem('nudge_dismissed','1')" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;padding:4px 6px">✕</button>
</div>
```

**JS to show/hide:** Add inside the `loadData` function, after user data loads:

```javascript
// Profile nudge
(async function checkProfileNudge(){
  if(localStorage.getItem('nudge_dismissed')) return;
  var profResp = await supabase.from('profiles').select('goal_primary,domain,feedback_preference').eq('id',userId).maybeSingle();
  var prof = profResp.data;
  var incomplete = !prof || !prof.goal_primary || !prof.domain;
  var nudge = document.getElementById('profileNudge');
  if(nudge) nudge.style.display = incomplete ? 'flex' : 'none';
})();
```

---

### CHANGE A3 — Multi-session picker for Repeating Errors and CEFR reports
**Problem:** Current modal picks one session. Repeating Errors needs 3–5 sessions. CEFR benefits from multi-session too.
**Location:** `function openModal(reportId)` and `function pickSession(...)` in `<script>`.

**Step 1 — Add `multiSession` flag to catalog entries:**
```javascript
// In REPORT_CATALOG, for id:'repeating':
multiSession: true, maxSessions: 5,
// For id:'cefr':
multiSession: true, maxSessions: 4,
```

**Step 2 — Modify `openModal` to branch on `multiSession`:**
```javascript
var multiMode = selectedReport.multiSession === true;
document.querySelector('.sess-pick-label').textContent = multiMode
  ? 'Scegli da 3 a ' + (selectedReport.maxSessions||5) + ' sessioni da confrontare:'
  : 'Scegli una sessione da analizzare:';
```

**Step 3 — Modify `sess-pick-item` to use checkboxes for multi-mode:**
In `openModal`, when building `sh`, replace the radio div with:
```javascript
var inputEl = multiMode
  ? '<div class="sp-radio sp-check" style="border-radius:4px"></div>'
  : '<div class="sp-radio"></div>';
```

**Step 4 — Replace `pickSession` with multi-aware version:**
```javascript
var selectedSessions = []; // replace single selectedSession for multi-reports

function pickSession(sid, el) {
  var report = selectedReport;
  if (!report.multiSession) {
    selectedSession = allSessions.find(function(s){ return s.id === sid; });
    document.querySelectorAll('#modSessions .sess-pick-item').forEach(function(x){ x.classList.remove('selected'); });
    el.classList.add('selected');
    document.getElementById('modBuyBtn').disabled = false;
    return;
  }
  // Multi mode
  var idx = selectedSessions.findIndex(function(s){ return s.id === sid; });
  if (idx >= 0) {
    selectedSessions.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    if (selectedSessions.length >= (report.maxSessions || 5)) return;
    selectedSessions.push(allSessions.find(function(s){ return s.id === sid; }));
    el.classList.add('selected');
  }
  var min = report.minSessions || 3;
  document.getElementById('modBuyBtn').disabled = selectedSessions.length < min;
  document.getElementById('modSelCount').textContent = selectedSessions.length + ' selezionate';
}
```

**Step 5 — Add count label below session list in modal HTML:**
```html
<!-- inside .modal, after .sess-pick div -->
<div id="modSelCount" style="font-size:11px;color:var(--t3);text-align:right;margin-top:4px"></div>
```

**Step 6 — Pass multi-session IDs to the insert:**
In the `modBuyBtn` click handler, replace `session_id: selectedSession.id` with:
```javascript
session_id: selectedReport.multiSession ? selectedSessions[0].id : selectedSession.id,
session_ids: selectedReport.multiSession ? selectedSessions.map(function(s){ return s.id; }) : null,
```

---

### CHANGE A4 — Add insufficient-data state to each report card
**Location:** `function renderReportCard(rt, sessionCount)`.
**Add after eligibility line:**

```javascript
// Insufficient data note for reports with recSessions
if(eligible && rt.recSessions && sessionCount < rt.recSessions) {
  h += '<div class="why-block" style="margin-bottom:8px"><strong>📊 Dati parziali</strong> · '
    + 'Hai ' + sessionCount + ' session' + (sessionCount !== 1 ? 'i' : 'e') + ' utili. '
    + 'Con ' + rt.recSessions + ' il report sarà più affidabile. Puoi generarlo ora, '
    + 'ma potrebbe avere aree con evidenze limitate.</div>';
}
```

---

### CHANGE A5 — Structured report detail rendering
**Problem:** `viewReport` renders raw `summary_text` with just `replace(/\n/g,'<br>')`. No sections, no hierarchy.
**Location:** `function viewReport(rid)` → the `innerHTML` assignment inside it.

**Replace the current innerHTML assignment with a parser:**
```javascript
function parseReportHTML(text) {
  if (!text) return '<div class="empty">Nessun contenuto disponibile.</div>';
  return text
    .replace(/^##\s+(.+)$/gm, '<h4 style="font-size:13px;font-weight:700;color:var(--accent);margin:16px 0 4px;letter-spacing:-.2px">$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h5 style="font-size:12px;font-weight:700;color:var(--t2);margin:12px 0 3px">$1</h5>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '<li style="margin-left:16px;margin-bottom:3px">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:16px;margin-bottom:3px">$1</li>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--line);margin:14px 0">')
    .replace(/\n/g, '<br>');
}
```

**In `viewReport`, change the innerHTML to:**
```javascript
document.getElementById('reportDetailContent').innerHTML =
  '<h3>' + mod.icon + ' ' + mod.name + '</h3>'
  + '<div style="font-size:12px;color:var(--t3);margin-bottom:16px">' + when
  + ' · Punteggio: <strong style="color:var(--accent)">' + score + '</strong></div>'
  + '<hr style="border-color:var(--line);margin-bottom:14px">'
  + parseReportHTML(resp.data.summary_text);
```

---

### CHANGE A6 — Real PDF download (not .txt)
**Replace entire `downloadReportPDF` function:**

```javascript
function downloadReportPDF() {
  if (!_currentReportData) return;
  var mod = REPORT_MODULES[_currentReportData.module_id] || {name:'Report', icon:'📊'};
  var score = _currentReportData.overall_score ? Math.round(_currentReportData.overall_score) + '%' : '—';
  var when = _currentReportData.created_at
    ? new Date(_currentReportData.created_at).toLocaleDateString('it-IT', {day:'numeric',month:'long',year:'numeric'})
    : '';
  var content = parseReportHTML(_currentReportData.summary_text || '');
  var win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${mod.name} · Sottotitoli</title>
    <style>
      body{font-family:'Inter',sans-serif;max-width:700px;margin:40px auto;color:#111;line-height:1.7;font-size:14px}
      h1{font-size:22px;font-weight:800;margin-bottom:4px}
      .meta{font-size:12px;color:#666;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #eee}
      h4{font-size:14px;font-weight:700;color:#059669;margin:20px 0 6px}
      h5{font-size:13px;font-weight:700;color:#4b5563;margin:14px 0 4px}
      hr{border:none;border-top:1px solid #eee;margin:16px 0}
      li{margin-bottom:4px}
      strong{font-weight:700}
      @media print{body{margin:20px}}
    </style></head><body>
    <h1>${mod.icon} ${mod.name}</h1>
    <div class="meta">Sottotitoli · ${when} · Punteggio: ${score}</div>
    ${content}
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`);
  win.document.close();
}
```

---

### CHANGE A7 — Add 3 missing FAQ items
**Location:** `var FAQ_DATA = [...]`. Append before closing `]`:

```javascript
{qIT:'Il mio profilo influenza i report?',qEN:'Does my profile affect reports?',
 aIT:'Sì. Obiettivi, settore, preferenze di feedback e lingua madre aiutano l\'AI a produrre consigli più pertinenti. Più il profilo è completo, più i report rispecchiano il tuo contesto reale.',
 aEN:'Yes. Goals, domain, feedback preferences, and native language help the AI produce more relevant advice. A more complete profile makes reports better reflect your real context.'},
{qIT:'Il report sostituisce un insegnante?',qEN:'Does the report replace a teacher?',
 aIT:'No. È uno strumento di analisi e orientamento: trasforma dati reali in feedback utile. Non valuta la tua pronuncia, non interagisce con te, e non sostituisce il giudizio di un professionista.',
 aEN:'No. It is an analysis and guidance tool: it turns real data into useful feedback. It does not evaluate pronunciation, does not interact with you, and does not replace professional judgment.'},
{qIT:'Perché i consigli cambiano tra un report e l\'altro?',qEN:'Why do suggestions change between reports?',
 aIT:'Perché i dati cambiano. Man mano che produci più sessioni, il sistema vede pattern più stabili. È normale che un report su 1 sessione evidenzi cose diverse rispetto a uno su 5 sessioni.',
 aEN:'Because the data changes. As you produce more sessions, the system sees more stable patterns. It is normal for a 1-session report to highlight different things than a 5-session report.'}
```

---

### CHANGE A8 — Sidebar profile nudge item
**Location:** `<aside class="sidebar">`, after FAQ nav item.
**Add:**
```html
<div class="sidebar-div"></div>
<div class="sidebar-st">Il tuo profilo</div>
<div class="ni" id="sidebarProfileNudge" onclick="window.location.href='account.html#profilo'" style="display:none">
  <span class="ni-icon">⚠️</span>
  <span class="nl" style="color:var(--amber)">Completa profilo</span>
</div>
<div class="ni" onclick="window.location.href='account.html'"><span class="ni-icon">👤</span><span class="nl">Profilo</span></div>
```

**In JS `checkProfileNudge`, also add:**
```javascript
var spn = document.getElementById('sidebarProfileNudge');
if(spn) spn.style.display = incomplete ? 'flex' : 'none';
```

---

# PART 2 — account.html

## account.html — Changes required

### CHANGE B1 — Add a dedicated "Profilo Linguistico" tab

**Step 1 — Add tab to sidebar navigation:**
```html
<div class="ni" data-tab="profile-ling">
  <span class="ni-icon">🎯</span>
  <span class="nl">Profilo Linguistico</span>
  <span id="profileCompleteBadge" style="display:none;width:8px;height:8px;border-radius:50%;background:var(--amber);margin-left:auto;flex-shrink:0"></span>
</div>
```

**Step 2 — Full content section HTML:**

```html
<div class="cs" id="cs-profile-ling">
  <div class="hero">
    <h1>Profilo Linguistico</h1>
    <p class="sub">Completa il tuo profilo in meno di 1 minuto. Più informazioni fornisci, più i tuoi Report AI saranno precisi e personalizzati sul tuo contesto reale.</p>
  </div>
  <div class="content-wrap" style="max-width:680px">

    <!-- Completion bar -->
    <div class="card" style="margin-bottom:16px;padding:16px 18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700;color:var(--t2)">Completamento profilo</span>
        <span id="profilePct" style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--accent)">0%</span>
      </div>
      <div style="height:6px;background:var(--bg2);border-radius:100px;overflow:hidden">
        <div id="profileBar" style="height:100%;width:0%;background:var(--accent);border-radius:100px;transition:width .4s"></div>
      </div>
      <div id="profileCompleteMsg" style="display:none;margin-top:8px;font-size:11.5px;color:var(--accent);font-weight:600">✓ Profilo completo — i tuoi report sono ora personalizzati al tuo contesto.</div>
    </div>

    <!-- Short bio -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;color:var(--t2)">Presentati in una riga</label>
      <input type="text" id="pBio" maxlength="120" placeholder="es. Ingegnere che usa l'inglese al lavoro per riunioni e email"
        style="width:100%;background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--text);font-family:inherit;outline:none">
      <div style="font-size:10.5px;color:var(--t3);margin-top:4px">Contesto, obiettivi o situazioni in cui usi la lingua. Aiuta l'AI a rendere i consigli più rilevanti.</div>
    </div>

    <!-- Q1 -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:10px;color:var(--t2)">Perché stai studiando questa lingua?</label>
      <div class="pill-group" id="pGoal">
        <button class="pill" data-val="work">Lavoro</button>
        <button class="pill" data-val="study">Studio</button>
        <button class="pill" data-val="relocation">Trasferimento</button>
        <button class="pill" data-val="travel">Viaggi</button>
        <button class="pill" data-val="conversation">Conversazione</button>
        <button class="pill" data-val="exam">Esame</button>
        <button class="pill" data-val="media">Contenuti / Media</button>
        <button class="pill" data-val="other">Altro</button>
      </div>
    </div>

    <!-- Q2 -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:10px;color:var(--t2)">In quali situazioni la usi o vuoi usarla? <span style="color:var(--t3);font-weight:400">(più risposte)</span></label>
      <div class="pill-group multi" id="pUseCases">
        <button class="pill" data-val="meetings">Riunioni</button>
        <button class="pill" data-val="emails">Email</button>
        <button class="pill" data-val="presentations">Presentazioni</button>
        <button class="pill" data-val="conversation">Conversazioni</button>
        <button class="pill" data-val="lessons">Lezioni</button>
        <button class="pill" data-val="interviews">Colloqui</button>
        <button class="pill" data-val="travel">Viaggi</button>
        <button class="pill" data-val="media">Film / Video</button>
        <button class="pill" data-val="reading">Lettura</button>
        <button class="pill" data-val="exams">Esami</button>
      </div>
    </div>

    <!-- Q3 -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:10px;color:var(--t2)">Qual è il tuo settore o ambiente principale?</label>
      <div class="pill-group" id="pDomain">
        <button class="pill" data-val="technical">Tecnico / IT</button>
        <button class="pill" data-val="business">Business</button>
        <button class="pill" data-val="healthcare">Sanitario</button>
        <button class="pill" data-val="creative">Creativo</button>
        <button class="pill" data-val="academic">Accademico</button>
        <button class="pill" data-val="customer">Customer-facing</button>
        <button class="pill" data-val="student">Studente</button>
        <button class="pill" data-val="other">Altro</button>
      </div>
    </div>

    <!-- Q4 -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:10px;color:var(--t2)">Che tipo di feedback vuoi di più? <span style="color:var(--t3);font-weight:400">(più risposte)</span></label>
      <div class="pill-group multi" id="pFocusPrefs">
        <button class="pill" data-val="grammar">Grammatica</button>
        <button class="pill" data-val="vocabulary">Vocabolario</button>
        <button class="pill" data-val="clarity">Chiarezza</button>
        <button class="pill" data-val="naturalness">Naturalezza</button>
        <button class="pill" data-val="precision">Precisione</button>
        <button class="pill" data-val="comprehension">Comprensione</button>
        <button class="pill" data-val="speaking_confidence">Sicurezza nel parlare</button>
      </div>
    </div>

    <!-- Q5 -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:10px;color:var(--t2)">Preferisci un feedback più diretto o più incoraggiante?</label>
      <div class="pill-group" id="pFeedbackStyle">
        <button class="pill" data-val="direct">Diretto</button>
        <button class="pill" data-val="balanced">Equilibrato</button>
        <button class="pill" data-val="encouraging">Incoraggiante</button>
      </div>
    </div>

    <!-- Q6 -->
    <div class="card" style="margin-bottom:12px;padding:16px 18px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:10px;color:var(--t2)">Vuoi che l'AI usi esempi legati al tuo mondo?</label>
      <div class="pill-group" id="pContextExamples">
        <button class="pill" data-val="lots">Sì, molto</button>
        <button class="pill" data-val="some">Un po'</button>
        <button class="pill" data-val="generic">Non necessario</button>
      </div>
    </div>

    <!-- Save -->
    <div style="display:flex;align-items:center;gap:12px;margin-top:20px">
      <button class="btn btn-primary" id="saveProfileBtn" onclick="saveProfileLing()">Salva profilo</button>
      <span id="saveProfileStatus" style="font-size:12px;color:var(--t3)"></span>
    </div>

  </div>
</div>
```

**Step 3 — CSS (add to `<style>` or `style.css`):**
```css
.pill-group{display:flex;flex-wrap:wrap;gap:6px}
.pill{font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;border-radius:100px;border:1.5px solid var(--line);background:var(--bg2);color:var(--t2);cursor:pointer;transition:all .15s;line-height:1.4}
.pill:hover{border-color:var(--accent);color:var(--accent)}
.pill.active{background:rgba(52,211,153,.1);border-color:var(--accent);color:var(--accent)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px}
.nudge-banner{padding:12px 16px;border-radius:12px;display:flex;align-items:center;gap:12px;font-size:12.5px}
.nudge-amber{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2)}
.nudge-green{background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.15)}
```

**Step 4 — Pill interaction JS:**
```javascript
document.querySelectorAll('.pill-group:not(.multi) .pill').forEach(function(btn){
  btn.addEventListener('click', function(){
    var grp = this.closest('.pill-group');
    grp.querySelectorAll('.pill').forEach(function(b){ b.classList.remove('active'); });
    this.classList.add('active');
    updateProfileCompletion();
  });
});
document.querySelectorAll('.pill-group.multi .pill').forEach(function(btn){
  btn.addEventListener('click', function(){
    this.classList.toggle('active');
    updateProfileCompletion();
  });
});

function getActivePills(groupId) {
  return Array.from(document.querySelectorAll('#' + groupId + ' .pill.active')).map(function(b){ return b.dataset.val; });
}

function updateProfileCompletion() {
  var fields = ['pGoal','pDomain','pFeedbackStyle','pContextExamples','pUseCases','pFocusPrefs'];
  var filled = fields.filter(function(f){ return getActivePills(f).length > 0; });
  var bio = document.getElementById('pBio');
  if(bio && bio.value.trim().length > 8) filled.push('bio');
  var pct = Math.round((filled.length / (fields.length + 1)) * 100);
  var bar = document.getElementById('profileBar');
  var pctEl = document.getElementById('profilePct');
  var msg = document.getElementById('profileCompleteMsg');
  var badge = document.getElementById('profileCompleteBadge');
  if(bar) bar.style.width = pct + '%';
  if(pctEl) pctEl.textContent = pct + '%';
  if(msg) msg.style.display = pct >= 100 ? 'block' : 'none';
  if(badge) badge.style.display = pct < 60 ? 'block' : 'none';
}

document.getElementById('pBio').addEventListener('input', updateProfileCompletion);
```

**Step 5 — Save function:**
```javascript
async function saveProfileLing() {
  var supabase = window.sottotitoliSupabase;
  var btn = document.getElementById('saveProfileBtn');
  var status = document.getElementById('saveProfileStatus');
  btn.disabled = true;
  status.textContent = 'Salvataggio…';
  var r = await supabase.auth.getSession();
  if(!r.data?.session){ status.textContent = 'Non autenticato.'; btn.disabled=false; return; }
  var uid = r.data.session.user.id;
  var profileData = {
    bio_summary: document.getElementById('pBio').value.trim(),
    goal_primary: getActivePills('pGoal')[0] || null,
    use_cases: getActivePills('pUseCases'),
    domain: getActivePills('pDomain')[0] || null,
    focus_preferences: getActivePills('pFocusPrefs'),
    feedback_preference: getActivePills('pFeedbackStyle')[0] || null,
    context_examples_preference: getActivePills('pContextExamples')[0] || null,
    updated_at: new Date().toISOString()
  };
  var res = await supabase.from('profiles').upsert({ id: uid, ...profileData });
  if(res.error){
    status.textContent = 'Errore: ' + res.error.message;
  } else {
    status.textContent = '✓ Profilo salvato';
    setTimeout(function(){ status.textContent=''; }, 3000);
  }
  btn.disabled = false;
  updateProfileCompletion();
}
```

**Step 6 — Load existing profile on init:**
```javascript
async function loadProfileLing(supabase, userId) {
  var prof = await supabase.from('profiles').select('bio_summary,goal_primary,use_cases,domain,focus_preferences,feedback_preference,context_examples_preference').eq('id',userId).maybeSingle();
  if(!prof.data) return;
  var d = prof.data;
  if(d.bio_summary) document.getElementById('pBio').value = d.bio_summary;
  function setActive(groupId, vals) {
    if(!vals) return;
    var arr = Array.isArray(vals) ? vals : [vals];
    arr.forEach(function(v){
      var btn = document.querySelector('#' + groupId + ' .pill[data-val="' + v + '"]');
      if(btn) btn.classList.add('active');
    });
  }
  setActive('pGoal', d.goal_primary);
  setActive('pUseCases', d.use_cases);
  setActive('pDomain', d.domain);
  setActive('pFocusPrefs', d.focus_preferences);
  setActive('pFeedbackStyle', d.feedback_preference);
  setActive('pContextExamples', d.context_examples_preference);
  updateProfileCompletion();
}
// Call inside main loadData: loadProfileLing(supabase, userId);
```

---

### CHANGE B2 — DB migration (run in Supabase SQL editor)

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio_summary TEXT,
  ADD COLUMN IF NOT EXISTS goal_primary TEXT,
  ADD COLUMN IF NOT EXISTS use_cases TEXT[],
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS focus_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS feedback_preference TEXT,
  ADD COLUMN IF NOT EXISTS context_examples_preference TEXT;

ALTER TABLE session_ai_reports
  ADD COLUMN IF NOT EXISTS session_ids TEXT[];
```

---

### CHANGE B3 — Report AI tab: add CTA link
Find the Report AI tab content in account.html. Add:
```html
<a href="analysis.html" class="btn btn-primary" style="margin-top:12px">
  🛒 Vai ai Report AI →
</a>
```

---

### CHANGE B4 — Panoramica tab: profile-incomplete nudge card
Add after KPI row in `#cs-panoramica`:
```html
<div id="overviewProfileNudge" style="display:none;margin-bottom:16px;padding:14px 18px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:14px;display:flex;align-items:center;gap:14px">
  <span style="font-size:24px">🎯</span>
  <div style="flex:1">
    <strong style="font-size:13px;color:var(--amber)">Il tuo profilo non è ancora completo</strong>
    <p style="font-size:12px;color:var(--t2);margin-top:2px">Aggiungi obiettivi, settore e preferenze per ricevere report più precisi e personalizzati.</p>
  </div>
  <a href="#" onclick="switchToTab('profile-ling');return false" class="btn btn-ghost" style="white-space:nowrap;font-size:12px">Completa ora →</a>
</div>
```

---

# PART 3 — studio-caption.html

### CHANGE C1 — Post-session report teaser panel
Add before `</body>`:
```html
<div id="postSessionPanel" style="display:none;position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:14px 24px;z-index:200;align-items:center;gap:16px">
  <span style="font-size:22px">⚡</span>
  <div style="flex:1">
    <strong style="font-size:13.5px">Sessione completata</strong>
    <p style="font-size:12px;color:var(--t2);margin-top:2px">Vuoi un'analisi rapida di questa sessione? <span id="pspWordCount" style="color:var(--accent);font-weight:600"></span></p>
  </div>
  <button class="btn btn-ghost" onclick="document.getElementById('postSessionPanel').style.display='none'" style="font-size:12px">Dopo</button>
  <a href="analysis.html" class="btn btn-primary" style="font-size:12px">Vai ai Report AI →</a>
  <button onclick="generateQuickSnapshot()" class="btn" style="background:rgba(52,211,153,.1);color:var(--accent);border:1px solid rgba(52,211,153,.3);font-size:12px;padding:10px 18px;border-radius:10px;font-weight:700">⚡ Snapshot gratuito</button>
</div>
<style>
@keyframes slideUp {from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1}}
#postSessionPanel{animation:slideUp .3s ease}
</style>
```

**JS — trigger after session saves:**
```javascript
function showPostSessionPanel(wordCount) {
  var panel = document.getElementById('postSessionPanel');
  var wc = document.getElementById('pspWordCount');
  if(wc) wc.textContent = wordCount ? wordCount + ' parole trascritte' : '';
  if(panel) panel.style.display = 'flex';
}
// Call: showPostSessionPanel(currentWordCount) after Supabase session insert succeeds
```

**JS — Quick Snapshot:**
```javascript
async function generateQuickSnapshot() {
  var supabase = window.sottotitoliSupabase;
  if(!supabase) return;
  var r = await supabase.auth.getSession();
  if(!r.data?.session) { window.location.href='analysis.html'; return; }
  var today = new Date().toISOString().split('T')[0];
  if(localStorage.getItem('sottotitoli_last_snapshot_date') === today) {
    alert('Hai già generato lo Snapshot gratuito oggi.');
    return;
  }
  var sid = window.currentSessionId; // variable that holds the just-saved session ID
  if(!sid) { window.location.href = 'analysis.html'; return; }
  var uid = r.data.session.user.id;
  await supabase.from('session_ai_reports').insert({
    user_id: uid,
    module_id: 0,
    session_id: sid,
    status: 'processing'
  });
  localStorage.setItem('sottotitoli_last_snapshot_date', today);
  document.getElementById('postSessionPanel').style.display = 'none';
  showToast('⚡ Snapshot in elaborazione. Controlla I miei report tra qualche minuto.');
}

function showToast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text);z-index:300;box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap';
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 4000);
}
```

---

### CHANGE C2 — Profile nudge in word bank sidebar
Add at top of word bank panel:
```html
<div id="studioProfileNudge" style="display:none;padding:10px 14px;background:rgba(251,191,36,.05);border-bottom:1px solid rgba(251,191,36,.15);font-size:11.5px;color:var(--t2)">
  <strong style="color:var(--amber)">👤 Profilo non completo</strong><br>
  I report AI saranno più utili se completi il tuo profilo linguistico.
  <a href="account.html#profilo" style="color:var(--accent);font-weight:700;display:block;margin-top:4px">Completa ora →</a>
</div>
```

**JS:**
```javascript
(async function checkStudioProfileNudge(){
  var supabase = window.sottotitoliSupabase;
  if(!supabase) return;
  var r = await supabase.auth.getSession();
  if(!r.data?.session) return;
  var uid = r.data.session.user.id;
  var prof = await supabase.from('profiles').select('goal_primary,domain').eq('id',uid).maybeSingle();
  var incomplete = !prof.data || !prof.data.goal_primary;
  var nudge = document.getElementById('studioProfileNudge');
  if(nudge) nudge.style.display = incomplete ? 'block' : 'none';
})();
```

---

### CHANGE C3 — Live word count in toolbar
Add to session toolbar:
```html
<span id="liveWordCount" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--t3);padding:4px 10px;background:var(--bg2);border-radius:100px">0 parole</span>
```

**JS — call wherever transcript text updates:**
```javascript
function updateWordCount(text) {
  var count = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  var el = document.getElementById('liveWordCount');
  if(el) el.textContent = count + ' parole';
  window.currentWordCount = count;
}
```

---

# PART 4 — index.html and start.html (feedback only)

**index.html** — Leave alone. Future: add a report tier ladder section (included → targeted → specialist) after the feature list. Not urgent. When purchase.html is reworked, mirror plan language in index.

**start.html** — No changes. Future: after first session, show "Hai la tua prima sessione — vuoi uno Snapshot?" banner. Defer until C1 is live.

---

# PART 5 — Implementation priority order

Execute strictly in this order:

1. **B2** — DB migration (nothing works without this)
2. **A1** — Remove Cambridge from catalog
3. **B1** — Profilo Linguistico tab in account.html (full questionnaire, save, load)
4. **A2 + A8** — Profile nudges in analysis.html
5. **B4** — Panoramica nudge in account.html
6. **C1** — Post-session panel in studio-caption.html
7. **A3** — Multi-session picker for Repeating Errors / CEFR
8. **A4** — Insufficient-data states in report cards
9. **A5 + A6** — Structured report rendering + real PDF
10. **A7** — Add 3 FAQ items
11. **C2** — Studio profile nudge
12. **C3** — Live word count in Studio
13. **B3** — Report AI CTA link from account
