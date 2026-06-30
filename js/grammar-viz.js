// ═══ Live Grammar Visualization Module ═══
// POS detection: compromise.js (nlp) primary, suffix heuristics fallback
// Verb tense: compromise.js primary, suffix fallback (-ing/-ed)
// Pronoun subtypes: PRON_TYPE dictionary (compromise doesn't categorize these)

// ── Compact suffix-based POS fallback (no dictionaries — nlp handles everything else) ──
function _gvHeuristicPOS(w) {
  w = w.replace(/[^a-z']/g, '').toLowerCase();
  if (!w || w.length < 2) return 'OTHER';
  if (w.endsWith('ing')) return 'VERB';
  if (w.endsWith('ed') && !w.endsWith('eed')) return 'VERB';
  if (w.endsWith('ly') && w.length > 4) return 'ADV';
  if (w.endsWith('tion') || w.endsWith('sion') || w.endsWith('ment') || w.endsWith('ness') || w.endsWith('ity')) return 'NOUN';
  if (w.endsWith('ous') || w.endsWith('ful') || w.endsWith('less') || w.endsWith('able') || w.endsWith('ible')) return 'ADJ';
  if ((w.endsWith('er') || w.endsWith('est')) && w.length > 4) return 'ADJ';
  if (w.endsWith('s') && w.length > 4 && !w.endsWith('ss')) return 'NOUN';
  return 'OTHER';
}

// ── Pronoun type map — compromise.js doesn't categorize pronoun subtypes ──
var PRON_TYPE={
  // Subject pronouns
  i:'SUBJ',we:'SUBJ',you:'SUBJ',he:'SUBJ',she:'SUBJ',it:'SUBJ',they:'SUBJ',
  // Object pronouns
  me:'OBJ',us:'OBJ',him:'OBJ',her:'OBJ',them:'OBJ',
  // Attributive possessives (my book, your car)
  my:'POSS',our:'POSS',your:'POSS',his:'POSS',its:'POSS',their:'POSS',
  // Standalone possessives (that is mine, hers is bigger)
  mine:'POSS',ours:'POSS',yours:'POSS',hers:'POSS',theirs:'POSS',
  // Reflexive pronouns
  myself:'REFL',yourself:'REFL',himself:'REFL',herself:'REFL',itself:'REFL',
  ourselves:'REFL',yourselves:'REFL',themselves:'REFL',
  // Indefinite pronouns (common ones)
  someone:'PRON',anyone:'PRON',everyone:'PRON',noone:'PRON',
  somebody:'PRON',anybody:'PRON',everybody:'PRON',nobody:'PRON',
  something:'PRON',anything:'PRON',everything:'PRON',nothing:'PRON',
  one:'PRON',ones:'PRON',none:'PRON',each:'PRON',either:'PRON',neither:'PRON',
  // Interrogative/relative
  who:'PRON',whom:'PRON',whose:'PRON',which:'PRON',what:'PRON',that:'PRON',
  // Demonstrative pronouns (when used as pronouns, not determiners)
  this:'PRON',these:'PRON',those:'PRON'
};

// Grammar tracking state
var _gv = {
  posCounts: {},
  allContentWords: [],
  allWordsFlat: [],
  proCounts: {},
  verbCounts: {},
  transcriptSentences: [],
  svMatches: 0,
  svMismatches: 0,
  svSentences: [],
  sentenceLengths: []
};

function _gvProcessFinal(text) {
  var rawWords = text.toLowerCase().match(/[a-z']+/g) || [];
  if (!rawWords.length) return;

  _gv.sentenceLengths.push(rawWords.length);
  var subj = null, verb = null;

  // Build a single nlp document for the whole sentence for better accuracy
  var doc; try { if (typeof nlp !== 'undefined') doc = nlp(text); } catch(e) {}

  rawWords.forEach(function(w) {
    // ── POS tag via nlp/compromise ──
    var pos = 'OTHER';
    try {
      if (doc) {
        var match = doc.match(w);
        if (match && match.json) {
          var j = match.json();
          if (j[0] && j[0].terms && j[0].terms[0]) {
            var tags = j[0].terms[0].tags || [];
            if (tags.indexOf('Noun') !== -1) pos = 'NOUN';
            else if (tags.indexOf('Verb') !== -1) pos = 'VERB';
            else if (tags.indexOf('Adjective') !== -1) pos = 'ADJ';
            else if (tags.indexOf('Adverb') !== -1) pos = 'ADV';
            else if (tags.indexOf('Preposition') !== -1) pos = 'PREP';
            else if (tags.indexOf('Conjunction') !== -1) pos = 'CONJ';
            else if (tags.indexOf('Pronoun') !== -1) pos = 'PRON';
            else if (tags.indexOf('Determiner') !== -1) pos = 'DET';
            else if (tags.indexOf('Modal') !== -1) pos = 'AUX';
            else if (tags.indexOf('Auxiliary') !== -1) pos = 'AUX';
          }
        }
      }
    } catch(e) {}
    // Fallback to suffix heuristics if nlp fails
    if (pos === 'OTHER') pos = _gvHeuristicPOS(w);

    if (['NOUN','VERB','ADJ','ADV','PREP','CONJ','PRON','AUX'].indexOf(pos) >= 0) {
      _gv.posCounts[pos] = (_gv.posCounts[pos] || 0) + 1;
    }
    if (['NOUN','VERB','ADJ','ADV'].indexOf(pos) >= 0 && _gv.allContentWords.indexOf(w) < 0) {
      _gv.allContentWords.push(w);
    }
    _gv.allWordsFlat.push({w: w, pos: pos});
    // Cap at 5000 — remove oldest 10% when exceeded (safe for 35+ min sessions)
    if (_gv.allWordsFlat.length > 5000) _gv.allWordsFlat.splice(0, 500);

    // ── Pronoun types (dictionary — nlp doesn't categorize these) ──
    if (PRON_TYPE[w]) _gv.proCounts[PRON_TYPE[w]] = (_gv.proCounts[PRON_TYPE[w]] || 0) + 1;

    // ── Verb tense via nlp/compromise ──
    var tenseFound = false;
    try {
      if (doc) {
        var vMatch = doc.match(w);
        if (vMatch && vMatch.json) {
          var vj = vMatch.json();
          if (vj[0] && vj[0].terms && vj[0].terms[0]) {
            var vt = vj[0].terms[0].tags || [];
            // Check nlp verb tags regardless of POS (catches gerunds tagged as nouns)
            if (vt.indexOf('PastTense') !== -1) { _gv.verbCounts.PAST = (_gv.verbCounts.PAST || 0) + 1; tenseFound = true; }
            else if (vt.indexOf('PresentTense') !== -1) { _gv.verbCounts.PRES = (_gv.verbCounts.PRES || 0) + 1; tenseFound = true; }
            else if (vt.indexOf('Gerund') !== -1) { _gv.verbCounts.ING = (_gv.verbCounts.ING || 0) + 1; tenseFound = true; }
            else if (vt.indexOf('Participle') !== -1) { _gv.verbCounts.PART = (_gv.verbCounts.PART || 0) + 1; tenseFound = true; }
            else if (vt.indexOf('Infinitive') !== -1) { _gv.verbCounts.PRES = (_gv.verbCounts.PRES || 0) + 1; tenseFound = true; }
            else if (vt.indexOf('Modal') !== -1) { _gv.verbCounts.MODAL = (_gv.verbCounts.MODAL || 0) + 1; tenseFound = true; }
            // Also check verb-specific tags even when POS is not VERB
            if (!tenseFound && vt.indexOf('Verb') !== -1) {
              // nlp says it's a verb but didn't give tense — check position/context
              if (pos === 'VERB') { _gv.verbCounts.PRES = (_gv.verbCounts.PRES || 0) + 1; tenseFound = true; }
            }
          }
        }
      }
    } catch(e) {}
    // Fallback: suffix-based detection (catches -ing, -ed regardless of nlp's POS decision)
    if (!tenseFound) {
      if (w.endsWith('ing') && w.length > 4) { _gv.verbCounts.ING = (_gv.verbCounts.ING || 0) + 1; tenseFound = true; }
      else if (w.endsWith('ed') && w.length > 4 && !w.endsWith('eed')) { _gv.verbCounts.PAST = (_gv.verbCounts.PAST || 0) + 1; tenseFound = true; }
    }
    // Dictionary fallback (last resort)
    if (!tenseFound && (pos === 'VERB' || pos === 'AUX')) {
      if (w.endsWith('ing')) _gv.verbCounts.ING = (_gv.verbCounts.ING || 0) + 1;
      else if (w.endsWith('ed')) _gv.verbCounts.PAST = (_gv.verbCounts.PAST || 0) + 1;
      else _gv.verbCounts.PRES = (_gv.verbCounts.PRES || 0) + 1;
    }

    if (!subj && PRON_TYPE[w] === 'SUBJ') subj = w;
    if (!verb && (pos === 'VERB' || pos === 'AUX')) verb = w;
  });

  // S-V agreement check
  if (subj && verb) {
    var sgSubjs = {i:1,he:1,she:1,it:1}, plSubjs = {we:1,they:1};
    var sgVerbs = {is:1,was:1,has:1,does:1}, plVerbs = {are:1,were:1,have:1,do:1};
    var subjSg = sgSubjs[subj] ? true : (plSubjs[subj] ? false : null);
    var verbSg = sgVerbs[verb] ? true : (plVerbs[verb] ? false : null);
    if (subjSg !== null && verbSg !== null) {
      var match = subjSg === verbSg;
      if (match) _gv.svMatches++; else _gv.svMismatches++;
      _gv.svSentences.push({text: text, subj: subj, verb: verb, match: match});
      if (_gv.svSentences.length > 8) _gv.svSentences.shift();
    }
  }

  _gvUpdateTranscript(text, rawWords);
  _gvUpdateAll();
}

function _gvUpdateTranscript(text, words) {
  _gv.transcriptSentences.push({text: text, words: words});
  if (_gv.transcriptSentences.length > 10) _gv.transcriptSentences.shift();

  var el = document.getElementById('gvTranscriptLines');
  if (!el) return;

  var html = '';
  _gv.transcriptSentences.forEach(function(s) {
    html += '<div style="margin-bottom:clamp(10px,1.5vw,16px);padding-bottom:clamp(8px,1.2vw,12px);border-bottom:1px solid var(--line)">';
    html += '<div style="font-size:clamp(13px,1.5vw,16px);color:var(--muted);margin-bottom:clamp(8px,1.2vw,12px);line-height:1.5;font-weight:500">' + s.text + '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:clamp(4px,.6vw,7px);align-items:flex-end">';
    s.words.forEach(function(w) {
      var pos = 'OTHER';
      try { if (typeof nlp !== 'undefined') { var d = nlp(w); var t = d.json(); if (t[0] && t[0].terms && t[0].terms[0]) { var tags = t[0].terms[0].tags || []; if (tags.indexOf('Noun') !== -1) pos = 'NOUN'; else if (tags.indexOf('Verb') !== -1) pos = 'VERB'; else if (tags.indexOf('Adjective') !== -1) pos = 'ADJ'; else if (tags.indexOf('Adverb') !== -1) pos = 'ADV'; else if (tags.indexOf('Preposition') !== -1) pos = 'PREP'; else if (tags.indexOf('Conjunction') !== -1) pos = 'CONJ'; else if (tags.indexOf('Pronoun') !== -1) pos = 'PRON'; else if (tags.indexOf('Determiner') !== -1) pos = 'DET'; else if (tags.indexOf('Modal') !== -1 || tags.indexOf('Auxiliary') !== -1) pos = 'AUX'; } } } catch(e) {}
      if (pos === 'OTHER') pos = _gvHeuristicPOS(w);
      html += '<span class="transcript-word"><span class="tw">' + w + '</span><span class="tag tag-' + pos + '">' + pos + '</span></span>';
    });
    html += '</div></div>';
  });
  el.innerHTML = html || '<div style="color:var(--muted);font-size:clamp(11px,1.2vw,13px);text-align:center;padding:20px">No sentences yet. Speak to see each word tagged with its POS.</div>';
}

function _gvUpdateAll() {
  _gvUpdateHeatmap();
  _gvUpdatePronouns();
  _gvUpdateVerbs();
  _gvUpdatePosCols();
  _gvUpdatePosTags();
  _gvUpdateDonut();
  _gvUpdateGrammarExamples();
}

// ── Grammar slide: replace example placeholders with live words ──
function _gvUpdateGrammarExamples() {
  var container = document.getElementById('grammarExampleWords');
  if (!container) return;
  var words = _gv.allContentWords.slice(-6);
  if (!words.length) {
    // Keep placeholder if no words yet — but hide "Example" label
    var label = document.getElementById('grammarExampleLabel');
    if (label) label.textContent = '📖 Recent Words';
    return;
  }
  var label = document.getElementById('grammarExampleLabel');
  if (label) label.textContent = '📖 Live Words (' + words.length + ')';
  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">';
  words.forEach(function(word) {
    var cardId = 'gvex-' + word.replace(/[^a-z]/g,'');
    var pos = _gvHeuristicPOS(word);
    var posColors = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc'};
    var color = posColors[pos] || '#a78bfa';
    html += '<div id="' + cardId + '" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:16px;font-weight:700;color:var(--text)">' + word + '</span><span style="font-size:9px;font-weight:600;text-transform:uppercase;padding:2px 8px;border-radius:100px;background:rgba(167,139,250,.15);color:var(--accent2)">' + pos + '</span></div>';
    html += '<div style="font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:6px" class="syn-def">Fetching…</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-height:24px" class="syn-rel"></div>';
    html += '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
  // Fetch Wordnik data for each word
  words.forEach(function(word) {
    var cardId = 'gvex-' + word.replace(/[^a-z]/g,'');
    // Small delay to avoid rate limiting
    setTimeout(function() { _fetchWordData(word, cardId); }, 100);
  });
}

// ── Vocabolario: POS Distribution columns ──
function _gvUpdatePosCols() {
  var container = document.getElementById('vocabPosCols');
  if (!container) return;
  var counts = {Nouns: _gv.posCounts.NOUN || 0, Verbs: _gv.posCounts.VERB || 0, Adj: _gv.posCounts.ADJ || 0, Adv: _gv.posCounts.ADV || 0};
  var max = Math.max(counts.Nouns, counts.Verbs, counts.Adj, counts.Adv, 1);
  var colors = {Nouns: '#60a5fa', Verbs: '#34d399', Adj: '#f472b6', Adv: '#c084fc'};
  var html = '';
  Object.keys(counts).forEach(function(label) {
    var hgt = Math.max(8, counts[label] / max * 60);
    html += '<div style="text-align:center"><div style="width:24px;height:' + hgt + 'px;background:' + colors[label] + ';border-radius:4px 4px 0 0;margin:0 auto"></div><div style="font-size:7px;color:' + colors[label] + ';margin-top:2px">' + label + '</div><div style="font-size:8px;color:var(--muted2)">' + counts[label] + '</div></div>';
  });
  container.innerHTML = html;
}

// ── Vocabolario: POS Tags stacked ──
function _gvUpdatePosTags() {
  var container = document.getElementById('vocabPosTags');
  if (!container) return;
  var posNames = {NOUN: 'Nouns', VERB: 'Verbs', ADJ: 'Adjectives', ADV: 'Adverbs', PREP: 'Prepositions', CONJ: 'Conjunctions', PRON: 'Pronouns', AUX: 'Auxiliaries'};
  var posColors = {NOUN: '#60a5fa', VERB: '#34d399', ADJ: '#f472b6', ADV: '#c084fc', PREP: '#fbbf24', CONJ: '#fb923c', PRON: '#38bdf8', AUX: '#a78bfa'};
  // Collect recent words by POS
  var byPos = {};
  _gv.allWordsFlat.slice(-30).forEach(function(item) {
    if (!byPos[item.pos]) byPos[item.pos] = [];
    if (byPos[item.pos].indexOf(item.w) < 0 && byPos[item.pos].length < 5) byPos[item.pos].push(item.w);
  });
  var html = '';
  Object.keys(posNames).forEach(function(pos) {
    var words = byPos[pos];
    if (!words || !words.length) return;
    html += '<div><div style="font-size:8px;color:' + posColors[pos] + ';margin-bottom:2px;font-weight:600">' + posNames[pos] + ' (' + (_gv.posCounts[pos] || 0) + ')</div><div style="display:flex;flex-wrap:wrap;gap:2px">';
    words.forEach(function(w) {
      html += '<span style="padding:2px 8px;border-radius:4px;background:' + posColors[pos] + '12;color:' + posColors[pos] + ';font-size:9px">' + w + '</span>';
    });
    html += '</div></div>';
  });
  container.innerHTML = html || '<div style="color:var(--muted2);font-size:10px;text-align:center;padding:8px">Start speaking to see POS tags</div>';
}

// ── Metrics: POS donut chart ──
function _gvUpdateDonut() {
  var svg = document.getElementById('gvDonutSvg');
  if (!svg) return;
  var items = [
    {v: _gv.posCounts.NOUN || 0, c: '#60a5fa'},
    {v: _gv.posCounts.VERB || 0, c: '#34d399'},
    {v: _gv.posCounts.ADJ || 0, c: '#f472b6'},
    {v: _gv.posCounts.ADV || 0, c: '#c084fc'}
  ];
  var total = items.reduce(function(s, x) { return s + x.v; }, 0) || 1;
  var circ = 2 * Math.PI * 32;
  var offset = 0;
  var html = '';
  items.forEach(function(b) {
    if (b.v === 0) return;
    var dash = (b.v / total) * circ;
    html += '<circle cx="50" cy="50" r="32" fill="none" stroke="' + b.c + '" stroke-width="10" stroke-dasharray="' + dash + ' ' + circ + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 50 50)"/>';
    offset += dash;
  });
  // Fallback ring if empty
  if (!html) {
    html = '<circle cx="50" cy="50" r="32" fill="none" stroke="var(--line)" stroke-width="10" stroke-dasharray="200 200" transform="rotate(-90 50 50)"/>';
  }
  html += '<text x="50" y="46" text-anchor="middle" font-family="JetBrains Mono" font-size="16" font-weight="900" fill="var(--text)">' + total + '</text><text x="50" y="56" text-anchor="middle" font-size="6" fill="var(--muted2)">words</text>';
  svg.innerHTML = html;
  // Update legend
  var legend = document.getElementById('gvDonutLegend');
  if (legend) {
    legend.innerHTML = '<span style="color:#60a5fa">N ' + (items[0].v) + '</span><span style="color:#34d399">V ' + (items[1].v) + '</span><span style="color:#f472b6">J ' + (items[2].v) + '</span><span style="color:#c084fc">D ' + (items[3].v) + '</span>';
  }
}

function _gvUpdateHeatmap() {
  var cats = [
    {i:'N',k:'NOUN',c:'rgba(96,165,250,'},
    {i:'V',k:'VERB',c:'rgba(52,211,153,'},
    {i:'A',k:'ADJ',c:'rgba(244,114,182,'},
    {i:'D',k:'ADV',c:'rgba(192,132,252,'},
    {i:'P',k:'PREP',c:'rgba(96,165,250,'},
    {i:'X',k:'AUX',c:'rgba(52,211,153,'},
    {i:'C',k:'CONJ',c:'rgba(244,114,182,'},
    {i:'R',k:'PRON',c:'rgba(192,132,252,'}
  ];
  var max = Math.max.apply(null, cats.map(function(x){return _gv.posCounts[x.k]||0})) || 1;
  cats.forEach(function(x){
    var el = document.getElementById('gvHm' + x.i);
    if (!el) return;
    var count = _gv.posCounts[x.k] || 0;
    var alpha = (0.08 + count/max*0.55).toFixed(2);
    el.style.background = x.c + alpha + ')';
    el.innerHTML = x.k.charAt(0) + x.k.slice(1).toLowerCase() + '<br>' + count;
    if (count > 0 && count/max > 0.5) el.style.color = '#fff';
  });
}

function _gvUpdatePronouns() {
  var ids = {SUBJ:'gvProSubj',OBJ:'gvProObj',POSS:'gvProPoss',REFL:'gvProRefl'};
  Object.keys(ids).forEach(function(k){
    var el = document.getElementById(ids[k]);
    if (el) el.textContent = _gv.proCounts[k] || 0;
  });
  var total = (_gv.proCounts.SUBJ||0)+(_gv.proCounts.OBJ||0)+(_gv.proCounts.POSS||0)+(_gv.proCounts.REFL||0);
  var note = document.getElementById('gvProNote');
  if (note) note.textContent = total ? total + ' pronouns found' : 'No pronouns yet';
}

function _gvUpdateVerbs() {
  var ids = {PRES:'gvVbPres',PAST:'gvVbPast',ING:'gvVbIng',PART:'gvVbPart',MODAL:'gvVbModal'};
  Object.keys(ids).forEach(function(k){
    var el = document.getElementById(ids[k]);
    if (el) el.textContent = _gv.verbCounts[k] || 0;
  });
}

// Reset on new session
function _gvReset() {
  _gv.posCounts = {};
  _gv.allContentWords = [];
  _gv.allWordsFlat = [];
  _gv.proCounts = {};
  _gv.verbCounts = {};
  _gv.transcriptSentences = [];
  _gv.svMatches = 0;
  _gv.svMismatches = 0;
  _gv.svSentences = [];
  _gv.sentenceLengths = [];
  // Reset UI
  var transcriptEl = document.getElementById('gvTranscriptLines');
  if (transcriptEl) transcriptEl.innerHTML = '<div style="color:var(--muted);font-size:clamp(11px,1.2vw,13px);text-align:center;padding:20px">No sentences yet. Speak to see each word tagged with its POS.</div>';
  _gvUpdateAll();
}

window._gvReset = _gvReset;
