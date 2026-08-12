// js/panoramica/shared/legacy-globals.js
// ═══════════════════════════════════════════════════════════════════════════
// Restores window.* globals that panel HTML inline handlers expect.
// These lived in the old panoramica-v1.html mega-script and were lost when
// panels became ES modules (module scope ≠ global scope), causing
// "Uncaught ReferenceError: X is not defined" on almost every button.
// Ported + adapted from panoramica-v1.html (2026-08-12).
// ═══════════════════════════════════════════════════════════════════════════
import { showToast } from './dom.js';

// ── Toast (report-ai + general) ──
window.showToastMsg = function (msg, type) { showToast(msg, type, 3000); };

// ── Small floating toast (vocab builder style) ──
function showWbxToast(msg) {
  try {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:Inter,sans-serif';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 2000);
  } catch (e) { /* never break the click */ }
}

// ═══════════════════════════ PROFILE ═══════════════════════════

window.copyProfileRef = function () {
  var linkEl = document.getElementById('profileRefLink');
  var text = linkEl ? linkEl.textContent : '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () {
      var btn = document.getElementById('profileCopyRefBtn');
      if (btn) {
        var icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'check';
        setTimeout(function () { if (icon) icon.textContent = 'content_copy'; }, 2000);
      }
    });
  }
};

window.shareRefWhatsApp = function () {
  var linkEl = document.getElementById('profileRefLink');
  var link = linkEl ? linkEl.textContent : '';
  var msg = encodeURIComponent('Unisciti a Sottotitoli — captioning e traduzione in tempo reale gratis! ' + link);
  window.open('https://wa.me/?text=' + msg, '_blank');
};

window.shareRefEmail = function () {
  var linkEl = document.getElementById('profileRefLink');
  var link = linkEl ? linkEl.textContent : '';
  var subject = encodeURIComponent('Prova Sottotitoli con me!');
  var body = encodeURIComponent('Ciao!\n\nTi invito a provare Sottotitoli, uno strumento per captioning e traduzione in tempo reale. È gratis!\n\n' + link + '\n\nCi vediamo lì!');
  window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
};

window.editProfileName = function () {
  var nameEl = document.getElementById('profileDisplayName');
  var currentName = (nameEl && nameEl.textContent !== '—') ? nameEl.textContent : '';
  var newName = prompt('Modifica il tuo nome:', currentName);
  if (newName === null) return;
  newName = newName.trim().substring(0, 20);
  if (!newName) return;
  if (nameEl) nameEl.textContent = newName;
  if (typeof SottotitoliData !== 'undefined' && SottotitoliData.saveProfileField) {
    SottotitoliData.saveProfileField('display_name', newName);
  }
  if (window._settingsData) window._settingsData.display_name = newName;
  var ddName = document.getElementById('ddName');
  if (ddName) ddName.textContent = newName;
};

window.uploadAvatar = async function (input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 200 * 1024) { alert('Immagine troppo grande. Massimo 200KB.'); return; }
  var allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (allowed.indexOf(file.type) === -1) { alert('Formato non supportato. Usa PNG, JPG o WebP.'); return; }

  var reader = new FileReader();
  reader.onload = async function (e) {
    var dataUrl = e.target.result;
    var img = document.getElementById('profileAvatar');
    var placeholder = document.getElementById('profileAvatarPlaceholder');
    if (img) { img.src = dataUrl; img.style.display = ''; }
    if (placeholder) placeholder.style.display = 'none';
    try { localStorage.setItem('sottotitoli-avatar', dataUrl); } catch (ex) {}

    var sb = window.sottotitoliSupabase;
    if (sb) {
      try {
        var r = await sb.auth.getSession();
        var userId = r.data && r.data.session ? r.data.session.user.id : null;
        if (userId) {
          var ur = await sb.from('profiles').upsert(
            { id: userId, avatar_url: dataUrl, updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          );
          if (ur.error) { console.warn('Avatar save failed:', ur.error.message); window.showToastMsg('⚠️ Salvata in locale'); }
          else window.showToastMsg('✓ Immagine profilo salvata');
        }
      } catch (e2) {
        console.warn('Avatar save error:', e2.message);
        window.showToastMsg('⚠️ Salvata in locale');
      }
    } else {
      window.showToastMsg('⚠️ Accedi per salvare permanentemente');
    }
  };
  reader.readAsDataURL(file);
};

// ═══════════════════════════ DASHBOARD ═══════════════════════════

window.selectMetricCard = function (card) {
  var metric = card.getAttribute('data-metric');
  document.querySelectorAll('#pnl-panoramica .metric-card').forEach(function (c) {
    c.classList.remove('selected'); c.style.opacity = '';
  });
  card.classList.add('selected'); card.style.opacity = '1';

  var isEn = window.I18n && I18n.getLang() === 'en';
  var cfg = {
    totalSessions: { title: isEn ? 'Total sessions' : 'Sessioni totali', label: isEn ? 'Total Sessions' : 'Sessioni Totali' },
    totalMinutes:  { title: isEn ? 'Session minutes' : 'Minuti di sessione', label: isEn ? 'Total Minutes' : 'Minuti Totali' },
    totalWords:    { title: isEn ? 'Unique words' : 'Parole uniche', label: isEn ? 'Total Words' : 'Parole Totali' },
    avgLexDiv:     { title: isEn ? 'Lexical diversity' : 'Diversità lessicale', label: isEn ? 'Avg Ratio' : 'Media Rapporto' }
  }[metric];
  if (cfg) {
    var t = document.getElementById('dailyChartTitle'); if (t) t.textContent = cfg.title;
    var l = document.getElementById('dailyChartLabel'); if (l) l.textContent = cfg.label;
  }
  renderMetricChart(metric);
};

async function renderMetricChart(metric) {
  var chartEl = document.getElementById('dailyChart');
  var totalEl = document.getElementById('dailyChartTotal');
  if (!chartEl) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) { chartEl.innerHTML = '<span style="color:var(--text-faint);font-size:14px;padding:40px">Accedi per vedere il grafico</span>'; return; }
  try {
    var auth = await sb.auth.getSession();
    var uid = auth.data && auth.data.session ? auth.data.session.user.id : null;
    if (!uid) { chartEl.innerHTML = '<span style="color:var(--text-faint);font-size:14px;padding:40px">Accedi per vedere il grafico</span>'; return; }
    var since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    var resp = await sb.from('sessions')
      .select('started_at, duration_seconds, words_count, lexical_diversity')
      .eq('user_id', uid)
      .gte('started_at', since)
      .order('started_at', { ascending: true });
    if (resp.error) throw resp.error;

    var days = {};
    for (var i = 0; i < 14; i++) {
      var d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = { sessions: 0, minutes: 0, words: 0, lex: [] };
    }
    (resp.data || []).forEach(function (s) {
      var key = s.started_at ? s.started_at.slice(0, 10) : null;
      if (!key || !days[key]) return;
      days[key].sessions++;
      days[key].minutes += Math.round((s.duration_seconds || 0) / 60);
      days[key].words += s.words_count || 0;
      if (typeof s.lexical_diversity === 'number') days[key].lex.push(s.lexical_diversity);
    });
    var values = Object.keys(days).map(function (k) {
      var d = days[k];
      if (metric === 'totalSessions') return d.sessions;
      if (metric === 'totalWords') return d.words;
      if (metric === 'avgLexDiv') return d.lex.length ? Math.round((d.lex.reduce(function (a, b) { return a + b; }, 0) / d.lex.length) * 100) : 0;
      return d.minutes;
    });
    var maxVal = Math.max.apply(null, values.concat([1]));
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    if (totalEl) totalEl.textContent = metric === 'avgLexDiv' ? Math.round(total / 14) : total;
    chartEl.innerHTML = values.map(function (v, i) {
      var h = maxVal > 0 ? Math.max(6, (v / maxVal) * 172) : 6;
      return '<div class="chart-bar" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative"><div class="chart-tooltip">' + v + '</div><div style="width:100%;max-width:40px;height:' + h + 'px;background:var(--cyan);opacity:' + (i >= 11 ? 1 : 0.35 + (i * 0.03)) + ';box-shadow:0 0 12px rgba(6,182,212,' + (i >= 11 ? 0.2 : 0.05) + ')"></div></div>';
    }).join('');
  } catch (e) { console.warn('Metric chart failed:', e.message); }
}

// ═══════════════════════════ VOCAB BUILDER ═══════════════════════════

function estimateCEFR(w) {
  var len = (w || '').length;
  if (len <= 4) return 'A2';
  if (len <= 6) return 'B1';
  if (len <= 8) return 'B2';
  if (len <= 10) return 'C1';
  return 'C2';
}

window.loadBankSelector = async function (lang) {
  lang = lang || 'en';
  var sel = document.getElementById('wbxSaveTarget');
  if (!sel) return;
  sel.innerHTML = '<option value="">English Vocabulary Builder (default)</option>' +
    '<option value="saved_from_sessions">Saved from sessions</option>';
  try {
    var localBanks = JSON.parse(localStorage.getItem('sottotitoli_wb_custom_' + lang) || '[]');
    localBanks.forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = '📦 ' + b.name;
      sel.appendChild(opt);
    });
  } catch (e) {}
  var sb = window.sottotitoliSupabase;
  if (!sb) { restoreSaved(); return; }
  try {
    var r = await sb.auth.getSession();
    if (!r.data || !r.data.session) { restoreSaved(); return; }
    var userId = r.data.session.user.id;
    var resp = await sb.from('user_wordbanks').select('id,name').eq('user_id', userId).eq('lang', lang).order('name');
    var existing = new Set(Array.from(sel.options).map(function (o) { return o.value; }));
    (resp.data || []).forEach(function (b) {
      if (!existing.has(b.id)) {
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = '📦 ' + b.name;
        sel.appendChild(opt);
      }
    });
  } catch (e) { /* silently skip */ }
  function restoreSaved() {
    var saved = localStorage.getItem('wbx-save-target-' + lang);
    if (saved) { sel.value = saved; }
  }
  restoreSaved();
};

window.onSaveTargetChange = function () {
  var sel = document.getElementById('wbxSaveTarget');
  if (!sel) return;
  var lang = document.querySelector('[data-subtab="wb-expand"].active') ? 'en' : 'it';
  localStorage.setItem('wbx-save-target-' + lang, sel.value);
};

window.createBankFromSelector = async function () {
  var name = prompt('Nome della nuova banca:');
  if (!name || !name.trim()) return;
  var lang = document.querySelector('[data-subtab="wb-expand"].active') ? 'en' : 'it';
  var sb = window.sottotitoliSupabase;
  if (sb) {
    try {
      var r = await sb.auth.getSession();
      if (r.data && r.data.session) {
        var resp = await sb.from('user_wordbanks')
          .insert({ user_id: r.data.session.user.id, name: name.trim(), lang: lang })
          .select().single();
        if (resp.data) {
          window.loadBankSelector(lang);
          var sel = document.getElementById('wbxSaveTarget');
          if (sel) { sel.value = resp.data.id; window.onSaveTargetChange(); }
          showWbxToast('✓ Banca "' + name.trim() + '" creata');
          return;
        }
      }
    } catch (e) {}
  }
  var banks = JSON.parse(localStorage.getItem('sottotitoli_wb_custom_' + lang) || '[]');
  banks.push({ id: 'local_' + Date.now(), name: name.trim(), lang: lang });
  localStorage.setItem('sottotitoli_wb_custom_' + lang, JSON.stringify(banks));
  window.loadBankSelector(lang);
  showWbxToast('✓ Banca "' + name.trim() + '" creata (locale)');
};

window.getSaveTargetBank = function () {
  var sel = document.getElementById('wbxSaveTarget');
  return sel && sel.value ? sel.value : null;
};

window.wbxDismissBox = function (btn) {
  var box = btn.closest('.wbx-box');
  if (box) box.remove();
};

// Simplified Build-From-Known search (Datamuse). Full version had dictionary
// enrichment; this renders suggestions with CEFR + POS and saves to bank.
window.renderExpandSuggestions = async function () {
  var inp = document.getElementById('wbExpandSearch');
  var relation = document.getElementById('wbExpandRelation');
  var results = document.getElementById('wbExpandResults');
  if (!inp || !results) return;
  var query = inp.value.trim();
  if (!query || query.length < 2) {
    results.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-faint)"><h3 style="color:var(--text-soft);margin-bottom:6px">Costruisci da ciò che sai</h3><p style="font-size:14px;max-width:440px;margin:0 auto">Scrivi una parola che conosci e Sottotitoli ti mostrerà sinonimi, contrari, collocazioni e parole correlate al tuo livello.</p></div>';
    return;
  }
  var relMap = { synonyms: 'ml', antonyms: 'rel_ant', 'word-family': 'sp', collocations: 'rel_jjb', 'next-level': 'ml' };
  var param = relMap[relation ? relation.value : 'synonyms'] || 'ml';
  results.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-faint)"><i class="fa-solid fa-spinner fa-spin"></i> Cercando suggerimenti…</div>';
  try {
    var resp = await fetch('https://api.datamuse.com/words?' + param + '=' + encodeURIComponent(query) + '&max=15&md=p');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    var seen = {};
    var items = [];
    data.forEach(function (it) {
      var w = (it.word || '').toLowerCase().replace(/[^a-z\s'-]/g, '').trim();
      if (!w || w === query.toLowerCase() || seen[w]) return;
      seen[w] = true;
      var level = (window.CEFR_LEVELS && window.CEFR_LEVELS[w]) ? window.CEFR_LEVELS[w] : estimateCEFR(w);
      var pos = '—';
      if (window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[w]) pos = window.LEMMA_POS_MAP[w].toUpperCase();
      items.push({ word: w, level: level, pos: pos });
    });
    if (!items.length) {
      results.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-soft)">Nessun suggerimento per "' + query + '". Prova un\'altra parola.</div>';
      return;
    }
    var qLevel = (window.CEFR_LEVELS && window.CEFR_LEVELS[query.toLowerCase()]) || estimateCEFR(query);
    var html = '<div class="wbx-grid">' +
      '<article class="wbx-box wbx-exact" data-cefr="' + qLevel + '" data-word="' + query + '"><div class="wbx-main-col"><div class="wbx-word-zone"><div class="wbx-head"><span class="wbx-w">' + query + '</span><span class="wbx-cefr">' + qLevel + '</span></div></div></div><div class="wbx-save-col"><button class="wbx-save-btn" data-word="' + query + '" data-level="' + qLevel + '" title="Salva">+</button></div></article>';
    items.slice(0, 12).forEach(function (s) {
      html += '<article class="wbx-box" data-cefr="' + s.level + '" data-word="' + s.word + '"><div class="wbx-main-col"><div class="wbx-word-zone"><div class="wbx-head"><span class="wbx-w">' + s.word + '</span><span class="wbx-cefr">' + s.level + '</span><span class="wbx-pos">' + s.pos + '</span></div></div></div><div class="wbx-save-col"><button class="wbx-save-btn" data-word="' + s.word + '" data-level="' + s.level + '" title="Salva">+</button></div></article>';
    });
    results.innerHTML = html + '</div>';
  } catch (e) {
    results.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-soft)">Impossibile raggiungere il servizio di suggerimenti. Riprova tra qualche secondo.</div>';
    console.warn('Datamuse error:', e);
  }
};

// Simplified Italian expand search (dictionaryapi.dev it + CEFR label)
window.renderItExpandSuggestions = async function () {
  var inp = document.getElementById('wbItExpandSearch');
  var results = document.getElementById('wbItExpandResults');
  if (!inp || !results) return;
  var q = inp.value.trim();
  if (!q || q.length < 2) return;
  results.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-faint)"><i class="fa-solid fa-spinner fa-spin"></i> Cercando…</div>';
  try {
    var resp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/it/' + encodeURIComponent(q));
    var defText = '—', posLabel = '—';
    if (resp.ok) {
      var defs = await resp.json();
      var e = defs && defs[0];
      var m = e && e.meanings && e.meanings[0];
      if (m) {
        posLabel = (m.partOfSpeech || '—').toUpperCase();
        var d = m.definitions && m.definitions[0];
        if (d) defText = d.definition;
      }
    }
    var level = (window.CEFR_LEVELS && window.CEFR_LEVELS[q.toLowerCase()]) || 'B1';
    results.innerHTML = '<div class="wbx-grid"><article class="wbx-box wbx-exact" data-cefr="' + level + '" data-word="' + q + '"><div class="wbx-main-col"><div class="wbx-word-zone"><div class="wbx-head"><span class="wbx-w">' + q + '</span><span class="wbx-cefr">' + level + '</span><span class="wbx-pos">' + posLabel + '</span></div></div><div class="wbx-meta-zone"><div class="wbx-def">' + defText + '</div></div></div><div class="wbx-save-col"><button class="wbx-save-btn" data-word="' + q + '" data-level="' + level + '" title="Salva">+</button></div></article></div>';
  } catch (e) {
    results.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-soft)">Errore nella ricerca.</div>';
  }
};

// ── CEFR topic browser (DOM-level actions; topic loading stays minimal) ──
window.filterCefrTopics = function () {
  var q = (document.getElementById('cefrTopicSearch') || {}).value || '';
  q = q.toLowerCase();
  document.querySelectorAll('#cefrTopicGrid .topic-pill').forEach(function (btn) {
    btn.style.display = (btn.textContent || '').toLowerCase().indexOf(q) >= 0 ? '' : 'none';
  });
};
window.toggleCefrRelevance = function (mode) {
  document.querySelectorAll('#sub-wb-explore .fchip').forEach(function (b, i) {
    if (i < 2) b.classList.toggle('active', (b.textContent || '').toLowerCase().indexOf(mode) >= 0);
  });
};
window.closeCefrTopic = function () {
  var g = document.getElementById('cefrTopicGrid'); if (g) g.style.display = '';
  var w = document.getElementById('cefrTopicWords'); if (w) w.style.display = 'none';
  var sb = document.getElementById('cefrTopicSearch');
  if (sb && sb.closest('.wb-search-bar')) sb.closest('.wb-search-bar').style.display = '';
};
window.sortCefrWords = function (btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.fchip').forEach(function (c) { c.classList.remove('active'); });
    btn.classList.add('active');
  }
};
window.vtSetOrder = function (btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.fchip').forEach(function (c) { c.classList.remove('active'); });
    btn.classList.add('active');
  }
};

// ═══════════════════════════ WORD BANKS ═══════════════════════════

var _wbReviewState = { selectedRows: new Set() };

function fmtDateShort(iso) {
  if (!iso) return 'Mai';
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }); } catch (e) { return '—'; }
}

window.renderReviewDue = async function () {
  var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
  var sb = window.sottotitoliSupabase;
  var tbody = document.getElementById('wbReviewBody');
  if (!tbody) return;

  // Stats bar
  try {
    var stats = window.SottotitoliData && window.SottotitoliData.getWordbankStats ? await window.SottotitoliData.getWordbankStats(lang) : null;
    var statsEl = document.getElementById('wbReviewStats');
    if (statsEl && stats) {
      var overdue = stats.overdue || 0;
      var cards = [
        { v: stats.dueToday || 0, l: 'In programma oggi' },
        { v: overdue, l: 'Scadute' },
        { v: (stats.reviewedToday || 0), l: 'Ripassate oggi' },
        { v: (stats.known || 0), l: 'Padroneggiate' }
      ];
      statsEl.innerHTML = '<div class="stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">' +
        cards.map(function (c, i) {
          return '<div class="metric-card' + (i === 1 && overdue > 0 ? ' amber' : '') + '" style="min-height:80px;padding:14px 16px"><div class="metric-label" style="margin-bottom:2px">' + c.l + '</div><div class="metric-value" style="font-size:26px">' + c.v + '</div></div>';
        }).join('') + '</div>';
    }
  } catch (e) { /* stats optional */ }

  if (!sb) { tbody.innerHTML = ''; var e0 = document.getElementById('wbReviewEmpty'); if (e0) e0.style.display = 'block'; return; }
  try {
    var r = await sb.auth.getSession();
    if (!r.data || !r.data.session) { tbody.innerHTML = ''; return; }
    var userId = r.data.session.user.id;
    var q = sb.from('review_words')
      .select('id,lemma,pos,cefr,mastery_score,review_state,next_review_at,last_reviewed_at,lapses,personal_frequency')
      .eq('user_id', userId)
      .or('is_new.eq.true,next_review_at.lte.' + new Date().toISOString())
      .order('last_reviewed_at', { ascending: true, nullsFirst: true })
      .limit(100);
    var res = await q;
    var words = res.data || [];
    var emptyEl = document.getElementById('wbReviewEmpty');
    if (words.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    var now = new Date();
    tbody.innerHTML = words.map(function (w) {
      var cefrBadge = w.cefr ? '<span class="badge badge-cefr cefr-' + w.cefr + '">' + w.cefr + '</span>' : '<span style="font-size:10px;color:var(--text-faint)">—</span>';
      var posBadge = w.pos ? '<span class="badge badge-pos">' + w.pos + '</span>' : '';
      var isNew = w.is_new || w.review_state === 'new';
      var isOverdue = w.next_review_at && new Date(w.next_review_at) < now;
      var statusLabel = isNew ? 'Nuova' : isOverdue ? 'In ritardo' : 'In programma';
      var statusClass = isNew ? 'badge-new' : isOverdue ? 'badge-learning' : 'badge-known';
      return '<tr data-wid="' + w.id + '"' + (isOverdue ? ' style="background:rgba(217,119,6,.06)"' : '') + ' onclick="wbReviewToggleRow(this)">' +
        '<td class="cb"><input type="checkbox" onclick="event.stopPropagation()" onchange="wbReviewUpdateBulkBar()" style="accent-color:var(--cyan)"></td>' +
        '<td><span class="wb-word">' + (w.lemma || '—') + '</span></td>' +
        '<td>' + cefrBadge + '</td><td>' + posBadge + '</td>' +
        '<td style="font-size:11px;color:var(--text-faint)">' + fmtDateShort(w.last_reviewed_at) + '</td>' +
        '<td style="font-size:11px;color:var(--text-faint)">—</td>' +
        '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();wbReviewMarkDone(\'' + w.id + '\')" style="font-size:10px;padding:2px 8px;color:var(--green)" title="Segna come ripassata">✓</button></td></tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '';
    console.warn('renderReviewDue failed:', e.message);
  }
};

window.wbReviewToggleRow = function (tr) {
  var cb = tr.querySelector('input[type="checkbox"]');
  if (!cb) return;
  cb.checked = !cb.checked;
  tr.classList.toggle('selected', cb.checked);
  var wid = tr.getAttribute('data-wid');
  if (cb.checked) _wbReviewState.selectedRows.add(wid);
  else _wbReviewState.selectedRows.delete(wid);
  window.wbReviewUpdateBulkBar();
};

window.wbReviewToggleAll = function (masterCb) {
  document.querySelectorAll('#wbReviewBody input[type="checkbox"]').forEach(function (cb) {
    cb.checked = masterCb.checked;
    var tr = cb.closest('tr');
    if (!tr) return;
    tr.classList.toggle('selected', masterCb.checked);
    var wid = tr.getAttribute('data-wid');
    if (masterCb.checked) _wbReviewState.selectedRows.add(wid);
    else _wbReviewState.selectedRows.delete(wid);
  });
  window.wbReviewUpdateBulkBar();
};

window.wbReviewUpdateBulkBar = function () {
  var bar = document.getElementById('wbReviewBulkBar');
  var count = document.getElementById('wbReviewBulkCount');
  if (!bar) return;
  if (_wbReviewState.selectedRows.size > 0) {
    bar.classList.add('active');
    if (count) count.textContent = _wbReviewState.selectedRows.size + ' selezionate';
  } else {
    bar.classList.remove('active');
  }
};

window.wbReviewClearSelection = function () {
  _wbReviewState.selectedRows = new Set();
  document.querySelectorAll('#wbReviewBody input[type="checkbox"]').forEach(function (cb) { cb.checked = false; var tr = cb.closest('tr'); if (tr) tr.classList.remove('selected'); });
  window.wbReviewUpdateBulkBar();
};

window.wbReviewMarkDone = async function (wid) {
  try {
    if (window.SottotitoliData && window.SottotitoliData.updateWordStatus) await window.SottotitoliData.updateWordStatus(wid, 'known');
    if (window.SottotitoliData && window.SottotitoliData.cacheClear) window.SottotitoliData.cacheClear();
  } catch (e) { console.warn('wbReviewMarkDone:', e.message); }
  window.renderReviewDue();
};

window.wbReviewBulkDone = async function () {
  var ids = Array.from(_wbReviewState.selectedRows);
  if (!ids.length) return;
  try {
    for (var i = 0; i < ids.length; i++) {
      if (window.SottotitoliData && window.SottotitoliData.updateWordStatus) await window.SottotitoliData.updateWordStatus(ids[i], 'known');
    }
    if (window.SottotitoliData && window.SottotitoliData.cacheClear) window.SottotitoliData.cacheClear();
  } catch (e) { console.warn('wbReviewBulkDone:', e.message); }
  _wbReviewState.selectedRows = new Set();
  window.renderReviewDue();
};

window.reviewAllDue = async function () {
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  try {
    var r = await sb.auth.getSession();
    if (!r.data || !r.data.session) return;
    var userId = r.data.session.user.id;
    await sb.from('user_wordbank_words')
      .update({ status: 'known', last_reviewed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['due', 'new']);
    if (window.SottotitoliData && window.SottotitoliData.cacheClear) window.SottotitoliData.cacheClear();
  } catch (e) { console.warn('reviewAllDue:', e.message); }
  window.renderReviewDue();
};

window.newWordbank = async function () {
  var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
  var lang = itTab ? 'it' : (window.SOTTOTITOLI_STUDY_LANG || 'en');
  var name = prompt(lang === 'it' ? 'Nome della nuova banca italiana:' : 'Nome della nuova banca:');
  if (!name || !name.trim()) return;
  try {
    var uid = window.SottotitoliData ? await window.SottotitoliData.getUserId() : null;
    if (!uid || !window.sottotitoliSupabase) { alert('Devi accedere per creare una banca.'); return; }
    var resp = await window.sottotitoliSupabase.from('user_wordbanks').insert({ user_id: uid, name: name.trim(), lang: lang }).select().single();
    if (resp.error) { alert('Errore: ' + resp.error.message); return; }
    if (window.SottotitoliData && window.SottotitoliData.cacheClear) window.SottotitoliData.cacheClear();
    alert('Banca "' + name.trim() + '" creata!');
    if (lang === 'it') { if (window._wbItLoadAll) window._wbItLoadAll(); }
    else if (window._wbLoadAll) window._wbLoadAll();
  } catch (e) { alert('Errore nella creazione: ' + e.message); }
};

// ── Wordbank popup markup (lost with the refactor — recreate once) ──
function ensureWbPopups() {
  if (document.getElementById('wbImportPopup')) return;
  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<div id="wbImportPopup" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:10000;align-items:center;justify-content:center" onclick="wbCloseImport()">' +
    '<div style="background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:32px;max-width:500px;width:90%" onclick="event.stopPropagation()">' +
    '<h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:var(--text)">Import Vocabulary Bank</h3>' +
    '<p style="font-size:13px;color:var(--text-soft);margin:0 0 16px">Upload a file — words will be extracted automatically.</p>' +
    '<label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-soft);display:block;margin-bottom:4px">Bank Name</label>' +
    '<input id="wbImportName" placeholder="e.g. Medical Terms" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;margin-bottom:12px;box-sizing:border-box">' +
    '<div style="border:2px dashed var(--line);border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;cursor:pointer;background:var(--bg)" onclick="document.getElementById(\'wbImportFile\').click()">' +
    '<span class="material-symbols-outlined" style="font-size:36px;color:var(--cyan);display:block;margin-bottom:6px">cloud_upload</span>' +
    '<p style="font-size:13px;font-weight:600;color:var(--text)">Click to select file</p>' +
    '<p id="wbImportFileName" style="font-size:11px;color:var(--text-soft);margin-top:4px">No file selected</p>' +
    '<input type="file" id="wbImportFile" accept=".txt,.csv,.doc,.docx,.pdf" style="display:none" onchange="document.getElementById(\'wbImportFileName\').textContent=this.files[0]?this.files[0].name:\'No file selected\'">' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button onclick="wbCloseImport()" style="padding:10px 20px;border:1px solid var(--line);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-soft)">Cancel</button>' +
    '<button onclick="wbDoImport()" style="padding:10px 24px;background:var(--cyan);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">Import &amp; Create Bank</button>' +
    '</div></div></div>' +
    '<div id="wbCreatePopup" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:10000;align-items:center;justify-content:center" onclick="wbCloseCreate()">' +
    '<div style="background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:32px;max-width:440px;width:90%" onclick="event.stopPropagation()">' +
    '<h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:var(--text)">Create New Bank</h3>' +
    '<p style="font-size:13px;color:var(--text-soft);margin:0 0 20px">Create an empty word bank to fill manually or import later.</p>' +
    '<input id="wbCreateName" placeholder="e.g. Phrasal Verbs" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;margin-bottom:24px;box-sizing:border-box">' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button onclick="wbCloseCreate()" style="padding:10px 20px;border:1px solid var(--line);border-radius:8px;background:transparent;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-soft)">Cancel</button>' +
    '<button onclick="wbDoCreate()" style="padding:10px 24px;background:var(--cyan);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">Create Bank</button>' +
    '</div></div></div>';
  document.body.appendChild(wrap);
}
ensureWbPopups();

console.log('Legacy globals restored — inline panel handlers can no longer throw ReferenceError');
