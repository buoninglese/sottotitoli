// ═══ Live Grammar Visualization Module ═══
// Ported from mockups/grammar-15-viz.html
// Hooks into _realMic.onFinal for real-time POS analysis

var POS_DICT={the:'DET',a:'DET',an:'DET',is:'VERB',are:'VERB',was:'VERB',were:'VERB',be:'VERB',been:'VERB',being:'VERB',have:'VERB',has:'VERB',had:'VERB',do:'VERB',does:'VERB',did:'VERB',will:'AUX',would:'AUX',can:'AUX',could:'AUX',shall:'AUX',should:'AUX',may:'AUX',might:'AUX',must:'AUX',not:'PART',to:'PART',of:'PREP',in:'PREP',for:'PREP',on:'PREP',with:'PREP',at:'PREP',by:'PREP',from:'PREP',into:'PREP',about:'PREP',and:'CONJ',or:'CONJ',but:'CONJ',so:'CONJ',if:'CONJ',because:'CONJ',when:'CONJ',where:'CONJ',how:'CONJ',that:'CONJ',we:'PRON',us:'PRON',our:'PRON',you:'PRON',your:'PRON',he:'PRON',him:'PRON',his:'PRON',she:'PRON',her:'PRON',it:'PRON',its:'PRON',they:'PRON',them:'PRON',their:'PRON',this:'DET',these:'DET',those:'DET',i:'PRON',me:'PRON',my:'PRON',very:'ADV',really:'ADV',quite:'ADV',just:'ADV',only:'ADV',also:'ADV',now:'ADV',then:'ADV',here:'ADV',there:'ADV',always:'ADV',never:'ADV',often:'ADV',well:'ADV',good:'ADJ',great:'ADJ',big:'ADJ',small:'ADJ',new:'ADJ',old:'ADJ',high:'ADJ',low:'ADJ',long:'ADJ',short:'ADJ',important:'ADJ',different:'ADJ',same:'ADJ',right:'ADJ',real:'ADJ',true:'ADJ',time:'NOUN',way:'NOUN',thing:'NOUN',people:'NOUN',world:'NOUN',life:'NOUN',day:'NOUN',year:'NOUN',work:'NOUN',system:'NOUN',language:'NOUN',word:'NOUN',sentence:'NOUN',translation:'NOUN',meeting:'NOUN',barrier:'NOUN',challenge:'NOUN',future:'NOUN',deployment:'NOUN',scale:'NOUN',bridge:'NOUN',go:'VERB',come:'VERB',make:'VERB',take:'VERB',give:'VERB',get:'VERB',know:'VERB',think:'VERB',see:'VERB',say:'VERB',use:'VERB',find:'VERB',tell:'VERB',ask:'VERB',work:'VERB',seem:'VERB',feel:'VERB',try:'VERB',leave:'VERB',call:'VERB',discuss:'VERB',remain:'VERB',help:'VERB',need:'VERB',want:'VERB',look:'VERB',like:'VERB',mean:'VERB',keep:'VERB',let:'VERB',begin:'VERB',start:'VERB',show:'VERB',hear:'VERB',play:'VERB',run:'VERB',move:'VERB',live:'VERB',believe:'VERB',hold:'VERB',bring:'VERB',happen:'VERB',write:'VERB',provide:'VERB',sit:'VERB',stand:'VERB',lose:'VERB',pay:'VERB',meet:'VERB'};

var CONTRACTIONS={don:'VERB',cant:'AUX',wont:'AUX',doesnt:'VERB',didnt:'VERB',isnt:'VERB',arent:'VERB',wasnt:'VERB',werent:'VERB',havent:'VERB',hasnt:'VERB',hadnt:'VERB',im:'PRON',youre:'PRON',theyre:'PRON',hes:'PRON',shes:'PRON',ive:'PRON',youve:'PRON',weve:'PRON',theyve:'PRON',ill:'PRON',youll:'PRON',well:'PRON',theyll:'PRON',hell:'PRON',shell:'PRON',itll:'PRON',id:'PRON',youd:'PRON',wed:'PRON',theyd:'PRON',hed:'PRON',shed:'PRON',itd:'PRON',thats:'DET',whats:'PRON',lets:'VERB'};

var PRON_TYPE={i:'SUBJ',we:'SUBJ',you:'SUBJ',he:'SUBJ',she:'SUBJ',it:'SUBJ',they:'SUBJ',me:'OBJ',us:'OBJ',him:'OBJ',her:'OBJ',them:'OBJ',my:'POSS',our:'POSS',your:'POSS',his:'POSS',its:'POSS',their:'POSS',myself:'REFL',yourself:'REFL',himself:'REFL',herself:'REFL',itself:'REFL',ourselves:'REFL',yourselves:'REFL',themselves:'REFL'};

var VERB_TENSE={is:'PRES',are:'PRES',am:'PRES',was:'PAST',were:'PAST',been:'PART',being:'ING',has:'PRES',have:'PRES',had:'PAST',do:'PRES',does:'PRES',did:'PAST',will:'MODAL',would:'MODAL',can:'MODAL',could:'MODAL',shall:'MODAL',should:'MODAL',may:'MODAL',might:'MODAL',must:'MODAL',gone:'PART',seen:'PART',done:'PART',taken:'PART',given:'PART',known:'PART',thought:'PART',made:'PART',found:'PART',told:'PART',asked:'PART',worked:'PART',felt:'PART',tried:'PART',left:'PART',called:'PART',helped:'PART',needed:'PART',wanted:'PART',looked:'PART',liked:'PART',meant:'PART',kept:'PART',let:'PART',begun:'PART',started:'PART',shown:'PART',heard:'PART',played:'PART',run:'PART',moved:'PART',lived:'PART',believed:'PART',held:'PART',brought:'PART',written:'PART',provided:'PART',sat:'PART',stood:'PART',lost:'PART',paid:'PART',met:'PART'};

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

function _gvTagWord(w) {
  w = w.toLowerCase();
  // Check contractions first
  if (CONTRACTIONS[w]) return CONTRACTIONS[w];
  // Clean punctuation
  w = w.replace(/[^a-z']/g, '');
  if (!w) return 'OTHER';
  // Check POS dict
  if (POS_DICT[w]) return POS_DICT[w];
  // Heuristic: common suffixes
  if (w.endsWith('ing')) return 'VERB';
  if (w.endsWith('ed')) return 'VERB';
  if (w.endsWith('ly')) return 'ADV';
  if (w.endsWith('tion') || w.endsWith('sion') || w.endsWith('ment') || w.endsWith('ness') || w.endsWith('ity')) return 'NOUN';
  if (w.endsWith('ous') || w.endsWith('ful') || w.endsWith('less') || w.endsWith('able') || w.endsWith('ible')) return 'ADJ';
  if (w.endsWith('er') || w.endsWith('est')) return 'ADJ';
  if (w.endsWith('s') && w.length > 3) return 'NOUN'; // plural nouns
  return 'OTHER';
}

function _gvProcessFinal(text) {
  var words = text.toLowerCase().match(/[a-z']+/g) || [];
  if (!words.length) return;

  _gv.sentenceLengths.push(words.length);
  var subj = null, verb = null;

  words.forEach(function(w) {
    var pos = _gvTagWord(w);
    if (['NOUN','VERB','ADJ','ADV','PREP','CONJ','PRON','AUX'].indexOf(pos) >= 0) {
      _gv.posCounts[pos] = (_gv.posCounts[pos] || 0) + 1;
    }
    if (['NOUN','VERB','ADJ','ADV'].indexOf(pos) >= 0 && _gv.allContentWords.indexOf(w) < 0) {
      _gv.allContentWords.push(w);
    }
    _gv.allWordsFlat.push({w: w, pos: pos});

    if (PRON_TYPE[w]) _gv.proCounts[PRON_TYPE[w]] = (_gv.proCounts[PRON_TYPE[w]] || 0) + 1;
    if (VERB_TENSE[w]) _gv.verbCounts[VERB_TENSE[w]] = (_gv.verbCounts[VERB_TENSE[w]] || 0) + 1;
    else if (pos === 'VERB') {
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

  _gvUpdateTranscript(text, words);
  _gvUpdateAll();
}

function _gvUpdateTranscript(text, words) {
  _gv.transcriptSentences.push({text: text, words: words});
  if (_gv.transcriptSentences.length > 10) _gv.transcriptSentences.shift();

  var el = document.getElementById('gvTranscriptLines');
  if (!el) return;

  var html = '';
  _gv.transcriptSentences.forEach(function(s) {
    html += '<div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line)">';
    html += '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;line-height:1.5">' + s.text + '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    s.words.forEach(function(w) {
      var pos = _gvTagWord(w);
      var colorMap = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc',PREP:'#fbbf24',CONJ:'#fb923c',PRON:'#38bdf8',AUX:'#a78bfa',DET:'#6b7280',PART:'#6b7280',OTHER:'#6b7280'};
      var color = colorMap[pos] || '#6b7280';
      html += '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:' + color + '18;color:' + color + ';border:1px solid ' + color + '22">' + w + ' <span style="opacity:.6;font-size:8px">' + pos + '</span></span>';
    });
    html += '</div></div>';
  });
  el.innerHTML = html || '<div style="color:var(--muted);font-size:11px;text-align:center;padding:20px">No sentences yet. Speak to see each word tagged with its POS.</div>';
}

function _gvUpdateAll() {
  _gvUpdateHeatmap();
  _gvUpdatePronouns();
  _gvUpdateVerbs();
  _gvUpdatePosCols();
  _gvUpdatePosTags();
  _gvUpdateDonut();
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
  if (transcriptEl) transcriptEl.innerHTML = '<div style="color:var(--muted);font-size:11px;text-align:center;padding:20px">No sentences yet. Speak to see each word tagged with its POS.</div>';
  _gvUpdateAll();
}

window._gvReset = _gvReset;
